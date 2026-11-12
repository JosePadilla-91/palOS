'use strict';
// Loopback-only HTTP server that feeds the <video> element.
//   /direct/:id          byte-range file serving for natively playable media
//   /stream/:id?...      live ffmpeg remux/transcode to fragmented MP4
//   /thumb/:id?t=&w=     JPEG frame grabs (cached)
//   /subs/:id/:key       any text subtitle converted to WebVTT
//   /cover/:id           embedded album art
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ff = require('./ffmpeg');
const media = require('./media');

const MIME = {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.ogv': 'video/ogg', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg', '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac', '.wav': 'audio/wav',
};

const token = crypto.randomBytes(16).toString('hex');
const activeStreams = new Map(); // id -> child
const thumbCache = new Map(); // key -> Buffer (LRU-ish)
const THUMB_CACHE_MAX = 600;
let thumbRunning = 0;
const thumbQueue = [];
let preset = 'veryfast';

function setPreset(p) { preset = p; }

function limitThumb(fn) {
  return new Promise((resolve, reject) => {
    const go = () => {
      thumbRunning++;
      fn().then(resolve, reject).finally(() => {
        thumbRunning--;
        const next = thumbQueue.shift();
        if (next) next();
      });
    };
    if (thumbRunning < 3) go(); else thumbQueue.push(go);
  });
}

function send(res, code, body, type = 'text/plain') {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(body);
}

function serveFile(req, res, file) {
  let stat;
  try { stat = fs.statSync(file); } catch { return send(res, 404, 'missing'); }
  const size = stat.size;
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' };
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range && (range[1] || range[2])) {
    let start; let end;
    if (range[1]) { start = Number(range[1]); end = range[2] ? Number(range[2]) : size - 1; } else { start = size - Number(range[2]); end = size - 1; }
    end = Math.min(end, size - 1);
    if (start >= size || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}`, 'Access-Control-Allow-Origin': '*' });
      return res.end();
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    const s = fs.createReadStream(file, { start, end });
    s.pipe(res);
    req.on('close', () => s.destroy());
  } else {
    res.writeHead(200, { ...headers, 'Content-Length': size });
    if (req.method === 'HEAD') return res.end();
    const s = fs.createReadStream(file);
    s.pipe(res);
    req.on('close', () => s.destroy());
  }
}

function serveStream(req, res, m, q) {
  const prev = activeStreams.get(m.id);
  if (prev) prev.kill('SIGKILL');
  const args = m.streamArgs({
    mode: q.get('mode') || 'transcode',
    t: Number(q.get('t')) || 0,
    audio: q.get('a') != null && q.get('a') !== '' ? Number(q.get('a')) : null,
    burn: q.get('burn') || null,
    preset,
  });
  const child = ff.spawnFfmpeg(args);
  activeStreams.set(m.id, child);
  res.writeHead(200, {
    'Content-Type': 'video/mp4', 'Accept-Ranges': 'none', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*',
  });
  child.stdout.pipe(res);
  let sent = false;
  child.stdout.on('data', () => { sent = true; });
  child.on('close', (code) => {
    if (activeStreams.get(m.id) === child) activeStreams.delete(m.id);
    if (code && code !== 255 && !sent) console.error('[stream] ffmpeg failed:', child.getStderr(), '\nargs:', args.join(' '));
    res.end();
  });
  req.on('close', () => child.kill('SIGKILL'));
}

async function serveThumb(res, m, q) {
  const t = Math.max(0, Number(q.get('t')) || 0);
  const w = Math.min(1280, Math.max(64, Number(q.get('w')) || 320));
  const fast = q.get('exact') !== '1';
  const key = `${m.id}:${t.toFixed(1)}:${w}:${fast}`;
  let buf = thumbCache.get(key);
  if (!buf) {
    const args = m.thumbArgs(t, w, fast);
    if (!args) return send(res, 404, 'no video');
    try {
      buf = await limitThumb(() => ff.ffmpegBuffer(args, 20000));
    } catch (e) {
      return send(res, 500, String(e.message));
    }
    if (!buf.length) return send(res, 500, 'empty');
    thumbCache.set(key, buf);
    if (thumbCache.size > THUMB_CACHE_MAX) thumbCache.delete(thumbCache.keys().next().value);
  }
  res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=3600' });
  res.end(buf);
}

async function serveSubs(res, m, key) {
  const args = m.subtitleArgs(key);
  if (!args) return send(res, 404, 'not a text subtitle');
  try {
    const buf = await ff.ffmpegBuffer(args, 120000);
    send(res, 200, buf, 'text/vtt; charset=utf-8');
  } catch (e) {
    send(res, 500, String(e.message));
  }
}

async function serveCover(res, m) {
  if (!m.cover) return send(res, 404, 'no cover');
  try {
    const buf = await ff.ffmpegBuffer(['-hide_banner', '-loglevel', 'error', '-i', m.path, '-map', `0:${m.cover.index}`,
      '-frames:v', '1', '-vf', 'scale=800:800:force_original_aspect_ratio=decrease', '-f', 'image2pipe', '-c:v', 'mjpeg', 'pipe:1']);
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin': '*' });
    res.end(buf);
  } catch (e) { send(res, 500, String(e.message)); }
}

function handler(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== token) return send(res, 403, 'forbidden');
  const [, route, id, extra] = parts;
  const m = media.get(id);
  if (!m) return send(res, 404, 'unknown media');
  switch (route) {
    case 'direct': return m.kind === 'file' ? serveFile(req, res, m.path) : send(res, 400, 'not a file');
    case 'stream': return serveStream(req, res, m, url.searchParams);
    case 'thumb': return serveThumb(res, m, url.searchParams);
    case 'subs': return serveSubs(res, m, decodeURIComponent(extra || ''));
    case 'cover': return serveCover(res, m);
    default: return send(res, 404, 'no route');
  }
}

function start() {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ base: `http://127.0.0.1:${port}/${token}`, server });
    });
  });
}

function stopStream(id) {
  const c = activeStreams.get(String(id));
  if (c) c.kill('SIGKILL');
}

function killAll() {
  for (const c of activeStreams.values()) c.kill('SIGKILL');
}

module.exports = { start, stopStream, killAll, setPreset };

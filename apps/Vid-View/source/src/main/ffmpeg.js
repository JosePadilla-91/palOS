'use strict';
// Locates the bundled ffmpeg/ffprobe and wraps the calls Vid-View makes to them.
const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

function resolveBin(name) {
  const candidates = [];
  if (process.resourcesPath) candidates.push(path.join(process.resourcesPath, 'ffmpeg', 'bin', name));
  candidates.push(path.join(__dirname, '..', '..', 'vendor', 'ffmpeg', 'bin', name));
  for (const c of candidates) {
    try {
      fs.accessSync(c, fs.constants.X_OK);
      return c;
    } catch { /* keep looking */ }
  }
  return name; // fall back to whatever is on PATH (e.g. apt's ffmpeg)
}

const FFMPEG = resolveBin('ffmpeg');
const FFPROBE = resolveBin('ffprobe');

function run(bin, args, { timeout = 60000, maxBuffer = 64 * 1024 * 1024, encoding = 'utf8' } = {}) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout, maxBuffer, encoding, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        err.stderr = String(stderr || '').trim();
        reject(err);
      } else resolve({ stdout, stderr });
    });
  });
}

async function probe(inputArgs) {
  const { stdout } = await run(FFPROBE, [
    '-v', 'error', '-print_format', 'json',
    '-show_format', '-show_streams', '-show_chapters',
    ...inputArgs,
  ], { timeout: 45000 });
  return JSON.parse(stdout);
}

/** Time (seconds, absolute) of the keyframe at or before `absT` on the first video stream. */
async function keyframeBefore(input, absT) {
  try {
    const { stdout } = await run(FFPROBE, [
      '-v', 'error', '-select_streams', 'v:0', '-skip_frame', 'nokey',
      '-show_entries', 'frame=pts_time,best_effort_timestamp_time',
      '-read_intervals', `${absT.toFixed(3)}%+#1`, '-of', 'csv=p=0', input,
    ], { timeout: 15000 });
    const vals = stdout.trim().split(/[\n,]/).map(Number).filter((n) => Number.isFinite(n));
    return vals.length ? vals[0] : null;
  } catch {
    return null;
  }
}

/** Spawn ffmpeg with stdout piped; returns the ChildProcess. */
function spawnFfmpeg(args) {
  const child = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let err = '';
  child.stderr.on('data', (d) => {
    err += d.toString();
    if (err.length > 8000) err = err.slice(-4000);
  });
  child.getStderr = () => err.trim();
  child.on('error', () => {});
  return child;
}

/** Runs ffmpeg into a buffer (used for thumbnails and subtitles). */
function ffmpegBuffer(args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawnFfmpeg(args);
    const chunks = [];
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.stdout.on('data', (d) => chunks.push(d));
    child.on('close', (code) => {
      clearTimeout(timer);
      const buf = Buffer.concat(chunks);
      if (code === 0 || buf.length) resolve(buf);
      else reject(new Error(child.getStderr() || `ffmpeg exited ${code}`));
    });
    child.on('error', reject);
  });
}

let featureCache = null;
async function features() {
  if (featureCache) return featureCache;
  const out = { ffmpeg: FFMPEG, ffprobe: FFPROBE, version: 'unknown', dvd: false, x264: false, bundled: FFMPEG !== 'ffmpeg' };
  try {
    const v = await run(FFMPEG, ['-hide_banner', '-version']);
    out.version = (v.stdout.split('\n')[0] || '').replace(/^ffmpeg version\s*/, '').split(' ')[0];
    const d = await run(FFMPEG, ['-hide_banner', '-demuxers']);
    out.dvd = /\bdvdvideo\b/.test(d.stdout);
    const e = await run(FFMPEG, ['-hide_banner', '-encoders']);
    out.x264 = /\blibx264\b/.test(e.stdout);
  } catch (e) {
    out.error = 'ffmpeg not found';
  }
  featureCache = out;
  return out;
}

module.exports = { FFMPEG, FFPROBE, run, probe, keyframeBefore, spawnFfmpeg, ffmpegBuffer, features };

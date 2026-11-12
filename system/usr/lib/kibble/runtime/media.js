'use strict';
// Kibble's media engine, the app side: starts kibble-media (GStreamer) the first time a page plays something,
// passes each page's <video>/<audio> commands to it and its events back to that page, and lets it read the app's
// own addresses (seeker://, discette://...) through a private local relay, since only this process can answer them.
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');
const readline = require('readline');
const { Readable } = require('stream');

const ENGINE = process.env.KIBBLE_MEDIA || '/usr/lib/kibble/media/kibble-media';
let proc = null, engine = null, starting = null, appName = 'Kibble', schemeHandler = null;
let relay = null, relayPort = 0;
const RELAY_KEY = crypto.randomBytes(16).toString('hex');
const owners = new Map();      // engine player id -> { wc, pid }
const byPage = new Map();      // `${wcId}:${pid}` -> engine player id
let nextId = 1;

function setup(o) { appName = o.appName || appName; schemeHandler = o.schemeHandler; }

function startRelay() {
  if (relay) return Promise.resolve();
  relay = http.createServer(async (req, res) => {
    const m = /^\/s\/([0-9a-f]+)\/(.+)$/.exec(req.url || '');
    if (!m || m[1] !== RELAY_KEY || !schemeHandler) { res.writeHead(404); res.end(); return; }
    const url = decodeURIComponent(m[2]);
    try {
      const fn = schemeHandler(url);
      if (!fn) { res.writeHead(404); res.end(); return; }
      const headers = {}; if (req.headers.range) headers.range = req.headers.range;
      const rq = new Request(url.replace(/^[a-z][a-z0-9+.-]*:/i, 'http:'), { method: 'GET', headers });
      Object.defineProperty(rq, 'url', { value: url });
      const r = await fn(rq);
      if (!r) { res.writeHead(404); res.end(); return; }
      if (r._kibbleFile) {                       // a file: let GStreamer seek in it
        const fs = require('fs'); const st = fs.statSync(r._kibbleFile);
        const rg = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
        let a = 0, b = st.size - 1;
        if (rg) { a = rg[1] ? +rg[1] : st.size - +rg[2]; if (rg[1] && rg[2]) b = +rg[2]; }
        res.writeHead(rg ? 206 : 200, { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'content-length': b - a + 1,
          'accept-ranges': 'bytes', ...(rg ? { 'content-range': `bytes ${a}-${b}/${st.size}` } : {}) });
        fs.createReadStream(r._kibbleFile, { start: a, end: b }).pipe(res);
        return;
      }
      const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
      res.writeHead(r.status || 200, h);
      if (r.body) Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res); else res.end();
    } catch (e) { process.stderr.write(`kibble media: ${url}: ${e.message}\n`); try { res.writeHead(500); res.end(); } catch {} }
  });
  return new Promise((ok) => relay.listen(0, '127.0.0.1', () => { relayPort = relay.address().port; ok(); }));
}

function start() {
  if (starting) return starting;
  starting = new Promise((resolve) => {
    proc = spawn(ENGINE, [], { stdio: ['pipe', 'pipe', 'inherit'], env: Object.assign({}, process.env, { KIBBLE_MEDIA_APP: appName }) });
    proc.on('error', (e) => { process.stderr.write(`kibble media: can't start the media engine (${e.message})\n`); resolve(null); });
    proc.on('exit', () => {
      proc = null; engine = null; starting = null;
      for (const [id, o] of owners) deliver(o, { ev: 'error', code: 3, message: 'the media engine stopped' });
      owners.clear(); byPage.clear();
    });
    proc.stdin.on('error', () => {});
    readline.createInterface({ input: proc.stdout }).on('line', (line) => {
      let m; try { m = JSON.parse(line); } catch { return; }
      if (m.ev === 'ready') { engine = m; resolve(m); return; }
      const o = owners.get(m.pid); if (!o) return;
      if (m.ev === 'frame' || m.ev === 'meta') {
        m.url = `http://127.0.0.1:${engine.port}/n/${engine.token}/${m.pid}`;
        m.still = `http://127.0.0.1:${engine.port}/f/${engine.token}/${m.pid}.jpg`;
      }
      deliver(o, m);
    });
  });
  return starting;
}

function deliver(o, m) {
  const wc = o.wc;
  if (!wc || (wc.isDestroyed && wc.isDestroyed())) return;
  const msg = Object.assign({}, m, { pid: o.pid });
  try { wc._kb(`window.__kibbleMedia&&window.__kibbleMedia.ev(${JSON.stringify(msg)})`); } catch {}
}

function engineUri(u) {
  // what GStreamer can open itself; anything else (the app's own addresses) through the relay
  if (/^(file|https?|rtsp|rtmp):/i.test(u)) return u;
  if (/^(blob|data):/i.test(u)) return null;
  return `http://127.0.0.1:${relayPort}/s/${RELAY_KEY}/${encodeURIComponent(u)}`;
}

async function fromPage(wc, m) {
  if (!m || typeof m !== 'object') return;
  const key = `${wc.id}:${m.pid}`;
  if (m.op === 'load') {
    const old = byPage.get(key); if (old) { send({ op: 'destroy', pid: old }); owners.delete(old); }
    const id = nextId++;
    byPage.set(key, id); owners.set(id, { wc, pid: m.pid });
    await startRelay();
    const uri = m.camera ? null : engineUri(String(m.uri || ''));
    if (!m.camera && !uri) { deliver({ wc, pid: m.pid }, { ev: 'error', code: 4, message: 'this kind of address can’t be played' }); return; }
    if (!(await start())) { deliver({ wc, pid: m.pid }, { ev: 'error', code: 4, message: 'the media engine isn’t available' }); return; }
    send(Object.assign({}, m, { pid: id, uri }));
    return;
  }
  const id = byPage.get(key); if (!id) return;
  if (m.op === 'destroy') { byPage.delete(key); owners.delete(id); }
  send(Object.assign({}, m, { pid: id }));
}

function send(m) { if (proc && engine) { try { proc.stdin.write(JSON.stringify(m) + '\n'); } catch {} } }

// a window or page that goes away takes its players with it
function closeOwner(wc) {
  for (const [id, o] of [...owners]) if (o.wc === wc) { send({ op: 'destroy', pid: id }); owners.delete(id); }
  for (const k of [...byPage.keys()]) if (k.startsWith(`${wc.id}:`)) byPage.delete(k);
}

module.exports = { setup, fromPage, closeOwner };

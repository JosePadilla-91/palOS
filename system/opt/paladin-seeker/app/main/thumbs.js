'use strict';
// Thumbnails, shared with other apps through the freedesktop thumbnail cache (~/.cache/thumbnails).
// Uses the system's registered thumbnailers (/usr/share/thumbnailers), falling back to built-in
// generators for PNG/JPEG (Electron), PDF (pdftoppm) and video (ffmpegthumbnailer).
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const { HOME, run, which, readText, dataDirs, limiter } = require('./util');
const mime = require('./mime');

const CACHE = path.join(process.env.XDG_CACHE_HOME || path.join(HOME, '.cache'), 'thumbnails');
const FAIL = path.join(CACHE, 'fail', 'paladin-seeker-1.0');
const TMP = path.join(os.tmpdir(), `paladin-seeker-thumbs-${process.getuid ? process.getuid() : 0}`);
const limit = limiter(3);
const inflight = new Map();

function uriFor(p) { return 'file://' + p.split('/').map((s) => encodeURIComponent(s).replace(/%2F/g, '/')).join('/').replace(/^\/\//, '/'); }
function bucket(size) { return size <= 128 ? ['normal', 128] : size <= 256 ? ['large', 256] : size <= 512 ? ['x-large', 512] : ['xx-large', 1024]; }

let thumbnailers = null;
function loadThumbnailers() {
  thumbnailers = new Map();
  for (const d of dataDirs()) {
    const dir = path.join(d, 'thumbnailers');
    let files = []; try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.thumbnailer')); } catch {}
    for (const f of files) {
      const txt = readText(path.join(dir, f));
      const exec = (txt.match(/^Exec=(.*)$/m) || [])[1];
      const types = ((txt.match(/^MimeType=(.*)$/m) || [])[1] || '').split(';').filter(Boolean);
      const tryExec = (txt.match(/^TryExec=(.*)$/m) || [])[1];
      if (!exec || (tryExec && !which(tryExec)) || !which(exec.split(/\s+/)[0])) continue;
      for (const t of types) if (!thumbnailers.has(t)) thumbnailers.set(t, exec);
    }
  }
}

// ---- PNG text chunks (Thumb::URI, Thumb::MTime) ----
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function textChunk(key, val) {
  const data = Buffer.from(`${key}\0${val}`, 'latin1');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const type = Buffer.from('tEXt'); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([len, type, data, crc]);
}
function addText(png, uri, mtime) {
  if (png.length < 33 || png.toString('latin1', 1, 4) !== 'PNG') return png;
  const ihdrEnd = 8 + 8 + png.readUInt32BE(8) + 4;
  return Buffer.concat([png.subarray(0, ihdrEnd), textChunk('Thumb::URI', uri), textChunk('Thumb::MTime', String(Math.floor(mtime))), textChunk('Software', 'palOS Seeker'), png.subarray(ihdrEnd)]);
}

// 3D models: one still frame, drawn by the same viewer as the live cover, in a hidden page (one at a time)
const MODEL_EXT = /\.(stl|obj|glb|gltf|ply)$/i;
const stillLimit = limiter(1);
let stillWin = null, stillIdle = null;
async function stillPage() {
  if (stillWin && !stillWin.isDestroyed()) return stillWin;
  const { BrowserWindow } = require('electron');
  stillWin = new BrowserWindow({ show: false, width: 64, height: 64, webPreferences: { offscreen: true, contextIsolation: false, nodeIntegration: false, sandbox: false, backgroundThrottling: false } });
  await stillWin.loadFile(path.join(__dirname, '..', 'ui', 'model-still.html'));
  return stillWin;
}
function modelStill(src, size, tmp) {
  return stillLimit(async () => {
    clearTimeout(stillIdle);
    try {
      const w = await stillPage();
      for (let i = 0; i < 50 && !(await w.webContents.executeJavaScript('!!window.modelStillReady')); i++) await new Promise((r) => setTimeout(r, 100));
      const { pathToFileURL } = require('url');
      const ext = path.extname(src).slice(1).toLowerCase();
      const job = w.webContents.executeJavaScript(`window.modelStill(${JSON.stringify(pathToFileURL(src).href)}, ${JSON.stringify(ext)}, ${Number(size)})`);
      const data = await Promise.race([job, new Promise((_, no) => setTimeout(() => no(new Error('took too long')), 45000))]);
      if (typeof data !== 'string' || !data.startsWith('data:image/png;base64,')) return false;
      fs.writeFileSync(tmp, Buffer.from(data.slice(22), 'base64'));
      return true;
    } catch (e) { console.error('[thumbs] 3D still:', path.basename(src), e.message); if (stillWin && !stillWin.isDestroyed()) stillWin.destroy(); stillWin = null; return false; }
    finally { stillIdle = setTimeout(() => { if (stillWin && !stillWin.isDestroyed()) stillWin.destroy(); stillWin = null; }, 30000); }
  });
}

async function generate(src, type, size, out) {
  await fsp.mkdir(TMP, { recursive: true });
  const tmp = path.join(TMP, crypto.randomBytes(6).toString('hex') + '.png');
  try {
    if (!thumbnailers) loadThumbnailers();
    const exec = thumbnailers.get(type) || [...mime.parentsOf(type)].map((t) => thumbnailers.get(t)).find(Boolean);
    let ok = false;
    if (exec && !type.startsWith('image/png') && !type.startsWith('image/jpeg')) {
      const args = exec.split(/\s+/).map((a) => a.replace('%s', String(size)).replace('%u', uriFor(src)).replace('%i', src).replace('%o', tmp));
      // documents are drawn by their Chancery app (it starts without a window): give it longer
      ok = (await run(args[0], args.slice(1), { timeout: /palos-doc-thumbnailer/.test(args[0]) ? 60000 : 20000 })).ok && fs.existsSync(tmp);
    }
    if (!ok && (type === 'image/png' || type === 'image/jpeg' || type === 'image/bmp' || type === 'image/gif')) {
      const { nativeImage } = require('electron');
      const img = nativeImage.createFromPath(src);
      if (!img.isEmpty()) {
        const s = img.getSize(); const k = Math.min(1, size / Math.max(s.width, s.height));
        const r = k < 1 ? img.resize({ width: Math.max(1, Math.round(s.width * k)), height: Math.max(1, Math.round(s.height * k)), quality: 'good' }) : img;
        fs.writeFileSync(tmp, r.toPNG()); ok = true;
      }
    }
    if (!ok && type === 'application/pdf' && which('pdftoppm')) {
      ok = (await run('pdftoppm', ['-png', '-singlefile', '-f', '1', '-l', '1', '-scale-to', String(size), src, tmp.slice(0, -4)], { timeout: 20000 })).ok && fs.existsSync(tmp);
    }
    if (!ok && type.startsWith('video/') && which('ffmpegthumbnailer')) {
      ok = (await run('ffmpegthumbnailer', ['-i', src, '-o', tmp, '-s', String(size), '-c', 'png', '-t', '10%'], { timeout: 30000 })).ok && fs.existsSync(tmp);
    }
    if (!ok && MODEL_EXT.test(src) && (await fsp.stat(src)).size < 300 * 1024 * 1024) ok = await modelStill(src, size, tmp) && fs.existsSync(tmp);
    if (!ok) return false;
    const st = await fsp.stat(src);
    const png = addText(await fsp.readFile(tmp), uriFor(src), st.mtimeMs / 1000);
    await fsp.mkdir(path.dirname(out), { recursive: true, mode: 0o700 });
    await fsp.writeFile(out + '.part', png, { mode: 0o600 });
    await fsp.rename(out + '.part', out);
    return true;
  } catch { return false; } finally { fsp.unlink(tmp).catch(() => {}); }
}

/** Return a thumbnail path for the file (generating it if needed), or null. */
async function get(src, size = 256) {
  let st; try { st = await fsp.stat(src); } catch { return null; }
  if (!st.isFile()) return null;
  const type = mime.detect(src, path.basename(src), st);
  // Small images are their own thumbnail: no need to cache.
  if (type === 'image/svg+xml' || ((type.startsWith('image/') && st.size < 300 * 1024 && !/tiff|x-|heic|heif|psd/.test(type)))) return src;
  if (src.startsWith(CACHE + '/')) return src;
  const md5 = crypto.createHash('md5').update(uriFor(src)).digest('hex');
  const [dir, px] = bucket(size);
  const out = path.join(CACHE, dir, md5 + '.png');
  for (const d of [dir, 'x-large', 'large', 'normal', 'xx-large']) {
    const p = path.join(CACHE, d, md5 + '.png');
    try { const t = await fsp.stat(p); if (t.mtimeMs >= st.mtimeMs && bucketSize(d) >= Math.min(px, 256)) return p; } catch {}
  }
  const fail = path.join(FAIL, md5 + '.png');
  try { const f = await fsp.stat(fail); if (f.mtimeMs >= st.mtimeMs) return null; } catch {}
  if (inflight.has(out)) return inflight.get(out);
  const job = limit(async () => {
    const ok = await generate(src, type, px, out);
    if (!ok) { try { await fsp.mkdir(FAIL, { recursive: true }); await fsp.writeFile(fail, ''); } catch {} return null; }
    return out;
  }).finally(() => inflight.delete(out));
  inflight.set(out, job);
  return job;
}
function bucketSize(d) { return { normal: 128, large: 256, 'x-large': 512, 'xx-large': 1024 }[d] || 0; }

module.exports = { get, uriFor };

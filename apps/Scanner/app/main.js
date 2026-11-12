'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Scanner: scan with any scanner this computer can see (USB or network), preview, crop, and save as
// PDF (several pages in one file), JPEG, PNG or TIFF. Talks to scanners through SANE's scanimage.
const { app, BrowserWindow, Menu, ipcMain, nativeTheme, nativeImage, shell } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sheets = require('./sheets');

app.setName('Scanner');
if (process.platform === 'linux') app.setDesktopName('palos-scanner.desktop');
let win = null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'palos-scanner-'));
let job = null;                     // the scan in progress (a scanimage process)

function run(cmd, args, timeout = 60000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C', LANG: 'C' } }, (err, out, errout) =>
      resolve({ ok: !err, out: String(out || ''), err: String(errout || (err && err.message) || '').trim() }));
  });
}

// ---------------------------------------------------------------- scanners
async function devices() {
  const r = await run('scanimage', ['-f', '%d\t%v\t%m\t%t%n'], 45000);
  const out = [];
  for (const line of r.out.split('\n')) {
    const [id, vendor, model, type] = line.split('\t');
    if (!id || /^(test|pnm|v4l)/.test(id)) continue;               // SANE's pretend scanners and webcams
    const name = [vendor, model].filter((x) => x && !/^(unknown|noname)$/i.test(x)).join(' ') || id;
    out.push({ id, name, type: type || 'scanner', network: /^(airscan|escl|net):|:\/\/|https?:|\b\d+\.\d+\.\d+\.\d+\b/.test(id) });
  }
  // a pretend scanner for trying Scanner out, only when asked for (PALOS_SCANNER_TEST=1)
  if (process.env.PALOS_SCANNER_TEST === '1') out.push({ id: 'test', name: 'Test Scanner', type: 'virtual device', network: false });
  return out;
}

/** What a scanner can do: sources, kinds of scan, resolutions, the largest area (millimetres). */
async function options(id) {
  const r = await run('scanimage', ['-d', id, '-A'], 30000);
  if (!r.ok && !r.out) return { error: r.err || 'The scanner didn’t answer.' };
  const t = r.out;
  const list = (name) => { const m = t.match(new RegExp(`^\\s+--${name} ([^\\n]*?) \\[([^\\]]*)\\]`, 'm')); return m ? { values: m[1].split('|').map((s) => s.trim()), current: m[2] } : null; };
  const range = (flag) => { const m = t.match(new RegExp(`^\\s+-${flag} (-?[\\d.]+)\\.\\.(-?[\\d.]+)(mm|dpi)?`, 'm')); return m ? { min: +m[1], max: +m[2] } : null; };
  const out = { sources: [], modes: [], resolutions: [], area: null, hasFeeder: false };
  const src = list('source'); if (src) out.sources = src.values.filter((v) => v !== 'inactive');
  out.hasFeeder = out.sources.some((s) => /feeder|adf|duplex/i.test(s));
  const mode = list('mode'); if (mode) out.modes = mode.values;
  const res = t.match(/^\s+--resolution ([^\n]*?)dpi/m);
  if (res) {
    const v = res[1].trim();
    const rg = v.match(/^(\d+)\.\.(\d+)/);
    if (rg) out.resolutions = [75, 100, 150, 200, 300, 400, 600, 1200, 2400].filter((x) => x >= +rg[1] && x <= +rg[2]);
    else out.resolutions = v.split('|').map((x) => parseInt(x, 10)).filter((x) => x > 0);
  }
  if (!out.resolutions.length) out.resolutions = [75, 150, 300, 600];
  const l = range('l'), tt = range('t'), x = range('x'), y = range('y');
  if (x && y) out.area = { width: x.max - (l ? l.min : 0), height: y.max - (tt ? tt.min : 0) };
  return out;
}

// the kinds of scan people ask for, in the scanner's own words
function modeFor(kind, modes) {
  const want = { colour: /^colou?r/i, grey: /^gr[ae]y/i, bw: /^(lineart|binary|black|halftone|monochrome)/i }[kind] || /^colou?r/i;
  return modes.find((m) => want.test(m)) || (kind === 'bw' ? modes.find((m) => /^gr[ae]y/i.test(m)) : null) || null;
}

/** Scan. preview: the whole area at low resolution. Pages are PNG files; a feeder can give several. */
function scan(o) {
  return new Promise((resolve) => {
    if (job) return resolve({ error: 'A scan is already in progress.' });
    const opts = o.caps || {};
    const args = ['-d', o.device, '--format=png', '-p'];
    const mode = modeFor(o.kind, opts.modes || []); if (mode) args.push('--mode', mode);
    const res = o.preview ? Math.min(...(opts.resolutions || [75]).filter((r) => r >= 50).concat([150])) : o.resolution;
    if (res) args.push('--resolution', String(res));
    if (o.source && !o.preview) args.push('--source', o.source);
    if (o.area && !o.preview) {
      const a = o.area;
      args.push('-l', a.l.toFixed(1), '-t', a.t.toFixed(1), '-x', a.w.toFixed(1), '-y', a.h.toFixed(1));
    } else if (opts.area) args.push('-l', '0', '-t', '0', '-x', String(opts.area.width), '-y', String(opts.area.height));
    if (o.device === 'test') args.push('--test-picture', 'Color pattern');
    const stamp = Date.now().toString(36);
    const feeder = !o.preview && o.source && /feeder|adf|duplex/i.test(o.source);
    let file = null;
    if (feeder) args.push(`--batch=${path.join(TMP, `p-${stamp}-%03d.png`)}`);
    else { file = path.join(TMP, `${o.preview ? 'preview' : 'p'}-${stamp}.png`); args.push('-o', file); }
    let errText = '';
    job = spawn('scanimage', args, { env: { ...process.env, LC_ALL: 'C', LANG: 'C' } });
    job.stderr.on('data', (d) => {
      const s = String(d); errText += s;
      const m = s.match(/Progress: ([\d.]+)%(?![\s\S]*Progress)/);
      if (m && win) win.webContents.send('progress', parseFloat(m[1]) / 100);
    });
    job.on('close', (code, signal) => {
      job = null;
      const pages = feeder ? fs.readdirSync(TMP).filter((f) => f.startsWith(`p-${stamp}-`)).sort().map((f) => path.join(TMP, f)) : (file && fs.existsSync(file) && fs.statSync(file).size ? [file] : []);
      if (signal) return resolve({ cancelled: true, pages });
      if (!pages.length) return resolve({ error: friendly(errText) });
      resolve({ pages: pages.map((p) => ({ file: p, ...size(p) })), resolution: res, box: o.preview ? contentBox(pages[0]) : null, notice: code && !/no more documents|out of documents/i.test(errText) ? friendly(errText) : null });
    });
    job.on('error', () => { job = null; resolve({ error: 'Scanning isn’t installed on this computer (scanimage is missing).' }); });
  });
}
function friendly(err) {
  if (/no documents|out of documents|feeder.*empty/i.test(err)) return 'There’s no paper in the document feeder.';
  if (/jammed/i.test(err)) return 'The paper jammed. Clear it and try again.';
  if (/cover open/i.test(err)) return 'The scanner’s cover is open.';
  if (/busy/i.test(err)) return 'The scanner is busy. Wait a moment and try again.';
  if (/access denied|permission/i.test(err)) return 'This account isn’t allowed to use the scanner.';
  if (/invalid argument/i.test(err)) return 'The scanner didn’t accept these settings. Try a different resolution or kind of scan.';
  if (/no such device|not found|open of device/i.test(err)) return 'The scanner isn’t answering. Check that it’s on and connected.';
  return 'The scan didn’t work.' + (err.trim() ? ' (' + err.trim().split('\n').pop().slice(0, 160) + ')' : '');
}
// where the document lies on an overview: everything darker than the lid's white (fractions of the area)
function contentBox(file) {
  try {
    const img = nativeImage.createFromPath(file); const s0 = img.getSize(); if (!s0.width) return null;
    const w = 200, h = Math.max(1, Math.round(200 * s0.height / s0.width));
    const d = img.resize({ width: w, height: h }).toBitmap();
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (v < 232) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    const pad = 0.01;
    const b = { x: Math.max(0, x0 / w - pad), y: Math.max(0, y0 / h - pad) };
    b.w = Math.min(1 - b.x, (x1 - x0) / w + 2 * pad); b.h = Math.min(1 - b.y, (y1 - y0) / h + 2 * pad);
    if ((b.w > 0.95 && b.h > 0.95) || b.w < 0.05 || b.h < 0.05) return null;   // the whole bed, or a speck
    return b;
  } catch { return null; }
}
function size(file) { try { const s = nativeImage.createFromPath(file).getSize(); return { width: s.width, height: s.height }; } catch { return {}; } }

// ---------------------------------------------------------------- saving
/** A minimal baseline TIFF writer (RGB, 8 bits, uncompressed; several pages in one file). */
function tiff(pages) {
  const parts = []; let offset = 8;
  const ifds = [];
  for (const p of pages) {
    const img = nativeImage.createFromPath(p.file); const { width, height } = img.getSize();
    const bgra = img.toBitmap();
    const rgb = Buffer.alloc(width * height * 3);
    for (let i = 0, j = 0; i < bgra.length; i += 4, j += 3) { rgb[j] = bgra[i + 2]; rgb[j + 1] = bgra[i + 1]; rgb[j + 2] = bgra[i]; }
    ifds.push({ width, height, rgb, dpi: p.resolution || 300 });
  }
  const header = Buffer.from([0x49, 0x49, 42, 0, 0, 0, 0, 0]);
  parts.push(header);
  const entries = 12;
  for (let k = 0; k < ifds.length; k++) {
    const f = ifds[k];
    const dataOff = offset; parts.push(f.rgb); offset += f.rgb.length; if (offset % 2) { parts.push(Buffer.alloc(1)); offset++; }
    const bpsOff = offset; const bps = Buffer.alloc(6); bps.writeUInt16LE(8, 0); bps.writeUInt16LE(8, 2); bps.writeUInt16LE(8, 4); parts.push(bps); offset += 6;
    const resOff = offset; const rat = Buffer.alloc(16); rat.writeUInt32LE(f.dpi, 0); rat.writeUInt32LE(1, 4); rat.writeUInt32LE(f.dpi, 8); rat.writeUInt32LE(1, 12); parts.push(rat); offset += 16;
    const ifdOff = offset;
    if (k === 0) header.writeUInt32LE(ifdOff, 4); else ifds[k - 1].nextPtr.writeUInt32LE(ifdOff, 0);
    const ifd = Buffer.alloc(2 + entries * 12 + 4);
    ifd.writeUInt16LE(entries, 0);
    const tags = [[256, 4, 1, f.width], [257, 4, 1, f.height], [258, 3, 3, bpsOff], [259, 3, 1, 1], [262, 3, 1, 2], [273, 4, 1, dataOff],
      [277, 3, 1, 3], [278, 4, 1, f.height], [279, 4, 1, f.rgb.length], [282, 5, 1, resOff], [283, 5, 1, resOff + 8], [296, 3, 1, 2]];
    tags.forEach(([tag, type, count, val], i) => {
      const o = 2 + i * 12; ifd.writeUInt16LE(tag, o); ifd.writeUInt16LE(type, o + 2); ifd.writeUInt32LE(count, o + 4);
      if (type === 3 && count === 1) ifd.writeUInt16LE(val, o + 8); else ifd.writeUInt32LE(val, o + 8);
    });
    f.nextPtr = ifd.subarray(2 + entries * 12);
    parts.push(ifd); offset += ifd.length;
  }
  return Buffer.concat(parts);
}

/** PDF: each page the size of what was scanned, made by Chromium's own PDF printer. */
async function pdf(pages) {
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: false, sandbox: true } });
  const sized = pages.map((p) => { const dpi = p.resolution || 300; return { file: p.file, wIn: (p.width || 2550) / dpi, hIn: (p.height || 3300) / dpi }; });
  const pageW = Math.max(...sized.map((s) => s.wIn)), pageH = Math.max(...sized.map((s) => s.hIn));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${pageW}in ${pageH}in;margin:0}html,body{margin:0}
    .pg{width:${pageW}in;height:${pageH}in;display:flex;align-items:flex-start;justify-content:flex-start;page-break-after:always;overflow:hidden}
    .pg:last-child{page-break-after:auto}img{display:block}</style></head><body>${sized.map((s) => `<div class="pg"><img src="${'file://' + encodeURI(s.file)}" style="width:${s.wIn}in;height:${s.hIn}in"></div>`).join('')}</body></html>`;
  const htmlFile = path.join(TMP, `doc-${Date.now()}.html`);
  fs.writeFileSync(htmlFile, html);
  await w.loadFile(htmlFile);
  await w.webContents.executeJavaScript('Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))');
  const data = await w.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, margins: { marginType: 'none' } });
  w.destroy();
  fs.unlinkSync(htmlFile);
  return data;
}

async function save(o) {
  const fmt = o.format;
  const pages = (o.pages || []).filter((p) => p && fs.existsSync(p.file));
  if (!pages.length) return { error: 'There’s nothing to save yet.' };
  const ext = { pdf: 'pdf', jpeg: 'jpg', png: 'png', tiff: 'tiff' }[fmt] || 'pdf';
  const filters = { pdf: [{ name: 'PDF Document', extensions: ['pdf'] }], jpeg: [{ name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }], png: [{ name: 'PNG Image', extensions: ['png'] }], tiff: [{ name: 'TIFF Image', extensions: ['tif', 'tiff'] }] }[fmt];
  const base = o.name || 'Scan';
  const dir = fs.existsSync(path.join(os.homedir(), 'Documents')) ? path.join(os.homedir(), 'Documents') : os.homedir();
  const r = await sheets.save(win, { title: 'Save Scan', defaultPath: path.join(dir, `${base}.${ext}`), filters, buttonLabel: 'Save' });
  if (!r || r.canceled || !r.filePath) return { cancelled: true };
  let target = r.filePath;
  if (!path.extname(target)) target += '.' + ext;
  if (win) win.webContents.send('saving', true);
  const written = [];
  try {
    if (fmt === 'pdf') { fs.writeFileSync(target, await pdf(pages)); written.push(target); }
    else if (fmt === 'tiff') { fs.writeFileSync(target, tiff(pages)); written.push(target); }
    else {
      // one picture per page: "Scan.jpg", then "Scan 2.jpg", "Scan 3.jpg"…
      pages.forEach((p, i) => {
        const f = i === 0 ? target : target.replace(/(\.[^.]+)$/, ` ${i + 1}$1`);
        if (fmt === 'png') fs.copyFileSync(p.file, f); else fs.writeFileSync(f, nativeImage.createFromPath(p.file).toJPEG(o.quality || 88));
        written.push(f);
      });
    }
  } catch (e) { return { error: 'The scan couldn’t be saved: ' + e.message }; } finally { if (win) win.webContents.send('saving', false); }
  if (o.openAfter && written[0]) shell.openPath(written[0]);
  return { files: written };
}

// ---------------------------------------------------------------- IPC
const H = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => { try { return await fn(...a); } catch (err) { return { error: String(err.message || err) }; } });
H('devices', devices);
H('options', options);
H('scan', scan);
H('cancel', () => { if (job) job.kill('SIGTERM'); return true; });
H('save', save);
H('show', (f) => { shell.showItemInFolder(f); return true; });
H('discard', (files) => { for (const f of files || []) if (String(f).startsWith(TMP + path.sep)) { try { fs.unlinkSync(f); } catch {} } return true; });
ipcMain.handle('ui:message', (e, o) => sheets.message(win, o));

function create() {
  win = new BrowserWindow({ width: 1040, height: 700, minWidth: 820, minHeight: 520, title: 'Scanner', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2', icon: '/usr/share/icons/hicolor/256x256/apps/palos-scanner.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; app.quit(); });
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Overview', accelerator: 'Ctrl+Shift+O', click: send('preview') }, { label: 'Scan', accelerator: 'Ctrl+Return', click: send('scan') }, { type: 'separator' },
      { label: 'Save…', accelerator: 'Ctrl+S', click: send('save') }, { type: 'separator' }, { label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() }, { label: 'Quit Scanner', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [{ label: 'Select Whole Area', accelerator: 'Ctrl+A', click: send('selectAll') }, { label: 'Delete Page', accelerator: 'Delete', click: send('deletePage') }, { label: 'Clear All Pages', click: send('clearPages') }] },
    { label: 'View', submenu: [{ label: 'Look for Scanners Again', accelerator: 'Ctrl+R', click: send('refresh') }] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }] },
  ]));
}
app.on('will-quit', () => { if (job) try { job.kill('SIGTERM'); } catch {} try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });
if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } }); app.whenReady().then(create); }

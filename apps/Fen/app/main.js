'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Fen: the palOS viewer for photos, PDFs and fonts.
//   fen [FILE...]
// Every document opens in its own window. Photos: zoom, rotate, flip, crop, resize, export, print,
// slideshow, the rest of the folder in a filmstrip, camera details. PDFs: pages, thumbnails, contents,
// find, selectable text, links, forms (fill in and save), print. Fonts: a type specimen and Install.
const { app, BrowserWindow, ipcMain, dialog, nativeTheme, screen, shell, Menu, clipboard, nativeImage } = require('electron');
const sheets = require('./sheets');
const { execFileSync, spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const readline = require('readline');

app.setName('Fen');
if (process.platform === 'linux') app.setDesktopName('palos-fen.desktop');
app.commandLine.appendSwitch('disable-features', 'GlobalShortcutsPortal');

const HELPER = '/usr/lib/palos-fen/fen-helper';
const ICON = '/usr/share/icons/hicolor/256x256/apps/palos-fen.png';
const HOME = os.homedir();
const CACHE = path.join(process.env.XDG_CACHE_HOME || path.join(HOME, '.cache'), 'fen');

// what Chromium shows by itself, what the helper converts first, PDFs and fonts
const NATIVE = new Set(['jpg', 'jpeg', 'jpe', 'jfif', 'pjpeg', 'png', 'apng', 'gif', 'webp', 'avif', 'bmp', 'ico', 'cur', 'svg', 'svgz']);
const CONVERT = new Set(['tif', 'tiff', 'heic', 'heif', 'hif', 'tga', 'pnm', 'pbm', 'pgm', 'ppm', 'xpm', 'xbm', 'icns', 'ani', 'qtif', 'jxl',
  'cr2', 'cr3', 'crw', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'dng', 'raf', 'orf', 'rw2', 'pef', 'srw', 'x3f', 'raw', 'rwl', 'mrw', 'kdc', 'dcr', '3fr', 'erf', 'mef', 'mos', 'iiq']);
const FONT = new Set(['ttf', 'otf', 'ttc', 'otc', 'woff', 'woff2']);
const ext = (p) => (path.extname(p).slice(1) || '').toLowerCase();
function kindOf(p) {
  const e = ext(p);
  if (e === 'pdf') return 'pdf';
  if (NATIVE.has(e) || CONVERT.has(e)) return 'image';
  if (FONT.has(e)) return 'font';
  // no telling extension: look at the first bytes
  try {
    const fd = fs.openSync(p, 'r'); const b = Buffer.alloc(16); fs.readSync(fd, b, 0, 16, 0); fs.closeSync(fd);
    if (b.slice(0, 5).toString() === '%PDF-') return 'pdf';
    if (b[0] === 0xff && b[1] === 0xd8) return 'image';
    if (b.slice(1, 4).toString() === 'PNG' || b.slice(0, 3).toString() === 'GIF') return 'image';
    if (b.slice(4, 12).toString().startsWith('ftyp')) return 'image';
  } catch {}
  return null;
}
const isImage = (p) => NATIVE.has(ext(p)) || CONVERT.has(ext(p));

// ---------------------------------------------------------------- dark mode (palOS switch)
function readDark() {
  try { return /prefer-dark/.test(execFileSync('palos-pref', ['get', 'interface.color-scheme'], { encoding: 'utf8', timeout: 3000 })); } catch { return null; }
}
function watchDark() {
  let p;
  try { p = spawn('palos-pref', ['monitor', 'interface.color-scheme'], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return; }
  p.on('error', () => {});
  p.stdout.on('data', (d) => { nativeTheme.themeSource = /prefer-dark/.test(String(d)) ? 'dark' : 'light'; });
  app.on('will-quit', () => { try { p.kill(); } catch {} });
}

// ---------------------------------------------------------------- helper (python: converts and thumbnails)
let helper = null, hseq = 0;
const hpending = new Map();
function helperCall(cmd, args) {
  if (!helper) {
    helper = spawn('/usr/bin/python3', [HELPER], { stdio: ['pipe', 'pipe', 'inherit'] });
    readline.createInterface({ input: helper.stdout }).on('line', (line) => {
      let m; try { m = JSON.parse(line); } catch { return; }
      const p = hpending.get(m.id); if (!p) return;
      hpending.delete(m.id);
      m.ok ? p.resolve(m.result) : p.reject(new Error(m.error || 'failed'));
    });
    helper.on('exit', () => { helper = null; for (const p of hpending.values()) p.reject(new Error('The picture converter stopped.')); hpending.clear(); });
    helper.on('error', () => {});
  }
  return new Promise((resolve, reject) => {
    const id = ++hseq;
    hpending.set(id, { resolve, reject });
    helper.stdin.write(JSON.stringify({ id, cmd, ...args }) + '\n');
  });
}

function cacheName(p, st, tag) {
  return path.join(CACHE, crypto.createHash('sha1').update(`${p}\0${st.size}\0${st.mtimeMs}\0${tag}`).digest('hex'));
}

async function displayable(p) {
  const st = await fsp.stat(p);
  if (NATIVE.has(ext(p))) return { url: fileURL(p), converted: false };
  await fsp.mkdir(CACHE, { recursive: true });
  const out = cacheName(p, st, 'full') + '.png';
  if (!fs.existsSync(out)) await helperCall('convert', { src: p, dst: out });
  return { url: fileURL(out), converted: true, cache: out };
}

async function thumb(p, size) {
  const st = await fsp.stat(p);
  await fsp.mkdir(CACHE, { recursive: true });
  const out = cacheName(p, st, `t${size}`) + '.png';
  if (!fs.existsSync(out)) await helperCall('thumb', { src: p, dst: out, size });
  return fileURL(out);
}

function fileURL(p) { return 'file://' + p.split('/').map(encodeURIComponent).join('/'); }

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
async function siblings(p) {
  const dir = path.dirname(p);
  let names = [];
  try { names = await fsp.readdir(dir); } catch { return [p]; }
  const list = names.filter((n) => !n.startsWith('.') && isImage(n)).sort(collator.compare).map((n) => path.join(dir, n));
  return list.includes(p) ? list : [p, ...list];
}

// ---------------------------------------------------------------- windows
const wins = new Set();
let cascade = 0;
function openWindow(file) {
  const wa = screen.getPrimaryDisplay().workArea;
  const width = Math.min(1100, wa.width - 60), height = Math.min(780, wa.height - 60);
  const off = (cascade++ % 6) * 26;
  const win = new BrowserWindow({
    width, height, minWidth: 420, minHeight: 320,
    x: wa.x + Math.round((wa.width - width) / 2) + off, y: wa.y + Math.round(Math.max(20, (wa.height - height) / 3)) + off,
    title: file ? path.basename(file) : 'Fen', show: false, autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#25292e' : '#e9ecef', icon: ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false,
      // PDF text you can select lines up with the printed words only when the generic fonts measure like
      // Times / Helvetica / Courier: the Liberation fonts are made to match them exactly
      defaultFontFamily: { serif: 'Liberation Serif', sansSerif: 'Liberation Sans', monospace: 'Liberation Mono' },
    },
  });
  win.setMenuBarVisibility(false);
  win.fenFile = file || null;
  wins.add(win);
  win.loadFile(path.join(__dirname, 'ui', 'index.html'), { query: { file: file || '' } });
  win.once('ready-to-show', () => { win.show(); win.focus(); });
  // if the graphics process never reports a first paint (busy or software-only computers), show it anyway
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) { win.show(); win.focus(); } }, 3000));
  win.on('closed', () => wins.delete(win));
  win.on('focus', () => refreshMenu());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?|mailto):/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { e.preventDefault(); if (/^(https?|mailto):/.test(url)) shell.openExternal(url); });
  return win;
}

function filesFrom(argv) {
  return argv.filter((a) => a && !a.startsWith('-') && a !== process.execPath).map((a) => a.startsWith('file://') ? decodeURIComponent(a.slice(7)) : path.resolve(a))
    .filter((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
}

async function chooseFiles(win) {
  const r = await sheets.open(win || undefined, {
    title: 'Open', properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Photos, PDFs and Fonts', extensions: [...NATIVE, ...CONVERT, 'pdf', ...FONT] },
      { name: 'Photos', extensions: [...NATIVE, ...CONVERT] }, { name: 'PDF Documents', extensions: ['pdf'] },
      { name: 'Fonts', extensions: [...FONT] }, { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (r.canceled) return;
  openFiles(r.filePaths, win);
}

function openFiles(files, reuse) {
  files.forEach((f, i) => {
    app.addRecentDocument(f);
    // an empty window (opened without a file) takes the first document
    if (i === 0 && reuse && !reuse.isDestroyed() && !reuse.fenFile) { reuse.fenFile = f; reuse.webContents.send('fen:open', f); return; }
    const existing = [...wins].find((w) => w.fenFile === f);
    if (existing) { existing.show(); existing.focus(); return; }
    openWindow(f);
  });
}

// ---------------------------------------------------------------- menus (shown in the palOS menu bar)
let menuState = { kind: null, canSave: false, slideshow: false };
function send(cmd, ...a) { const w = BrowserWindow.getFocusedWindow() || [...wins].pop(); if (w) w.webContents.send('fen:command', cmd, ...a); }
function refreshMenu() {
  const k = menuState.kind;
  const img = k === 'image', pdf = k === 'pdf', font = k === 'font';
  const it = (label, cmd, accelerator, enabled = true, extra = {}) => ({ label, accelerator, enabled, click: () => send(cmd), ...extra });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Fen', submenu: [{ label: 'About Fen', click: () => about() }, { type: 'separator' }, { label: 'Quit Fen', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'File', submenu: [
      { label: 'Open…', accelerator: 'Ctrl+O', click: () => chooseFiles(BrowserWindow.getFocusedWindow()) },
      { label: 'Open Recent', role: 'recentDocuments', submenu: [{ label: 'Clear Menu', role: 'clearRecentDocuments' }] },
      { type: 'separator' },
      it('Save', 'save', 'Ctrl+S', !!menuState.canSave),
      it('Export…', 'export', 'Ctrl+Shift+S', img || pdf),
      { type: 'separator' },
      it('Show in Seeker', 'reveal', 'Ctrl+Shift+R', !!k),
      it('Move to Trash', 'trash', 'Ctrl+Backspace', !!k),
      { type: 'separator' },
      it('Print…', 'print', 'Ctrl+P', img || pdf),
      { type: 'separator' },
      { label: 'Close Window', accelerator: 'Ctrl+W', click: () => { const w = BrowserWindow.getFocusedWindow(); if (w) w.close(); } },
    ] },
    { label: 'Edit', submenu: [
      { role: 'copy', label: 'Copy' }, it('Copy Picture', 'copyImage', 'Ctrl+Shift+C', img), { role: 'selectAll', label: 'Select All' },
      { type: 'separator' },
      it('Select Text', 'tool:select', 'Ctrl+Alt+1', pdf), it('Highlight', 'tool:highlight', 'Ctrl+Alt+2', pdf), it('Add Text', 'tool:text', 'Ctrl+Alt+3', pdf), it('Draw', 'tool:draw', 'Ctrl+Alt+4', pdf),
      it('Sign…', 'sign', 'Ctrl+Alt+5', pdf), it('Sign with a Certificate…', 'certify', '', pdf),
      { type: 'separator' }, it('Find…', 'find', 'Ctrl+F', pdf), it('Find Next', 'findNext', 'Ctrl+G', pdf), it('Find Previous', 'findPrev', 'Ctrl+Shift+G', pdf),
    ] },
    { label: 'View', submenu: [
      it('Actual Size', 'zoomActual', 'Ctrl+0', img || pdf), it('Zoom to Fit', 'zoomFit', 'Ctrl+9', img || pdf), it('Zoom In', 'zoomIn', 'Ctrl+=', img || pdf), it('Zoom Out', 'zoomOut', 'Ctrl+-', img || pdf),
      { type: 'separator' },
      it('Sidebar', 'sidebar', 'Ctrl+Alt+S', pdf), it('Two Pages', 'spread', '', pdf), it('Filmstrip', 'filmstrip', 'Ctrl+Alt+F', img), it('Info', 'info', 'Ctrl+I', !!k),
      { type: 'separator' },
      it('Slideshow', 'slideshow', 'F5', img || pdf), { label: 'Full Screen', accelerator: 'F11', click: () => { const w = BrowserWindow.getFocusedWindow(); if (w) w.setFullScreen(!w.isFullScreen()); } },
    ] },
    { label: 'Go', submenu: [
      it('Previous', 'prev', 'Left', img || pdf, { registerAccelerator: false }), it('Next', 'next', 'Right', img || pdf, { registerAccelerator: false }),
      it('First', 'first', 'Home', img || pdf, { registerAccelerator: false }), it('Last', 'last', 'End', img || pdf, { registerAccelerator: false }),
      { type: 'separator' }, it('Go to Page…', 'gotoPage', 'Ctrl+Alt+G', pdf),
    ] },
    { label: 'Tools', submenu: [
      it('Rotate Left', 'rotateLeft', 'Ctrl+L', img || pdf), it('Rotate Right', 'rotateRight', 'Ctrl+R', img || pdf),
      it('Flip Horizontal', 'flipH', '', img), it('Flip Vertical', 'flipV', '', img),
      { type: 'separator' }, it('Crop to Selection', 'crop', 'Ctrl+K', img), it('Adjust Size…', 'resize', '', img),
      { type: 'separator' }, it('Set as Desktop Picture', 'wallpaper', '', img), it('Install Font', 'installFont', '', font),
    ] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize' }, { label: 'Zoom', click: () => { const w = BrowserWindow.getFocusedWindow(); if (w) (w.isMaximized() ? w.unmaximize() : w.maximize()); } }] },
  ]));
}

function about() {
  sheets.message(BrowserWindow.getFocusedWindow() || undefined, {
    type: 'info', title: 'About Fen', message: `Fen ${app.getVersion()}`, icon: nativeImage.createFromPath(ICON),
    detail: 'Photos, PDFs and fonts for palOS.\nPDF pages are drawn with pdf.js (Mozilla).',
  });
}

// ---------------------------------------------------------------- IPC
function H(ch, fn) { ipcMain.handle(ch, async (e, ...a) => { try { return { ok: true, value: await fn(e, ...a) }; } catch (err) { return { ok: false, error: err.message || String(err) }; } }); }
const winOf = (e) => BrowserWindow.fromWebContents(e.sender);

H('fen:info', async (e, p) => {
  const st = await fsp.stat(p);
  const kind = kindOf(p);
  if (!kind) throw new Error(`Fen can’t open “${path.basename(p)}”: it isn’t a photo, PDF or font.`);
  const w = winOf(e); if (w) { w.fenFile = p; w.setTitle(path.basename(p)); w.setRepresentedFilename && w.setRepresentedFilename(p); }
  return { path: p, name: path.basename(p), dir: path.dirname(p), kind, size: st.size, mtime: st.mtimeMs, ext: ext(p), writable: (() => { try { fs.accessSync(p, fs.constants.W_OK); return true; } catch { return false; } })() };
});
H('fen:display', (e, p) => displayable(p));
H('fen:thumb', (e, p, size) => thumb(p, size || 128));
H('fen:siblings', (e, p) => siblings(p));
H('fen:read', async (e, p) => new Uint8Array(await fsp.readFile(p)));
H('fen:exif', async (e, p) => {
  try {
    const out = execFileSync('exiftool', ['-json', '-G1', '-s', '-n', '-api', 'LargeFileSupport=1', p], { encoding: 'utf8', timeout: 15000, maxBuffer: 8e6 });
    return JSON.parse(out)[0] || {};
  } catch { return {}; }
});
H('fen:setOrientation', async (e, p, orientation) => {
  // JPEG rotation without re-compressing: only the orientation tag changes
  execFileSync('exiftool', ['-q', '-n', '-overwrite_original', '-P', `-IFD0:Orientation=${orientation}`, p], { timeout: 20000 });
  return true;
});
H('fen:write', async (e, p, bytes) => {
  const tmp = path.join(path.dirname(p), `.${path.basename(p)}.fen-${process.pid}`);
  await fsp.writeFile(tmp, Buffer.from(bytes));
  try { const st = await fsp.stat(p); await fsp.chmod(tmp, st.mode & 0o7777); } catch {}
  await fsp.rename(tmp, p);
  return true;
});
H('fen:saveDialog', async (e, defaultPath, filters) => {
  const r = await sheets.save(winOf(e), { defaultPath, filters });
  return r.canceled ? null : r.filePath;
});
H('fen:confirm', async (e, message, detail, ok) => {
  const r = await sheets.message(winOf(e), { type: 'question', buttons: ['Cancel', ok || 'OK'], defaultId: 1, cancelId: 0, message, detail, icon: nativeImage.createFromPath(ICON) });
  return r.response === 1;
});
H('fen:askSave', async (e, name) => {
  const r = await sheets.message(winOf(e), { type: 'question', buttons: ['Don’t Save', 'Cancel', 'Save'], defaultId: 2, cancelId: 1,
    message: `Do you want to save the changes you made to “${name}”?`, detail: 'Your changes will be lost if you don’t save them.', icon: nativeImage.createFromPath(ICON) });
  return ['discard', 'cancel', 'save'][r.response];
});
H('fen:error', async (e, message, detail) => { await sheets.message(winOf(e), { type: 'error', buttons: ['OK'], message, detail, icon: nativeImage.createFromPath(ICON) }); return true; });
H('fen:trash', async (e, p) => { await shell.trashItem(p); return true; });
H('fen:reveal', (e, p) => {
  try { spawn('paladin-seeker', ['--select', p], { detached: true, stdio: 'ignore' }).unref(); } catch { shell.showItemInFolder(p); }
  return true;
});
H('fen:copyImage', (e, dataUrl) => { clipboard.writeImage(nativeImage.createFromDataURL(dataUrl)); return true; });
H('fen:wallpaper', async (e, p) => {
  let target = p;
  if (!NATIVE.has(ext(p)) || ext(p) === 'svgz' || ext(p) === 'ico') {
    // the desktop shows common formats; anything else is saved as PNG in ~/.local/share/backgrounds first
    const dir = path.join(HOME, '.local/share/backgrounds'); await fsp.mkdir(dir, { recursive: true });
    target = path.join(dir, path.basename(p).replace(/\.[^.]+$/, '') + '.png');
    const d = await displayable(p);
    await fsp.copyFile(d.cache || p, target);
  }
  const cfgPath = path.join(process.env.XDG_CONFIG_HOME || path.join(HOME, '.config'), 'paladin-seeker', 'config.json');
  let cfg = {}; try { cfg = JSON.parse(await fsp.readFile(cfgPath, 'utf8')); } catch {}
  cfg.wallpaper = target; if (cfg.wallpaperMode === 'color' || !cfg.wallpaperMode) cfg.wallpaperMode = 'fill';
  await fsp.mkdir(path.dirname(cfgPath), { recursive: true });
  await fsp.writeFile(cfgPath, JSON.stringify(cfg, null, 2));
  return true;
});
H('fen:installFont', async (e, p) => {
  const dir = path.join(process.env.XDG_DATA_HOME || path.join(HOME, '.local/share'), 'fonts');
  await fsp.mkdir(dir, { recursive: true });
  const dst = path.join(dir, path.basename(p));
  await fsp.copyFile(p, dst);
  try { execFileSync('fc-cache', ['-f', dir], { timeout: 60000 }); } catch {}
  return dst;
});
H('fen:fontInstalled', async (e, p) => {
  const dir = path.join(process.env.XDG_DATA_HOME || path.join(HOME, '.local/share'), 'fonts');
  return fs.existsSync(path.join(dir, path.basename(p))) || p.startsWith('/usr/share/fonts/') || p.startsWith(dir + '/');
});
H('fen:print', async (e) => new Promise((resolve) => winOf(e).webContents.print({ printBackground: true }, (ok, reason) => resolve({ ok, reason }))));
H('fen:choose', (e) => chooseFiles(winOf(e)));

// ---------------------------------------------------------------- signatures (PDFs)
// Drawn/typed signatures are kept as pictures in ~/.local/share/palos/fen/signatures; signing certificates
// (.p12) in ~/.local/share/palos/fen/certificates. Certified signing runs /usr/lib/palos-fen/fen-sign.
const FENDATA = path.join(process.env.XDG_DATA_HOME || path.join(HOME, '.local', 'share'), 'palos', 'fen');
const SIGDIR = path.join(FENDATA, 'signatures');
const CERTDIR = path.join(FENDATA, 'certificates');
const SIGNER = '/usr/lib/palos-fen/fen-sign';
function fenSign(cmd, req) {
  return new Promise((resolve, reject) => {
    const p = spawn(SIGNER, [cmd], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', () => { try { resolve(JSON.parse(out)); } catch { reject(new Error(err.trim().split('\n').pop() || 'The signing tool didn’t answer.')); } });
    p.stdin.end(JSON.stringify(req));
  });
}
H('fen:sig:list', async () => {
  let names = []; try { names = (await fsp.readdir(SIGDIR)).filter((f) => f.endsWith('.png')).sort().reverse(); } catch {}
  return Promise.all(names.map(async (f) => ({ id: f, url: 'data:image/png;base64,' + (await fsp.readFile(path.join(SIGDIR, f))).toString('base64') })));
});
H('fen:sig:add', async (e, url) => {
  const m = /^data:image\/png;base64,(.+)$/.exec(String(url || ''));
  if (!m) throw new Error('not a picture');
  await fsp.mkdir(SIGDIR, { recursive: true, mode: 0o700 });
  const id = `${Date.now()}.png`;
  await fsp.writeFile(path.join(SIGDIR, id), Buffer.from(m[1], 'base64'), { mode: 0o600 });
  return id;
});
H('fen:sig:remove', async (e, id) => { if (/^[\w.-]+\.png$/.test(id)) await fsp.rm(path.join(SIGDIR, id), { force: true }); return true; });
H('fen:certs:list', async () => {
  let names = []; try { names = (await fsp.readdir(CERTDIR)).filter((f) => /\.(p12|pfx)$/i.test(f)); } catch {}
  return names.map((f) => ({ path: path.join(CERTDIR, f), name: f.replace(/\.(p12|pfx)$/i, '') }));
});
H('fen:certs:choose', async (e) => {
  const r = await dialog.showOpenDialog(winOf(e), { title: 'Choose a Signing Certificate', properties: ['openFile'], filters: [{ name: 'Certificates', extensions: ['p12', 'pfx'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  // keep a copy with the others, so it's in the list next time
  await fsp.mkdir(CERTDIR, { recursive: true, mode: 0o700 });
  const dst = path.join(CERTDIR, path.basename(r.filePaths[0]));
  if (path.resolve(dst) !== path.resolve(r.filePaths[0])) await fsp.copyFile(r.filePaths[0], dst);
  await fsp.chmod(dst, 0o600);
  return dst;
});
H('fen:certs:create', async (e, v) => {
  const safe = String(v.name || 'Me').replace(/[^\p{L}\p{N} ._-]+/gu, '').trim().slice(0, 60) || 'Me';
  const r = await fenSign('make-cert', { name: v.name, email: v.email || '', password: v.password || '', out: path.join(CERTDIR, `${safe}.p12`) });
  if (!r.ok) throw new Error(r.error || 'The certificate couldn’t be made.');
  return { path: r.path };
});
H('fen:sign', async (e, req) => {
  // the PDF as it is now (with the page edits) goes in; the signed copy comes out where the person chose
  const tmpIn = path.join(os.tmpdir(), `fen-sign-${process.pid}-${Date.now()}.pdf`);
  const tmpImg = req.image ? tmpIn.replace(/\.pdf$/, '.png') : null;
  await fsp.writeFile(tmpIn, Buffer.from(req.bytes));
  if (tmpImg) await fsp.writeFile(tmpImg, Buffer.from(req.image.replace(/^data:image\/png;base64,/, ''), 'base64'));
  try {
    const r = await fenSign('sign', { in: tmpIn, out: req.out, p12: req.p12, password: req.password, page: req.page, box: req.box, reason: req.reason, location: req.location, image: tmpImg });
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, signer: r.signer };
  } finally { fsp.rm(tmpIn, { force: true }).catch(() => {}); if (tmpImg) fsp.rm(tmpImg, { force: true }).catch(() => {}); }
});
H('fen:verify', async (e, p) => fenSign('verify', { in: p }));
H('fen:me', () => { try { return (require('child_process').execFileSync('getent', ['passwd', os.userInfo().username]).toString().split(':')[4] || '').split(',')[0] || os.userInfo().username; } catch { return os.userInfo().username; } });
H('fen:openFiles', (e, files) => openFiles(files.filter((f) => { try { return fs.statSync(f).isFile(); } catch { return false; } }), winOf(e)));
ipcMain.on('fen:state', (e, s) => { menuState = { ...menuState, ...s }; refreshMenu(); });
ipcMain.on('fen:fullscreen', (e, on) => { const w = winOf(e); if (w) w.setFullScreen(on == null ? !w.isFullScreen() : !!on); });
ipcMain.on('fen:title', (e, t) => { const w = winOf(e); if (w) w.setTitle(t || 'Fen'); });

// ---------------------------------------------------------------- start
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
app.on('second-instance', (e, argv) => {
  const files = filesFrom(argv.slice(1));
  if (files.length) openFiles(files);
  else { const w = [...wins].pop(); if (w) { w.show(); w.focus(); } else openWindow(null); }
});
app.whenReady().then(() => {
  const dark = readDark(); if (dark !== null) nativeTheme.themeSource = dark ? 'dark' : 'light';
  watchDark();
  refreshMenu();
  const files = filesFrom(process.argv.slice(1));
  if (files.length) openFiles(files); else openWindow(null);
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { if (helper) try { helper.kill(); } catch {} });

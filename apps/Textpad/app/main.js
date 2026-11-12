'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Textpad: the palOS text editor. One window per document, plain text in, plain text out.
const { app, BrowserWindow, Menu, ipcMain, shell, nativeTheme } = require('electron');
const sheets = require('./sheets');
const fs = require('fs');
const os = require('os');
const path = require('path');

app.setName('Textpad');
if (process.platform === 'linux') app.setDesktopName('palos-textpad.desktop');

const CONF_DIR = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'palos-textpad');
const CONF = path.join(CONF_DIR, 'settings.json');
const DEFAULTS = { wrap: true, lineNumbers: false, mono: true, fontSize: 14, recent: [], spaces: false, tabSize: 4 };
const BIG = 50 * 1024 * 1024;          // larger than this: ask before opening

function readJSON(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } }
let settings = { ...DEFAULTS, ...readJSON(CONF, {}) };
function saveSettings() {
  try { fs.mkdirSync(CONF_DIR, { recursive: true }); fs.writeFileSync(CONF + '.tmp', JSON.stringify(settings, null, 1)); fs.renameSync(CONF + '.tmp', CONF); } catch {}
}
function setSetting(k, v) {
  settings[k] = v; saveSettings();
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('settings', settings);
  buildMenu();
}
function addRecent(p) {
  settings.recent = [p, ...settings.recent.filter((x) => x !== p)].slice(0, 12);
  saveSettings(); buildMenu();
}

// ---------------------------------------------------------------- documents
const docs = new Map();              // webContents.id -> { win, file, dirty }
let untitled = 0;

function titleFor(d) {
  const name = d.file ? path.basename(d.file) : d.name;
  return `${name}${d.dirty ? ' — Edited' : ''}`;
}
function refreshTitle(d) { if (!d.win.isDestroyed()) d.win.setTitle(titleFor(d)); }

function detectBinary(buf) {
  const n = Math.min(buf.length, 8192);
  let odd = 0;
  for (let i = 0; i < n; i++) { const c = buf[i]; if (c === 0) return true; if (c < 7 || (c > 13 && c < 32)) odd++; }
  return n > 0 && odd / n > 0.1;
}
function decode(buf) {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return { text: buf.slice(3).toString('utf8'), encoding: 'UTF-8 (BOM)', bom: true };
  if (buf[0] === 0xff && buf[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(buf.slice(2)), encoding: 'UTF-16', utf16: true };
  const utf8 = new TextDecoder('utf-8', { fatal: true });
  try { return { text: utf8.decode(buf), encoding: 'UTF-8' }; }
  catch { return { text: new TextDecoder('windows-1252').decode(buf), encoding: 'Western (Windows-1252)', legacy: true }; }
}

async function readDoc(win, file) {
  let st;
  try { st = fs.statSync(file); } catch { await sheets.message(win, { type: 'warning', message: `“${path.basename(file)}” couldn’t be found.`, buttons: ['OK'] }); return null; }
  if (st.isDirectory()) return null;
  if (st.size > BIG) {
    const r = await sheets.message(win, { type: 'warning', message: `“${path.basename(file)}” is very large (${Math.round(st.size / 1048576)} MB).`, detail: 'Opening it may take a while and use a lot of memory.', buttons: ['Open Anyway', 'Cancel'], defaultId: 1, cancelId: 1 });
    if (r.response !== 0) return null;
  }
  const buf = fs.readFileSync(file);
  if (detectBinary(buf)) {
    const r = await sheets.message(win, { type: 'warning', message: `“${path.basename(file)}” doesn’t look like a text document.`, detail: 'It may contain characters Textpad can’t show. Saving it from Textpad could damage it.', buttons: ['Open Anyway', 'Cancel'], defaultId: 1, cancelId: 1 });
    if (r.response !== 0) return null;
  }
  const dec = decode(buf);
  const crlf = /\r\n/.test(dec.text.slice(0, 200000));
  let writable = true; try { fs.accessSync(file, fs.constants.W_OK); } catch { writable = false; }
  return { text: crlf ? dec.text.replace(/\r\n/g, '\n') : dec.text, encoding: dec.encoding, bom: !!dec.bom, utf16: !!dec.utf16, eol: crlf ? 'CRLF' : 'LF', writable };
}

function createWindow(file) {
  const win = new BrowserWindow({
    width: 760, height: 620, minWidth: 380, minHeight: 240, show: false, title: 'Textpad',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#22272d' : '#ffffff',
    icon: '/usr/share/icons/hicolor/256x256/apps/palos-textpad.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  // stagger new windows like a document app
  const others = BrowserWindow.getAllWindows().filter((w) => w !== win);
  if (others.length) { const [x, y] = others[others.length - 1].getPosition(); win.setPosition(x + 24, y + 24); }
  const d = { win, file: file || null, dirty: false, name: `Untitled${++untitled > 1 ? ' ' + untitled : ''}`, meta: { encoding: 'UTF-8', eol: 'LF' } };
  docs.set(win.webContents.id, d);
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.on('close', async (e) => {
    if (d.closing || !d.dirty) return;
    e.preventDefault();
    if (await confirmClose(d)) { d.closing = true; win.close(); }
  });
  win.on('closed', () => { docs.delete(d.id); });
  d.id = win.webContents.id;
  refreshTitle(d);
  return d;
}

async function confirmClose(d) {
  d.win.focus();
  const name = d.file ? path.basename(d.file) : d.name;
  const r = await sheets.message(d.win, { type: 'warning', message: `Do you want to save the changes you made to “${name}”?`, detail: 'Your changes will be lost if you don’t save them.', buttons: ['Save…', 'Don’t Save', 'Cancel'], defaultId: 0, cancelId: 2 });
  if (r.response === 2) return false;
  if (r.response === 1) return true;
  return await save(d, false);
}

async function openPaths(paths, into) {
  for (const p of paths) {
    const abs = path.resolve(p);
    const open = [...docs.values()].find((x) => x.file === abs);
    if (open) { open.win.focus(); continue; }
    // reuse an untouched empty window
    let d = into && !into.file && !into.dirty && into.empty ? into : null;
    const host = d ? d.win : (BrowserWindow.getFocusedWindow() || null);
    const data = await readDoc(host, abs);
    if (!data) continue;
    if (!d) d = createWindow(abs); else { d.file = abs; }
    d.empty = false;
    d.meta = data; d.file = abs; d.dirty = false;
    const send = () => d.win.webContents.send('doc:load', { text: data.text, file: abs, name: path.basename(abs), encoding: data.encoding, eol: data.eol, writable: data.writable });
    if (d.win.webContents.isLoading()) d.win.webContents.once('did-finish-load', send); else send();
    refreshTitle(d);
    addRecent(abs);
    into = null;
  }
}

async function chooseOpen(win) {
  const r = await sheets.open(win, { properties: ['openFile', 'multiSelections'], defaultPath: path.join(os.homedir(), 'Documents') });
  if (!r || r.canceled || !r.filePaths || !r.filePaths.length) return;
  const d = win ? docs.get(win.webContents.id) : null;
  await openPaths(r.filePaths, d);
}

function encodeFor(d, text) {
  const m = d.meta || {};
  if (m.eol === 'CRLF') text = text.replace(/\n/g, '\r\n');
  if (m.utf16) return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  const body = Buffer.from(text, 'utf8');
  return m.bom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]) : body;
}

async function save(d, saveAs) {
  const text = await d.win.webContents.executeJavaScript('window.textpadText()');
  let file = d.file;
  if (!file || saveAs || (d.meta && d.meta.writable === false)) {
    const base = d.file ? path.basename(d.file) : d.name + '.txt';
    const r = await sheets.save(d.win, { defaultPath: path.join(d.file ? path.dirname(d.file) : path.join(os.homedir(), 'Documents'), base) });
    if (!r || r.canceled || !r.filePath) return false;
    file = r.filePath;
    if (d.meta && d.meta.legacy) d.meta = { ...d.meta, legacy: false, encoding: 'UTF-8' };
  }
  try {
    const tmp = path.join(path.dirname(file), `.${path.basename(file)}.textpad-${process.pid}`);
    let mode = null; try { mode = fs.statSync(file).mode; } catch {}
    fs.writeFileSync(tmp, encodeFor(d, text));
    if (mode !== null) fs.chmodSync(tmp, mode & 0o7777);
    fs.renameSync(tmp, file);
  } catch (err) {
    await sheets.message(d.win, { type: 'error', message: `The document couldn’t be saved as “${path.basename(file)}”.`, detail: err.code === 'EACCES' ? 'You don’t have permission to write there. Use Save As… to save a copy somewhere else.' : err.message, buttons: ['OK'] });
    return false;
  }
  d.file = file; d.dirty = false; d.meta = { ...(d.meta || {}), writable: true };
  d.win.webContents.send('doc:saved', { file, name: path.basename(file) });
  refreshTitle(d); addRecent(file);
  return true;
}

async function revert(d) {
  if (!d.file) return;
  const r = await sheets.message(d.win, { type: 'warning', message: `Revert to the saved version of “${path.basename(d.file)}”?`, detail: 'Your current changes will be lost.', buttons: ['Revert', 'Cancel'], defaultId: 1, cancelId: 1 });
  if (r.response !== 0) return;
  const data = await readDoc(d.win, d.file); if (!data) return;
  d.meta = data; d.dirty = false;
  d.win.webContents.send('doc:load', { text: data.text, file: d.file, name: path.basename(d.file), encoding: data.encoding, eol: data.eol, writable: data.writable });
  refreshTitle(d);
}

// ---------------------------------------------------------------- IPC
const docOf = (e) => docs.get(e.sender.id);
ipcMain.handle('init', (e) => { const d = docOf(e); return { settings, name: d ? d.name : 'Untitled' }; });
ipcMain.on('dirty', (e, v) => { const d = docOf(e); if (d && d.dirty !== v) { d.dirty = v; d.empty = false; refreshTitle(d); } });
ipcMain.on('empty', (e, v) => { const d = docOf(e); if (d) d.empty = v; });
ipcMain.on('setting', (e, k, v) => { if (k in DEFAULTS) setSetting(k, v); });
ipcMain.on('drop', (e, paths) => openPaths(paths, docOf(e)));
ipcMain.on('eol', (e, eol) => { const d = docOf(e); if (d) { d.meta = { ...(d.meta || {}), eol }; d.dirty = true; refreshTitle(d); } });
// right-click menu: every label 20 characters or fewer
ipcMain.on('context', (e, o) => {
  const w = BrowserWindow.fromWebContents(e.sender); if (!w) return;
  const sel = !!(o && o.sel), ro = !!(o && o.ro), send = (c) => () => e.sender.send('cmd', c);
  Menu.buildFromTemplate([
    { role: 'undo', enabled: !ro }, { role: 'redo', enabled: !ro }, { type: 'separator' },
    { role: 'cut', enabled: sel && !ro }, { role: 'copy', enabled: sel }, { role: 'paste', enabled: !ro },
    { role: 'selectAll' }, { type: 'separator' },
    { label: 'Find…', click: send('find') },
    { label: 'Upper Case', enabled: sel && !ro, click: send('upper') },
    { label: 'Lower Case', enabled: sel && !ro, click: send('lower') },
    { label: 'Insert Date', enabled: !ro, click: send('insertDate') },
  ]).popup({ window: w });
});
ipcMain.handle('ui:message', (e, o) => sheets.message(BrowserWindow.fromWebContents(e.sender), o));
ipcMain.handle('ui:prompt', (e, o) => sheets.prompt(BrowserWindow.fromWebContents(e.sender), o));

// ---------------------------------------------------------------- menus (shown in the menu bar)
function focused() { const w = BrowserWindow.getFocusedWindow(); return w ? docs.get(w.webContents.id) : null; }
function cmd(name) { return () => { const d = focused(); if (d) d.win.webContents.send('cmd', name); }; }

function buildMenu() {
  const recent = settings.recent.filter((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
  const tpl = [
    { label: 'File', submenu: [
      { label: 'New', accelerator: 'Ctrl+N', click: () => createWindow() },
      { label: 'Open…', accelerator: 'Ctrl+O', click: () => chooseOpen(BrowserWindow.getFocusedWindow()) },
      { label: 'Open Recent', submenu: recent.length ? [...recent.map((p) => ({ label: path.basename(p), sublabel: path.dirname(p), click: () => openPaths([p]) })), { type: 'separator' }, { label: 'Clear Menu', click: () => { settings.recent = []; saveSettings(); buildMenu(); } }] : [{ label: 'No Recent Documents', enabled: false }] },
      { type: 'separator' },
      { label: 'Close', accelerator: 'Ctrl+W', click: () => { const w = BrowserWindow.getFocusedWindow(); if (w) w.close(); } },
      { label: 'Save', accelerator: 'Ctrl+S', click: () => { const d = focused(); if (d) save(d, false); } },
      { label: 'Save As…', accelerator: 'Ctrl+Shift+S', click: () => { const d = focused(); if (d) save(d, true); } },
      { label: 'Revert to Saved', click: () => { const d = focused(); if (d) revert(d); } },
      { type: 'separator' },
      { label: 'Show in Seeker', click: () => { const d = focused(); if (d && d.file) shell.showItemInFolder(d.file); } },
      { label: 'Print…', accelerator: 'Ctrl+P', click: cmd('print') },
      { type: 'separator' },
      { label: 'Quit Textpad', accelerator: 'Ctrl+Q', click: () => app.quit() },
    ] },
    { label: 'Edit', submenu: [
      { label: 'Undo', accelerator: 'Ctrl+Z', role: 'undo' },
      { label: 'Redo', accelerator: 'Ctrl+Shift+Z', role: 'redo' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'Ctrl+X', role: 'cut' },
      { label: 'Copy', accelerator: 'Ctrl+C', role: 'copy' },
      { label: 'Paste', accelerator: 'Ctrl+V', role: 'paste' },
      { label: 'Select All', accelerator: 'Ctrl+A', role: 'selectAll' },
      { type: 'separator' },
      { label: 'Find…', accelerator: 'Ctrl+F', click: cmd('find') },
      { label: 'Find and Replace…', accelerator: 'Ctrl+H', click: cmd('replace') },
      { label: 'Find Next', accelerator: 'Ctrl+G', click: cmd('findNext') },
      { label: 'Find Previous', accelerator: 'Ctrl+Shift+G', click: cmd('findPrev') },
      { label: 'Go to Line…', accelerator: 'Ctrl+L', click: cmd('gotoLine') },
      { type: 'separator' },
      { label: 'Insert Date and Time', click: cmd('insertDate') },
    ] },
    { label: 'Format', submenu: [
      { label: 'Wrap Lines', type: 'checkbox', checked: settings.wrap, click: (i) => setSetting('wrap', i.checked) },
      { label: 'Fixed-Width Font', type: 'checkbox', checked: settings.mono, click: (i) => setSetting('mono', i.checked) },
      { type: 'separator' },
      { label: 'Indent with Spaces', type: 'checkbox', checked: settings.spaces, click: (i) => setSetting('spaces', i.checked) },
      { label: 'Tab Width', submenu: [2, 4, 8].map((n) => ({ label: String(n), type: 'radio', checked: settings.tabSize === n, click: () => setSetting('tabSize', n) })) },
      { type: 'separator' },
      { label: 'Line Endings', submenu: [
        { label: 'palOS, Linux and Mac (LF)', click: () => { const d = focused(); if (d) d.win.webContents.send('cmd', 'eol:LF'); } },
        { label: 'Windows (CRLF)', click: () => { const d = focused(); if (d) d.win.webContents.send('cmd', 'eol:CRLF'); } },
      ] },
      { label: 'Make Upper Case', click: cmd('upper') },
      { label: 'Make Lower Case', click: cmd('lower') },
    ] },
    { label: 'View', submenu: [
      { label: 'Line Numbers', type: 'checkbox', checked: settings.lineNumbers, click: (i) => setSetting('lineNumbers', i.checked) },
      { type: 'separator' },
      { label: 'Bigger', accelerator: 'Ctrl+=', click: () => setSetting('fontSize', Math.min(48, settings.fontSize + 1)) },
      { label: 'Smaller', accelerator: 'Ctrl+-', click: () => setSetting('fontSize', Math.max(8, settings.fontSize - 1)) },
      { label: 'Actual Size', accelerator: 'Ctrl+0', click: () => setSetting('fontSize', DEFAULTS.fontSize) },
    ] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }, { role: 'zoom', label: 'Zoom' }] },
    { label: 'Help', submenu: [{ label: 'Textpad Help', click: cmd('help') }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

// ---------------------------------------------------------------- start
const fileArgs = (argv) => argv.filter((a) => !a.startsWith('-') && a !== process.execPath && !/\/(electron|textpad)$/.test(a) && fs.existsSync(a) && !fs.statSync(a).isDirectory());

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (e, argv, cwd) => {
    const files = fileArgs(argv.slice(1).map((a) => (a.startsWith('-') ? a : path.resolve(cwd || '.', a))));
    if (files.length) openPaths(files); else createWindow().win.focus();
  });
  app.whenReady().then(() => {
    buildMenu();
    const files = fileArgs(process.argv.slice(1));
    if (files.length) { const d = createWindow(); d.empty = true; openPaths(files, d); } else createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}

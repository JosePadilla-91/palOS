'use strict';
// palOS file sheets for other apps (started by paladin-portal, which talks to it over stdin/stdout, one JSON
// object per line):
//   in:  { id, kind: 'open'|'save', title, dir, name, filters, multi, folder, button }   a sheet to show
//        { show: id }      the sheet now belongs to its window (paladin-portal set WM_TRANSIENT_FOR): show it
//        { cancel: id }    take it away (the app gave up)       { quit: true }
//   out: { id, xid }       the sheet's window, before it's shown
//        { id, result }    { path } | { paths: [] } | {} (cancelled)
// The sheet is Seeker's own (ui/sheet.js and sheet.css from /opt/paladin-seeker), in a see-through window
// the size of the sheet; the window manager hangs it under the title bar of the app's window.
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

app.setName('palOS Sheets');
const MARGIN = 26;          // room round the sheet for its shadow (drawn in the see-through part)
const live = new Map();     // id -> { win, params, shown, ready, size, closing }
const byContents = new Map();  // webContents id -> id

const out = (m) => { try { process.stdout.write(JSON.stringify(m) + '\n'); } catch {} };

// ---------------------------------------------------------------- the same answers Seeker's sheets get
function listDir(dir, { showHidden = false } = {}) {
  let d = dir && path.isAbsolute(dir) ? dir : os.homedir();
  try { if (!fs.statSync(d).isDirectory()) d = path.dirname(d); } catch { d = os.homedir(); }
  const entries = [];
  try {
    for (const n of fs.readdirSync(d)) {
      if (!showHidden && n.startsWith('.')) continue;
      try { const st = fs.statSync(path.join(d, n)); entries.push({ name: n, dir: st.isDirectory(), size: st.size, mtime: st.mtimeMs }); } catch {}
    }
  } catch (err) { return { path: d, parent: path.dirname(d) === d ? null : path.dirname(d), entries: [], error: err.code === 'EACCES' ? 'You don’t have permission to look in this folder.' : err.message }; }
  entries.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
  return { path: d, parent: path.dirname(d) === d ? null : path.dirname(d), entries };
}
function places() {
  const h = os.homedir(), xdg = (n, f) => { const p = path.join(h, f); return fs.existsSync(p) ? [{ name: n, path: p }] : []; };
  return [{ name: 'Home Folder', path: h }, ...xdg('Desktop', 'Desktop'), ...xdg('Documents', 'Documents'), ...xdg('Downloads', 'Downloads'), ...xdg('Pictures', 'Pictures'), ...xdg('Music', 'Music'), ...xdg('Movies', 'Videos'), { name: 'Computer', path: '/' }];
}
const mine = (e) => live.get(byContents.get(e.sender.id));
ipcMain.handle('sheet:init', (e) => { const s = mine(e); return s ? s.params : null; });
ipcMain.on('sheet:done', (e, result) => { const id = byContents.get(e.sender.id); if (id !== undefined) finish(id, result || {}); });
ipcMain.handle('sheet:list', (e, dir, opts = {}) => listDir(dir, opts));
ipcMain.handle('sheet:mkdir', (e, dir, name) => {
  try { if (!name || /[\\/]/.test(name) || name === '.' || name === '..') return { error: 'That name can’t be used.' }; fs.mkdirSync(path.join(dir, name)); return { ok: true }; } catch (err) { return { error: err.code === 'EEXIST' ? 'There is already a folder with that name.' : err.message }; }
});
ipcMain.handle('sheet:exists', (e, p) => { try { return fs.statSync(p).isDirectory() ? 'dir' : 'file'; } catch { return ''; } });

// the sheet tells us how big it is; the window follows, staying centred where the window manager put it
ipcMain.on('chooser:size', (e, w, h) => {
  const s = mine(e); if (!s || s.closing) return;
  const W = Math.ceil(w) + MARGIN * 2, H = Math.ceil(h) + MARGIN;
  const prev = s.size; s.size = [W, H];
  if (!s.shown) { s.win.setContentSize(W, H); s.ready = true; maybeShow(s); return; }
  if (prev && prev[0] === W && prev[1] === H) return;
  const b = s.win.getBounds();
  s.win.setBounds({ x: Math.round(b.x - (W - b.width) / 2), y: b.y, width: W, height: H });
});

function maybeShow(s) {
  if (s.shown || !s.ready || !s.owned) return;
  s.shown = true;
  if (!s.parent) s.win.center();
  s.win.show(); s.win.focus();
}

// ---------------------------------------------------------------- sheets
function open(req) {
  const { id } = req;
  const params = { kind: req.kind === 'save' ? 'save' : 'open', title: req.title || '', dir: req.dir || os.homedir(), name: req.name || '',
    filters: req.filters || [], multi: !!req.multi, folder: !!req.folder, button: req.button || (req.kind === 'save' ? 'Save' : 'Open'), places: places() };
  const win = new BrowserWindow({
    width: 460 + MARGIN * 2, height: 160, show: false, frame: false, transparent: true, resizable: false, skipTaskbar: true,
    type: 'dialog', title: params.title, backgroundColor: '#00000000', hasShadow: false, alwaysOnTop: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  const s = { win, params, shown: false, ready: false, owned: false, parent: !!req.parent, closing: false, size: null };
  const wcId = win.webContents.id;    // kept: once the window is closed, its webContents can no longer be asked
  live.set(id, s); byContents.set(wcId, id);
  win.on('closed', () => { byContents.delete(wcId); if (live.get(id) === s) { live.delete(id); out({ id, result: {} }); } });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  if (process.env.PALADIN_PORTAL_DEBUG) win.webContents.on('console-message', (e, ...a) => process.stderr.write('sheet: ' + JSON.stringify(e.message !== undefined ? [e.level, e.message, e.sourceId, e.lineNumber] : a) + '\n'));
  win.loadFile(path.join(__dirname, 'ui', 'chooser.html'));
  // the sheet's window, for paladin-portal to hang under the app's title bar (on Kibble the window is made a
  // moment later: then as soon as it exists)
  const xidOf = () => { const h = win.getNativeWindowHandle(); return h.length >= 8 ? Number(h.readBigUInt64LE(0)) : h.readUInt32LE(0); };
  if (xidOf()) out({ id, xid: xidOf() });
  else win.once('native-window-handle', () => { if (live.get(id) === s) out({ id, xid: xidOf() }); });
  setTimeout(() => { if (live.get(id) === s && !s.ready) { s.ready = true; maybeShow(s); } }, 1500);   // never stuck invisible
}

function finish(id, result) {
  const s = live.get(id); if (!s || s.closing) return;
  s.closing = true;
  try { s.win.webContents.send('sheet:out'); } catch {}
  setTimeout(() => { if (live.get(id) === s) live.delete(id); out({ id, result }); try { if (!s.win.isDestroyed()) s.win.destroy(); } catch {} }, s.shown ? 240 : 0);
}

app.whenReady().then(() => {
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    let m; try { m = JSON.parse(line); } catch { return; }
    if (m.quit) { app.quit(); return; }
    if (m.show !== undefined) { const s = live.get(m.show); if (s) { s.owned = true; maybeShow(s); } return; }
    if (m.cancel !== undefined) { finish(m.cancel, {}); return; }
    if (m.id !== undefined) open(m);
  });
  rl.on('close', () => app.quit());       // paladin-portal went away
});
app.on('window-all-closed', () => {});    // stay for the next sheet until told to quit
// A mistake in here must never put up an error box over the app that asked for the sheet: log it and carry on.
process.on('uncaughtException', (err) => { try { process.stderr.write('palOS Sheets: ' + (err && err.stack || err) + '\n'); } catch {} });

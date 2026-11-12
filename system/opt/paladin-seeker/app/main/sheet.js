'use strict';
// Sheets: panels (messages, questions, text prompts, Open and Save) that slide out of the top edge of the
// window they belong to. A sheet is a view inside the window, not another window, so nothing new appears on
// screen and the panel can't be left behind when the window moves, hides or closes.
//
//   const sheet = require('/opt/paladin-seeker/app/main/sheet.js');
//   await sheet.message(win, { type: 'question', message: 'Delete it?', detail: '…', buttons: ['Cancel', 'Delete'], defaultId: 1, cancelId: 0 })  -> { response }
//   await sheet.prompt(win, { message: 'Name?', value: '', ok: 'Create' })                                                                 -> string | null
//   await sheet.open(win, { title, defaultPath, filters: [{ name, extensions }], properties: ['openFile'|'openDirectory'|'multiSelections'] }) -> { canceled, filePaths }
//   await sheet.save(win, { title, defaultPath, filters })                                                                                 -> { canceled, filePath }
// With no usable window they fall back to the system's own dialogs.
const { WebContentsView, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const UI = path.join(__dirname, '..', 'ui');
const PRELOAD = path.join(__dirname, '..', 'sheet-preload.js');
const live = new Map();       // webContents id -> { view, parent, params, resolve, closing }
const queues = new WeakMap(); // parent window -> promise of the last sheet (one at a time per window)
let registered = false;

function register() {
  if (registered) return; registered = true;
  ipcMain.handle('sheet:init', (e) => { const s = live.get(e.sender.id); return s ? s.params : null; });
  ipcMain.on('sheet:done', (e, result) => { const s = live.get(e.sender.id); if (s) close(e.sender.id, result); });
  ipcMain.handle('sheet:list', (e, dir, opts = {}) => listDir(dir, opts));
  ipcMain.handle('sheet:mkdir', (e, dir, name) => {
    try { if (!name || /[\\/]/.test(name) || name === '.' || name === '..') return { error: 'That name can’t be used.' }; fs.mkdirSync(path.join(dir, name)); return { ok: true }; } catch (err) { return { error: err.code === 'EEXIST' ? 'There is already a folder with that name.' : err.message }; }
  });
  ipcMain.handle('sheet:exists', (e, p) => { try { return fs.statSync(p).isDirectory() ? 'dir' : 'file'; } catch { return ''; } });
}

function listDir(dir, { showHidden = false } = {}) {
  let d = dir && path.isAbsolute(dir) ? dir : os.homedir();
  try { if (!fs.statSync(d).isDirectory()) d = path.dirname(d); } catch { d = os.homedir(); }
  const out = [];
  try {
    for (const n of fs.readdirSync(d)) {
      if (!showHidden && n.startsWith('.')) continue;
      try { const st = fs.statSync(path.join(d, n)); out.push({ name: n, dir: st.isDirectory(), size: st.size, mtime: st.mtimeMs }); } catch {}
    }
  } catch (err) { return { path: d, parent: path.dirname(d) === d ? null : path.dirname(d), entries: [], error: err.code === 'EACCES' ? 'You don’t have permission to look in this folder.' : err.message }; }
  out.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
  return { path: d, parent: path.dirname(d) === d ? null : path.dirname(d), entries: out };
}

function places() {
  const h = os.homedir(), xdg = (n, f) => { const p = path.join(h, f); return fs.existsSync(p) ? [{ name: n, path: p }] : []; };
  return [{ name: 'Home Folder', path: h }, ...xdg('Desktop', 'Desktop'), ...xdg('Documents', 'Documents'), ...xdg('Downloads', 'Downloads'), ...xdg('Pictures', 'Pictures'), ...xdg('Music', 'Music'), ...xdg('Movies', 'Videos'), { name: 'Computer', path: '/' }];
}

function usable(win) { return win && !win.isDestroyed() && win.isVisible() && !win.isMinimized(); }

function show(parent, kind, params, { top = 0 } = {}) {
  register();
  const run = () => new Promise((resolve) => {
    if (!usable(parent)) return resolve(undefined);
    const view = new WebContentsView({ webPreferences: { preload: PRELOAD, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    view.setBackgroundColor('#00000000');
    const place = () => { if (parent.isDestroyed()) return; const [w, h] = parent.getContentSize(); view.setBounds({ x: 0, y: top, width: w, height: Math.max(0, h - top) }); };
    parent.contentView.addChildView(view); place();
    const id = view.webContents.id;
    live.set(id, { view, parent, resolve, closing: false, params: { kind, ...params } });
    parent.on('resize', place); parent.once('closed', () => { if (live.has(id)) { live.delete(id); resolve(undefined); } });
    view.webContents.loadFile(path.join(UI, 'sheet.html'));
    view.webContents.once('did-finish-load', () => { try { view.webContents.focus(); } catch {} });
    live.get(id).off = () => parent.removeListener('resize', place);
  });
  const prev = queues.get(parent) || Promise.resolve();
  const next = prev.then(run, run);
  queues.set(parent, next.catch(() => {}));
  return next;
}

function close(id, result) {
  const s = live.get(id); if (!s || s.closing) return; s.closing = true;
  try { s.view.webContents.send('sheet:out'); } catch {}
  setTimeout(() => {
    live.delete(id); if (s.off) s.off();
    try { if (!s.parent.isDestroyed()) { s.parent.contentView.removeChildView(s.view); s.parent.webContents.focus(); } } catch {}
    try { s.view.webContents.close(); } catch {}
    s.resolve(result);
  }, 240);
}

// the system's own dialogs, kept from before dialog-hook.js routes `dialog` through these sheets
const orig = { showMessageBox: dialog.showMessageBox.bind(dialog), showOpenDialog: dialog.showOpenDialog.bind(dialog), showSaveDialog: dialog.showSaveDialog.bind(dialog) };
const native = (fn, win, opts) => (win && !win.isDestroyed() ? orig[fn](win, opts) : orig[fn](opts));

/** For an alert that belongs to no window (the desktop, the Dock's Trash): a small see-through window of its own,
    centred and above everything, holding the same palOS sheet (instead of the system's plain dialog). */
async function standalone(fn) {
  const { BrowserWindow, screen } = require('electron');
  let w = null;
  try {
    const wa = screen.getPrimaryDisplay().workArea, W = 460, H = 240;
    w = new BrowserWindow({ width: W, height: H, x: wa.x + Math.round((wa.width - W) / 2), y: wa.y + Math.round(wa.height * 0.22), frame: false, transparent: true,
      resizable: false, movable: true, minimizable: false, maximizable: false, alwaysOnTop: true, skipTaskbar: true, show: false, title: 'Seeker', backgroundColor: '#00000000',
      webPreferences: { sandbox: true, contextIsolation: true } });
    await w.loadURL('data:text/html,<html><body style="margin:0;background:transparent"></body></html>');
    w.show(); w.focus();
    await new Promise((r) => setTimeout(r, 60));
    // the window is cut to the alert itself (no dimmed backdrop: there's no window behind it to dim)
    const fit = async () => {
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 50));
        const s = [...live.values()].find((x) => x.parent === w);
        if (!s) continue;
        const r = await s.view.webContents.executeJavaScript(`(() => { const sc = document.getElementById('scrim'); if (sc) sc.style.background = 'transparent';
          const e = document.getElementById('sheet'); if (!e) return 0; const b = e.getBoundingClientRect(); return b.height > 20 ? Math.ceil(b.bottom) : 0; })()`).catch(() => 0);
        if (r && !w.isDestroyed()) { w.setResizable(true); w.setSize(W, r + 2); w.setResizable(false); return; }
      }
    };
    const p = fn(w); fit();
    return await p;
  } finally { try { if (w && !w.isDestroyed()) w.destroy(); } catch {} }
}

async function message(parent, opts = {}) {
  if (!usable(parent) && !opts.native) {
    try { const r = await standalone((w) => message(w, { ...opts, native: true })); if (r) return r; } catch (_) { /* the system's dialog below */ }
  }
  const buttons = opts.buttons && opts.buttons.length ? opts.buttons : ['OK'];
  const r = usable(parent) ? await show(parent, 'message', { type: opts.type || 'info', message: opts.message || '', detail: opts.detail || '', buttons, defaultId: opts.defaultId ?? 0, cancelId: opts.cancelId ?? -1, checkbox: opts.checkboxLabel || '' }, { top: opts.top || 0 }) : undefined;
  if (r === undefined) return native('showMessageBox', parent, opts);
  return { response: r.response, checkboxChecked: !!r.checked };
}
async function prompt(parent, opts = {}) {
  const r = usable(parent) ? await show(parent, 'prompt', { message: opts.message || '', detail: opts.detail || '', value: opts.value || '', ok: opts.ok || 'OK', cancel: opts.cancel || 'Cancel', password: !!opts.password, type: opts.type || 'info' }, { top: opts.top || 0 }) : undefined;
  return r === undefined ? null : r.value;
}
async function open(parent, opts = {}) {
  if (!usable(parent)) return native('showOpenDialog', parent, opts);
  const p = opts.properties || ['openFile'];
  const r = await show(parent, 'open', { title: opts.title || (p.includes('openDirectory') ? 'Choose a Folder' : 'Open'), dir: opts.defaultPath || os.homedir(), filters: opts.filters || [], folder: p.includes('openDirectory'), multi: p.includes('multiSelections'), button: opts.buttonLabel || (p.includes('openDirectory') ? 'Choose' : 'Open'), places: places() }, { top: opts.top || 0 });
  return r && r.paths && r.paths.length ? { canceled: false, filePaths: r.paths } : { canceled: true, filePaths: [] };
}
async function save(parent, opts = {}) {
  if (!usable(parent)) return native('showSaveDialog', parent, opts);
  const dp = opts.defaultPath || os.homedir(); let dir = dp, name = '';
  try { if (!fs.statSync(dp).isDirectory()) { dir = path.dirname(dp); name = path.basename(dp); } } catch { dir = path.dirname(dp); name = path.basename(dp); }
  const r = await show(parent, 'save', { title: opts.title || 'Save', dir, name, filters: opts.filters || [], button: opts.buttonLabel || 'Save', places: places() }, { top: opts.top || 0 });
  return r && r.path ? { canceled: false, filePath: r.path } : { canceled: true, filePath: undefined };
}

module.exports = { message, prompt, open, save, show, _live: live };

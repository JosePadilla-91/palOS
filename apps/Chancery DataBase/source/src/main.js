/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
const { app, BrowserWindow, Menu, dialog, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const engine = require('./db');
const csv = require('./csv');
const templates = require('./templates');

const isCdb = p => /\.cdb$/i.test(p);
const CDB_FILTER = [{ name: 'Chancery Database', extensions: ['cdb'] }];
let win = null;

const recentFile = () => path.join(app.getPath('userData'), 'recent.json');
function recent() {
  try { return JSON.parse(fs.readFileSync(recentFile(), 'utf8')).filter(p => fs.existsSync(p)); }
  catch { return []; }
}
function addRecent(p) {
  const l = [p, ...recent().filter(x => x !== p)].slice(0, 8);
  try { fs.writeFileSync(recentFile(), JSON.stringify(l)); } catch {}
  buildMenu();
}
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
function setting(k, d) { try { const v = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'))[k]; return v === undefined ? d : v; } catch { return d; } }
function saveSetting(k, v) {
  let o = {};
  try { o = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch {}
  o[k] = v;
  try { fs.writeFileSync(settingsFile(), JSON.stringify(o)); } catch {}
}
// system / light / dark, saved between runs; the whole UI follows nativeTheme
function applyTheme(mode, persist) {
  nativeTheme.themeSource = mode;
  if (persist) saveSetting('theme', mode);
  if (win && !win.isDestroyed()) win.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#1c222a' : '#e6eaef');
  buildMenu();
}
// File pickers are sheets inside the window (see fileSheet in app.js), not native dialogs
let pickSeq = 0; const pending = new Map();
function pick(o) {
  if (!win || win.isDestroyed()) return Promise.resolve(null);
  return new Promise(res => { const id = ++pickSeq; pending.set(id, res); send('pick', id, o); });
}
const alertSheet = (title, message) => send('alert', title, message);
const send = (ch, ...a) => { if (win && !win.isDestroyed()) win.webContents.send(ch, ...a); };

function openPath(p) {
  try { const info = engine.open(p); addRecent(p); send('db-changed', info); }
  catch (e) { alertSheet('Cannot open database', e.message); }
}

async function openDialog() {
  const f = await pick({ mode: 'open', title: 'Open Database', buttonLabel: 'Open', filters: CDB_FILTER, defaultPath: app.getPath('documents') + '/' });
  if (f) openPath(f);
}

async function newDb(tpl) {
  const f = await pick({ mode: 'save', title: 'New Database', buttonLabel: 'Create', filters: CDB_FILTER, defaultPath: path.join(app.getPath('documents'), 'Database1.cdb') });
  if (!f) return;
  const p = isCdb(f) ? f : f + '.cdb';
  try { const info = engine.create(p, templates[tpl] || templates.blank); addRecent(p); send('db-changed', info); }
  catch (e) { alertSheet('Cannot create database', e.message); }
}

function closeDb() { engine.close(); send('db-changed', null); }

async function importCsv() {
  if (!engine.info()) return;
  const f = await pick({ mode: 'open', title: 'Import CSV as Table', buttonLabel: 'Import', filters: [{ name: 'CSV files', extensions: ['csv', 'tsv', 'txt'] }], defaultPath: app.getPath('documents') + '/' });
  if (!f) return;
  try {
    const text = fs.readFileSync(f, 'utf8');
    const name = engine.api.importCSV(text, path.basename(f).replace(/\.[^.]+$/, ''));
    send('imported', name);
  } catch (e) { alertSheet('Import failed', e.message); }
}

function buildMenu() {
  const rec = recent();
  const m = a => () => send('menu', a);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'New Database…', accelerator: 'CmdOrCtrl+N', click: () => newDb('blank') },
      { label: 'Open Database…', accelerator: 'CmdOrCtrl+O', click: openDialog },
      { label: 'Open Recent', enabled: rec.length > 0, submenu: rec.map(p => ({ label: path.basename(p), click: () => openPath(p) })) },
      { type: 'separator' },
      { label: 'Import CSV as Table…', click: importCsv },
      { label: 'Export Current Object as CSV…', click: m('export') },
      { type: 'separator' },
      { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: m('close-tab') },
      { label: 'Close Database', click: closeDb },
      { type: 'separator' },
      { role: 'quit' }
    ] },
    // registerAccelerator off so Ctrl+Z / Ctrl+C reach the form and report designers
    { label: 'Edit', submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', registerAccelerator: false, click: m('edit-undo') },
      { label: 'Redo', accelerator: 'CmdOrCtrl+Y', registerAccelerator: false, click: m('edit-redo') }, { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', registerAccelerator: false, click: m('edit-cut') },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', registerAccelerator: false, click: m('edit-copy') },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', registerAccelerator: false, click: m('edit-paste') },
      { label: 'Delete', accelerator: 'Delete', registerAccelerator: false, click: m('edit-del') },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', registerAccelerator: false, click: m('edit-all') }
    ] },
    { label: 'Create', submenu: [
      { label: 'Table', accelerator: 'CmdOrCtrl+T', click: m('new-table') },
      { label: 'Query', click: m('new-query') },
      { label: 'Form', click: m('new-form') },
      { label: 'Report', click: m('new-report') }
    ] },
    { label: 'View', submenu: [
      { label: 'Switch Datasheet / Design View', accelerator: 'CmdOrCtrl+D', click: m('toggle-design') },
      { type: 'separator' },
      { label: 'Appearance', submenu: ['system', 'light', 'dark'].map(v => ({
        label: { system: 'Match System', light: 'Light', dark: 'Dark' }[v], type: 'radio', checked: nativeTheme.themeSource === v, click: () => applyTheme(v, true)
      })) },
      { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }, { role: 'toggleDevTools' }
    ] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    { label: 'Help', submenu: [
      { label: 'About Chancery DataBase', click: () => alertSheet('Chancery DataBase', `Version ${app.getVersion()}\nA database designer for palOS.`) }
    ] }
  ]));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 560,
    title: 'Chancery DataBase', backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c222a' : '#e6eaef',
    icon: path.join(__dirname, 'renderer', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('closed', () => { win = null; });
}

ipcMain.handle('db', (_e, m, ...a) => {
  const fn = engine.api[m];
  if (!fn) return { ok: false, error: 'Unknown call: ' + m };
  try { return { ok: true, data: fn(...a) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('state', () => ({ info: engine.info(), recent: recent() }));
ipcMain.handle('newDb', (_e, t) => newDb(t));
ipcMain.handle('openDb', (_e, p) => (p ? openPath(p) : openDialog()));
ipcMain.handle('closeDb', closeDb);
ipcMain.handle('pickResult', (_e, id, v) => { const r = pending.get(id); if (r) { pending.delete(id); r(v); } });
ipcMain.handle('fs', (_e, op, p) => {
  if (op === 'places') {
    const home = app.getPath('home');
    return [['Home', home], ['Documents', app.getPath('documents')], ['Desktop', app.getPath('desktop')], ['Downloads', app.getPath('downloads')], ['Computer', '/']]
      .filter(([, d]) => { try { return fs.statSync(d).isDirectory(); } catch { return false; } }).map(([name, d]) => ({ name, path: d }));
  }
  if (op === 'list') {
    const dir = path.resolve(p);
    const entries = fs.readdirSync(dir, { withFileTypes: true }).filter(e => !e.name.startsWith('.')).map(e => {
      let isDir = e.isDirectory();
      if (e.isSymbolicLink()) { try { isDir = fs.statSync(path.join(dir, e.name)).isDirectory(); } catch {} }
      return { name: e.name, dir: isDir };
    });
    return { path: dir, entries };
  }
  if (op === 'mkdir') { fs.mkdirSync(p); return true; }
  if (op === 'stat') { try { const st = fs.statSync(p); return { exists: true, dir: st.isDirectory() }; } catch { return { exists: false }; } }
  throw new Error('Unknown fs call');
});
ipcMain.handle('importCsv', importCsv);

ipcMain.handle('exportCsv', async (_e, sql, name) => {
  const res = engine.api.run(sql, Infinity);
  const f = await pick({ mode: 'save', title: 'Export CSV', buttonLabel: 'Export', defaultPath: path.join(app.getPath('documents'), name + '.csv'), filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (!f) return null;
  fs.writeFileSync(f, csv.format(res.columns, res.rows));
  return f;
});

ipcMain.handle('exportPdf', async (_e, name, o = {}) => {
  const f = await pick({ mode: 'save', title: 'Export PDF', buttonLabel: 'Export', defaultPath: path.join(app.getPath('documents'), name + '.pdf'), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (!f) return null;
  fs.writeFileSync(f, await win.webContents.printToPDF({
    printBackground: true, pageSize: o.pageSize || 'Letter', landscape: !!o.landscape, preferCSSPageSize: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 }
  }));
  return f;
});

ipcMain.handle('print', (_e, o = {}) => new Promise(res => win.webContents.print({
  printBackground: true, pageSize: o.pageSize || 'Letter', landscape: !!o.landscape, margins: { marginType: 'none' }
}, ok => res(ok))));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
    const f = argv.find(isCdb);
    if (f) openPath(f);
  });
  app.on('before-quit', () => engine.close());
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(async () => {
    nativeTheme.themeSource = setting('theme', 'system');
    await engine.boot();
    const start = process.argv.find(a => isCdb(a) && fs.existsSync(a));
    if (start) { try { engine.open(start); addRecent(start); } catch {} }
    buildMenu();
    createWindow();
  });
}

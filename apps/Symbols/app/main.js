'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Symbols: every character palOS can type, by category, with search. Click to see it, double-click to copy.
const { app, BrowserWindow, Menu, ipcMain, clipboard, nativeTheme } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

app.setName('Symbols');
if (process.platform === 'linux') app.setDesktopName('palos-symbols.desktop');
const DIR = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'palos-symbols');
const FILE = path.join(DIR, 'state.json');
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
let state = { favorites: [], recent: [], size: 'medium', ...readJSON(FILE, {}) };
const save = () => { try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(state)); } catch {} };
let win = null;

ipcMain.handle('state', () => state);
ipcMain.handle('copy', (e, ch) => {
  clipboard.writeText(ch);
  state.recent = [ch, ...state.recent.filter((x) => x !== ch)].slice(0, 48); save();
  return state.recent;
});
ipcMain.handle('favorite', (e, ch, on) => {
  state.favorites = on ? [...state.favorites.filter((x) => x !== ch), ch] : state.favorites.filter((x) => x !== ch); save();
  return state.favorites;
});
ipcMain.handle('size', (e, s) => { state.size = s; save(); });
ipcMain.handle('clearRecent', () => { state.recent = []; save(); return []; });

function create() {
  win = new BrowserWindow({ width: 900, height: 600, minWidth: 620, minHeight: 400, title: 'Symbols', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2',
    icon: '/usr/share/icons/hicolor/256x256/apps/palos-symbols.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; app.quit(); });
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() }, { label: 'Quit Symbols', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [{ label: 'Copy Character', accelerator: 'Ctrl+C', click: send('copy') }, { label: 'Add to Favorites', accelerator: 'Ctrl+D', click: send('fav') }, { type: 'separator' }, { label: 'Find', accelerator: 'Ctrl+F', click: send('find') }, { label: 'Clear Recently Used', click: send('clearRecent') }] },
    { label: 'View', submenu: [{ label: 'Small', type: 'radio', checked: state.size === 'small', click: () => win.webContents.send('size', 'small') }, { label: 'Medium', type: 'radio', checked: state.size === 'medium', click: () => win.webContents.send('size', 'medium') }, { label: 'Large', type: 'radio', checked: state.size === 'large', click: () => win.webContents.send('size', 'large') }] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }] },
  ]));
}
if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } }); app.whenReady().then(create); }

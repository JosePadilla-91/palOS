'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Chess: 3D chess against the machine. Fully offline.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

app.setName('Chess');
if (process.platform === 'linux') app.setDesktopName('palos-chess.desktop');
const fr = /^fr/i.test(process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '');
const T = (en, f) => (fr ? f : en);
let win = null;

function create() {
  win = new BrowserWindow({
    width: 1100, height: 800, minWidth: 640, minHeight: 480, title: 'Chess', backgroundColor: '#1d2026',
    icon: path.join(__dirname, 'icon.png'), show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });
  win.webContents.on('context-menu', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
}

function menu() {
  const click = (js) => () => win && win.webContents.executeJavaScript(js).catch(() => {});
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Chess', submenu: [{ role: 'about', label: T('About Chess', 'À propos d’Échecs') }, { type: 'separator' }, { role: 'quit', label: T('Quit Chess', 'Quitter Échecs') }] },
    { label: T('Game', 'Partie'), submenu: [
      { label: T('New Game', 'Nouvelle partie'), accelerator: 'CmdOrCtrl+N', click: click("(document.getElementById('again')||{click(){}}).click()") },
    ] },
    { label: T('View', 'Présentation'), submenu: [{ role: 'togglefullscreen', label: T('Enter Full Screen', 'Plein écran'), accelerator: 'F11' }] },
    { role: 'windowMenu', label: T('Window', 'Fenêtre') },
  ]));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.setAboutPanelOptions({ applicationName: 'Chess', applicationVersion: '1.1.0', copyright: 'Joe Lucas', iconPath: path.join(__dirname, 'icon.png') });
  app.whenReady().then(() => { menu(); create(); });
  app.on('window-all-closed', () => app.quit());
}

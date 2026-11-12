'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Calculator: Basic and Scientific, a paper tape, the keyboard, copy and paste.
const { app, BrowserWindow, Menu, clipboard, ipcMain } = require('electron');
const path = require('path');
app.setName('Calculator');
if (process.platform === 'linux') app.setDesktopName('palos-calculator.desktop');
const fr = /^fr/i.test(process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '');
const T = (en, f) => (fr ? f : en);
let win;
const SIZES = { basic: [264, 404], sci: [560, 404] };   // room for the Basic | Scientific switch
function setMode(m) { if (!win) return; const [w, h] = SIZES[m]; win.setContentSize(w, h); win.webContents.send('cmd', 'mode:' + m); menu(m); }
function menu(mode = 'basic') {
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Calculator', submenu: [{ role: 'about', label: T('About Calculator', 'À propos de Calculatrice') }, { type: 'separator' }, { role: 'quit', label: T('Quit Calculator', 'Quitter Calculatrice') }] },
    { label: T('Edit', 'Édition'), submenu: [{ label: T('Copy', 'Copier'), accelerator: 'Ctrl+C', click: send('copy') }, { label: T('Paste', 'Coller'), accelerator: 'Ctrl+V', click: send('paste') }, { type: 'separator' }, { label: T('Clear Tape', 'Effacer le ruban'), click: send('cleartape') }] },
    { label: T('View', 'Présentation'), submenu: [
      { label: T('Basic', 'De base'), type: 'radio', checked: mode === 'basic', accelerator: 'Ctrl+1', click: () => setMode('basic') },
      { label: T('Scientific', 'Scientifique'), type: 'radio', checked: mode === 'sci', accelerator: 'Ctrl+2', click: () => setMode('sci') },
      { type: 'separator' }, { label: T('Show Paper Tape', 'Afficher le ruban'), accelerator: 'Ctrl+T', click: send('tape') }] },
    { role: 'windowMenu', label: T('Window', 'Fenêtre') },
  ]));
}
ipcMain.handle('clip:read', () => clipboard.readText());
ipcMain.on('mode', (e, m) => { if (m === 'sci' || m === 'basic') setMode(m); });   // the switch on the calculator itself
ipcMain.on('clip:write', (e, t) => clipboard.writeText(String(t)));
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    win = new BrowserWindow({ useContentSize: true, width: 264, height: 404, resizable: false, maximizable: false, fullscreenable: false, title: 'Calculator', show: false, backgroundColor: '#3a3d42',
      icon: path.join(__dirname, 'icon.png'), webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
    win.loadFile(path.join(__dirname, 'ui', 'index.html'));
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => app.quit());
    menu();
  });
}

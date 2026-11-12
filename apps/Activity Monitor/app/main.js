'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Activity Monitor: processor, memory, disks, network, graphics, sensors and running programs.
const { app, BrowserWindow, ipcMain, nativeTheme, Menu } = require('electron');
const sheets = require('./sheets');
const path = require('path');
const sampler = require('./sampler');

app.setName('Activity Monitor');
if (process.platform === 'linux') app.setDesktopName('palos-monitor.desktop');
app.commandLine.appendSwitch('disable-features', 'GlobalShortcutsPortal');
let win = null, timer = null, busy = false;

function start() {
  if (!app.requestSingleInstanceLock()) { app.quit(); return; }
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  win = new BrowserWindow({ width: 920, height: 640, minWidth: 700, minHeight: 480, title: 'Activity Monitor', show: false,
    icon: '/usr/share/icons/hicolor/256x256/apps/palos-monitor.png', backgroundColor: nativeTheme.shouldUseDarkColors ? '#22272d' : '#f2f3f5',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // if the graphics process never reports a first paint (busy or software-only computers), show it anyway
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) { win.show(); win.focus(); } }, 3000));
  win.on('closed', () => { win = null; clearInterval(timer); app.quit(); });
  const tick = () => {
    if (busy || !win || win.isDestroyed() || win.isMinimized() || !win.isVisible()) return;
    busy = true;
    sampler.sample((s) => { busy = false; if (win && !win.isDestroyed()) win.webContents.send('sample', s); });
  };
  timer = setInterval(tick, 1000); tick();
}
ipcMain.handle('proc:signal', (e, pid, force) => sampler.signal(pid, force ? 'SIGKILL' : 'SIGTERM'));
ipcMain.handle('ui:message', (e, o) => sheets.message(win, o));
ipcMain.handle('ui:prompt', (e, o) => sheets.prompt(win, o));
app.whenReady().then(start);
app.on('window-all-closed', () => app.quit());

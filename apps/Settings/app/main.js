'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Paladin Settings: one window, a sidebar of panels. `paladin-settings PANEL` opens a panel directly
// (wifi, network, appearance, dock, display, sound, users, datetime, power).
const { app, BrowserWindow, ipcMain, dialog, nativeTheme, screen } = require('electron');
const sheets = require('./sheets');
const { execFileSync, spawn } = require('child_process');
const path = require('path');

const network = require('./backend/network');
const look = require('./backend/look');
const devices = require('./backend/devices');
const account = require('./backend/account');
const region = require('./backend/region');
const access = require('./backend/access');
const parental = require('./backend/parental');

app.setName('Settings');
if (process.platform === 'linux') app.setDesktopName('paladin-settings.desktop');
app.commandLine.appendSwitch('disable-features', 'GlobalShortcutsPortal');

const PANELS = ['wifi', 'network', 'appearance', 'dock', 'access', 'display', 'sound', 'keyboard', 'mouse', 'trackpad', 'users', 'parental', 'region', 'datetime', 'power'];
const ALIASES = { accessibility: 'access', 'universal-access': 'access', a11y: 'access', 'screen-reader': 'access', 'wi-fi': 'wifi', wireless: 'wifi', 'online-accounts': 'users', user: 'users', parental: 'parental', 'parental-controls': 'parental', family: 'parental', 'screen-time': 'parental', 'date-time': 'datetime', time: 'datetime', language: 'region', languages: 'region', locale: 'region', 'language-region': 'region', formats: 'region',
  displays: 'display', monitor: 'display', audio: 'sound', touchpad: 'trackpad', scroll: 'mouse', pointer: 'mouse', gestures: 'trackpad', numlock: 'keyboard', background: 'appearance', wallpaper: 'appearance', theme: 'appearance' };
function panelFrom(argv) {
  for (const a of argv) {
    const k = String(a).toLowerCase().replace(/^--/, '');
    if (PANELS.includes(k)) return k;
    if (ALIASES[k]) return ALIASES[k];
  }
  return null;
}

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

// ---------------------------------------------------------------- light/dark, same switch as the rest of Paladin
let watcher = null;
function readDark() {
  try { return /prefer-dark/.test(execFileSync('gsettings', ['get', 'org.gnome.desktop.interface', 'color-scheme'], { encoding: 'utf8', timeout: 3000 })); } catch { return false; }
}
function watchDark() {
  try { watcher = spawn('gsettings', ['monitor', 'org.gnome.desktop.interface', 'color-scheme'], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return; }
  watcher.stdout.on('data', (d) => {
    const dark = /prefer-dark/.test(String(d));
    nativeTheme.themeSource = dark ? 'dark' : 'light';
    if (win && !win.isDestroyed()) { win.setBackgroundColor(dark ? '#2e343b' : '#eef0f2'); win.webContents.send('dark', dark); }
  });
  watcher.on('error', () => {});
}

// ---------------------------------------------------------------- window
let win = null;
function createWindow(panel) {
  const wa = screen.getPrimaryDisplay().workArea;
  const width = Math.min(940, wa.width - 40), height = Math.min(640, wa.height - 40);
  win = new BrowserWindow({
    width, height, minWidth: 720, minHeight: 460, x: wa.x + Math.round((wa.width - width) / 2), y: wa.y + Math.round(Math.max(30, (wa.height - height) / 3)),
    title: 'Settings', show: false, backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2',
    icon: '/usr/share/icons/hicolor/256x256/apps/paladin-settings.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false },
  });
  win.setAutoHideMenuBar(true);       // the menus live in Seeker's menu bar; never draw them in the window
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'ui', 'index.html'), { query: { panel: panel || '' } });
  win.once('ready-to-show', () => { win.show(); win.focus(); });
  // if the graphics process never reports a first paint (busy or software-only computers), show it anyway
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) { win.show(); win.focus(); } }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.on('closed', () => { win = null; });
}

app.on('second-instance', (e, argv) => {
  if (!win) return createWindow(panelFrom(argv));
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
  const p = panelFrom(argv);
  if (p) win.webContents.send('show-panel', p);
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { try { watcher && watcher.kill(); } catch {} });

// ---------------------------------------------------------------- calls from the page
function H(ch, fn) {
  ipcMain.handle(ch, async (e, ...a) => {
    try { return await fn(...a); } catch (err) { console.error('[settings]', ch, err); return { ok: false, error: String(err && err.message || err) }; }
  });
}

H('app:dark', () => nativeTheme.shouldUseDarkColors);
H('app:user', () => require('os').userInfo().username);

H('wifi:status', network.wifiStatus);
H('wifi:networks', network.wifiNetworks);
H('wifi:power', network.wifiPower);
H('wifi:connect', network.wifiConnect);
H('wifi:disconnect', network.wifiDisconnect);
H('wifi:forget', network.forget);
H('net:computer-name', network.setComputerName);
H('wifi:agent', network.agentActive);
H('net:overview', network.overview);
H('net:vpn', network.vpnSet);
H('net:airplane', network.airplane);
H('net:editor', network.openEditor);

H('look:get', look.get);
H('look:dark', look.setDark);
H('look:textScale', look.setTextScale);
H('look:animations', look.setAnimations);
H('look:wallpaper', look.setWallpaper);
H('look:wallpapers', look.wallpapers);
H('look:pickWallpaper', async () => {
  const r = await sheets.open(win, { title: 'Choose a Picture', properties: ['openFile'], defaultPath: path.join(require('os').homedir(), 'Pictures'),
    filters: [{ name: 'Pictures', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'] }] });
  return r.canceled ? null : r.filePaths[0];
});
H('dock:get', look.dock);
H('dock:set', look.setDock);
H('clock:set', look.setClock);
H('clock:get', () => look.seekerConfig().menubar || {});

H('display:get', devices.displays);
H('access:get', access.get);
H('access:reader', access.setReader);
H('access:voice', access.setVoice);
H('access:keyboard', access.keyboard);
H('display:apply', devices.applyDisplays);
H('display:scale', devices.scaleGet);
H('display:setScale', devices.scaleSet);
H('display:save', devices.saveLayout);
H('sound:get', devices.sound);
H('sound:set', devices.soundSet);
H('sound:alerts', devices.setAlerts);
H('sound:effects', devices.setEffects);
H('sound:test', devices.testSound);
H('kb:get', devices.keyboard);
H('tp:get', devices.trackpad);
H('mouse:get', devices.mouse);
H('mouse:set', devices.setMouse);
H('tp:set', devices.setTrackpad);
H('kb:numlock', devices.setNumlock);

H('users:get', account.users);
H('users:fullName', account.setFullName);
H('users:pickPicture', async () => {
  const r = await sheets.open(win, { title: 'Choose a Picture', properties: ['openFile'], defaultPath: path.join(require('os').homedir(), 'Pictures'),
    filters: [{ name: 'Pictures', extensions: ['jpg', 'jpeg', 'png', 'webp'] }] });
  return r.canceled ? null : r.filePaths[0];
});
H('users:picture', account.setPicture);
H('users:password', account.changePassword);
H('users:admin', account.admin);
H('time:get', account.datetime);
H('time:zones', account.timezones);
H('time:zone', account.setTimezone);
H('time:ntp', account.setNtp);
H('time:set', account.setTime);
H('region:get', region.get);
H('region:set', region.set);
H('region:keyboard', region.setKeyboard);
H('region:logout', region.logout);
H('parental:list', parental.list);
H('parental:get', parental.get);
H('parental:set', parental.set);
H('parental:report', parental.report);
H('power:get', account.power);
H('power:profile', account.setProfile);
H('power:idle', account.setIdle);
H('power:lock', account.setLock);
H('power:sleep', account.setSleep);
H('power:logout', account.setLogout);

// ---------------------------------------------------------------- menu (shown in Seeker's menu bar)
const PANEL_TITLES = { wifi: 'Wi-Fi', network: 'Network', appearance: 'Appearance', dock: 'Dock', access: 'Accessibility', display: 'Displays', sound: 'Sound',
  keyboard: 'Keyboard', mouse: 'Mouse', trackpad: 'Trackpad', users: 'Users', parental: 'Parental Controls', region: 'Language & Region', datetime: 'Date & Time', power: 'Power' };
function buildMenu() {
  const { Menu } = require('electron');
  const go = (id) => () => { if (win && !win.isDestroyed()) win.webContents.send('show-panel', id); };
  return Menu.buildFromTemplate([
    { label: 'Settings', submenu: [
      { label: 'About Settings', click: () => sheets.message(win, { title: 'About Settings', message: 'Settings', detail: `palOS Settings ${app.getVersion()}`, buttons: ['OK'] }) },
      { type: 'separator' },
      { label: 'Quit Settings', accelerator: 'Ctrl+Q', click: () => app.quit() },
    ] },
    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
    ] },
    { label: 'View', submenu: PANELS.map((id, i) => ({ label: PANEL_TITLES[id], accelerator: i < 9 ? `Ctrl+${i + 1}` : undefined, click: go(id) })) },
    { label: 'Window', submenu: [
      { role: 'minimize' }, { label: 'Zoom', click: () => { if (win) win.isMaximized() ? win.unmaximize() : win.maximize(); } },
      { type: 'separator' }, { label: 'Close Window', accelerator: 'Ctrl+W', click: () => win && win.close() },
    ] },
  ]);
}

app.whenReady().then(() => {
  require('electron').Menu.setApplicationMenu(buildMenu());
  nativeTheme.themeSource = readDark() ? 'dark' : 'light';
  watchDark();
  createWindow(panelFrom(process.argv.slice(app.isPackaged ? 1 : 2)));
});

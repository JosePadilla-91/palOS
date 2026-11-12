'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Duet: palOS and Windows on one computer. Shows which systems this computer can start, picks the one it starts
// every time, and restarts in the other. The changes go through /usr/lib/palos-boot/palos-startup-disk (pkexec).
const { app, BrowserWindow, Menu, ipcMain, nativeTheme, shell } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

app.setName('Duet');
if (process.platform === 'linux') app.setDesktopName('palos-duet.desktop');
const TOOL = '/usr/lib/palos-boot/palos-startup-disk';
let win = null;

function run(cmd, args, timeout = 60000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 4 << 20, env: { ...process.env, LC_ALL: 'C.UTF-8' } }, (err, out, errOut) =>
      resolve({ ok: !err, code: err ? (err.code ?? 1) : 0, out: String(out || ''), err: String(errOut || (err && err.message) || '') }));
  });
}

ipcMain.handle('duet:info', async () => {
  if (process.env.PALOS_DUET_MOCK) return JSON.parse(process.env.PALOS_DUET_MOCK);
  const r = await run(TOOL, ['info'], 15000);
  try { return JSON.parse(r.out); } catch { return { uefi: false, systems: [], disks: [], error: r.err.trim() || 'The startup systems couldn’t be read.' }; }
});
// what: 'default' | 'restart'
ipcMain.handle('duet:set', async (_e, what, id) => {
  if (!['default', 'restart'].includes(what) || !/^[0-9A-F]{4}$/.test(String(id))) return { ok: false, err: 'bad request' };
  if (process.env.PALOS_DUET_MOCK) return { ok: true };
  const r = await run('pkexec', [TOOL, what, id], 120000);
  // 126/127: the password window was cancelled
  return { ok: r.ok, cancelled: r.code === 126 || r.code === 127, err: r.err.trim() };
});
// ---------------------------------------------------------------- Make Room for Windows (palos-duet-room)
const ROOM = '/usr/lib/palos-boot/palos-duet-room';
ipcMain.handle('room:info', async () => {
  if (process.env.PALOS_DUET_MOCK) return { ok: true, size: 500e9, used: 120e9, free: 380e9, maxRoom: 360e9, minRoom: 64e9, freeAfter: 0, pending: null, result: null, disk: '/dev/nvme0n1' };
  const r = await run(ROOM, ['info'], 30000);
  try { return JSON.parse(r.out); } catch { return { ok: false, why: r.err.trim() || 'palOS’s volume couldn’t be read.' }; }
});
ipcMain.handle('room:set', async (_e, what, gb) => {
  if (process.env.PALOS_DUET_MOCK) return { ok: true };
  const args = what === 'request' && /^\d{2,5}$/.test(String(gb)) ? ['request', String(gb)] : what === 'cancel' ? ['cancel'] : what === 'restart' ? ['restart'] : null;
  if (!args) return { ok: false, err: 'bad request' };
  const r = await run('pkexec', [ROOM, ...args], 120000);
  return { ok: r.ok, cancelled: r.code === 126 || r.code === 127, err: r.err.trim() };
});

// ---------------------------------------------------------------- a Windows installer USB stick (Disk Utility's writer)
const DISKS = '/usr/lib/palos-disks/disks-helper';
ipcMain.handle('usb:targets', async () => {
  const r = await run('lsblk', ['-J', '-b', '-o', 'NAME,PATH,TYPE,SIZE,MODEL,VENDOR,RM,HOTPLUG,TRAN,RO,MOUNTPOINTS'], 10000);
  let list = [];
  try { list = JSON.parse(r.out).blockdevices || []; } catch {}
  const sys = (d) => JSON.stringify(d).includes('"/"') || JSON.stringify(d).includes('/boot');
  return list.filter((d) => d.type === 'disk' && !d.ro && (d.rm || d.hotplug || d.tran === 'usb') && !sys(d) && d.size >= 7e9)
    .map((d) => ({ path: d.path, name: [d.vendor, d.model].filter(Boolean).join(' ').trim() || d.name, size: d.size }));
});
ipcMain.handle('usb:pick', async () => {
  const { dialog } = require('electron');
  const r = await dialog.showOpenDialog(win, { title: 'Choose a Windows Installer Image', properties: ['openFile'], defaultPath: path.join(require('os').homedir(), 'Downloads'),
    filters: [{ name: 'Windows image (.iso)', extensions: ['iso'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const k = await run('python3', ['-I', '/usr/lib/palos-disks/imagewriter.py', 'kind', r.filePaths[0]], 120000);
  return { path: r.filePaths[0], name: path.basename(r.filePaths[0]), windows: k.out.trim() === 'windows' };
});
ipcMain.handle('usb:write', (e, iso, dev) => new Promise((resolve) => {
  if (typeof iso !== 'string' || !/^\/dev\/[a-z0-9]+$/.test(String(dev))) return resolve({ ok: false, err: 'bad request' });
  const { spawn } = require('child_process');
  const p = spawn('pkexec', [DISKS, 'restore', iso, dev], { env: { ...process.env, LC_ALL: 'C' } });
  let buf = '', res = null, err = '';
  p.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const l = buf.slice(0, i); buf = buf.slice(i + 1);
      const m = /^PROGRESS (\d+) ?(.*)$/.exec(l);
      if (m && win) win.webContents.send('usb:progress', { pct: +m[1], text: m[2] });
      else if (l === 'OK') res = { ok: true };
      else if (l.startsWith('ERROR ')) res = { ok: false, err: l.slice(6) };
    }
  });
  p.stderr.on('data', (d) => (err += d));
  p.on('close', (code) => resolve(res || { ok: false, cancelled: code === 126 || code === 127, err: err.trim().split('\n').pop() || 'The stick couldn’t be made.' }));
}));
// ---------------------------------------------------------------- Install Windows (palos-duet-windows): by itself, from a .iso
const WIN = '/usr/lib/palos-boot/palos-duet-windows';
const MOCK_PLAN = { ok: true, free: 380e9, needs: 64e9, uefi: true, oemKey: true, settings: { locale: 'fr-CA', keyboardName: 'Canadian French', timezone: 'Eastern Standard Time', computerName: 'JOEYS-PAL' } };
ipcMain.handle('win:plan', async (_e, iso) => {
  if (process.env.PALOS_DUET_MOCK) return iso ? { ...MOCK_PLAN, language: 'en-US', suggested: 1, stagingBytes: 7e9, editions: [{ index: 1, display: 'Windows 11 Home', edition: 'Core' }, { index: 6, display: 'Windows 11 Pro', edition: 'Professional' }] } : MOCK_PLAN;
  const r = await run(WIN, ['plan', ...(iso ? [iso] : [])], 180000);
  try { return JSON.parse(r.out); } catch { return { ok: false, why: r.err.trim() || 'The Windows image couldn’t be read.' }; }
});
ipcMain.handle('win:status', async () => {
  if (process.env.PALOS_DUET_MOCK) return {};
  const r = await run(WIN, ['status'], 15000);
  try { return JSON.parse(r.out); } catch { return {}; }
});
ipcMain.handle('win:pick', async () => {
  if (process.env.PALOS_DUET_MOCK) return { path: '/tmp/Win11_24H2_English_International_x64.iso', name: 'Win11_24H2_English_International_x64.iso' };
  const { dialog } = require('electron');
  const r = await dialog.showOpenDialog(win, { title: 'Choose a Windows Image', properties: ['openFile'], defaultPath: path.join(require('os').homedir(), 'Downloads'),
    filters: [{ name: 'Windows image (.iso)', extensions: ['iso'] }] });
  return r.canceled || !r.filePaths[0] ? null : { path: r.filePaths[0], name: path.basename(r.filePaths[0]) };
});
ipcMain.handle('win:prepare', (e, iso, index) => new Promise((resolve) => {
  if (typeof iso !== 'string' || !/^\d{1,2}$/.test(String(index))) return resolve({ ok: false, err: 'bad request' });
  if (process.env.PALOS_DUET_MOCK) { let p = 0; const t = setInterval(() => { p += 20; if (win) win.webContents.send('win:progress', { pct: p, text: 'Copying Windows 11 Home' }); if (p >= 100) { clearInterval(t); resolve({ ok: true }); } }, 300); return; }
  const { spawn } = require('child_process');
  const p = spawn('pkexec', [WIN, 'prepare', iso, String(index)], { env: { ...process.env, LC_ALL: 'C.UTF-8' } });
  let buf = '', res = null, err = '';
  p.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const l = buf.slice(0, i); buf = buf.slice(i + 1);
      const m = /^PROGRESS (\d+) ?(.*)$/.exec(l);
      if (m && win) win.webContents.send('win:progress', { pct: +m[1], text: m[2] });
      else if (l === 'OK') res = { ok: true };
      else if (l.startsWith('ERROR ')) res = { ok: false, err: l.slice(6) };
    }
  });
  p.stderr.on('data', (d) => (err += d));
  p.on('close', (code) => resolve(res || { ok: false, cancelled: code === 126 || code === 127, err: err.trim().split('\n').pop() || 'Windows couldn’t be got ready.' }));
}));
ipcMain.handle('win:set', async (_e, what) => {
  if (!['restart', 'cancel'].includes(what)) return { ok: false, err: 'bad request' };
  if (process.env.PALOS_DUET_MOCK) return { ok: true };
  const r = await run('pkexec', [WIN, what], 120000);
  return { ok: r.ok, cancelled: r.code === 126 || r.code === 127, err: r.err.trim() };
});
ipcMain.handle('duet:help', () => shell.openExternal('https://support.microsoft.com/windows/create-installation-media-for-windows-99a58364-8c02-206f-aa6f-40c3b507420d'));

function createWindow() {
  win = new BrowserWindow({ width: 680, height: 720, minWidth: 560, minHeight: 520, title: 'Duet', show: false, resizable: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2', icon: '/usr/share/icons/hicolor/512x512/apps/palos-duet.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; app.quit(); });
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Duet', submenu: [{ role: 'about', label: 'About Duet' }, { type: 'separator' }, { role: 'hide', label: 'Hide Duet' }, { role: 'hideOthers', label: 'Hide Others' }, { role: 'unhide', label: 'Show All' }, { type: 'separator' }, { label: 'Quit Duet', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'File', submenu: [{ label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() }] },
    { label: 'View', submenu: [{ label: 'Refresh', accelerator: 'Ctrl+R', click: send('refresh') }] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize' }, { role: 'zoom', label: 'Zoom' }] },
    { label: 'Help', submenu: [{ label: 'Getting Windows Installation Media', click: () => shell.openExternal('https://www.microsoft.com/software-download/windows11') }] },
  ]));
}

app.setAboutPanelOptions({ applicationName: 'Duet', applicationVersion: '1.0', copyright: 'palOS 27' });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

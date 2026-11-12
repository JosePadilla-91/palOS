'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Remote Disc: use the CD/DVD drive of another computer on the network, or share this one's.
const { app, BrowserWindow, Menu, ipcMain, nativeTheme, shell } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sheets = require('./sheets');

app.setName('Remote Disc');
if (process.platform === 'linux') app.setDesktopName('palos-remote-drive.desktop');
const TOOL = '/usr/lib/palos-remote-drive/remote-drive';
const HELPER_EXE = '/usr/share/palos-remote-drive/palOS Remote Disc Helper.exe';
let win = null;

function run(cmd, args, timeout = 30000) {
  return new Promise((resolve) => execFile(cmd, args, { timeout, maxBuffer: 4 * 1024 * 1024 }, (err, out, e) => resolve({ ok: !err, out: String(out || ''), err: String(e || (err && err.message) || '').trim() })));
}
async function tool(...args) {
  const r = await run(TOOL, args, 60000);
  try { return JSON.parse(r.out.trim().split('\n').pop()); } catch { return { error: r.err || 'Remote Disc isn’t working.' }; }
}
const H = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => { try { return await fn(...a); } catch (err) { return { error: String(err.message || err) }; } });
H('discover', () => tool('discover', '2.5'));
H('probe', (host) => tool('probe', host));
H('connect', (host, port, drive) => tool('connect', host, String(port), drive));
H('disconnect', (host, drive) => (host ? tool('disconnect', host, drive) : tool('disconnect')));
H('inUse', () => tool('list'));
H('sharing', async () => {
  const en = await run('systemctl', ['--user', 'is-enabled', 'palos-remote-drive-share.service']);
  const act = await run('systemctl', ['--user', 'is-active', 'palos-remote-drive-share.service']);
  const drives = fs.readdirSync('/dev').filter((n) => /^sr\d+$/.test(n));
  return { enabled: en.out.trim() === 'enabled', active: act.out.trim() === 'active', hasDrive: drives.length > 0, name: (await run('hostnamectl', ['--pretty'])).out.trim() || os.hostname() };
});
H('setSharing', async (on) => {
  const r = await run('systemctl', ['--user', on ? 'enable' : 'disable', '--now', 'palos-remote-drive-share.service']);
  return r.ok ? true : { error: r.err };
});
H('saveHelper', async () => {
  const s = await sheets.save(win, { defaultPath: path.join(os.homedir(), 'Downloads', 'palOS Remote Disc Helper.exe') });
  if (!s || s.canceled || !s.filePath) return false;
  fs.copyFileSync(HELPER_EXE, s.filePath); shell.showItemInFolder(s.filePath); return true;
});
H('open', (p) => { shell.openPath(p); return true; });
ipcMain.handle('ui:message', (e, o) => sheets.message(win, o));
ipcMain.handle('ui:prompt', (e, o) => sheets.prompt(win, o));

function create() {
  win = new BrowserWindow({ width: 760, height: 560, minWidth: 600, minHeight: 420, title: 'Remote Disc', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2', icon: '/usr/share/icons/hicolor/256x256/apps/palos-remote-drive.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; app.quit(); });
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Connect to Address…', accelerator: 'Ctrl+K', click: send('address') }, { label: 'Save the Windows Helper…', click: send('helper') }, { type: 'separator' }, { label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() }, { label: 'Quit Remote Disc', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [{ role: 'copy', label: 'Copy' }, { role: 'paste', label: 'Paste' }, { role: 'selectAll', label: 'Select All' }] },
    { label: 'View', submenu: [{ label: 'Look Again', accelerator: 'Ctrl+R', click: send('refresh') }] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }] },
  ]));
}
if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } }); app.whenReady().then(create); }

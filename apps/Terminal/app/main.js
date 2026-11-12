'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Terminal: the palOS command line. A window per shell; themes; find; drag a file in to type its path.
const { app, BrowserWindow, Menu, ipcMain, shell, clipboard, nativeTheme } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

app.setName('Terminal');
if (process.platform === 'linux') app.setDesktopName('palos-terminal.desktop');
const fr = /^fr/i.test(process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '');
const T = (en, f) => (fr ? f : en);
const PREFS = path.join(app.getPath('userData'), 'prefs.json');
let prefs = { theme: 'basic', fontSize: 13 };
try { prefs = { ...prefs, ...JSON.parse(fs.readFileSync(PREFS, 'utf8')) }; } catch {}
const savePrefs = () => { try { fs.mkdirSync(path.dirname(PREFS), { recursive: true }); fs.writeFileSync(PREFS, JSON.stringify(prefs)); } catch {} };
const sessions = new Map();     // webContents id -> pty host

function newWindow(cwd) {
  const w = new BrowserWindow({ width: 760, height: 480, minWidth: 320, minHeight: 160, title: 'Terminal', show: false, backgroundColor: '#ffffff',
    icon: '/usr/share/icons/hicolor/256x256/apps/palos-terminal.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, spellcheck: false } });
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && focused !== w) { const [x, y] = focused.getPosition(); w.setPosition(x + 24, y + 24); }
  w.loadFile(path.join(__dirname, 'ui', 'index.html'), { query: { cwd: cwd || os.homedir() } });
  w.once('ready-to-show', () => w.show());
  w.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?|mailto):/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  w.webContents.on('will-navigate', (e) => e.preventDefault());
  const id = w.webContents.id;
  w.on('close', (e) => {
    const s = sessions.get(id);
    if (s && s.busy && !w.__confirmed) {
      e.preventDefault();
      require('electron').dialog.showMessageBox(w, { type: 'warning', message: T('Close this window?', 'Fermer cette fenêtre?'), detail: T('Closing it ends the programs running in it.', 'La fermer arrête les programmes qui s’y exécutent.'), buttons: [T('Close', 'Fermer'), T('Cancel', 'Annuler')], defaultId: 1, cancelId: 1 })
        .then((r) => { if (r.response === 0) { w.__confirmed = true; w.close(); } });
    }
  });
  w.on('closed', () => { const s = sessions.get(id); if (s) { try { s.p.kill('SIGHUP'); } catch {} sessions.delete(id); } });
  return w;
}

ipcMain.on('pty:start', (e, { cwd, cols, rows }) => {
  const wc = e.sender;
  const p = spawn('/usr/bin/python3', ['-I', path.join(__dirname, 'ptyhost'), cwd || os.homedir()], { stdio: ['pipe', 'pipe', 'inherit'], env: process.env });
  const s = { p, busy: false };
  sessions.set(wc.id, s);
  const sz = Buffer.alloc(5); sz.write('R'); sz.writeUInt16LE(cols || 80, 1); sz.writeUInt16LE(rows || 24, 3); p.stdin.write(sz);
  p.stdout.on('data', (d) => { if (!wc.isDestroyed()) wc.send('pty:data', d.toString('binary')); });
  p.on('exit', (code) => { sessions.delete(wc.id); if (!wc.isDestroyed()) wc.send('pty:exit', code); });
  const poll = setInterval(() => {   // is something other than the shell running? (asked before closing)
    if (p.exitCode != null) return clearInterval(poll);
    require('child_process').execFile('pgrep', ['-P', String(p.pid)], (err, out) => {
      const shellPid = String(out || '').trim().split('\n')[0];
      if (!shellPid) return;
      require('child_process').execFile('pgrep', ['-P', shellPid], (e2, kids) => { s.busy = !!String(kids || '').trim(); });
    });
  }, 1500);
});
ipcMain.on('pty:input', (e, data) => {
  const s = sessions.get(e.sender.id); if (!s) return;
  const b = Buffer.from(data, 'utf8'); const h = Buffer.alloc(5); h.write('D'); h.writeUInt32LE(b.length, 1);
  s.p.stdin.write(Buffer.concat([h, b]));
});
ipcMain.on('pty:resize', (e, { cols, rows }) => {
  const s = sessions.get(e.sender.id); if (!s) return;
  const b = Buffer.alloc(5); b.write('R'); b.writeUInt16LE(cols, 1); b.writeUInt16LE(rows, 3); s.p.stdin.write(b);
});
ipcMain.on('win:title', (e, t) => { const w = BrowserWindow.fromWebContents(e.sender); if (w) w.setTitle(t || 'Terminal'); });
ipcMain.on('win:close', (e) => { const w = BrowserWindow.fromWebContents(e.sender); if (w) { w.__confirmed = true; w.close(); } });
ipcMain.handle('prefs:get', () => prefs);
ipcMain.handle('clip:read', () => clipboard.readText());
ipcMain.on('clip:write', (e, t) => clipboard.writeText(String(t || '')));

function setPref(patch) { Object.assign(prefs, patch); savePrefs(); for (const w of BrowserWindow.getAllWindows()) w.webContents.send('prefs', prefs); menu(); }
function menu() {
  const send = (c) => () => { const w = BrowserWindow.getFocusedWindow(); if (w) w.webContents.send('cmd', c); };
  const theme = (id, en, f) => ({ label: T(en, f), type: 'radio', checked: prefs.theme === id, click: () => setPref({ theme: id }) });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Terminal', submenu: [{ role: 'about', label: T('About Terminal', 'À propos de Terminal') }, { type: 'separator' }, { role: 'quit', label: T('Quit Terminal', 'Quitter Terminal') }] },
    { label: T('Shell', 'Shell'), submenu: [
      { label: T('New Window', 'Nouvelle fenêtre'), accelerator: 'Ctrl+Shift+N', click: () => newWindow() },
      { type: 'separator' },
      { label: T('Clear Scrollback', 'Effacer l’historique'), accelerator: 'Ctrl+Shift+K', click: send('clear') },
      { type: 'separator' },
      { label: T('Close Window', 'Fermer la fenêtre'), accelerator: 'Ctrl+Shift+W', click: () => { const w = BrowserWindow.getFocusedWindow(); if (w) w.close(); } },
    ] },
    { label: T('Edit', 'Édition'), submenu: [
      { label: T('Copy', 'Copier'), accelerator: 'Ctrl+Shift+C', click: send('copy') },
      { label: T('Paste', 'Coller'), accelerator: 'Ctrl+Shift+V', click: send('paste') },
      { label: T('Select All', 'Tout sélectionner'), accelerator: 'Ctrl+Shift+A', click: send('selectAll') },
      { type: 'separator' },
      { label: T('Find…', 'Rechercher…'), accelerator: 'Ctrl+Shift+F', click: send('find') },
    ] },
    { label: T('View', 'Présentation'), submenu: [
      { label: T('Bigger', 'Plus grand'), accelerator: 'Ctrl+=', click: () => setPref({ fontSize: Math.min(36, prefs.fontSize + 1) }) },
      { label: T('Smaller', 'Plus petit'), accelerator: 'Ctrl+-', click: () => setPref({ fontSize: Math.max(8, prefs.fontSize - 1) }) },
      { label: T('Actual Size', 'Taille réelle'), accelerator: 'Ctrl+0', click: () => setPref({ fontSize: 13 }) },
      { type: 'separator' },
      theme('basic', 'Basic', 'Basique'), theme('pro', 'Pro', 'Pro'), theme('homebrew', 'Homebrew', 'Homebrew'), theme('ocean', 'Ocean', 'Océan'), theme('paper', 'Paper', 'Papier'),
      { type: 'separator' },
      { role: 'togglefullscreen', label: T('Enter Full Screen', 'Plein écran'), accelerator: 'F11' },
    ] },
    { role: 'windowMenu', label: T('Window', 'Fenêtre') },
  ]));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  const cwdArg = (argv) => { const d = argv.slice(1).find((a) => !a.startsWith('-') && fs.existsSync(a)); if (!d) return null; return fs.statSync(d).isDirectory() ? d : path.dirname(d); };
  app.on('second-instance', (e, argv, wd) => newWindow(cwdArg(argv) || null));
  app.setAboutPanelOptions({ applicationName: 'Terminal', applicationVersion: '1.0.0', copyright: 'palOS', credits: 'xterm.js (MIT)' });
  app.whenReady().then(() => { menu(); newWindow(cwdArg(process.argv)); });
  app.on('window-all-closed', () => app.quit());
}

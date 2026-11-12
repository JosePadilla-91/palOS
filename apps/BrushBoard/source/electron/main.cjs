// BrushBoard — Electron main process
'use strict';
/* palOS sheets: Save, Open and message panels come out of the window */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, nativeImage, screen, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { PythonManager } = require('./python.cjs');

const isDev = !!process.env.BRUSHBOARD_DEV;
// Pal OS (the Paladin desktop): menus live in the desktop's menu bar and windows use the system
// title bar. Elsewhere BrushBoard keeps its own in-window title bar and menus.
const PAL_OS = process.env.BRUSHBOARD_GLOBAL_MENU === '1' ||
  (process.env.BRUSHBOARD_GLOBAL_MENU !== '0' && /paladin|pal ?os/i.test(process.env.XDG_CURRENT_DESKTOP || ''));
const APP_ROOT = path.join(__dirname, '..');
const RES_ROOT = app.isPackaged ? process.resourcesPath : APP_ROOT;

app.setName('BrushBoard');
// BrushBoard used to be called Titianus: bring that name's settings, extensions and Python environment
// along the first time (once; nothing is copied if BrushBoard already has its own).
(function migrateFromOldName() {
  try {
    const cfg = app.getPath('appData');
    const from = path.join(cfg, 'Titianus'), to = path.join(cfg, 'BrushBoard');
    if (fs.existsSync(from) && !fs.existsSync(to)) {
      fs.renameSync(from, to);
      const ext = path.join(to, 'extensions');
      for (const d of fs.existsSync(ext) ? fs.readdirSync(ext) : []) {
        const dir = path.join(ext, d);
        const old = path.join(dir, 'titianus.toml');
        if (fs.existsSync(old) && !fs.existsSync(path.join(dir, 'brushboard.toml'))) fs.renameSync(old, path.join(dir, 'brushboard.toml'));
        for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.py'))) {
          const p = path.join(dir, f), t = fs.readFileSync(p, 'utf8');
          const u = t.replace(/\b(from|import)\s+titianus\b/g, '$1 brushboard').replace(/\btitianus\./g, 'brushboard.');
          if (u !== t) fs.writeFileSync(p, u);
        }
      }
    }
    const share = path.join(os.homedir(), '.local', 'share');
    if (fs.existsSync(path.join(share, 'titianus')) && !fs.existsSync(path.join(share, 'brushboard'))) fs.renameSync(path.join(share, 'titianus'), path.join(share, 'brushboard'));
  } catch (e) { console.error('BrushBoard: settings from the old name weren’t moved:', e.message); }
})();
const userData = app.getPath('userData');
const prefsFile = path.join(userData, 'preferences.json');
const userExtDir = path.join(userData, 'extensions');
fs.mkdirSync(userExtDir, { recursive: true });

// Ubuntu 24.04 restricts unprivileged user namespaces through AppArmor, which breaks Chromium's
// sandbox inside an AppImage (the .deb ships a proper AppArmor profile). Fall back to --no-sandbox
// only for AppImage runs on such systems, or when explicitly requested.
try {
  const restricted = fs.existsSync('/proc/sys/kernel/apparmor_restrict_unprivileged_userns') &&
    fs.readFileSync('/proc/sys/kernel/apparmor_restrict_unprivileged_userns', 'utf8').trim() === '1';
  if ((process.env.APPIMAGE && restricted) || process.env.BRUSHBOARD_NO_SANDBOX) app.commandLine.appendSwitch('no-sandbox');
} catch { /* ignore */ }

// Hardware acceleration matters for a GPU canvas. Allow overriding for odd drivers.
if (process.env.BRUSHBOARD_DISABLE_GPU) app.disableHardwareAcceleration();
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

function readPrefs() {
  try { return JSON.parse(fs.readFileSync(prefsFile, 'utf8')); } catch { return {}; }
}
function writePrefs(p) {
  try { fs.writeFileSync(prefsFile, JSON.stringify(p, null, 2)); } catch (e) { console.error(e); }
}

// Display backend for pen tablets (Edit › Tablet & Pen…). Electron picks Wayland or X11 automatically;
// some tablet drivers report pressure/tilt more reliably through one or the other.
try {
  const backend = ((readPrefs().tablet || {}).backend) || process.env.BRUSHBOARD_OZONE;
  if (backend === 'x11' || backend === 'wayland') app.commandLine.appendSwitch('ozone-platform', backend);
} catch { /* ignore */ }

let mainWindow = null;
/** The main window if it is still alive (it can be destroyed while Python workers are still exiting). */
function liveWindow() {
  return mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed() ? mainWindow : null;
}
function sendToWindow(channel, ...args) {
  const w = liveWindow();
  if (!w) return false;
  try { w.webContents.send(channel, ...args); return true; } catch { return false; }
}
let pendingOpenFiles = [];
let closeConfirmed = false;

const python = new PythonManager({
  appPythonDir: path.join(RES_ROOT, 'python'),
  bundledRuntime: path.join(RES_ROOT, 'python-runtime'),
  extensionDirs: [path.join(RES_ROOT, 'extensions'), userExtDir],
  getPrefs: readPrefs,
  onHostRequest: (msg) => sendToWindow('py:hostRequest', msg),
  onEvent: (msg) => sendToWindow('py:event', msg),
  log: (...a) => console.log('[python]', ...a),
});

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1680, width),
    height: Math.min(1020, height),
    minWidth: 960,
    minHeight: 600,
    frame: PAL_OS,
    autoHideMenuBar: PAL_OS,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#262b31' : '#e4e7eb',
    title: 'BrushBoard',
    icon: path.join(APP_ROOT, 'build', 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (PAL_OS) {
    // Electron hands the menu to the desktop's menu bar once its menu server is up, shortly after
    // the window appears: set it again then.
    mainWindow.once('show', () => [300, 1500, 5000].forEach((ms) => setTimeout(() => applyMenu(true), ms)));
  }
  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(APP_ROOT, 'dist', 'index.html'));

  mainWindow.on('close', (e) => {
    if (closeConfirmed) return;
    e.preventDefault();
    if (!sendToWindow('app:requestClose')) { closeConfirmed = true; mainWindow.destroy(); }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.on('maximize', () => sendToWindow('win:state', { maximized: true }));
  mainWindow.on('unmaximize', () => sendToWindow('win:state', { maximized: false }));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  if (process.env.BRUSHBOARD_DEVTOOLS) mainWindow.webContents.openDevTools({ mode: 'detach' });
  if (process.env.BRUSHBOARD_SMOKE) require('./smoke.cjs').attach(mainWindow, process.env.BRUSHBOARD_SMOKE, process.env.BRUSHBOARD_SMOKE_OUT || os.tmpdir());
}

function filesFromArgv(argv) {
  // file managers pass file:// links (the launcher uses %U)
  argv = argv.map((a) => { if (typeof a === 'string' && a.startsWith('file://')) { try { return require('url').fileURLToPath(a); } catch { /* keep */ } } return a; });
  const exts = /\.(gio|png|jpe?g|webp|gif|bmp|tiff?|psd|psb|exr|hdr|avif|cr2|cr3|nef|arw|dng|orf|rw2|raf|pef|srw|ppm|pgm|pfm)$/i;
  return argv.slice(1).filter((a) => !a.startsWith('-') && exts.test(a) && fs.existsSync(a)).map((a) => path.resolve(a));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on('second-instance', (_e, argv) => {
    const w = liveWindow();
    if (!w) return;
    if (w.isMinimized()) w.restore();
    w.focus();
    const files = filesFromArgv(argv);
    if (files.length) sendToWindow('app:openFiles', files);
  });
  app.whenReady().then(() => {
    appearance.start();
    pendingOpenFiles = filesFromArgv(process.argv);
    createWindow();
  });
}

app.on('window-all-closed', () => { python.shutdown(); app.quit(); });
app.on('before-quit', () => python.shutdown());

// ---------------------------------------------------------------- IPC: window
ipcMain.on('win:minimize', () => liveWindow()?.minimize());
ipcMain.on('win:maximize', () => { const w = liveWindow(); if (!w) return; w.isMaximized() ? w.unmaximize() : w.maximize(); });
ipcMain.on('win:close', () => liveWindow()?.close());
ipcMain.on('win:toggleFullscreen', () => { const w = liveWindow(); if (w) w.setFullScreen(!w.isFullScreen()); });
ipcMain.on('win:devtools', () => liveWindow()?.webContents.toggleDevTools());
ipcMain.on('app:closeConfirmed', () => { closeConfirmed = true; python.shutdown(); liveWindow()?.close(); });
ipcMain.handle('app:pendingFiles', () => { const f = pendingOpenFiles; pendingOpenFiles = []; return f; });
ipcMain.handle('app:info', () => ({
  palOS: PAL_OS,
  version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome,
  platform: process.platform, userData, userExtDir, home: os.homedir(),
  packaged: app.isPackaged, resources: RES_ROOT, smoke: !!process.env.BRUSHBOARD_SMOKE,
}));

// ---------------------------------------------------------------- IPC: prefs
ipcMain.handle('prefs:get', () => readPrefs());
ipcMain.handle('prefs:set', (_e, p) => { writePrefs(p); return true; });

// ---------------------------------------------------------------- IPC: dialogs and files
ipcMain.handle('dlg:open', async (_e, opts) => {
  const r = await (liveWindow() ? dialog.showOpenDialog(liveWindow(), opts || {}) : dialog.showOpenDialog(opts || {}));
  return r.canceled ? [] : r.filePaths;
});
ipcMain.handle('dlg:save', async (_e, opts) => {
  const r = await (liveWindow() ? dialog.showSaveDialog(liveWindow(), opts || {}) : dialog.showSaveDialog(opts || {}));
  return r.canceled ? null : r.filePath;
});
ipcMain.handle('dlg:message', async (_e, opts) => {
  const r = await (liveWindow() ? dialog.showMessageBox(liveWindow(), opts) : dialog.showMessageBox(opts));
  return r.response;
});
ipcMain.handle('fs:read', async (_e, p) => {
  const b = await fs.promises.readFile(p);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
});
ipcMain.handle('fs:write', async (_e, p, data) => {
  const tmp = p + '.brushboard-tmp';
  await fs.promises.writeFile(tmp, Buffer.from(data));
  await fs.promises.rename(tmp, p);
  return true;
});
ipcMain.handle('fs:exists', (_e, p) => fs.existsSync(p));
ipcMain.handle('fs:stat', async (_e, p) => { try { const s = await fs.promises.stat(p); return { size: s.size, mtime: s.mtimeMs, dir: s.isDirectory() }; } catch { return null; } });
ipcMain.handle('fs:list', async (_e, dir) => { try { return await fs.promises.readdir(dir); } catch { return []; } });
ipcMain.handle('shell:showItem', (_e, p) => shell.showItemInFolder(p));
ipcMain.handle('shell:openPath', (_e, p) => shell.openPath(p));
ipcMain.handle('shell:openExternal', (_e, url) => shell.openExternal(url));

// System fonts via fontconfig (always present on Ubuntu)
ipcMain.handle('sys:fonts', () => new Promise((resolve) => {
  execFile('fc-list', [':', 'family'], { maxBuffer: 8 * 1024 * 1024 }, (err, out) => {
    if (err) return resolve([]);
    const set = new Set();
    out.split('\n').forEach((l) => { const f = l.split(',')[0].trim(); if (f) set.add(f); });
    resolve([...set].sort((a, b) => a.localeCompare(b)));
  });
}));

// ---------------------------------------------------------------- IPC: clipboard
ipcMain.handle('clip:readImage', () => {
  const img = clipboard.readImage();
  if (img.isEmpty()) return null;
  const png = img.toPNG();
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength);
});
ipcMain.handle('clip:writeImage', (_e, pngData) => {
  clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(pngData)));
  return true;
});

// ---------------------------------------------------------------- IPC: python
ipcMain.handle('py:status', () => python.status());
ipcMain.handle('py:restart', () => python.restartAll());
ipcMain.handle('py:extensions', () => python.listExtensions());
ipcMain.handle('py:reloadExtension', (_e, id) => python.reloadExtension(id));
ipcMain.handle('py:setExtensionEnabled', (_e, id, enabled) => python.setExtensionEnabled(id, enabled));
ipcMain.handle('py:installDeps', (_e, id) => python.installDeps(id));
ipcMain.handle('py:installExtension', (_e, srcDir) => python.installExtension(srcDir));
// Errors are returned (not thrown) so the Python traceback survives the IPC boundary.
const pyErr = (e) => ({ __error: { message: e.message, traceback: e.traceback || '' } });
ipcMain.handle('py:call', async (_e, worker, method, params, buffers) => {
  try { return await python.call(worker, method, params || {}, buffers || {}); } catch (e) { return pyErr(e); }
});
ipcMain.handle('py:hostReply', (_e, worker, id, result, error, buffers) => python.hostReply(worker, id, result, error, buffers || {}));
ipcMain.handle('py:runScript', async (_e, scriptPath) => { try { return await python.runScript(scriptPath); } catch (e) { return pyErr(e); } });
ipcMain.handle('py:setupVenv', () => python.setupVenv());

// ---------------------------------------------------------------- Pal OS: menus and appearance
// Light/dark follows the Dark Mode switch in Pal OS Settings (GNOME's color-scheme key); the page
// styles itself with prefers-color-scheme, which Electron drives from nativeTheme.themeSource.
const appearance = (() => {
  const { execFileSync, spawn } = require('child_process');
  const SCHEMA = 'org.gnome.desktop.interface';
  let dark = null, proc = null;
  const apply = (d) => { if (d === dark) return; dark = d; nativeTheme.themeSource = d ? 'dark' : 'light'; sendToWindow('pal:theme', d); };
  const read = () => { try { return /prefer-dark/.test(execFileSync('gsettings', ['get', SCHEMA, 'color-scheme'], { encoding: 'utf8', timeout: 3000 })); } catch { return null; } };
  const watch = () => {
    let buf = '';
    try { proc = spawn('gsettings', ['monitor', SCHEMA, 'color-scheme'], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return; }
    proc.stdout.on('data', (d) => { buf += d; const l = buf.split('\n'); buf = l.pop(); for (const x of l) apply(/prefer-dark/.test(x)); });
    proc.on('error', () => {});
    proc.on('exit', () => { proc = null; if (!app.isQuitting) setTimeout(watch, 5000); });
  };
  return {
    start() {
      const d = read();
      if (d === null) return;               // no GNOME settings: leave it to the system theme
      apply(d); watch();
    },
    stop() { app.isQuitting = true; try { proc?.kill(); } catch { /* gone */ } },
  };
})();
app.on('before-quit', () => appearance.stop());

// The page sends its whole menu tree (labels, shortcuts, enabled and checked states) whenever it
// changes; choosing an item sends its id back.
let lastMenu = null, lastMenuSig = '';
const ACCEL_KEYS = { Del: 'Delete', Esc: 'Escape', Enter: 'Return', '+': 'Plus', ' ': 'Space', Up: 'Up', Down: 'Down', Left: 'Left', Right: 'Right' };
function toAccelerator(s) {
  if (!s) return undefined;
  const first = String(s).split('|')[0].trim();
  const m = first.match(/^((?:(?:Ctrl|Control|Shift|Alt|Cmd|Super|Meta)\+)*)(.+)$/i);
  if (!m) return undefined;
  const mods = m[1].split('+').filter(Boolean).map((x) => ({ control: 'Ctrl', cmd: 'Ctrl', meta: 'Super' }[x.toLowerCase()] || x[0].toUpperCase() + x.slice(1).toLowerCase()));
  let key = ACCEL_KEYS[m[2]] || m[2];
  if (key.length === 1) key = key.toUpperCase();
  if (!/^([A-Z0-9]|F([1-9]|1[0-9]|2[0-4])|Plus|Space|Tab|Backspace|Delete|Insert|Return|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|[-=,./;'`\[\]\\])$/.test(key)) return undefined;
  return [...mods, key].join('+');
}
// Electron treats '&' as a keyboard-access marker; double it so "Tablet & Pen…" keeps its ampersand.
const esc = (l) => String(l ?? '').replace(/&/g, '&&');
function applyMenu(force) {
  const w = liveWindow();
  if (!PAL_OS || !w || !lastMenu) return;
  if (!force && lastMenu.sig === lastMenuSig) return;
  lastMenuSig = lastMenu.sig;
  const conv = (n) => {
    if (n.sep) return { type: 'separator' };
    if (n.items) {
      const sub = n.items.map(conv);
      return { label: esc(n.label), enabled: n.enabled !== false, submenu: sub.length ? sub : [{ label: '(empty)', enabled: false }] };
    }
    return {
      label: esc(n.label), enabled: n.enabled !== false,
      ...(n.checked === true || n.checked === false ? { type: 'checkbox', checked: n.checked } : {}),
      ...(toAccelerator(n.accel) ? { accelerator: toAccelerator(n.accel), registerAccelerator: false } : {}),
      click: () => sendToWindow('pal:menuClick', n.id),
    };
  };
  try {
    w.setMenu(Menu.buildFromTemplate(lastMenu.tree.map(conv)));
    w.setMenuBarVisibility(false);
  } catch (e) { console.error('[menu]', e); }
}
ipcMain.on('pal:menu', (_e, tree, sig) => { lastMenu = { tree, sig }; applyMenu(false); });

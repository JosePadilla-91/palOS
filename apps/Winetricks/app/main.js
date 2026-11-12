'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Winetricks for palOS: adds Windows components (DLLs, runtimes), fonts and settings to the Windows environment
// palOS's Windows apps run in. Runs straight on palOS's Wine (no Classic, no GTK): this window lists Winetricks'
// catalogue, and installing runs `winetricks -q` with its progress shown here.
const { app, BrowserWindow, Menu, ipcMain, shell, nativeTheme } = require('electron');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sheets = require('./sheets');

app.setName('Winetricks');
if (process.platform === 'linux') app.setDesktopName('palos-winetricks.desktop');

const WT = '/usr/lib/palos-winetricks/winetricks';
const WINE = '/opt/palos-windows/wine/bin';
const PREFIX = process.env.WINEPREFIX || path.join(os.homedir(), '.local/share/palos-windows/prefix');
const ENV = {
  ...process.env,
  WINEPREFIX: PREFIX,
  WINE: WINE + '/wine',
  WINESERVER: WINE + '/wineserver',
  WINEDEBUG: '-all',
  WINEDLLOVERRIDES: 'winemenubuilder.exe=d',
  PATH: WINE + ':/usr/bin:/bin',
  WINETRICKS_LATEST_VERSION_CHECK: 'disabled',
  W_OPT_UNATTENDED: '1',
};
let win = null;
let job = null;
let lists = null;

const send = (ch, ...a) => win && !win.isDestroyed() && win.webContents.send(ch, ...a);

function run(args, timeout = 240000) {
  return new Promise((res) =>
    execFile('/bin/sh', [WT, ...args], { env: ENV, maxBuffer: 32 << 20, timeout }, (e, out) => res(out || '')),
  );
}

/** "verb   Title (Publisher, year) [downloadable]" lines -> [{verb, title, who, cached}] */
function parse(out) {
  const L = [];
  for (const line of out.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_.+=-]+)\s{2,}(\S.*?)\s*$/);
    if (!m || m[1] === 'Executing') continue;
    let d = m[2];
    const cached = /\[cached\]\s*$/.test(d);
    d = d.replace(/\s*\[(downloadable|cached)\]\s*$/, '');
    let who = '';
    const w = d.match(/\(([^()]*)\)\s*$/);
    if (w) {
      who = w[1];
      d = d.slice(0, w.index).trim();
    }
    L.push({ verb: m[1], title: d, who, cached });
  }
  return L;
}

/** this account's Windows environment, from palOS's ready-made one (does nothing if it's already there) */
function ensure() {
  return new Promise((res) => {
    if (fs.existsSync(path.join(PREFIX, '.palos-ready'))) return res(true);
    send('log', 'Setting up the Windows environment…');
    const p = spawn('/usr/lib/palos-windows/setup', [], { env: { ...process.env, WINEPREFIX: PREFIX }, stdio: 'ignore' });
    p.on('exit', (c) => res(c === 0));
    p.on('error', () => res(false));
  });
}

ipcMain.handle('lists', async () => {
  if (!lists) {
    const [a, b, c, d] = await Promise.all(['dlls', 'fonts', 'settings', 'apps'].map((k) => run([k, 'list'])));
    lists = { dlls: parse(a), fonts: parse(b), settings: parse(c), apps: parse(d) };
  }
  return lists;
});

ipcMain.handle('installed', async () => {
  try {
    return fs
      .readFileSync(path.join(PREFIX, 'winetricks.log'), 'utf8')
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('-') && /^[A-Za-z0-9_.+=-]+$/.test(s));
  } catch {
    return [];
  }
});

ipcMain.handle('install', async (e, verbs) => {
  if (job || !Array.isArray(verbs) || !verbs.length) return false;
  verbs = verbs.filter((v) => /^[A-Za-z0-9_.+=-]+$/.test(v));
  job = { pid: 0, cancelled: false };
  if (!(await ensure())) {
    job = null;
    send('done', 1, 'The Windows environment couldn’t be set up.');
    return false;
  }
  send('log', `winetricks ${verbs.join(' ')}`);
  const p = spawn('/bin/sh', [WT, '-q', ...verbs], { env: ENV, detached: true, cwd: os.homedir() });
  job.pid = p.pid;
  let tail = '';
  const feed = (buf) => {
    tail += buf.toString();
    const parts = tail.split(/\r?\n|\r/);
    tail = parts.pop();
    for (const l of parts) if (l.trim()) send('log', l);
  };
  p.stdout.on('data', feed);
  p.stderr.on('data', feed);
  p.on('exit', (code) => {
    const c = job && job.cancelled;
    job = null;
    send('done', c ? -1 : code ?? 1);
  });
  p.on('error', (err) => {
    job = null;
    send('done', 1, String(err));
  });
  return true;
});

ipcMain.handle('cancel', () => {
  if (!job) return;
  job.cancelled = true;
  try {
    job.pid && process.kill(-job.pid, 'SIGTERM');
  } catch {}
  spawn(WINE + '/wineserver', ['-k'], { env: ENV, stdio: 'ignore' }).on('error', () => {});
});

ipcMain.handle('openC', () => shell.openPath(path.join(PREFIX, 'drive_c')));

function create() {
  win = new BrowserWindow({
    width: 980,
    height: 640,
    minWidth: 700,
    minHeight: 440,
    title: 'Winetricks',
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2',
    icon: '/usr/share/icons/hicolor/256x256/apps/palos-winetricks.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () =>
    setTimeout(() => {
      if (win && !win.isDestroyed() && !win.isVisible()) win.show();
    }, 3000),
  );
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('close', async (e) => {
    if (!job) return;
    e.preventDefault();
    const r = await sheets.message(win, {
      type: 'warning',
      message: 'Winetricks is still installing.',
      detail: 'If you quit now, what it was installing may be left half-done.',
      buttons: ['Keep Installing', 'Stop and Quit'],
      defaultId: 0,
      cancelId: 0,
    });
    if (r && r.response === 1) {
      job && (job.cancelled = true);
      try {
        job && job.pid && process.kill(-job.pid, 'SIGTERM');
      } catch {}
      job = null;
      win.destroy();
    }
  });
  win.on('closed', () => {
    win = null;
    app.quit();
  });
  const cmd = (c) => () => send('cmd', c);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          { label: 'Open the Windows C: Drive', click: () => shell.openPath(path.join(PREFIX, 'drive_c')) },
          { type: 'separator' },
          { label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() },
          { label: 'Quit Winetricks', accelerator: 'Ctrl+Q', click: () => win && win.close() },
        ],
      },
      { label: 'Edit', submenu: [{ label: 'Find', accelerator: 'Ctrl+F', click: cmd('find') }, { label: 'Clear Selection', click: cmd('clear') }] },
      {
        label: 'View',
        submenu: [
          { label: 'Components', accelerator: 'Ctrl+1', click: cmd('dlls') },
          { label: 'Fonts', accelerator: 'Ctrl+2', click: cmd('fonts') },
          { label: 'Settings', accelerator: 'Ctrl+3', click: cmd('settings') },
          { label: 'Apps', accelerator: 'Ctrl+4', click: cmd('apps') },
          { label: 'Installed', accelerator: 'Ctrl+5', click: cmd('installed') },
        ],
      },
      { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }] },
    ]),
  );
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(create);
}

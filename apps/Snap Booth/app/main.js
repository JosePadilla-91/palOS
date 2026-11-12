'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Snap Booth: take photos, four-up strips and videos with the camera.
const { app, BrowserWindow, ipcMain, session, shell, Menu, nativeTheme } = require('electron');
const sheets = require('./sheets');
const fs = require('fs');
const os = require('os');
const path = require('path');

app.setName('Snap Booth');
if (process.platform === 'linux') app.setDesktopName('palos-snap-booth.desktop');
const DIR = path.join(process.env.XDG_PICTURES_DIR || path.join(os.homedir(), 'Pictures'), 'Snap Booth');
let win = null;

const stamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`; };
function uniq(base, ext) { fs.mkdirSync(DIR, { recursive: true }); let f = path.join(DIR, base + ext), n = 2; while (fs.existsSync(f)) f = path.join(DIR, `${base} (${n++})${ext}`); return f; }

function list() {
  try {
    return fs.readdirSync(DIR).filter((f) => /\.(png|jpg|webm)$/i.test(f)).map((f) => { const p = path.join(DIR, f); return { name: f, path: p, mtime: fs.statSync(p).mtimeMs, video: /\.webm$/i.test(f) }; })
      .sort((a, b) => b.mtime - a.mtime).slice(0, 60);
  } catch { return []; }
}

function create() {
  // the camera and microphone are the point of this app; nothing else is allowed
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => perm === 'media');
  win = new BrowserWindow({ width: 860, height: 700, minWidth: 560, minHeight: 520, title: 'Snap Booth', show: false, backgroundColor: '#15161a',
    icon: '/usr/share/icons/hicolor/256x256/apps/palos-snap-booth.png', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // if the graphics process never reports a first paint (busy or software-only computers), show it anyway
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) { win.show(); win.focus(); } }, 3000));
  win.on('closed', () => { win = null; app.quit(); });
}

ipcMain.handle('list', () => list());
ipcMain.handle('save', (e, kind, bytes) => {
  const ext = kind === 'video' ? '.webm' : '.png';
  const file = uniq(`${kind === 'video' ? 'Movie' : kind === 'strip' ? 'Strip' : 'Photo'} ${stamp()}`, ext);
  fs.writeFileSync(file, Buffer.from(bytes));
  return { name: path.basename(file), path: file, mtime: Date.now(), video: kind === 'video' };
});
ipcMain.handle('remove', (e, file) => { if (path.dirname(file) !== DIR) return false; try { shell.trashItem(file); return true; } catch { return false; } });
ipcMain.handle('reveal', (e, file) => { if (path.dirname(file) === DIR) shell.showItemInFolder(file); });
ipcMain.handle('open', (e, file) => { if (path.dirname(file) === DIR) shell.openPath(file); });
ipcMain.handle('url', (e, file) => (path.dirname(file) === DIR ? 'file://' + encodeURI(file) : ''));

// backgrounds: the palOS wallpapers, or a picture of your own
const WALLS = '/usr/share/backgrounds/palos';
ipcMain.handle('backdrops', () => {
  try { return fs.readdirSync(WALLS).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().map((f) => ({ name: f.replace(/\.[^.]+$/, ''), url: 'file://' + encodeURI(path.join(WALLS, f)) })); } catch { return []; }
});
ipcMain.handle('backdrop:choose', async () => {
  const r = await sheets.open(win, { title: 'Choose a Background Picture', properties: ['openFile'], filters: [{ name: 'Pictures', extensions: ['jpg', 'jpeg', 'png', 'webp'] }] });
  if (!r || r.canceled || !r.filePaths || !r.filePaths[0]) return null;
  return 'file://' + encodeURI(r.filePaths[0]);
});
ipcMain.handle('ui:message', (e, o) => sheets.message(win, o));
ipcMain.handle('ui:prompt', (e, o) => sheets.prompt(win, o));

if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => win && win.focus()); app.whenReady().then(create); }

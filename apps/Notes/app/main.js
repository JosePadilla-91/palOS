'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Notes: notes on a yellow legal pad. Each note is one small file, saved as you type.
const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme } = require('electron');
const sheets = require('./sheets');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

app.setName('Notes');
if (process.platform === 'linux') app.setDesktopName('palos-notes.desktop');
const DIR = path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'palos-notes');
const NOTES = path.join(DIR, 'notes'), META = path.join(DIR, 'notess.json');
let win = null;

const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
function writeAtomic(f, text) { const t = f + '.tmp'; fs.writeFileSync(t, text); fs.renameSync(t, f); }
const idOk = (id) => /^[a-f0-9]{16}$/.test(String(id));
const plain = (html) => String(html || '').replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function allNotes() {
  fs.mkdirSync(NOTES, { recursive: true });
  const out = [];
  for (const f of fs.readdirSync(NOTES).filter((x) => x.endsWith('.json'))) {
    const n = readJSON(path.join(NOTES, f), null); if (!n || !idOk(n.id)) continue;
    const text = plain(n.html).trim();
    out.push({ id: n.id, title: text.split('\n')[0].slice(0, 80) || 'New Note', preview: text.split('\n').slice(1).join(' ').slice(0, 120), modified: n.modified, created: n.created, notes: n.notes || 'Notes', pinned: !!n.pinned, trashed: !!n.trashed });
  }
  return out;
}
const books = () => { const b = readJSON(META, ['Notes']); return b.includes('Notes') ? b : ['Notes', ...b]; };

ipcMain.handle('init', () => ({ notes: allNotes(), books: books() }));
ipcMain.handle('read', (e, id) => idOk(id) ? readJSON(path.join(NOTES, id + '.json'), null) : null);
ipcMain.handle('create', (e, notes) => {
  const id = crypto.randomBytes(8).toString('hex'), now = Date.now();
  const n = { id, html: '', created: now, modified: now, notes: notes || 'Notes', pinned: false, trashed: false };
  fs.mkdirSync(NOTES, { recursive: true }); writeAtomic(path.join(NOTES, id + '.json'), JSON.stringify(n)); return n;
});
ipcMain.handle('save', (e, id, patch) => {
  if (!idOk(id)) return false; const f = path.join(NOTES, id + '.json'); const n = readJSON(f, null); if (!n) return false;
  for (const k of ['html', 'notes', 'pinned', 'trashed']) if (k in patch) n[k] = patch[k];
  n.modified = Date.now(); writeAtomic(f, JSON.stringify(n)); return true;
});
ipcMain.handle('delete', (e, id) => { if (idOk(id)) try { fs.unlinkSync(path.join(NOTES, id + '.json')); } catch {} return true; });
ipcMain.handle('setBooks', (e, list) => { fs.mkdirSync(DIR, { recursive: true }); writeAtomic(META, JSON.stringify([...new Set(['Notes', ...list.map(String)])])); return true; });
ipcMain.handle('export', async (e, id, kind) => {
  const n = readJSON(path.join(NOTES, id + '.json'), null); if (!n) return false;
  const title = (plain(n.html).trim().split('\n')[0] || 'Note').slice(0, 60).replace(/[\\/:*?"<>|]/g, '');
  const r = await sheets.save(win, { defaultPath: path.join(os.homedir(), 'Documents', title + (kind === 'pdf' ? '.pdf' : '.txt')) });
  if (r.canceled) return false;
  if (kind === 'txt') { fs.writeFileSync(r.filePath, plain(n.html)); return true; }
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<meta charset="utf-8"><style>body{font:14px "Noto Sans",sans-serif;line-height:1.6;margin:0}</style>${n.html}`));
  fs.writeFileSync(r.filePath, await w.webContents.printToPDF({ pageSize: 'Letter', margins: { marginType: 'default' } })); w.destroy(); return true;
});

function create() {
  win = new BrowserWindow({ width: 980, height: 680, minWidth: 640, minHeight: 420, title: 'Notes', show: false, backgroundColor: '#f7f0b8',
    icon: '/usr/share/icons/hicolor/256x256/apps/palos-notes.png', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // if the graphics process never reports a first paint (busy or software-only computers), show it anyway
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) { win.show(); win.focus(); } }, 3000));
  win.on('closed', () => { win = null; app.quit(); });
}
ipcMain.handle('ui:message', (e, o) => sheets.message(win, o));
ipcMain.handle('ui:prompt', (e, o) => sheets.prompt(win, o));

if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => win && win.focus()); app.whenReady().then(create); }

// Site Knitter — Electron main process
'use strict';
/* palOS sheets: Save, Open and message panels come out of the window */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
/* paladin-uri: file managers hand over file:// links (the launcher uses %U); this app wants paths. */
(() => { const { fileURLToPath } = require("url"); const fix = (a) => { if (typeof a === "string" && a.startsWith("file://")) { try { return fileURLToPath(a); } catch {} } return a; };
  for (let i = 1; i < process.argv.length; i++) process.argv[i] = fix(process.argv[i]);
  const { app } = require("electron"); const on = app.on.bind(app);
  app.on = function (ev, fn) { return ev === "second-instance" ? on(ev, (e, argv, ...rest) => fn(e, Array.isArray(argv) ? argv.map(fix) : argv, ...rest)) : on(ev, fn); };
})();


const { app, BrowserWindow, WebContentsView, Menu, ipcMain, dialog, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const AdmZip = require('adm-zip');

const APP_NAME = 'Site Knitter';
const PROJECT_EXT = 'wspin';
const isMac = process.platform === 'darwin';

app.setName(APP_NAME);

let mainWindow = null;
let forceClose = false;
let pendingOpenPath = null;

// ---------------------------------------------------------------------------
// Settings (recent files, publish credentials)
// ---------------------------------------------------------------------------
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');

function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')); }
  catch { return { recent: [], credentials: {} }; }
}
function writeSettings(s) {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(s, null, 2));
  } catch (e) { console.error('settings write failed', e); }
}
function addRecent(file) {
  const s = readSettings();
  s.recent = [file, ...(s.recent || []).filter(f => f !== file)].slice(0, 10);
  writeSettings(s);
  buildMenu();
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    title: APP_NAME,
    backgroundColor: '#2b2d31',
    icon: path.join(__dirname, 'build', 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Keep the editor from navigating away if a link is clicked or a file dropped.
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (e) => {
    if (forceClose) return;
    e.preventDefault();
    mainWindow.webContents.send('app:request-close');
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.once('did-finish-load', () => {
    if (pendingOpenPath) {
      openProjectPath(pendingOpenPath);
      pendingOpenPath = null;
    }
  });
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
function send(cmd, arg) {
  if (mainWindow) mainWindow.webContents.send('menu', cmd, arg);
}

function buildMenu() {
  const recent = (readSettings().recent || []).filter(f => fs.existsSync(f));
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: '&File',
      submenu: [
        { label: 'New Site…', accelerator: 'CmdOrCtrl+N', click: () => send('new-site') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        {
          label: 'Open Recent',
          submenu: recent.length
            ? [...recent.map(f => ({ label: f, click: () => send('open-path', f) })),
               { type: 'separator' },
               { label: 'Clear Menu', click: () => { const s = readSettings(); s.recent = []; writeSettings(s); buildMenu(); } }]
            : [{ label: 'No Recent Sites', enabled: false }],
        },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('save-as') },
        { type: 'separator' },
        { label: 'New Page…', accelerator: 'CmdOrCtrl+Shift+N', click: () => send('add-page') },
        { label: 'Duplicate Page', click: () => send('duplicate-page') },
        { type: 'separator' },
        { label: 'Preview', accelerator: 'CmdOrCtrl+R', click: () => send('preview') },
        { label: 'Export Site to Folder…', accelerator: 'CmdOrCtrl+E', click: () => send('export-folder') },
        { label: 'Export Site as ZIP…', click: () => send('export-zip') },
        { label: 'Publish to Server…', accelerator: 'CmdOrCtrl+Shift+P', click: () => send('publish') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { label: 'Quit', accelerator: 'Ctrl+Q', click: () => mainWindow && mainWindow.close() },
      ],
    },
    {
      label: '&Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => send('redo') },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => send('cut') },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => send('copy') },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => send('paste') },
        { label: 'Duplicate', accelerator: 'CmdOrCtrl+D', click: () => send('duplicate') },
        { label: 'Delete', click: () => send('delete') },
        { type: 'separator' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => send('select-all') },
      ],
    },
    {
      label: '&Insert',
      submenu: [
        { label: 'Text Box', accelerator: 'CmdOrCtrl+Shift+T', click: () => send('insert', 'text') },
        { label: 'Image…', accelerator: 'CmdOrCtrl+Shift+I', click: () => send('insert', 'image') },
        {
          label: 'Shape',
          submenu: ['rect', 'rounded', 'ellipse', 'triangle', 'diamond', 'star', 'hexagon', 'heart', 'arrow', 'bubble', 'line']
            .map(s => ({ label: s[0].toUpperCase() + s.slice(1), click: () => send('insert', 'shape:' + s) })),
        },
        { label: 'Button', click: () => send('insert', 'button') },
        { type: 'separator' },
        { label: 'Photo Gallery', click: () => send('insert', 'gallery') },
        { label: 'Slideshow', click: () => send('insert', 'slideshow') },
        { label: 'Video…', click: () => send('insert', 'video') },
        { label: 'Audio…', click: () => send('insert', 'audio') },
        { type: 'separator' },
        { label: 'YouTube / Vimeo Video', click: () => send('insert', 'embed') },
        { label: 'Map', click: () => send('insert', 'map') },
        { label: 'Contact Form', click: () => send('insert', 'form') },
        { label: 'HTML Snippet', click: () => send('insert', 'html') },
        { type: 'separator' },
        { label: 'Navigation Menu', click: () => send('insert', 'navbar') },
        { label: 'Blog Feed', click: () => send('insert', 'blogfeed') },
      ],
    },
    {
      label: '&Arrange',
      submenu: [
        { label: 'Bring to Front', accelerator: 'CmdOrCtrl+Shift+]', click: () => send('arrange', 'front') },
        { label: 'Bring Forward', accelerator: 'CmdOrCtrl+]', click: () => send('arrange', 'forward') },
        { label: 'Send Backward', accelerator: 'CmdOrCtrl+[', click: () => send('arrange', 'backward') },
        { label: 'Send to Back', accelerator: 'CmdOrCtrl+Shift+[', click: () => send('arrange', 'back') },
        { type: 'separator' },
        {
          label: 'Align',
          submenu: [
            { label: 'Left', click: () => send('align', 'left') },
            { label: 'Center', click: () => send('align', 'hcenter') },
            { label: 'Right', click: () => send('align', 'right') },
            { type: 'separator' },
            { label: 'Top', click: () => send('align', 'top') },
            { label: 'Middle', click: () => send('align', 'vcenter') },
            { label: 'Bottom', click: () => send('align', 'bottom') },
          ],
        },
        {
          label: 'Distribute',
          submenu: [
            { label: 'Horizontally', click: () => send('distribute', 'h') },
            { label: 'Vertically', click: () => send('distribute', 'v') },
          ],
        },
        { label: 'Center on Page', click: () => send('align', 'page-center') },
        { type: 'separator' },
        { label: 'Lock', accelerator: 'CmdOrCtrl+L', click: () => send('lock', true) },
        { label: 'Unlock', accelerator: 'CmdOrCtrl+Shift+L', click: () => send('lock', false) },
      ],
    },
    {
      label: '&View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => send('zoom', 'in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => send('zoom', 'out') },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: () => send('zoom', 'reset') },
        { label: 'Fit Page Width', accelerator: 'CmdOrCtrl+9', click: () => send('zoom', 'fit') },
        { type: 'separator' },
        { label: 'Show/Hide Inspector', accelerator: 'CmdOrCtrl+Alt+I', click: () => send('toggle', 'inspector') },
        { label: 'Show/Hide Media Browser', accelerator: 'CmdOrCtrl+Alt+M', click: () => send('toggle', 'media') },
        { label: 'Show/Hide Layout Guides', accelerator: 'CmdOrCtrl+Alt+G', click: () => send('toggle', 'guides') },
        { label: 'Change Theme…', click: () => send('theme') },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { label: 'Developer Tools', accelerator: 'CmdOrCtrl+Shift+Alt+J', click: () => mainWindow && mainWindow.webContents.toggleDevTools() },
      ],
    },
    {
      label: '&Help',
      submenu: [
        { label: 'Keyboard Shortcuts', click: () => send('shortcuts') },
        { label: 'About Site Knitter', click: () => send('about') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------------------------------------------------------------------------
// Project files (.wspin = zip with project.json + assets/*)
// ---------------------------------------------------------------------------
function readProjectZip(file) {
  const zip = new AdmZip(file);
  const entry = zip.getEntry('project.json');
  if (!entry) throw new Error('This file is not a Site Knitter site (project.json missing).');
  const project = JSON.parse(entry.getData().toString('utf8'));
  const blobs = {};
  for (const id of Object.keys(project.assets || {})) {
    const a = zip.getEntry('assets/' + id);
    if (a) blobs[id] = a.getData();
  }
  return { project, blobs };
}

function openProjectPath(file) {
  try {
    const data = readProjectZip(file);
    addRecent(file);
    mainWindow.webContents.send('project:loaded', { path: file, ...data });
  } catch (e) {
    dialog.showErrorBox('Could not open site', String(e.message || e));
  }
}

ipcMain.handle('project:open-dialog', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Site',
    filters: [{ name: 'Site Knitter Site', extensions: [PROJECT_EXT] }],
    properties: ['openFile'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const file = r.filePaths[0];
  const data = readProjectZip(file);
  addRecent(file);
  return { path: file, ...data };
});

ipcMain.handle('project:open-path', async (_e, file) => {
  const data = readProjectZip(file);
  addRecent(file);
  return { path: file, ...data };
});

ipcMain.handle('project:save', async (_e, { path: target, project, blobs, saveAs, suggestedName }) => {
  let file = target;
  if (!file || saveAs) {
    const r = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Site',
      defaultPath: path.join(app.getPath('documents'), (suggestedName || 'My Site') + '.' + PROJECT_EXT),
      filters: [{ name: 'Site Knitter Site', extensions: [PROJECT_EXT] }],
    });
    if (r.canceled || !r.filePath) return null;
    file = r.filePath;
    if (!file.endsWith('.' + PROJECT_EXT)) file += '.' + PROJECT_EXT;
  }
  const zip = new AdmZip();
  zip.addFile('project.json', Buffer.from(JSON.stringify(project), 'utf8'));
  for (const [id, data] of Object.entries(blobs || {})) {
    zip.addFile('assets/' + id, Buffer.from(data));
  }
  const tmp = file + '.tmp';
  zip.writeZip(tmp);
  fs.renameSync(tmp, file);
  addRecent(file);
  return file;
});

ipcMain.handle('settings:recent', () => (readSettings().recent || []).filter(f => fs.existsSync(f)));

// ---------------------------------------------------------------------------
// Media import
// ---------------------------------------------------------------------------
const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime', m4v: 'video/mp4',
  mp3: 'audio/mpeg', ogg: 'audio/ogg', oga: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', flac: 'audio/flac',
  pdf: 'application/pdf', ico: 'image/x-icon',
};
ipcMain.handle('media:import-dialog', async (_e, kind) => {
  const filters = {
    image: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'] }],
    video: [{ name: 'Video', extensions: ['mp4', 'webm', 'ogv', 'mov', 'm4v'] }],
    audio: [{ name: 'Audio', extensions: ['mp3', 'ogg', 'oga', 'wav', 'm4a', 'flac'] }],
    any: [{ name: 'Media', extensions: Object.keys(MIME) }],
  }[kind || 'any'];
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose ' + (kind === 'any' || !kind ? 'Media' : kind[0].toUpperCase() + kind.slice(1)),
    filters,
    properties: ['openFile', 'multiSelections'],
  });
  if (r.canceled) return [];
  return r.filePaths.map(f => {
    const ext = path.extname(f).slice(1).toLowerCase();
    return { name: path.basename(f), mime: MIME[ext] || 'application/octet-stream', data: fs.readFileSync(f) };
  });
});

// ---------------------------------------------------------------------------
// Fonts (read woff2 files from @fontsource packages for export)
// ---------------------------------------------------------------------------
ipcMain.handle('fonts:read', (_e, pkg, file) => {
  if (!/^[a-z0-9-]+$/.test(pkg) || !/^[a-z0-9-]+\.woff2$/.test(file)) throw new Error('bad font path');
  return fs.readFileSync(path.join(__dirname, 'node_modules', '@fontsource', pkg, 'files', file));
});

// ---------------------------------------------------------------------------
// Export / preview / publish
// ---------------------------------------------------------------------------
function safeJoin(root, rel) {
  const p = path.resolve(root, rel);
  if (!p.startsWith(path.resolve(root) + path.sep) && p !== path.resolve(root)) throw new Error('Unsafe path: ' + rel);
  return p;
}
function writeSiteFiles(dir, files) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of files) {
    const target = safeJoin(dir, f.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof f.data === 'string' ? f.data : Buffer.from(f.data));
  }
}

ipcMain.handle('site:export-folder', async (_e, { files, siteName }) => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a folder to export “' + siteName + '” into',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Export Here',
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const dir = path.join(r.filePaths[0], slug(siteName) || 'site');
  writeSiteFiles(dir, files);
  shell.openPath(dir);
  return dir;
});

ipcMain.handle('site:export-zip', async (_e, { files, siteName }) => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Site as ZIP',
    defaultPath: path.join(app.getPath('documents'), (slug(siteName) || 'site') + '.zip'),
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
  });
  if (r.canceled || !r.filePath) return null;
  const zip = new AdmZip();
  for (const f of files) zip.addFile(f.path, typeof f.data === 'string' ? Buffer.from(f.data, 'utf8') : Buffer.from(f.data));
  zip.writeZip(r.filePath);
  shell.showItemInFolder(r.filePath);
  return r.filePath;
});

let previewDir = null;
// ---------------------------------------------------------------------------
// Preview: Site Knitter's own little browser. The site runs in a view under a toolbar (back, forward,
// reload, the page list, Desktop / Tablet / Phone widths, Open in Nave). Links to other websites open in Nave.
// ---------------------------------------------------------------------------
let pw = null, pv = null, pvPages = [], pvDevice = 'desktop';
const BAR = 46;
const WIDTHS = { desktop: 0, tablet: 820, phone: 390 };

function pvLayout() {
  if (!pw || !pv) return;
  const [w, h] = pw.getContentSize();
  const dw = WIDTHS[pvDevice] && WIDTHS[pvDevice] < w - 40 ? WIDTHS[pvDevice] : w;
  const pad = dw === w ? 0 : 16;
  pv.setBounds({ x: Math.round((w - dw) / 2), y: BAR + pad, width: dw, height: Math.max(100, h - BAR - pad * 2) });
}

function pvState() {
  if (!pw || pw.isDestroyed() || !pv) return;
  const wc = pv.webContents, url = wc.getURL();
  let page = '';
  if (previewDir && url.startsWith('file://')) { try { page = path.relative(previewDir, decodeURIComponent(new URL(url).pathname)); } catch {} }
  const nav = wc.navigationHistory;
  pw.webContents.send('pv:state', { page, url, title: wc.getTitle(), canBack: nav ? nav.canGoBack() : wc.canGoBack(),
    canForward: nav ? nav.canGoForward() : wc.canGoForward(), device: pvDevice, pages: pvPages, loading: wc.isLoading() });
}

function openPreview(target) {
  if (!pw || pw.isDestroyed()) {
    pw = new BrowserWindow({ width: 1180, height: 820, minWidth: 480, minHeight: 360, title: 'Preview — ' + APP_NAME, backgroundColor: '#d9dde2',
      parent: undefined, webPreferences: { preload: path.join(__dirname, 'preview-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    pw.loadFile(path.join(__dirname, 'src', 'preview.html'));
    pv = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
    pw.contentView.addChildView(pv);
    const wc = pv.webContents;
    // the site's own pages stay here; the rest of the web opens in Nave
    wc.setWindowOpenHandler(({ url }) => { if (/^https?:|^mailto:|^tel:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    wc.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); } });
    for (const ev of ['did-navigate', 'did-navigate-in-page', 'page-title-updated', 'did-start-loading', 'did-stop-loading']) wc.on(ev, pvState);
    pw.on('resize', pvLayout);
    pw.webContents.on('did-finish-load', () => { pvLayout(); pvState(); });
    pw.on('closed', () => { pw = null; pv = null; });
    pvLayout();
  } else {
    pw.show(); pw.focus();
  }
  pv.webContents.loadFile(target).catch(() => {});
}

ipcMain.handle('site:preview', async (_e, { files, startPage }) => {
  if (previewDir) { try { fs.rmSync(previewDir, { recursive: true, force: true }); } catch {} }
  previewDir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-knitter-preview-'));
  writeSiteFiles(previewDir, files);
  pvPages = files.map((f) => f.path).filter((p) => /\.html?$/i.test(p)).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
  openPreview(safeJoin(previewDir, startPage || 'index.html'));
  return previewDir;
});

ipcMain.on('pv:cmd', (_e, cmd, arg) => {
  if (!pv) return;
  const wc = pv.webContents, nav = wc.navigationHistory;
  if (cmd === 'back') nav ? nav.goBack() : wc.goBack();
  else if (cmd === 'forward') nav ? nav.goForward() : wc.goForward();
  else if (cmd === 'reload') wc.reload();
  else if (cmd === 'page' && previewDir) wc.loadFile(safeJoin(previewDir, arg)).catch(() => {});
  else if (cmd === 'device' && WIDTHS[arg] != null) { pvDevice = arg; pvLayout(); pvState(); }
  else if (cmd === 'external') { const u = wc.getURL(); if (u) shell.openExternal(u); }
});

ipcMain.handle('publish:get-password', (_e, key) => {
  const enc = (readSettings().credentials || {})[key];
  if (!enc) return '';
  try {
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(Buffer.from(enc, 'base64'))
      : '';
  } catch { return ''; }
});

ipcMain.handle('publish:ftp', async (e, { files, settings, remember }) => {
  const ftp = require('basic-ftp');
  const client = new ftp.Client(30000);
  const key = `${settings.user}@${settings.host}`;
  const progress = (msg, pct) => e.sender.send('publish:progress', { msg, pct });
  try {
    progress('Connecting to ' + settings.host + '…', 0);
    await client.access({
      host: settings.host,
      port: Number(settings.port) || 21,
      user: settings.user,
      password: settings.password,
      secure: settings.protocol === 'ftps' ? true : false,
      secureOptions: settings.protocol === 'ftps' ? { rejectUnauthorized: !settings.allowSelfSigned } : undefined,
    });
    const root = (settings.remotePath || '/').replace(/\/+$/, '') || '/';
    let i = 0;
    for (const f of files) {
      const remote = root.replace(/\/$/, '') + '/' + f.path;
      const remoteDir = remote.slice(0, remote.lastIndexOf('/')) || '/';
      await client.ensureDir(remoteDir);
      const { Readable } = require('stream');
      const buf = typeof f.data === 'string' ? Buffer.from(f.data, 'utf8') : Buffer.from(f.data);
      await client.uploadFrom(Readable.from(buf), path.posix.basename(remote));
      i++;
      progress('Uploaded ' + f.path, Math.round((i / files.length) * 100));
    }
    progress('Done', 100);
    if (remember && settings.password && safeStorage.isEncryptionAvailable()) {
      const s = readSettings();
      s.credentials = s.credentials || {};
      s.credentials[key] = safeStorage.encryptString(settings.password).toString('base64');
      writeSettings(s);
    }
    return { ok: true, count: files.length };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  } finally {
    client.close();
  }
});

ipcMain.handle('shell:open-external', (_e, url) => {
  if (/^(https?|mailto):/i.test(url)) return shell.openExternal(url);
});

// ---------------------------------------------------------------------------
// Dialogs & lifecycle
// ---------------------------------------------------------------------------
ipcMain.handle('dialog:confirm-unsaved', async () => {
  const r = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Save', 'Don’t Save', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    message: 'Do you want to save the changes you made to this site?',
    detail: 'Your changes will be lost if you don’t save them.',
  });
  return ['save', 'discard', 'cancel'][r.response];
});

ipcMain.handle('dialog:error', (_e, title, msg) => dialog.showErrorBox(title, msg));

ipcMain.on('app:close-confirmed', () => {
  forceClose = true;
  if (mainWindow) mainWindow.close();
});

ipcMain.on('edit:native', (e, cmd) => {
  const wc = e.sender;
  if (['cut', 'copy', 'paste', 'selectAll', 'undo', 'redo', 'delete'].includes(cmd)) wc[cmd]();
});

ipcMain.on('app:set-title', (_e, title) => { if (mainWindow) mainWindow.setTitle(title); });

function slug(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Single instance; open .wspin passed on command line
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const f = argv.find(a => a.endsWith('.' + PROJECT_EXT));
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (f) openProjectPath(f);
    }
  });

  app.whenReady().then(() => {
    const argFile = process.argv.find(a => a.endsWith('.' + PROJECT_EXT) && fs.existsSync(a));
    if (argFile) pendingOpenPath = path.resolve(argFile);
    buildMenu();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { app.quit(); });
}


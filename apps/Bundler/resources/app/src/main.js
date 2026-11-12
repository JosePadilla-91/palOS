'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const engine = require('./engine');

app.setName('Bundler');
if (!app.requestSingleInstanceLock()) { app.quit(); }

const DESKTOP_ID = 'io.github.Bundler.desktop';
const DEFAULTS = { revealWhenDone: true, collapseSameName: true, format: 'zip', defaultAsked: false };

let win = null;
let settings = { ...DEFAULTS };
let quitWhenDone = false;
let nextId = 1;
const jobs = new Map();
const queue = [];
let running = null;

/* ---------- settings ---------- */
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
function loadSettings() {
  try { settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch { settings = { ...DEFAULTS }; }
}
function saveSettings() {
  try { fs.mkdirSync(path.dirname(settingsFile()), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)); } catch { /* hindi critical */ }
}

/* ---------- jobs ---------- */
const pub = (j) => ({ id: j.id, kind: j.kind, name: j.name, state: j.state, ratio: j.ratio, detail: j.detail, resultPath: j.resultPath, error: j.error, note: j.note });
function push(j) { if (win && !win.isDestroyed()) win.webContents.send('job', pub(j)); }

function addJob(kind, paths) {
  const first = paths[0];
  const name = kind === 'extract' ? path.basename(first) : (paths.length === 1 ? path.basename(first) : `${paths.length} items`);
  const j = { id: nextId++, kind, paths, name, state: 'queued', ratio: 0, detail: '', resultPath: null, error: null, note: null, ac: null };
  jobs.set(j.id, j); queue.push(j); push(j);
  pump();
}

function submit(paths, mode = 'auto') {
  paths = paths.filter((p) => p && fs.existsSync(p));
  if (!paths.length) return;
  const allArchives = paths.every((p) => engine.archiveKind(p));
  if (mode === 'unpack' || (mode === 'auto' && allArchives)) {
    for (const p of paths) {
      if (engine.archiveKind(p)) addJob('extract', [p]);
      else {
        const j = { id: nextId++, kind: 'extract', paths: [p], name: path.basename(p), state: 'error', ratio: 0, detail: '', error: 'Bundler cannot open this kind of file.', resultPath: null, note: null };
        jobs.set(j.id, j); push(j);
      }
    }
  } else {
    addJob('compress', paths);
  }
}

async function pump() {
  if (running) return;
  const j = queue.shift();
  if (!j) { finishedAll(); return; }
  running = j; j.state = 'running'; j.ac = new AbortController(); push(j);
  const onProgress = (p) => { j.ratio = p.ratio; j.detail = p.file || ''; push(j); };
  try {
    const r = j.kind === 'extract'
      ? await engine.extract(j.paths[0], { onProgress, signal: j.ac.signal, collapseSameName: settings.collapseSameName })
      : await engine.compress(j.paths, { onProgress, signal: j.ac.signal, format: settings.format });
    j.state = 'done'; j.ratio = 1; j.resultPath = r.path; j.detail = '';
    if (r.skipped) j.note = `${r.skipped} unsafe link${r.skipped > 1 ? 's were' : ' was'} skipped.`;
    if (settings.revealWhenDone) {
      if (j.kind === 'extract') shell.openPath(r.path); else shell.showItemInFolder(r.path);
    }
  } catch (e) {
    if (e.code === 'CANCELLED') j.state = 'cancelled';
    else { j.state = 'error'; j.error = e.message || String(e); }
  }
  push(j); running = null; pump();
}

function finishedAll() {
  if (!win) { app.quit(); return; }
  const anyProblem = [...jobs.values()].some((j) => j.state === 'error');
  if (quitWhenDone && !anyProblem) setTimeout(() => { if (!running && !queue.length) app.quit(); }, 1200);
}

/* ---------- argv ---------- */
function parseArgs(argv, cwd) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const files = argv.filter((a) => !a.startsWith('-')).map((a) => path.resolve(cwd, a)).filter((p) => fs.existsSync(p) && p !== app.getAppPath());
  return { files, mode: flags.has('--bundle') ? 'bundle' : flags.has('--unpack') ? 'unpack' : 'auto' };
}

/* ---------- window + menu ---------- */
function createWindow() {
  win = new BrowserWindow({
    width: 520, height: 600, minWidth: 440, minHeight: 460,
    show: false, title: 'Bundler',
    icon: path.join(__dirname, '..', 'icons', 'bundler-256.png'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e2225' : '#eceef0',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
}

/* ---------- .pack: a .app ready to hand out (palos-pack does the work) ---------- */
async function makePack(appPath) {
  const fr = /^fr/i.test(process.env.LANGUAGE || process.env.LC_ALL || process.env.LANG || '');
  const T = (en, f) => (fr ? f : en);
  if (!appPath) {
    const r = await dialog.showOpenDialog(win, { title: T('Make a .pack', 'Créer un .pack'), defaultPath: '/Applications', properties: ['openFile'], filters: [{ name: T('Apps', 'Apps'), extensions: ['app'] }] });
    if (r.canceled || !r.filePaths[0]) return;
    appPath = r.filePaths[0];
  }
  const name = path.basename(appPath, '.app');
  const look = await dialog.showMessageBox(win, { type: 'question', message: T(`Background for ${name}.pack`, `Arrière-plan de ${name}.pack`),
    detail: T('The window people see when they open the .pack: the app, an arrow and the Applications folder, on a background.', 'La fenêtre qu’on voit en ouvrant le .pack : l’app, une flèche et le dossier Applications, sur un arrière-plan.'),
    buttons: [T('Standard Background', 'Arrière-plan standard'), T('Choose Picture…', 'Choisir une image…'), T('Cancel', 'Annuler')], defaultId: 0, cancelId: 2 });
  if (look.response === 2) return;
  const args = ['create', appPath];
  if (look.response === 1) {
    const r = await dialog.showOpenDialog(win, { title: T('Background Picture (600 × 500)', 'Image d’arrière-plan (600 × 500)'), properties: ['openFile'], filters: [{ name: T('Pictures', 'Images'), extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }] });
    if (r.canceled || !r.filePaths[0]) return;
    args.push('--background', r.filePaths[0]);
  }
  const out = await dialog.showSaveDialog(win, { title: T('Save the .pack', 'Enregistrer le .pack'), defaultPath: path.join(app.getPath('documents'), name + '.pack'), filters: [{ name: '.pack', extensions: ['pack'] }] });
  if (out.canceled || !out.filePath) return;
  args.push('-o', out.filePath.endsWith('.pack') ? out.filePath : out.filePath + '.pack');
  if (win) win.setProgressBar(2);
  execFile('/usr/bin/palos-pack', args, { timeout: 30 * 60000 }, async (err, stdout, stderr) => {
    if (win) win.setProgressBar(-1);
    if (err) return dialog.showMessageBox(win, { type: 'error', message: T('The .pack couldn’t be made.', 'Le .pack n’a pas pu être créé.'), detail: String(stderr || err.message).trim() });
    const done = String(stdout).trim();
    const r = await dialog.showMessageBox(win, { type: 'info', message: T(`${path.basename(done)} is ready.`, `${path.basename(done)} est prêt.`), buttons: [T('Show in Seeker', 'Afficher dans Seeker'), 'OK'], defaultId: 1 });
    if (r.response === 0) shell.showItemInFolder(done);
  });
}

async function pick(mode) {
  if (mode === 'pack') return makePack();
  const unpack = mode === 'unpack';
  const r = await dialog.showOpenDialog(win, unpack
    ? { title: 'Unpack', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Archives', extensions: ['zip', 'tar', 'gz', 'tgz', 'xz', 'txz', 'bz2', 'tbz2'] }, { name: 'All files', extensions: ['*'] }] }
    : { title: 'Bundle', properties: ['openFile', 'openDirectory', 'multiSelections'] });
  if (!r.canceled) { quitWhenDone = false; submit(r.filePaths, mode); }
}

function makeDefault() {
  settings.defaultAsked = true; saveSettings();
  return new Promise((resolve) => {
    execFile('xdg-mime', ['default', DESKTOP_ID, 'application/zip'], (err) => resolve(!err));
  });
}

function buildMenu() {
  const send = (ch) => win && win.webContents.send(ch);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'Unpack…', accelerator: 'CmdOrCtrl+O', click: () => pick('unpack') },
      { label: 'Bundle…', accelerator: 'CmdOrCtrl+B', click: () => pick('bundle') },
      { label: 'Make .pack from App…', accelerator: 'CmdOrCtrl+Shift+P', click: () => makePack() },
      { type: 'separator' },
      { label: 'Make Bundler the Default for ZIP Files', click: () => makeDefault().then((ok) => send(ok ? 'default-set' : 'default-failed')) },
      { type: 'separator' },
      { label: 'Close Window', accelerator: 'CmdOrCtrl+W', role: 'close' },
      { label: 'Quit Bundler', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
    ] },
    { label: 'Edit', submenu: [{ role: 'copy' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    { label: 'Help', submenu: [{ label: 'About Bundler', click: () => dialog.showMessageBox(win, { type: 'info', title: 'About Bundler', message: 'Bundler 1.0.0', detail: 'Archiver and unarchiver for palOS.\nUnpacks Project.zip into a folder called Project.' }) }] },
  ]));
}

/* ---------- ipc ---------- */
ipcMain.handle('state', () => ({ jobs: [...jobs.values()].map(pub), settings }));
ipcMain.handle('submit', (_e, paths, mode) => {
  quitWhenDone = false;
  // a .app dropped on Bundler becomes a .pack
  const apps = (paths || []).filter((p) => /\.app$/.test(p) && fs.statSync(p).isFile());
  if (mode !== 'unpack' && apps.length && apps.length === paths.length) { apps.reduce((p, a) => p.then(() => makePack(a)), Promise.resolve()); return; }
  submit(paths, mode);
});
ipcMain.handle('pick', (_e, mode) => pick(mode));
ipcMain.handle('cancel', (_e, id) => {
  const j = jobs.get(id); if (!j) return;
  if (j.state === 'running') j.ac.abort();
  else if (j.state === 'queued') { queue.splice(queue.indexOf(j), 1); j.state = 'cancelled'; push(j); }
});
ipcMain.handle('reveal', (_e, p) => { if (p && fs.existsSync(p)) { fs.statSync(p).isDirectory() ? shell.openPath(p) : shell.showItemInFolder(p); } });
ipcMain.handle('setting', (_e, k, v) => { if (k in DEFAULTS) { settings[k] = v; saveSettings(); } });
ipcMain.handle('make-default', () => makeDefault());
ipcMain.handle('clear-finished', () => {
  for (const [id, j] of jobs) if (['done', 'error', 'cancelled'].includes(j.state)) jobs.delete(id);
});

/* ---------- lifecycle ---------- */
app.on('second-instance', (_e, argv, cwd) => {
  const { files, mode } = parseArgs(argv.slice(1), cwd);
  if (!win) createWindow();
  if (win.isMinimized()) win.restore();
  win.focus();
  if (files.length) submit(files, mode);
});

app.whenReady().then(() => {
  loadSettings(); buildMenu();
  const { files, mode } = parseArgs(process.argv.slice(1), process.cwd());
  quitWhenDone = files.length > 0;
  createWindow();
  if (files.length) win.webContents.once('did-finish-load', () => submit(files, mode));
});

app.on('window-all-closed', () => { if (!running) app.quit(); });

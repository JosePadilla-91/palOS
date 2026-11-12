/* palOS sheets: Save, Open and message panels come out of the window */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
const { app, BrowserWindow, Menu, dialog, ipcMain, shell, nativeTheme, clipboard, ClipboardItem } = require('electron');
const path = require('path');
const fs = require('fs');
const { fileURLToPath } = require('url');
const formats = require('./formats');
const { buildMenu } = require('./menu');

app.setName('Chancery Sheets');

const OPEN_FILTERS = [
  { name: 'All Spreadsheets', extensions: ['spst', 'xlsx', 'xlsm', 'xls', 'ods', 'csv', 'tsv', 'txt'] },
  { name: 'Chancery Sheets Spreadsheet', extensions: ['spst'] },
  { name: 'Excel Workbook', extensions: ['xlsx', 'xlsm', 'xls'] },
  { name: 'OpenDocument Spreadsheet', extensions: ['ods'] },
  { name: 'Text (CSV/TSV)', extensions: ['csv', 'tsv', 'txt'] },
  { name: 'All Files', extensions: ['*'] },
];
const SAVE_FILTERS = [
  { name: 'Chancery Sheets Spreadsheet (.spst)', extensions: ['spst'] },
  { name: 'Excel Workbook (.xlsx)', extensions: ['xlsx'] },
  { name: 'Excel Macro-Enabled Workbook (.xlsm)', extensions: ['xlsm'] },
  { name: 'Excel 97-2003 Workbook (.xls)', extensions: ['xls'] },
  { name: 'OpenDocument Spreadsheet (.ods)', extensions: ['ods'] },
  { name: 'CSV, comma-separated (.csv)', extensions: ['csv'] },
  { name: 'TSV, tab-separated (.tsv)', extensions: ['tsv'] },
];
const SAVABLE = new Set(['spst', 'xlsx', 'xlsm', 'xls', 'ods', 'csv', 'tsv']);

/** Per-window state: { filePath, dirty, pending: {doc, filePath, warnings} | null, closing } */
const windows = new Map();

/* ------------------------------------------------------------ recent files */

const recentFile = () => path.join(app.getPath('userData'), 'recent.json');
let recent = [];
function loadRecent() {
  try { recent = JSON.parse(fs.readFileSync(recentFile(), 'utf8')).filter((p) => typeof p === 'string'); } catch { recent = []; }
}
function addRecent(p) {
  recent = [p, ...recent.filter((x) => x !== p)].slice(0, 10);
  try { fs.mkdirSync(path.dirname(recentFile()), { recursive: true }); fs.writeFileSync(recentFile(), JSON.stringify(recent)); } catch {}
  app.addRecentDocument(p);
  refreshMenu();
}
function clearRecent() {
  recent = [];
  try { fs.writeFileSync(recentFile(), '[]'); } catch {}
  app.clearRecentDocuments();
  refreshMenu();
}

function refreshMenu() {
  Menu.setApplicationMenu(buildMenu({
    recent,
    send: (cmd, arg) => {
      const win = BrowserWindow.getFocusedWindow() || [...windows.keys()][0];
      if (win) win.webContents.send('menu', cmd, arg);
    },
    newWindow: () => createWindow(),
    openPath: (p) => openPathInBestWindow(p),
    clearRecent,
    toggleDevTools: () => { const w = BrowserWindow.getFocusedWindow(); if (w) w.webContents.toggleDevTools(); },
    about: showAbout,
  }));
}

/* ----------------------------------------------------------------- windows */

function createWindow(pending = null) {
  const focused = BrowserWindow.getFocusedWindow();
  const bounds = focused ? focused.getBounds() : null;
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    x: bounds ? bounds.x + 30 : undefined,
    y: bounds ? bounds.y + 30 : undefined,
    minWidth: 640,
    minHeight: 420,
    title: 'Chancery Sheets',
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1f2124' : '#ffffff',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      offscreen: !!THUMB,
    },
  });
  windows.set(win, { filePath: pending ? pending.filePath : null, dirty: false, pending, closing: false });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => { if (!THUMB) win.show(); });

  // Never navigate away from the app or open new Electron windows from content.
  win.webContents.on('will-navigate', (e, url) => { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });

  win.on('close', (e) => {
    const st = windows.get(win);
    if (!st || st.closing || !st.dirty) return;
    e.preventDefault();
    const name = st.filePath ? path.basename(st.filePath) : 'Untitled';
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Unsaved changes',
      message: `Do you want to save the changes you made to "${name}"?`,
      detail: "Your changes will be lost if you don't save them.",
    });
    if (choice === 0) win.webContents.send('menu', 'save-and-close');
    else if (choice === 1) { st.closing = true; win.close(); }
  });
  win.on('closed', () => windows.delete(win));
  return win;
}

async function loadPath(filePath) {
  const buf = await fs.promises.readFile(filePath);
  const { doc, warnings } = await formats.readFile(buf, filePath);
  const ext = formats.extOf(filePath);
  // Lossy formats open as "imported": saving goes back to the same path only for formats we can write.
  return { doc, filePath: SAVABLE.has(ext) ? filePath : null, sourcePath: filePath, warnings };
}

async function openPathInBestWindow(filePath, targetWin) {
  // Focus a window that already has this file open.
  for (const [w, st] of windows) {
    if (st.filePath && path.resolve(st.filePath) === path.resolve(filePath)) { w.focus(); return; }
  }
  let loaded;
  try {
    loaded = await loadPath(filePath);
  } catch (err) {
    dialog.showErrorBox('Could not open file', `${path.basename(filePath)}\n\n${err.message}`);
    return;
  }
  addRecent(filePath);
  const reuse = targetWin && windows.get(targetWin) && !windows.get(targetWin).dirty && windows.get(targetWin).pristine;
  if (reuse) {
    windows.get(targetWin).filePath = loaded.filePath;
    targetWin.webContents.send('doc:load', loaded);
    targetWin.focus();
  } else {
    // A pristine (untouched, untitled) focused window is reused instead of opening a new one.
    for (const [w, st] of windows) {
      if (st.pristine && !st.dirty) {
        st.filePath = loaded.filePath;
        w.webContents.send('doc:load', loaded);
        w.focus();
        return;
      }
    }
    createWindow(loaded);
  }
}

function showAbout() {
  const win = BrowserWindow.getFocusedWindow();
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'About Chancery Sheets',
    message: `Chancery Sheets ${app.getVersion()}`,
    detail:
      'The spreadsheet application of the Chancery office suite.\n\n' +
      'Formula engine: HyperFormula (GPLv3)\nFile formats: ExcelJS, SheetJS Community Edition\nCharts: Chart.js\n' +
      `Electron ${process.versions.electron} · Chromium ${process.versions.chrome} · Node ${process.versions.node}`,
  });
}

/* --------------------------------------------------------------------- IPC */

const winOf = (e) => BrowserWindow.fromWebContents(e.sender);

ipcMain.handle('doc:initial', (e) => {
  const st = windows.get(winOf(e));
  if (!st || !st.pending) return null;
  const p = st.pending;
  st.pending = null;
  return p;
});

ipcMain.on('doc:state', (e, { dirty, filePath, pristine, title }) => {
  const win = winOf(e);
  const st = windows.get(win);
  if (!st) return;
  st.dirty = !!dirty;
  st.pristine = !!pristine;
  if (filePath !== undefined) st.filePath = filePath;
  win.setTitle(title || 'Chancery Sheets');
  win.setDocumentEdited && win.setDocumentEdited(!!dirty);
});

ipcMain.handle('file:open-dialog', async (e) => {
  const win = winOf(e);
  const st = windows.get(win);
  const res = await dialog.showOpenDialog(win, {
    title: 'Open Spreadsheet',
    defaultPath: st && st.filePath ? path.dirname(st.filePath) : app.getPath('documents'),
    filters: OPEN_FILTERS,
    properties: ['openFile', 'multiSelections'],
  });
  if (res.canceled) return;
  for (const p of res.filePaths) await openPathInBestWindow(p, win);
});

ipcMain.handle('file:open-path', (e, p) => openPathInBestWindow(p, winOf(e)));

/**
 * Save the document. Returns { filePath } on success or null if cancelled.
 * opts: { saveAs, filePath, suggestedName, exportOnly }
 */
ipcMain.handle('file:save', async (e, doc, opts = {}) => {
  const win = winOf(e);
  let target = !opts.saveAs && opts.filePath ? opts.filePath : null;
  if (!target) {
    const base = opts.suggestedName || 'Untitled';
    const res = await dialog.showSaveDialog(win, {
      title: opts.exportOnly ? 'Export' : 'Save As',
      defaultPath: path.join(opts.filePath ? path.dirname(opts.filePath) : app.getPath('documents'), base + (opts.defaultExt ? '.' + opts.defaultExt : '.spst')),
      filters: opts.defaultExt ? [SAVE_FILTERS.find((f) => f.extensions[0] === opts.defaultExt), ...SAVE_FILTERS.filter((f) => f.extensions[0] !== opts.defaultExt)] : SAVE_FILTERS,
      properties: ['showOverwriteConfirmation', 'createDirectory'],
    });
    if (res.canceled || !res.filePath) return null;
    target = res.filePath;
    if (!path.extname(target)) target += '.spst';
  }
  const ext = formats.extOf(target);
  if (!SAVABLE.has(ext)) {
    dialog.showErrorBox('Unsupported format', `Chancery Sheets cannot save ".${ext}" files. Choose .spst, .xlsx, .xlsm, .xls, .ods, .csv or .tsv.`);
    return null;
  }
  const losses = formats.lossWarnings(doc, target);
  if (losses.length && !opts.skipLossWarning) {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: [`Save as .${ext}`, 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      title: 'Some content will not be saved',
      message: `The ${formats.FORMATS[ext].label} format can't keep everything in this workbook.`,
      detail: `These will be lost or changed:\n• ${losses.join('\n• ')}\n\nSave as .spst to keep everything.`,
    });
    if (choice !== 0) return null;
  }
  try {
    const buf = await formats.writeFile(doc, target);
    const tmp = target + '.sheets-tmp';
    await fs.promises.writeFile(tmp, buf);
    await fs.promises.rename(tmp, target); // atomic replace so a crash never leaves a half-written file
  } catch (err) {
    dialog.showErrorBox('Could not save file', `${path.basename(target)}\n\n${err.message}`);
    return null;
  }
  addRecent(target);
  const st = windows.get(win);
  if (st && !opts.exportOnly) st.filePath = target;
  return { filePath: target, lossy: losses.length > 0 };
});

ipcMain.on('window:close-now', (e) => {
  const win = winOf(e);
  const st = windows.get(win);
  if (st) st.closing = true;
  win.close();
});

ipcMain.handle('print:sheet', async (e, html, mode) => {
  const parent = winOf(e);
  const pw = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, javascript: false } });
  try {
    await pw.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    if (mode === 'pdf') {
      const st = windows.get(parent);
      const base = st && st.filePath ? path.basename(st.filePath, path.extname(st.filePath)) : 'Untitled';
      const res = await dialog.showSaveDialog(parent, {
        title: 'Export as PDF',
        defaultPath: path.join(st && st.filePath ? path.dirname(st.filePath) : app.getPath('documents'), base + '.pdf'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (res.canceled || !res.filePath) return null;
      const pdf = await pw.webContents.printToPDF({ printBackground: true, landscape: false, pageSize: 'A4', margins: { marginType: 'default' } });
      await fs.promises.writeFile(res.filePath, pdf);
      shell.openPath(res.filePath);
      return res.filePath;
    }
    await new Promise((resolve) => pw.webContents.print({ printBackground: true }, () => resolve()));
    return true;
  } finally {
    pw.destroy();
  }
});

ipcMain.handle('dialog:confirm', (e, { message, detail, buttons }) =>
  dialog.showMessageBoxSync(winOf(e), { type: 'question', message, detail, buttons: buttons || ['OK', 'Cancel'], defaultId: 0, cancelId: (buttons || [0, 1]).length - 1 })
);

// Electron 44 uses an async, W3C-style clipboard API; older versions had sync readHTML/write({text, html}).
ipcMain.handle('clipboard:read', async () => {
  let text = '', html = '';
  try {
    if (typeof clipboard.readHTML === 'function') {
      text = clipboard.readText();
      html = clipboard.readHTML();
    } else {
      for (const item of await clipboard.read()) {
        if (!text && item.types.includes('text/plain')) text = await (await item.getType('text/plain')).text();
        if (!html && item.types.includes('text/html')) html = await (await item.getType('text/html')).text();
      }
      if (!text) text = await clipboard.readText();
    }
  } catch (err) {
    console.error('clipboard read failed', err);
  }
  return { text: String(text || ''), html: String(html || '') };
});
ipcMain.handle('clipboard:write', async (e, { text, html }) => {
  try {
    if (typeof clipboard.readHTML === 'function') {
      clipboard.write({ text: text || '', html: html || undefined });
    } else {
      const data = { 'text/plain': text || '' };
      if (html) data['text/html'] = html;
      await clipboard.write([new ClipboardItem(data)]);
    }
  } catch (err) {
    console.error('clipboard write failed', err);
    try { await clipboard.writeText(text || ''); } catch { /* ignore */ }
  }
});
ipcMain.on('edit:native', (e, cmd) => {
  const wc = e.sender;
  if (['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll'].includes(cmd)) wc[cmd]();
});

ipcMain.on('shell:open-external', (e, url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });

/* -------------------------------------------------------------- lifecycle */

const OPENABLE = /\.(spst|xlsx|xlsm|xls|ods|fods|csv|tsv|txt)$/i;

/** Spreadsheet files named on the command line (ignores Chromium switches, the app path and scripts). */
function filesFromArgv(argv, cwd = process.cwd()) {
  return argv.slice(1)
    .filter((a) => !a.startsWith('-'))
    .map((a) => { try { return a.startsWith('file://') ? fileURLToPath(a) : a; } catch { return a; } }) // desktop entries may pass URIs (%U)
    .filter((a) => OPENABLE.test(a))
    .map((a) => path.resolve(cwd, a))
    .filter((a) => { try { return fs.statSync(a).isFile(); } catch { return false; } });
}

// palOS: "--thumbnail FILE OUT SIZE" draws the first sheet as it looks in Sheets into OUT (a PNG at most SIZE
// pixels), for Seeker's icons, then quits. No window is shown; nothing is saved.
// palOS: "--pages FILE DIR SIZE": the first sheet a screenful at a time (up to 30) into DIR as 1.png, 2.png…, then DIR/count
const PAGES = (() => {
  const i = process.argv.indexOf('--pages');
  return i >= 0 && process.argv[i + 2] ? { src: path.resolve(process.argv[i + 1]), dir: process.argv[i + 2], size: Math.max(64, Math.min(2048, +process.argv[i + 3] || 1024)) } : null;
})();
const THUMB = (() => {
  if (PAGES) return { src: PAGES.src, out: null, size: PAGES.size, pages: true };
  const i = process.argv.indexOf('--thumbnail');
  return i >= 0 && process.argv[i + 2] ? { src: path.resolve(process.argv[i + 1]), out: process.argv[i + 2], size: Math.max(32, Math.min(1024, +process.argv[i + 3] || 256)) } : null;
})();
if (THUMB) {
  try { app.setPath('userData', fs.mkdtempSync(path.join(require('os').tmpdir(), 'sheets-thumb-'))); } catch {}
  app.disableHardwareAcceleration();
}
async function makePages() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const timer = setTimeout(() => app.exit(2), 180000);
  try {
    fs.mkdirSync(PAGES.dir, { recursive: true });
    const loaded = await loadPath(PAGES.src);
    const win = createWindow(loaded);
    win.setSize(1100, 900);
    await new Promise((r) => win.webContents.once('did-finish-load', r));
    await win.webContents.insertCSS('::-webkit-scrollbar { display: none !important; }');
    await sleep(2200);
    let n = 0, prev = -1;
    for (let p = 0; p < 30; p++) {
      const b = await win.webContents.executeJavaScript(`(() => { const g = document.getElementById('grid-wrap'); if (!g) return null; const r = g.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, top: g.scrollTop }; })()`);
      if (!b || b.top === prev) break;
      prev = b.top;
      let img = await win.webContents.capturePage({ x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.w) - 14, height: Math.round(b.h) - 14 });
      const sz = img.getSize(), k = Math.min(1, PAGES.size / Math.max(sz.width, sz.height));
      if (k < 1) img = img.resize({ width: Math.round(sz.width * k), height: Math.round(sz.height * k), quality: 'best' });
      n = p + 1;
      fs.writeFileSync(path.join(PAGES.dir, `${n}.png.tmp`), img.toPNG());
      fs.renameSync(path.join(PAGES.dir, `${n}.png.tmp`), path.join(PAGES.dir, `${n}.png`));
      process.stdout.write(`page ${n}\n`);
      const more = await win.webContents.executeJavaScript(`(() => { const g = document.getElementById('grid-wrap'); const before = g.scrollTop; g.scrollTop += g.clientHeight - 40; return g.scrollTop !== before && g.scrollTop + 4 < g.scrollHeight; })()`);
      await sleep(350);
      if (!more) break;
    }
    if (!n) throw new Error('no grid');
    fs.writeFileSync(path.join(PAGES.dir, 'count'), String(n));
    clearTimeout(timer);
    app.exit(0);
  } catch (e) { process.stderr.write('sheets pages: ' + (e && e.message) + '\n'); app.exit(1); }
}
async function makeThumbnail() {
  if (PAGES) return makePages();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const timer = setTimeout(() => app.exit(2), 45000);
  try {
    const loaded = await loadPath(THUMB.src);
    const win = createWindow(loaded);
    win.setSize(1100, 760);
    await new Promise((r) => win.webContents.once('did-finish-load', r));
    await win.webContents.insertCSS('::-webkit-scrollbar { display: none !important; }');
    await sleep(2200);
    const b = await win.webContents.executeJavaScript(`(() => { const g = document.getElementById('grid-wrap'); if (!g) return null; const r = g.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
    if (!b) throw new Error('no grid');
    const w = Math.min(Math.round(b.w) - 14, 640), h = Math.min(Math.round(b.h) - 14, 480);
    let img = await win.webContents.capturePage({ x: Math.round(b.x), y: Math.round(b.y), width: w, height: h });
    const sz = img.getSize(), k = Math.min(1, THUMB.size / Math.max(sz.width, sz.height));
    if (k < 1) img = img.resize({ width: Math.round(sz.width * k), height: Math.round(sz.height * k), quality: 'best' });
    fs.writeFileSync(THUMB.out, img.toPNG());
    clearTimeout(timer);
    app.exit(0);
  } catch (e) { process.stderr.write('sheets thumbnail: ' + (e && e.message) + '\n'); app.exit(1); }
}
if (THUMB) {
  app.whenReady().then(makeThumbnail);
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (e, argv, cwd) => {
    const files = filesFromArgv(argv, cwd);
    if (files.length) files.forEach((f) => openPathInBestWindow(f));
    else createWindow();
  });

  app.whenReady().then(async () => {
    loadRecent();
    refreshMenu();
    const files = filesFromArgv(process.argv);
    if (files.length) {
      for (const f of files) {
        try { const loaded = await loadPath(f); addRecent(f); createWindow(loaded); }
        catch (err) { dialog.showErrorBox('Could not open file', `${path.basename(f)}\n\n${err.message}`); }
      }
    }
    if (windows.size === 0) createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}

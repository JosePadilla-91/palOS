/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
const { app, BrowserWindow, Menu, dialog, ipcMain, shell, nativeTheme } = require('electron');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const path = require('path');

let win = null;
let pendingOpen = process.argv.find(a => a.endsWith('.chpress')) || null;

const iconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'icon.png')
  : path.join(__dirname, '..', 'build', 'icon.png');

function send(action, data) {
  if (win && !win.isDestroyed()) win.webContents.send('menu', action, data);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 980, minHeight: 620,
    title: 'Chancery Press',
    icon: iconPath,
    backgroundColor: '#2b2b2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('did-finish-load', () => {
    if (pendingOpen) { openPath(pendingOpen); pendingOpen = null; }
  });
  win.on('close', e => {
    if (win.forceClose) return;
    e.preventDefault();
    send('quit-request');
  });
  try { win.webContents.session.setSpellCheckerLanguages(/^fr/i.test(process.env.LANGUAGE || process.env.LC_ALL || process.env.LANG || '') ? ['fr-FR', 'en-CA'] : ['en-CA', 'fr-FR']); } catch (e) { }
  win.webContents.on('context-menu', (e, params) => {
    const items = [];
    if (params.misspelledWord) {
      (params.dictionarySuggestions || []).slice(0, 6).forEach(sg => items.push({ label: sg, click: () => win.webContents.replaceMisspelling(sg) }));
      if (!params.dictionarySuggestions || !params.dictionarySuggestions.length) items.push({ label: 'No suggestions', enabled: false });
      items.push({ label: 'Add to dictionary', click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord) }, { type: 'separator' });
    }
    if (params.isEditable) items.push({ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' });
    else if (params.selectionText) items.push({ role: 'copy' });
    if (items.length) Menu.buildFromTemplate(items).popup();
  });
  win.webContents.session.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'local-fonts'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

function openPath(p) {
  try {
    const text = fs.readFileSync(p, 'utf8');
    send('opened', { path: p, text });
  } catch (err) {
    dialog.showErrorBox('Could not open file', String(err.message || err));
  }
}

const item = (label, action, accelerator, extra) => ({ label, accelerator, click: () => send(action), ...extra });

function buildMenu() {
  const t = [
    { label: 'File', submenu: [
      item('New...', 'file-new', 'CmdOrCtrl+N'),
      { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: openDialog },
      item('Save', 'file-save', 'CmdOrCtrl+S'),
      item('Save As...', 'file-saveas', 'CmdOrCtrl+Shift+S'),
      { type: 'separator' },
      item('Document Setup...', 'doc-setup', 'CmdOrCtrl+Shift+P'),
      item('Export as PDF...', 'file-pdf', 'CmdOrCtrl+E'),
      item('Data Merge...', 'merge-open'),
      item('Export Page as PNG...', 'file-png', 'CmdOrCtrl+Shift+E'),
      item('Print...', 'file-print', 'CmdOrCtrl+P'),
      { type: 'separator' },
      item('Quit', 'quit-request', 'CmdOrCtrl+Q')
    ]},
    { label: 'Edit', submenu: [
      item('Undo', 'undo', 'CmdOrCtrl+Z'),
      item('Redo', 'redo', 'CmdOrCtrl+Shift+Z'),
      { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
      item('Duplicate', 'duplicate', 'CmdOrCtrl+D'),
      item('Delete', 'delete'),
      item('Select All', 'selectall', 'CmdOrCtrl+A'),
      { type: 'separator' },
      item('Find & Replace...', 'find', 'CmdOrCtrl+F')
    ]},
    { label: 'Insert', submenu: [
      item('Text Box', 'ins-text'),
      item('Story Frame (flowing text)', 'ins-story'),
      item('Picture...', 'ins-image', 'CmdOrCtrl+Shift+I'),
      item('Table', 'ins-table'),
      item('Page Number', 'ins-pagenum'),
      { type: 'separator' },
      item('Rectangle', 'ins-rect'),
      item('Ellipse', 'ins-ellipse'),
      item('Line', 'ins-line'),
      item('Star', 'ins-star'),
      { type: 'separator' },
      item('New Page', 'page-add', 'CmdOrCtrl+Shift+N'),
      item('Module Library', 'tab-modules')
    ]},
    { label: 'Page', submenu: [
      item('Divide Page (folds)...', 'divide-open', 'CmdOrCtrl+Shift+D'),
      item('Margins & Columns...', 'tab-layout'),
      item('Duplicate Page', 'page-dup'),
      item('Delete Page', 'page-del'),
      item('Move Page Left', 'page-left'),
      item('Move Page Right', 'page-right')
    ]},
    { label: 'Arrange', submenu: [
      item('Bring to Front', 'front', 'CmdOrCtrl+Shift+]'),
      item('Bring Forward', 'forward', 'CmdOrCtrl+]'),
      item('Send Backward', 'backward', 'CmdOrCtrl+['),
      item('Send to Back', 'back', 'CmdOrCtrl+Shift+['),
      { type: 'separator' },
      item('Group', 'group', 'CmdOrCtrl+G'),
      item('Ungroup', 'ungroup', 'CmdOrCtrl+Shift+G'),
      item('Lock / Unlock', 'lock', 'CmdOrCtrl+L'),
      item('Link Story Frames', 'link-frames'),
      item('Unlink Story Frame', 'unlink-frame'),
      item('Show on Every Page', 'allpages')
    ]},
    { label: 'View', submenu: [
      item('Zoom In', 'zoom-in', 'CmdOrCtrl+='),
      item('Zoom Out', 'zoom-out', 'CmdOrCtrl+-'),
      item('Fit Page', 'zoom-fit', 'CmdOrCtrl+0'),
      item('Actual Size', 'zoom-100', 'CmdOrCtrl+1'),
      { type: 'separator' },
      item('Toggle Grid', 'toggle-grid', "CmdOrCtrl+'"),
      item('Toggle Guides', 'toggle-guides', 'CmdOrCtrl+;'),
      item('Toggle Snap', 'toggle-snap'),
      item('Simple / Pro Mode', 'toggle-mode', 'CmdOrCtrl+Shift+M'),
      { type: 'separator' },
      { role: 'toggleDevTools' }
    ]},
    { label: 'Help', submenu: [
      item('Quick Tour', 'tour'),
      item('Keyboard Shortcuts', 'shortcuts'),
      item('About Chancery Press', 'about')
    ]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

async function openDialog() {
  const r = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Chancery Press', extensions: ['chpress'] }], properties: ['openFile']
  });
  if (!r.canceled && r.filePaths[0]) openPath(r.filePaths[0]);
}

ipcMain.handle('save-file', async (e, { path: p, text, saveAs, name }) => {
  let target = p;
  if (!target || saveAs) {
    const r = await dialog.showSaveDialog(win, {
      defaultPath: (name || 'Untitled') + '.chpress',
      filters: [{ name: 'Chancery Press', extensions: ['chpress'] }]
    });
    if (r.canceled) return null;
    target = r.filePath;
    if (!target.endsWith('.chpress')) target += '.chpress';
  }
  fs.writeFileSync(target, text, 'utf8');
  return target;
});

ipcMain.handle('open-dialog', () => openDialog());

ipcMain.handle('pick-image', async () => {
  const r = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Pictures', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff'] }],
    properties: ['openFile', 'multiSelections']
  });
  if (r.canceled) return [];
  const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', tif: 'image/tiff', tiff: 'image/tiff' };
  return r.filePaths.map(f => {
    const ext = path.extname(f).slice(1).toLowerCase();
    return { name: path.basename(f), src: `data:${mime[ext] || 'image/png'};base64,` + fs.readFileSync(f).toString('base64') };
  });
});

// PDF at the exact sheet size, gamit ang print CSS ng renderer
ipcMain.handle('export-pdf', async (e, { wIn, hIn, name }) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: (name || 'Untitled') + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled) return null;
  const data = await win.webContents.printToPDF({
    pageSize: { width: wIn, height: hIn }, printBackground: true, margins: { marginType: 'none' }, preferCSSPageSize: true
  });
  fs.writeFileSync(r.filePath, data);
  return r.filePath;
});


// ---- pdf pipeline: renderer prints chunks, we combine them (merge / booklet / tile) ----
ipcMain.handle('pdf-chunk', async (e, { wIn, hIn }) => {
  const data = await win.webContents.printToPDF({ pageSize: { width: wIn, height: hIn }, printBackground: true, margins: { marginType: 'none' }, preferCSSPageSize: true });
  return data.toString('base64');
});

ipcMain.handle('pdf-finish', async (e, { chunks, mode, opts, name }) => {
  const src = await PDFDocument.create();
  for (const c of chunks) {
    const d = await PDFDocument.load(Buffer.from(c, 'base64'));
    const pages = await src.copyPages(d, d.getPageIndices());
    pages.forEach(p => src.addPage(p));
  }
  let out = src;
  const n = src.getPageCount();
  const first = src.getPage(0), W = first.getWidth(), H = first.getHeight();
  if (mode === 'booklet') {
    out = await PDFDocument.create();
    const emb = await out.embedPdf(src, src.getPageIndices());
    const total = Math.ceil(n / 4) * 4;
    const at = (i) => (i >= 1 && i <= n ? emb[i - 1] : null);
    for (let i = 0; i < total / 4; i++) {
      for (const [l, r] of [[total - 2 * i, 2 * i + 1], [2 * i + 2, total - 2 * i - 1]]) {
        const pg = out.addPage([W * 2, H]);
        const a = at(l), b = at(r);
        if (a) pg.drawPage(a, { x: 0, y: 0, width: W, height: H });
        if (b) pg.drawPage(b, { x: W, y: 0, width: W, height: H });
      }
    }
  } else if (mode === 'tile') {
    out = await PDFDocument.create();
    const emb = await out.embedPdf(src, src.getPageIndices());
    const o = opts, perSheet = o.cols * o.rows;
    const jobs = o.repeat ? emb.map(e2 => Array(perSheet).fill(e2)) : (() => { const a = []; for (let i = 0; i < emb.length; i += perSheet) a.push(emb.slice(i, i + perSheet)); return a; })();
    for (const list of jobs) {
      const pg = out.addPage([o.sheetW * 72, o.sheetH * 72]);
      list.forEach((e2, k) => {
        const c = k % o.cols, r = Math.floor(k / o.cols);
        const x = o.mx * 72 + c * (W + o.gap * 72), y = o.sheetH * 72 - o.my * 72 - H - r * (H + o.gap * 72);
        pg.drawPage(e2, { x, y, width: W, height: H });
        if (o.ticks) {
          const t = 6, col = rgb(0, 0, 0);
          [[x, y], [x + W, y], [x, y + H], [x + W, y + H]].forEach(([cx, cy], q) => {
            const sx = q % 2 ? 1 : -1, sy = q < 2 ? -1 : 1;
            pg.drawLine({ start: { x: cx + sx * 2, y: cy }, end: { x: cx + sx * (2 + t), y: cy }, thickness: .4, color: col });
            pg.drawLine({ start: { x: cx, y: cy + sy * 2 }, end: { x: cx, y: cy + sy * (2 + t) }, thickness: .4, color: col });
          });
        }
      });
    }
  }
  const r = await dialog.showSaveDialog(win, { defaultPath: (name || 'Untitled') + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled) return null;
  fs.writeFileSync(r.filePath, Buffer.from(await out.save()));
  return r.filePath;
});

ipcMain.handle('open-csv', async () => {
  const r = await dialog.showOpenDialog(win, { filters: [{ name: 'Data (CSV)', extensions: ['csv', 'txt', 'tsv'] }], properties: ['openFile'] });
  if (r.canceled) return null;
  return { name: path.basename(r.filePaths[0]), text: fs.readFileSync(r.filePaths[0], 'utf8') };
});

ipcMain.handle('print', (e, { wIn, hIn }) => new Promise(res => {
  win.webContents.print({ printBackground: true, margins: { marginType: 'none' }, pageSize: { width: Math.round(wIn * 25400), height: Math.round(hIn * 25400) } }, ok => res(ok));
}));

ipcMain.handle('save-png', async (e, { dataUrl, name }) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: (name || 'page') + '.png', filters: [{ name: 'PNG', extensions: ['png'] }] });
  if (r.canceled) return null;
  fs.writeFileSync(r.filePath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return r.filePath;
});

ipcMain.handle('capture', async (e, rect) => {
  const img = await win.webContents.capturePage(rect);
  return img.toDataURL();
});

ipcMain.handle('confirm', async (e, { message, detail, buttons }) => {
  const r = await dialog.showMessageBox(win, { type: 'question', message, detail, buttons: buttons || ['OK', 'Cancel'], defaultId: 0, cancelId: (buttons || ['OK', 'Cancel']).length - 1 });
  return r.response;
});

ipcMain.handle('quit-now', () => { win.forceClose = true; app.quit(); });
ipcMain.handle('set-title', (e, t) => { if (win) win.setTitle(t); });
ipcMain.handle('system-dark', () => nativeTheme.shouldUseDarkColors);

app.on('open-file', (e, p) => { e.preventDefault(); pendingOpen = p; if (win) openPath(p); });
app.whenReady().then(() => { buildMenu(); createWindow(); });
app.on('window-all-closed', () => app.quit());

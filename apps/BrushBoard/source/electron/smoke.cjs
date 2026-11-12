// Headless smoke-test harness (only active when BRUSHBOARD_SMOKE=<script.js> is set).
'use strict';
const { ipcMain, app, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

exports.attach = (win, scriptPath, outDir) => {
  fs.mkdirSync(outDir, { recursive: true });
  const log = (...a) => { process.stdout.write('[smoke] ' + a.join(' ') + '\n'); };
  win.webContents.on('console-message', (e) => {
    const lvl = e.level; const msg = e.message;
    if (lvl === 'error' || lvl === 'warning' || lvl === 3 || lvl === 2) log(`console.${lvl}: ${msg}`);
  });
  win.webContents.on('render-process-gone', (_e, d) => { log('RENDERER GONE', JSON.stringify(d)); app.exit(3); });
  ipcMain.handle('test:shot', async (_e, name) => {
    const img = await win.webContents.capturePage();
    const file = path.join(outDir, `${name}.png`);
    fs.writeFileSync(file, img.toPNG());
    return file;
  });
  // native dialogs would block a headless run: answer them as "Cancel" and log what was asked
  dialog.showOpenDialog = async (...a) => { log('native open dialog: ' + JSON.stringify((a[a.length - 1] || {}).title || '')); return { canceled: true, filePaths: [] }; };
  dialog.showSaveDialog = async (...a) => { log('native save dialog: ' + JSON.stringify((a[a.length - 1] || {}).title || '')); return { canceled: true, filePath: undefined }; };
  dialog.showMessageBox = async (...a) => { const o = a[a.length - 1] || {}; log('native message box: ' + JSON.stringify(o.message || '')); return { response: o.cancelId ?? 0, checkboxChecked: false }; };
  shell.openExternal = async (u) => { log('open external: ' + u); };
  shell.openPath = async (p) => { log('open path: ' + p); return ''; };
  shell.showItemInFolder = (p) => { log('show item: ' + p); };
  // a main-process exception would otherwise pop up a modal dialog and hang the headless run
  process.on('uncaughtException', (e) => { log('MAIN UNCAUGHT ' + (e && e.stack || e)); app.exit(5); });
  // hold the first quit for a moment, like a busy desktop would, so late worker events can surface
  let held = false;
  app.on('will-quit', (e) => {
    log('main: will-quit');
    if (!held && process.env.BRUSHBOARD_SMOKE_SLOW_QUIT) { held = true; e.preventDefault(); setTimeout(() => app.quit(), 1500); }
  });
  app.on('quit', (_e, code) => log('main: quit ' + code));
  ipcMain.on('test:log', (_e, m) => log(m));
  ipcMain.on('test:done', (_e, code) => { log('done', code); setTimeout(() => app.exit(code || 0), 200); });
  win.webContents.once('did-finish-load', () => {
    const src = fs.readFileSync(scriptPath, 'utf8');
    setTimeout(() => {
      const pre = `window.__projectDir = ${JSON.stringify(process.cwd())}; window.__tmpDir = ${JSON.stringify(outDir)};`;
      win.webContents.executeJavaScript(`${pre}(async () => { try { ${src} } catch (e) { window.brushboard.test.log('FAIL ' + (e && e.stack || e)); window.brushboard.test.done(1); } })()`).catch((e) => { log('exec error', e.message); app.exit(2); });
    }, 1500);
  });
  setTimeout(() => { log('TIMEOUT'); app.exit(4); }, Number(process.env.BRUSHBOARD_SMOKE_TIMEOUT || 240000));
};

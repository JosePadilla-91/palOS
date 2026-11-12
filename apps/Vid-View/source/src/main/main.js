'use strict';
/* palOS sheets: Save, Open and message panels come out of the window */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
const { app, BrowserWindow, ipcMain, dialog, shell, screen, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL, fileURLToPath } = require('url');
const ff = require('./ffmpeg');
const media = require('./media');
const server = require('./server');
const store = require('./store');

app.setName('Vid-View');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Let Chromium use VA-API hardware decoding where the GPU supports it (HEVC included).
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,VaapiVideoDecodeLinuxGL,PlatformHEVCDecoderSupport');

const VIDEO_EXT = ['mp4', 'm4v', 'mkv', 'webm', 'mov', 'avi', 'wmv', 'asf', 'flv', 'f4v', 'mpg', 'mpeg', 'm2v', 'vob', 'ts',
  'm2ts', 'mts', 'm2t', '3gp', '3g2', 'ogv', 'ogm', 'divx', 'xvid', 'rm', 'rmvb', 'dv', 'mxf', 'nut', 'y4m', 'hevc', 'h264',
  'h265', '264', '265', 'ivf', 'amv', 'qt', 'gifv'];
// Vid-View plays videos; sound files belong to Discette (palOS's default for audio).
const SUB_EXT = ['srt', 'ass', 'ssa', 'vtt', 'sub', 'smi', 'txt'];

let win = null;
let serverBase = null;
let pendingFiles = [];
let preFit = null; // the window's size before it was fitted to a video

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

function filesFromArgv(argv) {
  const out = [];
  for (let a of argv.slice(1)) {
    if (!a || a.startsWith('-')) continue;
    if (a.startsWith('file://')) { try { a = fileURLToPath(a); } catch { continue; } }
    const abs = path.resolve(a);
    if (abs === app.getAppPath()) continue;
    if (abs.endsWith('.js') || abs === process.execPath) continue;
    try { fs.accessSync(abs); out.push(abs); } catch { /* not a path */ }
  }
  return out;
}

pendingFiles = filesFromArgv(process.argv);

app.on('second-instance', (_e, argv) => {
  const files = filesFromArgv(argv);
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
    if (files.length) win.webContents.send('open-files', files);
  }
});

function createWindow() {
  const s = store.getSettings();
  win = new BrowserWindow({
    width: 960,
    height: 600,
    minWidth: 480,
    minHeight: 300,
    frame: true,
    autoHideMenuBar: true,
    show: false,
    title: 'Vid-View',
    backgroundColor: '#000000',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  if (s.windowBounds) {
    try { win.setBounds(s.windowBounds); } catch { /* ignore */ }
  }
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  const sendState = () => win && !win.isDestroyed() && win.webContents.send('win:state', {
    maximized: win.isMaximized(), fullscreen: win.isFullScreen(), alwaysOnTop: win.isAlwaysOnTop(),
  });
  ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen', 'always-on-top-changed'].forEach((ev) => win.on(ev, sendState));
  win.on('close', () => {
    if (!win.isMaximized() && !win.isFullScreen()) store.setSettings({ windowBounds: preFit || win.getBounds() });
    server.killAll();
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12' && input.control && input.shift) win.webContents.toggleDevTools();
  });
}

function registerIpc() {
  ipcMain.handle('app:boot', async () => ({
    base: serverBase,
    settings: store.getSettings(),
    files: pendingFiles.splice(0),
    ffmpeg: await ff.features(),
    version: app.getVersion(),
    home: os.homedir(),
  }));

  ipcMain.handle('settings:set', (_e, patch) => {
    const s = store.setSettings(patch);
    if (patch.conversion) server.setPreset(patch.conversion);
    return s;
  });

  ipcMain.handle('dialog:open', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Open a Video',
      properties: ['openFile'],
      filters: [
        { name: 'Videos', extensions: VIDEO_EXT },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return r.canceled ? [] : r.filePaths;
  });

  ipcMain.handle('dialog:subtitle', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Add Subtitles', properties: ['openFile'], filters: [{ name: 'Subtitles', extensions: SUB_EXT }],
    });
    return r.canceled ? null : r.filePaths[0];
  });

  ipcMain.handle('media:open', async (_e, target, caps) => {
    try {
      // a viewer for video files: DVD discs, VIDEO_TS folders and disc images aren't opened
      const p = target && target.path ? String(target.path) : '';
      let isDir = false; try { isDir = fs.statSync(p).isDirectory(); } catch { /* checked by media.open */ }
      if (isDir || /\.(iso|img|ifo|bup)$/i.test(p)) return { ok: false, error: 'Vid-View plays video files. DVD discs, VIDEO_TS folders and disc images (.iso) aren’t supported.' };
      const m = await media.open(target);
      const info = m.info(caps || {});
      const recent = store.getRecent(m.key);
      const sameTitle = !recent || !recent.target || recent.target.dvdTitle == null || recent.target.dvdTitle === m.dvdTitle;
      info.resumeAt = store.getSettings().resume && recent && sameTitle && recent.position > 20 && recent.position < m.duration - 30 ? recent.position : 0;
      store.touchRecent({ key: m.key, target: m.target, title: m.title, duration: m.duration, kind: m.kind, hasVideo: !!m.video });
      return { ok: true, info };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('media:close', (_e, id) => { server.stopStream(id); media.close(id); });
  ipcMain.handle('media:seek-point', (_e, id, t, mode) => {
    const m = media.get(id);
    return m ? m.seekPoint(t, mode) : t;
  });
  ipcMain.handle('media:add-subtitle', (_e, id, file) => {
    const m = media.get(id);
    if (!m) return null;
    return m.addExternalSub(file, path.basename(file));
  });
  ipcMain.handle('media:position', (_e, key, position, duration, dvdTitle) => {
    if (!store.getSettings().resume) return;
    const r = store.getRecent(key);
    const extra = dvdTitle != null && r ? { target: { ...r.target, dvdTitle } } : {};
    store.savePosition(key, position, duration, extra);
  });

  // a sound file opened here: hand it to the default app for it (Discette)
  ipcMain.handle('shell:open-elsewhere', (_e, p) => shell.openPath(String(p)));

  ipcMain.on('win:minimize', () => win.minimize());
  ipcMain.on('win:maximize', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
  ipcMain.on('win:close', () => win.close());
  ipcMain.on('win:fullscreen', (_e, on) => win.setFullScreen(on == null ? !win.isFullScreen() : !!on));
  ipcMain.on('win:ontop', (_e, on) => win.setAlwaysOnTop(on == null ? !win.isAlwaysOnTop() : !!on));
  ipcMain.on('win:title', (_e, t) => win.setTitle(t || 'Vid-View'));
  ipcMain.handle('win:fit', (_e, aspect) => {
    if (!win || win.isMaximized() || win.isFullScreen() || !(aspect > 0.2 && aspect < 6)) return null;
    const prev = win.getBounds();
    const wa = screen.getDisplayMatching(prev).workArea;
    const area = Math.max(prev.width * prev.height, 900 * 520);
    let w = Math.sqrt(area * aspect);
    let h = w / aspect;
    const sc = Math.min(1, (wa.width * 0.92) / w, (wa.height * 0.92) / h);
    w = Math.round(Math.max(640, w * sc));
    h = Math.round(Math.max(400, w / aspect));
    const cx = prev.x + prev.width / 2;
    const cy = prev.y + prev.height / 2;
    const x = Math.round(Math.min(Math.max(wa.x, cx - w / 2), wa.x + wa.width - w));
    const y = Math.round(Math.min(Math.max(wa.y, cy - h / 2), wa.y + wa.height - h));
    if (!preFit) preFit = prev;
    win.setBounds({ x, y, width: w, height: h });
    return prev;
  });
  ipcMain.on('win:bounds', (_e, b) => {
    if (b && win && !win.isMaximized() && !win.isFullScreen()) win.setBounds(b);
  });
  ipcMain.on('win:restore-size', () => {
    if (preFit && win && !win.isMaximized() && !win.isFullScreen()) win.setBounds(preFit);
    preFit = null;
  });
  ipcMain.on('win:remember', () => {
    if (win && !win.isMaximized() && !win.isFullScreen()) store.setSettings({ windowBounds: win.getBounds() });
  });
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  server.setPreset(store.getSettings().conversion || 'veryfast');
  const s = await server.start();
  serverBase = s.base;
  registerIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  server.killAll();
  app.quit();
});


// ---- paladin-menus: this app's menus in the Paladin menu bar -------------------------------------
// Added by Paladin. Each window gets a real menu (exported to the desktop menu bar by Electron).
// Items either press the app's own keyboard shortcut in the window, run a small bit of the app's
// page script, or (for apps that keep their own menu model in the page) mirror that model exactly.
// SPEC is filled in per app by the Paladin packaging script.
(() => {
  const { app, BrowserWindow, Menu } = require("electron");
  const SPEC = {"name": "Vid-View", "quit": "Ctrl+Q", "fullscreen": "F11", "menus": [
    {"label": "File", "items": [["Open Video…", "Ctrl+O"], "-", {"label": "Close Video", "keys": "Ctrl+W", "when": "!!document.querySelector('#app.mode-player')"}]},
    {"label": "Edit", "items": [["Undo", "Ctrl+Z"], ["Redo", "Ctrl+Shift+Z"], "-", ["Cut", "Ctrl+X"], ["Copy", "Ctrl+C"], ["Paste", "Ctrl+V"], ["Select All", "Ctrl+A"]]},
    {"label": "Controls", "items": [{"label": "Play / Pause", "keys": "Space", "when": "!!document.querySelector('#app.mode-player')"}, "-",
      {"label": "Back 5 Seconds", "keys": "Left", "when": "!!document.querySelector('#app.mode-player')"}, {"label": "Forward 5 Seconds", "keys": "Right", "when": "!!document.querySelector('#app.mode-player')"},
      {"label": "Back 30 Seconds", "keys": "Shift+Left", "when": "!!document.querySelector('#app.mode-player')"}, {"label": "Forward 30 Seconds", "keys": "Shift+Right", "when": "!!document.querySelector('#app.mode-player')"},
      {"label": "Go to Beginning", "keys": "Home", "when": "!!document.querySelector('#app.mode-player')"}, "-",
      {"label": "Previous Frame", "keys": ",", "when": "!!document.querySelector('#app.mode-player')"}, {"label": "Next Frame", "keys": ".", "when": "!!document.querySelector('#app.mode-player')"}, "-",
      {"label": "Slower", "keys": "[", "when": "!!document.querySelector('#app.mode-player')"}, {"label": "Faster", "keys": "]", "when": "!!document.querySelector('#app.mode-player')"}, {"label": "Normal Speed", "keys": "=", "when": "!!document.querySelector('#app.mode-player')"}, "-",
      {"label": "Volume Up", "keys": "Up", "when": "!!document.querySelector('#app.mode-player')"}, {"label": "Volume Down", "keys": "Down", "when": "!!document.querySelector('#app.mode-player')"}, {"label": "Mute", "keys": "M", "when": "!!document.querySelector('#app.mode-player')"}]},
    {"label": "Video", "items": [{"label": "Next Audio Track", "keys": "A", "when": "!!document.querySelector('#app.mode-player')"}, "-",
      {"label": "Next Subtitles", "keys": "C", "when": "!!document.querySelector('#app.mode-player')"}, {"label": "Subtitles Earlier", "keys": "G", "when": "!!document.querySelector('#app.mode-player')"}, {"label": "Subtitles Later", "keys": "H", "when": "!!document.querySelector('#app.mode-player')"}]}]};
  if (!SPEC) return;
  const NAME = SPEC.name || app.getName();

  const KEYNAMES = { del: "Delete", delete: "Delete", esc: "Escape", escape: "Escape", enter: "Return", return: "Return",
    space: "Space", " ": "Space", left: "Left", right: "Right", up: "Up", down: "Down", arrowleft: "Left", arrowright: "Right",
    arrowup: "Up", arrowdown: "Down", home: "Home", end: "End", tab: "Tab", backspace: "Backspace", pageup: "PageUp", pagedown: "PageDown" };
  const MODS = { ctrl: "control", control: "control", cmd: "control", shift: "shift", alt: "alt" };
  function parse(combo) {
    const raw = String(combo).trim();
    // "Ctrl++" / "Ctrl+=": the last "+" may be the key itself
    const m = raw.match(/^(.*?)\+?([^+]+|\+)$/);
    const mods = (m[1] || "").split("+").map((s) => s.trim().toLowerCase()).filter(Boolean);
    let key = m[2];
    key = KEYNAMES[key.toLowerCase()] || (/^f\d{1,2}$/i.test(key) ? key.toUpperCase() : key.length === 1 ? key.toLowerCase() : key);
    return { mods: mods.map((x) => MODS[x]).filter(Boolean), key };
  }
  function accel(combo) {
    const { mods, key } = parse(combo);
    const k = { Space: "Space", "+": "Plus", "=": "=" }[key] || (key.length === 1 ? key.toUpperCase() : key);
    return [...mods.map((x) => ({ control: "Ctrl", shift: "Shift", alt: "Alt" }[x])), k].join("+");
  }
  function press(wc, combo) {
    if (!wc || wc.isDestroyed()) return;
    const { mods, key } = parse(combo);
    wc.focus();
    wc.sendInputEvent({ type: "keyDown", keyCode: key, modifiers: mods });
    wc.sendInputEvent({ type: "keyUp", keyCode: key, modifiers: mods });
  }
  const run = (wc, js) => wc && !wc.isDestroyed() && wc.executeJavaScript(`(()=>{try{${js}}catch(e){console.error("[paladin-menus]",e)}})()`, true).catch(() => {});

  // values the menus depend on (enabled / checked / mirrored model), read from the page
  const state = new Map(); // webContents id -> { probe: json, model }
  function probeScript() {
    const exprs = [];
    const walk = (items) => (items || []).forEach((i) => { if (i && typeof i === "object" && !Array.isArray(i)) { if (i.when) exprs.push(i.when); if (i.checked) exprs.push(i.checked); if (i.items) walk(i.items); } });
    (SPEC.menus || []).forEach((m) => walk(m.items));
    if (SPEC.prefs) walk([SPEC.prefs]);
    const model = SPEC.model ? `(()=>{const M=${SPEC.model};if(!M)return null;return Object.entries(M).map(([t,l])=>[t,l.map(i=>i.sep?null:[String(i.label||"").replace(/^[✓ ]+/,""),i.keys||"",!!i.disabled,/^✓/.test(i.label||"")])])})()` : "null";
    return `(()=>{const r=[];${exprs.map((e) => `try{r.push(!!(${e}))}catch(_){r.push(false)}`).join(";")};let m=null;try{m=${model}}catch(_){};return JSON.stringify([r,m])})()`;
  }
  const PROBE = probeScript();

  function build(win) {
    if (!win || win.isDestroyed()) return;
    const wc = win.webContents;
    const st = state.get(wc.id) || {};
    const vals = st.vals || [];
    let vi = 0;
    const conv = (i) => {
      if (i === "-") return { type: "separator" };
      if (Array.isArray(i)) { const [label, combo] = i; return { label, accelerator: accel(combo), registerAccelerator: false, click: () => press(wc, combo) }; }
      const o = { label: i.label };
      if (i.items) { o.submenu = i.items.map(conv); return o; }
      if (i.when) o.enabled = vals[vi++] !== false;
      if (i.checked) { o.type = "checkbox"; o.checked = vals[vi++] === true; }
      if (i.keys) { o.accelerator = accel(i.keys); o.registerAccelerator = false; }
      o.click = () => (i.js ? run(wc, i.js) : i.keys ? press(wc, i.keys) : null);
      return o;
    };
    const tidy = (l) => { const o = []; for (const i of l) { if (i.type === "separator" && (!o.length || o[o.length - 1].type === "separator")) continue; o.push(i); } while (o.length && o[o.length - 1].type === "separator") o.pop(); return o; };

    const appMenu = [];
    if (SPEC.about) appMenu.push(conv({ label: `About ${NAME}`, ...SPEC.about }), { type: "separator" });
    if (SPEC.prefs) appMenu.push(conv({ label: "Preferences…", ...SPEC.prefs }), { type: "separator" });
    appMenu.push({ label: `Quit ${NAME}`, accelerator: "Ctrl+Q", registerAccelerator: false,
      click: () => (SPEC.quit ? press(wc, SPEC.quit) : app.quit()) });

    let menus = (SPEC.menus || []).map((m) => ({ label: m.label, submenu: m.items.map(conv) }));
    if (st.model) {
      menus = st.model.map(([title, items]) => ({ label: title, submenu: items.map((it, idx) => !it ? { type: "separator" } : {
        label: it[0], enabled: !it[2], ...(it[1] ? { accelerator: accel(it[1]), registerAccelerator: false } : {}),
        ...(it[3] ? { type: "checkbox", checked: true } : {}),
        click: () => run(wc, `const M=${SPEC.model};const it=M&&M[${JSON.stringify(title)}][${idx}];it&&it.run&&it.run()`),
      }) }));
      // the mirrored model comes first; extra spec menus (e.g. View) follow
      menus = [...menus, ...(SPEC.menus || []).filter((m) => !st.model.some(([t]) => t === m.label)).map((m) => ({ label: m.label, submenu: m.items.map(conv) }))];
    }
    // every app gets a working Edit menu
    const edit = menus.find((m) => /^edit$/i.test(m.label));
    const roles = [{ role: "undo", registerAccelerator: false }, { role: "redo", registerAccelerator: false }, { type: "separator" },
      { role: "cut", registerAccelerator: false }, { role: "copy", registerAccelerator: false }, { role: "paste", registerAccelerator: false },
      { role: "selectAll", registerAccelerator: false }];
    if (!edit) menus.splice(menus.findIndex((m) => /^file$/i.test(m.label)) + 1, 0, { label: "Edit", submenu: roles });
    const file = menus.find((m) => /^file$/i.test(m.label));
    if (file && !file.submenu.some((i) => /^close window/i.test(i.label || "")))
      {
      const usesW = JSON.stringify(SPEC.menus || []).includes('"Ctrl+W"');
      file.submenu.push({ type: "separator" }, { label: "Close Window", ...(usesW ? {} : { accelerator: "Ctrl+W", registerAccelerator: false }), click: () => win.close() });
    }
    const windowMenu = { label: "Window", submenu: [
      { label: "Minimize", click: () => win.minimize() },
      { label: "Zoom", click: () => (win.isMaximized() ? win.unmaximize() : win.maximize()) },
      ...(SPEC.fullscreen ? [{ type: "separator" }, { label: "Enter Full Screen", accelerator: accel(SPEC.fullscreen), registerAccelerator: false, click: () => press(wc, SPEC.fullscreen) }] : []),
    ] };
    const template = [{ label: NAME, submenu: tidy(appMenu) }, ...menus.map((m) => ({ ...m, submenu: tidy(m.submenu) })).filter((m) => m.submenu.length), windowMenu];
    const sig = JSON.stringify(template, (k, v) => (typeof v === "function" ? undefined : v));
    if (sig === st.sig) return;
    st.sig = sig;
    state.set(wc.id, st);
    win.setMenu(Menu.buildFromTemplate(template));
    win.setAutoHideMenuBar(true);
    win.setMenuBarVisibility(false);
  }

  async function refresh(win) {
    if (!win || win.isDestroyed()) return;
    const wc = win.webContents;
    if (wc.isLoading()) { try { build(win); } catch {} return; }
    try {
      const [vals, model] = JSON.parse(await wc.executeJavaScript(PROBE, true));
      const st = state.get(wc.id) || {};
      st.vals = vals; st.model = model; state.set(wc.id, st);
    } catch {}
    try { build(win); } catch (e) { console.error("[paladin-menus]", e); }
  }

  function adopt(win) {
    if (!win || win._paladinMenus) return;
    win._paladinMenus = true;
    try { build(win); } catch (e) { console.error("[paladin-menus]", e); }
    const wc = win.webContents;
    wc.on("did-finish-load", () => refresh(win));
    const id = wc.id;
    win.on("closed", () => state.delete(id));
    // Electron hands a menu to the desktop menu bar only once its menu server is up, which is
    // shortly after the window appears: set it again then (and again later, to be sure).
    const again = () => { if (win.isDestroyed()) return; const st = state.get(id); if (st) st.sig = null; refresh(win); };
    win.once("show", () => { setTimeout(again, 300); setTimeout(again, 1500); setTimeout(again, 5000); });
    if (win.isVisible()) { setTimeout(again, 300); setTimeout(again, 1500); setTimeout(again, 5000); }
  }
  app.on("browser-window-created", (_e, win) => setImmediate(() => adopt(win)));
  // keep enabled/checked states current for the window in front (cheap: one small script a second)
  app.whenReady().then(() => {
    BrowserWindow.getAllWindows().forEach(adopt);
    setInterval(() => { const w = BrowserWindow.getFocusedWindow(); if (w && w._paladinMenus) refresh(w); }, 900);
  });
})();

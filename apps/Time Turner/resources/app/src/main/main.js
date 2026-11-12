'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Time Turner — Electron main process.
//   time-turner            normal start (talks to time-turnerd)
//   time-turner --mock     UI preview with built-in sample data, no service needed
const { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme, shell } = require('electron');
const path = require('path');
const { DaemonClient } = require('./daemon-client');
const { getWallpaper, watchWallpaper } = require('./wallpaper');
const F = require('./files');

const MOCK = process.argv.includes('--mock');
const MIGRATE = process.argv.includes('--migrate');
const daemon = new DaemonClient();
let win = null;
let migWin = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (argv.includes('--migrate')) return openMigration();
    if (!win) return createWindow();
    if (win.isMinimized()) win.restore(); win.focus();
  });
}

nativeTheme.themeSource = 'system';
app.setName('Time Turner');

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    show: false,
    title: 'Time Turner',
    backgroundColor: '#000000',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
      additionalArguments: MOCK ? ['--tt-mock'] : [],
    },
  });
  Menu.setApplicationMenu(null);
  win.maximize();
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Never navigate away or open other windows from the UI.
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => { win = null; });
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  if (migWin && !migWin.isDestroyed()) migWin.webContents.send(channel, payload);
}

// Migration Assistant: its own small window (Time Turner ▸ File ▸ Migration Assistant…, or "time-turner --migrate")
function openMigration() {
  if (migWin && !migWin.isDestroyed()) { if (migWin.isMinimized()) migWin.restore(); migWin.focus(); return; }
  migWin = new BrowserWindow({
    width: 780, height: 580, minWidth: 680, minHeight: 520, show: false, title: 'Migration Assistant',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2',
    icon: path.join(__dirname, '..', 'assets', 'migration.png'),
    webPreferences: { preload: path.join(__dirname, '..', 'preload', 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false, additionalArguments: MOCK ? ['--tt-mock'] : [] },
  });
  migWin.once('ready-to-show', () => migWin.show());
  migWin.loadFile(path.join(__dirname, '..', 'renderer', 'migrate.html'));
  migWin.webContents.on('will-navigate', e => e.preventDefault());
  migWin.on('closed', () => { migWin = null; });
}

// ---------- IPC ----------
// Every handler resolves { ok: true, value } or { ok: false, code, message }
// so error codes survive the trip to the renderer.
function handle(channel, fn) {
  ipcMain.handle(channel, async (_e, ...args) => {
    try { return { ok: true, value: await fn(...args) }; } catch (err) {
      return { ok: false, code: err.code || 'internal', message: err.message };
    }
  });
}

function relResults(results) {
  const out = [];
  const seen = new Map();   // rel path -> newest version from backups
  for (const r of results) {
    const rel = F.toRel(r.path);
    if (rel == null) continue;
    const item = {
      path: rel,
      name: r.name,
      dir: rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '',
      kind: F.kindOf(r.name, r.type),
      snapshotId: r.snapshotId,
      time: r.time,
      gone: !F.statNow(rel),
    };
    // results arrive newest first, so the first one seen per path is its newest backed-up version
    if (!seen.has(rel)) seen.set(rel, { item, size: r.size, mtime: r.mtime, type: r.type });
    out.push(item);
  }
  // What's on disk now is the most recent iteration: if it matches the newest backup,
  // that result lands on "Now"; if it has changed since, "Now" becomes an extra result.
  for (const [rel, newest] of seen) {
    const st = F.statNow(rel);
    if (!st) continue;
    const same = newest.type === 'dir'
      ? st.isDirectory()
      : st.size === newest.size && Math.abs(st.mtimeMs - newest.mtime) < 1000;
    if (same) Object.assign(newest.item, { snapshotId: 'now', time: Date.now() });
    else out.push({ ...newest.item, snapshotId: 'now', time: Date.now(), gone: false });
  }
  return out.sort((a, b) => b.time - a.time || a.name.localeCompare(b.name));
}

function registerIpc() {
  handle('tt:status', () => daemon.call('GetStatus'));
  handle('tt:settings:get', () => daemon.call('GetSettings'));
  handle('tt:settings:set', s => daemon.call('SetSettings', s));
  handle('tt:drives', () => daemon.call('ListDrives'));
  handle('tt:setup', opts => daemon.call('Setup', opts));
  handle('tt:scan-backups', () => daemon.call('ScanBackups'));
  handle('tt:open-backup', (uuid, recoveryKey) => daemon.call('OpenBackup', { uuid, recoveryKey }));
  handle('tt:stage-machine-restore', (token, snapshot, label) => daemon.call('StageMachineRestore', { token, snapshot, label }));
  handle('tt:restart-for-restore', () => daemon.call('RestartForRestore'));
  handle('tt:ack-last-restore', () => daemon.call('AcknowledgeLastRestore'));

  handle('tt:snapshots', () => daemon.call('ListSnapshots'));
  handle('tt:list-dir', async (snapshot, rel) => {
    if (snapshot === 'now') return F.listNow(rel);
    const items = await daemon.call('ListDir', { snapshot, path: F.toAbs(rel) });
    return items && F.shapeItems(items, rel);
  });
  handle('tt:search', async q => relResults(await daemon.call('Search', { query: q })));
  handle('tt:exists-now', rel => !!F.statNow(rel));
  handle('tt:restore', async (snapshot, rels, mode) => {
    const res = await daemon.call('RestorePaths', { snapshot, paths: rels.map(F.toAbs), mode });
    return res.map(r => ({ path: F.toRel(r.path), name: r.name }));
  });

  handle('tt:backup-now', () => daemon.call('BackupNow'));
  handle('tt:cancel-backup', () => daemon.call('CancelBackup'));
  handle('tt:system-restore:prepare', (snapshot, label) => daemon.call('PrepareSystemRestore', { snapshot, label }));
  handle('tt:system-restore:commit', token => daemon.call('CommitSystemRestore', { token }));
  handle('tt:system-restore:cancel', token => daemon.call('CancelSystemRestore', { token }));

  handle('tt:mig:sources', () => daemon.call('MigrationSources'));
  handle('tt:mig:contents', (token, snapshot) => daemon.call('MigrationContents', { token, snapshot }));
  handle('tt:mig:start', opts => daemon.call('Migrate', opts));
  handle('tt:mig:cancel', () => daemon.call('CancelMigration'));
  handle('tt:mig:whoami', () => require('os').userInfo().username);
  handle('tt:mig:close', () => { if (migWin && !migWin.isDestroyed()) migWin.close(); });

  handle('tt:wallpaper', () => getWallpaper());
  handle('tt:pick-folder', async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Choose a Folder to Back Up', properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths[0]) return null;
    return { name: path.basename(r.filePaths[0]) || r.filePaths[0], path: r.filePaths[0] };
  });
}

app.whenReady().then(() => {
  if (!MOCK) {
    registerIpc();
    daemon.on('event', ev => send('tt:event', ev));
    daemon.on('error', () => send('tt:event', { type: 'daemon-disconnected' }));
    daemon.connect().catch(() => { /* reported on first call */ });
    watchWallpaper(w => send('tt:wallpaper-changed', w));
  } else {
    handle('tt:mig:close', () => { if (migWin && !migWin.isDestroyed()) migWin.close(); });
    handle('tt:wallpaper', () => getWallpaper());
    watchWallpaper(w => send('tt:wallpaper-changed', w));
  }
  ipcMain.on('tt:mig:open', () => openMigration());
  if (MIGRATE) openMigration(); else createWindow();
});

app.on('window-all-closed', () => app.quit());


// ---- paladin-menus: this app's menus in the Paladin menu bar -------------------------------------
// Added by Paladin. Each window gets a real menu (exported to the desktop menu bar by Electron).
// Items either press the app's own keyboard shortcut in the window, run a small bit of the app's
// page script, or (for apps that keep their own menu model in the page) mirror that model exactly.
// SPEC is filled in per app by the Paladin packaging script.
(() => {
  const { app, BrowserWindow, Menu } = require("electron");
  const SPEC = {"name": "Time Turner", "prefs": {"js": "document.getElementById('settingsBtn').click()", "when": "(e=>e&&!e.disabled&&!e.closest('[hidden]'))(document.getElementById('settingsBtn'))"}, "menus": [{"label": "File", "items": [{"label": "Back Up Now", "js": "document.getElementById('backupBtn').click()", "when": "(e=>e&&!e.disabled&&!e.closest('[hidden]'))(document.getElementById('backupBtn'))"}, "-", {"label": "Restore Selected Items", "js": "document.getElementById('restoreBtn').click()", "when": "(e=>e&&!e.disabled&&!e.closest('[hidden]'))(document.getElementById('restoreBtn'))"}, {"label": "Restore System…", "js": "document.getElementById('restoreSysBtn').click()", "when": "(e=>e&&!e.disabled&&!e.closest('[hidden]'))(document.getElementById('restoreSysBtn'))"}, "-", {"label": "Migration Assistant…", "js": "window.timeTurnerWallpaper.openMigration()"}]}, {"label": "Edit", "items": [["Undo", "Ctrl+Z"], ["Redo", "Ctrl+Shift+Z"], "-", ["Cut", "Ctrl+X"], ["Copy", "Ctrl+C"], ["Paste", "Ctrl+V"], ["Select All", "Ctrl+A"], "-", {"label": "Find…", "keys": "Ctrl+F", "when": "!document.getElementById('main').hidden"}]}, {"label": "Go", "items": [{"label": "Earlier Backup", "keys": "Left", "when": "!document.getElementById('main').hidden"}, {"label": "Later Backup", "keys": "Right", "when": "!document.getElementById('main').hidden"}, "-", {"label": "Oldest Backup", "keys": "Home", "when": "!document.getElementById('main').hidden"}, {"label": "Newest Backup", "keys": "End", "when": "!document.getElementById('main').hidden"}, "-", {"label": "Enclosing Folder", "keys": "Alt+Up", "when": "!document.getElementById('main').hidden"}]}]};
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

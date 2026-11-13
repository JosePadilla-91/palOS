'use strict';
try { require('/usr/lib/palos-theme/main.js'); } catch (_) {}
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Seeker — desktop, menu bar and file browser for Paladin (X11).
const { app, BrowserWindow, ipcMain, screen, protocol, net, dialog, clipboard, nativeImage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('disable-features', 'GlobalShortcutsPortal');
app.setName('Seeker');
if (process.platform === 'linux') app.setDesktopName('paladin-seeker.desktop');

protocol.registerSchemesAsPrivileged([{ scheme: 'seeker', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, bypassCSP: true } }]);

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const util = require('./util');
const { spawn } = require('child_process');
const { HOME, which, detached, debounce, userDirs, readJSON, writeJSON } = util;
const config = require('./config');
const x11 = require('./x11');
const apps = require('./apps');
const icons = require('./icons');
const mime = require('./mime');
const fsops = require('./fsops');
const copyops = require('./copyops');
const archive = require('./archive');
const scout = require('./scout');
const preview = require('./preview');
const thumbs = require('./thumbs');
const volumes = require('./volumes');
const extras = require('./extras');
const screens = require('./screens');
const sheet = require('./sheet');
const widgets = require('./widgets');
const appearance = require('./appearance');

const UI = path.join(__dirname, '..', 'ui');
const ASSETS = path.join(__dirname, '..', 'assets');
const BAR_H = 22;
const STATE_FILE = path.join(HOME, '.local/share/paladin-seeker/state.json');
const args = process.argv.slice(app.isPackaged ? 1 : 2);
const FLAGS = { noDesktop: args.includes('--no-desktop'), noMenubar: args.includes('--no-menubar') };

process.on('uncaughtException', (e) => console.error('[seeker] uncaught', e));
process.on('unhandledRejection', (e) => console.error('[seeker] unhandled', e));

// ------------------------------------------------------------------ shared state
let menubar = null;                 // BrowserWindow
const desktops = new Map();         // displayId -> BrowserWindow
const browsers = new Map();         // webContents.id -> { win, state }
let quicklook = null, prefsWin = null, aboutWin = null, forceQuitWin = null, helpWin = null;
const infoWins = new Map();         // path -> win
let composited = false;
let wmName = '';
let lastSeekerSurface = null;        // webContents of last focused browser/desktop
let front = { seeker: true };        // what the menu bar is showing
const sources = new Map();          // xid -> menu source
let persisted = readJSON(STATE_FILE, {}) || {};
persisted.recentApps = persisted.recentApps || [];
persisted.recentFolders = persisted.recentFolders || [];
const savePersisted = debounce(() => { try { writeJSON(STATE_FILE, persisted); } catch {} }, 1000);

function ownXids() {
  const ids = new Set();
  for (const w of BrowserWindow.getAllWindows()) { try { ids.add(w.getNativeWindowHandle().readUInt32LE(0)); } catch {} }
  return ids;
}
function xidOf(win) { try { return win.getNativeWindowHandle().readUInt32LE(0); } catch { return 0; } }
// an interface sound (palos-sound: off when the person turned them off in Settings)
function uiSound(name) { try { const c = require('child_process').spawn('palos-sound', [name], { detached: true, stdio: 'ignore' }); c.on('error', () => {}); c.unref(); } catch {} }
function allSeekerWebContents() { return BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed()).map((w) => w.webContents); }
function broadcast(ch, ...a) { for (const wc of allSeekerWebContents()) { try { wc.send(ch, ...a); } catch {} } }

// ------------------------------------------------------------------ compositor
async function detectCompositor() {
  const c = config.get().compositor;
  if (c === 'on') return true;
  if (c === 'off') return false;
  const name = await x11.wmName().catch(() => '');
  if (name) wmName = name;
  if (/paladin|compiz|kwin|mutter|xfwm|marco|muffin|gnome shell/.test(String(wmName).toLowerCase())) return true;
  const ps = await util.sh('pgrep', ['-x', '-l', 'picom|compton|xcompmgr|fastcompmgr'], { timeout: 2000 });
  if (ps.trim()) return true;
  // no answer from the window manager (busy, or still starting): "don't know", not "no compositor"
  return name ? false : null;
}

// ------------------------------------------------------------------ protocol: icons & thumbnails
// the archive's icon with its kind written across the lower half, as a small SVG round the icon's own picture
const badgeCache = new Map();
function badgedIcon(file, label, size) {
  const key = `${file}|${label}|${size}`;
  let svg = badgeCache.get(key);
  if (!svg) {
    const data = fs.readFileSync(file).toString('base64');
    const type = /\.svgz?$/i.test(file) ? 'image/svg+xml' : 'image/png';
    const fsz = (label.length > 3 ? 0.17 : 0.2) * size, y = size * 0.79;
    const esc = label.replace(/[<&>"]/g, '');
    svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<image width="${size}" height="${size}" xlink:href="data:${type};base64,${data}"/>` +
      `<text x="${size / 2}" y="${y}" text-anchor="middle" font-family="Noto Sans, sans-serif" font-weight="700" font-size="${fsz}" letter-spacing="${size * 0.006}" ` +
      `fill="#ffffff" fill-opacity=".92" stroke="#0b3a5c" stroke-opacity=".45" stroke-width="${Math.max(1, size / 48)}" paint-order="stroke">${esc}</text></svg>`;
    if (badgeCache.size > 400) badgeCache.clear();
    badgeCache.set(key, svg);
  }
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'max-age=3600' } });
}
function registerProtocol() {
  protocol.handle('seeker', async (req) => {
    const u = new URL(req.url);
    try {
      if (u.host === 'icon') {
        const size = parseInt(u.searchParams.get('s') || '48', 10);
        let names = (u.searchParams.get('n') || '').split('|').filter(Boolean);
        const badge = names[0] && names[0].startsWith('palos-badge:') ? names.shift().slice(12) : null;
        const f = icons.lookup(names, size) || icons.lookup(['text-x-generic', 'unknown', 'image-missing'], size);
        if (f && badge && size >= 32) return badgedIcon(f, badge, size);
        if (f) return net.fetch(pathToFileURL(f).toString());
      } else if (u.host === 'thumb') {
        const p = u.searchParams.get('p'); const size = parseInt(u.searchParams.get('s') || '256', 10);
        const f = p && await thumbs.get(p, size);
        if (f) return net.fetch(pathToFileURL(f).toString());
      } else if (u.host === 'page') {          // live previews: a page of a PDF or document
        const f = await preview.page(u.searchParams.get('p'), parseInt(u.searchParams.get('n') || '1', 10), parseInt(u.searchParams.get('s') || '1024', 10));
        if (f) return net.fetch(pathToFileURL(f).toString());
      } else if (u.host === 'media') {         // live previews: any video or song, through ffmpeg when needed
        return await preview.media(u.searchParams.get('p'), u.searchParams.get('t'), req);
      } else if (u.host === 'cover') {         // a song's album art
        const f = await preview.cover(u.searchParams.get('p'));
        if (f) return net.fetch(pathToFileURL(f).toString());
      } else if (u.host === 'asset') {
        const f = path.join(ASSETS, path.basename(u.pathname));
        if (fs.existsSync(f)) return net.fetch(pathToFileURL(f).toString());
      }
    } catch (e) { console.error('[protocol]', e.message); }
    return new Response('not found', { status: 404 });
  });
}

// ------------------------------------------------------------------ windows
const PRELOAD = path.join(__dirname, '..', 'preload.js');
// Seeker's windows use the system title bar, like every other app on palOS. The window area below the
// title bar starts in the theme's colour so nothing flashes white while the page loads.
function framedWindow() {
  const { nativeTheme } = require('electron');
  return { frame: true, transparent: false, backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#e8e8e8', autoHideMenuBar: true };
}
// Seeker's browser windows draw their own title bar and toolbar as one brushed-steel surface (the title
// bar's own artwork from the Paladin theme, continued down through the toolbar), so there's no join between
// the title bar and the toolbar. Windows without a toolbar keep the system title bar.
function unifiedWindow() {
  return { frame: false, transparent: composited, backgroundColor: composited ? '#00000000' : '#dfe2e6', autoHideMenuBar: true, thickFrame: true };
}
function webPrefs(extra = {}) {
  return { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false, ...extra };
}

// Run fn once when the window has painted, or a few seconds after its page loaded if the graphics
// process never reports a paint (busy or software-only computers): windows always appear.
function whenReady(win, fn) {
  let done = false;
  const go = () => { if (done || win.isDestroyed()) return; done = true; fn(); };
  win.once('ready-to-show', go);
  win.webContents.once('did-finish-load', () => setTimeout(go, 3000));
}

function createMenubar() {
  const d = screen.getPrimaryDisplay(); const b = d.bounds;
  const win = menubar = new BrowserWindow({
    // Without a compositor, a transparent window draws black: use an opaque window clipped to the bar.
    x: b.x, y: b.y, width: b.width, height: b.height, type: 'dock', frame: false, transparent: composited, backgroundColor: composited ? '#00000000' : '#ececec',
    resizable: false, movable: false, minimizable: false, maximizable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false,
    show: false, focusable: true, title: 'Seeker Menu Bar', webPreferences: webPrefs({ backgroundThrottling: false }),
  });
  win.__made = Date.now();
  menubar.setVisibleOnAllWorkspaces(true);
  menubar.loadFile(path.join(UI, 'menubar.html'), { query: { composited: composited ? '1' : '0' } });
  // Shown on the first paint; if the graphics process is slow to report one (a busy or software-only
  // computer), shown anyway a few seconds after the page has loaded, so there is always a menu bar.
  let shown = false;
  const showBar = () => {
    if (menubar !== win || shown || win.isDestroyed()) return;
    shown = true;
    setMenubarShape('bar');
    win.showInactive();
    const xid = xidOf(win);
    // Reserve the menu bar's strip at the top of the screen (EWMH strut). Struts are in screen pixels, the bar in
    // points: with a bigger text size or Scale the bar is taller in pixels, and windows must stop below all of it.
    let sf = 1;
    try { sf = screen.getPrimaryDisplay().scaleFactor || 1; } catch (_) {}
    const px = (v) => Math.round(v * sf);
    x11.setCardinals(xid, '_NET_WM_STRUT_PARTIAL', [0, 0, px(b.y + BAR_H), 0, 0, 0, 0, 0, px(b.x), px(b.x + b.width) - 1, 0, 0]);
    x11.setCardinals(xid, '_NET_WM_STRUT', [0, 0, px(b.y + BAR_H), 0]);
    pushMenus();
  };
  win.__forceShow = () => { shown = false; showBar(); };
  win.once('ready-to-show', showBar);
  win.webContents.once('did-finish-load', () => setTimeout(showBar, 3000));
  win.webContents.on('render-process-gone', (e, d) => {
    if (menubar !== win || d.reason === 'clean-exit') return;
    menubar = null; try { win.destroy(); } catch {}
    setTimeout(createMenubar, 500);
  });
}

// ---------------- spyglass search ----------------
let spot = null;
const SPOT_W = 414;   // two thirds of the old 620 px
function spotBounds(h) {
  const b = screen.getPrimaryDisplay().bounds;
  // flush under the spyglass: against the bottom of the menu bar and the right edge of the screen
  return { x: b.x + b.width - SPOT_W, y: b.y + BAR_H, width: SPOT_W, height: Math.max(60, Math.min(h || 60, b.height - BAR_H - 40)) };
}
function createSpot() {
  spot = new BrowserWindow({
    ...spotBounds(60), frame: false, transparent: composited, backgroundColor: composited ? '#00000000' : '#f4f4f4',
    resizable: false, movable: false, minimizable: false, maximizable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false,
    show: false, focusable: true, title: 'Search', type: 'toolbar', webPreferences: webPrefs(),
  });
  spot.setVisibleOnAllWorkspaces(true);
  spot.loadFile(path.join(UI, 'scout.html'), { query: { composited: composited ? '1' : '0' } });
  // The window manager can send a short-lived focus-out while it hands focus over; only a real one hides the panel.
  spot.on('blur', () => {
    if (!spot || spot.isDestroyed() || !spot.isVisible() || spot.webContents.isDevToolsOpened()) return;
    if (Date.now() - spotShownAt < 450) return;
    hideSpot();
  });
  spot.on('closed', () => { spot = null; });
  // a search page that crashed or hung must not leave the spyglass dead: start a fresh one next time
  spot.webContents.on('render-process-gone', () => { try { if (spot && !spot.isDestroyed()) spot.destroy(); } catch {} spot = null; });
  spot.on('unresponsive', () => { try { if (spot && !spot.isDestroyed()) spot.destroy(); } catch {} spot = null; });
  return new Promise((res) => spot.webContents.once('did-finish-load', res));
}
let spotShownAt = 0;
async function showSpot(retry = false) {
  closeMenusIfOpen();
  if (!spot || spot.isDestroyed()) await createSpot();
  spot.setBounds(spotBounds(60));
  spotShownAt = Date.now();
  spot.show(); spot.focus();
  // the window manager may place a newly shown window by its own rules: put it back under the spyglass
  const pin = spot;
  for (const ms of [0, 40, 150]) setTimeout(() => { try { if (pin === spot && !pin.isDestroyed() && pin.isVisible()) { const want = spotBounds(pin.getBounds().height); const [x, y] = pin.getPosition(); if (x !== want.x || y !== want.y) pin.setBounds(want); } } catch {} }, ms);
  spot.webContents.send('spot:shown');
  // Some window managers don't give keyboard focus to a window that is only being shown again.
  // Ask for it explicitly, and if it still isn't granted, start over with a brand-new window.
  const w = spot;
  setTimeout(() => { try { if (w === spot && !w.isDestroyed() && w.isVisible() && !w.isFocused()) { x11.activate(xidOf(w)); w.focus(); } } catch {} }, 120);
  setTimeout(() => {
    try {
      if (w === spot && !w.isDestroyed() && w.isVisible() && !w.isFocused() && !retry) { w.destroy(); spot = null; showSpot(true); }
    } catch {}
  }, 500);
  if (menubar && !menubar.isDestroyed()) menubar.webContents.send('menubar:spot', true);
}
let spotHiddenAt = 0;
function hideSpot() {
  if (spot && !spot.isDestroyed() && spot.isVisible()) { spot.hide(); spotHiddenAt = Date.now(); }
  if (menubar && !menubar.isDestroyed()) menubar.webContents.send('menubar:spot', false);
}
// (clicking the spyglass while the panel is open first blurs it, which hides it: don't reopen it right away)
function toggleSpot() { if (spot && !spot.isDestroyed() && spot.isVisible()) hideSpot(); else if (Date.now() - spotHiddenAt > 350) showSpot(); }
function openSpotItem(it, reveal) {
  hideSpot();
  if (!it) return;
  if (it.type === 'calc') { require('electron').clipboard.writeText(String(it.copy || it.name)); return; }
  if (it.type === 'app') return apps.launch(it.id, []);
  if (it.type === 'setting') { try { require('child_process').spawn('paladin-settings', [it.id], { detached: true, stdio: 'ignore' }).unref(); } catch {} return; }
  if (it.type === 'file') {
    if (reveal) return openBrowser(path.dirname(it.path), { select: it.path });
    if (it.dir) return openBrowser(it.path);
    return openFiles([it.path]);
  }
}

let shapeMode = 'bar';
// While a menu is open the bar does not have keyboard focus (the app keeps it), so grab the
// navigation keys globally, like the classic menu tracking does.
const MENU_KEYS = ['Escape', 'Up', 'Down', 'Left', 'Right', 'Return', 'Enter', 'Space'];
let menuKeysOn = false;
function menuKeys(on) {
  const { globalShortcut } = require('electron');
  if (on === menuKeysOn) return;
  menuKeysOn = on;
  for (const k of MENU_KEYS) {
    try {
      if (on) globalShortcut.register(k, () => { if (menubar && !menubar.isDestroyed()) menubar.webContents.send('menubar:key', k); });
      else globalShortcut.unregister(k);
    } catch {}
  }
}
function setMenubarShape(mode, rects) {
  if (!menubar || menubar.isDestroyed()) return;
  const [w, h] = menubar.getSize();
  shapeMode = mode;
  if (mode === 'bar') menubar.setShape([{ x: 0, y: 0, width: w, height: BAR_H }]);
  else if (mode === 'full') menubar.setShape([{ x: 0, y: 0, width: w, height: h }]);
  else menubar.setShape([{ x: 0, y: 0, width: w, height: BAR_H }, ...(rects || []).map((r) => ({ x: Math.max(0, Math.floor(r.x)), y: Math.max(0, Math.floor(r.y)), width: Math.ceil(r.width), height: Math.ceil(r.height) }))]);
}

function createDesktop(display) {
  const b = display.bounds;
  const win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height, type: 'desktop', frame: false, resizable: false, movable: false,
    minimizable: false, maximizable: false, skipTaskbar: true, show: false, backgroundColor: '#2b4f7e', title: 'Desktop',
    webPreferences: webPrefs({ backgroundThrottling: false }),
  });
  win.setVisibleOnAllWorkspaces(true);
  win.loadFile(path.join(UI, 'desktop.html'), { query: { display: String(display.id), primary: display.id === screen.getPrimaryDisplay().id ? '1' : '0', top: String(display.id === screen.getPrimaryDisplay().id ? BAR_H : 0) } });
  whenReady(win, () => win.showInactive());
  win.on('focus', () => { lastSeekerSurface = win.webContents; });
  win.webContents.on('render-process-gone', () => { desktops.delete(display.id); try { win.destroy(); } catch {} setTimeout(() => createDesktop(display), 500); });
  desktops.set(display.id, win);
}

function syncDesktops() {
  if (FLAGS.noDesktop) return;
  const ds = screen.getAllDisplays();
  for (const [id, w] of [...desktops]) if (!ds.find((d) => d.id === id)) { desktops.delete(id); w.destroy(); }
  for (const d of ds) {
    const w = desktops.get(d.id);
    if (!w) createDesktop(d); else w.setBounds(d.bounds);
  }
  if (menubar && !FLAGS.noMenubar) {
    const b = screen.getPrimaryDisplay().bounds;
    menubar.setBounds(b); setMenubarShape(shapeMode);
  }
}

function normalizeLocation(loc) {
  if (!loc) return null;
  if (loc.startsWith('file://')) { try { return decodeURIComponent(new URL(loc).pathname); } catch { return null; } }
  if (/^trash:/.test(loc)) return 'seeker:trash';
  if (/^computer:/.test(loc)) return 'seeker:computer';
  if (/^applications:/.test(loc)) return 'seeker:apps';
  if (loc.startsWith('~')) return path.join(HOME, loc.slice(1));
  if (fsops.isUtilities(loc)) return 'seeker:apps/Utilities';
  return loc;
}

function defaultLocation() {
  const t = config.get().browser.newWindowTarget;
  const u = userDirs();
  return { home: HOME, desktop: u.DESKTOP, documents: u.DOCUMENTS, computer: 'seeker:computer' }[t] || (t && path.isAbsolute(t) ? t : HOME);
}

let cascade = 0;
function openBrowser(location, opts = {}) {
  location = normalizeLocation(location) || defaultLocation();
  let select = opts.select || null;
  try {
    if (!location.startsWith('seeker:') && fs.existsSync(location) && !fs.statSync(location).isDirectory()) { select = location; location = path.dirname(location); }
  } catch {}
  const c = config.get().browser;
  const wa = screen.getPrimaryDisplay().workArea;
  const off = (cascade++ % 8) * 22;
  const win = new BrowserWindow({
    width: Math.min(c.windowWidth || 820, wa.width - 40), height: Math.min(c.windowHeight || 520, wa.height - 40),
    x: wa.x + 60 + off, y: wa.y + 40 + off, minWidth: 420, minHeight: 240, ...unifiedWindow(),
    show: false, title: 'Seeker', icon: path.join(ASSETS, 'seeker-256.png'),
    webPreferences: webPrefs(),
  });
  const entry = { win, state: {} };
  browsers.set(win.webContents.id, entry);
  win.loadFile(path.join(UI, 'browser.html'), { query: { loc: location, select: select || '', composited: composited ? '1' : '0', framed: '0', unified: '1', view: opts.view || '' } });
  whenReady(win, () => { win.show(); win.focus(); });
  const wcId = win.webContents.id;
  win.on('focus', () => { lastSeekerSurface = win.webContents; pushMenus(); });
  win.on('closed', () => { browsers.delete(wcId); if (lastSeekerSurface && lastSeekerSurface.id === wcId) lastSeekerSurface = null; pushMenus(); });
  win.on('resize', debounce(() => { if (win.isDestroyed() || win.isMaximized()) return; const [w, h] = win.getSize(); config.set({ browser: { windowWidth: w, windowHeight: h } }); }, 800));
  win.on('maximize', () => win.webContents.send('window:state', { maximized: true }));
  win.on('unmaximize', () => win.webContents.send('window:state', { maximized: false }));
  win.on('blur', () => win.webContents.send('window:focus', false));
  win.on('focus', () => win.webContents.send('window:focus', true));
  return win;
}

function smallWindow(file, { width = 420, height = 480, query = {}, resizable = false, title = 'Seeker', parent = null } = {}) {
  const wa = screen.getPrimaryDisplay().workArea;
  const win = new BrowserWindow({
    width, height, x: Math.round(wa.x + (wa.width - width) / 2), y: Math.round(wa.y + Math.max(40, (wa.height - height) / 3)),
    ...framedWindow(), resizable, show: false, title,
    minimizable: true, maximizable: false, icon: path.join(ASSETS, 'seeker-256.png'), parent: parent || undefined,
    webPreferences: webPrefs(),
  });
  // pages without a <title> of their own keep the window's title
  win.on('page-title-updated', (e, t) => { if (!t || /\.html$/.test(t)) e.preventDefault(); });
  win.loadFile(path.join(UI, file), { query: { ...query, composited: composited ? '1' : '0', framed: '1' } });
  whenReady(win, () => { win.show(); win.focus(); });
  win.on('focus', () => pushMenus());
  return win;
}

function openInfo(paths) {
  let i = 0;
  for (const p of paths.slice(0, 12)) {
    const ex = infoWins.get(p);
    if (ex && !ex.isDestroyed()) { ex.show(); ex.focus(); continue; }
    const w = smallWindow('info.html', { width: 300, height: 560, query: { p }, title: `${path.basename(p)} Info` });
    const [x, y] = w.getPosition(); w.setPosition(x + 200 + i * 24, y - 20 + i * 24); i++;
    infoWins.set(p, w);
    w.on('closed', () => infoWins.delete(p));
  }
}

function openPrefs(tab) {
  if (prefsWin && !prefsWin.isDestroyed()) { prefsWin.show(); prefsWin.focus(); if (tab) prefsWin.webContents.send('prefs:tab', tab); return; }
  prefsWin = smallWindow('prefs.html', { width: 640, height: 500, query: { tab: tab || 'general' }, title: 'Seeker Preferences' });
  prefsWin.on('closed', () => { prefsWin = null; });
}

function openAbout(mode, extra = {}) {
  if (aboutWin && !aboutWin.isDestroyed()) aboutWin.close();
  const size = mode === 'computer' ? { width: 300, height: 420 } : { width: 300, height: 300 };
  aboutWin = smallWindow('about.html', { ...size, query: { mode, ...extra }, title: mode === 'computer' ? 'About This Computer' : 'About' });
  aboutWin.on('closed', () => { aboutWin = null; });
}

function openForceQuit() {
  if (forceQuitWin && !forceQuitWin.isDestroyed()) { forceQuitWin.show(); forceQuitWin.focus(); return; }
  forceQuitWin = smallWindow('forcequit.html', { width: 400, height: 420, title: 'Force Quit Applications' });
  forceQuitWin.on('closed', () => { forceQuitWin = null; });
}

// Restart… / Shut Down… / Log Out…: a window that counts down to 0 and then goes ahead by itself.
// The countdown runs here (not in the page), against a fixed deadline, so it stays on time even when the
// window is hidden or the computer is busy. Resolves true to go ahead, false when cancelled or closed.
const POWER_SECONDS = 60;
let powerAsk = null;   // { win, timer, resolve }
function confirmPower(what) {
  if (powerAsk) { powerAsk.finish(false); }          // a new choice replaces the one on screen
  return new Promise((resolve) => {
    const title = { shutdown: 'Shut Down', restart: 'Restart', logout: 'Log Out' }[what] || 'Shut Down';
    const win = smallWindow('power.html', { width: 440, height: 160, query: { what, seconds: String(POWER_SECONDS) }, title });
    try { win.setAlwaysOnTop(true, 'modal-panel'); } catch {}
    // the 60 seconds start once the window is on screen (on a busy computer it can take a moment to draw)
    let deadline = 0;
    let last = POWER_SECONDS;
    const ask = { win, done: false };
    win.once('show', () => { deadline = Date.now() + POWER_SECONDS * 1000; });
    ask.finish = (go) => {
      if (ask.done) return; ask.done = true;
      clearInterval(ask.timer);
      if (powerAsk === ask) powerAsk = null;
      if (!win.isDestroyed()) win.destroy();
      resolve(!!go);
    };
    ask.timer = setInterval(() => {
      if (!deadline) return;                         // not on screen yet
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (left !== last && !win.isDestroyed()) { last = left; win.webContents.send('power:tick', left); }
      if (left <= 0) ask.finish(true);
    }, 250);
    win.on('closed', () => ask.finish(false));       // the close button (or the window manager) cancels
    powerAsk = ask;
  });
}
ipcMain.on('power:answer', (e, go) => {
  if (powerAsk && !powerAsk.win.isDestroyed() && e.sender === powerAsk.win.webContents) powerAsk.finish(go === true);
});

function openHelp() {
  if (helpWin && !helpWin.isDestroyed()) { helpWin.show(); helpWin.focus(); return; }
  helpWin = smallWindow('help.html', { width: 520, height: 560, resizable: true, title: 'Seeker Help' });
  helpWin.on('closed', () => { helpWin = null; });
}

// ------------------------------------------------------------------ Quick Look
function toggleQuickLook(items, index = 0, sender) {
  if (quicklook && !quicklook.isDestroyed()) { quicklook.close(); quicklook = null; return; }
  if (!items || !items.length) return;
  const wa = screen.getPrimaryDisplay().workArea;
  const w = Math.min(760, wa.width - 80), h = Math.min(600, wa.height - 80);
  quicklook = new BrowserWindow({
    width: w, height: h, x: Math.round(wa.x + (wa.width - w) / 2), y: Math.round(wa.y + (wa.height - h) / 2.4),
    frame: false, transparent: composited, backgroundColor: composited ? '#00000000' : '#262626', show: false, focusable: false,
    alwaysOnTop: true, skipTaskbar: true, resizable: true, title: 'Quick Look',
    webPreferences: webPrefs({ plugins: true }),
  });
  quicklook.loadFile(path.join(UI, 'quicklook.html'), { query: { composited: composited ? '1' : '0' } });
  whenReady(quicklook, () => { quicklook.showInactive(); quicklook.webContents.send('ql:show', { items, index }); });
  quicklook.on('closed', () => { quicklook = null; if (sender && !sender.isDestroyed()) sender.send('ql:closed'); });
}

// ------------------------------------------------------------------ active app tracking & menus
let activeSeq = 0;
let lastActive = 0;
const INTERPRETERS = /^(python[\d.]*|perl|ruby|node|nodejs|sh|bash|dash|java|mono|gjs|lua[\d.]*|php[\d.]*|wish|tclsh)$/;
async function onActiveWindow(id) {
  const seq = ++activeSeq;
  if (process.env.SEEKER_DEBUG) console.log('[active]', x11.hex(id), 'last', x11.hex(lastActive), 'menubar', menubar ? x11.hex(xidOf(menubar)) : '-');
  const own = ownXids();
  // The menu bar never keeps focus: give it straight back to the window that had it.
  if (menubar && id === xidOf(menubar)) { if (lastActive && x11.clients.includes(lastActive)) x11.activate(lastActive); return; }
  if (quicklook && !quicklook.isDestroyed() && id === xidOf(quicklook)) return;
  if (!id) return;                      // nothing focused: keep showing the current app's menus
  lastActive = id;
  if (!front.seeker && front.xid === id) return;   // same window regained focus (e.g. after a menu-bar click)
  if (own.has(id)) { setFront({ seeker: true }); return; }
  for (const d of desktops.values()) d.webContents.send('menus:close');   // another app came forward
  const info = await x11.info(id, true);
  if (seq !== activeSeq) return;
  if (!info || info.type === 'desktop' || info.type === 'dock' || info.pid === process.pid) { setFront({ seeker: true }); return; }
  const parent = info.transientFor ? await x11.info(info.transientFor) : null;
  // A dialog shown for an app by a helper (the file chooser portal, say) belongs to that app.
  const ownEntry = apps.forWindow(info), parentEntry = parent && apps.forWindow(parent);
  const appEntry = parentEntry && (!ownEntry || !ownEntry.shown || /portal/i.test(info.cls || '')) ? parentEntry : (ownEntry || parentEntry);
  const name = appEntry ? appEntry.name : prettyName(info);
  const f = { seeker: false, xid: id, info, parent, app: appEntry ? { id: appEntry.id, name, icon: appEntry.icon, comment: appEntry.comment } : { id: null, name, icon: null }, key: appEntry ? appEntry.id : (info.cls || '').toLowerCase(), source: null };
  setFront(f);
  if (appEntry) { persisted.recentApps = [appEntry.id, ...persisted.recentApps.filter((x) => x !== appEntry.id)].slice(0, 20); savePersisted(); }
  attachSource(f);
}

async function attachSource(f, attempt = 0) {
  const appmenu = require('./appmenu');
  let src = sources.get(f.xid);
  if (!src) {
    const info = await x11.info(f.xid, true);
    if (info) f.info = info;
    src = await appmenu.sourceFor(f.info, f.parent);
    if (src) {
      sources.set(f.xid, src);
      src.on('changed', () => { if (front.xid === f.xid) pushMenus(); });
    }
  }
  if (front !== f) return;
  if (src) { f.source = src; pushMenus(); return; }
  // GTK sets its menu properties, and apps register with the registrar, shortly after mapping.
  if (attempt < 3) setTimeout(() => { if (front === f) attachSource(f, attempt + 1); }, [250, 800, 2000][attempt]);
}

function prettyClass(c) {
  let s = String(c || 'Application').replace(/\.(py|sh|js|pl|rb|bin|AppImage)$/i, '');
  if (/^[a-z]+(\.[A-Za-z0-9_-]+){2,}$/i.test(s)) s = s.split('.').pop();    // reverse-DNS ids
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function prettyName(info) {
  const cands = [info.cls, info.instance].filter(Boolean);
  const good = cands.find((c) => !/\.(py|sh|js|pl|rb)$/i.test(c) && !INTERPRETERS.test(c.toLowerCase())) || cands[0];
  return prettyClass(good);
}

function setFront(f) {
  if (front.seeker && f.seeker) { pushMenus(); return; }
  front = f;
  closeMenusIfOpen();
  pushMenus();
}
function closeMenusIfOpen() { if (menubar && !menubar.isDestroyed()) menubar.webContents.send('menubar:close'); }

// ---- menu building ----
const sep = () => ({ type: 'separator' });
const item = (id, label, o = {}) => ({ id, label, enabled: o.enabled !== false, accel: o.accel || null, toggle: o.toggle || null, checked: !!o.checked, children: o.children || [], submenu: !!o.children, icon: o.icon || null, header: !!o.header });
const K = (key, ...mods) => ({ key, mods: mods.length ? mods : ['ctrl'] });

function surfaceState() {
  const wc = lastSeekerSurface && !lastSeekerSurface.isDestroyed() ? lastSeekerSurface : null;
  if (!wc) return { kind: 'none' };
  const b = browsers.get(wc.id);
  if (b) return { kind: 'browser', ...b.state };
  for (const w of desktops.values()) if (w.webContents === wc) return { kind: 'desktop', ...(desktopState.get(wc.id) || {}) };
  return { kind: 'none' };
}
const desktopState = new Map();

function shieldMenu() {
  const c = config.get();
  const recentApps = persisted.recentApps.map((id) => apps.get(id)).filter(Boolean).slice(0, c.recentLimit);
  const docs = extras.recentDocuments(c.recentLimit);
  const folders = persisted.recentFolders.filter((p) => p.startsWith('seeker:') || fs.existsSync(p)).slice(0, c.recentLimit);
  const recent = [
    item('p:none', 'Applications', { enabled: false, header: true }),
    ...(recentApps.length ? recentApps.map((a) => item(`r:app:${a.id}`, a.name, { icon: [a.icon, 'application-x-executable'] })) : [item('p:none', 'No Recent Applications', { enabled: false })]),
    sep(), item('p:none', 'Documents', { enabled: false, header: true }),
    ...(docs.length ? docs.map((d) => item(`r:doc:${d.path}`, d.name, { icon: mime.iconNames(mime.detect(d.path, d.name)) })) : [item('p:none', 'No Recent Documents', { enabled: false })]),
    sep(), item('p:none', 'Folders', { enabled: false, header: true }),
    ...(folders.length ? folders.map((p) => item(`r:dir:${p}`, fsops.displayName(p), { icon: ['folder'] })) : [item('p:none', 'No Recent Folders', { enabled: false })]),
    sep(), item('p:clearRecent', 'Clear Menu'),
  ];
  const sw = extras.firstCommand(c.softwareUpdate), sp = extras.firstCommand(c.systemPreferences), st = extras.firstCommand(c.appStore || []);
  return {
    id: 'p:root', label: 'palOS', shield: true, children: [
      item('p:about', 'About This Computer'), sep(),
      ...(sw ? [item('p:update', 'Software Update…')] : []),
      ...(st ? [item('p:store', 'palOS Store…')] : []),
      ...(sp ? [item('p:prefs', 'System Settings…')] : []),
      ...(sw || sp || st ? [sep()] : []),
      item('p:recent', 'Recent Items', { children: recent }), sep(),
      item('p:forcequit', 'Force Quit…'), sep(),
      item('p:sleep', 'Sleep'), item('p:restart', 'Restart…'), item('p:shutdown', 'Shut Down…'), sep(),
      item('p:logout', `Log Out ${os.userInfo().username}…`),
    ],
  };
}

function seekerMenus() {
  const s = surfaceState();
  const isB = s.kind === 'browser';
  const sel = s.selection || 0;
  const writable = s.canWrite !== false;
  const trashN = fsops.trashCount();
  const view = s.view || config.get().browser.view;
  const cfgB = config.get().browser;
  const seekerWins = [...browsers.values()].map((b) => b.win).filter((w) => !w.isDestroyed());
  const recentFolders = persisted.recentFolders.filter((p) => p.startsWith('seeker:') || fs.existsSync(p)).slice(0, 10);
  return [
    { id: 's:menu-app', label: 'Seeker', bold: true, children: [
      item('s:about', 'About Seeker'), sep(),
      item('s:prefs', 'Preferences…', { accel: K(',') }), sep(),
      item('s:emptyTrash', 'Empty Trash…', { accel: K('BackSpace', 'ctrl', 'shift'), enabled: trashN > 0 }), sep(),
      item('s:hide', 'Hide Seeker', { accel: K('h'), enabled: seekerWins.length > 0 }), item('s:hideOthers', 'Hide Others', { accel: K('h', 'ctrl', 'alt') }), item('s:showAll', 'Show All'),
    ] },
    { id: 's:menu-file', label: 'File', children: [
      item('s:newWindow', 'New Seeker Window', { accel: K('n') }),
      item('s:newFolder', 'New Folder', { accel: K('n', 'ctrl', 'shift'), enabled: (isB ? writable : true) && !s.virtual }),
      item('s:open', 'Open', { accel: K('o'), enabled: sel > 0 }),
      item('s:close', 'Close Window', { accel: K('w'), enabled: isB }), sep(),
      item('s:info', 'Get Info', { accel: K('i'), enabled: sel > 0 || isB }), sep(),
      item('s:duplicate', 'Duplicate', { accel: K('d'), enabled: sel > 0 && writable && !s.inTrash }),
      item('s:alias', 'Make Alias', { accel: K('l'), enabled: sel > 0 && writable && !s.inTrash }),
      item('s:extract', 'Extract Here', { enabled: sel > 0 && !!s.archivesSelected && !s.inTrash }),
      item('s:compress', sel > 1 ? `Compress ${sel} Items` : 'Compress', { enabled: sel > 0 && writable && !s.inTrash && !s.virtual && s.canDelete !== false }),
      item('s:quicklook', sel > 1 ? `Quick Look ${sel} Items` : 'Quick Look', { accel: K('y'), enabled: sel > 0 }), sep(),
      ...(s.inTrash ? [item('s:putBack', 'Put Back', { enabled: sel > 0 })] : []),
      item('s:trash', 'Move to Trash', { accel: K('BackSpace'), enabled: sel > 0 && !s.inTrash && !s.volumeSelected && s.canDelete !== false }),
      item('s:eject', 'Eject', { accel: K('e'), enabled: !!s.volumeSelected }), sep(),
      item('s:find', 'Find', { accel: K('f') }),
    ] },
    { id: 's:menu-edit', label: 'Edit', children: [
      item('s:undo', 'Undo', { accel: K('z'), enabled: false }), sep(),
      item('s:cut', 'Cut', { accel: K('x'), enabled: sel > 0 && writable }),
      item('s:copy', 'Copy', { accel: K('c'), enabled: sel > 0 }),
      item('s:paste', 'Paste', { accel: K('v'), enabled: writable && !s.virtual && !!clip.paths.length }),
      item('s:selectAll', 'Select All', { accel: K('a') }),
    ] },
    { id: 's:menu-view', label: 'View', children: [
      item('s:view-icon', 'as Icons', { accel: K('1'), toggle: 'radio', checked: view === 'icon', enabled: isB }),
      item('s:view-list', 'as List', { accel: K('2'), toggle: 'radio', checked: view === 'list', enabled: isB }),
      item('s:view-column', 'as Columns', { accel: K('3'), toggle: 'radio', checked: view === 'column', enabled: isB }),
      item('s:view-flow', 'as Carousel', { accel: K('4'), toggle: 'radio', checked: view === 'flow', enabled: isB }), sep(),
      item('s:cleanUp', 'Clean Up', { enabled: !isB || view === 'icon' }),
      item('s:arrange', 'Arrange By', { children: [
        item('s:arrange-name', 'Name', { accel: K('1', 'ctrl', 'alt') }), item('s:arrange-mtime', 'Date Modified', { accel: K('2', 'ctrl', 'alt') }),
        item('s:arrange-ctime', 'Date Created', { accel: K('3', 'ctrl', 'alt') }), item('s:arrange-size', 'Size', { accel: K('4', 'ctrl', 'alt') }),
        item('s:arrange-kind', 'Kind', { accel: K('5', 'ctrl', 'alt') }),
      ] }), sep(),
      item('s:toggleHidden', 'Show Hidden Files', { accel: K('period', 'ctrl', 'shift'), toggle: 'check', checked: cfgB.showHidden }),
      item('s:togglePathBar', cfgB.showPathBar ? 'Hide Path Bar' : 'Show Path Bar', { enabled: isB }),
      item('s:toggleStatusBar', cfgB.showStatusBar ? 'Hide Status Bar' : 'Show Status Bar', { enabled: isB }),
      item('s:toggleToolbar', s.toolbarHidden ? 'Show Toolbar' : 'Hide Toolbar', { accel: K('t', 'ctrl', 'alt'), enabled: isB }),
    ] },
    { id: 's:menu-go', label: 'Go', children: [
      item('s:back', 'Back', { accel: K('['), enabled: isB && !!s.canBack }),
      item('s:forward', 'Forward', { accel: K(']'), enabled: isB && !!s.canForward }),
      item('s:up', 'Enclosing Folder', { accel: K('Up'), enabled: isB && !!s.canUp }), sep(),
      item('s:go-computer', 'Computer', { accel: K('c', 'ctrl', 'shift'), icon: ['computer'] }),
      item('s:go-home', 'Home', { accel: K('h', 'ctrl', 'shift'), icon: ['user-home'] }),
      item('s:go-desktop', 'Desktop', { accel: K('d', 'ctrl', 'shift'), icon: ['user-desktop'] }),
      item('s:go-apps', 'Applications', { accel: K('a', 'ctrl', 'shift'), icon: ['folder-applications', 'applications-other'] }),
      item('s:go-documents', 'Documents', { accel: K('o', 'ctrl', 'shift'), icon: ['folder-documents'] }),
      item('s:go-downloads', 'Downloads', { accel: K('l', 'ctrl', 'alt'), icon: ['folder-download'] }),
      item('s:go-trash', 'Trash', { icon: ['user-trash'] }), sep(),
      item('s:recentFolders', 'Recent Folders', { children: recentFolders.length ? [...recentFolders.map((p) => item(`r:dir:${p}`, fsops.displayName(p), { icon: ['folder'] })), sep(), item('s:clearRecentFolders', 'Clear Menu')] : [item('p:none', 'No Recent Folders', { enabled: false })] }), sep(),
      item('s:gotoFolder', 'Go to Folder…', { accel: K('g', 'ctrl', 'shift') }),
    ] },
    { id: 's:menu-window', label: 'Window', children: [
      item('s:minimize', 'Minimize', { accel: K('m'), enabled: isB }),
      item('s:zoom', 'Zoom', { enabled: isB }), sep(),
      item('s:front', 'Bring All to Front', { enabled: seekerWins.length > 0 }),
      ...(seekerWins.length ? [sep()] : []),
      ...seekerWins.map((w) => item(`s:win-${w.webContents.id}`, w.getTitle() || 'Seeker', { toggle: 'check', checked: lastSeekerSurface && w.webContents.id === lastSeekerSurface.id && w.isFocused() })),
    ] },
    { id: 's:menu-help', label: 'Help', children: [item('s:help', 'Seeker Help'), item('s:shortcuts', 'Keyboard Shortcuts')] },
  ];
}

async function foreignMenus(f) {
  const name = f.app.name;
  const src = f.source;
  const root = src ? src.root : null;
  let top = root ? (root.children || []).filter((c) => c.type !== 'separator') : [];
  const appMenuItems = root && root.appMenu && root.appMenu.length ? [...root.appMenu, sep()] : [item('f:about', `About ${name}`), sep()];
  // An app whose first menu is named after itself (Electron apps, Paladin's own) gets that menu as the
  // bold app menu. Its items are often filled only when opened, so the menu itself is used as is.
  let ownApp = null;
  const firstLabel = top.length ? String(top[0].label || '').replace(/_/g, '').trim().toLowerCase() : '';
  if (firstLabel && (firstLabel === String(name).toLowerCase() || firstLabel === String(f.app.id || '').replace(/^paladin-/, '').toLowerCase())) {
    ownApp = { ...top[0], label: name, bold: true };
    top = top.slice(1);
  }
  const windows = (await x11.allInfo()).filter((w) => w.normal && sameApp(w, f));
  const menus = ownApp ? [ownApp] : [{ id: 'f:menu-app', label: name, bold: true, children: [
    ...appMenuItems,
    item('f:hide', `Hide ${name}`), item('f:hideOthers', 'Hide Others'), item('f:showAll', 'Show All'), sep(),
    item('f:quit', `Quit ${name}`),
  ] }];
  if (top.length) {
    menus.push(...top.map((t) => (t.submenu || (t.children && t.children.length) ? t : { ...t, children: [], submenu: false, direct: true })));
  } else {
    // No menus shared by the app: menus whose items press the app's own shortcuts (keymenus.js).
    const spec = require('./keymenus').forApp(f.app, f.info && f.info.cls);
    const keyItem = (x, i, label) => {
      if (x === '-') return sep();
      const [text, combo] = x;
      const parts = String(combo).split('+'); const key = parts.pop();
      const accel = { mods: parts.map((m) => m.toLowerCase()), key: { plus: '+', minus: '-' }[key] || key };
      return item(`k:${combo}`, text, { accel });
    };
    const specMenus = spec.menus.map((m, i) => ({ id: `k:menu-${i}`, label: m.label, children: m.items.map((x) => keyItem(x)) }));
    if (!specMenus.some((m) => /^(file|fichier)$/i.test(m.label))) menus.push({ id: 'f:menu-file', label: 'File', children: [item('f:close', 'Close Window', { enabled: !!windows.length })] });
    menus.push(...specMenus);
  }
  const hasWindowMenu = top.some((t) => /^(window|fen[êe]tre)$/i.test(String(t.label || '').replace(/_/g, '').trim()));   // the app's own menu may already be in French
  if (!hasWindowMenu) {
    menus.push({ id: 'f:menu-window', label: 'Window', children: [
      item('f:minimize', 'Minimize', { enabled: !!windows.length }), item('f:zoom', 'Zoom', { enabled: !!windows.length }), sep(),
      item('f:front', 'Bring All to Front', { enabled: !!windows.length }),
      ...(windows.length ? [sep(), ...windows.map((w) => item(`w:${w.id}`, w.title || name, { toggle: 'check', checked: w.id === f.xid }))] : []),
    ] });
  }
  return menus;
}

function sameApp(w, f) {
  if (f.app.id) { const a = apps.forWindow(w); return a && a.id === f.app.id; }
  return (w.cls || '').toLowerCase() === f.key;
}

let pushTimer = null;
function pushMenus() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    if (!menubar || menubar.isDestroyed()) return;
    let menus, appInfo;
    try {
      if (front.seeker) { menus = seekerMenus(); appInfo = { name: 'Seeker', seeker: true }; }
      else { menus = await foreignMenus(front); appInfo = { name: front.app.name, seeker: false }; }
    } catch (e) { console.error('[menus]', e); menus = seekerMenus(); appInfo = { name: 'Seeker', seeker: true }; }
    // the menu bar may have been replaced while the menus were being read
    if (!menubar || menubar.isDestroyed() || menubar.webContents.isDestroyed()) return;
    try { menubar.webContents.send('menubar:menus', { app: appInfo, shield: shieldMenu(), menus }); } catch {}
  }, 30);
}

// ------------------------------------------------------------------ command handling
async function shieldCommand(id) {
  const c = config.get();
  switch (id) {
    case 'p:about': return openAbout('computer');
    case 'p:update': { const cmd = extras.firstCommand(c.softwareUpdate); if (cmd) detached(cmd[0], cmd.slice(1)); return; }
    case 'p:store': { const cmd = extras.firstCommand(c.appStore || []); if (cmd) detached(cmd[0], cmd.slice(1)); return; }
    case 'p:prefs': { const cmd = extras.firstCommand(c.systemPreferences); if (cmd) detached(cmd[0], cmd.slice(1)); return; }
    case 'p:clearRecent': persisted.recentApps = []; persisted.recentFolders = []; savePersisted(); extras.clearRecentDocuments(); return pushMenus();
    case 'p:forcequit': return openForceQuit();
    case 'p:sleep': return extras.power.sleep();
    case 'p:restart': case 'p:shutdown': case 'p:logout': {
      // asks, and counts down from 60: Cancel stops it, the button or reaching 0 goes ahead
      if (!(await confirmPower(id.slice(2)))) return;
      await quitPolitely();
      if (id === 'p:restart') return extras.power.restart();
      if (id === 'p:shutdown') return extras.power.shutDown();
      return extras.power.logOut(wmName || await x11.wmName());
    }
  }
}

// Before Restart / Shut Down / Log Out: apps that keep a session of their own are asked to close their windows
// and given time to save it, instead of being stopped mid-write when the session ends (a stopped Firefox greets
// you next time with "Firefox closed unexpectedly" and offers to restore a session it never lost).
const QUIT_POLITELY = /^(firefox|firefox-esr|librewolf|thunderbird)$/i;
async function quitPolitely(limitMs = 15000) {
  try {
    const wins = (await x11.allInfo()).filter((w) => w.normal && w.pid && QUIT_POLITELY.test(w.cls || ''));
    if (!wins.length) return;
    const pids = new Set(wins.map((w) => w.pid));
    for (const w of wins) await x11.close(w.id);
    const alive = (p) => { try { process.kill(p, 0); return true; } catch { return false; } };
    const until = Date.now() + limitMs;
    while ([...pids].some(alive) && Date.now() < until) await new Promise((r) => setTimeout(r, 250));
  } catch (e) { console.error('[power] quitting apps:', e.message); }
}

function recentCommand(id) {
  const [, kind, ...rest] = id.split(':'); const v = rest.join(':');
  if (kind === 'app') apps.launch(v);
  else if (kind === 'doc') openFiles([v]);
  else if (kind === 'dir') openBrowser(v);
}

async function foreignCommand(id) {
  const f = front;
  if (f.seeker) return;
  const windows = (await x11.allInfo()).filter((w) => w.normal && sameApp(w, f));
  switch (id) {
    case 'f:about': return openAbout('app', { name: f.app.name, icon: f.app.icon || '', comment: f.app.comment || '', id: f.app.id || '', cls: f.info.cls || '' });
    case 'f:hide': for (const w of windows) await x11.minimize(w.id); return;
    case 'f:hideOthers': {
      for (const w of (await x11.allInfo())) if (w.normal && !sameApp(w, f) && w.pid !== process.pid) await x11.minimize(w.id);
      for (const b of browsers.values()) b.win.minimize();
      return;
    }
    case 'f:showAll': for (const w of (await x11.allInfo())) if (w.normal && w.hidden) await x11.activate(w.id); return x11.activate(f.xid);
    case 'f:quit': for (const w of windows) await x11.close(w.id); return;
    case 'f:close': return x11.close(f.xid);
    case 'f:minimize': return x11.minimize(f.xid);
    case 'f:zoom': return x11.toggleMaximize(f.xid);
    case 'f:front': for (const w of windows) await x11.activate(w.id); return x11.activate(f.xid);
  }
  if (id.startsWith('k:')) {
    // Press the app's shortcut in its own window.
    await x11.activate(f.xid);
    await new Promise((r) => setTimeout(r, 120));
    return util.sh('palos-x', ['key', id.slice(2)]);
  }
}

const GLOBAL_SEEKER = new Set(['s:about', 's:prefs', 's:emptyTrash', 's:newWindow', 's:hide', 's:hideOthers', 's:showAll', 's:front', 's:help', 's:shortcuts', 's:clearRecentFolders', 's:toggleHidden']);
async function seekerCommand(id, target) {
  const cmd = id.slice(2);
  if (cmd.startsWith('win-')) { const b = browsers.get(+cmd.slice(4)); if (b) { b.win.show(); b.win.focus(); } return; }
  if (cmd.startsWith('go-') && !browserTarget(target)) {
    const map = { 'go-computer': 'seeker:computer', 'go-home': HOME, 'go-desktop': userDirs().DESKTOP, 'go-apps': 'seeker:apps', 'go-documents': userDirs().DOCUMENTS, 'go-downloads': userDirs().DOWNLOAD, 'go-trash': 'seeker:trash' };
    return openBrowser(map[cmd]);
  }
  switch (id) {
    case 's:about': return openAbout('seeker');
    case 's:prefs': return openPrefs();
    case 's:help': return openHelp();
    case 's:shortcuts': return openHelp();
    case 's:emptyTrash': return emptyTrashConfirm();
    case 's:newWindow': return openBrowser(null);
    case 's:hide': for (const b of browsers.values()) b.win.minimize(); return;
    case 's:hideOthers': for (const w of (await x11.allInfo())) if (w.normal && w.pid !== process.pid) await x11.minimize(w.id); return;
    case 's:showAll': for (const w of (await x11.allInfo())) if (w.normal && w.hidden) await x11.activate(w.id); for (const b of browsers.values()) b.win.restore(); return;
    case 's:front': for (const b of browsers.values()) { b.win.restore(); b.win.show(); } return;
    case 's:clearRecentFolders': persisted.recentFolders = []; savePersisted(); return pushMenus();
    case 's:toggleHidden': { config.set({ browser: { showHidden: !config.get().browser.showHidden } }); return; }
    case 's:gotoFolder': case 's:find':
      if (!browserTarget(target)) { const w = openBrowser(null); w.webContents.once('did-finish-load', () => setTimeout(() => w.webContents.send('command', cmd), 300)); return; }
  }
  // Everything else goes to the focused browser window, or to the desktop.
  const wc = target && !target.isDestroyed() ? target : null;
  if (wc) wc.send('command', cmd);
  else if (['newFolder', 'paste', 'selectAll', 'cleanUp', 'info'].includes(cmd) || cmd.startsWith('arrange')) {
    const d = desktops.get(screen.getPrimaryDisplay().id); if (d) d.webContents.send('command', cmd);
  }
}
function browserTarget(wc) { return wc && !wc.isDestroyed() && browsers.has(wc.id); }

async function emptyTrashConfirm(parent) {
  const n = fsops.trashCount();
  if (!n) return;
  const r = await showBox(parent, { type: 'warning', buttons: ['Cancel', 'Empty Trash'], defaultId: 1, cancelId: 0, title: 'Empty Trash',
    message: 'Are you sure you want to permanently erase the items in the Trash?', detail: 'You can’t undo this action.', icon: nativeImage.createFromPath(path.join(ASSETS, 'seeker-64.png')) });
  if (r.response === 1) { await fsops.emptyTrash(); broadcast('trash:changed'); pushMenus(); }
}

function menuActivate(id) {
  if (id.startsWith('p:')) return shieldCommand(id);
  if (id.startsWith('r:')) return recentCommand(id);
  if (id.startsWith('s:')) return seekerCommand(id, lastSeekerSurface);
  if (id.startsWith('f:') || id.startsWith('k:')) return foreignCommand(id);
  if (id.startsWith('w:')) return x11.activate(+id.slice(2));
  if ((id.startsWith('d:') || id.startsWith('g:')) && front.source) {
    const f = front;
    // Give focus back to the app before activating (some apps act on the focused window).
    return x11.activate(f.xid).then(() => f.source.activate(id));
  }
}

// ------------------------------------------------------------------ opening files
function openFiles(paths, appId) {
  // Files bound for the same app go to it in one launch (players queue every song); apps whose launcher takes one file at a time still get one launch per file.
  const groups = new Map();
  for (const p of paths) {
    let st; try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) { openBrowser(p); continue; }
    if (/\.(app|appimage)$/i.test(p) && !appId && st.isFile()) {
      // an app opens: registered ones as themselves; any other (a download, one built for other Linux systems)
      // through palos-open-app, which readies it, runs it and offers to move it into Applications
      const a = apps.byAppPath(p);
      if (a) apps.launch(a); else detached('/usr/bin/palos-open-app', [p], { cwd: path.dirname(p) });
      continue;
    }
    if (p.endsWith('.desktop') && !appId) {
      const id = path.basename(p, '.desktop');
      const a = apps.get(id);
      if (a && a.file === p) { apps.launch(a); continue; }
      const parsed = apps.parseDesktop(p);
      if (parsed.Exec) { apps.launch({ id, file: p, name: parsed.Name || id, exec: parsed.Exec, icon: parsed.Icon, terminal: parsed.Terminal === 'true', cwd: parsed.Path || null }); continue; }
    }
    const type = mime.detect(p, path.basename(p), st);
    let a = appId ? apps.get(appId) : apps.defaultFor(type);
    if (a && a.id === 'paladin-seeker') a = null;   // Seeker is the handler (.deb): it opens these itself, below
    extras.addRecentDocument(p);
    if (a) { const g = groups.get(a.id) || { app: a, files: [] }; g.files.push(p); groups.set(a.id, g); }
    else if (archive.canExtract(path.basename(p), type)) {
      // no archive app set up: opening an archive unpacks it next to itself, like palOS
      archive.extractHere(p, { askPassword: (n, retry) => promptPassword(null, { archive: n, retry }) })
        .then((r) => { if (r.error) showError(null, r.error, r.detail); else if (r.deb) debNote(path.basename(p), r.path); });      // the folder's watcher shows the result
    }
    else if (st.mode & 0o111 && /executable|shellscript/.test(type)) detached(p, [], { cwd: path.dirname(p) });
    else shell.openPath(p);
  }
  for (const { app, files } of groups.values()) apps.launch(app, files);
}

// ------------------------------------------------------------------ clipboard (shared with other file managers)
const clip = { paths: [], cut: false };
function setClipboard(paths, cut) {
  clip.paths = paths; clip.cut = cut;
  const uris = paths.map((p) => thumbs.uriFor(p));
  try {
    clipboard.writeBuffer('x-special/gnome-copied-files', Buffer.from(`${cut ? 'cut' : 'copy'}\n${uris.join('\n')}`));
    clipboard.writeBuffer('text/uri-list', Buffer.from(uris.join('\r\n') + '\r\n'));
  } catch {}
  try { clipboard.writeText(paths.join('\n')); } catch {}
  pushMenus();
}
function readClipboard() {
  try {
    const g = clipboard.readBuffer('x-special/gnome-copied-files').toString();
    if (g) {
      const [op, ...uris] = g.split('\n').filter(Boolean);
      const paths = uris.filter((u) => u.startsWith('file://')).map((u) => decodeURIComponent(new URL(u).pathname));
      if (paths.length) return { paths, cut: op === 'cut' };
    }
  } catch {}
  return clip;
}

// ------------------------------------------------------------------ IPC
function senderWin(e) { return e && e.sender ? BrowserWindow.fromWebContents(e.sender) : null; }
/** Dialogs can't be attached to the desktop or the menu bar (they sit under/over everything and the
    dialog never shows), so those get a free-standing dialog that stays on top. */
function dialogParent(win) {
  if (!win || win.isDestroyed()) return null;
  if (win === menubar || [...desktops.values()].includes(win)) return null;
  return win;
}
function showBox(win, opts) {
  if (opts && opts.type === 'error') { try { const c = spawn('palos-sound', ['error'], { detached: true, stdio: 'ignore' }); c.on('error', () => {}); c.unref(); } catch {} }
  const parent = dialogParent(win);
  if (parent) return sheet.message(parent, opts);          // a sheet from the top of the window it belongs to
  return dialog.showMessageBox({ ...opts, modal: false });
}

async function askConflict(win, name, isDir, move) {
  const r = await showBox(win, {
    type: 'warning', buttons: ['Keep Both', 'Stop', 'Replace'], defaultId: 0, cancelId: 1, title: 'Seeker',
    // four whole sentences, so each language can translate them (build 26 pieced one together from English words)
    message: isDir
      ? (move ? `A folder named “${name}” already exists in this location. Do you want to replace it with the one you’re moving?`
              : `A folder named “${name}” already exists in this location. Do you want to replace it with the one you’re copying?`)
      : (move ? `An item named “${name}” already exists in this location. Do you want to replace it with the one you’re moving?`
              : `An item named “${name}” already exists in this location. Do you want to replace it with the one you’re copying?`),
    icon: nativeImage.createFromPath(path.join(ASSETS, 'seeker-64.png')),
  });
  return ['keep', 'stop', 'replace'][r.response];
}
// Part of palOS itself (settings and the hardware): these stay installed. Everyday apps (browsers, office,
// image editors, games…) are .apps that uninstall by moving them to the Trash.
const SYSTEM_APPS = new Set(['Settings', 'Time Turner', 'Activity Monitor', 'Advanced Network Settings', 'Bluetooth Manager',
  'Disk Utility', 'Passkeys', 'Printers', 'Scanner', 'Terminal', 'Remote Disc', 'Fonts', 'Symbols']);
/** The palOS Store package an app's entry came from: { deb } or { snap }, or null when it's part of palOS.
 *  palOS's own packages are listed in /usr/share/palos/base-packages (made when the USB image is built). */
let BASE_PKGS = null;
function storePackage(desktopFile) {
  try {
    const m = /^\/var\/lib\/snapd\/desktop\/applications\/([a-z0-9-]+)_/.exec(desktopFile);
    if (m) return { snap: m[1] };
    if (!BASE_PKGS) BASE_PKGS = new Set(fs.readFileSync('/usr/share/palos/base-packages', 'utf8').split('\n').map((x) => x.trim()).filter(Boolean));
    const out = require('child_process').execFileSync('dpkg-query', ['-S', desktopFile], { encoding: 'utf8', timeout: 5000 });
    const pkg = out.split(':')[0].trim();
    if (!pkg || BASE_PKGS.has(pkg) || !/^[a-z0-9][a-z0-9+.-]*$/.test(pkg)) return null;
    return { deb: pkg };
  } catch { return null; }
}
/** The Utilities folder can't be thrown away: say so, kindly. */
function sorry(win) {
  return sheet.message(win && !win.isDestroyed() ? win : null, { type: 'warning', message: 'Sorry, I can’t do that.', detail: 'The Utilities folder is part of palOS, so it can’t be moved to the Trash.', buttons: ['OK'] }).catch(() => {});
}

/** a .deb was opened: say what happened, once per file */
async function debNote(name, folder) {
  await showBox(null, { type: 'info', buttons: ['Open the palOS Store', 'OK'], defaultId: 1, cancelId: 1, title: 'Seeker',
    message: `palOS doesn’t install .deb packages. “${name}” was opened as a folder.`,
    detail: `The folder “${path.basename(folder)}” holds the files inside the package. Apps for palOS come from the palOS Store, as .app or .pack.`,
    icon: nativeImage.createFromPath(path.join(ASSETS, 'seeker-64.png')) }).then((r) => {
    if (r && r.response === 0) { const cmd = extras.firstCommand(config.get().appStore || []); if (cmd) detached(cmd[0], cmd.slice(1)); }
  }).catch(() => {});
  openBrowser(folder);
}
async function showError(win, message, detail) {
  await showBox(win, { type: 'error', buttons: ['OK'], title: 'Seeker', message, detail: detail || undefined, icon: nativeImage.createFromPath(path.join(ASSETS, 'seeker-64.png')) });
}

// Moving things to the Trash (apps: uninstalling them). Used by Seeker's windows, and by the Dock's Trash (seeker --trash PATH…).
let trashPaths = null;
function setupIpc() {
  const H = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => { try { return await fn(e, ...a); } catch (err) { console.error(`[ipc ${ch}]`, err); return { error: err.message || String(err) }; } });
  const On = (ch, fn) => ipcMain.on(ch, (e, ...a) => { try { fn(e, ...a); } catch (err) { console.error(`[ipc ${ch}]`, err); } });

  H('config:get', () => config.get());
  H('config:set', (e, patch) => { config.set(patch); return config.get(); });
  H('config:replace', (e, key, value) => { config.replace(key, value); return config.get(); });
  H('env', () => ({ home: HOME, user: os.userInfo().username, host: os.hostname(), dirs: userDirs(), composited, trash: path.join(fsops.HOME_TRASH, 'files'), pid: process.pid, version: app.getVersion() }));

  H('fs:list', async (e, loc, opts = {}) => {
    const r = await fsops.list(loc, { hidden: config.get().browser.showHidden, ...opts });
    r.free = await fsops.freeSpace(loc);
    if (!loc.startsWith('seeker:search')) {
      persisted.recentFolders = [loc, ...persisted.recentFolders.filter((p) => p !== loc)].slice(0, 15); savePersisted();
    }
    return r;
  });
  H('fs:entry', (e, p) => fsops.entry(path.dirname(p), path.basename(p)));
  H('fs:info', (e, p) => fsops.info(p));
  H('fs:appSize', (e, p) => require('./appsize').sizeOf(p));
  H('fs:folderSize', (e, p) => fsops.folderSize(p));
  H('fs:newFolder', (e, dir) => fsops.newFolder(dir));
  H('fs:rename', async (e, p, name) => {
    if (p === fsops.UTILITIES || p === 'seeker:apps/Utilities') { sorry(senderWin(e)); return { error: 'protected' }; } try { return { path: await fsops.rename(p, name) }; } catch (err) { await showError(senderWin(e), err.message); return { error: err.message }; } });
  H('fs:transfer', async (e, srcs, dest, move) => {
    const win = senderWin(e);
    if (srcs.some((s) => fsops.isUtilities(s))) {
      srcs = srcs.filter((s) => !fsops.isUtilities(s));
      try { if (!fsops.isUtilities(dest)) fs.symlinkSync(fsops.UTILITIES, path.join(dest, fsops.uniqueName(dest, 'Utilities', 'number'))); } catch {}
      if (!srcs.length) return { paths: [] };
    }
    try {
      let destDev = null; try { destDev = fs.statSync(dest).dev; } catch {}
      const copies = move ? srcs.filter((s) => { try { return fs.lstatSync(s).dev !== destDev; } catch { return false; } }) : srcs;
      const out = await copyops.withWindow({ srcs, dest, move, copies }, (ctx) => fsops.transfer(srcs, dest, { move, ctx, ask: (name, isDir) => askConflict(win, name, isDir, move), progress: (p) => broadcast('op:progress', { ...p, move }) }));
      broadcast('trash:changed');
      if (out && out.length) uiSound('paste');
      return { paths: out };
    } catch (err) { await showError(win, `The operation can’t be completed.`, err.message); return { error: err.message }; }
  });
  H('fs:drop', async (e, srcs, dest, forceCopy) => {
    const win = senderWin(e);
    // Utilities: dropped somewhere else it becomes a link (an alias) to the one Utilities folder
    const utils = srcs.filter((s) => fsops.isUtilities(s));
    if (utils.length) {
      srcs = srcs.filter((s) => !fsops.isUtilities(s));
      if (fsops.isInTrash(dest + '/x') || dest.endsWith('/Trash/files')) sorry(win);
      else if (!fsops.isUtilities(dest)) {
        const name = fsops.uniqueName(dest, 'Utilities', 'number');
        try { fs.symlinkSync(fsops.UTILITIES, path.join(dest, name)); } catch (err) { await showError(win, 'The operation can’t be completed.', err.message); }
      }
      if (!srcs.length) return { paths: [] };
    }
    let destDev; try { destDev = fs.statSync(dest).dev; } catch { return { error: 'Destination not found' }; }
    const moves = [], copies = [];
    for (const s of srcs) {
      let dev; try { dev = fs.lstatSync(s).dev; } catch { continue; }
      if (!forceCopy && dev === destDev) moves.push(s); else copies.push(s);
    }
    const out = [];
    try {
      if (moves.length) out.push(...await fsops.transfer(moves, dest, { move: true, ask: (n, d) => askConflict(win, n, d, true), progress: (p) => broadcast('op:progress', { ...p, move: true }) }));
      if (copies.length) out.push(...await copyops.withWindow({ srcs: copies, dest, move: false, copies }, (ctx) => fsops.transfer(copies, dest, { move: false, ctx, ask: (n, d) => askConflict(win, n, d, false), progress: (p) => broadcast('op:progress', { ...p, move: false }) })));
    } catch (err) { await showError(win, 'The operation can’t be completed.', err.message); return { error: err.message, paths: out }; }
    broadcast('trash:changed');
    if (out.length) uiSound('paste');
    return { paths: out };
  });
  H('spot:search', (e, text) => scout.search(text));
  On('spot:open', (e, it, reveal) => openSpotItem(it, reveal));
  On('spot:size', (e, h) => { if (spot && !spot.isDestroyed()) spot.setBounds(spotBounds(h)); });
  On('spot:hide', () => hideSpot());
  On('spot:toggle', () => toggleSpot());
  H('fs:duplicate', (e, paths) => fsops.duplicate(paths));
  H('fs:extract', async (e, paths) => {
    const win = senderWin(e);
    const out = [];
    for (let i = 0; i < paths.length; i++) {
      const name = path.basename(paths[i]);
      broadcast('op:progress', { done: i, total: paths.length, name, verb: 'Extracting' });
      const r = await archive.extractHere(paths[i], { askPassword: (n, retry) => promptPassword(null, { archive: n, retry }) });
      if (r.path) out.push(r.path);
      else if (r.error) await showError(win, r.error, r.detail);
    }
    broadcast('op:progress', { done: paths.length, total: paths.length, finished: true });
    return out;
  });
  H('fs:compress', async (e, paths) => {
    broadcast('op:progress', { done: 0, total: 1, name: paths.length === 1 ? path.basename(paths[0]) : `${paths.length} items`, verb: 'Compressing' });
    const r = await archive.compress(paths);
    broadcast('op:progress', { done: 1, total: 1, finished: true });
    if (r.error) { await showError(senderWin(e), r.error, r.detail); return []; }
    return [r.path];
  });
  H('fs:canExtract', (e, items) => items.map((it) => archive.canExtract(it.name, it.mime)));
  H('fs:alias', (e, paths) => fsops.makeAlias(paths));
  H('fs:trash', (e, paths) => trashPaths(e, paths));
  trashPaths = async (e, paths) => {
    // Apps: moving one from Applications to the Trash uninstalls it (a gentle warning, then the password).
    // The Utilities folder too: it uninstalls the apps in it. Everything else goes to the Trash as usual.
    const APPS_DIR = '/Applications';
    const appFiles = [], names = [], storeApps = [];
    let utilities = false;
    const rest = [];
    for (const p of paths) {
      if (fsops.isUtilities(p) && !(() => { try { return fs.lstatSync(p).isSymbolicLink() && p !== fsops.UTILITIES; } catch { return false; } })()) { utilities = true; continue; }
      let appPath = null;
      if (p.endsWith('.desktop')) {
        const a = apps.all().find((x) => x.file === p);
        if (a && a.appPath) appPath = a.appPath;
        else if (a) { const pk = storePackage(a.file); if (pk) storeApps.push({ name: a.name, ...pk }); else rest.push({ sorry: a.name }); continue; }
      }
      else if (p.endsWith('.app') && path.resolve(p).startsWith(APPS_DIR + '/')) appPath = path.resolve(p);
      if (appPath && SYSTEM_APPS.has(path.basename(appPath, '.app'))) { rest.push({ sorry: path.basename(appPath, '.app') }); continue; }
      if (appPath && appPath.startsWith(APPS_DIR + '/')) { appFiles.push(appPath); names.push(path.basename(appPath, '.app')); continue; }
      rest.push(p);
    }
    const win = senderWin(e);
    const fr = /^fr/i.test(process.env.LANG || '');
    if (utilities) {
      // the Utilities folder itself stays; the apps in it that aren't part of palOS go
      let u = []; try { u = fs.readdirSync(path.join(APPS_DIR, 'Utilities')).filter((f) => f.endsWith('.app') && !SYSTEM_APPS.has(f.slice(0, -4))).map((f) => path.join(APPS_DIR, 'Utilities', f)); } catch {}
      if (u.length) { appFiles.push(...u); names.push(...u.map((f) => path.basename(f, '.app'))); } else { sorry(win); }
    }
    const blocked = rest.filter((x) => x && x.sorry);
    if (blocked.length) {
      await sheet.message(win, { type: 'warning', message: fr ? `« ${blocked[0].sorry} » fait partie de palOS.` : `“${blocked[0].sorry}” is part of palOS.`,
        detail: fr ? 'Seules les apps installées dans Applications peuvent être placées dans la corbeille.' : 'Only apps installed in Applications can be moved to the Trash.', buttons: ['OK'] }).catch(() => {});
    }
    if (appFiles.length) {
      // every app by name (one password for all of them, asked once for this uninstall)
      const q = (n) => (fr ? `« ${n} »` : `“${n}”`);
      const list = (xs) => xs.length === 1 ? q(xs[0]) : xs.slice(0, -1).map(q).join(', ') + (fr ? ' et ' : ' and ') + q(xs[xs.length - 1]);
      const what = names.length <= 8 ? list(names) : list(names.slice(0, 7).concat([fr ? `${names.length - 7} autres` : `${names.length - 7} more`]));
      const r = await sheet.message(win, { type: 'warning',
        message: fr ? `Voulez-vous vraiment placer ${what} dans la corbeille ?` : `Are you sure you want to move ${what} to the Trash?`,
        detail: utilities ? (fr ? `Les ${appFiles.length} apps du dossier Utilitaires seront désinstallées. Vous pourrez les remettre en place depuis la corbeille.` : `The ${appFiles.length} apps in the Utilities folder will be uninstalled. You can put them back from the Trash.`)
          : names.length > 1 ? (fr ? `Ces ${names.length} apps seront désinstallées (un seul mot de passe pour toutes). Vous pourrez les remettre en place depuis la corbeille.` : `These ${names.length} apps will be uninstalled (one password for all of them). You can put them back from the Trash.`)
          : (fr ? 'L’app sera désinstallée. Vous pourrez la remettre en place depuis la corbeille.' : 'The app will be uninstalled. You can put it back from the Trash.'),
        buttons: [fr ? 'Annuler' : 'Cancel', fr ? 'Placer dans la corbeille' : 'Move to Trash'], defaultId: 1, cancelId: 0 }).catch(() => ({ response: 0 }));
      if (r && r.response === 1) {
        const trashDir = path.dirname(path.join(fsops.HOME_TRASH, 'files'));
        try { fs.mkdirSync(path.join(trashDir, 'files'), { recursive: true }); fs.mkdirSync(path.join(trashDir, 'info'), { recursive: true }); } catch {}
        const res = await new Promise((resolve) => require('child_process').execFile('pkexec', ['/usr/lib/palos-apps/palos-app-uninstall', trashDir, String(process.getuid()), String(process.getgid()), ...appFiles],
          { timeout: 300000 }, (err, out, errout) => resolve({ ok: !err, err: String(errout || (err && err.message) || '') })));
        if (!res.ok && !/dismissed|Not authorized|126/i.test(res.err)) await showError(win, fr ? 'L’app n’a pas pu être désinstallée.' : 'The app couldn’t be uninstalled.', res.err.trim().split('\n').pop());
        apps.load(); icons.reset(); pushMenus(); try { fsops.syncUtilities(); } catch (_) {}
        broadcast('trash:changed'); broadcast('dir:changed', 'seeker:apps'); broadcast('dir:changed', 'seeker:apps/Utilities');
      }
    }
    if (storeApps.length) {
      // apps from palOS Store (deb packages or snaps): moving them to the Trash removes them, as with .apps
      const what = storeApps.length === 1 ? (fr ? `« ${storeApps[0].name} »` : `“${storeApps[0].name}”`) : (fr ? `ces ${storeApps.length} apps` : `these ${storeApps.length} apps`);
      const r = await sheet.message(win, { type: 'warning', message: fr ? `Voulez-vous vraiment désinstaller ${what} ?` : `Are you sure you want to uninstall ${what}?`,
        detail: fr ? 'Ses documents restent là où ils sont.' : 'Documents you made with it stay where they are.',
        buttons: [fr ? 'Annuler' : 'Cancel', fr ? 'Désinstaller' : 'Uninstall'], defaultId: 1, cancelId: 0 }).catch(() => ({ response: 0 }));
      if (r && r.response === 1) {
        const debs = [...new Set(storeApps.filter((x) => x.deb).map((x) => x.deb))], snaps = [...new Set(storeApps.filter((x) => x.snap).map((x) => x.snap))];
        const run = (args) => new Promise((resolve) => require('child_process').execFile('pkexec', ['/usr/lib/palos-store/store-helper', ...args], { timeout: 900000 }, (err, out, eo) => resolve({ ok: !err, err: String(eo || (err && err.message) || '') })));
        for (const res of [debs.length ? await run(['remove', ...debs]) : { ok: true }, ...await Promise.all(snaps.map((n) => run(['snap-remove', n])))]) {
          if (!res.ok && !/dismissed|Not authorized|126/i.test(res.err)) await showError(win, fr ? 'L’app n’a pas pu être désinstallée.' : 'The app couldn’t be uninstalled.', res.err.trim().split('\n').pop());
        }
        apps.load(); icons.reset(); pushMenus(); broadcast('dir:changed', 'seeker:apps');
      }
    }
    paths = rest.filter((x) => typeof x === 'string');
    if (!paths.length) return [];
    try { const r = await fsops.trash(paths); broadcast('trash:changed'); pushMenus(); return r; }
    catch (err) { await showError(senderWin(e), 'The item can’t be moved to the Trash.', err.message); return { error: err.message }; }
  };
  H('fs:putBack', async (e, paths) => { const r = await fsops.putBack(paths); broadcast('trash:changed'); pushMenus(); return r; });
  H('fs:emptyTrash', (e) => emptyTrashConfirm(senderWin(e)));
  H('fs:trashCount', () => fsops.trashCount());
  // a Utilities alias (on the desktop, say) can be taken away; the Utilities folder itself can't
  H('fs:removeUtilitiesAlias', (e, p) => { try { if (fs.lstatSync(p).isSymbolicLink() && p !== fsops.UTILITIES && fsops.isUtilities(p)) fs.unlinkSync(p); } catch {} return true; });
  H('fs:chmod', async (e, p, mode) => { await fs.promises.chmod(p, mode); return true; });
  H('fs:exists', (e, p) => fs.existsSync(normalizeLocation(p) || ''));
  H('fs:resolve', (e, p) => { const n = normalizeLocation(p.trim()); if (!n) return null; if (n.startsWith('seeker:')) return n; const abs = path.resolve(HOME, n); return fs.existsSync(abs) ? abs : null; });
  H('fs:open', (e, paths, appId) => openFiles(paths, appId));
  H('fs:openWith', async (e, p) => {
    const t = mime.detect(p, path.basename(p));
    const def = apps.defaultFor(t);
    return { default: def ? { id: def.id, name: def.name, icon: def.icon } : null, apps: apps.forMime(t).map((a) => ({ id: a.id, name: a.name, icon: a.icon })), mime: t };
  });
  H('fs:setDefaultApp', (e, type, appId) => { apps.setDefault(type, appId); return true; });
  H('fs:images', async (e, dir) => {
    const out = [];
    const walk = async (d, depth) => {
      let ents; try { ents = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return; }
      for (const ent of ents) {
        const p = path.join(d, ent.name);
        if (ent.isDirectory() && depth < 2 && !ent.name.startsWith('.')) await walk(p, depth + 1);
        else if (/\.(png|jpe?g|webp|svg|bmp|gif|jxl|avif)$/i.test(ent.name)) out.push(p);
        if (out.length > 400) return;
      }
    };
    await walk(dir, 0);
    return out.sort();
  });

  H('dialog:folder', async (e, start) => { const r = await (dialogParent(senderWin(e)) ? sheet.open(dialogParent(senderWin(e)), { defaultPath: start, properties: ["openDirectory"] }) : dialog.showOpenDialog({ defaultPath: start, properties: ["openDirectory"] })); return r.canceled ? null : r.filePaths[0]; });
  H('apps:launch', (e, id, files) => apps.launch(id, files || []));
  H('apps:all', () => apps.all().map((a) => ({ id: a.id, name: a.name, icon: a.icon, comment: a.comment })));

  H('vol:list', () => volumes.list());
  // the copy bar: in Seeker's windows, or on the desktop when none is open (browsers says how many are)
  copyops.init({ smallWindow, broadcast: (ch, s, ...a) => broadcast(ch, ch === 'copy:progress' ? { ...s, browsers: [...browsers.values()].filter((b) => b.win && !b.win.isDestroyed()).length } : s, ...a) });
  H('copy:summary', () => ({ ...copyops.summary(), browsers: [...browsers.values()].filter((b) => b.win && !b.win.isDestroyed()).length }));
  On('copy:action', (e, id, what) => { copyops.action(id, what); });
  H('copy:eject', async (e, id) => {
    const op = copyops.action(id, 'none'); if (!op || !op.vol) return { ok: false };
    const r = await volumes.eject(op.vol.target);
    if (!r.ok) await showError(senderWin(e), r.error || 'The disk couldn’t be ejected.');
    return r;
  });
  H('vol:eject', async (e, target) => {
    const busyOp = copyops.busy(target);
    if (busyOp) { await showError(senderWin(e), /^fr/i.test(process.env.LANG || '') ? `« ${busyOp.vol ? busyOp.vol.name : path.basename(target)} » est encore en cours d’écriture.` : `“${busyOp.vol ? busyOp.vol.name : path.basename(target)}” is still being written to.`, /^fr/i.test(process.env.LANG || '') ? 'Attendez la fin de la copie (le son vous préviendra), ou arrêtez-la, puis éjectez le disque.' : 'Wait for the copy to finish (you’ll hear it), or stop it, then eject the disk.'); return { ok: false, busy: true }; }
    const r = await volumes.eject(target); if (!r.ok) await showError(senderWin(e), r.error || 'The disk couldn’t be ejected.'); return r; });

  H('clip:set', (e, paths, cut) => setClipboard(paths, cut));
  H('clip:get', () => readClipboard());
  H('clip:clear', () => { clip.paths = []; clip.cut = false; pushMenus(); });

  // search: streaming
  const searches = new Map();
  On('search:start', (e, id, crit) => {
    const wc = e.sender;
    const stop = fsops.search(crit, (batch) => { if (!wc.isDestroyed()) wc.send('search:results', id, batch); }, (r) => { if (!wc.isDestroyed()) wc.send('search:done', id, r); searches.delete(id); });
    searches.set(id, stop);
  });
  On('search:stop', (e, id) => { const s = searches.get(id); if (s) s(); searches.delete(id); });

  // folder watching
  const watches = new Map();       // wcId -> Map(path -> watcher)
  On('watch', (e, p) => {
    const wc = e.sender; if (!p || p.startsWith('seeker:')) return;
    if (!watches.has(wc.id)) { watches.set(wc.id, new Map()); wc.once('destroyed', () => { for (const w of (watches.get(wc.id) || new Map()).values()) w.close(); watches.delete(wc.id); }); }
    const m = watches.get(wc.id); if (m.has(p)) return;
    try {
      const notify = debounce(() => { if (!wc.isDestroyed()) wc.send('dir:changed', p); }, 250);
      const w = fs.watch(p, notify); w.on('error', () => {}); m.set(p, w);
    } catch {}
  });
  On('unwatch', (e, p) => { const m = watches.get(e.sender.id); if (m && m.has(p)) { m.get(p).close(); m.delete(p); } });

  // drag and drop (native, so files can go to other apps and the dock)
  // What follows the pointer is the thing itself: a picture's own picture (see-through parts stay see-through),
  // a program's own icon, otherwise the file's icon. (It used to fall back to Seeker's own icon.)
  const dragImage = (file, iconNames) => {
    const tryPng = (p) => { try { if (p && /\.(png|jpe?g)$/i.test(p)) { const im = nativeImage.createFromPath(p); if (!im.isEmpty()) return im; } } catch {} return null; };
    const fit = (im, s = 72) => { const z = im.getSize(); const k = Math.min(1, s / Math.max(z.width, z.height)); return k < 1 ? im.resize({ width: Math.max(1, Math.round(z.width * k)), height: Math.max(1, Math.round(z.height * k)), quality: 'best' }) : im; };
    try {
      const st = fs.statSync(file);
      if (st.isFile()) {
        const m = mime.detect(file, path.basename(file), st);
        if (/^image\/(png|jpeg|gif|bmp|webp)$/.test(m) && st.size < 40 * 1024 * 1024) { const im = tryPng(file) || (() => { const x = nativeImage.createFromPath(file); return x.isEmpty() ? null : x; })(); if (im) return fit(im); }
        const md5 = require('crypto').createHash('md5').update(thumbs.uriFor(file)).digest('hex');
        for (const d of ['large', 'normal', 'x-large']) { const im = tryPng(path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'thumbnails', d, md5 + '.png')); if (im) return fit(im); }
      }
    } catch {}
    // the file's own kind of icon, from the icon theme (a PNG size when the theme has one)
    for (const s of [64, 48, 96, 128, 32]) { const im = tryPng(icons.lookup(iconNames || ['text-x-generic'], s)); if (im) return fit(im, 64); }
    for (const n of ['text-x-generic', 'unknown']) { const im = tryPng(icons.lookup([n], 64)); if (im) return fit(im, 64); }
    return nativeImage.createEmpty();
  };
  On('drag:start', (e, paths, iconNames) => {
    if (!paths || !paths.length) return;
    let icon = dragImage(paths[0], iconNames);
    if (icon.isEmpty()) icon = nativeImage.createFromPath('/usr/share/icons/palOS/64x64/mimetypes/text-x-generic.png');
    try { e.sender.startDrag({ file: paths[0], files: paths, icon }); } catch (err) { console.error('[drag]', err.message); }
  });

  // windows
  On('win:minimize', (e) => { const w = senderWin(e); if (w) w.minimize(); });
  On('win:zoom', (e) => { const w = senderWin(e); if (!w) return; if (w.isMaximized()) w.unmaximize(); else w.maximize(); });
  On('win:close', (e) => { const w = senderWin(e); if (w) w.close(); });
  On('win:setTitle', (e, t) => { const w = senderWin(e); if (w) { w.setTitle(t); pushMenus(); } });
  H('win:bounds', (e) => { const w = senderWin(e); return w ? w.getBounds() : null; });
  On('win:setBounds', (e, b) => { const w = senderWin(e); if (w) w.setBounds({ x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) }); });
  On('win:setSize', (e, width, height) => { const w = senderWin(e); if (w) { const b = w.getBounds(); w.setBounds({ ...b, width: Math.round(width), height: Math.round(height) }); } });
  On('browser:open', (e, loc, opts) => openBrowser(loc, opts || {}));
  On('browser:state', (e, st) => { const b = browsers.get(e.sender.id); if (b) { b.state = st; if (lastSeekerSurface && lastSeekerSurface.id === e.sender.id) pushMenus(); } });
  On('desktop:state', (e, st) => { desktopState.set(e.sender.id, st); if (lastSeekerSurface && lastSeekerSurface.id === e.sender.id) pushMenus(); });
  On('desktop:focus', (e) => { lastSeekerSurface = e.sender; closeMenusIfOpen(); if (!front.seeker) setFront({ seeker: true }); else pushMenus(); });
  On('info:open', (e, paths) => openInfo(paths));
  On('prefs:open', (e, tab) => openPrefs(tab));
  On('ql:toggle', (e, items, index) => toggleQuickLook(items, index, e.sender));
  On('ql:update', (e, items, index) => { if (quicklook && !quicklook.isDestroyed()) quicklook.webContents.send('ql:show', { items, index }); });
  On('ql:close', () => { if (quicklook && !quicklook.isDestroyed()) quicklook.close(); });
  H('ql:isOpen', () => !!(quicklook && !quicklook.isDestroyed()));
  H('pv:info', (e, p) => preview.info(p));
  H('pv:docPages', (e, p) => preview.docPages(p));
  H('ql:text', async (e, p) => { const fd = await fs.promises.open(p, 'r'); try { const b = Buffer.alloc(256 * 1024); const { bytesRead } = await fd.read(b, 0, b.length, 0); return b.subarray(0, bytesRead).toString('utf8'); } finally { await fd.close(); } });
  On('ql:fullscreen', (e) => { if (quicklook && !quicklook.isDestroyed()) { const f = !quicklook.isFullScreen(); quicklook.setFullScreen(f); } });
  H('mime:describe', (e, p) => { const t = mime.detect(p, path.basename(p)); return { mime: t, kind: mime.describe(t), icon: mime.iconNames(t) }; });

  // menu bar
  On('menubar:shape', (e, mode, rects) => { setMenubarShape(mode, rects); menuKeys(mode !== 'bar'); });
  On('menubar:activate', (e, id) => { menuActivate(id); });
  // right-click menus from the desktop, shown by the menu bar (above every window)
  const ctxMenus = new Map(), ctxSubs = new Map(); let ctxSeq = 0;
  On('ctxmenu:open', (e, req, items, x, y) => {
    const src = BrowserWindow.fromWebContents(e.sender);
    if (!menubar || menubar.isDestroyed() || !src) { e.sender.send('ctxmenu:fallback', req); return; }
    const sb = src.getBounds(), mb = menubar.getBounds();
    const mx = sb.x + x - mb.x, my = sb.y + y - mb.y;
    if (mx < 0 || my < 0 || mx > mb.width || my > mb.height) { e.sender.send('ctxmenu:fallback', req); return; }
    const id = ++ctxSeq;
    ctxMenus.set(id, { wc: e.sender, req });
    menubar.webContents.send('ctxmenu:open', id, items, mx, my);
    menubar.showInactive && menubar.isVisible() && menubar.focus();
  });
  On('ctxmenu:close', (e, req) => { for (const [id, c] of ctxMenus) if (c.wc === e.sender && c.req === req) menubar.webContents.send('ctxmenu:close', id); });
  On('ctxmenu:done', (e, id, itemId) => {
    const c = ctxMenus.get(id); if (!c) return;
    ctxMenus.delete(id);
    if (!c.wc.isDestroyed()) c.wc.send('ctxmenu:done', c.req, itemId);
  });
  H('ctxmenu:sub', (e, id, itemId) => new Promise((res) => {
    const c = ctxMenus.get(id); if (!c || c.wc.isDestroyed()) return res(null);
    const k = ++ctxSeq; ctxSubs.set(k, res);
    c.wc.send('ctxmenu:sub', c.req, itemId, k);
    setTimeout(() => { if (ctxSubs.has(k)) { ctxSubs.delete(k); res(null); } }, 3000);
  }));
  On('ctxmenu:subReply', (e, k, kids) => { const r = ctxSubs.get(k); if (r) { ctxSubs.delete(k); r(kids); } });
  H('menubar:opening', async (e, topId) => {
    if (!front.seeker && front.source && (topId.startsWith('d:') || topId.startsWith('g:'))) {
      await front.source.opening(topId);
      return foreignMenus(front);
    }
    if (topId === 'p:root') return null;
    return null;
  });
  On('menubar:closed', (e, topId) => { if (!front.seeker && front.source && topId && topId.startsWith('d:')) front.source.closed(topId); });
  On('menubar:focusPrevious', () => { if (!front.seeker && front.xid) x11.activate(front.xid); });
  H('menubar:refresh', () => pushMenus());

  // tray
  const sni = require('./sni');
  H('tray:list', () => sni.list());
  H('tray:activate', (e, key, x, y, secondary) => sni.activate(key, x, y, secondary));
  H('tray:context', (e, key, x, y) => sni.context(key, x, y));
  H('tray:menu', async (e, key) => { const m = await sni.menu(key); return m ? m.root : null; });
  On('tray:menuActivate', async (e, key, id) => { const m = await sni.menu(key); if (m) m.activate(id); });
  On('tray:scroll', (e, key, d) => sni.scroll(key, d));

  // extras
  H('drag:rects', async () => {
    const { execFile } = require('child_process'); const out = [];
    const geo = (id) => new Promise((res) => execFile('palos-x', ['window', 'geometry', String(id)], { timeout: 1500 }, (err, so) => {
      if (err) return res(null);
      const g = Object.fromEntries(String(so).split('\n').map((l) => l.split('=')).filter((p) => p.length === 2));
      res({ x: +g.X, y: +g.Y, w: +g.WIDTH, h: +g.HEIGHT });
    }));
    const infos = (await Promise.all(x11.clients.map((id) => x11.info(id)))).filter((i) => i && i.normal && !(i.state || []).includes('hidden') && i.pid !== process.pid);
    for (const i of infos) { const g = await geo(i.id); if (g) out.push({ x: g.x, y: g.y - 30, w: g.w, h: g.h + 30 }); }
    // our own browser windows (not the desktop, menu bar or spyglass)
    for (const w of BrowserWindow.getAllWindows()) {
      if (w.isDestroyed() || !w.isVisible() || w === menubar || w === spot) continue;
      const b = w.getBounds();
      if (b.width >= screen.getPrimaryDisplay().size.width - 2 && b.height >= screen.getPrimaryDisplay().size.height - 2) continue;   // the desktop itself
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height });
    }
    // the Dock: a strip along its edge of the screen
    try {
      const dc = JSON.parse(require('fs').readFileSync(require('path').join(os.homedir(), '.config', 'paladin-dock', 'config.json'), 'utf8'));
      const d = screen.getPrimaryDisplay().bounds, t = ((dc.icon_size || 56) + 40);
      out.push(dc.position === 'left' ? { x: d.x, y: d.y, w: t, h: d.height } : { x: d.x, y: d.y + d.height - t, w: d.width, h: t });
    } catch { const d = screen.getPrimaryDisplay().bounds; out.push({ x: d.x, y: d.y + d.height - 96, w: d.width, h: 96 }); }
    return out;
  });
  H('screens:get', () => screens.state());
  On('screens:go', (e, i) => screens.go(i));
  On('screens:menu', () => screens.popupMenu(menubar));
  H('screens:layouts', () => screens.LAYOUTS.map((l) => l[0]));
  On('screens:set', (e, n) => { screens.setCount(+n); if (menubar && !menubar.isDestroyed()) setTimeout(() => menubar.webContents.send('screens:changed', screens.state()), 300); });
  H('sound:get', () => extras.sound.available() ? extras.sound.get() : null);
  let popTimer = null;
  H('sound:set', (e, v) => {
    // the pop plays once the slider comes to rest
    clearTimeout(popTimer); popTimer = setTimeout(() => { try { const c = spawn('palos-sound', ['volume'], { detached: true, stdio: 'ignore' }); c.on('error', () => {}); c.unref(); } catch {} }, 180);
    return extras.sound.set(v);
  });
  H('sound:mute', () => extras.sound.toggleMute());
  On('sound:settings', () => extras.sound.openSettings());
  H('wifi:status', () => extras.wifi.available() ? extras.wifi.status() : null);
  H('wifi:networks', (e, rescan) => extras.wifi.networks(rescan));
  H('wifi:power', (e, on) => extras.wifi.setPower(on));
  H('wifi:connect', (e, ssid, pw) => extras.wifi.connect(ssid, pw));
  H('wifi:disconnect', () => extras.wifi.disconnect());
  On('wifi:settings', () => extras.wifi.openSettings());
  H('wifi:prompt', async (e, ssid) => promptPassword(ssid));
  // the battery (laptops)
  H('battery:get', () => require('./battery').status());
  H('battery:profile', () => require('./battery').profile());
  H('battery:setProfile', (e, p) => require('./battery').setProfile(p));
  On('battery:settings', () => { if (which('paladin-settings')) detached('paladin-settings', ['power']); });
  H('wifi:agent', () => { try { return require('./nmagent').active(); } catch { return false; } });
  On('datetime:settings', () => { if (which('paladin-settings')) detached('paladin-settings', ['datetime']); });
  H('appearance:get', () => appearance.dark);

  // about / force quit
  H('sys:info', () => ({ ...extras.systemInfo(), diskName: config.get().hardDiskName, logo: (config.get().aboutLogo && fs.existsSync(config.get().aboutLogo)) ? config.get().aboutLogo : null }));
  H('sys:softwareUpdate', () => { const cmd = extras.firstCommand(config.get().softwareUpdate); if (cmd) detached(cmd[0], cmd.slice(1)); return !!cmd; });
  H('fq:list', async () => {
    const wins = (await x11.allInfo()).filter((w) => w.normal && w.pid && w.pid !== process.pid);
    const groups = new Map();
    for (const w of wins) {
      const a = apps.forWindow(w);
      const key = a ? a.id : (w.cls || String(w.pid));
      if (!groups.has(key)) groups.set(key, { key, name: a ? a.name : prettyClass(w.cls || 'Application'), icon: a ? a.icon : null, pids: new Set(), windows: [] });
      groups.get(key).pids.add(w.pid); groups.get(key).windows.push(w.id);
    }
    return [...groups.values()].map((g) => ({ ...g, pids: [...g.pids] })).sort((a, b) => a.name.localeCompare(b.name));
  });
  H('fq:kill', async (e, pids, name) => {
    const r = await showBox(senderWin(e), { type: 'warning', buttons: ['Cancel', 'Force Quit'], defaultId: 1, cancelId: 0, title: 'Force Quit',
      message: `Do you want to force “${name}” to quit?`, detail: 'You will lose any unsaved changes.' });
    if (r.response !== 1) return false;
    for (const pid of pids) { try { process.kill(pid, 'SIGKILL'); } catch {} }
    return true;
  });
  On('seeker:relaunch', () => { app.relaunch({ args: process.argv.slice(1).filter((a) => a !== '--session').concat('--session') }); app.exit(0); });
  On('seeker:command', (e, id) => menuActivate(id));
  H('sidebar', () => sidebar());
}

function promptPassword(ssid, opts = {}) {
  // opened from a Seeker window (extracting an archive): ask in a sheet on that window
  const parent = opts.archive ? dialogParent(BrowserWindow.getFocusedWindow()) : null;
  if (parent) {
    return sheet.prompt(parent, { type: 'warning', password: true, ok: 'Extract', message: opts.retry ? `That password didn’t work for “${opts.archive}”.` : `“${opts.archive}” is protected with a password.`, detail: 'Enter the password to extract it.' });
  }
  return new Promise((resolve) => {
    const query = opts.archive ? { archive: opts.archive, retry: opts.retry ? '1' : '' }
      : opts.vpn ? { vpn: opts.vpn, retry: opts.retry ? '1' : '', askuser: opts.askUser ? '1' : '', user: opts.user || '', what: opts.what || '' } : { ssid };
    const w = smallWindow('prompt.html', { width: 420, height: opts.askUser ? 240 : 210, query, title: opts.archive ? 'Password' : opts.vpn ? 'VPN Password' : 'Wi-Fi Password' });
    const id = w.webContents.id;
    const handler = (e, value) => { if (e.sender.id !== id) return; ipcMain.removeListener('prompt:done', handler); resolve(value); try { w.close(); } catch {} };
    ipcMain.on('prompt:done', handler);
    w.on('closed', () => { ipcMain.removeListener('prompt:done', handler); resolve(null); });
  });
}

function sidebar() {
  const u = userDirs();
  const vols = volumes.list();
  const c = config.get();
  const defaults = [u.DESKTOP, HOME, 'seeker:apps', u.DOCUMENTS, u.DOWNLOAD, u.MUSIC, u.PICTURES, u.VIDEOS];
  const favs = (c.sidebarFavorites || defaults).filter((p) => p.startsWith('seeker:') || fs.existsSync(p));
  const iconFor = (p) => p === 'seeker:apps' ? ['folder-applications', 'applications-other', 'folder'] : ((fsops.special(p) || {}).icon || ['folder']).concat('folder');
  return {
    // Remote Disc (use another computer's CD/DVD drive) always comes last, like a device that's always there
    devices: [...vols.map((v) => ({ path: v.target, name: v.name, icon: v.icon, eject: v.removable && v.target !== '/', removable: v.removable })),
      ...(require('./apps').get('palos-remote-drive') ? [{ path: 'seeker:remotedrive', name: 'Remote Disc', icon: ['palos-remote-drive', 'media-optical'], launch: 'palos-remote-drive' }] : [])],
    places: favs.map((p) => ({ path: p, name: fsops.displayName(p), icon: iconFor(p) })),
    trash: { path: 'seeker:trash', name: 'Trash', icon: [fsops.trashCount() ? 'user-trash-full' : 'user-trash'] },
    searches: [
      { id: 'today', name: 'Today', icon: ['folder-saved-search', 'edit-find', 'system-search'] },
      { id: 'yesterday', name: 'Yesterday', icon: ['folder-saved-search', 'edit-find', 'system-search'] },
      { id: 'week', name: 'Past Week', icon: ['folder-saved-search', 'edit-find', 'system-search'] },
      { id: 'images', name: 'All Images', icon: ['folder-saved-search', 'edit-find', 'system-search'] },
      { id: 'movies', name: 'All Movies', icon: ['folder-saved-search', 'edit-find', 'system-search'] },
      { id: 'documents', name: 'All Documents', icon: ['folder-saved-search', 'edit-find', 'system-search'] },
    ],
  };
}

// ------------------------------------------------------------------ command line
function handleArgs(argv, fromSecond) {
  const appPath = app.getAppPath();
  const list = argv.filter((a) => !a.startsWith('-') && a !== process.execPath && !/\/(electron|paladin-seeker|seeker)$/.test(a)
    && path.resolve(a) !== appPath && path.resolve(a) !== path.dirname(appPath));
  if (argv.includes('--quit')) { app.quit(); return; }
  const selIdx = argv.indexOf('--select');
  if (selIdx >= 0 && argv[selIdx + 1]) { openBrowser(path.dirname(argv[selIdx + 1]), { select: argv[selIdx + 1] }); return; }
  const trIdx = argv.indexOf('--trash');
  if (trIdx >= 0) {
    const ps = argv.slice(trIdx + 1).filter((a) => a.startsWith('/'));
    if (ps.length && trashPaths) trashPaths(null, ps).catch((err) => console.error('[trash]', err));
    return;
  }
  if (argv.includes('--prefs')) { openPrefs(); return; }
  if (argv.includes('--widgets')) { try { widgets.toggle(); } catch (e) { console.error('[widgets]', e.message); } return; }   // Widget Board (Applications)
  if (list.length) {
    // a .deb handed to Seeker (from a browser's downloads, Terminal's open…): opened as a folder, with the Store note
    list.forEach((l) => { let f = false; try { f = /\.deb$/i.test(l) && fs.statSync(l).isFile(); } catch {} if (f) openFiles([path.resolve(l)]); else openBrowser(l); });
    return;
  }
  if (argv.includes('--session') && !fromSecond) return;
  if (argv.includes('--session')) return;
  openBrowser(null);
}

// org.freedesktop.FileManager1: "Show in folder" from browsers and other apps.
async function serveFileManager() {
  const D = require('./dbus');
  const uriToPath = (u) => normalizeLocation(u);
  D.serve('/org/freedesktop/FileManager1', 'org.freedesktop.FileManager1', {
    methods: {
      ShowFolders: { in: 'ass', fn: ([uris]) => { uris.forEach((u) => openBrowser(uriToPath(u))); return []; } },
      ShowItems: { in: 'ass', fn: ([uris]) => { uris.forEach((u) => { const p = uriToPath(u); if (p) openBrowser(path.dirname(p), { select: p }); }); return []; } },
      ShowItemProperties: { in: 'ass', fn: ([uris]) => { openInfo(uris.map(uriToPath).filter(Boolean)); return []; } },
    },
  });
  try { await D.requestName('org.freedesktop.FileManager1'); } catch {}
}

// ------------------------------------------------------------------ startup
if (process.env.SEEKER_DEBUG) app.on('web-contents-created', (e, wc) => wc.on('console-message', (ev) => console.log('[renderer]', ev.message || ev)));
app.on('second-instance', (e, argv) => handleArgs(argv.slice(1), true));
app.on('window-all-closed', () => { /* Seeker keeps running: it is the desktop. */ });

app.whenReady().then(async () => {
  require('electron').Menu.setApplicationMenu(null);   // Seeker's menus live in its own menu bar
  appearance.start();                                   // light/dark from the Dark Mode switch
  appearance.on('change', (dark) => broadcast('appearance:changed', dark));
  registerProtocol();
  composited = (await detectCompositor()) === true;   // unknown at start: the opaque bar, which works either way
  x11.start();
  apps.load(); try { fsops.syncUtilities(); } catch (_) {}
  // an app installed (or its icon made) while Seeker runs: look its icon up again, so Applications never keeps a blank box
  apps.watch(() => { icons.reset(); pushMenus(); try { fsops.syncUtilities(); } catch (_) {} broadcast('icons:changed', Date.now()); broadcast('dir:changed', 'seeker:apps'); });
  // app sizes come in the background: windows showing Applications refresh once they're known
  fsops.onAppSizes(() => broadcast('dir:changed', 'seeker:apps'));
  volumes.start();
  volumes.on('change', (v) => { broadcast('volumes:changed', v); });
  setupIpc();
  config.on('change', (cfg, patch) => {
    if (patch && patch.iconTheme !== undefined) icons.reset();
    if (patch && patch.hardDiskName) fsops.resetSpecial();
    broadcast('config:changed', cfg, patch);
    pushMenus();
  });
  config.watch();
  // The icon theme can change while Seeker runs (Settings, or palOS setting its own theme the first time)
  let iconGen = 0;
  try {
    const mon = spawn('palos-pref', ['monitor', 'interface.icon-theme'], { stdio: ['ignore', 'pipe', 'ignore'] });
    mon.stdout.on('data', debounce(() => { icons.reset(); iconGen += 1; broadcast('icons:changed', iconGen); pushMenus(); }, 150));
    mon.on('error', () => {});
    app.on('will-quit', () => { try { mon.kill(); } catch {} });
  } catch {}
  // Trash changes (from the dock or other apps)
  try { fs.mkdirSync(path.join(fsops.HOME_TRASH, 'files'), { recursive: true }); fs.watch(path.join(fsops.HOME_TRASH, 'files'), debounce(() => { broadcast('trash:changed'); pushMenus(); }, 300)); } catch {}

  // the battery: the menu bar hears about every change (and low-battery notices go out from here)
  try { extras.wifi.watch(async () => { if (!menubar || menubar.isDestroyed()) return; let st = null; try { st = extras.wifi.available() ? await extras.wifi.status() : null; } catch {} try { menubar.webContents.send('wifi:changed', st); } catch {} }); } catch (e) { console.error('[wifi]', e.message); }
  try { require('./battery').watch((st) => { if (menubar && !menubar.isDestroyed()) menubar.webContents.send('battery:changed', st); }); } catch (e) { console.error('[battery]', e.message); }
  // Wi-Fi passwords NetworkManager needs come to Paladin (and only to Paladin)
  try { require('./nmagent').start({ prompt: (ssid) => promptPassword(ssid), promptVpn: (name, o) => promptPassword(null, { ...o, vpn: name }) }); } catch (e) { console.error('[nm-agent]', e.message); }
  if (process.env.DBUS_SESSION_BUS_ADDRESS || fs.existsSync(`/run/user/${process.getuid()}/bus`)) {
    try {
      const appmenu = require('./appmenu');
      const okReg = await appmenu.start();
      appmenu.on('registered', (win) => { if (!front.seeker && (front.xid === win || (front.info && front.info.transientFor === win))) { sources.delete(win); attachSource(front); } });
      const sni = require('./sni');
      const okTray = await sni.start();
      sni.on('change', debounce(() => { if (menubar && !menubar.isDestroyed()) menubar.webContents.send('tray:changed', sni.list()); }, 100));
      const trayHidden = () => { const m = config.get().menubar || {}; sni.setHidden([...(m.hideTray || []), ...(m.wifi !== false ? (m.hideTrayWhenWifi || []) : [])]); };
      trayHidden();
      config.on('change', (cfg, patch) => { if (patch && patch.menubar) trayHidden(); });
      await serveFileManager();
      console.log(`[seeker] global menu registrar: ${okReg ? 'yes' : 'no'}, tray watcher: ${okTray ? 'yes' : 'no'}`);
    } catch (e) { console.error('[seeker] D-Bus services unavailable:', e.message); }
  }

  if (!FLAGS.noMenubar) createMenubar();
  // Keep a menu bar on screen whatever happens to it (a renderer that died, a replacement that never
  // showed on a slow or software-only computer): check every ten seconds and bring one back.
  if (!FLAGS.noMenubar) setInterval(() => {
    if (!menubar || menubar.isDestroyed()) { menubar = null; createMenubar(); return; }
    if (!menubar.isVisible() && Date.now() - (menubar.__made || 0) > 20000) { try { menubar.__forceShow(); } catch {} }
  }, 10000);
  if (!FLAGS.noMenubar) {
    try { require('electron').globalShortcut.register('Super+Space', toggleSpot); } catch (err) { console.error('spyglass shortcut:', err.message); }
    // the widget layer: the menu bar icon, or F12
    widgets.init({ ui: UI, webPrefs, barHeight: BAR_H, menubar: () => menubar });
    try { require('electron').globalShortcut.register('F12', () => widgets.toggle()); } catch (err) { console.error('widgets shortcut:', err.message); }
  }
  syncDesktops();
  screen.on('display-added', syncDesktops); screen.on('display-removed', syncDesktops); screen.on('display-metrics-changed', debounce(syncDesktops, 300));

  x11.on('active', onActiveWindow);
  x11.on('viewport', () => { if (menubar && !menubar.isDestroyed()) menubar.webContents.send('screens:changed', screens.state()); });
  screens.onChange(() => { if (menubar && !menubar.isDestroyed()) menubar.webContents.send('screens:changed', screens.state()); });
  if (x11.active) onActiveWindow(x11.active);       // whatever was focused before Seeker started
  x11.on('clients', (ids) => {
    for (const [id, src] of [...sources]) if (!ids.includes(id)) { src.dispose(); sources.delete(id); }
    if (!front.seeker) pushMenus();
  });

  // Picom may start after Seeker at login.
  // Only a change seen three times in a row counts (a busy computer can give one odd answer), and
  // after two minutes without a change the checks stop: the window manager has settled.
  let checks = 0, seen = null, streak = 0, quiet = 0;
  const recheck = setInterval(async () => {
    const c = await detectCompositor();
    checks++;
    if (c === null || c === composited) { streak = 0; seen = null; if (++quiet >= 24) clearInterval(recheck); return; }
    quiet = 0;
    streak = c === seen ? streak + 1 : 1; seen = c;
    if (streak < 3) return;
    streak = 0; seen = null;
    composited = c; broadcast('compositor', c);
    if (menubar && !menubar.isDestroyed() && !FLAGS.noMenubar) { const old = menubar; menubar = null; old.destroy(); createMenubar(); }
  }, 5000);

  handleArgs(args, false);
});

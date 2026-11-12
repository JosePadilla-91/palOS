'use strict';
// Kibble: what require('electron') gives a palOS app's main process. The same calls palOS apps make today
// (BrowserWindow, ipcMain, app, Menu, dialog, shell, screen, nativeTheme, clipboard...), on WebKit windows that
// kibble-host draws through palOS's own window layer. No Chromium, no GTK.
const { EventEmitter } = require('events');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const KIBBLE = process.env.KIBBLE_ROOT || path.join(__dirname, '..');
const HOST = process.env.KIBBLE_HOST || path.join(KIBBLE, 'bin', 'kibble-host');
const BRIDGE = fs.readFileSync(path.join(__dirname, 'bridge.js'), 'utf8')
  // <video>, <audio> and new Audio(), played by Kibble's media engine (palOS's WebKit has no media of its own)
  + '\n' + (() => { try { return fs.readFileSync(path.join(__dirname, 'media-page.js'), 'utf8'); } catch { return ''; } })();
const media = require('./media');

// ---------------------------------------------------------------- JSON that keeps Buffers and Dates
function enc(k, v) {
  const raw = this[k];
  if (raw === undefined && Array.isArray(this)) return { __kb: 'undef' };   // undefined arguments stay undefined
  if (raw instanceof Date) return { __kb: 'date', t: raw.getTime() };
  if (v && v.type === 'Buffer' && Array.isArray(v.data)) return { __kb: 'u8', b64: Buffer.from(v.data).toString('base64') };
  if (raw instanceof Uint8Array) return { __kb: 'u8', b64: Buffer.from(raw).toString('base64') };
  if (raw instanceof ArrayBuffer) return { __kb: 'u8', b64: Buffer.from(raw).toString('base64') };
  return v;
}
function dec(k, v) {
  if (v && typeof v === 'object' && v.__kb === 'undef') return undefined;
  if (v && typeof v === 'object' && v.__kb === 'u8') return Buffer.from(v.b64, 'base64');
  if (v && typeof v === 'object' && v.__kb === 'date') return new Date(v.t);
  return v;
}
const toJSON = (v) => JSON.stringify(v === undefined ? null : v, enc);

// ---------------------------------------------------------------- the host process
let host = null, hostReady = null, screenInfo = { width: 1280, height: 800, work: null };
function startHost() {
  if (hostReady) return hostReady;
  hostReady = new Promise((resolve) => {
    const env = Object.assign({}, process.env, {
      WPE_PLATFORMS_PATH: process.env.WPE_PLATFORMS_PATH || path.join(KIBBLE, 'platforms'),
      WPE_PLATFORM: process.env.WPE_PLATFORM || 'paladin',
      KIBBLE_APP_ID: app.getName(), KIBBLE_APP_CLASS: windowClass(),
      KIBBLE_DATA_DIR: path.join(app.getPath('userData'), 'WebKit'), KIBBLE_CACHE_DIR: path.join(os.homedir(), '.cache', app.getName()),
    });
    host = spawn(HOST, [], { stdio: ['pipe', 'pipe', 'inherit'], env });
    host.on('exit', (code) => { host = null; if (!quitting) { process.stderr.write(`kibble: the window host stopped (${code})\n`); process.exit(code || 1); } });
    readline.createInterface({ input: host.stdout }).on('line', (line) => {
      let m; try { m = JSON.parse(line); } catch { return; }
      if (m.ev === 'ready') { if (m.screen) screenInfo = m.screen; for (const n of schemeNames) host.stdin.write(JSON.stringify({ op: 'scheme', name: n }) + '\n'); resolve(); return; }
      if (m.ev === 'scheme') { onScheme(m); return; }
      const w = windows.get(m.id); if (!w) return;
      w._hostEvent(m);
    });
  });
  return hostReady;
}
const hostSend = (m) => { if (host) host.stdin.write(JSON.stringify(m) + '\n'); };

// The window class (WM_CLASS) the Dock matches against the app's .desktop StartupWMClass. palOS 27 build 26 used
// the display name ("Calendar"), which broke apps whose launcher says "paladin-calendar" (Calendar, Mail, Address
// Book, the Chancery apps): their windows showed a blank package icon in the Dock. The app's own StartupWMClass
// wins: from the .desktop inside the .app, then the one palOS registered for it, then the name Electron used.
function windowClass() {
  const wmOf = (f) => { try { const m = /^StartupWMClass=(.+)$/m.exec(fs.readFileSync(f, 'utf8')); return m ? m[1].trim() : null; } catch { return null; } };
  try {
    const appDir = process.env.PALOS_APP_RESOURCES ? path.dirname(process.env.PALOS_APP_RESOURCES) : null;
    if (appDir) {
      for (const f of fs.readdirSync(appDir)) if (f.endsWith('.desktop')) { const w = wmOf(path.join(appDir, f)); if (w) return w; }
      let id = null; try { id = JSON.parse(fs.readFileSync(path.join(appDir, 'palos-app.json'), 'utf8')).id; } catch {}
      for (const d of ['/usr/local/share/applications', '/usr/share/applications']) { const w = id && wmOf(path.join(d, id + '.desktop')); if (w) return w; }
    }
    if (pkg.desktopName) { for (const d of ['/usr/local/share/applications', '/usr/share/applications']) { const w = wmOf(path.join(d, pkg.desktopName)); if (w) return w; } }
  } catch {}
  return app.getName();
}

// ---------------------------------------------------------------- an app's own addresses (protocol.handle) and sendSync
const schemeNames = new Set(), schemeHandlers = new Map();
function wantScheme(name) { if (!schemeNames.has(name)) { schemeNames.add(name); hostSend({ op: 'scheme', name }); } }
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp',
  html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', txt: 'text/plain', xml: 'application/xml',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', pdf: 'application/pdf', wasm: 'application/wasm',
  mp3: 'audio/mpeg', ogg: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac', mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska' };
const mimeOf = (f) => MIME[String(f).split('.').pop().toLowerCase()] || 'application/octet-stream';
// net.fetch of a file: answers with the file itself (the window host streams it, nothing is copied through here)
function fileResponse(u) {
  let p; try { p = decodeURIComponent(new URL(u).pathname); } catch { return new Response('bad address', { status: 400 }); }
  let body; try { body = fs.readFileSync(p); } catch { return new Response('not found', { status: 404 }); }
  const r = new Response(body, { status: 200, headers: { 'content-type': mimeOf(p) } });
  Object.defineProperty(r, '_kibbleFile', { value: p });
  return r;
}
async function onScheme(m) {
  const reply = (o) => hostSend(Object.assign({ op: 'scheme-reply', rid: m.rid }, o));
  try {
    const u = new URL(m.url), name = u.protocol.slice(0, -1);
    const body = m.body ? Buffer.from(m.body, 'base64') : null;
    if (name === 'kibble-ipc') {             // ipcRenderer.sendSync: the listener's e.returnValue goes back to the page
      const msg = JSON.parse(body ? body.toString('utf8') : '{}', dec);
      const w = windows.get(m.id);
      const e = { sender: w ? w.webContents : null, returnValue: undefined, reply() {}, frameId: 0, processId: 0 };
      ipcMain.emit(msg.ch, e, ...(msg.args || []));
      return reply({ status: 200, type: 'application/json', data: Buffer.from(toJSON({ v: e.returnValue })).toString('base64') });
    }
    const fn = schemeHandlers.get(name);
    if (!fn) return reply({ status: 0 });
    const req = new Request(m.url.replace(/^[a-z][a-z0-9+.-]*:/i, 'http:'), { method: m.method || 'GET', body: body && !/^(GET|HEAD)$/i.test(m.method) ? body : undefined });
    Object.defineProperty(req, 'url', { value: m.url });
    const res = await fn(req);
    if (!res) return reply({ status: 0 });
    if (res._kibbleFile) return reply({ status: res.status || 200, type: res.headers.get('content-type') || mimeOf(res._kibbleFile), file: res._kibbleFile });
    const buf = Buffer.from(await res.arrayBuffer());
    reply({ status: res.status || 200, type: res.headers.get('content-type') || 'application/octet-stream', data: buf.toString('base64') });
  } catch (e) {
    process.stderr.write(`kibble: ${m.url}: ${e.message}\n`);
    reply({ status: 0 });
  }
}

// ---------------------------------------------------------------- app
let quitting = false, ready = false, appName = null;
const pkg = (() => { try { return JSON.parse(fs.readFileSync(path.join(process.env.KIBBLE_APP_DIR || '.', 'package.json'), 'utf8')); } catch { return {}; } })();
const xdg = (v, d) => process.env[v] || path.join(os.homedir(), d);
function userDir(key, fallback) {
  try {
    const t = fs.readFileSync(path.join(xdg('XDG_CONFIG_HOME', '.config'), 'user-dirs.dirs'), 'utf8');
    const m = t.match(new RegExp(`^XDG_${key}_DIR="(.*)"`, 'm'));
    if (m) return m[1].replace('$HOME', os.homedir());
  } catch {}
  return path.join(os.homedir(), fallback);
}

class App extends EventEmitter {
  constructor() { super(); this.commandLine = { appendSwitch() {}, appendArgument() {}, hasSwitch: () => false, getSwitchValue: () => '' }; this.isPackaged = true; this.dock = undefined; }
  get name() { return this.getName(); } set name(n) { this.setName(n); }
  getName() { return appName || pkg.productName || pkg.name || 'Kibble App'; }
  setName(n) { appName = String(n); }
  getVersion() { return pkg.version || '1.0.0'; }
  getAppPath() { return process.env.KIBBLE_APP_DIR || process.cwd(); }
  getLocale() { return (process.env.LANG || 'en_CA').split('.')[0].replace('_', '-'); }
  getSystemLocale() { return this.getLocale(); }
  getPreferredSystemLanguages() { return [this.getLocale()]; }
  getPath(n) {
    const config = xdg('XDG_CONFIG_HOME', '.config');
    switch (n) {
      case 'home': return os.homedir();
      case 'appData': return config;
      case 'userData': case 'sessionData': return path.join(config, this.getName());
      case 'cache': return xdg('XDG_CACHE_HOME', '.cache');
      case 'temp': return os.tmpdir();
      case 'exe': return process.execPath;
      case 'desktop': return userDir('DESKTOP', 'Desktop');
      case 'documents': return userDir('DOCUMENTS', 'Documents');
      case 'downloads': return userDir('DOWNLOAD', 'Downloads');
      case 'music': return userDir('MUSIC', 'Music');
      case 'pictures': return userDir('PICTURES', 'Pictures');
      case 'videos': return userDir('VIDEOS', 'Videos');
      case 'logs': return path.join(config, this.getName(), 'logs');
      default: throw new Error(`Kibble: no path called "${n}"`);
    }
  }
  setPath() {}
  whenReady() { return ready ? Promise.resolve() : new Promise((r) => this.once('ready', r)); }
  isReady() { return ready; }
  setDesktopName() {} setAboutPanelOptions(o) { this._about = o; } setAppUserModelId() {} setAsDefaultProtocolClient() { return false; }
  addRecentDocument() {} clearRecentDocuments() {} setBadgeCount() { return false; } focus() { const w = BrowserWindow.getAllWindows()[0]; if (w) w.focus(); }
  quit() {
    if (quitting) return;
    const e = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    this.emit('before-quit', e); if (e.defaultPrevented) return;
    quitting = true;
    for (const w of [...windows.values()]) w.destroy();
    this.emit('will-quit', { preventDefault() {} });
    this.exit(0);
  }
  exit(code = 0) { quitting = true; this.emit('quit', {}, code); hostSend({ op: 'quit' }); setTimeout(() => process.exit(code), 50); }
  relaunch() { spawn(process.execPath, process.argv.slice(1), { detached: true, stdio: 'ignore' }).unref(); }
  requestSingleInstanceLock() { return singleInstance(); }
  releaseSingleInstanceLock() {}
  hasSingleInstanceLock() { return !!lockServer; }
}
const app = new App();

let lockServer = null;
function singleInstance() {
  const net = require('net');
  const sock = path.join(process.env.XDG_RUNTIME_DIR || os.tmpdir(), `kibble-${process.getuid()}-${app.getName().replace(/\W/g, '_')}.sock`);
  // A second copy hands its arguments to the first, then stops. Electron answers this synchronously, so the
  // hand-over runs in a short child process: it exits 0 only if a first copy took the arguments.
  const msg = JSON.stringify({ argv: process.argv, cwd: process.cwd() });
  try {
    require('child_process').execFileSync(process.execPath, ['-e',
      `const c=require('net').createConnection(${JSON.stringify(sock)});c.on('connect',()=>c.end(${JSON.stringify(msg)}));c.on('close',()=>{});c.on('error',()=>process.exit(1))`],
      { stdio: 'ignore', timeout: 2000 });
    return false;
  } catch {}
  try { fs.unlinkSync(sock); } catch {}
  lockServer = net.createServer((c) => { let b = ''; c.on('data', (d) => (b += d)); c.on('end', () => { try { const m = JSON.parse(b); app.emit('second-instance', {}, m.argv, m.cwd, {}); } catch {} }); });
  lockServer.listen(sock); lockServer.unref();
  return true;
}

// ---------------------------------------------------------------- windows
const windows = new Map();     // id -> BrowserWindow
let nextWin = 1, focusedId = null;
let evalSeq = 0; const evalWaiting = new Map();

class WebContents extends EventEmitter {
  constructor(win) { super(); this._win = win; this.id = win.id; this._loading = false; this._url = ''; this.session = session.defaultSession; this.navigationHistory = { canGoBack: () => false, canGoForward: () => false }; }
  get hostWebContents() { return null; }
  isDestroyed() { return this._win._destroyed; }
  // runs js with __kibble bound to this page's bridge (the window's page here; a view's frame in ViewContents)
  _kb(js) { this._run(`window.__kibble&&(function(__kibble){${js}})(window.__kibble)`); }
  send(ch, ...args) { if (!this.isDestroyed()) this._kb(`__kibble._emit(${JSON.stringify(ch)},${JSON.stringify(toJSON(args))})`); }
  postMessage(ch, msg) { this.send(ch, msg); }
  // the page's answer comes back (a promise is waited for), as in Electron
  executeJavaScript(js) {
    if (this.isDestroyed()) return Promise.reject(new Error('Object has been destroyed'));
    const req = ++evalSeq;
    return new Promise((resolve, reject) => { evalWaiting.set(req, { resolve, reject }); hostSend({ op: 'eval', id: this.id, js: String(js), req }); });
  }
  _run(js) { hostSend({ op: 'eval', id: this.id, js: String(js) }); }   // Kibble's own calls: no answer needed
  // files dragged out of the page (while the mouse button is down), as Electron's startDrag
  startDrag(item = {}) {
    const files = [].concat(item.files || [], item.file || []).filter(Boolean).map(String);
    if (!files.length || this.isDestroyed()) return;
    const uris = files.map((f) => { const u = new URL('file://'); u.pathname = path.resolve(f); return u.href; });
    // the picture that follows the pointer: { w, h, rgba } (RGBA bytes, base64), as the page drew it
    const ic = item.icon && typeof item.icon === 'object' && item.icon.rgba && item.icon.w && item.icon.h ? { w: item.icon.w | 0, h: item.icon.h | 0, rgba: String(item.icon.rgba) } : undefined;
    hostSend({ op: 'startDrag', id: this.id, uris, icon: ic });
  }
  loadFile(f, o = {}) { const u = new URL('file://'); u.pathname = path.resolve(f); if (o.search) u.search = o.search; if (o.hash) u.hash = o.hash; if (o.query) u.search = new URLSearchParams(o.query).toString(); return this.loadURL(u.href); }
  loadURL(u) { this._url = u; this._loading = true; if (this._win._created) hostSend({ op: 'load', id: this.id, url: u }); else this._win._pendingUrl = u; return new Promise((r) => this.once('did-finish-load', r)); }
  getURL() { return this._url; } getTitle() { return this._win._title; } isLoading() { return this._loading; }
  reload() { this.loadURL(this._url); } reloadIgnoringCache() { this.reload(); }
  focus() { this._win.focus(); } isFocused() { return this._win.isFocused(); }
  setWindowOpenHandler(fn) { this._openHandler = fn; }
  openDevTools() {} closeDevTools() {} toggleDevTools() {} isDevToolsOpened() { return false; }
  setZoomFactor() {} getZoomFactor() { return 1; } setZoomLevel() {} getZoomLevel() { return 0; } setVisualZoomLevelLimits() { return Promise.resolve(); }
  setUserAgent() {} getUserAgent() { return 'Kibble'; } setBackgroundThrottling() {} setAudioMuted() {} isAudioMuted() { return false; }
  insertCSS(css) { this.executeJavaScript(`(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.documentElement.appendChild(s)})()`); return Promise.resolve(''); }
  selectAll() { this.executeJavaScript('document.execCommand("selectAll")'); }
  copy() { this.executeJavaScript('document.execCommand("copy")'); } cut() { this.executeJavaScript('document.execCommand("cut")'); } paste() { this.executeJavaScript('document.execCommand("paste")'); }
  undo() { this.executeJavaScript('document.execCommand("undo")'); } redo() { this.executeJavaScript('document.execCommand("redo")'); } delete() { this.executeJavaScript('document.execCommand("delete")'); }
  print(o, cb) { this.executeJavaScript('window.print()'); if (cb) cb(true, ''); }
  // the page as a PDF: Paladium's PDF engine (/usr/lib/kibble/pdf-engine, on palOS's Chromium-based runtime) lays out
  // a copy of the page as it is now (same address, so its pictures and styles load) and prints it
  async printToPDF(opts = {}) {
    if (this.isDestroyed()) throw new Error('Object has been destroyed');
    const os = require('os'), fs = require('fs'), cp = require('child_process');
    const html = await this.executeJavaScript('"<!DOCTYPE html>\\n" + document.documentElement.outerHTML');
    const base = this._url && /^(file|https?):/.test(this._url) ? this._url : '';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paladium-pdf-'));
    const src = path.join(dir, 'page.html'), out = path.join(dir, 'page.pdf');
    // the copy keeps the page's own address for its files, and drops scripts (it's printed as shown)
    let page = String(html).replace(/<script\b[\s\S]*?<\/script>/gi, '');
    if (base && !/<base\s/i.test(page)) page = page.replace(/<head([^>]*)>/i, (m) => `${m}<base href="${base.replace(/"/g, '&quot;')}">`);
    fs.writeFileSync(src, page);
    const RT = '/usr/lib/paladin-runtime/electron-44/paladin-app';
    const o = Object.assign({}, opts);
    const env = Object.assign({}, process.env, { PALOS_APP_DIR: '/usr/lib/kibble/pdf-engine', PALADIUM_PDF_IN: 'file://' + src, PALADIUM_PDF_OUT: out, PALADIUM_PDF_OPTS: JSON.stringify(o), ELECTRON_RUN_AS_NODE: '' });
    delete env.ELECTRON_RUN_AS_NODE;
    try {
      await new Promise((resolve, reject) => {
        const args = [process.env.DISPLAY ? '--ozone-platform=x11' : '--ozone-platform=headless', '--no-sandbox'];
        cp.execFile(RT, args, { env, timeout: 150000, maxBuffer: 4 << 20 }, (err, so, se) => {
          if (!err && fs.existsSync(out)) resolve(); else reject(new Error('The PDF couldn’t be made' + (se ? ': ' + String(se).trim().split('\n').pop() : (err ? ': ' + err.message : ''))));
        });
      });
      return fs.readFileSync(out);
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
  }
  capturePage() { return Promise.resolve(nativeImage.createEmpty()); }
  // sendInputEvent({ type: 'keyDown'|'keyUp'|'char', keyCode, modifiers }): a real key press (keyboard only)
  sendInputEvent(e = {}) {
    if (this.isDestroyed() || !e.type) return;
    const t = String(e.type).toLowerCase();
    if (t !== 'keydown' && t !== 'keyup' && t !== 'char') return;
    if (t === 'char') return;     // keyDown already types the character
    const NAMES = { Return: 'Return', Enter: 'Return', Delete: 'Delete', Backspace: 'BackSpace', Tab: 'Tab', Escape: 'Escape', Esc: 'Escape',
      Up: 'Up', Down: 'Down', Left: 'Left', Right: 'Right', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Home: 'Home', End: 'End',
      PageUp: 'Prior', PageDown: 'Next', Space: 'space', ' ': 'space', Insert: 'Insert', Plus: 'plus', '+': 'plus', '-': 'minus', '=': 'equal', ',': 'comma',
      '.': 'period', '/': 'slash', '\\': 'backslash', ';': 'semicolon', "'": 'apostrophe', '[': 'bracketleft', ']': 'bracketright', '`': 'grave' };
    const k = String(e.keyCode || ''), key = NAMES[k] || (k.length === 1 ? k.toLowerCase() : k);
    let mods = 0;
    for (const m of e.modifiers || []) { const x = String(m).toLowerCase(); if (x === 'control' || x === 'ctrl' || x === 'cmdorctrl') mods |= 1; else if (x === 'shift') mods |= 2; else if (x === 'alt') mods |= 4; else if (x === 'meta' || x === 'super' || x === 'cmd') mods |= 8; }
    const win = this._view ? this._view._parent : this._win;
    if (win && !win._destroyed) hostSend({ op: 'key', id: win.id, key, mods, down: t === 'keydown' });
  }
  close() { this._win.close(); }
  getOSProcessId() { return process.pid; } getProcessId() { return process.pid; }
}

class BrowserWindow extends EventEmitter {
  constructor(o = {}) {
    super();
    this.id = nextWin++;
    this._o = o; this._title = o.title || app.getName(); this._destroyed = false; this._visible = o.show !== false;
    this._bounds = { x: o.x ?? -1, y: o.y ?? -1, width: o.width || 800, height: o.height || 600 };
    this._fits = !o.type || o.type === 'normal';     // an ordinary window: kept on screen and below the menu bar
    this._fit(this._bounds);
    this._state = { max: false, min: false, full: false, focused: false };
    this._parent = o.parent || null;
    this.webContents = new WebContents(this);
    windows.set(this.id, this);
    app.emit('web-contents-created', {}, this.webContents); app.emit('browser-window-created', {}, this);
    const wp = o.webPreferences || {};
    let preload = '';
    if (wp.preload) { try { preload = fs.readFileSync(wp.preload, 'utf8'); } catch (e) { process.stderr.write(`kibble: preload ${wp.preload}: ${e.message}\n`); } }
    const extra = [];
    if (Array.isArray(wp.additionalArguments)) extra.push(...wp.additionalArguments);
    // the app's preload runs with require('electron') and a small process object, like Electron's sandboxed preloads
    const shared = sessionPreloads.map((f) => { try { return preloadWrap(fs.readFileSync(f, 'utf8'), extra, f); } catch { return ''; } }).join('\n');
    this._bridge = BRIDGE + shared + preloadWrap(preload, extra, wp.preload);
    this._scripts = new Set();     // views whose frame script this window's page already has
    this.contentView = {
      addChildView: (v) => v._attach(this), removeChildView: (v) => { if (v._parent === this) v._detach(); },
      get children() { return [...views.values()].filter((v) => v._parent === this); },
    };
    startHost().then(() => {
      if (this._destroyed) return;
      hostSend({ op: 'create', id: this.id, url: this._pendingUrl || 'about:blank', width: this._bounds.width, height: this._bounds.height,
        x: this._bounds.x, y: this._bounds.y, title: this._title, show: this._visible,
        transparent: !!o.transparent, frame: o.frame !== false, type: o.type || '', bridge: this._bridge,
        parent: this._parent ? this._parent._xid || 0 : 0, alwaysOnTop: !!o.alwaysOnTop, skipTaskbar: !!o.skipTaskbar,
        focusable: o.focusable !== false, sticky: !!(o.visibleOnAllWorkspaces || o.sticky), clickThrough: !!o.clickThrough });
      this._created = true;
      for (const q of this._later || []) hostSend(q);
      this._later = null;
      if (themeSource !== 'system') hostSend({ op: 'theme', id: this.id, mode: themeSource });
      // made full screen (or kiosk, which is full screen for good), as Electron does
      if (o.fullscreen || o.kiosk) this.setFullScreen(true);
    });
  }
  static getAllWindows() { return [...windows.values()]; }
  static getFocusedWindow() { return windows.get(focusedId) || null; }
  static fromWebContents(wc) { if (!wc) return null; if (wc._view) return wc._view._parent; return wc._win || null; }
  static fromId(id) { return windows.get(id) || null; }

  _hostEvent(m) {
    const wc = this.webContents;
    switch (m.ev) {
      case 'xid': this._xid = m.xid; this.emit('native-window-handle', m.xid); break;   // (Kibble: the window now exists)
      case 'eval-result': {
        const p = evalWaiting.get(m.req); if (!p) break; evalWaiting.delete(m.req);
        if (m.ok) { let v; try { v = m.json === undefined ? undefined : JSON.parse(m.json); } catch { v = undefined; } p.resolve(v); }
        else p.reject(new Error(m.error || 'Script failed to execute'));
        break;
      }
      case 'message': this._message(m.data); break;
      case 'loaded':
        wc._loading = false;
        wc.executeJavaScript(accelScript(this));
        wc.emit('dom-ready'); wc.emit('did-finish-load');
        if (!this._shownOnce) { this._shownOnce = true; this.emit('ready-to-show'); }
        break;
      case 'title': {
        // as in Electron: the window takes the page's title unless the app prevents it
        const e = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
        this.emit('page-title-updated', e, m.title || '', false);
        if (!e.defaultPrevented && m.title) this.setTitle(m.title);
        break;
      }
      case 'resized': this._bounds.width = m.width; this._bounds.height = m.height; this.emit('resize'); this.emit('resized'); break;
      case 'focus':
        this._state.focused = m.focused;
        if (m.focused) { focusedId = this.id; this.emit('focus'); app.emit('browser-window-focus', {}, this); } else { if (focusedId === this.id) focusedId = null; this.emit('blur'); app.emit('browser-window-blur', {}, this); }
        break;
      case 'close-requested': this.close(); break;
      case 'open-external': {
        const h = wc._openHandler ? wc._openHandler({ url: m.url, frameName: '', features: '', disposition: 'new-window' }) : { action: 'deny' };
        if (!h || h.action !== 'allow') { if (!wc._openHandler) shell.openExternal(m.url); } else new BrowserWindow(h.overrideBrowserWindowOptions || {}).loadURL(m.url);
        break;
      }
      case 'closed': this._finish(); break;
    }
  }
  _message(raw) {
    let m; try { m = JSON.parse(raw, dec); } catch { return; }
    if (m.ch === 'kibble:frame-loaded') { const v = views.get(m.args[0]); if (v && v._url) { v.webContents._loading = false; v.webContents.emit('dom-ready'); v.webContents.emit('did-finish-load'); } return; }
    const view = m.v ? views.get(m.v) : null;
    if (m.v && (!view || view._parent !== this)) return;
    const wc = view ? view.webContents : this.webContents;
    const event = { sender: wc, senderFrame: { url: wc._url }, frameId: 0, processId: process.pid, returnValue: undefined, reply: (ch, ...a) => wc.send(ch, ...a) };
    if (m.ch === 'kibble:log') { process.stderr.write(`[${view ? 'view' : 'page'} ${m.args[0]}] ${m.args[1]}\n`); return; }
    if (m.ch === 'kibble:clipboard') { clipboard.writeText(m.args[0]); return; }
    if (m.ch === 'kibble:menu-closed') { contextClick(this, m.args[0], m.args[1]); return; }
    if (m.ch === 'kibble:accel') { accelClick(this, m.args[0]); return; }
    if (m.ch === 'kibble:media') { media.setup({ appName: app.getName(), schemeHandler: (u) => { try { return schemeHandlers.get(new URL(u).protocol.slice(0, -1)) || null; } catch { return null; } } }); media.fromPage(wc, m.args[0]); return; }
    if (m.ch === 'kibble:sheet') { require('./sheet').answered(m.args[0], m.args[1], m.args[2]); return; }
    if (m.t === 'send') { ipcMain.emit(m.ch, event, ...(m.args || [])); return; }
    if (m.t === 'invoke') {
      const h = handlers.get(m.ch);
      const answer = (ok, v) => wc._kb(`__kibble._reply(${m.rid},${ok},${v === undefined ? 'undefined' : JSON.stringify(ok ? toJSON(v) : JSON.stringify(String(v && v.message || v)))})`);
      if (!h) { process.stderr.write(`kibble: no handler for invoke '${m.ch}'\n`); answer(false, `No handler registered for '${m.ch}'`); return; }
      Promise.resolve().then(() => h(event, ...(m.args || []))).then((v) => answer(true, v), (e) => { process.stderr.write(`kibble: invoke '${m.ch}' failed: ${e && e.stack || e}\n`); answer(false, e); });
    }
  }
  _finish() {
    if (this._destroyed) return;
    try { media.closeOwner(this.webContents); } catch {}
    this._destroyed = true; windows.delete(this.id);
    for (const v of views.values()) if (v._parent === this) v._parent = null;
    if (focusedId === this.id) focusedId = null;
    this.emit('closed'); this.webContents.emit('destroyed');
    if (windows.size === 0 && !quitting) { if (app.listenerCount('window-all-closed')) app.emit('window-all-closed'); else app.quit(); }
  }

  close() {
    if (this._destroyed) return;
    const e = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    this.emit('close', e);
    if (e.defaultPrevented) return;
    this.destroy();
  }
  destroy() { if (this._destroyed) return; hostSend({ op: 'close', id: this.id }); this._finish(); }
  isDestroyed() { return this._destroyed; }
  show() { this._visible = true; hostSend({ op: 'show', id: this.id }); hostSend({ op: 'focus', id: this.id }); this.emit('show'); }
  showInactive() { this._visible = true; hostSend({ op: 'show', id: this.id }); this.emit('show'); }
  hide() { this._visible = false; hostSend({ op: 'hide', id: this.id }); this.emit('hide'); }
  isVisible() { return this._visible && !this._destroyed; }
  focus() { hostSend({ op: 'focus', id: this.id }); } blur() {} isFocused() { return focusedId === this.id; }
  loadFile(f, o) { return this.webContents.loadFile(f, o); } loadURL(u) { return this.webContents.loadURL(u); }
  setTitle(t) { this._title = String(t); hostSend({ op: 'title', id: this.id, title: this._title }); } getTitle() { return this._title; }
  getBounds() { return Object.assign({}, this._bounds); } getContentBounds() { return this.getBounds(); }
  // keeps an ordinary window inside the work area (the screen minus the menu bar and the Dock): no larger than it,
  // and its top never under the menu bar. x/y of -1 mean "let the window manager place it".
  _fit(b) {
    if (!this._fits) return b;
    let wa; try { wa = screen.getPrimaryDisplay().workArea; } catch (e) { return b; }
    if (!wa || !wa.width) return b;
    if (b.width > wa.width) b.width = wa.width;
    if (b.height > wa.height) b.height = wa.height;
    if (b.y !== undefined && b.y !== -1 && b.y < wa.y) b.y = wa.y;
    return b;
  }
  setBounds(b) { b = this._fit(Object.assign({}, b)); Object.assign(this._bounds, b); if (b.width || b.height) hostSend({ op: 'resize', id: this.id, width: this._bounds.width, height: this._bounds.height }); if (b.x !== undefined || b.y !== undefined) hostSend({ op: 'move', id: this.id, x: this._bounds.x, y: this._bounds.y }); }
  setContentBounds(b) { this.setBounds(b); }
  getSize() { return [this._bounds.width, this._bounds.height]; } getContentSize() { return this.getSize(); }
  setSize(w, h) { this.setBounds({ width: w, height: h }); } setContentSize(w, h) { this.setSize(w, h); }
  getPosition() { return [this._bounds.x, this._bounds.y]; } setPosition(x, y) { this.setBounds({ x, y }); }
  center() { const s = screen.getPrimaryDisplay().workArea; this.setPosition(Math.round(s.x + (s.width - this._bounds.width) / 2), Math.round(s.y + (s.height - this._bounds.height) / 2)); }
  maximize() { this._state.max = true; hostSend({ op: 'maximize', id: this.id }); this.emit('maximize'); }
  unmaximize() { this._state.max = false; hostSend({ op: 'unmaximize', id: this.id }); this.emit('unmaximize'); }
  isMaximized() { return this._state.max; }
  minimize() { this._state.min = true; hostSend({ op: 'minimize', id: this.id }); this.emit('minimize'); }
  restore() { this._state.min = false; this.show(); this.emit('restore'); } isMinimized() { return this._state.min; }
  setFullScreen(f) { this._state.full = !!f; hostSend({ op: f ? 'fullscreen' : 'unfullscreen', id: this.id }); this.emit(f ? 'enter-full-screen' : 'leave-full-screen'); }
  isFullScreen() { return this._state.full; } isNormal() { return !this._state.max && !this._state.min && !this._state.full; }
  getParentWindow() { return this._parent; } getChildWindows() { return [...windows.values()].filter((w) => w._parent === this); }
  getNativeWindowHandle() { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(this._xid || 0)); return b; }
  // a window's own menu goes to palOS's menu bar while the window is in front (as Electron's does on palOS)
  setMenu(m) { this._menu = m || null; windowMenuChanged(this); } removeMenu() { this.setMenu(null); }
  setMenuBarVisibility() {} setAutoHideMenuBar() {} isMenuBarVisible() { return false; }
  setProgressBar() {} setOverlayIcon() {} setRepresentedFilename(f) { this._represented = f; } getRepresentedFilename() { return this._represented || ''; }
  setDocumentEdited(e) { this._edited = !!e; } isDocumentEdited() { return !!this._edited; }
  setAlwaysOnTop(f) { this._onTop = !!f; } isAlwaysOnTop() { return !!this._onTop; } setVisibleOnAllWorkspaces() {} setSkipTaskbar() {}
  setBackgroundColor() {} setOpacity() {} getOpacity() { return 1; } setHasShadow() {}
  // sent once the window exists (an app may call these right after new BrowserWindow)
  _op(msg) { msg.id = this.id; if (this._created) hostSend(msg); else (this._later || (this._later = [])).push(msg); }
  // Electron: the window is drawn only inside these rectangles ([] = nothing, null = all of it)
  setShape(rects) { this._op({ op: 'shape', kind: 'bounding', rects: rects ? rects.map((r) => [r.x, r.y, r.width, r.height]) : null }); }
  // Kibble: the window takes clicks only inside these rectangles (the rest goes to whatever is behind it)
  setInputRegion(rects) { this._op({ op: 'shape', kind: 'input', rects: rects ? rects.map((r) => Array.isArray(r) ? r : [r.x, r.y, r.width, r.height]) : null }); }
  setIgnoreMouseEvents(ignore) { this.setInputRegion(ignore ? [] : null); }
  // Kibble: a window property for the window manager: CARDINAL numbers or ATOM names (values null removes it)
  setXProperty(name, type, values) { this._op({ op: 'xprop', name, type: type || 'CARDINAL', values: values || [] }); } setResizable(r) { this._o.resizable = r; } isResizable() { return this._o.resizable !== false; }
  setMinimumSize() {} setMaximumSize() {} setAspectRatio() {} setIcon() {} flashFrame() {} setFocusable() {} setClosable() {} setMovable() {} setMinimizable() {} setMaximizable() {}
  isModal() { return !!this._o.modal; } isEnabled() { return true; } setEnabled() {} moveTop() { this.focus(); }
}

// ---------------------------------------------------------------- views inside a window (WebContentsView)
// Electron layers a second web page over part of a window. Kibble puts it in a see-through frame in the
// window's own page: same look, its own preload and its own message channel. palOS's Save, Open and alert
// sheets (Seeker's sheet.js, used by every app through dialog-hook.js) are made this way.
const views = new Map();     // id -> WebContentsView
function preloadWrap(preload, extra, file) {
  if (!preload) return '';
  // what Electron gives a sandboxed preload: require (electron and a few small modules), process, module/exports,
  // global, __dirname/__filename, setImmediate/clearImmediate
  const dir = file ? path.dirname(file) : '', name = file || '';
  return `\n;(function(require,process,module,exports,global,__dirname,__filename,setImmediate,clearImmediate){try{\n${preload}\n}catch(e){console.error('preload: '+(e&&e.message),e)}})(`
    + `function(m){if(m==='electron'||m==='electron/renderer')return window.__kibble.electron;`
    + `if(m==='path')return {join:function(){return [].slice.call(arguments).join('/').replace(/\\/+/g,'/')},basename:function(p){return String(p).split('/').pop()},dirname:function(p){return String(p).replace(/\\/[^\\/]*$/,'')||'/'},sep:'/'};`
    + `if(m==='events'){var E=function(){this._l={}};E.prototype.on=function(n,f){(this._l[n]=this._l[n]||[]).push(f);return this};E.prototype.addListener=E.prototype.on;E.prototype.off=function(n,f){this._l[n]=(this._l[n]||[]).filter(function(x){return x!==f});return this};E.prototype.removeListener=E.prototype.off;E.prototype.emit=function(n){var a=[].slice.call(arguments,1);(this._l[n]||[]).slice().forEach(function(f){f.apply(null,a)});return true};E.prototype.once=function(n,f){var s=this,w=function(){s.off(n,w);f.apply(null,arguments)};return this.on(n,w)};E.EventEmitter=E;return E}`
    + `if(m==='timers')return {setTimeout:setTimeout,clearTimeout:clearTimeout,setInterval:setInterval,clearInterval:clearInterval,setImmediate:function(f){return setTimeout(f,0)},clearImmediate:clearTimeout};`
    + `throw new Error('Kibble preloads can only require electron, path, events and timers: '+m)},`
    + `Object.assign(window.__kibble.process,{argv:${JSON.stringify(extra || [])}}),(function(){var m={exports:{}};return m})(),{},window,${JSON.stringify(dir)},${JSON.stringify(name)},`
    + `function(f){var a=[].slice.call(arguments,1);return setTimeout(function(){f.apply(null,a)},0)},clearTimeout);`;
}
class ViewContents extends WebContents {
  constructor(view) { super({ id: view.id, _destroyed: false }); this._view = view; this._win = null; this.id = view.id; }
  isDestroyed() { return this._view._destroyed; }
  _frame(js) { return `(function(){var f=document.getElementById('kv${this.id}');var w=f&&f.contentWindow;${js}})()`; }
  executeJavaScript(js) { const p = this._view._parent; if (p && !p._destroyed) p.webContents.executeJavaScript(this._frame(`if(w)try{w.eval(${JSON.stringify(String(js))})}catch(e){}`)); return Promise.resolve(); }
  _kb(js) { const p = this._view._parent; if (p && !p._destroyed) p.webContents.executeJavaScript(this._frame(`if(w&&w.__kibble)(function(__kibble){${js}})(w.__kibble)`)); }
  // a view's page may forbid eval (sheet.html does): its stylesheet is added from the window around it instead
  insertCSS(css) {
    const p = this._view._parent;
    if (p && !p._destroyed) p.webContents.executeJavaScript(this._frame(`try{var d=w&&w.document;if(d){var s=d.createElement('style');s.textContent=${JSON.stringify(String(css))};(d.head||d.documentElement).appendChild(s)}}catch(e){}`));
    return Promise.resolve('');
  }
  loadURL(u) { this._url = u; this._view._url = u; this._loading = true; this._view._src(); return new Promise((r) => this.once('did-finish-load', r)); }
  getTitle() { return ''; }
  // the frame's window takes the keyboard, keeping whatever field inside it already has focus (focusing the
  // frame element itself would reset that: a sheet's name field would lose it)
  focus() { const p = this._view._parent; if (p) { p.focus(); p.webContents.executeJavaScript(this._frame('if(f&&document.activeElement!==f){try{w.focus()}catch(e){}}')); } }
  isFocused() { return false; }
  close() { this._view._destroy(); }
}
class WebContentsView extends EventEmitter {
  constructor(o = {}) {
    super();
    this.id = nextWin++; this._o = o; this._url = ''; this._parent = null; this._destroyed = false; this._visible = true; this._bg = 'transparent';
    this._bounds = { x: 0, y: 0, width: 0, height: 0 };
    const wp = o.webPreferences || {};
    let preload = '';
    if (wp.preload) { try { preload = fs.readFileSync(wp.preload, 'utf8'); } catch (e) { process.stderr.write(`kibble: preload ${wp.preload}: ${e.message}\n`); } }
    // runs only in this view's frame (all frames of the window get it; the frame's id picks it out)
    this._script = `if(window!==window.top&&window.frameElement&&window.frameElement.id==='kv${this.id}'){window.__kibbleView=${this.id};\n${BRIDGE}\n${preloadWrap(preload, [], wp.preload)}\n}`;
    this.webContents = new ViewContents(this);
    views.set(this.id, this);
    app.emit('web-contents-created', {}, this.webContents);
  }
  setBounds(b) { Object.assign(this._bounds, b || {}); this._style(); }
  getBounds() { return Object.assign({}, this._bounds); }
  setVisible(v) { this._visible = !!v; this._style(); } getVisible() { return this._visible; }
  setBackgroundColor(c) { this._bg = /^#?0{6}00$|^#00000000$|transparent/i.test(String(c)) ? 'transparent' : String(c); this._style(); }
  setBorderRadius() {}
  _css() { const b = this._bounds; return `position:fixed;left:${b.x}px;top:${b.y}px;width:${b.width}px;height:${b.height}px;border:0;margin:0;padding:0;z-index:2147483600;background:${this._bg};display:${this._visible ? 'block' : 'none'}`; }
  _style() { if (this._parent) this._parent.webContents.executeJavaScript(`(function(f){if(f)f.style.cssText=${JSON.stringify(this._css())}})(document.getElementById('kv${this.id}'))`); }
  _src() { if (this._parent && this._url) this._parent.webContents.executeJavaScript(`(function(f){if(f)f.src=${JSON.stringify(this._url)}})(document.getElementById('kv${this.id}'))`); }
  _attach(win) {
    if (this._parent === win || this._destroyed) return;
    if (this._parent) this._detach();
    this._parent = win;
    if (!win._scripts.has(this.id)) { win._scripts.add(this.id); hostSend({ op: 'script', id: win.id, js: this._script }); }
    const id = this.id;
    win.webContents.executeJavaScript(`(function(){var f=document.createElement('iframe');f.id='kv${id}';f.setAttribute('allowtransparency','true');`
      + `f.style.cssText=${JSON.stringify(this._css())};`
      + `f.onload=function(){if(f.src&&f.src!=='about:blank')window.webkit.messageHandlers.kibble.postMessage(JSON.stringify({t:'send',ch:'kibble:frame-loaded',args:[${id}]}))};`
      + `f.src=${JSON.stringify(this._url || 'about:blank')};(document.body||document.documentElement).appendChild(f)})()`);
  }
  _detach() { const p = this._parent; this._parent = null; if (p && !p._destroyed) p.webContents.executeJavaScript(`(function(f){if(f)f.remove()})(document.getElementById('kv${this.id}'))`); }
  _destroy() { if (this._destroyed) return; this._detach(); this._destroyed = true; views.delete(this.id); this.webContents.emit('destroyed'); }
}

// ---------------------------------------------------------------- ipcMain
const handlers = new Map();
const ipcMain = new EventEmitter();
ipcMain.handle = (ch, fn) => { if (handlers.has(ch)) throw new Error(`Attempted to register a second handler for '${ch}'`); handlers.set(ch, fn); };
ipcMain.handleOnce = (ch, fn) => ipcMain.handle(ch, (...a) => { handlers.delete(ch); return fn(...a); });
ipcMain.removeHandler = (ch) => handlers.delete(ch);
ipcMain.setMaxListeners(0);

// ---------------------------------------------------------------- screen
const screen = Object.assign(new EventEmitter(), {
  getPrimaryDisplay() {
    const s = screenInfo, b = { x: 0, y: 0, width: s.width, height: s.height };
    return { id: 1, bounds: b, workArea: s.work || b, size: { width: b.width, height: b.height }, workAreaSize: s.work ? { width: s.work.width, height: s.work.height } : { width: b.width, height: b.height }, scaleFactor: 1, rotation: 0, internal: false, monochrome: false, colorDepth: 24, accelerometerSupport: 'unknown', touchSupport: 'unknown' };
  },
  getAllDisplays() { return [screen.getPrimaryDisplay()]; },
  getDisplayMatching() { return screen.getPrimaryDisplay(); }, getDisplayNearestPoint() { return screen.getPrimaryDisplay(); },
  getCursorScreenPoint() { return { x: 0, y: 0 }; },
});

// ---------------------------------------------------------------- shell
const run = (cmd, args) => new Promise((res) => execFile(cmd, args, { timeout: 15000 }, (err) => res(err ? err.message : '')));
const shell = {
  openExternal: (u) => run('xdg-open', [String(u)]).then(() => undefined),
  openPath: (p) => run('xdg-open', [String(p)]),
  showItemInFolder: (p) => { run('dbus-send', ['--session', '--type=method_call', '--dest=org.freedesktop.FileManager1', '/org/freedesktop/FileManager1', 'org.freedesktop.FileManager1.ShowItems', `array:string:file://${p}`, 'string:']); },
  trashItem: async (p) => {
    // the freedesktop Trash, like Seeker's: files/ and info/ in ~/.local/share/Trash
    const T = path.join(xdg('XDG_DATA_HOME', '.local/share'), 'Trash');
    fs.mkdirSync(path.join(T, 'files'), { recursive: true }); fs.mkdirSync(path.join(T, 'info'), { recursive: true });
    let name = path.basename(p), n = 1;
    while (fs.existsSync(path.join(T, 'files', name))) name = `${path.basename(p)}.${n++}`;
    fs.writeFileSync(path.join(T, 'info', name + '.trashinfo'), `[Trash Info]\nPath=${encodeURI(path.resolve(p))}\nDeletionDate=${new Date().toISOString().slice(0, 19)}\n`);
    fs.renameSync(p, path.join(T, 'files', name));
  },
  beep: () => process.stdout.write('\x07'),
  writeShortcutLink: () => false, readShortcutLink: () => ({}),
};

// ---------------------------------------------------------------- clipboard (through the window host's X selection)
let clip = '';
const clipboard = {
  writeText(t) { clip = String(t); hostSend({ op: 'clipboard', text: clip }); const p = spawn('xclip', ['-selection', 'clipboard'], { stdio: ['pipe', 'ignore', 'ignore'] }); p.on('error', () => {}); p.stdin.end(clip); },
  readText() { try { return require('child_process').execFileSync('xclip', ['-selection', 'clipboard', '-o'], { timeout: 1500, encoding: 'utf8' }); } catch { return clip; } },
  writeHTML(h) { clipboard.writeText(h); }, readHTML() { return ''; }, write(o) { if (o && o.text) clipboard.writeText(o.text); },
  read() { return ''; }, readBuffer() { return Buffer.alloc(0); }, writeBuffer() {}, availableFormats() { return ['text/plain']; }, clear() { clipboard.writeText(''); },
  readImage() { return nativeImage.createEmpty(); }, writeImage() {},
};

// ---------------------------------------------------------------- nativeImage
class NativeImage {
  constructor(buf, p) { this._buf = buf || Buffer.alloc(0); this._path = p || ''; }
  isEmpty() { return this._buf.length === 0; }
  toPNG() { return this._buf; } toJPEG() { return this._buf; } toBitmap() { return this._buf; } getBitmap() { return this._buf; }
  toDataURL() { const ext = path.extname(this._path).slice(1).toLowerCase(); const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'; return `data:${mime};base64,${this._buf.toString('base64')}`; }
  getSize() { const b = this._buf; if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; return { width: 0, height: 0 }; }
  resize() { return this; } crop() { return this; } setTemplateImage() {} isTemplateImage() { return false; } getAspectRatio() { const s = this.getSize(); return s.height ? s.width / s.height : 1; }
}
const nativeImage = {
  createEmpty: () => new NativeImage(),
  createFromPath: (p) => { try { return new NativeImage(fs.readFileSync(p), p); } catch { return new NativeImage(); } },
  createFromBuffer: (b) => new NativeImage(Buffer.from(b)), createFromBitmap: (b) => new NativeImage(Buffer.from(b)),
  createFromDataURL: (u) => new NativeImage(Buffer.from(String(u).split(',')[1] || '', 'base64'), String(u).includes('svg') ? 'x.svg' : 'x.png'),
};

// ---------------------------------------------------------------- nativeTheme: palOS's Dark Mode switch
// (org.gnome.desktop.interface color-scheme, the same setting Seeker follows). Pages follow it by themselves
// through the window layer; themeSource lets an app pick its own.
let systemDark = null, themeSource = 'system', monitor = null;
function readSystemDark() {
  try { return /prefer-dark/.test(require('child_process').execFileSync('gsettings', ['get', 'org.gnome.desktop.interface', 'color-scheme'], { encoding: 'utf8', timeout: 2000 })); } catch { return false; }
}
const nativeTheme = Object.assign(new EventEmitter(), {
  get themeSource() { return themeSource; },
  set themeSource(v) {
    themeSource = ['dark', 'light'].includes(v) ? v : 'system';
    for (const w of windows.values()) hostSend({ op: 'theme', id: w.id, mode: themeSource });
    nativeTheme.emit('updated');
  },
  get shouldUseDarkColors() {
    if (themeSource !== 'system') return themeSource === 'dark';
    if (systemDark === null) {
      systemDark = readSystemDark();
      try {   // follow the switch while the app runs
        monitor = spawn('gsettings', ['monitor', 'org.gnome.desktop.interface', 'color-scheme'], { stdio: ['ignore', 'pipe', 'ignore'] });
        monitor.on('error', () => {}); monitor.unref(); monitor.stdout.unref && monitor.stdout.unref();
        readline.createInterface({ input: monitor.stdout }).on('line', (l) => { const d = /prefer-dark/.test(l); if (d !== systemDark) { systemDark = d; nativeTheme.emit('updated'); } });
      } catch {}
    }
    return systemDark;
  },
  shouldUseHighContrastColors: false, shouldUseInvertedColorScheme: false, inForcedColorsMode: false, prefersReducedTransparency: false,
});
process.on('exit', () => { try { if (monitor) monitor.kill(); } catch {} });

// ---------------------------------------------------------------- dialog: palOS's own sheets, through the desktop portal
const dialog = {
  async showOpenDialog(win, o) { if (!(win instanceof BrowserWindow)) { o = win; win = null; } return require('./portal').open(win, o || {}); },
  async showSaveDialog(win, o) { if (!(win instanceof BrowserWindow)) { o = win; win = null; } return require('./portal').save(win, o || {}); },
  showOpenDialogSync() { return undefined; }, showSaveDialogSync() { return undefined; },
  async showMessageBox(win, o) { if (!(win instanceof BrowserWindow)) { o = win; win = null; } return require('./sheet').messageBox(win || BrowserWindow.getFocusedWindow(), o || {}); },
  showMessageBoxSync(win, o) { dialog.showMessageBox(win, o); return 0; },
  showErrorBox(title, content) { process.stderr.write(`${title}: ${content}\n`); const w = BrowserWindow.getFocusedWindow(); if (w) require('./sheet').messageBox(w, { type: 'error', message: title, detail: content, buttons: ['OK'] }); },
  showCertificateTrustDialog: async () => {},
};

// ---------------------------------------------------------------- menus: palOS's menu bar (Seeker reads them over DBus)
const { Menu, MenuItem, contextClick, accelClick, accelScript, windowMenuChanged } = require('./menu')({ BrowserWindow, app, windowsXid: () => [...windows.values()].map((w) => w._xid).filter(Boolean) });

// ---------------------------------------------------------------- the rest
const sessionPreloads = [];     // every page gets these first (palOS's translations add one)
const session = { defaultSession: {
  setPreloads(list) { sessionPreloads.splice(0, sessionPreloads.length, ...(list || [])); }, getPreloads: () => sessionPreloads.slice(),
  registerPreloadScript(o) { if (o && o.filePath && !sessionPreloads.includes(o.filePath)) sessionPreloads.push(o.filePath); return o && o.id; },
  unregisterPreloadScript(id) {}, getPreloadScripts: () => sessionPreloads.map((f) => ({ filePath: f, type: 'frame' })),
  setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, setSpellCheckerLanguages() {}, setSpellCheckerEnabled() {},
  clearCache: async () => {}, clearStorageData: async () => {}, on() {}, once() {}, webRequest: { onBeforeRequest() {}, onHeadersReceived() {}, onBeforeSendHeaders() {} },
  setUserAgent() {}, getUserAgent: () => 'Kibble', protocol: null, setDownloadPath() {}, setProxy: async () => {}, cookies: { get: async () => [], set: async () => {}, remove: async () => {} },
}, fromPartition() { return session.defaultSession; } };
const protocol = {
  registerSchemesAsPrivileged(list) { for (const x of list || []) if (x && x.scheme) wantScheme(x.scheme); },
  handle(name, fn) { schemeHandlers.set(name, fn); wantScheme(name); },
  unhandle(name) { schemeHandlers.delete(name); },
  isProtocolHandled: (name) => schemeHandlers.has(name),
  registerFileProtocol(name, fn) {            // the old form: the handler names a file
    this.handle(name, (req) => new Promise((res) => fn({ url: req.url, method: req.method }, (r) => res(fileResponse('file://' + (typeof r === 'string' ? r : r && r.path))))));
    return true;
  },
};
const globalShortcut = { register: () => false, registerAll() {}, unregister() {}, unregisterAll() {}, isRegistered: () => false };
const powerSaveBlocker = { start: () => 0, stop() {}, isStarted: () => false };
const powerMonitor = Object.assign(new EventEmitter(), { getSystemIdleTime: () => 0, getSystemIdleState: () => 'active', isOnBatteryPower: () => false });
const safeStorage = { isEncryptionAvailable: () => false, encryptString: (s) => Buffer.from(String(s)), decryptString: (b) => Buffer.from(b).toString() };
const net = { fetch: (u, ...a) => (String(u && u.url || u).startsWith('file:') ? Promise.resolve(fileResponse(String(u && u.url || u))) : fetch(u, ...a)), isOnline: () => true, request() { throw new Error('Kibble: use net.fetch'); } };
const desktopCapturer = { getSources: async () => [] };
const systemPreferences = { getAccentColor: () => '8a96a3ff', getColor: () => '#000000', getMediaAccessStatus: () => 'granted', askForMediaAccess: async () => true, on() {} };
class Notification extends EventEmitter { constructor(o = {}) { super(); this.o = o; } show() { run('notify-send', [this.o.title || app.getName(), this.o.body || '']); this.emit('show'); } close() {} static isSupported() { return true; } }
class Tray extends EventEmitter { constructor() { super(); } setToolTip() {} setContextMenu() {} setImage() {} destroy() {} isDestroyed() { return false; } }
const crashReporter = { start() {} };
const autoUpdater = Object.assign(new EventEmitter(), { setFeedURL() {}, checkForUpdates() {}, quitAndInstall() {} });
const webContents = { getAllWebContents: () => [...windows.values(), ...views.values()].map((w) => w.webContents), fromId: (id) => (windows.get(id) || views.get(id) || {}).webContents || null, getFocusedWebContents: () => { const w = BrowserWindow.getFocusedWindow(); return w ? w.webContents : null; } };

// Start: the host first (windows can't exist without it), then the app's 'ready'
setImmediate(() => startHost().then(() => { ready = true; app.emit('will-finish-launching'); app.emit('ready', {}, {}); }));
process.on('SIGTERM', () => app.quit());

module.exports = {
  app, BrowserWindow, ipcMain, screen, shell, clipboard, nativeImage, nativeTheme, dialog, Menu, MenuItem, session, protocol, globalShortcut,
  powerSaveBlocker, powerMonitor, safeStorage, net, desktopCapturer, systemPreferences, Notification, Tray, crashReporter, autoUpdater, webContents,
  WebContentsView, View: WebContentsView,
  BrowserView: class { constructor() { throw new Error('Kibble: BrowserView is not supported'); } },
};

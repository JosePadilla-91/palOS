'use strict';
// palOS login screen (Kibble). paladin-login (palOS's login manager) starts it and checks passwords; this shows
// the screen and finds what to show (people, pictures, sessions) itself.
//
//   paladin-login, over the socket in $PALADIN_LOGIN_FD, one JSON object per line:
//     to it:   {op:"login",user,password,session}  {op:"cancel"}  {op:"power",what}
//     from it: {ev:"auth",ok,text}  {ev:"message",text,error}
//   the screen (ui/), through preload.js:
//     to it:   {ev:"init",...}  {ev:"look",dark,wallpaper}  {ev:"users",users}  {ev:"auth",ok,text}  {ev:"message",text,error}
//              {ev:"setup",state}
//     from it: {op:"ready"} {op:"look",user} {op:"login",user,password,session} {op:"cancel"} {op:"power",what}
//              {op:"windows"} {op:"setup",safe}
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');

const CONF = '/etc/paladin-greeter.conf';
const STATE = path.join(process.env.HOME || '/var/lib/paladin-login', '.paladin-greeter-state');
const SHARED = '/var/lib/paladin-login/users';            // each person's login-screen look (written by their session)
const DEFAULT_WALL = '/usr/share/backgrounds/palos/palOS Pupper.jpg';
const SETUP_FLAG = '/var/lib/palos/firstboot';
const SETUP_SAFE = '/var/lib/palos/firstboot-safe';
const SESSIONS = '/usr/share/xsessions';
const STARTUP_DISK = '/usr/lib/palos-boot/palos-startup-disk';

let win = null, dm = null, buf = '', disks = [];
const log = (...a) => console.error('paladin-greeter:', ...a);
const toUI = (m) => { if (win && !win.isDestroyed()) win.webContents.send('ev', m); };
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const run = (cmd, args, timeout = 10000) => new Promise((res) => {
  execFile(cmd, args, { timeout, encoding: 'utf8' }, (err, out, errOut) => res({ ok: !err, out: out || '', err: errOut || '' }));
});

// ---------------------------------------------------------------- settings and what to show
function readConf() {
  const c = { appearance: 'auto', 'show-user-list': 'true', background: '', 'clock-24h': 'false' };
  for (const line of read(CONF).split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const i = s.indexOf('=');
    c[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
  return c;
}
const conf = readConf();
let state = {};
try { state = JSON.parse(read(STATE) || '{}'); } catch {}
const writeState = () => { try { fs.writeFileSync(STATE, JSON.stringify(state)); } catch {} };

/** the people who can log in: accounts from 1000 up with a real shell */
function users() {
  const out = [];
  let logged = new Set();
  try {
    const r = require('child_process').execFileSync('loginctl', ['list-users', '--no-legend'], { encoding: 'utf8', timeout: 3000 });
    logged = new Set(r.split('\n').map((l) => l.trim().split(/\s+/)[1]).filter(Boolean));
  } catch {}
  for (const line of read('/etc/passwd').split('\n')) {
    const f = line.split(':');
    if (f.length < 7) continue;
    const uid = Number(f[2]);
    if (uid < 1000 || uid >= 60000 || /\/(nologin|false)$/.test(f[6]) || f[0] === 'paladin-login') continue;
    const name = f[0], display = (f[4] || '').split(',')[0] || name;
    let image = '';
    for (const p of [`/var/lib/AccountsService/icons/${name}`, path.join(f[5], '.face')]) {
      try { fs.accessSync(p, fs.constants.R_OK); if (fs.statSync(p).size > 0) { image = p; break; } } catch {}
    }
    out.push({ name, display, image, loggedIn: logged.has(name), session: '' });
  }
  return out.sort((a, b) => a.display.localeCompare(b.display));
}

/** Dark Mode and desktop picture this person uses (their session leaves them in SHARED/NAME) */
function look(name) {
  const want = conf.appearance || 'auto';
  let data = {};
  if (name && /^[a-z_][a-z0-9_.-]*$/i.test(name)) {
    const d = path.join(SHARED, name);
    try { data = JSON.parse(read(path.join(d, 'paladin.json')) || '{}'); } catch { data = {}; }
    const wp = path.join(d, 'wallpaper');
    data.wallpaper = fs.existsSync(wp) ? wp : null;
  }
  const dark = (want === 'light' || want === 'dark') ? want === 'dark' : data.dark !== false;
  const bg = conf.background || data.wallpaper || DEFAULT_WALL;
  return { dark, wallpaper: bg && fs.existsSync(bg) ? bg : '' };
}

function sessions() {
  const out = [];
  let names = [];
  try { names = fs.readdirSync(SESSIONS).filter((n) => n.endsWith('.desktop')); } catch {}
  for (const n of names) {
    const txt = read(path.join(SESSIONS, n));
    if (/^NoDisplay\s*=\s*true/mi.test(txt) || /^Hidden\s*=\s*true/mi.test(txt)) continue;
    const m = txt.match(/^Name\s*=\s*(.+)$/m);
    out.push({ key: n.slice(0, -8), name: m ? m[1].trim() : n.slice(0, -8) });
  }
  return out;
}

function defaultSession(user) {
  const keys = sessions().map((s) => s.key);
  for (const k of [user, state.session, 'paladin']) if (k && keys.includes(k)) return k;
  return keys[0] || null;
}

async function monitors() {
  const r = await run('xrandr', ['--query'], 5000);
  const out = [];
  for (const m of r.out.matchAll(/^(\S+) connected( primary)? (\d+)x(\d+)\+(\d+)\+(\d+)/gm)) {
    out.push({ name: m[1], primary: !!m[2], w: +m[3], h: +m[4], x: +m[5], y: +m[6] });
  }
  return out;
}

async function init() {
  const us = users();
  const r = await run('sudo', ['-n', STARTUP_DISK, 'list']);
  try { disks = JSON.parse(r.out || '[]'); } catch { disks = []; }
  const setup = fs.existsSync(SETUP_FLAG) && !us.length;
  const canSuspend = /\bmem\b/.test(read('/sys/power/state'));
  toUI({
    ev: 'init', host: os.hostname() || 'palOS', users: us,
    showOther: !us.length, hideUsers: conf['show-user-list'] === 'false',
    locked: false, hint: state.user || '',
    setupPending: setup, setupSafe: fs.existsSync(SETUP_SAFE),
    sessions: sessions(), defaultSession: defaultSession(null),
    userSessions: Object.fromEntries(us.map((u) => [u.name, defaultSession(u.session)])),
    power: { suspend: canSuspend, restart: true, shutdown: true },
    windows: disks.some((e) => e.name === 'Windows'),
    clock24: conf['clock-24h'] === 'true', monitors: await monitors(),
    look: look(state.user),
  });
  if (setup) setTimeout(() => startSetup(fs.existsSync(SETUP_SAFE)), 600);
}

// ---------------------------------------------------------------- setup (a computer with no account yet)
let setupProc = null;
function startSetup(safe) {
  try {
    if (safe) fs.writeFileSync(SETUP_SAFE, '');
    else if (fs.existsSync(SETUP_SAFE)) fs.unlinkSync(SETUP_SAFE);
  } catch (e) { log('safe-mode flag:', e.message); }
  if (setupProc) return;
  try {
    setupProc = spawn('/usr/lib/palos-firstboot/run-setup', [], { env: { ...process.env, PALOS_SETUP_FROM: 'login screen' }, stdio: 'inherit' });
  } catch (e) { log('setup could not start:', e.message); toUI({ ev: 'setup', state: 'failed' }); return; }
  toUI({ ev: 'setup', state: 'started' });
  setupProc.on('exit', () => { setupProc = null; toUI({ ev: 'setup', state: fs.existsSync(SETUP_FLAG) ? 'failed' : 'done' }); });
  setupProc.on('error', () => { setupProc = null; toUI({ ev: 'setup', state: 'failed' }); });
}

// ---------------------------------------------------------------- paladin-login
let pending = null;     // {user, session} while a password is being checked
function toDM(m) { try { dm.write(JSON.stringify(m) + '\n'); } catch (e) { log('login manager:', e.message); } }

function connect() {
  const fd = parseInt(process.env.PALADIN_LOGIN_FD, 10);
  if (!(fd > 2)) { log('not started by paladin-login (no PALADIN_LOGIN_FD): nobody can log in from here'); return; }
  dm = new net.Socket({ fd, readable: true, writable: true });
  dm.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      let m = null; try { m = JSON.parse(line); } catch {}
      if (!m) continue;
      if (m.ev === 'auth' && m.ok && pending) { state.user = pending.user; state.session = pending.session; writeState(); }
      if (m.ev === 'auth') pending = null;
      toUI(m);
      // logged in: the session is starting; the login screen goes, so nothing of it stays over the desktop
      if (m.ev === 'auth' && m.ok) setTimeout(() => app.exit(0), 300);
    }
  });
  dm.on('error', (e) => log('login manager:', e.message));
  dm.on('close', () => app.exit(0));
}

async function op(m) {
  switch (m.op) {
    case 'ready': return init();
    case 'look': return toUI({ ev: 'look', ...look(m.user) });
    case 'login': {
      const session = m.session || defaultSession(null);
      pending = { user: m.user || '', session };
      return toDM({ op: 'login', user: m.user || '', password: m.password || '', session });
    }
    case 'cancel': pending = null; return toDM({ op: 'cancel' });
    case 'power': return toDM({ op: 'power', what: m.what });
    case 'windows': {
      const w = disks.find((e) => e.name === 'Windows');
      if (!w) return;
      const r = await run('sudo', ['-n', STARTUP_DISK, 'next', w.id], 20000);
      if (r.ok) return toDM({ op: 'power', what: 'restart' });
      log('startup disk failed:', r.err);
      return toUI({ ev: 'message', text: 'Windows couldn’t be chosen for the next start.', error: true });
    }
    case 'setup': return startSetup(!!m.safe);
  }
}

app.whenReady().then(() => {
  connect();
  const d = screen.getPrimaryDisplay();
  const b = d.bounds || { x: 0, y: 0, width: 1280, height: 800 };
  win = new BrowserWindow({
    x: 0, y: 0, width: b.width, height: b.height, frame: false, resizable: false, movable: false, fullscreen: true,
    show: true, backgroundColor: '#22272d', title: 'palOS Login',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  ipcMain.on('win', (_e, what) => { if (what === 'hide') win.hide(); else { win.show(); win.focus(); } });
  ipcMain.on('op', (_e, m) => { op(m || {}).catch((e) => log(e.message)); });
});
app.on('window-all-closed', () => app.quit());

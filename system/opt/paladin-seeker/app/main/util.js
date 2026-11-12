'use strict';
// Small shared helpers for the main process.
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();

/** Run a command, resolve with stdout ('' on failure). Never rejects. */
function sh(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 32 << 20, timeout: opts.timeout || 15000, ...opts }, (err, out) => {
      resolve(err && !opts.keepOutput ? '' : String(out || ''));
    });
  });
}

/** Run a command, resolve {ok, out, err}. */
function run(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 32 << 20, timeout: opts.timeout || 60000, ...opts }, (err, out, errOut) => {
      resolve({ ok: !err, out: String(out || ''), err: String(errOut || (err && err.message) || '') });
    });
  });
}

/** Start a program fully detached from Seeker. */
function detached(cmd, args = [], opts = {}) {
  try {
    const env = { ...process.env, ...(opts.env || {}) };
    // Do not leak Electron's own variables into launched apps.
    delete env.ELECTRON_RUN_AS_NODE; delete env.ELECTRON_NO_ATTACH_CONSOLE; delete env.CHROME_DESKTOP;
    delete env.GDK_BACKEND; delete env.ELECTRON_RENDERER_URL;
    const p = spawn(cmd, args, { detached: true, stdio: 'ignore', cwd: opts.cwd || HOME, env });
    p.on('error', () => {});
    p.unref();
    return true;
  } catch { return false; }
}

const whichCache = new Map();
function which(cmd) {
  if (whichCache.has(cmd)) return whichCache.get(cmd);
  let found = null;
  if (cmd.includes('/')) found = isExec(cmd) ? cmd : null;
  else for (const d of (process.env.PATH || '/usr/local/bin:/usr/bin:/bin').split(':')) {
    const p = path.join(d, cmd);
    if (isExec(p)) { found = p; break; }
  }
  whichCache.set(cmd, found);
  return found;
}
function isExec(p) { try { fs.accessSync(p, fs.constants.X_OK); return fs.statSync(p).isFile(); } catch { return false; } }

function readText(p, fallback = '') { try { return fs.readFileSync(p, 'utf8'); } catch { return fallback; } }
function readJSON(p, fallback = null) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }
function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

function debounce(fn, ms) {
  let t = null;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** XDG user directories (Desktop, Documents, ...). */
function userDirs() {
  const out = {
    DESKTOP: path.join(HOME, 'Desktop'), DOCUMENTS: path.join(HOME, 'Documents'),
    DOWNLOAD: path.join(HOME, 'Downloads'), MUSIC: path.join(HOME, 'Music'),
    PICTURES: path.join(HOME, 'Pictures'), VIDEOS: path.join(HOME, 'Videos'),
    PUBLICSHARE: path.join(HOME, 'Public'), TEMPLATES: path.join(HOME, 'Templates'),
  };
  const txt = readText(path.join(process.env.XDG_CONFIG_HOME || path.join(HOME, '.config'), 'user-dirs.dirs'));
  for (const line of txt.split('\n')) {
    const m = line.match(/^XDG_([A-Z]+)_DIR="(.*)"\s*$/);
    if (m) out[m[1]] = m[2].replace(/^\$HOME/, HOME);
  }
  return out;
}

function dataDirs() {
  const home = process.env.XDG_DATA_HOME || path.join(HOME, '.local/share');
  const sys = (process.env.XDG_DATA_DIRS || '/usr/local/share:/usr/share').split(':').filter(Boolean);
  const all = [home, ...sys, '/var/lib/flatpak/exports/share', path.join(HOME, '.local/share/flatpak/exports/share'), '/var/lib/snapd/desktop'];
  return [...new Set(all)];
}

/** Limit concurrent async work. */
function limiter(n) {
  let active = 0; const q = [];
  const next = () => {
    if (active >= n || !q.length) return;
    active++;
    const { fn, res, rej } = q.shift();
    Promise.resolve().then(fn).then(res, rej).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((res, rej) => { q.push({ fn, res, rej }); next(); });
}

function humanSize(n) {
  if (n == null) return '--';
  if (n < 1000) return `${n} bytes`;
  const u = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let i = -1;
  do { n /= 1000; i++; } while (n >= 1000 && i < u.length - 1);
  return `${n >= 100 ? Math.round(n) : n.toFixed(1)} ${u[i]}`;
}

module.exports = { HOME, sh, run, detached, which, readText, readJSON, writeJSON, debounce, userDirs, dataDirs, limiter, humanSize };

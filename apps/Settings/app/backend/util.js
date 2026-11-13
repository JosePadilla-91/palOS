'use strict';
// Shared helpers for Paladin Settings' main process.
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const CONFIG = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');

/** Run a command; resolves {ok, out, err}. Never rejects. */
function run(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = execFile(cmd, args, { maxBuffer: 16 << 20, timeout: opts.timeout || 20000, env: opts.env || process.env }, (err, out, errOut) => {
        resolve({ ok: !err, code: err ? (err.code ?? 1) : 0, out: String(out || ''), err: String(errOut || (err && err.message) || '') });
      });
    } catch (e) { resolve({ ok: false, code: 127, out: '', err: e.message }); return; }
    if (opts.input != null) { child.stdin.end(opts.input); }
  });
}
async function out(cmd, args = [], opts = {}) { const r = await run(cmd, args, opts); return r.ok ? r.out : ''; }

const whichCache = new Map();
function which(cmd) {
  if (whichCache.has(cmd)) return whichCache.get(cmd);
  let found = null;
  for (const d of (process.env.PATH || '/usr/local/bin:/usr/bin:/bin').split(':')) {
    const p = path.join(d, cmd);
    try { fs.accessSync(p, fs.constants.X_OK); if (fs.statSync(p).isFile()) { found = p; break; } } catch {}
  }
  whichCache.set(cmd, found);
  return found;
}

function detached(cmd, args = []) {
  try {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE; delete env.CHROME_DESKTOP; delete env.GDK_BACKEND;
    const p = spawn(cmd, args, { detached: true, stdio: 'ignore', cwd: HOME, env });
    p.on('error', () => {}); p.unref(); return true;
  } catch { return false; }
}

function readText(p, fb = '') { try { return fs.readFileSync(p, 'utf8'); } catch { return fb; } }
function readJSON(p, fb = null) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p + '.tmp', JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(p + '.tmp', p);
}

/** palOS settings use GNOME's key names without the org.gnome.desktop. / org.palos. prefix */
function prefName(schema, key) { return String(schema).replace(/^org\.gnome\.desktop\.|^org\.palos\./, '') + '.' + key; }
/** a palOS setting (palos-pref get), as a JS value */
async function gget(schema, key) {
  const r = await run('palos-pref', ['get', prefName(schema, key)], { timeout: 4000 });
  if (!r.ok) return null;
  const v = r.out.trim();
  if (v === 'true' || v === 'false') return v === 'true';
  if (/^-?[0-9]+(\.[0-9]+)?$/.test(v)) return Number(v);
  return v;
}
async function gset(schema, key, value) {
  return (await run('palos-pref', ['set', prefName(schema, key), String(value)], { timeout: 4000 })).ok;
}

module.exports = { HOME, CONFIG, run, out, which, detached, readText, readJSON, writeJSON, gget, gset };

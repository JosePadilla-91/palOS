'use strict';
// Appearance (Dark Mode, text size, wallpaper) and Dock.
const fs = require('fs');
const path = require('path');
const { HOME, CONFIG, run, out, which, detached, readJSON, writeJSON, gget, gset } = require('./util');

const IFACE = 'org.gnome.desktop.interface';
const HELPER = '/usr/lib/paladin-session/paladin-session-helper';
const SEEKER_USER = path.join(CONFIG, 'paladin-seeker', 'config.json');
const SEEKER_SYSTEM = '/etc/paladin-seeker/config.json';
const DOCK_USER = path.join(CONFIG, 'paladin-dock', 'config.json');
const DOCK_SYSTEM = '/etc/paladin-dock/config.json';
const DOCK_DEFAULTS = { position: 'bottom', icon_size: 56, magnify: true, magnify_size: 104, autohide: false, minimize_effect: 'magic_lamp' };
const IMG = /\.(jpe?g|png|webp|gif|svg)$/i;

function seekerConfig() { return { wallpaper: null, wallpaperMode: 'fill', wallpaperColor: '#2b4f7e', ...(readJSON(SEEKER_SYSTEM, {}) || {}), ...(readJSON(SEEKER_USER, {}) || {}) }; }
function setSeeker(patch) {
  const user = readJSON(SEEKER_USER, {}) || {};
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && user[k] && typeof user[k] === 'object') user[k] = { ...user[k], ...v };
    else user[k] = v;
  }
  writeJSON(SEEKER_USER, user);            // Seeker watches this file and applies it straight away
}

function wallpapers() {
  const found = [];
  const walk = (dir, depth) => {
    let names = [];
    try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const d of names) {
      const p = path.join(dir, d.name);
      if (d.isDirectory() && depth > 0 && !d.name.startsWith('.')) walk(p, depth - 1);
      else if (d.isFile() && IMG.test(d.name) && !/-dark\.|contest|\.xml$/i.test(d.name)) found.push(p);
      if (found.length > 200) return;
    }
  };
  walk('/usr/share/backgrounds', 2);
  const pics = path.join(HOME, 'Pictures');
  const mine = []; const n = found.length;
  walk(pics, 0);
  mine.push(...found.splice(n));
  return { system: found.sort(), pictures: mine.sort() };
}

async function get() {
  const sc = seekerConfig();
  return {
    dark: (await gget(IFACE, 'color-scheme')) === 'prefer-dark',
    textScale: Number(await gget(IFACE, 'text-scaling-factor')) || 1,
    animations: (await gget(IFACE, 'enable-animations')) !== false,
    wallpaper: sc.wallpaper, wallpaperMode: sc.wallpaperMode, wallpaperColor: sc.wallpaperColor,
    menubar: sc.menubar || {},
  };
}

async function setDark(dark) {
  await gset(IFACE, 'color-scheme', dark ? 'prefer-dark' : 'default');
  // Inside the Paladin session the helper is already watching and switches everything over.
  // Outside it (or if it isn't running), apply the look once here.
  const watching = (await run('pgrep', ['-u', String(process.getuid()), '-f', 'paladin-session-helper xsettings'])).ok;
  if (!watching && fs.existsSync(HELPER)) await run('/usr/bin/python3', [HELPER, 'appearance'], { timeout: 30000 });
  return get();
}

async function setTextScale(f) { await gset(IFACE, 'text-scaling-factor', Math.max(0.8, Math.min(2, Number(f) || 1))); return get(); }
async function setAnimations(on) { await gset(IFACE, 'enable-animations', !!on); return get(); }

function setWallpaper(patch) { setSeeker(patch); return get(); }

// ---------------------------------------------------------------- dock
function dockInstalled() { return !!which('paladin-dock') || fs.existsSync('/usr/lib/paladin-dock/main.py'); }
function dock() { return { installed: dockInstalled(), ...DOCK_DEFAULTS, ...(readJSON(DOCK_SYSTEM, {}) || {}), ...(readJSON(DOCK_USER, {}) || {}) }; }

let restartTimer = null;
async function setDock(patch) {
  const allowed = ['position', 'icon_size', 'magnify', 'magnify_size', 'autohide', 'minimize_effect'];
  const user = readJSON(DOCK_USER, {}) || {};
  for (const k of allowed) if (k in patch) user[k] = patch[k];
  writeJSON(DOCK_USER, user);
  // The dock reads its settings when it starts; restart it once the changes settle.
  clearTimeout(restartTimer);
  restartTimer = setTimeout(restartDock, 600);
  return dock();
}

async function restartDock() {
  const uid = String(process.getuid());
  const running = (await run('pgrep', ['-u', uid, '-f', 'paladin-dock|/usr/lib/paladin-dock/main.py'])).ok;
  if (!running) return;
  await run('pkill', ['-u', uid, '-f', '/usr/lib/paladin-dock/main.py']);
  await new Promise((r) => setTimeout(r, 2500));
  // The dock may have restarted itself; only start it if it didn't.
  if (!(await run('pgrep', ['-u', uid, '-f', '/usr/lib/paladin-dock/main.py'])).ok && which('paladin-dock')) detached('paladin-dock');
}

// ---------------------------------------------------------------- menu bar clock (Seeker)
async function setClock(patch) {
  const m = {};
  if ('clock24h' in patch) { m.clock24h = !!patch.clock24h; await gset(IFACE, 'clock-format', patch.clock24h ? '24h' : '12h'); }
  if ('clockDate' in patch) m.clockDate = !!patch.clockDate;
  if ('clockSeconds' in patch) m.clockSeconds = !!patch.clockSeconds;
  setSeeker({ menubar: m });
  return seekerConfig().menubar || {};
}

module.exports = { get, setDark, setTextScale, setAnimations, setWallpaper, wallpapers, dock, setDock, setClock, seekerConfig };

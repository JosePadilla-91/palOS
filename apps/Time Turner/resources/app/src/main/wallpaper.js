'use strict';
// palOS: the desktop picture behind Time Turner's full-screen view is the one on the user's desktop.
// The palOS desktop (Seeker) keeps it in ~/.config/paladin-seeker/config.json ("wallpaper"), with the
// distribution's default in /etc/paladin-seeker/config.json ("defaultWallpaper"); GNOME's setting is
// used only when neither names a picture. Both files are watched, so a change shows straight away.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { pathToFileURL, fileURLToPath } = require('url');

const SCHEMA = 'org.gnome.desktop.background';
const USER_CONF = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'paladin-seeker', 'config.json');
const SYS_CONF = '/etc/paladin-seeker/config.json';
const FALLBACK = '/usr/share/backgrounds/palos/palOS Pupper.jpg';

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } }

function gsettingsGet(key) {
  return new Promise(resolve => {
    execFile('gsettings', ['get', SCHEMA, key], { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(String(stdout).trim().replace(/^'(.*)'$/, '$1') || null);
    });
  });
}

// Slideshow wallpapers are XML files listing images; use the first one.
function resolveImage(uri) {
  if (!uri) return null;
  let file;
  try { file = uri.startsWith('file://') ? fileURLToPath(uri) : uri; } catch { return null; }
  if (!file.endsWith('.xml')) return fs.existsSync(file) ? pathToFileURL(file).href : null;
  try {
    const xml = fs.readFileSync(file, 'utf8');
    const m = /<file>\s*([^<]+?)\s*<\/file>/.exec(xml) || /<from>\s*([^<]+?)\s*<\/from>/.exec(xml);
    return m && fs.existsSync(m[1]) ? pathToFileURL(m[1]).href : null;
  } catch { return null; }
}

function palosWallpaper() {
  const user = readJson(USER_CONF), sys = readJson(SYS_CONF);
  for (const p of [user.wallpaper, user.defaultWallpaper, sys.wallpaper, sys.defaultWallpaper, FALLBACK]) {
    if (typeof p === 'string' && p && fs.existsSync(p)) return pathToFileURL(p).href;
  }
  return null;
}

async function getWallpaper() {
  const mine = palosWallpaper();
  if (mine) return { light: mine, dark: mine };
  const [light, dark] = await Promise.all([gsettingsGet('picture-uri'), gsettingsGet('picture-uri-dark')]);
  return { light: resolveImage(light), dark: resolveImage(dark) };
}

/** Calls cb(wallpaper) whenever the desktop picture changes. Returns a stop function. */
function watchWallpaper(cb) {
  let timer;
  const changed = () => { clearTimeout(timer); timer = setTimeout(() => getWallpaper().then(cb), 300); };
  const watchers = [];
  // watch the folders (the settings file is replaced, not edited, when it is saved)
  for (const f of [USER_CONF, SYS_CONF]) {
    try {
      fs.mkdirSync(path.dirname(f), { recursive: true });
      watchers.push(fs.watch(path.dirname(f), (ev, name) => { if (!name || name === path.basename(f)) changed(); }));
    } catch { /* not watchable */ }
  }
  let child;
  try {
    child = spawn('gsettings', ['monitor', SCHEMA], { stdio: ['ignore', 'pipe', 'ignore'] });
    child.stdout.on('data', d => { if (/picture-uri/.test(String(d))) changed(); });
    child.on('error', () => {});
  } catch { child = null; }
  return () => { for (const w of watchers) { try { w.close(); } catch {} } if (child) child.kill(); };
}

module.exports = { getWallpaper, watchWallpaper };

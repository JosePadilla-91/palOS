'use strict';
// palOS: the desktop picture behind Time Turner's full-screen view is the one on the user's desktop.
// The palOS desktop (Seeker) keeps it in ~/.config/paladin-seeker/config.json ("wallpaper"), with the
// distribution's default in /etc/paladin-seeker/config.json ("defaultWallpaper"), then palOS's own picture.
// Both files are watched, so a change shows straight away.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const USER_CONF = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'paladin-seeker', 'config.json');
const SYS_CONF = '/etc/paladin-seeker/config.json';
const FALLBACK = '/usr/share/backgrounds/palos/palOS Pupper.jpg';

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } }

function palosWallpaper() {
  const user = readJson(USER_CONF), sys = readJson(SYS_CONF);
  for (const p of [user.wallpaper, user.defaultWallpaper, sys.wallpaper, sys.defaultWallpaper, FALLBACK]) {
    if (typeof p === 'string' && p && fs.existsSync(p)) return pathToFileURL(p).href;
  }
  return null;
}

async function getWallpaper() {
  const mine = palosWallpaper();
  return { light: mine, dark: mine };
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
  return () => { for (const w of watchers) { try { w.close(); } catch {} } };
}

module.exports = { getWallpaper, watchWallpaper };

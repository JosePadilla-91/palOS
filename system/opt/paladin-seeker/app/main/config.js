'use strict';
// Settings: distro defaults in /etc/paladin-seeker/config.json, per-user in ~/.config/paladin-seeker/config.json.
const path = require('path');
const { EventEmitter } = require('events');
const { HOME, readJSON, writeJSON } = require('./util');

const USER_FILE = path.join(process.env.XDG_CONFIG_HOME || path.join(HOME, '.config'), 'paladin-seeker', 'config.json');
const SYSTEM_FILE = '/etc/paladin-seeker/config.json';

const DEFAULTS = {
  // Desktop
  wallpaper: null,                 // absolute path to an image; null = defaultWallpaper
  defaultWallpaper: null,          // the distro's default picture (palOS: palOS Pupper); null = built-in gradient
  wallpaperMode: 'fill',           // fill | fit | stretch | center | tile
  wallpaperColor: '#2b4f7e',       // used behind fit/center and for solid colours
  desktop: {
    iconSize: 64, gridSpacing: 100, labelSize: 12,
    showHardDisks: true, showExternalDisks: true, showDesktopFiles: true,
    positions: {},                 // name -> {x,y} (from top-right)
  },
  hardDiskName: 'palOS HD',
  // Browser windows
  browser: {
    view: 'icon', iconSize: 64, listIconSize: 16, showPathBar: true, showStatusBar: true,
    showHidden: false, showExtensions: false, sidebarWidth: 180, newWindowTarget: 'home', foldersFirst: false,
    windowWidth: 820, windowHeight: 520,
  },
  sidebarFavorites: null,          // null = default set; otherwise list of absolute paths
  // Menu bar
  menubar: {
    clock: true, volume: true, wifi: true, battery: true, batteryPercent: true, tray: true, screens: true, widgets: true, clock24h: false, clockSeconds: false, clockDate: false, clockDay: true,
    // tray icons to leave out while the menu bar shows its own Wi-Fi menu (the stock network icon would be a duplicate)
    hideTrayWhenWifi: ['nm-applet', 'nm-tray', 'network-manager-applet'],
    hideTray: [],                  // any other tray icons (by Id or title) the user doesn't want
  },
  automount: true,
  compositor: 'auto',              // auto | on | off
  iconTheme: null,                 // null = from GTK settings
  // Shield menu commands (first one installed wins)
  systemPreferences: ['paladin-settings', 'paladin-preferences'],
  appStore: [],   // palOS Store comes back once it has its own software source
  softwareUpdate: ['paladin-software-update'],
  aboutLogo: null,                 // path to an image for About This Computer; default = shield
  recentLimit: 10,
};

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) out[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v;
  return out;
}

class Config extends EventEmitter {
  constructor() {
    super();
    this.base = merge(DEFAULTS, readJSON(SYSTEM_FILE, {}));
    this.user = readJSON(USER_FILE, {}) || {};
    if (this.user.hardDiskName === 'Paladin HD') delete this.user.hardDiskName;   // palOS 1.0: the disk's default name changed
    this.data = merge(this.base, this.user);
  }
  get() { return this.data; }
  /** Merge a patch into the user's settings and save. */
  set(patch) {
    this.user = merge(this.user, patch);
    this.data = merge(this.base, this.user);
    try { writeJSON(USER_FILE, this.user); } catch (e) { console.error('config save failed', e.message); }
    this.emit('change', this.data, patch);
  }
  /** Pick up changes another program (Paladin Settings) saved to the user file. */
  watch() {
    const fs = require('fs');
    fs.watchFile(USER_FILE, { interval: 700 }, () => {
      const fresh = readJSON(USER_FILE, {}) || {};
      if (JSON.stringify(fresh) === JSON.stringify(this.user)) return;
      const patch = {};
      for (const k of new Set([...Object.keys(fresh), ...Object.keys(this.user)])) {
        if (JSON.stringify(fresh[k]) !== JSON.stringify(this.user[k])) patch[k] = fresh[k] === undefined ? this.base[k] : fresh[k];
      }
      this.user = fresh;
      this.data = merge(this.base, this.user);
      this.emit('change', this.data, patch);
    });
  }
  /** Replace one key wholesale (e.g. positions map). */
  replace(key, value) {
    this.user[key] = value;
    this.data = merge(this.base, this.user);
    try { writeJSON(USER_FILE, this.user); } catch {}
    this.emit('change', this.data, { [key]: value });
  }
}

module.exports = new Config();
module.exports.USER_FILE = USER_FILE;

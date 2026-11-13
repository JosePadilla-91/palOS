'use strict';
// Freedesktop icon theme lookup (theme inheritance, sized and scalable directories).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { HOME, readText, dataDirs } = require('./util');
const config = require('./config');

const BASES = [path.join(HOME, '.icons'), ...dataDirs().map((d) => path.join(d, 'icons'))];
const PIXMAPS = ['/usr/share/pixmaps', '/usr/local/share/pixmaps'];

function themeDirs(name) { return BASES.map((b) => path.join(b, name)).filter((d) => fs.existsSync(d)); }

function parseIni(text) {
  const out = {}; let sec = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const s = line.match(/^\[(.+)\]$/);
    if (s) { sec = out[s[1]] = out[s[1]] || {}; continue; }
    const i = line.indexOf('=');
    if (sec && i > 0) sec[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function currentThemeName() {
  const cfg = config.get().iconTheme;
  if (cfg && themeDirs(cfg).length) return cfg;
  // The desktop's own setting first (palOS setting interface.icon-theme, what Settings changes)...
  try {
    const v = execFileSync('palos-pref', ['get', 'interface.icon-theme'], { timeout: 1500 }).toString().trim();
    if (v && themeDirs(v).length) return v;
  } catch {}
  // ...then GTK's settings files.
  const confHome = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');
  for (const f of [path.join(confHome, 'gtk-3.0/settings.ini'), '/etc/gtk-3.0/settings.ini']) {
    const v = (parseIni(readText(f)).Settings || {})['gtk-icon-theme-name'];
    if (v && themeDirs(v.replace(/"/g, '')).length) return v.replace(/"/g, '');
  }
  for (const t of ['palOS', 'Adwaita', 'elementary', 'Papirus', 'breeze']) if (themeDirs(t).length) return t;
  return 'hicolor';
}

class Theme {
  constructor(name) {
    this.name = name;
    this.dirs = themeDirs(name);
    const idx = this.dirs.map((d) => path.join(d, 'index.theme')).find((f) => fs.existsSync(f));
    const ini = idx ? parseIni(readText(idx)) : {};
    const main = ini['Icon Theme'] || {};
    this.inherits = (main.Inherits || '').split(',').map((s) => s.trim()).filter(Boolean);
    const subdirs = [...new Set([...(main.Directories || '').split(','), ...(main.ScaledDirectories || '').split(',')].map((s) => s.trim()).filter(Boolean))];
    this.subdirs = subdirs.map((sd) => {
      const c = ini[sd] || {};
      const size = parseInt(c.Size || '48', 10);
      return {
        sd, size, scale: parseInt(c.Scale || '1', 10), type: c.Type || 'Threshold',
        min: parseInt(c.MinSize || c.Size || '48', 10), max: parseInt(c.MaxSize || c.Size || '48', 10),
        threshold: parseInt(c.Threshold || '2', 10),
      };
    });
    this.index = null;
  }
  build() {
    this.index = new Map();
    for (const base of this.dirs) {
      for (const d of this.subdirs) {
        let files; try { files = fs.readdirSync(path.join(base, d.sd)); } catch { continue; }
        for (const f of files) {
          const m = f.match(/^(.*)\.(png|svg|xpm)$/);
          if (!m) continue;
          const list = this.index.get(m[1]) || [];
          list.push({ path: path.join(base, d.sd, f), d, svg: m[2] === 'svg' });
          this.index.set(m[1], list);
        }
      }
    }
  }
  find(name, size) {
    if (!this.index) this.build();
    const list = this.index.get(name);
    if (!list) return null;
    const dist = (d) => {
      if (d.type === 'Fixed') return Math.abs(d.size * d.scale - size);
      if (d.type === 'Scalable') return size < d.min ? d.min - size : size > d.max ? size - d.max : 0;
      return size < d.size - d.threshold ? d.min - size : size > d.size + d.threshold ? size - d.max : 0;
    };
    let best = null, bestScore = Infinity;
    for (const e of list) {
      // Prefer exact/scalable matches, then larger-than-needed over smaller (downscaling looks better).
      let s = dist(e.d);
      if (e.d.size * e.d.scale < size) s *= 2;
      if (e.svg) s -= 0.5;
      if (e.d.scale > 1) s += 0.25;
      if (s < bestScore) { bestScore = s; best = e; }
    }
    return best ? best.path : null;
  }
}

const themes = new Map();
function theme(name) {
  if (!themes.has(name)) themes.set(name, new Theme(name));
  return themes.get(name);
}

let chain = null;
function themeChain() {
  if (chain) return chain;
  const seen = new Set(); const out = [];
  const add = (n) => {
    if (seen.has(n) || !themeDirs(n).length) return;
    seen.add(n); const t = theme(n); out.push(t); t.inherits.forEach(add);
  };
  add(currentThemeName());
  ['Adwaita', 'hicolor'].forEach(add);
  chain = out;
  return chain;
}

const cache = new Map();
/** Find an icon file for one of the given names. */
function lookup(names, size = 48) {
  if (!Array.isArray(names)) names = [names];
  const key = names.join('|') + '@' + size;
  if (cache.has(key)) return cache.get(key);
  let found = null;
  outer: for (const n of names) {
    if (!n) continue;
    if (path.isAbsolute(n)) { if (fs.existsSync(n)) { found = n; break; } continue; }
    const stripped = n.replace(/\.(png|svg|xpm)$/, '');
    for (const t of themeChain()) { const p = t.find(stripped, size); if (p) { found = p; break outer; } }
    for (const d of PIXMAPS) for (const ext of ['.png', '.svg', '.xpm', '']) {
      const p = path.join(d, stripped + ext);
      if (ext !== '' || /\.(png|svg|xpm)$/.test(n)) { if (fs.existsSync(p) && fs.statSync(p).isFile()) { found = p; break outer; } }
    }
  }
  if (!found) {
    // Spec fallback: drop trailing "-part" segments of the first name.
    const first = names.find((n) => n && !path.isAbsolute(n));
    if (first && first.includes('-')) {
      found = lookup([first.slice(0, first.lastIndexOf('-'))], size);
    }
  }
  cache.set(key, found);
  return found;
}

function reset() { chain = null; cache.clear(); themes.clear(); }

module.exports = { lookup, reset, currentThemeName };

'use strict';
// Installed applications (.desktop files): lookup, matching windows to apps, launching, default apps.
const fs = require('fs');
const path = require('path');
const { HOME, readText, dataDirs, detached, which, debounce } = require('./util');
const mime = require('./mime');

const LANGS = (() => {
  const l = (process.env.LC_MESSAGES || process.env.LANG || 'C').split('.')[0];
  const out = []; if (l && l !== 'C' && l !== 'POSIX') { out.push(l); if (l.includes('_')) out.push(l.split('_')[0]); }
  return out;
})();

function unescapeValue(v) { return v.replace(/\\([sntr\\;])/g, (_, c) => ({ s: ' ', n: '\n', t: '\t', r: '\r', '\\': '\\', ';': ';' }[c])); }

function parseDesktop(file) {
  const text = readText(file);
  const e = {}; const loc = {}; let inEntry = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('[')) { inEntry = line.trim() === '[Desktop Entry]'; continue; }
    if (!inEntry || line.startsWith('#')) continue;
    const i = line.indexOf('='); if (i < 0) continue;
    const key = line.slice(0, i).trim(); const val = line.slice(i + 1).trim();
    const m = key.match(/^([A-Za-z0-9-]+)\[([^\]]+)\]$/);
    if (m) { (loc[m[1]] = loc[m[1]] || {})[m[2]] = val; } else if (!(key in e)) e[key] = val;
  }
  for (const k of ['Name', 'GenericName', 'Comment', 'Keywords']) {
    for (const l of LANGS) if (loc[k] && loc[k][l]) { e[k] = loc[k][l]; break; }
  }
  for (const k of Object.keys(e)) if (k !== 'Exec') e[k] = unescapeValue(e[k]);
  return e;
}

/** Split an Exec line into argv per the desktop entry spec. */
function splitExec(exec) {
  const out = []; let cur = ''; let q = false; let has = false;
  const s = exec.replace(/\\\\/g, '\\');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '\\' && i + 1 < s.length && '"`$\\'.includes(s[i + 1])) { cur += s[++i]; continue; }
      if (c === '"') { q = false; continue; }
      cur += c; continue;
    }
    if (c === '"') { q = true; has = true; continue; }
    if (c === ' ' || c === '\t') { if (cur || has) { out.push(cur); cur = ''; has = false; } continue; }
    cur += c;
  }
  if (cur || has) out.push(cur);
  return out;
}

class Apps {
  constructor() { this.byId = new Map(); this.loaded = false; this.watchers = []; this.listeners = []; }

  dirs() { return dataDirs().map((d) => path.join(d, 'applications')); }

  load() {
    this.byId = new Map();
    const desk = (process.env.XDG_CURRENT_DESKTOP || '').split(':').filter(Boolean);
    for (const base of this.dirs()) {
      const walk = (dir, prefix) => {
        let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const ent of ents) {
          const p = path.join(dir, ent.name);
          if (ent.isDirectory()) { walk(p, prefix + ent.name + '-'); continue; }
          if (!ent.name.endsWith('.desktop')) continue;
          const id = prefix + ent.name.slice(0, -8);
          if (this.byId.has(id)) continue;           // earlier dirs win
          const e = parseDesktop(p);
          if (e.Type && e.Type !== 'Application') { this.byId.set(id, null); continue; }
          if (e.Hidden === 'true') { this.byId.set(id, null); continue; }
          if (e.TryExec && !which(e.TryExec)) { this.byId.set(id, null); continue; }
          const only = (e.OnlyShowIn || '').split(';').filter(Boolean);
          const not = (e.NotShowIn || '').split(';').filter(Boolean);
          const shown = e.NoDisplay !== 'true' && (!only.length || only.some((d) => desk.includes(d))) && !not.some((d) => desk.includes(d));
          const execArgs = splitExec(e.Exec || '');
          let bin = execArgs[0] || '';
          if (bin === 'env') { let i = 1; while (execArgs[i] && execArgs[i].includes('=')) i++; bin = execArgs[i] || ''; }
          this.byId.set(id, {
            id, file: p, name: e.Name || id, generic: e.GenericName || '', comment: e.Comment || '',
            icon: e.Icon || '', exec: e.Exec || '', terminal: e.Terminal === 'true', shown, cwd: e.Path || null,
            wmClass: (e.StartupWMClass || '').toLowerCase(), bin: path.basename(bin).toLowerCase(),
            mimeTypes: (e.MimeType || '').split(';').filter(Boolean), categories: (e.Categories || '').split(';').filter(Boolean),
            keywords: e.Keywords || '', folder: e['X-Palos-Folder'] || '', appPath: e['X-Palos-App'] || '', flatpak: /flatpak run/.test(e.Exec || '') ? (e['X-Flatpak'] || null) : null,
          });
        }
      };
      walk(base, '');
    }
    for (const [k, v] of [...this.byId]) if (!v) this.byId.delete(k);
    this.loaded = true;
    this._buildMatchIndex();
  }

  _buildMatchIndex() {
    this.byWm = new Map(); this.byLowerId = new Map(); this.byBin = new Map(); this.byName = new Map();
    for (const a of this.byId.values()) {
      if (a.wmClass) this.byWm.set(a.wmClass, a);
      const lid = a.id.toLowerCase();
      this.byLowerId.set(lid, a);
      const last = lid.split('.').pop();
      if (!this.byLowerId.has(last)) this.byLowerId.set(last, a);
      if (a.bin && (!this.byBin.has(a.bin) || a.shown)) this.byBin.set(a.bin, a);
      this.byName.set(a.name.toLowerCase(), a);
    }
  }

  watch(onChange) {
    this.listeners.push(onChange);
    if (this.watchers.length) return;
    const reload = debounce(() => { this.load(); this.listeners.forEach((f) => f()); }, 800);
    const waiting = [];
    for (const d of this.dirs()) {
      if (fs.existsSync(d)) { try { this.watchers.push(fs.watch(d, reload)); } catch {} } else waiting.push(d);
    }
    // folders that appear later (snapd's, once someone installs their first snap): look now and then
    if (waiting.length) {
      const t = setInterval(() => {
        for (const d of waiting.slice()) {
          if (!fs.existsSync(d)) continue;
          try { this.watchers.push(fs.watch(d, reload)); } catch { continue; }
          waiting.splice(waiting.indexOf(d), 1);
          reload();
        }
        if (!waiting.length) clearInterval(t);
      }, 15000);
      if (t.unref) t.unref();
    }
  }

  ensure() { if (!this.loaded) this.load(); }
  get(id) { this.ensure(); return this.byId.get(String(id || '').replace(/\.desktop$/, '')) || null; }
  all() { this.ensure(); return [...this.byId.values()].filter((a) => a.shown).sort((a, b) => a.name.localeCompare(b.name)); }

  /** Which installed app owns this window? */
  forWindow(info) {
    this.ensure();
    if (!info) return null;
    const keys = [info.gtk && info.gtk.appId, info.cls, info.instance].filter(Boolean).map((s) => s.toLowerCase());
    if (info.gtk && info.gtk.appId) { const a = this.get(info.gtk.appId); if (a) return a; }
    for (const k of keys) if (this.byWm.has(k)) return this.byWm.get(k);
    for (const k of keys) if (this.byLowerId.has(k)) return this.byLowerId.get(k);
    for (const k of keys) if (this.byBin.has(k)) return this.byBin.get(k);
    if (info.pid) {
      try {
        const cmd = fs.readFileSync(`/proc/${info.pid}/cmdline`, 'utf8').split('\0');
        const INTERP = /^(python[\d.]*|perl|ruby|node|nodejs|sh|bash|dash|java|mono|gjs|lua[\d.]*|php[\d.]*|wish|tclsh)$/;
        const b = path.basename(cmd[0] || '').toLowerCase();
        if (!INTERP.test(b) && this.byBin.has(b)) return this.byBin.get(b);
        const exe = path.basename(fs.readlinkSync(`/proc/${info.pid}/exe`)).toLowerCase();
        if (!INTERP.test(exe) && this.byBin.has(exe)) return this.byBin.get(exe);
        // Interpreted apps: python3 /usr/bin/foo
        for (const arg of cmd.slice(1, 3)) { const ab = path.basename(arg || '').toLowerCase(); if (this.byBin.has(ab)) return this.byBin.get(ab); }
      } catch {}
    }
    for (const k of keys) if (this.byName.has(k)) return this.byName.get(k);
    return null;
  }

  /** Build argv for launching with optional files. */
  argv(app, files = []) {
    const args = splitExec(app.exec);
    const out = [];
    const toUri = (f) => (/^[a-z][a-z0-9+.-]*:/i.test(f) ? f : 'file://' + encodeURI(f).replace(/#/g, '%23').replace(/\?/g, '%3F'));
    let used = false;
    for (const a of args) {
      if (a === '%f' || a === '%u') { if (files[0]) out.push(a === '%u' ? toUri(files[0]) : files[0]); used = true; continue; }
      if (a === '%F' || a === '%U') { out.push(...files.map((f) => (a === '%U' ? toUri(f) : f))); used = true; continue; }
      if (a === '%i') { if (app.icon) out.push('--icon', app.icon); continue; }
      if (/^%[dDnNvm]$/.test(a)) continue;
      out.push(a.replace(/%c/g, app.name).replace(/%k/g, app.file).replace(/%%/g, '%').replace(/%[fFuUdDnNvmik]/g, ''));
    }
    // %f with several files: caller launches once per file
    return { argv: out.filter((x) => x !== ''), used, single: args.includes('%f') || args.includes('%u') };
  }

  byAppPath(p) { if (!this.loaded) this.load(); for (const a of this.byId.values()) if (a.appPath === p) return a; return null; }

  launch(appOrId, files = []) {
    const app = typeof appOrId === 'string' ? this.get(appOrId) : appOrId;
    if (!app) return false;
    const { argv, single } = this.argv(app, files);
    if (single && files.length > 1) { files.forEach((f) => this.launch(app, [f])); return true; }
    if (!argv.length) return false;
    let cmd = argv[0], args = argv.slice(1);
    if (app.terminal) { const term = which('x-terminal-emulator') || which('xterm'); if (term) { args = ['-e', cmd, ...args]; cmd = term; } }
    const env = { BAMF_DESKTOP_FILE_HINT: app.file, GIO_LAUNCHED_DESKTOP_FILE: app.file };
    this.emitLaunch && this.emitLaunch(app);
    return detached(cmd, args, { cwd: app.cwd || HOME, env });
  }

  // ---- MIME associations ----
  mimeappsFiles() {
    const conf = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');
    const confDirs = (process.env.XDG_CONFIG_DIRS || '/etc/xdg').split(':');
    const desk = (process.env.XDG_CURRENT_DESKTOP || '').toLowerCase().split(':').filter(Boolean);
    const list = [];
    for (const d of [conf, ...confDirs]) { desk.forEach((x) => list.push(path.join(d, `${x}-mimeapps.list`))); list.push(path.join(d, 'mimeapps.list')); }
    for (const d of this.dirs()) { desk.forEach((x) => list.push(path.join(d, `${x}-mimeapps.list`))); list.push(path.join(d, 'mimeapps.list')); list.push(path.join(d, 'defaults.list')); }
    return list;
  }

  defaultFor(type) {
    this.ensure();
    const types = [type, ...mime.parentsOf(type)];
    for (const t of types) {
      for (const f of this.mimeappsFiles()) {
        const txt = readText(f); if (!txt) continue;
        const sec = txt.split(/^\[/m).find((s) => s.startsWith('Default Applications]'));
        if (!sec) continue;
        const line = sec.split('\n').find((l) => l.startsWith(t + '='));
        if (!line) continue;
        for (const id of line.slice(t.length + 1).split(';').filter(Boolean)) { const a = this.get(id); if (a) return a; }
      }
      const cands = this.forMime(t, false);
      if (cands.length) return cands[0];
    }
    return null;
  }

  forMime(type, withParents = true) {
    this.ensure();
    const types = withParents ? [type, ...mime.parentsOf(type)] : [type];
    const out = [];
    for (const a of this.byId.values()) if (a.mimeTypes.some((m) => types.includes(m))) out.push(a);
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  setDefault(type, appId) {
    const conf = path.join(process.env.XDG_CONFIG_HOME || path.join(HOME, '.config'), 'mimeapps.list');
    let txt = readText(conf);
    const line = `${type}=${appId}.desktop;`;
    if (!/^\[Default Applications\]/m.test(txt)) txt = txt.trimEnd() + (txt ? '\n\n' : '') + '[Default Applications]\n';
    const re = new RegExp(`^${type.replace(/[.+]/g, '\\$&')}=.*$`, 'm');
    const lines = txt.split('\n');
    const secStart = lines.findIndex((l) => l.trim() === '[Default Applications]');
    let secEnd = lines.findIndex((l, i) => i > secStart && l.startsWith('['));
    if (secEnd < 0) secEnd = lines.length;
    const idx = lines.findIndex((l, i) => i > secStart && i < secEnd && re.test(l));
    if (idx >= 0) lines[idx] = line; else lines.splice(secStart + 1, 0, line);
    fs.mkdirSync(path.dirname(conf), { recursive: true });
    fs.writeFileSync(conf, lines.join('\n'));
  }
}

module.exports = new Apps();
module.exports.parseDesktop = parseDesktop;

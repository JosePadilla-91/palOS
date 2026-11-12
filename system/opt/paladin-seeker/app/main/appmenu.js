'use strict';
// Global menus of other apps.
//  * com.canonical.AppMenu.Registrar  – Seeker owns it; Qt, Chromium/Electron, LibreOffice ... register dbusmenu here.
//  * com.canonical.dbusmenu           – client for those menus (also used for tray icon menus).
//  * org.gtk.Menus / org.gtk.Actions  – GTK menus (appmenu-gtk-module and GtkApplication), found via X11 properties.
const { EventEmitter } = require('events');
const D = require('./dbus');
const { Variant } = D;

const REG_PATH = '/com/canonical/AppMenu/Registrar';
const REG_IFACE = 'com.canonical.AppMenu.Registrar';

function cleanLabel(s) {
  // Mnemonics: "_File" -> "File", "__" -> "_"
  return String(s || '').replace(/__/g, '\u0000').replace(/_/g, '').replace(/\u0000/g, '_');
}

function parseGtkAccel(a) {
  if (!a) return null;
  const mods = []; let rest = a;
  const re = /^<([^>]+)>/; let m;
  while ((m = rest.match(re))) {
    const k = m[1].toLowerCase();
    if (k === 'primary' || k === 'control' || k === 'ctrl' || k === 'ctl') mods.push('ctrl');
    else if (k === 'shift') mods.push('shift');
    else if (k === 'alt' || k === 'mod1') mods.push('alt');
    else if (k === 'super' || k === 'meta' || k === 'mod4') mods.push('super');
    rest = rest.slice(m[0].length);
  }
  return rest ? { mods, key: rest } : null;
}
function parseDbusShortcut(s) {
  if (!Array.isArray(s) || !s.length || !Array.isArray(s[0])) return null;
  const keys = s[0]; const mods = [];
  for (const k of keys.slice(0, -1)) {
    const l = k.toLowerCase();
    if (l === 'control') mods.push('ctrl'); else if (l === 'shift') mods.push('shift'); else if (l === 'alt') mods.push('alt'); else if (l === 'super') mods.push('super');
  }
  return { mods, key: keys[keys.length - 1] };
}

// ------------------------------------------------------------------ dbusmenu client
// a GTK menu item, unwrapped, keeping its "target" as the original typed value (needed to activate it)
function keepTarget(raw) {
  const u = D.unwrap(raw);
  if (raw && raw.target instanceof Variant) u[':rawTarget'] = raw.target;
  return u;
}

class DbusMenu extends EventEmitter {
  constructor(service, path) {
    super();
    this.service = service; this.path = path; this.root = null; this.kind = 'dbusmenu';
    this._sig = (m) => {
      if (m.sender !== this.service && m.sender !== this.owner) return;
      if (m.path !== this.path || m.interface !== 'com.canonical.dbusmenu') return;
      if (m.member === 'LayoutUpdated' || m.member === 'ItemsPropertiesUpdated') this._reload();
    };
    this._reloadTimer = null;
    D.onSignal(this._sig);
    D.addMatch(`type='signal',interface='com.canonical.dbusmenu',path='${path}'`);
  }
  _reload() {
    clearTimeout(this._reloadTimer);
    this._reloadTimer = setTimeout(async () => {
      if (this.disposed) return;
      try {
        await this.load();
        // Chromium/Qt only fill a submenu while it is shown: a fresh root layout has it empty again,
        // so re-read the menus that are open right now instead of blanking them.
        for (const id of this.openIds || []) { try { await this.load(id); } catch {} }
        this.emit('changed');
      } catch {}
    }, 60);
  }
  convert(node) {
    const [id, rawProps, kids] = node;
    const p = D.unwrap(rawProps);
    const children = (kids || []).map((k) => this.convert(D.unwrap(k)));
    const visible = p.visible !== false;
    const item = {
      id: `d:${id}`, label: cleanLabel(p.label), enabled: p.enabled !== false, visible,
      type: p.type === 'separator' ? 'separator' : 'item',
      toggle: p['toggle-type'] === 'checkmark' ? 'check' : p['toggle-type'] === 'radio' ? 'radio' : null,
      checked: p['toggle-state'] === 1, accel: parseDbusShortcut(p.shortcut),
      iconName: p['icon-name'] || null,
      submenu: p['children-display'] === 'submenu' || children.length > 0,
      children: children.filter((c) => c.visible),
    };
    return item;
  }
  async load(parent = 0) {
    const [, layout] = await D.call(this.service, this.path, 'com.canonical.dbusmenu', 'GetLayout', 'iias', [parent, -1, []]);
    const tree = this.convert(layout);
    if (parent === 0) this.root = tree;
    else this._replace(this.root, `d:${parent}`, tree);
    return this.root;
  }
  _replace(node, id, tree) {
    if (!node) return false;
    for (let i = 0; i < node.children.length; i++) {
      if (node.children[i].id === id) { node.children[i] = tree; return true; }
      if (this._replace(node.children[i], id, tree)) return true;
    }
    return false;
  }
  async opening(itemId) {
    const id = parseInt(String(itemId).slice(2), 10);
    if (isNaN(id)) return this.root;
    try { D.send(this.service, this.path, 'com.canonical.dbusmenu', 'Event', 'isvu', [id, 'opened', new Variant('i', 0), 0]); } catch {}
    try { await D.call(this.service, this.path, 'com.canonical.dbusmenu', 'AboutToShow', 'i', [id], 1500); } catch {}
    try { await this.load(id); } catch {}
    (this.openIds || (this.openIds = new Set())).add(id);
    return this.root;
  }
  closed(itemId) {
    const id = parseInt(String(itemId).slice(2), 10);
    if (this.openIds) this.openIds.clear();   // closing a top menu closes everything under it
    if (!isNaN(id)) try { D.send(this.service, this.path, 'com.canonical.dbusmenu', 'Event', 'isvu', [id, 'closed', new Variant('i', 0), 0]); } catch {}
  }
  activate(itemId) {
    const id = parseInt(String(itemId).slice(2), 10);
    return D.call(this.service, this.path, 'com.canonical.dbusmenu', 'Event', 'isvu', [id, 'clicked', new Variant('i', 0), Math.floor(Date.now() / 1000) & 0x7fffffff]).catch(() => {});
  }
  dispose() { this.disposed = true; this.removeAllListeners(); }
}

// ------------------------------------------------------------------ GTK (org.gtk.Menus) client
class GtkMenu extends EventEmitter {
  constructor(info) {
    super();
    this.kind = 'gtk';
    this.service = info.gtk.bus;
    this.menubarPath = info.gtk.menubar;
    this.appmenuPath = info.gtk.appmenu;
    this.actionPaths = {};
    if (info.gtk.app) this.actionPaths.app = info.gtk.app;
    if (info.gtk.win) this.actionPaths.win = info.gtk.win;
    if (info.gtk.unity) this.actionPaths.unity = info.gtk.unity;
    this.menus = new Map();        // `${path}|${group}.${menu}` -> items[]
    this.groups = new Map();       // path -> Set(groups subscribed)
    this.actions = new Map();      // `${prefix}.${name}` -> { enabled, state }
    this.itemMap = new Map();
    this.root = null;
    this._sig = (m) => {
      if (m.sender !== this.service) return;
      if (m.interface === 'org.gtk.Menus' && m.member === 'Changed') this._menusChanged(m.path, D.unwrap(m.body[0]));
      else if (m.interface === 'org.gtk.Actions' && m.member === 'Changed') this._actionsChanged(m.path, m.body);
    };
    D.onSignal(this._sig);
    D.addMatch(`type='signal',sender='${this.service}',interface='org.gtk.Menus'`);
    D.addMatch(`type='signal',sender='${this.service}',interface='org.gtk.Actions'`);
  }
  async _start(path, groups) {
    const have = this.groups.get(path) || new Set();
    const need = groups.filter((g) => !have.has(g));
    if (!need.length) return;
    need.forEach((g) => have.add(g)); this.groups.set(path, have);
    const [list] = await D.call(this.service, path, 'org.gtk.Menus', 'Start', 'au', [need]);
    const more = new Set();
    for (const [g, m, items] of list) {
      const its = items.map(keepTarget);
      this.menus.set(`${path}|${g}.${m}`, its);
      for (const it of its) for (const k of [':section', ':submenu']) if (it[k]) more.add(it[k][0]);
    }
    if (more.size) await this._start(path, [...more]);
  }
  async _describe() {
    for (const [prefix, p] of Object.entries(this.actionPaths)) {
      try {
        const [all] = await D.call(this.service, p, 'org.gtk.Actions', 'DescribeAll');
        for (const [name, desc] of Object.entries(all)) {
          const [enabled, , state] = desc;
          this.actions.set(`${prefix}.${name}`, { enabled, state: state && state.length ? D.unwrap(state[0]) : undefined });
        }
      } catch {}
    }
  }
  async load() {
    if (this.menubarPath) await this._start(this.menubarPath, [0]).catch(() => {});
    if (this.appmenuPath) await this._start(this.appmenuPath, [0]).catch(() => {});
    if (!this.actions.size) await this._describe();
    this.root = this._build();
    return this.root;
  }
  _menusChanged(path, changes) {
    for (const [g, m, pos, removed, added] of changes) {
      const key = `${path}|${g}.${m}`;
      const items = this.menus.get(key) || [];
      items.splice(pos, removed, ...added.map(keepTarget));
      this.menus.set(key, items);
    }
    clearTimeout(this._t);
    this._t = setTimeout(async () => {
      const groups = new Set();
      for (const [key, its] of this.menus) if (key.startsWith(path + '|')) for (const it of its) for (const k of [':section', ':submenu']) if (it[k]) groups.add(it[k][0]);
      await this._start(path, [...groups]).catch(() => {});
      this.root = this._build(); this.emit('changed');
    }, 50);
  }
  _actionsChanged(path, body) {
    const prefix = Object.keys(this.actionPaths).find((k) => this.actionPaths[k] === path);
    if (!prefix) return;
    const [removals, enables, states, adds] = body.map((b) => D.unwrap(b));
    for (const r of removals || []) this.actions.delete(`${prefix}.${r}`);
    for (const [n, e] of Object.entries(enables || {})) { const a = this.actions.get(`${prefix}.${n}`) || {}; a.enabled = e; this.actions.set(`${prefix}.${n}`, a); }
    for (const [n, s] of Object.entries(states || {})) { const a = this.actions.get(`${prefix}.${n}`) || {}; a.state = s; this.actions.set(`${prefix}.${n}`, a); }
    for (const [n, d] of Object.entries(adds || {})) this.actions.set(`${prefix}.${n}`, { enabled: d[0], state: d[2] && d[2].length ? d[2][0] : undefined });
    clearTimeout(this._ta);
    this._ta = setTimeout(() => { this.root = this._build(); this.emit('changed'); }, 50);
  }
  _items(path, g, m, depth = 0) {
    const its = this.menus.get(`${path}|${g}.${m}`) || [];
    const out = [];
    let first = true;
    its.forEach((it, idx) => {
      if (it[':section']) {
        const sec = this._items(path, it[':section'][0], it[':section'][1], depth);
        if (!sec.length) return;
        if (!first && depth > 0) out.push({ id: `g:sep:${path}:${g}.${m}.${idx}`, type: 'separator', visible: true, children: [] });
        out.push(...sec);
        if (depth > 0 && idx < its.length - 1) out.push({ id: `g:sep2:${path}:${g}.${m}.${idx}`, type: 'separator', visible: true, children: [] });
        first = false; return;
      }
      const id = `g:${path}:${g}.${m}.${idx}`;
      const label = cleanLabel(it.label);
      if (it[':submenu']) {
        out.push({ id, label, enabled: true, visible: true, type: 'item', submenu: true, children: this._items(path, it[':submenu'][0], it[':submenu'][1], depth + 1) });
      } else {
        const action = it.action || '';
        const a = this.actions.get(action);
        let toggle = null, checked = false;
        if (a && a.state !== undefined) {
          if (typeof a.state === 'boolean') { toggle = 'check'; checked = a.state; }
          else if (it.target !== undefined) { toggle = 'radio'; checked = a.state === it.target; }
        }
        if (it['hidden-when'] === 'action-missing' && !a) return;
        this.itemMap.set(id, { action, target: it.target, rawTarget: it[':rawTarget'] });
        out.push({ id, label, enabled: a ? a.enabled !== false : !!action, visible: true, type: 'item', toggle, checked, accel: parseGtkAccel(it.accel), children: [] });
      }
      first = false;
    });
    // tidy separators
    const clean = [];
    for (const i of out) { if (i.type === 'separator' && (!clean.length || clean[clean.length - 1].type === 'separator')) continue; clean.push(i); }
    while (clean.length && clean[clean.length - 1].type === 'separator') clean.pop();
    return clean;
  }
  _build() {
    this.itemMap = new Map();
    const children = this.menubarPath ? this._items(this.menubarPath, 0, 0) : [];
    const root = { id: 'g:root', children };
    if (this.appmenuPath) root.appMenu = this._items(this.appmenuPath, 0, 0, 1);
    return root;
  }
  async opening() { return this.root; }
  closed() {}
  activate(itemId) {
    const it = this.itemMap.get(itemId);
    if (!it || !it.action) return;
    const dot = it.action.indexOf('.');
    const prefix = it.action.slice(0, dot); const name = it.action.slice(dot + 1);
    const path = this.actionPaths[prefix] || this.actionPaths.unity || this.menubarPath;
    // the item's own parameter, with its own type: some are tuples, like Terminal's New Tab ('tab', 'current')
    const param = it.rawTarget ? [it.rawTarget] : it.target !== undefined ? [new Variant(typeof it.target === 'string' ? 's' : typeof it.target === 'boolean' ? 'b' : 'i', it.target)] : [];
    return D.call(this.service, path, 'org.gtk.Actions', 'Activate', 'sava{sv}', [name, param, {}]).catch((e) => console.error('[gtk menu] activate', e.message));
  }
  dispose() {
    this.disposed = true;
    for (const [path, groups] of this.groups) D.send(this.service, path, 'org.gtk.Menus', 'End', 'au', [[...groups]]);
    this.removeAllListeners();
  }
}

// ------------------------------------------------------------------ Registrar
class AppMenus extends EventEmitter {
  constructor() { super(); this.windows = new Map(); this.ok = false; }

  async start() {
    D.serve(REG_PATH, REG_IFACE, {
      methods: {
        RegisterWindow: { in: 'uo', fn: ([win, path], msg) => { this.windows.set(win, { service: msg.sender, path }); this.emit('registered', win); D.emitSignal(REG_PATH, REG_IFACE, 'WindowRegistered', 'uso', [win, msg.sender, path]); return []; } },
        UnregisterWindow: { in: 'u', fn: ([win]) => { this.windows.delete(win); D.emitSignal(REG_PATH, REG_IFACE, 'WindowUnregistered', 'u', [win]); return []; } },
        GetMenuForWindow: { in: 'u', out: 'so', fn: ([win]) => { const w = this.windows.get(win); if (!w) throw new Error('No menu for window'); return [w.service, w.path]; } },
        GetMenus: { out: 'a(uso)', fn: () => [[...this.windows].map(([w, v]) => [w, v.service, v.path])] },
      },
      signals: { WindowRegistered: 'uso', WindowUnregistered: 'u' },
    });
    D.onNameOwnerChanged((name, oldOwner, newOwner) => {
      if (!newOwner && name.startsWith(':')) for (const [w, v] of [...this.windows]) if (v.service === name) this.windows.delete(w);
    });
    try { this.ok = await D.requestName(REG_IFACE); } catch (e) { this.ok = false; console.error('[appmenu] registrar', e.message); }
    return this.ok;
  }

  /** Create a menu source for the window, or null. */
  async sourceFor(info, parentInfo) {
    if (!info) return null;
    const tryOne = async (i) => {
      if (!i) return null;
      if (i.gtk && i.gtk.bus && (i.gtk.menubar || i.gtk.appmenu)) {
        const g = new GtkMenu(i);
        try { await g.load(); if ((g.root.children || []).length || (g.root.appMenu || []).length) return g; } catch {}
        g.dispose();
      }
      const reg = this.windows.get(i.id);
      const svc = reg ? reg.service : i.kde && i.kde.service; const p = reg ? reg.path : i.kde && i.kde.path;
      if (svc && p) {
        const m = new DbusMenu(svc, p);
        try { await m.load(); if (m.root && m.root.children.length) return m; } catch {}
        m.dispose();
      }
      return null;
    };
    return (await tryOne(info)) || (await tryOne(parentInfo));
  }
}

module.exports = new AppMenus();
module.exports.DbusMenu = DbusMenu;
module.exports.cleanLabel = cleanLabel;

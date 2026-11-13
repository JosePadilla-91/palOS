'use strict';
// X11 window tracking via the standard EWMH properties (works with Openbox, Compiz, Xfwm4 ...).
// Uses xprop (x11-utils) and palos-x.
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { sh, which } = require('./util');

const INFO_PROPS = [
  'WM_CLASS', '_NET_WM_PID', '_NET_WM_NAME', 'WM_NAME', '_NET_WM_WINDOW_TYPE', '_NET_WM_STATE', 'WM_TRANSIENT_FOR',
  '_GTK_UNIQUE_BUS_NAME', '_GTK_MENUBAR_OBJECT_PATH', '_GTK_APPLICATION_OBJECT_PATH', '_GTK_WINDOW_OBJECT_PATH',
  '_UNITY_OBJECT_PATH', '_GTK_APPLICATION_ID', '_GTK_APP_MENU_OBJECT_PATH',
  '_KDE_NET_WM_APPMENU_SERVICE_NAME', '_KDE_NET_WM_APPMENU_OBJECT_PATH', '_NET_WM_DESKTOP',
];

function parseStrings(v) {
  const out = []; const re = /"((?:[^"\\]|\\.)*)"/g; let m;
  while ((m = re.exec(v))) out.push(m[1].replace(/\\(.)/g, '$1'));
  return out;
}

function parseXprop(text) {
  const props = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)\(([A-Za-z0-9_]+)\)\s*[=:]\s*(.*)$/);
    if (!m) continue;
    const [, name, type, raw] = m;
    if (type === 'STRING' || type === 'UTF8_STRING' || type === 'COMPOUND_TEXT') props[name] = parseStrings(raw);
    else if (type === 'WINDOW') props[name] = (raw.match(/0x[0-9a-f]+/gi) || []).map((h) => parseInt(h, 16));
    else if (type === 'ATOM') props[name] = raw.split(',').map((s) => s.trim()).filter(Boolean);
    else props[name] = raw.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (isNaN(+s) ? s : +s));
  }
  return props;
}

const hex = (id) => '0x' + Number(id).toString(16);

class X11 extends EventEmitter {
  constructor() {
    super();
    this.active = 0;
    this.viewport = [0, 0];   // _NET_DESKTOP_VIEWPORT: where the visible screen sits inside all the screens, in pixels
    this.geometry = null;     // _NET_DESKTOP_GEOMETRY: size of all the screens together, in pixels
    this.clients = [];
    this.cache = new Map();   // id -> info
    this.available = !!(which('xprop') && process.env.DISPLAY);
  }

  start() {
    if (!this.available) return;
    const spawnSpy = () => {
      const p = spawn('xprop', ['-root', '-spy', '_NET_ACTIVE_WINDOW', '_NET_CLIENT_LIST', '_NET_DESKTOP_VIEWPORT', '_NET_DESKTOP_GEOMETRY'], { stdio: ['ignore', 'pipe', 'ignore'] });
      let buf = '';
      p.stdout.on('data', (d) => {
        buf += d; let i;
        while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); this._onLine(line); }
      });
      p.on('exit', () => setTimeout(spawnSpy, 1500));
      p.on('error', () => {});
      this.spy = p;
    };
    spawnSpy();
  }

  _onLine(line) {
    const props = parseXprop(line);
    if (props._NET_ACTIVE_WINDOW) {
      const id = props._NET_ACTIVE_WINDOW[0] || 0;
      if (id !== this.active) { this.active = id; this.emit('active', id); }
    }
    if (props._NET_DESKTOP_VIEWPORT || props._NET_DESKTOP_GEOMETRY) {
      if (props._NET_DESKTOP_VIEWPORT) this.viewport = props._NET_DESKTOP_VIEWPORT;
      if (props._NET_DESKTOP_GEOMETRY) this.geometry = props._NET_DESKTOP_GEOMETRY;
      this.emit('viewport');
    }
    if (props._NET_CLIENT_LIST) {
      this.clients = props._NET_CLIENT_LIST;
      for (const id of [...this.cache.keys()]) if (!this.clients.includes(id)) this.cache.delete(id);
      this.emit('clients', this.clients);
    }
  }

  /** Full info for one window. */
  async info(id, fresh = false) {
    if (!id) return null;
    if (!fresh && this.cache.has(id)) {
      const c = this.cache.get(id);
      if (Date.now() - c.at < 1500) return c;
    }
    const out = await sh('xprop', ['-id', hex(id), ...INFO_PROPS], { timeout: 3000 });
    if (!out) { this.cache.delete(id); return null; }
    const p = parseXprop(out);
    const cls = p.WM_CLASS || [];
    const types = p._NET_WM_WINDOW_TYPE || [];
    const info = {
      id, at: Date.now(),
      instance: cls[0] || '', cls: cls[1] || cls[0] || '',
      pid: (p._NET_WM_PID || [])[0] || 0,
      title: (p._NET_WM_NAME || p.WM_NAME || [''])[0],
      type: (types[0] || '_NET_WM_WINDOW_TYPE_NORMAL').replace('_NET_WM_WINDOW_TYPE_', '').toLowerCase(),
      state: (p._NET_WM_STATE || []).map((s) => s.replace('_NET_WM_STATE_', '').toLowerCase()),
      transientFor: (p.WM_TRANSIENT_FOR || [])[0] || 0,
      desktop: (p._NET_WM_DESKTOP || [])[0],
      gtk: {
        bus: (p._GTK_UNIQUE_BUS_NAME || [])[0] || null,
        menubar: (p._GTK_MENUBAR_OBJECT_PATH || [])[0] || null,
        appmenu: (p._GTK_APP_MENU_OBJECT_PATH || [])[0] || null,
        app: (p._GTK_APPLICATION_OBJECT_PATH || [])[0] || null,
        win: (p._GTK_WINDOW_OBJECT_PATH || [])[0] || null,
        unity: (p._UNITY_OBJECT_PATH || [])[0] || null,
        appId: (p._GTK_APPLICATION_ID || [])[0] || null,
      },
      kde: {
        service: (p._KDE_NET_WM_APPMENU_SERVICE_NAME || [])[0] || null,
        path: (p._KDE_NET_WM_APPMENU_OBJECT_PATH || [])[0] || null,
      },
    };
    info.hidden = info.state.includes('hidden');
    info.normal = ['normal', 'dialog', 'utility'].includes(info.type) && !info.state.includes('skip_taskbar');
    this.cache.set(id, info);
    return info;
  }

  async allInfo() {
    const list = await Promise.all(this.clients.map((id) => this.info(id)));
    return list.filter(Boolean);
  }

  // ---- actions ----
  activate(id) { return sh('palos-x', ['window', 'activate', hex(id)]); }
  close(id) { return sh('palos-x', ['window', 'close', hex(id)]); }
  minimize(id) {
    return sh('palos-x', ['window', 'minimize', hex(id)]);
  }
  toggleMaximize(id) { return sh('palos-x', ['window', 'toggle-maximize', hex(id)]); }
  async wmName() {
    const root = parseXprop(await sh('xprop', ['-root', '_NET_SUPPORTING_WM_CHECK']));
    const w = (root._NET_SUPPORTING_WM_CHECK || [])[0];
    if (!w) return '';
    const p = parseXprop(await sh('xprop', ['-id', hex(w), '_NET_WM_NAME']));
    return ((p._NET_WM_NAME || [''])[0] || '').toLowerCase();
  }
  /** Set a CARDINAL array property (used for struts). */
  setCardinals(id, prop, values) {
    return sh('xprop', ['-id', hex(id), '-f', prop, '32c', '-set', prop, values.join(', ')]);
  }
}

module.exports = new X11();
module.exports.hex = hex;
module.exports.parseXprop = parseXprop;

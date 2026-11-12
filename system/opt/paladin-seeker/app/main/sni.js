'use strict';
// Tray icons: Seeker is the StatusNotifierWatcher and Host (the protocol modern tray icons use:
// Electron/Chromium, Qt, libappindicator/Ayatana, KDE apps ...).
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const D = require('./dbus');
const icons = require('./icons');
const { DbusMenu } = require('./appmenu');

const WATCHER_PATH = '/StatusNotifierWatcher';

class Tray extends EventEmitter {
  constructor() { super(); this.items = new Map(); this.ok = false; }

  async start() {
    const def = (iface) => ({
      methods: {
        RegisterStatusNotifierItem: { in: 's', fn: ([svc], msg) => { this._register(svc, msg.sender, iface); return []; } },
        RegisterStatusNotifierHost: { in: 's', fn: () => [] },
      },
      props: {
        RegisteredStatusNotifierItems: { sig: 'as', get: () => [...this.items.values()].map((i) => `${i.service}${i.path}`) },
        IsStatusNotifierHostRegistered: { sig: 'b', get: () => true },
        ProtocolVersion: { sig: 'i', get: () => 0 },
      },
      signals: { StatusNotifierItemRegistered: 's', StatusNotifierItemUnregistered: 's', StatusNotifierHostRegistered: '' },
    });
    D.serve(WATCHER_PATH, 'org.kde.StatusNotifierWatcher', def('org.kde'));
    D.serve(WATCHER_PATH, 'org.freedesktop.StatusNotifierWatcher', def('org.freedesktop'));
    D.onNameOwnerChanged((name, oldOwner, newOwner) => {
      if (newOwner) return;
      for (const [k, it] of [...this.items]) if (it.service === name || it.owner === name) this._remove(k);
    });
    D.onSignal((m) => {
      if (!/StatusNotifierItem$/.test(m.interface || '')) return;
      for (const it of this.items.values()) if ((it.owner === m.sender || it.service === m.sender) && it.path === m.path) this._refresh(it);
    });
    D.addMatch("type='signal',interface='org.kde.StatusNotifierItem'");
    D.addMatch("type='signal',interface='org.freedesktop.StatusNotifierItem'");
    try {
      const a = await D.requestName('org.kde.StatusNotifierWatcher');
      const b = await D.requestName('org.freedesktop.StatusNotifierWatcher').catch(() => false);
      await D.requestName(`org.kde.StatusNotifierHost-${process.pid}`).catch(() => {});
      this.ok = a || b;
      if (this.ok) for (const iface of ['org.kde', 'org.freedesktop']) D.emitSignal(WATCHER_PATH, `${iface}.StatusNotifierWatcher`, 'StatusNotifierHostRegistered');
    } catch (e) { console.error('[tray]', e.message); }
    return this.ok;
  }

  _register(arg, sender, ifacePrefix) {
    let service, p;
    if (arg.startsWith('/')) { service = sender; p = arg; }
    else if (arg.includes('/')) { const i = arg.indexOf('/'); service = arg.slice(0, i); p = arg.slice(i); }   // "busname/path" form
    else { service = arg; p = '/StatusNotifierItem'; }
    if (!/^(:[0-9.]+|[A-Za-z_][\w-]*(\.[A-Za-z_][\w-]*)+)$/.test(service)) return;   // a malformed name would get Seeker cut off the bus
    const key = `${service}${p}`;
    if (this.items.has(key)) return;
    const it = { key, service, owner: sender, path: p, iface: `${ifacePrefix}.StatusNotifierItem`, props: {}, icon: null };
    this.items.set(key, it);
    for (const iface of ['org.kde', 'org.freedesktop']) D.emitSignal(WATCHER_PATH, `${iface}.StatusNotifierWatcher`, 'StatusNotifierItemRegistered', 's', [key]);
    this._refresh(it);
  }

  _remove(key) {
    this.items.delete(key);
    for (const iface of ['org.kde', 'org.freedesktop']) D.emitSignal(WATCHER_PATH, `${iface}.StatusNotifierWatcher`, 'StatusNotifierItemUnregistered', 's', [key]);
    this.emit('change');
  }

  async _refresh(it) {
    clearTimeout(it.t);
    it.t = setTimeout(async () => {
      let props = null;
      for (const iface of [it.iface, 'org.kde.StatusNotifierItem', 'org.freedesktop.StatusNotifierItem']) {
        try { [props] = await D.call(it.service, it.path, 'org.freedesktop.DBus.Properties', 'GetAll', 's', [iface]); if (props && Object.keys(props).length) { it.iface = iface; break; } } catch {}
      }
      if (!props) return;
      it.props = D.unwrap(props);
      it.icon = this._icon(it.props);
      this.emit('change');
    }, 40);
  }

  _icon(p) {
    const name = p.Status === 'NeedsAttention' && (p.AttentionIconName || p.AttentionIconPixmap && p.AttentionIconPixmap.length) ? p.AttentionIconName : p.IconName;
    const pix = p.Status === 'NeedsAttention' && p.AttentionIconPixmap && p.AttentionIconPixmap.length ? p.AttentionIconPixmap : p.IconPixmap;
    if (name) {
      if (path.isAbsolute(name) && fs.existsSync(name)) return { file: name };
      if (p.IconThemePath) {
        for (const ext of ['.png', '.svg']) {
          const direct = path.join(p.IconThemePath, name + ext); if (fs.existsSync(direct)) return { file: direct };
          for (const sz of ['22x22', '24x24', '32x32', '48x48', 'scalable', '16x16']) for (const sub of ['apps', 'status', 'actions', 'panel']) {
            const f = path.join(p.IconThemePath, 'hicolor', sz, sub, name + ext); if (fs.existsSync(f)) return { file: f };
          }
        }
      }
      const f = icons.lookup([name], 22);
      if (f) return { file: f };
    }
    if (pix && pix.length) {
      // a(iiay): ARGB32 in network byte order. Pick the size closest to 44px (2x for crispness).
      let best = pix[0];
      for (const x of pix) if (Math.abs(x[0] - 44) < Math.abs(best[0] - 44)) best = x;
      const [w, h, data] = best;
      if (w > 0 && h > 0 && data && data.length >= w * h * 4) {
        const bgra = Buffer.alloc(w * h * 4);
        for (let i = 0; i < w * h; i++) {
          const a = data[i * 4], r = data[i * 4 + 1], g = data[i * 4 + 2], b = data[i * 4 + 3];
          bgra[i * 4] = b; bgra[i * 4 + 1] = g; bgra[i * 4 + 2] = r; bgra[i * 4 + 3] = a;
        }
        const { nativeImage } = require('electron');
        return { data: nativeImage.createFromBitmap(bgra, { width: w, height: h }).toDataURL() };
      }
    }
    return null;
  }

  /** Ids of tray icons not to show, e.g. the stock network icon when the menu bar has its own Wi-Fi menu. */
  setHidden(ids) { this.hidden = new Set((ids || []).map((x) => String(x).toLowerCase())); this.emit('change'); }

  _isHidden(it) {
    if (!this.hidden || !this.hidden.size) return false;
    const id = String(it.props.Id || '').toLowerCase();
    const title = String(it.props.Title || '').toLowerCase();
    return this.hidden.has(id) || this.hidden.has(title);
  }

  list() {
    return [...this.items.values()]
      .filter((it) => it.props.Status !== 'Passive' && (it.icon || it.props.Title) && !this._isHidden(it))
      .map((it) => ({
        key: it.key, title: it.props.Title || it.props.Id || '', icon: it.icon,
        tooltip: Array.isArray(it.props.ToolTip) ? (it.props.ToolTip[2] || it.props.ToolTip[3] || '') : '',
        hasMenu: !!it.props.Menu && it.props.Menu !== '/', itemIsMenu: !!it.props.ItemIsMenu,
      }));
  }

  async menu(key) {
    const it = this.items.get(key);
    if (!it || !it.props.Menu || it.props.Menu === '/') return null;
    if (!it.menu) it.menu = new DbusMenu(it.service, it.props.Menu);
    try { await it.menu.opening('d:0'); return it.menu; } catch { return null; }
  }

  activate(key, x, y, secondary = false) {
    const it = this.items.get(key);
    if (!it) return Promise.resolve(false);
    return D.call(it.service, it.path, it.iface, secondary ? 'SecondaryActivate' : 'Activate', 'ii', [Math.round(x), Math.round(y)]).then(() => true, () => false);
  }
  /** the item draws its own menu (programs without a published menu, and old-style icons) */
  context(key, x, y) {
    const it = this.items.get(key);
    if (!it) return Promise.resolve(false);
    return D.call(it.service, it.path, it.iface, 'ContextMenu', 'ii', [Math.round(x), Math.round(y)]).then(() => true, () => false);
  }
  scroll(key, delta) {
    const it = this.items.get(key);
    if (it) D.call(it.service, it.path, it.iface, 'Scroll', 'is', [delta, 'vertical']).catch(() => {});
  }
}

module.exports = new Tray();

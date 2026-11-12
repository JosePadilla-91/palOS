'use strict';
// Kibble menus: Menu.setApplicationMenu() shows in palOS's menu bar. Seeker draws the menu bar and reads each
// window's menu over DBus (com.canonical.dbusmenu, registered with com.canonical.AppMenu.Registrar), so the menu
// is exported there, once per app, and every window of the app is registered with it.
const { EventEmitter } = require('events');

const ROLES = {   // what Electron's roles do, done in the focused page
  undo: (w) => w.webContents.undo(), redo: (w) => w.webContents.redo(), cut: (w) => w.webContents.cut(), copy: (w) => w.webContents.copy(),
  paste: (w) => w.webContents.paste(), pasteAndMatchStyle: (w) => w.webContents.paste(), delete: (w) => w.webContents.delete(),
  selectAll: (w) => w.webContents.selectAll(), reload: (w) => w.webContents.reload(), forceReload: (w) => w.webContents.reload(),
  minimize: (w) => w.minimize(), close: (w) => w.close(), togglefullscreen: (w) => w.setFullScreen(!w.isFullScreen()), zoom: (w) => (w.isMaximized() ? w.unmaximize() : w.maximize()),
  toggleDevTools: () => {}, resetZoom: () => {}, zoomIn: () => {}, zoomOut: () => {}, front: () => {},
};
const ROLE_LABEL = { undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', pasteAndMatchStyle: 'Paste and Match Style', delete: 'Delete',
  selectAll: 'Select All', reload: 'Reload', forceReload: 'Force Reload', minimize: 'Minimize', close: 'Close Window', togglefullscreen: 'Enter Full Screen',
  zoom: 'Zoom', quit: 'Quit', about: 'About', hide: 'Hide', hideOthers: 'Hide Others', unhide: 'Show All', windowMenu: 'Window', editMenu: 'Edit',
  fileMenu: 'File', viewMenu: 'View', appMenu: '', help: 'Help', toggleDevTools: 'Developer Tools', resetZoom: 'Actual Size', zoomIn: 'Zoom In', zoomOut: 'Zoom Out', front: 'Bring All to Front' };
const ROLE_ACCEL = { undo: 'CmdOrCtrl+Z', redo: 'CmdOrCtrl+Shift+Z', cut: 'CmdOrCtrl+X', copy: 'CmdOrCtrl+C', paste: 'CmdOrCtrl+V', selectAll: 'CmdOrCtrl+A',
  reload: 'CmdOrCtrl+R', minimize: 'CmdOrCtrl+M', close: 'CmdOrCtrl+W', quit: 'CmdOrCtrl+Q', togglefullscreen: 'F11' };

module.exports = function ({ BrowserWindow, app, windowsXid }) {
  let ids = 1;
  class MenuItem {
    constructor(o = {}) {
      Object.assign(this, { type: 'normal', enabled: true, visible: true, checked: false }, o);
      if (this.submenu && !(this.submenu instanceof Menu)) this.submenu = Menu.buildFromTemplate(this.submenu);
      if (this.submenu) this.type = 'submenu';
      if (!this.label && this.role) this.label = ROLE_LABEL[this.role] ?? this.role;
      if (!this.accelerator && this.role) this.accelerator = ROLE_ACCEL[this.role];
      this.commandId = ids++;
    }
    click(e, win) {
      const w = win || BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (this.type === 'checkbox') this.checked = !this.checked;
      if (this.type === 'radio') { for (const s of this._siblings || []) if (s.type === 'radio') s.checked = false; this.checked = true; }
      if (typeof this._click === 'function') return this._click(this, w, e || {});
      if (this.role === 'quit') return app.quit();
      if (this.role && ROLES[this.role] && w) return ROLES[this.role](w);
    }
  }
  // keep the app's click function apart from MenuItem.click()
  const wrap = (o) => { const { click, ...rest } = o || {}; const m = new MenuItem(rest); m._click = click; return m; };

  class Menu extends EventEmitter {
    constructor() { super(); this.items = []; }
    static buildFromTemplate(t) { const m = new Menu(); for (const o of t || []) m.append(o instanceof MenuItem ? o : wrap(o)); return m; }
    static setApplicationMenu(m) { appMenu = m; refresh(); }
    static getApplicationMenu() { return appMenu; }
    static sendActionToFirstResponder() {}
    append(i) { i._siblings = this.items; this.items.push(i); later(); }
    insert(pos, i) { i._siblings = this.items; this.items.splice(pos, 0, i); later(); }
    getMenuItemById(id) { for (const i of this.items) { if (i.id === id) return i; const s = i.submenu && i.submenu.getMenuItemById(id); if (s) return s; } return null; }
    // a right-click menu, drawn in the window by Kibble's page side (palOS's look; labels kept to 20 characters)
    popup(o = {}) {
      const w = o.window || BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]; if (!w || w.isDestroyed()) return;
      const tree = (m) => m.items.filter((i) => i.visible !== false).map((i) => i.type === 'separator' ? { type: 'separator' }
        : { id: i.commandId, label: i.label || '', type: i.type, enabled: i.enabled !== false, checked: !!i.checked, accel: i.accelerator || '', submenu: i.submenu ? tree(i.submenu) : undefined });
      const token = ++popupSeq;
      popups.set(token, { menu: this, win: w, callback: o.callback });
      this.emit('menu-will-show', {});
      w.webContents._run(`window.__kibble&&__kibble._popup(${token},${o.x ?? 'null'},${o.y ?? 'null'},${JSON.stringify(tree(this))})`);
    }
    closePopup(w) { const win = w || BrowserWindow.getFocusedWindow(); if (win) win.webContents._run('window.__kibble&&__kibble._closeMenu()'); }
  }
  let appMenu = null;
  const popups = new Map();     // token -> { menu, win, callback }
  let popupSeq = 0;

  // ---------------------------------------------------------------- DBus
  // Each window's menu (its own, from win.setMenu, or else the app's) is exported at its own path and
  // registered for that window with the AppMenu registrar, which is how Seeker's menu bar finds it.
  let dbus = null, D = null, Iface = null;
  const exported = new Map();      // window id -> { iface, path, xid, rev }
  const menuOf = (w) => (w && w._menu !== undefined ? w._menu : appMenu);
  function byId(menu, id) { for (const i of (menu ? menu.items : [])) { if (i.commandId === id) return i; if (i.submenu) { const s = byId(i.submenu, id); if (s) return s; } } return null; }
  function shortcut(acc) {
    if (!acc) return null;
    const keys = String(acc).split('+').map((k) => ({ CmdOrCtrl: 'Control', CommandOrControl: 'Control', Ctrl: 'Control', Control: 'Control', Cmd: 'Super', Command: 'Super', Alt: 'Alt', Option: 'Alt', Shift: 'Shift', Super: 'Super', Meta: 'Super' }[k] || (k.length === 1 ? k.toUpperCase() : k)));
    return [keys];
  }
  function props(i) {
    const V = (t, v) => new dbus.Variant(t, v), p = {};
    if (i.type === 'separator') { p.type = V('s', 'separator'); return p; }
    p.label = V('s', String(i.label || '').replace(/_/g, '__').replace(/&(?=\w)/, '_'));
    p.enabled = V('b', i.enabled !== false); p.visible = V('b', i.visible !== false);
    if (i.type === 'checkbox' || i.type === 'radio') { p['toggle-type'] = V('s', i.type === 'checkbox' ? 'checkmark' : 'radio'); p['toggle-state'] = V('i', i.checked ? 1 : 0); }
    if (i.submenu) p['children-display'] = V('s', 'submenu');
    const s = shortcut(i.accelerator); if (s && !i.submenu) p.shortcut = V('aas', s);
    return p;
  }
  function children(menu) {
    return (menu ? menu.items : []).filter((i) => i.visible !== false)
      .map((i) => new dbus.Variant('(ia{sv}av)', [i.commandId, props(i), i.submenu ? children(i.submenu) : []]));
  }
  function node(menu, id) {
    if (id === 0) return [0, { 'children-display': new dbus.Variant('s', 'submenu') }, children(menu)];
    const i = byId(menu, id); if (!i) return [id, {}, []];
    return [id, props(i), i.submenu ? children(i.submenu) : []];
  }
  function iface() {
    if (Iface) return Iface;
    const { Interface } = dbus.interface;
    class DbusMenu extends Interface {
      constructor(win) { super('com.canonical.dbusmenu'); this.win = win; this.rev = 1; }
      menu() { return menuOf(this.win); }
      GetLayout(parent) { return [this.rev, node(this.menu(), parent)]; }
      GetGroupProperties(ids) { return ids.map((id) => { const i = byId(this.menu(), id); return [id, i ? props(i) : {}]; }); }
      GetProperty(id, name) { const i = byId(this.menu(), id); const p = i ? props(i) : {}; return p[name] || new dbus.Variant('s', ''); }
      Event(id, type) {
        if (type !== 'clicked') return;
        const i = byId(this.menu(), id); if (!i) return;
        const w = this.win;
        setImmediate(() => { try { i.click({}, w && !w.isDestroyed() ? w : BrowserWindow.getFocusedWindow()); } catch (e) { console.error(e); } refresh(); });
      }
      EventGroup(events) { for (const [id, type] of events) this.Event(id, type); return []; }
      AboutToShow() { return false; }
      AboutToShowGroup() { return [[], []]; }
      LayoutUpdated(rev, parent) { return [rev, parent]; }
      ItemsPropertiesUpdated() { return [[], []]; }
    }
    const S = (i, o) => ({ inSignature: i, outSignature: o });
    DbusMenu.configureMembers({
      properties: {},
      methods: { GetLayout: S('iias', 'u(ia{sv}av)'), GetGroupProperties: S('aias', 'a(ia{sv})'), GetProperty: S('is', 'v'), Event: S('isvu', ''),
        EventGroup: S('a(isvu)', 'ai'), AboutToShow: S('i', 'b'), AboutToShowGroup: S('ai', 'aiai') },
      signals: { LayoutUpdated: { signature: 'ui' }, ItemsPropertiesUpdated: { signature: 'a(ia{sv})a(ias)' } },
    });
    DbusMenu.prototype.Version = 3; DbusMenu.prototype.Status = 'normal';
    return (Iface = DbusMenu);
  }
  async function publish() {
    if (!dbus) { try { dbus = require('dbus-next'); } catch { return; } }
    try {
      if (!D) { D = dbus.sessionBus(); D.on('error', () => {}); }
      const Cls = iface();
      let reg = null;
      for (const w of BrowserWindow.getAllWindows()) {
        if (w.isDestroyed() || !w._xid) continue;
        let e = exported.get(w.id);
        if (!e) { e = { iface: new Cls(w), path: `/org/palos/kibble/menu/w${w.id}`, xid: 0 }; D.export(e.path, e.iface); exported.set(w.id, e); w.once('closed', () => { try { D.unexport(e.path); } catch {} exported.delete(w.id); }); }
        e.iface.rev++;
        try { e.iface.LayoutUpdated(e.iface.rev, 0); } catch {}
        if (e.xid !== w._xid && menuOf(w)) {
          if (!reg) reg = await D.getProxyObject('com.canonical.AppMenu.Registrar', '/com/canonical/AppMenu/Registrar').then((o) => o.getInterface('com.canonical.AppMenu.Registrar')).catch(() => null);
          if (reg) { await reg.RegisterWindow(w._xid, e.path).catch(() => {}); e.xid = w._xid; }
        }
      }
    } catch (err) { process.stderr.write(`kibble: menu bar: ${err.message}\n`); }
  }
  // changes come in bursts (an app building its menu item by item): one update for the lot
  let timer = null;
  function later() { if (timer) return; timer = setTimeout(() => { timer = null; refresh(); }, 30); }
  function refresh() { publish(); sendAccels(); }
  // windows show their menu once they're on screen
  let lastXids = '';
  setInterval(() => { const xs = BrowserWindow.getAllWindows().map((w) => w._xid).join(','); if (xs !== lastXids) { lastXids = xs; if (appMenu || BrowserWindow.getAllWindows().some((w) => w._menu)) publish(); } }, 500).unref();

  // Menu shortcuts work inside the app's windows (as in Electron): each window gets its menu's list, and the
  // page asks for the item when one is pressed. Items with registerAccelerator: false are the page's own keys.
  function accels(menu, out = []) {
    for (const i of (menu ? menu.items : [])) {
      if (i.submenu) accels(i.submenu, out);
      else if (i.accelerator && i.enabled !== false && i.visible !== false && i.registerAccelerator !== false) out.push([i.commandId, String(i.accelerator)]);
    }
    return out;
  }
  function accelScript(w) { return `window.__kibble&&__kibble._accels(${JSON.stringify(accels(menuOf(w)))})`; }
  function sendAccels() { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.executeJavaScript(accelScript(w)); }
  function accelClick(w, id) { const i = byId(menuOf(w), id); if (i && i.enabled !== false) i.click({ triggeredByAccelerator: true }, w); }
  // context-menu clicks come back from the page (electron.js passes 'kibble:menu' messages here)
  function contextClick(w, token, id) {
    const p = popups.get(token); if (!p) return; popups.delete(token);
    const i = id == null ? null : byId(p.menu, id);
    if (i) { try { i.click({}, p.win); } catch (e) { console.error(e); } }
    p.menu.emit('menu-will-close', {});
    if (typeof p.callback === 'function') { try { p.callback(); } catch (e) { console.error(e); } }
  }
  function windowMenuChanged() { refresh(); }
  return { Menu, MenuItem, contextClick, accelClick, accelScript, windowMenuChanged };
};

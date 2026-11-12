'use strict';
/* Shared renderer helpers: elements, icons, formatting, classic menus, window chrome. */
const Q = new URLSearchParams(location.search);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}

let ICON_GEN = 0;   // bumped when the icon theme changes, so pictures are fetched again
function iconURL(names, size = 48) {
  const list = (Array.isArray(names) ? names : [names]).filter(Boolean);
  return `seeker://icon/?s=${size}&n=${encodeURIComponent(list.join('|'))}${ICON_GEN ? `&g=${ICON_GEN}` : ''}`;
}
if (typeof seeker !== 'undefined' && seeker.on) seeker.on('icons:changed', (g) => { ICON_GEN = g; });
/** the thumbnail size to ask for when an image fills `px` screen pixels: the smallest of 128/256/512/1024 that
 *  is at least that big, so it's never stretched up, and never shrunk more than 2x in one step (which looks jagged) */
function thumbSizeFor(px) { return px <= 128 ? 128 : px <= 256 ? 256 : px <= 512 ? 512 : 1024; }
function thumbURL(p, size = 256, mtime = 0) { return `seeker://thumb/?s=${size}&p=${encodeURIComponent(p)}&t=${Math.floor(mtime || 0)}`; }
function fileURL(p) { return 'file://' + p.split('/').map(encodeURIComponent).join('/'); }

function iconImg(names, size, cls = '') {
  const i = el('img', { class: cls, draggable: 'false', src: iconURL(names, Math.max(16, Math.round(size * (devicePixelRatio || 1)))) });
  i.width = size; i.height = size; return i;
}

function humanSize(n) {
  if (n == null) return '--';
  if (n < 1000) return n === 1 ? '1 byte' : `${n} bytes`;
  const u = ['KB', 'MB', 'GB', 'TB', 'PB']; let i = -1;
  do { n /= 1000; i++; } while (n >= 1000 && i < u.length - 1);
  return `${n >= 100 ? Math.round(n) : n.toFixed(1).replace(/\.0$/, '')} ${u[i]}`;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FR_UI = /^fr/i.test(navigator.language || '');
if (FR_UI) {
  MONTHS.splice(0, 12, 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.');
  MONTHS_LONG.splice(0, 12, 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre');
  DAYS.splice(0, 7, 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi');
}
function timeStr(d, h24 = false) {
  const m = String(d.getMinutes()).padStart(2, '0');
  if (FR_UI) return `${d.getHours()} h ${m}`;
  if (h24) return `${String(d.getHours()).padStart(2, '0')}:${m}`;
  const h = d.getHours() % 12 || 12; return `${h}:${m} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}
function relDate(ms) {
  if (!ms) return '--';
  const d = new Date(ms); const now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (day(now) - day(d)) / 86400000;
  if (FR_UI) {
    if (diff === 0) return `Aujourd’hui à ${timeStr(d)}`;
    if (diff === 1) return `Hier à ${timeStr(d)}`;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} à ${timeStr(d)}`;
  }
  if (diff === 0) return `Today, ${timeStr(d)}`;
  if (diff === 1) return `Yesterday, ${timeStr(d)}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${timeStr(d)}`;
}
function longDate(ms) {
  if (!ms) return '--';
  const d = new Date(ms);
  if (FR_UI) return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()} ${timeStr(d)}`;
  return `${DAYS[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${timeStr(d)}`;
}

const KEY_GLYPH = { backspace: '⌫', delete: '⌦', return: '↩', enter: '⌤', escape: '⎋', up: '↑', down: '↓', left: '←', right: '→', tab: '⇥', space: 'Space', ' ': 'Space',
  page_up: '⇞', prior: '⇞', page_down: '⇟', next: '⇟', home: '↖', end: '↘', plus: '+', minus: '-', equal: '=', comma: ',', period: '.', slash: '/',
  bracketleft: '[', bracketright: ']', semicolon: ';', apostrophe: "'", grave: '`', backslash: '\\', question: '?', kp_add: '+', kp_subtract: '-' };
function accelText(a) {
  if (!a || !a.key) return '';
  const m = a.mods || [];
  let s = '';
  if (m.includes('ctrl')) s += '⌃';
  if (m.includes('alt')) s += '⌥';
  if (m.includes('shift')) s += '⇧';
  if (m.includes('super')) s += '⌘';
  const k = String(a.key);
  const g = KEY_GLYPH[k.toLowerCase()];
  return s + (g || (k.length === 1 ? k.toUpperCase() : k));
}

/* ---------------- classic menu ---------------- */
// A right-click menu from the desktop is drawn by the menu bar, which sits above every window: a menu drawn
// in the desktop itself would open behind any window in the way. Pages that want this have body.remote-menus;
// elsewhere (and if the menu bar can't show it) the menu is drawn in the page as usual.
const remoteMenus = { seq: 0, open: new Map() };
const MENU_FIELDS = ['id', 'label', 'enabled', 'type', 'toggle', 'checked', 'accel', 'submenu', 'icon', 'header'];
function popupMenu(items, opts = {}) {
  if (!document.body.classList.contains('remote-menus') || !window.seeker) return new Menu(items, opts);
  const req = ++remoteMenus.seq;
  const byId = new Map();
  const strip = (list) => (list || []).map((it) => {
    const c = {};
    for (const k of MENU_FIELDS) if (it[k] !== undefined && typeof it[k] !== 'function') c[k] = it[k];
    if (c.type !== 'separator') { if (c.id == null) c.id = '_r' + byId.size; byId.set(String(c.id), it); }
    if (it.children) c.children = strip(it.children);
    return c;
  });
  remoteMenus.open.set(req, { items, opts, byId, strip });
  seeker.send('ctxmenu:open', req, strip(items), opts.x, opts.y);
  return { close() { seeker.send('ctxmenu:close', req); }, remote: true };
}
if (window.seeker) {
  seeker.on('ctxmenu:done', (req, id) => {
    const m = remoteMenus.open.get(req); if (!m) return;
    remoteMenus.open.delete(req);
    const it = id != null ? m.byId.get(String(id)) : null;
    if (it && m.opts.onActivate) m.opts.onActivate(it);
    if (m.opts.onClose) m.opts.onClose(it ? 'chosen' : 'outside');
  });
  seeker.on('ctxmenu:sub', async (req, id, k) => {
    const m = remoteMenus.open.get(req);
    let kids = null;
    try { const it = m && m.byId.get(String(id)); if (it && m.opts.onOpenSub) kids = await m.opts.onOpenSub(it); } catch (e) {}
    seeker.send('ctxmenu:subReply', k, kids && m ? m.strip(kids) : null);
  });
  seeker.on('ctxmenu:fallback', (req) => {             // the point isn't on the menu bar's screen: draw it here
    const m = remoteMenus.open.get(req); if (!m) return;
    remoteMenus.open.delete(req);
    new Menu(m.items, m.opts);
  });
}
// The copy bar: copies and moves in progress, summed up in one soft bar (no windows). Put in a page with
// copyBar(container, { onlyAlone }) (onlyAlone: shown only while no Seeker window is open: the desktop).
function copyBar(box, opts = {}) {
  if (!box || !window.seeker) return;
  const FRL = /^fr/i.test(document.documentElement.lang || navigator.language || '');
  const T = (en, fr) => (FRL ? fr : en);
  // a disk's name as the sidebar shows it (an unnamed stick is “Untitled”, shown as “Sans titre” in French)
  const vn = (n) => { try { const t = window.__palosL10n && window.__palosL10n(String(n)); return t || n; } catch { return n; } };
  const size = (n) => { const u = FRL ? ['octets', 'Ko', 'Mo', 'Go', 'To'] : ['bytes', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return `${i ? (n >= 100 ? Math.round(n) : n.toFixed(1)) : n} ${u[i]}`; };
  const root = el('div', { class: 'copybar hidden' });
  const label = el('span', { class: 'cb-label' });
  const track = el('div', { class: 'cb-track' }), fill = el('div', { class: 'cb-fill' });
  track.append(fill);
  const stop = el('span', { class: 'cb-stop', title: T('Stop', 'Arrêter'), text: '×' });
  const eject = el('span', { class: 'cb-eject hidden', text: T('Eject', 'Éjecter') });
  root.append(track, label, stop, eject);
  box.append(root);
  let last = null, t0 = 0, d0 = 0;
  stop.addEventListener('click', (e) => { e.stopPropagation(); seeker.send('copy:action', '*', 'stop'); });
  eject.addEventListener('click', async (e) => { e.stopPropagation(); const s = last && last.safe && last.safe[0]; if (s) { await seeker.invoke('copy:eject', s.id); seeker.send('copy:action', s.id, 'close'); } });
  const render = (s) => {
    last = s;
    const show = s && (s.phase || (s.safe && s.safe.length)) && !(opts.onlyAlone && s.browsers > 0);
    root.classList.toggle('hidden', !show);
    if (box.classList.contains('statusbar')) box.classList.toggle('copying', !!show);
    if (!show) { t0 = 0; return; }
    if (!s.phase) {             // only a USB stick that just finished: safe to unplug
      const v = s.safe[0];
      root.classList.add('safe'); fill.style.width = '100%'; stop.classList.add('hidden'); eject.classList.remove('hidden');
      label.textContent = T(`“${vn(v.volName)}” is safe to unplug`, `« ${vn(v.volName)} » peut être débranché`);
      root.title = label.textContent;
      return;
    }
    root.classList.remove('safe'); stop.classList.remove('hidden'); eject.classList.add('hidden');
    const items = s.count === 1 && s.first ? `“${s.first}”` : T(`${s.count} items`, `${s.count} éléments`);
    let text, pct = 0;
    if (s.phase === 'prep') { text = s.move ? T('Preparing to move…', 'Préparation…') : T('Preparing to copy…', 'Préparation…'); root.classList.add('busy'); }
    else if (s.phase === 'finish') { text = T('Finishing…', 'Finalisation…'); pct = 1; root.classList.remove('busy'); }
    else {
      root.classList.remove('busy');
      pct = s.total ? s.done / s.total : 0;
      text = (s.move ? T('Moving ', 'Déplacement de ') : T('Copying ', 'Copie de ')) + items;
      if (!t0) { t0 = Date.now(); d0 = s.done; }
    }
    fill.style.width = (pct * 100).toFixed(1) + '%';
    label.textContent = text + (s.phase === 'copy' ? `  ${Math.floor(pct * 100)} %` : '');
    let tip = text + (s.dest ? T(` to “${vn(s.dest)}”`, ` vers « ${vn(s.dest)} »`) : '');
    if (s.phase === 'copy' && s.total) {
      tip += '\n' + T(`${size(s.done)} of ${size(s.total)}`, `${size(s.done)} sur ${size(s.total)}`);
      const secs = (Date.now() - t0) / 1000, rate = secs > 1.5 ? (s.done - d0) / secs : 0;
      if (rate > 0) { const left = Math.max(1, Math.round((s.total - s.done) / rate)); tip += ' — ' + (left < 60 ? T(`about ${left} s left`, `environ ${left} s restantes`) : T(`about ${Math.round(left / 60)} min left`, `environ ${Math.round(left / 60)} min restantes`)); }
    }
    if (s.ops > 1) tip += '\n' + T(`${s.ops} copies at once`, `${s.ops} copies en même temps`);
    root.title = tip;
  };
  seeker.on('copy:progress', render);
  seeker.invoke('copy:summary').then(render).catch(() => {});
}
// palOS rule: a menu entry is at most 20 characters, spaces included (longer ones end in …; the whole text shows on hover)
function capLabel(t) { t = String(t || ''); return t.length > 20 ? t.slice(0, 19).trimEnd() + '…' : t; }
class Menu {
  /**
   * items: [{id,label,enabled,type:'separator',toggle,checked,accel,children,submenu,icon,header}]
   * opts: { x, y, onActivate(item), onClose(reason), fromBar, minWidth, onOpenSub(item) -> Promise<children>|null, flipX }
   */
  constructor(items, opts = {}) {
    this.items = items; this.opts = opts; this.child = null; this.hl = -1; this.parent = opts.parent || null;
    this.openedAt = Date.now(); this.moved = false;
    this.el = el('div', { class: 'menu' + (opts.fromBar ? ' from-bar' : ''), tabindex: '-1' });
    if (opts.minWidth) this.el.style.minWidth = opts.minWidth + 'px';
    this.rows = [];
    this.render();
    document.body.append(this.el);
    this.place(opts.x, opts.y, opts.anchor);
    if (!this.parent) {
      this._down = (e) => { if (!this.contains(e.target) && !(opts.ignore && opts.ignore(e))) this.closeAll('outside'); };
      this._key = (e) => this.key(e);
      setTimeout(() => { document.addEventListener('mousedown', this._down, true); }, 0);
      document.addEventListener('keydown', this._key, true);
      // Window managers often refocus on a click (focus out, then in): only a lasting blur closes the menu.
      this._blur = () => setTimeout(() => { if (!document.hasFocus() && !this.closed) this.closeAll('blur'); }, 250);
      if (!opts.keepOnBlur) window.addEventListener('blur', this._blur);
    }
  }
  render() {
    this.el.textContent = ''; this.rows = [];
    const anyCheck = this.items.some((i) => i.toggle || i.checked);
    const anyIcon = this.items.some((i) => i.icon && i.type !== 'separator');
    this.items.forEach((it, idx) => {
      if (it.type === 'separator') { this.el.append(el('div', { class: 'sep' })); this.rows.push(null); return; }
      const hasKids = it.submenu || (it.children && it.children.length);
      const row = el('div', { class: 'mi' + (it.enabled === false ? ' disabled' : '') + (it.header ? ' header' : '') },
        anyCheck ? el('span', { class: 'ck', text: it.checked ? (it.toggle === 'radio' ? '•' : '✓') : '' }) : null,
        anyIcon ? (it.icon ? (it.icon.startsWith && (it.icon.startsWith('data:') || it.icon.startsWith('seeker:')) ? el('img', { class: 'ic', src: it.icon }) : iconImg(it.icon, 16, 'ic')) : el('span', { class: 'ic' })) : null,
        el('span', { class: 'lb', text: capLabel(it.label), title: String(it.label || '').length > 20 ? it.label : '' }),
        hasKids ? el('span', { class: 'ar', text: '▶' }) : (it.accel ? el('span', { class: 'ac', text: accelText(it.accel) }) : null));
      row.addEventListener('mouseenter', () => this.highlight(idx, true));
      row.addEventListener('mousemove', () => { this.root().moved = true; });
      row.addEventListener('mouseup', (e) => {
        const r = this.root();
        // The button that opened the menu is often released over it: only a real choice counts.
        if (Date.now() - r.openedAt < 350 && !r.moved) return;
        if (e.button === 0 || e.button === 2) this.choose(idx);
      });
      row.addEventListener('click', (e) => { const r = this.root(); if (Date.now() - r.openedAt < 350 && !r.moved && e.detail) this.choose(idx); });
      row.addEventListener('mousedown', (e) => e.preventDefault());
      this.el.append(row); this.rows.push(row);
    });
  }
  place(x, y, anchor) {
    const r = this.el.getBoundingClientRect();
    const W = innerWidth, H = innerHeight;
    if (anchor) {           // submenu next to a row
      x = anchor.right - 3; y = anchor.top - 4;
      if (x + r.width > W - 2) x = anchor.left - r.width + 3;
    } else if (x + r.width > W - 2) x = this.opts.flipX ? x - r.width : W - r.width - 2;
    if (y + r.height > H - 2) y = Math.max(this.opts.fromBar ? 22 : 2, anchor ? H - r.height - 2 : (this.opts.fromBar ? H - r.height - 2 : y - r.height));
    this.el.style.left = Math.max(0, Math.round(x)) + 'px'; this.el.style.top = Math.max(0, Math.round(y)) + 'px';
    if (!this.parent) this.layoutChanged();
  }
  root() { let m = this; while (m.parent) m = m.parent; return m; }
  contains(t) { let m = this; while (m) { if (m.el.contains(t)) return true; m = m.child; } return false; }
  rects() { const out = []; let m = this; while (m) { const r = m.el.getBoundingClientRect(); out.push({ x: r.left - 8, y: r.top, width: r.width + 16, height: r.height + 14 }); m = m.child; } return out; }
  highlight(idx, fromMouse) {
    if (this.hl === idx && this.child) return;
    this.rows.forEach((r, i) => r && r.classList.toggle('hl', i === idx));
    this.hl = idx;
    clearTimeout(this._subT);
    const it = this.items[idx];
    if (this.child && (!it || this.child.forItem !== it)) { this.child.close(); this.child = null; this.root().layoutChanged(); }
    if (it && (it.submenu || (it.children && it.children.length)) && it.enabled !== false) {
      const open = async () => {
        let kids = it.children || [];
        if (this.root().opts.onOpenSub) { const k = await this.root().opts.onOpenSub(it); if (k) kids = k; }
        if (this.hl !== idx || this.closed) return;
        if (this.child) this.child.close();
        this.child = new Menu(kids.length ? kids : [{ id: '_empty', label: '(Empty)', enabled: false }], { parent: this, anchor: this.rows[idx].getBoundingClientRect() });
        this.child.forItem = it;
        this.child.root = () => this.root();
        this.root().layoutChanged();
      };
      if (fromMouse) this._subT = setTimeout(open, 120); else open();
    }
  }
  layoutChanged() { this.opts.onLayout && this.opts.onLayout(this.rects()); }
  choose(idx) {
    const it = this.items[idx];
    if (!it || it.type === 'separator' || it.enabled === false || it.header) return;
    if (it.submenu || (it.children && it.children.length)) { this.highlight(idx, false); return; }
    const row = this.rows[idx]; const root = this.root();
    if (root.choosing) return; root.choosing = true;
    // classic blinks the chosen item once before closing.
    row.classList.add('flash');
    setTimeout(() => { row.classList.remove('flash'); setTimeout(() => { root.closeAll('chosen'); root.opts.onActivate && root.opts.onActivate(it); }, 50); }, 60);
  }
  key(e) {
    let m = this; while (m.child) m = m.child;
    const enabledIdx = m.items.map((it, i) => (it.type !== 'separator' && it.enabled !== false && !it.header ? i : -1)).filter((i) => i >= 0);
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); if (m.parent) { m.parent.child = null; m.close(); this.layoutChanged(); } else this.closeAll('escape'); return; }
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation();
      const pos = enabledIdx.indexOf(m.hl);
      const next = k === 'ArrowDown' ? enabledIdx[(pos + 1) % enabledIdx.length] : enabledIdx[(pos - 1 + enabledIdx.length) % enabledIdx.length];
      if (next != null) m.highlight(next, false);
      return;
    }
    if (k === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); const it = m.items[m.hl]; if (it && (it.submenu || (it.children && it.children.length))) { m.highlight(m.hl, false); setTimeout(() => { if (m.child) { const f = m.child.items.findIndex((x) => x.type !== 'separator' && x.enabled !== false); m.child.highlight(f, false); } }, 30); } else if (this.opts.onRight) this.opts.onRight(); return; }
    if (k === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); if (m.parent) { m.parent.child = null; m.close(); this.layoutChanged(); } else if (this.opts.onLeft) this.opts.onLeft(); return; }
    if (k === 'Enter' || k === ' ') { e.preventDefault(); e.stopPropagation(); if (m.hl >= 0) m.choose(m.hl); return; }
    if (k.length === 1 && /\S/.test(k)) {
      const l = k.toLowerCase();
      const hit = enabledIdx.find((i) => i > m.hl && (m.items[i].label || '').toLowerCase().startsWith(l)) ?? enabledIdx.find((i) => (m.items[i].label || '').toLowerCase().startsWith(l));
      if (hit != null) { e.preventDefault(); e.stopPropagation(); m.highlight(hit, false); }
    }
  }
  close() {
    this.closed = true;
    if (this.child) { this.child.close(); this.child = null; }
    this.el.remove();
    if (this._down) document.removeEventListener('mousedown', this._down, true);
    if (this._key) document.removeEventListener('keydown', this._key, true);
    if (this._blur) window.removeEventListener('blur', this._blur);
  }
  closeAll(reason) { const r = this.root(); if (r.closed) return; r.close(); r.opts.onClose && r.opts.onClose(reason); }
}

/* ---------------- window chrome (traffic lights, focus state, resize grip) ---------------- */
function setupChrome({ lights = true, zoom = true, min = true, grip = true } = {}) {
  if (Q.get('composited') !== '1') document.body.classList.add('no-composite');
  // system title bar: the window manager draws the title and the buttons, and resizes the window
  if (Q.get('framed') === '1') { document.body.classList.add('framed'); lights = false; grip = false; }
  // one surface for the title bar and toolbar (browser windows): Seeker draws the title bar itself
  if (Q.get('unified') === '1') document.body.classList.add('unified');
  const L = $('.lights');
  if (L && lights) {
    L.append(
      el('div', { class: 'l close', title: 'Close', onclick: () => seeker.send('win:close') }, el('span', { text: '×' })),
      el('div', { class: 'l min' + (min ? '' : ' off'), title: 'Minimize', onclick: () => min && seeker.send('win:minimize') }, el('span', { text: '−' })),
      el('div', { class: 'l zoom' + (zoom ? '' : ' off'), title: 'Zoom', onclick: () => zoom && seeker.send('win:zoom') }, el('span', { text: '+' })));
  }
  window.addEventListener('focus', () => document.body.classList.remove('inactive'));
  window.addEventListener('blur', () => document.body.classList.add('inactive'));
  if (!document.hasFocus()) document.body.classList.add('inactive');
  seeker.on('window:state', (s) => { const w = $('.window'); if (w) w.classList.toggle('maximized', !!s.maximized); });
  // double-clicking the title bar fills the screen (the menu bar and Dock stay), and again puts it back
  const chrome = $('.chrome');
  if (chrome && zoom) chrome.addEventListener('dblclick', (e) => { if (!e.target.closest('button,input,.seg,.search,.lights')) seeker.send('win:zoom'); });
  if (grip) {
    const g = el('div', { class: 'grip' });
    document.body.append(g);
    g.addEventListener('pointerdown', async (e) => {
      e.preventDefault(); g.setPointerCapture(e.pointerId);
      const start = await seeker.invoke('win:bounds'); const sx = e.screenX, sy = e.screenY;
      let raf = 0, last = null;
      const move = (ev) => { last = ev; if (!raf) raf = requestAnimationFrame(() => { raf = 0; seeker.send('win:setSize', Math.max(420, start.width + last.screenX - sx), Math.max(240, start.height + last.screenY - sy)); }); };
      const up = () => { g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); };
      g.addEventListener('pointermove', move); g.addEventListener('pointerup', up);
    });
  }
}

/** Sort entries Seeker-style (natural, case-insensitive). */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
function sortEntries(list, key = 'name', asc = true, foldersFirst = false) {
  const val = (e) => key === 'name' ? (e.display || e.name) : key === 'kind' ? e.kind : key === 'size' ? (e.dir ? -1 : e.size || 0) : key === 'mtime' ? e.mtime : key === 'ctime' ? e.ctime : key === 'deleted' ? (e.trash && e.trash.deleted) || 0 : (e.display || e.name);
  const out = [...list].sort((a, b) => {
    if (!!a.last !== !!b.last) return a.last ? 1 : -1;          // the Utilities folder comes last, always
    if (foldersFirst && a.dir !== b.dir) return a.dir ? -1 : 1;
    const va = val(a), vb = val(b);
    let c = typeof va === 'string' ? collator.compare(va, vb || '') : (va || 0) - (vb || 0);
    if (c === 0) c = collator.compare(a.display || a.name, b.display || b.name);
    return asc ? c : -c;
  });
  return out;
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

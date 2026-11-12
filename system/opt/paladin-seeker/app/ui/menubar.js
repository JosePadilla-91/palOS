'use strict';
/* Seeker menu bar: shield menu, the frontmost app's menus, menu extras and tray icons. */
const composited = Q.get('composited') === '1';
if (!composited) document.body.classList.add('no-composite');

let data = { app: { name: 'Seeker', seeker: true }, shield: null, menus: [] };
let cfg = null;
let open = null;           // { key, menu, titleEl }
let tracking = false;
const left = $('#left'), right = $('#right'), shieldEl = $('#shield');

const ICON = {
  // the battery: outline, level fill (yellow at 25% and below, red at 10% and below), a bolt while charging
  battery: (pct, state) => {
    const w = Math.max(1.5, Math.round(15.4 * Math.max(0, Math.min(100, pct)) / 100 * 10) / 10);
    const lvl = pct <= 10 ? ' low' : pct <= 25 ? ' warn' : '';
    const bolt = state === 'charging' || state === 'plugged' || state === 'full';
    return `<svg viewBox="0 0 26 14" class="batt${lvl}${state === 'charging' ? ' charging' : ''}"><rect x="0.8" y="1.3" width="20.6" height="11.4" rx="3" fill="none" stroke="#111" stroke-width="1.3" opacity=".55"/><path d="M23 5v4a2 2 0 0 0 0-4z" opacity=".55"/>`
      + `<rect class="lvl" x="2.6" y="3.1" width="${bolt && state !== 'charging' ? 17 : w}" height="7.8" rx="1.6"/>`
      + (state === 'charging' ? '<path class="bolt" d="M12.9 1.2 7.6 7.7h3.5l-1.5 5.1 5.6-6.9h-3.6z"/>' : '') + '</svg>';
  },
  vol: (lvl, muted) => `<svg viewBox="0 0 20 16"><path d="M2 5.5h3.2L9.5 2v12L5.2 10.5H2z"/>${muted ? '<path d="M12.5 5.5l5 5M17.5 5.5l-5 5" stroke="#111" stroke-width="1.6" fill="none"/>' :
    (lvl > 0 ? '<path d="M12 5.3a3.6 3.6 0 0 1 0 5.4" stroke="#111" stroke-width="1.5" fill="none"/>' : '') + (lvl > .34 ? '<path d="M14.2 3.4a6.3 6.3 0 0 1 0 9.2" stroke="#111" stroke-width="1.5" fill="none"/>' : '') + (lvl > .67 ? '<path d="M16.4 1.5a9 9 0 0 1 0 13" stroke="#111" stroke-width="1.5" fill="none"/>' : '')}</svg>`,
  // Filled rays for the signal; the rays it doesn't reach are "empty": a dark, recessed channel with nothing in
  // it, like a drained pool. Not connected = every ray empty. Wi-Fi off = empty and faded.
  wifi: (bars, on) => {
    const d = (r) => `M${10 - r * .9} ${13.5 - r * .55} A${r} ${r} 0 0 1 ${10 + r * .9} ${13.5 - r * .55}`;
    const full = (r) => `<path d="${d(r)}" stroke="#111" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
    const empty = (r) => `<path d="${d(r)}" stroke="#111" stroke-opacity=".72" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
      + `<path d="${d(r)}" class="well" stroke="#c4cad1" stroke-width="1.05" fill="none" stroke-linecap="round"/>`;
    const ray = (r, lit) => (lit ? full(r) : empty(r));
    if (!on) return '<svg viewBox="0 0 20 16" class="wifi off" opacity=".5">' + empty(4) + empty(8) + empty(12) + '<circle cx="10" cy="14" r="1.6" fill="none" stroke="#111" stroke-opacity=".55" stroke-width="1"/></svg>';
    return `<svg viewBox="0 0 20 16" class="wifi${bars ? '' : ' none'}">` + ray(4, bars >= 1) + ray(8, bars >= 2) + ray(12, bars >= 3)
      + (bars ? '<circle cx="10" cy="14" r="1.6"/>' : '<circle cx="10" cy="14" r="1.6" fill="none" stroke="#111" stroke-opacity=".55" stroke-width="1"/>') + '</svg>';
  },
  wired: '<svg viewBox="0 0 20 16"><path d="M7 1h6v4h3v5h-4v5H8v-5H4V5h3z"/></svg>',
};

// ---------------- rendering ----------------
function renderMenus() {
  $$('.t.m', left).forEach((e) => e.remove());
  data.menus.forEach((m, i) => {
    const t = el('div', { class: 't m' + (m.bold ? ' bold' : ''), text: m.label || '' });
    t.dataset.key = 'm' + i;
    t.addEventListener('mousedown', (e) => { e.preventDefault(); if (open && open.key === 'm' + i) closeMenu(); else openTop('m' + i); });
    t.addEventListener('mouseenter', () => { if (open && open.key !== 'm' + i && !open.key.startsWith('x')) openTop('m' + i); });
    t.addEventListener('mouseup', () => { if (open && open.key === 'm' + i && open.dragged) closeMenu(); });
    left.append(t);
  });
  if (open && open.key.startsWith('m')) {
    const idx = +open.key.slice(1);
    const t = left.querySelector(`[data-key="${open.key}"]`);
    if (!t || !data.menus[idx]) closeMenu(); else { t.classList.add('open'); open.titleEl = t; }
  }
}

shieldEl.dataset.key = 'shield';
shieldEl.addEventListener('mousedown', (e) => { e.preventDefault(); if (open && open.key === 'shield') closeMenu(); else openTop('shield'); });
shieldEl.addEventListener('mouseenter', () => { if (open && open.key !== 'shield' && !open.key.startsWith('x')) openTop('shield'); });

function topItems(key) {
  if (key === 'shield') return data.shield ? data.shield.children : [];
  const m = data.menus[+key.slice(1)];
  return m ? (m.children || []) : [];
}
function topTitle(key) { return key === 'shield' ? shieldEl : left.querySelector(`[data-key="${key}"]`); }

function findById(list, id) {
  for (const it of list || []) { if (it.id === id) return it; const f = findById(it.children, id); if (f) return f; }
  return null;
}

async function openTop(key, items, xOverride) {
  const titleEl = typeof key === 'string' && key.startsWith('x') ? $(`[data-key="${key}"]`, right) : topTitle(key);
  if (!titleEl) return;
  closeMenu(true);
  clearHighlights();
  const r = titleEl.getBoundingClientRect();
  titleEl.classList.add('open');
  setTracking(true);
  const m = data.menus[+String(key).slice(1)];
  const list = items || topItems(key);
  if (key.startsWith('m') && m && m.direct) { titleEl.classList.remove('open'); setTracking(false); seeker.send('menubar:shape', 'bar'); seeker.send('menubar:activate', m.id); return; }
  const menu = new Menu(list.length ? list : [{ id: '_e', label: '(Empty)', enabled: false }], {
    x: xOverride != null ? xOverride : r.left, y: 22, fromBar: true, keepOnBlur: true, flipX: false,
    ignore: (e) => !!e.target.closest('#bar .t, #bar .x'),
    onActivate: (it) => activate(key, it),
    onClose: (reason) => { if (open && open.menu === menu) { closeMenu(); } },
    onOpenSub: async (it) => {
      if (!/^[dg]:/.test(it.id) || !data.menus) return null;
      const menus = await seeker.invoke('menubar:opening', it.id);
      if (menus) { data.menus = menus; const f = findById(menus, it.id); return f ? f.children : null; }
      return null;
    },
    onLayout: (rects) => { if (!composited && open && open.menu === menu) seeker.send('menubar:shape', 'rects', rects || menu.rects()); },
    onLeft: () => step(-1), onRight: () => step(1),
  });
  open = { key, menu, titleEl, mid: m && m.id };
  if (composited) seeker.send('menubar:shape', 'full'); else seeker.send('menubar:shape', 'rects', menu.rects());
  // App menus filled on demand (Qt/Chromium populate on AboutToShow).
  if (key.startsWith('m') && m && /^[dg]:/.test(m.id)) {
    const menus = await seeker.invoke('menubar:opening', m.id);
    if (menus && open && open.menu === menu) {
      data.menus = menus;
      const fresh = menus[+key.slice(1)];
      if (fresh && JSON.stringify(fresh.children) !== JSON.stringify(list)) { menu.items = fresh.children.length ? fresh.children : [{ id: '_e', label: '(Empty)', enabled: false }]; menu.render(); menu.place(r.left, 22); }
    }
  }
}

// a right-click menu from the desktop, drawn here so it's above every window
seeker.on('ctxmenu:open', (id, items, x, y) => {
  closeMenu(true);
  setTracking(true);
  let done = false;
  const finish = (itemId) => { if (done) return; done = true; seeker.send('ctxmenu:done', id, itemId); };
  const menu = new Menu(items.length ? items : [{ id: '_e', label: '(Empty)', enabled: false }], {
    x, y, keepOnBlur: true, flipX: true,
    onActivate: (it) => finish(it.id),
    // a chosen item closes the menu first and is reported right after: only other closes mean "nothing chosen"
    onClose: (reason) => { if (reason !== 'chosen') finish(null); if (open && open.menu === menu) { open.onClose = null; closeMenu(); } },
    onOpenSub: (it) => seeker.invoke('ctxmenu:sub', id, it.id),
    onLayout: (rects) => { if (!composited && open && open.menu === menu) seeker.send('menubar:shape', 'rects', rects || menu.rects()); },
  });
  open = { key: 'ctx', menu, titleEl: null, onClose: () => finish(null), ctxId: id };
  if (composited) seeker.send('menubar:shape', 'full'); else seeker.send('menubar:shape', 'rects', menu.rects());
});
seeker.on('ctxmenu:close', (id) => { if (open && open.ctxId === id) closeMenu(); });

function step(dir) {
  if (!open || open.key.startsWith('x') || open.key === 'ctx') return;
  const keys = ['shield', ...data.menus.map((_, i) => 'm' + i)];
  const i = keys.indexOf(open.key);
  openTop(keys[(i + dir + keys.length) % keys.length]);
}

/** Un-highlight every title in the bar (titles are rebuilt while menus are open, so never trust one element). */
function clearHighlights() { $$('#bar .open').forEach((e) => e.classList.remove('open')); }

function closeMenu(silent) {
  clearHighlights();
  if (open) {
    const o = open; open = null;
    if (!o.menu.closed) o.menu.close();
    if (o.key.startsWith('m')) { const m = data.menus[+o.key.slice(1)]; if (m && /^d:/.test(m.id)) seeker.send('menubar:closed', m.id); }
    if (o.onClose) o.onClose();
  }
  $$('.vol-pop').forEach((e) => e.remove());
  if (!silent) { setTracking(false); seeker.send('menubar:shape', 'bar'); }
}

function setTracking(on) { tracking = on; document.body.classList.toggle('tracking', on); }
$('#catch').addEventListener('mousedown', (e) => { e.preventDefault(); closeMenu(); });

function activate(key, it) {
  if (key.startsWith('xtray:')) { seeker.send('tray:menuActivate', key.slice(6), it.id); return; }
  if (it.id.startsWith('xw:')) return wifiAction(it);
  if (it.id.startsWith('xb:')) return batteryAction(it);
  if (it.id.startsWith('xs:go:')) return seeker.send('screens:go', +it.id.slice(6));
  if (/^xs:\d+$/.test(it.id)) return seeker.send('screens:set', +it.id.slice(3));
  if (it.id.startsWith('xc:')) { if (it.id === 'xc:settings') seeker.send('datetime:settings'); else if (it.id === 'xc:24h') seeker.invoke('config:set', { menubar: { clock24h: !cfg.menubar.clock24h } }); else if (it.id === 'xc:date') seeker.invoke('config:set', { menubar: { clockDate: !cfg.menubar.clockDate } }); return; }
  if (it.id === 'xv:settings') return seeker.send('sound:settings');
  seeker.send('menubar:activate', it.id);
}

seeker.on('menubar:menus', (d) => {
  const sameApp = d.app.name === data.app.name;
  data = d;
  renderMenus();
  // refresh an open menu in place (e.g. app updated its menu while open)
  if (open && open.key.startsWith('m') && sameApp) {
    let items = topItems(open.key);
    // Chromium rebuilds its whole menu (with new item ids) the first time one is shown: ask it to
    // fill the replacement of the open menu rather than showing it empty.
    const m = data.menus[+open.key.slice(1)];
    if (m && /^[dg]:/.test(m.id) && (m.id !== open.mid || !items.length) && open.refetch !== m.id) {
      const o = open; o.refetch = m.id; o.mid = m.id;
      seeker.invoke('menubar:opening', m.id).then((menus) => {
        if (!menus || open !== o || o.menu.child) return;
        data.menus = menus;
        const f = menus[+o.key.slice(1)];
        if (f && f.children && f.children.length) { const r = o.titleEl.getBoundingClientRect(); o.menu.items = f.children; o.menu.render(); o.menu.place(r.left, 22); }
      });
      if (!items.length) return;
    }
    if (!items.length) items = [{ id: '_e', label: '(Empty)', enabled: false }];
    if (open.menu && !open.menu.child && JSON.stringify(items) !== JSON.stringify(open.menu.items)) {
      const r = open.titleEl.getBoundingClientRect(); open.menu.items = items; open.menu.render(); open.menu.place(r.left, 22);
    }
  } else if (open && open.key === 'shield' && !open.menu.child) { open.menu.items = topItems('shield'); open.menu.render(); }
});
seeker.on('menubar:key', (k) => {
  const key = { Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight', Return: 'Enter', Enter: 'Enter', Space: ' ', Escape: 'Escape' }[k];
  if (!open) return;
  if (key === 'Escape' && !open.menu.child) { closeMenu(); return; }
  if (open.menu && !open.menu.closed && open.menu.key) {
    if (key === 'ArrowDown' && open.menu.hl < 0) { const i = open.menu.items.findIndex((x) => x.type !== 'separator' && x.enabled !== false && !x.header); if (i >= 0) open.menu.highlight(i, false); return; }
    open.menu.key({ key, preventDefault() {}, stopPropagation() {} });
  } else if (key === 'Escape') closeMenu();
});
seeker.on('menubar:close', () => { if (open && !open.key.startsWith('x')) closeMenu(); });

// ---------------- extras ----------------
let sound = null, wifi = null, battery = null, tray = [], scr = null, widgetsOpen = false;
let spotOpen = false;
seeker.on('menubar:spot', (on) => { spotOpen = on; const x = $('.x.spy', right); if (x) x.classList.toggle('open', on); });
function renderRight() {
  right.textContent = '';
  const c = cfg ? cfg.menubar : {};
  if (c.tray !== false) for (const t of tray) {
    const x = el('div', { class: 'x', title: t.tooltip || t.title });
    x.dataset.key = 'xtray:' + t.key;
    if (t.icon) x.append(el('img', { class: 'tray', src: t.icon.data || ('file://' + t.icon.file) }));
    else x.append(el('span', { text: (t.title || '?').slice(0, 2) }));
    x.addEventListener('mousedown', (e) => trayClick(e, t, x));
    x.addEventListener('wheel', (e) => seeker.send('tray:scroll', t.key, e.deltaY > 0 ? -1 : 1));
    right.append(x);
  }
  if (c.widgets !== false) {
    // the widget layer: four small tiles
    const x = el('div', { class: 'x wdg' + (widgetsOpen ? ' open' : ''), title: 'Widgets (F12)', html: '<svg viewBox="0 0 20 20"><rect x="2.5" y="2.5" width="6" height="6" rx="1.6" fill="none" stroke="#111" stroke-width="1.7"/><rect x="11.5" y="2.5" width="6" height="6" rx="1.6" fill="#111"/><rect x="2.5" y="11.5" width="6" height="6" rx="1.6" fill="#111"/><rect x="11.5" y="11.5" width="6" height="6" rx="1.6" fill="none" stroke="#111" stroke-width="1.7"/></svg>' });
    x.dataset.key = 'xwdg';
    x.addEventListener('mousedown', (e) => { e.preventDefault(); closeMenu(); seeker.send('widgets:toggle'); });
    right.append(x);
  }
  if (c.screens !== false && scr && scr.count > 1) {
    // grid of boxes, one per screen; the one you are on is shaded
    const bh = Math.max(3, Math.floor((14 - (scr.rows - 1)) / scr.rows)), bw = Math.round(bh * 1.5);
    const grid = el('div', { class: 'scr-grid', style: `grid-template-columns: repeat(${scr.cols}, ${bw}px); grid-auto-rows: ${bh}px;` });
    for (let i = 0; i < scr.count; i++) {
      const b = el('div', { class: 'scr-box' + (i === scr.index ? ' on' : '') });
      b.addEventListener('mousedown', (e) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); seeker.send('screens:go', i); });
      grid.append(b);
    }
    const x = el('div', { class: 'x scr', title: `Screen ${scr.index + 1} of ${scr.count} (right-click to change how many)` }, grid);
    x.dataset.key = 'xscr';
    x.addEventListener('mousedown', (e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); openScreens(x); } });
    x.addEventListener('contextmenu', (e) => e.preventDefault());
    x.addEventListener('wheel', (e) => seeker.send('screens:go', (scr.index + (e.deltaY > 0 ? 1 : -1) + scr.count) % scr.count));
    right.append(x);
  } else if (c.screens !== false && scr) {
    const x = el('div', { class: 'x scr', title: 'One screen (right-click to add more)' }, el('div', { class: 'scr-grid', style: 'grid-template-columns: 12px; grid-auto-rows: 9px;' }, el('div', { class: 'scr-box on' })));
    x.dataset.key = 'xscr';
    x.addEventListener('mousedown', (e) => { if (e.button === 0 || e.button === 2) { e.preventDefault(); e.stopPropagation(); openScreens(x); } });
    x.addEventListener('contextmenu', (e) => e.preventDefault());
    right.append(x);
  }
  if (c.battery !== false && battery && battery.present) {
    const x = el('div', { class: 'x batt-x', title: batteryTitle(battery) });
    if (c.batteryPercent !== false) x.append(el('span', { class: 'batt-pct', text: `${battery.percent}%` }));
    x.insertAdjacentHTML('beforeend', ICON.battery(battery.percent, battery.state));
    x.dataset.key = 'xbatt';
    x.addEventListener('mousedown', (e) => { e.preventDefault(); if (open && open.key === 'xbatt') closeMenu(); else openBattery(x); });
    right.append(x);
  }
  if (c.wifi !== false && wifi && (wifi.hardware || wifi.wired)) {
    const bars = wifi.signal > 66 ? 3 : wifi.signal > 33 ? 2 : wifi.signal > 0 ? 1 : 0;
    const x = el('div', { class: 'x', html: wifi.hardware ? ICON.wifi(wifi.current ? bars : 0, wifi.on) : ICON.wired, title: wifi.current || '' });
    x.dataset.key = 'xwifi';
    x.addEventListener('mousedown', (e) => { e.preventDefault(); if (open && open.key === 'xwifi') closeMenu(); else openWifi(x); });
    right.append(x);
  }
  if (c.volume !== false && sound) {
    const x = el('div', { class: 'x', html: ICON.vol(sound.volume, sound.muted) });
    x.dataset.key = 'xvol';
    x.addEventListener('mousedown', (e) => { e.preventDefault(); if (open && open.key === 'xvol') closeMenu(); else openVolume(x); });
    x.addEventListener('wheel', async (e) => { sound = await seeker.invoke('sound:set', Math.max(0, Math.min(1, sound.volume + (e.deltaY < 0 ? .05 : -.05)))); renderRight(); });
    right.append(x);
  }
  if (c.clock !== false) {
    const x = el('div', { class: 'x' }, el('span', { class: 'clock', text: clockText() }));
    x.dataset.key = 'xclock';
    x.addEventListener('mousedown', (e) => { e.preventDefault(); if (open && open.key === 'xclock') closeMenu(); else openClock(x); });
    right.append(x);
  }
  if (c.spyglass !== false) {
    const x = el('div', { class: 'x spy' + (spotOpen ? ' open' : ''), title: 'Search (Super+Space)', html: '<svg viewBox="0 0 20 20"><circle cx="8" cy="8" r="5.6" fill="none" stroke="#111" stroke-width="2"/><path d="M12.3 12.3l5.2 5.2" stroke="#111" stroke-width="2.6" stroke-linecap="round"/></svg>' });
    x.dataset.key = 'xspy';
    x.addEventListener('mousedown', (e) => { e.preventDefault(); closeMenu(); seeker.send('spot:toggle'); });
    right.append(x);
  }
  right.append(el('div', { style: { width: '6px' } }));
  if (open && open.key.startsWith('x')) { const k = $(`[data-key="${CSS.escape(open.key)}"]`, right); if (k) { k.classList.add('open'); open.titleEl = k; } }
}

function clockText() {
  const d = new Date(); const c = cfg ? cfg.menubar : {};
  let s = '';
  if (c.clockDay !== false) s += (FR_UI ? ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])[d.getDay()] + ' ';
  if (c.clockDate) s += FR_UI ? `${d.getDate()} ${MONTHS[d.getMonth()]} ` : `${MONTHS[d.getMonth()]} ${d.getDate()} `;
  let t = timeStr(d, c.clock24h);
  if (c.clockSeconds) t = t.replace(/(\d+:\d+)/, `$1:${String(d.getSeconds()).padStart(2, '0')}`);
  return s + t;
}
setInterval(() => { const c = $('.clock', right); if (c) c.textContent = clockText(); }, 1000);

function openClock(x) {
  const d = new Date(); const c = cfg.menubar;
  openTop('xclock', [
    { id: 'xc:none', label: longDate(d.getTime()).replace(/ \d+( h |:)\d+.*$/, ''), enabled: false },
    { type: 'separator' },
    { id: 'xc:24h', label: 'Use a 24-Hour Clock', toggle: 'check', checked: !!c.clock24h },
    { id: 'xc:date', label: 'Show the Date', toggle: 'check', checked: !!c.clockDate },
    { type: 'separator' },
    { id: 'xc:settings', label: 'Open Date & Time…' },
  ], x.getBoundingClientRect().left);
}

function openVolume(x) {
  closeMenu(true);
  setTracking(true);
  x.classList.add('open');
  const r = x.getBoundingClientRect();
  const pop = el('div', { class: 'vol-pop', html: ICON.vol(1, false) });
  const track = el('div', { class: 'track' }, el('div', { class: 'fill' }), el('div', { class: 'knob' }));
  pop.append(track, el('div', { html: ICON.vol(0, false) }));
  document.body.append(pop);
  pop.style.left = Math.min(innerWidth - 40, Math.round(r.left + r.width / 2 - 19)) + 'px'; pop.style.top = '22px';
  const show = () => { const v = sound ? (sound.muted ? 0 : sound.volume) : 0; $('.fill', track).style.height = `${v * 100}%`; $('.knob', track).style.bottom = `${v * 100}%`; };
  show();
  const setFrom = async (ev) => {
    const tr = track.getBoundingClientRect(); const v = Math.max(0, Math.min(1, (tr.bottom - ev.clientY) / tr.height));
    sound = { ...sound, volume: v, muted: false }; show();
    clearTimeout(setFrom.t); setFrom.t = setTimeout(async () => { sound = await seeker.invoke('sound:set', v) || sound; renderRight(); }, 30);
  };
  track.addEventListener('pointerdown', (e) => { track.setPointerCapture(e.pointerId); setFrom(e); track.onpointermove = setFrom; });
  track.addEventListener('pointerup', () => { track.onpointermove = null; });
  const fake = { closed: false, close() { this.closed = true; pop.remove(); }, rects: () => [{ x: pop.offsetLeft - 8, y: 22, width: 54, height: 170 }], child: null };
  open = { key: 'xvol', menu: fake, titleEl: x };
  if (composited) seeker.send('menubar:shape', 'full'); else seeker.send('menubar:shape', 'rects', fake.rects());
}

async function openScreens(x) {
  if (open && open.key === 'xscr') return closeMenu();
  const r = x.getBoundingClientRect();
  const counts = (await seeker.invoke('screens:layouts')) || [1, 2, 4, 6, 9, 12, 16];
  const cur = scr ? scr.count : 1;
  const items = [{ id: 'xs:none', label: 'Number of Screens', enabled: false }, { type: 'separator' },
    ...counts.map((n) => ({ id: 'xs:' + n, label: n === 1 ? '1 Screen' : `${n} Screens`, toggle: 'radio', checked: n === cur }))];
  if (cur > 1) items.push({ type: 'separator' }, ...Array.from({ length: cur }, (_, i) => ({ id: 'xs:go:' + i, label: `Go to Screen ${i + 1}`, toggle: 'check', checked: scr && i === scr.index })));
  await openTop('xscr', items, Math.max(0, Math.min(r.left, innerWidth - 190)));
}

async function openWifi(x) {
  const r = x.getBoundingClientRect();
  const st = wifi || {};
  const head = st.hardware ? [
    { id: 'xw:none', label: `Wi-Fi: ${st.on ? (st.current ? 'On' : 'Looking for Networks…') : 'Off'}`, enabled: false },
    { id: st.on ? 'xw:off' : 'xw:on', label: st.on ? 'Turn Wi-Fi Off' : 'Turn Wi-Fi On' },
  ] : [{ id: 'xw:none', label: 'Ethernet: Connected', enabled: false }];
  const tail = [{ type: 'separator' }, ...(st.current ? [{ id: 'xw:disconnect', label: 'Disconnect' }] : []), { id: 'xw:settings', label: 'Network Settings…' }];
  await openTop('xwifi', [...head, ...(st.on ? [{ type: 'separator' }, { id: 'xw:none', label: 'Scanning…', enabled: false }] : []), ...tail], r.left);
  if (!st.on || !open || open.key !== 'xwifi') return;
  const nets = await seeker.invoke('wifi:networks', true);
  if (!open || open.key !== 'xwifi') return;
  const rows = (nets || []).slice(0, 14).map((n) => ({ id: 'xw:net:' + n.ssid, label: `${n.ssid}${n.secure ? '  🔒' : ''}`, toggle: 'check', checked: n.active, ssid: n.ssid, secure: n.secure, known: n.known }));
  open.menu.items = [...head, { type: 'separator' }, ...(rows.length ? rows : [{ id: 'xw:none', label: 'No networks found', enabled: false }]), ...tail];
  open.menu.render(); open.menu.place(r.left, 22);
}

async function wifiAction(it) {
  if (it.id === 'xw:on' || it.id === 'xw:off') { wifi = await seeker.invoke('wifi:power', it.id === 'xw:on'); renderRight(); return; }
  if (it.id === 'xw:settings') return seeker.send('wifi:settings');
  if (it.id === 'xw:disconnect') { wifi = await seeker.invoke('wifi:disconnect'); renderRight(); return; }
  if (it.id.startsWith('xw:net:')) {
    if (it.checked) return;
    // A secure network palOS hasn't joined before: ask for the password first (Paladin's own prompt), then join.
    // A saved one: just join; if NetworkManager needs the password again, it asks Paladin's agent (one prompt).
    let r, typed = false;
    if (it.secure && !it.known) {
      const pw = await seeker.invoke('wifi:prompt', it.ssid);
      if (pw == null) return;
      r = await seeker.invoke('wifi:connect', it.ssid, pw); typed = true;
    } else {
      r = await seeker.invoke('wifi:connect', it.ssid, null);
      if (!r.ok && r.needsPassword && !(await seeker.invoke('wifi:agent'))) {
        const pw = await seeker.invoke('wifi:prompt', it.ssid);
        if (pw == null) return;
        r = await seeker.invoke('wifi:connect', it.ssid, pw); typed = true;
      }
    }
    // a password typed here didn't work: ask again (still only Paladin's prompt)
    for (let tries = 0; typed && !r.ok && r.needsPassword && tries < 2; tries++) {
      const pw = await seeker.invoke('wifi:prompt', it.ssid);
      if (pw == null) break;
      r = await seeker.invoke('wifi:connect', it.ssid, pw);
    }
    wifi = await seeker.invoke('wifi:status'); renderRight();
  }
}

async function trayClick(e, t, x) {
  e.preventDefault();
  if (open && open.key === 'xtray:' + t.key) { closeMenu(); return; }
  const r = x.getBoundingClientRect();
  if (e.button === 0 && !t.itemIsMenu) {
    const ok = await seeker.invoke('tray:activate', t.key, Math.round(r.left + screenX), Math.round(r.bottom + screenY), false);
    if (ok) return;
  }
  if (e.button === 1) { seeker.invoke('tray:activate', t.key, r.left, r.bottom, true); return; }
  const tree = await seeker.invoke('tray:menu', t.key);
  if (tree && tree.children && tree.children.length) openTop('xtray:' + t.key, tree.children, r.left);
  else if (e.button === 2 || t.itemIsMenu) seeker.invoke('tray:context', t.key, Math.round(r.left + screenX), Math.round(r.bottom + screenY));
}

function hm(min) { const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; }
function batteryTitle(b) {
  if (b.state === 'charging') return b.minutes != null ? `Charging: ${hm(b.minutes)} until full` : 'Charging';
  if (b.state === 'full') return 'Fully charged';
  if (b.state === 'plugged') return 'Plugged in, not charging';
  return b.minutes != null ? `About ${hm(b.minutes)} left` : `${b.percent}% battery left`;
}
const PROFILE_NAMES = { 'power-saver': 'Power Saver', balanced: 'Balanced', performance: 'Performance' };
async function openBattery(x) {
  const b = battery || {};
  const head = [
    { id: 'xb:none', label: `Battery: ${b.percent}%`, enabled: false },
    { id: 'xb:none', label: batteryTitle(b), enabled: false },
    { type: 'separator' },
    { id: 'xb:pct', label: 'Show Percentage', toggle: 'check', checked: cfg.menubar.batteryPercent !== false },
  ];
  const tail = [{ type: 'separator' }, { id: 'xb:settings', label: 'Battery Settings…' }];
  await openTop('xbatt', [...head, ...tail], x.getBoundingClientRect().left);
  const p = await seeker.invoke('battery:profile').catch(() => null);
  if (!p || !open || open.key !== 'xbatt') return;
  const modes = p.profiles.map((id) => ({ id: 'xb:mode:' + id, label: PROFILE_NAMES[id] || id, toggle: 'radio', checked: p.current === id }));
  open.menu.items = [...head, { type: 'separator' }, { id: 'xb:none', label: 'Power Mode', enabled: false }, ...modes, ...tail];
  open.menu.render(); open.menu.place(x.getBoundingClientRect().left, 22);
}
function batteryAction(it) {
  if (it.id === 'xb:pct') return seeker.invoke('config:set', { menubar: { batteryPercent: cfg.menubar.batteryPercent === false } });
  if (it.id === 'xb:settings') return seeker.send('battery:settings');
  if (it.id.startsWith('xb:mode:')) return seeker.invoke('battery:setProfile', it.id.slice(8));
}
async function pollBattery() { try { battery = await seeker.invoke('battery:get'); } catch { battery = null; } renderRight(); }
seeker.on('battery:changed', (b) => { battery = b; if (!open || open.key !== 'xbatt') renderRight(); });

async function pollSound() { try { sound = await seeker.invoke('sound:get'); } catch { sound = null; } renderRight(); }
async function pollWifi() { try { wifi = await seeker.invoke('wifi:status'); } catch { wifi = null; } renderRight(); }
seeker.on('wifi:changed', (w) => { wifi = w; if (!open || open.key !== 'xwifi') renderRight(); });
seeker.on('tray:changed', (list) => { tray = list || []; renderRight(); });
seeker.on('screens:changed', (s) => { scr = s; renderRight(); });
seeker.on('widgets:state', (on) => { widgetsOpen = on; const x = document.querySelector('.x.wdg'); if (x) x.classList.toggle('open', on); });
seeker.on('config:changed', (c) => { cfg = c; renderRight(); });
seeker.on('compositor', (on) => document.body.classList.toggle('no-composite', !on));

(async () => {
  cfg = await seeker.invoke('config:get');
  tray = await seeker.invoke('tray:list') || [];
  renderRight();
  pollSound(); pollWifi(); pollBattery();
  try { scr = await seeker.invoke('screens:get'); renderRight(); } catch {}
  setInterval(() => { if (!open) pollSound(); }, 4000);
  setInterval(() => { if (!open) pollWifi(); }, 10000);
  seeker.invoke('menubar:refresh');
})();

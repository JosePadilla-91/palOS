'use strict';
const $ = (s) => document.querySelector(s);
const board = $('#board'), rings = $('#rings'), tray = $('#cards');
let data = { items: [], events: {} }, instances = new Map(), z = 10, saveT = 0, visible = false, hideT = 0;

// ---------- saving
const saveNow = () => { clearTimeout(saveT); saveT = 0; return seeker.invoke('widgets:save', { items: data.items, events: data.events }); };
const save = () => { clearTimeout(saveT); saveT = setTimeout(saveNow, 350); };
addEventListener('beforeunload', () => { if (saveT) saveNow(); });

// ---------- a widget on the board
function makeApi(item, frame, extra = {}) {
  return { save, saveEvents: save, events: data.events, invoke: (c, ...a) => seeker.invoke(c, ...a), frame, onFrame() {}, openSettings: () => openSettings(item), ...extra };
}
function build(item, { preview = false } = {}) {
  const type = WIDGET_TYPES[item.type]; if (!type) return null;
  item.settings = { ...type.settings, ...(item.settings || {}) }; item.data = { ...structuredClone(type.data), ...(item.data || {}) };
  const frame = document.createElement('div'); frame.className = 'w ' + (type.cls || ''); frame.style.width = type.w + 'px'; frame.style.height = type.h + 'px';
  const inst = type.create(item, makeApi(item, frame));
  frame.append(inst.root);
  if (!preview) {
    const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = 'Remove'; x.onmousedown = (e) => e.stopPropagation(); x.onclick = () => removeItem(item);
    frame.append(x);
    if (type.gear !== false && inst.settings) { const g = document.createElement('button'); g.className = 'gear'; g.textContent = '⚙'; g.title = 'Settings'; g.onmousedown = (e) => e.stopPropagation(); g.onclick = () => openSettings(item); frame.append(g); }
    enableDrag(frame, item);
  }
  inst.frame = frame; inst.type = type;
  if (inst.tick) inst.tick(new Date());
  return { frame, inst };
}
function place(item, rec) { rec.frame.style.left = item.x + 'px'; rec.frame.style.top = item.y + 'px'; }

function enableDrag(frame, item) {
  frame.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('button, input, textarea, select, .settings, [contenteditable], .nodrag')) return;
    frame.style.zIndex = ++z; const sx = e.clientX, sy = e.clientY, ox = item.x, oy = item.y; let moved = false;
    const move = (m) => {
      if (!moved && Math.hypot(m.clientX - sx, m.clientY - sy) < 4) return; moved = true; frame.classList.add('dragging');
      item.x = Math.max(0, Math.min(innerWidth - frame.offsetWidth, ox + m.clientX - sx)); item.y = Math.max(0, Math.min(innerHeight - frame.offsetHeight, oy + m.clientY - sy)); place(item, { frame });
    };
    const up = () => { removeEventListener('mousemove', move, true); removeEventListener('mouseup', up, true); frame.classList.remove('dragging'); if (moved) save(); };
    addEventListener('mousemove', move, true); addEventListener('mouseup', up, true);
  });
}

function openSettings(item) {
  const rec = instances.get(item.id); if (!rec || !rec.inst.settings || rec.frame.querySelector('.settings')) return;
  const panel = document.createElement('div'); panel.className = 'settings'; panel.onmousedown = (e) => e.stopPropagation();
  rec.frame.append(panel);
  rec.inst.settings(panel, (changed) => { panel.remove(); if (changed) save(); });
}

function removeItem(item) {
  const rec = instances.get(item.id); if (!rec) return;
  rec.frame.classList.add('gone'); data.items = data.items.filter((i) => i !== item); instances.delete(item.id); save();
  setTimeout(() => rec.frame.remove(), 260);
}

// ---------- ripples: a widget dropped on the layer is like something set down on water: soft waves spread out
// from its edges, in its own shape (a rounded rectangle stays one), their corners rounding off as they travel
function ripple(x, y, w, h, radius) {
  const waves = [{ delay: 0, reach: 150, alpha: .42 }, { delay: .2, reach: 230, alpha: .28 }, { delay: .42, reach: 310, alpha: .16 }];
  for (const v of waves) {
    const r = document.createElement('div'); r.className = 'wave';
    for (const [k, val] of Object.entries({ x, y, w, h })) r.style.setProperty('--' + k, val + 'px');
    r.style.setProperty('--reach', v.reach + 'px'); r.style.setProperty('--radius', radius + 'px'); r.style.setProperty('--alpha', String(v.alpha));
    r.style.animationDelay = v.delay + 's';
    rings.append(r); setTimeout(() => r.remove(), (2.1 + v.delay) * 1000);
  }
}

// ---------- adding
function freeSpot(type) {
  const taken = data.items.map((i) => { const t = WIDGET_TYPES[i.type]; return { x: i.x, y: i.y, w: t.w, h: t.h }; });
  const fits = (x, y) => x >= 24 && y >= 24 && x + type.w <= innerWidth - 24 && y + type.h <= innerHeight - 24 && !taken.some((t) => x < t.x + t.w + 16 && x + type.w + 16 > t.x && y < t.y + t.h + 16 && y + type.h + 16 > t.y);
  const cx = (innerWidth - type.w) / 2, cy = (innerHeight - type.h) / 2 - 40;
  for (let r = 0; r < Math.max(innerWidth, innerHeight); r += 40) for (let a = 0; a < 360; a += 20) { const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r * 1.4), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r); if (fits(x, y)) return { x, y }; }
  return { x: Math.round(cx + (Math.random() - .5) * 120), y: Math.round(cy + (Math.random() - .5) * 120) };
}
function addWidget(typeId) {
  const type = WIDGET_TYPES[typeId]; const spot = freeSpot(type);
  const item = { id: Math.random().toString(36).slice(2, 10), type: typeId, x: spot.x, y: spot.y, settings: {}, data: {} };
  data.items.push(item); const rec = build(item); instances.set(item.id, rec); place(item, rec); rec.frame.style.zIndex = ++z;
  rec.frame.classList.add('drop'); board.append(rec.frame); setTimeout(() => rec.frame.classList.remove('drop'), 800);
  const radius = parseFloat(getComputedStyle(rec.frame).borderTopLeftRadius) || 22;
  setTimeout(() => ripple(item.x, item.y, type.w, type.h, radius), 330);   // the ripple starts as it lands
  setTrayOpen(false); save();
  if (typeId === 'weather') setTimeout(() => openSettings(item), 900);
}

// ---------- the tray of widgets you can add
function buildTray() {
  tray.textContent = '';
  for (const [id, type] of Object.entries(WIDGET_TYPES)) {
    const rec = build({ id: 'pv-' + id, type: id, x: 0, y: 0, settings: id === 'weather' ? {} : {}, data: id === 'weather' ? { demo: true } : {} }, { preview: true });
    const scale = Math.min(1, 118 / Math.max(type.w, type.h)); rec.frame.style.transform = `translate(-50%,-50%) scale(${scale})`;
    const pv = document.createElement('div'); pv.className = 'pv'; pv.append(rec.frame);
    const card = document.createElement('div'); card.className = 'card'; card.onclick = (e) => { e.stopPropagation(); addWidget(id); };
    const label = document.createElement('span'); label.textContent = type.name; card.append(pv, label); tray.append(card);
    if (rec.inst.tick) rec.inst.tick(new Date());
  }
}
const setTrayOpen = (on) => document.body.classList.toggle('tray', on);
$('#plus').onclick = (e) => { e.stopPropagation(); setTrayOpen(!document.body.classList.contains('tray')); };

// ---------- show and hide: the screen recedes, the layer comes up
function show(info) {
  clearTimeout(hideT);
  const shot = $('#shot');
  shot.style.backgroundImage = info.shot ? `url(${info.shot})` : '';
  shot.style.backgroundSize = `${info.width}px ${info.height}px`; shot.style.backgroundPosition = `0 -${info.barHeight}px`;
  if (!info.shot) shot.style.background = 'transparent';
  setTrayOpen(false); document.body.classList.remove('in'); void document.body.offsetWidth;
  visible = true; requestAnimationFrame(() => document.body.classList.add('in'));
}
function hide() {
  setTrayOpen(false); document.body.classList.remove('in'); visible = false;
  hideT = setTimeout(() => seeker.send('widgets:hidden'), 420);
}
seeker.on('widgets:show', show); seeker.on('widgets:hide', hide);
board.addEventListener('mousedown', (e) => { if (e.target === board) { if (document.body.classList.contains('tray')) setTrayOpen(false); else if (visible) hide(); } });
$('#layer').addEventListener('mousedown', (e) => { if (e.target === $('#layer') || e.target === rings) { if (document.body.classList.contains('tray')) setTrayOpen(false); else if (visible) hide(); } });
addEventListener('mousedown', (e) => { if (document.body.classList.contains('tray') && !e.target.closest('#tray, #plus')) setTrayOpen(false); }, true);
addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); if (document.body.classList.contains('tray')) setTrayOpen(false); else if (visible) hide(); } });

// ---------- clocks and timers keep going
setInterval(() => { if (!visible) return; const now = new Date(); for (const rec of instances.values()) if (rec.inst.tick) rec.inst.tick(now); }, 250);

// ---------- start
(async () => {
  data = await seeker.invoke('widgets:load');
  for (const item of data.items) { const rec = build(item); if (!rec) continue; instances.set(item.id, rec); place(item, rec); board.append(rec.frame); }
  buildTray();
  // events object is shared with calendar widgets: keep it the same object
})();

'use strict';
/* The desktop: wallpaper, ~/Desktop files and mounted drives. */
const PRIMARY = Q.get('primary') === '1';
const TOP = +(Q.get('top') || 0);
let cfg, env, items = [], selected = new Set(), cutSet = new Set(), dragPaths = null, dragStart = null;
const iconsEl = $('#icons'), wall = $('#wall'), marquee = $('#marquee');

// ---------------- wallpaper ----------------
function applyWallpaper() {
  wall.className = ''; wall.removeAttribute('style');
  wall.style.backgroundColor = cfg.wallpaperColor || '#2b4f7e';
  if (!cfg.wallpaper && cfg.wallpaperMode === 'color') return;
  // no picture chosen: palOS's default picture (palOS Pupper), or the built-in gradient if it's missing
  const pic = cfg.wallpaper || cfg.defaultWallpaper;
  if (!pic) { wall.className = 'default'; return; }
  const m = cfg.wallpaper ? (cfg.wallpaperMode || 'fill') : 'fill';
  wall.style.backgroundImage = `url("${fileURL(pic)}"), linear-gradient(160deg,#0b1440,#241a6b 45%,#4a1f78 70%,#0d0f2e)`;
  wall.style.backgroundPosition = 'center';
  wall.style.backgroundRepeat = m === 'tile' ? 'repeat' : 'no-repeat';
  wall.style.backgroundSize = { fill: 'cover', fit: 'contain', stretch: '100% 100%', center: 'auto', tile: 'auto' }[m] || 'cover';
}

// ---------------- items ----------------
function cell() { const s = cfg.desktop.iconSize; return { w: Math.max(cfg.desktop.gridSpacing || 100, s + 30), h: s + 46 }; }
const keyOf = (e) => (e.volume ? 'vol:' + e.volume.target : e.name);

async function load() {
  if (!PRIMARY) { iconsEl.textContent = ''; return; }
  const out = [];
  const vols = await seeker.invoke('vol:list');
  for (const v of vols || []) {
    // the desktop: the drives inside the computer and .package disk images; disks plugged in (USB, FireWire,
    // Thunderbolt), network shares and discs show in the Dock instead
    if (v.pack) { /* always: an app's installer disk */ }
    else if (v.removable || v.network || v.optical) continue;
    else if (!cfg.desktop.showHardDisks) continue;
    out.push({ name: v.target, display: v.name, path: v.target, dir: true, icon: v.icon, volume: v, kind: 'Volume', mime: 'inode/directory' });
  }
  if (cfg.desktop.showDesktopFiles) {
    const r = await seeker.invoke('fs:list', env.dirs.DESKTOP, { hidden: false });
    for (const e of (r.entries || [])) out.push(e);
  }
  items = out;
  for (const k of [...selected]) if (!items.find((e) => e.path === k)) selected.delete(k);
  render();
}

// ---------------- grid ----------------
// Every icon sits in a grid cell. Positions are stored as {x, y} (x measured from the right edge,
// like the classic desktop) but always on a cell, so icons never overlap or drift.
function rowsFit(c) { return Math.max(1, Math.floor((innerHeight - TOP - 10) / c.h)); }
function colsFit(c) { return Math.max(1, Math.floor((innerWidth - 12) / c.w)); }
function cellAt(p, c) {
  const col = Math.max(0, Math.min(colsFit(c) - 1, Math.round((p.x - 12) / c.w)));
  const row = Math.max(0, Math.min(rowsFit(c) - 1, Math.round((p.y - TOP - 10) / c.h)));
  return { col, row };
}
function cellPos(col, row, c) { return { x: 12 + col * c.w, y: TOP + 10 + row * c.h }; }
const cellKey = (q) => q.col + ':' + q.row;
/** Nearest free cell to `want` (spiral by distance), or the first free one in column order. */
function freeCell(used, c, want) {
  const rows = rowsFit(c), cols = colsFit(c) + 40;
  if (want) {
    let best = null, bd = Infinity;
    for (let col = 0; col < cols; col++) for (let row = 0; row < rows; row++) {
      if (used.has(col + ':' + row)) continue;
      const d = Math.hypot(col - want.col, (row - want.row) * 0.9);
      if (d < bd) { bd = d; best = { col, row }; }
    }
    if (best) return best;
  }
  for (let col = 0; col < cols; col++) for (let row = 0; row < rows; row++) if (!used.has(col + ':' + row)) return { col, row };
  return { col: 0, row: 0 };
}
function autoPlace(taken, c) {          // kept for Arrange By: next free cell in column order
  const used = new Set(taken.map((t) => cellKey(cellAt(t, c))));
  const q = freeCell(used, c); return cellPos(q.col, q.row, c);
}

function render() {
  const c = cell(); const pos = cfg.desktop.positions || {};
  const s = cfg.desktop.iconSize;
  iconsEl.textContent = '';
  const taken = [];
  const placed = [];
  // Volumes first (top right), then files in name order (or saved positions).
  const ordered = [...items.filter((e) => e.volume), ...sortEntries(items.filter((e) => !e.volume), 'name')];
  const used = new Set(); const fixed = {}; let changed = false;
  for (const e of ordered) {
    const p = pos[keyOf(e)]; if (!p) continue;
    let q = cellAt(p, c);
    if (used.has(cellKey(q))) q = freeCell(used, c, q);
    used.add(cellKey(q));
    const np = cellPos(q.col, q.row, c); placed.push([e, np]); taken.push(np); fixed[keyOf(e)] = np;
    if (np.x !== p.x || np.y !== p.y) changed = true;
  }
  for (const e of ordered) {
    if (pos[keyOf(e)]) continue;
    const q = freeCell(used, c); used.add(cellKey(q));
    const np = cellPos(q.col, q.row, c); placed.push([e, np]); taken.push(np); fixed[keyOf(e)] = np; changed = true;
  }
  // Remember where everything is, so a new icon never reshuffles the others.
  if (PRIMARY && changed && items.length) savePositions(fixed);
  for (const [e, p] of placed) {
    e._pos = p;
    const imgBox = el('div', { class: 'img' });
    const im = iconImg(e.icon, s);
    if (e.thumb) {
      const t = el('img', { class: 'thumb' + (e.alpha || e.program ? ' alpha' : ''), draggable: 'false' });
      t.onload = () => { const k = Math.min(s / t.naturalWidth, s / t.naturalHeight, 1); t.width = Math.round(t.naturalWidth * k) - 4; t.height = Math.round(t.naturalHeight * k) - 4; im.replaceWith(t); };
      t.src = thumbURL(e.path, s * 2, e.mtime);
    }
    imgBox.style.width = imgBox.style.height = (s + 8) + 'px';
    imgBox.append(im);
    const d = el('div', { class: 'di' + (selected.has(e.path) ? ' sel' : '') + (cutSet.has(e.path) ? ' cut' : '') }, imgBox, el('div', { class: 'lbl', text: e.display || e.name }));
    d.style.width = c.w + 'px';
    d.style.left = (innerWidth - p.x - c.w) + 'px'; d.style.top = p.y + 'px';
    d._entry = e;
    wire(d, e);
    iconsEl.append(d);
  }
  reportState();
}

let saveT = null;
function savePositions(fixed) {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const keep = {};       // keep remembered spots of items that are only hidden for now (e.g. unplugged drives)
    for (const [k, v] of Object.entries(cfg.desktop.positions || {})) if (!items.some((e) => keyOf(e) === k) && k.startsWith('vol:')) keep[k] = v;
    const pos = { ...keep, ...fixed };
    cfg.desktop.positions = pos;
    seeker.invoke('config:replace', 'desktop', { ...cfg.desktop, positions: pos });
  }, 300);
}

function reportState() {
  const sel = selectedEntries();
  seeker.send('desktop:state', { selection: sel.length, canWrite: true, volumeSelected: sel.length === 1 && sel[0].volume && sel[0].volume.target !== '/' ? sel[0].volume.target : null, canDelete: sel.every((e) => !e.volume), archivesSelected: sel.length > 0 && sel.every((e) => !e.dir && !e.volume && /\.(zip|zipx|jar|apk|cbz|cbr|7z|rar|tar|tgz|tbz2?|txz|tzst|iso|cab|cpio|xar|lha|lzh|arj|gz|bz2|xz|zst|lzma|lz4|lz)$/i.test(e.name || '')) });
}
function selectedEntries() { return items.filter((e) => selected.has(e.path)); }
function setSelection(paths) { selected = new Set(paths); $$('.di', iconsEl).forEach((d) => d.classList.toggle('sel', selected.has(d._entry.path))); reportState(); }

// ---------------- live icon drag ----------------
// Dragging moves the real icons: they follow the pointer at full size, the spot they leave stays faint, and
// an outline shows the cell they will land in. A folder, drive or Trash under the pointer lights up.
// When the pointer reaches another window or the Dock, the drag is handed to the system so the files can
// be dropped there (that part of the drag is drawn by the system).
let pendingDrag = null, live = null;

function moveTargets(dx, dy) {
  const c = cell();
  const moving = items.filter((x) => live.paths.includes(x.path));
  const pos = {};
  for (const e of items) if (e._pos && !moving.includes(e)) pos[keyOf(e)] = e._pos;
  const used = new Set(Object.values(pos).map((p) => cellKey(cellAt(p, c))));
  const out = [];
  for (const e of moving) {
    const p = e._pos || { x: 12, y: TOP + 10 };
    let q = cellAt({ x: p.x - dx, y: p.y + dy }, c);
    if (used.has(cellKey(q))) q = freeCell(used, c, q);
    used.add(cellKey(q)); const np = cellPos(q.col, q.row, c);
    pos[keyOf(e)] = np; out.push([e, np]);
  }
  return { pos, out };
}

async function startLive(ev) {
  const sel = selectedEntries().filter((e) => !e.volume || true);
  if (!sel.length || !PRIMARY) { pendingDrag = null; return; }
  live = { paths: sel.map((x) => x.path), clones: [], hints: [], x0: pendingDrag.x, y0: pendingDrag.y, entry: pendingDrag.entry, rects: [], over: null };
  pendingDrag = null;
  document.body.classList.add('live-drag');
  for (const d of $$('.di', iconsEl)) {
    if (!live.paths.includes(d._entry.path)) continue;
    const r = d.getBoundingClientRect();
    const k = d.cloneNode(true);
    k.classList.add('live'); k.classList.remove('sel'); k.style.left = r.left + 'px'; k.style.top = r.top + 'px';
    k._ox = r.left; k._oy = r.top;
    document.body.append(k); live.clones.push(k);
    d.classList.add('lifted');
    const h = el('div', { class: 'cell-hint' }); h.style.width = r.width + 'px'; h.style.height = r.height + 'px'; h.style.display = 'none';
    document.body.append(h); live.hints.push([d._entry, h]);
  }
  try { live.rects = await seeker.invoke('drag:rects') || []; } catch { live.rects = []; }
}

function endLive() {
  if (!live) return;
  for (const k of live.clones) k.remove();
  for (const [, h] of live.hints) h.remove();
  for (const d of $$('.di.lifted', iconsEl)) d.classList.remove('lifted');
  for (const d of $$('.di.drop', iconsEl)) d.classList.remove('drop');
  document.body.classList.remove('live-drag');
  live = null;
}

function liveHandOff() {
  const paths = live.paths, entry = live.entry, x0 = live.x0, y0 = live.y0;
  endLive();
  dragPaths = paths; dragStart = { x: x0, y: y0, at: Date.now() };
  Actions.startDrag(paths, entry.icon);
}

function overForeign(sx, sy) {
  for (const r of live.rects) if (sx >= r.x && sx < r.x + r.w && sy >= r.y && sy < r.y + r.h) return true;
  return false;
}

document.addEventListener('mousemove', (ev) => {
  if (pendingDrag && (ev.buttons & 1)) {
    if (Math.hypot(ev.clientX - pendingDrag.x, ev.clientY - pendingDrag.y) > 5) { clearTimeout(renameTimer); startLive(ev); }
    return;
  }
  if (!live) return;
  if (!(ev.buttons & 1)) { endLive(); return; }
  const dx = ev.clientX - live.x0, dy = ev.clientY - live.y0;
  for (const k of live.clones) k.style.transform = `translate(${dx}px, ${dy}px)`;
  // leaving this screen, or reaching another window or the Dock: let the system carry the drag
  const outside = ev.clientX < 0 || ev.clientY < 0 || ev.clientX >= innerWidth || ev.clientY >= innerHeight;
  if (outside || overForeign(screenX + ev.clientX, screenY + ev.clientY)) { liveHandOff(); return; }
  // folder / drive / Trash under the pointer?
  const under = document.elementsFromPoint(ev.clientX, ev.clientY).find((n) => n.classList && n.classList.contains('di') && !n.classList.contains('live'));
  const over = under && under._entry && (under._entry.dir || under._entry.trash) && !live.paths.includes(under._entry.path) ? under : null;
  if (over !== live.over) { if (live.over) live.over.classList.remove('drop'); if (over) over.classList.add('drop'); live.over = over; }
  // where the icons will land
  const { out } = over ? { out: [] } : moveTargets(dx, dy);
  const c = cell();
  for (const [e, h] of live.hints) {
    const t = out.find(([x]) => x === e);
    if (!t) { h.style.display = 'none'; continue; }
    h.style.display = 'block'; h.style.left = (innerWidth - t[1].x - c.w) + 'px'; h.style.top = t[1].y + 'px';
  }
}, true);

document.addEventListener('mouseup', async (ev) => {
  pendingDrag = null;
  if (!live) return;
  const dx = ev.clientX - live.x0, dy = ev.clientY - live.y0;
  const target = live.over && live.over._entry;
  const paths = live.paths;
  const { pos } = moveTargets(dx, dy);
  endLive();
  if (target) { await Actions.drop(paths, target.path, ev.ctrlKey || ev.altKey); load(); return; }
  if (Math.hypot(dx, dy) < 3) return;
  cfg.desktop.positions = { ...(cfg.desktop.positions || {}), ...pos }; render();
  await seeker.invoke('config:replace', 'desktop', { ...cfg.desktop, positions: cfg.desktop.positions });
}, true);
window.addEventListener('blur', () => { pendingDrag = null; endLive(); });

// ---------------- interaction ----------------
let renameTimer = null;
function wire(d, e) {
  d.addEventListener('mousedown', (ev) => {
    focusDesktop();
    if (ev.button === 2) { if (!selected.has(e.path)) setSelection([e.path]); return; }
    if (ev.ctrlKey || ev.metaKey || ev.shiftKey) { const s = new Set(selected); s.has(e.path) ? s.delete(e.path) : s.add(e.path); setSelection([...s]); ev.stopPropagation(); return; }
    const wasOnly = selected.size === 1 && selected.has(e.path);
    if (!selected.has(e.path)) setSelection([e.path]);
    if (ev.button === 0) pendingDrag = { x: ev.clientX, y: ev.clientY, entry: e };
    clearTimeout(renameTimer);
    if (wasOnly && ev.target.classList.contains('lbl') && !e.volume && ev.detail === 1) {
      renameTimer = setTimeout(() => startRename(e), 600);
    }
    ev.stopPropagation();
  });
  d.addEventListener('dblclick', () => { clearTimeout(renameTimer); Actions.open(selectedEntries()); });
  d.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    itemContextMenu(selectedEntries(), ev.clientX, ev.clientY, { onCommand: command, allowTrash: true, keepOnBlur: true });
  });
  d.addEventListener('dragstart', (ev) => {
    ev.preventDefault();
    clearTimeout(renameTimer);
    const sel = selectedEntries();
    dragPaths = sel.map((x) => x.path); dragStart = { x: ev.clientX, y: ev.clientY, at: Date.now() };
    Actions.startDrag(dragPaths, e.icon);
  });
  if (e.dir) {
    d.addEventListener('dragover', (ev) => { if (dragPaths && dragPaths.includes(e.path)) return; ev.preventDefault(); ev.stopPropagation(); d.classList.add('drop'); ev.dataTransfer.dropEffect = 'copy'; });
    d.addEventListener('dragleave', () => d.classList.remove('drop'));
    d.addEventListener('drop', async (ev) => {
      ev.preventDefault(); ev.stopPropagation(); d.classList.remove('drop');
      const paths = [...ev.dataTransfer.files].map((f) => seeker.pathFor(f)).filter(Boolean);
      dragPaths = null;
      if (paths.length) { await Actions.drop(paths, e.path, ev.ctrlKey || ev.altKey); load(); }
    });
  }
}

function startRename(e) {
  const d = $$('.di', iconsEl).find((x) => x._entry.path === e.path);
  if (!d) return;
  const lbl = $('.lbl', d);
  inlineRename(lbl, e, { onDone: async (np) => {
    if (np) {
      const pos = { ...(cfg.desktop.positions || {}) };
      if (pos[e.name]) { pos[np.split('/').pop()] = pos[e.name]; await seeker.invoke('config:set', { desktop: { positions: pos } }); }
      selected = new Set([np]);
    }
    load();
  } });
}

function focusDesktop() { seeker.send('desktop:focus'); }

// marquee selection on empty desktop
// The drag itself is run by the system (so files can go to other apps), so the page never hears
// when one ends: forget a finished drag on the next click.
document.addEventListener('mousedown', () => { dragPaths = null; dragStart = null; }, true);
document.addEventListener('mousedown', (ev) => {
  if (ev.target.closest('.di') || ev.target.closest('.menu') || ev.target.closest('.rename')) return;
  focusDesktop();
  if (ev.button !== 0) return;
  const base = ev.ctrlKey || ev.shiftKey ? new Set(selected) : new Set();
  setSelection([...base]);
  const sx = ev.clientX, sy = ev.clientY;
  const move = (m) => {
    const x = Math.min(sx, m.clientX), y = Math.min(sy, m.clientY), w = Math.abs(m.clientX - sx), h = Math.abs(m.clientY - sy);
    Object.assign(marquee.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    const s = new Set(base);
    for (const d of $$('.di', iconsEl)) {
      const r = $('.img', d).getBoundingClientRect(); const lr = $('.lbl', d).getBoundingClientRect();
      const hit = (q) => q.left < x + w && q.right > x && q.top < y + h && q.bottom > y;
      if (hit(r) || hit(lr)) s.add(d._entry.path);
    }
    setSelection([...s]);
  };
  const up = () => { marquee.style.display = 'none'; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
});

document.addEventListener('contextmenu', (ev) => {
  if (ev.target.closest('.di')) return;
  ev.preventDefault();
  setSelection([]);
  emptyMenu(ev.clientX, ev.clientY);
});

async function emptyMenu(x, y) {
  const clip = await seeker.invoke('clip:get');
  popupMenu([
    { id: 'newFolder', label: 'New Folder' },
    { id: 'info', label: 'Get Info' }, { type: 'separator' },
    ...(clip && clip.paths && clip.paths.length ? [{ id: 'paste', label: `Paste ${clip.paths.length === 1 ? 'Item' : clip.paths.length + ' Items'}` }, { type: 'separator' }] : []),
    { id: 'background', label: 'Wallpaper…' },
    { id: 'cleanUp', label: 'Clean Up' },
    { id: 'arrange', label: 'Arrange By', children: [
      { id: 'arrange-name', label: 'Name' }, { id: 'arrange-mtime', label: 'Date Modified' }, { id: 'arrange-ctime', label: 'Date Created' },
      { id: 'arrange-size', label: 'Size' }, { id: 'arrange-kind', label: 'Kind' }] },
    { type: 'separator' },
    { id: 'prefs', label: 'Seeker Preferences…' },
  ], { x, y, keepOnBlur: true, onActivate: (it) => command(it.id) });
}

// Drops onto the desktop: reposition our own icons, or move/copy files into ~/Desktop.
document.addEventListener('dragover', (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; });
document.addEventListener('drop', async (ev) => {
  ev.preventDefault();
  const paths = [...ev.dataTransfer.files].map((f) => seeker.pathFor(f)).filter(Boolean);
  const c = cell();
  const xr = innerWidth - ev.clientX - c.w / 2, yr = ev.clientY - c.h / 2 + 10;      // drop point in desktop coordinates
  // Our own icons moved around the desktop: only when what arrived is exactly what we started dragging.
  const own = dragPaths && dragStart && PRIMARY && (!paths.length || paths.every((p) => dragPaths.includes(p)));
  if (own) {
    const dx = ev.clientX - dragStart.x, dy = ev.clientY - dragStart.y;
    const moving = items.filter((x) => dragPaths.includes(x.path));
    dragPaths = null; dragStart = null;
    const pos = {};
    for (const e of items) if (e._pos && !moving.includes(e)) pos[keyOf(e)] = e._pos;
    const used = new Set(Object.values(pos).map((p) => cellKey(cellAt(p, c))));
    for (const e of moving) {
      const p = e._pos || { x: 12, y: TOP + 10 };
      let q = cellAt({ x: p.x - dx, y: p.y + dy }, c);
      if (used.has(cellKey(q))) q = freeCell(used, c, q);
      used.add(cellKey(q)); pos[keyOf(e)] = cellPos(q.col, q.row, c);
    }
    cfg.desktop.positions = { ...(cfg.desktop.positions || {}), ...pos }; render();
    await seeker.invoke('config:replace', 'desktop', { ...cfg.desktop, positions: cfg.desktop.positions });
    return;
  }
  dragPaths = null; dragStart = null;
  if (!paths.length || !PRIMARY) return;
  const desk = env.dirs.DESKTOP.replace(/\/+$/, '');
  const already = paths.filter((p) => p.slice(0, p.lastIndexOf('/')) === desk);        // e.g. dragged from a Seeker window showing Desktop
  const others = paths.filter((p) => !already.includes(p));
  const moved = [...already, ...(others.length ? await Actions.drop(others, env.dirs.DESKTOP, ev.ctrlKey || ev.altKey) : [])];
  if (moved && moved.length) {
    // New files go to the cell under the pointer (or the nearest free ones), everything else stays put.
    const pos = { ...(cfg.desktop.positions || {}) };
    const movedNames = new Set(moved.map((p) => p.split('/').pop()));
    const used = new Set(items.filter((e) => e._pos && !movedNames.has(keyOf(e))).map((e) => cellKey(cellAt(e._pos, c))));
    let want = cellAt({ x: xr, y: yr }, c);
    for (const p of moved) {
      const q = used.has(cellKey(want)) ? freeCell(used, c, want) : want;
      used.add(cellKey(q)); pos[p.split('/').pop()] = cellPos(q.col, q.row, c);
      want = { col: q.col, row: q.row + 1 };
    }
    cfg.desktop.positions = pos;
    await seeker.invoke('config:replace', 'desktop', { ...cfg.desktop, positions: pos });
    selected = new Set(moved);
  }
  load();
});
document.addEventListener('dragend', () => { dragPaths = null; });

// keyboard
document.addEventListener('keydown', (ev) => {
  if (ev.target.closest && ev.target.closest('.rename')) return;
  const ctrl = ev.ctrlKey || ev.metaKey; const k = ev.key;
  const map = { o: 'open', i: 'info', d: 'duplicate', c: 'copy', x: 'cut', v: 'paste', a: 'selectAll', e: 'eject', n: ev.shiftKey ? 'newFolder' : 'newWindow', y: 'quicklook', l: 'alias' };
  if (ctrl && map[k.toLowerCase()]) { ev.preventDefault(); command(map[k.toLowerCase()]); return; }
  if (ctrl && (k === 'Backspace' || k === 'Delete')) { ev.preventDefault(); command(ev.shiftKey ? 'emptyTrash' : 'trash'); return; }
  if (k === 'Delete' && !ev.shiftKey && !ev.altKey) { ev.preventDefault(); command('trash'); return; }
  if (ctrl && k === 'ArrowDown') { command('open'); return; }
  if (k === 'Enter' && selected.size === 1) { const e = selectedEntries()[0]; if (!e.volume) startRename(e); return; }
  if (k === ' ') { ev.preventDefault(); command('quicklook'); return; }
  if (k === 'Escape') { setSelection([]); return; }
  if (k.startsWith('Arrow')) { ev.preventDefault(); arrowSelect(k); }
  else if (k.length === 1 && !ctrl) typeSelect(k);
});

function arrowSelect(k) {
  const all = $$('.di', iconsEl).map((d) => ({ e: d._entry, r: d.getBoundingClientRect() }));
  if (!all.length) return;
  const cur = all.find((a) => selected.has(a.e.path));
  if (!cur) { setSelection([all[0].e.path]); return; }
  const cx = cur.r.left + cur.r.width / 2, cy = cur.r.top + cur.r.height / 2;
  const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
  let best = null, bd = Infinity;
  for (const a of all) {
    if (a === cur) continue;
    const dx = a.r.left + a.r.width / 2 - cx, dy = a.r.top + a.r.height / 2 - cy;
    if (dx * dir[0] + dy * dir[1] <= 5) continue;
    const d = Math.hypot(dx, dy) + Math.abs(dir[0] ? dy : dx) * 2;
    if (d < bd) { bd = d; best = a; }
  }
  if (best) setSelection([best.e.path]);
}
let typed = '', typedAt = 0;
function typeSelect(ch) {
  if (Date.now() - typedAt > 900) typed = '';
  typed += ch.toLowerCase(); typedAt = Date.now();
  const hit = sortEntries(items, 'name').find((e) => (e.display || e.name).toLowerCase().startsWith(typed));
  if (hit) setSelection([hit.path]);
}

// ---------------- commands (menu bar, keyboard, context menu) ----------------
async function command(cmd) {
  const sel = selectedEntries();
  const paths = sel.map((e) => e.path);
  const desk = env.dirs.DESKTOP;
  switch (cmd) {
    case 'open': return Actions.open(sel);
    case 'openNewWindow': return sel.forEach((e) => seeker.send('browser:open', e.volume ? e.volume.target : e.path));
    case 'info': return Actions.info(paths.length ? paths : [desk]);
    case 'trash': { const files = sel.filter((e) => !e.volume).map((e) => e.path); if (files.length) { await Actions.trash(files); load(); } return; }
    case 'eject': { const v = sel.find((e) => e.volume && e.volume.target !== '/'); if (v) await seeker.invoke('vol:eject', v.volume.target); return; }
    case 'rename': if (sel.length === 1) startRename(sel[0]); return;
    case 'duplicate': { const n = await seeker.invoke('fs:duplicate', paths.filter((p) => !sel.find((e) => e.path === p && e.volume))); selected = new Set(n || []); return load(); }
    case 'alias': { const n = await seeker.invoke('fs:alias', paths); selected = new Set(n || []); return load(); }
    case 'extract': { const n = await seeker.invoke('fs:extract', paths.filter((p) => !sel.find((e) => e.path === p && e.volume))); if (n && n.length) selected = new Set(n); return load(); }
    case 'compress': { const n = await seeker.invoke('fs:compress', paths.filter((p) => !sel.find((e) => e.path === p && e.volume))); if (n && n.length) selected = new Set(n); return load(); }
    case 'copy': return Actions.copy(paths);
    case 'cut': cutSet = new Set(paths); render(); return Actions.cut(paths);
    case 'paste': { const n = await Actions.paste(desk); cutSet.clear(); selected = new Set(n); return load(); }
    case 'selectAll': return setSelection(items.map((e) => e.path));
    case 'newFolder': { const p = await seeker.invoke('fs:newFolder', desk); selected = new Set([p]); await load(); const e = items.find((x) => x.path === p); if (e) startRename(e); return; }
    case 'newWindow': return seeker.send('browser:open', null);
    case 'quicklook': if (sel.length) seeker.send('ql:toggle', Actions.quickLookItems(sel), 0); return;
    case 'background': return seeker.send('prefs:open', 'desktop');
    case 'prefs': return seeker.send('prefs:open', 'general');
    case 'emptyTrash': return seeker.invoke('fs:emptyTrash');
    case 'cleanUp': return cleanUp();
  }
  if (cmd.startsWith('arrange-')) return arrange(cmd.slice(8));
}

async function cleanUp() {
  // Snap every icon to the nearest free grid cell.
  const c = cell(); const pos = {}; const used = new Set();
  for (const e of items) {
    let q = e._pos ? cellAt(e._pos, c) : freeCell(used, c);
    if (used.has(cellKey(q))) q = freeCell(used, c, q);
    used.add(cellKey(q)); pos[keyOf(e)] = cellPos(q.col, q.row, c);
  }
  await seeker.invoke('config:replace', 'desktop', { ...cfg.desktop, positions: pos });
}
async function arrange(key) {
  const c = cell(); const taken = []; const pos = {};
  const vols = items.filter((e) => e.volume);
  for (const e of [...vols, ...sortEntries(items.filter((e) => !e.volume), key, key === 'name' || key === 'kind')]) { const p = autoPlace(taken, c); taken.push(p); pos[keyOf(e)] = p; }
  await seeker.invoke('config:replace', 'desktop', { ...cfg.desktop, positions: pos });
}

seeker.on('command', command);
seeker.on('menus:close', () => { const m = document.querySelector('.menu'); if (m) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
seeker.on('dir:changed', debounce(load, 150));
seeker.on('volumes:changed', debounce(load, 150));
seeker.on('icons:changed', debounce(load, 100));
seeker.on('config:changed', (c, patch) => {
  const needLoad = patch && (patch.desktop || patch.hardDiskName || (patch.browser && 'showExtensions' in patch.browser));
  cfg = c; applyWallpaper();
  if (patch && patch.desktop && Object.keys(patch.desktop).every((k) => k === 'positions')) render(); else if (needLoad) load();
});
seeker.on('trash:changed', () => {});
window.addEventListener('resize', debounce(render, 200));

(async () => {
  cfg = await seeker.invoke('config:get');
  env = await seeker.invoke('env');
  copyBar(document.body, { onlyAlone: true });     // copies in progress, when no Seeker window is open
  { const b = document.querySelector('.copybar'); if (b) b.classList.add('on-desktop'); }
  applyWallpaper();
  await load();
  if (PRIMARY) seeker.send('watch', env.dirs.DESKTOP);
})();

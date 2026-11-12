'use strict';
/* Seeker browser window: sidebar, icon / list / column / Carousel views, search. */
setupChrome();
const viewEl = $('#view'), sidebarEl = $('#sidebar'), bannerEl = $('#banner'), statusEl = $('#status'), zoomEl = $('#zoom'), pathbarEl = $('#pathbar'), marqueeEl = $('#marquee');

const S = {
  loc: null, listing: null, entries: [], view: 'icon', sort: { key: 'name', asc: true }, arrange: 'name',
  sel: new Set(), anchor: null, hist: [], hi: -1, expanded: new Map(), cols: [], colActive: 0, flowIdx: 0,
  search: null, cfg: null, env: null, cut: new Set(), error: null, toolbarHidden: false, side: null,
};
let dragPaths = null;

// ---------------- helpers ----------------
const isVirtual = () => S.loc && S.loc.startsWith('seeker:');
const inTrash = () => S.loc === 'seeker:trash' || (S.env && S.loc && S.loc.startsWith(S.env.trash));
function curDir() {
  if (S.view === 'column' && S.cols.length) { const c = S.cols[Math.min(S.colActive, S.cols.length - 1)]; return c.loc; }
  return S.loc;
}
function sortedEntries(list = S.entries) {
  const key = S.view === 'icon' ? S.arrange : S.sort.key;
  const asc = S.view === 'icon' ? !['mtime', 'ctime', 'size'].includes(key) : S.sort.asc;
  return sortEntries(list, key, asc, S.cfg.browser.foldersFirst);
}
/** Entries in on-screen order for the current view (for keyboard + shift-select). */
function visibleOrder() {
  if (S.view === 'list' || S.view === 'flow') return flatRows().map((r) => r.e);
  if (S.view === 'column') { const c = S.cols[S.colActive]; return c ? c.sorted || [] : []; }
  return sortedEntries();
}
function byPath(p) {
  const all = [...S.entries];
  for (const v of S.expanded.values()) all.push(...v);
  for (const c of S.cols) all.push(...(c.entries || []));
  return all.find((e) => e.path === p) || null;
}
function selectedEntries() { return [...S.sel].map(byPath).filter(Boolean); }

// ---------------- navigation ----------------
async function navigate(loc, { push = true, select = null, keepSearch = false } = {}) {
  if (!loc) return;
  if (!keepSearch && S.search && !loc.startsWith('seeker:search')) stopSearch(true);
  if (S.loc && !S.loc.startsWith('seeker:')) seeker.send('unwatch', S.loc);
  for (const p of S.expanded.keys()) seeker.send('unwatch', p);
  S.expanded.clear();
  S.loc = loc; S.sel = new Set(select ? [select] : []); S.anchor = select; S.flowIdx = 0; S.error = null;
  if (push) { S.hist = S.hist.slice(0, S.hi + 1); S.hist.push(loc); S.hi = S.hist.length - 1; }
  S.cols = [{ loc, entries: null, sel: null }]; S.colActive = 0;
  await load();
  if (select) scrollToSel();
}

async function load({ keep = false } = {}) {
  const loc = S.loc;
  if (loc.startsWith('seeker:search')) { renderAll(); return; }
  const r = await seeker.invoke('fs:list', loc);
  if (S.loc !== loc) return;
  S.listing = r; S.entries = r.entries || []; S.error = r.error || null;
  if (!keep) { /* drop stale selection */ }
  for (const p of [...S.sel]) if (!byPath(p)) S.sel.delete(p);
  if (S.cols.length && S.cols[0].loc === loc) { S.cols[0].entries = S.entries; S.cols[0].sorted = sortedEntries(S.entries); }
  if (!loc.startsWith('seeker:')) seeker.send('watch', loc);
  const sel = [...S.sel];
  if (S.view === 'flow' && sel.length) { const i = flatRows().findIndex((x) => x.e.path === sel[0]); if (i >= 0) S.flowIdx = i; }
  renderAll();
}

function goBack() { if (S.hi > 0) { S.hi--; navigate(S.hist[S.hi], { push: false }); } }
function goForward() { if (S.hi < S.hist.length - 1) { S.hi++; navigate(S.hist[S.hi], { push: false }); } }
function parentOf(loc) {
  if (/^seeker:apps\/Utilities\/[^/]+$/.test(loc || '')) return 'seeker:apps/Utilities';
  if (!loc || loc === '/' || loc.startsWith('seeker:')) return loc === 'seeker:apps/Utilities' ? 'seeker:apps' : loc === 'seeker:apps' || loc === 'seeker:trash' ? null : (loc === '/' ? 'seeker:computer' : null);
  const p = loc.replace(/\/[^/]+\/?$/, '') || '/';
  return p;
}
function goUp() { const p = parentOf(S.loc); if (p) navigate(p, { select: S.loc }); }

// ---------------- rendering ----------------
function renderAll() {
  document.body.classList.toggle('no-status', !S.cfg.browser.showStatusBar);
  pathbarEl.classList.toggle('hidden', !S.cfg.browser.showPathBar);
  $$('#views button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
  $('#back').disabled = S.hi <= 0; $('#fwd').disabled = S.hi >= S.hist.length - 1;
  renderTitle(); renderBanner(); renderView(); renderStatus(); renderPathbar(); highlightSidebar(); reportState();
}

function renderTitle() {
  let title = S.listing ? S.listing.title : 'Seeker';
  let icon = S.listing ? S.listing.icon : ['folder'];
  if (S.search) { title = S.search.title; icon = ['folder-saved-search', 'edit-find', 'system-search']; }
  if (S.view === 'column' && S.cols.length > 1) {
    const last = [...S.cols].reverse().find((c) => c.entries);
    if (last && last.loc !== S.loc) { const e = byPath(last.loc); if (e) { title = e.display || e.name; icon = e.icon; } }
  }
  $('#ttext').textContent = title; $('#ticon').src = iconURL(icon, 32);
  document.title = title;
  seeker.send('win:setTitle', title);
}

function renderBanner() {
  bannerEl.textContent = '';
  if (S.search) {
    bannerEl.classList.remove('hidden');
    const scope = el('div', { class: 'scope' });
    if (S.search.kind !== 'sidebar') {
      const mk = (id, label) => el('button', { class: S.search.scope === id ? 'on' : '', text: label, onclick: () => { S.search.scope = id; runSearch(); } });
      scope.append(el('span', { text: 'Search:', style: { color: '#555' } }), mk('home', 'Home'), mk('computer', 'This Computer'));
      if (S.search.folder && !S.search.folder.startsWith('seeker:')) scope.append(mk('folder', `“${S.search.folderName}”`));
    }
    bannerEl.append(scope, el('div', { class: 't' }), el('span', { id: 'scount', style: { color: '#555' }, text: S.search.running ? 'Searching…' : '' }));
  } else if (inTrash()) {
    bannerEl.classList.remove('hidden');
    // Restore: the selected items (or everything) go back where they came from; Empty: gone for good
    bannerEl.append(el('div', { class: 't', text: 'Trash' }),
      el('button', { class: 'btn', id: 'trashRestore', text: 'Restore', title: 'Put the selected items (or everything) back where they came from', disabled: !S.entries.length,
        onclick: async () => { const sel = selectedEntries(); const ps = (sel.length ? sel : S.entries).map((e) => e.path).filter(Boolean); if (ps.length) { await seeker.invoke('fs:putBack', ps); load(); } } }),
      el('button', { class: 'btn', text: 'Empty', disabled: !S.entries.length, onclick: async () => { await seeker.invoke('fs:emptyTrash'); load(); } }));
  } else bannerEl.classList.add('hidden');
}

function renderStatus() {
  const n = S.search ? S.search.results.length : (S.view === 'column' && S.cols[S.colActive] ? (S.cols[S.colActive].entries || []).length : S.entries.length);
  const selN = S.sel.size;
  let s = selN ? `${selN} of ${n} selected` : `${n} item${n === 1 ? '' : 's'}`;
  if (S.listing && S.listing.free != null && !S.search) s += `, ${humanSize(S.listing.free)} available`;
  statusEl.textContent = s;
  zoomEl.style.display = S.view === 'icon' ? '' : 'none';
  zoomEl.value = S.cfg.browser.iconSize;
}

function renderPathbar() {
  if (!S.cfg.browser.showPathBar) return;
  pathbarEl.textContent = '';
  const loc = S.view === 'column' ? curDir() : S.loc;
  if (!loc || loc.startsWith('seeker:')) { pathbarEl.append(el('span', { class: 'pc', text: S.listing ? S.listing.title : '' })); return; }
  const parts = loc.split('/').filter(Boolean);
  const crumbs = [{ p: '/', name: S.side ? (S.side.devices.find((d) => d.path === '/') || {}).name || '/' : '/', icon: ['drive-harddisk'] }];
  let acc = '';
  for (const x of parts) { acc += '/' + x; crumbs.push({ p: acc, name: acc === S.env.home ? S.env.user : x, icon: acc === S.env.home ? ['user-home'] : ['folder'] }); }
  crumbs.forEach((c, i) => {
    if (i) pathbarEl.append(el('span', { class: 'sepr', text: '▶' }));
    pathbarEl.append(el('span', { class: 'pc', ondblclick: () => navigate(c.p), title: c.p }, iconImg(c.icon, 14), el('span', { text: c.name })));
  });
}

function renderView() {
  if (typeof Live !== 'undefined' && S.view !== 'flow') Live.detach();     // Cover Flow keeps its live cover across redraws
  viewEl.textContent = '';
  viewEl.onscroll = null;
  if (S.error) { viewEl.append(el('div', { class: 'empty-msg', text: S.error })); return; }
  if (S.view === 'icon') renderIcons();
  else if (S.view === 'list') renderList(viewEl);
  else if (S.view === 'column') renderColumns();
  else renderFlow();
}

const currentList = () => (S.search ? S.search.results : S.entries);

// ----- icon view -----
function renderIcons() {
  const size = S.cfg.browser.iconSize;
  const wrap = el('div', { class: 'icons' });
  const cellW = Math.max(size + 34, 92);
  for (const e of sortedEntries(currentList())) {
    const imgBox = el('div', { class: 'img' });
    imgBox.style.width = imgBox.style.height = (size + 8) + 'px';
    const im = iconImg(e.icon, size); im.loading = 'lazy';
    imgBox.append(im);
    if (e.thumb && size >= 32) {
      const t = el('img', { class: 'thumb' + (e.alpha || e.program ? ' alpha' : ''), draggable: 'false' });
      t.onload = () => { const k = Math.min(size / t.naturalWidth, size / t.naturalHeight, 1); t.width = Math.max(8, Math.round(t.naturalWidth * k) - 2); t.height = Math.max(8, Math.round(t.naturalHeight * k) - 2); im.replaceWith(t); };
      t.src = thumbURL(e.path, size <= 64 ? 128 : 256, e.mtime);
    }
    const it = el('div', { class: 'it' + (S.sel.has(e.path) ? ' sel' : '') + (S.cut.has(e.path) ? ' cut' : ''), draggable: 'true' }, imgBox, el('div', { class: 'lbl', text: e.display || e.name }));
    it.style.width = cellW + 'px';
    it._e = e; wireItem(it, e);
    wrap.append(it);
  }
  if (!currentList().length && !(S.search && S.search.running)) wrap.append(el('div', { class: 'empty-msg', text: S.search ? 'No results' : '' }));
  viewEl.append(wrap);
  wireBackground(wrap);
}

// ----- list view -----
function flatRows() {
  const out = [];
  const walk = (list, depth) => {
    for (const e of sortedEntries(list)) {
      out.push({ e, depth });
      if (e.dir && S.expanded.has(e.path)) walk(S.expanded.get(e.path), depth + 1);
    }
  };
  walk(currentList(), 0);
  return out;
}

function renderList(container) {
  const cols = [['name', 'Name', 'c-name'], ['mtime', inTrash() ? 'Date Modified' : 'Date Modified', 'c-date'], ['size', 'Size', 'c-size'], ['kind', 'Kind', 'c-kind']];
  const list = el('div', { class: 'list' });
  const head = el('div', { class: 'lh' });
  for (const [k, label, cls] of cols) {
    head.append(el('div', { class: cls + (S.sort.key === k ? ' sorted' : ''), onclick: () => { if (S.sort.key === k) S.sort.asc = !S.sort.asc; else { S.sort = { key: k, asc: k === 'name' || k === 'kind' }; } renderView(); } },
      el('span', { text: label }), S.sort.key === k ? el('span', { class: 'arr', text: S.sort.asc ? '▲' : '▼' }) : null));
  }
  list.append(head);
  const body = el('div');
  for (const { e, depth } of flatRows()) {
    const tw = el('span', { class: 'tw' });
    if (e.dir && !S.search && !isVirtualEntry(e)) {
      const d = el('span', { class: 'disclosure' + (S.expanded.has(e.path) ? ' open' : '') });
      tw.append(d);
      tw.addEventListener('mousedown', (ev) => { ev.stopPropagation(); toggleExpand(e, ev.altKey); });
    }
    const name = el('div', { class: 'c-name' }, tw, iconImg(e.icon, 16), el('span', { class: 'nm', text: e.display || e.name }));
    name.style.paddingLeft = (4 + depth * 16) + 'px';
    const row = el('div', { class: 'lr' + (S.sel.has(e.path) ? ' sel' : '') + (S.cut.has(e.path) ? ' cut' : ''), draggable: 'true' },
      name, el('div', { class: 'c-date c-dim', text: relDate(e.mtime) }), el('div', { class: 'c-size c-dim', text: e.dir ? '--' : humanSize(e.size) }), el('div', { class: 'c-kind c-dim', text: e.kind || '' }));
    row._e = e; wireItem(row, e);
    body.append(row);
  }
  list.append(body);
  container.append(list);
  wireBackground(list);
}
function isVirtualEntry(e) { return !!e.volume && !e.path; }

async function toggleExpand(e, deep) {
  if (S.expanded.has(e.path)) { S.expanded.delete(e.path); seeker.send('unwatch', e.path); }
  else {
    const r = await seeker.invoke('fs:list', e.path);
    S.expanded.set(e.path, r.entries || []);
    seeker.send('watch', e.path);
    if (deep) for (const c of (r.entries || []).filter((x) => x.dir)) await toggleExpand(c, false);
  }
  renderView();
}

// ----- column view -----
async function renderColumns() {
  const wrap = el('div', { class: 'cols' });
  for (let i = 0; i < S.cols.length; i++) {
    const c = S.cols[i];
    if (!c.entries) {
      const r = await seeker.invoke('fs:list', c.loc);
      c.entries = r.entries || []; c.sorted = sortedEntries(c.entries);
      seeker.send('watch', c.loc);
    }
    if (!c.sorted) c.sorted = sortedEntries(c.entries);
    const col = el('div', { class: 'col' + (i === S.colActive ? ' active' : '') });
    for (const e of c.sorted) {
      const onPath = c.sel === e.path && i < S.cols.length - 1;
      const row = el('div', { class: 'cr' + ((i === S.colActive ? S.sel.has(e.path) : c.sel === e.path) ? ' sel' : '') + (onPath && !S.sel.has(e.path) ? ' path' : ''), draggable: 'true' },
        iconImg(e.icon, 16), el('span', { class: 'nm', text: e.display || e.name }), e.dir ? el('span', { class: 'ar', text: '▶' }) : null);
      row._e = e; row._col = i;
      wireItem(row, e, i);
      col.append(row);
    }
    col.addEventListener('mousedown', (ev) => { if (ev.target === col) { S.colActive = i; S.sel.clear(); c.sel = null; S.cols = S.cols.slice(0, i + 1); renderView(); renderStatus(); reportState(); } });
    wireDropTarget(col, () => c.loc);
    wrap.append(col);
  }
  // preview column for a selected file
  const lastSel = selectedEntries();
  if (lastSel.length === 1 && !lastSel[0].dir) wrap.append(previewColumn(lastSel[0]));
  viewEl.append(wrap);
  viewEl.scrollLeft = viewEl.scrollWidth;
}

function previewColumn(e) {
  const pv = el('div', { class: 'pv' });
  const big = iconImg(e.icon, 128); pv.append(big);
  if (e.thumb) { const t = el('img', { class: 'thumb' + (e.alpha || e.program ? ' alpha' : '') }); t.onload = () => big.replaceWith(t); t.src = thumbURL(e.path, 256, e.mtime); }
  const rows = [['Name', e.display || e.name], ['Kind', e.kind], ['Size', e.dir ? '--' : humanSize(e.size)], ['Created', relDate(e.ctime)], ['Modified', relDate(e.mtime)]];
  const tbl = el('table', {}, rows.map(([a, b]) => el('tr', {}, el('td', { text: a }), el('td', { text: b || '--' }))));
  return el('div', { class: 'preview' }, pv, tbl);
}

// ----- cover flow -----
let flowStageH = null;
function renderFlow() {
  const wrap = el('div', { class: 'flow' });
  const stage = el('div', { class: 'stage' });
  if (flowStageH) stage.style.height = flowStageH + 'px';
  const split = el('div', { class: 'flowsplit' });
  const listBox = el('div', { class: 'flowlist' });
  wrap.append(stage, split, listBox);
  viewEl.append(wrap);
  viewEl.style.overflow = 'hidden';
  renderList(listBox);
  split.addEventListener('pointerdown', (ev) => {
    split.setPointerCapture(ev.pointerId); const sy = ev.clientY, sh = stage.offsetHeight;
    split.onpointermove = (m) => { flowStageH = Math.max(120, Math.min(wrap.offsetHeight - 80, sh + m.clientY - sy)); stage.style.height = flowStageH + 'px'; drawCovers(stage); };
    split.onpointerup = () => { split.onpointermove = null; };
  });
  stage.addEventListener('wheel', (ev) => { ev.preventDefault(); const rows = flatRows(); const d = Math.sign(ev.deltaY || ev.deltaX); flowTo(Math.max(0, Math.min(rows.length - 1, S.flowIdx + d))); }, { passive: false });
  stage._covers = new Map();
  drawCovers(stage);
  new ResizeObserver(() => drawCovers(stage)).observe(stage);
}

function flowTo(i, fromList) {
  const rows = flatRows(); if (!rows.length) return;
  S.flowIdx = Math.max(0, Math.min(rows.length - 1, i));
  if (!fromList) { S.sel = new Set([rows[S.flowIdx].e.path]); S.anchor = rows[S.flowIdx].e.path; refreshSelection(); scrollToSel(); }
  const stage = $('.stage', viewEl); if (stage) drawCovers(stage);
  renderStatus(); reportState(); qlFollow();
}

function fitThumb(t, size) {
  const ar = t._ar || 1, w = ar >= 1 ? size : Math.round(size * ar), h = ar >= 1 ? Math.round(size / ar) : size;
  t.width = w; t.height = h; t.style.marginTop = (size - h) + 'px';
}
function drawCovers(stage) {
  const rows = flatRows();
  const H = stage.clientHeight || 200, W = stage.clientWidth || 600;
  // covers fill the panel: as tall as it allows above the caption and scroll bar (no fixed limit), and no wider
  // than about half of it so the covers either side still show
  const TOP = Math.max(8, Math.round(H * 0.04));
  const size = Math.max(60, Math.round(Math.min(H - TOP - 74, W * 0.46)));
  const dpr = window.devicePixelRatio || 1, px = Math.round(size * dpr);
  // the 3D depth grows with the covers, so side covers keep the same shape at any size (a fixed depth made big
  // side covers swing out toward the viewer)
  stage.style.perspective = Math.round(size * 2.17) + 'px';
  const cur = Math.min(S.flowIdx, Math.max(0, rows.length - 1));
  const keep = new Set();
  for (let i = Math.max(0, cur - 10); i < Math.min(rows.length, cur + 11); i++) {
    const e = rows[i].e; keep.add(e.path);
    let cv = stage._covers.get(e.path);
    if (!cv) {
      cv = el('div', { class: 'cv' });
      const im = iconImg(e.icon, size); cv.append(im);
      if (e.thumb) { const t = el('img', { class: 'thumb' + (e.alpha || e.program ? ' alpha' : ''), draggable: 'false' }); t.onload = () => { t._ar = t.naturalWidth / t.naturalHeight; fitThumb(t, cv._size || size); if (im.isConnected) im.replaceWith(t); }; t._px = thumbSizeFor(px); t.src = thumbURL(e.path, t._px, e.mtime); cv._thumb = t; }
      cv.addEventListener('click', () => { const idx = flatRows().findIndex((r) => r.e.path === e.path); if (idx === S.flowIdx) Actions.open([e], { onFolder: (p) => navigate(p) }); else flowTo(idx); });
      cv.addEventListener('dblclick', () => Actions.open([e], { onFolder: (p) => navigate(p) }));
      stage.append(cv); stage._covers.set(e.path, cv);
    }
    const d = i - cur;
    const x = d === 0 ? 0 : Math.sign(d) * (size * 0.78 + (Math.abs(d) - 1) * size * 0.30);
    const rot = d === 0 ? 0 : -Math.sign(d) * 70;
    // the front cover sits flat at exactly 1:1 (pushing it toward the viewer enlarged an already-drawn picture and
    // blurred it); the side covers stay set back
    const z = d === 0 ? 0 : -Math.round(size * 0.13);
    cv._size = size;
    cv.style.width = size + 'px'; cv.style.marginLeft = (-size / 2) + 'px'; cv.style.top = TOP + 'px';
    const t = cv._thumb;
    if (t) {
      if (t._ar) fitThumb(t, size);
      if (thumbSizeFor(px) > t._px) { t._px = thumbSizeFor(px); t.src = thumbURL(e.path, t._px, e.mtime); }   // grew: sharper copy
    }
    cv.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${rot}deg)`;
    cv.style.zIndex = String(100 - Math.abs(d));
    $$('img', cv).forEach((im) => {
      if (im.classList.contains('thumb') || im.closest('.live')) return;
      im.width = size; im.height = size;
      const want = Math.max(16, px);       // an icon drawn bigger than the one loaded: load one that size
      if (!im._px) im._px = Math.max(16, Math.round((parseInt(im.dataset.px, 10) || 0)) || want);
      if (want > im._px * 1.15 && e.icon) { im._px = want; im.src = iconURL(e.icon, want); }
    });
  }
  for (const [p, cv] of [...stage._covers]) if (!keep.has(p)) { cv.remove(); stage._covers.delete(p); }
  // the cover in front comes alive (video, songs, pages, text, fonts, 3D): live.js
  if (typeof Live !== 'undefined') { const fe = rows[cur] && rows[cur].e; const fcv = fe && stage._covers.get(fe.path); if (fcv && !fe.dir) Live.front(fcv, fe, size); else Live.detach(); }
  let cap = $('.cap', stage); if (!cap) { cap = el('div', { class: 'cap' }); stage.append(cap); }
  const e = rows[cur] && rows[cur].e;
  cap.textContent = ''; if (e) cap.append(e.display || e.name, el('small', { text: e.kind || '' }));
  let bar = $('.bar', stage);
  if (!bar) {
    bar = el('div', { class: 'bar' }, el('div', { class: 'knob' })); stage.append(bar);
    bar.addEventListener('pointerdown', (ev) => {
      bar.setPointerCapture(ev.pointerId);
      const go = (m) => { const r = bar.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (m.clientX - r.left) / r.width)); flowTo(Math.round(f * (flatRows().length - 1))); };
      go(ev); bar.onpointermove = go; bar.onpointerup = () => { bar.onpointermove = null; };
    });
  }
  const k = $('.knob', bar); const n = Math.max(1, rows.length);
  const kw = Math.max(20, bar.clientWidth / n * 3);
  k.style.width = kw + 'px'; k.style.left = ((bar.clientWidth - kw) * (n > 1 ? cur / (n - 1) : 0)) + 'px';
}

// ---------------- item interaction ----------------
let renameTimer = null;
function wireItem(node, e, colIdx) {
  node.addEventListener('mousedown', (ev) => {
    viewEl.focus();
    if (colIdx != null) { S.colActive = colIdx; }
    if (ev.button === 2) { if (!S.sel.has(e.path)) select([e.path], e.path); return; }
    ev.stopPropagation();
    if (ev.ctrlKey || ev.metaKey) { const s = new Set(S.sel); s.has(e.path) ? s.delete(e.path) : s.add(e.path); select([...s], e.path); return; }
    if (ev.shiftKey && S.anchor) {
      const order = visibleOrder(); const a = order.findIndex((x) => x.path === S.anchor), b = order.findIndex((x) => x.path === e.path);
      if (a >= 0 && b >= 0) { select(order.slice(Math.min(a, b), Math.max(a, b) + 1).map((x) => x.path), S.anchor, true); return; }
    }
    const wasOnly = S.sel.size === 1 && S.sel.has(e.path);
    if (!S.sel.has(e.path) || colIdx != null) select([e.path], e.path);
    clearTimeout(renameTimer);
    const lbl = ev.target.closest('.lbl, .nm');
    if (wasOnly && lbl && ev.detail === 1 && canModify()) renameTimer = setTimeout(() => startRename(e), 650);
    if (colIdx != null) columnSelect(colIdx, e);
    if (S.view === 'flow') { const i = flatRows().findIndex((r) => r.e.path === e.path); if (i >= 0) flowTo(i, true); }
  });
  node.addEventListener('dblclick', (ev) => {
    clearTimeout(renameTimer);
    if (ev.target.closest('.tw')) return;
    openSelection(ev.ctrlKey || ev.metaKey);
  });
  node.addEventListener('contextmenu', (ev) => { ev.preventDefault(); ev.stopPropagation(); showItemMenu(ev.clientX, ev.clientY); });
  node.addEventListener('dragstart', (ev) => {
    ev.preventDefault(); clearTimeout(renameTimer);
    if (!S.sel.has(e.path)) select([e.path], e.path);
    dragPaths = selectedEntries().map((x) => x.path).filter(Boolean);
    Actions.startDrag(dragPaths, e.icon);
  });
  if (e.dir && !e.volume || (e.volume && e.volume.target)) wireDropTarget(node, () => (e.volume ? e.volume.target : e.path), true);
}

let springTimer = null;
function wireDropTarget(node, destFn, spring) {
  node.addEventListener('dragover', (ev) => {
    const dest = destFn();
    if (!dest || dest.startsWith('seeker:') || (dragPaths && dragPaths.includes(dest))) return;
    ev.preventDefault(); ev.stopPropagation();
    ev.dataTransfer.dropEffect = 'copy';
    if (!node.classList.contains('drop')) {
      $$('.drop').forEach((n) => n.classList.remove('drop'));
      node.classList.add('drop');
      clearTimeout(springTimer);
      if (spring) springTimer = setTimeout(() => { node.classList.remove('drop'); navigate(dest); }, 1100);   // spring-loaded folders
    }
  });
  node.addEventListener('dragleave', (ev) => { if (!node.contains(ev.relatedTarget)) { node.classList.remove('drop'); clearTimeout(springTimer); } });
  node.addEventListener('drop', async (ev) => {
    ev.preventDefault(); ev.stopPropagation(); clearTimeout(springTimer);
    node.classList.remove('drop');
    const paths = [...ev.dataTransfer.files].map((f) => seeker.pathFor(f)).filter(Boolean);
    const dest = destFn(); dragPaths = null;
    if (!paths.length || !dest) return;
    if (paths.every((p) => p.replace(/\/[^/]+$/, '') === dest)) return;
    const moved = await Actions.drop(paths, dest, ev.ctrlKey || ev.altKey);
    if (dest === curDir() && moved.length) { S.sel = new Set(moved); }
    refresh();
  });
}

function wireBackground(node) {
  node.addEventListener('mousedown', (ev) => {
    if (ev.target.closest('.it,.lr,.cr,.lh')) return;
    viewEl.focus();
    if (ev.button !== 0) return;
    const base = ev.ctrlKey || ev.shiftKey ? new Set(S.sel) : new Set();
    select([...base], S.anchor);
    const sx = ev.clientX, sy = ev.clientY;
    const nodes = $$('.it, .lr', viewEl);
    const rect = (n) => (n.classList.contains('it') ? [$('.img', n).getBoundingClientRect(), $('.lbl', n).getBoundingClientRect()] : [n.getBoundingClientRect()]);
    const move = (m) => {
      const x = Math.min(sx, m.clientX), y = Math.min(sy, m.clientY), w = Math.abs(m.clientX - sx), h = Math.abs(m.clientY - sy);
      if (w < 3 && h < 3) return;
      Object.assign(marqueeEl.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      const s = new Set(base);
      for (const n of nodes) if (rect(n).some((q) => q.left < x + w && q.right > x && q.top < y + h && q.bottom > y)) s.add(n._e.path);
      S.sel = s; refreshSelection();
    };
    const up = () => { marqueeEl.style.display = 'none'; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); renderStatus(); reportState(); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  });
  node.addEventListener('contextmenu', (ev) => { if (ev.target.closest('.it,.lr,.cr')) return; ev.preventDefault(); select([]); showBackgroundMenu(ev.clientX, ev.clientY); });
}
// The view itself takes drops once, for the window's whole life. (Build 26 wired it again on every redraw, so one
// drop copied everything once per redraw, and each extra pass then asked to replace the files the first had made.)
wireDropTarget(viewEl, () => (S.search || isVirtual() ? null : curDir()));

function select(paths, anchor, keepAnchor) {
  S.sel = new Set(paths.filter(Boolean));
  if (!keepAnchor) S.anchor = anchor || paths[paths.length - 1] || null;
  refreshSelection(); renderStatus(); reportState(); qlFollow();
}
function refreshSelection() {
  $$('.it, .lr', viewEl).forEach((n) => n.classList.toggle('sel', S.sel.has(n._e.path)));
  $$('.cr', viewEl).forEach((n) => { if (n._col === S.colActive) n.classList.toggle('sel', S.sel.has(n._e.path)); });
}
function scrollToSel() {
  requestAnimationFrame(() => {
    const n = $$('.it.sel, .lr.sel, .col.active .cr.sel', viewEl)[0];
    if (n) n.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

async function columnSelect(i, e) {
  S.cols = S.cols.slice(0, i + 1);
  S.cols[i].sel = e.path;
  if (e.dir || (e.volume && e.volume.target)) { S.cols.push({ loc: e.volume ? e.volume.target : e.path, entries: null, sel: null }); }
  await renderColumns2();
}
async function renderColumns2() { const sl = viewEl.scrollLeft; viewEl.textContent = ''; await renderColumns(); renderTitle(); renderPathbar(); renderStatus(); reportState(); if (viewEl.scrollLeft < sl) viewEl.scrollLeft = sl; }

function openSelection(newWindow) {
  const sel = selectedEntries();
  if (!sel.length) return;
  Actions.open(sel, { onFolder: (p) => (newWindow || sel.length > 1 ? seeker.send('browser:open', p) : navigate(p)) });
}

function canModify() { return !S.search && !isVirtual() && !(S.listing && S.listing.canWrite === false); }

function startRename(e) {
  if (!e || e.volume || e.app && isVirtual()) return;
  const node = [...$$('.it, .lr, .cr', viewEl)].find((n) => n._e.path === e.path);
  if (!node) return;
  const lbl = $('.lbl, .nm', node);
  inlineRename(lbl, e, { multiline: S.view === 'icon', onDone: (np) => { if (np) S.sel = new Set([np]); refresh(); viewEl.focus(); } });
}

// ---------------- menus ----------------
function showItemMenu(x, y) {
  const sel = selectedEntries(); if (!sel.length) return;
  itemContextMenu(sel, x, y, { inTrash: inTrash(), virtual: isVirtual() || !!S.search, allowTrash: !!S.search, showEnclosing: !!S.search, onCommand: command });
}
async function showBackgroundMenu(x, y) {
  const clip = await seeker.invoke('clip:get');
  const w = canModify();
  new Menu([
    { id: 'newFolder', label: 'New Folder', enabled: w },
    { id: 'info', label: 'Get Info' }, { type: 'separator' },
    { id: 'paste', label: clip && clip.paths && clip.paths.length ? `Paste ${clip.paths.length === 1 ? 'Item' : clip.paths.length + ' Items'}` : 'Paste', enabled: w && !!(clip && clip.paths && clip.paths.length) },
    { type: 'separator' },
    { id: 'view', label: 'View', children: [
      { id: 'view-icon', label: 'as Icons', toggle: 'radio', checked: S.view === 'icon' }, { id: 'view-list', label: 'as List', toggle: 'radio', checked: S.view === 'list' },
      { id: 'view-column', label: 'as Columns', toggle: 'radio', checked: S.view === 'column' }, { id: 'view-flow', label: 'as Carousel', toggle: 'radio', checked: S.view === 'flow' }] },
    ...(S.view === 'icon' ? [{ id: 'arrange', label: 'Arrange By', children: ['name', 'mtime', 'ctime', 'size', 'kind'].map((k) => ({ id: 'arrange-' + k, label: { name: 'Name', mtime: 'Date Modified', ctime: 'Date Created', size: 'Size', kind: 'Kind' }[k], toggle: 'radio', checked: S.arrange === k })) }] : []),
    { id: 'toggleHidden', label: 'Show Hidden Files', toggle: 'check', checked: S.cfg.browser.showHidden },
    ...(inTrash() ? [{ type: 'separator' }, { id: 'emptyTrash', label: 'Empty Trash' }] : []),
  ], { x, y, onActivate: (it) => command(it.id) });
}

function actionMenu() {
  const r = $('#action').getBoundingClientRect();
  if (S.sel.size) showItemMenu(r.left, r.bottom + 2); else showBackgroundMenu(r.left, r.bottom + 2);
}

// names Extract Here can unpack (the main process checks again, including by file type)
function isArchiveName(n) { return /\.(zip|zipx|jar|war|apk|xpi|cbz|cbr|cb7|cbt|7z|rar|tar|tgz|tbz2?|txz|tzst|tlz|taz|iso|cab|cpio|xar|lha|lzh|arj|wim|sitx?|gz|bz2|xz|zst|zstd|lzma|lz4|lz|z)$/i.test(n) && !/\.(deb|rpm)$/i.test(n); }

// ---------------- commands ----------------
async function command(cmd) {
  const sel = selectedEntries(); const paths = sel.map((e) => e.path).filter(Boolean);
  const dirs = S.env.dirs;
  switch (cmd) {
    case 'open': return openSelection(false);
    case 'openNewWindow': return sel.forEach((e) => seeker.send('browser:open', e.volume ? e.volume.target : e.path));
    case 'enclosing': if (sel[0]) seeker.send('browser:open', sel[0].path.replace(/\/[^/]+$/, '') || '/', { select: sel[0].path }); return;
    case 'close': return seeker.send('win:close');
    case 'minimize': return seeker.send('win:minimize');
    case 'zoom': return seeker.send('win:zoom');
    case 'info': return Actions.info(paths.length ? paths : (isVirtual() ? [] : [curDir()]));
    case 'rename': return startRename(sel[0]);
    case 'duplicate': if (canModify() || S.search) { const n = await seeker.invoke('fs:duplicate', paths); S.sel = new Set(n || []); refresh(); } return;
    case 'alias': if (canModify()) { const n = await seeker.invoke('fs:alias', paths); S.sel = new Set(n || []); refresh(); } return;
    case 'extract': if (!isVirtual() || S.search) { const n = await seeker.invoke('fs:extract', paths); if (n && n.length) S.sel = new Set(n); refresh(); } return;
    case 'compress': if (canModify()) { const n = await seeker.invoke('fs:compress', paths); if (n && n.length) S.sel = new Set(n); refresh(); } return;
    case 'quicklook': return toggleQL();
    case 'trash': { const files = sel.filter((e) => !e.volume && !(e.app && isVirtual())).map((e) => e.path); if (files.length && !inTrash()) { if (!sel.every((e) => e.utilities)) selectNeighbour(); await Actions.trash(files); refresh(); } return; }
    case 'putBack': if (inTrash()) { await seeker.invoke('fs:putBack', paths); refresh(); } return;
    case 'emptyTrash': await seeker.invoke('fs:emptyTrash'); return refresh();
    case 'eject': { const v = sel.find((e) => e.volume) || (S.side && S.side.devices.find((d) => d.path === S.loc && d.eject)); if (v) seeker.invoke('vol:eject', v.volume ? v.volume.target : v.path); return; }
    case 'find': return $('#q').focus();
    case 'copy': return Actions.copy(paths);
    case 'cut': if (canModify()) { S.cut = new Set(paths); refreshCut(); Actions.cut(paths); } return;
    case 'paste': if (!isVirtual() && !S.search) { const n = await Actions.paste(curDir()); S.cut.clear(); S.sel = new Set(n); refresh(); } return;
    case 'selectAll': return select(visibleOrder().map((e) => e.path));
    case 'newFolder': {
      if (!canModify() && S.view !== 'column') return;
      const p = await seeker.invoke('fs:newFolder', curDir());
      if (!p || p.error) return;
      S.sel = new Set([p]); await refresh();
      const e = byPath(p); if (e) startRename(e); return;
    }
    case 'cleanUp': return renderView();
    case 'togglePathBar': await seeker.invoke('config:set', { browser: { showPathBar: !S.cfg.browser.showPathBar } }); return;
    case 'toggleStatusBar': await seeker.invoke('config:set', { browser: { showStatusBar: !S.cfg.browser.showStatusBar } }); return;
    case 'toggleToolbar': S.toolbarHidden = !S.toolbarHidden; document.body.classList.toggle('no-toolbar', S.toolbarHidden); $('.sidebar').classList.toggle('hidden', S.toolbarHidden); $('#split').classList.toggle('hidden', S.toolbarHidden); return reportState();
    case 'toggleHidden': return seeker.invoke('config:set', { browser: { showHidden: !S.cfg.browser.showHidden } });
    case 'back': return goBack();
    case 'forward': return goForward();
    case 'up': return goUp();
    case 'go-computer': return navigate('seeker:computer');
    case 'go-home': return navigate(S.env.home);
    case 'go-desktop': return navigate(dirs.DESKTOP);
    case 'go-apps': return navigate('seeker:apps');
    case 'go-documents': return navigate(dirs.DOCUMENTS);
    case 'go-downloads': return navigate(dirs.DOWNLOAD);
    case 'go-trash': return navigate('seeker:trash');
    case 'gotoFolder': return gotoSheet();
  }
  if (cmd.startsWith('view-')) return setView(cmd.slice(5));
  if (cmd.startsWith('arrange-')) { S.arrange = cmd.slice(8); S.sort = { key: S.arrange, asc: ['name', 'kind'].includes(S.arrange) }; if (S.view !== 'icon') S.view = S.view; return renderView(); }
}

function selectNeighbour() {
  const order = visibleOrder(); const idx = order.findIndex((e) => S.sel.has(e.path));
  const next = order.slice(idx).find((e) => !S.sel.has(e.path)) || order.slice(0, idx).reverse().find((e) => !S.sel.has(e.path));
  S.sel = new Set(next ? [next.path] : []); S.anchor = next ? next.path : null;
}
function refreshCut() { $$('.it, .lr', viewEl).forEach((n) => n.classList.toggle('cut', S.cut.has(n._e.path))); }

function setView(v) {
  if (!['icon', 'list', 'column', 'flow'].includes(v)) return;
  S.view = v; viewEl.style.overflow = '';
  seeker.invoke('config:set', { browser: { view: v } });
  if (v === 'column') {
    S.cols = [{ loc: S.loc, entries: S.search ? null : S.entries, sel: null }]; S.colActive = 0;
    if (S.search) { setView('list'); return; }
  }
  if (v === 'flow') { const sel = [...S.sel][0]; const i = sel ? flatRows().findIndex((r) => r.e.path === sel) : 0; S.flowIdx = Math.max(0, i); }
  renderAll(); scrollToSel();
}

async function refresh() {
  if (S.search) return;
  // reload the main listing, expanded folders and columns, keeping selection and scroll
  const st = viewEl.scrollTop;
  const r = await seeker.invoke('fs:list', S.loc);
  S.listing = r; S.entries = r.entries || []; S.error = r.error || null;
  for (const p of [...S.expanded.keys()]) { const x = await seeker.invoke('fs:list', p); if (x.error) S.expanded.delete(p); else S.expanded.set(p, x.entries || []); }
  for (const c of S.cols) { if (c.loc === S.loc) { c.entries = S.entries; } else { const x = await seeker.invoke('fs:list', c.loc); c.entries = x.entries || []; } c.sorted = sortedEntries(c.entries); }
  for (const p of [...S.sel]) if (!byPath(p)) S.sel.delete(p);
  if (S.view === 'flow') { const sel = [...S.sel][0]; if (sel) S.flowIdx = Math.max(0, flatRows().findIndex((x) => x.e.path === sel)); }
  renderAll();
  viewEl.scrollTop = st;
  if (S.sel.size) scrollToSel();
}

// ---------------- Quick Look ----------------
let qlOpen = false;
function toggleQL() {
  const sel = selectedEntries();
  if (!qlOpen && !sel.length) return;
  qlOpen = !qlOpen;
  seeker.send('ql:toggle', Actions.quickLookItems(sel), 0);
}
function qlFollow() { if (qlOpen) { const sel = selectedEntries(); if (sel.length) seeker.send('ql:update', Actions.quickLookItems(sel), 0); } }
seeker.on('ql:closed', () => { qlOpen = false; });

// ---------------- keyboard ----------------
viewEl.addEventListener('keydown', (ev) => {
  if (ev.target !== viewEl) return;
  const k = ev.key; const ctrl = ev.ctrlKey || ev.metaKey;
  if (k === ' ' && !ctrl) { ev.preventDefault(); toggleQL(); return; }
  if (k === 'Enter' && !ctrl && S.sel.size === 1) { ev.preventDefault(); if (canModify() || S.view === 'column') startRename(selectedEntries()[0]); return; }
  if (k === 'Escape' && qlOpen) { toggleQL(); return; }
  if (ctrl && k === 'ArrowDown') { ev.preventDefault(); openSelection(false); return; }
  if (ctrl && k === 'ArrowUp') { ev.preventDefault(); goUp(); return; }
  if (k.startsWith('Arrow') && !ctrl) { ev.preventDefault(); arrow(k, ev.shiftKey); return; }
  if (k === 'Home' || k === 'End') { const o = visibleOrder(); const e = k === 'Home' ? o[0] : o[o.length - 1]; if (e) { select([e.path], e.path); scrollToSel(); } return; }
  if (!ctrl && !ev.altKey && k.length === 1) typeSelect(k);
});

function arrow(k, extend) {
  if (S.view === 'flow' && (k === 'ArrowLeft' || k === 'ArrowRight')) { flowTo(S.flowIdx + (k === 'ArrowLeft' ? -1 : 1)); return; }
  if (S.view === 'column') return arrowColumn(k);
  if (S.view === 'list' && (k === 'ArrowRight' || k === 'ArrowLeft')) {
    const e = selectedEntries()[0];
    if (e && e.dir) { const open = S.expanded.has(e.path); if ((k === 'ArrowRight') !== open) toggleExpand(e, false); }
    return;
  }
  const order = visibleOrder(); if (!order.length) return;
  const curIdx = order.findIndex((e) => e.path === (S.anchorMove || S.anchor));
  let idx = curIdx < 0 ? 0 : curIdx;
  if (S.view === 'icon') {
    const items = $$('.it', viewEl); const first = items[0];
    const perRow = first ? Math.max(1, items.filter((n) => n.offsetTop === first.offsetTop).length) : 1;
    idx += { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -perRow, ArrowDown: perRow }[k];
  } else idx += k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0;
  if (curIdx < 0) idx = 0;
  idx = Math.max(0, Math.min(order.length - 1, idx));
  const e = order[idx];
  if (extend && S.anchor) {
    const a = order.findIndex((x) => x.path === S.anchor);
    S.anchorMove = e.path;
    select(order.slice(Math.min(a, idx), Math.max(a, idx) + 1).map((x) => x.path), S.anchor, true);
  } else { S.anchorMove = null; select([e.path], e.path); }
  if (S.view === 'flow') { S.flowIdx = idx; const st = $('.stage', viewEl); if (st) drawCovers(st); }
  scrollToSel();
}

function arrowColumn(k) {
  const i = S.colActive; const c = S.cols[i]; if (!c) return;
  const list = c.sorted || [];
  const cur = list.findIndex((e) => S.sel.has(e.path));
  if (k === 'ArrowUp' || k === 'ArrowDown') {
    const n = Math.max(0, Math.min(list.length - 1, cur < 0 ? 0 : cur + (k === 'ArrowDown' ? 1 : -1)));
    const e = list[n]; if (!e) return;
    select([e.path], e.path); columnSelect(i, e).then(scrollToSel);
  } else if (k === 'ArrowRight') {
    const nxt = S.cols[i + 1]; if (!nxt || !nxt.sorted || !nxt.sorted.length) return;
    S.colActive = i + 1; const e = nxt.sorted[0]; select([e.path], e.path); columnSelect(i + 1, e);
  } else if (k === 'ArrowLeft' && i > 0) {
    S.colActive = i - 1; const p = S.cols[i - 1].sel; S.cols = S.cols.slice(0, i + 1); S.cols[i].sel = null;
    select([p], p); renderColumns2();
  }
}

let typed = '', typedAt = 0;
function typeSelect(ch) {
  if (Date.now() - typedAt > 900) typed = '';
  typed += ch.toLowerCase(); typedAt = Date.now();
  const hit = visibleOrder().find((e) => (e.display || e.name).toLowerCase().startsWith(typed));
  if (hit) { select([hit.path], hit.path); scrollToSel(); if (S.view === 'flow') { S.flowIdx = flatRows().findIndex((r) => r.e.path === hit.path); drawCovers($('.stage', viewEl)); } }
}

// Global shortcuts for this window (also shown in the menu bar).
document.addEventListener('keydown', (ev) => {
  if (ev.target.closest && ev.target.closest('.rename, .sheet, input, textarea') && !(ev.ctrlKey && ev.key.toLowerCase() === 'w')) return;
  const ctrl = ev.ctrlKey || ev.metaKey;
  // the Delete key on its own moves the selection to the Trash (the Utilities folder stays, with a word why)
  if (!ctrl && !ev.altKey && !ev.shiftKey && ev.key === 'Delete') { ev.preventDefault(); command('trash'); return; }
  // Alt+Left / Alt+Right: back and forward (also what a two-finger swipe on the trackpad sends)
  if (!ctrl && ev.altKey && !ev.shiftKey && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && !(ev.target.closest && ev.target.closest('input, textarea'))) {
    ev.preventDefault(); command(ev.key === 'ArrowLeft' ? 'back' : 'forward'); return;
  }
  if (!ctrl) return;
  const k = ev.key.toLowerCase(); const sh = ev.shiftKey, alt = ev.altKey;
  let cmd = null;
  if (sh && !alt) cmd = { n: 'newFolder', h: 'go-home', d: 'go-desktop', a: 'go-apps', c: 'go-computer', g: 'gotoFolder', o: 'go-documents', '>': 'toggleHidden', '.': 'toggleHidden', backspace: 'emptyTrash', delete: 'emptyTrash' }[k];
  else if (alt && !sh) cmd = { l: 'go-downloads', t: 'toggleToolbar', 1: 'arrange-name', 2: 'arrange-mtime', 3: 'arrange-ctime', 4: 'arrange-size', 5: 'arrange-kind' }[k];
  else if (!sh && !alt) cmd = { n: 'newWindow', o: 'open', w: 'close', i: 'info', d: 'duplicate', l: 'alias', y: 'quicklook', e: 'eject', f: 'find', c: 'copy', x: 'cut', v: 'paste', a: 'selectAll', m: 'minimize', '[': 'back', ']': 'forward', 1: 'view-icon', 2: 'view-list', 3: 'view-column', 4: 'view-flow', backspace: 'trash', delete: 'trash', ',': 'prefs', h: 'hide' }[k];
  if (!cmd) return;
  if (ev.target.closest && ev.target.closest('input, textarea') && ['copy', 'cut', 'paste', 'selectAll'].includes(cmd)) return;
  ev.preventDefault();
  if (cmd === 'newWindow') return seeker.send('browser:open', null);
  if (cmd === 'prefs') return seeker.send('prefs:open');
  if (cmd === 'hide') return seeker.send('seeker:command', 's:hide');
  if (cmd === 'emptyTrash') return seeker.invoke('fs:emptyTrash');
  command(cmd);
});

// ---------------- Go to Folder sheet ----------------
function gotoSheet() {
  if ($('.sheet')) return;
  const input = el('input', { type: 'text', value: S.loc && !S.loc.startsWith('seeker:') ? S.loc.replace(S.env.home, '~') : '~/' });
  const close = () => sheet.remove();
  const go = async () => { const p = await seeker.invoke('fs:resolve', input.value); if (p) { close(); navigate(p); } else { input.style.background = '#fdd'; setTimeout(() => (input.style.background = ''), 400); } };
  const sheet = el('div', { class: 'sheet' }, el('div', { text: 'Go to the folder:' }), input,
    el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Cancel', onclick: close }), el('button', { class: 'btn default', text: 'Go', onclick: go })));
  input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); if (e.key === 'Escape') close(); });
  $('.content').append(sheet); input.focus(); input.select();
}

// ---------------- search ----------------
let searchSeq = 0;
function stopSearch(clear) {
  if (S.search && S.search.id) seeker.send('search:stop', S.search.id);
  if (clear) { S.search = null; $('#q').value = ''; $('#qclear').classList.add('hidden'); }
}
function startSearch(text) {
  const folder = S.search ? S.search.folder : S.loc;
  const prevLoc = S.search ? S.search.prevLoc : S.loc;
  stopSearch(false);
  S.search = { text, scope: S.search ? S.search.scope : (folder && !folder.startsWith('seeker:') && folder !== S.env.home ? 'folder' : 'home'), folder, folderName: S.listing ? S.listing.title : '', prevLoc, results: [], title: `Searching “${text}”` };
  runSearch();
}
function runSearch() {
  const s = S.search; if (!s) return;
  if (s.id) seeker.send('search:stop', s.id);
  s.id = 'q' + (++searchSeq); s.results = []; s.running = true;
  const scope = s.scope === 'computer' ? '/' : s.scope === 'folder' ? s.folder : S.env.home;
  const crit = s.kind === 'sidebar' ? s.crit : { text: s.text, scope };
  seeker.send('search:start', s.id, crit);
  S.sel.clear(); S.listing = { ...(S.listing || {}), free: null };
  if (S.view === 'column') S.view = 'list';
  renderAll();
}
seeker.on('search:results', (id, batch) => {
  if (!S.search || S.search.id !== id) return;
  S.search.results.push(...batch);
  renderLater();
});
seeker.on('search:done', (id) => { if (!S.search || S.search.id !== id) return; S.search.running = false; renderAll(); });
const renderLater = debounce(() => { renderView(); renderStatus(); const c = $('#scount'); if (c && S.search) c.textContent = S.search.running ? 'Searching…' : ''; }, 120);

$('#q').addEventListener('input', debounce(() => {
  const v = $('#q').value.trim();
  $('#qclear').classList.toggle('hidden', !v);
  if (v) startSearch(v);
  else if (S.search) { const back = S.search.prevLoc; stopSearch(true); navigate(back || S.env.home, { push: false }); }
}, 300));
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#q').value = ''; $('#q').dispatchEvent(new Event('input')); viewEl.focus(); } if (e.key === 'ArrowDown') viewEl.focus(); });
$('#qclear').addEventListener('click', () => { $('#q').value = ''; $('#q').dispatchEvent(new Event('input')); });

function sidebarSearch(id) {
  const now = new Date(); const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const crit = { scope: S.env.home };
  const names = { today: 'Today', yesterday: 'Yesterday', week: 'Past Week', images: 'All Images', movies: 'All Movies', documents: 'All Documents' };
  if (id === 'today') crit.since = day0;
  if (id === 'yesterday') { crit.since = day0 - 86400000; crit.until = day0; }
  if (id === 'week') crit.since = day0 - 6 * 86400000;
  if (['images', 'movies', 'documents'].includes(id)) crit.kind = id;
  stopSearch(true);
  S.search = { kind: 'sidebar', crit, sid: id, results: [], title: names[id], prevLoc: S.loc };
  S.loc = 'seeker:search?' + id;
  runSearch();
}

// ---------------- sidebar ----------------
async function loadSidebar() {
  S.side = await seeker.invoke('sidebar');
  sidebarEl.textContent = '';
  const sec = (title, list, mk) => { if (!list.length) return; sidebarEl.append(el('div', { class: 'sh', text: title })); list.forEach((x) => sidebarEl.append(mk(x))); };
  const place = (x, { eject, removable } = {}) => {
    const n = el('div', { class: 'si', title: x.path || '' }, iconImg(x.icon, 16), el('span', { text: x.name }));
    if (eject) {
      const ej = el('span', { class: 'ej', title: 'Eject', html: '<svg viewBox="0 0 12 12"><path d="M6 1l5 6H1zM1 9h10v2H1z"/></svg>' });
      ej.addEventListener('mousedown', (e) => { e.stopPropagation(); seeker.invoke('vol:eject', x.path); });
      n.append(ej);
    }
    n.dataset.path = x.path;
    if (eject) {
      // a disk that can be ejected: click to open it, or drag it to the Trash in the Dock to eject it
      n.draggable = true;
      n.addEventListener('click', (e) => { if (e.button === 0) navigate(x.path); });
      n.addEventListener('dragstart', (e) => { e.preventDefault(); dragPaths = [x.path]; Actions.startDrag([x.path], x.icon); });
    } else n.addEventListener('mousedown', (e) => { if (e.button === 0) { if (x.launch) seeker.invoke('apps:launch', x.launch, []); else if (x.search) sidebarSearch(x.id); else navigate(x.path); } });
    n.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const items = [{ id: 'open', label: 'Open in New Window' }];
      if (eject) items.push({ id: 'eject', label: 'Eject' });
      if (x.fav) items.push({ type: 'separator' }, { id: 'remove', label: 'Remove from Sidebar' });
      new Menu(items, { x: e.clientX, y: e.clientY, onActivate: async (it) => {
        if (it.id === 'open') seeker.send('browser:open', x.path);
        if (it.id === 'eject') seeker.invoke('vol:eject', x.path);
        if (it.id === 'remove') { const favs = S.side.places.map((p) => p.path).filter((p) => p !== x.path); await seeker.invoke('config:set', { sidebarFavorites: favs }); }
      } });
    });
    if (!x.search && !x.launch) wireDropTarget(n, () => x.path);
    return n;
  };
  sec('DEVICES', S.side.devices, (d) => place(d, { eject: d.eject }));
  for (const [t, pct] of volumeOps) paintVolumeRing(t, pct);
  sec('PLACES', [...S.side.places.map((p) => ({ ...p, fav: true })), S.side.trash], (p) => place(p));
  sec('SEARCH FOR', S.side.searches.map((s) => ({ ...s, search: true, path: 'seeker:search?' + s.id })), (s) => place(s));
  // Drop a folder onto empty sidebar space to add it to PLACES.
  sidebarEl.ondragover = (e) => { if (e.target === sidebarEl) e.preventDefault(); };
  sidebarEl.ondrop = async (e) => {
    if (e.target !== sidebarEl) return; e.preventDefault();
    const paths = [...e.dataTransfer.files].map((f) => seeker.pathFor(f)).filter(Boolean);
    const dirs = [];
    for (const p of paths) { const en = await seeker.invoke('fs:entry', p); if (en && en.dir) dirs.push(p); }
    if (dirs.length) await seeker.invoke('config:set', { sidebarFavorites: [...S.side.places.map((p) => p.path), ...dirs.filter((d) => !S.side.places.find((p) => p.path === d))] });
  };
  highlightSidebar();
}
function highlightSidebar() { const cur = S.search ? (S.search.sid ? 'seeker:search?' + S.search.sid : null) : S.loc; $$('.si', sidebarEl).forEach((n) => n.classList.toggle('on', n.dataset.path === cur)); }

// sidebar splitter
$('#split').addEventListener('pointerdown', (ev) => {
  const sp = $('#split'); sp.setPointerCapture(ev.pointerId);
  const sx = ev.clientX, w0 = sidebarEl.offsetWidth;
  sp.onpointermove = (m) => { sidebarEl.style.width = Math.max(120, Math.min(360, w0 + m.clientX - sx)) + 'px'; };
  sp.onpointerup = () => { sp.onpointermove = null; seeker.invoke('config:set', { browser: { sidebarWidth: sidebarEl.offsetWidth } }); };
});

// ---------------- toolbar ----------------
$('#back').addEventListener('click', goBack);
$('#fwd').addEventListener('click', goForward);
$$('#views button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#ql button').addEventListener('click', toggleQL);
$('#action button').addEventListener('mousedown', (e) => { e.preventDefault(); actionMenu(); });
// the pill at the top right shows or hides the path bar (where you are: Macintosh HD ▶ Users ▶ ...); Alt+Cmd+T still hides the toolbar
$('#tbtoggle').addEventListener('click', () => command('togglePathBar'));
zoomEl.addEventListener('input', () => { S.cfg.browser.iconSize = +zoomEl.value; renderView(); });
// Ctrl + scroll (and pinching on the trackpad) makes the icons bigger or smaller, like the slider
let zoomSave = null;
viewEl.addEventListener('wheel', (ev) => {
  if (!ev.ctrlKey || S.view !== 'icon') return;
  ev.preventDefault();
  const min = +zoomEl.min || 16, max = +zoomEl.max || 256, step = Math.max(4, Math.round((max - min) / 24));
  const v = Math.max(min, Math.min(max, (+S.cfg.browser.iconSize || 64) + (ev.deltaY < 0 ? step : -step)));
  if (v === S.cfg.browser.iconSize) return;
  S.cfg.browser.iconSize = v; zoomEl.value = v; renderView();
  clearTimeout(zoomSave); zoomSave = setTimeout(() => seeker.invoke('config:set', { browser: { iconSize: v } }), 400);
}, { passive: false });
zoomEl.addEventListener('change', () => seeker.invoke('config:set', { browser: { iconSize: +zoomEl.value } }));

// ---------------- state to the menu bar ----------------
const reportState = debounce(() => {
  const sel = selectedEntries();
  seeker.send('browser:state', {
    loc: S.loc, view: S.view, selection: sel.length, canBack: S.hi > 0, canForward: S.hi < S.hist.length - 1, canUp: !!parentOf(S.loc),
    canWrite: canModify() || (S.view === 'column' && !isVirtual()), virtual: isVirtual() || !!S.search, inTrash: inTrash(), toolbarHidden: S.toolbarHidden,
    volumeSelected: (sel.find((e) => e.volume && e.volume.removable) || {}).path || null, canDelete: sel.every((e) => !e.volume), archivesSelected: sel.length > 0 && sel.every((e) => !e.dir && isArchiveName(e.name)),
  });
}, 60);

// ---------------- events ----------------
seeker.on('command', command);
seeker.on('dir:changed', debounce((p) => { if (!S.search) refresh(); }, 200));
seeker.on('trash:changed', debounce(() => { if (inTrash()) refresh(); loadSidebar(); }, 200));
seeker.on('volumes:changed', debounce(() => { loadSidebar(); if (S.loc === 'seeker:computer') refresh(); }, 200));
seeker.on('icons:changed', debounce(() => { loadSidebar(); refresh(); }, 100));
seeker.on('config:changed', (c, patch) => {
  const hiddenChanged = patch && patch.browser && ('showHidden' in patch.browser || 'showExtensions' in patch.browser);
  S.cfg = c;
  if (patch && (patch.sidebarFavorites !== undefined || patch.hardDiskName)) loadSidebar();
  if (hiddenChanged) refresh(); else if (patch && patch.browser && ('showPathBar' in patch.browser || 'showStatusBar' in patch.browser)) renderAll();
});
// a disk being written to: a progress ring where its Eject button goes, until it's safe to unplug
const volumeOps = new Map();
function paintVolumeRing(target, pct) {
  const n = [...sidebarEl.querySelectorAll('.si')].find((x) => x.dataset.path === target);
  if (!n) return;
  let r = n.querySelector('.ring');
  const ej = n.querySelector('.ej');
  if (pct == null) { if (r) r.remove(); if (ej) ej.style.display = ''; return; }
  if (!r) {
    r = el('span', { class: 'ring', title: FR_UI ? 'Écriture en cours — ne pas débrancher' : 'Writing — don’t unplug',
      html: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" class="t"/><circle cx="8" cy="8" r="6" class="p" transform="rotate(-90 8 8)"/></svg>' });
    n.append(r);
  }
  if (ej) ej.style.display = 'none';
  r.querySelector('.p').style.strokeDashoffset = String(37.7 * (1 - Math.max(0, Math.min(1, pct))));
}
seeker.on('op:volume', ({ target, pct }) => {
  if (pct == null) volumeOps.delete(target); else volumeOps.set(target, pct);
  paintVolumeRing(target, pct);
});
seeker.on('op:progress', (p) => {
  if (p.finished) return renderStatus();
  if (p.verb) statusEl.textContent = p.total > 1 ? `${p.verb} ${p.done + 1} of ${p.total}: ${p.name}…` : `${p.verb} “${p.name}”…`;
  else if (p.total > 1) statusEl.textContent = `${p.move ? 'Moving' : 'Copying'} ${p.done + 1} of ${p.total}: ${p.name}`;
});
window.addEventListener('focus', () => { reportState(); viewEl.classList.remove('inactive'); });

// ---------------- start ----------------
(async () => {
  S.cfg = await seeker.invoke('config:get');
  S.env = await seeker.invoke('env');
  copyBar($('#statusbar'));                       // copies in progress: the soft bar, bottom-left
  S.view = Q.get('view') || S.cfg.browser.view || 'icon';
  sidebarEl.style.width = (S.cfg.browser.sidebarWidth || 180) + 'px';
  await loadSidebar();
  await navigate(Q.get('loc') || S.env.home, { select: Q.get('select') || null });
  viewEl.focus();
})();

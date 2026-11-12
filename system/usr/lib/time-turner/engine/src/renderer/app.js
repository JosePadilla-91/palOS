'use strict';
/*
 * Time Turner — renderer.
 * Uses window.timeTurner (Electron preload → time-turnerd) when present, and the
 * sample data in mock-api.js otherwise (browser preview, `time-turner --mock`).
 * Paths are relative to the user's home folder ('' = Home).
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const DAY = 864e5;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const api = window.timeTurner || window.TimeTurnerMock;
  const MOCK = !!api.isMock;

  /* ======================================================================
     Wallpaper (GNOME) — light/dark variants follow the system theme
     ====================================================================== */
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  let wallpapers = null;
  function applyWallpaper() {
    if (!wallpapers) return;
    const url = darkMQ.matches ? (wallpapers.dark || wallpapers.light) : (wallpapers.light || wallpapers.dark);
    if (url) document.documentElement.style.setProperty('--wallpaper', `url("${String(url).replace(/"/g, '%22')}")`);
  }
  darkMQ.addEventListener('change', applyWallpaper);
  async function initWallpaper() {
    try {
      wallpapers = await api.getWallpaper?.();
      applyWallpaper();
      api.onWallpaperChanged?.(w => { wallpapers = w; applyWallpaper(); });
    } catch (err) { console.warn('Wallpaper unavailable', err); }
  }

  /* ======================================================================
     Formatting & icons
     ====================================================================== */
  const fTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const fDay = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const fDayY = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const fShort = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  function dayDiff(t) {
    const a = new Date(t); a.setHours(0, 0, 0, 0);
    const b = new Date(); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / DAY);
  }
  function snapTitle(s) {
    if (s.now) return 'Now';
    const dd = dayDiff(s.time), tm = fTime.format(s.time);
    if (dd === 0) return `Today, ${tm}`;
    if (dd === 1) return `Yesterday, ${tm}`;
    const sameYear = new Date(s.time).getFullYear() === new Date().getFullYear();
    return `${(sameYear ? fDay : fDayY).format(s.time)}, ${tm}`;
  }
  function snapShort(s) {
    if (s.now) return 'Now';
    const dd = dayDiff(s.time);
    if (dd === 0) return `Today, ${fTime.format(s.time)}`;
    if (dd === 1) return `Yesterday, ${fTime.format(s.time)}`;
    return fShort.format(s.time);
  }
  const REASONS = {
    first: 'First backup', kernel: 'Kernel update', upgrade: 'palOS upgrade', 'pre-restore': 'Before system restore',
    manual: 'Manual backup', auto: 'Scheduled backup',
  };
  function fmtSize(b) {
    if (b == null) return '';
    if (b < 1e3) return `${b} bytes`;
    const u = ['kB', 'MB', 'GB', 'TB']; let i = -1;
    do { b /= 1e3; i++; } while (b >= 1e3 && i < u.length - 1);
    return `${b.toFixed(1)} ${u[i]}`;
  }
  const dirLabel = dir => (dir ? `~/${dir}` : '~');
  const splitPath = p => { const k = p.lastIndexOf('/'); return k < 0 ? ['', p] : [p.slice(0, k), p.slice(k + 1)]; };
  const folderName = dir => (dir ? splitPath(dir)[1] : 'Home');

  const GLYPH = { doc: 'g-doc', pdf: 'g-doc', text: 'g-doc', sheet: 'g-sheet', image: 'g-image', audio: 'g-audio', video: 'g-video', code: 'g-code', archive: 'g-archive', disc: 'g-disc' };
  function iconSVG(kind) {
    if (kind === 'folder') return '<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#i-folder"/></svg>';
    const k = GLYPH[kind] ? kind : 'text';
    return `<svg class="k-${k}" viewBox="0 0 64 64" aria-hidden="true"><use href="#i-file"/><use href="#${GLYPH[k]}"/></svg>`;
  }
  const sym = id => `<svg class="sym" aria-hidden="true"><use href="#${id}"/></svg>`;

  /* ======================================================================
     Shared UI bits
     ====================================================================== */
  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(msg, ms = 3600) {
    toastEl.textContent = msg;
    toastEl.hidden = true; void toastEl.offsetWidth; toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
  }
  function errorText(err) {
    if (!err) return 'Something went wrong';
    if (err.code === 'auth-cancelled' || err.code === 'not-authorized') return 'Authentication was cancelled';
    return err.message || String(err);
  }

  function dialogResult(dlg) {
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise(res => dlg.addEventListener('close', () => res(dlg.returnValue), { once: true }));
  }

  // Events from the service (progress, finished jobs, new backups…)
  const eventHandlers = new Set();
  api.onEvent?.(ev => eventHandlers.forEach(h => { try { h(ev); } catch (e) { console.error(e); } }));
  const onEvent = h => { eventHandlers.add(h); return () => eventHandlers.delete(h); };

  function showServiceError(err) {
    $('#serviceErrorText').textContent = errorText(err);
    $('#serviceError').hidden = false;
  }
  $('#serviceRetry').addEventListener('click', () => { $('#serviceError').hidden = true; start(); });

  /* ======================================================================
     Main window
     ====================================================================== */
  const flow = $('#flow'), stage = $('#stage');
  const scrubber = $('#scrubber'), thumb = $('#scrubThumb'), scrubFill = $('#scrubFill'), scrubLabel = $('#scrubLabel');
  const restoreBtn = $('#restoreBtn'), backupBtn = $('#backupBtn'), backupLabel = $('#backupLabel');
  const restoreSysBtn = $('#restoreSysBtn');
  const searchInput = $('#search'), searchPop = $('#searchPop'), resultList = $('#resultList'), resultCount = $('#resultCount');

  let snaps = [{ now: true, id: 'now', time: Date.now() }];
  let cards = [];
  let pos = 0, target = 0, raf = 0, active = -1, dragging = false, cardW = 800;
  let currentPath = '';
  const selection = new Set(); let anchor = null;
  let pendingFind = null;
  let mainReady = false;
  let sysRestoreRunning = false;
  let backupRunning = null;      // job kind while a backup runs

  // ----- folder listings, cached; backups never change, "now" does -----
  const listCache = new Map();   // `${snapId}|${path}` -> items | null
  const inflight = new Map();
  const queue = [];
  let active_requests = 0;
  const MAX_REQUESTS = 3;
  const cacheKey = (id, p) => `${id}|${p}`;

  function requestListing(snapId, dirPath, priority) {
    const key = cacheKey(snapId, dirPath);
    if (listCache.has(key) || inflight.has(key)) return;
    inflight.set(key, null);
    queue.push({ snapId, dirPath, key, priority });
    pumpQueue();
  }
  function pumpQueue() {
    queue.sort((a, b) => a.priority - b.priority);
    while (active_requests < MAX_REQUESTS && queue.length) {
      const job = queue.shift();
      if (job.dirPath !== currentPath) { inflight.delete(job.key); continue; }   // navigated away
      active_requests++;
      api.listDir(job.snapId, job.dirPath).then(items => {
        listCache.set(job.key, items);
      }, err => {
        console.warn('listing failed', err);
        listCache.set(job.key, { error: errorText(err) });
        setTimeout(() => listCache.delete(job.key), 10e3);
      }).finally(() => {
        inflight.delete(job.key);
        active_requests--;
        const i = snaps.findIndex(s => s.id === job.snapId);
        if (i >= 0 && job.dirPath === currentPath) updateCardBody(i);
        pumpQueue();
      });
    }
  }
  function invalidateNow() {
    for (const k of [...listCache.keys()]) if (k.startsWith('now|')) listCache.delete(k);
  }
  // Load listings for cards near the front first.
  function requestVisible() {
    const center = Math.round(target);
    for (let d = 0; d <= 5; d++) {
      for (const i of d ? [center - d, center + d] : [center]) {
        if (i >= 0 && i < snaps.length) requestListing(snaps[i].id, currentPath, d);
      }
    }
  }
  const itemsFor = i => listCache.get(cacheKey(snaps[i].id, currentPath));

  function buildCards() {
    flow.textContent = '';
    cards = snaps.map((s, i) => {
      const el = document.createElement('article');
      el.className = 'card';
      el.dataset.idx = i;
      flow.appendChild(el);
      return el;
    });
    renderAll();
  }

  function renderAll() {
    const bar = barHTML();
    for (let i = 0; i < cards.length; i++) renderCard(i, bar);
    if (cards[active]) cards[active].classList.add('active');
    syncSelection();
    requestVisible();
  }

  function renderCard(i, bar = barHTML()) {
    const s = snaps[i], el = cards[i];
    el.classList.toggle('now', !!s.now);
    const sub = s.now ? 'Your files right now' : REASONS[s.kind] || 'Backup';
    el.innerHTML =
      `<header class="card-head"><div class="card-title">${esc(snapTitle(s))}</div>` +
      `<div class="card-sub">${s.full ? '<span class="pill">Full system image</span>' : ''}<span>${esc(sub)}</span></div></header>` +
      bar + bodyHTML(i) + '<div class="floatbar" hidden></div>';
  }

  function updateCardBody(i) {
    const el = cards[i];
    if (!el) return;
    const body = el.querySelector('.card-body');
    if (body) body.outerHTML = bodyHTML(i);
    if (i === active) {
      syncSelection();
      if (pendingFind?.idx === i && Math.abs(target - pos) < 0.01) settled();
    }
  }

  function barHTML() {
    const segs = currentPath ? currentPath.split('/') : [];
    let h = `<div class="card-bar"><button class="btn flat icon-btn" data-act="up" title="Up" aria-label="Up"${currentPath ? '' : ' disabled'}>${sym('s-up')}</button><nav class="pathbar">`;
    h += `<button class="crumb${segs.length ? '' : ' current'}" data-path="">${sym('s-home')}Home</button>`;
    segs.forEach((seg, k) => {
      h += `<span class="sep">/</span><button class="crumb${k === segs.length - 1 ? ' current' : ''}" data-path="${esc(segs.slice(0, k + 1).join('/'))}">${esc(seg)}</button>`;
    });
    return h + '</nav></div>';
  }

  function sortItems(items) {
    return [...items].sort((a, b) => (a.kind === 'folder') === (b.kind === 'folder')
      ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      : a.kind === 'folder' ? -1 : 1);
  }

  function bodyHTML(i) {
    const items = itemsFor(i);
    if (items === undefined) return '<div class="card-body"><div class="empty"><span class="spinner big" aria-label="Loading"></span></div></div>';
    if (items === null) return `<div class="card-body"><div class="empty">${sym('s-clock')}<div>This folder didn’t exist yet</div></div></div>`;
    if (items.error) return `<div class="card-body"><div class="empty">${sym('s-warn')}<div>${esc(items.error)}</div></div></div>`;
    if (!items.length) return `<div class="card-body"><div class="empty">${sym('s-folder')}<div>Folder is empty</div></div></div>`;
    return '<div class="card-body"><div class="grid">' + sortItems(items).map(f =>
      `<div class="item" data-path="${esc(f.path)}" title="${esc(f.name)}"><div class="item-icon">${iconSVG(f.kind)}</div><div class="item-name">${esc(f.name)}</div></div>`
    ).join('') + '</div></div>';
  }

  /* ---------- Cover-flow geometry ---------- */
  function layout() {
    const W = cardW;
    for (let i = 0; i < cards.length; i++) {
      const el = cards[i], d = i - pos, ad = Math.abs(d);
      if (ad > 8) { if (el.style.display !== 'none') el.style.display = 'none'; continue; }
      if (el.style.display === 'none') el.style.display = '';
      const s = Math.sign(d), t = Math.min(ad, 1), rest = Math.max(ad - 1, 0);
      const x = s * (t * W * 0.6 + rest * W * 0.09);
      const z = -(t * 240 + rest * 50);
      const ry = -s * t * 62;
      el.style.transform = `translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
      el.style.zIndex = String(1000 - Math.round(ad * 10));
      el.style.opacity = ad > 6 ? String(clamp((8 - ad) / 2, 0, 1)) : '1';
      el.style.setProperty('--dim', (t * 0.2 + rest * 0.07).toFixed(3));
    }
    const pct = snaps.length > 1 ? (pos / (snaps.length - 1)) * 100 : 100;
    thumb.style.left = `${pct}%`;
    scrubFill.style.width = `${pct}%`;
  }

  function measure() {
    const el = cards[active] || cards[cards.length - 1];
    if (el && el.offsetWidth) cardW = el.offsetWidth;
  }

  // Frame-rate independent easing toward the target position
  let lastFrame = 0;
  function tick(now) {
    raf = 0;
    const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16.7;
    lastFrame = now;
    const diff = target - pos;
    if (Math.abs(diff) < 0.002 || reduceMotion) {
      pos = target; lastFrame = 0;
      layout(); updateActive(); settled();
      return;
    }
    const rate = dragging ? 0.3 : 0.14;
    pos += diff * (1 - Math.pow(1 - rate, dt / 16.7));
    layout(); updateActive();
    raf = requestAnimationFrame(tick);
  }

  function go(t, { snap = true } = {}) {
    target = clamp(snap ? Math.round(t) : t, 0, snaps.length - 1);
    if (!raf) { lastFrame = 0; raf = requestAnimationFrame(tick); }
  }

  function updateActive() {
    const a = clamp(Math.round(dragging ? pos : target), 0, snaps.length - 1);
    if (a === active) return;
    cards[active]?.classList.remove('active');
    active = a;
    cards[a].classList.add('active');
    selection.clear(); anchor = null;
    syncSelection();
    scrubLabel.textContent = snapTitle(snaps[a]);
    thumb.setAttribute('aria-valuetext', snapTitle(snaps[a]));
    requestVisible();
  }

  function settled() {
    requestVisible();
    if (!pendingFind || pendingFind.idx !== active) return;
    const items = itemsFor(active);
    if (items === undefined) return;       // still loading; called again when it arrives
    const { path } = pendingFind; pendingFind = null;
    selection.clear(); selection.add(path); anchor = path;
    syncSelection();
    const el = cards[active].querySelector(`.item[data-path="${CSS.escape(path)}"]`);
    if (el) {
      el.classList.remove('found'); void el.offsetWidth; el.classList.add('found');
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  /* ---------- Selection & navigation ---------- */
  function syncSelection() {
    for (const el of flow.querySelectorAll('.item.selected')) el.classList.remove('selected');
    for (const fb of flow.querySelectorAll('.floatbar:not([hidden])')) fb.hidden = true;
    const card = cards[active];
    if (card) {
      for (const el of card.querySelectorAll('.item')) if (selection.has(el.dataset.path)) el.classList.add('selected');
      const fb = card.querySelector('.floatbar');
      if (selection.size && fb) {
        const items = (itemsFor(active) || []).filter?.(it => selection.has(it.path)) || [];
        if (items.length === 1) {
          const f = items[0];
          fb.textContent = f.kind === 'folder' ? `“${f.name}” selected` : `“${f.name}” selected (${fmtSize(f.size)})`;
        } else fb.textContent = `${selection.size} items selected`;
        fb.hidden = false;
      }
    }
    updateButtons();
  }

  function updateButtons() {
    const s = snaps[active];
    restoreBtn.disabled = !s || s.now || selection.size === 0;
    restoreSysBtn.disabled = !s || s.now || sysRestoreRunning || !!backupRunning;
    backupBtn.disabled = !!backupRunning;
    backupBtn.classList.toggle('busy', !!backupRunning);
  }

  function navigate(p) {
    currentPath = p;
    selection.clear(); anchor = null;
    queue.length = 0;
    renderAll();
  }
  function navigateUp() { if (currentPath) navigate(splitPath(currentPath)[0]); }

  flow.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const i = Number(card.dataset.idx);
    if (i !== active) { go(i); return; }
    const crumb = e.target.closest('.crumb');
    if (crumb) { navigate(crumb.dataset.path); return; }
    if (e.target.closest('[data-act="up"]')) { navigateUp(); return; }
    const item = e.target.closest('.item');
    if (!item) {
      if (e.target.closest('.card-body')) { selection.clear(); syncSelection(); }
      return;
    }
    const p = item.dataset.path;
    if (e.ctrlKey) {
      selection.has(p) ? selection.delete(p) : selection.add(p);
      anchor = p;
    } else if (e.shiftKey && anchor) {
      const all = [...card.querySelectorAll('.item')].map(el => el.dataset.path);
      const [a, b] = [all.indexOf(anchor), all.indexOf(p)].sort((x, y) => x - y);
      selection.clear();
      all.slice(Math.max(a, 0), b + 1).forEach(x => selection.add(x));
    } else {
      selection.clear(); selection.add(p); anchor = p;
    }
    syncSelection();
  });

  const kindOfSelected = p => (itemsFor(active) || []).find?.(it => it.path === p)?.kind;

  flow.addEventListener('dblclick', e => {
    const item = e.target.closest('.card.active .item');
    if (item && kindOfSelected(item.dataset.path) === 'folder') navigate(item.dataset.path);
  });

  /* ---------- Wheel / keyboard ---------- */
  let wheelAcc = 0;
  stage.addEventListener('wheel', e => {
    const vertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
    const body = e.target.closest('.card.active .card-body');
    if (body && vertical && body.scrollHeight > body.clientHeight) return;
    e.preventDefault();
    wheelAcc += vertical ? e.deltaY : e.deltaX;
    if (Math.abs(wheelAcc) >= 80) { go(target + Math.sign(wheelAcc)); wheelAcc = 0; }
  }, { passive: false });

  document.addEventListener('keydown', e => {
    if (!mainReady || $('#main').hidden || document.querySelector('dialog[open]')) return;
    if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); searchInput.focus(); searchInput.select(); return; }
    if (e.target.matches('input, select, textarea')) return;
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); go(target - 1); break;
      case 'ArrowRight': e.preventDefault(); go(target + 1); break;
      case 'Home': go(0); break;
      case 'End': go(snaps.length - 1); break;
      case 'Backspace': navigateUp(); break;
      case 'Escape': selection.clear(); syncSelection(); break;
      case 'Enter': {
        if (selection.size !== 1) break;
        const p = [...selection][0];
        if (kindOfSelected(p) === 'folder') navigate(p);
        break;
      }
      default:
        if (e.altKey && e.key === 'ArrowUp') navigateUp();
        else if (e.ctrlKey && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          cards[active]?.querySelectorAll('.item').forEach(el => selection.add(el.dataset.path));
          syncSelection();
        }
    }
  });

  /* ---------- Scrubber: free drag, gentle flipping ---------- */
  function scrubTo(e) {
    const r = scrubber.getBoundingClientRect();
    const f = clamp((e.clientX - r.left) / r.width, 0, 1);
    go(f * (snaps.length - 1), { snap: false });
  }
  scrubber.addEventListener('pointerdown', e => {
    dragging = true;
    scrubber.classList.add('dragging');
    scrubber.setPointerCapture(e.pointerId);
    thumb.focus({ preventScroll: true });
    scrubTo(e);
  });
  scrubber.addEventListener('pointermove', e => { if (dragging) scrubTo(e); });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    scrubber.classList.remove('dragging');
    go(target);
  };
  scrubber.addEventListener('pointerup', endDrag);
  scrubber.addEventListener('pointercancel', endDrag);

  /* ---------- Snapshot list ---------- */
  async function loadSnapshots({ keepId } = {}) {
    const list = await api.listSnapshots();
    const keep = keepId || snaps[active]?.id || 'now';
    snaps = [...list.sort((a, b) => a.time - b.time), { now: true, id: 'now', time: Date.now() }];
    active = -1;
    buildCards();
    const idx = snaps.findIndex(s => s.id === keep);
    pos = target = idx >= 0 ? idx : snaps.length - 1;
    updateActive();
    measure();
    layout();
  }

  /* ---------- Search: every version, newest first ---------- */
  let results = [], cur = 0, searchTimer = 0, searchSeq = 0;

  async function runSearch() {
    const q = searchInput.value.trim();
    if (!q) { results = []; searchPop.hidden = true; return; }
    const seq = ++searchSeq;
    resultCount.textContent = 'Searching…';
    resultList.innerHTML = '<li class="pop-empty"><span class="spinner" aria-hidden="true"></span></li>';
    searchPop.hidden = false;
    let found;
    try { found = await api.search(q); } catch (err) {
      if (seq !== searchSeq) return;
      resultCount.textContent = 'Search failed';
      resultList.innerHTML = `<li class="pop-empty">${esc(errorText(err))}</li>`;
      return;
    }
    if (seq !== searchSeq) return;
    const index = new Map(snaps.map((s, i) => [s.id, i]));
    results = found.filter(r => index.has(r.snapshotId)).map(r => ({ ...r, idx: index.get(r.snapshotId) }));
    cur = 0;
    renderResults();
    if (results.length) pick(0);
  }

  function renderResults() {
    if (!results.length) {
      resultCount.textContent = 'No results';
      resultList.innerHTML = '<li class="pop-empty">No files match in any backup</li>';
      return;
    }
    resultList.innerHTML = results.map((r, k) =>
      `<li class="result${k === cur ? ' current' : ''}" role="option" data-k="${k}">` +
      `${iconSVG(r.kind)}` +
      `<div><div class="r-name">${esc(r.name)}${r.gone ? '<span class="badge">Deleted</span>' : ''}</div>` +
      `<div class="r-path">${esc(dirLabel(r.dir))}</div></div>` +
      `<div class="r-date">${esc(snapShort(snaps[r.idx]))}</div></li>`
    ).join('');
  }

  function pick(k) {
    if (!results.length) return;
    cur = (k + results.length) % results.length;
    resultCount.textContent = `Result ${cur + 1} of ${results.length}`;
    resultList.querySelectorAll('.result').forEach((el, i) => el.classList.toggle('current', i === cur));
    resultList.children[cur]?.scrollIntoView({ block: 'nearest' });
    const r = results[cur];
    if (currentPath !== r.dir) navigate(r.dir);
    pendingFind = { idx: r.idx, path: r.path };
    go(r.idx);
    if (!raf) settled();
  }

  searchInput.addEventListener('input', () => {
    $('#searchClear').hidden = !searchInput.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 250);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); if (results.length) pick(cur + (e.shiftKey ? -1 : 1)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); pick(cur + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pick(cur - 1); }
    else if (e.key === 'Escape') { searchPop.hidden = true; searchInput.blur(); }
  });
  searchInput.addEventListener('focus', () => { if (searchInput.value.trim() && results.length) searchPop.hidden = false; });
  $('#searchClear').addEventListener('click', () => {
    searchInput.value = ''; $('#searchClear').hidden = true;
    results = []; searchSeq++; searchPop.hidden = true; searchInput.focus();
  });
  $('#resPrev').addEventListener('click', () => pick(cur - 1));
  $('#resNext').addEventListener('click', () => pick(cur + 1));
  resultList.addEventListener('click', e => {
    const li = e.target.closest('.result');
    if (li) pick(Number(li.dataset.k));
  });
  document.addEventListener('pointerdown', e => {
    if (!searchPop.hidden && !e.target.closest('#searchBox')) searchPop.hidden = true;
  });

  /* ---------- Restore files ---------- */
  const conflictDlg = $('#conflictDlg');
  function askConflict(item, s) {
    $('#conflictTitle').textContent = `“${item.name}” already exists`;
    $('#conflictText').textContent =
      `A ${item.kind === 'folder' ? 'folder' : 'file'} with this name is already in ${folderName(splitPath(item.path)[0])}. ` +
      `Keep the original, keep both, or replace it with the version from ${snapTitle(s)}?`;
    return dialogResult(conflictDlg).then(v => v || 'original');
  }

  restoreBtn.addEventListener('click', async () => {
    const s = snaps[active];
    const items = (itemsFor(active) || []).filter?.(it => selection.has(it.path)) || [];
    if (!items.length || s.now) return;
    restoreBtn.disabled = true;
    let done = 0, msg = '';
    try {
      for (const item of items) {
        const exists = await api.existsNow(item.path);
        const choice = exists ? await askConflict(item, s) : 'replace';
        if (choice === 'original') continue;
        const [r] = await api.restore(s.id, [item.path], choice === 'both' ? 'keep-both' : 'replace');
        msg = choice === 'both'
          ? `Restored as “${r.name}” in ${folderName(splitPath(r.path)[0])}`
          : `Restored “${item.name}” to ${folderName(splitPath(item.path)[0])}`;
        done++;
      }
    } catch (err) {
      toast(`Couldn’t restore: ${errorText(err)}`);
    } finally {
      updateButtons();
    }
    if (!done) return;
    invalidateNow();
    const nowIdx = snaps.length - 1;
    updateCardBody(nowIdx);
    requestListing('now', currentPath, 0);
    toast(done === 1 ? msg : `Restored ${done} items`);
  });

  /* ---------- Backup now ---------- */
  function setBackupRunning(kind, percent) {
    backupRunning = kind;
    backupLabel.textContent = kind
      ? (percent != null && kind !== 'pre-restore' ? `Backing Up… ${Math.floor(percent)}%` : 'Backing Up…')
      : 'Backup Now';
    updateButtons();
  }

  backupBtn.addEventListener('click', async () => {
    if (backupRunning) return;
    setBackupRunning('manual');
    try { await api.backupNow(); } catch (err) {
      setBackupRunning(null);
      toast(err.code === 'destination-missing' ? errorText(err) : `Couldn’t start a backup: ${errorText(err)}`);
    }
  });

  onEvent(ev => {
    if (!mainReady) return;
    switch (ev.type) {
      case 'job-started': setBackupRunning(ev.job); break;
      case 'progress': setBackupRunning(ev.job, ev.percent); break;
      case 'job-finished':
        setBackupRunning(null);
        if (ev.ok && ev.job === 'manual') toast('Backup complete');
        else if (!ev.ok && ev.code !== 'cancelled' && ev.job !== 'pre-restore') toast(`Backup failed: ${ev.error || ev.code}`);
        break;
      case 'snapshots-changed':
        invalidateNow();
        loadSnapshots().catch(err => toast(errorText(err)));
        break;
      case 'warning': toast(ev.message || 'Warning from Time Turner'); break;
      case 'daemon-disconnected': showServiceError({ message: "Lost contact with Time Turner's background service." }); break;
      default: break;
    }
  });

  /* ---------- Restore System ----------
     Are you sure? → password (Ubuntu's prompt; a stand-in in the preview) →
     safety backup → 60-second countdown → restart into the restore. */
  const sysConfirmDlg = $('#sysConfirmDlg'), authDlg = $('#authDlg'), sysProgDlg = $('#sysProgDlg');
  const RESTART_SECONDS = 60;
  let sysTimer = 0, sysPhase = '', sysTarget = null, sysToken = null, sysOff = null;

  function askSysConfirm(s) {
    $('#sysConfirmText').textContent =
      `Everything on this computer, including your home folder, will return to how it was on ${snapTitle(s)}. ` +
      'Time Turner will back up your current system first, so you can undo this.';
    return dialogResult(sysConfirmDlg).then(v => v === 'restore');
  }

  // Preview only: stand-in for Ubuntu's password dialog.
  function askPasswordPreview() {
    const pass = $('#authPass');
    pass.value = '';
    $('#authError').hidden = true;
    setTimeout(() => pass.focus(), 0);
    return dialogResult(authDlg).then(v => v === 'auth');
  }
  authDlg.querySelector('form').addEventListener('submit', e => {
    if (e.submitter?.value === 'auth' && !$('#authPass').value) { e.preventDefault(); $('#authError').hidden = false; }
  });

  function sysProgress(title, text) {
    $('#sysProgTitle').textContent = title;
    $('#sysProgText').textContent = text;
  }

  function showSafetyBackup() {
    sysPhase = 'backup';
    $('#sysCountdown').hidden = true;
    $('#sysProgBar').hidden = false;
    $('#sysProgMeta').hidden = false;
    $('#sysRestartNow').hidden = true;
    $('#sysProgFill').style.width = '0%';
    $('#sysProgLeft').textContent = 'Preparing…';
    $('#sysProgRight').textContent = '';
    sysProgress('Backing up your current system', 'This is your safety net. You’ll be able to return to this moment later.');
    if (!sysProgDlg.open) sysProgDlg.showModal();
  }

  function startCountdown() {
    sysPhase = 'countdown';
    let left = RESTART_SECONDS;
    $('#sysProgBar').hidden = true;
    $('#sysProgMeta').hidden = true;
    $('#sysCountdown').hidden = false;
    $('#sysRestartNow').hidden = false;
    const draw = () => {
      $('#sysCountdown').textContent = String(left);
      sysProgress('Ready to restore',
        `Your computer will restart in ${left} second${left === 1 ? '' : 's'} and return to ${snapTitle(sysTarget)}.`);
    };
    draw();
    $('#sysRestartNow').focus();
    sysTimer = setInterval(() => {
      left--;
      if (left <= 0) { clearInterval(sysTimer); restartNow(); return; }
      draw();
    }, 1000);
  }

  async function restartNow() {
    clearInterval(sysTimer);
    if (sysPhase !== 'countdown') return;
    sysPhase = 'restarting';
    $('#sysRestartNow').disabled = true;
    $('#sysCancel').disabled = true;
    sysProgress('Restarting…', 'Time Turner will restore your system while your computer starts up. Don’t turn it off.');
    try {
      await api.commitSystemRestore(sysToken);
      if (MOCK) endSysRestore(`Preview: the computer would now restart and restore ${snapTitle(sysTarget)}.`);
    } catch (err) {
      endSysRestore(`Couldn’t start the restore: ${errorText(err)}`);
    }
  }

  function endSysRestore(message) {
    clearInterval(sysTimer);
    sysOff?.(); sysOff = null;
    sysPhase = '';
    sysRestoreRunning = false;
    sysToken = null;
    $('#sysRestartNow').disabled = false;
    $('#sysCancel').disabled = false;
    if (sysProgDlg.open) sysProgDlg.close();
    updateButtons();
    if (message) toast(message, 5000);
  }

  function cancelSysRestore() {
    if (sysPhase === 'restarting') return;
    const hadBackup = sysPhase === 'countdown';
    const token = sysToken;
    endSysRestore(hadBackup ? 'System restore canceled. Your safety backup was kept.' : 'System restore canceled.');
    if (token) api.cancelSystemRestore(token).catch(() => {});
  }

  restoreSysBtn.addEventListener('click', async () => {
    const s = snaps[active];
    if (!s || s.now || sysRestoreRunning) return;
    if (!(await askSysConfirm(s))) return;
    if (MOCK && !(await askPasswordPreview())) return;
    sysRestoreRunning = true;
    sysTarget = s;
    updateButtons();
    // Ubuntu's password prompt appears while this call is in progress.
    sysOff = onEvent(ev => {
      if (ev.type === 'progress' && ev.job === 'pre-restore' && sysPhase === 'backup') {
        $('#sysProgFill').style.width = `${ev.percent}%`;
        $('#sysProgLeft').textContent = ev.step ? ev.step : ev.totalBytes ? `${fmtSize(ev.bytesDone)} of ${fmtSize(ev.totalBytes)}` : 'Backing up…';
        $('#sysProgRight').textContent = ev.secondsRemaining != null ? `About ${Math.max(1, Math.ceil(ev.secondsRemaining / 60))} min left` : '';
      } else if (ev.type === 'system-restore-ready' && ev.token === sysToken) {
        $('#sysProgFill').style.width = '100%';
        startCountdown();
      } else if (ev.type === 'system-restore-failed') {
        endSysRestore(`Safety backup failed, so nothing was restored: ${ev.error || ev.code}`);
      }
    });
    try {
      const { token } = await api.prepareSystemRestore(s.id, snapTitle(s));
      sysToken = token;
      showSafetyBackup();
    } catch (err) {
      endSysRestore(errorText(err));
    }
  });

  $('#sysCancel').addEventListener('click', cancelSysRestore);
  $('#sysRestartNow').addEventListener('click', restartNow);
  sysProgDlg.addEventListener('cancel', e => { e.preventDefault(); cancelSysRestore(); });

  /* ---------- Settings ---------- */
  const settingsDlg = $('#settingsDlg');
  let settingsBusy = false;
  async function openSettings() {
    settingsDlg.showModal();
    try {
      const { config, space } = await api.getSettings();
      if (!config) return;
      $('#setAuto').checked = !!config.auto;
      $('#setFreq').value = config.frequency;
      const dest = config.destination || {};
      $('#prefsDest').textContent = `${dest.label || dest.url || 'Backup drive'}${space ? ` · ${fmtSize(space.free)} free` : ''}`;
      const locs = [];
      if (config.include?.system) locs.push(['s-drive', 'System files and applications', '/']);
      if (config.include?.home) locs.push(['s-home', 'Home folder', '~']);
      for (const p of config.include?.extra || []) locs.push(['s-folder', p.split('/').pop() || p, p]);
      $('#prefsLocations').innerHTML = locs.map(([icon, title, sub]) =>
        `<div class="row"><span class="row-icon">${sym(icon)}</span><span class="row-text"><span class="row-title">${esc(title)}</span><span class="row-sub">${esc(sub)}</span></span></div>`).join('');
      if (space?.total) {
        const used = space.total - space.free;
        $('#prefsStorage').textContent = `${fmtSize(used)} of ${fmtSize(space.total)} used`;
        $('#prefsMeter').style.width = `${Math.round(used / space.total * 100)}%`;
      } else {
        $('#prefsStorage').textContent = 'Backup drive not connected';
        $('#prefsMeter').style.width = '0%';
      }
    } catch (err) { toast(errorText(err)); }
  }
  async function saveSettings(patch) {
    if (settingsBusy) return;
    settingsBusy = true;
    try { await api.setSettings(patch); } catch (err) {
      toast(`Couldn’t save: ${errorText(err)}`);
      openSettings();
    } finally { settingsBusy = false; }
  }
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#setAuto').addEventListener('change', e => saveSettings({ auto: e.target.checked }));
  $('#setFreq').addEventListener('change', e => saveSettings({ frequency: e.target.value }));
  $('#setChangeDest').addEventListener('click', () => {
    settingsDlg.close();
    showWizard({ startAt: 'destination' });
  });

  window.addEventListener('resize', () => { measure(); layout(); });
  // Files on disk may have changed while the window was in the background.
  window.addEventListener('focus', () => {
    if (!mainReady) return;
    invalidateNow();
    if (snaps[active]?.now) updateCardBody(active);
    requestVisible();
  });

  async function initMain() {
    if (!mainReady) {
      mainReady = true;
      pos = target = 0;
    }
    await loadSnapshots({ keepId: 'now' });
    const status = await api.getStatus().catch(() => null);
    if (status?.running) setBackupRunning(status.running.kind);
    if (status?.lastRestore) {
      const r = status.lastRestore;
      toast(r.ok ? `Your system was restored${r.label ? ` to ${r.label}` : ''}.` : `The system restore didn’t finish: ${r.message || 'see the system log'}`, 8000);
      api.acknowledgeLastRestore?.().catch(() => {});
    }
  }

  /* ======================================================================
     Setup wizard
     ====================================================================== */
  const FREQS = [
    ['hourly', 'Every hour', 'Recommended'],
    ['6h', 'Every 6 hours', ''],
    ['daily', 'Once a day', ''],
    ['weekly', 'Once a week', ''],
  ];
  const FLOWS = {
    setup: ['welcome', 'destination', 'targets', 'frequency', 'first-backup'],
    adopt: ['welcome', 'destination', 'targets', 'frequency', 'enter-key', 'first-backup'],
    restore: ['welcome', 'restore-source', 'enter-key', 'restore-pick', 'restore-ready'],
  };
  const META = {
    welcome: ['Welcome to Time Turner', 'Back up your whole computer, and step back in time whenever you need to.'],
    destination: ['Choose a backup destination', 'Any connected drive or network location works.'],
    targets: ['Choose what to back up', 'You can change this later in Settings.'],
    frequency: ['How often should Time Turner back up?', 'Each backup only copies what changed since the last one.'],
    'recovery-key': ['Save your recovery key', 'You’ll need it to restore onto a new or wiped computer. Time Turner can’t recover it for you.'],
    'enter-key': ['Enter your recovery key', 'These backups were made by an earlier version of Time Turner. Enter the recovery key you saved then. You won’t need it again.'],
    'first-backup': ['Setting up Time Turner', ''],
    'restore-source': ['Where is your backup?', 'Choose the drive that holds your Time Turner backups.'],
    'restore-pick': ['Choose a point in time', 'This computer will be returned to exactly this moment.'],
    'restore-ready': ['Ready to restore', ''],
  };

  const wiz = {
    mode: 'setup', step: 0, startAt: null,
    drives: null, dest: null, network: null, freq: 'hourly',
    targets: [
      { id: 'system', icon: 's-drive', name: 'System files and applications', detail: '/  — everything needed to rebuild palOS', on: true },
      { id: 'home', icon: 's-home', name: 'Home folder', detail: '~  — your documents, settings and files', on: true },
    ],
    recoveryKey: null, enteredKey: '', saved: false,
    sources: null, source: null, openToken: null, points: null, point: null,
    progressOff: null, busy: false,
  };
  const wizBody = $('#wizBody'), wizNext = $('#wizNext'), wizBack = $('#wizBack');
  const steps = () => FLOWS[wiz.mode];
  const stepName = () => steps()[wiz.step];

  function radioRow(name, value, checked, icon, title, detail, { disabled = false, warn = false } = {}) {
    return `<label class="row activatable${disabled ? ' disabled' : ''}">` +
      (icon ? `<span class="row-icon">${sym(icon)}</span>` : '') +
      `<span class="row-text"><span class="row-title">${esc(title)}</span>` +
      (detail ? `<span class="row-sub${warn ? ' warn' : ''}">${esc(detail)}</span>` : '') +
      `</span><input type="radio" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}></label>`;
  }
  const loadingRow = text => `<div class="row"><span class="row-icon"><span class="spinner"></span></span><span class="row-text"><span class="row-sub">${esc(text)}</span></span></div>`;

  function driveDetail(d) {
    const kind = d.removable ? (d.transport === 'usb' ? 'USB drive' : 'External disk') : d.sameDiskAsSystem ? 'Same disk as palOS' : 'Internal disk';
    const free = d.free != null ? `${fmtSize(d.free)} free` : d.size ? `${fmtSize(d.size)}` : '';
    return [kind, d.fstype?.toUpperCase(), free].filter(Boolean).join(' · ');
  }
  const driveIcon = d => (d.removable ? 's-usb' : 's-drive');

  function wizRender() {
    wiz.progressOff?.(); wiz.progressOff = null;
    const step = stepName();
    const [title, sub] = META[step];
    $('#wizTitle').textContent = title;
    $('#wizSub').textContent = sub;
    $('#wizSub').hidden = !sub;

    const dots = steps().slice(1);
    $('#wizSteps').innerHTML = wiz.step === 0 ? '' : dots.map((_, k) =>
      `<li class="${k + 1 < wiz.step ? 'done' : k + 1 === wiz.step ? 'current' : ''}"></li>`).join('');

    const tplId = step === 'first-backup' || step === 'restore-ready' ? 'tpl-progress' : `tpl-${step}`;
    wizBody.replaceChildren($(`#${tplId}`).content.cloneNode(true));
    wizBody.scrollTop = 0;

    const progress = step === 'first-backup' || step === 'restore-ready';
    // Opened from Settings ("Change…"): the first step offers Cancel instead of Back.
    const canCancel = !!wiz.startAt && step === wiz.startAt;
    wizBack.textContent = canCancel ? 'Cancel' : 'Back';
    wizBack.hidden = !canCancel && (wiz.step === 0 || progress || step === 'recovery-key');
    wizNext.disabled = false;
    wizNext.textContent = {
      frequency: 'Start Backup', 'restore-pick': 'Restore', 'first-backup': 'Open Time Turner', 'restore-ready': 'Restart Now',
      'enter-key': wiz.mode === 'adopt' ? 'Use These Backups' : 'Unlock',
    }[step] || 'Continue';

    ({
      welcome: stepWelcome, destination: stepDestination, targets: stepTargets, frequency: stepFrequency,
      'recovery-key': stepRecoveryKey, 'enter-key': stepEnterKey, 'first-backup': stepFirstBackup,
      'restore-source': stepSource, 'restore-pick': stepPick, 'restore-ready': stepRestoreReady,
    })[step]();
  }

  function stepWelcome() {
    wizBody.querySelectorAll('input[name="mode"]').forEach(r => {
      r.checked = r.value === (wiz.mode === 'adopt' ? 'setup' : wiz.mode);
      r.addEventListener('change', () => { wiz.mode = r.value; });
    });
  }

  async function stepDestination() {
    const list = $('#destList');
    const warn = $('#destWarn');
    const sync = () => {
      const d = wiz.drives?.find(x => x.uuid === wiz.dest);
      warn.hidden = !(d && d.sameDiskAsSystem);
      wizNext.disabled = !wiz.dest;
    };
    const draw = () => {
      const rows = (wiz.drives || []).map(d => radioRow('dest', d.uuid, d.uuid === wiz.dest, driveIcon(d), d.label, driveDetail(d), { warn: d.sameDiskAsSystem }));
      if (wiz.network) rows.push(radioRow('dest', 'network', wiz.dest === 'network', 's-network', wiz.network.label, `Network share · ${wiz.network.url}`));
      list.innerHTML = rows.join('') || '<div class="row"><span class="row-text"><span class="row-sub">No drives found. Connect a USB drive, or use a network location below.</span></span></div>';
      sync();
    };
    list.addEventListener('change', e => { wiz.dest = e.target.value; sync(); });

    const addr = $('#netAddress'), creds = $('#netCreds');
    if (wiz.network) addr.value = `smb:${wiz.network.url}`;
    const showCreds = () => { creds.hidden = !/^smb:\/\//i.test(addr.value.trim()); };
    addr.addEventListener('input', showCreds);
    showCreds();
    $('#netConnect').addEventListener('click', () => {
      const raw = addr.value.trim();
      const m = /^smb:(\/\/[^/\s]+\/[^\s]+?)\/?$/i.exec(raw);
      if (!m) { toast('Enter a network address like smb://server/share'); return; }
      wiz.network = {
        url: m[1], label: m[1].replace(/^\/\//, '').split('/')[0],
        username: $('#netUser').value.trim(), password: $('#netPass').value,
      };
      wiz.dest = 'network';
      draw();
    });

    wizNext.disabled = !wiz.dest;
    if (!wiz.drives) {
      list.innerHTML = loadingRow('Looking for drives…');
      try {
        wiz.drives = await api.listDrives();
        if (!wiz.dest) wiz.dest = wiz.drives.find(d => d.removable)?.uuid || null;
      } catch (err) {
        wiz.drives = [];
        toast(errorText(err));
      }
      if (stepName() !== 'destination') return;
    }
    draw();
  }

  function stepTargets() {
    const list = $('#targetList');
    const draw = () => {
      list.innerHTML = wiz.targets.map((t, k) =>
        `<label class="row activatable"><span class="row-icon">${sym(t.icon)}</span>` +
        `<span class="row-text"><span class="row-title">${esc(t.name)}</span><span class="row-sub">${esc(t.detail)}</span></span>` +
        (t.removable ? `<button class="btn flat icon-btn small" type="button" data-remove="${k}" title="Remove" aria-label="Remove">${sym('s-x')}</button>` : '') +
        `<input type="checkbox" data-k="${k}"${t.on ? ' checked' : ''}></label>`).join('');
      wizNext.disabled = !wiz.targets.some(t => t.on);
    };
    list.addEventListener('change', e => { const k = e.target.dataset.k; if (k != null) { wiz.targets[k].on = e.target.checked; draw(); } });
    list.addEventListener('click', e => {
      const b = e.target.closest('[data-remove]');
      if (b) { e.preventDefault(); wiz.targets.splice(Number(b.dataset.remove), 1); draw(); }
    });
    $('#addFolder').addEventListener('click', async () => {
      const picked = await api.pickFolder().catch(() => null);
      if (!picked || wiz.targets.some(t => t.id === picked.path)) return;
      wiz.targets.push({ id: picked.path, icon: 's-folder', name: picked.name, detail: picked.path, on: true, removable: true });
      draw();
    });
    draw();
  }

  function stepFrequency() {
    const list = $('#freqList');
    list.innerHTML = FREQS.map(([id, label, detail]) => radioRow('freq', id, id === wiz.freq, null, label, detail)).join('');
    list.addEventListener('change', e => { wiz.freq = e.target.value; });
  }

  function setupOptions(recoveryKey) {
    const destination = wiz.dest === 'network'
      ? { type: 'smb', url: wiz.network.url, label: wiz.network.label, username: wiz.network.username, password: wiz.network.password }
      : (() => { const d = wiz.drives.find(x => x.uuid === wiz.dest); return { type: 'local', uuid: d.uuid, label: d.label, fstype: d.fstype }; })();
    return {
      destination,
      frequency: wiz.freq,
      include: {
        system: wiz.targets.find(t => t.id === 'system')?.on || false,
        home: wiz.targets.find(t => t.id === 'home')?.on || false,
        extra: wiz.targets.filter(t => t.removable && t.on).map(t => t.id),
      },
      recoveryKey,
    };
  }

  // "Start Backup": create (or open) the backup repository, then show the key.
  async function runSetup(recoveryKey) {
    wiz.busy = true;
    wizNext.disabled = true;
    wizBack.disabled = true;
    const label = wizNext.textContent;
    wizNext.innerHTML = '<span class="spinner" aria-hidden="true"></span> Setting Up…';
    try {
      const res = await api.setup(setupOptions(recoveryKey));
      wiz.recoveryKey = res.recoveryKey || null;
      return res;
    } finally {
      wiz.busy = false;
      wizBack.disabled = false;
      wizNext.textContent = label;
      wizNext.disabled = false;
    }
  }

  function stepRecoveryKey() {
    $('#recoveryKey').textContent = wiz.recoveryKey || '';
    const box = $('#keySaved');
    box.checked = wiz.saved;
    wizNext.disabled = !box.checked;
    box.addEventListener('change', () => { wiz.saved = box.checked; wizNext.disabled = !box.checked; });
    $('#copyKey').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(wiz.recoveryKey); toast('Recovery key copied'); } catch { toast('Couldn’t copy; select the key and copy it by hand'); }
    });
  }

  function stepEnterKey() {
    const input = $('#keyInput');
    input.value = wiz.enteredKey;
    const sync = () => { wiz.enteredKey = input.value; wizNext.disabled = input.value.replace(/[^0-9a-z]/gi, '').length < 16; };
    input.addEventListener('input', sync);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !wizNext.disabled) wizNext.click(); });
    sync();
    setTimeout(() => input.focus(), 0);
  }

  function progressStep({ title, sub }) {
    $('#progTitle').textContent = title;
    $('#progSub').textContent = sub;
  }

  async function stepFirstBackup() {
    const wrap = wizBody.querySelector('.progress-step');
    progressStep({ title: 'This is your first backup!', sub: 'Hang tight, this can take a while.' });
    wizNext.disabled = true;
    $('#progLeft').textContent = 'Starting…';
    wiz.progressOff = onEvent(ev => {
      if (ev.type === 'progress' && (ev.job === 'first' || ev.job === 'manual' || ev.job === 'auto')) {
        $('#progFill').style.width = `${ev.percent}%`;
        $('#progLeft').textContent = ev.step ? ev.step : ev.totalBytes ? `${fmtSize(ev.bytesDone)} of ${fmtSize(ev.totalBytes)}` : 'Backing up…';
        const m = ev.secondsRemaining != null ? Math.max(1, Math.ceil(ev.secondsRemaining / 60)) : null;
        $('#progRight').textContent = m ? `About ${m} minute${m === 1 ? '' : 's'} left` : '';
      } else if (ev.type === 'job-finished') {
        if (ev.ok) {
          $('#progFill').style.width = '100%';
          wrap.classList.add('done');
          progressStep({ title: 'Your first backup is complete', sub: `Time Turner will now back up ${FREQS.find(f => f[0] === wiz.freq)[1].toLowerCase()}.` });
          $('#progLeft').textContent = '';
          $('#progRight').textContent = 'Done';
        } else {
          wrap.classList.add('done');
          progressStep({ title: 'The first backup didn’t finish', sub: `${ev.error || ev.code}. Time Turner will try again automatically.` });
        }
        wizNext.disabled = false;
        wizNext.focus();
      }
    });
    try { await api.backupNow(); } catch (err) {
      if (err.code !== 'busy') {
        wrap.classList.add('done');
        progressStep({ title: 'Couldn’t start the first backup', sub: `${errorText(err)}. Time Turner will try again automatically.` });
        wizNext.disabled = false;
      }
    }
  }

  async function stepSource() {
    const list = $('#srcList');
    const draw = () => {
      list.innerHTML = wiz.sources.length
        ? wiz.sources.map(d => radioRow('src', d.uuid, d.uuid === wiz.source, driveIcon(d), d.label, `${driveDetail(d)} · Time Turner backups found`)).join('')
        : '<div class="row"><span class="row-text"><span class="row-title">No backups found</span><span class="row-sub">Connect the drive that holds your Time Turner backups, then go back and try again.</span></span></div>';
      wizNext.disabled = !wiz.source;
    };
    list.addEventListener('change', e => { wiz.source = e.target.value; wiz.openToken = null; wizNext.disabled = false; });
    wizNext.disabled = true;
    if (!wiz.sources) {
      list.innerHTML = loadingRow('Looking for backups…');
      try { wiz.sources = await api.scanBackups(); } catch (err) { wiz.sources = []; toast(errorText(err)); }
      if (stepName() !== 'restore-source') return;
    }
    draw();
  }

  function stepPick() {
    const list = $('#pickList');
    const hosts = new Set(wiz.points.map(p => p.host));
    const points = [...wiz.points].sort((a, b) => b.time - a.time);
    if (wiz.point == null && points[0]) wiz.point = points[0].id;
    list.innerHTML = points.map(s => radioRow('point', s.id, s.id === wiz.point, null, snapTitle(s),
      [hosts.size > 1 ? s.host : '', s.full ? 'Full system image' : '', REASONS[s.kind]].filter(Boolean).join(' · '))).join('');
    list.addEventListener('change', e => { wiz.point = e.target.value; });
    wizNext.disabled = !points.length;
  }

  function stepRestoreReady() {
    const wrap = wizBody.querySelector('.progress-step');
    wrap.classList.add('done');
    const p = wiz.points.find(x => x.id === wiz.point);
    progressStep({
      title: 'Ready to restore this computer',
      sub: `Time Turner will restore ${p ? snapTitle(p) : 'your backup'} while your computer restarts. This can take a while. Keep it plugged in and don’t turn it off.`,
    });
    wizBody.querySelector('.progressbar').hidden = true;
    wizBody.querySelector('.progress-meta').hidden = true;
  }

  async function wizNextStep() {
    if (wiz.busy) return;
    const step = stepName();
    try {
      if (step === 'frequency') {
        try {
          await runSetup();
          wiz.mode = 'setup';
        } catch (err) {
          if (err.code !== 'needs-key') throw err;
          // The drive already has backups: switch to the "enter key" path.
          wiz.mode = 'adopt';
          toast(errorText(err), 5000);
        }
      } else if (step === 'enter-key' && wiz.mode === 'adopt') {
        await runSetup(wiz.enteredKey);
      } else if (step === 'restore-source') {
        // the key travels with the backups: open them straight away (only older backups need a key typed)
        wiz.busy = true;
        wizNext.disabled = true;
        let opened = false;
        try {
          const res = await api.openBackup(wiz.source, '');
          wiz.openToken = res.token;
          wiz.points = res.snapshots;
          wiz.point = null;
          opened = true;
        } catch (err) {
          if (err.code !== 'needs-key' && err.code !== 'wrong-key') throw err;
        } finally { wiz.busy = false; wizNext.disabled = false; }
        if (opened) { wiz.keyless = true; wiz.step += 2; wizRender(); return; }
        wiz.keyless = false;
      } else if (step === 'enter-key' && wiz.mode === 'restore') {
        wiz.busy = true;
        wizNext.disabled = true;
        try {
          const res = await api.openBackup(wiz.source, wiz.enteredKey);
          wiz.openToken = res.token;
          wiz.points = res.snapshots;
          wiz.point = null;
        } finally { wiz.busy = false; wizNext.disabled = false; }
      } else if (step === 'restore-pick') {
        const p = wiz.points.find(x => x.id === wiz.point);
        await api.stageMachineRestore(wiz.openToken, wiz.point, p ? snapTitle(p) : '');
      } else if (step === 'restore-ready') {
        wizNext.disabled = true;
        await api.restartForRestore();
        if (MOCK) { toast('Preview: the computer would now restart and restore this backup.', 5000); showMain(); }
        return;
      } else if (step === 'first-backup') {
        showMain();
        return;
      }
    } catch (err) {
      toast(err.code === 'wrong-key' ? 'That recovery key doesn’t open these backups.' : errorText(err), 5000);
      return;
    }
    wiz.step++;
    wizRender();
  }

  wizNext.addEventListener('click', wizNextStep);
  wizBack.addEventListener('click', () => {
    if (wiz.busy) return;
    if (wiz.startAt && stepName() === wiz.startAt) { showMain(); return; }
    if (wiz.step === 0) return;
    wiz.step--;
    if (stepName() === 'enter-key' && wiz.keyless) wiz.step--;   // that step was skipped on the way here
    if (stepName() === 'frequency' && wiz.mode === 'adopt') wiz.mode = 'setup';
    wizRender();
  });

  /* ======================================================================
     Screens
     ====================================================================== */
  function showWizard({ startAt = null } = {}) {
    $('#main').hidden = true;
    $('#wizard').hidden = false;
    wiz.mode = 'setup';
    wiz.startAt = startAt;
    wiz.step = startAt ? FLOWS.setup.indexOf(startAt) : 0;
    wiz.drives = null;
    wiz.sources = null;
    wiz.saved = false;
    wizRender();
  }

  async function showMain() {
    wiz.progressOff?.();
    $('#wizard').hidden = true;
    $('#main').hidden = false;
    try { await initMain(); } catch (err) { showServiceError(err); }
    measure(); layout();
  }

  async function start() {
    initWallpaper();
    let status;
    try { status = await api.getStatus(); } catch (err) { showServiceError(err); return; }
    status.configured ? showMain() : showWizard();
  }

  window.TimeTurnerUI = { showWizard, showMain };
  start();
})();

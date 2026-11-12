'use strict';
/* Design surface shared by the form designer and the report designer.
   Layers are plain boxes (the form canvas, or one per report band) holding absolutely positioned controls. */

const uid = () => 'c' + Math.random().toString(36).slice(2, 9);

function ctlCss(c) {
  const s = [];
  if (c.fs) s.push(`font-size:${c.fs}px`);
  if (c.b) s.push('font-weight:700');
  if (c.i) s.push('font-style:italic');
  if (c.u) s.push('text-decoration:underline');
  if (c.al) s.push(`text-align:${c.al}`);
  if (c.fg) s.push(`color:${c.fg}`);
  if (c.bg) s.push(`background:${c.bg}`);
  if (c.bw) s.push(`border:${c.bw}px ${c.bd || 'solid'} ${c.bc || 'currentColor'}`);
  if (c.rad) s.push(`border-radius:${c.rad}px`);
  return s.join(';');
}

class Surface {
  constructor(o) {
    Object.assign(this, { grid: 8, snap: true, tool: null, across: false, sel: new Set(), clip: [], hist: [], idx: -1, pasteN: 0, cur: null }, o);
    const host = this.host;
    host.tabIndex = 0;
    host.addEventListener('mousedown', e => this.down(e));
    host.addEventListener('keydown', e => this.key(e));
    host.addEventListener('dblclick', e => { const el = e.target.closest('.dctl'); if (el && this.open) this.open(this.find(el.dataset.id)?.c); });
    this.setGrid(this.grid, this.snap);
  }

  /* ----- model access ----- */
  all() { return this.layers().flatMap(L => L.controls.map(c => ({ c, L }))); }
  find(id) { return this.all().find(x => x.c.id === id) || null; }
  layer(id) { return this.layers().find(L => String(L.id) === String(id)); }
  selected() { return [...this.sel].map(id => this.find(id)).filter(Boolean); }
  primary() { const s = this.selected(); return s.length ? s[0].c : null; }
  sn(v) { return this.snap ? Math.round(v / this.grid) * this.grid : Math.round(v); }
  setGrid(n, snap) {
    this.grid = n; this.snap = snap;
    this.host.style.setProperty('--grid', n + 'px');
  }

  /* ----- drawing ----- */
  place(el, c) { el.style.cssText = `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px`; }
  mk(c, L) {
    const el = h('div', { class: 'dctl t-' + c.type + (this.sel.has(c.id) ? ' sel' : ''), 'data-id': c.id });
    this.place(el, c);
    el.append(h('div', { class: 'dc' }, this.paint(c, L)));
    if (this.sel.size === 1 && this.sel.has(c.id)) for (const k of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) el.append(h('span', { class: 'dh h-' + k, 'data-h': k }));
    return el;
  }
  draw() {
    this.sel = new Set([...this.sel].filter(id => this.find(id)));
    for (const L of this.layers()) {
      L.el.querySelectorAll(':scope > .dctl').forEach(x => x.remove());
      for (const c of L.controls) L.el.append(this.mk(c, L));
    }
  }
  refresh(c) {
    const f = this.find(c.id);
    const old = this.host.querySelector(`.dctl[data-id="${c.id}"]`);
    if (f && old) old.replaceWith(this.mk(c, f.L));
  }
  select(ids, add) {
    const before = new Set(this.sel);
    this.sel = new Set(add ? [...this.sel, ...ids] : ids);
    for (const id of new Set([...before, ...this.sel])) { const f = this.find(id); if (f) this.refresh(f.c); }
    this.onSelect && this.onSelect();
  }

  /* ----- history ----- */
  reset() { this.hist = [this.snapshot()]; this.idx = 0; }
  commit() {
    const s = this.snapshot();
    if (s !== this.hist[this.idx]) {
      this.hist.length = this.idx + 1; this.hist.push(s); this.idx++;
      if (this.hist.length > 200) { this.hist.shift(); this.idx--; }
    }
    this.change && this.change();
  }
  undo() { if (this.idx > 0) this.travel(--this.idx); }
  redo() { if (this.idx < this.hist.length - 1) this.travel(++this.idx); }
  travel(i) {
    this.restore(this.hist[i]);
    this.draw();
    this.change && this.change(true);
    this.onSelect && this.onSelect();
  }

  /* ----- mouse ----- */
  pt(e, L) { const r = L.el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  drag(move, up) {
    const mm = ev => move(ev);
    const mu = ev => { removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); up && up(ev); };
    addEventListener('mousemove', mm); addEventListener('mouseup', mu);
  }

  down(e) {
    if (e.button !== 0) return;
    const lEl = e.target.closest('.dlayer');
    if (!lEl || !this.host.contains(lEl)) {
      if (e.target === this.host) { this.host.focus(); this.select([]); }
      return;
    }
    const L = this.layer(lEl.dataset.layer);
    if (!L) return;
    this.cur = L.id;
    this.host.focus();
    e.preventDefault();
    this.onLayer && this.onLayer(L);
    const hEl = e.target.closest('.dh'), cEl = e.target.closest('.dctl');
    if (hEl && cEl) return this.startResize(e, hEl.dataset.h, this.find(cEl.dataset.id));
    if (cEl) return this.startMove(e, this.find(cEl.dataset.id));
    if (this.tool) return this.startDraw(e, L);
    this.startBand(e, L);
  }

  startMove(e, f) {
    if (!f) return;
    const multi = e.shiftKey || e.ctrlKey || e.metaKey;
    if (multi) { this.select([f.c.id], true); if (!this.sel.has(f.c.id)) return; }
    else if (!this.sel.has(f.c.id)) this.select([f.c.id]);
    const items = this.selected();
    items.sort((a, b) => (a.c === f.c ? -1 : b.c === f.c ? 1 : 0));
    const org = items.map(({ c }) => ({ c, x: c.x, y: c.y }));
    const start = this.pt(e, f.L);
    const minX = Math.min(...org.map(o => o.x)), minY = Math.min(...org.map(o => o.y));
    let moved = false;
    this.drag(ev => {
      const p = this.pt(ev, f.L);
      let dx = p.x - start.x, dy = p.y - start.y;
      if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      moved = true;
      dx = this.sn(org[0].x + dx) - org[0].x; dy = this.sn(org[0].y + dy) - org[0].y;
      dx = Math.max(dx, -minX);
      if (!this.across) dy = Math.max(dy, -minY);
      for (const o of org) { o.c.x = o.x + dx; o.c.y = o.y + dy; }
      for (const { c } of items) { const el = this.host.querySelector(`.dctl[data-id="${c.id}"]`); if (el) { this.place(el, c); el.style.zIndex = 50; } }
    }, ev => {
      if (!moved) return;
      if (this.across) this.reparent(ev, items);
      else for (const { c, L } of items) { if (L.w) c.x = Math.max(0, Math.min(c.x, L.w - c.w)); if (L.h) c.y = Math.max(0, Math.min(c.y, L.h - c.h)); }
      this.draw(); this.commit(); this.onSelect && this.onSelect();
    });
  }

  reparent(ev, items) {
    const under = document.elementsFromPoint(ev.clientX, ev.clientY).find(x => x.classList && x.classList.contains('dlayer') && this.host.contains(x));
    const from = items[0].L;
    if (!under || !items.every(i => i.L === from)) { items.forEach(({ c }) => { c.y = Math.max(0, Math.min(c.y, from.h - c.h)); }); return; }
    const to = this.layer(under.dataset.layer);
    const fr = from.el.getBoundingClientRect(), tr = to.el.getBoundingClientRect();
    for (const { c } of items) {
      if (to !== from) { from.controls.splice(from.controls.indexOf(c), 1); to.controls.push(c); c.y = c.y + fr.top - tr.top; }
      c.y = Math.max(0, Math.min(this.sn(c.y), Math.max(0, to.h - c.h)));
    }
  }

  startResize(e, hd, f) {
    if (!f) return;
    const c = f.c, o = { x: c.x, y: c.y, w: c.w, h: c.h }, start = this.pt(e, f.L);
    const el = () => this.host.querySelector(`.dctl[data-id="${c.id}"]`);
    let moved = false;
    this.drag(ev => {
      const p = this.pt(ev, f.L), dx = p.x - start.x, dy = p.y - start.y;
      moved = true;
      let { x, y, w, h: hh } = o;
      if (hd.includes('e')) w = Math.max(1, this.sn(o.x + o.w + dx) - o.x);
      if (hd.includes('s')) hh = Math.max(1, this.sn(o.y + o.h + dy) - o.y);
      if (hd.includes('w')) { x = Math.min(this.sn(o.x + dx), o.x + o.w - 1); x = Math.max(0, x); w = o.x + o.w - x; }
      if (hd.includes('n')) { y = Math.min(this.sn(o.y + dy), o.y + o.h - 1); y = Math.max(0, y); hh = o.y + o.h - y; }
      Object.assign(c, { x, y, w, h: hh });
      const d = el(); if (d) this.place(d, c);
    }, () => { if (moved) { this.refresh(c); this.commit(); this.onSelect && this.onSelect(); } });
  }

  startDraw(e, L) {
    const s = this.pt(e, L), tool = this.tool;
    const rb = h('div', { class: 'rubber' });
    L.el.append(rb);
    let box = null;
    this.drag(ev => {
      const p = this.pt(ev, L);
      box = { x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) };
      rb.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`;
    }, () => {
      rb.remove();
      const big = box && box.w > 8 && box.h > 5;
      const x = this.sn(big ? box.x : s.x), y = this.sn(big ? box.y : s.y);
      const c = this.make(tool, L, Math.max(0, x), Math.max(0, y), big ? Math.max(this.sn(box.w), 8) : 0, big ? Math.max(this.sn(box.h), 4) : 0);
      if (!c) return;
      c.id = uid();
      L.controls.push(c);
      this.tool = null;
      this.onTool && this.onTool(null);
      this.draw(); this.select([c.id]); this.commit();
    });
  }

  startBand(e, L) {
    const s = this.pt(e, L), add = e.shiftKey || e.ctrlKey || e.metaKey;
    const rb = h('div', { class: 'rubber sel' });
    L.el.append(rb);
    let moved = false;
    if (!add) this.select([]);
    this.drag(ev => {
      const p = this.pt(ev, L);
      const b = { x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) };
      if (b.w > 3 || b.h > 3) moved = true;
      rb.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
      const hit = L.controls.filter(c => c.x < b.x + b.w && c.x + c.w > b.x && c.y < b.y + b.h && c.y + c.h > b.y).map(c => c.id);
      if (moved) this.select(hit, add);
    }, () => rb.remove());
  }

  /* ----- keyboard & commands ----- */
  key(e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key, ctl = e.ctrlKey || e.metaKey;
    const step = e.shiftKey ? this.grid : 1;
    let used = true;
    if (k === 'Delete' || k === 'Backspace') this.del();
    else if (k.startsWith('Arrow') && !ctl) {
      const dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0, dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0;
      this.nudge(dx, dy, e.altKey);
    } else if (ctl && k.toLowerCase() === 'a') this.selectAll();
    else if (ctl && k.toLowerCase() === 'c') this.copy();
    else if (ctl && k.toLowerCase() === 'x') this.cut();
    else if (ctl && k.toLowerCase() === 'v') this.paste();
    else if (ctl && k.toLowerCase() === 'd') this.dup();
    else if (ctl && k.toLowerCase() === 'z' && !e.shiftKey) this.undo();
    else if (ctl && (k.toLowerCase() === 'y' || (k.toLowerCase() === 'z' && e.shiftKey))) this.redo();
    else if (k === 'Escape') { if (this.tool) { this.tool = null; this.onTool && this.onTool(null); } else this.select([]); }
    else used = false;
    if (used) e.preventDefault();
  }

  nudge(dx, dy, resize) {
    const items = this.selected();
    if (!items.length) return;
    for (const { c } of items) {
      if (resize) { c.w = Math.max(1, c.w + dx); c.h = Math.max(1, c.h + dy); }
      else { c.x = Math.max(0, c.x + dx); c.y = Math.max(0, c.y + dy); }
    }
    this.draw(); this.commit(); this.onSelect && this.onSelect();
  }
  selectAll() {
    const L = this.layer(this.cur) || this.layers()[0];
    if (L) this.select(L.controls.map(c => c.id));
  }
  del() {
    const items = this.selected();
    if (!items.length) return;
    for (const { c, L } of items) L.controls.splice(L.controls.indexOf(c), 1);
    this.sel.clear(); this.draw(); this.commit(); this.onSelect && this.onSelect();
  }
  copy() { const s = this.selected(); if (s.length) { this.clip = s.map(x => JSON.parse(JSON.stringify(x.c))); this.pasteN = 0; } return s.length > 0; }
  cut() { if (this.copy()) this.del(); }
  paste() {
    if (!this.clip.length) return;
    const L = this.layer(this.cur) || this.layers()[0];
    this.pasteN++;
    const ids = [];
    for (const src of this.clip) {
      const c = JSON.parse(JSON.stringify(src));
      c.id = uid(); c.x += 12 * this.pasteN; c.y += 12 * this.pasteN;
      L.controls.push(c); ids.push(c.id);
    }
    this.sel = new Set(ids); this.draw(); this.commit(); this.onSelect && this.onSelect();
  }
  dup() { if (this.copy()) this.paste(); }

  align(mode) {
    const items = this.selected();
    if (items.length < 2) return;
    const cs = items.map(x => x.c), ref = cs[0];
    const L = Math.min(...cs.map(c => c.x)), R = Math.max(...cs.map(c => c.x + c.w));
    const T = Math.min(...cs.map(c => c.y)), B = Math.max(...cs.map(c => c.y + c.h));
    for (const c of cs) {
      if (mode === 'left') c.x = L;
      else if (mode === 'right') c.x = R - c.w;
      else if (mode === 'top') c.y = T;
      else if (mode === 'bottom') c.y = B - c.h;
      else if (mode === 'hcenter') c.x = Math.round((L + R) / 2 - c.w / 2);
      else if (mode === 'vcenter') c.y = Math.round((T + B) / 2 - c.h / 2);
    }
    this.draw(); this.commit(); this.onSelect && this.onSelect();
  }
  distribute(axis) {
    const cs = this.selected().map(x => x.c);
    if (cs.length < 3) return;
    const h = axis === 'h';
    cs.sort((a, b) => (h ? a.x - b.x : a.y - b.y));
    const first = cs[0], last = cs[cs.length - 1];
    const total = (h ? last.x + last.w - first.x : last.y + last.h - first.y) - cs.reduce((s, c) => s + (h ? c.w : c.h), 0);
    const gap = total / (cs.length - 1);
    let pos = h ? first.x : first.y;
    for (const c of cs) { if (h) { c.x = Math.round(pos); pos += c.w + gap; } else { c.y = Math.round(pos); pos += c.h + gap; } }
    this.draw(); this.commit(); this.onSelect && this.onSelect();
  }
  size(mode) {
    const cs = this.selected().map(x => x.c);
    if (cs.length < 2) return;
    const ref = cs[0];
    for (const c of cs) { if (mode !== 'h') c.w = ref.w; if (mode !== 'w') c.h = ref.h; }
    this.draw(); this.commit(); this.onSelect && this.onSelect();
  }
  order(front) {
    for (const { c, L } of this.selected()) { L.controls.splice(L.controls.indexOf(c), 1); front ? L.controls.push(c) : L.controls.unshift(c); }
    this.draw(); this.commit();
  }
}

/* ----- property sheet ----- */
function colorField(val, on) {
  const inp = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(val || '') ? val : '#000000', oninput: e => on(e.target.value, false), onchange: e => on(e.target.value, true) });
  return h('span', { class: 'colorf' }, inp, h('button', { class: 'btn mini', title: 'Clear', onclick: () => { on('', true); inp.value = '#000000'; } }, '×'), h('small', {}, val || 'none'));
}

/* items: [{ label, kind, get(), set(v), opts?, min?, max?, hint? } | { section }]
   live(): re-draw while typing, done(): commit to history */
function renderProps(el, items, live, done) {
  const rows = items.map(it => {
    if (it.section) return h('h4', {}, it.section);
    const cur = it.get ? it.get() : undefined;
    let inp;
    const put = (v, final) => { if (it.set) it.set(v); live(); if (final) done(); };
    switch (it.kind) {
      case 'check': inp = h('input', { type: 'checkbox', checked: !!cur, onchange: e => put(e.target.checked, true) }); break;
      case 'num': inp = h('input', { type: 'number', value: cur ?? '', min: it.min, max: it.max, step: it.step || 1, oninput: e => { if (e.target.value !== '') put(Number(e.target.value), false); }, onchange: e => put(e.target.value === '' ? 0 : Number(e.target.value), true) }); break;
      case 'select': inp = h('select', { value: cur ?? '', onchange: e => put(e.target.value, true) }, it.opts.map(o => (Array.isArray(o) ? h('option', { value: o[0] }, o[1]) : h('option', { value: o }, o)))); break;
      case 'color': inp = colorField(cur, put); break;
      case 'btn': inp = h('button', { class: 'btn', onclick: () => it.click(put) }, it.text); break;
      case 'area': inp = h('textarea', { rows: it.rows || 3, value: cur ?? '', oninput: e => put(e.target.value, false), onchange: e => put(e.target.value, true) }); break;
      case 'seg': inp = h('span', { class: 'seg' }, it.opts.map(([v, l]) => h('button', { class: 'btn mini' + (cur === v ? ' on' : ''), onclick: e => { put(cur === v ? '' : v, true); renderProps(el, items, live, done); } }, l))); break;
      case 'toggles': inp = h('span', { class: 'seg' }, it.opts.map(([k, l, st]) => h('button', { class: 'btn mini' + (it.getk(k) ? ' on' : ''), style: st, onclick: () => { it.setk(k, !it.getk(k)); live(); done(); renderProps(el, items, live, done); } }, l))); break;
      default: inp = h('input', { type: 'text', value: cur ?? '', disabled: it.ro, placeholder: it.ph || '', list: it.list, spellcheck: 'false', oninput: e => put(e.target.value, false), onchange: e => put(e.target.value, true) });
    }
    return h('label', { class: 'prow' + (it.kind === 'area' ? ' tall' : '') }, h('span', {}, it.label), inp, it.hint && h('small', {}, it.hint));
  });
  el.replaceChildren(...rows);
}

/* font/colour/border block reused for every text-ish control */
function styleItems(cs) {
  const c = cs[0];
  const all = (fn) => cs.forEach(fn);
  return [
    { section: 'Appearance' },
    { label: 'Font size', kind: 'num', min: 6, max: 96, get: () => c.fs || '', set: v => all(x => { x.fs = v || 0; }) },
    { label: 'Style', kind: 'toggles', opts: [['b', 'B', 'font-weight:700'], ['i', 'I', 'font-style:italic'], ['u', 'U', 'text-decoration:underline']], getk: k => !!c[k], setk: (k, v) => all(x => { x[k] = v; }) },
    { label: 'Align', kind: 'seg', opts: [['left', '⇤'], ['center', '↔'], ['right', '⇥']], get: () => c.al || '', set: v => all(x => { x.al = v; }) },
    { label: 'Text color', kind: 'color', get: () => c.fg || '', set: v => all(x => { x.fg = v; }) },
    { label: 'Fill', kind: 'color', get: () => c.bg || '', set: v => all(x => { x.bg = v; }) },
    { label: 'Border width', kind: 'num', min: 0, max: 12, get: () => c.bw || 0, set: v => all(x => { x.bw = v; }) },
    { label: 'Border color', kind: 'color', get: () => c.bc || '', set: v => all(x => { x.bc = v; }) },
    { label: 'Border style', kind: 'select', opts: [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']], get: () => c.bd || 'solid', set: v => all(x => { x.bd = v; }) },
    { label: 'Rounded corners', kind: 'num', min: 0, max: 60, get: () => c.rad || 0, set: v => all(x => { x.rad = v; }) }
  ];
}

function geomItems(cs) {
  const c = cs[0];
  return [
    { section: 'Position' },
    { label: 'Left', kind: 'num', get: () => c.x, set: v => { c.x = Math.max(0, v); } },
    { label: 'Top', kind: 'num', get: () => c.y, set: v => { c.y = Math.max(0, v); } },
    { label: 'Width', kind: 'num', min: 1, get: () => c.w, set: v => { c.w = Math.max(1, v); } },
    { label: 'Height', kind: 'num', min: 1, get: () => c.h, set: v => { c.h = Math.max(1, v); } }
  ];
}

/* pick an image file and shrink it so the .cdb file stays small */
function pickImage(maxPx = 640) {
  return new Promise((res, rej) => {
    const inp = h('input', { type: 'file', accept: 'image/*' });
    inp.onchange = () => {
      const f = inp.files[0];
      if (!f) return res(null);
      const rd = new FileReader();
      rd.onerror = () => rej(new Error('Could not read that image.'));
      rd.onload = () => {
        const img = new Image();
        img.onerror = () => rej(new Error('That file is not an image.'));
        img.onload = () => {
          const k = Math.min(1, maxPx / Math.max(img.width, img.height));
          const cv = document.createElement('canvas');
          cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          res({ src: cv.toDataURL(f.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.88), w: cv.width, h: cv.height });
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    };
    inp.click();
  });
}

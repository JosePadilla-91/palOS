'use strict';
/* Forms: run view + drag-and-drop designer */

const TOOLS = {
  select: ['↖', 'Select'], label: ['Aa', 'Label'], text: ['ab|', 'Text Box'], check: ['☑', 'Check Box'], combo: ['▾', 'Combo Box'],
  button: ['OK', 'Button'], image: ['▣', 'Image'], rect: ['▭', 'Rectangle'], line: ['—', 'Line']
};
const DEFAULTS = {
  label: { w: 120, h: 24, text: 'Label' }, text: { w: 200, h: 26, src: '' }, check: { w: 20, h: 20, src: '' },
  combo: { w: 200, h: 26, src: '', rs: 'list', items: '' }, button: { w: 110, h: 30, text: 'Button', action: 'next' },
  image: { w: 120, h: 90, img: '' }, rect: { w: 160, h: 80, bw: 1 }, line: { w: 200, h: 2 }
};
function newCtl(tool, x, y, w, ht) {
  const d = DEFAULTS[tool];
  if (!d) return null;
  return { type: tool, x, y, ...d, w: w || d.w, h: ht || d.h };
}

const ACTIONS = [['first', 'First record'], ['prev', 'Previous record'], ['next', 'Next record'], ['last', 'Last record'], ['new', 'New record'], ['save', 'Save record'], ['delete', 'Delete record'],
  ['close', 'Close form'], ['form', 'Open form'], ['report', 'Open report'], ['query', 'Open query'], ['table', 'Open table']];

function toolbox(tools, surf, onPick) {
  const wrap = h('div', { class: 'tools' });
  const draw = () => wrap.replaceChildren(...tools.map(k => h('button', {
    class: 'tool' + ((surf.tool || 'select') === k ? ' on' : ''), title: TOOLS[k][1],
    onclick: () => { surf.tool = k === 'select' ? null : k; draw(); surf.host.focus(); onPick && onPick(); }
  }, h('b', {}, TOOLS[k][0]), h('span', {}, TOOLS[k][1]))));
  draw();
  surf.onTool = draw;
  return wrap;
}

function arrangeBar(surf) {
  const b = (txt, tip, fn) => h('button', { class: 'btn mini', title: tip, onclick: () => { fn(); surf.host.focus(); } }, txt);
  return h('span', { class: 'arrange' },
    b('⇤', 'Align left', () => surf.align('left')), b('↔', 'Align centers', () => surf.align('hcenter')), b('⇥', 'Align right', () => surf.align('right')),
    b('⤒', 'Align top', () => surf.align('top')), b('↕', 'Align middles', () => surf.align('vcenter')), b('⤓', 'Align bottom', () => surf.align('bottom')),
    b('⋯', 'Space evenly across', () => surf.distribute('h')), b('⋮', 'Space evenly down', () => surf.distribute('v')),
    b('W=', 'Same width', () => surf.size('w')), b('H=', 'Same height', () => surf.size('h')),
    b('⬒', 'Bring to front', () => surf.order(true)), b('⬓', 'Send to back', () => surf.order(false)));
}

/* shared by the form and report designers: which property rows each control type gets */
function ctlItems(cs, env) {
  const c = cs[0];
  const t = c.type;
  const same = cs.every(x => x.type === t);
  const items = [];
  if (same) {
    if (t === 'label') items.push({ section: 'Label' }, { label: 'Text', kind: 'area', get: () => c.text, set: v => cs.forEach(x => { x.text = v; }) });
    if (t === 'text') {
      items.push({ section: 'Text box' },
        { label: 'Control source', kind: 'text', list: 'fieldlist', ph: 'Field or =expression', get: () => c.src, set: v => cs.forEach(x => { x.src = v; }) },
        { label: 'Format', kind: 'select', opts: FORMATS, get: () => c.fmt || '', set: v => cs.forEach(x => { x.fmt = v; }) });
      if (env.kind === 'form') items.push({ label: 'Multi-line', kind: 'check', get: () => c.multi, set: v => cs.forEach(x => { x.multi = v; }) }, { label: 'Read only', kind: 'check', get: () => c.ro, set: v => cs.forEach(x => { x.ro = v; }) });
      else items.push({ label: 'Wrap text', kind: 'check', get: () => c.wrap, set: v => cs.forEach(x => { x.wrap = v; }) }, { label: 'Hide duplicates', kind: 'check', get: () => c.hidedup, set: v => cs.forEach(x => { x.hidedup = v; }) });
    }
    if (t === 'check') items.push({ section: 'Check box' }, { label: 'Control source', kind: 'text', list: 'fieldlist', get: () => c.src, set: v => cs.forEach(x => { x.src = v; }) });
    if (t === 'combo') {
      items.push({ section: 'Combo box' }, { label: 'Control source', kind: 'text', list: 'fieldlist', get: () => c.src, set: v => cs.forEach(x => { x.src = v; }) },
        { label: 'Choices from', kind: 'select', opts: [['list', 'Typed list'], ['table', 'Another table']], get: () => c.rs || 'list', set: v => { c.rs = v; env.reprops && env.reprops(); } });
      if ((c.rs || 'list') === 'list') items.push({ label: 'Items', kind: 'area', hint: 'One per line or separated by ;', get: () => c.items || '', set: v => { c.items = v; } });
      else {
        const tcols = env.tableCols(c.lt);
        items.push({ label: 'Table', kind: 'select', opts: [['', '(choose)'], ...S.objs.table], get: () => c.lt || '', set: v => { c.lt = v; c.lv = ''; c.ld = ''; env.reprops && env.reprops(); } },
          { label: 'Stored value', kind: 'select', opts: [['', '(choose)'], ...tcols], get: () => c.lv || '', set: v => { c.lv = v; } },
          { label: 'Shown text', kind: 'select', opts: [['', '(same as value)'], ...tcols], get: () => c.ld || '', set: v => { c.ld = v; } });
      }
    }
    if (t === 'button') {
      const needsT = { form: 'form', report: 'report', query: 'query', table: 'table' }[c.action];
      items.push({ section: 'Button' }, { label: 'Caption', kind: 'text', get: () => c.text, set: v => cs.forEach(x => { x.text = v; }) },
        { label: 'Action', kind: 'select', opts: ACTIONS, get: () => c.action, set: v => { c.action = v; c.target = ''; env.reprops && env.reprops(); } });
      if (needsT) items.push({ label: 'Object', kind: 'select', opts: [['', '(choose)'], ...S.objs[needsT]], get: () => c.target || '', set: v => { c.target = v; } });
    }
    if (t === 'image') items.push({ section: 'Image' }, { label: 'Picture', kind: 'btn', text: c.img ? 'Change…' : 'Choose…', click: async put => {
      try { const r = await pickImage(); if (r) { c.img = r.src; if (!c.fitted) { c.fitted = true; c.h = Math.round(c.w * r.h / r.w); } put(c.img, true); env.reprops && env.reprops(); } } catch (e) { fail(e); }
    } }, { label: 'Remove', kind: 'btn', text: 'Remove picture', click: put => put((c.img = ''), true) });
  }
  if (t === 'line') items.push({ section: 'Line' }, { label: 'Color', kind: 'color', get: () => c.bg || '', set: v => cs.forEach(x => { x.bg = v; }) });
  items.push(...geomItems(cs));
  if (t !== 'line' && t !== 'image') items.push(...styleItems(cs));
  else if (t === 'image') items.push({ section: 'Appearance' }, { label: 'Border width', kind: 'num', min: 0, max: 12, get: () => c.bw || 0, set: v => cs.forEach(x => { x.bw = v; }) });
  return items;
}

/* what a control looks like on the design canvas */
function designNode(c) {
  const css = ctlCss(c);
  const al = c.al ? ' al-' + c.al : '';
  switch (c.type) {
    case 'label': return h('div', { class: 'lbl' + al, style: css }, c.text || '');
    case 'text': return h('div', { class: 'fake' + al, style: css }, c.src ? (Expr.isCalc(c.src) ? c.src : `[${c.src}]`) : h('i', {}, 'Unbound'));
    case 'check': return h('div', { class: 'fakechk' }, c.src ? '☑' : '☐');
    case 'combo': return h('div', { class: 'fake combo', style: css }, h('span', {}, c.src ? `[${c.src}]` : 'Combo box'), h('b', {}, '▾'));
    case 'button': return h('div', { class: 'btn fakebtn' + al, style: css }, c.text || 'Button');
    case 'image': return c.img ? h('img', { src: c.img, draggable: 'false', style: ctlCss({ bw: c.bw, bc: c.bc }) }) : h('div', { class: 'fake imgph' }, '▣ Image');
    case 'rect': return h('div', { class: 'rectc', style: css });
    case 'line': return h('div', { class: 'linec', style: `background:${c.bg || 'currentColor'}` });
  }
  return h('div', {}, c.type);
}

function defaultLayout(cols, name) {
  const controls = [{ id: uid(), type: 'label', x: 24, y: 14, w: 460, h: 34, text: name, fs: 22, b: true }];
  let y = 64;
  for (const c of cols) {
    const long = c.type === 'longtext', chk = c.type === 'yesno';
    controls.push({ id: uid(), type: 'label', x: 24, y: y + 3, w: 140, h: 22, text: c.name });
    controls.push(chk ? { id: uid(), type: 'check', x: 176, y: y + 2, w: 20, h: 20, src: c.name }
      : { id: uid(), type: 'text', x: 176, y, w: long ? 380 : 260, h: long ? 72 : 26, src: c.name, multi: long, ro: c.type === 'autonumber' });
    y += long ? 86 : 38;
  }
  return { w: 620, h: Math.max(320, y + 24), bg: '', nav: true, controls };
}

function formTab(t) {
  const st = { table: '', cols: [], ids: [], i: 0, adding: false, layout: null, mode: 'view', lookups: {}, rec: null };
  let ds = null, saved = '';
  const viewBox = h('div', { class: 'fview' });
  const counter = h('span', {});
  const saveBtn = h('button', { class: 'btn primary', hidden: true, onclick: () => saveNew() }, 'Save Record');
  const go = async i => { st.adding = false; st.i = Math.max(0, Math.min(st.ids.length - 1, i)); await renderView(); };
  const others = () => S.tabs.forEach(x => x !== t && x.table === st.table && x.reload && x.reload());

  const nav = h('div', { class: 'formnav' },
    h('button', { class: 'btn', onclick: () => go(0) }, '|<'), h('button', { class: 'btn', onclick: () => go(st.i - 1) }, '<'),
    counter,
    h('button', { class: 'btn', onclick: () => go(st.i + 1) }, '>'), h('button', { class: 'btn', onclick: () => go(st.ids.length - 1) }, '>|'),
    h('span', { style: 'flex:1' }), saveBtn,
    h('button', { class: 'btn', onclick: () => { st.adding = true; renderView(); } }, 'New Record'),
    h('button', { class: 'btn', onclick: () => del() }, 'Delete Record'));
  const viewBar = h('div', { class: 'toolbar' },
    h('button', { class: 'btn', onclick: () => setMode('design') }, 'Design View'), h('span', { class: 'grow' }),
    h('button', { class: 'btn', onclick: () => saveForm() }, 'Save Form'));
  const viewPane = h('div', { class: 'fpane' }, viewBar, viewBox, nav);
  const designPane = h('div', { class: 'fpane', hidden: true });
  const root = h('div', { class: 'pane' }, viewPane, designPane);

  /* ---- run view ---- */
  const optionsFor = c => {
    if (c.rs === 'table') return st.lookups[`${c.lt}|${c.lv}|${c.ld || c.lv}`] || [];
    return String(c.items || '').split(/[;\n]/).map(s => s.trim()).filter(Boolean).map(s => [s, s]);
  };
  async function loadLookups() {
    for (const c of st.layout.controls) {
      if (c.type !== 'combo' || c.rs !== 'table' || !c.lt || !c.lv) continue;
      const key = `${c.lt}|${c.lv}|${c.ld || c.lv}`;
      if (st.lookups[key]) continue;
      try { st.lookups[key] = (await db('run', `SELECT DISTINCT ${q(c.lv)}, ${q(c.ld || c.lv)} FROM ${q(c.lt)} ORDER BY 2`, 2000)).rows; } catch { st.lookups[key] = []; }
    }
  }

  const liveObj = rec => {
    const o = { ...(rec || {}) };
    for (const inp of viewBox.querySelectorAll('[data-col]')) {
      const col = st.cols.find(x => x.name === inp.dataset.col);
      if (!col) continue;
      o[col.name] = inp.type === 'checkbox' ? (inp.checked ? 1 : 0) : (inp.dataset.raw !== undefined && inp === document.activeElement ? inp.value : inp.dataset.raw ?? inp.value);
    }
    return o;
  };
  const calcText = (c, obj) => {
    try { return fmtVal(Expr.evaluate(c.src, { get: Expr.getter(obj), rows: [Expr.getter(obj)] }), c.fmt); } catch (e) { return '#Error'; }
  };
  const recalc = () => {
    const obj = liveObj(st.rec);
    for (const el of viewBox.querySelectorAll('[data-calc]')) {
      const c = st.layout.controls.find(x => x.id === el.dataset.calc);
      if (c) el.textContent = calcText(c, obj);
    }
  };

  function bound(c, col, rec, tab) {
    const v = rec ? rec[col.name] : null;
    const css = ctlCss(c);
    const ro = c.ro || col.type === 'autonumber';
    let inp;
    if (c.type === 'check') inp = h('input', { type: 'checkbox', checked: v == 1, disabled: ro });
    else if (c.type === 'combo') {
      const opts = optionsFor(c);
      const hit = v != null && opts.some(o => String(o[0]) === String(v));
      inp = h('select', { style: css, disabled: ro }, h('option', { value: '' }, ''), v != null && !hit && h('option', { value: v }, String(v)), opts.map(o => h('option', { value: o[0] }, String(o[1]))));
      inp.value = v == null ? '' : String(v);
    } else {
      const long = col.type === 'longtext' || c.multi;
      const native = col.type === 'date' || col.type === 'datetime';
      inp = long ? h('textarea', { style: css, disabled: ro }) : h('input', { style: css, disabled: ro, type: native ? (col.type === 'date' ? 'date' : 'datetime-local') : 'text' });
      const raw = v == null ? '' : native && col.type === 'datetime' ? String(v).replace(' ', 'T') : v;
      if (c.fmt && !native) {
        inp.dataset.raw = raw;
        inp.value = fmtVal(raw, c.fmt);
        inp.addEventListener('focus', () => { inp.value = inp.dataset.raw; });
        inp.addEventListener('input', () => { inp.dataset.raw = inp.value; });
        inp.addEventListener('blur', () => { inp.dataset.raw = inp.value; inp.value = fmtVal(inp.value, c.fmt); });
      } else inp.value = raw;
    }
    inp.dataset.col = col.name;
    if (tab) inp.tabIndex = tab;
    inp.addEventListener('input', recalc);
    inp.addEventListener('change', async () => {
      recalc();
      if (!rec) return;
      try {
        const val = c.type === 'check' ? (inp.checked ? 1 : 0) : coerce(col, inp.dataset.raw !== undefined && document.activeElement === inp ? inp.value : (inp.dataset.raw ?? inp.value));
        const nv = await db('update', st.table, rec._rowid_, col.name, val);
        rec[col.name] = nv;
        others(); recalc();
      } catch (e) { fail(e); renderView(); }
    });
    return inp;
  }

  function runCtl(c, rec, tab) {
    const box = h('div', { class: 'rc t-' + c.type, style: `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px` });
    const css = ctlCss(c), al = c.al ? ' al-' + c.al : '';
    const col = c.src && !Expr.isCalc(c.src) ? st.cols.find(x => x.name === c.src) : null;
    switch (c.type) {
      case 'label': box.append(h('div', { class: 'lbl' + al, style: css }, c.text || '')); break;
      case 'text': case 'check': case 'combo':
        if (c.type === 'text' && Expr.isCalc(c.src)) box.append(h('div', { class: 'calc' + al, style: css, 'data-calc': c.id }, calcText(c, rec || {})));
        else if (col) box.append(bound(c, col, rec, tab));
        else box.append(h('div', { class: 'fake off', title: c.src ? `The field "${c.src}" is not in this table.` : 'Not connected to a field' }, c.src ? '#Name?' : ''));
        break;
      case 'button': box.append(h('button', { class: 'btn' + al, style: css, tabindex: tab, onclick: () => act(c) }, c.text || '')); break;
      case 'image': if (c.img) box.append(h('img', { src: c.img, draggable: 'false', style: ctlCss({ bw: c.bw, bc: c.bc }) })); break;
      case 'rect': box.append(h('div', { class: 'rectc', style: css })); break;
      case 'line': box.append(h('div', { class: 'linec', style: `background:${c.bg || 'currentColor'}` })); break;
    }
    return box;
  }

  async function act(c) {
    const a = c.action;
    if (a === 'first') return go(0);
    if (a === 'prev') return go(st.i - 1);
    if (a === 'next') return go(st.i + 1);
    if (a === 'last') return go(st.ids.length - 1);
    if (a === 'new') { st.adding = true; return renderView(); }
    if (a === 'save') return st.adding ? saveNew() : toast('Changes are saved as you type.');
    if (a === 'delete') return del();
    if (a === 'close') return closeTab(t.id);
    if (['form', 'report', 'query', 'table'].includes(a)) {
      if (!c.target || !S.objs[a].includes(c.target)) return toast(`Pick a ${a} for this button in design view.`, true);
      openObject(a, c.target);
    }
  }

  async function renderView() {
    if (st.mode !== 'view') return;
    const L = st.layout;
    st.rec = st.adding || !st.ids.length ? null : await db('record', st.table, st.ids[st.i]);
    await loadLookups();
    const order = [...L.controls].sort((a, b) => a.y - b.y || a.x - b.x);
    const tab = new Map(order.map((c, k) => [c.id, k + 1]));
    const canvas = h('div', { class: 'fcanvas', style: `width:${L.w}px;height:${L.h}px;` + (L.bg ? `background:${L.bg}` : '') }, L.controls.map(c => runCtl(c, st.rec, tab.get(c.id))));
    viewBox.replaceChildren(canvas);
    nav.hidden = L.nav === false;
    counter.textContent = st.adding ? 'New record' : st.ids.length ? `Record ${st.i + 1} of ${st.ids.length}` : 'No records';
    saveBtn.hidden = !st.adding;
  }

  async function saveNew() {
    try {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const vals = {};
      for (const inp of viewBox.querySelectorAll('[data-col]')) {
        const col = st.cols.find(x => x.name === inp.dataset.col);
        if (!col || col.type === 'autonumber') continue;
        const v = inp.type === 'checkbox' ? (inp.checked ? 1 : 0) : coerce(col, inp.dataset.raw ?? inp.value);
        if (v !== null) vals[col.name] = v;
      }
      await db('insert', st.table, vals);
      st.ids = await db('rowids', st.table);
      await go(st.ids.length - 1);
      others();
    } catch (e) { fail(e); }
  }

  async function del() {
    if (st.adding) { st.adding = false; return renderView(); }
    if (!st.ids.length || !(await sure('Delete record?', 'This record will be deleted permanently.'))) return;
    try { await db('remove', st.table, [st.ids[st.i]]); await reload(); others(); } catch (e) { fail(e); }
  }

  async function reload() {
    st.cols = await db('columns', st.table);
    st.ids = await db('rowids', st.table);
    st.lookups = {};
    st.i = Math.max(0, Math.min(st.i, st.ids.length - 1));
    await renderView();
  }

  async function saveForm() {
    try {
      await db('saveObject', 'form', t.name, { table: st.table, layout: st.layout });
      saved = JSON.stringify(st.layout); setDirty(t, false); toast('Form saved.');
    } catch (e) { fail(e); }
  }

  /* ---- designer ---- */
  function setMode(m) {
    st.mode = m;
    viewPane.hidden = m !== 'view'; designPane.hidden = m !== 'design';
    if (m === 'design') { if (!ds) ds = makeDesigner(); ds.sync(); }
    else renderView().catch(fail);
  }

  function makeDesigner() {
    const lay = () => st.layout;
    const canvas = h('div', { class: 'dlayer fcanvas', 'data-layer': 'form' });
    const scroller = h('div', { class: 'dscroll showgrid' }, canvas);
    const propsHead = h('div', { class: 'phead' }), propsBody = h('div', { class: 'pbody' });
    const fieldlist = h('datalist', { id: 'fieldlist' });
    let surf;
    const size = () => { canvas.style.width = lay().w + 'px'; canvas.style.height = lay().h + 'px'; canvas.style.background = lay().bg || ''; };
    const tcache = {};
    const env = { kind: 'form', reprops: () => showProps(), tableCols: name => { const c = tcache[name]; if (name && !c) db('columns', name).then(r => { tcache[name] = r.map(x => x.name); showProps(); }).catch(() => {}); return c || []; } };

    const live = () => { size(); surf.selected().forEach(x => surf.refresh(x.c)); };
    const done = () => surf.commit();

    function formItems() {
      return [{ section: 'Form' },
        { label: 'Records from', kind: 'text', get: () => st.table, ro: true },
        { label: 'Width', kind: 'num', min: 200, get: () => lay().w, set: v => { lay().w = Math.max(200, v); } },
        { label: 'Height', kind: 'num', min: 120, get: () => lay().h, set: v => { lay().h = Math.max(120, v); } },
        { label: 'Background', kind: 'color', get: () => lay().bg || '', set: v => { lay().bg = v; } },
        { label: 'Navigation bar', kind: 'check', get: () => lay().nav !== false, set: v => { lay().nav = v; } }];
    }
    function showProps() {
      const cs = surf.selected().map(x => x.c);
      propsHead.textContent = !cs.length ? 'Form properties' : cs.length > 1 ? `${cs.length} controls selected` : TOOLS[cs[0].type][1] + ' properties';
      const items = cs.length ? ctlItems(cs, env) : formItems();
      renderProps(propsBody, items, live, done);
    }

    surf = new Surface({
      host: scroller,
      layers: () => [{ id: 'form', el: canvas, controls: lay().controls, w: lay().w, h: lay().h }],
      paint: c => designNode(c),
      make: (tool, _L, x, y, w, ht) => { const c = newCtl(tool, x, y, w, ht); if (c && tool === 'line' && !w) c.h = 2; return c; },
      snapshot: () => JSON.stringify(lay()),
      restore: s => { const o = JSON.parse(s); for (const k of Object.keys(lay())) delete lay()[k]; Object.assign(lay(), o); size(); },
      change: () => { setDirty(t, JSON.stringify(lay()) !== saved); },
      onSelect: showProps
    });
    surf.open = c => { if (c && c.type === 'image') propsBody.querySelector('button.btn:not(.mini)')?.click(); };

    function addField(col, x, y) {
      const bottom = Math.max(0, ...lay().controls.map(c => c.y + c.h));
      if (x === undefined) { x = 24; y = bottom + 12; }
      const long = col.type === 'longtext', chk = col.type === 'yesno';
      const lab = { id: uid(), type: 'label', x, y: y + 3, w: 140, h: 22, text: col.name };
      const ctl = chk ? { id: uid(), type: 'check', x: x + 152, y: y + 2, w: 20, h: 20, src: col.name }
        : { id: uid(), type: 'text', x: x + 152, y, w: long ? 300 : 220, h: long ? 72 : 26, src: col.name, multi: long, ro: col.type === 'autonumber' };
      lay().controls.push(lab, ctl);
      if (y + 40 > lay().h) lay().h = y + 40;
      size(); surf.draw(); surf.select([lab.id, ctl.id]); surf.commit();
    }
    canvas.addEventListener('dragover', e => e.preventDefault());
    canvas.addEventListener('drop', e => {
      e.preventDefault();
      const d = e.dataTransfer.getData('text/plain');
      if (!d.startsWith('cdb-field:')) return;
      const col = st.cols.find(c => c.name === d.slice(10));
      const r = canvas.getBoundingClientRect();
      if (col) addField(col, Math.max(0, surf.sn(e.clientX - r.left)), Math.max(0, surf.sn(e.clientY - r.top)));
    });

    const gridBox = h('input', { type: 'checkbox', checked: true, onchange: e => scroller.classList.toggle('showgrid', e.target.checked) });
    const snapBox = h('input', { type: 'checkbox', checked: true, onchange: e => surf.setGrid(surf.grid, e.target.checked) });
    const tb = h('div', { class: 'toolbar' },
      h('button', { class: 'btn', onclick: () => setMode('view') }, 'Form View'),
      h('button', { class: 'btn', title: 'Undo (Ctrl+Z)', onclick: () => { surf.undo(); surf.host.focus(); } }, '↶'),
      h('button', { class: 'btn', title: 'Redo (Ctrl+Y)', onclick: () => { surf.redo(); surf.host.focus(); } }, '↷'),
      arrangeBar(surf),
      h('label', {}, gridBox, 'Grid'), h('label', {}, snapBox, 'Snap'),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn primary', onclick: () => saveForm() }, 'Save Form'));

    const left = h('div', { class: 'dleft' }, toolbox(['select', 'label', 'text', 'check', 'combo', 'button', 'image', 'rect', 'line'], surf),
      h('h4', {}, 'Fields'), h('div', { class: 'flist' }, st.cols.map(c => h('div', { class: 'fitem', draggable: 'true', title: 'Drag onto the form, or double-click to add',
        ondragstart: e => e.dataTransfer.setData('text/plain', 'cdb-field:' + c.name), ondblclick: () => addField(c) }, c.name))),
      h('small', { class: 'hint' }, 'Drag a field onto the form to add its label and box.'), fieldlist);
    fieldlist.replaceChildren(...st.cols.map(c => h('option', { value: c.name })));

    designPane.replaceChildren(tb, h('div', { class: 'dgrid' }, left, scroller, h('div', { class: 'props' }, propsHead, propsBody)));
    return {
      surface: surf,
      sync() { size(); fieldlist.replaceChildren(...st.cols.map(c => h('option', { value: c.name }))); surf.draw(); if (surf.idx < 0) surf.reset(); showProps(); scroller.focus(); },
      edit: a => ({ undo: () => surf.undo(), redo: () => surf.redo(), copy: () => surf.copy(), cut: () => surf.cut(), paste: () => surf.paste(), del: () => surf.del(), all: () => surf.selectAll() }[a] || (() => {}))()
    };
  }

  (async () => {
    const def = await db('getObject', 'form', t.name);
    st.table = t.table = def.table;
    st.cols = await db('columns', st.table);
    st.layout = def.layout || defaultLayout(st.cols, t.name);
    st.layout.controls.forEach(c => { if (!c.id) c.id = uid(); });
    saved = def.layout ? JSON.stringify(st.layout) : '';
    if (!def.layout) { /* old auto form: opens as is, design view lets him rearrange */ }
    st.ids = await db('rowids', st.table);
    await renderView();
  })().catch(e => viewBox.replaceChildren(h('div', { class: 'err' }, e.message)));

  return {
    root, reload: () => reload().catch(() => {}),
    save: saveForm,
    toggleDesign: () => setMode(st.mode === 'view' ? 'design' : 'view'),
    edit: a => { if (st.mode === 'design' && ds) ds.edit(a); }
  };
}

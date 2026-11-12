'use strict';
/* Reports: print preview + band designer (report header, page header, group bands, detail, footers) */

const pageStyleEl = (() => { const s = document.createElement('style'); s.id = 'pagestyle'; document.head.append(s); return s; })();
const setPageStyle = pg => { const d = pageDims(pg); pageStyleEl.textContent = `@page { size: ${d.W}px ${d.H}px; margin: 0 }`; };
const pdfOpts = pg => ({ pageSize: pg.size || 'Letter', landscape: !!pg.land });

function reportTab(t) {
  const st = { def: null, mode: 'preview', selBand: null, zoom: 1 };
  let data = { columns: [], rows: [] }, types = {}, saved = '', ds = null, io = null;
  const info = h('span', { class: 'rinfo' });
  const pagesBox = h('div', { class: 'rpages' });
  const previewBox = h('div', { class: 'rprev' }, pagesBox);
  const zoomSel = h('select', { onchange: e => { st.zoom = Number(e.target.value); pagesBox.style.zoom = st.zoom; } },
    [[0.5, '50%'], [0.75, '75%'], [1, '100%'], [1.25, '125%']].map(([v, l]) => h('option', { value: v, selected: v === 1 }, l)));
  const prevBar = h('div', { class: 'toolbar' },
    h('button', { class: 'btn', onclick: () => setMode('design') }, 'Design View'),
    h('button', { class: 'btn', onclick: () => out(dim => cdb.print(pdfOpts(st.def.page))) }, 'Print'),
    h('button', { class: 'btn', onclick: () => out(async () => { const p = await cdb.exportPdf(st.def.title || t.name, pdfOpts(st.def.page)); if (p) toast('Exported to ' + p); }) }, 'Export PDF'),
    h('label', {}, 'Zoom', zoomSel), h('span', { class: 'grow' }), info,
    h('button', { class: 'btn', onclick: () => save() }, 'Save Report'));
  const prevPane = h('div', { class: 'fpane' }, prevBar, previewBox);
  const designPane = h('div', { class: 'fpane', hidden: true });
  const root = h('div', { class: 'pane' }, prevPane, designPane);

  /* ---------- data ---------- */
  async function loadData() {
    const s = st.def.source;
    let sql;
    if (s.kind === 'query') sql = `SELECT * FROM (${(await db('getObject', 'query', s.name)).sql.trim().replace(/;+\s*$/, '')})`;
    else sql = `SELECT * FROM ${q(s.name)}`;
    data = await db('run', sql, 20000);
    types = {};
    if (s.kind === 'table') (await db('columns', s.name)).forEach(c => { types[c.name] = c.type; });
  }

  /* ---------- rendering a page ---------- */
  function textVal(c, it, p, row) {
    const extra = { page: p.n, pages: p.total };
    const src = String(c.src || '').trim();
    if (!src) return null;
    try {
      if (Expr.isCalc(src)) return Expr.evaluate(src, { get: Expr.getter(row, extra), rows: (it.rows || []).map(r => Expr.getter(r, extra)) });
      return Expr.getter(row, extra)(src);
    } catch (e) { return '#Error'; }
  }
  function runCtl(c, it, p) {
    const box = h('div', { class: 'rc t-' + c.type, style: `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px` });
    const css = ctlCss(c);
    switch (c.type) {
      case 'label': box.append(h('div', { class: 'lbl' + (c.al ? ' al-' + c.al : ''), style: css }, c.text || '')); break;
      case 'text': {
        const row = it.row || {};
        let v = textVal(c, it, p, row);
        if (c.hidedup && it.prevRow && textVal(c, it, p, it.prevRow) === v) v = null;
        const plain = !Expr.isCalc(c.src || '');
        const fmt = c.fmt || (plain && types[c.src] === 'currency' ? 'standard' : plain && types[c.src] === 'yesno' ? 'yesno' : '');
        const al = c.al || (typeof v === 'number' ? 'right' : '');
        box.append(h('div', { class: 'calc' + (al ? ' al-' + al : '') + (c.wrap ? ' wrap' : ''), style: css }, fmtVal(v, fmt)));
        break;
      }
      case 'image': if (c.img) box.append(h('img', { src: c.img, draggable: 'false', style: ctlCss({ bw: c.bw, bc: c.bc }) })); break;
      case 'rect': box.append(h('div', { class: 'rectc', style: css })); break;
      case 'line': box.append(h('div', { class: 'linec', style: `background:${c.bg || '#000'}` })); break;
    }
    return box;
  }
  function pageContent(p, L) {
    const m = L.dim.m;
    const el = h('div', { class: 'rcontent', style: `left:${m[3]}px;top:${m[0]}px;width:${L.dim.cw}px;height:${L.dim.ch}px` });
    for (const it of p.items) {
      const bg = it.band.bg || (it.kind === 'd' && it.band.alt && it.idx % 2 === 1 ? it.band.alt : '');
      el.append(h('div', { class: 'rband', style: `top:${it.y}px;height:${it.h}px;width:${L.dim.cw}px` + (bg ? `;background:${bg}` : '') }, it.band.controls.map(c => runCtl(c, it, p))));
    }
    return el;
  }
  const pageEl = (p, L) => h('div', { class: 'rpage', style: `width:${L.dim.W}px;height:${L.dim.H - 1}px` });

  function renderPreview() {
    if (!st.def) return;
    let L;
    try { L = layoutReport(st.def, data); } catch (e) { return pagesBox.replaceChildren(h('div', { class: 'err' }, e.message)); }
    info.textContent = `${L.records} record${L.records === 1 ? '' : 's'}, ${L.total} page${L.total === 1 ? '' : 's'}` + (data.truncated ? ' (first 20,000 records)' : '');
    setPageStyle(st.def.page);
    const els = L.pages.map(p => { const e = pageEl(p, L); e._p = p; return e; });
    const fill = e => { if (!e._done) { e._done = true; e.replaceChildren(pageContent(e._p, L)); } };
    pagesBox.replaceChildren(...els);
    pagesBox.style.zoom = st.zoom;
    if (io) io.disconnect();
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { fill(e.target); io.unobserve(e.target); } }), { root: previewBox, rootMargin: '1500px 0px' });
      els.forEach(e => io.observe(e));
    } else els.forEach(fill);
  }

  async function out(fn) {
    const L = layoutReport(st.def, data);
    setPageStyle(st.def.page);
    $('#print-root').replaceChildren(...L.pages.map(p => { const e = pageEl(p, L); e.append(pageContent(p, L)); return e; }));
    try { return await fn(L.dim); } catch (e) { fail(e); }
  }

  async function save() {
    try { await db('saveObject', 'report', t.name, st.def); saved = JSON.stringify(st.def); setDirty(t, false); toast('Report saved.'); } catch (e) { fail(e); }
  }

  function setMode(m) {
    st.mode = m;
    prevPane.hidden = m !== 'preview'; designPane.hidden = m !== 'design';
    if (m === 'design') { if (!ds) ds = makeDesigner(); ds.sync(); } else renderPreview();
  }

  /* ---------- designer ---------- */
  function bandList() {
    const d = st.def, b = d.bands, out = [];
    const add = (id, title, band, kind, level) => out.push({ id, title, band, kind, level });
    if (b.rh.on) add('rh', 'Report Header', b.rh, 'rh');
    if (b.ph.on) add('ph', 'Page Header', b.ph, 'ph');
    d.groups.forEach((g, k) => { if (g.header) add('gh' + k, `${g.field} Header`, b.gh[k], 'gh', k); });
    add('d', 'Detail', b.d, 'd');
    for (let k = d.groups.length - 1; k >= 0; k--) if (d.groups[k].footer) add('gf' + k, `${d.groups[k].field} Footer`, b.gf[k], 'gf', k);
    if (b.pf.on) add('pf', 'Page Footer', b.pf, 'pf');
    if (b.rf.on) add('rf', 'Report Footer', b.rf, 'rf');
    return out;
  }

  function makeDesigner() {
    const paper = h('div', { class: 'rpaper' });
    const scroller = h('div', { class: 'dscroll rep showgrid' }, paper);
    const propsHead = h('div', { class: 'phead' }), propsBody = h('div', { class: 'pbody' });
    const fieldlist = h('datalist', { id: 'fieldlist' });
    let surf, els = {};
    const def = () => st.def;
    const env = { kind: 'report', reprops: () => showProps(), tableCols: () => [] };

    function drawBands() {
      const { cw } = pageDims(def().page);
      els = {};
      const rows = bandList().map(b => {
        const lay = h('div', { class: 'dlayer rlayer', 'data-layer': b.id, style: `width:${cw}px;height:${b.band.h}px` + (b.band.bg ? `;background:${b.band.bg}` : '') });
        els[b.id] = lay;
        function gripDrag(e, bb) {
          e.preventDefault();
          const y0 = e.clientY, h0 = bb.band.h;
          surf.drag(ev => { bb.band.h = Math.max(4, surf.sn(h0 + ev.clientY - y0)); lay.style.height = bb.band.h + 'px'; }, () => { surf.commit(); showProps(); });
        }
        return h('div', { class: 'bandrow' + (st.selBand === b.id ? ' on' : '') },
          h('div', { class: 'btitle', onclick: () => selectBand(b.id) }, b.title),
          h('div', { class: 'bwrap', style: `width:${cw}px` }, lay, h('div', { class: 'bgrip', title: 'Drag to change the band height', onmousedown: e => gripDrag(e, b) })));
      });
      paper.replaceChildren(...rows);
      paper.style.width = cw + 'px';
      surf && surf.draw();
    }

    function selectBand(id) {
      surf.select([]);
      st.selBand = id;
      paper.querySelectorAll('.bandrow').forEach(r => r.classList.toggle('on', r.querySelector('.dlayer').dataset.layer === id));
      showProps();
    }

    const bandOf = id => bandList().find(b => b.id === id);

    function bandItems(b) {
      const it = [{ section: b.title },
        { label: 'Height', kind: 'num', min: 4, get: () => b.band.h, set: v => { b.band.h = Math.max(4, v); } },
        { label: 'Fill', kind: 'color', get: () => b.band.bg || '', set: v => { b.band.bg = v; } }];
      if (b.kind === 'd') it.push({ label: 'Alternate row fill', kind: 'color', get: () => b.band.alt || '', set: v => { b.band.alt = v; } });
      if (b.kind === 'gh') it.push({ label: 'New page before', kind: 'check', get: () => !!def().groups[b.level].newPage, set: v => { def().groups[b.level].newPage = v; } });
      if (['rh', 'ph', 'pf', 'rf'].includes(b.kind)) it.push({ label: 'Show this band', kind: 'check', get: () => b.band.on, set: v => { b.band.on = v; st.selBand = v ? st.selBand : null; } });
      return it;
    }
    function reportItems() {
      const p = def().page, d = def();
      const mg = (i, l) => ({ label: l, kind: 'num', min: 0, get: () => p.m[i], set: v => { p.m[i] = Math.max(0, v); } });
      return [{ section: 'Report' },
        { label: 'Title', kind: 'text', get: () => d.title || '', set: v => { d.title = v; } },
        { label: 'Records from', kind: 'text', ro: true, get: () => (d.source.kind === 'query' ? 'Query: ' : '') + d.source.name },
        { section: 'Page' },
        { label: 'Paper', kind: 'select', opts: Object.keys(PAPER), get: () => p.size, set: v => { p.size = v; } },
        { label: 'Orientation', kind: 'select', opts: [['p', 'Portrait'], ['l', 'Landscape']], get: () => (p.land ? 'l' : 'p'), set: v => { p.land = v === 'l'; } },
        mg(0, 'Top margin'), mg(1, 'Right margin'), mg(2, 'Bottom margin'), mg(3, 'Left margin'),
        { section: 'Sections' },
        { label: 'Report header', kind: 'check', get: () => d.bands.rh.on, set: v => { d.bands.rh.on = v; } },
        { label: 'Page header', kind: 'check', get: () => d.bands.ph.on, set: v => { d.bands.ph.on = v; } },
        { label: 'Page footer', kind: 'check', get: () => d.bands.pf.on, set: v => { d.bands.pf.on = v; } },
        { label: 'Report footer', kind: 'check', get: () => d.bands.rf.on, set: v => { d.bands.rf.on = v; } },
        { section: 'Grouping' },
        { label: 'Groups & sorting', kind: 'btn', text: 'Group & Sort…', click: () => groupDialog() }];
    }

    function showProps() {
      const cs = surf.selected().map(x => x.c);
      let items;
      if (cs.length) { propsHead.textContent = cs.length > 1 ? `${cs.length} controls selected` : TOOLS[cs[0].type][1] + ' properties'; items = ctlItems(cs, env); }
      else if (st.selBand && bandOf(st.selBand)) { const b = bandOf(st.selBand); propsHead.textContent = 'Band properties'; items = bandItems(b); }
      else { st.selBand = null; propsHead.textContent = 'Report properties'; items = reportItems(); }
      renderProps(propsBody, items, live, done);
    }
    const live = () => {
      if (surf.sel.size) return surf.selected().forEach(x => surf.refresh(x.c));
      drawBands();
      if (st.selBand && !bandOf(st.selBand)) { st.selBand = null; showProps(); }
    };
    const done = () => surf.commit();

    surf = new Surface({
      host: scroller, across: true,
      layers: () => { const w = pageDims(def().page).cw; return bandList().filter(b => els[b.id]).map(b => ({ id: b.id, el: els[b.id], controls: b.band.controls, w, h: b.band.h })); },
      paint: c => designNode(c),
      make: (tool, _L, x, y, w, ht) => newCtl(tool, x, y, w, ht),
      snapshot: () => JSON.stringify(def()),
      restore: s => { const o = JSON.parse(s); for (const k of Object.keys(def())) delete def()[k]; Object.assign(def(), o); drawBands(); },
      change: () => setDirty(t, JSON.stringify(def()) !== saved),
      onSelect: () => { if (surf.sel.size && st.selBand) { st.selBand = null; paper.querySelectorAll('.bandrow.on').forEach(r => r.classList.remove('on')); } showProps(); }
    });
    surf.setGrid(4, true);

    function addField(name, layerId, x) {
      const b = bandOf(layerId) || bandOf('d');
      const num = NUMT.includes(types[name]);
      const w = num ? 90 : 160;
      const bx = x === undefined ? Math.max(0, ...b.band.controls.map(c => c.x + c.w + 8), 0) : Math.max(0, x);
      const ctl = { id: uid(), type: 'text', x: bx, y: 1, w, h: Math.max(14, b.band.h - 2), src: name, fmt: '', al: num ? 'right' : '' };
      b.band.controls.push(ctl);
      const ph = bandOf('ph');
      if (b.kind === 'd' && ph) ph.band.controls.push({ id: uid(), type: 'label', x: bx, y: 3, w, h: Math.max(14, ph.band.h - 8), text: name, b: true, al: num ? 'right' : '' });
      surf.draw(); surf.select([ctl.id]); surf.commit();
    }
    paper.addEventListener('dragover', e => e.preventDefault());
    paper.addEventListener('drop', e => {
      e.preventDefault();
      const d = e.dataTransfer.getData('text/plain');
      const lay = e.target.closest('.dlayer');
      if (!d.startsWith('cdb-field:') || !lay) return;
      addField(d.slice(10), lay.dataset.layer, surf.sn(e.clientX - lay.getBoundingClientRect().left));
    });

    /* group & sort dialog */
    function groupDialog() {
      const d = def();
      const gs = { groups: d.groups.map(g => ({ ...g })), sort: d.sort.map(s => ({ ...s })) };
      const body = h('div', { class: 'gsbody' });
      const fsel = (v, on) => h('select', { value: v, onchange: e => on(e.target.value) }, h('option', { value: '' }, '(field)'), data.columns.map(c => h('option', { value: c }, c)));
      const dsel = (v, on) => h('select', { value: v, onchange: e => on(e.target.value) }, h('option', { value: 'asc' }, 'A → Z'), h('option', { value: 'desc' }, 'Z → A'));
      const swap = (a, i, j) => { [a[i], a[j]] = [a[j], a[i]]; draw(); };
      function draw() {
        body.replaceChildren(
          h('h4', {}, 'Group by'),
          ...gs.groups.map((g, i) => h('div', { class: 'row' }, fsel(g.field, v => { g.field = v; }), dsel(g.dir, v => { g.dir = v; }),
            h('label', {}, h('input', { type: 'checkbox', checked: g.header, onchange: e => { g.header = e.target.checked; } }), 'Header'),
            h('label', {}, h('input', { type: 'checkbox', checked: g.footer, onchange: e => { g.footer = e.target.checked; } }), 'Footer'),
            h('label', {}, h('input', { type: 'checkbox', checked: g.newPage, onchange: e => { g.newPage = e.target.checked; } }), 'New page'),
            h('button', { class: 'btn mini', disabled: i === 0, onclick: () => swap(gs.groups, i, i - 1) }, '▲'), h('button', { class: 'btn mini', disabled: i === gs.groups.length - 1, onclick: () => swap(gs.groups, i, i + 1) }, '▼'),
            h('button', { class: 'btn mini', onclick: () => { gs.groups.splice(i, 1); draw(); } }, '×'))),
          h('button', { class: 'btn', onclick: () => { gs.groups.push({ field: '', dir: 'asc', header: true, footer: false, newPage: false }); draw(); } }, 'Add group'),
          h('h4', {}, 'Then sort records by'),
          ...gs.sort.map((s, i) => h('div', { class: 'row' }, fsel(s.field, v => { s.field = v; }), dsel(s.dir, v => { s.dir = v; }), h('button', { class: 'btn mini', onclick: () => { gs.sort.splice(i, 1); draw(); } }, '×'))),
          h('button', { class: 'btn', onclick: () => { gs.sort.push({ field: '', dir: 'asc' }); draw(); } }, 'Add sort'));
      }
      draw();
      const ov = h('div', { class: 'overlay' }, h('div', { class: 'dlg wide' }, h('h3', {}, 'Group & Sort'), body,
        h('div', { class: 'row end' }, h('button', { class: 'btn', onclick: () => ov.remove() }, 'Cancel'), h('button', { class: 'btn primary', onclick: apply }, 'Apply'))));
      document.body.append(ov);
      async function apply() {
        const clean = gs.groups.filter(g => g.field);
        const seen = new Set();
        for (const g of clean) { if (seen.has(g.field)) return toast(`"${g.field}" is used twice.`, true); seen.add(g.field); }
        const oldBy = new Map(d.groups.map((g, i) => [g.field, { gh: d.bands.gh[i], gf: d.bands.gf[i] }]));
        const lost = [...oldBy].filter(([f, b]) => !seen.has(f) && (b.gh.controls.length || b.gf.controls.length));
        if (lost.length && !(await sure('Remove group bands?', `Controls in the ${lost.map(x => x[0]).join(', ')} band${lost.length > 1 ? 's' : ''} will be removed.`, 'Remove'))) return;
        const cw = pageDims(d.page).cw;
        d.groups = clean;
        d.bands.gh = clean.map(g => (oldBy.get(g.field) || {}).gh || { h: 30, controls: [{ id: uid(), type: 'text', x: 0, y: 8, w: cw, h: 20, src: `="${g.field}: " & [${g.field}]`, fs: 14, b: true }] });
        d.bands.gf = clean.map(g => (oldBy.get(g.field) || {}).gf || { h: 28, controls: [] });
        d.sort = gs.sort.filter(s => s.field);
        ov.remove();
        st.selBand = null; surf.sel.clear();
        drawBands(); surf.commit(); showProps();
      }
    }

    const gridBox = h('input', { type: 'checkbox', checked: true, onchange: e => scroller.classList.toggle('showgrid', e.target.checked) });
    const snapBox = h('input', { type: 'checkbox', checked: true, onchange: e => surf.setGrid(surf.grid, e.target.checked) });
    const tb = h('div', { class: 'toolbar' },
      h('button', { class: 'btn', onclick: () => setMode('preview') }, 'Print Preview'),
      h('button', { class: 'btn', title: 'Undo (Ctrl+Z)', onclick: () => { surf.undo(); surf.host.focus(); } }, '↶'),
      h('button', { class: 'btn', title: 'Redo (Ctrl+Y)', onclick: () => { surf.redo(); surf.host.focus(); } }, '↷'),
      arrangeBar(surf),
      h('button', { class: 'btn', onclick: () => groupDialog() }, 'Group & Sort…'),
      h('label', {}, gridBox, 'Grid'), h('label', {}, snapBox, 'Snap'),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn primary', onclick: () => save() }, 'Save Report'));

    const left = h('div', { class: 'dleft' }, toolbox(['select', 'label', 'text', 'image', 'rect', 'line'], surf),
      h('h4', {}, 'Fields'),
      h('div', { class: 'flist' }, data.columns.map(c => h('div', { class: 'fitem', draggable: 'true', title: 'Drag onto a band, or double-click to add to the detail band',
        ondragstart: e => e.dataTransfer.setData('text/plain', 'cdb-field:' + c), ondblclick: () => addField(c, 'd') }, c))),
      h('small', { class: 'hint' }, 'Drag a field onto a band. Use =Sum([Field]) or =Count(*) in group and report footers.'), fieldlist);
    designPane.replaceChildren(tb, h('div', { class: 'dgrid' }, left, scroller, h('div', { class: 'props' }, propsHead, propsBody)));

    return {
      sync() {
        fieldlist.replaceChildren(...data.columns.map(c => h('option', { value: c })));
        left.querySelector('.flist').replaceChildren(...data.columns.map(c => h('div', { class: 'fitem', draggable: 'true', ondragstart: e => e.dataTransfer.setData('text/plain', 'cdb-field:' + c), ondblclick: () => addField(c, 'd') }, c)));
        drawBands(); if (surf.idx < 0) surf.reset(); showProps(); scroller.focus();
      },
      edit: a => ({ undo: () => surf.undo(), redo: () => surf.redo(), copy: () => surf.copy(), cut: () => surf.cut(), paste: () => surf.paste(), del: () => surf.del(), all: () => surf.selectAll() }[a] || (() => {}))()
    };
  }

  /* ---------- start ---------- */
  async function init() {
    const raw = await db('getObject', 'report', t.name);
    st.def = raw;
    await loadData();
    st.def = upgradeReport(raw, data, types, uid);
    if (!st.def.title) st.def.title = t.name;
    saved = raw.v === 2 ? JSON.stringify(st.def) : '';
    renderPreview();
  }
  const reload = async () => {
    await loadData();
    if (st.mode === 'design' && ds) ds.sync(); else renderPreview();
  };
  init().catch(e => pagesBox.replaceChildren(h('div', { class: 'err' }, e.message)));
  return { root, save, reload: () => reload().catch(() => {}), toggleDesign: () => setMode(st.mode === 'preview' ? 'design' : 'preview'), edit: a => { if (st.mode === 'design' && ds) ds.edit(a); } };
}

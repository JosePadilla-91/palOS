'use strict';
/* Band-based report layout. No DOM in here so it can be tested on its own. */

const PAPER = { Letter: [816, 1056], Legal: [816, 1344], A4: [793, 1122], A3: [1122, 1587], A5: [559, 793], Tabloid: [1056, 1632] };

const pageDims = pg => {
  const [w, h] = PAPER[pg.size] || PAPER.Letter;
  const W = pg.land ? h : w, H = pg.land ? w : h, m = pg.m || [48, 48, 48, 48];
  return { W, H, cw: Math.max(100, W - m[1] - m[3]), ch: Math.max(100, H - m[0] - m[2]), m };
};

const NUMT = ['number', 'decimal', 'currency', 'autonumber'];

/* old reports ({columns, groupBy, totals}) become band reports the first time they open */
function upgradeReport(def, data, types, mk) {
  if (def.v === 2) return def;
  const id = mk || (() => 'c' + Math.random().toString(36).slice(2, 9));
  const page = { size: 'Letter', land: false, m: [48, 48, 48, 48] };
  const { cw } = pageDims(page);
  const cols = (def.columns && def.columns.length ? def.columns : data.columns).filter(c => data.columns.includes(c));
  const isNum = c => NUMT.includes(types[c]);
  const weight = c => (isNum(c) || types[c] === 'yesno' ? 1 : types[c] === 'longtext' ? 2.4 : 1.6);
  const sum = cols.reduce((s, c) => s + weight(c), 0) || 1;
  let x = 0;
  const pos = cols.map(c => { const w = Math.floor(cw * weight(c) / sum); const o = { c, x, w }; x += w; return o; });
  const fmtOf = c => (types[c] === 'currency' ? 'standard' : types[c] === 'yesno' ? 'yesno' : '');
  const grp = def.groupBy && data.columns.includes(def.groupBy) ? def.groupBy : '';
  const t = (o) => ({ id: id(), ...o });
  const totalsRow = (y, h) => pos.map((p, k) => (isNum(p.c)
    ? t({ type: 'text', x: p.x, y, w: p.w - 6, h, src: `=Sum([${p.c}])`, fmt: types[p.c] === 'currency' ? 'standard' : types[p.c] === 'decimal' ? 'standard' : 'int', b: true, al: 'right' })
    : k === 0 ? t({ type: 'text', x: p.x, y, w: p.w, h, src: '="Total (" & Count(*) & ")"', b: true }) : null)).filter(Boolean);

  const bands = {
    rh: { on: true, h: 62, controls: [
      t({ type: 'label', x: 0, y: 4, w: cw, h: 34, text: def.title || '', fs: 22, b: true }),
      t({ type: 'text', x: 0, y: 38, w: cw, h: 20, src: '="Printed " & DateLong() & ", " & Count(*) & " records"', fg: '#555555' })] },
    ph: { on: true, h: 28, controls: [
      ...pos.map(p => t({ type: 'label', x: p.x, y: 3, w: p.w - 6, h: 20, text: p.c, b: true, al: isNum(p.c) ? 'right' : '' })),
      t({ type: 'line', x: 0, y: 25, w: cw, h: 2, bg: '#000000' })] },
    gh: [], gf: [],
    d: { h: 22, alt: '', controls: [
      ...pos.map(p => t({ type: 'text', x: p.x, y: 1, w: p.w - 6, h: 20, src: p.c, fmt: fmtOf(p.c), al: isNum(p.c) ? 'right' : '' })),
      t({ type: 'line', x: 0, y: 21, w: cw, h: 1, bg: '#dddddd' })] },
    pf: { on: true, h: 30, controls: [
      t({ type: 'text', x: 0, y: 6, w: 300, h: 20, src: '=DateLong()', fg: '#555555' }),
      t({ type: 'text', x: cw - 200, y: 6, w: 200, h: 20, src: '="Page " & [Page] & " of " & [Pages]', al: 'right', fg: '#555555' })] },
    rf: { on: !!def.totals, h: 30, controls: def.totals ? [t({ type: 'line', x: 0, y: 1, w: cw, h: 1, bg: '#000000' }), ...totalsRow(5, 20)] : [] }
  };
  const groups = [];
  if (grp) {
    groups.push({ field: grp, dir: 'asc', header: true, footer: !!def.totals, newPage: false });
    bands.gh.push({ h: 30, controls: [t({ type: 'text', x: 0, y: 8, w: cw, h: 20, src: `="${grp}: " & [${grp}]`, fs: 14, b: true })] });
    bands.gf.push({ h: 30, controls: def.totals ? [t({ type: 'line', x: 0, y: 1, w: cw, h: 1, bg: '#000000' }), ...totalsRow(5, 20)] : [] });
  }
  return { v: 2, source: def.source, title: def.title, page, groups, sort: [], bands };
}

const same = (a, b) => (a === b) || (a == null && b == null);
const cmp = (a, b) => {
  if (same(a, b)) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

function layoutReport(def, data) {
  const dim = pageDims(def.page || { size: 'Letter', land: false });
  const b = def.bands, G = (def.groups || []).length;
  const recs = data.rows.map(r => { const o = {}; data.columns.forEach((c, i) => { o[c] = r[i]; }); return o; });

  const keys = [...(def.groups || []).map(g => ({ f: g.field, d: g.dir === 'desc' ? -1 : 1 })), ...(def.sort || []).filter(s => s.field).map(s => ({ f: s.field, d: s.dir === 'desc' ? -1 : 1 }))];
  if (keys.length) {
    const idx = recs.map((r, i) => i);
    idx.sort((x, y) => { for (const k of keys) { const c = cmp(recs[x][k.f], recs[y][k.f]); if (c) return c * k.d; } return x - y; });
    const sorted = idx.map(i => recs[i]);
    recs.length = 0; recs.push(...sorted);
  }

  /* flat list of bands in print order */
  const flow = [];
  const n = recs.length;
  const gk = (r, k) => (def.groups[k] ? r[def.groups[k].field] : null);
  const prefixEq = (a, c, k) => { for (let j = 0; j <= k; j++) if (!same(gk(a, j), gk(c, j))) return false; return true; };
  const open = new Array(G).fill(null);
  const rhItem = b.rh && b.rh.on ? { kind: 'rh', band: b.rh, rows: recs, row: recs[0] || null, h: b.rh.h } : null;
  let drow = 0;
  for (let i = 0; i <= n; i++) {
    for (let k = G - 1; k >= 0; k--) {
      if (open[k] && i >= open[k].end) {
        if (def.groups[k].footer && b.gf[k]) flow.push({ kind: 'gf', level: k, band: b.gf[k], rows: recs.slice(open[k].start, open[k].end), row: recs[open[k].start], h: b.gf[k].h });
        open[k] = null;
      }
    }
    if (i === n) break;
    for (let k = 0; k < G; k++) {
      if (open[k]) continue;
      let end = i + 1;
      while (end < n && prefixEq(recs[end], recs[i], k)) end++;
      open[k] = { start: i, end };
      if (def.groups[k].header && b.gh[k]) flow.push({ kind: 'gh', level: k, band: b.gh[k], rows: recs.slice(i, end), row: recs[i], h: b.gh[k].h, brk: !!def.groups[k].newPage && i > 0 });
      else if (def.groups[k].newPage && i > 0) flow.push({ kind: 'brk', h: 0, rows: [], row: null, band: { controls: [] } });
      drow = 0;
    }
    flow.push({ kind: 'd', band: b.d, rows: [recs[i]], row: recs[i], h: b.d.h, idx: drow++, g: open.map(o => o && o.start).join(',') });
  }
  if (b.rf && b.rf.on) flow.push({ kind: 'rf', band: b.rf, rows: recs, row: recs[n - 1] || null, h: b.rf.h });

  /* pagination */
  const phH = b.ph && b.ph.on ? b.ph.h : 0, pfH = b.pf && b.pf.on ? b.pf.h : 0;
  const limit = dim.ch - pfH;
  const pages = [];
  let page, y, top;
  const begin = () => {
    page = { n: pages.length + 1, items: [], rows: [] };
    pages.push(page); y = 0;
    if (page.n === 1 && rhItem) { page.items.push({ ...rhItem, y: 0 }); y += rhItem.h; }
    if (phH) { page.items.push({ kind: 'ph', band: b.ph, y, h: phH, rows: page.rows, row: null }); y += phH; }
    top = y;
  };
  begin();
  const startIdx = 0;
  for (let i = startIdx; i < flow.length; i++) {
    const it = flow[i];
    if (it.kind === 'brk') { if (y > top) begin(); continue; }
    let need = it.h;
    if (it.kind === 'gh') {
      for (let j = i + 1; j < flow.length; j++) { need += flow[j].h; if (flow[j].kind !== 'gh') break; }
      if (it.brk && y > top) begin();
    }
    if (y + need > limit && y > top) begin();
    it.y = y; it.page = page.n;
    it.prevSame = it.kind === 'd' && page.items.length && page.items[page.items.length - 1].kind === 'd' && page.items[page.items.length - 1].g === it.g;
    it.prevRow = it.prevSame ? page.items[page.items.length - 1].row : null;
    page.items.push(it); y += it.h;
    if (it.kind === 'd') page.rows.push(it.row);
  }
  if (pfH) for (const p of pages) p.items.push({ kind: 'pf', band: b.pf, y: dim.ch - pfH, h: pfH, rows: p.rows, row: null });
  pages.forEach(p => { p.total = pages.length; });
  return { pages, dim, total: pages.length, records: n };
}

if (typeof module !== 'undefined') module.exports = { layoutReport, upgradeReport, pageDims, PAPER };

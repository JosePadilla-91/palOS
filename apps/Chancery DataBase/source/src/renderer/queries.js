'use strict';
/* Queries: Access-style designer (tables, joins, field grid, totals, criteria) that writes SQL, plus a plain SQL view */

const qq = s => '"' + String(s).replace(/"/g, '""') + '"';
const qesc = v => String(v).replace(/'/g, "''");
const AGG_FN = { sum: 'SUM', avg: 'AVG', count: 'COUNT', min: 'MIN', max: 'MAX' };
const AGG_NAME = { sum: 'Sum', avg: 'Avg', count: 'Count', min: 'Min', max: 'Max' };

/* ---------- criteria: >5, "abc", Like "a*", Between 1 And 5, In (1,2), Is Null, Not x, a Or b ---------- */
function splitTop(s, re) {
  const out = [];
  let cur = '', quote = null, depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth === 0) {
      const m = re.exec(s.slice(i));
      if (m) { out.push(cur); cur = ''; i += m[0].length - 1; continue; }
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function critSQL(ex, text, refOf) {
  const t0 = String(text == null ? '' : text).trim();
  if (!t0) return null;
  const lit = raw => {
    const v = String(raw).trim();
    let m;
    if ((m = /^"(.*)"$/s.exec(v)) || (m = /^'(.*)'$/s.exec(v))) return `'${qesc(m[1])}'`;
    if ((m = /^#(.+)#$/.exec(v))) return `'${qesc(m[1])}'`;
    if (/^(true|yes)$/i.test(v)) return '1';
    if (/^(false|no)$/i.test(v)) return '0';
    if (/^null$/i.test(v)) return 'NULL';
    if (/^date\(\)$/i.test(v)) return "date('now')";
    if ((m = /^\[(.+)\]$/.exec(v)) && refOf) return refOf(m[1]);
    if (/^-?\d+(\.\d+)?$/.test(v)) return v;
    return `'${qesc(v)}'`;
  };
  const likeLit = raw => {
    let v = String(raw).trim(), m;
    if ((m = /^"(.*)"$/s.exec(v)) || (m = /^'(.*)'$/s.exec(v))) v = m[1];
    return `'${qesc(v.replace(/\*/g, '%').replace(/\?/g, '_'))}'`;
  };
  const one = t => {
    let m;
    if ((m = /^not\s+(.+)$/is.exec(t))) return `NOT (${one(m[1].trim())})`;
    if (/^is\s+null$/i.test(t)) return `${ex} IS NULL`;
    if (/^is\s+not\s+null$/i.test(t)) return `${ex} IS NOT NULL`;
    if ((m = /^between\s+(.+?)\s+\u0001\s*(.+)$/is.exec(t))) return `${ex} BETWEEN ${lit(m[1])} AND ${lit(m[2])}`;
    if ((m = /^in\s*\((.*)\)$/is.exec(t))) return `${ex} IN (${splitTop(m[1], /^,/).map(lit).join(', ')})`;
    if ((m = /^like\s+(.+)$/is.exec(t))) return `${ex} LIKE ${likeLit(m[1])}`;
    if ((m = /^(>=|<=|<>|!=|>|<|=)\s*(.+)$/s.exec(t))) {
      const op = m[1] === '!=' ? '<>' : m[1], v = lit(m[2]);
      if (v === 'NULL') return `${ex} ${op === '=' ? 'IS' : 'IS NOT'} NULL`;
      return `${ex} ${op} ${v}`;
    }
    if (/[*?]/.test(t)) return `${ex} LIKE ${likeLit(t)}`;
    const v = lit(t);
    return v === 'NULL' ? `${ex} IS NULL` : `${ex} = ${v}`;
  };
  const prot = t0.replace(/\bbetween\s+("[^"]*"|'[^']*'|#[^#]*#|\S+)\s+and\s+/gi, (m, a) => `between ${a} \u0001 `);
  const ors = splitTop(prot, /^\s+or\s+/i).map(o => splitTop(o, /^\s+and\s+/i).map(a => one(a.trim())).join(' AND '));
  return ors.length > 1 ? ors.map(p => `(${p})`).join(' OR ') : ors[0];
}

/* ---------- field names -> SQL ---------- */
function makeResolver(st, colsOf) {
  const entries = [];
  for (const b of st.boxes) {
    entries.push({ text: `${b.alias}.*`, box: b, field: '*' });
    for (const c of colsOf[b.id] || []) entries.push({ text: `${b.alias}.${c.name}`, box: b, field: c.name, type: c.type });
  }
  const byText = new Map(entries.map(e => [e.text.toLowerCase(), e]));
  const refSQL = e => (e.field === '*' ? `${qq(e.box.alias)}.*` : `${qq(e.box.alias)}.${qq(e.field)}`);
  const byField = name => entries.find(e => e.field !== '*' && e.field.toLowerCase() === name.toLowerCase());
  const lookup = name => byText.get(name.toLowerCase()) || byField(name);
  const bracket = name => { const e = lookup(name); return e ? refSQL(e) : qq(name); };
  const exprSQL = s => s.replace(/\[([^\]]+)\](?:\.\[([^\]]+)\])?/g, (m, a, b) => {
    if (b !== undefined) { const e = byText.get(`${a}.${b}`.toLowerCase()); return e ? refSQL(e) : `${qq(a)}.${qq(b)}`; }
    return bracket(a);
  });
  function resolve(text) {
    const t = String(text).trim();
    const e = byText.get(t.toLowerCase());
    if (e) return { kind: 'field', entry: e, sql: refSQL(e), name: e.field, type: e.type, alias: '' };
    let alias = '', body = t;
    const m = /^([^:\[\]"']+?)\s*:\s*(.+)$/.exec(t);
    if (m) { alias = m[1].trim(); body = m[2].trim(); }
    const single = /^\[?([^\[\]]+)\]?$/.exec(body);
    const e2 = single && lookup(single[1].trim());
    if (e2 && e2.field !== '*') return { kind: 'field', entry: e2, sql: refSQL(e2), name: e2.field, type: e2.type, alias };
    return { kind: 'expr', sql: exprSQL(body), alias, name: alias || 'Expr' };
  }
  return { resolve, entries, bracketRef: bracket, refSQL };
}

const tref = b => (b.kind === 'query' ? `(${b.sql || 'SELECT 1'}) AS ${qq(b.alias)}` : b.alias === b.table ? qq(b.table) : `${qq(b.table)} AS ${qq(b.alias)}`);

function buildSQL(st, colsOf) {
  const warn = [];
  if (!st.boxes.length) return { sql: '', warn };
  const R = makeResolver(st, colsOf);
  const active = st.cols.filter(c => c.text && c.text.trim());
  const aggMode = active.some(c => c.total && c.total !== 'where');
  const sel = [], grp = [], order = [], seen = new Map();
  const rows = Math.max(1, st.orCount || 1);
  const whereRows = Array.from({ length: rows }, () => []), havRows = Array.from({ length: rows }, () => []);
  let exprN = 0;

  for (const c of active) {
    const r = R.resolve(c.text);
    const fn = aggMode ? (c.total || 'group') : (c.total === 'where' ? 'where' : '');
    let ex = r.sql, isAgg = false;
    if (AGG_FN[fn]) {
      if (r.kind === 'field' && r.entry.field === '*') { if (fn !== 'count') warn.push(`${AGG_NAME[fn]} needs a single field, not ${r.entry.text}.`); ex = fn === 'count' ? 'COUNT(*)' : AGG_FN[fn] + '(*)'; }
      else ex = `${AGG_FN[fn]}(${r.sql})`;
      isAgg = true;
    }
    const crit = (c.crit || []);
    crit.forEach((txt, k) => {
      if (k >= rows) return;
      const base = r.kind === 'field' && r.entry.field === '*' ? null : ex;
      const cs = base && critSQL(base, txt, R.bracketRef);
      if (cs) (isAgg ? havRows : whereRows)[k].push(cs);
    });
    if (fn === 'where') continue;
    if (aggMode && !isAgg) grp.push(r.sql);
    if (c.sort) order.push(`${ex} ${c.sort === 'desc' ? 'DESC' : 'ASC'}`);
    if (c.show === false) continue;
    let name = c.alias || r.alias || '';
    if (!name) name = isAgg ? `${AGG_NAME[fn]} of ${r.kind === 'field' ? r.name : 'Expr'}` : r.kind === 'expr' ? `Expr${++exprN}` : r.name;
    let as = !!(c.alias || r.alias) || isAgg || r.kind === 'expr';
    if (r.kind === 'field' && r.entry.field === '*' && !isAgg) { sel.push(ex); continue; }
    const key = name.toLowerCase();
    if (seen.has(key)) { if (r.kind === 'field' && !c.alias && !isAgg) { name = `${r.entry.box.alias}.${r.name}`; as = true; } else warn.push(`Two output columns are both named "${name}".`); }
    seen.set(name.toLowerCase(), 1);
    sel.push(as ? `${ex} AS ${qq(name)}` : ex);
  }

  /* FROM and joins */
  const boxes = st.boxes, inc = new Set([boxes[0].id]);
  let from = 'FROM ' + tref(boxes[0]);
  const used = new Set();
  let progress = true;
  while (progress) {
    progress = false;
    for (const b of boxes) {
      if (inc.has(b.id)) continue;
      const js = st.joins.filter(j => !used.has(j.id) && ((j.a === b.id && inc.has(j.b)) || (j.b === b.id && inc.has(j.a))));
      if (!js.length) continue;
      const ba = id => boxes.find(x => x.id === id);
      const on = js.map(j => `${qq(ba(j.a).alias)}.${qq(j.fa)} = ${qq(ba(j.b).alias)}.${qq(j.fb)}`).join(' AND ');
      const j0 = js[0];
      const newIsA = j0.a === b.id;
      let kw = 'INNER JOIN';
      if (j0.type === 'left') kw = newIsA ? 'RIGHT JOIN' : 'LEFT JOIN';
      if (j0.type === 'right') kw = newIsA ? 'LEFT JOIN' : 'RIGHT JOIN';
      from += `\n  ${kw} ${tref(b)} ON ${on}`;
      js.forEach(j => used.add(j.id));
      inc.add(b.id); progress = true;
    }
  }
  for (const b of boxes) if (!inc.has(b.id)) { from += `\n  CROSS JOIN ${tref(b)}`; warn.push(`"${b.alias}" is not joined to the other tables, so every row is paired with every row.`); inc.add(b.id); }
  const stray = st.joins.filter(j => !used.has(j.id));
  if (stray.length) {
    // joins between tables that were already linked another way go into WHERE
    const ba = id => boxes.find(x => x.id === id);
    stray.forEach(j => whereRows.forEach(r => r.push(`${qq(ba(j.a).alias)}.${qq(j.fa)} = ${qq(ba(j.b).alias)}.${qq(j.fb)}`)));
  }

  const clause = (kw, rs) => {
    const live = rs.filter(r => r.length).map(r => r.join(' AND '));
    if (!live.length) return null;
    return kw + ' ' + (live.length > 1 ? live.map(x => `(${x})`).join(' OR ') : live[0]);
  };
  const parts = [`SELECT ${st.distinct ? 'DISTINCT ' : ''}${sel.length ? sel.join(', ') : '*'}`, from];
  const w = clause('WHERE', whereRows); if (w) parts.push(w);
  if (aggMode && grp.length) parts.push('GROUP BY ' + grp.join(', '));
  const hv = clause('HAVING', havRows); if (hv) parts.push(hv);
  if (order.length) parts.push('ORDER BY ' + order.join(', '));
  if (st.top && /^\d+$/.test(String(st.top).trim())) parts.push('LIMIT ' + String(st.top).trim());
  return { sql: parts.join('\n'), warn };
}

/* queries saved by the first designer ({table, picked, crit, join, sort, dir}) */
function migrateQuery(old) {
  const st = { v: 2, boxes: [], joins: [], cols: [], orCount: 2, distinct: false, top: '', showTotals: false };
  if (!old || !old.table) return st;
  const id = 'b' + Math.random().toString(36).slice(2, 7);
  st.boxes.push({ id, kind: 'table', table: old.table, alias: old.table, x: 16, y: 12 });
  const names = old.picked && old.picked.length ? old.picked : null;
  const key = f => `${old.table}.${f}`;
  const opText = (o, v) => ({ '=': v, '<>': '<>' + v, '>': '>' + v, '<': '<' + v, '>=': '>=' + v, '<=': '<=' + v, contains: `Like "*${v}*"`, begins: `Like "${v}*"`, empty: 'Is Null', filled: 'Is Not Null' }[o]);
  const colFor = f => { let c = st.cols.find(x => x.text === key(f)); if (!c) { c = { text: key(f), alias: '', total: '', sort: '', show: true, crit: ['', ''] }; st.cols.push(c); } return c; };
  if (names) names.forEach(colFor);
  else st.cols.push({ text: `${old.table}.*`, alias: '', total: '', sort: '', show: true, crit: ['', ''] });
  (old.crit || []).filter(c => c.field).forEach((c, i) => {
    const col = colFor(c.field); if (names && !names.includes(c.field)) col.show = false;
    const row = old.join === 'OR' ? Math.min(i, 5) : 0;
    while (col.crit.length <= row) col.crit.push('');
    col.crit[row] = opText(c.op, c.val);
    st.orCount = Math.max(st.orCount, row + 1);
  });
  if (old.sort) { const col = colFor(old.sort); if (names && !names.includes(old.sort)) col.show = false; col.sort = old.dir === 'DESC' ? 'desc' : 'asc'; }
  return st;
}

function queryTab(t) {
  let st = { v: 2, boxes: [], joins: [], cols: [], orCount: 2, distinct: false, top: '', showTotals: false, manual: false };
  let view = 'design', colsOf = {};
  const sqlBox = h('textarea', { class: 'sql', spellcheck: 'false', placeholder: 'SELECT * FROM "Table"', oninput: () => { st.manual = true; setDirty(t); } });
  const results = h('div', { class: 'results' });
  const canvas = h('div', { class: 'qcanvas' });
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'qlinks');
  const gridBox = h('div', { class: 'qgrid' });
  const warnBox = h('div', { class: 'qwarn', hidden: true });
  const fieldList = h('datalist', { id: 'qfields' });
  const addSel = h('select', { class: 'qadd' });
  const designBox = h('div', { class: 'qdesignview' }, canvas, gridBox, warnBox, fieldList);
  const viewBtn = h('button', { class: 'btn', onclick: () => setView(view === 'design' ? 'sql' : 'design') }, 'SQL View');
  const totalsBtn = h('button', { class: 'btn', title: 'Show or hide the Total row (Sum, Count, Group By…)', onclick: () => { st.showTotals = !st.showTotals; renderGrid(); } }, 'Σ Totals');
  const distinctBox = h('input', { type: 'checkbox', onchange: e => { st.distinct = e.target.checked; regen(); } });
  const topBox = h('input', { type: 'text', class: 'qtop', placeholder: 'All', title: 'Return only this many rows', oninput: e => { st.top = e.target.value.trim(); regen(); } });

  const root = h('div', { class: 'pane' },
    h('div', { class: 'qbar' },
      h('button', { class: 'btn primary', onclick: () => run() }, 'Run'), viewBtn, h('button', { class: 'btn', onclick: () => save() }, 'Save Query'),
      h('button', { class: 'btn', onclick: () => exportCsv(sqlBox.value, t.name) }, 'Export CSV'),
      h('span', { class: 'sep' }),
      h('span', { class: 'dsonly' }, 'Add', addSel, h('button', { class: 'btn', onclick: () => addFromSelect() }, 'Add Table'), totalsBtn,
        h('label', {}, distinctBox, 'Unique rows'), h('label', {}, 'Top', topBox))),
    h('div', { class: 'qbody' }, designBox, sqlBox, results));
  canvas.append(svg);

  let timer;
  const regen = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const r = buildSQL(st, colsOf);
      st.manual = false;
      sqlBox.value = r.sql;
      warnBox.hidden = !r.warn.length; warnBox.textContent = r.warn.join(' ');
      setDirty(t);
    }, 120);
  };

  const uidq = () => 'b' + Math.random().toString(36).slice(2, 8);
  const boxEl = id => canvas.querySelector(`.qbox[data-id="${id}"]`);
  const boxById = id => st.boxes.find(b => b.id === id);

  /* ----- tables on the canvas ----- */
  async function loadCols(b) {
    try {
      if (b.kind === 'query') {
        const def = await db('getObject', 'query', b.table);
        b.sql = def.sql.trim().replace(/;+\s*$/, '');
        const r = await db('run', `SELECT * FROM (${b.sql}) LIMIT 0`);
        colsOf[b.id] = r.columns.map(n => ({ name: n, type: '', pk: false }));
      } else colsOf[b.id] = await db('columns', b.table);
      b.missing = false;
    } catch { colsOf[b.id] = []; b.missing = true; }
  }

  function updateLists() {
    const entries = makeResolver(st, colsOf).entries;
    fieldList.replaceChildren(...entries.map(e => h('option', { value: e.text })));
    const opts = [...S.objs.table.map(n => ['table:' + n, 'Table: ' + n]), ...S.objs.query.filter(n => n !== t.name).map(n => ['query:' + n, 'Query: ' + n])];
    addSel.replaceChildren(...opts.map(([v, l]) => h('option', { value: v }, l)));
  }

  async function addBox(kind, name, x, y) {
    let alias = name, n = 1;
    while (st.boxes.some(b => b.alias.toLowerCase() === alias.toLowerCase())) alias = `${name}_${n++}`;
    const k = st.boxes.length;
    const b = { id: uidq(), kind, table: name, alias, x: x ?? 16 + (k % 4) * 190, y: y ?? 12 + Math.floor(k / 4) * 120 };
    await loadCols(b);
    st.boxes.push(b);
    autoJoin(b);
    renderCanvas(); renderGrid(); updateLists(); regen();
  }
  function addFromSelect() { const v = addSel.value; if (v) { const [k, ...n] = v.split(':'); addBox(k, n.join(':')); } }

  /* tables that share a key name get joined like Access does */
  function autoJoin(nb) {
    if (nb.kind !== 'table') return;
    for (const o of st.boxes) {
      if (o === nb || o.kind !== 'table' || st.joins.some(j => (j.a === o.id && j.b === nb.id) || (j.a === nb.id && j.b === o.id))) continue;
      for (const c of colsOf[nb.id] || []) {
        const m = (colsOf[o.id] || []).find(x => x.name.toLowerCase() === c.name.toLowerCase());
        if (m && (c.pk || m.pk) && !/^(notes?|name)$/i.test(c.name)) { st.joins.push({ id: uidq(), a: o.id, fa: m.name, b: nb.id, fb: c.name, type: 'inner' }); break; }
      }
    }
  }

  function removeBox(b) {
    st.boxes = st.boxes.filter(x => x !== b);
    st.joins = st.joins.filter(j => j.a !== b.id && j.b !== b.id);
    st.cols = st.cols.filter(c => !(c.text || '').toLowerCase().startsWith(b.alias.toLowerCase() + '.'));
    delete colsOf[b.id];
    renderCanvas(); renderGrid(); updateLists(); regen();
  }

  function addField(b, f) {
    const c = { text: `${b.alias}.${f}`, alias: '', total: '', sort: '', show: true, crit: [] };
    const blank = st.cols.findIndex(x => !x.text.trim());
    if (blank >= 0) st.cols[blank] = c; else st.cols.push(c);
    renderGrid(); regen();
  }

  function dragEv(move, up) {
    const mm = e => move(e), mu = e => { removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); up && up(e); };
    addEventListener('mousemove', mm); addEventListener('mouseup', mu);
  }

  function renderCanvas() {
    canvas.querySelectorAll('.qbox').forEach(x => x.remove());
    for (const b of st.boxes) {
      const cols = colsOf[b.id] || [];
      const list = h('div', { class: 'qfields', onscroll: drawLinks }, [{ name: '*', pk: false }, ...cols].map(c => h('div', {
        class: 'qf' + (c.pk ? ' pk' : ''), 'data-f': c.name, draggable: c.name === '*' ? 'false' : 'true',
        ondblclick: () => addField(b, c.name),
        ondragstart: e => e.dataTransfer.setData('text/plain', `cdb-join:${b.id}|${c.name}`),
        ondragover: e => { if (c.name !== '*') e.preventDefault(); },
        ondrop: e => {
          e.preventDefault();
          const d = e.dataTransfer.getData('text/plain');
          if (!d.startsWith('cdb-join:')) return;
          const [aid, af] = d.slice(9).split('|');
          if (aid === b.id || c.name === '*') return;
          if (st.joins.some(j => (j.a === aid && j.fa === af && j.b === b.id && j.fb === c.name))) return;
          st.joins.push({ id: uidq(), a: aid, fa: af, b: b.id, fb: c.name, type: 'inner' });
          drawLinks(); regen();
        }
      }, (c.pk ? '🔑 ' : '') + c.name)));
      const el = h('div', { class: 'qbox' + (b.missing ? ' bad' : ''), 'data-id': b.id, style: `left:${b.x}px;top:${b.y}px` },
        h('div', { class: 'qh', title: b.kind === 'query' ? 'Query: ' + b.table : b.table,
          onmousedown: e => {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            const sx = e.clientX, sy = e.clientY, ox = b.x, oy = b.y;
            dragEv(ev => { b.x = Math.max(0, ox + ev.clientX - sx); b.y = Math.max(0, oy + ev.clientY - sy); el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; drawLinks(); }, () => setDirty(t));
          } }, h('span', {}, b.alias), h('button', { title: 'Remove from query', onclick: () => removeBox(b) }, '×')),
        b.missing ? h('div', { class: 'note' }, 'Not found') : list);
      canvas.append(el);
    }
    requestAnimationFrame(drawLinks);
  }

  /* ----- join lines ----- */
  function fieldEl(id, f) {
    const bx = boxEl(id);
    return bx ? [...bx.querySelectorAll('.qf')].find(x => x.dataset.f === f) : null;
  }
  function drawLinks() {
    const cr = canvas.getBoundingClientRect();
    const rel = el => { const r = el.getBoundingClientRect(); return { l: r.left - cr.left + canvas.scrollLeft, r: r.right - cr.left + canvas.scrollLeft, t: r.top - cr.top + canvas.scrollTop, b: r.bottom - cr.top + canvas.scrollTop }; };
    let w = canvas.clientWidth, hh = canvas.clientHeight;
    canvas.querySelectorAll('.qbox').forEach(el => { w = Math.max(w, el.offsetLeft + el.offsetWidth + 30); hh = Math.max(hh, el.offsetTop + el.offsetHeight + 30); });
    svg.setAttribute('width', w); svg.setAttribute('height', hh);
    svg.replaceChildren();
    const defs = document.createElementNS(svgNS, 'defs');
    defs.innerHTML = '<marker id="qarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>';
    svg.append(defs);
    for (const j of st.joins) {
      const ea = fieldEl(j.a, j.fa), eb = fieldEl(j.b, j.fb), xa = boxEl(j.a), xb = boxEl(j.b);
      if (!ea || !eb || !xa || !xb) continue;
      const A = rel(xa), B = rel(xb), fa = rel(ea), fb = rel(eb), la = rel(xa.querySelector('.qfields')), lb = rel(xb.querySelector('.qfields'));
      const ya = Math.max(la.t + 8, Math.min(la.b - 8, (fa.t + fa.b) / 2)), yb = Math.max(lb.t + 8, Math.min(lb.b - 8, (fb.t + fb.b) / 2));
      let ax, bx, da, db_;
      if (A.r + 16 < B.l) { ax = A.r; bx = B.l; da = 1; db_ = -1; }
      else if (B.r + 16 < A.l) { ax = A.l; bx = B.r; da = -1; db_ = 1; }
      else { ax = A.r; bx = B.r; da = 1; db_ = 1; }
      const d = `M${ax} ${ya} L${ax + da * 14} ${ya} L${bx + db_ * 14} ${yb} L${bx} ${yb}`;
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('class', 'qj' + (st.selJoin === j.id ? ' on' : ''));
      const vis = document.createElementNS(svgNS, 'path');
      vis.setAttribute('d', d); vis.setAttribute('class', 'vis');
      if (j.type === 'left') vis.setAttribute('marker-end', 'url(#qarrow)');
      if (j.type === 'right') vis.setAttribute('marker-start', 'url(#qarrow)');
      const hit = document.createElementNS(svgNS, 'path');
      hit.setAttribute('d', d); hit.setAttribute('class', 'hit');
      hit.addEventListener('mousedown', () => { st.selJoin = j.id; drawLinks(); });
      hit.addEventListener('dblclick', () => joinDialog(j));
      hit.addEventListener('contextmenu', e => popup(e, [['Join properties…', () => joinDialog(j)], ['Delete join', () => { st.joins = st.joins.filter(x => x !== j); drawLinks(); regen(); }]]));
      g.append(vis, hit); svg.append(g);
    }
  }
  canvas.addEventListener('scroll', drawLinks);
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', e => {
    if ((e.key !== 'Delete' && e.key !== 'Backspace') || !st.selJoin) return;
    st.joins = st.joins.filter(j => j.id !== st.selJoin); st.selJoin = null; drawLinks(); regen();
  });
  canvas.addEventListener('mousedown', e => { if (e.target === canvas || e.target === svg) { st.selJoin = null; drawLinks(); } });
  if (window.ResizeObserver) new ResizeObserver(() => drawLinks()).observe(canvas);

  async function joinDialog(j) {
    const A = boxById(j.a), B = boxById(j.b);
    if (!A || !B) return;
    const r = await ask({
      title: 'Join properties', message: `${A.alias}.${j.fa}  =  ${B.alias}.${j.fb}`, choiceLabel: 'Which rows to include', ok: 'OK', choice: j.type,
      choices: [{ value: 'inner', label: 'Only rows where both tables match' }, { value: 'left', label: `All rows from ${A.alias}, matching rows from ${B.alias}` },
        { value: 'right', label: `All rows from ${B.alias}, matching rows from ${A.alias}` }, { value: 'delete', label: 'Delete this join' }]
    });
    if (!r) return;
    if (r.choice === 'delete') st.joins = st.joins.filter(x => x !== j); else j.type = r.choice;
    drawLinks(); regen();
  }

  /* ----- field grid ----- */
  function renderGrid() {
    if (!st.cols.length || st.cols[st.cols.length - 1].text.trim()) st.cols.push({ text: '', alias: '', total: '', sort: '', show: true, crit: [] });
    const showT = st.showTotals || st.cols.some(c => c.total);
    totalsBtn.classList.toggle('on', showT);
    const R = makeResolver(st, colsOf);
    const nCrit = Math.max(1, st.orCount || 2);
    const tableText = c => { if (!c.text.trim()) return ''; const r = R.resolve(c.text); return r.kind === 'field' ? r.entry.box.alias : ''; };
    const rowsDef = [['Field', (c, i) => h('div', { class: 'gf' },
        h('input', { type: 'text', list: 'qfields', value: c.text, spellcheck: 'false', placeholder: i === st.cols.length - 1 ? 'Pick or type a field' : '', oninput: e => { c.text = e.target.value; regen(); },
          onchange: e => { c.text = e.target.value.trim(); if (c.text && i === st.cols.length - 1) renderGrid(); else { const td = gridBox.querySelector(`[data-tc="${i}"]`); if (td) td.textContent = tableText(c); } } }),
        c.text.trim() && h('span', { class: 'gmove' },
          h('button', { class: 'btn mini', title: 'Move left', disabled: i === 0, onclick: () => { [st.cols[i - 1], st.cols[i]] = [st.cols[i], st.cols[i - 1]]; renderGrid(); regen(); } }, '◀'),
          h('button', { class: 'btn mini', title: 'Move right', disabled: i >= st.cols.length - 2, onclick: () => { [st.cols[i + 1], st.cols[i]] = [st.cols[i], st.cols[i + 1]]; renderGrid(); regen(); } }, '▶'),
          h('button', { class: 'btn mini', title: 'Remove column', onclick: () => { st.cols.splice(i, 1); renderGrid(); regen(); } }, '×')))],
      ['Table', (c, i) => h('div', { class: 'gt', 'data-tc': i }, tableText(c))],
      ['Name', (c) => h('input', { type: 'text', value: c.alias || '', placeholder: 'Same as field', title: 'Column heading', spellcheck: 'false', oninput: e => { c.alias = e.target.value.trim(); regen(); } })]];
    if (showT) rowsDef.push(['Total', c => h('select', { value: c.total || '', onchange: e => { c.total = e.target.value; renderGrid(); regen(); } },
      [['', ''], ['group', 'Group By'], ['sum', 'Sum'], ['avg', 'Avg'], ['count', 'Count'], ['min', 'Min'], ['max', 'Max'], ['where', 'Where']].map(([v, l]) => h('option', { value: v }, l)))]);
    rowsDef.push(['Sort', c => h('select', { value: c.sort || '', onchange: e => { c.sort = e.target.value; regen(); } }, [['', ''], ['asc', 'Ascending'], ['desc', 'Descending']].map(([v, l]) => h('option', { value: v }, l)))],
      ['Show', c => h('input', { type: 'checkbox', checked: c.show !== false, disabled: c.total === 'where', onchange: e => { c.show = e.target.checked; regen(); } })]);
    for (let k = 0; k < nCrit; k++) rowsDef.push([k === 0 ? 'Criteria' : 'or', c => h('input', { type: 'text', class: 'crit', value: (c.crit || [])[k] || '', spellcheck: 'false', title: 'Examples: >10   "Smith"   Like "A*"   Between 1 And 5   In ("a","b")   Is Null',
      oninput: e => { c.crit = c.crit || []; while (c.crit.length <= k) c.crit.push(''); c.crit[k] = e.target.value; regen(); } })]);
    const table = h('table', { class: 'qg' }, h('tbody', {}, rowsDef.map(([label, mk]) => h('tr', {}, h('th', {}, label), st.cols.map((c, i) => h('td', { class: 'g-' + label.toLowerCase() }, mk(c, i)))))),
      h('tfoot', {}, h('tr', {}, h('td', { colspan: st.cols.length + 1 }, h('button', { class: 'btn', onclick: () => { if (st.orCount < 8) { st.orCount = (st.orCount || 2) + 1; renderGrid(); } } }, 'More criteria rows')))));
    gridBox.replaceChildren(table);
  }

  /* ----- views, run, save ----- */
  async function setView(v) {
    if (v === 'design' && view === 'sql') {
      if (st.manual && sqlBox.value.trim() && !(await sure('Switch to design view?', 'The query designer will rebuild the SQL from the design, replacing what you typed.', 'Switch'))) return;
      if (st.manual) { const r = buildSQL(st, colsOf); sqlBox.value = r.sql; st.manual = false; }
    }
    view = v;
    designBox.hidden = v !== 'design'; sqlBox.hidden = v !== 'sql';
    root.querySelector('.dsonly').hidden = v !== 'design';
    viewBtn.textContent = v === 'design' ? 'SQL View' : 'Design View';
    if (v === 'design') { renderCanvas(); renderGrid(); }
  }

  async function run() {
    const sql = sqlBox.value.trim();
    if (!sql) return toast('There is nothing to run yet. Add a table or type some SQL.', true);
    if (/^\s*(insert|update|delete|drop|alter|create|replace)\b/i.test(sql) && !(await sure('Run action query?', 'This query changes your data and cannot be undone.', 'Run'))) return;
    try {
      const r = await db('run', sql);
      results.replaceChildren(resultView(r));
      if (!r.columns.length) { await refreshNav(); reloadAll(); }
    } catch (e) { results.replaceChildren(h('div', { class: 'err' }, e.message)); }
  }

  async function save() {
    try {
      const clean = JSON.parse(JSON.stringify(st));
      clean.boxes.forEach(b => { delete b.missing; });
      clean.cols = clean.cols.filter(c => c.text.trim());
      await db('saveObject', 'query', t.name, { sql: sqlBox.value, designer: clean, manual: st.manual });
      setDirty(t, false); toast('Query saved.');
    } catch (e) { fail(e); }
  }

  sqlBox.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); run(); } });

  (async () => {
    const def = await db('getObject', 'query', t.name);
    sqlBox.value = def.sql || '';
    let manual = false;
    if (def.designer && def.designer.v === 2) st = { ...st, ...def.designer, manual: !!def.manual };
    else if (def.designer && def.designer.table) st = { ...st, ...migrateQuery(def.designer), manual: false };
    else manual = !!(def.sql && def.sql.trim());
    for (const b of st.boxes) await loadCols(b);
    st.manual = manual || st.manual;
    distinctBox.checked = !!st.distinct; topBox.value = st.top || '';
    updateLists();
    view = 'design';
    await setView(manual ? 'sql' : 'design');
    if (/^\s*(select|with)\b/i.test(sqlBox.value)) run();
  })().catch(fail);

  return {
    root, save,
    toggleDesign: () => setView(view === 'design' ? 'sql' : 'design'),
    reload: async () => { for (const b of st.boxes) await loadCols(b); updateLists(); if (view === 'design') { renderCanvas(); renderGrid(); } }
  };
}

if (typeof module !== 'undefined') module.exports = { buildSQL, critSQL, migrateQuery, makeResolver };

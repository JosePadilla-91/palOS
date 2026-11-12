'use strict';
const db = (m, ...a) => cdb.db(m, ...a);
const $ = s => document.querySelector(s);
const q = s => '"' + String(s).replace(/"/g, '""') + '"';
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden') el[k] = !!v;
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  if (value !== undefined) el.value = value;
  return el;
}

const ICONS = {
  table: '<rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="M1.5 6.5h13M1.5 10h13M6 2.5v11"/>',
  query: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>',
  form: '<rect x="2.5" y="1.5" width="11" height="13" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h3"/>',
  report: '<path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M9.5 1.5v3h3M5.5 8h5M5.5 11h5"/>'
};
ICONS.tdesign = ICONS.tnew = ICONS.table;
function icon(k) {
  const s = h('span', { class: 'ico' });
  s.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor">${ICONS[k] || ''}</svg>`;
  return s;
}

const KINDS = { table: 'Tables', query: 'Queries', form: 'Forms', report: 'Reports' };
const TYPE_LABEL = { autonumber: 'AutoNumber', shorttext: 'Short Text', longtext: 'Long Text', number: 'Number', decimal: 'Decimal', currency: 'Currency', yesno: 'Yes/No', date: 'Date', datetime: 'Date/Time' };
const NUMERIC = new Set(['number', 'decimal', 'currency', 'autonumber']);
const S = { info: null, objs: { table: [], query: [], form: [], report: [] }, tabs: [], active: null, recent: [], selNav: null };
let newCount = 0;

/* ---------- feedback ---------- */
let toastTimer;
function toast(msg, bad) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = ''; }, 3800);
}
const fail = e => toast(String((e && e.message) || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), true);

function ask(o) {
  return new Promise(res => {
    const inp = o.input ? h('input', { type: 'text', value: o.value || '', spellcheck: 'false' }) : null;
    const sel = o.choices ? h('select', {}, o.choices.map(c => h('option', { value: c.value }, c.label))) : null;
    if (sel && o.choice) sel.value = o.choice;
    const done = v => { ov.remove(); res(v); };
    const ok = () => done({ value: inp ? inp.value.trim() : '', choice: sel ? sel.value : null });
    const okBtn = h('button', { class: 'btn primary' + (o.danger ? ' danger' : ''), onclick: ok }, o.ok || 'OK');
    const ov = h('div', { class: 'overlay', onkeydown: e => { if (e.key === 'Escape') done(null); else if (e.key === 'Enter' && e.target.tagName === 'INPUT') ok(); } },
      h('div', { class: 'dlg', role: 'dialog' },
        h('h3', {}, o.title), o.message && h('p', {}, o.message), inp,
        o.choiceLabel && h('label', {}, o.choiceLabel), sel,
        h('div', { class: 'row end' }, h('button', { class: 'btn', onclick: () => done(null) }, 'Cancel'), okBtn)));
    document.body.append(ov);
    (inp || sel || okBtn).focus(); if (inp) inp.select();
  });
}
const sure = (title, message, ok = 'Delete') => ask({ title, message, ok, danger: true }).then(Boolean);

function popup(e, items) {
  e.preventDefault();
  document.querySelector('.ctx')?.remove();
  const m = h('div', { class: 'ctx', style: `left:${Math.min(e.clientX, innerWidth - 180)}px;top:${Math.min(e.clientY, innerHeight - items.length * 30 - 12)}px` },
    items.map(([label, fn]) => h('button', { onclick: () => { m.remove(); fn(); } }, label)));
  document.body.append(m);
  setTimeout(() => addEventListener('mousedown', ev => { if (!m.contains(ev.target)) m.remove(); }, { once: true }), 0);
}

/* ---------- values ---------- */
function coerce(c, text) {
  if (text === '' || text == null) return null;
  switch (c.type) {
    case 'number': case 'autonumber':
      if (!/^-?\d+$/.test(text.trim())) throw new Error(`"${c.name}" needs a whole number.`);
      return Number(text);
    case 'decimal': case 'currency': {
      const n = Number(String(text).replace(/[$,\s]/g, ''));
      if (!isFinite(n)) throw new Error(`"${c.name}" needs a number.`);
      return n;
    }
    case 'datetime': return text.replace('T', ' ');
    default: return text;
  }
}
const money = v => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function show(type, v) {
  if (v === null || v === undefined) return '';
  if (type === 'currency' && typeof v === 'number') return money(v);
  if (type === 'yesno') return v == 1 ? 'Yes' : 'No';
  return String(v);
}

/* ---------- tabs ---------- */
const activeTab = () => S.tabs.find(t => t.id === S.active);

function openTab(kind, name, make) {
  const id = kind + ':' + name;
  let t = S.tabs.find(x => x.id === id);
  if (!t) {
    t = { id, kind, name, title: name, table: null, dirty: false };
    try { Object.assign(t, make(t)); } catch (e) { return fail(e); }
    t.root.hidden = true;
    $('#stage').append(t.root);
    S.tabs.push(t);
  }
  activate(id);
}

function activate(id) {
  S.active = id;
  for (const t of S.tabs) t.root.hidden = t.id !== id;
  $('#hint').hidden = S.tabs.length > 0;
  renderTabs(); markNav();
}

function renderTabs() {
  $('#tabs').replaceChildren(...S.tabs.map(t => h('div', {
    class: 'tab' + (t.id === S.active ? ' on' : ''), onclick: () => activate(t.id),
    onauxclick: e => { if (e.button === 1) closeTab(t.id); }
  }, icon(t.kind), t.title + (t.dirty ? ' *' : ''),
  h('button', { class: 'x', title: 'Close', onclick: e => { e.stopPropagation(); closeTab(t.id); } }, '×'))));
}

async function closeTab(id, force) {
  const t = S.tabs.find(x => x.id === id);
  if (!t) return;
  if (t.dirty && !force && !(await sure('Discard changes?', `"${t.title}" has unsaved changes.`, 'Discard'))) return;
  t.root.remove();
  S.tabs = S.tabs.filter(x => x !== t);
  if (S.active === id) { const n = S.tabs[S.tabs.length - 1]; n ? activate(n.id) : (S.active = null, activate(null)); }
  else renderTabs();
}
const closeTabsWhere = (fn) => S.tabs.filter(fn).forEach(t => closeTab(t.id, true));
const reloadAll = () => S.tabs.forEach(t => t.reload && t.reload());
const setDirty = (t, v = true) => { if (t.dirty !== v) { t.dirty = v; renderTabs(); } };

/* ---------- navigation pane ---------- */
async function refreshNav() {
  const l = await db('list');
  S.objs = { table: l.tables, query: l.queries, form: l.forms, report: l.reports };
  $('#nav').replaceChildren(
    h('div', { class: 'nav-title', title: S.info.path }, S.info.name),
    ...Object.entries(KINDS).map(([k, label]) => h('section', {},
      h('header', {}, label, h('button', { class: 'plus', title: 'New ' + k.toLowerCase(), onclick: () => createObject(k) }, '+')),
      h('ul', {}, S.objs[k].map(n => h('li', {
        'data-k': k, 'data-n': n,
        onclick: () => { S.selNav = k + ':' + n; markNav(); },
        ondblclick: () => openObject(k, n),
        oncontextmenu: e => navMenu(e, k, n)
      }, icon(k), h('span', {}, n)))),
      !S.objs[k].length && h('div', { class: 'empty' }, 'None yet'))));
  markNav();
}

function markNav() {
  const t = activeTab();
  const on = t ? (t.kind === 'tdesign' ? 'table' : t.kind) + ':' + t.name : null;
  document.querySelectorAll('#nav li').forEach(li => {
    const key = li.dataset.k + ':' + li.dataset.n;
    li.classList.toggle('on', key === on);
    li.classList.toggle('sel', key === S.selNav);
  });
}

function openObject(k, n) {
  if (k === 'table') openTab('table', n, tableTab);
  else if (k === 'query') openTab('query', n, queryTab);
  else if (k === 'form') openTab('form', n, formTab);
  else openTab('report', n, reportTab);
}

function navMenu(e, k, n) {
  const items = [['Open', () => openObject(k, n)]];
  if (k === 'table') items.push(['Design View', () => openTab('tdesign', n, designTab)]);
  if (k === 'table' || k === 'query') items.push(['Export as CSV…', async () => {
    const sql = k === 'table' ? `SELECT * FROM ${q(n)}` : (await db('getObject', 'query', n)).sql;
    exportCsv(sql, n);
  }]);
  items.push(['Rename…', () => renameObject(k, n)], ['Delete', () => deleteObject(k, n)]);
  popup(e, items);
}

async function renameObject(k, n) {
  const r = await ask({ title: 'Rename ' + k, input: true, value: n, ok: 'Rename' });
  if (!r || !r.value || r.value === n) return;
  try {
    if (k === 'table') await db('renameTable', n, r.value); else await db('renameObject', k, n, r.value);
    closeTabsWhere(t => t.name === n && (t.kind === k || (k === 'table' && t.kind === 'tdesign')) || (k === 'table' && t.table === n));
    await refreshNav();
  } catch (e) { fail(e); }
}

async function deleteObject(k, n) {
  const msg = k === 'table' ? `"${n}" and all of its records will be deleted permanently.` : `"${n}" will be deleted permanently.`;
  if (!(await sure('Delete ' + k + '?', msg))) return;
  try {
    if (k === 'table') await db('dropTable', n); else await db('deleteObject', k, n);
    closeTabsWhere(t => t.name === n && (t.kind === k || (k === 'table' && t.kind === 'tdesign')));
    await refreshNav(); reloadAll();
  } catch (e) { fail(e); }
}

const nameTaken = (k, n) => S.objs[k].some(x => x.toLowerCase() === n.toLowerCase());

async function createObject(k) {
  if (!S.info) return;
  if (k === 'table') { newCount++; return openTab('tnew', 'Table' + newCount, designTab); }
  const tables = S.objs.table.map(n => ({ value: n, label: n }));
  let opts = { title: 'New ' + k, input: true, ok: 'Create', value: '' };
  if (k === 'form' || k === 'report') {
    const src = k === 'form' ? tables : [...tables.map(x => ({ value: 'table:' + x.value, label: 'Table: ' + x.label })), ...S.objs.query.map(n => ({ value: 'query:' + n, label: 'Query: ' + n }))];
    if (!src.length) return toast(k === 'form' ? 'Create a table first.' : 'Create a table or query first.', true);
    opts = { ...opts, choices: src, choiceLabel: k === 'form' ? 'Records come from' : 'Data comes from' };
  }
  const r = await ask(opts);
  if (!r) return;
  if (!r.value) return toast('Give it a name.', true);
  if (nameTaken(k, r.value)) return toast(`A ${k} named "${r.value}" already exists.`, true);
  let def;
  if (k === 'query') def = { sql: '' };
  else if (k === 'form') def = { table: r.choice };
  else { const [sk, ...sn] = r.choice.split(':'); def = { source: { kind: sk, name: sn.join(':') }, title: r.value, columns: [], groupBy: '', totals: false }; }
  try { await db('saveObject', k, r.value, def); await refreshNav(); openObject(k, r.value); } catch (e) { fail(e); }
}

async function exportCsv(sql, name) {
  try { const p = await cdb.exportCsv(sql, name); if (p) toast('Exported to ' + p); } catch (e) { fail(e); }
}

/* ---------- datasheet ---------- */
function tableTab(t) {
  const name = t.name; t.table = name;
  const PAGE = 500;
  const st = { cols: [], rows: [], total: 0, sort: null, dir: 'asc', search: '', page: 0, cur: { r: 0, c: 0 }, sel: new Set(), anchor: null };
  const grid = h('div', { class: 'grid', tabindex: '0' });
  const info = h('span');
  const pager = h('span', { class: 'pager' });
  const search = h('input', { type: 'search', placeholder: 'Search records', oninput: debounce(() => { st.search = search.value; st.page = 0; load(); }, 250) });
  const root = h('div', { class: 'pane' },
    h('div', { class: 'toolbar' },
      h('button', { class: 'btn', onclick: () => openTab('tdesign', name, designTab) }, 'Design View'),
      h('button', { class: 'btn', onclick: addRecord }, 'New Record'),
      h('button', { class: 'btn', onclick: delSel }, 'Delete Record'),
      h('button', { class: 'btn', onclick: () => exportCsv(`SELECT * FROM ${q(name)}`, name) }, 'Export CSV'),
      h('span', { class: 'grow' }), search),
    grid, h('div', { class: 'foot' }, info, pager));

  async function load() {
    try {
      const r = await db('rows', name, { search: st.search, sort: st.sort, dir: st.dir, limit: PAGE, offset: st.page * PAGE });
      st.cols = r.cols; st.rows = r.rows; st.total = r.total; st.sel.clear();
      st.cur.r = Math.min(st.cur.r, st.rows.length);
      draw();
    } catch (e) { grid.replaceChildren(h('div', { class: 'err' }, e.message)); }
  }

  function cell(row, r, c, ci) {
    const v = row ? row[c.name] : null;
    const cls = [NUMERIC.has(c.type) ? 'num' : '', c.type === 'yesno' ? 'chk' : '', st.cur.r === r && st.cur.c === ci ? 'active' : ''].join(' ');
    const td = h('td', { class: cls, 'data-r': r, 'data-c': ci, onmousedown: () => setCur(r, ci), ondblclick: () => startEdit(r, ci) });
    if (c.type === 'yesno') {
      td.append(h('input', { type: 'checkbox', checked: v == 1, onchange: ev => commit(r, ci, ev.target.checked ? '1' : '0', true) }));
    } else td.textContent = show(c.type, v);
    return td;
  }

  function draw() {
    const sy = grid.scrollTop, sx = grid.scrollLeft, had = grid.contains(document.activeElement);
    const head = h('tr', {}, h('th', { class: 'rh' }), st.cols.map(c => h('th', {
      onclick: () => { if (st.sort === c.name) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = c.name; st.dir = 'asc'; } load(); }
    }, c.name, st.sort === c.name ? h('span', { class: 'arrow' }, st.dir === 'asc' ? ' ▲' : ' ▼') : '')));
    const body = st.rows.map((row, r) => h('tr', { class: st.sel.has(row._rowid_) ? 'sel' : '' },
      h('th', { class: 'rh', onclick: e => selectRow(e, r) }, ''), st.cols.map((c, ci) => cell(row, r, c, ci))));
    const nr = h('tr', { class: 'newrow' }, h('th', { class: 'rh' }, '*'), st.cols.map((c, ci) => cell(null, st.rows.length, c, ci)));
    grid.replaceChildren(h('table', { class: 'ds' }, h('thead', {}, head), h('tbody', {}, body, nr)));
    grid.scrollTop = sy; grid.scrollLeft = sx;
    if (had) grid.focus();
    info.textContent = `${st.total} record${st.total === 1 ? '' : 's'}` + (st.search ? ' match' : '');
    const pages = Math.max(1, Math.ceil(st.total / PAGE));
    pager.replaceChildren(...(pages > 1 ? [
      h('button', { class: 'btn', disabled: st.page === 0, onclick: () => { st.page--; load(); } }, 'Previous'),
      `Page ${st.page + 1} of ${pages}`,
      h('button', { class: 'btn', disabled: st.page >= pages - 1, onclick: () => { st.page++; load(); } }, 'Next')] : []));
  }

  function setCur(r, c) {
    st.cur = { r, c };
    grid.querySelector('td.active')?.classList.remove('active');
    grid.querySelector(`td[data-r="${r}"][data-c="${c}"]`)?.classList.add('active');
  }
  function move(dr, dc) {
    const r = Math.max(0, Math.min(st.rows.length, st.cur.r + dr));
    const c = Math.max(0, Math.min(st.cols.length - 1, st.cur.c + dc));
    setCur(r, c);
    grid.querySelector('td.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function selectRow(e, r) {
    const id = st.rows[r]._rowid_;
    if (e.shiftKey && st.anchor != null) {
      st.sel.clear();
      for (let i = Math.min(st.anchor, r); i <= Math.max(st.anchor, r); i++) st.sel.add(st.rows[i]._rowid_);
    } else if (e.ctrlKey || e.metaKey) { st.sel.has(id) ? st.sel.delete(id) : st.sel.add(id); st.anchor = r; }
    else { st.sel = new Set([id]); st.anchor = r; }
    draw();
  }

  function startEdit(r, ci) {
    const c = st.cols[ci];
    if (c.type === 'autonumber' || c.type === 'yesno') return;
    const td = grid.querySelector(`td[data-r="${r}"][data-c="${ci}"]`);
    if (!td || td.querySelector('.cell-edit')) return;
    const raw = st.rows[r] ? st.rows[r][c.name] : null;
    const inp = c.type === 'longtext' ? h('textarea', { class: 'cell-edit' })
      : h('input', { class: 'cell-edit', type: c.type === 'date' ? 'date' : c.type === 'datetime' ? 'datetime-local' : 'text' });
    inp.value = raw == null ? '' : c.type === 'datetime' ? String(raw).replace(' ', 'T') : raw;
    let done = false;
    const finish = async save => { if (done) return; done = true; if (save) await commit(r, ci, inp.value); else draw(); };
    inp.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') finish(false).then(() => grid.focus());
      else if (e.key === 'Enter' && !(c.type === 'longtext' && e.shiftKey)) { e.preventDefault(); finish(true).then(() => grid.focus()); }
      else if (e.key === 'Tab') { e.preventDefault(); finish(true).then(() => { move(0, e.shiftKey ? -1 : 1); grid.focus(); }); }
    });
    inp.addEventListener('blur', () => finish(true));
    td.replaceChildren(inp); inp.focus(); inp.select();
  }

  async function commit(r, ci, text) {
    const c = st.cols[ci];
    try {
      const val = coerce(c, text);
      const row = st.rows[r];
      if (row) {
        if (String(row[c.name] ?? '') === String(val ?? '')) return draw();
        row[c.name] = await db('update', name, row._rowid_, c.name, val);
        draw();
      } else if (val !== null) {
        await db('insert', name, { [c.name]: val });
        await load();
      } else draw();
      reloadOthers();
    } catch (e) { fail(e); draw(); }
  }
  const reloadOthers = () => S.tabs.forEach(x => x !== t && x.table === name && x.reload && x.reload());

  function addRecord() {
    const ci = Math.max(0, st.cols.findIndex(c => c.type !== 'autonumber' && c.type !== 'yesno'));
    setCur(st.rows.length, ci);
    grid.querySelector('td.active')?.scrollIntoView({ block: 'nearest' });
    startEdit(st.rows.length, ci);
  }

  async function delSel() {
    const ids = st.sel.size ? [...st.sel] : st.rows[st.cur.r] ? [st.rows[st.cur.r]._rowid_] : [];
    if (!ids.length) return toast('Select a record first.');
    if (!(await sure('Delete records?', `${ids.length} record${ids.length === 1 ? '' : 's'} will be deleted permanently.`))) return;
    try { await db('remove', name, ids); await load(); reloadOthers(); } catch (e) { fail(e); }
  }

  grid.addEventListener('keydown', e => {
    if (e.target !== grid) return;
    const k = e.key;
    if (k === 'ArrowDown') move(1, 0); else if (k === 'ArrowUp') move(-1, 0);
    else if (k === 'ArrowRight') move(0, 1); else if (k === 'ArrowLeft') move(0, -1);
    else if (k === 'Tab') move(0, e.shiftKey ? -1 : 1);
    else if (k === 'Enter' || k === 'F2') startEdit(st.cur.r, st.cur.c);
    else if (k === 'Delete') delSel();
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { startEdit(st.cur.r, st.cur.c); return; }
    else return;
    e.preventDefault();
  });

  load();
  return { root, reload: load };
}

/* ---------- design view ---------- */
function designTab(t) {
  const isNew = t.kind === 'tnew';
  const orig = isNew ? null : t.name;
  if (!isNew) { t.table = t.name; t.title = t.name + ' (Design)'; } else t.title = 'New Table';
  let fields = [], original = [];
  const nameInp = h('input', { type: 'text', value: isNew ? '' : t.name, placeholder: 'Table name', oninput: () => setDirty(t) });
  const holder = h('div', { class: 'design' });
  const root = h('div', { class: 'pane' },
    h('div', { class: 'toolbar' }, h('label', {}, 'Table name', nameInp),
      h('button', { class: 'btn', onclick: () => { fields.push({ orig: null, name: '', type: 'shorttext', pk: false, notnull: false, dflt: '' }); setDirty(t); render(); } }, 'Add Field'),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn primary', onclick: save }, 'Save Table')),
    holder);

  const unq = v => (v == null ? '' : String(v).replace(/^'(.*)'$/s, '$1'));
  async function init() {
    if (isNew) fields = [{ orig: null, name: 'ID', type: 'autonumber', pk: true, notnull: true, dflt: '' }, { orig: null, name: '', type: 'shorttext', pk: false, notnull: false, dflt: '' }];
    else {
      const cols = await db('columns', orig);
      original = cols.map(c => c.name);
      fields = cols.map(c => ({ orig: c.name, name: c.name, type: c.type, pk: c.pk, notnull: c.notnull, dflt: unq(c.dflt) }));
    }
    render();
  }

  function render() {
    const dirty = () => setDirty(t);
    holder.replaceChildren(h('table', {},
      h('thead', {}, h('tr', {}, ['Field name', 'Data type', 'Primary key', 'Required', 'Default value', ''].map(x => h('th', {}, x)))),
      h('tbody', {}, fields.map((f, i) => {
        const auto = f.type === 'autonumber';
        return h('tr', {},
          h('td', {}, h('input', { type: 'text', value: f.name, oninput: e => { f.name = e.target.value; dirty(); } })),
          h('td', {}, h('select', { value: f.type, onchange: e => { f.type = e.target.value; if (f.type === 'autonumber') { f.pk = true; f.notnull = true; f.dflt = ''; } dirty(); render(); } },
            Object.entries(TYPE_LABEL).map(([v, l]) => h('option', { value: v }, l)))),
          h('td', { class: 'c' }, h('input', { type: 'checkbox', checked: f.pk || auto, disabled: auto, onchange: e => { f.pk = e.target.checked; dirty(); } })),
          h('td', { class: 'c' }, h('input', { type: 'checkbox', checked: f.notnull || auto, disabled: auto, onchange: e => { f.notnull = e.target.checked; dirty(); } })),
          h('td', {}, h('input', { type: 'text', value: f.dflt, disabled: auto, placeholder: f.type === 'date' || f.type === 'datetime' ? 'CURRENT_DATE' : '', oninput: e => { f.dflt = e.target.value; dirty(); } })),
          h('td', {}, h('button', { class: 'btn', title: 'Remove field', onclick: () => { fields.splice(i, 1); dirty(); render(); } }, '×')));
      }))));
  }

  async function save() {
    const nm = nameInp.value.trim();
    const clean = fields.filter(f => f.name.trim()).map(f => ({ ...f, name: f.name.trim() }));
    try {
      if (isNew) await db('createTable', nm, clean);
      else {
        const kept = new Set(clean.map(f => f.orig));
        const lost = original.filter(n => !kept.has(n));
        if (lost.length && !(await sure('Delete fields?', `${lost.join(', ')} and all of its data will be removed permanently.`, 'Save and delete'))) return;
        await db('alterTable', orig, nm, clean);
      }
      await refreshNav();
      closeTabsWhere(x => x.id === t.id || (orig && x.table === orig));
      openTab('table', nm, tableTab);
      toast('Table saved.');
    } catch (e) { fail(e); }
  }

  init().catch(fail);
  return { root, save };
}

/* ---------- query results (the designers live in queries.js, forms.js, reports.js) ---------- */
function resultView(r) {
  if (!r.columns.length) return h('div', { class: 'note' }, `${r.changes} record${r.changes === 1 ? '' : 's'} affected.`);
  return h('div', {},
    h('table', { class: 'ds' }, h('thead', {}, h('tr', {}, r.columns.map(c => h('th', {}, c)))),
      h('tbody', {}, r.rows.map(row => h('tr', {}, row.map(v => h('td', { class: typeof v === 'number' ? 'num' : '' }, v === null ? '' : String(v))))))),
    h('div', { class: 'note' }, `${r.rows.length} record${r.rows.length === 1 ? '' : 's'}` + (r.truncated ? ' (showing the first 5,000)' : '')));
}

/* ---------- welcome ---------- */
function showWelcome() {
  const card = (key, title, text) => h('button', { class: 'card', onclick: () => cdb.newDb(key) }, h('b', {}, title), h('span', {}, text));
  $('#welcome').replaceChildren(h('div', { class: 'wbox' },
    h('img', { src: 'icon.png', alt: '' }), h('h1', {}, 'Chancery DataBase'),
    h('p', {}, 'Tables, queries, forms and reports in a single file.'),
    h('div', { class: 'cards' },
      card('blank', 'Blank database', 'Start with nothing and design your own tables.'),
      card('contacts', 'Contacts', 'People, companies, phone numbers and birthdays.'),
      card('inventory', 'Inventory', 'Products, prices and stock levels.')),
    h('button', { class: 'btn', onclick: () => cdb.openDb() }, 'Open Database…'),
    S.recent.length > 0 && h('div', { class: 'recent' }, S.recent.map(p => h('button', { onclick: () => cdb.openDb(p) }, p.split('/').pop(), h('small', {}, p))))));
}

async function onDb(info) {
  S.info = info; S.tabs.forEach(t => t.root.remove()); S.tabs = []; S.active = null; S.selNav = null;
  $('#welcome').hidden = !!info; $('#shell').hidden = !info;
  document.title = info ? `${info.name} - Chancery DataBase` : 'Chancery DataBase';
  if (info) { await refreshNav(); activate(null); }
  else { S.recent = (await cdb.state()).recent; showWelcome(); }
}

/* ---------- wiring ---------- */
cdb.on('db-changed', onDb);
cdb.on('imported', async name => { await refreshNav(); openTab('table', name, tableTab); toast(`Imported "${name}".`); });
cdb.on('menu', a => {
  if (!S.info) return;
  const t = activeTab();
  if (a === 'new-table' || a === 'new-query' || a === 'new-form' || a === 'new-report') createObject(a.slice(4));
  else if (a === 'close-tab') { if (S.active) closeTab(S.active); }
  else if (a === 'toggle-design' && t) {
    if (t.kind === 'table') openTab('tdesign', t.name, designTab);
    else if (t.kind === 'tdesign') openTab('table', t.name, tableTab);
    else if (t.toggleDesign) t.toggleDesign();
  } else if (a.startsWith('edit-') && t) {
    const el = document.activeElement, typing = el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
    const cmd = { undo: 'undo', redo: 'redo', cut: 'cut', copy: 'copy', paste: 'paste', all: 'selectAll', del: 'delete' }[a.slice(5)];
    if (typing) document.execCommand(cmd);
    else if (t.edit) t.edit(a.slice(5));
  } else if (a === 'export' && t) {
    if (t.kind === 'table' || t.kind === 'tdesign') exportCsv(`SELECT * FROM ${q(t.name)}`, t.name);
    else if (t.kind === 'query') db('getObject', 'query', t.name).then(d => exportCsv(d.sql, t.name)).catch(fail);
    else toast('Export works for tables and queries.');
  }
});
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); const t = activeTab(); if (t && t.save) t.save(); } });

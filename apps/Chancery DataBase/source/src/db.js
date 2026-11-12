const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const csv = require('./csv');

const META = '_cdb_objects';
const qi = s => '"' + String(s).replace(/"/g, '""') + '"';
const TYPES = {
  autonumber: 'INTEGER', shorttext: 'TEXT', longtext: 'LONGTEXT', number: 'INTEGER',
  decimal: 'REAL', currency: 'CURRENCY', yesno: 'BOOLEAN', date: 'DATE', datetime: 'DATETIME'
};

let SQL = null, db = null, file = null, timer = null;

async function boot() {
  const wasm = fs.readFileSync(path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm'));
  SQL = await initSqlJs({ wasmBinary: wasm });
}

function setup() {
  db.run('PRAGMA foreign_keys = ON');
  db.run(`CREATE TABLE IF NOT EXISTS ${META} (kind TEXT NOT NULL, name TEXT NOT NULL, def TEXT NOT NULL, PRIMARY KEY (kind, name))`);
}

function all(sql, params = []) {
  const st = db.prepare(sql);
  try {
    st.bind(params);
    const out = [];
    while (st.step()) out.push(st.getAsObject());
    return out;
  } finally { st.free(); }
}

function flush() {
  if (!db || !file) return;
  const data = Buffer.from(db.export());
  db.run('PRAGMA foreign_keys = ON');
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}
function touch() { clearTimeout(timer); timer = setTimeout(flush, 400); }

function close() {
  clearTimeout(timer);
  if (db) { flush(); db.close(); }
  db = null; file = null;
}

function info() { return db ? { path: file, name: path.basename(file) } : null; }

function create(p, tpl) {
  close();
  db = new SQL.Database(); file = p;
  setup();
  if (tpl) {
    for (const s of tpl.sql || []) db.run(s);
    for (const o of tpl.objects || []) saveObject(o.kind, o.name, o.def);
  }
  flush();
  return info();
}

function open(p) {
  close();
  try {
    db = new SQL.Database(fs.readFileSync(p)); file = p;
    setup();
    all('SELECT COUNT(*) n FROM sqlite_master');
  } catch (e) {
    try { db && db.close(); } catch {}
    db = null; file = null;
    throw new Error('This is not a Chancery DataBase file.');
  }
  return info();
}

const hidden = n => /^sqlite_/.test(n) || n.startsWith('_cdb_');

function list() {
  const tables = all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name COLLATE NOCASE`)
    .map(r => r.name).filter(n => !hidden(n));
  const objs = all(`SELECT kind, name FROM ${META} ORDER BY name COLLATE NOCASE`);
  const of = k => objs.filter(o => o.kind === k).map(o => o.name);
  return { tables, queries: of('query'), forms: of('form'), reports: of('report') };
}

function uiType(decl, pk) {
  const d = String(decl || '').toUpperCase();
  if (pk && d === 'INTEGER') return 'autonumber';
  if (d === 'LONGTEXT') return 'longtext';
  if (d === 'CURRENCY') return 'currency';
  if (d === 'BOOLEAN') return 'yesno';
  if (d === 'DATETIME') return 'datetime';
  if (d === 'DATE') return 'date';
  if (d === 'REAL' || d === 'FLOAT' || d === 'DOUBLE' || d === 'NUMERIC') return 'decimal';
  if (d.includes('INT')) return 'number';
  return 'shorttext';
}

function columns(t) {
  const rows = all(`PRAGMA table_info(${qi(t)})`);
  if (!rows.length) throw new Error(`The table "${t}" does not exist.`);
  return rows.map(r => ({
    name: r.name, type: uiType(r.type, r.pk > 0), notnull: !!r.notnull,
    dflt: r.dflt_value, pk: r.pk > 0
  }));
}

function rows(t, o = {}) {
  const cols = columns(t);
  const params = [];
  let w = '';
  if (o.search) {
    w = 'WHERE (' + cols.map(c => `CAST(${qi(c.name)} AS TEXT) LIKE ?`).join(' OR ') + ')';
    cols.forEach(() => params.push(`%${o.search}%`));
  }
  const sc = cols.find(c => c.name === o.sort);
  const order = sc ? `ORDER BY ${qi(sc.name)} ${o.dir === 'desc' ? 'DESC' : 'ASC'}` : 'ORDER BY rowid';
  const total = all(`SELECT COUNT(*) n FROM ${qi(t)} ${w}`, params)[0].n;
  const data = all(`SELECT rowid AS _rowid_, * FROM ${qi(t)} ${w} ${order} LIMIT ? OFFSET ?`,
    [...params, o.limit || 500, o.offset || 0]);
  return { cols, rows: data, total };
}

const rowids = t => all(`SELECT rowid AS id FROM ${qi(t)} ORDER BY rowid`).map(r => r.id);
const record = (t, id) => all(`SELECT rowid AS _rowid_, * FROM ${qi(t)} WHERE rowid = ?`, [id])[0] || null;

function insert(t, vals) {
  const keys = Object.keys(vals || {});
  if (keys.length) db.run(`INSERT INTO ${qi(t)} (${keys.map(qi).join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map(k => vals[k]));
  else db.run(`INSERT INTO ${qi(t)} DEFAULT VALUES`);
  const id = all('SELECT last_insert_rowid() AS id')[0].id;
  touch();
  return id;
}

function update(t, id, col, val) {
  db.run(`UPDATE ${qi(t)} SET ${qi(col)} = ? WHERE rowid = ?`, [val, id]);
  touch();
  const r = all(`SELECT ${qi(col)} AS v FROM ${qi(t)} WHERE rowid = ?`, [id])[0];
  return r ? r.v : null;
}

function remove(t, ids) {
  if (!ids.length) return 0;
  db.run(`DELETE FROM ${qi(t)} WHERE rowid IN (${ids.map(() => '?').join(',')})`, ids);
  touch();
  return ids.length;
}

function defaultSQL(f) {
  const v = f.dflt == null ? '' : String(f.dflt).trim();
  if (v === '') return null;
  if (/^(current_date|current_time|current_timestamp)$/i.test(v)) return v.toUpperCase();
  if (/^'.*'$/s.test(v)) return v;
  if (f.type === 'yesno') return /^(1|yes|true)$/i.test(v) ? '1' : '0';
  if (['number', 'decimal', 'currency'].includes(f.type)) {
    if (!isFinite(Number(v))) throw new Error(`The default for "${f.name}" must be a number.`);
    return String(Number(v));
  }
  return "'" + v.replace(/'/g, "''") + "'";
}

function ddl(name, fields) {
  const auto = fields.filter(f => f.type === 'autonumber');
  if (auto.length > 1) throw new Error('A table can have only one AutoNumber field.');
  const parts = fields.map(f => {
    let s = qi(f.name) + ' ' + (TYPES[f.type] || 'TEXT');
    if (f.type === 'autonumber') return s + ' PRIMARY KEY AUTOINCREMENT';
    if (f.notnull) s += ' NOT NULL';
    const d = defaultSQL(f);
    if (d !== null) s += ' DEFAULT ' + d;
    return s;
  });
  const pks = fields.filter(f => f.pk && f.type !== 'autonumber');
  if (!auto.length && pks.length) parts.push('PRIMARY KEY (' + pks.map(f => qi(f.name)).join(', ') + ')');
  return `CREATE TABLE ${qi(name)} (${parts.join(', ')})`;
}

function checkTable(name, fields) {
  if (!name || !name.trim()) throw new Error('Give the table a name.');
  if (hidden(name)) throw new Error('That table name is reserved.');
  if (!fields.length) throw new Error('A table needs at least one field.');
  const seen = new Set();
  for (const f of fields) {
    const k = f.name.toLowerCase();
    if (seen.has(k)) throw new Error(`The field name "${f.name}" is used twice.`);
    seen.add(k);
  }
}

const tableExists = n => all(`SELECT 1 FROM sqlite_master WHERE type='table' AND name = ? COLLATE NOCASE`, [n]).length > 0;

function createTable(name, fields) {
  checkTable(name, fields);
  if (tableExists(name)) throw new Error(`A table named "${name}" already exists.`);
  db.run(ddl(name, fields));
  touch();
}

function alterTable(old, name, fields) {
  checkTable(name, fields);
  if (name.toLowerCase() !== old.toLowerCase() && tableExists(name)) throw new Error(`A table named "${name}" already exists.`);
  const tmp = '_cdb_tmp_' + Date.now();
  const keep = fields.filter(f => f.orig);
  db.run('BEGIN');
  try {
    db.run(ddl(tmp, fields));
    if (keep.length) db.run(`INSERT INTO ${qi(tmp)} (${keep.map(f => qi(f.name)).join(',')}) SELECT ${keep.map(f => qi(f.orig)).join(',')} FROM ${qi(old)}`);
    db.run(`DROP TABLE ${qi(old)}`);
    db.run(`ALTER TABLE ${qi(tmp)} RENAME TO ${qi(name)}`);
    db.run('COMMIT');
  } catch (e) {
    try { db.run('ROLLBACK'); } catch {}
    throw e;
  }
  if (name !== old) retarget(old, name);
  touch();
}

function retarget(old, name) {
  for (const o of all(`SELECT kind, name, def FROM ${META}`)) {
    const d = JSON.parse(o.def);
    let hit = false;
    if (o.kind === 'form' && d.table === old) { d.table = name; hit = true; }
    if (o.kind === 'report' && d.source && d.source.kind === 'table' && d.source.name === old) { d.source.name = name; hit = true; }
    if (hit) saveObject(o.kind, o.name, d);
  }
}

function dropTable(name) { db.run(`DROP TABLE ${qi(name)}`); touch(); }

function renameTable(old, name) {
  if (!name.trim() || hidden(name)) throw new Error('That table name is not allowed.');
  if (name.toLowerCase() !== old.toLowerCase() && tableExists(name)) throw new Error(`A table named "${name}" already exists.`);
  db.run(`ALTER TABLE ${qi(old)} RENAME TO ${qi(name)}`);
  retarget(old, name);
  touch();
}

function getObject(kind, name) {
  const r = all(`SELECT def FROM ${META} WHERE kind = ? AND name = ?`, [kind, name])[0];
  if (!r) throw new Error(`The ${kind} "${name}" was not found.`);
  return JSON.parse(r.def);
}
function saveObject(kind, name, def) {
  db.run(`INSERT OR REPLACE INTO ${META} (kind, name, def) VALUES (?, ?, ?)`, [kind, name, JSON.stringify(def)]);
  touch();
}
function deleteObject(kind, name) { db.run(`DELETE FROM ${META} WHERE kind = ? AND name = ?`, [kind, name]); touch(); }
function renameObject(kind, old, name) {
  if (all(`SELECT 1 FROM ${META} WHERE kind = ? AND name = ? COLLATE NOCASE`, [kind, name]).length && old.toLowerCase() !== name.toLowerCase())
    throw new Error(`A ${kind} named "${name}" already exists.`);
  db.run(`UPDATE ${META} SET name = ? WHERE kind = ? AND name = ?`, [name, kind, old]);
  touch();
}

function run(sql, limit = 5000) {
  let last = null;
  for (const st of db.iterateStatements(sql)) {
    const cols = st.getColumnNames();
    if (cols.length) {
      const out = [];
      let truncated = false;
      while (st.step()) {
        if (out.length >= limit) { truncated = true; break; }
        out.push(st.get());
      }
      last = { columns: cols, rows: out, truncated };
    } else {
      st.step();
      last = { columns: [], rows: [], changes: db.getRowsModified() };
    }
  }
  touch();
  return last || { columns: [], rows: [], changes: 0 };
}

function infer(vals) {
  const v = vals.filter(x => x !== undefined && x !== '');
  if (!v.length) return 'shorttext';
  if (v.every(x => /^-?\d{1,15}$/.test(x))) return 'number';
  if (v.every(x => /^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(x))) return 'decimal';
  if (v.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x))) return 'date';
  if (v.some(x => x.length > 255)) return 'longtext';
  return 'shorttext';
}

function importCSV(text, base) {
  const data = csv.parse(text);
  if (!data.length) throw new Error('The file is empty.');
  const used = new Set();
  const head = data[0].map((h, i) => {
    let n = h.trim() || 'Field' + (i + 1), k = n, c = 2;
    while (used.has(k.toLowerCase())) k = `${n} ${c++}`;
    used.add(k.toLowerCase());
    return k;
  });
  const body = data.slice(1);
  const types = head.map((_, i) => infer(body.map(r => r[i])));
  const fields = head.map((n, i) => ({ name: n, type: types[i] }));
  if (!used.has('id')) fields.unshift({ name: 'ID', type: 'autonumber', pk: true });
  let name = base || 'Imported', n = 2;
  while (tableExists(name)) name = `${base} ${n++}`;
  createTable(name, fields);
  db.run('BEGIN');
  try {
    const st = db.prepare(`INSERT INTO ${qi(name)} (${head.map(qi).join(',')}) VALUES (${head.map(() => '?').join(',')})`);
    for (const r of body) {
      st.run(head.map((_, i) => {
        const v = r[i];
        if (v === undefined || v === '') return null;
        if (types[i] === 'number') return parseInt(v, 10);
        if (types[i] === 'decimal') return parseFloat(v);
        return v;
      }));
    }
    st.free();
    db.run('COMMIT');
  } catch (e) { db.run('ROLLBACK'); throw e; }
  touch();
  return name;
}

const api = {
  list, columns, rows, rowids, record, insert, update, remove,
  createTable, alterTable, dropTable, renameTable,
  getObject, saveObject, deleteObject, renameObject, run, importCSV
};

module.exports = { boot, create, open, close, info, api };

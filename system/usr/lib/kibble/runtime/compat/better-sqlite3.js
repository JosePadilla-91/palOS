'use strict';
// Kibble: better-sqlite3 for apps that ship it, on Node's own SQLite (node:sqlite). better-sqlite3 is a native
// module built for Electron's Node and can't load in Kibble; this gives the same calls apps use.
const { DatabaseSync } = require('node:sqlite');

class Statement {
  constructor(db, sql) { this.database = db; this.source = sql; this._s = db._db.prepare(sql); this._pluck = false; this._raw = false; this.reader = /^\s*(select|pragma|with|values|explain)\b/i.test(sql) || /\breturning\b/i.test(sql); }
  _args(a) { return a.length === 1 && a[0] && typeof a[0] === 'object' && !Buffer.isBuffer(a[0]) && !Array.isArray(a[0]) ? [a[0]] : a.flat(); }
  _row(r) { if (r === undefined) return r; if (this._pluck) return Object.values(r)[0]; if (this._raw) return Object.values(r); return { ...r }; }
  run(...a) { const r = this._s.run(...this._args(a)); return { changes: Number(r.changes), lastInsertRowid: r.lastInsertRowid }; }
  get(...a) { return this._row(this._s.get(...this._args(a))); }
  all(...a) { return this._s.all(...this._args(a)).map((r) => this._row(r)); }
  *iterate(...a) { for (const r of this._s.all(...this._args(a))) yield this._row(r); }
  pluck(on = true) { this._pluck = !!on; if (on) this._raw = false; return this; }
  raw(on = true) { this._raw = !!on; if (on) this._pluck = false; return this; }
  expand() { return this; }
  safeIntegers() { return this; }
  bind() { return this; }
  columns() { return []; }
}

class Database {
  constructor(file = ':memory:', opts = {}) {
    this.name = file || ':memory:';
    this.readonly = !!opts.readonly;
    this.memory = this.name === ':memory:';
    this._db = new DatabaseSync(this.name, { readOnly: this.readonly, open: true });
    this.open = true;
    this._depth = 0;
  }
  get inTransaction() { return this._depth > 0; }
  prepare(sql) { return new Statement(this, sql); }
  exec(sql) { this._db.exec(sql); return this; }
  pragma(src, { simple = false } = {}) {
    const rows = this._db.prepare(`PRAGMA ${src}`).all();
    if (simple) { const r = rows[0]; return r ? Object.values(r)[0] : undefined; }
    return rows;
  }
  transaction(fn) {
    const db = this;
    const make = (begin) => function (...a) {
      const nested = db._depth > 0;
      const sp = `kibble_sp_${db._depth}`;
      db._db.exec(nested ? `SAVEPOINT ${sp}` : begin);
      db._depth++;
      try {
        const r = fn.apply(this, a);
        db._depth--;
        db._db.exec(nested ? `RELEASE ${sp}` : 'COMMIT');
        return r;
      } catch (e) {
        db._depth--;
        try { db._db.exec(nested ? `ROLLBACK TO ${sp}; RELEASE ${sp}` : 'ROLLBACK'); } catch {}
        throw e;
      }
    };
    const t = make('BEGIN');
    t.deferred = make('BEGIN DEFERRED'); t.immediate = make('BEGIN IMMEDIATE'); t.exclusive = make('BEGIN EXCLUSIVE');
    return t;
  }
  function(name, opts, fn) { if (typeof opts === 'function') { fn = opts; opts = {}; } this._db.function(name, opts, fn); return this; }
  close() { if (this.open) { this._db.close(); this.open = false; } return this; }
  defaultSafeIntegers() { return this; }
  unsafeMode() { return this; }
  loadExtension() { throw new Error('extensions are not available'); }
}
Database.SqliteError = class SqliteError extends Error {};
module.exports = Database;
module.exports.default = Database;

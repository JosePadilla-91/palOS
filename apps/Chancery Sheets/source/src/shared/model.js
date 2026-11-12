/*
 * Chancery Sheets document model, shared by the main process (Node) and the renderer.
 *
 * Document shape (also the body of a .spst file):
 * {
 *   format: 'sheets-doc', version: 1, activeSheet: 0,
 *   sheets: [{
 *     name: 'Sheet1',
 *     cells: { 'r,c': { v, f?, e?, s? } },   // 0-based row/col
 *         v  value: number | string | boolean | null (dates are serial numbers + date number format)
 *         f  formula text without the leading '='
 *         e  true when v holds an error code such as '#DIV/0!'
 *         s  style: { b, i, u, st, ff, fs, fc, bg, ha, va, wrap, nf, bd: { t, r, b, l: { style, color } } }
 *     merges: [{ r1, c1, r2, c2 }],
 *     colWidths: { c: px }, rowHeights: { r: px },
 *     hiddenRows: { r: true }, hiddenCols: { c: true },
 *     freeze: { rows, cols }, showGrid: true,
 *     filter: null | { r1, c1, r2, c2, hidden: { col: [values...] } },
 *     charts: [{ id, type, title, range, seriesIn, header, x, y, w, h }]
 *   }],
 *   vba: base64 of xl/vbaProject.bin when opened from .xlsm (kept so macros survive a round-trip)
 * }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SheetModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const MAX_ROWS = 1048576;
  const MAX_COLS = 16384;
  const DEFAULT_COL_WIDTH = 100;
  const DEFAULT_ROW_HEIGHT = 22;

  const key = (r, c) => r + ',' + c;
  const parseKey = (k) => {
    const i = k.indexOf(',');
    return [+k.slice(0, i), +k.slice(i + 1)];
  };

  function colName(c) {
    let s = '';
    c += 1;
    while (c > 0) {
      const m = (c - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      c = Math.floor((c - 1) / 26);
    }
    return s;
  }

  function colIndex(name) {
    let n = 0;
    name = name.toUpperCase();
    for (let i = 0; i < name.length; i++) n = n * 26 + (name.charCodeAt(i) - 64);
    return n - 1;
  }

  const addr = (r, c) => colName(c) + (r + 1);

  /** Parse 'B3' or '$B$3' → { r, c } (0-based) or null. */
  function parseAddr(a) {
    const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(String(a).trim());
    if (!m) return null;
    return { r: +m[2] - 1, c: colIndex(m[1]) };
  }

  /** Parse 'A1:C5' (optionally sheet-qualified) → { sheet, r1, c1, r2, c2 } or null. */
  function parseRange(s) {
    s = String(s).trim();
    let sheet = null;
    const bang = s.lastIndexOf('!');
    if (bang >= 0) {
      sheet = s.slice(0, bang).replace(/^'(.*)'$/, '$1').replace(/''/g, "'");
      s = s.slice(bang + 1);
    }
    const parts = s.split(':');
    const a = parseAddr(parts[0]);
    const b = parts[1] ? parseAddr(parts[1]) : a;
    if (!a || !b) return null;
    return {
      sheet,
      r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c),
      r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c),
    };
  }

  const rangeStr = (g) =>
    g.r1 === g.r2 && g.c1 === g.c2 ? addr(g.r1, g.c1) : addr(g.r1, g.c1) + ':' + addr(g.r2, g.c2);

  const quoteSheet = (name) => (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(name) ? name : "'" + name.replace(/'/g, "''") + "'");

  function emptySheet(name) {
    return {
      name,
      cells: {},
      merges: [],
      colWidths: {},
      rowHeights: {},
      hiddenRows: {},
      hiddenCols: {},
      freeze: { rows: 0, cols: 0 },
      showGrid: true,
      filter: null,
      charts: [],
    };
  }

  function newDoc() {
    return { format: 'sheets-doc', version: 1, activeSheet: 0, sheets: [emptySheet('Sheet1')] };
  }

  /** Fill in any missing sheet fields so documents from older/foreign sources are safe to use. */
  function normalizeDoc(doc) {
    if (!doc || !Array.isArray(doc.sheets) || doc.sheets.length === 0) return newDoc();
    doc.format = 'sheets-doc';
    doc.version = 1;
    const seen = new Set();
    doc.sheets = doc.sheets.map((s, i) => {
      const base = emptySheet(s && s.name ? String(s.name) : 'Sheet' + (i + 1));
      const out = Object.assign(base, s || {});
      let name = out.name.slice(0, 31) || 'Sheet' + (i + 1);
      while (seen.has(name.toLowerCase())) name = name + '_';
      seen.add(name.toLowerCase());
      out.name = name;
      out.cells = out.cells || {};
      out.freeze = out.freeze || { rows: 0, cols: 0 };
      out.charts = Array.isArray(out.charts) ? out.charts : [];
      out.merges = Array.isArray(out.merges) ? out.merges : [];
      return out;
    });
    if (!(doc.activeSheet >= 0 && doc.activeSheet < doc.sheets.length)) doc.activeSheet = 0;
    return doc;
  }

  /** Bounding box of used cells: { r2, c2 } (inclusive) or null if empty. */
  function usedBounds(sheet) {
    let r2 = -1, c2 = -1;
    for (const k in sheet.cells) {
      const cell = sheet.cells[k];
      if (!cell || (cell.v == null && !cell.f && !cell.s)) continue;
      const [r, c] = parseKey(k);
      if (r > r2) r2 = r;
      if (c > c2) c2 = c;
    }
    for (const m of sheet.merges || []) {
      if (m.r2 > r2) r2 = m.r2;
      if (m.c2 > c2) c2 = m.c2;
    }
    return r2 < 0 ? null : { r2, c2 };
  }

  // Excel serial dates (1900 system, with the Lotus leap-year quirk handled by the 1899-12-30 epoch).
  const EPOCH = Date.UTC(1899, 11, 30);
  const dateToSerial = (d) => (d.getTime() - EPOCH) / 86400000;
  const serialToDate = (n) => new Date(EPOCH + Math.round(n * 86400000));

  return {
    MAX_ROWS, MAX_COLS, DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT,
    key, parseKey, colName, colIndex, addr, parseAddr, parseRange, rangeStr, quoteSheet,
    emptySheet, newDoc, normalizeDoc, usedBounds, dateToSerial, serialToDate,
  };
});

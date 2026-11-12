/*
 * Formula text utilities: find references, shift relative references (copy/fill/sort),
 * and adjust references when rows/columns are inserted or deleted (for chart ranges etc.).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../shared/model'));
  else root.FormulaUtils = factory(root.SheetModel);
})(typeof self !== 'undefined' ? self : this, function (M) {
  // A reference token: optional sheet prefix, then a cell (A1), cell range (A1:B2),
  // column range (A:C) or row range (1:3). '$' marks absolute parts.
  const SHEET = "(?:'(?:[^']|'')+'|[A-Za-z_\\u00C0-\\uFFFF][\\w.\\u00C0-\\uFFFF]*)!";
  const CELL = '\\$?[A-Za-z]{1,3}\\$?\\d+';
  const COL = '\\$?[A-Za-z]{1,3}';
  const ROW = '\\$?\\d+';
  const REF_RE = new RegExp(
    `(${SHEET})?(?:(${CELL})(?::(${CELL}))?|(${COL}):(${COL})|(${ROW}):(${ROW}))`,
    'y'
  );

  /**
   * Scan a formula (without the leading '=') and return reference tokens:
   * { start, end, text, sheet, kind: 'cell'|'range'|'cols'|'rows', a, b }
   */
  function scanRefs(f) {
    const out = [];
    let i = 0;
    const n = f.length;
    while (i < n) {
      const ch = f[i];
      if (ch === '"') {
        i++;
        while (i < n) { if (f[i] === '"') { if (f[i + 1] === '"') { i += 2; continue; } break; } i++; }
        i++;
        continue;
      }
      const prev = i > 0 ? f[i - 1] : '';
      if (prev && /[\w.$À-￿]/.test(prev)) { i++; continue; }
      if (ch === "'" || /[A-Za-z$_\dÀ-￿]/.test(ch)) {
        REF_RE.lastIndex = i;
        const m = REF_RE.exec(f);
        if (m && m[0].length) {
          const end = i + m[0].length;
          const next = f[end] || '';
          // Not part of a longer identifier or a function call (e.g. LOG10( or a named range).
          if (!/[\w.(À-￿!]/.test(next) && (m[2] || m[4] || m[6])) {
            // Bare sheet-qualified words must still contain a valid ref; also reject numbers like 1:30 inside TIMEVALUE? (only row ranges)
            const tok = { start: i, end, text: m[0], sheet: m[1] ? m[1].slice(0, -1).replace(/^'(.*)'$/, '$1').replace(/''/g, "'") : null };
            if (m[2]) { tok.kind = m[3] ? 'range' : 'cell'; tok.a = m[2]; tok.b = m[3] || null; }
            else if (m[4]) { tok.kind = 'cols'; tok.a = m[4]; tok.b = m[5]; }
            else { tok.kind = 'rows'; tok.a = m[6]; tok.b = m[7]; }
            const colOk = (s) => M.colIndex(s.replace(/\$/g, '').replace(/\d+/g, '')) < M.MAX_COLS;
            if (tok.kind === 'rows' || colOk(tok.a)) { out.push(tok); i = end; continue; }
          }
          // Skip the rest of this identifier.
          while (i < n && /[\w.À-￿]/.test(f[i])) i++;
          continue;
        }
        while (i < n && /[\w.À-￿]/.test(f[i])) i++;
        continue;
      }
      i++;
    }
    return out;
  }

  function parseCellToken(t) {
    const m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(t);
    return { absC: !!m[1], c: M.colIndex(m[2]), absR: !!m[3], r: +m[4] - 1 };
  }
  const fmtCell = (p) => (p.absC ? '$' : '') + M.colName(p.c) + (p.absR ? '$' : '') + (p.r + 1);

  function shiftCell(t, dr, dc) {
    const p = parseCellToken(t);
    if (!p.absR) p.r += dr;
    if (!p.absC) p.c += dc;
    if (p.r < 0 || p.c < 0 || p.r >= M.MAX_ROWS || p.c >= M.MAX_COLS) return null;
    return fmtCell(p);
  }

  /** Shift relative references as Excel does when a formula is copied by (dr, dc). */
  function shiftFormula(f, dr, dc) {
    if (!f || (!dr && !dc)) return f;
    const refs = scanRefs(f);
    let out = '', last = 0;
    for (const t of refs) {
      out += f.slice(last, t.start);
      const prefix = t.text.slice(0, t.text.indexOf('!') + 1);
      let rep;
      if (t.kind === 'cell' || t.kind === 'range') {
        const a = shiftCell(t.a, dr, dc);
        const b = t.b ? shiftCell(t.b, dr, dc) : '';
        rep = a == null || b == null ? '#REF!' : prefix + a + (t.b ? ':' + b : '');
      } else if (t.kind === 'cols') {
        const sc = (s) => { const abs = s[0] === '$'; const c = M.colIndex(s.replace('$', '')) + (abs ? 0 : dc); return c < 0 ? null : (abs ? '$' : '') + M.colName(c); };
        const a = sc(t.a), b = sc(t.b);
        rep = a == null || b == null ? '#REF!' : prefix + a + ':' + b;
      } else {
        const sr = (s) => { const abs = s[0] === '$'; const r = +s.replace('$', '') + (abs ? 0 : dr); return r < 1 ? null : (abs ? '$' : '') + r; };
        const a = sr(t.a), b = sr(t.b);
        rep = a == null || b == null ? '#REF!' : prefix + a + ':' + b;
      }
      out += rep;
      last = t.end;
    }
    return out + f.slice(last);
  }

  /** Resolve a reference token to a 0-based rectangle. */
  function tokenRect(t) {
    if (t.kind === 'cell' || t.kind === 'range') {
      const a = parseCellToken(t.a), b = t.b ? parseCellToken(t.b) : a;
      return { r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) };
    }
    if (t.kind === 'cols') {
      const a = M.colIndex(t.a.replace('$', '')), b = M.colIndex(t.b.replace('$', ''));
      return { r1: 0, c1: Math.min(a, b), r2: M.MAX_ROWS - 1, c2: Math.max(a, b) };
    }
    const a = +t.a.replace('$', '') - 1, b = +t.b.replace('$', '') - 1;
    return { r1: Math.min(a, b), c1: 0, r2: Math.max(a, b), c2: M.MAX_COLS - 1 };
  }

  /**
   * Adjust a plain range string (e.g. a chart's data range 'A1:C10') for an insertion
   * (count > 0) or deletion (count < 0) of rows or columns at `index`. Returns null if deleted.
   */
  function adjustRangeForInsert(range, axis, index, count) {
    const g = M.parseRange(range);
    if (!g) return range;
    const lo = axis === 'row' ? 'r1' : 'c1', hi = axis === 'row' ? 'r2' : 'c2';
    if (count > 0) {
      if (g[lo] >= index) g[lo] += count;
      if (g[hi] >= index) g[hi] += count;
    } else {
      const del = -count, dEnd = index + del - 1;
      const nlo = g[lo] < index ? g[lo] : g[lo] > dEnd ? g[lo] - del : index;
      const nhi = g[hi] < index ? g[hi] : g[hi] > dEnd ? g[hi] - del : index - 1;
      if (nhi < nlo) return null;
      g[lo] = nlo; g[hi] = nhi;
    }
    return (g.sheet ? M.quoteSheet(g.sheet) + '!' : '') + M.rangeStr(g);
  }

  return { scanRefs, shiftFormula, tokenRect, adjustRangeForInsert, parseCellToken };
});

/*
 * Value formatting (number formats via SheetJS SSF) and parsing of typed input.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('xlsx').SSF, require('../../shared/model'));
  else root.Fmt = factory(root.XLSX.SSF, root.SheetModel);
})(typeof self !== 'undefined' ? self : this, function (SSF, M) {
  const DATE_NF = 'yyyy-mm-dd';
  const TIME_NF = 'hh:mm:ss';
  const DATETIME_NF = 'yyyy-mm-dd hh:mm';

  const isDateFormat = (nf) => !!nf && SSF.is_date(nf);

  /** Format a computed value for display. `kind` is HyperFormula's detailed type when available. */
  function formatValue(v, nf, kind) {
    if (v == null || v === '') return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'object' && v.error) return v.error;
    if (typeof v === 'number') {
      if (!isFinite(v)) return '#NUM!';
      let fmt = nf;
      if (!fmt || fmt === 'General') {
        if (kind === 'NUMBER_DATE') fmt = DATE_NF;
        else if (kind === 'NUMBER_TIME') fmt = TIME_NF;
        else if (kind === 'NUMBER_DATETIME') fmt = DATETIME_NF;
        else if (kind === 'NUMBER_PERCENT') fmt = '0%';
        else return generalNumber(v);
      }
      if (fmt === '@') return generalNumber(v);
      try {
        return SSF.format(fmt, v);
      } catch {
        return generalNumber(v);
      }
    }
    if (nf && nf !== '@' && nf.includes(';') && nf.split(';').length >= 4) {
      try { return SSF.format(nf, String(v)); } catch { /* fall through */ }
    }
    return String(v);
  }

  /** Excel-like "General" display: up to 11 significant characters, scientific for big/small. */
  function generalNumber(v, maxLen = 11) {
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1e11 || abs < 1e-9) {
      let s = v.toExponential(5).replace(/\.?0+e/, 'e');
      return s.replace(/e([+-])(\d)$/, 'e$10$2').toUpperCase();
    }
    let s = String(Number(v.toPrecision(15)));
    if (s.length <= maxLen) return s;
    const intLen = String(Math.trunc(abs)).length + (v < 0 ? 1 : 0);
    const decimals = Math.max(0, maxLen - intLen - 1);
    s = v.toFixed(decimals);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  /** Shorter General rendering used when the number does not fit its column. */
  function fitGeneral(v, fits) {
    for (let len = 10; len >= 1; len--) {
      const s = generalNumber(v, len);
      if (fits(s)) return s;
      if (Math.abs(v) >= 1 && String(Math.trunc(Math.abs(v))).length > len) break;
    }
    const e = v.toExponential(1).toUpperCase().replace(/E([+-])(\d)$/, 'E$10$2');
    return fits(e) ? e : null;
  }

  const NUM_RE = /^[-+]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?([eE][-+]?\d+)?$/;
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  function parseTime(t) {
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?\s*(am|pm|a|p)?$/i.exec(t);
    if (!m) return null;
    let h = +m[1];
    const mi = +m[2], se = +(m[3] || 0);
    if (m[4]) {
      const pm = /^p/i.test(m[4]);
      if (h > 12) return null;
      if (h === 12) h = 0;
      if (pm) h += 12;
    }
    if (!m[4] && h > 23) return null;
    if (mi > 59 || se >= 60) return null;
    return (h * 3600 + mi * 60 + se) / 86400;
  }

  function parseDate(t) {
    let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t);
    let y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(t))) {
      // Month/day/year (US order) as in Excel's default en-US locale.
      mo = +m[1]; d = +m[2]; y = +m[3]; if (y < 100) y += y < 30 ? 2000 : 1900;
    } else if ((m = /^(\d{1,2})[ -]([A-Za-z]{3,9})[ -,]*(\d{4})$/.exec(t))) {
      d = +m[1]; mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1; y = +m[3];
    } else if ((m = /^([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})$/.exec(t))) {
      mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1; d = +m[2]; y = +m[3];
    } else return null;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const ms = Date.UTC(y, mo - 1, d);
    const dt = new Date(ms);
    if (dt.getUTCDate() !== d) return null;
    return M.dateToSerial(dt);
  }

  /**
   * Parse what the user typed into a cell.
   * Returns { v, f?, nf? } — nf is a suggested number format when the cell has none.
   */
  function parseInput(text, currentNf) {
    if (text == null || text === '') return { v: null };
    if (text[0] === '=' && text.length > 1) return { v: null, f: text.slice(1) };
    if (text[0] === "'") return { v: text.slice(1), text: true };
    if (currentNf === '@') return { v: text, text: true };
    const t = text.trim();
    if (/^(true|false)$/i.test(t)) return { v: t.toUpperCase() === 'TRUE' };
    if (NUM_RE.test(t) && /\d/.test(t)) {
      const n = Number(t.replace(/,/g, ''));
      if (isFinite(n)) return { v: n, nf: t.includes(',') ? '#,##0' + (t.includes('.') ? '.00' : '') : undefined };
    }
    let m = /^\(([\d,]*\.?\d+)\)$/.exec(t);
    if (m) return { v: -Number(m[1].replace(/,/g, '')) };
    m = /^([-+]?[\d,]*\.?\d+)\s*%$/.exec(t);
    if (m) return { v: Number(m[1].replace(/,/g, '')) / 100, nf: m[1].includes('.') ? '0.00%' : '0%' };
    m = /^(-?)([$€£¥])\s*([\d,]*\.?\d+)$/.exec(t) || /^(-?)([\d,]*\.?\d+)\s*([€])$/.exec(t);
    if (m) {
      const sym = /[$€£¥]/.test(m[2]) ? m[2] : m[3];
      const num = /[$€£¥]/.test(m[2]) ? m[3] : m[2];
      return { v: (m[1] ? -1 : 1) * Number(num.replace(/,/g, '')), nf: `"${sym}"#,##0.00` };
    }
    const time = parseTime(t);
    if (time != null) return { v: time, nf: /:\d{2}:\d{2}/.test(t) ? TIME_NF : 'hh:mm' };
    const date = parseDate(t);
    if (date != null) return { v: date, nf: DATE_NF };
    m = /^(.+?)[ T](\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)$/i.exec(t);
    if (m) {
      const d = parseDate(m[1]), tm = parseTime(m[2]);
      if (d != null && tm != null) return { v: d + tm, nf: DATETIME_NF };
    }
    return { v: text };
  }

  /** Text shown in the formula bar / editor for a stored cell. */
  function editText(cell) {
    if (!cell) return '';
    if (cell.f) return '=' + cell.f;
    const v = cell.v;
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') {
      const nf = cell.s && cell.s.nf;
      if (nf && isDateFormat(nf)) {
        const hasDate = /[dmy]/i.test(nf.replace(/\[[^\]]*\]|"[^"]*"/g, '').replace(/[hs]+:?m+|m+:?s+/gi, ''));
        const hasTime = /[hs]/i.test(nf.replace(/"[^"]*"/g, ''));
        const fmt = hasDate && hasTime ? 'yyyy-mm-dd hh:mm:ss' : hasTime ? 'hh:mm:ss' : 'yyyy-mm-dd';
        try { return SSF.format(fmt, v); } catch { /* ignore */ }
      }
      if (nf && /%/.test(nf)) return String(Number((v * 100).toPrecision(15))) + '%';
      return String(Number(v.toPrecision(15)));
    }
    const s = String(v);
    // Text that would otherwise be parsed as a number/formula is shown with Excel's leading apostrophe.
    const p = parseInput(s, cell.s && cell.s.nf);
    return p.text || (typeof p.v === 'string' && !p.f) ? s : "'" + s;
  }

  /** Change the number of decimals in a format (for the toolbar's .0 / .00 buttons). */
  function adjustDecimals(nf, value, delta) {
    if (!nf || nf === 'General') {
      const s = typeof value === 'number' ? generalNumber(value) : '0';
      const dec = s.includes('.') && !/e/i.test(s) ? s.split('.')[1].length : 0;
      const n = Math.max(0, dec + delta);
      return n ? '0.' + '0'.repeat(n) : '0';
    }
    return nf.split(';').map((sec) => {
      const idx = sec.search(/[0#](?!.*[0#])/);
      if (idx < 0) return sec;
      const decMatch = /\.(0+)/.exec(sec);
      if (decMatch) {
        const n = decMatch[1].length + delta;
        return n <= 0 ? sec.replace(/\.0+/, '') : sec.replace(/\.0+/, '.' + '0'.repeat(n));
      }
      return delta > 0 ? sec.slice(0, idx + 1) + '.0' + sec.slice(idx + 1) : sec;
    }).join(';');
  }

  /** Infer a value from pasted/imported text (no formulas unless allowFormula). */
  function inferValue(text, allowFormula) {
    if (text === '' || text == null) return null;
    if (!allowFormula && text[0] === '=') return { v: text };
    const p = parseInput(text);
    if (/^0\d/.test(text.trim()) && typeof p.v === 'number' && !p.nf) return { v: text };
    return p;
  }

  return { formatValue, generalNumber, fitGeneral, parseInput, editText, adjustDecimals, inferValue, isDateFormat, DATE_NF, TIME_NF, DATETIME_NF };
});

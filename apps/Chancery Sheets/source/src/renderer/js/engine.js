/*
 * Calculation engine: a thin wrapper around HyperFormula that mirrors the document model.
 * The model (doc.sheets[i].cells) is the source of truth for contents and styles;
 * HyperFormula holds the same contents and computes values.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('hyperformula').HyperFormula, require('../../shared/model'));
  else root.Engine = factory(root.HyperFormula, root.SheetModel);
})(typeof self !== 'undefined' ? self : this, function (HyperFormula, M) {
  const CONFIG = {
    licenseKey: 'gpl-v3',
    maxRows: M.MAX_ROWS,
    maxColumns: M.MAX_COLS,
    // Excel compatibility (see HyperFormula's "Compatibility with Microsoft Excel" guide).
    nullDate: { year: 1899, month: 12, day: 30 },
    leapYear1900: true,
    evaluateNullToZero: true,
    smartRounding: true,
    precisionRounding: 14,
    useArrayArithmetic: true,
    useWildcards: true,
    useRegularExpressions: false,
    matchWholeCell: true,
    caseSensitive: false,
    ignorePunctuation: false,
    localeLang: 'en-US',
    functionArgSeparator: ',',
    decimalSeparator: '.',
    thousandSeparator: '',
    arrayColumnSeparator: ',',
    arrayRowSeparator: ';',
    dateFormats: ['YYYY-MM-DD', 'MM/DD/YYYY', 'MM/DD/YY'],
    timeFormats: ['hh:mm', 'hh:mm:ss.sss'],
    currencySymbol: ['$', '€', '£', '¥'],
  };

  /** Raw content as HyperFormula expects it. Strings are prefixed with ' so they stay text. */
  function rawOf(cell) {
    if (!cell) return null;
    if (cell.f) return '=' + cell.f;
    if (cell.v == null) return null;
    if (cell.e) return String(cell.v);
    if (typeof cell.v === 'string') return cell.v === '' ? null : "'" + cell.v;
    return cell.v;
  }

  class Engine {
    constructor() {
      this.hf = null;
      this.ids = []; // model sheet index -> HyperFormula sheet id
    }

    static functionNames() {
      try { return HyperFormula.getRegisteredFunctionNames('enGB').slice().sort(); } catch { return []; }
    }

    static get version() { return HyperFormula.version; }

    rebuild(doc) {
      if (this.hf) this.hf.destroy();
      this.hf = HyperFormula.buildEmpty(CONFIG);
      this.ids = [];
      // Excel accepts bare TRUE/FALSE literals in formulas; HyperFormula only has TRUE()/FALSE().
      try {
        this.hf.addNamedExpression('TRUE', '=TRUE()');
        this.hf.addNamedExpression('FALSE', '=FALSE()');
      } catch { /* already defined */ }
      this.hf.suspendEvaluation();
      for (const sh of doc.sheets) {
        const name = this.hf.addSheet(sh.name);
        const id = this.hf.getSheetId(name);
        this.ids.push(id);
      }
      // Load contents after all sheets exist so cross-sheet references resolve.
      doc.sheets.forEach((sh, i) => this._loadSheet(i, sh));
      this.hf.resumeEvaluation();
    }

    _loadSheet(i, sh) {
      const id = this.ids[i];
      const b = M.usedBounds(sh);
      if (!b) { this.hf.setSheetContent(id, []); return; }
      if ((b.r2 + 1) * (b.c2 + 1) <= 2000000) {
        const data = [];
        for (let r = 0; r <= b.r2; r++) data.push(new Array(b.c2 + 1).fill(null));
        for (const k in sh.cells) {
          const raw = rawOf(sh.cells[k]);
          if (raw == null) continue;
          const [r, c] = M.parseKey(k);
          data[r][c] = raw;
        }
        this.hf.setSheetContent(id, data);
      } else {
        this.hf.setSheetContent(id, []);
        for (const k in sh.cells) {
          const raw = rawOf(sh.cells[k]);
          if (raw == null) continue;
          const [r, c] = M.parseKey(k);
          this.hf.setCellContents({ sheet: id, row: r, col: c }, raw);
        }
      }
    }

    /** Replace one sheet's contents from the model. */
    reloadSheet(i, sh) {
      this.hf.suspendEvaluation();
      this._loadSheet(i, sh);
      this.hf.resumeEvaluation();
    }

    /** Apply [{ si, r, c, cell }] content changes in one batch. */
    setCells(list) {
      if (!list.length) return [];
      const failed = [];
      this.hf.suspendEvaluation();
      try {
        for (const item of list) {
          try {
            this.hf.setCellContents({ sheet: this.ids[item.si], row: item.r, col: item.c }, rawOf(item.cell));
          } catch (e) {
            failed.push(Object.assign({ error: e.message }, item));
          }
        }
      } finally {
        this.hf.resumeEvaluation();
      }
      return failed;
    }

    addr(si, r, c) { return { sheet: this.ids[si], row: r, col: c }; }

    /** Computed value: number | string | boolean | null | { error } */
    value(si, r, c) {
      const v = this.hf.getCellValue(this.addr(si, r, c));
      if (v && typeof v === 'object') return { error: v.value || '#ERROR!', message: v.message };
      return v;
    }

    detailedType(si, r, c) {
      try { return this.hf.getCellValueDetailedType(this.addr(si, r, c)); } catch { return null; }
    }

    formula(si, r, c) {
      const f = this.hf.getCellFormula(this.addr(si, r, c));
      return f ? f.slice(1) : null;
    }

    isPartOfArray(si, r, c) {
      try { return this.hf.isCellPartOfArray(this.addr(si, r, c)); } catch { return false; }
    }

    addSheet(name, index) {
      const n = this.hf.addSheet(name);
      const id = this.hf.getSheetId(n);
      this.ids.splice(index, 0, id);
    }

    removeSheet(index) {
      this.hf.removeSheet(this.ids[index]);
      this.ids.splice(index, 1);
    }

    renameSheet(index, name) { this.hf.renameSheet(this.ids[index], name); }

    moveSheet(from, to) {
      const [id] = this.ids.splice(from, 1);
      this.ids.splice(to, 0, id);
    }

    addRows(si, index, count) { this.hf.addRows(this.ids[si], [index, count]); }
    removeRows(si, index, count) { this.hf.removeRows(this.ids[si], [index, count]); }
    addCols(si, index, count) { this.hf.addColumns(this.ids[si], [index, count]); }
    removeCols(si, index, count) { this.hf.removeColumns(this.ids[si], [index, count]); }

    moveCells(si, g, tsi, tr, tc) {
      this.hf.moveCells(
        { start: this.addr(si, g.r1, g.c1), end: this.addr(si, g.r2, g.c2) },
        this.addr(tsi, tr, tc)
      );
    }

    /** After a structural change, copy the (reference-adjusted) formulas back into the model. */
    syncFormulas(doc) {
      doc.sheets.forEach((sh, si) => {
        for (const k in sh.cells) {
          const cell = sh.cells[k];
          if (!cell || !cell.f) continue;
          const [r, c] = M.parseKey(k);
          const f = this.formula(si, r, c);
          if (f != null) cell.f = f;
        }
      });
    }

    /** Refresh cached values in the model (used before saving so files carry computed results). */
    syncValues(doc) {
      doc.sheets.forEach((sh, si) => {
        for (const k in sh.cells) {
          const cell = sh.cells[k];
          if (!cell || !cell.f) continue;
          const [r, c] = M.parseKey(k);
          const v = this.value(si, r, c);
          if (v && typeof v === 'object') { cell.v = v.error; cell.e = true; }
          else { cell.v = v; delete cell.e; }
        }
      });
    }

    /** Validate a formula's syntax without placing it in a cell. */
    isValidFormula(f) {
      try { return this.hf.validateFormula('=' + f); } catch { return false; }
    }

    calculate(f, si) {
      try {
        const v = this.hf.calculateFormula('=' + f, this.ids[si]);
        if (v && typeof v === 'object' && !Array.isArray(v)) return { error: v.value };
        return v;
      } catch (e) {
        return { error: '#ERROR!' };
      }
    }
  }

  Engine.rawOf = rawOf;
  return Engine;
});

/*
 * Commands: file operations, clipboard, fill, formatting, rows/columns, sheets,
 * sorting, filtering, find & replace, charts, printing. Mixed into App.prototype.
 */
(function (root) {
  const M = root.SheetModel;
  const Fmt = root.Fmt;
  const FU = root.FormulaUtils;
  const { el, showMenu, toast, prompt } = root.UI;
  const Dialogs = root.Dialogs;
  const App = root.App;
  const api = root.sheetsAPI;
  const clone = App.clone;
  const range = App.range;

  const isTextInput = (n) => n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT') && n.id !== 'scroller';
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const FULL_ROWS = (g) => g.r1 === 0 && g.r2 >= M.MAX_ROWS - 1;
  const FULL_COLS = (g) => g.c1 === 0 && g.c2 >= M.MAX_COLS - 1;

  const LISTS = [
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    ['Q1', 'Q2', 'Q3', 'Q4'],
  ];

  const P = {
    /* ================================================================ dispatch */

    async run(cmd, arg) {
      if (root.UI.isDialogOpen() && !['save-and-close'].includes(cmd)) return;
      const inInput = isTextInput(document.activeElement);
      switch (cmd) {
        // ---- file
        case 'open': return api.openDialog();
        case 'save': return this.save(false);
        case 'save-as': return this.save(true);
        case 'save-and-close': if (await this.save(false)) api.closeNow(); return;
        case 'export': return this.save(true, { exportOnly: true, defaultExt: arg });
        case 'export-pdf': return this.print('pdf');
        case 'print': return this.print('print');
        // ---- edit
        case 'undo': if (inInput || this.editing) return api.nativeEdit('undo'); return this.undo();
        case 'redo': if (inInput || this.editing) return api.nativeEdit('redo'); return this.redo();
        case 'cut': if (inInput || this.editing) return api.nativeEdit('cut'); return this.copySelection(true);
        case 'copy': if (inInput || this.editing) return api.nativeEdit('copy'); return this.copySelection(false);
        case 'paste': if (inInput || this.editing) return api.nativeEdit('paste'); return this.pasteClipboard(false);
        case 'paste-values': if (inInput || this.editing) return api.nativeEdit('paste'); return this.pasteClipboard(true);
        case 'fill-down': return this.fillCopy('down');
        case 'fill-right': return this.fillCopy('right');
        case 'clear-contents': return this.clear('contents');
        case 'clear-formats': return this.clear('formats');
        case 'clear-all': return this.clear('all');
        case 'find': return Dialogs.findReplace(this, false);
        case 'replace': return Dialogs.findReplace(this, true);
        case 'goto': { const r = await prompt('Go To', 'Reference (e.g. B12, A1:D20 or Sheet2!C3)', M.addr(this.sel.ar, this.sel.ac)); if (r) this.goTo(r); this.focusGrid(); return; }
        case 'select-all': if (inInput || this.editing) return api.nativeEdit('selectAll'); return this.selectRange({ r1: 0, c1: 0, r2: M.MAX_ROWS - 1, c2: M.MAX_COLS - 1 });
        // ---- view
        case 'zoom-in': return this.setZoom(this.zoom + 0.1);
        case 'zoom-out': return this.setZoom(this.zoom - 0.1);
        case 'zoom-reset': return this.setZoom(1);
        case 'freeze': return this.setFreeze(this.sel.ar, this.sel.ac);
        case 'freeze-row': return this.setFreeze(1, 0);
        case 'freeze-col': return this.setFreeze(0, 1);
        case 'unfreeze': return this.setFreeze(0, 0);
        case 'freeze-menu': return this.freezeMenu(arg);
        case 'toggle-grid': return this.setSheetProps({ showGrid: this.sheet().showGrid === false }, 'Gridlines');
        case 'toggle-formulas': this.showFormulas = !this.showFormulas; this.grid.invalidate(); return toast(this.showFormulas ? 'Showing formulas' : 'Showing values', '', 1200);
        // ---- insert
        case 'insert-row-above': return this.insertRows(this.sel.r1, this.rowCount());
        case 'insert-row-below': return this.insertRows(this.sel.r2 + 1, this.rowCount());
        case 'insert-col-left': return this.insertCols(this.sel.c1, this.colCount());
        case 'insert-col-right': return this.insertCols(this.sel.c2 + 1, this.colCount());
        case 'delete-rows': return this.deleteRows();
        case 'delete-cols': return this.deleteCols();
        case 'insert-chart': return this.insertChart();
        case 'insert-function': return this.insertFunction();
        case 'insert-date': return this.insertDateTime('date');
        case 'insert-time': return this.insertDateTime('time');
        // ---- format
        case 'bold': return this.toggleStyle('b', 'Bold');
        case 'italic': return this.toggleStyle('i', 'Italic');
        case 'underline': return this.toggleStyle('u', 'Underline');
        case 'strike': return this.toggleStyle('st', 'Strikethrough');
        case 'wrap': return this.toggleStyle('wrap', 'Wrap text');
        case 'align-left': case 'align-center': case 'align-right': {
          const v = cmd.slice(6);
          const cur = (this.activeCell() || {}).s || {};
          return this.applyStyle({ ha: cur.ha === v ? null : v }, 'Align');
        }
        case 'valign-top': case 'valign-middle': case 'valign-bottom': { const v = cmd.slice(7); return this.applyStyle({ va: v === 'bottom' ? null : v }, 'Align'); }
        case 'nf': return this.applyStyle({ nf: arg === 'General' ? null : arg }, 'Number format');
        case 'nf-custom': return this.customNumberFormat();
        case 'dec-more': return this.adjustDecimals(1);
        case 'dec-less': return this.adjustDecimals(-1);
        case 'apply-fc': return this.colorMenu('fc', arg);
        case 'apply-bg': return this.colorMenu('bg', arg);
        case 'no-fill': return this.applyStyle({ bg: null }, 'No fill');
        case 'valign-menu': {
          const t = arg && arg.currentTarget ? arg.currentTarget.getBoundingClientRect() : { left: 400, bottom: 40 };
          const cur = ((this.activeCell() || {}).s || {}).va || 'bottom';
          return showMenu(['top', 'middle', 'bottom'].map((v) => ({ label: v[0].toUpperCase() + v.slice(1), icon: v === cur ? '✓' : '', action: () => this.run('valign-' + v) })), t.left, t.bottom + 4);
        }
        case 'borders-menu': return this.bordersMenu(arg);
        case 'format-cells': return this.formatCellsDialog();
        case 'format-painter': return this.startFormatPainter();
        case 'merge': return this.merge(false);
        case 'merge-toggle': return this.mergeAt(this.sel.ar, this.sel.ac) || this.sheet().merges.some((m) => intersects(m, this.sel)) ? this.unmerge() : this.merge(true);
        case 'unmerge': return this.unmerge();
        case 'col-width': return this.sizeDialog('col');
        case 'row-height': return this.sizeDialog('row');
        case 'autofit-cols': return this.autofitColumns(range(this.sel.c1, Math.min(this.sel.c2, this.effectiveRange().c2)));
        case 'hide-rows': return this.hideRows(true);
        case 'hide-cols': return this.hideCols(true);
        case 'unhide-rows': return this.hideRows(false);
        case 'unhide-cols': return this.hideCols(false);
        // ---- data
        case 'sort-asc': return this.quickSort(false);
        case 'sort-desc': return this.quickSort(true);
        case 'sort-dialog': return this.sortDialog();
        case 'toggle-filter': return this.toggleFilter();
        case 'clear-filter': return this.clearFilter();
        case 'dedupe': return this.dedupe();
        case 'text-to-columns': return this.textToColumns();
        case 'recalc': this.engine.rebuild(this.doc); this.afterChange(false); return toast('Recalculated', '', 1000);
        case 'autosum': return this.autoSum();
        // ---- sheets
        case 'add-sheet': return this.addSheet();
        case 'dup-sheet': return this.duplicateSheet(this.sheetIdx);
        case 'rename-sheet': {
          const name = await prompt('Rename Sheet', 'Sheet name', this.sheet().name, { validate: (v) => this.validateSheetName(v.trim(), this.sheetIdx) });
          if (name) this.renameSheet(this.sheetIdx, name.trim());
          return this.focusGrid();
        }
        case 'delete-sheet': return this.deleteSheet(this.sheetIdx);
        case 'sheet-left': return this.sheetIdx > 0 && this.moveSheet(this.sheetIdx, this.sheetIdx - 1);
        case 'sheet-right': return this.sheetIdx < this.doc.sheets.length - 1 && this.moveSheet(this.sheetIdx, this.sheetIdx + 1);
        // ---- help
        case 'shortcuts': return Dialogs.shortcuts();
        default: console.warn('Unknown command', cmd);
      }
    },

    /* ================================================================== files */

    async save(saveAs, opts = {}) {
      if (this.editing) this.commitEdit();
      this.engine.syncValues(this.doc);
      this.doc.activeSheet = this.sheetIdx;
      const base = this.filePath ? this.displayName().replace(/\.[^.]+$/, '') : 'Untitled';
      const res = await api.save(this.doc, {
        saveAs,
        filePath: this.filePath,
        suggestedName: base,
        defaultExt: opts.defaultExt,
        exportOnly: !!opts.exportOnly,
        skipLossWarning: !saveAs && this.lossAcknowledged === this.filePath && !!this.filePath,
      });
      if (!res) return false;
      if (!opts.exportOnly) {
        this.filePath = res.filePath;
        this.dirty = false;
        this.pristine = false;
        if (res.lossy) this.lossAcknowledged = res.filePath;
        this.sendState();
      }
      toast(`${opts.exportOnly ? 'Exported' : 'Saved'} ${res.filePath.split(/[\\/]/).pop()}`, '', 1800);
      return true;
    },

    buildPrintHtml() {
      const sh = this.sheet();
      const multi = this.sel.r1 !== this.sel.r2 || this.sel.c1 !== this.sel.c2;
      const b = M.usedBounds(sh);
      if (!b && !sh.charts.length) return null;
      const g = multi ? this.effectiveRange() : { r1: 0, c1: 0, r2: b ? b.r2 : 0, c2: b ? b.c2 : 0 };
      const covered = new Set();
      const rows = [];
      const cols = range(g.c1, g.c2).filter((c) => !this.isColHidden(c));
      for (let r = g.r1; r <= g.r2; r++) {
        if (this.isRowHidden(r)) continue;
        const h = sh.rowHeights[r] || M.DEFAULT_ROW_HEIGHT;
        const tds = [];
        for (const c of cols) {
          const k = M.key(r, c);
          if (covered.has(k)) continue;
          const cell = sh.cells[k];
          const s = (cell && cell.s) || {};
          const m = this.mergeAt(r, c);
          let span = '';
          if (m && m.r1 === r && m.c1 === c) {
            span = ` rowspan="${Math.min(m.r2, g.r2) - r + 1}" colspan="${cols.filter((x) => x >= m.c1 && x <= Math.min(m.c2, g.c2)).length}"`;
            for (let rr = m.r1; rr <= m.r2; rr++) for (let cc = m.c1; cc <= m.c2; cc++) if (rr !== r || cc !== c) covered.add(M.key(rr, cc));
          }
          const v = this.engine.value(this.sheetIdx, r, c);
          const text = this.showFormulas && cell && cell.f ? '=' + cell.f : Fmt.formatValue(v, s.nf);
          const align = s.ha || (typeof v === 'number' ? 'right' : typeof v === 'boolean' || (v && v.error) ? 'center' : 'left');
          const css = [`text-align:${align}`, `vertical-align:${s.va === 'top' ? 'top' : s.va === 'middle' ? 'middle' : 'bottom'}`];
          if (s.b) css.push('font-weight:700');
          if (s.i) css.push('font-style:italic');
          const deco = [s.u && 'underline', s.st && 'line-through'].filter(Boolean).join(' ');
          if (deco) css.push('text-decoration:' + deco);
          if (s.ff) css.push(`font-family:"${s.ff}"`);
          if (s.fs) css.push(`font-size:${s.fs}pt`);
          if (s.fc) css.push('color:' + s.fc);
          if (s.bg) css.push('background:' + s.bg);
          css.push(s.wrap ? 'white-space:pre-wrap' : 'white-space:nowrap;overflow:hidden');
          for (const [side, key] of [['top', 't'], ['right', 'r'], ['bottom', 'b'], ['left', 'l']]) {
            const bd = s.bd && s.bd[key];
            if (bd) css.push(`border-${side}:${bd.style === 'thick' ? 3 : bd.style === 'medium' ? 2 : 1}px ${bd.style === 'double' ? 'double' : /dash/.test(bd.style) ? 'dashed' : /dot|hair/.test(bd.style) ? 'dotted' : 'solid'} ${bd.color || '#000'}`);
          }
          tds.push(`<td${span} style="${css.join(';')}">${esc(text)}</td>`);
        }
        rows.push(`<tr style="height:${h}px">${tds.join('')}</tr>`);
      }
      const colgroup = cols.map((c) => `<col style="width:${sh.colWidths[c] || M.DEFAULT_COL_WIDTH}px">`).join('');
      const charts = multi ? '' : [...this.charts.items.values()].map((it) => `<div class="chart"><img src="${it.chart.toBase64Image('image/png', 1)}"></div>`).join('');
      const grid = sh.showGrid !== false ? 'td{outline:0.5px solid #d9d9d9}' : '';
      return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(this.displayName())} — ${esc(sh.name)}</title><style>
        @page{margin:12mm}
        body{font:11pt Carlito,Calibri,"Liberation Sans",Arial,sans-serif;color:#000;margin:0}
        h1{font-size:10pt;font-weight:400;color:#666;margin:0 0 6px}
        table{border-collapse:collapse;table-layout:fixed}
        td{padding:1px 4px;overflow:hidden;text-overflow:clip}${grid}
        tr{page-break-inside:avoid}
        .chart{page-break-inside:avoid;margin-top:14px}.chart img{max-width:100%}
      </style></head><body><h1>${esc(this.displayName())} — ${esc(sh.name)}</h1>
      <table>${colgroup}${rows.join('')}</table>${charts}</body></html>`;
    },

    async print(mode) {
      if (this.editing) this.commitEdit();
      const html = this.buildPrintHtml();
      if (!html) return toast('Nothing to print on this sheet.', 'warn');
      const res = await api.print(html, mode);
      if (res && mode === 'pdf') toast('Exported PDF', '', 1800);
    },

    /* ============================================================== clipboard */

    copySelection(cut, clipboardData) {
      const g = this.effectiveRange();
      const sh = this.sheet();
      const cells = [], values = [], lines = [];
      for (let r = g.r1; r <= g.r2; r++) {
        const row = [], vals = [], texts = [];
        for (let c = g.c1; c <= g.c2; c++) {
          const cell = sh.cells[M.key(r, c)];
          row.push(clone(cell) || null);
          const v = this.engine.value(this.sheetIdx, r, c);
          vals.push(v);
          let t = Fmt.formatValue(v, cell && cell.s && cell.s.nf);
          if (/[\t\n"]/.test(t)) t = '"' + t.replace(/"/g, '""') + '"';
          texts.push(t);
        }
        cells.push(row); values.push(vals); lines.push(texts.join('\t'));
      }
      const text = lines.join('\n');
      const html = '<table>' + cells.map((row, i) => '<tr>' + row.map((cell, j) => {
        const s = (cell && cell.s) || {};
        const css = [s.b && 'font-weight:bold', s.i && 'font-style:italic', s.fc && 'color:' + s.fc, s.bg && 'background:' + s.bg].filter(Boolean).join(';');
        return `<td${css ? ` style="${css}"` : ''}>${esc(Fmt.formatValue(values[i][j], s.nf))}</td>`;
      }).join('') + '</tr>').join('') + '</table>';
      const merges = sh.merges.filter((m) => m.r1 >= g.r1 && m.r2 <= g.r2 && m.c1 >= g.c1 && m.c2 <= g.c2).map(clone);
      this.clipboard = { si: this.sheetIdx, g, cells, values, merges, cut, text, showMarquee: true };
      let pending = null;
      if (clipboardData) { clipboardData.setData('text/plain', text); clipboardData.setData('text/html', html); }
      else pending = api.clipboardWrite({ text, html });
      this.startMarch();
      this.grid.invalidate();
      return pending;
    },

    startMarch() {
      this.stopMarch();
      this.marchOffset = 0;
      this.marchTimer = setInterval(() => {
        if (!this.clipboard || !this.clipboard.showMarquee) return this.stopMarch();
        this.marchOffset = (this.marchOffset + 1) % 9;
        this.grid.invalidate();
      }, 90);
    },

    stopMarch() { clearInterval(this.marchTimer); this.marchTimer = null; },

    async pasteClipboard(valuesOnly) {
      const { text, html } = await api.clipboardRead();
      this.pasteFrom(text, html, valuesOnly);
    },

    pasteFrom(text, html, valuesOnly) {
      if (this.clipboard && text === this.clipboard.text && this.doc.sheets[this.clipboard.si]) return this.pasteInternal(valuesOnly);
      let rows = null;
      if (html && /<table/i.test(html)) rows = parseHtmlTable(html);
      if (!rows || !rows.length) rows = parseTsv(text || '');
      if (!rows.length || (rows.length === 1 && rows[0].length === 1 && rows[0][0] === '' && !text)) return;
      const h = rows.length, w = Math.max(...rows.map((r) => r.length));
      const { r1, c1 } = this.sel;
      if (r1 + h > M.MAX_ROWS || c1 + w > M.MAX_COLS) return toast("The pasted data doesn't fit on the sheet.", 'error');
      this.begin('Paste');
      for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
          const t = rows[i][j] == null ? '' : rows[i][j];
          const r = r1 + i, c = c1 + j;
          const old = this.sheet().cells[M.key(r, c)];
          const s = old && old.s ? clone(old.s) : undefined;
          const p = t === '' ? { v: null } : valuesOnly ? Fmt.inferValue(t, false) : Fmt.inferValue(t, true);
          const cell = s ? { s } : {};
          if (p && p.f) { cell.f = p.f; cell.v = null; } else if (p) cell.v = p.v;
          if (p && p.nf && (!cell.s || !cell.s.nf)) cell.s = Object.assign(cell.s || {}, { nf: p.nf });
          this.putCell(this.sheetIdx, r, c, cell);
        }
      }
      this.commit();
      this.selectRange({ r1, c1, r2: r1 + h - 1, c2: c1 + w - 1 });
    },

    pasteInternal(valuesOnly) {
      const clip = this.clipboard;
      const h = clip.cells.length, w = clip.cells[0].length;
      if (clip.cut && !valuesOnly) return this.moveRange(clip);
      // Tile when the selection is an exact multiple of the copied block.
      const sh = this.sel.r2 - this.sel.r1 + 1, sw = this.sel.c2 - this.sel.c1 + 1;
      const ty = sh % h === 0 && !FULL_ROWS(this.sel) ? sh / h : 1, tx = sw % w === 0 && !FULL_COLS(this.sel) ? sw / w : 1;
      const { r1, c1 } = this.sel;
      if (r1 + h * ty > M.MAX_ROWS || c1 + w * tx > M.MAX_COLS) return toast("The pasted data doesn't fit on the sheet.", 'error');
      const dest = { r1, c1, r2: r1 + h * ty - 1, c2: c1 + w * tx - 1 };
      const overlapping = this.sheet().merges.filter((m) => intersects(m, dest) && !(m.r1 >= dest.r1 && m.r2 <= dest.r2 && m.c1 >= dest.c1 && m.c2 <= dest.c2));
      if (overlapping.length && !valuesOnly) return toast("Can't paste over part of a merged cell.", 'error');
      this.begin(valuesOnly ? 'Paste values' : 'Paste');
      for (let yy = 0; yy < ty; yy++) for (let xx = 0; xx < tx; xx++) {
        for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) {
          const r = r1 + yy * h + i, c = c1 + xx * w + j;
          const src = clip.cells[i][j];
          let cell;
          if (valuesOnly) {
            const old = this.sheet().cells[M.key(r, c)];
            cell = old && old.s ? { s: clone(old.s) } : {};
            const v = clip.values[i][j];
            if (v && typeof v === 'object') { cell.v = v.error; cell.e = true; }
            else cell.v = v;
            if (typeof v === 'number' && src && src.s && src.s.nf && !(cell.s && cell.s.nf)) cell.s = Object.assign(cell.s || {}, { nf: src.s.nf });
          } else {
            cell = clone(src) || null;
            if (cell && cell.f) cell.f = FU.shiftFormula(cell.f, r - (clip.g.r1 + i), c - (clip.g.c1 + j));
          }
          this.putCell(this.sheetIdx, r, c, cell);
        }
        if (!valuesOnly && clip.merges.length) {
          const offR = r1 + yy * h - clip.g.r1, offC = c1 + xx * w - clip.g.c1;
          const block = { r1: r1 + yy * h, c1: c1 + xx * w, r2: r1 + yy * h + h - 1, c2: c1 + xx * w + w - 1 };
          const kept = this.sheet().merges.filter((m) => !intersects(m, block));
          this.setSheetProps({ merges: kept.concat(clip.merges.map((m) => ({ r1: m.r1 + offR, c1: m.c1 + offC, r2: m.r2 + offR, c2: m.c2 + offC }))) }, 'Paste');
        }
      }
      if (!valuesOnly) {
        // Copy column widths when whole columns were copied.
        const srcSheet = this.doc.sheets[clip.si];
        if (FULL_ROWS(clip.g) && srcSheet !== this.sheet()) {
          const widths = Object.assign({}, this.sheet().colWidths);
          for (let j = 0; j < w; j++) { const sw2 = srcSheet.colWidths[clip.g.c1 + j]; if (sw2) widths[c1 + j] = sw2; }
          this.setSheetProps({ colWidths: widths }, 'Paste');
        }
      }
      this.commit();
      this.selectRange(dest);
    },

    /** Cut + paste: move cells, keeping references to them intact (like Excel). */
    moveRange(clip) {
      const g = clip.g;
      const tr = this.sel.r1, tc = this.sel.c1;
      if (clip.si === this.sheetIdx && tr === g.r1 && tc === g.c1) return;
      const h = g.r2 - g.r1 + 1, w = g.c2 - g.c1 + 1;
      if (tr + h > M.MAX_ROWS || tc + w > M.MAX_COLS) return toast("The data doesn't fit there.", 'error');
      const dest = { r1: tr, c1: tc, r2: tr + h - 1, c2: tc + w - 1 };
      const ok = this.structural('Move', () => {
        const src = this.doc.sheets[clip.si], dst = this.sheet();
        this.engine.moveCells(clip.si, g, this.sheetIdx, tr, tc);
        const moved = [];
        for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) {
          const k = M.key(r, c);
          if (src.cells[k]) moved.push([r - g.r1, c - g.c1, src.cells[k]]);
          delete src.cells[k];
        }
        for (let r = dest.r1; r <= dest.r2; r++) for (let c = dest.c1; c <= dest.c2; c++) delete dst.cells[M.key(r, c)];
        for (const [i, j, cell] of moved) dst.cells[M.key(tr + i, tc + j)] = cell;
        const srcMerges = src.merges.filter((m) => m.r1 >= g.r1 && m.r2 <= g.r2 && m.c1 >= g.c1 && m.c2 <= g.c2);
        src.merges = src.merges.filter((m) => !srcMerges.includes(m));
        dst.merges = dst.merges.filter((m) => !intersects(m, dest)).concat(srcMerges.map((m) => ({ r1: m.r1 - g.r1 + tr, c1: m.c1 - g.c1 + tc, r2: m.r2 - g.r1 + tr, c2: m.c2 - g.c1 + tc })));
        this.engine.syncFormulas(this.doc);
        this.sel = { r1: dest.r1, c1: dest.c1, r2: dest.r2, c2: dest.c2, ar: dest.r1, ac: dest.c1 };
      });
      if (ok) { this.clipboard = null; this.stopMarch(); this.selectRange(dest); }
    },

    /* =================================================================== fill */

    fillCopy(dir) {
      const s = this.effectiveRange();
      let src, target;
      if (dir === 'down') {
        if (s.r1 === s.r2) { if (s.r1 === 0) return; src = { r1: s.r1 - 1, c1: s.c1, r2: s.r1 - 1, c2: s.c2 }; target = { r1: s.r1 - 1, c1: s.c1, r2: s.r2, c2: s.c2 }; }
        else { src = { r1: s.r1, c1: s.c1, r2: s.r1, c2: s.c2 }; target = s; }
      } else {
        if (s.c1 === s.c2) { if (s.c1 === 0) return; src = { r1: s.r1, c1: s.c1 - 1, r2: s.r2, c2: s.c1 - 1 }; target = { r1: s.r1, c1: s.c1 - 1, r2: s.r2, c2: s.c2 }; }
        else { src = { r1: s.r1, c1: s.c1, r2: s.r2, c2: s.c1 }; target = s; }
      }
      this.fillRange(src, target, true);
    },

    /** Fill `target` (which contains `src`) by extending series or copying, like Excel's fill handle. */
    fillRange(src, target, copyOnly) {
      const sh = this.sheet();
      const vertical = target.r1 !== src.r1 || target.r2 !== src.r2;
      const forward = vertical ? target.r2 > src.r2 : target.c2 > src.c2;
      const n = vertical ? src.r2 - src.r1 + 1 : src.c2 - src.c1 + 1;
      const lines = vertical ? range(src.c1, src.c2) : range(src.r1, src.r2);
      const newPositions = vertical
        ? (forward ? range(src.r2 + 1, target.r2) : range(target.r1, src.r1 - 1))
        : (forward ? range(src.c2 + 1, target.c2) : range(target.c1, src.c1 - 1));
      if (!newPositions.length) return;
      this.begin('Fill');
      for (const line of lines) {
        const seq = [];
        for (let i = 0; i < n; i++) {
          const r = vertical ? src.r1 + i : line, c = vertical ? line : src.c1 + i;
          seq.push({ r, c, cell: sh.cells[M.key(r, c)] });
        }
        const gen = copyOnly ? null : seriesGenerator(seq.map((x) => x.cell));
        for (const p of newPositions) {
          const idx = p - (vertical ? src.r1 : src.c1); // index relative to the first source cell
          const m = ((idx % n) + n) % n;
          const base = seq[m];
          const r = vertical ? p : line, c = vertical ? line : p;
          let cell;
          if (gen) {
            cell = gen(idx);
            if (cell && base.cell && base.cell.s) cell.s = clone(base.cell.s);
          } else cell = null;
          if (!cell) {
            cell = clone(base.cell) || null;
            if (cell && cell.f) cell.f = FU.shiftFormula(cell.f, r - base.r, c - base.c);
          }
          this.putCell(this.sheetIdx, r, c, cell);
        }
      }
      this.commit();
      this.selectRange(target);
    },

    fillDownToAdjacent() {
      const s = this.sel;
      const sh = this.sheet();
      const filled = (r, c) => { const x = sh.cells[M.key(r, c)]; return x && (x.v != null || x.f); };
      let col = s.c1 > 0 && filled(s.r2 + 1, s.c1 - 1) ? s.c1 - 1 : filled(s.r2 + 1, s.c2 + 1) ? s.c2 + 1 : -1;
      if (col < 0) return;
      let r = s.r2 + 1;
      while (r + 1 < M.MAX_ROWS && filled(r + 1, col)) r++;
      this.fillRange({ r1: s.r1, c1: s.c1, r2: s.r2, c2: s.c2 }, { r1: s.r1, c1: s.c1, r2: r, c2: s.c2 });
    },

    /* ============================================================= formatting */

    applyStyle(patch, label) {
      if (this.editing) this.commitEdit();
      const g = this.effectiveRange();
      const sh = this.sheet();
      this.begin(label || 'Format');
      for (const [r, c] of this.cellsIn(g)) {
        const m = this.mergeAt(r, c);
        if (m && (m.r1 !== r || m.c1 !== c)) continue;
        const old = sh.cells[M.key(r, c)];
        const cell = clone(old) || {};
        const s = Object.assign({}, cell.s);
        for (const [k, v] of Object.entries(patch)) { if (v == null || v === false) delete s[k]; else s[k] = v; }
        cell.s = s;
        this.putCell(this.sheetIdx, r, c, cell);
      }
      this.commit();
    },

    toggleStyle(key, label) {
      const s = (this.activeCell() || {}).s || {};
      this.applyStyle({ [key]: s[key] ? null : true }, label);
    },

    adjustDecimals(delta) {
      const g = this.effectiveRange();
      const sh = this.sheet();
      this.begin('Decimals');
      for (const [r, c] of this.cellsIn(g)) {
        const old = sh.cells[M.key(r, c)];
        const v = this.engine.value(this.sheetIdx, r, c);
        if (typeof v !== 'number' && !(r === this.sel.ar && c === this.sel.ac)) continue;
        const cell = clone(old) || {};
        cell.s = Object.assign({}, cell.s, { nf: Fmt.adjustDecimals(cell.s && cell.s.nf, v, delta) });
        this.putCell(this.sheetIdx, r, c, cell);
      }
      this.commit();
    },

    async customNumberFormat() {
      const cur = ((this.activeCell() || {}).s || {}).nf || 'General';
      const nf = await prompt('Custom Number Format', 'Format code (Excel syntax, e.g. #,##0.00;[Red]-#,##0.00)', cur, {
        validate: (v) => { try { Fmt.formatValue(1234.5, v); Fmt.formatValue(-1, v); return null; } catch { return 'That format code is not valid.'; } },
      });
      if (nf != null) this.applyStyle({ nf: nf === 'General' || !nf ? null : nf }, 'Number format');
      this.focusGrid();
    },

    async formatCellsDialog() {
      if (this.editing) this.commitEdit();
      const res = await Dialogs.formatCells(this);
      if (res) {
        this.begin('Format cells');
        this.applyStyle(res.patch, 'Format cells');
        if (res.border) this.setBorders(res.border.preset, res.border.style, res.border.color);
        this.commit();
      }
      this.focusGrid();
    },

    colorMenu(prop, evt) {
      const target = evt && evt.currentTarget ? evt.currentTarget : document.querySelector(`[data-cmd="apply-${prop}"]`);
      const r = target.getBoundingClientRect();
      this.lastColors = this.lastColors || { fc: '#c00000', bg: '#fff2cc' };
      const pick = (c) => {
        root.UI.closeMenus();
        if (c) {
          this.lastColors[prop] = c;
          document.getElementById('sw-' + prop).style.background = c;
        }
        this.applyStyle({ [prop]: c }, prop === 'fc' ? 'Text color' : 'Fill color');
        this.focusGrid();
      };
      const grid = root.UI.colorGrid(pick);
      const custom = el('input', { type: 'color', value: this.lastColors[prop] });
      custom.addEventListener('change', () => pick(custom.value));
      const box = el('div', { style: { padding: '10px' } },
        el('button', { class: 'btn', style: { width: '100%', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }, onclick: () => pick(this.lastColors[prop]) },
          el('span', { style: { width: '14px', height: '14px', borderRadius: '3px', background: this.lastColors[prop], outline: '1px solid rgba(127,127,127,.4)' } }), 'Last used'),
        grid,
        el('div', { class: 'row', style: { marginTop: '8px', justifyContent: 'space-between' } },
          el('button', { class: 'btn', onclick: () => pick(null) }, prop === 'fc' ? 'Automatic' : 'No fill'),
          el('label', { class: 'row tight dim' }, 'Custom ', custom)));
      root.UI.showPopup(box, r.left - 20, r.bottom + 4);
    },

    bordersMenu(evt) {
      const target = evt && evt.currentTarget ? evt.currentTarget : document.querySelector('[data-cmd="borders-menu"]');
      const r = target.getBoundingClientRect();
      const color = '#000000';
      const item = (label, icon, preset, style = 'thin') => ({ label, icon, action: () => this.setBordersCmd(preset, style, color) });
      showMenu([
        item('All borders', '⊞', 'all'), item('Outside borders', '□', 'outer'), item('Inside borders', '┼', 'inner'),
        item('Top border', '▔', 'top'), item('Bottom border', '▁', 'bottom'), item('Left border', '▏', 'left'), item('Right border', '▕', 'right'),
        '-', item('Thick outside borders', '▣', 'outer', 'thick'), item('Thick bottom border', '▁', 'bottom', 'medium'), item('Double bottom border', '‗', 'bottom', 'double'),
        '-', item('No borders', '⊘', 'none'),
        '-', { label: 'More border options…', action: () => this.formatCellsDialog() },
      ], r.left, r.bottom + 4);
    },

    setBordersCmd(preset, style, color) {
      this.begin('Borders');
      this.setBorders(preset, style, color);
      this.commit();
      this.focusGrid();
    },

    setBorders(preset, style, color) {
      const g = this.effectiveRange();
      const sh = this.sheet();
      const b = { style, color };
      this.begin('Borders');
      for (const [r, c] of this.cellsIn(g)) {
        const m = this.mergeAt(r, c);
        if (m && (m.r1 !== r || m.c1 !== c)) continue; // merged areas use their anchor's borders
        const r2 = m ? m.r2 : r, c2 = m ? m.c2 : c;
        const old = sh.cells[M.key(r, c)];
        const cell = clone(old) || {};
        const s = Object.assign({}, cell.s);
        const bd = preset === 'none' ? {} : Object.assign({}, s.bd);
        switch (preset) {
          case 'all': bd.t = bd.b = bd.l = bd.r = b; break;
          case 'outer': if (r === g.r1) bd.t = b; if (r2 >= g.r2) bd.b = b; if (c === g.c1) bd.l = b; if (c2 >= g.c2) bd.r = b; break;
          case 'inner': if (r2 < g.r2) bd.b = b; if (c2 < g.c2) bd.r = b; break;
          case 'top': if (r === g.r1) bd.t = b; break;
          case 'bottom': if (r2 >= g.r2) bd.b = b; break;
          case 'left': if (c === g.c1) bd.l = b; break;
          case 'right': if (c2 >= g.c2) bd.r = b; break;
        }
        if (Object.keys(bd).length) s.bd = bd; else delete s.bd;
        cell.s = s;
        this.putCell(this.sheetIdx, r, c, cell);
      }
      this.commit();
    },

    startFormatPainter() {
      if (this.formatPainter) { this.formatPainter = null; this.updateToolbar(); this.updateStatus(); return; }
      const g = this.effectiveRange();
      const styles = [];
      for (let r = g.r1; r <= g.r2; r++) {
        const row = [];
        for (let c = g.c1; c <= g.c2; c++) { const cell = this.sheet().cells[M.key(r, c)]; row.push(cell && cell.s ? clone(cell.s) : null); }
        styles.push(row);
      }
      this.formatPainter = { styles };
      this.updateToolbar();
      this.updateStatus();
      toast('Select the cells to apply this formatting to.', '', 2200);
      this.focusGrid();
    },

    applyFormatPainter() {
      const fp = this.formatPainter;
      this.formatPainter = null;
      const g = this.effectiveRange();
      const h = fp.styles.length, w = fp.styles[0].length;
      const sh = this.sheet();
      this.begin('Paint format');
      for (const [r, c] of this.cellsIn(g)) {
        const s = fp.styles[(r - g.r1) % h][(c - g.c1) % w];
        const cell = clone(sh.cells[M.key(r, c)]) || {};
        if (s) cell.s = clone(s); else delete cell.s;
        this.putCell(this.sheetIdx, r, c, cell);
      }
      this.commit();
      this.updateToolbar();
      this.updateStatus();
    },

    async merge(center) {
      const g = { r1: this.sel.r1, c1: this.sel.c1, r2: this.sel.r2, c2: this.sel.c2 };
      if (FULL_ROWS(g) || FULL_COLS(g)) return toast("Whole rows or columns can't be merged.", 'warn');
      if (g.r1 === g.r2 && g.c1 === g.c2) return;
      const sh = this.sheet();
      const others = [...this.cellsIn(g)].filter(([r, c]) => (r !== g.r1 || c !== g.c1) && !this.isEmpty(r, c));
      if (others.length) {
        const choice = await api.confirm({ message: 'Merging cells keeps only the upper-left value.', detail: 'Values in the other cells will be discarded.', buttons: ['Merge', 'Cancel'] });
        if (choice !== 0) return;
      }
      this.begin('Merge cells');
      for (const [r, c] of others) {
        const cell = clone(sh.cells[M.key(r, c)]);
        delete cell.v; delete cell.f; delete cell.e;
        this.putCell(this.sheetIdx, r, c, cell);
      }
      this.setSheetProps({ merges: sh.merges.filter((m) => !intersects(m, g)).concat([g]) }, 'Merge cells');
      if (center) {
        const a = clone(sh.cells[M.key(g.r1, g.c1)]) || {};
        a.s = Object.assign({}, a.s, { ha: 'center' });
        this.putCell(this.sheetIdx, g.r1, g.c1, a);
      }
      this.commit();
      this.setSelection(g, g.r1, g.c1);
    },

    unmerge() {
      const sh = this.sheet();
      const keep = sh.merges.filter((m) => !intersects(m, this.sel));
      if (keep.length === sh.merges.length) return;
      this.setSheetProps({ merges: keep }, 'Unmerge cells');
    },

    clear(what) {
      if (this.editing) return;
      const g = this.effectiveRange();
      const sh = this.sheet();
      this.begin(what === 'formats' ? 'Clear formatting' : what === 'all' ? 'Clear' : 'Clear contents');
      const keys = (g.r2 - g.r1 + 1) * (g.c2 - g.c1 + 1) > 50000
        ? Object.keys(sh.cells).map(M.parseKey).filter(([r, c]) => r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2)
        : [...this.cellsIn(g)];
      for (const [r, c] of keys) {
        const old = sh.cells[M.key(r, c)];
        if (!old) continue;
        if (!this.canEditQuiet(r, c)) continue;
        let cell = null;
        if (what === 'contents' && old.s) cell = { s: clone(old.s) };
        if (what === 'formats' && (old.v != null || old.f)) { cell = clone(old); delete cell.s; }
        this.putCell(this.sheetIdx, r, c, cell);
      }
      if (what === 'all' || what === 'formats') {
        const merges = sh.merges.filter((m) => !(m.r1 >= g.r1 && m.r2 <= g.r2 && m.c1 >= g.c1 && m.c2 <= g.c2));
        if (merges.length !== sh.merges.length) this.setSheetProps({ merges }, 'Clear');
      }
      this.commit();
    },

    canEditQuiet() { return true; },

    insertDateTime(kind) {
      const now = new Date();
      const serial = M.dateToSerial(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds())));
      if (this.editing) {
        const input = this.activeInput();
        const text = kind === 'date' ? Fmt.formatValue(Math.floor(serial), 'yyyy-mm-dd') : Fmt.formatValue(serial % 1, 'hh:mm');
        input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end');
        this.onEditInput(input);
        return;
      }
      const old = this.activeCell();
      const cell = old ? clone(old) : {};
      delete cell.f; delete cell.e;
      cell.v = kind === 'date' ? Math.floor(serial) : serial % 1;
      cell.s = Object.assign({}, cell.s, { nf: kind === 'date' ? 'yyyy-mm-dd' : 'hh:mm' });
      this.putCell(this.sheetIdx, this.sel.ar, this.sel.ac, cell);
    },

    autoSum() {
      if (this.editing) this.commitEdit();
      const s = this.sel;
      const num = (r, c) => typeof this.engine.value(this.sheetIdx, r, c) === 'number';
      if (s.r1 === s.r2 && s.c1 === s.c2) {
        const { ar: r, ac: c } = s;
        let top = r - 1;
        while (top >= 0 && num(top, c)) top--;
        if (top < r - 1) return this.startEdit(`=SUM(${M.rangeStr({ r1: top + 1, c1: c, r2: r - 1, c2: c })})`, 'edit');
        let left = c - 1;
        while (left >= 0 && num(r, left)) left--;
        if (left < c - 1) return this.startEdit(`=SUM(${M.rangeStr({ r1: r, c1: left + 1, r2: r, c2: c - 1 })})`, 'edit');
        return this.startEdit('=SUM()', 'edit');
      }
      const g = this.effectiveRange();
      const lastEmpty = range(g.c1, g.c2).every((c) => this.isEmpty(g.r2, c));
      const sumRow = lastEmpty ? g.r2 : g.r2 + 1;
      const endRow = lastEmpty ? g.r2 - 1 : g.r2;
      if (endRow < g.r1) return;
      this.begin('AutoSum');
      for (let c = g.c1; c <= g.c2; c++) this.putCell(this.sheetIdx, sumRow, c, Object.assign(clone(this.sheet().cells[M.key(sumRow, c)]) || {}, { f: `SUM(${M.rangeStr({ r1: g.r1, c1: c, r2: endRow, c2: c })})`, v: null }));
      this.commit();
    },

    async insertFunction() {
      const name = await Dialogs.functions(this);
      if (!name) { if (this.editing) this.activeInput().focus(); else this.focusGrid(); return; }
      if (this.editing) {
        const input = this.activeInput();
        input.focus();
        input.setRangeText(name + '(', input.selectionStart, input.selectionEnd, 'end');
        this.onEditInput(input);
      } else this.startEdit('=' + name + '(', 'edit');
    },

    /* =========================================================== sizes/hidden */

    async sizeDialog(kind) {
      const isCol = kind === 'col';
      const idx = isCol ? this.sel.ac : this.sel.ar;
      const cur = isCol ? (this.sheet().colWidths[idx] || M.DEFAULT_COL_WIDTH) : (this.sheet().rowHeights[idx] || M.DEFAULT_ROW_HEIGHT);
      const v = await prompt(isCol ? 'Column Width' : 'Row Height', isCol ? 'Width in pixels' : 'Height in pixels', cur, {
        validate: (x) => (+x >= 0 && +x <= 2000 ? null : 'Enter a number between 0 and 2000.'),
      });
      if (v == null) return this.focusGrid();
      const prop = isCol ? 'colWidths' : 'rowHeights';
      const next = Object.assign({}, this.sheet()[prop]);
      const targets = isCol ? range(this.sel.c1, Math.min(this.sel.c2, this.effectiveRange().c2 + 50)) : range(this.sel.r1, Math.min(this.sel.r2, this.effectiveRange().r2 + 50));
      for (const t of targets) next[t] = Math.round(+v);
      this.setSheetProps({ [prop]: next }, isCol ? 'Column width' : 'Row height');
      this.focusGrid();
    },

    autofitColumns(cols) {
      const sh = this.sheet();
      const b = M.usedBounds(sh);
      if (!b) return;
      const widths = Object.assign({}, sh.colWidths);
      const g = this.grid;
      for (const c of cols) {
        let max = 0;
        for (const k in sh.cells) {
          const [r, cc] = M.parseKey(k);
          if (cc !== c) continue;
          const cell = sh.cells[k];
          const m = this.mergeAt(r, c);
          if (m && m.c1 !== m.c2) continue;
          const v = this.engine.value(this.sheetIdx, r, c);
          if (v == null || v === '') continue;
          const text = Fmt.formatValue(v, cell.s && cell.s.nf);
          const longest = String(text).split('\n').reduce((a, l) => Math.max(a, g.measure(l, cell.s)), 0);
          max = Math.max(max, longest);
        }
        if (max) widths[c] = Math.min(800, Math.max(24, Math.ceil(max + 12)));
        else delete widths[c];
      }
      this.setSheetProps({ colWidths: widths }, 'Auto-fit columns');
    },

    autofitRows(rows) {
      const sh = this.sheet();
      const heights = Object.assign({}, sh.rowHeights);
      const g = this.grid;
      for (const r of rows) {
        let max = 0;
        for (const k in sh.cells) {
          const [rr, c] = M.parseKey(k);
          if (rr !== r) continue;
          const cell = sh.cells[k];
          const s = cell.s || {};
          const fontPx = ((s.fs || 11) * 4) / 3;
          let lines = 1;
          if (s.wrap) {
            g.ctx.font = g.font(s, 1);
            const v = this.engine.value(this.sheetIdx, r, c);
            lines = g.wrapLines(Fmt.formatValue(v, s.nf), (sh.colWidths[c] || M.DEFAULT_COL_WIDTH) - 6).length;
          } else if (typeof cell.v === 'string') lines = cell.v.split('\n').length;
          max = Math.max(max, lines * fontPx * 1.22 + 6);
        }
        if (max && Math.abs(max - M.DEFAULT_ROW_HEIGHT) > 1) heights[r] = Math.ceil(Math.max(max, 16));
        else delete heights[r];
      }
      this.setSheetProps({ rowHeights: heights }, 'Auto-fit rows');
    },

    hideRows(hide) {
      const sh = this.sheet();
      const hidden = Object.assign({}, sh.hiddenRows);
      const g = FULL_ROWS(this.sel) ? this.effectiveRange() : this.sel;
      const from = hide ? g.r1 : Math.max(0, g.r1 - (g.r1 === g.r2 ? 1 : 0)), to = hide ? g.r2 : g.r2 + (g.r1 === g.r2 ? 1 : 0);
      for (let r = from; r <= to; r++) { if (hide) hidden[r] = true; else delete hidden[r]; }
      this.setSheetProps({ hiddenRows: hidden }, hide ? 'Hide rows' : 'Unhide rows');
    },

    hideCols(hide) {
      const sh = this.sheet();
      const hidden = Object.assign({}, sh.hiddenCols);
      const g = FULL_COLS(this.sel) ? this.effectiveRange() : this.sel;
      const from = hide ? g.c1 : Math.max(0, g.c1 - (g.c1 === g.c2 ? 1 : 0)), to = hide ? g.c2 : g.c2 + (g.c1 === g.c2 ? 1 : 0);
      for (let c = from; c <= to; c++) { if (hide) hidden[c] = true; else delete hidden[c]; }
      this.setSheetProps({ hiddenCols: hidden }, hide ? 'Hide columns' : 'Unhide columns');
    },

    setFreeze(rows, cols) {
      rows = Math.min(rows, 1000); cols = Math.min(cols, 200);
      if (rows || cols) { this.scroller.scrollTop = 0; this.scroller.scrollLeft = 0; }
      this.setSheetProps({ freeze: { rows, cols } }, rows || cols ? 'Freeze panes' : 'Unfreeze panes');
      this.charts.position();
    },

    freezeMenu(evt) {
      const target = evt && evt.currentTarget ? evt.currentTarget : document.querySelector('[data-cmd="freeze-menu"]');
      const r = target.getBoundingClientRect();
      const a = M.addr(this.sel.ar, this.sel.ac);
      showMenu([
        { label: `Freeze above and left of ${a}`, action: () => this.run('freeze') },
        { label: 'Freeze top row', action: () => this.run('freeze-row') },
        { label: 'Freeze first column', action: () => this.run('freeze-col') },
        '-', { label: 'Unfreeze', action: () => this.run('unfreeze'), disabled: !(this.sheet().freeze.rows || this.sheet().freeze.cols) },
      ], r.left, r.bottom + 4);
    },

    /* ============================================================ rows/columns */

    rowCount() { return FULL_ROWS(this.sel) ? 1 : this.sel.r2 - this.sel.r1 + 1; },
    colCount() { return FULL_COLS(this.sel) ? 1 : this.sel.c2 - this.sel.c1 + 1; },

    /** Shift a sheet's cells, sizes, merges, filter and freeze for an insert (count > 0) or delete (count < 0). */
    shiftSheet(si, axis, index, count) {
      const sh = this.doc.sheets[si];
      const isRow = axis === 'row';
      const max = isRow ? M.MAX_ROWS : M.MAX_COLS;
      const del = count < 0 ? -count : 0, dEnd = index + del - 1;
      const mapIdx = (p) => (count > 0 ? (p >= index ? p + count : p) : (p > dEnd ? p - del : p >= index ? null : p));
      const cells = {};
      for (const k in sh.cells) {
        const [r, c] = M.parseKey(k);
        const p = mapIdx(isRow ? r : c);
        if (p == null || p >= max) continue;
        cells[isRow ? M.key(p, c) : M.key(r, p)] = sh.cells[k];
      }
      sh.cells = cells;
      const remap = (obj) => { const out = {}; for (const k in obj || {}) { const p = mapIdx(+k); if (p != null && p < max) out[p] = obj[k]; } return out; };
      if (isRow) { sh.rowHeights = remap(sh.rowHeights); sh.hiddenRows = remap(sh.hiddenRows); }
      else { sh.colWidths = remap(sh.colWidths); sh.hiddenCols = remap(sh.hiddenCols); }
      const lo = isRow ? 'r1' : 'c1', hi = isRow ? 'r2' : 'c2';
      const adj = (g) => {
        const out = Object.assign({}, g);
        if (count > 0) {
          if (g[lo] >= index) { out[lo] += count; out[hi] += count; }
          else if (g[hi] >= index) out[hi] += count;
        } else {
          out[lo] = g[lo] < index ? g[lo] : g[lo] > dEnd ? g[lo] - del : index;
          out[hi] = g[hi] < index ? g[hi] : g[hi] > dEnd ? g[hi] - del : index - 1;
          if (out[hi] < out[lo]) return null;
        }
        out[hi] = Math.min(out[hi], max - 1);
        return out[lo] >= max ? null : out;
      };
      sh.merges = sh.merges.map(adj).filter((m) => m && (m.r1 !== m.r2 || m.c1 !== m.c2));
      if (sh.filter) {
        const f = adj(sh.filter);
        if (!f || (isRow && count < 0 && sh.filter.r1 >= index && sh.filter.r1 <= dEnd)) sh.filter = null;
        else {
          if (!isRow) f.hidden = remap(sh.filter.hidden);
          sh.filter = f;
        }
      }
      const fz = sh.freeze || { rows: 0, cols: 0 };
      const fk = isRow ? 'rows' : 'cols';
      if (fz[fk] && index < fz[fk]) fz[fk] = Math.max(index, fz[fk] + count);
      // Charts on any sheet that point at this sheet follow their data.
      for (const s of this.doc.sheets) s.charts = this.charts.adjustRanges(s.charts || [], sh.name, axis, index, count, s === sh);
    },

    insertRows(at, count) {
      if (at >= M.MAX_ROWS) return;
      const b = M.usedBounds(this.sheet());
      if (b && b.r2 + count >= M.MAX_ROWS) return toast('There is no room to insert rows: data would move off the end of the sheet.', 'error');
      this.structural(count > 1 ? `Insert ${count} rows` : 'Insert row', () => {
        this.engine.addRows(this.sheetIdx, at, count);
        this.shiftSheet(this.sheetIdx, 'row', at, count);
        this.engine.syncFormulas(this.doc);
      });
      this.charts.rebuild();
    },

    insertCols(at, count) {
      if (at >= M.MAX_COLS) return;
      const b = M.usedBounds(this.sheet());
      if (b && b.c2 + count >= M.MAX_COLS) return toast('There is no room to insert columns.', 'error');
      this.structural(count > 1 ? `Insert ${count} columns` : 'Insert column', () => {
        this.engine.addCols(this.sheetIdx, at, count);
        this.shiftSheet(this.sheetIdx, 'col', at, count);
        this.engine.syncFormulas(this.doc);
      });
      this.charts.rebuild();
    },

    deleteRows() {
      const g = FULL_ROWS(this.sel) ? this.effectiveRange() : this.sel;
      const count = g.r2 - g.r1 + 1;
      this.structural(count > 1 ? `Delete ${count} rows` : 'Delete row', () => {
        this.engine.removeRows(this.sheetIdx, g.r1, count);
        this.shiftSheet(this.sheetIdx, 'row', g.r1, -count);
        this.engine.syncFormulas(this.doc);
        this.sel = { r1: g.r1, c1: this.sel.c1, r2: g.r1, c2: this.sel.c1, ar: g.r1, ac: this.sel.c1 };
      });
      this.charts.rebuild();
    },

    deleteCols() {
      const g = FULL_COLS(this.sel) ? this.effectiveRange() : this.sel;
      const count = g.c2 - g.c1 + 1;
      this.structural(count > 1 ? `Delete ${count} columns` : 'Delete column', () => {
        this.engine.removeCols(this.sheetIdx, g.c1, count);
        this.shiftSheet(this.sheetIdx, 'col', g.c1, -count);
        this.engine.syncFormulas(this.doc);
        this.sel = { r1: this.sel.r1, c1: g.c1, r2: this.sel.r1, c2: g.c1, ar: this.sel.r1, ac: g.c1 };
      });
      this.charts.rebuild();
    },

    /* ================================================================= sheets */

    addSheet() {
      const idx = this.sheetIdx + 1;
      let n = this.doc.sheets.length + 1;
      while (this.doc.sheets.some((s) => s.name.toLowerCase() === ('sheet' + n))) n++;
      const name = 'Sheet' + n;
      this.structural('Add sheet', () => {
        this.doc.sheets.splice(idx, 0, M.emptySheet(name));
        this.views.splice(idx, 0, null);
        this.engine.addSheet(name, idx);
        this.views[this.sheetIdx] = { sel: clone(this.sel), focus: clone(this.focus), sl: this.scroller.scrollLeft, st: this.scroller.scrollTop };
        this.sheetIdx = idx;
        this.sel = { r1: 0, c1: 0, r2: 0, c2: 0, ar: 0, ac: 0 };
      });
      this.switchSheet(idx, true);
    },

    duplicateSheet(i) {
      const src = this.doc.sheets[i];
      const name = this.uniqueSheetName(src.name);
      const copy = clone(src);
      copy.name = name;
      copy.charts = (copy.charts || []).map((c) => Object.assign(c, { id: 'c' + Math.random().toString(36).slice(2, 9) }));
      this.structural('Duplicate sheet', () => {
        this.doc.sheets.splice(i + 1, 0, copy);
        this.views.splice(i + 1, 0, null);
        this.engine.addSheet(name, i + 1);
        this.engine.reloadSheet(i + 1, copy);
        this.sheetIdx = i + 1;
      });
      this.switchSheet(i + 1, true);
    },

    async deleteSheet(i) {
      if (this.doc.sheets.length <= 1) return toast('A workbook must contain at least one sheet.', 'warn');
      const sh = this.doc.sheets[i];
      if (M.usedBounds(sh) || sh.charts.length) {
        const choice = await api.confirm({ message: `Delete the sheet "${sh.name}"?`, detail: 'Formulas on other sheets that refer to it will show #REF!. You can undo this.', buttons: ['Delete', 'Cancel'] });
        if (choice !== 0) return;
      }
      this.structural('Delete sheet', () => {
        this.engine.removeSheet(i);
        this.doc.sheets.splice(i, 1);
        this.views.splice(i, 1);
        this.engine.syncFormulas(this.doc);
        this.sheetIdx = Math.min(i, this.doc.sheets.length - 1);
      });
      this.switchSheet(this.sheetIdx, true);
    },

    renameSheet(i, name) {
      const old = this.doc.sheets[i].name;
      if (old === name) return;
      this.structural('Rename sheet', () => {
        this.engine.renameSheet(i, name);
        this.doc.sheets[i].name = name;
        this.engine.syncFormulas(this.doc);
        for (const s of this.doc.sheets) {
          s.charts = (s.charts || []).map((c) => {
            const g = M.parseRange(c.range || '');
            if (g && g.sheet && g.sheet.toLowerCase() === old.toLowerCase()) return Object.assign({}, c, { range: M.quoteSheet(name) + '!' + M.rangeStr(g) });
            return c;
          });
        }
      });
      this.renderTabs();
    },

    moveSheet(from, to) {
      if (from === to) return;
      this.structural('Move sheet', () => {
        const [s] = this.doc.sheets.splice(from, 1);
        this.doc.sheets.splice(to, 0, s);
        const [v] = this.views.splice(from, 1);
        this.views.splice(to, 0, v);
        this.engine.moveSheet(from, to);
        this.sheetIdx = to;
      });
      this.switchSheet(to, true, true);
    },

    sheetMenu(x, y) {
      showMenu([
        { label: 'Insert sheet', action: () => this.run('add-sheet') },
        { label: 'Duplicate', action: () => this.run('dup-sheet') },
        { label: 'Rename…', action: () => this.renameSheetInline(this.sheetIdx, document.getElementById('tabs').children[this.sheetIdx]) },
        { label: 'Delete', action: () => this.run('delete-sheet'), disabled: this.doc.sheets.length <= 1 },
        '-',
        { label: 'Move left', action: () => this.run('sheet-left'), disabled: this.sheetIdx === 0 },
        { label: 'Move right', action: () => this.run('sheet-right'), disabled: this.sheetIdx === this.doc.sheets.length - 1 },
      ], x, y - 220);
    },

    cellMenu(x, y, area) {
      const rows = FULL_COLS(this.sel), cols = FULL_ROWS(this.sel);
      const nR = this.rowCount(), nC = this.colCount();
      const items = [
        { label: 'Cut', key: 'Ctrl+X', icon: '✂', action: () => this.run('cut') },
        { label: 'Copy', key: 'Ctrl+C', icon: '⧉', action: () => this.run('copy') },
        { label: 'Paste', key: 'Ctrl+V', icon: '📋', action: () => this.run('paste') },
        { label: 'Paste values only', key: 'Ctrl+Shift+V', action: () => this.run('paste-values') },
        '-',
      ];
      if (!cols) items.push({ label: nR > 1 ? `Insert ${nR} rows above` : 'Insert row above', action: () => this.run('insert-row-above') }, { label: nR > 1 ? `Insert ${nR} rows below` : 'Insert row below', action: () => this.run('insert-row-below') });
      if (!rows) items.push({ label: nC > 1 ? `Insert ${nC} columns left` : 'Insert column left', action: () => this.run('insert-col-left') }, { label: nC > 1 ? `Insert ${nC} columns right` : 'Insert column right', action: () => this.run('insert-col-right') });
      items.push('-');
      if (!cols) items.push({ label: 'Delete rows', action: () => this.run('delete-rows') });
      if (!rows) items.push({ label: 'Delete columns', action: () => this.run('delete-cols') });
      items.push({ label: 'Clear contents', key: 'Del', action: () => this.run('clear-contents') }, '-');
      if (area === 'rowHeader' || rows) items.push({ label: 'Row height…', action: () => this.run('row-height') }, { label: 'Hide rows', action: () => this.run('hide-rows') }, { label: 'Unhide rows', action: () => this.run('unhide-rows') }, '-');
      if (area === 'colHeader' || cols) items.push({ label: 'Column width…', action: () => this.run('col-width') }, { label: 'Auto-fit width', action: () => this.run('autofit-cols') }, { label: 'Hide columns', action: () => this.run('hide-cols') }, { label: 'Unhide columns', action: () => this.run('unhide-cols') }, '-');
      items.push(
        { label: 'Sort A → Z', action: () => this.run('sort-asc') },
        { label: 'Sort Z → A', action: () => this.run('sort-desc') },
        { label: this.sheet().filter ? 'Remove filter' : 'Create filter', action: () => this.run('toggle-filter') },
        '-',
        { label: 'Format cells…', key: 'Ctrl+1', action: () => this.run('format-cells') },
        { label: this.mergeAt(this.sel.ar, this.sel.ac) ? 'Unmerge cells' : 'Merge cells', action: () => this.run('merge-toggle') },
        { label: 'Insert chart…', action: () => this.run('insert-chart') },
      );
      showMenu(items, x, y);
    },

    /* ============================================================= sorting */

    currentRegion(r, c) {
      const g = { r1: r, c1: c, r2: r, c2: c };
      const b = M.usedBounds(this.sheet());
      if (!b) return g;
      const rowHas = (rr, c1, c2) => { if (rr < 0 || rr > b.r2) return false; for (let cc = Math.max(0, c1); cc <= Math.min(c2, b.c2); cc++) if (!this.isEmpty(rr, cc)) return true; return false; };
      const colHas = (cc, r1, r2) => { if (cc < 0 || cc > b.c2) return false; for (let rr = Math.max(0, r1); rr <= Math.min(r2, b.r2); rr++) if (!this.isEmpty(rr, cc)) return true; return false; };
      let changed = true;
      while (changed) {
        changed = false;
        if (rowHas(g.r1 - 1, g.c1 - 1, g.c2 + 1)) { g.r1--; changed = true; }
        if (rowHas(g.r2 + 1, g.c1 - 1, g.c2 + 1)) { g.r2++; changed = true; }
        if (colHas(g.c1 - 1, g.r1 - 1, g.r2 + 1)) { g.c1--; changed = true; }
        if (colHas(g.c2 + 1, g.r1 - 1, g.r2 + 1)) { g.c2++; changed = true; }
      }
      return g;
    },

    guessHeader(g, c) {
      const sh = this.sheet();
      const top = sh.cells[M.key(g.r1, c)], next = sh.cells[M.key(g.r1 + 1, c)];
      if (top && top.s && top.s.b && !(next && next.s && next.s.b)) return true;
      const tv = this.engine.value(this.sheetIdx, g.r1, c), nv = this.engine.value(this.sheetIdx, g.r1 + 1, c);
      return typeof tv === 'string' && nv != null && typeof nv !== 'string';
    },

    sortTarget() {
      const f = this.sheet().filter;
      const s = this.sel;
      if (f && s.ar >= f.r1 && s.ar <= f.r2 && s.ac >= f.c1 && s.ac <= f.c2 && s.r1 === s.r2 && s.c1 === s.c2) return { g: { r1: f.r1, c1: f.c1, r2: f.r2, c2: f.c2 }, header: true };
      if (s.r1 === s.r2 && s.c1 === s.c2) { const g = this.currentRegion(s.ar, s.ac); return { g, header: this.guessHeader(g, s.ac) }; }
      const g = this.effectiveRange();
      return { g, header: false };
    },

    quickSort(desc) {
      if (this.editing) this.commitEdit();
      const { g, header } = this.sortTarget();
      this.sortRange(g, [{ c: Math.max(g.c1, Math.min(g.c2, this.sel.ac)), desc }], header);
    },

    async sortDialog() {
      const { g } = this.sortTarget();
      const res = await Dialogs.sort(this, g);
      if (res) this.sortRange(g, res.keys, res.header, res.caseSensitive);
      this.focusGrid();
    },

    sortFilterColumn(c, desc) {
      const f = this.sheet().filter;
      if (f) this.sortRange({ r1: f.r1, c1: f.c1, r2: f.r2, c2: f.c2 }, [{ c, desc }], true);
    },

    sortRange(g, keys, header, caseSensitive) {
      const sh = this.sheet();
      if (sh.merges.some((m) => intersects(m, g))) return toast("Ranges containing merged cells can't be sorted.", 'error');
      const start = header ? g.r1 + 1 : g.r1;
      if (start >= g.r2) return;
      const rows = [];
      for (let r = start; r <= g.r2; r++) {
        const cells = [];
        for (let c = g.c1; c <= g.c2; c++) cells.push(clone(sh.cells[M.key(r, c)]));
        rows.push({ r, cells, keys: keys.map((k) => this.engine.value(this.sheetIdx, r, k.c)) });
      }
      const rank = (v) => (v == null || v === '' ? 4 : typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : 3);
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: caseSensitive ? 'case' : 'base' });
      rows.sort((a, b) => {
        for (let i = 0; i < keys.length; i++) {
          const x = a.keys[i], y = b.keys[i];
          const rx = rank(x), ry = rank(y);
          if (rx === 4 || ry === 4) { if (rx !== ry) return rx === 4 ? 1 : -1; continue; } // blanks always last
          let d = rx - ry;
          if (!d) d = rx === 0 ? x - y : rx === 1 ? collator.compare(x, y) : rx === 2 ? (x === y ? 0 : x ? 1 : -1) : 0;
          if (d) return keys[i].desc ? -d : d;
        }
        return a.r - b.r;
      });
      this.begin('Sort');
      rows.forEach((row, i) => {
        const newR = start + i;
        row.cells.forEach((cell, j) => {
          if (cell && cell.f && newR !== row.r) cell.f = FU.shiftFormula(cell.f, newR - row.r, 0);
          this.putCell(this.sheetIdx, newR, g.c1 + j, cell);
        });
      });
      this.commit();
    },

    /* ============================================================= filtering */

    toggleFilter() {
      if (this.editing) this.commitEdit();
      const sh = this.sheet();
      if (sh.filter) return this.setSheetProps({ filter: null }, 'Remove filter');
      const s = this.sel;
      let g = s.r1 === s.r2 && s.c1 === s.c2 ? this.currentRegion(s.ar, s.ac) : this.effectiveRange();
      if (g.r1 === g.r2 && this.isEmpty(g.r1, g.c1)) return toast('Select a cell inside your data (with a header row) to create a filter.', 'warn');
      if (g.r2 === g.r1) g = Object.assign({}, g, { r2: g.r1 + 1 });
      this.setSheetProps({ filter: { r1: g.r1, c1: g.c1, r2: g.r2, c2: g.c2, hidden: {} } }, 'Create filter');
    },

    clearFilter() {
      const f = this.sheet().filter;
      if (f) this.setSheetProps({ filter: Object.assign({}, f, { hidden: {} }) }, 'Clear filter');
    },

    filterValues(c) {
      const f = this.sheet().filter;
      const b = this.currentRegion(f.r1, f.c1);
      const r2 = Math.max(f.r2, b.r2);
      const set = new Set();
      for (let r = f.r1 + 1; r <= r2 && set.size < 5000; r++) set.add(this.displayText(this.sheetIdx, r, c));
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      return [...set].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : collator.compare(a, b)));
    },

    applyColumnFilter(c, hiddenValues) {
      const f = clone(this.sheet().filter);
      const region = this.currentRegion(f.r1, f.c1);
      f.r2 = Math.max(f.r2, region.r2);
      f.hidden = f.hidden || {};
      if (hiddenValues.length) f.hidden[c] = hiddenValues; else delete f.hidden[c];
      this.setSheetProps({ filter: f }, 'Filter');
      const shown = (f.r2 - f.r1) - this.filterHidden.size;
      toast(`${shown} of ${f.r2 - f.r1} rows shown`, '', 1600);
    },

    /* ======================================================= dedupe / split */

    async dedupe() {
      const s = this.sel;
      const g = s.r1 === s.r2 && s.c1 === s.c2 ? this.currentRegion(s.ar, s.ac) : this.effectiveRange();
      const res = await Dialogs.dedupe(this, g);
      if (!res || !res.cols.length) return this.focusGrid();
      const sh = this.sheet();
      const start = res.header ? g.r1 + 1 : g.r1;
      const seen = new Set();
      const kept = [];
      for (let r = start; r <= g.r2; r++) {
        const key = res.cols.map((c) => this.displayText(this.sheetIdx, r, c).toLowerCase()).join('\u0001');
        if (seen.has(key)) continue;
        seen.add(key);
        kept.push(r);
      }
      const removed = g.r2 - start + 1 - kept.length;
      if (!removed) { toast('No duplicate rows found.', '', 2000); return this.focusGrid(); }
      const snapshot = kept.map((r) => range(g.c1, g.c2).map((c) => clone(sh.cells[M.key(r, c)])));
      this.begin('Remove duplicates');
      for (let i = 0; i <= g.r2 - start; i++) {
        const r = start + i;
        for (let j = 0; j <= g.c2 - g.c1; j++) {
          let cell = i < snapshot.length ? snapshot[i][j] : null;
          if (cell && cell.f && kept[i] !== r) cell.f = FU.shiftFormula(cell.f, r - kept[i], 0);
          this.putCell(this.sheetIdx, r, g.c1 + j, cell);
        }
      }
      this.commit();
      toast(`Removed ${removed} duplicate row${removed === 1 ? '' : 's'}; ${kept.length} unique remain.`, '', 3000);
      this.focusGrid();
    },

    async textToColumns() {
      const delim = await Dialogs.textToColumns();
      if (delim == null) return this.focusGrid();
      const g = this.effectiveRange();
      const c = g.c1;
      const sh = this.sheet();
      this.begin('Split text');
      for (let r = g.r1; r <= g.r2; r++) {
        const cell = sh.cells[M.key(r, c)];
        if (!cell || cell.f || typeof cell.v !== 'string') continue;
        const parts = cell.v.split(delim === ' ' ? / +/ : delim);
        parts.forEach((p, j) => {
          const target = sh.cells[M.key(r, c + j)];
          const nc = target && target.s ? { s: clone(target.s) } : {};
          const inf = Fmt.inferValue(p.trim(), false);
          nc.v = inf ? inf.v : null;
          if (inf && inf.nf) nc.s = Object.assign(nc.s || {}, { nf: inf.nf });
          this.putCell(this.sheetIdx, r, c + j, nc);
        });
      }
      this.commit();
      this.focusGrid();
    },

    /* ========================================================= find/replace */

    searchText(si, r, c, opts) {
      const cell = this.doc.sheets[si].cells[M.key(r, c)];
      if (opts.formulas && cell && cell.f) return '=' + cell.f;
      return this.displayText(si, r, c);
    },

    matches(text, opts) {
      if (!opts.text) return false;
      const a = opts.matchCase ? text : text.toLowerCase();
      const b = opts.matchCase ? opts.text : opts.text.toLowerCase();
      return opts.whole ? a === b : a.includes(b);
    },

    allMatches(opts) {
      const order = opts.allSheets ? this.doc.sheets.map((_, i) => (this.sheetIdx + i) % this.doc.sheets.length) : [this.sheetIdx];
      const out = [];
      for (const si of order) {
        const keys = Object.keys(this.doc.sheets[si].cells).map(M.parseKey).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        for (const [r, c] of keys) if (this.matches(this.searchText(si, r, c, opts), opts)) out.push({ si, r, c });
      }
      return out;
    },

    findNext(opts, dir) {
      if (!opts.text) return 'Type something to find.';
      const all = this.allMatches(opts);
      if (!all.length) return 'No matches.';
      const cur = { si: this.sheetIdx, r: this.sel.ar, c: this.sel.ac };
      const order = (m) => [(m.si - this.sheetIdx + this.doc.sheets.length) % this.doc.sheets.length, m.r, m.c];
      const cmp = (a, b) => { const x = order(a), y = order(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };
      let idx = dir > 0 ? all.findIndex((m) => cmp(m, cur) > 0) : findLastIndex(all, (m) => cmp(m, cur) < 0);
      if (idx < 0) idx = dir > 0 ? 0 : all.length - 1;
      const m = all[idx];
      if (m.si !== this.sheetIdx) this.switchSheet(m.si);
      this.select(m.r, m.c);
      return `${idx + 1} of ${all.length} — ${this.doc.sheets[m.si].name}!${M.addr(m.r, m.c)}`;
    },

    replaceIn(si, r, c, opts) {
      const cell = this.doc.sheets[si].cells[M.key(r, c)];
      if (!cell) return false;
      if (cell.f && !opts.formulas) return false;
      const src = Fmt.editText(cell);
      const flags = opts.matchCase ? 'g' : 'gi';
      const pattern = new RegExp(opts.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      const next = opts.whole ? (this.matches(src, opts) ? opts.replace : src) : src.replace(pattern, () => opts.replace);
      if (next === src) return false;
      const prev = this.sheetIdx;
      this.sheetIdx = si;
      this.applyInput(r, c, next);
      this.sheetIdx = prev;
      return true;
    },

    replaceOne(opts) {
      if (!opts.text) return 'Type something to find.';
      const { ar, ac } = this.sel;
      if (this.matches(this.searchText(this.sheetIdx, ar, ac, opts), opts)) {
        this.begin('Replace');
        const ok = this.replaceIn(this.sheetIdx, ar, ac, opts);
        this.commit();
        if (!ok) return opts.formulas ? 'Nothing replaced.' : 'This cell has a formula; tick "Search formulas" to replace inside it.';
      }
      return this.findNext(opts, 1);
    },

    replaceAll(opts) {
      if (!opts.text) return 'Type something to find.';
      const all = this.allMatches(opts);
      let n = 0;
      this.begin('Replace all');
      for (const m of all) if (this.replaceIn(m.si, m.r, m.c, opts)) n++;
      this.commit();
      return n ? `Replaced ${n} cell${n === 1 ? '' : 's'}.` : 'No matches.';
    },

    /* ================================================================ charts */

    async insertChart() {
      if (this.editing) this.commitEdit();
      const s = this.sel;
      const g = s.r1 === s.r2 && s.c1 === s.c2 ? this.currentRegion(s.ar, s.ac) : this.effectiveRange();
      if (!M.usedBounds(this.sheet())) return toast('Enter some data first, then select it and insert a chart.', 'warn');
      const spec = await Dialogs.chart(this, { type: 'column', range: M.rangeStr(g), header: true, seriesIn: 'cols', title: '' });
      if (!spec) return this.focusGrid();
      const gr = this.grid;
      // Place the chart to the right of the data, in unzoomed sheet coordinates.
      const x = gr.colAxis.pos(Math.min(g.c2 + 1, M.MAX_COLS - 1)) / this.zoom + 16;
      const y = gr.rowAxis.pos(g.r1) / this.zoom;
      this.charts.add(Object.assign({ id: 'c' + Date.now().toString(36), x, y, w: 480, h: 300 }, spec));
      this.scroller.scrollLeft = Math.max(0, x * this.zoom - 80);
      this.focusGrid();
    },
  };

  function intersects(a, b) { return !(a.r2 < b.r1 || a.r1 > b.r2 || a.c2 < b.c1 || a.c1 > b.c2); }
  function findLastIndex(arr, fn) { for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return i; return -1; }

  /** Returns idx → new cell for an inferable series, or null to fall back to copying. */
  function seriesGenerator(cells) {
    const n = cells.length;
    const vals = cells.map((c) => (c && !c.f ? c.v : undefined));
    if (cells.some((c) => c && c.f)) return null;
    // Numbers: linear trend (least squares) for 2+ values; dates step by one day when single.
    if (vals.every((v) => typeof v === 'number')) {
      if (n === 1) {
        const nf = cells[0].s && cells[0].s.nf;
        if (nf && Fmt.isDateFormat(nf) && Number.isInteger(vals[0])) return (idx) => ({ v: vals[0] + idx });
        return null;
      }
      const mx = (n - 1) / 2, my = vals.reduce((a, b) => a + b, 0) / n;
      let num = 0, den = 0;
      vals.forEach((v, i) => { num += (i - mx) * (v - my); den += (i - mx) * (i - mx); });
      const slope = num / den, icpt = my - slope * mx;
      return (idx) => ({ v: Number((icpt + slope * idx).toPrecision(15)) });
    }
    if (vals.every((v) => typeof v === 'string')) {
      // Named lists (weekdays, months, quarters)
      for (const list of LISTS) {
        const pos = vals.map((v) => list.findIndex((x) => x.toLowerCase() === v.toLowerCase()));
        if (pos.every((p) => p >= 0)) {
          const step = n > 1 ? (((pos[1] - pos[0]) % list.length) + list.length) % list.length || 1 : 1;
          const upper = vals[0] === vals[0].toUpperCase() && vals[0] !== vals[0].toLowerCase();
          return (idx) => {
            let t = list[(((pos[0] + step * idx) % list.length) + list.length) % list.length];
            if (upper) t = t.toUpperCase();
            return { v: t };
          };
        }
      }
      // Text with a trailing number: "Item 1" → "Item 2"
      const parts = vals.map((v) => /^(.*?)(\d+)$/.exec(v));
      if (parts.every(Boolean) && parts.every((p) => p[1] === parts[0][1])) {
        const nums = parts.map((p) => +p[2]);
        const step = n > 1 ? (nums[n - 1] - nums[0]) / (n - 1) : 1;
        if (Number.isInteger(step)) {
          const width = parts[0][2].length;
          return (idx) => {
            const v = nums[0] + step * idx;
            if (v < 0) return { v: parts[0][1] + v };
            return { v: parts[0][1] + String(v).padStart(parts[0][2].startsWith('0') ? width : 0, '0') };
          };
        }
      }
    }
    return null;
  }

  function parseTsv(text) {
    if (!text) return [];
    text = text.replace(/\r\n?/g, '\n');
    if (text.endsWith('\n')) text = text.slice(0, -1);
    const rows = [];
    let row = [], field = '', i = 0, quoted = false;
    while (i < text.length) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } quoted = false; i++; continue; }
        field += ch; i++; continue;
      }
      if (ch === '"' && field === '') { quoted = true; i++; continue; }
      if (ch === '\t') { row.push(field); field = ''; i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += ch; i++;
    }
    row.push(field);
    rows.push(row);
    return rows;
  }

  function parseHtmlTable(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;
    const out = [];
    [...table.rows].forEach((tr, ri) => {
      const row = out[ri] = out[ri] || [];
      let ci = 0;
      for (const td of tr.cells) {
        while (row[ci] !== undefined) ci++;
        const text = (td.innerText || td.textContent || '').replace(/ /g, ' ').replace(/\n$/, '');
        const cs = +td.colSpan || 1, rs = +td.rowSpan || 1;
        for (let dr = 0; dr < rs; dr++) {
          const target = out[ri + dr] = out[ri + dr] || [];
          for (let dc = 0; dc < cs; dc++) target[ci + dc] = dr === 0 && dc === 0 ? text : '';
        }
        ci += cs;
      }
    });
    return out.map((r) => Array.from(r, (x) => (x === undefined ? '' : x)));
  }

  Object.assign(App.prototype, P);
  App.seriesGenerator = seriesGenerator;
  App.parseTsv = parseTsv;
})(self);

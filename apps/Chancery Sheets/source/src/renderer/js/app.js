/*
 * Application core: document state, transactions & undo, selection, cell editing,
 * mouse/keyboard interaction, formula bar, sheet tabs and status bar.
 * Commands (formatting, clipboard, sorting, …) are added in commands.js.
 */
(function (root) {
  const M = root.SheetModel;
  const Fmt = root.Fmt;
  const FU = root.FormulaUtils;
  const { el, showMenu, toast } = root.UI;
  const api = root.sheetsAPI;

  const clone = (x) => (x == null ? x : structuredClone(x));
  const REF_COLORS = ['#2f6fdd', '#c5221f', '#8e44ad', '#1a7f4b', '#e8710a', '#12939a', '#d81b60', '#7f6000'];
  const isEmptyCell = (c) => !c || ((c.v == null || c.v === '') && !c.f && (!c.s || !Object.keys(c.s).length));

  class App {
    constructor() {
      this.doc = M.newDoc();
      this.filePath = null;
      this.dirty = false;
      this.pristine = true;
      this.sheetIdx = 0;
      this.zoom = 1;
      this.showFormulas = false;
      this.sel = { r1: 0, c1: 0, r2: 0, c2: 0, ar: 0, ac: 0 };
      this.focus = { r: 0, c: 0 };
      this.views = [];
      this.undoStack = [];
      this.redoStack = [];
      this.tx = null;
      this.editing = null;
      this.clipboard = null;
      this.refHighlights = [];
      this.fillPreview = null;
      this.mergeIndex = new Map();
      this.bigMerges = [];
      this.filterHidden = new Set();
      this.formatPainter = null;
      this.lossAcknowledged = null;

      this.engine = new root.Engine();
      this.grid = new root.Grid(this);
      this.charts = new root.ChartManager(this);

      this.editor = document.getElementById('cell-editor');
      this.formulaInput = document.getElementById('formula-input');
      this.nameBox = document.getElementById('name-box');
      this.scroller = this.grid.scroller;
      this.autocomplete = document.getElementById('autocomplete');
      this.functionNames = root.Engine.functionNames();

      this.bindMouse();
      this.bindKeyboard();
      this.bindEditor();
      this.bindChrome();
      this.loadDoc(M.newDoc(), null, [], true);
    }

    /* ================================================================ document */

    sheet() { return this.doc.sheets[this.sheetIdx]; }
    activeCell() { return this.sheet().cells[M.key(this.sel.ar, this.sel.ac)]; }

    loadDoc(doc, filePath, warnings = [], fresh = false) {
      this.cancelEdit();
      this.doc = M.normalizeDoc(doc);
      this.filePath = filePath || null;
      this.engine.rebuild(this.doc);
      this.undoStack = [];
      this.redoStack = [];
      this.clipboard = null;
      this.views = this.doc.sheets.map(() => null);
      this.sheetIdx = -1;
      this.dirty = false;
      this.pristine = fresh;
      this.lossAcknowledged = null;
      this.switchSheet(this.doc.activeSheet || 0, true);
      this.renderTabs();
      this.sendState();
      for (const w of warnings || []) toast(w, 'warn', 6000);
    }

    displayName() {
      if (!this.filePath) return 'Untitled';
      return this.filePath.split(/[\\/]/).pop();
    }

    sendState() {
      const title = `${this.dirty ? '• ' : ''}${this.displayName()} — Chancery Sheets`;
      document.title = title;
      api.setState({ dirty: this.dirty, filePath: this.filePath, pristine: this.pristine && !this.dirty, title });
    }

    markDirty() {
      if (!this.dirty || this.pristine) { this.dirty = true; this.pristine = false; this.sendState(); }
    }

    /* ======================================================= transactions/undo */

    /** Group changes into one undoable step. Nested begin/commit pairs merge into the outer one. */
    begin(label) {
      if (this.tx) { this.tx.depth++; return; }
      this.tx = { label, depth: 0, cells: new Map(), props: new Map(), engine: [], si: this.sheetIdx, sel: clone(this.sel) };
    }

    commit() {
      const tx = this.tx;
      if (!tx) return;
      if (tx.depth > 0) { tx.depth--; return; }
      this.tx = null;
      if (!tx.cells.size && !tx.props.size) return;
      const failed = this.engine.setCells(tx.engine);
      // Normalize formulas as the engine sees them (e.g. sum( → SUM().
      for (const e of tx.engine) {
        const cell = this.doc.sheets[e.si].cells[M.key(e.r, e.c)];
        if (cell && cell.f) { const f = this.engine.formula(e.si, e.r, e.c); if (f) cell.f = f; }
      }
      if (failed.length) toast(`Couldn't change ${failed.length === 1 ? M.addr(failed[0].r, failed[0].c) : failed.length + ' cells'}: ${failed[0].error}`, 'error', 5000);
      const entry = { type: 'tx', label: tx.label, si: tx.si, selBefore: tx.sel, selAfter: clone(this.sel), cells: [], props: [] };
      for (const c of tx.cells.values()) entry.cells.push({ si: c.si, k: c.k, before: c.before, after: clone(this.doc.sheets[c.si].cells[c.k]) });
      for (const p of tx.props.values()) entry.props.push({ si: p.si, prop: p.prop, before: p.before, after: clone(this.doc.sheets[p.si][p.prop]) });
      this.pushUndo(entry);
      this.afterChange(tx.props.size > 0);
    }

    pushUndo(entry) {
      this.undoStack.push(entry);
      if (this.undoStack.length > 300) this.undoStack.shift();
      this.redoStack = [];
      this.markDirty();
    }

    /** Set (or with null, delete) one cell. Must run inside begin()/commit(). */
    putCell(si, r, c, cell) {
      const auto = !this.tx;
      if (auto) this.begin('Edit');
      const sh = this.doc.sheets[si];
      const k = M.key(r, c);
      const id = si + '|' + k;
      const before = sh.cells[k];
      if (!this.tx.cells.has(id)) this.tx.cells.set(id, { si, k, before: clone(before) });
      if (isEmptyCell(cell)) delete sh.cells[k];
      else {
        if (cell.s && !Object.keys(cell.s).length) delete cell.s;
        sh.cells[k] = cell;
      }
      if (root.Engine.rawOf(before) !== root.Engine.rawOf(cell)) this.tx.engine.push({ si, r, c, cell: sh.cells[k] || null });
      if (auto) this.commit();
    }

    /** Set sheet-level properties (merges, sizes, filter, charts…) undoably. */
    setSheetProps(patch, label, si = this.sheetIdx) {
      const auto = !this.tx;
      if (auto) this.begin(label || 'Change');
      const sh = this.doc.sheets[si];
      for (const prop of Object.keys(patch)) {
        const id = si + '|' + prop;
        if (!this.tx.props.has(id)) this.tx.props.set(id, { si, prop, before: clone(sh[prop]) });
        sh[prop] = patch[prop];
      }
      if (auto) this.commit();
    }

    /** Whole-document snapshot undo for structural changes (rows/cols, sheets, moves). */
    structural(label, fn) {
      if (this.editing) this.commitEdit();
      const before = { doc: clone(this.doc), si: this.sheetIdx, sel: clone(this.sel) };
      let ok;
      try {
        ok = fn();
      } catch (e) {
        // Roll back to a consistent state if anything failed halfway.
        this.doc = before.doc;
        this.engine.rebuild(this.doc);
        this.refreshAll();
        toast(e.message || String(e), 'error', 5000);
        return false;
      }
      if (ok === false) return false;
      this.pushUndo({ type: 'snap', label, before, after: { doc: clone(this.doc), si: this.sheetIdx, sel: clone(this.sel) } });
      this.afterChange(true);
      return true;
    }

    undo() { this.applyHistory(this.undoStack, this.redoStack, 'before'); }
    redo() { this.applyHistory(this.redoStack, this.undoStack, 'after'); }

    applyHistory(from, to, which) {
      if (this.editing) { this.cancelEdit(); return; }
      const e = from.pop();
      if (!e) return;
      to.push(e);
      if (e.type === 'snap') {
        const s = e[which];
        this.doc = clone(s.doc);
        this.engine.rebuild(this.doc);
        while (this.views.length < this.doc.sheets.length) this.views.push(null);
        this.views.length = this.doc.sheets.length;
        this.sheetIdx = Math.min(s.si, this.doc.sheets.length - 1);
        this.sel = clone(s.sel);
        this.focus = { r: this.sel.r2, c: this.sel.c2 };
        this.refreshAll();
      } else {
        const changes = [];
        for (const c of e.cells) {
          const sh = this.doc.sheets[c.si];
          if (!sh) continue;
          const val = clone(c[which]);
          const prev = sh.cells[c.k];
          if (val) sh.cells[c.k] = val; else delete sh.cells[c.k];
          if (root.Engine.rawOf(prev) !== root.Engine.rawOf(val)) {
            const [r, cc] = M.parseKey(c.k);
            changes.push({ si: c.si, r, c: cc, cell: val });
          }
        }
        this.engine.setCells(changes);
        for (const p of e.props) if (this.doc.sheets[p.si]) this.doc.sheets[p.si][p.prop] = clone(p[which]);
        if (e.si !== this.sheetIdx && this.doc.sheets[e.si]) this.switchSheet(e.si);
        this.sel = clone(which === 'before' ? e.selBefore : e.selAfter);
        this.focus = { r: this.sel.r2, c: this.sel.c2 };
        this.afterChange(e.props.length > 0);
        if (e.props.some((p) => p.prop === 'charts')) this.charts.rebuild();
      }
      this.markDirty();
      toast(`${which === 'before' ? 'Undo' : 'Redo'}: ${e.label}`, '', 1400);
    }

    /** Refresh derived state after any change. */
    afterChange(layoutChanged) {
      if (layoutChanged) this.rebuildMergeIndex();
      this.recomputeFilter();
      this.grid.rebuildAxes();
      this.grid.invalidate();
      this.charts.position();
      this.charts.scheduleRefresh();
      this.updateFormulaBar();
      this.updateToolbar();
      this.updateStatus();
    }

    refreshAll() {
      this.switchSheet(this.sheetIdx, true, true);
      this.renderTabs();
    }

    /* ================================================================== sheets */

    switchSheet(i, force, keepSel) {
      if (!force && i === this.sheetIdx) return;
      if (this.editing) {
        // While pointing at references in a formula, switching sheets keeps the edit open (cross-sheet refs).
        if (this.pointable() && i !== this.editing.si) {
          const from = this.activeInput();
          const a = from.selectionStart, b = from.selectionEnd;
          this.editing.fromFormulaBar = true;
          this.editor.style.display = 'none';
          this.formulaInput.value = from.value;
          setTimeout(() => { this.formulaInput.focus(); this.formulaInput.setSelectionRange(a, b); });
          this.formulaInput.setSelectionRange(a, b);
        }
        else this.commitEdit();
      }
      if (i !== this.sheetIdx && this.sheetIdx >= 0 && this.doc.sheets[this.sheetIdx]) {
        this.views[this.sheetIdx] = { sel: clone(this.sel), focus: clone(this.focus), sl: this.scroller.scrollLeft, st: this.scroller.scrollTop };
      }
      this.sheetIdx = Math.max(0, Math.min(i, this.doc.sheets.length - 1));
      this.doc.activeSheet = this.sheetIdx;
      const v = this.views[this.sheetIdx];
      if (!keepSel) {
        this.sel = v ? v.sel : { r1: 0, c1: 0, r2: 0, c2: 0, ar: 0, ac: 0 };
        this.focus = v ? v.focus : { r: 0, c: 0 };
      }
      this.rebuildMergeIndex();
      this.recomputeFilter();
      this.grid.extentRows = 1000; this.grid.extentCols = 52;
      this.grid.rebuildAxes();
      this.grid.updateExtent(true);
      this.scroller.scrollLeft = v && !keepSel ? v.sl : keepSel ? this.scroller.scrollLeft : 0;
      this.scroller.scrollTop = v && !keepSel ? v.st : keepSel ? this.scroller.scrollTop : 0;
      this.charts.rebuild();
      this.grid.invalidate(true);
      this.updateFormulaBar();
      this.updateToolbar();
      this.updateStatus();
      this.renderTabs();
    }

    renderTabs() {
      const tabs = document.getElementById('tabs');
      tabs.innerHTML = '';
      this.doc.sheets.forEach((sh, i) => {
        const t = el('div', { class: 'tab' + (i === this.sheetIdx ? ' active' : ''), role: 'tab', draggable: 'true', title: sh.name }, sh.name);
        t.addEventListener('mousedown', (e) => { if (e.button === 0) this.switchSheet(i); });
        t.addEventListener('dblclick', () => this.renameSheetInline(i, t));
        t.addEventListener('contextmenu', (e) => { e.preventDefault(); this.switchSheet(i); this.sheetMenu(e.clientX, e.clientY); });
        t.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/x-sheet-index', String(i)); e.dataTransfer.effectAllowed = 'move'; });
        t.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('text/x-sheet-index')) { e.preventDefault(); t.classList.add('drop-before'); } });
        t.addEventListener('dragleave', () => t.classList.remove('drop-before'));
        t.addEventListener('drop', (e) => {
          t.classList.remove('drop-before');
          const from = +e.dataTransfer.getData('text/x-sheet-index');
          if (!isNaN(from) && from !== i) { e.preventDefault(); e.stopPropagation(); this.moveSheet(from, from < i ? i - 1 : i); }
        });
        tabs.append(t);
      });
      const active = tabs.children[this.sheetIdx];
      if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    renameSheetInline(i, tab) {
      const input = el('input', { value: this.doc.sheets[i].name });
      tab.textContent = '';
      tab.append(input);
      input.focus();
      input.select();
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        if (ok && input.value.trim() && input.value.trim() !== this.doc.sheets[i].name) {
          const err = this.validateSheetName(input.value.trim(), i);
          if (err) toast(err, 'error');
          else this.renameSheet(i, input.value.trim());
        }
        this.renderTabs();
        this.focusGrid();
      };
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      });
      input.addEventListener('blur', () => finish(true));
    }

    validateSheetName(name, exceptIdx) {
      if (!name) return 'Sheet names cannot be empty.';
      if (name.length > 31) return 'Sheet names can be at most 31 characters.';
      if (/[\\/?*[\]:]/.test(name)) return 'Sheet names cannot contain \\ / ? * [ ] :';
      if (/^'|'$/.test(name)) return 'Sheet names cannot start or end with an apostrophe.';
      if (this.doc.sheets.some((s, i) => i !== exceptIdx && s.name.toLowerCase() === name.toLowerCase())) return `A sheet named "${name}" already exists.`;
      return null;
    }

    uniqueSheetName(base) {
      const names = new Set(this.doc.sheets.map((s) => s.name.toLowerCase()));
      if (!names.has(base.toLowerCase())) return base;
      const stem = base.replace(/\s*\(\d+\)$/, '');
      for (let n = 2; ; n++) { const cand = `${stem} (${n})`.slice(0, 31); if (!names.has(cand.toLowerCase())) return cand; }
    }

    /* ============================================================ merges/filter */

    rebuildMergeIndex() {
      this.mergeIndex = new Map();
      this.bigMerges = [];
      for (const m of this.sheet().merges) {
        const n = (m.r2 - m.r1 + 1) * (m.c2 - m.c1 + 1);
        if (n > 20000) { this.bigMerges.push(m); continue; }
        for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) this.mergeIndex.set(r + ',' + c, m);
      }
    }

    mergeAt(r, c) {
      const m = this.mergeIndex.get(r + ',' + c);
      if (m) return m;
      for (const b of this.bigMerges) if (r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2) return b;
      return null;
    }

    expandForMerges(g) {
      const out = { r1: g.r1, c1: g.c1, r2: g.r2, c2: g.c2 };
      let changed = true;
      while (changed) {
        changed = false;
        for (const m of this.sheet().merges) {
          if (m.r2 < out.r1 || m.r1 > out.r2 || m.c2 < out.c1 || m.c1 > out.c2) continue;
          if (m.r1 < out.r1) { out.r1 = m.r1; changed = true; }
          if (m.c1 < out.c1) { out.c1 = m.c1; changed = true; }
          if (m.r2 > out.r2) { out.r2 = m.r2; changed = true; }
          if (m.c2 > out.c2) { out.c2 = m.c2; changed = true; }
        }
      }
      return out;
    }

    displayText(si, r, c) {
      const cell = this.doc.sheets[si].cells[M.key(r, c)];
      const v = this.engine.value(si, r, c);
      return Fmt.formatValue(v, cell && cell.s && cell.s.nf);
    }

    recomputeFilter() {
      this.filterHidden = new Set();
      const f = this.sheet().filter;
      if (!f || !f.hidden) return;
      const cols = Object.keys(f.hidden).filter((c) => f.hidden[c] && f.hidden[c].length).map(Number);
      if (!cols.length) return;
      const sets = cols.map((c) => [c, new Set(f.hidden[c])]);
      for (let r = f.r1 + 1; r <= f.r2; r++) {
        for (const [c, set] of sets) {
          if (set.has(this.displayText(this.sheetIdx, r, c))) { this.filterHidden.add(r); break; }
        }
      }
    }

    filterHiddenRows() { return this.filterHidden; }

    isRowHidden(r) { const sh = this.sheet(); return !!(sh.hiddenRows && sh.hiddenRows[r]) || this.filterHidden.has(r); }
    isColHidden(c) { const sh = this.sheet(); return !!(sh.hiddenCols && sh.hiddenCols[c]); }

    /* ================================================================ selection */

    setSelection(g, ar, ac, focus) {
      const e = this.expandForMerges(g);
      this.sel = { r1: e.r1, c1: e.c1, r2: e.r2, c2: e.c2, ar, ac };
      this.focus = focus || { r: ar, c: ac };
      this.grid.ensureExtent(Math.min(this.focus.r, M.MAX_ROWS - 1), Math.min(this.focus.c, M.MAX_COLS - 1));
      this.grid.invalidate();
      this.updateFormulaBar();
      this.updateToolbar();
      this.updateStatus();
    }

    select(r, c, extend) {
      r = Math.max(0, Math.min(M.MAX_ROWS - 1, r));
      c = Math.max(0, Math.min(M.MAX_COLS - 1, c));
      if (extend) {
        const a = { r: this.sel.ar, c: this.sel.ac };
        this.setSelection({ r1: Math.min(a.r, r), c1: Math.min(a.c, c), r2: Math.max(a.r, r), c2: Math.max(a.c, c) }, a.r, a.c, { r, c });
      } else {
        const m = this.mergeAt(r, c);
        if (m) { r = m.r1; c = m.c1; }
        this.setSelection({ r1: r, c1: c, r2: r, c2: c }, r, c);
      }
      this.grid.scrollIntoView(this.focus.r, this.focus.c);
    }

    selectRange(g) {
      this.setSelection(g, g.r1, g.c1, { r: g.r2, c: g.c2 });
      this.grid.scrollIntoView(g.r1, g.c1);
    }

    isEmpty(r, c) {
      const cell = this.sheet().cells[M.key(r, c)];
      return !cell || ((cell.v == null || cell.v === '') && !cell.f);
    }

    /** Ctrl+Arrow: jump to the edge of the current data block. */
    jump(r, c, dr, dc) {
      const b = M.usedBounds(this.sheet()) || { r2: 0, c2: 0 };
      const maxR = dr ? Math.max(b.r2 + 1, r) : r, maxC = dc ? Math.max(b.c2 + 1, c) : c;
      const step = (rr, cc) => [rr + dr, cc + dc];
      const inside = (rr, cc) => rr >= 0 && cc >= 0 && rr <= maxR && cc <= maxC;
      let [nr, nc] = step(r, c);
      if (!inside(nr, nc)) return dr > 0 ? [M.MAX_ROWS - 1, c] : dc > 0 ? [r, M.MAX_COLS - 1] : [Math.max(0, nr), Math.max(0, nc)];
      const here = !this.isEmpty(r, c), next = !this.isEmpty(nr, nc);
      if (here && next) {
        while (inside(nr + dr, nc + dc) && !this.isEmpty(nr + dr, nc + dc)) [nr, nc] = step(nr, nc);
        return [nr, nc];
      }
      while (inside(nr, nc) && this.isEmpty(nr, nc)) [nr, nc] = step(nr, nc);
      if (!inside(nr, nc)) return dr > 0 ? [M.MAX_ROWS - 1, c] : dc > 0 ? [r, M.MAX_COLS - 1] : [Math.max(0, nr), Math.max(0, nc)];
      return [nr, nc];
    }

    move(dr, dc, extend, jump) {
      const from = extend ? this.focus : { r: this.sel.ar, c: this.sel.ac };
      let r = from.r, c = from.c;
      if (!extend) {
        // Leave a merged cell from its far edge.
        const m = this.mergeAt(r, c);
        if (m) { if (dr > 0) r = m.r2; if (dc > 0) c = m.c2; }
      }
      if (jump) [r, c] = this.jump(r, c, dr, dc);
      else {
        r += dr; c += dc;
        while (dr && r > 0 && r < M.MAX_ROWS - 1 && this.isRowHidden(r)) r += dr;
        while (dc && c > 0 && c < M.MAX_COLS - 1 && this.isColHidden(c)) c += dc;
      }
      this.select(r, c, extend);
    }

    /** Enter/Tab inside a multi-cell selection cycles through it, like Excel. */
    moveWithin(dr, dc) {
      const s = this.sel;
      const am = this.mergeAt(s.ar, s.ac);
      const single = (s.r1 === s.r2 && s.c1 === s.c2) || (am && am.r1 === s.r1 && am.c1 === s.c1 && am.r2 === s.r2 && am.c2 === s.c2);
      if (single) { this.move(dr, dc); return; }
      let r = s.ar, c = s.ac;
      const m = this.mergeAt(r, c);
      if (dr) {
        r += dr * (m && dr > 0 ? m.r2 - r + 1 : 1);
        if (r > s.r2) { r = s.r1; c = c + 1 > s.c2 ? s.c1 : c + 1; }
        if (r < s.r1) { r = s.r2; c = c - 1 < s.c1 ? s.c2 : c - 1; }
      } else {
        c += dc * (m && dc > 0 ? m.c2 - c + 1 : 1);
        if (c > s.c2) { c = s.c1; r = r + 1 > s.r2 ? s.r1 : r + 1; }
        if (c < s.c1) { c = s.c2; r = r - 1 < s.r1 ? s.r2 : r - 1; }
      }
      const mm = this.mergeAt(r, c);
      if (mm) { r = mm.r1; c = mm.c1; }
      this.sel = Object.assign({}, s, { ar: r, ac: c });
      this.grid.scrollIntoView(r, c);
      this.grid.invalidate();
      this.updateFormulaBar();
      this.updateToolbar();
    }

    /** Selection clamped to the used area (for operations over whole rows/columns). */
    effectiveRange(g = this.sel) {
      const b = M.usedBounds(this.sheet()) || { r2: 0, c2: 0 };
      return { r1: g.r1, c1: g.c1, r2: Math.max(g.r1, Math.min(g.r2, Math.max(b.r2, g.r1))), c2: Math.max(g.c1, Math.min(g.c2, Math.max(b.c2, g.c1))) };
    }

    *cellsIn(g) {
      for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) yield [r, c];
    }

    /* ================================================================== editing */

    canEdit(r, c) {
      if (!this.sheet().cells[M.key(r, c)] && this.engine.isPartOfArray(this.sheetIdx, r, c) && this.engine.value(this.sheetIdx, r, c) != null) {
        toast("This cell is part of an array formula's results and can't be changed.", 'warn');
        return false;
      }
      return true;
    }

    startEdit(text, mode = 'edit', fromFormulaBar = false) {
      const { ar, ac } = this.sel;
      if (!this.canEdit(ar, ac)) return;
      const cell = this.activeCell();
      const original = Fmt.editText(cell);
      this.editing = { r: ar, c: ac, si: this.sheetIdx, mode, original, point: null, fromFormulaBar };
      const value = text == null ? original : text;
      this.editor.value = value;
      this.formulaInput.value = value;
      this.positionEditor();
      this.editor.style.display = 'block';
      const target = fromFormulaBar ? this.formulaInput : this.editor;
      target.focus();
      const end = value.length;
      target.setSelectionRange(end, end);
      this.onEditInput();
      this.updateStatus();
      this.grid.invalidate();
    }

    positionEditor() {
      if (!this.editing) return;
      const { r, c, si } = this.editing;
      if (si !== this.sheetIdx) { this.editor.style.display = 'none'; return; }
      this.editor.style.display = 'block';
      const g = this.grid;
      const rect = g.cellRect(r, c);
      const s = (this.sheet().cells[M.key(r, c)] || {}).s || {};
      const ed = this.editor;
      ed.style.font = g.font(s, this.zoom);
      ed.style.color = s.fc || (s.bg ? root.Grid.contrastText(s.bg, '') : '');
      ed.style.background = s.bg || '';
      ed.classList.toggle('wrap', !!s.wrap);
      ed.style.left = Math.max(g.headerW, rect.x) - 1 + 'px';
      ed.style.top = Math.max(g.headerH, rect.y) - 1 + 'px';
      ed.style.textAlign = s.ha === 'right' ? 'right' : s.ha === 'center' ? 'center' : 'left';
      ed.style.minWidth = rect.w + 2 + 'px';
      ed.style.minHeight = rect.h + 2 + 'px';
      ed.style.lineHeight = Math.max(rect.h - 4, 14 * this.zoom) + 'px';
      if (s.wrap || /\n/.test(ed.value)) ed.style.lineHeight = '1.25';
      this.autoSizeEditor(rect);
    }

    autoSizeEditor(rect) {
      const ed = this.editor, g = this.grid;
      if (!this.editing || this.editing.si !== this.sheetIdx) return;
      rect = rect || g.cellRect(this.editing.r, this.editing.c);
      const maxW = g.vw - Math.max(g.headerW, rect.x) - 4;
      const ctx = g.ctx;
      ctx.font = ed.style.font;
      const lines = ed.value.split('\n');
      const textW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
      const wrap = ed.classList.contains('wrap');
      ed.style.width = Math.min(maxW, Math.max(rect.w + 2, wrap ? rect.w + 2 : textW)) + 'px';
      ed.style.height = 'auto';
      ed.style.height = Math.min(g.vh - rect.y - 4, Math.max(rect.h + 2, ed.scrollHeight + 2)) + 'px';
    }

    commitEdit(dr = 0, dc = 0, fillSelection = false) {
      const ed = this.editing;
      if (!ed) return;
      const text = (ed.fromFormulaBar ? this.formulaInput : this.editor).value;
      this.endEditUI();
      if (ed.si !== this.sheetIdx) this.switchSheet(ed.si);
      if (text !== ed.original || fillSelection) {
        const targets = fillSelection ? [...this.cellsIn(this.effectiveRange())] : [[ed.r, ed.c]];
        this.begin('Typing');
        for (const [r, c] of targets) {
          const mm = this.mergeAt(r, c);
          if (mm && (mm.r1 !== r || mm.c1 !== c)) continue;
          if (fillSelection && (r !== ed.r || c !== ed.c) && text[0] === '=') this.applyInput(r, c, '=' + FU.shiftFormula(text.slice(1), r - ed.r, c - ed.c));
          else this.applyInput(r, c, text);
        }
        this.commit();
      }
      if (dr || dc) { if (this.sel.r1 !== this.sel.r2 || this.sel.c1 !== this.sel.c2) this.moveWithin(dr, dc); else this.move(dr, dc); }
      this.focusGrid();
    }

    applyInput(r, c, text) {
      const sh = this.sheet();
      const old = sh.cells[M.key(r, c)];
      const s = old && old.s ? clone(old.s) : undefined;
      const p = Fmt.parseInput(text, s && s.nf);
      const cell = s ? { s } : {};
      if (p.f != null) {
        let f = p.f;
        // Close unbalanced parentheses like Excel does.
        let depth = 0, inStr = false;
        for (const ch of f) { if (ch === '"') inStr = !inStr; else if (!inStr) depth += ch === '(' ? 1 : ch === ')' ? -1 : 0; }
        if (depth > 0 && !inStr) f += ')'.repeat(depth);
        cell.f = f;
        cell.v = null;
      } else {
        cell.v = p.v;
        if (p.nf && (!cell.s || !cell.s.nf || cell.s.nf === 'General')) cell.s = Object.assign(cell.s || {}, { nf: p.nf });
      }
      this.putCell(this.sheetIdx, r, c, cell);
    }

    cancelEdit() {
      if (!this.editing) return;
      this.endEditUI();
      this.updateFormulaBar();
      this.focusGrid();
    }

    endEditUI() {
      this.editing = null;
      this.editor.style.display = 'none';
      this.editor.value = '';
      this.refHighlights = [];
      this.hideAutocomplete();
      this.grid.invalidate();
      this.updateStatus();
    }

    activeInput() { return this.editing && this.editing.fromFormulaBar ? this.formulaInput : this.editor; }

    /** Sync editor ↔ formula bar, highlight references, show function suggestions. */
    onEditInput(src) {
      if (!this.editing) return;
      const input = src || this.activeInput();
      const other = input === this.editor ? this.formulaInput : this.editor;
      if (other.value !== input.value) other.value = input.value;
      this.autoSizeEditor();
      this.updateRefHighlights(input.value);
      this.updateAutocomplete(input);
    }

    updateRefHighlights(text) {
      this.refHighlights = [];
      if (text && text[0] === '=') {
        const refs = FU.scanRefs(text.slice(1));
        const cur = this.sheet().name.toLowerCase();
        let i = 0;
        const point = this.editing && this.editing.point;
        for (const t of refs) {
          const color = REF_COLORS[i++ % REF_COLORS.length];
          if (t.sheet && t.sheet.toLowerCase() !== cur) continue;
          const g = FU.tokenRect(t);
          g.r2 = Math.min(g.r2, this.grid.extentRows); g.c2 = Math.min(g.c2, this.grid.extentCols);
          this.refHighlights.push({ g, color, active: point && point.start === t.start + 1 });
        }
      }
      this.grid.invalidate();
    }

    /** True when the caret is at a spot where clicking a cell should insert a reference. */
    pointable() {
      if (!this.editing) return false;
      const input = this.activeInput();
      const v = input.value;
      if (v[0] !== '=') return false;
      const pos = input.selectionStart;
      const p = this.editing.point;
      if (p && pos === p.end) return true;
      const before = v.slice(0, pos).replace(/\s+$/, '');
      return /[=(,+\-*/^&<>:;%{]$/.test(before);
    }

    insertPointRef(r1, c1, r2, c2, sheetName) {
      const input = this.activeInput();
      const ed = this.editing;
      const g = { r1: Math.min(r1, r2), c1: Math.min(c1, c2), r2: Math.max(r1, r2), c2: Math.max(c1, c2) };
      const ref = (sheetName ? M.quoteSheet(sheetName) + '!' : '') + M.rangeStr(g);
      const v = input.value;
      let start, end;
      if (ed.point && input.selectionStart === ed.point.end) { start = ed.point.start; end = ed.point.end; }
      else { start = input.selectionStart; end = input.selectionEnd; }
      input.value = v.slice(0, start) + ref + v.slice(end);
      const caret = start + ref.length;
      input.setSelectionRange(caret, caret);
      ed.point = { start, end: caret, r: r1, c: c1, r2, c2 };
      this.onEditInput(input);
    }

    /** F4: cycle A1 → $A$1 → A$1 → $A1 for the reference at the caret. */
    cycleAbsolute() {
      const input = this.activeInput();
      const v = input.value;
      if (v[0] !== '=') return;
      const pos = input.selectionStart;
      const refs = FU.scanRefs(v.slice(1));
      const t = refs.find((x) => pos >= x.start + 1 && pos <= x.end + 1);
      if (!t) return;
      const prefix = t.text.slice(0, t.text.indexOf('!') + 1);
      const cycle = (cellTxt) => {
        const p = FU.parseCellToken(cellTxt);
        const state = (p.absC ? 2 : 0) + (p.absR ? 1 : 0); // 0 A1, 3 $A$1, 1 A$1, 2 $A1
        const next = { 0: 3, 3: 1, 1: 2, 2: 0 }[state];
        return (next & 2 ? '$' : '') + M.colName(p.c) + (next & 1 ? '$' : '') + (p.r + 1);
      };
      if (t.kind !== 'cell' && t.kind !== 'range') return;
      const rep = prefix + cycle(t.a) + (t.b ? ':' + cycle(t.b) : '');
      input.value = v.slice(0, t.start + 1) + rep + v.slice(t.end + 1);
      const caret = t.start + 1 + rep.length;
      input.setSelectionRange(caret, caret);
      this.onEditInput(input);
    }

    /* ------------------------------------------------------- autocomplete */

    updateAutocomplete(input) {
      const v = input.value;
      const pos = input.selectionStart;
      if (v[0] !== '=' || pos !== input.selectionEnd) return this.hideAutocomplete();
      const m = /(^|[=(,+\-*/^&<>:;%\s{])([A-Za-z][A-Za-z0-9.]*)$/.exec(v.slice(0, pos));
      if (!m || /^[A-Za-z]{1,3}\d+$/.test(m[2])) return this.hideAutocomplete();
      const q = m[2].toUpperCase();
      const list = this.functionNames.filter((n) => n.startsWith(q)).slice(0, 12);
      if (!list.length || (list.length === 1 && list[0] === q && v[pos] === '(')) return this.hideAutocomplete();
      const ac = this.autocomplete;
      ac.innerHTML = '';
      list.forEach((n, i) => {
        const item = el('div', { class: 'ac-item' + (i === 0 ? ' sel' : '') }, n);
        item.addEventListener('mousedown', (e) => { e.preventDefault(); this.acceptAutocomplete(n); });
        ac.append(item);
      });
      this.acToken = { start: pos - m[2].length, end: pos };
      const r = input.getBoundingClientRect(), wrap = this.grid.wrap.getBoundingClientRect();
      ac.style.left = Math.max(0, r.left - wrap.left) + 'px';
      ac.style.top = r.bottom - wrap.top + 2 + 'px';
      if (input === this.formulaInput) ac.style.top = '2px';
      ac.classList.remove('hidden');
    }

    hideAutocomplete() { this.autocomplete.classList.add('hidden'); this.acToken = null; }
    acOpen() { return !this.autocomplete.classList.contains('hidden'); }

    acMove(d) {
      const items = [...this.autocomplete.children];
      let i = items.findIndex((x) => x.classList.contains('sel'));
      items.forEach((x) => x.classList.remove('sel'));
      i = (i + d + items.length) % items.length;
      items[i].classList.add('sel');
      items[i].scrollIntoView({ block: 'nearest' });
    }

    acceptAutocomplete(name) {
      const input = this.activeInput();
      const t = this.acToken;
      if (!t) return;
      name = name || this.autocomplete.querySelector('.sel').textContent;
      const v = input.value;
      const hasParen = v[t.end] === '(';
      input.value = v.slice(0, t.start) + name + (hasParen ? '' : '(') + v.slice(t.end);
      const caret = t.start + name.length + 1;
      input.setSelectionRange(caret, caret);
      this.hideAutocomplete();
      this.onEditInput(input);
    }

    /* =========================================================== bind: editor */

    bindEditor() {
      for (const input of [this.editor, this.formulaInput]) {
        input.addEventListener('input', () => {
          if (this.editing) { this.editing.point = null; this.onEditInput(input); }
        });
        input.addEventListener('keydown', (e) => this.onEditorKey(e, input));
        input.addEventListener('click', () => this.editing && this.updateAutocomplete(input));
      }
      this.formulaInput.addEventListener('focus', () => {
        if (!this.editing) this.startEdit(null, 'edit', true);
        else if (!this.editing.fromFormulaBar) { this.editing.fromFormulaBar = true; }
      });
      this.editor.addEventListener('focus', () => { if (this.editing) this.editing.fromFormulaBar = false; });
    }

    onEditorKey(e, input) {
      if (!this.editing) return;
      const ed = this.editing;
      const k = e.key;
      if (this.acOpen()) {
        if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); this.acMove(k === 'ArrowDown' ? 1 : -1); return; }
        if (k === 'Tab' || (k === 'Enter' && !e.altKey && !e.ctrlKey)) { e.preventDefault(); this.acceptAutocomplete(); return; }
        if (k === 'Escape') { e.preventDefault(); this.hideAutocomplete(); return; }
      }
      if (k === 'Enter' && (e.altKey || (e.shiftKey && e.ctrlKey))) {
        e.preventDefault();
        const s = input.selectionStart;
        input.setRangeText('\n', s, input.selectionEnd, 'end');
        this.onEditInput(input);
        return;
      }
      if (k === 'Enter') { e.preventDefault(); this.commitEdit(e.ctrlKey ? 0 : e.shiftKey ? -1 : 1, 0, e.ctrlKey); return; }
      if (k === 'Tab') { e.preventDefault(); this.commitEdit(0, e.shiftKey ? -1 : 1); return; }
      if (k === 'Escape') { e.preventDefault(); this.cancelEdit(); return; }
      if (k === 'F4') { e.preventDefault(); this.cycleAbsolute(); return; }
      if (k === 'F2') { e.preventDefault(); ed.mode = ed.mode === 'edit' ? 'enter' : 'edit'; this.updateStatus(); return; }
      if (k.startsWith('Arrow') && !e.altKey && !e.ctrlKey && (ed.mode === 'enter' || ed.point) && input === this.editor) {
        const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
        if (this.pointable()) {
          e.preventDefault();
          const p = ed.point;
          let r, c, r2, c2;
          if (p && e.shiftKey) { r = p.r; c = p.c; r2 = Math.max(0, p.r2 + d[0]); c2 = Math.max(0, p.c2 + d[1]); }
          else { const base = p ? { r: p.r2, c: p.c2 } : { r: ed.r, c: ed.c }; r = r2 = Math.max(0, base.r + d[0]); c = c2 = Math.max(0, base.c + d[1]); }
          this.insertPointRef(r, c, r2, c2);
          this.grid.scrollIntoView(r2, c2);
          return;
        }
        if (ed.mode === 'enter') { e.preventDefault(); this.commitEdit(d[0], d[1]); return; }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (k === 'z' || k === 'y')) return; // native text undo
      if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'S')) { e.preventDefault(); this.commitEdit(); this.run(e.shiftKey ? 'save-as' : 'save'); return; }
      if ((e.ctrlKey || e.metaKey) && k === ';') { e.preventDefault(); this.insertDateTime(e.shiftKey ? 'time' : 'date'); return; }
      e.stopPropagation();
    }

    /* ============================================================ bind: mouse */

    gridPoint(e) {
      const r = this.grid.wrap.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    bindMouse() {
      const sc = this.scroller;
      sc.addEventListener('mousedown', (e) => this.onMouseDown(e));
      sc.addEventListener('dblclick', (e) => this.onDblClick(e));
      sc.addEventListener('contextmenu', (e) => this.onContextMenu(e));
      sc.addEventListener('mousemove', (e) => {
        if (this.dragging) return;
        const { x, y } = this.gridPoint(e);
        if (x > this.grid.vw || y > this.grid.vh) { sc.style.cursor = 'default'; return; }
        const h = this.grid.hit(x, y);
        sc.style.cursor = h.resize != null ? (h.type === 'colHeader' ? 'col-resize' : 'row-resize')
          : h.fill ? 'crosshair' : h.filterBtn ? 'pointer' : h.type === 'cell' ? (this.formatPainter ? 'copy' : 'cell') : h.type === 'colHeader' ? 's-resize' : h.type === 'rowHeader' ? 'e-resize' : 'default';
        if (h.type === 'colHeader' && h.resize == null) sc.style.cursor = 'default';
        if (h.type === 'rowHeader' && h.resize == null) sc.style.cursor = 'default';
      });
      sc.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          this.setZoom(this.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
        }
      }, { passive: false });
    }

    onMouseDown(e) {
      const { x, y } = this.gridPoint(e);
      if (x > this.grid.vw || y > this.grid.vh) return; // scrollbars
      const h = this.grid.hit(x, y);
      if (e.button === 2) {
        if (h.type === 'cell' && !(h.r >= this.sel.r1 && h.r <= this.sel.r2 && h.c >= this.sel.c1 && h.c <= this.sel.c2)) {
          if (this.editing) this.commitEdit();
          this.select(h.r, h.c);
        }
        if (h.type === 'colHeader' && !(h.c >= this.sel.c1 && h.c <= this.sel.c2 && this.sel.r1 === 0 && this.sel.r2 === M.MAX_ROWS - 1)) this.selectCols(h.c, h.c);
        if (h.type === 'rowHeader' && !(h.r >= this.sel.r1 && h.r <= this.sel.r2 && this.sel.c1 === 0 && this.sel.c2 === M.MAX_COLS - 1)) this.selectRows(h.r, h.r);
        return;
      }
      if (e.button !== 0) return;
      e.preventDefault();

      if (this.editing) {
        if (h.type === 'cell' && this.pointable()) {
          const sheetName = this.editing.si !== this.sheetIdx ? this.sheet().name : null;
          this.insertPointRef(h.r, h.c, h.r, h.c, sheetName);
          this.dragPoint(h.r, h.c, sheetName);
          return;
        }
        this.commitEdit();
      }
      this.focusGrid();

      if (h.type === 'corner') { this.selectRange({ r1: 0, c1: 0, r2: M.MAX_ROWS - 1, c2: M.MAX_COLS - 1 }); return; }
      if (h.resize != null) { this.dragResize(h, e); return; }
      if (h.type === 'colHeader') {
        const a = e.shiftKey ? this.sel.ac : h.c;
        this.selectCols(a, h.c);
        this.dragHeaders('col', a);
        return;
      }
      if (h.type === 'rowHeader') {
        const a = e.shiftKey ? this.sel.ar : h.r;
        this.selectRows(a, h.r);
        this.dragHeaders('row', a);
        return;
      }
      if (h.filterBtn) {
        const b = this.grid.filterButtonRect(h.r, h.c);
        const wr = this.grid.wrap.getBoundingClientRect();
        root.Dialogs.filterPopup(this, h.c, wr.left + b.x, wr.top + b.y + b.h + 2);
        return;
      }
      if (h.fill) { this.dragFill(); return; }
      this.select(h.r, h.c, e.shiftKey);
      this.dragSelect();
    }

    /** Generic drag loop with auto-scroll near the edges. */
    dragLoop(onMove, onUp) {
      this.dragging = true;
      let last = null, timer = null;
      const step = () => {
        if (!last) return;
        const g = this.grid;
        let dx = 0, dy = 0;
        if (last.x < g.headerW) dx = -20; else if (last.x > g.vw) dx = 20;
        if (last.y < g.headerH) dy = -20; else if (last.y > g.vh) dy = 20;
        if (dx || dy) { this.scroller.scrollLeft += dx; this.scroller.scrollTop += dy; onMove(last); }
      };
      const move = (ev) => { last = this.gridPoint(ev); onMove(last); };
      const up = () => {
        clearInterval(timer);
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        this.dragging = false;
        if (onUp) onUp(last);
      };
      timer = setInterval(step, 40);
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    }

    clampPoint(p) {
      const g = this.grid;
      return { x: Math.max(g.headerW + 1, Math.min(g.vw - 1, p.x)), y: Math.max(g.headerH + 1, Math.min(g.vh - 1, p.y)) };
    }

    dragSelect() {
      this.dragLoop((p) => {
        const q = this.clampPoint(p);
        const r = this.grid.rowAtY(q.y), c = this.grid.colAtX(q.x);
        if (r !== this.focus.r || c !== this.focus.c) {
          const a = { r: this.sel.ar, c: this.sel.ac };
          this.setSelection({ r1: Math.min(a.r, r), c1: Math.min(a.c, c), r2: Math.max(a.r, r), c2: Math.max(a.c, c) }, a.r, a.c, { r, c });
        }
      }, () => { if (this.formatPainter) this.applyFormatPainter(); });
    }

    dragPoint(r0, c0, sheetName) {
      this.dragLoop((p) => {
        const q = this.clampPoint(p);
        const r = this.grid.rowAtY(q.y), c = this.grid.colAtX(q.x);
        const pt = this.editing && this.editing.point;
        if (pt && (pt.r2 !== r || pt.c2 !== c)) {
          this.activeInput().setSelectionRange(pt.end, pt.end);
          this.insertPointRef(r0, c0, r, c, sheetName);
          this.editing.point.r = r0; this.editing.point.c = c0;
        }
      }, () => this.activeInput().focus());
      setTimeout(() => this.activeInput().focus());
    }

    selectCols(a, b) {
      this.setSelection({ r1: 0, c1: Math.min(a, b), r2: M.MAX_ROWS - 1, c2: Math.max(a, b) }, 0, a, { r: M.MAX_ROWS - 1, c: b });
    }

    selectRows(a, b) {
      this.setSelection({ r1: Math.min(a, b), c1: 0, r2: Math.max(a, b), c2: M.MAX_COLS - 1 }, a, 0, { r: b, c: M.MAX_COLS - 1 });
    }

    dragHeaders(kind, anchor) {
      this.dragLoop((p) => {
        const q = this.clampPoint(p);
        if (kind === 'col') this.selectCols(anchor, this.grid.colAtX(q.x));
        else this.selectRows(anchor, this.grid.rowAtY(q.y));
      });
    }

    dragResize(h, e) {
      const isCol = h.type === 'colHeader';
      const idx = h.resize;
      const sh = this.sheet();
      const startSize = isCol ? this.grid.colW(idx) / this.zoom : this.grid.rowH(idx) / this.zoom;
      const start = isCol ? e.clientX : e.clientY;
      // Resize every selected column/row when the dragged one is part of a full selection.
      const multi = isCol ? (this.sel.r1 === 0 && this.sel.r2 === M.MAX_ROWS - 1 && idx >= this.sel.c1 && idx <= this.sel.c2)
        : (this.sel.c1 === 0 && this.sel.c2 === M.MAX_COLS - 1 && idx >= this.sel.r1 && idx <= this.sel.r2);
      const prop = isCol ? 'colWidths' : 'rowHeights';
      const original = clone(sh[prop]);
      const hiddenProp = isCol ? 'hiddenCols' : 'hiddenRows';
      const originalHidden = clone(sh[hiddenProp] || {});
      let size = startSize;
      const move = (ev) => {
        size = Math.max(0, Math.round(startSize + ((isCol ? ev.clientX : ev.clientY) - start) / this.zoom));
        const next = Object.assign({}, original);
        const targets = multi ? (isCol ? range(this.sel.c1, this.sel.c2) : range(this.sel.r1, this.sel.r2)) : [idx];
        for (const t of targets) next[t] = Math.max(isCol ? 2 : 4, size);
        sh[prop] = next;
        this.grid.rebuildAxes();
        this.grid.invalidate();
        this.charts.position();
      };
      document.body.style.cursor = isCol ? 'col-resize' : 'row-resize';
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        document.body.style.cursor = '';
        const final = sh[prop];
        sh[prop] = original;
        if (JSON.stringify(final) === JSON.stringify(original)) return;
        const patch = { [prop]: final };
        if (size < 3) {
          // Dragging to (almost) zero hides the column/row, like Excel.
          const hidden = Object.assign({}, originalHidden);
          const targets = multi ? (isCol ? range(this.sel.c1, this.sel.c2) : range(this.sel.r1, this.sel.r2)) : [idx];
          for (const t of targets) { hidden[t] = true; delete final[t]; }
          patch[hiddenProp] = hidden;
          patch[prop] = Object.assign({}, original);
        }
        this.setSheetProps(patch, isCol ? 'Resize column' : 'Resize row');
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    }

    dragFill() {
      const src = { r1: this.sel.r1, c1: this.sel.c1, r2: this.sel.r2, c2: this.sel.c2 };
      let target = null;
      this.dragLoop((p) => {
        const q = this.clampPoint(p);
        const r = this.grid.rowAtY(q.y), c = this.grid.colAtX(q.x);
        const down = r - src.r2, up = src.r1 - r, right = c - src.c2, left = src.c1 - c;
        const best = Math.max(down, up, right, left);
        if (best <= 0) { target = null; }
        else if (best === down) target = { r1: src.r1, c1: src.c1, r2: r, c2: src.c2 };
        else if (best === up) target = { r1: r, c1: src.c1, r2: src.r2, c2: src.c2 };
        else if (best === right) target = { r1: src.r1, c1: src.c1, r2: src.r2, c2: c };
        else target = { r1: src.r1, c1: c, r2: src.r2, c2: src.c2 };
        this.fillPreview = target;
        this.grid.invalidate();
      }, () => {
        this.fillPreview = null;
        if (target) this.fillRange(src, target);
        this.grid.invalidate();
      });
    }

    onDblClick(e) {
      const { x, y } = this.gridPoint(e);
      const h = this.grid.hit(x, y);
      if (h.resize != null) {
        if (h.type === 'colHeader') this.autofitColumns(this.sel.r1 === 0 && this.sel.r2 === M.MAX_ROWS - 1 && h.resize >= this.sel.c1 && h.resize <= this.sel.c2 ? range(this.sel.c1, this.sel.c2) : [h.resize]);
        else this.autofitRows([h.resize]);
        return;
      }
      if (h.fill) { this.fillDownToAdjacent(); return; }
      if (h.type === 'cell' && !h.filterBtn) this.startEdit(null, 'edit');
    }

    onContextMenu(e) {
      e.preventDefault();
      const { x, y } = this.gridPoint(e);
      const h = this.grid.hit(x, y);
      this.cellMenu(e.clientX, e.clientY, h.type);
    }

    /* ========================================================= bind: keyboard */

    focusGrid() {
      if (document.activeElement !== this.scroller) this.scroller.focus({ preventScroll: true });
    }

    bindKeyboard() {
      document.addEventListener('keydown', (e) => {
        if (root.UI.isDialogOpen()) return;
        const t = e.target;
        if (t !== this.scroller && t !== document.body && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
        if (this.editing) return;
        this.onGridKey(e);
      });
      document.addEventListener('paste', (e) => {
        if (this.editing || (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target !== this.scroller) return;
        e.preventDefault();
        this.pasteFrom(e.clipboardData.getData('text/plain'), e.clipboardData.getData('text/html'), false);
      });
      document.addEventListener('copy', (e) => {
        if (this.editing || ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target !== this.scroller)) return;
        e.preventDefault();
        this.copySelection(false, e.clipboardData);
      });
      document.addEventListener('cut', (e) => {
        if (this.editing || ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target !== this.scroller)) return;
        e.preventDefault();
        this.copySelection(true, e.clipboardData);
      });
    }

    onGridKey(e) {
      const k = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

      if (this.charts.selected && (k === 'Delete' || k === 'Backspace')) { e.preventDefault(); this.charts.remove(this.charts.selected); return; }

      if (arrows[k] && !e.altKey) { e.preventDefault(); this.move(arrows[k][0], arrows[k][1], shift, ctrl); return; }

      const combo = (ctrl ? 'C-' : '') + (e.altKey ? 'A-' : '') + (shift ? 'S-' : '') + (k.length === 1 ? k.toLowerCase() : k);
      const map = {
        'Enter': () => this.moveWithin(1, 0), 'S-Enter': () => this.moveWithin(-1, 0),
        'Tab': () => this.moveWithin(0, 1), 'S-Tab': () => this.moveWithin(0, -1),
        'F2': () => this.startEdit(null, 'edit'),
        'Delete': () => this.run('clear-contents'),
        'Backspace': () => { this.run('clear-contents'); this.startEdit('', 'enter'); },
        'Escape': () => { if (this.clipboard) { this.clipboard.showMarquee = false; this.stopMarch(); this.grid.invalidate(); } if (this.formatPainter) { this.formatPainter = null; this.updateToolbar(); } },
        'Home': () => this.select(this.sel.ar, 0), 'S-Home': () => this.select(this.focus.r, 0, true),
        'C-Home': () => this.select(0, 0), 'C-S-Home': () => this.select(0, 0, true),
        'End': () => this.move(0, 1, false, true),
        'C-End': () => { const b = M.usedBounds(this.sheet()) || { r2: 0, c2: 0 }; this.select(b.r2, b.c2); },
        'C-S-End': () => { const b = M.usedBounds(this.sheet()) || { r2: 0, c2: 0 }; this.select(b.r2, b.c2, true); },
        'PageDown': () => this.page(1, shift), 'PageUp': () => this.page(-1, shift), 'S-PageDown': () => this.page(1, true), 'S-PageUp': () => this.page(-1, true),
        'A-PageDown': () => this.pageH(1), 'A-PageUp': () => this.pageH(-1),
        'C-PageDown': () => this.switchSheet(Math.min(this.doc.sheets.length - 1, this.sheetIdx + 1)),
        'C-PageUp': () => this.switchSheet(Math.max(0, this.sheetIdx - 1)),
        'S- ': () => this.selectRows(this.sel.r1, this.sel.r2), 'C- ': () => this.selectCols(this.sel.c1, this.sel.c2),
        'C-a': () => this.run('select-all'), 'C-z': () => this.undo(), 'C-y': () => this.redo(), 'C-S-z': () => this.redo(),
        'C-c': () => this.run('copy'), 'C-x': () => this.run('cut'), 'C-v': () => this.run('paste'), 'C-S-v': () => this.run('paste-values'),
        'C-d': () => this.run('fill-down'), 'C-r': () => this.run('fill-right'),
        'C-b': () => this.run('bold'), 'C-i': () => this.run('italic'), 'C-u': () => this.run('underline'), 'C-5': () => this.run('strike'),
        'C-1': () => this.run('format-cells'), 'C-\\': () => this.run('clear-formats'),
        'C-S-!': () => this.run('nf', '#,##0.00'), 'C-S-1': () => this.run('nf', '#,##0.00'),
        'C-S-@': () => this.run('nf', 'hh:mm:ss'), 'C-S-2': () => this.run('nf', 'hh:mm:ss'),
        'C-S-#': () => this.run('nf', 'yyyy-mm-dd'), 'C-S-3': () => this.run('nf', 'yyyy-mm-dd'),
        'C-S-$': () => this.run('nf', '"$"#,##0.00'), 'C-S-4': () => this.run('nf', '"$"#,##0.00'),
        'C-S-%': () => this.run('nf', '0.00%'), 'C-S-5': () => this.run('nf', '0.00%'),
        'C-;': () => this.insertDateTime('date'), 'C-S-:': () => this.insertDateTime('time'), 'C-S-;': () => this.insertDateTime('time'),
        'A-=': () => this.run('autosum'), 'S-F3': () => this.run('insert-function'), 'S-F11': () => this.run('add-sheet'),
        'C-f': () => this.run('find'), 'C-h': () => this.run('replace'), 'C-g': () => this.run('goto'),
        'C-S-l': () => this.run('toggle-filter'), 'C-`': () => this.run('toggle-formulas'), 'F9': () => this.run('recalc'),
        'C-=': () => this.run('zoom-in'), 'C-+': () => this.run('zoom-in'), 'C-S-+': () => this.run('zoom-in'), 'C--': () => this.run('zoom-out'), 'C-0': () => this.run('zoom-reset'),
        'C-s': () => this.run('save'), 'C-S-s': () => this.run('save-as'), 'C-o': () => this.run('open'), 'C-p': () => this.run('print'),
        'F1': () => this.run('shortcuts'), 'ContextMenu': () => { const r = this.grid.cellRect(this.sel.ar, this.sel.ac); const w = this.grid.wrap.getBoundingClientRect(); this.cellMenu(w.left + r.x + r.w / 2, w.top + r.y + r.h); },
        'S-F10': () => map.ContextMenu(),
      };
      const fn = map[combo];
      if (fn) { e.preventDefault(); fn(); return; }
      if (ctrl || e.altKey) return;
      if (k === 'Process' || e.isComposing) { this.startEdit('', 'enter'); return; } // IME input goes straight into the editor
      if (k.length === 1) { e.preventDefault(); this.startEdit(k, 'enter'); }
    }

    page(dir, extend) {
      const g = this.grid;
      const rows = Math.max(1, Math.floor((g.vh - g.headerH) / g.rowAxis.def) - 1);
      const from = extend ? this.focus : { r: this.sel.ar, c: this.sel.ac };
      this.scroller.scrollTop += dir * rows * g.rowAxis.def;
      this.select(Math.max(0, from.r + dir * rows), from.c, extend);
    }

    pageH(dir) {
      const g = this.grid;
      const cols = Math.max(1, Math.floor((g.vw - g.headerW) / g.colAxis.def) - 1);
      this.scroller.scrollLeft += dir * cols * g.colAxis.def;
      this.select(this.sel.ar, Math.max(0, this.sel.ac + dir * cols));
    }

    onGridScroll() {
      if (this.editing) this.positionEditor();
      this.charts.position();
      if (!this.acOpen()) return;
      this.hideAutocomplete();
    }

    afterRender() { /* hook for overlays that track the grid */ }

    setZoom(z) {
      z = Math.max(0.25, Math.min(4, Math.round(z * 100) / 100));
      if (z === this.zoom) return;
      const g = this.grid;
      const cx = (this.scroller.scrollLeft) / this.zoom, cy = this.scroller.scrollTop / this.zoom;
      this.zoom = z;
      g.rebuildAxes();
      this.scroller.scrollLeft = cx * z;
      this.scroller.scrollTop = cy * z;
      g.invalidate(true);
      this.charts.rebuild();
      if (this.editing) this.positionEditor();
      const zs = document.getElementById('tb-zoom');
      if (![...zs.options].some((o) => +o.value === z)) zs.append(el('option', { value: z }, Math.round(z * 100) + '%'));
      zs.value = String(z);
      this.updateStatus();
    }

    /* ================================================== formula bar & status */

    updateFormulaBar() {
      const s = this.sel;
      const multi = s.r1 !== s.r2 || s.c1 !== s.c2;
      if (document.activeElement !== this.nameBox) {
        const m = this.mergeAt(s.ar, s.ac);
        const isMergeOnly = m && m.r1 === s.r1 && m.c1 === s.c1 && m.r2 === s.r2 && m.c2 === s.c2;
        if (this.dragging && multi && !isMergeOnly) this.nameBox.value = `${s.r2 - s.r1 + 1}R × ${s.c2 - s.c1 + 1}C`;
        else this.nameBox.value = M.addr(s.ar, s.ac);
      }
      if (!this.editing) this.formulaInput.value = Fmt.editText(this.activeCell());
    }

    updateStatus() {
      const st = document.getElementById('status');
      const parts = [];
      const mode = this.editing ? (this.pointable() ? 'Point' : this.editing.mode === 'enter' ? 'Enter' : 'Edit') : this.formatPainter ? 'Paint format' : 'Ready';
      const s = this.sel;
      if (s.r1 !== s.r2 || s.c1 !== s.c2) {
        let sum = 0, count = 0, nums = 0, min = Infinity, max = -Infinity;
        const sh = this.sheet();
        const g = this.effectiveRange();
        const area = (g.r2 - g.r1 + 1) * (g.c2 - g.c1 + 1);
        const visit = (r, c) => {
          if (this.isRowHidden(r)) return;
          const v = this.engine.value(this.sheetIdx, r, c);
          if (v == null || v === '') return;
          count++;
          if (typeof v === 'number') { nums++; sum += v; if (v < min) min = v; if (v > max) max = v; }
        };
        if (area > 200000) {
          for (const k in sh.cells) { const [r, c] = M.parseKey(k); if (r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2) visit(r, c); }
        } else for (const [r, c] of this.cellsIn(g)) visit(r, c);
        const f = (n) => Fmt.formatValue(Number(n.toPrecision(12)), (this.activeCell() && this.activeCell().s && this.activeCell().s.nf) || null);
        if (nums) parts.push(`Sum: <b>${esc(f(sum))}</b>`, `Average: <b>${esc(f(sum / nums))}</b>`, `Min: <b>${esc(f(min))}</b>`, `Max: <b>${esc(f(max))}</b>`);
        parts.push(`Count: <b>${count}</b>`);
      }
      parts.push(`<span>${mode}</span>`);
      st.innerHTML = parts.join('');
    }

    updateToolbar() {
      const cell = this.activeCell();
      const s = (cell && cell.s) || {};
      document.querySelectorAll('[data-toggle]').forEach((b) => b.classList.toggle('on', !!s[b.dataset.toggle]));
      document.querySelectorAll('[data-align]').forEach((b) => b.classList.toggle('on', (s.ha || '') === b.dataset.align));
      const font = document.getElementById('tb-font');
      const ff = s.ff || 'Carlito';
      if (![...font.options].some((o) => o.value === ff)) font.append(el('option', {}, ff));
      font.value = ff;
      const size = document.getElementById('tb-size');
      const fs = String(s.fs || 11);
      if (![...size.options].some((o) => o.value === fs)) size.append(el('option', {}, fs));
      size.value = fs;
      const nfSel = document.getElementById('tb-nf');
      const nf = s.nf || 'General';
      nfSel.value = [...nfSel.options].some((o) => o.value === nf) ? nf : '__custom';
      const m = this.mergeAt(this.sel.ar, this.sel.ac);
      document.querySelector('[data-cmd="merge-toggle"]').classList.toggle('on', !!m);
      document.querySelector('[data-cmd="toggle-filter"]').classList.toggle('on', !!this.sheet().filter);
      document.querySelector('[data-cmd="format-painter"]').classList.toggle('on', !!this.formatPainter);
    }

    /* ============================================================ bind: chrome */

    bindChrome() {
      document.querySelectorAll('#toolbar [data-cmd]').forEach((b) => b.addEventListener('click', (e) => { this.run(b.dataset.cmd, e); if (!/painter|menu|apply-/.test(b.dataset.cmd)) this.focusGrid(); }));
      document.querySelectorAll('#toolbar [data-nf]').forEach((b) => b.addEventListener('click', () => { this.run('nf', b.dataset.nf); this.focusGrid(); }));
      document.querySelectorAll('#toolbar button').forEach((b) => b.addEventListener('mousedown', (e) => e.preventDefault()));
      const on = (id, ev, fn) => document.getElementById(id).addEventListener(ev, fn);
      on('tb-font', 'change', (e) => { this.applyStyle({ ff: e.target.value === 'Carlito' ? null : e.target.value }, 'Font'); this.focusGrid(); });
      on('tb-size', 'change', (e) => { const v = +e.target.value; this.applyStyle({ fs: v === 11 ? null : v }, 'Font size'); this.focusGrid(); });
      on('tb-nf', 'change', (e) => { if (e.target.value === '__custom') this.run('nf-custom'); else this.run('nf', e.target.value); this.focusGrid(); });
      on('tb-zoom', 'change', (e) => { this.setZoom(+e.target.value); this.focusGrid(); });
      on('fx-btn', 'click', () => this.run('insert-function'));
      on('fb-expand', 'click', () => {
        const fb = document.getElementById('formula-bar');
        fb.classList.toggle('expanded');
        document.getElementById('fb-expand').textContent = fb.classList.contains('expanded') ? '⌃' : '⌄';
      });
      on('add-sheet', 'click', () => this.run('add-sheet'));
      on('sheet-list', 'click', (e) => {
        const r = e.target.getBoundingClientRect();
        showMenu(this.doc.sheets.map((s, i) => ({ label: s.name, icon: i === this.sheetIdx ? '✓' : '', action: () => this.switchSheet(i) })), r.left, r.top - 8 - this.doc.sheets.length * 28);
      });

      // Name box: type a reference (A1, B2:D9, Sheet2!C3) and press Enter.
      this.nameBox.addEventListener('focus', () => this.nameBox.select());
      this.nameBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.goTo(this.nameBox.value); this.focusGrid(); }
        if (e.key === 'Escape') { this.updateFormulaBar(); this.focusGrid(); }
        e.stopPropagation();
      });
      this.nameBox.addEventListener('blur', () => this.updateFormulaBar());

      // Drag and drop files to open them.
      let dragDepth = 0;
      window.addEventListener('dragenter', (e) => { if (e.dataTransfer.types.includes('Files')) { dragDepth++; document.body.classList.add('dragging'); } });
      window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
      window.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
      window.addEventListener('drop', (e) => {
        dragDepth = 0;
        document.body.classList.remove('dragging');
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        for (const f of e.dataTransfer.files) { const p = api.pathForFile(f); if (p) api.openPath(p); }
      });

      api.onMenu((cmd, arg) => this.run(cmd, arg));
      api.onLoad((p) => this.loadDoc(p.doc, p.filePath, p.warnings));
      window.addEventListener('blur', () => { if (this.dragging) document.dispatchEvent(new MouseEvent('mouseup')); });
    }

    goTo(text) {
      text = String(text || '').trim();
      if (!text) return false;
      const g = M.parseRange(text);
      if (!g) { toast(`"${text}" isn't a valid cell or range reference.`, 'error'); return false; }
      if (g.sheet) {
        const i = this.doc.sheets.findIndex((s) => s.name.toLowerCase() === g.sheet.toLowerCase());
        if (i < 0) { toast(`There's no sheet named "${g.sheet}".`, 'error'); return false; }
        this.switchSheet(i);
      }
      if (g.r1 === g.r2 && g.c1 === g.c2) this.select(g.r1, g.c1);
      else this.selectRange(g);
      return true;
    }
  }

  const range = (a, b) => { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; };
  const esc = (s) => String(s).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));

  App.clone = clone;
  App.range = range;
  App.isEmptyCell = isEmptyCell;
  root.App = App;
})(self);

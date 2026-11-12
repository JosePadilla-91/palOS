/*
 * Canvas grid renderer: geometry (variable column widths / row heights, hidden rows and columns,
 * zoom, frozen panes), drawing, and hit-testing. All state lives in the App; the grid only reads it.
 */
(function (root) {
  const M = root.SheetModel;
  const Fmt = root.Fmt;

  /** Positions along one axis with sparse size overrides. */
  class Axis {
    constructor(def, overrides, count) {
      this.def = def;
      this.count = count;
      this.map = overrides; // Map<index, size>
      this.idx = [...overrides.keys()].sort((a, b) => a - b);
      this.pre = [0];
      for (const i of this.idx) this.pre.push(this.pre[this.pre.length - 1] + (overrides.get(i) - def));
    }
    _lb(i) { // number of overrides with index < i
      let lo = 0, hi = this.idx.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (this.idx[m] < i) lo = m + 1; else hi = m; }
      return lo;
    }
    pos(i) { return i * this.def + this.pre[this._lb(i)]; }
    size(i) { const s = this.map.get(i); return s === undefined ? this.def : s; }
    /** Largest index whose start is <= p (i.e. the item containing position p). */
    at(p) {
      if (p <= 0) return this.firstVisible(0);
      let lo = 0, hi = this.count - 1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.pos(m) <= p) lo = m; else hi = m - 1; }
      return lo;
    }
    firstVisible(i) { while (i < this.count - 1 && this.size(i) === 0) i++; return i; }
  }

  /** Readable "automatic" text color for a given fill (keeps light fills legible in dark mode). */
  function contrastText(bg, fallback) {
    if (!bg) return fallback;
    const h = bg.replace('#', '');
    if (h.length < 6) return fallback;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.55 ? '#1f1f1f' : lum < 0.35 ? '#f2f2f0' : fallback;
  }

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const DEFAULT_FONT = 'Carlito, Calibri, "Liberation Sans", Arial, sans-serif';
  const DEFAULT_PT = 11;

  class Grid {
    constructor(app) {
      this.app = app;
      this.wrap = document.getElementById('grid-wrap');
      this.canvas = document.getElementById('grid-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.scroller = document.getElementById('scroller');
      this.spacer = document.getElementById('spacer');
      this.extentRows = 1000;
      this.extentCols = 52;
      this.vw = 0; this.vh = 0;
      this.pending = false;
      this.readTheme();
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { this.readTheme(); this.invalidate(); });
      this.scroller.addEventListener('scroll', () => this.onScroll());
      new ResizeObserver(() => this.resize()).observe(this.wrap);
      this.measureCache = new Map();
    }

    readTheme() {
      this.theme = {
        bg: css('--grid-bg'), line: css('--grid-line'), text: css('--grid-text'),
        headBg: css('--header-bg'), headText: css('--header-text'), headLine: css('--header-line'),
        headSelBg: css('--header-sel-bg'), headSelText: css('--header-sel-text'), headFullBg: css('--header-full-bg'),
        selBorder: css('--sel-border'), selFill: css('--sel-fill'), freeze: css('--freeze-line'),
        copy: css('--copy-border'), filterBtn: css('--filter-btn'),
      };
    }

    get sheet() { return this.app.sheet(); }
    get z() { return this.app.zoom; }

    /* ------------------------------------------------------- geometry */

    rebuildAxes() {
      const sh = this.sheet, z = this.z;
      const cols = new Map(), rows = new Map();
      for (const c in sh.colWidths) cols.set(+c, Math.round(sh.colWidths[c] * z));
      for (const r in sh.rowHeights) rows.set(+r, Math.round(sh.rowHeights[r] * z));
      for (const c in sh.hiddenCols || {}) if (sh.hiddenCols[c]) cols.set(+c, 0);
      for (const r in sh.hiddenRows || {}) if (sh.hiddenRows[r]) rows.set(+r, 0);
      for (const r of this.app.filterHiddenRows()) rows.set(r, 0);
      this.colAxis = new Axis(Math.round(M.DEFAULT_COL_WIDTH * z), cols, M.MAX_COLS);
      this.rowAxis = new Axis(Math.round(M.DEFAULT_ROW_HEIGHT * z), rows, M.MAX_ROWS);
      this.headerH = Math.round(24 * Math.max(0.8, z));
      this.updateHeaderWidth();
      this.updateExtent();
    }

    updateHeaderWidth() {
      const digits = String(Math.min(M.MAX_ROWS, this.extentRows)).length;
      this.headerW = Math.round(Math.max(40, digits * 8 + 18) * Math.max(0.8, this.z));
    }

    updateExtent(force) {
      const sh = this.sheet;
      const b = M.usedBounds(sh) || { r2: 0, c2: 0 };
      const sel = this.app.sel;
      const needR = Math.max(1000, b.r2 + 100, sel ? Math.min(sel.r2, M.MAX_ROWS - 1) + 50 : 0);
      const needC = Math.max(52, b.c2 + 20, sel ? Math.min(sel.c2, M.MAX_COLS - 1) + 10 : 0);
      if (force) { this.extentRows = needR; this.extentCols = needC; }
      else { this.extentRows = Math.max(this.extentRows, needR); this.extentCols = Math.max(this.extentCols, needC); }
      this.extentRows = Math.min(this.extentRows, M.MAX_ROWS);
      this.extentCols = Math.min(this.extentCols, M.MAX_COLS);
      this.updateHeaderWidth();
      this.updateSpacer();
    }

    updateSpacer() {
      const w = this.headerW + this.colAxis.pos(this.extentCols);
      const h = this.headerH + this.rowAxis.pos(this.extentRows);
      // Chromium caps element sizes around 33.5M px.
      this.spacer.style.width = Math.min(w, 33000000) + 'px';
      this.spacer.style.height = Math.min(h, 33000000) + 'px';
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      this.vw = this.scroller.clientWidth;
      this.vh = this.scroller.clientHeight;
      this.canvas.width = Math.round(this.vw * dpr);
      this.canvas.height = Math.round(this.vh * dpr);
      this.canvas.style.width = this.vw + 'px';
      this.canvas.style.height = this.vh + 'px';
      this.dpr = dpr;
      this.invalidate(true);
    }

    onScroll() {
      const s = this.scroller;
      let grew = false;
      if (s.scrollTop + s.clientHeight > s.scrollHeight - 400 && this.extentRows < M.MAX_ROWS) { this.extentRows = Math.min(M.MAX_ROWS, this.extentRows + 1000); grew = true; }
      if (s.scrollLeft + s.clientWidth > s.scrollWidth - 300 && this.extentCols < M.MAX_COLS) { this.extentCols = Math.min(M.MAX_COLS, this.extentCols + 26); grew = true; }
      if (grew) { this.updateHeaderWidth(); this.updateSpacer(); }
      this.invalidate();
      this.app.onGridScroll();
    }

    get frozen() {
      const f = this.sheet.freeze || {};
      const fr = f.rows || 0, fc = f.cols || 0;
      return { fr, fc, fH: fr ? this.rowAxis.pos(fr) : 0, fW: fc ? this.colAxis.pos(fc) : 0 };
    }

    colX(c) { const { fc } = this.frozen; return this.headerW + this.colAxis.pos(c) - (c < fc ? 0 : this.scroller.scrollLeft); }
    rowY(r) { const { fr } = this.frozen; return this.headerH + this.rowAxis.pos(r) - (r < fr ? 0 : this.scroller.scrollTop); }
    colW(c) { return this.colAxis.size(c); }
    rowH(r) { return this.rowAxis.size(r); }

    /** Screen rect of a range (inclusive). */
    rangeRect(g) {
      const x = this.colX(g.c1), y = this.rowY(g.r1);
      const x2 = this.colX(g.c2) + this.colW(g.c2), y2 = this.rowY(g.r2) + this.rowH(g.r2);
      return { x, y, w: x2 - x, h: y2 - y };
    }

    cellRect(r, c) {
      const m = this.app.mergeAt(r, c);
      return m ? this.rangeRect(m) : { x: this.colX(c), y: this.rowY(r), w: this.colW(c), h: this.rowH(r) };
    }

    contentX(x) { const { fW } = this.frozen; const rel = x - this.headerW; return rel < fW ? rel : rel + this.scroller.scrollLeft; }
    contentY(y) { const { fH } = this.frozen; const rel = y - this.headerH; return rel < fH ? rel : rel + this.scroller.scrollTop; }
    colAtX(x) { return Math.min(this.colAxis.at(this.contentX(x)), M.MAX_COLS - 1); }
    rowAtY(y) { return Math.min(this.rowAxis.at(this.contentY(y)), M.MAX_ROWS - 1); }

    /** Hit-test a point in grid-wrap coordinates. */
    hit(x, y) {
      const H = this.headerH, W = this.headerW;
      if (x < W && y < H) return { type: 'corner' };
      if (y < H) {
        const c = this.colAtX(x);
        const left = this.colX(c), right = left + this.colW(c);
        if (right - x <= 4) return { type: 'colHeader', c, resize: c };
        if (x - left <= 3 && c > 0) return { type: 'colHeader', c, resize: this.prevVisibleCol(c) };
        return { type: 'colHeader', c };
      }
      if (x < W) {
        const r = this.rowAtY(y);
        const top = this.rowY(r), bottom = top + this.rowH(r);
        if (bottom - y <= 3) return { type: 'rowHeader', r, resize: r };
        if (y - top <= 2 && r > 0) return { type: 'rowHeader', r, resize: this.prevVisibleRow(r) };
        return { type: 'rowHeader', r };
      }
      const r = this.rowAtY(y), c = this.colAtX(x);
      const res = { type: 'cell', r, c };
      const sel = this.app.sel;
      if (sel && !this.app.editing) {
        const sr = this.rangeRect(sel);
        const fx = sr.x + sr.w, fy = sr.y + sr.h;
        if (Math.abs(x - fx) <= 5 && Math.abs(y - fy) <= 5) res.fill = true;
      }
      const f = this.sheet.filter;
      if (f && r === f.r1 && c >= f.c1 && c <= f.c2) {
        const b = this.filterButtonRect(r, c);
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) res.filterBtn = true;
      }
      return res;
    }

    prevVisibleCol(c) { c--; while (c > 0 && this.colW(c) === 0) c--; return Math.max(0, c); }
    prevVisibleRow(r) { r--; while (r > 0 && this.rowH(r) === 0) r--; return Math.max(0, r); }

    filterButtonRect(r, c) {
      const x = this.colX(c), y = this.rowY(r), w = this.colW(c), h = this.rowH(r);
      const s = Math.min(16 * this.z, h - 4);
      return { x: x + w - s - 3, y: y + (h - s) / 2, w: s, h: s };
    }

    /** Scroll so that cell (r, c) is fully visible. */
    scrollIntoView(r, c) {
      const { fr, fc, fH, fW } = this.frozen;
      const s = this.scroller;
      const vw = this.vw - this.headerW - fW, vh = this.vh - this.headerH - fH;
      if (c >= fc) {
        const x = this.colAxis.pos(c) - fW, w = this.colW(c);
        if (x < s.scrollLeft) s.scrollLeft = x;
        else if (x + w > s.scrollLeft + vw) s.scrollLeft = Math.max(0, Math.min(x, x + w - vw));
      }
      if (r >= fr) {
        const y = this.rowAxis.pos(r) - fH, h = this.rowH(r);
        if (y < s.scrollTop) s.scrollTop = y;
        else if (y + h > s.scrollTop + vh) s.scrollTop = Math.max(0, Math.min(y, y + h - vh));
      }
    }

    /** Ensure the spacer is large enough to scroll to (r, c). */
    ensureExtent(r, c) {
      let changed = false;
      if (r + 50 > this.extentRows) { this.extentRows = Math.min(M.MAX_ROWS, r + 200); changed = true; }
      if (c + 10 > this.extentCols) { this.extentCols = Math.min(M.MAX_COLS, c + 26); changed = true; }
      if (changed) { this.updateHeaderWidth(); this.updateSpacer(); }
    }

    /* -------------------------------------------------------- drawing */

    invalidate(now) {
      if (now) { this.pending = false; this.render(); return; }
      if (this.pending) return;
      this.pending = true;
      requestAnimationFrame(() => { if (this.pending) { this.pending = false; this.render(); } });
    }

    font(s, z) {
      const pt = (s && s.fs) || DEFAULT_PT;
      const px = Math.max(1, (pt * 4) / 3 * z);
      return `${s && s.i ? 'italic ' : ''}${s && s.b ? 'bold ' : ''}${px.toFixed(2)}px ${s && s.ff ? '"' + s.ff + '", ' + DEFAULT_FONT : DEFAULT_FONT}`;
    }

    render() {
      if (!this.colAxis || !this.vw) return;
      const ctx = this.ctx, T = this.theme;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = T.bg;
      ctx.fillRect(0, 0, this.vw, this.vh);
      const { fr, fc, fH, fW } = this.frozen;
      const W = this.headerW, H = this.headerH;
      const sl = this.scroller.scrollLeft, st = this.scroller.scrollTop;

      // Regions: [rowStart, rowEnd), [colStart, colEnd), clip rect
      const regions = [];
      const rowsScroll = [this.rowAxis.at(st + fH), this.rowAxis.at(st + fH + this.vh - H - fH) + 1];
      const colsScroll = [this.colAxis.at(sl + fW), this.colAxis.at(sl + fW + this.vw - W - fW) + 1];
      rowsScroll[0] = Math.max(rowsScroll[0], fr);
      colsScroll[0] = Math.max(colsScroll[0], fc);
      const main = { rows: rowsScroll, cols: colsScroll, clip: { x: W + fW, y: H + fH, w: this.vw - W - fW, h: this.vh - H - fH } };
      regions.push(main);
      if (fc) regions.push({ rows: rowsScroll, cols: [0, fc], clip: { x: W, y: H + fH, w: fW, h: this.vh - H - fH } });
      if (fr) regions.push({ rows: [0, fr], cols: colsScroll, clip: { x: W + fW, y: H, w: this.vw - W - fW, h: fH } });
      if (fr && fc) regions.push({ rows: [0, fr], cols: [0, fc], clip: { x: W, y: H, w: fW, h: fH } });

      for (const reg of regions) {
        if (reg.clip.w <= 0 || reg.clip.h <= 0) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(reg.clip.x, reg.clip.y, reg.clip.w, reg.clip.h);
        ctx.clip();
        this.drawCells(reg);
        this.drawOverlays(reg);
        ctx.restore();
      }

      // Freeze divider lines
      ctx.strokeStyle = T.freeze;
      ctx.lineWidth = 2;
      if (fc) { ctx.beginPath(); ctx.moveTo(W + fW, 0); ctx.lineTo(W + fW, this.vh); ctx.stroke(); }
      if (fr) { ctx.beginPath(); ctx.moveTo(0, H + fH); ctx.lineTo(this.vw, H + fH); ctx.stroke(); }

      this.drawHeaders(colsScroll, rowsScroll);
      this.app.afterRender();
    }

    cellDisplay(si, r, c, cell) {
      const app = this.app;
      if (app.showFormulas && cell && cell.f) return { text: '=' + cell.f, align: 'left' };
      const v = app.engine.value(si, r, c);
      if (v == null || v === '') return null;
      const nf = cell && cell.s && cell.s.nf;
      let kind = null;
      if (typeof v === 'number' && (!nf || nf === 'General') && cell && cell.f) kind = app.engine.detailedType(si, r, c);
      const text = Fmt.formatValue(v, nf, kind);
      let align = 'left', color = null;
      if (typeof v === 'number') {
        align = 'right';
        if (nf && v < 0) { const secs = nf.split(';'); if (secs.length > 1 && /\[red\]/i.test(secs[1])) color = '#d00000'; }
      } else if (typeof v === 'boolean' || (typeof v === 'object' && v.error)) align = 'center';
      return { text, align, num: typeof v === 'number' ? v : null, general: typeof v === 'number' && (!nf || nf === 'General') && !kind, color, error: typeof v === 'object' };
    }

    isEmptyAt(sh, r, c) {
      const cell = sh.cells[r + ',' + c];
      if (cell && (cell.f || (cell.v != null && cell.v !== ''))) return false;
      if (this.app.mergeAt(r, c)) return false;
      if (!cell && this.app.engine.isPartOfArray(this.app.sheetIdx, r, c)) return this.app.engine.value(this.app.sheetIdx, r, c) == null;
      return true;
    }

    drawCells(reg) {
      const ctx = this.ctx, T = this.theme, z = this.z;
      const sh = this.sheet, si = this.app.sheetIdx;
      const [r0, r1] = reg.rows, [c0, c1] = reg.cols;
      const pad = Math.max(2, 3 * z);
      const showGrid = sh.showGrid !== false;

      // Gridlines
      if (showGrid) {
        ctx.strokeStyle = T.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = c0; c <= c1; c++) {
          if (c > c0 && this.colW(c - 1) === 0) continue;
          const x = Math.round(this.colX(c)) - 0.5;
          ctx.moveTo(x, reg.clip.y); ctx.lineTo(x, reg.clip.y + reg.clip.h);
        }
        for (let r = r0; r <= r1; r++) {
          const y = Math.round(this.rowY(r)) - 0.5;
          ctx.moveTo(reg.clip.x, y); ctx.lineTo(reg.clip.x + reg.clip.w, y);
        }
        ctx.stroke();
      }

      // Fills
      for (let r = r0; r < r1; r++) {
        const h = this.rowH(r);
        if (!h) continue;
        const y = this.rowY(r);
        for (let c = c0; c < c1; c++) {
          const cell = sh.cells[r + ',' + c];
          if (!cell || !cell.s || !cell.s.bg) continue;
          if (this.app.mergeAt(r, c)) continue;
          const w = this.colW(c);
          if (!w) continue;
          ctx.fillStyle = cell.s.bg;
          ctx.fillRect(this.colX(c) - 1, y - 1, w + 1, h + 1);
        }
      }

      // Text (start a few columns to the left so long text can overflow into view)
      const cStart = Math.max(0, c0 - 12);
      for (let r = r0; r < r1; r++) {
        const h = this.rowH(r);
        if (!h) continue;
        const y = this.rowY(r);
        for (let c = cStart; c < c1; c++) {
          const w = this.colW(c);
          if (!w) continue;
          if (this.app.mergeAt(r, c)) continue;
          const cell = sh.cells[r + ',' + c];
          const disp = this.cellDisplay(si, r, c, cell);
          if (!disp) continue;
          const s = (cell && cell.s) || {};
          if (c < c0 && (disp.num != null || (s.ha && s.ha !== 'left') || s.wrap)) continue;
          this.drawText(sh, r, c, { x: this.colX(c), y, w, h }, disp, s, pad, reg, c0, c1);
        }
      }

      // Merged cells
      for (const m of sh.merges) {
        if (m.r2 < r0 || m.r1 >= r1 || m.c2 < c0 || m.c1 >= c1) continue;
        const rect = this.rangeRect(m);
        if (rect.w <= 0 || rect.h <= 0) continue;
        const cell = sh.cells[m.r1 + ',' + m.c1];
        const s = (cell && cell.s) || {};
        ctx.fillStyle = s.bg || T.bg;
        ctx.fillRect(rect.x, rect.y, rect.w - 1, rect.h - 1);
        const disp = this.cellDisplay(si, m.r1, m.c1, cell);
        if (disp) this.drawText(sh, m.r1, m.c1, rect, disp, s, pad, reg, c0, c1, true);
      }

      // Borders
      for (let r = r0; r < r1; r++) {
        if (!this.rowH(r)) continue;
        for (let c = c0; c < c1; c++) {
          const cell = sh.cells[r + ',' + c];
          if (!cell || !cell.s || !cell.s.bd) continue;
          if (!this.colW(c)) continue;
          const m = this.app.mergeAt(r, c);
          const rect = m && m.r1 === r && m.c1 === c ? this.rangeRect(m) : m ? null : { x: this.colX(c), y: this.rowY(r), w: this.colW(c), h: this.rowH(r) };
          if (rect) this.drawBorders(rect, cell.s.bd);
        }
      }

      // Filter buttons
      const f = sh.filter;
      if (f && f.r1 >= r0 && f.r1 < r1) {
        for (let c = Math.max(f.c1, c0); c <= Math.min(f.c2, c1 - 1); c++) {
          if (!this.colW(c)) continue;
          const b = this.filterButtonRect(f.r1, c);
          const active = f.hidden && f.hidden[c] && f.hidden[c].length;
          ctx.fillStyle = active ? T.selBorder : T.filterBtn;
          ctx.strokeStyle = active ? T.selBorder : T.headLine;
          ctx.lineWidth = 1;
          this.roundRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 3);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = active ? '#fff' : T.headText;
          ctx.beginPath();
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
          if (active) {
            ctx.moveTo(cx - 4, cy - 3); ctx.lineTo(cx + 4, cy - 3); ctx.lineTo(cx + 1, cy + 1); ctx.lineTo(cx + 1, cy + 4); ctx.lineTo(cx - 1, cy + 4); ctx.lineTo(cx - 1, cy + 1);
          } else {
            ctx.moveTo(cx - 3.5, cy - 1.5); ctx.lineTo(cx + 3.5, cy - 1.5); ctx.lineTo(cx, cy + 2.5);
          }
          ctx.closePath(); ctx.fill();
        }
      }
    }

    roundRect(x, y, w, h, r) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    drawText(sh, r, c, rect, disp, s, pad, reg, c0, c1, merged) {
      const ctx = this.ctx, z = this.z;
      ctx.font = this.font(s, z);
      const fontPx = ((s.fs || DEFAULT_PT) * 4) / 3 * z;
      const align = s.ha || disp.align;
      const valign = s.va || 'bottom';
      let text = disp.text;
      const avail = rect.w - pad * 2;
      let clipX = rect.x, clipW = rect.w;

      if (s.wrap && disp.num == null) {
        const lines = this.wrapLines(text, avail);
        const lh = fontPx * 1.22;
        const total = lines.length * lh;
        let y0 = valign === 'top' ? rect.y + pad * 0.5 : valign === 'middle' ? rect.y + (rect.h - total) / 2 : rect.y + rect.h - total - pad * 0.5;
        ctx.save();
        ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w - 1, rect.h - 1); ctx.clip();
        ctx.fillStyle = s.fc || disp.color || contrastText(s.bg, this.theme.text);
        ctx.textBaseline = 'top';
        for (const line of lines) {
          const tw = ctx.measureText(line).width;
          const x = align === 'right' ? rect.x + rect.w - pad - tw : align === 'center' ? rect.x + (rect.w - tw) / 2 : rect.x + pad;
          ctx.fillText(line, x, y0 + (lh - fontPx) / 2);
          this.decorate(s, x, y0 + (lh - fontPx) / 2, tw, fontPx);
          y0 += lh;
        }
        ctx.restore();
        return;
      }

      text = text.replace(/\r?\n/g, ' ');
      let tw = ctx.measureText(text).width;
      if (tw > avail) {
        if (disp.num != null) {
          const fits = (t) => ctx.measureText(t).width <= avail;
          const short = disp.general ? Fmt.fitGeneral(disp.num, fits) : null;
          if (short) text = short;
          else { const hw = ctx.measureText('#').width || 6; text = '#'.repeat(Math.max(1, Math.floor(avail / hw))); }
          tw = ctx.measureText(text).width;
        } else if (!merged && !disp.error) {
          // Overflow into empty neighbours.
          const need = tw - avail;
          const T = this.theme;
          const extend = (dir) => {
            let got = 0, cc = c + dir;
            const cells = [];
            while (got < need && cc >= 0 && cc < M.MAX_COLS && cc < c1 + 12 && this.isEmptyAt(sh, r, cc)) {
              const w = this.colW(cc);
              cells.push(cc);
              got += w; cc += dir;
            }
            return { cells, got };
          };
          let ext = [];
          if (align === 'left') { const e = extend(1); ext = e.cells; clipW += e.got; }
          else if (align === 'right') { const e = extend(-1); ext = e.cells; clipX -= e.got; clipW += e.got; }
          else {
            const half = need / 2;
            let gotL = 0, gotR = 0, cl = c - 1, cr = c + 1;
            while (gotR < half && cr < M.MAX_COLS && this.isEmptyAt(sh, r, cr)) { ext.push(cr); gotR += this.colW(cr); cr++; }
            while (gotL < half && cl >= 0 && this.isEmptyAt(sh, r, cl)) { ext.push(cl); gotL += this.colW(cl); cl--; }
            clipX -= gotL; clipW += gotL + gotR;
          }
          // Hide the gridlines under the overflowing text.
          for (const cc of ext) {
            const nc = sh.cells[r + ',' + cc];
            ctx.fillStyle = (nc && nc.s && nc.s.bg) || T.bg;
            const x = this.colX(cc);
            ctx.fillRect(x - 1, rect.y, this.colW(cc), rect.h - 1);
          }
          if (align === 'center') rect = { x: clipX, y: rect.y, w: clipW, h: rect.h };
        }
      }

      let x;
      if (align === 'right') x = rect.x + rect.w - pad - tw;
      else if (align === 'center') x = rect.x + (rect.w - tw) / 2;
      else x = rect.x + pad;
      const y = valign === 'top' ? rect.y + pad * 0.6 : valign === 'middle' ? rect.y + (rect.h - fontPx) / 2 : rect.y + rect.h - fontPx - pad * 0.9;

      ctx.save();
      ctx.beginPath();
      ctx.rect(clipX, rect.y, clipW - 1, rect.h - 1);
      ctx.clip();
      ctx.fillStyle = s.fc || disp.color || (disp.error ? '#c00000' : contrastText(s.bg, this.theme.text));
      ctx.textBaseline = 'top';
      ctx.fillText(text, x, y);
      this.decorate(s, x, y, tw, fontPx);
      ctx.restore();
    }

    decorate(s, x, y, w, fontPx) {
      if (!s.u && !s.st) return;
      const ctx = this.ctx;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = Math.max(1, fontPx / 14);
      ctx.beginPath();
      if (s.u) { const uy = Math.round(y + fontPx * 1.02) + 0.5; ctx.moveTo(x, uy); ctx.lineTo(x + w, uy); }
      if (s.st) { const sy = Math.round(y + fontPx * 0.55) + 0.5; ctx.moveTo(x, sy); ctx.lineTo(x + w, sy); }
      ctx.stroke();
    }

    wrapLines(text, width) {
      const ctx = this.ctx;
      const out = [];
      for (const para of String(text).split(/\r?\n/)) {
        const words = para.split(/(\s+)/);
        let line = '';
        for (const w of words) {
          const test = line + w;
          if (ctx.measureText(test).width <= width || !line) {
            if (!line && ctx.measureText(w).width > width) {
              // Break a single long word.
              let chunk = '';
              for (const ch of w) {
                if (ctx.measureText(chunk + ch).width > width && chunk) { out.push(chunk); chunk = ch; }
                else chunk += ch;
              }
              line = chunk;
            } else line = test;
          } else {
            out.push(line.trimEnd());
            line = w.trimStart();
          }
        }
        out.push(line.trimEnd());
      }
      return out;
    }

    drawBorders(rect, bd) {
      const ctx = this.ctx;
      const side = (b, x1, y1, x2, y2) => {
        if (!b || !b.style || b.style === 'none') return;
        // "Automatic" black borders follow the theme so they stay visible on a dark grid.
        ctx.strokeStyle = !b.color || /^#0{3}(0{3})?$/i.test(b.color) ? this.theme.text : b.color;
        const wmap = { thin: 1, hair: 1, dotted: 1, dashed: 1, dashDot: 1, dashDotDot: 1, medium: 2, mediumDashed: 2, mediumDashDot: 2, mediumDashDotDot: 2, slantDashDot: 2, thick: 3, double: 3 };
        const lw = wmap[b.style] || 1;
        ctx.lineWidth = lw;
        ctx.setLineDash(b.style === 'dotted' || b.style === 'hair' ? [1, 2] : /dash/i.test(b.style) ? [4, 2] : []);
        const off = lw % 2 ? 0.5 : 0;
        ctx.beginPath();
        if (b.style === 'double') {
          ctx.lineWidth = 1;
          const horiz = y1 === y2;
          for (const d of [-1, 1]) {
            ctx.moveTo(x1 + (horiz ? 0 : d) + 0.5, y1 + (horiz ? d : 0) + 0.5);
            ctx.lineTo(x2 + (horiz ? 0 : d) + 0.5, y2 + (horiz ? d : 0) + 0.5);
          }
        } else {
          ctx.moveTo(Math.round(x1) - off, Math.round(y1) - off);
          ctx.lineTo(Math.round(x2) - off, Math.round(y2) - off);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };
      const { x, y, w, h } = rect;
      side(bd.t, x, y, x + w, y);
      side(bd.b, x, y + h, x + w, y + h);
      side(bd.l, x, y, x, y + h);
      side(bd.r, x + w, y, x + w, y + h);
    }

    drawOverlays() {
      const ctx = this.ctx, T = this.theme, app = this.app;

      // Formula reference highlights while editing
      for (const h of app.refHighlights || []) {
        const rr = this.rangeRect(h.g);
        ctx.fillStyle = h.color + '1f';
        ctx.fillRect(rr.x, rr.y, rr.w, rr.h);
        ctx.strokeStyle = h.color;
        ctx.lineWidth = h.active ? 2 : 1.5;
        ctx.setLineDash(h.active ? [4, 3] : []);
        ctx.strokeRect(rr.x + 0.5, rr.y + 0.5, rr.w - 1, rr.h - 1);
        ctx.setLineDash([]);
      }

      // Copy/cut marquee
      const clip = app.clipboard;
      if (clip && clip.si === app.sheetIdx && clip.showMarquee) {
        const rr = this.rangeRect(clip.g);
        ctx.strokeStyle = T.copy;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -(app.marchOffset || 0);
        ctx.strokeRect(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2);
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
      }

      const sel = app.sel;
      if (!sel) return;
      const rr = this.rangeRect(sel);
      const multi = sel.r1 !== sel.r2 || sel.c1 !== sel.c2;
      const ar = this.cellRect(sel.ar, sel.ac);
      const merged = app.mergeAt(sel.ar, sel.ac);
      const single = !multi || (merged && merged.r1 === sel.r1 && merged.c1 === sel.c1 && merged.r2 === sel.r2 && merged.c2 === sel.c2);
      if (!single) {
        ctx.fillStyle = T.selFill;
        ctx.save();
        ctx.beginPath();
        ctx.rect(rr.x, rr.y, rr.w, rr.h);
        ctx.rect(ar.x + ar.w, ar.y, -ar.w, ar.h); // exclude the active cell (even-odd)
        ctx.fill('evenodd');
        ctx.restore();
      }
      // Fill-drag preview
      if (app.fillPreview) {
        const fp = this.rangeRect(app.fillPreview);
        ctx.strokeStyle = T.selBorder;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(fp.x + 0.5, fp.y + 0.5, fp.w - 1, fp.h - 1);
        ctx.setLineDash([]);
      }
      if (app.editing) return;
      ctx.strokeStyle = T.selBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(rr.x, rr.y, rr.w - 1, rr.h - 1);
      if (!single) {
        ctx.lineWidth = 1;
        ctx.strokeRect(ar.x + 1.5, ar.y + 1.5, ar.w - 4, ar.h - 4);
      }
      // Fill handle
      const hs = 7;
      ctx.fillStyle = T.selBorder;
      ctx.strokeStyle = T.bg;
      ctx.lineWidth = 1.5;
      ctx.fillRect(rr.x + rr.w - hs / 2 - 1, rr.y + rr.h - hs / 2 - 1, hs, hs);
      ctx.strokeRect(rr.x + rr.w - hs / 2 - 1, rr.y + rr.h - hs / 2 - 1, hs, hs);
    }

    drawHeaders(colsScroll, rowsScroll) {
      const ctx = this.ctx, T = this.theme, z = this.z;
      const W = this.headerW, H = this.headerH;
      const { fr, fc } = this.frozen;
      const sel = this.app.sel;
      const fullCols = sel && sel.r1 === 0 && sel.r2 >= M.MAX_ROWS - 1;
      const fullRows = sel && sel.c1 === 0 && sel.c2 >= M.MAX_COLS - 1;
      ctx.font = `${(11.5 * Math.max(0.8, z)).toFixed(1)}px Ubuntu, "Noto Sans", "DejaVu Sans", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      // Column header
      ctx.fillStyle = T.headBg;
      ctx.fillRect(0, 0, this.vw, H);
      const drawCol = (c) => {
        const w = this.colW(c);
        if (!w) return;
        const x = this.colX(c);
        const inSel = sel && c >= sel.c1 && c <= sel.c2;
        if (inSel) {
          ctx.fillStyle = fullCols ? T.headFullBg : T.headSelBg;
          ctx.fillRect(x, 0, w, H);
        }
        ctx.fillStyle = inSel ? (fullCols ? '#fff' : T.headSelText) : T.headText;
        ctx.fillText(M.colName(c), x + w / 2, H / 2 + 0.5);
        ctx.fillStyle = T.headLine;
        ctx.fillRect(Math.round(x + w) - 1, 0, 1, H);
        if (inSel && !fullCols) { ctx.fillStyle = T.selBorder; ctx.fillRect(x, H - 2, w, 2); }
      };
      ctx.save();
      ctx.beginPath(); ctx.rect(W + this.frozen.fW, 0, this.vw, H); ctx.clip();
      for (let c = colsScroll[0]; c < colsScroll[1]; c++) drawCol(c);
      ctx.restore();
      for (let c = 0; c < fc; c++) drawCol(c);

      // Row header
      ctx.fillStyle = T.headBg;
      ctx.fillRect(0, H, W, this.vh - H);
      const drawRow = (r) => {
        const h = this.rowH(r);
        if (!h) return;
        const y = this.rowY(r);
        const inSel = sel && r >= sel.r1 && r <= sel.r2;
        if (inSel) {
          ctx.fillStyle = fullRows ? T.headFullBg : T.headSelBg;
          ctx.fillRect(0, y, W, h);
        }
        ctx.fillStyle = inSel ? (fullRows ? '#fff' : T.headSelText) : T.headText;
        if (h >= 8) ctx.fillText(String(r + 1), W / 2, y + h / 2 + 0.5);
        ctx.fillStyle = T.headLine;
        ctx.fillRect(0, Math.round(y + h) - 1, W, 1);
        if (inSel && !fullRows) { ctx.fillStyle = T.selBorder; ctx.fillRect(W - 2, y, 2, h); }
      };
      ctx.save();
      ctx.beginPath(); ctx.rect(0, H + this.frozen.fH, W, this.vh); ctx.clip();
      for (let r = rowsScroll[0]; r < rowsScroll[1]; r++) drawRow(r);
      ctx.restore();
      for (let r = 0; r < fr; r++) drawRow(r);

      // Hidden column/row markers
      ctx.fillStyle = T.selBorder;
      const sh = this.sheet;
      for (const c in sh.hiddenCols || {}) {
        if (!sh.hiddenCols[c]) continue;
        const x = this.colX(+c);
        if (x > W && x < this.vw) ctx.fillRect(x - 2, 2, 3, H - 4);
      }
      for (const r in sh.hiddenRows || {}) {
        if (!sh.hiddenRows[r]) continue;
        const y = this.rowY(+r);
        if (y > H && y < this.vh) ctx.fillRect(2, y - 2, W - 4, 3);
      }

      // Corner and header separators
      ctx.fillStyle = T.headBg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = T.headLine;
      ctx.fillRect(0, H - 1, this.vw, 1);
      ctx.fillRect(W - 1, 0, 1, this.vh);
      ctx.fillStyle = T.headText;
      ctx.beginPath();
      ctx.moveTo(W - 4, H - 4); ctx.lineTo(W - 4, H - 12 * Math.max(0.8, z)); ctx.lineTo(W - 12 * Math.max(0.8, z), H - 4);
      ctx.closePath();
      ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
      ctx.textAlign = 'start';
    }

    /** Measure text width with a given style (used for auto-fit). */
    measure(text, s) {
      const ctx = this.ctx;
      ctx.font = this.font(s, 1);
      return ctx.measureText(String(text)).width;
    }
  }

  Grid.contrastText = contrastText;
  root.Grid = Grid;
  root.GridAxis = Axis;
})(self);

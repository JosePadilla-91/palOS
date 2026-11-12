/* Floating charts (Chart.js) bound to cell ranges. Saved in .spst files. */
(function (root) {
  const M = root.SheetModel;
  const Fmt = root.Fmt;
  const { el } = root.UI;

  const COLORS = ['#4c6278', '#2f6fdd', '#e8710a', '#c5221f', '#8e44ad', '#f2b707', '#12939a', '#d81b60', '#5f6368', '#7cb342'];

  const TYPES = {
    column: { label: 'Column', icon: '<path d="M4 20V10M10 20V4M16 20V13M22 20V8"/>' },
    bar: { label: 'Bar', icon: '<path d="M2 4h12M2 10h20M2 16h9"/>' },
    line: { label: 'Line', icon: '<path d="M2 18l6-7 5 4 9-11"/>' },
    area: { label: 'Area', icon: '<path d="M2 20V15l6-6 5 4 9-9v16z"/>' },
    pie: { label: 'Pie', icon: '<circle cx="15" cy="11" r="9"/><path d="M15 2v9h9"/>' },
    doughnut: { label: 'Doughnut', icon: '<circle cx="15" cy="11" r="9"/><circle cx="15" cy="11" r="4"/>' },
    scatter: { label: 'Scatter', icon: '<circle cx="5" cy="16" r="1.5"/><circle cx="11" cy="9" r="1.5"/><circle cx="17" cy="12" r="1.5"/><circle cx="23" cy="4" r="1.5"/>' },
    radar: { label: 'Radar', icon: '<path d="M15 2l9 7-3 11H9L6 9z"/><path d="M15 8l4 3-1 5h-6l-1-5z"/>' },
  };

  class ChartManager {
    constructor(app) {
      this.app = app;
      this.layer = document.getElementById('chart-layer');
      this.items = new Map(); // id -> { box, chart, spec }
      this.selected = null;
      this.refreshTimer = null;
      this.applyTheme();
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { this.applyTheme(); this.rebuild(); });
      document.addEventListener('mousedown', (e) => {
        if (this.selected && !e.target.closest('.chart-box')) this.select(null);
      });
    }

    applyTheme() {
      const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      root.Chart.defaults.color = dark ? '#cfd0cd' : '#444';
      root.Chart.defaults.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
      root.Chart.defaults.font.family = 'Ubuntu, "Noto Sans", sans-serif';
    }

    get specs() { return this.app.sheet().charts || []; }

    /** Recreate all chart elements for the current sheet. */
    rebuild() {
      for (const it of this.items.values()) { it.chart.destroy(); it.box.remove(); }
      this.items.clear();
      this.selected = null;
      for (const spec of this.specs) this.create(spec);
      this.position();
    }

    create(spec) {
      const canvas = el('canvas');
      const head = el('div', { class: 'chart-head' },
        el('button', { title: 'Edit chart', onclick: (e) => { e.stopPropagation(); this.edit(spec.id); } }, '✎'),
        el('button', { title: 'Delete chart', onclick: (e) => { e.stopPropagation(); this.remove(spec.id); } }, '✕'));
      const resize = el('div', { class: 'chart-resize' });
      const box = el('div', { class: 'chart-box' }, head, el('div', { class: 'chart-body' }, canvas), resize);
      box.addEventListener('mousedown', (e) => { if (e.button === 0) this.select(spec.id); });
      box.addEventListener('dblclick', () => this.edit(spec.id));
      this.dragBehavior(head, spec.id, 'move');
      this.dragBehavior(resize, spec.id, 'resize');
      this.layer.append(box);
      const chart = new root.Chart(canvas.getContext('2d'), this.config(spec));
      this.items.set(spec.id, { box, chart, spec });
    }

    dragBehavior(handle, id, mode) {
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        e.stopPropagation();
        this.select(id);
        const it = this.items.get(id);
        const z = this.app.zoom;
        const start = { x: e.clientX, y: e.clientY, sx: it.spec.x, sy: it.spec.y, sw: it.spec.w, sh: it.spec.h };
        const live = Object.assign({}, it.spec);
        const move = (ev) => {
          const dx = (ev.clientX - start.x) / z, dy = (ev.clientY - start.y) / z;
          if (mode === 'move') { live.x = Math.max(0, start.sx + dx); live.y = Math.max(0, start.sy + dy); }
          else { live.w = Math.max(180, start.sw + dx); live.h = Math.max(130, start.sh + dy); }
          this.place(it.box, live);
        };
        const up = () => {
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', up);
          if (live.x !== it.spec.x || live.y !== it.spec.y || live.w !== it.spec.w || live.h !== it.spec.h) {
            this.updateSpec(id, { x: Math.round(live.x), y: Math.round(live.y), w: Math.round(live.w), h: Math.round(live.h) }, mode === 'move' ? 'Move chart' : 'Resize chart');
          }
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });
    }

    select(id) {
      this.selected = id;
      for (const [k, it] of this.items) it.box.classList.toggle('selected', k === id);
    }

    place(box, spec) {
      const g = this.app.grid, z = this.app.zoom;
      const x = g.headerW + spec.x * z - g.scroller.scrollLeft;
      const y = g.headerH + spec.y * z - g.scroller.scrollTop;
      box.style.left = x + 'px';
      box.style.top = y + 'px';
      box.style.width = spec.w * z + 'px';
      box.style.height = spec.h * z + 'px';
      // Keep charts under the headers visually.
      const clipTop = Math.max(0, g.headerH - y), clipLeft = Math.max(0, g.headerW - x);
      box.style.clipPath = clipTop || clipLeft ? `inset(${clipTop}px 0 0 ${clipLeft}px)` : '';
    }

    position() {
      for (const it of this.items.values()) this.place(it.box, it.spec);
    }

    /** Debounced refresh of chart data after recalculation. */
    scheduleRefresh() {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => this.refresh(), 120);
    }

    refresh() {
      for (const it of this.items.values()) {
        const cfg = this.config(it.spec);
        it.chart.data = cfg.data;
        it.chart.options = cfg.options;
        it.chart.update('none');
      }
    }

    /* ------------------------------------------------------------ data */

    extract(spec) {
      const g = M.parseRange(spec.range || '');
      if (!g) return { labels: [], series: [] };
      const app = this.app;
      let si = app.sheetIdx;
      if (g.sheet) {
        const idx = app.doc.sheets.findIndex((s) => s.name.toLowerCase() === g.sheet.toLowerCase());
        if (idx < 0) return { labels: [], series: [] };
        si = idx;
      }
      const sh = app.doc.sheets[si];
      // Limit to the used area so whole-column ranges stay fast.
      const b = M.usedBounds(sh) || { r2: 0, c2: 0 };
      const r2 = Math.min(g.r2, b.r2), c2 = Math.min(g.c2, b.c2);
      const grid = [];
      for (let r = g.r1; r <= r2; r++) {
        const row = [];
        for (let c = g.c1; c <= c2; c++) {
          const v = app.engine.value(si, r, c);
          const cell = sh.cells[r + ',' + c];
          row.push({ v: v && typeof v === 'object' ? null : v, text: Fmt.formatValue(v, cell && cell.s && cell.s.nf) });
        }
        grid.push(row);
      }
      let table = grid;
      if (spec.seriesIn === 'rows') table = grid[0] ? grid[0].map((_, c) => grid.map((row) => row[c])) : [];
      if (!table.length) return { labels: [], series: [] };
      const header = spec.header !== false;
      const nCols = table[0].length;
      const body = header ? table.slice(1) : table;
      const firstColText = nCols > 1 && body.some((row) => row[0] && typeof row[0].v === 'string');
      const useCats = spec.type === 'scatter' ? nCols > 1 : firstColText || (nCols > 1 && spec.firstColLabels);
      const labels = useCats ? body.map((row) => (row[0] ? row[0].text : '')) : body.map((_, i) => String(i + 1));
      const series = [];
      for (let c = useCats ? 1 : 0; c < nCols; c++) {
        const name = header ? (table[0][c] && table[0][c].text) || `Series ${series.length + 1}` : `Series ${series.length + 1}`;
        if (spec.type === 'scatter') {
          series.push({ name, data: body.map((row) => ({ x: num(row[0] && row[0].v), y: num(row[c] && row[c].v) })).filter((p) => p.x != null && p.y != null) });
        } else series.push({ name, data: body.map((row) => num(row[c] && row[c].v)) });
      }
      return { labels, series };
    }

    config(spec) {
      const { labels, series } = this.extract(spec);
      const type = spec.type || 'column';
      const circular = type === 'pie' || type === 'doughnut';
      const cjsType = { column: 'bar', bar: 'bar', area: 'line' }[type] || type;
      const datasets = series.map((s, i) => {
        const color = COLORS[i % COLORS.length];
        const ds = { label: s.name, data: s.data };
        if (circular) {
          ds.backgroundColor = s.data.map((_, j) => COLORS[j % COLORS.length]);
          ds.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-bg').trim() || '#fff';
        } else {
          ds.backgroundColor = type === 'area' || type === 'radar' ? color + '55' : type === 'line' ? color : color + 'dd';
          ds.borderColor = color;
          ds.borderWidth = type === 'column' || type === 'bar' ? 0 : 2;
          if (type === 'line' || type === 'area') { ds.tension = spec.smooth ? 0.35 : 0; ds.pointRadius = 2.5; ds.fill = type === 'area' ? (spec.stacked ? (i ? '-1' : 'origin') : 'origin') : false; }
          if (type === 'column' || type === 'bar') ds.borderRadius = 2;
        }
        return ds;
      });
      const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        indexAxis: type === 'bar' ? 'y' : 'x',
        plugins: {
          title: { display: !!spec.title, text: spec.title, font: { size: 14, weight: '600' } },
          legend: { display: spec.legend !== false && (circular || datasets.length > 1), position: spec.legendPos || 'bottom' },
          tooltip: { enabled: true },
        },
      };
      if (!circular && type !== 'radar') {
        options.scales = {
          x: Object.assign({ stacked: !!spec.stacked && type !== 'scatter', title: { display: !!spec.xTitle, text: spec.xTitle } }, type === 'scatter' ? { type: 'linear' } : {}),
          y: { stacked: !!spec.stacked && type !== 'scatter', title: { display: !!spec.yTitle, text: spec.yTitle }, beginAtZero: type !== 'scatter' && type !== 'line' },
        };
      }
      // Chart.js needs (circular) pie charts to have a single dataset to look right.
      return { type: cjsType, data: { labels: type === 'scatter' ? undefined : labels, datasets: circular ? datasets.slice(0, 1) : datasets }, options };
    }

    /* ------------------------------------------------------- mutations */

    add(spec) {
      const charts = [...this.specs, spec];
      this.app.setSheetProps({ charts }, 'Insert chart');
      this.rebuild();
      this.select(spec.id);
    }

    updateSpec(id, patch, label) {
      const charts = this.specs.map((c) => (c.id === id ? Object.assign({}, c, patch) : c));
      this.app.setSheetProps({ charts }, label || 'Edit chart');
      this.rebuild();
      this.select(id);
    }

    remove(id) {
      this.app.setSheetProps({ charts: this.specs.filter((c) => c.id !== id) }, 'Delete chart');
      this.rebuild();
    }

    edit(id) {
      const spec = this.specs.find((c) => c.id === id);
      if (spec) root.Dialogs.chart(this.app, spec).then((patch) => patch && this.updateSpec(id, patch));
    }

    /** Called when rows/cols are inserted/deleted so chart ranges follow their data. */
    adjustRanges(charts, sheetName, axis, index, count, sameSheet) {
      return charts.map((c) => {
        const g = M.parseRange(c.range || '');
        if (!g) return c;
        const target = g.sheet || (sameSheet ? sheetName : null);
        if (!target || target.toLowerCase() !== sheetName.toLowerCase()) return c;
        const r = root.FormulaUtils.adjustRangeForInsert(c.range, axis, index, count);
        return Object.assign({}, c, { range: r || c.range });
      });
    }

    static exportImage(item) { return item.chart.toBase64Image(); }
  }

  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'boolean' ? +v : null);

  ChartManager.TYPES = TYPES;
  root.ChartManager = ChartManager;
})(self);

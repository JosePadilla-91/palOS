/* Dialogs: format cells, charts, sorting, functions, find & replace, filters, and more. */
(function (root) {
  const M = root.SheetModel;
  const Fmt = root.Fmt;
  const { el, dialog, showPopup, closeMenus, colorGrid } = root.UI;

  const FONTS = ['Carlito', 'Calibri', 'Liberation Sans', 'Arial', 'Ubuntu', 'DejaVu Sans', 'Noto Sans', 'Liberation Serif', 'Times New Roman', 'Georgia', 'Liberation Mono', 'DejaVu Sans Mono', 'Courier New'];
  const NUMBER_FORMATS = [
    ['General', 'General'], ['Number', '0.00'], ['Number with separator', '#,##0.00'], ['Integer', '0'],
    ['Currency', '"$"#,##0.00'], ['Currency, red negatives', '"$"#,##0.00;[Red]-"$"#,##0.00'], ['Accounting', '"$"#,##0.00_);[Red]("$"#,##0.00)'],
    ['Euro', '#,##0.00 "€"'], ['Percent', '0%'], ['Percent (2 dp)', '0.00%'], ['Scientific', '0.00E+00'], ['Fraction', '# ?/?'],
    ['Date (ISO)', 'yyyy-mm-dd'], ['Date (US)', 'm/d/yyyy'], ['Date (long)', 'mmmm d, yyyy'], ['Date (day, month)', 'd mmm yyyy'],
    ['Weekday', 'dddd'], ['Time', 'hh:mm:ss'], ['Time (12-hour)', 'h:mm AM/PM'], ['Date and time', 'yyyy-mm-dd hh:mm'], ['Duration', '[h]:mm:ss'], ['Text', '@'],
  ];

  function select(options, value) {
    const s = el('select');
    for (const o of options) {
      const [label, v] = Array.isArray(o) ? o : [o, o];
      s.append(el('option', { value: v, selected: String(v) === String(value) }, label));
    }
    return s;
  }

  function tabs(defs) {
    const strip = el('div', { class: 'tabs-strip' });
    const panes = el('div');
    defs.forEach(([name, pane], i) => {
      const b = el('button', { type: 'button', class: i ? '' : 'on' }, name);
      pane.style.display = i ? 'none' : '';
      b.addEventListener('click', () => {
        [...strip.children].forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        [...panes.children].forEach((p) => (p.style.display = 'none'));
        pane.style.display = '';
      });
      strip.append(b);
      panes.append(pane);
    });
    return el('div', {}, strip, panes);
  }

  const Dialogs = {};

  /* ------------------------------------------------------ format cells */
  Dialogs.formatCells = async function (app) {
    const cell = app.activeCell() || {};
    const s = Object.assign({}, cell.s || {});
    const sample = app.engine.value(app.sheetIdx, app.sel.ar, app.sel.ac);

    // Number
    const nfInput = el('input', { type: 'text', class: 'mono', value: s.nf || 'General', style: { width: '100%' } });
    const preview = el('div', { class: 'preview-box mono' });
    const list = el('div', { class: 'list-box', style: { height: '180px' } });
    const updatePreview = () => {
      const v = typeof sample === 'number' ? sample : 1234.5678;
      try { preview.textContent = Fmt.formatValue(v, nfInput.value || 'General'); } catch { preview.textContent = 'Invalid format'; }
    };
    for (const [label, nf] of NUMBER_FORMATS) {
      const li = el('div', { class: 'li' + (nf === (s.nf || 'General') ? ' sel' : '') }, el('span', {}, label), el('span', { class: 'dim mono', style: { marginLeft: 'auto' } }, nf));
      li.addEventListener('click', () => { [...list.children].forEach((x) => x.classList.remove('sel')); li.classList.add('sel'); nfInput.value = nf; updatePreview(); });
      list.append(li);
    }
    nfInput.addEventListener('input', updatePreview);
    updatePreview();
    const numberPane = el('div', {}, list, el('label', { class: 'field' }, el('span', {}, 'Format code'), nfInput), el('div', { class: 'field' }, el('span', {}, 'Preview'), preview));

    // Alignment
    const ha = select([['General', ''], ['Left', 'left'], ['Center', 'center'], ['Right', 'right']], s.ha || '');
    const va = select([['Bottom', ''], ['Middle', 'middle'], ['Top', 'top']], s.va || '');
    const wrap = el('input', { type: 'checkbox', checked: !!s.wrap });
    const alignPane = el('div', {},
      el('div', { class: 'row' }, el('label', { class: 'field' }, el('span', {}, 'Horizontal'), ha), el('label', { class: 'field' }, el('span', {}, 'Vertical'), va)),
      el('label', { class: 'check' }, wrap, 'Wrap text'));

    // Font
    const ff = select(FONTS, s.ff || 'Carlito');
    const fs = el('input', { type: 'number', min: 1, max: 409, value: s.fs || 11, style: { width: '80px' } });
    const b = el('input', { type: 'checkbox', checked: !!s.b });
    const it = el('input', { type: 'checkbox', checked: !!s.i });
    const u = el('input', { type: 'checkbox', checked: !!s.u });
    const st = el('input', { type: 'checkbox', checked: !!s.st });
    const fc = el('input', { type: 'color', value: s.fc || '#000000' });
    const fcAuto = el('input', { type: 'checkbox', checked: !s.fc });
    const fontPane = el('div', {},
      el('div', { class: 'row' }, el('label', { class: 'field' }, el('span', {}, 'Font'), ff), el('label', { class: 'field' }, el('span', {}, 'Size (pt)'), fs)),
      el('div', { class: 'row' }, el('label', { class: 'check' }, b, 'Bold'), el('label', { class: 'check' }, it, 'Italic'), el('label', { class: 'check' }, u, 'Underline'), el('label', { class: 'check' }, st, 'Strikethrough')),
      el('div', { class: 'row', style: { marginTop: '10px' } }, el('span', { class: 'field-label' }, 'Color'), fc, el('label', { class: 'check' }, fcAuto, 'Automatic')));
    fc.addEventListener('input', () => (fcAuto.checked = false));

    // Border
    let preset = null;
    const bStyle = select([['Thin', 'thin'], ['Medium', 'medium'], ['Thick', 'thick'], ['Dashed', 'dashed'], ['Dotted', 'dotted'], ['Double', 'double']], 'thin');
    const bColor = el('input', { type: 'color', value: '#000000' });
    const presetRow = el('div', { class: 'row tight' });
    for (const [label, val] of [['None', 'none'], ['All', 'all'], ['Outline', 'outer'], ['Inside', 'inner'], ['Top', 'top'], ['Bottom', 'bottom'], ['Left', 'left'], ['Right', 'right']]) {
      const btn = el('button', { type: 'button', class: 'btn' }, label);
      btn.addEventListener('click', () => { preset = val; [...presetRow.children].forEach((x) => x.classList.remove('primary')); btn.classList.add('primary'); });
      presetRow.append(btn);
    }
    const borderPane = el('div', {}, el('div', { class: 'field' }, el('span', {}, 'Apply to selection'), presetRow),
      el('div', { class: 'row' }, el('label', { class: 'field' }, el('span', {}, 'Line style'), bStyle), el('label', { class: 'field' }, el('span', {}, 'Color'), bColor)));

    // Fill
    let bg = s.bg || null;
    const bgPreview = el('div', { class: 'preview-box', style: { background: bg || 'transparent' } }, 'Sample');
    const bgInput = el('input', { type: 'color', value: bg || '#ffffff' });
    const setBg = (c) => { bg = c; bgPreview.style.background = c || 'transparent'; if (c) bgInput.value = c; };
    bgInput.addEventListener('input', () => setBg(bgInput.value));
    const fillPane = el('div', {}, colorGrid(setBg), el('div', { class: 'row', style: { margin: '10px 0' } }, el('span', { class: 'field-label' }, 'Custom'), bgInput,
      el('button', { type: 'button', class: 'btn', onclick: () => setBg(null) }, 'No fill')), bgPreview);

    const ok = await dialog({
      title: 'Format Cells', width: 520,
      body: tabs([['Number', numberPane], ['Alignment', alignPane], ['Font', fontPane], ['Border', borderPane], ['Fill', fillPane]]),
    });
    if (!ok) return null;
    const patch = {
      nf: nfInput.value && nfInput.value !== 'General' ? nfInput.value : null,
      ha: ha.value || null, va: va.value || null, wrap: wrap.checked || null,
      ff: ff.value !== 'Carlito' ? ff.value : null, fs: +fs.value && +fs.value !== 11 ? +fs.value : null,
      b: b.checked || null, i: it.checked || null, u: u.checked || null, st: st.checked || null,
      fc: fcAuto.checked ? null : fc.value, bg,
    };
    return { patch, border: preset ? { preset, style: bStyle.value, color: bColor.value } : null };
  };

  /* -------------------------------------------------------------- chart */
  Dialogs.chart = async function (app, spec) {
    const isNew = !spec.id;
    let type = spec.type || 'column';
    const typeGrid = el('div', { class: 'chart-types' });
    for (const [k, t] of Object.entries(root.ChartManager.TYPES)) {
      const btn = el('button', { type: 'button', class: k === type ? 'on' : '', html: `<svg viewBox="0 0 26 22">${t.icon}</svg><span>${t.label}</span>` });
      btn.addEventListener('click', () => { type = k; [...typeGrid.children].forEach((x) => x.classList.remove('on')); btn.classList.add('on'); });
      typeGrid.append(btn);
    }
    const range = el('input', { type: 'text', class: 'mono', value: spec.range || '' });
    const title = el('input', { type: 'text', value: spec.title || '' });
    const seriesIn = select([['Columns', 'cols'], ['Rows', 'rows']], spec.seriesIn || 'cols');
    const header = el('input', { type: 'checkbox', checked: spec.header !== false });
    const stacked = el('input', { type: 'checkbox', checked: !!spec.stacked });
    const smooth = el('input', { type: 'checkbox', checked: !!spec.smooth });
    const legend = select([['Bottom', 'bottom'], ['Top', 'top'], ['Right', 'right'], ['Left', 'left'], ['Hidden', 'none']], spec.legend === false ? 'none' : spec.legendPos || 'bottom');
    const xTitle = el('input', { type: 'text', value: spec.xTitle || '' });
    const yTitle = el('input', { type: 'text', value: spec.yTitle || '' });
    const err = el('div', { class: 'err' });
    let result = null;
    const ok = await dialog({
      title: isNew ? 'Insert Chart' : 'Edit Chart', width: 500,
      body: el('div', {}, typeGrid,
        el('label', { class: 'field' }, el('span', {}, 'Data range'), range),
        el('label', { class: 'field' }, el('span', {}, 'Title'), title),
        el('div', { class: 'row' }, el('label', { class: 'field' }, el('span', {}, 'Series in'), seriesIn), el('label', { class: 'field' }, el('span', {}, 'Legend'), legend)),
        el('div', { class: 'row' }, el('label', { class: 'field', style: { flex: 1 } }, el('span', {}, 'X-axis title'), xTitle), el('label', { class: 'field', style: { flex: 1 } }, el('span', {}, 'Y-axis title'), yTitle)),
        el('div', { class: 'row' }, el('label', { class: 'check' }, header, 'First row/column is a header'), el('label', { class: 'check' }, stacked, 'Stacked'), el('label', { class: 'check' }, smooth, 'Smooth lines')),
        err),
      onOk: () => {
        if (!M.parseRange(range.value)) { err.textContent = 'Enter a valid range, such as A1:C10.'; return false; }
        result = {
          type, range: range.value.trim().toUpperCase().replace(/^(.*!)/, (m) => m), title: title.value.trim(), seriesIn: seriesIn.value,
          header: header.checked, stacked: stacked.checked, smooth: smooth.checked,
          legend: legend.value !== 'none', legendPos: legend.value === 'none' ? 'bottom' : legend.value,
          xTitle: xTitle.value.trim(), yTitle: yTitle.value.trim(),
        };
        // Preserve sheet-name case in the range.
        const g = M.parseRange(range.value);
        result.range = (g.sheet ? M.quoteSheet(g.sheet) + '!' : '') + M.rangeStr(g);
        return true;
      },
    });
    return ok ? result : null;
  };

  /* --------------------------------------------------------------- sort */
  Dialogs.sort = async function (app, g) {
    const sh = app.sheet();
    const headerGuess = (() => {
      const top = sh.cells[g.r1 + ',' + g.c1], next = sh.cells[(g.r1 + 1) + ',' + g.c1];
      return top && typeof top.v === 'string' && next && typeof next.v === 'number';
    })();
    const hasHeader = el('input', { type: 'checkbox', checked: headerGuess });
    const colName = (c, hdr) => {
      const t = sh.cells[g.r1 + ',' + c];
      return hdr && t && t.v != null ? `${M.colName(c)} — ${t.v}` : `Column ${M.colName(c)}`;
    };
    const levels = el('div');
    const addLevel = (c = g.c1, desc = false) => {
      const opts = [];
      for (let cc = g.c1; cc <= g.c2; cc++) opts.push([colName(cc, hasHeader.checked), cc]);
      const colSel = select(opts, c);
      const ord = select([['A → Z (ascending)', 'asc'], ['Z → A (descending)', 'desc']], desc ? 'desc' : 'asc');
      const rm = el('button', { type: 'button', class: 'btn', title: 'Remove level' }, '✕');
      const row = el('div', { class: 'row', style: { marginBottom: '6px' } }, el('span', { class: 'dim', style: { width: '58px' } }, levels.children.length ? 'then by' : 'Sort by'), colSel, ord, rm);
      rm.addEventListener('click', () => { if (levels.children.length > 1) row.remove(); });
      levels.append(row);
    };
    addLevel();
    hasHeader.addEventListener('change', () => {
      for (const row of levels.children) {
        const s = row.querySelector('select');
        [...s.options].forEach((o) => (o.textContent = colName(+o.value, hasHeader.checked)));
      }
    });
    const caseSens = el('input', { type: 'checkbox' });
    const ok = await dialog({
      title: `Sort range ${M.rangeStr(g)}`, width: 520,
      body: el('div', {}, el('label', { class: 'check', style: { marginBottom: '10px' } }, hasHeader, 'Data has a header row'), levels,
        el('button', { type: 'button', class: 'btn', onclick: () => addLevel() }, '+ Add sort level'),
        el('label', { class: 'check', style: { marginTop: '10px' } }, caseSens, 'Case sensitive')),
      buttons: [{ label: 'Cancel', value: null }, { label: 'Sort', value: true, primary: true }],
    });
    if (!ok) return null;
    const keys = [...levels.children].map((row) => { const [c, o] = row.querySelectorAll('select'); return { c: +c.value, desc: o.value === 'desc' }; });
    return { keys, header: hasHeader.checked, caseSensitive: caseSens.checked };
  };

  /* ---------------------------------------------------------- functions */
  Dialogs.functions = async function (app) {
    const names = root.Engine.functionNames();
    const search = el('input', { type: 'text', placeholder: 'Search functions…' });
    const list = el('div', { class: 'list-box', style: { height: '300px' } });
    let chosen = null;
    const render = () => {
      const q = search.value.trim().toUpperCase();
      list.innerHTML = '';
      const shown = names.filter((n) => !q || n.includes(q)).slice(0, 500);
      for (const n of shown) {
        const li = el('div', { class: 'li mono' + (n === chosen ? ' sel' : '') }, n);
        li.addEventListener('click', () => { chosen = n; [...list.children].forEach((x) => x.classList.remove('sel')); li.classList.add('sel'); });
        li.addEventListener('dblclick', () => { chosen = n; list.closest('.dialog').querySelector('.btn.primary').click(); });
        list.append(li);
      }
      if (!shown.includes(chosen)) chosen = shown[0] || null;
      const first = list.querySelector('.li');
      if (first && !list.querySelector('.sel')) first.classList.add('sel');
    };
    search.addEventListener('input', render);
    search.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...list.children];
        let i = items.findIndex((x) => x.classList.contains('sel'));
        i = Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
        items.forEach((x) => x.classList.remove('sel'));
        if (items[i]) { items[i].classList.add('sel'); items[i].scrollIntoView({ block: 'nearest' }); chosen = items[i].textContent; }
      }
    });
    render();
    const ok = await dialog({
      title: `Insert Function (${names.length} available)`, width: 420,
      body: el('div', {}, search, el('div', { style: { height: '8px' } }), list, el('div', { class: 'dim', style: { marginTop: '6px' } }, 'Functions follow Excel syntax. Double-click or press Enter to insert.')),
      buttons: [{ label: 'Cancel', value: null }, { label: 'Insert', value: true, primary: true }],
    });
    return ok ? chosen : null;
  };

  /* ------------------------------------------------------ find/replace */
  let findBox = null;
  Dialogs.findReplace = function (app, withReplace) {
    if (findBox) { findBox.querySelector('input').focus(); findBox.querySelector('input').select(); return; }
    const what = el('input', { type: 'text', placeholder: 'Find' });
    const repl = el('input', { type: 'text', placeholder: 'Replace with' });
    const matchCase = el('input', { type: 'checkbox' });
    const whole = el('input', { type: 'checkbox' });
    const inFormulas = el('input', { type: 'checkbox' });
    const allSheets = el('input', { type: 'checkbox' });
    const info = el('div', { class: 'dim', style: { minHeight: '18px' } });
    const replRow = el('label', { class: 'field', style: { display: withReplace ? '' : 'none' } }, el('span', {}, 'Replace with'), repl);
    const opts = () => ({ text: what.value, replace: repl.value, matchCase: matchCase.checked, whole: whole.checked, formulas: inFormulas.checked, allSheets: allSheets.checked });
    const body = el('div', { style: { width: '320px' } },
      el('label', { class: 'field' }, el('span', {}, 'Find'), what), replRow,
      el('div', { class: 'row' }, el('label', { class: 'check' }, matchCase, 'Match case'), el('label', { class: 'check' }, whole, 'Entire cell')),
      el('div', { class: 'row' }, el('label', { class: 'check' }, inFormulas, 'Search formulas'), el('label', { class: 'check' }, allSheets, 'All sheets')),
      info);
    const p = dialog({
      title: 'Find and Replace', floating: true,
      body,
      buttons: [
        { label: 'Replace', action: () => { info.textContent = app.replaceOne(opts()); }, left: true },
        { label: 'Replace All', action: () => { info.textContent = app.replaceAll(opts()); } },
        { label: 'Previous', action: () => { info.textContent = app.findNext(opts(), -1); } },
        { label: 'Next', value: true, primary: true, action: () => { info.textContent = app.findNext(opts(), 1); } },
        { label: 'Close', value: null },
      ],
      onOpen: (d) => {
        findBox = d;
        d.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault(); e.stopPropagation();
            info.textContent = e.target === repl ? app.replaceOne(opts()) : app.findNext(opts(), e.shiftKey ? -1 : 1);
          }
        }, true);
        if (withReplace) replRow.style.display = '';
        else {
          const toggle = el('button', { type: 'button', class: 'btn', style: { marginTop: '4px' } }, 'Show replace');
          toggle.addEventListener('click', () => { replRow.style.display = ''; toggle.remove(); });
          body.insertBefore(toggle, body.children[1]);
        }
        const sel = app.activeCell();
        if (sel && sel.v != null && typeof sel.v === 'string' && sel.v.length < 60) what.value = sel.v;
      },
    });
    p.then(() => { findBox = null; app.focusGrid(); });
  };
  Dialogs.findIsOpen = () => !!findBox;

  /* ------------------------------------------------------------ filter */
  Dialogs.filterPopup = function (app, c, x, y) {
    const sh = app.sheet();
    const f = sh.filter;
    const values = app.filterValues(c);
    const hidden = new Set((f.hidden && f.hidden[c]) || []);
    const search = el('input', { type: 'text', placeholder: 'Search values' });
    const list = el('div', { class: 'list-box' });
    const checks = new Map();
    const all = el('input', { type: 'checkbox', checked: hidden.size === 0 });
    const render = () => {
      list.innerHTML = '';
      const q = search.value.toLowerCase();
      list.append(el('label', { class: 'li' }, all, el('b', {}, '(Select all)')));
      for (const v of values) {
        if (q && !v.toLowerCase().includes(q)) continue;
        let cb = checks.get(v);
        if (!cb) { cb = el('input', { type: 'checkbox', checked: !hidden.has(v) }); checks.set(v, cb); }
        list.append(el('label', { class: 'li' }, cb, v === '' ? el('i', { class: 'dim' }, '(Blanks)') : v));
      }
    };
    all.addEventListener('change', () => { for (const cb of checks.values()) cb.checked = all.checked; });
    search.addEventListener('input', render);
    values.forEach((v) => checks.set(v, el('input', { type: 'checkbox', checked: !hidden.has(v) })));
    render();
    const sortBtn = (label, desc) => el('div', { class: 'li', onclick: () => { closeMenus(); app.sortFilterColumn(c, desc); } }, label);
    const apply = el('button', { class: 'btn primary' }, 'OK');
    const cancel = el('button', { class: 'btn' }, 'Cancel');
    const clear = el('button', { class: 'btn' }, 'Clear');
    apply.addEventListener('click', () => {
      const hid = [];
      for (const [v, cb] of checks) if (!cb.checked) hid.push(v);
      closeMenus();
      app.applyColumnFilter(c, hid);
    });
    cancel.addEventListener('click', closeMenus);
    clear.addEventListener('click', () => { closeMenus(); app.applyColumnFilter(c, []); });
    const pop = el('div', { class: 'filter-pop' },
      el('div', { class: 'list-box', style: { height: 'auto', border: 0 } }, sortBtn('↑  Sort A → Z', false), sortBtn('↓  Sort Z → A', true)),
      search, list, el('div', { class: 'row', style: { justifyContent: 'flex-end' } }, clear, cancel, apply));
    showPopup(pop, x, y);
    setTimeout(() => search.focus());
  };

  /* ---------------------------------------------------- remove dupes */
  Dialogs.dedupe = async function (app, g) {
    const cols = el('div', { class: 'list-box', style: { maxHeight: '220px', padding: '4px 0' } });
    const hasHeader = el('input', { type: 'checkbox', checked: true });
    const boxes = [];
    for (let c = g.c1; c <= g.c2; c++) {
      const cb = el('input', { type: 'checkbox', checked: true });
      boxes.push([c, cb]);
      const hdr = app.sheet().cells[g.r1 + ',' + c];
      cols.append(el('label', { class: 'li' }, cb, `Column ${M.colName(c)}${hdr && hdr.v != null ? ' — ' + hdr.v : ''}`));
    }
    const ok = await dialog({
      title: 'Remove Duplicates', width: 380,
      body: el('div', {}, el('label', { class: 'check', style: { marginBottom: '8px' } }, hasHeader, 'Data has a header row'), el('div', { class: 'dim' }, 'Compare these columns:'), cols),
      buttons: [{ label: 'Cancel', value: null }, { label: 'Remove', value: true, primary: true }],
    });
    if (!ok) return null;
    return { header: hasHeader.checked, cols: boxes.filter(([, cb]) => cb.checked).map(([c]) => c) };
  };

  /* ---------------------------------------------------- text to cols */
  Dialogs.textToColumns = async function () {
    const delim = select([['Comma', ','], ['Semicolon', ';'], ['Tab', '\t'], ['Space', ' '], ['Pipe |', '|'], ['Other…', 'other']], ',');
    const other = el('input', { type: 'text', style: { width: '60px' }, maxlength: 4 });
    const ok = await dialog({
      title: 'Split Text to Columns',
      body: el('div', {}, el('div', { class: 'row' }, el('label', { class: 'field' }, el('span', {}, 'Separator'), delim), el('label', { class: 'field' }, el('span', {}, 'Other'), other)),
        el('div', { class: 'dim' }, 'Splits the selected cells; results fill the columns to the right.')),
      buttons: [{ label: 'Cancel', value: null }, { label: 'Split', value: true, primary: true }],
    });
    if (!ok) return null;
    return delim.value === 'other' ? other.value || ',' : delim.value;
  };

  /* -------------------------------------------------------- shortcuts */
  Dialogs.shortcuts = function () {
    const rows = [
      ['Arrows / Tab / Enter', 'Move between cells (Shift reverses Tab/Enter)'],
      ['Shift + Arrows', 'Extend selection'], ['Ctrl + Arrows', 'Jump to edge of data'], ['Ctrl + Home / End', 'Go to A1 / last used cell'],
      ['Page Up / Down', 'Scroll a screen'], ['Alt + Page Up / Down', 'Scroll a screen sideways'], ['Ctrl + Page Up / Down', 'Previous / next sheet'],
      ['F2 or double-click', 'Edit cell'], ['Alt + Enter', 'New line inside a cell'], ['Ctrl + Enter', 'Fill selection with the entry'], ['Esc', 'Cancel editing'],
      ['F4 (while editing)', 'Cycle $ in reference'], ['Shift + Space / Ctrl + Space', 'Select row / column'], ['Ctrl + A', 'Select all'],
      ['Ctrl + C / X / V', 'Copy / cut / paste'], ['Ctrl + Shift + V', 'Paste values only'], ['Ctrl + D / R', 'Fill down / right'],
      ['Ctrl + Z / Y', 'Undo / redo'], ['Delete / Backspace', 'Clear contents'], ['Ctrl + B / I / U / 5', 'Bold / italic / underline / strike'],
      ['Ctrl + 1', 'Format cells'], ['Ctrl + Shift + 1…5', 'Number / time / date / currency / percent'], ['Ctrl + ; / Ctrl + Shift + ;', 'Insert date / time'],
      ['Alt + =', 'AutoSum'], ['Shift + F3', 'Insert function'], ['Ctrl + F / H', 'Find / replace'], ['Ctrl + G', 'Go to'],
      ['Ctrl + Shift + L', 'Toggle filter'], ['Ctrl + `', 'Show formulas'], ['F9', 'Recalculate'], ['Ctrl + = / - / 0', 'Zoom in / out / reset'],
      ['Ctrl + S / Shift + S', 'Save / save as'], ['Ctrl + O / N / P', 'Open / new window / print'],
    ];
    const table = el('table', { class: 'kbd-table' }, rows.map(([k, d]) => el('tr', {}, el('td', {}, k), el('td', {}, d))));
    return dialog({ title: 'Keyboard Shortcuts', width: 560, body: table, buttons: [{ label: 'Close', value: true, primary: true }] });
  };

  root.Dialogs = Dialogs;
})(self);

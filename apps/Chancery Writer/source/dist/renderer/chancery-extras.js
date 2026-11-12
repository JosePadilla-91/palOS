/* Chancery Writer extras (palOS): Shapes, Text Boxes, Watermark and Thesaurus.
   Shapes and text boxes go into the document as pictures (so they wrap, move, resize, print and export like any
   picture), and remember how they were made: double-click one to change it. */
(() => {
  'use strict';
  const ed = () => { try { return window.__uw.store.get().bodyEditor; } catch { return null; } };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TAG = 'chancery:';

  // ------------------------------------------------------------------ a small sheet-style dialog
  const css = document.createElement('style');
  css.textContent = `
  .cx-back { position: fixed; inset: 0; background: rgba(0,0,0,.25); z-index: 99999; display: flex; align-items: flex-start; justify-content: center; }
  .cx-dlg { margin-top: 70px; width: 560px; max-width: calc(100vw - 40px); max-height: calc(100vh - 110px); overflow: auto; background: #eef0f2; color: #1b1e22;
    border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.25); font: 13px system-ui, "Noto Sans", sans-serif; padding: 18px 20px 14px; }
  .cx-dlg h2 { font-size: 15px; margin: 0 0 12px; }
  .cx-row { display: flex; align-items: center; gap: 10px; margin: 8px 0; }
  .cx-row > label:first-child { width: 110px; flex: none; color: #4a525c; text-align: right; }
  .cx-dlg input[type=text], .cx-dlg input[type=number], .cx-dlg select, .cx-dlg textarea { font: inherit; padding: 4px 6px; border: 1px solid #b4bac1; border-radius: 5px; background: #fff; color: inherit; }
  .cx-dlg textarea { width: 100%; min-height: 70px; resize: vertical; }
  .cx-dlg input[type=number] { width: 70px; }
  .cx-dlg input[type=color] { width: 40px; height: 24px; padding: 0; border: 1px solid #b4bac1; border-radius: 4px; background: #fff; }
  .cx-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
  .cx-grid button { height: 54px; border: 1px solid #c3c9cf; border-radius: 6px; background: #fff; display: flex; align-items: center; justify-content: center; padding: 4px; }
  .cx-grid button[aria-pressed=true] { border-color: #0c76c3; box-shadow: 0 0 0 2px rgba(12,118,195,.35); }
  .cx-grid svg { width: 100%; height: 100%; }
  .cx-prev { display: flex; align-items: center; justify-content: center; height: 150px; background: repeating-conic-gradient(#e3e6e9 0 25%, #f4f5f6 0 50%) 0 0/16px 16px; border-radius: 6px; margin-top: 10px; }
  .cx-prev img { max-width: 90%; max-height: 136px; }
  .cx-acts { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
  .cx-acts button { height: 26px; padding: 0 16px; border-radius: 13px; font: inherit; }
  .cx-list { max-height: 300px; overflow: auto; background: #fff; border: 1px solid #c3c9cf; border-radius: 6px; padding: 6px 8px; }
  .cx-mean { margin: 6px 0 10px; } .cx-mean b { color: #4a525c; font-weight: 600; font-size: 12px; display: block; margin-bottom: 4px; }
  .cx-syn { display: inline-block; margin: 2px 3px; padding: 2px 9px; border-radius: 11px; border: 1px solid #c3c9cf; background: #f6f7f8; cursor: default; font: inherit; color: inherit; }
  .cx-syn:hover { background: #2f86d0; color: #fff; border-color: #2f86d0; }
  .cx-syn.opp { font-style: italic; color: #8a3a3a; }
  .cx-dim { color: #6b737c; }
  @media (prefers-color-scheme: dark) {
    .cx-dlg { background: #3b4148; color: #e9eef2; } .cx-row > label:first-child, .cx-mean b, .cx-dim { color: #b6bfc8; }
    .cx-dlg input[type=text], .cx-dlg input[type=number], .cx-dlg select, .cx-dlg textarea, .cx-list, .cx-grid button { background: #2b3036; border-color: #5a626b; color: #e9eef2; }
    .cx-syn { background: #2b3036; border-color: #5a626b; }
  }
  .uw-page-bg::after { content: var(--cx-wm, none); position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(var(--cx-wm-rot, -40deg));
    font: var(--cx-wm-weight, 700) var(--cx-wm-size, 96px) var(--cx-wm-font, "Carlito", "Liberation Sans", sans-serif); color: var(--cx-wm-color, #000);
    opacity: var(--cx-wm-opacity, .14); white-space: nowrap; pointer-events: none; letter-spacing: .04em; z-index: 0; }
  `;
  document.head.appendChild(css);

  function dialog(title, body, okLabel, onOk, extraBtns) {
    const back = document.createElement('div'); back.className = 'cx-back';
    const d = document.createElement('div'); d.className = 'cx-dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', title);
    const h = document.createElement('h2'); h.textContent = title;
    const acts = document.createElement('div'); acts.className = 'cx-acts';
    const cancel = document.createElement('button'); cancel.className = 'btn'; cancel.textContent = 'Cancel';
    const ok = document.createElement('button'); ok.className = 'btn default primary'; ok.textContent = okLabel;
    const close = () => { back.remove(); const e = ed(); if (e) e.commands.focus(); };
    cancel.onclick = close;
    ok.onclick = async () => { if ((await onOk()) !== false) close(); };
    for (const b of extraBtns || []) acts.append(b);
    if (okLabel) acts.append(cancel, ok); else { cancel.textContent = 'Close'; acts.append(cancel); }
    d.append(h, body, acts); back.append(d);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Enter' && okLabel && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); ok.click(); }
    });
    document.body.append(back);
    setTimeout(() => { const f = d.querySelector('input,select,textarea,button'); if (f) f.focus(); }, 30);
    return { close, d };
  }
  function row(label, ...ctl) { const r = document.createElement('div'); r.className = 'cx-row'; const l = document.createElement('label'); l.textContent = label; r.append(l, ...ctl); return r; }
  function input(type, value, attrs = {}) { const i = document.createElement('input'); i.type = type; i.value = value; Object.assign(i, attrs); return i; }
  function select(opts, value) { const s = document.createElement('select'); for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o); } s.value = value; return s; }
  // a colour well with a palette (WebKit on palOS draws <input type=color> as a plain text box)
  const PALETTE = ['#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff', '#1b1e22', '#5b6470', '#c00000', '#ff0000', '#ffc000', '#ffff00',
    '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0', '#4f8fd6', '#1f4f86', '#9ec2ea', '#f4b183', '#a9d18e', '#ffe699', '#f8cbad', '#d9d2e9', '#c55a11', '#806000', '#375623', '#203864'];
  function colorWell(value) {
    const wrap = document.createElement('span'); wrap.style.position = 'relative'; wrap.style.display = 'inline-flex';
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Colour');
    Object.assign(b.style, { width: '38px', height: '24px', border: '1px solid #9aa3ad', borderRadius: '5px', padding: '3px', background: '#fff' });
    const sw = document.createElement('span'); Object.assign(sw.style, { display: 'block', width: '100%', height: '100%', borderRadius: '3px', background: value });
    b.append(sw); wrap.append(b);
    let pop = null;
    Object.defineProperty(wrap, 'value', { get: () => value, set: (v) => { value = v; sw.style.background = v; } });
    b.onclick = () => {
      if (pop) { pop.remove(); pop = null; return; }
      pop = document.createElement('div');
      Object.assign(pop.style, { position: 'absolute', top: '28px', left: '0', zIndex: 5, display: 'grid', gridTemplateColumns: 'repeat(6, 20px)', gap: '4px', padding: '8px',
        background: '#fff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.3), 0 0 0 1px rgba(0,0,0,.15)' });
      for (const c of PALETTE) {
        const x = document.createElement('button'); x.type = 'button'; x.title = c;
        Object.assign(x.style, { width: '20px', height: '20px', border: c === '#ffffff' ? '1px solid #c3c9cf' : '0', borderRadius: '4px', background: c, padding: 0 });
        x.onclick = () => { wrap.value = c; pop.remove(); pop = null; wrap.dispatchEvent(new Event('input', { bubbles: true })); };
        pop.append(x);
      }
      const hex = input('text', value); hex.style.gridColumn = '1 / -1'; hex.style.width = '100%';
      hex.addEventListener('change', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { wrap.value = hex.value; wrap.dispatchEvent(new Event('input', { bubbles: true })); } });
      pop.append(hex); wrap.append(pop);
    };
    return wrap;
  }
  function check(label, on) { const l = document.createElement('label'); const c = input('checkbox', ''); c.checked = !!on; l.append(c, ' ' + label); l.style.display = 'flex'; l.style.gap = '4px'; l.style.alignItems = 'center'; return [l, c]; }

  // ------------------------------------------------------------------ shapes
  const SHAPES = {
    rect: { label: 'Rectangle', path: (w, h, s) => `M${s} ${s}H${w - s}V${h - s}H${s}Z` },
    round: { label: 'Rounded rectangle', path: (w, h, s) => { const r = Math.min(w, h) * .16; return `M${s + r} ${s}H${w - s - r}Q${w - s} ${s} ${w - s} ${s + r}V${h - s - r}Q${w - s} ${h - s} ${w - s - r} ${h - s}H${s + r}Q${s} ${h - s} ${s} ${h - s - r}V${s + r}Q${s} ${s} ${s + r} ${s}Z`; } },
    ellipse: { label: 'Oval', path: (w, h, s) => `M${w / 2} ${s}A${w / 2 - s} ${h / 2 - s} 0 1 1 ${w / 2 - .01} ${s}Z` },
    triangle: { label: 'Triangle', path: (w, h, s) => `M${w / 2} ${s}L${w - s} ${h - s}H${s}Z` },
    diamond: { label: 'Diamond', path: (w, h, s) => `M${w / 2} ${s}L${w - s} ${h / 2}L${w / 2} ${h - s}L${s} ${h / 2}Z` },
    hexagon: { label: 'Hexagon', path: (w, h, s) => `M${w * .25} ${s}H${w * .75}L${w - s} ${h / 2}L${w * .75} ${h - s}H${w * .25}L${s} ${h / 2}Z` },
    arrowR: { label: 'Arrow right', path: (w, h, s) => `M${s} ${h * .3}H${w * .62}V${s}L${w - s} ${h / 2}L${w * .62} ${h - s}V${h * .7}H${s}Z` },
    arrowL: { label: 'Arrow left', path: (w, h, s) => `M${w - s} ${h * .3}H${w * .38}V${s}L${s} ${h / 2}L${w * .38} ${h - s}V${h * .7}H${w - s}Z` },
    star: { label: 'Star', path: (w, h, s) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .4 : 1; p.push(`${w / 2 + (w / 2 - s) * r * Math.cos(a)} ${h / 2 + (h / 2 - s) * r * Math.sin(a) + (h * .04)}`); } return 'M' + p.join('L') + 'Z'; } },
    callout: { label: 'Speech bubble', path: (w, h, s) => { const b = h * .75, r = Math.min(w, b) * .14; return `M${s + r} ${s}H${w - s - r}Q${w - s} ${s} ${w - s} ${s + r}V${b - r}Q${w - s} ${b} ${w - s - r} ${b}H${w * .38}L${w * .2} ${h - s}L${w * .24} ${b}H${s + r}Q${s} ${b} ${s} ${b - r}V${s + r}Q${s} ${s} ${s + r} ${s}Z`; } },
    heart: { label: 'Heart', path: (w, h, s) => `M${w / 2} ${h - s}C${w * .1} ${h * .62} ${s} ${h * .38} ${s} ${h * .27}C${s} ${h * .06} ${w * .3} ${s} ${w / 2} ${h * .22}C${w * .7} ${s} ${w - s} ${h * .06} ${w - s} ${h * .27}C${w - s} ${h * .38} ${w * .9} ${h * .62} ${w / 2} ${h - s}Z` },
    line: { label: 'Line', path: (w, h, s) => `M${s} ${h / 2}H${w - s}`, open: true },
  };
  const FONTS = ['Carlito', 'Caladea', 'Liberation Sans', 'Liberation Serif', 'Noto Sans', 'Noto Serif', 'DejaVu Sans', 'DejaVu Serif', 'Liberation Mono'];

  function svgOf(sp) {
    const W = Math.max(8, +sp.w || 160), H = Math.max(8, +sp.h || 100);
    const shape = SHAPES[sp.shape] || SHAPES.rect, sw = Math.max(0, +sp.stroke || 0), s = sw / 2 + .5;
    const fill = sp.fill === 'none' || shape.open ? 'none' : sp.fill;
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    if (sp.shape !== 'none') out += `<path d="${shape.path(W, H, s)}" fill="${fill}" stroke="${sw ? sp.line : 'none'}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    if (sp.text) {
      const size = +sp.size || 16, lh = size * 1.25, lines = wrapLines(sp.text, sp, W - 2 * (+sp.pad || 10));
      const textH = lines.length * lh, top = sp.valign === 'top' ? (+sp.pad || 10) : sp.valign === 'bottom' ? H - (+sp.pad || 10) - textH : (H - textH) / 2;
      const anchor = sp.align === 'left' ? 'start' : sp.align === 'right' ? 'end' : 'middle';
      const x = sp.align === 'left' ? (+sp.pad || 10) : sp.align === 'right' ? W - (+sp.pad || 10) : W / 2;
      out += `<text font-family="${esc(sp.font || 'Carlito')}" font-size="${size}" fill="${sp.color || '#000'}" text-anchor="${anchor}"${sp.bold ? ' font-weight="700"' : ''}${sp.italic ? ' font-style="italic"' : ''}>`;
      lines.forEach((l, i) => { out += `<tspan x="${x}" y="${top + i * lh + size * .95}">${esc(l) || ' '}</tspan>`; });
      out += '</text>';
    }
    return out + '</svg>';
  }
  const measure = document.createElement('canvas').getContext('2d');
  function wrapLines(text, sp, width) {
    measure.font = `${sp.italic ? 'italic ' : ''}${sp.bold ? '700 ' : ''}${+sp.size || 16}px "${sp.font || 'Carlito'}"`;
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(/(\s+)/)) {
        const t = line + word;
        if (line && measure.measureText(t.trimEnd()).width > width) { out.push(line.trimEnd()); line = word.trimStart(); } else line = t;
      }
      out.push(line);
    }
    return out;
  }
  // a picture of the SVG (PNG, twice the size for sharp printing): Word and the other formats all take PNG
  function render(sp) {
    return new Promise((resolve, reject) => {
      const svg = svgOf(sp), img = new Image();
      img.onload = () => {
        const k = 2, c = document.createElement('canvas'); c.width = Math.ceil(+sp.w * k); c.height = Math.ceil(+sp.h * k);
        const g = c.getContext('2d'); g.scale(k, k); g.drawImage(img, 0, 0, +sp.w, +sp.h);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  async function place(sp, existingPos) {
    const e = ed(); if (!e) return;
    await document.fonts.ready;
    const src = await render(sp);
    const attrs = { src, width: +sp.w, height: +sp.h, alt: sp.text ? sp.text.slice(0, 200) : (SHAPES[sp.shape] || {}).label || 'Shape', name: TAG + JSON.stringify(sp) };
    if (existingPos != null) {
      e.chain().focus().setNodeSelection(existingPos).updateImage(attrs).run();
    } else {
      e.chain().focus().insertImage({ ...attrs, wrap: sp.kind === 'text' ? 'right' : 'inline' }).run();
    }
  }

  function shapeDialog(kind, sp0, pos) {
    const text = kind === 'text';
    const sp = Object.assign(text
      ? { kind: 'text', shape: 'rect', w: 220, h: 110, fill: '#ffffff', line: '#5b6470', stroke: 1, text: '', font: 'Carlito', size: 14, color: '#1b1e22', align: 'left', valign: 'top', pad: 10 }
      : { kind: 'shape', shape: 'round', w: 160, h: 100, fill: '#4f8fd6', line: '#1f4f86', stroke: 2, text: '', font: 'Carlito', size: 16, color: '#ffffff', align: 'center', valign: 'middle', pad: 10 }, sp0 || {});
    const body = document.createElement('div');
    const prev = document.createElement('div'); prev.className = 'cx-prev'; const pimg = document.createElement('img'); prev.append(pimg);
    const upd = () => { pimg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgOf(sp)); };
    if (!text) {
      const grid = document.createElement('div'); grid.className = 'cx-grid';
      for (const [k, v] of Object.entries(SHAPES)) {
        const b = document.createElement('button'); b.type = 'button'; b.title = v.label; b.setAttribute('aria-label', v.label);
        b.innerHTML = svgOf({ shape: k, w: 60, h: 40, fill: '#9ec2ea', line: '#1f4f86', stroke: 2 });
        b.setAttribute('aria-pressed', String(k === sp.shape));
        b.onclick = () => { sp.shape = k; for (const x of grid.children) x.setAttribute('aria-pressed', String(x === b)); upd(); };
        grid.append(b);
      }
      body.append(grid);
    }
    const ta = document.createElement('textarea'); ta.value = sp.text; ta.placeholder = text ? 'Type the text for the box' : 'Text inside the shape (optional)';
    ta.oninput = () => { sp.text = ta.value; upd(); };
    body.append(ta);
    const fill = colorWell(sp.fill === 'none' ? '#ffffff' : sp.fill), [nofillL, nofill] = check('None', sp.fill === 'none');
    const line = colorWell(sp.line), sw = input('number', sp.stroke, { min: 0, max: 20 });
    const w = input('number', sp.w, { min: 10, max: 1200 }), h = input('number', sp.h, { min: 10, max: 1600 });
    const font = select(FONTS.map((f) => [f, f]), sp.font), size = input('number', sp.size, { min: 6, max: 200 }), color = colorWell(sp.color);
    const [bL, bold] = check('Bold', sp.bold), [iL, ital] = check('Italic', sp.italic);
    const align = select([['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], sp.align), valign = select([['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']], sp.valign);
    body.append(
      row('Size (points)', w, document.createTextNode('×'), h),
      row('Fill', fill, nofillL),
      row('Outline', line, sw, document.createTextNode('pt')),
      row('Text', font, size, color, bL, iL),
      row('Text position', align, valign),
      prev);
    const sync = () => {
      Object.assign(sp, { fill: nofill.checked ? 'none' : fill.value, line: line.value, stroke: +sw.value, w: +w.value, h: +h.value, font: font.value, size: +size.value,
        color: color.value, bold: bold.checked, italic: ital.checked, align: align.value, valign: valign.value });
      upd();
    };
    for (const c of [fill, nofill, line, sw, w, h, font, size, color, bold, ital, align, valign]) c.addEventListener('input', sync);
    upd();
    dialog(pos != null ? (text ? 'Edit Text Box' : 'Edit Shape') : (text ? 'Insert Text Box' : 'Insert Shape'), body, pos != null ? 'Update' : 'Insert', async () => { sync(); await place(sp, pos); });
  }

  // double-click a shape or text box to change it
  document.addEventListener('dblclick', (ev) => {
    const img = ev.target && ev.target.closest && ev.target.closest('.ProseMirror img');
    if (!img) return;
    const e = ed(); if (!e) return;
    let pos;
    try { pos = e.view.posAtDOM(img, 0); } catch { return; }
    let node = e.state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'image') { node = e.state.doc.nodeAt(pos - 1); pos = pos - 1; }
    if (!node || node.type.name !== 'image' || !String(node.attrs.name || '').startsWith(TAG)) return;
    ev.preventDefault(); ev.stopPropagation();
    let sp; try { sp = JSON.parse(node.attrs.name.slice(TAG.length)); } catch { return; }
    if (node.attrs.width) { const k = node.attrs.width / sp.w; sp.w = Math.round(node.attrs.width); sp.h = Math.round((node.attrs.height || sp.h * k)); }
    shapeDialog(sp.kind, sp, pos);
  }, true);

  // ------------------------------------------------------------------ watermark (stored with the document)
  function settings() { const e = ed(); return (e && e.state.doc.attrs.settings) || {}; }
  function setSetting(k, v) {
    const e = ed(); if (!e) return;
    const s = { ...settings(), [k]: v };
    e.view.dispatch(e.state.tr.setDocAttribute('settings', s));
  }
  function applyWatermark() {
    const wm = settings().watermark, r = document.documentElement.style;
    if (!wm || !wm.text) { r.removeProperty('--cx-wm'); return; }
    r.setProperty('--cx-wm', JSON.stringify(String(wm.text)));
    r.setProperty('--cx-wm-color', wm.color || '#000000');
    r.setProperty('--cx-wm-opacity', String((wm.opacity ?? 14) / 100));
    r.setProperty('--cx-wm-rot', wm.layout === 'horizontal' ? '0deg' : '-40deg');
    r.setProperty('--cx-wm-font', `"${wm.font || 'Carlito'}"`);
    r.setProperty('--cx-wm-size', (wm.size || 96) + 'px');
  }
  function watermarkDialog() {
    const wm = Object.assign({ text: '', color: '#000000', opacity: 14, layout: 'diagonal', font: 'Carlito', size: 96 }, settings().watermark || {});
    const body = document.createElement('div');
    const preset = select([['', 'No watermark'], ['CONFIDENTIAL', 'CONFIDENTIAL'], ['DRAFT', 'DRAFT'], ['DO NOT COPY', 'DO NOT COPY'], ['SAMPLE', 'SAMPLE'], ['URGENT', 'URGENT'], ['custom', 'Other text…']],
      !wm.text ? '' : ['CONFIDENTIAL', 'DRAFT', 'DO NOT COPY', 'SAMPLE', 'URGENT'].includes(wm.text) ? wm.text : 'custom');
    const txt = input('text', wm.text, { placeholder: 'Watermark text' }); txt.style.flex = '1';
    const font = select(FONTS.map((f) => [f, f]), wm.font), size = input('number', wm.size, { min: 24, max: 240 });
    const color = colorWell(wm.color), op = input('range', wm.opacity, { min: 4, max: 60 });
    const layout = select([['diagonal', 'Diagonal'], ['horizontal', 'Across']], wm.layout);
    const note = document.createElement('p'); note.className = 'cx-dim'; note.textContent = 'It sits behind the text on every page, and prints and goes into PDFs with the document.';
    const showTxt = () => { txt.parentElement.style.display = preset.value === 'custom' ? '' : 'none'; };
    body.append(row('Watermark', preset), row('Text', txt), row('Font', font, size, document.createTextNode('pt')), row('Colour', color, document.createTextNode('Faint'), op, document.createTextNode('Strong')), row('Layout', layout), note);
    preset.oninput = showTxt; showTxt();
    dialog('Watermark', body, 'OK', () => {
      const t = preset.value === 'custom' ? txt.value.trim() : preset.value;
      setSetting('watermark', t ? { text: t, color: color.value, opacity: +op.value, layout: layout.value, font: font.value, size: +size.value } : null);
      applyWatermark();
    });
  }

  // ------------------------------------------------------------------ thesaurus
  function wordAtCursor(e) {
    const { from, to, empty } = e.state.selection;
    if (!empty) return { from, to, text: e.state.doc.textBetween(from, to, ' ').trim() };
    const $p = e.state.selection.$from;
    let d = $p.depth; while (d > 0 && !$p.node(d).isTextblock) d--;
    const blockStart = $p.start(d), blockEnd = $p.end(d);
    // one character per position (pictures and other inline things count as one), so offsets line up
    const par = e.state.doc.textBetween(blockStart, blockEnd, '\ufffc', '\ufffc'), off = $p.pos - blockStart;
    const isW = (c) => /[\p{L}\p{M}'’-]/u.test(c);
    let a = off, b = off;
    while (a > 0 && isW(par[a - 1])) a--;
    while (b < par.length && isW(par[b])) b++;
    const start = blockStart;
    return { from: start + a, to: start + b, text: par.slice(a, b).replace(/^['’-]+|['’-]+$/g, '') };
  }
  async function thesaurus() {
    const e = ed(); if (!e) return;
    const w = wordAtCursor(e);
    const lang = (e.state.doc.attrs.meta && e.state.doc.attrs.meta.language) || navigator.language || 'en-US';
    const body = document.createElement('div');
    const q = input('text', w.text, { placeholder: 'Look up a word' }); q.style.flex = '1';
    const go = document.createElement('button'); go.className = 'btn'; go.textContent = 'Look Up';
    const list = document.createElement('div'); list.className = 'cx-list';
    const hint = document.createElement('p'); hint.className = 'cx-dim'; hint.textContent = 'Click a word to put it in place of the one in your document.';
    body.append(row('Word', q, go), list, hint);
    let range = w;
    const show = async () => {
      list.textContent = 'Looking up…';
      const word = q.value.trim();
      if (!word) { list.textContent = ''; return; }
      let r = await window.chancery.thesaurus(word, lang);
      if (r.ok && !r.meanings.length && /s$/i.test(word)) r = await window.chancery.thesaurus(word.replace(/e?s$/i, ''), lang);   // plurals
      list.textContent = '';
      if (!r.ok) { list.textContent = r.error === 'nolist' ? 'There’s no thesaurus for this document’s language yet.' : 'The thesaurus couldn’t be read.'; return; }
      if (!r.meanings.length) { list.textContent = `No words found for “${word}”.`; return; }
      for (const m of r.meanings) {
        const box = document.createElement('div'); box.className = 'cx-mean';
        const b = document.createElement('b'); b.textContent = { noun: 'Noun', verb: 'Verb', adj: 'Adjective', adv: 'Adverb' }[m.pos] || m.pos; box.append(b);
        for (const s of m.words) {
          const opp = / \(opposite\)$/.test(s), plain = s.replace(/ \(opposite\)$/, '');
          const c = document.createElement('button'); c.type = 'button'; c.className = 'cx-syn' + (opp ? ' opp' : ''); c.textContent = plain; if (opp) c.title = 'Opposite';
          c.onclick = () => replace(plain);
          c.ondblclick = () => { q.value = plain; show(); };
          box.append(c);
        }
        list.append(box);
      }
    };
    const replace = (word) => {
      const e2 = ed(); if (!e2) return;
      // keep the capital letter the original word had
      const orig = range.text || '';
      if (orig && orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase()) word = word[0].toUpperCase() + word.slice(1);
      // plain text in place of the word, keeping its formatting (bold, font, colour)
      const size = () => e2.state.doc.content.size;
      const after = range.to < size() ? e2.state.doc.textBetween(range.to, range.to + 1, ' ', ' ') : '';
      const tr = range.to > range.from ? e2.state.tr.insertText(word, range.from, range.to) : e2.state.tr.insertText(word);
      e2.view.dispatch(tr.scrollIntoView());
      e2.commands.focus();
      // never lose the space that followed the word
      setTimeout(() => {
        const end = range.from + word.length;
        const now = end < size() ? e2.state.doc.textBetween(end, end + 1, ' ', ' ') : '';
        if (/\s/.test(after) && !/\s/.test(now)) e2.view.dispatch(e2.state.tr.insertText(after, end, end));
      }, 60);
      dlg.close();
    };
    go.onclick = show;
    q.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); show(); } });
    const dlg = dialog('Thesaurus', body, null, null);
    show();
  }

  // ------------------------------------------------------------------ hooks
  window.chanceryExtras = { shape: () => shapeDialog('shape'), textBox: () => shapeDialog('text'), watermark: watermarkDialog, thesaurus };
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && !e.shiftKey && e.key === 'F7') { e.preventDefault(); thesaurus(); }
    if (e.ctrlKey && e.altKey && (e.key === 'x' || e.key === 'X')) { e.preventDefault(); shapeDialog('text'); }
  });
  // the watermark follows the open document (opening, undo, switching windows)
  let hooked = null;
  setInterval(() => {
    const e = ed();
    if (e && e !== hooked) { hooked = e; e.on('transaction', applyWatermark); applyWatermark(); }
  }, 700);
})();

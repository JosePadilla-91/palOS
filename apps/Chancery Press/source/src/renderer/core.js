/* Chancery Press - core: state, render, selection, gestures */
(function () {
  const IN = P.IN;
  const S = P.S = { doc: null, page: 0, sel: [], zoom: 1, tool: 'select', path: null, dirty: false, hist: [], fut: [], clip: null, editing: null, mode: 'pro', gesture: false };
  const $ = P.$ = (s, r) => (r || document).querySelector(s);
  P.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = P.esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  P.clamp = clamp;

  // ---------- history ----------
  const snap = () => JSON.stringify(Object.assign({}, S.doc, { assets: undefined }));
  P.checkpoint = () => { S.hist.push(snap()); if (S.hist.length > 100) S.hist.shift(); S.fut = []; P.markDirty(); };
  P.markDirty = () => { S.dirty = true; P.updateTitle(); };
  function restore(str) {
    const assets = S.doc.assets;
    S.doc = JSON.parse(str); S.doc.assets = assets;
    S.page = clamp(S.page, 0, S.doc.pages.length - 1);
    S.sel = S.sel.filter(id => P.find(id));
    P.markDirty(); P.render();
  }
  P.undo = () => { if (S.editing) return document.execCommand('undo'); if (!S.hist.length) return; S.fut.push(snap()); restore(S.hist.pop()); };
  P.redo = () => { if (S.editing) return document.execCommand('redo'); if (!S.fut.length) return; S.hist.push(snap()); restore(S.fut.pop()); };

  // ---------- lookups ----------
  P.find = (id) => { for (let pi = 0; pi < S.doc.pages.length; pi++) { const o = S.doc.pages[pi].objs.find(x => x.id === id); if (o) return { o, pi }; } return null; };
  P.curObjs = () => S.doc.pages[S.page].objs;
  P.selObjs = () => S.sel.map(id => P.find(id)).filter(Boolean).filter(r => r.pi === S.page).map(r => r.o);
  P.pageW = () => S.doc.w * IN; P.pageH = () => S.doc.h * IN;
  P.live = () => { const m = S.doc.setup.margins; return { x: m.l * IN, y: m.t * IN, w: P.pageW() - (m.l + m.r) * IN, h: P.pageH() - (m.t + m.b) * IN }; };
  P.colRects = () => {
    const L = P.live(), n = Math.max(1, S.doc.setup.cols | 0), g = S.doc.setup.gutter * IN, cw = (L.w - g * (n - 1)) / n;
    return Array.from({ length: n }, (_, i) => [L.x + i * (cw + g), L.x + i * (cw + g) + cw]);
  };
  P.colSpan = (from, n) => { const c = P.colRects(); from = clamp(from, 0, c.length - 1); n = clamp(n, 1, c.length - from); return { x: c[from][0], w: c[from + n - 1][1] - c[from][0] }; };
  P.panels = () => { // fold panels in px, rows x cols
    const d = S.doc.setup.divide || { v: [], h: [] }, W = P.pageW(), H = P.pageH();
    const xs = [0, ...d.v.map(f => f * W), W], ys = [0, ...d.h.map(f => f * H), H], out = [];
    for (let r = 0; r < ys.length - 1; r++) for (let c = 0; c < xs.length - 1; c++) out.push({ x: xs[c], y: ys[r], w: xs[c + 1] - xs[c], h: ys[r + 1] - ys[r], n: out.length + 1 });
    return out;
  };

  // ---------- css helpers ----------
  P.outDims = () => { const st = S.doc.setup, b = st.bleed || 0, sl = st.marks ? 0.3 : 0, off = b + sl; return { w: S.doc.w + 2 * off, h: S.doc.h + 2 * off, off, b, sl }; };
  P.mergeText = (t) => {
    const m = S.merge; if (!m || !m.on || !m.rows.length) return t;
    const row = m.rows[Math.min(m.idx, m.rows.length - 1)] || {};
    return String(t).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (a, k) => (row[k] != null ? row[k] : a));
  };
  P.subst = (html, pi) => P.mergeText(String(html || '')).replace(/\{page\}/g, pi + 1).replace(/\{pages\}/g, S.doc.pages.length)
    .replace(/\{date\}/g, new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  const textCss = (p) => `font-family:${P.fontStack(p.font)};font-size:${p.size}pt;color:${p.color};font-weight:${p.bold ? 700 : 400};font-style:${p.italic ? 'italic' : 'normal'};text-decoration:${p.underline ? 'underline' : 'none'};text-align:${p.align};line-height:${p.lh};letter-spacing:${p.ls || 0}px;${p.upper ? 'text-transform:uppercase;' : ''}${p.tstroke ? `-webkit-text-stroke:${p.tstroke}px ${p.tstrokeC || '#000'};` : ''}${p.tshadow ? 'text-shadow:2px 3px 4px rgba(0,0,0,.45);' : ''}`;
  P.textCss = textCss;
  const colsCss = (o) => o.cols > 1 ? `column-count:${o.cols};column-gap:${o.gap}px;${o.rule ? 'column-rule:1px solid #000;' : ''}column-fill:auto;height:100%;` : '';
  P.colsCss = colsCss;
  const gradCss = (o) => o.fill2 && o.fill ? `linear-gradient(${o.gdir || 0}deg,${o.fill},${o.fill2})` : '';
  const boxCss = (o) => { let c = ''; const g = gradCss(o); if (g) c += 'background:' + g + ';'; else if (o.fill) c += 'background:' + o.fill + ';'; if (o.strokeW) c += `border:${o.strokeW}px ${o.bstyle || 'solid'} ${o.stroke || '#000'};`; if (o.radius) c += `border-radius:${o.radius}px;`; return c; };

  function shapeSvg(o) {
    const w = Math.max(1, o.w), h = Math.max(1, o.h), sw = o.strokeW || 0, i = sw / 2;
    const f = o.fill || 'none', s = o.stroke && sw ? o.stroke : 'none', d = o.dash ? ` stroke-dasharray="${o.dash}"` : '';
    let defs = '', fillv = f;
    if (o.fill2 && o.fill) { const a = (o.gdir || 0) * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), gid = 'g' + o.id; defs = `<defs><linearGradient id="${gid}" x1="${.5 - .5 * dx}" y1="${.5 - .5 * dy}" x2="${.5 + .5 * dx}" y2="${.5 + .5 * dy}"><stop offset="0" stop-color="${o.fill}"/><stop offset="1" stop-color="${o.fill2}"/></linearGradient></defs>`; fillv = `url(#${gid})`; }
    const at = `fill="${fillv}" stroke="${s}" stroke-width="${sw}"${d} stroke-linejoin="round"`;
    let body = '';
    const pts = (a) => `<polygon points="${a.map(p => p.join(',')).join(' ')}" ${at}/>`;
    switch (o.kind) {
      case 'ellipse': body = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${Math.max(0, w / 2 - i)}" ry="${Math.max(0, h / 2 - i)}" ${at}/>`; break;
      case 'triangle': body = pts([[w / 2, i], [w - i, h - i], [i, h - i]]); break;
      case 'diamond': body = pts([[w / 2, i], [w - i, h / 2], [w / 2, h - i], [i, h / 2]]); break;
      case 'hexagon': body = pts([[w * .25, i], [w * .75, i], [w - i, h / 2], [w * .75, h - i], [w * .25, h - i], [i, h / 2]]); break;
      case 'star': { const a = []; for (let k = 0; k < 10; k++) { const r = k % 2 ? .42 : 1, t = -Math.PI / 2 + k * Math.PI / 5; a.push([(w / 2 + Math.cos(t) * r * (w / 2 - i)).toFixed(1), (h / 2 + Math.sin(t) * r * (h / 2 - i)).toFixed(1)]); } body = pts(a); break; }
      case 'arrow': body = pts([[i, h * .3], [w * .6, h * .3], [w * .6, i], [w - i, h / 2], [w * .6, h - i], [w * .6, h * .7], [i, h * .7]]); break;
      case 'heart': body = `<path d="M${w / 2} ${h - i} C ${-w * .15} ${h * .45}, ${w * .2} ${-h * .1}, ${w / 2} ${h * .3} C ${w * .8} ${-h * .1}, ${w * 1.15} ${h * .45}, ${w / 2} ${h - i} Z" ${at}/>`; break;
      case 'pentagon': { const a = []; for (let k = 0; k < 5; k++) { const t = -Math.PI / 2 + k * 2 * Math.PI / 5; a.push([(w / 2 + Math.cos(t) * (w / 2 - i)).toFixed(1), (h / 2 + Math.sin(t) * (h / 2 - i)).toFixed(1)]); } body = pts(a); break; }
      case 'octagon': { const a = []; for (let k = 0; k < 8; k++) { const t = Math.PI / 8 + k * Math.PI / 4; a.push([(w / 2 + Math.cos(t) * (w / 2 - i) / Math.cos(Math.PI / 8)).toFixed(1), (h / 2 + Math.sin(t) * (h / 2 - i) / Math.cos(Math.PI / 8)).toFixed(1)]); } body = pts(a.map(p => [Math.max(i, Math.min(w - i, p[0])), Math.max(i, Math.min(h - i, p[1]))])); break; }
      case 'cross': body = pts([[w * .35, i], [w * .65, i], [w * .65, h * .35], [w - i, h * .35], [w - i, h * .65], [w * .65, h * .65], [w * .65, h - i], [w * .35, h - i], [w * .35, h * .65], [i, h * .65], [i, h * .35], [w * .35, h * .35]]); break;
      case 'burst': { const a = []; for (let k = 0; k < 24; k++) { const r = k % 2 ? .78 : 1, t = -Math.PI / 2 + k * Math.PI / 12; a.push([(w / 2 + Math.cos(t) * r * (w / 2 - i)).toFixed(1), (h / 2 + Math.sin(t) * r * (h / 2 - i)).toFixed(1)]); } body = pts(a); break; }
      case 'callout': body = pts([[i, i], [w - i, i], [w - i, h * .74], [w * .45, h * .74], [w * .2, h - i], [w * .27, h * .74], [i, h * .74]]); break;
      case 'ribbon': body = pts([[i, h * .2], [w * .12, h * .2], [w * .12, i], [w * .88, i], [w * .88, h * .2], [w - i, h * .2], [w * .92, h * .5], [w - i, h * .8], [w * .88, h * .8], [w * .88, h - i], [w * .12, h - i], [w * .12, h * .8], [i, h * .8], [w * .08, h * .5]]); break;
      case 'line': body = `<line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="${o.stroke || '#000'}" stroke-width="${sw || 1}"${d}/>`; break;
      default: { const r = Math.min(o.radius || 0, w / 2, h / 2); body = `<rect x="${i}" y="${i}" width="${Math.max(0, w - sw)}" height="${Math.max(0, h - sw)}" rx="${r}" ${at}/>`; }
    }
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block;overflow:visible">${defs}${body}</svg>`;
  }

  function tableHtml(o) {
    const cells = o.cells || [];
    let h = '<table>';
    for (let r = 0; r < o.rows; r++) {
      h += '<tr>';
      for (let c = 0; c < o.cols; c++) {
        const head = o.head && r === 0, v = (cells[r] && cells[r][c]) || '';
        h += `<td style="border-color:${o.border};${head ? `background:${o.headFill};color:${o.headColor};font-weight:700;` : ''}">${esc(v)}</td>`;
      }
      h += '</tr>';
    }
    return h + '</table>';
  }

  // ---------- object element ----------
  function objEl(o, pi, master) {
    const el = document.createElement('div');
    el.className = 'obj t-' + o.type + (o.locked ? ' locked' : '') + (master ? ' master' : '');
    el.dataset.id = o.id;
    el.style.cssText = `left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;opacity:${o.opacity};` + (o.rot ? `transform:rotate(${o.rot}deg);` : '') + (o.shadow ? 'filter:drop-shadow(3px 4px 5px rgba(0,0,0,.35));' : '');
    const ct = document.createElement('div'); ct.className = 'ct'; el.appendChild(ct);
    if (o.type === 'text') {
      ct.style.cssText = `display:flex;flex-direction:column;justify-content:${{ top: 'flex-start', middle: 'center', bottom: 'flex-end' }[o.valign] || 'flex-start'};${boxCss(o)}`;
      const tx = document.createElement('div'); tx.className = 'tx';
      tx.style.cssText = textCss(o) + colsCss(o) + `padding:${o.pad}px;`;
      tx.innerHTML = P.subst(o.html, pi);
      if (o.fit) el.dataset.fit = '1';
      ct.appendChild(tx);
    } else if (o.type === 'story') {
      const st = S.doc.stories[o.storyId] || P.STORY_DEF;
      ct.style.cssText = boxCss(o);
      const tx = document.createElement('div'); tx.className = 'tx story-ct' + (st.dropcap ? ' dc' : '');
      tx.style.cssText = `position:absolute;left:${o.pad}px;top:${o.pad}px;right:${o.pad}px;bottom:${o.pad}px;overflow:hidden;` + textCss(Object.assign({}, st, { bold: st.bold, italic: st.italic })) + colsCss(Object.assign({}, o, { cols: o.cols })).replace('height:100%;', '') + `--ti:${st.indent ? st.size * 1.5 : 0}pt;--ps:${st.pspace || 0}px;` + (st.hyph ? 'hyphens:auto;' : '');
      tx.lang = 'en';
      ct.appendChild(tx);
    } else if (o.type === 'shape') {
      ct.innerHTML = shapeSvg(o); ct.style.overflow = 'visible';
    } else if (o.type === 'image') {
      const src = o.asset && S.doc.assets[o.asset];
      ct.style.cssText = `${o.radius ? `border-radius:${o.radius}px;` : ''}${o.strokeW ? `border:${o.strokeW}px solid ${o.stroke || '#000'};` : ''}`;
      if (src) {
        const img = document.createElement('img'); img.src = src; img.draggable = false;
        const px = o.px == null ? 50 : o.px, py = o.py == null ? 50 : o.py, zm = o.zoom || 1;
        img.style.cssText = `width:100%;height:100%;display:block;object-fit:${o.fit};object-position:${px}% ${py}%;transform-origin:${px}% ${py}%;transform:${o.flip ? 'scaleX(-1) ' : ''}scale(${zm});${P.filterCss(o.filter)}`;
        ct.appendChild(img);
      } else {
        ct.innerHTML = '<div class="ph" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#e8e4dc;border:2px dashed #aaa;color:#777;font:600 13px sans-serif;text-align:center;gap:4px"><span style="font-size:28px">🖼</span><span>Double-click to add a picture</span></div>';
      }
    } else if (o.type === 'table') {
      ct.innerHTML = tableHtml(o);
      ct.style.cssText = `font-family:${P.fontStack(o.font)};font-size:${o.size}pt;color:${o.color};background:#fff;`;
    }
    return el;
  }
  P.objEl = objEl; P.shapeSvg = shapeSvg;
  P.drawRulers = function () {
    const hc = $('#rulerh canvas'), vc = $('#rulerv canvas'), sc = $('#scroller'), pg = pageEl(); if (!hc || !vc || !pg || !sc.clientWidth) return;
    const sr = sc.getBoundingClientRect(), pr = pg.getBoundingClientRect(), z = pr.width / P.pageW(), ppi = IN * z, cs = getComputedStyle(document.body);
    const dim = cs.getPropertyValue('--dim').trim() || '#888', bg = cs.getPropertyValue('--panel2').trim() || '#eee', dpr = window.devicePixelRatio || 1;
    const draw = (cv, len, origin, horiz, pageLen) => {
      const T = 18; cv.width = (horiz ? len : T) * dpr; cv.height = (horiz ? T : len) * dpr; cv.style.width = (horiz ? len : T) + 'px'; cv.style.height = (horiz ? T : len) + 'px';
      const g = cv.getContext('2d'); g.scale(dpr, dpr); g.fillStyle = bg; g.fillRect(0, 0, 9999, 9999);
      g.fillStyle = 'rgba(181,101,29,.22)'; if (horiz) g.fillRect(origin, 0, pageLen * z, T); else g.fillRect(0, origin, T, pageLen * z);
      g.strokeStyle = dim; g.fillStyle = dim; g.font = '9px sans-serif'; g.lineWidth = 1;
      const sub = ppi > 260 ? 16 : ppi > 120 ? 8 : ppi > 56 ? 4 : ppi > 28 ? 2 : 1, step = ppi / sub;
      for (let k = Math.floor(-origin / step); k <= Math.ceil((len - origin) / step); k++) {
        const pos = origin + k * step, major = k % sub === 0, half = sub > 1 && k % (sub / 2) === 0, th = major ? T : half ? 10 : 5;
        g.beginPath(); if (horiz) { g.moveTo(pos + .5, T); g.lineTo(pos + .5, T - th); } else { g.moveTo(T, pos + .5); g.lineTo(T - th, pos + .5); } g.stroke();
        if (major && k >= 0) { const lab = String(k / sub); if (horiz) g.fillText(lab, pos + 3, 9); else { g.save(); g.translate(9, pos - 3); g.rotate(-Math.PI / 2); g.fillText(lab, 0, 0); g.restore(); } }
      }
    };
    draw(hc, sc.clientWidth, pr.left - sr.left, true, P.pageW()); draw(vc, sc.clientHeight, pr.top - sr.top, false, P.pageH());
  };
  P.filterCss = (f) => ({ grayscale: 'filter:grayscale(1);', newsprint: 'filter:grayscale(1) contrast(1.45) brightness(.98);', sepia: 'filter:sepia(.9);', contrast: 'filter:contrast(1.4);', invert: 'filter:invert(1);' }[f] || '');

  // ---------- pages ----------
  function buildGuides(page) {
    const set = S.doc.setup, W = P.pageW(), H = P.pageH(), g = document.createElement('div');
    g.className = 'guides guide'; g.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5000;';
    const add = (cls, css, txt) => { const d = document.createElement('div'); d.className = 'guide ' + cls; d.style.cssText = css; if (txt) d.textContent = txt; g.appendChild(d); return d; };
    if (set.showGrid) add('g-grid', `inset:0;background-size:${set.grid * IN}px ${set.grid * IN}px;`);
    const L = P.live();
    if (set.cols > 1) P.colRects().forEach(c => add('g-col', `left:${c[0]}px;top:${L.y}px;width:${c[1] - c[0]}px;height:${L.h}px;`));
    add('g-margin', `left:${L.x}px;top:${L.y}px;width:${L.w}px;height:${L.h}px;`);
    if (set.bleed > 0) { const b = set.bleed * IN; add('g-bleed', `left:${-b}px;top:${-b}px;width:${W + 2 * b}px;height:${H + 2 * b}px;border:1px dashed #e33;`); }
    (set.guides || []).forEach((gd, gi) => {
      const el = add('g-user', gd.a === 'x'
        ? `left:${gd.p - 3}px;top:0;bottom:0;width:7px;cursor:col-resize;pointer-events:auto;background:linear-gradient(90deg,transparent 3px,#0aa6a6 3px,#0aa6a6 4px,transparent 4px);`
        : `top:${gd.p - 3}px;left:0;right:0;height:7px;cursor:row-resize;pointer-events:auto;background:linear-gradient(180deg,transparent 3px,#0aa6a6 3px,#0aa6a6 4px,transparent 4px);`);
      el.dataset.gi = gi;
    });
    const d = set.divide || { v: [], h: [] };
    if (d.v.length || d.h.length) {
      const safe = (d.safe || 0) * IN;
      P.panels().forEach(p => {
        if (safe > 0) add('g-safe', `left:${p.x + safe}px;top:${p.y + safe}px;width:${Math.max(0, p.w - safe * 2)}px;height:${Math.max(0, p.h - safe * 2)}px;border:1px dashed rgba(224,64,122,.35);`);
        const lab = add('g-panellabel', `left:${p.x + p.w / 2}px;top:${p.y + 4}px;transform:translateX(-50%);`, 'Panel ' + p.n); lab.style.zIndex = 5;
      });
      d.v.forEach(f => add('g-fold', `left:${f * W - 1}px;top:0;bottom:0;`));
      d.h.forEach(f => add('g-foldh', `top:${f * H - 1}px;left:0;right:0;`));
    }
    return g;
  }

  function cropMarks() {
    const o = P.outDims(), off = o.off * IN, gap = (o.b || 0) * IN + 3, len = 16, W = P.pageW(), H = P.pageH();
    const m = document.createElement('div'); m.className = 'marks';
    const ln = (x, y, w, h) => `<i style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:#000"></i>`;
    let h = '';
    [[off, off, -1, -1], [off + W, off, 1, -1], [off, off + H, -1, 1], [off + W, off + H, 1, 1]].forEach(([x, y, sx, sy]) => {
      h += ln(sx < 0 ? x - gap - len : x + gap, y, len, .75) + ln(x, sy < 0 ? y - gap - len : y + gap, .75, len);
    });
    m.innerHTML = h; return m;
  }
  P.buildPages = function () {
    const root = $('#pages'); root.innerHTML = ''; root.style.zoom = S.zoom;
    const set = S.doc.setup, d = set.divide || { v: [], h: [] }, hasFold = d.v.length || d.h.length;
    S.doc.pages.forEach((pg, pi) => {
      const wrap = document.createElement('div'); wrap.className = 'pagewrap'; wrap.dataset.pi = pi;
      const head = document.createElement('div'); head.className = 'pagehead'; head.style.width = P.pageW() + 'px';
      head.innerHTML = `<span>Page ${pi + 1} of ${S.doc.pages.length}</span>` + (hasFold ? `<span class="foldnote">Dotted pink fold lines are guides only - they will NOT be printed</span>` : '');
      const page = document.createElement('div'); page.className = 'page' + (pi === S.page ? ' cur' : ''); page.dataset.pi = pi;
      page.style.cssText = `width:${P.pageW()}px;height:${P.pageH()}px;background:${set.bg || '#fff'};`;
      const bl = set.bleed || 0;
      const clip = document.createElement('div'); clip.className = 'pageclip'; clip.style.inset = (-bl * IN) + 'px';
      const layer = document.createElement('div'); layer.className = 'layer'; layer.style.inset = (bl * IN) + 'px';
      S.doc.pages.forEach((pg2, pj) => { if (pj !== pi) pg2.objs.forEach(o => { if (o.allPages) layer.appendChild(objEl(o, pi, true)); }); });
      pg.objs.forEach((o, z) => { const el = objEl(o, pi, false); el.style.zIndex = z + 1; layer.appendChild(el); });
      clip.appendChild(layer); page.appendChild(clip); page.appendChild(buildGuides(pg));
      wrap.appendChild(head); wrap.appendChild(page);
      if (set.marks) wrap.appendChild(cropMarks());
      root.appendChild(wrap);
    });
    document.body.classList.toggle('hide-guides', !!S.hideGuides);
  };

  // text auto-fit for posters/headlines
  const fitCache = new Map();
  P.fitTexts = function () {
    P.$$('.obj[data-fit="1"]').forEach(el => {
      const o = P.find(el.dataset.id); if (!o) return;
      const tx = el.querySelector('.tx'), ct = el.querySelector('.ct');
      const sig = [o.o.html, o.o.font, o.o.w, o.o.h, o.o.bold, o.o.italic, o.o.lh, o.o.ls, o.o.pad, o.o.strokeW, o.o.upper].join('|');
      const c = fitCache.get(o.o.id);
      if (c && c.sig === sig) { tx.style.fontSize = c.size + 'pt'; return; }
      let lo = 4, hi = 700;
      for (let i = 0; i < 16; i++) {
        const m = (lo + hi) / 2; tx.style.fontSize = m + 'pt';
        if (tx.scrollHeight > ct.clientHeight + 1 || tx.scrollWidth > ct.clientWidth + 1) hi = m; else lo = m;
      }
      tx.style.fontSize = lo + 'pt'; fitCache.set(o.o.id, { sig, size: lo });
    });
  };

  let thumbT = null;
  P.render = function (opts) {
    opts = opts || {};
    if (S.editing) return;
    P.buildPages(); P.reflowStories(); P.fitTexts(); P.updateSel(); P.status();
    if (!opts.noInspector) P.renderInspector();
    clearTimeout(thumbT); thumbT = setTimeout(P.renderThumbs, 180);
  };
  let rt = null;
  P.renderSoon = (opts) => { clearTimeout(rt); rt = setTimeout(() => P.render(opts), 90); };

  P.renderThumbs = function () {
    const box = $('#ltab-pages'); if (!box || !S.doc) return;
    box.innerHTML = '';
    const tw = 150, sc = tw / P.pageW();
    P.$$('#pages .page').forEach((pg, pi) => {
      const t = document.createElement('div'); t.className = 'thumb' + (pi === S.page ? ' cur' : ''); t.dataset.pi = pi;
      const tb = document.createElement('div'); tb.className = 'tb'; tb.style.cssText = `width:${tw}px;height:${P.pageH() * sc}px`;
      const c = pg.cloneNode(true); c.classList.remove('cur'); c.style.transform = `scale(${sc})`; c.querySelectorAll('.guide,#selbox').forEach(x => x.remove());
      tb.appendChild(c); t.appendChild(tb);
      const sm = document.createElement('small'); sm.textContent = 'Page ' + (pi + 1); t.appendChild(sm);
      t.onclick = () => P.gotoPage(pi, true);
      box.appendChild(t);
    });
    const b = document.createElement('div'); b.className = 'btnrow'; b.style.justifyContent = 'center';
    b.innerHTML = '<button data-act="page-add">＋ Add page</button>'; box.appendChild(b);
  };

  P.status = function () {
    const d = S.doc; if (!d) return;
    $('#st-info').textContent = `Page ${S.page + 1}/${d.pages.length}  -  ${+d.w.toFixed(2)} x ${+d.h.toFixed(2)} in  -  ${Math.round(S.zoom * 100)}%`;
    $('#zoomlabel').textContent = Math.round(S.zoom * 100) + '%';
    if (P.drawRulers) P.drawRulers();
  };
  P.updateTitle = function () {
    const name = (S.path ? S.path.split('/').pop() : 'Untitled') + (S.dirty ? ' *' : '');
    document.title = name + ' - Chancery Press';
    if (window.press) press.setTitle(document.title);
  };

  P.gotoPage = function (pi, scroll) {
    pi = clamp(pi, 0, S.doc.pages.length - 1);
    if (pi !== S.page) { S.page = pi; S.sel = []; }
    P.$$('#pages .page').forEach((p, i) => p.classList.toggle('cur', i === pi));
    P.$$('.thumb').forEach((t, i) => t.classList.toggle('cur', i === pi));
    if (scroll) { const pg = P.$$('#pages .page')[pi]; if (pg) pg.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    P.updateSel(); P.status(); P.renderInspector();
  };

  P.setZoom = function (z) {
    const sc = $('#scroller'), cx = sc.scrollLeft + sc.clientWidth / 2, cy = sc.scrollTop + sc.clientHeight / 2, old = S.zoom;
    S.zoom = clamp(z, .1, 4); $('#pages').style.zoom = S.zoom;
    sc.scrollLeft = cx * S.zoom / old - sc.clientWidth / 2; sc.scrollTop = cy * S.zoom / old - sc.clientHeight / 2;
    P.status();
  };
  P.zoomFit = function () {
    const sc = $('#scroller'), z = Math.min((sc.clientWidth - 90) / P.pageW(), (sc.clientHeight - 110) / P.pageH());
    S.zoom = clamp(z, .1, 4); $('#pages').style.zoom = S.zoom; P.status();
    const pg = P.$$('#pages .page')[S.page]; if (pg) pg.scrollIntoView({ block: 'center', inline: 'center' });
  };

  // ---------- selection ----------
  const expandGroups = (ids) => {
    const out = new Set(ids);
    P.curObjs().forEach(o => { if (o.group && ids.some(i => { const r = P.find(i); return r && r.o.group === o.group; })) out.add(o.id); });
    return [...out];
  };
  P.select = (ids) => { S.sel = expandGroups(ids); P.updateSel(); P.renderInspector(); };
  const bbox = (objs) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    objs.forEach(o => { x0 = Math.min(x0, o.x); y0 = Math.min(y0, o.y); x1 = Math.max(x1, o.x + o.w); y1 = Math.max(y1, o.y + o.h); });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  P.bbox = bbox;
  const pageEl = () => P.$$('#pages .page')[S.page];
  const elOf = (id) => { const pg = pageEl(); return pg && pg.querySelector(`.obj[data-id="${id}"]:not(.master)`); };
  P.elOf = elOf;

  P.updateSel = function () {
    P.$$('.obj.sel').forEach(e => e.classList.remove('sel'));
    P.$$('#selbox').forEach(e => e.remove());
    const objs = P.selObjs(); if (!objs.length) return;
    objs.forEach(o => { const e = elOf(o.id); if (e) e.classList.add('sel'); });
    const pg = pageEl(); if (!pg) return;
    const single = objs.length === 1, b = single ? objs[0] : bbox(objs);
    const sb = document.createElement('div'); sb.id = 'selbox'; sb.className = 'guide';
    sb.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;` + (single && b.rot ? `transform:rotate(${b.rot}deg);` : '');
    const locked = objs.every(o => o.locked);
    if (!locked) {
      [['nw', 0, 0, 'nwse'], ['n', 50, 0, 'ns'], ['ne', 100, 0, 'nesw'], ['e', 100, 50, 'ew'], ['se', 100, 100, 'nwse'], ['s', 50, 100, 'ns'], ['sw', 0, 100, 'nesw'], ['w', 0, 50, 'ew']].forEach(([n, x, y, cur]) => {
        const h = document.createElement('div'); h.className = 'h'; h.dataset.h = n;
        h.style.cssText = `left:calc(${x}% - 5px);top:calc(${y}% - 5px);cursor:${cur}-resize;`; sb.appendChild(h);
      });
      if (single) { sb.insertAdjacentHTML('beforeend', '<div class="rotline"></div><div class="rot" data-h="rot"></div>'); }
    }
    pg.appendChild(sb);
  };

  // ---------- adding / editing objects ----------
  P.addObj = function (o, opts) {
    opts = opts || {};
    P.checkpoint();
    S.doc.pages[S.page].objs.push(o);
    S.sel = [o.id]; P.render();
    if (opts.edit && o.type === 'text') P.startEdit(o.id, true);
    return o;
  };

  P.addAsset = (dataUrl) => { const id = P.uid('a'); S.doc.assets[id] = dataUrl; return id; };

  P.startEdit = function (id, selectAll) {
    const el = elOf(id), r = P.find(id); if (!el || !r) return;
    const o = r.o;
    if (o.locked) return;
    if (o.type === 'story') { P.focusStory(); return; }
    if (o.type === 'image') return P.pickImageInto(o);
    if (o.type !== 'text' && o.type !== 'table') return;
    P.stopEdit();
    const tx = o.type === 'text' ? el.querySelector('.tx') : el.querySelector('.ct');
    el.classList.add('editing');
    if (o.type === 'text') { tx.innerHTML = o.html; tx.style.fontSize = ''; tx.style.fontSize = o.size + 'pt'; el.removeAttribute('data-fit'); }
    else tx.querySelectorAll('td').forEach(td => td.contentEditable = 'true');
    if (o.type === 'text') tx.contentEditable = 'true';
    S.editing = { id, tx, type: o.type, before: o.type === 'text' ? o.html : JSON.stringify(o.cells) };
    tx.focus();
    if (selectAll && o.type === 'text') { const rg = document.createRange(); rg.selectNodeContents(tx); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); }
    tx.addEventListener('paste', pasteText);
    tx.addEventListener('blur', onBlurEdit);
    $('#st-hint').textContent = 'Editing text - click outside or press Esc when done';
  };
  function pasteText(e) {
    const cd = e.clipboardData; if (!cd) return;
    if ([...cd.items].some(i => i.type.startsWith('image/'))) return;
    e.preventDefault(); document.execCommand('insertText', false, cd.getData('text/plain'));
  }
  function onBlurEdit() { setTimeout(() => { if (!document.activeElement || !S.editing || !S.editing.tx.contains(document.activeElement)) { if (document.activeElement && document.activeElement.closest('#right, #toolbar')) return; P.stopEdit(); } }, 30); }
  P.stopEdit = function () {
    const ed = S.editing; if (!ed) return;
    S.editing = null;
    const r = P.find(ed.id);
    if (r) {
      if (ed.type === 'text') {
        const html = ed.tx.innerHTML.replace(/<script[\s\S]*?<\/script>/gi, '');
        if (html !== ed.before) { S.editing = null; P.checkpoint(); r.o.html = html; }
      } else {
        const cells = P.$$('tr', ed.tx).map(tr => P.$$('td', tr).map(td => td.innerText));
        if (JSON.stringify(cells) !== ed.before) { P.checkpoint(); r.o.cells = cells; }
      }
    }
    $('#st-hint').textContent = '';
    P.render();
  };

  P.deleteSel = function () {
    const ids = new Set(S.sel); if (!ids.size) return;
    P.checkpoint();
    S.doc.pages.forEach(pg => { pg.objs = pg.objs.filter(o => !(ids.has(o.id) && !o.locked)); });
    P.cleanStories(); S.sel = []; P.render();
  };
  P.cleanStories = function () {
    const alive = new Set(); S.doc.pages.forEach(pg => pg.objs.forEach(o => alive.add(o.id)));
    for (const k of Object.keys(S.doc.stories)) {
      const st = S.doc.stories[k]; st.chain = st.chain.filter(id => alive.has(id));
      if (!st.chain.length) delete S.doc.stories[k];
    }
  };

  // clone objects (new ids), carrying their stories
  P.cloneObjs = function (objs, dx, dy) {
    const map = {}, gmap = {}, out = [], newStories = {};
    objs.forEach(o => {
      const c = JSON.parse(JSON.stringify(o)); c.id = P.uid(); map[o.id] = c.id;
      if (c.group) c.group = gmap[c.group] || (gmap[c.group] = P.uid('g'));
      c.x += dx || 0; c.y += dy || 0; c.locked = false; out.push(c);
    });
    const done = {};
    out.forEach(c => {
      if (c.type !== 'story' || done[c.storyId]) return;
      const old = S.doc.stories[c.storyId]; if (!old) return;
      const sid = P.uid('s'); done[c.storyId] = sid;
      const ns = JSON.parse(JSON.stringify(old)); ns.chain = old.chain.filter(id => map[id]).map(id => map[id]);
      newStories[sid] = ns;
    });
    out.forEach(c => { if (c.type === 'story') c.storyId = done[c.storyId] || c.storyId; });
    return { objs: out, stories: newStories };
  };
  P.duplicate = function () {
    const sel = P.selObjs(); if (!sel.length) return;
    P.checkpoint();
    const r = P.cloneObjs(sel, 20, 20);
    S.doc.pages[S.page].objs.push(...r.objs); Object.assign(S.doc.stories, r.stories);
    S.sel = r.objs.map(o => o.id); P.render();
  };
  P.copy = function () {
    const sel = P.selObjs(); if (!sel.length) return false;
    const r = P.cloneObjs(sel, 0, 0); S.clip = { objs: r.objs, stories: r.stories }; return true;
  };
  P.cut = () => { if (P.copy()) P.deleteSel(); };
  P.paste = function () {
    if (!S.clip) return;
    P.checkpoint();
    const sel = S.clip.objs;
    // re-clone so pasting twice works
    const tmpStories = S.doc.stories; S.doc.stories = Object.assign({}, tmpStories, S.clip.stories);
    const r = P.cloneObjs(sel, 24, 24);
    S.doc.stories = tmpStories; Object.assign(S.doc.stories, r.stories);
    S.doc.pages[S.page].objs.push(...r.objs); S.sel = r.objs.map(o => o.id); P.render();
  };

  P.group = function () { const s = P.selObjs(); if (s.length < 2) return; P.checkpoint(); const g = P.uid('g'); s.forEach(o => o.group = g); P.render({ noInspector: false }); };
  P.ungroup = function () { const s = P.selObjs(); if (!s.length) return; P.checkpoint(); s.forEach(o => o.group = null); P.render(); };
  P.order = function (how) {
    const arr = P.curObjs(), ids = new Set(S.sel); if (!ids.size) return;
    P.checkpoint();
    const sel = arr.filter(o => ids.has(o.id)), rest = arr.filter(o => !ids.has(o.id));
    let out;
    if (how === 'front') out = rest.concat(sel);
    else if (how === 'back') out = sel.concat(rest);
    else {
      out = arr.slice();
      const idx = out.map((o, i) => ids.has(o.id) ? i : -1).filter(i => i >= 0);
      if (how === 'forward') idx.reverse().forEach(i => { if (i < out.length - 1 && !ids.has(out[i + 1].id)) { [out[i], out[i + 1]] = [out[i + 1], out[i]]; } });
      else idx.forEach(i => { if (i > 0 && !ids.has(out[i - 1].id)) { [out[i], out[i - 1]] = [out[i - 1], out[i]]; } });
    }
    S.doc.pages[S.page].objs = out; P.render();
  };
  P.align = function (how) {
    const s = P.selObjs().filter(o => !o.locked); if (!s.length) return;
    P.checkpoint();
    const area = s.length > 1 ? bbox(s) : { x: 0, y: 0, w: P.pageW(), h: P.pageH() };
    s.forEach(o => {
      if (how === 'l') o.x = area.x; if (how === 'c') o.x = area.x + (area.w - o.w) / 2; if (how === 'r') o.x = area.x + area.w - o.w;
      if (how === 't') o.y = area.y; if (how === 'm') o.y = area.y + (area.h - o.h) / 2; if (how === 'b') o.y = area.y + area.h - o.h;
    });
    if ((how === 'dh' || how === 'dv') && s.length > 2) {
      const k = how === 'dh' ? 'x' : 'y', sz = how === 'dh' ? 'w' : 'h', a = s.slice().sort((p, q) => p[k] - q[k]);
      const total = a[a.length - 1][k] + a[a.length - 1][sz] - a[0][k], used = a.reduce((t, o) => t + o[sz], 0), gap = (total - used) / (a.length - 1);
      let pos = a[0][k]; a.forEach(o => { o[k] = pos; pos += o[sz] + gap; });
    }
    P.render();
  };

  // ---------- gestures ----------
  const pt = (e, pg) => { const r = pg.getBoundingClientRect(), sc = r.width / P.pageW(); return { x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc, sc }; };
  const drag = (move, up) => {
    S.gesture = true;
    const mm = (e) => move(e);
    const mu = (e) => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); S.gesture = false; up && up(e); };
    window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu);
  };

  function targets(excl) {
    const set = S.doc.setup, W = P.pageW(), H = P.pageH(), L = P.live();
    const xs = [0, W / 2, W, L.x, L.x + L.w], ys = [0, H / 2, H, L.y, L.y + L.h];
    P.colRects().forEach(c => { xs.push(c[0], c[1]); });
    (set.guides || []).forEach(g => (g.a === 'x' ? xs : ys).push(g.p));
    const d = set.divide || { v: [], h: [] }, safe = (d.safe || 0) * IN;
    d.v.forEach(f => { xs.push(f * W, f * W - safe, f * W + safe); }); d.h.forEach(f => { ys.push(f * H, f * H - safe, f * H + safe); });
    if (d.v.length || d.h.length) P.panels().forEach(p => { xs.push(p.x + safe, p.x + p.w - safe, p.x + p.w / 2); ys.push(p.y + safe, p.y + p.h - safe, p.y + p.h / 2); });
    P.curObjs().forEach(o => { if (excl.includes(o.id)) return; xs.push(o.x, o.x + o.w / 2, o.x + o.w); ys.push(o.y, o.y + o.h / 2, o.y + o.h); });
    return { xs, ys };
  }
  const snapAxis = (vals, tg, th) => { let best = null; vals.forEach(v => tg.forEach(t => { const d = t - v; if (Math.abs(d) <= th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t }; })); return best; };
  const clearSmart = () => P.$$('.g-smart').forEach(e => e.remove());
  const showSmart = (pg, x, y) => {
    clearSmart();
    if (x != null) { const d = document.createElement('div'); d.className = 'guide g-smart'; d.style.cssText = `left:${x}px;top:0;width:1px;height:100%;`; pg.appendChild(d); }
    if (y != null) { const d = document.createElement('div'); d.className = 'guide g-smart'; d.style.cssText = `top:${y}px;left:0;height:1px;width:100%;`; pg.appendChild(d); }
  };

  function beginMove(e, pg) {
    const objs = P.selObjs().filter(o => !o.locked); if (!objs.length) return;
    const orig = objs.map(o => ({ o, x: o.x, y: o.y })), p0 = pt(e, pg), bb = bbox(objs), tg = targets(objs.map(o => o.id));
    let ck = false;
    drag(ev => {
      let dx = (ev.clientX - e.clientX) / p0.sc, dy = (ev.clientY - e.clientY) / p0.sc;
      if (!ck) { if (Math.hypot(dx, dy) < 3) return; ck = true; P.checkpoint(); }
      if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      let gx = null, gy = null;
      if (S.doc.setup.snap && !ev.altKey) {
        const th = 7 / p0.sc, bx = snapAxis([bb.x + dx, bb.x + bb.w / 2 + dx, bb.x + bb.w + dx], tg.xs, th), by = snapAxis([bb.y + dy, bb.y + bb.h / 2 + dy, bb.y + bb.h + dy], tg.ys, th);
        if (bx) { dx += bx.d; gx = bx.t; } if (by) { dy += by.d; gy = by.t; }
      }
      orig.forEach(s => { s.o.x = s.x + dx; s.o.y = s.y + dy; const el = elOf(s.o.id); if (el) { el.style.left = s.o.x + 'px'; el.style.top = s.o.y + 'px'; } });
      showSmart(pg, gx, gy); P.updateSel(); P.reflowStories();
    }, () => { clearSmart(); if (ck) { P.render(); } });
  }

  function beginResize(e, pg, handle) {
    const objs = P.selObjs().filter(o => !o.locked); if (!objs.length) return;
    const single = objs.length === 1, p0 = pt(e, pg), b0 = single ? { x: objs[0].x, y: objs[0].y, w: objs[0].w, h: objs[0].h } : bbox(objs);
    const orig = objs.map(o => ({ o, x: o.x, y: o.y, w: o.w, h: o.h })), rot = single ? (objs[0].rot || 0) * Math.PI / 180 : 0;
    const sx = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0, sy = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0;
    const tg = targets(objs.map(o => o.id)); let ck = false;
    drag(ev => {
      let dx = (ev.clientX - e.clientX) / p0.sc, dy = (ev.clientY - e.clientY) / p0.sc;
      if (!ck) { ck = true; P.checkpoint(); }
      const cos = Math.cos(-rot), sin = Math.sin(-rot);
      let lx = dx * cos - dy * sin, ly = dx * sin + dy * cos, gx = null, gy = null;
      if (!rot && S.doc.setup.snap && !ev.altKey) {
        const th = 7 / p0.sc;
        if (sx) { const b = snapAxis([b0.x + (sx > 0 ? b0.w : 0) + lx], tg.xs, th); if (b) { lx += b.d; gx = b.t; } }
        if (sy) { const b = snapAxis([b0.y + (sy > 0 ? b0.h : 0) + ly], tg.ys, th); if (b) { ly += b.d; gy = b.t; } }
      }
      let nw = Math.max(8, b0.w + sx * lx), nh = Math.max(8, b0.h + sy * ly);
      if (ev.shiftKey && sx && sy) { const k = Math.max(nw / b0.w, nh / b0.h); nw = b0.w * k; nh = b0.h * k; }
      if (!sx) nw = b0.w; if (!sy) nh = b0.h;
      const cdx = sx ? (nw - b0.w) / 2 * sx : 0, cdy = sy ? (nh - b0.h) / 2 * sy : 0;
      const wx = cdx * Math.cos(rot) - cdy * Math.sin(rot), wy = cdx * Math.sin(rot) + cdy * Math.cos(rot);
      const cx = b0.x + b0.w / 2 + wx, cy = b0.y + b0.h / 2 + wy, nb = { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
      if (single) { const o = objs[0]; Object.assign(o, nb); }
      else { const fx = nb.w / b0.w, fy = nb.h / b0.h; orig.forEach(s => { s.o.x = nb.x + (s.x - b0.x) * fx; s.o.y = nb.y + (s.y - b0.y) * fy; s.o.w = s.w * fx; s.o.h = s.h * fy; }); }
      objs.forEach(o => { const el = elOf(o.id); if (el) { el.style.left = o.x + 'px'; el.style.top = o.y + 'px'; el.style.width = o.w + 'px'; el.style.height = o.h + 'px'; const sv = el.querySelector('svg'); if (sv && o.type === 'shape') { el.querySelector('.ct').innerHTML = shapeSvg(o); } } });
      showSmart(pg, gx, gy); P.updateSel(); P.reflowStories();
    }, () => { clearSmart(); P.render(); });
  }

  function beginRotate(e, pg) {
    const o = P.selObjs()[0]; if (!o || o.locked) return;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2; let ck = false;
    drag(ev => {
      if (!ck) { ck = true; P.checkpoint(); }
      const p = pt(ev, pg); let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
      if (ev.shiftKey) a = Math.round(a / 15) * 15;
      o.rot = Math.round(a * 10) / 10; if (o.rot > 180) o.rot -= 360;
      const el = elOf(o.id); if (el) el.style.transform = `rotate(${o.rot}deg)`; P.updateSel();
    }, () => P.render());
  }

  function beginGuideMove(e, pg, gi) {
    const g = S.doc.setup.guides[gi]; if (!g) return; let ck = false; const p0 = pt(e, pg), start = g.p;
    drag(ev => {
      const p = pt(ev, pg); if (!ck) { if (Math.abs((g.a === 'x' ? p.x : p.y) - (g.a === 'x' ? p0.x : p0.y)) < 2) return; ck = true; P.checkpoint(); }
      g.p = Math.round((g.a === 'x' ? p.x : p.y) * 10) / 10;
      const el = pg.querySelector(`.g-user[data-gi="${gi}"]`); if (el) { if (g.a === 'x') el.style.left = (g.p - 3) + 'px'; else el.style.top = (g.p - 3) + 'px'; }
    }, () => { if (ck) { const lim = g.a === 'x' ? P.pageW() : P.pageH(); if (g.p < 0 || g.p > lim) S.doc.setup.guides.splice(gi, 1); P.render(); } });
  }
  P.beginRulerDrag = function (e, axis) { // axis 'y' = from top ruler (horizontal guide)
    const pg = pageEl(); if (!pg || S.tool !== 'select') return; e.preventDefault();
    const ghost = document.createElement('div'); ghost.className = 'guide'; ghost.style.cssText = 'position:absolute;background:#0aa6a6;z-index:9999;pointer-events:none;' + (axis === 'x' ? 'top:0;bottom:0;width:1px;' : 'left:0;right:0;height:1px;'); pg.appendChild(ghost);
    drag(ev => { const p = pt(ev, pg); if (axis === 'x') ghost.style.left = p.x + 'px'; else ghost.style.top = p.y + 'px'; },
      ev => { ghost.remove(); const p = pt(ev, pg), v = Math.round((axis === 'x' ? p.x : p.y) * 10) / 10, lim = axis === 'x' ? P.pageW() : P.pageH();
        if (v > 0 && v < lim) { P.checkpoint(); S.doc.setup.guides = S.doc.setup.guides || []; S.doc.setup.guides.push({ a: axis, p: v }); P.render(); } });
  };

  function beginMarquee(e, pg, add) {
    const p0 = pt(e, pg), box = document.createElement('div'); box.id = 'marquee'; box.className = 'guide'; pg.appendChild(box);
    const base = add ? S.sel.slice() : [];
    drag(ev => {
      const p = pt(ev, pg), x = Math.min(p0.x, p.x), y = Math.min(p0.y, p.y), w = Math.abs(p.x - p0.x), h = Math.abs(p.y - p0.y);
      box.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
      const hit = P.curObjs().filter(o => o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y).map(o => o.id);
      S.sel = expandGroups(base.concat(hit)); P.updateSel();
    }, () => { box.remove(); P.renderInspector(); });
  }

  const DRAW = { text: 'text', story: 'story', rect: 'shape', ellipse: 'shape', line: 'shape', star: 'shape' };
  P.makeObjForTool = function (tool, x, y, w, h) {
    const c = P.live();
    if (tool === 'text') return P.mk('text', { x, y, w, h, html: 'Type here', size: 18 });
    if (tool === 'story') { const sid = P.uid('s'); const o = P.mk('story', { x, y, w, h, storyId: sid }); S.doc.stories[sid] = Object.assign({}, P.STORY_DEF, { text: P.lorem(Math.max(60, Math.round(w * h / 200)), 2), chain: [o.id] }); return o; }
    if (tool === 'line') return P.mk('shape', { kind: 'line', x, y, w, h: 4, stroke: '#111111', strokeW: 3, fill: '' });
    if (tool === 'shape:rounded') return P.mk('shape', { kind: 'rect', radius: 24, x, y, w, h });
    if (tool.startsWith('shape:')) return P.mk('shape', { kind: tool.slice(6), x, y, w, h });
    return P.mk('shape', { kind: tool, x, y, w, h });
  };
  function beginDraw(e, pg) {
    const tool = S.tool, p0 = pt(e, pg), ghost = document.createElement('div'); ghost.className = 'guide'; ghost.style.cssText = 'position:absolute;border:1px dashed #2f7fd1;background:rgba(47,127,209,.1);z-index:9500;pointer-events:none;'; pg.appendChild(ghost);
    drag(ev => {
      const p = pt(ev, pg); let x = Math.min(p0.x, p.x), y = Math.min(p0.y, p.y), w = Math.abs(p.x - p0.x), h = Math.abs(p.y - p0.y);
      if (tool === 'line') h = 0;
      ghost.style.cssText += `left:${x}px;top:${y}px;width:${w}px;height:${Math.max(h, 2)}px;`;
    }, (ev) => {
      ghost.remove();
      const p = pt(ev, pg); let x = Math.min(p0.x, p.x), y = Math.min(p0.y, p.y), w = Math.abs(p.x - p0.x), h = Math.abs(p.y - p0.y);
      const small = w < 12 && h < 12;
      const dflt = { text: [260, 80], story: [300, 360], rect: [180, 120], ellipse: [160, 160], star: [150, 150], line: [240, 4] }[tool] || [160, 160];
      if (small) { w = dflt[0]; h = dflt[1]; x = p0.x; y = p0.y; }
      if (tool === 'line' && !small) h = 4;
      const o = P.makeObjForTool(tool, x, y, Math.max(w, 10), Math.max(h, 4));
      S.tool = 'select'; P.syncTools();
      P.addObj(o, { edit: tool === 'text' });
    });
  }
  P.syncTools = () => P.$$('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === S.tool));

  function onDown(e) {
    if (e.button !== 0) return;
    const pg = e.target.closest('.page'); if (!pg) { return; }
    const pi = +pg.dataset.pi;
    if (S.editing && S.editing.tx.contains(e.target)) return;
    if (S.editing) P.stopEdit();
    if (pi !== S.page) { S.page = pi; S.sel = []; P.$$('#pages .page').forEach((p, i) => p.classList.toggle('cur', i === pi)); P.updateSel(); P.status(); }
    const pgNow = P.$$('#pages .page')[S.page];
    if (S.tool !== 'select') { e.preventDefault(); return beginDraw(e, pgNow); }
    const gu = e.target.closest('.g-user'); if (gu) { e.preventDefault(); return beginGuideMove(e, pgNow, +gu.dataset.gi); }
    const h = e.target.closest('[data-h]');
    if (h) { e.preventDefault(); return h.dataset.h === 'rot' ? beginRotate(e, pgNow) : beginResize(e, pgNow, h.dataset.h); }
    if (e.target.closest('.ovf')) return;
    const oe = e.target.closest('.obj:not(.master)');
    if (oe) {
      const id = oe.dataset.id;
      if (e.shiftKey) { S.sel = S.sel.includes(id) ? S.sel.filter(i => i !== id) : expandGroups(S.sel.concat(id)); P.updateSel(); P.renderInspector(); return; }
      if (!S.sel.includes(id)) { S.sel = expandGroups([id]); P.updateSel(); P.renderInspector(); }
      e.preventDefault(); return beginMove(e, pgNow);
    }
    e.preventDefault();
    if (!e.shiftKey && S.sel.length) { S.sel = []; P.updateSel(); P.renderInspector(); }
    beginMarquee(e, pgNow, e.shiftKey);
  }

  P.bindCanvas = function () {
    const root = $('#pages');
    root.addEventListener('mousedown', onDown);
    $('#rulerh').addEventListener('mousedown', e => P.beginRulerDrag(e, 'y'));
    $('#rulerv').addEventListener('mousedown', e => P.beginRulerDrag(e, 'x'));
    window.addEventListener('resize', () => P.drawRulers());
    root.addEventListener('dblclick', (e) => { const oe = e.target.closest('.obj:not(.master)'); if (oe && !e.target.closest('[data-h]')) { P.select([oe.dataset.id]); P.startEdit(oe.dataset.id, false); } });
    root.addEventListener('click', (e) => { const ov = e.target.closest('.ovf'); if (ov) P.continueStory(ov.closest('.obj').dataset.id); });
    $('#scroller').addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); P.setZoom(S.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); } }, { passive: false });
    let st = null;
    $('#scroller').addEventListener('scroll', () => {
      P.drawRulers();
      clearTimeout(st); st = setTimeout(() => {
        if (S.gesture || S.editing) return;
        const sc = $('#scroller').getBoundingClientRect(), mid = sc.top + sc.height / 2; let best = S.page, bd = 1e9;
        P.$$('#pages .page').forEach((p, i) => { const r = p.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = i; } });
        if (best !== S.page) { S.page = best; S.sel = []; P.$$('#pages .page').forEach((p, i) => p.classList.toggle('cur', i === best)); P.$$('.thumb').forEach((t, i) => t.classList.toggle('cur', i === best)); P.updateSel(); P.status(); P.renderInspector(); }
      }, 120);
    });
    // drop pictures
    root.addEventListener('dragover', e => e.preventDefault());
    root.addEventListener('drop', e => {
      e.preventDefault();
      const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/')); if (!files.length) return;
      const oe = e.target.closest('.obj'), pg = e.target.closest('.page'); if (pg) S.page = +pg.dataset.pi;
      const p = pg ? pt(e, pg) : { x: 50, y: 50 };
      files.forEach((f, i) => { const r = new FileReader(); r.onload = () => P.placeImage(r.result, f.name, oe && i === 0 ? P.find(oe.dataset.id).o : null, p.x + i * 20, p.y + i * 20); r.readAsDataURL(f); });
    });
    document.addEventListener('paste', e => {
      if (S.editing || e.target.closest('input,textarea')) return;
      const f = [...(e.clipboardData ? e.clipboardData.files : [])].find(f => f.type.startsWith('image/'));
      if (f) { const r = new FileReader(); r.onload = () => P.placeImage(r.result, 'pasted'); r.readAsDataURL(f); }
    });
  };

  // ---------- pictures ----------
  P.placeImage = function (dataUrl, name, target, x, y) {
    const im = new Image();
    im.onload = () => {
      P.checkpoint();
      const id = P.addAsset(dataUrl);
      if (target && target.type === 'image') { target.asset = id; S.sel = [target.id]; P.render(); return; }
      const L = P.live(), ar = im.naturalWidth / im.naturalHeight; let w = Math.min(L.w * .6, im.naturalWidth), h = w / ar;
      if (h > L.h * .8) { h = L.h * .8; w = h * ar; }
      const o = P.mk('image', { x: x != null ? x : L.x + (L.w - w) / 2, y: y != null ? y : L.y + (L.h - h) / 2, w, h, asset: id, fit: 'cover' });
      S.doc.pages[S.page].objs.push(o); S.sel = [o.id]; P.render();
    };
    im.src = dataUrl;
  };
  P.pickImageInto = async function (target) {
    const files = await press.pickImage(); if (!files.length) return;
    files.forEach((f, i) => P.placeImage(f.src, f.name, i === 0 ? target : null));
  };

  // ---------- pages ----------
  const newPage = () => ({ id: P.uid('p'), objs: [] });
  P.addPage = function () { P.checkpoint(); S.doc.pages.splice(S.page + 1, 0, newPage()); S.page++; S.sel = []; P.render(); P.gotoPage(S.page, true); };
  P.dupPage = function () {
    P.checkpoint();
    const src = S.doc.pages[S.page], r = P.cloneObjs(src.objs, 0, 0);
    // stories: duplicates only hold the frames on this page
    S.doc.pages.splice(S.page + 1, 0, { id: P.uid('p'), objs: r.objs }); Object.assign(S.doc.stories, r.stories);
    S.page++; S.sel = []; P.render(); P.gotoPage(S.page, true);
  };
  P.delPage = async function () {
    if (S.doc.pages.length < 2) return P.toast('A document needs at least one page');
    if (S.doc.pages[S.page].objs.length && (await press.confirm({ message: 'Delete page ' + (S.page + 1) + '?', detail: 'Everything on it will be removed (you can undo).', buttons: ['Delete', 'Cancel'] })) !== 0) return;
    P.checkpoint(); S.doc.pages.splice(S.page, 1); P.cleanStories(); S.page = Math.min(S.page, S.doc.pages.length - 1); S.sel = []; P.render();
  };
  P.movePage = function (d) {
    const j = S.page + d; if (j < 0 || j >= S.doc.pages.length) return;
    P.checkpoint(); const a = S.doc.pages; [a[S.page], a[j]] = [a[j], a[S.page]]; S.page = j; P.render(); P.gotoPage(j, true);
  };

  // ---------- document io ----------
  P.setDoc = function (doc, path) {
    doc.setup = P.newSetup(doc.setup); doc.setup.divide = Object.assign({ v: [], h: [], safe: .25 }, doc.setup.divide);
    doc.stories = doc.stories || {}; doc.assets = doc.assets || {};
    S.doc = doc; S.path = path || null; S.page = 0; S.sel = []; S.hist = []; S.fut = []; S.dirty = false; S.editing = null;
    P.updateTitle(); P.render(); setTimeout(P.zoomFit, 30);
  };
  P.serialize = () => JSON.stringify({ format: 'chancery-press', version: 1, doc: S.doc });
  P.parse = (text) => { const j = JSON.parse(text); if (j.format !== 'chancery-press' || !j.doc) throw new Error('This is not a Chancery Press file'); return j.doc; };
  P.toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(P._tt); P._tt = setTimeout(() => t.classList.remove('show'), 2400); };
})();

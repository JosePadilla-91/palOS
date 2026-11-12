/* Chancery Press - inspector, module + template panels */
(function () {
  const S = P.S, $ = P.$, esc = P.esc, IN = P.IN;
  P.fontList = Object.keys(P.FONTS);

  // ---------- field builders ----------
  const f = {
    num: (label, s, k, v, o) => { o = o || {}; return `<div class="row"><label>${label}</label><input type="number" data-s="${s}" data-k="${k}" data-t="num" ${o.u ? `data-u="${o.u}"` : ''} step="${o.step || 1}" ${o.min != null ? `min="${o.min}"` : ''} ${o.max != null ? `max="${o.max}"` : ''} value="${v == null ? '' : +(+v).toFixed(3)}"></div>`; },
    nums: (arr) => `<div class="row">${arr.map(a => `<label>${a[0]}</label><input type="number" style="width:54px" data-s="${a[1]}" data-k="${a[2]}" data-t="num" ${a[5] ? `data-u="${a[5]}"` : ''} step="${a[4] || 1}" value="${a[3] == null ? '' : +(+a[3]).toFixed(3)}">`).join('')}</div>`,
    color: (label, s, k, v, none) => `<div class="row"><label style="min-width:62px">${label}</label><input type="color" data-s="${s}" data-k="${k}" data-t="str" value="${/^#[0-9a-f]{6}$/i.test(v) ? v : '#000000'}">${none ? `<button data-clear="${s}:${k}" style="padding:2px 7px;font-size:11px">${v ? 'None' : 'none ✓'}</button>` : ''}</div>`,
    check: (label, s, k, v) => `<div class="row"><label style="min-width:0"><input type="checkbox" data-s="${s}" data-k="${k}" data-t="bool" ${v ? 'checked' : ''}> ${label}</label></div>`,
    sel: (label, s, k, v, opts) => `<div class="row"><label style="min-width:62px">${label}</label><select class="grow" data-s="${s}" data-k="${k}" data-t="str">${opts.map(o => { const [val, txt] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(txt)}</option>`; }).join('')}</select></div>`,
    range: (label, s, k, v, min, max, step) => `<div class="row"><label style="min-width:62px">${label}</label><input type="range" class="grow" data-s="${s}" data-k="${k}" data-t="num" min="${min}" max="${max}" step="${step}" value="${v}"></div>`,
    sec: (title, body, cls) => `<div class="sec ${cls || ''}"><h4>${title}</h4>${body}</div>`
  };
  const fontSel = (s, k, v) => f.sel('Font', s, k, v, P.fontList);

  // ---------- inspector ----------
  P.renderInspector = function () {
    const box = $('#inspector'); if (!box || !S.doc) return;
    const sel = P.selObjs(), d = S.doc, set = d.setup;
    let h = '';
    if (!sel.length) {
      const dv = set.divide || { v: [], h: [] }, nf = dv.v.length + dv.h.length;
      h += f.sec('Sheet', `<div class="note" style="margin-bottom:6px">${+d.w.toFixed(2)} x ${+d.h.toFixed(2)} in &nbsp;(${+(d.w * 25.4).toFixed(0)} x ${+(d.h * 25.4).toFixed(0)} mm)</div>
        <div class="btnrow"><button data-act="doc-setup">Sheet size...</button><button data-act="divide-open">Divide page...</button></div>
        ${f.num('Bleed (in)', 'setup', 'bleed', set.bleed || 0, { step: .0625, min: 0, max: 1 })}${f.check('Crop marks on export', 'setup', 'marks', set.marks)}
        <div class="btnrow"><button data-act="merge-open">Data merge...</button></div>
        ${nf ? `<div class="note">Fold guides on: ${(dv.v.length + 1) * (dv.h.length + 1)} panels. Dotted lines are guides only - they are not printed.</div>` : ''}`);
      h += f.sec('Ruler guides', `<div class="btnrow"><button data-act="clear-guides">Clear ruler guides (${(set.guides || []).length})</button></div><div class="note">Drag from the rulers onto the page to make guides. Guides never print.</div>`, 'pro-only');
      h += f.sec('Page', `<div class="btnrow"><button data-act="page-add">＋ Add</button><button data-act="page-dup">Duplicate</button><button data-act="page-del">Delete</button></div><div class="btnrow"><button data-act="page-left">◀ Move</button><button data-act="page-right">Move ▶</button></div>` + f.color('Paper', 'setup', 'bg', set.bg));
      h += f.sec('Margins & columns', f.nums([['Top', 'setup', 'm.t', set.margins.t, .05], ['Bot', 'setup', 'm.b', set.margins.b, .05]]) + f.nums([['Left', 'setup', 'm.l', set.margins.l, .05], ['Right', 'setup', 'm.r', set.margins.r, .05]]) +
        f.nums([['Columns', 'setup', 'cols', set.cols, 1], ['Gutter', 'setup', 'gutter', set.gutter, .05]]) +
        f.num('Grid (in)', 'setup', 'grid', set.grid, { step: .0625, min: .03 }) + f.check('Show grid', 'setup', 'showGrid', set.showGrid) + f.check('Snap to guides & objects', 'setup', 'snap', set.snap) +
        `<div class="note">Blue guides are not printed. Story frames and modules snap to the columns.</div>`, 'pro-only');
      h += `<div class="empty">Click something on the page to change it. Use the toolbar to add text, pictures and shapes. Double-click text to type.</div>`;
    } else {
      const o = sel[0], single = sel.length === 1, types = new Set(sel.map(x => x.type)), allText = [...types].every(t => t === 'text');
      h += f.sec('Arrange', `
        <div class="btnrow"><button data-act="al-obj-l" title="Align left">⇤</button><button data-act="al-obj-c" title="Center horizontally">↔</button><button data-act="al-obj-r" title="Align right">⇥</button><button data-act="al-obj-t" title="Align top">⤒</button><button data-act="al-obj-m" title="Center vertically">↕</button><button data-act="al-obj-b" title="Align bottom">⤓</button></div>
        <div class="btnrow pro-only"><button data-act="al-obj-dh" ${sel.length < 3 ? 'disabled' : ''}>Space across</button><button data-act="al-obj-dv" ${sel.length < 3 ? 'disabled' : ''}>Space down</button></div>
        <div class="btnrow"><button data-act="front">To front</button><button data-act="forward">Up</button><button data-act="backward">Down</button><button data-act="back">To back</button></div>
        <div class="btnrow"><button data-act="duplicate">Duplicate</button><button data-act="delete">Delete</button><button data-act="group" class="pro-only" ${sel.length < 2 ? 'disabled' : ''}>Group</button><button data-act="ungroup" class="pro-only">Ungroup</button></div>
        <div class="row"><label style="min-width:0"><input type="checkbox" data-s="obj" data-k="locked" data-t="bool" ${o.locked ? 'checked' : ''}> Lock</label><label class="pro-only" style="min-width:0"><input type="checkbox" data-s="obj" data-k="allPages" data-t="bool" ${o.allPages ? 'checked' : ''}> On every page</label></div>
        <div class="btnrow pro-only"><button data-act="save-module">Save as module...</button></div>`);
      if (single) {
        h += f.sec('Position', f.nums([['X', 'obj', 'x', o.x / IN, .05, 'in'], ['Y', 'obj', 'y', o.y / IN, .05, 'in']]) + f.nums([['W', 'obj', 'w', o.w / IN, .05, 'in'], ['H', 'obj', 'h', o.h / IN, .05, 'in']]) + f.nums([['Turn', 'obj', 'rot', o.rot, 1]]) +
          (set.cols > 1 ? `<div class="catlabel">Snap to columns</div><div class="btnrow pro-only">${Array.from({ length: Math.min(set.cols, 8) }, (_, i) => `<button data-span="${i + 1}">${i + 1}</button>`).join('')}</div>` : '') +
          ((set.divide.v.length || set.divide.h.length) ? `<div class="catlabel">Fit to fold panel</div><div class="btnrow">${P.panels().map(p => `<button data-panel="${p.n}">${p.n}</button>`).join('')}</div>` : ''), 'pro-only');
      }
      if (types.has('text')) {
        h += f.sec('Text', fontSel('obj', 'font', o.font) + f.nums([['Size', 'obj', 'size', o.size, .5], ['Line', 'obj', 'lh', o.lh, .05]]) + f.color('Color', 'obj', 'color', o.color) +
          f.sel('Align text', 'obj', 'align', o.align, ['left', 'center', 'right', 'justify']) + f.sel('Vertical', 'obj', 'valign', o.valign, ['top', 'middle', 'bottom']) +
          f.check('Shrink/grow to fit the box', 'obj', 'fit', o.fit) + f.check('ALL CAPS', 'obj', 'upper', o.upper) + f.num('Spacing', 'obj', 'ls', o.ls, { step: .5 }) +
          f.nums([['Outline', 'obj', 'tstroke', o.tstroke, .5]]) + f.color('Out color', 'obj', 'tstrokeC', o.tstrokeC) + f.check('Shadow behind letters', 'obj', 'tshadow', o.tshadow) +
          (single ? `<div class="btnrow pro-only"><button data-act="to-story">Turn into flowing story frame</button></div>` : '') +
          `<div class="note">Double-click the box to type. Select words to style just those.</div>`);
        h += f.sec('Box', f.color('Fill', 'obj', 'fill', o.fill, true) + f.color('Border', 'obj', 'stroke', o.stroke, true) + f.nums([['Border', 'obj', 'strokeW', o.strokeW, 1], ['Pad', 'obj', 'pad', o.pad, 1]]) + f.sel('Line', 'obj', 'bstyle', o.bstyle || 'solid', ['solid', 'dashed', 'dotted', 'double']) + f.nums([['Round', 'obj', 'radius', o.radius, 1]]) + f.color('Fill 2', 'obj', 'fill2', o.fill2, true) + f.nums([['Angle', 'obj', 'gdir', o.gdir, 15]]) +
          `<div class="pro-only">` + f.nums([['Columns', 'obj', 'cols', o.cols, 1], ['Gap', 'obj', 'gap', o.gap, 1]]) + f.check('Line between columns', 'obj', 'rule', o.rule) + `</div>`);
      }
      if (types.has('story') && single) {
        const st = d.stories[o.storyId] || P.STORY_DEF, ci = st.chain.indexOf(o.id);
        h += f.sec('Story text', `<textarea class="story" data-s="story" data-k="text" data-t="str" spellcheck="true">${esc(st.text)}</textarea>
          <div class="note">Blank line = new paragraph. Use **bold** and *italic*. Words left over: <b>${st._left || 0}</b>${st._left ? ' - click the red + on the frame to keep going' : ''}.</div>`);
        h += f.sec('Linked frames', `<div class="note" style="margin-bottom:6px">This frame is ${ci + 1} of ${st.chain.length} in its story.</div>
          <div class="btnrow"><button data-act="link-frames">Link selected frames</button><button data-act="unlink-frame">Unlink</button></div><div class="btnrow"><button data-act="continue-story">Continue on next page</button></div>
          <div class="note">Shift+click several story frames, then Link: text flows through them in the order you clicked.</div>`, 'pro-only');
        h += f.sec('Story style', fontSel('story', 'font', st.font) + f.nums([['Size', 'story', 'size', st.size, .5], ['Line', 'story', 'lh', st.lh, .05]]) + f.color('Color', 'story', 'color', st.color) +
          f.sel('Align', 'story', 'align', st.align, ['left', 'justify', 'center', 'right']) + f.check('Drop cap', 'story', 'dropcap', st.dropcap) + f.check('Indent paragraphs', 'story', 'indent', st.indent) + f.check('Hyphenate', 'story', 'hyph', st.hyph) +
          f.nums([['Para gap', 'story', 'pspace', st.pspace, 1], ['Spacing', 'story', 'ls', st.ls, .25]]));
        h += f.sec('Frame', f.nums([['Columns', 'obj', 'cols', o.cols, 1], ['Gap', 'obj', 'gap', o.gap, 1]]) + f.check('Line between columns', 'obj', 'rule', o.rule) + f.nums([['Pad', 'obj', 'pad', o.pad, 1], ['Border', 'obj', 'strokeW', o.strokeW, 1]]) + f.color('Fill', 'obj', 'fill', o.fill, true) + f.color('Border', 'obj', 'stroke', o.stroke, true) + f.sel('Line', 'obj', 'bstyle', o.bstyle || 'solid', ['solid', 'dashed', 'dotted', 'double']) + f.nums([['Round', 'obj', 'radius', o.radius, 1]]) + f.color('Fill 2', 'obj', 'fill2', o.fill2, true) + f.nums([['Angle', 'obj', 'gdir', o.gdir, 15]]) +
          `<div class="btnrow pro-only"><button data-act="to-text">Turn into plain text box</button></div>`);
      }
      if (types.has('shape')) {
        h += f.sec('Shape', f.sel('Shape', 'obj', 'kind', o.kind, ['rect', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star', 'burst', 'cross', 'arrow', 'heart', 'callout', 'ribbon', 'line']) + f.color('Fill', 'obj', 'fill', o.fill, true) + f.color('Fill 2', 'obj', 'fill2', o.fill2, true) + f.nums([['Angle', 'obj', 'gdir', o.gdir, 15]]) + f.color('Outline', 'obj', 'stroke', o.stroke, true) + f.nums([['Line', 'obj', 'strokeW', o.strokeW, 1], ['Round', 'obj', 'radius', o.radius, 1]]) + f.sel('Style', 'obj', 'dash', o.dash || '', [['', 'Solid'], ['10 6', 'Dashed'], ['2 5', 'Dotted']]) + f.check('Shadow', 'obj', 'shadow', o.shadow));
      }
      if (types.has('image')) {
        h += f.sec('Picture', `<div class="btnrow"><button data-act="replace-image">${o.asset ? 'Change picture...' : 'Choose picture...'}</button></div>` + f.sel('Fit', 'obj', 'fit', o.fit, [['cover', 'Fill (crop)'], ['contain', 'Fit inside'], ['fill', 'Stretch']]) +
          f.sel('Look', 'obj', 'filter', o.filter, [['', 'Normal'], ['grayscale', 'Black & white'], ['newsprint', 'Newsprint'], ['sepia', 'Sepia'], ['contrast', 'High contrast']]) + f.nums([['Round', 'obj', 'radius', o.radius, 1], ['Border', 'obj', 'strokeW', o.strokeW, 1]]) + f.color('Border', 'obj', 'stroke', o.stroke) + f.check('Flip', 'obj', 'flip', o.flip) + f.check('Shadow', 'obj', 'shadow', o.shadow) +
          f.range('Zoom', 'obj', 'zoom', o.zoom || 1, 1, 4, .05) + f.range('Pan left/right', 'obj', 'px', o.px == null ? 50 : o.px, 0, 100, 1) + f.range('Pan up/down', 'obj', 'py', o.py == null ? 50 : o.py, 0, 100, 1) + '<div class="note">Zoom + pan crops the picture inside its frame.</div>');
      }
      if (types.has('table')) {
        h += f.sec('Table', f.nums([['Rows', 'obj', 'rows', o.rows, 1], ['Cols', 'obj', 'cols', o.cols, 1]]) + f.check('Header row', 'obj', 'head', o.head) + f.color('Header', 'obj', 'headFill', o.headFill) + f.color('Header text', 'obj', 'headColor', o.headColor) + f.color('Lines', 'obj', 'border', o.border) + f.num('Size', 'obj', 'size', o.size, { step: .5 }) + fontSel('obj', 'font', o.font) + `<div class="note">Double-click the table to type in cells.</div>`);
      }
      if (single && o.type !== 'story') h += f.sec('Text wrap', f.check('Story text wraps around this', 'obj', 'wrap', o.wrap) + f.num('Space (px)', 'obj', 'wpad', o.wpad, { step: 1 }) + '<div class="note">Works with single-column story frames sitting behind or beside it.</div>', 'pro-only');
      h += f.sec('Look', f.range('Opacity', 'obj', 'opacity', o.opacity, 0, 1, .05), 'pro-only');
    }
    box.innerHTML = h;
  };

  // ---------- applying field changes ----------
  function setPath(obj, k, v) { if (k.startsWith('m.')) obj.margins[k.slice(2)] = v; else obj[k] = v; }
  const INLINE = { color: 'foreColor', size: 'fontSize', font: 'fontName' };
  function inlineApply(k, v) {
    const ed = S.editing; if (!ed || ed.type !== 'text' || !ed.range || ed.range.collapsed) return false;
    const s = getSelection(); s.removeAllRanges(); s.addRange(ed.range); ed.tx.focus();
    document.execCommand('styleWithCSS', false, true);
    if (k === 'color') document.execCommand('foreColor', false, v);
    else if (k === 'font') document.execCommand('fontName', false, P.fontStack(v).split(',')[0].replace(/"/g, '').trim());
    else if (k === 'size') { document.execCommand('fontSize', false, '7'); ed.tx.querySelectorAll('span,font').forEach(n => { if (n.style.fontSize === 'xxx-large' || n.getAttribute('size') === '7') { n.style.fontSize = v + 'pt'; n.removeAttribute('size'); } }); }
    return true;
  }
  P.applyField = function (el) {
    const s = el.dataset.s, k = el.dataset.k;
    let v = el.type === 'checkbox' ? el.checked : (el.type === 'number' || el.type === 'range') ? parseFloat(el.value) : el.value;
    if (el.dataset.t === 'num' && isNaN(v)) return;
    if (el.dataset.u === 'in') v = v * IN;
    if (!el._ck) { P.checkpoint(); el._ck = true; el.addEventListener('change', () => el._ck = false, { once: true }); }
    if (s === 'obj') {
      if (INLINE[k] && inlineApply(k, v)) return;
      P.selObjs().forEach(o => { if (o.locked && k !== 'locked') return; o[k] = v; if (k === 'rows' || k === 'cols') { if (o.type === 'table') o[k] = Math.max(1, Math.round(v)); else if (o.type !== 'story') o.cols = Math.max(1, Math.round(v)); else o.cols = Math.max(1, Math.round(v)); } });
      if (S.editing) { const o = P.selObjs()[0]; if (o && o.type === 'text') S.editing.tx.style.cssText = P.textCss(o) + P.colsCss(o) + `padding:${o.pad}px;`; }
      if (k === 'locked') { P.render(); return; }
    } else if (s === 'story') {
      const o = P.selObjs().find(x => x.type === 'story'); if (o && S.doc.stories[o.storyId]) S.doc.stories[o.storyId][k] = v;
    } else if (s === 'setup') {
      const st = S.doc.setup;
      if (k === 'cols') v = Math.max(1, Math.round(v)); if (k === 'grid') v = Math.max(.03, v);
      setPath(st, k, v);
    }
    if (s === 'setup' || el.type === 'checkbox' || el.tagName === 'SELECT') P.renderSoon(); else P.renderSoon({ noInspector: true });
    if (el.type === 'checkbox' || el.tagName === 'SELECT') P.renderSoon();
  };

  // ---------- left panels ----------
  const ctxNow = () => { const c = P.colRects(), g = S.doc.setup.gutter; return { cw: (c[0][1] - c[0][0]) / IN, gut: g, W: P.live().w / IN, cols: c.length }; };

  function previewOf(docLike, objs, w, h, maxW, maxH) {
    const keep = S.doc; S.doc = docLike;
    const sc = Math.min(maxW / w, maxH / h), wrap = document.createElement('div');
    wrap.className = 'pv'; wrap.style.cssText = `width:${w * sc}px;height:${h * sc}px;margin:0 auto 5px;`;
    const pg = document.createElement('div'); pg.className = 'page'; pg.style.cssText = `width:${w}px;height:${h}px;transform:scale(${sc});transform-origin:0 0;box-shadow:none;background:${docLike.setup ? docLike.setup.bg : '#fff'}`;
    const clip = document.createElement('div'); clip.className = 'pageclip';
    objs.forEach(o => { const el = P.objEl(o, 0, false); if (o.type === 'story') { const st = docLike.stories[o.storyId]; const tx = el.querySelector('.tx'); if (st && tx) tx.textContent = st.text; } clip.appendChild(el); });
    pg.appendChild(clip); wrap.appendChild(pg);
    S.doc = keep; return wrap;
  }
  P.previewOf = previewOf;

  const customModules = () => { try { return JSON.parse(localStorage.getItem('cp-modules') || '[]'); } catch (e) { return []; } };
  P.renderModules = function () {
    const box = $('#ltab-modules'); box.innerHTML = '<div class="note" style="margin-bottom:6px">Click a module to drop it on the page. Everything stays editable.</div>';
    const ctx = ctxNow(); let cat = '';
    const mine = customModules();
    P.MODULES.forEach((m, i) => {
      if (m.cat !== cat) { cat = m.cat; box.insertAdjacentHTML('beforeend', `<div class="catlabel">${esc(cat)}</div>`); }
      const card = document.createElement('div'); card.className = 'card';
      let b; try { b = m.build(ctx); } catch (e) { return; }
      const bb = P.bbox(b.objs), objs = b.objs.map(o => Object.assign({}, o, { x: o.x - bb.x, y: o.y - bb.y }));
      card.appendChild(previewOf({ stories: b.stories, assets: S.doc.assets, setup: { bg: '#fff' }, pages: [{ objs: [] }] }, objs, bb.w, bb.h, 170, 70));
      card.insertAdjacentHTML('beforeend', `<b>${esc(m.name)}</b><small>${esc(m.sub)}</small>`);
      card.onclick = () => P.insertModule(m);
      box.appendChild(card);
    });
    if (mine.length) {
      box.insertAdjacentHTML('beforeend', '<div class="catlabel">My modules</div>');
      mine.forEach((m, i) => {
        const card = document.createElement('div'); card.className = 'card';
        card.appendChild(previewOf({ stories: m.stories, assets: S.doc.assets, setup: { bg: '#fff' }, pages: [{ objs: [] }] }, m.objs, m.w, m.h, 170, 70));
        card.insertAdjacentHTML('beforeend', `<b>${esc(m.name)}</b><small>Click to insert - <a href="#" data-delmod="${i}">remove</a></small>`);
        card.onclick = (e) => { if (e.target.closest('[data-delmod]')) { e.preventDefault(); const a = customModules(); a.splice(i, 1); localStorage.setItem('cp-modules', JSON.stringify(a)); P.renderModules(); return; } P.insertCustom(m); };
        box.appendChild(card);
      });
    }
  };

  function dropGroup(objs, stories) {
    P.checkpoint();
    const L = P.live(), bb = P.bbox(objs), g = P.uid('g');
    const jitter = (S.modN = ((S.modN || 0) + 1) % 6) * 18;
    objs.forEach(o => { o.x += L.x - bb.x + jitter; o.y += L.y - bb.y + jitter; if (objs.length > 1) o.group = g; });
    S.doc.pages[S.page].objs.push(...objs); Object.assign(S.doc.stories, stories);
    S.sel = objs.map(o => o.id); P.render();
  }
  P.insertModule = function (m) { const b = m.build(ctxNow()); dropGroup(b.objs, b.stories); P.toast(m.name + ' added - drag it where you want it'); };
  P.insertCustom = function (m) {
    const keep = S.doc.stories; S.doc.stories = Object.assign({}, keep, m.stories);
    const r = P.cloneObjs(m.objs, 0, 0); S.doc.stories = keep; dropGroup(r.objs, r.stories);
  };
  P.saveModule = function (name) {
    const sel = P.selObjs(); if (!sel.length) return;
    const r = P.cloneObjs(sel, 0, 0), bb = P.bbox(r.objs);
    r.objs.forEach(o => { o.x -= bb.x; o.y -= bb.y; o.group = null; });
    const a = customModules(); a.push({ name, w: bb.w, h: bb.h, objs: r.objs, stories: r.stories });
    try { localStorage.setItem('cp-modules', JSON.stringify(a)); P.toast('Saved to My modules'); } catch (e) { P.toast('Could not save module (too big?)'); }
    P.renderModules();
  };

  P.renderTemplates = function () {
    const box = $('#ltab-templates'); box.innerHTML = '<div class="note" style="margin-bottom:6px">Pick a starting point. This replaces the current document.</div>';
    P.TEMPLATES.forEach(t => {
      const d = t.build(), card = document.createElement('div'); card.className = 'card';
      d.assets = {}; card.appendChild(previewOf(d, d.pages[0].objs, d.w * IN, d.h * IN, 170, 120));
      card.insertAdjacentHTML('beforeend', `<b>${esc(t.name)}</b><small>${esc(t.sub)}</small>`);
      card.onclick = () => P.newFromTemplate(t.id);
      box.appendChild(card);
    });
  };
  P.newFromTemplate = async function (id) {
    if (S.dirty && !(await P.confirmDiscard())) return;
    const t = P.TEMPLATES.find(x => x.id === id); const d = t.build();
    d.w *= 1; P.setDoc(P.finishDoc(d)); P.closeModal();
  };
  // templates are authored in inches for w/h; the doc keeps inches too
  P.finishDoc = (d) => d;

  P.selectLeftTab = function (name) {
    P.$$('#lefttabs button').forEach(b => b.classList.toggle('on', b.dataset.ltab === name));
    ['pages', 'modules', 'templates'].forEach(n => { $('#ltab-' + n).hidden = n !== name; });
    if (name === 'modules') P.renderModules(); if (name === 'templates' && !$('#ltab-templates').children.length > 1) P.renderTemplates();
    if (name === 'templates') P.renderTemplates();
    if (name === 'pages') P.renderThumbs();
  };
})();

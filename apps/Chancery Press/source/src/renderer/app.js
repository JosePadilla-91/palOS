/* Chancery Press - actions, keyboard, file io, export, boot */
(function () {
  const S = P.S, $ = P.$, IN = P.IN;
  const typing = (el) => !!(el && el.closest && el.closest('input,textarea,select,[contenteditable="true"]'));

  // ---------- modes ----------
  P.setMode = function (m) {
    S.mode = m; document.body.classList.toggle('simple', m === 'simple'); document.body.classList.toggle('pro', m === 'pro');
    $('#btn-mode').textContent = m === 'simple' ? 'Simple' : 'Pro'; try { localStorage.setItem('cp-mode', m); } catch (e) { }
    P.renderInspector();
  };

  // ---------- page style for print/pdf ----------
  function pageStyle() {
    const o = P.outDims();
    $('#pagestyle').textContent = `@page{size:${o.w}in ${o.h}in;margin:0}@media print{.pagewrap{width:${o.w}in;height:${o.h}in;overflow:hidden;position:relative}.page{position:absolute !important;left:${o.off}in;top:${o.off}in;width:${S.doc.w}in !important;height:${S.doc.h}in !important}}`;
  }
  const baseRender = P.render;
  P.render = function (o) { baseRender(o); pageStyle(); };

  // ---------- file ----------
  const docName = () => (S.path ? S.path.split('/').pop().replace(/\.chpress$/, '') : 'Untitled');
  P.save = async function (as) {
    P.stopEdit();
    const p = await press.save({ path: S.path, text: P.serialize(), saveAs: as, name: docName() });
    if (p) { S.path = p; S.dirty = false; P.updateTitle(); P.toast('Saved'); try { localStorage.removeItem('cp-autosave'); } catch (e) { } return true; }
    return false;
  };
  P.openText = function (path, text) {
    try { P.closeModal(); P.setDoc(P.parse(text), path); P.toast('Opened ' + path.split('/').pop()); } catch (e) { P.toast('Could not open: ' + e.message); }
  };

  async function exportPdf() {
    P.stopEdit(); S.sel = []; P.updateSel(); pageStyle();
    const p = await press.exportPdf({ wIn: S.doc.w, hIn: S.doc.h, name: docName() });
    if (p) P.toast('PDF saved - fold guides are not included');
  }
  async function renderPagePng() {
    const pg = P.$$('#pages .page')[S.page], W = P.pageW(), H = P.pageH(), scale = Math.min(3, 4000 / Math.max(W, H));
    const clone = pg.cloneNode(true);
    clone.querySelectorAll('.guide,#selbox,.ovf,.ph').forEach(x => x.remove());
    clone.classList.remove('cur'); clone.style.boxShadow = 'none'; clone.style.outline = 'none';
    const css = [...document.styleSheets].map(s => { try { return [...s.cssRules].filter(r => !(r.media && String(r.media.mediaText).includes('print'))).map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    const xml = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W * scale)}" height="${Math.round(H * scale)}" viewBox="0 0 ${W} ${H}"><foreignObject width="${W}" height="${H}"><div xmlns="http://www.w3.org/1999/xhtml"><style>${css}</style>${xml}</div></foreignObject></svg>`;
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const cv = document.createElement('canvas'); cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
    cv.getContext('2d').drawImage(img, 0, 0);
    return cv.toDataURL('image/png');
  }
  P.renderPagePng = renderPagePng;
  async function pagePng() {
    P.stopEdit();
    const p = await press.savePng({ dataUrl: await renderPagePng(), name: docName() + '-page' + (S.page + 1) });
    if (p) P.toast('Page saved as PNG');
  }

  // ---------- inserting ----------
  const centerAt = (w, h) => { const L = P.live(); return { x: L.x + (L.w - w) / 2, y: L.y + (L.h - h) / 3 }; };
  async function insertImage() {
    const files = await press.pickImage(); if (!files.length) return;
    const t = P.selObjs().find(o => o.type === 'image');
    files.forEach((f, i) => P.placeImage(f.src, f.name, i === 0 ? t : null, i ? 40 + i * 24 : undefined, i ? 40 + i * 24 : undefined));
  }
  function insertTable() {
    const w = 360, h = 150, c = centerAt(w, h);
    P.addObj(P.mk('table', Object.assign({ x: c.x, y: c.y, w, h, rows: 4, cols: 3, cells: [['Item', 'Detail', 'Price'], ['', '', ''], ['', '', ''], ['', '', '']] })));
  }
  function insertPageNum() {
    const L = P.live(), w = 120, h = 28;
    P.addObj(P.mk('text', { x: L.x + (L.w - w) / 2, y: L.y + L.h - h, w, h, html: '{page}', size: 10, align: 'center', bold: true, font: 'Sans', allPages: true }));
  }
  const tool = (t) => { S.tool = t; P.syncTools(); P.$$('#pages .page').forEach(p => p.style.cursor = t === 'select' ? '' : 'crosshair'); $('#st-hint').textContent = t === 'select' ? '' : 'Click or drag on the page to place it'; };

  function fmt(cmd) {
    const key = { bold: 'bold', italic: 'italic', underline: 'underline' }[cmd];
    if (S.editing && S.editing.type === 'text') { if (S.editing.range) { const s = getSelection(); s.removeAllRanges(); s.addRange(S.editing.range); } S.editing.tx.focus(); document.execCommand(cmd); return; }
    const sel = P.selObjs().filter(o => o.type === 'text' || o.type === 'story'); if (!sel.length) return;
    P.checkpoint();
    const on = !((sel[0].type === 'story' ? S.doc.stories[sel[0].storyId] : sel[0])[key]);
    sel.forEach(o => { const t = o.type === 'story' ? S.doc.stories[o.storyId] : o; t[key] = on; });
    P.render();
  }
  function align(a) {
    const map = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' };
    if (S.editing && S.editing.type === 'text') { S.editing.tx.focus(); document.execCommand(map[a]); return; }
    const sel = P.selObjs().filter(o => o.type === 'text' || o.type === 'story'); if (!sel.length) return;
    P.checkpoint(); sel.forEach(o => { const t = o.type === 'story' ? S.doc.stories[o.storyId] : o; t.align = a; }); P.render();
  }

  // ---------- actions ----------
  async function act(a) {
    switch (a) {
      case 'file-new': return P.openNew(false);
      case 'file-open': return press.openDialog();
      case 'file-save': return P.save(false);
      case 'file-saveas': return P.save(true);
      case 'file-pdf': return P.openExport();
      case 'merge-open': return P.openMerge();
      case 'file-png': return pagePng();
      case 'file-print': { P.stopEdit(); S.sel = []; P.updateSel(); pageStyle(); const ok = await press.print({ wIn: S.doc.w, hIn: S.doc.h }); return; }
      case 'doc-setup': return P.openSetup();
      case 'shapes': return P.openShapes();
      case 'clear-guides': if (S.doc.setup.guides && S.doc.setup.guides.length) { P.checkpoint(); S.doc.setup.guides = []; P.render(); } return;
      case 'divide-open': return P.openDivide();
      case 'quit-request': {
        if (S.dirty) { const r = await press.confirm({ message: 'Save changes before closing?', detail: 'Your document has unsaved changes.', buttons: ['Save', "Don't save", 'Cancel'] }); if (r === 2) return; if (r === 0 && !(await P.save(false))) return; }
        return press.quitNow();
      }
      case 'undo': return typing(document.activeElement) && !S.editing ? document.execCommand('undo') : P.undo();
      case 'redo': return typing(document.activeElement) && !S.editing ? document.execCommand('redo') : P.redo();
      case 'cut': return document.execCommand('cut'); case 'copy': return document.execCommand('copy'); case 'paste': return document.execCommand('paste');
      case 'duplicate': return P.duplicate();
      case 'delete': return P.deleteSel();
      case 'selectall': if (typing(document.activeElement)) return document.execCommand('selectAll'); S.sel = P.curObjs().map(o => o.id); P.updateSel(); return P.renderInspector();
      case 'find': return P.openFind();
      case 'ins-text': return tool('text'); case 'ins-story': return tool('story'); case 'ins-rect': return tool('rect'); case 'ins-ellipse': return tool('ellipse'); case 'ins-line': return tool('line'); case 'ins-star': return tool('star');
      case 'ins-image': return insertImage();
      case 'replace-image': { const o = P.selObjs().find(x => x.type === 'image'); if (o) return P.pickImageInto(o); return; }
      case 'ins-table': return insertTable();
      case 'ins-pagenum': return insertPageNum();
      case 'page-add': return P.addPage(); case 'page-dup': return P.dupPage(); case 'page-del': return P.delPage();
      case 'page-left': return P.movePage(-1); case 'page-right': return P.movePage(1);
      case 'tab-modules': if (S.mode === 'simple') P.setMode('pro'); return P.selectLeftTab('modules');
      case 'tab-layout': S.sel = []; P.updateSel(); return P.renderInspector();
      case 'front': case 'forward': case 'backward': case 'back': return P.order(a);
      case 'group': return P.group(); case 'ungroup': return P.ungroup();
      case 'lock': { const s = P.selObjs(); if (!s.length) return; P.checkpoint(); const v = !s[0].locked; s.forEach(o => o.locked = v); P.render(); return; }
      case 'allpages': { const s = P.selObjs(); if (!s.length) return; P.checkpoint(); const v = !s[0].allPages; s.forEach(o => o.allPages = v); P.render(); P.toast(v ? 'Now shows on every page' : 'Now only on this page'); return; }
      case 'link-frames': return P.linkFrames(); case 'unlink-frame': return P.unlinkFrame(); case 'continue-story': { const o = P.selObjs().find(x => x.type === 'story'); if (o) P.continueStory(o.id); return; }
      case 'to-story': return P.textToStory(); case 'to-text': return P.storyToText();
      case 'save-module': return P.selObjs().length && P.openModuleName();
      case 'zoom-in': return P.setZoom(S.zoom * 1.2); case 'zoom-out': return P.setZoom(S.zoom / 1.2); case 'zoom-fit': return P.zoomFit(); case 'zoom-100': return P.setZoom(1);
      case 'toggle-grid': S.doc.setup.showGrid = !S.doc.setup.showGrid; return P.render();
      case 'toggle-guides': S.hideGuides = !S.hideGuides; document.body.classList.toggle('hide-guides', S.hideGuides); return;
      case 'toggle-snap': S.doc.setup.snap = !S.doc.setup.snap; P.toast('Snapping ' + (S.doc.setup.snap ? 'on' : 'off')); return P.renderInspector();
      case 'toggle-mode': return P.setMode(S.mode === 'simple' ? 'pro' : 'simple');
      case 'tour': return P.openTour(); case 'shortcuts': return P.openShortcuts(); case 'about': return P.openAbout();
      case 'fmt-b': return fmt('bold'); case 'fmt-i': return fmt('italic'); case 'fmt-u': return fmt('underline');
      case 'al-left': return align('left'); case 'al-center': return align('center'); case 'al-right': return align('right'); case 'al-justify': return align('justify');
      default: if (a.startsWith('al-obj-')) return P.align(a.slice(7));
    }
  }
  P.act = act; P.setTool = tool;

  // ---------- wiring ----------
  function wire() {
    document.addEventListener('mousedown', e => { if (e.target.closest('#toolbar button, #inspector button, #lefttabs button')) e.preventDefault(); });
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (b && !b.disabled) { act(b.dataset.act); return; }
      const t = e.target.closest('[data-tool]'); if (t) { tool(t.dataset.tool); return; }
      const lt = e.target.closest('[data-ltab]'); if (lt) { P.selectLeftTab(lt.dataset.ltab); return; }
      const cl = e.target.closest('[data-clear]'); if (cl) {
        const [s, k] = cl.dataset.clear.split(':'); P.checkpoint();
        if (s === 'obj') P.selObjs().forEach(o => o[k] = ''); P.render(); return;
      }
      const sp = e.target.closest('[data-span]'); if (sp) {
        const o = P.selObjs()[0]; if (!o) return; P.checkpoint();
        const cols = P.colRects(), cx = o.x + o.w / 2; let from = cols.findIndex(c => cx <= c[1]); if (from < 0) from = cols.length - 1;
        const r = P.colSpan(from, +sp.dataset.span); o.x = r.x; o.w = r.w; P.render(); return;
      }
      const pn = e.target.closest('[data-panel]'); if (pn) {
        const o = P.selObjs()[0], p = P.panels()[+pn.dataset.panel - 1], s = (S.doc.setup.divide.safe || 0) * IN; if (!o || !p) return; P.checkpoint();
        Object.assign(o, { x: p.x + s, y: p.y + s, w: p.w - 2 * s, h: p.h - 2 * s }); P.render(); return;
      }
    });
    const insp = $('#inspector');
    insp.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.k) P.applyField(e.target); });
    insp.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.k && (e.target.type === 'color')) P.applyField(e.target); });

    // remember the text selection while a box is being edited, so inspector changes can style just those words
    document.addEventListener('selectionchange', () => {
      if (!S.editing) return; const s = getSelection();
      if (s.rangeCount && S.editing.tx.contains(s.anchorNode)) S.editing.range = s.getRangeAt(0).cloneRange();
    });

    document.addEventListener('copy', e => { if (typing(e.target) || S.editing) return; if (P.copy()) e.preventDefault(); });
    document.addEventListener('cut', e => { if (typing(e.target) || S.editing) return; if (P.copy()) { e.preventDefault(); P.deleteSel(); } });
    document.addEventListener('paste', e => {
      if (typing(e.target) || S.editing) return;
      const cd = e.clipboardData; if (cd && [...cd.files].some(f => f.type.startsWith('image/'))) return;
      e.preventDefault();
      if (S.clip) return P.paste();
      const txt = cd && cd.getData('text/plain'); if (txt) { const L = P.live(); P.addObj(P.mk('text', { x: L.x, y: L.y, w: L.w * .6, h: 120, html: P.esc(txt).replace(/\n/g, '<br>'), size: 14 })); }
    });

    document.addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') {
        if (document.querySelector('#modal-root .back')) { P.closeModal(); return; }
        if (S.editing) { P.stopEdit(); return; } if (S.tool !== 'select') { tool('select'); return; } S.sel = []; P.updateSel(); P.renderInspector(); return;
      }
      if (typing(e.target) || S.editing) {
        if (mod && !e.shiftKey && ['b', 'i', 'u'].includes(e.key.toLowerCase()) && S.editing) { /* native handling */ }
        return;
      }
      if (mod && ['b', 'i', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); return fmt({ b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]); }
      if (mod) return;
      const k = e.key;
      if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return P.deleteSel(); }
      if (k.startsWith('Arrow')) {
        const s = P.selObjs().filter(o => !o.locked); if (!s.length) return; e.preventDefault();
        const st = e.shiftKey ? 10 : 1; P.checkpoint();
        s.forEach(o => { if (k === 'ArrowLeft') o.x -= st; if (k === 'ArrowRight') o.x += st; if (k === 'ArrowUp') o.y -= st; if (k === 'ArrowDown') o.y += st; });
        P.renderSoon({ noInspector: true }); setTimeout(() => P.updateSel(), 100); return;
      }
      const tk = { v: 'select', t: 'text', s: 'story', r: 'rect', o: 'ellipse', l: 'line' }[k.toLowerCase()];
      if (tk) { if (tk === 'story' && S.mode === 'simple') return; tool(tk); }
    });
    window.addEventListener('resize', () => { });
  }

  // ---------- fonts on this machine ----------
  async function loadFonts() {
    try {
      if (!window.queryLocalFonts) return;
      const fonts = await window.queryLocalFonts(), fam = [...new Set(fonts.map(f => f.family))].sort((a, b) => a.localeCompare(b));
      P.fontList = Object.keys(P.FONTS).concat(fam.filter(n => !P.FONTS[n])); P.renderInspector();
    } catch (e) { }
  }

  // ---------- boot ----------
  window.addEventListener('DOMContentLoaded', () => {
    P.bindCanvas(); wire();
    try { P.setMode(localStorage.getItem('cp-mode') || 'pro'); } catch (e) { P.setMode('pro'); }
    P.setDoc(P.blankDoc(8.5, 11));
    press.onMenu((action, data) => {
      if (action === 'opened') return P.openText(data.path, data.text);
      act(action);
    });
    setTimeout(() => { if (!document.querySelector('#modal-root .back')) P.openNew(true); }, 250);
    setInterval(() => { if (S.dirty) { try { localStorage.setItem('cp-autosave', P.serialize()); } catch (e) { } } }, 30000);
    loadFonts();
    window.addEventListener('beforeunload', () => { });
  });
})();

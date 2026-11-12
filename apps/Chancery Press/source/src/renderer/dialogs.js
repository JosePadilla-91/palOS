/* Chancery Press - dialogs: new document, sheet size, divide page, find, help */
(function () {
  const S = P.S, $ = P.$, esc = P.esc, IN = P.IN;
  let closeCb = null;

  P.closeModal = function () { $('#modal-root').innerHTML = ''; if (closeCb) { closeCb(); closeCb = null; } };
  P.modal = function (o) {
    P.closeModal();
    const back = document.createElement('div'); back.className = 'back';
    const m = document.createElement('div'); m.className = 'modal'; if (o.width) m.style.width = o.width;
    m.innerHTML = `<header>${o.icon ? `<img src="../../build/icon.png" alt="">` : ''}<span>${o.title}</span></header><div class="body"></div><footer></footer>`;
    const body = m.querySelector('.body'); if (typeof o.body === 'string') body.innerHTML = o.body; else body.appendChild(o.body);
    const ft = m.querySelector('footer');
    (o.buttons || [{ label: 'Close' }]).forEach(b => {
      const bt = document.createElement('button'); bt.textContent = b.label; if (b.primary) bt.className = 'primary';
      bt.onclick = () => { if (b.onClick) { if (b.onClick(m) === false) return; } P.closeModal(); };
      ft.appendChild(bt);
    });
    back.appendChild(m); back.addEventListener('mousedown', e => { if (e.target === back && !o.sticky) P.closeModal(); });
    $('#modal-root').appendChild(back); closeCb = o.onClose || null;
    if (o.onOpen) o.onOpen(m);
    return m;
  };
  P.confirmDiscard = async () => (await press.confirm({ message: 'Discard unsaved changes?', detail: 'This document has changes that have not been saved.', buttons: ['Discard', 'Cancel'] })) === 0;

  // ---------- size picker ----------
  const mySizes = () => { try { return JSON.parse(localStorage.getItem('cp-sizes') || '[]'); } catch (e) { return []; } };
  function sizePicker(w, h) {
    const el = document.createElement('div');
    const mine = mySizes();
    el.innerHTML = `
      <div class="sizegrid"><label>Sheet size</label><select id="sp-preset" class="grow"></select></div>
      <div class="pills" id="sp-orient"><button data-o="p">Portrait</button><button data-o="l">Landscape</button></div>
      <div class="sizegrid">
        <label>Width</label><input type="number" id="sp-w" step="0.01" min="0.1">
        <label>Height</label><input type="number" id="sp-h" step="0.01" min="0.1">
        <label>Units</label><select id="sp-u"><option value="in">inches</option><option value="mm">millimeters</option><option value="cm">centimeters</option><option value="pt">points</option><option value="px">pixels (96 dpi)</option></select>
        <label></label><button id="sp-save" style="justify-self:start">★ Remember this size</button>
      </div>`;
    const preset = $('#sp-preset', el), uw = $('#sp-w', el), uh = $('#sp-h', el), uu = $('#sp-u', el);
    let W = w, H = h;
    const label = (n, a, b) => `${n}  (${+a.toFixed(2)} x ${+b.toFixed(2)} in)`;
    preset.innerHTML = P.SIZES.map((g, gi) => `<optgroup label="${g.group}">${g.items.map((it, i) => `<option value="${gi}:${i}">${esc(label(it[0], it[1], it[2]))}</option>`).join('')}</optgroup>`).join('') +
      (mine.length ? `<optgroup label="My sizes">${mine.map((m, i) => `<option value="m:${i}">${esc(label(m.name, m.w, m.h))}</option>`).join('')}</optgroup>` : '') + '<option value="custom">Custom size...</option>';
    const show = () => {
      const u = uu.value; uw.value = +P.fromIn(W, u).toFixed(3); uh.value = +P.fromIn(H, u).toFixed(3);
      P.$$('#sp-orient button', el).forEach(b => b.classList.toggle('on', (b.dataset.o === 'p') === (H >= W)));
      let found = 'custom';
      P.SIZES.forEach((g, gi) => g.items.forEach((it, i) => { if ((Math.abs(it[1] - W) < .01 && Math.abs(it[2] - H) < .01) || (Math.abs(it[2] - W) < .01 && Math.abs(it[1] - H) < .01)) found = gi + ':' + i; }));
      preset.value = found;
    };
    preset.onchange = () => {
      if (preset.value === 'custom') return;
      let it; if (preset.value.startsWith('m:')) { const m = mySizes()[+preset.value.slice(2)]; it = [m.name, m.w, m.h]; } else { const [g, i] = preset.value.split(':'); it = P.SIZES[+g].items[+i]; }
      const land = W > H; W = land ? Math.max(it[1], it[2]) : Math.min(it[1], it[2]); H = land ? Math.min(it[1], it[2]) : Math.max(it[1], it[2]); show();
    };
    const fromInputs = () => { const a = parseFloat(uw.value), b = parseFloat(uh.value); if (a > 0) W = P.toIn(a, uu.value); if (b > 0) H = P.toIn(b, uu.value); P.$$('#sp-orient button', el).forEach(x => x.classList.toggle('on', (x.dataset.o === 'p') === (H >= W))); preset.value = 'custom'; };
    uw.oninput = uh.oninput = fromInputs;
    uu.onchange = () => { const u = uu.value; uw.value = +P.fromIn(W, u).toFixed(3); uh.value = +P.fromIn(H, u).toFixed(3); };
    P.$$('#sp-orient button', el).forEach(b => b.onclick = () => { const want = b.dataset.o === 'p'; if ((H >= W) !== want) { [W, H] = [H, W]; } show(); });
    $('#sp-save', el).onclick = () => {
      const nm = `${+P.fromIn(W, uu.value).toFixed(2)} x ${+P.fromIn(H, uu.value).toFixed(2)} ${uu.value}`;
      const a = mySizes(); a.push({ name: 'Custom ' + nm, w: W, h: H }); localStorage.setItem('cp-sizes', JSON.stringify(a)); P.toast('Size remembered under "My sizes"');
      const cur = { W, H }; const re = sizePicker(cur.W, cur.H); el.replaceWith(re); out.el = re; out.get = re.get;
    };
    show();
    const out = { el, get: () => ({ w: Math.max(.1, W), h: Math.max(.1, H) }) };
    el.get = out.get;
    return out;
  }

  // ---------- folds ----------
  const FOLDS = [
    ['none', 'No folds (flat sheet)', [], []],
    ['half', 'Half fold - 2 panels (booklet / card)', [.5], []],
    ['tri', 'Tri-fold (letter fold) - 3 panels', [1 / 3, 2 / 3], []],
    ['z', 'Z-fold - 3 panels', [1 / 3, 2 / 3], []],
    ['gate', 'Gate fold - 4 panels (1/4, 1/2, 1/4)', [.25, .75], []],
    ['accordion', 'Accordion - 4 equal panels', [.25, .5, .75], []],
    ['cross', 'Quarter fold - 2 x 2 panels', [.5], [.5]],
    ['six', 'Six panels - 3 x 2', [1 / 3, 2 / 3], [.5]]
  ];
  const even = (n) => Array.from({ length: Math.max(0, n - 1) }, (_, i) => (i + 1) / n);
  const pct = (a) => a.map(x => +(x * 100).toFixed(2)).join(', ');
  const parsePct = (s) => s.split(/[,\s]+/).map(parseFloat).filter(x => x > 0 && x < 100).map(x => x / 100).sort((a, b) => a - b);

  P.openDivide = function () {
    const d0 = S.doc.setup.divide || { v: [], h: [], safe: .25 };
    const st = { v: d0.v.slice(), h: d0.h.slice(), safe: d0.safe == null ? .25 : d0.safe };
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="note" style="max-width:430px;margin-bottom:8px">Fold lines show as <b style="color:#e0407a">dotted pink guides</b> on your page so you can lay out each panel. They are <b>not printed</b>. Objects snap to the fold lines and to each panel's inner margin.</div>
      <div class="sizegrid"><label>Layout</label><select id="dv-preset" class="grow">${FOLDS.map(f => `<option value="${f[0]}">${f[1]}</option>`).join('')}<option value="custom">Custom...</option></select></div>
      <div class="sizegrid" style="margin-top:8px">
        <label>Panels across</label><input type="number" id="dv-across" min="1" max="12" step="1">
        <label>Panels down</label><input type="number" id="dv-down" min="1" max="12" step="1">
        <label>Vertical fold at (%)</label><input type="text" id="dv-vpos" placeholder="e.g. 25, 75">
        <label>Horizontal fold at (%)</label><input type="text" id="dv-hpos" placeholder="e.g. 50">
        <label>Panel inner margin (in)</label><input type="number" id="dv-safe" min="0" max="2" step="0.05">
      </div>
      <div id="dv-prev"></div>`;
    const m = P.modal({ title: 'Divide page', body, width: '520px', buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onClick: () => { P.checkpoint(); S.doc.setup.divide = { v: st.v, h: st.h, safe: st.safe }; P.render(); P.toast(st.v.length + st.h.length ? 'Fold guides added - they will not print' : 'Fold guides removed'); } }] });
    const q = (id) => $('#' + id, m);
    const draw = () => {
      const W = S.doc.w, H = S.doc.h, sc = Math.min(400 / W, 190 / H), pw = W * sc, ph = H * sc;
      const ps = [0, ...st.v, 1], hs = [0, ...st.h, 1]; let h = `<div class="foldprev" style="width:${pw}px;height:${ph}px">`, n = 1;
      for (let r = 0; r < hs.length - 1; r++) for (let c = 0; c < ps.length - 1; c++) h += `<div class="pn" style="left:${ps[c] * pw}px;top:${hs[r] * ph}px;width:${(ps[c + 1] - ps[c]) * pw}px;height:${(hs[r + 1] - hs[r]) * ph}px">${n++}</div>`;
      st.v.forEach(f => h += `<div class="fl" style="left:${f * pw - 1}px"></div>`); st.h.forEach(f => h += `<div class="flh" style="top:${f * ph - 1}px"></div>`);
      h += '</div><div class="note" style="text-align:center">' + (st.v.length + st.h.length ? 'Dotted lines are fold guides - not printed' : 'Flat sheet') + '</div>';
      q('dv-prev').innerHTML = h;
      q('dv-across').value = st.v.length + 1; q('dv-down').value = st.h.length + 1; q('dv-safe').value = st.safe;
      if (document.activeElement !== q('dv-vpos')) q('dv-vpos').value = pct(st.v); if (document.activeElement !== q('dv-hpos')) q('dv-hpos').value = pct(st.h);
    };
    const match = () => { const f = FOLDS.find(f => pct(f[2]) === pct(st.v) && pct(f[3]) === pct(st.h)); q('dv-preset').value = f ? f[0] : 'custom'; };
    q('dv-preset').onchange = (e) => { const f = FOLDS.find(f => f[0] === e.target.value); if (f) { st.v = f[2].slice(); st.h = f[3].slice(); } draw(); };
    q('dv-across').oninput = (e) => { st.v = even(Math.max(1, Math.min(12, +e.target.value | 0))); match(); draw(); };
    q('dv-down').oninput = (e) => { st.h = even(Math.max(1, Math.min(12, +e.target.value | 0))); match(); draw(); };
    q('dv-vpos').oninput = (e) => { st.v = parsePct(e.target.value); match(); draw(); };
    q('dv-hpos').oninput = (e) => { st.h = parsePct(e.target.value); match(); draw(); };
    q('dv-safe').oninput = (e) => { st.safe = Math.max(0, parseFloat(e.target.value) || 0); draw(); };
    match(); draw();
  };

  // ---------- sheet size ----------
  P.openSetup = function () {
    const sp = sizePicker(S.doc.w, S.doc.h), body = document.createElement('div');
    body.appendChild(sp.el);
    const ex = document.createElement('div'); ex.innerHTML = '<div class="row" style="margin-top:12px"><label style="min-width:0"><input type="checkbox" id="su-scale"> Stretch everything on every page to fit the new size</label></div><div class="note">Leave this off to keep objects exactly where they are.</div>';
    body.appendChild(ex);
    P.modal({ title: 'Sheet size', body, width: '470px', buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onClick: () => {
      const g = sp.get(), d = S.doc, fx = g.w / d.w, fy = g.h / d.h, scale = $('#su-scale').checked;
      P.checkpoint();
      if (scale) d.pages.forEach(pg => pg.objs.forEach(o => { o.x *= fx; o.w *= fx; o.y *= fy; o.h *= fy; }));
      d.w = g.w; d.h = g.h; P.render(); setTimeout(P.zoomFit, 20);
    } }] });
  };

  // ---------- new document ----------
  P.openNew = function (welcome) {
    const body = document.createElement('div');
    const sp = sizePicker(8.5, 11);
    body.innerHTML = `
      ${welcome ? `<div class="note" style="margin-bottom:8px">Pick a template to start fast, or set up a blank sheet below.</div>` : ''}
      <div class="catlabel" style="margin-top:0">Start from a template</div><div class="gallery" id="nw-gal"></div>
      <div class="catlabel" style="margin-top:18px">Or start with a blank sheet</div><div id="nw-size"></div>
      <div class="sizegrid" style="margin-top:6px"><label>Fold layout</label><select id="nw-fold" class="grow">${FOLDS.map(f => `<option value="${f[0]}">${f[1]}</option>`).join('')}</select></div>
      <div class="sizegrid" style="margin-top:6px"><label>Columns</label><input type="number" id="nw-cols" min="1" max="12" value="1" style="width:70px"></div>`;
    const buttons = [{ label: 'Cancel' }];
    if (welcome) {
      buttons.unshift({ label: 'Open a file...', onClick: () => { press.openDialog(); } });
      if (localStorage.getItem('cp-autosave')) buttons.unshift({ label: 'Recover unsaved work', onClick: () => { try { P.setDoc(P.parse(localStorage.getItem('cp-autosave'))); } catch (e) { P.toast('Could not recover'); } } });
    }
    buttons.push({ label: 'Create blank', primary: true, onClick: async () => {
      if (S.dirty && !(await P.confirmDiscard())) return false;
      const g = sp.get(), f = FOLDS.find(x => x[0] === $('#nw-fold').value) || FOLDS[0];
      const d = P.blankDoc(g.w, g.h, { cols: Math.max(1, +$('#nw-cols').value | 0), margins: { t: .5, r: .5, b: .5, l: .5 }, divide: { v: f[2].slice(), h: f[3].slice(), safe: .25 } });
      if (g.w < 5 || g.h < 3) d.setup.margins = { t: .15, r: .15, b: .15, l: .15 };
      P.setDoc(d);
    } });
    const m = P.modal({ title: welcome ? 'Welcome to Chancery Press' : 'New document', icon: true, body, width: '760px', buttons, sticky: welcome });
    $('#nw-size', m).appendChild(sp.el);
    const gal = $('#nw-gal', m);
    P.TEMPLATES.forEach(t => {
      const d = t.build(), c = document.createElement('div'); c.className = 'gal'; d.assets = {};
      c.appendChild(P.previewOf(d, d.pages[0].objs, d.w * IN, d.h * IN, 130, 110));
      c.insertAdjacentHTML('beforeend', `<b>${esc(t.name)}</b><small>${esc(t.sub)}</small>`);
      c.onclick = async () => { if (S.dirty && !(await P.confirmDiscard())) return; P.setDoc(t.build()); P.closeModal(); };
      gal.appendChild(c);
    });
    const mode = document.createElement('div'); mode.className = 'row'; mode.style.marginTop = '12px';
    mode.innerHTML = `<label style="min-width:auto">Tools:</label><button id="nw-simple">Simple (posters, flyers)</button><button id="nw-pro">Pro (newspapers, layouts)</button>`;
    body.appendChild(mode);
    const syncMode = () => { $('#nw-simple', m).classList.toggle('on', S.mode === 'simple'); $('#nw-pro', m).classList.toggle('on', S.mode === 'pro'); };
    $('#nw-simple', m).onclick = () => { P.setMode('simple'); syncMode(); }; $('#nw-pro', m).onclick = () => { P.setMode('pro'); syncMode(); }; syncMode();
  };

  // ---------- find & replace ----------
  P.openFind = function () {
    const body = document.createElement('div');
    body.innerHTML = `<div class="sizegrid"><label>Find</label><input id="fr-a" type="text"><label>Replace with</label><input id="fr-b" type="text"></div><div class="row" style="margin-top:8px"><label style="min-width:0"><input type="checkbox" id="fr-case"> Match case</label></div><div class="note" id="fr-res"></div>`;
    const m = P.modal({ title: 'Find & replace', body, buttons: [{ label: 'Close' }, { label: 'Count', onClick: () => { run(false); return false; } }, { label: 'Replace all', primary: true, onClick: () => { run(true); return false; } }] });
    const run = (replace) => {
      const a = $('#fr-a', m).value, b = $('#fr-b', m).value; if (!a) return;
      const re = new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $('#fr-case', m).checked ? 'g' : 'gi'); let n = 0;
      if (replace) P.checkpoint();
      Object.values(S.doc.stories).forEach(st => { const c = (st.text.match(re) || []).length; n += c; if (replace && c) st.text = st.text.replace(re, b); });
      S.doc.pages.forEach(pg => pg.objs.forEach(o => {
        if (o.type === 'text') {
          const box = document.createElement('div'); box.innerHTML = o.html;
          const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT); let nd, ch = false;
          while ((nd = w.nextNode())) { const c = (nd.data.match(re) || []).length; n += c; if (replace && c) { nd.data = nd.data.replace(re, b); ch = true; } }
          if (ch) o.html = box.innerHTML;
        }
      }));
      $('#fr-res', m).textContent = replace ? `Replaced ${n} match${n === 1 ? '' : 'es'}.` : `${n} match${n === 1 ? '' : 'es'} found.`;
      if (replace && n) P.render();
    };
    setTimeout(() => $('#fr-a', m).focus(), 30);
  };

  // ---------- help ----------
  P.openShortcuts = () => P.modal({ title: 'Keyboard shortcuts', width: '520px', body: `<table class="sc">
    ${[['V / T / S / R / O / L', 'Select / Text / Story / Box / Circle / Line tools'], ['Ctrl+N / O / S', 'New / Open / Save'], ['Ctrl+E', 'Export PDF'], ['Ctrl+P', 'Print'], ['Ctrl+Z / Shift+Z', 'Undo / Redo'], ['Ctrl+C / X / V', 'Copy / Cut / Paste'], ['Ctrl+D', 'Duplicate'], ['Ctrl+G / Shift+G', 'Group / Ungroup'], ['Ctrl+L', 'Lock / Unlock'], ['Ctrl+] / [', 'Bring forward / Send backward'], ['Arrows', 'Nudge (Shift = bigger)'], ['Delete', 'Delete selected'], ['Alt while dragging', 'Turn off snapping'], ['Shift while dragging', 'Lock to straight line'], ['Shift while resizing', 'Keep proportions'], ['Shift while rotating', 'Turn in 15 degree steps'], ['Ctrl+wheel', 'Zoom'], ['Ctrl+0 / 1', 'Fit page / Actual size'], ['Ctrl+Shift+D', 'Divide page (folds)'], ['Ctrl+Shift+M', 'Simple / Pro tools'], ['Ctrl+F', 'Find & replace']].map(r => `<tr><td><span class="kbd">${r[0]}</span></td><td>${r[1]}</td></tr>`).join('')}</table>` });
  P.openShapes = function () {
    const kinds = [['rect', 'Box'], ['rounded', 'Rounded'], ['ellipse', 'Circle'], ['triangle', 'Triangle'], ['diamond', 'Diamond'], ['pentagon', 'Pentagon'], ['hexagon', 'Hexagon'], ['octagon', 'Octagon'], ['star', 'Star'], ['burst', 'Burst'], ['cross', 'Cross'], ['arrow', 'Arrow'], ['heart', 'Heart'], ['callout', 'Callout'], ['ribbon', 'Ribbon'], ['line', 'Line']];
    const body = document.createElement('div'); body.className = 'shapegrid';
    kinds.forEach(([k, n]) => {
      const d = document.createElement('div'), kind = k === 'rounded' ? 'rect' : k;
      d.innerHTML = P.shapeSvg({ id: 'x', kind, w: 56, h: 56, fill: '#b5651d', stroke: '#111', strokeW: 1, radius: k === 'rounded' ? 14 : 0 }) + `<small>${n}</small>`;
      d.onclick = () => { P.closeModal(); P.setTool('shape:' + k); }; body.appendChild(d);
    });
    P.modal({ title: 'Shapes', body, width: '440px' });
  };
  P.openAbout = () => P.modal({ title: 'Chancery Press', icon: true, body: `<p>Version 1.0.0 - page layout for newspapers, pamphlets, flyers and posters.</p><p class="note">Part of the Chancery family for palOS.</p>` });
  P.openTour = () => P.modal({ title: 'Quick tour', width: '520px', body: `<ol style="line-height:1.7;padding-left:20px">
    <li><b>Pick a sheet.</b> Templates, standard sizes, or your own width and height (Sheet size).</li>
    <li><b>Add things.</b> Use Text, Picture, Box, Circle on the toolbar, then click or drag on the page.</li>
    <li><b>Type.</b> Double-click any text box and start typing.</li>
    <li><b>Make a pamphlet.</b> Divide page adds dotted fold guides (never printed) and panels that things snap to.</li>
    <li><b>Build a newspaper.</b> Switch to Pro, set columns in the page panel, then drop modules from the Modules tab. Story frames flow text from one box to the next.</li>
    <li><b>Finish.</b> Export a PDF at your exact sheet size, or print.</li></ol>` });
  P.openModuleName = () => {
    const body = document.createElement('div'); body.innerHTML = '<div class="sizegrid"><label>Name</label><input id="mn" type="text" value="My module"></div>';
    const m = P.modal({ title: 'Save as module', body, buttons: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: () => P.saveModule($('#mn', m).value || 'My module') }] });
    setTimeout(() => { const i = $('#mn', m); i.focus(); i.select(); }, 30);
  };
})();

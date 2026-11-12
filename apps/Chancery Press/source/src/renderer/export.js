/* Chancery Press - export: PDF (flat / booklet / tile), bleed + marks, data merge */
(function () {
  const S = P.S, $ = P.$, esc = P.esc, IN = P.IN;
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  P.preflight = function () {
    const w = new Set();
    Object.values(S.doc.stories).forEach(st => { if (st._left > 0) w.add(`A story has ${st._left} words that do not fit (look for the red + on a frame).`); });
    S.doc.pages.forEach((pg, i) => pg.objs.forEach(o => {
      if (o.hidden) return;
      if (o.type === 'image' && !o.asset) w.add(`Page ${i + 1} has an empty picture frame.`);
      if (o.type === 'text' && !String(o.html).replace(/<[^>]*>|&nbsp;/g, '').trim()) w.add(`Page ${i + 1} has an empty text box.`);
      if (o.x + o.w < 0 || o.y + o.h < 0 || o.x > P.pageW() || o.y > P.pageH()) w.add(`Page ${i + 1} has an object completely off the sheet.`);
    }));
    if (!S.merge || !S.merge.on) { const m = JSON.stringify(S.doc.pages) + JSON.stringify(S.doc.stories); if (/\{\{[^}]+\}\}/.test(m)) w.add('There are merge fields ({{Field}}) but data merge is not switched on.'); }
    return [...w];
  };

  // ---------- csv ----------
  function parseCsv(text) {
    text = text.replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const count = (c) => (first.match(new RegExp('\\' + c, 'g')) || []).length;
    const delim = count('\t') > count(',') && count('\t') >= count(';') ? '\t' : count(';') > count(',') ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x !== '')) rows.push(row); row = []; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); if (row.some(x => x !== '')) rows.push(row); }
    if (!rows.length) return null;
    const fields = rows[0].map(x => x.trim());
    return { fields, rows: rows.slice(1).map(r => Object.fromEntries(fields.map((f, i) => [f, r[i] == null ? '' : r[i]]))) };
  }

  P.openMerge = function () {
    const body = document.createElement('div');
    const draw = () => {
      const m = S.merge;
      body.innerHTML = `<div class="note" style="max-width:460px;margin-bottom:8px">Mail merge / catalog merge: load a spreadsheet saved as CSV, put <b>{{Field}}</b> markers in any text, and Chancery Press makes one copy of your layout per row.</div>
        <div class="btnrow"><button id="mg-load">${m ? 'Load a different file...' : 'Load CSV file...'}</button></div>
        ${m ? `<div class="catlabel">${m.rows.length} records, ${m.fields.length} fields</div>
        <div class="btnrow">${m.fields.map((f, i) => `<button data-fi="${i}">＋ ${esc(f)}</button>`).join('')}</div>
        <div class="note">Click a field to add it to the selected text box or story (or a new text box if nothing is selected).</div>
        <div class="row" style="margin-top:10px"><label style="min-width:0"><input type="checkbox" id="mg-on" ${m.on ? 'checked' : ''}> Preview merged data on the page</label></div>
        <div class="row"><button id="mg-prev">◀</button><span>Record ${m.idx + 1} of ${m.rows.length}</span><button id="mg-next">▶</button></div>
        <div class="note">When you export a PDF you can choose to include every record.</div>` : ''}`;
      const mm = P.$('#mg-load', body); mm.onclick = async () => {
        const f = await press.openCsv(); if (!f) return; const d = parseCsv(f.text);
        if (!d) return P.toast('That file looks empty');
        S.merge = { fields: d.fields, rows: d.rows, idx: 0, on: true, name: f.name }; P.render(); draw();
      };
      if (m) {
        P.$$('[data-fi]', body).forEach(b => b.onclick = () => insertField(m.fields[+b.dataset.fi]));
        P.$('#mg-on', body).onchange = (e) => { m.on = e.target.checked; P.render(); };
        P.$('#mg-prev', body).onclick = () => { m.idx = (m.idx + m.rows.length - 1) % m.rows.length; P.render(); draw(); };
        P.$('#mg-next', body).onclick = () => { m.idx = (m.idx + 1) % m.rows.length; P.render(); draw(); };
      }
    };
    draw();
    P.modal({ title: 'Data merge', body, width: '520px', buttons: [{ label: 'Close', primary: true }] });
  };
  function insertField(name) {
    const tok = '{{' + name + '}}', ed = S.editing;
    if (ed && ed.type === 'text') { document.execCommand('insertText', false, tok); return; }
    const o = P.selObjs()[0];
    P.checkpoint();
    if (o && o.type === 'text') o.html = (o.html || '') + (o.html ? ' ' : '') + tok;
    else if (o && o.type === 'story') { const st = S.doc.stories[o.storyId]; st.text += (st.text ? ' ' : '') + tok; }
    else { const L = P.live(); S.doc.pages[S.page].objs.push(P.mk('text', { x: L.x, y: L.y, w: 240, h: 40, html: tok, size: 16 })); }
    P.render();
  }

  // ---------- export dialog ----------
  const SHEETS = [['Letter  8.5 x 11 in', 8.5, 11], ['Legal  8.5 x 14 in', 8.5, 14], ['Tabloid  11 x 17 in', 11, 17], ['A4  8.27 x 11.69 in', 8.27, 11.69], ['A3  11.69 x 16.54 in', 11.69, 16.54]];
  P.openExport = function () {
    P.stopEdit();
    const warns = P.preflight(), d = P.outDims(), st = S.doc.setup;
    const body = document.createElement('div');
    body.innerHTML = `
      ${warns.length ? `<div class="catlabel" style="margin-top:0;color:#d97706">Design checker found ${warns.length} thing${warns.length > 1 ? 's' : ''}</div><ul class="note" style="margin:0 0 10px 16px;padding:0">${warns.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '<div class="note" style="margin-bottom:8px">Design checker: no problems found.</div>'}
      <div class="catlabel" style="margin-top:0">Output</div>
      <div class="row"><label style="min-width:0"><input type="radio" name="xm" value="normal" checked> One page per sheet (exact size: ${+d.w.toFixed(2)} x ${+d.h.toFixed(2)} in)</label></div>
      <div class="row"><label style="min-width:0"><input type="radio" name="xm" value="booklet"> Booklet (2 pages per sheet, ready to fold and staple)</label></div>
      <div class="row"><label style="min-width:0"><input type="radio" name="xm" value="tile"> Several copies on a bigger sheet (cards, tags, labels)</label></div>
      <div id="xt" style="margin-left:22px" hidden>
        <div class="sizegrid"><label>Sheet</label><select id="xt-sheet">${SHEETS.map((s, i) => `<option value="${i}">${s[0]}</option>`).join('')}</select>
        <label>Margin (in)</label><input type="number" id="xt-m" value="0.25" step="0.05" min="0">
        <label>Gap (in)</label><input type="number" id="xt-g" value="0" step="0.05" min="0"></div>
        <div class="row"><label style="min-width:0"><input type="checkbox" id="xt-ticks" checked> Small cut ticks at corners</label></div>
        <div class="row"><label style="min-width:0"><input type="checkbox" id="xt-rep" ${S.doc.pages.length === 1 ? 'checked' : ''}> Repeat each page to fill the sheet</label></div>
        <div class="note" id="xt-info"></div></div>
      <div id="xb" class="note" style="margin-left:22px" hidden>Pages are reordered for a folded booklet and padded to a multiple of 4. Print double-sided, flipping on the short edge.</div>
      <div class="catlabel">Print marks</div>
      <div class="sizegrid"><label>Bleed (in)</label><input type="number" id="xp-bleed" min="0" max="1" step="0.0625" value="${st.bleed || 0}"></div>
      <div class="row"><label style="min-width:0"><input type="checkbox" id="xp-marks" ${st.marks ? 'checked' : ''}> Crop marks</label></div>
      ${S.merge && S.merge.rows.length ? `<div class="catlabel">Data merge</div><div class="row"><label style="min-width:0"><input type="checkbox" id="xm-all" checked> One copy per record (${S.merge.rows.length} records)</label></div>` : ''}
      <div class="note" style="margin-top:8px">Fold guides, ruler guides, margins and empty picture frames never print.</div>`;
    const m = P.modal({ title: 'Export PDF', body, width: '520px', buttons: [{ label: 'Cancel' }, { label: 'Export', primary: true, onClick: () => { run(m); } }] });
    const mode = () => (P.$('input[name=xm]:checked', m) || {}).value;
    const info = () => {
      const sh = SHEETS[+P.$('#xt-sheet', m).value], mg = +P.$('#xt-m', m).value || 0, gap = +P.$('#xt-g', m).value || 0;
      const fit = (SW, SH) => ({ c: Math.max(0, Math.floor((SW - 2 * mg + gap) / (d.w + gap))), r: Math.max(0, Math.floor((SH - 2 * mg + gap) / (d.h + gap))) });
      const a = fit(sh[1], sh[2]), b = fit(sh[2], sh[1]), land = b.c * b.r > a.c * a.r, best = land ? b : a;
      m._tile = { sheetW: land ? sh[2] : sh[1], sheetH: land ? sh[1] : sh[2], cols: best.c, rows: best.r, mx: mg, my: mg, gap, ticks: P.$('#xt-ticks', m).checked, repeat: P.$('#xt-rep', m).checked };
      P.$('#xt-info', m).textContent = best.c * best.r ? `${best.c * best.r} per sheet (${best.c} across x ${best.r} down, sheet turned ${land ? 'sideways' : 'upright'})` : 'The page is too big for that sheet.';
    };
    P.$$('input[name=xm]', m).forEach(r => r.onchange = () => { P.$('#xt', m).hidden = mode() !== 'tile'; P.$('#xb', m).hidden = mode() !== 'booklet'; if (mode() === 'tile') info(); });
    ['xt-sheet', 'xt-m', 'xt-g', 'xt-ticks', 'xt-rep'].forEach(id => P.$('#' + id, m).oninput = info);
    P.$('#xp-bleed', m).onchange = (e) => { P.checkpoint(); st.bleed = Math.max(0, +e.target.value || 0); P.render(); };
    P.$('#xp-marks', m).onchange = (e) => { P.checkpoint(); st.marks = e.target.checked; P.render(); };
    info();
    async function run(mm) {
      const md = mode(), tile = mm._tile, all = P.$('#xm-all', mm) ? P.$('#xm-all', mm).checked : false;
      if (md === 'tile' && (!tile.cols || !tile.rows)) return P.toast('That page does not fit on the sheet');
      P.closeModal(); setTimeout(() => P.runExport({ mode: md, tile, merge: all }), 60);
    }
  };

  P.runExport = async function (o) {
    P.stopEdit(); S.sel = []; P.updateSel();
    const dims = P.outDims(), recs = o.merge && S.merge && S.merge.rows.length ? S.merge.rows.map((r, i) => i) : [null];
    const keep = S.merge ? { idx: S.merge.idx, on: S.merge.on } : null;
    document.body.classList.add('exporting');
    const chunks = [];
    try {
      for (const r of recs) {
        if (r !== null) { S.merge.idx = r; S.merge.on = true; P.render(); }
        await wait(r === null ? 80 : 160);
        chunks.push(await press.pdfChunk({ wIn: dims.w, hIn: dims.h }));
      }
    } finally {
      if (keep) { S.merge.idx = keep.idx; S.merge.on = keep.on; P.render(); }
      document.body.classList.remove('exporting');
    }
    const p = await press.pdfFinish({ chunks, mode: o.mode, opts: o.tile, name: (S.path ? S.path.split('/').pop().replace(/\.chpress$/, '') : 'Untitled') });
    if (p) P.toast('PDF saved' + (recs.length > 1 ? ` (${recs.length} records)` : ''));
  };
})();

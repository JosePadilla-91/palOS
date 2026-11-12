/* Chancery Press - story flow: text threads through linked frames */
(function () {
  const S = P.S;
  const tokCache = new Map();
  const flowCache = new Map(); // frameId -> {sig, html, rest}

  function tokenize(text) {
    if (tokCache.has(text)) return tokCache.get(text);
    const toks = [];
    String(text || '').split(/\n+/).forEach(par => {
      if (!par.trim()) return;
      let first = true;
      par.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach(seg => {
        if (!seg) return;
        let b = false, i = false, s = seg;
        if (/^\*\*[^*]+\*\*$/.test(seg)) { b = true; s = seg.slice(2, -2); }
        else if (/^\*[^*]+\*$/.test(seg)) { i = true; s = seg.slice(1, -1); }
        s.split(/\s+/).filter(Boolean).forEach(w => { toks.push({ w, b, i, p: first }); first = false; });
      });
    });
    if (tokCache.size > 40) tokCache.clear();
    tokCache.set(text, toks);
    return toks;
  }

  function toHtml(toks, from, to) {
    let h = '', open = false;
    for (let k = from; k < to; k++) {
      const t = toks[k];
      if (t.p || !open) {
        if (open) h += '</p>';
        h += `<p class="${t.p ? (k === 0 ? 'first' : '') : 'cont'}">`; open = true;
      } else h += ' ';
      let w = P.esc(t.w);
      if (t.b) w = '<b>' + w + '</b>'; if (t.i) w = '<i>' + w + '</i>';
      h += w;
    }
    return open ? h + '</p>' : h;
  }

  // floats that push story text away from objects marked "wrap" (single-column frames)
  function wrapPrefix(f) {
    const o = f.o; if (o.cols > 1) return '';
    const objs = S.doc.pages[f.pi].objs.filter(x => x.wrap && x.id !== o.id && x.type !== 'story'); if (!objs.length) return '';
    const fw = o.w - 2 * o.pad, fh = o.h - 2 * o.pad, side = { left: [], right: [] };
    objs.forEach(x => {
      const pd = x.wpad == null ? 8 : x.wpad, x0 = x.x - o.x - o.pad, x1 = x0 + x.w, y0 = x.y - o.y - o.pad, y1 = y0 + x.h;
      if (x1 <= 0 || x0 >= fw || y1 <= 0 || y0 >= fh) return;
      const L = (x0 + x1) / 2 < fw / 2, W = L ? Math.min(fw, Math.max(0, x1 + pd)) : Math.min(fw, Math.max(0, fw - x0 + pd));
      side[L ? 'left' : 'right'].push({ Y: Math.max(0, y0 - pd), B: y1 + pd, W });
    });
    let h = '';
    ['left', 'right'].forEach(s => {
      let cur = 0;
      side[s].sort((a, b) => a.Y - b.Y).forEach(b => { const Y = Math.max(b.Y, cur), H = b.B - Y; if (H <= 0) return; h += `<div class="wf" style="float:${s};clear:${s};width:0;height:${Y - cur}px"></div><div class="wf" style="float:${s};clear:${s};width:${b.W}px;height:${H}px"></div>`; cur = Y + H; });
    });
    return h;
  }

  const overflows = (el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;

  P.reflowStories = function () {
    if (!S.doc) return;
    const stories = S.doc.stories;
    Object.keys(stories).forEach(sid => {
      const st = stories[sid], mtext = P.mergeText(st.text), toks = tokenize(mtext);
      let idx = 0, lastFrame = null;
      st.chain.forEach((fid, n) => {
        const f = P.find(fid); if (!f) return;
        const el = document.querySelector(`.obj[data-id="${fid}"]:not(.master) .tx`); if (!el) return;
        const o = f.o, pre = wrapPrefix(f);
        const sig = [st.text.length, st.font, st.size, st.lh, st.ls, st.align, st.hyph, st.indent, st.pspace, st.bold, st.italic, st.dropcap, o.w, o.h, o.cols, o.gap, o.pad, o.rule, idx, toks.length, pre].join('|');
        const c = flowCache.get(fid);
        if (c && c.sig === sig && c.text === mtext) { el.innerHTML = c.html; idx = c.next; lastFrame = fid; return; }
        const rest = toks.length - idx;
        let n_ = 0;
        if (rest > 0) {
          el.innerHTML = pre + toHtml(toks, idx, toks.length);
          if (!overflows(el)) n_ = rest;
          else {
            let lo = 0, hi = rest; // lo fits
            while (lo < hi) {
              const mid = Math.ceil((lo + hi) / 2);
              el.innerHTML = pre + toHtml(toks, idx, idx + mid);
              if (overflows(el)) hi = mid - 1; else lo = mid;
            }
            n_ = lo;
          }
        }
        const html = pre + toHtml(toks, idx, idx + n_);
        el.innerHTML = html; idx += n_; lastFrame = fid;
        flowCache.set(fid, { sig, html, next: idx, text: mtext });
      });
      // overflow marker on last frame
      st.chain.forEach(fid => { const ct = document.querySelector(`.obj[data-id="${fid}"]:not(.master) .ct`); if (ct) ct.querySelectorAll('.ovf').forEach(x => x.remove()); });
      if (lastFrame && idx < toks.length) {
        const ct = document.querySelector(`.obj[data-id="${lastFrame}"]:not(.master) .ct`);
        if (ct) { const m = document.createElement('div'); m.className = 'ovf nonprint'; m.textContent = '+'; m.title = 'More text than fits - click to continue in a new frame (' + (toks.length - idx) + ' words left)'; ct.appendChild(m); }
      }
      st._left = toks.length - idx;
    });
  };

  // story helpers
  P.continueStory = function (frameId) {
    const r = P.find(frameId); if (!r) return;
    const o = r.o, st = S.doc.stories[o.storyId]; if (!st) return;
    P.checkpoint();
    const L = P.live(); let pi = r.pi + 1;
    if (pi >= S.doc.pages.length) S.doc.pages.push({ id: P.uid('p'), objs: [] });
    const nf = P.mk('story', { x: L.x, y: L.y, w: L.w, h: L.h, storyId: o.storyId, cols: Math.max(1, S.doc.setup.cols), gap: S.doc.setup.gutter * P.IN, rule: o.rule, pad: 0 });
    S.doc.pages[pi].objs.push(nf);
    const at = st.chain.indexOf(frameId); st.chain.splice(at + 1, 0, nf.id);
    S.page = pi; S.sel = [nf.id]; P.render(); P.gotoPage(pi, true);
    P.toast('Story continues on page ' + (pi + 1));
  };

  P.linkFrames = function () {
    const sel = P.selObjs().filter(o => o.type === 'story');
    if (sel.length < 2) return P.toast('Select two or more story frames (Shift+click) to link them');
    P.checkpoint();
    const base = sel[0].storyId, st = S.doc.stories[base];
    sel.slice(1).forEach(o => {
      if (o.storyId === base) return;
      const old = S.doc.stories[o.storyId]; if (old) old.chain = old.chain.filter(id => id !== o.id);
      o.storyId = base; st.chain.push(o.id);
    });
    // keep chain in the order selected
    st.chain = [...sel.map(o => o.id), ...st.chain.filter(id => !sel.some(o => o.id === id))];
    P.cleanStories(); P.render(); P.toast('Linked - text now flows through ' + sel.length + ' frames in the order you selected them');
  };
  P.unlinkFrame = function () {
    const o = P.selObjs().find(o => o.type === 'story'); if (!o) return;
    const st = S.doc.stories[o.storyId]; if (!st || st.chain.length < 2) return P.toast('This frame is not linked to others');
    P.checkpoint();
    st.chain = st.chain.filter(id => id !== o.id);
    const sid = P.uid('s'); o.storyId = sid; S.doc.stories[sid] = Object.assign({}, st, { text: '', chain: [o.id] });
    P.render();
  };
  P.textToStory = function () {
    const o = P.selObjs().find(o => o.type === 'text'); if (!o) return;
    P.checkpoint();
    const tmp = document.createElement('div'); tmp.innerHTML = o.html.replace(/<\/(div|p)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
    const sid = P.uid('s');
    S.doc.stories[sid] = Object.assign({}, P.STORY_DEF, { text: tmp.textContent.trim(), font: o.font, size: o.size, color: o.color, align: o.align === 'left' ? 'left' : o.align, lh: o.lh, bold: o.bold, italic: o.italic, chain: [o.id] });
    o.type = 'story'; o.storyId = sid; o.pad = o.pad || 4; delete o.html;
    P.render();
  };
  P.storyToText = function () {
    const o = P.selObjs().find(o => o.type === 'story'); if (!o) return;
    const st = S.doc.stories[o.storyId]; P.checkpoint();
    const html = st.chain.length === 1 ? String(st.text).split(/\n+/).map(p => P.esc(p)).join('<br>') : 'Text';
    st.chain = st.chain.filter(id => id !== o.id);
    Object.assign(o, P.DEF.text, { type: 'text', html, font: st.font, size: st.size, color: st.color, align: st.align, lh: st.lh, cols: o.cols || 1, gap: o.gap, rule: o.rule, fill: o.fill, stroke: o.stroke, strokeW: o.strokeW, pad: o.pad });
    delete o.storyId; P.cleanStories(); P.render();
  };
  P.focusStory = function () {
    P.renderInspector();
    const ta = document.querySelector('textarea.story'); if (ta) { ta.focus(); }
  };
})();

// The editing canvas: renders the current page and handles direct manipulation
import {
  state, on, emit, mutate, currentPage, currentElements, elementById, selectedElements, select,
  beginGesture, endGesture,
} from './store.js';
import { renderElement, pageCSS } from './render.js';
import { themeById } from './themes.js';
import { assetUrl, assetMeta, addFiles } from './media.js';
import { make } from './elements.js';
import { clamp, h, clone, uid } from './util.js';
import { showContextMenu } from './dialogs.js';
import { renderEntryEditor } from './blog.js';

let scroll, stage, wrap, pageEl, overlay, styleEl, guidesEl, formatBar;
let editingEl = null;

export const editorCtx = () => ({
  mode: 'editor',
  project: state.project,
  page: currentPage(),
  root: '',
  asset: (id) => assetUrl(id),
  href: () => '#',
  entryHref: () => '#',
  feedHref: () => '#',
});

// ---------------------------------------------------------------------------
export function initCanvas(root) {
  scroll = root;
  scroll.classList.add('cv-scroll-bg');
  stage = h('div', { class: 'cv-stage' });
  wrap = h('div', { class: 'cv-wrap' });
  pageEl = h('div', { class: 'ws-page cv-page' });
  overlay = h('div', { class: 'cv-overlay' });
  guidesEl = h('div', { class: 'cv-guides' });
  styleEl = h('style', { id: 'cv-style' });
  const resizer = h('div', { class: 'cv-page-resize', title: 'Drag to change page height' }, h('span'));
  wrap.append(pageEl, guidesEl, overlay, resizer);
  stage.append(wrap);
  scroll.append(stage);
  document.head.append(styleEl);

  formatBar = buildFormatBar();
  document.body.append(formatBar);

  // events
  stage.addEventListener('mousedown', onMouseDown);
  stage.addEventListener('dblclick', onDblClick);
  stage.addEventListener('contextmenu', onContextMenu);
  scroll.addEventListener('dragover', onDragOver);
  scroll.addEventListener('dragleave', () => scroll.classList.remove('drop-hint'));
  scroll.addEventListener('drop', onDrop);
  resizer.addEventListener('mousedown', onPageResize);
  scroll.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setZoom(state.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    }
  }, { passive: false });

  on('project', render);
  on('page', render);
  on('change', render);
  on('assets', render);
  on('selection', drawOverlay);
  on('zoom', layout);
  window.addEventListener('resize', drawOverlay);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
export function render() {
  if (!state.project) return;
  if (editingEl) return; // never clobber the DOM under an active text edit
  const page = currentPage();
  if (!page) return;
  const entryMode = page.type === 'blog' && state.entryId;
  scroll.classList.toggle('entry-mode', !!entryMode);
  if (entryMode) {
    stage.style.display = 'none';
    renderEntryEditor(scroll);
    return;
  }
  stage.style.display = '';
  scroll.querySelector('.entry-editor')?.remove();

  const theme = themeById(state.project.site.theme);
  const ctx = editorCtx();
  const pc = pageCSS(page, state.project.site, theme, ctx);
  let css = `.cv-page{${pc.page}}\n.cv-scroll-bg{${pc.body}}\n`;
  let html = '';
  for (const el of page.elements) {
    if (el.hidden) continue;
    const r = renderElement(el, ctx);
    css += r.css + '\n';
    html += r.html;
  }
  styleEl.textContent = css;
  pageEl.innerHTML = html;
  pageEl.querySelectorAll('.ws-el').forEach((d) => {
    const el = page.elements.find((e) => e.id === d.id);
    if (el?.locked) d.classList.add('cv-locked');
    // text boxes grow to fit their words, as in a classic site builder
    if (el?.type === 'text' && !el.rot) {
      const t = d.querySelector('.ws-txt');
      const need = t ? Math.ceil(t.scrollHeight) : 0;
      if (need > el.h + 1) { el.h = need; d.style.height = need + 'px'; }
    }
  });
  // pause any slideshow: show first slide only; videos stay paused
  layout();
}

function layout() {
  const page = currentPage();
  if (!page || !pageEl) return;
  const W = state.project.site.width || 980;
  const z = state.zoom;
  pageEl.style.transform = `scale(${z})`;
  wrap.style.width = W * z + 'px';
  wrap.style.height = page.height * z + 'px';
  const margin = Math.max(40, (themeById(state.project.site.theme).page.margin || 0));
  stage.style.padding = `${margin}px 60px 120px`;
  drawOverlay();
}

export function setZoom(z) {
  state.zoom = clamp(Math.round(z * 100) / 100, 0.25, 3);
  emit('zoom');
}

export function fitZoom() {
  const W = state.project.site.width || 980;
  setZoom(Math.min(1.5, (scroll.clientWidth - 120) / W));
}

// ---------------------------------------------------------------------------
// Overlay (selection boxes + handles)
// ---------------------------------------------------------------------------
const HANDLES = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];

function domHeight(el) {
  const d = pageEl.querySelector('#' + CSS.escape(el.id));
  return d ? Math.max(el.h, d.offsetHeight) : el.h;
}

export function drawOverlay() {
  if (!overlay) return;
  overlay.innerHTML = '';
  const page = currentPage();
  if (!page || (page.type === 'blog' && state.entryId)) return;
  const z = state.zoom;
  const sel = selectedElements();
  for (const el of sel) {
    const hh = domHeight(el);
    const box = h('div', {
      class: 'cv-sel' + (el.locked ? ' locked' : '') + (state.editingTextId === el.id ? ' editing' : ''),
      style: {
        left: el.x * z + 'px', top: el.y * z + 'px', width: el.w * z + 'px', height: hh * z + 'px',
        transform: el.rot ? `rotate(${el.rot}deg)` : '',
      },
    });
    if (sel.length === 1 && !el.locked && state.editingTextId !== el.id) {
      for (const [hx, hy] of HANDLES) {
        box.append(h('div', {
          class: `cv-h h${hx}${hy}`, 'data-hx': hx, 'data-hy': hy,
          style: { left: `${(hx + 1) * 50}%`, top: `${(hy + 1) * 50}%` },
        }));
      }
      box.append(h('div', { class: 'cv-rot', title: 'Rotate (Shift snaps to 15°)' }));
      box.append(h('div', { class: 'cv-dim' }, `${Math.round(el.w)} × ${Math.round(hh)}${el.rot ? ` · ${Math.round(el.rot)}°` : ''}`));
    }
    if (el.locked) box.append(h('div', { class: 'cv-lock' }, '🔒'));
    overlay.append(box);
  }
  positionFormatBar();
}

function showGuides(lines) {
  guidesEl.innerHTML = '';
  const z = state.zoom;
  for (const g of lines) {
    guidesEl.append(h('div', {
      class: 'cv-guide ' + g.axis,
      style: g.axis === 'v'
        ? { left: g.pos * z + 'px', top: 0, bottom: 0 }
        : { top: g.pos * z + 'px', left: 0, right: 0 },
    }));
  }
}

// ---------------------------------------------------------------------------
// Pointer helpers
// ---------------------------------------------------------------------------
function toPage(e) {
  const r = wrap.getBoundingClientRect();
  return { x: (e.clientX - r.left) / state.zoom, y: (e.clientY - r.top) / state.zoom };
}

function elementAt(target, e) {
  let d = target?.closest?.('.cv-page > .ws-el');
  if (!d && e) {
    // look underneath the selection overlay
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.closest?.('.cv-page > .ws-el'));
    d = hit?.closest('.cv-page > .ws-el');
  }
  return d ? elementById(d.id) : null;
}

function snapTargets(excludeIds) {
  const W = state.project.site.width || 980;
  const page = currentPage();
  const xs = [0, W / 2, W, 60, W - 60];
  const ys = [0, page.height / 2, page.height];
  for (const o of page.elements) {
    if (excludeIds.includes(o.id) || o.hidden || o.rot) continue;
    xs.push(o.x, o.x + o.w / 2, o.x + o.w);
    ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  return { xs, ys };
}

function snapValue(cands, targets, thr) {
  let best = null;
  for (const c of cands) {
    for (const t of targets) {
      const d = t - c.v;
      if (Math.abs(d) <= thr && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, pos: t };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Mouse interactions
// ---------------------------------------------------------------------------
function onMouseDown(e) {
  if (e.button !== 0) return;
  if (editingEl && editingEl.contains(e.target)) return; // clicks inside the text being edited
  if (editingEl) finishTextEdit();

  const handle = e.target.closest('.cv-h');
  const rot = e.target.closest('.cv-rot');
  if (handle) return startResize(e, +handle.dataset.hx, +handle.dataset.hy);
  if (rot) return startRotate(e);

  let el = elementAt(e.target, e);
  if (!el && e.target.closest('.cv-sel') && state.selection.length) el = selectedElements()[0];
  if (!el) return startMarquee(e);
  if (e.shiftKey || e.ctrlKey || e.metaKey) {
    select(state.selection.includes(el.id) ? state.selection.filter((i) => i !== el.id) : [...state.selection, el.id]);
    return;
  }
  if (!state.selection.includes(el.id)) select([el.id]);
  startMove(e, el);
}

function startMove(e, el) {
  e.preventDefault();
  const moving = selectedElements().filter((x) => !x.locked);
  if (!moving.length) return;
  const before = beginGesture();
  const p0 = toPage(e);
  const starts = moving.map((m) => ({ m, x: m.x, y: m.y }));
  const ids = moving.map((m) => m.id);
  const targets = snapTargets(ids);
  let moved = false;
  let altCopied = false;

  const onMove = (ev) => {
    const p = toPage(ev);
    let dx = p.x - p0.x, dy = p.y - p0.y;
    if (!moved && Math.hypot(dx, dy) * state.zoom < 3) return;
    if (!moved && ev.altKey && !altCopied) {
      // Alt-drag duplicates
      altCopied = true;
      const page = currentPage();
      const copies = moving.map((m) => ({ ...clone(m), id: uid('e') }));
      page.elements.push(...copies);
      render();
    }
    moved = true;
    // snapping on the bounding box
    const bx = Math.min(...starts.map((s) => s.x)) + dx;
    const by = Math.min(...starts.map((s) => s.y)) + dy;
    const bw = Math.max(...starts.map((s) => s.x + s.m.w)) - Math.min(...starts.map((s) => s.x));
    const bh = Math.max(...starts.map((s) => s.y + s.m.h)) - Math.min(...starts.map((s) => s.y));
    const guides = [];
    if (!ev.ctrlKey) {
      const thr = 6 / state.zoom;
      const sx = snapValue([{ v: bx }, { v: bx + bw / 2 }, { v: bx + bw }], targets.xs, thr);
      const sy = snapValue([{ v: by }, { v: by + bh / 2 }, { v: by + bh }], targets.ys, thr);
      if (sx) { dx += sx.d; guides.push({ axis: 'v', pos: sx.pos }); }
      if (sy) { dy += sy.d; guides.push({ axis: 'h', pos: sy.pos }); }
    }
    if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    showGuides(guides);
    for (const s of starts) {
      s.m.x = Math.round(s.x + dx);
      s.m.y = Math.round(s.y + dy);
      const d = pageEl.querySelector('#' + CSS.escape(s.m.id));
      if (d) { d.style.left = s.m.x + 'px'; d.style.top = s.m.y + 'px'; }
    }
    drawOverlay();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    showGuides([]);
    if (moved) {
      if (altCopied) {
        // originals stay put; the copies were pushed last... swap so the dragged items are the copies
        const page = currentPage();
        const copies = page.elements.slice(-moving.length);
        moving.forEach((m, i) => {
          const c = copies[i];
          [c.x, c.y, m.x, m.y] = [m.x, m.y, starts[i].x, starts[i].y];
        });
        state.selection = copies.map((c) => c.id);
      }
      endGesture(before);
      emit('change');
      emit('selection');
    }
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function startResize(e, hx, hy) {
  e.preventDefault();
  e.stopPropagation();
  const el = selectedElements()[0];
  if (!el) return;
  const before = beginGesture();
  const p0 = toPage(e);
  const s = { x: el.x, y: el.y, w: el.w, h: el.h };
  const th = (el.rot || 0) * Math.PI / 180;
  const cos = Math.cos(th), sin = Math.sin(th);
  const keepDefault = (el.type === 'image' || el.type === 'video' || el.type === 'embed') && hx && hy;
  const ratio = s.w / s.h;
  const targets = snapTargets([el.id]);
  const d = pageEl.querySelector('#' + CSS.escape(el.id));

  const onMove = (ev) => {
    const p = toPage(ev);
    const gx = p.x - p0.x, gy = p.y - p0.y;
    // into local (unrotated) frame
    let lx = gx * cos + gy * sin;
    let ly = -gx * sin + gy * cos;
    let w = Math.max(8, s.w + hx * lx);
    let hgt = Math.max(8, s.h + hy * ly);
    const keep = ev.shiftKey ? !keepDefault : keepDefault;
    if (keep && hx && hy) {
      if (w / hgt > ratio) hgt = w / ratio; else w = hgt * ratio;
    } else if (keep && hx) hgt = w / ratio;
    else if (keep && hy) w = hgt * ratio;

    // snapping for unrotated elements
    const guides = [];
    if (!el.rot && !ev.ctrlKey && !keep) {
      const thr = 6 / state.zoom;
      if (hx === 1) { const sn = snapValue([{ v: s.x + w }], targets.xs, thr); if (sn) { w += sn.d; guides.push({ axis: 'v', pos: sn.pos }); } }
      if (hx === -1) { const sn = snapValue([{ v: s.x + s.w - w }], targets.xs, thr); if (sn) { w -= sn.d; guides.push({ axis: 'v', pos: sn.pos }); } }
      if (hy === 1) { const sn = snapValue([{ v: s.y + hgt }], targets.ys, thr); if (sn) { hgt += sn.d; guides.push({ axis: 'h', pos: sn.pos }); } }
      if (hy === -1) { const sn = snapValue([{ v: s.y + s.h - hgt }], targets.ys, thr); if (sn) { hgt -= sn.d; guides.push({ axis: 'h', pos: sn.pos }); } }
    }
    showGuides(guides);

    // keep the opposite anchor fixed
    const dw = w - s.w, dh = hgt - s.h;
    const ox = (hx * dw) / 2, oy = (hy * dh) / 2;
    const cx = s.x + s.w / 2 + ox * cos - oy * sin;
    const cy = s.y + s.h / 2 + ox * sin + oy * cos;
    el.w = Math.round(w);
    el.h = Math.round(hgt);
    el.x = Math.round(cx - w / 2);
    el.y = Math.round(cy - hgt / 2);
    if (d) Object.assign(d.style, { left: el.x + 'px', top: el.y + 'px', width: el.w + 'px', [d.classList.contains('ws-grow') ? 'minHeight' : 'height']: el.h + 'px' });
    if (el.type === 'shape' && el.shape === 'line') render();
    drawOverlay();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    showGuides([]);
    endGesture(before);
    emit('change');
    emit('selection');
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function startRotate(e) {
  e.preventDefault();
  e.stopPropagation();
  const el = selectedElements()[0];
  if (!el) return;
  const before = beginGesture();
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
  const d = pageEl.querySelector('#' + CSS.escape(el.id));
  const onMove = (ev) => {
    const p = toPage(ev);
    let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
    if (ev.shiftKey) a = Math.round(a / 15) * 15;
    else if (Math.abs(((a % 90) + 90) % 90) < 3 || Math.abs(((a % 90) + 90) % 90) > 87) a = Math.round(a / 90) * 90;
    a = ((a + 180) % 360 + 360) % 360 - 180;
    el.rot = Math.round(a * 10) / 10;
    if (d) d.style.transform = el.rot ? `rotate(${el.rot}deg)` : '';
    drawOverlay();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    endGesture(before);
    emit('change');
    emit('selection');
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function startMarquee(e) {
  const p0 = toPage(e);
  const box = h('div', { class: 'cv-marquee' });
  overlay.append(box);
  const additive = e.shiftKey;
  const initial = additive ? [...state.selection] : [];
  if (!additive) select([]);
  const onMove = (ev) => {
    const p = toPage(ev);
    const x = Math.min(p.x, p0.x), y = Math.min(p.y, p0.y);
    const w = Math.abs(p.x - p0.x), hh = Math.abs(p.y - p0.y);
    const z = state.zoom;
    Object.assign(box.style, { left: x * z + 'px', top: y * z + 'px', width: w * z + 'px', height: hh * z + 'px' });
    if (w < 3 && hh < 3) return;
    const hits = currentElements().filter((el) => !el.hidden && el.x < x + w && el.x + el.w > x && el.y < y + hh && el.y + el.h > y).map((el) => el.id);
    state.selection = [...new Set([...initial, ...hits])];
    drawOverlay();
    overlay.append(box);
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    box.remove();
    emit('selection');
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function onPageResize(e) {
  e.preventDefault();
  e.stopPropagation();
  const page = currentPage();
  const before = beginGesture();
  const y0 = e.clientY, h0 = page.height;
  const minH = Math.max(300, ...page.elements.map((el) => el.y + 20));
  const bands = page.elements.filter((el) => el.y <= 2 && el.y + el.h >= h0 - 2);
  const onMove = (ev) => {
    page.height = Math.round(Math.max(minH, h0 + (ev.clientY - y0) / state.zoom));
    for (const b of bands) b.h = page.height - b.y;
    layout();
    render();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    endGesture(before);
    emit('change');
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// ---------------------------------------------------------------------------
// Inline text editing
// ---------------------------------------------------------------------------
function onDblClick(e) {
  const el = elementAt(e.target, e);
  if (!el || el.locked) return;
  if (['text', 'shape', 'button'].includes(el.type)) startTextEdit(el);
  else if (el.type === 'image' || el.type === 'video' || el.type === 'audio') emit('request-replace-media', el.id);
  else emit('focus-inspector', el.type);
}

export function startTextEdit(el) {
  if (el.type === 'shape' && el.shape === 'line') return;
  if (el.type === 'shape' && !el.html) {
    el.html = '<p>Text</p>';
    render();
  }
  select([el.id]);
  state.editingTextId = el.id;
  const d = pageEl.querySelector('#' + CSS.escape(el.id));
  const target = el.type === 'button' ? d?.querySelector('.ws-btn-label') : d?.querySelector('.ws-txt');
  if (!target) return;
  editingEl = target;
  editingEl.dataset.before = beginGesture();
  target.contentEditable = el.type === 'button' ? 'plaintext-only' : 'true';
  target.spellcheck = true;
  d.classList.add('cv-editing');
  target.focus();
  // select all on first edit of placeholder-ish text, otherwise caret at click
  const range = document.createRange();
  range.selectNodeContents(target);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand('styleWithCSS', false, true);
  target.addEventListener('input', onTextInput);
  target.addEventListener('keydown', onTextKey);
  target.addEventListener('paste', onTextPaste);
  drawOverlay();
  emit('text-edit', true);
}

function onTextInput() {
  const el = elementById(state.editingTextId);
  if (!el || el.type !== 'text') return;
  const d = pageEl.querySelector('#' + CSS.escape(el.id));
  const need = editingEl.scrollHeight;
  if (need > el.h + 1) {
    el.h = Math.ceil(need);
    d.style.height = el.h + 'px';
    drawOverlay();
  }
}

function onTextKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); finishTextEdit(); }
  if (e.key === 'Enter' && state.editingTextId && elementById(state.editingTextId)?.type === 'button') { e.preventDefault(); finishTextEdit(); }
  if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    document.execCommand({ b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]);
  }
  e.stopPropagation();
}

function onTextPaste(e) {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
}

export function finishTextEdit() {
  if (!editingEl) return;
  const target = editingEl;
  const id = state.editingTextId;
  const el = elementById(id);
  editingEl = null;
  state.editingTextId = null;
  target.contentEditable = 'false';
  target.removeEventListener('input', onTextInput);
  target.removeEventListener('keydown', onTextKey);
  target.removeEventListener('paste', onTextPaste);
  window.getSelection()?.removeAllRanges();
  if (el) {
    if (el.type === 'button') {
      el.label = target.textContent.trim() || 'Button';
      const need = Math.ceil(target.scrollWidth) + 36;
      if (need > el.w) el.w = need;
    }
    else el.html = cleanHtml(target.innerHTML);
  }
  endGesture(target.dataset.before);
  formatBar.hidden = true;
  emit('text-edit', false);
  emit('change');
  emit('selection');
}

export const isEditingText = () => !!editingEl;

function cleanHtml(html) {
  const t = document.createElement('div');
  t.innerHTML = html;
  t.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
  // wrap stray top-level text in paragraphs
  const out = [];
  let inline = [];
  const flush = () => {
    if (inline.length) {
      const p = document.createElement('p');
      inline.forEach((n) => p.append(n));
      if (p.textContent.trim() || p.querySelector('img,br')) out.push(p);
      inline = [];
    }
  };
  for (const n of [...t.childNodes]) {
    if (n.nodeType === 1 && /^(P|H1|H2|H3|H4|UL|OL|BLOCKQUOTE|DIV|PRE)$/.test(n.nodeName)) {
      flush();
      if (n.nodeName === 'DIV') {
        const p = document.createElement('p');
        p.innerHTML = n.innerHTML;
        if (n.getAttribute('style')) p.setAttribute('style', n.getAttribute('style'));
        out.push(p);
      } else out.push(n);
    } else inline.push(n);
  }
  flush();
  return out.map((n) => n.outerHTML).join('') || '<p><br></p>';
}

// Floating format bar (like classic text format strip)
function buildFormatBar() {
  const cmd = (c, v) => (e) => { e.preventDefault(); document.execCommand(c, false, v); onTextInput(); };
  const block = (tag) => (e) => { e.preventDefault(); document.execCommand('formatBlock', false, tag); onTextInput(); };
  const color = h('input', {
    type: 'color', title: 'Text colour', value: '#333333',
    oninput: (e) => { document.execCommand('foreColor', false, e.target.value); },
  });
  const bar = h('div', { class: 'fmt-bar', hidden: true, onmousedown: (e) => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') e.preventDefault(); } },
    h('select', {
      title: 'Paragraph style',
      onchange: (e) => { document.execCommand('formatBlock', false, e.target.value); e.target.value = ''; editingEl?.focus(); onTextInput(); },
    }, h('option', { value: '' }, 'Style'), h('option', { value: 'p' }, 'Body'), h('option', { value: 'h1' }, 'Title'), h('option', { value: 'h2' }, 'Heading'), h('option', { value: 'h3' }, 'Subheading'), h('option', { value: 'blockquote' }, 'Quote')),
    h('button', { title: 'Bold', onmousedown: cmd('bold') }, h('b', {}, 'B')),
    h('button', { title: 'Italic', onmousedown: cmd('italic') }, h('i', {}, 'I')),
    h('button', { title: 'Underline', onmousedown: cmd('underline') }, h('u', {}, 'U')),
    h('button', { title: 'Strikethrough', onmousedown: cmd('strikeThrough') }, h('s', {}, 'S')),
    h('span', { class: 'sep' }),
    h('button', { title: 'Align left', onmousedown: cmd('justifyLeft') }, '⯇'),
    h('button', { title: 'Center', onmousedown: cmd('justifyCenter') }, '≡'),
    h('button', { title: 'Align right', onmousedown: cmd('justifyRight') }, '⯈'),
    h('span', { class: 'sep' }),
    h('button', { title: 'Bulleted list', onmousedown: cmd('insertUnorderedList') }, '•≡'),
    h('button', { title: 'Numbered list', onmousedown: cmd('insertOrderedList') }, '1.'),
    h('button', {
      title: 'Link', onmousedown: (e) => {
        e.preventDefault();
        const sel = window.getSelection();
        const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
        emit('prompt-link', (url) => {
          if (!url) return;
          editingEl?.focus();
          if (range) { sel.removeAllRanges(); sel.addRange(range); }
          document.execCommand('createLink', false, url);
        });
      },
    }, '🔗'),
    color,
    h('button', { title: 'Clear formatting', onmousedown: cmd('removeFormat') }, '⌫'),
  );
  block; // (kept for future block buttons)
  return bar;
}

function positionFormatBar() {
  if (!formatBar) return;
  const el = state.editingTextId && elementById(state.editingTextId);
  if (!editingEl || !el || el.type === 'button') { formatBar.hidden = true; return; }
  const r = editingEl.closest('.ws-el').getBoundingClientRect();
  formatBar.hidden = false;
  const top = r.top - 46 < 90 ? r.bottom + 8 : r.top - 46;
  formatBar.style.top = top + 'px';
  formatBar.style.left = Math.max(8, Math.min(window.innerWidth - formatBar.offsetWidth - 8, r.left)) + 'px';
}
scrollListener();
function scrollListener() {
  document.addEventListener('scroll', () => positionFormatBar(), true);
}

// ---------------------------------------------------------------------------
// Drag & drop of media
// ---------------------------------------------------------------------------
function onDragOver(e) {
  const types = [...e.dataTransfer.types];
  if (types.includes('Files') || types.includes('application/x-ws-asset')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    scroll.classList.add('drop-hint');
    pageEl.querySelectorAll('.cv-drop-target').forEach((n) => n.classList.remove('cv-drop-target'));
    const el = elementAt(null, e);
    if (el && ['image', 'gallery', 'slideshow', 'video', 'audio'].includes(el.type)) {
      pageEl.querySelector('#' + CSS.escape(el.id))?.classList.add('cv-drop-target');
    }
  }
}

async function onDrop(e) {
  scroll.classList.remove('drop-hint');
  pageEl.querySelectorAll('.cv-drop-target').forEach((n) => n.classList.remove('cv-drop-target'));
  const assetId = e.dataTransfer.getData('application/x-ws-asset');
  const files = [...(e.dataTransfer.files || [])];
  if (!assetId && !files.length) return;
  e.preventDefault();
  const target = elementAt(null, e);
  const point = toPage(e);
  const ids = assetId ? [assetId] : await addFiles(files);
  if (!ids.length) return;
  placeAssets(ids, point, target);
}

/** Insert or assign dropped assets */
export function placeAssets(ids, point, target) {
  const page = currentPage();
  if (!page) return;
  const metas = ids.map(assetMeta).filter(Boolean);
  if (!metas.length) return;
  const images = metas.filter((m) => m.kind === 'image');

  if (target && (target.type === 'gallery' || target.type === 'slideshow') && images.length) {
    mutate(() => { target.images.push(...images.map((m) => ({ asset: m.id, caption: '' }))); });
    select([target.id]);
    return;
  }
  if (target && target.type === 'image' && images.length) {
    mutate(() => {
      target.asset = images[0].id;
      target.alt = target.alt || images[0].name.replace(/\.[^.]+$/, '');
    });
    select([target.id]);
    return;
  }
  if (target && target.type === 'video' && metas[0].kind === 'video') {
    mutate(() => { target.asset = metas[0].id; });
    select([target.id]);
    return;
  }
  if (target && target.type === 'video' && images.length) {
    mutate(() => { target.poster = images[0].id; });
    select([target.id]);
    return;
  }
  if (target && target.type === 'audio' && metas[0].kind === 'audio') {
    mutate(() => { target.asset = metas[0].id; });
    select([target.id]);
    return;
  }

  // create new elements
  const W = state.project.site.width || 980;
  const created = [];
  let off = 0;
  const center = point || defaultInsertPoint();
  if (images.length > 1) {
    const cols = Math.min(4, images.length);
    const g = make.gallery(Math.max(0, center.x - 300), center.y, 600, Math.ceil(images.length / cols) * 160, images.map((m) => ({ asset: m.id, caption: '' })), { cols });
    created.push(g);
  } else {
    for (const m of metas) {
      let el;
      if (m.kind === 'image') {
        const maxW = Math.min(480, W - 40);
        const w = Math.min(maxW, m.w || maxW);
        const hh = m.w ? Math.round((w * m.h) / m.w) : 320;
        el = make.image(center.x - w / 2 + off, center.y - hh / 2 + off, w, hh, m.id, { alt: m.name.replace(/\.[^.]+$/, '') });
      } else if (m.kind === 'video') {
        const w = 640, hh = m.w ? Math.round((w * m.h) / m.w) : 360;
        el = make.video(center.x - w / 2 + off, center.y - hh / 2 + off, w, hh, m.id);
      } else if (m.kind === 'audio') {
        el = make.audio(center.x - 160 + off, center.y - 27 + off, 320, 54, m.id);
      }
      if (el) { el.x = Math.round(clamp(el.x, -el.w / 2, W - el.w / 2)); el.y = Math.round(Math.max(0, el.y)); created.push(el); off += 20; }
    }
  }
  if (!created.length) return;
  mutate(() => { page.elements.push(...created); });
  select(created.map((c) => c.id));
}

export function defaultInsertPoint() {
  const W = state.project.site.width || 980;
  const r = wrap.getBoundingClientRect();
  const sr = scroll.getBoundingClientRect();
  const visTop = Math.max(0, (sr.top - r.top) / state.zoom);
  const visH = sr.height / state.zoom;
  return { x: W / 2, y: Math.round(visTop + Math.min(visH, 900) / 2.6) };
}

// ---------------------------------------------------------------------------
function onContextMenu(e) {
  e.preventDefault();
  const el = elementAt(e.target, e);
  if (el && !state.selection.includes(el.id)) select([el.id]);
  const has = state.selection.length > 0;
  showContextMenu(e.clientX, e.clientY, [
    { label: 'Cut', cmd: 'cut', disabled: !has },
    { label: 'Copy', cmd: 'copy', disabled: !has },
    { label: 'Paste', cmd: 'paste' },
    { label: 'Duplicate', cmd: 'duplicate', disabled: !has },
    { label: 'Delete', cmd: 'delete', disabled: !has },
    '-',
    { label: 'Bring to Front', cmd: 'arrange', arg: 'front', disabled: !has },
    { label: 'Send to Back', cmd: 'arrange', arg: 'back', disabled: !has },
    '-',
    el?.locked ? { label: 'Unlock', cmd: 'lock', arg: false } : { label: 'Lock', cmd: 'lock', arg: true, disabled: !has },
    el && ['text', 'shape'].includes(el.type) ? { label: 'Edit Text', cmd: 'edit-text' } : null,
    el && ['image', 'video', 'audio'].includes(el.type) ? { label: 'Replace Media…', cmd: 'replace-media' } : null,
  ].filter(Boolean));
}

export function getPageElement() { return pageEl; }

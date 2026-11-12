// Small helpers shared by Fen's views.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}

export function humanSize(n) {
  if (n == null) return '';
  if (n < 1000) return `${n} bytes`;
  const u = ['KB', 'MB', 'GB', 'TB']; let i = -1;
  do { n /= 1000; i++; } while (n >= 1000 && i < u.length - 1);
  return `${n >= 100 ? Math.round(n) : n.toFixed(1).replace(/\.0$/, '')} ${u[i]}`;
}

export function longDate(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** A small dialog. build(box) fills it and returns { ok: () => value }; resolves with that value or null. */
export function modal(title, build, okLabel = 'OK') {
  return new Promise((resolve) => {
    const m = $('#modal');
    const box = el('div', { class: 'box' }, el('h2', { text: title }));
    const content = el('div');
    box.append(content);
    const api = build(content) || {};
    const cancel = el('button', { class: 'btn', text: 'Cancel' });
    const ok = el('button', { class: 'btn primary', text: okLabel });
    box.append(el('div', { class: 'acts' }, cancel, ok));
    m.textContent = ''; m.append(box); m.classList.remove('hidden');
    const done = (v) => { m.classList.add('hidden'); m.textContent = ''; document.removeEventListener('keydown', key, true); resolve(v); };
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); } else if (e.key === 'Enter' && !e.target.closest('select')) { e.preventDefault(); e.stopPropagation(); ok.click(); } };
    document.addEventListener('keydown', key, true);
    cancel.onclick = () => done(null);
    ok.onclick = () => { const v = api.ok ? api.ok() : true; if (v !== undefined && v !== false) done(v); };
    setTimeout(() => { const f = box.querySelector('input, select'); if (f) { f.focus(); if (f.select) f.select(); } }, 30);
  });
}

export function menu(x, y, items) {
  // a tiny popup menu for the zoom button
  return new Promise((resolve) => {
    const m = el('div', { class: 'popmenu', style: { position: 'fixed', left: x + 'px', top: y + 'px', zIndex: 60 } });
    for (const it of items) {
      if (it === '-') { m.append(el('div', { class: 'pm-sep' })); continue; }
      m.append(el('div', { class: 'pm-it', text: it.label, onclick: () => { close(); resolve(it.value); } }));
    }
    const close = () => { m.remove(); document.removeEventListener('mousedown', out, true); };
    const out = (e) => { if (!m.contains(e.target)) { close(); resolve(null); } };
    document.body.append(m);
    setTimeout(() => document.addEventListener('mousedown', out, true), 0);
  });
}

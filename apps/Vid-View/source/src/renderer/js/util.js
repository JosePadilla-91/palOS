'use strict';
/* global window, document */
window.C = window.C || {};

C.$ = (s, r = document) => r.querySelector(s);
C.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
C.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
C.clamp = (v, a, b) => Math.min(b, Math.max(a, v));

C.el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
};

C.fmt = (t, forceHours = false) => {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const ss = String(s).padStart(2, '0');
  return h || forceHours ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

C.fmtLong = (t) => {
  if (!t) return '';
  const h = Math.floor(t / 3600);
  const m = Math.round((t % 3600) / 60);
  return h ? `${h} hr ${m} min` : `${Math.max(1, m)} min`;
};

C.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

C.debounce = (fn, ms) => {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.cancel = () => clearTimeout(t);
  return d;
};

C.once = (target, ev, timeout = 0) => new Promise((resolve, reject) => {
  let to;
  const h = (e) => { clearTimeout(to); target.removeEventListener(ev, h); resolve(e); };
  target.addEventListener(ev, h);
  if (timeout) to = setTimeout(() => { target.removeEventListener(ev, h); reject(new Error('timeout')); }, timeout);
});

C.basename = (p) => String(p || '').split('/').filter(Boolean).pop() || p;

/** Toast notification with optional action button. */
C.toast = (msg, { action, onAction, ms = 3200, kind = '' } = {}) => {
  const box = C.$('#toasts');
  const t = C.el('div', { class: `toast ${kind}` }, C.el('span', { text: msg }));
  if (action) {
    t.append(C.el('button', { text: action, onclick: () => { onAction && onAction(); t.remove(); } }));
  }
  box.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, ms);
  return t;
};

/** Simple modal; returns { close, el }. */
C.modal = (html, { onClose } = {}) => {
  const m = C.$('#modal');
  m.innerHTML = `<div class="modal-card">${html}</div>`;
  m.classList.add('show');
  const close = () => { m.classList.remove('show'); onClose && onClose(); };
  return { close, el: m.firstElementChild };
};


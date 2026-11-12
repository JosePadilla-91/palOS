'use strict';
/* Paladin Settings: small helpers shared by all panels. */
const $ = (s, r = document) => r.querySelector(s);

function el(tag, attrs = {}, ...kids) {
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
const svg = (html, cls = '') => { const t = document.createElement('template'); t.innerHTML = `<svg class="${cls}" viewBox="0 0 16 16" aria-hidden="true">${html}</svg>`; return t.content.firstChild; };
function fileURL(p) { return 'file://' + String(p).split('/').map(encodeURIComponent).join('/'); }

/* ------------------------------------------------------------ building blocks */
function card(...rows) { return el('div', { class: 'card' }, ...rows); }
function heading(text) { return el('h2', { text }); }
function note(text) { return el('p', { class: 'note', text }); }
function row(title, sub, ...controls) {
  return el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 't', text: title }), sub ? el('div', { class: 's', text: sub }) : null), el('div', { class: 'ctl' }, ...controls));
}
function toggle(checked, onchange, label, disabled) {
  const b = el('button', { class: 'switch', role: 'switch', 'aria-checked': checked ? 'true' : 'false', 'aria-label': label || '', disabled: !!disabled });
  b.addEventListener('click', async () => {
    const v = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(v)); b.disabled = true;
    try { await onchange(v); } finally { b.disabled = false; }
  });
  return b;
}
function select(options, value, onchange, label) {
  const s = el('select', { 'aria-label': label || '' }, options.map((o) => el('option', { value: o.value, text: o.label, selected: String(o.value) === String(value) })));
  s.addEventListener('change', () => onchange(s.value));
  return s;
}
function seg(options, value, onchange, label) {
  const g = el('div', { class: 'seg', role: 'group', 'aria-label': label || '' });
  for (const o of options) {
    const b = el('button', { 'aria-pressed': String(o.value === value), text: o.label });
    b.addEventListener('click', () => { for (const x of g.children) x.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-pressed', 'true'); onchange(o.value); });
    g.append(b);
  }
  return g;
}
function slider(min, max, step, value, oninput, label, onchange) {
  const r = el('input', { type: 'range', min, max, step, value, 'aria-label': label || '' });
  let t = null;
  r.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => oninput(Number(r.value)), 60); });
  if (onchange) r.addEventListener('change', () => onchange(Number(r.value)));
  return r;
}
function button(text, onclick, cls = '') { const b = el('button', { class: 'btn ' + cls, text }); b.addEventListener('click', onclick); return b; }
function spinner() { return el('div', { class: 'spin', role: 'status', 'aria-label': 'Working' }); }

/* ------------------------------------------------------------ dialogs and messages */
function toast(text, ms = 2600) {
  const old = $('#toast'); if (old) old.remove();
  const t = el('div', { id: 'toast', role: 'status', text }); document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

/** Show a small dialog. fields: [{name, label, type, value, placeholder}] ; resolves with values or null. */
function dialog({ title, text, fields = [], ok = 'OK', cancel = 'Cancel', danger = false, check = null, extra = null }) {
  return new Promise((resolve) => {
    const old = $('#dlg'); if (old) old.remove();
    const inputs = {};
    const err = el('div', { class: 'err', role: 'alert' });
    const okBtn = el('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), text: ok });
    const box = el('div', { class: 'box', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el('h3', { text: title }), text ? el('p', { text }) : null,
      fields.length ? el('div', { class: 'fields' }, fields.map((f) => {
        if (f.type === 'checkbox') {
          const i = inputs[f.name] = el('input', { type: 'checkbox', checked: !!f.value });
          return el('label', { class: 'inline' }, i, f.label);
        }
        if (f.type === 'select') {
          const i = inputs[f.name] = el('select', {}, f.options.map((o) => el('option', { value: o.value, text: o.label, selected: o.value === f.value })));
          return el('label', {}, f.label, i);
        }
        const i = inputs[f.name] = el('input', { type: f.type || 'text', value: f.value || '', placeholder: f.placeholder || '', autocomplete: 'off', spellcheck: 'false' });
        return el('label', {}, f.label, i);
      })) : null,
      extra, err,
      el('div', { class: 'acts' }, cancel ? button(cancel, () => done(null)) : null, okBtn));
    const wrap = el('div', { id: 'dlg' }, box);
    const values = () => Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.type === 'checkbox' ? i.checked : i.value]));
    async function submit() {
      const v = values();
      if (check) {
        okBtn.disabled = true; err.textContent = '';
        let msg = null;
        try { msg = await check(v); } catch (e) { msg = String(e.message || e); }
        okBtn.disabled = false;
        if (msg) { err.textContent = msg; return; }
      }
      done(v);
    }
    function done(v) { wrap.remove(); document.removeEventListener('keydown', key, true); resolve(v); }
    function key(e) { if (e.key === 'Escape' && cancel) { e.preventDefault(); done(null); } if (e.key === 'Enter' && !e.target.matches('button')) { e.preventDefault(); submit(); } }
    okBtn.addEventListener('click', submit);
    document.addEventListener('keydown', key, true);
    document.body.append(wrap);
    const first = box.querySelector('input,select') || okBtn; first.focus();
  });
}

/* ------------------------------------------------------------ navigation */
const ICONS = {
  access: '<circle cx="8" cy="2.8" r="1.3"/><path d="M2.8 5.4L8 6.4l5.2-1M8 6.4v3.4M8 9.8l-2.4 4.4M8 9.8l2.4 4.4"/>',
  wifi: '<path d="M2 6.6a8.6 8.6 0 0 1 12 0M4.3 9a5.3 5.3 0 0 1 7.4 0M6.6 11.4a2 2 0 0 1 2.8 0"/><circle cx="8" cy="13.4" r=".6"/>',
  network: '<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c1.8 1.8 2.6 3.8 2.6 6S9.8 12.2 8 14C6.2 12.2 5.4 10.2 5.4 8S6.2 3.8 8 2"/>',
  appearance: '<circle cx="8" cy="8" r="6"/><path d="M8 2v12" /><path d="M8 3.2a4.8 4.8 0 0 1 0 9.6z" fill="#fff"/>',
  dock: '<rect x="1.8" y="2.5" width="12.4" height="11" rx="2"/><path d="M4 11h8"/><path d="M5 11V9.4M8 11V9.4M11 11V9.4"/>',
  display: '<rect x="1.8" y="2.4" width="12.4" height="8.6" rx="1.4"/><path d="M6 13.8h4M8 11v2.8"/>',
  sound: '<path d="M2.5 6.2h2.4L8 3.6v8.8L4.9 9.8H2.5z"/><path d="M10.6 5.6a3.4 3.4 0 0 1 0 4.8M12.4 3.8a6 6 0 0 1 0 8.4"/>',
  keyboard: '<rect x="1.5" y="4" width="13" height="8.5" rx="1.5"/><path d="M4 7h.01M6.5 7h.01M9 7h.01M11.5 7h.01M5 10h6"/>',
  mouse: '<rect x="4.2" y="1.6" width="7.6" height="12.8" rx="3.8"/><path d="M8 1.6v4.6M4.2 6.2h7.6"/>',
  trackpad: '<rect x="2" y="2.5" width="12" height="11" rx="1.8"/><path d="M2 10.4h12M8 10.4v3.1"/>',
  users: '<circle cx="8" cy="5.4" r="2.8"/><path d="M2.8 14c.6-2.8 2.7-4.3 5.2-4.3s4.6 1.5 5.2 4.3"/>',
  parental: '<circle cx="5.6" cy="4.6" r="2.2"/><circle cx="11.2" cy="7.2" r="1.7"/><path d="M1.8 13.6c.4-2.6 1.9-4.2 3.8-4.2s3.4 1.6 3.8 4.2M8.8 13.6c.3-1.9 1.2-3.1 2.4-3.1s2.2 1.2 2.5 3.1"/>',
  region: '<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c1.8 1.8 2.6 3.8 2.6 6S9.8 12.2 8 14C6.2 12.2 5.4 10.2 5.4 8S6.2 3.8 8 2"/><path d="M3 5h10M3 11h10"/>',
  datetime: '<circle cx="8" cy="8" r="6"/><path d="M8 4.4V8l2.4 1.6"/>',
  power: '<rect x="1.6" y="4.6" width="11.2" height="6.8" rx="1.6"/><path d="M14.4 7v2"/><path d="M7.6 5.8 5.8 8.2h2.6L6.6 10.4"/>',
};
const PANELS = [];      // {id, title, group, render(root)}
function panel(id, title, group, render) { PANELS.push({ id, title, group, render }); }

let current = null, renderToken = 0;
async function show(id) {
  const p = PANELS.find((x) => x.id === id) || PANELS[0];
  current = p.id;
  for (const b of document.querySelectorAll('#side .nav')) { const on = b.dataset.id === p.id; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); }
  const root = $('#panel');
  const token = ++renderToken;
  root.replaceChildren(el('h1', { text: p.title }), el('div', { class: 'empty' }, spinner()));
  const body = el('div');
  try { await p.render(body, () => token !== renderToken); } catch (e) { body.replaceChildren(el('div', { class: 'empty', text: 'Something went wrong: ' + (e.message || e) })); }
  if (token !== renderToken) return;
  root.replaceChildren(el('h1', { text: p.title }), body);
  $('#main').scrollTop = 0;
}
function refresh() { if (current) show(current); }

function buildSidebar() {
  const side = $('#side');
  const groups = [];
  for (const p of PANELS) { let g = groups.find((x) => x.name === p.group); if (!g) groups.push(g = { name: p.group, items: [] }); g.items.push(p); }
  for (const g of groups) {
    side.append(el('div', { class: 'grp' }, g.items.map((p) => {
      const b = el('button', { class: 'nav', 'data-id': p.id }, el('div', { class: 'ico' }, svg(ICONS[p.id] || '')), el('span', { text: p.title }));
      b.addEventListener('click', () => show(p.id));
      return b;
    })));
  }
}

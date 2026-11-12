'use strict';
/* Small UI helpers shared by palOS utilities: elements, forms in a dialog, toasts, dates, sizes. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
  return e;
}
const SVG = (d, cls = '') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); if (cls) s.setAttribute('class', cls); s.innerHTML = d; return s; };
function humanSize(n) {
  if (n == null || isNaN(n)) return '--';
  const u = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB']; let i = 0; let x = n;
  while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; }
  return i === 0 ? `${x} bytes` : `${x >= 100 ? Math.round(x) : x.toFixed(1)} ${u[i]}`;
}
function niceDate(ms) {
  if (!ms) return '--';
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
let toastTimer = null;
function toast(text) {
  let t = $('#toast'); if (!t) { t = el('div', { id: 'toast' }); document.body.append(t); }
  t.textContent = text; t.classList.remove('hidden'); t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove('show'); t.classList.add('hidden'); }, 2200);
}
/** A form in a dialog. fields: [{ name, label, type, value, placeholder, options:[{value,label}] , hint }]. Resolves to values or null. */
function form({ title, text, fields = [], ok = 'OK', danger = false, validate }) {
  return new Promise((resolve) => {
    let d = $('#dlg'); if (d) d.remove();
    d = el('div', { id: 'dlg' });
    const inputs = {};
    const err = el('div', { class: 'err' });
    const box = el('form', { class: 'box' }, el('h3', { text: title }), text ? el('p', { text }) : null);
    const wrap = el('div', { class: 'fields' });
    for (const f of fields) {
      let input;
      if (f.type === 'select') { input = el('select', { name: f.name }, ...(f.options || []).map((o) => el('option', { value: o.value, selected: o.value === f.value }, o.label))); }
      else if (f.type === 'checkbox') { input = el('input', { type: 'checkbox', name: f.name, checked: !!f.value }); }
      else input = el('input', { type: f.type || 'text', name: f.name, value: f.value ?? '', placeholder: f.placeholder || '', spellcheck: 'false', autocomplete: 'off' });
      inputs[f.name] = input;
      wrap.append(f.type === 'checkbox' ? el('label', { class: 'inline' }, input, ' ' + f.label) : el('label', {}, el('span', { text: f.label }), input), f.hint ? el('div', { class: 'hint', text: f.hint }) : null);
    }
    const cancel = el('button', { type: 'button', class: 'btn' }, 'Cancel');
    const okb = el('button', { type: 'submit', class: 'btn ' + (danger ? 'danger' : 'primary') }, ok);
    box.append(wrap, err, el('div', { class: 'acts' }, cancel, okb));
    d.append(box); document.body.append(d);
    const values = () => Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.type === 'checkbox' ? i.checked : i.value]));
    const close = (v) => { d.remove(); resolve(v); };
    cancel.onclick = () => close(null);
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(null); });
    box.onsubmit = async (e) => {
      e.preventDefault();
      const v = values();
      const problem = validate ? await validate(v) : null;
      if (problem) { err.textContent = problem; return; }
      close(v);
    };
    setTimeout(() => { const first = Object.values(inputs)[0]; (first || okb).focus(); }, 30);
  });
}
async function confirmBox(message, detail, okLabel = 'OK', danger = false) {
  const r = await api.invoke('ui:message', { type: danger ? 'warning' : 'info', message, detail, buttons: [okLabel, 'Cancel'], defaultId: danger ? 1 : 0, cancelId: 1 });
  return r && r.response === 0;
}
async function alertBox(message, detail) { await api.invoke('ui:message', { type: 'warning', message, detail, buttons: ['OK'] }); }

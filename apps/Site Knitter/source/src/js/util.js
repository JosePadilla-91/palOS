// Small shared helpers
export const uid = (p = 'e') =>
  p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const round = (v) => Math.round(v * 100) / 100;

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'page';
}

/** Tiny DOM builder: h('div', {class:'x', onclick}, child, 'text') */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function hexToRgba(hex, a = 1) {
  let c = String(hex || '#000').replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const n = parseInt(c.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function formatDate(iso, style = 'long') {
  const d = new Date(iso + (iso && iso.length === 10 ? 'T12:00:00' : ''));
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, style === 'short'
    ? { year: 'numeric', month: 'short', day: 'numeric' }
    : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = String(html || '').replace(/<\/(p|h\d|li|blockquote|div)>|<br\s*\/?>/gi, '$& ');
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

export function bytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

/** Replace <img data-asset="id"> sources using urlFn(id) */
export function hydrateAssets(html, urlFn) {
  return String(html || '').replace(/<img([^>]*?)data-asset="([^"]+)"([^>]*?)>/g, (m, a, id, b) => {
    const rest = (a + b).replace(/\ssrc="[^"]*"/g, '');
    return `<img${rest} data-asset="${id}" src="${urlFn(id)}">`;
  });
}

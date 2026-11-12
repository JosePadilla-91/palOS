'use strict';
/* Symbols window: categories on the left, a grid of characters, details on the right. */
const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } for (const c of kids) if (c != null) e.append(c); return e; };

let DATA = null, STATE = null;
let list = [];                 // code points currently shown
let current = null;            // selected code point
let catId = 'recent';
const hex = (cp) => cp.toString(16).toUpperCase().padStart(4, '0');

const FR = /^fr/i.test(navigator.language || '') && window.SYMBOLS_NAMES_FR ? window.SYMBOLS_NAMES_FR : null;
function nameEn(cp) {
  const h = hex(cp);
  if (DATA.names[h]) return DATA.names[h];
  if (cp >= 0x4E00 && cp <= 0x9FFF) return `CJK Unified Ideograph ${h}`;
  if (cp >= 0xAC00 && cp <= 0xD7A3) return `Hangul Syllable ${hangul(cp)}`;
  return `U+${h}`;
}
function nameOf(cp) {
  const h = hex(cp);
  if (FR) {
    if (FR[h]) return FR[h];
    if (cp >= 0x4E00 && cp <= 0x9FFF) return `Idéogramme unifié CJC ${h}`;
    if (cp >= 0xAC00 && cp <= 0xD7A3) return `Syllabe hangûl ${hangul(cp)}`;
  }
  if (DATA.names[h]) return DATA.names[h];
  if (cp >= 0x4E00 && cp <= 0x9FFF) return `CJK Unified Ideograph ${h}`;
  if (cp >= 0xAC00 && cp <= 0xD7A3) return `Hangul Syllable ${hangul(cp)}`;
  return `U+${h}`;
}
function hangul(cp) {
  const L = ['G', 'GG', 'N', 'D', 'DD', 'R', 'M', 'B', 'BB', 'S', 'SS', '', 'J', 'JJ', 'C', 'K', 'T', 'P', 'H'];
  const V = ['A', 'AE', 'YA', 'YAE', 'EO', 'E', 'YEO', 'YE', 'O', 'WA', 'WAE', 'OE', 'YO', 'U', 'WEO', 'WE', 'WI', 'YU', 'EU', 'YI', 'I'];
  const T = ['', 'G', 'GG', 'GS', 'N', 'NJ', 'NH', 'D', 'L', 'LG', 'LM', 'LB', 'LS', 'LT', 'LP', 'LH', 'M', 'B', 'BS', 'S', 'SS', 'NG', 'J', 'C', 'K', 'T', 'P', 'H'];
  const s = cp - 0xAC00; return (L[Math.floor(s / 588)] + V[Math.floor((s % 588) / 28)] + T[s % 28]).toLowerCase().replace(/^./, (c) => c.toUpperCase());
}
const isComb = (cp) => (cp >= 0x300 && cp <= 0x36F) || (cp >= 0x591 && cp <= 0x5C7) || (cp >= 0x610 && cp <= 0x61A) || (cp >= 0x64B && cp <= 0x65F) || (cp >= 0x1D165 && cp <= 0x1D1AD && cp < 0x1D16D);
const glyph = (cp) => String.fromCodePoint(cp);
const cpsOf = (cat) => { const out = []; for (const [a, b] of cat.ranges) for (let c = a; c <= b; c++) out.push(c); return out; };

// ---------------------------------------------------------------- sidebar
const SAMPLE = { emoji: '😀', arrows: '→', bullets: '★', currency: '€', math: '∑', letterlike: '№', punctuation: '¶', latin: 'Ä', greek: 'Ω', cyrillic: 'Ж', hebrew: 'א', arabic: 'ع', cjk: '雨', hangul: '한', technical: '⌘', box: '▦', music: '♫', dingbats: '✿', games: '♞', braille: '⠿', phonetic: 'ə' };
function sidebar() {
  const nav = $('#nav'); nav.textContent = '';
  const item = (id, label, g, n) => {
    const b = el('button', { class: 'nav' + (catId === id ? ' on' : ''), onclick: () => { $('#q').value = ''; show(id); } }, el('span', { class: 'g', text: g }), el('span', { class: 'n', text: label }));
    nav.append(b);
  };
  item('recent', 'Recently Used', '🕘'); item('favorites', 'Favorites', '☆');
  nav.append(el('div', { class: 'sep' }));
  for (const c of DATA.cats) item(c.id, c.label, SAMPLE[c.id] || '•');
}

// ---------------------------------------------------------------- grid (only the rows on screen are drawn)
const wrap = $('#gridwrap'), grid = $('#grid'), sizer = $('#sizer');
function cellSize() { return parseFloat(getComputedStyle(document.body).getPropertyValue('--cell')) || 52; }
function perRow() { return Math.max(1, Math.floor((wrap.clientWidth - 20) / cellSize())); }
function layout() {
  const rows = Math.ceil(list.length / perRow());
  sizer.style.height = rows * cellSize() + 16 + 'px';
  draw();
}
let drawn = '';
function draw(force) {
  const cs = cellSize(), pr = perRow();
  const first = Math.max(0, Math.floor(wrap.scrollTop / cs) - 2);
  const last = Math.min(Math.ceil(list.length / pr), Math.ceil((wrap.scrollTop + wrap.clientHeight) / cs) + 2);
  const key = `${first}:${last}:${pr}:${list.length}:${current}`;
  if (key === drawn && !force) return; drawn = key;
  grid.style.top = first * cs + 8 + 'px';
  const frag = document.createDocumentFragment();
  for (let i = first * pr; i < Math.min(list.length, last * pr); i++) {
    const cp = list[i];
    const c = el('div', { class: 'cell' + (cp === current ? ' on' : '') + (isComb(cp) ? ' comb' : ''), title: nameOf(cp) });
    c.append(glyph(cp)); c.dataset.cp = cp;
    frag.append(c);
  }
  grid.replaceChildren(frag);
}
wrap.addEventListener('scroll', () => draw());
new ResizeObserver(() => layout()).observe(wrap);
grid.addEventListener('click', (e) => { const c = e.target.closest('.cell'); if (c) select(+c.dataset.cp); });
grid.addEventListener('dblclick', (e) => { const c = e.target.closest('.cell'); if (c) copy(+c.dataset.cp); });

function setList(cps, emptyText) {
  list = cps; wrap.scrollTop = 0; drawn = '';
  $('#none').classList.toggle('hidden', !!cps.length); $('#none').textContent = emptyText || '';
  layout();
  if (!cps.includes(current)) select(cps[0] ?? null);
}
function show(id) {
  catId = id; sidebar();
  if (id === 'recent') return setList(STATE.recent.map((s) => s.codePointAt(0)), 'Characters you copy appear here.');
  if (id === 'favorites') return setList(STATE.favorites.map((s) => s.codePointAt(0)), 'Select a character and choose Add to Favorites.');
  const c = DATA.cats.find((x) => x.id === id); setList(cpsOf(c));
}

// ---------------------------------------------------------------- search: by name, by character, or by code (U+2192, 2192)
let all = null;
const fold = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/’/g, "'");
function search(q) {
  q = q.trim();
  if (!q) return show(catId === 'search' ? 'recent' : catId);
  catId = 'search'; sidebar();
  if (!all) { all = []; const seen = new Set(); for (const c of DATA.cats) for (const cp of cpsOf(c)) if (!seen.has(cp)) { seen.add(cp); all.push(cp); } }
  const out = [];
  const code = q.match(/^(?:u\+|0x)?([0-9a-f]{2,6})$/i);
  if (code) { const cp = parseInt(code[1], 16); if (cp <= 0x10FFFF) out.push(cp); }
  if ([...q].length <= 2 && !/^[a-z0-9]+$/i.test(q)) for (const ch of q) out.push(ch.codePointAt(0));
  const words = (FR ? fold(q.toLowerCase()) : q.toLowerCase()).split(/\s+/);
  for (const cp of all) {
    if (out.length > 3000) break;
    let n = nameOf(cp).toLowerCase();
    if (FR) n = fold(n + ' ' + nameEn(cp).toLowerCase());
    if (words.every((w) => n.includes(w))) out.push(cp);
  }
  setList([...new Set(out)], 'No characters match.');
}
let sTimer = null;
$('#q').addEventListener('input', () => { clearTimeout(sTimer); sTimer = setTimeout(() => search($('#q').value), 160); });

// ---------------------------------------------------------------- details
function utf8(cp) { return [...new TextEncoder().encode(glyph(cp))].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' '); }
function select(cp) {
  current = cp; draw(true);
  const d = $('#detail'); d.classList.toggle('none', cp == null);
  if (cp == null) return;
  $('#big').textContent = (isComb(cp) ? '◌' : '') + glyph(cp);
  $('#dname').textContent = nameOf(cp);
  const rows = [['Unicode', 'U+' + hex(cp)], ['UTF-8', utf8(cp)], ['HTML', `&#x${hex(cp)};`], ['Decimal', String(cp)]];
  $('#dinfo').replaceChildren(...rows.map(([k, v]) => el('tr', {}, el('td', { text: k }), el('td', { text: v }))));
  $('#fav').textContent = STATE.favorites.includes(glyph(cp)) ? 'Remove from Favorites' : 'Add to Favorites';
  const v = $('#variants'); v.textContent = '';
  if (cp > 0x7F && !(cp >= 0x1F300)) {
    v.append(el('h4', { text: 'In other typefaces' }));
    const box = el('div', { class: 'fonts' });
    for (const f of ['Noto Serif', 'Noto Sans Mono', 'DejaVu Sans', 'Liberation Serif', 'Noto Sans Math', 'Ubuntu']) { const t = el('div', { title: f }); t.style.fontFamily = `"${f}"`; t.textContent = glyph(cp); box.append(t); }
    v.append(box);
  }
}
async function copy(cp) {
  if (cp == null) return;
  STATE.recent = await api.invoke('copy', glyph(cp));
  toast(`Copied ${glyph(cp)}`);
  if (catId === 'recent') { const keep = current; show('recent'); select(keep); }
}
async function toggleFav() {
  if (current == null) return;
  const on = !STATE.favorites.includes(glyph(current));
  STATE.favorites = await api.invoke('favorite', glyph(current), on);
  select(current);
  if (catId === 'favorites') show('favorites');
}
$('#copy').onclick = () => copy(current);
$('#fav').onclick = toggleFav;

let tTimer = null;
function toast(t) { const x = $('#toast'); x.textContent = t; x.classList.remove('hidden'); clearTimeout(tTimer); tTimer = setTimeout(() => x.classList.add('hidden'), 1400); }

// keyboard: arrows move, Return copies
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input')) { if (e.key === 'ArrowDown') { e.preventDefault(); wrap.focus(); } return; }
  const i = list.indexOf(current); if (i < 0) return;
  const pr = perRow(); let j = i;
  if (e.key === 'ArrowRight') j = i + 1; else if (e.key === 'ArrowLeft') j = i - 1; else if (e.key === 'ArrowDown') j = i + pr; else if (e.key === 'ArrowUp') j = i - pr;
  else if (e.key === 'Enter') return copy(current); else return;
  e.preventDefault(); j = Math.max(0, Math.min(list.length - 1, j)); select(list[j]);
  const cs = cellSize(), y = Math.floor(j / pr) * cs;
  if (y < wrap.scrollTop) wrap.scrollTop = y; else if (y + cs > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = y + cs - wrap.clientHeight + 16;
});

function setSize(s) { document.body.classList.remove('small', 'large'); if (s !== 'medium') document.body.classList.add(s); api.invoke('size', s); layout(); }
api.on('size', setSize);
api.on('cmd', async (c) => {
  if (c === 'copy') copy(current); else if (c === 'fav') toggleFav(); else if (c === 'find') { $('#q').focus(); $('#q').select(); }
  else if (c === 'clearRecent') { STATE.recent = await api.invoke('clearRecent'); if (catId === 'recent') show('recent'); }
});

(async () => {
  DATA = window.SYMBOLS_DATA; STATE = await api.invoke('state');
  if (STATE.size && STATE.size !== 'medium') document.body.classList.add(STATE.size);
  show(STATE.recent.length ? 'recent' : 'emoji');
})();

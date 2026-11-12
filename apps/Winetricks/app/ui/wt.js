'use strict';
// Winetricks for palOS: browse Winetricks' catalogue, tick what to add, Install.
const $ = (s) => document.querySelector(s);
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids) c != null && e.append(c);
  return e;
}
const CATS = [
  { id: 'dlls', g: '🧩', label: 'Components', sub: 'Windows libraries and runtimes some programs need (Visual C++, .NET, DirectX parts, codecs).' },
  { id: 'fonts', g: '🔤', label: 'Fonts', sub: 'Windows fonts, for programs and documents that expect them.' },
  { id: 'settings', g: '⚙️', label: 'Settings', sub: 'Windows version, graphics and sound options for the Windows environment.' },
  { id: 'apps', g: '📦', label: 'Apps', sub: 'Programs Winetricks can install for you.' },
  { id: 'installed', g: '✓', label: 'Installed', sub: 'What Winetricks has added to this account’s Windows environment.' },
];
let lists = null;
let installed = new Set();
let cat = 'dlls';
const picked = new Set();
let busy = false;

function nav() {
  const n = $('#nav');
  n.textContent = '';
  for (const c of CATS) {
    if (c.id === 'installed') n.append(el('div', { class: 'sep' }));
    const count = c.id === 'installed' ? installed.size : lists ? lists[c.id].length : '';
    n.append(
      el(
        'button',
        { class: 'nav' + (cat === c.id ? ' on' : ''), onclick: () => ((cat = c.id), ($('#q').value = ''), render()) },
        el('span', { class: 'g', text: c.g }),
        el('span', { class: 'n', text: c.label }),
        el('span', { class: 'c', text: String(count) }),
      ),
    );
  }
}

function items() {
  if (!lists) return [];
  const q = $('#q').value.trim().toLowerCase();
  let all;
  if (q) all = ['dlls', 'fonts', 'settings', 'apps'].flatMap((k) => lists[k]);
  else if (cat === 'installed') {
    const known = new Map(['dlls', 'fonts', 'settings', 'apps'].flatMap((k) => lists[k]).map((x) => [x.verb, x]));
    all = [...installed].map((v) => known.get(v) || { verb: v, title: v, who: '' });
  } else all = lists[cat];
  return q ? all.filter((x) => (x.verb + ' ' + x.title + ' ' + x.who).toLowerCase().includes(q)) : all;
}

function render() {
  nav();
  const c = CATS.find((x) => x.id === cat);
  const q = $('#q').value.trim();
  $('#title').textContent = q ? `Results for “${q}”` : c.label;
  $('#sub').textContent = q ? '' : c.sub;
  const L = $('#list');
  L.textContent = '';
  const its = items();
  const frag = document.createDocumentFragment();
  for (const x of its) {
    const has = installed.has(x.verb);
    const cb = el('input', { type: 'checkbox', disabled: busy || (has && cat !== 'settings' && !/=/.test(x.verb) && !lists?.settings.some((s) => s.verb === x.verb)) });
    cb.checked = picked.has(x.verb);
    cb.addEventListener('change', () => {
      cb.checked ? picked.add(x.verb) : picked.delete(x.verb);
      foot();
    });
    const row = el(
      'label',
      { class: 'row' },
      cb,
      el('div', { class: 't' }, el('b', { text: x.title }), x.who ? el('span', { text: x.who }) : null),
      has ? el('span', { class: 'tag', text: 'Installed' }) : null,
      el('code', { text: x.verb }),
    );
    frag.append(row);
  }
  L.append(frag);
  $('#none').classList.toggle('hidden', !!its.length || !lists);
  $('#none').textContent = cat === 'installed' && !q ? 'Nothing added with Winetricks yet.' : 'Nothing matches.';
  foot();
}

function foot() {
  const n = picked.size;
  $('#count').textContent = busy ? '' : n ? (n === 1 ? '1 item selected' : `${n} items selected`) : '';
  $('#install').disabled = busy || !n;
  $('#install').textContent = 'Install';
}

let tTimer = 0;
function toast(t) {
  const x = $('#toast');
  x.textContent = t;
  x.classList.remove('hidden');
  clearTimeout(tTimer);
  tTimer = setTimeout(() => x.classList.add('hidden'), 2600);
}

function setBusy(b) {
  busy = b;
  $('#cancel').classList.toggle('hidden', !b);
  $('#line').classList.toggle('hidden', !b);
  const st = $('#status');
  const sp = st.querySelector('.spin');
  if (b && !sp) st.prepend(el('span', { class: 'spin' }));
  if (!b && sp) sp.remove();
  render();
}

function log(line) {
  const L = $('#log');
  L.textContent += line + '\n';
  if (L.textContent.length > 200000) L.textContent = L.textContent.slice(-150000);
  L.scrollTop = L.scrollHeight;
  if (busy) $('#line').textContent = line.replace(/^-+$/, '').slice(0, 200) || $('#line').textContent;
}

$('#install').addEventListener('click', async () => {
  const verbs = [...picked];
  if (!verbs.length) return;
  setBusy(true);
  $('#line').textContent = 'Starting…';
  $('#log').textContent = '';
  const ok = await window.api.invoke('install', verbs);
  if (!ok && busy) setBusy(false);
});
$('#cancel').addEventListener('click', () => window.api.invoke('cancel'));
$('#showlog').addEventListener('click', () => {
  const h = $('#log').classList.toggle('hidden');
  $('#showlog').textContent = h ? 'Show Details' : 'Hide Details';
});
$('#openc').addEventListener('click', () => window.api.invoke('openC'));
$('#q').addEventListener('input', render);

window.api.on('log', log);
window.api.on('done', async (code, msg) => {
  msg && log(msg);
  installed = new Set(await window.api.invoke('installed'));
  setBusy(false);
  if (code === 0) {
    toast(picked.size === 1 ? 'Installed.' : 'All installed.');
    picked.clear();
  } else if (code === -1) toast('Stopped.');
  else {
    toast('Something didn’t install. Details are below.');
    $('#log').classList.remove('hidden');
    $('#showlog').textContent = 'Hide Details';
  }
  render();
});
window.api.on('cmd', (c) => {
  if (c === 'find') $('#q').focus();
  else if (c === 'clear') (picked.clear(), render());
  else if (CATS.some((x) => x.id === c)) ((cat = c), ($('#q').value = ''), render());
});

(async () => {
  nav();
  installed = new Set(await window.api.invoke('installed'));
  lists = await window.api.invoke('lists');
  $('#loading').classList.add('hidden');
  render();
})();

'use strict';
/* Fonts: library on the left, families in the middle, the selected family previewed on the right. */
const $ = (s) => document.querySelector(s);
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') e.textContent = v; else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k);
  return e;
}
function toast(t, ms = 2400) { const b = $('#toast'); b.textContent = t; b.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => b.classList.add('hidden'), ms); }

const MODES = [['sample', 'Sample'], ['alphabet', 'Alphabet'], ['paragraph', 'Paragraph'], ['custom', 'Custom'], ['info', 'Information']];
const SAMPLE_EN = 'The quick brown fox jumps over the lazy dog.';
const SAMPLE_FR = 'Portez ce vieux whisky au juge blond qui fume.';
const FR = /^fr/i.test(navigator.language || '');
const PARA = FR
  ? 'Voix ambiguë d’un cœur qui, au zéphyr, préfère les jattes de kiwis. Le cœur déçu mais l’âme plutôt naïve, Louÿs rêva de crapaüter en canoë au delà des îles, près du mälström où brûlent les novæ. 0123456789 « guillemets » — tirets, $ € £ ¥ % & @ ?! ;:'
  : 'Typography is the craft of endowing human language with a durable visual form. Sphinx of black quartz, judge my vow. How vexingly quick daft zebras jump! 0123456789 “quotes” — dashes, $ € £ ¥ % & @ ?! ;:';
const ALPHA = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789', 'ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸÆŒ àâäçéèêëîïôöùûüÿæœß', '! ? & @ # $ € £ ¥ % ( ) [ ] { } « » “ ” ‘ ’ — – …'];
const WEIGHTS = [[0, 100], [40, 200], [50, 300], [55, 350], [75, 400], [80, 400], [100, 500], [180, 600], [200, 700], [205, 800], [210, 900], [215, 950]];
const cssWeight = (w) => { let best = 400, d = 1e9; for (const [fc, css] of WEIGHTS) if (Math.abs(fc - w) < d) { d = Math.abs(fc - w); best = css; } return best; };

const S = { fams: [], view: 'all', sel: null, face: 0, mode: 'sample', size: 36, custom: '', collections: [], file: null, q: '' };
const loaded = new Map();      // file#index -> css family name loaded from the file

async function load() {
  const st = await api.invoke('state');
  S.collections = st.collections || []; S.size = st.size || 36; S.custom = st.sample || (FR ? SAMPLE_FR : SAMPLE_EN);
  S.fams = await api.invoke('list');
  renderSide(); renderList(); renderPreview();
}
const LIB = [['all', 'All Fonts'], ['user', 'My Fonts'], ['computer', 'Computer'], ['mono', 'Fixed Width'], ['off', 'Turned Off']];
function inView(f) {
  if (S.view === 'all') return !f.off || true;
  if (S.view === 'user') return f.where.includes('user') || f.where.includes('local');
  if (S.view === 'computer') return f.where.includes('system');
  if (S.view === 'mono') return f.mono;
  if (S.view === 'off') return f.faces.some((x) => x.off);
  const c = S.collections.find((x) => 'col:' + x.name === S.view);
  return c ? c.families.includes(f.family) : false;
}
function renderSide() {
  const lib = $('#lib'); lib.textContent = '';
  for (const [id, label] of LIB) {
    const n = S.fams.filter((f) => { const v = S.view; S.view = id; const r = inView(f); S.view = v; return r; }).length;
    lib.append(el('div', { class: 'nav' + (S.view === id ? ' on' : ''), onclick: () => { S.view = id; S.file = null; renderSide(); renderList(); } }, el('span', { text: label }), el('span', { class: 'n', text: String(n) })));
  }
  const cols = $('#cols'); cols.textContent = '';
  for (const c of S.collections) {
    const d = el('div', { class: 'nav' + (S.view === 'col:' + c.name ? ' on' : ''), 'data-no-l10n': '', onclick: () => { S.view = 'col:' + c.name; S.file = null; renderSide(); renderList(); },
      oncontextmenu: (e) => menu(e, [[tr('Rename…'), () => renameCollection(c)], [tr('Delete Collection'), () => deleteCollection(c)]]) },
      el('span', { text: c.name }), el('span', { class: 'n', text: String(c.families.length) }));
    d.addEventListener('dragover', (e) => { e.preventDefault(); d.classList.add('drop'); });
    d.addEventListener('dragleave', () => d.classList.remove('drop'));
    d.addEventListener('drop', (e) => { e.preventDefault(); d.classList.remove('drop'); const fam = e.dataTransfer.getData('text/x-palos-family'); if (fam) addTo(c, fam); });
    cols.append(d);
  }
  cols.append(el('div', { class: 'nav', onclick: newCollection }, el('span', { text: '＋ ' + tr('New Collection') })));
}
const tr = (s) => s;      // the page is translated as a whole (palOS translations)
function famsShown() {
  const q = S.q.toLowerCase();
  return S.fams.filter((f) => inView(f) && (!q || f.family.toLowerCase().includes(q)));
}
function renderList() {
  const list = $('#flist'); list.textContent = '';
  const fams = famsShown();
  if (S.sel && !fams.find((f) => f.family === S.sel)) S.sel = null;
  if (!S.sel && fams.length && !S.file) { S.sel = fams[0].family; S.face = 0; }
  const frag = document.createDocumentFragment();
  for (const f of fams) {
    const row = el('div', { class: 'fam' + (f.family === S.sel && !S.file ? ' on' : '') + (f.faces.every((x) => x.off) ? ' off' : ''), draggable: 'true',
      onclick: () => { S.sel = f.family; S.face = 0; S.file = null; renderList(); renderPreview(); },
      oncontextmenu: (e) => { S.sel = f.family; S.file = null; renderList(); renderPreview(); famMenu(e, f); } },
    el('span', { class: 'nm', text: f.family, 'data-no-l10n': '' }), el('span', { class: 'st', text: String(f.faces.length) }));
    row.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/x-palos-family', f.family));
    frag.append(row);
  }
  list.append(frag);
  $('#count').textContent = `${fams.length} ${fams.length === 1 ? 'family' : 'families'}`;
  const on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
}

// ---------------------------------------------------------------- preview
async function cssFor(face) {
  // the exact file, so duplicates, turned-off fonts and fonts not installed all show truly
  const key = face.file + '#' + (face.index || 0);
  if (loaded.has(key)) return loaded.get(key);
  let name = null;
  if (!/\.(ttc|otc)$/i.test(face.file)) {
    const data = face.data || await api.invoke('faceData', face.file);
    if (data) {
      try { name = 'pf' + loaded.size; const ff = new FontFace(name, data); await ff.load(); document.fonts.add(ff); } catch { name = null; }
    }
  }
  loaded.set(key, name);
  return name;
}
function styleFor(face, css) {
  return css ? { fontFamily: `"${css}"` } : { fontFamily: `"${face.family || S.sel}"`, fontWeight: cssWeight(face.weight), fontStyle: face.slant >= 100 ? 'italic' : 'normal' };
}
async function renderPreview() {
  const modes = $('#modes'); modes.textContent = '';
  for (const [id, label] of MODES) modes.append(el('button', { class: S.mode === id ? 'on' : '', text: label, onclick: () => { S.mode = id; renderPreview(); } }));
  const size = $('#size'); size.value = S.size; $('#sizeLbl').textContent = `${S.size} pt`;
  const pv = $('#pv'); const acts = $('#acts'); const faceSel = $('#face');
  pv.textContent = ''; acts.textContent = ''; faceSel.textContent = '';
  let faces, fam;
  if (S.file) { faces = S.file.faces.map((x) => ({ ...x, file: S.file.file, data: S.file.data })); fam = faces[0] && faces[0].family; }
  else { const f = S.fams.find((x) => x.family === S.sel); if (!f) { pv.append(el('div', { class: 'empty', text: 'No font selected' })); faceSel.hidden = true; return; } faces = f.faces; fam = f.family; }
  faceSel.hidden = faces.length < 2 || S.mode === 'sample';
  faces.forEach((x, i) => faceSel.append(el('option', { value: String(i), text: x.style, selected: i === S.face })));
  faceSel.onchange = () => { S.face = +faceSel.value; renderPreview(); };
  const face = faces[Math.min(S.face, faces.length - 1)];
  const token = (renderPreview.n = (renderPreview.n || 0) + 1);
  const css = await cssFor(face); if (token !== renderPreview.n) return;
  const px = Math.round(S.size * 96 / 72);
  if (S.file) pv.append(el('div', { class: 'note', text: S.file.installed ? `${S.file.name} — already installed` : `${S.file.name} — not installed` }));
  if (faces.some((x) => x.off) && !S.file) pv.append(el('div', { class: 'note', text: 'This font is turned off: apps can’t use it until you turn it back on.' }));
  if (S.mode === 'sample') {
    const seenStyle = new Set();
    for (const x of faces) {
      if (seenStyle.has(x.style)) continue; seenStyle.add(x.style);
      const c = await cssFor(x); if (token !== renderPreview.n) return;
      pv.append(el('div', { class: 'lbl', text: `${fam} ${x.style}` }), el('div', { class: 'line', style: { ...styleFor(x, c), fontSize: px + 'px' }, text: S.custom || (FR ? SAMPLE_FR : SAMPLE_EN) }));
    }
  } else if (S.mode === 'alphabet') {
    for (const l of ALPHA) pv.append(el('div', { class: 'line', style: { ...styleFor(face, css), fontSize: px + 'px' }, text: l }));
  } else if (S.mode === 'paragraph') {
    for (const sz of [Math.max(10, px / 3), Math.max(12, px / 2), px]) pv.append(el('div', { class: 'lbl', text: `${Math.round(sz * 72 / 96)} pt` }), el('div', { class: 'line', style: { ...styleFor(face, css), fontSize: sz + 'px', lineHeight: 1.45 }, text: PARA }));
  } else if (S.mode === 'custom') {
    const ta = el('textarea', { style: { ...styleFor(face, css), fontSize: px + 'px' }, spellcheck: 'false' }); ta.value = S.custom;
    ta.oninput = () => { S.custom = ta.value; clearTimeout(ta.t); ta.t = setTimeout(() => api.invoke('setState', { sample: S.custom }), 500); };
    pv.append(ta); setTimeout(() => ta.focus(), 0);
  } else {
    const rows = [['Family', fam], ['Style', face.style], ['Full name', face.full], ['PostScript name', face.ps], ['Format', face.format], ['Version', face.version], ['Maker', face.foundry],
      ['Weight', String(cssWeight(face.weight))], ['Location', face.file], ['Installed for', S.file ? '—' : face.where === 'user' ? 'You' : face.where === 'local' ? 'Everyone (added)' : 'Everyone (comes with palOS)']];
    pv.append(el('table', {}, rows.filter((r) => r[1]).map(([k, v]) => el('tr', {}, el('td', { text: k, 'data-l10n': '' }), el('td', { text: v })))));
    pv.append(el('div', { class: 'line', style: { ...styleFor(face, css), fontSize: '48px', marginTop: '20px' }, text: 'Aa Bb Gg 123' }));
    const g = el('div', { class: 'glyphs' });
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789àéèçôœ€$&@?!') g.append(el('div', { style: styleFor(face, css), text: ch }));
    pv.append(g);
  }
  // actions
  if (S.file) {
    if (S.file.error) { pv.textContent = ''; pv.append(el('div', { class: 'empty', text: S.file.error })); }
    acts.append(el('span', { class: 'grow' }),
      el('button', { class: 'btn', text: 'Cancel', onclick: () => { S.file = null; renderList(); renderPreview(); } }),
      el('button', { class: 'btn', text: 'Install for Everyone…', disabled: !!S.file.error, onclick: () => doInstall([S.file.file], true) }),
      el('button', { class: 'btn primary', text: S.file.installed ? 'Install Again' : 'Install Font', disabled: !!S.file.error, onclick: () => doInstall([S.file.file], false) }));
    if (S.queue && S.queue.length > 1) acts.prepend(el('span', { class: 'dim', text: `${S.queue.indexOf(S.file.file) + 1} / ${S.queue.length}` }),
      el('button', { class: 'btn small', text: 'Install All', onclick: () => doInstall(S.queue, false) }));
  } else {
    const f = S.fams.find((x) => x.family === S.sel);
    const off = f.faces.every((x) => x.off);
    acts.append(el('button', { class: 'btn', text: off ? 'Turn On' : 'Turn Off', onclick: () => toggle(f) }),
      el('button', { class: 'btn', text: 'Show in Seeker', onclick: () => api.invoke('reveal', face.file) }),
      el('span', { class: 'grow' }),
      el('button', { class: 'btn', text: 'Remove…', onclick: () => removeFam(f) }));
  }
}
$('#size').oninput = (e) => { S.size = +e.target.value; $('#sizeLbl').textContent = `${S.size} pt`; for (const n of document.querySelectorAll('#pv .line, #pv textarea')) if (S.mode !== 'paragraph') n.style.fontSize = Math.round(S.size * 96 / 72) + 'px'; clearTimeout(S.st); S.st = setTimeout(() => api.invoke('setState', { size: S.size }), 400); };
$('#q').oninput = (e) => { S.q = e.target.value; renderList(); renderPreview(); };

// ---------------------------------------------------------------- doing things
async function doInstall(files, everyone) {
  toast(everyone ? 'Installing for everyone…' : 'Installing…', 60000);
  const r = await api.invoke('install', files, everyone);
  if (r.error) { toast(r.error, 4000); return; }
  toast(r.count === 1 ? 'Font installed' : `${r.count} fonts installed`);
  const fam = S.file && S.file.faces[0] && S.file.faces[0].family;
  S.file = null; S.queue = null;
  S.fams = await api.invoke('list'); if (fam) { S.sel = fam; S.view = 'all'; }
  renderSide(); renderList(); renderPreview();
}
async function toggle(f) {
  const off = f.faces.every((x) => x.off);
  await api.invoke('enable', f.faces.map((x) => x.file), off);
  toast(off ? `${f.family} is turned on` : `${f.family} is turned off`);
  S.fams = await api.invoke('list'); renderSide(); renderList(); renderPreview();
}
async function removeFam(f) {
  const sys = f.faces.every((x) => x.where === 'system');
  if (sys) {
    const r = await api.invoke('confirm', { type: 'info', message: `“${f.family}” comes with palOS`, detail: 'Fonts that come with palOS can’t be removed, but you can turn them off so apps don’t list them.', buttons: ['Cancel', 'Turn Off'], defaultId: 1, cancelId: 0 });
    if (r && r.response === 1 && !f.faces.every((x) => x.off)) toggle(f);
    return;
  }
  const r = await api.invoke('confirm', { type: 'warning', message: `Remove “${f.family}”?`, detail: f.faces.some((x) => x.where === 'local') ? 'It’s removed for everyone on this computer.' : 'Its files are moved to the Trash.', buttons: ['Cancel', 'Remove'], defaultId: 1, cancelId: 0 });
  if (!r || r.response !== 1) return;
  const res = await api.invoke('remove', f.faces.map((x) => x.file));
  if (res.error) return toast(res.error, 4000);
  toast(`${f.family} was removed.`);
  S.fams = await api.invoke('list'); S.sel = null; renderSide(); renderList(); renderPreview();
}
async function newCollection() {
  const name = await api.invoke('prompt', { message: 'Name for the new collection:', value: '', ok: 'Create' });
  if (!name || !name.trim()) return;
  if (S.collections.some((c) => c.name === name.trim())) return toast('There’s already a collection with that name.');
  S.collections.push({ name: name.trim(), families: [] });
  await api.invoke('setState', { collections: S.collections });
  S.view = 'col:' + name.trim(); renderSide(); renderList(); renderPreview();
}
async function renameCollection(c) {
  const name = await api.invoke('prompt', { message: 'Rename the collection:', value: c.name, ok: 'Rename' });
  if (!name || !name.trim()) return; c.name = name.trim(); S.view = 'col:' + c.name;
  await api.invoke('setState', { collections: S.collections }); renderSide(); renderList();
}
async function deleteCollection(c) {
  const r = await api.invoke('confirm', { type: 'question', message: `Delete the collection “${c.name}”?`, detail: 'The fonts in it stay installed.', buttons: ['Cancel', 'Delete'], defaultId: 1, cancelId: 0 });
  if (!r || r.response !== 1) return;
  S.collections = S.collections.filter((x) => x !== c); if (S.view === 'col:' + c.name) S.view = 'all';
  await api.invoke('setState', { collections: S.collections }); renderSide(); renderList(); renderPreview();
}
async function addTo(c, fam) {
  if (!c.families.includes(fam)) c.families.push(fam);
  await api.invoke('setState', { collections: S.collections }); renderSide(); toast(`Added to “${c.name}”`);
}
function famMenu(e, f) {
  const items = [[f.faces.every((x) => x.off) ? 'Turn On' : 'Turn Off', () => toggle(f)], ['Show in Seeker', () => api.invoke('reveal', f.faces[0].file)], null];
  for (const c of S.collections) items.push([`Add to “${c.name}”`, () => addTo(c, f.family)]);
  const inCol = S.collections.find((c) => S.view === 'col:' + c.name);
  if (inCol) items.push([`Remove from “${inCol.name}”`, async () => { inCol.families = inCol.families.filter((x) => x !== f.family); await api.invoke('setState', { collections: S.collections }); renderSide(); renderList(); }]);
  items.push(['New Collection', newCollection], null, ['Remove…', () => removeFam(f)]);
  menu(e, items);
}
function menu(e, items) {
  e.preventDefault();
  document.querySelectorAll('.menu').forEach((m) => m.remove());
  const m = el('div', { class: 'menu', style: { left: e.clientX + 'px', top: e.clientY + 'px' } });
  for (const it of items) m.append(it ? el('div', { text: it[0], onclick: () => { m.remove(); it[1](); } }) : el('hr'));
  document.body.append(m);
  setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
}
async function check() {
  toast('Checking fonts…', 60000);
  const r = await api.invoke('check');
  if (!r.length) return toast('No problems found.');
  const dup = r.filter((x) => x.kind === 'duplicate').length, bad = r.filter((x) => x.kind === 'damaged').length;
  await api.invoke('confirm', { type: 'warning', message: 'Fonts found some problems',
    detail: [dup ? `${dup} style(s) are installed more than once:\n` + r.filter((x) => x.kind === 'duplicate').slice(0, 12).map((x) => `• ${x.family} ${x.style}`).join('\n') : '',
      bad ? `${bad} file(s) are damaged:\n` + r.filter((x) => x.kind === 'damaged').slice(0, 12).map((x) => '• ' + x.file).join('\n') : ''].filter(Boolean).join('\n\n'), buttons: ['OK'] });
  $('#toast').classList.add('hidden');
}

// ---------------------------------------------------------------- font files from Seeker, Add Fonts…, or dropped on the window
async function openFiles(files) {
  if (!files || !files.length) return;
  S.queue = files; await showFile(files[0]);
}
async function showFile(file) {
  const info = await api.invoke('inspect', file);
  S.file = info; S.face = 0; S.mode = S.mode === 'info' ? 'info' : 'sample';
  renderList(); renderPreview();
}
$('#addBtn').onclick = async () => openFiles(await api.invoke('addFonts'));
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { if (e.dataTransfer.types.includes('Files')) { dragDepth++; $('#drop').classList.remove('hidden'); } });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('#drop').classList.add('hidden'); } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault(); dragDepth = 0; $('#drop').classList.add('hidden');
  const files = [...e.dataTransfer.files].map((f) => api.pathFor(f)).filter(Boolean);
  openFiles(files);
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === 'Delete' && !S.file && S.sel) { const f = S.fams.find((x) => x.family === S.sel); if (f) removeFam(f); }
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !S.file) {
    const fams = famsShown(); const i = fams.findIndex((f) => f.family === S.sel);
    const n = fams[Math.max(0, Math.min(fams.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (n) { e.preventDefault(); S.sel = n.family; S.face = 0; renderList(); renderPreview(); }
  }
});
api.on('cmd', (c) => {
  if (c.startsWith('mode:')) { S.mode = c.slice(5); return renderPreview(); }
  const f = S.fams.find((x) => x.family === S.sel);
  ({ add: () => $('#addBtn').click(), newCollection, find: () => $('#q').focus(), check,
    reveal: () => f && api.invoke('reveal', f.faces[0].file), toggle: () => f && toggle(f), remove: () => f && removeFam(f),
    bigger: () => { S.size = Math.min(160, S.size + 6); renderPreview(); }, smaller: () => { S.size = Math.max(9, S.size - 6); renderPreview(); } }[c] || (() => {}))();
});
api.on('open', openFiles);
api.on('changed', async () => { S.fams = await api.invoke('list'); renderSide(); renderList(); });
load().then(async () => openFiles(await api.invoke('pending')));

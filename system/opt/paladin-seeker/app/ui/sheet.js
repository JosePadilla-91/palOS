'use strict';
const $ = (s, r = document) => r.querySelector(s);
const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a)) { if (n === 'text') e.textContent = v; else if (n === 'class') e.className = v; else if (n.startsWith('on')) e.addEventListener(n.slice(2), v); else e.setAttribute(n, v); } e.append(...k.filter(Boolean)); return e; };
const sheetEl = $('#sheet'), scrim = $('#scrim');
let finished = false;
const finish = (r) => { if (finished) return; finished = true; sheet.done(r); };
sheet.onOut(() => { scrim.classList.remove('on'); sheetEl.classList.remove('in'); sheetEl.classList.add('out'); });

const ICONS = {
  info: '<svg class="ico" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#4d8bf0"/><rect x="21.5" y="20" width="5" height="15" rx="2" fill="#fff"/><circle cx="24" cy="14" r="3" fill="#fff"/></svg>',
  question: '<svg class="ico" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#4d8bf0"/><path d="M18 19a6 6 0 1 1 9 5c-2 1.4-3 2.2-3 4.5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="35" r="2.6" fill="#fff"/></svg>',
  warning: '<svg class="ico" viewBox="0 0 48 48"><path d="M24 5 46 43H2z" fill="#f2b32a" stroke="#c98a00" stroke-width="2" stroke-linejoin="round"/><rect x="21.8" y="17" width="4.4" height="14" rx="2" fill="#4a3500"/><circle cx="24" cy="36" r="2.6" fill="#4a3500"/></svg>',
  error: '<svg class="ico" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#e5483b"/><path d="M16 16l16 16M32 16L16 32" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>',
};
const FOLDER = '<svg viewBox="0 0 16 16"><path d="M1.5 3.5h4.7l1.4 1.6h6.9v7.9a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1z" fill="#6fb0ee" stroke="#3c82c4"/></svg>';
const FILE = '<svg viewBox="0 0 16 16"><path d="M3.5 1.5h6l3 3v10h-9z" fill="#fff" stroke="#8a8f98"/><path d="M9.5 1.5v3h3" fill="none" stroke="#8a8f98"/></svg>';

function appear() { requestAnimationFrame(() => { scrim.classList.add('on'); sheetEl.classList.add('in'); }); }
// buttons that throw things away or uninstall are red (Hydro's red pill)
const DANGER = /^(move to (the )?trash|uninstall|delete|erase|empty|remove|placer dans la corbeille|désinstaller|supprimer|effacer|vider)/i;
function footer(buttons, onPick, defIdx, cancelIdx, extraLeft) {
  const f = el('div', { class: 'foot' }); if (extraLeft) f.append(extraLeft, el('span', { class: 'grow' }));
  buttons.forEach((b, i) => { const x = el('button', { text: b, class: i === defIdx ? (DANGER.test(b) ? 'def danger' : 'def') : '' }); x.onclick = () => onPick(i); f.append(x); });
  return f;
}
addEventListener('keydown', (e) => { if (e.key === 'Escape' && window.__cancel) { e.preventDefault(); window.__cancel(); } });

function message(p) {
  const txt = el('div', { class: 'txt' }, el('div', { class: 'msg', text: p.message }), p.detail ? el('div', { class: 'detail', text: p.detail }) : null);
  const cb = p.checkbox ? el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'cb' }), document.createTextNode(p.checkbox)) : null; if (cb) txt.append(cb);
  const icon = el('div', {}); icon.innerHTML = ICONS[p.type] || ICONS.info;
  const pick = (i) => finish({ response: i, checked: cb ? $('#cb').checked : false });
  window.__cancel = () => pick(p.cancelId >= 0 ? p.cancelId : p.buttons.length - 1);
  sheetEl.append(el('div', { class: 'pad' }, icon.firstChild, txt), footer(p.buttons.length ? p.buttons : ['OK'], pick, p.defaultId, p.cancelId));
  setTimeout(() => { const b = sheetEl.querySelectorAll('.foot button')[p.defaultId]; if (b) b.focus(); }, 60);
}
function prompt(p) {
  const input = el('input', { type: p.password ? 'password' : 'text', value: p.value || '' });
  const txt = el('div', { class: 'txt' }, el('div', { class: 'msg', text: p.message }), p.detail ? el('div', { class: 'detail', text: p.detail }) : null, el('div', { style: 'margin-top:10px' }, input));
  const icon = el('div', {}); icon.innerHTML = ICONS[p.type] || ICONS.info;
  const ok = () => finish({ value: input.value }), cancel = () => finish({ value: null });
  window.__cancel = cancel;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
  sheetEl.append(el('div', { class: 'pad' }, icon.firstChild, txt), footer([p.cancel, p.ok], (i) => (i ? ok() : cancel()), 1, 0));
  setTimeout(() => { input.focus(); input.select(); }, 60);
}

async function chooser(p) {
  const save = p.kind === 'save';
  // Save starts small, as in palOS: a name and a "Where:" menu of the usual places; the disclosure button
  // (or "Someplace Else…") opens the full browser.
  let compact = save;
  if (!save) sheetEl.classList.add('wide');
  let dir = p.dir, selected = new Set(), filter = p.filters && p.filters.length ? 0 : -1, listing = null;
  const nameIn = el('input', { type: 'text', value: p.name || '' });
  const where = el('select'); const err = el('div', { class: 'err' });
  const files = el('div', { class: 'files' }); const side = el('div', { class: 'side' });
  const okBtn = el('button', { text: p.button, class: 'def' }), cancelBtn = el('button', { text: 'Cancel' }), newBtn = el('button', { text: 'New Folder', style: 'min-width:0' });
  const fsel = p.filters && p.filters.length > 1 ? el('select', { style: 'width:auto;max-width:200px' }) : null;
  if (fsel) { p.filters.forEach((f, i) => fsel.append(el('option', { value: i, text: f.name }))); fsel.onchange = () => { filter = +fsel.value; paint(); }; }
  const extOk = (n) => { if (filter < 0) return true; const ex = p.filters[filter].extensions || ['*']; return ex.includes('*') || ex.some((x) => n.toLowerCase().endsWith('.' + x.toLowerCase())); };
  const whereC = el('select'), toggle = el('button', { class: 'disc', title: 'Show all folders', text: '▾' });
  const pathRow = el('div', { class: 'row' }), browserBox = el('div', { class: 'browser' }, side, files);
  const ORDER = ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', 'Movies', 'Home'];
  const label = (d) => { const pl = p.places.find((x) => x.path === d); return pl ? pl.name : d === '/' ? 'Computer' : d.split('/').pop(); };
  function paintCompact() {
    whereC.textContent = '';
    const common = p.places.filter((x) => ORDER.includes(x.name)).sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
    if (!common.some((x) => x.path === dir)) whereC.append(el('option', { value: dir, text: label(dir) }), el('option', { disabled: '', text: '──────────' }));
    for (const x of common) whereC.append(el('option', { value: x.path, text: x.name }));
    whereC.append(el('option', { disabled: '', text: '──────────' }), el('option', { value: '::else', text: 'Someplace Else…' }));
    whereC.value = dir;
  }
  function setCompact(c) {
    compact = c;
    sheetEl.classList.toggle('wide', !c);
    pathRow.style.display = browserBox.style.display = c ? 'none' : '';
    whereRowC.style.display = c ? '' : 'none';
    newBtn.style.display = c ? 'none' : '';
    toggle.textContent = c ? '▾' : '▴'; toggle.title = c ? 'Show all folders' : 'Show fewer options';
    if (c) paintCompact();
  }
  whereC.onchange = () => { if (whereC.value === '::else') { setCompact(false); whereC.value = dir; return; } go(whereC.value); };
  toggle.onclick = () => setCompact(!compact);
  const whereRowC = el('div', { class: 'row' }, el('label', { text: 'Where:' }), whereC);
  for (const pl of p.places) side.append(el('div', { text: pl.name, onclick: () => go(pl.path) }));
  async function go(d) { listing = await sheet.list(d); dir = listing.path; selected.clear(); err.textContent = listing.error || ''; paint(); }
  function paint() {
    if (save) paintCompact();
    for (const s of side.children) s.classList.toggle('on', p.places.find((x) => x.name === s.textContent).path === dir);
    where.textContent = ''; const parts = []; let cur = dir; while (cur) { parts.push(cur); const up = cur === '/' ? null : (cur.replace(/\/[^/]+$/, '') || '/'); cur = up; }
    for (const d of parts) where.append(el('option', { value: d, text: d === '/' ? 'Computer' : d.split('/').pop() })); where.value = dir;
    files.textContent = '';
    if (listing.parent) files.append(el('div', { class: 'f', ondblclick: () => go(listing.parent), onclick: () => {} }, el('span', { text: '↑  ..' })));
    for (const e of listing.entries) {
      const usableFile = e.dir || extOk(e.name), inactive = !e.dir && (p.folder || (!save && !usableFile));
      const row = el('div', { class: 'f' + (selected.has(e.name) ? ' sel' : '') + (inactive || (save && !e.dir && !usableFile) ? ' dim' : '') }); row.innerHTML = e.dir ? FOLDER : FILE; row.append(el('span', { text: e.name }));
      row.onclick = (ev) => {
        if (e.dir && !p.folder) { selected.clear(); selected.add(e.name); }
        else if (inactive) return;
        else if (p.multi && (ev.ctrlKey || ev.metaKey)) { selected.has(e.name) ? selected.delete(e.name) : selected.add(e.name); }
        else { selected.clear(); selected.add(e.name); }
        if (save && !e.dir) nameIn.value = e.name; paint(); updateOk();
      };
      row.ondblclick = () => { if (e.dir) go(dir.replace(/\/$/, '') + '/' + e.name); else if (!inactive) okBtn.click(); };
      files.append(row);
    }
    updateOk();
  }
  function updateOk() { okBtn.disabled = save ? !nameIn.value.trim() : p.folder ? false : !selected.size || [...selected].every((n) => (listing.entries.find((e) => e.name === n) || {}).dir); }
  where.onchange = () => go(where.value);
  nameIn.oninput = updateOk;
  const join = (n) => (dir === '/' ? '' : dir) + '/' + n;
  okBtn.onclick = async () => {
    if (save) {
      let n = nameIn.value.trim(); if (!n || /\//.test(n)) { err.textContent = 'Type a name without slashes.'; return; }
      const ex = p.filters && p.filters.length && filter >= 0 ? (p.filters[filter].extensions || []).filter((x) => x !== '*') : [];
      if (ex.length && !ex.some((x) => n.toLowerCase().endsWith('.' + x.toLowerCase())) && !/\.[A-Za-z0-9]{1,5}$/.test(n)) n += '.' + ex[0];
      const full = join(n), kind = await sheet.exists(full);
      if (kind === 'dir') { go(full); return; }
      if (kind === 'file') { showReplace(n, full); return; }
      finish({ path: full }); return;
    }
    if (p.folder) { finish({ paths: [selected.size ? join([...selected][0]) : dir] }); return; }
    const picks = [...selected].filter((n) => !(listing.entries.find((e) => e.name === n) || {}).dir).map(join); if (picks.length) finish({ paths: picks });
  };
  function showReplace(n, full) {
    const hold = [...sheetEl.children]; sheetEl.textContent = '';
    const icon = el('div'); icon.innerHTML = ICONS.warning;
    const back = () => { sheetEl.textContent = ''; hold.forEach((x) => sheetEl.append(x)); window.__cancel = () => finish({}); nameIn.focus(); };
    window.__cancel = back;
    sheetEl.append(el('div', { class: 'pad' }, icon.firstChild, el('div', { class: 'txt' }, el('div', { class: 'msg', text: `“${n}” already exists. Do you want to replace it?` }), el('div', { class: 'detail', text: 'Replacing it will overwrite its contents.' }))), footer(['Cancel', 'Replace'], (i) => (i ? finish({ path: full }) : back()), 0, 0));
  }
  cancelBtn.onclick = () => finish({}); window.__cancel = () => finish({});
  newBtn.onclick = async () => {
    const row = el('div', { class: 'f' }); row.innerHTML = FOLDER; const inp = el('input', { type: 'text', value: 'untitled folder', style: 'padding:0 4px' }); row.append(inp); files.prepend(row); inp.focus(); inp.select();
    const commit = async () => { const r = await sheet.mkdir(dir, inp.value.trim()); if (r.error) { err.textContent = r.error; row.remove(); } else go(dir + (dir === '/' ? '' : '/') + inp.value.trim()); };
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') commit(); if (e.key === 'Escape') row.remove(); };
  };
  nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') okBtn.click(); });
  const head = el('div', { class: 'ch' }, el('h3', { text: p.title }));
  if (save) head.append(el('div', { class: 'row' }, el('label', { text: 'Save As:' }), nameIn, toggle), whereRowC);
  pathRow.append(el('label', { text: save ? 'Where:' : 'Folder:' }), where);
  head.append(pathRow, browserBox, err);
  sheetEl.append(head, el('div', { class: 'foot' }, save || true ? newBtn : null, fsel, el('span', { class: 'grow' }), cancelBtn, okBtn));
  if (!save) newBtn.style.display = p.folder ? '' : 'none';
  else setCompact(true);
  await go(p.dir); if (save) { nameIn.focus(); const dot = nameIn.value.lastIndexOf('.'); nameIn.setSelectionRange(0, dot > 0 ? dot : nameIn.value.length); }
}

(async () => {
  const p = await sheet.init(); if (!p) return;
  if (p.kind === 'message') message(p); else if (p.kind === 'prompt') prompt(p); else await chooser(p);
  appear();
})();

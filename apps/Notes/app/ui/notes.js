'use strict';
const $ = (s) => document.querySelector(s);
const ed = $('#editor');
const ask = (o) => api.invoke('ui:message', o);
let notes = [], books = ['Notes'], book = 'Notes', cur = null, q = '', saveT = 0;

const ago = (t) => { const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === n.getFullYear() ? undefined : 'numeric' }); };
const visible = () => notes.filter((n) => (book === 'Trash' ? n.trashed : !n.trashed && n.notes === book) && (!q || (n.title + ' ' + n.preview).toLowerCase().includes(q))).sort((a, b) => (b.pinned - a.pinned) || b.modified - a.modified);
const all = () => notes.filter((n) => !n.trashed && (!q || (n.title + ' ' + n.preview).toLowerCase().includes(q))).sort((a, b) => (b.pinned - a.pinned) || b.modified - a.modified);

function paintBooks() {
  const box = $('#books'); box.textContent = '';
  const add = (name, count, special) => { const d = document.createElement('div'); d.className = 'book' + (book === name ? ' on' : ''); const s = document.createElement('span'); s.textContent = name; const c = document.createElement('small'); c.textContent = count; d.append(s, c); d.onclick = () => { book = name; q = ''; $('#search').value = ''; paintBooks(); paintList(); }; if (!special && name !== 'Notes') d.oncontextmenu = async (e) => { e.preventDefault(); const r = await ask({ type: 'warning', message: `Delete the notes “${name}”?`, detail: 'Its notes move to Notes.', buttons: ['Cancel', 'Delete Notes'], defaultId: 0, cancelId: 0 }); if (r.response === 1) removeBook(name); }; box.append(d); };
  add('All Notes', notes.filter((n) => !n.trashed).length, true);
  for (const b of books) add(b, notes.filter((n) => !n.trashed && n.notes === b).length);
  add('Trash', notes.filter((n) => n.trashed).length, true);
}
function paintList() {
  const list = $('#list'); list.textContent = '';
  const items = book === 'All Notes' ? all() : visible();
  if (!items.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = q ? 'No notes match.' : book === 'Trash' ? 'The Trash is empty.' : 'No notes yet. Press ＋ to start one.'; list.append(e); }
  for (const n of items) {
    const d = document.createElement('div'); d.className = 'note' + (cur && cur.id === n.id ? ' on' : ''); d.dataset.id = n.id;
    const b = document.createElement('b'); if (n.pinned) { const p = document.createElement('small'); p.className = 'pin'; p.textContent = '📌'; b.append(p); } b.append(document.createTextNode(n.title));
    const s = document.createElement('span'); s.textContent = `${ago(n.modified)}  ${n.preview}`; d.append(b, s); d.onclick = () => open(n.id); list.append(d);
  }
}
async function open(id) {
  await flush(); const n = await api.invoke('read', id); if (!n) return; cur = n;
  ed.innerHTML = n.html || ''; $('#none').classList.add('hidden'); ed.contentEditable = n.trashed ? 'false' : 'true';
  $('#pin').classList.toggle('on', !!n.pinned); $('#del').textContent = n.trashed ? 'Restore' : 'Delete'; paintList(); if (!n.html) ed.focus();
}
function noteMeta(id) { return notes.find((n) => n.id === id); }
async function flush() { if (!saveT || !cur) return; clearTimeout(saveT); saveT = 0; await commit(); }
async function commit() {
  if (!cur) return; cur.html = ed.innerHTML; await api.invoke('save', cur.id, { html: cur.html });
  const m = noteMeta(cur.id); if (m) { const t = (ed.innerText || '').trim().split('\n'); m.title = (t[0] || 'New Note').slice(0, 80); m.preview = t.slice(1).join(' ').slice(0, 120); m.modified = Date.now(); } paintList(); paintBooks();
}
ed.addEventListener('input', () => { if (!cur) return; clearTimeout(saveT); saveT = setTimeout(() => { saveT = 0; commit(); }, 500); });
addEventListener('beforeunload', () => { if (saveT && cur) { api.invoke('save', cur.id, { html: ed.innerHTML }); } });

async function newNote() { await flush(); if (book === 'Trash' || book === 'All Notes') book = 'Notes'; const n = await api.invoke('create', book); notes.push({ id: n.id, title: 'New Note', preview: '', modified: n.modified, created: n.created, notes: n.notes, pinned: false, trashed: false }); paintBooks(); await open(n.id); }
$('#new').onclick = newNote;
$('#search').oninput = (e) => { q = e.target.value.trim().toLowerCase(); if (q && book !== 'All Notes') { book = 'All Notes'; paintBooks(); } paintList(); };
$('#newbook').onclick = async () => { const name = ((await api.invoke('ui:prompt', { message: 'Name for the new notes:', ok: 'Create' })) || '').trim().slice(0, 40); if (!name || books.includes(name) || ['All Notes', 'Trash'].includes(name)) return; books.push(name); await api.invoke('setBooks', books); book = name; paintBooks(); paintList(); };
async function removeBook(name) { for (const n of notes.filter((x) => x.notes === name)) { n.notes = 'Notes'; await api.invoke('save', n.id, { notes: 'Notes' }); } books = books.filter((b) => b !== name); await api.invoke('setBooks', books); book = 'Notes'; paintBooks(); paintList(); }

// formatting
for (const b of document.querySelectorAll('[data-c]')) b.onmousedown = (e) => { e.preventDefault(); document.execCommand(b.dataset.c); ed.dispatchEvent(new Event('input')); };
for (const b of document.querySelectorAll('[data-b]')) b.onmousedown = (e) => { e.preventDefault(); const on = document.queryCommandValue('formatBlock').toLowerCase() === b.dataset.b; document.execCommand('formatBlock', false, on ? 'div' : b.dataset.b); ed.dispatchEvent(new Event('input')); };
$('#todo').onmousedown = (e) => { e.preventDefault(); document.execCommand('insertHTML', false, '<ul><li class="todo"><input type="checkbox"><span>&nbsp;</span></li></ul>'); ed.dispatchEvent(new Event('input')); };
ed.addEventListener('click', (e) => { if (e.target.matches && e.target.matches('li.todo input')) { const li = e.target.closest('li'); li.classList.toggle('done', e.target.checked); if (e.target.checked) e.target.setAttribute('checked', ''); else e.target.removeAttribute('checked'); ed.dispatchEvent(new Event('input')); } });
$('#pin').onclick = async () => { if (!cur) return; cur.pinned = !cur.pinned; await api.invoke('save', cur.id, { pinned: cur.pinned }); noteMeta(cur.id).pinned = cur.pinned; $('#pin').classList.toggle('on', cur.pinned); paintList(); };
$('#del').onclick = async () => {
  if (!cur) return; await flush(); const m = noteMeta(cur.id);
  if (cur.trashed) { cur.trashed = false; m.trashed = false; await api.invoke('save', cur.id, { trashed: false }); }
  else if (book === 'Trash') return;
  else { cur.trashed = true; m.trashed = true; await api.invoke('save', cur.id, { trashed: true }); }
  cur = null; ed.innerHTML = ''; $('#none').classList.remove('hidden'); paintBooks(); paintList();
};
$('#export').onclick = async () => { if (!cur) return; await flush(); const r = await ask({ type: 'question', message: 'Export this note as…', buttons: ['Cancel', 'Plain Text', 'PDF'], defaultId: 2, cancelId: 0 }); if (r.response) await api.invoke('export', cur.id, r.response === 2 ? 'pdf' : 'txt'); };
addEventListener('keydown', (e) => { if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); newNote(); } if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); $('#search').focus(); } });

(async () => { const r = await api.invoke('init'); notes = r.notes; books = r.books; book = 'Notes'; paintBooks(); paintList(); const first = visible()[0]; if (first) open(first.id); else $('#none').textContent = 'Press ＋ to write your first note'; })();

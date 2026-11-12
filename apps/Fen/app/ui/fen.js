// Fen window: one document (photo, PDF or font).
import { ICON } from './icons.js';
import { ImageView } from './image.js';
import { PdfView } from './pdf.js';
import { FontView } from './font.js';
import { $, $$, el, humanSize, longDate, modal } from './util.js';

const Q = new URLSearchParams(location.search);
const views = { image: null, pdf: null, font: null };
let doc = null;     // { path, name, kind, ... }
let view = null;    // the active view object

// ---------------------------------------------------------------- toolbar icons
for (const [id, name] of Object.entries({ 'b-side': 'sidebar', 'b-film': 'film', 'b-zoomout': 'minus', 'b-zoomin': 'plus', 'b-rotl': 'rotl', 'b-rotr': 'rotr',
  'b-crop': 'crop', 'b-adjust': 'resize', 'b-slides': 'play', 'b-info': 'info', 's-prev': 'prev', 's-play': 'pause', 's-next': 'next', 's-exit': 'close',
  'b-t-select': 'tselect', 'b-t-highlight': 'thighlight', 'b-t-text': 'ttext', 'b-t-draw': 'tdraw', 'b-t-sign': 'tsign' })) {
  const b = document.getElementById(id); if (b) b.innerHTML = ICON[name];
}

function setKind(kind) {
  document.body.classList.toggle('empty', !kind);
  for (const e of $$('[data-for]')) e.classList.toggle('hidden', !!kind && !e.dataset.for.split(' ').includes(kind));
  $('#welcome').classList.toggle('hidden', !!kind);
  $('#img-stage').classList.toggle('hidden', kind !== 'image');
  $('#pdf-wrap').classList.toggle('hidden', kind !== 'pdf');
  $('#font-stage').classList.toggle('hidden', kind !== 'font');
  if (kind !== 'pdf') $('#side').classList.add('hidden');
  if (kind !== 'image') { $('#film').classList.add('hidden'); $('#cropbar').classList.add('hidden'); }
}

export function busy(text) {
  $('#busy').classList.toggle('hidden', !text);
  $('#busy-text').textContent = text || '';
}

export function setSaveVisible(on, label = 'Save') {
  const b = $('#b-save');
  b.classList.toggle('hidden', !on);
  b.textContent = label;
  window.fen.state({ canSave: !!on });
}

export function setZoomLabel(text) { $('#b-zoom').textContent = text; }

// the PDF tools: which one is on
export function setTool(tool) { for (const t of ['select', 'highlight', 'text', 'draw']) { const b = document.getElementById('b-t-' + t); if (b) b.classList.toggle('on', t === tool); } }

async function open(p) {
  if (view && view.dirty && view.dirty() && !(await view.askSave())) return;
  if (view && view.close) await view.close();
  busy('Opening…');
  try {
    doc = await window.fen.info(p);
  } catch (err) {
    busy(null);
    await window.fen.error(`“${p.split('/').pop()}” can’t be opened.`, err.message);
    if (!view) setKind(null);
    return;
  }
  setKind(doc.kind);
  window.fen.state({ kind: doc.kind, canSave: false });
  if (!views[doc.kind]) views[doc.kind] = new ({ image: ImageView, pdf: PdfView, font: FontView })[doc.kind]({ busy, setSaveVisible, setZoomLabel, setTool, open, refreshInfo });
  view = views[doc.kind];
  try {
    await view.open(doc);
  } catch (err) {
    console.error(err);
    await window.fen.error(`“${doc.name}” can’t be shown.`, err.message || String(err));
  } finally { busy(null); }
  refreshInfo();
}

// ---------------------------------------------------------------- info panel
async function refreshInfo() {
  if ($('#info').classList.contains('hidden') || !view || !doc) return;
  const body = $('#info-body');
  const sections = [['File', [['Name', doc.name], ['Where', doc.dir], ['Size', humanSize(doc.size)], ['Modified', longDate(doc.mtime)]]]];
  try { sections.push(...(await view.info())); } catch (err) { console.error(err); }
  body.textContent = '';
  for (const [title, rows] of sections) {
    const shown = rows.filter((r) => r && r[1] != null && r[1] !== '');
    if (!shown.length) continue;
    body.append(el('h3', { text: title }), el('dl', {}, shown.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', {}, v instanceof Node ? v : String(v))])));
  }
}
function toggleInfo() {
  $('#info').classList.toggle('hidden');
  $('#b-info').classList.toggle('on', !$('#info').classList.contains('hidden'));
  refreshInfo();
  if (view && view.relayout) view.relayout();
}

// ---------------------------------------------------------------- commands
async function command(cmd) {
  if (cmd === 'info') return toggleInfo();
  if (!view || !doc) return;
  const p = doc.path;
  switch (cmd) {
    case 'reveal': return window.fen.reveal(p);
    case 'trash': {
      if (!(await window.fen.confirm(`Move “${doc.name}” to the Trash?`, null, 'Move to Trash'))) return;
      await window.fen.trash(p);
      if (view.afterTrash && (await view.afterTrash(p))) return;
      window.close();
      return;
    }
  }
  if (view.command) return view.command(cmd);
}
window.fen.onCommand(command);

$('#b-side').onclick = () => command('sidebar');
$('#b-film').onclick = () => command('filmstrip');
$('#b-zoomin').onclick = () => command('zoomIn');
$('#b-zoomout').onclick = () => command('zoomOut');
$('#b-zoom').onclick = () => command('zoomMenu');
// touchpad rotate (two fingers turning): a quarter turn once they've turned past 45°
document.addEventListener('gestureend', (e) => {
  const r = e.rotation || 0;
  if (e.cancelled || Math.abs(r) < 45) return;
  const turns = Math.max(1, Math.min(2, Math.round(Math.abs(r) / 90)));
  for (let i = 0; i < turns; i++) command(r > 0 ? 'rotateRight' : 'rotateLeft');
});
$('#b-rotl').onclick = () => command('rotateLeft');
$('#b-rotr').onclick = () => command('rotateRight');
$('#b-crop').onclick = () => command('crop');
$('#b-adjust').onclick = () => command('resize');
$('#b-slides').onclick = () => command('slideshow');
$('#b-info').onclick = () => toggleInfo();
$('#b-save').onclick = () => command('save');
$('#b-install').onclick = () => command('installFont');
for (const t of ['select', 'highlight', 'text', 'draw']) $('#b-t-' + t).onclick = () => command('tool:' + t);
$('#b-t-sign').onclick = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  import('./util.js').then(({ menu }) => menu(r.left, r.bottom + 4, [{ label: 'Sign…', value: 'sign' }, { label: 'Sign with a Certificate…', value: 'certify' }]).then((v) => v && command(v)));
};
$('#w-open').onclick = () => window.fen.choose();

// keyboard (the menu bar's accelerators reach us as commands; plain keys are handled here)
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, [contenteditable="true"]') && !['Escape'].includes(e.key)) return;
  if (!$('#modal').classList.contains('hidden')) return;
  if (view && view.key && view.key(e)) { e.preventDefault(); return; }
});

// drag and drop: open what's dropped
document.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('drag'); });
document.addEventListener('dragleave', (e) => { if (e.target === document.documentElement || !e.relatedTarget) document.body.classList.remove('drag'); });
document.addEventListener('drop', (e) => {
  e.preventDefault(); document.body.classList.remove('drag');
  const files = [...(e.dataTransfer.files || [])].map((f) => window.fen.pathFor(f)).filter(Boolean);
  if (!files.length) return;
  if (!doc) { open(files[0]); if (files.length > 1) window.fen.openFiles(files.slice(1)); } else window.fen.openFiles(files);
});
window.fen.onOpen((p) => open(p));

// warn before closing with unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (!(view && view.dirty && view.dirty())) return;
  e.returnValue = false;
  setTimeout(async () => { if (await view.askSave()) { view.discard(); window.close(); } }, 0);
});

setKind(null);
if (Q.get('file')) open(Q.get('file'));
export { modal };

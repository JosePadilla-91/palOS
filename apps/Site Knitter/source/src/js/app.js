// Site Knitter — renderer bootstrap, toolbar, commands and file handling
import {
  state, on, emit, mutate, undo, redo, loadProject, selectPage, select, currentPage, selectedElements,
  projectForSave, setDirty, canUndo, canRedo,
} from './store.js';
import { installEditorFonts } from './fonts.js';
import { SITE_CSS } from './runtime.js';
import { clipDefsSVG, SHAPES } from './shapes.js';
import { initCanvas, setZoom, fitZoom, placeAssets, defaultInsertPoint, startTextEdit, finishTextEdit, isEditingText, render as renderCanvas } from './canvas.js';
import { initSidebar, duplicatePage } from './sidebar.js';
import { initInspector, showInspectorTab } from './inspector.js';
import { initMediaBrowser, loadBlobs, blobsForSave, clearBlobs, importViaDialog } from './media.js';
import { newProject, buildPage, applyTheme, themeById, uniqueSlug, resolveTemplateLinks } from './themes.js';
import { make } from './elements.js';
import { buildSite, pageFile, entryFile } from './exporter.js';
import { chooseTheme, chooseTemplate, chooseAsset, publishDialog, shortcutsDialog, aboutDialog, dropdown, toast, promptText, modal, themeThumb } from './dialogs.js';
import { h, clone, uid } from './util.js';
import { THEMES } from './themes.js';
import { icon } from './icons.js';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
installEditorFonts();
document.head.append(h('style', { id: 'site-css' }, SITE_CSS));
document.body.insertAdjacentHTML('afterbegin', clipDefsSVG());

const $ = (s) => document.querySelector(s);
const app = $('#app');

buildToolbar();
initCanvas($('#canvas'));
initSidebar($('#sidebar'), { onAddPage: () => run('add-page') });
initInspector($('#inspector'));
initMediaBrowser($('#media'));
buildStatusBar();

on('dirty', updateTitle);
on('project', updateTitle);
on('pages', updateTitle);
on('command', ({ cmd, arg }) => run(cmd, arg));
on('asset-insert', (id) => placeAssets([id], null, selectedElements()[0]));
on('request-replace-media', (id) => run('replace-media', id));
on('prompt-link', async (cb) => cb(await promptText('Link to', 'https://', { label: 'Web address, or mailto:name@example.com' })));
on('focus-inspector', () => showInspectorTab('media'));
on('project', () => { app.classList.toggle('has-project', !!state.project); });

window.ws.onMenu((cmd, arg) => run(cmd, arg));
window.ws.onProjectLoaded((data) => openLoaded(data));
window.ws.onRequestClose(async () => {
  if (await confirmDiscard()) window.ws.closeConfirmed();
});

document.addEventListener('keydown', onKey);
showWelcome();

// ---------------------------------------------------------------------------
// Toolbar (modelled on the classic bottom bar)
// ---------------------------------------------------------------------------
function tb(ico, label, onclick, title) {
  return h('button', { class: 'tb', title: title || label, onclick }, h('span', { class: 'tb-i' }, icon(ico)), h('span', { class: 'tb-l' }, label));
}

function buildToolbar() {
  const bar = $('#toolbar');
  const shapesBtn = tb('shapes', 'Shapes', () => dropdown(shapesBtn, Object.entries(SHAPES).map(([k, s]) => ({ label: s.label, action: () => run('insert', 'shape:' + k) }))));
  const mediaBtn = tb('media', 'Media', () => dropdown(mediaBtn, [
    { label: 'Photo Gallery', action: () => run('insert', 'gallery') },
    { label: 'Slideshow', action: () => run('insert', 'slideshow') },
    { label: 'Movie…', action: () => run('insert', 'video') },
    { label: 'Audio…', action: () => run('insert', 'audio') },
    '-',
    { label: 'YouTube / Vimeo Video', action: () => run('insert', 'embed') },
    { label: 'Map', action: () => run('insert', 'map') },
    { label: 'Contact Form', action: () => run('insert', 'form') },
    { label: 'HTML Snippet', action: () => run('insert', 'html') },
    '-',
    { label: 'Navigation Menu', action: () => run('insert', 'navbar') },
    { label: 'Blog Feed', action: () => run('insert', 'blogfeed') },
    { label: 'Button', action: () => run('insert', 'button') },
  ]));
  const publishBtn = tb('publish', 'Publish', () => dropdown(publishBtn, [
    { label: 'Publish to Server (FTP)…', action: () => run('publish') },
    { label: 'Export Site to Folder…', action: () => run('export-folder') },
    { label: 'Export Site as ZIP…', action: () => run('export-zip') },
  ]));
  bar.append(
    h('div', { class: 'tb-group' },
      tb('addPage', 'Add Page', () => run('add-page'))),
    h('div', { class: 'tb-group' },
      tb('text', 'Text Box', () => run('insert', 'text')),
      shapesBtn,
      tb('photo', 'Photo', () => run('insert', 'image')),
      mediaBtn,
      tb('button', 'Button', () => run('insert', 'button'))),
    h('div', { class: 'tb-group' },
      tb('theme', 'Theme', () => run('theme'))),
    h('div', { class: 'tb-spacer' }),
    h('div', { class: 'tb-group' },
      tb('undo', 'Undo', () => run('undo')),
      tb('redo', 'Redo', () => run('redo'))),
    h('div', { class: 'tb-group' },
      tb('preview', 'Preview', () => run('preview'), 'Preview your site (Ctrl+R)'),
      publishBtn),
    h('div', { class: 'tb-group' },
      tb('inspector', 'Inspector', () => run('toggle', 'inspector')),
      tb('library', 'Media', () => run('toggle', 'media'))),
  );
  const updateUndo = () => {
    bar.querySelectorAll('.tb').forEach((b) => {
      const l = b.querySelector('.tb-l')?.textContent;
      if (l === 'Undo') b.disabled = !canUndo();
      if (l === 'Redo') b.disabled = !canRedo();
    });
  };
  on('change', updateUndo); on('project', updateUndo); on('dirty', updateUndo); on('pages', updateUndo); on('entry-change', updateUndo);
}

function buildStatusBar() {
  const bar = $('#statusbar');
  const zoomOut = h('button', { class: 'sb-z', onclick: () => run('zoom', 'out'), title: 'Zoom out' }, '−');
  const zoomIn = h('button', { class: 'sb-z', onclick: () => run('zoom', 'in'), title: 'Zoom in' }, '+');
  const zoomLbl = h('button', { class: 'sb-zl', onclick: () => run('zoom', 'reset'), title: 'Actual size' }, '100%');
  const fit = h('button', { class: 'sb-z', onclick: () => run('zoom', 'fit'), title: 'Fit width' }, '⤢');
  const info = h('span', { class: 'sb-info' });
  bar.append(info, h('span', { class: 'tb-spacer' }), zoomOut, zoomLbl, zoomIn, fit);
  const upd = () => {
    zoomLbl.textContent = Math.round(state.zoom * 100) + '%';
    const p = currentPage();
    const sel = selectedElements();
    if (!p) { info.textContent = ''; return; }
    const file = state.entryId ? entryFile(p, p.blog.entries.find((e) => e.id === state.entryId) || {}) : pageFile(state.project, p);
    info.textContent = `${p.name} · ${file}` + (sel.length === 1 ? ` · ${Math.round(sel[0].x)}, ${Math.round(sel[0].y)}  ${Math.round(sel[0].w)}×${Math.round(sel[0].h)}` : sel.length ? ` · ${sel.length} selected` : '');
  };
  on('zoom', upd); on('selection', upd); on('change', upd); on('page', upd); on('project', upd); on('pages', upd);
}

function updateTitle() {
  const name = state.project?.site.name;
  const t = name ? `${state.dirty ? '• ' : ''}${name} — Site Knitter` : 'Site Knitter';
  document.title = t;
  window.ws.setTitle(t);
}

// ---------------------------------------------------------------------------
// Welcome screen
// ---------------------------------------------------------------------------
async function showWelcome() {
  const el = $('#welcome');
  el.innerHTML = '';
  const recent = await window.ws.recent();
  const strip = h('div', { class: 'wl-themes' }, ...THEMES.slice(0, 6).map((t) => {
    const c = themeThumb(t);
    c.onclick = () => run('new-site', t.id);
    return c;
  }));
  el.append(h('div', { class: 'wl-inner' },
    h('div', { class: 'wl-hero' },
      h('img', { src: '../build/icon.png', class: 'wl-logo', alt: '' }),
      h('h1', {}, 'Site Knitter'),
      h('p', {}, 'Make a beautiful website in minutes. No code required.')),
    h('div', { class: 'wl-actions' },
      h('button', { class: 'btn primary big', onclick: () => run('new-site') }, 'Create a New Site…'),
      h('button', { class: 'btn big', onclick: () => run('open') }, 'Open a Site…')),
    h('h3', {}, 'Start from a theme'),
    strip,
    recent.length ? h('div', { class: 'wl-recent' }, h('h3', {}, 'Recent sites'),
      ...recent.slice(0, 6).map((f) => h('button', { class: 'wl-rec', onclick: () => run('open-path', f), title: f },
        h('b', {}, f.split('/').pop().replace(/\.wspin$/, '')), h('span', {}, f)))) : ''));
  app.classList.remove('has-project');
}

// ---------------------------------------------------------------------------
// File handling
// ---------------------------------------------------------------------------
async function confirmDiscard() {
  if (!state.project || !state.dirty) return true;
  const r = await window.ws.confirmUnsaved();
  if (r === 'cancel') return false;
  if (r === 'save') return !!(await save());
  return true;
}

async function save(saveAs = false) {
  if (!state.project) return null;
  if (isEditingText()) finishTextEdit();
  try {
    const blobs = await blobsForSave();
    const path = await window.ws.save({ path: state.filePath, project: projectForSave(), blobs, saveAs, suggestedName: state.project.site.name });
    if (!path) return null;
    state.filePath = path;
    setDirty(false);
    toast('Saved');
    return path;
  } catch (e) {
    window.ws.showError('Could not save', String(e.message || e));
    return null;
  }
}

function openLoaded(data) {
  if (!data) return;
  const p = data.project;
  if (p.format !== 'site-knitter') { window.ws.showError('Not a Site Knitter site', 'The file could not be read.'); return; }
  clearBlobs();
  state.project = p;
  loadBlobs(data.blobs);
  loadProject(p, data.path);
  requestAnimationFrame(() => fitZoom());
}

let busyEl = null;
function busy(msg) {
  if (msg === false) { busyEl?.remove(); busyEl = null; return; }
  if (!busyEl) { busyEl = h('div', { class: 'busy' }, h('div', { class: 'spinner' }), h('span')); document.body.append(busyEl); }
  busyEl.querySelector('span').textContent = msg;
}

async function buildFiles(extra = {}) {
  if (isEditingText()) finishTextEdit();
  busy('Spinning your site…');
  try {
    return await buildSite(state.project, { onProgress: (m) => busy(m), ...extra });
  } finally {
    busy(false);
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
let clipboard = [];
let publishReporter = null;
window.ws.onPublishProgress((d) => publishReporter?.(d.msg, d.pct));

async function run(cmd, arg) {
  const needsProject = !['new-site', 'open', 'open-path', 'about', 'shortcuts'].includes(cmd);
  if (needsProject && !state.project) return;
  const page = currentPage();
  switch (cmd) {
    case 'new-site': {
      if (!(await confirmDiscard())) return;
      const r = await chooseTheme({ mode: 'new', current: arg });
      if (!r) return;
      busy('Creating your site…');
      try {
        clearBlobs();
        const p = await newProject(r.themeId, r.name, r.templates);
        state.project = p; // generateSample registered blobs already
        loadProject(p, null);
        setDirty(true);
        requestAnimationFrame(() => fitZoom());
      } finally { busy(false); }
      break;
    }
    case 'open': {
      if (!(await confirmDiscard())) return;
      try { openLoaded(await window.ws.openDialog()); } catch (e) { window.ws.showError('Could not open site', String(e.message || e)); }
      break;
    }
    case 'open-path': {
      if (!(await confirmDiscard())) return;
      try { openLoaded(await window.ws.openPath(arg)); } catch (e) { window.ws.showError('Could not open site', String(e.message || e)); }
      break;
    }
    case 'save': await save(); break;
    case 'save-as': await save(true); break;

    case 'add-page': {
      const tpl = await chooseTemplate();
      if (!tpl) return;
      busy('Adding page…');
      try {
        const np = await buildPage(tpl, state.project.site.theme, state.project, { seedBase: Math.floor(Math.random() * 900) });
        mutate((proj) => {
          np.slug = uniqueSlug(proj, np.name);
          if (proj.pages.some((x) => x.name === np.name)) { np.name = np.name + ' ' + (proj.pages.filter((x) => x.template === tpl).length + 1); np.slug = uniqueSlug(proj, np.name); }
          proj.pages.push(np);
          resolveTemplateLinks(proj);
        }, { events: ['pages', 'assets'] });
        selectPage(np.id);
      } finally { busy(false); }
      break;
    }
    case 'duplicate-page': duplicatePage(); break;

    case 'theme': {
      const r = await chooseTheme({ mode: 'change', current: state.project.site.theme });
      if (!r || r.themeId === state.project.site.theme) return;
      mutate((proj) => applyTheme(proj, r.themeId), { events: ['change', 'pages'] });
      toast(`Theme changed to ${themeById(r.themeId).name}`);
      break;
    }

    case 'undo': if (isEditingText()) window.ws.nativeEdit('undo'); else if (document.activeElement?.matches('input,textarea,[contenteditable=true]')) window.ws.nativeEdit('undo'); else undo(); break;
    case 'redo': if (isEditingText() || document.activeElement?.matches('input,textarea,[contenteditable=true]')) window.ws.nativeEdit('redo'); else redo(); break;

    case 'cut': case 'copy': {
      if (inTextField()) { window.ws.nativeEdit(cmd); return; }
      const sel = selectedElements();
      if (!sel.length) return;
      clipboard = clone(sel);
      if (cmd === 'cut') deleteSelection();
      break;
    }
    case 'paste': {
      if (inTextField()) { window.ws.nativeEdit('paste'); return; }
      if (clipboard.length && page && !state.entryId) {
        const copies = clipboard.map((c) => ({ ...clone(c), id: uid('e'), x: c.x + 20, y: c.y + 20 }));
        clipboard = clipboard.map((c) => ({ ...c, x: c.x + 20, y: c.y + 20 }));
        mutate(() => { page.elements.push(...copies); });
        select(copies.map((c) => c.id));
      } else {
        // images from the system clipboard
        try {
          const items = await navigator.clipboard.read();
          const files = [];
          for (const it of items) {
            const type = it.types.find((t) => t.startsWith('image/'));
            if (type) files.push(new File([await it.getType(type)], 'Pasted image.' + type.split('/')[1], { type }));
          }
          if (files.length) {
            const { addFiles } = await import('./media.js');
            placeAssets(await addFiles(files), null, selectedElements()[0]);
          }
        } catch (e) { /* nothing to paste */ }
      }
      break;
    }
    case 'duplicate': {
      const sel = selectedElements();
      if (!sel.length) return;
      const copies = sel.map((c) => ({ ...clone(c), id: uid('e'), x: c.x + 20, y: c.y + 20 }));
      mutate(() => { page.elements.push(...copies); });
      select(copies.map((c) => c.id));
      break;
    }
    case 'delete': if (inTextField()) { window.ws.nativeEdit('delete'); return; } deleteSelection(); break;
    case 'select-all':
      if (inTextField()) { window.ws.nativeEdit('selectAll'); return; }
      if (page) select(page.elements.filter((e) => !e.hidden).map((e) => e.id));
      break;

    case 'insert': await insert(arg); break;
    case 'replace-media': {
      const el = arg ? page.elements.find((e) => e.id === arg) : selectedElements()[0];
      if (!el) return;
      const kind = el.type === 'video' ? 'video' : el.type === 'audio' ? 'audio' : 'image';
      const id = await chooseAsset(kind);
      if (id) mutate(() => { el.asset = id; });
      break;
    }
    case 'edit-text': { const el = selectedElements()[0]; if (el) startTextEdit(el); break; }

    case 'arrange': arrange(arg); break;
    case 'align': align(arg); break;
    case 'distribute': distribute(arg); break;
    case 'lock': mutate(() => { for (const e of selectedElements()) e.locked = arg; }); emit('selection'); break;

    case 'zoom':
      if (arg === 'in') setZoom(state.zoom * 1.25);
      else if (arg === 'out') setZoom(state.zoom / 1.25);
      else if (arg === 'fit') fitZoom();
      else setZoom(1);
      break;
    case 'toggle':
      if (arg === 'inspector') app.classList.toggle('no-inspector');
      if (arg === 'media') app.classList.toggle('no-media');
      if (arg === 'guides') { state.showGuides = !state.showGuides; app.classList.toggle('no-guides', !state.showGuides); }
      requestAnimationFrame(() => emit('selection'));
      break;

    case 'preview': {
      const { files } = await buildFiles();
      const p = currentPage();
      let start = pageFile(state.project, p);
      if (state.entryId) start = entryFile(p, p.blog.entries.find((e) => e.id === state.entryId));
      await window.ws.preview({ files, startPage: start });
      toast('Preview updated');
      break;
    }
    case 'export-folder': {
      const { files } = await buildFiles();
      const dir = await window.ws.exportFolder({ files, siteName: state.project.site.name });
      if (dir) toast(`Exported ${files.length} files`);
      break;
    }
    case 'export-zip': {
      const { files } = await buildFiles();
      const f = await window.ws.exportZip({ files, siteName: state.project.site.name });
      if (f) toast('ZIP saved');
      break;
    }
    case 'publish': {
      publishDialog({
        onPublish: async (settings, remember, report) => {
          setDirty(true);
          const { files } = await buildSite(state.project, { onProgress: (m) => report(m, 0) });
          publishReporter = report;
          const r = await window.ws.publishFtp({ files, settings, remember });
          publishReporter = null;
          if (r.ok) report(`✓ Published ${r.count} files. Your site is live!`, 100);
          else report('✗ ' + r.error, 0);
          return r;
        },
      });
      break;
    }
    case 'shortcuts': shortcutsDialog(); break;
    case 'about': aboutDialog(); break;
    default: console.warn('unknown command', cmd);
  }
}

function inTextField() {
  if (isEditingText()) return true;
  const a = document.activeElement;
  return !!a && (a.matches('input:not([type=checkbox]):not([type=range]):not([type=color]),textarea,select') || a.isContentEditable);
}

function deleteSelection() {
  const page = currentPage();
  const ids = new Set(state.selection);
  if (!ids.size) return;
  const locked = page.elements.filter((e) => ids.has(e.id) && e.locked);
  mutate(() => { page.elements = page.elements.filter((e) => !ids.has(e.id) || e.locked); });
  select(locked.map((e) => e.id));
  if (locked.length) toast('Locked items were not deleted');
}

async function insert(what) {
  const page = currentPage();
  if (!page) return;
  if (state.entryId) selectPage(page.id);
  const pt = defaultInsertPoint();
  const t = themeById(state.project.site.theme);
  const at = (w, hh) => [Math.round(pt.x - w / 2), Math.round(pt.y - hh / 2), w, hh];
  let el = null;
  if (what === 'text') {
    el = make.text(...at(360, 120), '<p>Double-click to edit this text.</p>', { font: t.fonts.body, color: t.colors.text, role: 'body' });
  } else if (what?.startsWith('shape:')) {
    const k = what.slice(6);
    el = make.shape(k, ...(k === 'line' ? at(300, 20) : k === 'arrow' ? at(220, 120) : at(200, 200)));
    if (k !== 'line') { el.fill = { type: 'color', color: t.colors.accent }; el.color = t.colors.onAccent; }
    else el.stroke.color = t.colors.text;
  } else if (what === 'image') {
    const id = await chooseAsset('image');
    if (id) placeAssets([id], pt, null);
    return;
  } else if (what === 'video' || what === 'audio') {
    const id = await chooseAsset(what);
    if (id) placeAssets([id], pt, null);
    return;
  } else if (what === 'button') {
    el = make.button(...at(180, 48), 'Learn More', { role: 'button' });
  } else if (what === 'gallery') {
    el = make.gallery(...at(600, 420), [], { role: 'gallery' });
  } else if (what === 'slideshow') {
    el = make.slideshow(...at(640, 400), []);
  } else if (what === 'embed') {
    const url = await promptText('YouTube or Vimeo Video', '', { label: 'Paste the video’s web address', placeholder: 'https://www.youtube.com/watch?v=…' });
    if (url === null) return;
    el = make.embed(...at(640, 360), url);
  } else if (what === 'map') {
    const addr = await promptText('Map', 'CN Tower, Toronto', { label: 'Address or place name' });
    if (addr === null) return;
    el = make.map(...at(480, 320), addr);
  } else if (what === 'form') {
    el = make.form(...at(420, 400), { role: 'form' });
  } else if (what === 'html') {
    el = make.html(...at(400, 200));
  } else if (what === 'navbar') {
    el = make.navbar(...at(600, 40), { role: 'nav' });
  } else if (what === 'blogfeed') {
    el = make.blogfeed(...at(600, 500));
  }
  if (!el) return;
  const { styleForRole } = await import('./themes.js');
  if (el.role) styleForRole(el, t);
  mutate(() => { page.elements.push(el); });
  select([el.id]);
  if (what === 'text') requestAnimationFrame(() => startTextEdit(el));
}

function arrange(how) {
  const page = currentPage();
  const ids = new Set(state.selection);
  if (!ids.size) return;
  mutate(() => {
    const els = page.elements;
    if (how === 'front') page.elements = [...els.filter((e) => !ids.has(e.id)), ...els.filter((e) => ids.has(e.id))];
    else if (how === 'back') page.elements = [...els.filter((e) => ids.has(e.id)), ...els.filter((e) => !ids.has(e.id))];
    else if (how === 'forward') {
      for (let i = els.length - 2; i >= 0; i--) if (ids.has(els[i].id) && !ids.has(els[i + 1].id)) [els[i], els[i + 1]] = [els[i + 1], els[i]];
    } else if (how === 'backward') {
      for (let i = 1; i < els.length; i++) if (ids.has(els[i].id) && !ids.has(els[i - 1].id)) [els[i], els[i - 1]] = [els[i - 1], els[i]];
    }
  });
}

function align(how) {
  const sel = selectedElements().filter((e) => !e.locked);
  if (!sel.length) return;
  const W = state.project.site.width || 980;
  const H = currentPage().height;
  const single = sel.length === 1;
  const box = single || how === 'page-center'
    ? { x: 0, y: 0, r: W, b: H }
    : { x: Math.min(...sel.map((e) => e.x)), y: Math.min(...sel.map((e) => e.y)), r: Math.max(...sel.map((e) => e.x + e.w)), b: Math.max(...sel.map((e) => e.y + e.h)) };
  mutate(() => {
    for (const e of sel) {
      if (how === 'left') e.x = box.x;
      if (how === 'right') e.x = box.r - e.w;
      if (how === 'hcenter') e.x = Math.round((box.x + box.r) / 2 - e.w / 2);
      if (how === 'top') e.y = box.y;
      if (how === 'bottom') e.y = box.b - e.h;
      if (how === 'vcenter') e.y = Math.round((box.y + box.b) / 2 - e.h / 2);
      if (how === 'page-center') e.x = Math.round(W / 2 - e.w / 2);
    }
  });
  emit('selection');
}

function distribute(axis) {
  const sel = selectedElements().filter((e) => !e.locked);
  if (sel.length < 3) return;
  const k = axis === 'h' ? 'x' : 'y', s = axis === 'h' ? 'w' : 'h';
  const sorted = [...sel].sort((a, b) => a[k] - b[k]);
  const start = sorted[0][k], end = sorted[sorted.length - 1][k] + sorted[sorted.length - 1][s];
  const total = sorted.reduce((a, e) => a + e[s], 0);
  const gap = (end - start - total) / (sorted.length - 1);
  mutate(() => {
    let pos = start;
    for (const e of sorted) { e[k] = Math.round(pos); pos += e[s] + gap; }
  });
  emit('selection');
}

// ---------------------------------------------------------------------------
function onKey(e) {
  if (!state.project) return;
  if (document.querySelector('.modal-back')) return;
  if (inTextField()) return;
  const sel = selectedElements();
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length) { e.preventDefault(); deleteSelection(); return; }
  if (e.key === 'Escape') { select([]); return; }
  if (e.key === 'Enter' && sel.length === 1 && ['text', 'shape', 'button'].includes(sel[0].type)) { e.preventDefault(); startTextEdit(sel[0]); return; }
  if (e.key.startsWith('Arrow') && sel.length) {
    e.preventDefault();
    const d = e.shiftKey ? 10 : 1;
    const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
    const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
    mutate(() => { for (const el of sel) if (!el.locked) { el.x += dx; el.y += dy; } }, { key: 'nudge' });
    emit('selection');
  }
}

// expose for debugging & automated tests
window.__ws = { state, run, renderCanvas, emit };
export { importViaDialog };

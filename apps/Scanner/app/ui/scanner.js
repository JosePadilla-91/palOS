'use strict';
/* Scanner window */
const ICON = 'file:///usr/share/icons/hicolor/256x256/apps/palos-scanner.png';
const S = {
  devices: null, dev: null, caps: null, looking: false,
  source: '', kind: 'colour', resolution: 300,
  preview: null,                   // { file, width, height }
  crop: null,                      // { x, y, w, h } as fractions of the scanner's area
  pages: [], sel: -1, busy: false,
};
const KINDS = [['colour', 'Colour'], ['grey', 'Greyscale'], ['bw', 'Black & White']];
const fileUrl = (f) => 'file://' + encodeURI(f) + '?' + Date.now().toString(36);
const cm = (mm) => (mm / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const area = () => (S.caps && S.caps.area) || { width: 215.9, height: 297 };

// ---------------------------------------------------------------- scanners
async function look() {
  S.looking = true; S.devices = null; sidebar();
  const r = await api.invoke('devices');
  S.looking = false;
  S.devices = Array.isArray(r) ? r : [];
  if (!S.devices.some((d) => d.id === (S.dev && S.dev.id))) await choose(S.devices[0] || null);
  else sidebar();
}
async function choose(d) {
  S.dev = d; S.caps = null; S.preview = null; S.crop = null;
  sidebar(); bed();
  if (!d) return;
  const caps = await api.invoke('options', d.id);
  if (caps && caps.error) { hint(caps.error); return; }
  S.caps = caps;
  S.source = (caps.sources || [])[0] || '';
  if (!caps.resolutions.includes(S.resolution)) S.resolution = caps.resolutions.reduce((a, b) => (Math.abs(b - 300) < Math.abs(a - 300) ? b : a), caps.resolutions[0]);
  sidebar(); bed();
  hint('Click Overview to see what’s on the scanner, then drag to choose the part to scan.');
}

function sidebar() {
  const nav = $('#nav'); nav.textContent = '';
  if (S.looking) nav.append(el('div', { class: 'none' }, el('div', { class: 'spin', style: { display: 'inline-block', verticalAlign: '-3px', marginRight: '8px' } }), 'Looking for scanners…'));
  else if (!S.devices || !S.devices.length) {
    nav.append(el('div', { class: 'none' }, el('div', { text: 'No scanner found.' }), el('div', { text: 'Turn your scanner on and connect it to this computer or to your network, then look again.' }),
      el('button', { class: 'btn small', onclick: look }, 'Look Again')));
  } else for (const d of S.devices) {
    nav.append(el('button', { class: 'nav' + (S.dev && S.dev.id === d.id ? ' on' : ''), onclick: () => choose(d) },
      el('img', { src: ICON }), el('span', { class: 'n' }, d.name, el('small', { text: d.network ? 'On the network' : 'Connected to this computer' }))));
  }
  const st = $('#settings'); st.textContent = '';
  if (!S.caps) { buttons(); return; }
  const c = S.caps;
  if (c.sources.length > 1) {
    st.append(el('label', { class: 'f' }, el('span', { text: 'Scan from' }),
      el('select', { onchange: (e) => { S.source = e.target.value; sidebar(); } }, ...c.sources.map((s) => el('option', { value: s, selected: s === S.source }, sourceName(s))))));
  }
  const seg = el('div', { class: 'seg' }, ...KINDS.map(([k, label]) => el('button', { 'aria-pressed': String(S.kind === k), onclick: () => { S.kind = k; sidebar(); } }, label)));
  st.append(el('div', { class: 'f' }, el('span', { text: 'Kind' }), seg));
  st.append(el('label', { class: 'f' }, el('span', { text: 'Resolution' }),
    el('select', { onchange: (e) => { S.resolution = +e.target.value; sidebar(); } }, ...c.resolutions.map((r) => el('option', { value: r, selected: r === S.resolution }, `${r} dpi${r === 300 ? ' (documents)' : r === 600 ? ' (photos)' : r <= 100 ? ' (screen)' : ''}`)))));
  const a = selArea();
  const px = (mm) => Math.round(mm / 25.4 * S.resolution);
  st.append(el('div', { class: 'f' }, el('span', { text: 'Size' }), el('div', { class: 'size', text: `${cm(a.w)} × ${cm(a.h)} cm  ·  ${px(a.w)} × ${px(a.h)} px` })));
  if (feeder()) st.append(el('div', { class: 'size', text: 'Every page in the feeder is scanned, one after the other.' }));
  buttons();
}
const sourceName = (s) => (/duplex/i.test(s) ? 'Document Feeder (both sides)' : /feeder|adf/i.test(s) ? 'Document Feeder' : /flatbed|normal/i.test(s) ? 'Flatbed' : /transparen|film|tpu/i.test(s) ? 'Film / Slides' : s);
const feeder = () => /feeder|adf|duplex/i.test(S.source || '');
function buttons() {
  $('#scanBtn').disabled = !S.caps || S.busy;
  $('#previewBtn').disabled = !S.caps || S.busy || feeder();
  $('#scanBtn').textContent = feeder() ? 'Scan All Pages' : 'Scan';
  $('#saveBtn').disabled = !S.pages.length || S.busy;
}

// ---------------------------------------------------------------- the bed: overview and crop
function selArea() {
  const A = area(); const c = S.crop || { x: 0, y: 0, w: 1, h: 1 };
  return { l: c.x * A.width, t: c.y * A.height, w: c.w * A.width, h: c.h * A.height };
}
function bed() {
  const stage = $('#stage'), b = $('#bed');
  const A = area();
  const W = stage.clientWidth - 60, H = stage.clientHeight - 70;
  const k = Math.min(W / A.width, H / A.height);
  b.style.width = Math.max(50, A.width * k) + 'px'; b.style.height = Math.max(50, A.height * k) + 'px';
  b.classList.toggle('none', !S.caps);
  const img = $('#pv');
  if (S.preview) img.src = fileUrl(S.preview.file); else img.removeAttribute('src');
  const cr = $('#crop');
  cr.classList.toggle('on', !!S.crop);
  if (S.crop) {
    Object.assign(cr.style, { left: S.crop.x * 100 + '%', top: S.crop.y * 100 + '%', width: S.crop.w * 100 + '%', height: S.crop.h * 100 + '%' });
    const a = selArea(); $('#dims').textContent = `${cm(a.w)} × ${cm(a.h)} cm`;
  }
}
function hint(t) { $('#hint').textContent = t || ''; }
(function cropping() {
  const b = $('#bed');
  let drag = null;
  const frac = (e) => { const r = b.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }; };
  b.addEventListener('pointerdown', (e) => {
    if (!S.caps || S.busy || e.button !== 0) return;
    const p = frac(e); const h = e.target.dataset && e.target.dataset.h;
    b.setPointerCapture(e.pointerId);
    if (h) drag = { kind: 'h', h, start: p, c0: { ...S.crop } };
    else if (S.crop && e.target.closest('#crop')) drag = { kind: 'move', start: p, c0: { ...S.crop } };
    else { drag = { kind: 'new', start: p }; S.crop = { x: p.x, y: p.y, w: 0, h: 0 }; }
  });
  b.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = frac(e); const c0 = drag.c0;
    if (drag.kind === 'new') S.crop = { x: Math.min(p.x, drag.start.x), y: Math.min(p.y, drag.start.y), w: Math.abs(p.x - drag.start.x), h: Math.abs(p.y - drag.start.y) };
    else if (drag.kind === 'move') {
      const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
      S.crop = { ...c0, x: Math.min(1 - c0.w, Math.max(0, c0.x + dx)), y: Math.min(1 - c0.h, Math.max(0, c0.y + dy)) };
    } else {
      let { x, y, w, h } = c0; let r = x + w, bt = y + h;
      if (drag.h.includes('w')) x = Math.min(p.x, r - 0.01); if (drag.h.includes('e')) r = Math.max(p.x, x + 0.01);
      if (drag.h.includes('n')) y = Math.min(p.y, bt - 0.01); if (drag.h.includes('s')) bt = Math.max(p.y, y + 0.01);
      S.crop = { x, y, w: r - x, h: bt - y };
    }
    bed(); sidebar();
  });
  const end = () => { if (drag && drag.kind === 'new' && S.crop && (S.crop.w < 0.02 || S.crop.h < 0.02)) S.crop = null; drag = null; bed(); sidebar(); };
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
  b.addEventListener('dblclick', () => { S.crop = null; bed(); sidebar(); });
})();

// ---------------------------------------------------------------- scanning
function busy(on, text) {
  S.busy = on; $('#busy').classList.toggle('hidden', !on); $('#busyText').textContent = text || 'Scanning…';
  $('#barFill').style.width = '0'; $('.bar').classList.toggle('indef', true); buttons();
}
api.on('saving', (on) => { if (on) busy(true, 'Saving…'); else $('#busy').classList.add('hidden'); });
api.on('progress', (f) => { $('.bar').classList.remove('indef'); $('#barFill').style.width = Math.round(f * 100) + '%'; });
async function overview() {
  if (!S.caps || S.busy) return;
  busy(true, 'Making an overview…');
  const r = await api.invoke('scan', { device: S.dev.id, caps: S.caps, kind: S.kind, preview: true });
  busy(false);
  if (r.error) return alertBox('The overview didn’t work', r.error);
  if (r.pages && r.pages[0]) {
    if (S.preview) api.invoke('discard', [S.preview.file]);
    S.preview = r.pages[0];
    hint('Drag across the overview to choose the part to scan. Double-click to scan the whole area.');
    if (!S.crop && r.box) S.crop = r.box;           // a first guess at the document's edges
    bed(); sidebar();
  }
}
async function scanNow() {
  if (!S.caps || S.busy) return;
  busy(true, feeder() ? 'Scanning the pages in the feeder…' : 'Scanning the document…');
  const r = await api.invoke('scan', { device: S.dev.id, caps: S.caps, kind: S.kind, resolution: S.resolution, source: S.source, area: feeder() ? null : (S.crop ? selArea() : null) });
  busy(false);
  if (r.error) return alertBox('The scan didn’t work', r.error);
  for (const p of r.pages || []) S.pages.push({ ...p, resolution: r.resolution });
  S.sel = S.pages.length - 1;
  tray(); buttons();
  if (r.notice) toast(r.notice);
  else if ((r.pages || []).length > 1) toast(`${r.pages.length} pages scanned`);
}

// ---------------------------------------------------------------- scanned pages
function tray() {
  const box = $('#pages'); box.textContent = '';
  if (!S.pages.length) { box.append(el('div', { class: 'empty-tray', text: 'Scanned pages appear here. Scan more pages to save them together in one PDF or TIFF.' })); buttons(); return; }
  S.pages.forEach((p, i) => {
    box.append(el('div', { class: 'pg' + (i === S.sel ? ' on' : ''), onclick: () => { S.sel = i; tray(); } },
      el('img', { src: fileUrl(p.file) }), el('span', { text: `Page ${i + 1}` }),
      el('button', { class: 'del', title: 'Delete Page', onclick: (e) => { e.stopPropagation(); removePage(i); } }, '✕')));
  });
  buttons();
}
function removePage(i) { if (i < 0 || i >= S.pages.length) return; api.invoke('discard', [S.pages[i].file]); S.pages.splice(i, 1); S.sel = Math.min(S.sel, S.pages.length - 1); tray(); }
async function saveNow() {
  if (!S.pages.length || S.busy) return;
  const format = $('#format').value;
  if ((format === 'jpeg' || format === 'png') && S.pages.length > 1) toast('Each page is saved as its own picture.');
  S.busy = true; buttons();
  const r = await api.invoke('save', { pages: S.pages, format, openAfter: $('#openAfter').checked, name: new Date().toISOString().slice(0, 10).replace(/-/g, '-') + ' Scan' });
  busy(false);
  if (r.cancelled) return;
  if (r.error) return alertBox('The scan couldn’t be saved', r.error);
  const ok = await api.invoke('ui:message', { type: 'info', message: r.files.length > 1 ? `${r.files.length} pictures saved` : 'Scan saved',
    detail: 'Clear the scanned pages to start a new document?', buttons: ['Clear Pages', 'Keep Them', 'Show in Folder'], defaultId: 0, cancelId: 1 });
  if (ok && ok.response === 0) { api.invoke('discard', S.pages.map((p) => p.file)); S.pages = []; S.sel = -1; tray(); }
  if (ok && ok.response === 2) api.invoke('show', r.files[0]);
}

// ---------------------------------------------------------------- wiring
$('#previewBtn').onclick = overview;
$('#scanBtn').onclick = scanNow;
$('#saveBtn').onclick = saveNow;
$('#cancelBtn').onclick = () => api.invoke('cancel');
try { const f = localStorage.getItem('format'); if (f) $('#format').value = f; $('#openAfter').checked = localStorage.getItem('openAfter') === '1'; } catch {}
$('#format').onchange = () => { try { localStorage.setItem('format', $('#format').value); } catch {} };
$('#openAfter').onchange = () => { try { localStorage.setItem('openAfter', $('#openAfter').checked ? '1' : '0'); } catch {} };
api.on('cmd', (c) => ({ preview: overview, scan: scanNow, save: saveNow, refresh: look, selectAll: () => { S.crop = null; bed(); sidebar(); },
  deletePage: () => removePage(S.sel), clearPages: () => { api.invoke('discard', S.pages.map((p) => p.file)); S.pages = []; S.sel = -1; tray(); } }[c] || (() => {}))());
window.addEventListener('resize', () => bed());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.busy) api.invoke('cancel'); });
tray(); bed(); look();

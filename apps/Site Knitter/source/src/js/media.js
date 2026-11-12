// Asset store (binary blobs kept outside the undoable document) + Media Browser
import { state, mutate, on, emit } from './store.js';
import { uid, h, bytes, esc } from './util.js';

const blobs = new Map();   // id -> Blob
const urls = new Map();    // id -> object URL

export function kindOf(mime) {
  if (/^image\//.test(mime)) return 'image';
  if (/^video\//.test(mime)) return 'video';
  if (/^audio\//.test(mime)) return 'audio';
  return 'file';
}

export function assetUrl(id) {
  if (!id || !blobs.has(id)) return '';
  if (!urls.has(id)) urls.set(id, URL.createObjectURL(blobs.get(id)));
  return urls.get(id);
}
export const assetBlob = (id) => blobs.get(id);
export const assetMeta = (id) => state.project?.assets?.[id] || null;

export function clearBlobs() {
  for (const u of urls.values()) URL.revokeObjectURL(u);
  urls.clear();
  blobs.clear();
}

/** Register blobs loaded from disk */
export function loadBlobs(map) {
  clearBlobs();
  for (const [id, data] of Object.entries(map || {})) {
    const meta = state.project?.assets?.[id];
    blobs.set(id, new Blob([data], { type: meta?.mime || 'application/octet-stream' }));
  }
}

export async function blobsForSave() {
  const out = {};
  for (const [id, b] of blobs) {
    if (state.project.assets[id]) out[id] = new Uint8Array(await b.arrayBuffer());
  }
  return out;
}

async function measure(blob, kind) {
  try {
    if (kind === 'image') {
      if (blob.type === 'image/svg+xml') {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url; });
        URL.revokeObjectURL(url);
        return { w: img.naturalWidth || 400, h: img.naturalHeight || 300 };
      }
      const bmp = await createImageBitmap(blob);
      const d = { w: bmp.width, h: bmp.height };
      bmp.close();
      return d;
    }
    if (kind === 'video') {
      const url = URL.createObjectURL(blob);
      const v = document.createElement('video');
      v.preload = 'metadata';
      await new Promise((r) => { v.onloadedmetadata = r; v.onerror = r; v.src = url; setTimeout(r, 3000); });
      URL.revokeObjectURL(url);
      return { w: v.videoWidth || 640, h: v.videoHeight || 360 };
    }
  } catch (e) { console.warn('measure failed', e); }
  return { w: 0, h: 0 };
}

/** Add an asset (name, mime, bytes|Blob). Returns the new id. */
export async function addAsset(name, mime, data, { silent = false, project = null } = {}) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const kind = kindOf(mime);
  const dim = await measure(blob, kind);
  const id = uid('a');
  blobs.set(id, blob);
  const meta = { id, name, mime, kind, size: blob.size, ...dim, added: Date.now() };
  if (silent) (project || state.project).assets[id] = meta;
  else mutate((p) => { p.assets[id] = meta; }, { events: ['assets'] });
  return id;
}

export async function importViaDialog(kind = 'image') {
  const files = await window.ws.importMedia(kind);
  const ids = [];
  for (const f of files) ids.push(await addAsset(f.name, f.mime, f.data));
  return ids;
}

export async function addFiles(fileList) {
  const ids = [];
  for (const f of fileList) {
    if (!/^(image|video|audio)\//.test(f.type)) continue;
    ids.push(await addAsset(f.name, f.type, f));
  }
  return ids;
}

/** Is this asset referenced anywhere in the project? */
export function assetUsage(id) {
  const json = JSON.stringify({ pages: state.project.pages, site: state.project.site });
  return json.split(`"${id}"`).length - 1;
}

export function deleteAsset(id) {
  mutate((p) => { delete p.assets[id]; }, { events: ['assets', 'change'] });
}

// ---------------------------------------------------------------------------
// Procedural sample photos so new sites look finished, like classic demo art.
// ---------------------------------------------------------------------------
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function shade(hex, amt) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const n = parseInt(c, 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

const SCENES = ['mountains', 'sea', 'dunes', 'bokeh', 'hills', 'aurora'];

export async function generateSample(seed, palette, scene, project = null) {
  const r = rng(seed * 7919 + 17);
  const W = 1600, H = 1066;
  const c = new OffscreenCanvas(W, H);
  const g = c.getContext('2d');
  const [a, b, d] = palette;
  scene = scene || SCENES[seed % SCENES.length];

  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, shade(a, -0.35));
  sky.addColorStop(0.55, shade(b, 0.25));
  sky.addColorStop(1, shade(d, 0.45));
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // sun / glow
  const sx = W * (0.25 + r() * 0.5), sy = H * (0.25 + r() * 0.2);
  const glow = g.createRadialGradient(sx, sy, 10, sx, sy, 420);
  glow.addColorStop(0, 'rgba(255,250,235,0.95)');
  glow.addColorStop(0.15, 'rgba(255,240,210,0.6)');
  glow.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  const ridge = (base, amp, color, rough) => {
    g.beginPath();
    g.moveTo(0, H);
    let y = base;
    for (let x = 0; x <= W; x += 20) {
      y += (r() - 0.5) * rough;
      y = Math.max(base - amp, Math.min(base + amp, y));
      g.lineTo(x, y + Math.sin(x / 180 + seed) * amp * 0.4);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fillStyle = color;
    g.fill();
  };

  if (scene === 'mountains' || scene === 'hills') {
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      ridge(H * (0.45 + t * 0.4), scene === 'mountains' ? 140 - t * 60 : 50, shade(i % 2 ? a : d, -0.15 - t * 0.55), scene === 'mountains' ? 90 : 25);
    }
  } else if (scene === 'sea') {
    const sea = g.createLinearGradient(0, H * 0.6, 0, H);
    sea.addColorStop(0, shade(a, -0.2));
    sea.addColorStop(1, shade(a, -0.7));
    g.fillStyle = sea;
    g.fillRect(0, H * 0.6, W, H * 0.4);
    g.globalAlpha = 0.5;
    for (let i = 0; i < 220; i++) {
      const y = H * 0.6 + Math.pow(r(), 1.6) * H * 0.4;
      g.fillStyle = 'rgba(255,245,220,' + (0.15 + r() * 0.4) + ')';
      g.fillRect(sx - 300 + r() * 600 * (1 + (y - H * 0.6) / 300), y, 20 + r() * 80, 2);
    }
    g.globalAlpha = 1;
  } else if (scene === 'dunes') {
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      const base = H * (0.55 + i * 0.12);
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 10) g.lineTo(x, base + Math.sin(x / (260 + i * 60) + seed + i) * 60);
      g.lineTo(W, H);
      g.fillStyle = shade(d, -0.1 - i * 0.18);
      g.fill();
    }
  } else if (scene === 'bokeh') {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      const x = r() * W, y = r() * H, rad = 20 + r() * 120;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const col = [a, b, d][i % 3];
      gr.addColorStop(0, shade(col, 0.5));
      gr.addColorStop(0.8, shade(col, 0.2));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.25 + r() * 0.4;
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  } else if (scene === 'aurora') {
    g.fillStyle = 'rgba(5,10,30,0.6)';
    g.fillRect(0, 0, W, H);
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      for (let x = 0; x <= W; x += 8) g.lineTo(x, H * 0.35 + Math.sin(x / 200 + k + seed) * 80 + k * 30);
      g.strokeStyle = shade([a, b, d][k % 3], 0.4);
      g.globalAlpha = 0.35;
      g.lineWidth = 60 - k * 10;
      g.filter = 'blur(18px)';
      g.stroke();
    }
    g.filter = 'none';
    g.globalAlpha = 1;
    for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(255,255,255,' + r() * 0.8 + ')'; g.fillRect(r() * W, r() * H * 0.6, 2, 2); }
    ridge(H * 0.85, 40, '#05070d', 30);
  }

  // film grain + vignette for a photographic feel
  const vig = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);

  const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.86 });
  return addAsset(`Sample ${scene} ${seed}.jpg`, 'image/jpeg', blob, { silent: true, project });
}

// ---------------------------------------------------------------------------
// Media Browser panel
// ---------------------------------------------------------------------------
let tab = 'image';
let query = '';

export function initMediaBrowser(root) {
  const render = () => {
    root.innerHTML = '';
    if (!state.project) return;
    const assets = Object.values(state.project.assets || {})
      .filter((a) => a.kind === tab)
      .filter((a) => !query || a.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (b.added || 0) - (a.added || 0));

    root.append(
      h('div', { class: 'mb-head' },
        h('div', { class: 'seg' },
          ...[['image', 'Photos'], ['video', 'Movies'], ['audio', 'Audio']].map(([k, label]) =>
            h('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; render(); } }, label))),
        h('input', { type: 'search', placeholder: 'Search media', value: query, oninput: (e) => { query = e.target.value; renderGrid(); } }),
      ),
    );
    const grid = h('div', { class: 'mb-grid' });
    root.append(grid);
    root.append(h('div', { class: 'mb-foot' },
      h('button', { class: 'btn small', onclick: () => importViaDialog(tab) }, '+ Import…'),
      h('span', { class: 'muted' }, 'Drag items onto the page'),
    ));

    function renderGrid() {
      grid.innerHTML = '';
      const list = assets.filter((a) => !query || a.name.toLowerCase().includes(query.toLowerCase()));
      if (!list.length) {
        grid.append(h('div', { class: 'mb-empty' }, tab === 'image' ? 'No photos yet. Import some or drop files onto the page.' : 'Nothing here yet.'));
        return;
      }
      for (const a of list) {
        const used = assetUsage(a.id);
        const thumb = a.kind === 'image'
          ? h('img', { src: assetUrl(a.id), alt: a.name, draggable: false, loading: 'lazy' })
          : h('div', { class: 'mb-icon' }, a.kind === 'video' ? '▶' : '♪');
        const item = h('div', {
          class: 'mb-item', draggable: true, title: `${a.name}\n${a.w && a.h ? a.w + '×' + a.h + ' · ' : ''}${bytes(a.size)}${used ? '' : '\n(not used)'}`,
          ondragstart: (e) => {
            e.dataTransfer.setData('application/x-ws-asset', a.id);
            e.dataTransfer.effectAllowed = 'copy';
          },
          ondblclick: () => emit('asset-insert', a.id),
        }, thumb, h('span', { class: 'mb-name' }, a.name),
        h('button', {
          class: 'mb-del', title: 'Remove from site',
          onclick: (e) => {
            e.stopPropagation();
            if (used && !confirm(`“${a.name}” is used ${used} time(s) on your site. Remove it anyway?`)) return;
            deleteAsset(a.id);
          },
        }, '×'));
        grid.append(item);
      }
    }
    renderGrid();
  };
  on('project', render);
  on('assets', render);
  render();
}

export { esc };

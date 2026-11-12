// Signatures for PDFs: make one (draw it, type it, or use a picture of it), keep it for next time, and
// sign with a certificate (a certified signature: anyone can see whether the PDF changed after it was signed).
import { $, el, modal } from './util.js';

const SCRIPT_FONT = 'PalosSignature';
try {
  const f = new FontFace(SCRIPT_FONT, 'url("file:///usr/share/fonts/opentype/urw-base35/Z003-MediumItalic.otf")');
  f.load().then((x) => document.fonts.add(x)).catch(() => {});
} catch {}

/** A signature trimmed to its ink, as a PNG data URL (transparent background). */
function trimmed(canvas) {
  const g = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const px = g.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const pad = 6;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

/** The "New Signature" sheet: Draw / Type / Picture. Resolves with a PNG data URL, or null. */
export function newSignature(defaultName = '') {
  let mode = 'draw';
  return modal('New Signature', (box) => {
    const W = 520, H = 170, dpr = Math.max(2, devicePixelRatio || 1);
    const tabs = el('div', { class: 'sig-tabs', role: 'tablist' });
    const pane = el('div', { class: 'sig-pane' });
    const ink = el('canvas', { class: 'sig-canvas', width: W * dpr, height: H * dpr, style: { width: W + 'px', height: H + 'px' } });
    const g = ink.getContext('2d'); g.scale(dpr, dpr); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#14246b';
    let last = null, drew = false;
    ink.addEventListener('pointerdown', (e) => { try { ink.setPointerCapture(e.pointerId); } catch {} last = { x: e.offsetX, y: e.offsetY, t: e.timeStamp }; });
    ink.addEventListener('pointermove', (e) => {
      if (!last) return;
      const p = { x: e.offsetX, y: e.offsetY, t: e.timeStamp };
      const speed = Math.hypot(p.x - last.x, p.y - last.y) / Math.max(1, p.t - last.t);
      g.lineWidth = e.pressure && e.pointerType === 'pen' ? 1 + e.pressure * 3.4 : Math.max(1.4, 3.4 - speed * 1.6);   // faster strokes are thinner, like a pen
      g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke();
      last = p; drew = true;
    });
    const up = () => { last = null; };
    ink.addEventListener('pointerup', up); ink.addEventListener('pointercancel', up);
    const clear = el('button', { class: 'btn', text: 'Clear', onclick: () => { g.clearRect(0, 0, W, H); drew = false; } });
    const drawPane = el('div', {}, el('div', { class: 'sig-line' }, ink), el('div', { class: 'sig-row' }, el('span', { class: 'note', text: 'Sign with your trackpad, mouse or pen.' }), clear));

    const name = el('input', { type: 'text', value: defaultName, placeholder: 'Your name', spellcheck: 'false' });
    const preview = el('div', { class: 'sig-typed', style: { fontFamily: `"${SCRIPT_FONT}", cursive` }, text: defaultName || ' ' });
    name.addEventListener('input', () => { preview.textContent = name.value || ' '; });
    const typePane = el('div', {}, el('label', {}, name), el('div', { class: 'sig-line' }, preview));

    let picURL = null;
    const pic = el('div', { class: 'sig-pic', text: 'Choose a photo or scan of your signature on white paper.' });
    const file = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      const img = await createImageBitmap(f);
      // white paper becomes transparent; the ink stays
      const c = document.createElement('canvas'); const k = Math.min(1, 1200 / img.width); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const l = 0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2];
        d.data[i + 3] = Math.max(0, Math.min(255, (205 - l) * 2.4));
      }
      x.putImageData(d, 0, 0);
      picURL = trimmed(c);
      pic.textContent = ''; if (picURL) pic.append(el('img', { src: picURL }));
    });
    const picPane = el('div', {}, el('div', { class: 'sig-line' }, pic), el('div', { class: 'sig-row' }, el('span'), el('button', { class: 'btn', text: 'Choose Picture…', onclick: () => file.click() })), file);

    const panes = { draw: drawPane, type: typePane, picture: picPane };
    const show = (m) => { mode = m; pane.replaceChildren(panes[m]); for (const b of tabs.children) b.classList.toggle('on', b.dataset.m === m); if (m === 'type') setTimeout(() => name.focus(), 20); };
    for (const [m, label] of [['draw', 'Draw'], ['type', 'Type'], ['picture', 'Picture']]) tabs.append(el('button', { class: 'btn', 'data-m': m, text: label, onclick: () => show(m) }));
    box.append(tabs, pane);
    show('draw');
    return {
      ok: () => {
        if (mode === 'draw') return drew ? trimmed(ink) : false;
        if (mode === 'picture') return picURL || false;
        if (!name.value.trim()) return false;
        const c = document.createElement('canvas'); c.width = 1400; c.height = 360;
        const x = c.getContext('2d'); x.fillStyle = '#14246b'; x.font = `200px "${SCRIPT_FONT}", cursive`; x.textBaseline = 'middle';
        x.fillText(name.value.trim(), 30, 190, 1340);
        return trimmed(c);
      },
    };
  }, 'Use Signature');
}

/** Pick one of the saved signatures (or make a new one). Resolves with a data URL, or null. */
export async function chooseSignature(defaultName) {
  const saved = await window.fen.signatures.list();
  if (!saved.length) {
    const url = await newSignature(defaultName);
    if (url) await window.fen.signatures.add(url);
    return url;
  }
  let chosen = saved[0].url, wantNew = false;
  const url = await modal('Sign', (box) => {
    const grid = el('div', { class: 'sig-grid' });
    const draw = () => {
      grid.replaceChildren(...saved.map((s) => {
        const t = el('button', { class: 'sig-tile' + (s.url === chosen ? ' on' : ''), title: 'Use this signature' }, el('img', { src: s.url }),
          el('span', { class: 'x', title: 'Delete this signature', text: '×', onclick: async (e) => { e.stopPropagation(); await window.fen.signatures.remove(s.id); saved.splice(saved.indexOf(s), 1); if (chosen === s.url) chosen = saved[0] && saved[0].url; draw(); } }));
        t.onclick = () => { chosen = s.url; draw(); };
        t.ondblclick = () => { chosen = s.url; $('#modal .acts .primary').click(); };
        return t;
      }));
    };
    draw();
    box.append(el('p', { class: 'note', text: 'Choose a signature to place on the page. You can move and resize it there.' }), grid,
      el('div', { class: 'sig-row' }, el('span'), el('button', { class: 'btn', text: 'New Signature…', onclick: () => { wantNew = true; $('#modal .acts .primary').click(); } })));
    return { ok: () => (wantNew ? 'new' : chosen || false) };
  }, 'Place Signature');
  if (url !== 'new') return url;
  const fresh = await newSignature(defaultName);
  if (fresh) await window.fen.signatures.add(fresh);
  return fresh;
}

/** Make a personal signing certificate (kept in ~/.local/share/palos/fen/certificates). Resolves with { path, password } or null. */
async function createCertificate(defaultName) {
  const v = await modal('Create My Own Certificate', (box) => {
    const name = el('input', { type: 'text', value: defaultName || '', spellcheck: 'false' });
    const email = el('input', { type: 'email', placeholder: 'Optional', spellcheck: 'false' });
    const pw = el('input', { type: 'password' }), pw2 = el('input', { type: 'password' });
    const err = el('p', { class: 'note err' });
    box.append(el('p', { class: 'note', text: 'Your own certificate proves a PDF hasn’t changed since you signed it. People who don’t know it yet see “not from a known authority” until they trust it. For signatures your work or a government must recognize, use the certificate they give you.' }),
      el('label', {}, 'Name', name), el('label', {}, 'Email', email), el('label', {}, 'Password', pw), el('label', {}, 'Verify password', pw2), err);
    return { ok: () => {
      if (!name.value.trim()) { err.textContent = 'Enter your name.'; return false; }
      if (pw.value.length < 4) { err.textContent = 'Choose a password of at least 4 characters.'; return false; }
      if (pw.value !== pw2.value) { err.textContent = 'The passwords don’t match.'; return false; }
      return { name: name.value.trim(), email: email.value.trim(), password: pw.value };
    } };
  }, 'Create');
  if (!v) return null;
  const r = await window.fen.certs.create(v);
  return r ? { path: r.path, password: v.password } : null;
}

/** The "Sign with a Certificate" sheet. Resolves with { p12, password, reason, location, showSignature } or null. */
export async function certificateDetails(defaultName) {
  let preset = null;
  for (;;) {
    const certs = await window.fen.certs.list();
    let action = null;
    const v = await modal('Sign with a Certificate', (box) => {
      const sel = el('select', {}, ...certs.map((c) => el('option', { value: c.path, text: c.name, selected: preset && preset.path === c.path })));
      const pw = el('input', { type: 'password', placeholder: 'Certificate password', value: (preset && preset.password) || '' });
      const reason = el('input', { type: 'text', placeholder: 'For example: I approve this document', spellcheck: 'false' });
      const where = el('input', { type: 'text', placeholder: 'City (optional)', spellcheck: 'false' });
      const show = el('input', { type: 'checkbox', checked: true });
      const other = el('div', { class: 'sig-row' }, el('button', { class: 'btn', text: 'Use a Certificate File…', onclick: () => { action = 'file'; $('#modal .acts .primary').click(); } }),
        el('button', { class: 'btn', text: 'Create My Own…', onclick: () => { action = 'new'; $('#modal .acts .primary').click(); } }));
      box.append(el('p', { class: 'note', text: 'A certified signature shows anyone who opens this PDF who signed it, and whether it was changed afterward. Fen saves a signed copy.' }));
      if (certs.length) box.append(el('label', {}, 'Certificate', sel), el('label', {}, 'Password', pw), el('label', {}, 'Reason', reason), el('label', {}, 'Location', where),
        el('label', { class: 'inline' }, show, 'Show my signature in the box on the page'));
      else box.append(el('p', { class: 'note', text: 'You don’t have a signing certificate in Fen yet.' }));
      box.append(other);
      return { ok: () => (action ? action : certs.length ? { p12: sel.value, password: pw.value, reason: reason.value.trim(), location: where.value.trim(), showSignature: show.checked } : false) };
    }, 'Sign…');
    if (v === 'file') { const p = await window.fen.certs.choose(); preset = p ? { path: p } : null; continue; }
    if (v === 'new') { preset = await createCertificate(defaultName); continue; }
    return v;
  }
}

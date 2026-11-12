// Photos: zoom and pan, rotate and flip, crop, resize, export, copy, print, slideshow, filmstrip, camera details.
import { $, $$, el, humanSize, modal, menu } from './util.js';
import { Slideshow } from './show.js';

const WRITABLE = { jpg: 'image/jpeg', jpeg: 'image/jpeg', jpe: 'image/jpeg', jfif: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const FORMATS = [{ name: 'JPEG', type: 'image/jpeg', ext: 'jpg', quality: true }, { name: 'PNG', type: 'image/png', ext: 'png' }, { name: 'WebP', type: 'image/webp', ext: 'webp', quality: true }];
// EXIF orientation <-> (clockwise rotation, mirrored first)
const ORI = { 1: [0, false], 2: [0, true], 3: [180, false], 4: [180, true], 5: [270, true], 6: [90, false], 7: [90, true], 8: [270, false] };
const oriFrom = (rot, mir) => +Object.keys(ORI).find((k) => ORI[k][0] === ((rot % 360) + 360) % 360 && ORI[k][1] === mir);

export class ImageView {
  constructor(ctx) {
    this.ctx = ctx;
    this.stage = $('#img-stage');
    this.img = $('#pic');
    this.list = []; this.index = 0;
    this.thumbObserver = null;
    this.reset();
    new ResizeObserver(() => this.layout()).observe(this.stage);
    this.bindPointer();
  }

  reset() {
    this.rot = 0; this.flipH = false; this.flipV = false; this.zoom = 'fit'; this.panX = 0; this.panY = 0; this.baked = null; this.exif = null;
    this.cropping = false;
    $('#cropbar').classList.add('hidden'); $('#crop').classList.add('hidden');
  }

  async open(doc) {
    this.doc = doc;
    this.list = await window.fen.siblings(doc.path).catch(() => [doc.path]);
    this.index = Math.max(0, this.list.indexOf(doc.path));
    await this.load(doc.path, doc);
    if (!$('#film').classList.contains('hidden')) this.buildFilm();
  }

  async load(p, info) {
    this.reset();
    this.doc = info || await window.fen.info(p);
    this.ctx.setSaveVisible(false);
    const d = await window.fen.display(p);
    this.converted = d.converted;
    await new Promise((resolve, reject) => {
      this.img.onload = resolve;
      this.img.onerror = () => reject(new Error('The picture is damaged or in a format Fen can’t read.'));
      this.img.src = d.url + (d.url.includes('?') ? '&' : '?') + 't=' + Math.round(this.doc.mtime);
    });
    this.w = this.img.naturalWidth || 1024; this.h = this.img.naturalHeight || 768;
    this.img.style.width = this.w + 'px'; this.img.style.height = this.h + 'px';
    this.layout();
    this.markFilm();
    this.exif = null;
    window.fen.exif(p).then((x) => { if (this.doc && this.doc.path === p) { this.exif = x; this.ctx.refreshInfo(); } });
    window.fen.state({ kind: 'image', canSave: false });
  }

  // ---------------------------------------------------------------- geometry
  dims() { return this.rot % 180 ? [this.h, this.w] : [this.w, this.h]; }
  fitScale() {
    const [rw, rh] = this.dims();
    const sw = this.stage.clientWidth - 24, sh = this.stage.clientHeight - 24;
    return Math.min(1, sw / rw, sh / rh);
  }
  scale() { return this.zoom === 'fit' ? this.fitScale() : this.zoom; }
  layout() {
    if (!this.w) return;
    const s = this.scale();
    const [rw, rh] = this.dims();
    const sw = this.stage.clientWidth, sh = this.stage.clientHeight;
    // keep the picture on screen
    const mx = Math.max(0, (rw * s - sw) / 2 + 12), my = Math.max(0, (rh * s - sh) / 2 + 12);
    this.panX = Math.max(-mx, Math.min(mx, this.panX)); this.panY = Math.max(-my, Math.min(my, this.panY));
    const cx = sw / 2 + this.panX, cy = sh / 2 + this.panY;
    this.img.style.transform = `translate(${cx}px, ${cy}px) rotate(${this.rot + (this.liveRot || 0)}deg) scale(${s * (this.flipH ? -1 : 1)}, ${s * (this.flipV ? -1 : 1)}) translate(${-this.w / 2}px, ${-this.h / 2}px)`;
    this.img.classList.toggle('pixelated', s >= 3);
    this.stage.classList.toggle('grab', rw * s > sw || rh * s > sh);
    this.ctx.setZoomLabel(Math.round(s * 100) + '%');
  }
  relayout() { setTimeout(() => this.layout(), 0); }
  zoomTo(z, mx, my) {
    const old = this.scale();
    z = Math.max(0.02, Math.min(32, z));
    if (mx == null) { mx = this.stage.clientWidth / 2; my = this.stage.clientHeight / 2; }
    const cx = this.stage.clientWidth / 2 + this.panX, cy = this.stage.clientHeight / 2 + this.panY;
    const k = z / old;
    this.panX = mx - (mx - cx) * k - this.stage.clientWidth / 2;
    this.panY = my - (my - cy) * k - this.stage.clientHeight / 2;
    this.zoom = z;
    this.layout();
  }
  zoomStep(dir, mx, my) {
    const steps = [0.05, 0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32];
    const s = this.scale();
    const next = dir > 0 ? steps.find((x) => x > s * 1.01) || 32 : [...steps].reverse().find((x) => x < s * 0.99) || 0.05;
    this.zoomTo(next, mx, my);
  }

  bindPointer() {
    // two fingers turning on the touchpad: the picture follows them, then settles on the nearest quarter turn
    // (Fen's gestureend handler does the rotation itself, as Rotate Left/Right)
    this.stage.addEventListener('gesturechange', (e) => { if (this.cropping || !this.w) return; this.liveRot = Math.max(-120, Math.min(120, e.rotation || 0)); this.layout(); });
    this.stage.addEventListener('gestureend', () => { if (this.liveRot) { this.liveRot = 0; this.layout(); } });
    this.stage.addEventListener('wheel', (e) => {
      if (this.cropping || !this.w) return;
      e.preventDefault();
      const r = this.stage.getBoundingClientRect();
      if (e.ctrlKey) this.zoomTo(this.scale() * Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
      else { this.panX -= e.deltaX || (e.shiftKey ? e.deltaY : 0); this.panY -= e.shiftKey ? 0 : e.deltaY; this.layout(); }
    }, { passive: false });
    this.stage.addEventListener('dblclick', (e) => {
      if (this.cropping) return;
      const r = this.stage.getBoundingClientRect();
      if (this.zoom === 'fit' && this.fitScale() < 1) this.zoomTo(1, e.clientX - r.left, e.clientY - r.top);
      else { this.zoom = 'fit'; this.panX = this.panY = 0; this.layout(); }
    });
    let drag = null;
    this.stage.addEventListener('pointerdown', (e) => {
      if (this.cropping || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY };
      this.stage.setPointerCapture(e.pointerId);
      this.stage.classList.add('grabbing');
    });
    this.stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.panX = drag.px + e.clientX - drag.x; this.panY = drag.py + e.clientY - drag.y;
      this.layout();
    });
    const end = () => { drag = null; this.stage.classList.remove('grabbing'); };
    this.stage.addEventListener('pointerup', end);
    this.stage.addEventListener('pointercancel', end);
    // crop selection
    const crop = $('#crop'), sel = $('.sel', crop);
    let start = null;
    crop.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const b = this.imageRect();
      start = { x: Math.max(b.left, Math.min(b.right, e.clientX)), y: Math.max(b.top, Math.min(b.bottom, e.clientY)) };
      crop.setPointerCapture(e.pointerId);
      this.sel = null; sel.style.display = 'none';
    });
    crop.addEventListener('pointermove', (e) => {
      if (!start) return;
      const b = this.imageRect();
      const x = Math.max(b.left, Math.min(b.right, e.clientX)), y = Math.max(b.top, Math.min(b.bottom, e.clientY));
      const r = this.stage.getBoundingClientRect();
      const L = Math.min(start.x, x), T = Math.min(start.y, y), W = Math.abs(x - start.x), Hh = Math.abs(y - start.y);
      Object.assign(sel.style, { display: 'block', left: L - r.left + 'px', top: T - r.top + 'px', width: W + 'px', height: Hh + 'px' });
      const s = this.scale();
      this.sel = { x: Math.round((L - b.left) / s), y: Math.round((T - b.top) / s), w: Math.round(W / s), h: Math.round(Hh / s) };
      $('#crop-size').textContent = `${this.sel.w} × ${this.sel.h}`;
    });
    crop.addEventListener('pointerup', () => { start = null; });
    $('#crop-cancel').onclick = () => this.endCrop();
    $('#crop-ok').onclick = () => this.applyCrop();
  }
  imageRect() { return this.img.getBoundingClientRect(); }

  // ---------------------------------------------------------------- navigation
  async go(i) {
    if (!this.list.length) return;
    i = (i + this.list.length) % this.list.length;
    if (i === this.index && this.doc && this.doc.path === this.list[i]) return;
    if (this.dirty() && !(await this.askSave())) return;
    this.index = i;
    this.ctx.busy('Opening…');
    try { await this.load(this.list[i]); } catch (err) { await window.fen.error(`“${this.list[i].split('/').pop()}” can’t be shown.`, err.message); } finally { this.ctx.busy(null); }
    this.ctx.refreshInfo();
  }
  async askSave() {
    const a = await window.fen.askSave(this.doc.name);
    if (a === 'cancel') return false;
    if (a === 'discard') { this.discard(); return true; }
    return this.save();
  }
  async afterTrash(p) {
    const i = this.list.indexOf(p);
    if (i >= 0) this.list.splice(i, 1);
    this.discard();
    if (!this.list.length) return false;
    this.index = Math.min(i, this.list.length - 1);
    await this.load(this.list[this.index]);
    this.buildFilm();
    return true;
  }

  // ---------------------------------------------------------------- edits
  dirty() { return !!(this.rot % 360 || this.flipH || this.flipV || this.baked); }
  discard() { this.rot = 0; this.flipH = this.flipV = false; this.baked = null; }
  changed() {
    this.layout();
    const d = this.dirty();
    this.ctx.setSaveVisible(d, this.canSaveInPlace() ? 'Save' : 'Export…');
    window.fen.state({ canSave: d });
  }
  canSaveInPlace() { return !!WRITABLE[this.doc.ext] && this.doc.writable && !this.converted; }
  rotate(deg) { this.rot = (this.rot + deg + 360) % 360; this.panX = this.panY = 0; this.changed(); }
  flip(h) {
    // flipping is applied on screen after the rotation
    if (this.rot % 180 === 0 ? h : !h) this.flipH = !this.flipH; else this.flipV = !this.flipV;
    this.changed();
  }

  /** The picture with every change applied, on a canvas. */
  render(maxSide = 0) {
    const src = this.baked || this.img;
    const [rw, rh] = this.dims();
    let k = 1;
    if (maxSide && Math.max(rw, rh) > maxSide) k = maxSide / Math.max(rw, rh);
    const c = document.createElement('canvas');
    c.width = Math.round(rw * k); c.height = Math.round(rh * k);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.translate(c.width / 2, c.height / 2);
    g.rotate(this.rot * Math.PI / 180);
    g.scale((this.flipH ? -1 : 1) * k, (this.flipV ? -1 : 1) * k);
    g.drawImage(src, -this.w / 2, -this.h / 2, this.w, this.h);
    return c;
  }
  async showCanvas(c) {
    this.baked = c;
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const url = URL.createObjectURL(blob);
    await new Promise((resolve) => { this.img.onload = resolve; this.img.src = url; });
    this.w = c.width; this.h = c.height;
    this.img.style.width = this.w + 'px'; this.img.style.height = this.h + 'px';
    this.rot = 0; this.flipH = this.flipV = false; this.zoom = 'fit'; this.panX = this.panY = 0;
    this.changed();
  }

  startCrop() {
    if (this.cropping) return this.endCrop();
    this.cropping = true; this.sel = null;
    this.zoom = 'fit'; this.panX = this.panY = 0; this.layout();
    $('#crop').classList.remove('hidden'); $('.sel', $('#crop')).style.display = 'none';
    $('#cropbar').classList.remove('hidden'); $('#crop-size').textContent = 'Drag across the picture';
    $('#b-crop').classList.add('on');
  }
  endCrop() {
    this.cropping = false;
    $('#crop').classList.add('hidden'); $('#cropbar').classList.add('hidden'); $('#b-crop').classList.remove('on');
  }
  async applyCrop() {
    const s = this.sel;
    if (!s || s.w < 2 || s.h < 2) return this.endCrop();
    const full = this.render();
    const c = document.createElement('canvas');
    c.width = Math.min(s.w, full.width - s.x); c.height = Math.min(s.h, full.height - s.y);
    c.getContext('2d').drawImage(full, s.x, s.y, c.width, c.height, 0, 0, c.width, c.height);
    this.endCrop();
    await this.showCanvas(c);
  }

  async resize() {
    const [rw, rh] = this.dims();
    const r = await modal('Adjust Size', (box) => {
      const w = el('input', { type: 'number', min: 1, max: 30000, value: rw });
      const h = el('input', { type: 'number', min: 1, max: 30000, value: rh });
      const lock = el('input', { type: 'checkbox', checked: true });
      const pct = el('input', { type: 'number', min: 1, max: 1000, value: 100 });
      w.oninput = () => { if (lock.checked) h.value = Math.max(1, Math.round(w.value * rh / rw)); pct.value = Math.round(w.value / rw * 100); };
      h.oninput = () => { if (lock.checked) w.value = Math.max(1, Math.round(h.value * rw / rh)); pct.value = Math.round(h.value / rh * 100); };
      pct.oninput = () => { w.value = Math.max(1, Math.round(rw * pct.value / 100)); h.value = Math.max(1, Math.round(rh * pct.value / 100)); };
      box.append(el('label', {}, el('span', { text: 'Width' }), w, 'px'), el('label', {}, el('span', { text: 'Height' }), h, 'px'),
        el('label', {}, el('span', { text: 'Scale' }), pct, '%'), el('label', {}, el('span', { text: '' }), lock, 'Keep proportions'),
        el('p', { class: 'note', text: `Now ${rw} × ${rh} pixels.` }));
      return { ok: () => ({ w: Math.max(1, Math.min(30000, +w.value | 0)), h: Math.max(1, Math.min(30000, +h.value | 0)) }) };
    }, 'Resize');
    if (!r || (r.w === rw && r.h === rh)) return;
    this.ctx.busy('Resizing…');
    try {
      const full = this.render();
      const c = await stepScale(full, r.w, r.h);
      await this.showCanvas(c);
    } finally { this.ctx.busy(null); }
  }

  async save() {
    if (!this.dirty()) return true;
    if (!this.canSaveInPlace()) return this.export();
    const p = this.doc.path;
    const jpeg = WRITABLE[this.doc.ext] === 'image/jpeg';
    this.ctx.busy('Saving…');
    try {
      if (jpeg && !this.baked) {
        // turn the photo without re-compressing it: only its orientation tag changes
        const exif = this.exif || await window.fen.exif(p);
        const cur = ORI[+(pick(exif, 'Orientation') || 1)] || ORI[1];
        // shown = rotate(this.rot) after flips after the stored orientation, so apply them in that order
        let rot = cur[0], mir = cur[1];
        if (this.flipV) { rot = (540 - rot) % 360; mir = !mir; }
        if (this.flipH) { rot = (360 - rot) % 360; mir = !mir; }
        rot = (rot + this.rot) % 360;
        await window.fen.setOrientation(p, oriFrom(rot, mir));
      } else {
        const c = this.render();
        const blob = await new Promise((r) => c.toBlob(r, WRITABLE[this.doc.ext], 0.95));
        await window.fen.write(p, new Uint8Array(await blob.arrayBuffer()));
      }
      this.doc = await window.fen.info(p);
      await this.load(p, this.doc);
      return true;
    } catch (err) {
      await window.fen.error(`“${this.doc.name}” couldn’t be saved.`, err.message);
      return false;
    } finally { this.ctx.busy(null); }
  }

  async export() {
    const base = this.doc.name.replace(/\.[^.]+$/, '');
    const [rw, rh] = this.dims();
    const opts = await modal('Export', (box) => {
      const fmt = el('select', {}, FORMATS.map((f, i) => el('option', { value: i, text: f.name })));
      const q = el('input', { type: 'range', min: 10, max: 100, value: 90 });
      const qv = el('span', { text: '90', style: { width: '30px' } });
      const qrow = el('label', {}, el('span', { text: 'Quality' }), q, qv);
      const pct = el('input', { type: 'number', min: 1, max: 100, value: 100 });
      const dims = el('span', { class: 'note', text: `${rw} × ${rh}` });
      fmt.value = WRITABLE[this.doc.ext] === 'image/png' ? 1 : WRITABLE[this.doc.ext] === 'image/webp' ? 2 : 0;
      const upd = () => { qrow.style.display = FORMATS[fmt.value].quality ? '' : 'none'; qv.textContent = q.value; dims.textContent = `${Math.round(rw * pct.value / 100)} × ${Math.round(rh * pct.value / 100)} pixels`; };
      fmt.onchange = q.oninput = pct.oninput = upd; upd();
      box.append(el('label', {}, el('span', { text: 'Format' }), fmt), qrow, el('label', {}, el('span', { text: 'Size' }), pct, '%'), el('label', {}, el('span', { text: '' }), dims));
      return { ok: () => ({ f: FORMATS[fmt.value], q: q.value / 100, k: Math.max(1, Math.min(100, +pct.value || 100)) / 100 }) };
    }, 'Export…');
    if (!opts) return false;
    const dest = await window.fen.saveDialog(`${this.doc.dir}/${base}.${opts.f.ext}`, [{ name: opts.f.name, extensions: [opts.f.ext] }]);
    if (!dest) return false;
    this.ctx.busy('Exporting…');
    try {
      let c = this.render();
      if (opts.k < 1) c = await stepScale(c, Math.max(1, Math.round(c.width * opts.k)), Math.max(1, Math.round(c.height * opts.k)));
      if (opts.f.type === 'image/jpeg') { const w = document.createElement('canvas'); w.width = c.width; w.height = c.height; const g = w.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w.width, w.height); g.drawImage(c, 0, 0); c = w; }
      const blob = await new Promise((r) => c.toBlob(r, opts.f.type, opts.q));
      await window.fen.write(dest, new Uint8Array(await blob.arrayBuffer()));
      if (dest === this.doc.path) { this.discard(); await this.load(dest); }
      return true;
    } catch (err) {
      await window.fen.error('The picture couldn’t be exported.', err.message);
      return false;
    } finally { this.ctx.busy(null); }
  }

  async print() {
    const area = $('#print-area');
    area.className = 'photo'; area.textContent = '';
    const c = this.render(6000);
    const im = el('img', { src: c.toDataURL('image/jpeg', 0.95) });
    area.append(im);
    await im.decode().catch(() => {});
    await window.fen.print();
    area.textContent = '';
  }

  // ---------------------------------------------------------------- filmstrip
  buildFilm() {
    const strip = $('#film-strip');
    strip.textContent = '';
    if (this.thumbObserver) this.thumbObserver.disconnect();
    this.thumbObserver = new IntersectionObserver((ents) => {
      for (const en of ents) {
        if (!en.isIntersecting) continue;
        const f = en.target; this.thumbObserver.unobserve(f);
        window.fen.thumb(f.dataset.p, 140).then((u) => { f.firstChild.src = u; }).catch(() => { f.firstChild.alt = '?'; });
      }
    }, { root: $('#film'), rootMargin: '0px 300px' });
    this.list.forEach((p, i) => {
      const f = el('div', { class: 'f', title: p.split('/').pop(), onclick: () => this.go(i) }, el('img', { alt: '' }));
      f.dataset.p = p;
      strip.append(f);
      this.thumbObserver.observe(f);
    });
    this.markFilm();
  }
  markFilm() {
    const fs = $$('#film-strip .f');
    fs.forEach((f, i) => f.classList.toggle('on', i === this.index));
    if (fs[this.index]) fs[this.index].scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  // ---------------------------------------------------------------- slideshow
  slideshow() {
    const list = this.list.length ? this.list : [this.doc.path];
    new Slideshow({
      count: list.length, start: this.index,
      render: async (i) => {
        const d = await window.fen.display(list[i]);
        const im = el('img', { src: d.url });
        await im.decode().catch(() => {});
        return im;
      },
      onEnd: (i) => { if (i !== this.index) this.go(i); },
    });
  }

  // ---------------------------------------------------------------- info
  async info() {
    const x = this.exif || {};
    const [rw, rh] = this.dims();
    const mp = (rw * rh / 1e6);
    const lat = pick(x, 'GPSLatitude'), lon = pick(x, 'GPSLongitude');
    let gps = null;
    if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
      gps = el('a', { text: `${(+lat).toFixed(5)}, ${(+lon).toFixed(5)}`, onclick: () => window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`) });
    }
    const exp = pick(x, 'ExposureTime');
    return [
      ['Picture', [['Kind', pick(x, 'FileType') ? `${pick(x, 'FileType')} image` : this.doc.ext.toUpperCase()], ['Dimensions', `${rw} × ${rh}${mp >= 0.5 ? ` (${mp.toFixed(1)} MP)` : ''}`],
        ['Colour', pick(x, 'ProfileDescription') || pick(x, 'ColorSpace') && (pick(x, 'ColorSpace') == 1 ? 'sRGB' : String(pick(x, 'ColorSpace')))], ['Depth', pick(x, 'BitsPerSample') && `${String(pick(x, 'BitsPerSample')).split(' ')[0]} bits per channel`]]],
      ['Camera', [['Taken', fmtDate(pick(x, 'DateTimeOriginal') || pick(x, 'CreateDate'))], ['Camera', [pick(x, 'Make'), pick(x, 'Model')].filter(Boolean).join(' ').replace(/^(\w+) \1 /i, '$1 ') || null],
        ['Lens', pick(x, 'LensModel') || pick(x, 'LensID') || null], ['Focal length', pick(x, 'FocalLength') && `${Math.round(pick(x, 'FocalLength'))} mm`],
        ['Aperture', pick(x, 'FNumber') && `ƒ/${(+pick(x, 'FNumber')).toFixed(1).replace(/\.0$/, '')}`],
        ['Exposure', exp && (exp >= 1 ? `${exp} s` : `1/${Math.round(1 / exp)} s`)], ['ISO', pick(x, 'ISO')],
        ['Flash', pick(x, 'Flash') != null ? ((+pick(x, 'Flash') & 1) ? 'Fired' : 'Off') : null], ['Location', gps]]],
    ];
  }

  // ---------------------------------------------------------------- commands and keys
  async command(cmd) {
    switch (cmd) {
      case 'zoomIn': return this.zoomStep(1);
      case 'zoomOut': return this.zoomStep(-1);
      case 'zoomActual': return this.zoomTo(1);
      case 'zoomFit': this.zoom = 'fit'; this.panX = this.panY = 0; return this.layout();
      case 'zoomMenu': {
        const r = $('#b-zoom').getBoundingClientRect();
        const v = await menu(r.left, r.bottom + 4, [{ label: 'Zoom to Fit', value: 'fit' }, '-', ...[0.25, 0.5, 1, 2, 4].map((z) => ({ label: `${z * 100}%`, value: z }))]);
        if (v === 'fit') return this.command('zoomFit');
        if (v) this.zoomTo(v);
        return;
      }
      case 'rotateLeft': return this.rotate(-90);
      case 'rotateRight': return this.rotate(90);
      case 'flipH': return this.flip(true);
      case 'flipV': return this.flip(false);
      case 'crop': return this.cropping ? this.applyCrop() : this.startCrop();
      case 'resize': return this.resize();
      case 'save': return this.save();
      case 'export': return this.export();
      case 'print': return this.print();
      case 'copyImage': return window.fen.copyImage(this.render(8000).toDataURL('image/png'));
      case 'wallpaper': await window.fen.wallpaper(this.doc.path); this.ctx.busy('Set as the desktop picture'); setTimeout(() => this.ctx.busy(null), 900); return;
      case 'filmstrip': {
        const f = $('#film'); f.classList.toggle('hidden'); $('#b-film').classList.toggle('on', !f.classList.contains('hidden'));
        if (!f.classList.contains('hidden')) this.buildFilm();
        return this.relayout();
      }
      case 'slideshow': return this.slideshow();
      case 'prev': return this.go(this.index - 1);
      case 'next': return this.go(this.index + 1);
      case 'first': return this.go(0);
      case 'last': return this.go(this.list.length - 1);
    }
  }
  key(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return false;
    if (this.cropping) {
      if (e.key === 'Escape') { this.endCrop(); return true; }
      if (e.key === 'Enter') { this.applyCrop(); return true; }
      return false;
    }
    const map = { ArrowLeft: 'prev', ArrowUp: 'prev', ArrowRight: 'next', ArrowDown: 'next', ' ': 'next', Home: 'first', End: 'last', '+': 'zoomIn', '=': 'zoomIn', '-': 'zoomOut', '0': 'zoomFit', '1': 'zoomActual' };
    const c = map[e.key];
    if (!c) return false;
    // when zoomed in, the arrow keys move around the picture
    if (this.zoom !== 'fit' && e.key.startsWith('Arrow')) {
      const d = 60;
      if (e.key === 'ArrowLeft') this.panX += d; if (e.key === 'ArrowRight') this.panX -= d;
      if (e.key === 'ArrowUp') this.panY += d; if (e.key === 'ArrowDown') this.panY -= d;
      this.layout(); return true;
    }
    this.command(c);
    return true;
  }
  close() {}
}

function pick(x, name) {
  if (!x) return null;
  for (const g of ['ExifIFD', 'IFD0', 'Composite', 'XMP-exif', 'XMP-tiff', 'File', 'ICC_Profile', 'MakerNotes', 'QuickTime', 'XMP-xmp']) {
    const v = x[`${g}:${name}`]; if (v != null && v !== '') return v;
  }
  const k = Object.keys(x).find((k) => k.endsWith(':' + name));
  return k ? x[k] : null;
}
function fmtDate(v) {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d)/);
  if (!m) return String(v);
  return new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Good-looking downscale: halve repeatedly, then the last step. */
async function stepScale(src, w, h) {
  let cur = src;
  while (cur.width / 2 >= w && cur.height / 2 >= h) {
    const c = document.createElement('canvas'); c.width = Math.round(cur.width / 2); c.height = Math.round(cur.height / 2);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, c.width, c.height); cur = c;
  }
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const g = out.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, w, h);
  return out;
}
export { humanSize };

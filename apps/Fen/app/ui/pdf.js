// PDFs: continuous pages with selectable text and working links, page thumbnails, contents,
// find, zoom, rotate, two-page spreads, fillable forms (saved back into the file), print, slideshow;
// highlight, add text, draw, sign (a drawn signature, or a certified one with a certificate).
import * as pdfjsLib from './vendor/pdfjs/pdf.mjs';
import { $, $$, el, modal, menu } from './util.js';
import { Slideshow } from './show.js';
import { chooseSignature, certificateDetails } from './sign.js';

globalThis.pdfjsLib = pdfjsLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;
const V = await import('./vendor/pdfjs/pdf_viewer.mjs');
const ASSETS = new URL('./vendor/pdfjs/', import.meta.url).href;

export class PdfView {
  constructor(ctx) {
    this.ctx = ctx;
    this.wrap = $('#pdf-wrap');
    this.bus = new V.EventBus();
    this.links = new V.PDFLinkService({ eventBus: this.bus, externalLinkTarget: V.LinkTarget ? V.LinkTarget.BLANK : 2 });
    this.finder = new V.PDFFindController({ eventBus: this.bus, linkService: this.links });
    this.viewer = new V.PDFViewer({
      container: this.wrap, viewer: $('#viewer'), eventBus: this.bus, linkService: this.links, findController: this.finder,
      annotationMode: pdfjsLib.AnnotationMode.ENABLE_FORMS, removePageBorders: true, textLayerMode: 1, maxCanvasPixels: 2 ** 25,
      // highlighting, text, drawing and signatures (pdf.js's editor; saved into the PDF)
      annotationEditorMode: pdfjsLib.AnnotationEditorType.NONE,
      annotationEditorHighlightColors: 'yellow=#FFF176,green=#A5E8A0,blue=#9FD8FF,pink=#FFB8D9,orange=#FFC98A',
      enableHighlightFloatingButton: true,
    });
    this.tool = 'select';
    this.bus.on('annotationeditormodechanged', ({ mode }) => {
      const T = pdfjsLib.AnnotationEditorType;
      this.tool = { [T.NONE]: 'select', [T.HIGHLIGHT]: 'highlight', [T.FREETEXT]: 'text', [T.INK]: 'draw', [T.STAMP]: 'select' }[mode] || 'select';
      this.ctx.setTool && this.ctx.setTool(this.tool);
    });
    this.links.setViewer(this.viewer);
    this.bus.on('pagesinit', () => { this.viewer.currentScaleValue = 'auto'; this.updatePage(); });
    this.bus.on('pagechanging', () => this.updatePage());
    this.bus.on('scalechanging', (e) => this.ctx.setZoomLabel(Math.round(e.scale * 100) + '%'));
    this.bus.on('updatefindmatchescount', (e) => this.findCount(e.matchesCount));
    this.bus.on('updatefindcontrolstate', (e) => this.findCount(e.matchesCount, e.state));
    new ResizeObserver(() => { const v = this.viewer.currentScaleValue; if (this.doc && ['auto', 'page-fit', 'page-width'].includes(v)) this.viewer.currentScaleValue = v; }).observe(this.wrap);
    // toolbar
    const page = $('#page');
    page.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const n = parseInt(page.value, 10); if (n >= 1 && n <= this.pdf.numPages) this.viewer.currentPageNumber = n; page.blur(); this.wrap.focus(); } });
    page.addEventListener('blur', () => this.updatePage());
    const find = $('#find');
    find.addEventListener('input', () => this.find(''));
    find.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.find('again', e.shiftKey); }
      if (e.key === 'Escape') { find.value = ''; this.find(''); this.wrap.focus(); }
    });
    $$('#side .tabs button').forEach((b) => b.onclick = () => {
      $$('#side .tabs button').forEach((x) => x.classList.toggle('on', x === b));
      $('#thumbs').classList.toggle('hidden', b.dataset.tab !== 'thumbs');
      $('#outline').classList.toggle('hidden', b.dataset.tab !== 'outline');
    });
    this.wrap.addEventListener('wheel', (e) => {
      if (!e.ctrlKey || !this.pdf) return;
      e.preventDefault();
      this.viewer.currentScale = Math.max(0.1, Math.min(10, this.viewer.currentScale * Math.exp(-e.deltaY * 0.0022)));
    }, { passive: false });
  }

  async open(doc) {
    await this.close();
    this.doc = doc;
    const data = await window.fen.read(doc.path);
    // (looked at before pdf.js takes the bytes to its worker)
    const signed = /\/ByteRange\s*\[/.test(new TextDecoder('latin1').decode(data));
    const task = pdfjsLib.getDocument({ data, cMapUrl: ASSETS + 'cmaps/', cMapPacked: true, standardFontDataUrl: ASSETS + 'standard_fonts/', isEvalSupported: false, enableXfa: false });
    task.onPassword = async (give, reason) => {
      const pw = await modal(reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD ? 'That password didn’t work' : 'This PDF is protected', (box) => {
        const i = el('input', { type: 'password', placeholder: 'Password' });
        box.append(el('p', { class: 'note', text: `Enter the password for “${doc.name}”.` }), el('label', {}, i));
        return { ok: () => i.value };
      }, 'Open');
      if (pw == null) task.destroy(); else give(pw);
    };
    this.task = task;
    this.ctx.busy('Opening…');
    try { this.pdf = await task.promise; } catch (err) {
      if (err && err.name === 'PasswordException') throw new Error('The PDF is locked with a password.');
      throw new Error(err && err.message ? err.message : 'The PDF is damaged.');
    }
    this.modified = false;
    this.pdf.annotationStorage.onSetModified = () => { this.modified = true; this.ctx.setSaveVisible(true, 'Save'); };
    this.pdf.annotationStorage.onResetModified = () => { this.modified = false; this.ctx.setSaveVisible(false); };
    this.viewer.setDocument(this.pdf);
    this.links.setDocument(this.pdf, null);
    $('#pages').textContent = `of ${this.pdf.numPages}`;
    this.ctx.setSaveVisible(false);
    this.buildThumbs();
    this.buildOutline();
    this.setTool('select');
    this.checkSignatures(signed);
    // show the sidebar for longer documents
    if (this.pdf.numPages > 1 && this.sideAuto !== false) { $('#side').classList.remove('hidden'); $('#b-side').classList.add('on'); }
    this.wrap.focus();
  }

  async close() {
    if (this.thumbObs) this.thumbObs.disconnect();
    if (this.pdf) { this.viewer.setDocument(null); this.links.setDocument(null); }
    if (this.task) { try { await this.task.destroy(); } catch {} }
    this.pdf = null; this.task = null;
    const bar = $('#sigbar'); if (bar) bar.classList.add('hidden');
  }

  // ---- editing tools
  setTool(tool) {
    if (!this.pdf) return;
    const T = pdfjsLib.AnnotationEditorType;
    const mode = { select: T.NONE, highlight: T.HIGHLIGHT, text: T.FREETEXT, draw: T.INK }[tool];
    if (mode === undefined) return;
    try { this.viewer.annotationEditorMode = { mode }; } catch (err) { console.error(err); }
    this.tool = tool;
    this.ctx.setTool && this.ctx.setTool(tool);
  }

  // a drawn/typed/pictured signature, placed on the page you're looking at (move and resize it there)
  async sign() {
    if (!this.pdf) return;
    const me = await window.fen.me().catch(() => '');
    const url = await chooseSignature(me);
    if (!url) return;
    this.lastSignature = url;
    // signature-sized on the page (about 2.5 inches wide; drag its corners to change that)
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const k = Math.min(1, 300 / img.width, 110 / img.height);
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const file = new File([blob], 'signature.png', { type: 'image/png' });
    const pv = this.viewer.getPageView(this.viewer.currentPageNumber - 1);
    // the stamp tool first (switching tools finishes a moment later), then the signature goes on the page
    const T = pdfjsLib.AnnotationEditorType;
    await new Promise((resolve) => {
      const t = setTimeout(resolve, 600);
      const on = ({ mode }) => { if (mode === T.STAMP) { clearTimeout(t); this.bus.off('annotationeditormodechanged', on); setTimeout(resolve, 30); } };
      this.bus.on('annotationeditormodechanged', on);
      this.viewer.annotationEditorMode = { mode: T.STAMP };
    });
    const layer = pv && pv.annotationEditorLayer && pv.annotationEditorLayer.annotationEditorLayer;
    if (!layer) { await window.fen.error('The signature couldn’t be placed.', 'Scroll to the page again and try once more.'); return; }
    try { layer.pasteEditor(T.STAMP, { bitmapFile: file }); } catch (err) { console.error('[fen] signature', err); }
  }

  // a certified signature: saves a signed copy (edits included); the box goes at the bottom right of this page
  async certify() {
    if (!this.pdf) return;
    const me = await window.fen.me().catch(() => '');
    const d = await certificateDetails(me);
    if (!d) return;
    let image = null;
    if (d.showSignature) image = this.lastSignature || ((await window.fen.signatures.list())[0] || {}).url || null;
    const base = this.doc.name.replace(/\.pdf$/i, '');
    const out = await window.fen.saveDialog(`${this.doc.dir}/${base} (signed).pdf`, [{ name: 'PDF Document', extensions: ['pdf'] }]);
    if (!out) return;
    const n = this.viewer.currentPageNumber;
    const page = await this.pdf.getPage(n);
    const [x0, y0, x1] = page.view;
    const w = 200, h = 70, m = 36;
    this.ctx.busy('Signing…');
    try {
      const bytes = this.modified ? await this.pdf.saveDocument() : await this.pdf.getData();
      const r = await window.fen.sign({ bytes, out, p12: d.p12, password: d.password, page: n, box: [x1 - m - w, y0 + m, x1 - m, y0 + m + h], reason: d.reason, location: d.location, image });
      if (!r.ok) {
        await window.fen.error('The PDF couldn’t be signed.', r.error === 'password' ? 'That password doesn’t open this certificate.' : r.error);
        return;
      }
    } catch (err) { await window.fen.error('The PDF couldn’t be signed.', err.message); return; } finally { this.ctx.busy(null); }
    this.modified = false; this.ctx.setSaveVisible(false);
    this.ctx.open(out);
  }

  // signed PDFs: who signed, and whether it changed since
  async checkSignatures(signed) {
    const bar = $('#sigbar');
    bar.classList.add('hidden'); bar.textContent = '';
    if (!signed) return;
    const path = this.doc.path;
    let r; try { r = await window.fen.verify(path); } catch { return; }
    if (!r || !r.ok || !r.signatures.length || !this.doc || this.doc.path !== path) return;
    const sigs = r.signatures;
    const bad = sigs.some((x) => !x.intact);
    const changed = !bad && sigs.some((x) => !x.wholeFile && x === sigs[sigs.length - 1]);
    const who = [...new Set(sigs.map((x) => x.signer).filter(Boolean))].join(', ');
    const known = sigs.every((x) => x.trusted);
    bar.className = 'sigbar ' + (bad ? 'bad' : changed ? 'warn' : 'ok');
    bar.append(el('b', { text: bad ? 'A signature in this PDF doesn’t match its contents.' : changed ? `Signed by ${who}, then changed afterward.` : `Signed by ${who}. Not changed since.` }),
      el('span', { text: bad ? ' It was changed in a way that breaks the signature.' : known ? '' : ' The certificate isn’t from an authority this computer knows.' }));
  }

  updatePage() {
    if (!this.pdf) return;
    const n = this.viewer.currentPageNumber;
    if (document.activeElement !== $('#page')) $('#page').value = n;
    $$('#thumbs .th').forEach((t) => t.classList.toggle('on', +t.dataset.n === n));
    const cur = $(`#thumbs .th[data-n="${n}"]`);
    if (cur && !$('#side').classList.contains('hidden')) cur.scrollIntoView({ block: 'nearest' });
  }

  buildThumbs() {
    const box = $('#thumbs');
    box.textContent = '';
    if (this.thumbObs) this.thumbObs.disconnect();
    const pdf = this.pdf;
    this.thumbObs = new IntersectionObserver((ents) => {
      for (const en of ents) {
        if (!en.isIntersecting) continue;
        const t = en.target; this.thumbObs.unobserve(t);
        pdf.getPage(+t.dataset.n).then(async (page) => {
          const vp0 = page.getViewport({ scale: 1, rotation: this.viewer.pagesRotation });
          const scale = 124 / vp0.width;
          const vp = page.getViewport({ scale: scale * devicePixelRatio, rotation: this.viewer.pagesRotation });
          const c = el('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = vp.width / devicePixelRatio + 'px';
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          if (pdf === this.pdf) t.querySelector('.ph').replaceWith(c);
        }).catch(() => {});
      }
    }, { root: box, rootMargin: '300px 0px' });
    for (let n = 1; n <= pdf.numPages; n++) {
      const t = el('div', { class: 'th', onclick: () => { this.viewer.currentPageNumber = n; } }, el('div', { class: 'ph', style: { width: '124px', height: '160px' } }), el('span', { text: String(n) }));
      t.dataset.n = n;
      box.append(t);
      this.thumbObs.observe(t);
    }
  }

  async buildOutline() {
    const box = $('#outline');
    box.textContent = '';
    const outline = await this.pdf.getOutline().catch(() => null);
    if (!outline || !outline.length) { box.append(el('div', { class: 'empty', text: 'This PDF has no table of contents.' })); return; }
    const add = (items, depth) => {
      for (const it of items) {
        const row = el('div', { class: 'ol', title: it.title, text: it.title, style: { '--d': depth, fontWeight: it.bold ? '600' : '', fontStyle: it.italic ? 'italic' : '' } });
        row.onclick = () => { if (it.dest) this.links.goToDestination(it.dest); else if (it.url) window.open(it.url); };
        box.append(row);
        if (it.items && it.items.length) add(it.items, depth + 1);
      }
    };
    add(outline, 0);
  }

  find(type, previous = false) {
    const q = $('#find').value;
    this.bus.dispatch('find', { source: this, type, query: q, caseSensitive: false, entireWord: false, highlightAll: true, findPrevious: previous, matchDiacritics: false });
    if (!q) $('#findcount').textContent = '';
  }
  findCount(m, state) {
    if (!$('#find').value) { $('#findcount').textContent = ''; return; }
    if (state === 1 || (m && m.total === 0)) { $('#findcount').textContent = 'Not found'; return; }
    if (m && m.total) $('#findcount').textContent = `${m.current} of ${m.total}`;
  }

  async save() {
    if (!this.modified) return true;
    if (!this.doc.writable) return this.export();
    this.ctx.busy('Saving…');
    try {
      const bytes = await this.pdf.saveDocument();
      await window.fen.write(this.doc.path, bytes);
      this.modified = false; this.ctx.setSaveVisible(false);
      return true;
    } catch (err) { await window.fen.error(`“${this.doc.name}” couldn’t be saved.`, err.message); return false; } finally { this.ctx.busy(null); }
  }
  async export() {
    const dest = await window.fen.saveDialog(`${this.doc.dir}/${this.doc.name.replace(/\.pdf$/i, '')}${this.modified ? ' (filled in)' : ' copy'}.pdf`, [{ name: 'PDF Document', extensions: ['pdf'] }]);
    if (!dest) return false;
    this.ctx.busy('Saving…');
    try {
      const bytes = this.modified ? await this.pdf.saveDocument() : await this.pdf.getData();
      await window.fen.write(dest, bytes);
      return true;
    } catch (err) { await window.fen.error('The PDF couldn’t be saved.', err.message); return false; } finally { this.ctx.busy(null); }
  }
  dirty() { return !!this.modified; }
  async askSave() {
    const a = await window.fen.askSave(this.doc.name);
    if (a === 'cancel') return false;
    if (a === 'discard') { this.discard(); return true; }
    return this.save();
  }
  discard() { this.modified = false; }

  async print() {
    const n = this.pdf.numPages;
    const area = $('#print-area');
    area.className = ''; area.textContent = '';
    const urls = [];
    try {
      for (let i = 1; i <= n; i++) {
        this.ctx.busy(`Preparing page ${i} of ${n} for printing…`);
        const page = await this.pdf.getPage(i);
        const vp = page.getViewport({ scale: 150 / 72 });
        const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: g, viewport: vp, intent: 'print', annotationMode: pdfjsLib.AnnotationMode.ENABLE_STORAGE, printAnnotationStorage: this.pdf.annotationStorage }).promise;
        const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
        const u = URL.createObjectURL(blob); urls.push(u);
        const im = el('img', { src: u }); area.append(im);
        page.cleanup();
      }
      await Promise.all([...area.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
      this.ctx.busy(null);
      await window.fen.print();
    } finally {
      this.ctx.busy(null);
      area.textContent = '';
      urls.forEach((u) => URL.revokeObjectURL(u));
    }
  }

  slideshow() {
    const pdf = this.pdf;
    new Slideshow({
      count: pdf.numPages, start: this.viewer.currentPageNumber - 1, auto: false,
      render: async (i) => {
        const page = await pdf.getPage(i + 1);
        const vp0 = page.getViewport({ scale: 1, rotation: this.viewer.pagesRotation });
        const k = Math.min(screen.width / vp0.width, screen.height / vp0.height) * devicePixelRatio;
        const vp = page.getViewport({ scale: k, rotation: this.viewer.pagesRotation });
        const c = el('canvas'); c.width = vp.width; c.height = vp.height;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: g, viewport: vp }).promise;
        return c;
      },
      onEnd: (i) => { this.viewer.currentPageNumber = i + 1; },
    });
  }

  async info() {
    const m = await this.pdf.getMetadata().catch(() => ({}));
    const i = (m && m.info) || {};
    const p1 = await this.pdf.getPage(1);
    const [x0, y0, x1, y1] = p1.view;
    const wIn = (x1 - x0) / 72, hIn = (y1 - y0) / 72;
    const named = [['Letter', 8.5, 11], ['Legal', 8.5, 14], ['A4', 8.27, 11.69], ['A3', 11.69, 16.54], ['A5', 5.83, 8.27], ['Tabloid', 11, 17]]
      .find(([, a, b]) => (Math.abs(a - wIn) < 0.06 && Math.abs(b - hIn) < 0.06) || (Math.abs(b - wIn) < 0.06 && Math.abs(a - hIn) < 0.06));
    const date = (d) => { const x = pdfjsLib.PDFDateString.toDateObject(d); return x ? x.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null; };
    return [['Document', [['Title', i.Title || null], ['Author', i.Author || null], ['Subject', i.Subject || null], ['Keywords', i.Keywords || null],
      ['Pages', this.pdf.numPages], ['Page size', `${named ? named[0] + ', ' : ''}${wIn.toFixed(2)} × ${hIn.toFixed(2)} in (${Math.round(wIn * 25.4)} × ${Math.round(hIn * 25.4)} mm)`],
      ['Created', i.CreationDate ? date(i.CreationDate) : null], ['Changed', i.ModDate ? date(i.ModDate) : null],
      ['Made with', [i.Creator, i.Producer].filter(Boolean).join(' · ') || null], ['PDF version', i.PDFFormatVersion || null],
      ['Form', i.IsAcroFormPresent ? 'Has fields you can fill in' : null], ['Locked', this.pdf.isPureXfa ? 'XFA form (not supported)' : null]]]];
  }

  async command(cmd) {
    const v = this.viewer;
    if (!this.pdf) return;
    switch (cmd) {
      case 'zoomIn': v.currentScale = Math.min(10, v.currentScale * 1.2); return;
      case 'zoomOut': v.currentScale = Math.max(0.1, v.currentScale / 1.2); return;
      case 'zoomActual': v.currentScaleValue = 'page-actual'; return;
      case 'zoomFit': v.currentScaleValue = 'page-fit'; return;
      case 'zoomMenu': {
        const r = $('#b-zoom').getBoundingClientRect();
        const val = await menu(r.left, r.bottom + 4, [{ label: 'Automatic', value: 'auto' }, { label: 'Fit Page', value: 'page-fit' }, { label: 'Fit Width', value: 'page-width' }, { label: 'Actual Size', value: 'page-actual' }, '-',
          ...[0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map((z) => ({ label: `${z * 100}%`, value: String(z) }))]);
        if (val) v.currentScaleValue = val;
        return;
      }
      case 'rotateLeft': v.pagesRotation = (v.pagesRotation + 270) % 360; this.buildThumbs(); return;
      case 'rotateRight': v.pagesRotation = (v.pagesRotation + 90) % 360; this.buildThumbs(); return;
      case 'sidebar': { const s = $('#side'); s.classList.toggle('hidden'); this.sideAuto = !s.classList.contains('hidden'); $('#b-side').classList.toggle('on', this.sideAuto); this.updatePage(); return; }
      case 'spread': v.spreadMode = v.spreadMode === 0 ? 1 : 0; return;
      case 'find': $('#find').focus(); $('#find').select(); return;
      case 'findNext': return this.find('again', false);
      case 'findPrev': return this.find('again', true);
      case 'gotoPage': $('#page').focus(); $('#page').select(); return;
      case 'prev': v.previousPage(); return;
      case 'next': v.nextPage(); return;
      case 'first': v.currentPageNumber = 1; return;
      case 'last': v.currentPageNumber = this.pdf.numPages; return;
      case 'save': return this.save();
      case 'export': return this.export();
      case 'print': return this.print();
      case 'slideshow': return this.slideshow();
      case 'tool:select': return this.setTool('select');
      case 'tool:highlight': return this.setTool('highlight');
      case 'tool:text': return this.setTool('text');
      case 'tool:draw': return this.setTool('draw');
      case 'sign': return this.sign();
      case 'certify': return this.certify();
    }
  }
  key(e) {
    if (e.ctrlKey || e.altKey) return false;
    const wide = this.wrap.scrollWidth > this.wrap.clientWidth + 2;
    if (!wide && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { this.command(e.key === 'ArrowLeft' ? 'prev' : 'next'); return true; }
    if (e.key === 'Home' || e.key === 'End') { this.command(e.key === 'Home' ? 'first' : 'last'); return true; }
    return false;
  }
  relayout() {}
}

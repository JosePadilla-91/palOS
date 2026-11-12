// Fonts: a type specimen you can type into, every size at a glance, the character set, Install.
import { $, el } from './util.js';

const PANGRAM = 'The quick brown fox jumps over the lazy dog.';
let seq = 0;

export class FontView {
  constructor(ctx) { this.ctx = ctx; this.stage = $('#font-stage'); }

  async open(doc) {
    this.doc = doc;
    const bytes = await window.fen.read(doc.path);
    const family = `FenPreview${++seq}`;
    let face;
    try {
      face = new FontFace(family, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      await face.load();
    } catch { throw new Error('The font file is damaged or in a format Fen can’t read.'); }
    if (this.face) document.fonts.delete(this.face);
    document.fonts.add(face);
    this.face = face;
    this.meta = parseNames(bytes);
    const f = `'${family}', var(--font)`;
    const name = this.meta.full || this.meta.family || doc.name.replace(/\.[^.]+$/, '');
    const s = this.stage;
    s.textContent = '';
    s.append(
      el('div', { class: 'fam', style: { fontFamily: f }, text: name }),
      el('div', { class: 'sub', text: [this.meta.family, this.meta.style, this.meta.version].filter(Boolean).join(' · ') }),
      el('div', { class: 'sample', contenteditable: 'true', spellcheck: 'false', style: { fontFamily: f, fontSize: '34px' }, text: PANGRAM }),
      ...[12, 18, 24, 36, 48, 72].map((pt) => el('div', { class: 'row' }, el('span', { class: 'pt', text: String(pt) }), el('span', { class: 'txt', style: { fontFamily: f, fontSize: pt + 'px' }, text: PANGRAM }))),
      el('div', { class: 'glyphs', style: { fontFamily: f } },
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 ',
        '.,:;!?¡¿‘’“”«»()[]{}<>/\\|@#$%&*+−×÷=_~^`', ' ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØŒÙÚÛÜÝ àáâãäåæçèéêëìíîïñòóôõöøœùúûüýÿß €£¥¢©®™°±§¶•…–—'),
    );
    await this.updateInstall();
  }

  async updateInstall() {
    const installed = await window.fen.fontInstalled(this.doc.path).catch(() => false);
    const b = $('#b-install');
    b.textContent = installed ? 'Installed' : 'Install Font';
    b.disabled = installed;
  }

  async info() {
    const m = this.meta || {};
    return [['Font', [['Family', m.family], ['Style', m.style], ['Full name', m.full], ['Version', m.version], ['Designer', m.designer], ['Maker', m.manufacturer], ['Copyright', m.copyright], ['License', m.license]]]];
  }

  async command(cmd) {
    if (cmd === 'installFont') {
      try { await window.fen.installFont(this.doc.path); } catch (err) { await window.fen.error('The font couldn’t be installed.', err.message); }
      return this.updateInstall();
    }
  }
  key() { return false; }
  close() { if (this.face) { document.fonts.delete(this.face); this.face = null; } }
}

/** Read the 'name' table of a TrueType/OpenType font (the first font of a collection). WOFF/WOFF2 are compressed: no names. */
function parseNames(bytes) {
  try {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let off = 0;
    const tag = String.fromCharCode(...bytes.slice(0, 4));
    if (tag === 'ttcf') off = dv.getUint32(12);
    else if (tag === 'wOFF' || tag === 'wOF2') return {};
    const n = dv.getUint16(off + 4);
    let nameOff = -1;
    for (let i = 0; i < n; i++) {
      const r = off + 12 + i * 16;
      if (String.fromCharCode(...bytes.slice(r, r + 4)) === 'name') { nameOff = dv.getUint32(r + 8); break; }
    }
    if (nameOff < 0) return {};
    const count = dv.getUint16(nameOff + 2), strOff = nameOff + dv.getUint16(nameOff + 4);
    const out = {}; const prio = {};
    const want = { 0: 'copyright', 1: 'family', 2: 'style', 4: 'full', 5: 'version', 8: 'manufacturer', 9: 'designer', 13: 'license', 16: 'family16', 17: 'style16' };
    for (let i = 0; i < count; i++) {
      const r = nameOff + 6 + i * 12;
      const platform = dv.getUint16(r), enc = dv.getUint16(r + 2), lang = dv.getUint16(r + 4), id = dv.getUint16(r + 6), len = dv.getUint16(r + 8), o = dv.getUint16(r + 10);
      const key = want[id]; if (!key) continue;
      const raw = bytes.slice(strOff + o, strOff + o + len);
      let s;
      if (platform === 3 || platform === 0) { s = ''; for (let k = 0; k + 1 < raw.length; k += 2) s += String.fromCharCode((raw[k] << 8) | raw[k + 1]); }
      else if (platform === 1 && enc === 0) s = String.fromCharCode(...raw);
      else continue;
      const p = (platform === 3 && lang === 0x409) ? 3 : platform === 3 ? 2 : 1;
      if (!prio[key] || p > prio[key]) { out[key] = s.trim(); prio[key] = p; }
    }
    if (out.family16) out.family = out.family16;
    if (out.style16) out.style = out.style16;
    if (out.license && out.license.length > 300) out.license = out.license.slice(0, 300) + '…';
    if (out.version) out.version = out.version.replace(/^Version\s*/i, 'Version ');
    return out;
  } catch { return {}; }
}

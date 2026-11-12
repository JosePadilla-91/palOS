'use strict';
/* Text subtitle renderer. Everything arrives as WebVTT (ffmpeg converts SRT/ASS/embedded tracks),
   and we draw it ourselves so timing follows Vid-View's own clock across live-converted streams. */
C.Subtitles = class {
  constructor(el) {
    this.el = el;
    this.cues = [];
    this.delay = 0;
    this.lastKey = '';
    this.idx = 0;
  }

  static parseTime(s) {
    const p = s.trim().split(':').map(Number);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  }

  static clean(text) {
    let t = C.esc(text.replace(/\{\\[^}]*\}/g, '').replace(/\\N/g, '\n'));
    t = t.replace(/&lt;(\/?)(i|b|u)&gt;/gi, '<$1$2>')
      .replace(/&lt;\/?(c|v|lang|ruby|rt)[^&]*&gt;/gi, '')
      .replace(/&lt;font[^&]*&gt;|&lt;\/font&gt;/gi, '')
      .replace(/&lt;\d\d:[^&]*&gt;/g, '');
    return t.replace(/\n/g, '<br>');
  }

  load(vtt) {
    const cues = [];
    const blocks = String(vtt).replace(/\r/g, '').split(/\n{2,}/);
    for (const b of blocks) {
      const lines = b.split('\n');
      const i = lines.findIndex((l) => l.includes('-->'));
      if (i < 0) continue;
      const [a, rest] = lines[i].split('-->');
      const start = C.Subtitles.parseTime(a);
      const end = C.Subtitles.parseTime(rest.trim().split(/\s+/)[0]);
      const text = lines.slice(i + 1).join('\n').trim();
      if (text && Number.isFinite(start) && Number.isFinite(end)) cues.push({ start, end, html: C.Subtitles.clean(text) });
    }
    cues.sort((x, y) => x.start - y.start);
    this.cues = cues;
    this.lastKey = '';
    this.render(0);
    return cues.length;
  }

  clear() {
    this.cues = [];
    this.el.innerHTML = '';
    this.lastKey = '';
  }

  render(time) {
    if (!this.cues.length) { if (this.lastKey) { this.el.innerHTML = ''; this.lastKey = ''; } return; }
    const t = time - this.delay;
    const active = [];
    // cues are sorted; scan a window around the last position
    for (let i = 0; i < this.cues.length; i++) {
      const c = this.cues[i];
      if (c.start > t) break;
      if (c.end > t) active.push(c);
    }
    const key = active.map((c) => c.start).join('|');
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.el.innerHTML = active.map((c) => `<div class="cue"><span>${c.html}</span></div>`).join('');
  }
};

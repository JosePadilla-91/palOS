// Full-screen slideshow: photos cross-fade every few seconds; PDFs show one page per screen.
import { $ } from './util.js';
import { ICON } from './icons.js';

export class Slideshow {
  /** opts: { count, start, render(i) -> Promise<Element>, onEnd(i), auto = true, interval = 4500 } */
  constructor(opts) {
    this.o = { auto: true, interval: 4500, ...opts };
    this.i = Math.max(0, Math.min(opts.count - 1, opts.start || 0));
    this.root = $('#show');
    this.slides = [$('#show-a'), $('#show-b')];
    this.front = 0; this.timer = null; this.ctlTimer = null; this.playing = this.o.auto && opts.count > 1; this.token = 0;
    this.slides.forEach((s) => { s.classList.remove('on'); s.textContent = ''; });
    this.root.classList.remove('hidden');
    window.fen.fullscreen(true);
    this.onKey = (e) => this.key(e);
    this.onMove = () => this.showControls();
    document.addEventListener('keydown', this.onKey, true);
    this.root.addEventListener('mousemove', this.onMove);
    $('#s-prev').onclick = () => this.step(-1);
    $('#s-next').onclick = () => this.step(1);
    $('#s-play').onclick = () => this.toggle();
    $('#s-exit').onclick = () => this.end();
    this.root.onclick = (e) => { if (e.target === this.root || e.target.closest('.slide')) this.step(1); };
    this.updatePlay();
    this.show(this.i);
    this.showControls();
  }
  async show(i) {
    const t = ++this.token;
    let node;
    try { node = await this.o.render(i); } catch { node = document.createElement('div'); }
    if (t !== this.token) return;
    const back = 1 - this.front;
    this.slides[back].textContent = '';
    this.slides[back].append(node);
    this.slides[back].classList.add('on');
    this.slides[this.front].classList.remove('on');
    this.front = back;
    this.i = i;
    this.schedule();
  }
  schedule() {
    clearTimeout(this.timer);
    if (this.playing) this.timer = setTimeout(() => this.step(1), this.o.interval);
  }
  step(d) {
    const n = this.o.count;
    if (!n) return;
    if (!this.playing && ((d > 0 && this.i === n - 1) || (d < 0 && this.i === 0))) return;
    this.show((this.i + d + n) % n);
  }
  toggle() { this.playing = !this.playing; this.updatePlay(); this.schedule(); }
  updatePlay() { $('#s-play').innerHTML = this.playing ? ICON.pause : ICON.playtri; $('#s-play').title = this.playing ? 'Pause' : 'Play'; }
  showControls() {
    this.root.classList.add('ctl');
    clearTimeout(this.ctlTimer);
    this.ctlTimer = setTimeout(() => this.root.classList.remove('ctl'), 1800);
  }
  key(e) {
    const k = e.key;
    if (k === 'Escape') this.end();
    else if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === 'Enter') this.step(1);
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') this.step(-1);
    else if (k === ' ') this.toggle();
    else if (k === 'Home') this.show(0);
    else if (k === 'End') this.show(this.o.count - 1);
    else return;
    e.preventDefault(); e.stopPropagation();
  }
  end() {
    clearTimeout(this.timer); clearTimeout(this.ctlTimer); this.token++;
    document.removeEventListener('keydown', this.onKey, true);
    this.root.removeEventListener('mousemove', this.onMove);
    this.root.classList.add('hidden');
    this.slides.forEach((s) => { s.textContent = ''; s.classList.remove('on'); });
    window.fen.fullscreen(false);
    if (this.o.onEnd) this.o.onEnd(this.i);
  }
}

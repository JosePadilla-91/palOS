'use strict';
/* Playback engine. Wraps the <video> element and hides the difference between:
     direct     the file is served as-is (byte ranges); Chromium decodes it
     remux      ffmpeg repackages to fragmented MP4 (picture copied, sound → AAC if needed)
     transcode  ffmpeg converts the picture to H.264 live (any codec, DVDs, burned-in subtitles)
   Live streams are fed through Media Source Extensions with timestampOffset set to the stream's
   start, so the element's clock *is* the film's clock: seeking inside what's buffered is instant
   and frame-exact, and seeking elsewhere restarts ffmpeg at the nearest keyframe. If MSE isn't
   available for a codec, it falls back to plain progressive streaming. */
C.Engine = class extends EventTarget {
  static caps() {
    const v = document.createElement('video');
    const ok = (t) => v.canPlayType(t) !== '';
    return {
      h264: ok('video/mp4; codecs="avc1.640028"'),
      hevc: ok('video/mp4; codecs="hvc1.1.6.L120.90"'),
      vp8: ok('video/webm; codecs="vp8"'),
      vp9: ok('video/webm; codecs="vp9"'),
      av1: ok('video/mp4; codecs="av01.0.08M.08"'),
      theora: ok('video/ogg; codecs="theora"'),
      aac: ok('audio/mp4; codecs="mp4a.40.2"'),
      mp3: ok('audio/mpeg'),
      opus: ok('audio/ogg; codecs="opus"'),
      vorbis: ok('audio/ogg; codecs="vorbis"'),
      flac: ok('audio/flac'),
      mkv: ok('video/x-matroska') || ok('video/x-matroska; codecs="avc1.640028"') || ok('video/webm; codecs="avc1.640028"'),
    };
  }

  constructor(video) {
    super();
    this.v = video;
    this.base = '';
    this.info = null;
    this.mode = null;
    this.baseMode = null;
    this.offset = 0; // progressive fallback only: film time of the stream's t=0
    this.audioIdx = null;
    this.burn = null;
    this.seq = 0;
    this.pendingT = null;
    this.wantPlay = true;
    this.retries = 0;
    this.rate = 1;
    this.session = null; // active MSE session
    this.noMSE = false;
    const v = video;
    v.addEventListener('error', () => this.onError());
    v.addEventListener('ended', () => this.onEnded());
    v.addEventListener('waiting', () => this.emit('buffering', true));
    v.addEventListener('playing', () => { this.emit('buffering', false); this.emit('state'); });
    v.addEventListener('pause', () => this.emit('state'));
    v.addEventListener('play', () => this.emit('state'));
    v.addEventListener('loadedmetadata', () => this.onMeta());
    const settled = () => {
      if (!this.info) return;
      clearTimeout(this.watchdog);
      if (this.glidingTo != null) return;
      if (this.mode !== 'direct' && !this.session && this.targetT != null && this.targetT - this.offset > 0.25) {
        this.glide(this.targetT - this.offset);
        this.targetT = null;
        return;
      }
      this.targetT = null;
      if (this.pendingT != null && !v.seeking) {
        this.pendingT = null;
        this.retries = Math.max(0, this.retries - 1);
        this.emit('loading', false);
      }
    };
    v.addEventListener('loadeddata', settled);
    v.addEventListener('seeked', settled);
    v.addEventListener('canplay', settled);
  }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  get time() {
    if (this.pendingT != null) return this.pendingT;
    if (this.mode === 'direct' || this.session) return this.v.currentTime;
    return this.offset + this.v.currentTime;
  }
  get duration() {
    if (this.info && this.info.duration) return this.info.duration;
    return Number.isFinite(this.v.duration) ? this.v.duration : 0;
  }
  get paused() { return !this.wantPlay; }
  get bufferedEnd() {
    const b = this.v.buffered;
    if (!b.length) return 0;
    const t = this.v.currentTime;
    let end = b.end(b.length - 1);
    for (let i = 0; i < b.length; i++) if (t >= b.start(i) - 0.5 && t <= b.end(i)) end = b.end(i);
    return (this.mode === 'direct' || this.session ? 0 : this.offset) + end;
  }
  get live() { return this.mode !== 'direct'; }

  effectiveMode() {
    if (this.burn) return 'transcode';
    const def = this.info.audio[0] ? this.info.audio[0].index : null;
    if (this.baseMode === 'direct' && this.audioIdx != null && this.audioIdx !== def) {
      return this.info.canRemux ? 'remux' : 'transcode';
    }
    return this.baseMode;
  }

  async load(info, { start = 0, audio = null, play = true } = {}) {
    this.info = info;
    this.baseMode = info.plan.mode;
    this.audioIdx = audio != null ? audio : (info.audio[0] ? info.audio[0].index : null);
    this.burn = null;
    this.retries = 0;
    this.wantPlay = play;
    this.metaSeen = false;
    this.currentUrl = null;
    this.mode = this.effectiveMode();
    this.emit('modechange', this.mode);
    await this.startAt(start);
  }

  mseType() {
    const c = this.info.mse && this.info.mse[this.mode];
    if (!c || this.noMSE || !window.MediaSource) return null;
    const type = `${this.info.hasVideo ? 'video' : 'audio'}/mp4; codecs="${c}"`;
    return MediaSource.isTypeSupported(type) ? type : null;
  }

  async startAt(t) {
    const seq = ++this.seq;
    const info = this.info;
    if (!info) return;
    this.pendingT = t;
    this.targetT = null;
    this.glidingTo = null;
    this.emit('loading', true);
    clearTimeout(this.watchdog);
    this.endSession();
    if (this.mode === 'direct') {
      const url = `${this.base}/direct/${info.id}`;
      if (this.currentUrl !== url) {
        this.currentUrl = url;
        this.offset = 0;
        this.v.src = url;
        try { await C.once(this.v, 'loadedmetadata', 30000); } catch { /* error handler takes over */ }
        if (seq !== this.seq) return;
      }
      if (Math.abs(this.v.currentTime - t) > 0.05) this.v.currentTime = t;
      else { this.pendingT = null; this.emit('loading', false); }
      if (this.wantPlay) this.v.play().catch(() => {});
      return;
    }
    let sp = t;
    try { sp = await window.vidview.seekPoint(info.id, t, this.mode); } catch { /* keep t */ }
    if (seq !== this.seq || !this.info) return;
    const q = new URLSearchParams({ mode: this.mode, t: sp.toFixed(3), a: this.audioIdx ?? '', burn: this.burn ?? '', n: String(seq) });
    const url = `${this.base}/stream/${info.id}?${q}`;
    this.currentUrl = url;
    const type = this.mseType();
    if (type) {
      this.startSession(url, type, sp, t, seq);
    } else {
      this.offset = sp;
      this.targetT = t;
      this.v.src = url;
      if (this.wantPlay) this.v.play().catch(() => {});
    }
    this.watchdog = setTimeout(() => { if (seq === this.seq && this.pendingT != null) this.onError(true); }, 45000);
  }

  // ── Media Source session ─────────────────────────────────
  startSession(url, type, streamStart, target, seq) {
    const ms = new MediaSource();
    const abort = new AbortController();
    const s = { ms, abort, objUrl: URL.createObjectURL(ms), streamStart, done: false, seq };
    this.session = s;
    this.v.src = s.objUrl;
    ms.addEventListener('sourceopen', async () => {
      if (this.session !== s) return;
      let sb;
      try {
        if (this.info.duration) ms.duration = this.info.duration;
        sb = ms.addSourceBuffer(type);
        sb.mode = 'segments';
        sb.timestampOffset = streamStart;
      } catch (e) {
        console.warn('[engine] MSE unavailable, using progressive stream', e);
        this.noMSE = true;
        this.startAt(target);
        return;
      }
      s.sb = sb;
      this.v.currentTime = target;
      if (this.wantPlay) this.v.play().catch(() => {});
      this.pump(s, url).catch((e) => {
        if (this.session === s && e.name !== 'AbortError') {
          console.warn('[engine] stream pump failed', e);
          this.onError();
        }
      });
    }, { once: true });
  }

  async pump(s, url) {
    const res = await fetch(url, { signal: s.abort.signal });
    if (!res.ok || !res.body) throw new Error(`stream HTTP ${res.status}`);
    const reader = res.body.getReader();
    const v = this.v;
    const waitIdle = () => (s.sb.updating ? C.once(s.sb, 'updateend') : Promise.resolve());
    let pending = [];
    let pendingBytes = 0;
    const flush = async () => {
      if (!pendingBytes) return;
      const buf = new Uint8Array(pendingBytes);
      let o = 0;
      for (const p of pending) { buf.set(p, o); o += p.length; }
      pending = []; pendingBytes = 0;
      for (let attempt = 0; ; attempt++) {
        if (this.session !== s) return;
        await waitIdle();
        try {
          s.sb.appendBuffer(buf);
          await C.once(s.sb, 'updateend');
          return;
        } catch (e) {
          if (e.name !== 'QuotaExceededError' || attempt > 20) throw e;
          // evict what's well behind the playhead, then try again
          const behind = v.currentTime - 20;
          if (s.sb.buffered.length && s.sb.buffered.start(0) < behind) {
            s.sb.remove(0, behind);
            await C.once(s.sb, 'updateend');
          } else await C.sleep(500);
        }
      }
    };
    for (;;) {
      if (this.session !== s) { reader.cancel().catch(() => {}); return; }
      // back-pressure: don't race more than ~2 minutes ahead of the playhead
      const b = v.buffered;
      const ahead = b.length ? b.end(b.length - 1) - v.currentTime : 0;
      if (ahead > 120 && !v.seeking) { await flush(); await C.sleep(400); continue; }
      const { value, done } = await reader.read();
      if (done) break;
      pending.push(value);
      pendingBytes += value.length;
      if (pendingBytes > 256 * 1024) await flush();
    }
    await flush();
    if (this.session !== s) return;
    s.done = true;
    await waitIdle();
    if (s.ms.readyState === 'open') { try { s.ms.endOfStream(); } catch { /* */ } }
  }

  endSession() {
    const s = this.session;
    if (!s) return;
    this.session = null;
    s.abort.abort();
    setTimeout(() => URL.revokeObjectURL(s.objUrl), 1000);
  }

  /** Progressive fallback: copy-mode streams begin on a keyframe; fast-forward silently to the exact frame. */
  glide(rel) {
    const v = this.v;
    const seq = this.seq;
    const wasMuted = v.muted;
    this.glidingTo = rel;
    v.muted = true;
    v.play().catch(() => {});
    const finish = () => {
      this.glidingTo = null;
      if (seq !== this.seq) return;
      v.muted = wasMuted;
      v.playbackRate = this.rate || 1;
      this.pendingT = null;
      if (!this.wantPlay) v.pause();
      this.emit('loading', false);
    };
    const step = (_now, meta) => {
      if (seq !== this.seq) { v.muted = wasMuted; this.glidingTo = null; return; }
      const left = rel - (meta ? meta.mediaTime : v.currentTime);
      if (left <= 0.02) { finish(); return; }
      v.playbackRate = C.clamp(left * 3, 1, 16);
      v.requestVideoFrameCallback(step);
    };
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(step);
    else finish();
  }

  seek(t, { delay = 140 } = {}) {
    if (!this.info) return;
    const d = this.duration;
    t = C.clamp(t, 0, d ? Math.max(0, d - 0.2) : t);
    const v = this.v;
    if (this.mode === 'direct') {
      v.currentTime = t;
      this.emit('seekpreview', t);
      return;
    }
    const s = this.session;
    if (s && s.sb && this.pendingT == null) {
      // already buffered, or just ahead of a stream that's still arriving: let the element handle it
      const b = v.buffered;
      for (let i = 0; i < b.length; i++) {
        const nearAhead = !s.done && t >= b.start(i) && t <= b.end(i) + 12 && i === b.length - 1;
        if ((t >= b.start(i) && t <= b.end(i) - 0.15) || nearAhead) {
          clearTimeout(this.seekTimer);
          v.currentTime = t;
          this.emit('seekpreview', t);
          return;
        }
      }
    } else if (!s && this.pendingT == null) {
      const rel = t - this.offset;
      const b = v.buffered;
      for (let i = 0; i < b.length; i++) {
        if (rel >= b.start(i) && rel <= b.end(i) - 0.5) {
          clearTimeout(this.seekTimer);
          v.currentTime = rel;
          this.emit('seekpreview', t);
          return;
        }
      }
    }
    this.pendingT = t;
    this.emit('seekpreview', t);
    this.emit('loading', true);
    clearTimeout(this.seekTimer);
    this.seekTimer = setTimeout(() => this.startAt(t), delay);
  }

  play() { this.wantPlay = true; this.v.play().catch(() => {}); this.emit('state'); }
  pause() { this.wantPlay = false; this.v.pause(); this.emit('state'); }
  toggle() { if (this.wantPlay) this.pause(); else this.play(); }

  restart() {
    const t = this.time;
    this.mode = this.effectiveMode();
    this.currentUrl = null;
    this.emit('modechange', this.mode);
    this.startAt(t);
  }
  setAudio(idx) {
    if (!this.info || idx === this.audioIdx) return;
    this.audioIdx = idx;
    this.restart();
  }
  setBurn(key) {
    if (!this.info || key === this.burn) return;
    this.burn = key;
    this.restart();
  }

  frameStep(dir) {
    if (!this.info || this.pendingT != null) return;
    this.pause();
    const fps = this.info.fps || 25;
    const nt = this.v.currentTime + dir / fps;
    if (nt >= 0) this.v.currentTime = nt;
  }

  onMeta() {
    if (!this.info) return;
    if (this.mode === 'direct' && this.info.hasVideo && this.v.videoWidth === 0) {
      this.onError();
      return;
    }
    if (!this.metaSeen) {
      this.metaSeen = true;
      this.emit('ready');
    }
  }

  onError(timeout = false) {
    if (!this.info || !this.currentUrl) return;
    const t = this.time;
    const err = this.v.error;
    console.warn('[engine] playback error', this.mode, err && err.code, err && err.message, timeout ? '(timeout)' : '');
    if (this.mode === 'direct') {
      this.baseMode = this.info.canRemux ? 'remux' : 'transcode';
      this.emit('notice', 'Switching to live conversion for this file');
    } else if (this.mode === 'remux' && !this.burn) {
      this.baseMode = 'transcode';
    } else if (this.burn) {
      this.burn = null;
      this.emit('notice', 'Those subtitles couldn’t be burned in');
    } else if (this.session && !this.noMSE && this.retries >= 1) {
      this.noMSE = true;
    } else if (this.retries < 2) {
      this.retries++;
    } else {
      this.emit('fatal', (err && err.message) || 'The projector jammed: this film can’t be played.');
      return;
    }
    this.restart.call(this);
  }

  onEnded() {
    if (!this.info) return;
    if (this.mode !== 'direct' && this.duration && this.time < this.duration - 6 && this.retries < 3) {
      this.retries++;
      this.startAt(this.time);
      return;
    }
    this.wantPlay = false;
    this.emit('ended');
  }

  unload() {
    this.info = null;
    this.seq++;
    clearTimeout(this.seekTimer);
    clearTimeout(this.watchdog);
    this.endSession();
    this.currentUrl = null;
    this.pendingT = null;
    this.glidingTo = null;
    this.v.pause();
    this.v.removeAttribute('src');
    this.v.load();
  }
};

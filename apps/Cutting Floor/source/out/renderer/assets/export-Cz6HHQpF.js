import { L as Limiter, a as LoudnessMeter, d as dbToGain, S as SAMPLE_RATE, e as evaluateAudio, b as decodeAudioArgs, r as readVarispeed, v as voiceChain, C as Chain, t as trackChain, m as masterChain, s as sourceRange, g as getSeq, c as audioOnlyArgs, f as Compositor, p as presetInfo, h as encoderArgs, i as evalNum, j as evaluateVideo, k as mediaUses, l as decodeVideoArgs, n as fitSize, o as isAnim } from "./chains-CiuWKdKz.js";
const CHUNK = 48e3;
function measure(fs2, file, sr) {
  const m = new LoudnessMeter(sr);
  const fd = fs2.openSync(file, "r");
  const buf = Buffer.alloc(CHUNK * 8);
  const L = new Float32Array(CHUNK);
  const R = new Float32Array(CHUNK);
  try {
    for (; ; ) {
      const got = fs2.readSync(fd, buf, 0, buf.length, null);
      const n = Math.floor(got / 8);
      if (!n) break;
      const f = new Float32Array(buf.buffer, buf.byteOffset, n * 2);
      for (let i = 0; i < n; i++) {
        L[i] = f[2 * i];
        R[i] = f[2 * i + 1];
      }
      m.push(L, R, n);
    }
  } finally {
    fs2.closeSync(fd);
  }
  const s = m.stats();
  return { integrated: s.integrated, truePeak: s.truePeak };
}
async function normalizeLoudness(fs2, file, sr, target, truePeak, cancelled2 = () => false) {
  const before = measure(fs2, file, sr);
  if (!Number.isFinite(before.integrated)) return { measured: before.integrated, gain: 0, final: before.integrated };
  const gainDb = target - before.integrated;
  const g = Math.pow(10, gainDb / 20);
  const lim = new Limiter(sr, true, 5);
  const la = lim.latency;
  const params = { ceiling: truePeak, input: 0, release: 80 };
  const tmp = file + ".norm";
  const inFd = fs2.openSync(file, "r");
  const outFd = fs2.openSync(tmp, "w");
  const buf = Buffer.alloc(CHUNK * 8);
  const L = new Float32Array(CHUNK + la);
  const R = new Float32Array(CHUNK + la);
  let skip = la;
  const emit = (n) => {
    const s = Math.min(skip, n);
    skip -= s;
    const m = n - s;
    if (m <= 0) return;
    const out = new Float32Array(m * 2);
    for (let i = 0; i < m; i++) {
      out[2 * i] = L[s + i];
      out[2 * i + 1] = R[s + i];
    }
    fs2.writeSync(outFd, Buffer.from(out.buffer));
  };
  try {
    for (; ; ) {
      if (cancelled2()) throw new Error("cancelled");
      const got = fs2.readSync(inFd, buf, 0, buf.length, null);
      const n = Math.floor(got / 8);
      if (!n) break;
      const f = new Float32Array(buf.buffer, buf.byteOffset, n * 2);
      for (let i = 0; i < n; i++) {
        L[i] = f[2 * i] * g;
        R[i] = f[2 * i + 1] * g;
      }
      for (let o = 0; o < n; o += 128) {
        const k = Math.min(128, n - o);
        lim.process(L.subarray(o, o + k), R.subarray(o, o + k), k, params);
      }
      emit(n);
      await new Promise((r) => setTimeout(r, 0));
    }
    L.fill(0, 0, la);
    R.fill(0, 0, la);
    lim.process(L.subarray(0, la), R.subarray(0, la), la, params);
    emit(la);
  } finally {
    fs2.closeSync(inFd);
    fs2.closeSync(outFd);
  }
  fs2.renameSync(tmp, file);
  const after = measure(fs2, file, sr);
  return { measured: before.integrated, gain: gainDb, final: after.integrated };
}
class PipeReader {
  constructor(proc, highWater) {
    this.proc = proc;
    this.highWater = highWater;
    proc.stdout.on("data", (d) => {
      this.chunks.push(d);
      this.have += d.length;
      if (this.have > this.highWater) proc.stdout.pause();
      this.wake();
    });
    proc.stderr.on("data", (d) => this.stderr += d.toString());
    proc.on("close", (code) => {
      this.code = code;
      this.ended = true;
      this.wake();
    });
    proc.on("error", (e) => {
      this.stderr += String(e);
      this.ended = true;
      this.wake();
    });
  }
  proc;
  highWater;
  chunks = [];
  have = 0;
  waiting = null;
  ended = false;
  stderr = "";
  code = null;
  wake() {
    const w = this.waiting;
    this.waiting = null;
    w?.();
  }
  /** Read exactly n bytes, or fewer if the stream ended. */
  async read(n) {
    while (this.have < n && !this.ended) {
      this.proc.stdout.resume();
      await new Promise((r) => this.waiting = r);
    }
    const take = Math.min(n, this.have);
    const out = Buffer.allocUnsafe(take);
    let off = 0;
    while (off < take) {
      const c = this.chunks[0];
      const k = Math.min(c.length, take - off);
      c.copy(out, off, 0, k);
      off += k;
      if (k === c.length) this.chunks.shift();
      else this.chunks[0] = c.subarray(k);
    }
    this.have -= take;
    if (this.have <= this.highWater) this.proc.stdout.resume();
    return out;
  }
  kill() {
    if (!this.ended) this.proc.kill("SIGKILL");
  }
}
class VideoStream {
  constructor(spawn, args, s0, speed, fps, w, h, bits) {
    this.args = args;
    this.s0 = s0;
    this.speed = speed;
    this.fps = fps;
    this.w = w;
    this.h = h;
    this.bits = bits;
    this.frameBytes = w * h * 4 * (bits === 16 ? 2 : 1);
    this.reader = new PipeReader(spawn(args), this.frameBytes * 3);
  }
  args;
  s0;
  speed;
  fps;
  w;
  h;
  bits;
  reader;
  idx = -1;
  last = null;
  frameBytes;
  get decoded() {
    return this.idx + 1;
  }
  get error() {
    return this.reader.code !== 0 && this.reader.ended ? this.reader.stderr.trim() : "";
  }
  /** null = no new pixels (keep the previous texture). */
  async frameAt(src) {
    const want = Math.max(0, Math.round((src - this.s0) * this.fps / this.speed));
    if (want <= this.idx) return this.idx === want && this.last ? null : null;
    let got = null;
    while (this.idx < want) {
      const b = await this.reader.read(this.frameBytes);
      if (b.length < this.frameBytes) break;
      this.idx++;
      got = b;
    }
    if (!got) return null;
    const view = this.bits === 16 ? new Uint16Array(got.buffer, got.byteOffset, got.byteLength / 2) : new Uint8Array(got.buffer, got.byteOffset, got.byteLength);
    this.last = view;
    return view;
  }
  /** True when a request for `src` can't be served by this stream (went backwards or far ahead). */
  needsRestart(src) {
    const want = Math.round((src - this.s0) * this.fps / this.speed);
    return want < this.idx - 1 || want > this.idx + this.fps * 5;
  }
  kill() {
    this.reader.kill();
  }
}
class WindowedStream {
  constructor(open, fps, window2, w, h) {
    this.open = open;
    this.fps = fps;
    this.window = window2;
    this.w = w;
    this.h = h;
  }
  open;
  fps;
  window;
  w;
  h;
  frames = [];
  t0 = 0;
  lastIdx = -1;
  count = 0;
  err = "";
  get decoded() {
    return this.count;
  }
  get error() {
    return this.err;
  }
  async frameAt(src) {
    let i = Math.round((src - this.t0) * this.fps);
    if (!this.frames.length || i < 0 || i >= this.frames.length) {
      const s0 = Math.max(0, src - (this.window - 1) / this.fps);
      const s = this.open(s0, this.window);
      this.frames = [];
      this.t0 = s0;
      this.lastIdx = -1;
      for (let k = 0; k < this.window; k++) {
        const f = await s.frameAt(s0 + k / this.fps);
        if (!f) break;
        this.frames.push(f);
      }
      this.err = s.error;
      s.kill();
      this.count += this.frames.length;
      if (!this.frames.length) return null;
      i = Math.max(0, Math.min(this.frames.length - 1, Math.round((src - this.t0) * this.fps)));
    }
    if (i === this.lastIdx) return null;
    this.lastIdx = i;
    return this.frames[i];
  }
  needsRestart() {
    return false;
  }
  kill() {
    this.frames = [];
  }
}
class AudioStream {
  // frames consumed
  constructor(spawn, args, s0, speed, rate) {
    this.s0 = s0;
    this.speed = speed;
    this.rate = rate;
    this.reader = new PipeReader(spawn(args), rate * 8 * 2);
  }
  s0;
  speed;
  rate;
  reader;
  pos = 0;
  offsetOf(src) {
    return Math.round((src - this.s0) * this.rate / this.speed);
  }
  needsRestart(src) {
    const j = this.offsetOf(src);
    return j < this.pos - 4 || j > this.pos + this.rate * 5;
  }
  async read(src, n) {
    const out = new Float32Array(n * 2);
    let j = this.offsetOf(src);
    let o = 0;
    if (j < 0) {
      const sil = Math.min(n, -j);
      o += sil;
      j += sil;
    }
    if (o >= n) return out;
    if (j > this.pos) {
      let skip = j - this.pos;
      while (skip > 0) {
        const b2 = await this.reader.read(Math.min(skip, 65536) * 8);
        if (b2.length === 0) break;
        skip -= b2.length / 8;
        this.pos += b2.length / 8;
      }
    }
    const want = n - o;
    const b = await this.reader.read(want * 8);
    const frames = Math.floor(b.length / 8);
    const f = new Float32Array(b.buffer, b.byteOffset, frames * 2);
    out.set(f, o * 2);
    this.pos += frames;
    return out;
  }
  kill() {
    this.reader.kill();
  }
}
const BLOCK = 1024;
function panCoeffs(pan) {
  if (pan === 0) return { ll: 1, rl: 0, lr: 0, rr: 1 };
  if (pan < 0) {
    const x2 = (pan + 1) * (Math.PI / 2);
    return { ll: 1, rl: Math.cos(x2), lr: 0, rr: Math.sin(x2) };
  }
  const x = pan * (Math.PI / 2);
  return { ll: Math.cos(x), rl: 0, lr: Math.sin(x), rr: 1 };
}
const MAX_PCM_SECONDS = 20 * 60;
async function mixAudio(o) {
  const { p, seq } = o;
  const total = Math.max(0, Math.round((o.end - o.start) * SAMPLE_RATE));
  const streams = /* @__PURE__ */ new Map();
  const pcms = /* @__PURE__ */ new Map();
  const voiceChains = /* @__PURE__ */ new Map();
  const busChains = /* @__PURE__ */ new Map();
  const master = new Chain(SAMPLE_RATE);
  const tracks = seq.tracks.filter((t) => t.kind === "audio");
  const masterGain = dbToGain(seq.masterVolume);
  const pcmFor = async (v) => {
    if (pcms.has(v.key)) return pcms.get(v.key);
    let r = null;
    if (o.readPcm) {
      const [s0, s1] = sourceRange(v.seq, v.clip);
      const dur = Math.min(MAX_PCM_SECONDS, s1 - s0);
      if (dur > 0) r = { pcm: await o.readPcm(v.media.path, s0, dur), start: s0 };
    }
    pcms.set(v.key, r);
    return r;
  };
  try {
    for (let off = 0; off < total; off += BLOCK) {
      if (o.cancelled?.()) throw new Error("cancelled");
      const n = Math.min(BLOCK, total - off);
      const t0 = o.start + off / SAMPLE_RATE;
      const t1 = o.start + (off + n) / SAMPLE_RATE;
      const at = (i) => o.start + (off + i) / SAMPLE_RATE;
      const all0 = evaluateAudio(p, seq, t0);
      const v0 = new Map(all0.map((v) => [v.key, v]));
      const v1 = new Map(evaluateAudio(p, seq, t1 - 1e-7).map((v) => [v.key, v]));
      const buses = /* @__PURE__ */ new Map();
      const bus = (id) => {
        let b = buses.get(id);
        if (!b) {
          b = [new Float32Array(n), new Float32Array(n)];
          buses.set(id, b);
        }
        return b;
      };
      const used = /* @__PURE__ */ new Set();
      for (const key of /* @__PURE__ */ new Set([...v0.keys(), ...v1.keys()])) {
        const present = (i) => evaluateAudio(p, seq, at(i)).some((v) => v.key === key);
        let a = 0;
        let b = n;
        if (!v0.has(key)) {
          let lo = 0;
          let hi = n - 1;
          while (lo < hi) {
            const mid = lo + hi >> 1;
            if (present(mid)) hi = mid;
            else lo = mid + 1;
          }
          a = lo;
        }
        if (!v1.has(key)) {
          let lo = a;
          let hi = n;
          while (lo < hi) {
            const mid = lo + hi >> 1;
            if (present(mid)) lo = mid + 1;
            else hi = mid;
          }
          b = lo;
        }
        if (b <= a) continue;
        const va = v0.get(key) ?? evaluateAudio(p, seq, at(a)).find((v) => v.key === key);
        if (!va) continue;
        const srcA = v0.has(key) ? va.src + a / SAMPLE_RATE * va.speed : va.src;
        const vb = v1.get(key) ?? (b > a + 1 ? evaluateAudio(p, seq, at(b - 1)).find((v) => v.key === key) : void 0);
        used.add(key);
        const len = b - a;
        const Lv = new Float32Array(n);
        const Rv = new Float32Array(n);
        if (va.linear) {
          let s = streams.get(key);
          if (!s || Math.abs(s.speed - va.speed) > 1e-6 || s.needsRestart(srcA)) {
            s?.kill();
            const s0 = Math.max(0, srcA);
            s = new AudioStream(o.spawn, decodeAudioArgs(va.media.path, s0, va.speed), s0, va.speed, SAMPLE_RATE);
            streams.set(key, s);
          }
          const buf = await s.read(srcA, len);
          for (let i = 0; i < len; i++) {
            Lv[a + i] = buf[2 * i];
            Rv[a + i] = buf[2 * i + 1];
          }
        } else {
          const spB = vb?.speed ?? va.speed;
          const pc = va.speed !== 0 || spB !== 0 ? await pcmFor(va) : null;
          if (pc) {
            const srcB = srcA + (va.speed + spB) / 2 * (len / SAMPLE_RATE);
            readVarispeed(pc.pcm, pc.start, SAMPLE_RATE, srcA, srcB, len, Lv.subarray(a, b), Rv.subarray(a, b));
          }
        }
        const items = voiceChain(va);
        if (items.length) {
          let ch = voiceChains.get(key);
          if (!ch) {
            ch = new Chain(SAMPLE_RATE);
            voiceChains.set(key, ch);
          }
          ch.run(items, Lv, Rv, n);
        }
        const g0 = va.gain;
        const g1 = vb?.gain ?? g0;
        const cp2 = panCoeffs(va.pan);
        const [BL, BR] = bus(va.busTrackId);
        for (let i = 0; i < n; i++) {
          const g = i < a ? g0 : i >= b ? g1 : g0 + (g1 - g0) * (i - a) / len;
          const l = Lv[i] * g;
          const r = Rv[i] * g;
          BL[i] += cp2.ll * l + cp2.rl * r;
          BR[i] += cp2.lr * l + cp2.rr * r;
        }
      }
      for (const k of [...streams.keys()]) {
        if (!used.has(k)) {
          streams.get(k).kill();
          streams.delete(k);
        }
      }
      for (const k of [...voiceChains.keys()]) if (!used.has(k)) voiceChains.delete(k);
      const mix = new Float32Array(n * 2);
      const ML = new Float32Array(n);
      const MR = new Float32Array(n);
      for (const tr of tracks) {
        if (tr.muted) continue;
        const items = trackChain(tr, t0);
        if (!items.length && !buses.has(tr.id)) continue;
        const [L, R] = bus(tr.id);
        if (items.length) {
          let ch = busChains.get(tr.id);
          if (!ch) {
            ch = new Chain(SAMPLE_RATE);
            busChains.set(tr.id, ch);
          }
          ch.run(items, L, R, n);
        }
        const tg = dbToGain(tr.volume);
        const tp = panCoeffs(tr.pan / 100);
        for (let i = 0; i < n; i++) {
          ML[i] += (tp.ll * L[i] + tp.rl * R[i]) * tg;
          MR[i] += (tp.lr * L[i] + tp.rr * R[i]) * tg;
        }
      }
      const mItems = masterChain(seq, t0);
      if (mItems.length) master.run(mItems, ML, MR, n);
      for (let i = 0; i < n; i++) {
        mix[2 * i] = ML[i] * masterGain;
        mix[2 * i + 1] = MR[i] * masterGain;
      }
      await o.write(mix);
      if (o.onProgress && off / BLOCK % 64 === 0) o.onProgress(off / total);
    }
  } finally {
    for (const s of streams.values()) s.kill();
  }
}
const req = window.require;
const cp = req("child_process");
const fs = req("fs");
const os = req("os");
const path = req("path");
const { ipcRenderer } = req("electron");
let cancelled = false;
const live = /* @__PURE__ */ new Set();
function report(p) {
  ipcRenderer.send("export:progress", p);
}
const even = (n) => Math.max(2, Math.round(n / 2) * 2);
function lastLine(s) {
  return s.trim().split("\n").slice(-2).join(" ");
}
function is10bit(m) {
  return /10|12|16|p010|p016/.test(m.pixFmt) || ["prores", "dnxhd"].includes(m.videoCodec);
}
function maxScale(l) {
  const t = l.clip.transform;
  const vals = [t.scale, t.scaleY].filter((v) => v !== void 0);
  let m = 1;
  for (const v of vals) {
    if (isAnim(v)) for (const k of v.k) m = Math.max(m, Math.abs(k.v) / 100);
    else m = Math.max(m, Math.abs(evalNum(v, 0)) / 100);
  }
  return m * l.trans.scaleMul;
}
async function run(job) {
  const { doc, media, settings, caps } = job;
  const seq = getSeq(doc, job.sequenceId);
  if (!seq) throw new Error("Sequence not found");
  const ffmpeg = caps.ffmpeg;
  const p = { doc, media };
  const fps = seq.settings.fps;
  const start = settings.rangeStart;
  const end = settings.rangeEnd;
  const totalFrames = Math.max(1, Math.round((end - start) * fps));
  const spawn = (args) => {
    const proc = cp.spawn(ffmpeg, args);
    live.add(proc);
    proc.on("close", () => live.delete(proc));
    return proc;
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cuttingfloor-export-"));
  const audioPath = path.join(tmp, "mix.f32");
  const fd = fs.openSync(audioPath, "w");
  try {
    report({ frame: 0, total: totalFrames, fps: 0, done: false, phase: "audio" });
    await mixAudio({
      p,
      seq,
      start,
      end: start + totalFrames / fps,
      spawn,
      write: (b) => {
        fs.writeSync(fd, Buffer.from(b.buffer, b.byteOffset, b.byteLength));
      },
      onProgress: (f) => report({ frame: Math.round(f * totalFrames), total: totalFrames, fps: 0, done: false, phase: "audio" }),
      cancelled: () => cancelled,
      readPcm: (file, s0, dur) => new Promise((resolve, reject) => {
        const proc = spawn(decodeAudioArgs(file, s0, 1, dur));
        const parts = [];
        let err = "";
        proc.stdout.on("data", (d) => parts.push(d));
        proc.stderr.on("data", (d) => err += d.toString());
        proc.on("close", (code) => {
          if (code !== 0 && !parts.length) reject(new Error(`Could not decode audio of ${path.basename(file)}: ${lastLine(err)}`));
          const b = Buffer.concat(parts);
          resolve(new Float32Array(b.buffer, b.byteOffset, Math.floor(b.byteLength / 8) * 2));
        });
      })
    });
  } finally {
    fs.closeSync(fd);
  }
  let loud;
  if (settings.loudness) {
    report({ frame: 0, total: totalFrames, fps: 0, done: false, phase: "loudness" });
    loud = await normalizeLoudness(fs, audioPath, SAMPLE_RATE, settings.loudness.target, settings.loudness.truePeak, () => cancelled);
  }
  const cleanup = () => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
    }
  };
  if (settings.audioOnly) {
    const r = cp.spawnSync(ffmpeg, audioOnlyArgs(audioPath, settings.outputPath));
    cleanup();
    if (r.status !== 0) throw new Error(`Audio encode failed: ${lastLine(r.stderr.toString())}`);
    report({ frame: totalFrames, total: totalFrames, fps: 0, done: true, outputPath: settings.outputPath, loudness: loud });
    return;
  }
  const fontLoads = [];
  for (const q of doc.sequences)
    for (const c of q.clips)
      if (c.source.kind === "text") {
        const t = c.source.props;
        fontLoads.push(document.fonts.load(`${t.italic ? "italic " : ""}${t.weight} ${t.size}px "${t.font}"`, t.text).catch(() => null));
      }
  await Promise.all(fontLoads);
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = settings.width;
  canvas.height = settings.height;
  const comp = new Compositor(canvas);
  const info = presetInfo(settings.preset);
  const bits = info.tenBit && comp.floatBuffers ? 16 : 8;
  const decodeBits = bits === 16 && comp.norm16 ? 16 : 8;
  const outScale = settings.width / seq.settings.width;
  const enc = spawn(encoderArgs({ preset: settings.preset, quality: settings.quality, width: settings.width, height: settings.height, fps, bits, audioPath, output: settings.outputPath }));
  let encErr = "";
  let encClosed = false;
  enc.stderr.on("data", (d) => encErr += d.toString());
  enc.on("close", () => encClosed = true);
  enc.stdin.on("error", () => {
  });
  const streams = /* @__PURE__ */ new Map();
  const stills = /* @__PURE__ */ new Map();
  const pending = /* @__PURE__ */ new Map();
  const streamSize = (l) => {
    const m = l.media;
    const fit = fitSize(m.width, m.height, l.seq.settings);
    const k = maxScale(l) * outScale;
    const w = even(Math.min(m.width || fit.w, Math.max(16, fit.w * k), 4096));
    const h = even(Math.min(m.height || fit.h, Math.max(16, fit.h * k), 4096));
    const b = decodeBits === 16 && is10bit(m) ? 16 : 8;
    return { w, h, b };
  };
  const openStream = (l, src, speed, gpu, dur = Math.max(1, (end - start) * 1.2)) => {
    const m = l.media;
    const { w, h, b } = streamSize(l);
    const s0 = Math.max(0, src);
    const args = decodeVideoArgs({ path: m.path, image: m.kind === "image", s0, dur, w, h, fps, speed, bits: b, gpu });
    return new VideoStream(spawn, args, s0, speed, fps, w, h, b);
  };
  const modeOf = (u) => u.linear ? "linear:" + u.rate.toFixed(6) : u.rate < 0 ? "reverse" : "forward";
  const makeStream = (u, gpu) => {
    const l = u.l;
    if (u.linear) return openStream(l, l.mt, u.rate, gpu);
    if (u.rate >= 0) return openStream(l, l.mt, 1, gpu);
    const { w, h, b } = streamSize(l);
    const frameBytes = w * h * 4 * (b === 16 ? 2 : 1);
    const win = Math.max(8, Math.min(120, Math.floor(384 * 1024 * 1024 / frameBytes)));
    return new WindowedStream((s0, n) => openStream(l, s0, 1, gpu, n / fps + 0.5), fps, win, w, h);
  };
  const fetchFrame = async (u) => {
    const l = u.l;
    const m = l.media;
    if (m.kind === "image") {
      if (stills.has(l.key)) return null;
      const s = openStream(l, 0, 1, false);
      const f2 = await s.frameAt(0);
      s.kill();
      if (!f2) throw new Error(`Could not decode ${m.name}: ${s.error}`);
      const raw = { data: f2, width: s.w, height: s.h };
      stills.set(l.key, raw);
      return raw;
    }
    const mode = modeOf(u);
    let e = streams.get(l.key);
    if (e && (e.mode !== mode || e.s.needsRestart(l.mt))) {
      e.s.kill();
      e = void 0;
    }
    const gpu = caps.cudaDecode;
    if (!e) {
      e = { s: makeStream(u, gpu), mode };
      streams.set(l.key, e);
    }
    let f = await e.s.frameAt(l.mt);
    if (!f && e.s.decoded === 0) {
      e.s.kill();
      e = { s: makeStream(u, false), mode };
      streams.set(l.key, e);
      f = await e.s.frameAt(l.mt);
      if (!f && e.s.decoded === 0 && e.s.error) throw new Error(`Could not decode ${m.name}: ${lastLine(e.s.error)}`);
    }
    return f ? { data: f, width: e.s.w, height: e.s.h } : null;
  };
  const images = /* @__PURE__ */ new Map();
  for (const q of doc.sequences)
    for (const c of q.clips)
      for (const tr of [c.transitionIn, c.transitionOut])
        if (tr && tr.type === "gradientWipe" && tr.params.pattern === "image" && tr.params.image && !images.has(String(tr.params.image))) {
          const file = String(tr.params.image);
          try {
            const ext = path.extname(file).slice(1).toLowerCase();
            const img = new Image();
            img.src = `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${fs.readFileSync(file).toString("base64")}`;
            await img.decode();
            images.set(file, img);
          } catch {
          }
        }
  const matteFds = /* @__PURE__ */ new Map();
  const readMatte = (d, i) => {
    let fd2 = matteFds.get(d.file);
    if (fd2 === void 0) {
      try {
        fd2 = fs.openSync(d.file, "r");
      } catch {
        fd2 = -1;
      }
      matteFds.set(d.file, fd2);
    }
    if (fd2 < 0 || i < 0 || i >= d.n) return null;
    const size = d.w * d.h * 2;
    const buf = new Uint8Array(size);
    return fs.readSync(fd2, buf, 0, size, 64 + i * size) === size ? buf : null;
  };
  const provider = {
    matte: (d, i) => readMatte(d, i),
    media: (l) => {
      if (l.media?.kind === "image") return stills.get(l.key) ?? null;
      return pending.get(l.key) ?? null;
    },
    lut: (p2) => job.luts[p2] ?? null,
    image: (p2) => images.get(p2) ?? null
  };
  let preroll = 0;
  for (const q of doc.sequences)
    for (const c of q.clips)
      for (const e of c.effects)
        if (e.enabled && e.type === "echo") {
          const n = Number(evalNum(e.params.echoes, 0)) || 3;
          const k = Number(evalNum(e.params.interval, 0)) || 2;
          preroll = Math.max(preroll, Math.min(80, Math.ceil(n * k)));
        }
  const started = performance.now();
  let writing = Promise.resolve();
  try {
    for (let i = -preroll; i < totalFrames; i++) {
      if (cancelled) throw new Error("cancelled");
      if (encClosed) throw new Error(`Encoder stopped: ${lastLine(encErr)}`);
      const t = start + i / fps;
      const layers = evaluateVideo(p, seq, t);
      const active = mediaUses(layers);
      const keys = new Set(active.map((a) => a.l.key));
      for (const [k, e] of streams) {
        if (!keys.has(k)) {
          e.s.kill();
          streams.delete(k);
          comp.dropTexture(k);
        }
      }
      pending.clear();
      for (const u of active) pending.set(u.l.key, await fetchFrame(u));
      const px = comp.renderForExport(layers, seq, provider, settings.width, settings.height, bits, info.alpha, i < 0);
      if (i < 0) continue;
      await writing;
      writing = new Promise((resolve) => {
        const buf = Buffer.from(px.buffer, px.byteOffset, px.byteLength);
        if (enc.stdin.write(buf)) resolve();
        else enc.stdin.once("drain", () => resolve());
      });
      if (i % 6 === 0 || i === totalFrames - 1) {
        const el2 = (performance.now() - started) / 1e3;
        report({ frame: i + 1, total: totalFrames, fps: (i + 1) / Math.max(1e-3, el2), done: false, phase: "video" });
      }
    }
    await writing;
    enc.stdin.end();
    const code = await new Promise((r) => {
      if (encClosed) r(enc.exitCode ?? 1);
      else enc.on("close", (c) => r(c ?? 1));
    });
    if (code !== 0) throw new Error(`Encoder failed: ${lastLine(encErr)}`);
    const el = (performance.now() - started) / 1e3;
    report({ frame: totalFrames, total: totalFrames, fps: totalFrames / el, done: true, outputPath: settings.outputPath, loudness: loud });
  } finally {
    for (const e of streams.values()) e.s.kill();
    for (const fd2 of matteFds.values()) if (fd2 >= 0) fs.closeSync(fd2);
    cleanup();
  }
}
ipcRenderer.on("export:cancel", () => {
  cancelled = true;
});
ipcRenderer.on("export:job", (_e, job) => {
  run(job).catch((e) => {
    for (const p of live) p.kill("SIGKILL");
    try {
      fs.unlinkSync(job.settings.outputPath);
    } catch {
    }
    const msg = e.message;
    report({ frame: 0, total: 0, fps: 0, done: true, cancelled: msg === "cancelled", error: msg === "cancelled" ? void 0 : msg });
  });
});

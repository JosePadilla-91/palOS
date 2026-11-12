(function() {
  "use strict";
  const dbToLin = (db) => Math.pow(10, db / 20);
  const linToDb = (x) => x > 1e-12 ? 20 * Math.log10(x) : -240;
  const num = (p, k, d) => {
    const v = p[k];
    return typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d;
  };
  const flag = (p, k) => p[k] === true || p[k] === 1;
  const coef = (ms, sr) => ms <= 0 ? 0 : Math.exp(-1 / (ms / 1e3 * sr));
  class Biquad {
    b0 = 1;
    b1 = 0;
    b2 = 0;
    a1 = 0;
    a2 = 0;
    z1 = [0, 0];
    z2 = [0, 0];
    key = "";
    set(type, sr, f, q, gainDb = 0) {
      const k = `${type}|${f}|${q}|${gainDb}`;
      if (k === this.key) return;
      this.key = k;
      f = Math.max(1, Math.min(sr * 0.49, f));
      q = Math.max(0.025, q);
      const w = 2 * Math.PI * f / sr;
      const cw = Math.cos(w);
      const sw = Math.sin(w);
      const A = Math.pow(10, gainDb / 40);
      const alpha = sw / (2 * q);
      let b0, b1, b2, a0, a1, a2;
      switch (type) {
        case "lowpass":
          b0 = (1 - cw) / 2;
          b1 = 1 - cw;
          b2 = (1 - cw) / 2;
          a0 = 1 + alpha;
          a1 = -2 * cw;
          a2 = 1 - alpha;
          break;
        case "highpass":
          b0 = (1 + cw) / 2;
          b1 = -(1 + cw);
          b2 = (1 + cw) / 2;
          a0 = 1 + alpha;
          a1 = -2 * cw;
          a2 = 1 - alpha;
          break;
        case "bandpass":
          b0 = alpha;
          b1 = 0;
          b2 = -alpha;
          a0 = 1 + alpha;
          a1 = -2 * cw;
          a2 = 1 - alpha;
          break;
        case "notch":
          b0 = 1;
          b1 = -2 * cw;
          b2 = 1;
          a0 = 1 + alpha;
          a1 = -2 * cw;
          a2 = 1 - alpha;
          break;
        case "peaking":
          b0 = 1 + alpha * A;
          b1 = -2 * cw;
          b2 = 1 - alpha * A;
          a0 = 1 + alpha / A;
          a1 = -2 * cw;
          a2 = 1 - alpha / A;
          break;
        case "lowshelf": {
          const s = 2 * Math.sqrt(A) * alpha;
          b0 = A * (A + 1 - (A - 1) * cw + s);
          b1 = 2 * A * (A - 1 - (A + 1) * cw);
          b2 = A * (A + 1 - (A - 1) * cw - s);
          a0 = A + 1 + (A - 1) * cw + s;
          a1 = -2 * (A - 1 + (A + 1) * cw);
          a2 = A + 1 + (A - 1) * cw - s;
          break;
        }
        default: {
          const s = 2 * Math.sqrt(A) * alpha;
          b0 = A * (A + 1 + (A - 1) * cw + s);
          b1 = -2 * A * (A - 1 + (A + 1) * cw);
          b2 = A * (A + 1 + (A - 1) * cw - s);
          a0 = A + 1 - (A - 1) * cw + s;
          a1 = 2 * (A - 1 - (A + 1) * cw);
          a2 = A + 1 - (A - 1) * cw - s;
        }
      }
      this.b0 = b0 / a0;
      this.b1 = b1 / a0;
      this.b2 = b2 / a0;
      this.a1 = a1 / a0;
      this.a2 = a2 / a0;
    }
    /** Raw coefficients (normalised, a0 = 1). */
    setRaw(b, a) {
      this.b0 = b[0];
      this.b1 = b[1];
      this.b2 = b[2];
      this.a1 = a[1];
      this.a2 = a[2];
      this.key = "raw";
    }
    tick(x, ch) {
      const y = this.b0 * x + this.z1[ch];
      this.z1[ch] = this.b1 * x - this.a1 * y + this.z2[ch];
      this.z2[ch] = this.b2 * x - this.a2 * y;
      return y;
    }
    run(buf, n, ch) {
      const { b0, b1, b2, a1, a2 } = this;
      let z1 = this.z1[ch];
      let z2 = this.z2[ch];
      for (let i = 0; i < n; i++) {
        const x = buf[i];
        const y = b0 * x + z1;
        z1 = b1 * x - a1 * y + z2;
        z2 = b2 * x - a2 * y;
        buf[i] = y;
      }
      this.z1[ch] = Math.abs(z1) < 1e-25 ? 0 : z1;
      this.z2[ch] = Math.abs(z2) < 1e-25 ? 0 : z2;
    }
    reset() {
      this.z1 = [0, 0];
      this.z2 = [0, 0];
    }
  }
  class Eq {
    constructor(sr) {
      this.sr = sr;
    }
    sr;
    f = Array.from({ length: 7 }, () => new Biquad());
    process(L, R, n, p) {
      const bands = [];
      const [hp, ls, p1, p2, p3, hs, lp] = this.f;
      if (flag(p, "hpOn")) {
        hp.set("highpass", this.sr, num(p, "hpFreq", 80), Math.SQRT1_2);
        bands.push([hp, true]);
      }
      const lsg = num(p, "lsGain", 0);
      if (lsg !== 0) {
        ls.set("lowshelf", this.sr, num(p, "lsFreq", 120), Math.SQRT1_2, lsg);
        bands.push([ls, true]);
      }
      const peaks = [
        [p1, "p1"],
        [p2, "p2"],
        [p3, "p3"]
      ];
      for (const [b, k] of peaks) {
        const g = num(p, k + "Gain", 0);
        if (g === 0) continue;
        b.set("peaking", this.sr, num(p, k + "Freq", 1e3), num(p, k + "Q", 1), g);
        bands.push([b, true]);
      }
      const hsg = num(p, "hsGain", 0);
      if (hsg !== 0) {
        hs.set("highshelf", this.sr, num(p, "hsFreq", 8e3), Math.SQRT1_2, hsg);
        bands.push([hs, true]);
      }
      if (flag(p, "lpOn")) {
        lp.set("lowpass", this.sr, num(p, "lpFreq", 16e3), Math.SQRT1_2);
        bands.push([lp, true]);
      }
      for (const [b] of bands) {
        b.run(L, n, 0);
        b.run(R, n, 1);
      }
      const out = dbToLin(num(p, "output", 0));
      if (out !== 1)
        for (let i = 0; i < n; i++) {
          L[i] *= out;
          R[i] *= out;
        }
    }
    reset() {
      for (const b of this.f) b.reset();
    }
  }
  function compressorGain(xDb, thr, ratio, knee) {
    const over = xDb - thr;
    let y;
    if (2 * over < -knee) y = xDb;
    else if (knee > 0 && 2 * Math.abs(over) <= knee) y = xDb + (1 / ratio - 1) * (over + knee / 2) ** 2 / (2 * knee);
    else y = thr + over / ratio;
    return Math.min(0, y - xDb);
  }
  class Compressor {
    // dB gain reduction (≤ 0)
    constructor(sr) {
      this.sr = sr;
    }
    sr;
    env = 0;
    process(L, R, n, p) {
      const thr = num(p, "threshold", -18);
      const ratio = Math.max(1, num(p, "ratio", 3));
      const knee = Math.max(0, num(p, "knee", 6));
      const at = coef(num(p, "attack", 10), this.sr);
      const rt = coef(num(p, "release", 150), this.sr);
      let makeup = num(p, "makeup", 0);
      if (flag(p, "auto")) makeup += -compressorGain(0, thr, ratio, knee) / 2;
      const mk = dbToLin(makeup);
      let env = this.env;
      for (let i = 0; i < n; i++) {
        const x = Math.max(Math.abs(L[i]), Math.abs(R[i]));
        const gr = compressorGain(linToDb(x), thr, ratio, knee);
        env = gr < env ? at * env + (1 - at) * gr : rt * env + (1 - rt) * gr;
        const g = dbToLin(env) * mk;
        L[i] *= g;
        R[i] *= g;
      }
      this.env = env;
    }
    reset() {
      this.env = 0;
    }
  }
  const TP_PHASES = [
    [0.001708984375, 0.010986328125, -0.0196533203125, 0.033203125, -0.0594482421875, 0.1373291015625, 0.97216796875, -0.102294921875, 0.047607421875, -0.026611328125, 0.014892578125, -0.00830078125],
    [-0.0291748046875, 0.029296875, -0.0517578125, 0.089111328125, -0.16650390625, 0.465087890625, 0.77978515625, -0.2003173828125, 0.1015625, -0.0582275390625, 0.0330810546875, -0.0189208984375],
    [-0.0189208984375, 0.0330810546875, -0.0582275390625, 0.1015625, -0.2003173828125, 0.77978515625, 0.465087890625, -0.16650390625, 0.089111328125, -0.0517578125, 0.029296875, -0.0291748046875],
    [-0.00830078125, 0.014892578125, -0.026611328125, 0.047607421875, -0.102294921875, 0.97216796875, 0.1373291015625, -0.0594482421875, 0.033203125, -0.0196533203125, 0.010986328125, 0.001708984375]
  ];
  class TruePeak {
    hist = new Float32Array(12);
    pos = 0;
    /** Push a sample; returns the largest |value| among the 4 interpolated points. */
    push(x) {
      this.hist[this.pos] = x;
      this.pos = (this.pos + 1) % 12;
      let m = 0;
      for (const ph of TP_PHASES) {
        let acc = 0;
        for (let k = 0; k < 12; k++) acc += ph[k] * this.hist[(this.pos + 11 - k) % 12];
        m = Math.max(m, Math.abs(acc));
      }
      return m;
    }
    reset() {
      this.hist.fill(0);
      this.pos = 0;
    }
  }
  class Limiter {
    constructor(sr, truePeak = false, lookaheadMs = 5) {
      this.sr = sr;
      this.truePeak = truePeak;
      this.la = Math.max(4, Math.round(lookaheadMs / 1e3 * sr));
      this.dl = [new Float32Array(this.la), new Float32Array(this.la)];
      this.gq = new Float32Array(this.la + 1).fill(1);
      this.box = new Float64Array(this.la).fill(1);
      this.boxSum = this.la;
    }
    sr;
    truePeak;
    la;
    dl;
    gq;
    // required gain per sample, ring
    box;
    boxSum = 0;
    pos = 0;
    gpos = 0;
    env = 1;
    tp = [new TruePeak(), new TruePeak()];
    get latency() {
      return this.la;
    }
    process(L, R, n, p) {
      const ceil = dbToLin(num(p, "ceiling", -1));
      const inG = dbToLin(num(p, "input", 0));
      const rel = coef(num(p, "release", 60), this.sr);
      const la = this.la;
      for (let i = 0; i < n; i++) {
        const l = L[i] * inG;
        const r = R[i] * inG;
        const pk = this.truePeak ? Math.max(this.tp[0].push(l), this.tp[1].push(r), Math.abs(l), Math.abs(r)) : Math.max(Math.abs(l), Math.abs(r));
        const need = pk > ceil ? ceil / pk : 1;
        const j = this.pos;
        this.gq[this.gpos] = need;
        this.gpos = (this.gpos + 1) % (la + 1);
        let m = 1;
        for (let k = 0; k <= la; k++) if (this.gq[k] < m) m = this.gq[k];
        this.env = m < this.env ? m : rel * this.env + (1 - rel) * m;
        this.boxSum += this.env - this.box[j];
        this.box[j] = this.env;
        const g = Math.min(1, this.boxSum / la);
        const dlL = this.dl[0][j];
        const dlR = this.dl[1][j];
        this.dl[0][j] = l;
        this.dl[1][j] = r;
        L[i] = dlL * g;
        R[i] = dlR * g;
        this.pos = (j + 1) % la;
      }
    }
    reset() {
      this.dl[0].fill(0);
      this.dl[1].fill(0);
      this.gq.fill(1);
      this.box.fill(1);
      this.boxSum = this.la;
      this.env = 1;
      this.pos = 0;
      this.gpos = 0;
      this.tp[0].reset();
      this.tp[1].reset();
    }
  }
  class Gate {
    constructor(sr) {
      this.sr = sr;
    }
    sr;
    env = 0;
    gain = 0;
    hold = 0;
    open = false;
    process(L, R, n, p) {
      const thr = num(p, "threshold", -50);
      const at = coef(num(p, "attack", 2), this.sr);
      const rt = coef(num(p, "release", 120), this.sr);
      const holdN = num(p, "hold", 50) / 1e3 * this.sr;
      const floor = dbToLin(num(p, "range", -60));
      const det = coef(1, this.sr);
      for (let i = 0; i < n; i++) {
        const x = Math.max(Math.abs(L[i]), Math.abs(R[i]));
        this.env = x > this.env ? x : det * this.env + (1 - det) * x;
        const db = linToDb(this.env);
        if (db > thr) {
          this.open = true;
          this.hold = holdN;
        } else if (db < thr - 3) {
          if (this.hold > 0) this.hold--;
          else this.open = false;
        }
        const target = this.open ? 1 : floor;
        const c = target > this.gain ? at : rt;
        this.gain = c * this.gain + (1 - c) * target;
        L[i] *= this.gain;
        R[i] *= this.gain;
      }
    }
    reset() {
      this.env = 0;
      this.gain = 0;
      this.hold = 0;
      this.open = false;
    }
  }
  class Comb {
    buf;
    i = 0;
    store = 0;
    constructor(len) {
      this.buf = new Float32Array(len);
    }
    tick(x, fb, damp) {
      const y = this.buf[this.i];
      this.store = y * (1 - damp) + this.store * damp;
      if (Math.abs(this.store) < 1e-25) this.store = 0;
      this.buf[this.i] = x + this.store * fb;
      if (++this.i >= this.buf.length) this.i = 0;
      return y;
    }
    reset() {
      this.buf.fill(0);
      this.store = 0;
    }
  }
  class AllPass {
    buf;
    i = 0;
    constructor(len) {
      this.buf = new Float32Array(len);
    }
    tick(x) {
      const b = this.buf[this.i];
      const y = -x + b;
      this.buf[this.i] = x + b * 0.5;
      if (++this.i >= this.buf.length) this.i = 0;
      return y;
    }
    reset() {
      this.buf.fill(0);
    }
  }
  class Reverb {
    combs;
    aps;
    pre;
    pi = 0;
    constructor(sr) {
      const k = sr / 44100;
      const C = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
      const A = [556, 441, 341, 225];
      const spread = 23;
      this.combs = [C.map((c) => new Comb(Math.round(c * k))), C.map((c) => new Comb(Math.round((c + spread) * k)))];
      this.aps = [A.map((a) => new AllPass(Math.round(a * k))), A.map((a) => new AllPass(Math.round((a + spread) * k)))];
      const maxPre = Math.ceil(0.2 * sr) + 1;
      this.pre = [new Float32Array(maxPre), new Float32Array(maxPre)];
      this.sr = sr;
    }
    sr;
    process(L, R, n, p) {
      const fb = num(p, "size", 50) / 100 * 0.28 + 0.7;
      const damp = num(p, "damping", 50) / 100 * 0.4;
      const width = num(p, "width", 100) / 100;
      const wet = num(p, "wet", 25) / 100 * 3;
      const dry = num(p, "dry", 100) / 100;
      const wet1 = wet * (width / 2 + 0.5);
      const wet2 = wet * ((1 - width) / 2);
      const pd = Math.min(this.pre[0].length - 1, Math.round(num(p, "predelay", 10) / 1e3 * this.sr));
      const len = this.pre[0].length;
      for (let i = 0; i < n; i++) {
        const inL = L[i];
        const inR = R[i];
        this.pre[0][this.pi] = inL;
        this.pre[1][this.pi] = inR;
        const ri = (this.pi - pd + len) % len;
        const x = (this.pre[0][ri] + this.pre[1][ri]) * 0.015;
        this.pi = (this.pi + 1) % len;
        let oL = 0;
        let oR = 0;
        for (let c = 0; c < 8; c++) {
          oL += this.combs[0][c].tick(x, fb, damp);
          oR += this.combs[1][c].tick(x, fb, damp);
        }
        for (let a = 0; a < 4; a++) {
          oL = this.aps[0][a].tick(oL);
          oR = this.aps[1][a].tick(oR);
        }
        L[i] = inL * dry + oL * wet1 + oR * wet2;
        R[i] = inR * dry + oR * wet1 + oL * wet2;
      }
    }
    reset() {
      for (const s of this.combs) for (const c of s) c.reset();
      for (const s of this.aps) for (const a of s) a.reset();
      this.pre[0].fill(0);
      this.pre[1].fill(0);
    }
  }
  class Delay {
    constructor(sr) {
      this.sr = sr;
      const len = Math.ceil(2.1 * sr);
      this.buf = [new Float32Array(len), new Float32Array(len)];
    }
    sr;
    buf;
    w = 0;
    d = -1;
    // smoothed delay (samples)
    lp = [0, 0];
    read(ch, d) {
      const b = this.buf[ch];
      const len = b.length;
      const pos = this.w - d;
      const i0 = Math.floor(pos);
      const f = pos - i0;
      const a = b[(i0 % len + len) % len];
      const c = b[((i0 + 1) % len + len) % len];
      return a + (c - a) * f;
    }
    process(L, R, n, p) {
      const target = Math.min(this.buf[0].length - 4, Math.max(1, num(p, "time", 350) / 1e3 * this.sr));
      if (this.d < 0) this.d = target;
      const fb = Math.min(0.95, num(p, "feedback", 35) / 100);
      const mix = num(p, "mix", 25) / 100;
      const ping = flag(p, "pingpong");
      const hc = Math.exp(-2 * Math.PI * Math.min(this.sr * 0.45, num(p, "highcut", 6e3)) / this.sr);
      const sm = coef(30, this.sr);
      const len = this.buf[0].length;
      for (let i = 0; i < n; i++) {
        this.d = sm * this.d + (1 - sm) * target;
        const dl = this.read(0, this.d);
        const dr = this.read(1, this.d);
        this.lp[0] = (1 - hc) * dl + hc * this.lp[0];
        this.lp[1] = (1 - hc) * dr + hc * this.lp[1];
        const x = L[i];
        const y = R[i];
        if (ping) {
          this.buf[0][this.w] = (x + y) * 0.5 + this.lp[1] * fb;
          this.buf[1][this.w] = this.lp[0] * fb;
        } else {
          this.buf[0][this.w] = x + this.lp[0] * fb;
          this.buf[1][this.w] = y + this.lp[1] * fb;
        }
        this.w = (this.w + 1) % len;
        L[i] = x * (1 - mix) + dl * mix;
        R[i] = y * (1 - mix) + dr * mix;
      }
    }
    reset() {
      this.buf[0].fill(0);
      this.buf[1].fill(0);
      this.d = -1;
      this.lp = [0, 0];
    }
  }
  class PitchShift {
    buf;
    w = 0;
    ph = 0;
    win;
    constructor(sr) {
      this.win = Math.round(0.06 * sr);
      const len = this.win * 2 + 8;
      this.buf = [new Float32Array(len), new Float32Array(len)];
    }
    tap(ch, d) {
      const b = this.buf[ch];
      const len = b.length;
      const pos = this.w - d - 1;
      const i0 = Math.floor(pos);
      const f = pos - i0;
      const a = b[(i0 % len + len) % len];
      const c = b[((i0 + 1) % len + len) % len];
      return a + (c - a) * f;
    }
    process(L, R, n, p) {
      const ratio = Math.pow(2, (num(p, "semitones", 0) + num(p, "cents", 0) / 100) / 12);
      const mix = num(p, "mix", 100) / 100;
      if (Math.abs(ratio - 1) < 1e-6 && mix >= 1) {
        for (let i = 0; i < n; i++) {
          this.buf[0][this.w] = L[i];
          this.buf[1][this.w] = R[i];
          this.w = (this.w + 1) % this.buf[0].length;
        }
        return;
      }
      const W = this.win;
      const step = (1 - ratio) / W;
      const len = this.buf[0].length;
      for (let i = 0; i < n; i++) {
        this.buf[0][this.w] = L[i];
        this.buf[1][this.w] = R[i];
        const p1 = this.ph;
        const p2 = (this.ph + 0.5) % 1;
        const g1 = Math.sin(Math.PI * p1) ** 2;
        const g2 = Math.sin(Math.PI * p2) ** 2;
        const l = this.tap(0, p1 * W) * g1 + this.tap(0, p2 * W) * g2;
        const r = this.tap(1, p1 * W) * g1 + this.tap(1, p2 * W) * g2;
        L[i] = L[i] * (1 - mix) + l * mix;
        R[i] = R[i] * (1 - mix) + r * mix;
        this.ph += step;
        this.ph -= Math.floor(this.ph);
        this.w = (this.w + 1) % len;
      }
    }
    reset() {
      this.buf[0].fill(0);
      this.buf[1].fill(0);
      this.ph = 0;
    }
  }
  function fft(re, im, inverse) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (inverse ? 2 : -2) * Math.PI / len;
      const wr = Math.cos(ang);
      const wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1;
        let ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k;
          const b = a + len / 2;
          const tr = re[b] * cr - im[b] * ci;
          const ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
          const nr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = nr;
        }
      }
    }
    if (inverse)
      for (let i = 0; i < n; i++) {
        re[i] /= n;
        im[i] /= n;
      }
  }
  class Denoise {
    constructor(sr) {
      this.sr = sr;
      const N = this.N;
      this.win = new Float64Array(N);
      for (let i = 0; i < N; i++) this.win[i] = Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
      this.inBuf = [new Float64Array(N), new Float64Array(N)];
      this.outBuf = [new Float64Array(N * 2), new Float64Array(N * 2)];
      this.noise = new Float64Array(N / 2 + 1);
      this.smooth = new Float64Array(N / 2 + 1);
      this.gain = new Float64Array(N / 2 + 1).fill(1);
    }
    sr;
    N = 1024;
    H = 256;
    win;
    inBuf;
    outBuf;
    fill = 0;
    outPos = 0;
    noise;
    smooth;
    gain;
    gtmp = new Float64Array(513);
    frames = 0;
    re = new Float64Array(1024);
    im = new Float64Array(1024);
    re2 = new Float64Array(1024);
    im2 = new Float64Array(1024);
    frame(p) {
      const { N, H } = this;
      const bins = N / 2 + 1;
      const floor = dbToLin(-num(p, "reduction", 12));
      const over = 0.5 + num(p, "sensitivity", 50) / 100 * 1.5;
      const { re, im, re2, im2 } = this;
      for (let i = 0; i < N; i++) {
        re[i] = this.inBuf[0][i] * this.win[i];
        im[i] = 0;
        re2[i] = this.inBuf[1][i] * this.win[i];
        im2[i] = 0;
      }
      fft(re, im, false);
      fft(re2, im2, false);
      const UP = 1.004;
      const DOWN = 0.99;
      const COMP = 2.98;
      const g = this.gtmp;
      for (let k = 0; k < bins; k++) {
        const pw = (re[k] * re[k] + im[k] * im[k] + re2[k] * re2[k] + im2[k] * im2[k]) * 0.5 + 1e-24;
        if (this.frames < 10) this.noise[k] = this.frames === 0 ? pw / COMP : this.noise[k] + (pw / COMP - this.noise[k]) / (this.frames + 1);
        else this.noise[k] *= pw > this.noise[k] ? UP : DOWN;
        const nk = this.noise[k] * COMP * over;
        const post = pw / nk;
        const prio = 0.98 * (this.gain[k] * this.gain[k] * this.smooth[k] / nk) + 0.02 * Math.max(post - 1, 0);
        g[k] = Math.max(floor, prio / (1 + prio));
        this.smooth[k] = pw;
      }
      this.frames++;
      for (let k = 0; k < bins; k++) this.gain[k] = g[k];
      for (let k = 0; k < bins; k++) {
        const gk = this.gain[k];
        re[k] *= gk;
        im[k] *= gk;
        re2[k] *= gk;
        im2[k] *= gk;
        if (k > 0 && k < N / 2) {
          re[N - k] = re[k];
          im[N - k] = -im[k];
          re2[N - k] = re2[k];
          im2[N - k] = -im2[k];
        }
      }
      fft(re, im, true);
      fft(re2, im2, true);
      for (let i = 0; i < N; i++) {
        this.outBuf[0][this.outPos + i] += re[i] * this.win[i] * 0.5;
        this.outBuf[1][this.outPos + i] += re2[i] * this.win[i] * 0.5;
      }
    }
    process(L, R, n, p) {
      const { N, H } = this;
      for (let i = 0; i < n; i++) {
        this.inBuf[0][N - H + this.fill] = L[i];
        this.inBuf[1][N - H + this.fill] = R[i];
        L[i] = this.outBuf[0][this.fill];
        R[i] = this.outBuf[1][this.fill];
        this.fill++;
        if (this.fill === H) {
          this.fill = 0;
          for (const ob of this.outBuf) {
            ob.copyWithin(0, H);
            ob.fill(0, ob.length - H);
          }
          this.outPos = 0;
          this.frame(p);
          for (const ib of this.inBuf) ib.copyWithin(0, H);
        }
      }
    }
    reset() {
      for (const b of this.inBuf) b.fill(0);
      for (const b of this.outBuf) b.fill(0);
      this.noise.fill(0);
      this.smooth.fill(0);
      this.gain.fill(1);
      this.frames = 0;
      this.fill = 0;
    }
  }
  class DeEsser {
    constructor(sr) {
      this.sr = sr;
    }
    sr;
    side = new Biquad();
    hp = new Biquad();
    env = 0;
    process(L, R, n, p) {
      const f = num(p, "frequency", 6500);
      const thr = num(p, "threshold", -28);
      const maxRed = num(p, "reduction", 8);
      this.side.set("bandpass", this.sr, f, 1.4);
      this.hp.set("highpass", this.sr, f * 0.7, Math.SQRT1_2);
      const at = coef(1, this.sr);
      const rt = coef(60, this.sr);
      for (let i = 0; i < n; i++) {
        const s = Math.abs(this.side.tick((L[i] + R[i]) * 0.5, 0));
        this.env = s > this.env ? at * this.env + (1 - at) * s : rt * this.env + (1 - rt) * s;
        const over = linToDb(this.env) - thr;
        const gr = over > 0 ? Math.min(maxRed, over * 0.75) : 0;
        const g = dbToLin(-gr);
        const hl = this.hp.tick(L[i], 0);
        const hr = this.hp.tick(R[i], 1);
        L[i] -= hl * (1 - g);
        R[i] -= hr * (1 - g);
      }
    }
    reset() {
      this.side.reset();
      this.hp.reset();
      this.env = 0;
    }
  }
  class Hum {
    constructor(sr) {
      this.sr = sr;
    }
    sr;
    notches = Array.from({ length: 8 }, () => new Biquad());
    process(L, R, n, p) {
      const f0 = Number(p.frequency ?? 60) || 60;
      const h = Math.max(1, Math.min(8, Math.round(num(p, "harmonics", 4))));
      const q = num(p, "q", 30);
      for (let k = 0; k < h; k++) {
        const f = f0 * (k + 1);
        if (f >= this.sr * 0.45) break;
        const b = this.notches[k];
        b.set("notch", this.sr, f, q);
        b.run(L, n, 0);
        b.run(R, n, 1);
      }
    }
    reset() {
      for (const b of this.notches) b.reset();
    }
  }
  class ChannelTools {
    process(L, R, n, p) {
      const mode = String(p.mode ?? "stereo");
      const width = num(p, "width", 100) / 100;
      const g = dbToLin(num(p, "gain", 0));
      const iL = flag(p, "invertL") ? -1 : 1;
      const iR = flag(p, "invertR") ? -1 : 1;
      for (let i = 0; i < n; i++) {
        let l = L[i];
        let r = R[i];
        if (mode === "mono") l = r = (l + r) * 0.5;
        else if (mode === "left") r = l;
        else if (mode === "right") l = r;
        else if (mode === "swap") [l, r] = [r, l];
        if (width !== 1) {
          const m = (l + r) * 0.5;
          const s = (l - r) * 0.5 * width;
          l = m + s;
          r = m - s;
        }
        L[i] = l * g * iL;
        R[i] = r * g * iR;
      }
    }
    reset() {
    }
  }
  function createProcessor(type, sr) {
    switch (type) {
      case "eq":
        return new Eq(sr);
      case "compressor":
        return new Compressor(sr);
      case "limiter":
        return new Limiter(sr);
      case "gate":
        return new Gate(sr);
      case "reverb":
        return new Reverb(sr);
      case "delay":
        return new Delay(sr);
      case "pitchShift":
        return new PitchShift(sr);
      case "denoise":
        return new Denoise(sr);
      case "deesser":
        return new DeEsser(sr);
      case "humRemoval":
        return new Hum(sr);
      case "channelTools":
        return new ChannelTools();
      default:
        return null;
    }
  }
  class Chain {
    constructor(sr) {
      this.sr = sr;
    }
    sr;
    procs = /* @__PURE__ */ new Map();
    run(items, L, R, n) {
      const live = /* @__PURE__ */ new Set();
      for (const it of items) {
        let p = this.procs.get(it.id);
        if (!p) {
          const made = createProcessor(it.type, this.sr);
          if (!made) continue;
          p = made;
          this.procs.set(it.id, p);
        }
        live.add(it.id);
        p.process(L, R, n, it.params);
        for (let i = 0; i < n; i++) {
          if (!Number.isFinite(L[i])) L[i] = 0;
          if (!Number.isFinite(R[i])) R[i] = 0;
        }
      }
      for (const id of [...this.procs.keys()]) if (!live.has(id)) this.procs.delete(id);
    }
    reset() {
      for (const p of this.procs.values()) p.reset();
    }
  }
  function kWeighting(sr) {
    let f0 = 1681.974450955533;
    const G = 3.999843853973347;
    let Q = 0.7071752369554196;
    let K = Math.tan(Math.PI * f0 / sr);
    const Vh = Math.pow(10, G / 20);
    const Vb = Math.pow(Vh, 0.4996667741545416);
    let a0 = 1 + K / Q + K * K;
    const pre = new Biquad();
    pre.setRaw([(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]);
    f0 = 38.13547087602444;
    Q = 0.5003270373238773;
    K = Math.tan(Math.PI * f0 / sr);
    a0 = 1 + K / Q + K * K;
    const rlb = new Biquad();
    rlb.setRaw([1, -2, 1], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]);
    return [pre, rlb];
  }
  const powerToLufs = (p) => p > 0 ? -0.691 + 10 * Math.log10(p) : -Infinity;
  class LoudnessMeter {
    constructor(sr) {
      this.sr = sr;
      this.kw = kWeighting(sr);
      this.sub = Math.round(sr / 10);
    }
    sr;
    kw;
    sub;
    // samples per 100 ms
    acc = 0;
    cnt = 0;
    subs = [];
    // mean-square (L+R) per 100 ms
    blocks = [];
    // 400 ms block powers (75 % overlap)
    st = [];
    // 3 s short-term powers (for LRA), every 100 ms
    tp = [new TruePeak(), new TruePeak()];
    peak = 0;
    push(L, R, n) {
      const [pre, rlb] = this.kw;
      for (let i = 0; i < n; i++) {
        const l = rlb.tick(pre.tick(L[i], 0), 0);
        const r = rlb.tick(pre.tick(R[i], 1), 1);
        this.acc += l * l + r * r;
        this.peak = Math.max(this.peak, this.tp[0].push(L[i]), this.tp[1].push(R[i]), Math.abs(L[i]), Math.abs(R[i]));
        if (++this.cnt === this.sub) {
          this.subs.push(this.acc / this.sub);
          this.acc = 0;
          this.cnt = 0;
          const k = this.subs.length;
          if (k >= 4) this.blocks.push((this.subs[k - 1] + this.subs[k - 2] + this.subs[k - 3] + this.subs[k - 4]) / 4);
          if (k >= 30) {
            let s = 0;
            for (let j = k - 30; j < k; j++) s += this.subs[j];
            this.st.push(s / 30);
          }
          if (this.subs.length > 36e3 * 10) this.subs.splice(0, this.subs.length - 40);
        }
      }
    }
    recent(m) {
      const k = this.subs.length;
      if (k < m) return -Infinity;
      let s = 0;
      for (let j = k - m; j < k; j++) s += this.subs[j];
      return powerToLufs(s / m);
    }
    stats() {
      const abs = this.blocks.filter((b) => powerToLufs(b) > -70);
      let integrated = -Infinity;
      if (abs.length) {
        const rel = powerToLufs(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
        const g = abs.filter((b) => powerToLufs(b) > rel);
        if (g.length) integrated = powerToLufs(g.reduce((a, b) => a + b, 0) / g.length);
      }
      let range = 0;
      const sabs = this.st.filter((b) => powerToLufs(b) > -70);
      if (sabs.length > 1) {
        const rel = powerToLufs(sabs.reduce((a, b) => a + b, 0) / sabs.length) - 20;
        const v = sabs.filter((b) => powerToLufs(b) > rel).map(powerToLufs).sort((a, b) => a - b);
        if (v.length > 1) range = v[Math.min(v.length - 1, Math.round(0.95 * (v.length - 1)))] - v[Math.round(0.1 * (v.length - 1))];
      }
      return { momentary: this.recent(4), shortTerm: this.recent(30), integrated, range, truePeak: linToDb(this.peak) };
    }
    reset() {
      for (const b of this.kw) b.reset();
      for (const t of this.tp) t.reset();
      this.acc = 0;
      this.cnt = 0;
      this.subs = [];
      this.blocks = [];
      this.st = [];
      this.peak = 0;
    }
  }
  class FxProcessor extends AudioWorkletProcessor {
    chain = new Chain(sampleRate);
    items = [];
    L = new Float32Array(128);
    R = new Float32Array(128);
    constructor(options) {
      super();
      this.items = options?.processorOptions?.items ?? [];
      this.port.onmessage = (e) => {
        if (e.data.items) this.items = e.data.items;
        if (e.data.reset) this.chain.reset();
      };
    }
    process(inputs, outputs) {
      const inp = inputs[0];
      const out = outputs[0];
      const n = out[0]?.length ?? 128;
      if (this.L.length < n) {
        this.L = new Float32Array(n);
        this.R = new Float32Array(n);
      }
      const L = this.L.subarray(0, n);
      const R = this.R.subarray(0, n);
      if (inp && inp.length) {
        L.set(inp[0]);
        R.set(inp[1] ?? inp[0]);
      } else {
        L.fill(0);
        R.fill(0);
      }
      if (this.items.length) this.chain.run(this.items, L, R, n);
      out[0].set(L);
      if (out[1]) out[1].set(R);
      return true;
    }
  }
  class MeterProcessor extends AudioWorkletProcessor {
    meter = new LoudnessMeter(sampleRate);
    pk = [0, 0];
    since = 0;
    constructor() {
      super();
      this.port.onmessage = (e) => {
        if (e.data.reset) this.meter.reset();
      };
    }
    process(inputs) {
      const inp = inputs[0];
      if (inp && inp.length) {
        const L = inp[0];
        const R = inp[1] ?? inp[0];
        this.meter.push(L, R, L.length);
        for (let i = 0; i < L.length; i++) {
          this.pk[0] = Math.max(this.pk[0], Math.abs(L[i]));
          this.pk[1] = Math.max(this.pk[1], Math.abs(R[i]));
        }
        this.since += L.length;
      }
      if (this.since >= sampleRate / 10) {
        this.since = 0;
        this.port.postMessage({ ...this.meter.stats(), peakL: this.pk[0], peakR: this.pk[1] });
        this.pk = [0, 0];
      }
      return true;
    }
  }
  registerProcessor("cuttingfloor-fx", FxProcessor);
  registerProcessor("cuttingfloor-meter", MeterProcessor);
})();

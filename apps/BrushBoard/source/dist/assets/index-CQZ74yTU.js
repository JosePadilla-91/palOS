(function () {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const i of document.querySelectorAll('link[rel="modulepreload"]')) n(i);
  new MutationObserver((i) => {
    for (const a of i)
      if (a.type === "childList")
        for (const o of a.addedNodes) o.tagName === "LINK" && o.rel === "modulepreload" && n(o);
  }).observe(document, { childList: !0, subtree: !0 });
  function t(i) {
    const a = {};
    return (
      i.integrity && (a.integrity = i.integrity),
      i.referrerPolicy && (a.referrerPolicy = i.referrerPolicy),
      i.crossOrigin === "use-credentials"
        ? (a.credentials = "include")
        : i.crossOrigin === "anonymous"
          ? (a.credentials = "omit")
          : (a.credentials = "same-origin"),
      a
    );
  }
  function n(i) {
    if (i.ep) return;
    i.ep = !0;
    const a = t(i);
    fetch(i.href, a);
  }
})();
const $u = "modulepreload",
  qu = function (s, e) {
    return new URL(s, e).href;
  },
  Ao = {},
  re = function (e, t, n) {
    let i = Promise.resolve();
    if (t && t.length > 0) {
      let o = function (u) {
        return Promise.all(
          u.map((d) =>
            Promise.resolve(d).then(
              (f) => ({ status: "fulfilled", value: f }),
              (f) => ({ status: "rejected", reason: f }),
            ),
          ),
        );
      };
      const r = document.getElementsByTagName("link"),
        l = document.querySelector("meta[property=csp-nonce]"),
        c = l?.nonce || l?.getAttribute("nonce");
      i = o(
        t.map((u) => {
          if (((u = qu(u, n)), u in Ao)) return;
          Ao[u] = !0;
          const d = u.endsWith(".css"),
            f = d ? '[rel="stylesheet"]' : "";
          if (!!n)
            for (let y = r.length - 1; y >= 0; y--) {
              const b = r[y];
              if (b.href === u && (!d || b.rel === "stylesheet")) return;
            }
          else if (document.querySelector(`link[href="${u}"]${f}`)) return;
          const v = document.createElement("link");
          if (
            ((v.rel = d ? "stylesheet" : $u),
            d || (v.as = "script"),
            (v.crossOrigin = ""),
            (v.href = u),
            c && v.setAttribute("nonce", c),
            document.head.appendChild(v),
            d)
          )
            return new Promise((y, b) => {
              (v.addEventListener("load", y),
                v.addEventListener("error", () => b(new Error(`Unable to preload CSS for ${u}`))));
            });
        }),
      );
    }
    function a(o) {
      const r = new Event("vite:preloadError", { cancelable: !0 });
      if (((r.payload = o), window.dispatchEvent(r), !r.defaultPrevented)) throw o;
    }
    return i.then((o) => {
      for (const r of o || []) r.status === "rejected" && a(r.reason);
      return e().catch(a);
    });
  },
  Yi = new Map(),
  k = {
    on(s, e) {
      let t = Yi.get(s);
      return (t || ((t = new Set()), Yi.set(s, t)), t.add(e), () => t.delete(e));
    },
    emit(s, ...e) {
      const t = Yi.get(s);
      if (t)
        for (const n of [...t])
          try {
            n(...e);
          } catch (i) {
            console.error(`bus ${s}`, i);
          }
    },
  },
  Lr = Object.freeze(Object.defineProperty({ __proto__: null, bus: k }, Symbol.toStringTag, { value: "Module" }));
let Nu = 0,
  ha = null;
class Gt {
  constructor(e, t, n, i, a, o = !1) {
    ((this._tex = e), (this._fbo = t), (this.w = n), (this.h = i), (this.format = a), (this.mip = o));
  }
  serial = ++Nu;
  disposed = !1;
  spillable = !1;
  k = null;
  ink = null;
  isImage = !1;
  isPlane = !1;
  spilled = null;
  lastUse = 0;
  get tex() {
    return (this.spilled && ha?.(this), this._tex);
  }
  get fbo() {
    return (this.spilled && ha?.(this), this._fbo);
  }
  get resident() {
    return !this.spilled && !this.disposed;
  }
  _setHandles(e, t) {
    ((this._tex = e), (this._fbo = t));
  }
  get _rawTex() {
    return this._tex;
  }
  get _rawFbo() {
    return this._fbo;
  }
}
const ju = new Set(["u_color", "u_fillColor", "u_strokeColor"]);
let Ar = null;
function Gu(s) {
  Ar = s;
}
function os(s, e) {
  const t = s;
  return t.ink ? t.ink : Ar?.(s, e) || e.toInk(s);
}
const Wu = { rgba16f: 8, rgba32f: 16, r16f: 2, rgba8: 4, rg32f: 8 };
function rt(s) {
  return s.w * s.h * Wu[s.format] * (s.mip ? 1.34 : 1);
}
const Rr = new Float32Array(1),
  Uu = new Uint32Array(Rr.buffer);
function Hu(s) {
  Rr[0] = s;
  const e = Uu[0],
    t = (e >>> 16) & 32768;
  let n = ((e >>> 23) & 255) - 127 + 15,
    i = e & 8388607;
  if (n >= 31) return t | (((e >>> 23) & 255) === 255 && i ? 32256 : 31744);
  if (n <= 0) return t;
  const a = i & 8191;
  return (
    (i >>>= 13),
    (a > 4096 || (a === 4096 && i & 1)) && (i++, i === 1024 && ((i = 0), n++, n >= 31)) ? t | 31744 : t | (n << 10) | i
  );
}
const Ro = {
  rgba16f: { internal: 34842, format: 6408, type: 5131 },
  rgba32f: { internal: 34836, format: 6408, type: 5126 },
  r16f: { internal: 33325, format: 6403, type: 5131 },
  rgba8: { internal: 32856, format: 6408, type: 5121 },
  rg32f: { internal: 33328, format: 33319, type: 5126 },
};
class Vu {
  constructor(e, t, n) {
    ((this.gl = e), (this.prog = t), (this.name = n));
    const i = e.getProgramParameter(t, e.ACTIVE_UNIFORMS);
    for (let a = 0; a < i; a++) {
      const o = e.getActiveUniform(t, a),
        r = o.name.replace(/\[0\]$/, ""),
        l = e.getUniformLocation(t, o.name);
      (this.uniforms.set(r, { loc: l, type: o.type, size: o.size }),
        (o.type === e.SAMPLER_2D || o.type === e.SAMPLER_3D) && this.samplers.push(r));
    }
  }
  uniforms = new Map();
  samplers = [];
}
const Xu = `#version 300 es
precision highp float;
out vec2 v_uv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
class Yu {
  constructor(e) {
    this.canvas = e;
    const t = e.getContext("webgl2", {
      alpha: !1,
      antialias: !1,
      depth: !1,
      stencil: !1,
      premultipliedAlpha: !1,
      preserveDrawingBuffer: !0,
      powerPreference: "high-performance",
    });
    if (!t)
      throw new Error(
        "WebGL2 is not available. Check your GPU drivers (try BRUSHBOARD_DISABLE_GPU=1 for software rendering).",
      );
    if (((this.gl = t), !t.getExtension("EXT_color_buffer_float")))
      throw new Error("This GPU does not support rendering to float textures (EXT_color_buffer_float).");
    ((this.floatLinear = !!t.getExtension("OES_texture_float_linear")),
      t.getExtension("EXT_float_blend"),
      (this.maxTex = t.getParameter(t.MAX_TEXTURE_SIZE)),
      (this.emptyVao = t.createVertexArray()),
      t.pixelStorei(t.UNPACK_ALIGNMENT, 1),
      t.pixelStorei(t.PACK_ALIGNMENT, 1),
      t.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL, t.NONE),
      (ha = (n) => this.restore(n)),
      (this.dummy = t.createTexture()),
      t.bindTexture(t.TEXTURE_2D, this.dummy),
      t.texImage2D(t.TEXTURE_2D, 0, t.RGBA8, 1, 1, 0, t.RGBA, t.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])),
      (this.dummy3d = t.createTexture()),
      t.bindTexture(t.TEXTURE_3D, this.dummy3d),
      t.texImage3D(
        t.TEXTURE_3D,
        0,
        t.RGBA8,
        1,
        1,
        1,
        0,
        t.RGBA,
        t.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255]),
      ));
  }
  gl;
  programs = new Map();
  emptyVao;
  pool = new Map();
  floatLinear;
  maxTex;
  live = new Set();
  residentBytes = 0;
  spilledBytes = 0;
  budget = 3 * 1024 * 1024 * 1024;
  tick = 1;
  useSeq = 1;
  protectFrom = 1;
  spillCount = 0;
  restoreCount = 0;
  dummy;
  dummy3d;
  createTex(e, t, n = "rgba16f", i = {}) {
    if (((e = Math.max(1, Math.round(e))), (t = Math.max(1, Math.round(t))), e > this.maxTex || t > this.maxTex))
      throw new Error(`Image too large for this GPU (max ${this.maxTex}px per side)`);
    const a = rt({ w: e, h: t, format: n, mip: i.mip });
    this.residentBytes + a > this.budget && this.enforceBudget(a);
    let o = this.allocHandles(e, t, n, i);
    if (!o && (this.trimPool(), this.enforceBudget(a, !0), (o = this.allocHandles(e, t, n, i)), !o))
      throw new Error(
        `Not enough graphics memory for a ${e}×${t} image buffer. Close other documents, lower the History states in Preferences, or reduce the image size.`,
      );
    const r = new Gt(o.tex, o.fbo, e, t, n, !!i.mip);
    return (
      (r.lastUse = ++this.useSeq),
      this.live.add(r),
      (this.residentBytes += a),
      o.fbo && this.clear(r, null, [0, 0, 0, 0]),
      r
    );
  }
  allocHandles(e, t, n, i) {
    const a = this.gl;
    for (; a.getError() !== a.NO_ERROR;);
    const o = Ro[n],
      r = a.createTexture();
    a.bindTexture(a.TEXTURE_2D, r);
    const l = i.mip ? Math.floor(Math.log2(Math.max(e, t))) + 1 : 1;
    if ((a.texStorage2D(a.TEXTURE_2D, l, o.internal, e, t), a.getError() === a.OUT_OF_MEMORY))
      return (a.deleteTexture(r), null);
    const c = i.linear !== !1 && ((n !== "rgba32f" && n !== "rg32f") || this.floatLinear);
    (a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MIN_FILTER, i.mip ? a.LINEAR_MIPMAP_LINEAR : c ? a.LINEAR : a.NEAREST),
      a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MAG_FILTER, c ? a.LINEAR : a.NEAREST),
      a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_S, a.CLAMP_TO_EDGE),
      a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_T, a.CLAMP_TO_EDGE));
    let u = null;
    if (i.fbo !== !1) {
      ((u = a.createFramebuffer()),
        a.bindFramebuffer(a.FRAMEBUFFER, u),
        a.framebufferTexture2D(a.FRAMEBUFFER, a.COLOR_ATTACHMENT0, a.TEXTURE_2D, r, 0));
      const d = a.checkFramebufferStatus(a.FRAMEBUFFER);
      if ((a.bindFramebuffer(a.FRAMEBUFFER, null), d !== a.FRAMEBUFFER_COMPLETE)) {
        if ((a.deleteFramebuffer(u), a.deleteTexture(r), a.getError() === a.OUT_OF_MEMORY)) return null;
        throw new Error(`Framebuffer incomplete for ${n} (${d.toString(16)})`);
      }
    }
    return { tex: r, fbo: u };
  }
  spill(e) {
    if (!e.spillable || e.spilled || e.disposed || e.mip) return !1;
    const t = [],
      n = Math.max(1, Math.floor((4 * 1024 * 1024) / Math.max(1, e.w)));
    let i = 0;
    for (let o = 0; o < e.h; o += n) {
      const r = Math.min(n, e.h - o),
        l = { x: 0, y: o, w: e.w, h: r };
      if (e.format === "rgba8") {
        const c = this.read8(e, l),
          u = Fo(c, e.w, r, 4, (f) => c[f] | c[f + 1] | c[f + 2] | c[f + 3]);
        if (!u) continue;
        const d = new Uint8Array(u.w * u.h * 4);
        for (let f = 0; f < u.h; f++)
          d.set(c.subarray(((u.y + f) * e.w + u.x) * 4, ((u.y + f) * e.w + u.x + u.w) * 4), f * u.w * 4);
        (t.push({ x: u.x, y: o + u.y, w: u.w, h: u.h, data: d }), (i += d.byteLength));
      } else {
        const c = e.k ? this.readPlane(e, l) : this.read(e, l),
          u = e.format === "r16f" ? 1 : e.format === "rg32f" ? 2 : 4,
          d = Fo(
            c,
            e.w,
            r,
            4,
            e.isPlane
              ? (y) => (c[y + 3] !== 0 ? 1 : 0)
              : (y) =>
                  c[y] !== 0 || (u > 1 && (c[y + 1] !== 0 || (u > 2 && (c[y + 2] !== 0 || c[y + 3] !== 0)))) ? 1 : 0,
          );
        if (!d) continue;
        const f = e.format === "rgba16f" || e.format === "r16f",
          m = f ? new Uint16Array(d.w * d.h * u) : new Float32Array(d.w * d.h * u);
        let v = 0;
        for (let y = 0; y < d.h; y++) {
          let b = ((d.y + y) * e.w + d.x) * 4;
          for (let x = 0; x < d.w; x++, b += 4) for (let w = 0; w < u; w++) m[v++] = f ? Hu(c[b + w]) : c[b + w];
        }
        (t.push({ x: d.x, y: o + d.y, w: d.w, h: d.h, data: m }), (i += m.byteLength));
      }
    }
    const a = this.gl;
    return (
      e._rawFbo && a.deleteFramebuffer(e._rawFbo),
      e._rawTex && a.deleteTexture(e._rawTex),
      e._setHandles(null, null),
      (e.spilled = t),
      (e.spilledBytes = i),
      (this.residentBytes -= rt(e)),
      (this.spilledBytes += i),
      this.spillCount++,
      !0
    );
  }
  restore(e) {
    if (!e.spilled || e.disposed) return;
    const t = e.spilled;
    e.spilled = null;
    const n = rt(e);
    this.residentBytes + n > this.budget && this.enforceBudget(n, !1, e);
    let i = this.allocHandles(e.w, e.h, e.format, {});
    if ((i || (this.trimPool(), this.enforceBudget(n, !0, e), (i = this.allocHandles(e.w, e.h, e.format, {}))), !i))
      throw (
        (e.spilled = t),
        new Error(
          "Not enough graphics memory to bring this layer back. Close other documents or lower the History states in Preferences.",
        )
      );
    e._setHandles(i.tex, i.fbo);
    const a = this.gl;
    (a.bindFramebuffer(a.FRAMEBUFFER, i.fbo),
      a.disable(a.SCISSOR_TEST),
      e.isPlane ? a.clearColor(1, 1, 1, 0) : a.clearColor(0, 0, 0, 0),
      a.clear(a.COLOR_BUFFER_BIT),
      a.bindFramebuffer(a.FRAMEBUFFER, null),
      a.bindTexture(a.TEXTURE_2D, i.tex));
    const o = Ro[e.format];
    for (const r of t)
      e.format === "rgba16f" || e.format === "r16f"
        ? a.texSubImage2D(a.TEXTURE_2D, 0, r.x, r.y, r.w, r.h, o.format, a.HALF_FLOAT, r.data)
        : a.texSubImage2D(a.TEXTURE_2D, 0, r.x, r.y, r.w, r.h, o.format, o.type, r.data);
    ((this.residentBytes += n),
      (this.spilledBytes -= e.spilledBytes || 0),
      (e.spilledBytes = 0),
      (e.lastUse = ++this.useSeq),
      this.restoreCount++);
  }
  enforcing = !1;
  enforceBudget(e = 0, t = !1, n = null) {
    if (!this.enforcing) {
      this.enforcing = !0;
      try {
        this.enforceBudgetInner(e, t, n);
      } finally {
        this.enforcing = !1;
      }
    }
  }
  enforceBudgetInner(e, t, n) {
    const i = (t ? 0.5 : 0.85) * this.budget - e;
    if (this.residentBytes <= i && !t) return;
    for (; this.residentBytes > i && this.poolOrder.length;) this.dropPooled(this.poolOrder[0]);
    const a = [...this.live]
      .filter((o) => o.spillable && !o.spilled && !o.mip && o !== n && o.lastUse < this.protectFrom)
      .sort((o, r) => o.lastUse - r.lastUse);
    for (const o of a) {
      if (this.residentBytes <= i) break;
      this.spill(o);
    }
  }
  touch(e) {
    ((e.lastUse = ++this.useSeq), e.spilled && this.restore(e));
  }
  beginStep() {
    this.protectFrom = this.useSeq + 1;
  }
  dispose(e) {
    !e ||
      e.disposed ||
      (e.spilled ? ((this.spilledBytes -= e.spilledBytes || 0), (e.spilled = null)) : (this.residentBytes -= rt(e)),
      (e.disposed = !0),
      this.live.delete(e),
      e._rawTex && this.gl.deleteTexture(e._rawTex),
      e._rawFbo && this.gl.deleteFramebuffer(e._rawFbo),
      e._setHandles(null, null),
      e.k && this.dispose(e.k));
  }
  createPair(e, t, n, i) {
    const a = this.createTex(e, t, n);
    return ((a.k = this.createTex(e, t, n)), (a.ink = i), (a.isPlane = a.k.isPlane = !0), a);
  }
  createLike(e, t = e.w, n = e.h, i = {}, a = e.format) {
    if (!e.k || !e.ink) return this.createTex(t, n, a, i);
    const o = this.createTex(t, n, a, i);
    return ((o.k = this.createTex(t, n, a, i)), (o.ink = e.ink), (o.isPlane = o.k.isPlane = !0), o);
  }
  acquireLike(e, t) {
    const n = t || (e.format === "r16f" ? "rgba16f" : e.format);
    return !e.k || !e.ink ? this.acquire(e.w, e.h, n) : this.acquirePair(e.w, e.h, n, e.ink);
  }
  acquirePair(e, t, n, i, a = !1) {
    const o = `${e}x${t}:${n}:pair:${i.id}`,
      r = this.pool.get(o);
    let l;
    if (r && r.length) {
      ((l = r.pop()), (this.poolBytes -= rt(l) * 2), (l.lastUse = ++this.useSeq));
      const c = this.poolOrder.indexOf(l);
      c >= 0 && this.poolOrder.splice(c, 1);
    } else l = this.createPair(e, t, n, i);
    return (a && this.clear(l, null, [0, 0, 0, 0]), l);
  }
  inkProg(e) {
    return e === "rgb2ink" ? this.program("rgb2ink", Ju) : this.program("ink2rgb", Zu);
  }
  toPair(e, t, n = null) {
    const i = this.acquirePair(e.w, e.h, e.format === "r16f" || e.format === "rgba8" ? "rgba16f" : e.format, t);
    return (
      this.draw(this.inkProg("rgb2ink"), i, {
        textures: { u_src: e, u_lut: t.rgb2ink },
        uniforms: { u_n: t.rgbN },
        rect: n,
      }),
      i
    );
  }
  toRgb(e, t = null, n = [1, 1, 1, 1], i = -1, a = "rgba32f") {
    const o = this.acquire(e.w, e.h, a);
    return (
      this.draw(this.inkProg("ink2rgb"), o, {
        textures: { u_a: e, u_k: e.k, u_lut: e.ink.ink2rgb },
        uniforms: { u_n: e.ink.inkN, u_chan: n, u_single: i },
        rect: t,
      }),
      (o.isImage = !0),
      o
    );
  }
  createTex3d(e, t, n, i, a) {
    const o = this.gl,
      r = o.createTexture();
    o.bindTexture(o.TEXTURE_3D, r);
    let l = i;
    if (a === 3) {
      l = new Float32Array(e * t * n * 4);
      for (let c = 0, u = 0; c < i.length; c += 3, u += 4)
        ((l[u] = i[c]), (l[u + 1] = i[c + 1]), (l[u + 2] = i[c + 2]), (l[u + 3] = 1));
    }
    (o.texImage3D(o.TEXTURE_3D, 0, o.RGBA16F, e, t, n, 0, o.RGBA, o.FLOAT, l),
      o.texParameteri(o.TEXTURE_3D, o.TEXTURE_MIN_FILTER, o.LINEAR),
      o.texParameteri(o.TEXTURE_3D, o.TEXTURE_MAG_FILTER, o.LINEAR));
    for (const c of [o.TEXTURE_WRAP_S, o.TEXTURE_WRAP_T, o.TEXTURE_WRAP_R])
      o.texParameteri(o.TEXTURE_3D, c, o.CLAMP_TO_EDGE);
    return r;
  }
  acquire(e, t, n = "rgba16f", i = !1) {
    const a = `${e}x${t}:${n}`,
      o = this.pool.get(a);
    let r;
    if (o && o.length) {
      ((r = o.pop()), (this.poolBytes -= rt(r)), (r.lastUse = ++this.useSeq));
      const l = this.poolOrder.indexOf(r);
      l >= 0 && this.poolOrder.splice(l, 1);
    } else r = this.createTex(e, t, n);
    return (i && this.clear(r, null, [0, 0, 0, 0]), r);
  }
  poolBytes = 0;
  poolOrder = [];
  release(e) {
    if (!e || e.disposed) return;
    const t = e.k && e.ink ? `${e.w}x${e.h}:${e.format}:pair:${e.ink.id}` : `${e.w}x${e.h}:${e.format}`;
    let n = this.pool.get(t);
    if ((n || ((n = []), this.pool.set(t, n)), n.includes(e))) return;
    (n.push(e),
      (this.poolBytes += rt(e) * (e.k ? 2 : 1)),
      this.poolOrder.push(e),
      n.length > 4 && this.dropPooled(n[0]));
    const i = Math.min(768 * 1024 * 1024, this.budget / 4);
    for (; this.poolBytes > i && this.poolOrder.length;) this.dropPooled(this.poolOrder[0]);
  }
  dropPooled(e) {
    const t = e.k && e.ink ? `${e.w}x${e.h}:${e.format}:pair:${e.ink.id}` : `${e.w}x${e.h}:${e.format}`,
      n = this.pool.get(t),
      i = n ? n.indexOf(e) : -1,
      a = this.poolOrder.indexOf(e);
    (a >= 0 && this.poolOrder.splice(a, 1),
      !(i < 0) && (n.splice(i, 1), (this.poolBytes -= rt(e) * (e.k ? 2 : 1)), this.dispose(e)));
  }
  trimPool() {
    for (const e of this.pool.values()) {
      for (const t of e) this.dispose(t);
      e.length = 0;
    }
    ((this.poolOrder.length = 0), (this.poolBytes = 0));
  }
  genMips(e) {
    const t = this.gl;
    e.mip && (this.beginStep(), this.touch(e), t.bindTexture(t.TEXTURE_2D, e.tex), t.generateMipmap(t.TEXTURE_2D));
  }
  program(e, t, n = Xu) {
    const i = this.programs.get(e);
    if (i) return i;
    const a = this.gl,
      o = (c, u) => {
        const d = a.createShader(c);
        if ((a.shaderSource(d, u), a.compileShader(d), !a.getShaderParameter(d, a.COMPILE_STATUS))) {
          const f = a.getShaderInfoLog(d),
            m = u
              .split(
                `
`,
              )
              .map((v, y) => `${y + 1}: ${v}`).join(`
`);
          throw (
            console.error(m),
            new Error(`Shader "${e}" failed to compile:
${f}`)
          );
        }
        return d;
      },
      r = a.createProgram();
    if (
      (a.attachShader(r, o(a.VERTEX_SHADER, n)),
      a.attachShader(r, o(a.FRAGMENT_SHADER, t)),
      a.linkProgram(r),
      !a.getProgramParameter(r, a.LINK_STATUS))
    )
      throw new Error(`Program "${e}" failed to link: ${a.getProgramInfoLog(r)}`);
    const l = new Vu(a, r, e);
    return (this.programs.set(e, l), l);
  }
  setUniform(e, t) {
    const n = this.gl,
      i = e.loc,
      a = typeof t == "number" ? [t] : typeof t == "boolean" ? [t ? 1 : 0] : t;
    switch (e.type) {
      case n.FLOAT:
        e.size > 1 ? n.uniform1fv(i, a) : n.uniform1f(i, a[0]);
        break;
      case n.FLOAT_VEC2:
        n.uniform2fv(i, a);
        break;
      case n.FLOAT_VEC3:
        n.uniform3fv(i, a);
        break;
      case n.FLOAT_VEC4:
        n.uniform4fv(i, a);
        break;
      case n.INT:
      case n.BOOL:
        e.size > 1 ? n.uniform1iv(i, a) : n.uniform1i(i, a[0]);
        break;
      case n.INT_VEC2:
        n.uniform2iv(i, a);
        break;
      case n.FLOAT_MAT3:
        n.uniformMatrix3fv(i, !1, a);
        break;
      case n.FLOAT_MAT4:
        n.uniformMatrix4fv(i, !1, a);
        break;
      default:
        throw new Error("Unsupported uniform type " + e.type);
    }
  }
  bindTarget(e) {
    const t = this.gl;
    e
      ? (t.bindFramebuffer(t.FRAMEBUFFER, e.fbo), t.viewport(0, 0, e.w, e.h))
      : (t.bindFramebuffer(t.FRAMEBUFFER, null), t.viewport(0, 0, this.canvas.width, this.canvas.height));
  }
  draw(e, t, n = {}) {
    if (t && t.k && t.ink) {
      this.drawPair(e, t, n);
      return;
    }
    this.drawOne(e, t, n);
  }
  drawPair(e, t, n) {
    const i = t.ink,
      a = [],
      o = {},
      r = {};
    for (const u in n.textures || {}) {
      let d = n.textures[u];
      if (e.name !== "rgb2ink" && d instanceof Gt && !d.k && d.isImage && d !== t) {
        const f = this.toPair(d, i);
        (a.push(f), (d = f));
      }
      ((o[u] = d), (r[u] = d instanceof Gt && d.k ? d.k : d));
    }
    const l = { ...(n.uniforms || {}), u_plane: 0 },
      c = { ...(n.uniforms || {}), u_plane: 1 };
    for (const u of [...ju, ...(n.inkUniforms || [])]) {
      const d = n.uniforms?.[u];
      if (!d || typeof d == "number") continue;
      const f = os(d, i),
        m = d.length > 3 ? d[3] : null;
      ((l[u] = m === null ? [1 - f[0], 1 - f[1], 1 - f[2]] : [1 - f[0], 1 - f[1], 1 - f[2], m]),
        (c[u] = m === null ? [1 - f[3], 1 - f[3], 1 - f[3]] : [1 - f[3], 1 - f[3], 1 - f[3], m]));
    }
    (this.drawOne(e, t, { ...n, textures: o, uniforms: l }), this.drawOne(e, t.k, { ...n, textures: r, uniforms: c }));
    for (const u of a) this.release(u);
  }
  drawOne(e, t, n = {}) {
    const i = this.gl;
    if (t && t.disposed) throw new Error("Drawing into disposed texture");
    if ((this.beginStep(), t && this.touch(t), n.textures))
      for (const l in n.textures) {
        const c = n.textures[l];
        if (c instanceof Gt) {
          if (c.disposed) throw new Error(`Sampling a disposed texture (${l})`);
          this.touch(c);
        }
      }
    if ((this.bindTarget(t), n.rect)) {
      const l = ae(n.rect, t ? t.w : this.canvas.width, t ? t.h : this.canvas.height);
      if (l.w <= 0 || l.h <= 0) return;
      (i.enable(i.SCISSOR_TEST), i.scissor(l.x, l.y, l.w, l.h));
    } else i.disable(i.SCISSOR_TEST);
    (n.clear && (i.clearColor(n.clear[0], n.clear[1], n.clear[2], n.clear[3]), i.clear(i.COLOR_BUFFER_BIT)),
      i.useProgram(e.prog));
    let a = 0;
    for (const l of e.samplers) {
      const c = n.textures ? n.textures[l] : void 0,
        u = e.uniforms.get(l);
      if ((i.activeTexture(i.TEXTURE0 + a), u.type === i.SAMPLER_3D)) i.bindTexture(i.TEXTURE_3D, c || this.dummy3d);
      else {
        const d = c instanceof Gt ? c.tex : c;
        if (c instanceof Gt && c === t) throw new Error(`Feedback loop in ${e.name}: ${l}`);
        i.bindTexture(i.TEXTURE_2D, d || this.dummy);
      }
      (i.uniform1i(u.loc, a), a++);
    }
    const o = e.uniforms.get("u_plane");
    if ((o && !(n.uniforms && "u_plane" in n.uniforms) && i.uniform1i(o.loc, 0), n.uniforms))
      for (const l in n.uniforms) {
        const c = e.uniforms.get(l);
        c && this.setUniform(c, n.uniforms[l]);
      }
    switch (n.blend || "none") {
      case "none":
        i.disable(i.BLEND);
        break;
      case "over":
        (i.enable(i.BLEND), i.blendEquation(i.FUNC_ADD), i.blendFunc(i.ONE, i.ONE_MINUS_SRC_ALPHA));
        break;
      case "add":
        (i.enable(i.BLEND), i.blendEquation(i.FUNC_ADD), i.blendFunc(i.ONE, i.ONE));
        break;
      case "max":
        (i.enable(i.BLEND), i.blendEquation(i.MAX), i.blendFunc(i.ONE, i.ONE));
        break;
      case "min":
        (i.enable(i.BLEND), i.blendEquation(i.MIN), i.blendFunc(i.ONE, i.ONE));
        break;
      case "multiply":
        (i.enable(i.BLEND), i.blendEquation(i.FUNC_ADD), i.blendFunc(i.DST_COLOR, i.ZERO));
        break;
    }
    i.bindVertexArray(n.vao || this.emptyVao);
    const r = n.mode ?? i.TRIANGLES;
    (n.instances ? i.drawArraysInstanced(r, 0, n.count ?? 6, n.instances) : i.drawArrays(r, 0, n.count ?? 3),
      i.bindVertexArray(null),
      i.disable(i.BLEND),
      i.disable(i.SCISSOR_TEST));
  }
  clear(e, t = null, n = [0, 0, 0, 0]) {
    if (e && e.k && e.ink) {
      if (n[3] === 0) {
        (this.clear1(e, t, [1, 1, 1, 0]), this.clear1(e.k, t, [1, 1, 1, 0]));
        return;
      }
      const i = os(n.slice(0, 3), e.ink);
      (this.clear1(e, t, [1 - i[0], 1 - i[1], 1 - i[2], n[3]]),
        this.clear1(e.k, t, [1 - i[3], 1 - i[3], 1 - i[3], n[3]]));
      return;
    }
    this.clear1(e, t, n);
  }
  clear1(e, t = null, n = [0, 0, 0, 0]) {
    const i = this.gl;
    if ((this.beginStep(), e && this.touch(e), this.bindTarget(e), t)) {
      const a = ae(t, e ? e.w : this.canvas.width, e ? e.h : this.canvas.height);
      if (a.w <= 0 || a.h <= 0) return;
      (i.enable(i.SCISSOR_TEST), i.scissor(a.x, a.y, a.w, a.h));
    }
    (i.clearColor(n[0], n[1], n[2], n[3]), i.clear(i.COLOR_BUFFER_BIT), i.disable(i.SCISSOR_TEST));
  }
  copy(e, t, n = null, i = 0, a = 0) {
    const o = n || { x: 0, y: 0, w: e.w, h: e.h };
    if (e.k && e.ink && !t.k && t.format !== "r16f") {
      const l = this.toRgb(e, o);
      (this.copy(l, t, n, i, a), this.release(l), (t.isImage = !0));
      return;
    }
    const r = this.program("copy", Ku);
    this.draw(r, t, {
      textures: { u_src: e },
      uniforms: { u_offset: [o.x - i, o.y - a] },
      rect: { x: i, y: a, w: o.w, h: o.h },
    });
  }
  clone(e, t) {
    const n = this.createLike(e, e.w, e.h, {}, t || e.format);
    return (this.copy(e, n), n);
  }
  read(e, t = null) {
    if (e.k && e.ink) {
      const l = this.toRgb(e, t),
        c = this.read(l, t);
      return (this.release(l), c);
    }
    const n = t || { x: 0, y: 0, w: e.w, h: e.h },
      i = this.gl;
    let a = e,
      o = null;
    (e.format !== "rgba32f" || n.x || n.y || n.w !== e.w || n.h !== e.h) &&
      ((o = this.acquire(n.w, n.h, "rgba32f")),
      this.draw(this.program("copyExpand", Do), o, {
        textures: { u_src: e },
        uniforms: { u_offset: [n.x, n.y], u_gray: e.format === "r16f" ? 1 : 0 },
      }),
      (a = o));
    const r = new Float32Array(n.w * n.h * 4);
    return (
      this.beginStep(),
      this.touch(a),
      i.bindFramebuffer(i.FRAMEBUFFER, a.fbo),
      i.readPixels(0, 0, n.w, n.h, i.RGBA, i.FLOAT, r),
      i.bindFramebuffer(i.FRAMEBUFFER, null),
      o && this.release(o),
      r
    );
  }
  read8(e, t = null) {
    if (e.k && e.ink) {
      const r = this.toRgb(e, t),
        l = this.read8(r, t);
      return (this.release(r), l);
    }
    const n = t || { x: 0, y: 0, w: e.w, h: e.h },
      i = this.gl,
      a = this.acquire(n.w, n.h, "rgba8");
    this.draw(this.program("copyExpand", Do), a, {
      textures: { u_src: e },
      uniforms: { u_offset: [n.x, n.y], u_gray: e.format === "r16f" ? 1 : 0 },
    });
    const o = new Uint8Array(n.w * n.h * 4);
    return (
      i.bindFramebuffer(i.FRAMEBUFFER, a.fbo),
      i.readPixels(0, 0, n.w, n.h, i.RGBA, i.UNSIGNED_BYTE, o),
      i.bindFramebuffer(i.FRAMEBUFFER, null),
      this.release(a),
      o
    );
  }
  upload(e, t, n = null) {
    if (e.k && e.ink) {
      const o = n || { x: 0, y: 0, w: e.w, h: e.h },
        r = this.acquire(e.w, e.h, "rgba32f");
      (this.upload(r, t, o), (r.isImage = !0));
      const l = this.toPair(r, e.ink, o);
      (this.copy(l, e, o, o.x, o.y), this.release(l), (r.isImage = !1), this.release(r));
      return;
    }
    const i = n || { x: 0, y: 0, w: e.w, h: e.h },
      a = this.gl;
    if ((this.beginStep(), this.touch(e), a.bindTexture(a.TEXTURE_2D, e.tex), e.format === "r16f")) {
      if (t.length === i.w * i.h * 4) {
        const o = new Float32Array(i.w * i.h);
        for (let r = 0; r < o.length; r++) o[r] = t[r * 4];
        t = o;
      }
      a.texSubImage2D(a.TEXTURE_2D, 0, i.x, i.y, i.w, i.h, a.RED, a.FLOAT, t);
    } else if (e.format === "rgba8") {
      const o = new Uint8Array(t.length);
      for (let r = 0; r < t.length; r++) o[r] = Math.max(0, Math.min(255, Math.round(t[r] * 255)));
      a.texSubImage2D(a.TEXTURE_2D, 0, i.x, i.y, i.w, i.h, a.RGBA, a.UNSIGNED_BYTE, o);
    } else a.texSubImage2D(a.TEXTURE_2D, 0, i.x, i.y, i.w, i.h, a.RGBA, a.FLOAT, t);
  }
  readInk(e, t = null) {
    const n = t || { x: 0, y: 0, w: e.w, h: e.h },
      i = this.readPlane(e, n),
      a = this.readPlane(e.k, n),
      o = new Float32Array(n.w * n.h * 5);
    for (let r = 0, l = 0, c = 0; r < n.w * n.h; r++, l += 4, c += 5)
      ((o[c] = 1 - i[l]),
        (o[c + 1] = 1 - i[l + 1]),
        (o[c + 2] = 1 - i[l + 2]),
        (o[c + 3] = 1 - a[l]),
        (o[c + 4] = i[l + 3]));
    return o;
  }
  uploadInk(e, t, n = null) {
    const i = n || { x: 0, y: 0, w: e.w, h: e.h },
      a = i.w * i.h,
      o = new Float32Array(a * 4),
      r = new Float32Array(a * 4);
    for (let l = 0, c = 0, u = 0; l < a; l++, c += 4, u += 5)
      ((o[c] = 1 - t[u]),
        (o[c + 1] = 1 - t[u + 1]),
        (o[c + 2] = 1 - t[u + 2]),
        (o[c + 3] = t[u + 4]),
        (r[c] = r[c + 1] = r[c + 2] = 1 - t[u + 3]),
        (r[c + 3] = t[u + 4]));
    (this.uploadPlane(e, o, i), this.uploadPlane(e.k, r, i));
  }
  readPlane(e, t = null) {
    const n = e.k,
      i = e.ink;
    ((e.k = null), (e.ink = null));
    try {
      return this.read(e, t);
    } finally {
      ((e.k = n), (e.ink = i));
    }
  }
  uploadPlane(e, t, n = null) {
    const i = e.k,
      a = e.ink;
    ((e.k = null), (e.ink = null));
    try {
      this.upload(e, t, n);
    } finally {
      ((e.k = i), (e.ink = a));
    }
  }
  uploadImage8(e, t, n) {
    const i = this.gl,
      a = this.createTex(t, n, "rgba8");
    return (
      (a.isImage = !0),
      i.bindTexture(i.TEXTURE_2D, a.tex),
      i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1),
      e instanceof Uint8Array || e instanceof Uint8ClampedArray
        ? i.texSubImage2D(
            i.TEXTURE_2D,
            0,
            0,
            0,
            t,
            n,
            i.RGBA,
            i.UNSIGNED_BYTE,
            new Uint8Array(e.buffer, e.byteOffset, e.byteLength),
          )
        : i.texSubImage2D(i.TEXTURE_2D, 0, 0, 0, t, n, i.RGBA, i.UNSIGNED_BYTE, e),
      a
    );
  }
  createLut3d(e, t) {
    const n = this.gl,
      i = n.createTexture();
    (n.bindTexture(n.TEXTURE_3D, i),
      n.texImage3D(n.TEXTURE_3D, 0, n.RGBA16F, t, t, t, 0, n.RGBA, n.FLOAT, e),
      n.texParameteri(n.TEXTURE_3D, n.TEXTURE_MIN_FILTER, n.LINEAR),
      n.texParameteri(n.TEXTURE_3D, n.TEXTURE_MAG_FILTER, n.LINEAR));
    for (const a of [n.TEXTURE_WRAP_S, n.TEXTURE_WRAP_T, n.TEXTURE_WRAP_R])
      n.texParameteri(n.TEXTURE_3D, a, n.CLAMP_TO_EDGE);
    return i;
  }
}
function Fo(s, e, t, n, i) {
  let a = e,
    o = t,
    r = -1,
    l = -1;
  for (let c = 0; c < t; c++) {
    let u = c * e * n;
    for (let d = 0; d < e; d++, u += n) i(u) && (d < a && (a = d), d > r && (r = d), c < o && (o = c), (l = c));
  }
  return r < 0 ? null : { x: a, y: o, w: r - a + 1, h: l - o + 1 };
}
function ae(s, e, t) {
  const n = Math.max(0, Math.floor(s.x)),
    i = Math.max(0, Math.floor(s.y)),
    a = Math.min(e, Math.ceil(s.x + s.w)),
    o = Math.min(t, Math.ceil(s.y + s.h));
  return { x: n, y: i, w: Math.max(0, a - n), h: Math.max(0, o - i) };
}
function Ki(s, e) {
  if (!s) return e ? { ...e } : null;
  if (!e) return { ...s };
  const t = Math.min(s.x, e.x),
    n = Math.min(s.y, e.y),
    i = Math.max(s.x + s.w, e.x + e.w),
    a = Math.max(s.y + s.h, e.y + e.h);
  return { x: t, y: n, w: i - t, h: a - n };
}
function Ve(s, e) {
  return { x: s.x - e, y: s.y - e, w: s.w + 2 * e, h: s.h + 2 * e };
}
const Ku = `#version 300 es
precision highp float;
uniform highp sampler2D u_src;
uniform vec2 u_offset;
out vec4 o;
void main(){ o = texelFetch(u_src, ivec2(gl_FragCoord.xy + u_offset), 0); }`,
  Do = `#version 300 es
precision highp float;
uniform highp sampler2D u_src;
uniform vec2 u_offset;
uniform float u_gray;
out vec4 o;
void main(){
  vec4 c = texelFetch(u_src, ivec2(gl_FragCoord.xy + u_offset), 0);
  o = u_gray > 0.5 ? vec4(c.rrr, 1.0) : c;
}`,
  Ju = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform highp sampler2D u_src;
uniform sampler3D u_lut;
uniform float u_n;
uniform int u_plane;
out vec4 o;
void main(){
  vec4 c = texelFetch(u_src, ivec2(gl_FragCoord.xy), 0);
  vec3 q = clamp(c.rgb, 0.0, 1.0) * ((u_n - 1.0) / u_n) + 0.5 / u_n;
  vec4 ink = texture(u_lut, q);
  o = u_plane == 1 ? vec4(vec3(1.0 - ink.a), c.a) : vec4(1.0 - ink.rgb, c.a);
}`,
  Zu = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform highp sampler2D u_a;
uniform highp sampler2D u_k;
uniform sampler3D u_lut;
uniform float u_n;
uniform vec4 u_chan;
uniform int u_single;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(u_a, p, 0);
  float k = 1.0 - texelFetch(u_k, p, 0).r;
  vec4 ink = clamp(vec4(1.0 - a.rgb, k), 0.0, 1.0) * u_chan;
  if(u_single >= 0){ float v = u_single == 0 ? ink.r : u_single == 1 ? ink.g : u_single == 2 ? ink.b : ink.a; o = vec4(vec3(1.0 - v), a.a); return; }
  float n1 = u_n - 1.0;
  float kf = ink.a * n1;
  float k0 = min(floor(kf), n1 - 1.0);
  float t = kf - k0;
  vec2 uv = (ink.rg * n1 + 0.5) / u_n;
  float depth = u_n * u_n;
  float z0 = (k0 * u_n + ink.b * n1 + 0.5) / depth;
  float z1 = ((k0 + 1.0) * u_n + ink.b * n1 + 0.5) / depth;
  vec3 rgb = mix(texture(u_lut, vec3(uv, z0)).rgb, texture(u_lut, vec3(uv, z1)).rgb, t);
  o = vec4(rgb, a.a);
}`;
let g = null;
function Qu(s) {
  return ((g = new Yu(s)), g);
}
const da = new Map(),
  zn = new Map();
let Rs = null;
const eh = "fogra39";
async function Li(s = !1) {
  return ((Rs && !s) || (Rs = (await window.brushboard.python.call("core", "cmyk_profiles", {})).result || []), Rs);
}
function rs(s) {
  return Rs?.find((e) => e.id === s || e.path === s)?.tac ?? (s === "snap2" ? 260 : 300);
}
function st(s, e = 1) {
  const t = e === 1 ? s : `${s}#${e}`,
    n = da.get(t);
  if (n) return Promise.resolve(n);
  let i = zn.get(t);
  return (
    i ||
      ((i = (async () => {
        const a = await window.brushboard.python.call("core", "cmyk_luts", { profile: s, size: 33, intent: e }),
          o = a.result,
          r = new Float32Array(a.buffers.rgb2ink.data),
          l = new Float32Array(a.buffers.ink2rgb.data),
          c = o.rgbSize,
          u = o.inkSize,
          d = {
            id: t,
            name: o.name,
            path: o.path,
            rgb2ink: g.createTex3d(c, c, c, r, 4),
            rgbN: c,
            ink2rgb: g.createTex3d(u, u, u * u, l, 3),
            inkN: u,
            toInk: (f) => sh(r, c, f),
            toRgb: (f) => nh(l, u, f),
          };
        return (da.set(t, d), zn.delete(t), d);
      })()),
      i.catch(() => zn.delete(t)),
      zn.set(t, i)),
    i
  );
}
function th(s) {
  return da.get(s) || null;
}
function sh(s, e, t) {
  const n = (v) => Math.min(e - 1 - 1e-6, Math.max(0, v) * (e - 1)),
    i = n(t[0]),
    a = n(t[1]),
    o = n(t[2]),
    r = Math.floor(i),
    l = Math.floor(a),
    c = Math.floor(o),
    u = i - r,
    d = a - l,
    f = o - c,
    m = [0, 0, 0, 0];
  for (let v = 0; v < 8; v++) {
    const y = r + (v & 1),
      b = l + ((v >> 1) & 1),
      x = c + ((v >> 2) & 1),
      w = (v & 1 ? u : 1 - u) * ((v >> 1) & 1 ? d : 1 - d) * ((v >> 2) & 1 ? f : 1 - f);
    if (!w) continue;
    const _ = ((x * e + b) * e + y) * 4;
    ((m[0] += s[_] * w), (m[1] += s[_ + 1] * w), (m[2] += s[_ + 2] * w), (m[3] += s[_ + 3] * w));
  }
  return m.map((v) => Math.min(1, Math.max(0, v)));
}
function nh(s, e, t) {
  const n = t.slice(0, 4).map((r) => Math.min(e - 1 - 1e-6, Math.max(0, r) * (e - 1))),
    i = n.map(Math.floor),
    a = n.map((r, l) => r - i[l]),
    o = [0, 0, 0];
  for (let r = 0; r < 16; r++) {
    let l = 1,
      c = 0,
      u = 1;
    for (let d = 0; d < 4; d++) {
      const f = (r >> d) & 1;
      ((l *= f ? a[d] : 1 - a[d]), (c += (i[d] + f) * u), (u *= e));
    }
    l && ((o[0] += s[c * 3] * l), (o[1] += s[c * 3 + 1] * l), (o[2] += s[c * 3 + 2] * l));
  }
  return o.map((r) => Math.min(1, Math.max(0, r)));
}
const Qt = new Map(),
  Fr = (s, e) => `${s}|${e[0].toFixed(5)},${e[1].toFixed(5)},${e[2].toFixed(5)}`;
function Na(s, e, t) {
  (Qt.set(Fr(t.id, s), e.slice(0, 4)), Qt.size > 512 && Qt.delete(Qt.keys().next().value));
}
function Dr(s, e) {
  return Qt.get(Fr(e.id, s)) || null;
}
function zr(s) {
  const e = [];
  for (const [t, n] of Qt) {
    const [i, a] = t.split("|");
    i === s.id && e.push([a.split(",").map(Number), n]);
  }
  return e;
}
function Xs(s, e) {
  const t = e.toRgb(s);
  return ((t.ink = s.slice(0, 4)), Na(t, s, e), t);
}
function ih(s, e) {
  return s.ink || e.toInk(s);
}
function ri(s) {
  const e = [...s];
  return (s.ink && (e.ink = [...s.ink]), e);
}
Gu((s, e) => Dr(s, e));
const Fs = (s) => Math.round(s * 100);
function Ir(s) {
  return `C ${Fs(s[0])}  M ${Fs(s[1])}  Y ${Fs(s[2])}  K ${Fs(s[3])}`;
}
const ah = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        DEFAULT_CMYK: eh,
        cmykProfiles: Li,
        copyColor: ri,
        defaultTac: rs,
        inkColor: Xs,
        inkLabel: Ir,
        inkMemo: zr,
        inkOfColor: ih,
        inkSpaceSync: th,
        loadInk: st,
        pct: Fs,
        rememberInk: Na,
        rememberedInk: Dr,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  zo = {
    historyStates: 60,
    checkerSize: 8,
    checker1: "#ffffff",
    checker2: "#cccccc",
    pasteboard: "",
    wheelZooms: !1,
    pixelGrid: !0,
    showRulers: !0,
    recentFiles: [],
    uiScale: 1,
    defaultBitDepth: 8,
    gpuBudgetMB: 3072,
  },
  Ys = {
    name: "Soft Round",
    tip: "round",
    size: 40,
    hardness: 0,
    opacity: 1,
    flow: 1,
    spacing: 0.1,
    angle: 0,
    roundness: 1,
    sizePressure: !0,
    opacityPressure: !1,
    flowPressure: !1,
    minSize: 0.15,
    sizeJitter: 0,
    angleJitter: 0,
    scatter: 0,
    hueJitter: 0,
    smoothing: 0.1,
    mode: "normal",
    buildup: !1,
    grain: 0,
    grainScale: 2.5,
    grainPressure: !1,
    wetEdges: 0,
    bristles: 20,
    bristleDry: 0,
    particles: 0,
    particleSize: 1,
    followDirection: !1,
    speedSize: 0,
    taper: 0,
    tiltAngle: !1,
    tiltSize: 0,
    tiltOpacity: 0,
    twistAngle: !1,
    mixWet: 0.5,
    mixLoad: 0.5,
    category: "General",
  };
function oh(s) {
  const e = {
    BracketLeft: "[",
    BracketRight: "]",
    Equal: "=",
    Minus: "-",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Backquote: "`",
    Space: "Space",
    NumpadAdd: "=",
    NumpadSubtract: "-",
  };
  let t = s.code;
  return (
    t.startsWith("Key")
      ? (t = t.slice(3))
      : t.startsWith("Digit")
        ? (t = t.slice(5))
        : t.startsWith("Numpad") && /\d$/.test(t)
          ? (t = t.slice(6))
          : e[t] && (t = e[t]),
    [
      ...[s.ctrlKey || s.metaKey ? "Ctrl" : "", s.altKey ? "Alt" : "", s.shiftKey ? "Shift" : ""].filter(Boolean),
      t,
    ].join("+")
  );
}
class B extends Error {
  hint = !0;
}
class rh {
  docs = [];
  doc = null;
  fg = [0, 0, 0];
  bg = [1, 1, 1];
  tools = new Map();
  tool = null;
  groupCurrent = new Map();
  commands = new Map();
  prefs = { ...zo };
  brushes = new Map();
  swatches = [];
  brushPresets = [];
  python = { python: null, capabilities: {} };
  extensions = [];
  toolSettings = {};
  spaceHeld = !1;
  prefsTimer = null;
  addDoc(e) {
    ((e.historyLimit = this.prefs.historyStates),
      this.docs.push(e),
      this.setDoc(e),
      k.emit("docs:changed"),
      k.emit("view:fit", e));
  }
  setDoc(e) {
    if (this.doc === e) return;
    try {
      this.tool?.commit?.();
    } catch (n) {
      this.error(n);
    }
    const t = this.doc;
    ((this.doc = e),
      e && e.wake(),
      t && t !== e && this.docs.includes(t) && t.sleep(),
      k.emit("doc:active", e),
      k.emit("doc:layers", e),
      k.emit("doc:history", e),
      k.emit("doc:selection", e),
      e && e.invalidate(),
      k.emit("render"));
  }
  removeDoc(e) {
    const t = this.docs.indexOf(e);
    t < 0 ||
      (this.doc === e && this.tool?.cancel?.(),
      this.docs.splice(t, 1),
      e.dispose(),
      this.doc === e && this.setDoc(this.docs[Math.min(t, this.docs.length - 1)] || null),
      k.emit("docs:changed"));
  }
  registerTool(e) {
    (this.tools.set(e.id, e), this.groupCurrent.has(e.group) || this.groupCurrent.set(e.group, e.id));
  }
  switchingTool = !1;
  setTool(e) {
    const t = this.tools.get(e);
    if (!t || t === this.tool) {
      k.emit("tool:changed", this.tool);
      return;
    }
    if (!this.switchingTool) {
      this.switchingTool = !0;
      try {
        const n = this.tool;
        try {
          n?.commit?.();
        } catch (i) {
          this.error(i);
        }
        try {
          n?.deactivate?.();
        } catch (i) {
          this.error(i);
        }
        ((this.tool = t), t.group !== "_hidden" && this.groupCurrent.set(t.group, t.id), t.activate?.());
      } finally {
        this.switchingTool = !1;
      }
      (k.emit("tool:changed", t), k.emit("render"));
    }
  }
  brushFor(e) {
    let t = this.brushes.get(e);
    return (
      t ||
        ((t = { ...Ys }),
        e === "pencil" &&
          ((t.size = 2), (t.hardness = 1), (t.name = "Pencil"), (t.sizePressure = !1), (t.smoothing = 0)),
        e === "eraser" && ((t.hardness = 0.6), (t.name = "Eraser")),
        ["clone", "heal", "spotHeal"].includes(e) && ((t.hardness = 0.5), (t.size = 60), (t.sizePressure = !1)),
        e === "mixer" &&
          Object.assign(t, {
            name: "Mixer Bristle",
            tip: "bristle",
            size: 44,
            hardness: 0.5,
            spacing: 0.05,
            bristles: 26,
            followDirection: !0,
            sizePressure: !0,
            minSize: 0.4,
            mixWet: 0.6,
            mixLoad: 0.45,
            smoothing: 0.2,
          }),
        ["smudge", "blur", "sharpen", "dodge", "burn", "sponge"].includes(e) &&
          ((t.size = 60), (t.hardness = 0.2), (t.spacing = 0.15), (t.sizePressure = !1)),
        this.brushes.set(e, t)),
      t
    );
  }
  setting(e, t) {
    return e in this.toolSettings ? this.toolSettings[e] : t;
  }
  set(e, t) {
    ((this.toolSettings[e] = t), this.savePrefsSoon(), k.emit("settings:changed", e));
  }
  setFg(e) {
    ((this.fg = ri(e)), k.emit("colors:changed"));
  }
  setBg(e) {
    ((this.bg = ri(e)), k.emit("colors:changed"));
  }
  swapColors() {
    (([this.fg, this.bg] = [this.bg, this.fg]), k.emit("colors:changed"));
  }
  resetColors() {
    ((this.fg = [0, 0, 0]), (this.bg = [1, 1, 1]), k.emit("colors:changed"));
  }
  command(e) {
    this.commands.set(e.id, e);
  }
  async run(e) {
    const t = this.commands.get(e);
    if (!t) {
      console.warn("unknown command", e);
      return;
    }
    if (!(t.enabled && !t.enabled()))
      try {
        await t.run();
      } catch (n) {
        this.error(n);
      }
  }
  shortcutMap() {
    const e = new Map();
    for (const t of this.commands.values()) if (t.shortcut) for (const n of t.shortcut.split("|")) e.set(n, t.id);
    return e;
  }
  notify(e, t = "info", n = 3500) {
    k.emit("toast", { msg: e, kind: t, ms: n });
  }
  error(e) {
    if (e && e.hint) {
      this.notify(e.message, "info", 4500);
      return;
    }
    console.error(e);
    let t = e?.message || String(e);
    const n = t.indexOf(`
@@TRACEBACK@@
`);
    (n >= 0 && (t = t.slice(0, n)), this.notify(t, "error", 7e3));
  }
  status(e) {
    k.emit("status", e);
  }
  async loadPrefs() {
    try {
      const e = await window.brushboard.prefs.get();
      ((this.prefs = { ...zo, ...e }),
        e.swatches && (this.swatches = e.swatches),
        e.brushPresets && (this.brushPresets = e.brushPresets),
        e.toolSettings && (this.toolSettings = e.toolSettings));
    } catch (e) {
      console.warn("prefs", e);
    }
  }
  savePrefsSoon() {
    (clearTimeout(this.prefsTimer), (this.prefsTimer = setTimeout(() => this.savePrefs(), 600)));
  }
  async savePrefs() {
    ((this.prefs.swatches = this.swatches),
      (this.prefs.brushPresets = this.brushPresets),
      (this.prefs.toolSettings = this.toolSettings));
    try {
      const e = await window.brushboard.prefs.get();
      this.prefs.disabledExtensions = e.disabledExtensions;
    } catch {}
    await window.brushboard.prefs.set(this.prefs);
  }
  addRecent(e) {
    const t = this.prefs.recentFiles.filter((n) => n !== e);
    (t.unshift(e), (this.prefs.recentFiles = t.slice(0, 15)), this.savePrefsSoon(), k.emit("recent:changed"));
  }
}
const h = new rh();
window.__brushboard = h;
function p(s, e = null, ...t) {
  const n = document.createElement(s);
  if (e)
    for (const i in e) {
      const a = e[i];
      a == null ||
        a === !1 ||
        (i === "class"
          ? (n.className = a)
          : i === "style" && typeof a == "object"
            ? Object.assign(n.style, a)
            : i.startsWith("on") && typeof a == "function"
              ? n.addEventListener(i.slice(2).toLowerCase(), a)
              : i === "html"
                ? (n.innerHTML = a)
                : i in n && typeof a != "string"
                  ? (n[i] = a)
                  : n.setAttribute(i, a === !0 ? "" : String(a)));
    }
  return (Or(n, t), n);
}
function Or(s, e) {
  for (const t of e)
    t == null ||
      t === !1 ||
      (Array.isArray(t)
        ? Or(s, t)
        : s.appendChild(typeof t == "string" || typeof t == "number" ? document.createTextNode(String(t)) : t));
}
function te(s) {
  for (; s.firstChild;) s.removeChild(s.firstChild);
  return s;
}
function Ks(s, e = "ico") {
  return p("span", { class: e, html: s });
}
function qe(s) {
  return (
    "#" +
    s
      .slice(0, 3)
      .map((e) =>
        Math.round(Math.max(0, Math.min(1, e)) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function nt(s) {
  const e = s.trim().replace(/^#/, ""),
    t =
      e.length === 3
        ? e
            .split("")
            .map((n) => n + n)
            .join("")
        : e;
  return /^[0-9a-f]{6}$/i.test(t)
    ? [parseInt(t.slice(0, 2), 16) / 255, parseInt(t.slice(2, 4), 16) / 255, parseInt(t.slice(4, 6), 16) / 255]
    : null;
}
function fe(s, e = 1) {
  return `rgba(${Math.round(s[0] * 255)},${Math.round(s[1] * 255)},${Math.round(s[2] * 255)},${e})`;
}
function pa(s, e, t) {
  const n = Math.max(s, e, t),
    i = Math.min(s, e, t),
    a = n - i;
  let o = 0;
  return (
    a &&
      (n === s ? (o = ((e - t) / a) % 6) : n === e ? (o = (t - s) / a + 2) : (o = (s - e) / a + 4),
      (o /= 6),
      o < 0 && (o += 1)),
    [o, n ? a / n : 0, n]
  );
}
function Ji(s, e, t) {
  const n = (i) => {
    const a = (i + s * 6) % 6;
    return t - t * e * Math.max(0, Math.min(a, 4 - a, 1));
  };
  return [n(5), n(3), n(1)];
}
function q(s) {
  const { min: e = -1 / 0, max: t = 1 / 0, step: n = 1 } = s,
    i = n < 1 ? Math.min(3, String(n).split(".")[1]?.length ?? 2) : 0,
    a = p("input", {
      type: "text",
      class: "num",
      value: o(s.value),
      style: s.width ? { width: s.width + "px" } : void 0,
    });
  function o(d) {
    return i ? d.toFixed(i) : String(Math.round(d));
  }
  const r = (d) => Math.min(t, Math.max(e, d)),
    l = () => {
      let d = parseFloat(a.value);
      (Number.isFinite(d) || (d = s.value), (d = r(d)), (a.value = o(d)), (s.value = d), s.onInput(d), s.onCommit?.(d));
    };
  (a.addEventListener("change", l),
    a.addEventListener("keydown", (d) => {
      if ((d.stopPropagation(), d.key === "Enter" && (l(), a.blur()), d.key === "ArrowUp" || d.key === "ArrowDown")) {
        d.preventDefault();
        const f = (d.key === "ArrowUp" ? 1 : -1) * n * (d.shiftKey ? 10 : 1),
          m = r((parseFloat(a.value) || 0) + f);
        ((a.value = o(m)), (s.value = m), s.onInput(m));
      }
    }));
  const c = s.label ? p("label", { class: "scrub" }, s.label) : null;
  c &&
    c.addEventListener("pointerdown", (d) => {
      d.preventDefault();
      const f = d.clientX,
        m = parseFloat(a.value) || 0;
      c.setPointerCapture(d.pointerId);
      const v = (b) => {
          const x = Number.isFinite(t - e) ? t - e : 200,
            w = b.shiftKey ? 10 : b.altKey ? 0.1 : 1,
            _ = r(m + Math.round(((((b.clientX - f) * x) / 300) * w) / n) * n);
          ((a.value = o(_)), (s.value = _), s.onInput(_));
        },
        y = () => {
          (c.removeEventListener("pointermove", v), c.removeEventListener("pointerup", y), s.onCommit?.(s.value));
        };
      (c.addEventListener("pointermove", v), c.addEventListener("pointerup", y));
    });
  const u = p("span", { class: "numfield" }, c, a, s.unit ? p("span", { class: "unit" }, s.unit) : null);
  return (
    (u.set = (d) => {
      ((s.value = d), (a.value = o(d)));
    }),
    u
  );
}
function Q(s) {
  const e = s.step ?? 1,
    t = p("input", { type: "range", min: s.min, max: s.max, step: e, value: s.value });
  s.gradient && t.style.setProperty("--track", s.gradient);
  const n = q({
    value: s.value,
    min: s.min,
    max: s.max,
    step: e,
    unit: s.unit,
    width: 52,
    onInput: (a) => {
      ((t.value = String(a)), s.onInput(a));
    },
    onCommit: s.onCommit,
  });
  (t.addEventListener("input", () => {
    const a = parseFloat(t.value);
    (n.set(a), s.onInput(a));
  }),
    t.addEventListener("change", () => s.onCommit?.(parseFloat(t.value))),
    t.addEventListener("keydown", (a) => a.stopPropagation()));
  const i = p(
    "div",
    { class: "slider-field" },
    p("div", { class: "sf-top" }, p("span", { class: "sf-label" }, s.label), n),
    t,
  );
  return (
    (i.set = (a) => {
      ((t.value = String(a)), n.set(a));
    }),
    i
  );
}
function O(s, e, t, n = "sel") {
  const i = p("select", { class: n });
  for (const a of s) {
    if (a.sep) {
      const o = p("option", { disabled: !0 }, "──────────");
      i.appendChild(o);
      continue;
    }
    i.appendChild(p("option", { value: String(a.value), selected: a.value === e }, a.label));
  }
  return (
    i.addEventListener("change", () => {
      const a = s.find((o) => String(o.value) === i.value);
      a && t(a.value);
    }),
    i.addEventListener("keydown", (a) => a.stopPropagation()),
    i
  );
}
function $(s, e, t) {
  const n = p("input", { type: "checkbox", checked: e });
  return (n.addEventListener("change", () => t(n.checked)), p("label", { class: "check" }, n, p("span", null, s)));
}
function Ne(s, e) {
  let t = null,
    n = [];
  const i = (...a) => {
    ((n = a),
      clearTimeout(t),
      (t = setTimeout(() => {
        ((t = null), s(...n));
      }, e)));
  };
  return (
    (i.flush = () => {
      t && (clearTimeout(t), (t = null), s(...n));
    }),
    (i.cancel = () => {
      (clearTimeout(t), (t = null));
    }),
    i
  );
}
const lh = "" + new URL("logo-CYotfQN6.png", import.meta.url).href,
  I = (s, e = "") =>
    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${e}>${s}</svg>`,
  R = {
    move: I(
      '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
    ),
    marqueeRect: I('<rect x="4" y="5" width="16" height="14" stroke-dasharray="3 2.2"/>'),
    marqueeEllipse: I('<ellipse cx="12" cy="12" rx="8.5" ry="6.5" stroke-dasharray="3 2.2"/>'),
    lasso: I(
      '<path d="M7.5 16.5C4 15 3.5 10.5 6.5 7.5s9-4 11.5-1 0 8-5 9c-2 .4-3.8.4-5.5 1"/><path d="M8 16c-1.5 1-1 3 .5 3.5S11 21 11 21"/>',
    ),
    polyLasso: I('<path d="M5 18 4 7l8-3 8 6-5 9z" stroke-dasharray="3 2"/>'),
    wand: I('<path d="m4 20 10-10M15 4v2M19 8h2M15 12v.01M19 4l-1.5 1.5M13 8l-1-1"/><path d="m12.5 9.5 2 2"/>'),
    crop: I('<path d="M6 2v16h16M2 6h16v16"/>'),
    eyedropper: I(
      '<path d="m14 7 3 3M5 19l9.5-9.5M19.5 4.5a2.1 2.1 0 0 0-3 0L14 7l3 3 2.5-2.5a2.1 2.1 0 0 0 0-3z"/><path d="m5 19-1 1"/>',
    ),
    spotHeal: I(
      '<rect x="6" y="3" width="12" height="18" rx="6" transform="rotate(45 12 12)"/><path d="M10 12h4M12 10v4"/>',
    ),
    heal: I(
      '<rect x="6" y="3" width="12" height="18" rx="6" transform="rotate(45 12 12)"/><circle cx="10" cy="10" r=".6" fill="currentColor"/><circle cx="14" cy="14" r=".6" fill="currentColor"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
    ),
    brush: I(
      '<path d="M18.4 3.6a2 2 0 0 1 2.8 2.8L12 15.6 9.4 13z"/><path d="M9 14c-2.5 0-4 1.8-4 4 0 1.3-.7 2-2 2 3 1.5 8 1 8-3.4z"/>',
    ),
    pencil: I(
      '<path d="m4 20 1.2-4.8L16 4.4a2 2 0 0 1 2.9 0l.7.7a2 2 0 0 1 0 2.9L8.8 18.8z"/><path d="m14.5 6 3.5 3.5"/>',
    ),
    clone: I('<path d="M9 3h6v4l3 3v3H6v-3l3-3z"/><path d="M5 16h14v3H5z"/><path d="M8 21h8"/>'),
    eraser: I(
      '<path d="m7 21-4-4a2 2 0 0 1 0-2.8L13.2 4a2 2 0 0 1 2.8 0l4 4a2 2 0 0 1 0 2.8L10 21z"/><path d="M21 21H10M8.5 9.5l6 6"/>',
    ),
    bucket: I(
      '<path d="m19 11-8-8-8.5 8.5a2.1 2.1 0 0 0 0 3l5 5a2.1 2.1 0 0 0 3 0z"/><path d="M5 2l5 5M2.5 13H19"/><path d="M21 15s1.5 2 1.5 3a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3z"/>',
    ),
    gradient: I(
      '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 5v14M11 5v14" opacity=".35"/><path d="M15 5v14M18 5v14" opacity=".75"/>',
    ),
    blur: I('<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/>'),
    sharpen: I('<path d="m12 3-6 15h12z"/><path d="M12 10v6"/>'),
    smudge: I(
      '<path d="M9 21v-8.5a1.5 1.5 0 0 1 3 0V12M12 11V5.5a1.5 1.5 0 0 1 3 0V11M15 7.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7 6 6 0 0 1-5.2-3L4 14.5a1.5 1.5 0 0 1 2.6-1.5L9 16"/>',
    ),
    dodge: I('<circle cx="10" cy="9" r="5.5"/><path d="m14 13 6.5 8"/>'),
    burn: I('<path d="M7 21c0-3 2-4 2-7 0-4.5 3-8 3-11 1.5 2.5 6 5.5 6 11 0 3-1.5 5-5 7"/><path d="M7 21h10"/>'),
    sponge: I(
      '<path d="M4 9c0-3 3.5-5 8-5s8 2 8 5v6c0 3-3.5 5-8 5s-8-2-8-5z"/><circle cx="9" cy="10" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="12" cy="8" r=".6"/><circle cx="9" cy="15" r=".6"/>',
    ),
    text: I('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'),
    shapeRect: I('<rect x="4" y="5" width="16" height="14" rx="1"/>'),
    shapeEllipse: I('<ellipse cx="12" cy="12" rx="8.5" ry="7"/>'),
    line: I('<path d="M4 20 20 4"/>'),
    polygon: I('<path d="m12 3 8.5 6.2-3.2 10H6.7L3.5 9.2z"/>'),
    star: I('<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
    hand: I(
      '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
    ),
    zoom: I('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8M8 10.5h5M10.5 8v5"/>'),
    rotateView: I('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="m12 8 2 4-2 4-2-4z"/>'),
    ruler: I('<path d="m3 17 14-14 4 4L7 21z"/><path d="m7 13 1.5 1.5M10 10l2 2M13 7l1.5 1.5"/>'),
    ext: I(
      '<path d="M9 3h6v3a2 2 0 1 0 4 0V3h2v6h-3a2 2 0 1 0 0 4h3v8h-6v-3a2 2 0 1 0-4 0v3H3v-6h3a2 2 0 1 0 0-4H3V3z"/>',
    ),
    eye: I('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    lock: I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    lockAlpha: I(
      '<rect x="4" y="4" width="16" height="16" stroke-dasharray="2 2"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11"/>',
    ),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    newLayer: I('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>'),
    folder: I('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    folderOpen: I(
      '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1H8l-3 9H5a2 2 0 0 1-2-2z"/><path d="M8 10h14l-3 9H5z"/>',
    ),
    trash: I('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
    mask: I(
      '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>',
    ),
    fx: I('<path d="M10 4c-2 0-3 1-3 3v13M4 10h6"/><path d="m13 11 7 8M20 11l-7 8"/>'),
    adjust: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>'),
    close: I('<path d="M6 6l12 12M18 6 6 18"/>'),
    minimize: I('<path d="M5 12h14"/>'),
    maximize: I('<rect x="5" y="5" width="14" height="14" rx="1"/>'),
    restore: I('<rect x="5" y="8" width="11" height="11" rx="1"/><path d="M8 8V5h11v11h-3"/>'),
    chevronDown: I('<path d="m6 9 6 6 6-6"/>'),
    chevronRight: I('<path d="m9 6 6 6-6 6"/>'),
    clip: I('<path d="M7 4v9a3 3 0 0 0 3 3h9"/><path d="m16 13 3 3-3 3"/>'),
    dots: I('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
    undo: I('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
    redo: I('<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
    snapshot: I(
      '<path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.5"/>',
    ),
    python: I(
      '<path d="M12 3c-4 0-4 1.6-4 3v2h4.5v1H6c-2 0-3 1.4-3 4s1 4 3 4h1.5v-2.5c0-1.6 1.2-3 3-3h4.5c1.4 0 2.5-1.1 2.5-2.5V6c0-1.6-1.6-3-6-3z"/><path d="M12 21c4 0 4-1.6 4-3v-2h-4.5v-1H18c2 0 3-1.4 3-4s-1-4-3-4"/><circle cx="10" cy="5.5" r=".6" fill="currentColor"/><circle cx="14" cy="18.5" r=".6" fill="currentColor"/>',
    ),
    pen: I(
      '<path d="M12 3 7 12l2.5 6h5L17 12z"/><circle cx="12" cy="11" r="1.2"/><path d="M12 3v6.8M9.5 18h5v3h-5z"/>',
    ),
    freeformPen: I('<path d="M14 4 9.5 12l2 5h4l2-5z"/><path d="M3 19c2-3 3-3 4.5-1.5S10 19 11 17"/>'),
    addAnchor: I('<path d="M11 4 7 12l2 5h4l2-5z"/><path d="M18 3v6M15 6h6"/>'),
    deleteAnchor: I('<path d="M11 4 7 12l2 5h4l2-5z"/><path d="M15 6h6"/>'),
    convertPoint: I(
      '<path d="M4 20 12 4l8 16"/><path d="M8 12h8"/><circle cx="12" cy="4" r="1.5" fill="currentColor"/>',
    ),
    pathSelect: I('<path d="m6 3 13 8-6 1.5L10 19z" fill="currentColor"/>'),
    directSelect: I('<path d="m6 3 13 8-6 1.5L10 19z"/>'),
    shapeLayer: I('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 16 16 8"/>'),
  },
  Br = `<img src="${lh}" width="22" height="22" alt="" draggable="false" style="object-fit:contain">`,
  ch = Object.freeze(
    Object.defineProperty({ __proto__: null, ICONS: R, LOGO: Br }, Symbol.toStringTag, { value: "Module" }),
  ),
  ke = `#version 300 es
precision highp float;
precision highp int;
`,
  ja = `
const vec3 LUMW = vec3(0.3, 0.59, 0.11);
float lum(vec3 c){ return dot(c, LUMW); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 clipColor(vec3 c){
  float l = lum(c); float n = min(min(c.r,c.g),c.b); float x = max(max(c.r,c.g),c.b);
  if(n < 0.0) c = l + (c - l) * l / max(l - n, 1e-6);
  if(x > 1.0) c = l + (c - l) * (1.0 - l) / max(x - l, 1e-6);
  return c;
}
vec3 setLum(vec3 c, float l){ return clipColor(c + (l - lum(c))); }
float sat(vec3 c){ return max(max(c.r,c.g),c.b) - min(min(c.r,c.g),c.b); }
vec3 setSat(vec3 c, float s){
  float mx = max(max(c.r,c.g),c.b), mn = min(min(c.r,c.g),c.b);
  if(mx - mn < 1e-6) return vec3(0.0);
  return (c - mn) * s / (mx - mn);
}
vec3 rgb2hsv(vec3 c){
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y); float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c){
  vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
vec3 rgb2hsl(vec3 c){
  float mx = max(max(c.r,c.g),c.b), mn = min(min(c.r,c.g),c.b);
  float l = (mx + mn) * 0.5; float d = mx - mn;
  if(d < 1e-6) return vec3(0.0, 0.0, l);
  float s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
  float h;
  if(mx == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  else if(mx == c.g) h = (c.b - c.r) / d + 2.0;
  else h = (c.r - c.g) / d + 4.0;
  return vec3(h / 6.0, s, l);
}
float hue2rgb(float p, float q, float t){
  t = fract(t);
  if(t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if(t < 0.5) return q;
  if(t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}
vec3 hsl2rgb(vec3 h){
  if(h.y < 1e-6) return vec3(h.z);
  float q = h.z < 0.5 ? h.z * (1.0 + h.y) : h.z + h.y - h.z * h.y;
  float p = 2.0 * h.z - q;
  return vec3(hue2rgb(p, q, h.x + 1.0/3.0), hue2rgb(p, q, h.x), hue2rgb(p, q, h.x - 1.0/3.0));
}
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), u.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), u.x), u.y);
}
vec4 fetchClamp(sampler2D t, ivec2 p){ ivec2 s = textureSize(t, 0); return texelFetch(t, clamp(p, ivec2(0), s - 1), 0); }
vec4 premul(vec4 c){ return vec4(c.rgb * c.a, c.a); }
vec4 unpremul(vec4 c){ return c.a > 1e-6 ? vec4(c.rgb / c.a, c.a) : vec4(0.0); }
// bilinear in premultiplied space, returns straight colour; outside = transparent (or clamped)
vec4 sampleBilinear(sampler2D t, vec2 p, bool clampEdge){
  ivec2 s = textureSize(t, 0);
  vec2 q = p - 0.5; vec2 f = fract(q); ivec2 i = ivec2(floor(q));
  vec4 acc = vec4(0.0);
  for(int dy = 0; dy < 2; dy++) for(int dx = 0; dx < 2; dx++){
    ivec2 c = i + ivec2(dx, dy);
    float w = (dx == 0 ? 1.0 - f.x : f.x) * (dy == 0 ? 1.0 - f.y : f.y);
    vec4 v;
    if(clampEdge) v = texelFetch(t, clamp(c, ivec2(0), s - 1), 0);
    else v = (c.x < 0 || c.y < 0 || c.x >= s.x || c.y >= s.y) ? vec4(0.0) : texelFetch(t, c, 0);
    acc += premul(v) * w;
  }
  return unpremul(acc);
}
float cubicW(float x){ x = abs(x); float a = -0.5;
  if(x <= 1.0) return (a + 2.0) * x*x*x - (a + 3.0) * x*x + 1.0;
  if(x < 2.0) return a * x*x*x - 5.0*a * x*x + 8.0*a * x - 4.0*a;
  return 0.0; }
vec4 sampleBicubic(sampler2D t, vec2 p){
  ivec2 s = textureSize(t, 0);
  vec2 q = p - 0.5; vec2 f = fract(q); ivec2 i = ivec2(floor(q));
  vec4 acc = vec4(0.0); float wsum = 0.0;
  for(int dy = -1; dy <= 2; dy++){
    float wy = cubicW(float(dy) - f.y);
    for(int dx = -1; dx <= 2; dx++){
      float w = cubicW(float(dx) - f.x) * wy;
      ivec2 c = i + ivec2(dx, dy);
      vec4 v = (c.x < 0 || c.y < 0 || c.x >= s.x || c.y >= s.y) ? vec4(0.0) : texelFetch(t, c, 0);
      acc += premul(v) * w; wsum += w;
    }
  }
  acc /= max(wsum, 1e-6);
  acc.a = clamp(acc.a, 0.0, 1.0);
  return unpremul(vec4(max(acc.rgb, vec3(0.0)), acc.a));
}
`,
  uh = [
    "normal",
    "dissolve",
    "darken",
    "multiply",
    "colorBurn",
    "linearBurn",
    "darkerColor",
    "lighten",
    "screen",
    "colorDodge",
    "linearDodge",
    "lighterColor",
    "overlay",
    "softLight",
    "hardLight",
    "vividLight",
    "linearLight",
    "pinLight",
    "hardMix",
    "difference",
    "exclusion",
    "subtract",
    "divide",
    "hue",
    "saturation",
    "color",
    "luminosity",
    "passThrough",
    "behind",
    "clear",
  ],
  wt = Object.fromEntries(uh.map((s, e) => [s, e])),
  li = {
    normal: "Normal",
    dissolve: "Dissolve",
    darken: "Darken",
    multiply: "Multiply",
    colorBurn: "Color Burn",
    linearBurn: "Linear Burn",
    darkerColor: "Darker Color",
    lighten: "Lighten",
    screen: "Screen",
    colorDodge: "Color Dodge",
    linearDodge: "Linear Dodge (Add)",
    lighterColor: "Lighter Color",
    overlay: "Overlay",
    softLight: "Soft Light",
    hardLight: "Hard Light",
    vividLight: "Vivid Light",
    linearLight: "Linear Light",
    pinLight: "Pin Light",
    hardMix: "Hard Mix",
    difference: "Difference",
    exclusion: "Exclusion",
    subtract: "Subtract",
    divide: "Divide",
    hue: "Hue",
    saturation: "Saturation",
    color: "Color",
    luminosity: "Luminosity",
    passThrough: "Pass Through",
    behind: "Behind",
    clear: "Clear",
  },
  hh = [
    ["normal", "dissolve"],
    ["darken", "multiply", "colorBurn", "linearBurn", "darkerColor"],
    ["lighten", "screen", "colorDodge", "linearDodge", "lighterColor"],
    ["overlay", "softLight", "hardLight", "vividLight", "linearLight", "pinLight", "hardMix"],
    ["difference", "exclusion", "subtract", "divide"],
    ["hue", "saturation", "color", "luminosity"],
  ],
  $r = `
float bColorDodge(float b, float s){ if(b <= 0.0) return 0.0; if(s >= 1.0) return 1.0; return min(1.0, b / (1.0 - s)); }
float bColorBurn(float b, float s){ if(b >= 1.0) return 1.0; if(s <= 0.0) return 0.0; return 1.0 - min(1.0, (1.0 - b) / s); }
float bSoftLight(float b, float s){
  if(s <= 0.5) return b - (1.0 - 2.0*s) * b * (1.0 - b);
  return b + (2.0*s - 1.0) * (sqrt(max(b,0.0)) - b);
}
float bVivid(float b, float s){ return s <= 0.5 ? bColorBurn(b, 2.0*s) : bColorDodge(b, 2.0*(s - 0.5)); }
float bPin(float b, float s){ return s <= 0.5 ? min(b, 2.0*s) : max(b, 2.0*s - 1.0); }
vec3 blendRGB(int m, vec3 b, vec3 s){
  vec3 bc = clamp(b, 0.0, 1.0), sc = clamp(s, 0.0, 1.0);
  if(m == 2) return min(b, s);
  if(m == 3) return b * s;
  if(m == 4) return vec3(bColorBurn(bc.r,sc.r), bColorBurn(bc.g,sc.g), bColorBurn(bc.b,sc.b));
  if(m == 5) return max(b + s - 1.0, 0.0);
  if(m == 6) return lum(s) < lum(b) ? s : b;
  if(m == 7) return max(b, s);
  if(m == 8) return b + s - b * s;
  if(m == 9) return vec3(bColorDodge(bc.r,sc.r), bColorDodge(bc.g,sc.g), bColorDodge(bc.b,sc.b));
  if(m == 10) return b + s;
  if(m == 11) return lum(s) > lum(b) ? s : b;
  if(m == 12) return mix(2.0*bc*sc, 1.0 - 2.0*(1.0-bc)*(1.0-sc), step(0.5, bc));
  if(m == 13) return vec3(bSoftLight(bc.r,sc.r), bSoftLight(bc.g,sc.g), bSoftLight(bc.b,sc.b));
  if(m == 14) return mix(2.0*bc*sc, 1.0 - 2.0*(1.0-bc)*(1.0-sc), step(0.5, sc));
  if(m == 15) return vec3(bVivid(bc.r,sc.r), bVivid(bc.g,sc.g), bVivid(bc.b,sc.b));
  if(m == 16) return clamp(bc + 2.0*sc - 1.0, 0.0, 1.0);
  if(m == 17) return vec3(bPin(bc.r,sc.r), bPin(bc.g,sc.g), bPin(bc.b,sc.b));
  if(m == 18) return step(1.0, bc + sc);
  if(m == 19) return abs(b - s);
  if(m == 20) return b + s - 2.0 * b * s;
  if(m == 21) return max(b - s, 0.0);
  if(m == 22) return vec3(s.r > 0.0 ? b.r / s.r : 1.0, s.g > 0.0 ? b.g / s.g : 1.0, s.b > 0.0 ? b.b / s.b : 1.0);
  if(m == 23) return setLum(setSat(sc, sat(bc)), lum(bc));
  if(m == 24) return setLum(setSat(bc, sat(sc)), lum(bc));
  if(m == 25) return setLum(sc, lum(bc));
  if(m == 26) return setLum(bc, lum(sc));
  return s;
}
// Composite straight-alpha src over straight-alpha base with effective source alpha "as".
vec4 composeOver(vec4 base, vec3 cs, float as, int mode, vec2 px){
  float ab = base.a;
  if(mode == 1){ as = hash12(px) < as ? 1.0 : 0.0; mode = 0; }
  if(mode == 28){ // behind: paint beneath existing pixels
    float ao = ab + as * (1.0 - ab);
    if(ao <= 1e-6) return vec4(0.0);
    return vec4((base.rgb * ab + cs * as * (1.0 - ab)) / ao, ao);
  }
  if(mode == 29){ return vec4(base.rgb, ab * (1.0 - as)); }
  vec3 B = (mode == 0 || mode == 27) ? cs : blendRGB(mode, base.rgb, cs);
  vec3 cr = (1.0 - ab) * cs + ab * B;
  float ao = as + ab * (1.0 - as);
  if(ao <= 1e-6) return vec4(0.0);
  vec3 co = (as * cr + ab * (1.0 - as) * base.rgb) / ao;
  return vec4(co, ao);
}
`,
  J = ke + ja + $r,
  dh =
    J +
    `
uniform sampler2D u_base;
uniform sampler2D u_src;
uniform sampler2D u_mask;
uniform float u_opacity;
uniform int u_mode;
uniform int u_hasMask;
uniform int u_clip;        // 1: result alpha = base alpha (clipping into base)
uniform vec2 u_srcOffset;  // src is sampled at (p - offset)
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 b = texelFetch(u_base, p, 0);
  ivec2 sp = p - ivec2(u_srcOffset);
  ivec2 ss = textureSize(u_src, 0);
  vec4 s = (sp.x < 0 || sp.y < 0 || sp.x >= ss.x || sp.y >= ss.y) ? vec4(0.0) : texelFetch(u_src, sp, 0);
  float m = u_hasMask == 1 ? texelFetch(u_mask, sp, 0).r : 1.0;
  float as = s.a * u_opacity * m;
  if(u_clip == 1){
    if(b.a <= 0.0){ o = b; return; }
    vec4 r = composeOver(vec4(b.rgb, 1.0), s.rgb, as, u_mode, gl_FragCoord.xy);
    o = vec4(r.rgb, b.a);
    return;
  }
  o = composeOver(b, s.rgb, as, u_mode, gl_FragCoord.xy);
}`,
  Ga =
    J +
    `
uniform sampler2D u_src;
uniform sampler2D u_mask;
uniform int u_hasMask;
uniform vec2 u_srcOffset;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy) - ivec2(u_srcOffset);
  ivec2 ss = textureSize(u_src, 0);
  vec4 s = (p.x < 0 || p.y < 0 || p.x >= ss.x || p.y >= ss.y) ? vec4(0.0) : texelFetch(u_src, p, 0);
  if(u_hasMask == 1) s.a *= texelFetch(u_mask, p, 0).r;
  o = s;
}`,
  ph =
    J +
    `
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform sampler2D u_mask;
uniform int u_hasMask;
uniform float u_t;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  float t = u_t * (u_hasMask == 1 ? texelFetch(u_mask, p, 0).r : 1.0);
  vec4 a = premul(texelFetch(u_a, p, 0)), b = premul(texelFetch(u_b, p, 0));
  o = unpremul(mix(a, b, t));
}`,
  fh = {
    brightnessContrast: 1,
    levels: 2,
    curves: 3,
    hueSaturation: 4,
    colorBalance: 5,
    exposure: 6,
    vibrance: 7,
    blackWhite: 8,
    photoFilter: 9,
    invert: 10,
    posterize: 11,
    threshold: 12,
    gradientMap: 13,
    channelMixer: 14,
    desaturate: 16,
  },
  mh = `
uniform int u_type;
uniform vec4 u_p[8];
uniform sampler2D u_lut;
float levelsF(float c, vec4 a, vec4 b){
  float v = clamp((c - a.x) / max(a.y - a.x, 1e-5), 0.0, 1.0);
  v = pow(v, 1.0 / max(a.z, 0.01));
  return mix(b.x, b.y, v);
}
float lutF(float c, int ch){ float x = clamp(c, 0.0, 1.0) * 1023.0; int i = int(floor(x)); float f = x - float(i);
  float a = texelFetch(u_lut, ivec2(i, 0), 0)[ch]; float b = texelFetch(u_lut, ivec2(min(i + 1, 1023), 0), 0)[ch]; return mix(a, b, f); }
vec3 adjust(vec3 c){
  if(u_type == 1){ // brightness / contrast
    float br = u_p[0].x, ct = u_p[0].y;
    c = br >= 0.0 ? c + (1.0 - c) * br * 0.6 * (1.0 - c * 0.3) : c * (1.0 + br * 0.6);
    float f = tan((clamp(ct, -0.99, 0.99) + 1.0) * 0.78539816);
    return (c - 0.5) * f + 0.5;
  }
  if(u_type == 2){ // levels: p0..p3 = in (black, white, gamma) for rgb,r,g,b ; p4..p7 = out (black, white)
    c = vec3(levelsF(c.r, u_p[0], u_p[4]), levelsF(c.g, u_p[0], u_p[4]), levelsF(c.b, u_p[0], u_p[4]));
    return vec3(levelsF(c.r, u_p[1], u_p[5]), levelsF(c.g, u_p[2], u_p[6]), levelsF(c.b, u_p[3], u_p[7]));
  }
  if(u_type == 3){ // curves LUT: master in .a, channels in .rgb
    c = vec3(lutF(c.r, 3), lutF(c.g, 3), lutF(c.b, 3));
    return vec3(lutF(c.r, 0), lutF(c.g, 1), lutF(c.b, 2));
  }
  if(u_type == 4){ // hue / saturation
    vec3 h = rgb2hsl(clamp(c, 0.0, 1.0));
    if(u_p[0].w > 0.5){ h.x = u_p[1].x; h.y = u_p[1].y; }
    else { h.x = fract(h.x + u_p[0].x); h.y = clamp(h.y * (1.0 + u_p[0].y), 0.0, 1.0); }
    vec3 r = hsl2rgb(h);
    float L = u_p[0].w > 0.5 ? u_p[1].z : u_p[0].z;
    r = L >= 0.0 ? mix(r, vec3(1.0), L) : r * (1.0 + L);
    return r;
  }
  if(u_type == 5){ // color balance
    float l = luma(clamp(c, 0.0, 1.0));
    float sh = clamp(1.0 - l * 4.0, 0.0, 1.0) * 0.7 + clamp(1.0 - l * 2.0, 0.0, 1.0) * 0.3;
    float hi = clamp(l * 4.0 - 3.0, 0.0, 1.0) * 0.7 + clamp(l * 2.0 - 1.0, 0.0, 1.0) * 0.3;
    float md = clamp(1.0 - sh - hi, 0.0, 1.0);
    vec3 d = u_p[0].xyz * sh + u_p[1].xyz * md + u_p[2].xyz * hi;
    vec3 r = c + d * 0.5;
    if(u_p[3].x > 0.5) r = setLum(r, lum(c));
    return r;
  }
  if(u_type == 6){ // exposure (stops), offset, gamma — computed in linear light
    vec3 lin = pow(max(c, 0.0), vec3(2.2));
    lin = lin * exp2(u_p[0].x) + u_p[0].y;
    return pow(max(lin, 0.0), vec3(1.0 / (2.2 * max(u_p[0].z, 0.01))));
  }
  if(u_type == 7){ // vibrance / saturation
    float s = sat(c); float l = luma(c);
    float vib = u_p[0].x * (1.0 - s);
    c = mix(vec3(l), c, 1.0 + vib);
    return mix(vec3(luma(c)), c, 1.0 + u_p[0].y);
  }
  if(u_type == 8){ // black & white: p0 = reds,yellows,greens,cyans ; p1 = blues,magentas,tint?,_ ; p2 = tint colour
    float r = c.r, g = c.g, b = c.b;
    float mx = max(max(r,g),b), mn = min(min(r,g),b), md = r + g + b - mx - mn;
    float wP, wS;
    if(mx == r){ wP = u_p[0].x; wS = (md == g) ? u_p[0].y : u_p[1].y; }
    else if(mx == g){ wP = u_p[0].z; wS = (md == r) ? u_p[0].y : u_p[0].w; }
    else { wP = u_p[1].x; wS = (md == g) ? u_p[0].w : u_p[1].y; }
    float gray = mn + (md - mn) * wS + (mx - md) * wP;
    vec3 res = vec3(gray);
    if(u_p[1].z > 0.5){ vec3 t = u_p[2].rgb; res = setLum(t, gray); }
    return res;
  }
  if(u_type == 9){ // photo filter
    vec3 f = c * mix(vec3(1.0), u_p[0].rgb, u_p[0].w);
    vec3 r = mix(c, f * (1.0 / max(lum(mix(vec3(1.0), u_p[0].rgb, u_p[0].w)), 0.05)), 1.0);
    r = mix(c, c * u_p[0].rgb * 1.6, u_p[0].w * 0.6);
    if(u_p[1].x > 0.5) r = setLum(r, lum(c));
    return r;
  }
  if(u_type == 10) return 1.0 - c;
  if(u_type == 11){ float n = max(u_p[0].x, 2.0) - 1.0; return floor(clamp(c, 0.0, 1.0) * n + 0.5) / n; }
  if(u_type == 12) return vec3(step(u_p[0].x, luma(c)));
  if(u_type == 13){ float l = clamp(luma(c), 0.0, 1.0); return vec3(lutF(l, 0), lutF(l, 1), lutF(l, 2)); }
  if(u_type == 14){
    vec3 r = vec3(dot(c, u_p[0].xyz) + u_p[0].w, dot(c, u_p[1].xyz) + u_p[1].w, dot(c, u_p[2].xyz) + u_p[2].w);
    if(u_p[3].x > 0.5) r = vec3(r.r);
    return r;
  }
  if(u_type == 16) return vec3(dot(c, vec3(0.299, 0.587, 0.114)));
  return c;
}
`,
  gh =
    J +
    mh +
    `
uniform sampler2D u_base;
uniform sampler2D u_mask;
uniform int u_hasMask;
uniform float u_opacity;
uniform vec2 u_maskOffset;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 b = texelFetch(u_base, p, 0);
  float m = u_hasMask == 1 ? texelFetch(u_mask, p - ivec2(u_maskOffset), 0).r : 1.0;
  vec3 a = adjust(b.rgb);
  o = vec4(mix(b.rgb, a, u_opacity * m), b.a);
}`,
  vh =
    J +
    `
uniform sampler2D u_src;
uniform vec2 u_dir;
uniform float u_sigma;
uniform int u_radius;
uniform int u_box;
uniform int u_inPremul;
uniform int u_outPremul;
uniform int u_alphaOnly;
out vec4 o;
vec4 getp(ivec2 q){ vec4 v = fetchClamp(u_src, q); if(u_alphaOnly == 1) return vec4(v.a); return u_inPremul == 1 ? v : premul(v); }
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 d = ivec2(u_dir);
  vec4 acc = getp(p); float wsum = 1.0;
  float k = -0.5 / max(u_sigma * u_sigma, 1e-4);
  for(int i = 1; i <= 1000; i++){
    if(i > u_radius) break;
    float w = u_box == 1 ? 1.0 : exp(float(i*i) * k);
    acc += (getp(p + d * i) + getp(p - d * i)) * w;
    wsum += 2.0 * w;
  }
  acc /= wsum;
  o = (u_outPremul == 1 || u_alphaOnly == 1) ? acc : unpremul(acc);
}`,
  yh =
    J +
    `
uniform sampler2D u_src;
uniform vec2 u_dir;
uniform int u_radius;
uniform int u_max;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy); ivec2 d = ivec2(u_dir);
  vec4 r = fetchClamp(u_src, p);
  for(int i = 1; i <= 200; i++){
    if(i > u_radius) break;
    vec4 a = fetchClamp(u_src, p + d * i), b = fetchClamp(u_src, p - d * i);
    r = u_max == 1 ? max(r, max(a, b)) : min(r, min(a, b));
  }
  o = r;
}`,
  bh =
    J +
    `
uniform sampler2D u_src;
uniform int u_channel;   // 0: alpha of rgba ; 1: red (masks)
uniform int u_invert;    // seeds where value < 0.5 instead
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 v = texelFetch(u_src, p, 0);
  float a = u_channel == 1 ? v.r : v.a;
  bool seed = u_invert == 1 ? a < 0.5 : a >= 0.5;
  o = seed ? vec4(gl_FragCoord.xy, 0.0, 1.0) : vec4(-1e6, -1e6, 0.0, 1.0);
}`,
  wh =
    J +
    `
uniform sampler2D u_src;
uniform int u_step;
out vec4 o;
void main(){
  vec2 p = gl_FragCoord.xy; ivec2 ip = ivec2(p);
  vec2 best = texelFetch(u_src, ip, 0).xy; float bd = distance(best, p);
  for(int y = -1; y <= 1; y++) for(int x = -1; x <= 1; x++){
    vec2 s = fetchClamp(u_src, ip + ivec2(x, y) * u_step).xy;
    float d = distance(s, p);
    if(d < bd){ bd = d; best = s; }
  }
  o = vec4(best, 0.0, 1.0);
}`,
  xh =
    J +
    `
uniform sampler2D u_src;
out vec4 o;
void main(){ vec2 s = texelFetch(u_src, ivec2(gl_FragCoord.xy), 0).xy; o = vec4(distance(s, gl_FragCoord.xy)); }`,
  Io =
    J +
    `
uniform sampler2D u_blurA;  // blurred alpha (premultiplied-alpha blur in .a)
uniform vec2 u_offset;
uniform float u_spread;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy - u_offset);
  float a = fetchClamp(u_blurA, p).a;
  ivec2 s = textureSize(u_blurA, 0);
  if(p.x < 0 || p.y < 0 || p.x >= s.x || p.y >= s.y) a = 0.0;
  a = clamp(a / max(1.0 - u_spread, 0.01), 0.0, 1.0);
  o = vec4(1.0, 1.0, 1.0, a);
}`,
  kh =
    J +
    `
uniform sampler2D u_src;
uniform vec3 u_color;
uniform float u_alphaMul;
out vec4 o;
void main(){ vec4 s = texelFetch(u_src, ivec2(gl_FragCoord.xy), 0); o = vec4(u_color, clamp(s.a * u_alphaMul, 0.0, 1.0)); }`,
  _h =
    J +
    `
uniform sampler2D u_distOut;  // distance to nearest opaque pixel
uniform sampler2D u_distIn;   // distance to nearest transparent pixel
uniform sampler2D u_src;
uniform float u_size;
uniform int u_position; // 0 outside, 1 inside, 2 center
uniform vec3 u_color;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  float dOut = texelFetch(u_distOut, p, 0).r, dIn = texelFetch(u_distIn, p, 0).r;
  float a = texelFetch(u_src, p, 0).a;
  float cov;
  if(u_position == 0) cov = clamp(u_size + 0.5 - dOut, 0.0, 1.0) * (1.0 - a);
  else if(u_position == 1) cov = clamp(u_size + 0.5 - dIn, 0.0, 1.0) * a;
  else cov = max(clamp(u_size * 0.5 + 0.5 - dOut, 0.0, 1.0) * (1.0 - a), clamp(u_size * 0.5 + 0.5 - dIn, 0.0, 1.0) * a);
  o = vec4(u_color, cov);
}`,
  Mh =
    J +
    `
uniform sampler2D u_src;
uniform vec3 u_color;
uniform float u_amount;
uniform int u_mode;
out vec4 o;
void main(){
  vec4 s = texelFetch(u_src, ivec2(gl_FragCoord.xy), 0);
  vec3 b = blendRGB(u_mode == 0 ? 99 : u_mode, s.rgb, u_color);
  if(u_mode == 0) b = u_color;
  o = vec4(mix(s.rgb, b, u_amount), s.a);
}`,
  Sh =
    J +
    `
uniform sampler2D u_src;
uniform sampler2D u_aux;     // e.g. blurred copy
uniform int u_kind;
uniform vec4 u_p0;
uniform vec4 u_p1;
uniform vec4 u_p2;
uniform vec2 u_size;
out vec4 o;
void main(){
  vec2 pf = gl_FragCoord.xy; ivec2 p = ivec2(pf);
  vec4 c = texelFetch(u_src, p, 0);
  if(u_kind == 1){ // unsharp mask: amount, threshold
    vec4 b = texelFetch(u_aux, p, 0);
    vec3 d = c.rgb - b.rgb;
    float t = u_p0.y;
    vec3 m = step(vec3(t), abs(d));
    o = vec4(c.rgb + d * u_p0.x * m, c.a); return;
  }
  if(u_kind == 2){ // high pass
    vec4 b = texelFetch(u_aux, p, 0);
    o = vec4(clamp(c.rgb - b.rgb + 0.5, 0.0, 1.0), c.a); return;
  }
  if(u_kind == 3){ // add noise: amount, gaussian, mono, seed
    vec2 h = hash22(pf + u_p0.w * 17.0);
    vec3 n;
    if(u_p0.z > 0.5){ float v = u_p0.y > 0.5 ? sqrt(-2.0 * log(max(h.x, 1e-6))) * cos(6.2831853 * h.y) * 0.5 : h.x - 0.5; n = vec3(v); }
    else {
      vec2 h2 = hash22(pf * 1.37 + u_p0.w * 3.0);
      vec3 u = vec3(h.x, h.y, h2.x) - 0.5;
      if(u_p0.y > 0.5) u = vec3(sqrt(-2.0*log(max(h.x,1e-6)))*cos(6.2831853*h.y), sqrt(-2.0*log(max(h.y,1e-6)))*cos(6.2831853*h2.x), sqrt(-2.0*log(max(h2.x,1e-6)))*cos(6.2831853*h2.y)) * 0.5;
      n = u;
    }
    o = vec4(c.rgb + n * u_p0.x, c.a); return;
  }
  if(u_kind == 4){ // pixelate (mosaic): cell size
    float s = max(u_p0.x, 1.0);
    vec2 cell = floor(pf / s) * s;
    vec4 acc = vec4(0.0); float n = 0.0;
    for(int y = 0; y < 6; y++) for(int x = 0; x < 6; x++){
      vec2 q = cell + (vec2(x, y) + 0.5) * s / 6.0;
      acc += premul(fetchClamp(u_src, ivec2(q))); n += 1.0;
    }
    o = unpremul(acc / n); return;
  }
  if(u_kind == 5){ // emboss: angle, height, amount
    vec2 d = vec2(cos(u_p0.x), sin(u_p0.x)) * u_p0.y;
    vec3 a = fetchClamp(u_src, ivec2(pf + d)).rgb, b = fetchClamp(u_src, ivec2(pf - d)).rgb;
    float v = 0.5 + (luma(b) - luma(a)) * u_p0.z;
    o = vec4(vec3(v), c.a); return;
  }
  if(u_kind == 6){ // find edges (sobel)
    float tl = luma(fetchClamp(u_src, p + ivec2(-1,-1)).rgb), t = luma(fetchClamp(u_src, p + ivec2(0,-1)).rgb), tr = luma(fetchClamp(u_src, p + ivec2(1,-1)).rgb);
    float l = luma(fetchClamp(u_src, p + ivec2(-1,0)).rgb), r = luma(fetchClamp(u_src, p + ivec2(1,0)).rgb);
    float bl = luma(fetchClamp(u_src, p + ivec2(-1,1)).rgb), b = luma(fetchClamp(u_src, p + ivec2(0,1)).rgb), br = luma(fetchClamp(u_src, p + ivec2(1,1)).rgb);
    float gx = -tl - 2.0*l - bl + tr + 2.0*r + br, gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
    float g = clamp(length(vec2(gx, gy)), 0.0, 1.0);
    o = vec4(vec3(1.0 - g), c.a); return;
  }
  if(u_kind == 7){ // solarize
    o = vec4(mix(c.rgb, 1.0 - c.rgb, step(0.5, c.rgb)), c.a); return;
  }
  if(u_kind == 8){ // twirl: angle(rad), radius
    vec2 ctr = u_size * 0.5; vec2 d = pf - ctr; float r = length(d); float R = u_p0.y;
    if(r < R){ float t = (1.0 - r / R); float a = u_p0.x * t * t; float cs = cos(a), sn = sin(a); d = vec2(cs*d.x - sn*d.y, sn*d.x + cs*d.y); }
    o = sampleBilinear(u_src, ctr + d, true); return;
  }
  if(u_kind == 9){ // pinch / bulge: amount -1..1, radius
    vec2 ctr = u_size * 0.5; vec2 d = pf - ctr; float r = length(d); float R = u_p0.y;
    if(r < R && r > 0.0){ float t = r / R; float k = pow(t, 1.0 + u_p0.x * 0.9) / t; d *= mix(k, 1.0, t*t*t); }
    o = sampleBilinear(u_src, ctr + d, true); return;
  }
  if(u_kind == 10){ // wave: amplitude, wavelength, axis(0 both 1 h 2 v)
    vec2 q = pf;
    if(u_p0.z != 2.0) q.x += sin(pf.y * 6.2831853 / u_p0.y) * u_p0.x;
    if(u_p0.z != 1.0) q.y += sin(pf.x * 6.2831853 / u_p0.y) * u_p0.x;
    o = sampleBilinear(u_src, q, true); return;
  }
  if(u_kind == 11){ // clouds: scale, seed ; colours p1 (fg) p2 (bg)
    vec2 q = pf / max(u_p0.x, 1.0) + u_p0.y * 13.1;
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 7; i++){ v += a * vnoise(q); q *= 2.03; a *= 0.5; }
    o = vec4(mix(u_p2.rgb, u_p1.rgb, clamp(v * 1.15 - 0.07, 0.0, 1.0)), 1.0); return;
  }
  if(u_kind == 12){ // offset: dx, dy, wrap
    vec2 q = pf - u_p0.xy;
    if(u_p0.z > 0.5){ q = mod(q, u_size); o = texelFetch(u_src, ivec2(q), 0); }
    else o = (q.x < 0.0 || q.y < 0.0 || q.x >= u_size.x || q.y >= u_size.y) ? vec4(0.0) : texelFetch(u_src, ivec2(q), 0);
    return;
  }
  if(u_kind == 13){ // motion blur: angle, distance
    vec2 d = vec2(cos(u_p0.x), sin(u_p0.x));
    int n = int(clamp(u_p0.y, 1.0, 400.0));
    vec4 acc = vec4(0.0);
    for(int i = 0; i <= 800; i++){ if(i > 2 * n) break; float t = float(i - n) * 0.5; acc += premul(sampleBilinear(u_src, pf + d * t, true)); }
    o = unpremul(acc / float(2 * n + 1)); return;
  }
  if(u_kind == 14){ // radial: zoom (0) / spin (1) blur: amount, cx, cy, type
    vec2 ctr = vec2(u_p0.y, u_p0.z) * u_size; vec4 acc = vec4(0.0); int N = 48;
    for(int i = 0; i < 48; i++){
      float t = (float(i) / float(N - 1) - 0.5) * u_p0.x;
      vec2 q;
      if(u_p0.w < 0.5) q = ctr + (pf - ctr) * (1.0 + t * 0.25);
      else { float a = t * 0.35; float cs = cos(a), sn = sin(a); vec2 d = pf - ctr; q = ctr + vec2(cs*d.x - sn*d.y, sn*d.x + cs*d.y); }
      acc += premul(sampleBilinear(u_src, q, true));
    }
    o = unpremul(acc / float(N)); return;
  }
  if(u_kind == 15){ // shadows / highlights using a blurred luminance in aux: shadows, highlights
    float lb = luma(texelFetch(u_aux, p, 0).rgb);
    float sh = u_p0.x * pow(1.0 - lb, 2.0), hi = u_p0.y * pow(lb, 2.0);
    vec3 r = c.rgb;
    r = r + (1.0 - r) * r * sh * 2.0;
    r = r - r * (1.0 - r) * hi * 2.0 - hi * 0.15 * r * lb;
    o = vec4(r, c.a); return;
  }
  if(u_kind == 16){ // clamp to [0,1]
    o = clamp(c, 0.0, 1.0); return;
  }
  if(u_kind == 17){ // polar coordinates: 0 rect->polar, 1 polar->rect
    vec2 ctr = u_size * 0.5; vec2 q;
    if(u_p0.x < 0.5){ vec2 d = pf - ctr; float a = atan(d.x, -d.y) / 6.2831853 + 0.5; float r = length(d) / (min(u_size.x, u_size.y) * 0.5); q = vec2(a * u_size.x, r * u_size.y); }
    else { float a = (pf.x / u_size.x - 0.5) * 6.2831853; float r = pf.y / u_size.y * min(u_size.x, u_size.y) * 0.5; q = ctr + vec2(sin(a), -cos(a)) * r; }
    o = sampleBilinear(u_src, q, false); return;
  }
  o = c;
}`,
  qr =
    J +
    `
uniform sampler2D u_src;
uniform mat3 u_inv;     // dest pixel -> source pixel (homogeneous)
uniform int u_quality;  // 0 nearest, 1 bilinear, 2 bicubic
uniform vec2 u_srcOrigin;
out vec4 o;
void main(){
  vec3 h = u_inv * vec3(gl_FragCoord.xy, 1.0);
  vec2 q = h.xy / h.z - u_srcOrigin;
  if(u_quality == 0){ ivec2 s = textureSize(u_src, 0); ivec2 i = ivec2(floor(q)); o = (i.x < 0 || i.y < 0 || i.x >= s.x || i.y >= s.y) ? vec4(0.0) : texelFetch(u_src, i, 0); }
  else if(u_quality == 1) o = sampleBilinear(u_src, q, false);
  else o = sampleBicubic(u_src, q);
}`,
  Th =
    J +
    `
uniform sampler2D u_src;
uniform vec2 u_scale; // source pixels per dest pixel
out vec4 o;
void main(){
  vec2 a = floor(gl_FragCoord.xy) * u_scale; vec2 b = a + u_scale;
  vec4 acc = vec4(0.0); float n = 0.0;
  int nx = int(ceil(u_scale.x)), ny = int(ceil(u_scale.y));
  for(int y = 0; y < 64; y++){ if(y >= ny) break;
    for(int x = 0; x < 64; x++){ if(x >= nx) break;
      vec2 q = a + vec2(x, y) + 0.5;
      if(q.x > b.x || q.y > b.y) continue;
      acc += premul(fetchClamp(u_src, ivec2(q))); n += 1.0;
    }
  }
  o = unpremul(acc / max(n, 1.0));
}`,
  Ph =
    J +
    `
uniform sampler2D u_lut;   // 1024x1 gradient colours (rgba)
uniform vec2 u_a;
uniform vec2 u_b;
uniform int u_type;        // 0 linear 1 radial 2 angle 3 reflected 4 diamond
uniform int u_reverse;
uniform int u_dither;
out vec4 o;
void main(){
  vec2 p = gl_FragCoord.xy; vec2 d = u_b - u_a; float L = max(length(d), 1e-3);
  float t;
  if(u_type == 0) t = dot(p - u_a, d) / (L * L);
  else if(u_type == 1) t = length(p - u_a) / L;
  else if(u_type == 2){ float a0 = atan(d.y, d.x); float a = atan(p.y - u_a.y, p.x - u_a.x); t = fract((a0 - a) / 6.2831853); }
  else if(u_type == 3) t = abs(dot(p - u_a, d) / (L * L));
  else { vec2 n = d / L; vec2 q = p - u_a; t = (abs(dot(q, n)) + abs(dot(q, vec2(-n.y, n.x)))) / L; }
  t = clamp(t, 0.0, 1.0);
  if(u_reverse == 1) t = 1.0 - t;
  float x = t * 1023.0; int i = int(floor(x)); float f = x - float(i);
  vec4 c = mix(texelFetch(u_lut, ivec2(i, 0), 0), texelFetch(u_lut, ivec2(min(i + 1, 1023), 0), 0), f);
  if(u_dither == 1) c.rgb += (hash12(p) - 0.5) / 255.0;
  o = c;
}`,
  ys =
    J +
    `
uniform sampler2D u_dst;
uniform sampler2D u_src;
uniform sampler2D u_sel;
uniform int u_hasSel;
uniform float u_opacity;
uniform int u_mode;
uniform int u_lockAlpha;
uniform vec4 u_color;      // used if u_useColor
uniform int u_useColor;
uniform sampler2D u_cov;   // optional coverage (r)
uniform int u_hasCov;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 d = texelFetch(u_dst, p, 0);
  vec4 s = u_useColor == 1 ? u_color : texelFetch(u_src, p, 0);
  float a = s.a * u_opacity;
  if(u_hasSel == 1) a *= texelFetch(u_sel, p, 0).r;
  if(u_hasCov == 1) a *= texelFetch(u_cov, p, 0).r;
  vec4 r = composeOver(d, s.rgb, a, u_mode, gl_FragCoord.xy);
  if(u_lockAlpha == 1) r = vec4(mix(d.rgb, r.rgb, d.a > 0.0 ? 1.0 : 0.0), d.a);
  o = r;
}`,
  Nr =
    J +
    `
uniform sampler2D u_dst;
uniform sampler2D u_src;
uniform sampler2D u_sel;
uniform int u_hasSel;
uniform float u_fade;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 d = texelFetch(u_dst, p, 0), s = texelFetch(u_src, p, 0);
  float t = u_fade * (u_hasSel == 1 ? texelFetch(u_sel, p, 0).r : 1.0);
  o = unpremul(mix(premul(d), premul(s), t));
}`,
  Ch =
    J +
    `
uniform sampler2D u_old;
uniform sampler2D u_shape;   // rgba8 shape raster (alpha) placed at u_shapeOrigin
uniform vec2 u_shapeOrigin;
uniform int u_hasOld;
uniform int u_op;            // 0 replace 1 add 2 subtract 3 intersect
uniform int u_shapeChannel;  // 0: alpha, 1: red
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  float old = u_hasOld == 1 ? texelFetch(u_old, p, 0).r : 0.0;
  ivec2 q = p - ivec2(u_shapeOrigin); ivec2 s = textureSize(u_shape, 0);
  vec4 sv = (q.x < 0 || q.y < 0 || q.x >= s.x || q.y >= s.y) ? vec4(0.0) : texelFetch(u_shape, q, 0);
  float sh = u_shapeChannel == 1 ? sv.r : sv.a;
  float r;
  if(u_op == 0) r = sh; else if(u_op == 1) r = max(old, sh); else if(u_op == 2) r = old * (1.0 - sh); else r = min(old, sh);
  o = vec4(r, 0.0, 0.0, 1.0);
}`,
  Ai =
    J +
    `
uniform sampler2D u_src;
uniform int u_op;  // 0 invert, 1 from alpha, 2 from luminance, 3 contract/expand via distance, 4 smoothstep sharpen, 5 border
uniform vec4 u_p;
uniform sampler2D u_aux;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 v = texelFetch(u_src, p, 0);
  float r;
  if(u_op == 0) r = 1.0 - v.r;
  else if(u_op == 1) r = v.a;
  else if(u_op == 2) r = luma(v.rgb) * v.a;
  else if(u_op == 3){ // u_p.x = amount (+expand / -contract); src = distOut (to selected), aux = distIn (to unselected)
    float dOut = v.r, dIn = texelFetch(u_aux, p, 0).r;
    if(u_p.x >= 0.0) r = clamp(u_p.x + 0.5 - dOut, 0.0, 1.0);
    else r = clamp(dIn - (-u_p.x) - 0.5 + 1.0, 0.0, 1.0);
  }
  else if(u_op == 4) r = smoothstep(u_p.x, u_p.y, v.r);
  else { float dOut = v.r, dIn = texelFetch(u_aux, p, 0).r; r = clamp(u_p.x * 0.5 + 0.5 - min(dOut, dIn), 0.0, 1.0); }
  o = vec4(r, 0.0, 0.0, 1.0);
}`,
  Oo =
    ke +
    `
layout(location = 0) in vec4 a_dab;
layout(location = 1) in vec4 a_shape;
layout(location = 2) in vec3 a_color;
layout(location = 3) in vec4 a_extra;
uniform vec2 u_size;
uniform int u_plane;   // CMYK K plane: colour comes from a_shape.z
out vec2 v_local;
out float v_alpha;
out vec3 v_color;
out vec2 v_px;
out float v_radius;
out vec4 v_extra;
out float v_round;
void main(){
  int id = gl_VertexID;
  vec2 corner = vec2((id == 1 || id == 2 || id == 4) ? 1.0 : -1.0, (id == 2 || id == 4 || id == 5) ? 1.0 : -1.0);
  float r = a_dab.z + 1.5;
  float ca = cos(a_shape.x), sa = sin(a_shape.x);
  vec2 off = corner * r;
  vec2 pos = a_dab.xy + off;
  v_local = vec2(ca * off.x + sa * off.y, -sa * off.x + ca * off.y) / vec2(a_dab.z, a_dab.z * max(a_shape.y, 0.02));
  v_alpha = a_dab.w; v_color = u_plane == 1 ? vec3(a_shape.z) : a_color; v_px = pos; v_radius = a_dab.z; v_extra = a_extra; v_round = max(a_shape.y, 0.02);
  gl_Position = vec4(pos / u_size * 2.0 - 1.0, 0.0, 1.0);
}`,
  jr = `
float fbm3(vec2 p){ return vnoise(p) * 0.55 + vnoise(p * 2.13 + 7.1) * 0.3 + vnoise(p * 4.37 + 3.3) * 0.15; }
// Paper grain fixed to the canvas. With pressure-grain, light pressure only catches the peaks.
float grainMask(vec2 px, float scale, float strength, int byPressure, float pressure){
  if(strength <= 0.0) return 1.0;
  float g = fbm3(px / max(scale, 0.3));
  float m = byPressure == 1 ? smoothstep(0.92 - pressure * 0.85 - 0.12, 0.92 - pressure * 0.85 + 0.12, g)
                            : smoothstep(0.2, 0.8, g);
  return mix(1.0, m, strength);
}
// Bristles: streaks run along the stroke (local x), indexed across it (local y). The same seed for
// the whole stroke keeps each bristle continuous; each bristle runs dry after its own distance.
float bristleMask(vec2 loc, float radius, float roundness, float count, float seed, float dist, float dryLen){
  float yb = loc.y * 0.5 + 0.5;
  if(yb < 0.0 || yb > 1.0) return 0.0;
  float n = max(count, 1.0);
  float fi = floor(yb * n), fr = fract(yb * n);
  float h1 = hash12(vec2(fi, seed)), h2 = hash12(vec2(fi + 17.3, seed * 1.37 + 2.0)), h3 = hash12(vec2(fi + 5.1, seed + 9.0));
  float w = 0.3 + 0.65 * h1;
  float core = 1.0 - smoothstep(w * 0.5 - 0.12, w * 0.5 + 0.12, abs(fr - 0.5));
  float pxPerBristle = 2.0 * radius * roundness / n;
  core = mix(core, w, clamp(1.4 - pxPerBristle, 0.0, 1.0));   // sub-pixel bristles average out instead of aliasing
  float dens = 0.55 + 0.45 * h2;
  float dry = 1.0;
  if(dryLen > 0.0){ float L = dryLen * (0.35 + 1.3 * h3); dry = 1.0 - smoothstep(L * 0.7, L, dist); }
  return core * dens * dry;
}
`,
  Eh =
    ke +
    ja +
    jr +
    `
in vec2 v_local; in float v_alpha; in vec3 v_color; in vec2 v_px; in float v_radius; in vec4 v_extra; in float v_round;
uniform float u_hardness;
uniform int u_tip;        // 0 round, 1 square, 2 chalk, 3 texture, 4 pencil, 5 bristle, 6 watercolour
uniform sampler2D u_tipTex;
uniform float u_texScale;
uniform float u_grain;
uniform float u_grainScale;
uniform int u_grainPressure;
uniform float u_bristles;
uniform float u_bristleDry;
out vec4 o;
float softRound(float d, float h, float aa){
  if(h >= 0.999) return 1.0 - smoothstep(1.0 - aa, 1.0 + aa * 0.5, d);
  float t = clamp((d - h) / max(1.0 - h, 1e-4), 0.0, 1.0);
  return (1.0 - t * t * (3.0 - 2.0 * t)) * (1.0 - smoothstep(1.0 - aa, 1.0, d));
}
void main(){
  float a;
  float aa = 1.0 / max(v_radius * v_round, 0.5);
  float h = clamp(u_hardness, 0.0, 1.0);
  if(u_tip == 3){
    vec2 uv = v_local * 0.5 + 0.5;
    if(any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) discard;
    a = texture(u_tipTex, uv).a;
  } else if(u_tip == 4){
    float d = max(abs(v_local.x), abs(v_local.y));
    d = v_radius < 2.0 ? d : length(v_local);
    a = d <= 1.0 ? 1.0 : 0.0;
  } else if(u_tip == 5){
    // bristle: soft-ended oval envelope times the bristle streaks
    float env = softRound(length(v_local * vec2(1.0, 0.92)), max(h, 0.35), aa);
    a = env * bristleMask(v_local, v_radius, v_round, u_bristles, v_extra.x, v_extra.z, u_bristleDry);
  } else if(u_tip == 6){
    // watercolour: wobbly, noise-eroded edge that changes from dab to dab
    float wob = (fbm3(v_px * 0.045 + v_extra.x * 13.0) - 0.5) * 0.42;
    float d = length(v_local) * (1.0 + wob);
    a = softRound(d, h * 0.8, aa * 2.0) * (0.8 + 0.4 * hash12(vec2(v_extra.x, 3.0)));
  } else {
    float d = u_tip == 1 ? max(abs(v_local.x), abs(v_local.y)) : length(v_local);
    a = softRound(d, h, aa);
    if(u_tip == 2){ float n = vnoise(v_px * u_texScale) * 0.6 + vnoise(v_px * u_texScale * 3.1) * 0.4; a *= smoothstep(0.35, 0.65, n + (a - 0.5) * 0.6); }
  }
  a *= grainMask(v_px, u_grainScale, u_grain, u_grainPressure, v_extra.y);
  a = clamp(a * v_alpha, 0.0, 1.0);
  if(a <= 0.0) discard;
  o = vec4(v_color * a, a);
}`,
  Lh =
    J +
    `
uniform sampler2D u_layer;
uniform sampler2D u_stroke;   // premultiplied accumulation
uniform sampler2D u_sel;
uniform int u_hasSel;
uniform float u_opacity;
uniform int u_mode;           // blend mode index, or 100 erase, 101 clone, 102 heal, 103 mask paint, 104 spot preview
uniform int u_lockAlpha;
uniform sampler2D u_source;   // snapshot for clone / heal
uniform sampler2D u_srcBlur;
uniform sampler2D u_dstBlur;
uniform vec2 u_srcOffset;
uniform int u_isMask;
uniform float u_maskValue;
uniform sampler2D u_strokeBlur;   // blurred stroke coverage (alpha) for wet edges
uniform float u_wet;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 L = texelFetch(u_layer, p, 0);
  vec4 S = texelFetch(u_stroke, p, 0);
  float sa = clamp(S.a, 0.0, 1.0);
  if(u_wet > 0.0 && sa > 0.0){
    // pigment pools where the wash is drying: denser at the edge, paler in the middle
    float b = texelFetch(u_strokeBlur, p, 0).a;
    float edge = smoothstep(0.0, 0.35, sa - b);
    // granulation: pigment settles unevenly in the paper's tooth
    float gran = 0.85 + 0.3 * vnoise(gl_FragCoord.xy * 0.35);
    sa = clamp(sa * mix(1.0, (0.3 + 1.6 * edge) * gran, u_wet), 0.0, 1.0);
  }
  float a = sa * u_opacity;
  if(u_hasSel == 1) a *= texelFetch(u_sel, p, 0).r;
  if(u_isMask == 1){
    float v = u_mode == 100 ? 1.0 - u_maskValue : u_maskValue;
    if(u_mode < 100) v = S.a > 0.0 ? luma(S.rgb / S.a) : u_maskValue;
    o = vec4(mix(L.r, v, a), 0.0, 0.0, 1.0); return;
  }
  if(a <= 0.0){ o = L; return; }
  if(u_mode == 100){ o = u_lockAlpha == 1 ? L : vec4(L.rgb, L.a * (1.0 - a)); return; }
  if(u_mode == 104){ o = composeOver(L, vec3(0.85, 0.2, 0.25), a * 0.5, 0, gl_FragCoord.xy); return; }
  vec3 col; float ca = 1.0;
  if(u_mode == 101 || u_mode == 102){
    ivec2 sp = p + ivec2(u_srcOffset);
    vec4 s = fetchClamp(u_source, sp);
    if(u_mode == 102){
      vec4 sb = fetchClamp(u_srcBlur, sp), db = texelFetch(u_dstBlur, p, 0);
      col = s.rgb - sb.rgb + db.rgb; ca = max(s.a, L.a);
    } else { col = s.rgb; ca = s.a; }
    vec4 r = composeOver(L, col, a * ca, 0, gl_FragCoord.xy);
    if(u_lockAlpha == 1) r.a = L.a;
    o = r; return;
  }
  col = S.rgb / max(S.a, 1e-6);
  if(u_lockAlpha == 1){
    vec3 B = (u_mode == 0) ? col : blendRGB(u_mode, L.rgb, col);
    o = vec4(mix(L.rgb, B, a), L.a); return;
  }
  o = composeOver(L, col, a, u_mode, gl_FragCoord.xy);
}`,
  Ah =
    J +
    jr +
    `
in vec2 v_local; in float v_alpha; in vec3 v_color; in vec2 v_px; in float v_radius; in vec4 v_extra; in float v_round;
uniform sampler2D u_tmp;      // copy of the working texture before this dab
uniform sampler2D u_sel;
uniform int u_hasSel;
uniform int u_tool;           // 0 smudge 1 blur 2 sharpen 3 dodge 4 burn 5 sponge-sat 6 sponge-desat 7 mixer
uniform float u_hardness;
uniform float u_strength;
uniform vec2 u_delta;         // smudge drag delta
uniform int u_range;          // dodge/burn: 0 shadows 1 midtones 2 highlights
uniform float u_bristles;     // > 0: bristle tip
uniform float u_bristleDry;
uniform float u_wet;          // mixer: canvas pick-up
uniform float u_load;         // mixer: remaining clean paint 0..1
uniform float u_grain;
uniform float u_grainScale;
out vec4 o;
void main(){
  float d = length(v_local);
  if(d > 1.0) discard;
  float h = clamp(u_hardness, 0.0, 0.98);
  float t = clamp((d - h) / (1.0 - h), 0.0, 1.0);
  float f = (1.0 - t * t * (3.0 - 2.0 * t)) * v_alpha * u_strength;
  if(u_bristles > 0.0) f *= bristleMask(v_local, v_radius, v_round, u_bristles, v_extra.x, v_extra.z, u_bristleDry);
  f *= grainMask(v_px, u_grainScale, u_grain, 0, 1.0);
  ivec2 p = ivec2(gl_FragCoord.xy);
  if(u_hasSel == 1) f *= texelFetch(u_sel, p, 0).r;
  vec4 c = texelFetch(u_tmp, p, 0);
  vec4 r = c;
  if(u_tool == 0){
    vec4 s = sampleBilinear(u_tmp, gl_FragCoord.xy - u_delta, true);
    r = unpremul(mix(premul(c), premul(s), f));
  } else if(u_tool == 7){
    // mixer: drag wet canvas colour along and blend it with the brush's (depleting) paint load
    vec4 s = sampleBilinear(u_tmp, gl_FragCoord.xy - u_delta, true);
    vec4 paint = vec4(v_color, 1.0);
    vec4 pickup = premul(s);
    float k = clamp((1.0 - u_wet) * u_load, 0.0, 1.0);
    if(pickup.a < 0.01) k = max(k, u_load);        // nothing to pick up on empty canvas: lay down what's on the brush
    vec4 brush = mix(pickup, paint, k);
    r = unpremul(mix(premul(c), brush, f));
  } else if(u_tool == 1 || u_tool == 2){
    int R = int(clamp(v_radius * 0.12, 1.0, 6.0));
    vec4 acc = vec4(0.0); float n = 0.0;
    for(int y = -6; y <= 6; y++) for(int x = -6; x <= 6; x++){
      if(abs(x) > R || abs(y) > R) continue;
      acc += premul(fetchClamp(u_tmp, p + ivec2(x, y))); n += 1.0;
    }
    vec4 avg = acc / n;
    if(u_tool == 1) r = unpremul(mix(premul(c), avg, f));
    else { vec4 pc = premul(c); r = unpremul(pc + (pc - avg) * f * 1.5); r.a = c.a; }
  } else if(u_tool == 3 || u_tool == 4){
    float l = luma(c.rgb);
    float w = u_range == 0 ? (1.0 - l) * (1.0 - l) : u_range == 2 ? l * l : 1.0 - abs(l - 0.5) * 2.0;
    float e = f * w * 0.5;
    r.rgb = u_tool == 3 ? c.rgb + (1.0 - c.rgb) * e * 1.2 + c.rgb * e * 0.3 : c.rgb * (1.0 - e * 1.2);
  } else {
    float l = luma(c.rgb);
    r.rgb = mix(vec3(l), c.rgb, 1.0 + (u_tool == 5 ? f : -f));
  }
  o = r;
}`,
  Rh =
    J +
    `
uniform sampler2D u_src;
uniform sampler2D u_mask;   // r > 0 => unknown
uniform int u_step;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 c = texelFetch(u_src, p, 0);
  float m = texelFetch(u_mask, p, 0).a;
  if(m <= 0.001){ o = c; return; }
  vec4 acc = vec4(0.0);
  acc += premul(fetchClamp(u_src, p + ivec2(u_step, 0)));
  acc += premul(fetchClamp(u_src, p - ivec2(u_step, 0)));
  acc += premul(fetchClamp(u_src, p + ivec2(0, u_step)));
  acc += premul(fetchClamp(u_src, p - ivec2(0, u_step)));
  o = unpremul(acc * 0.25);
}`,
  Fh =
    J +
    `
uniform sampler2D u_orig;
uniform sampler2D u_fill;
uniform sampler2D u_mask;
uniform float u_grain;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 c = texelFetch(u_orig, p, 0), f = texelFetch(u_fill, p, 0);
  float m = clamp(texelFetch(u_mask, p, 0).a * 1.5, 0.0, 1.0);
  f.rgb += (hash12(gl_FragCoord.xy) - 0.5) * u_grain;
  o = unpremul(mix(premul(c), premul(f), m));
}`,
  Ri =
    J +
    `
uniform sampler2D u_src;
uniform vec2 u_origin;
uniform int u_unpremul;
out vec4 o;
void main(){
  ivec2 q = ivec2(gl_FragCoord.xy) - ivec2(u_origin);
  ivec2 s = textureSize(u_src, 0);
  if(q.x < 0 || q.y < 0 || q.x >= s.x || q.y >= s.y){ o = vec4(0.0); return; }
  vec4 c = texelFetch(u_src, q, 0);
  o = u_unpremul == 1 ? unpremul(c) : c;
}`,
  Dh =
    J +
    `
uniform sampler2D u_img;
uniform sampler2D u_sel;
uniform sampler2D u_mask;       // for mask view
uniform highp sampler3D u_lut3d;
uniform mat3 u_screenToDoc;     // screen device px (top-left origin) -> doc px
uniform vec2 u_docSize;
uniform vec2 u_canvasSize;
uniform float u_zoom;           // device px per doc px
uniform float u_time;
uniform int u_hasSel;
uniform int u_quickMask;
uniform int u_maskView;
uniform int u_proof;
uniform int u_gamutWarn;
uniform int u_pixelGrid;
uniform vec3 u_pasteboard;
uniform vec3 u_check1;
uniform vec3 u_check2;
uniform float u_checkSize;
out vec4 o;
float selAt(vec2 sp){
  vec3 d = u_screenToDoc * vec3(sp, 1.0);
  ivec2 q = ivec2(floor(d.xy));
  if(q.x < 0 || q.y < 0 || float(q.x) >= u_docSize.x || float(q.y) >= u_docSize.y) return 0.0;
  return texelFetch(u_sel, q, 0).r;
}
void main(){
  vec2 sp = vec2(gl_FragCoord.x, u_canvasSize.y - gl_FragCoord.y);  // top-left origin
  vec3 dh = u_screenToDoc * vec3(sp, 1.0);
  vec2 d = dh.xy;
  if(d.x < 0.0 || d.y < 0.0 || d.x >= u_docSize.x || d.y >= u_docSize.y){
    o = vec4(u_pasteboard, 1.0);
    return;
  }
  vec4 c;
  if(u_zoom >= 2.0) c = texelFetch(u_img, ivec2(floor(d)), 0);
  else {
    vec2 uv = d / u_docSize;
    float lod = max(0.0, log2(1.0 / u_zoom));
    c = textureLod(u_img, uv, lod);
    c = c.a > 0.0 ? vec4(c.rgb / c.a, c.a) : c;  // composite is premultiplied for filtering
  }
  if(u_zoom >= 2.0) c = c.a > 0.0 ? vec4(c.rgb / c.a, c.a) : c;
  if(u_maskView == 1){ float m = texelFetch(u_mask, ivec2(floor(d)), 0).r; c = vec4(vec3(m), 1.0); }
  if(u_proof == 1){
    vec3 lc = clamp(c.rgb, 0.0, 1.0);
    vec4 l = texture(u_lut3d, lc * (32.0/33.0) + 0.5/33.0);
    c.rgb = l.rgb;
    if(u_gamutWarn == 1 && l.a > 0.5) c.rgb = vec3(0.5);
  }
  vec2 ck = floor(sp / u_checkSize);
  vec3 bg = mod(ck.x + ck.y, 2.0) < 1.0 ? u_check1 : u_check2;
  vec3 col = mix(bg, c.rgb, clamp(c.a, 0.0, 1.0));
  if(u_quickMask == 1){ float s = selAt(sp); col = mix(col, vec3(1.0, 0.15, 0.15), (1.0 - s) * 0.5); }
  if(u_hasSel == 1 && u_quickMask == 0){
    float s0 = step(0.5, selAt(sp));
    float e = abs(s0 - step(0.5, selAt(sp + vec2(1.0, 0.0)))) + abs(s0 - step(0.5, selAt(sp + vec2(0.0, 1.0))));
    if(e > 0.0){
      float k = mod(floor((sp.x + sp.y) / 4.0 + u_time * 8.0), 2.0);
      col = vec3(k);
    }
  }
  if(u_pixelGrid == 1 && u_zoom >= 8.0){
    vec2 f = fract(d); vec2 g = f * u_zoom;
    if(g.x < 1.0 || g.y < 1.0) col = mix(col, vec3(0.5), 0.35);
  }
  o = vec4(col, 1.0);
}`,
  zh =
    J +
    `
uniform sampler2D u_src;
out vec4 o;
void main(){ vec4 c = texelFetch(u_src, ivec2(gl_FragCoord.xy), 0); o = vec4(c.rgb * c.a, c.a); }`,
  Fi =
    J +
    `
uniform sampler2D u_src;
uniform vec2 u_srcSize;
uniform vec2 u_dstSize;
uniform int u_gray;
out vec4 o;
void main(){
  vec2 scale = u_srcSize / u_dstSize;
  vec2 base = floor(gl_FragCoord.xy) * scale;
  vec4 acc = vec4(0.0); float n = 0.0;
  for(int y = 0; y < 4; y++) for(int x = 0; x < 4; x++){
    vec2 q = base + (vec2(x, y) + 0.5) * scale / 4.0;
    vec4 v = fetchClamp(u_src, ivec2(q));
    if(u_gray == 1) v = vec4(v.rrr, 1.0);
    acc += premul(v); n += 1.0;
  }
  o = clamp(unpremul(acc / n), 0.0, 1.0);
}`;
function jn(s, e = !1, t = 1024) {
  const n = [...s.stops].sort((a, o) => a.pos - o.pos),
    i = new Float32Array(t * 4);
  for (let a = 0; a < t; a++) {
    let o = a / (t - 1);
    e && (o = 1 - o);
    let r = 0;
    for (; r < n.length - 1 && n[r + 1].pos < o;) r++;
    const l = n[r],
      c = n[Math.min(r + 1, n.length - 1)];
    let u = c.pos > l.pos ? (o - l.pos) / (c.pos - l.pos) : 0;
    ((u = Math.max(0, Math.min(1, u))), o <= n[0].pos && (u = 0));
    for (let d = 0; d < 3; d++) i[a * 4 + d] = l.color[d] + (c.color[d] - l.color[d]) * u;
    i[a * 4 + 3] = l.alpha + (c.alpha - l.alpha) * u;
  }
  return i;
}
function Gn(s, e) {
  return [
    {
      name: "Foreground to Background",
      stops: [
        { pos: 0, color: s, alpha: 1 },
        { pos: 1, color: e, alpha: 1 },
      ],
    },
    {
      name: "Foreground to Transparent",
      stops: [
        { pos: 0, color: s, alpha: 1 },
        { pos: 1, color: s, alpha: 0 },
      ],
    },
    {
      name: "Black, White",
      stops: [
        { pos: 0, color: [0, 0, 0], alpha: 1 },
        { pos: 1, color: [1, 1, 1], alpha: 1 },
      ],
    },
    {
      name: "Spectrum",
      stops: [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
        [1, 0, 1],
        [1, 0, 0],
      ].map((t, n) => ({ pos: n / 6, color: t, alpha: 1 })),
    },
    {
      name: "Warm Vellum",
      stops: [
        { pos: 0, color: [0.2, 0.12, 0.08], alpha: 1 },
        { pos: 0.55, color: [0.72, 0.52, 0.32], alpha: 1 },
        { pos: 1, color: [0.96, 0.91, 0.8], alpha: 1 },
      ],
    },
    {
      name: "Copper",
      stops: [
        { pos: 0, color: [0.59, 0.25, 0.12], alpha: 1 },
        { pos: 0.5, color: [0.94, 0.66, 0.45], alpha: 1 },
        { pos: 1, color: [0.45, 0.19, 0.09], alpha: 1 },
      ],
    },
    {
      name: "Violet, Orange",
      stops: [
        { pos: 0, color: [0.16, 0.09, 0.42], alpha: 1 },
        { pos: 0.5, color: [0.9, 0.2, 0.33], alpha: 1 },
        { pos: 1, color: [1, 0.73, 0.2], alpha: 1 },
      ],
    },
    {
      name: "Transparent Stripes",
      stops: Array.from({ length: 11 }, (t, n) => ({ pos: n / 10, color: s, alpha: n % 2 ? 0 : 1 })),
    },
  ];
}
function Bs(s) {
  return `linear-gradient(90deg, ${[...s.stops]
    .sort((t, n) => t.pos - n.pos)
    .map(
      (t) =>
        `rgba(${Math.round(t.color[0] * 255)},${Math.round(t.color[1] * 255)},${Math.round(t.color[2] * 255)},${t.alpha}) ${(t.pos * 100).toFixed(1)}%`,
    )
    .join(",")})`;
}
const Xe = {
    brightnessContrast: "Brightness/Contrast",
    levels: "Levels",
    curves: "Curves",
    exposure: "Exposure",
    vibrance: "Vibrance",
    hueSaturation: "Hue/Saturation",
    colorBalance: "Color Balance",
    blackWhite: "Black & White",
    photoFilter: "Photo Filter",
    channelMixer: "Channel Mixer",
    invert: "Invert",
    posterize: "Posterize",
    threshold: "Threshold",
    gradientMap: "Gradient Map",
    desaturate: "Desaturate",
  },
  ci = [
    "brightnessContrast",
    "levels",
    "curves",
    "exposure",
    "-",
    "vibrance",
    "hueSaturation",
    "colorBalance",
    "blackWhite",
    "photoFilter",
    "channelMixer",
    "-",
    "invert",
    "posterize",
    "threshold",
    "gradientMap",
    "-",
    "desaturate",
  ],
  Ih = {
    levels: "Ctrl+L",
    curves: "Ctrl+M",
    hueSaturation: "Ctrl+U",
    colorBalance: "Ctrl+B",
    invert: "Ctrl+Shift+I",
    desaturate: "Ctrl+Shift+U",
    blackWhite: "Ctrl+Alt+Shift+B",
  };
function ui(s, e = [0, 0, 0], t = [1, 1, 1]) {
  const n = () => ({ inBlack: 0, inWhite: 1, gamma: 1, outBlack: 0, outWhite: 1 }),
    i = () => [
      [0, 0],
      [1, 1],
    ];
  switch (s) {
    case "brightnessContrast":
      return { brightness: 0, contrast: 0 };
    case "levels":
      return { rgb: n(), r: n(), g: n(), b: n() };
    case "curves":
      return { rgb: i(), r: i(), g: i(), b: i() };
    case "hueSaturation":
      return { hue: 0, saturation: 0, lightness: 0, colorize: !1, cHue: 30, cSat: 25, cLight: 0 };
    case "colorBalance":
      return { shadows: [0, 0, 0], midtones: [0, 0, 0], highlights: [0, 0, 0], preserveLum: !0 };
    case "exposure":
      return { exposure: 0, offset: 0, gamma: 1 };
    case "vibrance":
      return { vibrance: 0, saturation: 0 };
    case "blackWhite":
      return {
        reds: 40,
        yellows: 60,
        greens: 40,
        cyans: 60,
        blues: 20,
        magentas: 80,
        tint: !1,
        tintColor: [0.83, 0.71, 0.55],
      };
    case "photoFilter":
      return { color: [0.93, 0.54, 0.1], density: 25, preserveLum: !0 };
    case "channelMixer":
      return { r: [100, 0, 0, 0], g: [0, 100, 0, 0], b: [0, 0, 100, 0], mono: !1 };
    case "invert":
      return {};
    case "posterize":
      return { levels: 4 };
    case "threshold":
      return { level: 128 };
    case "gradientMap":
      return {
        gradient: {
          name: "Foreground to Background",
          stops: [
            { pos: 0, color: e, alpha: 1 },
            { pos: 1, color: t, alpha: 1 },
          ],
        },
        reverse: !1,
      };
    case "desaturate":
      return {};
  }
}
function Ct(s, e = 1024) {
  const t = [...s].sort((u, d) => u[0] - d[0]),
    n = new Float32Array(e);
  if (t.length < 2) {
    for (let u = 0; u < e; u++) n[u] = u / (e - 1);
    return n;
  }
  const i = t.length,
    a = [],
    o = [],
    r = [];
  for (let u = 0; u < i - 1; u++)
    (a.push(Math.max(1e-6, t[u + 1][0] - t[u][0])), o.push(t[u + 1][1] - t[u][1]), r.push(o[u] / a[u]));
  const l = [r[0]];
  for (let u = 1; u < i - 1; u++) l.push(r[u - 1] * r[u] <= 0 ? 0 : (r[u - 1] + r[u]) / 2);
  l.push(r[i - 2]);
  for (let u = 0; u < i - 1; u++) {
    if (Math.abs(r[u]) < 1e-9) {
      ((l[u] = 0), (l[u + 1] = 0));
      continue;
    }
    const d = l[u] / r[u],
      f = l[u + 1] / r[u],
      m = d * d + f * f;
    if (m > 9) {
      const v = 3 / Math.sqrt(m);
      ((l[u] = v * d * r[u]), (l[u + 1] = v * f * r[u]));
    }
  }
  let c = 0;
  for (let u = 0; u < e; u++) {
    const d = u / (e - 1);
    if (d <= t[0][0]) {
      n[u] = t[0][1];
      continue;
    }
    if (d >= t[i - 1][0]) {
      n[u] = t[i - 1][1];
      continue;
    }
    for (; c < i - 2 && d > t[c + 1][0];) c++;
    const f = a[c],
      m = (d - t[c][0]) / f,
      v = 2 * m * m * m - 3 * m * m + 1,
      y = m * m * m - 2 * m * m + m,
      b = -2 * m * m * m + 3 * m * m,
      x = m * m * m - m * m;
    n[u] = Math.min(1, Math.max(0, v * t[c][1] + y * f * l[c] + b * t[c + 1][1] + x * f * l[c + 1]));
  }
  return n;
}
function Oh(s) {
  const e = new Float32Array(32),
    t = s.params || {};
  let n = null,
    i = "";
  const a = (o, r = 0, l = 0, c = 0, u = 0) => {
    ((e[o * 4] = r), (e[o * 4 + 1] = l), (e[o * 4 + 2] = c), (e[o * 4 + 3] = u));
  };
  switch (s.type) {
    case "brightnessContrast":
      a(0, t.brightness / 150, t.contrast / 100);
      break;
    case "levels": {
      ["rgb", "r", "g", "b"].forEach((o, r) => {
        const l = t[o];
        (a(r, l.inBlack, l.inWhite, l.gamma), a(4 + r, l.outBlack, l.outWhite));
      });
      break;
    }
    case "curves": {
      n = new Float32Array(1024 * 4);
      const o = Ct(t.rgb),
        r = Ct(t.r),
        l = Ct(t.g),
        c = Ct(t.b);
      for (let u = 0; u < 1024; u++)
        ((n[u * 4] = r[u]), (n[u * 4 + 1] = l[u]), (n[u * 4 + 2] = c[u]), (n[u * 4 + 3] = o[u]));
      i = JSON.stringify([t.rgb, t.r, t.g, t.b]);
      break;
    }
    case "hueSaturation":
      (a(0, t.hue / 360, t.saturation / 100, t.lightness / 100, t.colorize ? 1 : 0),
        a(1, t.cHue / 360, t.cSat / 100, t.cLight / 100));
      break;
    case "colorBalance":
      (a(0, ...t.shadows.map((o) => o / 100)),
        a(1, ...t.midtones.map((o) => o / 100)),
        a(2, ...t.highlights.map((o) => o / 100)),
        a(3, t.preserveLum ? 1 : 0));
      break;
    case "exposure":
      a(0, t.exposure, t.offset, t.gamma);
      break;
    case "vibrance":
      a(0, t.vibrance / 100, t.saturation / 100);
      break;
    case "blackWhite":
      (a(0, t.reds / 100, t.yellows / 100, t.greens / 100, t.cyans / 100),
        a(1, t.blues / 100, t.magentas / 100, t.tint ? 1 : 0),
        a(2, t.tintColor[0], t.tintColor[1], t.tintColor[2]));
      break;
    case "photoFilter":
      (a(0, t.color[0], t.color[1], t.color[2], t.density / 100), a(1, t.preserveLum ? 1 : 0));
      break;
    case "channelMixer":
      (a(0, t.r[0] / 100, t.r[1] / 100, t.r[2] / 100, t.r[3] / 100),
        a(1, t.g[0] / 100, t.g[1] / 100, t.g[2] / 100, t.g[3] / 100),
        a(2, t.b[0] / 100, t.b[1] / 100, t.b[2] / 100, t.b[3] / 100),
        a(3, t.mono ? 1 : 0));
      break;
    case "posterize":
      a(0, t.levels);
      break;
    case "threshold":
      a(0, t.level / 255);
      break;
    case "gradientMap": {
      ((n = jn(t.gradient, t.reverse)), (i = JSON.stringify([t.gradient, t.reverse])));
      break;
    }
  }
  return { type: fh[s.type], p: e, lut: n, lutKey: i };
}
const Bh =
    ke +
    `
uniform sampler2D u_a;
uniform sampler2D u_k;
uniform sampler2D u_rgb;
uniform float u_tac;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(u_a, p, 0);
  float total = 3.0 - a.r - a.g - a.b + 1.0 - texelFetch(u_k, p, 0).r;
  vec4 c = texelFetch(u_rgb, p, 0);
  if(a.a > 0.0 && total > u_tac + 0.005){
    float s = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 8.0));
    c.rgb = mix(c.rgb, mix(vec3(1.0, 0.1, 0.75), vec3(0.1, 0.9, 0.3), s), 0.8);
    c.a = max(c.a, 0.85);
  }
  o = c;
}`,
  Wt = new Map();
function $h(s, e) {
  let t = Wt.get(s);
  if (t && !t.disposed) return t;
  if (((t = g.createTex(1024, 1, "rgba32f", { linear: !1 })), g.upload(t, e), Wt.set(s, t), Wt.size > 64)) {
    const n = Wt.keys().next().value;
    (g.dispose(Wt.get(n)), Wt.delete(n));
  }
  return t;
}
const At = () => ({
    comp: g.program("composite", dh),
    masked: g.program("maskedCopy", Ga),
    mix: g.program("mix", ph),
    adjust: g.program("adjust", gh),
    premul: g.program("premul", zh),
  }),
  qh = new Set([
    "hueSaturation",
    "colorBalance",
    "exposure",
    "vibrance",
    "blackWhite",
    "photoFilter",
    "threshold",
    "gradientMap",
    "channelMixer",
    "desaturate",
  ]),
  Nh =
    ke +
    `
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform sampler2D u_mask;
uniform int u_hasMask;
uniform float u_t;
uniform vec2 u_maskOffset;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  float t = u_t * (u_hasMask == 1 ? texelFetch(u_mask, p - ivec2(u_maskOffset), 0).r : 1.0);
  o = mix(texelFetch(u_a, p, 0), texelFetch(u_b, p, 0), t);
}`;
function yn(s, e, t, n = null, i = 1, a = [0, 0]) {
  if (s.k && s.ink && qh.has(e.type)) {
    const c = s.format === "rgba32f" ? "rgba32f" : "rgba16f",
      u = g.toRgb(s, t, [1, 1, 1, 1], -1, c),
      d = yn(u, e, t);
    g.release(u);
    const f = g.toPair(d, s.ink, t);
    if ((g.release(d), !n && i >= 0.999)) return f;
    const m = g.acquireLike(s, c);
    return (
      g.draw(g.program("mixOff", Nh), m, {
        textures: { u_a: s, u_b: f, u_mask: n },
        uniforms: { u_t: i, u_hasMask: n ? 1 : 0, u_maskOffset: a },
        rect: t,
      }),
      g.release(f),
      m
    );
  }
  const o = Oh(e),
    r = g.acquireLike(s, s.format === "rgba32f" ? "rgba32f" : "rgba16f"),
    l = o.lut ? $h(o.lutKey || "x", o.lut) : null;
  return (
    g.draw(At().adjust, r, {
      textures: { u_base: s, u_mask: n, u_lut: l },
      uniforms: { u_type: o.type, u_p: o.p, u_hasMask: n ? 1 : 0, u_opacity: i, u_maskOffset: a },
      rect: t,
    }),
    r
  );
}
function Et(s, e, t, n, i, a, o = !1, r = [0, 0]) {
  const l = g.acquireLike(s);
  return (
    g.draw(At().comp, l, {
      textures: { u_base: s, u_src: e, u_mask: t },
      uniforms: { u_opacity: n, u_mode: wt[i] ?? 0, u_hasMask: t ? 1 : 0, u_clip: o ? 1 : 0, u_srcOffset: r },
      rect: a,
    }),
    g.release(s),
    l
  );
}
const fa = [];
function ma() {
  for (; fa.length;) g.release(fa.pop());
}
const jh =
  ke +
  `
uniform sampler2D u_a;
uniform sampler2D u_b;
out vec4 o;
void main(){ ivec2 p = ivec2(gl_FragCoord.xy); o = vec4(texelFetch(u_a, p, 0).r * texelFetch(u_b, p, 0).r, 0.0, 0.0, 1.0); }`;
function $s(s, e) {
  const t = s.preview.get(e.id + ":mask"),
    n = e.mask && e.maskEnabled ? (t ? t.tex : e.mask) : null,
    i =
      e.vmaskTex && e.vmaskEnabled !== !1 && !e.vmaskTex.disposed
        ? s.preview.get(e.id + ":vmask")?.tex || e.vmaskTex
        : null;
  if (!i) return n;
  if (!n) return i;
  const a = g.acquire(n.w, n.h, "r16f");
  return (g.draw(g.program("maskMul", jh), a, { textures: { u_a: n, u_b: i } }), fa.push(a), a);
}
function Bo(s, e) {
  const t = s.preview.get(e.id),
    n = $s(s, e);
  return t ? { tex: t.tex, offset: t.offset || [0, 0], mask: n } : { tex: e.tex, offset: [0, 0], mask: n };
}
function Wn(s) {
  const e = s.fx;
  return e ? !!(e.dropShadow?.enabled || e.outerGlow?.enabled || e.stroke?.enabled || e.colorOverlay?.enabled) : !1;
}
function hi(s) {
  const e = s.fx;
  if (!e) return 0;
  let t = 0;
  return (
    e.dropShadow?.enabled && (t = Math.max(t, e.dropShadow.size * 2 + e.dropShadow.distance + 4)),
    e.outerGlow?.enabled && (t = Math.max(t, e.outerGlow.size * 2 + 4)),
    e.stroke?.enabled && (t = Math.max(t, e.stroke.size + 4)),
    Math.ceil(t)
  );
}
function It(s, e, t, n = {}) {
  const i = Math.max(1, Math.ceil(e * (n.box ? 1 : 3))),
    a = g.program("blur", vh),
    o = s.format === "rgba32f" ? "rgba32f" : "rgba16f",
    r = n.alphaOnly ? g.acquire(s.w, s.h, o) : g.acquireLike(s, o),
    l = n.alphaOnly ? g.acquire(s.w, s.h, o) : g.acquireLike(s, o),
    c = ae(Ve(t, i + 2), s.w, s.h);
  return (
    g.draw(a, r, {
      textures: { u_src: s },
      uniforms: {
        u_dir: [1, 0],
        u_sigma: e,
        u_radius: i,
        u_box: n.box ? 1 : 0,
        u_inPremul: 0,
        u_outPremul: 1,
        u_alphaOnly: n.alphaOnly ? 1 : 0,
      },
      rect: c,
    }),
    g.draw(a, l, {
      textures: { u_src: r },
      uniforms: {
        u_dir: [0, 1],
        u_sigma: e,
        u_radius: i,
        u_box: n.box ? 1 : 0,
        u_inPremul: 1,
        u_outPremul: n.outPremul ? 1 : 0,
        u_alphaOnly: 0,
      },
      rect: ae(t, s.w, s.h),
    }),
    g.release(r),
    l
  );
}
function ls(s, e, t, n = 0, i = !1) {
  const a = g.program("jfaInit", bh),
    o = g.program("jfaStep", wh),
    r = g.program("jfaDist", xh);
  let l = g.acquire(s.w, s.h, "rgba32f"),
    c = g.acquire(s.w, s.h, "rgba32f");
  const u = ae(Ve(e, t + 2), s.w, s.h);
  (g.clear(l, null, [-1e6, -1e6, 0, 1]),
    g.clear(c, null, [-1e6, -1e6, 0, 1]),
    g.draw(a, l, { textures: { u_src: s }, uniforms: { u_channel: n, u_invert: i ? 1 : 0 }, rect: u }));
  let d = 1;
  for (; d < t;) d *= 2;
  for (; d >= 1; d = Math.floor(d / 2))
    (g.draw(o, c, { textures: { u_src: l }, uniforms: { u_step: d }, rect: u }), ([l, c] = [c, l]));
  return (
    g.draw(o, c, { textures: { u_src: l }, uniforms: { u_step: 1 }, rect: u }),
    ([l, c] = [c, l]),
    g.draw(r, c, { textures: { u_src: l }, rect: u }),
    g.release(l),
    c
  );
}
function $o(s, e, t, n) {
  const i = t.fx,
    a = hi(t),
    o = ae(Ve(n, a), e.w, e.h),
    r = g.program("fxColorize", kh);
  if (i.dropShadow?.enabled) {
    const l = i.dropShadow,
      c = Math.max(0.5, l.size / 2.5),
      u = It(e, c, o, { alphaOnly: !0 }),
      d = g.acquire(e.w, e.h, "rgba16f"),
      f = (l.angle * Math.PI) / 180;
    (g.draw(g.program("fxShadow", Io), d, {
      textures: { u_blurA: u },
      uniforms: { u_offset: [-Math.cos(f) * l.distance, Math.sin(f) * l.distance], u_spread: l.spread / 100 },
      rect: n,
    }),
      g.release(u));
    const m = g.acquireLike(s, "rgba16f");
    (g.draw(r, m, { textures: { u_src: d }, uniforms: { u_color: l.color, u_alphaMul: 1 }, rect: n }),
      g.release(d),
      (s = Et(s, m, null, l.opacity * t.opacity, l.mode, n)),
      g.release(m));
  }
  if (i.outerGlow?.enabled) {
    const l = i.outerGlow,
      c = It(e, Math.max(0.5, l.size / 2.5), o, { alphaOnly: !0 }),
      u = g.acquire(e.w, e.h, "rgba16f");
    (g.draw(g.program("fxShadow", Io), u, {
      textures: { u_blurA: c },
      uniforms: { u_offset: [0, 0], u_spread: l.spread / 100 },
      rect: n,
    }),
      g.release(c));
    const d = g.acquireLike(s, "rgba16f");
    (g.draw(r, d, { textures: { u_src: u }, uniforms: { u_color: l.color, u_alphaMul: 1 }, rect: n }),
      g.release(u),
      (s = Et(s, d, null, l.opacity * t.opacity, l.mode, n)),
      g.release(d));
  }
  return s;
}
function qo(s, e, t, n) {
  const i = t.fx;
  if (i.stroke?.enabled) {
    const a = i.stroke,
      o = Math.ceil(a.size + 2),
      r = ls(e, n, o, 0, !1),
      l = ls(e, n, o, 0, !0),
      c = g.acquireLike(s, "rgba16f");
    (g.draw(g.program("fxStroke", _h), c, {
      textures: { u_distOut: r, u_distIn: l, u_src: e },
      uniforms: {
        u_size: a.size,
        u_position: a.position === "outside" ? 0 : a.position === "inside" ? 1 : 2,
        u_color: a.color,
      },
      rect: n,
    }),
      g.release(r),
      g.release(l),
      (s = Et(s, c, null, a.opacity * t.opacity, a.mode, n)),
      g.release(c));
  }
  return s;
}
function Gh(s, e, t) {
  const n = e.fx?.colorOverlay;
  if (!n?.enabled) return null;
  const i = g.acquireLike(s, s.format === "rgba32f" ? "rgba32f" : "rgba16f");
  return (
    g.draw(g.program("fxOverlay", Mh), i, {
      textures: { u_src: s },
      uniforms: { u_color: n.color, u_amount: n.opacity, u_mode: wt[n.mode] ?? 0 },
      rect: t,
    }),
    i
  );
}
function No(s, e, t, n) {
  if (!t.adjust) return e;
  const i = $s(s, t),
    a = yn(e, t.adjust, n, i, t.opacity);
  return (g.release(e), a);
}
function dt(s, e, t, n) {
  for (let i = e.length - 1; i >= 0; i--) {
    const a = e[i],
      o = [];
    for (let m = i - 1; m >= 0 && e[m].clip; m--) o.push(e[m]);
    if (a.clip && i < e.length - 1) {
      let m = i + 1;
      for (; m < e.length && e[m].clip;) m++;
      if (m < e.length) continue;
    }
    if (!a.visible) {
      i -= 0;
      continue;
    }
    if (a.kind === "adjustment") {
      t = No(s, t, a, n);
      continue;
    }
    if (a.kind === "group" && a.blend === "passThrough" && !o.length && !Wn(a)) {
      const m = $s(s, a);
      if (a.opacity >= 0.999 && !m) {
        t = dt(s, a.children, t, n);
        continue;
      }
      const v = g.acquireLike(t);
      (g.copy(t, v, n, n.x, n.y), (t = dt(s, a.children, t, n)));
      const y = g.acquireLike(t);
      (g.draw(At().mix, y, {
        textures: { u_a: v, u_b: t, u_mask: m },
        uniforms: { u_t: a.opacity, u_hasMask: m ? 1 : 0 },
        rect: n,
      }),
        g.release(v),
        g.release(t),
        (t = y));
      continue;
    }
    let r,
      l = [0, 0],
      c,
      u = !1;
    if (a.kind === "group") {
      let m = g.acquireLike(t);
      g.clear(m, n, [0, 0, 0, 0]);
      const v = Wn(a) ? hi(a) : 0,
        y = v ? ae(Ve(n, v), s.width, s.height) : n;
      (v && g.clear(m, y, [0, 0, 0, 0]), (m = dt(s, a.children, m, y)), (r = m), (u = !0), (c = $s(s, a)));
    } else {
      const m = Bo(s, a);
      ((r = m.tex), (l = m.offset), (c = m.mask));
    }
    if (!r) continue;
    if (s.previewAdjust && s.previewAdjust.layerId === a.id) {
      const m = yn(r, s.previewAdjust.op, n);
      (u && g.release(r), (r = m), (u = !0));
    }
    const d = Wn(a);
    d && (l[0] || l[1]) && (l = [0, 0]);
    const f = d ? Gh(r, a, n) : null;
    if ((f && (u && g.release(r), (r = f), (u = !0)), o.some((m) => m.visible))) {
      let m = g.acquireLike(t);
      g.draw(At().masked, m, {
        textures: { u_src: r, u_mask: c },
        uniforms: { u_hasMask: c ? 1 : 0, u_srcOffset: l },
        rect: n,
      });
      for (let v = 0; v < o.length; v++) {
        const y = o[v];
        if (!y.visible) continue;
        if (y.kind === "adjustment") {
          m = No(s, m, y, n);
          continue;
        }
        let b,
          x = [0, 0],
          w,
          _ = !1;
        if (y.kind === "group") {
          let M = g.acquireLike(t);
          (g.clear(M, n, [0, 0, 0, 0]), (M = dt(s, y.children, M, n)), (b = M), (_ = !0), (w = $s(s, y)));
        } else {
          const M = Bo(s, y);
          ((b = M.tex), (x = M.offset), (w = M.mask));
        }
        b &&
          ((m = Et(m, b, w, y.opacity, y.blend === "passThrough" ? "normal" : y.blend, n, !0, x)), _ && g.release(b));
      }
      (d && (t = $o(t, m, a, n)),
        (t = Et(t, m, null, a.opacity, a.blend === "passThrough" ? "normal" : a.blend, n)),
        d && (t = qo(t, m, a, n)),
        g.release(m));
    } else if (d) {
      let m = null,
        v = r;
      if (c) {
        m = g.acquireLike(t);
        const y = ae(Ve(n, hi(a)), s.width, s.height);
        (g.draw(At().masked, m, {
          textures: { u_src: r, u_mask: c },
          uniforms: { u_hasMask: 1, u_srcOffset: [0, 0] },
          rect: y,
        }),
          (v = m));
      }
      ((t = $o(t, v, a, n)),
        (t = Et(t, v, null, a.opacity, a.blend === "passThrough" ? "normal" : a.blend, n)),
        (t = qo(t, v, a, n)),
        m && g.release(m));
    } else t = Et(t, r, c, a.opacity, a.blend === "passThrough" ? "normal" : a.blend, n, !1, l);
    u && g.release(r);
  }
  return t;
}
function Gr(s) {
  let e = 0;
  for (const t of s) t.visible && (e = Math.max(e, Wn(t) ? hi(t) : 0, Gr(t.children)));
  return e;
}
function Wh(s, e) {
  const t = [],
    n = (i) => {
      for (const a of i) {
        const o = s.preview.get(a.id),
          r = s.preview.get(a.id + ":mask");
        (t.push(
          [
            a.id,
            a.kind,
            a.visible ? 1 : 0,
            a.opacity,
            a.blend,
            a.clip ? 1 : 0,
            a.maskEnabled ? 1 : 0,
            a.version,
            a.tex?.serial ?? 0,
            a.mask?.serial ?? 0,
            a.vmaskTex?.serial ?? 0,
            a.vmaskEnabled === !1 ? 0 : 1,
            o ? `p${o.tex.serial}:${o.offset?.join(",") ?? ""}:${o.rev ?? ""}` : "",
            r ? `m${r.tex.serial}` : "",
            a.adjust ? JSON.stringify(a.adjust) : "",
            a.fx ? JSON.stringify(a.fx) : "",
            s.previewAdjust?.layerId === a.id ? JSON.stringify(s.previewAdjust.op) : "",
          ].join("|"),
        ),
          a.children.length && (t.push("["), n(a.children), t.push("]")));
      }
    };
  return (n(e), t.join(";"));
}
function Uh(s) {
  const e = s.active;
  if (!e) return -1;
  let t = e;
  for (let i = s.find(e.id); i && i.parent; i = s.find(i.parent.id)) t = i.parent;
  let n = s.layers.indexOf(t);
  if (n < 0) return -1;
  for (; n < s.layers.length - 1 && s.layers[n].clip;) n++;
  return n;
}
function Hh(s) {
  if (!s.dirtyRect) return !1;
  s.wake();
  let e = s.dirtyRect;
  s.dirtyRect = null;
  const t = Gr(s.layers);
  if ((t && (e = Ve(e, t)), (e = ae(e, s.width, s.height)), e.w <= 0 || e.h <= 0)) return !1;
  let n = s.acquireLayer("rgba16f");
  const i = Uh(s),
    a = i >= 0 ? s.layers.slice(i + 1) : [];
  if (a.length >= 2) {
    const o = `${i}:${s.width}x${s.height}:` + Wh(s, a),
      r = s.stackCache;
    if (!r || r.key !== o || r.tex.disposed) {
      const l = { x: 0, y: 0, w: s.width, h: s.height };
      let c = s.acquireLayer("rgba16f");
      (g.clear(c, null, [0, 0, 0, 0]), (c = dt(s, a, c, l)), ma());
      const u = r && !r.tex.disposed && r.tex.w === s.width && r.tex.h === s.height && r.tex.ink === c.ink;
      r && !u && g.dispose(r.tex);
      const d = u ? r.tex : g.createLike(c);
      (g.copy(c, d), g.release(c), (s.stackCache = { key: o, tex: d }), s.stackCacheBuilds++);
    }
    (g.copy(s.stackCache.tex, n, e, e.x, e.y), (n = dt(s, s.layers.slice(0, i + 1), n, e)));
  } else
    (s.stackCache && (g.dispose(s.stackCache.tex), (s.stackCache = null)),
      g.clear(n, e, [0, 0, 0, 0]),
      (n = dt(s, s.layers, n, e)));
  if ((ma(), n.k && s.inkComposite)) {
    g.copy(n, s.inkComposite, e, e.x, e.y);
    const o = g.toRgb(n, e, [1, 1, 1, 1], -1, "rgba16f");
    g.copy(o, s.composite, e, e.x, e.y);
    let l =
      s.singleChannel >= 0 || s.channels.some((c) => !c) ? g.toRgb(n, e, s.channels, s.singleChannel, "rgba16f") : o;
    if (s.showTac) {
      const c = g.acquire(s.width, s.height, "rgba16f");
      (g.draw(g.program("tacWarn", Bh), c, {
        textures: { u_a: n, u_k: n.k, u_rgb: l },
        uniforms: { u_tac: s.tac / 100 },
        rect: e,
      }),
        l !== o && g.release(l),
        (l = c));
    }
    (g.draw(At().premul, s.display, { textures: { u_src: l }, rect: e }), l !== o && g.release(l), g.release(o));
  } else (g.copy(n, s.composite, e, e.x, e.y), g.draw(At().premul, s.display, { textures: { u_src: n }, rect: e }));
  return (g.release(n), g.genMips(s.display), !0);
}
function ve(s, e = s.layers, t = s.layerFormat) {
  const n = { x: 0, y: 0, w: s.width, h: s.height };
  let i = s.acquireLayer(t);
  (g.clear(i, null, [0, 0, 0, 0]), (i = dt(s, e, i, n)), ma());
  const a = g.createLike(i);
  return (g.copy(i, a), a.k || (a.isImage = !0), g.release(i), a);
}
function Wr(s, e, t = s.layerFormat) {
  const n = e.visible;
  e.visible = !0;
  const i = { ...e, clip: !1, opacity: 1, blend: "normal" },
    a = ve(s, [i], t);
  return ((e.visible = n), a);
}
const se = (s, e, t = s, n = e, i = s, a = e, o = !1) => ({ x: s, y: e, ix: t, iy: n, ox: i, oy: a, smooth: o }),
  cs = () => ({ subpaths: [], fillRule: "nonzero" }),
  K = (s) => ({
    fillRule: s.fillRule,
    subpaths: s.subpaths.map((e) => ({ closed: e.closed, nodes: e.nodes.map((t) => ({ ...t })) })),
  }),
  Te = (s) => !s || !s.subpaths.some((e) => e.nodes.length > 0);
function bs(s, e = 0) {
  const t = s.nodes,
    n = [],
    i = s.closed ? t.length : t.length - 1;
  for (let a = 0; a < i; a++) {
    const o = t[a],
      r = t[(a + 1) % t.length];
    n.push({ p0: [o.x, o.y], p1: [o.ox, o.oy], p2: [r.ix, r.iy], p3: [r.x, r.y], sub: e, i: a });
  }
  return n;
}
function Ur(s) {
  return s.subpaths.flatMap((e, t) => bs(e, t));
}
function Pt(s, e) {
  const t = 1 - e,
    n = t * t * t,
    i = 3 * t * t * e,
    a = 3 * t * e * e,
    o = e * e * e;
  return [n * s.p0[0] + i * s.p1[0] + a * s.p2[0] + o * s.p3[0], n * s.p0[1] + i * s.p1[1] + a * s.p2[1] + o * s.p3[1]];
}
const bn = (s) => s.p1[0] === s.p0[0] && s.p1[1] === s.p0[1] && s.p2[0] === s.p3[0] && s.p2[1] === s.p3[1];
function Hr(s, e) {
  const t = (c, u) => [c[0] + (u[0] - c[0]) * e, c[1] + (u[1] - c[1]) * e],
    n = t(s.p0, s.p1),
    i = t(s.p1, s.p2),
    a = t(s.p2, s.p3),
    o = t(n, i),
    r = t(i, a),
    l = t(o, r);
  return [
    [s.p0, n, o, l],
    [l, r, a, s.p3],
  ];
}
function Vr(s, e = 0.35, t = []) {
  if (bn(s)) return (t.push(s.p3), t);
  const n = Math.max(Ae(s.p0, s.p1) + Ae(s.p1, s.p2) + Ae(s.p2, s.p3), 1),
    i = Math.min(512, Math.max(2, Math.ceil(Math.sqrt(n / e))));
  for (let a = 1; a <= i; a++) t.push(Pt(s, a / i));
  return t;
}
function Mt(s, e = 0.35) {
  if (!s.nodes.length) return [];
  const t = [[s.nodes[0].x, s.nodes[0].y]];
  for (const n of bs(s)) Vr(n, e, t);
  return t;
}
const Ae = (s, e) => Math.hypot(s[0] - e[0], s[1] - e[1]);
function ws(s) {
  let e = 1 / 0,
    t = 1 / 0,
    n = -1 / 0,
    i = -1 / 0;
  for (const a of s.subpaths)
    for (const o of Mt(a, 0.5))
      ((e = Math.min(e, o[0])), (t = Math.min(t, o[1])), (n = Math.max(n, o[0])), (i = Math.max(i, o[1])));
  return n < e ? null : { x: e, y: t, w: n - e, h: i - t };
}
function Wa(s, e) {
  let t = null;
  for (const n of Ur(s)) {
    const i = bn(n) ? 24 : 64;
    let a = 0,
      o = 1 / 0;
    for (let c = 0; c <= i; c++) {
      const u = c / i,
        d = Ae(Pt(n, u), e);
      d < o && ((o = d), (a = u));
    }
    let r = Math.max(0, a - 1 / i),
      l = Math.min(1, a + 1 / i);
    for (let c = 0; c < 20; c++) {
      const u = r + (l - r) / 3,
        d = l - (l - r) / 3;
      Ae(Pt(n, u), e) < Ae(Pt(n, d), e) ? (l = d) : (r = u);
    }
    ((a = (r + l) / 2),
      (o = Ae(Pt(n, a), e)),
      (!t || o < t.d) && (t = { sub: n.sub, i: n.i, t: a, pt: Pt(n, a), d: o }));
  }
  return t;
}
function Ua(s, e, t, n) {
  const i = s.subpaths[e],
    a = bs(i, e)[t],
    [o, r] = Hr(a, n),
    l = i.nodes[t],
    c = i.nodes[(t + 1) % i.nodes.length];
  ((l.ox = o[1][0]), (l.oy = o[1][1]), (c.ix = r[2][0]), (c.iy = r[2][1]));
  const u = se(o[3][0], o[3][1], o[2][0], o[2][1], r[1][0], r[1][1], !bn(a));
  return (i.nodes.splice(t + 1, 0, u), t + 1);
}
function Xr(s, e) {
  let t = 0,
    n = 0;
  for (const i of s.subpaths) {
    const a = Mt(i, 0.75);
    if (!(a.length < 2))
      for (let o = 0; o < a.length; o++) {
        const r = a[o],
          l = a[(o + 1) % a.length];
        r[1] <= e[1] != l[1] <= e[1] &&
          r[0] + ((e[1] - r[1]) / (l[1] - r[1])) * (l[0] - r[0]) > e[0] &&
          (n++, (t += l[1] > r[1] ? 1 : -1));
      }
  }
  return s.fillRule === "evenodd" ? n % 2 === 1 : t !== 0;
}
function Rt(s, e) {
  const t = (n, i) => {
    const a = e[6] * n + e[7] * i + e[8];
    return [(e[0] * n + e[1] * i + e[2]) / a, (e[3] * n + e[4] * i + e[5]) / a];
  };
  return {
    fillRule: s.fillRule,
    subpaths: s.subpaths.map((n) => ({
      closed: n.closed,
      nodes: n.nodes.map((i) => {
        const a = t(i.x, i.y),
          o = t(i.ix, i.iy),
          r = t(i.ox, i.oy);
        return { x: a[0], y: a[1], ix: o[0], iy: o[1], ox: r[0], oy: r[1], smooth: i.smooth };
      }),
    })),
  };
}
const qs = (s, e, t) => Rt(s, [1, 0, e, 0, 1, t, 0, 0, 1]),
  ga = 0.5522847498;
function di(s, e, t, n, i = 0) {
  const a = Math.min(s, t),
    o = Math.max(s, t),
    r = Math.min(e, n),
    l = Math.max(e, n);
  if (((i = Math.max(0, Math.min(i, (o - a) / 2, (l - r) / 2))), i <= 0))
    return { closed: !0, nodes: [se(a, r), se(o, r), se(o, l), se(a, l)] };
  const c = i * (1 - ga);
  return {
    closed: !0,
    nodes: [
      se(a + i, r, a + c, r, a + i, r),
      se(o - i, r, o - i, r, o - c, r),
      se(o, r + i, o, r + c, o, r + i),
      se(o, l - i, o, l - i, o, l - c),
      se(o - i, l, o - c, l, o - i, l),
      se(a + i, l, a + i, l, a + c, l),
      se(a, l - i, a, l - c, a, l - i),
      se(a, r + i, a, r + i, a, r + c),
    ],
  };
}
function pi(s, e, t, n) {
  const i = (s + t) / 2,
    a = (e + n) / 2,
    o = Math.abs(t - s) / 2,
    r = Math.abs(n - e) / 2,
    l = o * ga,
    c = r * ga;
  return {
    closed: !0,
    nodes: [
      se(i, a - r, i - l, a - r, i + l, a - r, !0),
      se(i + o, a, i + o, a - c, i + o, a + c, !0),
      se(i, a + r, i + l, a + r, i - l, a + r, !0),
      se(i - o, a, i - o, a + c, i - o, a - c, !0),
    ],
  };
}
function Js(s, e = !0) {
  return { closed: e, nodes: s.map(([t, n]) => se(t, n)) };
}
function Di(s, e = 0, t = 0, n = 1) {
  const i = new Path2D();
  for (const a of s.subpaths) {
    const o = a.nodes;
    if (o.length) {
      i.moveTo((o[0].x - e) * n, (o[0].y - t) * n);
      for (const r of bs(a))
        bn(r)
          ? i.lineTo((r.p3[0] - e) * n, (r.p3[1] - t) * n)
          : i.bezierCurveTo(
              (r.p1[0] - e) * n,
              (r.p1[1] - t) * n,
              (r.p2[0] - e) * n,
              (r.p2[1] - t) * n,
              (r.p3[0] - e) * n,
              (r.p3[1] - t) * n,
            );
      a.closed && i.closePath();
    }
  }
  return i;
}
const We = (s) => (Math.round(s * 1e3) / 1e3).toString();
function Ns(s) {
  const e = [];
  for (const t of s.subpaths) {
    const n = t.nodes;
    if (n.length) {
      e.push(`M${We(n[0].x)} ${We(n[0].y)}`);
      for (const i of bs(t))
        bn(i)
          ? e.push(`L${We(i.p3[0])} ${We(i.p3[1])}`)
          : e.push(`C${We(i.p1[0])} ${We(i.p1[1])} ${We(i.p2[0])} ${We(i.p2[1])} ${We(i.p3[0])} ${We(i.p3[1])}`);
      t.closed && e.push("Z");
    }
  }
  return e.join(" ");
}
function Yr(s, e = "nonzero") {
  const t = s.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [],
    n = { subpaths: [], fillRule: e };
  let i = 0,
    a = "",
    o = 0,
    r = 0,
    l = 0,
    c = 0,
    u = 0,
    d = 0,
    f = 0,
    m = 0,
    v = "",
    y = null;
  const b = () => parseFloat(t[i++]),
    x = (T, C) => {
      ((y = { nodes: [se(T, C)], closed: !1 }), n.subpaths.push(y), (l = T), (c = C));
    },
    w = () => y.nodes[y.nodes.length - 1],
    _ = (T, C) => {
      (y || x(o, r), y.nodes.push(se(T, C)));
    },
    M = (T, C, A, F, S, P) => {
      y || x(o, r);
      const E = w();
      ((E.ox = T), (E.oy = C), y.nodes.push(se(S, P, A, F, S, P)));
    };
  for (; i < t.length;) {
    if (/[a-zA-Z]/.test(t[i])) a = t[i++];
    else if (!a) {
      i++;
      continue;
    }
    const T = a === a.toLowerCase(),
      C = a.toUpperCase(),
      A = T ? o : 0,
      F = T ? r : 0;
    switch (C) {
      case "M": {
        const S = b() + A,
          P = b() + F;
        (x(S, P), (o = S), (r = P), (a = T ? "l" : "L"));
        break;
      }
      case "L": {
        const S = b() + A,
          P = b() + F;
        (_(S, P), (o = S), (r = P));
        break;
      }
      case "H": {
        const S = b() + (T ? o : 0);
        (_(S, r), (o = S));
        break;
      }
      case "V": {
        const S = b() + (T ? r : 0);
        (_(o, S), (r = S));
        break;
      }
      case "C": {
        const S = b() + A,
          P = b() + F,
          E = b() + A,
          D = b() + F,
          j = b() + A,
          U = b() + F;
        (M(S, P, E, D, j, U), (u = E), (d = D), (o = j), (r = U));
        break;
      }
      case "S": {
        const S = /[CS]/i.test(v),
          P = S ? 2 * o - u : o,
          E = S ? 2 * r - d : r,
          D = b() + A,
          j = b() + F,
          U = b() + A,
          V = b() + F;
        (M(P, E, D, j, U, V), (u = D), (d = j), (o = U), (r = V));
        break;
      }
      case "Q": {
        const S = b() + A,
          P = b() + F,
          E = b() + A,
          D = b() + F;
        (M(o + (2 / 3) * (S - o), r + (2 / 3) * (P - r), E + (2 / 3) * (S - E), D + (2 / 3) * (P - D), E, D),
          (f = S),
          (m = P),
          (o = E),
          (r = D));
        break;
      }
      case "T": {
        const S = /[QT]/i.test(v),
          P = S ? 2 * o - f : o,
          E = S ? 2 * r - m : r,
          D = b() + A,
          j = b() + F;
        (M(o + (2 / 3) * (P - o), r + (2 / 3) * (E - r), D + (2 / 3) * (P - D), j + (2 / 3) * (E - j), D, j),
          (f = P),
          (m = E),
          (o = D),
          (r = j));
        break;
      }
      case "A": {
        const S = b(),
          P = b(),
          E = b(),
          D = b(),
          j = b(),
          U = b() + A,
          V = b() + F;
        for (const G of Xh(o, r, S, P, E, !!D, !!j, U, V)) M(G[0], G[1], G[2], G[3], G[4], G[5]);
        ((o = U), (r = V));
        break;
      }
      case "Z": {
        if (y) {
          const S = y,
            P = S.nodes[0],
            E = S.nodes[S.nodes.length - 1];
          (S.nodes.length > 1 &&
            Math.abs(E.x - P.x) < 1e-6 &&
            Math.abs(E.y - P.y) < 1e-6 &&
            ((P.ix = E.ix), (P.iy = E.iy), S.nodes.pop()),
            (S.closed = !0));
        }
        ((o = l), (r = c), (y = null));
        break;
      }
      default:
        i++;
    }
    v = C;
  }
  for (const T of n.subpaths) for (const C of T.nodes) C.smooth = Vh(C);
  return n;
}
function Vh(s) {
  const e = Math.atan2(s.y - s.iy, s.x - s.ix),
    t = Math.atan2(s.oy - s.y, s.ox - s.x),
    n = s.ix !== s.x || s.iy !== s.y,
    i = s.ox !== s.x || s.oy !== s.y;
  return n && i && Math.abs(Math.atan2(Math.sin(e - t), Math.cos(e - t))) < 0.02;
}
function Xh(s, e, t, n, i, a, o, r, l) {
  if (t === 0 || n === 0) return [[s, e, r, l, r, l]];
  const c = (i * Math.PI) / 180,
    u = Math.cos(c),
    d = Math.sin(c),
    f = (s - r) / 2,
    m = (e - l) / 2,
    v = u * f + d * m,
    y = -d * f + u * m;
  ((t = Math.abs(t)), (n = Math.abs(n)));
  const b = (v * v) / (t * t) + (y * y) / (n * n);
  b > 1 && ((t *= Math.sqrt(b)), (n *= Math.sqrt(b)));
  const x = t * t * n * n - t * t * y * y - n * n * v * v,
    w = t * t * y * y + n * n * v * v;
  let _ = Math.sqrt(Math.max(0, x / w));
  a === o && (_ = -_);
  const M = (_ * t * y) / n,
    T = (-_ * n * v) / t,
    C = u * M - d * T + (s + r) / 2,
    A = d * M + u * T + (e + l) / 2,
    F = (X, ie, Pe, ge) => Math.atan2(X * ge - ie * Pe, X * Pe + ie * ge),
    S = F(1, 0, (v - M) / t, (y - T) / n);
  let P = F((v - M) / t, (y - T) / n, (-v - M) / t, (-y - T) / n);
  !o && P > 0 ? (P -= 2 * Math.PI) : o && P < 0 && (P += 2 * Math.PI);
  const E = Math.ceil(Math.abs(P) / (Math.PI / 2)),
    D = P / E,
    j = (4 / 3) * Math.tan(D / 4),
    U = [];
  let V = S;
  const G = (X) => [C + t * Math.cos(X) * u - n * Math.sin(X) * d, A + t * Math.cos(X) * d + n * Math.sin(X) * u],
    Z = (X) => [-t * Math.sin(X) * u - n * Math.cos(X) * d, -t * Math.sin(X) * d + n * Math.cos(X) * u];
  for (let X = 0; X < E; X++) {
    const ie = G(V),
      Pe = G(V + D),
      ge = Z(V),
      Fe = Z(V + D);
    (U.push([ie[0] + j * ge[0], ie[1] + j * ge[1], Pe[0] - j * Fe[0], Pe[1] - j * Fe[1], Pe[0], Pe[1]]), (V += D));
  }
  return U;
}
function Kr(s, e) {
  if (s.length < 3) return s.slice();
  const t = new Uint8Array(s.length);
  t[0] = t[s.length - 1] = 1;
  const n = [[0, s.length - 1]];
  for (; n.length;) {
    const [i, a] = n.pop();
    let o = 0,
      r = -1;
    const [l, c] = s[i],
      [u, d] = s[a],
      f = Math.hypot(u - l, d - c) || 1;
    for (let m = i + 1; m < a; m++) {
      const v = Math.abs((u - l) * (c - s[m][1]) - (l - s[m][0]) * (d - c)) / f;
      v > o && ((o = v), (r = m));
    }
    o > e && r > 0 && ((t[r] = 1), n.push([i, r], [r, a]));
  }
  return s.filter((i, a) => t[a]);
}
function Ha(s, e, t = 2) {
  let n = Kr(s, t);
  e && n.length > 2 && Ae(n[0], n[n.length - 1]) < t * 2 && (n = n.slice(0, -1));
  const i = n.length,
    a = n.map(([o, r]) => se(o, r));
  if (i < 2) return { nodes: a, closed: !1 };
  for (let o = 0; o < i; o++) {
    const r = e || o > 0,
      l = e || o < i - 1,
      c = n[(o - 1 + i) % i],
      u = n[o],
      d = n[(o + 1) % i],
      f = [u[0] - c[0], u[1] - c[1]],
      m = [d[0] - u[0], d[1] - u[1]],
      v = Math.hypot(f[0], f[1]),
      y = Math.hypot(m[0], m[1]),
      b = r && l && v > 0 && y > 0 ? Math.acos(Math.max(-1, Math.min(1, (f[0] * m[0] + f[1] * m[1]) / (v * y)))) : 0;
    if (!r || !l || b > 1.25) continue;
    const x = d[0] - c[0],
      w = d[1] - c[1],
      _ = Math.hypot(x, w) || 1,
      M = a[o];
    ((M.ix = u[0] - ((x / _) * v) / 3),
      (M.iy = u[1] - ((w / _) * v) / 3),
      (M.ox = u[0] + ((x / _) * y) / 3),
      (M.oy = u[1] + ((w / _) * y) / 3),
      (M.smooth = !0));
  }
  return { nodes: a, closed: e };
}
function Jr(s, e, t, n = 1.5, i = 8) {
  const a = (u, d) => ((u < 0 || d < 0 || u >= e || d >= t ? 0 : s[d * e + u]) >= 0.5 ? 1 : 0),
    o = new Map(),
    r = (u, d) => `${u},${d}`,
    l = (u, d) => {
      const f = r(u[0], u[1]),
        m = o.get(f);
      m ? m.push(d) : o.set(f, [d]);
    };
  for (let u = -1; u < t; u++)
    for (let d = -1; d < e; d++) {
      const f = a(d, u),
        m = a(d + 1, u),
        v = a(d, u + 1);
      if (f !== m) {
        const y = d + 1;
        f ? l([y, u + 1], [y, u]) : l([y, u], [y, u + 1]);
      }
      if (f !== v) {
        const y = u + 1;
        f ? l([d, y], [d + 1, y]) : l([d + 1, y], [d, y]);
      }
    }
  const c = { subpaths: [], fillRule: "evenodd" };
  for (; o.size;) {
    const [u, d] = o.entries().next().value,
      f = u.split(",").map(Number),
      m = [f];
    let v = d.pop();
    d.length || o.delete(u);
    let y = 0;
    for (; y++ < 1e7 && !(v[0] === f[0] && v[1] === f[1]);) {
      m.push(v);
      const w = r(v[0], v[1]),
        _ = o.get(w);
      if (!_ || !_.length) break;
      const M = _.pop();
      (_.length || o.delete(w), (v = M));
    }
    if (m.length < 4) continue;
    let b = 0;
    for (let w = 0; w < m.length; w++) {
      const _ = m[w],
        M = m[(w + 1) % m.length];
      b += _[0] * M[1] - M[0] * _[1];
    }
    if (Math.abs(b) / 2 < i) continue;
    const x = m.map((w, _) => {
      const M = m[(_ - 1 + m.length) % m.length],
        T = m[(_ + 1) % m.length];
      return [(M[0] + 2 * w[0] + T[0]) / 4, (M[1] + 2 * w[1] + T[1]) / 4];
    });
    c.subpaths.push(Ha(x, !0, n));
  }
  return c;
}
function Zr(s) {
  const e = s.subpaths.find((a) => a.nodes.length > 1);
  if (!e) return null;
  const t = Mt(e, 0.25);
  e.closed && t.push(t[0]);
  const n = [0];
  for (let a = 1; a < t.length; a++) n.push(n[a - 1] + Ae(t[a - 1], t[a]));
  const i = n[n.length - 1];
  return {
    length: i,
    at(a) {
      a = e.closed ? ((a % i) + i) % i : Math.max(0, Math.min(i, a));
      let o = 0,
        r = n.length - 1;
      for (; r - o > 1;) {
        const f = (o + r) >> 1;
        n[f] <= a ? (o = f) : (r = f);
      }
      const l = n[r] - n[o] || 1,
        c = (a - n[o]) / l,
        u = t[o],
        d = t[r];
      return { pt: [u[0] + (d[0] - u[0]) * c, u[1] + (d[1] - u[1]) * c], angle: Math.atan2(d[1] - u[1], d[0] - u[0]) };
    },
  };
}
function Zs(s, e, t) {
  const n = [],
    i = (r) => Math.round(r * 16777216),
    a = (r, l) => {
      const c = new Uint8Array(26),
        u = new DataView(c.buffer);
      (u.setUint16(0, r), l(u), n.push([...c]));
    };
  (a(6, () => {}), a(8, (r) => r.setUint16(2, 0)));
  for (const r of s.subpaths)
    if (r.nodes.length) {
      a(r.closed ? 0 : 3, (l) => l.setUint16(2, r.nodes.length));
      for (const l of r.nodes) {
        const c = l.smooth,
          u = r.closed ? (c ? 1 : 2) : c ? 4 : 5;
        a(u, (d) => {
          const f = (m, v, y) => {
            (d.setInt32(m, i(y / t)), d.setInt32(m + 4, i(v / e)));
          };
          (f(2, l.ix, l.iy), f(10, l.x, l.y), f(18, l.ox, l.oy));
        });
      }
    }
  const o = new Uint8Array(n.length * 26);
  return (n.forEach((r, l) => o.set(r, l * 26)), o);
}
function Ds(s, e, t) {
  const n = new DataView(s.buffer, s.byteOffset, s.byteLength),
    i = { subpaths: [], fillRule: "nonzero" };
  let a = null;
  const o = (r) => n.getInt32(r) / 16777216;
  for (let r = 0; r + 26 <= s.length; r += 26) {
    const l = n.getUint16(r);
    if (l === 0 || l === 3) ((a = { closed: l === 0, nodes: [] }), i.subpaths.push(a));
    else if (l === 1 || l === 2 || l === 4 || l === 5) {
      a || ((a = { closed: l < 3, nodes: [] }), i.subpaths.push(a));
      const c = o(r + 2) * t,
        u = o(r + 6) * e,
        d = o(r + 10) * t,
        f = o(r + 14) * e,
        m = o(r + 18) * t,
        v = o(r + 22) * e;
      a.nodes.push({ x: f, y: d, ix: u, iy: c, ox: v, oy: m, smooth: l === 1 || l === 4 });
    }
  }
  return i;
}
function Yh(s, e) {
  return { fillRule: s.fillRule || e.fillRule, subpaths: [...K(s).subpaths, ...K(e).subpaths] };
}
function Qr(s, e) {
  const t = s.subpaths.find((r) => r.nodes.length > 1);
  if (!t) return 0;
  const n = Mt(t, 0.25);
  t.closed && n.push(n[0]);
  let i = 1 / 0,
    a = 0,
    o = 0;
  for (let r = 1; r < n.length; r++) {
    const l = n[r - 1],
      c = n[r],
      u = Ae(l, c) || 1e-9,
      d = Math.max(0, Math.min(1, ((e[0] - l[0]) * (c[0] - l[0]) + (e[1] - l[1]) * (c[1] - l[1])) / (u * u))),
      f = Ae(e, [l[0] + (c[0] - l[0]) * d, l[1] + (c[1] - l[1]) * d]);
    (f < i && ((i = f), (a = o + d * u)), (o += u));
  }
  return a;
}
const Kh = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      allSegments: Ur,
      arcLengthAt: Qr,
      bez: Pt,
      clonePath: K,
      combinePaths: Yh,
      dist: Ae,
      ellipsePath: pi,
      emptyPath: cs,
      fitCurve: Ha,
      flattenSeg: Vr,
      flattenSub: Mt,
      fromPsdRecords: Ds,
      fromSvgD: Yr,
      insertNode: Ua,
      isEmptyPath: Te,
      nearestOnPath: Wa,
      node: se,
      pathBounds: ws,
      pathSampler: Zr,
      pointInPath: Xr,
      polygonPath: Js,
      rectPath: di,
      segments: bs,
      simplify: Kr,
      splitSeg: Hr,
      toPath2D: Di,
      toPsdRecords: Zs,
      toSvgD: Ns,
      traceMask: Jr,
      transformPath: Rt,
      translatePath: qs,
    },
    Symbol.toStringTag,
    { value: "Module" },
  ),
);
let Jh = 1;
function Zh() {
  return `L${Date.now().toString(36)}${(Jh++).toString(36)}`;
}
function le(s, e, t = {}) {
  return {
    id: Zh(),
    name: e,
    kind: s,
    visible: !0,
    opacity: 1,
    blend: s === "group" ? "passThrough" : "normal",
    lockAlpha: !1,
    lockPixels: !1,
    lockPosition: !1,
    clip: !1,
    tex: null,
    mask: null,
    maskEnabled: !0,
    children: [],
    expanded: !0,
    version: 0,
    ...t,
  };
}
function fi(s) {
  return {
    ...s,
    children: s.children.map(fi),
    adjust: s.adjust ? { type: s.adjust.type, params: JSON.parse(JSON.stringify(s.adjust.params)) } : void 0,
    text: s.text ? { ...s.text, color: [...s.text.color], path: s.text.path ? K(s.text.path) : s.text.path } : void 0,
    shape: s.shape
      ? {
          ...s.shape,
          path: K(s.shape.path),
          fill: s.shape.fill ? [...s.shape.fill] : null,
          stroke: s.shape.stroke ? [...s.shape.stroke] : null,
          dash: [...s.shape.dash],
        }
      : void 0,
    vmask: s.vmask ? K(s.vmask) : s.vmask,
    fx: s.fx ? JSON.parse(JSON.stringify(s.fx)) : void 0,
  };
}
let Qh = 1;
class xs {
  id = Qh++;
  name;
  path = null;
  width;
  height;
  bitDepth;
  layers = [];
  activeId = null;
  selectedIds = new Set();
  selection = null;
  lastSelection = null;
  editMask = !1;
  maskViewId = null;
  quickMask = !1;
  composite;
  display;
  dirtyRect = null;
  view = { zoom: 1, panX: 0, panY: 0, rotation: 0, flip: !1 };
  modified = !1;
  preview = new Map();
  previewAdjust = null;
  owned = new Set();
  history = [];
  historyIndex = 0;
  historyLimit = 60;
  savedHistoryIndex = 0;
  tx = null;
  guides = { horizontal: [], vertical: [] };
  paths = [];
  workPath = null;
  activePath = null;
  stackCache = null;
  stackCacheBuilds = 0;
  ink = null;
  tac = 300;
  inkComposite = null;
  channels = [1, 1, 1, 1];
  singleChannel = -1;
  showTac = !1;
  constructor(e, t, n, i = 8, a = null) {
    ((this.name = e), (this.width = t), (this.height = n), (this.bitDepth = i), (this.ink = a), this.allocComposite());
  }
  get layerFormat() {
    return this.bitDepth === 32 ? "rgba32f" : "rgba16f";
  }
  get mode() {
    return this.ink ? "cmyk" : "rgb";
  }
  allocComposite() {
    (this.stackCache && (g.dispose(this.stackCache.tex), (this.stackCache = null)),
      this.composite && g.dispose(this.composite),
      this.display && g.dispose(this.display),
      this.inkComposite && (g.dispose(this.inkComposite), (this.inkComposite = null)),
      (this.composite = g.createTex(this.width, this.height, "rgba16f")),
      (this.composite.spillable = !0),
      (this.composite.isImage = !0),
      this.ink &&
        ((this.inkComposite = g.createPair(this.width, this.height, "rgba16f", this.ink)),
        (this.inkComposite.spillable = this.inkComposite.k.spillable = !0)),
      (this.display = g.createTex(this.width, this.height, "rgba16f", { mip: !0 })),
      this.invalidate());
  }
  pathExists(e) {
    return e === "work"
      ? !!this.workPath
      : e.startsWith("shape:")
        ? !!this.find(e.slice(6))?.layer.shape
        : e.startsWith("vmask:")
          ? !!this.find(e.slice(6))?.layer.vmask
          : e.startsWith("text:")
            ? !!this.find(e.slice(5))?.layer.text?.path
            : this.paths.some((t) => t.id === e);
  }
  sleep() {
    (this.stackCache && (g.dispose(this.stackCache.tex), (this.stackCache = null)),
      this.display && !this.display.disposed && g.dispose(this.display),
      (this.composite.spillable = !0),
      this.inkComposite && (this.inkComposite.spillable = this.inkComposite.k.spillable = !0),
      g.enforceBudget());
  }
  wake() {
    (!this.display || this.display.disposed) &&
      ((this.display = g.createTex(this.width, this.height, "rgba16f", { mip: !0 })), this.invalidate());
  }
  newLayerTex() {
    const e = this.ink
      ? g.createPair(this.width, this.height, this.layerFormat, this.ink)
      : g.createTex(this.width, this.height, this.layerFormat);
    return (e.k && (g.clear(e, null, [0, 0, 0, 0]), (e.k.spillable = !0)), (e.spillable = !0), this.owned.add(e), e);
  }
  layerLike() {
    return this.ink
      ? g.createPair(this.width, this.height, this.layerFormat, this.ink)
      : g.createTex(this.width, this.height, this.layerFormat);
  }
  acquireLayer(e = this.layerFormat) {
    return this.ink ? g.acquirePair(this.width, this.height, e, this.ink) : g.acquire(this.width, this.height, e);
  }
  newMaskTex(e = 1) {
    const t = g.createTex(this.width, this.height, "r16f");
    return (g.clear(t, null, [e, 0, 0, 1]), this.owned.add(t), t);
  }
  newSelTex() {
    const e = g.createTex(this.width, this.height, "r16f");
    return (this.owned.add(e), e);
  }
  adopt(e) {
    return ((e.spillable = !0), e.k && (e.k.spillable = !0), this.owned.add(e), e);
  }
  find(e, t = this.layers, n = null) {
    if (!e) return null;
    for (let i = 0; i < t.length; i++) {
      const a = t[i];
      if (a.id === e) return { layer: a, list: t, index: i, parent: n };
      if (a.children.length) {
        const o = this.find(e, a.children, a);
        if (o) return o;
      }
    }
    return null;
  }
  get active() {
    return this.find(this.activeId)?.layer || null;
  }
  all(e = this.layers, t = []) {
    for (const n of e) (t.push(n), n.children.length && this.all(n.children, t));
    return t;
  }
  setActive(e, t = !1) {
    ((this.activeId = e), t || this.selectedIds.clear(), e && this.selectedIds.add(e));
    const n = this.active;
    ((!n || !n.mask) && (this.editMask = !1), k.emit("doc:layers", this));
  }
  uniqueName(e) {
    const t = new Set(this.all().map((i) => i.name));
    if (!t.has(e)) return e;
    let n = 2;
    for (; t.has(`${e} ${n}`);) n++;
    return `${e} ${n}`;
  }
  insertLayer(e, t = this.active, n = "above") {
    if (n === "inside" && t && t.kind === "group") (t.children.unshift(e), (t.expanded = !0));
    else {
      const i = t ? this.find(t.id) : null;
      i ? i.list.splice(n === "above" ? i.index : i.index + 1, 0, e) : this.layers.unshift(e);
    }
    this.setActive(e.id);
  }
  removeLayer(e) {
    const t = this.find(e);
    if (!t) return null;
    if ((t.list.splice(t.index, 1), this.activeId === e)) {
      const n = t.list[Math.min(t.index, t.list.length - 1)] || t.parent || this.layers[0] || null;
      this.setActive(n ? n.id : null);
    }
    return (this.selectedIds.delete(e), t.layer);
  }
  invalidate(e = null) {
    const t = { x: 0, y: 0, w: this.width, h: this.height },
      n = e ? ae(e, this.width, this.height) : t;
    if (!(n.w <= 0 || n.h <= 0)) {
      if (!this.dirtyRect) this.dirtyRect = n;
      else {
        const i = Math.min(this.dirtyRect.x, n.x),
          a = Math.min(this.dirtyRect.y, n.y),
          o = Math.max(this.dirtyRect.x + this.dirtyRect.w, n.x + n.w),
          r = Math.max(this.dirtyRect.y + this.dirtyRect.h, n.y + n.h);
        this.dirtyRect = { x: i, y: a, w: o - i, h: r - a };
      }
      k.emit("render");
    }
  }
  touch(e, t = null) {
    (e && e.version++, this.invalidate(t), k.emit("doc:pixels", this, e));
  }
  snapshot() {
    return {
      layers: this.layers.map(fi),
      activeId: this.activeId,
      selection: this.selection,
      width: this.width,
      height: this.height,
      paths: this.paths.map((e) => ({ ...e, path: K(e.path) })),
      workPath: this.workPath ? K(this.workPath) : null,
      ink: this.ink,
    };
  }
  restore(e) {
    const t = e.width !== this.width || e.height !== this.height || (e.ink ?? null) !== this.ink,
      n = (e.ink ?? null) !== this.ink;
    ((this.ink = e.ink ?? null),
      (this.layers = e.layers.map(fi)),
      (this.width = e.width),
      (this.height = e.height),
      (this.selection = e.selection),
      (this.paths = (e.paths || []).map((i) => ({ ...i, path: K(i.path) }))),
      (this.workPath = e.workPath ? K(e.workPath) : null),
      this.activePath && !this.pathExists(this.activePath) && (this.activePath = null),
      (this.activeId = e.activeId && this.find(e.activeId) ? e.activeId : (this.layers[0]?.id ?? null)),
      (this.selectedIds = new Set(this.activeId ? [this.activeId] : [])),
      this.preview.clear(),
      t && (this.allocComposite(), k.emit("doc:resized", this)),
      n && k.emit("doc:mode", this));
    for (const i of this.all()) i.version++;
    this.editMask && !this.active?.mask && (this.editMask = !1);
  }
  begin(e) {
    if (this.tx) throw new Error(`Nested transaction (${this.tx.label} / ${e})`);
    this.tx = { label: e, before: this.snapshot(), patches: [] };
  }
  get inTransaction() {
    return !!this.tx;
  }
  recordPatch(e, t) {
    if (!this.tx) throw new Error("recordPatch outside transaction");
    const n = ae(t, e.w, e.h);
    if (n.w <= 0 || n.h <= 0) return;
    const i = g.createLike(e, n.w, n.h, { linear: !1 });
    (g.copy(e, i, n, 0, 0), this.tx.patches.push({ tex: e, rect: n, before: i, after: null }));
  }
  commit(e) {
    const t = this.tx;
    if (!t) return;
    this.tx = null;
    for (const a of t.patches)
      ((a.after = g.createLike(a.tex, a.rect.w, a.rect.h, { linear: !1 })), g.copy(a.tex, a.after, a.rect, 0, 0));
    if (t.patches.length) {
      const a = new Set(t.patches.map((o) => o.tex));
      for (const o of a) o.mrnTouched = !0;
      for (const o of this.all())
        ((o.tex && a.has(o.tex)) || (o.mask && a.has(o.mask)) || (o.vmaskTex && a.has(o.vmaskTex))) && o.version++;
    }
    const n = { label: e || t.label, before: t.before, after: this.snapshot(), patches: t.patches, time: Date.now() };
    for (
      this.history.splice(this.historyIndex).forEach((a) => this.disposeEntry(a)),
        this.savedHistoryIndex > this.historyIndex && (this.savedHistoryIndex = -1),
        this.history.push(n),
        this.historyIndex = this.history.length;
      this.history.length > this.historyLimit;
    )
      (this.disposeEntry(this.history.shift()), this.historyIndex--, this.savedHistoryIndex--);
    ((this.modified = this.historyIndex !== this.savedHistoryIndex),
      this.gc(),
      k.emit("doc:history", this),
      k.emit("doc:layers", this),
      this.invalidate());
  }
  cancel() {
    const e = this.tx;
    if (e) {
      this.tx = null;
      for (let t = e.patches.length - 1; t >= 0; t--) {
        const n = e.patches[t];
        (g.copy(n.before, n.tex, null, n.rect.x, n.rect.y), g.dispose(n.before));
      }
      (this.restore(e.before), this.gc(), this.invalidate(), k.emit("doc:layers", this));
    }
  }
  transact(e, t) {
    this.begin(e);
    try {
      t();
    } catch (n) {
      throw (this.cancel(), n);
    }
    this.commit();
  }
  disposeEntry(e) {
    for (const t of e.patches) (g.dispose(t.before), g.dispose(t.after));
  }
  canUndo() {
    return this.historyIndex > 0;
  }
  canRedo() {
    return this.historyIndex < this.history.length;
  }
  undo() {
    if ((this.tx && this.cancel(), !this.canUndo())) return;
    const e = this.history[--this.historyIndex];
    for (let t = e.patches.length - 1; t >= 0; t--) {
      const n = e.patches[t];
      g.copy(n.before, n.tex, null, n.rect.x, n.rect.y);
    }
    (this.restore(e.before), this.afterHistoryMove());
  }
  redo() {
    if ((this.tx && this.cancel(), !this.canRedo())) return;
    const e = this.history[this.historyIndex++];
    this.restore(e.after);
    for (const t of e.patches) g.copy(t.after, t.tex, null, t.rect.x, t.rect.y);
    this.afterHistoryMove();
  }
  goto(e) {
    for (; this.historyIndex > e;) this.undo();
    for (; this.historyIndex < e;) this.redo();
  }
  afterHistoryMove() {
    ((this.modified = this.historyIndex !== this.savedHistoryIndex),
      this.invalidate(),
      k.emit("doc:history", this),
      k.emit("doc:layers", this),
      k.emit("doc:selection", this));
  }
  markSaved() {
    ((this.savedHistoryIndex = this.historyIndex), (this.modified = !1), k.emit("doc:history", this));
  }
  gc() {
    const e = new Set(),
      t = (i, a) => {
        const o = (r) => {
          for (const l of r)
            (l.tex && e.add(l.tex), l.mask && e.add(l.mask), l.vmaskTex && e.add(l.vmaskTex), l.marionetteSrc && e.add(l.marionetteSrc), o(l.children));
        };
        (o(i), a && e.add(a));
      };
    (t(this.layers, this.selection), this.lastSelection && e.add(this.lastSelection));
    for (const i of this.history) (t(i.before.layers, i.before.selection), t(i.after.layers, i.after.selection));
    this.tx && t(this.tx.before.layers, this.tx.before.selection);
    for (const i of [...this.owned]) e.has(i) || (g.dispose(i), this.owned.delete(i));
    for (const i of this.owned) ((i.spillable = !0), i.k && (i.k.spillable = !0));
    const n = (i) => {
      i && ((i.spillable = !0), i.k && (i.k.spillable = !0));
    };
    for (const i of this.history) for (const a of i.patches) (n(a.before), n(a.after));
    g.enforceBudget();
  }
  dispose() {
    for (const e of this.history) this.disposeEntry(e);
    for (const e of this.owned) g.dispose(e);
    (this.owned.clear(),
      g.dispose(this.composite),
      g.dispose(this.display),
      g.dispose(this.inkComposite),
      this.stackCache && (g.dispose(this.stackCache.tex), (this.stackCache = null)));
    for (const e of this.preview.values()) g.dispose(e.tex);
    this.preview.clear();
  }
  setSelection(e) {
    (this.selection && this.selection !== e && (this.lastSelection = this.selection),
      (this.selection = e),
      e && this.owned.add(e),
      k.emit("doc:selection", this),
      k.emit("render"));
  }
  setProps(e, t) {
    (Object.assign(e, t), this.invalidate());
  }
}
const Un = new Float32Array(256);
for (let s = 0; s < 256; s++) {
  const e = s / 255;
  Un[s] = e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4);
}
const Zi = (s) => (s > 0.008856 ? Math.cbrt(s) : 7.787 * s + 16 / 116);
function Va(s, e, t, n, i = 0) {
  const a = Un[s],
    o = Un[e],
    r = Un[t],
    l = Zi((0.4124 * a + 0.3576 * o + 0.1805 * r) / 0.95047),
    c = Zi(0.2126 * a + 0.7152 * o + 0.0722 * r),
    u = Zi((0.0193 * a + 0.1192 * o + 0.9505 * r) / 1.08883);
  ((n[i] = 116 * c - 16), (n[i + 1] = 500 * (l - c)), (n[i + 2] = 200 * (c - u)));
}
function el(s, e, t, n, i, a = 1) {
  if (((n = Math.floor(n)), (i = Math.floor(i)), n < 0 || i < 0 || n >= e || i >= t)) return null;
  let o = 0,
    r = 0,
    l = 0,
    c = 0,
    u = 0;
  for (let f = Math.max(0, i - a); f <= Math.min(t - 1, i + a); f++)
    for (let m = Math.max(0, n - a); m <= Math.min(e - 1, n + a); m++) {
      const v = (f * e + m) * 4;
      ((o += s[v]), (r += s[v + 1]), (l += s[v + 2]), (c += s[v + 3]), u++);
    }
  ((o = Math.round(o / u)), (r = Math.round(r / u)), (l = Math.round(l / u)), (c /= u * 255));
  const d = [0, 0, 0];
  return (Va(o, r, l, d), { lab: d, alpha: c, rgb: [o, r, l] });
}
function jo(s, e, t) {
  const n = new Float32Array(e),
    i = new Float32Array(3);
  let a = -1,
    o = -1,
    r = -1;
  for (let l = 0; l < e; l++) {
    const c = l * 4,
      u = s[c],
      d = s[c + 1],
      f = s[c + 2],
      m = s[c + 3] / 255;
    (u !== a || d !== o || f !== r) && (Va(u, d, f, i), (a = u), (o = d), (r = f));
    let v = 1 / 0;
    for (const y of t) {
      const b = i[0] - y.lab[0],
        x = i[1] - y.lab[1],
        w = i[2] - y.lab[2],
        M = (m < 0.004 || y.alpha < 0.004 ? 0 : Math.sqrt(b * b + x * x + w * w)) + Math.abs(m - y.alpha) * 100;
      M < v && (v = M);
    }
    n[l] = v;
  }
  return n;
}
function Go(s, e) {
  const t = new Float32Array(s.length),
    n = Math.max(1e-4, e),
    i = n / 2;
  for (let a = 0; a < s.length; a++) {
    const o = s[a];
    if (o <= i) t[a] = 1;
    else if (o < n) {
      const r = (o - i) / i;
      t[a] = 1 - r * r * (3 - 2 * r);
    }
  }
  return t;
}
function ed(s, e, t, n) {
  const i = new Float32Array(s.length),
    a = new Uint8Array(s.length),
    o = new Int32Array(s.length);
  let r = 0;
  for (const [l, c] of n) {
    const u = Math.floor(l),
      d = Math.floor(c);
    if (u < 0 || d < 0 || u >= e || d >= t) continue;
    const f = d * e + u;
    !a[f] && s[f] > 0 && ((a[f] = 1), (o[r++] = f));
  }
  for (; r;) {
    const l = o[--r];
    i[l] = s[l];
    const c = l % e,
      u = [c > 0 ? l - 1 : -1, c < e - 1 ? l + 1 : -1, l - e, l + e];
    for (const d of u) d >= 0 && d < s.length && !a[d] && s[d] > 0 && ((a[d] = 1), (o[r++] = d));
  }
  return i;
}
function td(s, e, t, n) {
  const i = e * 4,
    a = s[i + 3] / 255;
  let o = 0;
  if (a >= 0.004 && t.alpha >= 0.004) {
    Va(s[i], s[i + 1], s[i + 2], n);
    const r = n[0] - t.lab[0],
      l = n[1] - t.lab[1],
      c = n[2] - t.lab[2];
    o = Math.sqrt(r * r + l * l + c * c);
  }
  return o + Math.abs(a - t.alpha) * 100;
}
const sd = (s) => (s * 100) / 255;
function Wo(s, e, t, n) {
  const i = Math.min(1, n / Math.max(e, t));
  if (i >= 1) return { px: s, w: e, h: t, k: 1 };
  const a = Math.max(1, Math.round(e * i)),
    o = Math.max(1, Math.round(t * i)),
    r = new Uint8Array(a * o * 4);
  for (let l = 0; l < o; l++) {
    const c = Math.floor((l * t) / o),
      u = Math.max(c + 1, Math.floor(((l + 1) * t) / o));
    for (let d = 0; d < a; d++) {
      const f = Math.floor((d * e) / a),
        m = Math.max(f + 1, Math.floor(((d + 1) * e) / a));
      let v = 0,
        y = 0,
        b = 0,
        x = 0,
        w = 0;
      for (let M = c; M < u; M++)
        for (let T = f; T < m; T++) {
          const C = (M * e + T) * 4;
          ((v += s[C]), (y += s[C + 1]), (b += s[C + 2]), (x += s[C + 3]), w++);
        }
      const _ = (l * a + d) * 4;
      ((r[_] = v / w), (r[_ + 1] = y / w), (r[_ + 2] = b / w), (r[_ + 3] = x / w));
    }
  }
  return { px: r, w: a, h: o, k: a / e };
}
const nd = { replace: 0, add: 1, subtract: 2, intersect: 3 };
function us(s, e, t, n, i = "Selection", a = 0) {
  const o = s.newSelTex();
  (g.draw(g.program("selCombine", Ch), o, {
    textures: { u_old: s.selection, u_shape: e },
    uniforms: { u_shapeOrigin: t, u_hasOld: s.selection && n !== "replace" ? 1 : 0, u_op: nd[n], u_shapeChannel: a },
  }),
    s.transact(i, () => s.setSelection(o)));
}
function tl(s, e, t = !0, n = 0) {
  let i = 1 / 0,
    a = 1 / 0,
    o = -1 / 0,
    r = -1 / 0;
  for (const [v, y] of e) ((i = Math.min(i, v)), (a = Math.min(a, y)), (o = Math.max(o, v)), (r = Math.max(r, y)));
  const l = Math.ceil(n * 3) + 2;
  ((i = Math.floor(i) - l), (a = Math.floor(a) - l), (o = Math.ceil(o) + l), (r = Math.ceil(r) + l));
  const c = o - i,
    u = r - a;
  if (c <= 2 * l || u <= 2 * l || c > 32768 || u > 32768) return null;
  const d = new OffscreenCanvas(c, u),
    f = d.getContext("2d");
  if (
    ((f.imageSmoothingEnabled = t),
    n > 0 && (f.filter = `blur(${n}px)`),
    (f.fillStyle = "#fff"),
    f.beginPath(),
    s === "rect")
  ) {
    const [v, y] = e;
    f.rect(Math.min(v[0], y[0]) - i, Math.min(v[1], y[1]) - a, Math.abs(y[0] - v[0]), Math.abs(y[1] - v[1]));
  } else if (s === "ellipse") {
    const [v, y] = e;
    f.ellipse(
      (v[0] + y[0]) / 2 - i,
      (v[1] + y[1]) / 2 - a,
      Math.abs(y[0] - v[0]) / 2,
      Math.abs(y[1] - v[1]) / 2,
      0,
      0,
      Math.PI * 2,
    );
  } else (e.forEach(([v, y], b) => (b ? f.lineTo(v - i, y - a) : f.moveTo(v - i, y - a))), f.closePath());
  if ((f.fill("nonzero"), !t)) {
    const v = f.getImageData(0, 0, c, u);
    for (let y = 3; y < v.data.length; y += 4) v.data[y] = v.data[y] >= 128 ? 255 : 0;
    f.putImageData(v, 0, 0);
  }
  return { tex: g.uploadImage8(d, c, u), origin: [i, a] };
}
function Xa(s, e, t, n, i = !0, a = 0) {
  const o = tl(e, t, i, a);
  if (!o) {
    n === "replace" && wn(s);
    return;
  }
  (us(
    s,
    o.tex,
    o.origin,
    n,
    e === "polygon" ? "Lasso" : e === "ellipse" ? "Elliptical Marquee" : "Rectangular Marquee",
  ),
    g.dispose(o.tex));
}
function mi(s) {
  const e = s.newSelTex();
  (g.clear(e, null, [1, 0, 0, 1]), s.transact("Select All", () => s.setSelection(e)));
}
function wn(s) {
  s.selection && s.transact("Deselect", () => s.setSelection(null));
}
function sl(s) {
  if (!s.lastSelection || s.lastSelection.disposed) return;
  const e = s.lastSelection;
  s.transact("Reselect", () => s.setSelection(e));
}
function xn(s, e, t, n = [0, 0, 0, 0], i = s.selection, a = null) {
  if (!i) return;
  const o = s.newSelTex();
  (g.draw(g.program("selMap", Ai), o, { textures: { u_src: i, u_aux: a }, uniforms: { u_op: t, u_p: n } }),
    s.transact(e, () => s.setSelection(o)));
}
function nl(s) {
  if (!s.selection) {
    mi(s);
    return;
  }
  xn(s, "Select Inverse", 0);
}
function Ya(s, e) {
  if (!s.selection || e <= 0) return;
  const t = { x: 0, y: 0, w: s.width, h: s.height },
    n = g.acquire(s.width, s.height, "rgba16f");
  g.draw(g.program("selToAlpha", al), n, { textures: { u_src: s.selection } });
  const i = It(n, e / 2, t, { alphaOnly: !0, outPremul: !0 });
  (g.release(n), xn(s, "Feather", 1, [0, 0, 0, 0], i), g.release(i));
}
function gi(s, e) {
  if (!s.selection || !e) return;
  const t = { x: 0, y: 0, w: s.width, h: s.height },
    n = ls(s.selection, t, Math.abs(e) + 2, 1, !1),
    i = ls(s.selection, t, Math.abs(e) + 2, 1, !0);
  (xn(s, e > 0 ? "Expand" : "Contract", 3, [e, 0, 0, 0], n, i), g.release(n), g.release(i));
}
function il(s, e) {
  if (!s.selection || e <= 0) return;
  const t = { x: 0, y: 0, w: s.width, h: s.height },
    n = ls(s.selection, t, e + 2, 1, !1),
    i = ls(s.selection, t, e + 2, 1, !0);
  (xn(s, "Border", 5, [e, 0, 0, 0], n, i), g.release(n), g.release(i));
}
function Ka(s, e) {
  if (!s.selection) return;
  const t = { x: 0, y: 0, w: s.width, h: s.height },
    n = g.acquire(s.width, s.height, "rgba16f");
  g.draw(g.program("selToAlpha", al), n, { textures: { u_src: s.selection } });
  const i = It(n, e, t, { alphaOnly: !0, outPremul: !0 });
  g.release(n);
  const a = g.acquire(s.width, s.height, "rgba16f");
  (g.draw(g.program("selMap", Ai), a, { textures: { u_src: i }, uniforms: { u_op: 1 } }),
    g.release(i),
    xn(s, "Smooth", 4, [0.45, 0.55, 0, 0], a),
    g.release(a));
}
function hs(s, e, t = "replace", n = !1) {
  const i = n ? e.mask : e.tex;
  if (i) {
    if (n) {
      us(s, i, [0, 0], t, "Load Selection", 1);
      return;
    }
    us(s, i, [0, 0], t, "Load Selection", 0);
  }
}
function Ja(s, e, t, n, i, a, o, r, l = !1) {
  const c = new Float32Array(e * t);
  if (((n = Math.floor(n)), (i = Math.floor(i)), n < 0 || i < 0 || n >= e || i >= t)) return c;
  const u = (i * e + n) * 4,
    d = s[u],
    f = s[u + 1],
    m = s[u + 2],
    v = s[u + 3],
    y = a;
  let b;
  if (l) {
    const x = el(s, e, t, n, i, 0),
      w = new Float32Array(3),
      _ = sd(y);
    b = (M) => td(s, M, x, w) <= _;
  } else
    b = (x) => {
      const w = x * 4;
      return (
        Math.abs(s[w] - d) <= y &&
        Math.abs(s[w + 1] - f) <= y &&
        Math.abs(s[w + 2] - m) <= y &&
        Math.abs(s[w + 3] - v) <= y
      );
    };
  if (o) {
    const x = new Uint8Array(e * t),
      w = new Int32Array(e * t);
    let _ = 0;
    for (w[_++] = i * e + n, x[i * e + n] = 1; _;) {
      const M = w[--_];
      if (!b(M)) continue;
      let T = M,
        C = M;
      const A = Math.floor(M / e) * e;
      for (; T > A && !x[T - 1] && b(T - 1);) (T--, (x[T] = 1));
      for (; C < A + e - 1 && !x[C + 1] && b(C + 1);) (C++, (x[C] = 1));
      for (let F = T; F <= C; F++) {
        c[F] = 1;
        const S = F - e,
          P = F + e;
        (S >= 0 && !x[S] && ((x[S] = 1), (w[_++] = S)), P < e * t && !x[P] && ((x[P] = 1), (w[_++] = P)));
      }
    }
  } else for (let x = 0; x < e * t; x++) b(x) && (c[x] = 1);
  if (r) {
    const x = new Float32Array(c);
    for (let w = 1; w < t - 1; w++)
      for (let _ = 1; _ < e - 1; _++) {
        const M = w * e + _,
          T = c[M];
        (T !== c[M - 1] || T !== c[M + 1] || T !== c[M - e] || T !== c[M + e]) &&
          (x[M] = (c[M] * 4 + c[M - 1] + c[M + 1] + c[M - e] + c[M + e]) / 8);
      }
    return x;
  }
  return c;
}
function kn(s, e, t, n) {
  const i = g.createTex(s.width, s.height, "r16f");
  (g.upload(i, e), us(s, i, [0, 0], t, n, 1), g.dispose(i));
}
const Qi = new WeakMap();
function at(s) {
  const e = s.selection;
  if (!e) return null;
  if (Qi.has(e)) return Qi.get(e);
  const t = g.read8(e);
  let n = s.width,
    i = s.height,
    a = -1,
    o = -1;
  for (let l = 0; l < s.height; l++) {
    const c = l * s.width * 4;
    for (let u = 0; u < s.width; u++)
      t[c + u * 4] > 0 && (u < n && (n = u), u > a && (a = u), l < i && (i = l), l > o && (o = l));
  }
  const r = a < 0 ? null : { x: n, y: i, w: a - n + 1, h: o - i + 1 };
  return (Qi.set(e, r), r);
}
function ks(s) {
  const e = g.read8(s);
  let t = s.w,
    n = s.h,
    i = -1,
    a = -1;
  for (let o = 0; o < s.h; o++)
    for (let r = 0; r < s.w; r++)
      e[(o * s.w + r) * 4 + 3] > 0 && (r < t && (t = r), r > i && (i = r), o < n && (n = o), o > a && (a = o));
  return i < 0 ? null : { x: t, y: n, w: i - t + 1, h: a - n + 1 };
}
const al =
    ke +
    `
uniform sampler2D u_src;
out vec4 o;
void main(){ float v = texelFetch(u_src, ivec2(gl_FragCoord.xy), 0).r; o = vec4(1.0, 1.0, 1.0, v); }`,
  ol = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        borderSelection: il,
        combineShape: us,
        contentBounds: ks,
        deselect: wn,
        expandSelection: gi,
        featherSelection: Ya,
        invertSelection: nl,
        maskToSelection: kn,
        rasterizeShape: tl,
        reselect: sl,
        selectAll: mi,
        selectFromLayer: hs,
        selectShape: Xa,
        selectionBounds: at,
        smoothSelection: Ka,
        wandMask: Ja,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  Za =
    ke +
    `
uniform sampler2D u_fill;
uniform sampler2D u_stroke;
uniform vec2 u_origin;
uniform vec3 u_fillColor;
uniform vec3 u_strokeColor;
uniform float u_fillOpacity;
uniform int u_hasFill;
uniform int u_hasStroke;
out vec4 o;
void main(){
  ivec2 q = ivec2(gl_FragCoord.xy) - ivec2(u_origin);
  ivec2 s = textureSize(u_fill, 0);
  if(q.x < 0 || q.y < 0 || q.x >= s.x || q.y >= s.y){ o = vec4(0.0); return; }
  float af = u_hasFill == 1 ? texelFetch(u_fill, q, 0).a * u_fillOpacity : 0.0;
  float as_ = u_hasStroke == 1 ? texelFetch(u_stroke, q, 0).a : 0.0;
  float a = as_ + af * (1.0 - as_);
  if(a <= 1e-6){ o = vec4(0.0); return; }
  o = vec4((u_strokeColor * as_ + u_fillColor * af * (1.0 - as_)) / a, a);
}`,
  id =
    ke +
    `
uniform sampler2D u_cov;
uniform vec2 u_origin;
out vec4 o;
void main(){
  ivec2 q = ivec2(gl_FragCoord.xy) - ivec2(u_origin);
  ivec2 s = textureSize(u_cov, 0);
  float v = (q.x < 0 || q.y < 0 || q.x >= s.x || q.y >= s.y) ? 0.0 : texelFetch(u_cov, q, 0).a;
  o = vec4(v, 0.0, 0.0, 1.0);
}`,
  ad =
    ke +
    `
uniform sampler2D u_a;
uniform sampler2D u_b;
out vec4 o;
void main(){ ivec2 p = ivec2(gl_FragCoord.xy); o = vec4(texelFetch(u_a, p, 0).r * texelFetch(u_b, p, 0).r, 0.0, 0.0, 1.0); }`;
function _n(s, e, t = null, n = 0) {
  return {
    path: s,
    fill: e,
    stroke: t,
    strokeWidth: n,
    strokeAlign: "center",
    join: "miter",
    cap: "butt",
    dash: [],
    fillOpacity: 1,
    antialias: !0,
  };
}
function Qa(s, e) {
  const t = ws(e.path);
  if (!t) return null;
  const n =
      e.stroke && e.strokeWidth > 0
        ? e.strokeWidth *
          (e.strokeAlign === "center" ? 0.5 : e.strokeAlign === "outside" ? 1 : 0) *
          (e.join === "miter" ? 4 : 1)
        : 0,
    i = Math.ceil(n) + 3,
    a = ae({ x: t.x - i, y: t.y - i, w: t.w + 2 * i, h: t.h + 2 * i }, s.width, s.height);
  return a.w > 0 && a.h > 0 ? a : null;
}
const pt = 16384;
function od(s, e) {
  const t = Di(s.path, e.x, e.y),
    n = s.path.fillRule === "evenodd" ? "evenodd" : "nonzero";
  let i = null,
    a = null;
  const o = s.path.subpaths.some((r) => r.closed || r.nodes.length > 2);
  if (s.fill && o) {
    i = new OffscreenCanvas(e.w, e.h);
    const r = i.getContext("2d");
    ((r.fillStyle = "#fff"), r.fill(t, n));
  }
  if (s.stroke && s.strokeWidth > 0) {
    a = new OffscreenCanvas(e.w, e.h);
    const r = a.getContext("2d");
    ((r.strokeStyle = "#fff"),
      (r.lineJoin = s.join),
      (r.lineCap = s.cap),
      (r.miterLimit = 4),
      s.dash.length && r.setLineDash(s.dash.map((l) => Math.max(0.01, l * s.strokeWidth))),
      s.strokeAlign === "center"
        ? ((r.lineWidth = s.strokeWidth), r.stroke(t))
        : s.strokeAlign === "inside"
          ? (r.save(), r.clip(t, n), (r.lineWidth = s.strokeWidth * 2), r.stroke(t), r.restore())
          : ((r.lineWidth = s.strokeWidth * 2),
            r.stroke(t),
            (r.globalCompositeOperation = "destination-out"),
            (r.fillStyle = "#fff"),
            r.fill(t, n)));
  }
  if (s.antialias === !1)
    for (const r of [i, a]) {
      if (!r) continue;
      const l = r.getContext("2d"),
        c = l.getImageData(0, 0, e.w, e.h);
      for (let u = 3; u < c.data.length; u += 4) c.data[u] = c.data[u] >= 128 ? 255 : 0;
      l.putImageData(c, 0, 0);
    }
  return { fill: i, stroke: a };
}
function zi(s, e, t = null) {
  const n = t || s.newLayerTex();
  t && g.clear(t, null, [0, 0, 0, 0]);
  const i = Qa(s, e);
  if (!i) return n;
  for (let a = i.y; a < i.y + i.h; a += pt)
    for (let o = i.x; o < i.x + i.w; o += pt) {
      const r = { x: o, y: a, w: Math.min(pt, i.x + i.w - o), h: Math.min(pt, i.y + i.h - a) },
        l = od(e, r);
      if (!l.fill && !l.stroke) continue;
      const c = l.fill ? g.uploadImage8(l.fill, r.w, r.h) : null,
        u = l.stroke ? g.uploadImage8(l.stroke, r.w, r.h) : null;
      (c && (c.isImage = !1),
        u && (u.isImage = !1),
        g.draw(g.program("coverToLayer", Za), n, {
          textures: { u_fill: c || u, u_stroke: u || c },
          uniforms: {
            u_origin: [r.x, r.y],
            u_fillColor: e.fill || [0, 0, 0],
            u_strokeColor: e.stroke || [0, 0, 0],
            u_fillOpacity: e.fillOpacity ?? 1,
            u_hasFill: c ? 1 : 0,
            u_hasStroke: u ? 1 : 0,
          },
          rect: r,
        }),
        g.dispose(c),
        g.dispose(u));
    }
  return n;
}
function je(s, e) {
  e.shape && ((e.tex = zi(s, e.shape)), e.version++, s.invalidate());
}
function Mn(s, e, t = !0, n = 0, i = null) {
  const a = i || s.newMaskTex(0);
  i && g.clear(i, null, [0, 0, 0, 1]);
  const o = ws(e);
  if (!o) return a;
  const r = Math.ceil(n * 3) + 2,
    l = ae({ x: o.x - r, y: o.y - r, w: o.w + 2 * r, h: o.h + 2 * r }, s.width, s.height);
  if (l.w <= 0 || l.h <= 0) return a;
  for (let c = l.y; c < l.y + l.h; c += pt)
    for (let u = l.x; u < l.x + l.w; u += pt) {
      const d = { x: u, y: c, w: Math.min(pt, l.x + l.w - u), h: Math.min(pt, l.y + l.h - c) },
        f = new OffscreenCanvas(d.w, d.h),
        m = f.getContext("2d");
      if (
        (n > 0 && (m.filter = `blur(${n}px)`),
        (m.fillStyle = "#fff"),
        m.fill(Di(e, d.x, d.y), e.fillRule === "evenodd" ? "evenodd" : "nonzero"),
        !t)
      ) {
        const y = m.getImageData(0, 0, d.w, d.h);
        for (let b = 3; b < y.data.length; b += 4) y.data[b] = y.data[b] >= 128 ? 255 : 0;
        m.putImageData(y, 0, 0);
      }
      const v = g.uploadImage8(f, d.w, d.h);
      (g.draw(g.program("coverToMask", id), a, { textures: { u_cov: v }, uniforms: { u_origin: [d.x, d.y] }, rect: d }),
        g.dispose(v));
    }
  return a;
}
function xt(s, e) {
  ((e.vmaskTex = e.vmask ? Mn(s, e.vmask, !0) : null), e.version++, s.invalidate());
}
function Sn(s, e, t = "replace", n = 0, i = !0, a = "Load Path as Selection") {
  if (Te(e)) throw new B("The path is empty.");
  const o = Mn(s, e, i, n);
  (us(s, o, [0, 0], t, a, 1), g.dispose(o));
}
function rl(s, e = 2) {
  if (!s.selection) throw new B("Make a selection first.");
  const t = s.width,
    n = s.height,
    i = Math.min(1, Math.sqrt(2e6 / (t * n))),
    a = Math.max(1, Math.round(t * i)),
    o = Math.max(1, Math.round(n * i));
  let r;
  if (i < 1) {
    const c = g.acquire(a, o, "rgba16f");
    g.draw(g.program("downsampleSel", rd), c, {
      textures: { u_src: s.selection },
      uniforms: { u_scale: [t / a, n / o] },
    });
    const u = g.read(c);
    (g.release(c), (r = new Float32Array(a * o)));
    for (let d = 0; d < r.length; d++) r[d] = u[d * 4];
  } else {
    const c = g.read(s.selection);
    r = new Float32Array(a * o);
    for (let u = 0; u < r.length; u++) r[u] = c[u * 4];
  }
  const l = Jr(r, a, o, Math.max(0.5, e * i), 4);
  return i < 1 ? Rt(l, [1 / i, 0, 0, 0, 1 / i, 0, 0, 0, 1]) : l;
}
const rd =
  ke +
  `
uniform sampler2D u_src;
uniform vec2 u_scale;
out vec4 o;
void main(){
  vec2 p0 = floor(gl_FragCoord.xy) * u_scale;
  float acc = 0.0; float n = 0.0;
  for(int j = 0; j < 4; j++) for(int i = 0; i < 4; i++){
    vec2 q = p0 + (vec2(float(i), float(j)) + 0.5) * u_scale / 4.0;
    acc += texelFetch(u_src, ivec2(q), 0).r; n += 1.0;
  }
  o = vec4(acc / n, 0.0, 0.0, 1.0);
}`;
function va(s, e, t, n, i = 1, a = 0) {
  if (!e.tex) throw new B("Select a pixel layer to fill.");
  if (e.lockPixels) throw new B(`"${e.name}" is locked.`);
  const o = _n(t, n);
  o.fillOpacity = i;
  const r = Qa(s, o);
  if (!r) return;
  const l = a > 0 ? ld(s, o, a) : zi(s, o);
  (s.begin("Fill Path"), s.recordPatch(e.tex, r));
  const c = g.acquireLike(e.tex, e.tex.format);
  (g.copy(e.tex, c),
    g.draw(g.program("applyOver", ys), e.tex, {
      textures: { u_dst: c, u_src: l },
      uniforms: { u_hasSel: 0, u_opacity: 1, u_mode: 0, u_useColor: 0, u_lockAlpha: e.lockAlpha ? 1 : 0, u_hasCov: 0 },
      rect: r,
    }),
    g.release(c),
    g.dispose(l),
    e.version++,
    s.commit());
}
function ld(s, e, t) {
  const n = Mn(s, e.path, !0, t),
    i = s.newLayerTex();
  g.clear(i, null, [...(e.fill || [0, 0, 0]), 1]);
  const a = s.newLayerTex();
  return (
    g.draw(g.program("maskedCopy", Ga), a, {
      textures: { u_src: i, u_mask: n },
      uniforms: { u_hasMask: 1, u_srcOffset: [0, 0] },
    }),
    g.dispose(n),
    g.dispose(i),
    a
  );
}
function ll(s, e) {
  return s.subpaths
    .filter((t) => t.nodes.length > 1)
    .map((t) => {
      const n = Mt(t, 0.3);
      t.closed && n.push(n[0]);
      const i = n.length;
      return n.map(([a, o], r) => ({
        x: a,
        y: o,
        pressure: e ? Math.sin((r / Math.max(1, i - 1)) * Math.PI) * 0.85 + 0.15 : 1,
      }));
    });
}
let cd = 1;
function Qs() {
  return `P${Date.now().toString(36)}${(cd++).toString(36)}`;
}
function St(s) {
  const e = s.activePath,
    t = s.active,
    n =
      e && s.pathExists(e)
        ? e
        : t?.shape
          ? `shape:${t.id}`
          : t?.text?.path
            ? `text:${t.id}`
            : t?.vmask
              ? `vmask:${t.id}`
              : s.workPath
                ? "work"
                : null;
  return n ? Tn(s, n) : null;
}
function Tn(s, e) {
  if (e === "work")
    return {
      id: e,
      name: "Work Path",
      get: () => s.workPath,
      set: (n, i) =>
        s.transact(i || "Work Path", () => {
          s.workPath = n;
        }),
    };
  if (e.startsWith("shape:")) {
    const n = s.find(e.slice(6))?.layer;
    return n?.shape
      ? {
          id: e,
          name: `${n.name} Shape Path`,
          get: () => n.shape.path,
          set: (i, a) =>
            s.transact(a || "Edit Shape", () => {
              ((n.shape.path = i || { subpaths: [] }), je(s, n));
            }),
        }
      : null;
  }
  if (e.startsWith("text:")) {
    const n = s.find(e.slice(5))?.layer;
    return n?.text?.path
      ? {
          id: e,
          name: `${n.name} Type Path`,
          get: () => n.text.path || null,
          set: (i, a) =>
            s.transact(a || "Edit Type Path", () => {
              ((n.text.path = i), _t(s, n));
            }),
        }
      : null;
  }
  if (e.startsWith("vmask:")) {
    const n = s.find(e.slice(6))?.layer;
    return n?.vmask
      ? {
          id: e,
          name: `${n.name} Vector Mask`,
          get: () => n.vmask || null,
          set: (i, a) =>
            s.transact(a || "Edit Vector Mask", () => {
              ((n.vmask = i), xt(s, n));
            }),
        }
      : null;
  }
  const t = s.paths.find((n) => n.id === e);
  return t
    ? {
        id: e,
        name: t.name,
        get: () => t.path,
        set: (n, i) =>
          s.transact(i || "Edit Path", () => {
            const a = s.paths.find((o) => o.id === e);
            a && (a.path = n || { subpaths: [] });
          }),
      }
    : null;
}
function cl(s, e) {
  if (!s.workPath) return null;
  const t = { id: Qs(), name: e || vi(s, "Path"), path: K(s.workPath) };
  return (
    s.transact("Save Path", () => {
      (s.paths.push(t), (s.workPath = null));
    }),
    (s.activePath = t.id),
    t
  );
}
function vi(s, e) {
  const t = new Set(s.paths.map((i) => i.name));
  let n = 1;
  for (; t.has(`${e} ${n}`);) n++;
  return `${e} ${n}`;
}
function ds(s, e, t, n = "New Shape Layer") {
  const i = le("shape", s.uniqueName(e));
  return (
    (i.shape = t),
    s.transact(n, () => {
      (je(s, i), s.insertLayer(i));
    }),
    (s.activePath = `shape:${i.id}`),
    i
  );
}
function Hn(s, e, t, n = "Add Vector Mask") {
  (s.transact(n, () => {
    ((e.vmask = t ? K(t) : null), (e.vmaskEnabled = !0), xt(s, e));
  }),
    t && (s.activePath = `vmask:${e.id}`));
}
const ud = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      COVER_TO_LAYER_FRAG: Za,
      MASK_MUL_FRAG: ad,
      activePathRef: St,
      addShapeLayer: ds,
      defaultShape: _n,
      fillPathOnLayer: va,
      newPathId: Qs,
      pathMaskTex: Mn,
      pathRef: Tn,
      pathToSelection: Sn,
      renderShapeLayer: je,
      renderShapeTex: zi,
      renderVmask: xt,
      saveWorkPath: cl,
      selectionToPath: rl,
      setVectorMask: Hn,
      shapeRect: Qa,
      strokePoints: ll,
      uniquePathName: vi,
    },
    Symbol.toStringTag,
    { value: "Module" },
  ),
);
function eo(s) {
  return { x: 0, y: 0, w: s.width, h: s.height };
}
function kt(s, e, t, n = "tex") {
  (s.adopt(t), (e[n] = t), e.version++, s.invalidate());
}
function ot(s, e, t, n, i = {}) {
  const a = i.target || (s.editMask && e.mask ? "mask" : "tex"),
    o = e[a];
  if (!o) throw new Error("This layer has no pixels. Rasterize it first.");
  if (e.lockPixels) throw new B(`"${e.name}" is locked.`);
  const r = o.format === "r16f" ? "rgba16f" : o.format,
    l = g.acquireLike(o, r);
  n(o, l);
  const c = a === "mask" ? s.newMaskTex() : s.newLayerTex(),
    u = i.useSelection !== !1 ? s.selection : null;
  if (
    (g.draw(g.program("selectMix", Nr), c, {
      textures: { u_dst: o, u_src: l, u_sel: u },
      uniforms: { u_hasSel: u ? 1 : 0, u_fade: i.fade ?? 1 },
    }),
    e.lockAlpha && a === "tex")
  ) {
    const d = s.newLayerTex();
    (g.draw(g.program("keepAlpha", hd), d, { textures: { u_a: c, u_b: o } }),
      g.dispose(c),
      s.owned.delete(c),
      g.release(l),
      s.transact(t, () => kt(s, e, d, a)));
    return;
  }
  (g.release(l), s.transact(t, () => kt(s, e, c, a)));
}
const hd =
  ke +
  `
uniform sampler2D u_a; uniform sampler2D u_b; out vec4 o;
void main(){ ivec2 p = ivec2(gl_FragCoord.xy); vec4 a = texelFetch(u_a, p, 0); o = vec4(a.rgb, texelFetch(u_b, p, 0).a); }`;
function Re(s) {
  const e = s.active;
  if (!e) throw new B("No layer selected.");
  if (e.kind === "group") throw new Error("This operation needs a pixel layer, not a group.");
  if (e.kind === "adjustment" && !s.editMask)
    throw new Error("Adjustment layers have no pixels. Select a pixel layer or the layer mask.");
  if (e.kind === "text" && !s.editMask) throw new B("Rasterize the type layer first (Layer › Rasterize › Type).");
  if (e.kind === "shape" && !s.editMask)
    throw new B(
      "This is a shape layer: rasterize it first (Layer › Rasterize › Shape), or edit its path with the path tools.",
    );
  return e;
}
function ul(s, e, t) {
  const n = le("raster", e || s.uniqueName("Layer"));
  return ((n.tex = s.newLayerTex()), t && g.clear(n.tex, null, t), n);
}
function hl(s, e, t = {}) {
  s.transact("New Layer", () => {
    const n = ul(s, e);
    (Object.assign(n, t), s.insertLayer(n));
  });
}
function Ii(s, e, t, n = "New Layer", i = s.active) {
  const a = le("raster", s.uniqueName(t));
  return ((a.tex = s.adopt(e)), s.transact(n, () => s.insertLayer(a, i)), a);
}
function to(s) {
  s.transact("New Group", () => s.insertLayer(le("group", s.uniqueName("Group"))));
}
function dl(s) {
  const e = [...s.selectedIds];
  if (!e.length) return to(s);
  s.transact("Group Layers", () => {
    const n = e
        .map((l) => s.find(l))
        .filter(Boolean)
        .sort((l, c) => l.index - c.index)[0],
      i = le("group", s.uniqueName("Group")),
      a = n.list,
      o = n.index,
      r = [];
    for (const l of s.all()) e.includes(l.id) && r.push(l);
    for (const l of r) s.removeLayer(l.id);
    ((i.children = r), a.splice(Math.min(o, a.length), 0, i), s.setActive(i.id));
  });
}
function pl(s) {
  const e = s.active;
  !e ||
    e.kind !== "group" ||
    s.transact("Ungroup Layers", () => {
      const t = s.find(e.id);
      (t.list.splice(t.index, 1, ...e.children), s.setActive(e.children[0]?.id ?? null));
    });
}
function fl(s, e, t, n = [0, 0, 0], i = [1, 1, 1]) {
  s.transact(`New ${Xe[e]} Layer`, () => {
    const a = le("adjustment", s.uniqueName(Xe[e]));
    ((a.adjust = { type: e, params: t ?? ui(e, n, i) }),
      (a.mask = s.selection ? s.adopt(g.clone(s.selection)) : s.newMaskTex(1)),
      s.insertLayer(a));
  });
}
function Oi(s, e = s.active) {
  if (!e) return;
  const t = (n) => {
    const i = fi(n);
    return (
      (i.id = le("raster", "").id),
      n.tex && (i.tex = s.adopt(g.clone(n.tex))),
      n.mask && (i.mask = s.adopt(g.clone(n.mask))),
      (i.children = n.children.map(t)),
      i
    );
  };
  s.transact("Duplicate Layer", () => {
    const n = t(e);
    ((n.name = s.uniqueName(e.name + " copy")), s.insertLayer(n, e));
  });
}
function ya(s, e = !1) {
  const t = s.active;
  if (!t) return;
  if (!s.selection || !t.tex) return Oi(s, t);
  const n = s.newLayerTex();
  (g.draw(g.program("cutSel", en), n, {
    textures: { u_src: t.tex, u_sel: s.selection },
    uniforms: { u_keepInside: 1 },
  }),
    s.transact(e ? "Layer via Cut" : "Layer via Copy", () => {
      if (e && !t.lockPixels) {
        const a = s.newLayerTex();
        (g.draw(g.program("cutSel", en), a, {
          textures: { u_src: t.tex, u_sel: s.selection },
          uniforms: { u_keepInside: 0 },
        }),
          kt(s, t, a));
      }
      const i = le("raster", s.uniqueName(t.name + (e ? " cut" : " copy")));
      ((i.tex = n), s.insertLayer(i, t));
    }));
}
const en =
  ke +
  `
uniform sampler2D u_src; uniform sampler2D u_sel; uniform int u_keepInside; out vec4 o;
void main(){ ivec2 p = ivec2(gl_FragCoord.xy); vec4 c = texelFetch(u_src, p, 0); float s = texelFetch(u_sel, p, 0).r;
  o = vec4(c.rgb, c.a * (u_keepInside == 1 ? s : 1.0 - s)); }`;
function ml(s) {
  const e = s.selectedIds.size ? [...s.selectedIds] : s.activeId ? [s.activeId] : [];
  e.length &&
    s.transact(e.length > 1 ? "Delete Layers" : "Delete Layer", () => {
      for (const t of e) s.removeLayer(t);
    });
}
function gl(s) {
  const e = s.active;
  if (!e) return;
  const t = s.find(e.id),
    n = t.list[t.index + 1];
  if (!n) throw new B("There is no layer below to merge into.");
  if (n.kind !== "raster" && n.kind !== "text" && n.kind !== "shape")
    throw new B("Cannot merge into a group or adjustment layer.");
  s.transact("Merge Down", () => {
    const i = ve(s, [e, { ...n, clip: !1 }]);
    (s.adopt(i),
      (n.tex = i),
      (n.mask = null),
      (n.blend = "normal"),
      (n.opacity = 1),
      (n.kind = "raster"),
      (n.text = void 0),
      (n.fx = void 0),
      (n.shape = void 0),
      (n.vmask = null),
      (n.vmaskTex = null),
      n.version++,
      s.removeLayer(e.id),
      s.setActive(n.id));
  });
}
function vl(s) {
  s.transact("Merge Visible", () => {
    const e = s.adopt(ve(s));
    s.all().filter((n) => n.visible);
    const t = le("raster", "Merged");
    t.tex = e;
    for (const n of s.layers.filter((i) => i.visible)) s.removeLayer(n.id);
    (s.layers.unshift(t), s.setActive(t.id));
  });
}
function yl(s, e = [1, 1, 1]) {
  s.transact("Flatten Image", () => {
    const t = s.newLayerTex();
    e && g.clear(t, null, [...e, 1]);
    const n = ve(s);
    (g.draw(g.program("applyOver", ys), t, {
      textures: { u_dst: bl(t), u_src: n },
      uniforms: { u_hasSel: 0, u_opacity: 1, u_mode: 0, u_useColor: 0, u_lockAlpha: 0, u_hasCov: 0 },
    }),
      g.dispose(n),
      wl());
    const i = le("raster", "Background");
    ((i.tex = t), (s.layers = [i]), s.setActive(i.id));
  });
}
const ba = [];
function bl(s) {
  const e = g.acquireLike(s, s.format);
  return (g.copy(s, e), ba.push(e), e);
}
function wl() {
  for (; ba.length;) g.release(ba.pop());
}
function xl(s, e = s.active) {
  e &&
    (e.kind === "text"
      ? s.transact("Rasterize Type", () => {
          ((e.kind = "raster"), (e.text = void 0), e.version++);
        })
      : e.kind === "shape"
        ? s.transact("Rasterize Shape", () => {
            ((e.kind = "raster"), (e.shape = void 0), e.version++);
          })
        : e.kind === "raster" && e.fx
          ? s.transact("Rasterize Layer Style", () => {
              const t = s.adopt(Wr(s, e));
              ((e.tex = t), (e.fx = void 0), (e.mask = null), e.version++);
            })
          : e.kind === "group" &&
            s.transact("Merge Group", () => {
              const t = s.adopt(ve(s, [{ ...e, opacity: 1, blend: e.blend === "passThrough" ? "normal" : e.blend }])),
                n = le("raster", e.name, { opacity: e.opacity, blend: e.blend === "passThrough" ? "normal" : e.blend });
              n.tex = t;
              const i = s.find(e.id);
              (i.list.splice(i.index, 1, n), s.setActive(n.id));
            }));
}
function zs(s, e) {
  const t = s.active;
  if (!t) return;
  const n = s.find(t.id),
    i = n.list.length,
    a = e === "up" ? n.index - 1 : e === "down" ? n.index + 1 : e === "top" ? 0 : i - 1;
  a < 0 ||
    a >= i ||
    a === n.index ||
    s.transact("Arrange Layer", () => {
      (n.list.splice(n.index, 1), n.list.splice(a, 0, t));
    });
}
function kl(s, e, t, n) {
  if (e === t) return;
  const i = s.find(e),
    a = s.find(t);
  if (!i || !a) return;
  const o = (r, l) => r.children.some((c) => c.id === l || o(c, l));
  o(i.layer, t) ||
    s.transact("Arrange Layer", () => {
      i.list.splice(i.index, 1);
      const r = s.find(t);
      (n === "inside" && r.layer.kind === "group"
        ? (r.layer.children.unshift(i.layer), (r.layer.expanded = !0))
        : r.list.splice(n === "above" ? r.index : r.index + 1, 0, i.layer),
        s.setActive(e));
    });
}
function $e(s, e, t, n = "Layer Properties") {
  s.transact(n, () => {
    (Object.assign(e, t), s.invalidate());
  });
}
function _l(s) {
  const e = s.active;
  e && $e(s, e, { clip: !e.clip }, e.clip ? "Release Clipping Mask" : "Create Clipping Mask");
}
function wa(s, e = s.selection ? "selection" : "reveal") {
  const t = s.active;
  !t ||
    t.mask ||
    s.transact("Add Layer Mask", () => {
      let n;
      if ((e === "selection" || e === "hideSelection") && s.selection) {
        if (((n = s.newMaskTex(0)), g.copy(s.selection, n), e === "hideSelection")) {
          const i = s.newMaskTex(0);
          (g.draw(g.program("selMap", Ai), i, { textures: { u_src: n }, uniforms: { u_op: 0 } }), (n = i));
        }
        s.setSelection(null);
      } else n = s.newMaskTex(e === "hide" ? 0 : 1);
      ((t.mask = n), (t.maskEnabled = !0), (s.editMask = !0));
    });
}
function tn(s, e = !1) {
  const t = s.active;
  !t ||
    !t.mask ||
    s.transact(e ? "Apply Layer Mask" : "Delete Layer Mask", () => {
      if (e && t.tex) {
        const n = s.newLayerTex();
        (g.draw(g.program("maskedCopy", Ga), n, {
          textures: { u_src: t.tex, u_mask: t.mask },
          uniforms: { u_hasMask: 1, u_srcOffset: [0, 0] },
        }),
          (t.tex = n));
      }
      ((t.mask = null), (s.editMask = !1), t.version++);
    });
}
function Ml(s, e, t) {
  ot(
    s,
    e,
    "Invert",
    (n, i) => {
      const a = { type: "invert", params: {} };
      if (t === "mask") g.draw(g.program("selMap", Ai), i, { textures: { u_src: n }, uniforms: { u_op: 0 } });
      else {
        const o = yn(n, a, null);
        (g.copy(o, i), g.release(o));
      }
    },
    { target: t },
  );
}
function sn(s, e, t = 1, n = "normal", i = "Fill", a = 1) {
  const o = Re(s);
  ot(s, o, i, (r, l) => {
    if (r.format === "r16f") {
      g.clear(l, null, [0.299 * e[0] + 0.587 * e[1] + 0.114 * e[2], 0, 0, 1]);
      return;
    }
    g.draw(g.program("apply", ys), l, {
      textures: { u_dst: r },
      uniforms: {
        u_hasSel: 0,
        u_opacity: t,
        u_mode: wt[n],
        u_useColor: 1,
        u_color: [...e, a],
        u_lockAlpha: o.lockAlpha ? 1 : 0,
        u_hasCov: 0,
      },
    });
  });
}
function so(s) {
  const e = Re(s);
  if (s.editMask && e.mask) {
    sn(s, [0, 0, 0], 1, "normal", "Clear");
    return;
  }
  if (e.lockAlpha) throw new Error("Transparency is locked on this layer.");
  ot(s, e, "Clear", (t, n) => g.clear(n, null, [0, 0, 0, 0]));
}
function Sl(s, e, t, n, i, a, o, r, l = !0) {
  const c = Re(s),
    u = !!(s.editMask && c.mask),
    d = jn(e, !1);
  let f;
  if (s.ink && !u) {
    f = g.createPair(1024, 1, "rgba32f", s.ink);
    const v = s.ink,
      y = jn(
        {
          ...e,
          stops: e.stops.map((w) => {
            const _ = os(w.color, v);
            return { ...w, color: [_[0], _[1], _[2]], k: _[3] };
          }),
        },
        !1,
      ),
      b = jn({ ...e, stops: e.stops.map((w) => ({ ...w, color: [os(w.color, v)[3], 0, 0] })) }, !1),
      x = new Float32Array(1024 * 5);
    for (let w = 0; w < 1024; w++) x.set([y[w * 4], y[w * 4 + 1], y[w * 4 + 2], b[w * 4], d[w * 4 + 3]], w * 5);
    g.uploadInk(f, x);
  } else ((f = g.createTex(1024, 1, "rgba32f", { linear: !1 })), g.upload(f, d));
  const m = u ? g.acquire(s.width, s.height, "rgba16f") : s.acquireLayer("rgba16f");
  (g.draw(g.program("gradient", Ph), m, {
    textures: { u_lut: f },
    uniforms: { u_a: t, u_b: n, u_type: i, u_reverse: a ? 1 : 0, u_dither: l ? 1 : 0 },
  }),
    ot(s, c, "Gradient", (v, y) => {
      if (v.format === "r16f") {
        g.draw(g.program("lumToMask", dd), y, { textures: { u_src: m, u_old: v }, uniforms: { u_opacity: o } });
        return;
      }
      g.draw(g.program("apply", ys), y, {
        textures: { u_dst: v, u_src: m },
        uniforms: {
          u_hasSel: 0,
          u_opacity: o,
          u_mode: wt[r],
          u_useColor: 0,
          u_lockAlpha: c.lockAlpha ? 1 : 0,
          u_hasCov: 0,
        },
      });
    }),
    g.release(m),
    g.dispose(f));
}
const dd =
  ke +
  `
uniform sampler2D u_src; uniform sampler2D u_old; uniform float u_opacity; out vec4 o;
void main(){ ivec2 p = ivec2(gl_FragCoord.xy); vec4 c = texelFetch(u_src, p, 0); float l = dot(c.rgb, vec3(0.299,0.587,0.114));
  float old = texelFetch(u_old, p, 0).r; o = vec4(mix(old, l, c.a * u_opacity), 0.0, 0.0, 1.0); }`;
function Tl(s, e, t, n, i) {
  const a = Re(s),
    o = g.createTex(s.width, s.height, "r16f");
  (g.upload(o, e),
    ot(s, a, "Paint Bucket", (r, l) => {
      if (r.format === "r16f") {
        g.copy(r, l);
        return;
      }
      g.draw(g.program("apply", ys), l, {
        textures: { u_dst: r, u_cov: o },
        uniforms: {
          u_hasSel: 0,
          u_opacity: n,
          u_mode: wt[i],
          u_useColor: 1,
          u_color: [...t, 1],
          u_lockAlpha: a.lockAlpha ? 1 : 0,
          u_hasCov: 1,
        },
      });
    }),
    g.dispose(o));
}
function yi(s, e) {
  const t = Re(s);
  ot(s, t, Xe[e.type], (n, i) => {
    const a = yn(n, e, null);
    (g.copy(a, i), g.release(a));
  });
}
function Pl(s, e) {
  const t = [],
    n = [];
  for (let o = 0; o < 4; o++) {
    const [r, l] = s[o],
      [c, u] = e[o];
    (t.push([r, l, 1, 0, 0, 0, -c * r, -c * l]), n.push(c), t.push([0, 0, 0, r, l, 1, -u * r, -u * l]), n.push(u));
  }
  const i = 8;
  for (let o = 0; o < i; o++) {
    let r = o;
    for (let c = o + 1; c < i; c++) Math.abs(t[c][o]) > Math.abs(t[r][o]) && (r = c);
    (([t[o], t[r]] = [t[r], t[o]]), ([n[o], n[r]] = [n[r], n[o]]));
    const l = t[o][o] || 1e-12;
    for (let c = 0; c < i; c++) {
      if (c === o) continue;
      const u = t[c][o] / l;
      for (let d = o; d < i; d++) t[c][d] -= u * t[o][d];
      n[c] -= u * n[o];
    }
  }
  const a = n.map((o, r) => o / t[r][r]);
  return [a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], 1];
}
function bi(s) {
  const [e, t, n, i, a, o, r, l, c] = s,
    u = a * c - o * l,
    d = -(i * c - o * r),
    f = i * l - a * r,
    m = e * u + t * d + n * f || 1e-12;
  return [
    u / m,
    -(t * c - n * l) / m,
    (t * o - n * a) / m,
    d / m,
    (e * c - n * r) / m,
    -(e * o - n * i) / m,
    f / m,
    -(e * l - t * r) / m,
    (e * a - t * i) / m,
  ];
}
function pd(s, e, t) {
  const n = s[6] * e + s[7] * t + s[8];
  return [(s[0] * e + s[1] * t + s[2]) / n, (s[3] * e + s[4] * t + s[5]) / n];
}
function nn(s) {
  return new Float32Array([s[0], s[3], s[6], s[1], s[4], s[7], s[2], s[5], s[8]]);
}
function _s(s, e, t, n = 2, i = [0, 0], a = null) {
  const o = bi(t);
  g.draw(g.program("transform", qr), e, {
    textures: { u_src: s },
    uniforms: { u_inv: nn(o), u_quality: n, u_srcOrigin: i },
    rect: a,
  });
}
function Pn(s, e, t, n, i, a = !0) {
  s.transact(e, () => {
    (s.width, s.height, (s.width = t), (s.height = n));
    const o = (r, l) => {
      if (!r) return null;
      const c = l ? s.newSelTex() : s.newLayerTex();
      return (l && g.clear(c, null, [r === s.selection ? 0 : 1, 0, 0, 1]), i(r, c, l), c);
    };
    for (const r of s.all()) ((r.tex = o(r.tex, !1)), (r.mask = o(r.mask, !0)), r.version++);
    (s.selection && (s.selection = a ? o(s.selection, !0) : null), s.allocComposite(), k.emit("doc:resized", s));
  });
}
function Cl(s, e, t, n, i, a = null) {
  const o = Math.round((e - s.width) * n),
    r = Math.round((t - s.height) * i),
    l = s.layers[s.layers.length - 1]?.id;
  if (
    (Pn(s, "Canvas Size", e, t, (c, u) => {
      g.copy(
        c,
        u,
        {
          x: Math.max(0, -o),
          y: Math.max(0, -r),
          w: Math.min(c.w, e - o) - Math.max(0, -o),
          h: Math.min(c.h, t - r) - Math.max(0, -r),
        },
        Math.max(0, o),
        Math.max(0, r),
      );
    }),
    a && l)
  ) {
    const c = s.find(l)?.layer;
    if (c && c.tex) {
      const u = s.newLayerTex();
      (g.clear(u, null, [...a, 1]),
        g.draw(g.program("apply", ys), u, {
          textures: { u_dst: bl(u), u_src: c.tex },
          uniforms: { u_hasSel: 0, u_opacity: 1, u_mode: 0, u_useColor: 0, u_lockAlpha: 0, u_hasCov: 0 },
        }),
        wl());
      const d = s.history[s.historyIndex - 1];
      ((c.tex = u), (d.after = s.snapshot()), s.invalidate());
    }
  }
}
function Bi(s, e) {
  ((e = { x: Math.round(e.x), y: Math.round(e.y), w: Math.max(1, Math.round(e.w)), h: Math.max(1, Math.round(e.h)) }),
    Pn(
      s,
      "Crop",
      e.w,
      e.h,
      (t, n) => {
        const i = ae(e, t.w, t.h);
        i.w > 0 && i.h > 0 && g.copy(t, n, i, i.x - e.x, i.y - e.y);
      },
      !1,
    ));
}
function El(s) {
  const e = at(s);
  e && Bi(s, e);
}
function Ll(s, e, t, n = 2) {
  const i = e / s.width,
    a = t / s.height;
  Pn(s, "Image Size", e, t, (o, r) => Al(o, r, i, a, n));
}
function Al(s, e, t, n, i = 2) {
  t < 1 && n < 1 && i > 0
    ? g.draw(g.program("downscale", Th), e, { textures: { u_src: s }, uniforms: { u_scale: [1 / t, 1 / n] } })
    : _s(s, e, [t, 0, 0, 0, n, 0, 0, 0, 1], i);
}
function Vn(s, e) {
  const t = s.width,
    n = s.height,
    i = e === 180 ? t : n,
    a = e === 180 ? n : t,
    o =
      e === 90
        ? [0, -1, n, 1, 0, 0, 0, 0, 1]
        : e === -90
          ? [0, 1, 0, -1, 0, t, 0, 0, 1]
          : [-1, 0, t, 0, -1, n, 0, 0, 1];
  Pn(s, `Rotate Canvas ${e}°`, i, a, (r, l) => _s(r, l, o, 0));
}
function xa(s, e) {
  const t = e ? [-1, 0, s.width, 0, 1, 0, 0, 0, 1] : [1, 0, 0, 0, -1, s.height, 0, 0, 1];
  Pn(s, e ? "Flip Canvas Horizontal" : "Flip Canvas Vertical", s.width, s.height, (n, i) => _s(n, i, t, 0));
}
function ka(s, e) {
  const t = Re(s),
    n = at(s) || eo(s),
    i = e ? [-1, 0, 2 * n.x + n.w, 0, 1, 0, 0, 0, 1] : [1, 0, 0, 0, -1, 2 * n.y + n.h, 0, 0, 1];
  ot(s, t, e ? "Flip Horizontal" : "Flip Vertical", (a, o) => _s(a, o, i, 0));
}
function js(s, e) {
  const t = Re(s),
    n = at(s) || eo(s),
    i = n.x + n.w / 2,
    a = n.y + n.h / 2,
    o = (e * Math.PI) / 180,
    r = Math.cos(o),
    l = Math.sin(o),
    c = [r, -l, i - r * i + l * a, l, r, a - l * i - r * a, 0, 0, 1];
  ot(s, t, `Rotate ${e}°`, (u, d) => _s(u, d, c, Math.abs(e) % 90 === 0 ? 0 : 2));
}
function no(s) {
  if (s.path && !Te(s.path)) return fd(s);
  const e = s.text.split(`
`),
    t = `${s.italic ? "italic " : ""}${s.weight} ${s.size}px "${s.font}", sans-serif`,
    n = new OffscreenCanvas(4, 4).getContext("2d");
  ((n.font = t), (n.letterSpacing = `${s.tracking}px`));
  const i = s.size * s.lineHeight,
    a = e.map((f) => n.measureText(f || " ").width),
    o = Math.max(1, ...a),
    r = Math.ceil(s.size * 0.6),
    l = Math.ceil(o + r * 2),
    c = Math.ceil(i * e.length + r * 2);
  if (l > 16384 || c > 16384) return null;
  const u = new OffscreenCanvas(l, c),
    d = u.getContext("2d");
  return (
    (d.font = t),
    (d.letterSpacing = `${s.tracking}px`),
    (d.fillStyle = `rgb(${s.color.map((f) => Math.round(f * 255)).join(",")})`),
    (d.textBaseline = "alphabetic"),
    s.antialias || (d.fontSmooth = "never"),
    e.forEach((f, m) => {
      let v = r;
      (s.align === "center" && (v = r + (o - a[m]) / 2), s.align === "right" && (v = r + o - a[m]));
      const y = r + m * i + s.size * 0.82 + (i - s.size) / 2;
      (d.fillText(f, v, y), s.underline && d.fillRect(v, y + s.size * 0.1, a[m], Math.max(1, s.size / 14)));
    }),
    { canvas: u, x: Math.round(s.x - r), y: Math.round(s.y - r) }
  );
}
function fd(s) {
  const e = Zr(s.path),
    t = ws(s.path);
  if (!e || !t) return null;
  const n = `${s.italic ? "italic " : ""}${s.weight} ${s.size}px "${s.font}", sans-serif`,
    i = Math.ceil(s.size * 1.6),
    a = Math.floor(t.x - i),
    o = Math.floor(t.y - i),
    r = Math.ceil(t.w + i * 2),
    l = Math.ceil(t.h + i * 2);
  if (r > 16384 || l > 16384) return null;
  const c = new OffscreenCanvas(r, l),
    u = c.getContext("2d");
  ((u.font = n),
    (u.fillStyle = `rgb(${s.color.map((_) => Math.round(_ * 255)).join(",")})`),
    (u.textBaseline = "alphabetic"),
    s.antialias || (u.fontSmooth = "never"));
  const f = [...s.text.replace(/\n/g, " ")],
    m = f.map((_) => u.measureText(_).width + s.tracking),
    v = m.reduce((_, M) => _ + M, 0) - s.tracking;
  let y = s.pathOffset || 0;
  (s.align === "center" && (y = (e.length - v) / 2 + (s.pathOffset || 0)),
    s.align === "right" && (y = e.length - v - (s.pathOffset || 0)));
  const b = s.path.subpaths[0]?.closed;
  let x = y;
  const w = s.pathFlip ? s.size * 0.78 : -s.size * 0.08;
  return (
    f.forEach((_, M) => {
      const T = x + (m[M] - s.tracking) / 2;
      if (!b && (T < 0 || T > e.length)) {
        x += m[M];
        return;
      }
      const { pt: C, angle: A } = e.at(T);
      (u.save(),
        u.translate(C[0] - a, C[1] - o),
        u.rotate(A),
        u.fillText(_, -(m[M] - s.tracking) / 2, w),
        s.underline && u.fillRect(-m[M] / 2, w + s.size * 0.1, m[M], Math.max(1, s.size / 14)),
        u.restore(),
        (x += m[M]));
    }),
    { canvas: c, x: a, y: o }
  );
}
function _t(s, e) {
  if (!e.text) return;
  const t = no(e.text),
    n = s.newLayerTex();
  if (t) {
    const i = g.uploadImage8(t.canvas, t.canvas.width, t.canvas.height);
    (n.k
      ? ((i.isImage = !1),
        g.draw(g.program("coverToLayer", Za), n, {
          textures: { u_fill: i, u_stroke: i },
          uniforms: {
            u_origin: [t.x, t.y],
            u_fillColor: e.text.color.slice(0, 3),
            u_strokeColor: [0, 0, 0],
            u_fillOpacity: 1,
            u_hasFill: 1,
            u_hasStroke: 0,
          },
          rect: { x: t.x, y: t.y, w: t.canvas.width, h: t.canvas.height },
        }))
      : g.draw(g.program("rasterToLayer", Ri), n, {
          textures: { u_src: i },
          uniforms: { u_origin: [t.x, t.y], u_unpremul: 0 },
        }),
      g.dispose(i));
  }
  ((e.tex = n), e.version++, s.invalidate());
}
function Is(s) {
  if (s.path && !Te(s.path)) {
    const n = ws(s.path);
    return n ? { x: n.x, y: n.y - s.size, w: n.w, h: n.h + s.size * 1.5 } : { x: s.x, y: s.y, w: 10, h: s.size };
  }
  const e = no(s);
  if (!e) return { x: s.x, y: s.y, w: 10, h: s.size };
  const t = Math.ceil(s.size * 0.6);
  return { x: e.x + t, y: e.y + t, w: e.canvas.width - 2 * t, h: e.canvas.height - 2 * t };
}
function Rl(s, e) {
  const t = Math.min(e.a[0], e.b[0]),
    n = Math.min(e.a[1], e.b[1]),
    i = Math.max(e.a[0], e.b[0]),
    a = Math.max(e.a[1], e.b[1]),
    o = Math.ceil(e.strokeWidth) + 4,
    r = Math.floor(t) - o,
    l = Math.floor(n) - o,
    c = Math.ceil(i - t) + o * 2,
    u = Math.ceil(a - n) + o * 2;
  if (c < 2 || u < 2 || c > 16384 || u > 16384) return;
  const d = new OffscreenCanvas(c, u),
    f = d.getContext("2d");
  f.imageSmoothingEnabled = e.antialias;
  const m = (C) => `rgb(${C.map((A) => Math.round(A * 255)).join(",")})`,
    v = t - r,
    y = n - l,
    b = i - t,
    x = a - n;
  if ((f.beginPath(), e.kind === "rect")) f.rect(v, y, b, x);
  else if (e.kind === "roundRect") f.roundRect(v, y, b, x, Math.min(e.radius, b / 2, x / 2));
  else if (e.kind === "ellipse") f.ellipse(v + b / 2, y + x / 2, b / 2, x / 2, 0, 0, Math.PI * 2);
  else if (e.kind === "line") (f.moveTo(e.a[0] - r, e.a[1] - l), f.lineTo(e.b[0] - r, e.b[1] - l));
  else {
    const C = Math.max(3, e.sides),
      A = v + b / 2,
      F = y + x / 2,
      S = e.kind === "star" ? C * 2 : C;
    for (let P = 0; P < S; P++) {
      const E = -Math.PI / 2 + (P * Math.PI * 2) / S,
        D = e.kind === "star" && P % 2 ? 0.45 : 1,
        j = A + Math.cos(E) * (b / 2) * D,
        U = F + Math.sin(E) * (x / 2) * D;
      P ? f.lineTo(j, U) : f.moveTo(j, U);
    }
    f.closePath();
  }
  (e.fill && e.kind !== "line" && ((f.fillStyle = m(e.fill)), f.fill()),
    ((e.stroke && e.strokeWidth > 0) || e.kind === "line") &&
      ((f.strokeStyle = m(e.stroke || e.fill || [0, 0, 0])),
      (f.lineWidth = Math.max(1, e.strokeWidth)),
      (f.lineJoin = "round"),
      (f.lineCap = "round"),
      f.stroke()));
  const w = g.uploadImage8(d, c, u),
    _ = s.newLayerTex();
  (g.draw(g.program("rasterToLayer", Ri), _, { textures: { u_src: w }, uniforms: { u_origin: [r, l], u_unpremul: 0 } }),
    g.dispose(w));
  const M = {
      rect: "Rectangle",
      roundRect: "Rounded Rectangle",
      ellipse: "Ellipse",
      line: "Line",
      polygon: "Polygon",
      star: "Star",
    }[e.kind],
    T = le("raster", s.uniqueName(M));
  ((T.tex = _), s.transact(`${M} Tool`, () => s.insertLayer(T)));
}
function yt(s, e, t, n, i = 0, a = 0) {
  const o = g.createTex(t, n, "rgba32f", { linear: !1 });
  (g.upload(o, e), (o.isImage = !0));
  const r = s.newLayerTex();
  return (
    g.draw(g.program("rasterToLayer", Ri), r, {
      textures: { u_src: o },
      uniforms: { u_origin: [i, a], u_unpremul: 0 },
    }),
    g.dispose(o),
    r
  );
}
function $i(s, e, t, n, i = 0, a = 0) {
  const o = s.newLayerTex(),
    r = ae({ x: i, y: a, w: t, h: n }, s.width, s.height);
  if (r.w <= 0 || r.h <= 0) return o;
  let l = e;
  if (r.x !== i || r.y !== a || r.w !== t || r.h !== n) {
    l = new Float32Array(r.w * r.h * 5);
    for (let c = 0; c < r.h; c++)
      l.set(e.subarray(((r.y - a + c) * t + (r.x - i)) * 5, ((r.y - a + c) * t + (r.x - i) + r.w) * 5), c * r.w * 5);
  }
  return (g.uploadInk(o, l, r), o);
}
function io(s, e, t, n, i = 0, a = 0) {
  const o = g.uploadImage8(e, t, n),
    r = s.newLayerTex();
  return (
    g.draw(g.program("rasterToLayer", Ri), r, {
      textures: { u_src: o },
      uniforms: { u_origin: [i, a], u_unpremul: 0 },
    }),
    g.dispose(o),
    r
  );
}
function Fl(s, e = s.active) {
  !e ||
    !e.vmask ||
    !e.vmaskTex ||
    s.transact("Rasterize Vector Mask", () => {
      const t = s.newMaskTex(1);
      (e.mask
        ? g.draw(g.program("maskMulR", md), t, { textures: { u_a: e.mask, u_b: e.vmaskTex } })
        : g.copy(e.vmaskTex, t),
        (e.mask = t),
        (e.maskEnabled = !0),
        (e.vmask = null),
        (e.vmaskTex = null),
        e.version++);
    });
}
const md =
    ke +
    `
uniform sampler2D u_a;
uniform sampler2D u_b;
out vec4 o;
void main(){ ivec2 p = ivec2(gl_FragCoord.xy); o = vec4(texelFetch(u_a, p, 0).r * texelFetch(u_b, p, 0).r, 0.0, 0.0, 1.0); }`,
  wi = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        CUT_FRAG: en,
        addLayerFromTex: Ii,
        addMask: wa,
        addNewLayer: hl,
        applyAdjustment: yi,
        applyGradient: Sl,
        applyH: pd,
        canvasSize: Cl,
        clearPixels: so,
        cropTo: Bi,
        cropToSelection: El,
        deleteLayers: ml,
        deleteMask: tn,
        drawShapeLayer: Rl,
        duplicateLayer: Oi,
        editLayerPixels: ot,
        fillCoverage: Tl,
        fillLayer: sn,
        flatten: yl,
        flipCanvas: xa,
        flipLayer: ka,
        fullRect: eo,
        glMat3: nn,
        groupSelected: dl,
        homography: Pl,
        imageSize: Ll,
        invert3: bi,
        invertTex: Ml,
        layerViaCopy: ya,
        mergeDown: gl,
        mergeVisible: vl,
        moveLayer: zs,
        moveLayerTo: kl,
        newAdjustmentLayer: fl,
        newGroup: to,
        newRasterLayer: ul,
        rasterizeLayer: xl,
        rasterizeVectorMask: Fl,
        renderTextLayer: _t,
        renderTextToCanvas: no,
        renderTransformed: _s,
        requireRaster: Re,
        resample: Al,
        rotateCanvas: Vn,
        rotateLayer: js,
        setLayerProps: $e,
        swapLayerTex: kt,
        texFromFloat: yt,
        texFromImage: io,
        texFromInk: $i,
        textBounds: Is,
        toggleClip: _l,
        ungroup: pl,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  Dl = {
    curve: [
      [0, 0],
      [0.5, 0.5],
      [1, 1],
    ],
    minPressure: 0.02,
    barrel: "eyedropper",
    eraserEnd: !0,
    touch: "gestures",
    palmRejection: !0,
    backend: "auto",
  },
  gd = [
    [
      "Linear",
      [
        [0, 0],
        [0.5, 0.5],
        [1, 1],
      ],
    ],
    [
      "Soft (light touch)",
      [
        [0, 0],
        [0.25, 0.45],
        [0.6, 0.82],
        [1, 1],
      ],
    ],
    [
      "Very soft",
      [
        [0, 0],
        [0.15, 0.45],
        [0.5, 0.88],
        [1, 1],
      ],
    ],
    [
      "Firm (heavy hand)",
      [
        [0, 0],
        [0.45, 0.22],
        [0.8, 0.62],
        [1, 1],
      ],
    ],
    [
      "S-curve (control)",
      [
        [0, 0],
        [0.3, 0.15],
        [0.7, 0.85],
        [1, 1],
      ],
    ],
  ];
function an() {
  const s = h.prefs.tablet || {};
  return { ...Dl, ...s };
}
function vd(s) {
  ((h.prefs.tablet = { ...an(), ...s }), (Yt = null), h.savePrefsSoon(), k.emit("tablet:prefs"));
}
let Yt = null;
function ao(s) {
  const e = an();
  if ((Yt || (Yt = Ct(e.curve, 256)), s <= e.minPressure)) return s <= 0 ? 0 : 0.001;
  const t = Math.min(1, (s - e.minPressure) / Math.max(0.001, 1 - e.minPressure)) * 255,
    n = Math.floor(t),
    i = t - n;
  return Math.max(0.001, Yt[n] + (Yt[Math.min(255, n + 1)] - Yt[n]) * i);
}
function Os(s) {
  return s.pointerType === "pen" && ((s.buttons & 32) !== 0 || s.button === 5);
}
const _e = {
  lastPenTime: -1e9,
  rate: 0,
  raw: 0,
  pressure: 0,
  tiltX: 0,
  tiltY: 0,
  twist: 0,
  type: "",
  buttons: 0,
  seenPen: !1,
};
let ea = 0,
  ta = 0;
function _a(s) {
  (s.pointerType === "pen" &&
    ((_e.lastPenTime = performance.now()), _e.seenPen || ((_e.seenPen = !0), k.emit("tablet:detected"))),
    (_e.type = s.pointerType),
    (_e.buttons = s.buttons),
    (_e.raw = s.pressure),
    (_e.pressure = s.pointerType === "pen" ? ao(s.pressure) : s.buttons ? 1 : 0),
    (_e.tiltX = s.tiltX || 0),
    (_e.tiltY = s.tiltY || 0),
    (_e.twist = s.twist || 0));
  const e = performance.now();
  (ea++, e - ta > 500 && ((_e.rate = Math.round((ea * 1e3) / (e - ta))), (ea = 0), (ta = e)));
}
function zl(s = 600) {
  return performance.now() - _e.lastPenTime < s;
}
class Il {
  constructor(e, t) {
    ((this.apply = e), (this.baseView = t));
  }
  pts = new Map();
  start = null;
  down(e, t, n) {
    (this.pts.set(e, { x: t, y: n }), this.reset());
  }
  up(e) {
    (this.pts.delete(e), this.reset());
  }
  reset() {
    const e = [...this.pts.values()];
    if (!e.length) {
      this.start = null;
      return;
    }
    const t = this.baseView();
    this.start = { a: { ...e[0] }, b: e[1] ? { ...e[1] } : null, ...t };
  }
  move(e, t, n) {
    if (!this.pts.has(e) || !this.start) return;
    this.pts.set(e, { x: t, y: n });
    const i = [...this.pts.values()],
      a = this.start;
    if (i.length === 1 || !a.b) {
      this.apply({ dx: i[0].x - a.a.x, dy: i[0].y - a.a.y, scale: 1, rotate: 0, cx: i[0].x, cy: i[0].y }, a);
      return;
    }
    const o = { x: (a.a.x + a.b.x) / 2, y: (a.a.y + a.b.y) / 2 },
      r = { x: (i[0].x + i[1].x) / 2, y: (i[0].y + i[1].y) / 2 },
      l = Math.hypot(a.b.x - a.a.x, a.b.y - a.a.y),
      c = Math.hypot(i[1].x - i[0].x, i[1].y - i[0].y),
      u = Math.atan2(a.b.y - a.a.y, a.b.x - a.a.x);
    let f = ((Math.atan2(i[1].y - i[0].y, i[1].x - i[0].x) - u) * 180) / Math.PI;
    (Math.abs(f) < 8 && (f = 0),
      this.apply({ dx: r.x - o.x, dy: r.y - o.y, scale: l > 10 ? c / l : 1, rotate: f, cx: o.x, cy: o.y }, a));
  }
  get active() {
    return this.pts.size > 0;
  }
}
const yd = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        CURVE_PRESETS: gd,
        DEFAULT_TABLET: Dl,
        TouchGestures: Il,
        isEraser: Os,
        mapPressure: ao,
        notePointer: _a,
        penNearby: zl,
        penState: _e,
        setTabletPrefs: vd,
        tabletPrefs: an,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  Ma = new Map();
function we(s, e = "#888") {
  let t = Ma.get(s);
  return (
    t === void 0 && ((t = getComputedStyle(document.documentElement).getPropertyValue(s).trim() || e), Ma.set(s, t)),
    t
  );
}
function bd() {
  const s = window.matchMedia("(prefers-color-scheme: dark)"),
    e = () => {
      (Ma.clear(), k.emit("theme:changed", s.matches), k.emit("render"), k.emit("doc:active"));
    };
  s.addEventListener("change", e);
}
const wd = "#1d1915";
function xd() {
  const s = h.prefs.pasteboard;
  return (s && s.toLowerCase() !== wd ? nt(s) : null) || nt(we("--pasteboard", "#26292d")) || [0.15, 0.16, 0.18];
}
class Ol {
  el;
  area;
  glCanvas;
  overlay;
  octx;
  rulerTop;
  rulerLeft;
  empty;
  dpr = 1;
  cssW = 1;
  cssH = 1;
  needs = !0;
  lastAnts = 0;
  dragging = null;
  hover = null;
  lut3d = null;
  proof = !1;
  gamutWarning = !1;
  tempTool = null;
  spinner = 0;
  cursorPos = null;
  constructor() {
    ((this.glCanvas = p("canvas", { class: "gl" })),
      (this.overlay = p("canvas", { class: "overlay", tabindex: 0 })),
      (this.rulerTop = p("canvas", { class: "ruler ruler-top" })),
      (this.rulerLeft = p("canvas", { class: "ruler ruler-left" })),
      (this.empty = p("div", { class: "empty-state" })),
      (this.area = p("div", { class: "vp-area" }, this.glCanvas, this.overlay, this.empty)),
      (this.el = p(
        "div",
        { class: "viewport" },
        p("div", { class: "ruler-corner" }),
        this.rulerTop,
        this.rulerLeft,
        this.area,
      )),
      (this.octx = this.overlay.getContext("2d")),
      Qu(this.glCanvas),
      new ResizeObserver(() => requestAnimationFrame(() => this.resize())).observe(this.area),
      this.bindInput(),
      k.on("render", () => this.request()),
      k.on("doc:active", () => {
        (this.request(), this.updateEmpty());
      }),
      k.on("docs:changed", () => this.updateEmpty()),
      k.on("view:fit", (t) => {
        requestAnimationFrame(() => this.fit(t, !0));
      }),
      k.on("doc:resized", (t) => {
        t === h.doc && this.request();
      }),
      k.on("tool:changed", () => {
        (this.updateCursor(), this.request());
      }));
    const e = (t) => {
      (this.frame(t), requestAnimationFrame(e));
    };
    (requestAnimationFrame(e), this.updateEmpty());
  }
  updateEmpty() {
    this.el.classList.toggle("no-doc", !h.doc);
  }
  request() {
    this.needs = !0;
  }
  resize() {
    const e = this.area.getBoundingClientRect();
    ((this.dpr = window.devicePixelRatio || 1),
      (this.cssW = Math.max(1, e.width)),
      (this.cssH = Math.max(1, e.height)));
    for (const n of [this.glCanvas, this.overlay])
      ((n.width = Math.round(this.cssW * this.dpr)),
        (n.height = Math.round(this.cssH * this.dpr)),
        (n.style.width = this.cssW + "px"),
        (n.style.height = this.cssH + "px"));
    const t = h.prefs.showRulers;
    (this.el.classList.toggle("rulers", t),
      (this.rulerTop.width = Math.round(this.cssW * this.dpr)),
      (this.rulerTop.height = Math.round(18 * this.dpr)),
      (this.rulerLeft.width = Math.round(18 * this.dpr)),
      (this.rulerLeft.height = Math.round(this.cssH * this.dpr)),
      this.request());
  }
  xf(e = h.doc) {
    const t = e ? e.view : { zoom: 1, panX: 0, panY: 0, rotation: 0, flip: !1 },
      n = e ? e.width : 1,
      i = e ? e.height : 1,
      a = this.cssW / 2 + t.panX,
      o = this.cssH / 2 + t.panY,
      r = (t.rotation * Math.PI) / 180,
      l = Math.cos(r),
      c = Math.sin(r),
      u = t.flip ? -1 : 1;
    return {
      zoom: t.zoom,
      docToScreen: (d, f) => {
        const m = (d - n / 2) * t.zoom * u,
          v = (f - i / 2) * t.zoom;
        return [a + l * m - c * v, o + c * m + l * v];
      },
      screenToDoc: (d, f) => {
        const m = d - a,
          v = f - o,
          y = l * m + c * v,
          b = -c * m + l * v;
        return [n / 2 + (y / t.zoom) * u, i / 2 + b / t.zoom];
      },
    };
  }
  fit(e = h.doc, t = !1) {
    if (!e) return;
    const n = 48;
    let i = Math.min((this.cssW - n) / e.width, (this.cssH - n) / e.height);
    (t && (i = Math.min(i, 1)),
      (e.view.zoom = Math.max(0.01, i)),
      (e.view.panX = 0),
      (e.view.panY = 0),
      this.viewChanged());
  }
  actualPixels() {
    const e = h.doc;
    e && ((e.view.zoom = 1 / this.dpr), (e.view.panX = e.view.panY = 0), this.viewChanged());
  }
  zoomAt(e, t = this.cssW / 2, n = this.cssH / 2, i = !1) {
    const a = h.doc;
    if (!a) return;
    const [o, r] = this.xf().screenToDoc(t, n),
      l = Math.min(64, Math.max(0.01, i ? e : a.view.zoom * e));
    a.view.zoom = l;
    const [c, u] = this.xf().docToScreen(o, r);
    ((a.view.panX += t - c), (a.view.panY += n - u), this.viewChanged());
  }
  zoomStep(e, t, n) {
    const i = h.doc;
    if (!i) return;
    const a = [
        0.01, 0.02, 0.03, 0.05, 0.0667, 0.0833, 0.125, 0.1667, 0.25, 0.333, 0.5, 0.6667, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16,
        24, 32, 48, 64,
      ],
      o = i.view.zoom * this.dpr;
    let r = e > 0 ? a.find((l) => l > o * 1.001) : [...a].reverse().find((l) => l < o * 0.999);
    r && this.zoomAt(r / this.dpr, t, n, !0);
  }
  viewChanged() {
    (this.request(), k.emit("view:changed", h.doc));
  }
  toolEvent(e, t) {
    const n = this.overlay.getBoundingClientRect(),
      i = e.clientX - n.left,
      a = e.clientY - n.top,
      [o, r] = this.xf().screenToDoc(i, a),
      l = e;
    let c = t ?? (l.pointerType === "pen" ? ao(l.pressure) : 1);
    return (
      l.pointerType === "pen" && c === 0 && e.buttons && (c = 0.01),
      {
        x: o,
        y: r,
        sx: i,
        sy: a,
        pressure: c,
        tiltX: l.tiltX || 0,
        tiltY: l.tiltY || 0,
        twist: l.twist || 0,
        time: e.timeStamp,
        eraser: l.pointerType === "pen" && Os(l),
        button: e.button,
        shift: e.shiftKey,
        alt: e.altKey,
        ctrl: e.ctrlKey || e.metaKey,
        pointerType: l.pointerType || "mouse",
        raw: e,
      }
    );
  }
  overrideTool = null;
  setOverride(e) {
    ((this.overrideTool = e), this.updateCursor(), this.request());
  }
  activeTool() {
    return this.overrideTool ? this.overrideTool : (this.tempTool && h.tools.get(this.tempTool)) || h.tool;
  }
  bindInput() {
    const e = this.overlay;
    e.addEventListener("contextmenu", (a) => a.preventDefault());
    const t = new Il(
        (a, o) => {
          const r = h.doc;
          r &&
            ((r.view.zoom = o.zoom),
            (r.view.panX = o.panX),
            (r.view.panY = o.panY),
            (r.view.rotation = o.rot),
            a.scale !== 1 && this.zoomAt(o.zoom * a.scale, a.cx, a.cy, !0),
            a.rotate && (r.view.rotation = ((o.rot + a.rotate + 540) % 360) - 180),
            (r.view.panX += a.dx),
            (r.view.panY += a.dy),
            this.viewChanged());
        },
        () => {
          const a = h.doc.view;
          return { zoom: a.zoom, panX: a.panX, panY: a.panY, rot: a.rotation };
        },
      ),
      n = (a) => {
        const o = e.getBoundingClientRect();
        return [a.clientX - o.left, a.clientY - o.top];
      };
    (e.addEventListener("pointerdown", (a) => {
      if ((e.focus({ preventScroll: !0 }), _a(a), !h.doc)) return;
      const o = an();
      if (a.pointerType === "touch") {
        if (o.touch === "off" || (o.palmRejection && zl())) return;
        if (o.touch === "gestures" || t.active || this.dragging) {
          if (this.dragging?.kind === "tool" && this.dragging.tool) {
            try {
              this.dragging.tool.cancel?.();
            } catch {}
            this.dragging = null;
          }
          try {
            e.setPointerCapture(a.pointerId);
          } catch {}
          t.down(a.pointerId, ...n(a));
          return;
        }
      }
      if (this.dragging) return;
      if (a.pointerType === "pen" && a.button === 2) {
        if (o.barrel === "none") return;
        if (o.barrel === "pan") {
          try {
            e.setPointerCapture(a.pointerId);
          } catch {}
          ((this.dragging = {
            kind: "pan",
            id: a.pointerId,
            sx: a.clientX,
            sy: a.clientY,
            panX: h.doc.view.panX,
            panY: h.doc.view.panY,
          }),
            this.updateCursor());
          return;
        }
      }
      if (a.button === 1 || (a.button === 0 && h.spaceHeld)) {
        try {
          e.setPointerCapture(a.pointerId);
        } catch {}
        ((this.dragging = {
          kind: "pan",
          id: a.pointerId,
          sx: a.clientX,
          sy: a.clientY,
          panX: h.doc.view.panX,
          panY: h.doc.view.panY,
        }),
          this.updateCursor());
        return;
      }
      if (a.button !== 0 && a.button !== 2 && !(a.pointerType === "pen" && a.button === 5)) return;
      let r = this.activeTool();
      if (
        (!this.overrideTool &&
          a.altKey &&
          r &&
          r.brushCursor &&
          !["clone", "heal"].includes(r.id) &&
          (r = h.tools.get("eyedropper")),
        a.pointerType === "pen" && a.button === 2 && o.barrel === "eyedropper" && (r = h.tools.get("eyedropper")),
        !this.overrideTool && o.eraserEnd && Os(a) && ((r = h.tools.get("eraser")), (this.tempTool = "eraser")),
        !!r?.down)
      ) {
        try {
          e.setPointerCapture(a.pointerId);
        } catch {}
        this.dragging = { kind: "tool", id: a.pointerId, tool: r, sx: a.clientX, sy: a.clientY, panX: 0, panY: 0 };
        try {
          r.down(this.toolEvent(a));
        } catch (l) {
          (h.error(l), (this.dragging = null));
        }
        this.request();
      }
    }),
      e.addEventListener("pointermove", (a) => {
        if ((_a(a), a.pointerType === "touch" && t.pts.has(a.pointerId))) {
          t.move(a.pointerId, ...n(a));
          return;
        }
        if (a.pointerType === "pen" && !this.dragging) {
          const l = an().eraserEnd && Os(a);
          l !== (this.tempTool === "eraser") && ((this.tempTool = l ? "eraser" : null), this.updateCursor());
        }
        const o = this.dragging;
        if (o && o.id === a.pointerId) {
          if (o.kind === "pan") {
            ((h.doc.view.panX = o.panX + (a.clientX - o.sx)),
              (h.doc.view.panY = o.panY + (a.clientY - o.sy)),
              this.viewChanged());
            return;
          }
          const l = a.getCoalescedEvents ? a.getCoalescedEvents() : [a];
          try {
            for (const c of l.length ? l : [a]) o.tool.move?.(this.toolEvent(c));
          } catch (c) {
            h.error(c);
          }
          ((this.hover = this.toolEvent(a)),
            (this.cursorPos = [this.hover.x, this.hover.y]),
            k.emit("cursor", this.hover),
            this.request());
          return;
        }
        if (!h.doc) return;
        const r = this.toolEvent(a);
        ((this.hover = r),
          (this.cursorPos = [r.x, r.y]),
          this.activeTool()?.hover?.(r),
          this.updateCursor(r),
          k.emit("cursor", r),
          this.request());
      }));
    const i = (a) => {
      if (t.pts.has(a.pointerId)) {
        t.up(a.pointerId);
        return;
      }
      const o = this.dragging;
      if (!(!o || o.id !== a.pointerId)) {
        if (((this.dragging = null), this.tempTool === "eraser" && !Os(a) && (this.tempTool = null), o.kind === "tool"))
          try {
            o.tool.up?.(this.toolEvent(a, 0));
          } catch (r) {
            h.error(r);
          }
        (this.updateCursor(), this.request());
      }
    };
    (e.addEventListener("pointerup", i),
      e.addEventListener("pointercancel", i),
      e.addEventListener("pointerleave", () => {
        this.dragging ||
          ((this.hover = null),
          this.tempTool === "eraser" && (this.tempTool = null),
          this.request(),
          k.emit("cursor", null));
      }),
      e.addEventListener("dblclick", (a) => {
        h.doc && this.activeTool()?.dblclick?.(this.toolEvent(a));
      }),
      e.addEventListener(
        "wheel",
        (a) => {
          if ((a.preventDefault(), !h.doc)) return;
          const o = e.getBoundingClientRect(),
            r = a.clientX - o.left,
            l = a.clientY - o.top;
          if (a.ctrlKey || a.altKey || h.prefs.wheelZooms) {
            const u = Math.exp(-a.deltaY * (a.deltaMode === 1 ? 0.05 : 0.0018));
            this.zoomAt(u, r, l);
          } else {
            const u = a.deltaMode === 1 ? 20 : 1;
            (a.shiftKey
              ? (h.doc.view.panX -= (a.deltaY || a.deltaX) * u)
              : ((h.doc.view.panX -= a.deltaX * u), (h.doc.view.panY -= a.deltaY * u)),
              this.viewChanged());
          }
        },
        { passive: !1 },
      ));
  }
  key(e, t) {
    if (e.code === "Space" && !e.ctrlKey && !e.altKey)
      return (
        t && !h.spaceHeld && ((h.spaceHeld = !0), this.updateCursor()),
        t || ((h.spaceHeld = !1), this.updateCursor()),
        !0
      );
    if ((e.key === "Alt" || e.key === "Shift" || e.key === "Control") && this.hover) {
      const i = {
        ...this.hover,
        alt: t ? e.key === "Alt" || this.hover.alt : e.key === "Alt" ? !1 : this.hover.alt,
        shift: e.shiftKey,
        ctrl: e.ctrlKey,
      };
      this.updateCursor(i);
    }
    const n = this.dragging?.tool || this.activeTool();
    return n?.key && n.key(e, t) ? (this.request(), !0) : !1;
  }
  updateCursor(e) {
    const t = this.overlay;
    if (this.dragging?.kind === "pan") {
      t.style.cursor = "grabbing";
      return;
    }
    if (h.spaceHeld) {
      t.style.cursor = "grab";
      return;
    }
    const n = this.activeTool();
    if (!n) {
      t.style.cursor = "default";
      return;
    }
    const i = e || this.hover;
    if (i && i.alt && n.brushCursor && !["clone", "heal"].includes(n.id)) {
      t.style.cursor = "copy";
      return;
    }
    const a = (i && n.cursorFor?.(i)) || n.cursor || "crosshair";
    t.style.cursor = n.brushCursor ? "none" : a;
  }
  frame(e) {
    const t = h.doc,
      n = this.dragging?.tool || this.activeTool();
    if (t)
      try {
        n?.frame?.();
      } catch (E) {
        h.error(E);
      }
    const i = !!t?.selection && e - this.lastAnts > 90,
      a = !!t?.dirtyRect;
    if (!this.needs && !a && !i) return;
    ((this.needs = !1), g.tick++, i && (this.lastAnts = e));
    const o = g.gl,
      r = xd();
    if (!t) {
      (g.bindTarget(null),
        o.clearColor(r[0], r[1], r[2], 1),
        o.clear(o.COLOR_BUFFER_BIT),
        this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height));
      return;
    }
    try {
      Hh(t) && k.emit("composited", t);
    } catch (E) {
      console.error(E);
    }
    const l = t.view,
      c = (l.rotation * Math.PI) / 180,
      u = Math.cos(c),
      d = Math.sin(c),
      f = l.flip ? -1 : 1,
      m = this.cssW / 2 + l.panX,
      v = this.cssH / 2 + l.panY,
      y = l.zoom,
      b = this.dpr,
      x = (f * u) / (y * b),
      w = (f * d) / (y * b),
      _ = -d / (y * b),
      M = u / (y * b),
      T = t.width / 2 - (f * (u * m + d * v)) / y,
      C = t.height / 2 - (-d * m + u * v) / y,
      A = nn([x, w, T, _, M, C, 0, 0, 1]),
      F = nt(h.prefs.checker1) || [1, 1, 1],
      S = nt(h.prefs.checker2) || [0.8, 0.8, 0.8],
      P = (t.maskViewId && t.find(t.maskViewId)?.layer.mask) || null;
    (g.draw(g.program("view", Dh), null, {
      textures: { u_img: t.display, u_sel: t.selection, u_mask: P, u_lut3d: this.proof ? this.lut3d : null },
      uniforms: {
        u_screenToDoc: A,
        u_docSize: [t.width, t.height],
        u_canvasSize: [this.glCanvas.width, this.glCanvas.height],
        u_zoom: y * b,
        u_time: e / 1e3,
        u_hasSel: t.selection ? 1 : 0,
        u_quickMask: t.quickMask && t.selection ? 1 : 0,
        u_maskView: P ? 1 : 0,
        u_proof: this.proof && this.lut3d ? 1 : 0,
        u_gamutWarn: this.gamutWarning ? 1 : 0,
        u_pixelGrid: h.prefs.pixelGrid ? 1 : 0,
        u_pasteboard: r,
        u_check1: F,
        u_check2: S,
        u_checkSize: h.prefs.checkerSize * b,
      },
    }),
      this.drawOverlay(t, n),
      h.prefs.showRulers && this.drawRulers(t));
  }
  drawOverlay(e, t) {
    const n = this.octx;
    (n.setTransform(1, 0, 0, 1, 0, 0),
      n.clearRect(0, 0, this.overlay.width, this.overlay.height),
      n.setTransform(this.dpr, 0, 0, this.dpr, 0, 0));
    const i = this.xf(e),
      a = [
        [0, 0],
        [e.width, 0],
        [e.width, e.height],
        [0, e.height],
      ].map(([r, l]) => i.docToScreen(r, l));
    (n.beginPath(),
      a.forEach(([r, l], c) => (c ? n.lineTo(r, l) : n.moveTo(r, l))),
      n.closePath(),
      (n.strokeStyle = "rgba(0,0,0,0.6)"),
      (n.lineWidth = 1),
      n.stroke(),
      (n.strokeStyle = "rgba(80,220,255,0.85)"));
    for (const r of e.guides.horizontal) {
      const l = i.docToScreen(0, r),
        c = i.docToScreen(e.width, r);
      (n.beginPath(), n.moveTo(l[0], l[1]), n.lineTo(c[0], c[1]), n.stroke());
    }
    for (const r of e.guides.vertical) {
      const l = i.docToScreen(r, 0),
        c = i.docToScreen(r, e.height);
      (n.beginPath(), n.moveTo(l[0], l[1]), n.lineTo(c[0], c[1]), n.stroke());
    }
    try {
      t?.overlay?.(n, i);
    } catch (r) {
      console.error(r);
    }
    const o = this.hover;
    if (o && t?.brushCursor && !h.spaceHeld && !(o.alt && !["clone", "heal"].includes(t.id))) {
      const r = h.brushFor(t.id),
        l = (r.size / 2) * i.zoom;
      (n.save(),
        n.translate(o.sx, o.sy),
        (r.tip !== "round" || r.roundness < 1) &&
          n.rotate((-r.angle * Math.PI) / 180 + (e.view.rotation * Math.PI) / 180),
        n.scale(1, r.roundness || 1),
        n.beginPath(),
        r.tip === "square" ? n.rect(-l, -l, 2 * l, 2 * l) : n.arc(0, 0, Math.max(l, 0.5), 0, Math.PI * 2),
        n.restore(),
        (n.lineWidth = 2.2),
        (n.strokeStyle = "rgba(0,0,0,0.55)"),
        n.stroke(),
        (n.lineWidth = 1),
        (n.strokeStyle = "rgba(255,255,255,0.95)"),
        n.stroke(),
        l < 6 &&
          (n.beginPath(),
          n.moveTo(o.sx - 6, o.sy),
          n.lineTo(o.sx + 6, o.sy),
          n.moveTo(o.sx, o.sy - 6),
          n.lineTo(o.sx, o.sy + 6),
          (n.strokeStyle = "rgba(255,255,255,0.9)"),
          n.stroke()));
    }
  }
  drawRulers(e) {
    const t = this.xf(e),
      n = (i, a) => {
        const o = i.getContext("2d"),
          r = i.width / this.dpr,
          l = i.height / this.dpr;
        (o.setTransform(this.dpr, 0, 0, this.dpr, 0, 0),
          (o.fillStyle = we("--ruler")),
          o.fillRect(0, 0, r, l),
          (o.strokeStyle = we("--line2")),
          (o.fillStyle = we("--text3")),
          (o.font = "9px system-ui, sans-serif"),
          (o.lineWidth = 1));
        const c = t.zoom,
          d = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1e3, 2e3, 5e3, 1e4].find((w) => w * c >= 64) || 1e4,
          f = d / 10,
          m = a ? r : l,
          v = a ? t.screenToDoc(0, 0)[0] : t.screenToDoc(0, 0)[1],
          y = a ? t.screenToDoc(m, 0)[0] : t.screenToDoc(0, m)[1],
          b = Math.min(v, y),
          x = Math.max(v, y);
        o.beginPath();
        for (let w = Math.floor(b / f) * f; w <= x; w += f) {
          const _ = a ? t.docToScreen(w, 0)[0] : t.docToScreen(0, w)[1],
            M = Math.abs(w / d - Math.round(w / d)) < 1e-6,
            T = M ? 18 : Math.abs(w / (d / 2) - Math.round(w / (d / 2))) < 1e-6 ? 8 : 4;
          (a
            ? (o.moveTo(Math.round(_) + 0.5, l), o.lineTo(Math.round(_) + 0.5, l - T))
            : (o.moveTo(r, Math.round(_) + 0.5), o.lineTo(r - T, Math.round(_) + 0.5)),
            M &&
              (a
                ? o.fillText(String(Math.round(w)), _ + 3, 9)
                : (o.save(),
                  o.translate(9, _ + 3),
                  o.rotate(-Math.PI / 2),
                  o.fillText(String(Math.round(w)), 0, 0),
                  o.restore())));
        }
        if ((o.stroke(), this.cursorPos)) {
          const w = a
            ? t.docToScreen(this.cursorPos[0], this.cursorPos[1])[0]
            : t.docToScreen(this.cursorPos[0], this.cursorPos[1])[1];
          ((o.strokeStyle = we("--gold")),
            o.beginPath(),
            a ? (o.moveTo(w, 0), o.lineTo(w, l)) : (o.moveTo(0, w), o.lineTo(r, w)),
            o.stroke());
        }
      };
    (n(this.rulerTop, !0), n(this.rulerLeft, !1), this.spinner);
  }
  sample(e, t, n = 1, i = !1) {
    const a = h.doc;
    if (!a) return null;
    const o = Math.floor(n / 2),
      r = Math.floor(e) - o,
      l = Math.floor(t) - o;
    if (r + n <= 0 || l + n <= 0 || r >= a.width || l >= a.height) return null;
    const c = {
        x: Math.max(0, r),
        y: Math.max(0, l),
        w: Math.min(n, a.width - Math.max(0, r)),
        h: Math.min(n, a.height - Math.max(0, l)),
      },
      u = i && a.active?.tex ? a.active.tex : a.composite,
      d = g.read(u, c),
      f = [0, 0, 0, 0],
      m = c.w * c.h;
    for (let v = 0; v < m; v++) {
      const y = d[v * 4 + 3];
      ((f[0] += d[v * 4] * y), (f[1] += d[v * 4 + 1] * y), (f[2] += d[v * 4 + 2] * y), (f[3] += y));
    }
    return f[3] <= 0 ? [0, 0, 0, 0] : [f[0] / f[3], f[1] / f[3], f[2] / f[3], f[3] / m];
  }
  sampleInk(e, t, n = 1, i = !1) {
    const a = h.doc;
    if (!a || !a.ink) return null;
    const o = Math.floor(n / 2),
      r = Math.floor(e) - o,
      l = Math.floor(t) - o;
    if (r + n <= 0 || l + n <= 0 || r >= a.width || l >= a.height) return null;
    const c = {
        x: Math.max(0, r),
        y: Math.max(0, l),
        w: Math.min(n, a.width - Math.max(0, r)),
        h: Math.min(n, a.height - Math.max(0, l)),
      },
      u = i && a.active?.tex?.k ? a.active.tex : a.inkComposite;
    if (!u) return null;
    const d = g.readInk(u, c),
      f = [0, 0, 0, 0, 0],
      m = c.w * c.h;
    for (let v = 0; v < m; v++) {
      const y = d[v * 5 + 4];
      for (let b = 0; b < 4; b++) f[b] += d[v * 5 + b] * y;
      f[4] += y;
    }
    return f[4] <= 0 ? [0, 0, 0, 0, 0] : [f[0] / f[4], f[1] / f[4], f[2] / f[4], f[3] / f[4], f[4] / m];
  }
}
let L;
function Bl() {
  return ((L = new Ol()), L);
}
const kd = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        Viewport: Ol,
        createViewport: Bl,
        get viewport() {
          return L;
        },
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  Uo = {
    width: 300,
    groups: [
      { tabs: ["navigator", "histogram", "info"], active: "navigator", flex: 0.9 },
      { tabs: ["color", "swatches"], active: "color", flex: 1.05 },
      { tabs: ["properties", "brushes", "history"], active: "properties", flex: 1.25 },
      { tabs: ["layers", "channels", "paths"], active: "layers", flex: 2.2 },
    ],
  };
class $l {
  el;
  defs = new Map();
  bodies = new Map();
  layout;
  dragTab = null;
  constructor() {
    ((this.el = p("div", { class: "dock" })),
      (this.layout = JSON.parse(JSON.stringify(h.prefs.layout && h.prefs.layout.groups ? h.prefs.layout : Uo))));
  }
  register(e, t = 2) {
    this.defs.set(e.id, e);
    const n = this.layout.groups.some((a) => a.tabs.includes(e.id)),
      i = (h.prefs.layout?.hidden || []).includes(e.id);
    if (!n && !i) {
      const a = this.layout.groups[Math.min(t, this.layout.groups.length - 1)];
      a ? a.tabs.push(e.id) : this.layout.groups.push({ tabs: [e.id], active: e.id, flex: 1 });
    }
  }
  unregister(e) {
    (this.defs.delete(e), this.bodies.delete(e));
    for (const t of this.layout.groups)
      ((t.tabs = t.tabs.filter((n) => n !== e)), t.active === e && (t.active = t.tabs[0]));
    ((this.layout.groups = this.layout.groups.filter((t) => t.tabs.length)), this.render());
  }
  body(e) {
    let t = this.bodies.get(e);
    if (!t) {
      const n = this.defs.get(e);
      ((t = p("div", { class: "panel-body", "data-panel": e }, n.create())), this.bodies.set(e, t));
    }
    return t;
  }
  isVisible(e) {
    return this.layout.groups.some((t) => t.tabs.includes(e));
  }
  show(e) {
    let t = this.layout.groups.find((n) => n.tabs.includes(e));
    (t ||
      ((t = { tabs: [e], active: e, flex: 1 }),
      this.layout.groups.splice(Math.max(0, this.layout.groups.length - 1), 0, t)),
      (t.active = e),
      (t.collapsed = !1),
      this.render(),
      this.save());
  }
  toggle(e) {
    if (this.isVisible(e)) {
      for (const t of this.layout.groups)
        ((t.tabs = t.tabs.filter((n) => n !== e)), t.active === e && (t.active = t.tabs[0]));
      ((this.layout.groups = this.layout.groups.filter((t) => t.tabs.length)), this.render(), this.save());
    } else this.show(e);
  }
  reset() {
    this.layout = JSON.parse(JSON.stringify(Uo));
    for (const e of this.defs.keys()) !this.isVisible(e) && e.startsWith("ext:") && this.layout.groups[2].tabs.push(e);
    (this.render(), this.save());
  }
  allPanels() {
    return [...this.defs.values()];
  }
  save() {
    const e = [...this.defs.keys()].filter((t) => !this.isVisible(t));
    ((h.prefs.layout = { ...this.layout, hidden: e }), h.savePrefsSoon());
  }
  render() {
    ((this.el.innerHTML = ""), (this.el.style.width = this.layout.width + "px"));
    const e = p("div", { class: "dock-edge" });
    (e.addEventListener("pointerdown", (i) => {
      e.setPointerCapture(i.pointerId);
      const a = i.clientX,
        o = this.layout.width,
        r = (c) => {
          ((this.layout.width = Math.max(220, Math.min(640, o - (c.clientX - a)))),
            (this.el.style.width = this.layout.width + "px"));
        },
        l = () => {
          (e.removeEventListener("pointermove", r),
            e.removeEventListener("pointerup", l),
            this.save(),
            k.emit("layout:resized"));
        };
      (e.addEventListener("pointermove", r), e.addEventListener("pointerup", l));
    }),
      this.el.appendChild(e));
    const t = p("div", { class: "dock-col" });
    (this.el.appendChild(t),
      (this.layout.groups = this.layout.groups.filter((i) => i.tabs.some((a) => this.defs.has(a)))),
      this.layout.groups.forEach((i, a) => {
        ((i.tabs = i.tabs.filter((c) => this.defs.has(c))),
          i.tabs.includes(i.active) || (i.active = i.tabs[0]),
          a > 0 && t.appendChild(this.splitter(a)));
        const o = p("div", { class: "tabbar" });
        for (const c of i.tabs) {
          const u = this.defs.get(c),
            d = p("div", { class: "tab" + (c === i.active ? " on" : ""), draggable: !0, title: u.title }, u.title);
          (d.addEventListener("click", () => {
            (i.active === c ? (i.collapsed = !i.collapsed) : ((i.active = c), (i.collapsed = !1)),
              this.render(),
              this.save());
          }),
            d.addEventListener("dragstart", (f) => {
              ((this.dragTab = c),
                f.dataTransfer.setData("text/x-brushboard-panel", c),
                (f.dataTransfer.effectAllowed = "move"));
            }),
            d.addEventListener("dragend", () => {
              ((this.dragTab = null),
                this.el.querySelectorAll(".drop-hl").forEach((f) => f.classList.remove("drop-hl")));
            }),
            o.appendChild(d));
        }
        const r = p("button", { class: "tab-menu", title: "Panel menu", html: R.dots });
        (r.addEventListener("click", (c) => {
          const d = [
            ...(this.defs.get(i.active)?.menu?.() || []),
            { label: "Close Panel", run: () => this.toggle(i.active) },
            {
              label: i.collapsed ? "Expand Group" : "Collapse Group",
              run: () => {
                ((i.collapsed = !i.collapsed), this.render(), this.save());
              },
            },
          ];
          re(
            async () => {
              const { contextMenu: f } = await Promise.resolve().then(() => Sd);
              return { contextMenu: f };
            },
            void 0,
            import.meta.url,
          ).then(({ contextMenu: f }) =>
            f(
              c,
              d.map((m) => ({ label: m.label, run: m.run })),
            ),
          );
        }),
          o.appendChild(p("span", { class: "tab-spacer" })),
          o.appendChild(r),
          o.addEventListener("dragover", (c) => {
            this.dragTab && (c.preventDefault(), o.classList.add("drop-hl"));
          }),
          o.addEventListener("dragleave", () => o.classList.remove("drop-hl")),
          o.addEventListener("drop", (c) => {
            c.preventDefault();
            const u = this.dragTab;
            u && this.moveTab(u, a, null);
          }));
        const l = p(
          "div",
          {
            class: "pgroup" + (i.collapsed ? " collapsed" : ""),
            style: { flex: i.collapsed ? "0 0 auto" : `${i.flex} 1 0px` },
          },
          o,
        );
        (i.collapsed || l.appendChild(this.body(i.active)),
          t.appendChild(l),
          i.collapsed || setTimeout(() => this.defs.get(i.active)?.onShow?.()));
      }));
    const n = p("div", { class: "dock-tail" }, "Drop a panel tab here to create a new group");
    (n.addEventListener("dragover", (i) => {
      this.dragTab && (i.preventDefault(), n.classList.add("drop-hl"));
    }),
      n.addEventListener("dragleave", () => n.classList.remove("drop-hl")),
      n.addEventListener("drop", (i) => {
        i.preventDefault();
        const a = this.dragTab;
        a && this.moveTab(a, -1, null);
      }),
      t.appendChild(n));
  }
  moveTab(e, t, n) {
    for (const a of this.layout.groups)
      ((a.tabs = a.tabs.filter((o) => o !== e)), a.active === e && (a.active = a.tabs[0]));
    let i;
    (t < 0 || !this.layout.groups[t]
      ? ((i = { tabs: [], active: e, flex: 1 }), this.layout.groups.push(i))
      : (i = this.layout.groups[t]),
      i.tabs.push(e),
      (i.active = e),
      (i.collapsed = !1),
      (this.layout.groups = this.layout.groups.filter((a) => a.tabs.length)),
      (this.dragTab = null),
      this.render(),
      this.save());
  }
  splitter(e) {
    const t = p("div", { class: "vsplit" });
    return (
      t.addEventListener("pointerdown", (n) => {
        t.setPointerCapture(n.pointerId);
        const i = this.layout.groups[e - 1],
          a = this.layout.groups[e],
          o = t.parentElement.querySelectorAll(".pgroup"),
          r = o[e - 1],
          l = o[e],
          c = r.getBoundingClientRect().height,
          u = l.getBoundingClientRect().height,
          d = i.flex + a.flex,
          f = n.clientY,
          m = (y) => {
            const b = y.clientY - f,
              x = Math.max(60, c + b),
              w = Math.max(60, u - b);
            ((i.flex = (d * x) / (x + w)),
              (a.flex = d - i.flex),
              (r.style.flex = `${i.flex} 1 0px`),
              (l.style.flex = `${a.flex} 1 0px`));
          },
          v = () => {
            (t.removeEventListener("pointermove", m), t.removeEventListener("pointerup", v), this.save());
          };
        (t.addEventListener("pointermove", m), t.addEventListener("pointerup", v));
      }),
      t
    );
  }
}
let de;
function ql() {
  return ((de = new $l()), de);
}
const _d = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      Dock: $l,
      createDock: ql,
      get dock() {
        return de;
      },
      icon: Ks,
    },
    Symbol.toStringTag,
    { value: "Module" },
  ),
);
let ft = null,
  Xn = null;
function mt() {
  (ft?.remove(),
    (ft = null),
    document.querySelectorAll(".menubar .mtop.open").forEach((s) => s.classList.remove("open")),
    (Xn = null));
}
function Nl() {
  return !!ft;
}
function Md(s) {
  return s ? s.split("|")[0].replace(/\+/g, "+") : "";
}
function oo(s, e = 0) {
  const t = p("div", { class: "menu" });
  for (const n of s) {
    if (n === "-") {
      t.appendChild(p("div", { class: "msep" }));
      continue;
    }
    const i = n.cmd ? h.commands.get(n.cmd) : null,
      a = n.enabled ? n.enabled() : i?.enabled ? i.enabled() : !0,
      o = n.checked ? n.checked() : i?.checked ? i.checked() : void 0,
      r = n.shortcut ?? i?.shortcut,
      l = p(
        "div",
        { class: "mitem" + (a ? "" : " disabled") + (n.submenu ? " has-sub" : "") },
        p("span", { class: "mcheck" }, o ? "✓" : ""),
        p("span", { class: "mlabel" }, n.label),
        p("span", { class: "mkey" }, n.submenu ? "›" : Md(r)),
      );
    if (n.submenu) {
      let c = null;
      l.addEventListener("mouseenter", () => {
        t.querySelectorAll(":scope > .mitem > .menu").forEach((f) => f.remove());
        const u = typeof n.submenu == "function" ? n.submenu() : n.submenu;
        ((c = oo(u, e + 1)), c.classList.add("submenu"), l.appendChild(c));
        const d = c.getBoundingClientRect();
        (d.right > window.innerWidth && ((c.style.left = "auto"), (c.style.right = "100%")),
          d.bottom > window.innerHeight &&
            (c.style.top = Math.max(-d.top + 4, window.innerHeight - d.bottom - 4) + "px"));
      });
    } else
      (l.addEventListener("mouseenter", () => t.querySelectorAll(":scope > .mitem > .menu").forEach((c) => c.remove())),
        l.addEventListener("click", (c) => {
          if ((c.stopPropagation(), !!a))
            if ((mt(), n.run))
              try {
                n.run();
              } catch (u) {
                h.error(u);
              }
            else n.cmd && h.run(n.cmd);
        }));
    t.appendChild(l);
  }
  return t;
}
function jl(s, e, t) {
  ((s.style.left = e + "px"), (s.style.top = t + "px"), document.body.appendChild(s));
  const n = s.getBoundingClientRect();
  (n.right > window.innerWidth - 4 && (s.style.left = Math.max(4, window.innerWidth - n.width - 4) + "px"),
    n.bottom > window.innerHeight - 4 && (s.style.top = Math.max(4, window.innerHeight - n.height - 4) + "px"));
}
function Ft(s, e) {
  (s.preventDefault(), mt());
  const t = oo(e);
  (t.classList.add("root", "context"), jl(t, s.clientX, s.clientY), (ft = t));
}
function Gl(s) {
  const e = p("div", { class: "menubar" }),
    t = (n, i) => {
      (mt(), n.classList.add("open"));
      const a = n.getBoundingClientRect(),
        o = oo(i.items());
      (o.classList.add("root"), jl(o, a.left, a.bottom), (ft = o), (Xn = n));
    };
  for (const n of s) {
    const i = p("div", { class: "mtop" }, n.label);
    (i.addEventListener("mousedown", (a) => {
      (a.stopPropagation(), Xn === i ? mt() : t(i, n));
    }),
      i.addEventListener("mouseenter", () => {
        ft && Xn !== i && t(i, n);
      }),
      e.appendChild(i));
  }
  return (
    document.addEventListener("mousedown", (n) => {
      ft && !ft.contains(n.target) && mt();
    }),
    window.addEventListener("blur", mt),
    e
  );
}
const Sd = Object.freeze(
    Object.defineProperty(
      { __proto__: null, closeMenus: mt, contextMenu: Ft, menubar: Gl, menusOpen: Nl },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  Wl = ["help.about", "-", "edit.prefs", "edit.aiAccel", "edit.tablet", "-", "file.quit"],
  Td = new Set(Wl.filter((s) => s !== "-"));
let xi = null,
  Ul = new Map(),
  Ho = "",
  Sa = null;
function Pd(s) {
  const e = s.cmd ? h.commands.get(s.cmd) : null;
  let t = !0,
    n;
  try {
    t = s.enabled ? s.enabled() : e?.enabled ? e.enabled() : !0;
  } catch {
    t = !1;
  }
  try {
    n = s.checked ? s.checked() : e?.checked ? e.checked() : void 0;
  } catch {
    n = void 0;
  }
  return { cmd: e, enabled: t, checked: n, shortcut: s.shortcut ?? e?.shortcut };
}
function ro(s) {
  const e = [];
  for (const t of s) (t.sep && (!e.length || e[e.length - 1].sep)) || e.push(t);
  for (; e.length && e[e.length - 1].sep;) e.pop();
  return e;
}
function Hl(s, e, t, n = 0) {
  const i = [];
  return (
    s.forEach((a, o) => {
      if (a === "-") {
        i.push({ sep: !0 });
        return;
      }
      if (a.cmd && Td.has(a.cmd) && n === 0) return;
      const r = `${e}.${o}`;
      if (a.submenu) {
        let u = [];
        try {
          u = typeof a.submenu == "function" ? a.submenu() : a.submenu;
        } catch (d) {
          console.error(d);
        }
        i.push({ id: r, label: a.label, items: ro(Hl(u, r, t, n + 1)) });
        return;
      }
      const l = Pd(a),
        c = a.run ? a.run : a.cmd ? () => h.run(a.cmd) : null;
      (c && t.set(r, c),
        i.push({
          id: r,
          label: a.label,
          accel: l.shortcut,
          enabled: l.enabled && !!c,
          ...(l.checked !== void 0 ? { checked: !!l.checked } : {}),
        }));
    }),
    i
  );
}
function Cd(s) {
  const e = [];
  for (const t of Wl) {
    if (t === "-") {
      e.push({ sep: !0 });
      continue;
    }
    const n = h.commands.get(t);
    if (!n) continue;
    const i = t === "file.quit" ? "Quit BrushBoard" : t === "help.about" ? "About BrushBoard" : n.label,
      a = "app." + t;
    s.set(a, () => h.run(t));
    let o = !0;
    try {
      o = n.enabled ? n.enabled() : !0;
    } catch {
      o = !1;
    }
    e.push({ id: a, label: i, accel: n.shortcut, enabled: o });
  }
  return { id: "app", label: "BrushBoard", items: ro(e) };
}
function Vl() {
  Sa = null;
  let s;
  if (!xi) return;
  try {
    s = xi();
  } catch (i) {
    console.error(i);
    return;
  }
  const e = new Map(),
    t = [Cd(e)];
  (s.forEach((i, a) => {
    let o = [];
    try {
      o = i.items();
    } catch (r) {
      console.error(r);
    }
    t.push({ id: `m${a}`, label: i.label, items: ro(Hl(o, `m${a}`, e)) });
  }),
    (Ul = e));
  const n = JSON.stringify(t);
  n !== Ho && ((Ho = n), window.brushboard.pal.setMenu(t, String(n.length) + ":" + Ed(n)));
}
function Ed(s) {
  let e = 0;
  for (let t = 0; t < s.length; t++) e = (e * 31 + s.charCodeAt(t)) | 0;
  return (e >>> 0).toString(36);
}
function In() {
  !xi || Sa || (Sa = setTimeout(Vl, 120));
}
function Ld(s) {
  ((xi = s),
    window.brushboard.pal.onMenuClick((e) => {
      const t = Ul.get(e);
      if (t) {
        try {
          t();
        } catch (n) {
          h.error(n);
        }
        In();
      }
    }));
  for (const e of [
    "doc:active",
    "doc:history",
    "docs:changed",
    "doc:layers",
    "doc:mode",
    "doc:selection",
    "doc:channels",
    "doc:resized",
    "tool:changed",
    "extensions:changed",
    "python:status",
    "ai:status",
    "recent:changed",
    "settings:changed",
    "layout:resized",
  ])
    k.on(e, In);
  (setInterval(() => {
    document.hasFocus() && In();
  }, 1e3),
    window.addEventListener("focus", In),
    Vl());
}
let Yn = 0;
function Ta() {
  return Yn > 0;
}
class Y {
  el;
  box;
  body;
  footer;
  resolve;
  promise;
  onOk = null;
  onCancel = null;
  closed = !1;
  constructor(e, t = {}) {
    ((this.body = p("div", { class: "dlg-body" })), (this.footer = p("div", { class: "dlg-footer" })));
    const n = p(
      "div",
      { class: "dlg-head" },
      p("span", { class: "dlg-title" }, e),
      p("button", { class: "dlg-x", title: "Close", onclick: () => this.cancel() }, "×"),
    );
    ((this.box = p(
      "div",
      { class: "dialog " + (t.cls || ""), style: { width: (t.width || 420) + "px" } },
      n,
      this.body,
      this.footer,
    )),
      (this.el = p("div", { class: "dialog-backdrop" + (t.modal === !1 ? " modeless" : "") }, this.box)),
      (this.promise = new Promise((i) => (this.resolve = i))),
      t.cancel !== null &&
        this.footer.appendChild(p("button", { class: "btn", onclick: () => this.cancel() }, t.cancel || "Cancel")),
      t.ok !== null &&
        this.footer.appendChild(p("button", { class: "btn primary", onclick: () => this.ok() }, t.ok || "OK")),
      n.addEventListener("pointerdown", (i) => {
        if (i.target.closest("button")) return;
        const a = this.box.getBoundingClientRect(),
          o = i.clientX - a.left,
          r = i.clientY - a.top;
        n.setPointerCapture(i.pointerId);
        const l = (u) => {
            ((this.box.style.position = "fixed"),
              (this.box.style.margin = "0"),
              (this.box.style.left = u.clientX - o + "px"),
              (this.box.style.top = u.clientY - r + "px"));
          },
          c = () => {
            (n.removeEventListener("pointermove", l), n.removeEventListener("pointerup", c));
          };
        (n.addEventListener("pointermove", l), n.addEventListener("pointerup", c));
      }),
      this.el.addEventListener("keydown", (i) => {
        i.key === "Escape"
          ? (i.preventDefault(), i.stopPropagation(), this.cancel())
          : i.key === "Enter" && !(i.target instanceof HTMLTextAreaElement) && !(i.target instanceof HTMLButtonElement)
            ? (i.preventDefault(), i.stopPropagation(), this.ok())
            : i.stopPropagation();
      }),
      this.el.addEventListener("keyup", (i) => i.stopPropagation()));
  }
  show() {
    return (
      document.body.appendChild(this.el),
      Yn++,
      requestAnimationFrame(() => {
        ((
          this.body.querySelector("input:not([type=range]):not([type=checkbox]), select, textarea, button") || this.box
        ).focus?.(),
          (this.box.tabIndex = -1));
      }),
      this.promise
    );
  }
  async ok() {
    try {
      const e = this.onOk ? await this.onOk() : !0;
      if (e === null) return;
      this.close(e);
    } catch (e) {
      me("Error", e?.message || String(e));
    }
  }
  cancel() {
    (this.onCancel?.(), this.close(null));
  }
  close(e) {
    this.closed || ((this.closed = !0), this.el.remove(), (Yn = Math.max(0, Yn - 1)), this.resolve(e));
  }
}
function ps(s, e, t = "") {
  const n = new Y(s, { width: 360 }),
    i = p("input", { type: "text", class: "text", value: t });
  return (
    n.body.append(p("label", { class: "field" }, p("span", null, e), i)),
    (n.onOk = () => i.value.trim() || null),
    setTimeout(() => {
      (i.focus(), i.select());
    }, 30),
    n.show()
  );
}
async function qi(s, e, t = ["Cancel", "OK"]) {
  const n = new Y(s, { width: 400, ok: null, cancel: null });
  (n.body.append(p("p", { class: "msg" }, e)),
    t.forEach((a, o) =>
      n.footer.appendChild(
        p("button", { class: "btn" + (o === t.length - 1 ? " primary" : ""), onclick: () => n.close(o) }, a),
      ),
    ),
    (n.onOk = () => t.length - 1));
  const i = await n.show();
  return i === null ? 0 : i;
}
function lo(s) {
  const e = s.indexOf(`
@@TRACEBACK@@
`);
  return e < 0 ? [s, void 0] : [s.slice(0, e), s.slice(e + 15)];
}
function me(s, e, t) {
  const [n, i] = lo(e);
  ((e = n), (t = t || i));
  const a = new Y(s, { width: t ? 620 : 460, cancel: null });
  return (a.body.append(p("p", { class: "msg" }, e)), t && a.body.append(p("pre", { class: "detail" }, t)), a.show());
}
function Xl(s, e, t) {
  const n = p("div", { class: "param-form" });
  for (const i of s) {
    const a = (r) => {
      ((e[i.id] = r), t(e));
    };
    let o;
    switch (i.type) {
      case "float":
      case "int":
      case "angle": {
        const r = Number.isFinite(i.min) && Number.isFinite(i.max) && i.max - i.min <= 5e3,
          l = i.step ?? (i.type === "float" ? 0.1 : 1);
        o = r
          ? Q({ label: i.label, value: e[i.id], min: i.min, max: i.max, step: l, unit: i.unit, onInput: a })
          : p(
              "div",
              { class: "form-row" },
              p("span", { class: "sf-label" }, i.label),
              q({ value: e[i.id], min: i.min, max: i.max, step: l, unit: i.unit, width: 70, onInput: a }),
            );
        break;
      }
      case "bool":
        o = p("div", { class: "form-row" }, $(i.label, !!e[i.id], a));
        break;
      case "choice":
        o = p(
          "div",
          { class: "form-row" },
          p("span", { class: "sf-label" }, i.label),
          O(
            (i.choices || []).map((r) => ({ value: r.value, label: r.label })),
            e[i.id],
            a,
          ),
        );
        break;
      case "color": {
        const r = p("input", { type: "color", value: qe(e[i.id] || [0, 0, 0]) });
        (r.addEventListener("input", () => {
          const l = r.value;
          a([parseInt(l.slice(1, 3), 16) / 255, parseInt(l.slice(3, 5), 16) / 255, parseInt(l.slice(5, 7), 16) / 255]);
        }),
          (o = p("div", { class: "form-row" }, p("span", { class: "sf-label" }, i.label), r)));
        break;
      }
      case "text":
      default: {
        const r = p("input", { type: "text", class: "text", value: e[i.id] ?? "" });
        (r.addEventListener("input", () => a(r.value)),
          (o = p("div", { class: "form-row" }, p("span", { class: "sf-label" }, i.label), r)));
      }
    }
    n.appendChild(o);
  }
  return n;
}
const Yl = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      Dialog: Y,
      alertMsg: me,
      confirmDlg: qi,
      dialogOpen: Ta,
      paramForm: Xl,
      promptText: ps,
      splitTraceback: lo,
    },
    Symbol.toStringTag,
    { value: "Module" },
  ),
);
function ye(s, e, t, n = [0, 0, 0, 0], i = {}) {
  g.draw(g.program("filter", Sh), e, {
    inkUniforms: i.colors ? ["u_p1", "u_p2"] : void 0,
    textures: { u_src: s, u_aux: i.aux || null },
    uniforms: { u_kind: t, u_p0: n, u_p1: i.p1 || [0, 0, 0, 0], u_p2: i.p2 || [0, 0, 0, 0], u_size: [s.w, s.h] },
  });
}
const Ad = (s) => ({ x: 0, y: 0, w: s.w, h: s.h });
function Ut(s, e, t, n = !1) {
  if (t < 0.05) {
    g.copy(s, e);
    return;
  }
  const i = It(s, Math.min(t, 300), Ad(s), { box: n });
  (g.copy(i, e), g.release(i));
}
function Vo(s, e, t, n) {
  const i = g.program("minmax", yh),
    a = g.acquireLike(e, e.format);
  (g.draw(i, a, { textures: { u_src: s }, uniforms: { u_dir: [1, 0], u_radius: t, u_max: n ? 1 : 0 } }),
    g.draw(i, e, { textures: { u_src: a }, uniforms: { u_dir: [0, 1], u_radius: t, u_max: n ? 1 : 0 } }),
    g.release(a));
}
const sa = (s) => (s * Math.PI) / 180,
  Cn = [
    {
      id: "gaussianBlur",
      name: "Gaussian Blur…",
      category: "Blur",
      params: [{ id: "radius", label: "Radius", type: "float", min: 0.1, max: 250, step: 0.1, default: 4, unit: "px" }],
      run: (s, e, t) => Ut(s, e, t.radius),
    },
    {
      id: "boxBlur",
      name: "Box Blur…",
      category: "Blur",
      params: [{ id: "radius", label: "Radius", type: "int", min: 1, max: 500, default: 6, unit: "px" }],
      run: (s, e, t) => Ut(s, e, t.radius, !0),
    },
    {
      id: "motionBlur",
      name: "Motion Blur…",
      category: "Blur",
      heavy: !0,
      params: [
        { id: "angle", label: "Angle", type: "angle", min: -180, max: 180, default: 0, unit: "°" },
        { id: "distance", label: "Distance", type: "int", min: 1, max: 400, default: 20, unit: "px" },
      ],
      run: (s, e, t) => ye(s, e, 13, [sa(-t.angle), t.distance, 0, 0]),
    },
    {
      id: "radialBlur",
      name: "Radial Blur…",
      category: "Blur",
      heavy: !0,
      params: [
        { id: "amount", label: "Amount", type: "float", min: 0, max: 1, step: 0.01, default: 0.25 },
        {
          id: "method",
          label: "Method",
          type: "choice",
          default: 0,
          choices: [
            { value: 0, label: "Zoom" },
            { value: 1, label: "Spin" },
          ],
        },
        { id: "cx", label: "Center X", type: "float", min: 0, max: 1, step: 0.01, default: 0.5 },
        { id: "cy", label: "Center Y", type: "float", min: 0, max: 1, step: 0.01, default: 0.5 },
      ],
      run: (s, e, t) => ye(s, e, 14, [t.amount, t.cx, t.cy, Number(t.method)]),
    },
    {
      id: "unsharpMask",
      name: "Unsharp Mask…",
      category: "Sharpen",
      params: [
        { id: "amount", label: "Amount", type: "int", min: 1, max: 500, default: 100, unit: "%" },
        { id: "radius", label: "Radius", type: "float", min: 0.1, max: 100, step: 0.1, default: 1.5, unit: "px" },
        { id: "threshold", label: "Threshold", type: "int", min: 0, max: 255, default: 0, unit: "levels" },
      ],
      run: (s, e, t) => {
        const n = g.acquireLike(e, e.format);
        (Ut(s, n, t.radius), ye(s, e, 1, [t.amount / 100, t.threshold / 255, 0, 0], { aux: n }), g.release(n));
      },
    },
    {
      id: "sharpen",
      name: "Sharpen",
      category: "Sharpen",
      params: [],
      run: (s, e) => {
        const t = g.acquireLike(e, e.format);
        (Ut(s, t, 1), ye(s, e, 1, [0.6, 0, 0, 0], { aux: t }), g.release(t));
      },
    },
    {
      id: "highPass",
      name: "High Pass…",
      category: "Other",
      params: [
        { id: "radius", label: "Radius", type: "float", min: 0.1, max: 250, step: 0.1, default: 10, unit: "px" },
      ],
      run: (s, e, t) => {
        const n = g.acquireLike(e, e.format);
        (Ut(s, n, t.radius), ye(s, e, 2, [0, 0, 0, 0], { aux: n }), g.release(n));
      },
    },
    {
      id: "addNoise",
      name: "Add Noise…",
      category: "Noise",
      params: [
        { id: "amount", label: "Amount", type: "float", min: 0, max: 100, step: 0.5, default: 10, unit: "%" },
        {
          id: "dist",
          label: "Distribution",
          type: "choice",
          default: 1,
          choices: [
            { value: 0, label: "Uniform" },
            { value: 1, label: "Gaussian" },
          ],
        },
        { id: "mono", label: "Monochromatic", type: "bool", default: !1 },
        { id: "seed", label: "Seed", type: "int", min: 0, max: 9999, default: 1 },
      ],
      run: (s, e, t) => ye(s, e, 3, [(t.amount / 100) * 0.9, Number(t.dist), t.mono ? 1 : 0, t.seed]),
    },
    {
      id: "mosaic",
      name: "Mosaic…",
      category: "Pixelate",
      params: [{ id: "cell", label: "Cell Size", type: "int", min: 2, max: 200, default: 12, unit: "px" }],
      run: (s, e, t) => ye(s, e, 4, [t.cell, 0, 0, 0]),
    },
    {
      id: "emboss",
      name: "Emboss…",
      category: "Stylize",
      params: [
        { id: "angle", label: "Angle", type: "angle", min: -180, max: 180, default: 135, unit: "°" },
        { id: "height", label: "Height", type: "int", min: 1, max: 10, default: 3, unit: "px" },
        { id: "amount", label: "Amount", type: "int", min: 1, max: 500, default: 100, unit: "%" },
      ],
      run: (s, e, t) => ye(s, e, 5, [sa(-t.angle), t.height, (t.amount / 100) * 2, 0]),
    },
    { id: "findEdges", name: "Find Edges", category: "Stylize", params: [], run: (s, e) => ye(s, e, 6) },
    { id: "solarize", name: "Solarize", category: "Stylize", params: [], run: (s, e) => ye(s, e, 7) },
    {
      id: "twirl",
      name: "Twirl…",
      category: "Distort",
      params: [{ id: "angle", label: "Angle", type: "angle", min: -999, max: 999, default: 50, unit: "°" }],
      run: (s, e, t) => ye(s, e, 8, [sa(t.angle), Math.min(s.w, s.h) / 2, 0, 0]),
    },
    {
      id: "pinch",
      name: "Pinch…",
      category: "Distort",
      params: [{ id: "amount", label: "Amount", type: "int", min: -100, max: 100, default: 50, unit: "%" }],
      run: (s, e, t) => ye(s, e, 9, [t.amount / 100, Math.min(s.w, s.h) / 2, 0, 0]),
    },
    {
      id: "wave",
      name: "Wave…",
      category: "Distort",
      params: [
        { id: "amplitude", label: "Amplitude", type: "float", min: 0, max: 200, default: 10, unit: "px" },
        { id: "wavelength", label: "Wavelength", type: "float", min: 2, max: 2e3, default: 120, unit: "px" },
        {
          id: "axis",
          label: "Direction",
          type: "choice",
          default: 0,
          choices: [
            { value: 0, label: "Both" },
            { value: 1, label: "Horizontal" },
            { value: 2, label: "Vertical" },
          ],
        },
      ],
      run: (s, e, t) => ye(s, e, 10, [t.amplitude, t.wavelength, Number(t.axis), 0]),
    },
    {
      id: "polar",
      name: "Polar Coordinates…",
      category: "Distort",
      params: [
        {
          id: "mode",
          label: "Mode",
          type: "choice",
          default: 0,
          choices: [
            { value: 0, label: "Rectangular to Polar" },
            { value: 1, label: "Polar to Rectangular" },
          ],
        },
      ],
      run: (s, e, t) => ye(s, e, 17, [Number(t.mode), 0, 0, 0]),
    },
    {
      id: "clouds",
      name: "Clouds",
      category: "Render",
      params: [
        { id: "scale", label: "Scale", type: "float", min: 4, max: 2e3, default: 256, unit: "px" },
        { id: "seed", label: "Seed", type: "int", min: 0, max: 9999, default: 7 },
      ],
      run: (s, e, t, n) => ye(s, e, 11, [t.scale, t.seed, 0, 0], { p1: [...n.fg, 1], p2: [...n.bg, 1], colors: !0 }),
    },
    {
      id: "offset",
      name: "Offset…",
      category: "Other",
      params: [
        { id: "dx", label: "Horizontal", type: "int", min: -3e4, max: 3e4, default: 0, unit: "px" },
        { id: "dy", label: "Vertical", type: "int", min: -3e4, max: 3e4, default: 0, unit: "px" },
        { id: "wrap", label: "Wrap Around", type: "bool", default: !0 },
      ],
      run: (s, e, t) => ye(s, e, 12, [t.dx, t.dy, t.wrap ? 1 : 0, 0]),
    },
    {
      id: "minimum",
      name: "Minimum…",
      category: "Other",
      params: [{ id: "radius", label: "Radius", type: "int", min: 1, max: 200, default: 2, unit: "px" }],
      run: (s, e, t) => Vo(s, e, t.radius, !1),
    },
    {
      id: "maximum",
      name: "Maximum…",
      category: "Other",
      params: [{ id: "radius", label: "Radius", type: "int", min: 1, max: 200, default: 2, unit: "px" }],
      run: (s, e, t) => Vo(s, e, t.radius, !0),
    },
    {
      id: "shadowsHighlights",
      name: "Shadows/Highlights…",
      category: "Adjust",
      params: [
        { id: "shadows", label: "Shadows", type: "int", min: 0, max: 100, default: 35, unit: "%" },
        { id: "highlights", label: "Highlights", type: "int", min: 0, max: 100, default: 0, unit: "%" },
        { id: "radius", label: "Radius", type: "float", min: 1, max: 200, default: 30, unit: "px" },
      ],
      run: (s, e, t) => {
        const n = g.acquireLike(e, e.format);
        (Ut(s, n, t.radius), ye(s, e, 15, [t.shadows / 100, t.highlights / 100, 0, 0], { aux: n }), g.release(n));
      },
    },
  ],
  Rd = ["Blur", "Distort", "Noise", "Pixelate", "Render", "Sharpen", "Stylize", "Other"];
function Fd(s) {
  const e = {};
  for (const t of s) e[t.id] = t.default;
  return e;
}
function Ni(s, e = 512) {
  const t = Math.min(1, e / Math.max(s.w, s.h)),
    n = Math.max(1, Math.round(s.w * t)),
    i = Math.max(1, Math.round(s.h * t)),
    a = g.acquire(n, i, "rgba8");
  g.draw(g.program("thumb", Fi), a, {
    textures: { u_src: s },
    uniforms: { u_srcSize: [s.w, s.h], u_dstSize: [n, i], u_gray: 0 },
  });
  const o = g.read8(a);
  g.release(a);
  const r = new Uint32Array(256),
    l = new Uint32Array(256),
    c = new Uint32Array(256),
    u = new Uint32Array(256);
  for (let f = 0; f < o.length; f += 4)
    o[f + 3] < 8 ||
      (r[o[f]]++, l[o[f + 1]]++, c[o[f + 2]]++, u[Math.round(0.299 * o[f] + 0.587 * o[f + 1] + 0.114 * o[f + 2])]++);
  let d = 1;
  for (const f of [r, l, c, u]) for (let m = 1; m < 255; m++) d = Math.max(d, f[m]);
  return { r, g: l, b: c, l: u, max: d };
}
function Kl(s, e, t, n, i, a) {
  ((s.fillStyle = a), s.beginPath(), s.moveTo(0, i));
  for (let o = 0; o < 256; o++) {
    const r = Math.min(1, Math.sqrt(e[o] / t));
    s.lineTo((o / 255) * n, i - r * i);
  }
  (s.lineTo(n, i), s.closePath(), s.fill());
}
const Jl = [
  { value: "rgb", label: "RGB" },
  { value: "r", label: "Red" },
  { value: "g", label: "Green" },
  { value: "b", label: "Blue" },
];
function Dd(s, e, t) {
  let n = "rgb";
  const a = p("canvas", { class: "curves", width: 512, height: 512 }),
    o = a.getContext("2d"),
    r = p("div", { class: "curve-io" });
  let l = -1;
  const c = () => s[n],
    u = () => {
      (o.setTransform(2, 0, 0, 2, 0, 0),
        o.clearRect(0, 0, 256, 256),
        (o.fillStyle = we("--bg0")),
        o.fillRect(0, 0, 256, 256),
        e && Kl(o, n === "rgb" ? e.l : e[n], e.max, 256, 256, we("--hist-soft")),
        (o.strokeStyle = we("--grid-line")),
        (o.lineWidth = 1));
      for (let x = 1; x < 4; x++)
        (o.beginPath(),
          o.moveTo((x * 256) / 4, 0),
          o.lineTo((x * 256) / 4, 256),
          o.moveTo(0, (x * 256) / 4),
          o.lineTo(256, (x * 256) / 4),
          o.stroke());
      (o.beginPath(), o.moveTo(0, 256), o.lineTo(256, 0), (o.strokeStyle = we("--grid-line2")), o.stroke());
      const v = { rgb: we("--text"), r: "#e0605a", g: "#6fc46a", b: "#6a92e8" };
      if (n === "rgb")
        for (const x of ["r", "g", "b"]) {
          if (s[x].length === 2 && s[x][0][0] === 0 && s[x][0][1] === 0 && s[x][1][0] === 1 && s[x][1][1] === 1)
            continue;
          const w = Ct(s[x], 256);
          o.beginPath();
          for (let _ = 0; _ < 256; _++) o.lineTo(_, 256 - w[_] * 256);
          ((o.strokeStyle = v[x] + "88"), o.stroke());
        }
      const y = Ct(c(), 256);
      o.beginPath();
      for (let x = 0; x < 256; x++) o.lineTo(x, 256 - y[x] * 256);
      ((o.strokeStyle = v[n]),
        (o.lineWidth = 1.5),
        o.stroke(),
        c().forEach(([x, w], _) => {
          (o.beginPath(),
            o.rect(x * 256 - 3.5, 256 - w * 256 - 3.5, 7, 7),
            (o.fillStyle = _ === l ? v[n] : we("--bg0")),
            o.fill(),
            (o.strokeStyle = v[n]),
            (o.lineWidth = 1),
            o.stroke());
        }));
      const b = l >= 0 ? c()[l] : null;
      r.textContent = b
        ? `Input: ${Math.round(b[0] * 255)}   Output: ${Math.round(b[1] * 255)}`
        : "Click to add a point · drag off the graph to remove";
    },
    d = (v) => {
      const y = a.getBoundingClientRect();
      return [
        Math.min(1, Math.max(0, (v.clientX - y.left) / y.width)),
        Math.min(1, Math.max(0, 1 - (v.clientY - y.top) / y.height)),
      ];
    };
  a.addEventListener("pointerdown", (v) => {
    const [y, b] = d(v),
      x = c();
    ((l = x.findIndex(([M, T]) => Math.abs(M - y) < 0.03 && Math.abs(T - b) < 0.03)),
      l < 0 && (x.push([y, b]), x.sort((M, T) => M[0] - T[0]), (l = x.findIndex(([M, T]) => M === y && T === b))),
      a.setPointerCapture(v.pointerId));
    const w = (M) => {
        const T = a.getBoundingClientRect(),
          C =
            M.clientX < T.left - 20 || M.clientX > T.right + 20 || M.clientY < T.top - 20 || M.clientY > T.bottom + 20,
          [A, F] = d(M),
          S = c();
        if (C && S.length > 2 && l > 0 && l < S.length - 1) {
          (S.splice(l, 1), (l = -1), u(), t());
          return;
        }
        if (l < 0) return;
        const P = l > 0 ? S[l - 1][0] + 0.004 : 0,
          E = l < S.length - 1 ? S[l + 1][0] - 0.004 : 1;
        ((S[l] = [Math.min(E, Math.max(P, A)), F]), u(), t());
      },
      _ = () => {
        (a.removeEventListener("pointermove", w), a.removeEventListener("pointerup", _));
      };
    (a.addEventListener("pointermove", w), a.addEventListener("pointerup", _), u(), t());
  });
  const f = [
      [
        "Linear",
        [
          [0, 0],
          [1, 1],
        ],
      ],
      [
        "Increase Contrast",
        [
          [0, 0],
          [0.25, 0.2],
          [0.75, 0.8],
          [1, 1],
        ],
      ],
      [
        "Strong Contrast",
        [
          [0, 0],
          [0.25, 0.15],
          [0.75, 0.85],
          [1, 1],
        ],
      ],
      [
        "Lighter",
        [
          [0, 0],
          [0.4, 0.5],
          [1, 1],
        ],
      ],
      [
        "Darker",
        [
          [0, 0],
          [0.6, 0.5],
          [1, 1],
        ],
      ],
      [
        "Negative",
        [
          [0, 1],
          [1, 0],
        ],
      ],
      [
        "Cross Process",
        [
          [0, 0.06],
          [0.3, 0.22],
          [0.7, 0.8],
          [1, 0.95],
        ],
      ],
    ],
    m = p(
      "div",
      { class: "row" },
      p("span", { class: "sf-label" }, "Channel"),
      O(Jl, n, (v) => {
        ((n = v), (l = -1), u());
      }),
      p("span", { class: "flex1" }),
      O(
        f.map(([v], y) => ({ value: y, label: v })),
        0,
        (v) => {
          ((s[n] = f[v][1].map((y) => [...y])), (l = -1), u(), t());
        },
      ),
    );
  return (
    u(),
    p(
      "div",
      { class: "curves-editor" },
      m,
      a,
      r,
      p(
        "button",
        {
          class: "btn small",
          onclick: () => {
            ((s.rgb = [
              [0, 0],
              [1, 1],
            ]),
              (s.r = [
                [0, 0],
                [1, 1],
              ]),
              (s.g = [
                [0, 0],
                [1, 1],
              ]),
              (s.b = [
                [0, 0],
                [1, 1],
              ]),
              (l = -1),
              u(),
              t());
          },
        },
        "Reset all channels",
      ),
    )
  );
}
function zd(s, e, t) {
  let n = "rgb";
  const o = p("canvas", { class: "levels-hist", width: 512, height: 220 }),
    r = o.getContext("2d"),
    l = p("div", { class: "levels-fields" }),
    c = p("div", { class: "levels-out" }),
    u = () => {
      (r.setTransform(2, 0, 0, 2, 0, 0),
        (r.fillStyle = we("--bg0")),
        r.fillRect(0, 0, 256, 110),
        e && Kl(r, n === "rgb" ? e.l : e[n], e.max, 256, 110, we("--text3")));
      const f = s[n],
        m = f.inBlack + (f.inWhite - f.inBlack) * Math.pow(0.5, f.gamma);
      for (const [y, b] of [
        [f.inBlack, "#000"],
        [m, "#888"],
        [f.inWhite, "#fff"],
      ])
        (r.beginPath(),
          r.moveTo(y * 256, 101),
          r.lineTo(y * 256 - 6, 110),
          r.lineTo(y * 256 + 6, 110),
          r.closePath(),
          (r.fillStyle = b),
          r.fill(),
          (r.strokeStyle = we("--text3")),
          (r.lineWidth = 0.8),
          r.stroke());
      te(l);
      const v = (y, b, x = 1, w = 255, _ = 255) => {
        const M = p("input", {
          class: "num",
          value: w === 1 ? y.toFixed(2) : String(Math.round(y * w)),
          style: { width: "46px" },
        });
        return (
          M.addEventListener("change", () => {
            const T = parseFloat(M.value);
            Number.isFinite(T) && (b(Math.min(_, Math.max(0, T)) / w), u(), t());
          }),
          M.addEventListener("keydown", (T) => T.stopPropagation()),
          M
        );
      };
      (l.append(
        v(f.inBlack, (y) => {
          f.inBlack = Math.min(y, f.inWhite - 0.01);
        }),
        v(
          f.gamma,
          (y) => {
            f.gamma = Math.max(0.1, Math.min(9.99, y));
          },
          0.01,
          1,
          9.99,
        ),
        v(f.inWhite, (y) => {
          f.inWhite = Math.max(y, f.inBlack + 0.01);
        }),
      ),
        te(c),
        c.append(
          p("span", { class: "sf-label" }, "Output Levels"),
          v(f.outBlack, (y) => {
            f.outBlack = y;
          }),
          p("span", { class: "flex1" }),
          v(f.outWhite, (y) => {
            f.outWhite = y;
          }),
        ));
    };
  o.addEventListener("pointerdown", (f) => {
    const m = o.getBoundingClientRect(),
      v = (f.clientX - m.left) / m.width,
      y = s[n],
      b = y.inBlack + (y.inWhite - y.inBlack) * Math.pow(0.5, y.gamma),
      x = [Math.abs(v - y.inBlack), Math.abs(v - b), Math.abs(v - y.inWhite)],
      w = x.indexOf(Math.min(...x));
    o.setPointerCapture(f.pointerId);
    const _ = (T) => {
        const C = Math.min(1, Math.max(0, (T.clientX - m.left) / m.width));
        if (w === 0) y.inBlack = Math.min(C, y.inWhite - 0.01);
        else if (w === 2) y.inWhite = Math.max(C, y.inBlack + 0.01);
        else {
          const A = Math.min(0.99, Math.max(0.01, (C - y.inBlack) / (y.inWhite - y.inBlack)));
          y.gamma = Math.max(0.1, Math.min(9.99, Math.log(A) / Math.log(0.5)));
        }
        (u(), t());
      },
      M = () => {
        (o.removeEventListener("pointermove", _), o.removeEventListener("pointerup", M));
      };
    (o.addEventListener("pointermove", _), o.addEventListener("pointerup", M));
  });
  const d = () => {
    if (!e) return;
    const f = (m) => {
      const v = m.reduce((w, _) => w + _, 0) || 1;
      let y = 0,
        b = 0,
        x = 255;
      for (let w = 0; w < 256; w++)
        if (((y += m[w]), y > v * 0.001)) {
          b = w;
          break;
        }
      y = 0;
      for (let w = 255; w >= 0; w--)
        if (((y += m[w]), y > v * 0.001)) {
          x = w;
          break;
        }
      return [b / 255, Math.max(b + 1, x) / 255];
    };
    for (const m of ["r", "g", "b"]) {
      const [v, y] = f(e[m]);
      ((s[m].inBlack = v), (s[m].inWhite = y));
    }
    (u(), t());
  };
  return (
    u(),
    p(
      "div",
      { class: "levels-editor" },
      p(
        "div",
        { class: "row" },
        p("span", { class: "sf-label" }, "Channel"),
        O(Jl, n, (f) => {
          ((n = f), u());
        }),
        p("span", { class: "flex1" }),
        p("button", { class: "btn small", onclick: d }, "Auto"),
      ),
      o,
      l,
      c,
    )
  );
}
function Ye(s, e, t) {
  return e.map(([n, i, a, o, r, l]) =>
    Q({
      label: i,
      value: s[n],
      min: a,
      max: o,
      step: r ?? 1,
      unit: l,
      onInput: (c) => {
        ((s[n] = c), t());
      },
    }),
  );
}
function Xo(s, e, t) {
  const n = p("input", { type: "color", value: qe(e) });
  return (
    n.addEventListener("input", () => {
      const i = nt(n.value);
      i && t(i);
    }),
    p("div", { class: "form-row" }, p("span", { class: "sf-label" }, s), n)
  );
}
function Zl(s, e, t = null) {
  const n = s.params,
    i = p("div", { class: "adjust-editor" });
  switch (s.type) {
    case "brightnessContrast":
      i.append(
        ...Ye(
          n,
          [
            ["brightness", "Brightness", -150, 150],
            ["contrast", "Contrast", -50, 100],
          ],
          e,
        ),
      );
      break;
    case "levels":
      i.append(zd(n, t, e));
      break;
    case "curves":
      i.append(Dd(n, t, e));
      break;
    case "exposure":
      i.append(
        ...Ye(
          n,
          [
            ["exposure", "Exposure", -5, 5, 0.01],
            ["offset", "Offset", -0.5, 0.5, 0.001],
            ["gamma", "Gamma Correction", 0.1, 9.99, 0.01],
          ],
          e,
        ),
      );
      break;
    case "vibrance":
      i.append(
        ...Ye(
          n,
          [
            ["vibrance", "Vibrance", -100, 100],
            ["saturation", "Saturation", -100, 100],
          ],
          e,
        ),
      );
      break;
    case "hueSaturation":
      i.append(
        Q({
          label: "Hue",
          value: n.hue,
          min: -180,
          max: 180,
          unit: "°",
          gradient: "linear-gradient(90deg,#0ff,#00f,#f0f,#f00,#ff0,#0f0,#0ff)",
          onInput: (a) => {
            ((n.hue = a), e());
          },
        }),
        ...Ye(
          n,
          [
            ["saturation", "Saturation", -100, 100],
            ["lightness", "Lightness", -100, 100],
          ],
          e,
        ),
        p(
          "div",
          { class: "form-row" },
          $("Colorize", n.colorize, (a) => {
            ((n.colorize = a), e());
          }),
        ),
        ...Ye(
          n,
          [
            ["cHue", "Colorize Hue", 0, 360, 1, "°"],
            ["cSat", "Colorize Saturation", 0, 100],
            ["cLight", "Colorize Lightness", -100, 100],
          ],
          e,
        ),
      );
      break;
    case "colorBalance": {
      let a = "midtones";
      const o = p("div"),
        r = () => {
          te(o);
          const l = n[a],
            c = (u, d, f, m) =>
              Q({
                label: `${d} ↔ ${f}`,
                value: l[u],
                min: -100,
                max: 100,
                gradient: m,
                onInput: (v) => {
                  ((l[u] = v), e());
                },
              });
          o.append(
            c(0, "Cyan", "Red", "linear-gradient(90deg,#0cc,#c33)"),
            c(1, "Magenta", "Green", "linear-gradient(90deg,#c3c,#3c3)"),
            c(2, "Yellow", "Blue", "linear-gradient(90deg,#cc3,#33c)"),
          );
        };
      (i.append(
        p(
          "div",
          { class: "row" },
          p("span", { class: "sf-label" }, "Tone"),
          O(
            [
              { value: "shadows", label: "Shadows" },
              { value: "midtones", label: "Midtones" },
              { value: "highlights", label: "Highlights" },
            ],
            a,
            (l) => {
              ((a = l), r());
            },
          ),
        ),
        o,
        p(
          "div",
          { class: "form-row" },
          $("Preserve Luminosity", n.preserveLum, (l) => {
            ((n.preserveLum = l), e());
          }),
        ),
      ),
        r());
      break;
    }
    case "blackWhite":
      i.append(
        ...Ye(
          n,
          [
            ["reds", "Reds", -200, 300, 1, "%"],
            ["yellows", "Yellows", -200, 300, 1, "%"],
            ["greens", "Greens", -200, 300, 1, "%"],
            ["cyans", "Cyans", -200, 300, 1, "%"],
            ["blues", "Blues", -200, 300, 1, "%"],
            ["magentas", "Magentas", -200, 300, 1, "%"],
          ],
          e,
        ),
        p(
          "div",
          { class: "form-row" },
          $("Tint", n.tint, (a) => {
            ((n.tint = a), e());
          }),
        ),
        Xo("Tint Color", n.tintColor, (a) => {
          ((n.tintColor = a), e());
        }),
      );
      break;
    case "photoFilter": {
      const a = [
          ["Warming Filter (85)", [0.93, 0.54, 0.1]],
          ["Warming Filter (LBA)", [0.98, 0.6, 0.02]],
          ["Warming Filter (81)", [0.92, 0.69, 0.1]],
          ["Cooling Filter (80)", [0, 0.43, 1]],
          ["Cooling Filter (LBB)", [0, 0.36, 1]],
          ["Cooling Filter (82)", [0, 0.71, 1]],
          ["Sepia", [0.67, 0.48, 0.03]],
          ["Deep Emerald", [0, 0.55, 0]],
          ["Underwater", [0, 0.76, 0.69]],
        ],
        o = Xo("Color", n.color, (r) => {
          ((n.color = r), e());
        });
      i.append(
        p(
          "div",
          { class: "form-row" },
          p("span", { class: "sf-label" }, "Filter"),
          O(
            a.map(([r], l) => ({ value: l, label: r })),
            0,
            (r) => {
              ((n.color = a[r][1]), (o.querySelector("input").value = qe(n.color)), e());
            },
          ),
        ),
        o,
        ...Ye(n, [["density", "Density", 0, 100, 1, "%"]], e),
        p(
          "div",
          { class: "form-row" },
          $("Preserve Luminosity", n.preserveLum, (r) => {
            ((n.preserveLum = r), e());
          }),
        ),
      );
      break;
    }
    case "channelMixer": {
      let a = "r";
      const o = p("div"),
        r = () => {
          te(o);
          const l = n[a];
          o.append(
            ...["Red", "Green", "Blue", "Constant"].map((c, u) =>
              Q({
                label: c,
                value: l[u],
                min: -200,
                max: 200,
                unit: "%",
                onInput: (d) => {
                  ((l[u] = d), e());
                },
              }),
            ),
          );
        };
      (i.append(
        p(
          "div",
          { class: "row" },
          p("span", { class: "sf-label" }, "Output Channel"),
          O(
            [
              { value: "r", label: "Red" },
              { value: "g", label: "Green" },
              { value: "b", label: "Blue" },
            ],
            a,
            (l) => {
              ((a = l), r());
            },
          ),
        ),
        o,
        p(
          "div",
          { class: "form-row" },
          $("Monochrome", n.mono, (l) => {
            ((n.mono = l), e());
          }),
        ),
      ),
        r());
      break;
    }
    case "posterize":
      i.append(...Ye(n, [["levels", "Levels", 2, 255]], e));
      break;
    case "threshold":
      i.append(...Ye(n, [["level", "Threshold Level", 1, 255]], e));
      break;
    case "gradientMap": {
      const a = Gn(h.fg, h.bg),
        o = p("div", { class: "grad-preview", style: { background: Bs(n.gradient) } });
      i.append(
        o,
        p(
          "div",
          { class: "grad-list inline" },
          ...a.map((r) =>
            p(
              "div",
              {
                class: "grad-item",
                title: r.name,
                onclick: () => {
                  ((n.gradient = r), (o.style.background = Bs(r)), e());
                },
              },
              p("span", { class: "grad-sw", style: { background: Bs(r) } }),
              p("span", null, r.name),
            ),
          ),
        ),
        p(
          "div",
          { class: "form-row" },
          $("Reverse", n.reverse, (r) => {
            ((n.reverse = r), e());
          }),
        ),
      );
      break;
    }
    case "invert":
    case "desaturate":
      i.append(p("p", { class: "msg" }, "This adjustment has no settings."));
      break;
  }
  return i;
}
async function Ql(s) {
  const e = h.doc;
  if (!e) return;
  const t = Re(e),
    n = { type: s, params: ui(s, h.fg, h.bg) };
  if (s === "invert" || s === "desaturate") {
    yi(e, n);
    return;
  }
  const i = h.setting("adjust.last." + s, null);
  i && (n.params = JSON.parse(JSON.stringify(i)));
  const a = t.tex ? Ni(t.tex) : null,
    o = new Y(Xe[s], { width: s === "curves" ? 330 : 360, cls: "adjust-dialog", modal: !1 });
  let r = !0;
  const l = Ne(() => {
    ((e.previewAdjust = r && !e.editMask ? { layerId: t.id, op: JSON.parse(JSON.stringify(n)) } : null),
      e.invalidate());
  }, 16);
  (o.body.append(
    Zl(n, l, a),
    p(
      "div",
      { class: "form-row" },
      $("Preview", !0, (u) => {
        ((r = u), l());
      }),
    ),
    p(
      "button",
      {
        class: "btn small",
        onclick: () => {
          ((n.params = ui(s, h.fg, h.bg)), o.close(null), Ql(s));
        },
      },
      "Reset",
    ),
  ),
    l(),
    (o.onOk = () => !0));
  const c = await o.show();
  (l.cancel(),
    (e.previewAdjust = null),
    e.invalidate(),
    c && (h.set("adjust.last." + s, n.params), yi(e, n)),
    k.emit("render"));
}
let ze = null;
function ec() {
  return ze ? ze.python?.name || Cn.find((s) => s.id === ze.id)?.name.replace("…", "") : null;
}
function Id(s, e, t, n) {
  g.draw(g.program("selectMix", Nr), n, {
    textures: { u_dst: e, u_src: t, u_sel: s.selection },
    uniforms: { u_hasSel: s.selection ? 1 : 0, u_fade: 1 },
  });
}
async function tc(s) {
  const e = h.doc,
    t = Re(e),
    n = e.editMask && t.mask ? "mask" : "tex",
    i = t[n];
  if (t.lockPixels) throw new B(`"${t.name}" is locked.`);
  i.format === "r16f" || i.format;
  const a = n === "mask" ? t.id + ":mask" : t.id;
  let o = null,
    r = !1,
    l = !1,
    c = 0;
  const u = p("div", { class: "filter-status" }),
    d = async (x) => {
      const w = await s.compute(i, x);
      if (!w) return null;
      const _ = g.acquireLike(i, i.format);
      return (Id(e, i, w, _), g.release(w), _);
    },
    f = async () => {
      if (r) {
        l = !0;
        return;
      }
      r = !0;
      const x = ++c;
      u.textContent = "Rendering preview…";
      try {
        const w = await d({ ...s.values });
        (x !== c || !w
          ? g.release(w)
          : (o && g.release(o), (o = w), e.preview.set(a, { tex: w, mask: n === "mask" }), e.invalidate()),
          (u.textContent = ""));
      } catch (w) {
        u.textContent = lo(w?.message || String(w))[0];
      }
      ((r = !1), l && ((l = !1), f()));
    },
    m = () => {
      (e.preview.delete(a), o && g.release(o), (o = null), e.invalidate());
    };
  let v = !0;
  if (s.showDialog !== !1 && s.params.length) {
    const x = new Y(s.title.replace("…", ""), { width: 380, modal: !1, cls: "filter-dialog" });
    let w = !0;
    const _ = Ne(
      () => {
        w && f();
      },
      s.heavy ? 250 : 60,
    );
    (x.body.append(
      Xl(s.params, s.values, () => _()),
      p(
        "div",
        { class: "form-row" },
        $("Preview", !0, (M) => {
          ((w = M), M ? f() : m());
        }),
      ),
      u,
    ),
      f(),
      (v = await x.show()),
      _.cancel());
  }
  if (!v) return (c++, m(), !1);
  let y = o && !r && !l ? o : null;
  if (
    (y || (h.status(`${s.title.replace("…", "")}…`), (y = await d({ ...s.values })), o && o !== y && g.release(o)),
    (o = null),
    e.preview.delete(a),
    h.status(""),
    !y)
  )
    return (e.invalidate(), !1);
  const b = n === "mask" ? e.newMaskTex() : e.newLayerTex();
  return (g.copy(y, b), g.release(y), e.transact(s.title.replace("…", ""), () => kt(e, t, b, n)), !0);
}
async function co(s, e, t = !0) {
  const n = e || { ...Fd(s.params), ...(h.setting("filter.last." + s.id, {}) || {}) },
    i = { fg: h.fg, bg: h.bg, width: h.doc.width, height: h.doc.height };
  (await tc({
    title: s.name,
    params: s.params,
    values: n,
    heavy: s.heavy,
    showDialog: t,
    compute: (o, r) => {
      const l = o.format === "r16f" ? "rgba16f" : o.format;
      let c = o,
        u = null;
      o.format === "r16f" && ((u = g.acquire(o.w, o.h, "rgba16f")), g.copy(o, u), (c = u));
      const d = g.acquireLike(o, l);
      return (s.run(c, d, r, i), u && g.release(u), d);
    },
  })) && (h.set("filter.last." + s.id, n), (ze = { id: s.id, params: n }));
}
function Od(s, e, t, n) {
  ze = { id: "py", params: n, python: { ext: s, filter: e, name: t } };
}
async function Bd() {
  if (!ze) return;
  if (ze.python) {
    const { runPythonFilter: e } = await re(
      async () => {
        const { runPythonFilter: t } = await Promise.resolve().then(() => Pp);
        return { runPythonFilter: t };
      },
      void 0,
      import.meta.url,
    );
    await e(ze.python.ext, ze.python.filter, ze.params, !1);
    return;
  }
  const s = Cn.find((e) => e.id === ze.id);
  s && (await co(s, ze.params, !1));
}
const Yo = [
  ["Default BrushBoard (1920 × 1080)", 1920, 1080, 72],
  ["Square (2048 × 2048)", 2048, 2048, 72],
  ["A4 @ 300 ppi", 2480, 3508, 300],
  ["Letter @ 300 ppi", 2550, 3300, 300],
  ["4K UHD (3840 × 2160)", 3840, 2160, 72],
  ["Instagram Portrait (1080 × 1350)", 1080, 1350, 72],
  ["Instagram Story (1080 × 1920)", 1080, 1920, 72],
  ["Web (1366 × 768)", 1366, 768, 72],
  ["Icon (512 × 512)", 512, 512, 72],
  ["Postcard 6×4 in @ 300 ppi", 1800, 1200, 300],
  ["Still Life Study, 3:4 (2400 × 3200)", 2400, 3200, 300],
];
let Ko = 1;
function En(s, e, t, n, i, a = 72, o = null, r = 300) {
  const l = new xs(s, e, t, o && n === 32 ? 16 : n, o);
  (o && (l.tac = r), (l.dpi = a));
  const c = le("raster", i ? "Background" : "Layer 1");
  return (
    (c.tex = l.newLayerTex()),
    i && g.clear(c.tex, null, [...i, 1]),
    (l.layers = [c]),
    (l.activeId = c.id),
    l.selectedIds.add(c.id),
    l.invalidate(),
    h.addDoc(l),
    l
  );
}
async function sc() {
  const s = new Y("New Document", { width: 460, ok: "Create" }),
    e = {
      name: `Untitled-${Ko}`,
      w: 1920,
      h: 1080,
      dpi: 72,
      bits: h.prefs.defaultBitDepth,
      bg: "white",
      custom: "#f2e8d5",
      lock: !1,
      mode: "rgb",
    };
  let t = [];
  if (h.python.python && h.python.capabilities.numpy)
    try {
      t = await Li();
    } catch {
      t = [];
    }
  const n = [
      { value: "rgb", label: "RGB Color (sRGB)" },
      ...t.map((m) => ({ value: m.id, label: `CMYK — ${m.name}` })),
    ],
    i = p("input", { class: "text", value: e.name });
  i.addEventListener("input", () => (e.name = i.value));
  const a = q({
      value: e.w,
      min: 1,
      max: g.maxTex,
      unit: "px",
      width: 70,
      onInput: (m) => {
        (e.lock && ((e.h = Math.max(1, Math.round((m * e.h) / e.w))), o.set(e.h)), (e.w = m));
      },
    }),
    o = q({
      value: e.h,
      min: 1,
      max: g.maxTex,
      unit: "px",
      width: 70,
      onInput: (m) => {
        (e.lock && ((e.w = Math.max(1, Math.round((m * e.w) / e.h))), a.set(e.w)), (e.h = m));
      },
    }),
    r = q({ value: e.dpi, min: 1, max: 2400, unit: "ppi", width: 60, onInput: (m) => (e.dpi = m) }),
    l = p("input", { type: "color", value: e.custom });
  l.addEventListener("input", () => {
    ((e.custom = l.value), (e.bg = "custom"), (c.value = "custom"));
  });
  const c = O(
    [
      { value: "white", label: "White" },
      { value: "black", label: "Black" },
      { value: "vellum", label: "Vellum" },
      { value: "transparent", label: "Transparent" },
      { value: "bgcolor", label: "Background Color" },
      { value: "custom", label: "Custom…" },
    ],
    e.bg,
    (m) => (e.bg = m),
  );
  (s.body.append(
    p("label", { class: "field" }, p("span", null, "Name"), i),
    p(
      "div",
      { class: "field" },
      p("span", null, "Preset"),
      O(
        Yo.map(([m], v) => ({ value: v, label: m })),
        0,
        (m) => {
          const v = Yo[m];
          ((e.w = v[1]), (e.h = v[2]), (e.dpi = v[3]), a.set(e.w), o.set(e.h), r.set(e.dpi));
        },
      ),
    ),
    p("div", { class: "field two" }, p("span", null, "Width"), a, p("span", null, "Height"), o),
    p(
      "div",
      { class: "field" },
      p("span", null, ""),
      p(
        "div",
        { class: "row" },
        $("Constrain proportions", !1, (m) => (e.lock = m)),
        p(
          "button",
          {
            class: "btn small",
            onclick: () => {
              (([e.w, e.h] = [e.h, e.w]), a.set(e.w), o.set(e.h));
            },
          },
          "⇄ Swap",
        ),
      ),
    ),
    p("div", { class: "field" }, p("span", null, "Resolution"), r),
    p(
      "div",
      { class: "field" },
      p("span", null, "Color Mode"),
      O(n, e.mode, (m) => (e.mode = m)),
    ),
    p(
      "div",
      { class: "field" },
      p("span", null, "Bit Depth"),
      O(
        [
          { value: 8, label: "8 bits/channel" },
          { value: 16, label: "16 bits/channel" },
          { value: 32, label: "32 bits/channel (float)" },
        ],
        e.bits,
        (m) => (e.bits = m),
      ),
    ),
    p("div", { class: "field" }, p("span", null, "Background"), p("div", { class: "row" }, c, l)),
    p("p", { class: "hint" }, `GPU limit: ${g.maxTex} px per side. CMYK documents work at 8 or 16 bits/channel.`),
  ),
    (s.onOk = () => e));
  const u = await s.show();
  if (!u) return;
  Ko++;
  const d =
      u.bg === "white"
        ? [1, 1, 1]
        : u.bg === "black"
          ? [0, 0, 0]
          : u.bg === "vellum"
            ? [0.95, 0.91, 0.83]
            : u.bg === "bgcolor"
              ? h.bg
              : u.bg === "custom"
                ? nt(u.custom) || [1, 1, 1]
                : null,
    f = u.mode !== "rgb" ? await st(u.mode) : null;
  En(u.name || "Untitled", Math.round(u.w), Math.round(u.h), u.bits, d, u.dpi, f, f ? rs(u.mode) : 300);
}
async function nc() {
  const s = h.doc;
  if (!s) return;
  const e = new Y("Image Size", { width: 400 }),
    t = { w: s.width, h: s.height, lock: !0, q: 2, pct: 100 },
    n = s.width / s.height,
    i = q({
      value: t.w,
      min: 1,
      max: g.maxTex,
      unit: "px",
      width: 70,
      onInput: (l) => {
        ((t.w = l),
          t.lock && ((t.h = Math.max(1, Math.round(l / n))), a.set(t.h)),
          o.set(Math.round((t.w / s.width) * 1e3) / 10));
      },
    }),
    a = q({
      value: t.h,
      min: 1,
      max: g.maxTex,
      unit: "px",
      width: 70,
      onInput: (l) => {
        ((t.h = l),
          t.lock && ((t.w = Math.max(1, Math.round(l * n))), i.set(t.w)),
          o.set(Math.round((t.w / s.width) * 1e3) / 10));
      },
    }),
    o = q({
      value: 100,
      min: 0.1,
      max: 1e4,
      step: 0.1,
      unit: "%",
      width: 60,
      onInput: (l) => {
        ((t.w = Math.max(1, Math.round((s.width * l) / 100))),
          (t.h = Math.max(1, Math.round((s.height * l) / 100))),
          i.set(t.w),
          a.set(t.h));
      },
    });
  (e.body.append(
    p("p", { class: "hint" }, `Current: ${s.width} × ${s.height} px (${((s.width * s.height) / 1e6).toFixed(1)} MP)`),
    p("div", { class: "field two" }, p("span", null, "Width"), i, p("span", null, "Height"), a),
    p("div", { class: "field" }, p("span", null, "Scale"), o),
    p(
      "div",
      { class: "field" },
      p("span", null, ""),
      $("Constrain proportions", !0, (l) => (t.lock = l)),
    ),
    p(
      "div",
      { class: "field" },
      p("span", null, "Resample"),
      O(
        [
          { value: 2, label: "Bicubic (smooth / reduction: area)" },
          { value: 1, label: "Bilinear" },
          { value: 0, label: "Nearest Neighbor (hard edges)" },
        ],
        t.q,
        (l) => (t.q = l),
      ),
    ),
  ),
    (e.onOk = () => t));
  const r = await e.show();
  !r || (r.w === s.width && r.h === s.height) || Ll(s, Math.round(r.w), Math.round(r.h), r.q);
}
async function ic() {
  const s = h.doc;
  if (!s) return;
  const e = new Y("Canvas Size", { width: 420 }),
    t = { w: s.width, h: s.height, ax: 0.5, ay: 0.5, rel: !1, fill: "transparent" },
    n = q({ value: t.w, min: 1, max: g.maxTex, unit: "px", width: 70, onInput: (d) => (t.w = d) }),
    i = q({ value: t.h, min: 1, max: g.maxTex, unit: "px", width: 70, onInput: (d) => (t.h = d) }),
    a = p("div", { class: "anchor-grid" }),
    o = () => {
      a.innerHTML = "";
      for (let d = 0; d < 3; d++)
        for (let f = 0; f < 3; f++) {
          const m = t.ax === f / 2 && t.ay === d / 2;
          a.appendChild(
            p(
              "button",
              {
                class: "anchor" + (m ? " on" : ""),
                onclick: () => {
                  ((t.ax = f / 2), (t.ay = d / 2), o());
                },
              },
              m ? "●" : "",
            ),
          );
        }
    };
  (o(),
    e.body.append(
      p("p", { class: "hint" }, `Current: ${s.width} × ${s.height} px`),
      p("div", { class: "field two" }, p("span", null, "Width"), n, p("span", null, "Height"), i),
      p(
        "div",
        { class: "field" },
        p("span", null, ""),
        $("Relative", !1, (d) => {
          ((t.rel = d), d ? ((t.w = 0), (t.h = 0)) : ((t.w = s.width), (t.h = s.height)), n.set(t.w), i.set(t.h));
        }),
      ),
      p("div", { class: "field" }, p("span", null, "Anchor"), a),
      p(
        "div",
        { class: "field" },
        p("span", null, "Extension color"),
        O(
          [
            { value: "transparent", label: "Transparent" },
            { value: "bg", label: "Background" },
            { value: "fg", label: "Foreground" },
            { value: "white", label: "White" },
            { value: "black", label: "Black" },
          ],
          t.fill,
          (d) => (t.fill = d),
        ),
      ),
    ),
    (e.onOk = () => t));
  const r = await e.show();
  if (!r) return;
  const l = Math.round(r.rel ? s.width + r.w : r.w),
    c = Math.round(r.rel ? s.height + r.h : r.h);
  if (l < 1 || c < 1 || (l === s.width && c === s.height)) return;
  const u =
    r.fill === "bg"
      ? h.bg
      : r.fill === "fg"
        ? h.fg
        : r.fill === "white"
          ? [1, 1, 1]
          : r.fill === "black"
            ? [0, 0, 0]
            : null;
  Cl(s, l, c, r.ax, r.ay, u);
}
const $d = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        canvasSizeDialog: ic,
        createDocument: En,
        imageSizeDialog: nc,
        newDocumentDialog: sc,
        rgbToHex: qe,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  ac = 15;
let Gs = null,
  ki = null;
function qd() {
  if (Gs) return;
  const s = g.gl;
  ((Gs = s.createVertexArray()), (ki = s.createBuffer()), s.bindVertexArray(Gs), s.bindBuffer(s.ARRAY_BUFFER, ki));
  const e = ac * 4;
  (s.enableVertexAttribArray(0),
    s.vertexAttribPointer(0, 4, s.FLOAT, !1, e, 0),
    s.vertexAttribDivisor(0, 1),
    s.enableVertexAttribArray(1),
    s.vertexAttribPointer(1, 4, s.FLOAT, !1, e, 16),
    s.vertexAttribDivisor(1, 1),
    s.enableVertexAttribArray(2),
    s.vertexAttribPointer(2, 3, s.FLOAT, !1, e, 32),
    s.vertexAttribDivisor(2, 1),
    s.enableVertexAttribArray(3),
    s.vertexAttribPointer(3, 4, s.FLOAT, !1, e, 44),
    s.vertexAttribDivisor(3, 1),
    s.bindVertexArray(null));
}
const Jo = new Map();
function oc(s) {
  const e = Jo.get(s);
  if (e) return e;
  const t = new Image();
  return (
    (t.onload = () => {
      const n = g.uploadImage8(t, t.width, t.height);
      ((n.isImage = !1), Jo.set(s, n));
    }),
    (t.src = s),
    null
  );
}
function Nd(s, e) {
  if (!e) return s;
  const t = e * Math.PI * 2,
    n = Math.cos(t),
    i = Math.sin(t),
    [a, o, r] = s,
    l = 0.299 * a + 0.587 * o + 0.114 * r,
    c = 0.596 * a - 0.274 * o - 0.322 * r,
    u = 0.211 * a - 0.523 * o + 0.312 * r,
    d = c * n - u * i,
    f = c * i + u * n;
  return [l + 0.956 * d + 0.621 * f, l - 0.272 * d - 0.647 * f, l - 1.106 * d + 1.703 * f].map((m) =>
    Math.min(1, Math.max(0, m)),
  );
}
const jd = () => {
    let s = 0,
      e = 0;
    for (; s === 0;) s = Math.random();
    for (; e === 0;) e = Math.random();
    return Math.sqrt(-2 * Math.log(s)) * Math.cos(2 * Math.PI * e);
  },
  Gd = { round: 0, square: 1, chalk: 2, texture: 3, bristle: 5, watercolor: 6 };
class ji {
  doc;
  layer;
  target;
  brush;
  opt;
  dst;
  strokeTex = null;
  merged = null;
  work = null;
  tmp = null;
  snapshot = null;
  blurred = null;
  dabs = [];
  pendingRect = null;
  bounds = null;
  last = null;
  smooth = null;
  residual = 0;
  lastDabPos = null;
  direct;
  previewKey;
  seed = Math.random() * 1e3;
  dist = 0;
  speed = 0;
  dirAngle = 0;
  hasDir = !1;
  constructor(e, t, n, i) {
    ((this.doc = e),
      (this.layer = t),
      (this.brush = { ...n }),
      (this.opt = i),
      (this.target = e.editMask && t.mask ? "mask" : "pixels"));
    const a = this.target === "mask" ? t.mask : t.tex;
    if (!a) throw new Error("This layer has no pixels to paint on. Rasterize it first.");
    if (
      ((this.dst = a),
      (this.direct = ["smudge", "blur", "sharpen", "dodge", "burn", "sponge", "mixer"].includes(i.mode)),
      (this.previewKey = this.target === "mask" ? t.id + ":mask" : t.id),
      qd(),
      this.direct)
    )
      ((this.work = g.acquireLike(a, a.format)),
        g.copy(a, this.work),
        (this.tmp = g.acquireLike(a, a.format)),
        e.preview.set(this.previewKey, { tex: this.work, mask: this.target === "mask" }));
    else if (
      (a.k && a.ink
        ? ((this.strokeTex = g.acquirePair(a.w, a.h, "rgba16f", a.ink)),
          g.clear1(this.strokeTex, null, [0, 0, 0, 0]),
          g.clear1(this.strokeTex.k, null, [0, 0, 0, 0]))
        : (this.strokeTex = g.acquire(a.w, a.h, "rgba16f", !0)),
      (this.merged = g.acquireLike(a, a.format)),
      g.copy(a, this.merged),
      e.preview.set(this.previewKey, { tex: this.merged, mask: this.target === "mask" }),
      i.mode === "clone" || i.mode === "heal")
    ) {
      const o = i.cloneSource || a;
      if (
        ((this.snapshot = a.k ? g.acquireLike(a) : g.acquire(o.w, o.h, o.format === "r16f" ? "rgba16f" : o.format)),
        g.copy(o, this.snapshot),
        i.mode === "heal")
      ) {
        const r = Math.min(12, Math.max(2, n.size * 0.25));
        this.blurred = It(this.snapshot, r, { x: 0, y: 0, w: o.w, h: o.h });
      }
    }
  }
  tiltOf(e) {
    if (e.tiltX === void 0 || e.tiltY === void 0 || (!e.tiltX && !e.tiltY)) return null;
    const t = e.tiltX,
      n = e.tiltY,
      i = Math.min(1, Math.hypot(t, n) / 60);
    let a = Math.atan2(n, t) - ((this.opt.viewRotation || 0) * Math.PI) / 180;
    return (this.opt.viewFlip && (a = Math.PI - a), { amount: i, azimuth: a });
  }
  sizeFactor(e) {
    const t = this.brush,
      n = Math.max(0, Math.min(1, e.pressure));
    let i = t.sizePressure ? t.minSize + (1 - t.minSize) * n : 1;
    (t.speedSize && (i *= Math.max(0.08, 1 - t.speedSize * Math.min(1, this.speed / 2.2))),
      t.taper && (i *= Math.min(1, 0.06 + 0.94 * Math.sqrt(Math.min(1, this.dist / t.taper)))));
    const a = t.tiltSize ? this.tiltOf(e) : null;
    return (a && (i *= 1 + t.tiltSize * a.amount), i);
  }
  dynamics(e) {
    const t = this.brush,
      n = Math.max(0, Math.min(1, e.pressure));
    let i = t.size * this.sizeFactor(e);
    t.sizeJitter && (i *= 1 - Math.random() * t.sizeJitter);
    let a = t.flow * (t.flowPressure ? n : 1) * (t.opacityPressure ? n : 1);
    if ((this.opt.pencil && (a = t.opacityPressure ? n : 1), t.tiltOpacity)) {
      const o = this.tiltOf(e);
      o && (a *= 1 - t.tiltOpacity * o.amount * 0.85);
    }
    return { radius: Math.max(0.5, i / 2), alpha: a };
  }
  angleFor(e) {
    const t = this.brush;
    let n = (t.angle * Math.PI) / 180;
    if ((t.followDirection && this.hasDir && (n += this.dirAngle), t.tiltAngle)) {
      const i = this.tiltOf(e);
      i && i.amount > 0.05 && (n = i.azimuth + (t.angle * Math.PI) / 180);
    }
    return (
      t.twistAngle && e.twist && (n += (e.twist * Math.PI) / 180),
      t.angleJitter && (n += (Math.random() - 0.5) * t.angleJitter * Math.PI * 2),
      n
    );
  }
  pushDab(e, t, n) {
    const i = this.brush,
      { radius: a, alpha: o } = this.dynamics(n);
    if (i.scatter) {
      const m = Math.random() * Math.PI * 2,
        v = Math.random() * i.scatter * a * 2;
      ((e += Math.cos(m) * v), (t += Math.sin(m) * v));
    }
    const r = this.angleFor(n),
      l = this.dabColor(i.hueJitter ? Nd(this.opt.color, (Math.random() - 0.5) * i.hueJitter) : this.opt.color),
      c = this.tiltOf(n)?.amount ?? 0,
      u = Math.max(0, Math.min(1, n.pressure));
    if (this.direct) {
      this.drawDirectDab(e, t, a, o, r, l, u);
      return;
    }
    const d = i.particles || 0;
    if (d > 0) {
      const m = Math.max(0.35, i.particleSize ?? 1),
        v = Math.max(1, Math.round(d * (i.flowPressure ? 0.2 + 0.8 * u : 1)));
      for (let y = 0; y < v; y++) {
        const b = Math.min(1, Math.abs(jd()) * 0.45) * a,
          x = Math.random() * Math.PI * 2,
          w = e + Math.cos(x) * b,
          _ = t + Math.sin(x) * b,
          M = m * (0.5 + Math.random());
        this.dabs.push(
          w,
          _,
          M,
          o * (0.55 + 0.45 * Math.random()),
          Math.random() * 6.283,
          1,
          l[3],
          0,
          l[0],
          l[1],
          l[2],
          Math.random() * 1e3,
          u,
          this.dist,
          c,
        );
      }
    } else this.dabs.push(e, t, a, o, r, i.roundness, l[3], 0, l[0], l[1], l[2], this.seed, u, this.dist, c);
    const f = { x: e - a - 3, y: t - a - 3, w: a * 2 + 6, h: a * 2 + 6 };
    this.pendingRect = Ki(this.pendingRect, f);
  }
  add(e) {
    const t = this.brush;
    if (t.smoothing > 0 && this.smooth) {
      const d = 1 - Math.min(0.95, t.smoothing);
      e = { ...e, x: this.smooth.x + (e.x - this.smooth.x) * d, y: this.smooth.y + (e.y - this.smooth.y) * d };
    }
    if (((this.smooth = e), !this.last)) {
      ((this.last = e), this.pushDab(e.x, e.y, e), (this.lastDabPos = [e.x, e.y]));
      return;
    }
    const n = this.last,
      i = e.x - n.x,
      a = e.y - n.y,
      o = Math.hypot(i, a);
    if (o < 0.001) return;
    if (e.time !== void 0 && n.time !== void 0 && e.time > n.time) {
      const d = o / Math.max(1, e.time - n.time);
      this.speed = this.speed * 0.75 + Math.min(d, 8) * 0.25;
    }
    const r = Math.atan2(a, i);
    if (!this.hasDir) ((this.dirAngle = r), (this.hasDir = !0));
    else {
      let d = r - this.dirAngle;
      ((d = Math.atan2(Math.sin(d), Math.cos(d))), (this.dirAngle += d * Math.min(1, 0.35 + o / Math.max(4, t.size))));
    }
    let l = this.residual,
      c = 0,
      u = 0;
    for (; u++ < 1e5;) {
      const d = c / o,
        f = { ...e, pressure: n.pressure + (e.pressure - n.pressure) * d },
        m = Math.max(0.5, (t.size / 2) * this.sizeFactor(f)),
        y = Math.max(0.5, m * 2 * Math.max(0.01, t.spacing)) - l;
      if (c + y > o) {
        this.residual = l + (o - c);
        break;
      }
      ((c += y), (l = 0), (this.dist += y));
      const b = c / o,
        x = n.x + i * b,
        w = n.y + a * b;
      (this.pushDab(x, w, { ...e, pressure: n.pressure + (e.pressure - n.pressure) * b }), (this.lastDabPos = [x, w]));
    }
    this.last = e;
  }
  buildup() {
    this.last && this.pushDab(this.last.x, this.last.y, this.last);
  }
  flush() {
    if (this.direct || !this.dabs.length || !this.strokeTex) return;
    const e = g.gl,
      t = new Float32Array(this.dabs);
    (e.bindBuffer(e.ARRAY_BUFFER, ki), e.bufferData(e.ARRAY_BUFFER, t, e.STREAM_DRAW));
    const n = this.brush,
      i = (n.particles || 0) > 0;
    let a = this.opt.pencil ? 4 : i ? 0 : (Gd[n.tip] ?? 0);
    const o = n.tip === "texture" && n.tipImage ? oc(n.tipImage) : null;
    (n.tip === "texture" && !o && (a = 0),
      g.draw(g.program("dab", Eh, Oo), this.strokeTex, {
        vao: Gs,
        count: 6,
        instances: t.length / ac,
        blend: "over",
        uniforms: {
          u_size: [this.dst.w, this.dst.h],
          u_hardness: i ? Math.max(0.6, n.hardness) : n.hardness,
          u_tip: a,
          u_texScale: 0.35,
          u_grain: n.grain || 0,
          u_grainScale: n.grainScale || 2.5,
          u_grainPressure: n.grainPressure ? 1 : 0,
          u_bristles: n.bristles || 20,
          u_bristleDry: n.bristleDry || 0,
        },
        textures: { u_tipTex: o },
      }),
      (this.dabs = []));
    const r = ae(this.pendingRect, this.dst.w, this.dst.h);
    ((this.pendingRect = null), (this.bounds = Ki(this.bounds, r)), this.mergeRect(r));
  }
  wetSigma() {
    return Math.min(14, Math.max(1.5, this.brush.size * 0.18));
  }
  mergeRect(e) {
    const t = this.brush.wetEdges || 0;
    let n = e,
      i = null;
    (t > 0 &&
      this.strokeTex &&
      ((n = ae(Ve(e, Math.ceil(this.wetSigma() * 3) + 2), this.dst.w, this.dst.h)),
      (i = It(this.strokeTex, this.wetSigma(), n, { alphaOnly: !0 }))),
      this.mergeInto(this.merged, n, this.opt.mode === "spot", i, t),
      i && g.release(i),
      this.doc.invalidate(n));
  }
  mergeInto(e, t, n, i = null, a = 0) {
    const o = this.opt.mode,
      r = n ? 104 : o === "erase" ? 100 : o === "clone" ? 101 : o === "heal" ? 102 : (wt[this.brush.mode] ?? 0);
    g.draw(g.program("strokeMerge", Lh), e, {
      textures: {
        u_layer: this.dst,
        u_stroke: this.strokeTex,
        u_sel: this.doc.selection,
        u_source: this.snapshot,
        u_srcBlur: this.blurred,
        u_dstBlur: this.blurred,
        u_strokeBlur: i,
      },
      uniforms: {
        u_hasSel: this.doc.selection ? 1 : 0,
        u_opacity: this.brush.opacity,
        u_mode: r,
        u_lockAlpha: this.layer.lockAlpha ? 1 : 0,
        u_srcOffset: this.opt.cloneOffset || [0, 0],
        u_isMask: this.target === "mask" ? 1 : 0,
        u_maskValue: this.opt.maskValue ?? 0,
        u_wet: i ? a : 0,
      },
      rect: t,
    });
  }
  dabColor(e) {
    const t = this.dst.ink;
    if (!t || !this.dst.k) return [e[0], e[1], e[2], 0];
    const n = os(e, t);
    return [1 - n[0], 1 - n[1], 1 - n[2], 1 - n[3]];
  }
  drawDirectDab(e, t, n, i, a, o, r) {
    const l = this.work,
      c = this.tmp,
      u = ae({ x: e - n - 2, y: t - n - 2, w: n * 2 + 4, h: n * 2 + 4 }, l.w, l.h);
    if (u.w <= 0 || u.h <= 0) return;
    const d =
        Math.ceil(n * 0.12 + 8) +
        (this.lastDabPos ? Math.ceil(Math.hypot(e - this.lastDabPos[0], t - this.lastDabPos[1])) : 0),
      f = ae(Ve(u, d), l.w, l.h);
    g.copy(l, c, f, f.x, f.y);
    const m = g.gl,
      v = this.brush,
      y = new Float32Array([e, t, n, i, a, v.roundness, o[3], 0, o[0], o[1], o[2], this.seed, r, this.dist, 0]);
    (m.bindBuffer(m.ARRAY_BUFFER, ki), m.bufferData(m.ARRAY_BUFFER, y, m.STREAM_DRAW));
    const b = {
        smudge: 0,
        blur: 1,
        sharpen: 2,
        dodge: 3,
        burn: 4,
        sponge: this.opt.sponge === "desaturate" ? 6 : 5,
        mixer: 7,
      },
      x = this.lastDabPos ? [e - this.lastDabPos[0], t - this.lastDabPos[1]] : [0, 0],
      w = (v.mixLoad ?? 0.5) >= 0.99 ? 1 / 0 : 40 + (v.mixLoad ?? 0.5) * 2500;
    (g.draw(g.program("directDab", Ah, Oo), l, {
      vao: Gs,
      count: 6,
      instances: 1,
      textures: { u_tmp: c, u_sel: this.doc.selection },
      uniforms: {
        u_size: [l.w, l.h],
        u_hasSel: this.doc.selection ? 1 : 0,
        u_tool: b[this.opt.mode],
        u_hardness: v.hardness,
        u_strength: this.opt.mode === "mixer" ? 1 : (this.opt.strength ?? 0.5),
        u_delta: x,
        u_range: this.opt.range ?? 1,
        u_bristles: v.tip === "bristle" ? v.bristles || 20 : 0,
        u_bristleDry: v.bristleDry || 0,
        u_wet: v.mixWet ?? 0.5,
        u_load: Math.max(0, 1 - this.dist / w),
        u_grain: v.grain || 0,
        u_grainScale: v.grainScale || 2.5,
      },
    }),
      (this.bounds = Ki(this.bounds, u)),
      this.doc.invalidate(u));
  }
  coverage(e) {
    if ((this.flush(), !this.strokeTex)) return null;
    const t = g.read(this.strokeTex, e),
      n = new Float32Array(e.w * e.h);
    for (let i = 0; i < n.length; i++) n[i] = Math.min(1, t[i * 4 + 3]);
    return n;
  }
  get targetTex() {
    return this.dst;
  }
  get isMaskTarget() {
    return this.target === "mask";
  }
  previewTex() {
    return (this.flush(), this.direct ? this.work : this.merged);
  }
  end(e) {
    this.flush();
    const t = this.doc,
      n = (this.brush.wetEdges ? Math.ceil(this.wetSigma() * 3) + 2 : 0) + 1,
      i = this.bounds ? ae(Ve(this.bounds, n), this.dst.w, this.dst.h) : null;
    if (i && i.w > 0 && i.h > 0) {
      let a;
      (this.direct ? (a = this.work) : this.opt.mode === "spot" ? (a = this.inpaint(i)) : (a = this.merged),
        t.begin(e || this.label()),
        t.recordPatch(this.dst, i),
        g.copy(a, this.dst, i, i.x, i.y),
        this.layer.version++,
        t.commit(),
        a !== this.work && a !== this.merged && g.release(a));
    }
    (this.cleanup(), t.invalidate(i));
  }
  cancel() {
    const e = this.bounds;
    (this.cleanup(), this.doc.invalidate(e));
  }
  label() {
    const e = this.opt.mode;
    return (
      {
        paint: this.opt.pencil ? "Pencil" : "Brush Tool",
        erase: "Eraser",
        clone: "Clone Stamp",
        heal: "Healing Brush",
        spot: "Spot Healing Brush",
        smudge: "Smudge",
        blur: "Blur Tool",
        sharpen: "Sharpen Tool",
        dodge: "Dodge",
        burn: "Burn",
        sponge: "Sponge",
        mixer: "Mixer Brush",
      }[e] || "Paint"
    );
  }
  inpaint(e) {
    const t = this.dst,
      n = t.format === "r16f" ? "rgba16f" : t.format;
    let i = g.acquireLike(t, n),
      a = g.acquireLike(t, n);
    const o = ae(Ve(e, 4), t.w, t.h);
    (g.copy(t, i), g.copy(t, a));
    const r = g.program("inpaint", Rh),
      l = Math.max(e.w, e.h);
    let c = 1;
    for (; c * 2 < l / 2;) c *= 2;
    for (; c >= 1; c = Math.floor(c / 2)) {
      const d = c === 1 ? 60 : 24;
      for (let f = 0; f < d; f++)
        (g.draw(r, a, { textures: { u_src: i, u_mask: this.strokeTex }, uniforms: { u_step: c }, rect: o }),
          ([i, a] = [a, i]));
    }
    const u = g.acquireLike(t, t.format);
    return (
      g.copy(t, u),
      g.draw(g.program("inpaintFinish", Fh), u, {
        textures: { u_orig: t, u_fill: i, u_mask: this.strokeTex },
        uniforms: { u_grain: 0.012 },
        rect: o,
      }),
      g.release(i),
      g.release(a),
      u
    );
  }
  cleanup() {
    this.doc.preview.delete(this.previewKey);
    for (const e of [this.strokeTex, this.merged, this.work, this.tmp, this.snapshot, this.blurred]) g.release(e);
    this.strokeTex = this.merged = this.work = this.tmp = this.snapshot = this.blurred = null;
  }
}
const Wd = Object.freeze(
    Object.defineProperty({ __proto__: null, Stroke: ji, tipTexture: oc }, Symbol.toStringTag, { value: "Module" }),
  ),
  Es = new Map();
let lt = null;
const ut = 220,
  Je = 44;
function Ud() {
  if (lt && lt.width === ut) return lt;
  lt = new xs("__brush_preview__", ut, Je, 8);
  const s = le("raster", "p");
  return ((s.tex = lt.newLayerTex()), (lt.layers = [s]), (lt.activeId = s.id), lt);
}
function Hd(s, e = [0.91, 0.86, 0.78], t = !1) {
  const n = JSON.stringify({ ...s, name: "" }) + e.join(",") + (t ? "m" : ""),
    i = Es.get(n);
  if (i) return i;
  const a = Ud(),
    o = a.layers[0];
  g.clear(o.tex, null, [0, 0, 0, 0]);
  const r = {
    ...s,
    size: Math.max(2, Math.min(Je * 0.62, s.size * 0.35 + 3)),
    smoothing: 0,
    buildup: !1,
    mode: "normal",
  };
  (r.particles && (r.particleSize = Math.max(0.6, Math.min(2.5, r.particleSize ?? 1))),
    r.bristleDry && (r.bristleDry = Math.min(r.bristleDry, 260)),
    r.taper && (r.taper = Math.min(r.taper, 40)));
  let l = "";
  try {
    const c = new ji(a, o, r, { mode: t ? "mixer" : "paint", color: e }),
      u = 48;
    for (let y = 0; y < u; y++) {
      const b = y / (u - 1),
        x = Math.sin(b * Math.PI);
      c.add({
        x: 12 + b * (ut - 24),
        y: Je / 2 + Math.sin(b * Math.PI * 2) * (Je * 0.2),
        pressure: 0.15 + 0.85 * x,
        tiltX: 35,
        tiltY: 20,
        time: y * (6 + 10 * (1 - x)),
      });
    }
    const d = c.previewTex(),
      f = g.acquire(ut, Je, "rgba8");
    g.draw(g.program("thumb", Fi), f, {
      textures: { u_src: d },
      uniforms: { u_srcSize: [ut, Je], u_dstSize: [ut, Je], u_gray: 0 },
    });
    const m = g.read8(f);
    (g.release(f), c.cancel());
    const v = document.createElement("canvas");
    ((v.width = ut),
      (v.height = Je),
      v
        .getContext("2d")
        .putImageData(new ImageData(new Uint8ClampedArray(m.buffer, m.byteOffset, m.byteLength), ut, Je), 0, 0),
      (l = v.toDataURL("image/png")));
  } catch (c) {
    console.warn("brush preview", c);
  }
  return (Es.set(n, l), Es.size > 300 && Es.delete(Es.keys().next().value), l);
}
function on(s, e) {
  return h.doc?.selection ? (s.shift && s.alt ? "intersect" : s.shift ? "add" : s.alt ? "subtract" : e) : "replace";
}
function H(s) {
  return p("span", { class: "opt-label" }, s);
}
function N() {
  return p("span", { class: "opt-sep" });
}
function uo(s) {
  const e = h.setting(s, "replace"),
    t = p("span", { class: "seg" }),
    n = [
      [
        "replace",
        "New selection",
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="5" width="14" height="14"/></svg>',
      ],
      [
        "add",
        "Add to selection (Shift)",
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="11" height="11"/><rect x="10" y="10" width="11" height="11" fill="currentColor" fill-opacity=".25"/></svg>',
      ],
      [
        "subtract",
        "Subtract from selection (Alt)",
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="11" height="11" fill="currentColor" fill-opacity=".25"/><rect x="10" y="10" width="11" height="11" stroke-dasharray="2 2"/></svg>',
      ],
      [
        "intersect",
        "Intersect with selection (Shift+Alt)",
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="11" height="11"/><rect x="10" y="10" width="11" height="11"/><rect x="10" y="10" width="4" height="4" fill="currentColor"/></svg>',
      ],
    ];
  for (const [i, a, o] of n) {
    const r = p("button", {
      class: "ibtn" + (e === i ? " on" : ""),
      title: a,
      html: o,
      onclick: () => {
        (h.set(s, i), k.emit("tool:options"));
      },
    });
    t.appendChild(r);
  }
  return t;
}
function is(s, e, t) {
  const n = p("span", { class: "seg seg-text" });
  for (const i of s) {
    const a = p(
      "button",
      {
        class: "ibtn" + (i.value === e ? " on" : ""),
        title: i.title || i.label,
        onclick: () => {
          t(i.value);
          for (const o of n.children) o.classList.remove("on");
          a.classList.add("on");
        },
      },
      i.label,
    );
    n.appendChild(a);
  }
  return n;
}
function Ot(s, e, t = []) {
  const n = [];
  return (
    hh.forEach((i, a) => {
      a && n.push({ value: "normal", label: "", sep: !0 });
      for (const o of i)
        if ((n.push({ value: o, label: li[o] }), o === "dissolve"))
          for (const r of t) n.push({ value: r, label: li[r] });
    }),
    O(n, s, e)
  );
}
function Me(s, e, t) {
  return q({
    label: s,
    value: Math.round(e * 100),
    min: 0,
    max: 100,
    unit: "%",
    width: 40,
    onInput: (n) => t(n / 100),
  });
}
let Kn = null;
function rc(s, e, t = "") {
  fs();
  const n = s.getBoundingClientRect(),
    i = p("div", { class: "popover " + t }, e);
  ((i.style.left = Math.round(n.left) + "px"),
    (i.style.top = Math.round(n.bottom + 4) + "px"),
    document.body.appendChild(i));
  const a = i.getBoundingClientRect();
  return (
    a.right > window.innerWidth - 8 && (i.style.left = Math.max(8, window.innerWidth - a.width - 8) + "px"),
    a.bottom > window.innerHeight - 8 && (i.style.top = Math.max(8, n.top - a.height - 4) + "px"),
    (Kn = i),
    setTimeout(() => {
      const o = (r) => {
        !i.contains(r.target) && r.target !== s && (fs(), document.removeEventListener("pointerdown", o, !0));
      };
      document.addEventListener("pointerdown", o, !0);
    }),
    i
  );
}
function fs() {
  Kn && (Kn.remove(), (Kn = null));
}
function lc(s, e = 120, t = 28, n = !1) {
  const i = p("img", {
    class: "brush-prev",
    width: e,
    height: t,
    alt: "",
    draggable: !1,
    style: { width: e + "px", height: t + "px" },
  });
  return (
    requestAnimationFrame(() => {
      i.src = Hd(s, [0.91, 0.86, 0.78], n);
    }),
    i
  );
}
const Vd = [
  ["round", "Round"],
  ["square", "Square"],
  ["chalk", "Chalk"],
  ["bristle", "Bristle"],
  ["watercolor", "Watercolor"],
];
function cc(s, e) {
  return p(
    "div",
    { class: "tip-row" },
    ...Vd.map(([t, n]) =>
      p(
        "button",
        {
          class: "chip" + (s.tip === t ? " on" : ""),
          onclick: () => {
            ((s.tip = t), e());
          },
        },
        n,
      ),
    ),
  );
}
function uc(s, e, t = 110, n = 24, i = "preset-list") {
  const a = h.brushFor(s),
    o = p("div", { class: i }),
    r = new Map();
  for (const l of dc()) {
    const c = l.category || "Custom";
    (r.has(c) || r.set(c, []), r.get(c).push(l));
  }
  for (const [l, c] of r) {
    o.appendChild(p("div", { class: "preset-cat" }, l));
    for (const u of c)
      o.appendChild(
        p(
          "div",
          {
            class: "preset" + (u.name === a.name ? " on" : ""),
            title: u.name,
            onclick: () => {
              (hc(a, u, s), e());
            },
          },
          lc(u, t, n, s === "mixer"),
          p("span", null, u.name),
        ),
      );
  }
  return o;
}
function hc(s, e, t) {
  const n = t === "mixer" ? { mixWet: s.mixWet, mixLoad: s.mixLoad } : {};
  (Object.assign(s, { ...Ys, ...e, ...(e.mixWet === Ys.mixWet ? n : {}) }), k.emit("tool:options"));
}
function Ln(s) {
  const e = h.brushFor(s),
    t = p(
      "button",
      { class: "brush-btn", title: "Brush preset picker" },
      p("span", { class: "brush-dot", style: { "--hard": String(e.hardness) } }),
      p("span", { class: "brush-size" }, String(Math.round(e.size))),
      p("span", { class: "brush-name" }, e.name),
      Ks(R.chevronDown, "ico small"),
    );
  return (
    t.addEventListener("click", () => {
      const n = p("div", { class: "brush-pop" }),
        i = () => {
          ((n.innerHTML = ""),
            n.append(
              Q({
                label: "Size",
                value: e.size,
                min: 1,
                max: 2500,
                unit: "px",
                onInput: (a) => {
                  ((e.size = a), k.emit("tool:options:soft"));
                },
              }),
              Q({
                label: "Hardness",
                value: Math.round(e.hardness * 100),
                min: 0,
                max: 100,
                unit: "%",
                onInput: (a) => {
                  e.hardness = a / 100;
                },
              }),
              cc(e, i),
              uc(s, () => fs()),
              p(
                "div",
                { class: "pop-actions" },
                p(
                  "button",
                  {
                    class: "btn small",
                    onclick: () => {
                      (fs(),
                        re(
                          async () => {
                            const { dock: a } = await Promise.resolve().then(() => _d);
                            return { dock: a };
                          },
                          void 0,
                          import.meta.url,
                        ).then(({ dock: a }) => a.show("brushes")));
                    },
                  },
                  "All brush settings…",
                ),
                p(
                  "button",
                  {
                    class: "btn small",
                    onclick: async () => {
                      const { promptText: a } = await re(
                          async () => {
                            const { promptText: r } = await Promise.resolve().then(() => Yl);
                            return { promptText: r };
                          },
                          void 0,
                          import.meta.url,
                        ),
                        o = await a("Save Brush Preset", "Name", e.name);
                      o && (h.brushPresets.push({ ...e, name: o, category: "Custom" }), h.savePrefsSoon(), i());
                    },
                  },
                  "Save as preset…",
                ),
              ),
            ));
        };
      (i(), rc(t, n));
    }),
    t
  );
}
const Xd = [
  { category: "General", name: "Soft Round", tip: "round", size: 40, hardness: 0, spacing: 0.1, sizePressure: !0 },
  { category: "General", name: "Hard Round", tip: "round", size: 20, hardness: 1, spacing: 0.08, sizePressure: !0 },
  {
    category: "General",
    name: "Hard Round Pressure Opacity",
    tip: "round",
    size: 24,
    hardness: 0.9,
    opacityPressure: !0,
    sizePressure: !1,
  },
  {
    category: "General",
    name: "Airbrush Soft",
    tip: "round",
    size: 120,
    hardness: 0,
    flow: 0.08,
    buildup: !0,
    sizePressure: !1,
    spacing: 0.05,
  },
  {
    category: "General",
    name: "Flat Square",
    tip: "square",
    size: 30,
    hardness: 0.9,
    roundness: 0.3,
    angle: 35,
    spacing: 0.05,
  },
  {
    category: "General",
    name: "Scatter Dots",
    tip: "round",
    size: 14,
    hardness: 0.8,
    spacing: 1.2,
    scatter: 1.5,
    sizeJitter: 0.6,
    hueJitter: 0.08,
  },
  {
    category: "General",
    name: "Stipple",
    tip: "round",
    size: 6,
    hardness: 0.6,
    spacing: 0.9,
    scatter: 2.2,
    sizeJitter: 0.5,
    flow: 0.7,
    opacityPressure: !0,
  },
  {
    category: "General",
    name: "Glaze",
    tip: "round",
    size: 90,
    hardness: 0.2,
    flow: 0.15,
    opacity: 0.6,
    spacing: 0.08,
    smoothing: 0.4,
  },
  {
    category: "Watercolor",
    name: "Watercolor Wash",
    tip: "watercolor",
    size: 110,
    hardness: 0.35,
    flow: 0.3,
    opacity: 0.7,
    spacing: 0.07,
    wetEdges: 0.9,
    grain: 0.35,
    grainScale: 3.2,
    mode: "multiply",
    minSize: 0.45,
    smoothing: 0.35,
  },
  {
    category: "Watercolor",
    name: "Watercolor Round",
    tip: "watercolor",
    size: 36,
    hardness: 0.5,
    flow: 0.45,
    opacity: 0.8,
    spacing: 0.06,
    wetEdges: 0.75,
    grain: 0.25,
    grainScale: 2.5,
    mode: "multiply",
    minSize: 0.2,
    taper: 25,
    smoothing: 0.3,
  },
  {
    category: "Watercolor",
    name: "Watercolor Dry Bleed",
    tip: "watercolor",
    size: 70,
    hardness: 0.2,
    flow: 0.22,
    opacity: 0.75,
    spacing: 0.1,
    wetEdges: 0.55,
    grain: 0.7,
    grainScale: 2,
    grainPressure: !0,
    mode: "multiply",
    scatter: 0.15,
    sizeJitter: 0.25,
  },
  {
    category: "Oil & Bristle",
    name: "Oil Bristle",
    tip: "bristle",
    size: 52,
    hardness: 0.55,
    spacing: 0.035,
    bristles: 26,
    bristleDry: 700,
    followDirection: !0,
    minSize: 0.45,
    smoothing: 0.2,
  },
  {
    category: "Oil & Bristle",
    name: "Oil Flat",
    tip: "bristle",
    size: 64,
    roundness: 0.32,
    hardness: 0.7,
    spacing: 0.03,
    bristles: 18,
    bristleDry: 900,
    followDirection: !0,
    angle: 90,
    minSize: 0.6,
    smoothing: 0.2,
  },
  {
    category: "Oil & Bristle",
    name: "Dry Brush",
    tip: "bristle",
    size: 58,
    hardness: 0.5,
    spacing: 0.03,
    bristles: 34,
    bristleDry: 240,
    followDirection: !0,
    grain: 0.45,
    grainScale: 2.2,
    minSize: 0.5,
  },
  {
    category: "Oil & Bristle",
    name: "Fan Blender",
    tip: "bristle",
    size: 80,
    roundness: 0.22,
    hardness: 0.4,
    flow: 0.5,
    spacing: 0.03,
    bristles: 40,
    followDirection: !0,
    angle: 90,
    opacity: 0.8,
  },
  {
    category: "Oil & Bristle",
    name: "Mixer Bristle",
    tip: "bristle",
    size: 44,
    hardness: 0.5,
    spacing: 0.05,
    bristles: 26,
    followDirection: !0,
    minSize: 0.4,
    mixWet: 0.6,
    mixLoad: 0.45,
    smoothing: 0.2,
  },
  {
    category: "Ink & Calligraphy",
    name: "Ink Pen",
    tip: "round",
    size: 9,
    hardness: 1,
    spacing: 0.03,
    minSize: 0.05,
    speedSize: 0.55,
    taper: 40,
    smoothing: 0.35,
  },
  {
    category: "Ink & Calligraphy",
    name: "Brush Pen",
    tip: "round",
    size: 24,
    hardness: 0.95,
    spacing: 0.03,
    minSize: 0.02,
    speedSize: 0.35,
    taper: 70,
    smoothing: 0.45,
  },
  {
    category: "Ink & Calligraphy",
    name: "Calligraphy Nib",
    tip: "round",
    size: 28,
    hardness: 1,
    roundness: 0.14,
    angle: 40,
    spacing: 0.02,
    minSize: 0.55,
    taper: 18,
    smoothing: 0.3,
  },
  {
    category: "Ink & Calligraphy",
    name: "Tilt Nib (Art Pen)",
    tip: "round",
    size: 30,
    hardness: 1,
    roundness: 0.12,
    spacing: 0.02,
    tiltAngle: !0,
    twistAngle: !0,
    minSize: 0.5,
    smoothing: 0.25,
  },
  {
    category: "Ink & Calligraphy",
    name: "Technical Pen",
    tip: "round",
    size: 4,
    hardness: 1,
    spacing: 0.05,
    sizePressure: !1,
    smoothing: 0.4,
  },
  {
    category: "Dry Media",
    name: "Graphite Pencil",
    tip: "round",
    size: 5,
    hardness: 0.85,
    spacing: 0.05,
    grain: 0.6,
    grainScale: 1.3,
    grainPressure: !0,
    opacityPressure: !0,
    tiltSize: 2.5,
    tiltOpacity: 0.5,
    minSize: 0.7,
  },
  {
    category: "Dry Media",
    name: "Charcoal",
    tip: "round",
    size: 34,
    roundness: 0.7,
    hardness: 0.55,
    flow: 0.9,
    spacing: 0.06,
    grain: 0.85,
    grainScale: 2.2,
    grainPressure: !0,
    angleJitter: 0.15,
    opacityPressure: !0,
    minSize: 0.6,
    tiltSize: 1.5,
  },
  {
    category: "Dry Media",
    name: "Soft Pastel",
    tip: "round",
    size: 60,
    hardness: 0.25,
    flow: 0.8,
    spacing: 0.08,
    grain: 0.9,
    grainScale: 3.5,
    grainPressure: !0,
    minSize: 0.7,
  },
  {
    category: "Dry Media",
    name: "Conté Crayon",
    tip: "square",
    size: 26,
    roundness: 0.45,
    hardness: 0.8,
    spacing: 0.04,
    grain: 0.75,
    grainScale: 1.8,
    grainPressure: !0,
    followDirection: !0,
    minSize: 0.7,
  },
  {
    category: "Dry Media",
    name: "Chalk",
    tip: "chalk",
    size: 36,
    hardness: 0.7,
    spacing: 0.12,
    sizeJitter: 0.2,
    angleJitter: 0.3,
  },
  {
    category: "Spray & Particles",
    name: "Spray Paint",
    tip: "round",
    size: 80,
    hardness: 0.9,
    flow: 0.5,
    spacing: 0.12,
    particles: 70,
    particleSize: 1.1,
    sizePressure: !1,
    flowPressure: !0,
  },
  {
    category: "Spray & Particles",
    name: "Fine Mist",
    tip: "round",
    size: 140,
    hardness: 0.9,
    flow: 0.45,
    spacing: 0.08,
    particles: 180,
    particleSize: 0.8,
    sizePressure: !1,
    flowPressure: !0,
  },
  {
    category: "Spray & Particles",
    name: "Spatter",
    tip: "round",
    size: 120,
    hardness: 1,
    flow: 0.9,
    spacing: 0.6,
    particles: 9,
    particleSize: 4,
    sizeJitter: 0.4,
    sizePressure: !1,
  },
];
function dc() {
  return [...Xd.map((s) => ({ ...Ys, ...s })), ...h.brushPresets.map((s) => ({ ...Ys, category: "Custom", ...s }))];
}
function na(s, e = {}) {
  const t = h.brushFor(s),
    n = [Ln(s)];
  return (
    e.mode !== !1 &&
      n.push(
        H("Mode"),
        Ot(
          t.mode,
          (i) => {
            t.mode = i;
          },
          ["behind", "clear"],
        ),
      ),
    e.opacity !== !1 &&
      n.push(
        Me("Opacity", t.opacity, (i) => {
          t.opacity = i;
        }),
      ),
    n.push(
      Zo(
        "Pressure controls opacity",
        t.opacityPressure,
        (i) => {
          t.opacityPressure = i;
        },
        "O",
      ),
    ),
    e.flow !== !1 &&
      n.push(
        Me("Flow", t.flow, (i) => {
          t.flow = i;
        }),
      ),
    e.airbrush !== !1 &&
      n.push(
        p("button", {
          class: "ibtn" + (t.buildup ? " on" : ""),
          title: "Airbrush build-up",
          onclick: (i) => {
            ((t.buildup = !t.buildup), i.currentTarget.classList.toggle("on", t.buildup));
          },
          html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 18 14 8l3 3L7 21z"/><path d="M16 4c1 1 3 1 4 0M17 7c1 1 3 1 4 0M15 1.5c.8.8 2.5.8 3.3 0"/></svg>',
        }),
      ),
    e.smoothing !== !1 &&
      n.push(
        Me("Smoothing", t.smoothing, (i) => {
          t.smoothing = i;
        }),
      ),
    n.push(
      Zo(
        "Pressure controls size",
        t.sizePressure,
        (i) => {
          t.sizePressure = i;
        },
        "S",
      ),
    ),
    n.push(
      q({
        label: "Angle",
        value: t.angle,
        min: -180,
        max: 180,
        unit: "°",
        width: 40,
        onInput: (i) => {
          t.angle = i;
        },
      }),
    ),
    n.push(
      q({
        label: "Round",
        value: Math.round(t.roundness * 100),
        min: 1,
        max: 100,
        unit: "%",
        width: 40,
        onInput: (i) => {
          t.roundness = i / 100;
        },
      }),
    ),
    n
  );
}
function Zo(s, e, t, n) {
  const i = p("button", {
    class: "ibtn pressure" + (e ? " on" : ""),
    title: s,
    html: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m4 20 3-1 10-10-2-2L5 17z"/><path d="M15 5l2-2 4 4-2 2"/><text x="14" y="22" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">${n}</text></svg>`,
  });
  return (
    i.addEventListener("click", () => {
      ((e = !e), t(e), i.classList.toggle("on", e));
    }),
    i
  );
}
function rn(s, e, t = !1) {
  const n = p("button", { class: "color-chip" }),
    i = () => {
      const a = s();
      n.style.background = a ? fe(a) : "repeating-linear-gradient(45deg,#c33 0 2px,transparent 2px 6px)";
    };
  return (
    i(),
    n.addEventListener("click", async () => {
      const { pickColor: a } = await re(
          async () => {
            const { pickColor: r } = await Promise.resolve().then(() => Mf);
            return { pickColor: r };
          },
          void 0,
          import.meta.url,
        ),
        o = await a(s() || h.fg, "Select color");
      o && (e(o), i());
    }),
    n.addEventListener("contextmenu", (a) => {
      (a.preventDefault(), t && (e(null), i()));
    }),
    n
  );
}
const Yd = () => ({
  dropShadow: {
    enabled: !1,
    color: [0, 0, 0],
    opacity: 0.6,
    angle: 120,
    distance: 10,
    size: 12,
    spread: 0,
    mode: "multiply",
  },
  outerGlow: { enabled: !1, color: [1, 0.9, 0.6], opacity: 0.6, size: 18, spread: 0, mode: "screen" },
  stroke: { enabled: !1, color: [0.79, 0.64, 0.36], opacity: 1, size: 3, position: "outside", mode: "normal" },
  colorOverlay: { enabled: !1, color: [0.66, 0.27, 0.23], opacity: 1, mode: "normal" },
});
async function Kd() {
  const s = h.doc,
    e = s?.active;
  if (!s || !e) return;
  if (e.kind === "adjustment") throw new Error("Layer styles cannot be applied to adjustment layers.");
  const t = { fx: e.fx ? JSON.parse(JSON.stringify(e.fx)) : void 0, opacity: e.opacity, blend: e.blend },
    n = { ...Yd(), ...(e.fx ? JSON.parse(JSON.stringify(e.fx)) : {}) };
  e.fx = n;
  const i = () => {
      s.invalidate();
    },
    a = new Y(`Layer Style — ${e.name}`, { width: 560, cls: "style-dialog", modal: !1 }),
    o = [
      ["blending", "Blending Options"],
      ["dropShadow", "Drop Shadow"],
      ["outerGlow", "Outer Glow"],
      ["stroke", "Stroke"],
      ["colorOverlay", "Color Overlay"],
    ];
  let r = "blending";
  const l = p("div", { class: "style-nav" }),
    c = p("div", { class: "style-body" }),
    u = (b, x) => {
      const w = p("input", { type: "color", value: qe(b) });
      return (
        w.addEventListener("input", () => {
          const _ = nt(w.value);
          _ && (x(_), i());
        }),
        w
      );
    },
    d = () => {
      te(l);
      for (const [b, x] of o) {
        const w = b !== "blending" ? n[b].enabled : null,
          _ = p(
            "div",
            { class: "style-item" + (r === b ? " on" : "") },
            w === null
              ? p("span", { class: "cb-sp" })
              : (() => {
                  const M = p("input", { type: "checkbox", checked: w });
                  return (
                    M.addEventListener("click", (T) => T.stopPropagation()),
                    M.addEventListener("change", () => {
                      ((n[b].enabled = M.checked), i());
                    }),
                    M
                  );
                })(),
            p("span", null, x),
          );
        (_.addEventListener("click", () => {
          ((r = b), b !== "blending" && (n[b].enabled = !0), i(), d(), m());
        }),
          l.appendChild(_));
      }
    },
    f = (b, x) => p("div", { class: "form-row" }, p("span", { class: "sf-label" }, b), x),
    m = () => {
      if ((te(c), r === "blending")) {
        c.append(
          f(
            "Blend Mode",
            Ot(
              e.blend,
              (_) => {
                ((e.blend = _), i());
              },
              e.kind === "group" ? ["passThrough"] : [],
            ),
          ),
          Q({
            label: "Opacity",
            value: Math.round(e.opacity * 100),
            min: 0,
            max: 100,
            unit: "%",
            onInput: (_) => {
              ((e.opacity = _ / 100), i());
            },
          }),
        );
        return;
      }
      const b = n[r],
        x = f(
          "Blend Mode",
          Ot(b.mode, (_) => {
            ((b.mode = _), i());
          }),
        ),
        w = Q({
          label: "Opacity",
          value: Math.round(b.opacity * 100),
          min: 0,
          max: 100,
          unit: "%",
          onInput: (_) => {
            ((b.opacity = _ / 100), i());
          },
        });
      (r === "dropShadow" &&
        c.append(
          x,
          f(
            "Color",
            u(b.color, (_) => (b.color = _)),
          ),
          w,
          Q({
            label: "Angle",
            value: b.angle,
            min: -180,
            max: 180,
            unit: "°",
            onInput: (_) => {
              ((b.angle = _), i());
            },
          }),
          Q({
            label: "Distance",
            value: b.distance,
            min: 0,
            max: 300,
            unit: "px",
            onInput: (_) => {
              ((b.distance = _), i());
            },
          }),
          Q({
            label: "Spread",
            value: b.spread,
            min: 0,
            max: 100,
            unit: "%",
            onInput: (_) => {
              ((b.spread = _), i());
            },
          }),
          Q({
            label: "Size",
            value: b.size,
            min: 0,
            max: 250,
            unit: "px",
            onInput: (_) => {
              ((b.size = _), i());
            },
          }),
        ),
        r === "outerGlow" &&
          c.append(
            x,
            f(
              "Color",
              u(b.color, (_) => (b.color = _)),
            ),
            w,
            Q({
              label: "Spread",
              value: b.spread,
              min: 0,
              max: 100,
              unit: "%",
              onInput: (_) => {
                ((b.spread = _), i());
              },
            }),
            Q({
              label: "Size",
              value: b.size,
              min: 1,
              max: 250,
              unit: "px",
              onInput: (_) => {
                ((b.size = _), i());
              },
            }),
          ),
        r === "stroke" &&
          c.append(
            Q({
              label: "Size",
              value: b.size,
              min: 1,
              max: 100,
              unit: "px",
              onInput: (_) => {
                ((b.size = _), i());
              },
            }),
            f(
              "Position",
              O(
                [
                  { value: "outside", label: "Outside" },
                  { value: "inside", label: "Inside" },
                  { value: "center", label: "Center" },
                ],
                b.position,
                (_) => {
                  ((b.position = _), i());
                },
              ),
            ),
            x,
            w,
            f(
              "Color",
              u(b.color, (_) => (b.color = _)),
            ),
          ),
        r === "colorOverlay" &&
          c.append(
            x,
            f(
              "Color",
              u(b.color, (_) => (b.color = _)),
            ),
            w,
          ),
        c.append(
          p(
            "div",
            { class: "form-row" },
            $("Enabled", b.enabled, (_) => {
              ((b.enabled = _), i(), d());
            }),
          ),
        ));
    };
  (d(), m(), a.body.append(p("div", { class: "style-wrap" }, l, c)), (a.onOk = () => !0), i());
  const v = await a.show(),
    y = { fx: JSON.parse(JSON.stringify(n)), opacity: e.opacity, blend: e.blend };
  if (((e.fx = t.fx), (e.opacity = t.opacity), (e.blend = t.blend), v)) {
    const b = Object.values(y.fx).some((x) => x?.enabled);
    s.transact("Layer Style", () => {
      ((e.fx = b ? y.fx : void 0), (e.opacity = y.opacity), (e.blend = y.blend));
    });
  }
  (s.invalidate(), k.emit("doc:layers", s));
}
const ia = (s) =>
    "#" +
    s
      .map((e) =>
        Math.round(Math.max(0, Math.min(1, e)) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join(""),
  Tt = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
  Jd = {
    multiply: "multiply",
    screen: "screen",
    overlay: "overlay",
    darken: "darken",
    lighten: "lighten",
    colorDodge: "color-dodge",
    colorBurn: "color-burn",
    hardLight: "hard-light",
    softLight: "soft-light",
    difference: "difference",
    exclusion: "exclusion",
    hue: "hue",
    saturation: "saturation",
    color: "color",
    luminosity: "luminosity",
  };
async function Zd(s, e, t) {
  const n = new OffscreenCanvas(e, t);
  n.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(s), e, t), 0, 0);
  const i = await n.convertToBlob({ type: "image/png" }),
    a = new Uint8Array(await i.arrayBuffer());
  let o = "";
  for (let r = 0; r < a.length; r += 32768) o += String.fromCharCode(...a.subarray(r, r + 32768));
  return "data:image/png;base64," + btoa(o);
}
async function pc(s) {
  let e = 0;
  const t = [],
    n = new Set(),
    i = (c) => {
      const u = [];
      if (
        (c.opacity < 1 && u.push(`opacity="${+c.opacity.toFixed(3)}"`),
        c.blend !== "normal" && c.blend !== "passThrough")
      ) {
        const d = Jd[c.blend];
        d ? u.push(`style="mix-blend-mode:${d}"`) : n.add("some blend modes");
      }
      if (c.vmask && c.vmaskEnabled !== !1 && !Te(c.vmask)) {
        const d = `vm${++e}`;
        (t.push(
          `<clipPath id="${d}"><path d="${Ns(c.vmask)}" clip-rule="${c.vmask.fillRule || "nonzero"}"/></clipPath>`,
        ),
          u.push(`clip-path="url(#${d})"`));
      }
      return u.join(" ");
    },
    a = (c) => {
      const u = Ns(c.path),
        d = c.path.fillRule || "nonzero",
        f = c.fill
          ? `fill="${ia(c.fill)}"${(c.fillOpacity ?? 1) < 1 ? ` fill-opacity="${c.fillOpacity}"` : ""} fill-rule="${d}"`
          : 'fill="none"';
      if (!c.stroke || c.strokeWidth <= 0) return `<path d="${u}" ${f}/>`;
      const m = c.dash.length
          ? ` stroke-dasharray="${c.dash.map((b) => +(b * c.strokeWidth).toFixed(3)).join(" ")}"`
          : "",
        v = (b) =>
          `stroke="${ia(c.stroke)}" stroke-width="${+b.toFixed(3)}" stroke-linejoin="${c.join}" stroke-linecap="${c.cap}"${m}`;
      if (c.strokeAlign === "center") return `<path d="${u}" ${f} ${v(c.strokeWidth)}/>`;
      const y = `sa${++e}`;
      return c.strokeAlign === "inside"
        ? (t.push(`<clipPath id="${y}"><path d="${u}" clip-rule="${d}"/></clipPath>`),
          `<path d="${u}" ${f}/><path d="${u}" fill="none" ${v(c.strokeWidth * 2)} clip-path="url(#${y})"/>`)
        : (t.push(
            `<mask id="${y}" maskUnits="userSpaceOnUse" x="0" y="0" width="${s.width}" height="${s.height}"><rect width="${s.width}" height="${s.height}" fill="#fff"/><path d="${u}" fill="#000" fill-rule="${d}"/></mask>`,
          ),
          `<path d="${u}" fill="none" ${v(c.strokeWidth * 2)} mask="url(#${y})"/><path d="${u}" ${f}/>`);
    },
    o = (c) => {
      const u = `font-family="${Tt(c.font)}, sans-serif" font-size="${c.size}" font-weight="${c.weight}"${c.italic ? ' font-style="italic"' : ""}${c.tracking ? ` letter-spacing="${c.tracking}"` : ""}${c.underline ? ' text-decoration="underline"' : ""} fill="${ia(c.color)}"`;
      if (c.path && !Te(c.path)) {
        const w = `tp${++e}`;
        t.push(`<path id="${w}" d="${Ns(c.path)}"/>`);
        const _ = c.align === "center" ? ' text-anchor="middle"' : c.align === "right" ? ' text-anchor="end"' : "",
          M = c.align === "center" ? "50%" : c.align === "right" ? "100%" : `${c.pathOffset || 0}`;
        return `<text ${u}${_}><textPath href="#${w}" startOffset="${M}">${Tt(c.text.replace(/\n/g, " "))}</textPath></text>`;
      }
      const d = c.size * c.lineHeight,
        f = c.text.split(`
`),
        m = c.align === "center" ? "middle" : c.align === "right" ? "end" : "start",
        v = new OffscreenCanvas(4, 4).getContext("2d");
      ((v.font = `${c.italic ? "italic " : ""}${c.weight} ${c.size}px "${c.font}", sans-serif`),
        (v.letterSpacing = `${c.tracking}px`));
      const y = Math.max(1, ...f.map((w) => v.measureText(w || " ").width)),
        b = c.align === "center" ? c.x + y / 2 : c.align === "right" ? c.x + y : c.x,
        x = f
          .map(
            (w, _) =>
              `<tspan x="${+b.toFixed(2)}" y="${+(c.y + _ * d + c.size * 0.82 + (d - c.size) / 2).toFixed(2)}">${Tt(w) || " "}</tspan>`,
          )
          .join("");
      return `<text ${u} text-anchor="${m}" xml:space="preserve">${x}</text>`;
    },
    r = async (c) => {
      if (!c.visible) return "";
      const u = i(c);
      if (c.kind === "group") {
        const b = (await Promise.all([...c.children].reverse().map(r))).join(`
`);
        return (
          c.mask && n.add("group pixel masks"),
          `<g id="${Tt(c.name)}" ${u}>
${b}
</g>`
        );
      }
      if (c.kind === "adjustment") return (n.add("adjustment layers"), "");
      const d = !c.mask && !c.fx;
      if (c.kind === "shape" && c.shape && d) return `<g id="${Tt(c.name)}" ${u}>${a(c.shape)}</g>`;
      if (c.kind === "text" && c.text && d) return `<g id="${Tt(c.name)}" ${u}>${o(c.text)}</g>`;
      const f = Wr(s, { ...c, vmask: null, vmaskTex: null }, "rgba16f"),
        m = ks(f);
      if (!m) return (g.dispose(f), "");
      const v = g.read8(f, m);
      g.dispose(f);
      const y = await Zd(v, m.w, m.h);
      return `<g id="${Tt(c.name)}" ${u}><image x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" href="${y}"/></g>`;
    },
    l = (await Promise.all([...s.layers].reverse().map(r))).join(`
`);
  return (
    n.size &&
      h.notify(
        `SVG can’t represent ${[...n].join(", ")}: ${n.has("adjustment layers") ? "adjustment layers were left out; " : ""}merge them into pixels first if you need them.`,
        "info",
        7e3,
      ),
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${s.width}" height="${s.height}" viewBox="0 0 ${s.width} ${s.height}">
<defs>${t.join(`
`)}</defs>
${l}
</svg>
`
  );
}
const Pa = [1, 0, 0, 0, 1, 0, 0, 0, 1],
  Ws = (s, e) => [
    s[0] * e[0] + s[1] * e[3],
    s[0] * e[1] + s[1] * e[4],
    s[0] * e[2] + s[1] * e[5] + s[2],
    s[3] * e[0] + s[4] * e[3],
    s[3] * e[1] + s[4] * e[4],
    s[3] * e[2] + s[4] * e[5] + s[5],
    0,
    0,
    1,
  ];
function Qd(s) {
  let e = Pa;
  if (!s) return e;
  const t = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let n;
  for (; (n = t.exec(s));) {
    const i = n[2]
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    let a = Pa;
    switch (n[1]) {
      case "matrix":
        a = [i[0], i[2], i[4], i[1], i[3], i[5], 0, 0, 1];
        break;
      case "translate":
        a = [1, 0, i[0] || 0, 0, 1, i[1] || 0, 0, 0, 1];
        break;
      case "scale":
        a = [i[0], 0, 0, 0, i.length > 1 ? i[1] : i[0], 0, 0, 0, 1];
        break;
      case "rotate": {
        const o = ((i[0] || 0) * Math.PI) / 180,
          r = Math.cos(o),
          l = Math.sin(o);
        ((a = [r, -l, 0, l, r, 0, 0, 0, 1]),
          i.length > 2 && (a = Ws(Ws([1, 0, i[1], 0, 1, i[2], 0, 0, 1], a), [1, 0, -i[1], 0, 1, -i[2], 0, 0, 1])));
        break;
      }
      case "skewX":
        a = [1, Math.tan((i[0] * Math.PI) / 180), 0, 0, 1, 0, 0, 0, 1];
        break;
      case "skewY":
        a = [1, 0, 0, Math.tan((i[0] * Math.PI) / 180), 1, 0, 0, 0, 1];
        break;
    }
    e = Ws(e, a);
  }
  return e;
}
function Qo(s, e) {
  if (!s || s === "inherit") return e;
  if (((s = s.trim()), s === "none" || s === "transparent")) return null;
  if (s.startsWith("url(")) return "unsupported";
  if (s === "currentColor") return [0, 0, 0];
  const t = document.createElement("canvas").getContext("2d");
  ((t.fillStyle = "#010203"), (t.fillStyle = s));
  const n = t.fillStyle;
  if (n === "#010203" && s.toLowerCase() !== "#010203") return "unsupported";
  if (n.startsWith("#"))
    return [parseInt(n.slice(1, 3), 16) / 255, parseInt(n.slice(3, 5), 16) / 255, parseInt(n.slice(5, 7), 16) / 255];
  const i = n.match(/rgba?\(([^)]+)\)/);
  if (i) {
    const a = i[1].split(",").map(Number);
    return [a[0] / 255, a[1] / 255, a[2] / 255];
  }
  return "unsupported";
}
function ep(s, e) {
  const t = (r) => {
      const l = s.getAttribute("style");
      if (l) {
        const c = l.match(new RegExp(`(?:^|;)\\s*${r}\\s*:\\s*([^;]+)`));
        if (c) return c[1].trim();
      }
      return s.getAttribute(r);
    },
    n = Qo(t("fill"), e.fill),
    i = Qo(t("stroke"), e.stroke);
  if (n === "unsupported" || i === "unsupported" || t("filter") || t("mask")) return "unsupported";
  const a = (r, l) => {
      const c = t(r);
      return c == null ? l : parseFloat(c);
    },
    o = t("stroke-dasharray");
  return {
    fill: n,
    stroke: i,
    sw: a("stroke-width", e.sw),
    opacity: a("opacity", 1),
    fillOpacity: a("fill-opacity", e.fillOpacity),
    strokeOpacity: a("stroke-opacity", e.strokeOpacity),
    rule: t("fill-rule") || e.rule,
    join: t("stroke-linejoin") || e.join,
    cap: t("stroke-linecap") || e.cap,
    dash:
      o && o !== "none"
        ? o
            .split(/[\s,]+/)
            .map(Number)
            .filter((r) => !isNaN(r))
        : e.dash,
    display: t("display") !== "none" && t("visibility") !== "hidden",
  };
}
async function fc(s, e) {
  const n = new DOMParser().parseFromString(s, "image/svg+xml").documentElement;
  if (!n || n.nodeName.toLowerCase() !== "svg") throw new Error("Not an SVG file.");
  const i = (n.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number),
    a = (v) => (v ? parseFloat(v) : NaN);
  let o = a(n.getAttribute("width")),
    r = a(n.getAttribute("height"));
  (i.length === 4 && !isNaN(i[2]) && (isNaN(o) && (o = i[2]), isNaN(r) && (r = i[3])),
    (/%/.test(n.getAttribute("width") || "") || isNaN(o)) && (o = i.length === 4 ? i[2] : 1e3),
    (/%/.test(n.getAttribute("height") || "") || isNaN(r)) && (r = i.length === 4 ? i[3] : 1e3),
    (o = Math.max(1, Math.round(o))),
    (r = Math.max(1, Math.round(r))));
  let l = Pa;
  i.length === 4 &&
    i[2] > 0 &&
    i[3] > 0 &&
    (l = Ws([o / i[2], 0, 0, 0, r / i[3], 0, 0, 0, 1], [1, 0, -i[0], 0, 1, -i[1], 0, 0, 1]));
  const c = [];
  let u = !1;
  const d = {
      fill: [0, 0, 0],
      stroke: null,
      sw: 1,
      fillOpacity: 1,
      strokeOpacity: 1,
      rule: "nonzero",
      join: "miter",
      cap: "butt",
      dash: [],
    },
    f = (v, y, b, x) => {
      const w = v.nodeName.replace(/^svg:/, "").toLowerCase();
      if (
        [
          "defs",
          "title",
          "desc",
          "metadata",
          "style",
          "clippath",
          "mask",
          "lineargradient",
          "radialgradient",
          "pattern",
          "symbol",
          "marker",
          "filter",
        ].includes(w)
      )
        return;
      const _ = ep(v, b);
      if (_ === "unsupported") {
        u = !0;
        return;
      }
      if (!_.display) return;
      const M = Ws(y, Qd(v.getAttribute("transform"))),
        T = x * _.opacity;
      if (v.getAttribute("clip-path")) {
        u = !0;
        return;
      }
      const C = (S) => parseFloat(v.getAttribute(S) || "0");
      let A = null;
      switch (w) {
        case "svg":
        case "g":
        case "a":
          for (const S of Array.from(v.children)) f(S, M, _, T);
          return;
        case "path":
          A = Yr(v.getAttribute("d") || "", _.rule);
          break;
        case "rect": {
          const S = C("x"),
            P = C("y"),
            E = C("width"),
            D = C("height"),
            j = C("rx") || C("ry");
          A = { subpaths: [di(S, P, S + E, P + D, j)], fillRule: _.rule };
          break;
        }
        case "circle": {
          const S = C("cx"),
            P = C("cy"),
            E = C("r");
          A = { subpaths: [pi(S - E, P - E, S + E, P + E)], fillRule: _.rule };
          break;
        }
        case "ellipse": {
          const S = C("cx"),
            P = C("cy"),
            E = C("rx"),
            D = C("ry");
          A = { subpaths: [pi(S - E, P - D, S + E, P + D)], fillRule: _.rule };
          break;
        }
        case "line":
          A = {
            subpaths: [
              Js(
                [
                  [C("x1"), C("y1")],
                  [C("x2"), C("y2")],
                ],
                !1,
              ),
            ],
            fillRule: _.rule,
          };
          break;
        case "polyline":
        case "polygon": {
          const S = (v.getAttribute("points") || "")
              .trim()
              .split(/[\s,]+/)
              .map(Number),
            P = [];
          for (let E = 0; E + 1 < S.length; E += 2) P.push([S[E], S[E + 1]]);
          A = { subpaths: [Js(P, w === "polygon")], fillRule: _.rule };
          break;
        }
        default:
          u = !0;
          return;
      }
      if (!A || Te(A)) return;
      const F = Math.sqrt(Math.abs(M[0] * M[4] - M[1] * M[3])) || 1;
      c.push({
        name: v.getAttribute("id") || v.getAttribute("inkscape:label") || w,
        path: Rt(A, M),
        st: { ..._, sw: _.sw * F, dash: _.dash.map((S) => S * F), opacity: T },
      });
    };
  f(n, l, d, 1);
  const m = new xs(e, o, r, 8);
  if (u || !c.length) {
    const v = new Blob([s], { type: "image/svg+xml" }),
      y = URL.createObjectURL(v);
    try {
      const b = new Image();
      ((b.src = y), await b.decode());
      const x = new OffscreenCanvas(o, r);
      x.getContext("2d").drawImage(b, 0, 0, o, r);
      const w = le("raster", e),
        _ = m.newLayerTex(),
        M = g.uploadImage8(x, o, r);
      (g.copy(M, _),
        g.dispose(M),
        (w.tex = _),
        (m.layers = [w]),
        (m.activeId = w.id),
        m.selectedIds.add(w.id),
        h.notify(
          "This SVG uses features BrushBoard keeps as pixels (gradients, text, images or filters): it was opened as one layer.",
          "info",
          6e3,
        ));
    } finally {
      URL.revokeObjectURL(y);
    }
  } else {
    const v = new Map();
    for (const y of c) {
      const b = y.name,
        x = (v.get(b) || 0) + 1;
      v.set(b, x);
      const w = _n(y.path, y.st.fill, y.st.stroke, y.st.stroke ? y.st.sw : 0);
      ((w.fillOpacity = y.st.fillOpacity),
        (w.join = y.st.join),
        (w.cap = y.st.cap),
        (w.dash = y.st.dash.length && y.st.sw ? y.st.dash.map((M) => M / y.st.sw) : []));
      const _ = le("shape", x > 1 ? `${b} ${x}` : b, {
        opacity: y.st.opacity * (y.st.stroke && !y.st.fill ? y.st.strokeOpacity : 1),
      });
      ((_.shape = w), je(m, _), m.layers.unshift(_));
    }
    ((m.activeId = m.layers[0].id), m.selectedIds.add(m.activeId));
  }
  return (m.invalidate(), m);
}
const tp = Object.freeze(
  Object.defineProperty({ __proto__: null, exportSvg: pc, importSvg: fc }, Symbol.toStringTag, { value: "Module" }),
);
var er = {},
  sp = function (s, e, t, n, i) {
    var a = new Worker(
      er[e] ||
        (er[e] = URL.createObjectURL(
          new Blob(
            [s + ';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'],
            { type: "text/javascript" },
          ),
        )),
    );
    return (
      (a.onmessage = function (o) {
        var r = o.data,
          l = r.$e$;
        if (l) {
          var c = new Error(l[0]);
          ((c.code = l[1]), (c.stack = l[2]), i(c, null));
        } else i(null, r);
      }),
      a.postMessage(t, n),
      a
    );
  },
  ne = Uint8Array,
  Se = Uint16Array,
  An = Int32Array,
  Ms = new ne([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0]),
  Ss = new ne([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0]),
  ln = new ne([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]),
  mc = function (s, e) {
    for (var t = new Se(31), n = 0; n < 31; ++n) t[n] = e += 1 << s[n - 1];
    for (var i = new An(t[30]), n = 1; n < 30; ++n) for (var a = t[n]; a < t[n + 1]; ++a) i[a] = ((a - t[n]) << 5) | n;
    return { b: t, r: i };
  },
  gc = mc(Ms, 2),
  ho = gc.b,
  _i = gc.r;
((ho[28] = 258), (_i[258] = 28));
var vc = mc(Ss, 0),
  yc = vc.b,
  Ca = vc.r,
  cn = new Se(32768);
for (var ee = 0; ee < 32768; ++ee) {
  var ct = ((ee & 43690) >> 1) | ((ee & 21845) << 1);
  ((ct = ((ct & 52428) >> 2) | ((ct & 13107) << 2)),
    (ct = ((ct & 61680) >> 4) | ((ct & 3855) << 4)),
    (cn[ee] = (((ct & 65280) >> 8) | ((ct & 255) << 8)) >> 1));
}
var Oe = function (s, e, t) {
    for (var n = s.length, i = 0, a = new Se(e); i < n; ++i) s[i] && ++a[s[i] - 1];
    var o = new Se(e);
    for (i = 1; i < e; ++i) o[i] = (o[i - 1] + a[i - 1]) << 1;
    var r;
    if (t) {
      r = new Se(1 << e);
      var l = 15 - e;
      for (i = 0; i < n; ++i)
        if (s[i])
          for (var c = (i << 4) | s[i], u = e - s[i], d = o[s[i] - 1]++ << u, f = d | ((1 << u) - 1); d <= f; ++d)
            r[cn[d] >> l] = c;
    } else for (r = new Se(n), i = 0; i < n; ++i) s[i] && (r[i] = cn[o[s[i] - 1]++] >> (15 - s[i]));
    return r;
  },
  it = new ne(288);
for (var ee = 0; ee < 144; ++ee) it[ee] = 8;
for (var ee = 144; ee < 256; ++ee) it[ee] = 9;
for (var ee = 256; ee < 280; ++ee) it[ee] = 7;
for (var ee = 280; ee < 288; ++ee) it[ee] = 8;
var ms = new ne(32);
for (var ee = 0; ee < 32; ++ee) ms[ee] = 5;
var bc = Oe(it, 9, 0),
  wc = Oe(it, 9, 1),
  xc = Oe(ms, 5, 0),
  kc = Oe(ms, 5, 1),
  Jn = function (s) {
    for (var e = s[0], t = 1; t < s.length; ++t) s[t] > e && (e = s[t]);
    return e;
  },
  De = function (s, e, t) {
    var n = (e / 8) | 0;
    return ((s[n] | (s[n + 1] << 8)) >> (e & 7)) & t;
  },
  Zn = function (s, e) {
    var t = (e / 8) | 0;
    return (s[t] | (s[t + 1] << 8) | (s[t + 2] << 16)) >> (e & 7);
  },
  Rn = function (s) {
    return ((s + 7) / 8) | 0;
  },
  $t = function (s, e, t) {
    return ((e == null || e < 0) && (e = 0), (t == null || t > s.length) && (t = s.length), new ne(s.subarray(e, t)));
  },
  _c = [
    "unexpected EOF",
    "invalid block type",
    "invalid length/literal",
    "invalid distance",
    "stream finished",
    "no stream handler",
    ,
    "no callback",
    "invalid UTF-8 data",
    "extra field too long",
    "date not in range 1980-2099",
    "filename too long",
    "stream finishing",
    "invalid zip data",
  ],
  ce = function (s, e, t) {
    var n = new Error(e || _c[s]);
    if (((n.code = s), Error.captureStackTrace && Error.captureStackTrace(n, ce), !t)) throw n;
    return n;
  },
  Mc = function (s, e, t, n) {
    var i = s.length,
      a = n ? n.length : 0;
    if (!i || (e.f && !e.l)) return t || new ne(0);
    var o = !t,
      r = o || e.i != 2,
      l = e.i;
    o && (t = new ne(i * 3));
    var c = function (Ps) {
        var Cs = t.length;
        if (Ps > Cs) {
          var jt = new ne(Math.max(Cs * 2, Ps));
          (jt.set(t), (t = jt));
        }
      },
      u = e.f || 0,
      d = e.p || 0,
      f = e.b || 0,
      m = e.l,
      v = e.d,
      y = e.m,
      b = e.n,
      x = i * 8;
    do {
      if (!m) {
        u = De(s, d, 1);
        var w = De(s, d + 1, 3);
        if (((d += 3), w))
          if (w == 1) ((m = wc), (v = kc), (y = 9), (b = 5));
          else if (w == 2) {
            var C = De(s, d, 31) + 257,
              A = De(s, d + 10, 15) + 4,
              F = C + De(s, d + 5, 31) + 1;
            d += 14;
            for (var S = new ne(F), P = new ne(19), E = 0; E < A; ++E) P[ln[E]] = De(s, d + E * 3, 7);
            d += A * 3;
            for (var D = Jn(P), j = (1 << D) - 1, U = Oe(P, D, 1), E = 0; E < F;) {
              var V = U[De(s, d, j)];
              d += V & 15;
              var _ = V >> 4;
              if (_ < 16) S[E++] = _;
              else {
                var G = 0,
                  Z = 0;
                for (
                  _ == 16
                    ? ((Z = 3 + De(s, d, 3)), (d += 2), (G = S[E - 1]))
                    : _ == 17
                      ? ((Z = 3 + De(s, d, 7)), (d += 3))
                      : _ == 18 && ((Z = 11 + De(s, d, 127)), (d += 7));
                  Z--;
                )
                  S[E++] = G;
              }
            }
            var X = S.subarray(0, C),
              ie = S.subarray(C);
            ((y = Jn(X)), (b = Jn(ie)), (m = Oe(X, y, 1)), (v = Oe(ie, b, 1)));
          } else ce(1);
        else {
          var _ = Rn(d) + 4,
            M = s[_ - 4] | (s[_ - 3] << 8),
            T = _ + M;
          if (T > i) {
            l && ce(0);
            break;
          }
          (r && c(f + M), t.set(s.subarray(_, T), f), (e.b = f += M), (e.p = d = T * 8), (e.f = u));
          continue;
        }
        if (d > x) {
          l && ce(0);
          break;
        }
      }
      r && c(f + 131072);
      for (var Pe = (1 << y) - 1, ge = (1 << b) - 1, Fe = d; ; Fe = d) {
        var G = m[Zn(s, d) & Pe],
          Ce = G >> 4;
        if (((d += G & 15), d > x)) {
          l && ce(0);
          break;
        }
        if ((G || ce(2), Ce < 256)) t[f++] = Ce;
        else if (Ce == 256) {
          ((Fe = d), (m = null));
          break;
        } else {
          var Ee = Ce - 254;
          if (Ce > 264) {
            var E = Ce - 257,
              oe = Ms[E];
            ((Ee = De(s, d, (1 << oe) - 1) + ho[E]), (d += oe));
          }
          var Ge = v[Zn(s, d) & ge],
            qt = Ge >> 4;
          (Ge || ce(3), (d += Ge & 15));
          var ie = yc[qt];
          if (qt > 3) {
            var oe = Ss[qt];
            ((ie += Zn(s, d) & ((1 << oe) - 1)), (d += oe));
          }
          if (d > x) {
            l && ce(0);
            break;
          }
          r && c(f + 131072);
          var Nt = f + Ee;
          if (f < ie) {
            var Fn = a - ie,
              Dn = Math.min(ie, Nt);
            for (Fn + f < 0 && ce(3); f < Dn; ++f) t[f] = n[Fn + f];
          }
          for (; f < Nt; ++f) t[f] = t[f - ie];
        }
      }
      ((e.l = m), (e.p = Fe), (e.b = f), (e.f = u), m && ((u = 1), (e.m = y), (e.d = v), (e.n = b)));
    } while (!u);
    return f != t.length && o ? $t(t, 0, f) : t.subarray(0, f);
  },
  Ue = function (s, e, t) {
    t <<= e & 7;
    var n = (e / 8) | 0;
    ((s[n] |= t), (s[n + 1] |= t >> 8));
  },
  Kt = function (s, e, t) {
    t <<= e & 7;
    var n = (e / 8) | 0;
    ((s[n] |= t), (s[n + 1] |= t >> 8), (s[n + 2] |= t >> 16));
  },
  Qn = function (s, e) {
    for (var t = [], n = 0; n < s.length; ++n) s[n] && t.push({ s: n, f: s[n] });
    var i = t.length,
      a = t.slice();
    if (!i) return { t: fo, l: 0 };
    if (i == 1) {
      var o = new ne(t[0].s + 1);
      return ((o[t[0].s] = 1), { t: o, l: 1 });
    }
    (t.sort(function (T, C) {
      return T.f - C.f;
    }),
      t.push({ s: -1, f: 25001 }));
    var r = t[0],
      l = t[1],
      c = 0,
      u = 1,
      d = 2;
    for (t[0] = { s: -1, f: r.f + l.f, l: r, r: l }; u != i - 1;)
      ((r = t[t[c].f < t[d].f ? c++ : d++]),
        (l = t[c != u && t[c].f < t[d].f ? c++ : d++]),
        (t[u++] = { s: -1, f: r.f + l.f, l: r, r: l }));
    for (var f = a[0].s, n = 1; n < i; ++n) a[n].s > f && (f = a[n].s);
    var m = new Se(f + 1),
      v = Mi(t[u - 1], m, 0);
    if (v > e) {
      var n = 0,
        y = 0,
        b = v - e,
        x = 1 << b;
      for (
        a.sort(function (C, A) {
          return m[A.s] - m[C.s] || C.f - A.f;
        });
        n < i;
        ++n
      ) {
        var w = a[n].s;
        if (m[w] > e) ((y += x - (1 << (v - m[w]))), (m[w] = e));
        else break;
      }
      for (y >>= b; y > 0;) {
        var _ = a[n].s;
        m[_] < e ? (y -= 1 << (e - m[_]++ - 1)) : ++n;
      }
      for (; n >= 0 && y; --n) {
        var M = a[n].s;
        m[M] == e && (--m[M], ++y);
      }
      v = e;
    }
    return { t: new ne(m), l: v };
  },
  Mi = function (s, e, t) {
    return s.s == -1 ? Math.max(Mi(s.l, e, t + 1), Mi(s.r, e, t + 1)) : (e[s.s] = t);
  },
  Ea = function (s) {
    for (var e = s.length; e && !s[--e];);
    for (
      var t = new Se(++e),
        n = 0,
        i = s[0],
        a = 1,
        o = function (l) {
          t[n++] = l;
        },
        r = 1;
      r <= e;
      ++r
    )
      if (s[r] == i && r != e) ++a;
      else {
        if (!i && a > 2) {
          for (; a > 138; a -= 138) o(32754);
          a > 2 && (o(a > 10 ? ((a - 11) << 5) | 28690 : ((a - 3) << 5) | 12305), (a = 0));
        } else if (a > 3) {
          for (o(i), --a; a > 6; a -= 6) o(8304);
          a > 2 && (o(((a - 3) << 5) | 8208), (a = 0));
        }
        for (; a--;) o(i);
        ((a = 1), (i = s[r]));
      }
    return { c: t.subarray(0, n), n: e };
  },
  Jt = function (s, e) {
    for (var t = 0, n = 0; n < e.length; ++n) t += s[n] * e[n];
    return t;
  },
  po = function (s, e, t) {
    var n = t.length,
      i = Rn(e + 2);
    ((s[i] = n & 255), (s[i + 1] = n >> 8), (s[i + 2] = s[i] ^ 255), (s[i + 3] = s[i + 1] ^ 255));
    for (var a = 0; a < n; ++a) s[i + a + 4] = t[a];
    return (i + 4 + n) * 8;
  },
  La = function (s, e, t, n, i, a, o, r, l, c, u) {
    (Ue(e, u++, t), ++i[256]);
    for (
      var d = Qn(i, 15),
        f = d.t,
        m = d.l,
        v = Qn(a, 15),
        y = v.t,
        b = v.l,
        x = Ea(f),
        w = x.c,
        _ = x.n,
        M = Ea(y),
        T = M.c,
        C = M.n,
        A = new Se(19),
        F = 0;
      F < w.length;
      ++F
    )
      ++A[w[F] & 31];
    for (var F = 0; F < T.length; ++F) ++A[T[F] & 31];
    for (var S = Qn(A, 7), P = S.t, E = S.l, D = 19; D > 4 && !P[ln[D - 1]]; --D);
    var j = (c + 5) << 3,
      U = Jt(i, it) + Jt(a, ms) + o,
      V = Jt(i, f) + Jt(a, y) + o + 14 + 3 * D + Jt(A, P) + 2 * A[16] + 3 * A[17] + 7 * A[18];
    if (l >= 0 && j <= U && j <= V) return po(e, u, s.subarray(l, l + c));
    var G, Z, X, ie;
    if ((Ue(e, u, 1 + (V < U)), (u += 2), V < U)) {
      ((G = Oe(f, m, 0)), (Z = f), (X = Oe(y, b, 0)), (ie = y));
      var Pe = Oe(P, E, 0);
      (Ue(e, u, _ - 257), Ue(e, u + 5, C - 1), Ue(e, u + 10, D - 4), (u += 14));
      for (var F = 0; F < D; ++F) Ue(e, u + 3 * F, P[ln[F]]);
      u += 3 * D;
      for (var ge = [w, T], Fe = 0; Fe < 2; ++Fe)
        for (var Ce = ge[Fe], F = 0; F < Ce.length; ++F) {
          var Ee = Ce[F] & 31;
          (Ue(e, u, Pe[Ee]), (u += P[Ee]), Ee > 15 && (Ue(e, u, (Ce[F] >> 5) & 127), (u += Ce[F] >> 12)));
        }
    } else ((G = bc), (Z = it), (X = xc), (ie = ms));
    for (var F = 0; F < r; ++F) {
      var oe = n[F];
      if (oe > 255) {
        var Ee = (oe >> 18) & 31;
        (Kt(e, u, G[Ee + 257]), (u += Z[Ee + 257]), Ee > 7 && (Ue(e, u, (oe >> 23) & 31), (u += Ms[Ee])));
        var Ge = oe & 31;
        (Kt(e, u, X[Ge]), (u += ie[Ge]), Ge > 3 && (Kt(e, u, (oe >> 5) & 8191), (u += Ss[Ge])));
      } else (Kt(e, u, G[oe]), (u += Z[oe]));
    }
    return (Kt(e, u, G[256]), u + Z[256]);
  },
  Sc = new An([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]),
  fo = new ne(0),
  Tc = function (s, e, t, n, i, a) {
    var o = a.z || s.length,
      r = new ne(n + o + 5 * (1 + Math.ceil(o / 7e3)) + i),
      l = r.subarray(n, r.length - i),
      c = a.l,
      u = (a.r || 0) & 7;
    if (e) {
      u && (l[0] = a.r >> 3);
      for (
        var d = Sc[e - 1],
          f = d >> 13,
          m = d & 8191,
          v = (1 << t) - 1,
          y = a.p || new Se(32768),
          b = a.h || new Se(v + 1),
          x = Math.ceil(t / 3),
          w = 2 * x,
          _ = function (Xi) {
            return (s[Xi] ^ (s[Xi + 1] << x) ^ (s[Xi + 2] << w)) & v;
          },
          M = new An(25e3),
          T = new Se(288),
          C = new Se(32),
          A = 0,
          F = 0,
          S = a.i || 0,
          P = 0,
          E = a.w || 0,
          D = 0;
        S + 2 < o;
        ++S
      ) {
        var j = _(S),
          U = S & 32767,
          V = b[j];
        if (((y[U] = V), (b[j] = U), E <= S)) {
          var G = o - S;
          if ((A > 7e3 || P > 24576) && (G > 423 || !c)) {
            ((u = La(s, l, 0, M, T, C, F, P, D, S - D, u)), (P = A = F = 0), (D = S));
            for (var Z = 0; Z < 286; ++Z) T[Z] = 0;
            for (var Z = 0; Z < 30; ++Z) C[Z] = 0;
          }
          var X = 2,
            ie = 0,
            Pe = m,
            ge = (U - V) & 32767;
          if (G > 2 && j == _(S - ge))
            for (
              var Fe = Math.min(f, G) - 1, Ce = Math.min(32767, S), Ee = Math.min(258, G);
              ge <= Ce && --Pe && U != V;
            ) {
              if (s[S + X] == s[S + X - ge]) {
                for (var oe = 0; oe < Ee && s[S + oe] == s[S + oe - ge]; ++oe);
                if (oe > X) {
                  if (((X = oe), (ie = ge), oe > Fe)) break;
                  for (var Ge = Math.min(ge, oe - 2), qt = 0, Z = 0; Z < Ge; ++Z) {
                    var Nt = (S - ge + Z) & 32767,
                      Fn = y[Nt],
                      Dn = (Nt - Fn) & 32767;
                    Dn > qt && ((qt = Dn), (V = Nt));
                  }
                }
              }
              ((U = V), (V = y[U]), (ge += (U - V) & 32767));
            }
          if (ie) {
            M[P++] = 268435456 | (_i[X] << 18) | Ca[ie];
            var Ps = _i[X] & 31,
              Cs = Ca[ie] & 31;
            ((F += Ms[Ps] + Ss[Cs]), ++T[257 + Ps], ++C[Cs], (E = S + X), ++A);
          } else ((M[P++] = s[S]), ++T[s[S]]);
        }
      }
      for (S = Math.max(S, E); S < o; ++S) ((M[P++] = s[S]), ++T[s[S]]);
      ((u = La(s, l, c, M, T, C, F, P, D, S - D, u)),
        c || ((a.r = (u & 7) | (l[(u / 8) | 0] << 3)), (u -= 7), (a.h = b), (a.p = y), (a.i = S), (a.w = E)));
    } else {
      for (var S = a.w || 0; S < o + c; S += 65535) {
        var jt = S + 65535;
        (jt >= o && ((l[(u / 8) | 0] = c), (jt = o)), (u = po(l, u + 1, s.subarray(S, jt))));
      }
      a.i = o;
    }
    return $t(r, 0, n + Rn(u) + i);
  },
  np = (function () {
    for (var s = new Int32Array(256), e = 0; e < 256; ++e) {
      for (var t = e, n = 9; --n;) t = (t & 1 && -306674912) ^ (t >>> 1);
      s[e] = t;
    }
    return s;
  })(),
  ip = function () {
    var s = -1;
    return {
      p: function (e) {
        for (var t = s, n = 0; n < e.length; ++n) t = np[(t & 255) ^ e[n]] ^ (t >>> 8);
        s = t;
      },
      d: function () {
        return ~s;
      },
    };
  },
  Pc = function (s, e, t, n, i) {
    if (!i && ((i = { l: 1 }), e.dictionary)) {
      var a = e.dictionary.subarray(-32768),
        o = new ne(a.length + s.length);
      (o.set(a), o.set(s, a.length), (s = o), (i.w = a.length));
    }
    return Tc(
      s,
      e.level == null ? 6 : e.level,
      e.mem == null ? (i.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(s.length))) * 1.5) : 20) : 12 + e.mem,
      t,
      n,
      i,
    );
  },
  mo = function (s, e) {
    var t = {};
    for (var n in s) t[n] = s[n];
    for (var n in e) t[n] = e[n];
    return t;
  },
  tr = function (s, e, t) {
    for (
      var n = s(),
        i = s.toString(),
        a = i
          .slice(i.indexOf("[") + 1, i.lastIndexOf("]"))
          .replace(/\s+/g, "")
          .split(","),
        o = 0;
      o < n.length;
      ++o
    ) {
      var r = n[o],
        l = a[o];
      if (typeof r == "function") {
        e += ";" + l + "=";
        var c = r.toString();
        if (r.prototype)
          if (c.indexOf("[native code]") != -1) {
            var u = c.indexOf(" ", 8) + 1;
            e += c.slice(u, c.indexOf("(", u));
          } else {
            e += c;
            for (var d in r.prototype) e += ";" + l + ".prototype." + d + "=" + r.prototype[d].toString();
          }
        else e += c;
      } else t[l] = r;
    }
    return e;
  },
  On = [],
  ap = function (s) {
    var e = [];
    for (var t in s) s[t].buffer && e.push((s[t] = new s[t].constructor(s[t])).buffer);
    return e;
  },
  op = function (s, e, t, n) {
    if (!On[t]) {
      for (var i = "", a = {}, o = s.length - 1, r = 0; r < o; ++r) i = tr(s[r], i, a);
      On[t] = { c: tr(s[o], i, a), e: a };
    }
    var l = mo({}, On[t].e);
    return sp(
      On[t].c + ";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=" + e.toString() + "}",
      t,
      l,
      ap(l),
      n,
    );
  },
  rp = function () {
    return [ne, Se, An, Ms, Ss, ln, ho, yc, wc, kc, cn, _c, Oe, Jn, De, Zn, Rn, $t, ce, Mc, vo, Gi, Cc];
  },
  lp = function () {
    return [
      ne,
      Se,
      An,
      Ms,
      Ss,
      ln,
      _i,
      Ca,
      bc,
      it,
      xc,
      ms,
      cn,
      Sc,
      fo,
      Oe,
      Ue,
      Kt,
      Qn,
      Mi,
      Ea,
      Jt,
      po,
      La,
      Rn,
      $t,
      Tc,
      Pc,
      go,
      Gi,
    ];
  },
  Gi = function (s) {
    return postMessage(s, [s.buffer]);
  },
  Cc = function (s) {
    return s && { out: s.size && new ne(s.size), dictionary: s.dictionary };
  },
  Ec = function (s, e, t, n, i, a) {
    var o = op(t, n, i, function (r, l) {
      (o.terminate(), a(r, l));
    });
    return (
      o.postMessage([s, e], e.consume ? [s.buffer] : []),
      function () {
        o.terminate();
      }
    );
  },
  He = function (s, e) {
    return s[e] | (s[e + 1] << 8);
  },
  Ie = function (s, e) {
    return (s[e] | (s[e + 1] << 8) | (s[e + 2] << 16) | (s[e + 3] << 24)) >>> 0;
  },
  aa = function (s, e) {
    return Ie(s, e) + Ie(s, e + 4) * 4294967296;
  },
  be = function (s, e, t) {
    for (; t; ++e) ((s[e] = t), (t >>>= 8));
  };
function cp(s, e, t) {
  return (
    t || ((t = e), (e = {})),
    typeof t != "function" && ce(7),
    Ec(
      s,
      e,
      [lp],
      function (n) {
        return Gi(go(n.data[0], n.data[1]));
      },
      0,
      t,
    )
  );
}
function go(s, e) {
  return Pc(s, e || {}, 0, 0);
}
function up(s, e, t) {
  return (
    t || ((t = e), (e = {})),
    typeof t != "function" && ce(7),
    Ec(
      s,
      e,
      [rp],
      function (n) {
        return Gi(vo(n.data[0], Cc(n.data[1])));
      },
      1,
      t,
    )
  );
}
function vo(s, e) {
  return Mc(s, { i: 2 }, e && e.out, e && e.dictionary);
}
var Lc = function (s, e, t, n) {
    for (var i in s) {
      var a = s[i],
        o = e + i,
        r = n;
      (Array.isArray(a) && ((r = mo(n, a[1])), (a = a[0])),
        ArrayBuffer.isView(a) ? (t[o] = [a, r]) : ((t[(o += "/")] = [new ne(0), r]), Lc(a, o, t, n)));
    }
  },
  sr = typeof TextEncoder < "u" && new TextEncoder(),
  Aa = typeof TextDecoder < "u" && new TextDecoder(),
  hp = 0;
try {
  (Aa.decode(fo, { stream: !0 }), (hp = 1));
} catch {}
var dp = function (s) {
  for (var e = "", t = 0; ;) {
    var n = s[t++],
      i = (n > 127) + (n > 223) + (n > 239);
    if (t + i > s.length) return { s: e, r: $t(s, t - 1) };
    i
      ? i == 3
        ? ((n = (((n & 15) << 18) | ((s[t++] & 63) << 12) | ((s[t++] & 63) << 6) | (s[t++] & 63)) - 65536),
          (e += String.fromCharCode(55296 | (n >> 10), 56320 | (n & 1023))))
        : i & 1
          ? (e += String.fromCharCode(((n & 31) << 6) | (s[t++] & 63)))
          : (e += String.fromCharCode(((n & 15) << 12) | ((s[t++] & 63) << 6) | (s[t++] & 63)))
      : (e += String.fromCharCode(n));
  }
};
function nr(s, e) {
  var t;
  if (sr) return sr.encode(s);
  for (
    var n = s.length,
      i = new ne(s.length + (s.length >> 1)),
      a = 0,
      o = function (c) {
        i[a++] = c;
      },
      t = 0;
    t < n;
    ++t
  ) {
    if (a + 5 > i.length) {
      var r = new ne(a + 8 + ((n - t) << 1));
      (r.set(i), (i = r));
    }
    var l = s.charCodeAt(t);
    l < 128 || e
      ? o(l)
      : l < 2048
        ? (o(192 | (l >> 6)), o(128 | (l & 63)))
        : l > 55295 && l < 57344
          ? ((l = (65536 + (l & 1047552)) | (s.charCodeAt(++t) & 1023)),
            o(240 | (l >> 18)),
            o(128 | ((l >> 12) & 63)),
            o(128 | ((l >> 6) & 63)),
            o(128 | (l & 63)))
          : (o(224 | (l >> 12)), o(128 | ((l >> 6) & 63)), o(128 | (l & 63)));
  }
  return $t(i, 0, a);
}
function pp(s, e) {
  if (e) {
    for (var t = "", n = 0; n < s.length; n += 16384) t += String.fromCharCode.apply(null, s.subarray(n, n + 16384));
    return t;
  } else {
    if (Aa) return Aa.decode(s);
    var i = dp(s),
      a = i.s,
      t = i.r;
    return (t.length && ce(8), a);
  }
}
var fp = function (s, e) {
    return e + 30 + He(s, e + 26) + He(s, e + 28);
  },
  mp = function (s, e, t) {
    var n = He(s, e + 28),
      i = He(s, e + 30),
      a = pp(s.subarray(e + 46, e + 46 + n), !(He(s, e + 8) & 2048)),
      o = e + 46 + n,
      r = gp(s, o, i, t, Ie(s, e + 20), Ie(s, e + 24), Ie(s, e + 42)),
      l = r[0],
      c = r[1],
      u = r[2];
    return [He(s, e + 10), l, c, a, o + i + He(s, e + 32), u];
  },
  gp = function (s, e, t, n, i, a, o) {
    var r = i == 4294967295,
      l = a == 4294967295,
      c = o == 4294967295,
      u = e + t,
      d = r + l + c;
    if (n && d) {
      for (; e + 4 < u; e += 4 + He(s, e + 2))
        if (He(s, e) == 1)
          return [r ? aa(s, e + 4 + 8 * l) : i, l ? aa(s, e + 4) : a, c ? aa(s, e + 4 + 8 * (l + r)) : o, 1];
      n < 2 && ce(13);
    }
    return [i, a, o, 0];
  },
  Ra = function (s) {
    var e = 0;
    if (s)
      for (var t in s) {
        var n = s[t].length;
        (n > 65535 && ce(9), (e += n + 4));
      }
    return e;
  },
  ir = function (s, e, t, n, i, a, o, r) {
    var l = n.length,
      c = t.extra,
      u = r && r.length,
      d = Ra(c);
    (be(s, e, o != null ? 33639248 : 67324752),
      (e += 4),
      o != null && ((s[e++] = 20), (s[e++] = t.os)),
      (s[e] = 20),
      (e += 2),
      (s[e++] = (t.flag << 1) | (a < 0 && 8)),
      (s[e++] = i && 8),
      (s[e++] = t.compression & 255),
      (s[e++] = t.compression >> 8));
    var f = new Date(t.mtime == null ? Date.now() : t.mtime),
      m = f.getFullYear() - 1980;
    if (
      ((m < 0 || m > 119) && ce(10),
      be(
        s,
        e,
        (m << 25) |
          ((f.getMonth() + 1) << 21) |
          (f.getDate() << 16) |
          (f.getHours() << 11) |
          (f.getMinutes() << 5) |
          (f.getSeconds() >> 1),
      ),
      (e += 4),
      a != -1 && (be(s, e, t.crc), be(s, e + 4, a < 0 ? -a - 2 : a), be(s, e + 8, t.size)),
      be(s, e + 12, l),
      be(s, e + 14, d),
      (e += 16),
      o != null && (be(s, e, u), be(s, e + 6, t.attrs), be(s, e + 10, o), (e += 14)),
      s.set(n, e),
      (e += l),
      d)
    )
      for (var v in c) {
        var y = c[v],
          b = y.length;
        (be(s, e, +v), be(s, e + 2, b), s.set(y, e + 4), (e += 4 + b));
      }
    return (u && (s.set(r, e), (e += u)), e);
  },
  vp = function (s, e, t, n, i) {
    (be(s, e, 101010256), be(s, e + 8, t), be(s, e + 10, t), be(s, e + 12, n), be(s, e + 16, i));
  };
function yp(s, e, t) {
  (t || ((t = e), (e = {})), typeof t != "function" && ce(7));
  var n = {};
  Lc(s, "", n, e);
  var i = Object.keys(n),
    a = i.length,
    o = 0,
    r = 0,
    l = a,
    c = new Array(a),
    u = [],
    d = function () {
      for (var b = 0; b < u.length; ++b) u[b]();
    },
    f = function (b, x) {
      Si(function () {
        t(b, x);
      });
    };
  Si(function () {
    f = t;
  });
  var m = function () {
    var b = new ne(r + 22),
      x = o,
      w = r - o;
    r = 0;
    for (var _ = 0; _ < l; ++_) {
      var M = c[_];
      try {
        var T = M.c.length;
        ir(b, r, M, M.f, M.u, T);
        var C = 30 + M.f.length + Ra(M.extra),
          A = r + C;
        (b.set(M.c, A), ir(b, o, M, M.f, M.u, T, r, M.m), (o += 16 + C + (M.m ? M.m.length : 0)), (r = A + T));
      } catch (F) {
        return f(F, null);
      }
    }
    (vp(b, o, c.length, w, x), f(null, b));
  };
  a || m();
  for (
    var v = function (b) {
        var x = i[b],
          w = n[x],
          _ = w[0],
          M = w[1],
          T = ip(),
          C = _.length;
        T.p(_);
        var A = nr(x),
          F = A.length,
          S = M.comment,
          P = S && nr(S),
          E = P && P.length,
          D = Ra(M.extra),
          j = M.level == 0 ? 0 : 8,
          U = function (V, G) {
            if (V) (d(), f(V, null));
            else {
              var Z = G.length;
              ((c[b] = mo(M, {
                size: C,
                crc: T.d(),
                c: G,
                f: A,
                m: P,
                u: F != x.length || (P && S.length != E),
                compression: j,
              })),
                (o += 30 + F + D + Z),
                (r += 76 + 2 * (F + D) + (E || 0) + Z),
                --a || m());
            }
          };
        if ((F > 65535 && U(ce(11, 0, 1), null), !j)) U(null, _);
        else if (C < 16e4)
          try {
            U(null, go(_, M));
          } catch (V) {
            U(V, null);
          }
        else u.push(cp(_, M, U));
      },
      y = 0;
    y < l;
    ++y
  )
    v(y);
  return d;
}
var Si =
  typeof queueMicrotask == "function"
    ? queueMicrotask
    : typeof setTimeout == "function"
      ? setTimeout
      : function (s) {
          s();
        };
function bp(s, e, t) {
  (t || ((t = e), (e = {})), typeof t != "function" && ce(7));
  var n = [],
    i = function () {
      for (var b = 0; b < n.length; ++b) n[b]();
    },
    a = {},
    o = function (b, x) {
      Si(function () {
        t(b, x);
      });
    };
  Si(function () {
    o = t;
  });
  for (var r = s.length - 22; Ie(s, r) != 101010256; --r)
    if (!r || s.length - r > 65558) return (o(ce(13, 0, 1), null), i);
  var l = He(s, r + 8);
  if (l) {
    var c = l,
      u = Ie(s, r + 16),
      d = Ie(s, r - 20) == 117853008;
    if (d) {
      var f = Ie(s, r - 12);
      ((d = Ie(s, f) == 101075792), d && ((c = l = Ie(s, f + 32)), (u = Ie(s, f + 48))));
    }
    for (
      var m = e && e.filter,
        v = function (b) {
          var x = mp(s, u, d),
            w = x[0],
            _ = x[1],
            M = x[2],
            T = x[3],
            C = x[4],
            A = x[5],
            F = fp(s, A);
          u = C;
          var S = function (E, D) {
            E ? (i(), o(E, null)) : (D && (a[T] = D), --l || o(null, a));
          };
          if (!m || m({ name: T, size: _, originalSize: M, compression: w }))
            if (!w) S(null, $t(s, F, F + _));
            else if (w == 8) {
              var P = s.subarray(F, F + _);
              if (M < 524288 || _ > 0.8 * M)
                try {
                  S(null, vo(P, { out: new ne(M) }));
                } catch (E) {
                  S(E, null);
                }
              else n.push(up(P, { size: M }, S));
            } else S(ce(14, "unknown compression type " + w, 1), null);
          else S(null, null);
        },
        y = 0;
      y < c;
      ++y
    )
      v(y);
  } else o(null, {});
  return i;
}
const Ac = new Float32Array(1),
  wp = new Uint32Array(Ac.buffer);
function xp(s) {
  Ac[0] = s;
  const e = wp[0],
    t = (e >>> 16) & 32768;
  let n = ((e >>> 23) & 255) - 127 + 15,
    i = e & 8388607;
  return n <= 0
    ? n < -10
      ? t
      : ((i = (i | 8388608) >>> (1 - n)), t | ((i + 4096) >>> 13))
    : n >= 31
      ? t | 31744 | (((e >>> 23) & 255) === 255 && i ? 512 : 0)
      : t | (n << 10) | ((i + 4096) >>> 13);
}
const kp = (() => {
  const s = new Float32Array(65536);
  for (let e = 0; e < 65536; e++) {
    const t = e & 32768 ? -1 : 1,
      n = (e >> 10) & 31,
      i = e & 1023;
    s[e] =
      n === 0
        ? t * Math.pow(2, -14) * (i / 1024)
        : n === 31
          ? i
            ? NaN
            : t * (1 / 0)
          : t * Math.pow(2, n - 15) * (1 + i / 1024);
  }
  return s;
})();
function ar(s, e = new Uint16Array(s.length), t = 0) {
  for (let n = 0; n < s.length; n++) e[t + n] = xp(s[n]);
  return e;
}
function Fa(s, e = new Float32Array(s.length)) {
  for (let t = 0; t < s.length; t++) e[t] = kp[s[t]];
  return e;
}
const gs = 256;
function Ls(s, e, t, n = !1) {
  const i = s.w * s.h * t,
    a = e ? new Float32Array(i) : new Uint16Array(i);
  for (let o = 0; o < s.h; o += gs) {
    const r = Math.min(gs, s.h - o),
      l = n ? g.readPlane(s, { x: 0, y: o, w: s.w, h: r }) : g.read(s, { x: 0, y: o, w: s.w, h: r }),
      c = o * s.w * t;
    if (t === 4) e ? a.set(l, c) : ar(l, a, c);
    else {
      const u = new Float32Array(s.w * r);
      for (let d = 0; d < u.length; d++) u[d] = l[d * 4];
      e ? a.set(u, c) : ar(u, a, c);
    }
  }
  return new Uint8Array(a.buffer);
}
function oa(s, e, t, n) {
  const i = n === 4 ? s.newLayerTex() : s.newMaskTex(1),
    a = s.width * n,
    o = e.slice(),
    r = t ? new Float32Array(o.buffer) : new Uint16Array(o.buffer);
  for (let l = 0; l < s.height; l += gs) {
    const c = Math.min(gs, s.height - l),
      u = r.subarray(l * a, (l + c) * a),
      d = t ? u : Fa(u);
    g.upload(i, d, { x: 0, y: l, w: s.width, h: c });
  }
  return i;
}
function _p(s, e, t, n) {
  const i = s.newLayerTex(),
    a = s.width,
    o = n ? new Float32Array(e.slice().buffer) : new Uint16Array(e.slice().buffer),
    r = n ? new Float32Array(t.slice().buffer) : new Uint16Array(t.slice().buffer);
  for (let l = 0; l < s.height; l += gs) {
    const c = Math.min(gs, s.height - l),
      u = n ? o.subarray(l * a * 4, (l + c) * a * 4) : Fa(o.subarray(l * a * 4, (l + c) * a * 4)),
      d = n ? r.subarray(l * a, (l + c) * a) : Fa(r.subarray(l * a, (l + c) * a)),
      f = new Float32Array(a * c * 4);
    for (let v = 0; v < a * c; v++) ((f[v * 4] = f[v * 4 + 1] = f[v * 4 + 2] = d[v]), (f[v * 4 + 3] = u[v * 4 + 3]));
    const m = { x: 0, y: l, w: a, h: c };
    (g.uploadPlane(i, u, m), g.uploadPlane(i.k, f, m));
  }
  return i;
}
async function Mp(s, e = 256) {
  const t = Math.min(1, e / Math.max(s.width, s.height)),
    n = Math.max(1, Math.round(s.width * t)),
    i = Math.max(1, Math.round(s.height * t)),
    a = new OffscreenCanvas(n, i),
    { drawThumb: o } = await re(
      async () => {
        const { drawThumb: c } = await Promise.resolve().then(() => Jp);
        return { drawThumb: c };
      },
      void 0,
      import.meta.url,
    ),
    r = document.createElement("canvas");
  (o(r, s.composite, n, i), a.getContext("2d").drawImage(r, 0, 0));
  const l = await a.convertToBlob({ type: "image/png" });
  return new Uint8Array(await l.arrayBuffer());
}
async function yo(s) {
  const e = {},
    t = s.bitDepth === 32,
    n = (a) => {
      const o = {
        id: a.id,
        name: a.name,
        kind: a.kind,
        visible: a.visible,
        opacity: a.opacity,
        blend: a.blend,
        lockAlpha: a.lockAlpha,
        lockPixels: a.lockPixels,
        lockPosition: a.lockPosition,
        clip: a.clip,
        maskEnabled: a.maskEnabled,
        expanded: a.expanded,
        adjust: a.adjust,
        text: a.text,
        fx: a.fx,
        color: a.color,
        shape: a.shape,
        vmask: a.vmask || void 0,
        vmaskEnabled: a.vmaskEnabled,
        children: a.children.map(n),
      };
      return (
        a.tex && a.tex.k
          ? ((o.pixels = `layers/${a.id}.bin`),
            (e[o.pixels] = [Ls(a.tex, t, 4, !0), { level: 1 }]),
            (o.pixelsK = `layers/${a.id}.k.bin`),
            (e[o.pixelsK] = [Ls(a.tex.k, t, 1), { level: 1 }]))
          : a.tex && ((o.pixels = `layers/${a.id}.bin`), (e[o.pixels] = [Ls(a.tex, t, 4), { level: 1 }])),
        a.mask && ((o.mask = `masks/${a.id}.bin`), (e[o.mask] = [Ls(a.mask, !1, 1), { level: 1 }])),
        mrnValid(a) && !a.marionetteSrc.k &&
          ((o.marionette = { ...a.marionette, tex: void 0 }),
          (o.marionetteSrc = `marionette/${a.id}.bin`),
          (e[o.marionetteSrc] = [Ls(a.marionetteSrc, t, 4), { level: 1 }])),
        o
      );
    },
    i = {
      format: "brushboard",
      version: s.ink ? 3 : 2,
      app: "BrushBoard 1.6",
      width: s.width,
      height: s.height,
      bitDepth: s.bitDepth,
      encoding: t ? "float32" : "float16",
      colorSpace: s.ink ? "CMYK" : "sRGB",
      activeId: s.activeId,
      guides: s.guides,
      dpi: s.dpi || 72,
      layers: s.layers.map(n),
      paths: s.paths,
      workPath: s.workPath,
    };
  if (s.ink) {
    const a = await window.brushboard.python.call("core", "cmyk_read_icc", { profile: s.ink.path });
    ((e["profile.icc"] = [Uint8Array.from(atob(a.result.icc), (o) => o.charCodeAt(0)), { level: 6 }]),
      (i.profile = { id: s.ink.id, name: s.ink.name, tac: s.tac }),
      (i.inkMemo = zr(s.ink)));
  }
  return (
    s.selection && ((i.selection = "selection.bin"), (e["selection.bin"] = [Ls(s.selection, !1, 1), { level: 1 }])),
    (e["manifest.json"] = new TextEncoder().encode(JSON.stringify(i, null, 1))),
    (e["preview.png"] = [await Mp(s), { level: 0 }]),
    new Promise((a, o) => yp(e, { level: 1 }, (r, l) => (r ? o(r) : a(l))))
  );
}
async function Wi(s, e) {
  const t = await new Promise((l, c) => bp(s, (u, d) => (u ? c(u) : l(d)))),
    n = JSON.parse(new TextDecoder().decode(t["manifest.json"]));
  if (n.format !== "brushboard" && n.format !== "titianus") throw new Error("Not a BrushBoard document");
  let i = null;
  if (n.colorSpace === "CMYK") {
    const l = n.profile?.id || "fogra39",
      c = /^[a-z0-9]+$/.test(l);
    if (!c && t["profile.icc"]) {
      let u = "";
      const d = t["profile.icc"];
      for (let m = 0; m < d.length; m += 32768) u += String.fromCharCode(...d.subarray(m, m + 32768));
      const f = await window.brushboard.python.call("core", "cmyk_store_icc", { icc: btoa(u) });
      i = await st(f.result.path);
    } else i = await st(c ? l : "fogra39");
    for (const [u, d] of n.inkMemo || []) Na(u, d, i);
  }
  const a = new xs(e, n.width, n.height, n.bitDepth, i);
  (i && n.profile?.tac && (a.tac = n.profile.tac), (a.dpi = n.dpi));
  const o = n.encoding === "float32",
    r = (l) => {
      const c = le(l.kind, l.name, {
        visible: l.visible,
        opacity: l.opacity,
        blend: l.blend,
        lockAlpha: l.lockAlpha,
        lockPixels: l.lockPixels,
        lockPosition: l.lockPosition,
        clip: l.clip,
        maskEnabled: l.maskEnabled ?? !0,
        expanded: l.expanded ?? !0,
        adjust: l.adjust,
        text: l.text,
        fx: l.fx,
        color: l.color,
        shape: l.shape,
        vmask: l.vmask || null,
        vmaskEnabled: l.vmaskEnabled,
      });
      return (
        (c.id = l.id || c.id),
        l.pixels && t[l.pixels] && i && l.pixelsK && t[l.pixelsK]
          ? (c.tex = _p(a, t[l.pixels], t[l.pixelsK], o))
          : l.pixels && t[l.pixels]
            ? (c.tex = oa(a, t[l.pixels], o, 4))
            : c.shape && je(a, c),
        c.vmask && xt(a, c),
        l.mask && t[l.mask] && (c.mask = oa(a, t[l.mask], !1, 1)),
        l.marionette && l.marionetteSrc && t[l.marionetteSrc] && c.tex && !c.tex.k &&
          ((c.marionetteSrc = oa(a, t[l.marionetteSrc], o, 4)), (c.marionette = { ...l.marionette, tex: c.tex })),
        (c.children = (l.children || []).map(r)),
        c
      );
    };
  if (
    ((a.layers = n.layers.map(r)),
    (a.activeId = a.find(n.activeId) ? n.activeId : (a.layers[0]?.id ?? null)),
    a.activeId && a.selectedIds.add(a.activeId),
    n.guides && (a.guides = n.guides),
    Array.isArray(n.paths) && (a.paths = n.paths),
    n.workPath && (a.workPath = n.workPath),
    n.selection && t[n.selection])
  ) {
    const l = oa(a, t[n.selection], !1, 1);
    a.selection = l;
  }
  return (a.invalidate(), a);
}
let Da = [];
function un() {
  return Da;
}
function or(s) {
  return g.read(s);
}
function hn(s) {
  if (!s) return null;
  const e = (t) => ({
    id: t.id,
    name: t.name,
    kind: t.kind,
    visible: t.visible,
    opacity: t.opacity,
    blend: t.blend,
    hasMask: !!t.mask,
    children: t.children.map(e),
  });
  return {
    id: s.id,
    name: s.name,
    path: s.path,
    width: s.width,
    height: s.height,
    bitDepth: s.bitDepth,
    activeId: s.activeId,
    hasSelection: !!s.selection,
    layers: s.layers.map(e),
  };
}
const ei = new Map(),
  Rc = new Map();
async function Sp(s) {
  const e = (n, i = {}) => window.brushboard.python.hostReply(s.worker, s.id, n, null, i),
    t = (n) => window.brushboard.python.hostReply(s.worker, s.id, null, n?.message || String(n));
  try {
    const n = s.params || {},
      i = h.doc,
      a = () => {
        if (!i) throw new Error("No document is open");
        return i;
      },
      o = (r) => {
        const l = a(),
          c = r ? l.find(r)?.layer : l.active;
        if (!c) throw new Error("Layer not found");
        return c;
      };
    switch (s.method) {
      case "host.message":
        return (h.notify(String(n.text), n.kind || "info", n.ms || 4e3), e(!0));
      case "host.status":
        return (h.status(String(n.text || "")), e(!0));
      case "host.get_document":
        return e(hn(i));
      case "host.get_colors":
        return e({ fg: h.fg, bg: h.bg });
      case "host.set_foreground":
        return (h.setFg(n.rgb), e(!0));
      case "host.set_background":
        return (h.setBg(n.rgb), e(!0));
      case "host.get_layer_pixels": {
        const r = o(n.id),
          l = n.mask ? r.mask : r.tex;
        if (!l) throw new Error("Layer has no pixels");
        const c = a();
        return e({ width: c.width, height: c.height }, { image: { data: or(l), width: c.width, height: c.height } });
      }
      case "host.get_composite": {
        const r = a(),
          l = ve(r, r.layers, "rgba32f"),
          c = g.read(l);
        return (
          g.dispose(l),
          e({ width: r.width, height: r.height }, { image: { data: c, width: r.width, height: r.height } })
        );
      }
      case "host.get_selection": {
        const r = a();
        return r.selection
          ? e(
              { width: r.width, height: r.height },
              { image: { data: or(r.selection), width: r.width, height: r.height } },
            )
          : e(null);
      }
      case "host.set_layer_pixels": {
        const r = a(),
          l = o(n.id),
          c = s.buffers.image;
        if (!c) throw new Error("No image buffer");
        const u = yt(r, new Float32Array(c.data), c.width, c.height, n.x || 0, n.y || 0);
        if (n.region) {
          const d = r.newLayerTex();
          (g.copy(l.tex, d),
            g.copy(u, d, { x: n.x, y: n.y, w: c.width, h: c.height }, n.x, n.y),
            r.owned.delete(u),
            g.dispose(u),
            r.transact(n.label || "Extension", () => kt(r, l, d)));
        } else r.transact(n.label || "Extension", () => kt(r, l, u));
        return e(!0);
      }
      case "host.add_layer": {
        const r = a(),
          l = s.buffers.image,
          c = l ? yt(r, new Float32Array(l.data), l.width, l.height, n.x || 0, n.y || 0) : r.newLayerTex(),
          u = Ii(r, c, n.name || "Layer", n.label || "New Layer");
        return (
          n.blend && (u.blend = n.blend),
          n.opacity !== void 0 && (u.opacity = n.opacity),
          r.invalidate(),
          e(u.id)
        );
      }
      case "host.new_document": {
        const { createDocument: r } = await re(
            async () => {
              const { createDocument: u } = await Promise.resolve().then(() => $d);
              return { createDocument: u };
            },
            void 0,
            import.meta.url,
          ),
          l = s.buffers.image,
          c = r(
            n.name || "Untitled",
            n.width || l?.width || 1024,
            n.height || l?.height || 1024,
            n.bitDepth || 8,
            l ? null : [1, 1, 1],
          );
        if (l) {
          const u = c.active;
          ((u.tex = yt(c, new Float32Array(l.data), l.width, l.height)), c.gc(), c.invalidate());
        }
        return e(c.id);
      }
      case "host.run_command":
        return (await h.run(n.id), e(!0));
      case "host.choose_folder":
        return e(
          (
            await window.brushboard.dialog.open({
              title: n.title || "Choose folder",
              properties: ["openDirectory", "createDirectory"],
            })
          )[0] || null,
        );
      case "host.choose_file":
        return e(
          (
            await window.brushboard.dialog.open({
              title: n.title || "Choose file",
              properties: ["openFile"],
              filters: n.filters,
            })
          )[0] || null,
        );
      case "host.save_file":
        return e(
          await window.brushboard.dialog.save({ title: n.title || "Save", defaultPath: n.default, filters: n.filters }),
        );
      case "host.overlay":
        return (ei.set(s.worker + ":" + (n.tool || ""), n.shapes || []), k.emit("render"), e(!0));
      case "host.panel_update":
        return (Rc.get(`${s.worker}:${n.panel}`)?.(n.ui || []), e(!0));
      case "host.progress":
        return (
          h.status(n.text ? `${n.text} ${n.value !== void 0 ? Math.round(n.value * 100) + "%" : ""}` : ""),
          e(!0)
        );
      default:
        throw new Error(`Unknown host method ${s.method}`);
    }
  } catch (n) {
    t(n);
  }
}
async function bo(s, e, t, n = !0) {
  const a = Qe.find((c) => c.id === s)?.contributions?.filters.find((c) => c.id === e);
  if (!a) throw new Error("Filter not found");
  const o = h.doc;
  Re(o);
  const r = t || Object.fromEntries(a.params.map((c) => [c.id, h.setting(`py.${s}.${a.id}.${c.id}`, c.default)]));
  if (
    await tc({
      title: a.name,
      params: a.params,
      values: r,
      heavy: a.heavy !== !1,
      showDialog: n,
      compute: async (c, u) => {
        const d = g.read(c),
          m = (
            await window.brushboard.python.call(
              s,
              "run_filter",
              { filter: a.id, params: u, context: { fg: h.fg, bg: h.bg, document: hn(o) } },
              { image: { data: d, width: c.w, height: c.h } },
            )
          ).buffers.image;
        if (!m) return null;
        const v = g.acquireLike(c, c.format === "r16f" ? "rgba16f" : c.format),
          y = g.createTex(m.width, m.height, "rgba32f", { linear: !1 });
        return (
          g.upload(y, new Float32Array(m.data)),
          (y.isImage = !!v.k),
          g.clear(v, null, [0, 0, 0, 0]),
          g.copy(y, v, { x: 0, y: 0, w: Math.min(m.width, v.w), h: Math.min(m.height, v.h) }, 0, 0),
          g.dispose(y),
          v
        );
      },
    })
  ) {
    for (const [c, u] of Object.entries(r)) h.set(`py.${s}.${a.id}.${c}`, u);
    Od(s, e, a.name, r);
  }
}
class Tp {
  constructor(e, t) {
    ((this.ext = e),
      (this.def = t),
      (this.id = `py:${e}:${t.id}`),
      (this.name = t.name),
      (this.icon = t.icon && t.icon.startsWith("<svg") ? t.icon : R.ext),
      (this.cursor = t.cursor || "crosshair"));
  }
  group = "ext";
  cursor;
  id;
  name;
  icon;
  busy = !1;
  queued = null;
  options() {
    const e = p(
      "div",
      { class: "opts" },
      p("span", { class: "opt-hint" }, `${this.def.name} — Python extension "${this.ext}"`),
    );
    for (const t of this.def.options || []) {
      const n = `py.${this.ext}.${this.def.id}.${t.id}`;
      if (t.type === "bool") {
        const i = p("input", { type: "checkbox", checked: h.setting(n, t.default) });
        ((i.onchange = () => h.set(n, i.checked)),
          e.append(p("label", { class: "check" }, i, p("span", null, t.label))));
      } else if (t.type === "choice") {
        const i = p("select", { class: "sel" });
        for (const a of t.choices || [])
          i.appendChild(
            p(
              "option",
              { value: String(a.value), selected: String(h.setting(n, t.default)) === String(a.value) },
              a.label,
            ),
          );
        ((i.onchange = () => h.set(n, i.value)), e.append(p("span", { class: "opt-label" }, t.label), i));
      } else {
        const i = p("input", { class: "num", value: String(h.setting(n, t.default)), style: { width: "50px" } });
        ((i.onchange = () => h.set(n, t.type === "text" ? i.value : parseFloat(i.value))),
          (i.onkeydown = (a) => a.stopPropagation()),
          e.append(p("span", { class: "opt-label" }, t.label), i));
      }
    }
    return e;
  }
  opts() {
    return Object.fromEntries(
      (this.def.options || []).map((e) => [e.id, h.setting(`py.${this.ext}.${this.def.id}.${e.id}`, e.default)]),
    );
  }
  send(e, t) {
    const n = {
      tool: this.def.id,
      type: e,
      x: t.x,
      y: t.y,
      pressure: t.pressure,
      shift: t.shift,
      alt: t.alt,
      ctrl: t.ctrl,
      options: this.opts(),
      colors: { fg: h.fg, bg: h.bg },
    };
    if (this.busy && e === "move") {
      this.queued = n;
      return;
    }
    this.dispatch(n);
  }
  async dispatch(e) {
    this.busy = !0;
    try {
      const t = await window.brushboard.python.call(this.ext, "tool_event", e);
      (t.result?.overlay && ei.set(this.ext + ":" + this.def.id, t.result.overlay),
        t.result?.status !== void 0 && h.status(t.result.status),
        k.emit("render"));
    } catch (t) {
      h.error(t);
    }
    if (((this.busy = !1), this.queued)) {
      const t = this.queued;
      ((this.queued = null), this.dispatch(t));
    }
  }
  down(e) {
    this.send("down", e);
  }
  move(e) {
    this.send("move", e);
  }
  up(e) {
    ((this.queued = null), this.send("up", e));
  }
  overlay(e, t) {
    const n = ei.get(this.ext + ":" + this.def.id) || [];
    for (const i of n) {
      if (
        (e.save(),
        (e.strokeStyle = i.color ? fe(i.color) : "#8fb4dc"),
        (e.fillStyle = i.fill ? fe(i.fill, i.fillAlpha ?? 0.25) : "transparent"),
        (e.lineWidth = i.width || 1),
        i.dash && e.setLineDash(i.dash),
        i.type === "line" || i.type === "polyline" || i.type === "polygon")
      )
        (e.beginPath(),
          i.points.forEach(([a, o], r) => {
            const l = t.docToScreen(a, o);
            r ? e.lineTo(l[0], l[1]) : e.moveTo(l[0], l[1]);
          }),
          i.type === "polygon" && (e.closePath(), i.fill && e.fill()),
          e.stroke());
      else if (i.type === "rect") {
        const a = [
          [i.x, i.y],
          [i.x + i.w, i.y],
          [i.x + i.w, i.y + i.h],
          [i.x, i.y + i.h],
        ].map(([o, r]) => t.docToScreen(o, r));
        (e.beginPath(),
          a.forEach(([o, r], l) => (l ? e.lineTo(o, r) : e.moveTo(o, r))),
          e.closePath(),
          i.fill && e.fill(),
          e.stroke());
      } else if (i.type === "circle") {
        const a = t.docToScreen(i.x, i.y);
        (e.beginPath(), e.arc(a[0], a[1], i.r * t.zoom, 0, Math.PI * 2), i.fill && e.fill(), e.stroke());
      } else if (i.type === "text") {
        const a = t.docToScreen(i.x, i.y);
        ((e.font = `${i.size || 12}px system-ui`), (e.fillStyle = "rgba(24,28,33,.82)"));
        const o = e.measureText(i.text).width;
        (e.fillRect(a[0] - 3, a[1] - (i.size || 12), o + 6, (i.size || 12) + 6),
          (e.fillStyle = i.color ? fe(i.color) : "#e3e7eb"),
          e.fillText(i.text, a[0], a[1]));
      }
      e.restore();
    }
  }
  deactivate() {
    ei.delete(this.ext + ":" + this.def.id);
  }
}
function ra(s, e, t) {
  te(s);
  const n = (i) => {
    switch (i.type) {
      case "label":
        return p("div", { class: "ext-label" + (i.style ? " " + i.style : "") }, i.text);
      case "separator":
        return p("hr", { class: "ext-sep" });
      case "button":
        return p("button", { class: "btn small" + (i.primary ? " primary" : ""), onclick: () => t(i.id, !0) }, i.label);
      case "row":
        return p("div", { class: "ext-row" }, ...(i.children || []).map(n));
      case "slider": {
        const a = p("input", {
            type: "range",
            min: i.min ?? 0,
            max: i.max ?? 1,
            step: i.step ?? 0.01,
            value: i.value ?? 0,
          }),
          o = p("span", { class: "ext-val" }, String(i.value ?? 0));
        return (
          (a.oninput = () => (o.textContent = a.value)),
          (a.onchange = () => t(i.id, parseFloat(a.value))),
          p("div", { class: "ext-field" }, p("span", null, i.label || ""), a, o)
        );
      }
      case "checkbox": {
        const a = p("input", { type: "checkbox", checked: !!i.value });
        return ((a.onchange = () => t(i.id, a.checked)), p("label", { class: "check" }, a, p("span", null, i.label)));
      }
      case "select": {
        const a = p("select", { class: "sel" });
        for (const o of i.options || []) {
          const [r, l] = Array.isArray(o) ? o : [o, o];
          a.appendChild(p("option", { value: String(r), selected: String(r) === String(i.value) }, String(l)));
        }
        return (
          (a.onchange = () => t(i.id, a.value)),
          p("div", { class: "ext-field" }, p("span", null, i.label || ""), a)
        );
      }
      case "text": {
        const a = p("input", { class: "text", value: i.value ?? "" });
        return (
          (a.onkeydown = (o) => o.stopPropagation()),
          (a.onchange = () => t(i.id, a.value)),
          p("div", { class: "ext-field" }, p("span", null, i.label || ""), a)
        );
      }
      case "color": {
        const a = p("input", { type: "color", value: qe(i.value || [0, 0, 0]) });
        return (
          (a.onchange = () => t(i.id, nt(a.value))),
          p("div", { class: "ext-field" }, p("span", null, i.label || ""), a)
        );
      }
      case "swatches":
        return p(
          "div",
          { class: "ext-swatches" },
          ...(i.colors || []).map((a, o) =>
            p("button", {
              class: "swatch",
              title: qe(a),
              style: { background: fe(a) },
              onclick: (r) => (i.id ? t(i.id, { index: o, color: a, alt: r.altKey }) : h.setFg(a)),
            }),
          ),
        );
      case "progress":
        return p(
          "div",
          { class: "ext-progress" },
          p("div", { style: { width: Math.round((i.value || 0) * 100) + "%" } }),
        );
      case "image":
        return p("img", { class: "ext-img", src: i.src });
      default:
        return p("div", { class: "ext-label" }, `[unknown widget ${i.type}]`);
    }
  };
  for (const i of e) {
    const a = n(i);
    a && s.appendChild(a);
  }
}
let Qe = [];
async function Fc(s) {
  try {
    Qe = await window.brushboard.python.extensions();
  } catch (n) {
    (console.warn("extensions", n), (Qe = []));
  }
  ((h.extensions = Qe), (Da = []));
  const e = [],
    t = [];
  for (const n of Qe) {
    const i = n.contributions;
    if (!(!n.enabled || !i)) {
      for (const a of i.formats || []) Da.push({ ...a, ext: n.id });
      for (const a of i.tools || []) e.push(new Tp(n.id, a));
      for (const a of i.panels || []) {
        const o = `${n.id}:${a.id}`;
        t.push({
          id: `ext:${o}`,
          title: a.title,
          create: () => {
            const r = p("div", { class: "ext-panel" }, p("div", { class: "ext-label muted" }, "Loading…")),
              l = async (c, u) => {
                try {
                  const d = await window.brushboard.python.call(n.id, "panel_event", {
                    panel: a.id,
                    widget: c,
                    value: u,
                    context: { fg: h.fg, bg: h.bg, document: hn(h.doc) },
                  });
                  d.result && ra(r, d.result, l);
                } catch (d) {
                  me(`${a.title}`, d?.message || String(d), d?.traceback);
                }
              };
            return (
              Rc.set(o, (c) => ra(r, c, l)),
              window.brushboard.python
                .call(n.id, "panel_render", { panel: a.id, context: { document: hn(h.doc) } })
                .then((c) => ra(r, c.result || [], l))
                .catch((c) => {
                  r.textContent = c.message;
                }),
              r
            );
          },
        });
      }
    }
  }
  (s({ tools: e, panels: t }), k.emit("extensions:changed"));
}
function Ti() {
  const s = [],
    e = [];
  for (const t of Qe) {
    const n = t.contributions;
    if (!(!t.enabled || !n)) {
      for (const i of n.filters || [])
        s.push({
          category: i.category || t.manifest.name || t.id,
          name: i.name,
          run: () => bo(t.id, i.id).catch((a) => me(i.name, a?.message || String(a), a?.traceback)),
        });
      for (const i of n.commands || [])
        e.push({
          id: `pyext.${t.id}.${i.id}`,
          menu: i.menu || t.manifest.name || t.id,
          name: i.name,
          shortcut: i.shortcut,
          run: async () => {
            try {
              let a = {};
              if (i.params?.length) {
                const { Dialog: r, paramForm: l } = await re(
                    async () => {
                      const { Dialog: d, paramForm: f } = await Promise.resolve().then(() => Yl);
                      return { Dialog: d, paramForm: f };
                    },
                    void 0,
                    import.meta.url,
                  ),
                  c = new r(i.name, { width: 380 });
                if (
                  ((a = Object.fromEntries(
                    i.params.map((d) => [d.id, h.setting(`py.${t.id}.${i.id}.${d.id}`, d.default)]),
                  )),
                  c.body.append(l(i.params, a, () => {})),
                  (c.onOk = () => a),
                  !(await c.show()))
                )
                  return;
                for (const [d, f] of Object.entries(a)) h.set(`py.${t.id}.${i.id}.${d}`, f);
              }
              h.status(`${i.name}…`);
              const o = await window.brushboard.python.call(t.id, "run_command", {
                command: i.id,
                params: a,
                context: { fg: h.fg, bg: h.bg, document: hn(h.doc) },
              });
              (h.status(""), o.result && typeof o.result == "string" && h.notify(o.result, "success"));
            } catch (a) {
              (h.status(""), me(i.name, a?.message || String(a), a?.traceback));
            }
          },
        });
    }
  }
  return { filters: s, commands: e };
}
function Dc() {
  (window.brushboard.python.onHostRequest(Sp),
    window.brushboard.python.onEvent((s) => {
      (s.event === "exit" &&
        s.worker !== "core" &&
        !s.worker.startsWith("script:") &&
        s.params.code &&
        h.notify(
          `Extension "${s.worker}" stopped (${s.params.signal || s.params.code}). It will restart on next use.`,
          "error",
        ),
        k.emit("python:event", s));
    }));
}
const Pp = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        extensionFormats: un,
        extensionMenuItems: Ti,
        initExtensionHost: Dc,
        loadExtensions: Fc,
        get registry() {
          return Qe;
        },
        requireRaster: Re,
        runPythonFilter: bo,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  Pi = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif", "svg", "ico", "jfif"],
  wo = [
    "cr2",
    "cr3",
    "nef",
    "nrw",
    "arw",
    "srf",
    "sr2",
    "dng",
    "orf",
    "rw2",
    "raf",
    "pef",
    "srw",
    "x3f",
    "3fr",
    "erf",
    "kdc",
    "mrw",
    "iiq",
  ],
  zc = ["tif", "tiff", "psd", "psb", "exr", "hdr", "pfm", "ppm", "pgm", "pbm", "jp2", "tga", ...wo],
  Ic = (s) => (s.split(".").pop() || "").toLowerCase(),
  pe = (s) => s.split(/[\\/]/).pop() || s,
  gt = (s) => s.replace(/\.[^.]+$/, "");
function Cp() {
  const s = un().flatMap((e) => e.extensions);
  return [
    { name: "All supported images", extensions: ["brb", "brushboard", "gio", ...Pi, ...zc, "svg", "svgz", ...s] },
    { name: "Vector (SVG)", extensions: ["svg", "svgz"] },
    { name: "BrushBoard Document", extensions: ["brb", "brushboard", "gio"] },
    { name: "Photoshop", extensions: ["psd", "psb"] },
    { name: "Camera RAW", extensions: wo },
    { name: "Common images", extensions: Pi },
    { name: "High bit depth (TIFF, EXR, HDR, PFM)", extensions: ["tif", "tiff", "exr", "hdr", "pfm"] },
    { name: "All files", extensions: ["*"] },
  ];
}
function es(s) {
  if (!h.python.python || !h.python.capabilities.numpy)
    throw new Error(
      `${s} needs the Python helper (with numpy). Use Extensions › Python Setup… to create it, or run "npm run setup:python".`,
    );
}
async function Oc(s, e) {
  const t = new Blob([s], { type: e });
  return createImageBitmap(t, { premultiplyAlpha: "none", colorSpaceConversion: "default" });
}
function Bc(s) {
  return (
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      jfif: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      bmp: "image/bmp",
      avif: "image/avif",
      svg: "image/svg+xml",
      ico: "image/x-icon",
    }[s] || "application/octet-stream"
  );
}
function $c(s) {
  const e = new Uint8Array(s);
  if (e.length < 4 || e[0] !== 255 || e[1] !== 216) return !1;
  let t = 2;
  for (; t + 9 < e.length;) {
    if (e[t] !== 255) {
      t++;
      continue;
    }
    const n = e[t + 1];
    if (n === 216 || n === 1 || (n >= 208 && n <= 215)) {
      t += 2;
      continue;
    }
    const i = (e[t + 2] << 8) | e[t + 3];
    if (n >= 192 && n <= 207 && n !== 196 && n !== 200 && n !== 204) return e[t + 9] === 4;
    if (n === 218) return !1;
    t += 2 + i;
  }
  return !1;
}
function qc(s) {
  const e = new Uint8Array(s);
  return e.length > 25 && e[0] === 137 && e[1] === 80 && e[24] === 16;
}
async function Ep() {
  const s = new Y("Camera Raw Import", { width: 380, ok: "Open" }),
    e = { wb: "camera", exposure: 0, half: !1, highlight: "clip", bright: !0 };
  return (
    s.body.append(
      p(
        "div",
        { class: "form-row" },
        p("span", { class: "sf-label" }, "White Balance"),
        O(
          [
            { value: "camera", label: "As Shot" },
            { value: "auto", label: "Auto" },
            { value: "daylight", label: "Daylight (none)" },
          ],
          e.wb,
          (t) => (e.wb = t),
        ),
      ),
      Q({ label: "Exposure", value: 0, min: -3, max: 3, step: 0.05, unit: "EV", onInput: (t) => (e.exposure = t) }),
      p(
        "div",
        { class: "form-row" },
        p("span", { class: "sf-label" }, "Highlights"),
        O(
          [
            { value: "clip", label: "Clip" },
            { value: "blend", label: "Blend" },
            { value: "reconstruct", label: "Reconstruct" },
          ],
          e.highlight,
          (t) => (e.highlight = t),
        ),
      ),
      p(
        "div",
        { class: "form-row" },
        $("Auto brightness", !0, (t) => (e.bright = t)),
      ),
      p(
        "div",
        { class: "form-row" },
        $("Half size (faster)", !1, (t) => (e.half = t)),
      ),
      p("p", { class: "hint" }, "Develops to 16-bit linear-gamma-corrected sRGB via LibRaw."),
    ),
    (s.onOk = () => e),
    s.show()
  );
}
async function rr(s, e) {
  es("Opening this format");
  let t = {};
  if (wo.includes(e)) {
    if (!h.python.capabilities.rawpy)
      throw new Error('Camera RAW support needs the "rawpy" Python package (Extensions › Python Setup…).');
    if (((t = await Ep()), !t)) throw new Error("cancelled");
  }
  h.status(`Opening ${pe(s)}…`);
  const n = await window.brushboard.python.call("core", "read_image", { path: s, options: t });
  return ko(n.result, n.buffers, gt(pe(s)), await xo(n.result));
}
function Lp(s, e) {
  const t = s.width,
    n = s.height,
    i = [],
    a = [],
    o = (l, c) =>
      l.forEach((u, d) => {
        (i.push(u), a.push(c[d]), u.kind === "group" && o(u.children, c[d]?.children || []));
      });
  o(
    s.layers,
    (e.layers || []).filter((l) => l),
  );
  let r = [];
  try {
    r = e.appData ? JSON.parse(e.appData).layers || [] : [];
  } catch {
    r = [];
  }
  i.forEach((l, c) => {
    const u = a[c] || {},
      d = r[c];
    if (d?.shape && l.kind !== "group") ((l.kind = "shape"), (l.shape = d.shape), je(s, l));
    else if (d?.text && l.kind !== "group") ((l.kind = "text"), (l.text = d.text), _t(s, l));
    else if (u.shape && u.vmask) {
      const f = Ds(Bn(u.vmask.records), t, n),
        m = (y) =>
          y
            ? Array.isArray(y)
              ? y
              : y.ink
                ? s.ink
                  ? Xs(y.ink, s.ink)
                  : [(1 - y.ink[0]) * (1 - y.ink[3]), (1 - y.ink[1]) * (1 - y.ink[3]), (1 - y.ink[2]) * (1 - y.ink[3])]
                : null
            : null,
        v = _n(f, m(u.shape.fill), m(u.shape.stroke), u.shape.strokeWidth || 0);
      (u.shape.strokeAlign && (v.strokeAlign = u.shape.strokeAlign), (l.kind = "shape"), (l.shape = v), je(s, l));
      return;
    }
    d?.vmask
      ? ((l.vmask = d.vmask), (l.vmaskEnabled = d.vmaskEnabled !== !1), xt(s, l))
      : u.vmask && ((l.vmask = Ds(Bn(u.vmask.records), t, n)), (l.vmaskEnabled = u.vmask.enabled !== !1), xt(s, l));
  });
  for (const l of e.paths || []) s.paths.push({ id: Qs(), name: l.name, path: Ds(Bn(l.records), t, n) });
  e.workPath && (s.workPath = Ds(Bn(e.workPath), t, n));
}
async function xo(s) {
  return s?.colorMode !== "cmyk" ? null : (await Li().catch(() => null), st(s.profile || "fogra39"));
}
function ko(s, e, t, n = null) {
  const i = new xs(
    t,
    s.width,
    s.height,
    n ? (s.bitDepth >= 16 ? 16 : 8) : s.bitDepth >= 32 ? 32 : s.bitDepth >= 16 ? 16 : 8,
    n,
  );
  n && (i.tac = rs(s.profile || "fogra39"));
  const a = (o) => {
    if (o.kind === "group") {
      const c = le("group", o.name, {
        visible: o.visible,
        opacity: o.opacity,
        blend: o.blend in wt ? o.blend : "passThrough",
      });
      return ((c.children = (o.children || []).map(a).filter(Boolean)), c);
    }
    const r = le("raster", o.name, {
        visible: o.visible,
        opacity: o.opacity,
        blend: o.blend in wt ? o.blend : "normal",
        clip: !!o.clip,
      }),
      l = o.buffer ? e[o.buffer] : null;
    if (
      ((r.tex = l
        ? n && l.channels === 5
          ? $i(i, new Float32Array(l.data), l.width, l.height, o.x, o.y)
          : yt(i, new Float32Array(l.data), l.width, l.height, o.x, o.y)
        : i.newLayerTex()),
      o.mask)
    ) {
      const c = e[o.mask.buffer],
        u = i.newMaskTex(o.mask.default);
      if (c) {
        const d = g.createTex(c.width, c.height, "rgba32f", { linear: !1 });
        g.upload(d, new Float32Array(c.data));
        const f = Math.max(0, -o.mask.x),
          m = Math.max(0, -o.mask.y),
          v = Math.max(0, o.mask.x),
          y = Math.max(0, o.mask.y),
          b = Math.min(c.width - f, i.width - v),
          x = Math.min(c.height - m, i.height - y);
        (b > 0 && x > 0 && g.copy(d, u, { x: f, y: m, w: b, h: x }, v, y), g.dispose(d));
      }
      r.mask = u;
    }
    return r;
  };
  if (((i.layers = s.layers.map(a).filter(Boolean)), !i.layers.length)) {
    const o = le("raster", "Background");
    ((o.tex = i.newLayerTex()), (i.layers = [o]));
  }
  return (
    Lp(i, s),
    (i.activeId = i.layers[0].id),
    i.selectedIds.add(i.activeId),
    s.warnings?.length && setTimeout(() => h.notify(s.warnings.join(" · "), "info", 8e3), 300),
    i.gc(),
    i.invalidate(),
    i
  );
}
async function bt(s) {
  const e = h.docs.find((n) => n.path === s);
  if (e) {
    h.setDoc(e);
    return;
  }
  const t = Ic(s);
  try {
    let n;
    const i = un().find((a) => a.extensions.includes(t) && a.canRead);
    if (t === "brb" || t === "brushboard" || t === "gio") {
      h.status(`Opening ${pe(s)}…`);
      const a = await window.brushboard.fs.read(s);
      ((n = await Wi(new Uint8Array(a), gt(pe(s)))), (n.path = s));
    } else if (i) {
      h.status(`Opening ${pe(s)}…`);
      const a = await window.brushboard.python.call(i.ext, "format_read", { format: i.id, path: s });
      n = ko(a.result, a.buffers, gt(pe(s)), await xo(a.result));
    } else if (t === "svg" || t === "svgz") {
      h.status(`Opening ${pe(s)}…`);
      const a = new Uint8Array(await window.brushboard.fs.read(s)),
        o =
          t === "svgz"
            ? await new Response(new Blob([a]).stream().pipeThrough(new DecompressionStream("gzip"))).text()
            : new TextDecoder().decode(a);
      n = await fc(o, gt(pe(s)));
    } else if (Pi.includes(t)) {
      const a = await window.brushboard.fs.read(s);
      if (((t === "png" && qc(a)) || (["jpg", "jpeg", "jpe"].includes(t) && $c(a))) && h.python.capabilities.numpy)
        n = await rr(s, t);
      else {
        const o = await Oc(a, Bc(t));
        n = new xs(gt(pe(s)), o.width, o.height, 8);
        const r = le("raster", "Background");
        ((r.tex = io(n, o, o.width, o.height)),
          o.close(),
          (n.layers = [r]),
          (n.activeId = r.id),
          n.selectedIds.add(r.id),
          n.invalidate());
      }
    } else if (zc.includes(t)) n = await rr(s, t);
    else throw new Error(`Unsupported file type ".${t}"`);
    (t === "brb" || t === "brushboard" || t === "gio" ? (n.path = s) : (n.sourcePath = s),
      n.markSaved(),
      h.addDoc(n),
      h.addRecent(s),
      h.status(""));
  } catch (n) {
    if ((h.status(""), n?.message === "cancelled")) return;
    me("Could not open file", `${pe(s)}: ${n?.message || n}`, n?.traceback);
  }
}
async function Ap() {
  const s = await window.brushboard.dialog.open({
    title: "Open",
    properties: ["openFile", "multiSelections"],
    filters: Cp(),
    defaultPath: h.prefs.lastDir,
  });
  s.length && (h.prefs.lastDir = s[0].replace(/[\\/][^\\/]*$/, ""));
  for (const e of s) await bt(e);
}
async function Nc(s, e = h.doc) {
  if (!e) return bt(s);
  const t = Ic(s);
  try {
    let n;
    const i = Pi.includes(t) ? await window.brushboard.fs.read(s) : null;
    if (i && !(((t === "png" && qc(i)) || $c(i)) && h.python.capabilities.numpy)) {
      const a = await Oc(await window.brushboard.fs.read(s), Bc(t));
      ((n = io(e, a, a.width, a.height, Math.round((e.width - a.width) / 2), Math.round((e.height - a.height) / 2))),
        a.close());
    } else {
      const a =
          t === "brb" || t === "brushboard" || t === "gio"
            ? await Wi(new Uint8Array(await window.brushboard.fs.read(s)), "tmp")
            : await (async () => {
                es("Placing this format");
                const l = await window.brushboard.python.call("core", "read_image", { path: s, options: {} });
                return ko(l.result, l.buffers, "tmp", await xo(l.result));
              })(),
        o = ve(a),
        r = g.read(o);
      (g.dispose(o),
        (n = yt(e, r, a.width, a.height, Math.round((e.width - a.width) / 2), Math.round((e.height - a.height) / 2))),
        a.dispose());
    }
    (e.owned.delete(n), Ii(e, n, gt(pe(s)), "Place"));
  } catch (n) {
    me("Could not place file", n?.message || String(n), n?.traceback);
  }
}
async function za(s = h.doc, e = !1) {
  if (!s) return !1;
  let t = s.path;
  if (!t || e) {
    if (
      ((t = await window.brushboard.dialog.save({
        title: "Save As",
        defaultPath: (h.prefs.lastDir ? h.prefs.lastDir + "/" : "") + s.name + ".brb",
        filters: [{ name: "BrushBoard Document", extensions: ["brb"] }],
      })),
      !t)
    )
      return !1;
    t.toLowerCase().endsWith(".brb") || (t += ".brb");
  }
  try {
    h.status(`Saving ${pe(t)}…`);
    const n = await yo(s);
    return (
      await window.brushboard.fs.write(t, n),
      (s.path = t),
      (s.name = gt(pe(t))),
      s.markSaved(),
      h.addRecent(t),
      h.status(""),
      h.notify(`Saved ${pe(t)}`, "success", 2e3),
      k.emit("docs:changed"),
      !0
    );
  } catch (n) {
    return (h.status(""), me("Save failed", n?.message || String(n)), !1);
  }
}
async function _o(s) {
  if (!s.modified) return !0;
  const e = await qi("Unsaved changes", `Save changes to "${s.name}" before closing?`, [
    "Cancel",
    "Don't Save",
    "Save",
  ]);
  return e === 0 ? !1 : e === 2 ? za(s) : !0;
}
async function Rp(s, e, t, n, i) {
  const a = ve(s, s.layers, "rgba16f");
  let o = s.width,
    r = s.height,
    l = a;
  if (n !== 1) {
    const { resample: v } = await re(
      async () => {
        const { resample: y } = await Promise.resolve().then(() => wi);
        return { resample: y };
      },
      void 0,
      import.meta.url,
    );
    ((o = Math.max(1, Math.round(s.width * n))),
      (r = Math.max(1, Math.round(s.height * n))),
      (l = g.createTex(o, r, "rgba16f")),
      v(a, l, o / s.width, r / s.height, 2),
      g.dispose(a));
  }
  const c = g.read8(l);
  g.dispose(l);
  const u = new OffscreenCanvas(o, r),
    d = u.getContext("2d"),
    f = new ImageData(new Uint8ClampedArray(c.buffer, c.byteOffset, c.byteLength), o, r);
  if (i) {
    const v = new OffscreenCanvas(o, r);
    (v.getContext("2d").putImageData(f, 0, 0), (d.fillStyle = "#fff"), d.fillRect(0, 0, o, r), d.drawImage(v, 0, 0));
  } else d.putImageData(f, 0, 0);
  const m = await u.convertToBlob({ type: e, quality: t });
  return new Uint8Array(await m.arrayBuffer());
}
const Ci = (s) => {
    let e = "";
    for (let t = 0; t < s.length; t += 32768) e += String.fromCharCode(...s.subarray(t, t + 32768));
    return btoa(e);
  },
  Bn = (s) => {
    const e = atob(s),
      t = new Uint8Array(e.length);
    for (let n = 0; n < e.length; n++) t[n] = e.charCodeAt(n);
    return t;
  };
function Fp(s) {
  const e = {},
    t = [];
  let n = 0;
  const i = (o) => {
    const r = { name: o.name, visible: o.visible, opacity: o.opacity, blend: o.blend, clip: o.clip };
    if (o.kind === "adjustment" || (!o.tex && o.kind !== "group")) return null;
    const l = {};
    if (
      (o.shape && (l.shape = o.shape),
      o.text && (l.text = o.text),
      o.vmask && ((l.vmask = o.vmask), (l.vmaskEnabled = o.vmaskEnabled !== !1)),
      t.push(Object.keys(l).length ? l : null),
      o.kind === "group")
    )
      return { ...r, kind: "group", children: o.children.map(i).filter(Boolean) };
    let c = o.tex;
    o.fx && (c = ve(s, [{ ...o, opacity: 1, blend: "normal", clip: !1, mask: null }]));
    const u = `L${n++}`;
    ((e[u] = c.k
      ? { data: g.readInk(c), width: s.width, height: s.height, channels: 5 }
      : { data: g.read(c), width: s.width, height: s.height }),
      c !== o.tex && g.dispose(c));
    const d = { ...r, kind: "raster", buffer: u },
      f = o.shape;
    if (
      (f && f.fill && !(f.stroke && f.strokeWidth > 0) && (f.fillOpacity ?? 1) >= 0.999 && !o.vmask && !o.fx
        ? ((d.soco = s.ink ? { ink: os(f.fill, s.ink) } : f.fill), (d.vmask = Ci(Zs(f.path, s.width, s.height))))
        : o.vmask && ((d.vmask = Ci(Zs(o.vmask, s.width, s.height))), (d.vmaskEnabled = o.vmaskEnabled !== !1)),
      o.mask)
    ) {
      const m = `M${n++}`,
        v = g.read(o.mask),
        y = new Float32Array(s.width * s.height);
      for (let b = 0; b < y.length; b++) y[b] = v[b * 4];
      ((e[m] = { data: y, width: s.width, height: s.height, channels: 1 }),
        (d.mask = m),
        (d.maskEnabled = o.maskEnabled));
    }
    return d;
  };
  return { layers: s.layers.map(i).filter(Boolean), buffers: e, appData: t };
}
async function jc(s = h.doc, e = !1) {
  if (!s) return;
  const t = !!(h.python.python && h.python.capabilities.numpy),
    n = [
      { value: "png", label: "PNG", py: !1 },
      { value: "jpeg", label: "JPEG", py: !1 },
      { value: "webp", label: "WebP", py: !1 },
      { value: "tiff", label: "TIFF (8/16/32-bit)", py: !0 },
      { value: "psd", label: "Photoshop PSD (layers)", py: !0 },
      { value: "exr", label: "OpenEXR (32-bit float)", py: !0 },
      { value: "pdf", label: "PDF (print)", py: !0 },
      ...un()
        .filter((u) => u.canWrite)
        .map((u) => ({ value: `ext:${u.ext}:${u.id}`, label: `${u.name} (extension)`, py: !0 })),
    ],
    a = {
      ...h.setting("export.last", { format: "png", bits: 8, quality: 0.92, scale: 1, icc: "srgb", flattenBg: !0 }),
    };
  if (!e) {
    const u = new Y("Export As", { width: 420, ok: "Export…" }),
      d = p("div"),
      f = () => {
        ((d.innerHTML = ""),
          d.append(
            p(
              "div",
              { class: "form-row" },
              p("span", { class: "sf-label" }, "Format"),
              O(
                n.map((v) => ({ value: v.value, label: v.label + (v.py && !t ? " — needs Python" : "") })),
                a.format,
                (v) => {
                  ((a.format = v), f());
                },
              ),
            ),
            ["png", "tiff"].includes(a.format)
              ? p(
                  "div",
                  { class: "form-row" },
                  p("span", { class: "sf-label" }, "Bit depth"),
                  O(
                    [
                      { value: 8, label: "8 bits/channel" },
                      { value: 16, label: "16 bits/channel" },
                      ...(a.format === "tiff" ? [{ value: 32, label: "32 bits/channel float" }] : []),
                    ],
                    a.bits,
                    (v) => (a.bits = v),
                  ),
                )
              : "",
            s.ink && ["tiff", "jpeg", "pdf"].includes(a.format)
              ? p(
                  "div",
                  { class: "form-row" },
                  p("span", { class: "sf-label" }, "Color"),
                  O(
                    [
                      { value: "cmyk", label: `CMYK — ${s.ink.name}` },
                      { value: "rgb", label: "Convert to sRGB" },
                    ],
                    a.colorOut || "cmyk",
                    (v) => {
                      ((a.colorOut = v), f());
                    },
                  ),
                )
              : "",
            s.ink && ["png", "webp", "exr"].includes(a.format)
              ? p("p", { class: "hint" }, "This format is RGB only: the picture is converted from CMYK to sRGB.")
              : "",
            a.format === "pdf"
              ? p(
                  "div",
                  { class: "form-row" },
                  p("span", { class: "sf-label" }, "Resolution"),
                  q({
                    value: a.dpi || s.dpi || 300,
                    min: 36,
                    max: 2400,
                    unit: "ppi",
                    width: 60,
                    onInput: (v) => (a.dpi = v),
                  }),
                )
              : "",
            a.format === "pdf"
              ? p(
                  "p",
                  { class: "hint" },
                  s.ink && (a.colorOut || "cmyk") === "cmyk"
                    ? "DeviceCMYK image with the press profile as output intent."
                    : "sRGB image, flattened over white.",
                )
              : "",
            ["jpeg", "webp"].includes(a.format)
              ? Q({
                  label: "Quality",
                  value: Math.round(a.quality * 100),
                  min: 1,
                  max: 100,
                  unit: "%",
                  onInput: (v) => (a.quality = v / 100),
                })
              : "",
            a.format !== "psd"
              ? p(
                  "div",
                  { class: "form-row" },
                  p("span", { class: "sf-label" }, "Scale"),
                  q({
                    value: a.scale * 100,
                    min: 1,
                    max: 1e3,
                    unit: "%",
                    width: 60,
                    onInput: (v) => (a.scale = v / 100),
                  }),
                )
              : "",
            t &&
              !["exr", "pdf"].includes(a.format) &&
              !(s.ink && a.format === "psd") &&
              !(s.ink && (a.colorOut || "cmyk") === "cmyk" && ["tiff", "jpeg"].includes(a.format))
              ? p(
                  "div",
                  { class: "form-row" },
                  p("span", { class: "sf-label" }, "Color profile"),
                  O(
                    [
                      { value: "srgb", label: "Embed sRGB IEC61966-2.1" },
                      { value: "none", label: "Don't embed" },
                      { value: "pick", label: "Convert to profile…" },
                    ],
                    a.icc === "srgb" || a.icc === "none" ? a.icc : "pick",
                    async (v) => {
                      if (v === "pick") {
                        const y = await window.brushboard.dialog.open({
                          title: "Choose ICC profile",
                          defaultPath: "/usr/share/color/icc",
                          filters: [{ name: "ICC profiles", extensions: ["icc", "icm"] }],
                        });
                        ((a.icc = y[0] || "srgb"), f());
                      } else a.icc = v;
                    },
                  ),
                )
              : "",
            a.icc !== "srgb" && a.icc !== "none" ? p("p", { class: "hint" }, "Converting to: " + a.icc) : "",
            p("p", { class: "hint" }, `${Math.round(s.width * a.scale)} × ${Math.round(s.height * a.scale)} px`),
          ));
      };
    if ((f(), u.body.append(d), (u.onOk = () => a), !(await u.show()))) return;
  }
  const r = a.format.startsWith("ext:")
      ? un().find((u) => `ext:${u.ext}:${u.id}` === a.format)?.extensions[0] || "dat"
      : { png: "png", jpeg: "jpg", webp: "webp", tiff: "tif", psd: "psd", exr: "exr", pdf: "pdf" }[a.format],
    l = s.sourcePath ? gt(pe(s.sourcePath)) : s.name,
    c = await window.brushboard.dialog.save({
      title: "Export",
      defaultPath: (h.prefs.lastDir ? h.prefs.lastDir + "/" : "") + l + "." + r,
      filters: [{ name: a.format.toUpperCase(), extensions: [r] }],
    });
  c && (h.set("export.last", a), await Mo(s, c, a));
}
async function Mo(s, e, t) {
  try {
    h.status(`Exporting ${pe(e)}…`);
    const n =
      !!(h.python.python && h.python.capabilities.numpy) &&
      (t.icc !== "none" || !["png", "jpeg", "webp"].includes(t.format) || t.bits > 8);
    if (t.format.startsWith("ext:")) {
      const [, i, a] = t.format.split(":"),
        o = ve(s, s.layers, "rgba32f"),
        r = g.read(o);
      (g.dispose(o),
        await window.brushboard.python.call(
          i,
          "format_write",
          { format: a, path: e },
          { image: { data: r, width: s.width, height: s.height } },
        ));
    } else if (s.ink && (t.colorOut || "cmyk") === "cmyk" && ["tiff", "jpeg", "pdf"].includes(t.format)) {
      es("CMYK export");
      let i = s.width,
        a = s.height,
        o = ve(s, s.layers, "rgba32f");
      if (t.scale !== 1 && t.format !== "pdf") {
        const { resample: l } = await re(
          async () => {
            const { resample: u } = await Promise.resolve().then(() => wi);
            return { resample: u };
          },
          void 0,
          import.meta.url,
        );
        ((i = Math.max(1, Math.round(s.width * t.scale))), (a = Math.max(1, Math.round(s.height * t.scale))));
        const c = g.createLike(o, i, a);
        (l(o, c, i / s.width, a / s.height, 2), g.dispose(o), (o = c));
      }
      const r = g.readInk(o);
      (g.dispose(o),
        await window.brushboard.python.call(
          "core",
          "write_cmyk",
          {
            path: e,
            format: t.format,
            profile: s.ink.path,
            bits: t.bits,
            quality: Math.round(t.quality * 100),
            dpi: t.dpi || s.dpi || 300,
            title: s.name,
          },
          { image: { data: r, width: i, height: a, channels: 5 } },
        ));
    } else if (t.format === "pdf") {
      es("PDF export");
      const i = ve(s, s.layers, "rgba32f"),
        a = g.read(i);
      (g.dispose(i),
        await window.brushboard.python.call(
          "core",
          "write_pdf",
          { path: e, dpi: t.dpi || s.dpi || 300, bits: t.bits >= 16 ? 16 : 8, title: s.name },
          { image: { data: a, width: s.width, height: s.height } },
        ));
    } else if (t.format === "psd") {
      es("PSD export");
      const { layers: i, buffers: a, appData: o } = Fp(s),
        r = ve(s, s.layers, "rgba32f");
      ((a.composite = r.k
        ? { data: g.readInk(r), width: s.width, height: s.height, channels: 5 }
        : { data: g.read(r), width: s.width, height: s.height }),
        g.dispose(r));
      const l = s.paths
          .filter((f) => !Te(f.path))
          .map((f) => ({ name: f.name, records: Ci(Zs(f.path, s.width, s.height)) })),
        c = s.workPath && !Te(s.workPath) ? Ci(Zs(s.workPath, s.width, s.height)) : null,
        u = o.some(Boolean) ? JSON.stringify({ version: 1, layers: o }) : null,
        d = await window.brushboard.python.call(
          "core",
          "write_psd",
          {
            path: e,
            width: s.width,
            height: s.height,
            bits: s.bitDepth >= 16 ? 16 : 8,
            layers: i,
            paths: l,
            workPath: c,
            appData: u,
            profile: s.ink ? s.ink.path : null,
          },
          a,
        );
      d.result?.warnings?.length && h.notify(d.result.warnings.join(" · "), "info", 6e3);
    } else if (n) {
      let i = s.width,
        a = s.height,
        o = ve(s, s.layers, "rgba32f");
      if (t.scale !== 1) {
        const { resample: l } = await re(
          async () => {
            const { resample: u } = await Promise.resolve().then(() => wi);
            return { resample: u };
          },
          void 0,
          import.meta.url,
        );
        ((i = Math.max(1, Math.round(s.width * t.scale))), (a = Math.max(1, Math.round(s.height * t.scale))));
        const c = g.createTex(i, a, "rgba32f");
        (l(o, c, i / s.width, a / s.height, 2), g.dispose(o), (o = c));
      }
      const r = g.read(o);
      (g.dispose(o),
        await window.brushboard.python.call(
          "core",
          "write_image",
          {
            path: e,
            format: t.format,
            bits: t.format === "exr" ? 32 : t.bits,
            quality: Math.round(t.quality * 100),
            icc: t.icc,
          },
          { image: { data: r, width: i, height: a } },
        ));
    } else {
      ["png", "jpeg", "webp"].includes(t.format) || es(t.format.toUpperCase() + " export");
      const i = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" }[t.format],
        a = await Rp(s, i, t.quality, t.scale, t.format === "jpeg");
      await window.brushboard.fs.write(e, a);
    }
    (h.status(""), h.notify(`Exported ${pe(e)}`, "success", 2500));
  } catch (n) {
    (h.status(""), me("Export failed", n?.message || String(n), n?.traceback));
  }
}
async function Dp(s = h.doc) {
  if (!s) return;
  const e = s.path || s.sourcePath;
  if (!e) return jc(s);
  const t = e.replace(/\.[^.]+$/, "") + ".png";
  await Mo(s, t, { format: "png", bits: 8, quality: 1, scale: 1, icc: "srgb", flattenBg: !1 });
}
async function zp(s) {
  const e = new Y("Extensions", { width: 720, ok: null, cancel: "Close", cls: "ext-manager" }),
    t = p("div", { class: "py-status" }),
    n = p("div", { class: "ext-list" }),
    i = p("pre", { class: "ext-log" }),
    a = k.on("python:event", (c) => {
      (c.event === "pip" || c.event === "log") && ((i.textContent += c.params.text), (i.scrollTop = i.scrollHeight));
    }),
    o = async () => {
      te(t);
      const c = await window.brushboard.python.status();
      h.python = c;
      const u = c.capabilities || {},
        d = (f, m) =>
          p("span", { class: "cap " + (u[f] ? "ok" : "missing"), title: u[f] ? String(u[f]) : "not installed" }, m);
      t.append(
        p(
          "div",
          { class: "row" },
          p("strong", null, "Python: "),
          p("code", null, c.python || "not found"),
          p("span", { class: "flex1" }),
          p(
            "button",
            {
              class: "btn small",
              onclick: async () => {
                (await window.brushboard.python.restart(), await o());
              },
            },
            "Restart workers",
          ),
          p(
            "button",
            {
              class: "btn small primary",
              title: "Create ~/.local/share/brushboard/venv with numpy, Pillow, OpenCV, psd-tools, rawpy, tifffile",
              onclick: async (f) => {
                const m = f.currentTarget;
                ((m.disabled = !0), (m.textContent = "Installing… (see log)"));
                try {
                  const v = await window.brushboard.python.setupVenv();
                  (h.notify("Python environment ready: " + v, "success"), await o(), await s(), await r());
                } catch (v) {
                  me("Python setup failed", v.message);
                }
                ((m.disabled = !1), (m.textContent = "Set up Python environment"));
              },
            },
            "Set up Python environment",
          ),
        ),
        p(
          "div",
          { class: "caps" },
          d("numpy", "NumPy"),
          d("PIL", "Pillow"),
          d("cv2", "OpenCV"),
          d("psd_tools", "psd-tools"),
          d("rawpy", "rawpy (RAW)"),
          d("tifffile", "tifffile"),
          d("openexr", "OpenEXR"),
          d("onnxruntime", "onnxruntime (AI)"),
          d("lcms", "LittleCMS"),
        ),
        c.error ? p("div", { class: "err" }, c.error) : "",
      );
    },
    r = async () => {
      te(n);
      for (const c of Qe) {
        const u = c.contributions,
          d = u
            ? [
                `${u.filters.length} filters`,
                `${u.tools.length} tools`,
                `${u.panels.length} panels`,
                `${u.commands.length} commands`,
                `${u.formats.length} formats`,
              ]
                .filter((m) => !m.startsWith("0 "))
                .join(" · ")
            : "",
          f = p("input", { type: "checkbox", checked: c.enabled });
        ((f.onchange = async () => {
          (await window.brushboard.python.setExtensionEnabled(c.id, f.checked), await s(), await r());
        }),
          n.appendChild(
            p(
              "div",
              { class: "ext-card" + (c.enabled ? "" : " disabled") },
              p(
                "div",
                { class: "ext-head" },
                f,
                p("strong", null, c.manifest.name || c.id),
                p("span", { class: "ver" }, c.manifest.version || ""),
                c.builtin ? p("span", { class: "chip small" }, "bundled") : null,
              ),
              p("div", { class: "ext-desc" }, c.manifest.description || ""),
              p(
                "div",
                { class: "ext-meta" },
                c.manifest.author ? `by ${c.manifest.author} · ` : "",
                d,
                (c.manifest.requirements || []).length
                  ? ` · requires: ${(c.manifest.requirements || []).join(", ")}`
                  : "",
              ),
              c.error ? p("pre", { class: "err" }, c.error.slice(0, 1200)) : null,
              u?.errors?.length
                ? p(
                    "pre",
                    { class: "err" },
                    u.errors.join(`
`),
                  )
                : null,
              p(
                "div",
                { class: "ext-actions" },
                p(
                  "button",
                  {
                    class: "btn small",
                    onclick: async () => {
                      try {
                        (await window.brushboard.python.reloadExtension(c.id),
                          await s(),
                          await r(),
                          h.notify(`Reloaded ${c.id}`, "success"));
                      } catch (m) {
                        me("Reload failed", m.message);
                      }
                    },
                  },
                  "Reload",
                ),
                (c.manifest.requirements || []).length
                  ? p(
                      "button",
                      {
                        class: "btn small",
                        onclick: async () => {
                          try {
                            (await window.brushboard.python.installDeps(c.id),
                              await window.brushboard.python.reloadExtension(c.id),
                              await s(),
                              await r(),
                              h.notify("Dependencies installed", "success"));
                          } catch (m) {
                            me("pip failed", m.message);
                          }
                        },
                      },
                      "Install dependencies",
                    )
                  : null,
                p(
                  "button",
                  { class: "btn small", onclick: () => window.brushboard.shell.openPath(c.dir) },
                  "Open folder",
                ),
              ),
            ),
          ));
      }
      Qe.length || n.appendChild(p("p", { class: "hint" }, "No extensions found."));
    },
    l = await window.brushboard.app.info();
  (e.body.append(
    t,
    p(
      "div",
      { class: "row" },
      p("h4", null, "Installed extensions"),
      p("span", { class: "flex1" }),
      p(
        "button",
        {
          class: "btn small",
          onclick: async () => {
            const c = (
              await window.brushboard.dialog.open({ title: "Install extension folder", properties: ["openDirectory"] })
            )[0];
            if (c)
              try {
                const u = await window.brushboard.python.installExtension(c);
                (await s(), await r(), h.notify(`Installed ${u}`, "success"));
              } catch (u) {
                me("Install failed", u.message);
              }
          },
        },
        "Install from folder…",
      ),
      p(
        "button",
        { class: "btn small", onclick: () => window.brushboard.shell.openPath(l.userExtDir) },
        "Open user extensions folder",
      ),
      p(
        "button",
        {
          class: "btn small",
          onclick: async () => {
            (await s(), await r());
          },
        },
        "Rescan",
      ),
    ),
    n,
    p("details", null, p("summary", null, "Log"), i),
    p("p", { class: "hint" }, `User extensions live in ${l.userExtDir}. See docs/EXTENSIONS.md for the SDK.`),
  ),
    o(),
    r(),
    await e.show(),
    a());
}
async function Ip() {
  const s = (
    await window.brushboard.dialog.open({
      title: "Run Python Script",
      properties: ["openFile"],
      filters: [{ name: "Python", extensions: ["py"] }],
    })
  )[0];
  if (s)
    try {
      h.status("Running script…");
      const e = await window.brushboard.python.runScript(s);
      (h.status(""), h.notify(typeof e == "string" ? e : "Script finished", "success"));
    } catch (e) {
      (h.status(""), me("Script failed", e.message, e.traceback));
    }
}
const Op = (s) =>
    s
      .split(",")[0]
      .replace(/^(NVIDIA|AMD|Intel(\(R\))?)\s+/i, "")
      .replace(/GeForce\s+|Corporation\s+/g, ""),
  lr = { cuda: "CUDA", rocm: "ROCm", openvino: "OpenVINO" };
function Bp(s) {
  return s
    ? s.device && s.device !== "cpu"
      ? {
          text: `GPU · ${s.gpu ? Op(s.gpu) : lr[s.device]}`,
          title: `AI runs on ${s.gpu || "the graphics card"} (${lr[s.device]})`,
          cls: "ok",
        }
      : s.wanted === "cpu"
        ? { text: "CPU", title: "AI runs on the processor (Edit › AI Acceleration)", cls: "" }
        : s.device === "cpu" && s.gpuProviders?.length
          ? {
              text: "CPU (GPU not usable)",
              title: `A GPU pack is installed, but the graphics card could not run the model: ${s.error || "unknown reason"}. AI runs on the processor. See Edit › AI Acceleration.`,
              cls: "missing",
            }
          : !s.device && s.gpuProviders?.length
            ? {
                text: "GPU",
                title: "AI will run on the graphics card — the first run takes a few seconds to start it",
                cls: "ok",
              }
            : {
                text: "CPU",
                title:
                  "AI runs on the processor. Edit › AI Acceleration can add a GPU pack for NVIDIA, AMD or Intel graphics.",
                cls: "",
              }
    : { text: "", title: "", cls: "" };
}
function Gc(s) {
  const e = Bp(s);
  return e.text ? p("span", { class: "cap " + e.cls, title: e.title }, e.text) : null;
}
let xe = { engine: null },
  Us = !1;
async function Bt() {
  try {
    xe = (await window.brushboard.python.call("core", "ai_status", {})).result || { engine: null };
  } catch (s) {
    xe = { engine: null, error: s?.message };
  }
  return (k.emit("ai:status", xe), xe);
}
async function Ui(s = !0) {
  if (!h.python.capabilities.numpy)
    return (
      me(
        "Python helper needed",
        `Subject Snap runs in BrushBoard's Python helper, which is not set up on this computer. Open Extensions › Manage Extensions and click "Set up Python environment", then try again. (Installer builds of BrushBoard include everything already.)`,
      ),
      !1
    );
  if (xe.modelPath) return !0;
  if (s) {
    const e = Math.round((xe.modelSize || 176e6) / 1e6);
    if (
      (await qi(
        "Download Subject Snap model",
        `Subject Snap uses a ${e} MB people-segmentation model (U²-Net, ONNX) that runs entirely on this computer. Download it once into ${xe.downloadDir || "~/.local/share/brushboard/models"}?`,
        ["Not now", "Download"],
      )) !== 1
    )
      return !1;
  }
  try {
    return (
      h.status("Downloading Subject Snap model…"),
      await window.brushboard.python.call("core", "ai_download", {}),
      await Bt(),
      h.status(""),
      h.notify("Subject Snap model installed", "success"),
      k.emit("tool:options"),
      !0
    );
  } catch (e) {
    return (h.status(""), me("Download failed", e?.message || String(e)), !1);
  }
}
function $p(s, e) {
  const t = s.active,
    n = e ? s.all().map((i) => `${i.id}.${i.version}.${i.visible ? 1 : 0}.${i.opacity}`) : [`${t?.id}.${t?.version}`];
  return `${s.id}|${s.width}x${s.height}|${e ? "all" : "layer"}|${n.join(",")}`;
}
async function dn(s, e = {}) {
  if (!h.python.capabilities.numpy)
    throw new Error(
      "Subject Snap needs the Python helper. Use Extensions › Manage Extensions › Set up Python environment.",
    );
  if (Us) return null;
  (xe.engine === null && (await Bt()),
    xe.engine !== "model" &&
      xe.onnxruntime &&
      !xe.modelPath &&
      !h.setting("ai.declined", !1) &&
      ((await Ui()) || h.set("ai.declined", !0)));
  const t = e.sampleAll ?? h.setting("snap.all", !0),
    n = s.active;
  let i = t || !n?.tex ? ve(s, s.layers, "rgba32f") : null;
  const a = g.read(i || n.tex);
  (i && g.dispose(i),
    (Us = !0),
    k.emit("render"),
    h.status(xe.engine === "model" ? "Subject Snap: finding the person…" : "Subject Snap (OpenCV fallback)…"));
  try {
    const o = await window.brushboard.python.call(
        "core",
        "ai_segment",
        {
          box: e.box || null,
          point: e.point || null,
          edge: e.edge === void 0 ? h.setting("snap.edge", "fine") : e.edge,
          hardness: e.hardness ?? h.setting("snap.hardness", 0.5),
          key: e.box ? null : $p(s, t),
        },
        { image: { data: a, width: s.width, height: s.height } },
      ),
      r = o.result || {};
    return (
      h.status(r.ms ? `Subject Snap: ${r.engine === "model" ? "model" : "OpenCV"} · ${r.ms} ms` : ""),
      r.engine === "model" && !xe.accel?.device && Bt(),
      !r.found || !o.buffers.mask ? null : new Float32Array(o.buffers.mask.data)
    );
  } finally {
    ((Us = !1), k.emit("render"));
  }
}
async function Wc(s = h.doc, e = "replace") {
  if (!s) return;
  const t = await dn(s);
  if (!t) {
    h.notify(
      "Subject Snap could not find a person. Try dragging a box around them with the Subject Snap tool.",
      "info",
      5e3,
    );
    return;
  }
  kn(s, t, e, "Select Subject");
}
async function Uc(s = h.doc) {
  if (!s) return;
  const e = s.active;
  if (!e) throw new B("Select the layer to cut out.");
  if (e.kind === "adjustment") throw new B("Select a pixel layer or group.");
  let t;
  if (s.selection) {
    const { selectionBounds: i } = await re(
        async () => {
          const { selectionBounds: o } = await Promise.resolve().then(() => ol);
          return { selectionBounds: o };
        },
        void 0,
        import.meta.url,
      ),
      a = i(s);
    t = await dn(s, a ? { box: [a.x, a.y, a.w, a.h] } : {});
  } else t = await dn(s);
  if (!t) {
    h.notify("Subject Snap could not find a person to keep.", "info", 5e3);
    return;
  }
  const n = s.newMaskTex(0);
  (g.upload(n, t),
    s.transact("Remove Background", () => {
      ((e.mask = n), (e.maskEnabled = !0), (s.editMask = !0), s.selection && s.setSelection(null));
    }),
    h.notify("Background hidden with a layer mask — paint on the mask to touch it up.", "success", 4e3));
}
const qp =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="8.6" r="2.4"/><path d="M7.6 17.5c.6-2.7 2.4-4.2 4.4-4.2s3.8 1.5 4.4 4.2"/></svg>';
class Hc {
  id = "subjectSnap";
  name = "Subject Snap Tool";
  icon = qp;
  shortcut = "W";
  group = "snap";
  cursor = "crosshair";
  a = null;
  b = null;
  op = "replace";
  constructor() {
    k.on("ai:status", () => {
      h.tool === this && k.emit("tool:options");
    });
  }
  activate() {
    xe.engine === null && h.python.python && Bt();
  }
  options() {
    const e = xe,
      t =
        e.engine === "model"
          ? p("span", { class: "cap ok", title: e.modelPath || "" }, "AI model ready")
          : h.python.capabilities.numpy
            ? e.onnxruntime
              ? p("button", { class: "btn small primary", onclick: () => Ui(!1) }, "Download AI model (176 MB)")
              : p(
                  "span",
                  {
                    class: "cap missing",
                    title: "Install onnxruntime via Extensions › Manage Extensions › Set up Python environment",
                  },
                  e.engine === "opencv" ? "OpenCV fallback" : "Python needed",
                )
            : p(
                "button",
                {
                  class: "btn small primary",
                  title: "Subject Snap needs the Python helper",
                  onclick: () => h.run("ext.manager"),
                },
                "Set up Python…",
              );
    return p(
      "div",
      { class: "opts" },
      uo("snap.mode"),
      N(),
      $("Sample All Layers", h.setting("snap.all", !0), (n) => h.set("snap.all", n)),
      H("Edges"),
      O(
        [
          { value: "fine", label: "Hair-fine" },
          { value: "smooth", label: "Smooth" },
          { value: "", label: "Raw" },
        ],
        h.setting("snap.edge", "fine") || "",
        (n) => h.set("snap.edge", n || null),
      ),
      Me("Hardness", h.setting("snap.hardness", 0.5), (n) => h.set("snap.hardness", n)),
      N(),
      p("button", { class: "btn small", onclick: () => h.run("select.subject") }, "Select Subject"),
      p("button", { class: "btn small", onclick: () => h.run("layer.removeBackground") }, "Remove Background"),
      N(),
      t,
      e.engine === "model" ? Gc(e.accel) : null,
      p("span", { class: "opt-hint" }, "Drag a box around a person, or click one"),
    );
  }
  down(e) {
    Us || ((this.op = on(e, h.setting("snap.mode", "replace"))), (this.a = [e.x, e.y]), (this.b = [e.x, e.y]));
  }
  move(e) {
    this.a && (this.b = [e.x, e.y]);
  }
  async up(e) {
    const t = this.a,
      n = this.b;
    if (((this.a = this.b = null), !t || !n)) return;
    const i = h.doc,
      a = (
        await re(
          async () => {
            const { viewport: l } = await Promise.resolve().then(() => kd);
            return { viewport: l };
          },
          void 0,
          import.meta.url,
        )
      ).viewport.xf(),
      o = Math.abs(n[0] - t[0]) * a.zoom > 6 || Math.abs(n[1] - t[1]) * a.zoom > 6,
      r = o
        ? { box: [Math.min(t[0], n[0]), Math.min(t[1], n[1]), Math.abs(n[0] - t[0]), Math.abs(n[1] - t[1])] }
        : { point: [e.x, e.y] };
    try {
      const l = await dn(i, r);
      if (!l) {
        h.notify(
          o ? "No person found in that box." : "No person found there — try dragging a box around them.",
          "info",
          4e3,
        );
        return;
      }
      kn(i, l, this.op, "Subject Snap");
    } catch (l) {
      h.error(l);
    }
  }
  overlay(e, t) {
    if (this.a && this.b) {
      const n = [
        [this.a[0], this.a[1]],
        [this.b[0], this.a[1]],
        [this.b[0], this.b[1]],
        [this.a[0], this.b[1]],
      ].map(([i, a]) => t.docToScreen(i, a));
      (e.save(),
        e.beginPath(),
        n.forEach(([i, a], o) => (o ? e.lineTo(i, a) : e.moveTo(i, a))),
        e.closePath(),
        (e.fillStyle = "rgba(143,180,220,0.08)"),
        e.fill(),
        e.setLineDash([6, 4]),
        (e.lineDashOffset = -(performance.now() / 50) % 10),
        (e.strokeStyle = "#8fb4dc"),
        (e.lineWidth = 1.5),
        e.stroke(),
        e.restore());
    }
    if (Us) {
      const n = performance.now() / 300;
      (e.save(), (e.font = "12px system-ui"));
      const i = "Snapping to subject…",
        a = e.measureText(i).width + 40,
        o = e.canvas.width / (window.devicePixelRatio || 1) / 2 - a / 2,
        r = 18;
      ((e.fillStyle = "rgba(24,28,33,.88)"),
        e.fillRect(o, r, a, 26),
        e.beginPath(),
        e.arc(o + 15, r + 13, 6, n, n + 4.2),
        (e.strokeStyle = "#8fb4dc"),
        (e.lineWidth = 2),
        e.stroke(),
        (e.fillStyle = "#e3e7eb"),
        e.fillText(i, o + 28, r + 17),
        e.restore(),
        k.emit("render"));
    }
  }
  cancel() {
    this.a = this.b = null;
  }
}
const Np = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        SubjectSnapTool: Hc,
        get aiStatus() {
          return xe;
        },
        downloadModel: Ui,
        refreshAiStatus: Bt,
        removeBackground: Uc,
        segmentPeople: dn,
        selectSubject: Wc,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  Ia = 6,
  cr = 5,
  jp = 5,
  W = { target: "", anchors: new Set() },
  Le = (s, e) => `${s}:${e}`;
function Gp(s) {
  const e = s?.id || "";
  W.target !== e && ((W.target = e), W.anchors.clear());
}
const Oa = (s) => L.xf().docToScreen(s[0], s[1]),
  ts = (s, e) => {
    const t = Oa(s);
    return Math.hypot(t[0] - e.sx, t[1] - e.sy);
  };
function tt(s, e, t) {
  if (!s) return null;
  if (t) for (let i = 0; i < s.subpaths.length; i++) s.subpaths[i].nodes.forEach(() => {});
  if (t)
    for (let i = 0; i < s.subpaths.length; i++) {
      const a = s.subpaths[i].nodes;
      for (let o = 0; o < a.length; o++) {
        if (!Vc(s, i, o)) continue;
        const r = a[o];
        if ((r.ox !== r.x || r.oy !== r.y) && ts([r.ox, r.oy], e) < cr)
          return { kind: "handle", sub: i, i: o, side: "out" };
        if ((r.ix !== r.x || r.iy !== r.y) && ts([r.ix, r.iy], e) < cr)
          return { kind: "handle", sub: i, i: o, side: "in" };
      }
    }
  for (let i = 0; i < s.subpaths.length; i++) {
    const a = s.subpaths[i].nodes;
    for (let o = 0; o < a.length; o++) if (ts([a[o].x, a[o].y], e) < Ia) return { kind: "anchor", sub: i, i: o };
  }
  const n = Wa(s, [e.x, e.y]);
  if (n && ts(n.pt, e) < jp) return { kind: "segment", sub: n.sub, i: n.i, t: n.t };
  for (let i = 0; i < s.subpaths.length; i++) {
    const a = s.subpaths[i];
    if (a.nodes.length > 2 && Xr({ subpaths: [a], fillRule: s.fillRule }, [e.x, e.y]))
      return { kind: "inside", sub: i };
  }
  return null;
}
function Vc(s, e, t) {
  if (W.anchors.has(Le(e, t))) return !0;
  const n = s.subpaths[e].nodes.length,
    i = s.subpaths[e].closed,
    a = t > 0 ? t - 1 : i ? n - 1 : -1,
    o = t < n - 1 ? t + 1 : i ? 0 : -1;
  return (a >= 0 && W.anchors.has(Le(e, a))) || (o >= 0 && W.anchors.has(Le(e, o)));
}
class Wp {
  tex = null;
  keyName = "";
  show(e, t, n) {
    if (t.id.startsWith("shape:")) {
      const i = e.find(t.id.slice(6))?.layer;
      if (!i?.shape) return;
      (this.tex || (this.tex = e.acquireLayer()),
        zi(e, { ...i.shape, path: n }, this.tex),
        (this.keyName = i.id),
        e.preview.set(i.id, { tex: this.tex }),
        e.invalidate());
    } else if (t.id.startsWith("vmask:")) {
      const i = e.find(t.id.slice(6))?.layer;
      if (!i) return;
      (this.tex || (this.tex = g.acquire(e.width, e.height, "r16f")),
        Mn(e, n, !0, 0, this.tex),
        (this.keyName = i.id + ":vmask"),
        e.preview.set(this.keyName, { tex: this.tex }),
        e.invalidate());
    } else k.emit("render");
  }
  end(e) {
    (this.keyName && e && e.preview.delete(this.keyName),
      this.tex && g.release(this.tex),
      (this.tex = null),
      (this.keyName = ""),
      e?.invalidate());
  }
}
function Xc(s, e, t, n = {}) {
  if (!t) return;
  const i = n.color || "#4fa3ff";
  s.save();
  for (const a of t.subpaths) {
    const o = Mt(a, 0.6 / Math.max(0.05, e.zoom));
    o.length < 2 ||
      (s.beginPath(),
      o.forEach((r, l) => {
        const c = e.docToScreen(r[0], r[1]);
        l ? s.lineTo(c[0], c[1]) : s.moveTo(c[0], c[1]);
      }),
      a.closed && s.closePath(),
      (s.lineWidth = 2.5),
      (s.strokeStyle = "rgba(0,0,0,.35)"),
      s.stroke(),
      (s.lineWidth = 1),
      (s.strokeStyle = i),
      s.stroke());
  }
  (n.anchors !== !1 &&
    t.subpaths.forEach((a, o) =>
      a.nodes.forEach((r, l) => {
        const c = e.docToScreen(r.x, r.y);
        if (Vc(t, o, l))
          for (const [d, f] of [
            [r.ix, r.iy],
            [r.ox, r.oy],
          ]) {
            if (d === r.x && f === r.y) continue;
            const m = e.docToScreen(d, f);
            (s.beginPath(),
              s.moveTo(c[0], c[1]),
              s.lineTo(m[0], m[1]),
              (s.lineWidth = 1),
              (s.strokeStyle = i),
              s.stroke(),
              s.beginPath(),
              s.arc(m[0], m[1], 3, 0, Math.PI * 2),
              (s.fillStyle = i),
              s.fill());
          }
        const u = W.anchors.has(Le(o, l));
        ((s.fillStyle = u ? i : "#fff"),
          (s.strokeStyle = u ? "#fff" : i),
          (s.lineWidth = 1),
          s.fillRect(c[0] - 3.5, c[1] - 3.5, 7, 7),
          s.strokeRect(c[0] - 3.5, c[1] - 3.5, 7, 7));
      }),
    ),
    s.restore());
}
class Ts {
  group = "pen";
  shortcut = "P";
  cursor = "crosshair";
  live = new Wp();
  ref() {
    const e = h.doc;
    if (!e) return null;
    const t = St(e);
    return (Gp(t), t);
  }
  overlay(e, t) {
    if (!h.doc) return;
    const i = this.ref();
    Xc(e, t, this.shownPath(i), { anchors: !0 });
  }
  shownPath(e) {
    return e?.get() || null;
  }
  deactivate() {
    this.live.end(h.doc);
  }
  cancel() {
    (this.live.end(h.doc), k.emit("render"));
  }
}
function So(s) {
  const e = h.setting(s + ".mode", "path"),
    t = [
      is(
        [
          { value: "shape", label: "Shape", title: "Each new path becomes an editable vector shape layer" },
          {
            value: "path",
            label: "Path",
            title: "Draw a path (Paths panel) — for selections, masks, strokes, text on a path",
          },
        ],
        e,
        (n) => {
          (h.set(s + ".mode", n), k.emit("tool:options"));
        },
      ),
    ];
  return (e === "shape" && t.push(...Yc()), t);
}
function Yc() {
  return [
    H("Fill"),
    rn(
      () => (h.setting("shape.fillNone", null) ? null : h.fg),
      (s) => {
        s ? (h.setFg(s), h.set("shape.fillNone", null)) : h.set("shape.fillNone", [1, 0, 0]);
      },
      !0,
    ),
    H("Stroke"),
    rn(
      () => h.setting("shape.stroke", null),
      (s) => h.set("shape.stroke", s),
      !0,
    ),
    q({
      value: h.setting("shape.width", 0),
      min: 0,
      max: 500,
      unit: "px",
      width: 40,
      step: 0.5,
      onInput: (s) => h.set("shape.width", s),
    }),
  ];
}
function vs(s) {
  return _n(
    s,
    h.setting("shape.fillNone", null) ? null : [...h.fg],
    h.setting("shape.stroke", null),
    h.setting("shape.width", 0),
  );
}
function Kc(s, e, t, n) {
  if (t.nodes.length < 2) return;
  if (e === "shape") {
    ds(s, "Shape", vs({ subpaths: [t], fillRule: "nonzero" }), n);
    return;
  }
  let i = St(s);
  if ((i && i.id.startsWith("shape:") && (i = s.workPath ? Tn(s, "work") : null), !i)) {
    (s.transact(n, () => {
      s.workPath = { subpaths: [t], fillRule: "nonzero" };
    }),
      (s.activePath = "work"));
    return;
  }
  const a = K(i.get() || cs());
  (a.subpaths.push(t), i.set(a, n));
}
class Jc extends Ts {
  id = "pen";
  name = "Pen Tool";
  icon = R.pen;
  drawing = null;
  drag = null;
  hoverPt = null;
  options() {
    return p(
      "div",
      { class: "opts" },
      ...So("pen"),
      N(),
      $("Auto Add/Delete", h.setting("pen.auto", !0), (e) => h.set("pen.auto", e)),
      $("Rubber Band", h.setting("pen.rubber", !0), (e) => h.set("pen.rubber", e)),
      p(
        "span",
        { class: "opt-hint" },
        "Click: corner · drag: curve · click the first point to close · Enter/Esc: finish · Alt-drag: cusp · Ctrl: direct select",
      ),
    );
  }
  shownPath(e) {
    const t = e?.get() || null;
    if (!this.drawing) return t;
    const n = t && this.drawing.mode === "path" ? K(t) : cs();
    return (n.subpaths.push(this.drawing.sp), n);
  }
  cursorFor(e) {
    if (e.ctrl) return "default";
    if (
      this.drawing &&
      this.drawing.sp.nodes.length > 1 &&
      ts([this.drawing.sp.nodes[0].x, this.drawing.sp.nodes[0].y], e) < Ia + 2
    )
      return "cell";
    if (!this.drawing && h.setting("pen.auto", !0)) {
      const t = tt(this.ref()?.get() || null, e, !1);
      if (t?.kind === "anchor") return "not-allowed";
      if (t?.kind === "segment") return "copy";
    }
    return "crosshair";
  }
  down(e) {
    if ((h.doc, e.ctrl)) {
      ss.down(e);
      return;
    }
    if (!this.drawing && h.setting("pen.auto", !0)) {
      const i = this.ref(),
        a = tt(i?.get() || null, e, !1);
      if (i && a?.kind === "anchor") {
        Qc(i, a.sub, a.i);
        return;
      }
      if (i && a?.kind === "segment") {
        const o = K(i.get()),
          r = Ua(o, a.sub, a.i, a.t);
        (i.set(o, "Add Anchor Point"), (W.anchors = new Set([Le(a.sub, r)])));
        return;
      }
    }
    this.drawing || (this.drawing = { sp: { nodes: [], closed: !1 }, mode: h.setting("pen.mode", "path") });
    const t = this.drawing.sp;
    if (t.nodes.length > 1 && ts([t.nodes[0].x, t.nodes[0].y], e) < Ia + 2) {
      this.drag = { n: t.nodes[0], sx: e.x, sy: e.y, closing: !0 };
      return;
    }
    const n = se(e.x, e.y);
    (t.nodes.push(n), (this.drag = { n, sx: e.x, sy: e.y, closing: !1 }), k.emit("render"));
  }
  move(e) {
    if (e.ctrl && !this.drag) {
      ss.move(e);
      return;
    }
    const t = this.drag;
    if (!t) return;
    const n = e.x - t.n.x,
      i = e.y - t.n.y;
    Math.hypot(n, i) * L.xf().zoom < 2 ||
      ((t.n.ox = e.x),
      (t.n.oy = e.y),
      e.alt ? (t.n.smooth = !1) : ((t.n.ix = t.n.x - n), (t.n.iy = t.n.y - i), (t.n.smooth = !0)),
      t.closing && ((t.n.ix = t.n.x - n), (t.n.iy = t.n.y - i), e.alt || ((t.n.ox = e.x), (t.n.oy = e.y))),
      k.emit("render"));
  }
  up(e) {
    if (e.ctrl && !this.drag) {
      ss.up();
      return;
    }
    const t = this.drag;
    ((this.drag = null),
      t?.closing && this.drawing && ((this.drawing.sp.closed = !0), this.finish()),
      k.emit("render"));
  }
  hover(e) {
    ((this.hoverPt = [e.x, e.y]), this.drawing && k.emit("render"));
  }
  key(e, t) {
    return t
      ? (e.key === "Enter" || e.key === "Escape") && this.drawing
        ? (this.finish(), !0)
        : (e.key === "Backspace" || e.key === "Delete") && this.drawing
          ? (this.drawing.sp.nodes.pop(), this.drawing.sp.nodes.length || (this.drawing = null), k.emit("render"), !0)
          : e.key === "Delete" || e.key === "Backspace"
            ? ss.key(e, t)
            : !1
      : !1;
  }
  finish() {
    const e = this.drawing;
    this.drawing = null;
    const t = h.doc;
    !e ||
      !t ||
      (e.sp.nodes.length >= 2 && Kc(t, e.mode, e.sp, e.mode === "shape" ? "New Shape Layer" : "Pen"), k.emit("render"));
  }
  commit() {
    this.finish();
  }
  deactivate() {
    (this.finish(), super.deactivate());
  }
  overlay(e, t) {
    super.overlay(e, t);
    const n = this.drawing,
      i = L.cursorPos;
    if (n && n.sp.nodes.length && i && !this.drag && h.setting("pen.rubber", !0)) {
      const a = n.sp.nodes[n.sp.nodes.length - 1],
        o = { p0: [a.x, a.y], p1: [a.ox, a.oy], p2: [i[0], i[1]], p3: [i[0], i[1]] };
      (e.save(), e.setLineDash([4, 3]), e.beginPath());
      for (let r = 0; r <= 24; r++) {
        const l = r / 24,
          c = 1 - l,
          u = c * c * c * o.p0[0] + 3 * c * c * l * o.p1[0] + 3 * c * l * l * o.p2[0] + l * l * l * o.p3[0],
          d = c * c * c * o.p0[1] + 3 * c * c * l * o.p1[1] + 3 * c * l * l * o.p2[1] + l * l * l * o.p3[1],
          f = t.docToScreen(u, d);
        r ? e.lineTo(f[0], f[1]) : e.moveTo(f[0], f[1]);
      }
      ((e.strokeStyle = "#4fa3ff"), (e.lineWidth = 1), e.stroke(), e.restore());
    }
  }
}
class Zc extends Ts {
  id = "freeformPen";
  name = "Freeform Pen Tool";
  icon = R.freeformPen;
  pts = null;
  options() {
    return p(
      "div",
      { class: "opts" },
      ...So("pen"),
      N(),
      H("Curve Fit"),
      q({
        value: h.setting("ffpen.tol", 2),
        min: 0.5,
        max: 10,
        step: 0.5,
        unit: "px",
        width: 44,
        onInput: (e) => h.set("ffpen.tol", e),
      }),
      p("span", { class: "opt-hint" }, "Drag to draw; end near the start to close the path"),
    );
  }
  shownPath(e) {
    return e?.get() || null;
  }
  down(e) {
    this.pts = [[e.x, e.y]];
  }
  move(e) {
    if (this.pts) {
      const t = this.pts[this.pts.length - 1];
      (Ae(t, [e.x, e.y]) * L.xf().zoom >= 1.5 && this.pts.push([e.x, e.y]), k.emit("render"));
    }
  }
  up() {
    const e = this.pts;
    this.pts = null;
    const t = h.doc;
    if (!e || e.length < 3 || !t) return;
    const n = Up(e[0], e[e.length - 1]) < 10,
      i = Ha(e, n, h.setting("ffpen.tol", 2));
    Kc(
      t,
      h.setting("pen.mode", "path"),
      i,
      h.setting("pen.mode", "path") === "shape" ? "New Shape Layer" : "Freeform Pen",
    );
  }
  overlay(e, t) {
    (super.overlay(e, t),
      this.pts &&
        this.pts.length > 1 &&
        (e.beginPath(),
        this.pts.forEach((n, i) => {
          const a = t.docToScreen(n[0], n[1]);
          i ? e.lineTo(a[0], a[1]) : e.moveTo(a[0], a[1]);
        }),
        (e.strokeStyle = "#4fa3ff"),
        (e.lineWidth = 1.2),
        e.stroke()));
  }
}
function Up(s, e) {
  const t = Oa(s),
    n = Oa(e);
  return Math.hypot(t[0] - n[0], t[1] - n[1]);
}
function Qc(s, e, t) {
  const n = K(s.get()),
    i = n.subpaths[e];
  (i.nodes.splice(t, 1),
    i.nodes.length < 2 && n.subpaths.splice(e, 1),
    W.anchors.clear(),
    s.set(n, "Delete Anchor Point"));
}
class eu extends Ts {
  id = "addAnchor";
  name = "Add Anchor Point Tool";
  icon = R.addAnchor;
  shortcut = void 0;
  options() {
    return p(
      "div",
      { class: "opts" },
      p("span", { class: "opt-hint" }, "Click a path segment to add an anchor point (the curve keeps its shape)"),
    );
  }
  down(e) {
    const t = this.ref();
    if (!t) throw new B("Select a path first (Paths panel, a shape layer, or draw one with the Pen).");
    const n = tt(t.get(), e, !1);
    if (n?.kind !== "segment") return;
    const i = K(t.get()),
      a = Ua(i, n.sub, n.i, n.t);
    (t.set(i, "Add Anchor Point"), (W.anchors = new Set([Le(n.sub, a)])));
  }
}
class tu extends Ts {
  id = "deleteAnchor";
  name = "Delete Anchor Point Tool";
  icon = R.deleteAnchor;
  shortcut = void 0;
  options() {
    return p("div", { class: "opts" }, p("span", { class: "opt-hint" }, "Click an anchor point to remove it"));
  }
  down(e) {
    const t = this.ref();
    if (!t) throw new B("Select a path first.");
    const n = tt(t.get(), e, !1);
    n?.kind === "anchor" && Qc(t, n.sub, n.i);
  }
}
class su extends Ts {
  id = "convertPoint";
  name = "Convert Point Tool";
  icon = R.convertPoint;
  shortcut = void 0;
  drag = null;
  options() {
    return p(
      "div",
      { class: "opts" },
      p(
        "span",
        { class: "opt-hint" },
        "Click a smooth point to make it a corner · drag a corner to pull out curve handles · drag a handle to move it on its own",
      ),
    );
  }
  down(e) {
    const t = this.ref();
    if (!t) throw new B("Select a path first.");
    W.anchors.clear();
    const n = tt(t.get(), e, !0);
    if (!n || (n.kind !== "anchor" && n.kind !== "handle")) return;
    const i = K(t.get()),
      a = i.subpaths[n.sub].nodes[n.i];
    if ((W.anchors.add(Le(n.sub, n.i)), n.kind === "handle")) {
      ((a.smooth = !1), (this.drag = { work: i, sub: n.sub, i: n.i, side: n.side }));
      return;
    }
    this.drag = { work: i, sub: n.sub, i: n.i, side: "both" };
  }
  move(e) {
    const t = this.drag,
      n = this.ref();
    if (!t || !n) return;
    const i = t.work.subpaths[t.sub].nodes[t.i];
    (t.side === "out"
      ? ((i.ox = e.x), (i.oy = e.y))
      : t.side === "in"
        ? ((i.ix = e.x), (i.iy = e.y))
        : ((i.ox = e.x), (i.oy = e.y), (i.ix = 2 * i.x - e.x), (i.iy = 2 * i.y - e.y), (i.smooth = !0)),
      (t.moved = !0),
      this.live.show(h.doc, n, t.work));
  }
  up() {
    const e = this.drag,
      t = this.ref();
    if (((this.drag = null), !e || !t)) return;
    const n = e.work.subpaths[e.sub].nodes[e.i];
    (!e.moved && e.side === "both" && ((n.ix = n.x), (n.iy = n.y), (n.ox = n.x), (n.oy = n.y), (n.smooth = !1)),
      this.live.end(h.doc),
      t.set(e.work, "Convert Point"));
  }
  shownPath(e) {
    return this.drag?.work || e?.get() || null;
  }
}
class nu extends Ts {
  constructor(e) {
    (super(),
      (this.direct = e),
      (this.id = e ? "directSelect" : "pathSelect"),
      (this.name = e ? "Direct Selection Tool" : "Path Selection Tool"),
      (this.icon = e ? R.directSelect : R.pathSelect));
  }
  id = "";
  name = "";
  icon = "";
  shortcut = "A";
  group = "pathSelect";
  cursor = "default";
  drag = null;
  options() {
    const e = this.ref(),
      t = e?.get();
    return p(
      "div",
      { class: "opts" },
      p("span", { class: "opt-label" }, e ? e.name : "No path selected"),
      t
        ? [
            N(),
            H("Fill rule"),
            O(
              [
                { value: "nonzero", label: "Non-zero" },
                { value: "evenodd", label: "Even-odd" },
              ],
              t.fillRule || "nonzero",
              (n) => {
                const i = K(t);
                ((i.fillRule = n), e.set(i, "Fill Rule"));
              },
            ),
          ]
        : null,
      N(),
      p(
        "button",
        {
          class: "btn small",
          title: "Make a selection from the path (Ctrl+Enter)",
          onclick: () => {
            t && Sn(h.doc, t);
          },
        },
        "Selection",
      ),
      p(
        "button",
        {
          class: "btn small",
          title: "New shape layer from this path, filled with the foreground colour",
          onclick: () => {
            t && ds(h.doc, "Shape", vs(K(t)));
          },
        },
        "Shape",
      ),
      p(
        "span",
        { class: "opt-hint" },
        this.direct
          ? "Click/drag anchors and handles · drag a segment to bend it · drag empty space to marquee · Shift adds · Alt-drag handle breaks it"
          : "Click a path to select it · drag to move · Alt-drag duplicates · arrows nudge · Delete removes",
      ),
    );
  }
  cursorFor(e) {
    const t = tt(this.ref()?.get() || null, e, this.direct);
    return t ? (t.kind === "handle" || t.kind === "anchor" ? "pointer" : "move") : "default";
  }
  down(e) {
    const t = h.doc;
    let n = this.ref(),
      i = tt(n?.get() || null, e, this.direct);
    if (!i) {
      const o = Hp(t, e);
      o &&
        (t.setActive(o.id),
        (t.activePath = `shape:${o.id}`),
        (n = this.ref()),
        (i = tt(n?.get() || null, e, this.direct)),
        k.emit("tool:options"));
    }
    if (!n || !n.get()) {
      i ||
        (W.anchors.clear(),
        (this.drag = { work: cs(), start: [e.x, e.y], kind: "marquee", moved: !1, cur: [e.x, e.y] }));
      return;
    }
    const a = K(n.get());
    if (!i) {
      (e.shift || W.anchors.clear(),
        (this.drag = this.direct ? { work: a, start: [e.x, e.y], kind: "marquee", moved: !1, cur: [e.x, e.y] } : null),
        k.emit("render"));
      return;
    }
    if (!this.direct) {
      const o = i.sub,
        r = a.subpaths[o].nodes.map((c, u) => Le(o, u)),
        l = r.every((c) => W.anchors.has(c));
      if (
        (!e.shift && !l && W.anchors.clear(),
        e.shift && l ? r.forEach((c) => W.anchors.delete(c)) : r.forEach((c) => W.anchors.add(c)),
        e.alt)
      ) {
        const c = ur(a),
          u = a.subpaths.length;
        (c.forEach((d) => a.subpaths.push(K({ subpaths: [a.subpaths[d]] }).subpaths[0])),
          W.anchors.clear(),
          c.forEach((d, f) => a.subpaths[u + f].nodes.forEach((m, v) => W.anchors.add(Le(u + f, v)))));
      }
      ((this.drag = { work: a, start: [e.x, e.y], kind: "move", moved: !1, dup: e.alt }), k.emit("render"));
      return;
    }
    if (i.kind === "handle") {
      this.drag = { work: a, start: [e.x, e.y], kind: "handle", sub: i.sub, i: i.i, side: i.side, moved: !1 };
      return;
    }
    if (i.kind === "anchor") {
      const o = Le(i.sub, i.i);
      (e.shift
        ? W.anchors.has(o)
          ? W.anchors.delete(o)
          : W.anchors.add(o)
        : W.anchors.has(o) || (W.anchors = new Set([o])),
        (this.drag = { work: a, start: [e.x, e.y], kind: "move", moved: !1 }),
        k.emit("render"));
      return;
    }
    if (i.kind === "segment") {
      (e.shift || W.anchors.clear(),
        (this.drag = { work: a, start: [e.x, e.y], kind: "segment", sub: i.sub, i: i.i, t: i.t, moved: !1 }),
        k.emit("render"));
      return;
    }
    (e.shift || W.anchors.clear(),
      a.subpaths[i.sub].nodes.forEach((o, r) => W.anchors.add(Le(i.sub, r))),
      (this.drag = { work: a, start: [e.x, e.y], kind: "move", moved: !1 }),
      k.emit("render"));
  }
  move(e) {
    const t = this.drag,
      n = this.ref();
    if (!t) return;
    let i = e.x - t.start[0],
      a = e.y - t.start[1];
    if (
      (e.shift && t.kind === "move" && (Math.abs(i) > Math.abs(a) ? (a = 0) : (i = 0)),
      !t.moved && Math.hypot(i, a) * L.xf().zoom < 2)
    )
      return;
    if (((t.moved = !0), t.kind === "marquee")) {
      ((t.cur = [e.x, e.y]), k.emit("render"));
      return;
    }
    if (!n) return;
    const o = K(t.work);
    if (t.kind === "move")
      for (const r of W.anchors) {
        const [l, c] = r.split(":").map(Number),
          u = o.subpaths[l]?.nodes[c];
        u && ((u.x += i), (u.y += a), (u.ix += i), (u.iy += a), (u.ox += i), (u.oy += a));
      }
    else if (t.kind === "handle") {
      const r = o.subpaths[t.sub].nodes[t.i];
      if ((t.side === "out" ? ((r.ox = e.x), (r.oy = e.y)) : ((r.ix = e.x), (r.iy = e.y)), r.smooth && !e.alt)) {
        const [l, c] = t.side === "out" ? [r.ox, r.oy] : [r.ix, r.iy],
          u = t.side === "out" ? Math.hypot(r.ix - r.x, r.iy - r.y) : Math.hypot(r.ox - r.x, r.oy - r.y),
          d = Math.hypot(l - r.x, c - r.y) || 1,
          f = r.x - ((l - r.x) / d) * u,
          m = r.y - ((c - r.y) / d) * u;
        t.side === "out" ? ((r.ix = f), (r.iy = m)) : ((r.ox = f), (r.oy = m));
      } else e.alt && (r.smooth = !1);
    } else if (t.kind === "segment") {
      const r = o.subpaths[t.sub],
        l = r.nodes[t.i],
        c = r.nodes[(t.i + 1) % r.nodes.length],
        u = t.t,
        d = 1 - u,
        f = 3 * d * d * u,
        m = 3 * d * u * u,
        v = f * f + m * m || 1,
        y = i / v,
        b = a / v;
      if (((l.ox += y * f), (l.oy += b * f), (c.ix += y * m), (c.iy += b * m), l.smooth)) {
        const x = Math.hypot(l.ix - l.x, l.iy - l.y),
          w = Math.hypot(l.ox - l.x, l.oy - l.y) || 1;
        ((l.ix = l.x - ((l.ox - l.x) / w) * x), (l.iy = l.y - ((l.oy - l.y) / w) * x));
      }
      if (c.smooth) {
        const x = Math.hypot(c.ox - c.x, c.oy - c.y),
          w = Math.hypot(c.ix - c.x, c.iy - c.y) || 1;
        ((c.ox = c.x - ((c.ix - c.x) / w) * x), (c.oy = c.y - ((c.iy - c.y) / w) * x));
      }
    }
    ((t.preview = o), this.live.show(h.doc, n, o));
  }
  up() {
    const e = this.drag,
      t = this.ref();
    if (((this.drag = null), !e)) return;
    if (e.kind === "marquee") {
      if (e.moved && t?.get() && e.cur) {
        const i = Math.min(e.start[0], e.cur[0]),
          a = Math.max(e.start[0], e.cur[0]),
          o = Math.min(e.start[1], e.cur[1]),
          r = Math.max(e.start[1], e.cur[1]);
        t.get().subpaths.forEach((l, c) =>
          l.nodes.forEach((u, d) => {
            u.x >= i && u.x <= a && u.y >= o && u.y <= r && W.anchors.add(Le(c, d));
          }),
        );
      }
      k.emit("render");
      return;
    }
    this.live.end(h.doc);
    const n = e.preview;
    (t &&
      (e.moved || e.dup) &&
      t.set(n || e.work, e.dup ? "Duplicate Path" : e.kind === "move" ? "Move Path" : "Edit Path"),
      k.emit("render"));
  }
  shownPath(e) {
    return this.drag?.preview || e?.get() || null;
  }
  overlay(e, t) {
    super.overlay(e, t);
    const n = this.drag;
    if (n?.kind === "marquee" && n.moved && n.cur) {
      const i = t.docToScreen(n.start[0], n.start[1]),
        a = t.docToScreen(n.cur[0], n.cur[1]);
      (e.save(),
        e.setLineDash([3, 3]),
        (e.strokeStyle = "#4fa3ff"),
        e.strokeRect(Math.min(i[0], a[0]), Math.min(i[1], a[1]), Math.abs(a[0] - i[0]), Math.abs(a[1] - i[1])),
        e.restore());
    }
  }
  key(e, t) {
    if (!t) return !1;
    const n = this.ref(),
      i = n?.get();
    if (!n || !i || !W.anchors.size) return !1;
    const a = e.shiftKey ? 10 : 1,
      o = { ArrowLeft: [-a, 0], ArrowRight: [a, 0], ArrowUp: [0, -a], ArrowDown: [0, a] };
    if (o[e.key]) {
      const [r, l] = o[e.key],
        c = K(i);
      for (const u of W.anchors) {
        const [d, f] = u.split(":").map(Number),
          m = c.subpaths[d]?.nodes[f];
        m && ((m.x += r), (m.y += l), (m.ix += r), (m.iy += l), (m.ox += r), (m.oy += l));
      }
      return (n.set(c, "Nudge Path"), !0);
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      const r = K(i);
      if (this.direct)
        (r.subpaths.forEach((l, c) => {
          l.nodes = l.nodes.filter((u, d) => !W.anchors.has(Le(c, d)));
        }),
          (r.subpaths = r.subpaths.filter((l) => l.nodes.length >= 2)));
      else {
        const l = new Set(ur(r));
        r.subpaths = r.subpaths.filter((c, u) => !l.has(u));
      }
      return (W.anchors.clear(), n.set(r, this.direct ? "Delete Anchor Points" : "Delete Path"), !0);
    }
    return e.key === "Escape" ? (W.anchors.clear(), k.emit("render"), !0) : !1;
  }
}
function ur(s) {
  const e = new Set();
  for (const t of W.anchors) e.add(Number(t.split(":")[0]));
  return [...e].filter((t) => t < s.subpaths.length).sort((t, n) => t - n);
}
function Hp(s, e) {
  for (const t of s.all()) {
    if (!t.visible || !t.shape) continue;
    if (tt(t.shape.path, e, !1)) return t;
  }
  return null;
}
const ss = new nu(!0),
  iu = new nu(!1);
function au() {
  return [new Jc(), new Zc(), new eu(), new tu(), new su(), iu, ss];
}
const Vp = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        AddAnchorTool: eu,
        ConvertPointTool: su,
        DeleteAnchorTool: tu,
        FreeformPenTool: Zc,
        PenTool: Jc,
        directSel: ss,
        drawPath: Xc,
        isEmptyPath: Te,
        newShapeProps: vs,
        pathRef: Tn,
        pathSel: W,
        pathSelect: iu,
        penModeOptions: So,
        penTools: au,
        shapeStyleOptions: Yc,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  he = () => {
    const s = h.doc;
    if (!s) throw new B("No document is open.");
    return s;
  },
  ht = (s) => {
    const e = St(s),
      t = e?.get();
    if (!e || !t || Te(t))
      throw new B("There is no path. Draw one with the Pen tool (P), or choose one in the Paths panel.");
    return { r: e, p: t };
  },
  Be = () => {
    const s = h.doc;
    if (!s) return !1;
    const e = St(s)?.get();
    return !!e && !Te(e);
  },
  la = () => !!h.doc;
function Dt(s, ...e) {
  return p("div", { class: "form-row" }, p("span", { class: "sf-label" }, s), ...e);
}
async function hr(s = !1) {
  const e = he(),
    { p: t } = ht(e),
    n = e.active;
  if (!n || !n.tex || n.kind !== "raster")
    throw new B("Select a pixel layer to fill the path on (or use “New Shape Layer from Path” for a vector fill).");
  if (s) {
    va(e, n, t, h.fg);
    return;
  }
  const i = { use: "fg", opacity: 100, feather: 0 },
    a = new Y("Fill Path", { width: 360 });
  if (
    (a.body.append(
      Dt(
        "Contents",
        O(
          [
            { value: "fg", label: "Foreground Color" },
            { value: "bg", label: "Background Color" },
            { value: "white", label: "White" },
            { value: "black", label: "Black" },
            { value: "gray", label: "50% Gray" },
          ],
          i.use,
          (r) => (i.use = r),
        ),
      ),
      Dt("Opacity", q({ value: 100, min: 1, max: 100, unit: "%", width: 50, onInput: (r) => (i.opacity = r) })),
      Dt(
        "Feather Radius",
        q({ value: 0, min: 0, max: 250, step: 0.5, unit: "px", width: 50, onInput: (r) => (i.feather = r) }),
      ),
    ),
    (a.onOk = () => i),
    !(await a.show()))
  )
    return;
  const o =
    i.use === "fg"
      ? h.fg
      : i.use === "bg"
        ? h.bg
        : i.use === "white"
          ? [1, 1, 1]
          : i.use === "black"
            ? [0, 0, 0]
            : [0.5, 0.5, 0.5];
  va(e, n, t, o, i.opacity / 100, i.feather);
}
function dr(s, e, t, n) {
  const i = s.active;
  if (!i || !i.tex) throw new B("Select a pixel layer to stroke the path on.");
  if (i.kind === "shape" || i.kind === "text")
    throw new B(
      "Strokes are painted onto pixel layers. Select or create a pixel layer first (for a vector outline, set the shape layer’s Stroke instead).",
    );
  if (i.lockPixels) throw new B(`"${i.name}" is locked.`);
  const a = h.brushFor(t),
    o =
      t === "eraser"
        ? "erase"
        : t === "pencil"
          ? "paint"
          : t === "smudge"
            ? "smudge"
            : t === "blur"
              ? "blur"
              : t === "sharpen"
                ? "sharpen"
                : t === "dodge"
                  ? "dodge"
                  : t === "burn"
                    ? "burn"
                    : "paint";
  for (const r of ll(e, n)) {
    if (r.length < 2) continue;
    const l = new ji(s, i, { ...a, smoothing: 0 }, { mode: o, color: h.fg, pencil: t === "pencil" });
    let c = performance.now();
    for (const u of r) l.add({ x: u.x, y: u.y, pressure: u.pressure, time: (c += 4) });
    l.end();
  }
}
async function pr(s = !1) {
  const e = he(),
    { p: t } = ht(e);
  if (s) {
    dr(
      e,
      t,
      h.tool && ["brush", "pencil", "eraser", "smudge", "blur", "sharpen", "dodge", "burn"].includes(h.tool.id)
        ? h.tool.id
        : "brush",
      !1,
    );
    return;
  }
  const n = { tool: h.setting("strokePath.tool", "brush"), pressure: h.setting("strokePath.pressure", !1) },
    i = new Y("Stroke Path", { width: 360 });
  (i.body.append(
    Dt(
      "Tool",
      O(
        [
          { value: "brush", label: "Brush" },
          { value: "pencil", label: "Pencil" },
          { value: "eraser", label: "Eraser" },
          { value: "smudge", label: "Smudge" },
          { value: "blur", label: "Blur" },
          { value: "sharpen", label: "Sharpen" },
          { value: "dodge", label: "Dodge" },
          { value: "burn", label: "Burn" },
        ],
        n.tool,
        (a) => (n.tool = a),
      ),
    ),
    p(
      "div",
      { class: "form-row" },
      $("Simulate Pressure (taper both ends)", n.pressure, (a) => (n.pressure = a)),
    ),
    p("div", { class: "form-hint" }, "Uses that tool’s current brush, size and colour."),
  ),
    (i.onOk = () => n),
    (await i.show()) &&
      (h.set("strokePath.tool", n.tool), h.set("strokePath.pressure", n.pressure), dr(e, t, n.tool, n.pressure)));
}
async function Xp() {
  const s = he(),
    { p: e } = ht(s),
    t = { feather: 0, aa: !0, op: "replace" },
    n = new Y("Make Selection", { width: 360 });
  (n.body.append(
    Dt(
      "Feather Radius",
      q({ value: 0, min: 0, max: 250, step: 0.5, unit: "px", width: 50, onInput: (i) => (t.feather = i) }),
    ),
    p(
      "div",
      { class: "form-row" },
      $("Anti-aliased", !0, (i) => (t.aa = i)),
    ),
    Dt(
      "Operation",
      O(
        [
          { value: "replace", label: "New Selection" },
          { value: "add", label: "Add to Selection" },
          { value: "subtract", label: "Subtract from Selection" },
          { value: "intersect", label: "Intersect with Selection" },
        ],
        (s.selection, "replace"),
        (i) => (t.op = i),
      ),
    ),
  ),
    (n.onOk = () => t),
    (await n.show()) && Sn(s, e, t.op, t.feather, t.aa));
}
async function Yp() {
  const s = he();
  if (!s.selection) throw new B("Make a selection first: the work path follows its outline.");
  const e = await (async () => {
    const n = new Y("Make Work Path", { width: 340 });
    let i = h.setting("workPath.tol", 2);
    return (
      n.body.append(
        Dt("Tolerance", q({ value: i, min: 0.5, max: 10, step: 0.5, unit: "px", width: 50, onInput: (a) => (i = a) })),
        p("div", { class: "form-hint" }, "Lower follows the selection more closely with more anchor points."),
      ),
      (n.onOk = () => i),
      n.show()
    );
  })();
  if (e == null) return;
  h.set("workPath.tol", e);
  const t = rl(s, e);
  if (Te(t)) throw new B("The selection is empty.");
  (s.transact("Make Work Path", () => {
    s.workPath = t;
  }),
    (s.activePath = "work"),
    k.emit("render"));
}
function Kp(s) {
  (s(
    "path.toSelection",
    "Load Path as Selection",
    () => {
      const t = he();
      Sn(t, ht(t).p);
    },
    "Ctrl+Enter",
    Be,
  ),
    s("path.toSelectionDlg", "Make Selection…", Xp, void 0, Be),
    s("path.fromSelection", "Make Work Path from Selection…", Yp, void 0, () => !!h.doc?.selection),
    s("path.fill", "Fill Path…", () => hr(!1), void 0, Be),
    s("path.fillFg", "Fill Path with Foreground", () => hr(!0), void 0, Be),
    s("path.stroke", "Stroke Path…", () => pr(!1), void 0, Be),
    s("path.strokeBrush", "Stroke Path with Brush", () => pr(!0), void 0, Be),
    s(
      "path.toShape",
      "New Shape Layer from Path",
      () => {
        const t = he();
        ds(t, "Shape", vs(K(ht(t).p)));
      },
      void 0,
      Be,
    ),
    s(
      "path.new",
      "New Path…",
      async () => {
        const t = he(),
          n = await ps("New Path", "Name", vi(t, "Path"));
        if (!n) return;
        const i = Qs();
        (t.transact("New Path", () => t.paths.push({ id: i, name: n, path: cs() })),
          (t.activePath = i),
          k.emit("render"));
      },
      void 0,
      la,
    ),
    s(
      "path.save",
      "Save Path…",
      async () => {
        const t = he();
        if (!t.workPath) throw new B("Only the Work Path needs saving: other paths are saved with the document.");
        const n = await ps("Save Path", "Name", vi(t, "Path"));
        n && cl(t, n);
      },
      void 0,
      () => !!h.doc?.workPath,
    ),
    s(
      "path.duplicate",
      "Duplicate Path",
      () => {
        const t = he(),
          { r: n, p: i } = ht(t),
          a = Qs();
        (t.transact("Duplicate Path", () => t.paths.push({ id: a, name: `${n.name} copy`, path: K(i) })),
          (t.activePath = a));
      },
      void 0,
      Be,
    ),
    s(
      "path.delete",
      "Delete Path",
      () => {
        const t = he(),
          n = St(t);
        if (n) {
          if (n.id === "work")
            t.transact("Delete Work Path", () => {
              t.workPath = null;
            });
          else {
            if (n.id.startsWith("shape:"))
              throw new B("This is a shape layer’s path: delete the layer, or rasterize it.");
            n.id.startsWith("vmask:")
              ? h.run("layer.vmaskDelete")
              : t.transact("Delete Path", () => {
                  t.paths = t.paths.filter((i) => i.id !== n.id);
                });
          }
          ((t.activePath = null), k.emit("render"));
        }
      },
      void 0,
      Be,
    ),
    s(
      "path.exportSvg",
      "Export Path as SVG…",
      async () => {
        const t = he(),
          { r: n, p: i } = ht(t),
          a = await window.brushboard.dialog.save({
            title: "Export Path",
            defaultPath: (h.prefs.lastDir ? h.prefs.lastDir + "/" : "") + n.name.replace(/[\\/]/g, "-") + ".svg",
            filters: [{ name: "SVG", extensions: ["svg"] }],
          });
        if (!a) return;
        const o = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}" height="${t.height}" viewBox="0 0 ${t.width} ${t.height}">
  <path d="${Ns(i)}" fill="none" stroke="#000" stroke-width="1" fill-rule="${i.fillRule || "nonzero"}"/>
</svg>
`;
        (await window.brushboard.fs.write(a.endsWith(".svg") ? a : a + ".svg", new TextEncoder().encode(o)),
          h.notify("Path exported", "success", 2e3));
      },
      void 0,
      Be,
    ),
    s(
      "file.exportSvg",
      "Export as SVG…",
      async () => {
        const t = he(),
          n = await window.brushboard.dialog.save({
            title: "Export as SVG",
            defaultPath: (h.prefs.lastDir ? h.prefs.lastDir + "/" : "") + t.name + ".svg",
            filters: [{ name: "SVG", extensions: ["svg"] }],
          });
        if (!n) return;
        const i = await pc(t);
        (await window.brushboard.fs.write(n.endsWith(".svg") ? n : n + ".svg", new TextEncoder().encode(i)),
          h.notify("Exported SVG (shape layers and text stay vector)", "success", 3e3));
      },
      void 0,
      la,
    ));
  const e = () => {
    const t = he().active;
    if (!t) throw new B("Select a layer.");
    return t;
  };
  (s(
    "layer.vmaskReveal",
    "Vector Mask: Reveal All",
    () => {
      const t = he(),
        n = e();
      Hn(
        t,
        n,
        {
          subpaths: [
            {
              closed: !0,
              nodes: [
                { x: -1, y: -1, ix: -1, iy: -1, ox: -1, oy: -1, smooth: !1 },
                { x: t.width + 1, y: -1, ix: t.width + 1, iy: -1, ox: t.width + 1, oy: -1, smooth: !1 },
                {
                  x: t.width + 1,
                  y: t.height + 1,
                  ix: t.width + 1,
                  iy: t.height + 1,
                  ox: t.width + 1,
                  oy: t.height + 1,
                  smooth: !1,
                },
                { x: -1, y: t.height + 1, ix: -1, iy: t.height + 1, ox: -1, oy: t.height + 1, smooth: !1 },
              ],
            },
          ],
          fillRule: "nonzero",
        },
        "Add Vector Mask",
      );
    },
    void 0,
    () => !!h.doc?.active && !h.doc.active.vmask,
  ),
    s(
      "layer.vmaskHide",
      "Vector Mask: Hide All",
      () => {
        const t = he();
        (Hn(t, e(), cs(), "Add Vector Mask"), (t.activePath = `vmask:${e().id}`));
      },
      void 0,
      () => !!h.doc?.active && !h.doc.active.vmask,
    ),
    s(
      "layer.vmaskFromPath",
      "Vector Mask: Current Path",
      () => {
        const t = he(),
          n = e(),
          { r: i, p: a } = ht(t);
        if (i.id === `vmask:${n.id}`) throw new B("That path already is this layer’s vector mask.");
        Hn(t, n, a, "Add Vector Mask");
      },
      void 0,
      () => Be() && !!h.doc?.active,
    ),
    s(
      "layer.vmaskDelete",
      "Delete Vector Mask",
      () => {
        const t = he(),
          n = e();
        (t.transact("Delete Vector Mask", () => {
          ((n.vmask = null), (n.vmaskTex = null), n.version++);
        }),
          (t.activePath = null),
          t.invalidate());
      },
      void 0,
      () => !!h.doc?.active?.vmask,
    ),
    s(
      "layer.vmaskToggle",
      "Disable/Enable Vector Mask",
      () => {
        const t = he(),
          n = e();
        (t.transact(n.vmaskEnabled === !1 ? "Enable Vector Mask" : "Disable Vector Mask", () => {
          ((n.vmaskEnabled = n.vmaskEnabled === !1), n.version++);
        }),
          t.invalidate());
      },
      void 0,
      () => !!h.doc?.active?.vmask,
      () => h.doc?.active?.vmaskEnabled === !1,
    ),
    s(
      "layer.vmaskRasterize",
      "Rasterize Vector Mask",
      () => Fl(he()),
      void 0,
      () => !!h.doc?.active?.vmask,
    ),
    s(
      "layer.newShape",
      "New Fill Shape Layer (whole canvas)",
      () => {
        const t = he();
        ds(
          t,
          "Color Fill",
          vs({
            subpaths: [
              {
                closed: !0,
                nodes: [
                  [0, 0],
                  [t.width, 0],
                  [t.width, t.height],
                  [0, t.height],
                ].map(([n, i]) => ({ x: n, y: i, ix: n, iy: i, ox: n, oy: i, smooth: !1 })),
              },
            ],
            fillRule: "nonzero",
          }),
        );
      },
      void 0,
      la,
    ));
}
const ou = [
  { label: "Reveal All", cmd: "layer.vmaskReveal" },
  { label: "Hide All", cmd: "layer.vmaskHide" },
  { label: "Current Path", cmd: "layer.vmaskFromPath" },
  "-",
  { label: "Disable", cmd: "layer.vmaskToggle" },
  { label: "Rasterize", cmd: "layer.vmaskRasterize" },
  { label: "Delete", cmd: "layer.vmaskDelete" },
];
function pn(s, e, t, n, i = !1) {
  const a = Math.min(t / e.w, n / e.h),
    o = Math.max(1, Math.round(e.w * a)),
    r = Math.max(1, Math.round(e.h * a)),
    l = e.k && e.ink ? g.acquirePair(o, r, "rgba16f", e.ink) : g.acquire(o, r, "rgba8");
  g.draw(g.program("thumb", Fi), l, {
    textures: { u_src: e },
    uniforms: { u_srcSize: [e.w, e.h], u_dstSize: [o, r], u_gray: i ? 1 : 0 },
  });
  const c = g.read8(l);
  (g.release(l),
    (s.width !== o || s.height !== r) && ((s.width = o), (s.height = r)),
    s
      .getContext("2d")
      .putImageData(new ImageData(new Uint8ClampedArray(c.buffer, c.byteOffset, c.byteLength), o, r), 0, 0));
}
const Jp = Object.freeze(
    Object.defineProperty({ __proto__: null, drawThumb: pn }, Symbol.toStringTag, { value: "Module" }),
  ),
  Lt = () => {
    const s = h.doc;
    if (!s) throw new B("No document is open.");
    return s;
  },
  Ht = () => !!h.doc?.ink,
  as = (s, ...e) => p("div", { class: "form-row" }, p("span", { class: "sf-label" }, s), ...e),
  To = ["Cyan", "Magenta", "Yellow", "Black"];
function ru() {
  if (!h.python.python || !h.python.capabilities.numpy)
    throw new B("CMYK needs the Python helper with Pillow (Extensions › Manage Extensions).");
}
function lu(s, e) {
  for (const t of s.all())
    (t.kind === "text" && t.text ? _t(s, t) : t.kind === "shape" && t.shape ? je(s, t) : t.tex && e(t), t.version++);
}
async function cu(s, e, t = 1, n) {
  if ((ru(), s.ink))
    throw new B("The document is already CMYK. Use Assign Profile to change how its inks are interpreted.");
  if (s.bitDepth === 32)
    throw new B("CMYK works at 8 or 16 bits/channel. Choose Image › Mode › 16 Bits/Channel first.");
  (h.tool?.commit?.(), h.status("Converting to CMYK…"));
  const i = await st(e),
    a = t === 1 ? i : await st(e, t);
  (s.transact("Convert to CMYK", () => {
    ((s.ink = i),
      (s.tac = n ?? rs(e)),
      lu(s, (o) => {
        const r = g.toPair(o.tex, a),
          l = s.newLayerTex();
        (g.copy(r, l), g.release(r), (o.tex = l));
      }),
      s.allocComposite());
  }),
    h.status(""),
    k.emit("doc:mode", s),
    k.emit("docs:changed"),
    k.emit("doc:layers", s),
    h.notify(`Converted to CMYK — ${i.name}`, "success", 2500));
}
function uu(s) {
  s.ink &&
    (h.tool?.commit?.(),
    s.transact("Convert to RGB", () => {
      ((s.ink = null),
        lu(s, (e) => {
          const t = s.newLayerTex();
          (g.copy(e.tex, t), (e.tex = t));
        }),
        (s.channels = [1, 1, 1, 1]),
        (s.singleChannel = -1),
        (s.showTac = !1),
        s.allocComposite());
    }),
    k.emit("doc:mode", s),
    k.emit("docs:changed"),
    k.emit("doc:layers", s));
}
async function hu(s, e) {
  if (!s.ink) throw new B("Assign Profile is for CMYK documents.");
  const t = await st(e);
  t !== s.ink &&
    (h.tool?.commit?.(),
    s.transact("Assign Profile", () => {
      s.ink = t;
      for (const n of s.all()) {
        if (!n.tex?.k) continue;
        const i = s.newLayerTex();
        (g.copy(n.tex, i), (n.tex = i), n.version++);
      }
      s.allocComposite();
    }),
    k.emit("doc:mode", s),
    k.emit("docs:changed"));
}
async function du() {
  return (ru(), Li());
}
function pu(s, e, t) {
  const n = s.map((i) => ({ value: i.id, label: i.name + (i.bundled ? "" : " (system)") }));
  return O(n, e, t);
}
async function Zp() {
  return (
    (
      await window.brushboard.dialog.open({
        title: "CMYK output profile",
        defaultPath: "/usr/share/color/icc",
        filters: [{ name: "ICC profiles", extensions: ["icc", "icm"] }],
      })
    )[0] || null
  );
}
async function fu() {
  const s = Lt();
  if (s.ink) throw new B("The document is already CMYK.");
  const e = await du(),
    t = { profile: h.setting("cmyk.profile", "fogra39"), intent: h.setting("cmyk.intent", 0), tac: 0 };
  (e.some((l) => l.id === t.profile) || (t.profile = e[0]?.id || "fogra39"), (t.tac = rs(t.profile)));
  const n = new Y("Convert to CMYK", { width: 470, ok: "Convert" }),
    i = p("div"),
    a = q({ value: t.tac, min: 150, max: 400, unit: "%", width: 56, onInput: (l) => (t.tac = l) }),
    o = () => {
      (te(i),
        i.append(
          as(
            "Profile",
            pu(e, t.profile, (l) => {
              ((t.profile = l), (t.tac = rs(l)), a.set(t.tac));
            }),
            p(
              "button",
              {
                class: "btn small",
                onclick: async () => {
                  const l = await Zp();
                  l &&
                    (e.push({ id: l, path: l, name: l.split("/").pop(), tac: 300, bundled: !1 }), (t.profile = l), o());
                },
              },
              "Other…",
            ),
          ),
          as(
            "Intent",
            O(
              [
                { value: 0, label: "Perceptual" },
                { value: 1, label: "Relative Colorimetric" },
              ],
              t.intent,
              (l) => (t.intent = l),
            ),
          ),
          as("Total ink limit", a),
          p(
            "p",
            { class: "hint" },
            "Every layer is separated into cyan, magenta, yellow and black. Type and shape layers stay editable. You can undo the conversion.",
          ),
        ));
    };
  (o(), n.body.append(i), (n.onOk = () => t));
  const r = await n.show();
  r && (h.set("cmyk.profile", r.profile), h.set("cmyk.intent", r.intent), await cu(s, r.profile, r.intent, r.tac));
}
async function mu() {
  const s = Lt();
  if (!s.ink) throw new B("Assign Profile is for CMYK documents.");
  const e = await du(),
    t = { profile: e.find((a) => a.id === s.ink.id || a.path === s.ink.path)?.id || e[0]?.id || "fogra39" },
    n = new Y("Assign Profile", { width: 440, ok: "Assign" });
  (n.body.append(
    as("Current", p("span", null, s.ink.name)),
    as(
      "Assign",
      pu(e, t.profile, (a) => (t.profile = a)),
    ),
    p(
      "p",
      { class: "hint" },
      "Keeps the ink numbers and reads them through another press profile, so the picture looks different on screen. To keep the look and change the numbers, convert to RGB and back.",
    ),
  ),
    (n.onOk = () => t));
  const i = await n.show();
  i && (await hu(s, i.profile));
}
async function gu() {
  const s = Lt();
  if (!s.ink) throw new B("The ink limit is for CMYK documents.");
  const e = { tac: s.tac, show: s.showTac },
    t = new Y("Total Ink Limit", { width: 360 });
  (t.body.append(
    as("Limit", q({ value: e.tac, min: 100, max: 400, unit: "%", width: 56, onInput: (i) => (e.tac = i) })),
    p(
      "div",
      { class: "form-row" },
      $("Show areas over the limit", e.show, (i) => (e.show = i)),
    ),
    p(
      "p",
      { class: "hint" },
      "The sum of C + M + Y + K a press can lay down: typically 300% for coated paper, 260% for newsprint.",
    ),
  ),
    (t.onOk = () => e));
  const n = await t.show();
  n && ((s.tac = n.tac), (s.showTac = n.show), s.invalidate(), k.emit("doc:mode", s));
}
function fn(s, e) {
  s.ink && ((s.singleChannel = e), e >= 0 && (s.channels = [1, 1, 1, 1]), s.invalidate(), k.emit("doc:channels", s));
}
function vu(s, e) {
  s.ink &&
    ((s.channels[e] = s.channels[e] ? 0 : 1),
    s.channels.some(Boolean) || (s.channels[e] = 1),
    (s.singleChannel = -1),
    s.invalidate(),
    k.emit("doc:channels", s));
}
function yu(s) {
  const e = () => !!h.doc;
  (s(
    "image.modeRGB",
    "RGB Color",
    () => uu(Lt()),
    void 0,
    e,
    () => !!h.doc && !h.doc.ink,
  ),
    s("image.modeCMYK", "CMYK Color…", fu, void 0, e, Ht),
    s("image.assignProfile", "Assign Profile…", mu, void 0, Ht),
    s("image.inkLimit", "Total Ink Limit…", gu, void 0, Ht),
    s(
      "view.tacWarning",
      "Total Ink Warning",
      () => {
        const t = Lt();
        t.ink && ((t.showTac = !t.showTac), t.invalidate(), k.emit("doc:mode", t));
      },
      "Ctrl+Alt+Y",
      Ht,
      () => !!h.doc?.showTac,
    ),
    s(
      "channel.composite",
      "Composite Channel",
      () => fn(Lt(), -1),
      "Ctrl+2",
      Ht,
      () => !!h.doc?.ink && h.doc.singleChannel < 0,
    ),
    To.forEach((t, n) =>
      s(
        `channel.${t.toLowerCase()}`,
        `${t} Channel`,
        () => fn(Lt(), n),
        `Ctrl+${n + 3}`,
        Ht,
        () => h.doc?.singleChannel === n,
      ),
    ));
}
function bu() {
  let s;
  const e = [],
    t = Ne(() => {
      const i = h.doc;
      if (!i || !i.ink || !i.inkComposite || !s?.isConnected) return;
      const a = Math.min(1, 48 / Math.max(i.width, i.height)),
        o = Math.max(1, Math.round(i.width * a)),
        r = Math.max(1, Math.round(i.height * a));
      e.forEach((l, c) => {
        if (l)
          try {
            const u = g.acquirePair(o, r, "rgba16f", i.ink);
            g.draw(g.program("thumb", Fi), u, {
              textures: { u_src: i.inkComposite },
              uniforms: { u_srcSize: [i.width, i.height], u_dstSize: [o, r], u_gray: 0 },
            });
            const d = g.toRgb(u, null, [1, 1, 1, 1], c - 1, "rgba16f");
            (g.release(u), pn(l, d, 40, 30), g.release(d));
          } catch {}
      });
    }, 250),
    n = () => {
      const i = h.doc;
      if ((te(s), (e.length = 0), !i)) {
        s.append(p("div", { class: "empty-hint" }, "No document"));
        return;
      }
      if (!i.ink) {
        s.append(
          p("div", { class: "empty-hint" }, "RGB document. Ink channels appear here after Image › Mode › CMYK Color."),
          p(
            "div",
            { class: "panel-foot" },
            p("button", { class: "btn small", onclick: () => h.run("image.modeCMYK") }, "Convert to CMYK…"),
          ),
        );
        return;
      }
      (["CMYK", ...To].forEach((o, r) => {
        const l = r - 1,
          c = l < 0 ? i.singleChannel < 0 : i.singleChannel === l,
          u = l < 0 ? !0 : i.singleChannel < 0 ? !!i.channels[l] : i.singleChannel === l,
          d = p("canvas", { class: "chthumb", width: 40, height: 30 });
        e.push(d);
        const f = p(
          "button",
          {
            class: "eye" + (u ? " on" : ""),
            title: l < 0 ? "Show all inks" : `Show or hide ${o.toLowerCase()}`,
            onclick: (m) => {
              (m.stopPropagation(), l < 0 ? ((i.channels = [1, 1, 1, 1]), fn(i, -1)) : vu(i, l));
            },
          },
          u ? "●" : "○",
        );
        s.append(
          p(
            "div",
            { class: "chrow" + (c ? " on" : ""), title: `${o} (Ctrl+${r + 2})`, onclick: () => fn(i, l) },
            f,
            d,
            p("span", { class: "chname" }, o),
            p("span", { class: "chkey" }, `Ctrl+${r + 2}`),
          ),
        );
      }),
        s.append(
          p(
            "div",
            { class: "chfoot" },
            p("div", { class: "muted" }, i.ink.name),
            p(
              "label",
              { class: "row" },
              $(`Ink warning over ${i.tac}%`, i.showTac, (o) => {
                ((i.showTac = o), i.invalidate());
              }),
              p("button", { class: "btn small", onclick: () => h.run("image.inkLimit") }, "Limit…"),
            ),
          ),
        ),
        t());
    };
  return {
    id: "channels",
    title: "Channels",
    create() {
      s = p("div", { class: "channels-panel" });
      for (const i of ["doc:active", "doc:mode", "doc:channels", "docs:changed"]) k.on(i, n);
      return (k.on("doc:pixels", () => t()), k.on("doc:history", () => t()), n(), s);
    },
    onShow: n,
  };
}
function wu(s, e, t, n) {
  if (!s.ink) return null;
  const i = n(e, t);
  if (!i) return { cmyk: "—", total: "—", over: !1 };
  const a = Math.round((i[0] + i[1] + i[2] + i[3]) * 100);
  return { cmyk: Ir(i), total: `${a}%  (limit ${s.tac}%)`, over: a > s.tac };
}
const Qp = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        CHANNEL_NAMES: To,
        assignProfile: hu,
        assignProfileDialog: mu,
        channelsPanel: bu,
        convertToCmyk: cu,
        convertToCmykDialog: fu,
        convertToRgb: uu,
        inkInfo: wu,
        inkLimitDialog: gu,
        registerCmykCommands: yu,
        setChannelView: fn,
        toggleChannel: vu,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  z = () => {
    const s = h.doc;
    if (!s) throw new B("No document is open.");
    return s;
  },
  Zt = () => !!h.doc,
  Ke = () => !!h.doc?.selection;
let ue = null;
async function ca(s, e = !1) {
  const t = z();
  let n = s ? ve(t, t.layers, "rgba32f") : null;
  const i = t.active;
  if (!s) {
    if (!i?.tex) throw new B("Select a pixel layer to copy.");
    n = i.tex;
  }
  const a = t.selection
    ? at(t)
    : s
      ? { x: 0, y: 0, w: t.width, h: t.height }
      : ks(n) || { x: 0, y: 0, w: t.width, h: t.height };
  if (!a) throw new Error("The selection is empty.");
  const o = g.read(n, a),
    r = n.k && t.ink ? g.readInk(n, a) : void 0;
  if (t.selection) {
    const d = g.read(t.selection, a);
    for (let f = 0; f < a.w * a.h; f++) ((o[f * 4 + 3] *= d[f * 4]), r && (r[f * 5 + 4] *= d[f * 4]));
  }
  s && g.dispose(n);
  const l = new OffscreenCanvas(a.w, a.h),
    c = new Uint8ClampedArray(o.length);
  for (let d = 0; d < o.length; d++) c[d] = Math.round(Math.max(0, Math.min(1, o[d])) * 255);
  l.getContext("2d").putImageData(new ImageData(c, a.w, a.h), 0, 0);
  const u = new Uint8Array(await (await l.convertToBlob({ type: "image/png" })).arrayBuffer());
  (await window.brushboard.clipboard.writeImage(u),
    (ue = {
      data: o,
      w: a.w,
      h: a.h,
      x: a.x,
      y: a.y,
      pngLen: u.length,
      ink: r,
      inkId: r ? t.ink.id : void 0,
      bits: t.bitDepth,
      tac: t.tac,
    }),
    e &&
      i &&
      (t.selection
        ? so(t)
        : t.transact("Cut", () => {
            const d = t.newLayerTex();
            kt(t, i, d);
          })),
    h.notify(e ? "Cut to clipboard" : "Copied to clipboard", "info", 1200));
}
async function xu() {
  const s = await window.brushboard.clipboard.readImage(),
    e = s
      ? await createImageBitmap(new Blob([s], { type: "image/png" }), { premultiplyAlpha: "none" }).catch(() => null)
      : null;
  if (ue && (!e || s.byteLength === ue.pngLen || (e.width === ue.w && e.height === ue.h)))
    return (e?.close(), { data: ue.data, w: ue.w, h: ue.h, internal: !0 });
  if (!e) return null;
  const t = e.width,
    n = e.height,
    a = new OffscreenCanvas(t, n).getContext("2d");
  (a.drawImage(e, 0, 0), e.close());
  const o = a.getImageData(0, 0, t, n).data,
    r = new Float32Array(o.length);
  for (let l = 0; l < o.length; l++) r[l] = o[l] / 255;
  return { data: r, w: t, h: n, internal: !1 };
}
async function ef() {
  const s = await xu();
  if (!s) {
    h.notify("The clipboard does not contain an image.", "info");
    return;
  }
  const e = s.internal && ue?.ink && ue.inkId ? ue.ink : null,
    t = e ? await st(ue.inkId).catch(() => null) : null,
    n = s.internal ? (ue.bits ?? 8) : 8;
  let i = !0;
  for (let l = 3; l < s.data.length; l += 4)
    if (s.data[l] < 0.999) {
      i = !1;
      break;
    }
  const a = En(`Clipboard ${++tf}`, s.w, s.h, t && n === 32 ? 16 : n, null, 72, t, ue?.tac ?? 300),
    o = a.layers[0],
    r = t && e ? $i(a, e, s.w, s.h, 0, 0) : yt(a, s.data, s.w, s.h, 0, 0);
  (o.tex && (a.owned.delete(o.tex), g.dispose(o.tex)),
    (o.tex = r),
    (o.name = i ? "Background" : "Layer 1"),
    o.version++,
    a.invalidate(),
    k.emit("doc:layers", a),
    k.emit("view:fit", a));
}
let tf = 0;
async function fr(s) {
  const e = await xu();
  if (!e) {
    h.notify("The clipboard does not contain an image.", "info");
    return;
  }
  const { data: t, w: n, h: i, internal: a } = e;
  let o = a ? ue.x : 0,
    r = a ? ue.y : 0,
    l = h.doc;
  (l || ((l = En("Clipboard", n, i, 8, null)), (o = 0), (r = 0), (s = !0)),
    (!s || !a) && ((o = Math.round((l.width - n) / 2)), (r = Math.round((l.height - i) / 2))),
    s && a && ((o = ue.x), (r = ue.y)));
  const c = a && ue?.ink && l.ink?.id === ue.inkId ? $i(l, ue.ink, n, i, o, r) : yt(l, t, n, i, o, r);
  (l.owned.delete(c), Ii(l, c, "Pasted Layer", "Paste"));
}
async function sf() {
  const s = z(),
    e = new Y("Fill", { width: 360 }),
    t = { what: "fg", mode: "normal", opacity: 100 };
  (e.body.append(
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Contents"),
      O(
        [
          { value: "fg", label: "Foreground Color" },
          { value: "bg", label: "Background Color" },
          { value: "black", label: "Black" },
          { value: "gray", label: "50% Gray" },
          { value: "white", label: "White" },
        ],
        t.what,
        (a) => (t.what = a),
      ),
    ),
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Mode"),
      Ot(t.mode, (a) => (t.mode = a), ["behind", "clear"]),
    ),
    Q({ label: "Opacity", value: 100, min: 0, max: 100, unit: "%", onInput: (a) => (t.opacity = a) }),
  ),
    (e.onOk = () => t));
  const n = await e.show();
  if (!n) return;
  const i =
    n.what === "fg"
      ? h.fg
      : n.what === "bg"
        ? h.bg
        : n.what === "black"
          ? [0, 0, 0]
          : n.what === "white"
            ? [1, 1, 1]
            : [0.5, 0.5, 0.5];
  sn(s, i, n.opacity / 100, n.mode);
}
async function As(s, e, t, n = "px", i = 0, a = 1e3) {
  const o = new Y(s, { width: 320 });
  let r = t;
  return (
    o.body.append(
      p(
        "div",
        { class: "form-row" },
        p("span", { class: "sf-label" }, e),
        q({ value: t, min: i, max: a, unit: n, step: n === "px" ? 1 : 0.1, width: 70, onInput: (l) => (r = l) }),
      ),
    ),
    (o.onOk = () => r),
    o.show()
  );
}
async function nf() {
  const s = z();
  if (!s.selection) throw new B("Make a selection first.");
  const e = new Y("Select and Mask", { width: 360 }),
    t = { smooth: 0, feather: 0, shift: 0 };
  (e.body.append(
    p("p", { class: "hint" }, "Refine the edge of the current selection."),
    Q({ label: "Smooth", value: 0, min: 0, max: 50, unit: "px", onInput: (i) => (t.smooth = i) }),
    Q({ label: "Feather", value: 0, min: 0, max: 250, step: 0.5, unit: "px", onInput: (i) => (t.feather = i) }),
    Q({ label: "Shift Edge", value: 0, min: -100, max: 100, unit: "px", onInput: (i) => (t.shift = i) }),
  ),
    (e.onOk = () => t));
  const n = await e.show();
  n && (n.smooth && Ka(s, n.smooth), n.shift && gi(s, n.shift), n.feather && Ya(s, n.feather));
}
async function af(s) {
  const e = z();
  if (e.bitDepth === s) return;
  const t = e.bitDepth;
  (e.transact(`Mode: ${s} Bits/Channel`, () => {
    e.bitDepth = s;
    for (const n of e.all()) {
      if (!n.tex) continue;
      const i = e.newLayerTex();
      (s < 32 && t === 32 ? g.draw(g.program("clamp01", of), i, { textures: { u_src: n.tex } }) : g.copy(n.tex, i),
        (n.tex = i),
        n.version++);
    }
  }),
    k.emit("docs:changed"));
}
const of = `#version 300 es
precision highp float; uniform sampler2D u_src; out vec4 o;
void main(){ o = clamp(texelFetch(u_src, ivec2(gl_FragCoord.xy), 0), 0.0, 1.0); }`;
async function mr(s) {
  const e = z(),
    t = Re(e),
    n = Ni(t.tex),
    i = (r) => {
      const l = r.reduce((f, m) => f + m, 0) || 1;
      let c = 0,
        u = 0,
        d = 255;
      for (let f = 0; f < 256; f++)
        if (((c += r[f]), c > l * 0.001)) {
          u = f;
          break;
        }
      c = 0;
      for (let f = 255; f >= 0; f--)
        if (((c += r[f]), c > l * 0.001)) {
          d = f;
          break;
        }
      return { inBlack: u / 255, inWhite: Math.max(u + 1, d) / 255, gamma: 1, outBlack: 0, outWhite: 1 };
    },
    a = { inBlack: 0, inWhite: 1, gamma: 1, outBlack: 0, outWhite: 1 },
    o = s ? { rgb: a, r: i(n.r), g: i(n.g), b: i(n.b) } : { rgb: i(n.l), r: { ...a }, g: { ...a }, b: { ...a } };
  yi(e, { type: "levels", params: o });
}
async function gr() {
  if (!h.python.capabilities.lcms)
    throw new Error("Soft-proofing needs Pillow with LittleCMS (Extensions › Python Setup…).");
  const e = (await window.brushboard.python.call("core", "list_profiles", {})).result || [],
    t = new Y("Customize Proof Condition", { width: 460 }),
    n = {
      profile: h.setting("proof.profile", e[0]?.path || ""),
      intent: h.setting("proof.intent", 0),
      bpc: h.setting("proof.bpc", !0),
    };
  (t.body.append(
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Device to simulate"),
      O(
        e.map((r) => ({ value: r.path, label: r.name })),
        n.profile,
        (r) => (n.profile = r),
      ),
    ),
    p(
      "div",
      { class: "form-row" },
      p(
        "button",
        {
          class: "btn small",
          onclick: async () => {
            const r = (
              await window.brushboard.dialog.open({
                title: "ICC profile",
                filters: [{ name: "ICC", extensions: ["icc", "icm"] }],
              })
            )[0];
            r && ((n.profile = r), h.notify("Using " + pe(r)));
          },
        },
        "Other profile…",
      ),
    ),
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Rendering intent"),
      O(
        [
          { value: 0, label: "Perceptual" },
          { value: 1, label: "Relative Colorimetric" },
          { value: 2, label: "Saturation" },
          { value: 3, label: "Absolute Colorimetric" },
        ],
        n.intent,
        (r) => (n.intent = r),
      ),
    ),
    p(
      "div",
      { class: "form-row" },
      $("Black point compensation", n.bpc, (r) => (n.bpc = r)),
    ),
    e.length ? "" : p("p", { class: "hint" }, "No system ICC profiles found in /usr/share/color/icc — choose a file."),
  ),
    (t.onOk = () => n));
  const i = await t.show();
  if (!i || !i.profile) return;
  (h.set("proof.profile", i.profile), h.set("proof.intent", i.intent), h.set("proof.bpc", i.bpc));
  const a = await window.brushboard.python.call("core", "proof_lut", {
      profile: i.profile,
      intent: i.intent,
      bpc: i.bpc,
      size: 33,
    }),
    o = a.buffers.lut;
  ((L.lut3d = g.createLut3d(new Float32Array(o.data), 33)),
    (L.proof = !0),
    h.notify(`Proofing: ${a.result?.name || pe(i.profile)}`, "info"),
    L.request());
}
async function rf() {
  const s = await window.brushboard.app.info(),
    e = new Y("About BrushBoard", { width: 460, cancel: null });
  return (
    e.body.append(
      p(
        "div",
        { class: "about" },
        p("div", {
          class: "about-mark",
          html: (
            await re(
              async () => {
                const { LOGO: t } = await Promise.resolve().then(() => ch);
                return { LOGO: t };
              },
              void 0,
              import.meta.url,
            )
          ).LOGO.replace(/width="22" height="22"/, 'width="120" height="120"'),
        }),
        p("h2", null, "BrushBoard"),
        p("p", { class: "muted" }, `Version ${s.version} · Electron ${s.electron} · Chromium ${s.chrome}`),
        p("p", null, "A photo editing and painting studio, with Python extensions."),
        p(
          "p",
          { class: "muted" },
          `GPU: WebGL2 · max texture ${g.maxTex}px · float linear filtering: ${g.floatLinear ? "yes" : "no"}`,
        ),
        p("p", { class: "muted" }, `Python: ${h.python.python || "not found"}`),
      ),
    ),
    e.show()
  );
}
async function lf() {
  const s = new Y("Keyboard Shortcuts", { width: 640, cancel: null }),
    e = [...h.commands.values()].filter((n) => n.shortcut).sort((n, i) => n.label.localeCompare(i.label)),
    t = [...h.tools.values()].filter((n) => n.shortcut && n.group !== "_hidden");
  return (
    s.body.append(
      p(
        "div",
        { class: "shortcut-grid" },
        ...e.map((n) =>
          p(
            "div",
            { class: "srow" },
            p("span", null, n.label.replace("…", "")),
            p("kbd", null, n.shortcut.split("|")[0]),
          ),
        ),
        ...t.map((n) => p("div", { class: "srow" }, p("span", null, n.name), p("kbd", null, n.shortcut))),
        ...[
          ["Pan (hold)", "Space"],
          ["Default colors", "D"],
          ["Swap colors", "X"],
          ["Brush size", "[ / ]"],
          ["Brush hardness", "Shift+[ / ]"],
          ["Brush opacity", "1 … 0"],
          ["Eyedropper while painting", "Alt"],
          ["Hide panels", "Tab"],
        ].map(([n, i]) => p("div", { class: "srow" }, p("span", null, n), p("kbd", null, i))),
      ),
    ),
    s.show()
  );
}
async function cf() {
  const s = h.prefs,
    e = new Y("Preferences", { width: 480 }),
    t = { ...s };
  (e.body.append(
    p("div", { class: "sw-title" }, "Performance"),
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "History states"),
      q({ value: t.historyStates, min: 5, max: 500, width: 60, onInput: (a) => (t.historyStates = a) }),
    ),
    p(
      "div",
      {
        class: "form-row",
        title:
          "How much graphics memory images may use. Beyond this, undo history, hidden layers and other open documents move to system RAM and come back when needed.",
      },
      p("span", { class: "sf-label" }, "Graphics memory for images"),
      q({
        value: t.gpuBudgetMB / 1024,
        min: 0.5,
        max: 64,
        step: 0.5,
        unit: "GB",
        width: 60,
        onInput: (a) => (t.gpuBudgetMB = Math.round(a * 1024)),
      }),
    ),
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "New document bit depth"),
      O(
        [
          { value: 8, label: "8-bit" },
          { value: 16, label: "16-bit" },
          { value: 32, label: "32-bit float" },
        ],
        t.defaultBitDepth,
        (a) => (t.defaultBitDepth = a),
      ),
    ),
    p(
      "div",
      {
        class: "form-row",
        title:
          "Subject Snap and AI healing run on the processor everywhere, and much faster on NVIDIA, AMD or Intel graphics with a GPU pack.",
      },
      p("span", { class: "sf-label" }, "AI acceleration"),
      p(
        "button",
        {
          class: "btn small",
          onclick: () => {
            re(() => import("./gpupack-BW9UycLe.js"), [], import.meta.url).then((a) => a.accelerationDialog());
          },
        },
        "GPU packs…",
      ),
    ),
    p("div", { class: "sw-title" }, "Interface"),
    p(
      "div",
      { class: "form-row" },
      $("Mouse wheel zooms (instead of scrolling)", t.wheelZooms, (a) => (t.wheelZooms = a)),
    ),
    p(
      "div",
      { class: "form-row" },
      $("Show pixel grid at high zoom", t.pixelGrid, (a) => (t.pixelGrid = a)),
    ),
    p(
      "div",
      { class: "form-row" },
      $("Show rulers", t.showRulers, (a) => (t.showRulers = a)),
    ),
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Transparency grid size"),
      q({ value: t.checkerSize, min: 2, max: 64, unit: "px", width: 50, onInput: (a) => (t.checkerSize = a) }),
    ),
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Grid colors"),
      ua(t.checker1, (a) => (t.checker1 = a)),
      ua(t.checker2, (a) => (t.checker2 = a)),
    ),
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Pasteboard"),
      (() => {
        const a = !t.pasteboard || t.pasteboard.toLowerCase() === "#1d1915",
          o = ua(a ? we("--pasteboard", "#26292d") : t.pasteboard, (l) => {
            ((t.pasteboard = l), (r.checked = !1));
          }),
          r = p("input", { type: "checkbox" });
        return (
          (r.checked = a),
          (r.onchange = () => {
            t.pasteboard = r.checked ? "" : o.value;
          }),
          p("span", { class: "opts" }, o, p("label", { class: "opts" }, r, "Match light/dark"))
        );
      })(),
    ),
    p("div", { class: "sw-title" }, "Python"),
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Interpreter (blank = auto)"),
      (() => {
        const a = p("input", {
          class: "text",
          value: t.pythonPath || "",
          placeholder: "~/.local/share/brushboard/venv/bin/python3",
        });
        return ((a.oninput = () => (t.pythonPath = a.value.trim() || void 0)), a);
      })(),
    ),
  ),
    (e.onOk = () => t));
  const n = await e.show();
  if (!n) return;
  const i = n.pythonPath !== s.pythonPath || (n.aiDevice || "auto") !== (s.aiDevice || "auto");
  Object.assign(h.prefs, n);
  for (const a of h.docs) a.historyLimit = n.historyStates;
  ((g.budget = n.gpuBudgetMB * 1024 * 1024),
    g.enforceBudget(),
    await h.savePrefs(),
    i && (await window.brushboard.python.restart(), (h.python = await window.brushboard.python.status())),
    L.resize());
}
function ua(s, e) {
  const t = p("input", { type: "color", value: s });
  return ((t.oninput = () => e(t.value)), t);
}
async function uf() {
  const s = z(),
    e = new Y("New Guide", { width: 300 }),
    t = { o: "vertical", pos: Math.round(s.width / 2) };
  (e.body.append(
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Orientation"),
      O(
        [
          { value: "vertical", label: "Vertical" },
          { value: "horizontal", label: "Horizontal" },
        ],
        t.o,
        (i) => (t.o = i),
      ),
    ),
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Position"),
      q({ value: t.pos, min: 0, max: 1e5, unit: "px", width: 70, onInput: (i) => (t.pos = i) }),
    ),
  ),
    (e.onOk = () => t));
  const n = await e.show();
  n && ((n.o === "vertical" ? s.guides.vertical : s.guides.horizontal).push(n.pos), L.request());
}
async function hf() {
  const s = z(),
    e = await yo(s),
    t = await Wi(e, s.name + " copy");
  h.addDoc(t);
}
async function Ba(s = h.doc) {
  s && (h.tool?.commit?.(), (await _o(s)) && h.removeDoc(s));
}
async function df() {
  const s = z(),
    e = s.selection ? at(s) : { x: 0, y: 0, w: s.width, h: s.height };
  if (!e) throw new Error("Empty selection");
  const t = Math.min(1, 512 / Math.max(e.w, e.h)),
    n = g.read(s.composite, e),
    i = Math.max(1, Math.round(e.w * t)),
    a = Math.max(1, Math.round(e.h * t)),
    o = new OffscreenCanvas(e.w, e.h),
    r = new Uint8ClampedArray(n.length);
  for (let m = 0; m < e.w * e.h; m++) {
    const v = n[m * 4 + 3],
      y = 0.299 * n[m * 4] + 0.587 * n[m * 4 + 1] + 0.114 * n[m * 4 + 2];
    ((r[m * 4] = r[m * 4 + 1] = r[m * 4 + 2] = 255),
      (r[m * 4 + 3] = Math.round(Math.max(0, Math.min(1, (1 - y) * v)) * 255)));
  }
  o.getContext("2d").putImageData(new ImageData(r, e.w, e.h), 0, 0);
  const l = new OffscreenCanvas(i, a);
  l.getContext("2d").drawImage(o, 0, 0, i, a);
  const c = await l.convertToBlob({ type: "image/png" }),
    u = await new Promise((m) => {
      const v = new FileReader();
      ((v.onload = () => m(v.result)), v.readAsDataURL(c));
    }),
    d = await ps("Brush Name", "Name", "Sampled Brush");
  if (!d) return;
  const f = h.brushFor("brush");
  (h.brushPresets.push({
    ...f,
    name: d,
    tip: "texture",
    tipImage: u,
    size: Math.max(e.w, e.h),
    spacing: 0.25,
    hardness: 1,
  }),
    h.savePrefsSoon(),
    h.notify(`Brush "${d}" defined`, "success"));
}
function pf() {
  const s = (t, n, i, a, o = Zt, r) => h.command({ id: t, label: n, run: i, shortcut: a, enabled: o, checked: r }),
    e = () => !0;
  (s("file.new", "New…", sc, "Ctrl+N", e),
    s("file.newFromClipboard", "Create New Image from Clipboard", ef, "Ctrl+Alt+N", e),
    s("file.open", "Open…", Ap, "Ctrl+O", e),
    s(
      "file.place",
      "Place Embedded…",
      async () => {
        const t = (await window.brushboard.dialog.open({ title: "Place", properties: ["openFile"] }))[0];
        t && (await Nc(t));
      },
      "Ctrl+Shift+P",
    ),
    s("file.close", "Close", () => Ba(), "Ctrl+W"),
    s(
      "file.closeAll",
      "Close All",
      async () => {
        for (const t of [...h.docs]) {
          if (!(await _o(t))) return;
          h.removeDoc(t);
        }
      },
      "Ctrl+Alt+W",
    ),
    s("file.save", "Save", () => za(h.doc, !1), "Ctrl+S"),
    s("file.saveAs", "Save As…", () => za(h.doc, !0), "Ctrl+Shift+S"),
    s("file.export", "Export As…", () => jc(), "Ctrl+Alt+Shift+W"),
    s("file.quickExport", "Quick Export as PNG", () => Dp(), "Ctrl+Alt+Shift+E"),
    s(
      "file.revert",
      "Revert",
      () => {
        z().goto(0);
      },
      "F12",
      () => !!h.doc?.canUndo(),
    ),
    s("file.runScript", "Run Python Script…", Ip, void 0, e),
    s("file.quit", "Quit", () => window.brushboard.win.close(), "Ctrl+Q", e),
    s(
      "edit.undo",
      "Undo",
      () => {
        (h.tool?.cancel?.(), z().undo());
      },
      "Ctrl+Z|Ctrl+Alt+Z",
      () => !!h.doc?.canUndo(),
    ),
    s(
      "edit.redo",
      "Redo",
      () => z().redo(),
      "Ctrl+Shift+Z|Ctrl+Y",
      () => !!h.doc?.canRedo(),
    ),
    s("edit.cut", "Cut", () => ca(!1, !0), "Ctrl+X"),
    s("edit.copy", "Copy", () => ca(!1), "Ctrl+C"),
    s("edit.copyMerged", "Copy Merged", () => ca(!0), "Ctrl+Shift+C"),
    s("edit.paste", "Paste", () => fr(!1), "Ctrl+V", e),
    s("edit.pasteInPlace", "Paste in Place", () => fr(!0), "Ctrl+Shift+V", e),
    s("edit.clear", "Clear", () => so(z()), "Delete|Backspace"),
    s("edit.fill", "Fill…", sf, "Shift+F5"),
    s(
      "edit.contentAwareFill",
      "Content-Aware Fill",
      async () =>
        (
          await re(
            async () => {
              const { contentAwareFill: t } = await Promise.resolve().then(() => zu);
              return { contentAwareFill: t };
            },
            void 0,
            import.meta.url,
          )
        ).contentAwareFill(z()),
      "Ctrl+Shift+F5",
      Ke,
    ),
    s("edit.fillFg", "Fill with Foreground", () => sn(z(), h.fg, 1, "normal", "Fill"), "Alt+Backspace|Alt+Delete"),
    s("edit.fillBg", "Fill with Background", () => sn(z(), h.bg, 1, "normal", "Fill"), "Ctrl+Backspace|Ctrl+Delete"),
    s(
      "edit.freeTransform",
      "Free Transform",
      () => {
        h.tools.get("transform").begin(h.tool?.id || "move");
      },
      "Ctrl+T",
    ),
    s("edit.marionette", "Marionette", () => {
      h.tools.get("marionette").begin(h.tool?.id || "move");
    }),
    Kp(s),
    yu(s),
    s(
      "edit.transform3d",
      "3D Rotate",
      () => {
        h.tool?.id === "transform3d" ? h.tool.start() : h.setTool("transform3d");
      },
      "Ctrl+Alt+T",
    ),
    s("edit.flipH", "Flip Horizontal", () => ka(z(), !0)),
    s("edit.flipV", "Flip Vertical", () => ka(z(), !1)),
    s("edit.rot90", "Rotate 90° Clockwise", () => js(z(), 90)),
    s("edit.rot90ccw", "Rotate 90° Counter Clockwise", () => js(z(), -90)),
    s("edit.rot180", "Rotate 180°", () => js(z(), 180)),
    s("edit.defineBrush", "Define Brush Preset…", df),
    s("edit.prefs", "Preferences…", cf, "Ctrl+K", e),
    s(
      "edit.aiAccel",
      "AI Acceleration…",
      () => re(() => import("./gpupack-BW9UycLe.js"), [], import.meta.url).then((t) => t.accelerationDialog()),
      void 0,
      e,
    ),
    s(
      "edit.tablet",
      "Tablet & Pen…",
      async () =>
        (
          await re(
            async () => {
              const { tabletDialog: t } = await import("./tablet-DNv8GN3z.js");
              return { tabletDialog: t };
            },
            [],
            import.meta.url,
          )
        ).tabletDialog(),
      void 0,
      e,
    ));
  for (const t of ci)
    t !== "-" && s("adj." + t, Xe[t] + (t === "invert" || t === "desaturate" ? "" : "…"), () => Ql(t), Ih[t]);
  (s("image.autoTone", "Auto Tone", () => mr(!0), "Ctrl+Shift+L"),
    s("image.autoContrast", "Auto Contrast", () => mr(!1), "Ctrl+Alt+Shift+L"),
    s("image.size", "Image Size…", nc, "Ctrl+Alt+I"),
    s("image.canvasSize", "Canvas Size…", ic, "Ctrl+Alt+C"),
    s("image.rot180", "Rotate Canvas 180°", () => Vn(z(), 180)),
    s("image.rot90", "Rotate Canvas 90° Clockwise", () => Vn(z(), 90)),
    s("image.rot90ccw", "Rotate Canvas 90° Counter Clockwise", () => Vn(z(), -90)),
    s("image.flipH", "Flip Canvas Horizontal", () => xa(z(), !0)),
    s("image.flipV", "Flip Canvas Vertical", () => xa(z(), !1)),
    s(
      "image.crop",
      "Crop to Selection",
      () => {
        (El(z()), k.emit("view:fit", h.doc));
      },
      void 0,
      Ke,
    ),
    s("image.trim", "Trim Transparent Pixels", () => {
      const t = z(),
        n = ve(t),
        i = ks(n);
      (g.dispose(n), i && (Bi(t, i), k.emit("view:fit", t)));
    }),
    s("image.duplicate", "Duplicate…", hf));
  for (const t of [8, 16, 32])
    s(
      "image.mode" + t,
      `${t} Bits/Channel`,
      () => af(t),
      void 0,
      () => !!h.doc && !(t === 32 && h.doc.ink),
      () => h.doc?.bitDepth === t,
    );
  (s("layer.new", "New Layer", () => hl(z()), "Ctrl+Shift+N"),
    s("layer.newGroup", "New Group", () => to(z())),
    s("layer.duplicate", "Duplicate Layer", () => Oi(z())),
    s(
      "layer.delete",
      "Delete Layer",
      () => ml(z()),
      void 0,
      () => !!h.doc?.active,
    ),
    s("layer.viaCopy", "Layer via Copy", () => ya(z(), !1), "Ctrl+J"),
    s("layer.viaCut", "Layer via Cut", () => ya(z(), !0), "Ctrl+Shift+J"),
    s("layer.group", "Group Layers", () => dl(z()), "Ctrl+G"),
    s("layer.ungroup", "Ungroup Layers", () => pl(z()), "Ctrl+Shift+G"),
    s("layer.style", "Layer Style…", Kd, void 0, () => !!h.doc?.active));
  for (const t of ci)
    t !== "-" &&
      s("adjlayer." + t, Xe[t] + "…", () => {
        (fl(z(), t, void 0, h.fg, h.bg), de.show("properties"));
      });
  (s(
    "layer.addMask",
    "Add Layer Mask",
    () => wa(z()),
    void 0,
    () => !!h.doc?.active && !h.doc.active.mask,
  ),
    s(
      "layer.addMaskHide",
      "Add Layer Mask: Hide All",
      () => wa(z(), "hide"),
      void 0,
      () => !!h.doc?.active && !h.doc.active.mask,
    ),
    s(
      "layer.deleteMask",
      "Delete Layer Mask",
      () => tn(z(), !1),
      void 0,
      () => !!h.doc?.active?.mask,
    ),
    s(
      "layer.applyMask",
      "Apply Layer Mask",
      () => tn(z(), !0),
      void 0,
      () => !!h.doc?.active?.mask,
    ),
    s(
      "layer.invertMask",
      "Invert Layer Mask",
      () => {
        const t = z(),
          n = t.active;
        Ml(t, n, "mask");
      },
      void 0,
      () => !!h.doc?.active?.mask,
    ),
    s("layer.clip", "Create/Release Clipping Mask", () => _l(z()), "Ctrl+Alt+G"),
    s("layer.front", "Bring to Front", () => zs(z(), "top"), "Ctrl+Shift+]"),
    s("layer.forward", "Bring Forward", () => zs(z(), "up"), "Ctrl+]"),
    s("layer.backward", "Send Backward", () => zs(z(), "down"), "Ctrl+["),
    s("layer.back", "Send to Back", () => zs(z(), "bottom"), "Ctrl+Shift+["),
    s("layer.mergeDown", "Merge Down", () => gl(z()), "Ctrl+E"),
    s("layer.mergeVisible", "Merge Visible", () => vl(z()), "Ctrl+Shift+E"),
    s("layer.flatten", "Flatten Image", () => yl(z())),
    s("layer.rasterize", "Rasterize", () => xl(z())),
    s("layer.rename", "Rename Layer…", async () => {
      const t = z(),
        n = t.active;
      if (!n) return;
      const i = await ps("Layer Properties", "Name", n.name);
      i && $e(t, n, { name: i }, "Rename Layer");
    }),
    s(
      "layer.next",
      "Select Next Layer",
      () => {
        const t = z(),
          n = t.all(),
          i = n.findIndex((a) => a.id === t.activeId);
        i > 0 && t.setActive(n[i - 1].id);
      },
      "Alt+]",
    ),
    s(
      "layer.prev",
      "Select Previous Layer",
      () => {
        const t = z(),
          n = t.all(),
          i = n.findIndex((a) => a.id === t.activeId);
        i < n.length - 1 && t.setActive(n[i + 1].id);
      },
      "Alt+[",
    ),
    s("layer.showAll", "Show All Layers", () => {
      const t = z();
      t.transact("Show All", () => t.all().forEach((n) => (n.visible = !0)));
    }),
    s("select.all", "All", () => mi(z()), "Ctrl+A"),
    s("select.deselect", "Deselect", () => wn(z()), "Ctrl+D", Ke),
    s("select.reselect", "Reselect", () => sl(z()), "Ctrl+Shift+D"),
    s(
      "select.colorRange",
      "Color Range…",
      async () => {
        await (
          await re(
            async () => {
              const { openColorRange: t } = await Promise.resolve().then(() => Ou);
              return { openColorRange: t };
            },
            void 0,
            import.meta.url,
          )
        ).openColorRange(z());
      },
      "Ctrl+Alt+O",
      Zt,
    ),
    s("select.subject", "Subject (Subject Snap)", () => Wc(z()), "Ctrl+Alt+Shift+S"),
    s("layer.removeBackground", "Remove Background", () => Uc(z())),
    s(
      "ai.download",
      "Download Subject Snap Model…",
      async () => {
        (await Bt(), await Ui(!0));
      },
      void 0,
      e,
    ),
    s("select.inverse", "Inverse", () => nl(z()), "Ctrl+I"),
    s("select.layerAlpha", "Load Layer Transparency", () => {
      const t = z();
      t.active && hs(t, t.active);
    }),
    s(
      "select.fromMask",
      "Load Layer Mask",
      () => {
        const t = z();
        t.active?.mask && hs(t, t.active, "replace", !0);
      },
      void 0,
      () => !!h.doc?.active?.mask,
    ),
    s("select.refine", "Select and Mask…", nf, "Ctrl+Alt+R", Ke),
    s(
      "select.feather",
      "Feather…",
      async () => {
        const t = await As("Feather Selection", "Feather Radius", 5, "px", 0.1, 1e3);
        t && Ya(z(), t);
      },
      "Shift+F6",
      Ke,
    ),
    s(
      "select.expand",
      "Expand…",
      async () => {
        const t = await As("Expand Selection", "Expand By", 5);
        t && gi(z(), t);
      },
      void 0,
      Ke,
    ),
    s(
      "select.contract",
      "Contract…",
      async () => {
        const t = await As("Contract Selection", "Contract By", 5);
        t && gi(z(), -t);
      },
      void 0,
      Ke,
    ),
    s(
      "select.border",
      "Border…",
      async () => {
        const t = await As("Border Selection", "Width", 10);
        t && il(z(), t);
      },
      void 0,
      Ke,
    ),
    s(
      "select.smooth",
      "Smooth…",
      async () => {
        const t = await As("Smooth Selection", "Sample Radius", 4);
        t && Ka(z(), t);
      },
      void 0,
      Ke,
    ),
    s(
      "select.quickMask",
      "Quick Mask Mode",
      () => {
        const t = z();
        ((t.quickMask = !t.quickMask), t.quickMask && !t.selection && mi(t), L.request(), k.emit("doc:layers", t));
      },
      "Q",
      Zt,
      () => !!h.doc?.quickMask,
    ),
    s(
      "filter.repeat",
      "Last Filter",
      () => Bd(),
      "Ctrl+F",
      () => Zt() && !!ec(),
    ));
  for (const t of Cn) s("filter." + t.id, t.name, () => co(t), t.shortcut);
  (s("view.zoomIn", "Zoom In", () => L.zoomStep(1), "Ctrl+=|Ctrl+Shift+="),
    s("view.zoomOut", "Zoom Out", () => L.zoomStep(-1), "Ctrl+-"),
    s("view.fit", "Fit on Screen", () => L.fit(), "Ctrl+0"),
    s("view.actual", "100%", () => L.actualPixels(), "Ctrl+1"),
    s("view.resetRotation", "Reset View Rotation", () => {
      ((z().view.rotation = 0), L.viewChanged());
    }),
    s(
      "view.rotateRight",
      "Rotate View Right",
      () => {
        const t = z();
        ((t.view.rotation = (((t.view.rotation || 0) + 15 + 540) % 360) - 180),
          L.viewChanged(),
          k.emit("tool:options"));
      },
      "Alt+Shift+]",
    ),
    s(
      "view.rotateLeft",
      "Rotate View Left",
      () => {
        const t = z();
        ((t.view.rotation = (((t.view.rotation || 0) - 15 + 540) % 360) - 180),
          L.viewChanged(),
          k.emit("tool:options"));
      },
      "Alt+Shift+[",
    ),
    s(
      "view.flip",
      "Flip View Horizontal",
      () => {
        const t = z();
        ((t.view.flip = !t.view.flip), L.viewChanged());
      },
      void 0,
      Zt,
      () => !!h.doc?.view.flip,
    ),
    s(
      "view.pixelGrid",
      "Pixel Grid",
      () => {
        ((h.prefs.pixelGrid = !h.prefs.pixelGrid), h.savePrefsSoon(), L.request());
      },
      void 0,
      e,
      () => h.prefs.pixelGrid,
    ),
    s(
      "view.rulers",
      "Rulers",
      () => {
        ((h.prefs.showRulers = !h.prefs.showRulers), h.savePrefsSoon(), L.resize());
      },
      "Ctrl+R",
      e,
      () => h.prefs.showRulers,
    ),
    s("view.newGuide", "New Guide…", uf),
    s("view.clearGuides", "Clear Guides", () => {
      const t = z();
      ((t.guides = { horizontal: [], vertical: [] }), L.request());
    }),
    s("view.proofSetup", "Proof Setup…", gr, void 0, e),
    s(
      "view.proof",
      "Proof Colors",
      () => {
        if (!L.lut3d) return gr();
        ((L.proof = !L.proof), L.request());
      },
      "Ctrl+Y",
      e,
      () => L.proof,
    ),
    s(
      "view.gamut",
      "Gamut Warning",
      () => {
        ((L.gamutWarning = !L.gamutWarning), !L.proof && L.gamutWarning && (L.proof = !0), L.request());
      },
      "Ctrl+Shift+Y",
      () => !!L.lut3d,
      () => L.gamutWarning,
    ),
    s("view.fullscreen", "Full Screen", () => window.brushboard.win.toggleFullscreen(), "F11", e),
    s("view.hidePanels", "Show/Hide Panels", () => document.body.classList.toggle("panels-hidden"), "Tab", e),
    s("window.reset", "Reset Workspace", () => de.reset(), void 0, e),
    s("window.devtools", "Developer Tools", () => window.brushboard.win.devtools(), "Ctrl+Shift+F12", e),
    s("panel.properties", "Properties", () => de.show("properties"), void 0, e),
    s("panel.paths", "Paths", () => de.show("paths"), void 0, e),
    s(
      "ext.manager",
      "Manage Extensions…",
      () =>
        zp(async () => {
          await window.__reloadExtensions();
        }),
      void 0,
      e,
    ),
    s(
      "ext.reload",
      "Reload Extensions",
      async () => {
        (await window.brushboard.python.restart(),
          await window.__reloadExtensions(),
          h.notify("Extensions reloaded", "success"));
      },
      "Ctrl+Alt+Shift+R",
      e,
    ),
    s("help.about", "About BrushBoard", rf, void 0, e),
    s("help.shortcuts", "Keyboard Shortcuts", lf, "Ctrl+/", e),
    s(
      "help.sdk",
      "Extension SDK Documentation",
      async () => {
        const t = await window.brushboard.app.info(),
          n = await window.brushboard.shell.openPath(`${t.resources}/docs/EXTENSIONS.md`);
        n && h.notify(n, "error");
      },
      void 0,
      e,
    ));
}
function ku() {
  const s = (e) =>
    ci
      .map((t) => (t === "-" ? "-" : { label: "", cmd: e + t }))
      .map((t) => (t === "-" ? "-" : { ...t, label: h.commands.get(t.cmd)?.label || t.cmd }));
  return [
    {
      label: "File",
      items: () => [
        { label: "New…", cmd: "file.new" },
        { label: "Create New Image from Clipboard", cmd: "file.newFromClipboard" },
        { label: "Open…", cmd: "file.open" },
        {
          label: "Open Recent",
          submenu: () =>
            h.prefs.recentFiles.length
              ? [
                  ...h.prefs.recentFiles.map((e) => ({ label: e, run: () => bt(e) })),
                  "-",
                  {
                    label: "Clear Recent",
                    run: () => {
                      ((h.prefs.recentFiles = []), h.savePrefsSoon());
                    },
                  },
                ]
              : [{ label: "(none)", enabled: () => !1 }],
        },
        "-",
        { label: "Close", cmd: "file.close" },
        { label: "Close All", cmd: "file.closeAll" },
        { label: "Save", cmd: "file.save" },
        { label: "Save As…", cmd: "file.saveAs" },
        { label: "Revert", cmd: "file.revert" },
        "-",
        {
          label: "Export",
          submenu: [
            { label: "Quick Export as PNG", cmd: "file.quickExport" },
            { label: "Export As…", cmd: "file.export" },
            { label: "Export as SVG…", cmd: "file.exportSvg" },
          ],
        },
        { label: "Place Embedded…", cmd: "file.place" },
        "-",
        { label: "Scripts", submenu: [{ label: "Run Python Script…", cmd: "file.runScript" }] },
        "-",
        { label: "Quit", cmd: "file.quit" },
      ],
    },
    {
      label: "Edit",
      items: () => [
        { label: h.doc?.canUndo() ? `Undo ${h.doc.history[h.doc.historyIndex - 1].label}` : "Undo", cmd: "edit.undo" },
        { label: h.doc?.canRedo() ? `Redo ${h.doc.history[h.doc.historyIndex].label}` : "Redo", cmd: "edit.redo" },
        "-",
        { label: "Cut", cmd: "edit.cut" },
        { label: "Copy", cmd: "edit.copy" },
        { label: "Copy Merged", cmd: "edit.copyMerged" },
        { label: "Paste", cmd: "edit.paste" },
        { label: "Paste in Place", cmd: "edit.pasteInPlace" },
        { label: "Clear", cmd: "edit.clear" },
        "-",
        { label: "Fill…", cmd: "edit.fill" },
        { label: "Content-Aware Fill", cmd: "edit.contentAwareFill" },
        "-",
        { label: "Free Transform", cmd: "edit.freeTransform" },
        { label: "Marionette", cmd: "edit.marionette" },
        { label: "3D Rotate…", cmd: "edit.transform3d" },
        {
          label: "Transform",
          submenu: [
            { label: "Rotate 180°", cmd: "edit.rot180" },
            { label: "Rotate 90° Clockwise", cmd: "edit.rot90" },
            { label: "Rotate 90° Counter Clockwise", cmd: "edit.rot90ccw" },
            "-",
            { label: "Flip Horizontal", cmd: "edit.flipH" },
            { label: "Flip Vertical", cmd: "edit.flipV" },
          ],
        },
        "-",
        { label: "Define Brush Preset…", cmd: "edit.defineBrush" },
        "-",
        { label: "Preferences…", cmd: "edit.prefs" },
        { label: "AI Acceleration…", cmd: "edit.aiAccel" },
        { label: "Tablet & Pen…", cmd: "edit.tablet" },
      ],
    },
    {
      label: "Image",
      items: () => [
        {
          label: "Mode",
          submenu: [
            { label: "RGB Color", cmd: "image.modeRGB" },
            { label: "CMYK Color…", cmd: "image.modeCMYK" },
            "-",
            { label: "8 Bits/Channel", cmd: "image.mode8" },
            { label: "16 Bits/Channel", cmd: "image.mode16" },
            { label: "32 Bits/Channel", cmd: "image.mode32" },
            "-",
            { label: "Assign Profile…", cmd: "image.assignProfile" },
            { label: "Total Ink Limit…", cmd: "image.inkLimit" },
          ],
        },
        "-",
        {
          label: "Adjustments",
          submenu: () => [...s("adj."), "-", { label: "Shadows/Highlights…", cmd: "filter.shadowsHighlights" }],
        },
        "-",
        { label: "Auto Tone", cmd: "image.autoTone" },
        { label: "Auto Contrast", cmd: "image.autoContrast" },
        "-",
        { label: "Image Size…", cmd: "image.size" },
        { label: "Canvas Size…", cmd: "image.canvasSize" },
        {
          label: "Image Rotation",
          submenu: [
            { label: "180°", cmd: "image.rot180" },
            { label: "90° Clockwise", cmd: "image.rot90" },
            { label: "90° Counter Clockwise", cmd: "image.rot90ccw" },
            "-",
            { label: "Flip Canvas Horizontal", cmd: "image.flipH" },
            { label: "Flip Canvas Vertical", cmd: "image.flipV" },
          ],
        },
        { label: "Crop", cmd: "image.crop" },
        { label: "Trim", cmd: "image.trim" },
        "-",
        { label: "Duplicate…", cmd: "image.duplicate" },
      ],
    },
    {
      label: "Layer",
      items: () => [
        {
          label: "New",
          submenu: [
            { label: "Layer…", cmd: "layer.new" },
            { label: "Group", cmd: "layer.newGroup" },
            "-",
            { label: "Layer via Copy", cmd: "layer.viaCopy" },
            { label: "Layer via Cut", cmd: "layer.viaCut" },
          ],
        },
        { label: "Duplicate Layer", cmd: "layer.duplicate" },
        { label: "Delete Layer", cmd: "layer.delete" },
        { label: "Rename Layer…", cmd: "layer.rename" },
        "-",
        { label: "Layer Style…", cmd: "layer.style" },
        { label: "Remove Background", cmd: "layer.removeBackground" },
        { label: "New Adjustment Layer", submenu: () => s("adjlayer.") },
        "-",
        {
          label: "Layer Mask",
          submenu: [
            { label: "Reveal All / Selection", cmd: "layer.addMask" },
            { label: "Hide All", cmd: "layer.addMaskHide" },
            "-",
            { label: "Invert", cmd: "layer.invertMask" },
            { label: "Apply", cmd: "layer.applyMask" },
            { label: "Delete", cmd: "layer.deleteMask" },
          ],
        },
        { label: "Vector Mask", submenu: ou },
        { label: "Create/Release Clipping Mask", cmd: "layer.clip" },
        "-",
        { label: "Group Layers", cmd: "layer.group" },
        { label: "Ungroup Layers", cmd: "layer.ungroup" },
        {
          label: "Arrange",
          submenu: [
            { label: "Bring to Front", cmd: "layer.front" },
            { label: "Bring Forward", cmd: "layer.forward" },
            { label: "Send Backward", cmd: "layer.backward" },
            { label: "Send to Back", cmd: "layer.back" },
          ],
        },
        {
          label: "New Shape Layer",
          submenu: [
            { label: "From Current Path", cmd: "path.toShape" },
            { label: "Solid Colour Fill", cmd: "layer.newShape" },
          ],
        },
        "-",
        {
          label: "Rasterize",
          submenu: [
            { label: "Layer (Type / Shape / Style / Group)", cmd: "layer.rasterize" },
            { label: "Vector Mask", cmd: "layer.vmaskRasterize" },
          ],
        },
        "-",
        { label: "Merge Down", cmd: "layer.mergeDown" },
        { label: "Merge Visible", cmd: "layer.mergeVisible" },
        { label: "Flatten Image", cmd: "layer.flatten" },
      ],
    },
    {
      label: "Select",
      items: () => [
        { label: "All", cmd: "select.all" },
        { label: "Deselect", cmd: "select.deselect" },
        { label: "Reselect", cmd: "select.reselect" },
        { label: "Inverse", cmd: "select.inverse" },
        "-",
        { label: "Color Range…", cmd: "select.colorRange" },
        { label: "Subject", cmd: "select.subject" },
        "-",
        { label: "Load Layer Transparency", cmd: "select.layerAlpha" },
        { label: "Load Layer Mask", cmd: "select.fromMask" },
        "-",
        { label: "Select and Mask…", cmd: "select.refine" },
        {
          label: "Modify",
          submenu: [
            { label: "Border…", cmd: "select.border" },
            { label: "Smooth…", cmd: "select.smooth" },
            { label: "Expand…", cmd: "select.expand" },
            { label: "Contract…", cmd: "select.contract" },
            { label: "Feather…", cmd: "select.feather" },
          ],
        },
        "-",
        { label: "Edit in Quick Mask Mode", cmd: "select.quickMask" },
      ],
    },
    {
      label: "Filter",
      items: () => {
        const e = Ti().filters,
          t = ec(),
          n = Rd.map((a) => ({
            label: a,
            submenu: Cn.filter((o) => o.category === a).map((o) => ({ label: o.name, cmd: "filter." + o.id })),
          })).filter((a) => a.submenu.length),
          i = [...new Set(e.map((a) => a.category))].map((a) => ({
            label: a,
            submenu: e.filter((o) => o.category === a).map((o) => ({ label: o.name, run: o.run, enabled: Zt })),
          }));
        return [
          { label: t ? `Last Filter (${t})` : "Last Filter", cmd: "filter.repeat" },
          "-",
          ...n,
          ...(i.length ? ["-", { label: "Python Extensions", enabled: () => !1 }, ...i] : []),
        ];
      },
    },
    {
      label: "View",
      items: () => [
        { label: "Proof Setup…", cmd: "view.proofSetup" },
        { label: "Proof Colors", cmd: "view.proof" },
        { label: "Gamut Warning", cmd: "view.gamut" },
        { label: "Total Ink Warning", cmd: "view.tacWarning" },
        {
          label: "Channels",
          submenu: [
            { label: "Composite (CMYK)", cmd: "channel.composite" },
            { label: "Cyan", cmd: "channel.cyan" },
            { label: "Magenta", cmd: "channel.magenta" },
            { label: "Yellow", cmd: "channel.yellow" },
            { label: "Black", cmd: "channel.black" },
          ],
        },
        "-",
        { label: "Zoom In", cmd: "view.zoomIn" },
        { label: "Zoom Out", cmd: "view.zoomOut" },
        { label: "Fit on Screen", cmd: "view.fit" },
        { label: "100%", cmd: "view.actual" },
        { label: "Reset Rotation", cmd: "view.resetRotation" },
        { label: "Flip Horizontal", cmd: "view.flip" },
        "-",
        { label: "Pixel Grid", cmd: "view.pixelGrid" },
        { label: "Rulers", cmd: "view.rulers" },
        { label: "New Guide…", cmd: "view.newGuide" },
        { label: "Clear Guides", cmd: "view.clearGuides" },
        "-",
        { label: "Full Screen", cmd: "view.fullscreen" },
        { label: "Show/Hide Panels", cmd: "view.hidePanels" },
      ],
    },
    {
      label: "Window",
      items: () => [
        ...de
          .allPanels()
          .sort((e, t) => e.title.localeCompare(t.title))
          .map((e) => ({ label: e.title, run: () => de.toggle(e.id), checked: () => de.isVisible(e.id) })),
        "-",
        { label: "Reset Workspace", cmd: "window.reset" },
        "-",
        {
          label: "Documents",
          submenu: () =>
            h.docs.length
              ? h.docs.map((e) => ({
                  label: e.name + (e.modified ? " •" : ""),
                  run: () => h.setDoc(e),
                  checked: () => e === h.doc,
                }))
              : [{ label: "(none)", enabled: () => !1 }],
        },
        "-",
        { label: "Developer Tools", cmd: "window.devtools" },
      ],
    },
    {
      label: "Extensions",
      items: () => {
        const e = Ti().commands,
          t = [...new Set(e.map((n) => n.menu))];
        return [
          { label: "Manage Extensions…", cmd: "ext.manager" },
          { label: "Download Subject Snap Model…", cmd: "ai.download" },
          { label: "Reload Extensions", cmd: "ext.reload" },
          { label: "Run Python Script…", cmd: "file.runScript" },
          ...(t.length ? ["-"] : []),
          ...t.map((n) => ({
            label: n,
            submenu: e.filter((i) => i.menu === n).map((i) => ({ label: i.name, run: i.run, shortcut: i.shortcut })),
          })),
        ];
      },
    },
    {
      label: "Help",
      items: () => [
        { label: "Keyboard Shortcuts", cmd: "help.shortcuts" },
        { label: "Extension SDK Documentation", cmd: "help.sdk" },
        "-",
        { label: "About BrushBoard", cmd: "help.about" },
      ],
    },
  ];
}
const ff =
  ke +
  ja +
  $r +
  `
uniform sampler2D u_base;
uniform sampler2D u_src;
uniform mat3 u_inv;
uniform int u_quality;
uniform int u_hasBase;
uniform int u_ss;      // supersampling grid (1 = off) for steep perspective
uniform float u_shade; // lighting multiplier (1 = none)
uniform int u_hide;    // 1 = layer is facing away and hidden
out vec4 o;
vec4 fetchSrc(vec2 fc){
  vec3 hq = u_inv * vec3(fc, 1.0);
  if(hq.z <= 0.0) return vec4(0.0);
  vec2 q = hq.xy / hq.z;
  if(u_quality == 0){ ivec2 sz = textureSize(u_src, 0); ivec2 i = ivec2(floor(q)); return (i.x < 0 || i.y < 0 || i.x >= sz.x || i.y >= sz.y) ? vec4(0.0) : texelFetch(u_src, i, 0); }
  if(u_quality == 1) return sampleBilinear(u_src, q, false);
  return sampleBicubic(u_src, q);
}
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 b = u_hasBase == 1 ? texelFetch(u_base, p, 0) : vec4(0.0);
  vec4 s = vec4(0.0);
  if(u_hide == 0){
    if(u_ss <= 1) s = fetchSrc(gl_FragCoord.xy);
    else {
      // average premultiplied samples so transparent edges do not darken
      vec4 acc = vec4(0.0); float n = float(u_ss);
      for(int j = 0; j < 4; j++){ if(j >= u_ss) break;
        for(int i = 0; i < 4; i++){ if(i >= u_ss) break;
          vec2 off = (vec2(float(i), float(j)) + 0.5) / n - 0.5;
          vec4 t = fetchSrc(gl_FragCoord.xy + off);
          acc += vec4(t.rgb * t.a, t.a);
        } }
      acc /= n * n;
      s = acc.a > 1e-6 ? vec4(acc.rgb / acc.a, acc.a) : vec4(0.0);
    }
    s.rgb *= u_shade;
  }
  o = composeOver(b, s.rgb, s.a, 0, gl_FragCoord.xy);
}`;
function mn(s, e, t, n, i = null) {
  const a = e.format === "r16f" ? s.newMaskTex(i ? i[0] : 1) : s.newLayerTex();
  i && e.format !== "r16f" && g.clear(a, null, i);
  const o = ae({ x: -t, y: -n, w: e.w, h: e.h }, e.w, e.h);
  return (o.w > 0 && o.h > 0 && g.copy(e, a, o, o.x + t, o.y + n), a);
}
function vr(s) {
  if (s.kind === "group") {
    const e = [],
      t = (n) =>
        n.forEach((i) => {
          (i.tex && (i.kind === "raster" || i.kind === "text" || i.kind === "shape") && e.push(i), t(i.children));
        });
    return (t(s.children), e);
  }
  return s.tex ? [s] : [];
}
class gn {
  constructor(e, t, n = !1) {
    if (((this.doc = e), (this.layer = t), !t.tex)) throw new B("Nothing to transform on this layer.");
    if (t.lockPosition || t.lockPixels) throw new B(`"${t.name}" is locked.`);
    this.textLayer = t.kind === "text";
    const i = t.tex,
      a = i.format;
    ((this.src = g.acquireLike(i, a)), (this.preview = g.acquireLike(i, a)));
    let o;
    (e.selection && t.kind !== "shape"
      ? (g.draw(g.program("cutSel", en), this.src, {
          textures: { u_src: i, u_sel: e.selection },
          uniforms: { u_keepInside: 1 },
        }),
        (this.base = g.acquireLike(i, a)),
        n
          ? g.copy(i, this.base)
          : g.draw(g.program("cutSel", en), this.base, {
              textures: { u_src: i, u_sel: e.selection },
              uniforms: { u_keepInside: 0 },
            }),
        (this.sel = g.acquire(i.w, i.h, "r16f")),
        g.copy(e.selection, this.sel),
        (o = at(e)))
      : (g.copy(i, this.src), n && ((this.base = g.acquireLike(i, a)), g.copy(i, this.base)), (o = ks(i))),
      o || (o = { x: 0, y: 0, w: e.width, h: e.height }),
      (this.quad0 = [
        [o.x, o.y],
        [o.x + o.w, o.y],
        [o.x + o.w, o.y + o.h],
        [o.x, o.y + o.h],
      ]),
      (this.quad = this.quad0.map((r) => [...r])),
      e.preview.set(t.id, { tex: this.preview }),
      this.update());
  }
  src;
  base = null;
  sel = null;
  preview;
  quad0;
  quad;
  quality = 2;
  customMatrix = null;
  ss = 1;
  shade = 1;
  hidden = !1;
  textLayer;
  get matrix() {
    return this.customMatrix ?? Pl(this.quad0, this.quad);
  }
  isIntegerTranslate() {
    if (this.customMatrix) return !1;
    const e = this.quad[0][0] - this.quad0[0][0],
      t = this.quad[0][1] - this.quad0[0][1];
    return (
      this.quad.every(
        (n, i) => Math.abs(n[0] - this.quad0[i][0] - e) < 1e-6 && Math.abs(n[1] - this.quad0[i][1] - t) < 1e-6,
      ) &&
      Number.isInteger(e) &&
      Number.isInteger(t)
    );
  }
  update() {
    const e = bi(this.matrix);
    (g.draw(g.program("transformOver", ff), this.preview, {
      textures: { u_base: this.base, u_src: this.src },
      uniforms: {
        u_inv: nn(e),
        u_quality: this.isIntegerTranslate() ? 0 : this.quality,
        u_hasBase: this.base ? 1 : 0,
        u_ss: this.ss,
        u_shade: this.shade,
        u_hide: this.hidden ? 1 : 0,
      },
    }),
      this.doc.invalidate());
  }
  commit(e = "Free Transform") {
    const t = this.doc,
      n = this.layer;
    if (
      !(!!this.customMatrix || this.quad.some((l, c) => l[0] !== this.quad0[c][0] || l[1] !== this.quad0[c][1])) &&
      !this.base
    ) {
      (this.dispose(), t.invalidate());
      return;
    }
    const a = this.quad[0][0] - this.quad0[0][0],
      o = this.quad[0][1] - this.quad0[0][1],
      r = this.isIntegerTranslate();
    (t.transact(e, () => {
      const l = t.newLayerTex();
      if (
        (g.copy(this.preview, l),
        (n.tex = l),
        n.version++,
        this.textLayer &&
          n.text &&
          (r
            ? ((n.text.x += a), (n.text.y += o), n.text.path && (n.text.path = qs(n.text.path, a, o)))
            : n.text.path
              ? ((n.text.path = Rt(n.text.path, this.matrix)), _t(t, n))
              : ((n.kind = "raster"), (n.text = void 0))),
        n.shape && ((n.shape.path = Rt(n.shape.path, this.matrix)), je(t, n)),
        n.vmask && !this.sel && ((n.vmask = Rt(n.vmask, this.matrix)), xt(t, n)),
        this.sel)
      ) {
        const c = t.newSelTex(),
          u = bi(this.matrix);
        (g.draw(g.program("transform", qr), c, {
          textures: { u_src: this.sel },
          uniforms: { u_inv: nn(u), u_quality: r ? 0 : 1, u_srcOrigin: [0, 0] },
        }),
          t.setSelection(c));
      }
      r && n.mask && !this.sel && (n.mask = mn(t, n.mask, a, o, [1]));
    }),
      this.dispose());
  }
  cancel() {
    (this.dispose(), this.doc.invalidate());
  }
  dispose() {
    (this.doc.preview.delete(this.layer.id),
      g.release(this.src),
      g.release(this.base),
      g.release(this.sel),
      g.release(this.preview));
  }
}
class _u {
  id = "move";
  name = "Move Tool";
  icon = R.move;
  shortcut = "V";
  group = "move";
  cursor = "move";
  session = null;
  offsetDrag = null;
  start = [0, 0];
  options() {
    return p(
      "div",
      { class: "opts" },
      $("Auto-Select Layer", h.setting("move.autoSelect", !1), (e) => h.set("move.autoSelect", e)),
      N(),
      $("Show Transform Controls", h.setting("move.showBounds", !0), (e) => {
        (h.set("move.showBounds", e), k.emit("render"));
      }),
      N(),
      p(
        "span",
        { class: "opt-hint" },
        "Drag a handle to resize (Shift keeps the shape) · Alt-drag duplicates · Arrows nudge 1px (Shift = 10px) · Ctrl+T free transform",
      ),
    );
  }
  pickLayer(e) {
    const t = h.doc,
      n = Math.floor(e.x),
      i = Math.floor(e.y);
    if (n < 0 || i < 0 || n >= t.width || i >= t.height) return null;
    for (const a of t.all()) {
      if (!a.visible || !a.tex || a.kind === "group") continue;
      if (g.read8(a.tex, { x: n, y: i, w: 1, h: 1 })[3] > 10) return a;
    }
    return null;
  }
  down(e) {
    if (this.handleAt(e) >= 0) {
      const T = h.tools.get("transform");
      (T.begin("move"), T.down(e), (this.fwd = T));
      return;
    }
    const t = h.doc;
    if (h.setting("move.autoSelect", !1) || e.ctrl) {
      const a = this.pickLayer(e);
      a && t.setActive(a.id);
    }
    let n = t.active;
    if (!n) return;
    if (n.kind === "adjustment")
      throw new Error("Adjustment layers cannot be moved (move their mask from the Layers panel).");
    if (n.lockPosition) throw new Error(`"${n.name}" is position-locked.`);
    if (((this.start = [e.x, e.y]), t.selection && n.tex)) {
      this.session = new gn(t, n, e.alt);
      return;
    }
    e.alt && (Oi(t, n), (n = t.active));
    const i = vr(n);
    i.length && (this.offsetDrag = { layers: i, start: [e.x, e.y], d: [0, 0] });
  }
  move(e) {
    if (this.fwd) {
      this.fwd.move(e);
      return;
    }
    let t = Math.round(e.x - this.start[0]),
      n = Math.round(e.y - this.start[1]);
    if ((e.shift && (Math.abs(t) > Math.abs(n) ? (n = 0) : (t = 0)), this.session))
      ((this.session.quad = this.session.quad0.map(([i, a]) => [i + t, a + n])), this.session.update());
    else if (this.offsetDrag) {
      const i = h.doc;
      this.offsetDrag.d = [t, n];
      for (const a of this.offsetDrag.layers) i.preview.set(a.id, { tex: a.tex, offset: [t, n] });
      i.invalidate();
    }
  }
  up() {
    if (this.fwd) {
      const T = this.fwd;
      ((this.fwd = null),
        T.up(),
        T.session && (T.session.commit("Resize Layer"), (T.session = null)),
        h.tool === T && h.setTool(T.prevTool || "move"),
        h.doc?.invalidate());
      return;
    }
    const e = h.doc;
    if ((this.session && (this.session.commit("Move"), (this.session = null)), this.offsetDrag)) {
      const { layers: t, d: n } = this.offsetDrag;
      this.offsetDrag = null;
      for (const i of t) e.preview.delete(i.id);
      ((n[0] || n[1]) && $a(e, t, n[0], n[1]), e.invalidate());
    }
  }
  key(e, t) {
    if (!t || !h.doc) return !1;
    const i = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!i || e.ctrlKey) return !1;
    const a = e.shiftKey ? 10 : 1,
      o = h.doc,
      r = o.active;
    if (!r || r.lockPosition) return !0;
    if (o.selection && r.tex) {
      const l = new gn(o, r);
      ((l.quad = l.quad0.map(([c, u]) => [c + i[0] * a, u + i[1] * a])), l.update(), l.commit("Nudge"));
    } else $a(o, vr(r), i[0] * a, i[1] * a, "Nudge");
    return !0;
  }
  overlay(e, t) {
    if (this.session) vn(e, t, this.session.quad, !1);
    else if (h.setting("move.showBounds", !0) && h.doc?.active?.tex) {
      const n = mf(h.doc.active);
      n &&
        vn(
          e,
          t,
          [
            [n.x, n.y],
            [n.x + n.w, n.y],
            [n.x + n.w, n.y + n.h],
            [n.x, n.y + n.h],
          ],
          !h.doc.active.lockPosition,
        );
    }
  }
  handleAt(e) {
    const t = h.doc?.active;
    if (
      !h.setting("move.showBounds", !0) ||
      !t ||
      !t.tex ||
      t.lockPosition ||
      t.kind === "group" ||
      t.kind === "adjustment" ||
      e.sx == null
    )
      return -1;
    const n = mf(t);
    if (!n) return -1;
    const i = L.xf(),
      a = Mu([
        [n.x, n.y],
        [n.x + n.w, n.y],
        [n.x + n.w, n.y + n.h],
        [n.x, n.y + n.h],
      ]).map(([o, r]) => i.docToScreen(o, r));
    for (let o = 0; o < a.length; o++) if (Math.hypot(a[o][0] - e.sx, a[o][1] - e.sy) < 9) return o;
    return -1;
  }
  cursorFor(e) {
    const t = this.handleAt(e);
    return t < 0
      ? null
      : t % 4 === 0
        ? "nwse-resize"
        : t % 4 === 2
          ? "nesw-resize"
          : t === 1 || t === 5
            ? "ns-resize"
            : "ew-resize";
  }
  commit() {
    this.up();
  }
  cancel() {
    if ((this.session?.cancel(), (this.session = null), this.offsetDrag)) {
      for (const e of this.offsetDrag.layers) h.doc?.preview.delete(e.id);
      this.offsetDrag = null;
    }
  }
}
const yr = new WeakMap();
function mf(s) {
  const e = yr.get(s);
  if (e && e.v === s.version) return e.b;
  const t = s.tex ? ks(s.tex) : null;
  return (yr.set(s, { v: s.version, b: t }), t);
}
function $a(s, e, t, n, i = "Move") {
  s.transact(i, () => {
    for (const a of e)
      a.tex &&
        ((a.tex = mn(s, a.tex, t, n)),
        a.mask && (a.mask = mn(s, a.mask, t, n, [1])),
        a.text && ((a.text.x += t), (a.text.y += n), a.text.path && (a.text.path = qs(a.text.path, t, n))),
        a.shape && ((a.shape.path = qs(a.shape.path, t, n)), je(s, a)),
        a.vmask && ((a.vmask = qs(a.vmask, t, n)), xt(s, a)),
        a.version++);
  });
}
function vn(s, e, t, n) {
  const i = t.map(([r, l]) => e.docToScreen(r, l));
  if (
    (s.beginPath(),
    i.forEach(([r, l], c) => (c ? s.lineTo(r, l) : s.moveTo(r, l))),
    s.closePath(),
    (s.lineWidth = 3),
    (s.strokeStyle = "rgba(0,0,0,.45)"),
    s.stroke(),
    (s.lineWidth = 1),
    (s.strokeStyle = "#8fb4dc"),
    s.stroke(),
    !n)
  )
    return;
  const a = Mu(t).map(([r, l]) => e.docToScreen(r, l));
  for (const [r, l] of a)
    ((s.fillStyle = "#fff"),
      (s.strokeStyle = "#2b3036"),
      (s.lineWidth = 1),
      s.fillRect(r - 4, l - 4, 8, 8),
      s.strokeRect(r - 4.5, l - 4.5, 9, 9));
  const o = e.docToScreen(...Ze(t));
  (s.beginPath(),
    s.arc(o[0], o[1], 4, 0, Math.PI * 2),
    (s.strokeStyle = "#fff"),
    s.stroke(),
    s.beginPath(),
    s.moveTo(o[0] - 6, o[1]),
    s.lineTo(o[0] + 6, o[1]),
    s.moveTo(o[0], o[1] - 6),
    s.lineTo(o[0], o[1] + 6),
    s.stroke());
}
const $n = (s, e) => [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
function Mu(s) {
  return [s[0], $n(s[0], s[1]), s[1], $n(s[1], s[2]), s[2], $n(s[2], s[3]), s[3], $n(s[3], s[0])];
}
function Ze(s) {
  return [(s[0][0] + s[1][0] + s[2][0] + s[3][0]) / 4, (s[0][1] + s[1][1] + s[2][1] + s[3][1]) / 4];
}
class Su {
  id = "transform";
  name = "Free Transform";
  icon = R.move;
  group = "_hidden";
  session = null;
  prevTool = "move";
  drag = null;
  begin(e) {
    const t = h.doc,
      n = t.active;
    if (!n) throw new B("No layer selected.");
    if (n.kind === "group" || n.kind === "adjustment") throw new B("Select a pixel layer to transform.");
    ((this.prevTool = e === "transform" ? "move" : e), (this.session = new gn(t, n)), h.setTool("transform"));
  }
  options() {
    const e = this.session,
      t = p("div", { class: "opts" });
    if (!e) return t;
    const n = e.quad,
      i = e.quad0,
      a = Math.hypot(i[1][0] - i[0][0], i[1][1] - i[0][1]),
      o = Math.hypot(i[3][0] - i[0][0], i[3][1] - i[0][1]),
      r = Math.hypot(n[1][0] - n[0][0], n[1][1] - n[0][1]),
      l = Math.hypot(n[3][0] - n[0][0], n[3][1] - n[0][1]),
      c = (Math.atan2(n[1][1] - n[0][1], n[1][0] - n[0][0]) * 180) / Math.PI,
      u = Ze(n),
      d = (f, m) => {
        const v = Ze(e.quad),
          y = Math.atan2(e.quad[1][1] - e.quad[0][1], e.quad[1][0] - e.quad[0][0]),
          b = f === null ? 1 : f / (r / a),
          x = m === null ? 1 : m / (l / o);
        ((e.quad = e.quad.map((w) => gf(w, v, y, b, x))), e.update(), k.emit("tool:options"));
      };
    return (
      t.append(
        H("X"),
        q({
          value: Math.round(u[0]),
          width: 52,
          onInput: () => {},
          onCommit: (f) => {
            const m = f - Ze(e.quad)[0];
            ((e.quad = e.quad.map(([v, y]) => [v + m, y])), e.update());
          },
        }),
        H("Y"),
        q({
          value: Math.round(u[1]),
          width: 52,
          onInput: () => {},
          onCommit: (f) => {
            const m = f - Ze(e.quad)[1];
            ((e.quad = e.quad.map(([v, y]) => [v, y + m])), e.update());
          },
        }),
        N(),
        H("W"),
        q({
          value: Math.round((r / a) * 1e3) / 10,
          unit: "%",
          width: 50,
          step: 0.1,
          onInput: () => {},
          onCommit: (f) => d(f / 100, null),
        }),
        H("H"),
        q({
          value: Math.round((l / o) * 1e3) / 10,
          unit: "%",
          width: 50,
          step: 0.1,
          onInput: () => {},
          onCommit: (f) => d(null, f / 100),
        }),
        N(),
        H("∠"),
        q({
          value: Math.round(c * 10) / 10,
          unit: "°",
          width: 50,
          step: 0.1,
          onInput: () => {},
          onCommit: (f) => {
            const m = Ze(e.quad),
              v = ((f - c) * Math.PI) / 180;
            ((e.quad = e.quad.map((y) => ns(y, m, v))), e.update(), k.emit("tool:options"));
          },
        }),
        N(),
        H("Interpolation"),
        O(
          [
            { value: 2, label: "Bicubic" },
            { value: 1, label: "Bilinear" },
            { value: 0, label: "Nearest Neighbor" },
          ],
          e.quality,
          (f) => {
            ((e.quality = f), e.update());
          },
        ),
        N(),
        p("button", { class: "btn small", onclick: () => this.cancel() }, "Cancel"),
        p("button", { class: "btn small primary", onclick: () => this.commit() }, "✓ Commit"),
        p("span", { class: "opt-hint" }, "Shift: proportional/snap · Alt: from center · Ctrl-drag corner: distort"),
      ),
      t
    );
  }
  hit(e) {
    const t = this.session,
      n = L.xf(),
      i = Mu(t.quad).map(([a, o]) => n.docToScreen(a, o));
    for (let a = 0; a < i.length; a++)
      if (Math.hypot(i[a][0] - e.sx, i[a][1] - e.sy) < 8)
        return { kind: e.ctrl && a % 2 === 0 ? "corner" : "scale", handle: a };
    return Po([e.x, e.y], t.quad) ? { kind: "move", handle: -1 } : { kind: "rotate", handle: -1 };
  }
  cursorFor(e) {
    if (!this.session) return null;
    const t = this.hit(e).kind;
    return t === "move" ? "move" : t === "rotate" ? "alias" : t === "corner" ? "crosshair" : "nwse-resize";
  }
  down(e) {
    if (!this.session) return;
    const { kind: t, handle: n } = this.hit(e),
      i = Ze(this.session.quad);
    this.drag = {
      kind: t,
      handle: n,
      start: [e.x, e.y],
      quad0: this.session.quad.map((a) => [...a]),
      angle0: Math.atan2(e.y - i[1], e.x - i[0]),
    };
  }
  move(e) {
    const t = this.drag,
      n = this.session;
    if (!t || !n) return;
    const i = t.quad0,
      a = e.x - t.start[0],
      o = e.y - t.start[1];
    if (t.kind === "move") n.quad = i.map(([r, l]) => [r + a, l + o]);
    else if (t.kind === "rotate") {
      const r = Ze(i);
      let l = Math.atan2(e.y - r[1], e.x - r[0]) - t.angle0;
      (e.shift && (l = Math.round(l / (Math.PI / 12)) * (Math.PI / 12)), (n.quad = i.map((c) => ns(c, r, l))));
    } else if (t.kind === "corner") {
      n.quad = i.map((l) => [...l]);
      const r = t.handle / 2;
      n.quad[r] = [i[r][0] + a, i[r][1] + o];
    } else {
      const r = Math.atan2(i[1][1] - i[0][1], i[1][0] - i[0][0]),
        l = (C) => ns(C, [0, 0], -r),
        c = i.map(l),
        u = Math.min(...c.map((C) => C[0])),
        d = Math.max(...c.map((C) => C[0])),
        f = Math.min(...c.map((C) => C[1])),
        m = Math.max(...c.map((C) => C[1])),
        v = l([e.x, e.y]),
        y = t.handle,
        b = y === 0 || y === 6 || y === 7 ? -1 : y === 2 || y === 3 || y === 4 ? 1 : 0,
        x = y === 0 || y === 1 || y === 2 ? -1 : y === 4 || y === 5 || y === 6 ? 1 : 0,
        w = e.alt ? (u + d) / 2 : b < 0 ? d : u,
        _ = e.alt ? (f + m) / 2 : x < 0 ? m : f;
      let M = 1,
        T = 1;
      if (b) {
        const C = b < 0 ? u : d;
        M = (v[0] - w) / (C - w || 1e-6);
      }
      if (x) {
        const C = x < 0 ? f : m;
        T = (v[1] - _) / (C - _ || 1e-6);
      }
      if (e.shift && b && x) {
        const C = Math.abs(M) > Math.abs(T) ? M : T;
        ((M = Math.sign(M || 1) * Math.abs(C)), (T = Math.sign(T || 1) * Math.abs(C)));
      }
      n.quad = c.map(([C, A]) => ns([w + (C - w) * M, _ + (A - _) * T], [0, 0], r));
    }
    (n.update(), k.emit("tool:options:soft"));
  }
  up() {
    ((this.drag = null), k.emit("tool:options"));
  }
  dblclick() {
    this.commit();
  }
  key(e, t) {
    return t ? (e.key === "Enter" ? (this.commit(), !0) : e.key === "Escape" ? (this.cancel(), !0) : !1) : !1;
  }
  overlay(e, t) {
    this.session && vn(e, t, this.session.quad, !0);
  }
  commit() {
    const e = this.session;
    ((this.session = null), e && e.commit("Free Transform"), h.tool === this && h.setTool(this.prevTool));
  }
  cancel() {
    const e = this.session;
    ((this.session = null), e?.cancel(), h.tool === this && h.setTool(this.prevTool));
  }
  deactivate() {
    this.session && this.commit();
  }
}
// ============================================================================================================
// Marionette: puppet warp. Pins on a triangle mesh laid over the layer's shape; drag them and the picture bends
// like a puppet. As-rigid-as-possible solver (Igarashi, Moscovich & Hughes 2005), drawn on the GPU with the
// engine's premultiplied bicubic sampling. Modes: Rigid / Normal / Distort; mesh density; expansion; pin depth
// for overlapping parts; rotation around a pin (auto or a fixed angle). The pins and the original pixels are kept
// with the layer (and in .brb files), so a warp can be reopened and changed later.
// ============================================================================================================
const MRN_CELLS = { fewer: 28, normal: 44, more: 64 }; // mesh cells along the shape's longer side
const MRN_W = 1000; // pin weight (pins are near-hard constraints)
const MRN_EPS = 1e-6; // keeps unpinned pieces where they are

/** Symmetric positive-definite band matrix with Cholesky factorisation (row-major band storage). */
class MrnBand {
  constructor(n, b) {
    this.n = n;
    this.b = b;
    this.a = new Float64Array(n * (b + 1));
    this.L = null;
  }
  add(i, j, v) {
    if (j > i) {
      const t = i;
      i = j;
      j = t;
    }
    this.a[i * (this.b + 1) + (i - j)] += v;
  }
  factor() {
    const n = this.n,
      b = this.b,
      w = b + 1,
      a = this.a,
      L = new Float64Array(n * w);
    for (let i = 0; i < n; i++) {
      const j0 = Math.max(0, i - b);
      for (let j = j0; j <= i; j++) {
        let s = a[i * w + (i - j)];
        for (let kk = Math.max(j0, j - b); kk < j; kk++) s -= L[i * w + (i - kk)] * L[j * w + (j - kk)];
        if (i === j) L[i * w] = Math.sqrt(Math.max(s, 1e-14));
        else L[i * w + (i - j)] = s / L[j * w];
      }
    }
    this.L = L;
    return this;
  }
  solve(rhs) {
    const n = this.n,
      b = this.b,
      w = b + 1,
      L = this.L,
      y = Float64Array.from(rhs);
    for (let i = 0; i < n; i++) {
      let s = y[i];
      for (let kk = Math.max(0, i - b); kk < i; kk++) s -= L[i * w + (i - kk)] * y[kk];
      y[i] = s / L[i * w];
    }
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      const e = Math.min(n - 1, i + b);
      for (let kk = i + 1; kk <= e; kk++) s -= L[kk * w + (kk - i)] * y[kk];
      y[i] = s / L[i * w];
    }
    return y;
  }
}

/** Triangle mesh over the occupied area. occ: coarse occupancy (ow×oh, one cell = f document pixels at ox,oy). */
function mrnBuildMesh(occ, ow, oh, ox, oy, f, density, expansion) {
  let bx0 = ow,
    by0 = oh,
    bx1 = -1,
    by1 = -1;
  for (let y = 0; y < oh; y++)
    for (let x = 0; x < ow; x++)
      if (occ[y * ow + x]) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
  if (bx1 < 0) return null;
  const X0 = ox + bx0 * f,
    Y0 = oy + by0 * f,
    X1 = ox + (bx1 + 1) * f,
    Y1 = oy + (by1 + 1) * f;
  const cs = Math.max(3, Math.max(X1 - X0, Y1 - Y0) / (MRN_CELLS[density] || MRN_CELLS.normal));
  // the mesh reaches `pad` past the shape: the user's expansion plus the bicubic filter's reach, so edges keep
  // their smoothing
  const pad = Math.max(0, expansion) + 3;
  const gx0 = X0 - pad - 1,
    gy0 = Y0 - pad - 1;
  const cols = Math.max(1, Math.ceil((X1 - X0 + 2 * pad + 2) / cs)),
    rows = Math.max(1, Math.ceil((Y1 - Y0 + 2 * pad + 2) / cs));
  // prefix sums of the occupancy, for "is anything within pad of this cell?"
  const P = new Int32Array((ow + 1) * (oh + 1));
  for (let y = 0; y < oh; y++) {
    let r = 0;
    for (let x = 0; x < ow; x++) {
      r += occ[y * ow + x] ? 1 : 0;
      P[(y + 1) * (ow + 1) + x + 1] = P[y * (ow + 1) + x + 1] + r;
    }
  }
  const any = (x0, y0, x1, y1) => {
    let a0 = Math.max(0, Math.floor((x0 - ox) / f)),
      b0 = Math.max(0, Math.floor((y0 - oy) / f)),
      a1 = Math.min(ow, Math.ceil((x1 - ox) / f)),
      b1 = Math.min(oh, Math.ceil((y1 - oy) / f));
    if (a1 <= a0 || b1 <= b0) return !1;
    return P[b1 * (ow + 1) + a1] - P[b0 * (ow + 1) + a1] - P[b1 * (ow + 1) + a0] + P[b0 * (ow + 1) + a0] > 0;
  };
  const inCell = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = gx0 + i * cs,
        y = gy0 + j * cs;
      inCell[j * cols + i] = any(x - pad, y - pad, x + cs + pad, y + cs + pad) ? 1 : 0;
    }
  const vid = new Int32Array((cols + 1) * (rows + 1)).fill(-1);
  const used = (i, j) =>
    (i > 0 && j > 0 && inCell[(j - 1) * cols + i - 1]) ||
    (i < cols && j > 0 && inCell[(j - 1) * cols + i]) ||
    (i > 0 && j < rows && inCell[j * cols + i - 1]) ||
    (i < cols && j < rows && inCell[j * cols + i]);
  const rest = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++)
      if (used(i, j)) {
        vid[j * (cols + 1) + i] = rest.length / 2;
        rest.push(gx0 + i * cs, gy0 + j * cs);
      }
  const tris = [],
    cellTri = new Int32Array(cols * rows).fill(-1);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      if (!inCell[j * cols + i]) continue;
      const a = vid[j * (cols + 1) + i],
        b = vid[j * (cols + 1) + i + 1],
        c = vid[(j + 1) * (cols + 1) + i],
        d = vid[(j + 1) * (cols + 1) + i + 1];
      cellTri[j * cols + i] = tris.length / 3;
      if ((i + j) & 1) tris.push(a, b, d, a, d, c);
      else tris.push(a, b, c, b, d, c);
    }
  const n = rest.length / 2,
    T = Int32Array.from(tris);
  // connected pieces (separate islands move independently)
  const par = Int32Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    for (; par[x] !== x; x = par[x]) par[x] = par[par[x]];
    return x;
  };
  for (let t = 0; t < T.length; t += 3) {
    const a = find(T[t]),
      b = find(T[t + 1]),
      c = find(T[t + 2]);
    par[b] = a;
    par[find(c)] = a;
  }
  const comp = new Int32Array(n);
  for (let i = 0; i < n; i++) comp[i] = find(i);
  let band = 1;
  for (let t = 0; t < T.length; t += 3)
    for (let e = 0; e < 3; e++) band = Math.max(band, Math.abs(T[t + e] - T[t + ((e + 1) % 3)]));
  return { cs, gx0, gy0, cols, rows, rest: Float64Array.from(rest), tris: T, cellTri, comp, n, band };
}

/** Barycentric coordinates of p in triangle (a,b,c) or null. */
function mrnBary(px, py, ax, ay, bx, by, cx, cy, tol = 1e-6) {
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(d) < 1e-12) return null;
  const l0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d,
    l1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d,
    l2 = 1 - l0 - l1;
  return l0 >= -tol && l1 >= -tol && l2 >= -tol ? [l0, l1, l2] : null;
}

/** Where a rest-space point lies in the mesh: {tri, w:[3]} or null. */
function mrnLocateRest(M, x, y) {
  const i = Math.floor((x - M.gx0) / M.cs),
    j = Math.floor((y - M.gy0) / M.cs);
  if (i < 0 || j < 0 || i >= M.cols || j >= M.rows) return null;
  const t0 = M.cellTri[j * M.cols + i];
  if (t0 < 0) return null;
  for (const t of [t0, t0 + 1]) {
    const a = M.tris[t * 3],
      b = M.tris[t * 3 + 1],
      c = M.tris[t * 3 + 2],
      R = M.rest;
    const w = mrnBary(x, y, R[a * 2], R[a * 2 + 1], R[b * 2], R[b * 2 + 1], R[c * 2], R[c * 2 + 1], 1e-4);
    if (w) return { tri: t, w };
  }
  return null;
}

/** As-rigid-as-possible solver for one mesh and one set of constraints. */
class MrnSolver {
  constructor(M) {
    this.M = M;
    const T = M.tris,
      R = M.rest;
    // step 1: each vertex in the local frame of the opposite edge
    this.loc = new Float64Array((T.length / 3) * 6);
    for (let t = 0, q = 0; t < T.length; t += 3)
      for (let e = 0; e < 3; e++, q += 2) {
        const i = T[t + e],
          j = T[t + ((e + 1) % 3)],
          k = T[t + ((e + 2) % 3)];
        const dx = R[j * 2] - R[i * 2],
          dy = R[j * 2 + 1] - R[i * 2 + 1],
          vx = R[k * 2] - R[i * 2],
          vy = R[k * 2 + 1] - R[i * 2 + 1],
          L2 = dx * dx + dy * dy || 1;
        this.loc[q] = (vx * dx + vy * dy) / L2;
        this.loc[q + 1] = (vx * -dy + vy * dx) / L2;
      }
    this.cons = [];
  }
  /** cons: [{tri, w:[3]}] (targets are passed to solve) */
  setConstraints(cons) {
    const M = this.M,
      T = M.tris,
      n = M.n;
    this.cons = cons;
    const G = new MrnBand(2 * n, 2 * M.band + 1),
      H = new MrnBand(n, M.band);
    for (let t = 0, q = 0; t < T.length; t += 3)
      for (let e = 0; e < 3; e++, q += 2) {
        const i = T[t + e],
          j = T[t + ((e + 1) % 3)],
          k = T[t + ((e + 2) % 3)],
          x = this.loc[q],
          y = this.loc[q + 1];
        const idx = [2 * i, 2 * i + 1, 2 * j, 2 * j + 1, 2 * k, 2 * k + 1];
        for (const row of [
          [x - 1, -y, -x, y, 1, 0],
          [y, x - 1, -y, -x, 0, 1],
        ])
          for (let a = 0; a < 6; a++) {
            if (!row[a]) continue;
            for (let b = 0; b <= a; b++) if (row[b]) G.add(idx[a], idx[b], row[a] * row[b] * (a === b ? 1 : 1));
          }
        // step 2: edge (i,j) of the fitted triangle
        H.add(i, i, 1);
        H.add(j, j, 1);
        H.add(i, j, -1);
      }
    // G.add on (a,b) with a>b is added once but stands for both (a,b) and (b,a): the loop above visits each
    // unordered pair once for b<a and the diagonal once, which is exactly AᵀA's lower triangle.
    for (const c of cons) {
      const v = [T[c.tri * 3], T[c.tri * 3 + 1], T[c.tri * 3 + 2]];
      for (let a = 0; a < 3; a++)
        for (let b = 0; b <= a; b++) {
          const w = MRN_W * c.w[a] * c.w[b] * (a === b ? 1 : 1);
          if (a === b) {
            G.add(2 * v[a], 2 * v[a], w);
            G.add(2 * v[a] + 1, 2 * v[a] + 1, w);
            H.add(v[a], v[a], w);
          } else {
            G.add(2 * v[a], 2 * v[b], w);
            G.add(2 * v[a] + 1, 2 * v[b] + 1, w);
            H.add(v[a], v[b], w);
          }
        }
    }
    for (let i = 0; i < 2 * n; i++) G.add(i, i, MRN_EPS);
    for (let i = 0; i < n; i++) H.add(i, i, MRN_EPS);
    this.G = G.factor();
    this.H = H.factor();
  }
  /** targets: [[x,y]] per constraint. mode: 'rigid' | 'normal' | 'distort'. Returns positions (2n). */
  solve(targets, mode) {
    const M = this.M,
      T = M.tris,
      R = M.rest,
      n = M.n,
      cons = this.cons;
    // pieces with pins follow their pins' average move; pieces without stay put
    const sum = new Map();
    cons.forEach((c, ci) => {
      const v0 = T[c.tri * 3],
        id = M.comp[v0];
      let rx = 0,
        ry = 0;
      for (let a = 0; a < 3; a++) {
        rx += c.w[a] * R[T[c.tri * 3 + a] * 2];
        ry += c.w[a] * R[T[c.tri * 3 + a] * 2 + 1];
      }
      const s = sum.get(id) || [0, 0, 0];
      s[0] += targets[ci][0] - rx;
      s[1] += targets[ci][1] - ry;
      s[2]++;
      sum.set(id, s);
    });
    const disp = (i) => {
      const s = sum.get(M.comp[i]);
      return s ? [s[0] / s[2], s[1] / s[2]] : [0, 0];
    };
    const r1 = new Float64Array(2 * n),
      rx = new Float64Array(n),
      ry = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const d = disp(i);
      r1[2 * i] = MRN_EPS * (R[2 * i] + d[0]);
      r1[2 * i + 1] = MRN_EPS * (R[2 * i + 1] + d[1]);
      rx[i] = MRN_EPS * (R[2 * i] + d[0]);
      ry[i] = MRN_EPS * (R[2 * i + 1] + d[1]);
    }
    cons.forEach((c, ci) => {
      for (let a = 0; a < 3; a++) {
        const v = T[c.tri * 3 + a],
          w = MRN_W * c.w[a];
        r1[2 * v] += w * targets[ci][0];
        r1[2 * v + 1] += w * targets[ci][1];
        rx[v] += w * targets[ci][0];
        ry[v] += w * targets[ci][1];
      }
    });
    const s1 = this.G.solve(r1);
    if (mode === "distort") return s1;
    // step 2: fit each triangle's rest shape to step 1 (rotation, plus some of the scale in Normal) and
    // stitch the fitted triangles back together
    const kexp = mode === "normal" ? 0.5 : 0;
    for (let t = 0; t < T.length; t += 3) {
      const v = [T[t], T[t + 1], T[t + 2]];
      const pcx = (R[v[0] * 2] + R[v[1] * 2] + R[v[2] * 2]) / 3,
        pcy = (R[v[0] * 2 + 1] + R[v[1] * 2 + 1] + R[v[2] * 2 + 1]) / 3,
        qcx = (s1[v[0] * 2] + s1[v[1] * 2] + s1[v[2] * 2]) / 3,
        qcy = (s1[v[0] * 2 + 1] + s1[v[1] * 2 + 1] + s1[v[2] * 2 + 1]) / 3;
      let c = 0,
        d = 0,
        aa = 0;
      const A = [],
        Bq = [];
      for (let m = 0; m < 3; m++) {
        const ax = R[v[m] * 2] - pcx,
          ay = R[v[m] * 2 + 1] - pcy,
          bx = s1[v[m] * 2] - qcx,
          by = s1[v[m] * 2 + 1] - qcy;
        A.push([ax, ay]);
        Bq.push([bx, by]);
        c += ax * bx + ay * by;
        d += ax * by - ay * bx;
        aa += ax * ax + ay * ay;
      }
      c /= aa || 1;
      d /= aa || 1;
      const sc = Math.hypot(c, d) || 1,
        th = Math.atan2(d, c),
        k = Math.pow(sc, kexp),
        cs = Math.cos(th) * k,
        sn = Math.sin(th) * k;
      const F = A.map(([x, y]) => [cs * x - sn * y, sn * x + cs * y]);
      for (let e = 0; e < 3; e++) {
        const i = v[e],
          j = v[(e + 1) % 3],
          ex = F[e][0] - F[(e + 1) % 3][0],
          ey = F[e][1] - F[(e + 1) % 3][1];
        rx[i] += ex;
        ry[i] += ey;
        rx[j] -= ex;
        ry[j] -= ey;
      }
    }
    const X = this.H.solve(rx),
      Y = this.H.solve(ry),
      out = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
      out[2 * i] = X[i];
      out[2 * i + 1] = Y[i];
    }
    return out;
  }
}

const MRN_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_pos;
layout(location = 1) in vec2 a_rest;
uniform vec2 u_size;
out vec2 v_rest;
void main(){
  v_rest = a_rest;
  gl_Position = vec4(a_pos / u_size * 2.0 - 1.0, 0.0, 1.0);
}`;
const MRN_FS =
  ke +
  ja +
  $r +
  `
uniform sampler2D u_src;
in vec2 v_rest;
out vec4 o;
void main(){
  vec4 c = sampleBicubic(u_src, v_rest);
  o = vec4(c.rgb * c.a, c.a);          // premultiplied, drawn back to front with "over"
}`;
const MRN_COMPOSE =
  ke +
  ja +
  $r +
  `
uniform sampler2D u_acc;
uniform sampler2D u_base;
uniform int u_hasBase;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(u_acc, p, 0);
  vec4 b = u_hasBase == 1 ? texelFetch(u_base, p, 0) : vec4(0.0);
  vec4 s = a.a > 1e-6 ? vec4(a.rgb / a.a, min(a.a, 1.0)) : vec4(0.0);
  o = composeOver(b, s.rgb, s.a, 0, gl_FragCoord.xy);
}`;

/** a warp can be reopened while the layer still holds the very texture Marionette made and nothing has painted
 *  into it since (painting goes through history patches, which mark the texture) */
function mrnValid(l) {
  const m = l.marionette;
  return !!(m && l.marionetteSrc && !l.marionetteSrc.disposed && l.tex && m.tex === l.tex && !l.tex.mrnTouched);
}
class MrnSession {
  constructor(doc, layer) {
    if (!layer.tex) throw new B("There's nothing on this layer to warp.");
    if (layer.lockPosition || layer.lockPixels) throw new B(`"${layer.name}" is locked.`);
    this.doc = doc;
    this.layer = layer;
    const i = layer.tex;
    this.src = g.acquireLike(i, i.format);
    this.preview = g.acquireLike(i, i.format);
    this.acc = g.acquireLike(i, i.format);
    this.base = null;
    this.original = null; // the layer's earlier un-warped pixels, when reopening a warp
    const m = layer.marionette;
    this.reopened = mrnValid(layer) && !doc.selection;
    if (this.reopened) {
      g.copy(layer.marionetteSrc, this.src);
      this.original = layer.marionetteSrc;
      this.mode = m.mode;
      this.density = m.density;
      this.expansion = m.expansion;
    } else if (doc.selection) {
      g.draw(g.program("cutSel", en), this.src, { textures: { u_src: i, u_sel: doc.selection }, uniforms: { u_keepInside: 1 } });
      this.base = g.acquireLike(i, i.format);
      g.draw(g.program("cutSel", en), this.base, { textures: { u_src: i, u_sel: doc.selection }, uniforms: { u_keepInside: 0 } });
    } else g.copy(i, this.src);
    if (!this.reopened) {
      this.mode = h.setting("marionette.mode", "normal");
      this.density = h.setting("marionette.density", "normal");
      this.expansion = h.setting("marionette.expansion", 2);
    }
    this.showMesh = h.setting("marionette.showMesh", !0);
    this.pins = [];
    this.selected = new Set();
    this.readShape();
    this.remesh();
    if (!this.M) {
      this.dispose();
      throw new B("There's nothing on this layer to warp.");
    }
    if (this.reopened)
      for (const p0 of m.pins) {
        const at = mrnLocateRest(this.M, p0.rx, p0.ry);
        at && this.pins.push({ rx: p0.rx, ry: p0.ry, x: p0.x, y: p0.y, depth: p0.depth || 0, angle: p0.angle ?? null, at });
      }
    const G = g.gl;
    this.vao = G.createVertexArray();
    this.vbo = G.createBuffer();
    G.bindVertexArray(this.vao);
    G.bindBuffer(G.ARRAY_BUFFER, this.vbo);
    G.enableVertexAttribArray(0);
    G.vertexAttribPointer(0, 2, G.FLOAT, !1, 16, 0);
    G.enableVertexAttribArray(1);
    G.vertexAttribPointer(1, 2, G.FLOAT, !1, 16, 8);
    G.bindVertexArray(null);
    G.bindBuffer(G.ARRAY_BUFFER, null);
    doc.preview.set(layer.id, { tex: this.preview });
    this.rebuild();
  }
  /** coarse occupancy of the pixels being warped */
  readShape() {
    const d = this.doc,
      b = ks(this.src);
    if (!b) {
      this.shape = null;
      return;
    }
    const f = Math.max(1, Math.ceil(Math.max(b.w, b.h) / 640)),
      ow = Math.ceil(b.w / f),
      oh = Math.ceil(b.h / f),
      px = g.read8(this.src, b),
      occ = new Uint8Array(ow * oh);
    for (let y = 0; y < b.h; y++) {
      const row = y * b.w * 4,
        oy = ((y / f) | 0) * ow;
      for (let x = 0; x < b.w; x++) if (px[row + x * 4 + 3] > 3) occ[oy + ((x / f) | 0)] = 1;
    }
    this.shape = { occ, ow, oh, ox: b.x, oy: b.y, f };
  }
  remesh() {
    const s = this.shape;
    this.M = s ? mrnBuildMesh(s.occ, s.ow, s.oh, s.ox, s.oy, s.f, this.density, this.expansion) : null;
    if (!this.M) return;
    this.solver = new MrnSolver(this.M);
    this.pos = Float64Array.from(this.M.rest);
    for (const p0 of this.pins) p0.at = mrnLocateRest(this.M, p0.rx, p0.ry);
    this.pins = this.pins.filter((p0) => p0.at);
  }
  /** pins (and the helper points that hold a fixed rotation) changed: refactor the solver */
  rebuild() {
    const cons = [];
    this.aux = [];
    const r = this.M.cs * 1.5;
    for (const p0 of this.pins) {
      cons.push({ tri: p0.at.tri, w: p0.at.w });
      this.aux.push(null);
      if (p0.angle !== null)
        for (const [ox, oy] of [
          [r, 0],
          [0, r],
          [-r, 0],
          [0, -r],
        ]) {
          const at = mrnLocateRest(this.M, p0.rx + ox, p0.ry + oy);
          if (!at) continue;
          cons.push({ tri: at.tri, w: at.w });
          this.aux.push({ pin: p0, ox, oy });
        }
    }
    this.solver.setConstraints(cons);
    this.update();
  }
  targets() {
    const out = [];
    let pi = 0;
    for (const a of this.aux) {
      if (!a) {
        const p0 = this.pins[pi++];
        out.push([p0.x, p0.y]);
      } else {
        const c = Math.cos(a.pin.angle),
          s = Math.sin(a.pin.angle);
        out.push([a.pin.x + c * a.ox - s * a.oy, a.pin.y + s * a.ox + c * a.oy]);
      }
    }
    return out;
  }
  /** rotation of the warp at a pin right now (radians), from its triangle */
  angleAt(p0) {
    const T = this.M.tris,
      R = this.M.rest,
      P = this.pos,
      t = p0.at.tri * 3;
    let c = 0,
      d = 0;
    const v = [T[t], T[t + 1], T[t + 2]];
    const m = (A, i) => (A[v[0] * 2 + i] + A[v[1] * 2 + i] + A[v[2] * 2 + i]) / 3;
    const pc = [m(R, 0), m(R, 1)],
      qc = [m(P, 0), m(P, 1)];
    for (const k0 of v) {
      const ax = R[k0 * 2] - pc[0],
        ay = R[k0 * 2 + 1] - pc[1],
        bx = P[k0 * 2] - qc[0],
        by = P[k0 * 2 + 1] - qc[1];
      c += ax * bx + ay * by;
      d += ax * by - ay * bx;
    }
    return Math.atan2(d, c);
  }
  update() {
    const M = this.M;
    this.pos = this.pins.length ? this.solver.solve(this.targets(), this.mode) : Float64Array.from(M.rest);
    // draw order: each triangle takes the depth of its nearest pin, deeper ones first
    const T = M.tris,
      R = M.rest,
      nt = T.length / 3,
      depth = new Float64Array(nt);
    if (this.pins.some((p0) => p0.depth))
      for (let t = 0; t < nt; t++) {
        const cx = (R[T[t * 3] * 2] + R[T[t * 3 + 1] * 2] + R[T[t * 3 + 2] * 2]) / 3,
          cy = (R[T[t * 3] * 2 + 1] + R[T[t * 3 + 1] * 2 + 1] + R[T[t * 3 + 2] * 2 + 1]) / 3,
          comp = M.comp[T[t * 3]];
        let best = 1 / 0,
          dep = 0;
        for (const p0 of this.pins) {
          if (M.comp[T[p0.at.tri * 3]] !== comp) continue;
          const dd = (p0.rx - cx) ** 2 + (p0.ry - cy) ** 2;
          dd < best && ((best = dd), (dep = p0.depth));
        }
        depth[t] = dep;
      }
    const order = Array.from({ length: nt }, (_, i) => i).sort((a, b) => depth[a] - depth[b] || a - b);
    const data = new Float32Array(nt * 12),
      P = this.pos;
    let o = 0;
    for (const t of order)
      for (let e = 0; e < 3; e++) {
        const v = T[t * 3 + e];
        data[o++] = P[v * 2];
        data[o++] = P[v * 2 + 1];
        data[o++] = R[v * 2];
        data[o++] = R[v * 2 + 1];
      }
    const G = g.gl;
    G.bindBuffer(G.ARRAY_BUFFER, this.vbo);
    G.bufferData(G.ARRAY_BUFFER, data, G.DYNAMIC_DRAW);
    G.bindBuffer(G.ARRAY_BUFFER, null);
    g.draw(g.program("marionetteMesh", MRN_FS, MRN_VS), this.acc, {
      textures: { u_src: this.src },
      uniforms: { u_size: [this.src.w, this.src.h] },
      vao: this.vao,
      count: nt * 3,
      blend: "over",
      clear: [0, 0, 0, 0],
    });
    g.draw(g.program("marionetteCompose", MRN_COMPOSE), this.preview, {
      textures: { u_acc: this.acc, u_base: this.base },
      uniforms: { u_hasBase: this.base ? 1 : 0 },
    });
    this.doc.invalidate();
    k.emit("render");
  }
  /** a point on the warped picture → the same point on the unwarped one, or null if it's off the mesh */
  toRest(x, y) {
    const T = this.M.tris,
      P = this.pos,
      R = this.M.rest;
    for (let t = T.length / 3 - 1; t >= 0; t--) {
      const a = T[t * 3],
        b = T[t * 3 + 1],
        c = T[t * 3 + 2];
      const w = mrnBary(x, y, P[a * 2], P[a * 2 + 1], P[b * 2], P[b * 2 + 1], P[c * 2], P[c * 2 + 1]);
      if (w) return [w[0] * R[a * 2] + w[1] * R[b * 2] + w[2] * R[c * 2], w[0] * R[a * 2 + 1] + w[1] * R[b * 2 + 1] + w[2] * R[c * 2 + 1]];
    }
    return null;
  }
  commit() {
    const d = this.doc,
      n = this.layer;
    if (!this.pins.length || this.pins.every((p0) => Math.abs(p0.x - p0.rx) < 1e-3 && Math.abs(p0.y - p0.ry) < 1e-3 && p0.angle === null)) {
      this.dispose();
      d.invalidate();
      return !1;
    }
    d.transact("Marionette", () => {
      const t = d.newLayerTex();
      g.copy(this.preview, t);
      let orig = this.original;
      if (!orig && !this.base) {
        orig = d.newLayerTex();
        g.copy(this.src, orig);
      }
      n.tex = t;
      n.version++;
      if (n.kind === "text" || n.kind === "shape") ((n.kind = "raster"), (n.text = void 0), (n.shape = void 0));
      if (orig) {
        n.marionetteSrc = orig;
        n.marionette = {
          tex: t,
          mode: this.mode,
          density: this.density,
          expansion: this.expansion,
          pins: this.pins.map((p0) => ({ rx: p0.rx, ry: p0.ry, x: p0.x, y: p0.y, depth: p0.depth, angle: p0.angle })),
        };
      } else ((n.marionette = void 0), (n.marionetteSrc = void 0));
    });
    this.dispose();
    return !0;
  }
  cancel() {
    this.dispose();
    this.doc.invalidate();
  }
  dispose() {
    this.doc.preview.delete(this.layer.id);
    g.release(this.src);
    g.release(this.base);
    g.release(this.acc);
    g.release(this.preview);
    const G = g.gl;
    this.vao && G.deleteVertexArray(this.vao);
    this.vbo && G.deleteBuffer(this.vbo);
    this.vao = this.vbo = null;
  }
}

const MRN_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h16"/><path d="M8 3v4M16 3v4M12 3v6"/><circle cx="12" cy="11" r="2"/><path d="M12 13v5M12 15l-4-3M12 15l4-3M12 18l-3 4M12 18l3 4"/><path d="M8 7l-1 5M16 7l1 5"/></svg>';

class MrnTool {
  id = "marionette";
  name = "Marionette";
  icon = MRN_ICON;
  group = "_hidden";
  cursor = "crosshair";
  session = null;
  prevTool = "move";
  drag = null;
  hover = null;
  begin(e) {
    const t = h.doc,
      n = t?.active;
    if (!n) throw new B("No layer selected.");
    if (n.kind === "group" || n.kind === "adjustment") throw new B("Select a pixel layer for Marionette.");
    this.prevTool = e === "marionette" ? "move" : e;
    this.session = new MrnSession(t, n);
    h.setTool("marionette");
    h.status(
      this.session.reopened
        ? "Marionette: the pins are where you left them. Drag one to keep warping."
        : "Marionette: click to add pins, then drag them. Alt-click removes a pin.",
    );
  }
  set(key, v, remesh = !1) {
    const s = this.session;
    if (!s) return;
    s[key] = v;
    h.set("marionette." + key, v);
    remesh ? (s.remesh(), s.rebuild()) : key === "mode" ? s.update() : k.emit("render");
    k.emit("tool:options");
  }
  options() {
    const s = this.session,
      t = p("div", { class: "opts" });
    if (!s) return t;
    const one = s.selected.size === 1 ? [...s.selected][0] : null;
    const pinBtn = (label, title, fn, dis) =>
      p("button", { class: "btn small", title, disabled: dis, onclick: () => (fn(), k.emit("tool:options")) }, label);
    t.append(
      H("Mode"),
      is(
        [
          { value: "rigid", label: "Rigid", title: "Parts keep their shape and size, like stiff card" },
          { value: "normal", label: "Normal", title: "Parts bend and stretch a little" },
          { value: "distort", label: "Distort", title: "Parts stretch and grow freely" },
        ],
        s.mode,
        (v) => this.set("mode", v),
      ),
      N(),
      H("Density"),
      O(
        [
          { value: "fewer", label: "Fewer Points" },
          { value: "normal", label: "Normal" },
          { value: "more", label: "More Points" },
        ],
        s.density,
        (v) => this.set("density", v, !0),
      ),
      H("Expansion"),
      q({ value: s.expansion, min: -20, max: 100, unit: "px", width: 40, onInput: () => {}, onCommit: (v) => this.set("expansion", v, !0) }),
      $("Show Mesh", s.showMesh, (v) => {
        s.showMesh = v;
        h.set("marionette.showMesh", v);
        k.emit("render");
      }),
      N(),
      H("Pin Depth"),
      pinBtn(
        "⬆",
        "Bring forward: the part around the selected pins goes in front where parts overlap",
        () => {
          for (const p0 of s.selected) p0.depth++;
          s.update();
        },
        !s.selected.size,
      ),
      pinBtn(
        "⬇",
        "Send backward: the part around the selected pins goes behind",
        () => {
          for (const p0 of s.selected) p0.depth--;
          s.update();
        },
        !s.selected.size,
      ),
      H("Rotate"),
      O(
        [
          { value: "auto", label: "Auto" },
          { value: "fixed", label: "Fixed" },
        ],
        one && one.angle !== null ? "fixed" : "auto",
        (v) => {
          if (!one) return;
          one.angle = v === "fixed" ? s.angleAt(one) : null;
          s.rebuild();
          k.emit("tool:options");
        },
      ),
      q({
        value: one && one.angle !== null ? Math.round(((one.angle * 180) / Math.PI) * 10) / 10 : 0,
        min: -360,
        max: 360,
        unit: "°",
        width: 46,
        step: 0.1,
        onInput: () => {},
        onCommit: (v) => {
          if (!one) return;
          const fresh = one.angle === null;
          one.angle = (v * Math.PI) / 180;
          fresh ? s.rebuild() : s.update();
          k.emit("tool:options");
        },
      }),
      N(),
      p(
        "button",
        {
          class: "btn small",
          title: "Remove all pins",
          disabled: !s.pins.length,
          onclick: () => {
            s.pins = [];
            s.selected.clear();
            s.rebuild();
            k.emit("tool:options");
          },
        },
        "Remove All Pins",
      ),
      p("button", { class: "btn small", onclick: () => this.cancel() }, "Cancel"),
      p("button", { class: "btn small primary", onclick: () => this.commit() }, "✓ Commit"),
      p("span", { class: "opt-hint" }, "Click: add pin · Shift: select several · Alt-click: remove · Alt-drag beside a pin: rotate"),
    );
    return t;
  }
  pinAt(e) {
    const s = this.session,
      xf = L.xf();
    let best = null,
      bd = 9;
    for (const p0 of s.pins) {
      const [x, y] = xf.docToScreen(p0.x, p0.y),
        d = Math.hypot(x - e.sx, y - e.sy);
      d < bd && ((bd = d), (best = p0));
    }
    return best;
  }
  /** a selected pin whose rotation ring is under the pointer (Alt held) */
  ringAt(e) {
    const s = this.session,
      xf = L.xf();
    for (const p0 of s.selected) {
      const [x, y] = xf.docToScreen(p0.x, p0.y),
        d = Math.hypot(x - e.sx, y - e.sy);
      if (d > 10 && d < 70) return p0;
    }
    if (s.selected.size === 0) {
      const p0 = this.pinNear(e, 70);
      if (p0) return p0;
    }
    return null;
  }
  pinNear(e, r) {
    const xf = L.xf();
    let best = null,
      bd = r;
    for (const p0 of this.session.pins) {
      const [x, y] = xf.docToScreen(p0.x, p0.y),
        d = Math.hypot(x - e.sx, y - e.sy);
      d < bd && d > 10 && ((bd = d), (best = p0));
    }
    return best;
  }
  cursorFor(e) {
    const s = this.session;
    if (!s) return null;
    if (this.pinAt(e)) return e.alt ? "not-allowed" : "move";
    if (e.alt && this.ringAt(e)) return "alias";
    return s.toRest(e.x, e.y) ? "crosshair" : "default";
  }
  down(e) {
    const s = this.session;
    if (!s || e.button === 2) return;
    const pin = this.pinAt(e);
    if (e.alt && pin) {
      s.pins = s.pins.filter((p0) => p0 !== pin);
      s.selected.delete(pin);
      s.rebuild();
      k.emit("tool:options");
      return;
    }
    if (e.alt) {
      const ring = this.ringAt(e);
      if (ring) {
        const fresh = ring.angle === null;
        fresh && (ring.angle = s.angleAt(ring));
        s.selected = new Set([ring]);
        fresh && s.rebuild();
        this.drag = { kind: "rotate", pin: ring, a0: ring.angle, m0: Math.atan2(e.y - ring.y, e.x - ring.x) };
        k.emit("tool:options");
        return;
      }
    }
    if (pin) {
      e.shift ? (s.selected.has(pin) ? s.selected.delete(pin) : s.selected.add(pin)) : s.selected.has(pin) || (s.selected = new Set([pin]));
      this.drag = { kind: "move", start: [e.x, e.y], from: [...s.selected].map((p0) => [p0, p0.x, p0.y]) };
      k.emit("tool:options");
      k.emit("render");
      return;
    }
    const r = s.toRest(e.x, e.y),
      at = r && mrnLocateRest(s.M, r[0], r[1]);
    if (!at) {
      h.status("Marionette: pins go on the layer's picture (inside the mesh).");
      return;
    }
    const np = { rx: r[0], ry: r[1], x: e.x, y: e.y, depth: 0, angle: null, at };
    s.pins.push(np);
    s.selected = e.shift ? new Set([...s.selected, np]) : new Set([np]);
    s.rebuild();
    this.drag = { kind: "move", start: [e.x, e.y], from: [[np, np.x, np.y]] };
    k.emit("tool:options");
  }
  move(e) {
    const s = this.session,
      d = this.drag;
    if (!s || !d) return;
    if (d.kind === "move") {
      const dx = e.x - d.start[0],
        dy = e.y - d.start[1];
      for (const [p0, x, y] of d.from) ((p0.x = x + dx), (p0.y = y + dy));
    } else {
      let a = d.a0 + Math.atan2(e.y - d.pin.y, e.x - d.pin.x) - d.m0;
      e.shift && (a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12));
      d.pin.angle = a;
    }
    s.update();
    k.emit("tool:options:soft");
  }
  up() {
    this.drag && ((this.drag = null), k.emit("tool:options"));
  }
  key(e, t) {
    if (!t || !this.session) return !1;
    if (e.key === "Enter") return (this.commit(), !0);
    if (e.key === "Escape") return (this.cancel(), !0);
    if ((e.key === "Delete" || e.key === "Backspace") && this.session.selected.size) {
      const s = this.session;
      s.pins = s.pins.filter((p0) => !s.selected.has(p0));
      s.selected.clear();
      s.rebuild();
      k.emit("tool:options");
      return !0;
    }
    return !1;
  }
  overlay(c, xf) {
    const s = this.session;
    if (!s) return;
    const M = s.M,
      T = M.tris,
      P = s.pos;
    if (s.showMesh) {
      c.save();
      c.beginPath();
      for (let t = 0; t < T.length; t += 3)
        for (let e = 0; e < 3; e++) {
          const a = T[t + e],
            b = T[t + ((e + 1) % 3)];
          const [x0, y0] = xf.docToScreen(P[a * 2], P[a * 2 + 1]),
            [x1, y1] = xf.docToScreen(P[b * 2], P[b * 2 + 1]);
          c.moveTo(x0, y0);
          c.lineTo(x1, y1);
        }
      c.lineWidth = 1;
      c.strokeStyle = "rgba(0,0,0,.28)";
      c.stroke();
      c.lineWidth = 0.6;
      c.strokeStyle = "rgba(255,255,255,.55)";
      c.stroke();
      c.restore();
    }
    for (const p0 of s.pins) {
      const [x, y] = xf.docToScreen(p0.x, p0.y),
        sel = s.selected.has(p0);
      if (sel && p0.angle !== null) {
        c.beginPath();
        c.arc(x, y, 34, 0, Math.PI * 2);
        c.setLineDash([4, 4]);
        c.lineWidth = 1;
        c.strokeStyle = "rgba(255,255,255,.9)";
        c.stroke();
        c.setLineDash([]);
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(p0.angle) * 34, y + Math.sin(p0.angle) * 34);
        c.stroke();
        c.font = "11px system-ui, sans-serif";
        c.fillStyle = "#fff";
        c.strokeStyle = "rgba(0,0,0,.6)";
        c.lineWidth = 3;
        const label = `${Math.round((p0.angle * 180) / Math.PI)}°`;
        c.strokeText(label, x + 38, y - 6);
        c.fillText(label, x + 38, y - 6);
      }
      c.beginPath();
      c.arc(x, y, 5.5, 0, Math.PI * 2);
      c.fillStyle = "#ffd21f";
      c.fill();
      c.lineWidth = 1.2;
      c.strokeStyle = "#1d1d1d";
      c.stroke();
      if (sel) {
        c.beginPath();
        c.arc(x, y, 2.2, 0, Math.PI * 2);
        c.fillStyle = "#1d1d1d";
        c.fill();
      }
      if (p0.depth) {
        c.font = "10px system-ui, sans-serif";
        c.fillStyle = "#ffd21f";
        c.fillText(p0.depth > 0 ? `+${p0.depth}` : String(p0.depth), x + 7, y + 13);
      }
    }
  }
  commit() {
    const s = this.session;
    this.session = null;
    s && s.commit() && h.status("Marionette applied. Edit › Marionette on this layer reopens the pins.");
    h.tool === this && h.setTool(this.prevTool);
  }
  cancel() {
    const s = this.session;
    this.session = null;
    s?.cancel();
    h.tool === this && h.setTool(this.prevTool);
  }
  deactivate() {
    this.session && this.commit();
  }
}
// ===================================================== end Marionette =====================================================

function ns(s, e, t) {
  const n = Math.cos(t),
    i = Math.sin(t),
    a = s[0] - e[0],
    o = s[1] - e[1];
  return [e[0] + n * a - i * o, e[1] + i * a + n * o];
}
function gf(s, e, t, n, i) {
  const a = ns(s, e, -t);
  return ns([e[0] + (a[0] - e[0]) * n, e[1] + (a[1] - e[1]) * i], e, t);
}
function Po(s, e) {
  let t = !1;
  for (let n = 0, i = 3; n < 4; i = n++) {
    const [a, o] = e[n],
      [r, l] = e[i];
    o > s[1] != l > s[1] && s[0] < ((r - a) * (s[1] - o)) / (l - o) + a && (t = !t);
  }
  return t;
}
const vf = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        FreeTransformTool: Su,
        MoveTool: _u,
        TransformSession: gn,
        applyOffset: $a,
        center: Ze,
        drawQuad: vn,
        insideQuad: Po,
        shiftTex: mn,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  ti = { rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, tz: 0, scale: 1, cam: 1.5, light: 0, hideBack: !1 },
  qa = [
    { id: "floor", label: "Lay flat (floor)", p: { rx: 62, ry: 0, rz: 0 } },
    { id: "ceiling", label: "Ceiling", p: { rx: -62, ry: 0, rz: 0 } },
    { id: "wallL", label: "Wall, left", p: { rx: 0, ry: -55, rz: 0 } },
    { id: "wallR", label: "Wall, right", p: { rx: 0, ry: 55, rz: 0 } },
    { id: "tiltBack", label: "Lean back", p: { rx: 25, ry: 0, rz: 0 } },
    { id: "card", label: "Tilted card", p: { rx: 18, ry: -28, rz: -6 } },
    { id: "flip", label: "Flip over (back)", p: { rx: 0, ry: 180, rz: 0 } },
  ],
  si = Math.PI / 180;
function vt(s, e, t) {
  const [n, i, a] = [-s * si, e * si, t * si],
    o = Math.cos(n),
    r = Math.sin(n),
    l = Math.cos(i),
    c = Math.sin(i),
    u = Math.cos(a),
    d = Math.sin(a);
  return [u * l, u * c * r - d * o, u * c * o + d * r, d * l, d * c * r + u * o, d * c * o - u * r, -c, l * r, l * o];
}
function br(s, e) {
  return [
    s[0] * e[0] + s[1] * e[1] + s[2] * e[2],
    s[3] * e[0] + s[4] * e[1] + s[5] * e[2],
    s[6] * e[0] + s[7] * e[1] + s[8] * e[2],
  ];
}
function Tu(s) {
  const e = s.map((a) => a[0]),
    t = s.map((a) => a[1]),
    n = Math.max(...e) - Math.min(...e),
    i = Math.max(...t) - Math.min(...t);
  return {
    cx: (Math.min(...e) + Math.max(...e)) / 2,
    cy: (Math.min(...t) + Math.max(...t)) / 2,
    diag: Math.max(1, Math.hypot(n, i)),
  };
}
function ni(s, e, t) {
  const n = s.diag * e.cam,
    i = n + e.tz + t[2];
  return i <= n * 0.02 ? null : [s.cx + e.tx + (n * t[0]) / i, s.cy + e.ty + (n * t[1]) / i];
}
function Pu(s, e) {
  const t = vt(e.rx, e.ry, e.rz),
    n = e.scale,
    i = s.diag * e.cam,
    a = s.cx + e.tx,
    o = s.cy + e.ty,
    r = [n * t[6], n * t[7], i + e.tz],
    l = [i * n * t[0] + a * r[0], i * n * t[1] + a * r[1], a * r[2]],
    c = [i * n * t[3] + o * r[0], i * n * t[4] + o * r[1], o * r[2]],
    u = (d) => [d[0], d[1], d[2] - d[0] * s.cx - d[1] * s.cy];
  return [...u(l), ...u(c), ...u(r)];
}
function Cu(s) {
  return vt(s.rx, s.ry, s.rz)[8] > 0;
}
function yf(s, e) {
  const t =
    s[0] * (s[4] * s[8] - s[5] * s[7]) - s[1] * (s[3] * s[8] - s[5] * s[6]) + s[2] * (s[3] * s[7] - s[4] * s[6]);
  let n = 1 / 0;
  for (const [i, a] of e) {
    const o = s[6] * i + s[7] * a + s[8];
    o > 0 && (n = Math.min(n, Math.abs(t) / (o * o * o)));
  }
  return n;
}
function ii(s, e, t, n = !1) {
  const i = Pu(e, t);
  s.customMatrix = i;
  const a = !t.rx && !t.ry && !t.rz && !t.tx && !t.ty && !t.tz && t.scale === 1;
  (a && (s.customMatrix = null),
    (s.quad = s.quad0.map(([l, c]) => {
      const u = i[6] * l + i[7] * c + i[8];
      return u > 0 ? [(i[0] * l + i[1] * c + i[2]) / u, (i[3] * l + i[4] * c + i[5]) / u] : [e.cx + t.tx, e.cy + t.ty];
    })),
    a && (s.quad = s.quad0.map((l) => [...l])));
  const o = vt(t.rx, t.ry, t.rz)[8];
  ((s.hidden = t.hideBack && o <= 0), (s.shade = 1 - t.light * (1 - Math.abs(o))));
  const r = yf(i, s.quad0);
  ((s.ss = r < 0.06 ? 4 : r < 0.15 ? 3 : r < 0.5 ? 2 : 1), n && (s.ss = Math.min(s.ss, 2)), s.update());
}
class Eu {
  id = "transform3d";
  name = "3D Transform Tool";
  group = "move";
  cursor = "grab";
  icon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8.5 13 5l6 3.5v8L11 20l-6-3.5z"/><path d="M5 8.5 11 12l8-3.5M11 12v8"/><ellipse cx="12" cy="12" rx="10" ry="3.2" opacity=".55" transform="rotate(-18 12 12)"/></svg>';
  session = null;
  p = { ...ti };
  fr = { cx: 0, cy: 0, diag: 1 };
  drag = null;
  hot = null;
  quality = 2;
  message = "";
  constructor() {}
  activate() {
    this.start(!1);
  }
  start(e = !0) {
    if (this.session) return !0;
    const t = h.doc,
      n = t?.active;
    this.message = "";
    try {
      if (!t) throw new Error("Open an image first.");
      if (!n || !n.tex || n.kind === "group" || n.kind === "adjustment")
        throw new Error("Select a pixel layer to turn in 3D.");
      ((this.session = new gn(t, n)),
        (this.session.quality = this.quality),
        (this.fr = Tu(this.session.quad0)),
        (this.p = {
          ...ti,
          cam: h.setting("t3d.cam", 1.5),
          light: h.setting("t3d.light", 0),
          hideBack: h.setting("t3d.hideBack", !1),
        }),
        ii(this.session, this.fr, this.p));
    } catch (i) {
      ((this.message = i?.message || String(i)), e && h.status(this.message));
    }
    return (k.emit("tool:options"), !!this.session);
  }
  set(e, t = !1) {
    (!this.session && !this.start()) ||
      (Object.assign(this.p, e),
      (this.p.scale = Math.max(0.01, this.p.scale)),
      (this.p.cam = Math.min(20, Math.max(0.25, this.p.cam))),
      (this.p.light = Math.min(1, Math.max(0, this.p.light))),
      this.session &&
        ((this.session.quality = t ? Math.min(this.quality, 1) : this.quality), ii(this.session, this.fr, this.p, t)),
      t || k.emit("tool:options:soft"));
  }
  options() {
    const e = p("div", { class: "opts" });
    if (!this.session)
      return (
        e.append(
          p("span", { class: "opt-hint" }, this.message || "Click the canvas to turn the active layer in 3D"),
          p("button", { class: "btn small primary", onclick: () => this.start() }, "Start"),
        ),
        e
      );
    const t = this.p,
      n = (i, a, o, r = 1, l = 1, c = 50, u = "") => [
        H(i),
        (() => {
          const d = q({
            value: Math.round(t[a] * r * 10) / 10,
            unit: o,
            width: c,
            step: l,
            onInput: (f) => this.set({ [a]: f / r }, !0),
            onCommit: (f) => {
              this.set({ [a]: f / r });
            },
          });
          return (u && (d.title = u), d);
        })(),
      ];
    return (
      e.append(
        ...n("X", "rx", "°", 1, 1, 50, "Tilt (rotate around the horizontal axis)"),
        ...n("Y", "ry", "°", 1, 1, 50, "Turn (rotate around the vertical axis)"),
        ...n("Z", "rz", "°", 1, 1, 50, "Roll (rotate in the picture plane)"),
        N(),
        ...n("Depth", "tz", "px", 1, 1, 58, "Push the layer away from (positive) or towards the camera"),
        ...n("Scale", "scale", "%", 100, 1, 52),
        ...n(
          "Perspective",
          "cam",
          "%",
          100,
          5,
          56,
          "Camera distance relative to the layer size — lower is a stronger, wide-angle perspective",
        ),
        N(),
        ...n("Light", "light", "%", 100, 5, 46, "Darken the layer as it turns away from the viewer"),
        $("Hide back", t.hideBack, (i) => {
          (h.set("t3d.hideBack", i), this.set({ hideBack: i }));
        }),
        N(),
        O([{ value: "", label: "Presets…" }, ...qa.map((i) => ({ value: i.id, label: i.label }))], "", (i) => {
          const a = qa.find((o) => o.id === i);
          a && (this.set(a.p), k.emit("tool:options"));
        }),
        H("Interpolation"),
        O(
          [
            { value: 2, label: "Bicubic" },
            { value: 1, label: "Bilinear" },
            { value: 0, label: "Nearest" },
          ],
          this.quality,
          (i) => {
            ((this.quality = i), this.set({}));
          },
        ),
        N(),
        p(
          "button",
          {
            class: "btn small",
            title: "Back to flat",
            onclick: () => {
              (this.set({ ...ti, cam: t.cam, light: t.light, hideBack: t.hideBack }), k.emit("tool:options"));
            },
          },
          "Reset",
        ),
        p("button", { class: "btn small", onclick: () => this.cancel() }, "Cancel"),
        p("button", { class: "btn small primary", onclick: () => this.commit() }, "✓ Commit"),
        p(
          "span",
          { class: "opt-hint" },
          "Drag: orbit · outside: roll · rings: one axis · Ctrl: move · Alt: depth · Shift: 15° steps",
        ),
      ),
      e
    );
  }
  ringRadius() {
    const e = this.session.quad0;
    return 0.38 * Math.min(Math.abs(e[1][0] - e[0][0]), Math.abs(e[3][1] - e[0][1])) * this.p.scale;
  }
  rings() {
    const e = this.ringRadius(),
      t = this.p,
      n = vt(0, t.ry, t.rz),
      i = vt(0, 0, t.rz),
      a = (o, r) => {
        const l = [];
        for (let c = 0; c <= 64; c++) l.push(ni(this.fr, t, br(o, r((c / 64) * Math.PI * 2))));
        return l;
      };
    return {
      ringX: a(n, (o) => [0, e * Math.cos(o), e * Math.sin(o)]),
      ringY: a(i, (o) => [e * Math.cos(o), 0, e * Math.sin(o)]),
      ringZ: a(vt(0, 0, 0), (o) => [e * Math.cos(o), e * Math.sin(o), 0]),
    };
  }
  hit(e) {
    if (e.ctrl) return "pan";
    if (e.alt) return "depth";
    const t = L.xf(),
      [n, i] = t.docToScreen(...this.centre());
    if (Math.hypot(e.sx - n, e.sy - i) < Math.max(14, this.ringRadius() * t.zoom * 0.3)) return "orbit";
    const a = this.rings();
    let o = null,
      r = 7;
    for (const l of ["ringZ", "ringX", "ringY"]) {
      const c = a[l];
      for (let u = 1; u < c.length; u++) {
        const d = c[u - 1],
          f = c[u];
        if (!d || !f) continue;
        const m = bf([e.sx, e.sy], t.docToScreen(...d), t.docToScreen(...f));
        m < r && ((r = m), (o = l));
      }
    }
    return o || (Po([e.x, e.y], this.session.quad) ? "orbit" : "roll");
  }
  cursorFor(e) {
    if (!this.session) return "pointer";
    const t = this.drag?.kind ?? this.hit(e);
    return t === "orbit"
      ? this.drag
        ? "grabbing"
        : "grab"
      : t === "pan"
        ? "move"
        : t === "depth"
          ? "ns-resize"
          : t === "roll"
            ? "alias"
            : "crosshair";
  }
  hover(e) {
    if (!this.session || this.drag) return;
    const t = this.hit(e);
    t !== this.hot && ((this.hot = t), k.emit("render"));
  }
  down(e) {
    if (!this.session) {
      this.start();
      return;
    }
    const t = this.centre();
    this.drag = {
      kind: this.hit(e),
      sx: e.sx,
      sy: e.sy,
      x: e.x,
      y: e.y,
      p0: { ...this.p },
      a0: Math.atan2(e.y - t[1], e.x - t[0]),
    };
  }
  centre() {
    return [this.fr.cx + this.p.tx, this.fr.cy + this.p.ty];
  }
  move(e) {
    const t = this.drag;
    if (!t || !this.session) return;
    const n = t.p0,
      i = e.sx - t.sx,
      a = e.sy - t.sy,
      o = (d) => (e.shift ? Math.round(d / 15) * 15 : Math.round(d * 10) / 10),
      r = 0.45,
      l = this.centre(),
      c = () => {
        const d = (Math.atan2(e.y - l[1], e.x - l[0]) - t.a0) / si;
        return o(n.rz + d);
      };
    let u = {};
    switch (t.kind) {
      case "orbit":
        u = { ry: o(n.ry - i * r), rx: o(n.rx - a * r) };
        break;
      case "ringX":
        u = { rx: o(n.rx - a * r) };
        break;
      case "ringY":
        u = { ry: o(n.ry - i * r) };
        break;
      case "roll":
      case "ringZ":
        u = { rz: c() };
        break;
      case "pan":
        u = { tx: Math.round(n.tx + e.x - t.x), ty: Math.round(n.ty + e.y - t.y) };
        break;
      case "depth":
        u = { tz: Math.round(n.tz + (e.y - t.y) * 2) };
        break;
    }
    (this.set(u, !0), k.emit("tool:options:soft"));
  }
  up() {
    this.drag && ((this.drag = null), this.set({}), k.emit("tool:options"));
  }
  dblclick() {
    this.commit();
  }
  key(e, t) {
    if (!t || !this.session) return !1;
    if (e.key === "Enter") return (this.commit(), !0);
    if (e.key === "Escape") return (this.cancel(), !0);
    const n = e.shiftKey ? 10 : 1;
    return e.key === "ArrowLeft"
      ? (this.set({ ry: this.p.ry - n }), k.emit("tool:options"), !0)
      : e.key === "ArrowRight"
        ? (this.set({ ry: this.p.ry + n }), k.emit("tool:options"), !0)
        : e.key === "ArrowUp"
          ? (this.set({ rx: this.p.rx + n }), k.emit("tool:options"), !0)
          : e.key === "ArrowDown"
            ? (this.set({ rx: this.p.rx - n }), k.emit("tool:options"), !0)
            : !1;
  }
  overlay(e, t) {
    const n = this.session;
    if (!n) return;
    vn(e, t, n.quad, !1);
    const i = this.rings(),
      a = { ringX: "#e5675a", ringY: "#6cc46a", ringZ: "#5aa2e5" },
      o = this.drag?.kind ?? this.hot;
    for (const u of ["ringX", "ringY", "ringZ"]) {
      e.beginPath();
      let d = !1;
      for (const f of i[u]) {
        if (!f) {
          d = !1;
          continue;
        }
        const [m, v] = t.docToScreen(...f);
        d ? e.lineTo(m, v) : (e.moveTo(m, v), (d = !0));
      }
      ((e.lineWidth = 4),
        (e.strokeStyle = "rgba(0,0,0,.35)"),
        e.stroke(),
        (e.lineWidth = o === u ? 3 : 1.6),
        (e.strokeStyle = a[u]),
        e.stroke());
    }
    const r = br(vt(this.p.rx, this.p.ry, this.p.rz), [0, 0, -this.ringRadius() * 0.6]),
      l = ni(this.fr, this.p, [0, 0, 0]),
      c = ni(this.fr, this.p, r);
    if (l && c) {
      const [u, d] = t.docToScreen(...l),
        [f, m] = t.docToScreen(...c);
      (e.beginPath(),
        e.moveTo(u, d),
        e.lineTo(f, m),
        (e.lineWidth = 3),
        (e.strokeStyle = "rgba(0,0,0,.4)"),
        e.stroke(),
        (e.lineWidth = 1.5),
        (e.strokeStyle = "#8fb4dc"),
        e.stroke(),
        e.beginPath(),
        e.arc(u, d, 3.5, 0, Math.PI * 2),
        (e.fillStyle = "#fff"),
        e.fill());
    }
    if (!Cu(this.p)) {
      const [u, d] = t.docToScreen(...this.centre());
      ((e.font = "11px system-ui, sans-serif"),
        (e.fillStyle = "#fff"),
        (e.textAlign = "center"),
        e.fillText(this.p.hideBack ? "back face (hidden)" : "back face", u, d - 10));
    }
  }
  commit() {
    const e = this.session;
    ((this.session = null),
      (this.drag = null),
      e && ((e.quality = this.quality), ii(e, this.fr, this.p), e.commit("3D Transform")),
      h.set("t3d.cam", this.p.cam),
      h.set("t3d.light", this.p.light),
      k.emit("tool:options"));
  }
  cancel() {
    const e = this.session;
    ((this.session = null), (this.drag = null), e?.cancel(), k.emit("tool:options"));
  }
  deactivate() {
    this.session && this.commit();
  }
}
function bf(s, e, t) {
  const n = t[0] - e[0],
    i = t[1] - e[1],
    a = Math.max(0, Math.min(1, ((s[0] - e[0]) * n + (s[1] - e[1]) * i) / (n * n + i * i || 1)));
  return Math.hypot(s[0] - e[0] - a * n, s[1] - e[1] - a * i);
}
const wf = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      DEFAULT_3D: ti,
      PRESETS_3D: qa,
      Transform3DTool: Eu,
      apply3D: ii,
      frameOf: Tu,
      frontFacing: Cu,
      matrix3D: Pu,
      project: ni,
      rotation: vt,
    },
    Symbol.toStringTag,
    { value: "Module" },
  ),
);
function xf() {
  const s = h.doc;
  if (!s) return [];
  const e = [],
    t = s.active;
  (t?.shape && e.push({ id: `shape:${t.id}`, name: `${t.name} Shape Path`, kind: "shape" }),
    t?.text?.path && e.push({ id: `text:${t.id}`, name: `${t.name} Type Path`, kind: "shape" }),
    t?.vmask && e.push({ id: `vmask:${t.id}`, name: `${t.name} Vector Mask`, kind: "vmask" }));
  for (const n of s.paths) e.push({ id: n.id, name: n.name, kind: "saved" });
  return (s.workPath && e.push({ id: "work", name: "Work Path", kind: "work" }), e);
}
function kf(s) {
  const e = h.doc,
    t = p("canvas", { class: "pthumb", width: 40, height: 30 }),
    n = t.getContext("2d");
  if (((n.fillStyle = "#eef0f2"), n.fillRect(0, 0, 40, 30), !s || Te(s))) return t;
  const i = Math.min(40 / e.width, 30 / e.height),
    a = (40 - e.width * i) / 2,
    o = (30 - e.height * i) / 2;
  ((n.fillStyle = "#9aa3ad"), n.beginPath());
  for (const r of s.subpaths)
    (Mt(r, 2 / i).forEach((c, u) => (u ? n.lineTo(a + c[0] * i, o + c[1] * i) : n.moveTo(a + c[0] * i, o + c[1] * i))),
      r.closed && n.closePath());
  return (
    n.fill(s.fillRule === "evenodd" ? "evenodd" : "nonzero"),
    (n.strokeStyle = "#2b3036"),
    (n.lineWidth = 1),
    n.stroke(),
    t
  );
}
function _f() {
  let s;
  const e = () => {
    if (!s) return;
    te(s);
    const t = h.doc;
    if (!t) {
      s.appendChild(p("div", { class: "empty-panel" }, "No document"));
      return;
    }
    const n = xf();
    n.length ||
      s.appendChild(
        p("div", { class: "empty-panel" }, "No paths. Draw one with the Pen (P) or a shape tool in Path mode."),
      );
    const i = t.activePath && t.pathExists(t.activePath) ? t.activePath : null;
    for (const a of n) {
      const o = Tn(t, a.id),
        r = p(
          "div",
          {
            class: "prow" + (i === a.id ? " on" : "") + (a.kind === "work" ? " work" : ""),
            title: a.kind === "work" ? "Temporary path — double-click to save it" : a.name,
          },
          kf(o?.get() || null),
          p("span", { class: "pname" }, a.name),
          a.kind === "shape"
            ? p("span", { class: "pkind", html: R.shapeLayer })
            : a.kind === "vmask"
              ? p("span", { class: "pkind", html: R.mask })
              : null,
        );
      (r.addEventListener("click", () => {
        ((t.activePath = a.id), e(), k.emit("render"));
      }),
        r.addEventListener("dblclick", async () => {
          if (a.kind === "work") {
            h.run("path.save");
            return;
          }
          if (a.kind === "saved") {
            const l = await ps("Rename Path", "Name", a.name);
            l &&
              t.transact("Rename Path", () => {
                const c = t.paths.find((u) => u.id === a.id);
                c && (c.name = l);
              });
          }
        }),
        r.addEventListener("contextmenu", (l) => {
          ((t.activePath = a.id),
            e(),
            Ft(l, [
              { label: "Make Selection", cmd: "path.toSelection" },
              { label: "Fill Path…", cmd: "path.fill" },
              { label: "Stroke Path…", cmd: "path.stroke" },
              "-",
              { label: "New Shape Layer from Path", cmd: "path.toShape" },
              { label: "Add as Vector Mask", cmd: "layer.vmaskFromPath" },
              "-",
              a.kind === "work"
                ? { label: "Save Path…", cmd: "path.save" }
                : { label: "Duplicate Path", cmd: "path.duplicate" },
              { label: "Export Path as SVG…", cmd: "path.exportSvg" },
              { label: "Delete Path", cmd: "path.delete" },
            ]));
        }),
        s.appendChild(r));
    }
  };
  return {
    id: "paths",
    title: "Paths",
    create() {
      ((s = p("div", { class: "plist" })),
        s.addEventListener("click", (n) => {
          n.target === s && h.doc && ((h.doc.activePath = null), e(), k.emit("render"));
        }));
      for (const n of ["doc:history", "doc:active", "doc:layers"]) k.on(n, e);
      e();
      const t = (n, i, a) => p("button", { class: "ibtn", title: n, html: i, onclick: () => h.run(a) });
      return p(
        "div",
        { class: "paths-panel" },
        s,
        p(
          "div",
          { class: "lp-bottom" },
          t(
            "Fill path with foreground colour",
            '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="7" fill="currentColor"/></svg>',
            "path.fillFg",
          ),
          t(
            "Stroke path with brush",
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/></svg>',
            "path.strokeBrush",
          ),
          t(
            "Load path as a selection (Ctrl+Enter)",
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2"><circle cx="12" cy="12" r="7"/></svg>',
            "path.toSelection",
          ),
          t(
            "Make work path from selection",
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 17C8 5 16 19 19 7" /><rect x="3.5" y="15.5" width="3" height="3"/><rect x="17.5" y="5.5" width="3" height="3"/></svg>',
            "path.fromSelection",
          ),
          t("Add vector mask from path", R.mask, "layer.vmaskFromPath"),
          t("New path", R.newLayer, "path.new"),
          t("Delete path", R.trash, "path.delete"),
        ),
      );
    },
    menu: () => [
      { label: "New Path…", run: () => h.run("path.new") },
      { label: "Save Path…", run: () => h.run("path.save") },
      { label: "Duplicate Path", run: () => h.run("path.duplicate") },
      { label: "Delete Path", run: () => h.run("path.delete") },
      { label: "Make Work Path…", run: () => h.run("path.fromSelection") },
      { label: "Make Selection…", run: () => h.run("path.toSelectionDlg") },
      { label: "Fill Path…", run: () => h.run("path.fill") },
      { label: "Stroke Path…", run: () => h.run("path.stroke") },
      { label: "Export Path as SVG…", run: () => h.run("path.exportSvg") },
    ],
  };
}
let Lu = () => null;
function Au(s) {
  Lu = s;
}
class Co {
  constructor(e, t, n = !1, i = null) {
    ((this.value = e),
      (this.onChange = t),
      (this.original = i),
      (this.hsv = pa(...e)),
      (this.ink = Lu()),
      (this.sv = p("canvas", { class: "cp-sv", width: 256, height: 256 })),
      (this.hue = p("canvas", { class: "cp-hue", width: 16, height: 256 })));
    const a = p("div", { class: "cp-fields" });
    n ||
      ((this.swNew = p("div", { class: "cp-sw-new" })),
      a.append(
        p(
          "div",
          { class: "cp-swatches" },
          p("span", null, "new"),
          this.swNew,
          p("div", { class: "cp-sw-old", style: { background: fe(i || e) }, onclick: () => i && this.set(i, !0) }),
          p("span", null, "current"),
        ),
      ));
    const o = (r, l, c, u = "") => {
      const d = q({ label: l, value: 0, min: 0, max: c, unit: u, width: 38, onInput: (f) => this.fromField(r, f) });
      return ((this.fields[r] = d), d);
    };
    (a.append(
      p(
        "div",
        { class: "cp-grid" },
        o("h", "H", 360, "°"),
        o("r", "R", 255),
        o("s", "S", 100, "%"),
        o("g", "G", 255),
        o("v", "B", 100, "%"),
        o("b", "B", 255),
      ),
    ),
      this.ink &&
        (a.append(
          p(
            "div",
            { class: "cp-grid cmyk" },
            o("c", "C", 100, "%"),
            o("m", "M", 100, "%"),
            o("y", "Y", 100, "%"),
            o("k", "K", 100, "%"),
          ),
        ),
        (this.gamut = p(
          "button",
          {
            class: "cp-gamut",
            title: "Out of the printable gamut — click for the closest printable colour",
            onclick: () => {
              const r = this.ink;
              this.set(Xs(r.toInk(this.value), r), !0);
            },
          },
          "⚠",
        )),
        a.append(this.gamut)),
      (this.hex = p("input", { class: "text hex", value: qe(e), maxlength: 7 })),
      this.hex.addEventListener("change", () => {
        const r = nt(this.hex.value);
        r && this.set(r, !0);
      }),
      this.hex.addEventListener("keydown", (r) => r.stopPropagation()),
      a.append(p("label", { class: "cp-hex" }, "#", this.hex)),
      (this.el = p("div", { class: "colorpicker" + (n ? " compact" : "") }, this.sv, this.hue, a)),
      this.bindDrag(this.sv, (r, l, c) => {
        ((this.hsv[1] = r), (this.hsv[2] = 1 - l), this.emit(c));
      }),
      this.bindDrag(this.hue, (r, l, c) => {
        ((this.hsv[0] = Math.min(0.9999, l)), this.emit(c));
      }),
      this.draw());
  }
  el;
  sv;
  hue;
  hsv;
  fields = {};
  hex;
  swNew;
  gamut = null;
  ink;
  bindDrag(e, t) {
    e.addEventListener("pointerdown", (n) => {
      e.setPointerCapture(n.pointerId);
      const i = (r, l) => {
        const c = e.getBoundingClientRect();
        t(
          Math.min(1, Math.max(0, (r.clientX - c.left) / c.width)),
          Math.min(1, Math.max(0, (r.clientY - c.top) / c.height)),
          l,
        );
      };
      i(n, !1);
      const a = (r) => i(r, !1),
        o = (r) => {
          (i(r, !0), e.removeEventListener("pointermove", a), e.removeEventListener("pointerup", o));
        };
      (e.addEventListener("pointermove", a), e.addEventListener("pointerup", o));
    });
  }
  fromField(e, t) {
    if ("hsv".includes(e) && e.length === 1 && ["h", "s", "v"].includes(e)) {
      const n = ["h", "s", "v"].indexOf(e);
      ((this.hsv[n] = e === "h" ? Math.min(0.9999, t / 360) : t / 100), this.emit(!0));
    } else if (["c", "m", "y", "k"].includes(e) && this.ink) {
      const n = this.inkValues();
      ((n[["c", "m", "y", "k"].indexOf(e)] = t / 100), this.set(Xs(n, this.ink), !0));
    } else {
      const n = [...this.value];
      ((n[["r", "g", "b"].indexOf(e)] = t / 255), this.set(n, !0));
    }
  }
  inkValues() {
    return [...(this.value.ink || this.ink.toInk(this.value))];
  }
  set(e, t = !1) {
    this.value = ri(e);
    const n = pa(...e);
    (n[1] > 0.001 && n[2] > 0.001 ? (this.hsv = n) : (this.hsv = [this.hsv[0], n[1], n[2]]),
      this.draw(),
      t && this.onChange(this.value, !0));
  }
  emit(e) {
    ((this.value = Ji(...this.hsv)), this.draw(), this.onChange(this.value, e));
  }
  draw() {
    const e = this.sv.getContext("2d"),
      [t, n, i] = this.hsv,
      a = Ji(t, 1, 1),
      o = e.createLinearGradient(0, 0, 256, 0);
    (o.addColorStop(0, "#fff"), o.addColorStop(1, fe(a)), (e.fillStyle = o), e.fillRect(0, 0, 256, 256));
    const r = e.createLinearGradient(0, 0, 0, 256);
    (r.addColorStop(0, "rgba(0,0,0,0)"),
      r.addColorStop(1, "#000"),
      (e.fillStyle = r),
      e.fillRect(0, 0, 256, 256),
      e.beginPath(),
      e.arc(n * 256, (1 - i) * 256, 6, 0, Math.PI * 2),
      (e.lineWidth = 2),
      (e.strokeStyle = i > 0.5 && n < 0.5 ? "#000" : "#fff"),
      e.stroke());
    const l = this.hue.getContext("2d"),
      c = l.createLinearGradient(0, 0, 0, 256);
    for (let d = 0; d <= 6; d++) c.addColorStop(d / 6, fe(Ji((d / 6) % 1, 1, 1)));
    ((l.fillStyle = c),
      l.fillRect(0, 0, 16, 256),
      (l.fillStyle = "#fff"),
      l.fillRect(0, t * 256 - 1.5, 16, 3),
      (l.strokeStyle = "#000"),
      l.strokeRect(0.5, t * 256 - 2, 15, 4));
    const u = this.value;
    if (
      (this.fields.h?.set(Math.round(t * 360)),
      this.fields.s?.set(Math.round(n * 100)),
      this.fields.v?.set(Math.round(i * 100)),
      this.fields.r?.set(Math.round(u[0] * 255)),
      this.fields.g?.set(Math.round(u[1] * 255)),
      this.fields.b?.set(Math.round(u[2] * 255)),
      this.hex && document.activeElement !== this.hex && (this.hex.value = qe(u)),
      this.ink)
    ) {
      const d = this.inkValues();
      ["c", "m", "y", "k"].forEach((v, y) => this.fields[v]?.set(Math.round(d[y] * 100)));
      const f = this.ink.toRgb(d),
        m = Math.max(...f.map((v, y) => Math.abs(v - u[y]))) > 4 / 255;
      this.gamut && (this.gamut.style.visibility = m ? "visible" : "hidden");
    }
    this.swNew && (this.swNew.style.background = fe(u));
  }
}
function Ei(s, e = "Color Picker") {
  const t = new Y(e, { width: 470 }),
    n = new Co(s, () => {}, !1, s);
  return (t.body.append(n.el), (t.onOk = () => n.value), t.show());
}
const Mf = Object.freeze(
  Object.defineProperty(
    { __proto__: null, ColorPickerWidget: Co, pickColor: Ei, setInkProvider: Au },
    Symbol.toStringTag,
    { value: "Module" },
  ),
);
function Ru(s, e) {
  (s.save(),
    e(),
    (s.lineWidth = 1),
    (s.strokeStyle = "#000"),
    s.setLineDash([]),
    s.stroke(),
    e(),
    (s.strokeStyle = "#fff"),
    s.setLineDash([4, 4]),
    (s.lineDashOffset = -(performance.now() / 60) % 8),
    s.stroke(),
    s.restore());
}
function Fu(s, e = []) {
  return p(
    "div",
    { class: "opts" },
    uo(s + ".mode"),
    N(),
    H("Feather"),
    q({
      value: h.setting(s + ".feather", 0),
      min: 0,
      max: 1e3,
      unit: "px",
      width: 44,
      onInput: (t) => h.set(s + ".feather", t),
    }),
    $("Anti-alias", h.setting(s + ".aa", !0), (t) => h.set(s + ".aa", t)),
    ...e,
    N(),
    p("button", { class: "btn small", onclick: () => h.run("select.refine") }, "Select and Mask…"),
  );
}
class Sf {
  start = [0, 0];
  d = [0, 0];
  active = !1;
  begin(e) {
    const t = h.doc;
    if (!t.selection || e.shift || e.alt || e.ctrl) return !1;
    const n = Math.floor(e.x),
      i = Math.floor(e.y);
    return n < 0 || i < 0 || n >= t.width || i >= t.height || g.read8(t.selection, { x: n, y: i, w: 1, h: 1 })[0] < 128
      ? !1
      : ((this.active = !0), (this.start = [e.x, e.y]), (this.d = [0, 0]), !0);
  }
  move(e) {
    this.d = [Math.round(e.x - this.start[0]), Math.round(e.y - this.start[1])];
  }
  end() {
    this.active = !1;
    const e = h.doc;
    if (!e.selection || (!this.d[0] && !this.d[1])) return;
    const t = mn(e, e.selection, this.d[0], this.d[1], [0]);
    e.transact("Move Selection", () => e.setSelection(t));
  }
  overlay(e, t) {
    if (!this.active) return;
    const n = t.docToScreen(0, 0),
      i = t.docToScreen(this.d[0], this.d[1]);
    (e.save(),
      (e.fillStyle = "rgba(143,180,220,0.9)"),
      (e.font = "11px system-ui"),
      e.fillText(`Δ ${this.d[0]}, ${this.d[1]}`, i[0] - n[0] + 12, i[1] - n[1] + 20),
      e.restore());
  }
}
class wr {
  constructor(e) {
    ((this.kind = e),
      (this.id = e === "rect" ? "marqueeRect" : "marqueeEllipse"),
      (this.name = e === "rect" ? "Rectangular Marquee Tool" : "Elliptical Marquee Tool"),
      (this.icon = e === "rect" ? R.marqueeRect : R.marqueeEllipse));
  }
  group = "marquee";
  shortcut = "M";
  cursor = "crosshair";
  id;
  name;
  icon;
  a = null;
  b = null;
  op = "replace";
  mover = new Sf();
  options() {
    return Fu("marquee", [
      N(),
      H("Style"),
      (() => {
        const e = p("select", { class: "sel" });
        for (const [t, n] of [
          ["normal", "Normal"],
          ["1:1", "Fixed Ratio 1:1"],
          ["4:3", "Fixed Ratio 4:3"],
          ["16:9", "Fixed Ratio 16:9"],
          ["3:2", "Fixed Ratio 3:2"],
        ])
          e.appendChild(p("option", { value: t, selected: h.setting("marquee.style", "normal") === t }, n));
        return ((e.onchange = () => h.set("marquee.style", e.value)), e);
      })(),
    ]);
  }
  down(e) {
    this.mover.begin(e) ||
      ((this.op = on(e, h.setting("marquee.mode", "replace"))), (this.a = [e.x, e.y]), (this.b = [e.x, e.y]));
  }
  move(e) {
    if (this.mover.active) {
      this.mover.move(e);
      return;
    }
    if (!this.a) return;
    let [t, n] = [e.x, e.y];
    const i = h.setting("marquee.style", "normal"),
      a =
        i === "normal"
          ? e.shift && this.op === "replace"
            ? 1
            : 0
          : String(i)
              .split(":")
              .map(Number)
              .reduce((l, c) => l / c);
    let o = t - this.a[0],
      r = n - this.a[1];
    if (a) {
      const l = Math.max(Math.abs(o), Math.abs(r) * a);
      ((o = Math.sign(o || 1) * l), (r = (Math.sign(r || 1) * l) / a));
    }
    (e.alt && this.op === "replace"
      ? (this.b = [this.a[0] + o, this.a[1] + r])
      : (this.b = [this.a[0] + o, this.a[1] + r]),
      (this.center = e.alt && this.op === "replace"));
  }
  center = !1;
  corners() {
    const e = this.a,
      t = this.b;
    return this.center ? [[2 * e[0] - t[0], 2 * e[1] - t[1]], t] : [e, t];
  }
  up() {
    if (this.mover.active) {
      this.mover.end();
      return;
    }
    if (!this.a || !this.b) return;
    const e = h.doc,
      [t, n] = this.corners();
    if (((this.a = this.b = null), Math.abs(n[0] - t[0]) < 1 || Math.abs(n[1] - t[1]) < 1)) {
      this.op === "replace" && wn(e);
      return;
    }
    Xa(e, this.kind, [t, n], this.op, h.setting("marquee.aa", !0), h.setting("marquee.feather", 0));
  }
  overlay(e, t) {
    if ((this.mover.overlay(e, t), !this.a || !this.b)) return;
    const [n, i] = this.corners(),
      a = [
        [n[0], n[1]],
        [i[0], n[1]],
        [i[0], i[1]],
        [n[0], i[1]],
      ];
    Ru(e, () => {
      if ((e.beginPath(), this.kind === "rect"))
        (a.map(([r, l]) => t.docToScreen(r, l)).forEach(([r, l], c) => (c ? e.lineTo(r, l) : e.moveTo(r, l))),
          e.closePath());
      else {
        const r = (n[0] + i[0]) / 2,
          l = (n[1] + i[1]) / 2,
          c = Math.abs(i[0] - n[0]) / 2,
          u = Math.abs(i[1] - n[1]) / 2;
        for (let d = 0; d <= 64; d++) {
          const f = (d / 64) * Math.PI * 2,
            [m, v] = t.docToScreen(r + Math.cos(f) * c, l + Math.sin(f) * u);
          d ? e.lineTo(m, v) : e.moveTo(m, v);
        }
      }
    });
    const o = t.docToScreen(i[0], i[1]);
    ((e.fillStyle = "rgba(24,28,33,.82)"),
      e.fillRect(o[0] + 10, o[1] + 8, 92, 18),
      (e.fillStyle = "#e3e7eb"),
      (e.font = "11px system-ui"),
      e.fillText(
        `W ${Math.round(Math.abs(i[0] - n[0]))}  H ${Math.round(Math.abs(i[1] - n[1]))}`,
        o[0] + 15,
        o[1] + 21,
      ));
  }
  cancel() {
    this.a = this.b = null;
  }
}
class xr {
  constructor(e) {
    ((this.poly = e),
      (this.id = e ? "polyLasso" : "lasso"),
      (this.name = e ? "Polygonal Lasso Tool" : "Lasso Tool"),
      (this.icon = e ? R.polyLasso : R.lasso));
  }
  group = "lasso";
  shortcut = "L";
  cursor = "crosshair";
  id;
  name;
  icon;
  pts = [];
  op = "replace";
  hoverPt = null;
  drawing = !1;
  options() {
    return Fu(
      "lasso",
      this.poly
        ? [
            N(),
            p(
              "span",
              { class: "opt-hint" },
              "Click to add points · Double-click or Enter to close · Backspace removes a point",
            ),
          ]
        : [],
    );
  }
  down(e) {
    if (this.poly) {
      if (!this.pts.length) ((this.op = on(e, h.setting("lasso.mode", "replace"))), this.pts.push([e.x, e.y]));
      else {
        const t = this.pts[0],
          n = L.xf().docToScreen(t[0], t[1]);
        if (this.pts.length > 2 && Math.hypot(n[0] - e.sx, n[1] - e.sy) < 8) {
          this.finish();
          return;
        }
        let a = [e.x, e.y];
        (e.shift && (a = kr(this.pts[this.pts.length - 1], a)), this.pts.push(a));
      }
      return;
    }
    ((this.op = on(e, h.setting("lasso.mode", "replace"))), (this.pts = [[e.x, e.y]]), (this.drawing = !0));
  }
  move(e) {
    if (this.poly) {
      this.hoverPt = [e.x, e.y];
      return;
    }
    if (!this.drawing) return;
    const t = this.pts[this.pts.length - 1];
    Math.hypot(e.x - t[0], e.y - t[1]) > 0.75 && this.pts.push([e.x, e.y]);
  }
  hover(e) {
    if (this.poly && this.pts.length) {
      let t = [e.x, e.y];
      (e.shift && (t = kr(this.pts[this.pts.length - 1], t)), (this.hoverPt = t));
    }
  }
  up() {
    !this.poly && this.drawing && ((this.drawing = !1), this.finish());
  }
  dblclick() {
    this.poly && this.finish();
  }
  key(e, t) {
    return !t || !this.pts.length
      ? !1
      : e.key === "Enter"
        ? (this.finish(), !0)
        : e.key === "Escape"
          ? ((this.pts = []), !0)
          : e.key === "Backspace" || e.key === "Delete"
            ? (this.pts.pop(), !0)
            : !1;
  }
  finish() {
    const e = this.pts;
    ((this.pts = []), (this.hoverPt = null));
    const t = h.doc;
    if (e.length < 3) {
      this.op === "replace" && wn(t);
      return;
    }
    Xa(t, "polygon", e, this.op, h.setting("lasso.aa", !0), h.setting("lasso.feather", 0));
  }
  overlay(e, t) {
    if (!this.pts.length) return;
    const n = this.hoverPt && this.poly ? [...this.pts, this.hoverPt] : this.pts;
    if (
      (Ru(e, () => {
        (e.beginPath(),
          n.forEach(([i, a], o) => {
            const r = t.docToScreen(i, a);
            o ? e.lineTo(r[0], r[1]) : e.moveTo(r[0], r[1]);
          }));
      }),
      this.poly)
    ) {
      const i = t.docToScreen(this.pts[0][0], this.pts[0][1]);
      (e.beginPath(), e.arc(i[0], i[1], 5, 0, Math.PI * 2), (e.strokeStyle = "#8fb4dc"), e.stroke());
    }
  }
  cancel() {
    ((this.pts = []), (this.drawing = !1));
  }
  commit() {
    this.poly && this.pts.length >= 3 ? this.finish() : (this.pts = []);
  }
}
function kr(s, e) {
  const t = e[0] - s[0],
    n = e[1] - s[1],
    i = Math.round(Math.atan2(n, t) / (Math.PI / 4)) * (Math.PI / 4),
    a = Math.hypot(t, n);
  return [s[0] + Math.cos(i) * a, s[1] + Math.sin(i) * a];
}
class Tf {
  id = "wand";
  name = "Magic Wand Tool";
  icon = R.wand;
  shortcut = "W";
  group = "wand";
  cursor = "crosshair";
  options() {
    return p(
      "div",
      { class: "opts" },
      uo("wand.mode"),
      N(),
      H("Tolerance"),
      q({ value: h.setting("wand.tol", 32), min: 0, max: 255, width: 40, onInput: (e) => h.set("wand.tol", e) }),
      is(
        [
          { value: !0, label: "This area", title: "Select the continuous area of similar colour around the click" },
          { value: !1, label: "Whole image", title: "Select every pixel of similar colour anywhere in the image" },
        ],
        h.setting("wand.contig", !0),
        (e) => h.set("wand.contig", e),
      ),
      N(),
      $("Anti-alias", h.setting("wand.aa", !0), (e) => h.set("wand.aa", e)),
      $("Sample All Layers", h.setting("wand.all", !1), (e) => h.set("wand.all", e)),
      N(),
      p(
        "button",
        {
          class: "btn small",
          title: "Select › Color Range… — pick several colours, soft edges, live preview",
          onclick: () => h.run("select.colorRange"),
        },
        "Color Range…",
      ),
      p("span", { class: "opt-hint" }, "Shift: add · Alt: subtract"),
    );
  }
  down(e) {
    const t = h.doc,
      n = on(e, h.setting("wand.mode", "replace")),
      i = h.setting("wand.all", !1) || !t.active?.tex ? t.composite : t.active.tex;
    h.status("Selecting…");
    const a = g.read8(i),
      o = Ja(
        a,
        t.width,
        t.height,
        e.x,
        e.y,
        h.setting("wand.tol", 32),
        h.setting("wand.contig", !0),
        h.setting("wand.aa", !0),
        !0,
      );
    (kn(t, o, n, "Magic Wand"), h.status(""));
  }
}
let et = null,
  Hs = !1;
async function Hi() {
  try {
    et = (await window.brushboard.python.call("core", "heal_status", {})).result;
  } catch (s) {
    et = { ai: !1, texture: !1, error: s?.message };
  }
  return (k.emit("heal:status", et), et);
}
function Vs() {
  return !!h.python.capabilities.numpy && !!h.python.capabilities.cv2;
}
function Eo(s, e, t = 1, n = 48) {
  const i = Math.max(n, Math.round(Math.max(e.w, e.h) * t));
  return ae({ x: e.x - i, y: e.y - i, w: e.w + 2 * i, h: e.h + 2 * i }, s.width, s.height);
}
async function Lo(s, e, t, n, i = {}) {
  if (!e.tex) throw new B("Select a pixel layer to heal.");
  if (e.lockPixels) throw new B(`"${e.name}" is locked.`);
  if (!Vs())
    throw new Error("Content-aware healing needs BrushBoard's Python helper (Extensions › Manage Extensions).");
  if (Hs) return !1;
  ((Hs = !0), k.emit("render"));
  const a = i.engine ?? h.setting("heal.engine", "auto"),
    o = i.label || "Spot Healing Brush";
  h.status(
    a === "smooth"
      ? "Healing…"
      : a === "texture"
        ? "Healing: matching texture…"
        : "Healing: AI is rebuilding the area…",
  );
  try {
    let r = e.tex,
      l = null;
    (i.sampleAll ?? h.setting("heal.all", !0)) && ((l = ve(s, s.layers, "rgba32f")), (r = l));
    const c = g.read(r, t);
    l && g.dispose(l);
    const u = g.read(e.tex, t),
      d = await window.brushboard.python.call(
        "core",
        "heal",
        { engine: a, grain: !0 },
        {
          source: { data: c, width: t.w, height: t.h },
          layer: { data: u, width: t.w, height: t.h },
          mask: { data: n, width: t.w, height: t.h, channels: 1 },
        },
      ),
      f = d.buffers.image;
    if (!f || e.tex.disposed || !s.find(e.id)) return !1;
    const m = new Float32Array(f.data),
      v = g.read(e.tex, t);
    for (let y = 0; y < m.length; y++)
      if (v[y] !== u[y]) {
        const b = v[y] + (m[y] - u[y]);
        m[y] = (y & 3) === 3 ? Math.min(1, Math.max(0, b)) : b;
      }
    if ((s.begin(o), s.recordPatch(e.tex, t), e.tex.k && e.tex.ink)) {
      const y = g.acquire(e.tex.w, e.tex.h, "rgba32f");
      g.upload(y, m, t);
      const b = g.toPair(y, e.tex.ink, t);
      g.release(y);
      const x = g.readInk(b, t);
      g.release(b);
      const w = g.readInk(e.tex, t);
      for (let _ = 0; _ < t.w * t.h; _++) {
        let M = !1;
        for (let T = 0; T < 4 && !M; T++) M = Math.abs(m[_ * 4 + T] - v[_ * 4 + T]) > 1e-4;
        if (!M) for (let T = 0; T < 5; T++) x[_ * 5 + T] = w[_ * 5 + T];
      }
      g.uploadInk(e.tex, x, t);
    } else g.upload(e.tex, m, t);
    return (
      e.version++,
      s.commit(),
      s.invalidate(t),
      h.status(
        `${o}: ${d.result?.engine === "ai" ? "AI inpainting" : d.result?.engine === "texture" ? "texture match" : "smooth"} · ${d.result?.ms ?? 0} ms`,
      ),
      d.result?.engine === "ai" && !et?.accel?.device && Hi(),
      !0
    );
  } finally {
    ((Hs = !1), k.emit("render"));
  }
}
async function Pf(s = h.doc, e) {
  if (!s) return;
  if (!s.selection) throw new B("Select the area to fill first (lasso around the object, a little loosely).");
  const t = s.active;
  if (!t || !t.tex || t.kind !== "raster") throw new B("Select a pixel layer.");
  const n = at(s);
  if (!n) throw new Error("The selection is empty.");
  const i = Eo(s, n, 0.8, 64),
    a = g.read(s.selection, i),
    o = new Float32Array(i.w * i.h);
  for (let r = 0; r < o.length; r++) o[r] = a[r * 4];
  try {
    (await Lo(s, t, i, o, {
      engine: e ?? h.setting("caf.engine", "auto"),
      label: "Content-Aware Fill",
      sampleAll: !0,
    })) && s.transact("Deselect", () => s.setSelection(null));
  } catch (r) {
    me("Content-Aware Fill", r?.message || String(r));
  }
}
async function Du() {
  h.status("Downloading the healing model (88 MB)…");
  try {
    (await window.brushboard.python.call("core", "heal_download", {}),
      await Hi(),
      h.status(
        et?.ai
          ? "Healing model installed — Spot Healing now uses AI inpainting."
          : "Healing model download did not complete.",
      ));
  } catch (s) {
    me("Healing model", s?.message || String(s));
  }
}
const zu = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        contentAwareFill: Pf,
        contextRect: Eo,
        downloadHealModel: Du,
        healAvailable: Vs,
        healRegion: Lo,
        get healStatus() {
          return et;
        },
        get healing() {
          return Hs;
        },
        refreshHealStatus: Hi,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  Cf = 360,
  Ef = 900;
function ai(s, e, t, n, i, a, o) {
  const r = e * t,
    l = n.filter((d) => !d.neg),
    c = n.filter((d) => d.neg);
  let u;
  if (!l.length) u = new Float32Array(r);
  else {
    const d = jo(
      s,
      r,
      l.map((f) => f.s),
    );
    if (((u = Go(d, i)), c.length)) {
      const f = jo(
          s,
          r,
          c.map((v) => v.s),
        ),
        m = Go(f, i);
      for (let v = 0; v < r; v++) f[v] <= d[v] && (u[v] *= 1 - m[v]);
    }
    a &&
      (u = ed(
        u,
        e,
        t,
        l.map((f) => f.at),
      ));
  }
  if (o) for (let d = 0; d < r; d++) u[d] = 1 - u[d];
  return u;
}
function Lf(s = h.doc) {
  if (!s) return Promise.resolve(!1);
  const e = new Iu(s),
    t = e.run();
  return ((t.dialog = e), t);
}
let oi = null;
class Iu {
  constructor(e) {
    ((this.doc = e),
      (this.st = {
        picks: [],
        fuzz: h.setting("cr.fuzz", 20),
        connected: h.setting("cr.connected", !1),
        invert: !1,
        merged: h.setting("cr.merged", !0),
        sampleRadius: h.setting("cr.radius", 1),
      }),
      (this.op = e.selection ? h.setting("cr.op", "replace") : "replace"),
      (this.showOnCanvas = h.setting("cr.onCanvas", !0)),
      (this.dlg = new Y("Color Range", { width: 400, modal: !1, cls: "colorrange-dialog" })));
    const t = this;
    ((this.picker = {
      id: "colorRangePick",
      name: "Color Range",
      icon: "",
      group: "_hidden",
      cursor: "crosshair",
      down(n) {
        t.pick(n.x, n.y, n.shift ? "add" : n.alt ? "sub" : t.mode);
      },
      overlay(n, i) {
        t.drawOverlay(n, i);
      },
    }),
      this.loadSource(),
      (oi = this));
  }
  st;
  mode = "set";
  op;
  showOnCanvas;
  view = "selection";
  full;
  prev;
  over;
  overCanvas = document.createElement("canvas");
  canvas = p("canvas", { class: "cr-preview" });
  chips = p("div", { class: "cr-chips" });
  dlg;
  raf = 0;
  picker;
  loadSource() {
    const e = this.doc,
      t = this.st.merged || !e.active?.tex ? e.composite : e.active.tex;
    ((this.full = { px: g.read8(t), w: e.width, h: e.height }),
      (this.prev = Wo(this.full.px, this.full.w, this.full.h, Cf)),
      (this.over = Wo(this.full.px, this.full.w, this.full.h, Ef)));
  }
  pick(e, t, n) {
    const i = el(this.full.px, this.full.w, this.full.h, e, t, this.st.sampleRadius);
    if (!i) return;
    const a = { s: i, at: [e, t], neg: n === "sub" };
    (n === "set" ? (this.st.picks = [a]) : this.st.picks.push(a), this.refresh());
  }
  picksScaled(e) {
    return this.st.picks.map((t) => ({ ...t, at: [t.at[0] * e, t.at[1] * e] }));
  }
  refresh() {
    (cancelAnimationFrame(this.raf), (this.raf = requestAnimationFrame(() => this.render())), this.renderChips());
  }
  render() {
    const { st: e } = this,
      t = this.prev,
      n = t.w * t.h,
      i = ai(t.px, t.w, t.h, this.picksScaled(t.k), e.fuzz, e.connected, e.invert);
    ((this.canvas.width = t.w), (this.canvas.height = t.h));
    const a = this.canvas.getContext("2d"),
      o = a.createImageData(t.w, t.h);
    for (let r = 0; r < n; r++) {
      const l = r * 4;
      if (this.view === "selection") {
        const c = Math.round(i[r] * 255);
        o.data[l] = o.data[l + 1] = o.data[l + 2] = c;
      } else ((o.data[l] = t.px[l]), (o.data[l + 1] = t.px[l + 1]), (o.data[l + 2] = t.px[l + 2]));
      o.data[l + 3] = 255;
    }
    if ((a.putImageData(o, 0, 0), this.showOnCanvas)) {
      const r = this.over,
        l = r.w * r.h,
        c = ai(r.px, r.w, r.h, this.picksScaled(r.k), e.fuzz, e.connected, e.invert);
      ((this.overCanvas.width = r.w), (this.overCanvas.height = r.h));
      const u = this.overCanvas.getContext("2d"),
        d = u.createImageData(r.w, r.h),
        f = !e.picks.some((m) => !m.neg) && !e.invert;
      for (let m = 0; m < l; m++) {
        const v = m * 4;
        ((d.data[v] = 230),
          (d.data[v + 1] = 40),
          (d.data[v + 2] = 40),
          (d.data[v + 3] = f ? 0 : Math.round((1 - c[m]) * 140)));
      }
      u.putImageData(d, 0, 0);
    }
    L.request();
  }
  drawOverlay(e, t) {
    if (!this.showOnCanvas || !this.overCanvas.width) return;
    const n = this.over,
      i = t.docToScreen(0, 0),
      a = t.docToScreen(this.doc.width, 0),
      o = t.docToScreen(0, this.doc.height);
    (e.save(),
      e.transform((a[0] - i[0]) / n.w, (a[1] - i[1]) / n.w, (o[0] - i[0]) / n.h, (o[1] - i[1]) / n.h, i[0], i[1]),
      (e.imageSmoothingEnabled = !0),
      e.drawImage(this.overCanvas, 0, 0),
      e.restore());
  }
  renderChips() {
    if ((this.chips.replaceChildren(), !this.st.picks.length)) {
      this.chips.append(p("span", { class: "cr-hint" }, "Click a colour on the canvas or in the preview"));
      return;
    }
    this.st.picks.forEach((e, t) => {
      this.chips.append(
        p(
          "button",
          {
            class: "cr-chip" + (e.neg ? " neg" : ""),
            title: `${e.neg ? "Excluded" : "Included"} colour — click to remove`,
            style: { background: fe([e.s.rgb[0] / 255, e.s.rgb[1] / 255, e.s.rgb[2] / 255]) },
            onclick: () => {
              (this.st.picks.splice(t, 1), this.refresh());
            },
          },
          e.neg ? "−" : "",
        ),
      );
    });
  }
  fullMask() {
    const e = this.full;
    return ai(e.px, e.w, e.h, this.st.picks, this.st.fuzz, this.st.connected, this.st.invert);
  }
  apply() {
    if (!this.st.picks.some((t) => !t.neg) && !this.st.invert)
      return (me("Color Range", "Click a colour in the image first."), !1);
    h.status("Selecting colour range…");
    const e = this.fullMask();
    return (
      kn(this.doc, e, this.op, "Color Range"),
      h.status(""),
      h.set("cr.fuzz", this.st.fuzz),
      h.set("cr.connected", this.st.connected),
      h.set("cr.merged", this.st.merged),
      h.set("cr.radius", this.st.sampleRadius),
      h.set("cr.onCanvas", this.showOnCanvas),
      (this.doc.selection || this.op === "replace") && h.set("cr.op", this.op),
      !0
    );
  }
  run() {
    const e = this.dlg,
      t = this.st,
      n = is(
        [
          { value: "set", label: "Pick", title: "Click to choose the colour (replaces earlier picks)" },
          { value: "add", label: "+ Add", title: "Click to add another colour (or Shift-click)" },
          { value: "sub", label: "− Exclude", title: "Click to exclude a colour (or Alt-click)" },
        ],
        this.mode,
        (l) => {
          this.mode = l;
        },
      ),
      i = Q({
        label: "Fuzziness",
        value: t.fuzz,
        min: 0,
        max: 100,
        step: 1,
        onInput: (l) => {
          ((t.fuzz = l), this.refresh());
        },
      }),
      a = is(
        [
          { value: !1, label: "Whole image", title: "Every pixel of these colours, anywhere" },
          {
            value: !0,
            label: "Connected area",
            title: "Only areas of these colours that touch the points you clicked",
          },
        ],
        t.connected,
        (l) => {
          ((t.connected = l), this.refresh());
        },
      );
    this.canvas.addEventListener("pointerdown", (l) => {
      const c = this.canvas.getBoundingClientRect(),
        u = ((l.clientX - c.left) / c.width) * this.doc.width,
        d = ((l.clientY - c.top) / c.height) * this.doc.height;
      this.pick(u, d, l.shiftKey ? "add" : l.altKey ? "sub" : this.mode);
    });
    const o = is(
      [
        { value: "selection", label: "Selection" },
        { value: "image", label: "Image" },
      ],
      this.view,
      (l) => {
        ((this.view = l), this.refresh());
      },
    );
    (e.body.append(
      p(
        "div",
        { class: "form-row cr-row" },
        n,
        p(
          "label",
          { class: "cr-radius", title: "Average the colour over an area when sampling" },
          "Sample ",
          O(
            [
              { value: 0, label: "Point" },
              { value: 1, label: "3×3" },
              { value: 2, label: "5×5" },
              { value: 5, label: "11×11" },
            ],
            t.sampleRadius,
            (l) => {
              t.sampleRadius = Number(l);
            },
          ),
        ),
      ),
      this.chips,
      i,
      p("div", { class: "form-row cr-row" }, a),
      p("div", { class: "cr-preview-wrap" }, this.canvas),
      p(
        "div",
        { class: "form-row cr-row" },
        o,
        $("Invert", t.invert, (l) => {
          ((t.invert = l), this.refresh());
        }),
        $("Show on canvas", this.showOnCanvas, (l) => {
          ((this.showOnCanvas = l), this.refresh());
        }),
      ),
      p(
        "div",
        { class: "form-row cr-row" },
        $("Sample merged", t.merged, (l) => {
          ((t.merged = l), this.loadSource(), this.refresh());
        }),
        p(
          "label",
          null,
          "Selection ",
          O(
            [
              { value: "replace", label: "New" },
              { value: "add", label: "Add" },
              { value: "subtract", label: "Subtract" },
              { value: "intersect", label: "Intersect" },
            ],
            this.op,
            (l) => {
              this.op = l;
            },
          ),
        ),
      ),
    ),
      (e.onOk = () => (this.apply() ? !0 : null)));
    const r = () => {
      (cancelAnimationFrame(this.raf), L.setOverride(null), oi === this && (oi = null));
    };
    return ((e.onCancel = r), L.setOverride(this.picker), this.refresh(), e.show().then((l) => (r(), !!l)));
  }
}
const Ou = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        ColorRangeDialog: Iu,
        colorRangeMask: ai,
        get current() {
          return oi;
        },
        openColorRange: Lf,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  _r = (s) => ({ x: s.x, y: s.y, pressure: s.pressure, tiltX: s.tiltX, tiltY: s.tiltY, twist: s.twist, time: s.time }),
  Vi = () => ({ viewRotation: h.doc?.view.rotation || 0, viewFlip: !!h.doc?.view.flip });
class zt {
  constructor(e, t, n, i, a, o) {
    ((this.id = e), (this.name = t), (this.icon = n), (this.group = i), (this.shortcut = a), (this.mode = o));
  }
  brushCursor = !0;
  stroke = null;
  last = null;
  lastBuild = 0;
  options() {
    return this.mode === "erase"
      ? p("div", { class: "opts" }, ...na(this.id, { mode: !1, smoothing: !0 }))
      : this.id === "pencil"
        ? p("div", { class: "opts" }, ...na(this.id, { flow: !1, airbrush: !1 }))
        : p("div", { class: "opts" }, ...na(this.id));
  }
  strokeOptions(e) {
    const t = 0.299 * h.bg[0] + 0.587 * h.bg[1] + 0.114 * h.bg[2];
    return {
      mode: this.mode,
      color: h.fg,
      pencil: this.id === "pencil",
      maskValue: this.mode === "erase" ? 1 - t : void 0,
      ...Vi(),
    };
  }
  target() {
    const e = h.doc,
      t = e.active;
    if (!t) throw new B("Select a layer to paint on.");
    if (t.kind === "group") throw new Error("Cannot paint on a group. Select a layer inside it.");
    if (t.kind === "adjustment") {
      if (!t.mask) throw new Error("This adjustment layer has no mask.");
      e.editMask = !0;
    }
    if (t.kind === "text" && !e.editMask)
      throw new B("Rasterize the type layer before painting on it (Layer › Rasterize › Type).");
    if (t.kind === "shape" && !e.editMask)
      throw new B("This is a shape layer: rasterize it before painting (Layer › Rasterize › Shape).");
    if (t.lockPixels) throw new B(`"${t.name}" is locked.`);
    if (!t.visible) throw new Error("The target layer is hidden.");
    return t;
  }
  down(e) {
    const t = h.doc,
      n = this.target(),
      i = h.brushFor(this.id);
    ((this.stroke = new ji(t, n, i, this.strokeOptions(e))),
      e.shift &&
        this.last &&
        this.stroke.add({ x: this.last[0], y: this.last[1], pressure: e.pressure, time: e.time - 16 }),
      this.stroke.add(_r(e)),
      (this.lastBuild = performance.now()));
  }
  move(e) {
    this.stroke?.add(_r(e));
  }
  up(e) {
    if (!this.stroke) return;
    const t = this.stroke;
    ((this.stroke = null), t.end(), (this.last = [e.x, e.y]));
  }
  frame() {
    if (!this.stroke) return;
    (h.brushFor(this.id).buildup &&
      performance.now() - this.lastBuild > 40 &&
      (this.stroke.buildup(), (this.lastBuild = performance.now())),
      this.stroke.flush());
  }
  cancel() {
    (this.stroke?.cancel(), (this.stroke = null));
  }
  commit() {
    this.stroke && (this.stroke.end(), (this.stroke = null));
  }
}
class Mr extends zt {
  src = null;
  offset = null;
  strokeStart = null;
  options() {
    const e = [
      { value: "layer", label: "Current Layer" },
      { value: "all", label: "All Layers" },
    ];
    return p(
      "div",
      { class: "opts" },
      Ln(this.id),
      ...(this.id === "clone"
        ? [
            Me("Opacity", h.brushFor(this.id).opacity, (t) => {
              h.brushFor(this.id).opacity = t;
            }),
            Me("Flow", h.brushFor(this.id).flow, (t) => {
              h.brushFor(this.id).flow = t;
            }),
          ]
        : []),
      N(),
      $("Aligned", h.setting(this.id + ".aligned", !0), (t) => h.set(this.id + ".aligned", t)),
      H("Sample"),
      O(e, h.setting(this.id + ".sample", "layer"), (t) => h.set(this.id + ".sample", t)),
      N(),
      p(
        "span",
        { class: "opt-hint" },
        this.src ? `Source: ${Math.round(this.src.x)}, ${Math.round(this.src.y)}` : "Alt-click to set the source point",
      ),
    );
  }
  strokeOptions(e) {
    const t = h.doc;
    if (!this.src || this.src.docId !== t.id)
      throw new B("Alt-click (Option-click) on the image to set the source point first.");
    const n = h.setting(this.id + ".aligned", !0);
    ((!this.offset || !n) && (this.offset = [this.src.x - e.x, this.src.y - e.y]), (this.strokeStart = [e.x, e.y]));
    const i = h.setting(this.id + ".sample", "layer") === "all";
    return {
      ...Vi(),
      mode: this.mode,
      color: h.fg,
      cloneOffset: [Math.round(this.offset[0]), Math.round(this.offset[1])],
      cloneSource: i ? t.inkComposite || t.composite : null,
    };
  }
  down(e) {
    if (e.alt) {
      ((this.src = { x: e.x, y: e.y, docId: h.doc.id }),
        (this.offset = null),
        h.notify("Clone source set", "info", 1200),
        re(
          async () => {
            const { bus: t } = await Promise.resolve().then(() => Lr);
            return { bus: t };
          },
          void 0,
          import.meta.url,
        ).then(({ bus: t }) => t.emit("tool:options")));
      return;
    }
    super.down(e);
  }
  overlay(e, t) {
    if (!this.src) return;
    let n = [this.src.x, this.src.y];
    if (this.stroke && this.offset && this.strokeStart) {
      const o = this._hover;
      o && (n = [o[0] + this.offset[0], o[1] + this.offset[1]]);
    }
    const [i, a] = t.docToScreen(n[0], n[1]);
    (e.beginPath(),
      e.moveTo(i - 7, a),
      e.lineTo(i + 7, a),
      e.moveTo(i, a - 7),
      e.lineTo(i, a + 7),
      (e.lineWidth = 3),
      (e.strokeStyle = "rgba(0,0,0,.5)"),
      e.stroke(),
      (e.lineWidth = 1),
      (e.strokeStyle = "#fff"),
      e.stroke());
  }
  move(e) {
    ((this._hover = [e.x, e.y]), super.move(e));
  }
}
class Vt extends zt {
  options() {
    const e = h.brushFor(this.id),
      t = [Ln(this.id), N()];
    return (
      this.mode === "dodge" || this.mode === "burn"
        ? (t.push(
            H("Range"),
            O(
              [
                { value: 0, label: "Shadows" },
                { value: 1, label: "Midtones" },
                { value: 2, label: "Highlights" },
              ],
              h.setting(this.id + ".range", 1),
              (n) => h.set(this.id + ".range", n),
            ),
          ),
          t.push(Me("Exposure", h.setting(this.id + ".strength", 0.5), (n) => h.set(this.id + ".strength", n))))
        : this.mode === "sponge"
          ? (t.push(
              H("Mode"),
              O(
                [
                  { value: "desaturate", label: "Desaturate" },
                  { value: "saturate", label: "Saturate" },
                ],
                h.setting("sponge.mode", "desaturate"),
                (n) => h.set("sponge.mode", n),
              ),
            ),
            t.push(Me("Flow", h.setting(this.id + ".strength", 0.5), (n) => h.set(this.id + ".strength", n))))
          : t.push(Me("Strength", h.setting(this.id + ".strength", 0.5), (n) => h.set(this.id + ".strength", n))),
      t.push(
        Me("Spacing", e.spacing, (n) => {
          e.spacing = Math.max(0.01, n);
        }),
      ),
      p("div", { class: "opts" }, ...t)
    );
  }
  strokeOptions() {
    return {
      ...Vi(),
      mode: this.mode,
      color: h.fg,
      strength: h.setting(this.id + ".strength", 0.5),
      range: h.setting(this.id + ".range", 1),
      sponge: h.setting("sponge.mode", "desaturate"),
    };
  }
}
class Af extends zt {
  options() {
    const e = h.brushFor(this.id),
      t = [
        ["Dry", 0, 1],
        ["Moist", 0.3, 0.6],
        ["Wet", 0.6, 0.45],
        ["Very Wet", 0.85, 0.3],
        ["Blend only", 1, 0],
      ];
    return p(
      "div",
      { class: "opts" },
      Ln(this.id),
      N(),
      O(
        t.map(([n], i) => ({ value: i, label: n })),
        Math.max(
          0,
          t.findIndex(([, n, i]) => Math.abs(n - (e.mixWet ?? 0.5)) < 0.01 && Math.abs(i - (e.mixLoad ?? 0.5)) < 0.01),
        ),
        (n) => {
          ((e.mixWet = t[n][1]),
            (e.mixLoad = t[n][2]),
            re(
              async () => {
                const { bus: i } = await Promise.resolve().then(() => Lr);
                return { bus: i };
              },
              void 0,
              import.meta.url,
            ).then(({ bus: i }) => i.emit("tool:options")));
        },
      ),
      Me("Wet", e.mixWet ?? 0.5, (n) => {
        e.mixWet = n;
      }),
      Me("Load", e.mixLoad ?? 0.5, (n) => {
        e.mixLoad = n;
      }),
      Me("Flow", e.flow, (n) => {
        e.flow = n;
      }),
      N(),
      p(
        "span",
        { class: "opt-hint" },
        "Paints with the foreground colour and drags wet paint along · Wet 100% = pure blending",
      ),
    );
  }
  strokeOptions() {
    return { ...Vi(), mode: "mixer", color: h.fg };
  }
}
class Rf extends zt {
  listening = !1;
  options() {
    this.listening ||
      ((this.listening = !0),
      k.on("heal:status", () => {
        h.tool === this && k.emit("tool:options");
      }));
    const e = et;
    return p(
      "div",
      { class: "opts" },
      Ln(this.id),
      N(),
      H("Type"),
      O(
        [
          { value: "auto", label: "Content-Aware (AI)" },
          { value: "texture", label: "Texture Match (PatchMatch)" },
          { value: "smooth", label: "Quick Smooth" },
        ],
        h.setting("heal.engine", "auto"),
        (t) => h.set("heal.engine", t),
      ),
      $("Sample All Layers", h.setting("heal.all", !0), (t) => h.set("heal.all", t)),
      N(),
      Vs()
        ? e && !e.ai
          ? p(
              "button",
              {
                class: "btn small primary",
                title: "The LaMa model was not found; Content-Aware uses Texture Match until it is installed",
                onclick: () => Du(),
              },
              "Download healing model (88 MB)",
            )
          : null
        : p("span", { class: "cap missing" }, "Python helper needed — using quick smoothing"),
      e && e.ai ? Gc(e.accel) : null,
      p("span", { class: "opt-hint" }, "Paint over what should disappear — blemishes, wires, people, objects"),
    );
  }
  activate() {
    !et && Vs() && Hi().then(() => k.emit("tool:options"));
  }
  down(e) {
    if (Hs) {
      h.notify("Still healing the previous stroke…", "info", 1500);
      return;
    }
    super.down(e);
  }
  up(e) {
    const t = this.stroke;
    if (!t) return;
    const n = h.doc,
      i = h.setting("heal.engine", "auto");
    if (!Vs() || i === "quick" || t.isMaskTarget) {
      super.up(e);
      return;
    }
    ((this.stroke = null), t.flush());
    const a = t.bounds;
    if (!a) {
      t.cancel();
      return;
    }
    const o = Eo(n, a, 1, 48),
      r = t.coverage(o);
    Lo(n, t.layer, o, r)
      .catch((l) => h.error(l))
      .finally(() => {
        (t.cancel(), k.emit("render"));
      });
  }
}
const Ff =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5 19 8l-7.5 7.5-4.5-4.5z"/><path d="M7 11c-2.2.4-3.8 2.4-3.6 4.7.1 1.5-.6 2.6-1.9 3.3 3.2 1.5 7.6.6 8.9-2.3"/><path d="M17 17c1 1.2 1.5 2.1 1.5 2.8a1.5 1.5 0 0 1-3 0c0-.7.5-1.6 1.5-2.8z"/></svg>';
function Df() {
  return [
    new Rf("spotHeal", "Spot Healing Brush Tool", R.spotHeal, "heal", "J", "spot"),
    new Mr("heal", "Healing Brush Tool", R.heal, "heal", "J", "heal"),
    new zt("brush", "Brush Tool", R.brush, "brush", "B", "paint"),
    new zt("pencil", "Pencil Tool", R.pencil, "brush", "B", "paint"),
    new Af("mixer", "Mixer Brush Tool", Ff, "brush", "B", "mixer"),
    new Mr("clone", "Clone Stamp Tool", R.clone, "clone", "S", "clone"),
    new zt("eraser", "Eraser Tool", R.eraser, "eraser", "E", "erase"),
    new Vt("blur", "Blur Tool", R.blur, "blur", void 0, "blur"),
    new Vt("sharpen", "Sharpen Tool", R.sharpen, "blur", void 0, "sharpen"),
    new Vt("smudge", "Smudge Tool", R.smudge, "blur", void 0, "smudge"),
    new Vt("dodge", "Dodge Tool", R.dodge, "dodge", "O", "dodge"),
    new Vt("burn", "Burn Tool", R.burn, "dodge", "O", "burn"),
    new Vt("sponge", "Sponge Tool", R.sponge, "dodge", "O", "sponge"),
  ];
}
class zf {
  id = "eyedropper";
  name = "Eyedropper Tool";
  icon = R.eyedropper;
  shortcut = "I";
  group = "eyedropper";
  cursor = "crosshair";
  sampling = !1;
  prev = null;
  cur = null;
  at = null;
  bg = !1;
  options() {
    return p(
      "div",
      { class: "opts" },
      H("Sample Size"),
      O(
        [
          { value: 1, label: "Point Sample" },
          { value: 3, label: "3 by 3 Average" },
          { value: 5, label: "5 by 5 Average" },
          { value: 11, label: "11 by 11 Average" },
          { value: 31, label: "31 by 31 Average" },
        ],
        h.setting("eyedropper.size", 1),
        (e) => h.set("eyedropper.size", e),
      ),
      H("Sample"),
      O(
        [
          { value: "all", label: "All Layers" },
          { value: "layer", label: "Current Layer" },
        ],
        h.setting("eyedropper.from", "all"),
        (e) => h.set("eyedropper.from", e),
      ),
      N(),
      p("span", { class: "opt-hint" }, "Alt-click sets the background color"),
    );
  }
  pick(e) {
    const t = L.sample(e.x, e.y, h.setting("eyedropper.size", 1), h.setting("eyedropper.from", "all") === "layer");
    if (!t || t[3] <= 0) return;
    let n = [t[0], t[1], t[2]];
    const i = h.doc;
    if (i?.ink) {
      const o = L.sampleInk(e.x, e.y, h.setting("eyedropper.size", 1), h.setting("eyedropper.from", "all") === "layer");
      o && o[4] > 0 && (n = Xs(o.slice(0, 4), i.ink));
    }
    ((this.cur = n), (this.at = [e.sx, e.sy]));
    const a = h.tool?.brushCursor;
    this.bg && !a ? h.setBg(n) : h.setFg(n);
  }
  down(e) {
    ((this.sampling = !0),
      (this.bg = e.alt),
      (this.prev = [...(this.bg && !h.tool?.brushCursor ? h.bg : h.fg)]),
      this.pick(e));
  }
  move(e) {
    this.sampling && this.pick(e);
  }
  up() {
    ((this.sampling = !1), (this.at = null));
  }
  overlay(e) {
    if (!this.sampling || !this.at || !this.cur) return;
    const [t, n] = this.at;
    (e.save(),
      (e.lineWidth = 18),
      e.beginPath(),
      e.arc(t, n, 46, -Math.PI / 2, Math.PI / 2, !0),
      (e.strokeStyle = fe(this.cur)),
      e.stroke(),
      e.beginPath(),
      e.arc(t, n, 46, -Math.PI / 2, Math.PI / 2, !1),
      (e.strokeStyle = fe(this.prev || [0, 0, 0])),
      e.stroke(),
      (e.lineWidth = 1),
      (e.strokeStyle = "rgba(128,128,128,.8)"),
      e.beginPath(),
      e.arc(t, n, 55, 0, Math.PI * 2),
      e.stroke(),
      e.beginPath(),
      e.arc(t, n, 37, 0, Math.PI * 2),
      e.stroke(),
      e.restore());
  }
}
class If {
  id = "ruler";
  name = "Ruler Tool";
  icon = R.ruler;
  group = "eyedropper";
  cursor = "crosshair";
  a = null;
  b = null;
  dragging = !1;
  info() {
    if (!this.a || !this.b) return { w: 0, h: 0, l: 0, ang: 0 };
    const e = this.b[0] - this.a[0],
      t = this.b[1] - this.a[1];
    return { w: e, h: t, l: Math.hypot(e, t), ang: (-Math.atan2(t, e) * 180) / Math.PI };
  }
  options() {
    const e = this.info();
    return p(
      "div",
      { class: "opts" },
      p(
        "span",
        { class: "readout" },
        this.a
          ? `X: ${this.a[0].toFixed(1)}  Y: ${this.a[1].toFixed(1)}  W: ${e.w.toFixed(1)}  H: ${e.h.toFixed(1)}  A: ${e.ang.toFixed(1)}°  L: ${e.l.toFixed(1)}`
          : "Drag to measure distance and angle",
      ),
      N(),
      p(
        "button",
        {
          class: "btn small",
          disabled: !this.a,
          onclick: () => {
            if (!this.a || !h.doc) return;
            const t = this.info().ang,
              n = Math.abs(t) > 45 ? Math.sign(t) * 90 - t : -t;
            (js(h.doc, -n), (this.a = this.b = null), k.emit("tool:options"));
          },
        },
        "Straighten Layer",
      ),
      p(
        "button",
        {
          class: "btn small",
          onclick: () => {
            ((this.a = this.b = null), k.emit("tool:options"), k.emit("render"));
          },
        },
        "Clear",
      ),
    );
  }
  down(e) {
    ((this.a = [e.x, e.y]), (this.b = [e.x, e.y]), (this.dragging = !0));
  }
  move(e) {
    if (!this.dragging || !this.a) return;
    let t = [e.x, e.y];
    if (e.shift) {
      const n = t[0] - this.a[0],
        i = t[1] - this.a[1],
        a = Math.round(Math.atan2(i, n) / (Math.PI / 4)) * (Math.PI / 4),
        o = Math.hypot(n, i);
      t = [this.a[0] + Math.cos(a) * o, this.a[1] + Math.sin(a) * o];
    }
    ((this.b = t), k.emit("tool:options:soft"));
  }
  up() {
    ((this.dragging = !1), k.emit("tool:options"));
  }
  overlay(e, t) {
    if (!this.a || !this.b) return;
    const n = t.docToScreen(...this.a),
      i = t.docToScreen(...this.b);
    (e.beginPath(),
      e.moveTo(n[0], n[1]),
      e.lineTo(i[0], i[1]),
      (e.lineWidth = 3),
      (e.strokeStyle = "rgba(0,0,0,.5)"),
      e.stroke(),
      (e.lineWidth = 1),
      (e.strokeStyle = "#fff"),
      e.stroke());
    for (const o of [n, i])
      (e.beginPath(),
        e.moveTo(o[0] - 5, o[1]),
        e.lineTo(o[0] + 5, o[1]),
        e.moveTo(o[0], o[1] - 5),
        e.lineTo(o[0], o[1] + 5),
        e.stroke());
    const a = this.info();
    ((e.fillStyle = "rgba(24,28,33,.82)"),
      e.fillRect(i[0] + 10, i[1] + 6, 120, 18),
      (e.fillStyle = "#e3e7eb"),
      (e.font = "11px system-ui"),
      e.fillText(`${a.l.toFixed(1)} px  ${a.ang.toFixed(1)}°`, i[0] + 15, i[1] + 19));
  }
}
class Of {
  id = "crop";
  name = "Crop Tool";
  icon = R.crop;
  shortcut = "C";
  group = "crop";
  rect = null;
  drag = null;
  docId = -1;
  activate() {
    this.reset();
  }
  reset() {
    const e = h.doc;
    ((this.rect = e ? { x: 0, y: 0, w: e.width, h: e.height } : null), (this.docId = e?.id ?? -1), k.emit("render"));
  }
  ratio() {
    const e = h.setting("crop.ratio", "free");
    if (e === "free") return 0;
    if (e === "orig") return h.doc ? h.doc.width / h.doc.height : 0;
    const [t, n] = e.split(":").map(Number);
    return t / n;
  }
  options() {
    return p(
      "div",
      { class: "opts" },
      H("Ratio"),
      O(
        [
          { value: "free", label: "Free" },
          { value: "orig", label: "Original Ratio" },
          { value: "1:1", label: "1 : 1 (Square)" },
          { value: "4:5", label: "4 : 5 (8 : 10)" },
          { value: "5:7", label: "5 : 7" },
          { value: "2:3", label: "2 : 3 (4 : 6)" },
          { value: "3:2", label: "3 : 2" },
          { value: "4:3", label: "4 : 3" },
          { value: "16:9", label: "16 : 9" },
          { value: "9:16", label: "9 : 16" },
        ],
        h.setting("crop.ratio", "free"),
        (e) => {
          (h.set("crop.ratio", e), this.applyRatio());
        },
      ),
      N(),
      p("span", { class: "readout" }, this.rect ? `${Math.round(this.rect.w)} × ${Math.round(this.rect.h)} px` : ""),
      N(),
      $("Show Grid", h.setting("crop.grid", !0), (e) => {
        (h.set("crop.grid", e), k.emit("render"));
      }),
      N(),
      p("button", { class: "btn small", onclick: () => this.reset() }, "Reset"),
      p("button", { class: "btn small primary", onclick: () => this.commitCrop() }, "✓ Crop"),
    );
  }
  applyRatio() {
    const e = this.ratio(),
      t = this.rect;
    if (!e || !t) return;
    const n = t.x + t.w / 2,
      i = t.y + t.h / 2;
    let a = t.w,
      o = a / e;
    (o > t.h && ((o = t.h), (a = o * e)),
      (this.rect = { x: n - a / 2, y: i - o / 2, w: a, h: o }),
      k.emit("render"),
      k.emit("tool:options"));
  }
  hit(e) {
    const t = this.rect;
    if (!t) return "new";
    const n = L.xf(),
      i = [
        ["nw", t.x, t.y],
        ["n", t.x + t.w / 2, t.y],
        ["ne", t.x + t.w, t.y],
        ["e", t.x + t.w, t.y + t.h / 2],
        ["se", t.x + t.w, t.y + t.h],
        ["s", t.x + t.w / 2, t.y + t.h],
        ["sw", t.x, t.y + t.h],
        ["w", t.x, t.y + t.h / 2],
      ];
    for (const [a, o, r] of i) {
      const l = n.docToScreen(o, r);
      if (Math.hypot(l[0] - e.sx, l[1] - e.sy) < 9) return a;
    }
    return e.x > t.x && e.x < t.x + t.w && e.y > t.y && e.y < t.y + t.h ? "move" : "new";
  }
  cursorFor(e) {
    const t = h.doc,
      n = this.rect,
      i = !!(t && n && n.x === 0 && n.y === 0 && n.w === t.width && n.h === t.height),
      a = this.hit(e);
    return a === "move" && !i ? "move" : a === "new" || a === "move" ? "crosshair" : `${a}-resize`;
  }
  down(e) {
    this.docId !== h.doc?.id && this.reset();
    let t = this.hit(e);
    const n = h.doc,
      i = this.rect && this.rect.x === 0 && this.rect.y === 0 && this.rect.w === n.width && this.rect.h === n.height;
    (t === "move" && i && (t = "new"),
      t === "new" && (this.rect = { x: e.x, y: e.y, w: 0, h: 0 }),
      (this.drag = { kind: t, start: [e.x, e.y], r0: { ...this.rect } }));
  }
  move(e) {
    const t = this.drag;
    if (!t) return;
    const n = t.r0,
      i = e.x - t.start[0],
      a = e.y - t.start[1];
    let o = n.x,
      r = n.y,
      l = n.x + n.w,
      c = n.y + n.h;
    const u = t.kind;
    u === "move"
      ? ((o += i), (l += i), (r += a), (c += a))
      : u === "new"
        ? ((l = e.x), (c = e.y))
        : (u.includes("w") && (o += i),
          u.includes("e") && (l += i),
          u.includes("n") && (r += a),
          u.includes("s") && (c += a));
    let d = { x: Math.min(o, l), y: Math.min(r, c), w: Math.abs(l - o), h: Math.abs(c - r) };
    const f = this.ratio() || (e.shift && u !== "move" ? 1 : 0);
    (f &&
      u !== "move" &&
      (u === "n" || u === "s" ? (d.w = d.h * f) : (d.h = d.w / f),
      (u === "new" || u.includes("s") || u === "e") && c < r && (d.y = r - d.h),
      u.includes("n") && (d.y = n.y + n.h - d.h),
      u.includes("w") && !u.includes("n") && !u.includes("s") && (d.y = n.y),
      u === "new" && l < o && (d.x = o - d.w)),
      (d = { x: Math.round(d.x), y: Math.round(d.y), w: Math.round(d.w), h: Math.round(d.h) }),
      (this.rect = d),
      k.emit("tool:options:soft"));
  }
  up() {
    ((this.drag = null), this.rect && (this.rect.w < 2 || this.rect.h < 2) && this.reset(), k.emit("tool:options"));
  }
  dblclick() {
    this.commitCrop();
  }
  key(e, t) {
    return t ? (e.key === "Enter" ? (this.commitCrop(), !0) : e.key === "Escape" ? (this.reset(), !0) : !1) : !1;
  }
  commitCrop() {
    const e = h.doc,
      t = this.rect;
    !e ||
      !t ||
      (t.x === 0 && t.y === 0 && t.w === e.width && t.h === e.height) ||
      (Bi(e, t), this.reset(), k.emit("view:fit", e));
  }
  overlay(e, t) {
    this.docId !== h.doc?.id && this.reset();
    const n = this.rect;
    if (!n) return;
    const i = [
      [n.x, n.y],
      [n.x + n.w, n.y],
      [n.x + n.w, n.y + n.h],
      [n.x, n.y + n.h],
    ].map(([o, r]) => t.docToScreen(o, r));
    if (
      (e.save(),
      e.beginPath(),
      e.rect(0, 0, e.canvas.width, e.canvas.height),
      i.forEach(([o, r], l) => (l ? e.lineTo(o, r) : e.moveTo(o, r))),
      e.closePath(),
      (e.fillStyle = "rgba(12,14,17,.55)"),
      e.fill("evenodd"),
      e.beginPath(),
      i.forEach(([o, r], l) => (l ? e.lineTo(o, r) : e.moveTo(o, r))),
      e.closePath(),
      (e.strokeStyle = "#fff"),
      (e.lineWidth = 1),
      e.stroke(),
      h.setting("crop.grid", !0))
    ) {
      e.strokeStyle = "rgba(255,255,255,.4)";
      for (const o of [1 / 3, 2 / 3]) {
        const r = t.docToScreen(n.x + n.w * o, n.y),
          l = t.docToScreen(n.x + n.w * o, n.y + n.h),
          c = t.docToScreen(n.x, n.y + n.h * o),
          u = t.docToScreen(n.x + n.w, n.y + n.h * o);
        (e.beginPath(),
          e.moveTo(r[0], r[1]),
          e.lineTo(l[0], l[1]),
          e.moveTo(c[0], c[1]),
          e.lineTo(u[0], u[1]),
          e.stroke());
      }
    }
    e.fillStyle = "#fff";
    const a = [
      [n.x, n.y],
      [n.x + n.w / 2, n.y],
      [n.x + n.w, n.y],
      [n.x + n.w, n.y + n.h / 2],
      [n.x + n.w, n.y + n.h],
      [n.x + n.w / 2, n.y + n.h],
      [n.x, n.y + n.h],
      [n.x, n.y + n.h / 2],
    ];
    for (const [o, r] of a) {
      const l = t.docToScreen(o, r);
      e.fillRect(l[0] - 4, l[1] - 4, 8, 8);
    }
    e.restore();
  }
}
class Bf {
  id = "hand";
  name = "Hand Tool";
  icon = R.hand;
  shortcut = "H";
  group = "hand";
  cursor = "grab";
  start = null;
  pan0 = [0, 0];
  options() {
    return p(
      "div",
      { class: "opts" },
      p("button", { class: "btn small", onclick: () => L.actualPixels() }, "100%"),
      p("button", { class: "btn small", onclick: () => L.fit() }, "Fit Screen"),
    );
  }
  down(e) {
    ((this.start = [e.sx, e.sy]), (this.pan0 = [h.doc.view.panX, h.doc.view.panY]));
  }
  move(e) {
    this.start &&
      ((h.doc.view.panX = this.pan0[0] + e.sx - this.start[0]),
      (h.doc.view.panY = this.pan0[1] + e.sy - this.start[1]),
      L.viewChanged());
  }
  up() {
    this.start = null;
  }
  dblclick() {
    L.fit();
  }
  cursorFor() {
    return this.start ? "grabbing" : "grab";
  }
}
class $f {
  id = "rotateView";
  name = "Rotate View Tool";
  icon = R.rotateView;
  shortcut = "R";
  group = "hand";
  cursor = "alias";
  a0 = 0;
  rot0 = 0;
  options() {
    const e = h.doc;
    return p(
      "div",
      { class: "opts" },
      H("Rotation Angle"),
      q({
        value: e?.view.rotation ?? 0,
        min: -180,
        max: 180,
        unit: "°",
        width: 46,
        onInput: (t) => {
          h.doc && ((h.doc.view.rotation = t), L.viewChanged());
        },
      }),
      p(
        "button",
        {
          class: "btn small",
          onclick: () => {
            h.doc && ((h.doc.view.rotation = 0), L.viewChanged(), k.emit("tool:options"));
          },
        },
        "Reset View",
      ),
      $("Flip Horizontal", !!e?.view.flip, (t) => {
        h.doc && ((h.doc.view.flip = t), L.viewChanged());
      }),
    );
  }
  down(e) {
    ((this.a0 = Math.atan2(e.sy - L.cssH / 2, e.sx - L.cssW / 2)), (this.rot0 = h.doc.view.rotation));
  }
  move(e) {
    const t = Math.atan2(e.sy - L.cssH / 2, e.sx - L.cssW / 2);
    let n = this.rot0 + ((t - this.a0) * 180) / Math.PI;
    ((n = ((n + 540) % 360) - 180),
      e.shift && (n = Math.round(n / 15) * 15),
      (h.doc.view.rotation = n),
      L.viewChanged(),
      k.emit("tool:options:soft"));
  }
  up() {
    k.emit("tool:options");
  }
  dblclick() {
    ((h.doc.view.rotation = 0), L.viewChanged());
  }
}
class qf {
  id = "zoom";
  name = "Zoom Tool";
  icon = R.zoom;
  shortcut = "Z";
  group = "zoom";
  start = null;
  z0 = 1;
  moved = !1;
  at = [0, 0];
  options() {
    return p(
      "div",
      { class: "opts" },
      p("button", { class: "btn small", onclick: () => L.actualPixels() }, "100%"),
      p("button", { class: "btn small", onclick: () => L.fit() }, "Fit Screen"),
      p(
        "button",
        {
          class: "btn small",
          onclick: () => {
            const e = h.doc;
            e &&
              ((e.view.zoom = Math.max(L.cssW / e.width, L.cssH / e.height)),
              (e.view.panX = e.view.panY = 0),
              L.viewChanged());
          },
        },
        "Fill Screen",
      ),
      N(),
      p("span", { class: "opt-hint" }, "Click to zoom in · Alt-click to zoom out · Drag left/right for scrubby zoom"),
    );
  }
  cursorFor(e) {
    return e.alt ? "zoom-out" : "zoom-in";
  }
  down(e) {
    ((this.start = [e.sx, e.sy]), (this.z0 = h.doc.view.zoom), (this.moved = !1), (this.at = [e.sx, e.sy]));
  }
  move(e) {
    if (!this.start) return;
    const t = e.sx - this.start[0];
    (Math.abs(t) > 3 && (this.moved = !0),
      this.moved && L.zoomAt(this.z0 * Math.exp(t / 150), this.at[0], this.at[1], !0));
  }
  up(e) {
    (!this.moved && this.start && L.zoomStep(e.alt ? -1 : 1, e.sx, e.sy), (this.start = null));
  }
}
class Nf {
  id = "gradient";
  name = "Gradient Tool";
  icon = R.gradient;
  shortcut = "G";
  group = "gradient";
  cursor = "crosshair";
  a = null;
  b = null;
  current() {
    const e = h.setting("gradient.preset", 0),
      t = h.setting("gradient.custom", null);
    return e === -1 && t ? t : Gn(h.fg, h.bg)[e] || Gn(h.fg, h.bg)[0];
  }
  options() {
    const e = this.current(),
      t = p("button", { class: "grad-btn", title: "Click to choose a gradient", style: { background: Bs(e) } });
    t.addEventListener("click", () => {
      const o = p(
        "div",
        { class: "grad-list" },
        ...Gn(h.fg, h.bg).map((r, l) =>
          p(
            "div",
            {
              class: "grad-item",
              title: r.name,
              onclick: () => {
                (h.set("gradient.preset", l), fs(), k.emit("tool:options"));
              },
            },
            p("span", { class: "grad-sw", style: { background: Bs(r) } }),
            p("span", null, r.name),
          ),
        ),
      );
      rc(t, o);
    });
    const n = [
        [0, "Linear"],
        [1, "Radial"],
        [2, "Angle"],
        [3, "Reflected"],
        [4, "Diamond"],
      ],
      i = h.setting("gradient.type", 0),
      a = p(
        "span",
        { class: "seg" },
        ...n.map(([o, r]) =>
          p("button", {
            class: "ibtn" + (i === o ? " on" : ""),
            title: r + " Gradient",
            onclick: () => {
              (h.set("gradient.type", o), k.emit("tool:options"));
            },
            html: jf(o),
          }),
        ),
      );
    return p(
      "div",
      { class: "opts" },
      t,
      a,
      N(),
      H("Mode"),
      Ot(h.setting("gradient.mode", "normal"), (o) => h.set("gradient.mode", o)),
      Me("Opacity", h.setting("gradient.opacity", 1), (o) => h.set("gradient.opacity", o)),
      $("Reverse", h.setting("gradient.reverse", !1), (o) => h.set("gradient.reverse", o)),
      $("Dither", h.setting("gradient.dither", !0), (o) => h.set("gradient.dither", o)),
    );
  }
  down(e) {
    ((this.a = [e.x, e.y]), (this.b = [e.x, e.y]));
  }
  move(e) {
    if (!this.a) return;
    let t = [e.x, e.y];
    if (e.shift) {
      const n = t[0] - this.a[0],
        i = t[1] - this.a[1],
        a = Math.round(Math.atan2(i, n) / (Math.PI / 4)) * (Math.PI / 4),
        o = Math.hypot(n, i);
      t = [this.a[0] + Math.cos(a) * o, this.a[1] + Math.sin(a) * o];
    }
    this.b = t;
  }
  up() {
    const e = this.a,
      t = this.b;
    ((this.a = this.b = null),
      !(!e || !t || Math.hypot(t[0] - e[0], t[1] - e[1]) < 1) &&
        Sl(
          h.doc,
          this.current(),
          e,
          t,
          h.setting("gradient.type", 0),
          h.setting("gradient.reverse", !1),
          h.setting("gradient.opacity", 1),
          h.setting("gradient.mode", "normal"),
          h.setting("gradient.dither", !0),
        ));
  }
  overlay(e, t) {
    if (!this.a || !this.b) return;
    const n = t.docToScreen(...this.a),
      i = t.docToScreen(...this.b);
    (e.beginPath(),
      e.moveTo(n[0], n[1]),
      e.lineTo(i[0], i[1]),
      (e.lineWidth = 3),
      (e.strokeStyle = "rgba(0,0,0,.5)"),
      e.stroke(),
      (e.lineWidth = 1),
      (e.strokeStyle = "#fff"),
      e.stroke());
    for (const a of [n, i])
      (e.beginPath(), e.arc(a[0], a[1], 4, 0, Math.PI * 2), (e.fillStyle = "#fff"), e.fill(), e.stroke());
  }
}
function jf(s) {
  return `<svg viewBox="0 0 24 24" width="16" height="16">${['<defs><linearGradient id="gl"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" fill="url(#gl)"/>', '<defs><radialGradient id="gr"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient></defs><rect x="3" y="3" width="18" height="18" fill="url(#gr)"/>', '<rect x="3" y="3" width="18" height="18" fill="#444"/><path d="M12 12 21 12A9 9 0 0 0 12 3z" fill="#bbb"/><path d="M12 12 12 3A9 9 0 0 0 3 12z" fill="#888"/><path d="M12 12 3 12A9 9 0 0 0 12 21z" fill="#555"/>', '<defs><linearGradient id="gf"><stop offset="0" stop-color="#000"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" fill="url(#gf)"/>', '<rect x="3" y="3" width="18" height="18" fill="#000"/><path d="m12 4 8 8-8 8-8-8z" fill="#777"/><path d="m12 8 4 4-4 4-4-4z" fill="#fff"/>'][s]}</svg>`;
}
class Gf {
  id = "bucket";
  name = "Paint Bucket Tool";
  icon = R.bucket;
  shortcut = "G";
  group = "gradient";
  cursor = "crosshair";
  options() {
    return p(
      "div",
      { class: "opts" },
      H("Mode"),
      Ot(h.setting("bucket.mode", "normal"), (e) => h.set("bucket.mode", e)),
      Me("Opacity", h.setting("bucket.opacity", 1), (e) => h.set("bucket.opacity", e)),
      H("Tolerance"),
      q({ value: h.setting("bucket.tol", 32), min: 0, max: 255, width: 40, onInput: (e) => h.set("bucket.tol", e) }),
      $("Anti-alias", h.setting("bucket.aa", !0), (e) => h.set("bucket.aa", e)),
      $("Contiguous", h.setting("bucket.contig", !0), (e) => h.set("bucket.contig", e)),
      $("All Layers", h.setting("bucket.all", !1), (e) => h.set("bucket.all", e)),
    );
  }
  down(e) {
    const t = h.doc,
      n = t.active;
    if (!n?.tex) throw new B("Select a pixel layer.");
    const i = h.setting("bucket.all", !1) ? t.composite : n.tex,
      a = g.read8(i),
      o = Ja(
        a,
        t.width,
        t.height,
        e.x,
        e.y,
        h.setting("bucket.tol", 32),
        h.setting("bucket.contig", !0),
        h.setting("bucket.aa", !0),
      );
    if (t.selection) {
      const r = g.read(t.selection);
      for (let l = 0; l < o.length; l++) o[l] *= r[l * 4];
    }
    Tl(t, o, h.fg, h.setting("bucket.opacity", 1), h.setting("bucket.mode", "normal"));
  }
}
const Sr = () => ({
  font: h.setting("text.font", "Ubuntu"),
  size: h.setting("text.size", 48),
  weight: h.setting("text.weight", 400),
  italic: h.setting("text.italic", !1),
  color: [...h.fg],
  align: h.setting("text.align", "left"),
  lineHeight: h.setting("text.lh", 1.2),
  tracking: h.setting("text.tracking", 0),
  antialias: !0,
});
let qn = [];
class Wf {
  id = "text";
  name = "Horizontal Type Tool";
  icon = R.text;
  shortcut = "T";
  group = "text";
  cursor = "text";
  editing = null;
  activate() {
    qn.length ||
      window.brushboard.sys.fonts().then((e) => {
        ((qn = e), k.emit("tool:options"));
      });
  }
  props() {
    return this.editing?.layer.text || null;
  }
  setProp(e, t, n) {
    n && h.set(n, t);
    const i = this.props();
    i && ((i[e] = t), this.rerender());
  }
  options() {
    const e = this.props() || { ...Sr() },
      t = qn.length
        ? qn
        : [
            "Ubuntu",
            "DejaVu Sans",
            "DejaVu Serif",
            "Liberation Serif",
            "Liberation Sans",
            "Noto Sans",
            "Noto Serif",
            "monospace",
            "serif",
            "sans-serif",
          ];
    t.includes(e.font) || t.unshift(e.font);
    const n = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((o) => ({
        value: o,
        label: {
          100: "Thin",
          200: "Extra Light",
          300: "Light",
          400: "Regular",
          500: "Medium",
          600: "Semibold",
          700: "Bold",
          800: "Extra Bold",
          900: "Black",
        }[o],
      })),
      i = (o, r) =>
        p("button", {
          class: "ibtn" + (e.align === o ? " on" : ""),
          title: `Align ${o}`,
          html: r,
          onclick: () => {
            (this.setProp("align", o, "text.align"), k.emit("tool:options"));
          },
        }),
      a = (o) =>
        `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.6">${o.map(([r, l], c) => `<path d="M${r} ${5 + c * 4.5}H${l}"/>`).join("")}</svg>`;
    return p(
      "div",
      { class: "opts" },
      O(
        t.map((o) => ({ value: o, label: o })),
        e.font,
        (o) => this.setProp("font", o, "text.font"),
        "sel font-sel",
      ),
      O(n, e.weight, (o) => this.setProp("weight", o, "text.weight")),
      p("button", {
        class: "ibtn" + (e.italic ? " on" : ""),
        title: "Italic",
        onclick: () => {
          (this.setProp("italic", !e.italic, "text.italic"), k.emit("tool:options"));
        },
        html: '<i style="font-family:serif;font-size:15px">I</i>',
      }),
      q({
        value: e.size,
        min: 1,
        max: 2e3,
        unit: "px",
        width: 46,
        onInput: (o) => this.setProp("size", o, "text.size"),
      }),
      N(),
      i(
        "left",
        a([
          [4, 20],
          [4, 15],
          [4, 18],
          [4, 12],
        ]),
      ),
      i(
        "center",
        a([
          [4, 20],
          [7, 17],
          [5, 19],
          [8, 16],
        ]),
      ),
      i(
        "right",
        a([
          [4, 20],
          [9, 20],
          [6, 20],
          [12, 20],
        ]),
      ),
      N(),
      H("Leading"),
      q({
        value: e.lineHeight,
        min: 0.5,
        max: 4,
        step: 0.05,
        width: 40,
        onInput: (o) => this.setProp("lineHeight", o, "text.lh"),
      }),
      H("Tracking"),
      q({
        value: e.tracking,
        min: -50,
        max: 200,
        width: 40,
        onInput: (o) => this.setProp("tracking", o, "text.tracking"),
      }),
      rn(
        () => this.props()?.color || h.fg,
        (o) => {
          o && (this.props() ? this.setProp("color", o) : h.setFg(o));
        },
      ),
      N(),
      this.editing ? p("button", { class: "btn small", onclick: () => this.cancel() }, "Cancel") : null,
      this.editing
        ? p("button", { class: "btn small primary", onclick: () => this.commit() }, "✓ Commit")
        : p(
            "span",
            { class: "opt-hint" },
            "Click to add text · click on a selected path for type on a path · click a text layer to edit · Ctrl+Enter commits",
          ),
    );
  }
  hitText(e, t) {
    const n = h.doc;
    for (const i of n.all()) {
      if (i.kind !== "text" || !i.visible || !i.text) continue;
      const a = Is(i.text);
      if (e >= a.x - 4 && e <= a.x + a.w + 4 && t >= a.y - 4 && t <= a.y + a.h + 4) return i;
    }
    return null;
  }
  down(e) {
    if (this.editing) {
      const a = Is(this.editing.layer.text);
      if (e.x >= a.x - 4 && e.x <= a.x + a.w + 4 && e.y >= a.y - 4 && e.y <= a.y + a.h + 4) return;
      this.commit();
      return;
    }
    const t = h.doc,
      n = this.hitText(e.x, e.y);
    t.begin(n ? "Edit Type Layer" : "Type Tool");
    let i;
    if (n) ((i = n), t.setActive(n.id));
    else {
      ((i = le("text", "Text")),
        (i.text = { ...Sr(), text: "", x: Math.round(e.x), y: Math.round(e.y - h.setting("text.size", 48) * 0.8) }));
      const a = St(t)?.get();
      if (a && !a.subpaths.every((o) => o.nodes.length < 2)) {
        const o = Wa(a, [e.x, e.y]),
          [r, l] = L.xf().docToScreen(o?.pt[0] ?? 0, o?.pt[1] ?? 0);
        o &&
          Math.hypot(r - e.sx, l - e.sy) < 8 &&
          ((i.text.path = K(a)),
          (i.text.align = "left"),
          (i.text.pathOffset = Math.round(Qr(a, o.pt))),
          (i.name = "Type on Path"));
      }
      ((i.tex = t.newLayerTex()), t.insertLayer(i));
    }
    this.startEditor(i, !n);
  }
  startEditor(e, t) {
    const n = p("textarea", { class: "text-editor", spellcheck: !1 });
    ((n.value = e.text.text),
      L.area.appendChild(n),
      (this.editing = { layer: e, area: n, isNew: t }),
      this.position(),
      n.addEventListener("input", () => {
        ((e.text.text = n.value),
          (e.name = (
            n.value.split(`
`)[0] || "Text"
          ).slice(0, 40)),
          this.rerender());
      }),
      n.addEventListener("keydown", (i) => {
        (i.stopPropagation(),
          i.key === "Enter" && (i.ctrlKey || i.metaKey) && (i.preventDefault(), this.commit()),
          i.key === "Escape" && (i.preventDefault(), this.cancel()));
      }),
      n.addEventListener("keyup", (i) => i.stopPropagation()),
      setTimeout(() => n.focus(), 10),
      k.emit("tool:options"),
      (this.unsub = k.on("view:changed", () => this.position())));
  }
  unsub = null;
  position() {
    const e = this.editing;
    if (!e) return;
    const t = e.layer.text,
      n = L.xf(),
      [i, a] = n.docToScreen(t.x, t.y),
      o = e.area.style,
      r = n.zoom;
    ((o.left = i + "px"),
      (o.top = a + "px"),
      (o.font = `${t.italic ? "italic " : ""}${t.weight} ${t.size * r}px "${t.font}", sans-serif`),
      (o.lineHeight = String(t.lineHeight)),
      (o.letterSpacing = t.tracking * r + "px"),
      (o.textAlign = t.align));
    const l = Is(t);
    ((o.width = Math.max(40, l.w * r + t.size * r) + "px"),
      (o.height = Math.max(t.size * r * t.lineHeight, l.h * r) + t.size * r * 0.5 + "px"));
  }
  rerender() {
    const e = this.editing;
    if (!e) return;
    const t = h.doc;
    (_t(t, e.layer), this.position());
  }
  commit() {
    const e = this.editing;
    if (!e) return;
    ((this.editing = null), e.area.remove(), this.unsub?.(), (this.unsub = null));
    const t = h.doc;
    (e.layer.text.text.trim()
      ? (_t(t, e.layer), t.commit())
      : e.isNew
        ? t.cancel()
        : (t.removeLayer(e.layer.id), t.commit("Delete Type Layer")),
      k.emit("tool:options"));
  }
  cancel() {
    const e = this.editing;
    e &&
      ((this.editing = null),
      e.area.remove(),
      this.unsub?.(),
      (this.unsub = null),
      h.doc?.cancel(),
      k.emit("tool:options"));
  }
  deactivate() {
    this.commit();
  }
  key(e, t) {
    return this.editing && t && e.key === "Escape" ? (this.cancel(), !0) : !!this.editing;
  }
  overlay(e, t) {
    const n = this.editing?.layer.text;
    if (!n) return;
    const i = Is(n),
      a = [
        [i.x, i.y],
        [i.x + i.w, i.y],
        [i.x + i.w, i.y + i.h],
        [i.x, i.y + i.h],
      ].map(([o, r]) => t.docToScreen(o, r));
    (e.beginPath(),
      a.forEach(([o, r], l) => (l ? e.lineTo(o, r) : e.moveTo(o, r))),
      e.closePath(),
      e.setLineDash([3, 3]),
      (e.strokeStyle = "rgba(143,180,220,.8)"),
      e.stroke(),
      e.setLineDash([]));
  }
}
class Xt {
  constructor(e) {
    ((this.kind = e),
      (this.id = "shape-" + e),
      (this.name = {
        rect: "Rectangle Tool",
        roundRect: "Rounded Rectangle Tool",
        ellipse: "Ellipse Tool",
        line: "Line Tool",
        polygon: "Polygon Tool",
        star: "Star Tool",
      }[e]),
      (this.icon = {
        rect: R.shapeRect,
        roundRect: R.shapeRect,
        ellipse: R.shapeEllipse,
        line: R.line,
        polygon: R.polygon,
        star: R.star,
      }[e]));
  }
  group = "shape";
  shortcut = "U";
  cursor = "crosshair";
  id;
  name;
  icon;
  a = null;
  b = null;
  options() {
    const e = this.kind,
      t = h.setting("shapeTool.mode", "shape"),
      n = [
        is(
          [
            {
              value: "shape",
              label: "Shape",
              title: "Editable vector shape layer (crisp at any size; edit with the path tools)",
            },
            { value: "path", label: "Path", title: "Draw a path (Paths panel)" },
            { value: "pixels", label: "Pixels", title: "Paint the shape as pixels on a new layer" },
          ],
          t,
          (i) => {
            (h.set("shapeTool.mode", i), k.emit("tool:options"));
          },
        ),
        N(),
      ];
    return (
      t !== "path" &&
        n.push(
          H("Fill"),
          rn(
            () => (h.setting("shape.fillNone", null) ? null : h.fg),
            (i) => {
              i ? (h.setFg(i), h.set("shape.fillNone", null)) : h.set("shape.fillNone", [1, 0, 0]);
            },
            !0,
          ),
          H("Stroke"),
          rn(
            () => h.setting("shape.stroke", null),
            (i) => h.set("shape.stroke", i),
            !0,
          ),
          q({
            value: h.setting("shape.width", e === "line" ? 4 : 0),
            min: 0,
            max: 500,
            unit: "px",
            width: 40,
            step: 0.5,
            onInput: (i) => h.set("shape.width", i),
          }),
        ),
      e === "roundRect" &&
        n.push(
          H("Radius"),
          q({
            value: h.setting("shape.radius", 20),
            min: 0,
            max: 2e3,
            unit: "px",
            width: 44,
            onInput: (i) => h.set("shape.radius", i),
          }),
        ),
      (e === "polygon" || e === "star") &&
        n.push(
          H("Sides"),
          q({
            value: h.setting("shape.sides", 5),
            min: 3,
            max: 100,
            width: 36,
            onInput: (i) => h.set("shape.sides", i),
          }),
        ),
      t === "pixels" && n.push($("Anti-alias", h.setting("shape.aa", !0), (i) => h.set("shape.aa", i))),
      n.push(
        N(),
        p(
          "span",
          { class: "opt-hint" },
          'Right-click a colour chip for "none" · Shift constrains · Alt draws from the centre',
        ),
      ),
      p("div", { class: "opts" }, ...n)
    );
  }
  fromCenter = !1;
  down(e) {
    ((this.a = [e.x, e.y]), (this.b = [e.x, e.y]), (this.fromCenter = !1));
  }
  move(e) {
    if (!this.a) return;
    let t = e.x - this.a[0],
      n = e.y - this.a[1];
    if (e.shift)
      if (this.kind === "line") {
        const i = Math.round(Math.atan2(n, t) / (Math.PI / 4)) * (Math.PI / 4),
          a = Math.hypot(t, n);
        ((t = Math.cos(i) * a), (n = Math.sin(i) * a));
      } else {
        const i = Math.max(Math.abs(t), Math.abs(n));
        ((t = Math.sign(t || 1) * i), (n = Math.sign(n || 1) * i));
      }
    ((this.b = [this.a[0] + t, this.a[1] + n]), (this.fromCenter = e.alt && this.kind !== "line"));
  }
  up() {
    let e = this.a;
    const t = this.b;
    if (((this.a = this.b = null), !e || !t || (Math.abs(t[0] - e[0]) < 1 && Math.abs(t[1] - e[1]) < 1))) return;
    this.fromCenter && (e = [2 * e[0] - t[0], 2 * e[1] - t[1]]);
    const n = h.doc,
      i = h.setting("shapeTool.mode", "shape"),
      a = h.setting("shape.width", this.kind === "line" ? 4 : 0);
    if (i === "pixels") {
      Rl(n, {
        kind: this.kind,
        a: e,
        b: t,
        fill: h.setting("shape.fillNone", null) ? null : h.fg,
        stroke: h.setting("shape.stroke", null),
        strokeWidth: a,
        radius: h.setting("shape.radius", 20),
        sides: h.setting("shape.sides", 5),
        antialias: h.setting("shape.aa", !0),
      });
      return;
    }
    const o = Uf(this.kind, e, t, h.setting("shape.radius", 20), h.setting("shape.sides", 5)),
      l = {
        rect: "Rectangle",
        roundRect: "Rounded Rectangle",
        ellipse: "Ellipse",
        line: "Line",
        polygon: "Polygon",
        star: "Star",
      }[this.kind];
    if (i === "path") {
      (n.transact(`${l} Path`, () => {
        const u = n.workPath ? K(n.workPath) : { subpaths: [], fillRule: "nonzero" };
        (u.subpaths.push(...o.subpaths), (n.workPath = u));
      }),
        (n.activePath = "work"));
      return;
    }
    const c = vs(o);
    (this.kind === "line" &&
      ((c.stroke = h.setting("shape.stroke", null) || [...h.fg]),
      (c.strokeWidth = Math.max(1, a)),
      (c.fill = null),
      (c.cap = "round")),
      ds(n, l, c, `${l} Tool`));
  }
  overlay(e, t) {
    if (!this.a || !this.b) return;
    const n = this.a,
      i = this.b;
    if ((e.beginPath(), this.kind === "line")) {
      const a = t.docToScreen(...n),
        o = t.docToScreen(...i);
      (e.moveTo(a[0], a[1]), e.lineTo(o[0], o[1]));
    } else if (this.kind === "ellipse") {
      const a = (n[0] + i[0]) / 2,
        o = (n[1] + i[1]) / 2,
        r = Math.abs(i[0] - n[0]) / 2,
        l = Math.abs(i[1] - n[1]) / 2;
      for (let c = 0; c <= 64; c++) {
        const u = (c / 64) * Math.PI * 2,
          [d, f] = t.docToScreen(a + Math.cos(u) * r, o + Math.sin(u) * l);
        c ? e.lineTo(d, f) : e.moveTo(d, f);
      }
    } else
      ([
        [n[0], n[1]],
        [i[0], n[1]],
        [i[0], i[1]],
        [n[0], i[1]],
      ]
        .map(([a, o]) => t.docToScreen(a, o))
        .forEach(([a, o], r) => (r ? e.lineTo(a, o) : e.moveTo(a, o))),
        e.closePath());
    ((e.lineWidth = 1), (e.strokeStyle = "#8fb4dc"), e.stroke());
  }
}
function Uf(s, e, t, n, i) {
  const a = Math.min(e[0], t[0]),
    o = Math.min(e[1], t[1]),
    r = Math.max(e[0], t[0]),
    l = Math.max(e[1], t[1]);
  if (s === "rect") return { subpaths: [di(a, o, r, l)], fillRule: "nonzero" };
  if (s === "roundRect") return { subpaths: [di(a, o, r, l, n)], fillRule: "nonzero" };
  if (s === "ellipse") return { subpaths: [pi(a, o, r, l)], fillRule: "nonzero" };
  if (s === "line") return { subpaths: [Js([e, t], !1)], fillRule: "nonzero" };
  const c = Math.max(3, i),
    u = (a + r) / 2,
    d = (o + l) / 2,
    f = s === "star" ? c * 2 : c,
    m = [];
  for (let v = 0; v < f; v++) {
    const y = -Math.PI / 2 + (v * Math.PI * 2) / f,
      b = s === "star" && v % 2 ? 0.45 : 1;
    m.push([u + Math.cos(y) * ((r - a) / 2) * b, d + Math.sin(y) * ((l - o) / 2) * b]);
  }
  return { subpaths: [Js(m, !0)], fillRule: "nonzero" };
}
function Hf() {
  return [
    new zf(),
    new If(),
    new Of(),
    new Nf(),
    new Gf(),
    new Wf(),
    new Xt("rect"),
    new Xt("roundRect"),
    new Xt("ellipse"),
    new Xt("polygon"),
    new Xt("star"),
    new Xt("line"),
    new Bf(),
    new $f(),
    new qf(),
  ];
}
const Nn = new Map();
function Vf() {
  let s,
    e,
    t,
    n = null;
  const i = () => h.doc;
  function a() {
    te(t);
    const d = i(),
      f = d?.active,
      m = !f,
      v = Ot(
        f?.blend || "normal",
        (w) => {
          d && f && $e(d, f, { blend: w }, "Blending Change");
        },
        f?.kind === "group" ? ["passThrough"] : [],
      );
    v.disabled = m || (f?.kind === "adjustment" && !1);
    const y = f?.opacity ?? 1,
      b = q({
        label: "Opacity",
        value: Math.round(y * 100),
        min: 0,
        max: 100,
        unit: "%",
        width: 36,
        onInput: (w) => {
          f && ((f.opacity = w / 100), d.invalidate());
        },
        onCommit: (w) => {
          d && f && ((f.opacity = y), $e(d, f, { opacity: w / 100 }, "Opacity Change"));
        },
      }),
      x = (w, _, M) =>
        p("button", {
          class: "ibtn tiny" + (f && f[w] ? " on" : ""),
          title: M,
          html: _,
          disabled: m,
          onclick: () => {
            d && f && $e(d, f, { [w]: !f[w] }, "Lock Change");
          },
        });
    t.append(
      p("div", { class: "lp-row" }, v, b),
      p(
        "div",
        { class: "lp-row" },
        p("span", { class: "opt-label" }, "Lock"),
        x("lockAlpha", R.lockAlpha, "Lock transparent pixels"),
        x("lockPixels", R.brush, "Lock image pixels"),
        x("lockPosition", R.move, "Lock position"),
        p("button", {
          class: "ibtn tiny" + (f && f.lockAlpha && f.lockPixels && f.lockPosition ? " on" : ""),
          title: "Lock all",
          html: R.lock,
          disabled: m,
          onclick: () => {
            if (d && f) {
              const w = !(f.lockAlpha && f.lockPixels && f.lockPosition);
              $e(d, f, { lockAlpha: w, lockPixels: w, lockPosition: w }, "Lock Change");
            }
          },
        }),
        p("span", { class: "flex1" }),
        d && d.editMask && f?.mask ? p("span", { class: "chip on small" }, "Editing mask") : null,
      ),
    );
  }
  function o(d) {
    let f = Nn.get(d.id);
    if (
      (f ||
        ((f = { v: -1, c: p("canvas", { class: "lthumb" }), mv: -1, m: null, mt: null, tt: null }), Nn.set(d.id, f)),
      (f.tt !== d.tex || f.v !== d.version) && ((f.tt = d.tex), (f.v = d.version), d.tex))
    )
      try {
        pn(f.c, d.tex, 36, 36);
      } catch {}
    if (d.mask && (f.m || (f.m = p("canvas", { class: "lthumb mask" })), f.mt !== d.mask || f.mv !== d.version)) {
      ((f.mt = d.mask), (f.mv = d.version));
      try {
        pn(f.m, d.mask, 36, 36, !0);
      } catch {}
    }
    return { c: f.c, m: d.mask ? f.m : null };
  }
  function r(d, f, m) {
    const v = d.activeId === f.id,
      y = d.selectedIds.has(f.id),
      b = p("button", {
        class: "leye" + (f.visible ? "" : " off"),
        title: "Toggle visibility (Alt-click: solo)",
        html: f.visible ? R.eye : "",
      });
    b.addEventListener("click", (S) => {
      if ((S.stopPropagation(), S.altKey)) {
        const P = d.all().filter((D) => D !== f),
          E = P.some((D) => D.visible);
        d.transact("Show/Hide", () => {
          (P.forEach((D) => (D.visible = !E)), (f.visible = !0), d.invalidate());
        });
      } else $e(d, f, { visible: !f.visible }, f.visible ? "Hide Layer" : "Show Layer");
    });
    let x;
    if (f.kind === "group") x = p("span", { class: "lthumb-ic" }, Ks(f.expanded ? R.folderOpen : R.folder));
    else if (f.kind === "adjustment")
      x = p("span", { class: "lthumb-ic adj", title: f.adjust ? Xe[f.adjust.type] : "" }, Ks(R.adjust));
    else {
      const S = o(f).c;
      ((x = p(
        "span",
        { class: "lthumb-wrap" + (!d.editMask && v ? " target" : "") + (f.kind === "text" ? " text" : "") },
        S,
        f.kind === "text"
          ? p("span", { class: "tbadge" }, "T")
          : f.kind === "shape"
            ? p("span", { class: "tbadge shape", title: "Shape layer (vector)", html: R.shapeLayer })
            : null,
      )),
        x.addEventListener("click", (P) => {
          if (P.ctrlKey) {
            (P.stopPropagation(), hs(d, f, P.shiftKey ? "add" : P.altKey ? "subtract" : "replace"));
            return;
          }
          v && d.editMask && ((d.editMask = !1), k.emit("doc:layers", d));
        }));
    }
    let w = null;
    if (f.mask) {
      const S = o(f).m;
      ((w = p(
        "span",
        {
          class: "lthumb-wrap mask" + (d.editMask && v ? " target" : "") + (f.maskEnabled ? "" : " disabled"),
          title:
            "Layer mask — click to edit, Alt-click to view, Shift-click to disable, Ctrl-click to load as selection",
        },
        S,
      )),
        w.addEventListener("click", (P) => {
          P.stopPropagation();
          const E = P;
          if (E.shiftKey) {
            $e(d, f, { maskEnabled: !f.maskEnabled }, f.maskEnabled ? "Disable Layer Mask" : "Enable Layer Mask");
            return;
          }
          if (E.ctrlKey) {
            hs(d, f, "replace", !0);
            return;
          }
          if (E.altKey) {
            ((d.maskViewId = d.maskViewId === f.id ? null : f.id), d.invalidate(), k.emit("render"));
            return;
          }
          (d.setActive(f.id), (d.editMask = !0), k.emit("doc:layers", d));
        }));
    }
    let _ = null;
    if (f.vmask) {
      const S = p("canvas", { width: 28, height: 28 }),
        P = S.getContext("2d");
      ((P.fillStyle = "#3a4047"), P.fillRect(0, 0, 28, 28));
      const E = Math.min(28 / d.width, 28 / d.height);
      (P.save(),
        P.translate((28 - d.width * E) / 2, (28 - d.height * E) / 2),
        P.scale(E, E),
        (P.fillStyle = "#e3e7eb"),
        P.fill(Di(f.vmask), f.vmask.fillRule === "evenodd" ? "evenodd" : "nonzero"),
        P.restore(),
        (_ = p(
          "span",
          {
            class:
              "lthumb-wrap mask vmask" +
              (f.vmaskEnabled === !1 ? " disabled" : "") +
              (d.activePath === `vmask:${f.id}` ? " target" : ""),
            title: "Vector mask — click to edit its path, Shift-click to disable, Ctrl-click to load as selection",
          },
          S,
        )),
        _.addEventListener("click", (D) => {
          D.stopPropagation();
          const j = D;
          if (j.shiftKey) {
            h.run("layer.vmaskToggle");
            return;
          }
          if (j.ctrlKey) {
            Sn(d, f.vmask);
            return;
          }
          (d.setActive(f.id),
            (d.activePath = `vmask:${f.id}`),
            ["directSelect", "pathSelect", "pen"].includes(h.tool?.id || "") || h.setTool("directSelect"),
            k.emit("doc:layers", d));
        }));
    }
    const M = p("span", { class: "lname" }, f.name);
    M.addEventListener("dblclick", (S) => {
      S.stopPropagation();
      const P = p("input", { class: "lrename", value: f.name });
      (M.replaceWith(P), P.focus(), P.select());
      const E = (D) => {
        D && P.value.trim() && P.value !== f.name
          ? $e(d, f, { name: P.value.trim() }, "Rename Layer")
          : k.emit("doc:layers", d);
      };
      (P.addEventListener("keydown", (D) => {
        (D.stopPropagation(), D.key === "Enter" && E(!0), D.key === "Escape" && E(!1));
      }),
        P.addEventListener("blur", () => E(!0)));
    });
    const T =
        f.kind === "group"
          ? p("button", {
              class: "lchev",
              html: f.expanded ? R.chevronDown : R.chevronRight,
              onclick: (S) => {
                (S.stopPropagation(), (f.expanded = !f.expanded), c());
              },
            })
          : p("span", { class: "lchev-sp" }),
      C = !!(f.fx && Object.values(f.fx).some((S) => S?.enabled)),
      A = p(
        "div",
        {
          class:
            "lrow" + (v ? " active" : y ? " selected" : "") + (f.visible ? "" : " hidden") + (f.clip ? " clipped" : ""),
          draggable: !0,
          "data-id": f.id,
          style: { paddingLeft: 4 + m * 14 + "px" },
        },
        b,
        T,
        f.clip ? p("span", { class: "clip-arrow", html: R.clip }) : null,
        x,
        w,
        _,
        M,
        C
          ? p(
              "span",
              {
                class: "fx-badge",
                title: "Layer style",
                onclick: (S) => {
                  (S.stopPropagation(), h.run("layer.style"));
                },
              },
              "fx",
            )
          : null,
        f.lockPixels || f.lockPosition || f.lockAlpha ? p("span", { class: "lock-badge", html: R.lock }) : null,
        f.blend !== "normal" && f.blend !== "passThrough"
          ? p("span", { class: "blend-badge", title: li[f.blend] }, li[f.blend].slice(0, 3))
          : null,
      );
    (A.addEventListener("click", (S) => {
      const P = S;
      if (P.shiftKey && d.activeId) {
        const E = l(d),
          D = E.findIndex((G) => G.id === d.activeId),
          j = E.findIndex((G) => G.id === f.id),
          [U, V] = D < j ? [D, j] : [j, D];
        for (let G = U; G <= V; G++) d.selectedIds.add(E[G].id);
        ((d.activeId = f.id), k.emit("doc:layers", d));
        return;
      }
      if (P.ctrlKey) {
        d.selectedIds.has(f.id) && d.selectedIds.size > 1
          ? (d.selectedIds.delete(f.id), k.emit("doc:layers", d))
          : d.setActive(f.id, !0);
        return;
      }
      (f.kind === "adjustment" && (d.editMask = !!f.mask), d.setActive(f.id));
    }),
      A.addEventListener("dblclick", () => {
        f.kind === "adjustment" || f.kind === "text" ? h.run("panel.properties") : h.run("layer.style");
      }),
      A.addEventListener("contextmenu", (S) => {
        (d.selectedIds.has(f.id) || d.setActive(f.id), Ft(S, Xf(d, f)));
      }),
      A.addEventListener("dragstart", (S) => {
        ((n = f.id),
          S.dataTransfer.setData("text/x-brushboard-layer", f.id),
          (S.dataTransfer.effectAllowed = "move"),
          A.classList.add("dragging"));
      }),
      A.addEventListener("dragend", () => {
        ((n = null),
          A.classList.remove("dragging"),
          e
            .querySelectorAll(".drop-above,.drop-below,.drop-inside")
            .forEach((S) => S.classList.remove("drop-above", "drop-below", "drop-inside")));
      }),
      A.addEventListener("dragover", (S) => {
        if (!n || n === f.id) return;
        S.preventDefault();
        const P = A.getBoundingClientRect(),
          E = (S.clientY - P.top) / P.height;
        (A.classList.remove("drop-above", "drop-below", "drop-inside"),
          A.classList.add(
            f.kind === "group" && E > 0.3 && E < 0.7 ? "drop-inside" : E < 0.5 ? "drop-above" : "drop-below",
          ));
      }),
      A.addEventListener("dragleave", () => A.classList.remove("drop-above", "drop-below", "drop-inside")),
      A.addEventListener("drop", (S) => {
        if ((S.preventDefault(), !n)) return;
        const P = A.classList.contains("drop-inside")
          ? "inside"
          : A.classList.contains("drop-above")
            ? "above"
            : "below";
        kl(d, n, f.id, P);
      }));
    const F = [A];
    if (f.kind === "group" && f.expanded) for (const S of f.children) F.push(...r(d, S, m + 1));
    return F;
  }
  function l(d) {
    const f = [],
      m = (v) =>
        v.forEach((y) => {
          (f.push(y), y.kind === "group" && y.expanded && m(y.children));
        });
    return (m(d.layers), f);
  }
  function c() {
    (a(), te(e));
    const d = i();
    if (!d) {
      e.appendChild(p("div", { class: "empty-panel" }, "No document"));
      return;
    }
    for (const f of d.layers) e.append(...r(d, f, 0));
    for (const f of [...Nn.keys()]) !d.find(f) && !h.docs.some((m) => m.find(f)) && Nn.delete(f);
  }
  const u = Ne(() => {
    const d = i();
    if (d) for (const f of d.all()) (f.tex || f.mask) && o(f);
  }, 120);
  return {
    id: "layers",
    title: "Layers",
    create() {
      ((t = p("div", { class: "lp-top" })),
        (e = p("div", { class: "llist" })),
        e.addEventListener("contextmenu", (v) => {
          v.target === e &&
            Ft(v, [
              { label: "New Layer", cmd: "layer.new" },
              { label: "New Group", cmd: "layer.newGroup" },
            ]);
        }));
      const d = p("button", { class: "ibtn", title: "New fill or adjustment layer", html: R.adjust });
      d.addEventListener("click", (v) =>
        Ft(
          v,
          ci.map((y) => (y === "-" ? "-" : { label: Xe[y] + "…", run: () => h.run("adjlayer." + y) })),
        ),
      );
      const f = p("button", { class: "ibtn", title: "Layer style", html: R.fx, onclick: () => h.run("layer.style") }),
        m = p(
          "div",
          { class: "lp-bottom" },
          f,
          p("button", {
            class: "ibtn",
            title: "Add layer mask (from selection if any)",
            html: R.mask,
            onclick: () => h.run("layer.addMask"),
          }),
          d,
          p("button", { class: "ibtn", title: "New group", html: R.folder, onclick: () => h.run("layer.newGroup") }),
          p("button", { class: "ibtn", title: "New layer", html: R.newLayer, onclick: () => h.run("layer.new") }),
          p("button", { class: "ibtn", title: "Delete layer", html: R.trash, onclick: () => h.run("layer.delete") }),
        );
      return (
        (s = p("div", { class: "layers-panel" }, t, e, m)),
        k.on("doc:layers", c),
        k.on("doc:active", c),
        k.on("doc:pixels", u),
        k.on("doc:history", () => u()),
        c(),
        s
      );
    },
    menu: () => [
      { label: "New Layer…", run: () => h.run("layer.new") },
      { label: "Duplicate Layer", run: () => h.run("layer.duplicate") },
      { label: "Delete Layer", run: () => h.run("layer.delete") },
      { label: "Merge Down", run: () => h.run("layer.mergeDown") },
      { label: "Merge Visible", run: () => h.run("layer.mergeVisible") },
      { label: "Flatten Image", run: () => h.run("layer.flatten") },
    ],
  };
}
function Xf(s, e) {
  return [
    { label: "Layer Properties…", run: () => h.run("layer.rename") },
    { label: "Blending Options…", cmd: "layer.style" },
    "-",
    { label: "Duplicate Layer", cmd: "layer.duplicate" },
    { label: "Delete Layer", cmd: "layer.delete" },
    "-",
    { label: "Group from Layers", cmd: "layer.group" },
    e.kind === "group" ? { label: "Ungroup Layers", cmd: "layer.ungroup" } : "-",
    "-",
    { label: "Select Pixels", run: () => hs(s, e) },
    e.mask ? { label: "Delete Layer Mask", run: () => tn(s, !1) } : { label: "Add Layer Mask", cmd: "layer.addMask" },
    e.mask ? { label: "Apply Layer Mask", run: () => tn(s, !0) } : "-",
    e.mask
      ? {
          label: e.maskEnabled ? "Disable Layer Mask" : "Enable Layer Mask",
          run: () => $e(s, e, { maskEnabled: !e.maskEnabled }, "Toggle Mask"),
        }
      : "-",
    { label: e.clip ? "Release Clipping Mask" : "Create Clipping Mask", cmd: "layer.clip" },
    "-",
    e.vmask ? { label: "Vector Mask", submenu: ou } : { label: "Add Vector Mask", cmd: "layer.vmaskReveal" },
    "-",
    e.kind === "shape"
      ? { label: "Rasterize Shape", cmd: "layer.rasterize" }
      : e.kind === "text"
        ? { label: "Rasterize Type", cmd: "layer.rasterize" }
        : e.fx
          ? { label: "Rasterize Layer Style", cmd: "layer.rasterize" }
          : e.kind === "group"
            ? { label: "Merge Group", cmd: "layer.rasterize" }
            : "-",
    { label: "Merge Down", cmd: "layer.mergeDown" },
    { label: "Merge Visible", cmd: "layer.mergeVisible" },
    { label: "Flatten Image", cmd: "layer.flatten" },
    "-",
    {
      label: "Label Color",
      submenu: [
        ["None", ""],
        ["Red", "#a8443a"],
        ["Orange", "#b8743a"],
        ["Yellow", "#b8a03a"],
        ["Green", "#5c8a4a"],
        ["Blue", "#4a6a9a"],
        ["Violet", "#7a5a9a"],
        ["Gray", "#6a6a6a"],
      ].map(([t, n]) => ({
        label: t,
        run: () => {
          ((e.color = n || void 0), k.emit("doc:layers", s));
        },
      })),
    },
  ];
}
function Yf() {
  let s;
  const e = () => {
    te(s);
    const t = h.doc;
    if (!t) {
      s.appendChild(p("div", { class: "empty-panel" }, "No document"));
      return;
    }
    const n = (a, o) => {
      const r = p(
        "div",
        { class: "hrow" + (t.historyIndex === o ? " active" : t.historyIndex < o ? " future" : "") },
        p("span", { class: "hdot" }),
        a,
      );
      return (r.addEventListener("click", () => t.goto(o)), r);
    };
    (s.appendChild(n(t.path || t.sourcePath ? "Open" : "New Document", 0)),
      t.history.forEach((a, o) => s.appendChild(n(a.label, o + 1))),
      s.querySelector(".active")?.scrollIntoView({ block: "nearest" }));
  };
  return {
    id: "history",
    title: "History",
    create() {
      return (
        (s = p("div", { class: "hlist" })),
        k.on("doc:history", e),
        k.on("doc:active", e),
        e(),
        p(
          "div",
          { class: "history-panel" },
          s,
          p(
            "div",
            { class: "lp-bottom" },
            p("button", {
              class: "ibtn",
              title: "Step backward (Ctrl+Z)",
              html: R.undo,
              onclick: () => h.run("edit.undo"),
            }),
            p("button", {
              class: "ibtn",
              title: "Step forward (Ctrl+Shift+Z)",
              html: R.redo,
              onclick: () => h.run("edit.redo"),
            }),
            p("button", {
              class: "ibtn",
              title: "New document from current state",
              html: R.snapshot,
              onclick: () => h.run("image.duplicate"),
            }),
          ),
        )
      );
    },
  };
}
function Kf() {
  let s = "fg",
    e,
    t;
  const n = () => {
    te(t);
    const i = p("div", {
        class: "cchip fg" + (s === "fg" ? " on" : ""),
        title: "Foreground",
        style: { background: fe(h.fg) },
        onclick: () => {
          ((s = "fg"), e.set(h.fg), n());
        },
      }),
      a = p("div", {
        class: "cchip bg" + (s === "bg" ? " on" : ""),
        title: "Background",
        style: { background: fe(h.bg) },
        onclick: () => {
          ((s = "bg"), e.set(h.bg), n());
        },
      });
    t.append(
      p("div", { class: "cchips" }, a, i),
      p("span", { class: "chex" }, qe(s === "fg" ? h.fg : h.bg).toUpperCase()),
    );
  };
  return {
    id: "color",
    title: "Color",
    create() {
      t = p("div", { class: "color-top" });
      const i = () =>
        new Co(
          s === "fg" ? h.fg : h.bg,
          (r) => {
            s === "fg" ? h.setFg(r) : h.setBg(r);
          },
          !0,
        );
      e = i();
      const a = p("div", { class: "color-panel" }, t, e.el),
        o = () => {
          if ((h.doc?.ink ?? null) === e.ink) return;
          const r = i();
          (e.el.replaceWith(r.el), (e = r));
        };
      return (
        k.on("doc:active", o),
        k.on("doc:mode", o),
        k.on("colors:changed", () => {
          (e.set(s === "fg" ? h.fg : h.bg), n());
        }),
        n(),
        a
      );
    },
  };
}
const Jf = [
    ["Lead White", [0.95, 0.93, 0.87]],
    ["Vellum", [0.93, 0.88, 0.77]],
    ["Lead-Tin Yellow", [0.94, 0.82, 0.37]],
    ["Yellow Ochre", [0.78, 0.6, 0.27]],
    ["Raw Sienna", [0.72, 0.47, 0.22]],
    ["Burnt Sienna", [0.56, 0.27, 0.15]],
    ["Vermilion", [0.85, 0.26, 0.17]],
    ["Carmine Lake", [0.62, 0.11, 0.21]],
    ["Madder Rose", [0.82, 0.48, 0.5]],
    ["Raw Umber", [0.39, 0.31, 0.2]],
    ["Burnt Umber", [0.33, 0.2, 0.13]],
    ["Bone Black", [0.11, 0.1, 0.09]],
    ["Verdigris", [0.26, 0.55, 0.47]],
    ["Green Earth", [0.48, 0.53, 0.38]],
    ["Malachite", [0.27, 0.62, 0.44]],
    ["Sap Green", [0.33, 0.42, 0.18]],
    ["Lapis Ultramarine", [0.15, 0.25, 0.62]],
    ["Smalt", [0.3, 0.38, 0.62]],
    ["Azurite", [0.22, 0.38, 0.6]],
    ["Indigo", [0.17, 0.18, 0.33]],
    ["Plum Violet", [0.37, 0.2, 0.36]],
    ["Pear Gold", [0.79, 0.64, 0.36]],
    ["Fig Purple", [0.38, 0.22, 0.3]],
    ["Cherry", [0.64, 0.09, 0.14]],
  ],
  Zf = [
    [0, 0, 0],
    [0.25, 0.25, 0.25],
    [0.5, 0.5, 0.5],
    [0.75, 0.75, 0.75],
    [1, 1, 1],
    [1, 0, 0],
    [1, 0.5, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
    [1, 0, 1],
  ];
function Qf() {
  let s;
  const e = () => {
    te(s);
    const t = (n, i, a) => {
      const o = p("button", { class: "swatch", title: i + " " + qe(n), style: { background: fe(n) } });
      return (
        o.addEventListener("click", (r) => {
          if (r.ctrlKey && a >= 0) {
            (h.swatches.splice(a, 1), h.savePrefsSoon(), e());
            return;
          }
          r.altKey ? h.setBg(n) : h.setFg(n);
        }),
        a >= 0 &&
          o.addEventListener("contextmenu", (r) =>
            Ft(r, [
              {
                label: "Delete Swatch",
                run: () => {
                  (h.swatches.splice(a, 1), h.savePrefsSoon(), e());
                },
              },
            ]),
          ),
        o
      );
    };
    (s.append(
      p("div", { class: "sw-title" }, "Recent & Custom"),
      p(
        "div",
        { class: "sw-grid" },
        ...h.swatches.map((n, i) => t(n, "Custom", i)),
        p(
          "button",
          {
            class: "swatch add",
            title: "Add foreground color",
            onclick: () => {
              (h.swatches.push([...h.fg]), h.savePrefsSoon(), e());
            },
          },
          "+",
        ),
      ),
    ),
      s.append(
        p("div", { class: "sw-title" }, "Baroque Pigments"),
        p("div", { class: "sw-grid" }, ...Jf.map(([n, i]) => t(i, n, -1))),
      ),
      s.append(
        p("div", { class: "sw-title" }, "Basic"),
        p("div", { class: "sw-grid" }, ...Zf.map((n) => t(n, "Basic", -1))),
      ));
  };
  return {
    id: "swatches",
    title: "Swatches",
    create() {
      return ((s = p("div", { class: "swatches-panel" })), e(), s);
    },
  };
}
function em() {
  let s;
  const e = new Set(["tip", "presets"]),
    t = () => (h.tool?.brushCursor ? h.tool.id : "brush"),
    n = () => {
      const i = s.scrollTop;
      te(s);
      const a = t(),
        o = h.brushFor(a),
        r = (m, v, y = 100, b = 0) =>
          Q({
            label: m,
            value: Math.round((o[v] ?? 0) * 100),
            min: b,
            max: y,
            unit: "%",
            onInput: (x) => {
              ((o[v] = x / 100), f());
            },
          }),
        l = (m, v, y, b, x = "px", w = 1) =>
          Q({
            label: m,
            value: o[v] ?? 0,
            min: y,
            max: b,
            step: w,
            unit: x,
            onInput: (_) => {
              ((o[v] = _), f());
            },
          }),
        c = (m, v) =>
          $(m, !!o[v], (y) => {
            ((o[v] = y), f());
          }),
        u = (m, v, ...y) => {
          const b = p("details", { class: "bsec", open: e.has(m) }, p("summary", null, v), ...y.filter(Boolean));
          return (
            b.addEventListener("toggle", () => {
              b.open ? e.add(m) : e.delete(m);
            }),
            b
          );
        },
        d = p("div", { class: "brush-live" }),
        f = Ne(() => {
          (te(d), d.appendChild(lc(o, 250, 44, a === "mixer")));
        }, 120);
      (f(),
        f.flush(),
        s.append(
          p("div", { class: "sw-title" }, `${h.tools.get(a)?.name || a} — ${o.name}`),
          d,
          u("presets", "Presets", uc(a, n, 96, 22, "preset-list compact")),
          u(
            "tip",
            "Tip shape",
            cc(o, n),
            Q({
              label: "Size",
              value: o.size,
              min: 1,
              max: 2500,
              unit: "px",
              onInput: (m) => {
                ((o.size = m), k.emit("tool:options:soft"), f());
              },
            }),
            r("Hardness", "hardness"),
            r("Spacing", "spacing", 300, 1),
            Q({
              label: "Angle",
              value: o.angle,
              min: -180,
              max: 180,
              unit: "°",
              onInput: (m) => {
                ((o.angle = m), f());
              },
            }),
            r("Roundness", "roundness", 100, 1),
            o.tip === "bristle" ? l("Bristles", "bristles", 4, 80, "") : null,
            o.tip === "bristle" ? l("Paint load (dry after)", "bristleDry", 0, 3e3) : null,
          ),
          u(
            "dyn",
            "Pressure & pen",
            p(
              "div",
              { class: "form-row" },
              c("Pressure → size", "sizePressure"),
              c("Pressure → opacity", "opacityPressure"),
            ),
            p("div", { class: "form-row" }, c("Pressure → flow", "flowPressure")),
            r("Minimum size", "minSize"),
            p(
              "div",
              { class: "form-row" },
              c("Tilt steers angle", "tiltAngle"),
              c("Barrel rotation steers angle", "twistAngle"),
            ),
            l("Tilt → size", "tiltSize", 0, 4, "×", 0.1),
            r("Tilt → lighter", "tiltOpacity"),
            p("p", { class: "hint" }, "Pressure response, eraser end and buttons: Edit › Tablet & Pen…"),
          ),
          u(
            "stroke",
            "Stroke shape",
            p("div", { class: "form-row" }, c("Follow stroke direction", "followDirection")),
            Q({
              label: "Speed → thinner",
              value: Math.round((o.speedSize ?? 0) * 100),
              min: -100,
              max: 100,
              unit: "%",
              onInput: (m) => {
                ((o.speedSize = m / 100), f());
              },
            }),
            l("Taper start", "taper", 0, 400),
            r("Smoothing", "smoothing"),
          ),
          u(
            "texture",
            "Paper grain",
            r("Grain", "grain"),
            l("Grain size", "grainScale", 0.5, 12, "px", 0.1),
            p("div", { class: "form-row" }, c("Pressure pushes into grain (charcoal, pastel)", "grainPressure")),
          ),
          u(
            "wet",
            "Wet edges",
            r("Wet edges", "wetEdges"),
            p(
              "p",
              { class: "hint" },
              "Pigment pools at the edge of each stroke, like drying watercolour. Pair with Multiply for glazing.",
            ),
          ),
          u(
            "spray",
            "Spray particles",
            l("Particles per dab", "particles", 0, 400, ""),
            l("Particle size", "particleSize", 0.3, 12, "px", 0.1),
          ),
          u(
            "jitter",
            "Scatter & jitter",
            r("Scatter", "scatter", 500),
            r("Size jitter", "sizeJitter"),
            r("Angle jitter", "angleJitter"),
            r("Hue jitter", "hueJitter"),
          ),
          a === "mixer"
            ? u("mixer", "Mixer", r("Wet (pick up canvas colour)", "mixWet"), r("Load (paint reservoir)", "mixLoad"))
            : null,
          p("div", { class: "form-row" }, c("Airbrush build-up", "buildup")),
        ),
        (s.scrollTop = i));
    };
  return {
    id: "brushes",
    title: "Brushes",
    create() {
      return (
        (s = p("div", { class: "brushes-panel" })),
        k.on("tool:changed", n),
        k.on("tool:options", Ne(n, 50)),
        n(),
        s
      );
    },
  };
}
function tm() {
  let s, e, t, n, i;
  const r = () => {
      const c = h.doc,
        u = t.getContext("2d");
      if (((t.width = e.width), (t.height = e.height), u.clearRect(0, 0, t.width, t.height), !c)) return;
      const d = e.width / c.width,
        f = L.xf(),
        m = [
          [0, 0],
          [L.cssW, 0],
          [L.cssW, L.cssH],
          [0, L.cssH],
        ].map(([v, y]) => f.screenToDoc(v, y));
      (u.beginPath(),
        m.forEach(([v, y], b) => (b ? u.lineTo(v * d, y * d) : u.moveTo(v * d, y * d))),
        u.closePath(),
        (u.lineWidth = 2),
        (u.strokeStyle = "#d4553f"),
        u.stroke(),
        (i.textContent = Math.round(c.view.zoom * L.dpr * 1e3) / 10 + "%"),
        (n.value = String(Math.log2(c.view.zoom * L.dpr))));
    },
    l = Ne(() => {
      const c = h.doc;
      if (!c) {
        ((e.width = 1), (e.height = 1));
        return;
      }
      (pn(e, c.composite, 260, 150), r());
    }, 250);
  return {
    id: "navigator",
    title: "Navigator",
    create() {
      ((e = p("canvas", { class: "nav-img" })),
        (t = p("canvas", { class: "nav-ov" })),
        (i = p("span", { class: "nav-zoom" })),
        (n = p("input", { type: "range", min: -6, max: 6, step: 0.01 })),
        n.addEventListener("input", () => {
          h.doc && L.zoomAt(Math.pow(2, parseFloat(n.value)) / L.dpr, void 0, void 0, !0);
        }));
      const c = p("div", { class: "nav-stage" }, e, t),
        u = (d) => {
          const f = h.doc;
          if (!f) return;
          const m = e.getBoundingClientRect(),
            v = Math.min(m.width / e.width, m.height / e.height),
            y = e.width * v,
            b = e.height * v,
            x = { left: m.left + (m.width - y) / 2, top: m.top + (m.height - b) / 2, width: y, height: b },
            w = ((d.clientX - x.left) / x.width) * f.width,
            _ = ((d.clientY - x.top) / x.height) * f.height,
            M = L.xf(),
            [T, C] = M.docToScreen(w, _);
          ((f.view.panX += L.cssW / 2 - T), (f.view.panY += L.cssH / 2 - C), L.viewChanged());
        };
      return (
        c.addEventListener("pointerdown", (d) => {
          (c.setPointerCapture(d.pointerId), u(d));
          const f = (v) => u(v),
            m = () => {
              (c.removeEventListener("pointermove", f), c.removeEventListener("pointerup", m));
            };
          (c.addEventListener("pointermove", f), c.addEventListener("pointerup", m));
        }),
        (s = p(
          "div",
          { class: "navigator-panel" },
          c,
          p(
            "div",
            { class: "nav-bar" },
            i,
            p("button", { class: "ibtn tiny", html: R.minimize, onclick: () => L.zoomStep(-1) }),
            n,
            p("button", { class: "ibtn tiny", html: R.plus, onclick: () => L.zoomStep(1) }),
          ),
        )),
        k.on("composited", l),
        k.on("doc:active", l),
        k.on("view:changed", r),
        l(),
        s
      );
    },
    onShow: () => l(),
  };
}
function sm() {
  let s,
    e,
    t = "colors";
  const n = Ne(() => {
    const i = h.doc,
      a = s.getContext("2d"),
      o = s.width,
      r = s.height;
    if ((a.clearRect(0, 0, o, r), (a.fillStyle = we("--bg0")), a.fillRect(0, 0, o, r), !i)) {
      e.textContent = "";
      return;
    }
    const l = Ni(i.composite, 384),
      c = (x, w, _) => {
        ((a.globalCompositeOperation = _), (a.fillStyle = w), a.beginPath(), a.moveTo(0, r));
        let M = 1;
        for (let T = 1; T < 255; T++) M = Math.max(M, x[T]);
        for (let T = 0; T < 256; T++) a.lineTo((T / 255) * o, r - Math.min(1, x[T] / M) * (r - 4));
        (a.lineTo(o, r), a.closePath(), a.fill());
      };
    (t === "colors"
      ? (c(l.r, "#c8483c", "lighter"), c(l.g, "#3ea84a", "lighter"), c(l.b, "#3d5bd0", "lighter"))
      : c(
          t === "lum" ? l.l : l[t],
          t === "lum" ? we("--text2") : t === "r" ? "#c8483c" : t === "g" ? "#3ea84a" : "#3d5bd0",
          "source-over",
        ),
      (a.globalCompositeOperation = "source-over"));
    const u = t === "colors" || t === "lum" ? l.l : l[t];
    let d = 0,
      f = 0;
    for (let x = 0; x < 256; x++) ((d += u[x]), (f += u[x] * x));
    const m = d ? f / d : 0;
    let v = 0;
    for (let x = 0; x < 256; x++) v += u[x] * (x - m) ** 2;
    let y = 0,
      b = 0;
    for (let x = 0; x < 256; x++)
      if (((y += u[x]), y >= d / 2)) {
        b = x;
        break;
      }
    e.textContent = `Mean ${m.toFixed(1)}   Std Dev ${Math.sqrt(d ? v / d : 0).toFixed(1)}   Median ${b}   Pixels ${d}`;
  }, 300);
  return {
    id: "histogram",
    title: "Histogram",
    create() {
      return (
        (s = p("canvas", { class: "hist-canvas", width: 512, height: 200 })),
        (e = p("div", { class: "hist-stats" })),
        k.on("composited", n),
        k.on("doc:active", n),
        n(),
        p(
          "div",
          { class: "histogram-panel" },
          p(
            "div",
            { class: "row" },
            p("span", { class: "sf-label" }, "Channel"),
            O(
              [
                { value: "colors", label: "Colors" },
                { value: "lum", label: "Luminosity" },
                { value: "r", label: "Red" },
                { value: "g", label: "Green" },
                { value: "b", label: "Blue" },
              ],
              t,
              (i) => {
                ((t = i), n());
              },
            ),
          ),
          s,
          e,
        )
      );
    },
    onShow: () => n(),
  };
}
function nm() {
  let s,
    e = null;
  const t = Ne(() => {
    const n = h.doc;
    if ((te(s), !n)) {
      s.textContent = "No document";
      return;
    }
    const i = e;
    let a = "—",
      o = "—",
      r = "—",
      l = "—",
      c = n.ink ? { cmyk: "—", total: "—", over: !1 } : null;
    if (i && i.x >= 0 && i.y >= 0 && i.x < n.width && i.y < n.height) {
      l = `${Math.floor(i.x)}, ${Math.floor(i.y)}`;
      const f = L.sample(i.x, i.y, 1);
      if (f) {
        a =
          f
            .slice(0, 3)
            .map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255))
            .join(", ") + `  α ${Math.round(f[3] * 100)}%`;
        const m = pa(f[0], f[1], f[2]);
        ((o = `${Math.round(m[0] * 360)}°, ${Math.round(m[1] * 100)}%, ${Math.round(m[2] * 100)}%`),
          (r = f
            .slice(0, 3)
            .map((v) => v.toFixed(4))
            .join("  ")));
      }
      n.ink && (c = wu(n, i.x, i.y, (m, v) => L.sampleInk(m, v, 1)));
    }
    const u = n.selection ? at(n) : null,
      d = (f, m) => p("div", { class: "irow" }, p("span", null, f), p("code", null, m));
    s.append(
      d("X, Y", l),
      ...(c
        ? [
            d("CMYK", c.cmyk),
            p(
              "div",
              { class: "irow" + (c.over ? " warn" : "") },
              p("span", null, "Total ink"),
              p("code", null, c.total),
            ),
          ]
        : []),
      d("RGB", a),
      d("HSB", o),
      d("Float", r),
      d("Document", `${n.width} × ${n.height} px · ${n.bitDepth}-bit · ${n.ink ? "CMYK — " + n.ink.name : "sRGB"}`),
      d("Selection", u ? `${u.w} × ${u.h} at ${u.x}, ${u.y}` : "none"),
      d("Zoom", `${Math.round(n.view.zoom * L.dpr * 1e3) / 10}%  ·  rotation ${Math.round(n.view.rotation)}°`),
      d("GPU", `${g.live.size} textures · max ${g.maxTex}px`),
    );
  }, 30);
  return {
    id: "info",
    title: "Info",
    create() {
      return (
        (s = p("div", { class: "info-panel" })),
        k.on("cursor", (n) => {
          ((e = n), t());
        }),
        k.on("doc:active", t),
        k.on("doc:selection", t),
        t(),
        s
      );
    },
  };
}
function im() {
  let s,
    e = null,
    t = !1;
  const n = () => {
      te(s);
      const o = h.doc;
      if (!o) {
        s.appendChild(p("div", { class: "empty-panel" }, "No document"));
        return;
      }
      const r = o.active;
      if (!r) {
        s.append(
          p("div", { class: "prop-title" }, "Document"),
          p("div", { class: "irow" }, p("span", null, "Size"), p("code", null, `${o.width} × ${o.height}`)),
          p(
            "div",
            { class: "row" },
            p("button", { class: "btn small", onclick: () => h.run("image.size") }, "Image Size…"),
            p("button", { class: "btn small", onclick: () => h.run("image.canvasSize") }, "Canvas Size…"),
          ),
        );
        return;
      }
      if (r.kind === "adjustment" && r.adjust) {
        s.append(p("div", { class: "prop-title" }, p("span", { class: "ico", html: R.adjust }), Xe[r.adjust.type]));
        const l = Ne(() => {
          if (!e || e.layerId !== r.id) return;
          const u = JSON.stringify(r.adjust.params);
          if (u === e.snapshot) return;
          const d = JSON.parse(u);
          ((r.adjust.params = JSON.parse(e.snapshot)), (t = !0));
          try {
            o.transact(`${Xe[r.adjust.type]} Edit`, () => {
              r.adjust.params = d;
            });
          } finally {
            t = !1;
          }
          e = { layerId: r.id, snapshot: JSON.stringify(d) };
        }, 600);
        e = { layerId: r.id, snapshot: JSON.stringify(r.adjust.params) };
        const c = (() => {
          const u = o.composite;
          return Ni(u);
        })();
        (s.append(
          Zl(
            r.adjust,
            () => {
              (o.invalidate(), l());
            },
            c,
          ),
        ),
          s.append(a(r)));
        return;
      }
      if (r.kind === "shape" && r.shape) {
        (s.append(
          p(
            "div",
            { class: "prop-title" },
            p("span", { class: "ico", html: R.shapeLayer }),
            "Shape Layer",
            p("span", { class: "muted" }, " — " + r.name),
          ),
        ),
          s.append(om(o, r)),
          s.append(a(r), i(r)));
        return;
      }
      if (r.kind === "text" && r.text) {
        const l = r.text;
        (s.append(
          p("div", { class: "prop-title" }, r.text.path ? "Type on a Path" : "Type Layer"),
          p(
            "div",
            { class: "irow" },
            p("span", null, "Font"),
            p("code", null, `${l.font} ${l.weight}${l.italic ? " italic" : ""}`),
          ),
          p("div", { class: "irow" }, p("span", null, "Size"), p("code", null, `${l.size}px`)),
          p(
            "div",
            { class: "irow" },
            p("span", null, "Color"),
            p("span", { class: "color-chip", style: { background: fe(l.color) } }),
          ),
          p(
            "div",
            { class: "row" },
            p("button", { class: "btn small", onclick: () => h.setTool("text") }, "Edit with Type Tool"),
            p("button", { class: "btn small", onclick: () => h.run("layer.rasterize") }, "Rasterize"),
          ),
        ),
          l.path && s.append(rm(o, r)),
          s.append(a(r), i(r)));
        return;
      }
      (s.append(
        p(
          "div",
          { class: "prop-title" },
          r.kind === "group" ? "Group" : "Pixel Layer",
          p("span", { class: "muted" }, " — " + r.name),
        ),
        p("div", { class: "irow" }, p("span", null, "Opacity"), p("code", null, Math.round(r.opacity * 100) + "%")),
        p(
          "div",
          { class: "row" },
          p("button", { class: "btn small", onclick: () => h.run("layer.style") }, "Layer Style…"),
          p("button", { class: "btn small", onclick: () => h.run("edit.freeTransform") }, "Transform…"),
        ),
      ),
        s.append(a(r), i(r)));
    },
    i = (o) => {
      const r = h.doc;
      return o.vmask
        ? p(
            "div",
            { class: "prop-section" },
            p("div", { class: "sw-title" }, "Vector Mask"),
            p(
              "div",
              { class: "row" },
              $("Enabled", o.vmaskEnabled !== !1, () => h.run("layer.vmaskToggle")),
              p(
                "button",
                {
                  class: "btn small",
                  title: "Edit the mask path with the Direct Selection tool",
                  onclick: () => {
                    ((r.activePath = `vmask:${o.id}`), h.setTool("directSelect"));
                  },
                },
                "Edit Path",
              ),
              p("button", { class: "btn small", onclick: () => h.run("layer.vmaskRasterize") }, "Rasterize"),
              p("button", { class: "btn small", onclick: () => h.run("layer.vmaskDelete") }, "Delete"),
            ),
          )
        : p(
            "div",
            { class: "prop-section" },
            p(
              "button",
              {
                class: "btn small",
                title: "Clip the layer to the current path (or reveal all, then draw)",
                onclick: () => h.run(am() ? "layer.vmaskFromPath" : "layer.vmaskReveal"),
              },
              "Add Vector Mask",
            ),
          );
    },
    a = (o) => {
      const r = h.doc;
      return o.mask
        ? p(
            "div",
            { class: "prop-section" },
            p("div", { class: "sw-title" }, "Layer Mask"),
            p(
              "div",
              { class: "row" },
              $("Enabled", o.maskEnabled, (l) => {
                r.transact("Toggle Mask", () => {
                  o.maskEnabled = l;
                });
              }),
              p("button", { class: "btn small", onclick: () => h.run("layer.invertMask") }, "Invert"),
              p(
                "button",
                {
                  class: "btn small",
                  onclick: () => {
                    ((r.maskViewId = r.maskViewId === o.id ? null : o.id), r.invalidate());
                  },
                },
                r.maskViewId === o.id ? "Hide Mask" : "View Mask",
              ),
            ),
            p(
              "div",
              { class: "row" },
              p("button", { class: "btn small", onclick: () => h.run("layer.applyMask") }, "Apply"),
              p("button", { class: "btn small", onclick: () => h.run("layer.deleteMask") }, "Delete"),
              p("button", { class: "btn small", onclick: () => h.run("select.fromMask") }, "Load as Selection"),
            ),
          )
        : p(
            "div",
            { class: "prop-section" },
            p("button", { class: "btn small", onclick: () => h.run("layer.addMask") }, "Add Layer Mask"),
          );
    };
  return {
    id: "properties",
    title: "Properties",
    create() {
      s = p("div", { class: "properties-panel" });
      const o = Ne(n, 30);
      return (
        k.on("doc:active", o),
        k.on("doc:layers", () => {
          const r = h.doc;
          t || (e && r?.activeId === e.layerId && r.active?.kind === "adjustment") || o();
        }),
        k.on("doc:history", () => {
          t || ((e = null), o());
        }),
        n(),
        s
      );
    },
  };
}
function am() {
  const s = h.doc;
  return !!s && !!St(s)?.get();
}
function om(s, e) {
  const t = e.shape,
    n = (r, l) =>
      s.transact(r, () => {
        (l(e.shape), je(s, e));
      }),
    i = (r, l, c) => {
      const u = r(),
        d = p("span", {
          class: "color-chip big" + (u ? "" : " none"),
          title: c + " — click to choose, right-click for none",
          style: { background: u ? fe(u) : "" },
        });
      return (
        d.addEventListener("click", async () => {
          const f = await Ei(r() || h.fg, c);
          f && l(f);
        }),
        d.addEventListener("contextmenu", (f) => {
          (f.preventDefault(), l(null));
        }),
        d
      );
    },
    a = (r, ...l) => p("div", { class: "form-row" }, p("span", { class: "sf-label" }, r), ...l),
    o = ws(t.path);
  return p(
    "div",
    { class: "prop-section shape-editor" },
    a(
      "Fill",
      i(
        () => t.fill,
        (r) =>
          n("Shape Fill", (l) => {
            l.fill = r;
          }),
        "Fill colour",
      ),
      q({
        value: Math.round((t.fillOpacity ?? 1) * 100),
        min: 0,
        max: 100,
        unit: "%",
        width: 44,
        onInput: () => {},
        onCommit: (r) =>
          n("Fill Opacity", (l) => {
            l.fillOpacity = r / 100;
          }),
      }),
    ),
    a(
      "Stroke",
      i(
        () => t.stroke,
        (r) =>
          n("Shape Stroke", (l) => {
            ((l.stroke = r), r && !l.strokeWidth && (l.strokeWidth = 3));
          }),
        "Stroke colour",
      ),
      q({
        value: t.strokeWidth,
        min: 0,
        max: 1e3,
        step: 0.5,
        unit: "px",
        width: 50,
        onInput: () => {},
        onCommit: (r) =>
          n("Stroke Width", (l) => {
            l.strokeWidth = r;
          }),
      }),
    ),
    a(
      "Align",
      O(
        [
          { value: "inside", label: "Inside" },
          { value: "center", label: "Center" },
          { value: "outside", label: "Outside" },
        ],
        t.strokeAlign,
        (r) =>
          n("Stroke Alignment", (l) => {
            l.strokeAlign = r;
          }),
      ),
    ),
    a(
      "Corners",
      O(
        [
          { value: "miter", label: "Miter" },
          { value: "round", label: "Round" },
          { value: "bevel", label: "Bevel" },
        ],
        t.join,
        (r) =>
          n("Stroke Corners", (l) => {
            l.join = r;
          }),
      ),
      O(
        [
          { value: "butt", label: "Butt caps" },
          { value: "round", label: "Round caps" },
          { value: "square", label: "Square caps" },
        ],
        t.cap,
        (r) =>
          n("Stroke Caps", (l) => {
            l.cap = r;
          }),
      ),
    ),
    a(
      "Dashes",
      O(
        [
          { value: "", label: "Solid" },
          { value: "2,2", label: "Dashed" },
          { value: "0.01,2", label: "Dotted (round caps)" },
          { value: "4,2", label: "Long dash" },
          { value: "4,2,0.01,2", label: "Dash-dot" },
        ],
        t.dash.join(","),
        (r) =>
          n("Stroke Dashes", (l) => {
            ((l.dash = r ? r.split(",").map(Number) : []), (r === "0.01,2" || r === "4,2,0.01,2") && (l.cap = "round"));
          }),
      ),
    ),
    a(
      "Fill rule",
      O(
        [
          { value: "nonzero", label: "Non-zero" },
          { value: "evenodd", label: "Even-odd (holes)" },
        ],
        t.path.fillRule || "nonzero",
        (r) =>
          n("Fill Rule", (l) => {
            l.path.fillRule = r;
          }),
      ),
    ),
    o
      ? p(
          "div",
          { class: "irow" },
          p("span", null, "Bounds"),
          p("code", null, `${Math.round(o.x)}, ${Math.round(o.y)} · ${Math.round(o.w)} × ${Math.round(o.h)}`),
        )
      : null,
    p(
      "div",
      { class: "row" },
      p(
        "button",
        {
          class: "btn small",
          title: "Edit anchors and curves",
          onclick: () => {
            ((s.activePath = `shape:${e.id}`), h.setTool("directSelect"));
          },
        },
        "Edit Path",
      ),
      p("button", { class: "btn small", onclick: () => h.run("edit.freeTransform") }, "Transform…"),
      p("button", { class: "btn small", onclick: () => h.run("layer.style") }, "Layer Style…"),
      p("button", { class: "btn small", onclick: () => h.run("layer.rasterize") }, "Rasterize"),
    ),
  );
}
function rm(s, e) {
  const t = e.text,
    n = (i, a) =>
      s.transact(i, () => {
        (a(), _t(s, e));
      });
  return p(
    "div",
    { class: "prop-section" },
    p("div", { class: "sw-title" }, "Path"),
    p(
      "div",
      { class: "form-row" },
      p("span", { class: "sf-label" }, "Start offset"),
      q({
        value: t.pathOffset || 0,
        min: -1e5,
        max: 1e5,
        unit: "px",
        width: 60,
        onInput: () => {},
        onCommit: (i) =>
          n("Text Path Offset", () => {
            t.pathOffset = i;
          }),
      }),
    ),
    p(
      "div",
      { class: "form-row" },
      $("Text below the path", !!t.pathFlip, (i) =>
        n("Text Path Side", () => {
          t.pathFlip = i;
        }),
      ),
    ),
    p(
      "div",
      { class: "row" },
      p(
        "button",
        {
          class: "btn small",
          onclick: () => {
            ((s.activePath = `text:${e.id}`), h.setTool("directSelect"));
          },
        },
        "Edit Path",
      ),
    ),
  );
}
const lm = ["wand"],
  Tr = [
    "move",
    "marquee",
    "lasso",
    "snap",
    "wand",
    "crop",
    "eyedropper",
    "heal",
    "brush",
    "clone",
    "eraser",
    "gradient",
    "blur",
    "dodge",
    "pen",
    "text",
    "pathSelect",
    "shape",
    "hand",
    "zoom",
    "ext",
  ];
function Pr() {
  const s = p("div", { class: "toasts" });
  return (
    k.on("toast", ({ msg: e, kind: t, ms: n }) => {
      const i = p("div", { class: "toast " + t }, e);
      (i.addEventListener("click", () => i.remove()),
        s.appendChild(i),
        setTimeout(() => {
          (i.classList.add("out"), setTimeout(() => i.remove(), 300));
        }, n));
    }),
    s
  );
}
function Bu(s) {
  const e = () => {
    const t = h.doc,
      n = t
        ? `${t.name}${t.modified ? " •" : ""} @ ${Math.round(t.view.zoom * L.dpr * 100)}% (${t.ink ? "CMYK" : "RGB"}/${t.bitDepth})`
        : "BrushBoard";
    (s && (s.textContent = n), (document.title = s ? (t ? `${t.name} — BrushBoard` : "BrushBoard") : n));
  };
  (k.on("doc:active", e), k.on("doc:history", e), k.on("view:changed", e), k.on("docs:changed", e), e());
}
function cm() {
  const s = p("div", { class: "tb-title" });
  Bu(s);
  const e = p("button", {
    class: "wbtn",
    title: "Maximize",
    html: R.maximize,
    onclick: () => window.brushboard.win.maximize(),
  });
  return (
    window.brushboard.win.onState((t) => {
      e.innerHTML = t.maximized ? R.restore : R.maximize;
    }),
    p(
      "div",
      { class: "titlebar" },
      p("div", { class: "tb-logo", html: Br, title: "BrushBoard" }),
      Gl(ku()),
      s,
      p(
        "div",
        { class: "wctl" },
        p("button", {
          class: "wbtn",
          title: "Minimize",
          html: R.minimize,
          onclick: () => window.brushboard.win.minimize(),
        }),
        e,
        p("button", {
          class: "wbtn close",
          title: "Close",
          html: R.close,
          onclick: () => window.brushboard.win.close(),
        }),
      ),
    )
  );
}
function Cr() {
  const s = p("div", { class: "optionsbar" }),
    e = () => {
      te(s);
      const n = h.tool;
      if (n) {
        s.append(p("div", { class: "ob-tool", title: n.name }, Ks(n.icon)), p("div", { class: "ob-sep" }));
        try {
          const i = n.options?.();
          i && s.appendChild(i);
        } catch (i) {
          console.error(i);
        }
      }
    };
  let t = null;
  return (
    k.on("tool:changed", e),
    k.on("tool:options", e),
    k.on("extensions:changed", e),
    k.on("tool:options:soft", () => {
      (clearTimeout(t),
        (t = setTimeout(() => {
          s.contains(document.activeElement) || e();
        }, 120)));
    }),
    s
  );
}
function Er() {
  const s = p("div", { class: "toolbar" }),
    e = () => {
      te(s);
      const t = new Map();
      for (const o of h.tools.values())
        o.group !== "_hidden" && (t.has(o.group) || t.set(o.group, []), t.get(o.group).push(o));
      const n = [...Tr, ...[...t.keys()].filter((o) => !Tr.includes(o))];
      for (const o of n) {
        const r = t.get(o);
        if (!r?.length) continue;
        const l = h.groupCurrent.get(o) || r[0].id,
          c = r.find((v) => v.id === l) || r[0],
          u = p("button", {
            class: "tbtn" + (h.tool && h.tool.group === o ? " on" : "") + (r.length > 1 ? " multi" : ""),
            title: `${c.name}${c.shortcut ? ` (${c.shortcut})` : ""}`,
            html: c.icon,
          });
        let d = null;
        const f = (v) => {
          const y = u.getBoundingClientRect();
          Ft(
            { clientX: y.right + 2, clientY: y.top, preventDefault() {} },
            r.map((b) => ({
              label: b.name,
              shortcut: b.shortcut,
              run: () => h.setTool(b.id),
              checked: () => h.tool === b,
            })),
          );
        };
        let m = !1;
        (u.addEventListener("pointerdown", (v) => {
          v.button === 0 &&
            ((m = !0),
            r.length > 1 &&
              (d = setTimeout(() => {
                ((d = null), (m = !1), f());
              }, 380)));
        }),
          u.addEventListener("pointerup", () => {
            (d && (clearTimeout(d), (d = null)), m && ((m = !1), h.setTool(c.id)));
          }),
          u.addEventListener("pointerleave", () => {
            d || (m = !1);
          }),
          u.addEventListener("contextmenu", (v) => {
            (v.preventDefault(), r.length > 1 && f());
          }),
          s.appendChild(u),
          ["move", "wand", "crop", "eyedropper", "eraser", "dodge", "shape", "zoom"].includes(o) &&
            s.appendChild(p("div", { class: "tsep" })));
      }
      const i = p("div", {
          class: "csw fg",
          title: "Foreground color — click to pick",
          style: { background: fe(h.fg) },
        }),
        a = p("div", { class: "csw bg", title: "Background color — click to pick", style: { background: fe(h.bg) } });
      (i.addEventListener("click", async () => {
        const o = await Ei(h.fg, "Color Picker (Foreground Color)");
        o && h.setFg(o);
      }),
        a.addEventListener("click", async () => {
          const o = await Ei(h.bg, "Color Picker (Background Color)");
          o && h.setBg(o);
        }),
        s.append(
          p(
            "div",
            { class: "colors" },
            a,
            i,
            p("button", { class: "cswap", title: "Swap colors (X)", onclick: () => h.swapColors() }, "⇄"),
            p(
              "button",
              { class: "creset", title: "Default colors (D)", onclick: () => h.resetColors() },
              p("span", { class: "mini-b" }),
              p("span", { class: "mini-w" }),
            ),
          ),
        ),
        s.append(
          p("button", {
            class: "tbtn qm" + (h.doc?.quickMask ? " on" : ""),
            title: "Edit in Quick Mask Mode (Q)",
            html: R.mask,
            onclick: () => h.run("select.quickMask"),
          }),
        ));
    };
  return (
    k.on("tool:changed", e),
    k.on("colors:changed", e),
    k.on("extensions:changed", e),
    k.on("doc:layers", () => {
      s.querySelector(".qm")?.classList.toggle("on", !!h.doc?.quickMask);
    }),
    e(),
    s
  );
}
function um() {
  const s = p("div", { class: "doctabs" }),
    e = () => {
      te(s);
      for (const t of h.docs) {
        const n = p(
          "div",
          { class: "dtab" + (t === h.doc ? " on" : ""), title: t.path || t.name },
          p("span", { class: "dname" }, t.name),
          t.modified ? p("span", { class: "ddot" }, "•") : null,
          p(
            "button",
            {
              class: "dclose",
              title: "Close",
              onclick: (i) => {
                (i.stopPropagation(), Ba(t));
              },
            },
            "×",
          ),
        );
        (n.addEventListener("mousedown", (i) => {
          i.button === 1 ? (i.preventDefault(), Ba(t)) : h.setDoc(t);
        }),
          s.appendChild(n));
      }
    };
  return (k.on("docs:changed", e), k.on("doc:active", e), k.on("doc:history", e), e(), s);
}
function hm() {
  const s = p("span", { class: "sb-msg" }),
    e = p("span", { class: "sb-zoom" }),
    t = p("span", { class: "sb-doc" }),
    n = p("span", { class: "sb-py", title: "Python extension host" }),
    i = p("span", {
      class: "sb-pen",
      title: "Pen tablet — click for Tablet & Pen settings",
      onclick: () => h.run("edit.tablet"),
    }),
    a = p("span", { class: "sb-penbar" }, p("i"));
  let o = !1;
  const r = () => {
    _e.seenPen &&
      (o ||
        ((o = !0),
        (i.innerHTML =
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m4 20 1.2-4.8L16 4.4a2 2 0 0 1 2.9 0l.7.7a2 2 0 0 1 0 2.9L8.8 18.8z"/></svg>'),
        i.append(a)),
      (a.firstChild.style.width = Math.round(_e.pressure * 100) + "%"));
  };
  (k.on("cursor", r),
    k.on("tablet:detected", () =>
      h.notify("Pen tablet detected — pressure and tilt are active. Edit › Tablet & Pen… to tune it.", "success", 5e3),
    ));
  const l = p("span", { class: "sb-pos" });
  k.on("status", (m) => (s.textContent = m));
  const c = () => {
    const m = h.doc;
    ((e.textContent = m ? `${Math.round(m.view.zoom * L.dpr * 1e3) / 10}%` : ""),
      (t.textContent = m
        ? `${m.width} × ${m.height} px · ${m.bitDepth}-bit · ${m.ink ? "CMYK" : "sRGB"} · ${m.layers.length} layer${m.layers.length === 1 ? "" : "s"}`
        : ""));
  };
  (k.on("doc:active", c),
    k.on("view:changed", c),
    k.on("doc:layers", c),
    k.on("doc:resized", c),
    k.on("cursor", (m) => {
      l.textContent = m ? `${Math.floor(m.x)}, ${Math.floor(m.y)}` : "";
    }),
    k.on("python:status", () => {
      const m = h.python;
      ((n.className = "sb-py " + (m.python && m.capabilities.numpy ? "ok" : "off")),
        (n.innerHTML = R.python),
        (n.title = m.python
          ? `Python: ${m.python}
${Object.entries(m.capabilities)
  .filter(([, v]) => v)
  .map(([v, y]) => `${v} ${y}`).join(`
`)}`
          : "Python helper not found — Extensions › Manage Extensions to set it up"));
    }),
    n.addEventListener("click", () => h.run("ext.manager")));
  const u = p("span", { class: "sb-mem", onclick: () => h.run("edit.prefs") }),
    d = (m) => (m >= 1024 ** 3 ? `${(m / 1024 ** 3).toFixed(1)} GB` : `${Math.round(m / 1024 ** 2)} MB`);
  return (
    setInterval(() => {
      if (!g) return;
      const m = g.residentBytes,
        v = m / g.budget;
      ((u.textContent = `GPU ${d(m)}`),
        (u.className = "sb-mem" + (v > 0.9 ? " high" : v > 0.7 ? " mid" : "")),
        (u.title = `Image data in graphics memory: ${d(m)} of ${d(g.budget)} allowed
Moved to system RAM: ${d(g.spilledBytes)} (undo history, hidden layers, other documents)
Click to change the limit in Preferences`));
    }, 1e3),
    p(
      "div",
      { class: "statusbar" },
      e,
      p("span", { class: "sb-sep" }),
      t,
      p("span", { class: "sb-sep" }),
      l,
      p("span", { class: "flex1" }),
      s,
      u,
      i,
      n,
    )
  );
}
function dm() {
  const s = p("div", { class: "w-recent" }),
    e = () => {
      te(s);
      const t = h.prefs.recentFiles.slice(0, 8);
      t.length &&
        s.append(
          p("div", { class: "w-head" }, "Recent"),
          ...t.map((n) =>
            p(
              "button",
              { class: "w-file", title: n, onclick: () => bt(n) },
              n.split("/").pop() || n,
              p("span", { class: "w-path" }, n.replace(/\/[^/]*$/, "")),
            ),
          ),
        );
    };
  return (
    k.on("recent:changed", e),
    e(),
    p(
      "div",
      { class: "welcome" },
      p(
        "div",
        { class: "w-actions" },
        p("button", { class: "btn primary big", onclick: () => h.run("file.new") }, "New Document…"),
        p("button", { class: "btn big", onclick: () => h.run("file.open") }, "Open…"),
      ),
      s,
      p("p", { class: "w-hint" }, "Drop images anywhere to open them · Hold Shift while dropping to place as a layer"),
    )
  );
}
function pm() {
  const s = (e) =>
    !!e &&
    ((e instanceof HTMLInputElement && !["checkbox", "range", "radio", "button", "color"].includes(e.type)) ||
      e instanceof HTMLTextAreaElement ||
      e instanceof HTMLSelectElement ||
      e.isContentEditable);
  (window.addEventListener("keydown", (e) => {
    if ((Ta() && !e.target?.closest?.(".dialog-backdrop.modeless")) || s(document.activeElement)) return;
    if (Nl()) {
      e.key === "Escape" && mt();
      return;
    }
    if ((e.key === "Escape" && fs(), L.key(e, !0))) {
      e.preventDefault();
      return;
    }
    const t = oh(e),
      n = h.shortcutMap().get(t);
    if (n) {
      (e.preventDefault(), h.run(n));
      return;
    }
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const i = h.tool?.brushCursor ? h.brushFor(h.tool.id) : null;
    switch (t) {
      case "D":
        h.resetColors();
        return;
      case "X":
        h.swapColors();
        return;
      case "[":
        i &&
          ((i.size = Math.max(1, Math.round(i.size * (i.size > 10 ? 0.9 : 1) - (i.size <= 10 ? 1 : 0)))),
          k.emit("tool:options"),
          L.request());
        return;
      case "]":
        i &&
          ((i.size = Math.min(2500, Math.round(i.size * (i.size >= 10 ? 1.1 : 1) + (i.size < 10 ? 1 : 0)))),
          k.emit("tool:options"),
          L.request());
        return;
      case "Shift+[":
        i && ((i.hardness = Math.max(0, Math.round((i.hardness - 0.25) * 4) / 4)), k.emit("tool:options"));
        return;
      case "Shift+]":
        i && ((i.hardness = Math.min(1, Math.round((i.hardness + 0.25) * 4) / 4)), k.emit("tool:options"));
        return;
    }
    if (/^\d$/.test(t) && i) {
      const l = parseInt(t, 10);
      ((i.opacity = l === 0 ? 1 : l / 10), k.emit("tool:options"), h.status(`Opacity ${Math.round(i.opacity * 100)}%`));
      return;
    }
    const a = t.replace("Shift+", ""),
      o = a ? [...h.tools.values()].filter((l) => !!l.shortcut && l.shortcut === a && l.group !== "_hidden") : [];
    if ([...new Set(o.map((l) => l.group))].length > 1) {
      e.preventDefault();
      const l = (d) => (lm.includes(d.id) ? 0 : 1),
        c = [...o].sort((d, f) => l(d) - l(f)),
        u = h.tool ? c.indexOf(h.tool) : -1;
      h.setTool(u >= 0 && t.startsWith("Shift+") ? c[(u + 1) % c.length].id : u >= 0 ? h.tool.id : c[0].id);
      return;
    }
    if (o.length) {
      e.preventDefault();
      const l = o[0].group,
        c = o.filter((u) => u.group === l);
      if (
        h.tool &&
        h.tool.group === l &&
        (t.startsWith("Shift+") || (c.length > 1 && h.tool.shortcut === a && e.repeat === !1 && e.__cycle))
      ) {
        const u = c.indexOf(h.tool);
        h.setTool(c[(u + 1) % c.length].id);
      } else
        h.setTool(
          h.groupCurrent.get(l) && c.some((u) => u.id === h.groupCurrent.get(l)) ? h.groupCurrent.get(l) : c[0].id,
        );
    }
  }),
    window.addEventListener("keyup", (e) => {
      (Ta() && !e.target?.closest?.(".dialog-backdrop.modeless")) || s(document.activeElement) || L.key(e, !1);
    }),
    window.addEventListener("blur", () => {
      h.spaceHeld = !1;
    }));
}
function fm() {
  const s = p("div", { class: "drop-overlay" }, "Drop to open · Shift to place as layer");
  document.body.appendChild(s);
  let e = 0;
  (window.addEventListener("dragenter", (t) => {
    t.dataTransfer?.types.includes("Files") && (e++, s.classList.add("on"));
  }),
    window.addEventListener("dragleave", () => {
      ((e = Math.max(0, e - 1)), e || s.classList.remove("on"));
    }),
    window.addEventListener("dragover", (t) => {
      t.dataTransfer?.types.includes("Files") && t.preventDefault();
    }),
    window.addEventListener("drop", async (t) => {
      if (((e = 0), s.classList.remove("on"), !!t.dataTransfer?.files.length)) {
        t.preventDefault();
        for (const n of Array.from(t.dataTransfer.files)) {
          const i = window.brushboard.fs.pathForFile(n);
          i && (t.shiftKey && h.doc ? await Nc(i) : await bt(i));
        }
      }
    }));
}
async function mm() {
  await h.loadPrefs();
  const s = document.getElementById("app");
  (Bl(),
    (window.__viewport = L),
    (g.budget = (h.prefs.gpuBudgetMB || 3072) * 1024 * 1024),
    (window.__brushboardDebug = {
      app: h,
      bus: k,
      viewport: L,
      ops: wi,
      sel: ol,
      createDocument: En,
      runBuiltinFilter: co,
      FILTERS: Cn,
      get gl() {
        return g;
      },
      encodeDocument: yo,
      decodeDocument: Wi,
      openPath: bt,
      exportTo: Mo,
      runPythonFilter: bo,
      get dock() {
        return de;
      },
      defaultParams: ui,
      ai: Np,
      presets: dc,
      applyPreset: hc,
      tablet: yd,
      heal: zu,
      t3d: wf,
      colorRange: Ou,
      vector: ud,
      pathsLib: Kh,
      pen: Vp,
      svg: tp,
      tf: vf,
      cmyk: ah,
      cmykCmds: Qp,
      stroke: Wd,
    }),
    ql(),
    [
      new _u(),
      new Eu(),
      new Su(),
      new MrnTool(),
      new wr("rect"),
      new wr("ellipse"),
      new xr(!1),
      new xr(!0),
      new Hc(),
      new Tf(),
      ...Df(),
      ...Hf(),
      ...au(),
    ].forEach((a) => h.registerTool(a)),
    pf());
  for (const a of [tm(), sm(), nm(), Kf(), Qf(), im(), em(), Yf(), Vf(), bu(), _f()]) de.register(a, 3);
  (Au(() => h.doc?.ink ?? null), L.empty.appendChild(dm()));
  const e = p("div", { class: "center" }, um(), L.el, hm());
  bd();
  const t = !!(await window.brushboard.app.info()).palOS;
  (document.documentElement.classList.toggle("pal-os", t),
    t
      ? (Bu(null), s.append(Cr(), p("div", { class: "main" }, Er(), e, de.el), Pr()), Ld(ku))
      : s.append(cm(), Cr(), p("div", { class: "main" }, Er(), e, de.el), Pr()),
    de.render(),
    h.setTool("brush"),
    pm(),
    fm(),
    k.on("layout:resized", () => L.resize()),
    window.brushboard.app.onRequestClose(async () => {
      h.tool?.commit?.();
      const a = h.docs.filter((o) => o.modified);
      if (a.length) {
        const o = await qi(
          "Quit BrushBoard",
          `${a.length} document${a.length > 1 ? "s have" : " has"} unsaved changes.`,
          ["Cancel", "Review…", "Quit without Saving"],
        );
        if (o === 0) return;
        if (o === 1) {
          for (const r of a) if ((h.setDoc(r), !(await _o(r)))) return;
        }
      }
      (await h.savePrefs(), window.brushboard.app.confirmClose());
    }),
    window.brushboard.app.onOpenFiles((a) => a.forEach((o) => bt(o))),
    Dc());
  const n = async () => {
    for (const a of [...h.tools.values()]) a.group === "ext" && h.tools.delete(a.id);
    for (const a of de.allPanels()) a.id.startsWith("ext:") && de.unregister(a.id);
    for (const a of [...h.commands.keys()]) a.startsWith("pyext.") && h.commands.delete(a);
    await Fc(({ tools: a, panels: o }) => {
      (a.forEach((r) => h.registerTool(r)), o.forEach((r) => de.register(r, 2)), de.render());
    });
    for (const a of Ti().commands)
      h.command({ id: a.id, label: a.name, shortcut: a.shortcut, run: a.run, enabled: () => !0 });
    k.emit("tool:changed", h.tool);
  };
  ((window.__reloadExtensions = n),
    window.brushboard.python
      .status()
      .then(async (a) => {
        ((h.python = a),
          k.emit("python:status"),
          a.python
            ? (await n(),
              Bt(),
              (await window.brushboard.app.info()).smoke ||
                setTimeout(() => {
                  re(() => import("./gpupack-BW9UycLe.js"), [], import.meta.url)
                    .then((r) => r.offerGpuPack())
                    .catch(() => null);
                }, 5e3))
            : h.notify(
                "Python was not found: PSD, RAW, 16-bit TIFF and extensions are disabled. See Extensions › Manage Extensions.",
                "info",
                8e3,
              ));
      })
      .catch((a) => console.warn(a)));
  const i = await window.brushboard.app.pendingFiles();
  for (const a of i) await bt(a);
  k.emit("render");
}
mm().catch((s) => {
  (console.error(s),
    (document.body.innerHTML = `<div class="fatal"><h1>BrushBoard could not start</h1><pre>${String(s?.stack || s).replace(/</g, "&lt;")}</pre></div>`));
});
export {
  gd as C,
  Y as D,
  me as a,
  k as b,
  qi as c,
  h as d,
  te as e,
  $ as f,
  Hi as g,
  p as h,
  vd as i,
  Q as j,
  Os as k,
  we as l,
  ao as m,
  _a as n,
  Ct as o,
  _e as p,
  Bt as r,
  O as s,
  an as t,
};

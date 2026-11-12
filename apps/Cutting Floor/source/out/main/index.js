"use strict";
/* palOS sheets: Save, Open and message panels come out of the window */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
const electron = require("electron");
const node_fs = require("node:fs");
const node_child_process = require("node:child_process");
const node_path = require("node:path");
const node_crypto = require("node:crypto");
const node_stream = require("node:stream");
const node_os = require("node:os");
const https = require("node:https");
const path = require("path");
function parseRate(r) {
  if (!r) return 0;
  const [a, b] = r.split("/").map(Number);
  if (!b) return a || 0;
  return a / b;
}
const IMAGE_EXT = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".gif"]);
let caps = null;
function works(bin) {
  try {
    const r = node_child_process.spawnSync(bin, ["-hide_banner", "-version"], { timeout: 8e3 });
    return r.status === 0;
  } catch {
    return false;
  }
}
function locate(name) {
  const env = name === "ffmpeg" ? process.env.CUTTINGFLOOR_FFMPEG : process.env.CUTTINGFLOOR_FFPROBE;
  const candidates = [env, name, `/usr/bin/${name}`, `/usr/local/bin/${name}`, `/opt/homebrew/bin/${name}`, `/snap/bin/${name}`];
  for (const c of candidates) if (c && works(c)) return c;
  return null;
}
function getCapabilities() {
  if (caps) return caps;
  const ffmpeg = locate("ffmpeg");
  const ffprobe = locate("ffprobe");
  if (!ffmpeg || !ffprobe) {
    caps = {
      ffmpeg,
      ffprobe,
      version: "",
      nvenc: false,
      hevcNvenc: false,
      cudaDecode: false,
      error: "FFmpeg was not found. Install it (sudo apt install ffmpeg) or set CUTTINGFLOOR_FFMPEG / CUTTINGFLOOR_FFPROBE."
    };
    return caps;
  }
  const ver = node_child_process.spawnSync(ffmpeg, ["-hide_banner", "-version"]).stdout?.toString().split("\n")[0] ?? "";
  const encoders = node_child_process.spawnSync(ffmpeg, ["-hide_banner", "-encoders"]).stdout?.toString() ?? "";
  const hwaccels = node_child_process.spawnSync(ffmpeg, ["-hide_banner", "-hwaccels"]).stdout?.toString() ?? "";
  const tryEncode = (codec) => {
    if (!encoders.includes(codec)) return false;
    const r = node_child_process.spawnSync(
      ffmpeg,
      ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=black:s=256x256:d=0.1", "-frames:v", "1", "-c:v", codec, "-f", "null", "-"],
      { timeout: 15e3 }
    );
    return r.status === 0;
  };
  const nvenc = tryEncode("h264_nvenc");
  caps = {
    ffmpeg,
    ffprobe,
    version: ver.replace(/^ffmpeg version\s*/, "").split(" ")[0],
    nvenc,
    hevcNvenc: nvenc && tryEncode("hevc_nvenc"),
    cudaDecode: nvenc && /\bcuda\b/.test(hwaccels)
  };
  return caps;
}
function run(bin, args) {
  return new Promise((resolve, reject) => {
    const p = node_child_process.spawn(bin, args);
    const out = [];
    let err = "";
    p.stdout.on("data", (d) => out.push(d));
    p.stderr.on("data", (d) => err += d.toString());
    p.on("error", reject);
    p.on("close", (code) => resolve({ code: code ?? -1, stdout: Buffer.concat(out), stderr: err }));
  });
}
async function probe(path2) {
  const c = getCapabilities();
  if (!c.ffprobe) throw new Error(c.error);
  const r = await run(c.ffprobe, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path2]);
  if (r.code !== 0) throw new Error(`Could not read ${node_path.basename(path2)}: ${r.stderr.trim()}`);
  const j = JSON.parse(r.stdout.toString());
  const v = j.streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic);
  const a = j.streams.find((s) => s.codec_type === "audio");
  const ext = node_path.extname(path2).toLowerCase();
  const kind = IMAGE_EXT.has(ext) ? "image" : v ? "video" : "audio";
  if (!v && !a) throw new Error(`${node_path.basename(path2)} has no video or audio streams`);
  let width = v?.width ?? 0;
  let height = v?.height ?? 0;
  const rot = Math.abs(Number(v?.tags?.rotate ?? v?.side_data_list?.find((s) => s.rotation !== void 0)?.rotation ?? 0)) % 180;
  if (rot === 90) [width, height] = [height, width];
  let fps = parseRate(v?.avg_frame_rate) || parseRate(v?.r_frame_rate) || 30;
  if (fps > 240 || fps < 1) fps = parseRate(v?.r_frame_rate) || 30;
  const duration = kind === "image" ? 0 : Number(j.format.duration ?? v?.duration ?? a?.duration ?? 0);
  return {
    path: path2,
    name: node_path.basename(path2),
    kind,
    duration,
    width,
    height,
    fps,
    hasVideo: !!v,
    hasAudio: !!a && kind !== "image",
    videoCodec: v?.codec_name ?? "",
    audioCodec: a?.codec_name ?? "",
    pixFmt: v?.pix_fmt ?? "",
    audioChannels: a?.channels ?? 0,
    sampleRate: Number(a?.sample_rate ?? 0),
    sizeBytes: Number(j.format.size ?? 0)
  };
}
let cacheRoot = "";
function setCacheRoot(dir) {
  cacheRoot = dir;
  node_fs.mkdirSync(node_path.join(dir, "proxies"), { recursive: true });
  node_fs.mkdirSync(node_path.join(dir, "thumbs"), { recursive: true });
  node_fs.mkdirSync(node_path.join(dir, "peaks"), { recursive: true });
}
function keyFor(path2) {
  let st = "";
  try {
    const s = node_fs.statSync(path2);
    st = `${s.size}:${s.mtimeMs}`;
  } catch {
  }
  return node_crypto.createHash("sha1").update(`${path2}|${st}`).digest("hex").slice(0, 20);
}
async function thumbnail(path2, duration, kind) {
  const c = getCapabilities();
  if (!c.ffmpeg || kind === "audio") return null;
  const out = node_path.join(cacheRoot, "thumbs", `${keyFor(path2)}.jpg`);
  if (node_fs.existsSync(out)) return out;
  const t = kind === "image" ? 0 : Math.min(duration * 0.1, 5);
  const r = await run(c.ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(t), "-i", path2, "-frames:v", "1", "-vf", "scale=240:-2", "-q:v", "4", out]);
  return r.code === 0 && node_fs.existsSync(out) ? out : null;
}
async function peaks(path2) {
  const c = getCapabilities();
  if (!c.ffmpeg) return null;
  const out = node_path.join(cacheRoot, "peaks", `${keyFor(path2)}.f32`);
  if (node_fs.existsSync(out)) {
    const b = node_fs.readFileSync(out);
    return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
  }
  const rate = 8e3;
  const r = await run(c.ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", path2, "-vn", "-ac", "1", "-ar", String(rate), "-f", "s16le", "-"]);
  if (r.code !== 0) return null;
  const samples = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.byteLength / 2));
  const per = rate / 100;
  const n = Math.ceil(samples.length / per);
  const p = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    const end = Math.min(samples.length, (i + 1) * per);
    for (let k = i * per; k < end; k++) {
      const v = Math.abs(samples[k]);
      if (v > m) m = v;
    }
    p[i] = m / 32768;
  }
  node_fs.writeFileSync(out, Buffer.from(p.buffer));
  return p;
}
async function decodePcm(path2, s0, dur) {
  const c = getCapabilities();
  if (!c.ffmpeg) return new Float32Array(0);
  const d = Math.max(0, Math.min(20 * 60, dur));
  const r = await run(c.ffmpeg, ["-hide_banner", "-loglevel", "error", "-nostdin", "-ss", Math.max(0, s0).toFixed(6), "-t", d.toFixed(6), "-i", path2, "-vn", "-sn", "-af", "aresample=48000,aformat=sample_fmts=flt:channel_layouts=stereo", "-f", "f32le", "-ac", "2", "-ar", "48000", "pipe:1"]);
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + Math.floor(b.byteLength / 8) * 8));
}
const queue = [];
const statusByPath = /* @__PURE__ */ new Map();
let running = null;
let listener = () => {
};
function onProxyEvent(fn) {
  listener = fn;
}
function emit(e) {
  statusByPath.set(e.path, e);
  listener(e);
}
function proxyPathFor(path2) {
  return node_path.join(cacheRoot, "proxies", `${keyFor(path2)}.mp4`);
}
function requestProxy(info) {
  if (info.kind !== "video") {
    const e2 = { path: info.path, status: "notNeeded", progress: 1 };
    return e2;
  }
  const out = proxyPathFor(info.path);
  if (node_fs.existsSync(out)) {
    const e2 = { path: info.path, status: "ready", progress: 1, proxyPath: out };
    statusByPath.set(info.path, e2);
    return e2;
  }
  const existing = statusByPath.get(info.path);
  if (existing && (existing.status === "queued" || existing.status === "building")) return existing;
  queue.push({ path: info.path, info });
  const e = { path: info.path, status: "queued", progress: 0 };
  emit(e);
  pump();
  return e;
}
function proxyArgs(job, out, useGpu) {
  const c = getCapabilities();
  const h = Math.min(720, job.info.height || 720);
  const height = h % 2 === 0 ? h : h - 1;
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-progress", "pipe:1", "-nostats"];
  if (useGpu && c.cudaDecode) args.push("-hwaccel", "cuda");
  args.push("-i", job.path, "-map", "0:v:0", "-map", "0:a:0?");
  args.push("-vf", `scale=-2:${height},format=yuv420p`);
  if (useGpu && c.nvenc) {
    args.push("-c:v", "h264_nvenc", "-preset", "p4", "-rc", "vbr", "-cq", "24", "-b:v", "0", "-g", "12", "-bf", "0");
  } else {
    args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-g", "12", "-bf", "0");
  }
  args.push("-c:a", "aac", "-b:a", "160k", "-ac", "2", "-movflags", "+faststart", out);
  return args;
}
function pump() {
  if (running) return;
  const job = queue.shift();
  if (!job) return;
  const c = getCapabilities();
  if (!c.ffmpeg) {
    emit({ path: job.path, status: "error", progress: 0, error: c.error });
    return pump();
  }
  const out = proxyPathFor(job.path);
  const tmp = out.replace(/\.mp4$/, ".partial.mp4");
  const attempt = (useGpu) => {
    const proc = node_child_process.spawn(c.ffmpeg, proxyArgs(job, tmp, useGpu));
    running = { job, proc };
    emit({ path: job.path, status: "building", progress: 0 });
    let stderr = "";
    let lastEmit = 0;
    proc.stdout.on("data", (d) => {
      const m = /out_time_us=(\d+)/.exec(d.toString());
      if (m && job.info.duration > 0) {
        const p = Math.min(0.99, Number(m[1]) / 1e6 / job.info.duration);
        const now = Date.now();
        if (now - lastEmit > 250) {
          lastEmit = now;
          emit({ path: job.path, status: "building", progress: p });
        }
      }
    });
    proc.stderr.on("data", (d) => stderr += d.toString());
    proc.on("close", (code) => {
      running = null;
      if (code === 0) {
        node_fs.renameSync(tmp, out);
        emit({ path: job.path, status: "ready", progress: 1, proxyPath: out });
      } else if (useGpu && (c.nvenc || c.cudaDecode)) {
        try {
          node_fs.unlinkSync(tmp);
        } catch {
        }
        return attempt(false);
      } else {
        emit({ path: job.path, status: "error", progress: 0, error: stderr.trim().split("\n").slice(-3).join(" ") });
      }
      pump();
    });
  };
  attempt(true);
}
function cancelAllProxies() {
  queue.length = 0;
  running?.proc.kill("SIGKILL");
}
const MEDIA_SCHEME = "media";
const MIME = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp"
};
function registerMediaScheme() {
  electron.protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true, bypassCSP: true }
    }
  ]);
}
function handleMediaProtocol() {
  electron.protocol.handle(MEDIA_SCHEME, (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname.replace(/^\//, ""));
    let size;
    try {
      size = node_fs.statSync(filePath).size;
    } catch {
      return new Response("Not found", { status: 404 });
    }
    const headers = {
      "Content-Type": MIME[node_path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    };
    const range = request.headers.get("range");
    const m = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
    if (m) {
      let start = m[1] ? Number(m[1]) : 0;
      let end = m[2] ? Number(m[2]) : size - 1;
      if (!m[1] && m[2]) {
        start = Math.max(0, size - Number(m[2]));
        end = size - 1;
      }
      end = Math.min(end, size - 1);
      if (start > end || start >= size) {
        return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
      }
      const stream2 = node_stream.Readable.toWeb(node_fs.createReadStream(filePath, { start, end }));
      return new Response(stream2, {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) }
      });
    }
    const stream = node_stream.Readable.toWeb(node_fs.createReadStream(filePath));
    return new Response(stream, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
  });
}
function sample(g, x, y) {
  x = Math.max(0, Math.min(g.w - 1.001, x));
  y = Math.max(0, Math.min(g.h - 1.001, y));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const i = y0 * g.w + x0;
  const d = g.data;
  return (d[i] * (1 - fx) + d[i + 1] * fx) * (1 - fy) + (d[i + g.w] * (1 - fx) + d[i + g.w + 1] * fx) * fy;
}
function patch(g, cx, cy, f) {
  const out = new Float32Array(f * f);
  const h = (f - 1) / 2;
  let mean = 0;
  for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) mean += out[j * f + i] = sample(g, cx - h + i, cy - h + j);
  mean /= f * f;
  let n = 0;
  for (let k = 0; k < out.length; k++) {
    out[k] -= mean;
    n += out[k] * out[k];
  }
  n = Math.sqrt(n);
  if (n < 1e-3 * f) return null;
  for (let k = 0; k < out.length; k++) out[k] /= n;
  return out;
}
function cornerness(g, cx, cy, r) {
  let xx = 0;
  let yy = 0;
  let xy = 0;
  const x0 = Math.max(1, Math.round(cx - r));
  const x1 = Math.min(g.w - 2, Math.round(cx + r));
  const y0 = Math.max(1, Math.round(cy - r));
  const y1 = Math.min(g.h - 2, Math.round(cy + r));
  const d = g.data;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * g.w + x;
      const gx = (d[i + 1] - d[i - 1]) * 0.5;
      const gy = (d[i + g.w] - d[i - g.w]) * 0.5;
      xx += gx * gx;
      yy += gy * gy;
      xy += gx * gy;
    }
  const tr = xx + yy;
  const det = xx * yy - xy * xy;
  return tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
}
function matchNcc(g, tpl, f, px, py, r) {
  const h = (f - 1) / 2;
  const R = Math.max(1, Math.round(r));
  const cx = Math.round(px);
  const cy = Math.round(py);
  const ax = Math.max(0, cx - h - R);
  const ay = Math.max(0, cy - h - R);
  const bx = Math.min(g.w - f, cx - h + R);
  const by = Math.min(g.h - f, cy - h + R);
  if (bx < ax || by < ay) return { x: px, y: py, score: -1, second: -1 };
  const W = bx - ax + f;
  const H = by - ay + f;
  const S = new Float64Array((W + 1) * (H + 1));
  const S2 = new Float64Array((W + 1) * (H + 1));
  const d = g.data;
  for (let y = 0; y < H; y++) {
    let rs = 0;
    let rs2 = 0;
    const row = (ay + y) * g.w + ax;
    for (let x = 0; x < W; x++) {
      const v = d[row + x];
      rs += v;
      rs2 += v * v;
      S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + rs;
      S2[(y + 1) * (W + 1) + x + 1] = S2[y * (W + 1) + x + 1] + rs2;
    }
  }
  const N = f * f;
  const nx = bx - ax + 1;
  const ny = by - ay + 1;
  const score = new Float32Array(nx * ny);
  let best = -2;
  let bi = 0;
  let bj = 0;
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (W + 1) + i;
      const b = (j + f) * (W + 1) + i;
      const sum = S[b + f] - S[b] - S[a + f] + S[a];
      const sum2 = S2[b + f] - S2[b] - S2[a + f] + S2[a];
      const varn = sum2 - sum * sum / N;
      let s = -1;
      if (varn > 1e-6) {
        let acc = 0;
        for (let v = 0; v < f; v++) {
          const row = (ay + j + v) * g.w + ax + i;
          const tr = v * f;
          for (let u = 0; u < f; u++) acc += tpl[tr + u] * d[row + u];
        }
        s = acc / Math.sqrt(varn);
      }
      score[j * nx + i] = s;
      if (s > best) {
        best = s;
        bi = i;
        bj = j;
      }
    }
  const at = (i, j) => score[Math.max(0, Math.min(ny - 1, j)) * nx + Math.max(0, Math.min(nx - 1, i))];
  const para = (l, c, r2) => {
    const den = l - 2 * c + r2;
    return Math.abs(den) < 1e-9 ? 0 : Math.max(-0.5, Math.min(0.5, 0.5 * (l - r2) / den));
  };
  const dx = bi > 0 && bi < nx - 1 ? para(at(bi - 1, bj), best, at(bi + 1, bj)) : 0;
  const dy = bj > 0 && bj < ny - 1 ? para(at(bi, bj - 1), best, at(bi, bj + 1)) : 0;
  let second = -1;
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) if ((i - bi) * (i - bi) + (j - bj) * (j - bj) > 9 && score[j * nx + i] > second) second = score[j * nx + i];
  return { x: ax + bi + h + dx, y: ay + bj + h + dy, score: best, second };
}
function refineLK(g, tpl, f, x, y, iters = 6) {
  const h = (f - 1) / 2;
  const N = f * f;
  const P = new Float32Array(N);
  const GX = new Float32Array(N);
  const GY = new Float32Array(N);
  for (let it = 0; it < iters; it++) {
    let mean = 0;
    let mgx = 0;
    let mgy = 0;
    for (let j = 0; j < f; j++)
      for (let i = 0; i < f; i++) {
        const sx = x - h + i;
        const sy = y - h + j;
        const k = j * f + i;
        P[k] = sample(g, sx, sy);
        GX[k] = sample(g, sx + 0.5, sy) - sample(g, sx - 0.5, sy);
        GY[k] = sample(g, sx, sy + 0.5) - sample(g, sx, sy - 0.5);
        mean += P[k];
        mgx += GX[k];
        mgy += GY[k];
      }
    mean /= N;
    mgx /= N;
    mgy /= N;
    let nrm = 0;
    for (let k = 0; k < N; k++) {
      P[k] -= mean;
      nrm += P[k] * P[k];
    }
    nrm = Math.sqrt(nrm);
    if (nrm < 1e-6) break;
    let a = 0;
    let b = 0;
    let c = 0;
    let ex = 0;
    let ey = 0;
    for (let k = 0; k < N; k++) {
      const e = P[k] / nrm - tpl[k];
      const jx = (GX[k] - mgx) / nrm;
      const jy = (GY[k] - mgy) / nrm;
      a += jx * jx;
      b += jx * jy;
      c += jy * jy;
      ex += jx * e;
      ey += jy * e;
    }
    const det = a * c - b * b;
    if (Math.abs(det) < 1e-12) break;
    const dx = -(c * ex - b * ey) / det;
    const dy = -(a * ey - b * ex) / det;
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) > 1.5) break;
    x += dx;
    y += dy;
    if (Math.hypot(dx, dy) < 5e-3) break;
  }
  return { x, y };
}
class PointTracker {
  x;
  y;
  vx = 0;
  vy = 0;
  tpl;
  ref;
  f;
  r;
  constructor(first, x, y, feature, search) {
    this.f = Math.max(5, Math.round(feature) | 1);
    this.r = Math.max(2, (search - this.f) / 2);
    this.x = x;
    this.y = y;
    this.ref = patch(first, x, y, this.f);
    this.tpl = this.ref;
  }
  /** Track into the next frame. Returns the new position and confidence (0..1). */
  step(g) {
    if (!this.tpl) return { x: this.x, y: this.y, conf: 0 };
    const m = matchNcc(g, this.tpl, this.f, this.x + this.vx, this.y + this.vy, this.r);
    const conf = Math.max(0, m.score);
    if (conf > 0.5) {
      const ref = refineLK(g, this.tpl, this.f, m.x, m.y);
      if (Math.hypot(ref.x - m.x, ref.y - m.y) < 1) {
        m.x = ref.x;
        m.y = ref.y;
      }
      this.vx = m.x - this.x;
      this.vy = m.y - this.y;
      this.x = m.x;
      this.y = m.y;
      if (conf > 0.85) {
        const p = patch(g, m.x, m.y, this.f);
        if (p && this.ref) {
          const t = new Float32Array(p.length);
          let n = 0;
          for (let k = 0; k < p.length; k++) {
            t[k] = 0.6 * p[k] + 0.3 * this.tpl[k] + 0.1 * this.ref[k];
            n += t[k] * t[k];
          }
          n = Math.sqrt(n) || 1;
          for (let k = 0; k < t.length; k++) t[k] /= n;
          this.tpl = t;
        }
      }
    } else {
      this.x += this.vx;
      this.y += this.vy;
    }
    return { x: this.x, y: this.y, conf };
  }
}
function fitSimilarity(p, q, w) {
  let idx = p.map((_, i) => i);
  let sim = null;
  for (let iter = 0; iter < 4; iter++) {
    if (idx.length < 2) break;
    let W = 0;
    let px = 0;
    let py = 0;
    let qx = 0;
    let qy = 0;
    for (const i of idx) {
      W += w[i];
      px += w[i] * p[i][0];
      py += w[i] * p[i][1];
      qx += w[i] * q[i][0];
      qy += w[i] * q[i][1];
    }
    px /= W;
    py /= W;
    qx /= W;
    qy /= W;
    let re = 0;
    let im = 0;
    let den = 0;
    for (const i of idx) {
      const ax = p[i][0] - px;
      const ay = p[i][1] - py;
      const bx = q[i][0] - qx;
      const by = q[i][1] - qy;
      re += w[i] * (bx * ax + by * ay);
      im += w[i] * (by * ax - bx * ay);
      den += w[i] * (ax * ax + ay * ay);
    }
    if (den < 1e-9) break;
    re /= den;
    im /= den;
    const s = Math.hypot(re, im);
    const a = Math.atan2(im, re);
    sim = { s, a, tx: qx - (re * px - im * py), ty: qy - (im * px + re * py) };
    const res = idx.map((i) => {
      const x = re * p[i][0] - im * p[i][1] + sim.tx;
      const y = im * p[i][0] + re * p[i][1] + sim.ty;
      return Math.hypot(x - q[i][0], y - q[i][1]);
    });
    const med = [...res].sort((x, y) => x - y)[Math.floor(res.length / 2)];
    const lim = Math.max(0.75, med * 2.5);
    const keep = idx.filter((_, k) => res[k] <= lim);
    if (keep.length === idx.length) break;
    idx = keep;
  }
  return sim;
}
function frameMotion(a, b, guess = null) {
  const f = 21;
  const r = Math.max(8, Math.round(a.w * 0.05));
  const margin = r + f;
  const cand = [];
  const gx = 14;
  const gy = 8;
  for (let j = 0; j < gy; j++)
    for (let i = 0; i < gx; i++) {
      const x = margin + (a.w - 2 * margin) * (i + 0.5) / gx;
      const y = margin + (a.h - 2 * margin) * (j + 0.5) / gy;
      cand.push({ x, y, c: cornerness(a, x, y, 8) });
    }
  cand.sort((u, v) => v.c - u.c);
  const top = cand[0]?.c ?? 0;
  const pts = cand.slice(0, 48).filter((c) => c.c > Math.max(4, top * 0.03));
  const P = [];
  const Q = [];
  const W = [];
  const cx = a.w / 2;
  const cy = a.h / 2;
  for (const c of pts) {
    const t = patch(a, c.x, c.y, f);
    if (!t) continue;
    let ex = c.x;
    let ey = c.y;
    if (guess) {
      const ux = c.x - cx;
      const uy = c.y - cy;
      const co = guess.s * Math.cos(guess.a);
      const si = guess.s * Math.sin(guess.a);
      ex = co * ux - si * uy + guess.tx + cx;
      ey = si * ux + co * uy + guess.ty + cy;
    }
    const m = matchNcc(b, t, f, ex, ey, r);
    if (m.score < 0.7 || m.second > m.score - 0.04) continue;
    const lk = refineLK(b, t, f, m.x, m.y);
    const x = Math.hypot(lk.x - m.x, lk.y - m.y) < 1 ? lk.x : m.x;
    const y = Math.hypot(lk.x - m.x, lk.y - m.y) < 1 ? lk.y : m.y;
    P.push([c.x - cx, c.y - cy]);
    Q.push([x - cx, y - cy]);
    W.push(m.score * m.score);
  }
  if (!P.length) return { sim: guess ?? { s: 1, a: 0, tx: 0, ty: 0 }, inliers: 0 };
  const wmed = (v) => {
    const idx = v.map((_, i) => i).sort((i, j) => v[i] - v[j]);
    const half = W.reduce((s2, w) => s2 + w, 0) / 2;
    let acc = 0;
    for (const i of idx) {
      acc += W[i];
      if (acc >= half) return v[i];
    }
    return v[idx[idx.length - 1]];
  };
  const trans = { s: 1, a: 0, tx: wmed(P.map((p, i) => Q[i][0] - p[0])), ty: wmed(P.map((p, i) => Q[i][1] - p[1])) };
  let sim = null;
  if (P.length >= 6) {
    const xs = P.map((p) => p[0]);
    const ys = P.map((p) => p[1]);
    const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const fit = spread > a.w * 0.25 ? fitSimilarity(P, Q, W) : null;
    if (fit && Math.abs(fit.a) < 0.06 && Math.abs(Math.log(fit.s)) < 0.05) sim = fit;
  }
  return { sim: sim ?? trans, inliers: P.length };
}
function composeSim(m, c) {
  const co = m.s * Math.cos(m.a);
  const si = m.s * Math.sin(m.a);
  return { s: m.s * c.s, a: m.a + c.a, tx: co * c.tx - si * c.ty + m.tx, ty: si * c.tx + co * c.ty + m.ty };
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
const jobs$1 = /* @__PURE__ */ new Map();
function greyReader(path2, s0, dur, w, h, fps) {
  const ff = getCapabilities().ffmpeg;
  if (!ff) throw new Error("FFmpeg not found");
  const args = ["-hide_banner", "-loglevel", "error", "-nostdin", "-ss", Math.max(0, s0).toFixed(6), "-t", Math.max(0.01, dur + 1 / fps).toFixed(6), "-i", path2, "-an", "-sn", "-vf", `fps=${fps},scale=${w}:${h}:flags=area,format=gray`, "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"];
  const proc = node_child_process.spawn(ff, args);
  const reader = new PipeReader(proc, w * h * 8);
  return {
    next: async () => {
      const b = await reader.read(w * h);
      if (b.length < w * h) return null;
      return { data: new Uint8Array(b.buffer, b.byteOffset, w * h), w, h };
    },
    kill: () => reader.kill()
  };
}
const tick = () => new Promise((r) => setImmediate(r));
async function runTrack(req, send2) {
  const job = { cancelled: false, kill: () => {
  } };
  jobs$1.set(req.id, job);
  const back = req.to < req.from;
  const a = Math.min(req.from, req.to);
  const b = Math.max(req.from, req.to);
  const dur = Math.min(back ? 60 : 3600, b - a);
  const total = Math.max(1, Math.round(dur * req.fps));
  const { width: w, height: h, fps } = req;
  try {
    let frames = [];
    const rd = greyReader(req.path, back ? b - dur : a, dur, w, h, fps);
    job.kill = rd.kill;
    if (back) {
      for (let f = await rd.next(); f && frames.length <= total; f = await rd.next()) {
        frames.push(f);
        if (job.cancelled) return;
        if (frames.length % 30 === 0) {
          send2({ id: req.id, keys: [], progress: 0.3 * frames.length / total, done: false });
          await tick();
        }
      }
      frames.reverse();
    }
    const t0 = back ? b : a;
    const dir = back ? -1 : 1;
    const first = back ? frames[0] : await rd.next();
    if (!first) throw new Error("Could not decode the clip for tracking");
    const trackers = req.points.map((p) => new PointTracker(first, p.u * w, p.v * h, p.feature, p.search));
    let pending = req.points.map(() => []);
    let i = 0;
    for (; ; ) {
      if (job.cancelled) break;
      i++;
      const g = back ? frames[i] : await rd.next();
      if (!g || i > total) break;
      const t = t0 + dir * i / fps;
      trackers.forEach((tr, k) => {
        const r = tr.step(g);
        pending[k].push(t, r.x / w, r.y / h, r.conf);
      });
      if (i % 10 === 0) {
        send2({ id: req.id, keys: pending, progress: back ? 0.3 + 0.7 * i / total : i / total, done: false });
        pending = req.points.map(() => []);
        await tick();
      }
    }
    frames = [];
    send2({ id: req.id, keys: pending, progress: 1, done: true });
  } catch (e) {
    send2({ id: req.id, keys: [], progress: 1, done: true, error: e.message });
  } finally {
    job.kill();
    jobs$1.delete(req.id);
  }
}
async function runStab(req, send2) {
  const job = { cancelled: false, kill: () => {
  } };
  jobs$1.set(req.id, job);
  const { width: w, height: h, fps } = req;
  const dur = Math.max(0, req.s1 - req.s0);
  const total = Math.max(1, Math.round(dur * fps));
  try {
    const rd = greyReader(req.path, req.s0, dur, w, h, fps);
    job.kill = rd.kill;
    let prev = await rd.next();
    if (!prev) throw new Error("Could not decode the clip for stabilising");
    const path2 = [0, 0, 0, 0];
    let acc = { s: 1, a: 0, tx: 0, ty: 0 };
    let guess = null;
    let low = 0;
    for (let i = 1; i <= total; i++) {
      if (job.cancelled) return;
      const g = await rd.next();
      if (!g) break;
      const m = frameMotion(prev, g, guess);
      if (m.inliers < 4) low++;
      guess = m.sim;
      acc = composeSim(m.sim, acc);
      path2.push(acc.tx, acc.ty, acc.a, Math.log(acc.s));
      prev = g;
      if (i % 10 === 0) {
        send2({ id: req.id, progress: i / total, done: false });
        await tick();
      }
    }
    const data = { s0: req.s0, fps, w, h, path: path2 };
    const n = path2.length / 4;
    send2({ id: req.id, progress: 1, done: true, data, error: low > n * 0.3 ? "Little texture to lock on to in parts of this clip; the result may be imperfect." : void 0 });
  } catch (e) {
    send2({ id: req.id, progress: 1, done: true, error: e.message });
  } finally {
    job.kill();
    jobs$1.delete(req.id);
  }
}
function cancelAnalysis(id) {
  const j = jobs$1.get(id);
  if (!j) return;
  j.cancelled = true;
  j.kill();
}
const PAL_OS = process.env.CUTTINGFLOOR_GLOBAL_MENU === "1" || process.env.CUTTINGFLOOR_GLOBAL_MENU !== "0" && /paladin|pal ?os/i.test(process.env.XDG_CURRENT_DESKTOP || "");
const KEYS = { Del: "Delete", Esc: "Escape", Enter: "Return", Space: "Space" };
function accelerator(keys) {
  if (!keys) return void 0;
  const parts = keys.split("+");
  const key = KEYS[parts[parts.length - 1]] ?? parts[parts.length - 1];
  if (!/^([A-Za-z0-9]|F\d{1,2}|Delete|Escape|Return|Space|Tab|Backspace|Up|Down|Left|Right|Home|End|[-=,./;'`[\]\\])$/.test(key)) return void 0;
  return [...parts.slice(0, -1), key.length === 1 ? key.toUpperCase() : key].join("+");
}
const esc = (s) => s.replace(/&/g, "&&");
function setupPalOS(getWindow) {
  if (!PAL_OS) return;
  let last = null;
  const apply = () => {
    const win = getWindow();
    if (!win || win.isDestroyed() || !last) return;
    const send2 = (title, index) => () => !win.isDestroyed() && win.webContents.send("pal:menu", title, index);
    const template = [
      {
        label: "Cutting Floor",
        submenu: [{ label: "Quit Cutting Floor", accelerator: "Ctrl+Q", registerAccelerator: false, click: () => win.close() }]
      },
      ...last.map(([title, items]) => ({
        label: esc(title),
        submenu: items.map((it, i) => {
          if (!it) return { type: "separator" };
          const [label, keys, disabled] = it;
          const checked = /^✓/.test(label);
          const text = label.replace(/^[✓\s]+/, "");
          const acc = accelerator(keys);
          return {
            label: esc(text),
            enabled: !disabled,
            ...checked || /^\s{2,}/.test(label) ? { type: "checkbox", checked } : {},
            ...acc ? { accelerator: acc, registerAccelerator: false } : {},
            click: send2(title, i)
          };
        })
      })),
      {
        label: "Window",
        submenu: [
          { label: "Minimize", click: () => win.minimize() },
          { label: "Zoom", click: () => win.isMaximized() ? win.unmaximize() : win.maximize() },
          { type: "separator" },
          { label: "Enter Full Screen", accelerator: "F11", registerAccelerator: false, click: () => win.setFullScreen(!win.isFullScreen()) }
        ]
      }
    ];
    try {
      win.setMenu(electron.Menu.buildFromTemplate(template));
      win.setMenuBarVisibility(false);
    } catch (e) {
      console.error("[menu]", e);
    }
  };
  electron.ipcMain.on("pal:setMenu", (_e, model) => {
    last = model;
    apply();
  });
  electron.ipcMain.on("pal:os", (e) => e.returnValue = true);
  const watch = () => {
    const win = getWindow();
    if (!win) return void setTimeout(watch, 200);
    win.once("show", () => [300, 1500, 5e3].forEach((ms) => setTimeout(apply, ms)));
  };
  watch();
}
const MODEL = {
  file: "u2net_human_seg.onnx",
  url: "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx",
  sha256: "01eb6a29a5c4d8edb30b56adad9bb3a2a0535338e480724a213e0acfd2d1c73c",
  size: 175997641,
  input: 320
};
const HEADER = 64;
const sharedDir = () => node_path.join(process.env.XDG_DATA_HOME || node_path.join(node_os.homedir(), ".local", "share"), "titianus", "models");
function modelCandidates() {
  const list = [
    process.env.CUTTINGFLOOR_SUBJECT_MODEL || "",
    node_path.join(sharedDir(), MODEL.file),
    node_path.join("/opt/Titianus/resources/models", MODEL.file),
    node_path.join(process.resourcesPath || "", "models", MODEL.file),
    node_path.join(electron.app.getPath("userData"), "models", MODEL.file)
  ];
  return list.filter(Boolean);
}
function modelPath() {
  for (const p of modelCandidates()) {
    try {
      if (node_fs.statSync(p).size === MODEL.size) return p;
    } catch {
    }
  }
  return null;
}
let ort;
function runtime() {
  if (ort === void 0) {
    try {
      ort = require("onnxruntime-node");
    } catch (e) {
      console.error("[subject] onnxruntime unavailable:", e.message);
      ort = null;
    }
  }
  return ort ?? null;
}
function modelStatus() {
  return { path: modelPath(), downloadDir: sharedDir(), size: MODEL.size, runtime: !!runtime() };
}
async function downloadModel(progress) {
  const dest = node_path.join(sharedDir(), MODEL.file);
  node_fs.mkdirSync(node_path.dirname(dest), { recursive: true });
  const part = dest + ".part";
  const hash = node_crypto.createHash("sha256");
  const get = (url, hops = 0) => new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Cutting Floor" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 6) {
        res.resume();
        resolve(get(new URL(res.headers.location, url).toString(), hops + 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`Download failed (HTTP ${res.statusCode})`));
        return;
      }
      const total = Number(res.headers["content-length"]) || MODEL.size;
      let done = 0;
      let last = 0;
      const out = node_fs.createWriteStream(part);
      res.on("data", (b) => {
        hash.update(b);
        done += b.length;
        if (Date.now() - last > 250) {
          last = Date.now();
          progress(done, total);
        }
      });
      res.pipe(out);
      out.on("finish", () => resolve());
      out.on("error", reject);
      res.on("error", reject);
    }).on("error", reject);
  });
  try {
    await get(MODEL.url);
    if (hash.digest("hex") !== MODEL.sha256) throw new Error("The downloaded model failed its checksum; please try again.");
    node_fs.renameSync(part, dest);
  } catch (e) {
    node_fs.rmSync(part, { force: true });
    throw e;
  }
  return modelStatus();
}
let session = null;
let releaseTimer = null;
function getSession(path2) {
  const rt = runtime();
  if (!rt) throw new Error("The AI runtime is missing from this Cutting Floor installation.");
  if (releaseTimer) clearTimeout(releaseTimer);
  if (!session || session.path !== path2) {
    const threads = Math.max(1, node_os.cpus().length - 1);
    session = { path: path2, s: rt.InferenceSession.create(path2, { intraOpNumThreads: threads, interOpNumThreads: 1, graphOptimizationLevel: "all" }) };
  }
  return session.s;
}
function releaseSoon() {
  if (releaseTimer) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    const s = session;
    session = null;
    void s?.s.then((x) => x.release()).catch(() => {
    });
  }, 12e4);
}
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
function toInput(rgb, w, h, S = MODEL.input) {
  const plane = S * S;
  const out = new Float32Array(3 * plane);
  let max = 1e-6;
  const sx = w / S;
  const sy = h / S;
  for (let y = 0; y < S; y++) {
    const fy = Math.min(h - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(h - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < S; x++) {
      const fx = Math.min(w - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(w - 1, x0 + 1);
      const tx = fx - x0;
      for (let c = 0; c < 3; c++) {
        const a = rgb[(y0 * w + x0) * 3 + c] * (1 - tx) + rgb[(y0 * w + x1) * 3 + c] * tx;
        const b = rgb[(y1 * w + x0) * 3 + c] * (1 - tx) + rgb[(y1 * w + x1) * 3 + c] * tx;
        const v = (a * (1 - ty) + b * ty) / 255;
        out[c * plane + y * S + x] = v;
        if (v > max) max = v;
      }
    }
  }
  for (let c = 0; c < 3; c++)
    for (let i = 0; i < plane; i++) out[c * plane + i] = (out[c * plane + i] / max - MEAN[c]) / STD[c];
  return out;
}
function toMatte(prob, S, w, h) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < prob.length; i++) {
    if (prob[i] < lo) lo = prob[i];
    if (prob[i] > hi) hi = prob[i];
  }
  const out = new Uint8Array(w * h);
  if (hi < 0.3) return out;
  const k = 1 / Math.max(hi - lo, 1e-6);
  const sx = S / w;
  const sy = S / h;
  for (let y = 0; y < h; y++) {
    const fy = Math.min(S - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(S - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(S - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(S - 1, x0 + 1);
      const tx = fx - x0;
      const a = prob[y0 * S + x0] * (1 - tx) + prob[y0 * S + x1] * tx;
      const b = prob[y1 * S + x0] * (1 - tx) + prob[y1 * S + x1] * tx;
      out[y * w + x] = Math.round(Math.min(1, Math.max(0, (a * (1 - ty) + b * ty - lo) * k)) * 255);
    }
  }
  return out;
}
function enclosedHoles(matte, w, h, maxFrac = 0.08) {
  const n = w * h;
  const out = new Uint8Array(n);
  const bg = new Uint8Array(n);
  let person = 0;
  for (let i = 0; i < n; i++) {
    if (matte[i] < 128) bg[i] = 1;
    else person++;
  }
  if (!person) return out;
  const seen = new Uint8Array(n);
  const stack = [];
  const push = (i) => {
    if (bg[i] && !seen[i]) {
      seen[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  const flood = () => {
    while (stack.length) {
      const i = stack.pop();
      const x = i % w;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (i >= w) push(i - w);
      if (i < n - w) push(i + w);
    }
  };
  flood();
  const label = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (!bg[i] || seen[i] || label[i] >= 0) continue;
    const members = [];
    const q = [i];
    label[i] = i;
    while (q.length) {
      const j = q.pop();
      members.push(j);
      const x = j % w;
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j >= w ? j - w : -1, j < n - w ? j + w : -1]) {
        if (k >= 0 && bg[k] && !seen[k] && label[k] < 0) {
          label[k] = i;
          q.push(k);
        }
      }
    }
    if (members.length <= maxFrac * person) for (const j of members) out[j] = 255;
  }
  return out;
}
function packMatte(matte, holes) {
  const out = new Uint8Array(matte.length * 2);
  for (let i = 0; i < matte.length; i++) {
    out[2 * i] = matte[i];
    out[2 * i + 1] = holes[i];
  }
  return out;
}
function writeHeader(fd, w, h, n, step, fps, s0) {
  const b = Buffer.alloc(HEADER);
  b.write("CRMT", 0, "latin1");
  b.writeUInt32LE(2, 4);
  b.writeUInt32LE(w, 8);
  b.writeUInt32LE(h, 12);
  b.writeUInt32LE(n, 16);
  b.writeUInt32LE(step, 20);
  b.writeDoubleLE(fps, 24);
  b.writeDoubleLE(s0, 32);
  node_fs.writeSync(fd, b, 0, HEADER, 0);
}
const jobs = /* @__PURE__ */ new Map();
let cacheDir = "";
function setMatteCacheDir(dir) {
  cacheDir = dir;
}
async function runSubject(req, send2) {
  const job = { cancelled: false, kill: () => {
  } };
  jobs.set(req.id, job);
  const { width: w, height: h, fps } = req;
  const step = Math.max(1, Math.round(req.step));
  const dur = Math.max(0, req.s1 - req.s0);
  const total = Math.max(1, Math.floor(dur * fps / step) + 1);
  const dir = cacheDir || node_path.join(electron.app.getPath("userData"), "cache", "mattes");
  node_fs.mkdirSync(dir, { recursive: true });
  const file = node_path.join(dir, `${req.id}.matte`);
  let fd = -1;
  let n = 0;
  try {
    const model = modelPath();
    if (!model) throw new Error("The Subject Key model is not installed.");
    const s = await getSession(model);
    const ff = getCapabilities().ffmpeg;
    if (!ff) throw new Error("FFmpeg not found");
    const vf = `fps=${fps},select='not(mod(n\\,${step}))',scale=${w}:${h}:flags=area,format=rgb24`;
    const args = ["-hide_banner", "-loglevel", "error", "-nostdin", "-ss", Math.max(0, req.s0).toFixed(6), "-t", (dur + 1 / fps).toFixed(6), "-i", req.path, "-an", "-sn", "-vf", vf, "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"];
    const proc = node_child_process.spawn(ff, args);
    const reader = new PipeReader(proc, w * h * 3 * 4);
    job.kill = () => reader.kill();
    fd = node_fs.openSync(file, "w");
    writeHeader(fd, w, h, 0, step, fps, req.s0);
    const started = Date.now();
    const S = MODEL.input;
    for (; ; ) {
      if (job.cancelled) break;
      const b = await reader.read(w * h * 3);
      if (b.length < w * h * 3 || n >= total + 1) break;
      const rgb = new Uint8Array(b.buffer, b.byteOffset, w * h * 3);
      const x = new (runtime()).Tensor("float32", toInput(rgb, w, h), [1, 3, S, S]);
      const out = await s.run({ [s.inputNames[0]]: x });
      const prob = out[s.outputNames[0]].data;
      const matte = toMatte(prob, S, w, h);
      const px = packMatte(matte, enclosedHoles(matte, w, h));
      node_fs.writeSync(fd, px, 0, px.length, HEADER + n * w * h * 2);
      n++;
      const el = (Date.now() - started) / 1e3;
      send2({ id: req.id, progress: Math.min(1, n / total), done: false, eta: n >= 2 ? el / n * Math.max(0, total - n) : void 0 });
    }
    if (job.cancelled) throw new Error("cancelled");
    if (!n) throw new Error("Could not decode the clip for Subject Key");
    writeHeader(fd, w, h, n, step, fps, req.s0);
    node_fs.closeSync(fd);
    fd = -1;
    const data = { file, s0: req.s0, fps, step, n, w, h, path: req.path };
    send2({ id: req.id, progress: 1, done: true, data });
  } catch (e) {
    if (fd >= 0) node_fs.closeSync(fd);
    fd = -1;
    node_fs.rmSync(file, { force: true });
    const msg = e.message;
    send2({ id: req.id, progress: 1, done: true, error: msg === "cancelled" ? void 0 : msg });
  } finally {
    job.kill();
    jobs.delete(req.id);
    releaseSoon();
  }
}
function cancelSubject(id) {
  const j = jobs.get(id);
  if (!j) return false;
  j.cancelled = true;
  j.kill();
  return true;
}
function forgetMatte(file) {
  const dir = cacheDir || node_path.join(electron.app.getPath("userData"), "cache", "mattes");
  if (file && node_path.dirname(file) === dir && file.endsWith(".matte")) node_fs.rmSync(file, { force: true });
}
const appIcon = path.join(__dirname, "../../resources/icon.png");
registerMediaScheme();
electron.app.commandLine.appendSwitch("ignore-gpu-blocklist");
if (process.env.CUTTINGFLOOR_SOFTWARE_GL) {
  electron.app.commandLine.appendSwitch("use-angle", "swiftshader");
  electron.app.commandLine.appendSwitch("enable-unsafe-swiftshader");
}
electron.app.commandLine.appendSwitch("enable-gpu-rasterization");
electron.app.commandLine.appendSwitch("enable-features", "VaapiVideoDecoder,VaapiVideoDecodeLinuxGL,AcceleratedVideoDecodeLinuxGL");
let mainWindow = null;
let exportWindow = null;
let dirty = false;
function rendererUrl(page) {
  const dev = process.env.ELECTRON_RENDERER_URL;
  if (!electron.app.isPackaged && dev) return { url: `${dev}/${page}.html` };
  return { file: node_path.join(__dirname, `../renderer/${page}.html`) };
}
function load(win, page) {
  const r = rendererUrl(page);
  const test = !!process.env.CUTTINGFLOOR_SMOKE && page === "index";
  if (r.url) void win.loadURL(r.url + (test ? "?test=1" : ""));
  else void win.loadFile(r.file, test ? { query: { test: "1" } } : void 0);
}
async function runSmoke(win) {
  const spec = require(process.env.CUTTINGFLOOR_SMOKE);
  let code = 0;
  for (const step of spec.steps) {
    try {
      const res = await win.webContents.executeJavaScript(`(async () => { ${step.js} })()`);
      console.log(`SMOKE ${step.name}: ${typeof res === "string" ? res : JSON.stringify(res)}`);
      if (step.wait) await new Promise((r) => setTimeout(r, step.wait));
      if (step.shot) {
        const img = await win.webContents.capturePage();
        node_fs.writeFileSync(node_path.join(spec.outDir, `${step.name}.png`), img.toPNG());
      }
    } catch (e) {
      console.log(`SMOKE FAIL ${step.name}: ${e.message}`);
      code = 1;
      break;
    }
  }
  dirty = false;
  electron.app.exit(code);
}
function createMainWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1600,
    height: 980,
    icon: appIcon,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0e0f12",
    title: "Cutting Floor",
    show: false,
    webPreferences: {
      preload: node_path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  if (process.env.CUTTINGFLOOR_SMOKE) mainWindow.webContents.once("did-finish-load", () => setTimeout(() => void runSmoke(mainWindow), 1500));
  mainWindow.webContents.on("console-message", (_e, level, message) => {
    if (process.env.CUTTINGFLOOR_SMOKE && level >= 2) console.log(`RENDERER ${level === 3 ? "ERROR" : "WARN"}: ${message}`);
  });
  mainWindow.webContents.on("before-input-event", (_e, input) => {
    if (input.type === "keyDown" && input.key === "F12") mainWindow?.webContents.toggleDevTools();
  });
  mainWindow.on("close", (e) => {
    if (!dirty || !mainWindow) return;
    const choice = electron.dialog.showMessageBoxSync(mainWindow, {
      type: "warning",
      buttons: ["Quit without saving", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      message: "You have unsaved changes.",
      detail: "Quit Cutting Floor and lose them?"
    });
    if (choice === 1) e.preventDefault();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    exportWindow?.destroy();
  });
  load(mainWindow, "index");
}
function send(channel, payload) {
  mainWindow?.webContents.send(channel, payload);
}
function registerIpc() {
  electron.ipcMain.handle("caps", () => getCapabilities());
  electron.ipcMain.handle("dialog:import", async () => {
    const r = await electron.dialog.showOpenDialog(mainWindow, {
      title: "Import media",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Media",
          extensions: ["mp4", "mov", "mkv", "mxf", "m4v", "webm", "avi", "mts", "m2ts", "wav", "mp3", "flac", "aac", "m4a", "ogg", "opus", "png", "jpg", "jpeg", "webp", "tif", "tiff", "bmp", "gif"]
        },
        { name: "All files", extensions: ["*"] }
      ]
    });
    return r.canceled ? [] : r.filePaths;
  });
  electron.ipcMain.handle("media:probe", (_e, path2) => probe(path2));
  electron.ipcMain.handle("media:thumb", (_e, info) => thumbnail(info.path, info.duration, info.kind));
  electron.ipcMain.handle("media:peaks", (_e, path2) => peaks(path2));
  electron.ipcMain.on("track:start", (e, req) => void runTrack(req, (p) => !e.sender.isDestroyed() && e.sender.send("track:progress", p)));
  electron.ipcMain.on("stab:start", (e, req) => void runStab(req, (p) => !e.sender.isDestroyed() && e.sender.send("stab:progress", p)));
  if (!PAL_OS) electron.ipcMain.on("pal:os", (e) => e.returnValue = false);
  electron.ipcMain.on("analysis:cancel", (_e, id) => {
    if (!cancelSubject(id)) cancelAnalysis(id);
  });
  electron.ipcMain.on("subject:start", (e, req) => void runSubject(req, (p) => !e.sender.isDestroyed() && e.sender.send("subject:progress", p)));
  electron.ipcMain.handle("subject:model", () => modelStatus());
  electron.ipcMain.on("subject:forget", (_e, file) => forgetMatte(file));
  electron.ipcMain.handle(
    "subject:download",
    (e) => downloadModel((done, total) => !e.sender.isDestroyed() && e.sender.send("subject:downloadProgress", done, total)).catch((err) => ({ ...modelStatus(), error: err.message }))
  );
  const presetsFile = () => node_path.join(electron.app.getPath("userData"), "presets.json");
  electron.ipcMain.handle("presets:load", () => {
    try {
      const v = JSON.parse(node_fs.readFileSync(presetsFile(), "utf8"));
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle("presets:save", (_e, list) => {
    node_fs.writeFileSync(presetsFile(), JSON.stringify(list, null, 1));
  });
  electron.ipcMain.handle("media:pcm", (_e, path2, s0, dur) => decodePcm(path2, s0, dur));
  electron.ipcMain.handle("proxy:request", (_e, info) => requestProxy(info));
  electron.ipcMain.handle("file:exists", (_e, path2) => node_fs.existsSync(path2));
  electron.ipcMain.handle("file:readText", (_e, path2) => {
    if (node_fs.statSync(path2).size > 64 * 1024 * 1024) throw new Error("File too large");
    return node_fs.readFileSync(path2, "utf8");
  });
  electron.ipcMain.handle("dialog:openFile", async (_e, title, extensions) => {
    const r = await electron.dialog.showOpenDialog(mainWindow, { title, properties: ["openFile"], filters: [{ name: extensions.join(", ").toUpperCase(), extensions }] });
    return r.canceled ? null : r.filePaths[0] ?? null;
  });
  electron.ipcMain.handle("fonts:list", () => listFonts());
  electron.ipcMain.handle("project:openDialog", async () => {
    const r = await electron.dialog.showOpenDialog(mainWindow, {
      title: "Open project",
      properties: ["openFile"],
      filters: [{ name: "Cutting Floor project", extensions: ["cuttingfloor"] }]
    });
    if (r.canceled || !r.filePaths[0]) return null;
    return { path: r.filePaths[0], content: node_fs.readFileSync(r.filePaths[0], "utf8") };
  });
  electron.ipcMain.handle("project:saveDialog", async (_e, name) => {
    const r = await electron.dialog.showSaveDialog(mainWindow, {
      title: "Save project",
      defaultPath: `${name || "Untitled"}.cuttingfloor`,
      filters: [{ name: "Cutting Floor project", extensions: ["cuttingfloor"] }]
    });
    return r.canceled ? null : r.filePath;
  });
  electron.ipcMain.handle("project:write", (_e, path2, content) => {
    node_fs.writeFileSync(path2, content, "utf8");
    return true;
  });
  electron.ipcMain.handle("export:dialog", async (_e, defaultName, ext) => {
    const r = await electron.dialog.showSaveDialog(mainWindow, {
      title: "Export",
      defaultPath: `${defaultName}.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    });
    return r.canceled ? null : r.filePath;
  });
  electron.ipcMain.on("shell:showItem", (_e, path2) => electron.shell.showItemInFolder(path2));
  electron.ipcMain.on("app:dirty", (_e, d) => dirty = d);
  electron.ipcMain.on("app:title", (_e, t) => mainWindow?.setTitle(t));
  electron.ipcMain.on("export:start", (_e, job) => startExport(job));
  electron.ipcMain.on("export:cancel", () => exportWindow?.webContents.send("export:cancel"));
  electron.ipcMain.on("export:progress", (_e, p) => {
    send("export:progress", p);
    if (p.done) {
      const w = exportWindow;
      exportWindow = null;
      setTimeout(() => w?.destroy(), 200);
    }
  });
  onProxyEvent((ev) => send("proxy:event", ev));
}
let fontCache = null;
function listFonts() {
  if (fontCache) return fontCache;
  const r = node_child_process.spawnSync("fc-list", [":", "family"], { encoding: "utf8", timeout: 8e3 });
  const set = /* @__PURE__ */ new Set(["IBM Plex Sans", "JetBrains Mono"]);
  if (r.status === 0) {
    for (const line of r.stdout.split("\n")) for (const f of line.split(",")) if (f.trim() && !f.includes("\\")) set.add(f.trim());
  }
  fontCache = [...set].sort((a, b) => a.localeCompare(b));
  return fontCache;
}
function startExport(job) {
  if (exportWindow) {
    send("export:progress", { frame: 0, total: 0, fps: 0, done: true, error: "An export is already running." });
    return;
  }
  exportWindow = new electron.BrowserWindow({
    show: false,
    width: 320,
    height: 200,
    webPreferences: {
      // Trusted, local-only page: needs Node to drive FFmpeg pipes directly.
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });
  exportWindow.webContents.once("did-finish-load", () => exportWindow?.webContents.send("export:job", job));
  exportWindow.webContents.on("render-process-gone", (_e, d) => {
    send("export:progress", { frame: 0, total: 0, fps: 0, done: true, error: `Export process crashed (${d.reason}).` });
    exportWindow = null;
  });
  load(exportWindow, "export");
}
electron.app.whenReady().then(() => {
  setCacheRoot(node_path.join(electron.app.getPath("userData"), "cache"));
  setMatteCacheDir(node_path.join(electron.app.getPath("userData"), "cache", "mattes"));
  handleMediaProtocol();
  electron.Menu.setApplicationMenu(null);
  registerIpc();
  setupPalOS(() => mainWindow);
  createMainWindow();
  setTimeout(() => getCapabilities(), 50);
});
electron.app.on("window-all-closed", () => {
  cancelAllProxies();
  electron.app.quit();
});

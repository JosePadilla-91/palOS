'use strict';
// Media model: opens files and DVDs, decides how Chromium will receive them,
// and builds every ffmpeg command line Vid-View runs.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ff = require('./ffmpeg');

const TEXT_SUBS = new Set(['subrip', 'srt', 'ass', 'ssa', 'webvtt', 'mov_text', 'text', 'microdvd',
  'subviewer', 'subviewer1', 'sami', 'realtext', 'jacosub', 'mpl2', 'pjs', 'stl', 'vplayer', 'eia_608']);
const BITMAP_SUBS = new Set(['dvd_subtitle', 'hdmv_pgs_subtitle', 'dvb_subtitle', 'xsub', 'dvb_teletext']);
const NATIVE_AUDIO = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac',
  'pcm_s16le', 'pcm_s24le', 'pcm_s32le', 'pcm_f32le', 'pcm_u8']);
const EXT_SUB_EXT = ['.srt', '.ass', '.ssa', '.vtt', '.sub', '.smi', '.txt'];

const LANGS = {
  en: 'English', eng: 'English', fr: 'French', fre: 'French', fra: 'French', de: 'German', ger: 'German', deu: 'German',
  es: 'Spanish', spa: 'Spanish', it: 'Italian', ita: 'Italian', pt: 'Portuguese', por: 'Portuguese', nl: 'Dutch',
  dut: 'Dutch', nld: 'Dutch', sv: 'Swedish', swe: 'Swedish', no: 'Norwegian', nor: 'Norwegian', da: 'Danish',
  dan: 'Danish', fi: 'Finnish', fin: 'Finnish', pl: 'Polish', pol: 'Polish', ru: 'Russian', rus: 'Russian',
  uk: 'Ukrainian', ukr: 'Ukrainian', cs: 'Czech', cze: 'Czech', ces: 'Czech', hu: 'Hungarian', hun: 'Hungarian',
  el: 'Greek', gre: 'Greek', ell: 'Greek', tr: 'Turkish', tur: 'Turkish', ar: 'Arabic', ara: 'Arabic',
  he: 'Hebrew', heb: 'Hebrew', hi: 'Hindi', hin: 'Hindi', ja: 'Japanese', jpn: 'Japanese', ko: 'Korean',
  kor: 'Korean', zh: 'Chinese', chi: 'Chinese', zho: 'Chinese', th: 'Thai', tha: 'Thai', vi: 'Vietnamese',
  vie: 'Vietnamese', id: 'Indonesian', ind: 'Indonesian', ro: 'Romanian', rum: 'Romanian', ron: 'Romanian',
  bg: 'Bulgarian', bul: 'Bulgarian', hr: 'Croatian', hrv: 'Croatian', sr: 'Serbian', srp: 'Serbian',
  ca: 'Catalan', cat: 'Catalan', is: 'Icelandic', ice: 'Icelandic', isl: 'Icelandic', la: 'Latin', lat: 'Latin',
};
const AUDIO_CODECS = {
  ac3: 'Dolby Digital', eac3: 'Dolby Digital Plus', truehd: 'Dolby TrueHD', dts: 'DTS', aac: 'AAC', mp3: 'MP3',
  mp2: 'MPEG Audio', flac: 'FLAC', opus: 'Opus', vorbis: 'Vorbis', alac: 'Apple Lossless', wmav2: 'WMA',
  wmapro: 'WMA Pro', pcm_dvd: 'LPCM', amr_nb: 'AMR',
};
const VIDEO_CODECS = {
  h264: 'H.264', hevc: 'HEVC', vp8: 'VP8', vp9: 'VP9', av1: 'AV1', mpeg2video: 'MPEG-2', mpeg1video: 'MPEG-1',
  mpeg4: 'MPEG-4 Part 2', msmpeg4v3: 'DivX 3', wmv3: 'WMV 9', wmv2: 'WMV 8', vc1: 'VC-1', theora: 'Theora',
  prores: 'ProRes', dnxhd: 'DNxHD', mjpeg: 'Motion JPEG', flv1: 'Sorenson Spark', h263: 'H.263', rv40: 'RealVideo',
  vp6f: 'VP6', cinepak: 'Cinepak', huffyuv: 'HuffYUV', ffv1: 'FFV1', dvvideo: 'DV',
};

const langName = (c) => (c && LANGS[String(c).toLowerCase()]) || (c && c !== 'und' ? String(c).toUpperCase() : null);
const chLabel = (n, layout) => {
  if (layout && /5\.1/.test(layout)) return '5.1';
  if (layout && /7\.1/.test(layout)) return '7.1';
  return ({ 1: 'Mono', 2: 'Stereo', 6: '5.1', 8: '7.1' })[n] || (n ? `${n} ch` : '');
};
const ratio = (s) => {
  if (!s || s === 'N/A' || s.startsWith('0:')) return null;
  const [a, b] = s.split(':').map(Number);
  return a > 0 && b > 0 ? a / b : null;
};
const even = (n) => Math.max(2, Math.round(n / 2) * 2);

function prettyFileTitle(p, tags = {}) {
  if (tags.title && tags.title.trim().length > 1 && !/^(untitled|video)$/i.test(tags.title.trim())) {
    const t = tags.title.trim();
    return tags.artist ? `${tags.artist} — ${t}` : t;
  }
  let base = path.basename(p, path.extname(p));
  if (!/\s/.test(base)) base = base.replace(/[._]+/g, ' ');
  return base.trim() || path.basename(p);
}

function prettyLabel(s) {
  const t = String(s || '').replace(/_/g, ' ').trim();
  if (!t) return 'Untitled Disc';
  return t === t.toUpperCase() ? t.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()) : t;
}

function isoVolumeLabel(isoPath) {
  try {
    const fd = fs.openSync(isoPath, 'r');
    const buf = Buffer.alloc(2048);
    fs.readSync(fd, buf, 0, 2048, 16 * 2048);
    fs.closeSync(fd);
    if (buf.toString('latin1', 1, 6) === 'CD001') return buf.toString('latin1', 40, 72).trim();
  } catch { /* ignore */ }
  return null;
}

/** Work out what a path is: a regular media file, or a DVD (ISO or folder). */
function resolveTarget(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    if (path.basename(p).toUpperCase() === 'VIDEO_TS') return { kind: 'dvd', root: path.dirname(p) };
    const entries = fs.readdirSync(p);
    if (entries.some((e) => e.toUpperCase() === 'VIDEO_TS')) return { kind: 'dvd', root: p };
    if (entries.some((e) => e.toUpperCase() === 'VIDEO_TS.IFO')) return { kind: 'dvd', root: p };
    throw new Error('That folder doesn’t contain a DVD (no VIDEO_TS folder found).');
  }
  const ext = path.extname(p).toLowerCase();
  if (ext === '.iso' || ext === '.img') return { kind: 'dvd', root: p };
  if (ext === '.ifo' && path.basename(path.dirname(p)).toUpperCase() === 'VIDEO_TS') {
    return { kind: 'dvd', root: path.dirname(path.dirname(p)) };
  }
  return { kind: 'file', path: p };
}

const discCache = new Map();
async function listDvdTitles(root) {
  if (discCache.has(root)) return discCache.get(root);
  const feats = await ff.features();
  if (!feats.dvd) throw new Error('This ffmpeg build has no DVD-Video support. Run “npm run fetch-ffmpeg” to bundle one that does.');
  const titles = [];
  for (let start = 1; start <= 99; start += 4) {
    const batch = [start, start + 1, start + 2, start + 3].filter((n) => n <= 99);
    const results = await Promise.all(batch.map((n) => ff.probe(['-f', 'dvdvideo', '-title', String(n), '-i', root])
      .then((pr) => ({ n, pr })).catch(() => null)));
    let stop = false;
    for (const r of results) {
      if (!r) { stop = true; continue; }
      if (stop) continue;
      titles.push({ n: r.n, duration: Number(r.pr.format.duration) || 0, chapters: (r.pr.chapters || []).length, probe: r.pr });
    }
    if (stop) break;
  }
  if (!titles.length) {
    throw new Error('Couldn’t read this disc. It may be damaged, or it may be copy-protected with CSS encryption, which Vid-View can’t decrypt.');
  }
  let label = root.toLowerCase().endsWith('.iso') ? isoVolumeLabel(root) : null;
  if (!label) label = path.basename(root.replace(/\.(iso|img)$/i, ''));
  const disc = { root, label: prettyLabel(label), titles, main: titles.reduce((a, b) => (b.duration > a.duration ? b : a)).n };
  discCache.set(root, disc);
  return disc;
}

function findExternalSubs(file) {
  const dir = path.dirname(file);
  const base = path.basename(file, path.extname(file)).toLowerCase();
  let list = [];
  try { list = fs.readdirSync(dir); } catch { return []; }
  const lower = new Set(list.map((f) => f.toLowerCase()));
  return list.filter((f) => {
    const l = f.toLowerCase();
    const ext = path.extname(l);
    if (!EXT_SUB_EXT.includes(ext) || !l.startsWith(base)) return false;
    if (ext === '.sub' && lower.has(l.replace(/\.sub$/, '.idx'))) return false; // VobSub, bitmap: skip
    if (ext === '.txt' && l !== `${base}.txt`) return false;
    return true;
  }).map((f) => {
    const mid = path.basename(f, path.extname(f)).slice(base.length).replace(/^[._\-\s]+/, '');
    return { path: path.join(dir, f), label: langName(mid.split(/[._\-\s]/)[0]) || mid || 'External' };
  });
}

let nextId = 1;

class Media {
  constructor(o) {
    Object.assign(this, o);
    this.id = String(nextId++);
    const streams = this.probe.streams || [];
    this.startTime = Number(this.probe.format.start_time) || 0;
    if (this.kind === 'dvd') this.startTime = 0;
    this.duration = Number(this.probe.format.duration) || 0;
    this.video = streams.find((s) => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic)) || null;
    this.cover = streams.find((s) => s.codec_type === 'video' && s.disposition && s.disposition.attached_pic) || null;
    this.audio = streams.filter((s) => s.codec_type === 'audio');
    this.subStreams = streams.filter((s) => s.codec_type === 'subtitle');
    this.externalSubs = [];
    this.subs = [];
    for (const s of this.subStreams) {
      const bitmap = BITMAP_SUBS.has(s.codec_name) || !TEXT_SUBS.has(s.codec_name);
      const t = s.tags || {};
      const lang = langName(t.language);
      const bits = [lang || (this.kind === 'dvd' ? `Subtitle ${this.subs.length + 1}` : `Track ${this.subs.length + 1}`)];
      if (t.title && t.title !== lang) bits.push(t.title);
      if (s.disposition && s.disposition.forced) bits.push('Forced');
      if (s.disposition && s.disposition.hearing_impaired) bits.push('SDH');
      this.subs.push({ key: `s${s.index}`, index: s.index, label: bits.join(' · '), lang: t.language || null, bitmap, codec: s.codec_name });
    }
    if (this.kind === 'file') {
      for (const ext of findExternalSubs(this.path)) this.addExternalSub(ext.path, ext.label);
    }
  }

  addExternalSub(p, label) {
    const existing = this.externalSubs.find((e) => e.path === p);
    if (existing) return this.subs.find((s) => s.key === existing.key);
    const key = `x${this.externalSubs.length}`;
    this.externalSubs.push({ key, path: p });
    const ext = path.extname(p).toLowerCase();
    const sub = { key, label: `${label || path.basename(p)} (file)`, lang: null, bitmap: false, external: true, codec: ext.slice(1) };
    this.subs.push(sub);
    return sub;
  }

  get interlaced() {
    const v = this.video;
    if (!v) return false;
    if (this.kind === 'dvd' || v.codec_name === 'mpeg2video' || v.codec_name === 'mpeg1video') return true;
    return !!(v.field_order && !['progressive', 'unknown'].includes(v.field_order));
  }

  /** Display size (square pixels) and a capped output size for live conversion. */
  dims(maxW = 1920, maxH = 1080) {
    const v = this.video;
    if (!v) return null;
    const w = v.width || 0;
    const h = v.height || 0;
    const dar = ratio(v.display_aspect_ratio) || (ratio(v.sample_aspect_ratio) ? (w * ratio(v.sample_aspect_ratio)) / h : w / h);
    let dw = Math.round(h * dar);
    let dh = h;
    const scale = Math.min(1, maxW / dw, maxH / dh);
    return { width: w, height: h, dar, displayWidth: even(dw), displayHeight: even(dh), outW: even(dw * scale), outH: even(dh * scale) };
  }

  /** Arguments that open the input, seeked to `t` seconds (relative to the start). */
  inputArgs(t = 0, { fastSeek = false } = {}) {
    const ss = t > 0.01 ? ['-ss', t.toFixed(3)] : [];
    const pre = fastSeek ? ['-skip_frame', 'nokey'] : [];
    if (this.kind === 'dvd') {
      return ['-f', 'dvdvideo', '-title', String(this.dvdTitle), ...pre, ...ss, '-i', this.root];
    }
    return [...pre, ...ss, '-i', this.path];
  }

  plan(caps = {}) {
    if (this.kind === 'dvd') return { mode: 'transcode', why: 'DVD-Video (MPEG-2), converted live' };
    const v = this.video;
    const a = this.audio[0];
    const fmt = this.probe.format.format_name || '';
    const ext = path.extname(this.path).toLowerCase();
    const vNative = !v || this.videoNative(caps);
    const aNative = !a || (NATIVE_AUDIO.has(a.codec_name) && caps[a.codec_name] !== false);
    let container = /mov,mp4|^mp3$|^flac$|^wav$|^ogg$|^aac$/.test(fmt);
    if (/matroska|webm/.test(fmt)) container = ext === '.webm' || caps.mkv !== false;
    if (vNative && aNative && container) return { mode: 'direct', why: 'Plays natively' };
    if (!v || this.videoCopyable(caps)) {
      return { mode: 'remux', why: v ? 'Repackaged live (picture untouched)' : 'Audio converted live' };
    }
    return { mode: 'transcode', why: `${VIDEO_CODECS[v.codec_name] || v.codec_name} converted live` };
  }

  videoNative(caps) {
    const v = this.video;
    const pf = v.pix_fmt || '';
    switch (v.codec_name) {
      case 'h264': return caps.h264 !== false && /^yuvj?420p$/.test(pf);
      case 'hevc': return !!caps.hevc;
      case 'vp8': return caps.vp8 !== false;
      case 'vp9': return caps.vp9 !== false;
      case 'av1': return caps.av1 !== false;
      case 'theora': return caps.theora !== false && /ogg/.test(this.probe.format.format_name || '');
      default: return false;
    }
  }

  videoCopyable(caps) {
    const v = this.video;
    if (!v) return true;
    const pf = v.pix_fmt || '';
    if (v.codec_name === 'h264') return /^yuvj?420p$/.test(pf);
    if (v.codec_name === 'hevc') return !!caps.hevc;
    return ['vp9', 'av1'].includes(v.codec_name) && caps[v.codec_name] !== false;
  }

  audioCopyable(a) {
    return !!a && a.codec_name === 'aac' && (!a.profile || a.profile === 'LC') && a.channels <= 2;
  }

  /** Codec strings for Media Source Extensions, per live mode. */
  mseCodecs() {
    const v = this.video;
    const aac = 'mp4a.40.2';
    const hasA = this.audio.length > 0;
    const out = { transcode: [v ? 'avc1.640028' : null, hasA ? aac : null].filter(Boolean).join(',') };
    let vc = null;
    if (v) {
      const lvl = Number(v.level) > 0 ? Number(v.level) : 40;
      const tenBit = /10/.test(v.pix_fmt || '');
      switch (v.codec_name) {
        case 'h264': {
          const prof = { Baseline: '4200', 'Constrained Baseline': '42e0', Main: '4d00', Extended: '5800', High: '6400' }[v.profile] || '6400';
          vc = `avc1.${prof}${Math.min(255, lvl).toString(16).padStart(2, '0')}`;
          break;
        }
        case 'hevc': vc = `hvc1.${tenBit ? '2.4' : '1.6'}.L${lvl}.B0`; break;
        case 'vp9': vc = tenBit ? 'vp09.02.10.10' : 'vp09.00.10.08'; break;
        case 'av1': vc = tenBit ? 'av01.0.08M.10' : 'av01.0.08M.08'; break;
        default: vc = null;
      }
    }
    out.remux = v && !vc ? null : [vc, hasA ? aac : null].filter(Boolean).join(',');
    return out;
  }

  /** Where a stream should really start for a seek to t (keyframe for copy mode). */
  async seekPoint(t, mode) {
    if (mode !== 'remux' || !this.video || this.kind !== 'file' || t < 0.5) return Math.max(0, t);
    const k = await ff.keyframeBefore(this.path, t + this.startTime);
    return k == null ? t : Math.max(0, k - this.startTime);
  }

  videoFilters() {
    const d = this.dims();
    const f = [];
    if (this.interlaced) f.push('bwdif=mode=send_frame:deint=interlaced');
    if (d) f.push(`scale=${d.outW}:${d.outH}:flags=bicubic`, 'setsar=1');
    f.push('format=yuv420p');
    return f;
  }

  streamArgs({ mode = 'transcode', t = 0, audio = null, burn = null, preset = 'veryfast' }) {
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin'];
    const burnSub = burn ? this.subs.find((s) => s.key === burn && s.index != null) : null;
    if (burnSub) args.push('-analyzeduration', '30M', '-probesize', '60M');
    // copy mode: `t` is a keyframe time from seekPoint(). ffmpeg deliberately seeks ~0.13 s early
    // for formats with B-frames, so nudge past the keyframe to make it land on that same one.
    const ss = mode === 'remux' && !burn && this.video && t > 0.01 ? t + 0.2 : t;
    args.push('-fflags', '+genpts+discardcorrupt', ...this.inputArgs(ss));
    const v = this.video;
    const a = audio != null ? this.audio.find((s) => s.index === Number(audio)) || this.audio[0] : this.audio[0];
    if (v) {
      if (mode === 'remux' && !burnSub) {
        args.push('-map', `0:${v.index}`, '-c:v', 'copy');
        if (v.codec_name === 'hevc') args.push('-tag:v', 'hvc1');
      } else {
        if (burnSub) {
          args.push('-filter_complex', `[0:${v.index}][0:${burnSub.index}]overlay=eof_action=pass,${this.videoFilters().join(',')}[v]`, '-map', '[v]');
        } else {
          args.push('-map', `0:${v.index}`, '-vf', this.videoFilters().join(','));
        }
        const fps = ratio((v.avg_frame_rate || '').replace('/', ':')) || 25;
        args.push('-c:v', 'libx264', '-preset', preset, '-tune', 'zerolatency', '-crf', '20',
          '-profile:v', 'high', '-g', String(Math.round(Math.min(fps, 60) * 2)));
      }
    }
    if (a) {
      args.push('-map', `0:${a.index}`);
      if (this.audioCopyable(a) && mode === 'remux' && this.kind === 'file') args.push('-c:a', 'copy');
      else args.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2');
    }
    args.push('-sn', '-dn', '-map_chapters', '-1', '-map_metadata', '-1', '-max_muxing_queue_size', '4096',
      '-avoid_negative_ts', 'make_zero',
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-frag_duration', '1000000',
      '-f', 'mp4', 'pipe:1');
    return args;
  }

  thumbArgs(t, w = 320, fast = true) {
    const d = this.dims();
    const h = d ? even(w / d.dar) : even(w * 9 / 16);
    const vf = [];
    if (this.interlaced) vf.push('bwdif=deint=interlaced');
    vf.push(`scale=${w}:${h}`);
    const v = this.video ? this.video.index : (this.cover ? this.cover.index : null);
    if (v == null) return null;
    const seek = this.cover && !this.video ? 0 : t;
    return ['-hide_banner', '-loglevel', 'error', '-nostdin', ...this.inputArgs(seek, { fastSeek: fast && this.kind !== 'dvd' }),
      '-map', `0:${v}`, '-frames:v', '1', '-an', '-sn', '-vf', vf.join(','), '-q:v', '4', '-f', 'image2pipe', '-c:v', 'mjpeg', 'pipe:1'];
  }

  screenshotArgs(t, out) {
    const d = this.dims(8192, 8192);
    const vf = [];
    if (this.interlaced) vf.push('bwdif=deint=interlaced');
    if (d) vf.push(`scale=${d.displayWidth}:${d.displayHeight}:flags=lanczos`, 'setsar=1');
    return ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...this.inputArgs(t), '-map', `0:${this.video.index}`,
      '-frames:v', '1', '-vf', vf.join(','), out];
  }

  subtitleArgs(key) {
    const ext = this.externalSubs.find((e) => e.key === key);
    if (ext) {
      const args = ['-hide_banner', '-loglevel', 'error', '-nostdin'];
      try {
        const raw = fs.readFileSync(ext.path);
        new TextDecoder('utf-8', { fatal: true }).decode(raw);
      } catch { args.push('-sub_charenc', 'CP1252'); }
      return [...args, '-i', ext.path, '-map', '0:s:0', '-c:s', 'webvtt', '-f', 'webvtt', 'pipe:1'];
    }
    const s = this.subs.find((x) => x.key === key);
    if (!s || s.bitmap) return null;
    return ['-hide_banner', '-loglevel', 'error', '-nostdin', ...this.inputArgs(0), '-map', `0:${s.index}`,
      '-c:s', 'webvtt', '-f', 'webvtt', 'pipe:1'];
  }

  exportArgs({ start, end, precise, audio, out }) {
    const dur = Math.max(0.1, end - start);
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-progress', 'pipe:1', '-nostats', ...this.inputArgs(start), '-t', dur.toFixed(3)];
    const a = audio != null ? this.audio.find((s) => s.index === Number(audio)) : this.audio[0];
    if (!precise) {
      args.push('-map', '0:v?', '-map', '0:a?', '-map', '0:s?', '-c', 'copy', '-avoid_negative_ts', 'make_zero');
      if (this.cover && !this.video) args.push('-map', `-0:${this.cover.index}`);
    } else {
      if (this.video) args.push('-map', `0:${this.video.index}`, '-vf', this.videoFilters().filter((f) => !f.startsWith('scale')).concat(
        (() => { const d = this.dims(8192, 8192); return d ? [`scale=${d.displayWidth}:${d.displayHeight}`, 'setsar=1'] : []; })(),
      ).join(','), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p');
      if (a) args.push('-map', `0:${a.index}`, '-c:a', 'aac', '-b:a', '256k');
      args.push('-map_chapters', '-1', '-movflags', '+faststart');
    }
    args.push(out);
    return { args, duration: dur };
  }

  info(caps) {
    const d = this.dims();
    const v = this.video;
    const plan = this.plan(caps);
    const toRel = (x) => Math.max(0, Number(x) - this.startTime);
    let chapters = (this.probe.chapters || []).map((c, i) => ({
      start: toRel(c.start_time), end: toRel(c.end_time), title: (c.tags && c.tags.title) || `Chapter ${i + 1}`,
    }));
    if (this.kind === 'dvd') chapters = chapters.map((c, i) => ({ ...c, title: `Chapter ${i + 1}` }));
    return {
      id: this.id,
      kind: this.kind,
      key: this.key,
      target: this.target,
      path: this.path || this.root,
      title: this.title,
      duration: this.duration,
      hasVideo: !!v,
      hasCover: !!this.cover,
      dims: d,
      fps: v ? ratio((v.avg_frame_rate || '').replace('/', ':')) : null,
      videoCodec: v ? (VIDEO_CODECS[v.codec_name] || v.codec_name) : null,
      videoCodecId: v ? v.codec_name : null,
      container: this.probe.format.format_long_name || this.probe.format.format_name,
      size: Number(this.probe.format.size) || null,
      bitrate: Number(this.probe.format.bit_rate) || null,
      interlaced: this.interlaced,
      audio: this.audio.map((s, i) => {
        const t = s.tags || {};
        const lang = langName(t.language);
        const parts = [lang || `Track ${i + 1}`, AUDIO_CODECS[s.codec_name] || s.codec_name, chLabel(s.channels, s.channel_layout)];
        if (t.title && !parts.includes(t.title)) parts.push(t.title);
        return { index: s.index, label: parts.filter(Boolean).join(' · '), lang: t.language || null, codec: s.codec_name, isDefault: i === 0 };
      }),
      subs: this.subs.map(({ key, label, lang, bitmap, external }) => ({ key, label, lang, bitmap, external: !!external })),
      chapters,
      plan,
      canRemux: this.kind === 'file' && this.videoCopyable(caps),
      mse: this.mseCodecs(),
      tags: this.probe.format.tags || {},
      disc: this.disc ? {
        label: this.disc.label,
        root: this.disc.root,
        main: this.disc.main,
        current: this.dvdTitle,
        titles: this.disc.titles.map((t) => ({ n: t.n, duration: t.duration, chapters: t.chapters })),
      } : null,
    };
  }
}

const registry = new Map();

async function open(target) {
  const r = resolveTarget(target.path);
  let media;
  if (r.kind === 'dvd') {
    const disc = await listDvdTitles(r.root);
    const n = target.dvdTitle && disc.titles.some((t) => t.n === target.dvdTitle) ? target.dvdTitle : disc.main;
    const t = disc.titles.find((x) => x.n === n);
    media = new Media({
      kind: 'dvd', root: r.root, dvdTitle: n, disc, probe: t.probe,
      title: disc.titles.length > 1 && n !== disc.main ? `${disc.label} — Title ${n}` : disc.label,
    });
    media.target = { path: r.root, dvdTitle: n };
    media.key = `dvd:${r.root}`;
  } else {
    const pr = await ff.probe(['-i', r.path]).catch((e) => {
      throw new Error(`Vid-View couldn’t read this file.\n${(e.stderr || e.message || '').split('\n').slice(-2).join(' ')}`);
    });
    const hasAV = (pr.streams || []).some((s) => s.codec_type === 'video' || s.codec_type === 'audio');
    if (!hasAV) throw new Error('This file has no picture or sound Vid-View can find.');
    media = new Media({ kind: 'file', path: r.path, probe: pr, title: prettyFileTitle(r.path, pr.format.tags || {}) });
    media.target = { path: r.path };
    media.key = `file:${r.path}`;
  }
  registry.set(media.id, media);
  return media;
}

function get(id) { return registry.get(String(id)); }
function close(id) { registry.delete(String(id)); }
function keyHash(key) { return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16); }

module.exports = { open, get, close, resolveTarget, keyHash, listDvdTitles };

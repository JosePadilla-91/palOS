"use strict";
/* palOS sheets: Save, Open and message panels come out of the window */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
const electron = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const crypto = require("node:crypto");
const node_events = require("node:events");
const mm = require("music-metadata");
const node_child_process = require("node:child_process");
const nodeTaglibSharp = require("node-taglib-sharp");
const os = require("node:os");
const node_stream = require("node:stream");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const mm__namespace = /* @__PURE__ */ _interopNamespaceDefault(mm);
const AUDIO_EXTS = ["mp3", "m4a", "m4b", "aac", "flac", "ogg", "oga", "opus", "wav", "aif", "aiff", "wma", "ape", "wv", "mka", "alac", "webm"];
const VIDEO_EXTS = ["mp4", "m4v", "mov", "mkv", "avi", "wmv", "flv", "mpg", "mpeg", "ts", "m2ts", "mts", "ogv", "3gp", "divx", "vob"];
const PLAYLIST_EXTS = ["m3u", "m3u8"];
const MEDIA_EXTS = /* @__PURE__ */ new Set([...AUDIO_EXTS, ...VIDEO_EXTS]);
function extOf(p) {
  const base = p.split("/").pop() ?? "";
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(i + 1).toLowerCase() : "";
}
function isVideoExt(ext) {
  return VIDEO_EXTS.includes(ext);
}
function safeName(s, max = 100) {
  let out = (s || "").replace(/[\u0000-\u001f]/g, "").replace(/[\\/:*?"<>|]/g, "_").trim();
  out = out.replace(/^\.+/, "_").replace(/[. ]+$/, "");
  if (out.length > max) out = out.slice(0, max).trim();
  return out || "_";
}
const pad2 = (n) => String(n).padStart(2, "0");
function organizedRelPath(t, ext, kind = t.mediaKind) {
  const title = safeName(t.title || "Untitled");
  switch (kind) {
    case "movie":
      return `Movies/${title}.${ext}`;
    case "tvshow": {
      const show = safeName(t.show || "Unknown Show");
      const season = t.season || 1;
      const ep = t.episode ? `S${pad2(season)}E${pad2(t.episode)} ` : "";
      return `TV Shows/${show}/Season ${season}/${safeName(ep + (t.title || "Episode"))}.${ext}`;
    }
    case "musicvideo":
      return `Music Videos/${safeName(t.artist || "Unknown Artist")}/${title}.${ext}`;
    case "homevideo":
      return `Home Videos/${title}.${ext}`;
    default: {
      const artist = t.compilation ? "Compilations" : safeName(t.albumArtist || t.artist || "Unknown Artist");
      const album = safeName(t.album || "Unknown Album");
      let num = "";
      if (t.trackNo) num = (t.discCount > 1 && t.discNo ? `${t.discNo}-` : "") + pad2(t.trackNo) + " ";
      return `Music/${artist}/${album}/${safeName(num + (t.title || "Untitled"))}.${ext}`;
    }
  }
}
function parseEpisodeName(base) {
  const name = base.replace(/\.[^.]+$/, "");
  const m = name.match(/^(.*?)[\s._-]*[Ss](\d{1,2})[\s._-]*[Ee](\d{1,3})(.*)$/) || name.match(/^(.*?)[\s._-]+(\d{1,2})x(\d{2,3})(.*)$/);
  if (!m) return null;
  const clean = (s) => s.replace(/[._]+/g, " ").replace(/\s+-\s*$/, "").replace(/^\s*-\s+/, "").replace(/\s+/g, " ").trim();
  let title = clean(stripReleaseJunk(m[4]));
  title = title.replace(/^-\s*/, "");
  return { show: clean(m[1]), season: parseInt(m[2], 10), episode: parseInt(m[3], 10), title };
}
const JUNK = /\b(480p|576p|720p|1080p|2160p|4k|uhd|hdr|x264|x265|h\.?264|h\.?265|hevc|bluray|blu-ray|brrip|bdrip|web-?dl|webrip|hdtv|dvdrip|xvid|aac|ac3|dts|proper|repack|remux|10bit)\b.*$/i;
function stripReleaseJunk(s) {
  return s.replace(/[._]/g, " ").replace(JUNK, "");
}
function parseMovieName(base) {
  const name = base.replace(/\.[^.]+$/, "").replace(/[._]/g, " ");
  const m = name.match(/^(.*?)[\s([]+((?:19|20)\d{2})(?:[\s)\]]|$)/);
  if (m && m[1].trim()) return { title: m[1].replace(/\s+/g, " ").trim(), year: parseInt(m[2], 10) };
  return { title: stripReleaseJunk(name).replace(/\s+/g, " ").trim() || base, year: 0 };
}
function relativeFrom(fromFile, toFile) {
  const a = fromFile.split("/").slice(0, -1);
  const b = toFile.split("/");
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill(".."), ...b.slice(i)].join("/");
}
function parseM3U(text, baseDir) {
  const out = [];
  for (let line of text.replace(/^﻿/, "").split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^file:\/\//i.test(line)) {
      try {
        out.push(decodeURIComponent(new URL(line).pathname));
      } catch {
      }
      continue;
    }
    if (/^[a-z]+:\/\//i.test(line)) continue;
    line = line.replace(/\\/g, "/");
    out.push(path.isAbsolute(line) ? path.normalize(line) : path.resolve(baseDir, line));
  }
  return out;
}
function buildM3U(entries) {
  const lines = ["#EXTM3U"];
  for (const e of entries) {
    lines.push(`#EXTINF:${Math.round(e.duration) || -1},${e.artist ? e.artist + " - " : ""}${e.title}`);
    lines.push(e.path);
  }
  return lines.join("\n") + "\n";
}
function formatSize(bytes) {
  if (bytes >= 1e12) return (bytes / 1e12).toFixed(2) + " TB";
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
  if (bytes >= 1e3) return Math.round(bytes / 1e3) + " KB";
  return bytes + " bytes";
}
function albumKey(t) {
  const artist = t.compilation ? "Various Artists" : t.albumArtist || t.artist || "Unknown Artist";
  return `${artist}\0${t.album || "Unknown Album"}`;
}
function sortName(s) {
  return s.toLocaleLowerCase().replace(/^(the|a|an)\s+/, "");
}
const STRING_FIELDS = [
  { key: "title", label: "Name" },
  { key: "artist", label: "Artist" },
  { key: "albumArtist", label: "Album Artist" },
  { key: "album", label: "Album" },
  { key: "genre", label: "Genre" },
  { key: "composer", label: "Composer" },
  { key: "comment", label: "Comments" },
  { key: "show", label: "Show" }
];
const NUMBER_FIELDS = [
  { key: "year", label: "Year" },
  { key: "rating", label: "Rating" },
  { key: "playCount", label: "Plays" },
  { key: "skipCount", label: "Skips" },
  { key: "bpm", label: "BPM" },
  { key: "bitrate", label: "Bit Rate" },
  { key: "duration", label: "Time (seconds)" },
  { key: "trackNo", label: "Track Number" },
  { key: "season", label: "Season" },
  { key: "episode", label: "Episode" },
  { key: "size", label: "Size (MB)" }
];
const DATE_FIELDS = [
  { key: "dateAdded", label: "Date Added" },
  { key: "lastPlayed", label: "Last Played" }
];
function fieldType(f) {
  if (STRING_FIELDS.some((x) => x.key === f)) return "string";
  if (NUMBER_FIELDS.some((x) => x.key === f)) return "number";
  if (DATE_FIELDS.some((x) => x.key === f)) return "date";
  if (f === "mediaKind") return "kind";
  if (f === "compilation") return "bool";
  return "playlist";
}
const DAY = 864e5;
function unitMs(u) {
  return u === "weeks" ? 7 * DAY : u === "months" ? 30 * DAY : DAY;
}
function numValue(t, f) {
  if (f === "size") return t.size / 1e6;
  return t[f] ?? 0;
}
function matchRule(t, r, ctx) {
  const type = fieldType(r.field);
  switch (type) {
    case "string": {
      const v = String(t[r.field] ?? "").toLocaleLowerCase();
      const q = String(r.value ?? "").toLocaleLowerCase();
      switch (r.op) {
        case "contains":
          return v.includes(q);
        case "notContains":
          return !v.includes(q);
        case "is":
          return v === q;
        case "isNot":
          return v !== q;
        case "startsWith":
          return v.startsWith(q);
        case "endsWith":
          return v.endsWith(q);
      }
      return false;
    }
    case "number": {
      const v = numValue(t, r.field);
      const a = Number(r.value) || 0;
      switch (r.op) {
        case "is":
          return v === a;
        case "isNot":
          return v !== a;
        case "gt":
          return v > a;
        case "lt":
          return v < a;
        case "inRange": {
          const b = Number(r.value2 ?? a);
          return v >= Math.min(a, b) && v <= Math.max(a, b);
        }
      }
      return false;
    }
    case "date": {
      const v = t[r.field] ?? 0;
      switch (r.op) {
        case "inLast":
          return v > 0 && v >= ctx.now - (Number(r.value) || 0) * unitMs(r.unit);
        case "notInLast":
          return v === 0 || v < ctx.now - (Number(r.value) || 0) * unitMs(r.unit);
        case "before":
          return v > 0 && v < Date.parse(String(r.value));
        case "after":
          return v > Date.parse(String(r.value));
      }
      return false;
    }
    case "kind":
      return r.op === "is" ? t.mediaKind === r.value : t.mediaKind !== r.value;
    case "bool":
      return r.op === "isTrue" ? !!t.compilation : !t.compilation;
    case "playlist": {
      if (ctx.depth > 8) return false;
      const members = ctx.resolvePlaylist(String(r.value), ctx.depth + 1);
      return r.op === "is" ? members.has(t.id) : !members.has(t.id);
    }
  }
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function selectComparator(sel, seed) {
  const s = (x) => sortName(x);
  switch (sel) {
    case "random":
      return (a, b) => hashStr(seed + a.pid) - hashStr(seed + b.pid);
    case "title":
      return (a, b) => s(a.title).localeCompare(s(b.title));
    case "album":
      return (a, b) => s(a.album).localeCompare(s(b.album));
    case "artist":
      return (a, b) => s(a.artist).localeCompare(s(b.artist));
    case "genre":
      return (a, b) => s(a.genre).localeCompare(s(b.genre));
    case "highestRating":
      return (a, b) => b.rating - a.rating;
    case "lowestRating":
      return (a, b) => a.rating - b.rating;
    case "mostPlayed":
      return (a, b) => b.playCount - a.playCount;
    case "leastPlayed":
      return (a, b) => a.playCount - b.playCount;
    case "mostRecentlyAdded":
      return (a, b) => b.dateAdded - a.dateAdded;
    case "leastRecentlyAdded":
      return (a, b) => a.dateAdded - b.dateAdded;
    case "mostRecentlyPlayed":
      return (a, b) => b.lastPlayed - a.lastPlayed;
    case "leastRecentlyPlayed":
      return (a, b) => a.lastPlayed - b.lastPlayed;
  }
}
function applyLimit(tracks, rules, seed) {
  const lim = rules.limit;
  if (!lim.enabled || lim.count <= 0) return tracks;
  const sorted = [...tracks].sort(selectComparator(lim.selectBy, seed));
  if (lim.unit === "items") return sorted.slice(0, lim.count);
  const out = [];
  let total = 0;
  const max = lim.unit === "minutes" ? lim.count * 60 : lim.unit === "hours" ? lim.count * 3600 : lim.unit === "MB" ? lim.count * 1e6 : lim.count * 1e9;
  for (const t of sorted) {
    const amount = lim.unit === "minutes" || lim.unit === "hours" ? t.duration : t.size;
    if (total + amount > max) continue;
    total += amount;
    out.push(t);
  }
  return out;
}
function evaluateSmart(rules, tracks, ctxBase) {
  const byPid = new Map(ctxBase.playlists.map((p) => [p.pid, p]));
  const cache = /* @__PURE__ */ new Map();
  const ctx = {
    now: ctxBase.now ?? Date.now(),
    playlists: byPid,
    depth: ctxBase.depth ?? 0,
    resolvePlaylist: (pid, depth) => {
      const hit = cache.get(pid);
      if (hit) return hit;
      const p = byPid.get(pid);
      let set = /* @__PURE__ */ new Set();
      if (p) {
        if (p.kind === "normal") set = new Set(p.trackIds);
        else if (p.rules) set = new Set(evaluateSmart(p.rules, tracks, { ...ctxBase, depth, seed: p.pid }).map((t) => t.id));
      }
      cache.set(pid, set);
      return set;
    }
  };
  if (!rules.liveUpdating && rules.snapshot) {
    const ids = new Set(rules.snapshot);
    return tracks.filter((t) => ids.has(t.id));
  }
  const active = rules.rules.filter((r) => fieldType(r.field) !== "string" || r.op === "isNot" || r.op === "is" || String(r.value) !== "");
  const matched = active.length === 0 ? tracks.slice() : tracks.filter(
    (t) => rules.match === "all" ? active.every((r) => matchRule(t, r, ctx)) : active.some((r) => matchRule(t, r, ctx))
  );
  return applyLimit(matched, rules, ctxBase.seed ?? "");
}
function resolvePlaylistTracks(p, tracks, playlists, byId) {
  if (p.kind === "smart" && p.rules) return evaluateSmart(p.rules, tracks, { playlists, seed: p.pid });
  const map = byId ?? new Map(tracks.map((t) => [t.id, t]));
  const out = [];
  for (const id of p.trackIds) {
    const t = map.get(id);
    if (t) out.push(t);
  }
  return out;
}
const LOSSLESS = /* @__PURE__ */ new Set(["flac", "wav", "aif", "aiff", "ape", "wv", "alac"]);
function isLossless(t) {
  return LOSSLESS.has(t.container) || /alac|flac|pcm|lossless/i.test(t.codec);
}
function shouldConvert(t, p) {
  if (!p.convert.enabled || t.mediaKind !== "music") return false;
  return isLossless(t) || t.transcode === 1 || t.bitrate > p.convert.bitrate + 16;
}
function convertedExt(p) {
  return p.convert.format === "aac" ? "m4a" : p.convert.format === "mp3" ? "mp3" : "opus";
}
function selectTracks(p, tracks, playlists) {
  const chosen = /* @__PURE__ */ new Map();
  const add = (t) => chosen.set(t.id, t);
  const byId = new Map(tracks.map((t) => [t.id, t]));
  if (p.music.enabled) {
    if (p.music.mode === "all") {
      tracks.filter((t) => t.mediaKind === "music").forEach(add);
    } else {
      const artists = new Set(p.music.artists);
      const albums = new Set(p.music.albums);
      const genres = new Set(p.music.genres);
      for (const t of tracks) {
        if (t.mediaKind !== "music") continue;
        if (artists.has(t.albumArtist || t.artist) || artists.has(t.artist) || albums.has(albumKey(t)) || genres.has(t.genre)) add(t);
      }
      for (const pid of p.music.playlists) {
        const pl = playlists.find((x) => x.pid === pid);
        if (pl) resolvePlaylistTracks(pl, tracks, playlists, byId).forEach(add);
      }
    }
  }
  if (p.movies.enabled) {
    const pids = new Set(p.movies.pids);
    tracks.filter((t) => t.mediaKind === "movie" && (p.movies.mode === "all" || pids.has(t.pid))).forEach(add);
  }
  if (p.tvShows.enabled) {
    const shows = new Set(p.tvShows.shows);
    tracks.filter((t) => t.mediaKind === "tvshow" && (p.tvShows.mode === "all" || shows.has(t.show))).forEach(add);
  }
  return [...chosen.values()];
}
function deviceRelPath(t, p, convert) {
  const ext = convert ? convertedExt(p) : t.container;
  const rel = organizedRelPath(t, ext);
  if (t.mediaKind === "music") return `${p.musicFolder}/${rel.replace(/^Music\//, "")}`;
  return `${p.videoFolder}/${rel}`;
}
function planSync(p, tracks, playlists, existsOnDevice) {
  const wanted = selectTracks(p, tracks, playlists);
  const plan = { copy: [], keep: [], remove: [], playlists: [], bytesNeeded: 0, bytesFreed: 0 };
  const usedRel = /* @__PURE__ */ new Set();
  const relFor = /* @__PURE__ */ new Map();
  const wantedPids = /* @__PURE__ */ new Set();
  for (const t of wanted) {
    wantedPids.add(t.pid);
    const convert = shouldConvert(t, p);
    let rel = deviceRelPath(t, p, convert);
    if (usedRel.has(rel.toLowerCase())) {
      const dot = rel.lastIndexOf(".");
      let i = 2;
      while (usedRel.has(`${rel.slice(0, dot)} ${i}${rel.slice(dot)}`.toLowerCase())) i++;
      rel = `${rel.slice(0, dot)} ${i}${rel.slice(dot)}`;
    }
    usedRel.add(rel.toLowerCase());
    relFor.set(t.pid, rel);
    const prev = p.synced[t.pid];
    if (prev && prev.path === rel && prev.mtime === t.mtime && existsOnDevice(rel)) {
      plan.keep.push({ track: t, rel });
      continue;
    }
    if (prev && prev.path !== rel) {
      plan.remove.push({ pid: t.pid, rel: prev.path, size: prev.size });
      plan.bytesFreed += prev.size;
    }
    const estBytes = convert ? Math.round(t.duration * p.convert.bitrate * 1e3 / 8) + 2e5 : t.size;
    plan.copy.push({ track: t, rel, convert, estBytes });
    plan.bytesNeeded += estBytes;
  }
  for (const [pid, info] of Object.entries(p.synced)) {
    if (pid.startsWith("playlist:")) continue;
    if (!wantedPids.has(pid)) {
      plan.remove.push({ pid, rel: info.path, size: info.size });
      plan.bytesFreed += info.size;
    }
  }
  if (p.writePlaylists) {
    const chosen = p.music.enabled && p.music.mode === "selected" ? playlists.filter((pl) => p.music.playlists.includes(pl.pid)) : p.music.enabled ? playlists : [];
    const byId = new Map(tracks.map((t) => [t.id, t]));
    for (const pl of chosen) {
      const entries = resolvePlaylistTracks(pl, tracks, playlists, byId).filter((t) => relFor.has(t.pid)).map((t) => ({ track: t, rel: relFor.get(t.pid) }));
      if (!entries.length) continue;
      const safe = pl.name.replace(/[\\/:*?"<>|]/g, "_").trim() || "Playlist";
      plan.playlists.push({ playlist: pl, rel: `${p.playlistsFolder}/${safe}.m3u8`, entries });
    }
  }
  return plan;
}
const TRACK_COLUMNS = [
  ["pid", "TEXT NOT NULL UNIQUE"],
  ["path", "TEXT NOT NULL UNIQUE"],
  ["mediaKind", "TEXT NOT NULL DEFAULT 'music'"],
  ["title", "TEXT NOT NULL DEFAULT ''"],
  ["artist", "TEXT NOT NULL DEFAULT ''"],
  ["albumArtist", "TEXT NOT NULL DEFAULT ''"],
  ["album", "TEXT NOT NULL DEFAULT ''"],
  ["genre", "TEXT NOT NULL DEFAULT ''"],
  ["composer", "TEXT NOT NULL DEFAULT ''"],
  ["year", "INTEGER NOT NULL DEFAULT 0"],
  ["trackNo", "INTEGER NOT NULL DEFAULT 0"],
  ["trackCount", "INTEGER NOT NULL DEFAULT 0"],
  ["discNo", "INTEGER NOT NULL DEFAULT 0"],
  ["discCount", "INTEGER NOT NULL DEFAULT 0"],
  ["duration", "REAL NOT NULL DEFAULT 0"],
  ["bitrate", "INTEGER NOT NULL DEFAULT 0"],
  ["sampleRate", "INTEGER NOT NULL DEFAULT 0"],
  ["codec", "TEXT NOT NULL DEFAULT ''"],
  ["container", "TEXT NOT NULL DEFAULT ''"],
  ["size", "INTEGER NOT NULL DEFAULT 0"],
  ["mtime", "INTEGER NOT NULL DEFAULT 0"],
  ["dateAdded", "INTEGER NOT NULL DEFAULT 0"],
  ["rating", "INTEGER NOT NULL DEFAULT 0"],
  ["playCount", "INTEGER NOT NULL DEFAULT 0"],
  ["skipCount", "INTEGER NOT NULL DEFAULT 0"],
  ["lastPlayed", "INTEGER NOT NULL DEFAULT 0"],
  ["compilation", "INTEGER NOT NULL DEFAULT 0"],
  ["comment", "TEXT NOT NULL DEFAULT ''"],
  ["bpm", "INTEGER NOT NULL DEFAULT 0"],
  ["show", "TEXT NOT NULL DEFAULT ''"],
  ["season", "INTEGER NOT NULL DEFAULT 0"],
  ["episode", "INTEGER NOT NULL DEFAULT 0"],
  ["description", "TEXT NOT NULL DEFAULT ''"],
  ["width", "INTEGER NOT NULL DEFAULT 0"],
  ["height", "INTEGER NOT NULL DEFAULT 0"],
  ["videoCodec", "TEXT NOT NULL DEFAULT ''"],
  ["audioCodec", "TEXT NOT NULL DEFAULT ''"],
  ["transcode", "INTEGER NOT NULL DEFAULT 0"],
  ["artKey", "TEXT NOT NULL DEFAULT ''"]
];
const COLS = TRACK_COLUMNS.map(([k]) => k);
let db;
function openDb(file2 = path.join(electron.app.getPath("userData"), "library.db")) {
  db = new Database(file2);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ${TRACK_COLUMNS.map(([k, t]) => `"${k}" ${t}`).join(",\n      ")}
    );
    CREATE INDEX IF NOT EXISTS tracks_album ON tracks(album);
    CREATE INDEX IF NOT EXISTS tracks_artkey ON tracks(artKey);
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'normal',
      rules TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS playlist_items (
      playlistId INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      trackId INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      position INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pli_pl ON playlist_items(playlistId, position);
    CREATE TABLE IF NOT EXISTS art_lookup (
      albumKey TEXT PRIMARY KEY,
      tried INTEGER NOT NULL
    );
  `);
  const existing = new Set(db.prepare("PRAGMA table_info(tracks)").all().map((r) => r.name));
  for (const [k, t] of TRACK_COLUMNS) {
    if (!existing.has(k)) db.exec(`ALTER TABLE tracks ADD COLUMN "${k}" ${t.replace("NOT NULL UNIQUE", "")}`);
  }
  return db;
}
function getDb() {
  return db;
}
function rowToTrack(r) {
  return { ...r, compilation: !!r.compilation };
}
function trackToRow(t) {
  const row = {};
  for (const c of COLS) {
    if (c in t) {
      const v = t[c];
      row[c] = typeof v === "boolean" ? v ? 1 : 0 : v;
    }
  }
  return row;
}
function allTracks() {
  return db.prepare("SELECT * FROM tracks").all().map(rowToTrack);
}
function getTrack(id) {
  const r = db.prepare("SELECT * FROM tracks WHERE id = ?").get(id);
  return r ? rowToTrack(r) : void 0;
}
function getTracks(ids) {
  if (!ids.length) return [];
  const out = [];
  const stmt = db.prepare("SELECT * FROM tracks WHERE id = ?");
  for (const id of ids) {
    const r = stmt.get(id);
    if (r) out.push(rowToTrack(r));
  }
  return out;
}
function trackByPath(p) {
  const r = db.prepare("SELECT * FROM tracks WHERE path = ?").get(p);
  return r ? rowToTrack(r) : void 0;
}
function insertTrack(t) {
  const row = trackToRow({ ...t, pid: t.pid || crypto.randomUUID() });
  const keys = Object.keys(row);
  const info = db.prepare(`INSERT INTO tracks (${keys.map((k) => `"${k}"`).join(",")}) VALUES (${keys.map((k) => "@" + k).join(",")})`).run(row);
  return getTrack(Number(info.lastInsertRowid));
}
function updateTrack(id, patch) {
  const row = trackToRow(patch);
  delete row.pid;
  const keys = Object.keys(row);
  if (keys.length) {
    db.prepare(`UPDATE tracks SET ${keys.map((k) => `"${k}" = @${k}`).join(", ")} WHERE id = @__id`).run({ ...row, __id: id });
  }
  return getTrack(id);
}
function deleteTracks(ids) {
  const stmt = db.prepare("DELETE FROM tracks WHERE id = ?");
  db.transaction(() => ids.forEach((id) => stmt.run(id)))();
}
function plFromRow(r) {
  const trackIds = r.kind === "normal" ? db.prepare("SELECT trackId FROM playlist_items WHERE playlistId = ? ORDER BY position").all(r.id).map((x) => x.trackId) : [];
  return {
    id: r.id,
    pid: r.pid,
    name: r.name,
    kind: r.kind === "smart" ? "smart" : "normal",
    rules: r.rules ? JSON.parse(r.rules) : null,
    trackIds,
    sortOrder: r.sortOrder
  };
}
function allPlaylists() {
  return db.prepare("SELECT * FROM playlists ORDER BY sortOrder, name COLLATE NOCASE").all().map(plFromRow);
}
function getPlaylist(id) {
  const r = db.prepare("SELECT * FROM playlists WHERE id = ?").get(id);
  return r ? plFromRow(r) : void 0;
}
function createPlaylist(name, kind, rules, trackIds = []) {
  const max = db.prepare("SELECT COALESCE(MAX(sortOrder), 0) AS m FROM playlists").get().m;
  const info = db.prepare("INSERT INTO playlists (pid, name, kind, rules, sortOrder) VALUES (?, ?, ?, ?, ?)").run(crypto.randomUUID(), name, kind, rules ? JSON.stringify(rules) : null, max + 1);
  const id = Number(info.lastInsertRowid);
  if (trackIds.length) setPlaylistTracks(id, trackIds);
  return getPlaylist(id);
}
function updatePlaylist(id, patch) {
  if (patch.name !== void 0) db.prepare("UPDATE playlists SET name = ? WHERE id = ?").run(patch.name, id);
  if (patch.rules !== void 0) db.prepare("UPDATE playlists SET rules = ? WHERE id = ?").run(patch.rules ? JSON.stringify(patch.rules) : null, id);
  if (patch.sortOrder !== void 0) db.prepare("UPDATE playlists SET sortOrder = ? WHERE id = ?").run(patch.sortOrder, id);
  return getPlaylist(id);
}
function deletePlaylist(id) {
  db.prepare("DELETE FROM playlists WHERE id = ?").run(id);
}
function setPlaylistTracks(id, trackIds) {
  db.transaction(() => {
    db.prepare("DELETE FROM playlist_items WHERE playlistId = ?").run(id);
    const ins = db.prepare("INSERT INTO playlist_items (playlistId, trackId, position) VALUES (?, ?, ?)");
    trackIds.forEach((t, i) => ins.run(id, t, i));
  })();
}
function artTried(albumKey2) {
  return !!db.prepare("SELECT 1 FROM art_lookup WHERE albumKey = ?").get(albumKey2);
}
function markArtTried(albumKey2) {
  db.prepare("INSERT OR REPLACE INTO art_lookup (albumKey, tried) VALUES (?, ?)").run(albumKey2, Date.now());
}
function parseProbe(stderr) {
  const r = { duration: 0, bitrate: 0, videoCodec: "", audioCodec: "", width: 0, height: 0, sampleRate: 0, hasCoverArt: false, subtitleStreams: 0, tags: {} };
  const d = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (d) r.duration = +d[1] * 3600 + +d[2] * 60 + +d[3];
  const b = stderr.match(/bitrate:\s*(\d+)\s*kb\/s/);
  if (b) r.bitrate = +b[1];
  let inStreams = false;
  for (const line of stderr.split("\n")) {
    if (/^\s*Stream #/.test(line)) inStreams = true;
    if (!inStreams) {
      const t = line.match(/^\s{4}([A-Za-z_]+)\s*:\s(.*)$/);
      if (t && !(t[1].toLowerCase() in r.tags)) r.tags[t[1].toLowerCase()] = t[2].trim();
    }
    const m = line.match(/Stream #\d+:\d+(?:\[[^\]]*\])?(?:\([^)]*\))?:\s*(Video|Audio|Subtitle):\s*([a-z0-9_]+)/i);
    if (!m) continue;
    const kind = m[1].toLowerCase();
    const codec = m[2].toLowerCase();
    if (kind === "video") {
      const isPic = /attached pic/.test(line) || codec === "mjpeg" || codec === "png";
      if (isPic) {
        r.hasCoverArt = true;
        continue;
      }
      if (!r.videoCodec) {
        r.videoCodec = codec;
        const s = line.match(/,\s*(\d{2,5})x(\d{2,5})/);
        if (s) {
          r.width = +s[1];
          r.height = +s[2];
        }
      }
    } else if (kind === "audio" && !r.audioCodec) {
      r.audioCodec = codec;
      const sr = line.match(/(\d+)\s*Hz/);
      if (sr) r.sampleRate = +sr[1];
    } else if (kind === "subtitle") {
      r.subtitleStreams++;
    }
  }
  return r;
}
let resolved = null;
function ffmpegPath() {
  if (resolved) return resolved;
  const candidates = [];
  try {
    const p = require("ffmpeg-static");
    if (p) candidates.push(p.replace("app.asar/", "app.asar.unpacked/"));
  } catch {
  }
  candidates.push("/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg");
  for (const c of candidates) {
    try {
      fs.accessSync(c, fs.constants.X_OK);
      resolved = c;
      return c;
    } catch {
    }
  }
  try {
    resolved = node_child_process.execFileSync("which", ["ffmpeg"]).toString().trim() || "ffmpeg";
  } catch {
    resolved = "ffmpeg";
  }
  return resolved;
}
function run(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = node_child_process.spawn(ffmpegPath(), args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    p.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      if (stderr.length > 2e5) stderr = stderr.slice(-1e5);
      if (opts.onProgress) {
        const m = s.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (m) opts.onProgress(+m[1] * 3600 + +m[2] * 60 + +m[3]);
      }
    });
    const abort = () => p.kill("SIGKILL");
    opts.signal?.addEventListener("abort", abort);
    p.on("error", reject);
    p.on("close", (code) => {
      opts.signal?.removeEventListener("abort", abort);
      resolve({ code: code ?? -1, stderr });
    });
  });
}
async function probe(file2) {
  const { stderr } = await run(["-hide_banner", "-nostdin", "-i", file2]);
  return parseProbe(stderr);
}
const DIRECT_AUDIO = /* @__PURE__ */ new Set(["mp3", "aac", "flac", "vorbis", "opus", "pcm_s16le", "pcm_s24le", "pcm_s32le", "pcm_f32le", "pcm_u8", "none", ""]);
const DIRECT_VIDEO = /* @__PURE__ */ new Set(["h264", "vp8", "vp9", "av1", "theora"]);
const DIRECT_VIDEO_CONTAINERS = /* @__PURE__ */ new Set(["mp4", "m4v", "mov", "webm", "mkv", "ogv"]);
const DIRECT_AUDIO_CONTAINERS = /* @__PURE__ */ new Set(["mp3", "m4a", "m4b", "aac", "flac", "ogg", "oga", "opus", "wav", "webm", "mka"]);
function decideTranscode(isVideo, container, probeRes) {
  const a = probeRes.audioCodec.toLowerCase();
  const v = probeRes.videoCodec.toLowerCase();
  if (!isVideo) {
    if (!DIRECT_AUDIO_CONTAINERS.has(container)) return 1;
    if (a === "alac" || !DIRECT_AUDIO.has(a)) return 1;
    return 0;
  }
  const videoOk = DIRECT_VIDEO.has(v);
  const audioOk = DIRECT_AUDIO.has(a) && !a.startsWith("pcm");
  if (videoOk && audioOk && DIRECT_VIDEO_CONTAINERS.has(container)) return 0;
  if (videoOk) return 2;
  return 3;
}
async function transcodeAudioToFlac(src, dest) {
  const tmp = dest + ".part";
  const { code, stderr } = await run(["-hide_banner", "-nostdin", "-y", "-i", src, "-vn", "-map_metadata", "-1", "-c:a", "flac", "-f", "flac", tmp]);
  if (code !== 0) throw new Error("ffmpeg failed: " + stderr.slice(-500));
  fs.renameSync(tmp, dest);
}
function startVideoStream(src, mode, offsetSec) {
  const args = ["-hide_banner", "-nostdin", "-loglevel", "error"];
  if (offsetSec > 0) args.push("-ss", String(offsetSec));
  args.push("-i", src, "-map", "0:v:0?", "-map", "0:a:0?", "-sn", "-dn");
  if (mode === 2) args.push("-c:v", "copy");
  else args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-vf", "scale='min(1920,iw)':-2", "-g", "48");
  args.push("-c:a", "aac", "-b:a", "192k", "-ac", "2");
  args.push("-movflags", "frag_keyframe+empty_moov+default_base_moof", "-f", "mp4", "pipe:1");
  return node_child_process.spawn(ffmpegPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
}
async function videoThumbnail(src, atSec) {
  return new Promise((resolve) => {
    const p = node_child_process.spawn(ffmpegPath(), ["-hide_banner", "-nostdin", "-loglevel", "error", "-ss", String(Math.max(0, atSec)), "-i", src, "-frames:v", "1", "-vf", "scale=640:-2", "-f", "image2", "-c:v", "mjpeg", "pipe:1"], { stdio: ["ignore", "pipe", "ignore"] });
    const chunks = [];
    p.stdout.on("data", (d) => chunks.push(d));
    p.on("error", () => resolve(null));
    p.on("close", () => resolve(chunks.length ? Buffer.concat(chunks) : null));
  });
}
async function convertForDevice(src, dest, format, bitrate, signal) {
  const codec = format === "aac" ? ["-c:a", "aac"] : format === "mp3" ? ["-c:a", "libmp3lame"] : ["-c:a", "libopus"];
  const fmt = format === "aac" ? "ipod" : format === "mp3" ? "mp3" : "ogg";
  const withArt = format !== "opus";
  const base = ["-hide_banner", "-nostdin", "-y", "-i", src, "-map", "0:a:0", "-map_metadata", "0"];
  const art = withArt ? ["-map", "0:v:0?", "-c:v", "copy", "-disposition:v:0", "attached_pic"] : [];
  const tail = [...codec, "-b:a", `${bitrate}k`, ...format === "mp3" ? ["-id3v2_version", "3"] : [], "-f", fmt, dest];
  let r = await run([...base, ...art, ...tail], { signal });
  if (r.code !== 0 && withArt && !signal?.aborted) r = await run([...base, ...tail], { signal });
  if (r.code !== 0) throw new Error(signal?.aborted ? "cancelled" : "ffmpeg failed: " + r.stderr.slice(-400));
}
const first = (a) => a && a.length ? a[0] : void 0;
function kindFromStik(stik) {
  switch (stik) {
    case 6:
      return "musicvideo";
    case 9:
      return "movie";
    case 10:
      return "tvshow";
    case 0:
    case 1:
      return "music";
    default:
      return null;
  }
}
async function readMediaFile(file2, opts = {}) {
  const st = fs.statSync(file2);
  const ext = extOf(file2);
  const video = isVideoExt(ext);
  const base = path.basename(file2);
  let meta = null;
  try {
    meta = await mm__namespace.parseFile(file2, { duration: false, skipCovers: false, skipPostHeaders: true });
  } catch {
    meta = null;
  }
  const c = meta?.common;
  const f = meta?.format;
  const pr = video || !opts.fast ? await probe(file2).catch(() => null) : null;
  if (pr && !pr.audioCodec && !pr.videoCodec && !(meta?.format.duration || meta?.format.codec)) throw new Error("not a playable media file");
  if (!pr && !meta) throw new Error("not a playable media file");
  let kind = video ? "movie" : "music";
  const stikKind = kindFromStik(c?.stik);
  if (stikKind && (video || stikKind === "music")) kind = stikKind;
  if (video && !stikKind && (c?.tvShow || parseEpisodeName(base))) kind = "tvshow";
  if (video && pr && !pr.videoCodec) kind = "music";
  const tg = pr?.tags ?? {};
  let title = c?.title || tg.title || "";
  let year = c?.year || parseInt(tg.date ?? tg.year ?? "", 10) || 0;
  let show = c?.tvShow ?? "";
  let season = c?.tvSeason ?? 0;
  let episode = c?.tvEpisode ?? 0;
  if (kind === "tvshow" && (!show || !episode)) {
    const ep = parseEpisodeName(base);
    if (ep) {
      show = show || ep.show || path.basename(path.dirname(path.dirname(file2)));
      season = season || ep.season;
      episode = episode || ep.episode;
      title = title || ep.title || `Episode ${ep.episode}`;
    }
  }
  if (kind === "movie" && !title) {
    const mv = parseMovieName(base);
    title = mv.title;
    year = year || mv.year;
  }
  if (!title) title = base.replace(/\.[^.]+$/, "");
  const rating = first(c?.rating)?.rating;
  const pic = first(c?.picture);
  const duration = pr?.duration || f?.duration || 0;
  const audioCodec = pr?.audioCodec || (f?.codec ?? "").toLowerCase();
  const videoCodec = pr?.videoCodec ?? "";
  const transcode = pr ? decideTranscode(kind !== "music" && !!videoCodec, ext, pr) : decideTranscode(false, ext, { videoCodec: "", audioCodec: /alac/i.test(f?.codec ?? "") ? "alac" : /mpeg|mp3|layer 3/i.test(f?.codec ?? "") ? "mp3" : /aac|mp4a/i.test(f?.codec ?? "") ? "aac" : /flac/i.test(f?.codec ?? "") ? "flac" : /opus/i.test(f?.codec ?? "") ? "opus" : /vorbis/i.test(f?.codec ?? "") ? "vorbis" : /pcm/i.test(f?.codec ?? "") ? "pcm_s16le" : ext === "wma" || ext === "ape" || ext === "wv" ? "other" : "" });
  const track = {
    path: file2,
    mediaKind: kind,
    title,
    artist: c?.artist || tg.artist || tg.author || "",
    albumArtist: c?.albumartist || tg.album_artist || "",
    album: c?.album || tg.album || "",
    genre: first(c?.genre) || tg.genre || "",
    composer: first(c?.composer) ?? "",
    year,
    trackNo: c?.track?.no ?? 0,
    trackCount: c?.track?.of ?? 0,
    discNo: c?.disk?.no ?? 0,
    discCount: c?.disk?.of ?? 0,
    duration,
    bitrate: Math.round((f?.bitrate ?? 0) / 1e3) || pr?.bitrate || 0,
    sampleRate: f?.sampleRate || pr?.sampleRate || 0,
    codec: (f?.codec ?? audioCodec ?? "").toString(),
    container: ext,
    size: st.size,
    mtime: Math.round(st.mtimeMs),
    dateAdded: Date.now(),
    rating: rating ? Math.round(rating * 5) * 20 : 0,
    playCount: 0,
    skipCount: 0,
    lastPlayed: 0,
    compilation: !!c?.compilation,
    comment: (() => {
      const cm = first(c?.comment);
      return typeof cm === "string" ? cm : cm?.text ?? "";
    })(),
    bpm: Math.round(Number(c?.bpm ?? 0)) || 0,
    show,
    season,
    episode,
    description: c?.longDescription ?? first(c?.description) ?? "",
    width: pr?.width ?? 0,
    height: pr?.height ?? 0,
    videoCodec,
    audioCodec,
    transcode,
    artKey: ""
  };
  return { track, picture: pic ? Buffer.from(pic.data) : null };
}
const settingsEvents = new node_events.EventEmitter();
function defaults() {
  const music = (() => {
    try {
      return electron.app.getPath("music");
    } catch {
      return path.join(electron.app.getPath("home"), "Music");
    }
  })();
  const libraryPath = path.join(music, "Discette");
  return {
    libraryPath,
    keepOrganized: true,
    copyOnImport: true,
    autoAddFolder: path.join(libraryPath, "Automatically Add to Discette"),
    watchAutoAdd: true,
    fetchArtOnline: true,
    transcodeCacheMB: 2048,
    defaultsCreated: false,
    sync: { format: "aac", bitrate: 256 },
    ui: {
      volume: 0.8,
      shuffle: false,
      repeat: "off",
      viewMode: {},
      columnBrowser: false,
      coverflowHeight: 320,
      sidebarWidth: 210,
      columns: {},
      sort: {},
      lastSource: "music"
    }
  };
}
let current$1 = null;
const file = () => path.join(electron.app.getPath("userData"), "settings.json");
function merge(base, over) {
  if (!over || typeof over !== "object" || Array.isArray(over)) return over === void 0 ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = base[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" && !Array.isArray(v) ? merge(b, v) : v;
  }
  return out;
}
function getSettings() {
  if (current$1) return current$1;
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
  }
  current$1 = merge(defaults(), stored);
  return current$1;
}
let saveTimer = null;
function updateSettings(patch) {
  const prev = getSettings();
  current$1 = merge(prev, patch);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSettings, 300);
  settingsEvents.emit("changed", current$1, prev);
  return current$1;
}
function flushSettings() {
  if (!current$1) return;
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file() + ".tmp", JSON.stringify(current$1, null, 2));
    fs.renameSync(file() + ".tmp", file());
  } catch (e) {
    console.error("Could not save settings", e);
  }
}
function mediaRoot() {
  return path.join(getSettings().libraryPath, "Discette Media");
}
function cacheDir(sub) {
  const d = path.join(electron.app.getPath("userData"), "cache", sub);
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const THUMB = 300;
const FULL = 1e3;
function artFile(key, size) {
  return path.join(cacheDir("art"), `${key}${size === "thumb" ? "_t" : ""}.jpg`);
}
function hasArt(key) {
  return !!key && fs.existsSync(artFile(key, "thumb"));
}
function storeArt(data) {
  if (!data || data.length < 64) return "";
  const key = crypto.createHash("sha1").update(data).digest("hex");
  if (hasArt(key)) return key;
  const img = electron.nativeImage.createFromBuffer(data);
  if (img.isEmpty()) return "";
  const { width, height } = img.getSize();
  if (!width || !height) return "";
  const square = (max) => {
    const scale = Math.min(1, max / Math.max(width, height));
    return img.resize({ width: Math.round(width * scale), height: Math.round(height * scale), quality: "best" });
  };
  try {
    fs.writeFileSync(artFile(key, "full"), square(FULL).toJPEG(90));
    fs.writeFileSync(artFile(key, "thumb"), square(THUMB).toJPEG(85));
  } catch (e) {
    console.error("art store failed", e);
    return "";
  }
  return key;
}
const COVER_NAMES = ["cover", "folder", "front", "album", "albumart", "albumartsmall", "artwork"];
function findFolderArt(file2, video = false) {
  const dir = path.dirname(file2);
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }
  const images = entries.filter((e) => /\.(jpe?g|png)$/i.test(e));
  const stem = (e) => e.toLowerCase().replace(/\.(jpe?g|png)$/i, "");
  const own = path.basename(file2).toLowerCase().replace(/\.[^.]+$/, "");
  const pick = video ? images.find((e) => stem(e) === own || stem(e) === own + "-poster") ?? images.find((e) => ["poster", "folder", "cover"].includes(stem(e))) : images.find((e) => COVER_NAMES.includes(stem(e))) ?? (images.filter((e) => /cover|front|folder/i.test(e)).length === 1 ? images.find((e) => /cover|front|folder/i.test(e)) : void 0) ?? (images.length === 1 ? images[0] : void 0);
  if (!pick) return null;
  try {
    return fs.readFileSync(path.join(dir, pick));
  } catch {
    return null;
  }
}
const UA = "Discette/1.0 ( discette-linux-player )";
let lastMb = 0;
async function mbThrottle() {
  const wait = lastMb + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastMb = Date.now();
}
function luceneEscape(s) {
  return s.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, "\\$1");
}
async function fetchBuf(url) {
  try {
    const res = await electron.net.fetch(url, { headers: { "User-Agent": UA, Accept: "image/*,application/json" } });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}
async function lookupAlbumArt(artist, album) {
  if (!album) return null;
  await mbThrottle();
  const q = `releasegroup:"${luceneEscape(album)}"` + (artist && artist !== "Various Artists" ? ` AND artist:"${luceneEscape(artist)}"` : "");
  const url = `https://musicbrainz.org/ws/2/release-group/?fmt=json&limit=5&query=${encodeURIComponent(q)}`;
  let groups = [];
  try {
    const res = await electron.net.fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json();
    groups = (json["release-groups"] ?? []).filter((g) => g.score >= 85);
  } catch {
    return null;
  }
  for (const g of groups.slice(0, 3)) {
    const img = await fetchBuf(`https://coverartarchive.org/release-group/${g.id}/front-500`);
    if (img && img.length > 1e3) return img;
  }
  return null;
}
const WRITABLE = /* @__PURE__ */ new Set(["mp3", "m4a", "m4b", "m4v", "mp4", "mov", "aac", "flac", "ogg", "oga", "opus", "wma", "ape", "wv", "aif", "aiff", "wav", "mkv", "mka", "webm"]);
function canWriteTags(container) {
  return WRITABLE.has(container);
}
function writeTags(t, artwork) {
  if (!canWriteTags(t.container)) return `Discette can't write tags to .${t.container} files; changes are kept in the library only.`;
  let f = null;
  try {
    f = nodeTaglibSharp.File.createFromPath(t.path);
    const tag = f.tag;
    tag.title = t.title || void 0;
    tag.performers = t.artist ? [t.artist] : [];
    tag.albumArtists = t.albumArtist ? [t.albumArtist] : [];
    tag.album = t.album || void 0;
    tag.genres = t.genre ? [t.genre] : [];
    tag.composers = t.composer ? [t.composer] : [];
    tag.year = t.year || 0;
    tag.track = t.trackNo || 0;
    tag.trackCount = t.trackCount || 0;
    tag.disc = t.discNo || 0;
    tag.discCount = t.discCount || 0;
    tag.comment = t.comment || void 0;
    tag.beatsPerMinute = t.bpm || 0;
    try {
      tag.isCompilation = t.compilation;
    } catch {
    }
    if (t.description) {
      try {
        tag.description = t.description;
      } catch {
      }
    }
    if (artwork === null) tag.pictures = [];
    else if (artwork) {
      const pic = nodeTaglibSharp.Picture.fromData(nodeTaglibSharp.ByteVector.fromByteArray(artwork));
      pic.type = nodeTaglibSharp.PictureType.FrontCover;
      tag.pictures = [pic];
    }
    f.save();
    return null;
  } catch (e) {
    return `Couldn't write tags to ${t.path}: ${e.message}`;
  } finally {
    try {
      f?.dispose();
    } catch {
    }
  }
}
const libEvents = new node_events.EventEmitter();
const activity = {
  importing: { active: false, done: 0, total: 0, current: "", label: "" },
  sync: null,
  artFetch: { active: false, done: 0, total: 0 }
};
let activityTimer = null;
function emitActivity(immediate = false) {
  if (immediate) {
    if (activityTimer) clearTimeout(activityTimer);
    activityTimer = null;
    libEvents.emit("activity", activity);
    return;
  }
  if (activityTimer) return;
  activityTimer = setTimeout(() => {
    activityTimer = null;
    libEvents.emit("activity", activity);
  }, 150);
}
function emitTracks(delta) {
  libEvents.emit("tracks", delta);
}
function emitPlaylists() {
  libEvents.emit("playlists", allPlaylists());
}
function isInsideMedia(p) {
  const root = mediaRoot() + path.sep;
  return p.startsWith(root);
}
function uniquePath(p, self) {
  if (!fs.existsSync(p) || p === self) return p;
  const ext = path.extname(p);
  const base = p.slice(0, -ext.length);
  for (let i = 1; i < 1e3; i++) {
    const c = `${base} ${i}${ext}`;
    if (!fs.existsSync(c) || c === self) return c;
  }
  return `${base} ${Date.now()}${ext}`;
}
async function moveFile(src, dest) {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  try {
    await fs.promises.rename(src, dest);
  } catch (e) {
    if (e.code !== "EXDEV") throw e;
    await fs.promises.copyFile(src, dest);
    await fs.promises.unlink(src);
  }
}
function sidecars(file2) {
  const dir = path.dirname(file2);
  const stem = path.basename(file2).replace(/\.[^.]+$/, "");
  try {
    return fs.readdirSync(dir).filter((e) => /\.(srt|vtt)$/i.test(e) && e.startsWith(stem + ".")).map((e) => path.join(dir, e));
  } catch {
    return [];
  }
}
async function transferSidecars(src, dest, move) {
  const srcStem = path.basename(src).replace(/\.[^.]+$/, "");
  const destBase = dest.replace(/\.[^.]+$/, "");
  for (const sc of sidecars(src)) {
    const target = destBase + path.basename(sc).slice(srcStem.length);
    try {
      if (move) await moveFile(sc, target);
      else await fs.promises.copyFile(sc, target);
    } catch {
    }
  }
}
function pruneEmptyDirs(dir) {
  const root = mediaRoot();
  while (dir.startsWith(root + path.sep) && dir !== root) {
    try {
      const entries = fs.readdirSync(dir).filter((e) => e !== ".DS_Store" && e !== "Thumbs.db");
      if (entries.length) return;
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      return;
    }
    dir = path.dirname(dir);
  }
}
async function expandPaths(paths, maxDepth = 20) {
  const media = [];
  const playlists = [];
  const walk = async (p, depth) => {
    let st;
    try {
      st = await fs.promises.stat(p);
    } catch {
      return;
    }
    if (st.isDirectory()) {
      if (depth > maxDepth) return;
      let entries = [];
      try {
        entries = await fs.promises.readdir(p);
      } catch {
        return;
      }
      entries.sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
      for (const e of entries) if (!e.startsWith(".")) await walk(path.join(p, e), depth + 1);
    } else if (st.isFile()) {
      const ext = extOf(p);
      if (MEDIA_EXTS.has(ext)) media.push(p);
      else if (PLAYLIST_EXTS.includes(ext)) playlists.push(p);
    }
  };
  for (const p of paths) await walk(p, 0);
  return { media, playlists };
}
async function pool(items, n, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}
let importChain = Promise.resolve();
function importPaths(paths, opts = {}) {
  const job = importChain.then(() => doImport(paths, opts));
  importChain = job.catch(() => void 0);
  return job;
}
async function doImport(paths, opts) {
  const settings = getSettings();
  const { media, playlists } = await expandPaths(paths);
  const imp = activity.importing;
  imp.active = true;
  imp.done = 0;
  imp.total = media.length;
  imp.label = opts.label ?? "Importing";
  imp.current = "";
  emitActivity(true);
  const errors = [];
  let added = 0;
  let skipped = 0;
  const bySource = /* @__PURE__ */ new Map();
  const pending = [];
  const flush = () => {
    if (pending.length) emitTracks({ upserted: pending.splice(0), removed: [] });
  };
  const dupKey = (t) => `${t.title}\0${t.artist}\0${t.album}\0${t.size}`;
  const existing = new Map(allTracks().map((t) => [dupKey(t), t]));
  const albumsAdded = /* @__PURE__ */ new Set();
  await pool(media, 3, async (file2) => {
    imp.current = path.basename(file2);
    try {
      const already = trackByPath(file2);
      if (already) {
        bySource.set(file2, already.id);
        opts.onTrack?.(file2, already);
        skipped++;
        return;
      }
      const { track, picture } = await readMediaFile(file2);
      const dup = existing.get(dupKey(track));
      if (dup) {
        bySource.set(file2, dup.id);
        opts.onTrack?.(file2, dup);
        skipped++;
        if (opts.moveSources) await fs.promises.unlink(file2).catch(() => void 0);
        return;
      }
      let art = picture ?? findFolderArt(file2, track.mediaKind !== "music");
      if (!art && track.mediaKind !== "music") art = await videoThumbnail(file2, Math.min(600, track.duration * 0.1 || 5));
      if (art) track.artKey = storeArt(art);
      if (!track.artKey && track.mediaKind === "music") {
        const sameAlbum = getDb().prepare("SELECT artKey FROM tracks WHERE album = ? AND (albumArtist = ? OR artist = ?) AND artKey != '' LIMIT 1").get(track.album, track.albumArtist || track.artist, track.albumArtist || track.artist);
        if (sameAlbum && track.album) track.artKey = sameAlbum.artKey;
      }
      if ((settings.copyOnImport || opts.moveSources) && !isInsideMedia(file2)) {
        const dest = uniquePath(path.join(mediaRoot(), organizedRelPath(track, track.container)));
        await fs.promises.mkdir(path.dirname(dest), { recursive: true });
        if (opts.moveSources) await moveFile(file2, dest);
        else await fs.promises.copyFile(file2, dest);
        if (track.mediaKind !== "music") await transferSidecars(file2, dest, !!opts.moveSources);
        track.path = dest;
      }
      if (trackByPath(track.path)) {
        skipped++;
        return;
      }
      const inserted = insertTrack(track);
      existing.set(dupKey(inserted), inserted);
      bySource.set(file2, inserted.id);
      opts.onTrack?.(file2, inserted);
      if (!inserted.artKey && inserted.mediaKind === "music") albumsAdded.add(String(inserted.id));
      pending.push(inserted);
      added++;
      if (pending.length >= 25) flush();
    } catch (e) {
      if (e.message === "not a playable media file") skipped++;
      else errors.push(`${path.basename(file2)}: ${e.message}`);
    } finally {
      imp.done++;
      emitActivity();
    }
  });
  flush();
  for (const pl of playlists) {
    try {
      const entries = parseM3U(fs.readFileSync(pl, "utf8"), path.dirname(pl));
      const ids = [];
      for (const e of entries) {
        const id = bySource.get(e) ?? trackByPath(e)?.id;
        if (id) ids.push(id);
      }
      const name = path.basename(pl).replace(/\.m3u8?$/i, "");
      const same = allPlaylists().some((p) => p.name === name && p.trackIds.join(",") === ids.join(","));
      if (ids.length && !same) createPlaylist(name, "normal", null, ids);
    } catch (e) {
      errors.push(`${path.basename(pl)}: ${e.message}`);
    }
  }
  if (playlists.length) emitPlaylists();
  imp.active = false;
  imp.current = "";
  emitActivity(true);
  if (settings.fetchArtOnline && albumsAdded.size) {
    void fetchMissingArt([...albumsAdded].map(Number), false);
  }
  if (errors.length) libEvents.emit("message", { title: "Some items could not be imported", detail: errors.slice(0, 20).join("\n") });
  return { added, skipped, errors };
}
async function organizeTrack(t) {
  if (!getSettings().keepOrganized || !isInsideMedia(t.path)) return t;
  const want = path.join(mediaRoot(), organizedRelPath(t, t.container));
  if (want === t.path) return t;
  const dest = uniquePath(want, t.path);
  if (dest === t.path) return t;
  try {
    await moveFile(t.path, dest);
    if (t.mediaKind !== "music") await transferSidecars(t.path, dest, true);
    pruneEmptyDirs(path.dirname(t.path));
    return updateTrack(t.id, { path: dest }) ?? t;
  } catch (e) {
    console.error("organize failed", e);
    return t;
  }
}
async function updateInfo(u) {
  const errors = [];
  const upserted = [];
  let artBuf;
  let artKey;
  if (u.artwork?.action === "set") {
    artBuf = Buffer.from(u.artwork.data, "base64");
    artKey = storeArt(artBuf);
    if (!artKey) errors.push("That image could not be read.");
  } else if (u.artwork?.action === "remove") {
    artBuf = null;
    artKey = "";
  }
  for (const id of u.ids) {
    let t = getTrack(id);
    if (!t) continue;
    const patch = { ...u.patch };
    if (artKey !== void 0 && (artKey || artBuf === null)) patch.artKey = artKey;
    t = updateTrack(id, patch);
    const tagFieldsChanged = Object.keys(u.patch).some((k) => !["rating", "mediaKind"].includes(k)) || artBuf !== void 0;
    if (tagFieldsChanged && fs.existsSync(t.path)) {
      const err = writeTags(t, artKey === "" && artBuf !== null ? void 0 : artBuf);
      if (err) errors.push(err);
      else {
        try {
          const st = fs.statSync(t.path);
          t = updateTrack(id, { size: st.size, mtime: Math.round(st.mtimeMs) });
        } catch {
        }
      }
    }
    t = await organizeTrack(t);
    upserted.push(t);
  }
  emitTracks({ upserted, removed: [] });
  return [...new Set(errors)].slice(0, 10);
}
function setRating(ids, rating) {
  const upserted = [];
  for (const id of ids) {
    const t = updateTrack(id, { rating: Math.max(0, Math.min(100, Math.round(rating / 20) * 20)) });
    if (t) upserted.push(t);
  }
  emitTracks({ upserted, removed: [] });
}
function recordPlay(id) {
  const t = getTrack(id);
  if (!t) return;
  const u = updateTrack(id, { playCount: t.playCount + 1, lastPlayed: Date.now() });
  if (u) emitTracks({ upserted: [u], removed: [] });
}
function recordSkip(id) {
  const t = getTrack(id);
  if (!t) return;
  const u = updateTrack(id, { skipCount: t.skipCount + 1 });
  if (u) emitTracks({ upserted: [u], removed: [] });
}
async function removeTracks(ids, trashFiles) {
  const tracks = getTracks(ids);
  if (trashFiles) {
    for (const t of tracks) {
      if (!isInsideMedia(t.path)) continue;
      try {
        await electron.shell.trashItem(t.path);
      } catch {
        await fs.promises.unlink(t.path).catch(() => void 0);
      }
      pruneEmptyDirs(path.dirname(t.path));
    }
  }
  deleteTracks(ids);
  emitTracks({ upserted: [], removed: ids });
  emitPlaylists();
}
async function refreshTracks(ids) {
  const upserted = [];
  for (const t of getTracks(ids)) {
    try {
      const { track, picture } = await readMediaFile(t.path);
      const keep = { dateAdded: t.dateAdded, playCount: t.playCount, skipCount: t.skipCount, lastPlayed: t.lastPlayed, rating: track.rating || t.rating, mediaKind: t.mediaKind };
      const artKey = picture ? storeArt(picture) : t.artKey;
      upserted.push(updateTrack(t.id, { ...track, ...keep, artKey }));
    } catch {
    }
  }
  emitTracks({ upserted, removed: [] });
}
let artChain = Promise.resolve();
function fetchMissingArt(ids, force) {
  const job = artChain.then(() => doFetchArt(ids, force));
  artChain = job.catch(() => 0);
  return job;
}
async function doFetchArt(ids, force) {
  const tracks = (ids ? getTracks(ids) : allTracks()).filter((t) => t.mediaKind === "music" && t.album && (force || !t.artKey));
  const albums = /* @__PURE__ */ new Map();
  for (const t of tracks) {
    const k = albumKey(t);
    if (!albums.has(k)) albums.set(k, []);
    albums.get(k).push(t);
  }
  const todo = [...albums.entries()].filter(([k]) => force || !artTried(k));
  if (!todo.length) return 0;
  const af = activity.artFetch;
  af.active = true;
  af.done = 0;
  af.total = todo.length;
  emitActivity(true);
  let found = 0;
  for (const [k, group] of todo) {
    const [artist, album] = k.split("\0");
    const img = await lookupAlbumArt(artist, album);
    markArtTried(k);
    if (img) {
      const key = storeArt(img);
      if (key) {
        found++;
        const all = allTracks().filter((t) => albumKey(t) === k && (force || !t.artKey));
        const upserted = all.map((t) => updateTrack(t.id, { artKey: key }));
        emitTracks({ upserted, removed: [] });
      }
    }
    af.done++;
    emitActivity();
  }
  af.active = false;
  emitActivity(true);
  return found;
}
let watcher = null;
let watchTimer = null;
function setupAutoAdd() {
  watcher?.close();
  watcher = null;
  const s = getSettings();
  if (!s.watchAutoAdd || !s.autoAddFolder) return;
  try {
    fs.mkdirSync(s.autoAddFolder, { recursive: true });
  } catch {
    return;
  }
  const scan = () => {
    if (watchTimer) clearTimeout(watchTimer);
    watchTimer = setTimeout(async () => {
      const entries = fs.readdirSync(s.autoAddFolder).filter((e) => !e.startsWith(".") && !e.endsWith(".part") && !e.endsWith(".crdownload"));
      if (!entries.length) return;
      const full = entries.map((e) => path.join(s.autoAddFolder, e));
      const sizes = full.map((f) => fs.statSync(f, { throwIfNoEntry: false })?.size ?? -1);
      await new Promise((r) => setTimeout(r, 1500));
      const stable = full.filter((f, i) => (fs.statSync(f, { throwIfNoEntry: false })?.size ?? -2) === sizes[i]);
      if (!stable.length) return;
      await importPaths(stable, { moveSources: true, label: "Adding" });
      for (const f of stable) {
        try {
          if (fs.statSync(f).isDirectory() && !(await expandPaths([f])).media.length) fs.rmSync(f, { recursive: true, force: true });
        } catch {
        }
      }
    }, 2e3);
  };
  try {
    watcher = fs.watch(s.autoAddFolder, { persistent: false }, scan);
    scan();
  } catch (e) {
    console.error("auto-add watch failed", e);
  }
}
const truthy = (v) => v === true || v === 1 || v === "1" || v === "true";
const SYSTEM_MOUNTS = /^\/(boot|efi|usr|var|home|snap|$)/;
function parseLsblk(json) {
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const out = [];
  for (const disk of data.blockdevices ?? []) {
    if (disk.type !== "disk") continue;
    const isUsb = (disk.tran ?? "").toLowerCase() === "usb" || truthy(disk.hotplug);
    if (!isUsb) continue;
    const parts = disk.children?.length ? disk.children : [disk];
    for (const p of parts) {
      if (!p.fstype || p.fstype === "swap" || p.fstype === "crypto_LUKS") continue;
      const mp = p.mountpoint ?? (p.mountpoints ?? []).find((m) => !!m) ?? null;
      if (mp && (mp === "[SWAP]" || SYSTEM_MOUNTS.test(mp))) continue;
      const devPath = p.path ?? `/dev/${p.name}`;
      out.push({
        id: `usb:${p.uuid || devPath}`,
        devPath,
        diskPath: disk.path ?? `/dev/${disk.name}`,
        mountPath: mp || null,
        label: (p.label ?? "").trim(),
        vendor: (disk.vendor ?? "").trim(),
        model: (disk.model ?? "").trim().replace(/_/g, " "),
        size: Number(p.size ?? disk.size ?? 0) || 0,
        fstype: p.fstype
      });
    }
  }
  return out;
}
function parseGioMounts(text) {
  const volumes = [];
  const mounts = [];
  let currentVolume = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    let m = line.match(/^Volume\(\d+\):\s*(.*)$/);
    if (m) {
      currentVolume = m[1].trim();
      continue;
    }
    m = line.match(/^Mount\(\d+\):\s*(.*?)\s*->\s*(\S+)/);
    if (m) {
      currentVolume = null;
      if (m[2].startsWith("mtp://")) mounts.push({ name: m[1], uri: m[2] });
      continue;
    }
    if (/^Drive\(\d+\):/.test(line)) {
      currentVolume = null;
      continue;
    }
    m = line.match(/^activation_root=(mtp:\/\/\S+)/);
    if (m && currentVolume !== null) volumes.push({ name: currentVolume, uri: m[1] });
  }
  return { volumes, mounts };
}
function mtpHost(uri) {
  return uri.replace(/^mtp:\/\//, "").replace(/\/.*$/, "");
}
function prettyMtpHost(host) {
  const parts = decodeURIComponent(host).split("_").filter(Boolean);
  if (parts.length > 1 && /\d/.test(parts[parts.length - 1]) && parts[parts.length - 1].length >= 6) parts.pop();
  const dedup = parts.filter((p, i) => i === 0 || p.toLowerCase() !== parts[i - 1].toLowerCase());
  return dedup.join(" ") || "Phone";
}
const deviceEvents = new node_events.EventEmitter();
const devices = /* @__PURE__ */ new Map();
const trackIndex = /* @__PURE__ */ new Map();
let nextDeviceTrackId = -1;
const SIMULATED_ROOTS = (process.env.DISCETTE_FAKE_DEVICES ?? "").split(":").filter(Boolean);
function exec(cmd2, args, timeout = 8e3) {
  return new Promise((resolve) => {
    node_child_process.execFile(cmd2, args, { timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => resolve(err ? "" : stdout.toString()));
  });
}
function publicDevice(d) {
  return {
    id: d.id,
    kind: d.kind,
    name: d.name,
    mountPath: d.mountPath,
    devPath: d.devPath,
    vendor: d.vendor,
    model: d.model,
    size: d.size,
    free: d.free,
    scanning: d.scanning,
    scanned: d.scanned,
    hasProfile: d.hasProfile
  };
}
function listDevices() {
  return [...devices.values()].map(publicDevice);
}
function getDevice(id) {
  return devices.get(id);
}
function getDeviceTrack(id) {
  return trackIndex.get(id);
}
function getDeviceTracks(id) {
  return [...devices.get(id)?.tracks.values() ?? []];
}
function emitDevices() {
  deviceEvents.emit("devices", listDevices());
}
async function spaceOf(p) {
  try {
    const s = await fs.promises.statfs(p);
    return { size: s.blocks * s.bsize, free: s.bavail * s.bsize };
  } catch {
    return { size: 0, free: 0 };
  }
}
async function discoverUsb() {
  const json = await exec("lsblk", ["-J", "-b", "-o", "NAME,PATH,TYPE,TRAN,RM,HOTPLUG,SIZE,LABEL,MODEL,VENDOR,FSTYPE,UUID,MOUNTPOINT"]);
  return parseLsblk(json).map((m) => ({
    id: m.id,
    name: m.label || [m.vendor, m.model].filter(Boolean).join(" ") || "USB Drive",
    mount: m
  }));
}
const mountAttempts = /* @__PURE__ */ new Map();
async function discoverMtp() {
  const uid = os.userInfo().uid;
  const gvfs = `/run/user/${uid}/gvfs`;
  const gio = parseGioMounts(await exec("gio", ["mount", "-li"], 5e3));
  for (const v of gio.volumes) {
    const mounted = gio.mounts.some((m) => mtpHost(m.uri) === mtpHost(v.uri));
    const last = mountAttempts.get(v.uri) ?? 0;
    if (!mounted && Date.now() - last > 3e4) {
      mountAttempts.set(v.uri, Date.now());
      void exec("gio", ["mount", v.uri], 2e4);
    }
  }
  const names = /* @__PURE__ */ new Map();
  for (const x of [...gio.volumes, ...gio.mounts]) names.set(decodeURIComponent(mtpHost(x.uri)), x.name);
  let entries = [];
  try {
    entries = fs.readdirSync(gvfs).filter((e) => e.startsWith("mtp:host="));
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    const host = e.slice("mtp:host=".length);
    const phone = names.get(decodeURIComponent(host)) ?? prettyMtpHost(host);
    let storages = [];
    try {
      storages = fs.readdirSync(path.join(gvfs, e)).filter((s) => !s.startsWith("."));
    } catch {
      continue;
    }
    for (const s of storages) {
      out.push({
        id: `mtp:${host}/${s}`,
        name: storages.length > 1 ? `${phone} (${s})` : phone,
        root: path.join(gvfs, e, s),
        uri: `mtp://${host}/`
      });
    }
  }
  return out;
}
let polling = false;
async function poll() {
  if (polling) return;
  polling = true;
  try {
    const seen = /* @__PURE__ */ new Set();
    let changed = false;
    const upsert = async (id, base) => {
      seen.add(id);
      const existing = devices.get(id);
      if (existing && existing.mountPath === base.mountPath) return;
      const space = base.mountPath ? await spaceOf(base.mountPath) : { size: 0, free: 0 };
      const d = existing ?? { ...base, ...space, scanning: false, scanned: 0, hasProfile: false, tracks: /* @__PURE__ */ new Map() };
      Object.assign(d, base, space);
      d.hasProfile = !!(d.mountPath && fs.existsSync(profilePath(d.mountPath)));
      devices.set(id, d);
      changed = true;
      if (d.mountPath) void scanDevice(id);
    };
    for (const u of await discoverUsb()) {
      await upsert(u.id, { id: u.id, kind: "usb", name: u.name, mountPath: u.mount.mountPath, devPath: u.mount.devPath, diskPath: u.mount.diskPath, vendor: u.mount.vendor, model: u.mount.model });
    }
    for (const m of await discoverMtp()) {
      await upsert(m.id, { id: m.id, kind: "mtp", name: m.name, mountPath: m.root, devPath: m.uri, vendor: "", model: "" });
    }
    for (const root of SIMULATED_ROOTS) {
      const id = `usb:sim:${root}`;
      if (fs.existsSync(root)) await upsert(id, { id, kind: "usb", name: path.basename(root), mountPath: root, devPath: root, vendor: "Simulated", model: "Drive" });
    }
    for (const [id, d] of devices) {
      if (!seen.has(id)) {
        d.scanAbort?.abort();
        for (const tid of d.tracks.keys()) trackIndex.delete(tid);
        devices.delete(id);
        changed = true;
        deviceEvents.emit("removed", id);
      }
    }
    if (changed) emitDevices();
  } catch (e) {
    console.error("device poll failed", e);
  } finally {
    polling = false;
  }
}
let timer = null;
function startDeviceMonitor() {
  void poll();
  timer = setInterval(() => void poll(), 2500);
}
function stopDeviceMonitor() {
  if (timer) clearInterval(timer);
  for (const d of devices.values()) d.scanAbort?.abort();
}
const SKIP_DIRS = /* @__PURE__ */ new Set(["android", "lost+found", "system volume information", "$recycle.bin", ".trashes", ".spotlight-v100", ".fseventsd", ".discette"]);
async function scanDevice(id) {
  const d = devices.get(id);
  if (!d || !d.mountPath) return;
  d.scanAbort?.abort();
  const abort = new AbortController();
  d.scanAbort = abort;
  for (const tid of d.tracks.keys()) trackIndex.delete(tid);
  d.tracks.clear();
  d.scanning = true;
  d.scanned = 0;
  emitDevices();
  deviceEvents.emit("tracks", { deviceId: id, tracks: [], reset: true });
  let roots = [];
  try {
    roots = fs.readdirSync(d.mountPath).filter((e) => !e.startsWith(".") && !SKIP_DIRS.has(e.toLowerCase())).map((e) => path.join(d.mountPath, e));
  } catch {
    roots = [];
  }
  const { media } = await expandPaths(roots, d.kind === "mtp" ? 8 : 12);
  let batch = [];
  const flush = () => {
    if (batch.length) deviceEvents.emit("tracks", { deviceId: id, tracks: batch.splice(0) });
    emitDevices();
  };
  for (const file2 of media) {
    if (abort.signal.aborted) return;
    try {
      const { track, picture } = await readMediaFile(file2, { fast: true });
      let art = picture;
      if (!art && track.mediaKind === "music") art = findFolderArt(file2);
      if (art) track.artKey = storeArt(art);
      const t = { ...track, id: nextDeviceTrackId--, pid: `dev:${file2}`, deviceId: id, dateAdded: track.mtime };
      d.tracks.set(t.id, t);
      trackIndex.set(t.id, t);
      batch.push(t);
      d.scanned++;
      if (batch.length >= 40) flush();
    } catch {
    }
  }
  d.scanning = false;
  const space = await spaceOf(d.mountPath);
  d.size = space.size;
  d.free = space.free;
  flush();
}
async function deleteFromDevice(deviceId, ids) {
  const d = devices.get(deviceId);
  const errors = [];
  if (!d?.mountPath) return ["Device is not available."];
  for (const id of ids) {
    const t = d.tracks.get(id);
    if (!t || !t.path.startsWith(d.mountPath)) continue;
    try {
      await fs.promises.unlink(t.path);
    } catch (e) {
      errors.push(`${path.basename(t.path)}: ${e.message}`);
      continue;
    }
    d.tracks.delete(id);
    trackIndex.delete(id);
  }
  const space = await spaceOf(d.mountPath);
  Object.assign(d, space);
  deviceEvents.emit("tracks", { deviceId, tracks: [...d.tracks.values()], reset: true });
  emitDevices();
  return errors;
}
async function refreshDeviceSpace(deviceId) {
  const d = devices.get(deviceId);
  if (!d?.mountPath) return;
  Object.assign(d, await spaceOf(d.mountPath));
  d.hasProfile = fs.existsSync(profilePath(d.mountPath));
  emitDevices();
}
async function mountDevice(id) {
  const d = devices.get(id);
  if (!d) return "Device not found.";
  if (d.kind === "mtp") {
    await exec("gio", ["mount", d.devPath], 2e4);
  } else {
    const out = await exec("udisksctl", ["mount", "-b", d.devPath, "--no-user-interaction"], 2e4);
    if (!out) return `Couldn't mount ${d.name}.`;
  }
  setTimeout(() => void poll(), 500);
  return null;
}
async function ejectDevice(id) {
  const d = devices.get(id);
  if (!d) return "Device not found.";
  d.scanAbort?.abort();
  if (d.id.startsWith("usb:sim:")) {
    devices.delete(id);
    emitDevices();
    return null;
  }
  if (d.kind === "mtp") {
    await exec("gio", ["mount", "-u", d.devPath], 15e3);
  } else {
    const siblings = [...devices.values()].filter((x) => x.kind === "usb" && x.diskPath === d.diskPath);
    for (const s of siblings) {
      if (!s.mountPath) continue;
      const r = await exec("udisksctl", ["unmount", "-b", s.devPath, "--no-user-interaction"], 2e4);
      if (!r) {
        const g = await new Promise((res) => node_child_process.execFile("gio", ["mount", "-u", s.mountPath], (e) => res(!e)));
        if (!g) return `"${s.name}" is busy. Close any files on it and try again.`;
      }
    }
    if (d.diskPath) await exec("udisksctl", ["power-off", "-b", d.diskPath, "--no-user-interaction"], 2e4);
  }
  setTimeout(() => void poll(), 300);
  return null;
}
function profilePath(root) {
  return path.join(root, ".discette", "sync.json");
}
function defaultProfile(name) {
  const s = getSettings();
  return {
    version: 1,
    deviceUuid: crypto.randomUUID(),
    name,
    musicFolder: "Music",
    videoFolder: "Videos",
    playlistsFolder: "Playlists",
    music: { enabled: true, mode: "all", playlists: [], artists: [], albums: [], genres: [] },
    movies: { enabled: false, mode: "selected", pids: [] },
    tvShows: { enabled: false, mode: "selected", shows: [] },
    convert: { enabled: false, format: s.sync.format, bitrate: s.sync.bitrate },
    writePlaylists: true,
    autoSync: false,
    synced: {},
    lastSync: 0
  };
}
function readProfile(id) {
  const d = devices.get(id);
  if (!d?.mountPath) throw new Error("Device is not mounted.");
  try {
    const p = JSON.parse(fs.readFileSync(profilePath(d.mountPath), "utf8"));
    return { ...defaultProfile(d.name), ...p };
  } catch {
    return defaultProfile(d.name);
  }
}
function writeProfile(id, profile) {
  const d = devices.get(id);
  if (!d?.mountPath) throw new Error("Device is not mounted.");
  const file2 = profilePath(d.mountPath);
  fs.mkdirSync(path.dirname(file2), { recursive: true });
  fs.writeFileSync(file2, JSON.stringify(profile, null, 1));
  d.hasProfile = true;
  emitDevices();
}
let current = null;
function progress(p) {
  activity.sync = { ...activity.sync ?? { active: true, phase: "planning", done: 0, total: 0, current: "" }, ...p };
  emitActivity(p.phase === "done" || p.phase === "error" || p.phase === "cancelled");
}
function cancelSync() {
  current?.abort.abort();
}
async function pruneEmpty(root, rel) {
  let dir = path.dirname(path.join(root, rel));
  while (dir.startsWith(root + path.sep) && dir !== root) {
    try {
      const entries = await fs.promises.readdir(dir);
      if (entries.length) return;
      await fs.promises.rmdir(dir);
    } catch {
      return;
    }
    dir = path.dirname(dir);
  }
}
async function syncDevice(deviceId, profileOverride) {
  if (current) return "A sync is already in progress.";
  const dev = getDevice(deviceId);
  if (!dev?.mountPath) return "The device is not mounted.";
  const root = dev.mountPath;
  const abort = new AbortController();
  current = { deviceId, abort };
  const profile = readProfile(deviceId);
  try {
    progress({ deviceId, active: true, phase: "planning", done: 0, total: 0, current: "Preparing to sync…", message: void 0 });
    const tracks = allTracks();
    const playlists = allPlaylists();
    const plan = planSync(profile, tracks, playlists, (rel) => fs.existsSync(path.join(root, rel)));
    const free = await fs.promises.statfs(root).then((s) => s.bavail * s.bsize).catch(() => 0) || dev.free;
    const net = plan.bytesNeeded - plan.bytesFreed;
    if (free > 0 && net > free - 2e7) {
      const msg = `Not enough space on "${dev.name}". Sync needs ${formatSize(net)} but only ${formatSize(free)} is free. Choose fewer items or turn on conversion.`;
      progress({ deviceId, active: false, phase: "error", message: msg });
      return msg;
    }
    const total = plan.remove.length + plan.copy.length + plan.playlists.length;
    let done = 0;
    const saveEvery = () => {
      try {
        writeProfile(deviceId, profile);
      } catch {
      }
    };
    for (const r of plan.remove) {
      if (abort.signal.aborted) break;
      progress({ deviceId, phase: "removing", done: done++, total, current: path.basename(r.rel) });
      await fs.promises.unlink(path.join(root, r.rel)).catch(() => void 0);
      await pruneEmpty(root, r.rel);
      if (profile.synced[r.pid]?.path === r.rel) delete profile.synced[r.pid];
    }
    const errors = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "discette-sync-"));
    let sinceSave = 0;
    for (const c of plan.copy) {
      if (abort.signal.aborted) break;
      const label = `${c.track.title}${c.track.artist ? " — " + c.track.artist : ""}`;
      progress({ deviceId, phase: c.convert ? "converting" : "copying", done: done++, total, current: label });
      const dest = path.join(root, c.rel);
      try {
        if (!fs.existsSync(c.track.path)) throw new Error("file is missing from the library");
        await fs.promises.mkdir(path.dirname(dest), { recursive: true });
        let src = c.track.path;
        if (c.convert) {
          src = path.join(tmpDir, `t${c.track.id}.${c.rel.split(".").pop()}`);
          await convertForDevice(c.track.path, src, profile.convert.format, profile.convert.bitrate, abort.signal);
        }
        await fs.promises.copyFile(src, dest);
        if (c.convert) await fs.promises.unlink(src).catch(() => void 0);
        const size = (await fs.promises.stat(dest).catch(() => null))?.size ?? c.estBytes;
        profile.synced[c.track.pid] = { path: c.rel, mtime: c.track.mtime, size };
        if (++sinceSave >= 20) {
          sinceSave = 0;
          saveEvery();
        }
      } catch (e) {
        if (abort.signal.aborted) break;
        errors.push(`${label}: ${e.message}`);
        await fs.promises.unlink(dest).catch(() => void 0);
        if (e.code === "ENOSPC") break;
        if (e.code === "ENOENT" && !fs.existsSync(root)) break;
      }
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (!abort.signal.aborted) {
      const written = /* @__PURE__ */ new Set();
      for (const pl of plan.playlists) {
        progress({ deviceId, phase: "playlists", done: done++, total, current: pl.playlist.name });
        const body = buildM3U(
          pl.entries.filter((e) => profile.synced[e.track.pid]).map((e) => ({ path: relativeFrom(pl.rel, e.rel), duration: e.track.duration, artist: e.track.artist, title: e.track.title }))
        );
        try {
          await fs.promises.mkdir(path.dirname(path.join(root, pl.rel)), { recursive: true });
          await fs.promises.writeFile(path.join(root, pl.rel), body);
          profile.synced[`playlist:${pl.playlist.pid}`] = { path: pl.rel, mtime: Date.now(), size: body.length };
          written.add(`playlist:${pl.playlist.pid}`);
        } catch (e) {
          errors.push(`${pl.playlist.name}: ${e.message}`);
        }
      }
      for (const [k, v] of Object.entries(profile.synced)) {
        if (k.startsWith("playlist:") && !written.has(k)) {
          await fs.promises.unlink(path.join(root, v.path)).catch(() => void 0);
          delete profile.synced[k];
        }
      }
    }
    profile.lastSync = Date.now();
    saveEvery();
    const cancelled = abort.signal.aborted;
    progress({
      deviceId,
      active: false,
      phase: cancelled ? "cancelled" : errors.length ? "error" : "done",
      done: total,
      total,
      current: "",
      message: cancelled ? "Sync cancelled." : errors.length ? `${errors.length} item(s) could not be synced:
${errors.slice(0, 10).join("\n")}` : `Sync of "${dev.name}" is complete.`
    });
    void refreshDeviceSpace(deviceId);
    void scanDevice(deviceId);
    return errors.length ? errors[0] : null;
  } catch (e) {
    progress({ deviceId, active: false, phase: "error", message: e.message });
    return e.message;
  } finally {
    current = null;
  }
}
const SCHEME = "discette";
function registerSchemePrivileges() {
  electron.protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true, corsEnabled: true } }
  ]);
}
const MIME = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  m4b: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  webm: "video/webm",
  mka: "audio/x-matroska",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  ogv: "video/ogg",
  jpg: "image/jpeg",
  vtt: "text/vtt"
};
let resolveTrack = () => void 0;
const inflight = /* @__PURE__ */ new Map();
function transcodeCachePath(t) {
  const tag = `${t.pid}-${t.mtime}`.replace(/[^a-zA-Z0-9-]/g, "");
  return path.join(cacheDir("transcode"), `${tag}.flac`);
}
function ensureAudioTranscode(t) {
  const dest = transcodeCachePath(t);
  if (fs.existsSync(dest)) {
    const now = /* @__PURE__ */ new Date();
    fs.utimes(dest, now, now, () => void 0);
    return Promise.resolve(dest);
  }
  let p = inflight.get(dest);
  if (!p) {
    p = transcodeAudioToFlac(t.path, dest).then(() => {
      pruneTranscodeCache();
      return dest;
    }).finally(() => inflight.delete(dest));
    inflight.set(dest, p);
  }
  return p;
}
function pruneTranscodeCache() {
  try {
    const dir = cacheDir("transcode");
    const files = fs.readdirSync(dir).map((f) => {
      const st = fs.statSync(path.join(dir, f));
      return { f: path.join(dir, f), size: st.size, at: st.atimeMs };
    });
    let total = files.reduce((a, b) => a + b.size, 0);
    const max = getSettings().transcodeCacheMB * 1e6;
    files.sort((a, b) => a.at - b.at);
    for (const x of files) {
      if (total <= max) break;
      if (x.f.endsWith(".part")) continue;
      fs.rmSync(x.f, { force: true });
      total -= x.size;
    }
  } catch {
  }
}
const liveStreams = /* @__PURE__ */ new Map();
async function serveFile(file2, req, mime) {
  let st;
  try {
    st = await fs.promises.stat(file2);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const size = st.size;
  const range = req.headers.get("range");
  const headers = { "Content-Type": mime, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" };
  if (range) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
    if (m && !m[1] && m[2]) {
      start = Math.max(0, size - parseInt(m[2], 10));
      end = size - 1;
    }
    if (start >= size || end < start) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    end = Math.min(end, size - 1);
    const stream2 = fs.createReadStream(file2, { start, end });
    return new Response(node_stream.Readable.toWeb(stream2), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) }
    });
  }
  const stream = fs.createReadStream(file2);
  return new Response(node_stream.Readable.toWeb(stream), { status: 200, headers: { ...headers, "Content-Length": String(size) } });
}
function srtToVtt(srt) {
  return "WEBVTT\n\n" + srt.replace(/^﻿/, "").replace(/\r/g, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
}
function findSubtitles(t) {
  const dir = path.dirname(t.path);
  const stem = path.basename(t.path).replace(/\.[^.]+$/, "");
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return entries.filter((e) => (e.endsWith(".srt") || e.endsWith(".vtt")) && e.startsWith(stem)).map((e) => {
    const mid = e.slice(stem.length).replace(/\.(srt|vtt)$/, "").replace(/^\./, "");
    return { label: mid ? mid.toUpperCase() : "Subtitles", file: path.join(dir, e), lang: mid.slice(0, 2) || "en" };
  });
}
function playbackInfo(t) {
  const subs = t.mediaKind === "music" ? [] : findSubtitles(t).map((s, i) => ({ label: s.label, lang: s.lang, url: `${SCHEME}://subs/${t.id}/${i}` }));
  if (t.transcode >= 2) return { url: `${SCHEME}://stream/${t.id}`, mode: t.transcode, seekable: false, subtitles: subs };
  return { url: `${SCHEME}://media/${t.id}?v=${t.mtime}`, mode: t.transcode, seekable: true, subtitles: subs };
}
function registerProtocol(resolver) {
  resolveTrack = resolver;
  electron.protocol.handle(SCHEME, async (req) => {
    const res = await handle(req);
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  });
}
async function handle(req) {
  {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    try {
      switch (url.host) {
        case "art": {
          const key = (parts[0] ?? "").replace(/[^a-f0-9]/g, "");
          const size = url.searchParams.get("s") === "full" ? "full" : "thumb";
          const f = artFile(key, size);
          if (!key || !fs.existsSync(f)) return new Response("Not found", { status: 404 });
          return new Response(fs.readFileSync(f), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "max-age=31536000, immutable" } });
        }
        case "media": {
          const t = resolveTrack(Number(parts[0]));
          if (!t) return new Response("Not found", { status: 404 });
          if (t.transcode === 1) {
            const f = await ensureAudioTranscode(t);
            return serveFile(f, req, "audio/flac");
          }
          return serveFile(t.path, req, MIME[extOf(t.path)] ?? "application/octet-stream");
        }
        case "stream": {
          const t = resolveTrack(Number(parts[0]));
          if (!t) return new Response("Not found", { status: 404 });
          liveStreams.get(t.id)?.kill("SIGKILL");
          const offset = Math.max(0, parseFloat(url.searchParams.get("t") ?? "0") || 0);
          const proc = startVideoStream(t.path, t.transcode, offset);
          liveStreams.set(t.id, proc);
          proc.on("close", () => {
            if (liveStreams.get(t.id) === proc) liveStreams.delete(t.id);
          });
          proc.stderr?.on("data", (d) => console.error("[ffmpeg]", d.toString().trim()));
          proc.stdout.on("close", () => proc.kill("SIGKILL"));
          const body = node_stream.Readable.toWeb(proc.stdout);
          return new Response(body, { headers: { "Content-Type": "video/mp4", "Cache-Control": "no-store" } });
        }
        case "subs": {
          const t = resolveTrack(Number(parts[0]));
          const s = t ? findSubtitles(t)[Number(parts[1])] : void 0;
          if (!s) return new Response("Not found", { status: 404 });
          const raw = fs.readFileSync(s.file, "utf8");
          return new Response(s.file.endsWith(".srt") ? srtToVtt(raw) : raw, { headers: { "Content-Type": "text/vtt; charset=utf-8" } });
        }
      }
    } catch (e) {
      console.error("protocol error", e);
      return new Response(String(e.message), { status: 500 });
    }
    return new Response("Not found", { status: 404 });
  }
}
function killAllStreams() {
  for (const p of liveStreams.values()) p.kill("SIGKILL");
  liveStreams.clear();
}
electron.app.setName("Discette");
if (process.env.DISCETTE_USER_DATA) electron.app.setPath("userData", process.env.DISCETTE_USER_DATA);
registerSchemePrivileges();
electron.app.commandLine.appendSwitch("enable-features", "MediaSessionService,HardwareMediaKeyHandling");
let win = null;
const iconPath = () => path.join(__dirname, "../../resources/icon.png");
function send(channel, ...args) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}
function resolveAnyTrack(id) {
  return id < 0 ? getDeviceTrack(id) : getTrack(id);
}
function createWindow() {
  getSettings();
  win = new electron.BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 560,
    title: "Discette",
    icon: electron.nativeImage.createFromPath(iconPath()),
    backgroundColor: "#e8e8e8",
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: "no-user-gesture-required"
    }
  });
  win.once("ready-to-show", () => win?.show());
  win.on("closed", () => win = null);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (!electron.app.isPackaged && process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(path.join(__dirname, "../renderer/index.html"));
}
function cmd(command) {
  return () => send("menu", command);
}
function buildMenu() {
  const t = [
    {
      label: "&File",
      submenu: [
        { label: "New Playlist", accelerator: "CmdOrCtrl+N", click: cmd("new-playlist") },
        { label: "New Playlist from Selection", accelerator: "CmdOrCtrl+Shift+N", click: cmd("new-playlist-from-selection") },
        { label: "New Smart Playlist…", accelerator: "CmdOrCtrl+Alt+N", click: cmd("new-smart-playlist") },
        { type: "separator" },
        { label: "Add File to Library…", accelerator: "CmdOrCtrl+O", click: cmd("add-files") },
        { label: "Add Folder to Library…", accelerator: "CmdOrCtrl+Shift+O", click: cmd("add-folder") },
        { type: "separator" },
        { label: "Import Playlist…", click: cmd("import-playlist") },
        { label: "Export Playlist…", click: cmd("export-playlist") },
        { type: "separator" },
        { label: "Get Info", accelerator: "CmdOrCtrl+I", click: cmd("get-info") },
        { label: "Show in File Manager", accelerator: "CmdOrCtrl+Shift+R", click: cmd("show-in-folder") },
        { type: "separator" },
        {
          label: "Library",
          submenu: [
            { label: "Get Album Artwork", click: cmd("fetch-art-all") },
            { label: "Re-read Tags from Files", click: cmd("refresh-selection") },
            { label: "Open Media Folder", click: () => void electron.shell.openPath(mediaRoot()) }
          ]
        },
        { type: "separator" },
        { label: "Preferences…", accelerator: "CmdOrCtrl+,", click: cmd("preferences") },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "&Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", click: (_m, w) => w?.webContents.selectAll() || send("menu", "select-all") },
        { label: "Select None", accelerator: "CmdOrCtrl+Shift+A", click: cmd("select-none") },
        { type: "separator" },
        { label: "Find", accelerator: "CmdOrCtrl+F", click: cmd("find") }
      ]
    },
    {
      label: "&View",
      submenu: [
        { label: "as List", accelerator: "CmdOrCtrl+1", click: cmd("view-list") },
        { label: "as Carousel", accelerator: "CmdOrCtrl+2", click: cmd("view-coverflow") },
        { type: "separator" },
        { label: "Column Browser", accelerator: "CmdOrCtrl+B", click: cmd("toggle-column-browser") },
        { label: "View Options…", accelerator: "CmdOrCtrl+J", click: cmd("view-options") },
        { type: "separator" },
        { label: "Go to Current Song", accelerator: "CmdOrCtrl+L", click: cmd("go-current") },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        ...electron.app.isPackaged ? [] : [{ role: "toggleDevTools" }]
      ]
    },
    {
      label: "&Controls",
      submenu: [
        { label: "Play / Pause", click: cmd("play-pause") },
        { label: "Next", accelerator: "CmdOrCtrl+Right", click: cmd("next") },
        { label: "Previous", accelerator: "CmdOrCtrl+Left", click: cmd("prev") },
        { type: "separator" },
        { label: "Increase Volume", accelerator: "CmdOrCtrl+Up", click: cmd("vol-up") },
        { label: "Decrease Volume", accelerator: "CmdOrCtrl+Down", click: cmd("vol-down") },
        { type: "separator" },
        { label: "Shuffle", click: cmd("shuffle") },
        { label: "Repeat", click: cmd("repeat") }
      ]
    },
    {
      label: "&Help",
      submenu: [
        {
          label: "About Discette",
          click: () => void electron.dialog.showMessageBox(win, {
            type: "info",
            icon: electron.nativeImage.createFromPath(iconPath()),
            title: "About Discette",
            message: `Discette ${electron.app.getVersion()}`,
            detail: `Music & video library for Linux.
Electron ${process.versions.electron} · Chromium ${process.versions.chrome}

Audio/video conversion uses FFmpeg (LGPL/GPL).`
          })
        }
      ]
    }
  ];
  electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(t));
}
function toMenu(items, resolve) {
  return items.map(
    (i) => i.type === "separator" ? { type: "separator" } : {
      label: i.label,
      type: i.type === "checkbox" ? "checkbox" : void 0,
      checked: i.checked,
      enabled: i.enabled !== false,
      submenu: i.submenu ? toMenu(i.submenu, resolve) : void 0,
      click: i.submenu ? void 0 : () => resolve(i.id ?? null)
    }
  );
}
function registerIpc() {
  const h = electron.ipcMain.handle.bind(electron.ipcMain);
  h("lib:tracks", () => allTracks());
  h("lib:import", (_e, paths) => importPaths(paths));
  h("lib:updateInfo", (_e, u) => updateInfo(u));
  h("lib:rate", (_e, ids, rating) => setRating(ids, rating));
  h("lib:remove", (_e, ids, trash) => removeTracks(ids, trash));
  h("lib:played", (_e, id) => id > 0 && recordPlay(id));
  h("lib:skipped", (_e, id) => id > 0 && recordSkip(id));
  h("lib:refresh", (_e, ids) => refreshTracks(ids));
  h("lib:fetchArt", (_e, ids, force) => fetchMissingArt(ids, force));
  h("lib:showInFolder", (_e, id) => {
    const t = resolveAnyTrack(id);
    if (t) electron.shell.showItemInFolder(t.path);
  });
  h("lib:playback", (_e, id) => {
    const t = resolveAnyTrack(id);
    if (!t) return null;
    if (!fs.existsSync(t.path)) return { error: `The file “${path.basename(t.path)}” could not be found.` };
    return playbackInfo(t);
  });
  h("lib:activity", () => activity);
  h("pl:all", () => allPlaylists());
  h("pl:create", (_e, name, kind, rules, trackIds) => {
    const p = createPlaylist(name, kind, rules, (trackIds ?? []).filter((x) => x > 0));
    emitPlaylists();
    return p;
  });
  h("pl:update", (_e, id, patch) => {
    const p = updatePlaylist(id, patch);
    emitPlaylists();
    return p;
  });
  h("pl:delete", (_e, id) => {
    deletePlaylist(id);
    emitPlaylists();
  });
  h("pl:setTracks", (_e, id, trackIds) => {
    setPlaylistTracks(id, trackIds.filter((x) => x > 0));
    emitPlaylists();
  });
  h("pl:export", async (_e, id) => {
    const p = getPlaylist(id);
    if (!p || !win) return;
    const r = await electron.dialog.showSaveDialog(win, { title: "Export Playlist", defaultPath: `${p.name}.m3u8`, filters: [{ name: "M3U Playlist", extensions: ["m3u8", "m3u"] }] });
    if (r.canceled || !r.filePath) return;
    const all = allTracks();
    const tracks = resolvePlaylistTracks(p, all, allPlaylists());
    fs.writeFileSync(r.filePath, buildM3U(tracks.map((t) => ({ path: t.path, duration: t.duration, artist: t.artist, title: t.title }))));
  });
  h("pl:import", async () => {
    if (!win) return;
    const r = await electron.dialog.showOpenDialog(win, { title: "Import Playlist", properties: ["openFile"], filters: [{ name: "Playlists", extensions: ["m3u", "m3u8"] }] });
    if (r.canceled || !r.filePaths[0]) return;
    const file2 = r.filePaths[0];
    const entries = parseM3U(fs.readFileSync(file2, "utf8"), path.dirname(file2)).filter((p) => fs.existsSync(p));
    const map = /* @__PURE__ */ new Map();
    await importPaths(entries, { onTrack: (src, t) => map.set(src, t.id) });
    const ids = entries.map((e) => map.get(e)).filter((x) => !!x);
    createPlaylist(path.basename(file2).replace(/\.m3u8?$/i, ""), "normal", null, ids);
    emitPlaylists();
  });
  h("dev:list", () => listDevices());
  h("dev:tracks", (_e, id) => getDeviceTracks(id));
  h("dev:eject", (_e, id) => ejectDevice(id));
  h("dev:mount", (_e, id) => mountDevice(id));
  h("dev:rescan", (_e, id) => scanDevice(id));
  h("dev:import", (_e, ids) => {
    const paths = ids.map((i) => getDeviceTrack(i)?.path).filter((x) => !!x);
    return importPaths(paths, { label: "Importing from device" });
  });
  h("dev:delete", (_e, deviceId, ids) => deleteFromDevice(deviceId, ids));
  h("dev:copyTo", async (_e, deviceId, ids) => {
    const d = getDevice(deviceId);
    if (!d?.mountPath) return "Device is not mounted.";
    const profile = readProfile(deviceId);
    const errors = [];
    for (const t of getTracks(ids)) {
      const dest = path.join(d.mountPath, deviceRelPath(t, profile, false));
      try {
        if (fs.existsSync(dest)) continue;
        await fs.promises.mkdir(path.dirname(dest), { recursive: true });
        await fs.promises.copyFile(t.path, dest);
      } catch (e) {
        errors.push(`${t.title}: ${e.message}`);
      }
    }
    void scanDevice(deviceId);
    return errors.length ? errors.join("\n") : null;
  });
  h("dev:profile:get", (_e, id) => readProfile(id));
  h("dev:profile:set", (_e, id, p) => writeProfile(id, p));
  h("dev:sync", (_e, id, p) => {
    if (p) writeProfile(id, p);
    return syncDevice(id);
  });
  h("dev:sync:cancel", () => cancelSync());
  h("settings:get", () => getSettings());
  h("settings:set", (_e, patch) => updateSettings(patch));
  h("dialog:openFiles", async () => {
    if (!win) return [];
    const r = await electron.dialog.showOpenDialog(win, {
      title: "Add to Library",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Media", extensions: [...MEDIA_EXTS, "m3u", "m3u8"] }, { name: "All Files", extensions: ["*"] }]
    });
    return r.canceled ? [] : r.filePaths;
  });
  h("dialog:openFolder", async (_e, title) => {
    if (!win) return [];
    const r = await electron.dialog.showOpenDialog(win, { title: title ?? "Add Folder to Library", properties: ["openDirectory", "multiSelections", "createDirectory"] });
    return r.canceled ? [] : r.filePaths;
  });
  h("dialog:image", async () => {
    if (!win) return null;
    const r = await electron.dialog.showOpenDialog(win, { title: "Choose Artwork", properties: ["openFile"], filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png"] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    return fs.readFileSync(r.filePaths[0]).toString("base64");
  });
  h("dialog:message", async (_e, opts) => {
    if (!win) return { response: 0, checkboxChecked: false };
    return electron.dialog.showMessageBox(win, opts);
  });
  h("menu:context", (e, items) => {
    return new Promise((resolve) => {
      let done = false;
      const fin = (id) => {
        if (!done) {
          done = true;
          resolve(id);
        }
      };
      const menu = electron.Menu.buildFromTemplate(toMenu(items, fin));
      menu.popup({ window: electron.BrowserWindow.fromWebContents(e.sender) ?? void 0, callback: () => setTimeout(() => fin(null), 50) });
    });
  });
  h("app:openExternal", (_e, url) => /^https?:/.test(url) && electron.shell.openExternal(url));
}
function wireEvents() {
  libEvents.on("tracks", (d) => send("lib:delta", d));
  libEvents.on("playlists", (p) => send("pl:changed", p));
  libEvents.on("activity", (a) => send("activity", a));
  libEvents.on("message", (m) => send("message", m));
  deviceEvents.on("devices", (d) => send("dev:changed", d));
  deviceEvents.on("tracks", (d) => send("dev:tracks", d));
  settingsEvents.on("changed", (s, prev) => {
    send("settings", s);
    if (s.autoAddFolder !== prev.autoAddFolder || s.watchAutoAdd !== prev.watchAutoAdd) setupAutoAdd();
  });
  const autoSynced = /* @__PURE__ */ new Set();
  deviceEvents.on("devices", (list) => {
    for (const d of list) {
      if (!d.hasProfile || !d.mountPath || autoSynced.has(d.id)) continue;
      autoSynced.add(d.id);
      try {
        if (readProfile(d.id).autoSync) setTimeout(() => void syncDevice(d.id), 3e3);
      } catch {
      }
    }
    for (const id of autoSynced) if (!list.some((d) => d.id === id)) autoSynced.delete(id);
  });
}
function createDefaultPlaylists() {
  if (getSettings().defaultsCreated) return;
  if (allPlaylists().length === 0) {
    const base = (rules, limit, match = "all") => ({
      match,
      rules,
      limit: { enabled: !!limit, count: 25, unit: "items", selectBy: "random", ...limit },
      liveUpdating: true
    });
    const music = { field: "mediaKind", op: "is", value: "music" };
    createPlaylist("90's Music", "smart", base([music, { field: "year", op: "inRange", value: 1990, value2: 1999 }]), []);
    createPlaylist("Recently Added", "smart", base([{ field: "dateAdded", op: "inLast", value: 2, unit: "weeks" }]), []);
    createPlaylist("Recently Played", "smart", base([{ field: "lastPlayed", op: "inLast", value: 2, unit: "weeks" }]), []);
    createPlaylist("Top 25 Most Played", "smart", base([music, { field: "playCount", op: "gt", value: 0 }], { count: 25, selectBy: "mostPlayed" }), []);
    createPlaylist("My Top Rated", "smart", base([music, { field: "rating", op: "gt", value: 60 }]), []);
  }
  updateSettings({ defaultsCreated: true });
}
function filesFromArgv(argv) {
  const appPath = path.resolve(electron.app.getAppPath());
  // paladin-open: file managers hand over file:// links (the launcher entry uses %U)
  argv = argv.map((a) => {
    if (typeof a !== "string" || !a.startsWith("file://")) return a;
    try { return require("url").fileURLToPath(a); } catch { return a; }
  });
  return argv.slice(1).filter((a) => !a.startsWith("-") && fs.existsSync(a)).map((a) => path.resolve(a)).filter((a) => a !== appPath && a !== process.cwd() && a !== path.resolve(process.execPath) && !appPath.startsWith(a + path.sep));
}
// paladin-open: import what was opened, then play it in that order.
async function openAndPlay(files) {
  const ids = new Map();
  await importPaths(files, { label: "Adding", onTrack: (src, t) => { if (t && !ids.has(src)) ids.set(src, t.id); } });
  const order = [];
  for (const f of files) {
    if (ids.has(f)) order.push(ids.get(f));
    else for (const [src, id] of ids) if (src.startsWith(f + path.sep) && !order.includes(id)) order.push(id);   // a folder was opened
  }
  for (const [, id] of ids) if (!order.includes(id)) order.push(id);
  if (!order.length) return;
  const go = () => setTimeout(() => send("menu", "paladin-play:" + order.join(",")), 300);
  if (win && !win.isDestroyed() && win.webContents.isLoading()) win.webContents.once("did-finish-load", () => setTimeout(go, 1200));
  else go();
}
if (!electron.app.requestSingleInstanceLock()) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", (_e, argv) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    const files = filesFromArgv(argv);
    if (files.length) void openAndPlay(files);
  });
  electron.app.whenReady().then(() => {
    openDb();
    createDefaultPlaylists();
    fs.mkdirSync(mediaRoot(), { recursive: true });
    registerProtocol(resolveAnyTrack);
    registerIpc();
    wireEvents();
    buildMenu();
    createWindow();
    startDeviceMonitor();
    setupAutoAdd();
    pruneTranscodeCache();
    const files = filesFromArgv(process.argv);
    if (files.length) void openAndPlay(files);
    electron.app.on("activate", () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  electron.app.on("window-all-closed", () => electron.app.quit());
  electron.app.on("before-quit", () => {
    flushSettings();
    killAllStreams();
    stopDeviceMonitor();
  });
}

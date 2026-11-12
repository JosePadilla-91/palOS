'use strict';
// MIME type detection (shared-mime-info globs), descriptions ("PNG image") and icon names.
const fs = require('fs');
const path = require('path');
const { readText, dataDirs } = require('./util');

const MIME_DIRS = dataDirs().map((d) => path.join(d, 'mime')).filter((d) => fs.existsSync(d));

let ext = null, ext_cs = null, literal = null, patterns = null, generic = null, aliases = null, parents = null, comments = null;

function load() {
  ext = new Map(); ext_cs = new Map(); literal = new Map(); patterns = []; generic = new Map(); aliases = new Map(); parents = new Map();
  for (const dir of [...MIME_DIRS].reverse()) {         // later (higher priority) dirs override
    for (const line of readText(path.join(dir, 'globs2')).split('\n')) {
      if (!line || line[0] === '#') continue;
      const [w, mime, glob, flags = ''] = line.split(':');
      const weight = +w || 50;
      const cs = flags.includes('cs');
      const m = glob && glob.match(/^\*\.([^*?[\]]+)$/);
      if (m) {
        const map = cs ? ext_cs : ext; const key = cs ? m[1] : m[1].toLowerCase();
        const cur = map.get(key);
        if (!cur || cur.weight < weight) map.set(key, { mime, weight });
      } else if (glob && !/[*?[]/.test(glob)) literal.set(glob, mime);
      else if (glob) {
        const re = new RegExp('^' + glob.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', cs ? '' : 'i');
        patterns.push({ re, mime, weight });
      }
    }
    for (const line of readText(path.join(dir, 'generic-icons')).split('\n')) {
      const [mime, icon] = line.split(':'); if (mime && icon) generic.set(mime, icon);
    }
    for (const line of readText(path.join(dir, 'aliases')).split('\n')) {
      const [a, b] = line.split(' '); if (a && b) aliases.set(a, b);
    }
    for (const line of readText(path.join(dir, 'subclasses')).split('\n')) {
      const [a, b] = line.split(' '); if (a && b) { const l = parents.get(a) || []; l.push(b); parents.set(a, l); }
    }
  }
  patterns.sort((a, b) => b.weight - a.weight);
}

function loadComments() {
  comments = new Map();
  for (const dir of MIME_DIRS) {
    let files = [];
    try { files = fs.readdirSync(path.join(dir, 'packages')).filter((f) => f.endsWith('.xml')); } catch {}
    for (const f of files) {
      const xml = readText(path.join(dir, 'packages', f));
      const re = /<mime-type\s+type="([^"]+)"[^>]*>([\s\S]*?)<\/mime-type>/g; let m;
      while ((m = re.exec(xml))) {
        const c = m[2].match(/<comment>([^<]*)<\/comment>/);
        if (c && !comments.has(m[1])) comments.set(m[1], c[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&quot;/g, '"'));
      }
    }
  }
}

/** Guess a MIME type from a file name; optionally sniff content for extension-less files. */
function fromName(name) {
  if (!ext) load();
  if (literal.has(name)) return literal.get(name);
  // longest extension first: archive.tar.gz -> tar.gz -> gz
  const parts = name.split('.');
  for (let i = 1; i < parts.length; i++) {
    const e = parts.slice(i).join('.');
    if (ext_cs.has(e)) return ext_cs.get(e).mime;
    const hit = ext.get(e.toLowerCase());
    if (hit) return hit.mime;
  }
  for (const p of patterns) if (p.re.test(name)) return p.mime;
  return null;
}

function sniff(file) {
  try {
    const fd = fs.openSync(file, 'r'); const buf = Buffer.alloc(512);
    const n = fs.readSync(fd, buf, 0, 512, 0); fs.closeSync(fd);
    if (n === 0) return 'text/plain';
    const b = buf.subarray(0, n);
    if (b[0] === 0x7f && b.toString('latin1', 1, 4) === 'ELF') return 'application/x-executable';
    if (b.toString('latin1', 0, 2) === '#!') return 'application/x-shellscript';
    if (b.toString('latin1', 0, 4) === '%PDF') return 'application/pdf';
    if (b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return 'image/png';
    if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
    if (b.includes(0)) return 'application/octet-stream';
    return 'text/plain';
  } catch { return 'application/octet-stream'; }
}

function detect(file, name, st) {
  let m = fromName(name || path.basename(file));
  if (!m && st && st.isFile() && st.size < 64 * 1024 * 1024) m = sniff(file);
  if (!m) m = 'application/octet-stream';
  return aliases && aliases.has(m) ? aliases.get(m) : m;
}

function describe(mime) {
  if (!comments) loadComments();
  if (mime === 'inode/directory') return 'Folder';
  if (mime === 'application/x-desktop') return 'Application';
  if (mime === 'application/x-executable' || mime === 'application/x-sharedlib') return 'Unix Executable File';
  const c = comments.get(mime);
  if (c) return c.charAt(0).toUpperCase() + c.slice(1);
  return 'Document';
}

function iconNames(mime) {
  if (!ext) load();
  const [major] = mime.split('/');
  const names = [mime.replace('/', '-')];
  if (generic.has(mime)) names.push(generic.get(mime));
  for (const p of parents.get(mime) || []) { names.push(p.replace('/', '-')); if (generic.has(p)) names.push(generic.get(p)); }
  names.push(`${major}-x-generic`);
  if (major === 'text') names.push('text-plain');
  names.push('unknown', 'text-x-generic', 'application-octet-stream');
  return names;
}

/** True if mime is (a subclass of) the given type. */
function isA(mime, base) {
  if (!ext) load();
  if (mime === base) return true;
  if (base === 'text/plain' && mime.startsWith('text/')) return true;
  const seen = new Set([mime]); const q = [mime];
  while (q.length) {
    const m = q.shift();
    for (const p of parents.get(m) || []) { if (p === base) return true; if (!seen.has(p)) { seen.add(p); q.push(p); } }
  }
  return false;
}

function parentsOf(mime) {
  if (!ext) load();
  const out = []; const q = [mime]; const seen = new Set([mime]);
  while (q.length) { const m = q.shift(); for (const p of parents.get(m) || []) if (!seen.has(p)) { seen.add(p); out.push(p); q.push(p); } }
  if (mime.startsWith('text/') && !out.includes('text/plain') && mime !== 'text/plain') out.push('text/plain');
  return out;
}

module.exports = { detect, fromName, describe, iconNames, isA, parentsOf };

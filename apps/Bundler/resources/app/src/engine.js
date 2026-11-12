'use strict';
// Bundler engine. Walang Electron dito, para matest sa plain node.

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const yauzl = require('yauzl');
const yazl = require('yazl');

const JUNK = new Set(['__MACOSX', '.DS_Store']);
const TAR_SUFFIXES = ['.tar.gz', '.tgz', '.tar.xz', '.txz', '.tar.bz2', '.tbz2', '.tar'];
const ALL_SUFFIXES = ['.zip', ...TAR_SUFFIXES];
const OUT_EXT = { zip: '.zip', gz: '.tar.gz', xz: '.tar.xz', bz2: '.tar.bz2' };

class BundlerError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function archiveKind(file) {
  const l = file.toLowerCase();
  if (l.endsWith('.zip')) return 'zip';
  if (TAR_SUFFIXES.some((s) => l.endsWith(s))) return 'tar';
  return null;
}

function baseName(file) {
  const n = path.basename(file);
  const l = n.toLowerCase();
  for (const s of ALL_SUFFIXES.slice().sort((a, b) => b.length - a.length)) {
    if (l.endsWith(s)) return n.slice(0, n.length - s.length) || 'Archive';
  }
  return n;
}

async function exists(p) {
  try { await fsp.lstat(p); return true; } catch { return false; }
}

// "Project", "Project 2", "Project 3"... para walang nao-overwrite
async function uniquePath(dir, name, ext = '') {
  let candidate = path.join(dir, name + ext);
  for (let i = 2; await exists(candidate); i++) candidate = path.join(dir, `${name} ${i}${ext}`);
  return candidate;
}

function isJunkSegment(seg) { return JUNK.has(seg); }

function insideDir(root, target) {
  return target === root || target.startsWith(root + path.sep);
}

function makeThrottle(fn, ms = 80) {
  let last = 0;
  return (data, force) => {
    const now = Date.now();
    if (force || now - last >= ms) { last = now; fn(data); }
  };
}

function checkAbort(signal) {
  if (signal && signal.aborted) throw new BundlerError('CANCELLED', 'Cancelled');
}

/* ---------------------------------------------------------------- zip read */

function openZip(file) {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true, autoClose: true, validateEntrySizes: true }, (err, zf) => {
      if (err) reject(new BundlerError('BAD_ARCHIVE', 'This does not look like a valid zip file.'));
      else resolve(zf);
    });
  });
}

function nextEntry(zf) {
  return new Promise((resolve, reject) => {
    const cleanup = () => { zf.off('entry', onEntry); zf.off('end', onEnd); zf.off('error', onErr); };
    const onEntry = (e) => { cleanup(); resolve(e); };
    const onEnd = () => { cleanup(); resolve(null); };
    const onErr = (e) => {
      cleanup();
      if (/invalid relative path|absolute path/.test(e.message)) {
        reject(new BundlerError('UNSAFE', 'This archive contains a path that points outside its folder. Extraction was stopped.'));
      } else reject(new BundlerError('BAD_ARCHIVE', 'This zip is damaged or incomplete.'));
    };
    zf.once('entry', onEntry); zf.once('end', onEnd); zf.once('error', onErr);
    zf.readEntry();
  });
}

function openEntryStream(zf, entry) {
  return new Promise((resolve, reject) => {
    zf.openReadStream(entry, (err, rs) => (err ? reject(err) : resolve(rs)));
  });
}

async function readAll(stream, limit = 1 << 16) {
  const chunks = [];
  let n = 0;
  for await (const c of stream) {
    n += c.length;
    if (n > limit) throw new BundlerError('BAD_ARCHIVE', 'Unexpected oversized link entry.');
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function scanZip(file) {
  const zf = await openZip(file);
  let bytes = 0; let count = 0; let encrypted = false;
  try {
    for (;;) {
      const e = await nextEntry(zf);
      if (!e) break;
      count++;
      bytes += e.uncompressedSize;
      if (e.generalPurposeBitFlag & 0x1) encrypted = true;
    }
  } finally { zf.close(); }
  return { bytes, count, encrypted };
}

async function extractZip(file, dest, { onProgress, signal }) {
  const scan = await scanZip(file);
  if (scan.encrypted) {
    throw new BundlerError('ENCRYPTED', 'This zip is password-protected. Bundler cannot open protected zips yet.');
  }
  const realDest = await fsp.realpath(dest);
  const rootResolved = path.resolve(dest);
  const emit = makeThrottle(onProgress);
  let done = 0; let items = 0; let skipped = 0;

  const zf = await openZip(file);
  const onAbort = () => zf.close();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });

  try {
    for (;;) {
      checkAbort(signal);
      const entry = await nextEntry(zf);
      if (!entry) break;
      items++;
      const name = entry.fileName;
      const segs = name.split('/').filter(Boolean);
      if (segs.some(isJunkSegment)) { done += entry.uncompressedSize; continue; }

      const target = path.resolve(dest, name);
      if (!insideDir(rootResolved, target)) {
        throw new BundlerError('UNSAFE', 'This archive contains a path that points outside its folder. Extraction was stopped.');
      }

      const isDir = name.endsWith('/');
      const unix = (entry.versionMadeBy >> 8) === 3;
      const mode = unix ? (entry.externalFileAttributes >>> 16) & 0xffff : 0;
      const ftype = mode & 0o170000;

      if (isDir) {
        await fsp.mkdir(target, { recursive: true });
        continue;
      }

      await fsp.mkdir(path.dirname(target), { recursive: true });
      // symlink sa loob ng folder pwedeng dumaan palabas, kaya check ng realpath
      const realParent = await fsp.realpath(path.dirname(target));
      if (!insideDir(realDest, realParent)) {
        throw new BundlerError('UNSAFE', 'This archive tries to write outside its folder. Extraction was stopped.');
      }

      const rs = await openEntryStream(zf, entry);

      if (ftype === 0o120000) {
        const linkTarget = await readAll(rs);
        const resolved = path.resolve(path.dirname(target), linkTarget);
        if (path.isAbsolute(linkTarget) || !insideDir(rootResolved, resolved)) { skipped++; continue; }
        await fsp.symlink(linkTarget, target);
        continue;
      }

      const perm = unix && mode ? (mode & 0o777) | 0o600 : 0o644;
      const ws = fs.createWriteStream(target, { mode: perm });
      rs.on('data', (chunk) => {
        done += chunk.length;
        emit({ ratio: scan.bytes ? done / scan.bytes : items / scan.count, file: name, items, totalItems: scan.count });
      });
      await pipeline(rs, ws, signal ? { signal } : {});
      try { const d = entry.getLastModDate(); await fsp.utimes(target, d, d); } catch { /* ok lang */ }
    }
  } catch (err) {
    if (signal && signal.aborted) throw new BundlerError('CANCELLED', 'Cancelled');
    throw err;
  } finally {
    if (signal) signal.removeEventListener('abort', onAbort);
    zf.close();
  }
  emit({ ratio: 1, file: '', items: scan.count, totalItems: scan.count }, true);
  return { skipped };
}

/* ---------------------------------------------------------------- tar */

function runTar(args, { signal, onLine }) {
  return new Promise((resolve, reject) => {
    const p = spawn('tar', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = ''; let buf = '';
    const onAbort = () => p.kill('SIGTERM');
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { onLine && onLine(buf.slice(0, i)); buf = buf.slice(i + 1); }
    });
    p.stderr.on('data', (d) => { if (err.length < 4000) err += d; });
    p.on('error', (e) => reject(new BundlerError('NO_TAR', e.code === 'ENOENT' ? 'The tar tool is missing on this system.' : e.message)));
    p.on('close', (code) => {
      if (signal) signal.removeEventListener('abort', onAbort);
      if (signal && signal.aborted) return reject(new BundlerError('CANCELLED', 'Cancelled'));
      if (code === 0) return resolve();
      reject(new BundlerError('TAR_FAILED', err.trim().split('\n')[0] || `tar exited with code ${code}`));
    });
  });
}

async function extractTar(file, dest, { onProgress, signal }) {
  let total = 0;
  await runTar(['-tf', file], { signal, onLine: () => { total++; } });
  const emit = makeThrottle(onProgress);
  let items = 0;
  await runTar(
    ['-xvf', file, '-C', dest, '--no-same-owner', '--exclude=__MACOSX', '--exclude=.DS_Store'],
    { signal, onLine: (line) => { items++; emit({ ratio: total ? items / total : 0, file: line, items, totalItems: total }); } }
  );
  emit({ ratio: 1, file: '', items: total, totalItems: total }, true);
  return { skipped: 0 };
}

/* ---------------------------------------------------------------- extract */

async function removeJunkTopLevel(dir) {
  for (const n of await fsp.readdir(dir)) {
    if (isJunkSegment(n)) await fsp.rm(path.join(dir, n), { recursive: true, force: true });
  }
}

/**
 * Default action: Project.zip -> folder "Project" katabi ng zip.
 * Kung ang laman ng zip ay iisang folder na "Project" din, wag nang doblehin (Project/Project).
 */
async function extract(file, opts = {}) {
  const { destParent = path.dirname(file), onProgress = () => {}, signal, collapseSameName = true } = opts;
  const kind = archiveKind(file);
  if (!kind) throw new BundlerError('UNSUPPORTED', 'Bundler cannot open this kind of file.');
  const base = baseName(file);

  let tmp;
  try {
    tmp = await fsp.mkdtemp(path.join(destParent, `.${base.slice(0, 40)}.bundler-`));
  } catch (e) {
    throw new BundlerError('NO_WRITE', `Cannot write to ${destParent}. Check that you have permission.`);
  }

  try {
    const info = kind === 'zip'
      ? await extractZip(file, tmp, { onProgress, signal })
      : await extractTar(file, tmp, { onProgress, signal });
    checkAbort(signal);

    await removeJunkTopLevel(tmp);
    const entries = await fsp.readdir(tmp);
    let source = tmp;
    let collapsed = false;
    if (collapseSameName && entries.length === 1 && entries[0] === base) {
      const st = await fsp.lstat(path.join(tmp, base));
      if (st.isDirectory()) { source = path.join(tmp, base); collapsed = true; }
    }

    let finalPath;
    for (let attempt = 0; ; attempt++) {
      finalPath = await uniquePath(destParent, base);
      try { await fsp.rename(source, finalPath); break; } catch (e) {
        if (attempt < 5 && (e.code === 'EEXIST' || e.code === 'ENOTEMPTY')) continue;
        throw e;
      }
    }
    if (collapsed) await fsp.rm(tmp, { recursive: true, force: true });
    return { path: finalPath, skipped: info.skipped, itemCount: entries.length };
  } catch (err) {
    await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
    if (err.code === 'ENOSPC') throw new BundlerError('NO_SPACE', 'The disk is full. Free some space and try again.');
    throw err;
  }
}

/* ---------------------------------------------------------------- compress */

async function walk(paths) {
  const items = []; let bytes = 0;
  async function visit(abs, rel) {
    const st = await fsp.lstat(abs);
    if (isJunkSegment(path.basename(abs))) return;
    if (st.isDirectory()) {
      items.push({ abs, rel, st, type: 'dir' });
      const kids = (await fsp.readdir(abs)).sort();
      for (const k of kids) await visit(path.join(abs, k), `${rel}/${k}`);
    } else if (st.isSymbolicLink()) {
      items.push({ abs, rel, st, type: 'link' });
    } else if (st.isFile()) {
      items.push({ abs, rel, st, type: 'file' });
      bytes += st.size;
    } // sockets, devices etc: skip
  }
  for (const p of paths) await visit(path.resolve(p), path.basename(path.resolve(p)));
  return { items, bytes };
}

async function defaultOutPath(paths, format) {
  const first = path.resolve(paths[0]);
  const dir = path.dirname(first);
  let name = paths.length === 1 ? path.basename(first) : 'Archive';
  if (paths.length === 1) {
    const st = await fsp.lstat(first);
    if (st.isFile()) { const ext = path.extname(name); if (ext && ext !== name) name = name.slice(0, -ext.length); }
  }
  return uniquePath(dir, name, OUT_EXT[format]);
}

async function compressZip(walked, tmpOut, { onProgress, signal }) {
  const emit = makeThrottle(onProgress);
  const zf = new yazl.ZipFile();
  const out = fs.createWriteStream(tmpOut);
  let done = 0; let n = 0;
  const finished = pipeline(zf.outputStream, out, signal ? { signal } : {});
  finished.catch(() => {});

  for (const it of walked.items) {
    const mtime = it.st.mtime;
    if (it.type === 'dir') {
      zf.addEmptyDirectory(it.rel, { mtime, mode: it.st.mode & 0xffff });
    } else if (it.type === 'link') {
      const target = await fsp.readlink(it.abs);
      zf.addBuffer(Buffer.from(target), it.rel, { mtime, mode: it.st.mode & 0xffff, compress: false });
    } else {
      zf.addReadStreamLazy(it.rel, { mtime, mode: it.st.mode & 0xffff }, (cb) => {
        const rs = fs.createReadStream(it.abs);
        rs.on('data', (c) => {
          done += c.length;
          emit({ ratio: walked.bytes ? done / walked.bytes : n / walked.items.length, file: it.rel, items: n, totalItems: walked.items.length });
        });
        rs.on('end', () => { n++; });
        cb(null, rs);
      });
    }
  }
  zf.end();
  await finished;
  emit({ ratio: 1, file: '', items: walked.items.length, totalItems: walked.items.length }, true);
}

async function compressTar(paths, walked, tmpOut, format, { onProgress, signal }) {
  const flag = { gz: '-z', xz: '-J', bz2: '-j' }[format];
  const args = ['-c', ...(flag ? [flag] : []), '-v', '-f', tmpOut, '--exclude=__MACOSX', '--exclude=.DS_Store'];
  for (const p of paths) {
    const abs = path.resolve(p);
    args.push('-C', path.dirname(abs), path.basename(abs));
  }
  const emit = makeThrottle(onProgress);
  let n = 0;
  await runTar(args, {
    signal,
    onLine: (line) => { n++; emit({ ratio: walked.items.length ? Math.min(n / walked.items.length, 0.99) : 0, file: line, items: n, totalItems: walked.items.length }); },
  });
  emit({ ratio: 1, file: '', items: walked.items.length, totalItems: walked.items.length }, true);
}

async function compress(paths, opts = {}) {
  const { format = 'zip', onProgress = () => {}, signal } = opts;
  if (!OUT_EXT[format]) throw new BundlerError('UNSUPPORTED', `Unknown format: ${format}`);
  if (!paths.length) throw new BundlerError('EMPTY', 'Nothing to bundle.');
  const walked = await walk(paths);
  const outPath = opts.outPath || (await defaultOutPath(paths, format));
  const finalOut = (await exists(outPath)) ? await uniquePath(path.dirname(outPath), path.basename(outPath, OUT_EXT[format]), OUT_EXT[format]) : outPath;
  const tmpOut = path.join(path.dirname(finalOut), `.${path.basename(finalOut)}.bundler-part`);

  try {
    if (format === 'zip') await compressZip(walked, tmpOut, { onProgress, signal });
    else await compressTar(paths, walked, tmpOut, format, { onProgress, signal });
    checkAbort(signal);
    await fsp.rename(tmpOut, finalOut);
    return { path: finalOut, itemCount: walked.items.length };
  } catch (err) {
    await fsp.rm(tmpOut, { force: true }).catch(() => {});
    if (signal && signal.aborted) throw new BundlerError('CANCELLED', 'Cancelled');
    if (err.code === 'ENOSPC') throw new BundlerError('NO_SPACE', 'The disk is full. Free some space and try again.');
    if (err.code === 'EACCES') throw new BundlerError('NO_WRITE', 'Cannot write here. Check that you have permission.');
    throw err;
  }
}

module.exports = { extract, compress, archiveKind, baseName, BundlerError, ALL_SUFFIXES };

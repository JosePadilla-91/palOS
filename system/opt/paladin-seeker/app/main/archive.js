'use strict';
// Archives: Extract Here and Compress, the way every other desktop does it.
//
// Extract Here unpacks into a hidden scratch folder next to the archive, then:
//   - one item at the top of the archive (a folder or a file): that item is put next to the archive
//   - several items: they go into a new folder named after the archive ("Photos.zip" -> "Photos")
// Names already taken get a number ("Photos 2"). Nothing is overwritten. If anything fails, the
// scratch folder is removed and nothing is left behind.
//
// Tools: bsdtar (libarchive) for zip, 7z, rar, tar.*, iso, cab, cpio, xar, lha...; 7-Zip for anything
// bsdtar can't read and for password-protected archives; gzip/bzip2/xz/zstd/lz4/lzip for a single
// compressed file.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { spawn } = require('child_process');

const which = (b) => ['/usr/bin', '/bin', '/usr/local/bin'].map((d) => path.join(d, b)).find((p) => fs.existsSync(p)) || null;

// multi-file archive extensions (longest first so .tar.gz wins over .gz)
const ARCHIVE_EXT = [
  '.tar.gz', '.tar.bz2', '.tar.xz', '.tar.zst', '.tar.zstd', '.tar.lz', '.tar.lz4', '.tar.lzma', '.tar.z',
  '.tgz', '.tbz', '.tbz2', '.txz', '.tzst', '.tlz', '.taz',
  '.zip', '.zipx', '.jar', '.war', '.ear', '.apk', '.xpi', '.cbz', '.cbr', '.cb7', '.cbt', '.epub',
  '.7z', '.rar', '.tar', '.iso', '.cab', '.cpio', '.xar', '.lha', '.lzh', '.arj', '.ar', '.a', '.wim', '.sit', '.sitx',
];
// single compressed files: extension -> [command, args to write the result to stdout]
const SINGLE = {
  '.gz': ['gzip', ['-dc']], '.bz2': ['bzip2', ['-dc']], '.xz': ['xz', ['-dc']], '.lzma': ['xz', ['-dc', '--format=lzma']],
  '.zst': ['zstd', ['-dcq']], '.zstd': ['zstd', ['-dcq']], '.lz4': ['lz4', ['-dc']], '.lz': ['lzip', ['-dc']], '.z': ['gzip', ['-dc']],
};
const ARCHIVE_MIME = new Set([
  'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed', 'application/vnd.rar', 'application/x-rar',
  'application/x-rar-compressed', 'application/x-tar', 'application/x-compressed-tar', 'application/x-bzip-compressed-tar',
  'application/x-bzip2-compressed-tar', 'application/x-xz-compressed-tar', 'application/x-zstd-compressed-tar',
  'application/x-lzip-compressed-tar', 'application/x-lz4-compressed-tar', 'application/x-lzma-compressed-tar',
  'application/x-tarz', 'application/vnd.ms-cab-compressed', 'application/x-cpio', 'application/x-xar',
  'application/x-lha', 'application/x-lzh-compressed', 'application/x-arj', 'application/x-archive', 'application/java-archive',
  'application/vnd.android.package-archive', 'application/x-cbz', 'application/vnd.comicbook+zip', 'application/x-cbr',
  'application/vnd.comicbook-rar', 'application/x-cb7', 'application/x-stuffit', 'application/x-stuffitx',
  'application/gzip', 'application/x-gzip', 'application/x-bzip', 'application/x-bzip2', 'application/x-xz', 'application/zstd',
  'application/x-zstd', 'application/x-lz4', 'application/x-lzip', 'application/x-lzma', 'application/x-compress',
]);

function kindOf(name) {
  const n = name.toLowerCase();
  const multi = ARCHIVE_EXT.find((e) => n.endsWith(e) && n.length > e.length);
  if (multi) return { type: 'archive', ext: multi };
  const single = Object.keys(SINGLE).find((e) => n.endsWith(e) && n.length > e.length);
  if (single) return { type: 'single', ext: single };
  return null;
}

/** Can Extract Here handle this file? (by name, or by detected type for files without a telling name) */
function canExtract(name, mimeType) {
  if (/\.deb$/i.test(name)) return true;   // palOS doesn't install .deb packages: opening one shows the files inside, as a folder
  if (/\.(rpm|appimage|snap|flatpak|docx|xlsx|pptx|odt|ods|odp|odg)$/i.test(name)) return false; // documents and installers open normally
  if (name.toLowerCase().endsWith('.epub')) return false;
  return !!kindOf(name) || ARCHIVE_MIME.has(mimeType || '');
}

function baseName(name) {
  const k = kindOf(name);
  if (k) return name.slice(0, name.length - k.ext.length) || name;
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

function numbered(dir, name) {
  if (!fs.existsSync(path.join(dir, name))) return name;
  const dot = name.lastIndexOf('.');
  const isFile = dot > 0 && !name.endsWith('.');
  const [b, e] = isFile ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let i = 2; i < 10000; i++) {
    const n = `${b} ${i}${e}`;
    if (!fs.existsSync(path.join(dir, n))) return n;
  }
  return `${b} ${Date.now()}${e}`;
}

function run(cmd, args, { cwd, stdoutFile, signal } = {}) {
  return new Promise((resolve) => {
    const bin = which(cmd);
    if (!bin) return resolve({ code: 127, err: `${cmd} is not installed` });
    let written = Promise.resolve();
    const p = spawn(bin, args, { cwd, stdio: ['ignore', stdoutFile ? 'pipe' : 'ignore', 'pipe'], env: { ...process.env, LC_ALL: 'C.UTF-8' } });
    if (stdoutFile) {
      const out = fs.createWriteStream(stdoutFile);
      written = new Promise((res) => { out.on('close', res); out.on('error', res); });
      p.stdout.pipe(out);
    }
    let err = '';
    p.stderr.on('data', (d) => { if (err.length < 20000) err += d; });
    if (signal) signal.onCancel = () => { try { p.kill('SIGTERM'); } catch {} };
    p.on('error', (e) => resolve({ code: 127, err: String(e.message) }));
    p.on('close', (code) => { written.then(() => resolve({ code, err })); });
  });
}

const PASSWORD_HINT = /passphrase|password|encrypt/i;
// 7-Zip, never waiting for a password on its input: "-p " means "no password" (an encrypted archive then
// fails with "Wrong password", which asks the person)
const sevenZip = (file, scratch, pw, signal) => run('7z', ['x', '-y', '-bso0', '-bsp0', '-o' + scratch, '-p' + (pw == null ? ' ' : pw), '--', file], { signal });

/**
 * Extract one archive next to itself.
 * askPassword(name, retry) -> string|null ; returns { path } of the extracted item or { error } / { cancelled }
 */
async function extractHere(file, { askPassword, signal } = {}) {
  const dir = path.dirname(file);
  const name = path.basename(file);
  try { await fsp.access(dir, fs.constants.W_OK); } catch { return { error: `You don’t have permission to put files in “${path.basename(dir) || '/'}”.` }; }
  const scratch = await fsp.mkdtemp(path.join(dir, '.seeker-extract-'));
  const cleanup = () => fsp.rm(scratch, { recursive: true, force: true }).catch(() => {});
  try {
    const k = kindOf(name);
    const deb = /\.deb$/i.test(name);
    let r;
    if (deb) {
      // the files the package would have put on the computer (dpkg-deb reads every .deb compression)
      r = await run('dpkg-deb', ['-x', file, scratch], { signal });
      if (r.code !== 0) { await emptyDir(scratch); r = await run('bsdtar', ['-x', '-f', file, '-C', scratch, '--no-same-owner'], { signal }); }
    } else if (k && k.type === 'single') {
      const [cmd, args] = SINGLE[k.ext];
      r = await run(cmd, [...args, file], { stdoutFile: path.join(scratch, baseName(name)), signal });
      if (r.code !== 0) { await emptyDir(scratch); r = await sevenZip(file, scratch, null, signal); }
    } else {
      r = await run('bsdtar', ['-x', '-f', file, '-C', scratch, '--no-same-owner'], { signal });
      if (r.code !== 0 && !PASSWORD_HINT.test(r.err)) {
        await emptyDir(scratch);
        r = await sevenZip(file, scratch, null, signal);
      }
      let retry = false;
      while (r.code !== 0 && PASSWORD_HINT.test(r.err)) {
        const pw = askPassword ? await askPassword(name, retry) : null;
        if (pw == null) { await cleanup(); return { cancelled: true }; }
        await emptyDir(scratch);
        r = await sevenZip(file, scratch, pw, signal);
        retry = true;
      }
    }
    if (signal && signal.cancelled) { await cleanup(); return { cancelled: true }; }
    if (r.code !== 0) {
      await cleanup();
      const detail = r.err.trim().split('\n').filter(Boolean).slice(-3).join('\n');
      return { error: `“${name}” couldn’t be extracted.`, detail: /not installed/.test(r.err) ? r.err : (detail || 'The archive may be damaged or in a format palOS can’t open.') };
    }
    // make sure everything extracted is usable by its owner (some archives store odd permissions)
    await fixPerms(scratch);
    const top = (await fsp.readdir(scratch)).filter((n) => n !== '__MACOSX' && n !== '.DS_Store');
    for (const junk of ['__MACOSX', '.DS_Store']) await fsp.rm(path.join(scratch, junk), { recursive: true, force: true });
    if (!top.length) { await cleanup(); return { error: `“${name}” is empty.` }; }
    let result;
    if (top.length === 1 && !deb) {
      const target = path.join(dir, numbered(dir, top[0]));
      await fsp.rename(path.join(scratch, top[0]), target);
      result = target;
      await cleanup();
    } else {
      const target = path.join(dir, numbered(dir, deb ? name.replace(/\.deb$/i, '') : baseName(name)));
      await fsp.rename(scratch, target);
      await fsp.chmod(target, 0o777 & ~process.umask()).catch(() => {}); // the scratch folder was private
      result = target;
    }
    return deb ? { path: result, deb: true } : { path: result };
  } catch (e) {
    await cleanup();
    return { error: `“${name}” couldn’t be extracted.`, detail: e.message };
  }
}

async function emptyDir(d) {
  for (const n of await fsp.readdir(d).catch(() => [])) await fsp.rm(path.join(d, n), { recursive: true, force: true });
}

async function fixPerms(root) {
  const walk = async (p) => {
    let st; try { st = await fsp.lstat(p); } catch { return; }
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) {
      if ((st.mode & 0o700) !== 0o700) await fsp.chmod(p, st.mode | 0o700).catch(() => {});
      for (const n of await fsp.readdir(p).catch(() => [])) await walk(path.join(p, n));
    } else if ((st.mode & 0o600) !== 0o600) await fsp.chmod(p, st.mode | 0o600).catch(() => {});
  };
  await walk(root);
}

/** Compress items into a .zip next to them: one item -> "Name.zip", several -> "Archive.zip". */
async function compress(paths) {
  if (!paths.length) return { error: 'Nothing to compress.' };
  const dir = path.dirname(paths[0]);
  if (paths.some((p) => path.dirname(p) !== dir)) return { error: 'Items to compress must be in the same folder.' };
  try { await fsp.access(dir, fs.constants.W_OK); } catch { return { error: `You don’t have permission to put files in “${path.basename(dir) || '/'}”.` }; }
  const first = path.basename(paths[0]);
  const want = paths.length === 1 ? `${first}.zip` : 'Archive.zip';
  const outName = numbered(dir, want);
  const tmp = path.join(dir, `.${outName}.part`);
  const r = await run('bsdtar', ['--format', 'zip', '-c', '-f', tmp, '-C', dir, '--', ...paths.map((p) => path.basename(p))]);
  if (r.code !== 0) {
    await fsp.rm(tmp, { force: true }).catch(() => {});
    return { error: `The items couldn’t be compressed.`, detail: r.err.trim().split('\n').slice(-3).join('\n') };
  }
  const out = path.join(dir, outName);
  await fsp.rename(tmp, out);
  return { path: out };
}

module.exports = { canExtract, extractHere, compress, baseName, kindOf };

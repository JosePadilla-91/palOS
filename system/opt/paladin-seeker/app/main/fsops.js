'use strict';
// File system: listing, file operations, freedesktop Trash, Get Info, search.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { HOME, readText, userDirs, limiter } = require('./util');
const mime = require('./mime');
const apps = require('./apps');
const config = require('./config');

// an archive's icon says what kind it is across its lower half ("ZIP", "RAR", "TGZ")
const BADGES = [[/\.(tar\.gz|tgz)$/i, 'TGZ'], [/\.(tar\.xz|txz)$/i, 'TXZ'], [/\.(tar\.bz2|tbz2?)$/i, 'TBZ'], [/\.(tar\.zst|tzst)$/i, 'TZST'],
  [/\.zipx?$/i, 'ZIP'], [/\.7z$/i, '7Z'], [/\.rar$/i, 'RAR'], [/\.tar$/i, 'TAR'], [/\.gz$/i, 'GZ'], [/\.xz$/i, 'XZ'], [/\.bz2$/i, 'BZ2'],
  [/\.zstd?$/i, 'ZST'], [/\.lzma$/i, 'LZMA'], [/\.lz4?$/i, 'LZ'], [/\.cab$/i, 'CAB'], [/\.jar$/i, 'JAR'], [/\.apk$/i, 'APK'],
  [/\.cb([zr7t])$/i, null], [/\.(lha|lzh)$/i, 'LHA'], [/\.arj$/i, 'ARJ'], [/\.cpio$/i, 'CPIO'], [/\.xar$/i, 'XAR'], [/\.sitx?$/i, 'SIT']];
function archiveBadge(name) {
  for (const [re, label] of BADGES) { const m = re.exec(name); if (m) return label || ('CB' + m[1].toUpperCase()); }
  return null;
}

const UID = process.getuid ? process.getuid() : 1000;
// The Utilities folder: a real folder of links to the utility apps, so it can go in the Dock or on the
// desktop like any folder. It always opens as the Utilities view, and it can never be thrown away.
const UTILITIES = path.join(process.env.XDG_DATA_HOME || path.join(HOME, '.local/share'), 'palos', 'Utilities');
function isUtilities(p) {
  if (!p) return false;
  if (p === 'seeker:apps/Utilities') return true;
  try { return fs.realpathSync(p) === fs.realpathSync(UTILITIES); } catch { return false; }
}
const HOME_TRASH = path.join(process.env.XDG_DATA_HOME || path.join(HOME, '.local/share'), 'Trash');
const statLimit = limiter(64);

// ---------- names & icons ----------
// shown names in the person's language (the folders themselves keep their English names on disk)
const L = (s) => { try { return require('/usr/lib/palos-l10n/main.js').tr(s); } catch { return s; } };
const LB = (p) => (p ? L(path.basename(p)) : undefined);
function specialFolders() {
  const u = userDirs();
  return new Map([
    [HOME, { icon: ['user-home', 'folder-home'], name: os.userInfo().username }],
    [u.DESKTOP, { icon: ['user-desktop', 'folder-desktop'], name: LB(u.DESKTOP) }],
    [u.DOCUMENTS, { icon: ['folder-documents'], name: LB(u.DOCUMENTS) }],
    [u.DOWNLOAD, { icon: ['folder-download', 'folder-downloads'], name: LB(u.DOWNLOAD) }],
    [u.MUSIC, { icon: ['folder-music'], name: LB(u.MUSIC) }],
    [u.PICTURES, { icon: ['folder-pictures'], name: LB(u.PICTURES) }],
    [u.VIDEOS, { icon: ['folder-videos', 'folder-video'], name: LB(u.VIDEOS) }],
    [u.PUBLICSHARE, { icon: ['folder-publicshare', 'folder-public'], name: LB(u.PUBLICSHARE) }],
    [u.TEMPLATES, { icon: ['folder-templates'], name: LB(u.TEMPLATES) }],
    ['/', { icon: ['drive-harddisk-system', 'drive-harddisk'], name: config.get().hardDiskName }],
    // palOS HD's own folders (the Linux folders beside them are hidden: see /.hidden)
    ['/Applications', { icon: ['folder-applications', 'applications-other'], name: L('Applications') }],
    ['/Applications/Utilities', { icon: ['folder-utilities', 'applications-utilities'], name: L('Utilities') }],
    ['/Library', { icon: ['folder-library'], name: L('Library') }],
    ['/System', { icon: ['folder-system'], name: L('System') }],
    ['/Users', { icon: ['folder-users', 'system-users'], name: L('Users') }],
    [path.join(HOME_TRASH, 'files'), { icon: ['user-trash'], name: L('Trash') }],
    [UTILITIES, { icon: ['folder-utilities', 'applications-utilities'], name: L('Utilities'), open: 'seeker:apps/Utilities' }],
  ]);
}
let SPECIAL = null;
function special(p) { if (!SPECIAL) SPECIAL = specialFolders(); return SPECIAL.get(p); }

function displayName(p) {
  if (/^seeker:apps\/Utilities\/[^/?]+/.test(p)) return p.split('?')[0].split('/').pop();
  if (p.startsWith('seeker:')) return { 'seeker:apps': 'Applications', 'seeker:apps/Utilities': 'Utilities', 'seeker:computer': 'Computer', 'seeker:trash': 'Trash' }[p.split('?')[0]] || 'Searching';
  const s = special(p);
  if (s && s.name) return s.name;
  const mount = mountFor(p);
  if (mount && mount.target === p && p !== '/') return mount.label || path.basename(p);
  return path.basename(p) || p;
}

// programs show their own icon: Windows .exe/.msi files (with a Windows badge) and .deb packages (the app's icon
// on palOS's brown package box); with no icon inside, they keep their kind's icon (blue box, brown box)
const PROGRAM_TYPES = new Set(['application/x-ms-dos-executable', 'application/x-msdownload', 'application/vnd.microsoft.portable-executable',
  'application/x-msi', 'application/x-ms-installer', 'application/x-ole-storage', 'application/vnd.debian.binary-package', 'application/x-deb',
  'application/vnd.appimage', 'application/x-iso9660-appimage']);   // AppImages show their own icon
// documents get a picture of their first page (drawn by Writer, Sheets or Presentation: see palos-doc-thumbnailer)
const DOC_TYPES = new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-word.document.macroEnabled.12',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template', 'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.text-template',
  'application/vnd.oasis.opendocument.text-flat-xml', 'application/rtf', 'text/rtf', 'application/vnd.chancery.writer', 'text/markdown', 'text/x-markdown',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel.sheet.macroEnabled.12', 'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet', 'text/csv', 'text/tab-separated-values', 'application/x-chancery-spst',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.presentation', 'application/vnd.chancery.presentation']);
function thumbable(m) { return m.startsWith('image/') || m.startsWith('video/') || m === 'application/pdf' || PROGRAM_TYPES.has(m) || DOC_TYPES.has(m); }
/** Pictures with see-through parts (a PNG icon, an SVG): shown as they are, with no box or white background behind. */
function hasAlpha(p, m) {
  if (m === 'image/svg+xml') return true;
  if (!/^image\/(png|webp|gif|x-icon|vnd\.microsoft\.icon)$/.test(m)) return false;
  if (/icon/.test(m)) return true;
  let fd = null;
  try {
    fd = fs.openSync(p, 'r'); const b = Buffer.alloc(65536); const n = fs.readSync(fd, b, 0, b.length, 0);
    if (m === 'image/png') {
      if (n < 33 || b.toString('latin1', 1, 4) !== 'PNG') return false;
      const ct = b[25]; if (ct === 4 || ct === 6) return true;
      for (let i = 8; i + 8 <= n;) { const len = b.readUInt32BE(i), type = b.toString('latin1', i + 4, i + 8); if (type === 'tRNS') return true; if (type === 'IDAT') break; i += 12 + len; }
      return false;
    }
    if (m === 'image/webp') return n > 21 && b.toString('latin1', 12, 16) === 'VP8X' && (b[20] & 0x10) !== 0;
    if (m === 'image/gif') {             // a Graphic Control Extension with its transparency flag
      for (let i = 13; i + 3 < n; i++) if (b[i] === 0x21 && b[i + 1] === 0xf9 && b[i + 2] === 4 && (b[i + 3] & 1)) return true;
      return false;
    }
  } catch { return false; } finally { if (fd !== null) try { fs.closeSync(fd); } catch {} }
  return false;
}

async function entry(dir, name, opts = {}) {
  const p = path.join(dir, name);
  let st, lst;
  try { lst = await statLimit(() => fsp.lstat(p)); } catch { return null; }
  st = lst;
  let broken = false;
  if (lst.isSymbolicLink()) { try { st = await fsp.stat(p); } catch { broken = true; } }
  const isDir = !broken && st.isDirectory();
  const e = {
    name, path: p, display: name, dir: isDir, link: lst.isSymbolicLink(), broken,
    size: isDir ? null : st.size, mtime: st.mtimeMs, ctime: (st.birthtimeMs || st.ctimeMs), atime: st.atimeMs,
    hidden: name.startsWith('.') || name.endsWith('~'), mode: st.mode, exec: !isDir && !!(st.mode & 0o111),
  };
  if (isDir) {
    e.mime = 'inode/directory'; e.kind = 'Folder';
    const sp = special(p);
    const m = mountFor(p);
    // (the special folders keep their own icons: Documents, Downloads, Applications, Library, System, Users ...)
    if (p === UTILITIES) e.utilities = true;
    if (sp) {
      e.icon = [...sp.icon, 'folder']; if (sp.name) e.display = sp.name;
      if (sp.open) { e.open = sp.open; e.link = false; }          // /Applications opens the Applications view
      if (/^\/(Library|System|Users)$/.test(p)) e.link = false;  // palOS HD's folders aren't shown as aliases
    } else if (e.link && isUtilities(p)) { e.icon = ['folder-utilities', 'applications-utilities', 'folder']; e.open = 'seeker:apps/Utilities'; e.utilities = true; }
    else if (m && m.target === p && p !== '/') { const v = require('./volumes').byTarget(p); e.icon = v ? v.icon : [m.removable ? 'drive-removable-media' : 'drive-harddisk', 'drive-harddisk']; }
    else {
      e.icon = ['folder'];
      if (e.link && (dir === '/Library' || dir === '/System')) e.link = false;   // their contents are plain folders too
    }
  } else if (broken) {
    e.mime = 'inode/symlink'; e.kind = 'Alias (broken)'; e.icon = ['emblem-unreadable', 'image-missing', 'unknown'];
  } else {
    e.mime = mime.detect(p, name, st);
    e.kind = mime.describe(e.mime);
    e.icon = mime.iconNames(e.mime);
    const badge = archiveBadge(name);
    if (badge) e.icon = ['palos-badge:' + badge, ...e.icon];
    if (e.exec && e.mime === 'application/octet-stream') { e.kind = 'Unix Executable File'; e.icon = ['application-x-executable', ...e.icon]; }
    if (name.endsWith('.app') && e.exec) {
      // a palOS .app: shown as the app it is (its name, its icon), and opened by starting it
      const a = apps.byAppPath(p);
      e.app = { file: a ? a.file : p, name: a ? a.name : name.slice(0, -4), comment: a ? a.comment : '', appPath: p };
      e.display = e.app.name; e.kind = 'Application'; e.mime = 'application/x-palos-app';
      e.icon = [a && a.icon, 'application-x-executable'].filter(Boolean);
    }
    if (name.endsWith('.desktop')) {
      const d = apps.parseDesktop(p);
      if (d.Name) {
        e.app = { file: p, name: d.Name, comment: d.Comment || '' };
        e.display = d.Name; e.kind = 'Application'; e.icon = [d.Icon, 'application-x-executable'].filter(Boolean);
      }
    }
    e.thumb = thumbable(e.mime);
    if (/\.(stl|obj|glb|gltf|ply)$/i.test(name)) { e.thumb = true; e.alpha = true; e.kind = '3D model'; e.icon = [...mime.iconNames('model/stl'), ...[].concat(e.icon || [])]; }   // 3D: a still of the model
    if (e.thumb && e.mime.startsWith('image/')) e.alpha = hasAlpha(p, e.mime);
    if (PROGRAM_TYPES.has(e.mime)) e.program = true;
    // Filename extensions are hidden unless "Show all filename extensions" is on (Seeker Preferences).
    // Only real extensions (with a letter: ".pdf", not the ".6" of "GIMP 3.2.6"), and never for apps.
    if (!e.app && !(config.get().browser || {}).showExtensions) {
      const [b, x] = splitExt(name);
      if (x && b && /[A-Za-z]/.test(x) && !name.startsWith('.')) { e.display = b; e.ext = x; }
    }
  }
  if (e.link) e.kind = isDir ? 'Alias (folder)' : e.kind === 'Application' ? e.kind : `Alias`;
  if (opts.trashInfo) e.trash = opts.trashInfo;
  return e;
}

async function listDir(dir, opts = {}) {
  let names;
  try { names = await fsp.readdir(dir); } catch (err) { return { error: err.code === 'EACCES' ? 'You don’t have permission to see this folder’s contents.' : err.message, entries: [] }; }
  if (!opts.hidden) {
    // a folder's ".hidden" file lists more names to hide (palOS HD hides its Linux folders this way)
    const extra = new Set(readText(path.join(dir, '.hidden')).split('\n').map((s) => s.trim()).filter(Boolean));
    names = names.filter((n) => !n.startsWith('.') && !n.endsWith('~') && !extra.has(n));
  }
  const entries = (await Promise.all(names.map((n) => entry(dir, n)))).filter(Boolean);
  return { entries };
}

// ---------- virtual locations ----------
// Apps that live in the Utilities folder: anything that says X-Palos-Folder=Utilities.
const UTILITY_BINS = new Set(['x-terminal-emulator']);
// system settings tools that belong in Utilities rather than among the everyday apps
const UTILITY_IDS = new Set(['palos-screenshot', 'paladin-dock', 'winetricks', 'palos-windows-programs', 'palos-windows-settings']);
const bareId = (id) => String(id || '').replace(/\.desktop$/, '');
// Windows' own tools live one level further down, in Utilities › WINE
const WINE_IDS = new Set(['winetricks', 'palos-windows-programs', 'palos-windows-settings', 'palos-windows-regedit', 'palos-windows-files']);
const folderOf = (a) => WINE_IDS.has(bareId(a.id)) ? 'Utilities/WINE' : a.folder || ((UTILITY_BINS.has(a.bin) || UTILITY_IDS.has(bareId(a.id))) ? 'Utilities' : '');
const inUtilities = (a) => folderOf(a) === 'Utilities';
const inAnyUtilities = (a) => folderOf(a) === 'Utilities' || folderOf(a).startsWith('Utilities/');
const SUBFOLDER_ICONS = { WINE: ['folder-wine', 'palos-windows', 'folder'] };
let appsizeListener = null;
function onAppSizes(fn) { appsizeListener = fn; }
function appsizeWarm(files) { require('./appsize').warm(files, () => { if (appsizeListener) appsizeListener(); }); }
function appsListing(sub) {
  apps.ensure();
  // sub: '' (Applications), 'Utilities', or 'Utilities/<name>' (a folder inside Utilities)
  const want = sub || '';
  const list = apps.all().filter((a) => (want === '' ? !inAnyUtilities(a) : folderOf(a) === want));
  const rows = list.map((a) => {
    let st = null; try { st = fs.statSync(a.file); } catch {}
    return {
      // the app's real size (everything it installed; worked out in the background), not its launcher's
      name: a.id, display: a.name, path: a.file, dir: false, size: require('./appsize').cached(a.file), mtime: st ? st.mtimeMs : 0, ctime: st ? st.ctimeMs : 0,
      mime: 'application/x-desktop', kind: 'Application', icon: [a.icon, 'application-x-executable'].filter(Boolean),
      app: { id: a.id, file: a.file, name: a.name, comment: a.comment }, category: a.categories[0] || '',
    };
  });
  appsizeWarm(list.map((a) => a.file));
  if (!sub) {
    // the Utilities folder, listed like any other folder
    // always last in the grid, whatever the sort
    syncUtilities();
    rows.push({ name: 'Utilities', display: L('Utilities'), path: UTILITIES, open: 'seeker:apps/Utilities', utilities: true, last: true, dir: true, size: null, mtime: 0, ctime: 0, mime: 'inode/directory', kind: 'Folder', icon: ['folder-utilities', 'applications-utilities', 'folder'] });
  } else if (sub === 'Utilities') {
    // folders inside Utilities (WINE): one for each name some app asks for
    const subs = new Set(apps.all().map(folderOf).filter((f) => f.startsWith('Utilities/')).map((f) => f.slice('Utilities/'.length)));
    for (const n of [...subs].sort()) {
      rows.push({ name: n, display: n, path: 'seeker:apps/Utilities/' + n, open: 'seeker:apps/Utilities/' + n, last: true, dir: true, size: null, mtime: 0, ctime: 0, mime: 'inode/directory', kind: 'Folder', icon: SUBFOLDER_ICONS[n] || ['folder'] });
    }
  }
  return rows;
}

/** Keep the Utilities folder's links in step with the utility apps installed. */
function syncUtilities() {
  try {
    apps.ensure();
    fs.mkdirSync(UTILITIES, { recursive: true });
    const want = new Map();
    for (const a of apps.all().filter((x) => inUtilities(x))) want.set(path.basename(a.file), a.file);
    for (const n of fs.readdirSync(UTILITIES)) {
      const p = path.join(UTILITIES, n);
      let target = null; try { target = fs.readlinkSync(p); } catch {}
      if (!want.has(n) || want.get(n) !== target) { try { fs.unlinkSync(p); } catch {} }
    }
    for (const [n, f] of want) { const p = path.join(UTILITIES, n); if (!fs.existsSync(p)) { try { fs.symlinkSync(f, p); } catch {} } }
  } catch {}
}

async function list(location, opts = {}) {
  if (isUtilities(location) && location !== 'seeker:apps/Utilities') location = 'seeker:apps/Utilities';
  const loc = location.split('?')[0];
  if (loc === 'seeker:apps/Utilities') return { location, title: L('Utilities'), virtual: true, entries: appsListing('Utilities'), icon: ['folder-utilities', 'applications-utilities', 'folder'] };
  const subm = loc.match(/^seeker:apps\/Utilities\/([^/]+)$/);
  if (subm) return { location, title: subm[1], virtual: true, entries: appsListing('Utilities/' + subm[1]), icon: SUBFOLDER_ICONS[subm[1]] || ['folder'] };
  if (loc === 'seeker:apps') return { location, title: 'Applications', virtual: true, entries: appsListing(), icon: ['folder-applications', 'applications-other', 'folder'] };
  if (loc === 'seeker:trash') return { location, title: 'Trash', virtual: true, trash: true, entries: await trashListing(), icon: ['user-trash'] };
  if (loc === 'seeker:computer') {
    const vols = require('./volumes').list();
    const entries = [];
    for (const v of vols) {
      const e = await entry(path.dirname(v.target), path.basename(v.target));
      if (e) { e.display = v.name; e.icon = v.icon; e.volume = v; e.kind = 'Volume'; entries.push(e); }
    }
    return { location, title: 'Computer', virtual: true, entries, icon: ['computer'] };
  }
  const r = await listDir(location, opts);
  let canWrite = false; try { fs.accessSync(location, fs.constants.W_OK); canWrite = true; } catch {}
  const sp = special(location);
  return { location, title: displayName(location), canWrite, ...r, icon: sp ? sp.icon : (mountFor(location) && mountFor(location).target === location ? ((require('./volumes').byTarget(location) || {}).icon || ['drive-harddisk']) : ['folder']) };
}

async function freeSpace(p) {
  try {
    if (p.startsWith('seeker:')) p = HOME;
    const s = await fsp.statfs(p);
    return s.bavail * s.bsize;
  } catch { return null; }
}

// ---------- mounts ----------
let mountCache = null, mountAt = 0;
function mounts() {
  if (mountCache && Date.now() - mountAt < 2000) return mountCache;
  const out = [];
  for (const line of readText('/proc/self/mountinfo').split('\n')) {
    const f = line.split(' '); if (f.length < 10) continue;
    const sep = f.indexOf('-');
    const target = f[4].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
    out.push({ target, fstype: f[sep + 1], source: f[sep + 2], dev: f[2] });
  }
  mountCache = out.sort((a, b) => b.target.length - a.target.length); mountAt = Date.now();
  return mountCache;
}
function mountFor(p) {
  for (const m of mounts()) if (p === m.target || p.startsWith(m.target === '/' ? '/' : m.target + '/')) {
    const vol = require('./volumes').byTarget(m.target);
    return { ...m, label: vol ? vol.name : null, removable: vol ? vol.removable : false };
  }
  return null;
}

// ---------- names ----------
function splitExt(name) {
  const m = name.match(/^(.+?)((?:\.tar)?\.[A-Za-z0-9]{1,8})$/);
  return m && !name.startsWith('.') ? [m[1], m[2]] : [name, ''];
}
function uniqueName(dir, name, style = 'copy') {
  if (!fs.existsSync(path.join(dir, name))) return name;
  const [base, ext] = splitExt(name);
  for (let i = 1; i < 10000; i++) {
    const n = style === 'copy' ? (i === 1 ? `${base} copy${ext}` : `${base} copy ${i}${ext}`)
      : style === 'trash' ? `${base}.${i + 1}${ext}` : `${base} ${i + 1}${ext}`;
    if (!fs.existsSync(path.join(dir, n))) return n;
  }
  return `${base} ${Date.now()}${ext}`;
}

// ---------- operations ----------
async function newFolder(dir, name = 'untitled folder') {
  const n = uniqueName(dir, name, 'number');
  await fsp.mkdir(path.join(dir, n));
  return path.join(dir, n);
}

async function rename(p, newName) {
  if (!newName || newName.includes('/') || newName === '.' || newName === '..') throw new Error('That name can’t be used.');
  const dest = path.join(path.dirname(p), newName);
  if (dest === p) return p;
  if (fs.existsSync(dest) && dest.toLowerCase() !== p.toLowerCase()) throw new Error(`The name “${newName}” is already taken. Please choose a different name.`);
  await fsp.rename(p, dest);
  return dest;
}

async function copyOne(src, dest) {
  await fsp.cp(src, dest, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true, force: true, errorOnExist: false });
}

// ---------- copying with progress ----------
// A copy is counted in bytes. On a USB stick (or any removable disk) the bytes are counted only once
// they're on the stick, not when they've reached the computer's memory: every few MB the file is
// flushed (fdatasync), so the bar is the stick's real speed and "done" means the data is on it.
const STOPPED = 'palos:stopped';
const FLUSH_EVERY = 8 * 1024 * 1024;
const FAT_MAX = 4294967295;

/** what a copy of these items amounts to: files, bytes, and the biggest single file */
async function measure(srcs, { cancelled } = {}) {
  const m = { files: 0, bytes: 0, biggest: 0, biggestName: null };
  const walk = async (p) => {
    if (cancelled && cancelled()) return;
    let st; try { st = await fsp.lstat(p); } catch { return; }
    if (st.isDirectory()) {
      let names = []; try { names = await fsp.readdir(p); } catch {}
      for (const n of names) await walk(path.join(p, n));
    } else {
      m.files++;
      if (st.isFile()) { m.bytes += st.size; if (st.size > m.biggest) { m.biggest = st.size; m.biggestName = path.basename(p); } }
    }
  };
  for (const s of srcs) await walk(s);
  return m;
}

async function copyFileCounted(src, dest, st, ctx) {
  const rf = await fsp.open(src, 'r');
  let wf;
  try {
    wf = await fsp.open(dest, 'w', st.mode & 0o777);
    const buf = Buffer.allocUnsafe(1024 * 1024);
    let unflushed = 0;
    for (;;) {
      if (ctx.stopped) throw new Error(STOPPED);
      const { bytesRead } = await rf.read(buf, 0, buf.length, null);
      if (!bytesRead) break;
      let off = 0;
      while (off < bytesRead) { const { bytesWritten } = await wf.write(buf, off, bytesRead - off); off += bytesWritten; }
      ctx.written += bytesRead; unflushed += bytesRead;
      if (ctx.flush) {
        if (unflushed >= FLUSH_EVERY) { await wf.datasync(); ctx.done += unflushed; unflushed = 0; }
      } else { ctx.done += bytesRead; unflushed = 0; }
      ctx.tick();
    }
    if (ctx.flush && unflushed) { await wf.datasync(); ctx.done += unflushed; }
    await wf.close(); wf = null;
    try { await fsp.utimes(dest, st.atime, st.mtime); } catch {}
    try { await fsp.chmod(dest, st.mode & 0o7777); } catch {}         // FAT and exFAT keep no permissions: fine
  } catch (e) {
    if (wf) { try { await wf.close(); } catch {} }
    try { await fsp.rm(dest, { force: true }); } catch {}             // no half-copied file left behind
    throw e;
  } finally { await rf.close(); }
  ctx.filesDone++; ctx.tick();
}

async function copyCounted(src, dest, ctx) {
  if (ctx.stopped) throw new Error(STOPPED);
  const st = await fsp.lstat(src);
  ctx.current = path.basename(src);
  if (st.isDirectory()) {
    await fsp.mkdir(dest, { recursive: true });
    for (const n of await fsp.readdir(src)) await copyCounted(path.join(src, n), path.join(dest, n), ctx);
    try { await fsp.utimes(dest, st.atime, st.mtime); } catch {}
    try { await fsp.chmod(dest, st.mode & 0o7777); } catch {}
  } else if (st.isSymbolicLink()) {
    try { await fsp.symlink(await fsp.readlink(src), dest); } catch {}  // FAT can't hold links: skipped
    ctx.filesDone++;
  } else if (st.isFile()) await copyFileCounted(src, dest, st, ctx);
  else ctx.filesDone++;                                                 // sockets and pipes aren't copied
}

/** a progress counter for transfer(): ctx.done is bytes safely written, ctx.total all of them */
function newCopyContext({ total = 0, files = 0, flush = false, onTick } = {}) {
  let last = 0;
  const ctx = { total, files, done: 0, written: 0, filesDone: 0, current: null, flush, stopped: false,
    tick: () => { const now = Date.now(); if (onTick && now - last > 150) { last = now; onTick(ctx); } } };
  return ctx;
}

/**
 * Copy or move items into a folder.
 * ask(name, isDir) -> 'replace' | 'keep' | 'skip' | 'stop'
 * progress({done,total,name})
 * ctx: a newCopyContext() to count bytes (Seeker's copy window)
 */
async function transfer(srcs, destDir, { move = false, ask, progress, ctx } = {}) {
  const done = [];
  let i = 0;
  const copyIt = (src, target) => (ctx ? copyCounted(src, target, ctx) : copyOne(src, target));
  for (const src of srcs) {
    if (ctx && ctx.stopped) break;
    i++;
    const name = path.basename(src);
    if (destDir === src || destDir.startsWith(src + '/')) throw new Error(`“${name}” can’t be ${move ? 'moved' : 'copied'} into itself.`);
    let target = path.join(destDir, name);
    if (path.dirname(src) === destDir) {
      if (move) continue;                                  // moving into the same folder: nothing to do
      target = path.join(destDir, uniqueName(destDir, name, 'copy'));
    } else if (fs.existsSync(target)) {
      const choice = ask ? await ask(name, fs.statSync(target).isDirectory()) : 'keep';
      if (choice === 'stop') break;
      if (choice === 'skip') continue;
      if (choice === 'keep') target = path.join(destDir, uniqueName(destDir, name, 'number'));
      if (choice === 'replace') await fsp.rm(target, { recursive: true, force: true });
    }
    progress && progress({ done: i - 1, total: srcs.length, name });
    try {
      if (move) {
        try { await fsp.rename(src, target); }
        catch (e) {
          if (e.code !== 'EXDEV') throw e;
          await copyIt(src, target);
          await fsp.rm(src, { recursive: true, force: true });
        }
      } else await copyIt(src, target);
    } catch (e) {
      if (e.message !== STOPPED) throw e;
      // stopped: a folder that was only partly copied goes too (the original is untouched)
      if (!fs.existsSync(src) || src === target) break;
      try { await fsp.rm(target, { recursive: true, force: true }); } catch {}
      break;
    }
    done.push(target);
  }
  progress && progress({ done: srcs.length, total: srcs.length, finished: true });
  return done;
}

async function duplicate(paths) { const out = []; for (const p of paths) out.push(...await transfer([p], path.dirname(p))); return out; }

async function makeAlias(paths) {
  const out = [];
  for (const p of paths) {
    const dir = path.dirname(p); const [b, e] = splitExt(path.basename(p));
    const name = uniqueName(dir, `${b} alias${e}`, 'number');
    await fsp.symlink(p, path.join(dir, name)); out.push(path.join(dir, name));
  }
  return out;
}

// ---------- Trash (freedesktop.org spec) ----------
function encodeTrashPath(p) { return p.split('/').map((s) => encodeURIComponent(s)).join('/'); }
function stamp(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
}
function devOf(p) { try { return fs.statSync(p).dev; } catch { return null; } }

function trashDirFor(p) {
  fs.mkdirSync(path.join(HOME_TRASH, 'files'), { recursive: true });
  fs.mkdirSync(path.join(HOME_TRASH, 'info'), { recursive: true });
  if (devOf(path.dirname(p)) === devOf(HOME_TRASH)) return { dir: HOME_TRASH, top: null };
  const m = mountFor(p);
  if (!m) return { dir: HOME_TRASH, top: null };
  const shared = path.join(m.target, '.Trash');
  try {
    const st = fs.lstatSync(shared);
    if (st.isDirectory() && !st.isSymbolicLink() && (st.mode & 0o1000)) {
      const d = path.join(shared, String(UID));
      fs.mkdirSync(path.join(d, 'files'), { recursive: true }); fs.mkdirSync(path.join(d, 'info'), { recursive: true });
      return { dir: d, top: m.target };
    }
  } catch {}
  const d = path.join(m.target, `.Trash-${UID}`);
  fs.mkdirSync(path.join(d, 'files'), { recursive: true, mode: 0o700 }); fs.mkdirSync(path.join(d, 'info'), { recursive: true, mode: 0o700 });
  return { dir: d, top: m.target };
}

async function trash(paths) {
  const out = [];
  for (const p of paths) {
    const { dir, top } = trashDirFor(p);
    const name = uniqueName(path.join(dir, 'files'), path.basename(p), 'trash');
    // Reserve the info file first (atomic create), per spec.
    let n = name;
    for (let tries = 0; tries < 50; tries++) {
      try {
        const fd = fs.openSync(path.join(dir, 'info', n + '.trashinfo'), 'wx');
        const rel = top ? path.relative(top, p) : p;
        fs.writeSync(fd, `[Trash Info]\nPath=${encodeTrashPath(rel)}\nDeletionDate=${stamp()}\n`); fs.closeSync(fd);
        break;
      } catch (e) { if (e.code !== 'EEXIST') throw e; n = uniqueName(path.join(dir, 'files'), n + '_', 'trash'); }
    }
    try { await fsp.rename(p, path.join(dir, 'files', n)); }
    catch (e) {
      if (e.code === 'EXDEV') { await copyOne(p, path.join(dir, 'files', n)); await fsp.rm(p, { recursive: true, force: true }); }
      else { try { fs.unlinkSync(path.join(dir, 'info', n + '.trashinfo')); } catch {} throw e; }
    }
    out.push(path.join(dir, 'files', n));
  }
  if (out.length) sound('trash');
  return out;
}

/** the palOS interface sounds (palos-sound checks whether they are turned on) */
function sound(name) {
  try { const c = require('child_process').spawn('palos-sound', [name], { detached: true, stdio: 'ignore' }); c.on('error', () => {}); c.unref(); } catch {}
}

function trashDirs() {
  const dirs = [{ dir: HOME_TRASH, top: null }];
  for (const m of mounts()) {
    if (!/^\/(media|run\/media|mnt)\//.test(m.target)) continue;
    for (const d of [path.join(m.target, '.Trash', String(UID)), path.join(m.target, `.Trash-${UID}`)])
      if (fs.existsSync(path.join(d, 'files'))) dirs.push({ dir: d, top: m.target });
  }
  return dirs;
}

function readTrashInfo(dir, top, name) {
  const txt = readText(path.join(dir, 'info', name + '.trashinfo'));
  const p = (txt.match(/^Path=(.*)$/m) || [])[1];
  const d = (txt.match(/^DeletionDate=(.*)$/m) || [])[1];
  if (!p) return null;
  let orig = decodeURIComponent(p);
  if (top && !orig.startsWith('/')) orig = path.join(top, orig);
  return { original: orig, deleted: d ? new Date(d).getTime() : null };
}

async function trashListing() {
  const out = [];
  for (const { dir, top } of trashDirs()) {
    let names = []; try { names = await fsp.readdir(path.join(dir, 'files')); } catch {}
    for (const n of names) {
      const e = await entry(path.join(dir, 'files'), n, { trashInfo: readTrashInfo(dir, top, n) });
      if (e) out.push(e);
    }
  }
  return out;
}

function trashCount() {
  let n = 0;
  for (const { dir } of trashDirs()) { try { n += fs.readdirSync(path.join(dir, 'files')).length; } catch {} }
  return n;
}

async function emptyTrash() {
  for (const { dir } of trashDirs()) {
    for (const sub of ['files', 'info', 'expunged']) {
      let names = []; try { names = await fsp.readdir(path.join(dir, sub)); } catch { continue; }
      for (const n of names) await fsp.rm(path.join(dir, sub, n), { recursive: true, force: true }).catch(() => {});
    }
    try { fs.unlinkSync(path.join(dir, 'directorysizes')); } catch {}
  }
  sound('empty');        // emptying the Trash has its own sound; throwing something in is 'trash'
}

async function putBack(paths) {
  const out = [];
  for (const p of paths) {
    const dir = path.dirname(path.dirname(p)); const name = path.basename(p);
    const t = trashDirs().find((d) => d.dir === dir);
    const info = readTrashInfo(dir, t ? t.top : null, name);
    if (!info) continue;
    // an uninstalled app goes back into Applications (that needs the password)
    if (/^\/Applications\/.*\.app$/.test(info.original)) {
      const ok = await new Promise((res) => require('child_process').execFile('pkexec', ['/usr/lib/palos-apps/palos-app-uninstall', '--restore', dir, String(process.getuid()), String(process.getgid()), name],
        { timeout: 300000 }, (err) => res(!err)));
      if (ok) out.push(info.original);
      continue;
    }
    await fsp.mkdir(path.dirname(info.original), { recursive: true });
    let dest = info.original;
    if (fs.existsSync(dest)) dest = path.join(path.dirname(dest), uniqueName(path.dirname(dest), path.basename(dest), 'number'));
    try { await fsp.rename(p, dest); } catch (e) { if (e.code !== 'EXDEV') throw e; await copyOne(p, dest); await fsp.rm(p, { recursive: true, force: true }); }
    try { fs.unlinkSync(path.join(dir, 'info', name + '.trashinfo')); } catch {}
    out.push(dest);
  }
  return out;
}

function isInTrash(p) { return trashDirs().some((d) => p.startsWith(path.join(d.dir, 'files') + '/')); }

// ---------- Get Info ----------
let passwd = null, groups = null;
function idName(id, file, cacheName) {
  if (cacheName === 'u' ? !passwd : !groups) {
    const m = new Map();
    for (const l of readText(file).split('\n')) { const f = l.split(':'); if (f.length > 2) m.set(+f[2], f[0]); }
    if (cacheName === 'u') passwd = m; else groups = m;
  }
  return (cacheName === 'u' ? passwd : groups).get(id) || String(id);
}

async function info(p) {
  const e = await entry(path.dirname(p), path.basename(p));
  if (!e) return null;
  const st = await fsp.lstat(p);
  e.owner = idName(st.uid, '/etc/passwd', 'u'); e.group = idName(st.gid, '/etc/group', 'g');
  e.uid = st.uid; e.gid = st.gid; e.mine = st.uid === UID || UID === 0;
  e.where = path.dirname(p);
  if (e.link) { try { e.target = fs.readlinkSync(p); } catch {} }
  if (isInTrash(p)) { const dir = path.dirname(path.dirname(p)); const t = trashDirs().find((d) => d.dir === dir); e.trash = readTrashInfo(dir, t && t.top, path.basename(p)); }
  if (e.dir) { const m = mountFor(p); if (m && m.target === p) e.mount = m; }
  if (!e.dir && e.mime !== 'application/x-desktop') {
    const def = apps.defaultFor(e.mime);
    e.defaultApp = def ? { id: def.id, name: def.name, icon: def.icon } : null;
    e.openWith = apps.forMime(e.mime).map((a) => ({ id: a.id, name: a.name, icon: a.icon }));
  }
  return e;
}

/** Recursive size of a folder (size, count); stops after `limitMs`. */
async function folderSize(p, limitMs = 30000) {
  const start = Date.now(); let size = 0, count = 0, partial = false;
  const walk = async (d) => {
    if (Date.now() - start > limitMs) { partial = true; return; }
    let ents; try { ents = await fsp.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const ent of ents) {
      const q = path.join(d, ent.name);
      count++;
      if (ent.isDirectory()) await walk(q);
      else { try { size += (await fsp.lstat(q)).size; } catch {} }
    }
  };
  await walk(p);
  return { size, count, partial };
}

// ---------- search ----------
const KIND_TEST = {
  images: (m) => m.startsWith('image/'),
  movies: (m) => m.startsWith('video/'),
  music: (m) => m.startsWith('audio/'),
  documents: (m) => m === 'application/pdf' || m.startsWith('text/') || /opendocument|msword|officedocument|ms-excel|ms-powerpoint|rtf|epub|x-abiword/.test(m),
};

/** Walk `scope` and stream matches to onBatch(entries). Returns a cancel function. */
function search({ text = '', scope = HOME, kind = null, since = null, until = null }, onBatch, onDone) {
  let cancelled = false; let found = 0;
  const needle = text.toLowerCase();
  const LIMIT = 3000;
  (async () => {
    let batch = []; let last = Date.now();
    const flush = () => { if (batch.length) { onBatch(batch); batch = []; } last = Date.now(); };
    const queue = [scope];
    while (queue.length && !cancelled && found < LIMIT) {
      const d = queue.shift();
      let names; try { names = await fsp.readdir(d, { withFileTypes: true }); } catch { continue; }
      for (const ent of names) {
        if (cancelled || found >= LIMIT) break;
        if (ent.name.startsWith('.')) continue;
        const q = path.join(d, ent.name);
        if (ent.isDirectory() && !ent.isSymbolicLink()) { if (!['/proc', '/sys', '/dev', '/run'].includes(q)) queue.push(q); }
        if (needle && !ent.name.toLowerCase().includes(needle)) continue;
        if (!needle && !kind && !since) continue;
        if (kind || since) {
          const e = await entry(d, ent.name);
          if (!e) continue;
          if (kind && (e.dir || !KIND_TEST[kind](e.mime))) continue;
          if (since && (e.mtime < since || (until && e.mtime >= until))) continue;
          batch.push(e); found++;
        } else {
          const e = await entry(d, ent.name);
          if (e) { batch.push(e); found++; }
        }
        if (batch.length >= 40 || Date.now() - last > 250) flush();
      }
    }
    flush();
    onDone && onDone({ cancelled, found, limited: found >= LIMIT });
  })();
  return () => { cancelled = true; };
}

module.exports = { onAppSizes,
  HOME_TRASH, list, listDir, entry, info, freeSpace, folderSize, displayName, special, mountFor, mounts,
  newFolder, rename, transfer, measure, newCopyContext, FAT_MAX, duplicate, makeAlias, trash, emptyTrash, putBack, trashCount, isInTrash,
  search, uniqueName, resetSpecial: () => { SPECIAL = null; }, UTILITIES, isUtilities, syncUtilities,
};

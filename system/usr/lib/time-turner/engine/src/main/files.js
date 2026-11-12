'use strict';
// Helpers shared by the main process: file kinds, the live ("Now") file system,
// and converting between the renderer's home-relative paths and absolute ones.
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOME = os.homedir();

const KIND_BY_EXT = {
  doc: ['odt', 'doc', 'docx', 'rtf', 'pages', 'ott', 'fodt'],
  sheet: ['ods', 'xls', 'xlsx', 'csv', 'tsv', 'numbers', 'fods'],
  pdf: ['pdf', 'epub', 'djvu'],
  text: ['txt', 'md', 'log', 'ini', 'conf', 'cfg', 'nfo'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'heic', 'avif', 'raw', 'cr2', 'nef', 'xcf', 'kra'],
  audio: ['mp3', 'ogg', 'oga', 'flac', 'wav', 'm4a', 'aac', 'opus', 'wma'],
  video: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v', 'wmv', 'ogv'],
  code: ['js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'py', 'c', 'h', 'cpp', 'hpp', 'cc', 'rs', 'go', 'java', 'kt', 'rb', 'php',
    'sh', 'bash', 'zsh', 'html', 'htm', 'css', 'scss', 'json', 'xml', 'yml', 'yaml', 'toml', 'sql', 'lua', 'swift', 'cs', 'vue', 'svelte'],
  archive: ['zip', 'tar', 'gz', 'tgz', 'xz', 'bz2', 'zst', '7z', 'rar', 'deb', 'rpm', 'snap', 'appimage', 'flatpak'],
  disc: ['iso', 'img', 'qcow2', 'vdi', 'vmdk'],
};
const EXT_KIND = new Map(Object.entries(KIND_BY_EXT).flatMap(([k, exts]) => exts.map(e => [e, k])));

function kindOf(name, type) {
  if (type === 'dir') return 'folder';
  const dot = name.lastIndexOf('.');
  return (dot > 0 && EXT_KIND.get(name.slice(dot + 1).toLowerCase())) || 'text';
}

/** "Documents/Taxes" -> "/home/alice/Documents/Taxes" (refuses anything that escapes home). */
function toAbs(rel) {
  const clean = path.posix.normalize(`/${String(rel || '')}`).replace(/^\/+/, '');
  if (clean.split('/').includes('..')) throw Object.assign(new Error('Bad path'), { code: 'bad-path' });
  return clean ? path.join(HOME, clean) : HOME;
}

function toRel(abs) {
  const r = path.relative(HOME, abs);
  return r.startsWith('..') ? null : r;
}

const isHidden = name => name.startsWith('.');

/** Items in a folder, shaped for the renderer. */
function shapeItems(items, relDir) {
  return items
    .filter(i => !isHidden(i.name))
    .map(i => ({
      name: i.name,
      kind: kindOf(i.name, i.type),
      size: i.size || 0,
      mtime: i.mtime || null,
      path: relDir ? `${relDir}/${i.name}` : i.name,
    }));
}

/** List the live file system ("Now"). Resolves null if the folder doesn't exist. */
async function listNow(rel) {
  const abs = toAbs(rel);
  let entries;
  try { entries = await fs.promises.readdir(abs, { withFileTypes: true }); } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null;
    if (err.code === 'EACCES') return [];
    throw err;
  }
  const items = await Promise.all(entries.filter(e => !isHidden(e.name)).map(async e => {
    const st = await fs.promises.stat(path.join(abs, e.name)).catch(() => null);
    return { name: e.name, type: st?.isDirectory() ? 'dir' : 'file', size: st?.size || 0, mtime: st?.mtimeMs || null };
  }));
  return shapeItems(items, rel);
}

function statNow(rel) {
  try { return fs.lstatSync(toAbs(rel)); } catch { return null; }
}

module.exports = { HOME, kindOf, toAbs, toRel, shapeItems, listNow, statNow, isHidden };

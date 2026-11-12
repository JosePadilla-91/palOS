'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Fonts: every font on this computer, by family. Preview them with your own words, install new ones
// (for you or for everyone), remove, turn off and on, keep collections, and check for problems.
const { app, BrowserWindow, Menu, ipcMain, nativeTheme, shell } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sheets = require('./sheets');

app.setName('Fonts');
if (process.platform === 'linux') app.setDesktopName('palos-fonts.desktop');
const HOME = os.homedir();
const USER_DIR = path.join(process.env.XDG_DATA_HOME || path.join(HOME, '.local/share'), 'fonts');
const SYS_LOCAL = '/usr/local/share/fonts';
const CONF_DIR = path.join(process.env.XDG_CONFIG_HOME || path.join(HOME, '.config'), 'fontconfig', 'conf.d');
const DISABLED_CONF = path.join(CONF_DIR, '90-palos-fonts-disabled.conf');
const STATE_DIR = path.join(process.env.XDG_CONFIG_HOME || path.join(HOME, '.config'), 'palos-fonts');
const STATE = path.join(STATE_DIR, 'state.json');
const HELPER = '/usr/lib/palos-fonts/fonts-helper';
const FONT_EXT = /\.(ttf|otf|ttc|otc|woff2?|pfb|pfa|pcf(\.gz)?|dfont)$/i;
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
let state = { collections: [], sample: '', size: 36, disabled: [], ...readJSON(STATE, {}) };
const save = () => { try { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(state, null, 1)); } catch {} };
let win = null;
const pending = [];

const run = (cmd, args, opts = {}) => new Promise((res) => execFile(cmd, args, { maxBuffer: 64 << 20, timeout: opts.timeout || 60000, env: { ...process.env, LC_ALL: 'C.UTF-8' } }, (e, out, err) => res({ ok: !e, out: out || '', err: err || (e ? String(e.message) : '') })));

// ---------------------------------------------------------------- the font list (fontconfig)
const FMT = '%{family[0]}\\t%{style[0]}\\t%{file}\\t%{index}\\t%{fontformat}\\t%{weight}\\t%{slant}\\t%{spacing}\\t%{foundry}\\t%{fontversion}\\t%{fullname[0]}\\t%{postscriptname}\\t%{family}\\n';
function where(file) {
  if (file.startsWith(USER_DIR + '/') || file.startsWith(path.join(HOME, '.fonts') + '/')) return 'user';
  if (file.startsWith(SYS_LOCAL + '/')) return 'local';
  return 'system';
}
async function list() {
  const r = await run('fc-list', ['--format', FMT]);
  const fams = new Map();
  const disabled = new Set(state.disabled);
  const seen = new Set();
  const add = (bits, off) => {
    const [family, style, file, index, format, weight, slant, spacing, foundry, version, full, ps, allFamilies] = bits;
    if (!family || !file) return;
    const key = file + '#' + index; if (seen.has(key)) return; seen.add(key);
    let f = fams.get(family);
    if (!f) fams.set(family, f = { family, faces: [], where: new Set(), off: true, mono: false });
    const face = { style: style || 'Regular', file, index: +index || 0, format, weight: +weight || 80, slant: +slant || 0, spacing: +spacing || 0, foundry, version: version ? (+version / 65536).toFixed(3) : '', full, ps, where: where(file), off, aliases: (allFamilies || '').split(',').slice(1) };
    f.faces.push(face); f.where.add(face.where); if (!off) f.off = false; if (face.spacing >= 100) f.mono = true;
  };
  for (const line of r.out.split('\n')) add(line.split('\t'), false);
  // turned-off fonts aren't in fontconfig's list: ask about their files one by one
  for (const file of disabled) {
    const q = await run('fc-query', ['--format', FMT, file]);
    for (const line of q.out.split('\n')) add(line.split('\t'), true);
  }
  const order = (x) => Math.abs(x.weight - 80) * 2 + (x.slant ? 1 : 0);
  return [...fams.values()].map((f) => ({ ...f, where: [...f.where], faces: f.faces.sort((a, b) => order(a) - order(b) || a.weight - b.weight || a.slant - b.slant) }))
    .sort((a, b) => a.family.localeCompare(b.family, undefined, { sensitivity: 'base' }));
}

// ---------------------------------------------------------------- a font file that isn't installed (preview, install)
async function inspect(file) {
  const q = await run('fc-query', ['--format', FMT, file]);
  if (!q.ok || !q.out.trim()) return { file, error: 'The font file is damaged or in a format Fonts can’t read.' };
  const faces = q.out.trim().split('\n').map((l) => { const b = l.split('\t'); return { family: b[0], style: b[1] || 'Regular', index: +b[3] || 0, format: b[4], weight: +b[5] || 80, slant: +b[6] || 0, version: b[9] ? (+b[9] / 65536).toFixed(3) : '', full: b[10] }; });
  // already installed? (same family and style)
  const r = await run('fc-list', ['--format', '%{family[0]}\\t%{style[0]}\\t%{file}\\n']);
  const have = new Set(r.out.split('\n').map((l) => l.split('\t').slice(0, 2).join('\t')));
  let data = null; try { const st = fs.statSync(file); if (st.size < 40 << 20) data = fs.readFileSync(file); } catch {}
  return { file, name: path.basename(file), faces, installed: faces.every((f) => have.has(f.family + '\t' + f.style)), data };
}
function fontFiles(paths) {
  const out = [];
  const walk = (p, depth) => {
    let st; try { st = fs.statSync(p); } catch { return; }
    if (st.isDirectory() && depth < 4) { for (const n of fs.readdirSync(p)) walk(path.join(p, n), depth + 1); }
    else if (st.isFile() && FONT_EXT.test(p)) out.push(p);
  };
  for (const p of paths) walk(p, 0);
  return out;
}

async function refreshCache(system) {
  if (system) await run('pkexec', [HELPER, 'cache'], { timeout: 300000 });
  await run('fc-cache', ['-f', USER_DIR], { timeout: 300000 });
  if (win) win.webContents.send('changed');
}
async function install(files, everyone) {
  files = fontFiles(files);
  if (!files.length) return { error: 'There are no fonts to install.' };
  if (everyone) {
    const r = await run('pkexec', [HELPER, 'install', ...files], { timeout: 300000 });
    if (!r.ok) return { error: /dismissed|126|127/.test(r.err) ? 'Installing for everyone needs an administrator password.' : (r.err.trim().split('\n').pop() || 'The fonts couldn’t be installed.') };
  } else {
    fs.mkdirSync(USER_DIR, { recursive: true });
    for (const f of files) {
      const dst = path.join(USER_DIR, path.basename(f));
      if (path.resolve(f) === path.resolve(dst)) continue;
      try { fs.copyFileSync(f, dst); } catch (e) { return { error: e.message }; }
    }
  }
  await refreshCache(false);
  return { ok: true, count: files.length };
}
async function remove(files) {
  const user = files.filter((f) => where(f) === 'user'), local = files.filter((f) => where(f) === 'local');
  const sys = files.filter((f) => where(f) === 'system');
  for (const f of user) { try { await shell.trashItem(f); } catch { try { fs.unlinkSync(f); } catch {} } }
  if (local.length) { const r = await run('pkexec', [HELPER, 'remove', ...local], { timeout: 120000 }); if (!r.ok) return { error: 'Removing fonts for everyone needs an administrator password.' }; }
  await refreshCache(false);
  return { ok: true, kept: sys.length };
}
function writeDisabled() {
  fs.mkdirSync(CONF_DIR, { recursive: true });
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = state.disabled.map((f) => `      <glob>${esc(f)}</glob>`).join('\n');
  fs.writeFileSync(DISABLED_CONF, `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<!-- Fonts turned off in palOS Fonts. Turn them back on there. -->\n<fontconfig>\n  <selectfont>\n    <rejectfont>\n${body}\n    </rejectfont>\n  </selectfont>\n</fontconfig>\n`);
}
async function setEnabled(files, on) {
  const set = new Set(state.disabled);
  for (const f of files) on ? set.delete(f) : set.add(f);
  state.disabled = [...set]; save(); writeDisabled();
  await run('fc-cache', ['-f'], { timeout: 300000 });
  if (win) win.webContents.send('changed');
  return { ok: true };
}
// problems: files fontconfig can't read, and the same family+style installed more than once
async function check() {
  const out = [];
  const fams = await list();
  for (const f of fams) {
    const seen = new Map();
    for (const x of f.faces) {
      const k = x.style.toLowerCase();
      if (seen.has(k)) out.push({ kind: 'duplicate', family: f.family, style: x.style, file: x.file, other: seen.get(k) });
      else seen.set(k, x.file);
    }
  }
  for (const dir of [USER_DIR, SYS_LOCAL]) {
    for (const file of fontFiles([dir])) {
      const q = await run('fc-query', ['--format', '%{family[0]}\\n', file]);
      if (!q.ok || !q.out.trim()) out.push({ kind: 'damaged', file });
    }
  }
  return out;
}

// ---------------------------------------------------------------- calls from the page
const H = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => { try { return await fn(...a); } catch (err) { return { error: String(err && err.message || err) }; } });
H('state', () => state);
H('faceData', (file) => { try { const st = fs.statSync(file); return st.size < (40 << 20) ? fs.readFileSync(file) : null; } catch { return null; } });
H('list', list);
H('inspect', inspect);
H('install', (files, everyone) => install(files, everyone));
H('remove', remove);
H('enable', (files, on) => setEnabled(files, on));
H('check', check);
H('pending', () => pending.splice(0));
H('setState', (patch) => { Object.assign(state, patch); save(); return state; });
H('reveal', (file) => { shell.showItemInFolder(file); return true; });
H('addFonts', async () => {
  const r = await sheets.open(win, { title: 'Add Fonts', properties: ['openFile', 'multiSelections'], defaultPath: path.join(HOME, 'Downloads'),
    filters: [{ name: 'Fonts', extensions: ['ttf', 'otf', 'ttc', 'otc', 'woff', 'woff2', 'pfb', 'pfa'] }] });
  return r.canceled ? [] : r.filePaths;
});
H('confirm', (o) => sheets.message(win, o));
H('prompt', (o) => sheets.prompt(win, o));

function create() {
  win = new BrowserWindow({ width: 1060, height: 680, minWidth: 760, minHeight: 460, title: 'Fonts', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2',
    icon: '/usr/share/icons/hicolor/256x256/apps/palos-fonts.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; app.quit(); });
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'Add Fonts…', accelerator: 'Ctrl+O', click: send('add') },
      { label: 'New Collection', accelerator: 'Ctrl+N', click: send('newCollection') },
      { type: 'separator' },
      { label: 'Show in Seeker', accelerator: 'Ctrl+R', click: send('reveal') },
      { label: 'Check for Problems', click: send('check') },
      { type: 'separator' },
      { label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() },
      { label: 'Quit Fonts', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      { type: 'separator' }, { label: 'Find', accelerator: 'Ctrl+F', click: send('find') },
      { label: 'Turn Off Font', accelerator: 'Ctrl+Shift+D', click: send('toggle') }, { label: 'Remove Font…', accelerator: 'Delete', click: send('remove') }] },
    { label: 'View', submenu: [
      { label: 'Sample', accelerator: 'Ctrl+1', click: send('mode:sample') }, { label: 'Alphabet', accelerator: 'Ctrl+2', click: send('mode:alphabet') },
      { label: 'Paragraph', accelerator: 'Ctrl+3', click: send('mode:paragraph') }, { label: 'Custom', accelerator: 'Ctrl+4', click: send('mode:custom') },
      { label: 'Information', accelerator: 'Ctrl+I', click: send('mode:info') },
      { type: 'separator' }, { label: 'Bigger', accelerator: 'Ctrl+Plus', click: send('bigger') }, { label: 'Smaller', accelerator: 'Ctrl+-', click: send('smaller') }] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }] },
  ]));
}
function filesFrom(argv) { return argv.filter((a) => !a.startsWith('-') && fs.existsSync(a) && (FONT_EXT.test(a) || fs.statSync(a).isDirectory())).map((a) => path.resolve(a)); }
if (!app.requestSingleInstanceLock()) app.quit();
else {
  pending.push(...filesFrom(process.argv.slice(1)));
  app.on('second-instance', (e, argv) => {
    const f = filesFrom(argv.slice(1));
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); if (f.length) win.webContents.send('open', f); }
  });
  app.whenReady().then(create);
}

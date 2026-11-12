'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Disk Utility (was Disks): see every disk and volume; erase, partition, check, mount and eject them; make disk images,
// write images to disks and USB sticks (Linux and Windows install images, checked after writing), open disk
// images (.iso, .img) and see what takes up the space on a volume (Disk Usage).
const { app, BrowserWindow, Menu, ipcMain, nativeTheme } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sheets = require('./sheets');

app.setName('Disk Utility');
if (process.platform === 'linux') app.setDesktopName('palos-disks.desktop');
const HELPER = '/usr/lib/palos-disks/disks-helper';
let win = null;

function run(cmd, args, timeout = 60000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C' } }, (err, out, errout) =>
      resolve({ ok: !err, out: String(out || ''), err: String(errout || (err && err.message) || '').trim() }));
  });
}

// ---------------------------------------------------------------- what's attached
const COLS = 'NAME,PATH,SIZE,TYPE,FSTYPE,FSVER,LABEL,UUID,MOUNTPOINTS,MODEL,VENDOR,SERIAL,TRAN,RM,RO,HOTPLUG,PTTYPE,PARTTYPENAME,PARTLABEL,PARTN,START,LOG-SEC,FSAVAIL,FSUSED,PKNAME,ROTA';
const DEMO = process.env.PALOS_DISKS_DEMO ? [{ name: 'sdb', path: '/dev/sdb', size: 64e9, type: 'disk', vendor: 'SanDisk', model: 'Ultra USB 3.0', tran: 'usb', rm: true, hotplug: true, pttype: 'gpt', system: false, kind: 'external', volumes: [
  { name: 'sdb1', path: '/dev/sdb1', type: 'part', partn: 1, start: 2048, size: 30e9, fstype: 'exfat', label: 'PHOTOS', mounts: ['/media/joe/PHOTOS'], fsused: 12e9, fsavail: 18e9 },
  { name: 'sdb2', path: '/dev/sdb2', type: 'part', partn: 2, start: 2048 + 30e9 / 512, size: 20e9, fstype: 'ext4', label: 'Backup', mounts: [] }] }] : null;
async function devices() {
  if (DEMO) return DEMO;
  const r = await run('lsblk', ['-J', '-b', '-o', COLS]);
  let tree = [];
  try { tree = JSON.parse(r.out).blockdevices || []; } catch {}
  const sysMounts = new Set(['/', '/boot', '/boot/efi', '/usr', '/var', '/home', '/cdrom', '/rofs', '/run/live/medium']);
  const walk = (n, f) => { f(n); (n.children || []).forEach((c) => walk(c, f)); };
  const out = [];
  for (const d of tree) {
    if (/^(loop|zram|ram)/.test(d.name) && !(d.children || []).length && !d.mountpoints.some(Boolean)) continue;
    if (/^loop/.test(d.name)) {
      // disk images attached by the user show up; the system's own (snaps, the live system) don't
      const back = (await run('losetup', ['-n', '-O', 'BACK-FILE', d.path])).out.trim();
      if (!back || /^\/(snap|var\/lib\/snapd|cdrom|rofs|run\/live)/.test(back) || /\.snap$|filesystem\.squashfs$/.test(back)) continue;
      d.backing = back;
    }
    let system = false;
    walk(d, (n) => { if ((n.mountpoints || []).some((m) => sysMounts.has(m) || m === '[SWAP]')) system = true; });
    const parts = (d.children || []).filter((c) => c.type === 'part' || c.type === 'crypt' || c.type === 'lvm');
    const vols = parts.length ? parts : (d.fstype ? [d] : []);
    out.push({ ...d, system, rm: !!d.rm || !!d.hotplug, kind: d.type === 'rom' ? 'optical' : /^loop/.test(d.name) ? 'image' : (d.rm || d.hotplug || d.tran === 'usb') ? 'external' : 'internal',
      volumes: vols.map((v) => ({ ...v, mounts: (v.mountpoints || []).filter(Boolean), sys: (v.mountpoints || []).some((m) => sysMounts.has(m) || m === '[SWAP]') })) });
  }
  return out;
}

// ---------------------------------------------------------------- simple actions (no password)
async function udisks(args) {
  const r = await run('udisksctl', args);
  if (!r.ok) return { error: r.err.replace(/^Error [^:]*: (GDBus\.Error:[^:]+: )?/, '').replace(/\s*\(udisks-error-quark, \d+\)/, '') || 'That didn’t work.' };
  return { ok: true, out: r.out };
}
async function mount(dev) { return udisks(['mount', '--no-user-interaction', '-b', dev]).then((r) => (r.error ? udisks(['mount', '-b', dev]) : r)); }
async function unmount(dev) { return udisks(['unmount', '-b', dev]); }
async function eject(disk) {
  const list = await devices();
  const d = list.find((x) => x.path === disk);
  if (d) for (const v of d.volumes) if (v.mounts.length && v.path !== disk) { const r = await unmount(v.path); if (r.error) return r; }
  if (d && d.kind === 'optical') { const r = await run('eject', [disk]); return r.ok ? { ok: true } : { error: r.err }; }
  if (d && d.kind === 'image') return udisks(['loop-delete', '-b', disk]);
  const r = await udisks(['power-off', '-b', disk]);
  return r.error && /not supported|No such interface/i.test(r.error) ? { ok: true } : r;
}
async function attachImage() {
  const s = await sheets.open(win, { properties: ['openFile'], defaultPath: path.join(os.homedir(), 'Downloads') });
  if (!s || s.canceled || !s.filePaths || !s.filePaths[0]) return false;
  await openImageFile(s.filePaths[0]);
  return true;
}

// ---------------------------------------------------------------- helper (administrator) actions, with progress
function helper(args) {
  return new Promise((resolve) => {
    const p = spawn('pkexec', [HELPER, ...args], { env: { ...process.env, LC_ALL: 'C' } });
    let buf = '', result = null, report = null, note = null, errText = '';
    const line = (l) => {
      if (l.startsWith('PROGRESS ')) { const m = l.match(/^PROGRESS (\d+) ?(.*)$/); if (m && win) win.webContents.send('progress', { pct: +m[1], text: m[2] }); }
      else if (l.startsWith('REPORT ')) { try { report = JSON.parse(l.slice(7)); } catch {} }
      else if (l.startsWith('NOTE ')) note = l.slice(5);
      else if (l === 'OK') result = { ok: true };
      else if (l.startsWith('ERROR ')) result = { error: l.slice(6) };
    };
    p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { line(buf.slice(0, i)); buf = buf.slice(i + 1); } });
    p.stderr.on('data', (d) => (errText += d));
    p.on('close', (code) => {
      if (buf) line(buf);
      if (!result) result = code === 126 || code === 127 ? { error: 'You need an administrator password to do that.', cancelled: code === 126 } : { error: errText.trim().split('\n').pop() || 'That didn’t work.' };
      if (report) result.report = report; if (note) result.note = note;
      if (win) win.webContents.send('progress', null);
      resolve(result);
    });
  });
}
async function makeImage(dev, name) {
  const s = await sheets.save(win, { defaultPath: path.join(os.homedir(), 'Documents', `${String(name || 'Disk').replace(/[\\/:*?"<>|]/g, '')}.img`) });
  if (!s || s.canceled || !s.filePath) return false;
  return helper(['image', dev, s.filePath, String(process.getuid()), String(process.getgid())]);
}
const WRITER = '/usr/lib/palos-disks/imagewriter.py';
function imageKind(file) { return run('python3', ['-I', WRITER, 'kind', file], 120000).then((r) => r.out.trim() || 'image'); }
// a startup disk image (an installer: palOS, Linux, Windows, or any disk image with a boot record) only starts a
// computer when it fills the whole disk, from its first byte: never written into one volume of it
function isStartupImage(file) {
  try {
    const fd = fs.openSync(file, 'r'); const b = Buffer.alloc(34 * 1024); fs.readSync(fd, b, 0, b.length, 0); fs.closeSync(fd);
    const mbr = b[510] === 0x55 && b[511] === 0xaa, gpt = b.toString('latin1', 512, 520) === 'EFI PART';
    const iso = b.toString('latin1', 32769, 32774) === 'CD001';
    return mbr || gpt || iso;
  } catch { return false; }
}
async function writeFileTo(file, disk) {
  const kind = await imageKind(file);
  let mode = '';
  if (kind === 'iso-efi') {
    // a CD/DVD-only image with UEFI start-up files: copy its files onto a FAT32 stick (starts any UEFI computer)
    const r = await sheets.message(win, { type: 'question', message: 'Make a USB stick that starts a computer?', detail: 'This image was made for a CD or DVD. Disk Utility can copy its files onto the stick so it starts any UEFI computer (recommended), or copy the image exactly as it is.', buttons: ['Make Startup Stick', 'Copy As Is', 'Cancel'], defaultId: 0, cancelId: 2 });
    if (!r || r.response === 2) return false;
    mode = r.response === 0 ? 'efi' : 'raw';
  } else if (kind === 'iso') {
    const r = await sheets.message(win, { type: 'warning', message: 'This image is made for a CD or DVD.', detail: 'It has no UEFI start-up files, so it may not start a computer from a USB stick. Write it anyway?', buttons: ['Write Anyway', 'Cancel'], defaultId: 1, cancelId: 1 });
    if (!r || r.response !== 0) return false;
  } else if (kind === 'windows') {
    const r = await sheets.message(win, { type: 'info', message: 'This is a Windows installer.', detail: 'Disk Utility will make a Windows installer stick from it, for computers that start with UEFI (every Windows 10 and 11 computer). Large Windows files are split to fit.', buttons: ['Make Installer', 'Cancel'], defaultId: 0, cancelId: 1 });
    if (!r || r.response !== 0) return false;
  }
  const ok = await helper(['restore', file, disk, ...(mode ? [mode] : [])]);
  return ok;
}
async function restoreImage(dev, whole, diskPath, diskLabel) {
  const s = await sheets.open(win, { properties: ['openFile'], defaultPath: path.join(os.homedir(), 'Downloads'),
    filters: [{ name: 'Disk Images', extensions: ['iso', 'img', 'raw', 'bin', 'dd'] }, { name: 'All Files', extensions: ['*'] }] });
  if (!s || s.canceled || !s.filePaths || !s.filePaths[0]) return false;
  const file = s.filePaths[0];
  if (!whole && diskPath && isStartupImage(file)) {
    const r = await sheets.message(win, { type: 'warning', message: `This image starts a computer, so it needs the whole disk.`,
      detail: `Disk Utility will write it to all of “${diskLabel || diskPath}”, replacing everything on that disk (not just the volume you selected).`,
      buttons: ['Use Whole Disk', 'Cancel'], defaultId: 0, cancelId: 1 });
    if (!r || r.response !== 0) return false;
    dev = diskPath; whole = true;
  }
  // the whole disk: the same choices as writing an image from Seeker (a Windows installer, a UEFI startup stick…)
  if (whole) return writeFileTo(file, dev);
  return helper(['restore', file, dev]);
}

// ---------------------------------------------------------------- Disk Usage (as you: it shows what you can read)
// palOS's own icons for the Disk Usage list (the same folder and file icons Seeker shows)
let seekerIcons = null, seekerMime = null;
try { seekerIcons = require('/opt/paladin-seeker/app/main/icons'); seekerMime = require('/opt/paladin-seeker/app/main/mime'); } catch (_) {}
const HOME_DIR = require('os').homedir();
const SPECIAL = { Desktop: 'user-desktop', Documents: 'folder-documents', Downloads: 'folder-download', Music: 'folder-music', Pictures: 'folder-pictures',
  Videos: 'folder-videos', Public: 'folder-publicshare', Templates: 'folder-templates', Applications: 'folder-applications', Utilities: 'folder-utilities' };
function iconFor(i) {
  if (!seekerIcons) return null;
  try {
    const name = path.basename(i.path);
    let names;
    if (!i.file) names = i.path === HOME_DIR ? ['user-home', 'folder'] : (path.dirname(i.path) === HOME_DIR || path.dirname(i.path) === '/') && SPECIAL[name] ? [SPECIAL[name], 'folder'] : ['folder'];
    else { const m = seekerMime ? seekerMime.fromName(name) : null; names = [...(m && seekerMime.iconNames ? seekerMime.iconNames(m) : []), 'text-x-generic', 'unknown']; }
    const f = seekerIcons.lookup(names, 32);
    return f ? 'file://' + f.split('/').map(encodeURIComponent).join('/') : null;
  } catch (_) { return null; }
}
function usage(dir) {
  return new Promise((resolve) => {
    execFile('du', ['-x', '-b', '-d', '1', '--', dir], { timeout: 300000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C' } }, (err, out) => {
      const items = [];
      for (const l of String(out || '').split('\n')) {
        const m = /^(\d+)\t(.+)$/.exec(l); if (!m) continue;
        items.push({ path: m[2], size: +m[1] });
      }
      const self = items.find((i) => i.path === dir) || { size: 0 };
      let files = 0;
      try { for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isFile()) { try { const st = fs.statSync(path.join(dir, e.name)); files += st.size; items.push({ path: path.join(dir, e.name), size: st.size, file: true }); } catch {} } } catch {}
      const list = items.filter((i) => i.path !== dir).sort((a, b) => b.size - a.size).slice(0, 200);
      for (const i of list) i.icon = iconFor(i);
      resolve({ dir, total: self.size, items: list });
    });
  });
}

// ---------------------------------------------------------------- disk images opened from Seeker (palos-disks FILE)
// an image opened from Seeker: open it (its volumes appear), or write it to a disk (a USB stick that starts a computer)
async function openImageFile(file, { write = false } = {}) {
  if (!file || !fs.existsSync(file)) return;
  if (win && win.webContents.isLoading()) await new Promise((r) => win.webContents.once('did-finish-load', () => setTimeout(r, 300)));
  const targets = (await devices()).filter((d) => !d.system && d.kind !== 'optical' && d.kind !== 'image' && !d.ro && d.size >= fs.statSync(file).size);
  const external = targets.filter((d) => d.kind === 'external' || d.rm || d.hotplug);
  const name = path.basename(file);
  const ask = write ? { response: 1 } : await sheets.message(win, { type: 'question', message: `What do you want to do with “${name}”?`,
    detail: external.length ? 'Open it to see what’s inside, or write it to a disk: a USB stick made from an installer image starts a computer.' : 'Open it to see what’s inside. To write it to a USB stick, plug one in first.',
    buttons: ['Cancel', 'Write to a Disk…', 'Open'], defaultId: 2, cancelId: 0 });
  if (!ask || ask.response === 0) return;
  if (ask.response === 1) {
    const list = external.length ? external : targets;
    if (!list.length) return sheets.message(win, { type: 'info', message: 'There’s no disk to write to.', detail: 'Plug in a USB stick (at least as big as the image) and try again.', buttons: ['OK'] });
    const label = (d) => `${[d.vendor, d.model].filter(Boolean).join(' ').trim() || path.basename(d.path)} (${(d.size / 1e9).toFixed(d.size >= 10e9 ? 0 : 1)} GB)`;
    const pick = await sheets.message(win, { type: 'warning', message: 'Which disk should it be written to?',
      detail: 'Everything on that disk is replaced by the image. Disk Utility checks the disk afterwards.',
      buttons: ['Cancel', ...list.slice(0, 4).map(label)], defaultId: 1, cancelId: 0 });
    if (!pick || pick.response === 0) return;
    const d = list[pick.response - 1];
    if (win) win.webContents.send('progress', { text: 'Writing…' });
    const r = await writeFileTo(file, d.path);
    if (r && r.error && !r.cancelled) return sheets.message(win, { type: 'warning', message: 'The image couldn’t be written.', detail: r.error, buttons: ['OK'] });
    if (r && r.ok) { if (win) win.webContents.send('cmd', 'refresh'); return sheets.message(win, { type: 'info', message: 'Done.', detail: `“${name}” is on ${label(d)}. You can unplug it now.`, buttons: ['OK'] }); }
    return;
  }
  const r = await udisks(['loop-setup', '-r', '-f', file]);
  if (r.error) return sheets.message(win, { type: 'warning', message: 'The disk image couldn’t be opened.', detail: r.error, buttons: ['OK'] });
  const m = /as (\/dev\/loop\d+)/.exec(r.out);
  if (m) setTimeout(async () => { const list = await devices(); const d = list.find((x) => x.path === m[1]); for (const v of (d ? d.volumes : [])) if (!v.mounts.length && v.fstype) { const mr = await mount(v.path); const at = /at (.+?)\.?$/m.exec(mr.out || ''); if (at) spawn('xdg-open', [at[1].trim()], { detached: true, stdio: 'ignore' }).unref(); } if (win) win.webContents.send('cmd', 'refresh'); }, 700);
}
const argImages = (argv) => argv.slice(1).filter((a) => /\.(iso|img|dmg|raw)$/i.test(a) && fs.existsSync(a));

// ---------------------------------------------------------------- IPC
const H = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => { try { return await fn(...a); } catch (err) { return { error: String(err.message || err) }; } });
H('devices', devices);
H('mount', mount); H('unmount', unmount); H('eject', eject); H('attach', attachImage);
H('erase', (disk, scheme, fsType, name) => helper(['erase', disk, scheme, fsType, name || '']));
H('format', (part, fsType, name) => helper(['format', part, fsType, name || '']));
H('add', (disk, start, size, fsType, name) => helper(['add', disk, String(start), String(size), fsType, name || '']));
H('delete', (part) => helper(['delete', part]));
H('resize', (part, size) => helper(['resize', part, String(size)]));
H('check', (part) => helper(['check', part]));
H('repair', (part) => helper(['repair', part]));
H('rename', (part, name) => helper(['rename', part, name]));
H('image', makeImage); H('restore', restoreImage); H('usage', usage);
H('open', (p) => { spawn('xdg-open', [p], { detached: true, stdio: 'ignore' }).unref(); return true; });
ipcMain.handle('ui:message', (e, o) => sheets.message(win, o));
ipcMain.handle('ui:prompt', (e, o) => sheets.prompt(win, o));

function create() {
  win = new BrowserWindow({ width: 980, height: 640, minWidth: 780, minHeight: 480, title: 'Disk Utility', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2', icon: '/usr/share/icons/hicolor/256x256/apps/palos-disks.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; app.quit(); });
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Open Disk Image…', accelerator: 'Ctrl+O', click: send('attach') }, { label: 'New Image from Disk…', click: send('image') }, { label: 'Write Image to Disk…', accelerator: 'Ctrl+Shift+W', click: send('restore') }, { label: 'Make a Startup USB from an Image…', click: async () => {
      const r = await sheets.open(win, { properties: ['openFile'], defaultPath: path.join(os.homedir(), 'Downloads'), filters: [{ name: 'Installer Images', extensions: ['iso', 'img'] }, { name: 'All Files', extensions: ['*'] }] });
      if (r && !r.canceled && r.filePaths && r.filePaths[0]) openImageFile(r.filePaths[0], { write: true });
    } }, { type: 'separator' }, { label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() }, { label: 'Quit Disk Utility', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [{ role: 'copy', label: 'Copy' }, { role: 'selectAll', label: 'Select All' }] },
    { label: 'Disk', submenu: [{ label: 'Check Disk…', click: send('check') }, { label: 'Partition…', click: send('partition') }, { label: 'Erase…', click: send('erase') }, { type: 'separator' }, { label: 'Mount', click: send('mount') }, { label: 'Unmount', click: send('unmount') }, { label: 'Eject', accelerator: 'Ctrl+E', click: send('eject') }] },
    { label: 'View', submenu: [{ label: 'Disk Usage', accelerator: 'Ctrl+U', click: send('usage') }, { type: 'separator' }, { label: 'Refresh', accelerator: 'Ctrl+R', click: send('refresh') }] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }] },
  ]));
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (e, argv) => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } argImages(argv).forEach(openImageFile); });
  app.whenReady().then(() => { create(); argImages(process.argv).forEach(openImageFile); });
}

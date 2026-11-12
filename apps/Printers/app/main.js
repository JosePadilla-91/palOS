'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Printers: add printers (found on the network or plugged in), choose the default, see what's printing.
const { app, BrowserWindow, Menu, ipcMain, nativeTheme } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const sheets = require('./sheets');

app.setName('Printers');
if (process.platform === 'linux') app.setDesktopName('palos-printers.desktop');
let win = null;

function run(cmd, args, timeout = 30000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C', LANG: 'C' } }, (err, out, errout) =>
      resolve({ ok: !err, out: String(out || ''), err: String(errout || (err && err.message) || '').trim() }));
  });
}
/** Administrator commands: straight away if this account may manage printers, otherwise with a password (pkexec). */
async function admin(cmd, args) {
  let r = await run(cmd, args);
  if (!r.ok && /forbidden|not authorized|permission|unauthorized|lpadmin: Forbidden/i.test(r.err)) r = await run('pkexec', [cmd, ...args], 300000);
  if (!r.ok && /dismissed|Not authorized|Request dismissed/i.test(r.err)) r.err = 'You need an administrator password to do that.';
  return r;
}

// ---------------------------------------------------------------- printers
async function printers() {
  const names = (await run('lpstat', ['-e'])).out.split('\n').map((s) => s.trim()).filter(Boolean);
  const def = ((await run('lpstat', ['-d'])).out.match(/destination:\s*(\S+)/) || [])[1] || null;
  const status = (await run('lpstat', ['-l', '-p'])).out;
  const jobs = await queue();
  const out = [];
  for (const n of names) {
    const o = (await run('lpoptions', ['-p', n])).out;
    const opt = {}; for (const m of o.matchAll(/(\S+?)=('([^']*)'|(\S*))/g)) opt[m[1]] = m[3] ?? m[4];
    const block = (status.split(/\n(?=printer )/).find((b) => b.startsWith(`printer ${n} `)) || '');
    const state = /disabled/.test(block.split('\n')[0]) ? 'paused' : /now printing/.test(block) ? 'printing' : 'idle';
    const alerts = ((block.match(/Alerts:\s*(.*)/) || [])[1] || '').trim();
    const second = (block.split('\n')[1] || '').trim();
    const msg = /^[A-Z][\w ]*:/.test(second) ? '' : second;    // "Form mounted:", "Alerts:" … aren't messages
    out.push({ name: n, info: opt['printer-info'] || n, location: opt['printer-location'] || '', model: opt['printer-make-and-model'] || '', uri: opt['device-uri'] || '',
      isDefault: n === def, state, message: msg, alerts, jobs: jobs.filter((j) => j.printer === n), shared: opt['printer-is-shared'] === 'true' });
  }
  return out;
}
async function queue() {
  const r = await run('lpstat', ['-o']);
  const out = [];
  for (const line of r.out.split('\n')) {
    const m = line.match(/^(\S+)-(\d+)\s+(\S+)\s+(\d+)\s+(.*)$/);
    if (m) out.push({ printer: m[1], id: `${m[1]}-${m[2]}`, user: m[3], size: +m[4], when: m[5] });
  }
  return out;
}
async function options(name) {
  const r = await run('lpoptions', ['-p', name, '-l']);
  const WANT = { PageSize: 'Paper size', media: 'Paper size', Duplex: 'Two-sided', 'sides': 'Two-sided', ColorModel: 'Colour', 'print-color-mode': 'Colour', InputSlot: 'Paper tray', 'print-quality': 'Quality', cupsPrintQuality: 'Quality', MediaType: 'Paper type' };
  const out = [];
  for (const line of r.out.split('\n')) {
    const m = line.match(/^([^/:]+)\/([^:]*):\s*(.*)$/); if (!m) continue;
    const key = m[1]; if (!WANT[key] || out.some((o) => o.label === WANT[key])) continue;
    const choices = m[3].split(/\s+/).filter(Boolean).map((c) => ({ value: c.replace(/^\*/, ''), on: c.startsWith('*') }));
    out.push({ key, label: WANT[key], choices: choices.map((c) => c.value), value: (choices.find((c) => c.on) || choices[0] || {}).value });
  }
  return out;
}

// ---------------------------------------------------------------- finding printers
async function discover() {
  const found = new Map();
  const add = (uri, name, kind) => { if (!uri || found.has(uri)) return; found.set(uri, { uri, name: name || uri, kind }); };
  const [dl, li] = await Promise.all([run('driverless', [], 20000), run('lpinfo', ['-l', '-v', '--timeout', '8'], 25000)]);
  for (const u of dl.out.split('\n').map((s) => s.trim()).filter(Boolean)) add(u, decodeURIComponent((u.match(/^\w+:\/\/([^._]+)/) || [])[1] || u).replace(/%20/g, ' '), 'network');
  let cur = null;
  for (const line of li.out.split('\n')) {
    const d = line.match(/^Device: uri = (.*)$/); if (d) { cur = { uri: d[1].trim() }; continue; }
    const kv = line.match(/^\s+(\w[\w-]*) = (.*)$/); if (cur && kv) { cur[kv[1]] = kv[2].trim(); if (kv[1] === 'make-and-model' || kv[1] === 'info') { /* collect */ } }
    if (cur && cur.class && cur.info !== undefined && cur['make-and-model'] !== undefined) {
      if (cur.class === 'direct' || (cur.class === 'network' && /^(dnssd|ipps?|socket|lpd):\/\/./.test(cur.uri))) add(cur.uri, cur.info && cur.info !== 'Unknown' ? cur.info : cur['make-and-model'], cur.class === 'direct' ? 'usb' : 'network');
      cur = null;
    }
  }
  const have = new Set((await printers()).map((p) => p.uri));
  return [...found.values()].filter((f) => !have.has(f.uri) && !/^(file|cups-pdf|beh|serial|parallel|hp|hpfax|smb|https?)[:/]*$/.test(f.uri));
}
async function drivers(q) {
  const r = await run('lpinfo', ['-m'], 60000);
  const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  return r.out.split('\n').map((l) => { const i = l.indexOf(' '); return { id: l.slice(0, i), name: l.slice(i + 1) }; }).filter((d) => d.id && words.every((w) => d.name.toLowerCase().includes(w))).slice(0, 200);
}
const safeName = (s) => String(s || 'Printer').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'Printer';
async function addPrinter({ uri, name, location, driver }) {
  const n = safeName(name);
  const args = ['-p', n, '-E', '-v', uri, '-D', name || n];
  if (location) args.push('-L', location);
  if (driver && driver !== 'auto') args.push('-m', driver);
  else if (/^(ipps?|dnssd):/.test(uri) || /^ipp/.test(uri)) args.push('-m', 'everywhere');
  let r = await admin('lpadmin', args);
  if (!r.ok && /everywhere/.test(args.join(' '))) {           // not an IPP Everywhere printer: let CUPS pick a driver
    const i = args.indexOf('everywhere'); args.splice(i - 1, 2);
    r = await admin('lpadmin', args);
  }
  if (!r.ok) return { error: r.err || 'The printer couldn’t be added.' };
  const have = await printers(); if (have.length === 1) await run('lpoptions', ['-d', n]);
  return { ok: true, name: n };
}

// ---------------------------------------------------------------- IPC
const H = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => { try { return await fn(...a); } catch (err) { return { error: String(err.message || err) }; } });
H('printers', printers);
H('options', options);
H('setOption', async (n, k, v) => (await run('lpoptions', ['-p', n, '-o', `${k}=${v}`])).ok);
H('discover', discover);
H('drivers', drivers);
H('add', addPrinter);
H('setDefault', async (n) => (await run('lpoptions', ['-d', n])).ok);
H('testPage', async (n) => { const r = await run('lp', ['-d', n, '-t', 'Test Page', '/usr/share/cups/data/default-testpage.pdf']); return r.ok ? true : { error: r.err }; });
H('cancel', async (id) => (await run('cancel', [id])).ok || { error: 'That job couldn’t be cancelled.' });
H('cancelAll', async (n) => (await run('cancel', ['-a', n])).ok);
H('pause', async (n) => { const r = await admin('cupsdisable', [n]); return r.ok || { error: r.err }; });
H('resume', async (n) => { const r = await admin('cupsenable', [n]); return r.ok || { error: r.err }; });
H('remove', async (n) => { const r = await admin('lpadmin', ['-x', n]); return r.ok || { error: r.err }; });
H('rename', async (n, info, loc) => { const r = await admin('lpadmin', ['-p', n, '-D', info, '-L', loc || '']); return r.ok || { error: r.err }; });
H('share', async (n, on) => { const r = await admin('lpadmin', ['-p', n, '-o', `printer-is-shared=${on ? 'true' : 'false'}`]); return r.ok || { error: r.err }; });
ipcMain.handle('ui:message', (e, o) => sheets.message(win, o));
ipcMain.handle('ui:prompt', (e, o) => sheets.prompt(win, o));

function create() {
  win = new BrowserWindow({ width: 880, height: 600, minWidth: 700, minHeight: 440, title: 'Printers', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2', icon: '/usr/share/icons/hicolor/256x256/apps/palos-printers.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; app.quit(); });
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Add Printer…', accelerator: 'Ctrl+N', click: send('add') }, { label: 'Print Test Page', click: send('test') }, { type: 'separator' }, { label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() }, { label: 'Quit Printers', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [{ role: 'cut', label: 'Cut' }, { role: 'copy', label: 'Copy' }, { role: 'paste', label: 'Paste' }, { role: 'selectAll', label: 'Select All' }] },
    { label: 'View', submenu: [{ label: 'Refresh', accelerator: 'Ctrl+R', click: send('refresh') }] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }] },
  ]));
}
if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } }); app.whenReady().then(create); }

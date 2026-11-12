'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Advanced Network Settings: every saved network connection (Wi-Fi, Ethernet, VPN…) with all its settings:
// addresses, DNS, IPv6, proxy, Wi-Fi security, private addresses, metered, priority. Uses NetworkManager (nmcli).
const { app, BrowserWindow, Menu, ipcMain, nativeTheme } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const sheets = require('./sheets');

app.setName('Advanced Network Settings');
if (process.platform === 'linux') app.setDesktopName('palos-network.desktop');
let win = null;

function run(args, timeout = 30000) {
  return new Promise((resolve) => {
    execFile('nmcli', args, { timeout, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C', LANG: 'C' } }, (err, out, errout) =>
      resolve({ ok: !err, out: String(out || ''), err: String(errout || (err && err.message) || '').replace(/^Error: /, '').trim() }));
  });
}
// nmcli --terse escapes ':' and '\' inside values
function splitTerse(line) {
  const out = []; let cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && i + 1 < line.length) { cur += line[++i]; continue; }
    if (c === ':') { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

const TYPES = { '802-11-wireless': 'wifi', '802-3-ethernet': 'ethernet', vpn: 'vpn', wireguard: 'wireguard', gsm: 'mobile', cdma: 'mobile', bridge: 'bridge', bond: 'bond', vlan: 'vlan', 'pppoe': 'pppoe', loopback: 'loopback', 'bluetooth': 'bluetooth', tun: 'tun' };
async function connections() {
  const r = await run(['-t', '-f', 'NAME,UUID,TYPE,DEVICE,ACTIVE,AUTOCONNECT,TIMESTAMP', 'connection', 'show']);
  if (!r.ok) return { error: !r.err || /not running/i.test(r.err) ? 'NetworkManager isn’t running.' : friendly(r.err) };
  return r.out.split('\n').filter(Boolean).map(splitTerse).map(([name, uuid, type, device, active, auto, ts]) => ({ name, uuid, type: TYPES[type] || type, rawType: type, device: device || '', active: active === 'yes', auto: auto === 'yes', last: +ts || 0 }))
    .filter((c) => c.type !== 'loopback');
}

/** Every setting of one connection: { 'ipv4.method': 'auto', … }. Secrets only when asked (may ask for a password). */
async function settings(uuid, secrets) {
  const r = await run(['--terse', '--mode', 'multiline', ...(secrets ? ['--show-secrets'] : []), 'connection', 'show', 'uuid', uuid]);
  if (!r.ok) return { error: r.err };
  const s = {};
  for (const line of r.out.split('\n')) {
    const i = line.indexOf(':'); if (i < 1) continue;
    const k = line.slice(0, i), v = line.slice(i + 1);
    if (/^[A-Z]/.test(k)) { s['$' + k] = v; continue; }     // run-time details (IP4.ADDRESS[1], GENERAL.STATE…)
    s[k] = v === '--' ? '' : v;
  }
  return s;
}
async function deviceInfo(dev) {
  if (!dev) return null;
  const r = await run(['--terse', '--mode', 'multiline', 'device', 'show', dev]);
  const d = {}; for (const line of r.out.split('\n')) { const i = line.indexOf(':'); if (i > 0) d[line.slice(0, i)] = line.slice(i + 1); }
  let speed = null;
  try { speed = require('fs').readFileSync(`/sys/class/net/${dev}/speed`, 'utf8').trim(); if (+speed <= 0) speed = null; } catch {}
  return { mac: d['GENERAL.HWADDR'] || '', mtu: d['GENERAL.MTU'] || '', speed, driver: d['GENERAL.DRIVER'] || '', ip4: Object.keys(d).filter((k) => k.startsWith('IP4.ADDRESS')).map((k) => d[k]), gw4: d['IP4.GATEWAY'] || '',
    dns4: Object.keys(d).filter((k) => k.startsWith('IP4.DNS')).map((k) => d[k]), ip6: Object.keys(d).filter((k) => k.startsWith('IP6.ADDRESS')).map((k) => d[k]), gw6: d['IP6.GATEWAY'] || '' };
}

function friendly(err) {
  if (/not authorized|Insufficient privileges|permission/i.test(err)) return 'You need an administrator password to change this connection.';
  if (/invalid IP address|invalid.*address/i.test(err)) return 'One of the addresses isn’t valid. Addresses look like 192.168.1.20/24 (IPv4) or 2001:db8::20/64 (IPv6).';
  if (/gateway/i.test(err)) return 'The gateway isn’t valid, or doesn’t belong to the addresses you entered.';
  if (/method.*manual.*requires|at least one address/i.test(err)) return 'Manual needs at least one address.';
  if (/psk.*invalid|password.*invalid/i.test(err)) return 'Wi-Fi passwords have 8 to 63 characters.';
  return err || 'That didn’t work.';
}

// ---------------------------------------------------------------- IPC
const H = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => { try { return await fn(...a); } catch (err) { return { error: String(err.message || err) }; } });
H('list', connections);
H('settings', async (uuid, secrets) => {
  const s = await settings(uuid, secrets);
  if (s.error) return s;
  const dev = s['$GENERAL.DEVICES'] || '';
  return { settings: s, device: await deviceInfo(dev.split(',')[0]) };
});
H('user', () => require('os').userInfo().username);
H('save', async (uuid, changes) => {
  for (const setting of (changes && changes['-remove']) || []) {
    if (!/^[a-z0-9-]+$/.test(setting)) continue;
    const r = await run(['connection', 'modify', 'uuid', uuid, 'remove', setting]);
    if (!r.ok) return { error: friendly(r.err) };
  }
  const args = ['connection', 'modify', 'uuid', uuid];
  for (const [k, v] of Object.entries(changes || {})) { if (!/^[a-z0-9-]+\.[a-z0-9-]+$/.test(k)) continue; args.push(k, v == null ? '' : String(v)); }
  if (args.length === 4) return { ok: true };
  const r = await run(args);
  return r.ok ? { ok: true } : { error: friendly(r.err) };
});
H('reconnect', async (uuid) => { const r = await run(['connection', 'up', 'uuid', uuid], 90000); return r.ok ? { ok: true } : { error: friendly(r.err) }; });
H('disconnect', async (uuid) => { const r = await run(['connection', 'down', 'uuid', uuid]); return r.ok ? { ok: true } : { error: friendly(r.err) }; });
H('delete', async (uuid) => { const r = await run(['connection', 'delete', 'uuid', uuid]); return r.ok ? { ok: true } : { error: friendly(r.err) }; });
H('duplicate', async (uuid, name) => { const r = await run(['connection', 'clone', 'uuid', uuid, name]); return r.ok ? { ok: true } : { error: friendly(r.err) }; });
H('add', async (kind, o = {}) => {
  let args;
  if (kind === 'ethernet') args = ['connection', 'add', 'type', 'ethernet', 'con-name', o.name || 'Wired connection', 'ifname', '*'];
  else if (kind === 'wifi') {
    args = ['connection', 'add', 'type', 'wifi', 'con-name', o.name || o.ssid, 'ifname', '*', 'ssid', o.ssid, 'wifi.hidden', o.hidden ? 'yes' : 'no'];
    if (o.password) args.push('wifi-sec.key-mgmt', 'wpa-psk', 'wifi-sec.psk', o.password);
  } else return { error: 'Unknown kind of connection.' };
  const r = await run(args);
  if (!r.ok) return { error: friendly(r.err) };
  const m = r.out.match(/\(([0-9a-f-]{36})\)/); return { ok: true, uuid: m ? m[1] : null };
});
H('import', async () => {
  const r = await sheets.open(win, { title: 'Import a VPN Configuration', properties: ['openFile'], filters: [{ name: 'VPN configurations', extensions: ['ovpn', 'conf', 'pcf'] }, { name: 'All Files', extensions: ['*'] }] });
  if (!r || r.canceled || !r.filePaths[0]) return { cancelled: true };
  const f = r.filePaths[0];
  const type = /\.pcf$/i.test(f) ? 'vpnc' : /\.conf$/i.test(f) && /\[Interface\]/.test(require('fs').readFileSync(f, 'utf8')) ? 'wireguard' : 'openvpn';
  const x = await run(['connection', 'import', 'type', type, 'file', f]);
  if (!x.ok) return { error: /plugin|not.*installed|unknown VPN/i.test(x.err) ? `This kind of VPN (${type}) isn’t installed. The palOS Store has the VPN add-ons.` : friendly(x.err) };
  const m = x.out.match(/\(([0-9a-f-]{36})\)/); return { ok: true, uuid: m ? m[1] : null };
});
ipcMain.handle('ui:message', (e, o) => sheets.message(win, o));
ipcMain.handle('ui:prompt', (e, o) => sheets.prompt(win, o));

// keep the list current while NetworkManager changes things (connecting, a new Wi-Fi network saved…)
let monitor = null;
function watch() {
  try {
    monitor = require('child_process').spawn('nmcli', ['monitor'], { env: { ...process.env, LC_ALL: 'C' } });
    let t = null;
    monitor.stdout.on('data', () => { clearTimeout(t); t = setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.send('changed'); }, 600); });
    monitor.on('error', () => {});
  } catch {}
}

function create() {
  win = new BrowserWindow({ width: 960, height: 660, minWidth: 780, minHeight: 500, title: 'Advanced Network Settings', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2', icon: '/usr/share/icons/hicolor/256x256/apps/palos-network.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; app.quit(); });
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'New Wired Connection', click: send('addEthernet') }, { label: 'New Wi-Fi Connection…', click: send('addWifi') }, { label: 'Import VPN Configuration…', click: send('import') }, { type: 'separator' },
      { label: 'Duplicate', click: send('duplicate') }, { label: 'Delete…', click: send('delete') }, { type: 'separator' },
      { label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() }, { label: 'Quit Advanced Network Settings', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [{ role: 'undo', label: 'Undo' }, { role: 'redo', label: 'Redo' }, { type: 'separator' }, { role: 'cut', label: 'Cut' }, { role: 'copy', label: 'Copy' }, { role: 'paste', label: 'Paste' }, { role: 'selectAll', label: 'Select All' }] },
    { label: 'View', submenu: [{ label: 'Refresh', accelerator: 'Ctrl+R', click: send('refresh') }] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }] },
  ]));
  watch();
}
app.on('will-quit', () => { try { if (monitor) monitor.kill(); } catch {} });
if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } }); app.whenReady().then(create); }

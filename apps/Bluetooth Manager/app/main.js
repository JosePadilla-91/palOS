'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Bluetooth Manager: turn Bluetooth on or off, pair and connect headphones, keyboards, mice, phones and
// speakers, see their batteries, rename or forget them. Talks to BlueZ (the Linux Bluetooth service) over D-Bus.
const { app, BrowserWindow, Menu, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const dbus = require('dbus-next');
const sheets = require('./sheets');
const { Variant } = dbus;

app.setName('Bluetooth Manager');
if (process.platform === 'linux') app.setDesktopName('palos-bluetooth.desktop');
let win = null;
let bus = null;
let objects = {};                       // path -> { iface: { prop: value } }
const AGENT_PATH = '/org/palos/bluetooth/agent';

// ---------------------------------------------------------------- BlueZ objects
const plain = (v) => (v instanceof Variant ? plain(v.value) : Array.isArray(v) ? v.map(plain) : v && typeof v === 'object' && !Buffer.isBuffer(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)])) : v);
async function bluez(p, iface) { const o = await bus.getProxyObject('org.bluez', p); return o.getInterface(iface); }
async function props(p) { const o = await bus.getProxyObject('org.bluez', p); return o.getInterface('org.freedesktop.DBus.Properties'); }
async function setProp(p, iface, name, sig, value) { (await props(p)).Set(iface, name, new Variant(sig, value)); }

async function connectBus() {
  bus = dbus.systemBus();
  const root = await bus.getProxyObject('org.bluez', '/');
  const om = root.getInterface('org.freedesktop.DBus.ObjectManager');
  objects = plain(await om.GetManagedObjects());
  om.on('InterfacesAdded', (p, ifaces) => { objects[p] = { ...(objects[p] || {}), ...plain(ifaces) }; changed(); });
  om.on('InterfacesRemoved', (p, names) => { if (objects[p]) { for (const n of names) delete objects[p][n]; if (!Object.keys(objects[p]).length) delete objects[p]; } changed(); });
  // every property change from BlueZ (connected, battery, powered…)
  const dbusIface = (await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus')).getInterface('org.freedesktop.DBus');
  await dbusIface.AddMatch("type='signal',sender='org.bluez',interface='org.freedesktop.DBus.Properties',member='PropertiesChanged'").catch(() => {});
  bus.on('message', (m) => {
    if (m.interface !== 'org.freedesktop.DBus.Properties' || m.member !== 'PropertiesChanged' || !m.path.startsWith('/org/bluez')) return;
    const [iface, ch, gone] = m.body;
    const o = (objects[m.path] = objects[m.path] || {});
    o[iface] = { ...(o[iface] || {}), ...plain(ch) };
    for (const g of gone || []) delete o[iface][g];
    changed();
  });
  await registerAgent();
}

let tmr = null;
function changed() { clearTimeout(tmr); tmr = setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.send('state', state()); }, 120); }

function state() {
  const adapters = Object.entries(objects).filter(([, o]) => o['org.bluez.Adapter1']).map(([p, o]) => ({ path: p, ...o['org.bluez.Adapter1'] }));
  const a = adapters[0] || null;
  const devices = Object.entries(objects).filter(([, o]) => o['org.bluez.Device1'] && (!a || o['org.bluez.Device1'].Adapter === a.path)).map(([p, o]) => {
    const d = o['org.bluez.Device1'];
    return { path: p, name: d.Alias || d.Name || d.Address, address: d.Address, icon: d.Icon || '', paired: !!d.Paired, bonded: !!d.Bonded, trusted: !!d.Trusted, connected: !!d.Connected,
      rssi: d.RSSI ?? null, battery: o['org.bluez.Battery1'] ? o['org.bluez.Battery1'].Percentage : null, hasName: !!d.Name, blocked: !!d.Blocked };
  });
  return { available: !!a, adapter: a && { path: a.path, name: a.Alias || a.Name, powered: !!a.Powered, discoverable: !!a.Discoverable, discovering: !!a.Discovering, address: a.Address, state: a.PowerState || '' }, devices };
}

// ---------------------------------------------------------------- pairing: palOS answers BlueZ's questions in this window
function ask(kind, info) {
  if (!win || win.isDestroyed()) return Promise.resolve(null);
  win.show(); win.focus();
  return sheets.message(win, info).then((r) => (r ? r.response : null));
}
const devName = (p) => { const d = objects[p] && objects[p]['org.bluez.Device1']; return d ? (d.Alias || d.Name || d.Address) : 'The device'; };
const Rejected = () => new dbus.DBusError('org.bluez.Error.Rejected', 'Rejected');
const Canceled = () => new dbus.DBusError('org.bluez.Error.Canceled', 'Canceled');
class Agent extends dbus.interface.Interface {
  async RequestPinCode(device) {
    const r = await sheets.prompt(win, { title: 'Bluetooth PIN', message: `Type the PIN for “${devName(device)}”`, detail: 'Many devices use 0000 or 1234. The device’s instructions say which.', value: '0000', ok: 'Pair' });
    if (!r) throw Canceled(); return String(r).slice(0, 16);
  }
  DisplayPinCode(device, pin) { ask('display', { type: 'info', message: `Type ${pin} on “${devName(device)}”`, detail: 'Then press Enter on it.', buttons: ['OK'] }); }
  async RequestPasskey(device) {
    const r = await sheets.prompt(win, { title: 'Bluetooth passkey', message: `Type the number shown on “${devName(device)}”`, value: '', ok: 'Pair' });
    if (!r || !/^\d{1,6}$/.test(String(r).trim())) throw Canceled(); return parseInt(r, 10);
  }
  DisplayPasskey(device, passkey) { ask('display', { type: 'info', message: `Type ${String(passkey).padStart(6, '0')} on “${devName(device)}”`, detail: 'Then press Enter on it.', buttons: ['OK'] }); }
  async RequestConfirmation(device, passkey) {
    const r = await ask('confirm', { type: 'question', message: `Pair with “${devName(device)}”?`, detail: `Check that it shows this number: ${String(passkey).padStart(6, '0')}`, buttons: ['Cancel', 'Pair'], defaultId: 1, cancelId: 0 });
    if (r !== 1) throw Rejected();
  }
  async RequestAuthorization(device) {
    const r = await ask('auth', { type: 'question', message: `Pair with “${devName(device)}”?`, buttons: ['Cancel', 'Pair'], defaultId: 1, cancelId: 0 });
    if (r !== 1) throw Rejected();
  }
  async AuthorizeService(device) {
    const d = objects[device] && objects[device]['org.bluez.Device1'];
    if (d && (d.Paired || d.Trusted)) return;
    const r = await ask('auth', { type: 'question', message: `Allow “${devName(device)}” to connect?`, buttons: ['Don’t Allow', 'Allow'], defaultId: 1, cancelId: 0 });
    if (r !== 1) throw Rejected();
  }
  Cancel() {}
  Release() {}
}
Agent.configureMembers({ methods: {
  RequestPinCode: { inSignature: 'o', outSignature: 's' }, DisplayPinCode: { inSignature: 'os', outSignature: '' },
  RequestPasskey: { inSignature: 'o', outSignature: 'u' }, DisplayPasskey: { inSignature: 'ouq', outSignature: '' },
  RequestConfirmation: { inSignature: 'ou', outSignature: '' }, RequestAuthorization: { inSignature: 'o', outSignature: '' },
  AuthorizeService: { inSignature: 'os', outSignature: '' }, Cancel: { inSignature: '', outSignature: '' }, Release: { inSignature: '', outSignature: '' },
} });
async function registerAgent() {
  try {
    bus.export(AGENT_PATH, new Agent('org.bluez.Agent1'));
    const am = await bluez('/org/bluez', 'org.bluez.AgentManager1');
    await am.RegisterAgent(AGENT_PATH, 'KeyboardDisplay');
    await am.RequestDefaultAgent(AGENT_PATH);            // while this window is open, it answers (the background helper otherwise)
  } catch (e) { console.error('bluetooth: agent:', e.message); }
}

// ---------------------------------------------------------------- actions
function friendly(e) {
  const n = (e && (e.type || e.name || '')) + ' ' + (e && e.text || e && e.message || '');
  if (/AuthenticationFailed|AuthenticationRejected|Rejected/i.test(n)) return 'Pairing didn’t work. Check the number or PIN, and that the device is ready to pair.';
  if (/AuthenticationCanceled|Canceled/i.test(n)) return null;
  if (/AuthenticationTimeout|Timeout|NoReply|timed out/i.test(n)) return 'The device didn’t answer. Make sure it’s on, nearby, and ready to pair.';
  if (/AlreadyExists/i.test(n)) return 'It’s already paired.';
  if (/InProgress/i.test(n)) return 'Wait a moment: it’s still busy with the last request.';
  if (/Blocked|rfkill/i.test(n)) return 'Bluetooth is switched off by the computer (airplane mode or a Bluetooth key). Turn it back on there first.';
  if (/NotReady/i.test(n)) return 'Bluetooth isn’t ready. Turn it on first.';
  if (/ConnectionAttemptFailed|page-timeout|br-connection|Host is down/i.test(n)) return 'Couldn’t connect. Make sure the device is on and nearby (and not connected to another device).';
  if (/NotAvailable|NotSupported|profile-unavailable/i.test(n)) return 'This device can’t connect to this computer that way.';
  return 'That didn’t work. ' + String((e && (e.text || e.message)) || '').slice(0, 160);
}
const act = (fn) => async (...a) => { try { await fn(...a); return true; } catch (e) { const m = friendly(e); return m ? { error: m } : { cancelled: true }; } };
const adapterPath = () => (state().adapter || {}).path;
function rfkillUnblock() { return new Promise((r) => execFile('rfkill', ['unblock', 'bluetooth'], () => r())); }

const H = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => { try { return await fn(...a); } catch (err) { return { error: friendly(err) }; } });
H('state', () => state());
H('power', act(async (on) => { if (on) await rfkillUnblock(); await setProp(adapterPath(), 'org.bluez.Adapter1', 'Powered', 'b', !!on); }));
H('discoverable', act(async (on) => { await setProp(adapterPath(), 'org.bluez.Adapter1', 'DiscoverableTimeout', 'u', 0); await setProp(adapterPath(), 'org.bluez.Adapter1', 'Discoverable', 'b', !!on); }));
H('rename', act(async (name) => { await setProp(adapterPath(), 'org.bluez.Adapter1', 'Alias', 's', String(name).slice(0, 248)); }));
H('search', act(async (on) => {
  const ad = await bluez(adapterPath(), 'org.bluez.Adapter1');
  if (on) { try { await ad.SetDiscoveryFilter({ Transport: new Variant('s', 'auto') }); } catch {} await ad.StartDiscovery(); } else await ad.StopDiscovery();
}));
H('pair', act(async (p) => {
  const d = await bluez(p, 'org.bluez.Device1');
  await d.Pair();
  try { await setProp(p, 'org.bluez.Device1', 'Trusted', 'b', true); } catch {}
  try { await d.Connect(); } catch {}                   // most things should simply work once paired
}));
H('connect', act(async (p) => (await bluez(p, 'org.bluez.Device1')).Connect()));
H('disconnect', act(async (p) => (await bluez(p, 'org.bluez.Device1')).Disconnect()));
H('cancelPair', act(async (p) => (await bluez(p, 'org.bluez.Device1')).CancelPairing()));
H('renameDevice', act(async (p, name) => setProp(p, 'org.bluez.Device1', 'Alias', 's', String(name).slice(0, 248))));
H('forget', act(async (p) => (await bluez(adapterPath(), 'org.bluez.Adapter1')).RemoveDevice(p)));
ipcMain.handle('ui:message', (e, o) => sheets.message(win, o));
ipcMain.handle('ui:prompt', (e, o) => sheets.prompt(win, o));

function create() {
  win = new BrowserWindow({ width: 640, height: 640, minWidth: 520, minHeight: 460, title: 'Bluetooth Manager', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2', icon: '/usr/share/icons/hicolor/256x256/apps/palos-bluetooth.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; app.quit(); });
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() }, { label: 'Quit Bluetooth Manager', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [{ role: 'cut', label: 'Cut' }, { role: 'copy', label: 'Copy' }, { role: 'paste', label: 'Paste' }, { role: 'selectAll', label: 'Select All' }] },
    { label: 'View', submenu: [{ label: 'Look for Devices Again', accelerator: 'Ctrl+R', click: send('search') }] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }] },
  ]));
}
async function stopSearching() { try { const p = adapterPath(); if (p && state().adapter.discovering) await (await bluez(p, 'org.bluez.Adapter1')).StopDiscovery(); } catch {} }
// give pairing questions back to the background helper
async function unregisterAgent() { try { await (await bluez('/org/bluez', 'org.bluez.AgentManager1')).UnregisterAgent(AGENT_PATH); } catch {} }
let quitting = false;
app.on('before-quit', (e) => {
  if (quitting) return;
  e.preventDefault(); quitting = true;
  Promise.race([Promise.all([stopSearching(), unregisterAgent()]), new Promise((r) => setTimeout(r, 1500))]).finally(() => app.quit());
});
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(async () => {
    try { await connectBus(); } catch (e) { console.error('bluetooth:', e.message); objects = {}; }
    create();
  });
}

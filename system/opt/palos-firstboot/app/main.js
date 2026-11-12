'use strict';
try { require('/usr/lib/palos-theme/main.js'); } catch (_) {}
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// palOS setup: the first thing a new palOS computer shows after installing.
// Welcome film (once) -> Wi-Fi -> new account (and light or dark) or restore from Time Turner -> the login screen.
const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

app.setName('palOS Setup');
app.commandLine.appendSwitch('disable-features', 'GlobalShortcutsPortal');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// software video mode (run-setup sets this after the film's hardware decoding failed): the processor decodes everything
if (process.env.PALOS_FILM_SOFTWARE === '1') {
  app.commandLine.appendSwitch('disable-accelerated-video-decode');
  app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
}

const SOCK = '/run/palos-firstboot/helper.sock';
// the welcome film: VP9 video and Opus sound in Matroska (royalty-free, plays with no codec pack installed)
const FILM = '/usr/share/palos/welcome.mkv';
const SEEN = path.join(app.getPath('home'), '.video-seen');
const STARTED = path.join(app.getPath('home'), '.video-started');
const TEST = process.env.PALOS_SETUP_TEST === '1';   // run on a normal desktop without the helper (development only)

// ---------------------------------------------------------------- root helper
function helper(action, data = {}) {
  if (TEST) return fakeHelper(action, data);
  return new Promise((resolve) => {
    let buf = '';
    const s = net.createConnection(SOCK);
    const t = setTimeout(() => { s.destroy(); resolve({ ok: false, error: 'Setup’s helper isn’t answering.' }); }, 120000);
    s.on('connect', () => s.write(JSON.stringify({ action, ...data }) + '\n'));
    s.on('data', (d) => { buf += d; });
    s.on('end', () => { clearTimeout(t); try { resolve(JSON.parse(buf)); } catch { resolve({ ok: false, error: 'Setup’s helper gave no answer.' }); } });
    s.on('error', (e) => { clearTimeout(t); resolve({ ok: false, error: `Setup’s helper isn’t running (${e.code || e.message}).` }); });
  });
}
const fakeState = { user: null };
function fakeHelper(action, data) {
  if (action === 'status') return { timezone: 'America/Toronto', model: 'Test Machine' };
  if (action === 'check-user') return /^[a-z][a-z0-9_-]{0,31}$/.test(data.username || '') && data.username !== 'root' ? { ok: true } : { ok: false, error: 'Use lowercase letters, numbers, - and _, starting with a letter.' };
  if (action === 'create-user') { fakeState.user = data.username; return new Promise((r) => setTimeout(() => r({ ok: true, hostname: 'test-pal', computer: data.computer }), 1500)); }
  if (action === 'camera') return { ok: true, present: process.env.PALOS_SETUP_TEST_CAMERA === '1', usb: false, devices: [] };
  if (action === 'finish') { setTimeout(() => app.quit(), 1500); return { ok: true }; }
  return { ok: true };
}

// ---------------------------------------------------------------- Wi-Fi (NetworkManager)
function run(cmd, args, timeout = 20000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 8 << 20 }, (err, out, errOut) => resolve({ ok: !err, out: String(out || ''), err: String(errOut || (err && err.message) || '') }));
  });
}
function fields(line) {
  const res = []; let cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && i + 1 < line.length) { cur += line[++i]; continue; }
    if (c === ':') { res.push(cur); cur = ''; continue; }
    cur += c;
  }
  res.push(cur);
  return res;
}
const rows = (t) => t.split('\n').filter(Boolean).map(fields);

async function netStatus() {
  if (TEST && process.env.PALOS_SETUP_TEST_WIFI === '1') return { nm: true, wifi: true, radio: true, wired: false, current: '', online: false };
  const g = await run('nmcli', ['-t', '-f', 'DEVICE,TYPE,STATE,CONNECTION', 'device', 'status'], 6000);
  if (!g.ok) return { nm: false, wifi: false, online: false };
  const devs = rows(g.out).map(([device, type, state, connection]) => ({ device, type, state, connection }));
  const wifi = devs.find((d) => d.type === 'wifi');
  const wired = devs.find((d) => d.type === 'ethernet' && d.state === 'connected');
  const conn = (await run('nmcli', ['-t', 'networking', 'connectivity'], 6000)).out.trim();
  const radio = (await run('nmcli', ['radio', 'wifi'], 4000)).out.trim() === 'enabled';
  return { nm: true, wifi: !!wifi, radio, wired: !!wired, current: wifi && wifi.state === 'connected' ? wifi.connection : '',
    online: conn === 'full' || conn === 'limited' || !!wired || (wifi && wifi.state === 'connected') };
}
async function wifiList(rescan) {
  if (rescan && !TEST) { await helper('wifi-rescan'); await new Promise((r) => setTimeout(r, 3000)); }
  if (TEST && process.env.PALOS_SETUP_TEST_WIFI === '1') return [{ ssid: 'Lucas Home', signal: 82, secure: true, active: false }, { ssid: 'Lucas Home 5G', signal: 64, secure: true, active: false }, { ssid: 'Café Libre', signal: 31, secure: false, active: false }];
  const r = await run('nmcli', ['-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list', '--rescan', TEST && rescan ? 'yes' : (TEST ? 'auto' : 'no')], 30000);
  const seen = new Map();
  for (const [inuse, ssid, signal, security] of rows(r.out)) {
    if (!ssid) continue;
    const n = { ssid, signal: Number(signal) || 0, secure: !!security && security !== '--', active: inuse === '*' };
    const prev = seen.get(ssid);
    if (!prev || n.active || (!prev.active && n.signal > prev.signal)) seen.set(ssid, n);
  }
  return [...seen.values()].sort((a, b) => (b.active - a.active) || (b.signal - a.signal)).slice(0, 30);
}
async function wifiConnect(ssid, password) {
  // through the root helper: NetworkManager refuses setup's own account ("Insufficient privileges")
  if (!TEST) {
    const h = await helper('wifi-connect', { ssid, password: password || '' });
    return { ok: !!h.ok, error: h.ok ? null : (h.error || 'Couldn’t join that network.'), needsPassword: !!h.needsPassword };
  }
  const args = ['device', 'wifi', 'connect', ssid];
  if (password) args.push('password', password);
  const r = await run('nmcli', args, 60000);
  const msg = (r.err || r.out).replace(/^Error:\s*/m, '').trim();
  return { ok: r.ok, error: r.ok ? null : msg, needsPassword: !r.ok && /secrets|password|802-11-wireless-security|psk/i.test(r.err + r.out) };
}

// ---------------------------------------------------------------- window
let win = null;
function createWindow() {
  const b = screen.getPrimaryDisplay().bounds;
  win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height, frame: false, fullscreen: !TEST, kiosk: !TEST, resizable: TEST,
    backgroundColor: '#1e2e40', show: false, title: 'palOS Setup',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false },
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => { win.show(); win.focus(); });
  // if the graphics process never reports a first paint (busy or software-only computers), show it anyway
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) { win.show(); win.focus(); } }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  // keep it full screen if the display changes (a monitor plugged in, the resolution set)
  screen.on('display-metrics-changed', () => { const d = screen.getPrimaryDisplay().bounds; if (win) win.setBounds(d); });
  win.on('closed', () => { win = null; app.quit(); });
}

// Installed with "Restore from a Time Turner Backup" (the install USB's palOS Utilities): open on Restore.
// Installed with Migration Assistant: the note says "migrate" (another computer's disk) or anything else (Time Turner).
ipcMain.handle('restore-first', () => { try { const t = require('fs').readFileSync('/var/lib/palos-firstboot/restore-first', 'utf8').trim(); return t === 'migrate' ? 'migrate' : true; } catch { return false; } });
function H(ch, fn) { ipcMain.handle(ch, async (e, ...a) => { try { return await fn(...a); } catch (err) { return { ok: false, error: String(err && err.message || err) }; } }); }
H('helper', (action, data) => helper(action, data));
H('net:status', netStatus);
H('wifi:list', (rescan) => wifiList(rescan));
H('wifi:connect', (ssid, pw) => wifiConnect(ssid, pw));
H('wifi:radio', async (on) => { if (TEST) await run('nmcli', ['radio', 'wifi', on ? 'on' : 'off']); else await helper('wifi-radio', { on: !!on }); return netStatus(); });
// The film: once only. If setup had to restart itself in software-video mode part-way through
// (see film:software-restart), it carries on from the same moment instead of counting as interrupted.
const RESUME = path.join(app.getPath('home'), '.video-resume');
const SOFTWARE = process.env.PALOS_FILM_SOFTWARE === '1';
function filmLog(msg) {
  const line = `${new Date().toISOString()} film: ${msg}\n`;
  try { fs.appendFileSync(path.join(app.getPath('home'), '.cache', 'palos-setup.log'), line); } catch { try { process.stderr.write(line); } catch {} }
}
H('film', () => {
  let from = 0, resumed = false;
  try { const r = JSON.parse(fs.readFileSync(RESUME, 'utf8')); from = Math.max(0, Number(r.at) || 0); resumed = true; fs.unlinkSync(RESUME); } catch {}
  // once only: if setup stopped part-way through the film last time (and didn't ask to resume), don't play it again
  if (!resumed && !fs.existsSync(SEEN) && fs.existsSync(STARTED)) { try { fs.writeFileSync(SEEN, 'interrupted\n'); } catch {} }
  const play = fs.existsSync(FILM) && !fs.existsSync(SEEN);
  if (play) { try { fs.writeFileSync(STARTED, new Date().toISOString() + '\n'); } catch {} }
  if (play && SOFTWARE) filmLog(`playing with hardware video decoding off, from ${from.toFixed(2)}s`);
  return { url: play ? 'file://' + FILM : null, path: play ? FILM : null, from, software: SOFTWARE };
});
H('film:seen', () => { try { fs.writeFileSync(SEEN, new Date().toISOString() + '\n'); } catch {} return true; });
H('film:log', (msg) => { filmLog(String(msg).slice(0, 500)); return true; });
// the software player reads the file itself (only the film, nothing else)
H('film:bytes', (p) => {
  if (p !== FILM) throw new Error('not the film');
  const b = fs.readFileSync(FILM);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
});
// last resort: start again with all hardware video decoding off (run-setup does that on exit code 75)
H('film:software-restart', (at) => {
  if (SOFTWARE || TEST) return { ok: false };
  try { fs.writeFileSync(RESUME, JSON.stringify({ at: Math.max(0, Number(at) || 0) }) + '\n'); } catch { return { ok: false }; }
  filmLog(`restarting setup in software video mode at ${Number(at).toFixed(2)}s`);
  setTimeout(() => app.exit(75), 50);
  return { ok: true };
});
H('avatars', () => {
  const dir = '/usr/share/palos/avatars';
  try { return fs.readdirSync(dir).filter((f) => /^[a-z0-9-]+\.png$/.test(f)).sort().map((f) => ({ id: f.slice(0, -4), url: 'file://' + path.join(dir, f) })); } catch { return []; }
});
H('dark', () => false);
// The film's sound: palOS's sound system (PipeWire) asked directly which outputs it has. Setup waits for a real one
// (up to 10 s: sound cards are often found a moment after the screen comes up) before the film starts.
async function soundOutputs() {
  const r = await run('pactl', ['list', 'short', 'sinks'], 3000);
  if (!r.ok) return null;                              // the sound system isn't answering yet
  return r.out.split('\n').map((l) => l.split('\t')[1]).filter((n) => n && n !== 'auto_null');
}
H('sound:outputs', async () => (await soundOutputs()) || []);
H('sound:ready', async (limitMs) => {
  const until = Date.now() + Math.min(20000, Number(limitMs) || 10000);
  let outs = null;
  while (Date.now() < until) {
    outs = await soundOutputs();
    if (outs && outs.length) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const def = (await run('pactl', ['get-default-sink'], 3000)).out.trim();
  return { ok: !!(outs && outs.length), server: outs !== null, outputs: outs || [], default: def };
});
// the new owner chose a language (helper: set-language): start again in it (run-setup re-reads it on exit code 76)
H('languages', () => { try { return JSON.parse(require('fs').readFileSync('/usr/share/palos/languages.json', 'utf8')).languages.filter((l) => l.translated !== false); /* only languages palOS is fully translated into */ } catch { return []; } });
H('restart-language', () => { if (TEST) { app.relaunch(); app.exit(0); return { ok: true }; } setTimeout(() => app.exit(76), 50); return { ok: true }; });

// The camera (for the selfie): setup's own page may use it, video only; nothing else is ever asked for.
function permissions() {
  const ours = (wc) => { try { return wc && wc.getURL().startsWith('file://'); } catch { return false; } };
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, details) => {
    const types = (details && details.mediaTypes) || [];
    cb(perm === 'media' && ours(wc) && !types.includes('audio'));
  });
  session.defaultSession.setPermissionCheckHandler((wc, perm) => perm === 'media' && ours(wc));
}

app.whenReady().then(() => { permissions(); createWindow(); });
app.on('window-all-closed', () => app.quit());

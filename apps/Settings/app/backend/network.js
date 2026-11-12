'use strict';
// Wi-Fi and Network through NetworkManager's nmcli.
const fs = require('fs');
const { run, out, which, detached } = require('./util');

/** Split one line of `nmcli -t` output; colons inside values come escaped as "\:". */
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
const rows = (text) => text.split('\n').filter(Boolean).map(fields);

async function available() { return !!which('nmcli') && (await run('nmcli', ['-t', 'general', 'status'], { timeout: 5000 })).ok; }

async function devices() {
  return rows(await out('nmcli', ['-t', '-f', 'DEVICE,TYPE,STATE,CONNECTION', 'device', 'status']))
    .map(([device, type, state, connection]) => ({ device, type, state, connection: connection === '--' ? '' : connection }));
}

async function deviceInfo(device) {
  const info = {};
  for (const [k, v] of rows(await out('nmcli', ['-t', '-f', 'IP4.ADDRESS,IP4.GATEWAY,IP4.DNS,IP6.ADDRESS,GENERAL.HWADDR,CAPABILITIES.SPEED', 'device', 'show', device]))) {
    const key = k.replace(/\[\d+\]$/, '');
    if (!info[key]) info[key] = v;
  }
  return {
    ipv4: (info['IP4.ADDRESS'] || '').replace(/\/\d+$/, ''), gateway: info['IP4.GATEWAY'] || '', dns: info['IP4.DNS'] || '',
    ipv6: (info['IP6.ADDRESS'] || '').replace(/\/\d+$/, ''), mac: info['GENERAL.HWADDR'] || '', speed: info['CAPABILITIES.SPEED'] || '',
  };
}

async function wifiStatus() {
  if (!(await available())) return { available: false };
  const radio = (await out('nmcli', ['radio', 'wifi'])).trim() === 'enabled';
  const devs = await devices();
  const wifi = devs.find((d) => d.type === 'wifi');
  if (!wifi) return { available: true, hardware: false, on: radio };
  const st = { available: true, hardware: true, on: radio, device: wifi.device, current: wifi.state === 'connected' ? wifi.connection : '', details: null };
  if (st.current) st.details = await deviceInfo(wifi.device);
  return st;
}

async function wifiNetworks(rescan) {
  const known = new Set(rows(await out('nmcli', ['-t', '-f', 'NAME,TYPE', 'connection', 'show'])).filter((r) => /wireless/.test(r[1])).map((r) => r[0]));
  const list = rows(await out('nmcli', ['-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list', '--rescan', rescan ? 'yes' : 'auto'], { timeout: 30000 }));
  const seen = new Map();
  for (const [inuse, ssid, signal, security] of list) {
    if (!ssid) continue;
    const n = { ssid, signal: Number(signal) || 0, secure: !!security && security !== '--', security, active: inuse === '*', known: known.has(ssid) };
    const prev = seen.get(ssid);
    if (!prev || n.active || (!prev.active && n.signal > prev.signal)) seen.set(ssid, n);
  }
  return [...seen.values()].sort((a, b) => (b.active - a.active) || (b.known - a.known) || (b.signal - a.signal));
}

async function wifiPower(on) { await run('nmcli', ['radio', 'wifi', on ? 'on' : 'off']); return wifiStatus(); }

async function wifiConnect(ssid, password, hidden) {
  const args = ['device', 'wifi', 'connect', ssid];
  if (password) args.push('password', password);
  if (hidden) args.push('hidden', 'yes');
  const r = await run('nmcli', args, { timeout: 60000 });
  const msg = (r.err || r.out).replace(/^Error:\s*/m, '').trim();
  return { ok: r.ok, error: r.ok ? null : msg, needsPassword: !r.ok && /secrets|password|802-11-wireless-security|psk/i.test(r.err + r.out) };
}

async function wifiDisconnect() {
  const s = await wifiStatus();
  if (s.device) await run('nmcli', ['device', 'disconnect', s.device]);
  return wifiStatus();
}

async function forget(name) { return (await run('nmcli', ['connection', 'delete', 'id', name])).ok; }

async function overview() {
  if (!(await available())) return { available: false };
  const devs = await devices();
  const wired = [];
  for (const d of devs.filter((x) => x.type === 'ethernet')) wired.push({ ...d, connected: d.state === 'connected', details: d.state === 'connected' ? await deviceInfo(d.device) : null });
  const conns = rows(await out('nmcli', ['-t', '-f', 'NAME,TYPE,ACTIVE,UUID', 'connection', 'show']));
  const vpns = conns.filter((c) => /vpn|wireguard/.test(c[1])).map(([name, type, active, uuid]) => ({ name, type: /wireguard/.test(type) ? 'WireGuard' : 'VPN', active: active === 'yes', uuid }));
  const hostname = await computerName();
  const airplane = (await out('nmcli', ['radio', 'all'])).includes('disabled');
  return { available: true, wired, vpns, hostname, editor: !!which('nm-connection-editor'), airplane };
}

/** What the computer is called: the name the person chose ("Joey's pal"), else the network name. */
async function computerName() {
  try {
    const m = /^PRETTY_HOSTNAME=(.*)$/m.exec(fs.readFileSync('/etc/machine-info', 'utf8'));
    if (m) { const v = m[1].trim().replace(/^(["'])(.*)\1$/, '$2').replace(/\\(.)/g, '$1'); if (v) return v; }
  } catch {}
  return (await out('hostnamectl', ['hostname'])).trim() || (await out('hostname')).trim();
}

/** Rename the computer (an administrator password is asked for). The network name follows: "Joey's pal" -> joeys-pal.
 *  This session's X login cookie is tied to the old network name, so it is added again under the new one;
 *  otherwise apps opened from now on couldn't reach the screen. */
async function setComputerName(name) {
  const display = process.env.DISPLAY || ':0';
  const cookie = ((await out('xauth', ['list', display])).split('\n')[0] || '').trim().split(/\s+/);
  const r = await run('pkexec', ['/usr/lib/paladin-settings/user-admin', 'computer-name', String(name)], { timeout: 180000 });
  if (r.code === 126 || r.code === 127) return { ok: false, cancelled: true };
  if (!r.ok) return { ok: false, error: (r.err || r.out).trim().split('\n').pop() || 'The name couldn’t be changed.' };
  if (cookie.length === 3) await run('xauth', ['add', display, cookie[1], cookie[2]]);
  return { ok: true, name: await computerName(), host: r.out.trim() };
}

function agentActive() {
  try { return fs.existsSync(`${process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid()}`}/paladin-nm-agent`); } catch { return false; }
}

async function vpnSet(uuid, on) {
  const r = await run('nmcli', ['connection', on ? 'up' : 'down', 'uuid', uuid], { timeout: 60000 });
  return { ok: r.ok, error: r.ok ? null : (r.err || r.out).replace(/^Error:\s*/m, '').trim() };
}

async function airplane(on) { await run('nmcli', ['radio', 'all', on ? 'off' : 'on']); return overview(); }

function openEditor() { return which('nm-connection-editor') ? detached('nm-connection-editor') : false; }

module.exports = { wifiStatus, wifiNetworks, wifiPower, wifiConnect, wifiDisconnect, forget, overview, vpnSet, airplane, openEditor, fields, computerName, setComputerName, agentActive };

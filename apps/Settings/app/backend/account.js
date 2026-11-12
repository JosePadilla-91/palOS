'use strict';
// Users, Date & Time, and Power.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { HOME, CONFIG, run, out, which, readText, readJSON, writeJSON, gget, gset } = require('./util');

const LIB = '/usr/lib/paladin-settings';
const ADMIN_GROUPS = ['sudo', 'admin', 'wheel'];

// ---------------------------------------------------------------- users
function groupsOf(name) {
  const groups = [];
  for (const line of readText('/etc/group').split('\n')) {
    const [g, , , members] = line.split(':');
    if (members && members.split(',').includes(name)) groups.push(g);
  }
  return groups;
}

async function accountsPath(name) {
  const r = await run('gdbus', ['call', '--system', '--dest', 'org.freedesktop.Accounts', '--object-path', '/org/freedesktop/Accounts',
    '--method', 'org.freedesktop.Accounts.FindUserByName', name], { timeout: 5000 });
  const m = r.ok && r.out.match(/'(\/org\/freedesktop\/Accounts\/User\d+)'/);
  return m ? m[1] : null;
}
async function accountsGet(p, prop) {
  const r = await run('gdbus', ['call', '--system', '--dest', 'org.freedesktop.Accounts', '--object-path', p, '--method',
    'org.freedesktop.DBus.Properties.Get', 'org.freedesktop.Accounts.User', prop], { timeout: 5000 });
  const m = r.ok && r.out.match(/<'(.*)'>/);
  return m ? m[1] : '';
}
async function accountsCall(p, method, ...args) {
  const r = await run('gdbus', ['call', '--system', '--dest', 'org.freedesktop.Accounts', '--object-path', p, '--method',
    `org.freedesktop.Accounts.User.${method}`, ...args], { timeout: 60000 });
  return { ok: r.ok, error: r.ok ? null : r.err.replace(/^Error: GDBus\.Error:[^:]*:\s*/, '').trim() };
}

async function users() {
  const me = os.userInfo().username;
  const list = [];
  for (const line of readText('/etc/passwd').split('\n')) {
    const [name, , uid, , gecos, home, shell] = line.split(':');
    if (!name || +uid < 1000 || +uid >= 60000 || /nologin|false$/.test(shell || '')) continue;
    const groups = groupsOf(name);
    list.push({ name, uid: +uid, fullName: (gecos || '').split(',')[0] || name, home, admin: groups.some((g) => ADMIN_GROUPS.includes(g)), me: name === me, picture: '' });
  }
  for (const u of list) {
    const p = await accountsPath(u.name);
    const icon = p ? await accountsGet(p, 'IconFile') : '';
    if (icon && fs.existsSync(icon)) u.picture = icon;
    else if (u.me && fs.existsSync(path.join(HOME, '.face'))) u.picture = path.join(HOME, '.face');
  }
  list.sort((a, b) => (b.me - a.me) || a.name.localeCompare(b.name));
  return { users: list, canAdmin: !!which('pkexec') && fs.existsSync(path.join(LIB, 'user-admin')) };
}

async function setFullName(fullName) {
  const p = await accountsPath(os.userInfo().username);
  const clean = String(fullName).replace(/[:,\n]/g, ' ').trim().slice(0, 80);
  if (p) { const r = await accountsCall(p, 'SetRealName', clean); if (r.ok) return { ok: true }; }
  const r = await run('chfn', ['-f', clean], { timeout: 20000 });
  return { ok: r.ok, error: r.ok ? null : 'Could not change the name.' };
}

async function setPicture(file) {
  if (!file || !fs.existsSync(file)) return { ok: false, error: 'Picture not found.' };
  const face = path.join(HOME, '.face');
  try { fs.copyFileSync(file, face); } catch (e) { return { ok: false, error: e.message }; }
  const p = await accountsPath(os.userInfo().username);
  if (p) await accountsCall(p, 'SetIconFile', face);
  return { ok: true };
}

/** Change the signed-in user's own password through passwd (on a pseudo-terminal). */
async function changePassword(oldPw, newPw) {
  const r = await run('/usr/bin/python3', [path.join(LIB, 'change-password')], { input: `${oldPw}\n${newPw}\n`, timeout: 30000 });
  if (r.ok) return { ok: true };
  const msg = (r.out + r.err).trim().split('\n').pop() || 'The password was not changed.';
  return { ok: false, error: msg };
}

/** Other accounts: an administrator password is asked for by the system (polkit). */
async function admin(op, ...args) {
  const input = op === 'add' ? `${args.pop()}\n` : undefined;
  const r = await run('pkexec', [path.join(LIB, 'user-admin'), op, ...args.map(String)], { input, timeout: 180000 });
  if (r.code === 126 || r.code === 127) return { ok: false, cancelled: true };
  return { ok: r.ok, error: r.ok ? null : ((r.err || r.out).trim().split('\n').pop() || 'That didn\'t work.') };
}

// ---------------------------------------------------------------- date & time
async function datetime() {
  const props = {};
  for (const line of (await out('timedatectl', ['show'])).split('\n')) { const i = line.indexOf('='); if (i > 0) props[line.slice(0, i)] = line.slice(i + 1); }
  return {
    timezone: props.Timezone || (readText('/etc/timezone').trim()) || Intl.DateTimeFormat().resolvedOptions().timeZone,
    ntp: props.NTP === 'yes', canNtp: props.CanNTP !== 'no', synced: props.NTPSynchronized === 'yes',
    now: Date.now(),
    clockFormat: (await gget('org.gnome.desktop.interface', 'clock-format')) || '12h',
  };
}
let zones = null;
async function timezones() {
  if (!zones || !zones.length) zones = (await out('timedatectl', ['list-timezones'])).split('\n').filter(Boolean);
  if (!zones.length) {
    // timedatectl unavailable: read the zone list that ships with tzdata
    for (const f of ['/usr/share/zoneinfo/tzdata.zi', '/usr/share/zoneinfo/zone1970.tab', '/usr/share/zoneinfo/zone.tab']) {
      const t = readText(f);
      if (!t) continue;
      const found = new Set();
      for (const line of t.split('\n')) {
        let m = line.match(/^Z (\S+)/) || line.match(/^L \S+ (\S+)/);
        if (!m && !line.startsWith('#')) { const c = line.split('\t'); if (c[2]) m = [null, c[2]]; }
        if (m && /^[A-Z][A-Za-z_-]+\/[A-Za-z_+\-\/0-9]+$/.test(m[1]) && !/^(Etc|SystemV|US|Canada)\//.test(m[1])) found.add(m[1]);
      }
      if (found.size) { zones = [...found].sort(); break; }
    }
  }
  if (!zones.length) zones = [Intl.DateTimeFormat().resolvedOptions().timeZone];
  return zones;
}
async function setTimezone(z) { const r = await run('timedatectl', ['set-timezone', z], { timeout: 120000 }); return { ok: r.ok, error: r.ok ? null : r.err.trim(), now: await datetime() }; }
async function setNtp(on) { const r = await run('timedatectl', ['set-ntp', on ? 'true' : 'false'], { timeout: 120000 }); return { ok: r.ok, error: r.ok ? null : r.err.trim(), now: await datetime() }; }
async function setTime(isoLocal) {
  const r = await run('timedatectl', ['set-time', isoLocal.replace('T', ' ')], { timeout: 120000 });
  return { ok: r.ok, error: r.ok ? null : r.err.trim(), now: await datetime() };
}

// ---------------------------------------------------------------- power
async function power() {
  const res = { battery: null, profiles: [], profile: '', idleDelay: 300, lock: true };
  if (which('upower')) {
    const bat = (await out('upower', ['-e'])).split('\n').find((l) => /battery_/.test(l));
    if (bat) {
      const info = await out('upower', ['-i', bat]);
      const g = (k) => ((info.match(new RegExp(`^\\s*${k}:\\s*(.+)$`, 'm')) || [])[1] || '').trim();
      if (g('present') !== 'no') res.battery = { percent: parseFloat(g('percentage')) || 0, state: g('state'), timeToEmpty: g('time to empty'), timeToFull: g('time to full'), health: g('capacity') };
    }
  }
  if (which('powerprofilesctl')) {
    res.profile = (await out('powerprofilesctl', ['get'])).trim();
    res.profiles = [...(await out('powerprofilesctl', ['list'])).matchAll(/^[\s*]*([a-z-]+):$/gm)].map((m) => m[1]);
  }
  Object.assign(res, await powerConf());
  return res;
}
// Settings → Power is kept in ~/.config/palos/power.json; the session's paladin-idle follows it within seconds
// (screen off, lock, sleep, log out when idle). Seconds; 0 = Never.
const POWER = path.join(CONFIG, 'palos', 'power.json');
async function powerConf() {
  let c = readJSON(POWER, null);
  if (!c) {   // first time: what older builds kept
    const d = await gget('org.gnome.desktop.session', 'idle-delay');
    c = { screenOff: typeof d === 'number' ? d : 600, lock: (await gget('org.gnome.desktop.screensaver', 'lock-enabled')) !== false, sleep: 0, logout: 0 };
  }
  return { idleDelay: Number(c.screenOff ?? 600), lock: c.lock !== false, sleep: Number(c.sleep || 0), logout: Number(c.logout || 0) };
}
async function setPower(key, value) {
  const cur = await powerConf();
  const c = { screenOff: cur.idleDelay, lock: cur.lock, sleep: cur.sleep, logout: cur.logout, [key]: value };
  writeJSON(POWER, c);
  return power();
}
async function setProfile(p) { await run('powerprofilesctl', ['set', p]); return power(); }
const secs = (v) => Math.max(0, Math.round(Number(v) || 0));
async function setIdle(sec) { return setPower('screenOff', secs(sec)); }
async function setLock(on) { return setPower('lock', !!on); }
async function setSleep(sec) { return setPower('sleep', secs(sec)); }
async function setLogout(sec) { return setPower('logout', secs(sec)); }

module.exports = { users, setFullName, setPicture, changePassword, admin, datetime, timezones, setTimezone, setNtp, setTime, power, setProfile, setIdle, setLock, setSleep, setLogout };

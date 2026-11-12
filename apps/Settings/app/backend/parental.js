'use strict';
// Parental Controls: a child's rules live in /etc/palos/parental/<name>.json (readable by everyone, changed only with a
// parent's administrator password through parental-admin); palos-parentald enforces them and keeps the activity in
// /var/lib/palos-parental/<name>/<date>.json (readable by administrators).
const fs = require('fs');
const path = require('path');
const os = require('os');
const { run, readText } = require('./util');

const CONF = '/etc/palos/parental';
const DATA = '/var/lib/palos-parental';
const ADMIN = '/usr/lib/palos-parental/parental-admin';
const ADMIN_GROUPS = ['sudo', 'admin', 'wheel'];
const DEFAULTS = {
  enabled: false,
  screenTime: { weekday: 0, weekend: 0 },
  bedtime: { enabled: false, from: '21:00', to: '07:00' },
  apps: { mode: 'all', allowed: [] },
  web: { mode: 'adult', block: [], allow: [] },
};

function groupsOf(name) {
  const out = [];
  for (const line of readText('/etc/group').split('\n')) {
    const [g, , , members] = line.split(':');
    if (g && (members || '').split(',').includes(name)) out.push(g);
  }
  return out;
}

function rulesOf(name) {
  let r = {};
  try { r = JSON.parse(fs.readFileSync(path.join(CONF, name + '.json'), 'utf8')); } catch {}
  return {
    enabled: !!r.enabled,
    screenTime: { ...DEFAULTS.screenTime, ...(r.screenTime || {}) },
    bedtime: { ...DEFAULTS.bedtime, ...(r.bedtime || {}) },
    apps: { ...DEFAULTS.apps, ...(r.apps || {}) },
    web: { ...DEFAULTS.web, ...(r.web || {}) },
  };
}

function apps() {
  const out = [];
  const walk = (dir, folder) => {
    let list = [];
    try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of list) {
      if (e.name.startsWith('.')) continue;
      if (e.name.endsWith('.app')) out.push({ id: (folder ? folder + '/' : '') + e.name.slice(0, -4), name: e.name.slice(0, -4), folder });
      else if (e.isDirectory() && !folder) walk(path.join(dir, e.name), e.name);
    }
  };
  walk('/Applications', '');
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function list() {
  const me = os.userInfo().username;
  const kids = [];
  for (const line of readText('/etc/passwd').split('\n')) {
    const [name, , uid, , gecos, , shell] = line.split(':');
    if (!name || +uid < 1000 || +uid >= 60000 || /nologin|false$/.test(shell || '') || name === me) continue;
    const admin = groupsOf(name).some((g) => ADMIN_GROUPS.includes(g));
    const rules = rulesOf(name);
    kids.push({ name, fullName: (gecos || '').split(',')[0] || name, admin, enabled: rules.enabled });
  }
  const iAmAdmin = groupsOf(me).some((g) => ADMIN_GROUPS.includes(g));
  return { accounts: kids, apps: apps(), iAmAdmin, running: (await run('systemctl', ['is-active', '--quiet', 'palos-parental.service'])).ok };
}

async function get(name) { return rulesOf(String(name)); }

async function set(name, rules) {
  const r = await run('pkexec', [ADMIN, 'set', String(name)], { input: JSON.stringify(rules || {}), timeout: 180000 });
  try { return JSON.parse(r.out); } catch {}
  if (!r.ok && /dismissed|Not authorized|126|127/i.test(r.err + r.code)) return { ok: false, error: 'A parent’s password is needed to change Parental Controls.', cancelled: true };
  return { ok: false, error: (r.err || '').trim() || 'Parental Controls couldn’t be saved.' };
}

/** the last `days` days: minutes per day, and time per app and visits per site over the period and today */
async function report(name, days = 7) {
  const dir = path.join(DATA, String(name));
  const out = { days: [], apps: {}, sites: {}, todayApps: {}, todaySites: {}, readable: true };
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let u = null;
    try { u = JSON.parse(fs.readFileSync(path.join(dir, key + '.json'), 'utf8')); } catch (e) { if (e.code === 'EACCES') out.readable = false; }
    out.days.push({ date: key, weekday: d.getDay(), seconds: u ? u.seconds || 0 : 0 });
    if (!u) continue;
    for (const [k, v] of Object.entries(u.apps || {})) out.apps[k] = (out.apps[k] || 0) + v;
    for (const [k, v] of Object.entries(u.sites || {})) out.sites[k] = (out.sites[k] || 0) + v;
    if (i === 0) { out.todayApps = u.apps || {}; out.todaySites = u.sites || {}; }
  }
  return out;
}

module.exports = { list, get, set, report };

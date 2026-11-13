'use strict';
// Menu extras and system actions: sound volume, Wi-Fi, power, About This Computer, recent items.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { HOME, sh, run, which, readText, detached } = require('./util');

// ---------------- Sound (PipeWire wpctl, or PulseAudio pactl) ----------------
// the person changed the volume: palos-volume-keeper keeps it (and undoes changes the computer makes on its own)
function personSetVolume() {
  try { fs.writeFileSync(path.join(process.env.XDG_RUNTIME_DIR || '/tmp', 'palos-volume-user'), String(Date.now())); } catch {}
}
const sound = {
  available() { return !!(which('wpctl') || which('pactl')); },
  async get() {
    if (which('wpctl')) {
      const out = await sh('wpctl', ['get-volume', '@DEFAULT_AUDIO_SINK@'], { timeout: 2000 });
      const m = out.match(/Volume:\s*([\d.]+)/);
      if (m) return { volume: Math.min(1.5, parseFloat(m[1])), muted: /MUTED/.test(out) };
    }
    if (which('pactl')) {
      const v = await sh('pactl', ['get-sink-volume', '@DEFAULT_SINK@'], { timeout: 2000 });
      const mu = await sh('pactl', ['get-sink-mute', '@DEFAULT_SINK@'], { timeout: 2000 });
      const m = v.match(/(\d+)%/);
      if (m) return { volume: parseInt(m[1], 10) / 100, muted: /yes/.test(mu) };
    }
    return null;
  },
  async set(vol) {
    personSetVolume();
    vol = Math.max(0, Math.min(1, vol));
    if (which('wpctl')) {
      await sh('wpctl', ['set-volume', '-l', '1.0', '@DEFAULT_AUDIO_SINK@', vol.toFixed(2)]);
      if (vol > 0) await sh('wpctl', ['set-mute', '@DEFAULT_AUDIO_SINK@', '0']);
    } else if (which('pactl')) {
      await sh('pactl', ['set-sink-volume', '@DEFAULT_SINK@', `${Math.round(vol * 100)}%`]);
      if (vol > 0) await sh('pactl', ['set-sink-mute', '@DEFAULT_SINK@', '0']);
    }
    return this.get();
  },
  async toggleMute() {
    personSetVolume();
    if (which('wpctl')) await sh('wpctl', ['set-mute', '@DEFAULT_AUDIO_SINK@', 'toggle']);
    else if (which('pactl')) await sh('pactl', ['set-sink-mute', '@DEFAULT_SINK@', 'toggle']);
    return this.get();
  },
  /** Calls back whenever NetworkManager reports a change (connected, disconnected, radio off…). */
  watch(cb) {
    if (!which('nmcli')) return;
    const { spawn } = require('child_process');
    let t = null;
    const start = () => {
      let p; try { p = spawn('nmcli', ['monitor'], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return; }
      p.stdout.on('data', () => { clearTimeout(t); t = setTimeout(cb, 250); });
      p.on('exit', () => setTimeout(start, 5000));     // NetworkManager restarted: follow it again
      p.on('error', () => {});
    };
    start();
  },
  openSettings() {
    if (which('paladin-settings')) return detached('paladin-settings', ['sound']);
    return false;
  },
};

// the computer's name as the person chose it ("Joey's pal"), else the network name
function prettyHost() {
  try {
    const m = /^PRETTY_HOSTNAME=(.*)$/m.exec(require('fs').readFileSync('/etc/machine-info', 'utf8'));
    if (m) { const v = m[1].trim().replace(/^(["'])(.*)\1$/, '$2').replace(/\\(.)/g, '$1'); if (v) return v; }
  } catch {}
  return os.hostname();
}

// ---------------- Wi-Fi (NetworkManager nmcli) ----------------
function nmSplit(line) {
  const out = []; let cur = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && i + 1 < line.length) { cur += line[++i]; continue; }
    if (line[i] === ':') { out.push(cur); cur = ''; continue; }
    cur += line[i];
  }
  out.push(cur); return out;
}
const wifi = {
  available() { return !!which('nmcli'); },
  async status() {
    if (!which('nmcli')) return null;
    const devs = (await sh('nmcli', ['-t', '-f', 'DEVICE,TYPE,STATE,CONNECTION', 'device'], { timeout: 3000 })).split('\n').filter(Boolean).map(nmSplit);
    const dev = devs.find((d) => d[1] === 'wifi');
    const wired = devs.find((d) => d[1] === 'ethernet' && d[2] === 'connected');
    if (!dev) return { hardware: false, wired: !!wired };
    const radio = (await sh('nmcli', ['radio', 'wifi'], { timeout: 2000 })).trim() === 'enabled';
    let current = null, signal = 0;
    // Connected only when the Wi-Fi device itself says so. The scan list's "in use" mark is a cached copy
    // that can stay on a network for a while after it has dropped, so the menu bar used to keep showing it.
    if (radio && dev[2] === 'connected') {
      const lines = (await sh('nmcli', ['-t', '-f', 'IN-USE,SSID,SIGNAL', 'device', 'wifi', 'list', '--rescan', 'no'], { timeout: 4000 })).split('\n').filter(Boolean).map(nmSplit);
      const cur = lines.find((l) => l[0] === '*') || lines.find((l) => l[1] === dev[3]);
      current = (cur && cur[1]) || dev[3] || null; signal = cur ? (+cur[2] || 0) : 50;
    }
    return { hardware: true, device: dev[0], on: radio, current, signal, state: dev[2], wired: !!wired };
  },
  async networks(rescan = false) {
    const lines = (await sh('nmcli', ['-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list', '--rescan', rescan ? 'yes' : 'no'], { timeout: 12000 })).split('\n').filter(Boolean).map(nmSplit);
    const known = new Set((await sh('nmcli', ['-t', '-f', 'NAME,TYPE', 'connection', 'show'], { timeout: 3000 })).split('\n').map(nmSplit).filter((l) => /wireless/.test(l[1] || '')).map((l) => l[0]));
    const seen = new Map();
    for (const [inuse, ssid, sig, sec] of lines) {
      if (!ssid) continue;
      const cur = seen.get(ssid);
      if (!cur || +sig > cur.signal) seen.set(ssid, { ssid, signal: +sig || 0, secure: !!sec && sec !== '--', active: inuse === '*' || (cur && cur.active), known: known.has(ssid) });
    }
    return [...seen.values()].sort((a, b) => (b.active - a.active) || (b.signal - a.signal));
  },
  async setPower(on) { await sh('nmcli', ['radio', 'wifi', on ? 'on' : 'off']); return this.status(); },
  async connect(ssid, password) {
    const r = password ? await run('nmcli', ['device', 'wifi', 'connect', ssid, 'password', password], { timeout: 45000 })
      : await run('nmcli', ['device', 'wifi', 'connect', ssid], { timeout: 45000 });
    return { ok: r.ok, error: r.ok ? null : (r.err || r.out).replace(/^Error:\s*/, '').trim(), needsPassword: !r.ok && /secrets|password|802-11-wireless-security/i.test(r.err + r.out) };
  },
  async disconnect() { const s = await this.status(); if (s && s.device) await sh('nmcli', ['device', 'disconnect', s.device]); return this.status(); },
  openSettings() {
    if (which('paladin-settings')) return detached('paladin-settings', ['wifi']);
    return false;
  },
};

// ---------------- Power ----------------
function sessionId() { return process.env.XDG_SESSION_ID || ''; }
const power = {
  sleep() { return run('systemctl', ['suspend']); },
  restart() { return run('systemctl', ['reboot']); },
  shutDown() { return run('systemctl', ['poweroff']); },
  async logOut(wmName) {
    if (/openbox/.test(wmName) && which('openbox')) return run('openbox', ['--exit']);
    const id = sessionId();
    if (id) return run('loginctl', ['terminate-session', id]);
    return run('loginctl', ['terminate-user', os.userInfo().username]);
  },
};

// ---------------- About This Computer ----------------
function systemInfo() {
  const osr = {}; for (const l of readText('/etc/os-release').split('\n')) { const m = l.match(/^([A-Z_]+)="?(.*?)"?$/); if (m) osr[m[1]] = m[2]; }
  const cpu = (readText('/proc/cpuinfo').match(/^model name\s*:\s*(.*)$/m) || [])[1] || os.cpus()[0]?.model || 'Unknown processor';
  const cores = os.cpus().length;
  const mem = os.totalmem();
  // the model, from the firmware, unless the maker left a placeholder there ("System Product Name"…)
  const memType = (() => {
    const bad = /^(system product name|system manufacturer|to be filled by o\.?e\.?m\.?|default string|not applicable|none|o\.?e\.?m\.?|x\.x|0123456789|unknown)$/i;
    const v = readText('/sys/devices/virtual/dmi/id/sys_vendor').trim(), n = readText('/sys/devices/virtual/dmi/id/product_name').trim();
    const parts = [v, n].filter((x) => x && !bad.test(x));
    if (parts.length === 2 && n.toLowerCase().startsWith(v.toLowerCase())) parts.shift();
    return parts.join(' ');
  })();
  return {
    vendor: osr.VENDOR_NAME || '', name: osr.NAME || 'Linux', version: osr.VERSION || osr.VERSION_ID || '', pretty: osr.PRETTY_NAME || os.type(),
    id: osr.ID || '', idLike: osr.ID_LIKE || '', codename: osr.VERSION_CODENAME || '',
    cpu: cpu.replace(/\s+/g, ' ').replace(/\(R\)|\(TM\)/g, '').trim(), cores, memory: mem, kernel: os.release(),
    host: prettyHost(), model: memType, user: os.userInfo().username, uptime: os.uptime(),
  };
}

// ---------------- Recent items ----------------
function recentDocuments(limit = 10) {
  const xbel = readText(path.join(HOME, '.local/share/recently-used.xbel'));
  const out = []; const re = /<bookmark\s+href="([^"]+)"[^>]*?(?:modified="([^"]+)")?[^>]*>/g; let m;
  while ((m = re.exec(xbel))) {
    if (!m[1].startsWith('file://')) continue;
    let p; try { p = decodeURIComponent(m[1].slice(7)); } catch { continue; }
    if (!fs.existsSync(p)) continue;
    out.push({ path: p, name: path.basename(p), at: m[2] ? Date.parse(m[2]) : 0 });
  }
  return out.sort((a, b) => b.at - a.at).filter((x, i, arr) => arr.findIndex((y) => y.path === x.path) === i).slice(0, limit);
}

function addRecentDocument(p) {
  // Record opened files the freedesktop way so other apps see them too.
  try {
    const file = path.join(HOME, '.local/share/recently-used.xbel');
    let xbel = readText(file);
    if (!xbel) xbel = '<?xml version="1.0" encoding="UTF-8"?>\n<xbel version="1.0" xmlns:bookmark="http://www.freedesktop.org/standards/desktop-bookmarks" xmlns:mime="http://www.freedesktop.org/standards/shared-mime-info">\n</xbel>\n';
    const href = 'file://' + p.split('/').map(encodeURIComponent).join('/').replace(/^\/\//, '/');
    const now = new Date().toISOString();
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const reExisting = new RegExp(`<bookmark href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
    if (reExisting.test(xbel)) xbel = xbel.replace(reExisting, (tag) => tag.replace(/modified="[^"]*"/, `modified="${now}"`).replace(/visited="[^"]*"/, `visited="${now}"`));
    else xbel = xbel.replace('</xbel>', `  <bookmark href="${esc(href)}" added="${now}" modified="${now}" visited="${now}">\n    <info>\n      <metadata owner="http://freedesktop.org">\n        <bookmark:applications>\n          <bookmark:application name="Seeker" exec="&apos;paladin-seeker %u&apos;" modified="${now}" count="1"/>\n        </bookmark:applications>\n      </metadata>\n    </info>\n  </bookmark>\n</xbel>`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, xbel);
  } catch {}
}

function clearRecentDocuments() {
  const file = path.join(HOME, '.local/share/recently-used.xbel');
  try { fs.writeFileSync(file, '<?xml version="1.0" encoding="UTF-8"?>\n<xbel version="1.0" xmlns:bookmark="http://www.freedesktop.org/standards/desktop-bookmarks" xmlns:mime="http://www.freedesktop.org/standards/shared-mime-info">\n</xbel>\n'); } catch {}
}

/** First installed command from a list like ['paladin-settings', 'paladin-preferences']. */
function firstCommand(list) {
  for (const c of [].concat(list || [])) { const parts = c.split(/\s+/); if (which(parts[0])) return parts; }
  return null;
}

// the network watcher belongs to Wi-Fi (the menu bar's Wi-Fi item follows it)
wifi.watch = sound.watch; delete sound.watch;
module.exports = { sound, wifi, power, systemInfo, recentDocuments, addRecentDocument, clearRecentDocuments, firstCommand };

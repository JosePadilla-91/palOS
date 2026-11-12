'use strict';
// Activity Monitor sampler: reads /proc and /sys directly, no helper programs for the everyday numbers.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const rd = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const CLK = 100; // USER_HZ on every Linux build we ship for

let prevCpu = null, prevProc = new Map(), prevNet = null, prevDisk = null, prevT = Date.now();
const uidName = new Map();
function userName(uid) {
  if (uidName.has(uid)) return uidName.get(uid);
  let n = String(uid);
  for (const l of rd('/etc/passwd').split('\n')) { const f = l.split(':'); if (f.length > 2 && +f[2] === uid) { n = f[0]; break; } }
  uidName.set(uid, n); return n;
}

function cpu() {
  const lines = rd('/proc/stat').split('\n').filter((l) => l.startsWith('cpu'));
  const cur = lines.map((l) => { const f = l.trim().split(/\s+/).slice(1).map(Number); const idle = (f[3] || 0) + (f[4] || 0); return { idle, total: f.reduce((a, b) => a + b, 0) }; });
  let pct = cur.map(() => 0);
  if (prevCpu && prevCpu.length === cur.length) pct = cur.map((c, i) => { const dt = c.total - prevCpu[i].total, di = c.idle - prevCpu[i].idle; return dt > 0 ? Math.max(0, Math.min(100, (1 - di / dt) * 100)) : 0; });
  prevCpu = cur;
  const mhz = rd('/proc/cpuinfo').split('\n').filter((l) => l.startsWith('cpu MHz')).map((l) => num(l.split(':')[1]));
  const model = (rd('/proc/cpuinfo').match(/model name\s*:\s*(.*)/) || [])[1] || os.cpus()[0]?.model || 'CPU';
  const la = rd('/proc/loadavg').split(' ');
  return { total: pct[0] || 0, cores: pct.slice(1), model: model.trim(), mhz: mhz.length ? mhz.reduce((a, b) => a + b, 0) / mhz.length : 0, load: [num(la[0]), num(la[1]), num(la[2])], uptime: num(rd('/proc/uptime').split(' ')[0]) };
}

function mem() {
  const m = {}; for (const l of rd('/proc/meminfo').split('\n')) { const x = l.match(/^(\w+):\s+(\d+)/); if (x) m[x[1]] = +x[2] * 1024; }
  const used = m.MemTotal - (m.MemAvailable ?? m.MemFree);
  return { total: m.MemTotal || 0, used, available: m.MemAvailable || 0, cached: (m.Cached || 0) + (m.Buffers || 0), swapTotal: m.SwapTotal || 0, swapUsed: (m.SwapTotal || 0) - (m.SwapFree || 0) };
}

function net(dt) {
  const cur = {};
  for (const l of rd('/proc/net/dev').split('\n').slice(2)) { const [n, rest] = l.split(':'); if (!rest) continue; const f = rest.trim().split(/\s+/).map(Number); const name = n.trim(); if (name === 'lo') continue; cur[name] = { rx: f[0], tx: f[8] }; }
  const out = { rx: 0, tx: 0, ifaces: [] };
  for (const [n, v] of Object.entries(cur)) {
    const p = prevNet && prevNet[n]; const rx = p ? Math.max(0, (v.rx - p.rx) / dt) : 0, tx = p ? Math.max(0, (v.tx - p.tx) / dt) : 0;
    out.rx += rx; out.tx += tx; out.ifaces.push({ name: n, rx, tx, rxTotal: v.rx, txTotal: v.tx });
  }
  prevNet = cur; return out;
}

function diskIO(dt) {
  const cur = {};
  for (const l of rd('/proc/diskstats').split('\n')) { const f = l.trim().split(/\s+/); if (f.length < 14) continue; const n = f[2]; if (/^(loop|ram|dm-|sr|fd)/.test(n) || /\d+p?\d+$/.test(n) && !/^nvme\d+n\d+$/.test(n) && !/^mmcblk\d+$/.test(n)) continue; cur[n] = { r: +f[5] * 512, w: +f[9] * 512 }; }
  let r = 0, w = 0;
  for (const [n, v] of Object.entries(cur)) { const p = prevDisk && prevDisk[n]; if (p) { r += Math.max(0, (v.r - p.r) / dt); w += Math.max(0, (v.w - p.w) / dt); } }
  prevDisk = cur; return { read: r, write: w };
}

let fsCache = { at: 0, v: [] };
function filesystems(cb) {
  if (Date.now() - fsCache.at < 5000) return cb(fsCache.v);
  execFile('df', ['-P', '-B1', '-x', 'tmpfs', '-x', 'devtmpfs', '-x', 'squashfs', '-x', 'overlay', '-x', 'efivarfs'], { timeout: 4000 }, (err, so) => {
    const v = String(so || '').split('\n').slice(1).map((l) => l.trim().split(/\s+/)).filter((f) => f.length >= 6 && f[0].startsWith('/')).map((f) => ({ device: f[0], total: +f[1], used: +f[2], free: +f[3], mount: f.slice(5).join(' ') }));
    fsCache = { at: Date.now(), v }; cb(v);
  });
}

// base-system services shown by what they do for palOS (their programs keep their own names underneath)
const FRIENDLY = [
  [/^gnome-keyring-d/, 'palOS Keychain'], [/^polkit-gnome-au/, 'palOS Password Prompt'], [/^gsd-/, 'palOS Settings Service'],
  [/^gvfsd?(-|$)/, 'palOS Files Service'], [/^gvfs-/, 'palOS Disks Service'], [/^at-spi/, 'palOS Accessibility'], [/^xdg-desktop-por/, 'palOS Portal'],
  [/^xdg-document-po/, 'palOS Portal (files)'], [/^xdg-permission-/, 'palOS Portal (permissions)'], [/^dconf-service/, 'palOS Settings Store'],
  [/^goa-/, 'palOS Online Accounts'], [/^evolution-/, 'palOS Calendar Service'], [/^geoclue/, 'palOS Location Services'], [/^agent$/, 'palOS Location Services'],
  [/^gcr-/, 'palOS Certificates'], [/^pinentry-gnome/, 'palOS Password Prompt'], [/^tracker-miner/, 'palOS Search Indexer'], [/^gnome-/, 'palOS Service'],
];
const friendly = (n) => { for (const [re, label] of FRIENDLY) if (re.test(n)) return label; return n; };

function processes(dt, memTotal) {
  const out = []; const seen = new Map();
  let pids; try { pids = fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d)); } catch { pids = []; }
  const page = 4096;
  for (const pid of pids) {
    const stat = rd(`/proc/${pid}/stat`); if (!stat) continue;
    const rp = stat.lastIndexOf(')'); const name = friendly(stat.slice(stat.indexOf('(') + 1, rp)); const f = stat.slice(rp + 2).split(' ');
    const ticks = num(f[11]) + num(f[12]);                     // utime + stime
    seen.set(pid, ticks);
    const prev = prevProc.get(pid);
    const cpuPct = prev !== undefined && dt > 0 ? Math.max(0, (ticks - prev) / CLK / dt * 100) : 0;
    const status = rd(`/proc/${pid}/status`); const uid = num((status.match(/^Uid:\s+(\d+)/m) || [])[1]);
    const rss = num(f[21]) * page;
    let cmd = rd(`/proc/${pid}/cmdline`).replace(/\0/g, ' ').trim();
    out.push({ pid: +pid, name, cmd: cmd || `[${name}]`, state: f[0], user: userName(uid), cpu: cpuPct, mem: rss, memPct: memTotal ? rss / memTotal * 100 : 0, threads: num(f[17]), nice: num(f[16]) });
  }
  prevProc = seen; return out;
}

function sensors() {
  const temps = [];
  try {
    for (const h of fs.readdirSync('/sys/class/hwmon')) {
      const base = `/sys/class/hwmon/${h}`; const chip = rd(`${base}/name`).trim() || h;
      for (const f of fs.readdirSync(base).filter((x) => /^temp\d+_input$/.test(x))) {
        const label = rd(`${base}/${f.replace('_input', '_label')}`).trim() || f.replace('_input', '');
        temps.push({ name: `${chip} · ${label}`, c: num(rd(`${base}/${f}`)) / 1000 });
      }
    }
  } catch {}
  if (!temps.length) { try { for (const z of fs.readdirSync('/sys/class/thermal').filter((x) => x.startsWith('thermal_zone'))) temps.push({ name: rd(`/sys/class/thermal/${z}/type`).trim() || z, c: num(rd(`/sys/class/thermal/${z}/temp`)) / 1000 }); } catch {} }
  const fans = [];
  try { for (const h of fs.readdirSync('/sys/class/hwmon')) for (const f of fs.readdirSync(`/sys/class/hwmon/${h}`).filter((x) => /^fan\d+_input$/.test(x))) fans.push({ name: `${rd(`/sys/class/hwmon/${h}/name`).trim()} · ${f.replace('_input', '')}`, rpm: num(rd(`/sys/class/hwmon/${h}/${f}`)) }); } catch {}
  const batt = [];
  try { for (const b of fs.readdirSync('/sys/class/power_supply')) { const t = rd(`/sys/class/power_supply/${b}/type`).trim(); if (t !== 'Battery') continue; const g = (k) => rd(`/sys/class/power_supply/${b}/${k}`).trim(); batt.push({ name: b, percent: num(g('capacity')), status: g('status'), watts: num(g('power_now')) / 1e6 }); } } catch {}
  return { temps: temps.filter((t) => t.c > 0 && t.c < 150), fans, battery: batt };
}

let gpuCache = { at: 0, v: [] };
function gpus(cb) {
  if (Date.now() - gpuCache.at < 2000) return cb(gpuCache.v);
  const list = [];
  // AMD / Intel: the kernel reports what it can
  try { for (const c of fs.readdirSync('/sys/class/drm').filter((x) => /^card\d+$/.test(x))) { const b = `/sys/class/drm/${c}/device`; const busy = rd(`${b}/gpu_busy_percent`).trim(); if (busy) list.push({ name: `GPU ${c.slice(4)} (${(rd(`${b}/uevent`).match(/DRIVER=(\S+)/) || [])[1] || 'driver'})`, util: num(busy), memUsed: num(rd(`${b}/mem_info_vram_used`)), memTotal: num(rd(`${b}/mem_info_vram_total`)), temp: null }); } } catch {}
  execFile('nvidia-smi', ['--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu', '--format=csv,noheader,nounits'], { timeout: 2500 }, (err, so) => {
    if (!err) for (const l of String(so).trim().split('\n')) { const f = l.split(',').map((s) => s.trim()); if (f.length >= 5) list.push({ name: f[0], util: num(f[1]), memUsed: num(f[2]) * 1048576, memTotal: num(f[3]) * 1048576, temp: num(f[4]) }); }
    gpuCache = { at: Date.now(), v: list }; cb(list);
  });
}

/** One sample of everything. Calls back with the numbers. */
function sample(cb) {
  const now = Date.now(); const dt = Math.max(0.2, (now - prevT) / 1000); prevT = now;
  const m = mem();
  const snap = { t: now, cpu: cpu(), mem: m, net: net(dt), diskIO: diskIO(dt), procs: processes(dt, m.total), sensors: sensors(), host: os.hostname() };
  filesystems((fsl) => { snap.fs = fsl; gpus((g) => { snap.gpu = g; cb(snap); }); });
}

function signal(pid, sig) {
  pid = Number(pid); if (!Number.isInteger(pid) || pid <= 1) return { ok: false, error: 'Not a process you can stop.' };
  try { process.kill(pid, sig); return { ok: true }; } catch (e) { return { ok: false, error: e.code === 'EPERM' ? 'That process belongs to another user. It can only be stopped by an administrator.' : e.message }; }
}

module.exports = { sample, signal };

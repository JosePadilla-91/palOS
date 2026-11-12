'use strict';
/*
 * Sample-data stand-in for window.timeTurner. Used for the browser preview and
 * for `time-turner --mock`; it has exactly the same shape as the real bridge.
 */
window.TimeTurnerMock = (() => {
  const DAY = 864e5, HOUR = 36e5;
  const NOW0 = Date.now();
  const delay = (ms = 120) => new Promise(r => setTimeout(r, ms));
  const listeners = new Set();
  const emit = ev => listeners.forEach(cb => { try { cb(ev); } catch (e) { console.error(e); } });
  const fail = (code, message) => Object.assign(new Error(message), { code });

  // [path, kind, bornDaysAgo, deletedDaysAgo | null, editedDaysAgo[], bytes]
  const RAW = [
    ['Documents', 'folder', 40],
    ['Documents/Resume 2026.odt', 'doc', 40, null, [12, 3], 48e3],
    ['Documents/Budget.ods', 'sheet', 40, null, [20, 8, 0.3], 86e3],
    ['Documents/Thesis Draft.odt', 'doc', 25, null, [18, 10, 5, 1, 0.2], 412e3],
    ['Documents/Meeting Notes.txt', 'text', 15, 2, [9], 6e3],
    ['Documents/Taxes 2025.pdf', 'pdf', 40, null, [], 1.2e6],
    ['Pictures', 'folder', 40],
    ['Pictures/Holiday', 'folder', 22],
    ['Pictures/Holiday/Beach 01.jpg', 'image', 22, null, [], 4.1e6],
    ['Pictures/Holiday/Beach 02.jpg', 'image', 22, null, [], 3.8e6],
    ['Pictures/Holiday/Sunset.jpg', 'image', 22, 6, [], 5.2e6],
    ['Pictures/Wallpaper.png', 'image', 40, null, [], 2.6e6],
    ['Pictures/Screenshot.png', 'image', 20, 4, [], 890e3],
    ['Music', 'folder', 40],
    ['Music/Demo Mix.ogg', 'audio', 30, null, [14], 7.4e6],
    ['Videos', 'folder', 40],
    ['Videos/Birthday.mp4', 'video', 33, null, [], 312e6],
    ['Downloads', 'folder', 40],
    ['Downloads/ubuntu-24.04.3-desktop-amd64.iso', 'disc', 28, 10, [], 6.1e9],
    ['Downloads/invoice-0912.pdf', 'pdf', 22, null, [], 210e3],
    ['Downloads/electron-v39.zip', 'archive', 5, null, [], 98e6],
    ['Projects', 'folder', 40],
    ['Projects/time-turner', 'folder', 26],
    ['Projects/time-turner/main.js', 'code', 26, null, [20, 12, 6, 2, 0.5, 0.15], 9e3],
    ['Projects/time-turner/index.html', 'code', 26, null, [11, 3, 0.4], 5e3],
    ['Projects/time-turner/styles.css', 'code', 24, null, [16, 7, 0.4, 0.1], 14e3],
    ['Projects/time-turner/README.md', 'text', 26, null, [13], 3e3],
  ];
  const split = p => { const k = p.lastIndexOf('/'); return k < 0 ? ['', p] : [p.slice(0, k), p.slice(k + 1)]; };
  const make = (p, kind, born, died, edits, size) => { const [dir, name] = split(p); return { path: p, dir, name, kind, born, died, edits, size, restores: [] }; };
  const FILES = RAW.map(([p, kind, b, d, e = [], size = 0]) =>
    make(p, kind, NOW0 - b * DAY, d == null ? null : NOW0 - d * DAY, e.map(x => NOW0 - x * DAY).sort((a, z) => a - z), size));
  const byPath = () => new Map(FILES.map(f => [f.path, f]));

  const snaps = [];
  (() => {
    const first = new Date(NOW0 - 30 * DAY); first.setHours(9, 12, 0, 0);
    snaps.push({ time: first.getTime(), kind: 'first', full: true });
    for (let d = 29; d >= 1; d--) {
      const t = new Date(NOW0 - d * DAY); t.setHours(9, 0, 0, 0);
      snaps.push(d === 12 ? { time: t.getTime(), kind: 'kernel', full: true } : { time: t.getTime(), kind: 'auto', full: false });
    }
    const top = new Date(NOW0); top.setMinutes(0, 0, 0);
    for (let k = 11; k >= 0; k--) {
      const t = top.getTime() - k * HOUR;
      if (t > snaps[snaps.length - 1].time + HOUR && t < NOW0 - 5 * 6e4) snaps.push({ time: t, kind: 'auto', full: false });
    }
    snaps.forEach((s, i) => { s.id = `mock${String(i).padStart(3, '0')}`; });
  })();
  const tOf = id => (id === 'now' ? Date.now() : snaps.find(s => s.id === id)?.time);

  function fileState(f, t) {
    let r = null;
    for (const x of f.restores) if (x.at <= t) r = x;
    if (r) return { exists: true, vt: r.asOf };
    if (t < f.born || (f.died != null && t >= f.died)) return { exists: false };
    return { exists: true, vt: t };
  }
  const versionAt = (f, vt) => f.edits.filter(e => e <= vt).length;
  const sizeAt = (f, vt) => (f.kind === 'folder' ? 0 : Math.round(f.size * (1 + 0.06 * versionAt(f, vt))));
  const mtimeAt = (f, vt) => f.edits.filter(e => e <= vt).pop() || f.born;
  const existsNow = p => { const f = byPath().get(p); return !!f && fileState(f, Date.now()).exists; };

  function listing(id, dir) {
    const t = tOf(id);
    if (dir) { const d = byPath().get(dir); if (!d || !fileState(d, t).exists) return null; }
    return FILES.filter(f => f.dir === dir && fileState(f, t).exists).map(f => {
      const st = fileState(f, t);
      return { name: f.name, kind: f.kind, size: sizeAt(f, st.vt), mtime: mtimeAt(f, st.vt), path: f.path };
    });
  }

  let configured = !/setup/.test(location.hash + location.search);
  let firstBackupDone = configured;
  let settings = { frequency: 'hourly', auto: true };
  let running = null;

  function simulate(job, ms, done) {
    running = { kind: job, started: Date.now() };
    emit({ type: 'job-started', job });
    const total = job === 'first' ? 48.3e9 : 3.4e9;
    let pct = 0;
    const timer = setInterval(() => {
      if (!running || running.kind !== job) { clearInterval(timer); return; }
      pct = Math.min(100, pct + 100 / (ms / 200) * (0.6 + Math.random() * 0.8));
      emit({ type: 'progress', job, percent: pct, bytesDone: total * pct / 100, totalBytes: total, secondsRemaining: Math.round((100 - pct) * ms / 100000) });
      if (pct >= 100) {
        clearInterval(timer);
        running = null;
        snaps.push({ id: `mock${String(snaps.length).padStart(3, '0')}`, time: Date.now(), kind: job, full: job === 'first' });
        emit({ type: 'job-finished', job, ok: true });
        emit({ type: 'snapshots-changed' });
        done?.();
      }
    }, 200);
    return () => { clearInterval(timer); running = null; emit({ type: 'job-finished', job, ok: false, code: 'cancelled' }); };
  }

  const DRIVES = [
    { uuid: 'A1B2-C3D4', label: 'Backup Drive', fstype: 'exfat', size: 2e12, free: 1.8e12, removable: true, transport: 'usb', sameDiskAsSystem: false, isSystem: false, hasBackups: true },
    { uuid: '5e1f-77aa', label: 'Seagate Expansion', fstype: 'ext4', size: 4e12, free: 3.6e12, removable: true, transport: 'usb', sameDiskAsSystem: false, isSystem: false, hasBackups: false },
    { uuid: '0c0ffee0-1', label: 'Internal Disk', fstype: 'ext4', size: 1e12, free: 4.12e11, removable: false, transport: 'nvme', sameDiskAsSystem: true, isSystem: true, hasBackups: false },
  ];

  let cancelPrepare = null;

  return {
    isMock: true,
    getWallpaper: async () => window.timeTurnerWallpaper ? window.timeTurnerWallpaper.getWallpaper() : null,
    onWallpaperChanged: cb => window.timeTurnerWallpaper?.onWallpaperChanged(cb),
    onEvent: cb => { listeners.add(cb); return () => listeners.delete(cb); },

    async getStatus() {
      await delay(60);
      return { configured, firstBackupDone, running, destination: { label: 'Backup Drive', present: true }, lastRestore: null, frequency: settings.frequency, auto: settings.auto };
    },
    async getSettings() {
      await delay();
      return { config: { ...settings, destination: { type: 'local', label: 'Backup Drive' }, include: { system: true, home: true, extra: [] } }, space: { free: 1.19e12, total: 1.8e12 } };
    },
    async setSettings(s) { await delay(); Object.assign(settings, s); return settings; },
    async listDrives() { await delay(400); return DRIVES; },
    async setup(opts) {
      await delay(900);
      if (opts.destination?.uuid === 'A1B2-C3D4' && !opts.recoveryKey) throw fail('needs-key', 'This drive already has Time Turner backups. Enter their recovery key to use them.');
      configured = true;
      settings.frequency = opts.frequency || 'hourly';
      return opts.recoveryKey ? { adopted: true } : { recoveryKey: '7KQ2-M9XD-4TVA-H83C-ZP1N-6WRE-B5JF-Q0GY' };
    },
    async scanBackups() { await delay(700); return DRIVES.filter(d => d.hasBackups); },
    async openBackup(uuid, key) {
      await delay(800);
      if (String(key).replace(/[^0-9a-z]/gi, '').length < 16) throw fail('wrong-key', "That recovery key doesn't open these backups.");
      return { token: 'mock-open', snapshots: snaps.slice(-12).map(s => ({ ...s, host: 'ubuntu-desktop' })) };
    },
    async stageMachineRestore() { await delay(500); return { staged: true }; },
    async restartForRestore() { await delay(200); return { rebooting: true }; },
    async acknowledgeLastRestore() { return true; },

    async listSnapshots() { await delay(150); return snaps.map(s => ({ ...s })); },
    async listDir(id, rel) { await delay(60 + Math.random() * 120); return listing(id, rel); },
    async existsNow(rel) { return existsNow(rel); },
    async search(q) {
      await delay(250);
      q = String(q).trim().toLowerCase();
      if (!q) return [];
      const ids = [...snaps.map(s => s.id), 'now'];
      const out = [];
      for (const f of FILES) {
        if (!f.name.toLowerCase().includes(q)) continue;
        let prev = null;
        ids.forEach(id => {
          const st = fileState(f, tOf(id));
          const key = st.exists ? `v${versionAt(f, st.vt)}` : null;
          if (key && key === prev) Object.assign(out[out.length - 1], { snapshotId: id, time: tOf(id) });
          else if (key) out.push({ path: f.path, name: f.name, dir: f.dir, kind: f.kind, snapshotId: id, time: tOf(id) });
          prev = key;
        });
      }
      for (const r of out) r.gone = !existsNow(r.path);
      return out.sort((a, b) => b.time - a.time || a.name.localeCompare(b.name));
    },
    async restore(id, rels, mode) {
      await delay(500);
      const t = tOf(id), at = Date.now(), res = [];
      for (const rel of rels) {
        const f = byPath().get(rel);
        if (!f) continue;
        const desc = FILES.filter(x => x.path === f.path || x.path.startsWith(f.path + '/'));
        if (mode === 'keep-both' && existsNow(rel)) {
          const dot = f.kind === 'folder' ? -1 : f.name.lastIndexOf('.');
          const stem = dot > 0 ? f.name.slice(0, dot) : f.name, ext = dot > 0 ? f.name.slice(dot) : '';
          let n = 1, name;
          do { name = `${stem} (restored${n > 1 ? ' ' + n : ''})${ext}`; n++; } while (existsNow(f.dir ? `${f.dir}/${name}` : name));
          const root = f.dir ? `${f.dir}/${name}` : name;
          for (const x of desc) {
            const st = fileState(x, t);
            if (st.exists) FILES.push(make(root + x.path.slice(f.path.length), x.kind, at - 1, null, [], sizeAt(x, st.vt)));
          }
          res.push({ path: root, name });
        } else {
          for (const x of desc) { const st = fileState(x, t); if (st.exists) x.restores.push({ at, asOf: st.vt }); }
          res.push({ path: rel, name: f.name });
        }
      }
      return res;
    },
    async backupNow() {
      if (running) throw fail('busy', 'A backup is already running');
      const job = firstBackupDone ? 'manual' : 'first';
      simulate(job, job === 'first' ? 8000 : 2600, () => { firstBackupDone = true; });
      return { started: true };
    },
    async cancelBackup() { running = null; return { cancelled: true }; },
    async prepareSystemRestore() {
      await delay(200);
      const token = 'mock-token';
      cancelPrepare = simulate('pre-restore', 4500, () => emit({ type: 'system-restore-ready', token }));
      return { token };
    },
    async commitSystemRestore() { await delay(200); return { rebooting: true }; },
    async cancelSystemRestore() { if (running?.kind === 'pre-restore') cancelPrepare?.(); return { cancelled: true }; },
    async pickFolder() { return { name: 'Media', path: '/srv/media' }; },
  };
})();

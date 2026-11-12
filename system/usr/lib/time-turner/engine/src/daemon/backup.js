'use strict';
// Backups, retention (rolling thinning) and free-space management.
const fs = require('fs');
const path = require('path');
const P = require('./paths');
const { BASE_EXCLUDES } = require('./config');
const { Restic } = require('./restic');
const { readMounts } = require('./destination');
const { writeFileAtomic, logger, TTError, isWithin } = require('./util');

const TAG = 'time-turner';
const FULL_KINDS = new Set(['first', 'kernel', 'upgrade']);
const LOCAL_FSTYPES = new Set(['ext2', 'ext3', 'ext4', 'btrfs', 'xfs', 'f2fs', 'vfat', 'jfs', 'reiserfs']);
const SKIP_UNDER = ['/proc', '/sys', '/dev', '/run', '/tmp', '/media', '/mnt', '/snap', '/var/snap', '/var/lib/docker', '/var/lib/containers'];

// Rolling retention: everything from the last day, daily for a month, weekly after that.
const RETENTION = {
  'keep-within': '1d',
  'keep-within-daily': '30d',
  'keep-within-weekly': '100y',
  'keep-last': 1,
  'keep-tag': ['full', 'pre-restore'],
};
const PRUNE_EVERY_MS = 7 * 24 * 3600e3;

function devOf(p) {
  try { return fs.statSync(p).dev; } catch { return null; }
}

/** What a person sees when a backup fails (the technical reason stays in the log). */
function friendlyError(code, raw) {
  const again = ' Time Turner will try again in 15 minutes.';
  switch (code) {
    case 'destination-full': return raw;
    case 'no-space': return 'The backup drive is full.' + again;
    case 'destination-missing': case 'not-configured': case 'busy': case 'needs-key': return raw;
    case 'wrong-key': return 'The backup drive\u2019s key doesn\u2019t match. Open Time Turner\u2019s settings and choose the drive again.';
    case 'no-repo': return 'The backups on this drive can\u2019t be found. Was the drive reformatted? Choose it again in Time Turner\u2019s settings.';
    case 'locked': return 'Another program is using the backup drive right now.' + again;
    case 'restic-missing': return 'Time Turner\u2019s backup engine is missing. Reinstall Time Turner from the palOS Store.';
    default:
      if (/input\/output error|read-only file system|EIO/i.test(raw)) return 'The backup drive reported a read or write error. It may be failing; check it in Disk Utility.' + again;
      return 'The backup couldn\u2019t be finished.' + again;
  }
}

/** The list of paths handed to restic for this configuration. */
function computeTargets(cfg, { mounts = readMounts(), destMount = null } = {}) {
  const inc = cfg.include || {};
  const targets = [];
  if (inc.system) {
    targets.push('/');
    // Separate local filesystems that are part of the system (e.g. /home, /boot, /boot/efi)
    for (const m of mounts) {
      if (m.target === '/' || !LOCAL_FSTYPES.has(m.fstype) || !m.source.startsWith('/dev/')) continue;
      if (SKIP_UNDER.some(s => isWithin(m.target, s))) continue;
      if (destMount && isWithin(m.target, destMount)) continue;
      if (!targets.includes(m.target)) targets.push(m.target);
    }
  } else if (inc.home) {
    targets.push('/home');
  }
  const devices = new Set(targets.map(devOf));
  for (const extra of inc.extra || []) {
    if (!fs.existsSync(extra)) { logger.warn(`skipping missing folder ${extra}`); continue; }
    const covered = targets.some(t => isWithin(extra, t)) && devices.has(devOf(extra));
    if (!covered) { targets.push(extra); devices.add(devOf(extra)); }
  }
  return targets;
}

function computeExcludes(cfg, { destMount = null, repoPath = null } = {}) {
  const ex = [...BASE_EXCLUDES, ...(cfg.excludeExtra || [])];
  if (cfg.include?.system && !cfg.include?.home) ex.push('/home/*');
  if (destMount && destMount !== '/') ex.push(destMount);
  if (repoPath) ex.push(repoPath);
  ex.push(P.runDir);
  return [...new Set(ex)];
}

function writeExcludeFile(file, patterns) {
  writeFileAtomic(file, patterns.join('\n') + '\n', 0o600);
}

function tagsFor(kind) {
  const tags = [TAG, kind];
  if (FULL_KINDS.has(kind)) tags.push('full');
  return tags;
}

/** Turn a restic snapshot into what the UI needs. */
function describeSnapshot(s) {
  const tags = s.tags || [];
  const kind = ['first', 'kernel', 'upgrade', 'pre-restore', 'manual', 'auto'].find(k => tags.includes(k)) || 'auto';
  return {
    id: s.id,
    shortId: s.short_id || s.id.slice(0, 8),
    time: new Date(s.time).getTime(),
    host: s.hostname,
    kind,
    full: tags.includes('full'),
    tags,
  };
}

class BackupEngine {
  /**
   * @param {object} o
   * @param {() => object} o.getConfig
   * @param {object} o.state           mutable state object (saved by saveState)
   * @param {() => void} o.saveState
   * @param {import('./destination').Destination} o.dest
   * @param {(ev:object) => void} o.emit
   * @param {() => Promise<void>} o.beforeExclusive  called before forget/prune (stops browse mounts)
   */
  constructor({ getConfig, state, saveState, dest, emit, beforeExclusive }) {
    Object.assign(this, { getConfig, state, saveState, dest, emit, beforeExclusive });
    this.current = null;     // { kind, child, cancelled }
  }

  resticFor(lease, opts = {}) {
    return new Restic({ repo: lease.repoPath, passwordFile: P.key, ...opts });
  }

  get running() { return this.current; }

  cancel() {
    if (!this.current) return false;
    this.current.cancelled = true;
    this.current.child?.kill('SIGINT');
    return true;
  }

  /**
   * Run one backup. kind: auto | manual | first | kernel | upgrade | pre-restore
   * Resolves { snapshotId, warnings }.
   */
  async run(kind) {
    if (this.current) throw new TTError('busy', 'A backup is already running');
    const cfg = this.getConfig();
    if (!cfg?.destination) throw new TTError('not-configured', 'Time Turner has not been set up');
    if (!this.state.firstBackupDone && !['pre-restore'].includes(kind)) kind = 'first';
    const job = { kind, child: null, cancelled: false, started: Date.now() };
    this.current = job;
    this.emit({ type: 'job-started', job: kind });
    let lease;
    try {
      lease = await this.dest.acquire();
      const restic = this.resticFor(lease);
      const targets = computeTargets(cfg, { destMount: lease.mountPoint });
      writeExcludeFile(P.excludeFile, computeExcludes(cfg, { destMount: lease.mountPoint, repoPath: lease.repoPath }));
      logger.info(`backup (${kind}) of ${targets.join(' ')} to ${lease.repoPath}`);

      let lastEmit = 0;
      const doBackup = () => restic.backup(targets, {
        host: cfg.host,
        tags: tagsFor(kind),
        excludeFile: P.excludeFile,
        onSpawn: c => { job.child = c; },
        onProgress: m => {
          const now = Date.now();
          if (now - lastEmit < 400) return;
          lastEmit = now;
          this.emit({
            type: 'progress', job: kind,
            percent: Math.round((m.percent_done || 0) * 1000) / 10,
            bytesDone: m.bytes_done || 0, totalBytes: m.total_bytes || 0,
            filesDone: m.files_done || 0, totalFiles: m.total_files || 0,
            secondsRemaining: m.seconds_remaining ?? null,
          });
        },
      });
      let result;
      try {
        result = await doBackup();
      } catch (err) {
        // The drive ran out of room: clear what the failed attempt left behind, remove the oldest backups until
        // this one fits, and try once more. Without this a full drive stayed full and every backup failed.
        if (err.code !== 'no-space' || job.cancelled) throw err;
        logger.warn('the backup drive filled up during the backup; making room and trying again');
        this.emit({ type: 'progress', job: kind, percent: 0, bytesDone: 0, totalBytes: 0, filesDone: 0, totalFiles: 0,
          secondsRemaining: null, step: 'Making room on the backup drive…' });
        job.child = null;
        const full = () => new TTError('destination-full', 'The backup drive is full. Time Turner removed every older backup it could, '
          + 'and this backup still doesn\u2019t fit. Connect a bigger drive, or choose another one in Time Turner\u2019s settings.');
        const tried = await this.makeRoom(restic, lease, targets, job);
        if (!tried) throw full();
        try {
          result = await doBackup();
        } catch (err2) {
          if (err2.code !== 'no-space' || job.cancelled) throw err2;
          // still too big: clear this attempt's half-written data too, so the drive is never left jammed
          await restic.prune({ emergency: true }).catch(() => {});
          throw full();
        }
      }

      this.state.lastBackup = { time: Date.now(), kind, snapshotId: result.snapshotId, ok: true, warnings: result.warnings };
      if (kind === 'first') this.state.firstBackupDone = true;
      this.saveState();
      logger.info(`backup ${result.snapshotId.slice(0, 8)} done (${result.warnings} warnings)`);

      // Housekeeping must not fail the backup itself.
      job.child = null;
      await this.housekeeping(restic, lease).catch(err => logger.warn('housekeeping failed:', err.message));

      this.emit({ type: 'job-finished', job: kind, ok: true, snapshotId: result.snapshotId, warnings: result.warnings });
      this.emit({ type: 'snapshots-changed' });
      return result;
    } catch (err) {
      const code = job.cancelled ? 'cancelled' : err.code || 'error';
      if (!job.cancelled) logger.error(`backup (${kind}) details:`, err.message);
      err.message = friendlyError(code, err.message);
      this.state.lastBackup = { time: Date.now(), kind, ok: false, error: err.message, code };
      this.saveState();
      if (code !== 'cancelled') logger.error(`backup (${kind}) failed:`, err.message);
      this.emit({ type: 'job-finished', job: kind, ok: false, code, error: err.message });
      throw job.cancelled ? new TTError('cancelled', 'Backup cancelled') : err;
    } finally {
      lease?.release();
      this.current = null;
    }
  }

  async housekeeping(restic, lease) {
    const cfg = this.getConfig();
    await this.beforeExclusive?.();
    await restic.forgetPolicy({ host: cfg.host, tag: TAG, keep: RETENTION });
    const due = !this.state.lastPrune || Date.now() - this.state.lastPrune > PRUNE_EVERY_MS;
    const low = this.isLowOnSpace(lease.mountPoint);
    if (due || low) {
      await restic.prune();
      this.state.lastPrune = Date.now();
      this.saveState();
    }
    if (this.isLowOnSpace(lease.mountPoint)) await this.freeSpace(restic, lease);
  }

  freeBytes(mountPoint) {
    try { const st = fs.statfsSync(mountPoint); return st.bavail * st.bsize; } catch { return 0; }
  }

  /**
   * After a backup ran out of room: clear its leftovers, then remove the oldest backups (never the newest one,
   * nor the newest full system image) until the backup is expected to fit. Resolves whether it should fit now.
   */
  async makeRoom(restic, lease, targets, job) {
    const cfg = this.getConfig();
    const onSpawn = c => { job.child = c; };
    await this.beforeExclusive?.();
    await restic.unlock().catch(() => {});
    await restic.prune({ emergency: true, onSpawn }).catch(err => logger.warn('clearing the failed backup\u2019s leftovers:', err.message));
    let need = null;
    try { need = await restic.wouldAdd(targets, { host: cfg.host, excludeFile: P.excludeFile, onSpawn }); } catch (err) { logger.warn('size estimate failed:', err.message); }
    const margin = 128 * 2 ** 20;
    const want = need != null ? Math.ceil(need * 1.05) + margin : null;
    logger.info(`making room: ${need != null ? Math.round(need / 2 ** 20) + ' MB to add' : 'size unknown'}, ${Math.round(this.freeBytes(lease.mountPoint) / 2 ** 20)} MB free`);
    const enough = () => (want != null ? this.freeBytes(lease.mountPoint) >= want : !this.isLowOnSpace(lease.mountPoint));
    let removed = 0;
    for (let round = 0; round < 64 && !enough(); round++) {
      if (job.cancelled) return false;
      const snaps = (await restic.snapshots({ host: cfg.host, tag: TAG })).map(describeSnapshot);
      if (snaps.length <= 1) break;
      const newest = snaps[snaps.length - 1].id;
      const newestFull = [...snaps].reverse().find(s => s.full)?.id;
      // ordinary hourly/daily backups go first, then older full images; the newest of each kind always stays
      let victims = snaps.filter(s => !s.full && s.kind !== 'pre-restore' && s.id !== newest);
      if (!victims.length) victims = snaps.filter(s => s.id !== newest && s.id !== newestFull);
      if (!victims.length) break;
      const batch = victims.slice(0, Math.min(victims.length, 2 ** Math.min(round, 4))).map(s => s.id);
      logger.warn(`backup drive is full; removing ${batch.length} oldest backup(s) to make room`);
      await restic.forget(batch);
      await restic.prune({ emergency: true, onSpawn });
      removed += batch.length;
    }
    // a normal prune tidies partly used data once there is room to do it
    if (removed) await restic.prune({ onSpawn }).catch(() => {});
    this.state.lastPrune = Date.now();
    this.saveState();
    this.emit({ type: 'snapshots-changed' });
    // try again when it should fit now, or when anything was removed (the estimate is only an estimate)
    const ok = enough() || removed > 0;
    logger.info(`making room: removed ${removed} backup(s), ${Math.round(this.freeBytes(lease.mountPoint) / 2 ** 20)} MB free, ${ok ? 'trying again' : 'still not enough'}`);
    return ok;
  }

  isLowOnSpace(mountPoint) {
    try {
      const s = fs.statfsSync(mountPoint);
      const free = s.bavail * s.bsize, total = s.blocks * s.bsize;
      const want = Math.min(Math.max(total * 0.05, 2 * 2 ** 30), 20 * 2 ** 30);
      return free < want;
    } catch { return false; }
  }

  /** Delete the oldest backups until there is breathing room again (rolling). */
  async freeSpace(restic, lease) {
    const cfg = this.getConfig();
    for (let round = 0; round < 8 && this.isLowOnSpace(lease.mountPoint); round++) {
      const snaps = (await restic.snapshots({ host: cfg.host, tag: TAG })).map(describeSnapshot);
      if (snaps.length <= 2) break;
      const newest = snaps[snaps.length - 1].id;
      const newestFull = [...snaps].reverse().find(s => s.full)?.id;
      let victims = snaps.filter(s => !s.full && s.kind !== 'pre-restore' && s.id !== newest);
      if (!victims.length) victims = snaps.filter(s => s.id !== newest && s.id !== newestFull);
      if (!victims.length) break;
      const batch = victims.slice(0, 2 ** round).map(s => s.id);
      logger.warn(`backup drive is nearly full; removing ${batch.length} oldest backup(s)`);
      await restic.forget(batch);
      await restic.prune();
      this.state.lastPrune = Date.now();
      this.saveState();
    }
    if (this.isLowOnSpace(lease.mountPoint)) this.emit({ type: 'warning', code: 'destination-full', message: 'The backup drive is almost full.' });
  }
}

module.exports = { BackupEngine, computeTargets, computeExcludes, describeSnapshot, tagsFor, TAG, RETENTION, writeExcludeFile };

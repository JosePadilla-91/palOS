'use strict';
// Finds drives, mounts the backup destination when needed, and hands out the
// repository path. Mounts made by the daemon are released after a short idle
// period so a USB drive can be unplugged between backups.
const fs = require('fs');
const path = require('path');
const P = require('./paths');
const { run, mkdirp, logger, TTError, sleep, readDriveKey, writeDriveKey } = require('./util');

const BACKUP_FSTYPES = new Set(['ext4', 'ext3', 'btrfs', 'xfs', 'f2fs', 'exfat', 'vfat', 'ntfs', 'ntfs3']);
const EFI_PARTTYPE = 'c12a7328-f81f-11d2-ba4b-00a0c93ec93b';
const IDLE_UNMOUNT_MS = 2 * 60e3;

function decodeMount(s) {
  return s.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

/** All current mounts as [{ source, target, fstype }]. */
function readMounts() {
  try {
    return fs.readFileSync('/proc/self/mounts', 'utf8').trim().split('\n').map(l => {
      const [source, target, fstype] = l.split(' ');
      return { source: decodeMount(source), target: decodeMount(target), fstype };
    });
  } catch { return []; }
}

/** Where the filesystem with this UUID is mounted, or null. */
function findMountByUuid(uuid) {
  let dev;
  try { dev = fs.realpathSync(`/dev/disk/by-uuid/${uuid}`); } catch { return null; }
  for (const m of readMounts()) {
    if (!m.source.startsWith('/dev/')) continue;
    let src;
    try { src = fs.realpathSync(m.source); } catch { continue; }
    if (src === dev) return m.target;
  }
  return null;
}

function flatten(devices, parent = null, out = []) {
  for (const d of devices || []) {
    out.push({ ...d, parentDisk: d.type === 'disk' ? d.path : (parent?.parentDisk || parent?.path || null) });
    flatten(d.children, out[out.length - 1], out);
  }
  return out;
}

async function lsblk() {
  const out = await run('lsblk', ['-J', '-b', '-o',
    'PATH,UUID,LABEL,FSTYPE,SIZE,FSAVAIL,FSUSED,MOUNTPOINTS,TRAN,TYPE,RM,HOTPLUG,MODEL,PARTTYPE']);
  const json = JSON.parse(out);
  return flatten(json.blockdevices);
}

function rootDisk(devs) {
  const root = devs.find(d => (d.mountpoints || []).includes('/'));
  return root?.parentDisk || null;
}

/** Drives that could hold backups, for the setup wizard. */
async function listDrives() {
  const devs = await lsblk();
  const sysDisk = rootDisk(devs);
  const disks = new Map(devs.filter(d => d.type === 'disk').map(d => [d.path, d]));
  const drives = [];
  for (const d of devs) {
    if (!d.uuid || !BACKUP_FSTYPES.has(d.fstype)) continue;
    if ((d.parttype || '').toLowerCase() === EFI_PARTTYPE) continue;
    const mps = (d.mountpoints || []).filter(Boolean);
    if (mps.some(m => m === '/boot' || m === '/boot/efi' || m === '[SWAP]')) continue;
    const disk = disks.get(d.parentDisk) || d;
    const removable = !!(disk.rm || disk.hotplug || d.rm || d.hotplug) || disk.tran === 'usb';
    const sameDiskAsSystem = d.parentDisk && d.parentDisk === sysDisk;
    const mountPoint = mps[0] || null;
    drives.push({
      uuid: d.uuid,
      device: d.path,
      label: d.label || disk.model?.trim() || (removable ? 'External Drive' : 'Internal Disk'),
      fstype: d.fstype,
      size: Number(d.size) || null,
      free: d.fsavail != null ? Number(d.fsavail) : null,
      mountPoint,
      transport: disk.tran || null,
      removable,
      isSystem: mps.includes('/'),
      sameDiskAsSystem: !!sameDiskAsSystem,
      hasBackups: mountPoint ? fs.existsSync(path.join(mountPoint, P.repoDirName, 'config')) : null,
    });
  }
  // External drives first, then other internal disks, then the system disk.
  const rank = d => (d.removable ? 0 : d.sameDiskAsSystem ? 2 : 1);
  return drives.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
}

/** Parse smb://server/share/sub/dir into { share: //server/share, subdir } */
function parseSmbUrl(url) {
  const m = /^(?:smb:)?\/\/([^/\s]+)\/([^/\s]+)(\/.*)?$/.exec(String(url).trim());
  if (!m) throw new TTError('bad-config', 'Network address must look like smb://server/share');
  return { share: `//${m[1]}/${m[2]}`, subdir: (m[3] || '').replace(/^\/+|\/+$/g, '') };
}

/**
 * Hands out the mounted destination with reference counting.
 *   const lease = await dest.acquire(); ... lease.repoPath ... lease.release();
 */
class Destination {
  constructor(getConfig) {
    this.getConfig = getConfig;
    this.refs = 0;
    this.ownMount = null;     // mount point we created, if any
    this.idleTimer = null;
    this.lock = Promise.resolve();
  }

  describe() {
    const d = this.getConfig()?.destination;
    if (!d) return null;
    return d.type === 'smb' ? { ...d, label: d.label || d.url } : d;
  }

  /** Is the destination reachable without mounting anything? (cheap) */
  isPresent() {
    const d = this.getConfig()?.destination;
    if (!d) return false;
    if (d.type === 'path') return true;
    if (d.type === 'local') return fs.existsSync(`/dev/disk/by-uuid/${d.uuid}`);
    return true; // network shares: we find out when we try to mount
  }

  async acquire() {
    // serialise mount/unmount decisions
    const prev = this.lock;
    let done;
    this.lock = new Promise(r => { done = r; });
    await prev;
    try {
      clearTimeout(this.idleTimer);
      const mountPoint = await this.ensureMounted();
      this.refs++;
      const d = this.getConfig().destination;
      const base = d.type === 'smb' && parseSmbUrl(d.url).subdir ? path.join(mountPoint, parseSmbUrl(d.url).subdir) : mountPoint;
      let released = false;
      const repoPath = path.join(base, P.repoDirName);
      // backups set up before the key travelled with them: put it next to them now (once)
      try {
        if (fs.existsSync(path.join(repoPath, 'config')) && fs.existsSync(P.key) && !readDriveKey(repoPath)) {
          if (writeDriveKey(repoPath, fs.readFileSync(P.key, 'utf8').trim())) logger.info('the backups\' key is now kept with them');
        }
      } catch { /* a read-only share: it stays on this computer only */ }
      return {
        mountPoint,
        repoPath,
        release: () => { if (!released) { released = true; this.release(); } },
      };
    } finally { done(); }
  }

  release() {
    this.refs = Math.max(0, this.refs - 1);
    if (this.refs === 0 && this.ownMount) {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.unmountIdle().catch(err => logger.warn('unmount failed:', err.message)), IDLE_UNMOUNT_MS);
      this.idleTimer.unref?.();
    }
  }

  async ensureMounted() {
    const d = this.getConfig()?.destination;
    if (!d) throw new TTError('not-configured', 'Time Turner has not been set up');
    // Test-only destination: a plain directory (allowed only under TT_ROOT, see config.validateConfig)
    if (d.type === 'path' && P.ROOT) { mkdirp(d.path, 0o700); return d.path; }
    if (d.type === 'local') {
      const existing = findMountByUuid(d.uuid);
      if (existing) return existing;
      if (!fs.existsSync(`/dev/disk/by-uuid/${d.uuid}`)) throw new TTError('destination-missing', `${d.label || 'The backup drive'} is not connected`);
      const mp = path.join(P.runDir, 'dest', d.uuid);
      mkdirp(mp, 0o700);
      await run('mount', ['-o', 'noatime', `UUID=${d.uuid}`, mp]);
      this.ownMount = mp;
      logger.info(`mounted backup drive at ${mp}`);
      return mp;
    }
    // SMB / CIFS
    const { share } = parseSmbUrl(d.url);
    const mp = path.join(P.runDir, 'smb');
    if (readMounts().some(m => m.target === mp)) return mp;
    mkdirp(mp, 0o700);
    try {
      await run('mount', ['-t', 'cifs', share, mp, '-o',
        `credentials=${P.smbCredentials},uid=0,gid=0,file_mode=0600,dir_mode=0700,nobrl`], { timeout: 60000 });
    } catch (err) {
      throw new TTError('destination-missing', `Could not connect to ${d.url}: ${err.stderr || err.message}`);
    }
    this.ownMount = mp;
    logger.info(`mounted ${share} at ${mp}`);
    return mp;
  }

  async unmountIdle() {
    if (this.refs > 0 || !this.ownMount) return;
    const mp = this.ownMount;
    for (let i = 0; i < 3; i++) {
      try {
        await run('umount', [mp]);
        this.ownMount = null;
        logger.info(`unmounted ${mp}`);
        return;
      } catch { await sleep(2000); }
    }
    logger.warn(`could not unmount ${mp}; will retry later`);
    this.idleTimer = setTimeout(() => this.unmountIdle().catch(() => {}), IDLE_UNMOUNT_MS);
  }

  /** Free/total bytes of the destination filesystem (mounts it briefly). */
  async space() {
    const lease = await this.acquire();
    try {
      const s = fs.statfsSync(lease.mountPoint);
      return { free: s.bavail * s.bsize, total: s.blocks * s.bsize };
    } finally { lease.release(); }
  }
}

/**
 * Mount a filesystem read-only just long enough to run fn(mountPoint).
 * Used to look for existing backups on drives that are not mounted.
 */
async function withProbeMount(uuid, fn) {
  const existing = findMountByUuid(uuid);
  if (existing) return fn(existing);
  const mp = path.join(P.runDir, 'probe', uuid);
  mkdirp(mp, 0o700);
  await run('mount', ['-o', 'ro', `UUID=${uuid}`, mp]);
  try { return await fn(mp); } finally {
    await run('umount', [mp]).catch(err => logger.warn('probe unmount failed:', err.message));
  }
}

module.exports = { Destination, listDrives, parseSmbUrl, findMountByUuid, withProbeMount, readMounts, lsblk };

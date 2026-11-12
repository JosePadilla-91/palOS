'use strict';
// Disks and removable drives via lsblk + udisks2 (udisksctl).
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');
const { sh, run, which, readText } = require('./util');
const config = require('./config');

class Volumes extends EventEmitter {
  constructor() { super(); this.vols = []; this.sig = ''; this.seen = new Set(); this.timer = null; this.first = true; }

  start() { this.poll(); this.timer = setInterval(() => this.poll(), 2000); }

  async poll() {
    const out = await sh('lsblk', ['-J', '-b', '-o', 'NAME,PATH,LABEL,MOUNTPOINT,RM,HOTPLUG,SIZE,TYPE,FSTYPE,MODEL,PKNAME,TRAN,UUID,PARTTYPE,PARTLABEL'], { timeout: 4000 });
    let tree; try { tree = JSON.parse(out).blockdevices || []; } catch { tree = []; }
    const flat = [];
    const walk = (list, parent) => { for (const d of list || []) { d.parent = parent; flat.push(d); walk(d.children, d); } };
    walk(tree, null);
    const vols = [];
    for (const d of flat) {
      const disk = d.parent && d.type !== 'disk' ? topDisk(d) : d;
      const removable = !!(truthy(d.rm) || truthy(d.hotplug) || (disk && (truthy(disk.rm) || truthy(disk.hotplug))) || (disk && disk.tran === 'usb'));
      const optical = d.type === 'rom';
      if (d.fstype === 'swap' || !d.fstype && !optical) continue;
      if (d.mountpoint === '/') {
        vols.push({ dev: d.path, target: '/', name: config.get().hardDiskName, removable: false, internal: true, system: true, size: +d.size, fstype: d.fstype, icon: ['drive-harddisk-palos', 'drive-harddisk-system', 'drive-harddisk'] });
        continue;
      }
      if (d.mountpoint && d.mountpoint.startsWith('[')) continue;
      const user = d.mountpoint && /^\/(media|run\/media|mnt)\//.test(d.mountpoint);
      // a drive inside the computer: its data partitions are disks too (they go on the desktop). Not the
      // system's own pieces: EFI, recovery, Microsoft reserved, other system mounts, encrypted or locked ones.
      const internal = !removable && !optical && (user || (!d.mountpoint && dataPartition(d)));
      if (!removable && !internal) continue;
      // the Windows drive (Windows itself is on it) gets the Windows icon; every other drive, NTFS or not, the standard one
      const ntfs = d.fstype === 'ntfs' || d.fstype === 'ntfs3';
      const windows = ntfs && !removable && (d.mountpoint ? fs.existsSync(path.join(d.mountpoint, 'Windows', 'System32')) : /^(os|windows|windows ?\d*)$/i.test(d.label || ''));
      const name = d.label || d.partlabel && !/^(basic data partition|microsoft basic data)$/i.test(d.partlabel) && d.partlabel || (d.mountpoint ? path.basename(d.mountpoint) : null) || (windows ? 'Windows' : `${humanGB(+d.size)} Volume`);
      const kindIcon = optical ? ['media-optical', 'drive-optical'] : removable ? ['drive-removable-media-usb', 'drive-removable-media', 'drive-harddisk-usb', 'drive-harddisk']
        : windows ? ['drive-harddisk-windows', 'drive-harddisk'] : ['drive-harddisk'];
      vols.push({
        dev: d.path, disk: disk ? disk.path : null, target: d.mountpoint || null, name, removable, internal: !removable, optical, windows, size: +d.size, fstype: d.fstype, uuid: d.uuid,
        icon: !optical && isBackup(d.label, d.mountpoint) ? ['drive-harddisk-backup', ...kindIcon] : kindIcon,
      });
    }
    vols.push(...networkMounts());
    vols.push(...packMounts());
    // Auto-mount newly attached removable volumes (as Seeker does).
    if (config.get().automount && which('udisksctl')) {
      for (const v of vols) {
        // every disk mounts by itself: plugged in now, already plugged in at login, or inside the computer
        if (!v.target && (v.removable || v.internal) && !v.optical && !this.seen.has(v.dev)) this.mount(v.dev);
        this.seen.add(v.dev);
      }
      for (const dev of [...this.seen]) if (!vols.find((v) => v.dev === dev)) this.seen.delete(dev);
    } else vols.forEach((v) => this.seen.add(v.dev));
    this.first = false;
    const sig = JSON.stringify(vols);
    if (sig !== this.sig) { this.sig = sig; this.vols = vols; this.emit('change', this.list()); }
  }

  /** Mounted volumes only (what Seeker shows). */
  list() { return this.vols.filter((v) => v.target); }
  all() { return this.vols; }
  byTarget(t) { return this.vols.find((v) => v.target === t) || null; }

  async mount(dev) {
    const r = await run('udisksctl', ['mount', '-b', dev, '--no-user-interaction']);
    setTimeout(() => this.poll(), 300);
    const m = r.out.match(/ at (.+?)\.?\s*$/m);
    return { ok: r.ok, target: m ? m[1] : null, error: r.ok ? null : r.err.trim() };
  }

  async eject(targetOrDev) {
    const v = this.vols.find((x) => x.target === targetOrDev || x.dev === targetOrDev);
    if (!v) return { ok: false, error: 'Volume not found' };
    let r;
    if (v.pack) {
      r = await run('fusermount3', ['-u', v.target]);
      if (r.ok) { try { fs.rmdirSync(v.target); } catch {} }
    } else if (v.network) {
      r = v.gvfs ? await run('gio', ['mount', '-u', v.target]) : await run('umount', [v.target]);
    } else if (which('udisksctl')) {
      r = await run('udisksctl', ['unmount', '-b', v.dev, '--no-user-interaction']);
      if (r.ok && v.removable && v.disk) {
        const siblings = this.vols.filter((x) => x.disk === v.disk && x.dev !== v.dev && x.target);
        if (!siblings.length) await run('udisksctl', ['power-off', '-b', v.disk, '--no-user-interaction']);
      }
    } else r = await run('umount', [v.target]);
    setTimeout(() => this.poll(), 300);
    let error = null;
    if (!r.ok) error = /busy/i.test(r.err) ? `The disk “${v.name}” wasn’t ejected because one or more programs may be using it.` : r.err.trim();
    return { ok: r.ok, error };
  }
}

/** A drive that holds backups: Time Turner's folder on it, or a name that says so. */
function isBackup(label, target) {
  if (label && /backup|time ?turner|time ?machine|sauvegarde|sicherung|respaldo/i.test(label)) return true;
  if (!target) return false;
  try { return fs.existsSync(path.join(target, 'TimeTurner')) || fs.existsSync(path.join(target, '.timeturner')); } catch { return false; }
}

const NET_FS = /^(cifs|smb3?|nfs4?|fuse\.sshfs|sshfs|davfs|fuse\.davfs|9p|afpfs|fuse\.rclone)$/;
const GVFS = path.join(process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid ? process.getuid() : 1000}`, 'gvfs');
/** Network shares: mounted by the system (fstab, mount -t cifs/nfs...) or by the file browser through gvfs. */
function networkMounts() {
  const out = [];
  const icon = ['drive-harddisk-network', 'network-server', 'folder-remote', 'drive-harddisk'];
  for (const line of readText('/proc/self/mountinfo').split('\n')) {
    const f = line.split(' '); if (f.length < 10) continue;
    const sep = f.indexOf('-'); if (sep < 0) continue;
    const fstype = f[sep + 1], source = f[sep + 2] || '';
    if (!NET_FS.test(fstype)) continue;
    const target = f[4].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
    const name = path.basename(source.replace(/\/+$/, '')) || source.replace(/^.*[:\/]/, '') || path.basename(target);
    out.push({ dev: 'net:' + target, target, name, removable: true, network: true, fstype, size: 0, icon });
  }
  let entries = [];
  try { entries = fs.readdirSync(GVFS); } catch {}
  for (const e of entries) {
    // gvfs names shares like  smb-share:server=nas,share=photos  or  sftp:host=box,user=me
    const m = e.match(/^(smb-share|sftp|ftp|dav|davs|nfs|afp-volume|ssh):(.*)$/);
    if (!m) continue;
    const kv = Object.fromEntries(m[2].split(',').map((x) => x.split('=')));
    const name = kv.share ? `${kv.share} on ${kv.server}` : (kv.host || kv.server || e);
    out.push({ dev: 'gvfs:' + e, target: path.join(GVFS, e), name, removable: true, network: true, gvfs: true, fstype: m[1], size: 0, icon });
  }
  return out;
}

/** Opened .pack files: each is mounted (by palos-pack, without a password) as its own volume, like a Mac .dmg. */
function packMounts() {
  const out = [];
  const base = path.join(process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid ? process.getuid() : 1000}`, 'packs') + '/';
  for (const line of readText('/proc/self/mountinfo').split('\n')) {
    const f = line.split(' '); if (f.length < 10) continue;
    const sep = f.indexOf('-'); if (sep < 0) continue;
    if (!/^fuse\.squashfuse/.test(f[sep + 1] || '')) continue;
    const target = f[4].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
    if (!target.startsWith(base)) continue;
    out.push({ dev: 'pack:' + target, target, name: path.basename(target), removable: true, pack: true, fstype: 'pack', size: 0,
      icon: ['application-x-palos-pack', 'media-removable', 'drive-removable-media'] });
  }
  return out;
}

function truthy(v) { return v === true || v === 1 || v === '1'; }
function topDisk(d) { let x = d; while (x.parent) x = x.parent; return x; }
function humanGB(n) { return n >= 1e12 ? `${(n / 1e12).toFixed(1)} TB` : `${Math.round(n / 1e9)} GB`; }

module.exports = new Volumes();

// a partition with a filesystem a person can use (not one of the computer's system partitions)
const SYSTEM_PARTTYPES = new Set([
  'c12a7328-f81f-11d2-ba4b-00a0c93ec93b',   // EFI system
  'e3c9e316-0b5c-4db8-817d-f92df00215ae',   // Microsoft reserved
  'de94bba4-06d1-4d40-a16a-bfd50179d6ac',   // Windows recovery
  '21686148-6449-6e6f-744e-656564454649',   // BIOS boot
  '0657fd6d-a4ab-43c4-84e5-0933c84b4f4f',   // Linux swap
  '0x27', '0xef', '0x12', '0x82',            // MBR: Windows recovery, EFI, vendor recovery, swap
]);
function dataPartition(d) {
  if (d.type !== 'part' && d.type !== 'disk') return false;
  if (!d.fstype || /^(crypto_LUKS|BitLocker|LVM2_member|linux_raid_member|zfs_member|swap|squashfs|iso9660)$/i.test(d.fstype)) return false;
  if (d.parttype && SYSTEM_PARTTYPES.has(String(d.parttype).toLowerCase())) return false;
  if (/^(EFI|SYSTEM|RECOVERY|WINRE|Recovery|MSR|ESP|boot)$/i.test(d.label || '') || /recovery|reserved/i.test(d.partlabel || '')) return false;
  if (+d.size < 512 * 1024 * 1024) return false;              // small vendor and boot partitions
  return true;
}

'use strict';
// Browsing and searching inside backups.
//
// Fast path: the repository is mounted read-only with `restic mount`, so
// listing a folder in any backup is an ordinary readdir. If FUSE is not
// available, it falls back to `restic ls` (slower, but always works).
const fs = require('fs');
const path = require('path');
const P = require('./paths');
const { Restic } = require('./restic');
const { describeSnapshot, TAG } = require('./backup');
const { mkdirp, logger, run, sleep, isWithin, TTError } = require('./util');

const MOUNT_IDLE_MS = 10 * 60e3;
const SNAPSHOT_CACHE_MS = 60e3;
const LIST_CACHE_MAX = 4000;

class LRU {
  constructor(max) { this.max = max; this.map = new Map(); }
  get(k) { if (!this.map.has(k)) return undefined; const v = this.map.get(k); this.map.delete(k); this.map.set(k, v); return v; }
  set(k, v) { this.map.delete(k); this.map.set(k, v); if (this.map.size > this.max) this.map.delete(this.map.keys().next().value); }
  clear() { this.map.clear(); }
}

function escapeGlob(s) {
  return s.replace(/[\\*?[\]]/g, c => '\\' + c);
}

const hiddenUnder = (p, root) => path.relative(root, p).split('/').some(seg => seg.startsWith('.'));

/**
 * Collapse restic-find matches into one result per distinct version of each path.
 * snapshots: ascending by time. found: [{ snapshot, matches }].
 */
function groupVersions(snapshots, found, { allowedRoot = '/', limit = 300 } = {}) {
  const order = new Map(snapshots.map((s, i) => [s.id, i]));
  const byPath = new Map();          // path -> Map(snapIndex -> node)
  for (const entry of found) {
    const idx = order.get(entry.snapshot);
    if (idx == null) continue;
    for (const node of entry.matches || []) {
      if (!isWithin(node.path, allowedRoot) || node.path === allowedRoot) continue;
      if (hiddenUnder(node.path, allowedRoot)) continue;
      if (!byPath.has(node.path)) byPath.set(node.path, new Map());
      byPath.get(node.path).set(idx, node);
    }
  }
  const results = [];
  for (const [p, perSnap] of byPath) {
    let prevKey = null;
    for (let i = 0; i < snapshots.length; i++) {
      const n = perSnap.get(i);
      const key = n ? `${n.type}|${n.type === 'dir' ? '' : n.size || 0}|${n.type === 'dir' ? '' : n.mtime}` : null;
      if (key && key === prevKey) {
        const last = results[results.length - 1];
        last.snapshotId = snapshots[i].id; last.time = snapshots[i].time;
      } else if (key) {
        results.push({
          path: p, name: path.posix.basename(p), type: n.type,
          size: n.size || 0, mtime: Date.parse(n.mtime) || null,
          snapshotId: snapshots[i].id, time: snapshots[i].time,
        });
      }
      prevKey = key;
    }
  }
  results.sort((a, b) => b.time - a.time || a.name.localeCompare(b.name));
  return results.slice(0, limit);
}

class Browser {
  constructor({ getConfig, dest }) {
    this.getConfig = getConfig;
    this.dest = dest;
    this.snapCache = null;            // { at, list }
    this.listCache = new LRU(LIST_CACHE_MAX);
    this.mount = null;                // { mp, child, lease, ready }
    this.mountFailed = false;
    this.idleTimer = null;
    this.searches = new Map();        // sender -> child process
  }

  async withRestic(fn, opts) {
    const lease = await this.dest.acquire();
    try { return await fn(new Restic({ repo: lease.repoPath, passwordFile: P.key, ...opts }), lease); }
    finally { lease.release(); }
  }

  invalidate() {
    this.snapCache = null;
    this.listCache.clear();
    // New snapshots only show up in a fresh mount.
    this.stopMount().catch(() => {});
  }

  async snapshots() {
    if (this.snapCache && Date.now() - this.snapCache.at < SNAPSHOT_CACHE_MS) return this.snapCache.list;
    const cfg = this.getConfig();
    const list = await this.withRestic(r => r.snapshots({ host: cfg.host, tag: TAG }));
    this.snapCache = { at: Date.now(), list: list.map(describeSnapshot) };
    return this.snapCache.list;
  }

  async snapshotById(id) {
    const s = (await this.snapshots()).find(x => x.id === id || x.shortId === id);
    if (!s) throw new TTError('no-snapshot', 'That backup no longer exists');
    return s;
  }

  // ----- FUSE mount -----
  async ensureMount() {
    if (process.env.TT_NO_FUSE === '1') return null;   // force the restic-ls path (tests)
    this.touch();
    if (this.mount?.ready) return this.mount;
    if (this.mountFailed) return null;
    if (this.mount?.starting) return this.mount.starting;
    const starting = this.startMount().catch(err => {
      logger.warn('restic mount unavailable, using restic ls instead:', err.message);
      this.mountFailed = true;
      this.mount = null;
      return null;
    });
    this.mount = { starting };
    return starting;
  }

  async startMount() {
    const lease = await this.dest.acquire();
    const mp = path.join(P.runDir, 'browse');
    mkdirp(mp, 0o700);
    await run('umount', ['-l', mp]).catch(() => {});
    const restic = new Restic({ repo: lease.repoPath, passwordFile: P.key });
    const child = restic.mount(mp);
    let stderr = '';
    child.stderr.on('data', d => { stderr += d; });
    let exited = false;
    child.on('exit', () => { exited = true; if (this.mount?.child === child) { this.mount = null; lease.release(); } });
    for (let i = 0; i < 600 && !exited; i++) {
      if (fs.existsSync(path.join(mp, 'ids'))) {
        this.mount = { mp, child, lease, ready: true };
        logger.info(`backups mounted for browsing at ${mp}`);
        return this.mount;
      }
      await sleep(150);
    }
    child.kill('SIGINT');
    lease.release();
    throw new Error(stderr.trim() || 'restic mount did not start');
  }

  touch() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.stopMount().catch(() => {}), MOUNT_IDLE_MS);
    this.idleTimer.unref?.();
  }

  async stopMount() {
    const m = this.mount;
    if (!m?.ready) return;
    this.mount = null;
    m.child.kill('SIGINT');
    await new Promise(r => { m.child.once('exit', r); setTimeout(r, 5000); });
    await run('umount', ['-l', m.mp]).catch(() => {});
    m.lease.release();
    this.mountFailed = false;   // try FUSE again next time
  }

  // ----- listing -----
  /** Children of absPath in a snapshot, or null if the folder did not exist then. */
  async listDir(snapshotId, absPath) {
    const snap = await this.snapshotById(snapshotId);
    const key = `${snap.id}:${absPath}`;
    const cached = this.listCache.get(key);
    if (cached !== undefined) return cached;

    let items = null;
    const m = await this.ensureMount();
    if (m) {
      const dir = path.join(m.mp, 'ids', snap.shortId) + (absPath === '/' ? '' : absPath);
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        items = await Promise.all(entries.map(async e => {
          const st = await fs.promises.lstat(path.join(dir, e.name)).catch(() => null);
          return {
            name: e.name,
            type: e.isDirectory() ? 'dir' : e.isSymbolicLink() ? 'symlink' : e.isFile() ? 'file' : 'other',
            size: st?.size || 0,
            mtime: st?.mtimeMs || null,
          };
        }));
      } catch (err) {
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') items = null;
        else throw err;
      }
    } else {
      items = await this.withRestic(async r => {
        const nodes = await r.ls(snap.id, absPath);
        if (!nodes.length) {
          // empty folder or no folder at all? ask for the parent listing
          const parent = path.posix.dirname(absPath);
          if (absPath === '/' || (await r.ls(snap.id, parent)).some(n => n.path === absPath && n.type === 'dir')) return [];
          return null;
        }
        return nodes.map(n => ({ name: n.name, type: n.type, size: n.size || 0, mtime: Date.parse(n.mtime) || null }));
      });
    }
    this.listCache.set(key, items);
    return items;
  }

  /** Every version of files whose name contains query, newest first, limited to allowedRoot. */
  async search(query, { allowedRoot, sender }) {
    const q = String(query || '').trim();
    if (!q) return [];
    const cfg = this.getConfig();
    this.searches.get(sender)?.kill('SIGINT');
    const snaps = await this.snapshots();
    const found = await this.withRestic(r => r.find(`*${escapeGlob(q)}*`, {
      host: cfg.host,
      onSpawn: c => this.searches.set(sender, c),
    }));
    this.searches.delete(sender);
    return groupVersions(snaps, found, { allowedRoot });
  }
}

module.exports = { Browser, groupVersions, escapeGlob };

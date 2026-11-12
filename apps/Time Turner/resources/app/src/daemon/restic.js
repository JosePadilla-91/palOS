'use strict';
// Thin, promise-based wrapper around the restic binary.
const { spawn } = require('child_process');
const readline = require('readline');
const P = require('./paths');
const { TTError, logger } = require('./util');

function classify(code, stderr) {
  const s = stderr || '';
  if (code === 10 || /repository does not exist|Is there a repository at|unable to open config file/i.test(s)) return 'no-repo';
  if (code === 12 || /wrong password|no key found/i.test(s)) return 'wrong-key';
  if (code === 11 || /unable to create lock|repository is already locked/i.test(s)) return 'locked';
  if (/no space left on device/i.test(s)) return 'no-space';
  return 'restic-failed';
}

class Restic {
  /**
   * @param {object} o
   * @param {string} o.repo          repository path or URL
   * @param {string} o.passwordFile  file holding the repository password
   * @param {boolean} [o.noLock]     read-only access without creating locks
   * @param {boolean} [o.noCache]
   */
  constructor({ repo, passwordFile, noLock = false, noCache = false }) {
    this.repo = repo;
    this.passwordFile = passwordFile;
    this.noLock = noLock;
    this.noCache = noCache;
  }

  env() {
    return {
      ...process.env,
      RESTIC_REPOSITORY: this.repo,
      RESTIC_PASSWORD_FILE: this.passwordFile,
      RESTIC_CACHE_DIR: `${P.cacheDir}/restic`,
      RESTIC_PROGRESS_FPS: '2',
      // restic's FUSE library calls "fusermount"; Ubuntu only ships fusermount3.
      PATH: `${P.shimDir}:${process.env.PATH || '/usr/sbin:/usr/bin:/sbin:/bin'}`,
      HOME: process.env.HOME || '/root',
    };
  }

  globalArgs() {
    const a = [];
    if (this.noLock) a.push('--no-lock');
    if (this.noCache) a.push('--no-cache');
    return a;
  }

  /**
   * Run restic. Resolves { stdout, stderr, code }; rejects TTError on failure.
   * @param {string[]} args
   * @param {object} [o]
   * @param {(line:string)=>void} [o.onLine]   stdout lines as they arrive (stdout is then not buffered)
   * @param {(child)=>void} [o.onSpawn]        receives the child process (for cancelling)
   * @param {number[]} [o.okCodes]             exit codes that count as success
   */
  run(args, { onLine, onSpawn, okCodes = [0] } = {}) {
    const full = [...this.globalArgs(), ...args];
    logger.debug('restic', full.join(' '));
    return new Promise((resolve, reject) => {
      const child = spawn(P.restic, full, { env: this.env(), stdio: ['ignore', 'pipe', 'pipe'] });
      onSpawn?.(child);
      let stdout = '', stderr = '';
      if (onLine) {
        readline.createInterface({ input: child.stdout }).on('line', line => {
          try { onLine(line); } catch (err) { logger.warn('restic line handler failed:', err); }
        });
      } else {
        child.stdout.on('data', d => { stdout += d; });
      }
      child.stderr.on('data', d => { stderr += d; if (stderr.length > 1e6) stderr = stderr.slice(-5e5); });
      child.on('error', err => reject(new TTError('restic-missing', `Could not run restic: ${err.message}`)));
      child.on('close', (code, signal) => {
        if (signal) return reject(new TTError('cancelled', `restic stopped (${signal})`));
        if (okCodes.includes(code)) return resolve({ stdout, stderr, code });
        const kind = classify(code, stderr);
        const msg = stderr.trim().split('\n').filter(Boolean).slice(-3).join(' ') || `exit code ${code}`;
        const err = new TTError(kind, msg);
        err.exitCode = code;
        reject(err);
      });
    });
  }

  async json(args) {
    const { stdout } = await this.run([...args, '--json']);
    return stdout.trim() ? JSON.parse(stdout) : null;
  }

  async jsonLines(args) {
    const out = [];
    await this.run([...args, '--json'], { onLine: l => { if (l.trim().startsWith('{')) out.push(JSON.parse(l)); } });
    return out;
  }

  init() {
    return this.run(['init']);
  }

  // Cheap check that the repository exists and the key opens it.
  async check() {
    await this.run(['cat', 'config']);
    return true;
  }

  async snapshots({ host, tag } = {}) {
    const args = ['snapshots'];
    if (host) args.push('--host', host);
    if (tag) args.push('--tag', tag);
    const list = (await this.json(args)) || [];
    return list.sort((a, b) => new Date(a.time) - new Date(b.time));
  }

  /** Direct children of dir in a snapshot. */
  async ls(snapshotId, dir) {
    const lines = await this.jsonLines(['ls', snapshotId, dir]);
    return lines.filter(n => n.struct_type === 'node' || (n.name != null && n.path != null))
      .filter(n => n.path !== dir && n.path.slice(0, n.path.lastIndexOf('/')) === (dir === '/' ? '' : dir));
  }

  /** restic find; resolves [{ snapshot, matches:[node...] }] */
  async find(pattern, { host, onSpawn } = {}) {
    const args = ['find', '--json', '-i'];
    if (host) args.push('--host', host);
    args.push(pattern);
    const { stdout } = await this.run(args, { onSpawn });
    const text = stdout.trim();
    if (!text) return [];
    // restic prints one JSON array; some versions print one per snapshot line
    if (text.startsWith('[')) {
      try { return JSON.parse(text); } catch { /* fall through */ }
    }
    return text.split('\n').filter(l => l.trim()).flatMap(l => { const v = JSON.parse(l); return Array.isArray(v) ? v : [v]; });
  }

  /**
   * Back up targets. onProgress receives restic's status objects.
   * Resolves { snapshotId, summary, warnings }.
   */
  async backup(targets, { host, tags = [], excludeFile, onProgress, onSpawn }) {
    const args = ['backup', '--json', '--one-file-system', '--exclude-caches', '--host', host];
    for (const t of tags) args.push('--tag', t);
    if (excludeFile) args.push('--exclude-file', excludeFile);
    args.push(...targets);
    let summary = null, warnings = 0;
    // exit 3 = snapshot created but some files could not be read
    const { code } = await this.run(args, {
      onSpawn,
      okCodes: [0, 3],
      onLine: line => {
        if (!line.startsWith('{')) return;
        const m = JSON.parse(line);
        if (m.message_type === 'status') onProgress?.(m);
        else if (m.message_type === 'summary') summary = m;
        else if (m.message_type === 'error') { warnings++; logger.warn('backup:', m.error?.message || m.error, m.item || ''); }
      },
    });
    if (!summary?.snapshot_id) throw new TTError('restic-failed', 'Backup finished without creating a snapshot');
    return { snapshotId: summary.snapshot_id, summary, warnings: warnings + (code === 3 ? 1 : 0) };
  }

  /** Restore selected paths of a snapshot into target (paths appear at target + abs path). */
  restore(snapshotId, target, { include = [], exclude = [], excludeFile, del = false, overwrite, onSpawn } = {}) {
    const args = ['restore', snapshotId, '--target', target];
    for (const i of include) args.push('--include', i);
    for (const e of exclude) args.push('--exclude', e);
    if (excludeFile) args.push('--exclude-file', excludeFile);
    if (del) args.push('--delete');
    if (overwrite) args.push('--overwrite', overwrite);
    // sparse files (virtual machine disks, some games) come back sparse, not at their full size
    args.push('--sparse');
    return this.run(args, { onSpawn });
  }

  forget(ids) {
    return this.run(['forget', ...ids]);
  }

  forgetPolicy({ host, tag, keep }) {
    const args = ['forget', '--host', host, '--tag', tag];
    for (const [flag, value] of Object.entries(keep)) {
      for (const v of [].concat(value)) args.push(`--${flag}`, String(v));
    }
    return this.run(args);
  }

  /**
   * prune: drop data no backup uses any more. emergency: only delete whole unused files, never repack, so it
   * works on a drive with no free space left (a backup that ran out of room leaves its half-written data behind).
   */
  prune({ onSpawn, emergency = false } = {}) {
    return this.run(['prune', '--max-unused', emergency ? 'unlimited' : '5%'], { onSpawn });
  }

  /** How much a backup of targets would add to the drive (bytes, as stored), without writing anything. */
  async wouldAdd(targets, { host, excludeFile, onSpawn } = {}) {
    const args = ['backup', '--dry-run', '--json', '--one-file-system', '--exclude-caches', '--host', host];
    if (excludeFile) args.push('--exclude-file', excludeFile);
    args.push(...targets);
    let summary = null;
    await this.run(args, {
      onSpawn, okCodes: [0, 3],
      onLine: line => { if (line.startsWith('{')) { const m = JSON.parse(line); if (m.message_type === 'summary') summary = m; } },
    });
    if (!summary) return null;
    return Number(summary.data_added_packed ?? summary.data_added ?? 0);
  }

  unlock() {
    return this.run(['unlock']);
  }

  /** restic mount (blocks until unmounted). Returns the child process. */
  mount(mountPoint) {
    const child = spawn(P.restic, [...this.globalArgs(), 'mount', mountPoint], {
      env: this.env(), stdio: ['ignore', 'pipe', 'pipe'],
    });
    return child;
  }
}

module.exports = { Restic, classify };

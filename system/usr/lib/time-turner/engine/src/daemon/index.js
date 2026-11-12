'use strict';
// time-turnerd — Time Turner's background service.
// Runs as root under systemd (see system/time-turnerd.service), started with the
// Node.js that comes with Kibble, palOS's app runtime (see time-turnerd).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const P = require('./paths');
const C = require('./config');
const { Destination, listDrives, withProbeMount } = require('./destination');
const { BackupEngine, describeSnapshot } = require('./backup');
const { Browser } = require('./browse');
const R = require('./restore');
const M = require('./migrate');
const { Restic } = require('./restic');
const { Service } = require('./service');
const { logger, TTError, mkdirp, writeFileAtomic, readJSON, isWithin, cleanAbsPath,
  makeRecoveryKey, normaliseRecoveryKey, readDriveKey, writeDriveKey, run } = require('./util');

const TICK_MS = 60e3;
const FULL_IMAGE_QUIET_MS = 10 * 60e3;
const RETRY_AFTER_FAILURE_MS = 15 * 60e3;

let config = C.loadConfig();
const state = C.loadState();
const getConfig = () => config;
const saveState = () => C.saveState(state);

let service;
const emit = ev => service?.emit(ev);

const dest = new Destination(getConfig);
const browser = new Browser({ getConfig, dest });
const engine = new BackupEngine({
  getConfig, state, saveState, dest, emit,
  beforeExclusive: () => browser.stopMount(),
});
// New backups should show up immediately when browsing.
const origEmit = engine.emit;
engine.emit = ev => {
  if (ev.type === 'job-finished' && ev.ok) { state.lastSuccess = Date.now(); saveState(); browser.invalidate(); }
  origEmit(ev);
};

let prepared = null;                 // pending "Restore System": { token, sender, snapshot, phase }
const openBackups = new Map();       // token -> { uuid, fstype, label, keyFile, snapshots }

const configured = () => !!(config?.destination && C.hasKey());

function requireConfigured() {
  if (!configured()) throw new TTError('not-configured', 'Time Turner has not been set up yet');
}

/** Paths users may browse and restore: their own home (root: anything). */
function checkUserPath(p, ctx) {
  const abs = cleanAbsPath(p);
  if (ctx.uid === 0) return abs;
  if (!ctx.home || !isWithin(abs, ctx.home)) throw new TTError('not-authorized', 'You can only browse and restore files in your home folder');
  return abs;
}

function nextBackupTime() {
  if (!configured() || !config.auto) return null;
  const last = state.lastSuccess || 0;
  return Math.max(Date.now(), last + C.FREQUENCIES[config.frequency]);
}

function publicConfig() {
  if (!config) return null;
  const { destination, frequency, auto, include, excludeExtra, host } = config;
  return { destination, frequency, auto, include, excludeExtra, host };
}

// ---------------- methods ----------------
const methods = {
  GetStatus: {
    auth: 'any',
    handler: () => ({
      configured: configured(),
      firstBackupDone: !!state.firstBackupDone,
      destination: config?.destination ? { ...dest.describe(), present: dest.isPresent() } : null,
      frequency: config?.frequency || null,
      auto: !!config?.auto,
      lastBackup: state.lastBackup,
      lastSuccess: state.lastSuccess || null,
      nextBackup: nextBackupTime(),
      running: engine.running ? { kind: engine.running.kind, started: engine.running.started } : null,
      systemRestore: prepared ? { phase: prepared.phase } : null,
      pendingRestore: fs.existsSync(P.pendingRestore),
      lastRestore: R.readLastRestore(),
      host: config?.host || require('os').hostname(),
    }),
  },

  GetSettings: {
    auth: 'any',
    handler: async () => {
      let space = null;
      if (configured() && dest.isPresent()) space = await dest.space().catch(() => null);
      return { config: publicConfig(), space };
    },
  },

  SetSettings: {
    auth: 'com.timeturner.configure',
    handler: args => {
      requireConfigured();
      const next = { ...config };
      if (typeof args.auto === 'boolean') next.auto = args.auto;
      if (args.frequency) next.frequency = args.frequency;
      if (args.include) next.include = { ...config.include, ...args.include };
      if (Array.isArray(args.excludeExtra)) next.excludeExtra = args.excludeExtra.filter(x => typeof x === 'string');
      C.validateConfig(next);
      config = next;
      C.saveConfig(config);
      emit({ type: 'settings-changed' });
      return publicConfig();
    },
  },

  ListDrives: { auth: 'any', handler: () => listDrives() },

  /**
   * First-time setup (or switching to a new destination).
   * args: { destination, frequency, include, recoveryKey? }
   * Resolves { recoveryKey } for a new repository, or { adopted: true } when an
   * existing Time Turner backup on that drive was opened with the given key.
   */
  Setup: {
    auth: 'com.timeturner.configure',
    handler: async args => {
      if (engine.running) throw new TTError('busy', 'Wait for the current backup to finish');
      const d = args.destination || {};
      const destination = d.type === 'smb'
        ? { type: 'smb', url: String(d.url || '').replace(/^smb:/, ''), label: d.label || String(d.url || '').replace(/^smb:\/\//, '') }
        : d.type === 'path' ? { type: 'path', path: d.path, label: d.label || d.path }
          : { type: 'local', uuid: d.uuid, label: d.label || 'Backup Drive', fstype: d.fstype || '' };
      const next = {
        ...C.defaultConfig(),
        destination,
        frequency: args.frequency || 'hourly',
        auto: args.auto !== false,
        include: { system: !!args.include?.system, home: !!args.include?.home, extra: (args.include?.extra || []).filter(Boolean) },
        createdAt: Date.now(),
      };
      C.validateConfig(next);
      if (destination.type === 'smb') C.writeSmbCredentials(d.username, d.password, d.domain);

      const probe = new Destination(() => next);
      const lease = await probe.acquire();
      const tmpKey = path.join(P.etcDir, `.key-${crypto.randomBytes(4).toString('hex')}`);
      try {
        mkdirp(P.etcDir, 0o700);
        const exists = fs.existsSync(path.join(lease.repoPath, 'config'));
        let key, adopted = false;
        if (exists) {
          // the key kept with the backups, or this computer's own, or (backups from before) the one typed in
          key = args.recoveryKey ? normaliseRecoveryKey(args.recoveryKey) : (readDriveKey(lease.repoPath) || (C.hasKey() ? C.readKey() : null));
          if (!key) throw new TTError('needs-key', 'These backups were made by an earlier Time Turner. Enter their recovery key once to keep using them.');
          writeFileAtomic(tmpKey, key + '\n', 0o600);
          try {
            await new Restic({ repo: lease.repoPath, passwordFile: tmpKey }).check();
          } catch (err) {
            if (!args.recoveryKey) throw new TTError('needs-key', 'These backups were made by an earlier Time Turner. Enter their recovery key once to keep using them.');
            throw err;
          }
          adopted = true;
        } else {
          key = makeRecoveryKey();
          writeFileAtomic(tmpKey, key + '\n', 0o600);
          mkdirp(path.dirname(lease.repoPath), 0o755);
          await new Restic({ repo: lease.repoPath, passwordFile: tmpKey }).init();
        }
        writeDriveKey(lease.repoPath, key);
        fs.renameSync(tmpKey, P.key);
        await browser.stopMount();
        config = next;
        C.saveConfig(config);
        state.firstBackupDone = false;
        state.lastBackup = null;
        state.lastSuccess = null;
        saveState();
        browser.invalidate();
        logger.info(`set up backups to ${destination.label}${adopted ? ' (existing backups)' : ''}`);
        emit({ type: 'settings-changed' });
        return adopted ? { adopted: true } : { created: true };
      } finally {
        fs.rmSync(tmpKey, { force: true });
        lease.release();
      }
    },
  },

  ListSnapshots: {
    auth: 'com.timeturner.browse',
    handler: async () => {
      requireConfigured();
      return (await browser.snapshots()).map(({ id, shortId, time, kind, full }) => ({ id, shortId, time, kind, full }));
    },
  },

  ListDir: {
    auth: 'com.timeturner.browse',
    handler: async (args, ctx) => {
      requireConfigured();
      return browser.listDir(String(args.snapshot), checkUserPath(args.path, ctx));
    },
  },

  Search: {
    auth: 'com.timeturner.browse',
    handler: async (args, ctx) => {
      requireConfigured();
      const root = ctx.uid === 0 ? (args.root ? cleanAbsPath(args.root) : '/') : ctx.home;
      return browser.search(args.query, { allowedRoot: root, sender: ctx.sender });
    },
  },

  /** args: { snapshot, paths: [abs], mode: 'replace' | 'keep-both' } */
  RestorePaths: {
    auth: 'com.timeturner.browse',
    handler: async (args, ctx) => {
      requireConfigured();
      const snap = await browser.snapshotById(String(args.snapshot));
      const mode = args.mode === 'keep-both' ? 'keep-both' : 'replace';
      const realHome = ctx.uid === 0 ? '/' : fs.realpathSync(ctx.home);
      const lease = await dest.acquire();
      const results = [];
      try {
        const restic = new Restic({ repo: lease.repoPath, passwordFile: P.key });
        for (const p of args.paths || []) {
          const src = checkUserPath(p, ctx);
          // Resolve symlinked parent folders so a link can't redirect the restore outside home.
          let existing = path.dirname(src);
          while (existing !== '/' && !fs.existsSync(existing)) existing = path.dirname(existing);
          const realParent = fs.realpathSync(existing);
          if (!isWithin(realParent, realHome)) throw new TTError('not-authorized', 'That folder is outside your home folder');
          const target = path.join(realParent, path.relative(existing, src));
          results.push(await R.restorePath(restic, snap.id, src, mode, target));
        }
      } finally { lease.release(); }
      logger.info(`restored ${results.length} item(s) from ${snap.shortId} for uid ${ctx.uid}`);
      return results;
    },
  },

  BackupNow: {
    auth: 'com.timeturner.backup',
    handler: () => {
      requireConfigured();
      if (engine.running) throw new TTError('busy', 'A backup is already running');
      engine.run('manual').catch(() => { /* reported through events */ });
      return { started: true };
    },
  },

  CancelBackup: {
    auth: 'com.timeturner.backup',
    handler: () => ({ cancelled: engine.cancel() }),
  },

  // ---- Restore System: safety backup, then stage and reboot ----
  PrepareSystemRestore: {
    auth: 'com.timeturner.restore-system',
    handler: async (args, ctx) => {
      requireConfigured();
      if (config.destination.type !== 'local') throw new TTError('unsupported', 'Whole-system restores need the backup on a USB or internal drive.');
      if (engine.running) throw new TTError('busy', 'Wait for the current backup to finish');
      const snap = await browser.snapshotById(String(args.snapshot));
      const token = crypto.randomBytes(16).toString('hex');
      prepared = { token, sender: ctx.sender, snapshot: snap, phase: 'backup', label: String(args.label || '') };
      engine.run('pre-restore').then(() => {
        if (prepared?.token !== token) return;
        prepared.phase = 'ready';
        emit({ type: 'system-restore-ready', token });
      }, err => {
        if (prepared?.token !== token) return;
        prepared = null;
        emit({ type: 'system-restore-failed', code: err.code || 'error', error: err.message });
      });
      return { token };
    },
  },

  CommitSystemRestore: {
    auth: 'com.timeturner.restore-system',
    handler: async (args, ctx) => {
      if (!prepared || prepared.token !== args.token || prepared.sender !== ctx.sender) throw new TTError('bad-token', 'No system restore is waiting');
      if (prepared.phase !== 'ready') throw new TTError('busy', 'The safety backup has not finished');
      R.writePendingRestore({
        snapshot: prepared.snapshot.id, destination: config.destination, keyFile: P.key,
        machine: false, label: prepared.label,
      });
      prepared = null;
      scheduleReboot();
      return { rebooting: true };
    },
  },

  CancelSystemRestore: {
    auth: 'com.timeturner.browse',
    handler: (args, ctx) => {
      if (prepared && prepared.token === args.token && prepared.sender === ctx.sender) {
        if (prepared.phase === 'backup') engine.cancel();
        prepared = null;
      }
      return { cancelled: true };
    },
  },

  // ---- Restore onto this machine from a drive (setup wizard) ----
  ScanBackups: {
    auth: 'com.timeturner.browse',
    handler: async () => {
      const drives = (await listDrives()).filter(d => !d.isSystem);
      const found = [];
      for (const d of drives) {
        let has = d.hasBackups;
        if (has == null) {
          has = await withProbeMount(d.uuid, mp => fs.existsSync(path.join(mp, P.repoDirName, 'config'))).catch(() => false);
        }
        if (has) found.push({ ...d, hasBackups: true });
      }
      return found;
    },
  },

  /** args: { uuid, recoveryKey } -> { token, snapshots } */
  OpenBackup: {
    auth: 'com.timeturner.configure',
    handler: async args => {
      const drive = (await listDrives()).find(d => d.uuid === args.uuid);
      if (!drive) throw new TTError('destination-missing', 'That drive is no longer connected');
      const token = crypto.randomBytes(16).toString('hex');
      const keyDir = path.join(P.runDir, 'keys');
      mkdirp(keyDir, 0o700);
      const keyFile = path.join(keyDir, token);
      try {
        const snaps = await withProbeMount(drive.uuid, async mp => {
          // the key kept with the backups; only backups from before need it typed in
          const key = args.recoveryKey ? normaliseRecoveryKey(args.recoveryKey) : readDriveKey(path.join(mp, P.repoDirName));
          if (!key) throw new TTError('needs-key', 'These backups were made by an earlier Time Turner. Enter their recovery key once to open them.');
          writeFileAtomic(keyFile, key + '\n', 0o600);
          const r = new Restic({ repo: path.join(mp, P.repoDirName), passwordFile: keyFile, noLock: true });
          return (await r.snapshots()).map(describeSnapshot);
        });
        const list = snaps.filter(s => s.tags.includes('time-turner'));
        openBackups.set(token, { uuid: drive.uuid, fstype: drive.fstype, label: drive.label, keyFile, snapshots: list });
        return { token, snapshots: list.map(({ id, time, host, kind, full }) => ({ id, time, host, kind, full })) };
      } catch (err) {
        fs.rmSync(keyFile, { force: true });
        throw err;
      }
    },
  },

  /** args: { token, snapshot, label } — stage a restore of another machine's backup onto this one. */
  StageMachineRestore: {
    auth: 'com.timeturner.restore-system',
    handler: async args => {
      const open = openBackups.get(args.token);
      if (!open) throw new TTError('bad-token', 'Open the backup again');
      const snap = open.snapshots.find(s => s.id === args.snapshot);
      if (!snap) throw new TTError('no-snapshot', 'That backup no longer exists');
      // From now on this computer continues that machine's backups on the same drive.
      C.writeKey(fs.readFileSync(open.keyFile, 'utf8').trim());
      config = { ...C.defaultConfig(), destination: { type: 'local', uuid: open.uuid, label: open.label, fstype: open.fstype }, host: snap.host, createdAt: Date.now() };
      C.saveConfig(config);
      state.firstBackupDone = true;
      saveState();
      R.writePendingRestore({ snapshot: snap.id, destination: config.destination, keyFile: P.key, machine: true, label: String(args.label || '') });
      fs.rmSync(open.keyFile, { force: true });
      openBackups.delete(args.token);
      return { staged: true };
    },
  },

  // ---- Migration Assistant: people's things from another computer ----
  MigrationSources: {
    auth: 'com.timeturner.browse',
    handler: async () => {
      const backups = [];
      for (const d of (await listDrives()).filter(x => !x.isSystem)) {
        let has = d.hasBackups;
        if (has == null) has = await withProbeMount(d.uuid, mp => fs.existsSync(path.join(mp, P.repoDirName, 'config'))).catch(() => false);
        if (has) backups.push({ ...d, hasBackups: true });
      }
      return { backups, disks: await M.scanDisks(), accounts: M.localAccounts() };
    },
  },

  /** args: { token, snapshot } -> { people, apps } (open the backup first with OpenBackup) */
  MigrationContents: {
    auth: 'com.timeturner.configure',
    handler: async args => {
      const open = openBackups.get(args.token);
      if (!open) throw new TTError('bad-token', 'Open the backup again');
      return M.backupContents(open, String(args.snapshot));
    },
  },

  Migrate: {
    auth: 'com.timeturner.restore-system',
    handler: (args, ctx) => M.migrate(args, ctx, { openBackups, emit }),
  },

  CancelMigration: {
    auth: 'com.timeturner.browse',
    handler: () => M.cancel(),
  },

  RestartForRestore: {
    auth: 'com.timeturner.restore-system',
    handler: () => {
      if (!fs.existsSync(P.pendingRestore)) throw new TTError('bad-token', 'No restore is waiting');
      scheduleReboot();
      return { rebooting: true };
    },
  },

  AcknowledgeLastRestore: {
    auth: 'com.timeturner.browse',
    handler: () => { R.clearLastRestore(); return true; },
  },
};

function scheduleReboot() {
  logger.info('restarting to restore the system');
  setTimeout(() => {
    run('sync', []).catch(() => {}).then(() => run('systemctl', ['reboot'])).catch(err => logger.error('reboot failed:', err.message));
  }, 1500);
}

// ---------------- scheduler ----------------
function packageManagerBusy() {
  const names = new Set(['dpkg', 'apt', 'apt-get', 'aptitude', 'unattended-upgr', 'packagekitd', 'do-release-upgr']);
  try {
    for (const pid of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(pid)) continue;
      try { if (names.has(fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim())) return true; } catch { /* gone */ }
    }
  } catch { /* no /proc */ }
  return false;
}

async function tick() {
  try {
    if (!configured() || engine.running || prepared) return;
    // Kernel updates and release upgrades (written by the apt hook) -> full system image
    const req = readJSON(P.fullImageRequest, null);
    if (req && Date.now() - (req.at || 0) > FULL_IMAGE_QUIET_MS && !packageManagerBusy() && dest.isPresent()) {
      fs.rmSync(P.fullImageRequest, { force: true });
      logger.info(`making a full system image after ${req.reason}`);
      await engine.run(req.reason === 'upgrade' ? 'upgrade' : 'kernel').catch(() => {});
      return;
    }
    if (!config.auto || !dest.isPresent()) return;
    const last = state.lastSuccess || 0;
    const failedRecently = state.lastBackup && !state.lastBackup.ok && Date.now() - state.lastBackup.time < RETRY_AFTER_FAILURE_MS;
    if (Date.now() - last >= C.FREQUENCIES[config.frequency] && !failedRecently) {
      await engine.run('auto').catch(() => {});
    }
  } catch (err) {
    logger.error('scheduler:', err);
  }
}

async function main() {
  mkdirp(P.libDir, 0o755);
  mkdirp(P.runDir, 0o700);
  mkdirp(P.cacheDir, 0o700);
  const last = R.readLastRestore();
  if (last) logger.info(`last system restore: ${last.ok ? 'succeeded' : 'failed'} ${last.message}`);

  service = new Service(methods);
  await service.start();

  setInterval(tick, TICK_MS).unref?.();
  setTimeout(tick, 30e3);

  const shutdown = async sig => {
    logger.info(`${sig}: stopping`);
    engine.cancel();
    await browser.stopMount().catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  main().catch(err => { logger.error('fatal:', err); process.exit(1); });
}

module.exports = { methods, tick, _internals: { state, getConfig, engine, browser, dest } };

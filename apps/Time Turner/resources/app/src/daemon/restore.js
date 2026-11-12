'use strict';
// Restoring files to their original place, and staging whole-system restores
// that the boot-time script (system/initramfs/local-bottom) carries out.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const P = require('./paths');
const { Restic } = require('./restic');
const { computeExcludes } = require('./backup');
const { mkdirp, writeFileAtomic, logger, TTError, shQuote, run } = require('./util');

// Paths a system restore must never touch: Time Turner's own state and keys,
// and everything that was never backed up (so --delete leaves it alone).
const RESTORE_KEEP = [
  '/etc/time-turner',
  '/var/lib/time-turner',
];
// Extra paths kept when restoring onto a different machine.
const MACHINE_KEEP = [
  '/etc/fstab',
  '/etc/crypttab',
  '/boot/efi',
];

function uniqueRestoredName(dir, name, isDir) {
  const dot = isDir ? -1 : name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let n = 1; n < 1000; n++) {
    const cand = `${stem} (restored${n > 1 ? ' ' + n : ''})${ext}`;
    if (!fs.existsSync(path.join(dir, cand))) return cand;
  }
  throw new TTError('restore-failed', 'Could not find a free name');
}

function nearestExistingDir(p) {
  let d = path.dirname(p);
  while (d !== '/' && !fs.existsSync(d)) d = path.dirname(d);
  return d;
}

async function moveInto(src, dest) {
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await run('cp', ['-a', '--', src, dest]);
    fs.rmSync(src, { recursive: true, force: true });
  }
}

/**
 * Restore absPath from a snapshot.
 * mode: 'replace' (put it back, overwriting what is there) or 'keep-both'
 * (put it next to the current one as "name (restored).ext").
 * Ownership and permissions come from the backup (restic runs as root).
 * Resolves { path, name } of what was written.
 */
async function restorePath(restic, snapshotId, srcPath, mode, absPath = srcPath) {
  // srcPath is where the item lives inside the backup; absPath is where it goes
  // now (the same path, with any symlinked parent folders already resolved).
  const parentNow = nearestExistingDir(absPath);
  const staging = fs.mkdtempSync(path.join(parentNow, '.time-turner-restore-'));
  fs.chmodSync(staging, 0o700);
  try {
    await restic.restore(snapshotId, staging, { include: [srcPath] });
    const restored = path.join(staging, srcPath);
    if (!fs.lstatSync(restored, { throwIfNoEntry: false })) {
      throw new TTError('restore-failed', `${srcPath} is not in that backup`);
    }
    // Recreate missing parent folders with the ownership/permissions they had in the backup.
    // absPath and srcPath share the same tail below parentNow, so the backup's copy
    // of a missing folder d is at staging + srcBase + (d relative to parentNow).
    const tail = path.relative(parentNow, absPath);
    const srcBase = srcPath.slice(0, srcPath.length - tail.length);
    const missing = [];
    for (let d = path.dirname(absPath); !fs.existsSync(d); d = path.dirname(d)) missing.unshift(d);
    for (const d of missing) {
      const st = fs.statSync(path.join(staging, srcBase, path.relative(parentNow, d)));
      fs.mkdirSync(d);
      fs.chownSync(d, st.uid, st.gid);
      fs.chmodSync(d, st.mode & 0o7777);
    }

    const dir = path.dirname(absPath);
    const isDir = fs.lstatSync(restored).isDirectory();
    const exists = fs.lstatSync(absPath, { throwIfNoEntry: false });
    let finalPath = absPath;
    if (exists && mode === 'keep-both') {
      finalPath = path.join(dir, uniqueRestoredName(dir, path.basename(absPath), isDir));
      await moveInto(restored, finalPath);
    } else if (exists) {
      const aside = path.join(dir, `.${path.basename(absPath)}.time-turner-old-${crypto.randomBytes(3).toString('hex')}`);
      fs.renameSync(absPath, aside);
      try {
        await moveInto(restored, absPath);
      } catch (err) {
        fs.renameSync(aside, absPath);   // put the original back
        throw err;
      }
      fs.rmSync(aside, { recursive: true, force: true });
    } else {
      await moveInto(restored, absPath);
    }
    // Restored timestamps on the parent folder would look odd; touch it.
    const now = new Date();
    try { fs.utimesSync(dir, now, now); } catch { /* not important */ }
    return { path: finalPath, name: path.basename(finalPath) };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

// ---------- whole-system restore ----------

function envFile(vars) {
  return Object.entries(vars).map(([k, v]) => `${k}=${shQuote(v)}`).join('\n') + '\n';
}

function resticRealPath() {
  try { return fs.realpathSync(P.restic); } catch { return P.restic; }
}

/**
 * Write the instructions the boot-time restore script follows on the next boot.
 * { snapshot, destination, keyFile, machine, label }
 */
function writePendingRestore({ snapshot, destination, keyFile, machine = false, label = '' }) {
  if (destination.type !== 'local') {
    throw new TTError('unsupported', 'Whole-system restores need the backup on a USB or internal drive. Network backups can restore files, but not the whole system yet.');
  }
  const cfg = { include: { system: true, home: true } };
  const keep = [...computeExcludes(cfg), ...RESTORE_KEEP, ...(machine ? MACHINE_KEEP : [])];
  mkdirp(P.libDir, 0o755);
  writeFileAtomic(P.restoreExcludeFile, [...new Set(keep)].join('\n') + '\n', 0o600);
  writeFileAtomic(P.pendingRestore, envFile({
    TT_SNAPSHOT: snapshot,
    TT_DEST_UUID: destination.uuid,
    TT_DEST_FSTYPE: destination.fstype || '',
    TT_REPO_DIR: P.repoDirName,
    TT_KEY_FILE: keyFile.replace(P.ROOT, ''),
    TT_RESTIC: resticRealPath(),
    TT_EXCLUDES: P.restoreExcludeFile.replace(P.ROOT, ''),
    TT_MACHINE: machine ? '1' : '0',
    TT_LABEL: label,
    TT_ATTEMPTS: '0',
  }), 0o600);
  logger.info(`system restore of ${snapshot.slice(0, 8)} staged for next boot${machine ? ' (new machine)' : ''}`);
}

function clearPendingRestore() {
  for (const f of [P.pendingRestore, P.pendingKey]) fs.rmSync(f, { force: true });
}

/** Result left behind by the boot-time script, if any. */
function readLastRestore() {
  try {
    const text = fs.readFileSync(P.lastRestore, 'utf8');
    const vars = {};
    for (const line of text.split('\n')) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (m) vars[m[1]] = m[2].replace(/^'|'$/g, '');
    }
    return { ok: vars.TT_RESULT === 'ok', label: vars.TT_LABEL || '', message: vars.TT_MESSAGE || '', time: Number(vars.TT_TIME) * 1000 || null };
  } catch { return null; }
}

function clearLastRestore() {
  fs.rmSync(P.lastRestore, { force: true });
}

module.exports = {
  restorePath, writePendingRestore, clearPendingRestore, readLastRestore, clearLastRestore,
  uniqueRestoredName, RESTORE_KEEP, MACHINE_KEEP, Restic,
};

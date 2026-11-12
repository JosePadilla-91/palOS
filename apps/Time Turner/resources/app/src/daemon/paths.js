'use strict';
// Every location the daemon reads or writes. TT_ROOT prefixes them all so the
// test suite can run the daemon against a scratch directory instead of the system.
const ROOT = process.env.TT_ROOT || '';

module.exports = {
  ROOT,
  etcDir: `${ROOT}/etc/time-turner`,
  config: `${ROOT}/etc/time-turner/config.json`,
  key: `${ROOT}/etc/time-turner/repo.key`,
  smbCredentials: `${ROOT}/etc/time-turner/smb-credentials`,

  libDir: `${ROOT}/var/lib/time-turner`,
  state: `${ROOT}/var/lib/time-turner/state.json`,
  excludeFile: `${ROOT}/var/lib/time-turner/excludes`,
  restoreExcludeFile: `${ROOT}/var/lib/time-turner/restore-excludes`,
  pendingRestore: `${ROOT}/var/lib/time-turner/pending-restore.env`,
  pendingKey: `${ROOT}/var/lib/time-turner/pending-restore.key`,
  lastRestore: `${ROOT}/var/lib/time-turner/last-restore.env`,
  fullImageRequest: `${ROOT}/var/lib/time-turner/full-image-request`,

  cacheDir: `${ROOT}/var/cache/time-turner`,
  runDir: `${ROOT}/run/time-turner`,

  // Installed by the package (see system/install.sh)
  restic: process.env.TT_RESTIC || '/usr/lib/time-turner/restic',
  shimDir: process.env.TT_SHIM_DIR || '/usr/lib/time-turner/shim',

  // Where the restic repository lives on the destination
  repoDirName: 'TimeTurner',
};

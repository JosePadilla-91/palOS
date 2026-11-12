'use strict';
const fs = require('fs');
const os = require('os');
const P = require('./paths');
const { readJSON, writeJSON, writeFileAtomic, mkdirp, TTError } = require('./util');

const FREQUENCIES = {
  hourly: 60 * 60e3,
  '6h': 6 * 60 * 60e3,
  daily: 24 * 60 * 60e3,
  weekly: 7 * 24 * 60 * 60e3,
};

// Paths never worth backing up. With --one-file-system, /proc, /sys etc. are
// skipped anyway; listing them keeps the empty mount points out of restores' way.
const BASE_EXCLUDES = [
  '/dev/*', '/proc/*', '/sys/*', '/run/*', '/tmp/*', '/var/tmp/*',
  '/mnt/*', '/media/*', '/lost+found',
  '/swapfile', '/swap.img',
  '/var/cache/apt/archives/*.deb',
  '/var/cache/time-turner',
  '/var/lib/time-turner/pending-restore.*',
  '/var/lib/snapd/cache/*',
  '/home/*/.cache/*', '/root/.cache/*',
  '/home/*/.local/share/Trash/*',
  '/home/*/.thumbnails/*',
  '/var/lib/flatpak/repo/tmp/*',
];

function defaultConfig() {
  return {
    version: 1,
    destination: null,          // { type:'local', uuid, label, fstype } | { type:'smb', url, label }
    frequency: 'hourly',
    auto: true,
    include: { system: true, home: true, extra: [] },
    excludeExtra: [],
    host: os.hostname(),
    createdAt: null,
  };
}

function loadConfig() {
  const cfg = readJSON(P.config, null);
  if (!cfg) return null;
  return { ...defaultConfig(), ...cfg, include: { ...defaultConfig().include, ...(cfg.include || {}) } };
}

function saveConfig(cfg) {
  mkdirp(P.etcDir, 0o700);
  writeJSON(P.config, cfg, 0o600);
}

function validateConfig(cfg) {
  if (!FREQUENCIES[cfg.frequency]) throw new TTError('bad-config', `Unknown frequency: ${cfg.frequency}`);
  const d = cfg.destination;
  const types = P.ROOT ? ['local', 'smb', 'path'] : ['local', 'smb'];   // 'path' exists only for the test suite
  if (!d || !types.includes(d.type)) throw new TTError('bad-config', 'A destination is required');
  if (d.type === 'local' && !/^[0-9A-Za-z-]+$/.test(d.uuid || '')) throw new TTError('bad-config', 'Destination drive has no filesystem UUID');
  if (d.type === 'smb' && !/^\/\/[^/\s]+\/[^/\s]+/.test(d.url || '')) throw new TTError('bad-config', 'Network address must look like smb://server/share');
  const inc = cfg.include || {};
  if (!inc.system && !inc.home && !(inc.extra || []).length) throw new TTError('bad-config', 'Choose at least one thing to back up');
  for (const p of inc.extra || []) if (typeof p !== 'string' || !p.startsWith('/')) throw new TTError('bad-config', `Invalid folder: ${p}`);
}

function hasKey() {
  return fs.existsSync(P.key);
}

function readKey() {
  return fs.readFileSync(P.key, 'utf8').trim();
}

function writeKey(key) {
  mkdirp(P.etcDir, 0o700);
  writeFileAtomic(P.key, key + '\n', 0o600);
}

function writeSmbCredentials(username, password, domain) {
  mkdirp(P.etcDir, 0o700);
  const lines = [`username=${username || 'guest'}`, `password=${password || ''}`];
  if (domain) lines.push(`domain=${domain}`);
  writeFileAtomic(P.smbCredentials, lines.join('\n') + '\n', 0o600);
}

// ---- runtime state (not configuration) ----
function loadState() {
  return {
    lastBackup: null,        // { time, snapshotId, ok, error, warnings }
    lastPrune: null,
    firstBackupDone: false,
    apt: null,               // { kernels, release } fingerprint from the apt hook
    ...readJSON(P.state, {}),
  };
}

function saveState(state) {
  mkdirp(P.libDir, 0o755);
  writeJSON(P.state, state, 0o644);
}

module.exports = {
  FREQUENCIES, BASE_EXCLUDES, defaultConfig, loadConfig, saveConfig, validateConfig,
  hasKey, readKey, writeKey, writeSmbCredentials, loadState, saveState,
};

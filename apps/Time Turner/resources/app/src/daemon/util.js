'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = LEVELS[process.env.TT_LOG_LEVEL || 'info'] || 20;

// journald adds timestamps, so log lines stay short: "<level> <message>"
function log(level, ...args) {
  if (LEVELS[level] < minLevel) return;
  const line = args.map(a => (a instanceof Error ? a.stack || a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(`${level}: ${line}\n`);
}
const logger = {
  debug: (...a) => log('debug', ...a),
  info: (...a) => log('info', ...a),
  warn: (...a) => log('warn', ...a),
  error: (...a) => log('error', ...a),
};

class TTError extends Error {
  // code is a stable machine-readable identifier the UI can switch on
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

function mkdirp(dir, mode = 0o755) {
  fs.mkdirSync(dir, { recursive: true, mode });
}

// Write a file atomically: temp file, fsync, rename.
function writeFileAtomic(file, data, mode = 0o644) {
  mkdirp(path.dirname(file));
  const tmp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  const fd = fs.openSync(tmp, 'w', mode);
  try {
    fs.writeSync(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, file);
}

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') logger.warn(`could not read ${file}:`, err.message);
    return fallback;
  }
}

function writeJSON(file, value, mode = 0o644) {
  writeFileAtomic(file, JSON.stringify(value, null, 2) + '\n', mode);
}

// Run a command and resolve with stdout; reject with stderr in the message.
function run(cmd, args, { timeout = 120000, env, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, { timeout, env, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        err.stderr = String(stderr || '').trim();
        err.message = `${cmd} ${args.join(' ')} failed: ${err.stderr || err.message}`;
        reject(err);
      } else resolve(String(stdout));
    });
    if (input != null) { child.stdin.end(input); }
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Is p equal to root or inside it? Both must be absolute and normalised.
function isWithin(p, root) {
  const a = path.resolve(p), b = path.resolve(root);
  return a === b || a.startsWith(b.endsWith('/') ? b : b + '/');
}

// Normalise an absolute path ("/a/b/../c/" -> "/a/c"). Callers then check the
// result with isWithin(), so ".." can never be used to escape an allowed root.
function cleanAbsPath(p) {
  if (typeof p !== 'string' || !p.startsWith('/') || p.includes('\0')) throw new TTError('bad-path', `Invalid path: ${p}`);
  const n = path.posix.normalize(p);
  return n.length > 1 ? n.replace(/\/+$/, '') : n;
}

// Shell-safe single-quoted value for the env files read by the boot-time restore script.
function shQuote(v) {
  return `'${String(v).replace(/'/g, `'\\''`)}'`;
}

// Recovery key: 160 random bits as Crockford base32, in groups of 4.
function makeRecoveryKey() {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const bytes = crypto.randomBytes(20);
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return out.match(/.{1,4}/g).join('-');
}

// People type recovery keys by hand: ignore case, spaces and look-alike characters.
function normaliseRecoveryKey(k) {
  return String(k || '').toUpperCase().replace(/[\s_]/g, '')
    .replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V')
    .replace(/-/g, '').match(/.{1,4}/g)?.join('-') || '';
}

// palOS: the backups' key travels with the backups, in TimeTurner.key next to the TimeTurner folder,
// so nobody has to write down or type a recovery key. (A whole-system restore brings back every account
// and password anyway; the key only made people lose their own backups.) Backups made before this asked
// for their key once; it is then written next to them and never asked for again.
const driveKeyPath = repoPath => `${repoPath}.key`;
function readDriveKey(repoPath) {
  try { const k = fs.readFileSync(driveKeyPath(repoPath), 'utf8').trim(); return k || null; } catch { return null; }
}
function writeDriveKey(repoPath, key) {
  try { writeFileAtomic(driveKeyPath(repoPath), key + '\n', 0o600); return true; } catch (err) { logger.warn('could not keep the key with the backups:', err.message); return false; }
}

module.exports = {
  logger, TTError, mkdirp, writeFileAtomic, readJSON, writeJSON, run, sleep,
  isWithin, cleanAbsPath, shQuote, makeRecoveryKey, normaliseRecoveryKey, driveKeyPath, readDriveKey, writeDriveKey,
};

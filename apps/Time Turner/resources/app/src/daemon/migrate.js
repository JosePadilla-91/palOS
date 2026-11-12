'use strict';
// Migration Assistant: brings people's files, settings and apps from another computer onto this one.
// Sources: a Time Turner backup (another palOS computer's), or a disk taken from / still in another computer
// (palOS: its /home folders; Windows: each person's Desktop, Documents, Downloads, Music, Pictures and Videos).
// Each person's things go into an account on this computer (an existing one, or a new one made here).
// Nothing on this computer is lost: files that would be replaced are kept in "Before Migration" in that home folder.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const P = require('./paths');
const { listDrives, withProbeMount } = require('./destination');
const { Restic } = require('./restic');
const { logger, TTError, mkdirp, run } = require('./util');

const SOURCE_FSTYPES = new Set(['ext4', 'ext3', 'btrfs', 'xfs', 'f2fs', 'ntfs', 'ntfs3']);
const WIN_SKIP = new Set(['public', 'default', 'default user', 'all users', 'defaultapppool', 'wdagutilityaccount']);
const WIN_FOLDERS = ['Desktop', 'Documents', 'Downloads', 'Music', 'Pictures', 'Videos'];
// never brought over: caches, trash, this computer's own session bits
const ALWAYS_SKIP = ['/.cache/', '/.local/share/Trash/', '/.Xauthority', '/.xsession-errors*', '/.dbus/', '/.gvfs', '/snap/'];
const NAME_RE = /^[a-z_][a-z0-9_-]{0,31}$/;

let job = null;   // { id, cancelled, child }

const isNtfs = (t) => /^ntfs/.test(t || '');

/** What a mounted disk holds: palOS/Linux home folders or Windows user folders. */
function peopleOn(mp, fstype) {
  const out = [];
  if (isNtfs(fstype)) {
    const base = path.join(mp, 'Users');
    let names = [];
    try { names = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return out; }
    for (const n of names) {
      if (WIN_SKIP.has(n.toLowerCase())) continue;
      const has = WIN_FOLDERS.filter((f) => fs.existsSync(path.join(base, n, f)));
      if (has.length) out.push({ name: n, kind: 'windows', folders: has });
    }
    return out;
  }
  const base = path.join(mp, 'home');
  let names = [];
  try { names = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'lost+found').map((d) => d.name); } catch { return out; }
  for (const n of names) out.push({ name: n, kind: 'palos' });
  return out;
}

function appsOn(dir) {
  try { return fs.readdirSync(dir).filter((n) => n.endsWith('.app')); } catch { return []; }
}

/** Disks (not this system's own volume) that hold people's folders. */
async function scanDisks() {
  const drives = (await listDrives()).filter((d) => !d.isSystem && SOURCE_FSTYPES.has(d.fstype));
  const found = [];
  for (const d of drives) {
    try {
      const info = await withProbeMount(d.uuid, (mp) => ({ people: peopleOn(mp, d.fstype), apps: isNtfs(d.fstype) ? [] : appsOn(path.join(mp, 'Applications')) }));
      if (info.people.length) found.push({ uuid: d.uuid, label: d.label, fstype: d.fstype, size: d.size, removable: d.removable, kind: isNtfs(d.fstype) ? 'windows' : 'palos', ...info });
    } catch (err) { logger.warn('migration: could not look at', d.device, err.message); }
  }
  return found;
}

/** People and apps in one backup snapshot (restic ls, not recursive). */
async function backupContents(open, snapshot) {
  return withProbeMount(open.uuid, (mp) => backupContentsAt(mp, open, snapshot));
}
async function backupContentsAt(mp, open, snapshot) {
  const restic = new Restic({ repo: path.join(mp, P.repoDirName), passwordFile: open.keyFile, noLock: true });
  const ls = async (dir) => {
    const out = await restic.run(['ls', '--json', snapshot, dir]).catch(() => ({ stdout: '' }));
    const text = typeof out === 'string' ? out : (out.stdout || '');
    return text.split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((x) => x && x.path && path.dirname(x.path) === dir);
  };
  const people = (await ls('/home')).filter((e) => e.type === 'dir' && !path.basename(e.path).startsWith('.') && path.basename(e.path) !== 'lost+found').map((e) => ({ name: path.basename(e.path), kind: 'palos' }));
  const apps = (await ls('/Applications')).filter((e) => e.name.endsWith('.app')).map((e) => e.name);
  return { people, apps };
}

function userInfo(name) {
  try {
    const line = fs.readFileSync('/etc/passwd', 'utf8').split('\n').find((l) => l.split(':')[0] === name);
    if (!line) return null;
    const f = line.split(':');
    return { name, uid: Number(f[2]), gid: Number(f[3]), home: f[5] };
  } catch { return null; }
}

/** Accounts on this computer that things can go into. */
function localAccounts() {
  const out = [];
  for (const l of fs.readFileSync('/etc/passwd', 'utf8').split('\n')) {
    const f = l.split(':'); if (f.length < 7) continue;
    const uid = Number(f[2]);
    if (uid >= 1000 && uid < 60000 && !/nologin|false$/.test(f[6])) out.push({ name: f[0], fullName: (f[4] || '').split(',')[0] || f[0], home: f[5] });
  }
  return out;
}

async function createAccount(name, fullName, password, likeUid) {
  if (!NAME_RE.test(name)) throw new TTError('bad-name', `“${name}” can’t be used as an account name`);
  if (userInfo(name)) throw new TTError('exists', `There’s already an account called “${name}”`);
  if (!password || password.length < 1) throw new TTError('bad-password', 'Choose a password for the new account');
  // the same groups (administrator and so on) as the person running Migration Assistant
  let groups = ['sudo', 'adm', 'lpadmin', 'audio', 'video', 'plugdev', 'netdev', 'bluetooth', 'scanner'];
  try {
    const me = fs.readFileSync('/etc/passwd', 'utf8').split('\n').find((l) => Number(l.split(':')[2]) === likeUid);
    if (me) groups = (await run('id', ['-nG', me.split(':')[0]])).trim().split(/\s+/).filter((g) => g && g !== me.split(':')[0]);
  } catch { /* keep the defaults */ }
  const have = new Set(fs.readFileSync('/etc/group', 'utf8').split('\n').map((l) => l.split(':')[0]));
  groups = groups.filter((g) => have.has(g));
  await run('useradd', ['-m', '-s', '/bin/bash', '-c', String(fullName || name).replace(/[:,\n]/g, ' '), ...(groups.length ? ['-G', groups.join(',')] : []), name]);
  await run('chpasswd', [], { input: `${name}:${password}\n` });
  return userInfo(name);
}

function spawnP(cmd, args, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, LC_ALL: 'C' } });
    if (job) job.child = child;
    let err = '';
    child.stdout.on('data', (d) => { if (onLine) String(d).split(/[\r\n]+/).forEach((l) => l && onLine(l)); });
    child.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (job) job.child = null;
      // rsync 23/24: some files couldn't be read or vanished: the rest went over
      if (code === 0 || (cmd === 'rsync' && (code === 23 || code === 24))) resolve(code);
      else reject(new TTError('migration-failed', `${path.basename(cmd)} stopped (${code}): ${err.trim().split('\n').pop() || ''}`));
    });
  });
}

/** Copies src/ into dest/, keeping whatever it replaces in dest/Before Migration <date>. */
async function merge(src, dest, { settings, stamp, progress }) {
  const args = ['-aHAX', '--info=progress2', '--no-inc-recursive', '--backup', `--backup-dir=${path.join(dest, 'Before Migration ' + stamp)}`];
  for (const s of ALWAYS_SKIP) args.push('--exclude', s);
  if (!settings) args.push('--exclude', '/.*');
  args.push('--exclude', '/Before Migration *');
  args.push(src.replace(/\/?$/, '/'), dest.replace(/\/?$/, '/'));
  await spawnP('rsync', args, (l) => { const m = /(\d+)%/.exec(l); if (m) progress(Number(m[1])); });
}

/**
 * args: { source: { type: 'backup', token, snapshot } | { type: 'disk', uuid },
 *         people: [{ from, to, create?: { fullName, password } }], settings: bool, apps: [names] }
 */
async function migrate(args, ctx, { openBackups, emit }) {
  if (job) throw new TTError('busy', 'Migration Assistant is already bringing things over');
  const src = args.source || {};
  const people = (args.people || []).filter((p) => p && p.from && p.to);
  const apps = (args.apps || []).filter((n) => typeof n === 'string' && n.endsWith('.app') && !n.includes('/'));
  if (!people.length && !apps.length) throw new TTError('nothing', 'Choose what to bring over');
  for (const p of people) {
    if (p.from.includes('/') || p.from.startsWith('.')) throw new TTError('bad-path', 'That person can’t be found in the source');
    if (!NAME_RE.test(p.to)) throw new TTError('bad-name', `“${p.to}” can’t be used as an account name`);
    if (!p.create && !userInfo(p.to)) throw new TTError('no-account', `There’s no account called “${p.to}” on this computer`);
  }
  let open = null, drive = null;
  if (src.type === 'backup') {
    open = openBackups.get(src.token);
    if (!open) throw new TTError('bad-token', 'Open the backup again');
    if (!open.snapshots.some((s) => s.id === src.snapshot)) throw new TTError('no-snapshot', 'That backup no longer exists');
  } else if (src.type === 'disk') {
    drive = (await listDrives()).find((d) => d.uuid === src.uuid && !d.isSystem);
    if (!drive) throw new TTError('destination-missing', 'That disk is no longer connected');
  } else throw new TTError('bad-source', 'Choose where to bring things from');

  job = { id: crypto.randomBytes(6).toString('hex'), cancelled: false, child: null };
  const stamp = new Date().toISOString().slice(0, 10);
  const total = people.length + (apps.length ? 1 : 0);
  let step = 0;
  const say = (text, pct) => emit({ type: 'migration', phase: 'running', text, percent: Math.min(100, Math.round(((step + (pct || 0) / 100) / total) * 100)) });

  const body = async (root) => {
    // root: the source's top folder (a mounted disk) or null for a backup
    for (const p of people) {
      if (job.cancelled) throw new TTError('cancelled', 'Stopped');
      let acct = userInfo(p.to);
      if (!acct) { say(`Making the account “${p.to}”…`, 0); acct = await createAccount(p.to, p.create.fullName, p.create.password, ctx.uid); }
      const home = fs.realpathSync(acct.home);
      say(`Bringing over ${p.from}’s things…`, 0);
      if (src.type === 'backup') {
        const stage = path.join(path.dirname(home), `.palos-migration-${job.id}`);
        fs.rmSync(stage, { recursive: true, force: true }); mkdirp(stage, 0o700);
        try {
          const restic = new Restic({ repo: path.join(root, P.repoDirName), passwordFile: open.keyFile, noLock: true });
          await restic.restore(`${src.snapshot}:/home/${p.from}`, stage, { exclude: ['.cache'], onSpawn: (c) => { job.child = c; } });
          say(`Putting ${p.from}’s things in place…`, 50);
          await merge(stage, home, { settings: !!args.settings, stamp, progress: (n) => say(`Putting ${p.from}’s things in place…`, 50 + n / 2) });
        } finally { fs.rmSync(stage, { recursive: true, force: true }); }
      } else if (isNtfs(drive.fstype)) {
        const base = path.join(root, 'Users', p.from);
        for (const f of WIN_FOLDERS) {
          if (!fs.existsSync(path.join(base, f))) continue;
          mkdirp(path.join(home, f), 0o755);
          await merge(path.join(base, f), path.join(home, f), { settings: true, stamp, progress: (n) => say(`Bringing over ${p.from}’s ${f}…`, n) });
        }
      } else {
        await merge(path.join(root, 'home', p.from), home, { settings: !!args.settings, stamp, progress: (n) => say(`Bringing over ${p.from}’s things…`, n) });
      }
      say(`Finishing ${p.from}…`, 100);
      await run('chown', ['-R', `${acct.uid}:${acct.gid}`, home], { timeout: 30 * 60e3 });
      step++;
    }
    if (apps.length) {
      const have = new Set(appsOn('/Applications'));
      const want = apps.filter((n) => !have.has(n));
      for (const [i, n] of want.entries()) {
        if (job.cancelled) throw new TTError('cancelled', 'Stopped');
        say(`Bringing over ${n.replace(/\.app$/, '')}…`, (i / want.length) * 100);
        if (src.type === 'backup') {
          const stage = path.join('/Applications', `.migrating-${job.id}`);
          mkdirp(stage, 0o755);
          try {
            const restic = new Restic({ repo: path.join(root, P.repoDirName), passwordFile: open.keyFile, noLock: true });
            await restic.restore(`${src.snapshot}:/Applications`, stage, { include: [`/${n}`] });
            if (fs.existsSync(path.join(stage, n))) fs.renameSync(path.join(stage, n), path.join('/Applications', n));
          } finally { fs.rmSync(stage, { recursive: true, force: true }); }
        } else {
          await run('cp', ['--', path.join(root, 'Applications', n), path.join('/Applications', n + '.part')], { timeout: 30 * 60e3 });
          fs.renameSync(path.join('/Applications', n + '.part'), path.join('/Applications', n));
        }
        fs.chmodSync(path.join('/Applications', n), 0o755);
      }
      await run('/usr/lib/paladin-appd/paladin-appd', ['--system'], { timeout: 10 * 60e3 }).catch((e) => logger.warn('appd:', e.message));
      step++;
    }
  };

  const go = async () => {
    try {
      if (src.type === 'backup') await withProbeMount(open.uuid, body);
      else await withSourceMount(drive, body);
      logger.info(`migration finished: ${people.map((p) => p.from + '→' + p.to).join(', ')}${apps.length ? ' + ' + apps.length + ' app(s)' : ''}`);
      emit({ type: 'migration', phase: 'done', percent: 100, people: people.map((p) => p.to), apps: apps.length });
    } catch (err) {
      logger.error('migration failed:', err.message);
      emit({ type: 'migration', phase: job && job.cancelled ? 'cancelled' : 'failed', text: err.message });
    } finally { job = null; }
  };
  go();
  return { started: true };
}

/** Mounts a source disk read-only (Windows volumes too) for the copy. */
async function withSourceMount(drive, fn) {
  return withProbeMount(drive.uuid, fn);
}


function cancel() {
  if (!job) return { cancelled: false };
  job.cancelled = true;
  try { job.child?.kill('SIGTERM'); } catch { /* gone */ }
  return { cancelled: true };
}

module.exports = { scanDisks, backupContents, localAccounts, migrate, cancel, peopleOn, withProbeMount };

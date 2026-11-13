"""palOS setup: bring a computer back from a Time Turner backup (runs inside the root helper).

Accounts (with their passwords, groups and pictures), their home folders, saved Wi-Fi networks and
apps come back; the new system's own disk, boot and desktop setup stay as installed, so this also
works when moving to a different computer. Time Turner then carries on backing up to the same place.

Everything slow runs as a background job; the setup screen polls `job()` for progress.
Time Turner keeps its backups in a restic repository: <drive or share>/TimeTurner.
"""
import base64
import grp
import json
import os
import pwd
import re
import shutil
import subprocess
import threading
import time

RESTIC = '/usr/lib/time-turner/restic'
WORK = '/run/palos-firstboot/tt'              # mounts, the key, share credentials (tmpfs, root only)
CACHE = '/var/cache/palos-firstboot-restic'
REPO_DIR = 'TimeTurner'
TAG = 'time-turner'
BACKUP_FSTYPES = {'ext4', 'ext3', 'ext2', 'btrfs', 'xfs', 'f2fs', 'exfat', 'vfat', 'ntfs', 'ntfs3'}
EFI_PARTTYPE = 'c12a7328-f81f-11d2-ba4b-00a0c93ec93b'
USER_RE = re.compile(r'^[a-z_][a-z0-9_-]{0,31}$')
SNAP_RE = re.compile(r'^[0-9a-f]{8,64}$')
NOBLE_OTHERS = ('trusty', 'xenial', 'bionic', 'focal', 'jammy', 'kinetic', 'lunar', 'mantic', 'oracular', 'plucky', 'questing')

# Packages never brought back: they belong to the old computer's hardware or boot setup, or to the
# desktop palOS replaces (GNOME, snaps), and installing them would undo what palOS set up.
DENY = re.compile(r'^(linux-.*|grub.*|shim.*|efibootmgr|mokutil|casper|ubiquity.*|calamares.*|os-prober|plymouth.*|initramfs-tools.*'
                  r'|ubuntu-(desktop|session|gnome|minimal|standard|server|restricted-addons|wallpapers|settings|docs|release-upgrader)(-.*)?'
                  r'|gnome-shell.*|gdm3|gnome-session.*|gnome-initial-setup|gnome-control-center.*|nautilus.*|mutter.*|yaru-theme-gnome-shell'
                  r'|snapd|snap-.*|firefox|thunderbird|chromium-browser|chromium-chromedriver|lightdm.*|unity.*|sddm.*'
                  r'|nvidia-.*|libnvidia-.*|xserver-xorg-video-nvidia.*|.*-microcode|firmware-.*|linux-firmware'
                  r'|gnome-text-editor|file-roller|gnome-system-monitor|baobab|gnome-font-viewer|simple-scan|epiphany-browser|evince'
                  r'|loupe|gnome-calculator|eog|totem|gnome-terminal-data|apport.*|whoopsie|update-notifier.*|update-manager.*'
                  r'|software-properties-gtk|gnome-software.*|xdg-desktop-portal-gnome|gnome-remote-desktop|vanilla-gnome-.*|paladin-.*|palos-.*)$')
# Snaps that are plumbing or part of Ubuntu's own desktop rather than apps someone chose
SNAP_SKIP = re.compile(r'^(core\d*|snapd|bare|gtk-common-themes|gnome-\d+-\d+.*|kde-frameworks-.*|kf\d+-.*|mesa-.*|gpu-.*|'
                       r'snapd-desktop-integration|prompting-client|desktop-security-center|firmware-updater|snap-store|'
                       r'.*-runtime|.*-platform|.*-themes|wine-platform.*|cups)$')
SNAP_NAME = re.compile(r'^[a-z0-9](?:-?[a-z0-9]){0,39}$')
SNAPD_SOCK = '/run/snapd.socket'
ADMIN_GROUPS = ['adm', 'cdrom', 'sudo', 'dip', 'plugdev', 'lpadmin', 'users', 'netdev', 'bluetooth']

_log = lambda *a: None   # set by the helper


def set_logger(fn):
    global _log
    _log = fn


def available():
    return os.access(RESTIC, os.X_OK)


class Cancelled(Exception):
    pass


class Failure(Exception):
    """An error with a message meant for the person at the screen."""


# ------------------------------------------------------------------ small helpers
def run(cmd, *, input=None, timeout=None, env=None):
    r = subprocess.run(cmd, input=input, capture_output=True, text=True, timeout=timeout, env=env)
    if r.returncode != 0:
        _log('failed:', ' '.join(cmd[:6]), '->', r.returncode, (r.stderr or '').strip()[-400:])
    return r


def write_file(path, data, mode=0o644, uid=0, gid=0):
    tmp = path + '.palos-tmp'
    with open(tmp, 'wb') as f:
        f.write(data if isinstance(data, bytes) else data.encode())
    os.chmod(tmp, mode)
    os.chown(tmp, uid, gid)
    os.replace(tmp, path)


NEEDS_KEY = 'These backups were made by an earlier Time Turner. Enter their recovery key once.'


def normalise_key(k):
    """The same forgiving reading of a recovery key as Time Turner's (case, spaces, look-alikes)."""
    s = str(k or '').upper()
    s = re.sub(r'[\s_]', '', s).replace('O', '0').replace('I', '1').replace('L', '1').replace('U', 'V').replace('-', '')
    return '-'.join(s[i:i + 4] for i in range(0, len(s), 4))


def human(n):
    n = float(n or 0)
    for unit in ('bytes', 'KB', 'MB', 'GB', 'TB'):
        if n < 1000 or unit == 'TB':
            return f'{n:.0f} {unit}' if unit in ('bytes', 'KB') else f'{n:.1f} {unit}'
        n /= 1000


def mounted_at(target):
    try:
        with open('/proc/self/mounts') as f:
            for ln in f:
                parts = ln.split()
                if len(parts) > 1 and parts[1].replace('\\040', ' ') == target:
                    return True
    except OSError:
        pass
    return False


def device_of_uuid(uuid):
    """/dev/... for a filesystem UUID (udev's link, or blkid when udev hasn't made one)."""
    link = f'/dev/disk/by-uuid/{uuid}'
    if os.path.exists(link):
        return os.path.realpath(link)
    r = run(['blkid', '-U', uuid], timeout=20)
    dev = (r.stdout or '').strip()
    return dev if r.returncode == 0 and dev.startswith('/dev/') and os.path.exists(dev) else None


def mountpoint_of_uuid(uuid):
    dev = device_of_uuid(uuid)
    if not dev:
        return None
    try:
        with open('/proc/self/mounts') as f:
            for ln in f:
                src, tgt = ln.split()[:2]
                if src.startswith('/dev/') and os.path.realpath(src) == dev:
                    return tgt.replace('\\040', ' ')
    except OSError:
        pass
    return None


def umount(path):
    for _ in range(3):
        if not mounted_at(path):
            return True
        if run(['umount', path]).returncode == 0:
            return True
        time.sleep(1)
    run(['umount', '-l', path])
    return not mounted_at(path)


# ------------------------------------------------------------------ the session
class Session:
    def __init__(self):
        self.lock = threading.Lock()
        self.job = None              # {'kind', 'running', 'phase', 'progress', 'detail', 'result', 'error', 'cancel'}
        self.child = None
        self.source = None           # {'type': 'drive', 'uuid', 'label', 'fstype'} | {'type': 'smb', 'url', 'label', ...}
        self.mount = None            # where the drive / share is mounted
        self.repo = None
        self.keyfile = None
        self.key = None
        self.snapshots = []
        self.inspected = {}
        self.restored_users = []     # names, once the restore has finished
        self.restore_warnings = 0
        self.last_code = 0
        self.first_user = None

    # ---------------------------------------------------------- jobs
    def start(self, kind, fn, *args):
        with self.lock:
            if self.job and self.job['running']:
                return {'ok': False, 'error': 'Setup is still busy with the last step. Wait a moment.'}
            self.job = {'kind': kind, 'running': True, 'phase': '', 'progress': None, 'detail': '', 'result': None,
                        'error': None, 'cancel': False, 'cancellable': True}
        job = self.job

        def body():
            try:
                job['result'] = fn(job, *args)
            except Cancelled:
                job['error'] = 'cancelled'
            except Failure as e:
                job['error'] = str(e)
            except Exception as e:  # noqa: BLE001
                _log('job', kind, 'crashed:', repr(e))
                import traceback
                _log(traceback.format_exc())
                job['error'] = 'Something went wrong: ' + str(e)
            finally:
                job['running'] = False
                self.child = None
        threading.Thread(target=body, daemon=True).start()
        return {'ok': True}

    def status(self):
        j = self.job
        if not j:
            return {'ok': True, 'job': None}
        return {'ok': True, 'job': {k: j[k] for k in ('kind', 'running', 'phase', 'progress', 'detail', 'result', 'error', 'cancellable')}}

    def cancel(self):
        j = self.job
        if j and j['running']:
            with self.lock:
                if not j.get('cancellable', True):
                    return {'ok': False, 'error': 'Your accounts and files are already back; the last steps can’t be stopped.'}
                j['cancel'] = True
            c = self.child
            if c and c.poll() is None:
                try:
                    c.terminate()
                except OSError:
                    pass
        return {'ok': True}

    def check_cancel(self, job):
        if job['cancel']:
            raise Cancelled()

    # ---------------------------------------------------------- restic
    def restic_env(self):
        os.makedirs(CACHE, mode=0o700, exist_ok=True)
        return {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'HOME': '/root', 'RESTIC_REPOSITORY': self.repo,
                'RESTIC_PASSWORD_FILE': self.keyfile, 'RESTIC_CACHE_DIR': CACHE, 'RESTIC_PROGRESS_FPS': '2'}

    def restic(self, args, job=None, on_line=None, timeout=None, ok_codes=(0,)):
        """Run restic (read-only: no locks). Returns stdout (unless on_line takes it)."""
        cmd = [RESTIC, '--no-lock'] + args
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=self.restic_env())
        self.child = p
        err_lines = []

        def drain_err():
            for ln in p.stderr:
                err_lines.append(ln)
                del err_lines[:-40]
        t = threading.Thread(target=drain_err, daemon=True)
        t.start()
        out = []
        started = time.monotonic()
        for ln in p.stdout:
            if on_line:
                on_line(ln)
            else:
                out.append(ln)
            if job is not None and job['cancel']:
                p.terminate()
            if timeout and time.monotonic() - started > timeout:
                p.terminate()
        p.wait()
        t.join(5)
        self.child = None
        if job is not None and job['cancel']:
            raise Cancelled()
        err = ''.join(err_lines)
        self.last_code = p.returncode
        if p.returncode not in ok_codes:
            if p.returncode == 12 or re.search(r'wrong password|no key found', err, re.I):
                raise Failure('That recovery key doesn’t open these backups. Check it and try again.')
            if p.returncode == 10 or re.search(r'repository does not exist|unable to open config', err, re.I):
                raise Failure('No Time Turner backups were found there.')
            raise Failure('Time Turner’s backups couldn’t be read: ' + (err.strip().splitlines() or [f'exit {p.returncode}'])[-1][:300])
        return ''.join(out)

    def dump(self, snap, path, job=None, limit=64 << 20):
        """A file's contents from a backup (bytes), or None when it isn't in it."""
        cmd = [RESTIC, '--no-lock', 'dump', snap, path]
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=self.restic_env())
        self.child = p
        try:
            data, err = p.communicate(timeout=600)
        except subprocess.TimeoutExpired:
            p.kill()
            return None
        finally:
            self.child = None
        if job is not None:
            self.check_cancel(job)
        if p.returncode != 0 or len(data) > limit:
            return None
        return data

    def ls(self, snap, path, job=None):
        """Direct children of a folder in a backup: [{'name', 'type', 'path', 'size'}]."""
        try:
            out = self.restic(['ls', '--json', snap, path], job)
        except Failure:
            return []
        items = []
        for ln in out.splitlines():
            ln = ln.strip()
            if not ln.startswith('{'):
                continue
            try:
                n = json.loads(ln)
            except ValueError:
                continue
            p = n.get('path')
            if not p or n.get('struct_type') == 'snapshot' or p == path:
                continue
            if os.path.dirname(p.rstrip('/')) == path.rstrip('/'):
                items.append({'name': n.get('name') or os.path.basename(p), 'type': n.get('type'), 'path': p, 'size': n.get('size', 0)})
        return items

    # ---------------------------------------------------------- 1: find backups
    def scan(self, job):
        """Drives with Time Turner backups on them (probe-mounted read-only)."""
        job['phase'] = 'Looking for backup drives…'
        r = run(['lsblk', '-J', '-b', '-o', 'PATH,UUID,LABEL,FSTYPE,SIZE,MOUNTPOINTS,TRAN,TYPE,RM,HOTPLUG,MODEL,PARTTYPE'], timeout=30)
        try:
            tree = json.loads(r.stdout or '{}').get('blockdevices', [])
        except ValueError:
            tree = []
        flat = []

        def walk(nodes, disk):
            for n in nodes or []:
                d = n if n.get('type') == 'disk' else disk
                flat.append((n, d))
                walk(n.get('children'), d)
        walk(tree, None)
        found = []
        for n, disk in flat:
            self.check_cancel(job)
            if not n.get('fstype') and n.get('path', '').startswith('/dev/') and n.get('type') in ('part', 'disk', 'loop', 'crypt', 'lvm', 'md'):
                # udev hasn't described it (yet): ask the filesystem directly
                r = run(['blkid', '-p', '-o', 'export', n['path']], timeout=20)
                kv = {k: re.sub(r'\\(.)', r'\1', v) for k, v in (ln.split('=', 1) for ln in (r.stdout or '').splitlines() if '=' in ln)}
                n['fstype'], n['uuid'], n['label'] = kv.get('TYPE'), kv.get('UUID'), n.get('label') or kv.get('LABEL')
            uuid, fstype = n.get('uuid'), n.get('fstype')
            if not uuid or fstype not in BACKUP_FSTYPES or not re.match(r'^[0-9A-Za-z-]+$', uuid):
                continue
            if (n.get('parttype') or '').lower() == EFI_PARTTYPE:
                continue
            mps = [m for m in (n.get('mountpoints') or []) if m]
            if any(m in ('/', '/boot', '/boot/efi', '[SWAP]') or m.startswith('/boot/') for m in mps):
                continue
            disk = disk or n
            removable = bool(disk.get('rm') or disk.get('hotplug') or n.get('rm') or n.get('hotplug')) or disk.get('tran') == 'usb'
            label = n.get('label') or (disk.get('model') or '').strip() or ('External Drive' if removable else 'Internal Disk')
            has = False
            mp = mps[0] if mps else mountpoint_of_uuid(uuid)
            if mp:
                has = os.path.exists(os.path.join(mp, REPO_DIR, 'config'))
            else:
                probe = os.path.join(WORK, 'probe', uuid)
                os.makedirs(probe, mode=0o700, exist_ok=True)
                if run(['mount', '-o', 'ro', f'UUID={uuid}', probe], timeout=60).returncode == 0:
                    try:
                        has = os.path.exists(os.path.join(probe, REPO_DIR, 'config'))
                    finally:
                        umount(probe)
                try:
                    os.rmdir(probe)
                except OSError:
                    pass
            if has:
                found.append({'id': uuid, 'label': label, 'size': int(n.get('size') or 0), 'sizeText': human(n.get('size')),
                              'fstype': fstype, 'removable': removable})
        found.sort(key=lambda d: (not d['removable'], d['label'].lower()))
        return {'drives': found}

    # ---------------------------------------------------------- 2: open with the recovery key
    def release(self):
        if self.mount and self.mount.startswith(WORK):
            umount(self.mount)
        self.mount = self.repo = None

    def open(self, job, source, key):
        self.release()
        self.snapshots, self.inspected = [], {}
        # The backups' key travels with them (TimeTurner.key, next to the TimeTurner folder); only backups
        # made by an earlier Time Turner need it typed in.
        key = normalise_key(key) if key else ''
        os.makedirs(WORK, mode=0o700, exist_ok=True)
        if source.get('type') == 'drive':
            uuid = str(source.get('id') or '')
            if not re.match(r'^[0-9A-Za-z-]+$', uuid):
                raise Failure('Choose a backup drive.')
            job['phase'] = 'Opening the backup drive…'
            mp = mountpoint_of_uuid(uuid)
            if not mp:
                if not device_of_uuid(uuid):
                    raise Failure('That drive isn’t connected any more. Plug it in and try again.')
                mp = os.path.join(WORK, 'drive')
                os.makedirs(mp, mode=0o700, exist_ok=True)
                r = run(['mount', '-o', 'ro', f'UUID={uuid}', mp], timeout=90)
                if r.returncode != 0:
                    raise Failure('The backup drive couldn’t be opened: ' + (r.stderr.strip() or 'mount failed'))
            repo = os.path.join(mp, REPO_DIR)
            info = {'type': 'drive', 'uuid': uuid, 'label': str(source.get('label') or 'Backup Drive')[:80],
                    'fstype': str(source.get('fstype') or '')}
        elif source.get('type') == 'smb':
            url = str(source.get('url') or '').strip()
            m = re.match(r'^(?:smb:)?//([^/\s]+)/([^/\s]+)(/.*)?$', url)
            if not m:
                raise Failure('Type the share’s address like smb://server/share')
            server, share, sub = m.group(1), m.group(2), (m.group(3) or '').strip('/')
            user = str(source.get('username') or '').strip() or 'guest'
            password = str(source.get('password') or '')
            domain = str(source.get('domain') or '').strip()
            if any('\n' in v for v in (user, password, domain)):
                raise Failure('The name or password has a line break in it.')
            cred = os.path.join(WORK, 'smb-credentials')
            write_file(cred, f'username={user}\npassword={password}\n' + (f'domain={domain}\n' if domain else ''), 0o600)
            mp = os.path.join(WORK, 'share')
            os.makedirs(mp, mode=0o700, exist_ok=True)
            job['phase'] = f'Connecting to {server}…'
            r = run(['mount', '-t', 'cifs', f'//{server}/{share}', mp, '-o',
                     f'ro,credentials={cred},uid=0,gid=0,file_mode=0600,dir_mode=0700,nobrl'], timeout=90)
            if r.returncode != 0:
                e = (r.stderr or '').lower()
                if 'permission denied' in e or 'error(13)' in e:
                    raise Failure('The share didn’t accept that name and password.')
                if 'no such file' in e or 'error(2)' in e:
                    raise Failure(f'There’s no share called “{share}” on {server}.')
                if 'could not resolve' in e or 'unable to find suitable address' in e or 'host is down' in e or 'error(112)' in e or 'error(113)' in e:
                    raise Failure(f'{server} can’t be reached. Check the address and that this computer is on the same network.')
                raise Failure('The share couldn’t be opened: ' + (r.stderr.strip() or 'mount failed')[:300])
            # The address may point at the folder holding TimeTurner, or at the TimeTurner folder itself.
            if sub and os.path.basename(sub) == REPO_DIR and os.path.exists(os.path.join(mp, sub, 'config')):
                sub = os.path.dirname(sub)
            repo = os.path.join(mp, sub, REPO_DIR) if sub else os.path.join(mp, REPO_DIR)
            info = {'type': 'smb', 'url': f'//{server}/{share}' + (f'/{sub}' if sub else ''),
                    'label': f'{share} on {server}', 'username': user, 'password': password, 'domain': domain}
        else:
            raise Failure('Choose where the backups are.')
        self.mount = mp
        if not os.path.exists(os.path.join(repo, 'config')):
            self.release()
            raise Failure('No Time Turner backups were found there.')
        self.repo = repo
        if not key:
            try:
                key = open(repo + '.key', encoding='utf-8').read().strip()
            except OSError:
                key = ''
            if not key:
                self.release()
                raise Failure(NEEDS_KEY)
        elif len(key.replace('-', '')) < 8:
            self.release()
            raise Failure('Enter the recovery key that Time Turner showed when its backups were set up.')
        self.keyfile = os.path.join(WORK, 'key')
        write_file(self.keyfile, key + '\n', 0o600)
        job['phase'] = 'Unlocking the backups…'
        try:
            out = self.restic(['snapshots', '--json'], job)
        except (Failure, Cancelled):
            self.release()
            raise
        try:
            snaps = json.loads(out or '[]') or []
        except ValueError:
            snaps = []
        snaps = [s for s in snaps if TAG in (s.get('tags') or [])]
        if not snaps:
            self.release()
            raise Failure('These backups are empty: there’s nothing to restore yet.')
        snaps.sort(key=lambda s: s.get('time', ''), reverse=True)
        self.source, self.key = info, key
        self.snapshots = snaps
        out = []
        for s in snaps:
            tags = s.get('tags') or []
            kind = next((k for k in ('first', 'kernel', 'upgrade', 'pre-restore', 'manual', 'auto') if k in tags), 'auto')
            out.append({'id': s['id'], 'time': s.get('time'), 'host': s.get('hostname', ''), 'kind': kind,
                        'paths': s.get('paths') or []})
        return {'snapshots': out, 'source': info['label']}

    # ---------------------------------------------------------- 3: what's in a backup
    def snapshot(self, sid):
        if not isinstance(sid, str) or not SNAP_RE.match(sid):
            raise Failure('Choose a backup.')
        s = next((s for s in self.snapshots if s['id'] == sid), None)
        if not s:
            raise Failure('That backup isn’t there any more. Choose another one.')
        return s

    def inspect(self, job, sid):
        s = self.snapshot(sid)
        if sid in self.inspected:
            return self.public_info(self.inspected[sid])
        job['phase'] = 'Reading the backup…'
        paths = s.get('paths') or []
        covers = lambda p: any(p == x or p.startswith(x.rstrip('/') + '/') for x in paths)
        info = {'id': sid, 'host': s.get('hostname', ''), 'time': s.get('time'), 'passwd': None, 'shadow': {}, 'groups': [],
                'users': [], 'wifi': [], 'apps': [], 'tt_config': None}
        if covers('/etc/passwd'):
            pw = self.dump(sid, '/etc/passwd', job)
            if pw:
                info['passwd'] = pw.decode('utf-8', 'replace')
            sh = self.dump(sid, '/etc/shadow', job)
            if sh:
                for ln in sh.decode('utf-8', 'replace').splitlines():
                    f = ln.split(':')
                    if len(f) >= 2:
                        info['shadow'][f[0]] = f[1]
            gr = self.dump(sid, '/etc/group', job)
            if gr:
                for ln in gr.decode('utf-8', 'replace').splitlines():
                    f = ln.split(':')
                    if len(f) >= 4 and f[2].isdigit():
                        info['groups'].append({'name': f[0], 'gid': int(f[2]), 'members': [m for m in f[3].split(',') if m]})
            cfg = self.dump(sid, '/etc/time-turner/config.json', job)
            if cfg:
                try:
                    info['tt_config'] = json.loads(cfg)
                except ValueError:
                    pass
        job['phase'] = 'Looking for accounts…'
        homes = {i['name']: i for i in self.ls(sid, '/home', job) if i['type'] == 'dir'} if covers('/home') else {}
        users = []
        if info['passwd']:
            gid_names = {g['gid']: g['name'] for g in info['groups']}
            for ln in info['passwd'].splitlines():
                f = ln.split(':')
                if len(f) < 7 or not f[2].isdigit() or not f[3].isdigit():
                    continue
                name, uid, gid, gecos, home, shell = f[0], int(f[2]), int(f[3]), f[4], f[5], f[6]
                if not (1000 <= uid < 60000) or not USER_RE.match(name) or not home.startswith('/home/'):
                    continue
                if shell.endswith(('nologin', '/false')):
                    continue
                h = self.shadow_hash(info['shadow'].get(name))
                users.append({'name': name, 'uid': uid, 'gid': gid, 'group': gid_names.get(gid, name), 'full': gecos.split(',')[0].strip() or name,
                              'home': home, 'shell': shell if shell.startswith('/') else '/bin/bash', 'hash': h,
                              'hasHome': os.path.basename(home) in homes and os.path.dirname(home) == '/home'})
        else:
            # A backup of the home folders only: the accounts come from the folders, with new passwords.
            for name in sorted(homes):
                if USER_RE.match(name) and name not in ('lost+found',):
                    users.append({'name': name, 'uid': None, 'gid': None, 'group': name, 'full': name, 'home': f'/home/{name}',
                                  'shell': '/bin/bash', 'hash': None, 'hasHome': True})
        for u in users:
            u['admin'] = any(g['name'] in ('sudo', 'admin', 'wheel') and u['name'] in g['members'] for g in info['groups']) if info['groups'] else True
            pic = self.dump(sid, f'/var/lib/AccountsService/icons/{u["name"]}', job, limit=2 << 20) if covers('/var/lib/AccountsService') else None
            if not pic and u['hasHome']:
                pic = self.dump(sid, f'{u["home"]}/.face', job, limit=2 << 20)
            u['picture'] = None
            if pic and (pic[:8] == b'\x89PNG\r\n\x1a\n' or pic[:3] == b'\xff\xd8\xff'):
                u['picture'] = ('data:image/png;base64,' if pic[:4] == b'\x89PNG' else 'data:image/jpeg;base64,') + base64.b64encode(pic).decode()
        info['users'] = users
        # Wi-Fi networks
        if covers('/etc/NetworkManager/system-connections'):
            job['phase'] = 'Looking for Wi-Fi networks…'
            for item in self.ls(sid, '/etc/NetworkManager/system-connections', job):
                if item['type'] != 'file' or item['size'] > 256 << 10:
                    continue
                data = self.dump(sid, item['path'], job)
                if not data:
                    continue
                text = data.decode('utf-8', 'replace')
                ini = parse_ini(text)
                if ini.get('connection', {}).get('type') not in ('wifi', '802-11-wireless'):
                    continue
                ssid = ini.get('wifi', ini.get('802-11-wireless', {})).get('ssid', '')
                if ssid:
                    info['wifi'].append({'name': item['name'], 'ssid': ssid, 'text': text})
        # Apps
        if covers('/var/lib/dpkg/status'):
            job['phase'] = 'Looking at the apps…'
            st = self.dump(sid, '/var/lib/dpkg/status', job, limit=256 << 20)
            ext = self.dump(sid, '/var/lib/apt/extended_states', job, limit=64 << 20) or b''
            if st:
                info['apps'] = manual_packages(st.decode('utf-8', 'replace'), ext.decode('utf-8', 'replace'))
                info['sources'] = self.third_party_sources(sid, job)
        info['snaps'] = []
        if covers('/var/lib/snapd/snaps'):
            names = set()
            for item in self.ls(sid, '/var/lib/snapd/snaps', job):
                m = re.match(r'^([a-z0-9-]+)_x?\d+\.snap$', item['name'])
                if m and SNAP_NAME.match(m.group(1)) and not SNAP_SKIP.match(m.group(1)):
                    names.add(m.group(1))
            info['snaps'] = sorted(names)
        self.inspected[sid] = info
        return self.public_info(info)

    @staticmethod
    def shadow_hash(h):
        if not h or h in ('*', '!', '!!', 'x') or h.startswith(('!', '*')):
            return None
        return h if re.match(r'^\$[0-9a-z]+\$', h) else None

    def public_info(self, info):
        here = installed_packages()
        apps = [p for p in info['apps'] if p not in here and not DENY.match(p)]
        return {'id': info['id'], 'host': info['host'], 'time': info['time'],
                'users': [{'name': u['name'], 'full': u['full'], 'picture': u['picture'], 'needsPassword': not u['hash'],
                           'hasHome': u['hasHome'], 'admin': u['admin'], 'taken': name_taken(u['name'])} for u in info['users']],
                'wifi': [w['ssid'] for w in info['wifi']], 'apps': len(apps) + len(info.get('snaps') or [])}

    def third_party_sources(self, sid, job):
        """Extra software sources (and their signing keys) from the backup, to try on this computer."""
        out = []
        for item in self.ls(sid, '/etc/apt/sources.list.d', job):
            if item['type'] != 'file' or not re.search(r'\.(list|sources)$', item['name']) or item['size'] > 64 << 10:
                continue
            if os.path.exists(os.path.join('/etc/apt/sources.list.d', item['name'])):
                continue
            data = self.dump(sid, item['path'], job)
            if not data:
                continue
            text = data.decode('utf-8', 'replace')
            if re.search(r'\b(' + '|'.join(NOBLE_OTHERS) + r')\b', text) or 'cdrom:' in text:
                continue
            keys = {}
            for k in set(re.findall(r'(?:signed-by=|Signed-By:\s*)(/[^\s\]]+)', text, re.I)):
                if re.match(r'^/(etc/apt/keyrings|usr/share/keyrings|etc/apt/trusted\.gpg\.d)/[\w.+-]+$', k) and not os.path.exists(k):
                    kd = self.dump(sid, k, job, limit=1 << 20)
                    if kd:
                        keys[k] = base64.b64encode(kd).decode()
            out.append({'name': item['name'], 'text': text, 'keys': keys})
        for item in self.ls(sid, '/etc/apt/trusted.gpg.d', job):
            if item['type'] == 'file' and re.match(r'^[\w.+-]+\.(gpg|asc)$', item['name']) and not os.path.exists(item['path']):
                kd = self.dump(sid, item['path'], job, limit=1 << 20)
                if kd:
                    out.append({'name': None, 'text': None, 'keys': {item['path']: base64.b64encode(kd).decode()}})
        return out

    # ---------------------------------------------------------- 4: restore
    def restore(self, job, sid, choices):
        info = self.inspected.get(sid)
        if not info:
            raise Failure('Choose a backup first.')
        wanted = {}
        for c in choices.get('users') or []:
            if isinstance(c, dict) and c.get('name'):
                wanted[c['name']] = c
        users = [u for u in info['users'] if u['name'] in wanted]
        if not users:
            raise Failure('Choose at least one account to bring back.')
        for u in users:
            if name_taken(u['name']):
                raise Failure(f'There’s already an account called “{u["name"]}” on this computer.')
            if not u['hash']:
                p = wanted[u['name']].get('password')
                if not isinstance(p, str) or not p or '\n' in p or len(p) > 512:
                    raise Failure(f'Choose a password for {u["full"]}.')
        report = {'users': [], 'wifi': 0, 'apps': {'installed': [], 'unavailable': [], 'skipped': [], 'failed': [], 'offline': False},
                  'warnings': [], 'backups': False}
        created = []          # (kind, name) for undo
        staging = None
        try:
            # --- accounts
            job['phase'], job['progress'] = 'Creating the accounts…', None
            for u in users:
                self.check_cancel(job)
                created += self.create_account(u, info, wanted[u['name']].get('password'))
            # --- files
            with_home = [u for u in users if u['hasHome']]
            staging = self.restore_files(job, sid, info, users, with_home)
            self.check_cancel(job)
            self.put_files_in_place(staging, users, report)
            if self.restore_warnings:
                report['warnings'].append(f'{self.restore_warnings} file{"s" if self.restore_warnings != 1 else ""} couldn’t be read from the backup.')
            shutil.rmtree(staging, ignore_errors=True)
            staging = None
            # Past this point Stop is refused; a Stop that arrived just before still undoes everything.
            with self.lock:
                if job['cancel']:
                    raise Cancelled()
                job['cancellable'] = False
        except BaseException:
            job['phase'] = 'Undoing…'
            if staging:
                shutil.rmtree(staging, ignore_errors=True)
            self.undo(created)
            raise
        # From here on the accounts and files are in place: the rest is best effort and can't be cancelled.
        report['users'] = [{'name': u['name'], 'full': u['full'], 'picture': u['picture']} for u in users]
        self.restored_users = [u['name'] for u in users]
        self.first_user = users[0]['name']
        if choices.get('wifi', True) and info['wifi']:
            job['phase'], job['progress'], job['detail'] = 'Bringing back Wi-Fi networks…', None, ''
            try:
                report['wifi'] = self.restore_wifi(info)
            except Exception as e:  # noqa: BLE001
                report['warnings'].append('Wi-Fi networks: ' + str(e))
        try:
            report['backups'] = self.continue_backups(info)
        except Exception as e:  # noqa: BLE001
            report['warnings'].append('Time Turner settings: ' + str(e))
        if choices.get('apps', True) and info['apps']:
            try:
                self.restore_apps(job, info, report)
            except Exception as e:  # noqa: BLE001
                _log('apps:', repr(e))
                report['warnings'].append('Apps: ' + str(e))
        if choices.get('apps', True) and info.get('snaps'):
            try:
                self.restore_snaps(job, info, report)
            except Exception as e:  # noqa: BLE001
                _log('snaps:', repr(e))
                report['warnings'].append('Snaps: ' + str(e))
        if choices.get('apps', True) and (info['apps'] or info.get('snaps')):
            self.write_app_note(report)
        job['phase'], job['progress'], job['detail'] = 'Finishing…', 1.0, ''
        return report

    def create_account(self, u, info, password):
        undo = []
        groups_here = {g.gr_name for g in grp.getgrall()}
        # primary group: same name and number when free
        gname = u['group'] if USER_RE.match(u['group'] or '') else u['name']
        if gname not in groups_here:
            args = ['groupadd']
            if u['gid'] and gid_free(u['gid']):
                args += ['-g', str(u['gid'])]
            r = run(args + [gname])
            if r.returncode != 0:
                raise Failure(f'The account “{u["name"]}” couldn’t be created: ' + r.stderr.strip())
            undo.append(('group', gname))
        args = ['useradd', '--no-create-home', '--home-dir', u['home'], '--shell', u['shell'] if os.path.exists(u['shell']) else '/bin/bash',
                '--comment', u['full'].replace(':', ' ')[:120], '--gid', gname, '--no-user-group']
        if u['uid'] and uid_free(u['uid']):
            args += ['--uid', str(u['uid'])]
        r = run(args + [u['name']])
        if r.returncode != 0:
            for kind, name in reversed(undo):
                run(['groupdel', name])
            raise Failure(f'The account “{u["name"]}” couldn’t be created: ' + r.stderr.strip())
        undo.append(('user', u['name']))
        if u['hash']:
            r = run(['chpasswd', '-e'], input=f'{u["name"]}:{u["hash"]}\n')
        else:
            r = run(['chpasswd'], input=f'{u["name"]}:{password}\n')
        if r.returncode != 0:
            self.undo(undo)
            raise Failure(f'The password for “{u["name"]}” couldn’t be set.')
        # other groups: the ones they were in that exist here, plus their own groups from the old computer
        member_of = [g for g in info['groups'] if u['name'] in g['members']]
        extra = set()
        for g in member_of:
            if not USER_RE.match(g['name']):
                continue
            if g['name'] in {x.gr_name for x in grp.getgrall()}:
                extra.add(g['name'])
            elif 1000 <= g['gid'] < 60000:
                args = ['groupadd'] + (['-g', str(g['gid'])] if gid_free(g['gid']) else []) + [g['name']]
                if run(args).returncode == 0:
                    undo.append(('group', g['name']))
                    extra.add(g['name'])
        if u['admin']:
            extra |= {g for g in ADMIN_GROUPS if group_exists(g)}
        extra.discard(gname)
        if extra:
            run(['usermod', '-aG', ','.join(sorted(extra)), u['name']])
        pw = pwd.getpwnam(u['name'])
        u['new_uid'], u['new_gid'] = pw.pw_uid, pw.pw_gid
        return undo

    def undo(self, created):
        for kind, name in reversed(created):
            if kind == 'user':
                try:
                    home = pwd.getpwnam(name).pw_dir
                except KeyError:
                    home = None
                run(['userdel', name])
                if home and home.startswith('/home/') and os.path.isdir(home):
                    shutil.rmtree(home, ignore_errors=True)
                for f in (f'/var/lib/AccountsService/users/{name}', f'/var/lib/AccountsService/icons/{name}'):
                    try:
                        os.unlink(f)
                    except OSError:
                        pass
                shutil.rmtree(f'/var/lib/paladin-login/users/{name}', ignore_errors=True)
            elif kind == 'group':
                run(['groupdel', name])

    def restore_files(self, job, sid, info, users, with_home):
        """restic restore the home folders and account extras into a staging folder on /home's disk."""
        staging = '/home/.palos-restore'
        shutil.rmtree(staging, ignore_errors=True)
        os.makedirs(staging, mode=0o700)
        includes = [u['home'] for u in with_home]
        for u in users:
            includes += [f'/var/lib/AccountsService/icons/{u["name"]}', f'/var/lib/AccountsService/users/{u["name"]}',
                         f'/var/lib/paladin-login/users/{u["name"]}']
        job['phase'], job['progress'], job['detail'] = 'Restoring files…', 0.0, ''
        free = shutil.disk_usage('/home').free
        state = {'checked': False}

        def on_line(ln):
            ln = ln.strip()
            if not ln.startswith('{'):
                return
            try:
                m = json.loads(ln)
            except ValueError:
                return
            if m.get('message_type') == 'error':
                state['errors'] = state.get('errors', 0) + 1
                if state['errors'] <= 20:
                    _log('restore:', str(m.get('error', ''))[:200], m.get('item', ''))
                return
            if m.get('message_type') == 'summary':
                state['summary'] = True
            if m.get('message_type') not in ('status', 'summary'):
                return
            total = m.get('total_bytes') or 0
            done = m.get('bytes_restored') or 0
            if total and not state['checked']:
                state['checked'] = True
                if total > free - (512 << 20):
                    job['cancel'] = True
                    state['space'] = (total, free)
            if total:
                job['progress'] = min(1.0, done / total)
                left = m.get('seconds_remaining')
                job['detail'] = f'{human(done)} of {human(total)}' + (f' — about {fmt_time(left)} left' if left else '')
        try:
            try:
                self.restic(['restore', sid, '--target', staging, '--json'] + sum((['--include', p] for p in includes), []), job, on_line,
                            ok_codes=(0, 1))
                if self.last_code == 1 and not state.get('summary'):
                    raise Failure('The files couldn’t be restored. Check that the backup drive is still connected and try again.')
                if state.get('errors'):
                    self.restore_warnings = state['errors']
            except Cancelled:
                if state.get('space'):
                    total, free = state['space']
                    raise Failure(f'There isn’t enough space on this computer: the files need {human(total)}, and {human(free)} is free.')
                raise
        except BaseException:
            shutil.rmtree(staging, ignore_errors=True)
            raise
        return staging

    def put_files_in_place(self, staging, users, report):
        for u in users:
            uid, gid = u['new_uid'], u['new_gid']
            src = staging + u['home']
            dst = u['home']
            if os.path.isdir(src):
                if os.path.isdir(dst) and not os.path.islink(dst):
                    shutil.rmtree(dst, ignore_errors=True)
                elif os.path.lexists(dst):
                    os.unlink(dst)
                os.rename(src, dst)
                if u['uid'] is not None and (u['uid'] != uid or u['gid'] != gid):
                    run(['chown', '-R', '-h', f'--from={u["uid"]}', str(uid), dst])
                    run(['chown', '-R', '-h', f'--from=:{u["gid"]}', f':{gid}', dst])
                elif u['uid'] is None:
                    run(['chown', '-R', '-h', f'{uid}:{gid}', dst])
                os.chown(dst, uid, gid)
            else:
                # no folder in the backup: a fresh one, like a new account gets
                if not os.path.isdir(dst):
                    shutil.copytree('/etc/skel', dst, symlinks=True)
                    run(['chown', '-R', f'{uid}:{gid}', dst])
                os.chmod(dst, 0o750)
            # picture, login session and the login screen's light/dark for them
            os.makedirs('/var/lib/AccountsService/icons', exist_ok=True)
            os.makedirs('/var/lib/AccountsService/users', exist_ok=True)
            pic_src = staging + f'/var/lib/AccountsService/icons/{u["name"]}'
            pic = None
            if os.path.isfile(pic_src):
                pic = f'/var/lib/AccountsService/icons/{u["name"]}'
                shutil.copyfile(pic_src, pic)
                os.chmod(pic, 0o644)
            elif os.path.isfile(os.path.join(dst, '.face')):
                pic = f'/var/lib/AccountsService/icons/{u["name"]}'
                shutil.copyfile(os.path.join(dst, '.face'), pic)
                os.chmod(pic, 0o644)
            write_file(f'/var/lib/AccountsService/users/{u["name"]}',
                       '[User]\nSession=paladin\nXSession=paladin\n' + (f'Icon={pic}\n' if pic else '') + 'SystemAccount=false\n', 0o600)
            ld_src = staging + f'/var/lib/paladin-login/users/{u["name"]}/paladin.json'
            dark = False
            try:
                dark = bool(json.load(open(ld_src)).get('dark'))
            except (OSError, ValueError, AttributeError):
                pass
            d = f'/var/lib/paladin-login/users/{u["name"]}'
            try:
                lgid = grp.getgrnam('paladin-login').gr_gid
            except KeyError:
                lgid = gid
            os.makedirs(d, exist_ok=True)
            os.chown(d, uid, lgid)
            os.chmod(d, 0o770)
            write_file(os.path.join(d, 'paladin.json'), json.dumps({'dark': dark}) + '\n', 0o644, uid, lgid)
        run(['systemctl', 'try-restart', 'accounts-daemon.service'])

    def restore_wifi(self, info):
        have = set()
        r = run(['nmcli', '-t', '-f', 'TYPE,NAME', 'connection', 'show'], timeout=15)
        for ln in (r.stdout or '').splitlines():
            if ln.startswith('802-11-wireless:'):
                have.add(ln.split(':', 1)[1].replace('\\:', ':'))
        ssids_here = set()
        d = '/etc/NetworkManager/system-connections'
        os.makedirs(d, mode=0o700, exist_ok=True)
        for f in os.listdir(d):
            ini = parse_ini(open(os.path.join(d, f), errors='replace').read()) if os.path.isfile(os.path.join(d, f)) else {}
            s = ini.get('wifi', {}).get('ssid')
            if s:
                ssids_here.add(s)
        n = 0
        for w in info['wifi']:
            if w['ssid'] in ssids_here:
                continue
            text = '\n'.join(ln for ln in w['text'].splitlines()
                             if not re.match(r'^\s*(interface-name|mac-address|cloned-mac-address|mac-address-blacklist|mac-address-denylist)\s*=', ln)) + '\n'
            name = re.sub(r'[^\w .()+-]', '_', w['name'])[:120] or f'wifi-{n}.nmconnection'
            if not name.endswith('.nmconnection'):
                name += '.nmconnection'
            path = os.path.join(d, name)
            if os.path.exists(path):
                continue
            write_file(path, text, 0o600)
            ssids_here.add(w['ssid'])
            n += 1
        if n:
            run(['nmcli', 'connection', 'reload'], timeout=30)
        return n

    def continue_backups(self, info):
        """Time Turner carries on backing up to the same place, as the computer it was."""
        if os.path.exists('/etc/time-turner/config.json') or not os.path.exists('/Applications/Time Turner.app'):
            return False
        old = info.get('tt_config') if isinstance(info.get('tt_config'), dict) else {}
        src = self.source
        if src['type'] == 'drive':
            dest = {'type': 'local', 'uuid': src['uuid'], 'label': src['label'], 'fstype': src.get('fstype', '')}
        else:
            dest = {'type': 'smb', 'url': src['url'], 'label': src['label']}
        inc = old.get('include') if isinstance(old.get('include'), dict) else {'system': True, 'home': True, 'extra': []}
        cfg = {'version': 1, 'destination': dest, 'frequency': old.get('frequency') if old.get('frequency') in ('hourly', '6h', 'daily', 'weekly') else 'hourly',
               'auto': old.get('auto', True) is not False, 'include': inc, 'excludeExtra': old.get('excludeExtra') or [],
               'host': info['host'] or os.uname().nodename, 'createdAt': int(time.time() * 1000)}
        os.makedirs('/etc/time-turner', mode=0o700, exist_ok=True)
        os.chmod('/etc/time-turner', 0o700)
        if src['type'] == 'smb':
            write_file('/etc/time-turner/smb-credentials', f'username={src["username"]}\npassword={src["password"]}\n'
                       + (f'domain={src["domain"]}\n' if src.get('domain') else ''), 0o600)
        write_file('/etc/time-turner/repo.key', self.key + '\n', 0o600)
        write_file('/etc/time-turner/config.json', json.dumps(cfg, indent=2) + '\n', 0o600)
        os.makedirs('/var/lib/time-turner', mode=0o755, exist_ok=True)
        st = '/var/lib/time-turner/state.json'
        state = {}
        try:
            state = json.load(open(st))
        except (OSError, ValueError):
            pass
        state['firstBackupDone'] = True
        write_file(st, json.dumps(state, indent=2) + '\n', 0o644)
        run(['systemctl', 'try-restart', 'time-turnerd.service'], timeout=60)
        return True

    # ---------------------------------------------------------- apps
    def restore_apps(self, job, info, report):
        want = [p for p in info['apps'] if p not in installed_packages()]
        skipped = sorted(p for p in want if DENY.match(p))
        report['apps']['skipped'] = skipped
        want = [p for p in want if not DENY.match(p)]
        if not want:
            return
        job['phase'], job['progress'], job['detail'] = 'Getting ready to reinstall apps…', None, ''
        env = dict(os.environ, DEBIAN_FRONTEND='noninteractive', PATH='/usr/sbin:/usr/bin:/sbin:/bin', LC_ALL='C.UTF-8')
        r = run(['apt-get', 'update', '-q'], timeout=900, env=env)
        if not re.search(r'^(Hit|Get):', r.stdout or '', re.M):
            report['apps']['offline'] = True
            report['apps']['unavailable'] = sorted(want)
            return
        # extra software sources from the old computer, each kept only if it works here
        added = []
        for src in info.get('sources') or []:
            added += self.try_source(src, env)
        if added:
            run(['apt-get', 'update', '-q'], timeout=900, env=env)
        cand = candidates(want, env)
        unavailable = sorted(p for p in want if p not in cand)
        want = [p for p in want if p in cand]
        ok, bad = plan(want, env)
        skipped += bad
        report['apps']['unavailable'] = unavailable
        report['apps']['skipped'] = sorted(set(skipped))
        if not ok:
            return
        job['phase'], job['progress'] = f'Reinstalling {len(ok)} app{"s" if len(ok) != 1 else ""}…', 0.0
        rfd, wfd = os.pipe()
        cmd = ['apt-get', 'install', '-y', '-q', '-o', f'APT::Status-Fd={wfd}', '-o', 'Dpkg::Options::=--force-confdef',
               '-o', 'Dpkg::Options::=--force-confold'] + ok
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env, pass_fds=(wfd,))
        os.close(wfd)
        tail = []

        def out_reader():
            for ln in p.stdout:
                tail.append(ln)
                del tail[:-60]
        threading.Thread(target=out_reader, daemon=True).start()
        with os.fdopen(rfd, 'r', errors='replace') as status:
            for ln in status:
                f = ln.strip().split(':', 3)
                if len(f) >= 4 and f[0] in ('dlstatus', 'pmstatus'):
                    try:
                        pct = float(f[2])
                    except ValueError:
                        continue
                    job['progress'] = (pct / 200.0) if f[0] == 'dlstatus' else (0.5 + pct / 200.0)
                    job['detail'] = ('Downloading' if f[0] == 'dlstatus' else 'Installing') + (f' {f[1]}' if f[1] and f[0] == 'pmstatus' else '…')
        p.wait()
        here = installed_packages()
        report['apps']['installed'] = sorted(x for x in ok if x in here)
        report['apps']['failed'] = sorted(x for x in ok if x not in here)
        if p.returncode != 0:
            _log('apt-get install failed:', ''.join(tail)[-2000:])
            run(['dpkg', '--configure', '-a'], timeout=1800, env=env)
            here = installed_packages()
            report['apps']['installed'] = sorted(x for x in ok if x in here)
            report['apps']['failed'] = sorted(x for x in ok if x not in here)

    def try_source(self, src, env):
        """Put one extra software source (and its keys) in place; keep it only if apt can read it."""
        written = []
        for path, b64 in (src.get('keys') or {}).items():
            if os.path.exists(path):
                continue
            os.makedirs(os.path.dirname(path), exist_ok=True)
            write_file(path, base64.b64decode(b64), 0o644)
            written.append(path)
        if not src.get('name'):
            return written
        path = os.path.join('/etc/apt/sources.list.d', src['name'])
        if os.path.exists(path):
            return written
        test = os.path.join(WORK, 'srctest')
        shutil.rmtree(test, ignore_errors=True)
        os.makedirs(test)
        write_file(os.path.join(test, src['name']), src['text'], 0o644)
        r = run(['apt-get', 'update', '-q', '-o', f'Dir::Etc::sourceparts={test}', '-o', 'Dir::Etc::sourcelist=/dev/null',
                 '-o', 'APT::Get::List-Cleanup=0'], timeout=300, env=env)
        shutil.rmtree(test, ignore_errors=True)
        bad = r.returncode != 0 or re.search(r'^(E:|W: (GPG error|Failed to fetch|The repository))', (r.stdout or '') + (r.stderr or ''), re.M)
        if bad:
            _log('software source not kept:', src['name'])
            for k in written:
                try:
                    os.unlink(k)
                except OSError:
                    pass
            return []
        write_file(path, src['text'], 0o644)
        _log('software source restored:', src['name'])
        return written + [path]

    # ---------------------------------------------------------- snaps
    def snapd(self, method, path, body=None, timeout=30):
        import http.client
        import socket as so

        class Conn(http.client.HTTPConnection):
            def connect(self):
                s = so.socket(so.AF_UNIX, so.SOCK_STREAM)
                s.settimeout(timeout)
                s.connect(SNAPD_SOCK)
                self.sock = s
        c = Conn('localhost', timeout=timeout)
        try:
            c.request(method, path, body=json.dumps(body) if body is not None else None,
                      headers={'Content-Type': 'application/json'} if body is not None else {})
            return json.loads(c.getresponse().read().decode('utf-8', 'replace') or '{}')
        finally:
            c.close()

    def snapd_up(self):
        try:
            return self.snapd('GET', '/v2/system-info', timeout=5).get('type') == 'sync'
        except Exception:  # noqa: BLE001
            return False

    def snap_change(self, reply, job, base, share):
        """Follow one snapd change to the end. Returns (ok, error kind or message)."""
        if reply.get('type') == 'error':
            r = reply.get('result') or {}
            return False, r.get('kind') or r.get('message') or 'refused'
        cid = reply.get('change')
        if reply.get('type') == 'sync' or not cid:
            return reply.get('type') == 'sync', None
        for _ in range(7200):
            ch = (self.snapd('GET', f'/v2/changes/{cid}') or {}).get('result') or {}
            tasks = ch.get('tasks') or []
            done = sum((t.get('progress') or {}).get('done', 0) for t in tasks)
            total = sum((t.get('progress') or {}).get('total', 0) for t in tasks) or 1
            job['progress'] = min(1.0, base + share * done / total)
            if ch.get('ready'):
                return ch.get('status') == 'Done', ch.get('err')
            time.sleep(0.5)
        return False, 'timed out'

    def restore_snaps(self, job, info, report):
        names = [n for n in info['snaps'] if SNAP_NAME.match(n)]
        if not names:
            return
        a = report['apps']
        if a.get('offline'):
            a['unavailable'] += [f'{n} (snap)' for n in names]
            return
        env = dict(os.environ, DEBIAN_FRONTEND='noninteractive', PATH='/usr/sbin:/usr/bin:/sbin:/bin', LC_ALL='C.UTF-8')
        job['phase'], job['progress'], job['detail'] = 'Setting up Snap…', None, ''
        if not os.path.exists('/usr/lib/snapd/snapd'):
            r = run(['apt-get', 'install', '-y', '-q', '--no-remove', 'snapd'], timeout=1800, env=env)
            if r.returncode != 0:
                a['unavailable'] += [f'{n} (snap)' for n in names]
                report['warnings'].append('Snap support couldn’t be set up, so snap apps weren’t reinstalled.')
                return
        run(['systemctl', 'start', 'snapd.socket', 'snapd.service'], timeout=120)
        for _ in range(120):
            if os.path.exists(SNAPD_SOCK) and self.snapd_up():
                break
            time.sleep(0.5)
        else:
            a['unavailable'] += [f'{n} (snap)' for n in names]
            report['warnings'].append('Snap support didn’t start, so snap apps weren’t reinstalled.')
            return
        run(['snap', 'wait', 'system', 'seed.loaded'], timeout=600)
        have = {s.get('name') for s in (self.snapd('GET', '/v2/snaps') or {}).get('result') or []}
        todo = [n for n in names if n not in have]
        for i, n in enumerate(todo):
            job['phase'] = f'Reinstalling snaps ({i + 1} of {len(todo)})…'
            job['detail'] = n
            ok, why = self.snap_change(self.snapd('POST', f'/v2/snaps/{n}', {'action': 'install'}), job, i / len(todo), 1 / len(todo))
            if not ok and why == 'snap-needs-classic':
                ok, why = self.snap_change(self.snapd('POST', f'/v2/snaps/{n}', {'action': 'install', 'classic': True}),
                                           job, i / len(todo), 1 / len(todo))
            if ok:
                a['installed'].append(f'{n} (snap)')
            elif why == 'snap-not-found':
                a['unavailable'].append(f'{n} (snap)')
            else:
                _log('snap', n, 'failed:', why)
                a['failed'].append(f'{n} (snap)')
        a['installed'] += [f'{n} (snap)' for n in names if n in have]

    def write_app_note(self, report):
        a = report['apps']
        missing = a['unavailable'] + a['failed']
        if not missing or not self.first_user:
            return
        pw = pwd.getpwnam(self.first_user)
        lines = ['Apps from your Time Turner backup that palOS couldn’t reinstall', '',
                 ('This computer wasn’t online during setup. ' if a['offline'] else '') +
                 'Look for them in the palOS Store, or download them again from their makers.', '']
        lines += [f'  {p}' for p in missing]
        if a['skipped']:
            lines += ['', 'Left out on purpose (they belong to the old computer’s hardware or desktop):', ''] + [f'  {p}' for p in a['skipped']]
        path = os.path.join(pw.pw_dir, 'Apps to Reinstall.txt')
        try:
            write_file(path, '\n'.join(lines) + '\n', 0o644, pw.pw_uid, pw.pw_gid)
            report['note'] = path
        except OSError as e:
            _log('app note:', e)

    # ---------------------------------------------------------- the end
    def cleanup(self):
        self.release()
        for f in (os.path.join(WORK, 'key'), os.path.join(WORK, 'smb-credentials')):
            try:
                os.unlink(f)
            except OSError:
                pass
        shutil.rmtree(CACHE, ignore_errors=True)
        shutil.rmtree('/home/.palos-restore', ignore_errors=True)


# ------------------------------------------------------------------ package helpers
def parse_ini(text):
    out, sec = {}, None
    for raw in text.splitlines():
        ln = raw.strip()
        if not ln or ln.startswith(('#', ';')):
            continue
        m = re.match(r'^\[(.+)\]$', ln)
        if m:
            sec = out.setdefault(m.group(1), {})
            continue
        if sec is not None and '=' in ln:
            k, v = ln.split('=', 1)
            sec[k.strip()] = v.strip()
    return out


def dpkg_paragraphs(text):
    for para in re.split(r'\n\s*\n', text):
        d = {}
        key = None
        for ln in para.splitlines():
            if ln.startswith((' ', '\t')) and key:
                continue
            if ':' in ln:
                key, v = ln.split(':', 1)
                d[key.strip()] = v.strip()
        if d:
            yield d


def manual_packages(status, extended):
    """Packages the old computer had installed on purpose (not pulled in as dependencies)."""
    auto = set()
    for d in dpkg_paragraphs(extended):
        if d.get('Auto-Installed') == '1' and d.get('Package'):
            auto.add((d['Package'], d.get('Architecture', '')))
    native = run(['dpkg', '--print-architecture']).stdout.strip() or 'amd64'
    out = set()
    for d in dpkg_paragraphs(status):
        name, arch = d.get('Package'), d.get('Architecture', '')
        if not name or d.get('Status', '').split()[-1:] != ['installed'] or arch not in (native, 'all'):
            continue
        if (name, arch) in auto or (name, native) in auto or (name, 'all') in auto:
            continue
        if d.get('Priority') in ('required', 'important') or d.get('Essential') == 'yes':
            continue
        out.add(name)
    return sorted(out)


def installed_packages():
    r = run(['dpkg-query', '-W', '-f', '${Package}\t${db:Status-Abbrev}\n'])
    return {ln.split('\t')[0] for ln in (r.stdout or '').splitlines() if '\t' in ln and ln.split('\t')[1].startswith('ii')}


def candidates(pkgs, env):
    """Which of these apt can install (has a candidate version for)."""
    have = set()
    for i in range(0, len(pkgs), 200):
        chunk = pkgs[i:i + 200]
        r = run(['apt-cache', 'policy'] + chunk, timeout=300, env=env)
        cur = None
        for ln in (r.stdout or '').splitlines():
            if ln and not ln.startswith(' ') and ln.endswith(':'):
                cur = ln[:-1]
            elif cur and ln.strip().startswith('Candidate:'):
                if ln.split(':', 1)[1].strip() != '(none)':
                    have.add(cur)
                cur = None
    return have


def simulate(pkgs, env):
    r = run(['apt-get', 'install', '-s', '-q'] + pkgs, timeout=600, env=env)
    if r.returncode != 0:
        return None
    inst = re.findall(r'^Inst (\S+)', r.stdout, re.M)
    remv = re.findall(r'^Remv (\S+)', r.stdout, re.M)
    return inst, remv


def plan(pkgs, env):
    """Split the wanted packages into the ones that install cleanly and the ones that would undo palOS
    (remove something, or pull in GNOME, snaps or another desktop)."""
    if not pkgs:
        return [], []
    sim = simulate(pkgs, env)
    if sim and not sim[1] and not any(DENY.match(p) for p in sim[0]):
        return pkgs, []
    ok, bad = [], []
    for p in pkgs:
        s = simulate(ok + [p], env)
        if s and not s[1] and not any(DENY.match(x) for x in s[0]):
            ok.append(p)
        else:
            bad.append(p)
    return ok, bad


def name_taken(name):
    try:
        pwd.getpwnam(name)
        return True
    except KeyError:
        pass
    try:
        grp.getgrnam(name)
        # a group of that name is fine only if it isn't a system group
        return grp.getgrnam(name).gr_gid < 1000
    except KeyError:
        return False


def uid_free(uid):
    try:
        pwd.getpwuid(uid)
        return False
    except KeyError:
        return True


def gid_free(gid):
    try:
        grp.getgrgid(gid)
        return False
    except KeyError:
        return True


def group_exists(g):
    try:
        grp.getgrnam(g)
        return True
    except KeyError:
        return False


def fmt_time(s):
    try:
        s = int(s)
    except (TypeError, ValueError):
        return ''
    if s < 90:
        return 'a minute'
    if s < 3600:
        return f'{round(s / 60)} minutes'
    h, m = divmod(round(s / 60), 60)
    return f'{h} hour{"s" if h != 1 else ""}' + (f' {m} min' if m else '')

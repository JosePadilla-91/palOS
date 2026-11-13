#!/usr/bin/python3
"""Gather palOS's own source from the built system image into the palOS repository tree.

  collect-source.py ROOT OUT

- system/: palOS's files (palOS packages, plus palOS pieces that were installed without a package), at their paths
- apps/<Name>/: each .app in /Applications, unpacked (its real source, not the packed bundle)
- external.json: every binary or large file left out (programs, libraries, big media), with size and checksum,
  so the build knows exactly what it has to build or fetch
"""
import glob, hashlib, json, os, shutil, struct, subprocess, sys

ROOT, OUT = sys.argv[1], sys.argv[2]
BIG = 5 * 1024 * 1024
external = []

# palOS pieces installed without a package (found by hand). Programs built from src/ (paladin-wm) aren't listed.
EXTRA = ['/usr/lib/kibble/runtime', '/usr/lib/kibble/kibble', '/usr/lib/kibble/media', '/usr/lib/time-turner',
         '/usr/lib/paladin-portal', '/usr/lib/paladin-appd', '/usr/bin/palos-open-app', '/usr/bin/winetricks',
         '/usr/lib/palos-winetricks', '/usr/share/palos', '/usr/lib/palos-l10n', '/usr/lib/python3/dist-packages/palos_l10n.py',
         '/usr/share/applications/palos-open-app.desktop',
         '/etc/dpkg/dpkg.cfg.d/palos-clean', '/etc/systemd/system/time-turnerd.service', '/etc/paladin-session',
         '/usr/lib/palos-utilities', '/usr/lib/palos-firstboot/arm', '/usr/lib/palos-firstboot/run-setup',
         '/usr/share/dbus-1/system-services/com.timeturner.Daemon.service', '/usr/local/share/applications']
SKIP_PARTS = ('/__pycache__/', '/node_modules/.cache/')
# private keys the build adds from palOS's private files: never into the repository
SECRETS = [(r'  google: \{\n    clientId: "[^"]*",\n    clientSecret: "[^"]*"\n  \},',
            "  // Google sign-in key: comes from /etc/paladin/oauth.json (the build adds it from palOS's private keys)\n  google: null,")]


def redact(top):
    import re
    for d, _, files in os.walk(top):
        for n in files:
            if not n.endswith(('.js', '.json', '.ts')):
                continue
            p = os.path.join(d, n)
            try:
                s = open(p, encoding='utf-8').read()
            except (OSError, UnicodeDecodeError):
                continue
            t = s
            for pat, rep in SECRETS:
                t = re.sub(pat, rep, t)
            if t != s:
                open(p, 'w', encoding='utf-8').write(t)


def is_elf(p):
    try:
        with open(p, 'rb') as f:
            return f.read(4) == b'\x7fELF'
    except OSError:
        return False


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


EXT_DIRS = ('/opt/palos-windows/wine', '/opt/palos-windows/prefix-template', '/node_modules', '/python-runtime', '/locales')
ELECTRON_FILES = ('.pak', 'icudtl.dat', 'snapshot_blob.bin', 'v8_context_snapshot.bin', 'LICENSES.chromium.html',
                  'LICENSE.electron.txt', 'vk_swiftshader_icd.json', 'chrome-sandbox')
ext_dirs = {}


def ext_dir(label):
    for d in EXT_DIRS:
        i = label.find(d + '/')
        if i >= 0:
            return label[:i + len(d)]
    return None


def take(src, dst, label):
    d = ext_dir(label)
    if d:
        if os.path.isfile(src) and not os.path.islink(src):
            e = ext_dirs.setdefault(d, {'path': d, 'size': 0, 'files': 0, 'kind': 'third-party folder'})
            e['size'] += os.path.getsize(src); e['files'] += 1
        return
    if src.endswith('.paladin-orig') or os.path.basename(src).endswith(ELECTRON_FILES):
        if os.path.isfile(src):
            external.append({'path': label, 'size': os.path.getsize(src), 'kind': 'Electron runtime file (goes with Electron)'})
        return
    if any(s in src for s in SKIP_PARTS) or src.endswith('.pyc'):
        return
    if os.path.islink(src):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.lexists(dst):
            os.remove(dst)
        os.symlink(os.readlink(src), dst)
        return
    if not os.path.isfile(src):
        return
    size = os.path.getsize(src)
    if is_elf(src) or size > BIG or src.endswith(('.node', '.so')) or '.so.' in os.path.basename(src):
        external.append({'path': label, 'size': size, 'sha256': sha(src), 'kind': 'program' if is_elf(src) else 'large file'})
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)


def take_tree(path):
    src = ROOT + path
    if os.path.isdir(src) and not os.path.islink(src):
        for dp, dns, fns in os.walk(src):
            dns[:] = [d for d in dns if d != '__pycache__']
            for n in fns:
                p = os.path.join(dp, n); rel = p[len(ROOT):]
                take(p, OUT + '/system' + rel, rel)
    else:
        take(src, OUT + '/system' + path, path)


# 1. palOS packages' files
pkgs = []
for lst in glob.glob(ROOT + '/var/lib/dpkg/info/*.list'):
    name = os.path.basename(lst)[:-5].split(':')[0]
    if name.startswith(('paladin', 'palos')):
        pkgs.append(name)
        for line in open(lst):
            p = line.rstrip('\n')
            if p and p != '/.' and (os.path.isfile(ROOT + p) or os.path.islink(ROOT + p)):
                take(ROOT + p, OUT + '/system' + p, p)
        for scr in ('preinst', 'postinst', 'prerm', 'postrm', 'triggers', 'conffiles'):
            f = f'{ROOT}/var/lib/dpkg/info/{os.path.basename(lst)[:-5]}.{scr}'
            if os.path.exists(f):
                take(f, f'{OUT}/packages/{name}/{scr}', f'package {name} {scr}')
# package descriptions (what each palOS package is and needs)
status = open(ROOT + '/var/lib/dpkg/status').read().split('\n\n')
for b in status:
    if b.startswith('Package: '):
        n = b.split('\n', 1)[0][9:]
        if n in pkgs:
            os.makedirs(f'{OUT}/packages/{n}', exist_ok=True)
            open(f'{OUT}/packages/{n}/control', 'w').write(b.strip() + '\n')

# 2. palOS pieces installed without a package
for p in EXTRA:
    take_tree(p)


# 3. apps: each .app unpacked to its source
def elf_end(p):
    h = open(p, 'rb').read(64); so, = struct.unpack_from('<Q', h, 0x28); se, sn = struct.unpack_from('<HH', h, 0x3A)
    return so + se * sn


ASAR = ROOT + '/usr/lib/kibble/runtime/node_modules/@electron/asar'
for app in sorted(glob.glob(ROOT + '/Applications/*.app') + glob.glob(ROOT + '/Applications/*/*.app')):
    name = os.path.basename(app)[:-4]
    folder = os.path.relpath(os.path.dirname(app), ROOT + '/Applications')
    tmp = f'/tmp/collect-app'
    shutil.rmtree(tmp, ignore_errors=True)
    subprocess.run(['unsquashfs', '-q', '-n', '-o', str(elf_end(app)), '-d', tmp, app], capture_output=True)
    dest = f'{OUT}/apps/{name}'
    shutil.rmtree(dest, ignore_errors=True)
    asar = os.path.join(tmp, 'resources', 'app.asar')
    if os.path.exists(asar):
        subprocess.run(['node', '-e', f"require('{ASAR}').extractAll('{asar}','{tmp}/source')"], capture_output=True)
        os.remove(asar)
        shutil.rmtree(asar + '.unpacked', ignore_errors=True)
    for dp, dns, fns in os.walk(tmp):
        dns[:] = [d for d in dns if d != '__pycache__']
        for n in fns:
            p = os.path.join(dp, n); rel = os.path.relpath(p, tmp)
            take(p, os.path.join(dest, rel), f'/Applications/{folder}/{name}.app/{rel}'.replace('/./', '/'))
    json.dump({'name': name, 'folder': folder}, open(dest + '/.palos-folder.json', 'w'))
    shutil.rmtree(tmp, ignore_errors=True)

external.extend(ext_dirs.values())
redact(OUT)
json.dump(sorted(external, key=lambda e: e['path']), open(OUT + '/external.json', 'w'), indent=1)
print('packages', len(pkgs), 'external', len(external))

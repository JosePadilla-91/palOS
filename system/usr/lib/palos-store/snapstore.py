"""palOS Store: the Snap Store (browsing, over HTTPS) and snapd (what's installed, over its socket).

Browsing needs no snapd at all, so snapd is only installed when someone installs their first snap.
Store responses follow the Snap Store's v2 API, the same one snapd itself uses:
  /v2/snaps/find   -> {"results": [{"name", "snap-id", "snap": {...}, "revision": {...}}]}
  /v2/snaps/info/N -> {"name", "snap-id", "snap": {...}, "channel-map": [{"channel": {...}, ...revision fields}]}
"""
import http.client
import json
import os
import re
import socket
import subprocess
import threading
import time
import urllib.parse
import urllib.request

API = os.environ.get('PALOS_SNAP_API', 'https://api.snapcraft.io')
SNAPD_SOCK = os.environ.get('PALOS_SNAPD_SOCKET', '/run/snapd.socket')
SNAP_DESKTOP = '/var/lib/snapd/desktop/applications'
FIELDS = 'title,summary,description,publisher,media,version,confinement,categories,license,website,contact,common-ids,download,type'
NAME_RE = re.compile(r'^[a-z0-9](?:-?[a-z0-9]){0,39}$')
TTL = 600

# snaps that are plumbing, not apps (they come along with apps; the Store never lists them)
PLUMBING = re.compile(r'^(core\d*|snapd|bare|gtk-common-themes|gnome-\d+-\d+.*|gnome-\d+-\d+|kde-frameworks-.*|kf\d+-.*|mesa-.*|gpu-.*|'
                      r'snapd-desktop-integration|prompting-client|desktop-security-center|firmware-updater|snap-store|wine-platform.*|'
                      r'cups|qt\d+.*-runtime.*|ffmpeg-\d+.*|.*-runtime|.*-platform|.*-themes)$')
APP_TYPES = {'app', None, ''}

# palOS Store categories -> Snap Store categories
CATEGORIES = {
    'AudioVideo': ['music-and-audio', 'photo-and-video', 'entertainment'],
    'Graphics': ['art-and-design'],
    'Office': ['productivity', 'finance', 'books-and-reference'],
    'Network': ['social', 'news-and-weather'],
    'Development': ['development'],
    'Game': ['games'],
    'Education': ['education'],
    'Science': ['science'],
    'Utility': ['utilities', 'personalisation', 'security'],
    'System': ['devices-and-iot', 'server-and-cloud'],
}

_arch = None


def arch():
    global _arch
    if _arch is None:
        try:
            _arch = subprocess.run(['dpkg', '--print-architecture'], capture_output=True, text=True, timeout=5).stdout.strip() or 'amd64'
        except (OSError, subprocess.TimeoutExpired):
            _arch = 'amd64'
    return _arch


class Unreachable(Exception):
    pass


# ------------------------------------------------------------------ the Snap Store (HTTPS)
_cache, _cache_lock = {}, threading.Lock()


def store_get(path, params):
    url = f'{API}{path}?{urllib.parse.urlencode(params)}'
    now = time.time()
    with _cache_lock:
        hit = _cache.get(url)
        if hit and now - hit[0] < TTL:
            return hit[1]
    req = urllib.request.Request(url, headers={'Snap-Device-Series': '16', 'Snap-Device-Architecture': arch(),
                                               'Accept': 'application/json', 'User-Agent': 'palOS-Store/1.1'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8', 'replace'))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            data = None
        else:
            raise Unreachable(f'The Snap Store answered {e.code}.') from e
    except (urllib.error.URLError, OSError, ValueError, http.client.HTTPException) as e:
        raise Unreachable('The Snap Store can’t be reached right now.') from e
    with _cache_lock:
        if len(_cache) > 300:
            _cache.clear()
        _cache[url] = (now, data)
    return data


def _media(snap, kind):
    return [m for m in (snap.get('media') or []) if m.get('type') == kind and str(m.get('url', '')).startswith('https://')]


def _icon(snap):
    icons = _media(snap, 'icon')
    return {'url': icons[0]['url']} if icons else None


def _merge(result):
    """A find result's 'revision' fields (version, confinement, size) on top of its 'snap' fields."""
    s = dict(result.get('snap') or {})
    for k, v in (result.get('revision') or {}).items():
        if v not in (None, '', [], {}):
            s[k] = v
    s['name'] = result.get('name') or s.get('name')
    return s


def publisher(s):
    p = s.get('publisher') or {}
    return {'name': p.get('display-name') or p.get('username') or '', 'verified': p.get('validation') in ('verified', 'starred')}


def card(s, installed):
    name = s['name']
    inst = installed.get(name)
    state = 'available'
    if inst:
        state = 'update' if inst.get('update') else 'installed'
    return {'id': 'snap:' + name, 'pkg': 'snap:' + name, 'snap': name, 'source': 'snap',
            'name': (inst or {}).get('title') or s.get('title') or name, 'summary': s.get('summary') or '',
            'icon': (inst or {}).get('icon') or _icon(s), 'state': state, 'core': False,
            'launch': (inst or {}).get('launch'), 'publisher': publisher(s), 'confinement': s.get('confinement') or 'strict',
            'commonIds': list(s.get('common-ids') or []), 'download': ((s.get('download') or {}).get('size') or 0)}


def usable(s):
    return (s.get('name') and NAME_RE.match(s['name']) and not PLUMBING.match(s['name'])
            and s.get('type') in APP_TYPES and s.get('confinement') in ('strict', 'classic', None))


def find(q=None, category=None, limit=40):
    params = {'fields': FIELDS, 'architecture': arch(), 'channel': 'stable', 'confinement': 'strict,classic'}
    if q:
        params['q'] = q
    if category:
        params['category'] = category
    data = store_get('/v2/snaps/find', params) or {}
    installed = local_snaps()
    out, seen = [], set()
    for r in data.get('results') or []:
        s = _merge(r)
        if not usable(s) or s['name'] in seen:
            continue
        seen.add(s['name'])
        out.append(card(s, installed))
        if len(out) >= limit:
            break
    return out


def search(q):
    return find(q=q) if q and len(q.strip()) >= 2 else []


def category(key, limit=40):
    out, seen = [], set()
    for cat in CATEGORIES.get(key, []):
        for c in find(category=cat, limit=limit):
            if c['snap'] not in seen:
                seen.add(c['snap'])
                out.append(c)
    return out[:limit]


def featured(limit=12):
    return find(category='featured', limit=limit)


def paragraphs(text):
    """Snap descriptions are plain text with blank-line paragraphs and '*' or '-' bullet lines."""
    blocks = []
    for para in re.split(r'\n\s*\n', (text or '').strip()):
        lines = [ln.strip() for ln in para.splitlines() if ln.strip()]
        if not lines:
            continue
        if all(re.match(r'^[*\-•]\s+', ln) for ln in lines):
            blocks.append({'ul': [re.sub(r'^[*\-•]\s+', '', ln) for ln in lines], 'ordered': False})
        else:
            blocks.append({'p': ' '.join(lines)})
    return blocks[:40]


def details(name):
    if not NAME_RE.match(name or ''):
        raise LookupError('That isn’t a snap name.')
    data = store_get(f'/v2/snaps/info/{name}', {'fields': FIELDS, 'architecture': arch()})
    if not data:
        raise LookupError('That app is no longer in the Snap Store.')
    s = dict(data.get('snap') or {})
    s['name'] = data.get('name') or name
    chans = data.get('channel-map') or []

    def rank(c):
        ch = c.get('channel') or {}
        return (ch.get('architecture') not in (arch(), None), ch.get('risk') != 'stable', ch.get('track') != 'latest')
    best = sorted(chans, key=rank)[0] if chans else {}
    for k in ('version', 'confinement', 'download'):
        if best.get(k):
            s[k] = best[k]
    installed = local_snaps()
    d = card(s, installed)
    inst = installed.get(name)
    d.update({
        'description': paragraphs(s.get('description')),
        'screenshots': [{'url': m['url'], 'caption': ''} for m in _media(s, 'screenshot')][:6],
        'developer': d['publisher']['name'],
        'license': s.get('license') or '',
        'homepage': s.get('website') or '',
        'version': (inst or {}).get('version') if inst and d['state'] == 'installed' else (s.get('version') or ''),
        'download': (s.get('download') or {}).get('size') or 0,
        'size': (inst or {}).get('size') or 0,
        'section': 'snap',
        'categories': [c.get('name') for c in s.get('categories') or [] if c.get('name')],
        'channel': ((best.get('channel') or {}).get('name') or 'stable'),
    })
    return d


# ------------------------------------------------------------------ snapd (local socket)
class _UnixHTTP(http.client.HTTPConnection):
    def __init__(self, path, timeout=8):
        super().__init__('localhost', timeout=timeout)
        self.sock_path = path

    def connect(self):
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.settimeout(self.timeout)
        s.connect(self.sock_path)
        self.sock = s


def snapd(method, path, body=None, timeout=8):
    """One request to snapd's REST API. Returns the decoded reply, or None when snapd isn't there."""
    if not os.path.exists(SNAPD_SOCK):
        return None
    c = _UnixHTTP(SNAPD_SOCK, timeout)
    try:
        c.request(method, path, body=json.dumps(body) if body is not None else None,
                  headers={'Content-Type': 'application/json'} if body is not None else {})
        r = c.getresponse()
        return json.loads(r.read().decode('utf-8', 'replace') or '{}')
    except (OSError, ValueError, http.client.HTTPException):
        return None
    finally:
        c.close()


def available():
    return os.path.exists('/usr/bin/snap') and os.path.exists(SNAPD_SOCK)


def _desktop(name, apps):
    """(desktop file name, icon path, title) for an installed snap's first app with a launcher."""
    for a in apps or []:
        f = a.get('desktop-file') or ''
        if not f:
            continue
        info = {}
        try:
            for ln in open(f, encoding='utf-8', errors='replace'):
                m = re.match(r'^(Name|Icon)=(.*)$', ln.strip())
                if m and m.group(1) not in info:
                    info[m.group(1)] = m.group(2).strip()
                if ln.startswith('[') and ln.strip() != '[Desktop Entry]' and info:
                    break
        except OSError:
            continue
        icon = info.get('Icon', '')
        return os.path.basename(f), ({'file': icon} if icon.startswith('/') and os.path.exists(icon) else ({'name': icon} if icon else None)), info.get('Name')
    return None, None, None


_local = {'t': 0, 'v': {}}


def local_snaps(fresh=False):
    """Installed app snaps: name -> {title, version, launch, icon, update, size, confinement, summary}."""
    if not fresh and time.time() - _local['t'] < 5:
        return _local['v']
    out = {}
    r = snapd('GET', '/v2/snaps')
    for s in (r or {}).get('result') or []:
        name = s.get('name')
        if not name or s.get('type') not in ('app', None) or PLUMBING.match(name):
            continue
        launch, icon, title = _desktop(name, s.get('apps'))
        out[name] = {'title': s.get('title') or title or name, 'version': s.get('version') or '', 'launch': launch, 'icon': icon,
                     'size': s.get('installed-size') or 0, 'confinement': s.get('confinement') or 'strict',
                     'summary': s.get('summary') or '', 'publisher': publisher(s), 'update': False}
    if out:
        ref = snapd('GET', '/v2/find?select=refresh', timeout=20)
        for s in (ref or {}).get('result') or []:
            if s.get('name') in out:
                out[s['name']]['update'] = s.get('version') or True
    _local.update(t=time.time(), v=out)
    return out


def installed_cards():
    cards = []
    for name, i in local_snaps(fresh=True).items():
        cards.append({'id': 'snap:' + name, 'pkg': 'snap:' + name, 'snap': name, 'source': 'snap', 'name': i['title'],
                      'summary': i['summary'], 'icon': i['icon'], 'state': 'update' if i['update'] else 'installed',
                      'core': False, 'launch': i['launch'], 'publisher': i['publisher'], 'confinement': i['confinement']})
    return cards


def updates():
    items = []
    for name, i in local_snaps(fresh=True).items():
        if i['update']:
            items.append({'pkg': 'snap:' + name, 'snap': name, 'from': i['version'], 'to': i['update'] if isinstance(i['update'], str) else '',
                          'new': False, 'security': False, 'size': 0,
                          'app': {'id': 'snap:' + name, 'name': i['title'], 'icon': i['icon'], 'snap': name}})
    return items


def state(pkgs):
    inst = local_snaps(fresh=True)
    out = {}
    for p in pkgs:
        n = p[5:]
        out[p] = ('update' if inst[n]['update'] else 'installed') if n in inst else 'available'
    return out


def plan(name):
    """What installing a snap involves, for the confirmation."""
    d = details(name)
    return {'ok': True, 'snap': name, 'classic': d['confinement'] == 'classic', 'needsSnapd': not available(),
            'download': d['download'], 'publisher': d['publisher']}

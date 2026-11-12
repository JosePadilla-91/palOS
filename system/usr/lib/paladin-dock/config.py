"""Paladin Dock settings: distro defaults in /etc, per-user changes in ~/.config."""
import copy
import json
import os

SYS_CFG = '/etc/paladin-dock/config.json'
USER_CFG = os.path.join(os.path.expanduser('~'), '.config', 'paladin-dock', 'config.json')

DEFAULTS = {
    'position': 'bottom',            # 'bottom' or 'left'
    'icon_size': 56,                 # resting icon size (px)
    'magnify': True,
    'magnify_size': 104,             # largest size under the pointer
    'autohide': False,
    'minimize_effect': 'magic_lamp', # 'magic_lamp' or 'scale' (Compiz); 'scale' is shown as Shrink Effect
    'compiz_effect': '',             # the effect Compiz was last given
    'minimize_into_app': False,      # False = classic: minimized windows get their own tile
    'animate_launch': True,          # bounce while an app starts
    'live_reflections': False,       # (no longer used: the glass reflects only the Dock's own items)
    # Each app entry may list alternatives separated by '|'; the first one installed is used.
    'apps': [
        'paladin-seeker|org.gnome.Nautilus|nemo|thunar|pcmanfm|caja',
        'palos-firefox|firefox|firefox_firefox|firefox-esr|org.gnome.Epiphany|chromium_chromium|chromium|google-chrome',
        'paladin-mail',
        'paladin-calendar',
        'discette',
        'palos-store',
        'palos-notes',
        'chancery-writer',
        'chancery-presentation',
        'chancery-sheets',
        'composer',
        'cutting-floor',
        'vid-view',
        'time-turner',
        'paladin-settings|org.gnome.Settings',
    ],
    'stacks': [
        {'path': '~/Downloads', 'sort': 'date_added', 'view': 'auto', 'display': 'stack'},
        {'path': '~/Documents', 'sort': 'name', 'view': 'auto', 'display': 'stack'},
    ],
}

LIMITS = {'icon_size': (24, 128), 'magnify_size': (24, 192)}


def _read(path):
    try:
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


class Config:
    def __init__(self):
        self.data = copy.deepcopy(DEFAULTS)
        self.data.update(_read(SYS_CFG))
        self.data.update(_read(USER_CFG))
        self._listeners = []
        self._clamp()
        self._migrate()

    def _migrate(self):
        """Paladin 1: GNOME's Files and Settings in a saved dock become Seeker and Paladin Settings."""
        user = _read(USER_CFG)
        if not user.get('apps') or user.get('paladin_migrated', 0) >= 1:
            return
        swap = {'org.gnome.Settings': 'paladin-settings|org.gnome.Settings',
                'org.gnome.Nautilus': 'paladin-seeker|org.gnome.Nautilus'}
        apps = []
        for a in user['apps']:
            first = a.split('|')[0]
            apps.append(swap.get(first, a) if not a.startswith('paladin-') else a)
        self.data['apps'] = apps
        self.data['paladin_migrated'] = 1
        try:
            self.save()
        except OSError:
            pass

    def _clamp(self):
        for key, (lo, hi) in LIMITS.items():
            try:
                self.data[key] = int(max(lo, min(hi, int(self.data[key]))))
            except (TypeError, ValueError):
                self.data[key] = DEFAULTS[key]
        if self.data.get('position') not in ('bottom', 'left'):
            self.data['position'] = 'bottom'
        self.data['magnify_size'] = max(self.data['magnify_size'], self.data['icon_size'])

    def __getitem__(self, key):
        return self.data.get(key, DEFAULTS.get(key))

    def connect(self, fn):
        self._listeners.append(fn)

    def set(self, save=True, **changes):
        self.data.update(changes)
        self._clamp()
        if save:
            self.save()
        for fn in list(self._listeners):
            fn(set(changes))

    def save(self):
        os.makedirs(os.path.dirname(USER_CFG), exist_ok=True)
        tmp = USER_CFG + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2)
        os.replace(tmp, USER_CFG)

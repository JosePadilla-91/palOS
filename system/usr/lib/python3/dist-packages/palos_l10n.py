"""palOS translations for Python programs (the Dock, Screenshot, setup tools...).

    import palos_l10n
    _ = palos_l10n.tr                # _('Remove from Dock') -> 'Retirer du Dock' in French
    palos_l10n.install_gtk()         # after importing Gtk: menus, labels, buttons and dialogs translate themselves

Uses the same dictionary as the palOS apps (/usr/share/palos/l10n/fr-CA.json). In English it does nothing."""
import json
import os
import re

DIR = '/usr/share/palos/l10n'
_exact = None
_pats = []


def lang():
    v = os.environ.get('PALOS_LANG') or os.environ.get('LANGUAGE') or os.environ.get('LC_ALL') or os.environ.get('LC_MESSAGES') or os.environ.get('LANG') or ''
    return 'fr-CA' if v.lower().startswith('fr') else 'en-CA'


def _load():
    global _exact
    if _exact is not None:
        return
    _exact = {}
    if lang() == 'en-CA':
        return
    try:
        data = json.load(open(os.path.join(DIR, lang() + '.json'), encoding='utf-8'))
    except (OSError, ValueError):
        return
    for k, v in (data.get('strings') or {}).items():
        if not isinstance(v, str) or not v or k.startswith('_'):
            continue
        if '{}' in k:
            raw = k.split('{}')
            parts = [re.escape(p) for p in raw]
            quoted = [bool(re.search(r'[“"\'‘«(]\s*$', raw[i]) or re.match(r'^\s*[”"\'’»)]', raw[i + 1])) for i in range(len(raw) - 1)]
            _pats.append((re.compile('^' + '(.+?)'.join(parts) + '$', re.S), v, len(k), quoted))
        else:
            _exact[k] = v
    _pats.sort(key=lambda p: -p[2])


_FUNCTION_WORDS = re.compile(r'\b(the|a|an|of|on|in|to|for|with|and|or|every|all|this|that|these|those|your|my|our|is|are|was|were|be|it|its|from|by|at|as|into|onto|each|any|some|no|not|here|there|when|while|then|than|more|less|new|page|pages|equal|left|right|top|bottom)\b', re.I)


def _english_left(v):
    s = (v or '').strip()
    if not s or not re.search(r'[A-Za-z]{2}', s) or s in _exact:
        return False
    if re.fullmatch(r'[\d.,\s]+(%|[KMGT]?B|bytes)?', s) or re.fullmatch(r'[\w.+-]+\.[A-Za-z0-9]{1,6}', s) or s.startswith(('/', '~')):
        return False
    return bool(_FUNCTION_WORDS.search(s) or re.search(r'(^|[\s(])[a-z]{3,}([\s,.;:)!?]|$)', s))


def _lookup(t):
    if t in _exact:
        return _exact[t]
    for rx, out, _n, quoted in _pats:
        m = rx.match(t)
        if not m:
            continue
        vals = list(m.groups())
        # never half a sentence: a placeholder holding English it can't translate means the pattern doesn't fit
        if any(not quoted[i] and _english_left(v) for i, v in enumerate(vals)):
            continue
        idx = iter(range(len(vals)))

        def put(mm):
            i = int(mm.group(1)) - 1 if mm.group(1) else next(idx)
            v = vals[i] if 0 <= i < len(vals) else ''
            return _exact.get(v.strip(), v)
        return re.sub(r'\{(\d*)\}', put, out)
    return None


def tr(s):
    """The text in the person's language (or the text itself)."""
    if not isinstance(s, str) or not s.strip():
        return s
    _load()
    if not _exact and not _pats:
        return s
    t = s.strip()
    r = _lookup(t)
    if r is None:
        m = re.match(r'^(.*?)(…|\.\.\.|:)$', t, re.S)
        if m and m.group(1):
            b = _lookup(m.group(1))
            if b is not None:
                r = b + (' :' if m.group(2) == ':' else '…')
    if r is None and '_' in t and not t.startswith('_'):          # GTK mnemonics: "_Open"
        b = _lookup(t.replace('_', '', 1))
        if b is not None:
            r = b
    if r is None and t.isupper() and len(t) > 1:
        b = _lookup(t.capitalize()) or _lookup(t.title())
        if b is not None:
            r = b.upper()
    return s if r is None else s.replace(t, r)


def install_gtk():
    """Translate GTK labels, menus, buttons, titles, tooltips and message boxes as they're made."""
    if lang() == 'en-CA':
        return
    try:
        import gi
        from gi.repository import Gtk
    except Exception:  # noqa: BLE001
        return
    if getattr(Gtk, '_palos_l10n', False):
        return
    Gtk._palos_l10n = True
    try:
        if Gtk.get_major_version() >= 4:
            return _install_gtk4(Gtk)
    except AttributeError:
        pass

    def wrap_init(cls, keys=('label', 'title', 'text', 'secondary_text', 'tooltip_text')):
        orig = cls.__init__

        def init(self, *a, **k):
            for key in keys:
                if key in k and isinstance(k[key], str):
                    k[key] = tr(k[key])
            return orig(self, *a, **k)
        cls.__init__ = init

    for name in ('Label', 'Button', 'CheckButton', 'ToggleButton', 'MenuItem', 'CheckMenuItem', 'ImageMenuItem', 'Frame', 'Window', 'Dialog', 'MessageDialog', 'Expander', 'LinkButton'):
        c = getattr(Gtk, name, None)
        if c is not None and '__init__' in c.__dict__ or (c is not None and name in ('Label', 'MenuItem')):
            try:
                wrap_init(c)
            except (TypeError, AttributeError):
                pass

    def wrap_method(cls, meth, argi=0):
        orig = getattr(cls, meth, None)
        if orig is None:
            return

        def f(self, *a, **k):
            a = list(a)
            if len(a) > argi and isinstance(a[argi], str):
                a[argi] = tr(a[argi])
            return orig(self, *a, **k)
        setattr(cls, meth, f)

    for cls, meth, i in ((Gtk.Label, 'set_text', 0), (Gtk.Label, 'set_label', 0), (Gtk.Label, 'set_markup', 0), (Gtk.Button, 'set_label', 0),
                         (Gtk.MenuItem, 'set_label', 0), (Gtk.Window, 'set_title', 0), (Gtk.Widget, 'set_tooltip_text', 0),
                         (Gtk.MessageDialog, 'format_secondary_text', 0), (Gtk.MessageDialog, 'set_markup', 0), (Gtk.Dialog, 'add_button', 0),
                         (Gtk.ComboBoxText, 'append', 1), (Gtk.ComboBoxText, 'append_text', 0), (Gtk.Notebook, 'set_tab_label_text', 1)):
        try:
            wrap_method(cls, meth, i)
        except (TypeError, AttributeError):
            pass
    try:
        orig_ab = Gtk.Dialog.add_buttons

        def add_buttons(self, *a):
            a = [tr(x) if isinstance(x, str) else x for x in a]
            return orig_ab(self, *a)
        Gtk.Dialog.add_buttons = add_buttons
    except AttributeError:
        pass
    # constructors that aren't __init__
    for cls, meth in ((Gtk.RadioMenuItem, 'new_with_label_from_widget'), (Gtk.RadioMenuItem, 'new_with_label'), (Gtk.RadioButton, 'new_with_label'),
                      (Gtk.RadioButton, 'new_with_label_from_widget'), (Gtk.MenuItem, 'new_with_label'), (Gtk.MenuItem, 'new_with_mnemonic'),
                      (Gtk.Button, 'new_with_label'), (Gtk.Button, 'new_with_mnemonic'), (Gtk.CheckButton, 'new_with_label'), (Gtk.Label, 'new')):
        orig = getattr(cls, meth, None)
        if orig is None:
            continue

        def make(orig):
            def f(*a):
                a = [tr(x) if isinstance(x, str) else x for x in a]
                return orig(*a)
            return staticmethod(f)
        try:
            setattr(cls, meth, make(orig))
        except (TypeError, AttributeError):
            pass
    # message boxes made the old way: Gtk.MessageDialog(parent, flags, type, buttons, text)
    try:
        md_init = Gtk.MessageDialog.__init__

        def md(self, *a, **k):
            a = list(a)
            if len(a) >= 5 and isinstance(a[4], str):
                a[4] = tr(a[4])
            return md_init(self, *a, **k)
        Gtk.MessageDialog.__init__ = md
    except AttributeError:
        pass


def _install_gtk4(Gtk):
    """GTK 4 and libadwaita (Install Assistant and other newer apps): the same, for their widgets."""
    try:
        from gi.repository import Adw
    except Exception:  # noqa: BLE001
        Adw = None
    keys = ('label', 'title', 'text', 'tooltip_text', 'subtitle', 'description', 'heading', 'body', 'button_label',
            'comments', 'placeholder_text', 'name')

    def wrap_init(cls):
        orig = cls.__init__

        def init(self, *a, **k):
            for key in keys:
                if key in k and isinstance(k[key], str):
                    k[key] = tr(k[key])
            return orig(self, *a, **k)
        try:
            cls.__init__ = init
        except (TypeError, AttributeError):
            pass

    def wrap_method(cls, meth, argi=0):
        orig = getattr(cls, meth, None)
        if orig is None:
            return

        def f(self, *a, **k):
            a = list(a)
            if len(a) > argi and isinstance(a[argi], str):
                a[argi] = tr(a[argi])
            return orig(self, *a, **k)
        try:
            setattr(cls, meth, f)
        except (TypeError, AttributeError):
            pass

    gtk = ['Label', 'Button', 'CheckButton', 'ToggleButton', 'Window', 'ApplicationWindow', 'Expander', 'LinkButton', 'FileDialog',
           'FileFilter', 'MenuButton', 'Frame', 'SearchEntry', 'Entry']
    adw = ['ActionRow', 'ExpanderRow', 'PreferencesGroup', 'PreferencesPage', 'PreferencesRow', 'AlertDialog', 'MessageDialog', 'Banner',
           'Toast', 'StatusPage', 'WindowTitle', 'AboutWindow', 'AboutDialog', 'ApplicationWindow', 'SwitchRow', 'EntryRow', 'ComboRow',
           'ButtonContent', 'SplitButton']
    for name in gtk:
        c = getattr(Gtk, name, None)
        if c is not None:
            wrap_init(c)
    for name in adw if Adw else []:
        c = getattr(Adw, name, None)
        if c is not None:
            wrap_init(c)
    for cls, meth, i in ((getattr(Gtk, 'Label', None), 'set_text', 0), (getattr(Gtk, 'Label', None), 'set_label', 0),
                         (getattr(Gtk, 'Label', None), 'set_markup', 0), (getattr(Gtk, 'Button', None), 'set_label', 0),
                         (getattr(Gtk, 'Window', None), 'set_title', 0), (getattr(Gtk, 'Widget', None), 'set_tooltip_text', 0),
                         (getattr(Gtk, 'ProgressBar', None), 'set_text', 0)):
        if cls is not None:
            wrap_method(cls, meth, i)
    if Adw:
        for cls, meth, i in ((getattr(Adw, 'AlertDialog', None), 'add_response', 1), (getattr(Adw, 'AlertDialog', None), 'set_body', 0),
                             (getattr(Adw, 'AlertDialog', None), 'set_heading', 0), (getattr(Adw, 'MessageDialog', None), 'add_response', 1),
                             (getattr(Adw, 'PreferencesRow', None), 'set_title', 0), (getattr(Adw, 'ActionRow', None), 'set_subtitle', 0),
                             (getattr(Adw, 'StatusPage', None), 'set_title', 0), (getattr(Adw, 'StatusPage', None), 'set_description', 0),
                             (getattr(Adw, 'Banner', None), 'set_title', 0), (getattr(Adw, 'Toast', None), 'set_title', 0),
                             (getattr(Adw, 'WindowTitle', None), 'set_title', 0), (getattr(Adw, 'WindowTitle', None), 'set_subtitle', 0)):
            if cls is not None:
                wrap_method(cls, meth, i)

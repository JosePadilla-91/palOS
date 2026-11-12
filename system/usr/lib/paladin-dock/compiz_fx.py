"""Magic Lamp: the minimize effect itself is drawn by the window manager. paladin-wm draws it by itself (it
reads minimize_effect from the Dock's config.json); under Compiz the dock sets it up here. Either way
dock.update_icon_geometry tells the window manager where each window should pour into."""

EFFECTS = {
    'magic_lamp': ('animation:Magic Lamp', 450),
    'scale': ('animation:Zoom', 260),
}
NEEDED = ('composite', 'opengl', 'animation')


def wm_name():
    """The window manager's name (EWMH _NET_SUPPORTING_WM_CHECK), lower case, or ''."""
    try:
        from Xlib import X
        from Xlib import display as xdisplay
        d = xdisplay.Display()
        try:
            root = d.screen().root
            check = root.get_full_property(d.intern_atom('_NET_SUPPORTING_WM_CHECK'), X.AnyPropertyType)
            if not check or not len(check.value):
                return ''
            wm = d.create_resource_object('window', int(check.value[0]))
            name = wm.get_full_property(d.intern_atom('_NET_WM_NAME'), d.intern_atom('UTF8_STRING'))
            text = name.value if name else b''
            if isinstance(text, bytes):
                text = text.decode('utf-8', 'replace')
            return text.lower()
        finally:
            d.close()
    except Exception:  # noqa: BLE001
        return ''


def compiz_running():
    return 'compiz' in wm_name()


def paladin_running():
    return wm_name().startswith('paladin')


def _context():
    try:
        import compizconfig
    except ImportError:
        return None
    try:
        return compizconfig.Context()
    except Exception:  # noqa: BLE001
        return None


def available():
    """Can the minimize effect be chosen? paladin-wm (all of them), or Compiz with its settings library."""
    return paladin_running() or (compiz_running() and _context() is not None)


def set_minimize_effect(effect):
    """Switch the minimize/unminimize animation. paladin-wm reads it from the Dock's config.json by itself;
    under Compiz it's set here. Returns True if it took effect."""
    if paladin_running():
        return True
    ctx = _context()
    if ctx is None:
        return False
    name, duration = EFFECTS.get(effect, EFFECTS['magic_lamp'])
    try:
        for plugin in NEEDED:
            p = ctx.Plugins.get(plugin)
            if p is not None and not p.Enabled:
                p.Enabled = True
        anim = ctx.Plugins['animation'].Screen
        anim['minimize_effects'].Value = [name]
        anim['minimize_durations'].Value = [duration]
        anim['minimize_matches'].Value = ['(type=Normal | Dialog | ModalDialog | Unknown)']
        anim['unminimize_effects'].Value = [name]
        anim['unminimize_durations'].Value = [duration]
        anim['unminimize_matches'].Value = ['(type=Normal | Dialog | ModalDialog | Unknown)']
        ctx.Write()
        return True
    except Exception:  # noqa: BLE001
        return False

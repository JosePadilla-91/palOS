#!/usr/bin/python3
"""Paladin Dock — a classic-style dock for X11."""
import faulthandler
import fcntl
import os
import signal
import sys
import time
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import gi  # noqa: E402
gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Gdk, GLib, Gtk  # noqa: E402
try:  # palOS: this program in the person's language
    import palos_l10n; palos_l10n.install_gtk(); _ = palos_l10n.tr
except Exception:  # noqa: BLE001
    _ = str


def single_instance():
    runtime = os.environ.get('XDG_RUNTIME_DIR') or os.path.expanduser('~/.cache')
    os.makedirs(runtime, exist_ok=True)
    display = (os.environ.get('DISPLAY') or ':0').replace(':', '_').replace('/', '_')
    lock = open(os.path.join(runtime, 'paladin-dock%s.lock' % display), 'w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print('Paladin Dock is already running.', file=sys.stderr)
        sys.exit(0)
    return lock


EXIT_NO_DISPLAY = 3   # the launcher does not restart the dock for this


def _log_exception(kind, value, tb):
    """Errors inside callbacks are logged with a time stamp; the dock keeps running."""
    sys.stderr.write('%s Python error:\n' % time.strftime('%Y-%m-%d %H:%M:%S'))
    traceback.print_exception(kind, value, tb, file=sys.stderr)
    sys.stderr.flush()


def _release_memory():
    """Hand freed memory back to the system once a minute (window pictures briefly need big buffers)."""
    try:
        import ctypes
        ctypes.CDLL('libc.so.6').malloc_trim(0)
    except (OSError, AttributeError):
        return False
    return True


def _debug_report(dock):
    """PALADIN_DOCK_DEBUG=1: log internal counts every 10 s to help track down problems."""
    try:
        rss = open('/proc/self/status').read().split('VmRSS:')[1].split()[0]
    except OSError:
        rss = '?'
    tops = Gtk.Window.list_toplevels()
    kinds = {}
    for w in tops:
        kinds[type(w).__name__] = kinds.get(type(w).__name__, 0) + 1
    sys.stderr.write('%s debug: rss=%skB toplevels=%s items=%d icons=%d thumbs=%d windows=%d\n' % (
        time.strftime('%H:%M:%S'), rss, kinds, len(dock.items), len(dock.icons.cache),
        len(dock.windows.thumbs), len(dock.windows.info)))
    if os.environ.get('PALADIN_DOCK_DEBUG') == '2':
        import gc
        import tracemalloc
        gc.collect()
        snap = tracemalloc.take_snapshot()
        prev = getattr(_debug_report, 'snap', None)
        if prev is not None:
            for stat in snap.compare_to(prev, 'lineno')[:6]:
                sys.stderr.write('   %s\n' % stat)
        _debug_report.snap = snap
        sys.stderr.write('   gc objects=%d\n' % len(gc.get_objects()))
    sys.stderr.flush()
    return True


def _name_process():
    """The Dock's process is called dock, so Terminal's "killall dock" stops it (the only way to)."""
    try:
        import ctypes
        ctypes.CDLL('libc.so.6').prctl(15, b'dock', 0, 0, 0)   # PR_SET_NAME
    except (OSError, AttributeError):
        pass


def main():
    _name_process()
    faulthandler.enable()          # a hard crash still leaves a trace in the log
    sys.excepthook = _log_exception
    if not os.environ.get('DISPLAY'):
        print('Paladin Dock needs an X11 session.', file=sys.stderr)
        return EXIT_NO_DISPLAY
    Gdk.set_allowed_backends('x11')
    _lock = single_instance()  # noqa: F841 - held for the life of the process
    ok, _argv = Gtk.init_check(sys.argv)
    if not ok or Gdk.Display.get_default() is None:
        print('Paladin Dock: cannot open display %s' % os.environ.get('DISPLAY'), file=sys.stderr)
        return EXIT_NO_DISPLAY

    import compiz_fx
    from config import Config
    from dock import Dock

    cfg = Config()
    # Paladin Settings changes the effect by editing the config and restarting the dock, so the choice
    # has to reach Compiz at every start, not only the first one.
    if (not cfg['compiz_configured'] or cfg['compiz_effect'] != cfg['minimize_effect']) and compiz_fx.available():
        if compiz_fx.set_minimize_effect(cfg['minimize_effect']):
            cfg.set(compiz_configured=True, compiz_effect=cfg['minimize_effect'])

    dock = Dock(cfg)
    dock.show_all()
    GLib.timeout_add_seconds(60, _release_memory)
    if os.environ.get('PALADIN_DOCK_DEBUG'):
        if os.environ.get('PALADIN_DOCK_DEBUG') == '2':
            import tracemalloc
            tracemalloc.start(8)
        GLib.timeout_add_seconds(10, _debug_report, dock)
    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, sig, Gtk.main_quit)
    Gtk.main()
    return 0


if __name__ == '__main__':
    sys.exit(main())

"""Apps, windows, removable volumes and Trash — everything the dock tracks on the system."""
import os
import shutil
import sys
import time

import gi
gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Gdk, Gio, GLib, Gtk  # noqa: E402

HOME = os.path.expanduser('~')
OWN_PID = os.getpid()
# programs that only ever show dialogs on behalf of another app: their windows never get a Dock icon
HELPER_CLASSES = ('xdg-desktop-portal', 'palos sheets', 'paladin-portal')
HELPER_EXES = ('xdg-desktop-portal',)
# apps that were renamed: a Dock that still lists the old name shows the app under its new one
RENAMED = {'palos-porpoise': 'palos-firefox', 'palos-nave': 'palos-firefox'}   # palOS's browser, then and now
SKIP_EXE = {'sh', 'bash', 'env', 'flatpak', 'snap', 'python3', 'python', 'java', 'gjs', 'electron'}


def _exe_of_pid(pid):
    if not pid:
        return ''
    try:
        with open(f'/proc/{pid}/cmdline', 'rb') as f:
            argv0 = f.read().split(b'\0')[0].decode(errors='ignore')
        return os.path.basename(argv0).lower()
    except OSError:
        return ''


def _keys_for(info):
    """Lower-case names an app's windows are likely to carry in WM_CLASS."""
    app_id = info.get_id()[:-8].lower() if info.get_id() else ''
    keys = {app_id, app_id.split('.')[-1]}
    wm = info.get_startup_wm_class()
    if wm:
        keys.add(wm.lower())
    exe = os.path.basename(info.get_executable() or '').lower()
    if exe and exe not in SKIP_EXE:
        keys.add(exe)
    return {k for k in keys if len(k) > 1}


def _hit(cls, key):
    return cls == key or cls.startswith(key + '.') or cls.endswith('.' + key)


def launch_context():
    ctx = Gdk.Display.get_default().get_app_launch_context()
    ctx.set_timestamp(Gtk.get_current_event_time())
    return ctx


def open_uri(uri):
    try:
        Gio.AppInfo.launch_default_for_uri(uri, launch_context())
        return True
    except GLib.Error:
        return False


def open_path(path):
    return open_uri(Gio.File.new_for_path(path).get_uri())


class App:
    """A launchable application (one .desktop file)."""

    def __init__(self, info):
        self.info = info
        self.id = info.get_id()[:-8]
        self.name = info.get_display_name() or info.get_name() or self.id
        self.gicon = info.get_icon() or Gio.ThemedIcon.new('application-x-executable')
        self.keys = _keys_for(info)
        self.exe = os.path.basename(info.get_executable() or '').lower()

    def launch(self, files=()):
        # Start the app exactly the way Seeker's Applications folder does (its own command line, a plain
        # child process in the home folder, without the Dock's GTK settings in its environment). Some apps
        # started fine from Applications but not from the Dock, which went through GIO's launcher instead.
        if self._spawn(files):
            return True
        uris = [Gio.File.new_for_path(p).get_uri() for p in files]
        try:
            if uris and not (self.info.supports_uris() or self.info.supports_files()):
                uris = []
            self.info.launch_uris(uris, launch_context())
            return True
        except GLib.Error:
            return False

    def _spawn(self, files=()):
        import subprocess
        exec_line = self.info.get_string('Exec') or ''
        if not exec_line or self.info.get_boolean('Terminal') or self.info.get_boolean('DBusActivatable'):
            return False
        try:
            ok, args = GLib.shell_parse_argv(exec_line)
        except GLib.Error:
            return False
        if not ok or not args:
            return False
        uris = [Gio.File.new_for_path(p).get_uri() for p in files]
        out = []
        for a in args:
            if a in ('%f', '%u'):
                if files:
                    out.append(files[0] if a == '%f' else uris[0])
                continue
            if a in ('%F', '%U'):
                out.extend(files if a == '%F' else uris)
                continue
            if a == '%i':
                icon = self.info.get_string('Icon')
                if icon:
                    out += ['--icon', icon]
                continue
            if a in ('%c', '%k'):
                out.append(self.name if a == '%c' else (self.info.get_filename() or ''))
                continue
            if len(a) == 2 and a.startswith('%'):
                continue
            out.append(a.replace('%%', '%'))
        if not out:
            return False
        env = dict(os.environ)
        for k in ('GDK_BACKEND', 'GTK_MODULES', 'DESKTOP_STARTUP_ID', 'PYTHONPATH', 'PYTHONHOME'):
            env.pop(k, None)
        f = self.info.get_filename() or ''
        env['BAMF_DESKTOP_FILE_HINT'] = f
        env['GIO_LAUNCHED_DESKTOP_FILE'] = f
        env['GIO_LAUNCHED_DESKTOP_FILE_PID'] = str(os.getpid())
        try:
            ctx = launch_context()
            sid = ctx.get_startup_notify_id(self.info, [Gio.File.new_for_path(p) for p in files]) if self.info.get_startup_notify() else None
            if sid:
                env['DESKTOP_STARTUP_ID'] = sid
        except Exception:  # noqa: BLE001
            pass
        cwd = self.info.get_string('Path') or HOME
        try:
            subprocess.Popen(out, cwd=cwd if os.path.isdir(cwd) else HOME, env=env, start_new_session=True,
                             stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        except OSError:
            return False


class AppIndex:
    """Finds .desktop entries by id and by window class."""

    def __init__(self):
        self._by_key = None
        self._cache = {}
        monitor = Gio.AppInfoMonitor.get()
        monitor.connect('changed', lambda *_: self.reset())
        self._monitor = monitor  # keep alive

    def reset(self):
        self._by_key = None
        self._cache.clear()

    def app(self, spec):
        """spec may list alternatives: 'org.gnome.Nautilus|nemo|thunar'."""
        for app_id in spec.split('|'):
            app_id = RENAMED.get(app_id.strip(), app_id.strip())
            if not app_id:
                continue
            if app_id not in self._cache:
                info = None
                try:
                    info = Gio.DesktopAppInfo.new(app_id + '.desktop')
                except TypeError:
                    info = None
                self._cache[app_id] = App(info) if info else None
            if self._cache[app_id]:
                return self._cache[app_id]
        return None

    def _index(self):
        if self._by_key is None:
            self._by_key = {}
            infos = [i for i in Gio.AppInfo.get_all() if isinstance(i, Gio.DesktopAppInfo) and i.get_id()]
            # Hidden entries first so visible ones win any clash.
            for info in sorted(infos, key=lambda i: i.should_show()):
                for k in _keys_for(info):
                    self._by_key[k] = info.get_id()[:-8]
        return self._by_key

    def for_window(self, cls_names, exe):
        best = ''
        for key in self._index():
            if len(key) > len(best) and (any(_hit(c, key) for c in cls_names) or key == exe):
                best = key
        return self.app(self._index()[best]) if best else None


class WinInfo:
    """A plain copy of what the dock needs to know about one window."""
    __slots__ = ('xid', 'name', 'minimized', 'attention', 'cls', 'pid')

    def __init__(self, xid, name, minimized, attention, cls, pid):
        self.xid, self.name, self.minimized, self.attention, self.cls, self.pid = \
            xid, name, minimized, attention, cls, pid


def _now_ts():
    return Gtk.get_current_event_time() or 0


class Windows:
    """Tracks top-level windows through the standard window-manager protocol (EWMH),
    on a private X connection. Windows are only ever referred to by X id, and every X error
    (a window closing mid-request, for example) is an ordinary Python exception, so a
    window disappearing can never take the dock down."""

    WANTED_TYPES = ('_NET_WM_WINDOW_TYPE_NORMAL', '_NET_WM_WINDOW_TYPE_DIALOG', '_NET_WM_WINDOW_TYPE_UTILITY')
    WATCH = ('_NET_WM_STATE', '_NET_WM_NAME', 'WM_NAME', 'WM_HINTS', 'WM_STATE', 'WM_CLASS')

    def __init__(self, index, on_change):
        self.index = index
        self.on_change = on_change
        self.by_app = {}          # app id -> [xid]
        self.info = {}            # xid -> WinInfo
        self.apps = {}            # app id -> App (includes unpinned running apps)
        self.pinned = []          # [App] in dock order
        self.thumbs = {}          # xid -> cairo surface
        self._pending = False
        self._selected = set()    # windows we asked for property events on
        self._min_order = {}
        self._active = None
        self.d = None
        try:
            from Xlib import X
            from Xlib import display as xdisplay
            self.X = X
            self.d = xdisplay.Display()
            self.d.set_error_handler(lambda *_a: None)   # async errors: window already gone
            self.root = self.d.screen().root
            self.root.change_attributes(event_mask=X.PropertyChangeMask)
            self.d.flush()
            self.A = {n: self.d.intern_atom(n) for n in (
                '_NET_CLIENT_LIST', '_NET_CLIENT_LIST_STACKING', '_NET_ACTIVE_WINDOW', '_NET_WM_STATE',
                '_NET_WM_STATE_HIDDEN', '_NET_WM_STATE_SKIP_TASKBAR', '_NET_WM_STATE_DEMANDS_ATTENTION',
                '_NET_WM_WINDOW_TYPE', '_NET_WM_PID', '_NET_WM_NAME', 'UTF8_STRING', 'WM_NAME', 'WM_HINTS',
                'WM_STATE', 'WM_CLASS', 'WM_CHANGE_STATE', '_NET_CLOSE_WINDOW', '_NET_WM_ICON_GEOMETRY', '_PALADIN_SHEET',
                *self.WANTED_TYPES)}
            self._watch_atoms = {self.A[n] for n in self.WATCH}
            GLib.io_add_watch(self.d.fileno(), GLib.PRIORITY_DEFAULT, GLib.IOCondition.IN, self._on_x)
            GLib.timeout_add_seconds(4, self._snapshot_current)
            self._schedule()
        except Exception as e:  # noqa: BLE001
            sys.stderr.write('Paladin Dock: window tracking unavailable (%s)\n' % e)
            self.d = None

    def available(self):
        return self.d is not None

    def set_pinned(self, apps):
        if [a.id for a in apps] == [a.id for a in self.pinned]:
            return
        self.pinned = apps
        self._schedule()

    def _schedule(self):
        if not self._pending and self.d is not None:
            self._pending = True
            GLib.idle_add(self._rebuild)

    # ---------------------------------------------------------------- X events
    def _on_x(self, _fd, _cond):
        try:
            while self.d.pending_events():
                ev = self.d.next_event()
                if ev.type != self.X.PropertyNotify:
                    continue
                if ev.window.id == self.root.id:
                    if ev.atom == self.A['_NET_ACTIVE_WINDOW']:
                        self._on_active_changed()
                    elif ev.atom in (self.A['_NET_CLIENT_LIST'], self.A['_NET_CLIENT_LIST_STACKING']):
                        self._schedule()
                elif ev.atom in self._watch_atoms:
                    if ev.atom == self.A['_NET_WM_STATE'] or ev.atom == self.A['WM_STATE']:
                        GLib.idle_add(self._note_state, ev.window.id)
                    self._schedule()
        except Exception:  # noqa: BLE001
            pass
        return True

    def _note_state(self, xid):
        if self._is_minimized_now(xid):
            self._min_order.setdefault(xid, time.monotonic())
        return False

    # ---------------------------------------------------------------- reading windows
    def _prop(self, win, name, kind=None):
        p = win.get_full_property(self.A[name], kind if kind is not None else self.X.AnyPropertyType)
        return p.value if p is not None else None

    def _client_list(self, stacking=False):
        v = self._prop(self.root, '_NET_CLIENT_LIST_STACKING' if stacking else '_NET_CLIENT_LIST')
        return list(v) if v is not None else []

    def _is_minimized_now(self, xid):
        try:
            win = self.d.create_resource_object('window', xid)
            st = self._prop(win, '_NET_WM_STATE') or []
            if self.A['_NET_WM_STATE_HIDDEN'] in st:
                return True
            ws = self._prop(win, 'WM_STATE')
            return bool(ws is not None and len(ws) and ws[0] == 3)
        except Exception:  # noqa: BLE001
            return False

    def _read(self, xid):
        """Everything about one window, or None if it should not appear (or is gone)."""
        try:
            win = self.d.create_resource_object('window', xid)
            pidv = self._prop(win, '_NET_WM_PID')
            pid = int(pidv[0]) if pidv is not None and len(pidv) else 0
            if pid == OWN_PID:
                return None
            types = self._prop(win, '_NET_WM_WINDOW_TYPE')
            if types is not None and len(types) and not any(self.A[t] in types for t in self.WANTED_TYPES):
                return None
            state = list(self._prop(win, '_NET_WM_STATE') or [])
            if self.A['_NET_WM_STATE_SKIP_TASKBAR'] in state:
                return None
            # a sheet belongs to its window's app, never an icon of its own (paladin-sheets marks them; the
            # mark can arrive after the window does, so it's checked on every rebuild)
            if self._prop(win, '_PALADIN_SHEET') is not None:
                return None
            # the desktop's helper programs (portals and the like) draw dialogs for other apps
            cls0 = [c.lower() for c in (win.get_wm_class() or ()) if c]
            if any(c.startswith(HELPER_CLASSES) for c in cls0) or _exe_of_pid(pid).startswith(HELPER_EXES):
                return None
            minimized = self.A['_NET_WM_STATE_HIDDEN'] in state
            if not minimized:
                ws = self._prop(win, 'WM_STATE')
                minimized = bool(ws is not None and len(ws) and ws[0] == 3)
            attention = self.A['_NET_WM_STATE_DEMANDS_ATTENTION'] in state
            hints = win.get_wm_hints()
            if hints is not None and hints.flags & 256:     # XUrgencyHint
                attention = True
            name = self._prop(win, '_NET_WM_NAME', self.A['UTF8_STRING'])
            if name is None:
                name = self._prop(win, 'WM_NAME')
            if isinstance(name, bytes):
                name = name.decode('utf-8', 'replace')
            cls = win.get_wm_class() or ()
            if xid not in self._selected:
                win.change_attributes(event_mask=self.X.PropertyChangeMask)
                self._selected.add(xid)
            return WinInfo(xid, name or '', minimized, attention, [c.lower() for c in cls if c], pid)
        except Exception:  # noqa: BLE001 - window vanished while we looked at it
            return None

    def _rebuild(self):
        self._pending = False
        if self.d is None:
            return False
        try:
            clients = self._client_list()
        except Exception:  # noqa: BLE001
            clients = []
        by_app, apps, info = {}, {}, {}
        for xid in clients:
            wi = self._read(xid)
            if wi is None:
                continue
            exe = _exe_of_pid(wi.pid)
            owner = next((a for a in self.pinned
                          if any(_hit(c, k) for c in wi.cls for k in a.keys) or (a.exe and a.exe == exe)), None)
            if owner is None:
                owner = self.index.for_window(wi.cls, exe)
            if owner is None:
                continue
            info[xid] = wi
            apps[owner.id] = owner
            by_app.setdefault(owner.id, []).append(xid)
        try:
            self.d.flush()
        except Exception:  # noqa: BLE001
            pass
        self.by_app, self.apps, self.info = by_app, apps, info
        live = set(info)
        self._selected &= set(clients)
        self.thumbs = {x: p for x, p in self.thumbs.items() if x in live}
        for x in list(self._min_order):
            if x not in live or not info[x].minimized:
                self._min_order.pop(x, None)
        for x, i in info.items():
            if i.minimized:
                self._min_order.setdefault(x, time.monotonic())
        self.on_change()
        return False

    # ---------------------------------------------------------------- queries
    def wins(self, app_id):
        return self.by_app.get(app_id, [])

    def name(self, xid):
        i = self.info.get(xid)
        return i.name if i else ''

    def is_minimized(self, xid):
        i = self.info.get(xid)
        return bool(i and i.minimized)

    def attention(self, app_id):
        return any(self.info[x].attention for x in self.wins(app_id) if x in self.info)

    def app_of(self, xid):
        for app_id, xs in self.by_app.items():
            if xid in xs:
                return self.apps.get(app_id)
        return None

    def minimized(self):
        """Minimized windows (xids) in the order they were minimized (oldest first)."""
        out = [x for xs in self.by_app.values() for x in xs if self.is_minimized(x)]
        return sorted(out, key=lambda x: self._min_order.get(x, 0))

    def active(self):
        try:
            v = self._prop(self.root, '_NET_ACTIVE_WINDOW')
            return int(v[0]) if v is not None and len(v) and v[0] else None
        except Exception:  # noqa: BLE001
            return None

    # ---------------------------------------------------------------- actions (EWMH client messages)
    def _send(self, xid, atom, data):
        if self.d is None:
            return
        try:
            from Xlib.protocol import event
            win = self.d.create_resource_object('window', xid)
            ev = event.ClientMessage(window=win, client_type=self.A[atom], data=(32, (list(data) + [0] * 5)[:5]))
            self.root.send_event(ev, event_mask=self.X.SubstructureRedirectMask | self.X.SubstructureNotifyMask)
            self.d.flush()
        except Exception:  # noqa: BLE001
            pass

    def _activate(self, xid):
        self._send(xid, '_NET_ACTIVE_WINDOW', [2, _now_ts(), 0])   # 2 = request from a pager/dock

    def activate_app(self, app_id):
        """Classic behaviour: bring all of the app's windows forward; if already in front, cycle."""
        xs = self.wins(app_id)
        if not xs:
            return False
        visible = [x for x in xs if not self.is_minimized(x)]
        if not visible:
            self._activate(xs[-1])           # also un-minimizes
            return True
        try:
            stack = [x for x in self._client_list(stacking=True) if x in visible]   # bottom to top
        except Exception:  # noqa: BLE001
            stack = visible
        if self.active() in visible and len(stack) > 1:
            self._activate(stack[0])         # cycle: bottom-most of this app to the front
            return True
        for x in stack:
            self._activate(x)
        return True

    def restore(self, xid):
        self._activate(xid)

    def close(self, xid):
        self._send(xid, '_NET_CLOSE_WINDOW', [_now_ts(), 2])

    def minimize(self, xid):
        self._send(xid, 'WM_CHANGE_STATE', [3])         # IconicState

    def hide_app(self, app_id):
        for x in self.wins(app_id):
            self.snapshot(x)
            self.minimize(x)

    def quit_app(self, app_id):
        for x in self.wins(app_id):
            self.close(x)

    def set_icon_geometry(self, xid, x, y, w, h):
        """Where Compiz's Magic Lamp should pour this window into."""
        if self.d is None:
            return
        try:
            win = self.d.create_resource_object('window', xid)
            win.change_property(self.A['_NET_WM_ICON_GEOMETRY'], self.d.intern_atom('CARDINAL'), 32,
                                [int(x), int(y), int(w), int(h)])
            self.d.flush()
        except Exception:  # noqa: BLE001
            pass

    # ---------------------------------------------------------------- thumbnails
    def snapshot(self, xid):
        """Picture of a window for its minimized tile (taken while it is still on screen)."""
        if self.d is None or xid is None or self.is_minimized(xid):
            return
        try:
            import cairo
            win = self.d.create_resource_object('window', xid)
            if win.get_attributes().map_state != self.X.IsViewable:
                return
            g = win.get_geometry()
            w, h = g.width, g.height
            if w < 8 or h < 8 or g.depth not in (24, 32):
                return
            img = win.get_image(0, 0, w, h, self.X.ZPixmap, 0xffffffff)
            data = img.data if isinstance(img.data, (bytes, bytearray)) else bytes(img.data, 'latin-1')
            stride = cairo.ImageSurface.format_stride_for_width(cairo.FORMAT_RGB24, w)
            if len(data) < stride * h:
                return
            src = cairo.ImageSurface.create_for_data(bytearray(data), cairo.FORMAT_RGB24, w, h, stride)
            sc = min(1.0, 256 / max(w, h))
            dst = cairo.ImageSurface(cairo.FORMAT_RGB24, max(1, int(w * sc)), max(1, int(h * sc)))
            cr = cairo.Context(dst)
            cr.scale(sc, sc)
            cr.set_source_surface(src, 0, 0)
            cr.get_source().set_filter(cairo.FILTER_GOOD)
            cr.paint()
            self.thumbs[xid] = dst
        except Exception:  # noqa: BLE001 - window gone or unreadable: no picture
            pass

    def _on_active_changed(self):
        old = self._active
        self._active = self.active()
        if old is not None and old in self.info:
            self.snapshot(old)
        GLib.timeout_add(400, self._snapshot_current_once)

    def _snapshot_current_once(self):
        self._snapshot_current()
        return False

    def _snapshot_current(self):
        if self._active in self.info:
            self.snapshot(self._active)
        return True


class Volumes:
    """User-visible removable mounts (USB sticks, SD cards, discs)."""

    def __init__(self, on_change):
        self.monitor = Gio.VolumeMonitor.get()
        for sig in ('mount-added', 'mount-removed', 'mount-changed'):
            self.monitor.connect(sig, lambda *_: on_change())

    def mounts(self):
        out = []
        for m in self.monitor.get_mounts():
            try:
                root = m.get_root()
                path = root.get_path() if root else None
                if m.is_shadowed() or not path or path == '/':
                    continue
                if not (path.startswith('/media/') or path.startswith('/run/media/') or m.can_eject()):
                    continue
                out.append(m)
            except GLib.Error:
                continue
        return out

    @staticmethod
    def key(mount):
        return mount.get_root().get_path()

    @staticmethod
    def eject(mount, done=None):
        op = Gtk.MountOperation()
        flags = Gio.MountUnmountFlags.NONE
        cb = (lambda m, res: Volumes._finish(m, res, done))
        if mount.can_eject():
            mount.eject_with_operation(flags, op, None, cb)
        else:
            mount.unmount_with_operation(flags, op, None, cb)

    @staticmethod
    def _finish(mount, res, done):
        try:
            if mount.can_eject():
                mount.eject_with_operation_finish(res)
            else:
                mount.unmount_with_operation_finish(res)
        except GLib.Error:
            pass
        if done:
            done()


class Trash:
    """The user's Trash (freedesktop.org spec), watched for changes."""

    def __init__(self, on_change):
        self.root = os.path.join(HOME, '.local', 'share', 'Trash')
        self.files = os.path.join(self.root, 'files')
        os.makedirs(self.files, exist_ok=True)
        os.makedirs(os.path.join(self.root, 'info'), exist_ok=True)
        self._mon = Gio.File.new_for_path(self.files).monitor_directory(Gio.FileMonitorFlags.NONE, None)
        self._mon.connect('changed', lambda *_: on_change())

    def full(self):
        try:
            return any(True for _ in os.scandir(self.files))
        except OSError:
            return False

    @staticmethod
    def sound(name='trash'):
        """'trash' when something goes in the Trash, 'empty' when the Trash is emptied"""
        try:
            import subprocess
            subprocess.Popen(['palos-sound', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        except OSError:
            pass

    def put(self, paths):
        done = False
        util = os.path.realpath(os.path.join(os.environ.get('XDG_DATA_HOME') or os.path.expanduser('~/.local/share'), 'palos', 'Utilities'))
        for p in paths:
            if os.path.realpath(p) == util:      # the Utilities folder is never thrown away
                continue
            try:
                Gio.File.new_for_path(p).trash(None)
                done = True
            except GLib.Error:
                pass
        if done:
            self.sound()

    def empty(self):
        for sub in ('files', 'info', 'expunged'):
            d = os.path.join(self.root, sub)
            try:
                entries = list(os.scandir(d))
            except OSError:
                continue
            for e in entries:
                try:
                    if e.is_dir(follow_symlinks=False):
                        shutil.rmtree(e.path)
                    else:
                        os.unlink(e.path)
                except OSError:
                    pass
        try:
            os.unlink(os.path.join(self.root, 'directorysizes'))
        except OSError:
            pass
        self.sound('empty')

    def open(self):
        if not open_uri('trash:///'):
            open_path(self.files)

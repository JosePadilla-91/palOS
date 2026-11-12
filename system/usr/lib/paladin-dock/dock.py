"""The Paladin Dock window: layout, animation, input, drag and drop, menus."""
import math
import os
import shutil
import subprocess
import time

import cairo
import gi
gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Gdk, Gio, GLib, Gtk  # noqa: E402

import compiz_fx
import mirror
import render as R
import stacks
from system import AppIndex, Trash, Volumes, Windows, open_path

try:
    from Xlib import Xatom
    from Xlib import display as xdisplay
except ImportError:  # struts are optional
    xdisplay = None

GAP = 4
DRAG_THRESHOLD = 6
LABEL_ROOM = 40
EDGE_FRACTION = 0.05   # each end of the screen keeps this much free of the dock (96 px on a 1920 px screen)
ICON_DROP = 9          # bottom dock: icons sit this many px lower on the glass (size unchanged)
MIN_FIT = 6            # smallest icon size the dock shrinks to when it is full (fits ~95 items on a side dock)


def _now():
    return time.monotonic()


def _approach(cur, target, dt, speed):
    if abs(target - cur) < 0.002:
        return target
    return cur + (target - cur) * (1 - math.exp(-dt * speed))


# ======================================================================= items
class Item:
    kind = 'item'
    removable = False      # can be dragged off the dock (poof)
    draggable = True

    def __init__(self, key):
        self.key = key
        self.appear = 0.0          # 0..1 slot width while appearing/leaving
        self.leaving = False
        self.ghost = False         # hidden while being dragged
        self.bounce_t0 = None      # launch bounce start
        self.launching = False
        self.rect = None           # (x, y, size) of the drawn icon this frame
        self.slot = None           # (start, length) along the dock axis

    def name(self):
        return ''


class AppItem(Item):
    kind = 'app'

    def __init__(self, app, pinned):
        super().__init__('app:' + app.id)
        self.app = app
        self.pinned = pinned

    @property
    def removable(self):
        return self.pinned

    def name(self):
        return self.app.name


class SepItem(Item):
    kind = 'sep'
    draggable = False

    def __init__(self):
        super().__init__('sep')


class StackItem(Item):
    kind = 'stack'
    removable = True

    def __init__(self, stack):
        super().__init__('stack:' + stack.path)
        self.stack = stack

    def name(self):
        return self.stack.name


class WinItem(Item):
    kind = 'win'
    draggable = False

    def __init__(self, xid, app, name=''):
        super().__init__('win:%d' % xid)
        self.xid = xid
        self.app = app
        self.title = name

    def name(self):
        return self.title or (self.app.name if self.app else '')


class VolItem(Item):
    kind = 'vol'

    def __init__(self, mount):
        super().__init__('vol:' + Volumes.key(mount))
        self.mount = mount

    def name(self):
        return self.mount.get_name()


class TrashItem(Item):
    kind = 'trash'
    draggable = False

    def __init__(self):
        super().__init__('trash')

    def name(self):
        return 'Trash'


class GapItem(Item):
    """An empty slot that opens up while something is dragged over the dock."""
    kind = 'gap'
    draggable = False

    def __init__(self):
        super().__init__('gap')


# ======================================================================= helper windows
class FloatWindow(Gtk.Window):
    """A small transparent popup used for the dragged icon and the poof."""

    def __init__(self, size, painter):
        super().__init__(type=Gtk.WindowType.POPUP)
        self.size = size
        self.painter = painter
        self.set_app_paintable(True)
        visual = self.get_screen().get_rgba_visual()
        if visual:
            self.set_visual(visual)
        self.set_default_size(size, size)
        self.resize(size, size)
        self.connect('draw', self._draw)
        self.input_shape_combine_region(cairo.Region(cairo.RectangleInt(0, 0, 0, 0)))

    def _draw(self, _w, cr):
        cr.set_operator(cairo.OPERATOR_SOURCE)
        cr.set_source_rgba(0, 0, 0, 0)
        cr.paint()
        cr.set_operator(cairo.OPERATOR_OVER)
        self.painter(cr, self.size)
        return True

    def place(self, cx, cy):
        self.move(int(cx - self.size / 2), int(cy - self.size / 2))


# ======================================================================= dock
class Dock(Gtk.Window):
    def __init__(self, cfg):
        super().__init__(type=Gtk.WindowType.TOPLEVEL)
        self.cfg = cfg
        self.icons = R.Icons()
        self.icons.listeners.append(self.queue_draw)
        self.items = []
        self.mouse = None          # pointer position along the dock axis (None = away)
        self.last_mouse = None
        self.mag = 0.0             # 0..1 magnification blend
        self.hide = 1.0 if cfg['autohide'] else 0.0
        self.hover = None
        self.press = None          # (item, x, y) of a pending click/drag
        self.drag = None           # internal icon drag state
        self.resize_drag = None    # separator drag to resize
        self.ext = None            # external (file manager) drag state
        self.popup = None          # open stack popup
        self.ptr = None            # last pointer position inside the dock window
        self.menu_open = False
        self.poofs = []
        self.frame = None
        self._tick_id = None
        self._last_t = None
        self._input_key = None
        self._icon_geo = {}
        self._hide_timer = None
        self._xdisplay = None

        self.set_title('Dock')
        self.set_wmclass('paladin-dock', 'Paladin-dock')
        self.set_type_hint(Gdk.WindowTypeHint.DOCK)
        self.set_decorated(False)
        self.set_skip_taskbar_hint(True)
        self.set_skip_pager_hint(True)
        self.set_keep_above(True)
        self.set_accept_focus(False)
        self.set_resizable(False)
        self.stick()
        self.set_app_paintable(True)
        screen = self.get_screen()
        visual = screen.get_rgba_visual()
        if visual:
            self.set_visual(visual)
        self.opaque = not screen.is_composited()
        screen.connect('composited-changed', self._on_composited)
        screen.connect('monitors-changed', lambda *_: self.place())
        screen.connect('size-changed', lambda *_: self.place())

        self.add_events(Gdk.EventMask.POINTER_MOTION_MASK | Gdk.EventMask.BUTTON_PRESS_MASK |
                        Gdk.EventMask.BUTTON_RELEASE_MASK | Gdk.EventMask.LEAVE_NOTIFY_MASK |
                        Gdk.EventMask.ENTER_NOTIFY_MASK | Gdk.EventMask.SCROLL_MASK)
        self.connect('draw', self._on_draw)
        self.connect('motion-notify-event', self._on_motion)
        self.connect('leave-notify-event', self._on_leave)
        self.connect('enter-notify-event', self._on_enter)
        self.connect('button-press-event', self._on_press)
        self.connect('button-release-event', self._on_release)
        self.connect('realize', lambda *_: GLib.idle_add(self._after_realize))

        # external drag and drop (files and folders from the file manager)
        self.drag_dest_set(0, [], Gdk.DragAction.COPY | Gdk.DragAction.MOVE | Gdk.DragAction.LINK)
        self.drag_dest_add_uri_targets()
        self.connect('drag-motion', self._on_drag_motion)
        self.connect('drag-leave', self._on_drag_leave)
        self.connect('drag-drop', self._on_drag_drop)
        self.connect('drag-data-received', self._on_drag_data)

        # system state
        self.index = AppIndex()
        self.windows = Windows(self.index, self.sync)
        self.volumes = Volumes(self.sync)
        self.trash = Trash(self.sync)
        self.stacks = {}
        cfg.connect(self._on_config)
        # live reflections on the glass (the desktop and the windows near the Dock)
        # palOS 27 build 13: the glass reflects only what's on the shelf (live window reflections made the Dock flicker)
        self.mirror = None
        self.sync()
        self.place()
        if cfg['autohide']:
            self.hide = 1.0

    # ------------------------------------------------------------------ geometry
    @property
    def bottom(self):
        return self.cfg['position'] == 'bottom'

    def monitor_geometry(self):
        display = self.get_display()
        mon = display.get_primary_monitor() or display.get_monitor(0)
        return mon.get_geometry()

    def axis_length(self):
        g = self.monitor_geometry()
        return g.width if self.bottom else g.height

    def edge_margin(self):
        """The strip at each end of the screen (left/right, or top/bottom for a side dock) the dock never enters."""
        return round(self.axis_length() * EDGE_FRACTION)

    def dock_ends(self, base):
        """How far the drawn dock (glass, shadow and click area) reaches past its first and last icon."""
        if not self.bottom:
            return 14                               # panel runs 10 px past the icons, its shadow 4 more
        shelf_h = max(21, round(base * 0.75))
        inset = 0 if self.opaque else round((shelf_h - 4) * 0.9)
        return round(base * 0.28) + inset + 6       # padding + slanted end + shadow/click margin

    def _slot_weights(self, rest):
        """(icon slots in units of one icon, total gap length) for the current items; mirrors compute()."""
        units, gaps = 0.0, 0.0
        items = self.items
        for n, it in enumerate(items):
            a = 1.0 if rest else it.appear
            if not (rest and (it.leaving or it.kind == 'gap')):
                units += (0.42 if it.kind == 'sep' else 1.0) * a
            if n < len(items) - 1:
                gaps += GAP * (1.0 if rest else min(1.0, it.appear))
        return units, gaps

    def fit_base(self, rest=False, want=None):
        """The icon size to draw at: the chosen size, or smaller when that would cross into the edge margins."""
        want = float(self.cfg['icon_size'] if want is None else want)
        avail = self.axis_length() - 2 * self.edge_margin()
        units, gaps = self._slot_weights(rest)

        def fits(b):
            return b * units + gaps + 2 * self.dock_ends(b) <= avail

        if units <= 0 or fits(want):
            return want
        lo, hi = float(MIN_FIT), want
        if not fits(lo):
            return lo
        for _ in range(22):
            mid = (lo + hi) / 2
            if fits(mid):
                lo = mid
            else:
                hi = mid
        return lo

    def metrics(self, rest=False):
        base = self.fit_base(rest)
        maxs = max(base, self.cfg['magnify_size']) if self.cfg['magnify'] else base
        shelf_h = max(21, round(base * 0.75))      # the glass shelf: three quarters of an icon tall
        return base, maxs, shelf_h

    def place(self):
        g = self.monitor_geometry()
        # The window is sized for the chosen icon size; a dock shrunk to fit only ever needs less.
        base = self.cfg['icon_size']
        maxs = max(base, self.cfg['magnify_size']) if self.cfg['magnify'] else base
        shelf_h = max(21, round(base * 0.75))
        tall = max(maxs, base * 1.6) + 12
        if self.bottom:
            w, h = g.width, int(tall + shelf_h * 0.6 + LABEL_ROOM)
            x, y = g.x, g.y + g.height - h
        else:
            w, h = int(tall + 16 + 300), g.height
            x, y = g.x, g.y
        self.set_size_request(w, h)
        self.resize(w, h)
        self.move(x, y)
        self.win_origin = (x, y)
        self.win_size = (w, h)
        self._input_key = None
        self.apply_struts()
        self.kick()

    def _after_realize(self):
        self.icons.scale = self.get_scale_factor()
        self.place()
        return False

    def do_realize(self):
        Gtk.Window.do_realize(self)
        # Until the first layout, accept no clicks at all: never a big invisible click-catcher.
        self.input_shape_combine_region(cairo.Region())

    def apply_struts(self):
        gdkwin = self.get_window()
        if gdkwin is None or xdisplay is None:
            return
        try:
            if self._xdisplay is None:
                self._xdisplay = xdisplay.Display()
            d = self._xdisplay
            xw = d.create_resource_object('window', gdkwin.get_xid())
            g = self.monitor_geometry()
            base, _, shelf_h = self.metrics(rest=True)
            self._strut_base = round(base)
            display = self.get_display()
            root_h = max(m.get_geometry().y + m.get_geometry().height
                         for m in (display.get_monitor(i) for i in range(display.get_n_monitors())))
            if self.cfg['autohide']:
                vals = [0] * 12
            elif self.bottom:
                reserve = int(base + shelf_h * 0.6 + 4) - ICON_DROP   # same 4 px clearance above the lowered icons
                vals = [0, 0, 0, (root_h - (g.y + g.height)) + reserve, 0, 0, 0, 0, 0, 0, g.x, g.x + g.width - 1]
            else:
                vals = [g.x + base + 22, 0, 0, 0, g.y, g.y + g.height - 1, 0, 0, 0, 0, 0, 0]
            xw.change_property(d.intern_atom('_NET_WM_STRUT_PARTIAL'), Xatom.CARDINAL, 32, vals)
            xw.change_property(d.intern_atom('_NET_WM_STRUT'), Xatom.CARDINAL, 32, vals[:4])
            d.flush()
        except Exception:  # noqa: BLE001
            pass

    def check_struts(self):
        """Re-reserve screen space when the dock shrank or grew to fit (only when the size really changed)."""
        if getattr(self, '_strut_base', None) != round(self.fit_base(rest=True)):
            self.apply_struts()
        return False

    def _on_composited(self, screen):
        self.opaque = not screen.is_composited()
        self._input_key = None
        if not self.opaque:
            self.shape_combine_region(None)
        self.kick()

    def _on_config(self, changed):
        if changed & {'position', 'icon_size', 'magnify_size', 'magnify', 'autohide'}:
            if 'autohide' in changed:
                self.hide = 0.0
            self.place()
        if 'live_reflections' in changed:
            if False:
                pass
            elif not self.cfg['live_reflections'] and self.mirror is not None:
                self.mirror.stop()
                self.mirror = None
            self.queue_draw()
        if 'minimize_effect' in changed:
            if compiz_fx.set_minimize_effect(self.cfg['minimize_effect']):
                self.cfg.set(compiz_effect=self.cfg['minimize_effect'])
        self._icon_geo.clear()
        self.sync()

    # ------------------------------------------------------------------ items
    def stack_for(self, spec):
        path = os.path.expanduser(spec['path'])
        st = self.stacks.get(path)
        if st is None:
            st = stacks.Stack(spec, self.sync)
            self.stacks[path] = st
        else:
            st.update_spec(spec)
        return st

    def desired_items(self, keep):
        """The dock's contents, in order. `keep` maps keys to existing Item objects."""
        def reuse(item):
            old = keep.get(item.key)
            if old is not None and not old.leaving and type(old) is type(item):
                for attr in ('app', 'pinned', 'stack', 'xid', 'title', 'mount'):
                    if hasattr(item, attr):
                        setattr(old, attr, getattr(item, attr))
                return old
            return item

        out = []
        pinned = []
        seen = set()
        for spec in self.cfg['apps']:
            app = self.index.app(spec)
            if app and app.id not in seen:
                seen.add(app.id)
                pinned.append(app)
                out.append(reuse(AppItem(app, True)))
        self.windows.set_pinned(pinned)
        for app_id, app in self.windows.apps.items():
            if app_id not in seen:
                seen.add(app_id)
                out.append(reuse(AppItem(app, False)))
        out.append(reuse(SepItem()))
        live_paths = set()
        for spec in self.cfg['stacks']:
            st = self.stack_for(spec)
            live_paths.add(st.path)
            out.append(reuse(StackItem(st)))
        for p in list(self.stacks):
            if p not in live_paths:
                self.stacks.pop(p).close()
        if not self.cfg['minimize_into_app']:
            for xid in self.windows.minimized():
                out.append(reuse(WinItem(xid, self.windows.app_of(xid), self.windows.name(xid))))
        for m in self.volumes.mounts():
            out.append(reuse(VolItem(m)))
        out.append(reuse(TrashItem()))
        return out

    def sync(self):
        keep = {it.key: it for it in self.items}
        new = self.desired_items(keep)
        new_keys = {it.key for it in new}
        # keep leaving items (and drag/drop gaps) where they were so they can shrink away
        for i, old in enumerate(self.items):
            if old.key not in new_keys and old.appear > 0.01 and old.kind != 'gap':
                old.leaving = True
                new.insert(min(i, len(new)), old)
            elif old.kind == 'gap':
                new.insert(min(i, len(new)), old)
        for it in new:
            if it.kind == 'app':
                running = bool(self.windows.wins(it.app.id))
                if running and it.launching:
                    it.launching = False
        self.items = new
        self.kick()
        GLib.idle_add(self.update_icon_geometry)
        GLib.idle_add(self.check_struts)
        return False

    # ------------------------------------------------------------------ animation
    def kick(self):
        if self._tick_id is None and self.get_realized():
            self._last_t = None
            self._tick_id = self.add_tick_callback(self._tick)
        self.queue_draw()

    def _tick(self, _widget, clock):
        t = clock.get_frame_time() / 1e6
        dt = 0.016 if self._last_t is None else min(0.05, t - self._last_t)
        self._last_t = t
        busy = False

        want_mag = 1.0 if (self.mouse is not None and self.cfg['magnify'] and not self.popup
                           and not self.drag and not self.menu_open and not self.resize_drag) else 0.0
        self.mag = _approach(self.mag, want_mag, dt, 14)
        busy |= self.mag != want_mag

        want_hide = 0.0
        if self.cfg['autohide'] and not (self.mouse is not None or self.popup or self.drag or self.menu_open
                                         or self.ext or self._hide_timer):
            want_hide = 1.0
        self.hide = _approach(self.hide, want_hide, dt, 10)
        busy |= self.hide != want_hide

        drop = []
        for it in self.items:
            target = 0.0 if (it.leaving or (it.kind == 'gap' and getattr(it, 'closing', False))) else 1.0
            if it.ghost and self.drag and not self.drag.get('inside'):
                target = 0.0
            it.appear = _approach(it.appear, target, dt, 12)
            if it.appear != target:
                busy = True
            if it.leaving and it.appear <= 0.002:
                drop.append(it)
            if it.kind == 'gap' and getattr(it, 'closing', False) and it.appear <= 0.002:
                drop.append(it)
            if it.bounce_t0 is not None or self._wants_attention(it):
                busy = True
        if drop:
            self.items = [i for i in self.items if i not in drop]
        if self.poofs:
            now = _now()
            for p in list(self.poofs):
                if now - p['t0'] > 0.45:
                    p['win'].destroy()
                    self.poofs.remove(p)
                else:
                    p['win'].queue_draw()
            busy = True
        self.queue_draw()
        if not busy:
            self._tick_id = None
            GLib.idle_add(self.update_icon_geometry)
            GLib.idle_add(self.check_struts)
            return False
        return True

    def _wants_attention(self, it):
        if it.kind != 'app':
            return False
        return self.windows.attention(it.app.id)

    def bounce_offset(self, it, base, now):
        """Launch bounce (and attention bounce) height for an item."""
        attention = self._wants_attention(it)
        if it.bounce_t0 is None and not attention:
            return 0.0
        if it.bounce_t0 is None:
            it.bounce_t0 = now
        t = now - it.bounce_t0
        period = 0.62
        phase = (t % period) / period
        still_going = attention or (it.launching and t < 12)
        if not still_going and (t > period * 0.5 and phase < 0.08):
            it.bounce_t0 = None   # landed
            return 0.0
        return math.sin(math.pi * phase) * base * 0.55

    # ------------------------------------------------------------------ layout
    def compute(self, now=None, rest=False):
        """Lay out every item. rest=True ignores magnification/animation (used for Magic Lamp targets)."""
        now = now or _now()
        W, H = self.win_size
        base, maxs, shelf_h = self.metrics(rest=rest)
        horiz = self.bottom
        axis = W if horiz else H
        # Everything the dock draws stays between lo_lim and hi_lim (the edge margins, less the dock's ends).
        ends = self.dock_ends(base)
        lo_lim = self.edge_margin() + ends
        hi_lim = axis - self.edge_margin() - ends
        room = hi_lim - lo_lim
        items = list(self.items)

        def slot_size(it):
            a = 1.0 if rest else it.appear
            if rest and (it.leaving or it.kind == 'gap'):
                return 0.0
            return (base * 0.42 if it.kind == 'sep' else base) * a

        s0 = [slot_size(it) for it in items]
        gaps = [GAP * (1.0 if rest else min(1.0, it.appear)) for it in items]
        base_len = sum(s0) + sum(gaps[:-1]) if items else 0
        start0 = (axis - base_len) / 2
        centers, p = [], start0
        for s, g in zip(s0, gaps):
            centers.append(p + s / 2)
            p += s + g

        m = None if rest else (self.mouse if self.mouse is not None else self.last_mouse)
        mag = 0.0 if rest else self.mag
        rng = base * 3.0
        sizes = []
        for it, s, c in zip(items, s0, centers):
            if it.kind in ('sep', 'gap') or m is None or mag <= 0 or s <= 0:
                sizes.append(s)
                continue
            d = abs(m - c)
            grow = (maxs - base) * mag * math.cos(d / rng * math.pi / 2) if d < rng else 0.0
            sizes.append(s + grow * (s / base))
        gap_len = sum(gaps[:-1]) if items else 0
        length = sum(sizes) + gap_len
        if length > room and length > base_len:
            # Magnifying would push the dock into the margins: keep the magnification, and make room
            # for it by easing the other icons in (to no less than half size), then by magnifying less.
            S = sum(s0)
            G = length - gap_len - S
            k = (room - gap_len - G) / S if S > 0 else 1.0
            if k >= 0.5:
                sizes = [s * k + (z - s) for s, z in zip(s0, sizes)]
            else:
                gk = max(0.0, (room - gap_len - S * 0.5) / G) if G > 0 else 0.0
                sizes = [s * 0.5 + (z - s) * gk for s, z in zip(s0, sizes)]
            length = sum(sizes) + gap_len
        start = (axis - length) / 2
        if m is not None and mag > 0 and base_len > 0:
            f = min(1.0, max(0.0, (m - start0) / base_len))
            start = start0 + f * base_len - f * length
        if length < room:
            start = min(max(start, lo_lim), hi_lim - length)
        else:   # exactly full (or a hair over from rounding): sit centred between the margins
            start = (axis - length) / 2

        lip = 4
        face_h = shelf_h - lip
        opaque = self.opaque
        inset = 0 if opaque else round(face_h * 0.9)
        pad = round(base * 0.28) + inset
        visible_h = round(shelf_h * 0.6) + base + 8
        hide_off = (self.hide * (visible_h + 6)) if not rest else 0.0

        fr = {'items': [], 'horiz': horiz, 'base': base, 'start': start, 'length': length,
              'shelf_h': shelf_h, 'face_h': face_h, 'inset': inset, 'lip': lip}
        if horiz:
            floor = H - round(shelf_h * 0.6) + ICON_DROP + hide_off
            fr['shelf'] = (start - pad, H - shelf_h + hide_off, length + 2 * pad, shelf_h)
            fr['floor'] = floor
        else:
            floor = 8 - hide_off
            fr['panel'] = (-hide_off, start - 10, base + 16, length + 20)
            fr['floor'] = floor

        q = start
        top_most = H
        right_most = 0
        for it, s, g in zip(items, sizes, gaps):
            if it.kind == 'sep':
                fr['sep'] = (q, s)
                if not rest:
                    it.rect = None
                    it.slot = (q, s)
            else:
                off = 0.0 if rest else self.bounce_offset(it, base, now)
                if horiz:
                    x, y = q, floor - s - off
                    top_most = min(top_most, y)
                else:
                    x, y = floor + off, q
                    right_most = max(right_most, x + s)
                if not rest:
                    it.rect = (x, y, s)
                    it.slot = (q, s)
                fr['items'].append((it, x, y, s))
            q += s + g
        fr['top'] = top_most
        fr['right'] = right_most
        return fr

    # ------------------------------------------------------------------ Magic Lamp targets
    def rest_rect_after_windows(self):
        """Where the next minimized window's tile will appear (resting layout, screen coords)."""
        trial = list(self.items)
        last_win = max((i for i, it in enumerate(trial) if it.kind in ('win', 'stack', 'sep') and not it.leaving),
                       default=len(trial) - 1)
        probe = WinItem.__new__(WinItem)
        Item.__init__(probe, 'probe')
        probe.appear = 1.0
        saved = self.items
        self.items = trial[:last_win + 1] + [probe] + trial[last_win + 1:]
        try:
            fr = self.compute(rest=True)
        finally:
            self.items = saved
        for it, x, y, s in fr['items']:
            if it is probe:
                return x, y, s
        return None

    def update_icon_geometry(self):
        """Tell the window manager where each window minimizes to, so Magic Lamp pours into the right spot."""
        if not self.windows.available() or not self.get_realized():
            return False
        fr = self.compute(rest=True)
        ox, oy = self.win_origin
        self._icon_geo = {x: g for x, g in self._icon_geo.items() if x in self.windows.info}
        rects = {it.key: (x, y, s) for it, x, y, s in fr['items']}
        next_slot = None if self.cfg['minimize_into_app'] else self.rest_rect_after_windows()
        for app_id, xids in self.windows.by_app.items():
            app_rect = rects.get('app:' + app_id)
            for xid in xids:
                if self.windows.is_minimized(xid) and not self.cfg['minimize_into_app']:
                    r = rects.get('win:%d' % xid) or next_slot
                else:
                    r = (next_slot if not self.cfg['minimize_into_app'] else None) or app_rect
                if r is None:
                    continue
                geo = (int(ox + r[0]), int(oy + r[1]), int(r[2]), int(r[2]))
                if self._icon_geo.get(xid) != geo:
                    self._icon_geo[xid] = geo
                    try:
                        self.windows.set_icon_geometry(xid, *geo)
                    except Exception:  # noqa: BLE001
                        pass
        return False

    # ------------------------------------------------------------------ drawing
    def surface_for(self, it, size):
        hi = max(self.cfg['magnify_size'], self.cfg['icon_size'])
        hi = 128 if hi <= 128 else 256
        if it.kind == 'app':
            return self.icons.gicon(it.app.gicon, hi)
        if it.kind == 'trash':
            if (self.drag and self.drag['item'].kind == 'vol') or (self.ext and self.ext.get('eject')):
                return self.icons.named('media-eject', hi)
            return self.icons.named('user-trash-full' if self.trash.full() else 'user-trash', hi)
        if it.kind == 'vol':
            return self.icons.gicon(it.mount.get_icon(), hi)
        if it.kind == 'stack' and it.stack.display == 'folder':
            return self.icons.gicon(it.stack.folder_gicon(), hi)
        return None

    def paint_item_reflection(self, cr, it, x, floor, s, depth, strength=0.5):
        """The item as drawn on the shelf, mirrored onto the glass and fading out over `depth` px."""
        if depth <= 0:
            return
        try:
            import cairo
            cr.save()
            cr.push_group()
            cr.translate(0, 2 * floor)
            cr.scale(1, -1)
            self.paint_item(cr, it, x, floor - s, s)
            pattern = cr.pop_group()
            fade = cairo.LinearGradient(0, floor, 0, floor + depth)
            fade.add_color_stop_rgba(0, 0, 0, 0, strength)
            fade.add_color_stop_rgba(1, 0, 0, 0, 0)
            cr.set_source(pattern)
            cr.mask(fade)
            cr.restore()
        except Exception:  # noqa: BLE001  (a reflection must never stop the Dock drawing)
            try:
                cr.restore()
            except Exception:  # noqa: BLE001
                pass

    def paint_world_reflection(self, cr, sx, sy, sw, sh, fr):
        """The desktop and the windows standing just above the shelf, mirrored in the glass (Leopard's shelf)."""
        m = self.mirror
        if m is None or not m.ok or self.hide > 0.6:
            return
        # the strip of screen right above the glass, as tall as the icons stand
        ox, oy = self.win_origin
        cap = int(min(220, max(60, fr['base'] * 2.2)))
        try:
            xid = self.get_window().get_xid() if self.get_window() else 0
        except Exception:  # noqa: BLE001
            xid = 0
        skip = [xid] + ([self.popup.get_window().get_xid()] if self.popup and self.popup.get_window() else [])
        m.set_region(ox + sx, oy + sy - cap, sw, cap, skip)
        surf = m.surface
        if surf is None or surf.get_width() != int(sw) or surf.get_height() != cap:
            return
        try:
            cr.save()
            # mirrored about the back edge of the glass, and squeezed into it (it lies flat, seen at an angle)
            k = sh / cap * 1.15
            cr.translate(sx, sy + cap * k)
            cr.scale(1, -k)
            cr.set_source_surface(surf, 0, 0)
            cr.get_source().set_filter(cairo.FILTER_GOOD)
            fade = cairo.LinearGradient(0, cap, 0, 0)          # strongest at the back edge, gone at the front
            fade.add_color_stop_rgba(0, 0, 0, 0, 0.55)
            fade.add_color_stop_rgba(0.55, 0, 0, 0, 0.24)
            fade.add_color_stop_rgba(1, 0, 0, 0, 0.0)
            cr.mask(fade)
            cr.restore()
        except Exception:  # noqa: BLE001  (a reflection must never stop the Dock drawing)
            try:
                cr.restore()
            except Exception:  # noqa: BLE001
                pass

    def paint_item(self, cr, it, x, y, s, dim=0.0):
        if it.kind == 'stack' and it.stack.display != 'folder':
            surfs = it.stack.pile_surfaces(self.icons, 128)
            if not surfs:
                R.paint_icon(cr, self.icons.gicon(it.stack.folder_gicon(), 128), x, y, s, dim=dim)
            else:
                R.paint_stack_icon(cr, surfs, x, y, s)
        elif it.kind == 'win':
            tsurf = self.windows.thumbs.get(it.xid)
            badge = self.icons.gicon(it.app.gicon, 64) if it.app else None
            R.paint_window_tile(cr, tsurf, badge, x, y, s)
        elif it.kind != 'gap':
            R.paint_icon(cr, self.surface_for(it, s), x, y, s, dim=dim)

    def _on_draw(self, _w, cr):
        """Lay out, apply the click-through region, then paint.

        The click region is applied before any painting, and painting is protected, so a
        problem drawing one icon can never leave the whole transparent window catching clicks."""
        try:
            now = _now()
            fr = self.compute(now)
            self.frame = fr
            if self.ptr and not self.drag and not self.menu_open:
                self.hover = self.item_at(*self.ptr)   # icons move as they magnify; re-check what's under the pointer
            label = self._label_geometry(cr, fr)
            self._update_shape(fr, label[1:] if label else None)
        except Exception:  # noqa: BLE001
            self._report_draw_error()
            self._safe_shape()
            return True
        try:
            self._paint(cr, fr, label)
        except Exception:  # noqa: BLE001
            self._report_draw_error()
        return True

    def _label_geometry(self, cr, fr):
        """(text, x, y, w, h) of the name tag to show, or None."""
        if (self.hover is None or not self.hover.rect or self.drag or self.popup or self.menu_open
                or self.hover.kind in ('sep', 'gap') or self.hide >= 0.5):
            return None
        text = self.hover.name()
        if not text:
            return None
        W, _H = self.win_size
        x, y, s = self.hover.rect
        lw, lh = R.label_size(cr, text)
        if fr['horiz']:
            lx, ly = x + s / 2 - lw / 2, y - lh - 8
        else:
            lx, ly = x + s + 12, y + s / 2 - lh / 2
        lx = max(4, min(W - lw - 4, lx))
        return text, lx, ly, lw, lh

    def _report_draw_error(self):
        """Log drawing problems with a full traceback, at most once a minute."""
        now = _now()
        if now - getattr(self, '_last_draw_error', -1e9) > 60:
            self._last_draw_error = now
            import sys
            import traceback
            sys.stderr.write('%s drawing error (the dock keeps running):\n' % time.strftime('%Y-%m-%d %H:%M:%S'))
            traceback.print_exc()
            sys.stderr.flush()

    def _safe_shape(self):
        """If layout itself failed, accept clicks only along the screen edge rather than everywhere."""
        W, H = self.win_size
        rect = (0, H - 2, W, 2) if self.bottom else (0, 0, 2, H)
        self._input_key = None
        self.input_shape_combine_region(cairo.Region(cairo.RectangleInt(*rect)))

    def _paint(self, cr, fr, label):
        W, H = self.win_size
        cr.set_operator(cairo.OPERATOR_SOURCE)
        cr.set_source_rgba(0, 0, 0, 0)
        cr.paint()
        cr.set_operator(cairo.OPERATOR_OVER)
        if self.opaque:
            cr.set_source_rgb(0.17, 0.18, 0.20)
            cr.paint()

        horiz = fr['horiz']
        base = fr['base']
        pressed = self.press[0] if self.press and not self.drag else None

        if horiz:
            sx, sy, sw, sh = fr['shelf']
            R.paint_shelf(cr, sx, sy, sw, sh, fr['inset'], fr['lip'], self.opaque)
            # reflections on the glass
            if not self.opaque:
                cr.save()
                R.shelf_path(cr, sx, sy, sw, sh - fr['lip'], fr['inset'])
                cr.clip()
                if self.mirror is not None:
                    self.paint_world_reflection(cr, sx, sy, sw, sh - fr['lip'], fr)
                # everything on the shelf is mirrored: apps, folders and file stacks (their newest files,
                # as shown), minimized windows and the Trash; redrawn whenever any of them changes
                for it, x, y, s in fr['items']:
                    if it.ghost or s < 1 or it.kind == 'gap':
                        continue
                    self.paint_item_reflection(cr, it, x, fr['floor'], s, fr['shelf_h'])
                cr.restore()
            if 'sep' in fr:
                q, s = fr['sep']
                xb = q + s / 2
                f = (xb - sx) / sw if sw else 0.5
                xt = sx + fr['inset'] + f * (sw - 2 * fr['inset'])
                R.paint_shelf_separator(cr, xb, xt, sy + 1, sy + sh - fr['lip'])
        else:
            px, py, pw, ph = fr['panel']
            R.paint_side_panel(cr, px, py, pw, ph, self.opaque)
            if 'sep' in fr:
                q, s = fr['sep']
                R.paint_panel_separator(cr, px + 8, px + pw - 8, q + s / 2)

        for it, x, y, s in fr['items']:
            if it.ghost or s <= 0.5:
                continue
            if self.ext and self.ext.get('target') is it:
                R.paint_drop_highlight(cr, x, y, s)
            self.paint_item(cr, it, x, y, s, dim=0.45 if it is pressed else 0.0)
            if it.kind == 'app' and self.windows.wins(it.app.id):
                if horiz:
                    R.paint_light(cr, x + s / 2, min(H - fr['lip'] - 3, H - fr['lip'] - fr['face_h'] * 0.38 + ICON_DROP) + self.hide * (base + 20))
                else:
                    R.paint_light(cr, 3.5 - self.hide * (base + 20), y + s / 2, 2.8)

        if label:
            text, lx, ly, _lw, _lh = label
            R.paint_label(cr, text, lx, ly, opaque=self.opaque)

    def _update_shape(self, fr, label_rect):
        W, H = self.win_size
        rects = []
        if self.hide > 0.95 and self.cfg['autohide']:
            if fr['horiz']:
                sx, _, sw, _ = fr['shelf']
                rects.append((sx, H - 2, sw, 2))
            else:
                _, py, _, ph = fr['panel']
                rects.append((0, py, 2, ph))
        elif self.opaque:
            if fr['horiz']:
                sx, sy, sw, sh = fr['shelf']
                rects.append((sx, sy, sw, sh))
            else:
                px, py, pw, ph = fr['panel']
                rects.append((0, py, pw + 6, ph))
            rects += [(x, y, s, s) for it, x, y, s in fr['items'] if s > 0.5 and not it.ghost]
        else:
            if fr['horiz']:
                sx, sy, sw, sh = fr['shelf']
                top = min(fr['top'], sy) - 4
                rects.append((sx - 6, top, sw + 12, H - top))
            else:
                px, py, pw, ph = fr['panel']
                rects.append((0, py - 4, max(pw + 14, fr['right'] + 6), ph + 8))
        if label_rect:
            rects.append(label_rect)
        ints = [(int(math.floor(x)), int(math.floor(y)), int(math.ceil(w)) + 1, int(math.ceil(h)) + 1)
                for x, y, w, h in rects if w > 0 and h > 0]
        key = (tuple(ints), self.opaque)
        if key == self._input_key:
            return
        self._input_key = key
        region = cairo.Region([cairo.RectangleInt(*r) for r in ints]) if ints else cairo.Region()
        self.input_shape_combine_region(region)
        if self.opaque:
            self.shape_combine_region(region)

    # ------------------------------------------------------------------ hit testing
    def axis_pos(self, x, y):
        return x if self.bottom else y

    def item_at(self, x, y):
        fr = self.frame
        if not fr:
            return None
        W, H = self.win_size
        # Each icon owns its whole slot: half the gap on either side (generous at the ends), from a
        # little above the icon all the way to the screen edge. No dead zones between icons.
        items = [(it, ix, iy, s) for it, ix, iy, s in fr['items'] if s > 0.5 and not getattr(it, 'leaving', False)]
        horiz = fr['horiz']
        pos = x if horiz else y
        for n, (it, ix, iy, s) in enumerate(items):
            a0 = ix if horiz else iy
            a1 = a0 + s
            prev_end = None if n == 0 else ((items[n - 1][1] if horiz else items[n - 1][2]) + items[n - 1][3])
            next_start = None if n == len(items) - 1 else (items[n + 1][1] if horiz else items[n + 1][2])
            lo = a0 - 10 if prev_end is None else (prev_end + a0) / 2
            hi = a1 + 10 if next_start is None else (a1 + next_start) / 2
            if 'sep' in fr:            # the separator keeps its own strip for resizing
                q, ss = fr['sep']
                if a0 >= q + ss:
                    lo = max(lo, q + ss + 2)
                if a1 <= q:
                    hi = min(hi, q - 2)
            if not (lo <= pos < hi):
                continue
            if horiz:
                top = fr['floor'] - s - 14          # resting top of the icon (bounce ignored), plus some room
                if top <= y <= H:
                    return it
            else:
                right = fr['floor'] + s + 14
                if 0 <= x <= right:
                    return it
        if 'sep' in fr:
            q, s = fr['sep']
            if q - 2 <= self.axis_pos(x, y) <= q + s + 2 and self.in_band(x, y):
                return next((i for i in self.items if i.kind == 'sep'), None)
        return None

    def in_band(self, x, y, margin=0):
        """Is the point over the dock (shelf/panel and icons)?"""
        fr = self.frame
        if not fr:
            return False
        W, H = self.win_size
        if fr['horiz']:
            sx, sy, sw, _ = fr['shelf']
            return sx - margin <= x <= sx + sw + margin and min(fr['top'], sy) - margin <= y <= H + margin
        px, py, pw, ph = fr['panel']
        return py - margin <= y <= py + ph + margin and -margin <= x <= max(pw, fr['right']) + margin

    # ------------------------------------------------------------------ pointer
    def _on_enter(self, _w, ev):
        if self.cfg['autohide']:
            if self._hide_timer:
                GLib.source_remove(self._hide_timer)
                self._hide_timer = None
        self.kick()

    def _on_motion(self, _w, ev):
        x, y = ev.x, ev.y
        self.ptr = (x, y)
        if self.resize_drag:
            self._resize_motion(ev)
            return True
        if self.drag:
            self._drag_motion(ev)
            return True
        if self.press and not self.drag:
            it, px, py = self.press
            if math.hypot(x - px, y - py) > DRAG_THRESHOLD and it.draggable and it.kind not in ('sep', 'gap'):
                self._drag_start(it, ev)
                return True
        if self.in_band(x, y, margin=2) or (self.cfg['autohide'] and self.hide > 0.5):
            self.mouse = self.last_mouse = self.axis_pos(x, y)
            if self.cfg['autohide'] and self.hide > 0.01:
                self.mouse = self.last_mouse = self.axis_pos(x, y)
        else:
            self.mouse = None
        hov = self.item_at(x, y)
        if hov is not self.hover:
            self.hover = hov
            sep = hov is not None and hov.kind == 'sep'
            cursor = None
            if sep:
                cursor = Gdk.Cursor.new_from_name(self.get_display(), 'ns-resize' if self.bottom else 'ew-resize')
            self.get_window().set_cursor(cursor)
        self.kick()
        return True

    def _on_leave(self, _w, ev):
        if self.drag or self.resize_drag:
            return False
        if ev.mode != Gdk.CrossingMode.NORMAL and ev.mode != Gdk.CrossingMode.UNGRAB:
            return False
        self.mouse = None
        self.hover = None
        self.ptr = None
        self.press = None
        if self.cfg['autohide']:
            if self._hide_timer:
                GLib.source_remove(self._hide_timer)
            self._hide_timer = GLib.timeout_add(350, self._hide_now)
        self.kick()
        return False

    def _hide_now(self):
        self._hide_timer = None
        self.kick()
        return False

    def _on_press(self, _w, ev):
        if ev.type != Gdk.EventType.BUTTON_PRESS:
            return True
        it = self.item_at(ev.x, ev.y)
        if ev.button == 3:
            self.show_menu(it, ev)
            return True
        if ev.button != 1 or it is None:
            return True
        if it.kind == 'sep':
            self.resize_drag = {'edge': ev.y_root if self.bottom else ev.x_root,
                                'size': int(round(self.fit_base(rest=True))), 'chosen': self.cfg['icon_size']}
            return True
        self.press = (it, ev.x, ev.y)
        self.kick()
        return True

    def _on_release(self, _w, ev):
        if ev.button != 1:
            return True
        if self.resize_drag:
            self.resize_drag = None
            self.cfg.set(icon_size=self.cfg['icon_size'])
            return True
        if self.drag:
            self._drag_end(ev)
            return True
        if self.press:
            it, px, py = self.press
            self.press = None
            # A click is a click: if the pointer hardly moved, it counts for the icon that was pressed,
            # even when magnification slid the icons a few pixels in between.
            if self.item_at(ev.x, ev.y) is it or math.hypot(ev.x - px, ev.y - py) < 12:
                self.activate(it)
        self.kick()
        return True

    def _resize_motion(self, ev):
        """Drag the separator toward the screen centre to grow the dock, away to shrink it."""
        pos = ev.y_root if self.bottom else ev.x_root
        delta = (self.resize_drag['edge'] - pos) if self.bottom else (pos - self.resize_drag['edge'])
        size = int(max(24, min(128, self.resize_drag['size'] + delta)))
        # Growing stops where the dock meets the edge margins. Pulling outward on a dock that is
        # already shrunk to fit never lowers the size chosen before (so it grows back when apps leave).
        fit = self.fit_base(rest=True, want=128)
        if size > fit:
            size = int(max(24, int(fit), min(128, self.resize_drag.get('chosen', size))))
        if size != self.cfg['icon_size']:
            self.cfg.set(save=False, icon_size=size, magnify_size=max(self.cfg['magnify_size'], size))

    # ------------------------------------------------------------------ activation
    def activate(self, it):
        if it.kind == 'app':
            if self.windows.wins(it.app.id):
                self.windows.activate_app(it.app.id)
            else:
                if self.cfg['animate_launch']:
                    it.bounce_t0 = _now()
                    it.launching = True
                it.app.launch()
        elif it.kind == 'stack':
            self.open_stack(it)
        elif it.kind == 'win':
            self.windows.restore(it.xid)
        elif it.kind == 'vol':
            open_path(Volumes.key(it.mount))
        elif it.kind == 'trash':
            self.trash.open()
        self.kick()

    # ------------------------------------------------------------------ stacks
    def item_screen_rect(self, it):
        if not it.rect:
            return None
        x, y, s = it.rect
        ox, oy = self.win_origin
        return ox + x, oy + y, s

    def open_stack(self, it):
        if self.popup:
            closing = self.popup.stack is it.stack
            old, self.popup = self.popup, None
            old.close()
            if closing:
                self.mouse = None
                self.kick()
                return
        # anchor on the resting (un-magnified) slot so the stack doesn't jump
        fr = self.compute(rest=True)
        rect = next(((x, y, s) for i, x, y, s in fr['items'] if i is it), it.rect)
        ox, oy = self.win_origin
        anchor = (ox + rect[0], oy + rect[1], rect[2])
        self.popup = stacks.StackPopup(self, it.stack, anchor, self.bottom, self.icons, self._stack_closed)
        self.kick()

    def _stack_closed(self, popup=None):
        # Only the stack that is actually open may clear it: a stack still fading out after another one
        # was opened must not make the dock forget the new one (that left stacks stuck open).
        if popup is not None and self.popup is not popup:
            return
        self.popup = None
        self.mouse = None
        self.kick()

    # ------------------------------------------------------------------ internal drag (reorder / poof)
    def _drag_start(self, it, ev):
        self.press = None
        size = int(self.metrics()[0])
        surf_it = it

        def paint(cr, sz):
            far = self.drag and not self.drag.get('inside') and it.removable
            self.paint_item(cr, surf_it, 4, 4, sz - 8)
            if far:  # little poof cloud next to the icon = "let go to remove"
                R.paint_poof(cr, sz - 14, sz - 14, 0.15, 26)

        floater = FloatWindow(size + 8, paint)
        floater.place(ev.x_root, ev.y_root)
        floater.show_all()
        self.drag = {'item': it, 'float': floater, 'inside': True, 'section': self.section_of(it)}
        it.ghost = True
        seat = self.get_display().get_default_seat()
        seat.grab(self.get_window(), Gdk.SeatCapabilities.POINTER, False, None, ev, None, None)
        self.kick()

    def section_of(self, it):
        sep = next((i for i, x in enumerate(self.items) if x.kind == 'sep'), 0)
        return 'left' if self.items.index(it) < sep else 'right'

    def _drag_motion(self, ev):
        d = self.drag
        d['float'].place(ev.x_root, ev.y_root)
        inside = self.in_band(ev.x, ev.y, margin=self.metrics()[0] * 0.6)
        if inside != d['inside']:
            d['inside'] = inside
            d['float'].queue_draw()
        it = d['item']
        if inside and it.kind in ('app', 'stack'):
            self._move_in_section(it, self.axis_pos(ev.x, ev.y), d['section'])
        hov = self.item_at(ev.x, ev.y)
        self.hover = hov if (hov and hov.kind == 'trash' and it.kind == 'vol') else None
        self.mouse = None
        self.kick()

    def _move_in_section(self, it, pos, section):
        """Slide the dragged item's slot to wherever the pointer is, within its own section."""
        sep_i = next(i for i, x in enumerate(self.items) if x.kind == 'sep')
        lo, hi = (0, sep_i) if section == 'left' else (sep_i + 1, len(self.items))
        members = [x for x in self.items[lo:hi] if x.kind == it.kind and not x.leaving]
        others = [x for x in members if x is not it]
        insert_at = len(others)
        for n, other in enumerate(others):
            if other.slot and pos < other.slot[0] + other.slot[1] / 2:
                insert_at = n
                break
        order = others[:insert_at] + [it] + others[insert_at:]
        if order == members:
            return
        # same-kind items sit together at the start of their section; keep everything else after them
        self.items[lo:hi] = order + [x for x in self.items[lo:hi] if x not in members]

    def _drag_end(self, ev):
        d = self.drag
        self.drag = None
        self.get_display().get_default_seat().ungrab()
        d['float'].destroy()
        it = d['item']
        it.ghost = False
        target = self.item_at(ev.x, ev.y) if self.in_band(ev.x, ev.y) else None
        if it.kind == 'vol' and target is not None and target.kind == 'trash':
            Volumes.eject(it.mount, self.sync)
        elif not d['inside'] and it.removable:
            self.poof(ev.x_root, ev.y_root)
            self.remove_item(it)
        elif it.kind == 'app':
            order = [x.app.id for x in self.items if x.kind == 'app' and (x.pinned or x is it)]
            specs = {self.index.app(s).id: s for s in self.cfg['apps'] if self.index.app(s)}
            self.cfg.set(apps=[specs.get(a, a) for a in order])
        elif it.kind == 'stack':
            by_path = {os.path.expanduser(s['path']): s for s in self.cfg['stacks']}
            self.cfg.set(stacks=[by_path[x.stack.path] for x in self.items if x.kind == 'stack' and x.stack.path in by_path])
        self.hover = None
        self.kick()

    def poof(self, cx, cy):
        size = 96
        t0 = _now()
        win = FloatWindow(size, lambda cr, sz: R.paint_poof(cr, sz / 2, sz / 2, (_now() - t0) / 0.45, sz * 0.8))
        win.place(cx, cy)
        win.show_all()
        self.poofs.append({'win': win, 't0': t0})
        try:
            subprocess.Popen(['palos-sound', 'poof'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        except OSError:
            pass
        self.kick()

    def remove_item(self, it):
        if it.kind == 'app':
            specs = [s for s in self.cfg['apps'] if not (self.index.app(s) and self.index.app(s).id == it.app.id)]
            self.cfg.set(apps=specs)
        elif it.kind == 'stack':
            self.cfg.set(stacks=[s for s in self.cfg['stacks'] if os.path.expanduser(s['path']) != it.stack.path])

    # ------------------------------------------------------------------ external drag and drop
    def _ejectable(self, paths):
        """The mounted disks these paths are (each the top of a USB stick, SD card, disc ...), or None."""
        by_root = {}
        for m in self.volumes.mounts():
            try:
                by_root[os.path.realpath(Volumes.key(m))] = m
            except (GLib.Error, AttributeError, TypeError):
                continue
        found = [by_root.get(os.path.realpath(p)) for p in paths]
        return found if found and all(found) else None

    def _uri_kind(self, uris):
        paths = [Gio.File.new_for_uri(u).get_path() for u in uris]
        paths = [p for p in paths if p]
        if paths and self._ejectable(paths):
            return 'disks', paths
        if paths and any(p == '/' for p in paths):
            return 'system', paths                      # palOS HD itself: nothing to do with it here
        if paths and all(p.endswith('.desktop') for p in paths):
            return 'apps', paths
        if paths and all(os.path.isdir(p) for p in paths):
            return 'folders', paths
        return 'files', paths

    def _on_drag_motion(self, _w, ctx, x, y, t):
        if self.ext is None:
            self.ext = {'uris': None, 'target': None, 'gap': None, 'drop': False}
            target = self.drag_dest_find_target(ctx, None)
            if target:
                self.drag_get_data(ctx, target, t)
        self.mouse = self.last_mouse = self.axis_pos(x, y)
        e = self.ext
        if e['uris'] is None:
            Gdk.drag_status(ctx, Gdk.DragAction.COPY, t)
            return True
        kind, _ = self._uri_kind(e['uris'])
        hit = self.item_at(x, y)
        action = 0
        e['target'] = None
        want_gap = None
        eject_was = e.get('eject')
        e['eject'] = kind == 'disks'
        if eject_was != e['eject']:
            self.queue_draw()
        if kind in ('disks', 'system'):
            # disks only go to the Trash, which ejects them (it shows ⏏ while they're over the dock)
            if kind == 'disks' and hit is not None and hit.kind == 'trash':
                e['target'] = hit
                action = Gdk.DragAction.MOVE
            self._place_gap(None, self.axis_pos(x, y))
            Gdk.drag_status(ctx, action, t)
            self.kick()
            return True
        if hit is not None and hit.kind in ('app', 'trash', 'stack') and not (kind == 'apps' and hit.kind == 'app'):
            if hit.kind == 'trash' or hit.kind == 'stack' or kind == 'files' or kind == 'folders':
                e['target'] = hit
                action = Gdk.DragAction.MOVE if hit.kind in ('trash', 'stack') else Gdk.DragAction.COPY
        if e['target'] is None and kind in ('apps', 'folders'):
            want_gap = 'left' if kind == 'apps' else 'right'
            action = Gdk.DragAction.LINK if kind == 'apps' else Gdk.DragAction.COPY
        self._place_gap(want_gap, self.axis_pos(x, y))
        Gdk.drag_status(ctx, action, t)
        self.kick()
        return True

    def _place_gap(self, section, pos):
        e = self.ext
        gap = e.get('gap')
        if section is None:
            if gap is not None:
                gap.closing = True
                e['gap'] = None
            return
        if gap is None:
            gap = GapItem()
            gap.closing = False
            e['gap'] = gap
            self.items.insert(0, gap)
        sep_i = next(i for i, x in enumerate(self.items) if x.kind == 'sep')
        self.items.remove(gap)
        sep_i = next(i for i, x in enumerate(self.items) if x.kind == 'sep')
        if section == 'left':
            lo, hi = 0, sep_i
        else:
            lo = sep_i + 1
            hi = next((i for i, x in enumerate(self.items) if x.kind in ('win', 'vol', 'trash')), len(self.items))
        idx = hi
        for i in range(lo, hi):
            sl = self.items[i].slot
            if sl and pos < sl[0] + sl[1] / 2:
                idx = i
                break
        self.items.insert(idx, gap)
        gap.section = section

    def _on_drag_leave(self, _w, ctx, t):
        # drag-leave also fires right before drag-drop; clear a moment later unless a drop follows
        GLib.timeout_add(60, self._ext_clear_unless_dropping)

    def _ext_clear_unless_dropping(self):
        if self.ext and not self.ext.get('drop'):
            self._ext_clear()
        return False

    def _ext_clear(self):
        if self.ext and self.ext.get('gap') is not None:
            self.ext['gap'].closing = True
        self.ext = None
        self.mouse = None
        self.kick()

    def _on_drag_drop(self, _w, ctx, x, y, t):
        if self.ext is None:
            self.ext = {'uris': None, 'target': None, 'gap': None}
        self.ext['drop'] = True
        target = self.drag_dest_find_target(ctx, None)
        if target is None:
            return False
        self.drag_get_data(ctx, target, t)
        return True

    def _on_drag_data(self, _w, ctx, x, y, data, info, t):
        if self.ext is None:
            self.ext = {'uris': None, 'target': None, 'gap': None, 'drop': False}
        uris = data.get_uris() or []
        if not self.ext.get('drop'):
            self.ext['uris'] = uris
            return
        ok = self._handle_drop(uris, x, y)
        Gtk.drag_finish(ctx, ok, False, t)
        gap = self.ext.get('gap') if self.ext else None
        if gap is not None:
            gap.closing = True
            gap.leaving = True
        self.ext = None
        self.mouse = None
        self.kick()

    def _handle_drop(self, uris, x, y):
        e = self.ext
        kind, paths = self._uri_kind(uris)
        if not paths:
            return False
        target = e.get('target')
        if kind == 'system':
            return False
        if kind == 'disks':
            if target is None or target.kind != 'trash':
                return False
            for m in self._ejectable(paths) or []:
                Volumes.eject(m, self.sync)
            return True
        if target is not None:
            if target.kind == 'trash':
                keep = [p for p in paths if stacks.is_utilities(p)]
                paths = [p for p in paths if not stacks.is_utilities(p)]
                if paths:
                    self.trash.put(paths)
                if keep:
                    GLib.idle_add(lambda: (stacks.sorry(), False)[1])
            elif target.kind == 'app':
                if target.app.launch(paths) and not self.windows.wins(target.app.id) and self.cfg['animate_launch']:
                    target.bounce_t0, target.launching = _now(), True
            elif target.kind == 'stack':
                paths = [p for p in paths if not stacks.is_utilities(p)]
                if paths:
                    self._move_into(paths, target.stack.path)
            return True
        gap = e.get('gap')
        if gap is None:
            return False
        if kind == 'apps':
            before = [x for x in self.items[:self.items.index(gap)] if x.kind == 'app' and x.pinned]
            ids = []
            for p in paths:
                info = Gio.DesktopAppInfo.new_from_filename(p)
                if info and info.get_id():
                    ids.append(info.get_id()[:-8])
            specs = list(self.cfg['apps'])
            existing = {self.index.app(s).id for s in specs if self.index.app(s)}
            ids = [i for i in ids if i not in existing]
            pos = len(before)
            self.cfg.set(apps=specs[:pos] + ids + specs[pos:])
        elif kind == 'folders':
            before = [x for x in self.items[:self.items.index(gap)] if x.kind == 'stack']
            have = {os.path.expanduser(s['path']) for s in self.cfg['stacks']}
            new = [{'path': p, 'sort': 'date_added', 'view': 'auto', 'display': 'stack'}
                   for p in paths if p not in have]
            specs = list(self.cfg['stacks'])
            pos = len(before)
            self.cfg.set(stacks=specs[:pos] + new + specs[pos:])
        return True

    @staticmethod
    def _move_into(paths, folder):
        dest_dev = os.stat(folder).st_dev
        for p in paths:
            dst = os.path.join(folder, os.path.basename(p))
            if os.path.exists(dst) or os.path.dirname(os.path.abspath(p)) == folder:
                continue
            try:
                if os.stat(p).st_dev == dest_dev:
                    os.rename(p, dst)
                elif os.path.isdir(p):
                    shutil.copytree(p, dst)
                else:
                    shutil.copy2(p, dst)
            except OSError:
                pass

    # ------------------------------------------------------------------ menus
    def show_menu(self, it, ev):
        if self.popup:
            self.popup.close()
        menu = Gtk.Menu()

        def cap(label):
            # palOS rule: a menu entry is at most 20 characters, spaces included, in every language
            try:
                import palos_l10n
                label = palos_l10n.tr(label)
            except Exception:
                pass
            return label if len(label) <= 20 else label[:19].rstrip() + '…'

        def add(label, cb=None, sensitive=True, check=None, radio_group=None):
            if label is not None:
                label = cap(label)
            if label is None:
                menu_item = Gtk.SeparatorMenuItem()
            elif check is not None:
                menu_item = Gtk.CheckMenuItem(label=label)
                menu_item.set_active(check)
            else:
                menu_item = Gtk.MenuItem(label=label)
            menu_item.set_sensitive(sensitive)
            if cb:
                menu_item.connect('activate', lambda *_: cb())
            return menu_item

        def sub(label, entries):
            m = Gtk.MenuItem(label=cap(label))
            s = Gtk.Menu()
            for e in entries:
                s.append(e)
            m.set_submenu(s)
            return m

        def radio(options, current, setter):
            items, group = [], None
            for value, text in options:
                r = Gtk.RadioMenuItem.new_with_label_from_widget(group, cap(text))
                group = r
                r.set_active(value == current)
                r.connect('toggled', lambda w, v=value: w.get_active() and setter(v))
                items.append(r)
            return items

        kind = it.kind if it else 'sep'
        if kind in ('sep', 'gap'):
            c = self.cfg
            menu.append(add('Turn Hiding ' + ('Off' if c['autohide'] else 'On'),
                            lambda: c.set(autohide=not c['autohide'])))
            menu.append(add('Turn Magnify ' + ('Off' if c['magnify'] else 'On'),
                            lambda: c.set(magnify=not c['magnify'])))
            menu.append(add(None))
            menu.append(sub('Position on Screen', radio([('left', 'Left'), ('bottom', 'Bottom')],
                                                        c['position'], lambda v: c.set(position=v))))
            have_compiz = compiz_fx.available()
            m = sub('Minimize Using', radio([('magic_lamp', 'Magic Lamp Effect'), ('scale', 'Shrink Effect')],
                                            c['minimize_effect'], lambda v: c.set(minimize_effect=v)))
            m.set_sensitive(have_compiz)
            if not have_compiz:
                m.set_tooltip_text('Needs paladin-wm')
            menu.append(m)
            menu.append(add(None))
            menu.append(add('Dock Preferences…', self.show_prefs))
        elif kind == 'app':
            app = it.app
            wins = self.windows.wins(app.id)
            for xid in wins:
                menu.append(add(self.windows.name(xid) or app.name, lambda x=xid: self.windows.restore(x)))
            if wins:
                menu.append(add(None))
            if it.pinned:
                menu.append(add('Remove from Dock', lambda: self.remove_item(it)))
            else:
                menu.append(add('Keep in Dock', lambda: self.cfg.set(apps=self.cfg['apps'] + [app.id])))
            menu.append(add('Open at Login', lambda: self.toggle_login(app), check=self.opens_at_login(app)))
            menu.append(add(None))
            if wins:
                if any(not self.windows.is_minimized(x) for x in wins):
                    menu.append(add('Hide', lambda: self.windows.hide_app(app.id)))
                else:
                    menu.append(add('Show', lambda: self.windows.activate_app(app.id)))
                menu.append(add('Quit', lambda: self.windows.quit_app(app.id)))
            else:
                menu.append(add('Open', lambda: self.activate(it)))
        elif kind == 'stack':
            st = it.stack
            spec = next((s for s in self.cfg['stacks'] if os.path.expanduser(s['path']) == st.path), None)

            def set_spec(**kw):
                if spec is None:
                    return
                new = [dict(s, **kw) if s is spec else s for s in self.cfg['stacks']]
                self.cfg.set(stacks=new)
            menu.append(sub('Sort by', radio([('name', 'Name'), ('date_added', 'Date Added'),
                                              ('date_modified', 'Date Modified'), ('date_created', 'Date Created'),
                                              ('kind', 'Kind')], st.sort, lambda v: set_spec(sort=v))))
            menu.append(sub('Display as', radio([('folder', 'Folder'), ('stack', 'Stack')], st.display,
                                                lambda v: set_spec(display=v))))
            menu.append(sub('View Content as', radio([('fan', 'Fan'), ('grid', 'Grid'), ('auto', 'Automatic')],
                                                     st.view, lambda v: set_spec(view=v))))
            menu.append(add(None))
            menu.append(add('Open "%s"' % st.name, lambda: open_path(st.path)))
            menu.append(add('Remove from Dock', lambda: self.remove_item(it)))
        elif kind == 'win':
            menu.append(add('Open', lambda: self.windows.restore(it.xid)))
            menu.append(add('Close', lambda: self.windows.close(it.xid)))
        elif kind == 'vol':
            menu.append(add('Open', lambda: open_path(Volumes.key(it.mount))))
            menu.append(add('Eject "%s"' % it.mount.get_name(), lambda: Volumes.eject(it.mount, self.sync)))
        elif kind == 'trash':
            menu.append(add('Open', self.trash.open))
            menu.append(add('Empty Trash…', self.confirm_empty_trash, sensitive=self.trash.full()))

        menu.show_all()
        self.menu_open = True
        menu.connect('deactivate', self._menu_closed)
        menu.attach_to_widget(self, None)
        menu.popup_at_pointer(ev)
        self._menu = menu
        self.kick()

    def _menu_closed(self, menu):
        # destroy the menu once its item (if any) has run; kept menus would pile up in memory
        GLib.timeout_add(300, lambda: (menu.destroy(), False)[1])
        if getattr(self, '_menu', None) is menu:
            self._menu = None
        self.menu_open = False
        self.mouse = None
        self.hover = None
        self.kick()

    def confirm_empty_trash(self):
        dlg = Gtk.MessageDialog(message_type=Gtk.MessageType.WARNING, buttons=Gtk.ButtonsType.NONE,
                                text='Are you sure you want to permanently erase the items in the Trash?')
        dlg.format_secondary_text("You can't undo this action.")
        dlg.add_buttons('Cancel', Gtk.ResponseType.CANCEL, 'Empty Trash', Gtk.ResponseType.OK)
        dlg.set_default_response(Gtk.ResponseType.CANCEL)
        dlg.set_keep_above(True)
        if dlg.run() == Gtk.ResponseType.OK:
            self.trash.empty()
        dlg.destroy()

    @staticmethod
    def _autostart_path(app):
        return os.path.join(os.path.expanduser('~'), '.config', 'autostart', app.id + '.desktop')

    def opens_at_login(self, app):
        return os.path.exists(self._autostart_path(app))

    def toggle_login(self, app):
        path = self._autostart_path(app)
        if os.path.exists(path):
            os.unlink(path)
            return
        src = app.info.get_filename()
        if src:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            shutil.copyfile(src, path)

    def show_prefs(self):
        import prefs
        prefs.show(self.cfg, compiz_fx.available())

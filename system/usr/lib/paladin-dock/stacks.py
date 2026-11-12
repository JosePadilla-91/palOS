"""Stacks: folders in the dock that spring open as a fan (up to 8 items) or a grid."""
import math
import os
import time

import cairo
import gi
gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
gi.require_version('PangoCairo', '1.0')
from gi.repository import Gdk, Gio, GLib, Gtk, Pango, PangoCairo  # noqa: E402

import render as R
from system import open_path, open_uri

FAN_MAX = 8            # more than this opens as a grid
OPEN_LABEL = 'Open in Seeker' if __import__('shutil').which('paladin-seeker') else 'Open in File Manager'
ATTRS = ','.join([
    'standard::name', 'standard::display-name', 'standard::icon', 'standard::type',
    'standard::is-hidden', 'standard::is-backup', 'standard::content-type', 'standard::size',
    'thumbnail::path', 'time::modified', 'time::created', 'time::changed',
])
IMAGE_TYPES = ('image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/tiff')


class Entry:
    def __init__(self, folder, info):
        self.name = info.get_display_name() or info.get_name()
        self.path = os.path.join(folder, info.get_name())
        self.uri = Gio.File.new_for_path(self.path).get_uri()
        self.gicon = info.get_icon()
        self.thumb = info.get_attribute_byte_string('thumbnail::path') if info.has_attribute('thumbnail::path') else None
        self.is_dir = info.get_file_type() == Gio.FileType.DIRECTORY
        self.ctype = info.get_content_type() or ''
        self.size = info.get_size()
        mod = info.get_attribute_uint64('time::modified')
        self.modified = mod
        self.changed = info.get_attribute_uint64('time::changed') if info.has_attribute('time::changed') else mod
        self.created = info.get_attribute_uint64('time::created') if info.has_attribute('time::created') else mod
        # an app (the Utilities folder holds links to apps): its own name and icon, and it starts the app
        self.app = None
        if self.path.endswith('.desktop'):
            try:
                self.app = Gio.DesktopAppInfo.new_from_filename(os.path.realpath(self.path))
            except (TypeError, GLib.Error):
                self.app = None
            if self.app:
                self.name = self.app.get_display_name() or self.name
                self.gicon = self.app.get_icon() or self.gicon
                self.thumb = None

    def surface(self, icons, size):
        if self.thumb and os.path.exists(self.thumb):
            s = icons.file(self.thumb, size)
            if s:
                return s
        if self.ctype in IMAGE_TYPES and self.size < 25_000_000:
            s = icons.file(self.path, size)
            if s:
                return s
        return icons.gicon(self.gicon, size)


# The special folders' own icons, worked out here rather than asked of GIO at start-up: early in a
# session GIO sometimes answered with the plain folder icon (before it knew where the special folders
# are), and the Dock kept that icon for the whole session.
_SPECIAL_ICONS = {
    'DESKTOP': 'user-desktop', 'DOWNLOAD': 'folder-download', 'DOCUMENTS': 'folder-documents',
    'MUSIC': 'folder-music', 'PICTURES': 'folder-pictures', 'VIDEOS': 'folder-videos',
    'TEMPLATES': 'folder-templates', 'PUBLICSHARE': 'folder-publicshare',
}
_DEFAULT_DIRS = {'DESKTOP': 'Desktop', 'DOWNLOAD': 'Downloads', 'DOCUMENTS': 'Documents', 'MUSIC': 'Music',
                 'PICTURES': 'Pictures', 'VIDEOS': 'Videos', 'TEMPLATES': 'Templates', 'PUBLICSHARE': 'Public'}


# The Utilities folder (Seeker keeps it: links to the utility apps). It can sit in the Dock like any
# folder, but it can never be thrown away.
UTILITIES = os.path.join(os.environ.get('XDG_DATA_HOME') or os.path.expanduser('~/.local/share'), 'palos', 'Utilities')


def is_utilities(p):
    try:
        return os.path.realpath(p) == os.path.realpath(UTILITIES)
    except OSError:
        return False


def sorry():
    """The answer to anyone who tries to throw the Utilities folder away."""
    try:
        d = Gtk.MessageDialog(None, 0, Gtk.MessageType.WARNING, Gtk.ButtonsType.OK, 'Sorry, I can\u2019t do that.')
        d.format_secondary_text('The Utilities folder is part of palOS, so it can\u2019t be moved to the Trash.')
        d.set_keep_above(True)
        d.run()
        d.destroy()
    except Exception:  # noqa: BLE001
        pass


_special_cache = {}


def special_icon(path):
    """The themed icon for one of the user's special folders, or None (cached until user-dirs.dirs changes)."""
    home = os.path.expanduser('~')
    cfg = os.path.join(os.environ.get('XDG_CONFIG_HOME') or os.path.join(home, '.config'), 'user-dirs.dirs')
    try:
        stamp = os.path.getmtime(cfg)
    except OSError:
        stamp = 0
    hit = _special_cache.get(path)
    if hit and hit[0] == stamp:
        return hit[1]
    icon = _special_icon(path, home, cfg)
    _special_cache[path] = (stamp, icon)
    return icon


def _special_icon(path, home, cfg):
    dirs = {k: os.path.join(home, v) for k, v in _DEFAULT_DIRS.items()}
    try:
        for line in open(cfg, encoding='utf-8'):
            line = line.strip()
            if line.startswith('XDG_') and '_DIR=' in line:
                key, val = line[4:].split('_DIR=', 1)
                val = val.strip().strip('"').replace('$HOME', home)
                if key in _SPECIAL_ICONS and val:
                    dirs[key] = val
    except OSError:
        pass
    real = os.path.realpath(path)
    if real == os.path.realpath(UTILITIES):
        return Gio.ThemedIcon.new_from_names(['folder-utilities', 'applications-utilities', 'folder'])
    for key, d in dirs.items():
        if os.path.realpath(d) == real and real != os.path.realpath(home):
            return Gio.ThemedIcon.new_from_names([_SPECIAL_ICONS[key], _SPECIAL_ICONS[key] + 's', 'folder'])
    return None


class Stack:
    def __init__(self, spec, on_change):
        self.path = os.path.abspath(os.path.expanduser(spec['path']))
        self.on_change = on_change
        self._entries = None
        self.update_spec(spec)
        self._mon = None
        self._pending = None
        gf = Gio.File.new_for_path(self.path)
        try:
            info = gf.query_info('standard::display-name,standard::icon', Gio.FileQueryInfoFlags.NONE, None)
            self.name = info.get_display_name()
            self._folder_icon = info.get_icon()
        except GLib.Error:
            self.name = os.path.basename(self.path) or self.path
            self._folder_icon = Gio.ThemedIcon.new_with_default_fallbacks('folder')
        try:
            self._mon = gf.monitor_directory(Gio.FileMonitorFlags.WATCH_MOVES, None)
            self._mon.connect('changed', self._changed)
        except GLib.Error:
            self._mon = None

    def update_spec(self, spec):
        sort = spec.get('sort', 'date_added')
        if getattr(self, 'sort', None) != sort:
            self._entries = None
        self.sort = sort
        self.view = spec.get('view', 'auto')
        self.display = spec.get('display', 'stack')

    def close(self):
        if self._mon:
            self._mon.cancel()

    def _changed(self, *_):
        if self._pending is None:
            self._pending = GLib.timeout_add(250, self._refresh)

    def _refresh(self):
        self._pending = None
        self._entries = None
        self.on_change()
        return False

    def folder_gicon(self):
        special = special_icon(self.path)
        if special is not None:
            return special
        if self._folder_icon is None or self._folder_icon.to_string() in ('folder', '. GThemedIcon folder folder-symbolic'):
            try:      # GIO wasn't ready when the Dock started: ask again
                info = Gio.File.new_for_path(self.path).query_info('standard::icon', Gio.FileQueryInfoFlags.NONE, None)
                self._folder_icon = info.get_icon() or self._folder_icon
            except GLib.Error:
                pass
        return self._folder_icon

    def entries(self):
        if self._entries is None:
            out = []
            try:
                en = Gio.File.new_for_path(self.path).enumerate_children(
                    ATTRS, Gio.FileQueryInfoFlags.NONE, None)
                for info in en:
                    if info.get_is_hidden() or info.get_is_backup():
                        continue
                    out.append(Entry(self.path, info))
                en.close(None)
            except GLib.Error:
                out = []
            key = {
                'name': lambda e: e.name.casefold(),
                'kind': lambda e: (not e.is_dir, Gio.content_type_get_description(e.ctype).casefold(), e.name.casefold()),
                'date_modified': lambda e: -e.modified,
                'date_created': lambda e: -e.created,
                'date_added': lambda e: -e.changed,
            }.get(self.sort, lambda e: -e.changed)
            out.sort(key=key)
            self._entries = out
        return self._entries

    def pile_surfaces(self, icons, size):
        """Icons shown on the dock: the newest few items, newest on top."""
        entries = self.entries()
        key = (id(entries), size, icons.scale)
        if getattr(self, '_pile_key', None) != key:
            newest = sorted(entries, key=lambda e: -e.changed)[:3]
            self._pile = [e.surface(icons, size) for e in newest]
            self._pile_key = key
        return self._pile

    def use_fan(self, bottom):
        n = len(self.entries())
        if not bottom:
            return False
        if self.view == 'fan':
            return True
        if self.view == 'grid':
            return False
        return n <= FAN_MAX


# ============================================================================ popup
class StackPopup(Gtk.Window):
    """The open stack: a fan rising from the dock, or a grid panel."""

    FAN_ICON = 52
    FAN_STEP = 60
    CELL_W, CELL_H, GRID_ICON = 92, 96, 56

    def __init__(self, dock, stack, anchor, bottom, icons, on_closed):
        super().__init__(type=Gtk.WindowType.POPUP)
        self.dock = dock
        self.stack = stack
        self.anchor = anchor          # (screen x, screen y, size) of the dock icon
        self.bottom = bottom
        self.icons = icons
        self.on_closed = on_closed
        self.entries = stack.entries()
        self.fan = stack.use_fan(bottom)
        self.t0 = time.monotonic()
        self.closing_t0 = None
        self.hover = None
        self.press = None
        self.scroll_row = 0
        self._tick = None
        self.cells = []               # (index, x, y, w, h) hit areas; index -1 = "open folder" button
        self._labels = {}             # (text, hovered) -> rendered label image
        self._grid_cache = None       # (key, picture, cells)

        self.set_app_paintable(True)
        visual = self.get_screen().get_rgba_visual()
        if visual:
            self.set_visual(visual)
        self.opaque = not self.get_screen().is_composited()
        self.add_events(Gdk.EventMask.POINTER_MOTION_MASK | Gdk.EventMask.BUTTON_PRESS_MASK |
                        Gdk.EventMask.BUTTON_RELEASE_MASK | Gdk.EventMask.SCROLL_MASK |
                        Gdk.EventMask.KEY_PRESS_MASK | Gdk.EventMask.LEAVE_NOTIFY_MASK)
        self.connect('draw', self._draw)
        self.connect('motion-notify-event', self._motion)
        self.connect('button-press-event', self._press)
        self.connect('button-release-event', self._release)
        self.connect('scroll-event', self._scroll)
        self.connect('key-press-event', self._key)
        self.connect('leave-notify-event', lambda *_: self._set_hover(None))
        # drag items out to other apps
        self.drag_source_set(0, [], Gdk.DragAction.COPY | Gdk.DragAction.MOVE)
        self.drag_source_add_uri_targets()
        self.connect('drag-data-get', self._drag_get)
        self.connect('drag-end', lambda *_: self.close())
        self._drag_entry = None

        self._layout()
        self.show_all()
        self._grab()
        self._tick = self.add_tick_callback(self._on_tick)

    # ---------------------------------------------------------------- layout
    def _layout(self):
        ax, ay, asz = self.anchor
        screen = self.get_screen()
        display = self.get_display()
        mon = (display.get_monitor_at_point(int(ax), int(ay)) or display.get_primary_monitor()).get_geometry()
        if self.fan:
            n = len(self.entries) + 1   # + "Open in file manager"
            self.fan_pts = []
            for i in range(n):
                k = i + 1
                dy = k * self.FAN_STEP
                dx = 0.55 * (k ** 1.85)          # bends gently to the right as it rises
                rot = math.radians(1.6 * k)
                self.fan_pts.append((dx, dy, rot))
            w = 320 + self.FAN_ICON + int(self.fan_pts[-1][0]) + 30
            h = int(self.fan_pts[-1][1] + self.FAN_ICON + 20)
            # the icon column sits right above the dock icon
            self.col_x = w - int(self.fan_pts[-1][0]) - self.FAN_ICON - 20
            x = int(ax + asz / 2 - (self.col_x + self.FAN_ICON / 2))
            y = int(ay - h + 6)
            x = max(mon.x, min(mon.x + mon.width - w, x))
            self.col_x = int(ax + asz / 2 - x - self.FAN_ICON / 2)
            self.origin = (self.col_x + self.FAN_ICON / 2, h + asz / 2)  # dock icon centre, local
        else:
            n = len(self.entries)
            cols = max(3, min(7, math.ceil(math.sqrt(max(1, n)) * 1.25)))
            rows = max(1, math.ceil(n / cols))
            max_rows = max(1, int((mon.height * 0.62 - 90) // self.CELL_H))
            self.cols, self.rows, self.vis_rows = cols, rows, min(rows, max_rows)
            self.pad = 18
            footer = 34
            self.pw = cols * self.CELL_W + self.pad * 2
            self.ph = self.vis_rows * self.CELL_H + self.pad * 2 + footer
            arrow = 12
            if self.bottom:
                w, h = self.pw + 20, self.ph + arrow + 20
                x = int(ax + asz / 2 - w / 2)
                x = max(mon.x + 4, min(mon.x + mon.width - w - 4, x))
                y = int(ay - h + 4)
                self.panel = (10, 10, self.pw, self.ph)
                self.arrow = ('down', ax + asz / 2 - x, 10 + self.ph)
                self.origin = (ax + asz / 2 - x, h)
            else:
                w, h = self.pw + arrow + 20, self.ph + 20
                x = int(ax + asz + 8)
                y = int(ay + asz / 2 - h / 2)
                y = max(mon.y + 4, min(mon.y + mon.height - h - 4, y))
                self.panel = (10 + arrow, 10, self.pw, self.ph)
                self.arrow = ('left', 10 + arrow, ay + asz / 2 - y)
                self.origin = (0, ay + asz / 2 - y)
        self.size = (w, h)
        self.set_default_size(w, h)
        self.resize(w, h)
        self.move(x, y)

    # ---------------------------------------------------------------- animation
    def _progress(self):
        now = time.monotonic()
        if self.closing_t0 is not None:
            return max(0.0, 1 - (now - self.closing_t0) / 0.14)
        return min(1.0, (now - self.t0) / (self._fan_duration() if self.fan else 0.2))

    FAN_RISE = 0.26        # seconds each item takes to rise into place
    FAN_STAGGER = 0.035    # each item starts this much after the one below it

    def _fan_duration(self):
        # long enough for the LAST item to arrive (a fixed length froze the top items mid-flight)
        n = len(getattr(self, 'fan_pts', [])) or 1
        return self.FAN_RISE + self.FAN_STAGGER * (n - 1)

    def _on_tick(self, *_):
        self.queue_draw()
        if self.closing_t0 is not None and self._progress() <= 0:
            self._tick = None
            self._finish_close()
            return False
        if self.closing_t0 is None and self._progress() >= 1:
            self._tick = None
            return False
        return True

    def close(self):
        if self.closing_t0 is not None:
            return
        self._ungrab()
        self.closing_t0 = time.monotonic()
        if self._tick is None:
            self._tick = self.add_tick_callback(self._on_tick)

    def _finish_close(self):
        self.destroy()
        self.on_closed(self)

    # ---------------------------------------------------------------- grab
    def _grab(self):
        def attempt():
            win = self.get_window()
            if win is None:
                return True
            seat = self.get_display().get_default_seat()
            status = seat.grab(win, Gdk.SeatCapabilities.ALL, True, None, None, None, None)
            return status != Gdk.GrabStatus.SUCCESS and self.closing_t0 is None
        if attempt():
            GLib.timeout_add(50, attempt)

    def _ungrab(self):
        self.get_display().get_default_seat().ungrab()

    # ---------------------------------------------------------------- drawing
    def _draw(self, _w, cr):
        cr.set_operator(cairo.OPERATOR_SOURCE)
        cr.set_source_rgba(0, 0, 0, 0)
        cr.paint()
        cr.set_operator(cairo.OPERATOR_OVER)
        p = self._progress()
        self.cells = []
        if self.fan:
            self._draw_fan(cr, p)
        else:
            self._draw_grid(cr, p)
        return True

    def _draw_fan(self, cr, p):
        w, h = self.size
        ox, oy = self.origin
        n = len(self.fan_pts)
        elapsed = p * self._fan_duration()
        for i, (dx, dy, rot) in enumerate(self.fan_pts):
            stagger = i * self.FAN_STAGGER
            t = R.ease_out_back(min(1.0, max(0.0, (elapsed - stagger) / self.FAN_RISE))) if self.closing_t0 is None \
                else p
            if t <= 0:
                continue
            cx = ox + dx * t
            cy = oy - (dy + self.FAN_ICON / 2 - 4) * t
            size = self.FAN_ICON * (0.4 + 0.6 * min(1.0, t))
            cr.save()
            cr.translate(cx, cy)
            cr.rotate(rot * t)
            is_button = i == n - 1
            hovered = self.hover == (-1 if is_button else i)
            if is_button:
                self._paint_open_button(cr, size, hovered)
                label = OPEN_LABEL
            else:
                e = self.entries[i]
                R.paint_icon(cr, e.surface(self.icons, 128), -size / 2, -size / 2, size)
                label = e.name
            # label to the left of the icon
            if t > 0.7:
                alpha = min(1.0, (t - 0.7) / 0.3)
                surf, lw, lh = self._label_image(label, hovered)
                cr.set_source_surface(surf, -size / 2 - 10 - lw, -lh / 2)
                cr.get_source().set_filter(cairo.FILTER_GOOD)
                cr.paint_with_alpha(alpha)
            cr.restore()
            # hit box (approximate, unrotated)
            hit_l = cx - size / 2 - 230
            self.cells.append((-1 if is_button else i, hit_l, cy - self.FAN_STEP / 2, cx + size / 2 - hit_l, self.FAN_STEP))

    def _label_image(self, text, hovered):
        """A label pill rendered once at normal size. Text is never drawn under the fan's rotation:
        every distinct angle or zoom would make cairo build and keep another font cache."""
        key = (text, hovered)
        hit = self._labels.get(key)
        if hit is not None:
            return hit
        probe = cairo.Context(cairo.ImageSurface(cairo.FORMAT_ARGB32, 1, 1))
        lw, lh = R.label_size(probe, text)
        sc = max(1, self.icons.scale)
        surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, int(math.ceil(lw * sc)) + 2, int(math.ceil(lh * sc)) + 2)
        surf.set_device_scale(sc, sc)
        c = cairo.Context(surf)
        if hovered:
            R.rounded_rect(c, 0, 0, lw, lh, lh / 2)
            c.set_source_rgb(0.20, 0.45, 0.86)
            c.fill()
            self._label_text(c, text, 0, 0)
        else:
            R.paint_label(c, text, 0, 0, opaque=self.opaque)
        self._labels[key] = (surf, lw, lh)
        return self._labels[key]

    def _label_text(self, cr, text, x, y, pad_x=11, pad_y=4):
        layout = R.label_layout(cr, text)
        _, ext = layout.get_pixel_extents()
        cr.move_to(x + pad_x - ext.x, y + pad_y - ext.y)
        cr.set_source_rgb(1, 1, 1)
        PangoCairo.show_layout(cr, layout)

    def _paint_open_button(self, cr, size, hovered):
        r = size * 0.36
        cr.new_path()
        g = cairo.LinearGradient(0, -r, 0, r)
        g.add_color_stop_rgba(0, 0.45, 0.47, 0.50, 0.95)
        g.add_color_stop_rgba(1, 0.18, 0.19, 0.21, 0.95)
        if hovered:
            g = cairo.LinearGradient(0, -r, 0, r)
            g.add_color_stop_rgb(0, 0.40, 0.62, 0.95)
            g.add_color_stop_rgb(1, 0.16, 0.38, 0.80)
        cr.arc(0, 0, r, 0, 2 * math.pi)
        cr.set_source(g)
        cr.fill_preserve()
        cr.set_source_rgba(1, 1, 1, 0.6)
        cr.set_line_width(1.2)
        cr.stroke()
        # arrow
        cr.set_source_rgb(1, 1, 1)
        cr.set_line_width(2.2)
        cr.set_line_cap(cairo.LINE_CAP_ROUND)
        cr.move_to(-r * 0.4, 0)
        cr.line_to(r * 0.4, 0)
        cr.move_to(r * 0.1, -r * 0.32)
        cr.line_to(r * 0.42, 0)
        cr.line_to(r * 0.1, r * 0.32)
        cr.stroke()

    def _panel_path(self, cr):
        px, py, pw, ph = self.panel
        r = 12
        kind, ax, ay = self.arrow
        a = 12
        cr.new_path()
        cr.arc(px + r, py + r, r, math.pi, 1.5 * math.pi)
        cr.arc(px + pw - r, py + r, r, 1.5 * math.pi, 2 * math.pi)
        cr.arc(px + pw - r, py + ph - r, r, 0, 0.5 * math.pi)
        if kind == 'down':
            ax = max(px + r + a, min(px + pw - r - a, ax))
            cr.line_to(ax + a, py + ph)
            cr.line_to(ax, py + ph + a)
            cr.line_to(ax - a, py + ph)
        cr.arc(px + r, py + ph - r, r, 0.5 * math.pi, math.pi)
        if kind == 'left':
            ay = max(py + r + a, min(py + ph - r - a, ay))
            cr.line_to(px, ay + a)
            cr.line_to(px - a, ay)
            cr.line_to(px, ay - a)
        cr.close_path()

    def _draw_grid(self, cr, p):
        e = R.ease_out(p)
        surf, cells = self._grid_picture()
        ox, oy = self.origin
        cr.save()
        cr.translate(ox, oy)
        s = 0.35 + 0.65 * e
        cr.scale(s, s)
        cr.translate(-ox, -oy)
        cr.set_source_surface(surf, 0, 0)
        cr.get_source().set_filter(cairo.FILTER_GOOD)
        cr.paint_with_alpha(e)
        cr.restore()
        # hit areas are only valid once fully open (unscaled)
        self.cells = cells if e >= 1 else []

    def _grid_picture(self):
        """The grid panel rendered once at normal size (redrawn only when hover or scroll changes).
        Zooming this picture, instead of re-drawing text at every zoom step, keeps cairo from
        piling up a font cache per intermediate size."""
        key = (self.hover, self.scroll_row)
        if self._grid_cache is not None and self._grid_cache[0] == key:
            return self._grid_cache[1], self._grid_cache[2]
        w, h = self.size
        sc = max(1, self.icons.scale)
        surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, int(w * sc), int(h * sc))
        surf.set_device_scale(sc, sc)
        cr = cairo.Context(surf)
        self.cells = []
        # panel
        self._panel_path(cr)
        cr.set_source_rgba(0.12, 0.12, 0.13, 1.0 if self.opaque else 0.86)
        cr.fill_preserve()
        cr.set_source_rgba(1, 1, 1, 0.22)
        cr.set_line_width(1)
        cr.stroke()
        px, py, pw, ph = self.panel
        # title-less grid of items
        cr.save()
        cr.rectangle(px, py + 6, pw, self.vis_rows * self.CELL_H + self.pad * 2 - 12)
        cr.clip()
        first = self.scroll_row * self.cols
        for vi, ent in enumerate(self.entries[first:first + self.vis_rows * self.cols]):
            idx = first + vi
            col, row = vi % self.cols, vi // self.cols
            cx = px + self.pad + col * self.CELL_W
            cy = py + self.pad + row * self.CELL_H
            if self.hover == idx:
                R.rounded_rect(cr, cx + 4, cy, self.CELL_W - 8, self.CELL_H - 4, 8)
                cr.set_source_rgba(1, 1, 1, 0.16)
                cr.fill()
            R.paint_icon(cr, ent.surface(self.icons, 128), cx + (self.CELL_W - self.GRID_ICON) / 2, cy + 4,
                         self.GRID_ICON)
            self._grid_label(cr, ent.name, cx + 4, cy + 6 + self.GRID_ICON, self.CELL_W - 8)
            self.cells.append((idx, cx, cy, self.CELL_W, self.CELL_H))
        cr.restore()
        # scroll hint
        if self.rows > self.vis_rows:
            frac = self.vis_rows / self.rows
            track = self.vis_rows * self.CELL_H
            top = py + self.pad + track * (self.scroll_row / self.rows)
            R.rounded_rect(cr, px + pw - 8, top, 4, max(20, track * frac), 2)
            cr.set_source_rgba(1, 1, 1, 0.35)
            cr.fill()
        # footer button
        label = OPEN_LABEL + '  ›'
        lay = R.label_layout(cr, label)
        _, ext = lay.get_pixel_extents()
        bw, bh = ext.width + 22, 22
        bx, by = px + pw - bw - 12, py + ph - bh - 8
        R.rounded_rect(cr, bx, by, bw, bh, bh / 2)
        cr.set_source_rgba(0.25, 0.48, 0.90, 1) if self.hover == -1 else cr.set_source_rgba(1, 1, 1, 0.14)
        cr.fill()
        cr.move_to(bx + 11 - ext.x, by + (bh - ext.height) / 2 - ext.y)
        cr.set_source_rgb(1, 1, 1)
        PangoCairo.show_layout(cr, lay)
        self.cells.append((-1, bx, by, bw, bh))
        # folder name, bottom left
        name = R.label_layout(cr, self.stack.name)
        _, ne = name.get_pixel_extents()
        cr.move_to(px + 16 - ne.x, by + (bh - ne.height) / 2 - ne.y)
        cr.set_source_rgba(1, 1, 1, 0.6)
        PangoCairo.show_layout(cr, name)
        self._grid_cache = (key, surf, list(self.cells))
        return surf, self._grid_cache[2]

    def _grid_label(self, cr, text, x, y, width):
        layout = PangoCairo.create_layout(cr)
        layout.set_font_description(Pango.FontDescription.from_string('Lucida Grande, Noto Sans, Cantarell, Sans 9'))
        layout.set_text(text, -1)
        layout.set_width(int(width * Pango.SCALE))
        layout.set_alignment(Pango.Alignment.CENTER)
        layout.set_wrap(Pango.WrapMode.WORD_CHAR)
        layout.set_ellipsize(Pango.EllipsizeMode.END)
        layout.set_height(-2)
        cr.move_to(x, y + 1)
        PangoCairo.layout_path(cr, layout)
        cr.set_source_rgba(0, 0, 0, 0.9)
        cr.fill()
        cr.move_to(x, y)
        cr.set_source_rgb(1, 1, 1)
        PangoCairo.show_layout(cr, layout)

    # ---------------------------------------------------------------- input
    def _cell_at(self, x, y):
        for idx, cx, cy, cw, ch in self.cells:
            if cx <= x <= cx + cw and cy <= y <= cy + ch:
                return idx
        return None

    def _set_hover(self, idx):
        if idx != self.hover:
            self.hover = idx
            self.queue_draw()

    def _inside(self, x, y):
        w, h = self.size
        return 0 <= x <= w and 0 <= y <= h

    def _motion(self, _w, ev):
        self._set_hover(self._cell_at(ev.x, ev.y) if self._inside(ev.x, ev.y) else None)
        if self.press and self.press[0] is not None and self.press[0] >= 0:
            idx, px, py = self.press
            if math.hypot(ev.x - px, ev.y - py) > 6:
                self._drag_entry = self.entries[idx]
                self.press = None
                self._ungrab()
                targets = Gtk.TargetList.new([])
                targets.add_uri_targets(0)
                self.drag_begin_with_coordinates(targets, Gdk.DragAction.COPY | Gdk.DragAction.MOVE, 1, ev,
                                                 int(ev.x), int(ev.y))
        return True

    def _press(self, _w, ev):
        if ev.type != Gdk.EventType.BUTTON_PRESS:
            return True
        if not self._inside(ev.x, ev.y):
            # A click outside closes the stack. While it's open the stack holds the pointer, so a click on
            # another dock icon lands here: pass it on (another stack opens straight away, an app launches).
            # A click on this stack's own icon just closes it.
            self.close()
            dock = self.dock
            ox, oy = dock.win_origin
            it = dock.item_at(ev.x_root - ox, ev.y_root - oy) if ev.button == 1 else None
            if it is not None and it.kind not in ('sep', 'gap') and getattr(it, 'stack', None) is not self.stack:
                GLib.idle_add(lambda: (dock.activate(it), False)[1])
            return True
        self.press = (self._cell_at(ev.x, ev.y), ev.x, ev.y)
        return True

    def _release(self, _w, ev):
        if not self.press:
            return True
        idx = self.press[0]
        self.press = None
        if idx is None or idx != self._cell_at(ev.x, ev.y):
            return True
        if idx == -1:
            open_path(self.stack.path)
        else:
            e = self.entries[idx]
            if getattr(e, 'app', None):
                e.app.launch([], None)
            else:
                open_uri(e.uri)
        self.close()
        return True

    def _scroll(self, _w, ev):
        if self.fan:
            return True
        dy = 0
        if ev.direction == Gdk.ScrollDirection.UP:
            dy = -1
        elif ev.direction == Gdk.ScrollDirection.DOWN:
            dy = 1
        elif ev.direction == Gdk.ScrollDirection.SMOOTH:
            dy = 1 if ev.delta_y > 0 else -1 if ev.delta_y < 0 else 0
        self.scroll_row = max(0, min(self.rows - self.vis_rows, self.scroll_row + dy))
        self.queue_draw()
        return True

    def _key(self, _w, ev):
        if ev.keyval == Gdk.KEY_Escape:
            self.close()
        return True

    def _drag_get(self, _w, _ctx, data, _info, _t):
        if self._drag_entry:
            data.set_uris([self._drag_entry.uri])

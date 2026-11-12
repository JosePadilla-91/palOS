"""Cairo drawing for Paladin Dock: shelf, side panel, reflections, lights, labels, poof."""
import math

import cairo
import gi
gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
gi.require_version('PangoCairo', '1.0')
from gi.repository import Gdk, GdkPixbuf, Gio, GLib, Gtk, Pango, PangoCairo  # noqa: E402

LABEL_FONT = 'Lucida Grande, Noto Sans, Cantarell, Sans Bold 10'


class Icons:
    """Loads icons once at a large size and keeps them as cairo surfaces."""

    def __init__(self):
        self.theme = Gtk.IconTheme.get_default()
        self.listeners = []          # called (on idle) after the icon theme changes, to redraw
        self.theme.connect('changed', self._theme_changed)
        self.cache = {}
        self.scale = 1

    def _theme_changed(self, *_):
        self.cache.clear()
        for fn in list(self.listeners):
            GLib.idle_add(lambda f=fn: (f(), False)[1])

    def _store(self, key, pb):
        surf = Gdk.cairo_surface_create_from_pixbuf(pb, self.scale, None) if pb else None
        self.cache[key] = surf
        return surf

    def gicon(self, gicon, size):
        if gicon is None:
            return None
        key = ('g', gicon.to_string(), size, self.scale)
        if key in self.cache:
            return self.cache[key]
        pb = None
        try:
            info = self.theme.lookup_by_gicon_for_scale(gicon, size, self.scale, Gtk.IconLookupFlags.FORCE_SIZE)
            if info:
                pb = info.load_icon()
        except GLib.Error:
            pb = None
        if pb is None and isinstance(gicon, Gio.FileIcon):
            pb = self._file_pb(gicon.get_file().get_path(), size)
        if pb is None:
            return self.named('application-x-executable', size)
        return self._store(key, pb)

    def named(self, name, size):
        return self.gicon(Gio.ThemedIcon.new_with_default_fallbacks(name), size)

    def _file_pb(self, path, size):
        try:
            return GdkPixbuf.Pixbuf.new_from_file_at_scale(path, size * self.scale, size * self.scale, True)
        except (GLib.Error, TypeError):
            return None

    def file(self, path, size):
        key = ('f', path, size, self.scale)
        if key in self.cache:
            return self.cache[key]
        return self._store(key, self._file_pb(path, size))

    def pixbuf(self, key, pb):
        k = ('p', key, self.scale)
        if k not in self.cache:
            self._store(k, pb)
        return self.cache[k]


def surface_size(surf):
    """Logical size of a surface created at the current scale."""
    sx, _ = surf.get_device_scale()
    return surf.get_width() / sx, surf.get_height() / sx


def paint_icon(cr, surf, x, y, size, alpha=1.0, dim=0.0):
    """Draw a square icon scaled into (x, y, size)."""
    if surf is None or size < 1:
        return
    w, h = surface_size(surf)
    s = size / max(w, h)
    cr.save()
    cr.translate(x + (size - w * s) / 2, y + (size - h * s) / 2)
    cr.scale(s, s)
    cr.set_source_surface(surf, 0, 0)
    cr.get_source().set_filter(cairo.FILTER_GOOD)
    cr.paint_with_alpha(alpha)
    if dim > 0:
        cr.set_operator(cairo.OPERATOR_ATOP)
        cr.set_source_rgba(0, 0, 0, dim)
        cr.paint()
    cr.restore()


def paint_reflection(cr, surf, x, floor, size, depth, strength=0.5):
    """Mirror an icon onto the glass below its baseline, fading out over `depth` px."""
    if surf is None or depth <= 0 or size < 1:
        return
    cr.save()
    cr.push_group()
    cr.translate(0, 2 * floor)
    cr.scale(1, -1)
    paint_icon(cr, surf, x, floor - size, size)
    pattern = cr.pop_group()
    fade = cairo.LinearGradient(0, floor, 0, floor + depth)
    fade.add_color_stop_rgba(0, 0, 0, 0, strength)
    fade.add_color_stop_rgba(1, 0, 0, 0, 0)
    cr.set_source(pattern)
    cr.mask(fade)
    cr.restore()


# ---------------------------------------------------------------- bottom shelf
def shelf_path(cr, x, y, w, h, inset):
    cr.new_path()
    cr.move_to(x + inset, y)
    cr.line_to(x + w - inset, y)
    cr.line_to(x + w, y + h)
    cr.line_to(x, y + h)
    cr.close_path()


def paint_shelf(cr, x, y, w, h, inset, lip=4, opaque=False):
    """the classic frosted glass shelf: a trapezoid floor seen in perspective, with a bright front lip."""
    face_h = h - lip
    cr.save()
    if not opaque:  # soft shadow under the glass
        for i, a in ((6, 0.05), (3, 0.08), (1, 0.12)):
            shelf_path(cr, x - i, y - i * 0.6, w + 2 * i, face_h + i, inset + i * 0.3)
            cr.set_source_rgba(0, 0, 0, a)
            cr.fill()
    shelf_path(cr, x, y, w, face_h, inset)
    g = cairo.LinearGradient(0, y, 0, y + face_h)
    if opaque:
        g.add_color_stop_rgb(0, 0.86, 0.88, 0.91)
        g.add_color_stop_rgb(1, 0.60, 0.63, 0.67)
    else:
        g.add_color_stop_rgba(0.00, 0.95, 0.97, 1.00, 0.62)
        g.add_color_stop_rgba(0.12, 0.84, 0.87, 0.91, 0.50)
        g.add_color_stop_rgba(0.55, 0.66, 0.69, 0.74, 0.58)
        g.add_color_stop_rgba(1.00, 0.48, 0.51, 0.56, 0.72)
    cr.set_source(g)
    cr.fill_preserve()
    # subtle sheen across the far half of the glass
    sheen = cairo.LinearGradient(0, y, 0, y + face_h * 0.55)
    sheen.add_color_stop_rgba(0, 1, 1, 1, 0.30)
    sheen.add_color_stop_rgba(1, 1, 1, 1, 0.0)
    cr.set_source(sheen)
    cr.fill()
    # bright back edge and slanted side edges
    cr.set_line_width(1)
    cr.move_to(x + inset + 0.5, y + 0.5)
    cr.line_to(x + w - inset - 0.5, y + 0.5)
    cr.set_source_rgba(1, 1, 1, 0.85)
    cr.stroke()
    for (x0, x1) in ((x + inset, x), (x + w - inset, x + w)):
        cr.move_to(x0, y + 0.5)
        cr.line_to(x1, y + face_h)
        cr.set_source_rgba(1, 1, 1, 0.55)
        cr.stroke()
    # front lip
    lg = cairo.LinearGradient(0, y + face_h, 0, y + h)
    lg.add_color_stop_rgb(0, 0.99, 0.99, 1.0)
    lg.add_color_stop_rgb(0.5, 0.80, 0.82, 0.85)
    lg.add_color_stop_rgb(1, 0.52, 0.55, 0.60)
    cr.rectangle(x, y + face_h, w, lip)
    cr.set_source(lg)
    cr.fill()
    cr.restore()


def paint_shelf_separator(cr, xb, xt, y_back, y_front):
    """Dashed 'zebra' divider lying on the shelf, converging with the perspective."""
    cr.save()
    cr.set_line_width(1.6)
    cr.set_dash([3, 2])
    cr.move_to(xb, y_front)
    cr.line_to(xt, y_back)
    cr.set_source_rgba(1, 1, 1, 0.9)
    cr.stroke()
    cr.set_dash([2, 3], 3)
    cr.move_to(xb + 1.2, y_front)
    cr.line_to(xt + 0.8, y_back)
    cr.set_source_rgba(0.25, 0.25, 0.25, 0.55)
    cr.stroke()
    cr.restore()


# ---------------------------------------------------------------- left side panel
def rounded_rect(cr, x, y, w, h, r, corners=(True, True, True, True)):
    tl, tr, br, bl = corners
    cr.new_path()
    cr.move_to(x + (r if tl else 0), y)
    cr.line_to(x + w - (r if tr else 0), y)
    if tr:
        cr.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    cr.line_to(x + w, y + h - (r if br else 0))
    if br:
        cr.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    cr.line_to(x + (r if bl else 0), y + h)
    if bl:
        cr.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    cr.line_to(x, y + (r if tl else 0))
    if tl:
        cr.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    cr.close_path()


def paint_side_panel(cr, x, y, w, h, opaque=False):
    """the classic side dock: a smoked-glass slab with a thick bevelled right edge."""
    edge = 5
    cr.save()
    if not opaque:
        for i, a in ((8, 0.04), (5, 0.06), (2, 0.10)):
            rounded_rect(cr, x, y - i / 2, w + edge + i, h + i, 9, (False, True, True, False))
            cr.set_source_rgba(0, 0, 0, a)
            cr.fill()
    # thick edge
    rounded_rect(cr, x, y, w + edge, h, 8, (False, True, True, False))
    eg = cairo.LinearGradient(x + w, 0, x + w + edge, 0)
    eg.add_color_stop_rgb(0, 0.86, 0.88, 0.91)
    eg.add_color_stop_rgb(1, 0.46, 0.49, 0.54)
    cr.set_source(eg)
    cr.fill()
    # face
    rounded_rect(cr, x, y + 1, w, h - 2, 7, (False, True, True, False))
    g = cairo.LinearGradient(x, 0, x + w, 0)
    if opaque:
        g.add_color_stop_rgb(0, 0.16, 0.17, 0.20)
        g.add_color_stop_rgb(1, 0.33, 0.35, 0.40)
    else:
        g.add_color_stop_rgba(0, 0.10, 0.11, 0.14, 0.70)
        g.add_color_stop_rgba(0.75, 0.28, 0.30, 0.35, 0.62)
        g.add_color_stop_rgba(1, 0.50, 0.53, 0.58, 0.66)
    cr.set_source(g)
    cr.fill_preserve()
    cr.set_line_width(1)
    cr.set_source_rgba(1, 1, 1, 0.35)
    cr.stroke()
    # top highlight
    cr.move_to(x, y + 1.5)
    cr.line_to(x + w - 6, y + 1.5)
    cr.set_source_rgba(1, 1, 1, 0.45)
    cr.stroke()
    cr.restore()


def paint_panel_separator(cr, x0, x1, y):
    cr.save()
    cr.set_line_width(1)
    cr.move_to(x0, y - 0.5)
    cr.line_to(x1, y - 0.5)
    cr.set_source_rgba(0, 0, 0, 0.5)
    cr.stroke()
    cr.move_to(x0, y + 0.5)
    cr.line_to(x1, y + 0.5)
    cr.set_source_rgba(1, 1, 1, 0.45)
    cr.stroke()
    cr.restore()


# ---------------------------------------------------------------- lights, labels, badges
def paint_light(cr, cx, cy, r=3.2):
    """The glowing blue-white 'running' light."""
    cr.save()
    cr.new_path()
    glow = cairo.RadialGradient(cx, cy, 0, cx, cy, r * 3)
    glow.add_color_stop_rgba(0, 0.55, 0.80, 1.0, 0.75)
    glow.add_color_stop_rgba(1, 0.35, 0.65, 1.0, 0.0)
    cr.arc(cx, cy, r * 3, 0, 2 * math.pi)
    cr.set_source(glow)
    cr.fill()
    core = cairo.RadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r)
    core.add_color_stop_rgb(0, 1, 1, 1)
    core.add_color_stop_rgb(1, 0.66, 0.84, 1.0)
    cr.arc(cx, cy, r, 0, 2 * math.pi)
    cr.set_source(core)
    cr.fill()
    cr.restore()


def label_layout(widget_or_ctx, text):
    layout = PangoCairo.create_layout(widget_or_ctx)
    layout.set_font_description(Pango.FontDescription.from_string(LABEL_FONT))
    layout.set_text(text, -1)
    layout.set_ellipsize(Pango.EllipsizeMode.MIDDLE)
    layout.set_width(320 * Pango.SCALE)
    return layout


def label_size(cr, text, pad_x=11, pad_y=4):
    layout = label_layout(cr, text)
    _, ext = layout.get_pixel_extents()
    return ext.width + pad_x * 2, ext.height + pad_y * 2


def paint_label(cr, text, x, y, pad_x=11, pad_y=4, opaque=False):
    """the classic black, rounded name tag with white text."""
    layout = label_layout(cr, text)
    _, ext = layout.get_pixel_extents()
    w, h = ext.width + pad_x * 2, ext.height + pad_y * 2
    cr.save()
    rounded_rect(cr, x, y, w, h, h / 2)
    cr.set_source_rgba(0.08, 0.08, 0.08, 1.0 if opaque else 0.80)
    cr.fill_preserve()
    cr.set_line_width(1)
    cr.set_source_rgba(1, 1, 1, 0.12)
    cr.stroke()
    cr.move_to(x + pad_x - ext.x, y + pad_y - ext.y + 1)
    PangoCairo.layout_path(cr, layout)
    cr.set_source_rgba(0, 0, 0, 0.8)
    cr.fill()
    cr.move_to(x + pad_x - ext.x, y + pad_y - ext.y)
    cr.set_source_rgb(1, 1, 1)
    PangoCairo.show_layout(cr, layout)
    cr.restore()
    return w, h


def paint_window_tile(cr, thumb, badge, x, y, size):
    """A minimized window in the dock: its picture, plus the owning app's icon as a badge."""
    if size < 1:
        return
    if thumb is not None:
        w, h = surface_size(thumb)
        s = size * 0.94 / max(w, h)
        tw, th = w * s, h * s
        tx, ty = x + (size - tw) / 2, y + size - th - size * 0.04
        cr.save()
        cr.rectangle(tx + 1, ty + 2, tw, th)
        cr.set_source_rgba(0, 0, 0, 0.35)
        cr.fill()
        cr.translate(tx, ty)
        cr.scale(s, s)
        cr.set_source_surface(thumb, 0, 0)
        cr.get_source().set_filter(cairo.FILTER_GOOD)
        cr.paint()
        cr.restore()
    else:
        cr.save()
        rounded_rect(cr, x + size * 0.06, y + size * 0.16, size * 0.88, size * 0.78, 4)
        cr.set_source_rgba(0.93, 0.94, 0.96, 0.95)
        cr.fill()
        cr.restore()
    if badge is not None:
        b = size * 0.42
        paint_icon(cr, badge, x + size - b, y + size - b, b)


def paint_stack_icon(cr, surfs, x, y, size):
    """A stack shows its newest items piled up, slightly fanned, newest on top."""
    if size < 1:
        return
    pile = list(reversed(surfs[:3]))
    n = len(pile)
    for i, surf in enumerate(pile):
        depth = n - 1 - i                      # 0 = top of the pile
        s = size * (1 - 0.08 * depth)
        cr.save()
        cx, cy = x + size / 2, y + size - s / 2 - depth * size * 0.07
        cr.translate(cx, cy)
        cr.rotate(math.radians((-6, 5, -3)[depth % 3]) if depth else 0)
        paint_icon(cr, surf, -s / 2, -s / 2, s)
        cr.restore()


def paint_drop_highlight(cr, x, y, size):
    cr.save()
    rounded_rect(cr, x - 4, y - 4, size + 8, size + 8, 10)
    cr.set_source_rgba(1, 1, 1, 0.22)
    cr.fill()
    cr.restore()


def paint_poof(cr, cx, cy, t, size=64):
    """The puff of smoke when an icon is dragged off the dock (t from 0 to 1)."""
    cr.save()
    cr.new_path()
    alpha = max(0.0, 1 - t) ** 1.3
    for i in range(9):
        ang = i * (2 * math.pi / 9) + 0.4
        dist = size * (0.10 + 0.42 * t) * (0.8 + 0.25 * ((i * 37) % 5) / 4)
        r = size * (0.16 + 0.18 * t) * (0.85 + 0.3 * ((i * 53) % 4) / 3)
        px, py = cx + math.cos(ang) * dist, cy + math.sin(ang) * dist * 0.8
        g = cairo.RadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r)
        g.add_color_stop_rgba(0, 1, 1, 1, 0.95 * alpha)
        g.add_color_stop_rgba(0.6, 0.86, 0.87, 0.90, 0.75 * alpha)
        g.add_color_stop_rgba(1, 0.70, 0.72, 0.76, 0.0)
        cr.new_path()
        cr.arc(px, py, r, 0, 2 * math.pi)
        cr.set_source(g)
        cr.fill()
    cr.restore()


def ease_out(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def ease_out_back(t, k=1.4):
    t = max(0.0, min(1.0, t)) - 1
    return 1 + (k + 1) * t ** 3 + k * t ** 2

#!/usr/bin/python3
"""Paladin login screen (a LightDM greeter): the palOS dog, user pictures, password, session and
power controls, in Paladin's light or slate look. Each person's Dark Mode choice and desktop picture
come from LightDM's shared data folder, written by their Paladin session."""
import json
import os
import subprocess
import sys
import time

import cairo  # noqa: F401  (python3-gi-cairo)
import gi
gi.require_foreign('cairo')
gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
gi.require_version('LightDM', '1')
gi.require_version('PangoCairo', '1.0')
from gi.repository import Gdk, GdkPixbuf, GLib, Gtk, LightDM, Pango, PangoCairo  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
CONF = '/etc/paladin-greeter.conf'
STATE = os.path.join(os.environ.get('HOME', '/var/lib/lightdm'), '.paladin-greeter-state')   # last user and session


DEFAULT_WALL = '/usr/share/backgrounds/palos/palOS Pupper.jpg'   # palOS's default desktop picture
SETUP_FLAG = '/var/lib/palos/firstboot'      # present while first-boot setup is still to be done
SETUP_SAFE = '/var/lib/palos/firstboot-safe'  # makes the setup screen draw without the graphics card


def soften(pb):
    """Blur a picture cheaply: shrink it a lot, then draw it back up smoothly (three passes)."""
    w, h = pb.get_width(), pb.get_height()
    small = max(48, w // 28)
    sh = max(27, int(h * small / w))
    out = pb.scale_simple(small, sh, GdkPixbuf.InterpType.BILINEAR)
    for f in (2, 4):
        out = out.scale_simple(small * f, sh * f, GdkPixbuf.InterpType.BILINEAR)
    return out


def log(*a):
    print('paladin-greeter:', *a, file=sys.stderr, flush=True)


def read_conf():
    c = {'appearance': 'auto', 'show-user-list': 'true', 'background': ''}
    try:
        for line in open(CONF):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                c[k.strip()] = v.strip()
    except OSError:
        pass
    return c


def read_state():
    try:
        return json.load(open(STATE))
    except (OSError, ValueError):
        return {}


def write_state(d):
    try:
        with open(STATE, 'w') as f:
            json.dump(d, f)
    except OSError:
        pass


CSS = '''
* { font-family: "Noto Sans", sans-serif; }
window.pl-bg { background-color: @pl_bg; }
.pl-host { color: @pl_dim; font-size: 15px; }
.pl-clock { color: @pl_fg; font-size: 15px; }
.pl-name { color: @pl_fg; font-size: 20px; font-weight: 600; }
.pl-sub { color: @pl_dim; font-size: 13px; }
.pl-msg { color: @pl_err; font-size: 13px; font-weight: 600; }
.pl-hint { color: @pl_dim; font-size: 12px; }

entry.pl-pass {
  min-height: 38px; min-width: 260px; border-radius: 19px; padding: 0 16px;
  background: @pl_field; color: @pl_fg; border: 1px solid @pl_border; box-shadow: none; caret-color: @pl_fg;
}
entry.pl-pass:focus { border-color: @pl_accent; box-shadow: 0 0 0 3px @pl_ring; }

button.pl-go {
  min-width: 38px; min-height: 38px; border-radius: 19px; padding: 0;
  background: @pl_accent; color: #fff; border: none; box-shadow: none; text-shadow: none; -gtk-icon-shadow: none;
}
button.pl-go:hover { background: @pl_accent_hover; }
button.pl-go image { color: #fff; }

button.pl-user {
  border-radius: 14px; padding: 12px 8px 10px; background: transparent; border: none; box-shadow: none; text-shadow: none;
}
button.pl-user:hover { background: @pl_hover; }
button.pl-user:focus { box-shadow: inset 0 0 0 2px @pl_ring; }
button.pl-user label { color: @pl_fg; font-size: 14px; }

button.pl-link, button.pl-power, menubutton.pl-power > button {
  background: transparent; border: none; box-shadow: none; text-shadow: none; color: @pl_dim; border-radius: 10px; padding: 6px 10px;
}
button.pl-link:hover, button.pl-power:hover, menubutton.pl-power > button:hover { background: @pl_hover; color: @pl_fg; }
button.pl-power label, button.pl-link label, menubutton.pl-power label { color: inherit; font-size: 13px; }
button.pl-power image, menubutton.pl-power image { color: inherit; }

.pl-avatar { border-radius: 999px; }
popover, menu { background: @pl_card; color: @pl_fg; }
'''

PALETTES = {
    'light': dict(bg='#dfe3e8', fg='#1b1e22', dim='#5b6470', err='#a33a3a', field='rgba(255,255,255,0.92)', border='#b9bfc7',
                  accent='#4c6278', accent_hover='#3d5164', ring='rgba(76,98,120,0.4)', hover='rgba(27,30,34,0.07)', card='#ffffff',
                  shield='#4c6278', grad=('#eef0f2', '#c9d1da')),
    'dark': dict(bg='#22272d', fg='#eef1f4', dim='#a3acb6', err='#f09a9a', field='rgba(255,255,255,0.08)', border='rgba(255,255,255,0.16)',
                 accent='#56708a', accent_hover='#6a85a1', ring='rgba(120,145,171,0.5)', hover='rgba(255,255,255,0.08)', card='#343a41',
                 shield='#ffffff', grad=('#2e343b', '#16191d')),
}


class Greeter:
    def __init__(self):
        self.conf = read_conf()
        self.state = read_state()
        self.greeter = LightDM.Greeter()
        self.greeter.connect('show-prompt', self.on_prompt)
        self.greeter.connect('show-message', self.on_message)
        self.greeter.connect('authentication-complete', self.on_auth_done)
        try:
            self.greeter.connect_to_daemon_sync()
        except Exception as e:  # noqa: BLE001
            log('could not reach LightDM:', e)
            sys.exit(1)
        self.users = LightDM.UserList.get_instance()
        self.user = None                 # LightDM.User selected
        self.manual = False              # typing a user name ("Other…")
        self.session = None
        self.pending_password = None
        self.mode = None
        self.css = Gtk.CssProvider()
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), self.css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        self.palette_css = Gtk.CssProvider()
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), self.palette_css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        self.css.load_from_data(CSS.encode())
        settings = Gtk.Settings.get_default()
        settings.set_property('gtk-cursor-theme-name', 'Paladin')
        self.bg_pixbuf = None
        self.palette = PALETTES['dark']
        self.build()
        self.set_look(None)
        self.pick_initial_user()
        GLib.timeout_add_seconds(1, self.tick)

    # ------------------------------------------------------------ look
    def user_data(self, name):
        """Dark Mode and wallpaper for a user, from LightDM's shared data folder (written by their session)."""
        if not name:
            return {}
        try:
            d = self.greeter.ensure_shared_data_dir_sync(name)
        except Exception as e:  # noqa: BLE001
            log('no shared data folder for', name, e)
            d = None
        if not d or not os.path.isdir(d):
            d = os.path.join('/var/lib/lightdm-data', name)
        try:
            data = json.load(open(os.path.join(d, 'paladin.json')))
        except (OSError, ValueError) as e:
            log('no Paladin look saved for', name, '(%s)' % e)
            return {}
        wp = os.path.join(d, 'wallpaper')
        data['wallpaper'] = wp if os.path.isfile(wp) else None
        return data

    def set_look(self, name):
        want = self.conf.get('appearance', 'auto')
        data = self.user_data(name) if name else {}
        if want in ('light', 'dark'):
            mode = want
        else:
            mode = 'dark' if data.get('dark', True) else 'light'
        bg = self.conf.get('background') or data.get('wallpaper') or DEFAULT_WALL
        key = (mode, bg)
        if key == self.mode:
            return
        self.mode = key
        p = PALETTES[mode]
        self.palette = p
        defs = ''.join('@define-color pl_%s %s;\n' % (k, v) for k, v in p.items() if isinstance(v, str))
        self.palette_css.load_from_data(defs.encode())
        Gtk.Settings.get_default().set_property('gtk-application-prefer-dark-theme', mode == 'dark')
        self.bg_pixbuf = None
        if bg and os.path.isfile(bg):
            try:
                # a soft-focus copy of the picture (as in palOS): the login box stays the thing to look at
                self.bg_pixbuf = soften(GdkPixbuf.Pixbuf.new_from_file(bg))
            except GLib.Error:
                self.bg_pixbuf = None
        self.shield_img.set_from_pixbuf(self.shield(p['shield']))
        for w in self.bg_windows:
            w.queue_draw()

    def shield(self, color, height=96):
        scale = self.win.get_scale_factor() or 1
        src = GdkPixbuf.Pixbuf.new_from_file(os.path.join(HERE, 'shield.png'))
        h = height * scale
        w = int(src.get_width() * h / src.get_height())
        pb = src.scale_simple(w, h, GdkPixbuf.InterpType.HYPER)
        # recolor: keep alpha, set rgb
        rgba = Gdk.RGBA(); rgba.parse(color)
        r, g, b = int(rgba.red * 255), int(rgba.green * 255), int(rgba.blue * 255)
        px = bytearray(pb.get_pixels())
        n = pb.get_n_channels(); stride = pb.get_rowstride()
        for y in range(pb.get_height()):
            for x in range(pb.get_width()):
                i = y * stride + x * n
                px[i], px[i + 1], px[i + 2] = r, g, b
        out = GdkPixbuf.Pixbuf.new_from_bytes(GLib.Bytes.new(bytes(px)), GdkPixbuf.Colorspace.RGB, True, 8, pb.get_width(), pb.get_height(), stride)
        if scale > 1:
            return out   # GtkImage shows it at device pixels; acceptable for a logo
        return out

    def draw_bg(self, widget, cr):
        a = widget.get_allocation()
        p = self.palette
        if self.bg_pixbuf:
            pw, ph = self.bg_pixbuf.get_width(), self.bg_pixbuf.get_height()
            k = max(a.width / pw, a.height / ph)
            cr.save()
            cr.translate((a.width - pw * k) / 2, (a.height - ph * k) / 2)
            cr.scale(k, k)
            Gdk.cairo_set_source_pixbuf(cr, self.bg_pixbuf, 0, 0)
            cr.paint()
            cr.restore()
            # dim it so the login box reads well
            c = Gdk.RGBA(); c.parse(p['grad'][1])
            cr.set_source_rgba(c.red, c.green, c.blue, 0.55)
            cr.paint()
        else:
            g = cairo.LinearGradient(0, 0, 0, a.height)
            for off, col in ((0, p['grad'][0]), (1, p['grad'][1])):
                c = Gdk.RGBA(); c.parse(col)
                g.add_color_stop_rgb(off, c.red, c.green, c.blue)
            cr.set_source(g)
            cr.paint()
        return False

    # ------------------------------------------------------------ layout
    def build(self):
        display = Gdk.Display.get_default()
        self.bg_windows = []
        primary = display.get_primary_monitor() or display.get_monitor(0)
        for i in range(display.get_n_monitors()):
            m = display.get_monitor(i)
            geo = m.get_geometry()
            w = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
            w.get_style_context().add_class('pl-bg')
            w.set_decorated(False)
            w.move(geo.x, geo.y)
            w.set_default_size(geo.width, geo.height)
            w.set_app_paintable(True)
            w.connect('draw', self.draw_bg)
            self.bg_windows.append(w)
            if m == primary:
                self.win = w
        self.win.add(self.build_main())
        for w in self.bg_windows:
            w.show_all()
            w.get_window().set_cursor(Gdk.Cursor.new_from_name(display, 'default'))
        self.win.present()

    def build_main(self):
        root = Gtk.Overlay()
        center = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0, halign=Gtk.Align.CENTER, valign=Gtk.Align.CENTER)
        self.shield_img = Gtk.Image()
        center.pack_start(self.shield_img, False, False, 0)
        host = Gtk.Label(label=LightDM.get_hostname() or 'palOS')
        host.get_style_context().add_class('pl-host')
        host.set_margin_top(14)
        host.set_margin_bottom(34)
        center.pack_start(host, False, False, 0)

        self.stack = Gtk.Stack(transition_type=Gtk.StackTransitionType.CROSSFADE, transition_duration=160)
        self.stack.set_size_request(560, 250)
        self.stack.add_named(self.build_list(), 'list')
        self.stack.add_named(self.build_login(), 'login')
        self.stack.add_named(self.build_setup(), 'setup')
        center.pack_start(self.stack, False, False, 0)
        root.add(center)

        # top: clock
        self.clock = Gtk.Label(halign=Gtk.Align.END, valign=Gtk.Align.START, margin_top=14, margin_end=20)
        self.clock.get_style_context().add_class('pl-clock')
        root.add_overlay(self.clock)

        # bottom: session + power
        bottom = Gtk.Box(spacing=6, halign=Gtk.Align.CENTER, valign=Gtk.Align.END, margin_bottom=26)
        self.session_btn = Gtk.MenuButton()
        self.session_btn.get_style_context().add_class('pl-power')
        self.session_lbl = Gtk.Label()
        sb = Gtk.Box(spacing=6)
        sb.pack_start(Gtk.Image.new_from_icon_name('preferences-desktop-display-symbolic', Gtk.IconSize.BUTTON), False, False, 0)
        sb.pack_start(self.session_lbl, False, False, 0)
        self.session_btn.add(sb)
        self.session_btn.set_popover(self.session_menu())
        bottom.pack_start(self.session_btn, False, False, 0)
        for label, icon, fn, ok in (('Sleep', 'weather-clear-night-symbolic', LightDM.suspend, LightDM.get_can_suspend()),
                                    ('Restart', 'view-refresh-symbolic', LightDM.restart, LightDM.get_can_restart()),
                                    ('Shut Down', 'system-shutdown-symbolic', LightDM.shutdown, LightDM.get_can_shutdown())):
            b = Gtk.Button()
            b.get_style_context().add_class('pl-power')
            bx = Gtk.Box(spacing=6)
            bx.pack_start(Gtk.Image.new_from_icon_name(icon, Gtk.IconSize.BUTTON), False, False, 0)
            bx.pack_start(Gtk.Label(label=label), False, False, 0)
            b.add(bx)
            b.set_sensitive(bool(ok))
            b.connect('clicked', lambda _b, f=fn, l=label: self.power(f, l))
            bottom.pack_start(b, False, False, 0)
        # Duet: palOS and Windows share the computer. Startup Disk starts the other one, once.
        self.startup_disks = self.read_startup_disks()
        if any(e['name'] == 'Windows' for e in self.startup_disks):
            b = Gtk.Button()
            b.get_style_context().add_class('pl-power')
            bx = Gtk.Box(spacing=6)
            bx.pack_start(Gtk.Image.new_from_icon_name('drive-harddisk-symbolic', Gtk.IconSize.BUTTON), False, False, 0)
            bx.pack_start(Gtk.Label(label='Startup Disk…'), False, False, 0)
            b.add(bx)
            b.connect('clicked', lambda _b: self.choose_startup_disk())
            bottom.pack_start(b, False, False, 0)
        root.add_overlay(bottom)
        return root

    def read_startup_disks(self):
        try:
            r = subprocess.run(['sudo', '-n', '/usr/lib/palos-boot/palos-startup-disk', 'list'], capture_output=True, text=True, timeout=10)
            return json.loads(r.stdout or '[]')
        except Exception as e:  # noqa: BLE001
            log('startup disks:', e)
            return []

    def choose_startup_disk(self):
        win = next((e for e in self.startup_disks if e['name'] == 'Windows'), None)
        if not win:
            return
        d = Gtk.MessageDialog(transient_for=self.windows[0] if getattr(self, 'windows', None) else None, modal=True,
                              message_type=Gtk.MessageType.QUESTION, buttons=Gtk.ButtonsType.NONE, text='Restart in Windows?')
        d.format_secondary_text('The computer restarts in Windows this once. Next time it starts, it’s palOS again.')
        d.add_buttons('Cancel', Gtk.ResponseType.CANCEL, 'Restart in Windows', Gtk.ResponseType.OK)
        d.set_default_response(Gtk.ResponseType.OK)
        ok = d.run() == Gtk.ResponseType.OK
        d.destroy()
        if ok:
            r = subprocess.run(['sudo', '-n', '/usr/lib/palos-boot/palos-startup-disk', 'next', win['id']], capture_output=True, text=True, timeout=20)
            if r.returncode == 0:
                LightDM.restart()
            else:
                log('startup disk failed:', r.stderr)

    def build_list(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10, halign=Gtk.Align.CENTER)
        self.flow = Gtk.FlowBox(selection_mode=Gtk.SelectionMode.NONE, homogeneous=True, max_children_per_line=5,
                                column_spacing=8, row_spacing=8, halign=Gtk.Align.CENTER)
        box.pack_start(self.flow, False, False, 0)
        self.fill_users()
        self.users.connect('user-added', lambda *_: self.fill_users())
        self.users.connect('user-removed', lambda *_: self.fill_users())
        return box

    def avatar(self, user, size):
        scale = self.win.get_scale_factor() if hasattr(self, 'win') else 1
        img = user.get_image() if user else None
        pb = None
        if img and os.path.isfile(img):
            try:
                pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(img, size, size, False)
            except GLib.Error:
                pb = None
        area = Gtk.DrawingArea(halign=Gtk.Align.CENTER, valign=Gtk.Align.CENTER)
        area.set_size_request(size, size)
        name = (user.get_display_name() or user.get_name()) if user else '?'

        def draw(w, cr):
            import math
            cr.arc(size / 2, size / 2, size / 2, 0, 2 * math.pi)
            cr.clip()
            if pb:
                Gdk.cairo_set_source_pixbuf(cr, pb, 0, 0)
                cr.paint()
            else:
                c = Gdk.RGBA(); c.parse(self.palette['accent'])
                cr.set_source_rgb(c.red, c.green, c.blue)
                cr.paint()
                layout = w.create_pango_layout((name.strip()[:1] or '?').upper())
                layout.set_font_description(Pango.FontDescription('Noto Sans Medium %d' % int(size * 0.36)))
                tw, th = layout.get_pixel_size()
                cr.set_source_rgb(1, 1, 1)
                cr.move_to((size - tw) / 2, (size - th) / 2)
                PangoCairo.show_layout(cr, layout)
            return False
        area.connect('draw', draw)
        return area

    def fill_users(self):
        for c in self.flow.get_children():
            self.flow.remove(c)
        users = [u for u in self.users.get_users()]
        show_other = bool(self.greeter.get_show_manual_login_hint() or not users)
        self.flow.set_max_children_per_line(max(1, min(5, len(users) + (1 if show_other else 0))))
        self.flow.set_min_children_per_line(max(1, min(5, len(users) + (1 if show_other else 0))))
        for u in users:
            b = Gtk.Button(relief=Gtk.ReliefStyle.NONE)
            b.get_style_context().add_class('pl-user')
            v = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
            v.pack_start(self.avatar(u, 84), False, False, 0)
            lbl = Gtk.Label(label=u.get_display_name() or u.get_name(), max_width_chars=14, ellipsize=Pango.EllipsizeMode.END)
            v.pack_start(lbl, False, False, 0)
            if u.get_logged_in():
                dot = Gtk.Label(label='Signed in')
                dot.get_style_context().add_class('pl-hint')
                v.pack_start(dot, False, False, 0)
            b.add(v)
            b.connect('clicked', lambda _b, user=u: self.choose(user))
            b.set_size_request(120, -1)
            self.flow.add(b)
        other = Gtk.Button(relief=Gtk.ReliefStyle.NONE)
        other.get_style_context().add_class('pl-user')
        v = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        v.pack_start(self.avatar(None, 84), False, False, 0)
        v.pack_start(Gtk.Label(label='Other…'), False, False, 0)
        other.add(v)
        other.connect('clicked', lambda *_: self.choose(None))
        other.set_size_request(120, -1)
        if show_other:
            self.flow.add(other)
        self.flow.show_all()

    def build_login(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0, halign=Gtk.Align.CENTER)
        self.login_avatar = Gtk.Box(halign=Gtk.Align.CENTER)
        box.pack_start(self.login_avatar, False, False, 0)
        self.name_lbl = Gtk.Label(margin_top=12)
        self.name_lbl.get_style_context().add_class('pl-name')
        box.pack_start(self.name_lbl, False, False, 0)
        self.name_entry = Gtk.Entry(placeholder_text='Name', margin_top=12)
        self.name_entry.get_style_context().add_class('pl-pass')
        self.name_entry.connect('activate', lambda *_: self.password.grab_focus())
        box.pack_start(self.name_entry, False, False, 0)
        row = Gtk.Box(spacing=8, margin_top=16, halign=Gtk.Align.CENTER)
        self.password = Gtk.Entry(visibility=False, placeholder_text='Password', input_purpose=Gtk.InputPurpose.PASSWORD)
        self.password.get_style_context().add_class('pl-pass')
        self.password.connect('activate', lambda *_: self.submit())
        self.password.connect('key-press-event', self.caps_check)
        row.pack_start(self.password, False, False, 0)
        self.go = Gtk.Button()
        self.go.add(Gtk.Image.new_from_icon_name('go-next-symbolic', Gtk.IconSize.BUTTON))
        self.go.get_style_context().add_class('pl-go')
        self.go.set_tooltip_text('Log In')
        self.go.connect('clicked', lambda *_: self.submit())
        row.pack_start(self.go, False, False, 0)
        box.pack_start(row, False, False, 0)
        self.msg = Gtk.Label(margin_top=10)
        self.msg.get_style_context().add_class('pl-msg')
        box.pack_start(self.msg, False, False, 0)
        self.caps = Gtk.Label(label='Caps Lock is on', margin_top=4)
        self.caps.get_style_context().add_class('pl-hint')
        self.caps.set_no_show_all(True)
        box.pack_start(self.caps, False, False, 0)
        self.back = Gtk.Button(label='Back', halign=Gtk.Align.CENTER, margin_top=14)
        self.back.get_style_context().add_class('pl-link')
        self.back.connect('clicked', lambda *_: self.show_list())
        box.pack_start(self.back, False, False, 0)
        return box

    def build_setup(self):
        """Shown while this computer has no accounts yet and setup is still to be done (setup runs from here)."""
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0, halign=Gtk.Align.CENTER)
        t = Gtk.Label(label='Let’s finish setting up palOS')
        t.get_style_context().add_class('pl-name')
        box.pack_start(t, False, False, 0)
        s = Gtk.Label(label='This computer doesn’t have an account yet.', margin_top=8)
        s.get_style_context().add_class('pl-sub')
        box.pack_start(s, False, False, 0)
        self.setup_btn = Gtk.Button(label='Set Up This Computer', halign=Gtk.Align.CENTER, margin_top=22)
        self.setup_btn.get_style_context().add_class('pl-go')
        self.setup_btn.connect('clicked', lambda *_: self.start_setup(False))
        box.pack_start(self.setup_btn, False, False, 0)
        safe = Gtk.Button(label='Trouble? Set up in safe graphics mode', halign=Gtk.Align.CENTER, margin_top=10)
        safe.get_style_context().add_class('pl-link')
        safe.connect('clicked', lambda *_: self.start_setup(True))
        box.pack_start(safe, False, False, 0)
        self.setup_msg = Gtk.Label(margin_top=10)
        self.setup_msg.get_style_context().add_class('pl-msg')
        box.pack_start(self.setup_msg, False, False, 0)
        return box

    def setup_pending(self):
        try:
            return os.path.exists(SETUP_FLAG) and not self.users.get_users()
        except Exception:  # noqa: BLE001
            return False

    def start_setup(self, safe):
        """Run palOS setup right here, on the login screen (LightDM's automatic start of the setup session
        didn't happen or didn't work on this computer). Setup draws over the login screen; when it
        finishes, the computer switches to the normal login screen by itself."""
        try:
            if safe:
                open(SETUP_SAFE, 'w').close()
            elif os.path.exists(SETUP_SAFE):
                os.remove(SETUP_SAFE)
        except OSError as e:
            log('safe-mode flag:', e)
        self.setup_msg.set_text('Starting setup…')
        self.setup_btn.set_sensitive(False)
        env = dict(os.environ, PALOS_SETUP_FROM='login screen')
        try:
            pid, _, _, _ = GLib.spawn_async(['/usr/lib/palos-firstboot/run-setup'], envp=['%s=%s' % kv for kv in env.items()],
                                            flags=GLib.SpawnFlags.DO_NOT_REAP_CHILD)
        except GLib.Error as e:
            log('setup could not start:', e)
            self.setup_fail()
            return
        self.setup_started = time.time()
        GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, self.setup_ended)
        # keep the login screen out of the way underneath setup
        GLib.timeout_add(1500, self.hide_for_setup)

    def hide_for_setup(self):
        if self.setup_running():
            for w in self.bg_windows:
                w.hide()
        return False

    def setup_running(self):
        return getattr(self, 'setup_started', None) is not None

    def setup_ended(self, pid, status):
        self.setup_started = None
        GLib.spawn_close_pid(pid)
        if not os.path.exists(SETUP_FLAG):
            return          # setup finished: the normal login screen is on its way
        for w in self.bg_windows:
            w.show_all()
        self.setup_fail()

    def setup_fail(self):
        self.setup_btn.set_sensitive(True)
        self.setup_msg.set_text('Setup stopped before it was finished. Try again, or try safe graphics mode.')

    # ------------------------------------------------------------ sessions
    def sessions(self):
        return [s for s in LightDM.get_sessions()]

    def session_menu(self):
        pop = Gtk.Popover()
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2, margin=8)
        group = None
        for s in self.sessions():
            r = Gtk.RadioButton.new_with_label_from_widget(group, s.get_name())
            group = group or r
            r.connect('toggled', lambda w, key=s.get_key(): w.get_active() and self.set_session(key))
            r._key = s.get_key()
            box.pack_start(r, False, False, 0)
        box.show_all()
        pop.add(box)
        self.session_radios = box
        return pop

    def set_session(self, key):
        self.session = key
        name = next((s.get_name() for s in self.sessions() if s.get_key() == key), key or '')
        self.session_lbl.set_text(name or 'Session')
        for r in self.session_radios.get_children():
            if getattr(r, '_key', None) == key and not r.get_active():
                r.set_active(True)

    def default_session(self, user):
        keys = [s.get_key() for s in self.sessions()]
        for k in ((user.get_session() if user else None), self.state.get('session'), self.greeter.get_default_session_hint(), 'paladin'):
            if k and k in keys:
                return k
        return keys[0] if keys else None

    # ------------------------------------------------------------ flow
    def locked(self):
        try:
            return bool(self.greeter.get_lock_hint())
        except Exception:  # noqa: BLE001
            return False

    def pick_initial_user(self):
        users = self.users.get_users()
        if self.setup_pending():
            # Setup should have started by itself instead of this login screen. Run it from here.
            self.set_look(None)
            self.stack.set_visible_child_name('setup')
            GLib.timeout_add(600, lambda: self.start_setup(os.path.exists(SETUP_SAFE)) and False)
            return
        hint = self.greeter.get_select_user_hint() or self.state.get('user')
        if self.locked():
            # The screen lock: show only the person who is signed in, as the login screen would.
            locked_user = next((u for u in users if u.get_name() == hint), None)
            if locked_user:
                self.choose(locked_user)
                self.back.set_visible(False)
                return
        chosen = next((u for u in users if u.get_name() == hint), None)
        if self.greeter.get_hide_users_hint() or self.conf.get('show-user-list') == 'false':
            self.choose(None)
        elif len(users) == 1:
            self.choose(users[0])
        elif chosen:
            self.choose(chosen)
        else:
            self.show_list()

    def show_list(self):
        if self.greeter.get_in_authentication():
            self.greeter.cancel_authentication()
        self.user = None
        self.set_look(self.state.get('user'))
        self.set_session(self.default_session(None))
        if len(self.users.get_users()) <= 1 and not self.greeter.get_show_manual_login_hint():
            self.choose(self.users.get_users()[0] if self.users.get_users() else None)
            return
        self.stack.set_visible_child_name('list')

    def choose(self, user):
        self.user = user
        self.manual = user is None
        for c in self.login_avatar.get_children():
            self.login_avatar.remove(c)
        self.login_avatar.pack_start(self.avatar(user, 96), False, False, 0)
        self.login_avatar.show_all()
        self.name_lbl.set_text(user.get_display_name() or user.get_name() if user else 'Other User')
        self.name_entry.set_visible(self.manual)
        self.name_entry.set_text('')
        self.password.set_text('')
        self.msg.set_text('')
        many = len(self.users.get_users()) > 1 or self.greeter.get_show_manual_login_hint()
        self.back.set_visible(bool(many) and not (self.greeter.get_hide_users_hint()))
        self.set_look(user.get_name() if user else None)
        self.set_session(self.default_session(user))
        self.stack.set_visible_child_name('login')
        (self.name_entry if self.manual else self.password).grab_focus()
        if user:
            self.start_auth(user.get_name())

    def start_auth(self, name):
        if self.greeter.get_in_authentication():
            self.greeter.cancel_authentication()
        self.pending_password = None
        self.greeter.authenticate(name)

    def submit(self):
        if self.manual:
            name = self.name_entry.get_text().strip()
            if not name:
                self.name_entry.grab_focus()
                return
            self.pending_password = self.password.get_text()
            self.start_auth(name)
            self.pending_password = self.password.get_text()
            self.busy(True)
            return
        if not self.greeter.get_in_authentication() and self.user:
            self.start_auth(self.user.get_name())
        self.pending_password = self.password.get_text()
        self.busy(True)
        if self.waiting_prompt:
            self.answer()

    waiting_prompt = False

    def busy(self, on):
        self.password.set_sensitive(not on)
        self.go.set_sensitive(not on)
        self.name_entry.set_sensitive(not on)

    def answer(self):
        if self.pending_password is None:
            return
        self.waiting_prompt = False
        pw, self.pending_password = self.pending_password, None
        self.greeter.respond(pw)

    def on_prompt(self, greeter, text, kind):
        if kind == LightDM.PromptType.SECRET:
            self.waiting_prompt = True
            if self.pending_password is not None:
                self.answer()
        else:   # a user name question (manual login without a name yet)
            name = self.name_entry.get_text().strip()
            greeter.respond(name)

    def on_message(self, greeter, text, kind):
        if kind == LightDM.MessageType.ERROR:
            self.msg.set_text(text)

    def on_auth_done(self, greeter):
        if greeter.get_is_authenticated():
            user = greeter.get_authentication_user()
            if not self.locked():
                self.state.update(user=user, session=self.session)
                write_state(self.state)
            try:
                greeter.start_session_sync(self.session)
                return
            except GLib.Error as e:
                log('session failed to start:', e)
                self.msg.set_text('That session couldn’t start. Choose another session below.')
        else:
            self.msg.set_text('Incorrect password. Try again.')
            self.shake()
        self.busy(False)
        self.password.set_text('')
        self.password.grab_focus()
        name = self.user.get_name() if self.user else self.name_entry.get_text().strip()
        if name:
            self.start_auth(name)

    def shake(self):
        steps = [12, -12, 9, -9, 5, -5, 0]

        def step(i=[0]):
            if i[0] >= len(steps):
                self.stack.set_margin_start(0); self.stack.set_margin_end(0)
                return False
            d = steps[i[0]]
            self.stack.set_margin_start(max(0, d)); self.stack.set_margin_end(max(0, -d))
            i[0] += 1
            return True
        GLib.timeout_add(45, step)

    def caps_check(self, *_):
        GLib.idle_add(lambda: self.caps.set_visible(Gdk.Keymap.get_for_display(Gdk.Display.get_default()).get_caps_lock_state()) and False)
        return False

    def power(self, fn, label):
        try:
            fn()
        except GLib.Error as e:
            self.msg.set_text('%s isn’t possible right now.' % label)
            log(label, e)

    def tick(self):
        now = time.localtime()
        use24 = self.conf.get('clock-24h', 'false') == 'true'
        self.clock.set_text(time.strftime('%a %b %-d  %H:%M' if use24 else '%a %b %-d  %-I:%M %p', now))
        return True


def main():
    Greeter()
    Gtk.main()


if __name__ == '__main__':
    main()

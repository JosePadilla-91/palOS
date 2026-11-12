"""Dock Preferences window, laid out like the classic."""
import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk  # noqa: E402
try:  # palOS: this program in the person's language
    import palos_l10n; palos_l10n.install_gtk(); _ = palos_l10n.tr
except Exception:  # noqa: BLE001
    _ = str

_window = None


def show(cfg, have_compiz):
    global _window
    if _window is not None:
        _window.present()
        return
    _window = Prefs(cfg, have_compiz)
    _window.connect('destroy', _cleared)
    _window.show_all()


def _cleared(*_):
    global _window
    _window = None


class Prefs(Gtk.Window):
    def __init__(self, cfg, have_compiz):
        super().__init__(title='Dock')
        self.cfg = cfg
        self.set_resizable(False)
        self.set_keep_above(True)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_icon_name('paladin-dock')
        grid = Gtk.Grid(column_spacing=12, row_spacing=10, margin=22)
        self.add(grid)
        row = 0

        def caption(text):
            lbl = Gtk.Label(label=text, xalign=1)
            return lbl

        def scale_row(text, lo, hi, value, key, left='Small', right='Large'):
            nonlocal row
            grid.attach(caption(text), 0, row, 1, 1)
            box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
            sc = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, lo, hi, 1)
            sc.set_draw_value(False)
            sc.set_value(value)
            sc.set_size_request(260, -1)
            sc.connect('value-changed', lambda s: self._set_size(key, int(s.get_value())))
            sc.connect('button-release-event', lambda *_: (cfg.save(), False)[1])
            ends = Gtk.Box()
            ends.pack_start(Gtk.Label(label=left), False, False, 0)
            ends.pack_end(Gtk.Label(label=right), False, False, 0)
            for w in ends.get_children():
                w.get_style_context().add_class('dim-label')
            box.add(sc)
            box.add(ends)
            grid.attach(box, 1, row, 2, 1)
            row += 1
            return sc

        scale_row('Size:', 24, 128, cfg['icon_size'], 'icon_size')

        mag_check = Gtk.CheckButton(label='Magnification:')
        mag_check.set_active(cfg['magnify'])
        grid.attach(mag_check, 0, row, 1, 1)
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        mag = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 24, 192, 1)
        mag.set_draw_value(False)
        mag.set_value(cfg['magnify_size'])
        mag.set_sensitive(cfg['magnify'])
        mag.connect('value-changed', lambda s: self._set_size('magnify_size', int(s.get_value())))
        mag.connect('button-release-event', lambda *_: (cfg.save(), False)[1])
        ends = Gtk.Box()
        ends.pack_start(Gtk.Label(label='Min'), False, False, 0)
        ends.pack_end(Gtk.Label(label='Max'), False, False, 0)
        box.add(mag)
        box.add(ends)
        grid.attach(box, 1, row, 2, 1)
        mag_check.connect('toggled', lambda b: (mag.set_sensitive(b.get_active()), cfg.set(magnify=b.get_active())))
        row += 1

        grid.attach(caption('Position on screen:'), 0, row, 1, 1)
        left = Gtk.RadioButton.new_with_label(None, 'Left')
        bottom = Gtk.RadioButton.new_with_label_from_widget(left, 'Bottom')
        (left if cfg['position'] == 'left' else bottom).set_active(True)
        left.connect('toggled', lambda b: b.get_active() and cfg.set(position='left'))
        bottom.connect('toggled', lambda b: b.get_active() and cfg.set(position='bottom'))
        pos = Gtk.Box(spacing=18)
        pos.add(left)
        pos.add(bottom)
        grid.attach(pos, 1, row, 2, 1)
        row += 1

        grid.attach(caption('Minimize using:'), 0, row, 1, 1)
        combo = Gtk.ComboBoxText()
        combo.append('magic_lamp', 'Magic Lamp Effect')
        combo.append('scale', 'Shrink Effect')
        combo.set_active_id(cfg['minimize_effect'])
        combo.connect('changed', lambda c: cfg.set(minimize_effect=c.get_active_id()))
        combo.set_sensitive(have_compiz)
        if not have_compiz:
            combo.set_tooltip_text('Minimize effects are drawn by Compiz, which is not running.')
        grid.attach(combo, 1, row, 1, 1)
        row += 1

        for text, key in (('Minimize windows into application icon', 'minimize_into_app'),
                          ('Animate opening applications', 'animate_launch'),
                          ('Automatically hide and show the Dock', 'autohide')):
            cb = Gtk.CheckButton(label=text)
            cb.set_active(bool(cfg[key]))
            cb.connect('toggled', lambda b, k=key: cfg.set(**{k: b.get_active()}))
            grid.attach(cb, 1, row, 2, 1)
            row += 1

    def _set_size(self, key, value):
        changes = {key: value}
        if key == 'icon_size' and self.cfg['magnify_size'] < value:
            changes['magnify_size'] = value
        self.cfg.set(save=False, **changes)

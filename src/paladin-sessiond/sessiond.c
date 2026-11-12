/* paladin-sessiond: palOS's session service. Notifications (the bubbles at the top right, the freedesktop
   Notifications service apps talk to) and palOS's keys (volume, brightness, media, screenshots, lock, the
   screen reader: /etc/paladin-session/keys.conf). Started by paladin-session. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <unistd.h>
#include <gio/gio.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/XKBlib.h>
#include <cairo/cairo.h>
#include <cairo/cairo-xlib.h>
#include <pango/pangocairo.h>
#include "../libpalos/l10n.h"

#define KEYS_CONF "/etc/paladin-session/keys.conf"
#define BW 340              /* bubble width */
#define MARGIN 12
#define GAP 8
#define MAX_SHOWN 5

static Display *dpy;
static int scr;
static Window root;
static Visual *argb; static Colormap argb_cmap;
static Atom a_dark, a_workarea, a_type, a_type_notification;
static GDBusConnection *bus;
static guint32 next_id = 1;

/* ---------------------------------------------------------------- notifications */
typedef struct {
    guint32 id;
    char *app, *summary, *body, *icon_path;
    char **actions;             /* key, label, key, label… */
    cairo_surface_t *image;
    int urgency;
    gboolean resident, transient;
    int timeout_ms;
    guint timer;
    Window win;
    int h, y;
    int hover;                  /* -2 close, -1 body, 0.. action index */
    double opacity;
} Note;

static GList *notes;            /* newest first */

static gboolean dark(void)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    gboolean d = FALSE;
    if (XGetWindowProperty(dpy, root, a_dark, 0, 1, False, XA_CARDINAL, &type, &fmt, &n, &after, &data) == Success && data && n)
        d = *(long *)data != 0;
    if (data) XFree(data);
    return d;
}

static int top_y(void)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    int y = 24;
    if (XGetWindowProperty(dpy, root, a_workarea, 0, 4, False, XA_CARDINAL, &type, &fmt, &n, &after, &data) == Success && data && n >= 2)
        y = (int)((long *)data)[1];
    if (data) XFree(data);
    return y + MARGIN;
}

static void emit_closed(guint32 id, guint32 reason)
{
    g_dbus_connection_emit_signal(bus, NULL, "/org/freedesktop/Notifications", "org.freedesktop.Notifications",
                                  "NotificationClosed", g_variant_new("(uu)", id, reason), NULL);
}

static void emit_action(guint32 id, const char *key)
{
    g_dbus_connection_emit_signal(bus, NULL, "/org/freedesktop/Notifications", "org.freedesktop.Notifications",
                                  "ActionInvoked", g_variant_new("(us)", id, key), NULL);
}

static PangoLayout *text(cairo_t *cr, const char *s, const char *font, int width, gboolean markup, int lines)
{
    PangoLayout *l = pango_cairo_create_layout(cr);
    PangoFontDescription *f = pango_font_description_from_string(font);
    pango_layout_set_font_description(l, f);
    pango_font_description_free(f);
    if (markup && pango_parse_markup(s, -1, 0, NULL, NULL, NULL, NULL)) pango_layout_set_markup(l, s, -1);
    else pango_layout_set_text(l, s ? s : "", -1);
    pango_layout_set_width(l, width * PANGO_SCALE);
    pango_layout_set_wrap(l, PANGO_WRAP_WORD_CHAR);
    pango_layout_set_ellipsize(l, PANGO_ELLIPSIZE_END);
    if (lines) pango_layout_set_height(l, -lines);
    return l;
}

static void rrect(cairo_t *cr, double x, double y, double w, double h, double r)
{
    cairo_new_sub_path(cr);
    cairo_arc(cr, x + w - r, y + r, r, -M_PI / 2, 0);
    cairo_arc(cr, x + w - r, y + h - r, r, 0, M_PI / 2);
    cairo_arc(cr, x + r, y + h - r, r, M_PI / 2, M_PI);
    cairo_arc(cr, x + r, y + r, r, M_PI, 1.5 * M_PI);
    cairo_close_path(cr);
}

static int n_actions(Note *n)
{
    int c = 0;
    for (char **a = n->actions; a && a[0] && a[1]; a += 2) if (strcmp(a[0], "default")) c++;
    return c;
}

static int text_left(Note *n) { return n->image ? 14 + 44 + 12 : 16; }

static int measure(Note *n)
{
    cairo_surface_t *s = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, 1, 1);
    cairo_t *cr = cairo_create(s);
    int tw = BW - text_left(n) - 16, w, h1 = 0, h2 = 0;
    PangoLayout *t = text(cr, n->summary, "Noto Sans Bold 10", tw, FALSE, 2);
    pango_layout_get_pixel_size(t, &w, &h1); g_object_unref(t);
    if (n->body && *n->body) { PangoLayout *b = text(cr, n->body, "Noto Sans 9.5", tw, TRUE, 4); pango_layout_get_pixel_size(b, &w, &h2); g_object_unref(b); }
    cairo_destroy(cr); cairo_surface_destroy(s);
    int h = 14 + h1 + (h2 ? 3 + h2 : 0) + 14;
    if (n->image && h < 14 + 44 + 14) h = 14 + 44 + 14;
    if (n_actions(n)) h += 34;
    return h;
}

static void draw(Note *n)
{
    if (!n->win) return;
    cairo_surface_t *ws = cairo_xlib_surface_create(dpy, n->win, argb ? argb : DefaultVisual(dpy, scr), BW, n->h);
    cairo_surface_t *s = cairo_surface_create_similar(ws, CAIRO_CONTENT_COLOR_ALPHA, BW, n->h);
    cairo_t *cr = cairo_create(s);
    gboolean dk = dark();
    cairo_set_operator(cr, CAIRO_OPERATOR_SOURCE);
    cairo_set_source_rgba(cr, 0, 0, 0, 0); cairo_paint(cr);
    cairo_set_operator(cr, CAIRO_OPERATOR_OVER);
    rrect(cr, 0.5, 0.5, BW - 1, n->h - 1, 12);
    if (dk) cairo_set_source_rgba(cr, .17, .18, .20, .96); else cairo_set_source_rgba(cr, .97, .97, .98, .97);
    cairo_fill_preserve(cr);
    cairo_set_source_rgba(cr, dk ? 1 : 0, dk ? 1 : 0, dk ? 1 : 0, dk ? .14 : .12);
    cairo_set_line_width(cr, 1); cairo_stroke(cr);
    if (n->urgency == 2) { rrect(cr, 0.5, 0.5, 4, n->h - 1, 2); cairo_set_source_rgb(cr, .85, .25, .22); cairo_fill(cr); }

    if (n->image) {
        int iw = cairo_image_surface_get_width(n->image), ih = cairo_image_surface_get_height(n->image);
        double k = 44.0 / MAX(iw, ih);
        cairo_save(cr);
        cairo_translate(cr, 14, 14);
        rrect(cr, 0, 0, 44, 44, 8); cairo_clip(cr);
        cairo_translate(cr, (44 - iw * k) / 2, (44 - ih * k) / 2);
        cairo_scale(cr, k, k);
        cairo_set_source_surface(cr, n->image, 0, 0);
        cairo_pattern_set_filter(cairo_get_source(cr), CAIRO_FILTER_GOOD);
        cairo_paint(cr);
        cairo_restore(cr);
    }
    double fg = dk ? .93 : .10, sub = dk ? .72 : .33;
    int x = text_left(n), y = 14, tw = BW - x - 16, w, h;
    PangoLayout *t = text(cr, n->summary, "Noto Sans Bold 10", tw, FALSE, 2);
    cairo_set_source_rgb(cr, fg, fg, fg);
    cairo_move_to(cr, x, y); pango_cairo_show_layout(cr, t);
    pango_layout_get_pixel_size(t, &w, &h); y += h + 3;
    g_object_unref(t);
    if (n->body && *n->body) {
        PangoLayout *b = text(cr, n->body, "Noto Sans 9.5", tw, TRUE, 4);
        cairo_set_source_rgb(cr, sub, sub, sub);
        cairo_move_to(cr, x, y); pango_cairo_show_layout(cr, b);
        g_object_unref(b);
    }
    /* the close button, when the pointer is on the bubble */
    if (n->hover != -3) {
        double cx = 10, cy = 10;
        cairo_arc(cr, cx, cy, 8, 0, 2 * M_PI);
        if (dk) cairo_set_source_rgba(cr, .35, .36, .38, n->hover == -2 ? 1 : .9); else cairo_set_source_rgba(cr, .82, .83, .85, n->hover == -2 ? 1 : .9);
        cairo_fill(cr);
        cairo_set_source_rgb(cr, fg, fg, fg);
        cairo_set_line_width(cr, 1.4);
        cairo_move_to(cr, cx - 3, cy - 3); cairo_line_to(cr, cx + 3, cy + 3);
        cairo_move_to(cr, cx + 3, cy - 3); cairo_line_to(cr, cx - 3, cy + 3);
        cairo_stroke(cr);
    }
    /* actions along the bottom */
    int na = n_actions(n);
    if (na) {
        int bw = (BW - 16 * 2 - 8 * (na - 1)) / na, bx = 16, by = n->h - 12 - 24, i = 0;
        for (char **a = n->actions; a && a[0] && a[1]; a += 2) {
            if (!strcmp(a[0], "default")) continue;
            rrect(cr, bx + .5, by + .5, bw - 1, 23, 6);
            double b = dk ? (n->hover == i ? .34 : .27) : (n->hover == i ? 1 : .93);
            cairo_set_source_rgb(cr, b, b, b); cairo_fill_preserve(cr);
            cairo_set_source_rgba(cr, 0, 0, 0, dk ? .5 : .18); cairo_stroke(cr);
            PangoLayout *l = text(cr, a[1], "Noto Sans 9", bw - 12, FALSE, 1);
            pango_layout_set_alignment(l, PANGO_ALIGN_CENTER);
            pango_layout_get_pixel_size(l, &w, &h);
            cairo_set_source_rgb(cr, fg, fg, fg);
            cairo_move_to(cr, bx + 6, by + (24 - h) / 2.0); pango_cairo_show_layout(cr, l);
            g_object_unref(l);
            bx += bw + 8; i++;
        }
    }
    cairo_destroy(cr);
    cairo_t *wc = cairo_create(ws);
    cairo_set_operator(wc, CAIRO_OPERATOR_SOURCE);
    cairo_set_source_surface(wc, s, 0, 0); cairo_paint(wc);
    cairo_destroy(wc);
    cairo_surface_destroy(s); cairo_surface_destroy(ws);
    XFlush(dpy);
}

static void restack(void)
{
    int y = top_y(), sw = DisplayWidth(dpy, scr), shown = 0;
    for (GList *l = notes; l; l = l->next) {
        Note *n = l->data;
        if (shown >= MAX_SHOWN) { if (n->win) XUnmapWindow(dpy, n->win); continue; }
        n->y = y;
        if (!n->win) {
            XSetWindowAttributes sa = { .override_redirect = True, .border_pixel = 0, .background_pixmap = None,
                                        .event_mask = ExposureMask | ButtonPressMask | ButtonReleaseMask | PointerMotionMask | LeaveWindowMask | EnterWindowMask };
            unsigned long mask = CWOverrideRedirect | CWBorderPixel | CWBackPixmap | CWEventMask;
            int depth = CopyFromParent; Visual *vis = CopyFromParent;
            if (argb) { sa.colormap = argb_cmap; mask |= CWColormap; depth = 32; vis = argb; }
            n->win = XCreateWindow(dpy, root, sw - MARGIN - BW, y, BW, n->h, 0, depth, InputOutput, vis, mask, &sa);
            XChangeProperty(dpy, n->win, a_type, XA_ATOM, 32, PropModeReplace, (unsigned char *)&a_type_notification, 1);
            XClassHint ch = { "paladin-notification", "Paladin-notification" };
            XSetClassHint(dpy, n->win, &ch);
            n->hover = -3;
        } else XMoveResizeWindow(dpy, n->win, sw - MARGIN - BW, y, BW, n->h);
        XMapRaised(dpy, n->win);
        draw(n);
        y += n->h + GAP;
        shown++;
    }
    XFlush(dpy);
}

static Note *find(guint32 id)
{
    for (GList *l = notes; l; l = l->next) if (((Note *)l->data)->id == id) return l->data;
    return NULL;
}

static Note *find_win(Window w)
{
    for (GList *l = notes; l; l = l->next) if (((Note *)l->data)->win == w) return l->data;
    return NULL;
}

static void free_note(Note *n)
{
    if (n->timer) g_source_remove(n->timer);
    if (n->win) XDestroyWindow(dpy, n->win);
    if (n->image) cairo_surface_destroy(n->image);
    g_strfreev(n->actions);
    g_free(n->app); g_free(n->summary); g_free(n->body); g_free(n->icon_path);
    g_free(n);
}

static void close_note(Note *n, guint32 reason)
{
    notes = g_list_remove(notes, n);
    emit_closed(n->id, reason);
    free_note(n);
    restack();
}

static gboolean expired(gpointer data)
{
    Note *n = data;
    n->timer = 0;
    if (n->hover != -3) { n->timer = g_timeout_add(1500, expired, n); return G_SOURCE_REMOVE; }   /* not while being read */
    close_note(n, 1);
    return G_SOURCE_REMOVE;
}

/* the picture: the app's image, an icon file, or an icon by name */
static cairo_surface_t *load_png(const char *path)
{
    if (!path) return NULL;
    cairo_surface_t *s = cairo_image_surface_create_from_png(path);
    if (cairo_surface_status(s) == CAIRO_STATUS_SUCCESS) return s;
    cairo_surface_destroy(s);
    return NULL;
}

static cairo_surface_t *icon_by_name(const char *name)
{
    if (!name || !*name) return NULL;
    if (g_str_has_prefix(name, "file://")) { char *p = g_filename_from_uri(name, NULL, NULL); cairo_surface_t *s = load_png(p); g_free(p); return s; }
    if (name[0] == '/') return load_png(name);
    const char *themes[] = { "Paladin", "hicolor" };
    const char *sizes[] = { "48x48", "64x64", "128x128", "256x256", "32x32" };
    const char *kinds[] = { "apps", "status", "devices", "places", "mimetypes", "actions" };
    for (unsigned t = 0; t < G_N_ELEMENTS(themes); t++)
        for (unsigned z = 0; z < G_N_ELEMENTS(sizes); z++)
            for (unsigned k = 0; k < G_N_ELEMENTS(kinds); k++) {
                char *p = g_strdup_printf("/usr/share/icons/%s/%s/%s/%s.png", themes[t], sizes[z], kinds[k], name);
                cairo_surface_t *s = load_png(p);
                g_free(p);
                if (s) return s;
            }
    char *p = g_strdup_printf("/usr/share/pixmaps/%s.png", name);
    cairo_surface_t *s = load_png(p);
    g_free(p);
    return s;
}

static cairo_surface_t *image_data(GVariant *v)
{
    int w, h, stride, bps, ch; gboolean alpha;
    GVariant *data = NULL;
    g_variant_get(v, "(iiibii@ay)", &w, &h, &stride, &alpha, &bps, &ch, &data);
    gsize len; const guint8 *px = g_variant_get_fixed_array(data, &len, 1);
    cairo_surface_t *s = NULL;
    if (w > 0 && h > 0 && w < 4096 && h < 4096 && bps == 8 && (ch == 3 || ch == 4) && len >= (gsize)stride * (h - 1) + w * ch) {
        s = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, w, h);
        guint8 *dst = cairo_image_surface_get_data(s);
        int ds = cairo_image_surface_get_stride(s);
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++) {
                const guint8 *p = px + (gsize)y * stride + x * ch;
                guint8 a = ch == 4 ? p[3] : 255;
                ((guint32 *)(dst + y * ds))[x] = ((guint32)a << 24) | ((p[0] * a / 255) << 16) | ((p[1] * a / 255) << 8) | (p[2] * a / 255);
            }
        cairo_surface_mark_dirty(s);
    }
    g_variant_unref(data);
    return s;
}

static guint32 notify(const char *app, guint32 replaces, const char *icon, const char *summary, const char *body,
                      const char *const *actions, GVariant *hints, int timeout)
{
    Note *n = replaces ? find(replaces) : NULL;
    if (n) {
        if (n->timer) { g_source_remove(n->timer); n->timer = 0; }
        if (n->image) { cairo_surface_destroy(n->image); n->image = NULL; }
        g_strfreev(n->actions);
        g_free(n->app); g_free(n->summary); g_free(n->body);
    } else {
        n = g_new0(Note, 1);
        n->id = replaces ? replaces : next_id++;
        notes = g_list_prepend(notes, n);
    }
    n->app = g_strdup(app); n->summary = g_strdup(summary); n->body = g_strdup(body);
    n->actions = g_strdupv((char **)actions);
    n->urgency = 1;
    GVariant *v;
    if ((v = g_variant_lookup_value(hints, "urgency", G_VARIANT_TYPE_BYTE))) { n->urgency = g_variant_get_byte(v); g_variant_unref(v); }
    if ((v = g_variant_lookup_value(hints, "resident", G_VARIANT_TYPE_BOOLEAN))) { n->resident = g_variant_get_boolean(v); g_variant_unref(v); }
    if ((v = g_variant_lookup_value(hints, "transient", G_VARIANT_TYPE_BOOLEAN))) { n->transient = g_variant_get_boolean(v); g_variant_unref(v); }
    const char *keys[] = { "image-data", "image_data", "icon_data" };
    for (unsigned i = 0; i < 3 && !n->image; i++)
        if ((v = g_variant_lookup_value(hints, keys[i], G_VARIANT_TYPE("(iiibiiay)")))) { n->image = image_data(v); g_variant_unref(v); }
    if (!n->image && (v = g_variant_lookup_value(hints, "image-path", G_VARIANT_TYPE_STRING))) { n->image = icon_by_name(g_variant_get_string(v, NULL)); g_variant_unref(v); }
    if (!n->image) n->image = icon_by_name(icon);
    n->timeout_ms = timeout < 0 ? (n->urgency == 2 ? 0 : 6000) : timeout;
    n->h = measure(n);
    if (n->timeout_ms > 0) n->timer = g_timeout_add(n->timeout_ms, expired, n);
    restack();
    return n->id;
}

/* ---------------------------------------------------------------- the D-Bus service */
static const char *introspection =
    "<node><interface name='org.freedesktop.Notifications'>"
    "<method name='Notify'><arg type='s' direction='in'/><arg type='u' direction='in'/><arg type='s' direction='in'/>"
    "<arg type='s' direction='in'/><arg type='s' direction='in'/><arg type='as' direction='in'/><arg type='a{sv}' direction='in'/>"
    "<arg type='i' direction='in'/><arg type='u' direction='out'/></method>"
    "<method name='CloseNotification'><arg type='u' direction='in'/></method>"
    "<method name='GetCapabilities'><arg type='as' direction='out'/></method>"
    "<method name='GetServerInformation'><arg type='s' direction='out'/><arg type='s' direction='out'/>"
    "<arg type='s' direction='out'/><arg type='s' direction='out'/></method>"
    "<signal name='NotificationClosed'><arg type='u'/><arg type='u'/></signal>"
    "<signal name='ActionInvoked'><arg type='u'/><arg type='s'/></signal>"
    "</interface></node>";

static void method_call(GDBusConnection *c, const char *sender, const char *path, const char *iface, const char *method,
                        GVariant *params, GDBusMethodInvocation *inv, gpointer data)
{
    (void)c; (void)sender; (void)path; (void)iface; (void)data;
    if (!strcmp(method, "Notify")) {
        const char *app, *icon, *summary, *body; guint32 replaces; int timeout;
        const char **actions; GVariant *hints;
        g_variant_get(params, "(&su&s&s&s^a&s@a{sv}i)", &app, &replaces, &icon, &summary, &body, &actions, &hints, &timeout);
        guint32 id = notify(app, replaces, icon, summary, body, actions, hints, timeout);
        g_free(actions);
        g_variant_unref(hints);
        g_dbus_method_invocation_return_value(inv, g_variant_new("(u)", id));
    } else if (!strcmp(method, "CloseNotification")) {
        guint32 id; g_variant_get(params, "(u)", &id);
        Note *n = find(id);
        if (n) close_note(n, 3);
        g_dbus_method_invocation_return_value(inv, NULL);
    } else if (!strcmp(method, "GetCapabilities")) {
        const char *caps[] = { "body", "body-markup", "actions", "icon-static", "persistence", NULL };
        g_dbus_method_invocation_return_value(inv, g_variant_new("(^as)", caps));
    } else if (!strcmp(method, "GetServerInformation")) {
        g_dbus_method_invocation_return_value(inv, g_variant_new("(ssss)", "palOS Notifications", "palOS", "27", "1.2"));
    }
}

static const GDBusInterfaceVTable vtable = { method_call, NULL, NULL, { 0 } };

static void on_bus(GDBusConnection *c, const char *name, gpointer data)
{
    (void)name; (void)data;
    GDBusNodeInfo *info = g_dbus_node_info_new_for_xml(introspection, NULL);
    g_dbus_connection_register_object(c, "/org/freedesktop/Notifications", info->interfaces[0], &vtable, NULL, NULL, NULL);
    g_dbus_node_info_unref(info);
}

static void on_name_lost(GDBusConnection *c, const char *name, gpointer data)
{
    (void)c; (void)data;
    fprintf(stderr, "paladin-sessiond: another program holds %s (notifications stay with it)\n", name);
}

/* ---------------------------------------------------------------- pointer on the bubbles */
static int hit(Note *n, int x, int y)
{
    if (x < 22 && y < 22) return -2;
    int na = n_actions(n);
    if (na && y >= n->h - 36) {
        int bw = (BW - 32 - 8 * (na - 1)) / na, i = (x - 16) / (bw + 8);
        if (x >= 16 && i < na && (x - 16) % (bw + 8) < bw) return i;
    }
    return -1;
}

static void bubble_event(Note *n, XEvent *ev)
{
    switch (ev->type) {
    case Expose: if (ev->xexpose.count == 0) draw(n); break;
    case EnterNotify: case MotionNotify: {
        int h = ev->type == EnterNotify ? hit(n, ev->xcrossing.x, ev->xcrossing.y) : hit(n, ev->xmotion.x, ev->xmotion.y);
        if (h != n->hover) { n->hover = h; draw(n); }
        break;
    }
    case LeaveNotify: n->hover = -3; draw(n); break;
    case ButtonRelease: {
        if (ev->xbutton.button != 1) { close_note(n, 2); break; }
        int h = hit(n, ev->xbutton.x, ev->xbutton.y);
        if (h == -2) { close_note(n, 2); break; }
        if (h >= 0) {
            int i = 0;
            for (char **a = n->actions; a && a[0] && a[1]; a += 2) {
                if (!strcmp(a[0], "default")) continue;
                if (i++ == h) { emit_action(n->id, a[0]); break; }
            }
        } else {
            for (char **a = n->actions; a && a[0] && a[1]; a += 2) if (!strcmp(a[0], "default")) emit_action(n->id, "default");
        }
        if (!n->resident) close_note(n, 2);
        break;
    }
    }
}

/* ---------------------------------------------------------------- keys */
typedef struct { KeyCode code; unsigned int mods; gboolean on_release; char *cmd; } Binding;
static GArray *bindings;

static void grab_all(void)
{
    unsigned int extra[] = { 0, LockMask, Mod2Mask, LockMask | Mod2Mask };
    for (guint i = 0; i < bindings->len; i++) {
        Binding *b = &g_array_index(bindings, Binding, i);
        for (unsigned k = 0; k < 4; k++) XGrabKey(dpy, b->code, b->mods | extra[k], root, False, GrabModeAsync, GrabModeAsync);
    }
    XFlush(dpy);
}

static void load_keys(void)
{
    bindings = g_array_new(FALSE, TRUE, sizeof(Binding));
    char *text = NULL;
    if (!g_file_get_contents(KEYS_CONF, &text, NULL, NULL)) return;
    char **lines = g_strsplit(text, "\n", -1);
    for (char **l = lines; *l; l++) {
        char *line = g_strstrip(*l);
        if (!*line || *line == '#') continue;
        char key[64], mods[64]; int used = 0;
        if (sscanf(line, "%63s %63s %n", key, mods, &used) < 2 || !used) continue;
        KeySym sym = XStringToKeysym(key);
        KeyCode code = sym != NoSymbol ? XKeysymToKeycode(dpy, sym) : 0;
        if (!code) continue;
        Binding b = { code, 0, FALSE, g_strdup(g_strstrip(line + used)) };
        if (strcmp(mods, "-")) {
            char **m = g_strsplit(mods, "+", -1);
            for (char **p = m; *p; p++) {
                if (!g_ascii_strcasecmp(*p, "Control")) b.mods |= ControlMask;
                else if (!g_ascii_strcasecmp(*p, "Shift")) b.mods |= ShiftMask;
                else if (!g_ascii_strcasecmp(*p, "Alt")) b.mods |= Mod1Mask;
                else if (!g_ascii_strcasecmp(*p, "Super")) b.mods |= Mod4Mask;
                else if (!g_ascii_strcasecmp(*p, "Release")) b.on_release = TRUE;
            }
            g_strfreev(m);
        }
        g_array_append_val(bindings, b);
    }
    g_strfreev(lines);
    g_free(text);
    grab_all();
}

static void key_event(XKeyEvent *e)
{
    unsigned int mods = e->state & (ControlMask | ShiftMask | Mod1Mask | Mod4Mask);
    gboolean release = e->type == KeyRelease;
    for (guint i = 0; i < bindings->len; i++) {
        Binding *b = &g_array_index(bindings, Binding, i);
        if (b->code != e->keycode || b->mods != mods || b->on_release != release) continue;
        GError *err = NULL;
        if (!g_spawn_command_line_async(b->cmd, &err)) { fprintf(stderr, "paladin-sessiond: %s: %s\n", b->cmd, err->message); g_error_free(err); }
        return;
    }
}

/* ---------------------------------------------------------------- X events in the GLib loop */
typedef struct { GSource base; gpointer tag; } XSrc;
static gboolean xs_prepare(GSource *s, gint *t) { (void)s; *t = -1; return XPending(dpy) > 0; }
static gboolean xs_check(GSource *s) { return (g_source_query_unix_fd(s, ((XSrc *)s)->tag) & G_IO_IN) || XPending(dpy) > 0; }
static gboolean xs_dispatch(GSource *s, GSourceFunc cb, gpointer data)
{
    (void)s; (void)cb; (void)data;
    while (XPending(dpy)) {
        XEvent ev; XNextEvent(dpy, &ev);
        if (ev.type == KeyPress || ev.type == KeyRelease) { key_event(&ev.xkey); continue; }
        if (ev.type == MappingNotify) {
            XRefreshKeyboardMapping(&ev.xmapping);
            XUngrabKey(dpy, AnyKey, AnyModifier, root);
            for (guint i = 0; i < bindings->len; i++) g_free(g_array_index(bindings, Binding, i).cmd);
            g_array_free(bindings, TRUE);
            load_keys();
            continue;
        }
        if (ev.type == PropertyNotify && ev.xproperty.window == root) {
            if (ev.xproperty.atom == a_dark) for (GList *l = notes; l; l = l->next) draw(l->data);
            else if (ev.xproperty.atom == a_workarea) restack();
            continue;
        }
        Note *n = find_win(ev.xany.window);
        if (n) bubble_event(n, &ev);
    }
    return G_SOURCE_CONTINUE;
}
static GSourceFuncs xs_funcs = { xs_prepare, xs_check, xs_dispatch, NULL, NULL, NULL };

static int on_xerror(Display *d, XErrorEvent *e)
{
    (void)d;
    if (e->request_code == 33 /* GrabKey */) fprintf(stderr, "paladin-sessiond: a key is already taken by another program\n");
    return 0;
}

int main(void)
{
    if (!(dpy = XOpenDisplay(NULL))) { fputs("paladin-sessiond: can't open the display\n", stderr); return 1; }
    XSetErrorHandler(on_xerror);
    scr = DefaultScreen(dpy);
    root = RootWindow(dpy, scr);
    a_dark = XInternAtom(dpy, "_PALADIN_DARK", False);
    a_workarea = XInternAtom(dpy, "_NET_WORKAREA", False);
    a_type = XInternAtom(dpy, "_NET_WM_WINDOW_TYPE", False);
    a_type_notification = XInternAtom(dpy, "_NET_WM_WINDOW_TYPE_NOTIFICATION", False);
    XVisualInfo vi;
    if (XMatchVisualInfo(dpy, scr, 32, TrueColor, &vi)) { argb = vi.visual; argb_cmap = XCreateColormap(dpy, root, argb, AllocNone); }
    XSelectInput(dpy, root, PropertyChangeMask);
    Bool ok; XkbSetDetectableAutoRepeat(dpy, True, &ok);
    load_keys();

    GError *err = NULL;
    bus = g_bus_get_sync(G_BUS_TYPE_SESSION, NULL, &err);
    if (bus) {
        on_bus(bus, NULL, NULL);
        g_bus_own_name_on_connection(bus, "org.freedesktop.Notifications", G_BUS_NAME_OWNER_FLAGS_REPLACE, NULL, on_name_lost, NULL, NULL);
    }
    else fprintf(stderr, "paladin-sessiond: no session bus (%s): keys only\n", err ? err->message : "?");

    XSrc *x = (XSrc *)g_source_new(&xs_funcs, sizeof(XSrc));
    x->tag = g_source_add_unix_fd((GSource *)x, ConnectionNumber(dpy), G_IO_IN);
    g_source_attach((GSource *)x, NULL);
    g_main_loop_run(g_main_loop_new(NULL, FALSE));
    return 0;
}

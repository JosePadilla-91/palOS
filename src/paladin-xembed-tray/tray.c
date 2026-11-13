/* paladin-xembed-tray: old-style tray icons in the menu bar.

   Some programs (Steam, Wine programs, older GTK and Java apps, and Electron apps such as Discord when they
   start before the menu bar) still put their icon in a "system tray" the old X11 way (XEmbed). The menu bar
   shows the modern kind (StatusNotifierItem). This keeps the old tray: each icon is held in a small hidden
   window, its picture is copied into a modern tray item, and clicks on that item are passed back to the icon. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <gio/gio.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/extensions/Xcomposite.h>
#include <X11/extensions/XTest.h>

#define S 24                                  /* icon size in pixels */
#define PARK (-S * 4)                         /* where the hidden windows wait (off the screen) */
static const int BG[3] = { 236, 236, 236 };   /* backdrop for icons drawn without transparency; made see-through */
#define REQUEST_DOCK 0
#define XEMBED_EMBEDDED_NOTIFY 0
#define WATCHER "org.kde.StatusNotifierWatcher"

static const char *SNI_XML =
    "<node><interface name='org.kde.StatusNotifierItem'>"
    "<property name='Category' type='s' access='read'/><property name='Id' type='s' access='read'/>"
    "<property name='Title' type='s' access='read'/><property name='Status' type='s' access='read'/>"
    "<property name='WindowId' type='i' access='read'/><property name='IconName' type='s' access='read'/>"
    "<property name='IconPixmap' type='a(iiay)' access='read'/><property name='OverlayIconName' type='s' access='read'/>"
    "<property name='AttentionIconName' type='s' access='read'/><property name='ToolTip' type='(sa(iiay)ss)' access='read'/>"
    "<property name='ItemIsMenu' type='b' access='read'/><property name='Menu' type='o' access='read'/>"
    "<method name='Activate'><arg name='x' type='i' direction='in'/><arg name='y' type='i' direction='in'/></method>"
    "<method name='SecondaryActivate'><arg name='x' type='i' direction='in'/><arg name='y' type='i' direction='in'/></method>"
    "<method name='ContextMenu'><arg name='x' type='i' direction='in'/><arg name='y' type='i' direction='in'/></method>"
    "<method name='Scroll'><arg name='delta' type='i' direction='in'/><arg name='orientation' type='s' direction='in'/></method>"
    "<signal name='NewIcon'/><signal name='NewTitle'/><signal name='NewStatus'><arg type='s'/></signal>"
    "</interface></node>";

static Display *dpy;
static int scr;
static Window root, owner;
static Visual *argb_visual; static Colormap argb_cmap;
static Atom a_opcode, a_xembed, a_sel;
static GDBusInterfaceInfo *sni_info;
static GHashTable *icons;           /* client window -> Icon */
static gboolean watcher_up, composite_ok;

typedef struct {
    Window wid, holder;
    int depth;
    char *name, *title;
    guint8 *last;                    /* the last picture copied (to notice changes) */
    GBytes *pixmap;                  /* ARGB32, network order, for IconPixmap */
    GDBusConnection *bus;
    guint reg;
} Icon;

static void logf_(const char *fmt, ...)
{
    va_list a; va_start(a, fmt);
    fputs("[xembed-tray] ", stderr); vfprintf(stderr, fmt, a); fputc('\n', stderr);
    va_end(a);
}

static int x_error(Display *d, XErrorEvent *e) { (void)d; (void)e; return 0; }   /* icons come and go */

static void client_message(Window to, Window w, Atom type, long l0, long l1, long l2, long l3, long l4, long mask)
{
    XEvent e = { 0 };
    e.xclient.type = ClientMessage; e.xclient.window = w; e.xclient.message_type = type; e.xclient.format = 32;
    e.xclient.data.l[0] = l0; e.xclient.data.l[1] = l1; e.xclient.data.l[2] = l2; e.xclient.data.l[3] = l3; e.xclient.data.l[4] = l4;
    XSendEvent(dpy, to, False, mask, &e);
}

/* ---------------------------------------------------------------- the tray item (D-Bus) */
static GVariant *get_prop(GDBusConnection *c, const char *sender, const char *path, const char *iface, const char *prop, GError **err, gpointer data)
{
    (void)c; (void)sender; (void)path; (void)iface; (void)err;
    Icon *ic = data;
    if (!strcmp(prop, "Category")) return g_variant_new_string("ApplicationStatus");
    if (!strcmp(prop, "Id")) return g_variant_new_string(ic->name);
    if (!strcmp(prop, "Title")) return g_variant_new_string(ic->title);
    if (!strcmp(prop, "Status")) return g_variant_new_string("Active");
    if (!strcmp(prop, "WindowId")) return g_variant_new_int32(0);
    if (!strcmp(prop, "IconName") || !strcmp(prop, "OverlayIconName") || !strcmp(prop, "AttentionIconName")) return g_variant_new_string("");
    if (!strcmp(prop, "IconPixmap")) {
        GVariantBuilder b; g_variant_builder_init(&b, G_VARIANT_TYPE("a(iiay)"));
        if (ic->pixmap) {
            gsize n; const guint8 *d = g_bytes_get_data(ic->pixmap, &n);
            g_variant_builder_add(&b, "(ii@ay)", S, S, g_variant_new_fixed_array(G_VARIANT_TYPE_BYTE, d, n, 1));
        }
        return g_variant_builder_end(&b);
    }
    if (!strcmp(prop, "ToolTip")) return g_variant_new("(sa(iiay)ss)", "", NULL, ic->title, "");
    if (!strcmp(prop, "ItemIsMenu")) return g_variant_new_boolean(FALSE);
    if (!strcmp(prop, "Menu")) return g_variant_new_object_path("/");
    return NULL;
}

typedef struct { Window wid; int button; } Click;
static gboolean do_click(gpointer data);

static void call(GDBusConnection *c, const char *sender, const char *path, const char *iface, const char *method,
                 GVariant *params, GDBusMethodInvocation *inv, gpointer data)
{
    (void)c; (void)sender; (void)path; (void)iface;
    Icon *ic = data;
    g_dbus_method_invocation_return_value(inv, NULL);
    Click *k = g_new0(Click, 1);
    k->wid = ic->wid;
    if (!strcmp(method, "Activate")) k->button = 1;
    else if (!strcmp(method, "SecondaryActivate")) k->button = 2;
    else if (!strcmp(method, "ContextMenu")) k->button = 3;
    else if (!strcmp(method, "Scroll")) { gint32 d; const char *o; g_variant_get(params, "(i&s)", &d, &o); k->button = d < 0 ? 4 : 5; }
    if (k->button) g_timeout_add(k->button >= 4 ? 60 : 120, do_click, k); else g_free(k);
}

static const GDBusInterfaceVTable vtable = { call, get_prop, NULL, { 0 } };

static void item_register(Icon *ic)
{
    if (!ic->bus) return;
    g_dbus_connection_call(ic->bus, WATCHER, "/StatusNotifierWatcher", WATCHER, "RegisterStatusNotifierItem",
                           g_variant_new("(s)", "/StatusNotifierItem"), NULL, G_DBUS_CALL_FLAGS_NONE, 3000, NULL, NULL, NULL);
}

/* each icon has its own bus connection, so its tray item goes away with it */
static void item_connect(Icon *ic)
{
    GError *e = NULL;
    char *addr = g_dbus_address_get_for_bus_sync(G_BUS_TYPE_SESSION, NULL, &e);
    if (addr) ic->bus = g_dbus_connection_new_for_address_sync(addr, G_DBUS_CONNECTION_FLAGS_AUTHENTICATION_CLIENT | G_DBUS_CONNECTION_FLAGS_MESSAGE_BUS_CONNECTION, NULL, NULL, &e);
    g_free(addr);
    if (ic->bus) ic->reg = g_dbus_connection_register_object(ic->bus, "/StatusNotifierItem", sni_info, &vtable, ic, NULL, &e);
    if (e) { logf_("cannot offer tray item: %s", e->message); g_error_free(e); }
}

/* ---------------------------------------------------------------- the picture */
static guint8 *grab(Icon *ic, gboolean composited)
{
    XImage *img = NULL;
    if (composited && composite_ok) {
        Pixmap pix = XCompositeNameWindowPixmap(dpy, ic->holder);
        if (pix) { img = XGetImage(dpy, pix, 0, 0, S, S, AllPlanes, ZPixmap); XFreePixmap(dpy, pix); }
    } else img = XGetImage(dpy, ic->holder, 0, 0, S, S, AllPlanes, ZPixmap);
    if (!img) return NULL;
    guint8 *d = g_malloc(S * S * 4);
    for (int y = 0; y < S; y++) for (int x = 0; x < S; x++) {
        unsigned long p = XGetPixel(img, x, y);
        guint8 *o = d + (y * S + x) * 4;                  /* B G R A, as X keeps it */
        o[0] = p & 0xff; o[1] = (p >> 8) & 0xff; o[2] = (p >> 16) & 0xff; o[3] = img->depth == 32 ? (p >> 24) & 0xff : 0xff;
    }
    XDestroyImage(img);
    return d;
}

/* one colour everywhere: not really drawn yet (published as is, it showed as a solid black square) */
static gboolean blank(const guint8 *d)
{
    for (int i = 1; i < S * S; i++) if (memcmp(d, d + i * 4, 4)) return FALSE;
    return TRUE;
}

static void capture(Icon *ic)
{
    guint8 *data = grab(ic, TRUE);
    if (!data || blank(data)) {
        guint8 *other = grab(ic, FALSE);               /* some apps' icons only show up in a direct copy */
        if (other && !blank(other)) { g_free(data); data = other; } else g_free(other);
    }
    if (!data || blank(data) || (ic->last && !memcmp(data, ic->last, S * S * 4))) { g_free(data); return; }
    g_free(ic->last); ic->last = data;
    guint8 *out = g_malloc(S * S * 4);
    gboolean seen = FALSE, argb = ic->depth == 32;
    for (int i = 0; i < S * S; i++) {
        int b = data[i * 4], g = data[i * 4 + 1], r = data[i * 4 + 2], a = data[i * 4 + 3];
        if (argb) {
            if (a && a < 255) { r = MIN(255, r * 255 / a); g = MIN(255, g * 255 / a); b = MIN(255, b * 255 / a); }   /* X keeps colours premultiplied */
        } else {
            /* the grey backdrop becomes see-through, with a little tolerance (an exact match left a light fringe) */
            int d = MAX(abs(r - BG[0]), MAX(abs(g - BG[1]), abs(b - BG[2])));
            a = d <= 6 ? 0 : 255;
        }
        if (a) seen = TRUE;
        out[i * 4] = a; out[i * 4 + 1] = r; out[i * 4 + 2] = g; out[i * 4 + 3] = b;
    }
    if (!seen) { g_free(out); return; }                 /* not drawn yet */
    if (ic->pixmap) g_bytes_unref(ic->pixmap);
    ic->pixmap = g_bytes_new_take(out, S * S * 4);
    if (ic->bus) g_dbus_connection_emit_signal(ic->bus, NULL, "/StatusNotifierItem", "org.kde.StatusNotifierItem", "NewIcon", NULL, NULL);
}

/* ---------------------------------------------------------------- holding icons */
static void names(Icon *ic)
{
    XClassHint ch = { 0 };
    char *cls = NULL, *title = NULL;
    if (XGetClassHint(dpy, ic->wid, &ch)) { cls = g_strdup(ch.res_class && *ch.res_class ? ch.res_class : ch.res_name); if (ch.res_name) XFree(ch.res_name); if (ch.res_class) XFree(ch.res_class); }
    Atom type; int fmt; unsigned long n, after; unsigned char *d = NULL;
    if (XGetWindowProperty(dpy, ic->wid, XInternAtom(dpy, "_NET_WM_NAME", False), 0, 1024, False, XInternAtom(dpy, "UTF8_STRING", False), &type, &fmt, &n, &after, &d) == Success && d && n)
        title = g_strndup((char *)d, n);
    if (d) XFree(d);
    if (!title) { char *t = NULL; if (XFetchName(dpy, ic->wid, &t) && t) { title = g_strdup(t); XFree(t); } }
    ic->name = cls && *cls ? cls : (g_free(cls), g_strdup("tray-icon"));
    ic->title = title && *title ? title : (g_free(title), g_strdup(cls && *cls ? ic->name : "Tray Icon"));
}

static gboolean first_capture(gpointer data)
{
    Icon *ic = g_hash_table_lookup(icons, data);
    if (ic) { capture(ic); if (watcher_up) item_register(ic); }
    return G_SOURCE_REMOVE;
}

static void hold(Window wid)
{
    XWindowAttributes wa;
    if (!XGetWindowAttributes(dpy, wid, &wa)) return;
    Icon *ic = g_new0(Icon, 1);
    ic->wid = wid;
    XSetWindowAttributes sa = { .override_redirect = True, .event_mask = StructureNotifyMask | ExposureMask, .border_pixel = 0 };
    unsigned long mask = CWOverrideRedirect | CWEventMask | CWBorderPixel | CWBackPixel;
    int depth = CopyFromParent; Visual *vis = CopyFromParent;
    if (wa.depth == 32 && argb_visual) { sa.colormap = argb_cmap; sa.background_pixel = 0; mask |= CWColormap; depth = 32; vis = argb_visual; ic->depth = 32; }
    else { sa.background_pixel = (BG[0] << 16) | (BG[1] << 8) | BG[2]; ic->depth = DefaultDepth(dpy, scr); }
    ic->holder = XCreateWindow(dpy, root, PARK, PARK, S, S, 0, depth, InputOutput, vis, mask, &sa);
    long zero = 0;   /* never painted on screen: fully see-through to the compositor */
    XChangeProperty(dpy, ic->holder, XInternAtom(dpy, "_NET_WM_WINDOW_OPACITY", False), XA_CARDINAL, 32, PropModeReplace, (unsigned char *)&zero, 1);
    Atom dock = XInternAtom(dpy, "_NET_WM_WINDOW_TYPE_DOCK", False);
    XChangeProperty(dpy, ic->holder, XInternAtom(dpy, "_NET_WM_WINDOW_TYPE", False), XA_ATOM, 32, PropModeReplace, (unsigned char *)&dock, 1);
    if (composite_ok) XCompositeRedirectWindow(dpy, ic->holder, CompositeRedirectAutomatic);
    XSelectInput(dpy, wid, StructureNotifyMask | PropertyChangeMask);
    XReparentWindow(dpy, wid, ic->holder, 0, 0);
    XMoveResizeWindow(dpy, wid, 0, 0, S, S);
    XMapWindow(dpy, ic->holder);
    XMapWindow(dpy, wid);
    client_message(wid, wid, a_xembed, CurrentTime, XEMBED_EMBEDDED_NOTIFY, 0, (long)ic->holder, 0, NoEventMask);
    XFlush(dpy);
    names(ic);
    item_connect(ic);
    g_hash_table_insert(icons, GSIZE_TO_POINTER(wid), ic);
    logf_("holding %s 0x%lx", ic->name, wid);
    g_timeout_add(300, first_capture, GSIZE_TO_POINTER(wid));
}

static void icon_free(gpointer p)
{
    Icon *ic = p;
    if (ic->bus) {
        if (ic->reg) g_dbus_connection_unregister_object(ic->bus, ic->reg);
        g_dbus_connection_close_sync(ic->bus, NULL, NULL);
        g_object_unref(ic->bus);
    }
    XDestroyWindow(dpy, ic->holder);
    XFlush(dpy);
    if (ic->pixmap) g_bytes_unref(ic->pixmap);
    g_free(ic->last); g_free(ic->name); g_free(ic->title); g_free(ic);
}

/* ---------------------------------------------------------------- clicks */
static gboolean park(gpointer data)
{
    Icon *ic = g_hash_table_lookup(icons, data);
    if (ic) { XMoveWindow(dpy, ic->holder, PARK, PARK); XFlush(dpy); }
    return G_SOURCE_REMOVE;
}

/* press a mouse button on the icon: briefly put it under the pointer, invisible, and click it */
static gboolean do_click(gpointer data)
{
    Click *k = data;
    Icon *ic = g_hash_table_lookup(icons, GSIZE_TO_POINTER(k->wid));
    if (ic) {
        Window r, ch; int px, py, wx, wy; unsigned int m;
        XQueryPointer(dpy, root, &r, &ch, &px, &py, &wx, &wy, &m);
        XWindowChanges wc = { .x = px - S / 2, .y = py - S / 2, .stack_mode = Above };
        XConfigureWindow(dpy, ic->holder, CWX | CWY | CWStackMode, &wc);
        XSync(dpy, False);
        g_usleep(30000);
        XTestFakeMotionEvent(dpy, scr, px, py, 0);
        XTestFakeButtonEvent(dpy, k->button, True, 0);
        XSync(dpy, False);
        g_usleep(20000);
        XTestFakeButtonEvent(dpy, k->button, False, 0);
        XSync(dpy, False);
        g_timeout_add(400, park, GSIZE_TO_POINTER(k->wid));
    }
    g_free(k);
    return G_SOURCE_REMOVE;
}

/* ---------------------------------------------------------------- X events */
static gboolean x_events(GIOChannel *ch, GIOCondition c, gpointer d)
{
    (void)ch; (void)c; (void)d;
    while (XPending(dpy)) {
        XEvent ev; XNextEvent(dpy, &ev);
        if (ev.type == ClientMessage && ev.xclient.message_type == a_opcode) {
            if (ev.xclient.data.l[1] == REQUEST_DOCK) {
                Window wid = (Window)ev.xclient.data.l[2];
                if (wid && !g_hash_table_contains(icons, GSIZE_TO_POINTER(wid))) hold(wid);
            }
        } else if (ev.type == DestroyNotify || ev.type == ReparentNotify) {
            Window wid = ev.type == DestroyNotify ? ev.xdestroywindow.window : ev.xreparent.window;
            Icon *ic = g_hash_table_lookup(icons, GSIZE_TO_POINTER(wid));
            if (!ic) continue;
            if (ev.type == ReparentNotify && ev.xreparent.parent == ic->holder) continue;
            logf_("released %s", ic->name);
            g_hash_table_remove(icons, GSIZE_TO_POINTER(wid));
        } else if (ev.type == SelectionClear && ev.xselectionclear.selection == a_sel) {
            logf_("another tray took over");
            g_hash_table_remove_all(icons);
            exit(0);
        }
    }
    return TRUE;
}

static gboolean pump(gpointer d) { return x_events(NULL, 0, d); }

static gboolean refresh(gpointer d)
{
    (void)d;
    GHashTableIter it; gpointer k, v;
    g_hash_table_iter_init(&it, icons);
    while (g_hash_table_iter_next(&it, &k, &v)) capture(v);
    return G_SOURCE_CONTINUE;
}

static void watcher_on(GDBusConnection *c, const char *n, const char *o, gpointer d)
{
    (void)c; (void)n; (void)o; (void)d;
    watcher_up = TRUE;
    GHashTableIter it; gpointer k, v;
    g_hash_table_iter_init(&it, icons);
    while (g_hash_table_iter_next(&it, &k, &v)) item_register(v);
}
static void watcher_off(GDBusConnection *c, const char *n, gpointer d) { (void)c; (void)n; (void)d; watcher_up = FALSE; }

int main(void)
{
    if (!getenv("DISPLAY") || !(dpy = XOpenDisplay(NULL))) return 0;
    XSetErrorHandler(x_error);
    scr = DefaultScreen(dpy); root = RootWindow(dpy, scr);
    char selname[64]; snprintf(selname, sizeof selname, "_NET_SYSTEM_TRAY_S%d", scr);
    a_sel = XInternAtom(dpy, selname, False);
    a_opcode = XInternAtom(dpy, "_NET_SYSTEM_TRAY_OPCODE", False);
    a_xembed = XInternAtom(dpy, "_XEMBED", False);
    if (XGetSelectionOwner(dpy, a_sel) != None) { logf_("another system tray is running"); return 0; }
    int ev, er; composite_ok = XCompositeQueryExtension(dpy, &ev, &er);
    XSetWindowAttributes sa = { .override_redirect = True };
    owner = XCreateWindow(dpy, root, -1, -1, 1, 1, 0, CopyFromParent, InputOnly, CopyFromParent, CWOverrideRedirect, &sa);
    /* a transparent kind of window for icons that support it */
    XVisualInfo vi;
    if (XMatchVisualInfo(dpy, scr, 32, TrueColor, &vi)) {
        argb_visual = vi.visual; argb_cmap = XCreateColormap(dpy, root, argb_visual, AllocNone);
        long id = (long)vi.visualid;
        XChangeProperty(dpy, owner, XInternAtom(dpy, "_NET_SYSTEM_TRAY_VISUAL", False), XInternAtom(dpy, "VISUALID", False), 32, PropModeReplace, (unsigned char *)&id, 1);
    }
    long orient = 0;
    XChangeProperty(dpy, owner, XInternAtom(dpy, "_NET_SYSTEM_TRAY_ORIENTATION", False), XA_CARDINAL, 32, PropModeReplace, (unsigned char *)&orient, 1);
    XSetSelectionOwner(dpy, a_sel, owner, CurrentTime);
    XSync(dpy, False);
    if (XGetSelectionOwner(dpy, a_sel) != owner) { logf_("could not become the system tray"); return 0; }
    XSelectInput(dpy, owner, StructureNotifyMask);
    client_message(root, root, XInternAtom(dpy, "MANAGER", False), CurrentTime, (long)a_sel, (long)owner, 0, 0, StructureNotifyMask);
    XFlush(dpy);

    sni_info = g_dbus_node_info_new_for_xml(SNI_XML, NULL)->interfaces[0];
    icons = g_hash_table_new_full(NULL, NULL, NULL, icon_free);
    GIOChannel *ch = g_io_channel_unix_new(ConnectionNumber(dpy));
    g_io_add_watch(ch, G_IO_IN, x_events, NULL);
    g_timeout_add(250, pump, NULL);
    g_timeout_add(1000, refresh, NULL);
    g_bus_watch_name(G_BUS_TYPE_SESSION, WATCHER, G_BUS_NAME_WATCHER_FLAGS_NONE, watcher_on, watcher_off, NULL, NULL);
    logf_("ready");
    g_main_loop_run(g_main_loop_new(NULL, FALSE));
    return 0;
}

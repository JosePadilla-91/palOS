/* Kibble's window layer: the connection to palOS's X desktop (PaladinDisplay). */
#define _GNU_SOURCE
#include "paladin.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <X11/Xlib-xcb.h>
#include <X11/XKBlib.h>
#include <X11/Xresource.h>
#include <X11/extensions/XInput2.h>
#include <xcb/dri3.h>
#include <xcb/present.h>
#include <xkbcommon/xkbcommon.h>
#include <xkbcommon/xkbcommon-x11.h>
#include <xf86drm.h>
#include <drm_fourcc.h>
#include <epoxy/egl.h>

gboolean paladin_debug;

static const char *atom_names[PA_COUNT] = {
    "WM_PROTOCOLS", "WM_DELETE_WINDOW", "WM_TAKE_FOCUS", "WM_STATE", "WM_CHANGE_STATE", "UTF8_STRING",
    "_NET_WM_NAME", "_NET_WM_PID", "_NET_WM_STATE", "_NET_WM_STATE_FULLSCREEN", "_NET_WM_STATE_MAXIMIZED_VERT",
    "_NET_WM_STATE_MAXIMIZED_HORZ", "_NET_WM_STATE_HIDDEN", "_NET_WM_STATE_ABOVE", "_NET_WM_STATE_STICKY",
    "_NET_WM_STATE_SKIP_TASKBAR", "_NET_WM_STATE_SKIP_PAGER", "_NET_WM_STATE_FOCUSED", "_NET_WM_WINDOW_TYPE",
    "_NET_WM_WINDOW_TYPE_NORMAL", "_NET_WM_WINDOW_TYPE_DIALOG", "_NET_WM_WINDOW_TYPE_DOCK",
    "_NET_WM_WINDOW_TYPE_DESKTOP", "_NET_WM_WINDOW_TYPE_TOOLBAR", "_NET_WM_WINDOW_TYPE_SPLASH",
    "_NET_WM_WINDOW_TYPE_UTILITY", "_NET_WM_WINDOW_TYPE_NOTIFICATION", "_NET_WM_WINDOW_TYPE_POPUP_MENU",
    "_NET_WM_DESKTOP", "_NET_ACTIVE_WINDOW", "_NET_WM_MOVERESIZE", "_NET_WORKAREA", "_NET_FRAME_EXTENTS",
    "_NET_WM_USER_TIME", "_MOTIF_WM_HINTS", "_PALADIN_DARK", "CLIPBOARD", "TARGETS", "TEXT", "INCR",
    "text/uri-list", "text/plain;charset=utf-8", "_KIBBLE_SELECTION",
    "XdndAware", "XdndEnter", "XdndPosition", "XdndStatus", "XdndLeave", "XdndDrop", "XdndFinished",
    "XdndSelection", "XdndTypeList", "XdndActionCopy", "XdndActionMove", "XdndActionLink", "XdndProxy",
};

struct _PaladinDisplay {
    WPEDisplay parent;
    Display *dpy;
    xcb_connection_t *xcb;
    int scr;
    Window root;
    Atom atoms[PA_COUNT];
    gboolean shm, dri3;
    int xi_opcode;
    Visual *argb; Colormap argb_cmap;
    GSource *source;
    GHashTable *windows;            /* Window -> PaladinToplevel (not owned) */
    WPEKeymap *keymap;
    int xkb_event, xkb_device;
    WPEClipboard *clipboard;
    WPEScreen *screen;
    WPEDRMDevice *drm;
    gboolean drm_looked;
    WPEBufferFormats *formats;
    Time last_time;
    PaladinHooks hooks;
    gboolean dark;
    int wa[4];
};

G_DEFINE_FINAL_TYPE(PaladinDisplay, paladin_display, WPE_TYPE_DISPLAY)

/* a plain screen: its size, scale and refresh rate are set by the display */
#define PALADIN_TYPE_SCREEN (paladin_screen_get_type())
G_DECLARE_FINAL_TYPE(PaladinScreen, paladin_screen, PALADIN, SCREEN, WPEScreen)
struct _PaladinScreen { WPEScreen parent; };
G_DEFINE_FINAL_TYPE(PaladinScreen, paladin_screen, WPE_TYPE_SCREEN)
static void paladin_screen_class_init(PaladinScreenClass *k) { (void)k; }
static void paladin_screen_init(PaladinScreen *s) { (void)s; }

/* ---------------------------------------------------------------- accessors */
Display *paladin_display_get_xdisplay(PaladinDisplay *d) { return d->dpy; }
xcb_connection_t *paladin_display_get_xcb(PaladinDisplay *d) { return d->xcb; }
Atom paladin_display_atom(PaladinDisplay *d, int which) { return d->atoms[which]; }
gboolean paladin_display_has_shm(PaladinDisplay *d) { return d->shm; }
gboolean paladin_display_has_dri3(PaladinDisplay *d) { return d->dri3; }
Time paladin_display_last_time(PaladinDisplay *d) { return d->last_time; }
gboolean paladin_display_dark(PaladinDisplay *d) { return d->dark; }
void paladin_display_set_hooks(PaladinDisplay *d, const PaladinHooks *h) { d->hooks = *h; }
const PaladinHooks *paladin_display_hooks(PaladinDisplay *d) { return &d->hooks; }
Visual *paladin_display_argb_visual(PaladinDisplay *d, Colormap *cmap) { if (cmap) *cmap = d->argb_cmap; return d->argb; }
void paladin_display_register_window(PaladinDisplay *d, Window w, gpointer t) { g_hash_table_insert(d->windows, GSIZE_TO_POINTER(w), t); }
void paladin_display_unregister_window(PaladinDisplay *d, Window w) { g_hash_table_remove(d->windows, GSIZE_TO_POINTER(w)); }

void paladin_display_get_workarea(PaladinDisplay *d, int *x, int *y, int *w, int *h)
{
    *x = d->wa[0]; *y = d->wa[1]; *w = d->wa[2]; *h = d->wa[3];
}

static gboolean get_cardinals(PaladinDisplay *d, Window w, Atom a, long *v, int n)
{
    Atom type; int fmt; unsigned long nitems, after; unsigned char *data = NULL;
    if (XGetWindowProperty(d->dpy, w, a, 0, n, False, XA_CARDINAL, &type, &fmt, &nitems, &after, &data) != Success
        || !data || fmt != 32 || (int)nitems < n) {
        if (data) XFree(data);
        return FALSE;
    }
    for (int i = 0; i < n; i++) v[i] = ((long *)data)[i];
    XFree(data);
    return TRUE;
}

static void read_workarea(PaladinDisplay *d)
{
    long wa[4];
    if (get_cardinals(d, d->root, d->atoms[PA_NET_WORKAREA], wa, 4) && wa[2] > 0 && wa[3] > 0) {
        for (int i = 0; i < 4; i++) d->wa[i] = (int)wa[i];
    } else {
        d->wa[0] = d->wa[1] = 0;
        d->wa[2] = DisplayWidth(d->dpy, d->scr); d->wa[3] = DisplayHeight(d->dpy, d->scr);
    }
}

static void read_dark(PaladinDisplay *d, gboolean tell)
{
    long v = 0;
    gboolean dark = get_cardinals(d, d->root, d->atoms[PA_PALADIN_DARK], &v, 1) && v;
    if (dark == d->dark && tell) return;
    d->dark = dark;
    wpe_settings_set_boolean(wpe_display_get_settings(WPE_DISPLAY(d)), WPE_SETTING_DARK_MODE, dark, WPE_SETTINGS_SOURCE_PLATFORM, NULL);
    if (tell && d->hooks.dark_changed) d->hooks.dark_changed(dark, d->hooks.data);
}

/* ---------------------------------------------------------------- keyboard */
static void load_keymap(PaladinDisplay *d)
{
    struct xkb_context *ctx = xkb_context_new(XKB_CONTEXT_NO_FLAGS);
    if (!ctx) return;
    struct xkb_keymap *km = xkb_x11_keymap_new_from_device(ctx, d->xcb, d->xkb_device, XKB_KEYMAP_COMPILE_NO_FLAGS);
    if (km) {
        char *text = xkb_keymap_get_as_string(km, XKB_KEYMAP_FORMAT_TEXT_V1);
        if (text) {
            size_t size = strlen(text) + 1;
            int fd = memfd_create("kibble-keymap", MFD_CLOEXEC);
            if (fd >= 0 && write(fd, text, size) == (ssize_t)size)
                wpe_keymap_xkb_update(WPE_KEYMAP_XKB(d->keymap), XKB_KEYMAP_FORMAT_TEXT_V1, fd, size);
            if (fd >= 0) close(fd);
            free(text);
        }
        xkb_keymap_unref(km);
    }
    xkb_context_unref(ctx);
}

/* ---------------------------------------------------------------- the event loop */
typedef struct { GSource base; PaladinDisplay *d; gpointer tag; } XSource;

static gboolean xs_prepare(GSource *s, gint *timeout)
{
    *timeout = -1;
    return XPending(((XSource *)s)->d->dpy) > 0;
}

static gboolean xs_check(GSource *s)
{
    XSource *x = (XSource *)s;
    return (g_source_query_unix_fd(s, x->tag) & G_IO_IN) || XPending(x->d->dpy) > 0;
}

static gpointer toplevel_for(PaladinDisplay *d, Window w)
{
    return g_hash_table_lookup(d->windows, GSIZE_TO_POINTER(w));
}

gpointer paladin_display_toplevel_for(PaladinDisplay *d, Window w) { return toplevel_for(d, w); }

static void note_time(PaladinDisplay *d, XEvent *ev)
{
    switch (ev->type) {
    case KeyPress: case KeyRelease: d->last_time = ev->xkey.time; break;
    case ButtonPress: case ButtonRelease: d->last_time = ev->xbutton.time; break;
    case MotionNotify: d->last_time = ev->xmotion.time; break;
    case PropertyNotify: d->last_time = ev->xproperty.time; break;
    case EnterNotify: case LeaveNotify: d->last_time = ev->xcrossing.time; break;
    }
}

static void dispatch_one(PaladinDisplay *d, XEvent *ev)
{
    note_time(d, ev);
    if (ev->type == d->xkb_event) {
        XkbEvent *xe = (XkbEvent *)ev;
        if (xe->any.xkb_type == XkbNewKeyboardNotify || xe->any.xkb_type == XkbMapNotify) load_keymap(d);
        return;
    }
    if (ev->type == GenericEvent && ev->xcookie.extension == d->xi_opcode) {
        /* touchpad pinch (X Input 2.4 gestures) */
        if (XGetEventData(d->dpy, &ev->xcookie)) {
            int t = ev->xcookie.evtype;
            if (t == XI_GesturePinchBegin || t == XI_GesturePinchUpdate || t == XI_GesturePinchEnd) {
                XIGesturePinchEvent *g = ev->xcookie.data;
                gpointer tl = toplevel_for(d, g->event);
                if (tl && d->hooks.gesture)
                    d->hooks.gesture(WPE_TOPLEVEL(tl), t == XI_GesturePinchBegin ? 0 : t == XI_GesturePinchUpdate ? 1 : 2,
                                     g->scale, g->delta_angle, g->event_x, g->event_y, d->hooks.data);
            }
            XFreeEventData(d->dpy, &ev->xcookie);
        }
        return;
    }
    if (ev->type == PropertyNotify && ev->xproperty.window == d->root) {
        if (ev->xproperty.atom == d->atoms[PA_PALADIN_DARK]) read_dark(d, TRUE);
        else if (ev->xproperty.atom == d->atoms[PA_NET_WORKAREA]) read_workarea(d);
        return;
    }
    if (ev->type == ConfigureNotify && ev->xconfigure.window == d->root) {
        if (d->screen) wpe_screen_set_size(d->screen, ev->xconfigure.width, ev->xconfigure.height);
        return;
    }
    if (ev->type == KeyPress && ev->xkey.window == d->root) {
        if (d->hooks.root_key) d->hooks.root_key(ev->xkey.keycode, ev->xkey.state, d->hooks.data);
        return;
    }
    if (d->clipboard && paladin_clipboard_handle_event(PALADIN_CLIPBOARD(d->clipboard), ev)) return;
    if (paladin_dnd_handle_event(d, ev)) return;
    gpointer tl = toplevel_for(d, ev->xany.window);
    if (tl) paladin_toplevel_handle_event(PALADIN_TOPLEVEL(tl), ev);
}

static gboolean poll_view(WPEToplevel *tl, WPEView *view, gpointer data)
{
    (void)tl; (void)data;
    paladin_view_poll(PALADIN_VIEW(view));
    return FALSE;
}

static void poll_present(gpointer key, gpointer value, gpointer data)
{
    (void)key; (void)data;
    wpe_toplevel_foreach_view(WPE_TOPLEVEL(value), poll_view, NULL);
}

static gboolean xs_dispatch(GSource *s, GSourceFunc cb, gpointer data)
{
    (void)cb; (void)data;
    PaladinDisplay *d = ((XSource *)s)->d;
    g_object_ref(d);
    while (XPending(d->dpy)) {
        XEvent ev;
        XNextEvent(d->dpy, &ev);
        dispatch_one(d, &ev);
    }
    g_hash_table_foreach(d->windows, poll_present, NULL);
    g_object_unref(d);
    return G_SOURCE_CONTINUE;
}

static GSourceFuncs xs_funcs = { xs_prepare, xs_check, xs_dispatch, NULL, NULL, NULL };

static int on_xerror(Display *dpy, XErrorEvent *e)
{
    if (paladin_debug) {
        char msg[128]; XGetErrorText(dpy, e->error_code, msg, sizeof msg);
        fprintf(stderr, "kibble-host: X error (request %d): %s\n", e->request_code, msg);
    }
    return 0;
}

static int on_xio(Display *dpy)
{
    (void)dpy;
    fputs("kibble-host: lost the connection to the desktop\n", stderr);
    exit(1);
}

/* ---------------------------------------------------------------- WPEDisplay */
static gboolean pd_connect(WPEDisplay *display, GError **error)
{
    PaladinDisplay *d = PALADIN_DISPLAY(display);
    d->dpy = XOpenDisplay(NULL);
    if (!d->dpy) {
        g_set_error_literal(error, WPE_DISPLAY_ERROR, WPE_DISPLAY_ERROR_CONNECTION_FAILED, "can't open the X display");
        return FALSE;
    }
    XSetErrorHandler(on_xerror);
    XSetIOErrorHandler(on_xio);
    d->xcb = XGetXCBConnection(d->dpy);
    d->scr = DefaultScreen(d->dpy);
    d->root = RootWindow(d->dpy, d->scr);
    XInternAtoms(d->dpy, (char **)atom_names, PA_COUNT, False, d->atoms);
    XSelectInput(d->dpy, d->root, PropertyChangeMask | StructureNotifyMask);

    int major, minor; Bool pixmaps;
    d->shm = XShmQueryVersion(d->dpy, &major, &minor, &pixmaps) && getenv("KIBBLE_NO_SHM") == NULL;
    /* GPU buffers go straight to the X server (DRI3 + Present) when it can take them */
    /* (asking an X server for an extension it doesn't have would close the connection: check first) */
    const xcb_query_extension_reply_t *dri3_ext = xcb_get_extension_data(d->xcb, &xcb_dri3_id);
    const xcb_query_extension_reply_t *present_ext = xcb_get_extension_data(d->xcb, &xcb_present_id);
    if (!getenv("KIBBLE_NO_DRI3") && dri3_ext && dri3_ext->present && present_ext && present_ext->present) {
        xcb_dri3_query_version_reply_t *dv = xcb_dri3_query_version_reply(d->xcb, xcb_dri3_query_version(d->xcb, 1, 2), NULL);
        xcb_present_query_version_reply_t *pv = xcb_present_query_version_reply(d->xcb, xcb_present_query_version(d->xcb, 1, 2), NULL);
        d->dri3 = dv && pv && (dv->major_version > 1 || dv->minor_version >= 2);
        free(dv); free(pv);
    }
    XVisualInfo vi;
    if (XMatchVisualInfo(d->dpy, d->scr, 32, TrueColor, &vi)) {
        d->argb = vi.visual;
        d->argb_cmap = XCreateColormap(d->dpy, d->root, d->argb, AllocNone);
    }
    /* keyboard */
    d->keymap = wpe_keymap_xkb_new();
    int xkb_err, xkb_maj = XkbMajorVersion, xkb_min = XkbMinorVersion, xkb_op;
    if (XkbQueryExtension(d->dpy, &xkb_op, &d->xkb_event, &xkb_err, &xkb_maj, &xkb_min)) {
        xkb_x11_setup_xkb_extension(d->xcb, XKB_X11_MIN_MAJOR_XKB_VERSION, XKB_X11_MIN_MINOR_XKB_VERSION,
                                    XKB_X11_SETUP_XKB_EXTENSION_NO_FLAGS, NULL, NULL, NULL, NULL);
        d->xkb_device = xkb_x11_get_core_keyboard_device_id(d->xcb);
        load_keymap(d);
        XkbSelectEvents(d->dpy, XkbUseCoreKbd, XkbNewKeyboardNotifyMask | XkbMapNotifyMask,
                        XkbNewKeyboardNotifyMask | XkbMapNotifyMask);
        Bool supported;
        XkbSetDetectableAutoRepeat(d->dpy, True, &supported);
    } else d->xkb_event = -1;
    /* touchpad gestures (X Input 2.4) */
    int ev, err;
    d->xi_opcode = -1;
    if (XQueryExtension(d->dpy, "XInputExtension", &d->xi_opcode, &ev, &err)) {
        int xmaj = 2, xmin = 4;
        if (XIQueryVersion(d->dpy, &xmaj, &xmin) != Success || xmaj < 2 || (xmaj == 2 && xmin < 4)) d->xi_opcode = -1;
    }
    /* screen */
    d->screen = g_object_new(PALADIN_TYPE_SCREEN, "id", 1, NULL);
    wpe_screen_set_position(d->screen, 0, 0);
    wpe_screen_set_size(d->screen, DisplayWidth(d->dpy, d->scr), DisplayHeight(d->dpy, d->scr));
    wpe_screen_set_physical_size(d->screen, DisplayWidthMM(d->dpy, d->scr), DisplayHeightMM(d->dpy, d->scr));
    double scale = 1;
    const char *env = getenv("PALOS_SCALE");
    if (env && atof(env) >= 1) scale = atof(env);
    else {
        char *rms = XResourceManagerString(d->dpy);
        if (rms) {
            XrmInitialize();
            XrmDatabase db = XrmGetStringDatabase(rms);
            char *type; XrmValue val;
            if (db && XrmGetResource(db, "Xft.dpi", "Xft.Dpi", &type, &val) && val.addr && atof(val.addr) >= 144)
                scale = (int)(atof(val.addr) / 96.0 + 0.25);
            if (db) XrmDestroyDatabase(db);
        }
    }
    wpe_screen_set_scale(d->screen, scale);
    wpe_screen_set_refresh_rate(d->screen, 60000);
    wpe_display_screen_added(display, d->screen);
    read_workarea(d);
    read_dark(d, FALSE);
    /* palOS's font and the keyboard repeat the desktop uses */
    WPESettings *settings = wpe_display_get_settings(display);
    wpe_settings_set_string(settings, WPE_SETTING_FONT_NAME, "Noto Sans 10", WPE_SETTINGS_SOURCE_PLATFORM, NULL);
    unsigned int delay = 0, interval = 0;
    if (XkbGetAutoRepeatRate(d->dpy, XkbUseCoreKbd, &delay, &interval) && delay) {
        wpe_settings_set_uint32(settings, WPE_SETTING_KEY_REPEAT_DELAY, delay, WPE_SETTINGS_SOURCE_PLATFORM, NULL);
        wpe_settings_set_uint32(settings, WPE_SETTING_KEY_REPEAT_INTERVAL, interval, WPE_SETTINGS_SOURCE_PLATFORM, NULL);
    }
    d->clipboard = paladin_clipboard_new(d);

    XSource *xs = (XSource *)g_source_new(&xs_funcs, sizeof(XSource));
    xs->d = d;
    xs->tag = g_source_add_unix_fd((GSource *)xs, ConnectionNumber(d->dpy), G_IO_IN);
    g_source_set_name((GSource *)xs, "kibble X events");
    g_source_set_priority((GSource *)xs, G_PRIORITY_DEFAULT);
    g_source_attach((GSource *)xs, NULL);
    d->source = (GSource *)xs;
    PLOG("connected (shm %d, dri3 %d, gestures %d, scale %.0f)", d->shm, d->dri3, d->xi_opcode >= 0, scale);
    return TRUE;
}

static WPEView *pd_create_view(WPEDisplay *display)
{
    return WPE_VIEW(g_object_new(PALADIN_TYPE_VIEW, "display", display, NULL));
}

static WPEToplevel *pd_create_toplevel(WPEDisplay *display, guint max_views)
{
    (void)max_views;
    PaladinToplevelOptions o = { .x = -1, .y = -1, .width = 800, .height = 600, .frame = TRUE, .focusable = TRUE, .type = "" };
    return paladin_toplevel_new(PALADIN_DISPLAY(display), &o);
}

static WPEKeymap *pd_get_keymap(WPEDisplay *display) { return PALADIN_DISPLAY(display)->keymap; }
static WPEClipboard *pd_get_clipboard(WPEDisplay *display) { return PALADIN_DISPLAY(display)->clipboard; }
static guint pd_get_n_screens(WPEDisplay *display) { return PALADIN_DISPLAY(display)->screen ? 1 : 0; }
static WPEScreen *pd_get_screen(WPEDisplay *display, guint i) { return i == 0 ? PALADIN_DISPLAY(display)->screen : NULL; }

/* the graphics card the X server draws with (from DRI3), so pages render on it and hand frames straight over */
static WPEDRMDevice *pd_get_drm_device(WPEDisplay *display)
{
    PaladinDisplay *d = PALADIN_DISPLAY(display);
    if (d->drm_looked) return d->drm;
    d->drm_looked = TRUE;
    if (!d->dri3) return NULL;
    xcb_dri3_open_reply_t *r = xcb_dri3_open_reply(d->xcb, xcb_dri3_open(d->xcb, d->root, 0), NULL);
    if (!r) return NULL;
    int *fds = xcb_dri3_open_reply_fds(d->xcb, r);
    int fd = r->nfd > 0 ? fds[0] : -1;
    free(r);
    if (fd < 0) return NULL;
    drmDevicePtr dev = NULL;
    if (drmGetDevice2(fd, 0, &dev) == 0 && dev) {
        const char *primary = (dev->available_nodes & (1 << DRM_NODE_PRIMARY)) ? dev->nodes[DRM_NODE_PRIMARY] : NULL;
        const char *render = (dev->available_nodes & (1 << DRM_NODE_RENDER)) ? dev->nodes[DRM_NODE_RENDER] : NULL;
        if (primary || render) d->drm = wpe_drm_device_new(primary, render);
        PLOG("graphics device %s", render ? render : primary ? primary : "?");
        drmFreeDevice(&dev);
    }
    close(fd);
    if (!d->drm) d->dri3 = FALSE;
    return d->drm;
}

static void add_modifiers(PaladinDisplay *d, WPEBufferFormatsBuilder *b, guint8 depth, guint32 fourcc)
{
    xcb_dri3_get_supported_modifiers_reply_t *r = xcb_dri3_get_supported_modifiers_reply(d->xcb,
        xcb_dri3_get_supported_modifiers(d->xcb, d->root, depth, 32), NULL);
    gboolean any = FALSE;
    if (r) {
        uint64_t *m = xcb_dri3_get_supported_modifiers_screen_modifiers(r);
        int n = xcb_dri3_get_supported_modifiers_screen_modifiers_length(r);
        for (int i = 0; i < n; i++) { wpe_buffer_formats_builder_append_format(b, fourcc, m[i]); any = TRUE; }
        free(r);
    }
    if (!any) wpe_buffer_formats_builder_append_format(b, fourcc, DRM_FORMAT_MOD_LINEAR);
}

static WPEBufferFormats *pd_get_preferred_buffer_formats(WPEDisplay *display)
{
    PaladinDisplay *d = PALADIN_DISPLAY(display);
    if (d->formats) return d->formats;
    WPEDRMDevice *dev = pd_get_drm_device(display);
    if (!dev) return NULL;
    WPEBufferFormatsBuilder *b = wpe_buffer_formats_builder_new(dev);
    wpe_buffer_formats_builder_append_group(b, dev, WPE_BUFFER_FORMAT_USAGE_RENDERING);
    if (d->argb) add_modifiers(d, b, 32, DRM_FORMAT_ARGB8888);
    add_modifiers(d, b, 24, DRM_FORMAT_XRGB8888);
    d->formats = wpe_buffer_formats_builder_end(b);
    return d->formats;
}

/* EGL for WebKit's own use on this side (checking formats): on the graphics card, without a window */
static gpointer pd_get_egl_display(WPEDisplay *display, GError **error)
{
    (void)display;
    EGLDisplay egl = EGL_NO_DISPLAY;
    if (epoxy_has_egl_extension(NULL, "EGL_MESA_platform_surfaceless")) {
        if (epoxy_has_egl_extension(NULL, "EGL_EXT_platform_base"))
            egl = eglGetPlatformDisplayEXT(EGL_PLATFORM_SURFACELESS_MESA, EGL_DEFAULT_DISPLAY, NULL);
        else if (epoxy_has_egl_extension(NULL, "EGL_KHR_platform_base"))
            egl = eglGetPlatformDisplay(EGL_PLATFORM_SURFACELESS_MESA, EGL_DEFAULT_DISPLAY, NULL);
    }
    if (egl == EGL_NO_DISPLAY) {
        g_set_error_literal(error, WPE_EGL_ERROR, WPE_EGL_ERROR_NOT_AVAILABLE, "no surfaceless EGL display");
        return NULL;
    }
    return egl;
}

static void pd_dispose(GObject *o)
{
    PaladinDisplay *d = PALADIN_DISPLAY(o);
    if (d->source) { g_source_destroy(d->source); g_source_unref(d->source); d->source = NULL; }
    g_clear_object(&d->clipboard);
    g_clear_object(&d->keymap);
    g_clear_object(&d->screen);
    g_clear_object(&d->formats);
    g_clear_pointer(&d->drm, wpe_drm_device_unref);
    G_OBJECT_CLASS(paladin_display_parent_class)->dispose(o);
}

static void pd_finalize(GObject *o)
{
    PaladinDisplay *d = PALADIN_DISPLAY(o);
    g_hash_table_destroy(d->windows);
    if (d->dpy) XCloseDisplay(d->dpy);
    G_OBJECT_CLASS(paladin_display_parent_class)->finalize(o);
}

static void paladin_display_class_init(PaladinDisplayClass *klass)
{
    GObjectClass *oc = G_OBJECT_CLASS(klass);
    oc->dispose = pd_dispose;
    oc->finalize = pd_finalize;
    WPEDisplayClass *dc = WPE_DISPLAY_CLASS(klass);
    dc->connect = pd_connect;
    dc->create_view = pd_create_view;
    dc->create_toplevel = pd_create_toplevel;
    dc->get_keymap = pd_get_keymap;
    dc->get_clipboard = pd_get_clipboard;
    dc->get_n_screens = pd_get_n_screens;
    dc->get_screen = pd_get_screen;
    dc->get_drm_device = pd_get_drm_device;
    dc->get_preferred_buffer_formats = pd_get_preferred_buffer_formats;
    dc->get_egl_display = pd_get_egl_display;
}

static void paladin_display_init(PaladinDisplay *d)
{
    d->windows = g_hash_table_new(g_direct_hash, g_direct_equal);
    d->xkb_event = -1;
    d->xi_opcode = -1;
}

PaladinDisplay *paladin_display_new(void)
{
    paladin_debug = getenv("KIBBLE_DEBUG") && *getenv("KIBBLE_DEBUG");
    return g_object_new(PALADIN_TYPE_DISPLAY, NULL);
}

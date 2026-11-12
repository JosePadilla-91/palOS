/* Kibble's window layer: a window on palOS's desktop (PaladinToplevel). */
#define _GNU_SOURCE
#include "paladin.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <X11/extensions/shape.h>
#include <X11/extensions/XInput2.h>

struct _PaladinToplevel {
    WPEToplevel parent;
    PaladinDisplay *display;
    Window win;
    Visual *visual;
    int depth;
    gboolean transparent, mapped, shown;
    int width, height;              /* in pixels */
    WPEToplevelState state;
};

G_DEFINE_FINAL_TYPE(PaladinToplevel, paladin_toplevel, WPE_TYPE_TOPLEVEL)

Window paladin_toplevel_get_window(PaladinToplevel *t) { return t->win; }
gboolean paladin_toplevel_is_transparent(PaladinToplevel *t) { return t->transparent; }

static Display *xd(PaladinToplevel *t) { return paladin_display_get_xdisplay(t->display); }
static Atom A(PaladinToplevel *t, int which) { return paladin_display_atom(t->display, which); }

static gboolean each_view_resize(WPEToplevel *tl, WPEView *view, gpointer data)
{
    (void)data;
    PaladinToplevel *t = PALADIN_TOPLEVEL(tl);
    double scale = wpe_toplevel_get_scale(tl);
    paladin_view_set_size(PALADIN_VIEW(view), t->width, t->height);
    wpe_view_resized(view, (int)(t->width / scale), (int)(t->height / scale));
    return FALSE;
}

static gboolean each_view_map(WPEToplevel *tl, WPEView *view, gpointer data)
{
    (void)tl;
    if (GPOINTER_TO_INT(data)) wpe_view_map(view); else wpe_view_unmap(view);
    return FALSE;
}

static gboolean each_view_focus(WPEToplevel *tl, WPEView *view, gpointer data)
{
    (void)tl;
    if (GPOINTER_TO_INT(data)) wpe_view_focus_in(view); else wpe_view_focus_out(view);
    return FALSE;
}

static gboolean each_view_event(WPEToplevel *tl, WPEView *view, gpointer data)
{
    (void)tl;
    paladin_view_handle_event(PALADIN_VIEW(view), data);
    return FALSE;
}

static void send_net_state(PaladinToplevel *t, long action, Atom a1, Atom a2)
{
    XEvent ev = {0};
    ev.xclient.type = ClientMessage;
    ev.xclient.window = t->win;
    ev.xclient.message_type = A(t, PA_NET_WM_STATE);
    ev.xclient.format = 32;
    ev.xclient.data.l[0] = action;
    ev.xclient.data.l[1] = a1;
    ev.xclient.data.l[2] = a2;
    ev.xclient.data.l[3] = 1;
    XSendEvent(xd(t), DefaultRootWindow(xd(t)), False, SubstructureRedirectMask | SubstructureNotifyMask, &ev);
    XFlush(xd(t));
}

static void read_state(PaladinToplevel *t)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    WPEToplevelState st = t->state & WPE_TOPLEVEL_STATE_ACTIVE;
    if (XGetWindowProperty(xd(t), t->win, A(t, PA_NET_WM_STATE), 0, 32, False, XA_ATOM, &type, &fmt, &n, &after, &data) == Success && data) {
        gboolean v = FALSE, h = FALSE;
        for (unsigned long i = 0; i < n; i++) {
            Atom a = ((Atom *)data)[i];
            if (a == A(t, PA_NET_WM_STATE_FULLSCREEN)) st |= WPE_TOPLEVEL_STATE_FULLSCREEN;
            else if (a == A(t, PA_NET_WM_STATE_MAXIMIZED_VERT)) v = TRUE;
            else if (a == A(t, PA_NET_WM_STATE_MAXIMIZED_HORZ)) h = TRUE;
        }
        if (v && h) st |= WPE_TOPLEVEL_STATE_MAXIMIZED;
    }
    if (data) XFree(data);
    t->state = st;
    wpe_toplevel_state_changed(WPE_TOPLEVEL(t), st);
}

void paladin_toplevel_handle_event(PaladinToplevel *t, XEvent *ev)
{
    WPEToplevel *tl = WPE_TOPLEVEL(t);
    switch (ev->type) {
    case ConfigureNotify:
        if (ev->xconfigure.width != t->width || ev->xconfigure.height != t->height) {
            t->width = ev->xconfigure.width; t->height = ev->xconfigure.height;
            double scale = wpe_toplevel_get_scale(tl);
            wpe_toplevel_resized(tl, (int)(t->width / scale), (int)(t->height / scale));
            wpe_toplevel_foreach_view(tl, each_view_resize, NULL);
        }
        break;
    case MapNotify:
        t->mapped = TRUE;
        break;
    case UnmapNotify:
        t->mapped = FALSE;
        break;
    case FocusIn:
        if (ev->xfocus.mode == NotifyGrab || ev->xfocus.mode == NotifyUngrab || ev->xfocus.detail == NotifyPointer) break;
        t->state |= WPE_TOPLEVEL_STATE_ACTIVE;
        wpe_toplevel_state_changed(tl, t->state);
        wpe_toplevel_foreach_view(tl, each_view_focus, GINT_TO_POINTER(1));
        break;
    case FocusOut:
        if (ev->xfocus.mode == NotifyGrab || ev->xfocus.mode == NotifyUngrab || ev->xfocus.detail == NotifyPointer
            || ev->xfocus.detail == NotifyInferior) break;
        t->state &= ~WPE_TOPLEVEL_STATE_ACTIVE;
        wpe_toplevel_state_changed(tl, t->state);
        wpe_toplevel_foreach_view(tl, each_view_focus, GINT_TO_POINTER(0));
        break;
    case PropertyNotify:
        if (ev->xproperty.atom == A(t, PA_NET_WM_STATE)) read_state(t);
        break;
    case ClientMessage:
        if (ev->xclient.message_type == A(t, PA_WM_PROTOCOLS)) {
            Atom p = (Atom)ev->xclient.data.l[0];
            if (p == A(t, PA_WM_DELETE_WINDOW)) {
                const PaladinHooks *h = paladin_display_hooks(t->display);
                if (h->close_requested) h->close_requested(tl, h->data);
                else wpe_toplevel_closed(tl);
            } else if (p == A(t, PA_WM_TAKE_FOCUS)) {
                XSetInputFocus(xd(t), t->win, RevertToParent, (Time)ev->xclient.data.l[1]);
            }
        }
        break;
    default:
        /* keys, pointer, exposure: the page's */
        wpe_toplevel_foreach_view(tl, each_view_event, ev);
        break;
    }
}

/* ---------------------------------------------------------------- WPEToplevel */
static void pt_set_title(WPEToplevel *tl, const char *title)
{
    PaladinToplevel *t = PALADIN_TOPLEVEL(tl);
    if (!t->win) return;
    const char *s = title ? title : "";
    XChangeProperty(xd(t), t->win, A(t, PA_NET_WM_NAME), A(t, PA_UTF8_STRING), 8, PropModeReplace, (const unsigned char *)s, strlen(s));
    XTextProperty tp;
    char *list[1] = { (char *)s };
    if (Xutf8TextListToTextProperty(xd(t), list, 1, XStdICCTextStyle, &tp) >= Success) {
        XSetWMName(xd(t), t->win, &tp);
        XFree(tp.value);
    }
    XFlush(xd(t));
}

static WPEScreen *pt_get_screen(WPEToplevel *tl)
{
    return wpe_display_get_screen(WPE_DISPLAY(PALADIN_TOPLEVEL(tl)->display), 0);
}

static gboolean pt_resize(WPEToplevel *tl, int width, int height)
{
    PaladinToplevel *t = PALADIN_TOPLEVEL(tl);
    double scale = wpe_toplevel_get_scale(tl);
    XResizeWindow(xd(t), t->win, MAX(1, (int)(width * scale)), MAX(1, (int)(height * scale)));
    XFlush(xd(t));
    return TRUE;
}

static gboolean pt_set_fullscreen(WPEToplevel *tl, gboolean on)
{
    PaladinToplevel *t = PALADIN_TOPLEVEL(tl);
    send_net_state(t, on ? 1 : 0, A(t, PA_NET_WM_STATE_FULLSCREEN), 0);
    return TRUE;
}

static gboolean pt_set_maximized(WPEToplevel *tl, gboolean on)
{
    PaladinToplevel *t = PALADIN_TOPLEVEL(tl);
    send_net_state(t, on ? 1 : 0, A(t, PA_NET_WM_STATE_MAXIMIZED_VERT), A(t, PA_NET_WM_STATE_MAXIMIZED_HORZ));
    return TRUE;
}

static gboolean pt_set_minimized(WPEToplevel *tl)
{
    PaladinToplevel *t = PALADIN_TOPLEVEL(tl);
    XIconifyWindow(xd(t), t->win, DefaultScreen(xd(t)));
    XFlush(xd(t));
    return TRUE;
}

static WPEBufferFormats *pt_get_preferred_buffer_formats(WPEToplevel *tl)
{
    return wpe_display_get_preferred_buffer_formats(WPE_DISPLAY(PALADIN_TOPLEVEL(tl)->display));
}

static void pt_dispose(GObject *o)
{
    PaladinToplevel *t = PALADIN_TOPLEVEL(o);
    if (t->win) {
        paladin_display_unregister_window(t->display, t->win);
        XDestroyWindow(xd(t), t->win);
        XFlush(xd(t));
        t->win = 0;
    }
    G_OBJECT_CLASS(paladin_toplevel_parent_class)->dispose(o);
}

static void paladin_toplevel_class_init(PaladinToplevelClass *klass)
{
    G_OBJECT_CLASS(klass)->dispose = pt_dispose;
    WPEToplevelClass *tc = WPE_TOPLEVEL_CLASS(klass);
    tc->set_title = pt_set_title;
    tc->get_screen = pt_get_screen;
    tc->resize = pt_resize;
    tc->set_fullscreen = pt_set_fullscreen;
    tc->set_maximized = pt_set_maximized;
    tc->set_minimized = pt_set_minimized;
    tc->get_preferred_buffer_formats = pt_get_preferred_buffer_formats;
}

static void paladin_toplevel_init(PaladinToplevel *t) { (void)t; }

/* a view joining this window draws into it */
static void on_view_toplevel(GObject *view, GParamSpec *ps, gpointer data)
{
    (void)ps; (void)data;
    WPEToplevel *tl = wpe_view_get_toplevel(WPE_VIEW(view));
    if (tl && PALADIN_IS_TOPLEVEL(tl)) {
        PaladinToplevel *t = PALADIN_TOPLEVEL(tl);
        paladin_view_attach(PALADIN_VIEW(view), t->win, t->visual, t->depth);
        paladin_view_set_size(PALADIN_VIEW(view), t->width, t->height);
        double scale = wpe_toplevel_get_scale(tl);
        wpe_view_resized(WPE_VIEW(view), (int)(t->width / scale), (int)(t->height / scale));
        if (t->shown) wpe_view_map(WPE_VIEW(view));
    } else paladin_view_detach(PALADIN_VIEW(view));
}

static Atom type_atom(PaladinToplevel *t, const char *type)
{
    if (!type || !*type || !strcmp(type, "normal")) return A(t, PA_NET_WM_WINDOW_TYPE_NORMAL);
    if (!strcmp(type, "dock")) return A(t, PA_NET_WM_WINDOW_TYPE_DOCK);
    if (!strcmp(type, "desktop")) return A(t, PA_NET_WM_WINDOW_TYPE_DESKTOP);
    if (!strcmp(type, "toolbar")) return A(t, PA_NET_WM_WINDOW_TYPE_TOOLBAR);
    if (!strcmp(type, "splash")) return A(t, PA_NET_WM_WINDOW_TYPE_SPLASH);
    if (!strcmp(type, "dialog")) return A(t, PA_NET_WM_WINDOW_TYPE_DIALOG);
    if (!strcmp(type, "utility") || !strcmp(type, "panel")) return A(t, PA_NET_WM_WINDOW_TYPE_UTILITY);
    if (!strcmp(type, "notification")) return A(t, PA_NET_WM_WINDOW_TYPE_NOTIFICATION);
    if (!strcmp(type, "popup") || !strcmp(type, "menu")) return A(t, PA_NET_WM_WINDOW_TYPE_POPUP_MENU);
    return A(t, PA_NET_WM_WINDOW_TYPE_NORMAL);
}

WPEToplevel *paladin_toplevel_new(PaladinDisplay *display, const PaladinToplevelOptions *o)
{
    PaladinToplevel *t = g_object_new(PALADIN_TYPE_TOPLEVEL, "display", display, "max-views", 1, NULL);
    t->display = display;
    Display *dpy = xd(t);
    int scr = DefaultScreen(dpy);
    Window root = RootWindow(dpy, scr);
    double scale = 1;
    WPEScreen *s = wpe_display_get_screen(WPE_DISPLAY(display), 0);
    if (s) scale = wpe_screen_get_scale(s);
    wpe_toplevel_scale_changed(WPE_TOPLEVEL(t), scale);

    Colormap cmap = 0;
    Visual *argb = paladin_display_argb_visual(display, &cmap);
    XSetWindowAttributes sa = {0};
    unsigned long mask = CWEventMask | CWBorderPixel | CWBitGravity | CWBackPixmap;
    sa.border_pixel = 0;
    sa.bit_gravity = NorthWestGravity;
    sa.background_pixmap = None;
    sa.event_mask = ExposureMask | StructureNotifyMask | KeyPressMask | KeyReleaseMask | ButtonPressMask | ButtonReleaseMask
                  | PointerMotionMask | EnterWindowMask | LeaveWindowMask | FocusChangeMask | PropertyChangeMask;
    if (o->transparent && argb) {
        t->visual = argb; t->depth = 32; t->transparent = TRUE;
        sa.colormap = cmap; mask |= CWColormap;
    } else {
        t->visual = DefaultVisual(dpy, scr); t->depth = DefaultDepth(dpy, scr);
    }
    t->width = MAX(1, (int)(o->width * scale)); t->height = MAX(1, (int)(o->height * scale));
    int x = o->x >= 0 ? (int)(o->x * scale) : 0, y = o->y >= 0 ? (int)(o->y * scale) : 0;
    t->win = XCreateWindow(dpy, root, x, y, t->width, t->height, 0, t->depth, InputOutput, t->visual, mask, &sa);
    paladin_display_register_window(display, t->win, t);
    wpe_toplevel_resized(WPE_TOPLEVEL(t), (int)(t->width / scale), (int)(t->height / scale));

    /* what the window manager, the Dock and Seeker read */
    XClassHint ch = { (char *)(o->wm_name ? o->wm_name : "kibble"), (char *)(o->wm_class ? o->wm_class : "Kibble") };
    XSetClassHint(dpy, t->win, &ch);
    Atom protocols[2] = { A(t, PA_WM_DELETE_WINDOW), A(t, PA_WM_TAKE_FOCUS) };
    XSetWMProtocols(dpy, t->win, protocols, o->focusable ? 2 : 1);
    long pid = getpid();
    XChangeProperty(dpy, t->win, A(t, PA_NET_WM_PID), XA_CARDINAL, 32, PropModeReplace, (unsigned char *)&pid, 1);
    XWMHints wh = { .flags = InputHint | StateHint, .input = o->focusable, .initial_state = NormalState };
    XSetWMHints(dpy, t->win, &wh);
    XSizeHints sh = {0};
    if (o->x >= 0 && o->y >= 0) { sh.flags |= USPosition; sh.x = x; sh.y = y; }
    sh.flags |= PSize; sh.width = t->width; sh.height = t->height;
    XSetWMNormalHints(dpy, t->win, &sh);
    Atom type = type_atom(t, o->type);
    XChangeProperty(dpy, t->win, A(t, PA_NET_WM_WINDOW_TYPE), XA_ATOM, 32, PropModeReplace, (unsigned char *)&type, 1);
    if (!o->frame) {
        long motif[5] = { 2, 0, 0, 0, 0 };     /* decorations given: none */
        XChangeProperty(dpy, t->win, A(t, PA_MOTIF_WM_HINTS), A(t, PA_MOTIF_WM_HINTS), 32, PropModeReplace, (unsigned char *)motif, 5);
    }
    if (o->parent) XSetTransientForHint(dpy, t->win, o->parent);
    Atom states[4]; int ns = 0;
    if (o->always_on_top) states[ns++] = A(t, PA_NET_WM_STATE_ABOVE);
    if (o->skip_taskbar) { states[ns++] = A(t, PA_NET_WM_STATE_SKIP_TASKBAR); states[ns++] = A(t, PA_NET_WM_STATE_SKIP_PAGER); }
    if (o->sticky) states[ns++] = A(t, PA_NET_WM_STATE_STICKY);
    if (ns) XChangeProperty(dpy, t->win, A(t, PA_NET_WM_STATE), XA_ATOM, 32, PropModeReplace, (unsigned char *)states, ns);
    if (o->sticky) {
        long all = (long)0xFFFFFFFFUL;
        XChangeProperty(dpy, t->win, A(t, PA_NET_WM_DESKTOP), XA_CARDINAL, 32, PropModeReplace, (unsigned char *)&all, 1);
    }
    if (o->click_through) paladin_toplevel_set_shape(t, TRUE, NULL, 0, FALSE);
    paladin_dnd_make_aware(display, t->win);
    /* touchpad pinch for the page (Kibble's gesture events) */
    XIEventMask em; unsigned char bits[XIMaskLen(XI_LASTEVENT)] = {0};
    XISetMask(bits, XI_GesturePinchBegin); XISetMask(bits, XI_GesturePinchUpdate); XISetMask(bits, XI_GesturePinchEnd);
    em.deviceid = XIAllMasterDevices; em.mask_len = sizeof bits; em.mask = bits;
    XISelectEvents(dpy, t->win, &em, 1);
    XFlush(dpy);
    return WPE_TOPLEVEL(t);
}

/* views announce themselves when their toplevel is set */
void paladin_view_watch_toplevel(WPEView *view)
{
    g_signal_connect(view, "notify::toplevel", G_CALLBACK(on_view_toplevel), NULL);
    if (wpe_view_get_toplevel(view)) on_view_toplevel(G_OBJECT(view), NULL, NULL);
}

void paladin_toplevel_show(PaladinToplevel *t, gboolean focus)
{
    t->shown = TRUE;
    if (!focus) {
        /* shown without taking the keyboard */
        long zero = 0;
        XChangeProperty(xd(t), t->win, A(t, PA_NET_WM_USER_TIME), XA_CARDINAL, 32, PropModeReplace, (unsigned char *)&zero, 1);
    }
    XMapRaised(xd(t), t->win);
    wpe_toplevel_foreach_view(WPE_TOPLEVEL(t), each_view_map, GINT_TO_POINTER(1));
    if (focus) paladin_toplevel_focus(t);
    XFlush(xd(t));
}

void paladin_toplevel_hide(PaladinToplevel *t)
{
    t->shown = FALSE;
    XUnmapWindow(xd(t), t->win);
    /* a window that's withdrawn tells the window manager (ICCCM) */
    XEvent ev = {0};
    ev.xunmap.type = UnmapNotify; ev.xunmap.event = DefaultRootWindow(xd(t)); ev.xunmap.window = t->win;
    XSendEvent(xd(t), DefaultRootWindow(xd(t)), False, SubstructureRedirectMask | SubstructureNotifyMask, &ev);
    wpe_toplevel_foreach_view(WPE_TOPLEVEL(t), each_view_map, GINT_TO_POINTER(0));
    XFlush(xd(t));
}

void paladin_toplevel_focus(PaladinToplevel *t)
{
    /* asked of the window manager, which raises it, brings its screen up and gives it the keyboard */
    XEvent ev = {0};
    ev.xclient.type = ClientMessage;
    ev.xclient.window = t->win;
    ev.xclient.message_type = A(t, PA_NET_ACTIVE_WINDOW);
    ev.xclient.format = 32;
    ev.xclient.data.l[0] = 1;
    ev.xclient.data.l[1] = paladin_display_last_time(t->display);
    XSendEvent(xd(t), DefaultRootWindow(xd(t)), False, SubstructureRedirectMask | SubstructureNotifyMask, &ev);
    XFlush(xd(t));
}

void paladin_toplevel_move(PaladinToplevel *t, int x, int y)
{
    double scale = wpe_toplevel_get_scale(WPE_TOPLEVEL(t));
    XMoveWindow(xd(t), t->win, (int)(x * scale), (int)(y * scale));
    XFlush(xd(t));
}

/* the window's own outline (bounding) or where it takes the pointer (input); all: back to the whole window */
void paladin_toplevel_set_shape(PaladinToplevel *t, gboolean input, const int *rects, int n, gboolean all)
{
    double scale = wpe_toplevel_get_scale(WPE_TOPLEVEL(t));
    int kind = input ? ShapeInput : ShapeBounding;
    if (all) { XShapeCombineMask(xd(t), t->win, kind, 0, 0, None, ShapeSet); XFlush(xd(t)); return; }
    XRectangle *r = g_new0(XRectangle, MAX(n, 1));
    for (int i = 0; i < n; i++) {
        r[i].x = (short)(rects[4 * i] * scale); r[i].y = (short)(rects[4 * i + 1] * scale);
        r[i].width = (unsigned short)(rects[4 * i + 2] * scale); r[i].height = (unsigned short)(rects[4 * i + 3] * scale);
    }
    XShapeCombineRectangles(xd(t), t->win, kind, 0, 0, r, n, ShapeSet, Unsorted);
    g_free(r);
    XFlush(xd(t));
}

/* a property for the window manager (CARDINAL numbers or ATOM names); no values removes it */
void paladin_toplevel_set_property(PaladinToplevel *t, const char *name, const char *type, const char **values, int n)
{
    Atom prop = XInternAtom(xd(t), name, False);
    if (n == 0) { XDeleteProperty(xd(t), t->win, prop); XFlush(xd(t)); return; }
    long *v = g_new0(long, n);
    gboolean atoms = type && !strcmp(type, "ATOM");
    for (int i = 0; i < n; i++) v[i] = atoms ? (long)XInternAtom(xd(t), values[i], False) : strtol(values[i], NULL, 0);
    XChangeProperty(xd(t), t->win, prop, atoms ? XA_ATOM : XA_CARDINAL, 32, PropModeReplace, (unsigned char *)v, n);
    g_free(v);
    XFlush(xd(t));
}

/* a page's own title bar was pressed: the window manager moves the window from here */
void paladin_toplevel_begin_move(PaladinToplevel *t, int root_x, int root_y, int button)
{
    XUngrabPointer(xd(t), CurrentTime);
    XEvent ev = {0};
    ev.xclient.type = ClientMessage;
    ev.xclient.window = t->win;
    ev.xclient.message_type = A(t, PA_NET_WM_MOVERESIZE);
    ev.xclient.format = 32;
    ev.xclient.data.l[0] = root_x; ev.xclient.data.l[1] = root_y;
    ev.xclient.data.l[2] = 8;           /* move */
    ev.xclient.data.l[3] = button; ev.xclient.data.l[4] = 1;
    XSendEvent(xd(t), DefaultRootWindow(xd(t)), False, SubstructureRedirectMask | SubstructureNotifyMask, &ev);
    XFlush(xd(t));
}

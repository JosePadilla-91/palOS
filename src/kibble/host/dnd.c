/* Kibble's window layer: drag and drop with other apps (XDND): files dropped onto a page, files dragged out. */
#define _GNU_SOURCE
#include "paladin.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <X11/Xcursor/Xcursor.h>

#define XDND_VERSION 5

/* a drag coming in */
static struct {
    Window target;              /* our window under it */
    Window source;
    gboolean has_uris;
    int x, y;                   /* last position, window pixels */
    Time drop_time;
} in;

/* a drag going out */
static struct {
    PaladinDisplay *d;
    PaladinToplevel *from;
    char *data;                 /* text/uri-list */
    Window over, over_proxy;    /* the window under the pointer that speaks XDND */
    int over_version;
    gboolean accepted, dropped;
    Window icon;
    int icon_w, icon_h;
    guint timeout;
} out;

static Atom A(PaladinDisplay *d, int w) { return paladin_display_atom(d, w); }

void paladin_dnd_make_aware(PaladinDisplay *d, Window w)
{
    long v = XDND_VERSION;
    XChangeProperty(paladin_display_get_xdisplay(d), w, A(d, PA_XdndAware), XA_ATOM, 32, PropModeReplace, (unsigned char *)&v, 1);
}

static void send_message(PaladinDisplay *d, Window to, Atom type, long l0, long l1, long l2, long l3, long l4)
{
    XEvent ev = {0};
    ev.xclient.type = ClientMessage;
    ev.xclient.window = to;
    ev.xclient.message_type = type;
    ev.xclient.format = 32;
    ev.xclient.data.l[0] = l0; ev.xclient.data.l[1] = l1; ev.xclient.data.l[2] = l2;
    ev.xclient.data.l[3] = l3; ev.xclient.data.l[4] = l4;
    XSendEvent(paladin_display_get_xdisplay(d), to, False, NoEventMask, &ev);
}

static gboolean offers_uris(PaladinDisplay *d, XClientMessageEvent *e)
{
    Display *dpy = paladin_display_get_xdisplay(d);
    Atom want = A(d, PA_TEXT_URI_LIST);
    if (e->data.l[1] & 1) {
        Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
        gboolean found = FALSE;
        if (XGetWindowProperty(dpy, (Window)e->data.l[0], A(d, PA_XdndTypeList), 0, 256, False, XA_ATOM, &type, &fmt, &n, &after, &data) == Success && data) {
            for (unsigned long i = 0; i < n; i++) if (((Atom *)data)[i] == want) found = TRUE;
            XFree(data);
        }
        return found;
    }
    for (int i = 2; i <= 4; i++) if ((Atom)e->data.l[i] == want) return TRUE;
    return FALSE;
}

static void hook_drop(PaladinDisplay *d, Window w, int phase, const char *uris)
{
    const PaladinHooks *h = paladin_display_hooks(d);
    if (!h->drop) return;
    gpointer tl = paladin_display_toplevel_for(d, w);
    if (!tl) return;
    double s = wpe_toplevel_get_scale(WPE_TOPLEVEL(tl));
    h->drop(WPE_TOPLEVEL(tl), phase, (int)(in.x / s), (int)(in.y / s), uris ? uris : "", h->data);
}

/* ---------------------------------------------------------------- the outgoing drag */
static Window xdnd_window_at(PaladinDisplay *d, int rx, int ry, int *version, Window *proxy)
{
    Display *dpy = paladin_display_get_xdisplay(d);
    Window root = DefaultRootWindow(dpy), w = root, child;
    int x, y;
    *version = 0; *proxy = None;
    /* go down from the root to the window that says it takes XDND (skipping our drag picture) */
    for (int depth = 0; depth < 16; depth++) {
        if (!XTranslateCoordinates(dpy, root, w, rx, ry, &x, &y, &child)) return None;
        if (w != root) {
            Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
            if (XGetWindowProperty(dpy, w, A(d, PA_XdndAware), 0, 1, False, AnyPropertyType, &type, &fmt, &n, &after, &data) == Success && data && n) {
                *version = (int)*(long *)data;
                XFree(data);
                Window px = None;
                data = NULL;
                if (XGetWindowProperty(dpy, w, A(d, PA_XdndProxy), 0, 1, False, XA_WINDOW, &type, &fmt, &n, &after, &data) == Success && data && n)
                    px = *(Window *)data;
                if (data) XFree(data);
                *proxy = px;
                return w;
            }
            if (data) XFree(data);
        }
        if (!child || child == out.icon) return None;
        w = child;
    }
    return None;
}

static void end_drag(void)
{
    if (!out.d) return;
    Display *dpy = paladin_display_get_xdisplay(out.d);
    XUngrabPointer(dpy, CurrentTime);
    if (out.icon) { XDestroyWindow(dpy, out.icon); out.icon = 0; }
    if (out.timeout) { g_source_remove(out.timeout); out.timeout = 0; }
    XFlush(dpy);
    out.d = NULL;
    out.from = NULL;
    /* the selection data stays until another drag replaces it (late requests still get the files) */
}

static gboolean drop_gave_up(gpointer data)
{
    (void)data;
    out.timeout = 0;
    end_drag();
    return G_SOURCE_REMOVE;
}

static void motion(int rx, int ry, Time t)
{
    PaladinDisplay *d = out.d;
    Display *dpy = paladin_display_get_xdisplay(d);
    if (out.icon) XMoveWindow(dpy, out.icon, rx - out.icon_w / 2, ry - out.icon_h / 2);
    int version; Window proxy;
    Window w = xdnd_window_at(d, rx, ry, &version, &proxy);
    Window self = paladin_toplevel_get_window(out.from);
    if (w == self) w = None;        /* dropping back on itself: nothing */
    if (w != out.over) {
        if (out.over) send_message(d, out.over_proxy ? out.over_proxy : out.over, A(d, PA_XdndLeave), self, 0, 0, 0, 0);
        out.over = w; out.over_proxy = proxy; out.over_version = MIN(version, XDND_VERSION); out.accepted = FALSE;
        if (w) send_message(d, proxy ? proxy : w, A(d, PA_XdndEnter), self, (long)out.over_version << 24, A(d, PA_TEXT_URI_LIST), 0, 0);
    }
    if (out.over)
        send_message(d, out.over_proxy ? out.over_proxy : out.over, A(d, PA_XdndPosition), self, 0, ((long)rx << 16) | (ry & 0xFFFF),
                     t, A(d, PA_XdndActionCopy));
    XFlush(dpy);
}

static Cursor drag_cursor(Display *dpy)
{
    static Cursor c;
    if (!c) c = XcursorLibraryLoadCursor(dpy, "dnd-copy");
    if (!c) c = XcursorLibraryLoadCursor(dpy, "copy");
    if (!c) c = XcursorLibraryLoadCursor(dpy, "left_ptr");
    return c;
}

void paladin_dnd_start(PaladinToplevel *from, const char *const *uris, int n, const guint8 *rgba, int iw, int ih)
{
    WPEDisplay *wd = wpe_toplevel_get_display(WPE_TOPLEVEL(from));
    PaladinDisplay *d = PALADIN_DISPLAY(wd);
    Display *dpy = paladin_display_get_xdisplay(d);
    end_drag();
    GString *s = g_string_new(NULL);
    for (int i = 0; i < n; i++) g_string_append_printf(s, "%s\r\n", uris[i]);
    g_free(out.data);
    out.data = g_string_free(s, FALSE);
    out.d = d; out.from = from; out.over = None; out.accepted = out.dropped = FALSE;
    Window self = paladin_toplevel_get_window(from);
    XSetSelectionOwner(dpy, A(d, PA_XdndSelection), self, paladin_display_last_time(d));
    /* the picture that follows the pointer */
    Colormap cmap; Visual *argb = paladin_display_argb_visual(d, &cmap);
    if (rgba && iw > 0 && ih > 0 && iw <= 512 && ih <= 512 && argb) {
        XSetWindowAttributes sa = { .override_redirect = True, .colormap = cmap, .border_pixel = 0, .background_pixel = 0 };
        Window root = DefaultRootWindow(dpy), rr, cw; int rx, ry, wx, wy; unsigned int m;
        XQueryPointer(dpy, root, &rr, &cw, &rx, &ry, &wx, &wy, &m);
        out.icon = XCreateWindow(dpy, root, rx - iw / 2, ry - ih / 2, iw, ih, 0, 32, InputOutput, argb,
                                 CWOverrideRedirect | CWColormap | CWBorderPixel | CWBackPixel, &sa);
        out.icon_w = iw; out.icon_h = ih;
        XImage *img = XCreateImage(dpy, argb, 32, ZPixmap, 0, g_malloc((size_t)iw * ih * 4), iw, ih, 32, iw * 4);
        for (int i = 0; i < iw * ih; i++) {
            guint8 r = rgba[4 * i], g = rgba[4 * i + 1], b = rgba[4 * i + 2], a = rgba[4 * i + 3];
            /* premultiplied ARGB, a little see-through */
            a = a * 3 / 4;
            ((guint32 *)img->data)[i] = ((guint32)a << 24) | ((guint32)(r * a / 255) << 16) | ((guint32)(g * a / 255) << 8) | (b * a / 255);
        }
        Pixmap pm = XCreatePixmap(dpy, out.icon, iw, ih, 32);
        GC gc = XCreateGC(dpy, pm, 0, NULL);
        XPutImage(dpy, pm, gc, img, 0, 0, 0, 0, iw, ih);
        XSetWindowBackgroundPixmap(dpy, out.icon, pm);
        XFreeGC(dpy, gc); XFreePixmap(dpy, pm);
        XDestroyImage(img);
        XMapRaised(dpy, out.icon);
    }
    if (XGrabPointer(dpy, self, False, ButtonReleaseMask | PointerMotionMask, GrabModeAsync, GrabModeAsync, None,
                     drag_cursor(dpy), CurrentTime) != GrabSuccess) {
        fprintf(stderr, "kibble-host: dragging out isn't available (the pointer is held elsewhere)\n");
        end_drag();
        return;
    }
    XFlush(dpy);
}

/* ---------------------------------------------------------------- events */
gboolean paladin_dnd_handle_event(PaladinDisplay *d, XEvent *ev)
{
    Display *dpy = paladin_display_get_xdisplay(d);
    /* outgoing drag: the pointer and the target's answers */
    if (out.d == d && out.from) {
        Window self = paladin_toplevel_get_window(out.from);
        if (ev->type == MotionNotify && ev->xmotion.window == self && !out.dropped) {
            XEvent last = *ev;
            while (XCheckTypedWindowEvent(dpy, self, MotionNotify, &last)) ;
            motion(last.xmotion.x_root, last.xmotion.y_root, last.xmotion.time);
            return TRUE;
        }
        if (ev->type == ButtonRelease && ev->xbutton.window == self && !out.dropped) {
            out.dropped = TRUE;
            if (out.over && out.accepted) {
                send_message(d, out.over_proxy ? out.over_proxy : out.over, A(d, PA_XdndDrop), self, 0, ev->xbutton.time, 0, 0);
                XUngrabPointer(dpy, CurrentTime);
                if (out.icon) { XDestroyWindow(dpy, out.icon); out.icon = 0; }
                out.timeout = g_timeout_add_seconds(10, drop_gave_up, NULL);
            } else {
                if (out.over) send_message(d, out.over_proxy ? out.over_proxy : out.over, A(d, PA_XdndLeave), self, 0, 0, 0, 0);
                end_drag();
            }
            XFlush(dpy);
            return TRUE;
        }
        if (ev->type == ClientMessage && ev->xclient.window == self) {
            if (ev->xclient.message_type == A(d, PA_XdndStatus)) { out.accepted = ev->xclient.data.l[1] & 1; return TRUE; }
            if (ev->xclient.message_type == A(d, PA_XdndFinished)) { end_drag(); return TRUE; }
        }
    }
    /* someone wants the files of the drag */
    if (ev->type == SelectionRequest && ev->xselectionrequest.selection == A(d, PA_XdndSelection)) {
        XSelectionRequestEvent *rq = &ev->xselectionrequest;
        XSelectionEvent se = { .type = SelectionNotify, .display = dpy, .requestor = rq->requestor, .selection = rq->selection,
                               .target = rq->target, .property = None, .time = rq->time };
        Atom prop = rq->property ? rq->property : rq->target;
        if (out.data && (rq->target == A(d, PA_TEXT_URI_LIST) || rq->target == A(d, PA_UTF8_STRING) || rq->target == XA_STRING)) {
            XChangeProperty(dpy, rq->requestor, prop, rq->target, 8, PropModeReplace, (unsigned char *)out.data, strlen(out.data));
            se.property = prop;
        } else if (rq->target == A(d, PA_TARGETS)) {
            Atom t[] = { A(d, PA_TARGETS), A(d, PA_TEXT_URI_LIST), A(d, PA_UTF8_STRING) };
            XChangeProperty(dpy, rq->requestor, prop, XA_ATOM, 32, PropModeReplace, (unsigned char *)t, 3);
            se.property = prop;
        }
        XSendEvent(dpy, rq->requestor, False, NoEventMask, (XEvent *)&se);
        XFlush(dpy);
        return TRUE;
    }

    /* incoming drag */
    if (ev->type == ClientMessage) {
        XClientMessageEvent *e = &ev->xclient;
        Atom t = e->message_type;
        if (!paladin_display_toplevel_for(d, e->window)) return FALSE;
        if (t == A(d, PA_XdndEnter)) {
            in.target = e->window; in.source = (Window)e->data.l[0]; in.has_uris = offers_uris(d, e);
            return TRUE;
        }
        if (t == A(d, PA_XdndPosition)) {
            if (in.target != e->window) return TRUE;
            int rx = (int)(e->data.l[2] >> 16), ry = (int)(e->data.l[2] & 0xFFFF);
            Window child;
            XTranslateCoordinates(dpy, DefaultRootWindow(dpy), e->window, rx, ry, &in.x, &in.y, &child);
            send_message(d, in.source, A(d, PA_XdndStatus), e->window, in.has_uris ? 1 : 0, 0, 0, in.has_uris ? (long)A(d, PA_XdndActionCopy) : 0);
            XFlush(dpy);
            if (in.has_uris) hook_drop(d, e->window, 0, NULL);
            return TRUE;
        }
        if (t == A(d, PA_XdndLeave)) {
            if (in.target == e->window && in.has_uris) hook_drop(d, e->window, 2, NULL);
            in.target = None;
            return TRUE;
        }
        if (t == A(d, PA_XdndDrop)) {
            if (in.target != e->window || !in.has_uris) {
                send_message(d, (Window)e->data.l[0], A(d, PA_XdndFinished), e->window, 0, 0, 0, 0);
                in.target = None;
                return TRUE;
            }
            in.drop_time = (Time)e->data.l[2];
            XConvertSelection(dpy, A(d, PA_XdndSelection), A(d, PA_TEXT_URI_LIST), A(d, PA_XdndSelection), e->window, in.drop_time);
            XFlush(dpy);
            return TRUE;
        }
        return FALSE;
    }
    if (ev->type == SelectionNotify && ev->xselection.selection == A(d, PA_XdndSelection) && in.target == ev->xselection.requestor) {
        char *uris = NULL;
        if (ev->xselection.property != None) {
            Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
            if (XGetWindowProperty(dpy, in.target, ev->xselection.property, 0, 1 << 20, True, AnyPropertyType, &type, &fmt, &n, &after, &data) == Success && data) {
                uris = g_strndup((char *)data, n);
                XFree(data);
            }
        }
        hook_drop(d, in.target, uris ? 1 : 2, uris);
        send_message(d, in.source, A(d, PA_XdndFinished), in.target, uris ? 1 : 0, uris ? (long)A(d, PA_XdndActionCopy) : 0, 0, 0);
        XFlush(dpy);
        g_free(uris);
        in.target = None;
        return TRUE;
    }
    return FALSE;
}

/* Kibble's window layer: the clipboard, shared with every other app through the X CLIPBOARD selection. */
#define _GNU_SOURCE
#include "paladin.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <poll.h>
#include <X11/extensions/Xfixes.h>

struct _PaladinClipboard {
    WPEClipboard parent;
    PaladinDisplay *display;
    Window win;                 /* ours, holds the selection */
    gboolean owner;
    char **formats;             /* what we offer (MIME types) */
    int xfixes_event;
    gboolean asked_targets;
};

G_DEFINE_FINAL_TYPE(PaladinClipboard, paladin_clipboard, WPE_TYPE_CLIPBOARD)

#define TEXT_MIME "text/plain;charset=utf-8"

static Display *xd(PaladinClipboard *c) { return paladin_display_get_xdisplay(c->display); }
static Atom A(PaladinClipboard *c, int w) { return paladin_display_atom(c->display, w); }

static gboolean is_text_target(PaladinClipboard *c, Atom t)
{
    return t == A(c, PA_UTF8_STRING) || t == XA_STRING || t == A(c, PA_TEXT) || t == A(c, PA_TEXT_PLAIN_UTF8)
        || t == XInternAtom(xd(c), "text/plain", False);
}

/* ---------------------------------------------------------------- giving our content to others */
static void answer_request(PaladinClipboard *c, XSelectionRequestEvent *rq)
{
    XSelectionEvent ev = { .type = SelectionNotify, .display = rq->display, .requestor = rq->requestor,
                           .selection = rq->selection, .target = rq->target, .property = None, .time = rq->time };
    Atom prop = rq->property ? rq->property : rq->target;
    WPEClipboardContent *content = wpe_clipboard_get_content(WPE_CLIPBOARD(c));
    if (rq->target == A(c, PA_TARGETS)) {
        GArray *t = g_array_new(FALSE, FALSE, sizeof(Atom));
        Atom a = A(c, PA_TARGETS); g_array_append_val(t, a);
        for (char **f = c->formats; f && *f; f++) {
            a = XInternAtom(xd(c), *f, False); g_array_append_val(t, a);
            if (!strncmp(*f, "text/plain", 10)) {
                Atom tx[] = { A(c, PA_UTF8_STRING), XA_STRING, A(c, PA_TEXT) };
                g_array_append_vals(t, tx, 3);
            }
        }
        XChangeProperty(xd(c), rq->requestor, prop, XA_ATOM, 32, PropModeReplace, (unsigned char *)t->data, t->len);
        g_array_free(t, TRUE);
        ev.property = prop;
    } else if (content) {
        const char *format = NULL;
        if (is_text_target(c, rq->target)) format = TEXT_MIME;
        else {
            char *name = XGetAtomName(xd(c), rq->target);
            for (char **f = c->formats; name && f && *f; f++) if (!strcmp(*f, name)) format = *f;
            if (name) XFree(name);
        }
        if (format) {
            GOutputStream *out = g_memory_output_stream_new_resizable();
            if (wpe_clipboard_content_serialize(content, format, out)) {
                g_output_stream_close(out, NULL, NULL);
                GBytes *b = g_memory_output_stream_steal_as_bytes(G_MEMORY_OUTPUT_STREAM(out));
                gsize n; const guint8 *data = g_bytes_get_data(b, &n);
                Atom type = is_text_target(c, rq->target) ? (rq->target == XA_STRING ? XA_STRING : A(c, PA_UTF8_STRING)) : rq->target;
                XChangeProperty(xd(c), rq->requestor, prop, type, 8, PropModeReplace, data, (int)n);
                g_bytes_unref(b);
                ev.property = prop;
            }
            g_object_unref(out);
        }
    }
    XSendEvent(xd(c), rq->requestor, False, NoEventMask, (XEvent *)&ev);
    XFlush(xd(c));
}

/* ---------------------------------------------------------------- what others offer */
static void got_targets(PaladinClipboard *c)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    GPtrArray *formats = g_ptr_array_new_null_terminated(4, NULL, TRUE);
    if (XGetWindowProperty(xd(c), c->win, A(c, PA_KIBBLE_SELECTION), 0, 4096, True, XA_ATOM, &type, &fmt, &n, &after, &data) == Success && data) {
        gboolean text = FALSE;
        for (unsigned long i = 0; i < n; i++) {
            Atom a = ((Atom *)data)[i];
            if (is_text_target(c, a)) { text = TRUE; continue; }
            char *name = XGetAtomName(xd(c), a);
            if (name && strchr(name, '/')) g_ptr_array_add(formats, (gpointer)g_intern_string(name));
            if (name) XFree(name);
        }
        if (text) g_ptr_array_insert(formats, 0, (gpointer)g_intern_static_string(TEXT_MIME));
        XFree(data);
    }
    WPE_CLIPBOARD_GET_CLASS(c)->changed(WPE_CLIPBOARD(c), formats, FALSE, NULL);
    g_ptr_array_unref(formats);
}

static void ask_targets(PaladinClipboard *c, Time t)
{
    c->asked_targets = TRUE;
    XConvertSelection(xd(c), A(c, PA_CLIPBOARD), A(c, PA_TARGETS), A(c, PA_KIBBLE_SELECTION), c->win, t);
    XFlush(xd(c));
}

gboolean paladin_clipboard_handle_event(PaladinClipboard *c, XEvent *ev)
{
    if (ev->xany.window != c->win) return FALSE;
    if (ev->type == SelectionRequest) { answer_request(c, &ev->xselectionrequest); return TRUE; }
    if (ev->type == SelectionClear) { c->owner = FALSE; return TRUE; }
    if (ev->type == SelectionNotify) {
        if (c->asked_targets && ev->xselection.target == A(c, PA_TARGETS)) {
            c->asked_targets = FALSE;
            if (ev->xselection.property != None) got_targets(c);
            else WPE_CLIPBOARD_GET_CLASS(c)->changed(WPE_CLIPBOARD(c), NULL, FALSE, NULL);
        }
        return TRUE;
    }
    if (c->xfixes_event >= 0 && ev->type == c->xfixes_event + XFixesSelectionNotify) {
        XFixesSelectionNotifyEvent *se = (XFixesSelectionNotifyEvent *)ev;
        if (se->owner != c->win) { c->owner = FALSE; ask_targets(c, se->timestamp); }
        return TRUE;
    }
    return FALSE;
}

/* reading another app's clipboard waits (a little) for it to answer */
static gboolean wait_for(PaladinClipboard *c, int type, XEvent *out, int ms)
{
    Display *dpy = xd(c);
    gint64 end = g_get_monotonic_time() + (gint64)ms * 1000;
    for (;;) {
        if (XCheckTypedWindowEvent(dpy, c->win, type, out)) return TRUE;
        gint64 left = (end - g_get_monotonic_time()) / 1000;
        if (left <= 0) return FALSE;
        struct pollfd p = { ConnectionNumber(dpy), POLLIN, 0 };
        poll(&p, 1, (int)left);
        XEventsQueued(dpy, QueuedAfterReading);
    }
}

static GBytes *pc_read(WPEClipboard *clipboard, const char *format)
{
    PaladinClipboard *c = PALADIN_CLIPBOARD(clipboard);
    Display *dpy = xd(c);
    Atom target = !strncmp(format, "text/plain", 10) ? A(c, PA_UTF8_STRING) : XInternAtom(dpy, format, False);
    XDeleteProperty(dpy, c->win, A(c, PA_KIBBLE_SELECTION));
    XConvertSelection(dpy, A(c, PA_CLIPBOARD), target, A(c, PA_KIBBLE_SELECTION), c->win, paladin_display_last_time(c->display));
    XFlush(dpy);
    XEvent ev;
    if (!wait_for(c, SelectionNotify, &ev, 2000) || ev.xselection.property == None) return NULL;
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    if (XGetWindowProperty(dpy, c->win, A(c, PA_KIBBLE_SELECTION), 0, 0x1FFFFFFF, False, AnyPropertyType, &type, &fmt, &n, &after, &data) != Success)
        return NULL;
    if (type == A(c, PA_INCR)) {
        /* big content comes in pieces */
        if (data) XFree(data);
        XSelectInput(dpy, c->win, PropertyChangeMask);
        XDeleteProperty(dpy, c->win, A(c, PA_KIBBLE_SELECTION));
        XFlush(dpy);
        GByteArray *all = g_byte_array_new();
        for (;;) {
            if (!wait_for(c, PropertyNotify, &ev, 2000)) break;
            if (ev.xproperty.atom != A(c, PA_KIBBLE_SELECTION) || ev.xproperty.state != PropertyNewValue) continue;
            data = NULL;
            if (XGetWindowProperty(dpy, c->win, A(c, PA_KIBBLE_SELECTION), 0, 0x1FFFFFFF, True, AnyPropertyType, &type, &fmt, &n, &after, &data) != Success) break;
            if (!n) { if (data) XFree(data); XSelectInput(dpy, c->win, NoEventMask); XFlush(dpy); return g_byte_array_free_to_bytes(all); }
            g_byte_array_append(all, data, n * (fmt / 8));
            XFree(data);
        }
        XSelectInput(dpy, c->win, NoEventMask);
        g_byte_array_free(all, TRUE);
        return NULL;
    }
    GBytes *b = g_bytes_new(data, n * (fmt / 8));
    if (data) XFree(data);
    XDeleteProperty(dpy, c->win, A(c, PA_KIBBLE_SELECTION));
    return b;
}

/* a page copied something: it's ours to hand out */
static void pc_changed(WPEClipboard *clipboard, GPtrArray *formats, gboolean is_local, WPEClipboardContent *content)
{
    PaladinClipboard *c = PALADIN_CLIPBOARD(clipboard);
    if (is_local) {
        g_strfreev(c->formats);
        c->formats = g_new0(char *, (formats ? formats->len : 0) + 1);
        for (guint i = 0; formats && i < formats->len && formats->pdata[i]; i++) c->formats[i] = g_strdup(formats->pdata[i]);
        XSetSelectionOwner(xd(c), A(c, PA_CLIPBOARD), c->win, paladin_display_last_time(c->display));
        c->owner = XGetSelectionOwner(xd(c), A(c, PA_CLIPBOARD)) == c->win;
        XFlush(xd(c));
    }
    WPE_CLIPBOARD_CLASS(paladin_clipboard_parent_class)->changed(clipboard, formats, is_local, content);
}

void paladin_clipboard_set_text(PaladinClipboard *c, const char *text)
{
    WPEClipboardContent *content = wpe_clipboard_content_new();
    wpe_clipboard_content_set_text(content, text ? text : "");
    wpe_clipboard_set_content(WPE_CLIPBOARD(c), content);
    wpe_clipboard_content_unref(content);
}

static void pc_finalize(GObject *o)
{
    PaladinClipboard *c = PALADIN_CLIPBOARD(o);
    g_strfreev(c->formats);
    G_OBJECT_CLASS(paladin_clipboard_parent_class)->finalize(o);
}

static void paladin_clipboard_class_init(PaladinClipboardClass *klass)
{
    G_OBJECT_CLASS(klass)->finalize = pc_finalize;
    WPEClipboardClass *cc = WPE_CLIPBOARD_CLASS(klass);
    cc->read = pc_read;
    cc->changed = pc_changed;
}

static void paladin_clipboard_init(PaladinClipboard *c) { c->xfixes_event = -1; }

WPEClipboard *paladin_clipboard_new(PaladinDisplay *display)
{
    PaladinClipboard *c = g_object_new(PALADIN_TYPE_CLIPBOARD, "display", display, NULL);
    c->display = display;
    Display *dpy = xd(c);
    c->win = XCreateSimpleWindow(dpy, DefaultRootWindow(dpy), -10, -10, 1, 1, 0, 0, 0);
    int ev, err;
    if (XFixesQueryExtension(dpy, &ev, &err)) {
        c->xfixes_event = ev;
        XFixesSelectSelectionInput(dpy, c->win, A(c, PA_CLIPBOARD), XFixesSetSelectionOwnerNotifyMask);
    }
    if (XGetSelectionOwner(dpy, A(c, PA_CLIPBOARD)) != None) ask_targets(c, CurrentTime);
    return WPE_CLIPBOARD(c);
}

/* paladin-authenticate: the password sheet. Its own small window: a shield, what's being asked, who answers,
   a password field, Cancel and OK. Holds the keyboard while it's up so nothing else can read the password. */
#define _GNU_SOURCE
#include "dialog.h"
#include "../libpalos/l10n.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/keysym.h>
#include <X11/Xcursor/Xcursor.h>
#include <cairo/cairo.h>
#include <cairo/cairo-xlib.h>
#include <pango/pangocairo.h>

#define SHIELD "/usr/share/palos/authenticate/shield.png"
#define W 460

struct Dialog {
    Window win;
    int h;
    char *message, *detail, *error;
    char **users; guint n_users, user;
    GString *pw;
    gboolean busy, ready, focus_ok;
    int hover;                  /* 0 none, 1 cancel, 2 ok, 3 previous user, 4 next user */
    int pressed;
    double shake_t0;
    guint shake_timer;
    DialogCallbacks cb;
    XIC xic;
    /* layout (computed when drawn) */
    int fx, fy, fw, fh, bc_x, bo_x, by, bw, bh, ux, uy, uw;
};

static Display *dpy;
static int scr;
static XIM xim;
static GSource *xsrc;
static Dialog *open_dialog;
static Atom a_wm_protocols, a_delete, a_type, a_type_dialog, a_state, a_above, a_name, a_utf8, a_dark, a_active;
static cairo_surface_t *shield;

static gboolean dark(void)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    gboolean d = FALSE;
    if (XGetWindowProperty(dpy, RootWindow(dpy, scr), a_dark, 0, 1, False, XA_CARDINAL, &type, &fmt, &n, &after, &data) == Success && data && n)
        d = *(long *)data != 0;
    if (data) XFree(data);
    return d;
}

/* ---------------------------------------------------------------- drawing */
static PangoLayout *text(cairo_t *cr, const char *s, const char *font, int width)
{
    PangoLayout *l = pango_cairo_create_layout(cr);
    PangoFontDescription *f = pango_font_description_from_string(font);
    pango_layout_set_font_description(l, f);
    pango_font_description_free(f);
    pango_layout_set_text(l, s ? s : "", -1);
    if (width > 0) { pango_layout_set_width(l, width * PANGO_SCALE); pango_layout_set_wrap(l, PANGO_WRAP_WORD_CHAR); }
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

static int layout_height(Dialog *d)
{
    cairo_surface_t *s = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, 1, 1);
    cairo_t *cr = cairo_create(s);
    int tw = W - 112 - 24;
    PangoLayout *m = text(cr, d->message, "Noto Sans Bold 10.5", tw);
    PangoLayout *de = text(cr, d->detail, "Noto Sans 9.5", tw);
    int mh, dh, x;
    pango_layout_get_pixel_size(m, &x, &mh);
    pango_layout_get_pixel_size(de, &x, &dh);
    g_object_unref(m); g_object_unref(de);
    cairo_destroy(cr); cairo_surface_destroy(s);
    int h = 22 + mh + 8 + dh + 18;
    if (d->n_users > 1) h += 30;
    h += 30 + 22 + 8 + 24 + 28 + 18;      /* label, field, error line, buttons */
    return MAX(h, 190);
}

static void draw(Dialog *d)
{
    XWindowAttributes wa;
    if (!XGetWindowAttributes(dpy, d->win, &wa)) return;
    cairo_surface_t *ws = cairo_xlib_surface_create(dpy, d->win, wa.visual, wa.width, wa.height);
    cairo_surface_t *s = cairo_surface_create_similar(ws, CAIRO_CONTENT_COLOR, wa.width, wa.height);
    cairo_t *cr = cairo_create(s);
    gboolean dk = dark();
    double fg = dk ? 0.92 : 0.12, sub = dk ? 0.70 : 0.35;

    /* the sheet: a soft steel gradient */
    cairo_pattern_t *g = cairo_pattern_create_linear(0, 0, 0, wa.height);
    if (dk) { cairo_pattern_add_color_stop_rgb(g, 0, .20, .22, .25); cairo_pattern_add_color_stop_rgb(g, 1, .16, .17, .20); }
    else { cairo_pattern_add_color_stop_rgb(g, 0, .96, .96, .97); cairo_pattern_add_color_stop_rgb(g, 1, .90, .91, .93); }
    cairo_set_source(cr, g); cairo_paint(cr); cairo_pattern_destroy(g);

    /* the shield */
    int shake = 0;
    if (d->shake_t0 > 0) {
        double t = (g_get_monotonic_time() / 1e6) - d->shake_t0;
        if (t < 0.45) shake = (int)(sin(t * 50) * 10 * (1 - t / 0.45));
    }
    if (shield) {
        double k = 64.0 / cairo_image_surface_get_width(shield);
        cairo_save(cr);
        cairo_translate(cr, 26, 22);
        cairo_scale(cr, k, k);
        cairo_set_source_surface(cr, shield, 0, 0);
        cairo_paint(cr);
        cairo_restore(cr);
    } else {
        cairo_set_source_rgb(cr, .25, .45, .75);
        cairo_move_to(cr, 58, 24); cairo_line_to(cr, 86, 34); cairo_curve_to(cr, 86, 64, 74, 80, 58, 88);
        cairo_curve_to(cr, 42, 80, 30, 64, 30, 34); cairo_close_path(cr); cairo_fill(cr);
    }

    int x = 112, y = 22, tw = W - x - 24;
    PangoLayout *m = text(cr, d->message, "Noto Sans Bold 10.5", tw);
    cairo_set_source_rgb(cr, fg, fg, fg);
    cairo_move_to(cr, x, y); pango_cairo_show_layout(cr, m);
    int lw, lh; pango_layout_get_pixel_size(m, &lw, &lh); y += lh + 8;
    g_object_unref(m);
    PangoLayout *de = text(cr, d->detail, "Noto Sans 9.5", tw);
    cairo_set_source_rgb(cr, sub, sub, sub);
    cairo_move_to(cr, x, y); pango_cairo_show_layout(cr, de);
    pango_layout_get_pixel_size(de, &lw, &lh); y += lh + 18;
    g_object_unref(de);

    /* who answers (when more than one person can) */
    if (d->n_users > 1) {
        PangoLayout *ul = text(cr, d->users[d->user], "Noto Sans Bold 9.5", 0);
        pango_layout_get_pixel_size(ul, &lw, &lh);
        d->ux = x; d->uy = y; d->uw = lw + 60;
        cairo_set_source_rgba(cr, fg, fg, fg, d->hover == 3 ? 0.9 : 0.5);
        cairo_move_to(cr, x + 6, y + 4); cairo_line_to(cr, x, y + 10); cairo_line_to(cr, x + 6, y + 16); cairo_stroke(cr);
        cairo_set_source_rgb(cr, fg, fg, fg);
        cairo_move_to(cr, x + 22, y + 10 - lh / 2); pango_cairo_show_layout(cr, ul);
        cairo_set_source_rgba(cr, fg, fg, fg, d->hover == 4 ? 0.9 : 0.5);
        double ax = x + 22 + lw + 16;
        cairo_move_to(cr, ax, y + 4); cairo_line_to(cr, ax + 6, y + 10); cairo_line_to(cr, ax, y + 16); cairo_stroke(cr);
        g_object_unref(ul);
        y += 30;
    }

    /* the password field */
    PangoLayout *pl = text(cr, T("Password"), "Noto Sans 9.5", 0);
    cairo_set_source_rgb(cr, sub, sub, sub);
    cairo_move_to(cr, x, y); pango_cairo_show_layout(cr, pl);
    pango_layout_get_pixel_size(pl, &lw, &lh); y += lh + 6;
    g_object_unref(pl);
    d->fx = x + shake; d->fy = y; d->fw = tw; d->fh = 26;
    rrect(cr, d->fx + .5, d->fy + .5, d->fw - 1, d->fh - 1, 5);
    if (dk) cairo_set_source_rgb(cr, .11, .12, .13); else cairo_set_source_rgb(cr, 1, 1, 1);
    cairo_fill_preserve(cr);
    if (d->ready && !d->busy) cairo_set_source_rgba(cr, .33, .55, .92, .9); else cairo_set_source_rgba(cr, 0, 0, 0, dk ? .6 : .25);
    cairo_set_line_width(cr, d->ready && !d->busy ? 2 : 1);
    cairo_stroke(cr);
    /* dots for the letters, and the caret */
    glong n = g_utf8_strlen(d->pw->str, -1);
    double cx = d->fx + 10;
    cairo_set_source_rgb(cr, fg, fg, fg);
    for (glong i = 0; i < n && cx < d->fx + d->fw - 14; i++, cx += 11) { cairo_arc(cr, cx + 3.5, d->fy + 13, 3.5, 0, 2 * M_PI); cairo_fill(cr); }
    if (d->ready && !d->busy) { cairo_rectangle(cr, cx, d->fy + 6, 1.5, 14); cairo_fill(cr); }
    y += d->fh + 8;

    /* the error, if the last try didn't work */
    if (d->error) {
        PangoLayout *el = text(cr, d->error, "Noto Sans 9", tw);
        cairo_set_source_rgb(cr, .82, .18, .18);
        cairo_move_to(cr, x, y); pango_cairo_show_layout(cr, el);
        g_object_unref(el);
    }

    /* Cancel and OK */
    d->bh = 28; d->bw = 96; d->by = wa.height - 18 - d->bh;
    d->bo_x = W - 24 - d->bw; d->bc_x = d->bo_x - 12 - d->bw;
    const char *labels[2] = { T("Cancel"), d->busy ? T("Checking…") : T("OK") };
    for (int i = 0; i < 2; i++) {
        int bx = i == 0 ? d->bc_x : d->bo_x;
        gboolean primary = i == 1, hov = d->hover == i + 1, pr = d->pressed == i + 1 && hov;
        rrect(cr, bx + .5, d->by + .5, d->bw - 1, d->bh - 1, 6);
        cairo_pattern_t *bg = cairo_pattern_create_linear(0, d->by, 0, d->by + d->bh);
        if (primary) {
            double k = pr ? .85 : hov ? 1.05 : 1;
            cairo_pattern_add_color_stop_rgb(bg, 0, .40 * k, .62 * k, .98 * k);
            cairo_pattern_add_color_stop_rgb(bg, 1, .20 * k, .44 * k, .88 * k);
        } else {
            double b = dk ? (pr ? .22 : hov ? .34 : .30) : (pr ? .80 : hov ? 1 : .98), e = dk ? b - .06 : b - .08;
            cairo_pattern_add_color_stop_rgb(bg, 0, b, b, b);
            cairo_pattern_add_color_stop_rgb(bg, 1, e, e, e);
        }
        cairo_set_source(cr, bg); cairo_fill_preserve(cr); cairo_pattern_destroy(bg);
        cairo_set_source_rgba(cr, 0, 0, 0, primary ? .35 : dk ? .6 : .28);
        cairo_set_line_width(cr, 1); cairo_stroke(cr);
        PangoLayout *bl = text(cr, labels[i], "Noto Sans 9.5", 0);
        pango_layout_get_pixel_size(bl, &lw, &lh);
        if (primary) cairo_set_source_rgb(cr, 1, 1, 1); else cairo_set_source_rgb(cr, fg, fg, fg);
        cairo_move_to(cr, bx + (d->bw - lw) / 2.0, d->by + (d->bh - lh) / 2.0);
        pango_cairo_show_layout(cr, bl);
        g_object_unref(bl);
    }

    cairo_destroy(cr);
    cairo_t *wc = cairo_create(ws);
    cairo_set_source_surface(wc, s, 0, 0);
    cairo_paint(wc);
    cairo_destroy(wc);
    cairo_surface_destroy(s);
    cairo_surface_destroy(ws);
    XFlush(dpy);
}

/* ---------------------------------------------------------------- input */
static int hit(Dialog *d, int x, int y)
{
    if (y >= d->by && y < d->by + d->bh) {
        if (x >= d->bc_x && x < d->bc_x + d->bw) return 1;
        if (x >= d->bo_x && x < d->bo_x + d->bw) return 2;
    }
    if (d->n_users > 1 && y >= d->uy && y < d->uy + 20) {
        if (x >= d->ux - 4 && x < d->ux + 14) return 3;
        if (x >= d->ux + 14 && x < d->ux + d->uw + 10) return 4;
    }
    return 0;
}

static void submit(Dialog *d)
{
    if (d->busy || !d->ready) return;
    d->ready = FALSE;
    g_free(d->error); d->error = NULL;
    char *pw = g_strdup(d->pw->str);
    memset(d->pw->str, 0, d->pw->len);
    g_string_truncate(d->pw, 0);
    draw(d);
    d->cb.answer(pw, d->cb.data);
    memset(pw, 0, strlen(pw));
    g_free(pw);
}

static void key(Dialog *d, XKeyEvent *e)
{
    char buf[64] = ""; KeySym sym = NoSymbol; Status st;
    int n = d->xic ? Xutf8LookupString(d->xic, e, buf, sizeof buf - 1, &sym, &st) : XLookupString(e, buf, sizeof buf - 1, &sym, NULL);
    if (n < 0) n = 0;
    buf[n] = 0;
    if (sym == XK_Escape) { d->cb.cancel(d->cb.data); return; }
    if (sym == XK_Return || sym == XK_KP_Enter) { submit(d); return; }
    if (d->busy) return;
    if (sym == XK_BackSpace) {
        if (d->pw->len) {
            const char *end = d->pw->str + d->pw->len, *prev = g_utf8_find_prev_char(d->pw->str, end);
            g_string_truncate(d->pw, prev ? (gsize)(prev - d->pw->str) : 0);
        }
    } else if ((e->state & ControlMask) && (sym == XK_u || sym == XK_U)) {
        g_string_truncate(d->pw, 0);
    } else if (n > 0 && !(e->state & ControlMask) && (unsigned char)buf[0] >= 0x20 && buf[0] != 0x7f) {
        g_string_append(d->pw, buf);
    } else return;
    if (d->error) { g_free(d->error); d->error = NULL; }
    draw(d);
}

static gboolean shake_tick(gpointer data)
{
    Dialog *d = data;
    draw(d);
    if (g_get_monotonic_time() / 1e6 - d->shake_t0 > 0.5) { d->shake_t0 = 0; d->shake_timer = 0; draw(d); return G_SOURCE_REMOVE; }
    return G_SOURCE_CONTINUE;
}

static void event(XEvent *ev)
{
    Dialog *d = open_dialog;
    if (!d) return;
    if (XFilterEvent(ev, None)) return;
    switch (ev->type) {
    case Expose: if (ev->xexpose.count == 0) draw(d); break;
    case MapNotify:
        /* the keyboard is ours while the sheet is up */
        for (int i = 0; i < 20; i++) {
            if (XGrabKeyboard(dpy, d->win, True, GrabModeAsync, GrabModeAsync, CurrentTime) == GrabSuccess) break;
            g_usleep(25000);
        }
        XSetInputFocus(dpy, d->win, RevertToParent, CurrentTime);
        break;
    case KeyPress: key(d, &ev->xkey); break;
    case ButtonPress:
        if (ev->xbutton.button == 1) { d->pressed = hit(d, ev->xbutton.x, ev->xbutton.y); draw(d); }
        break;
    case ButtonRelease:
        if (ev->xbutton.button == 1) {
            int h = hit(d, ev->xbutton.x, ev->xbutton.y), p = d->pressed;
            d->pressed = 0;
            draw(d);
            if (h != p) break;
            if (h == 1) d->cb.cancel(d->cb.data);
            else if (h == 2) submit(d);
            else if (h == 3 || h == 4) {
                guint u = (d->user + (h == 4 ? 1 : d->n_users - 1)) % d->n_users;
                d->user = u; g_string_truncate(d->pw, 0);
                d->cb.switch_user(u, d->cb.data);
                draw(d);
            }
        }
        break;
    case MotionNotify: {
        int h = hit(d, ev->xmotion.x, ev->xmotion.y);
        if (h != d->hover) { d->hover = h; draw(d); }
        break;
    }
    case LeaveNotify: if (d->hover) { d->hover = 0; draw(d); } break;
    case ClientMessage:
        if ((Atom)ev->xclient.data.l[0] == a_delete) d->cb.cancel(d->cb.data);
        break;
    case PropertyNotify:
        if (ev->xproperty.atom == a_dark) draw(d);
        break;
    }
}

/* ---------------------------------------------------------------- X events in the GLib loop */
typedef struct { GSource base; gpointer tag; } XSrc;
static gboolean xs_prepare(GSource *s, gint *t) { (void)s; *t = -1; return XPending(dpy) > 0; }
static gboolean xs_check(GSource *s) { return (g_source_query_unix_fd(s, ((XSrc *)s)->tag) & G_IO_IN) || XPending(dpy) > 0; }
static gboolean xs_dispatch(GSource *s, GSourceFunc cb, gpointer data)
{
    (void)s; (void)cb; (void)data;
    while (XPending(dpy)) { XEvent ev; XNextEvent(dpy, &ev); event(&ev); }
    return G_SOURCE_CONTINUE;
}
static GSourceFuncs xs_funcs = { xs_prepare, xs_check, xs_dispatch, NULL, NULL, NULL };

gboolean dialog_init(void)
{
    if (!(dpy = XOpenDisplay(NULL))) return FALSE;
    scr = DefaultScreen(dpy);
    a_wm_protocols = XInternAtom(dpy, "WM_PROTOCOLS", False);
    a_delete = XInternAtom(dpy, "WM_DELETE_WINDOW", False);
    a_type = XInternAtom(dpy, "_NET_WM_WINDOW_TYPE", False);
    a_type_dialog = XInternAtom(dpy, "_NET_WM_WINDOW_TYPE_DIALOG", False);
    a_state = XInternAtom(dpy, "_NET_WM_STATE", False);
    a_above = XInternAtom(dpy, "_NET_WM_STATE_ABOVE", False);
    a_name = XInternAtom(dpy, "_NET_WM_NAME", False);
    a_utf8 = XInternAtom(dpy, "UTF8_STRING", False);
    a_dark = XInternAtom(dpy, "_PALADIN_DARK", False);
    a_active = XInternAtom(dpy, "_NET_ACTIVE_WINDOW", False);
    XSelectInput(dpy, RootWindow(dpy, scr), PropertyChangeMask);
    xim = XOpenIM(dpy, NULL, NULL, NULL);
    shield = cairo_image_surface_create_from_png(SHIELD);
    if (cairo_surface_status(shield) != CAIRO_STATUS_SUCCESS) { cairo_surface_destroy(shield); shield = NULL; }
    XSrc *x = (XSrc *)g_source_new(&xs_funcs, sizeof(XSrc));
    x->tag = g_source_add_unix_fd((GSource *)x, ConnectionNumber(dpy), G_IO_IN);
    g_source_attach((GSource *)x, NULL);
    xsrc = (GSource *)x;
    return TRUE;
}

Dialog *dialog_open(const char *message, const char *detail, const char *const *users, guint n_users, guint user,
                    const DialogCallbacks *cb)
{
    Dialog *d = g_new0(Dialog, 1);
    d->message = g_strdup(message); d->detail = g_strdup(detail);
    d->users = g_new0(char *, n_users + 1);
    for (guint i = 0; i < n_users; i++) d->users[i] = g_strdup(users[i]);
    d->n_users = n_users; d->user = user;
    d->pw = g_string_new(NULL);
    d->cb = *cb;
    d->h = layout_height(d);
    int sw = DisplayWidth(dpy, scr), sh = DisplayHeight(dpy, scr);
    int x = (sw - W) / 2, y = (sh - d->h) / 3;
    XSetWindowAttributes sa = { .event_mask = ExposureMask | KeyPressMask | ButtonPressMask | ButtonReleaseMask | PointerMotionMask
                                              | LeaveWindowMask | StructureNotifyMask, .background_pixmap = None };
    d->win = XCreateWindow(dpy, RootWindow(dpy, scr), x, y, W, d->h, 0, CopyFromParent, InputOutput, CopyFromParent,
                           CWEventMask | CWBackPixmap, &sa);
    const char *title = T("Authentication Required");
    XChangeProperty(dpy, d->win, a_name, a_utf8, 8, PropModeReplace, (const unsigned char *)title, strlen(title));
    XStoreName(dpy, d->win, title);
    XClassHint ch = { "paladin-authenticate", "Paladin-authenticate" };
    XSetClassHint(dpy, d->win, &ch);
    XSetWMProtocols(dpy, d->win, &a_delete, 1);
    XChangeProperty(dpy, d->win, a_type, XA_ATOM, 32, PropModeReplace, (unsigned char *)&a_type_dialog, 1);
    XChangeProperty(dpy, d->win, a_state, XA_ATOM, 32, PropModeReplace, (unsigned char *)&a_above, 1);
    XSizeHints hints = { .flags = PPosition | USPosition | PMinSize | PMaxSize, .x = x, .y = y,
                         .min_width = W, .max_width = W, .min_height = d->h, .max_height = d->h };
    XSetWMNormalHints(dpy, d->win, &hints);
    XWMHints wh = { .flags = InputHint, .input = True };
    XSetWMHints(dpy, d->win, &wh);
    Cursor c = XcursorLibraryLoadCursor(dpy, "left_ptr");
    if (c) XDefineCursor(dpy, d->win, c);
    if (xim) d->xic = XCreateIC(xim, XNInputStyle, XIMPreeditNothing | XIMStatusNothing, XNClientWindow, d->win, XNFocusWindow, d->win, NULL);
    if (d->xic) XSetICFocus(d->xic);
    open_dialog = d;
    XMapRaised(dpy, d->win);
    XFlush(dpy);
    return d;
}

void dialog_ask(Dialog *d) { d->ready = TRUE; draw(d); }
void dialog_set_busy(Dialog *d, gboolean busy) { d->busy = busy; draw(d); }
void dialog_set_detail(Dialog *d, const char *t) { g_free(d->detail); d->detail = g_strdup(t); draw(d); }

void dialog_show_error(Dialog *d, const char *t)
{
    g_free(d->error); d->error = g_strdup(t);
    d->shake_t0 = g_get_monotonic_time() / 1e6;
    if (!d->shake_timer) d->shake_timer = g_timeout_add(16, shake_tick, d);
    draw(d);
}

void dialog_close(Dialog *d)
{
    if (d->shake_timer) g_source_remove(d->shake_timer);
    XUngrabKeyboard(dpy, CurrentTime);
    if (d->xic) XDestroyIC(d->xic);
    XDestroyWindow(dpy, d->win);
    XFlush(dpy);
    if (open_dialog == d) open_dialog = NULL;
    memset(d->pw->str, 0, d->pw->len);
    g_string_free(d->pw, TRUE);
    g_strfreev(d->users);
    g_free(d->message); g_free(d->detail); g_free(d->error);
    g_free(d);
}

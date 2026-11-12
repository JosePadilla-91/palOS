/* paladin-locker: palOS's lock screen when the login screen can't do the locking (no LightDM seat, a remote
   session). Covers the screen, holds the keyboard and pointer, and lets you back in with your password (PAM).
   Exits 0 once unlocked, 1 if it couldn't lock. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <locale.h>
#include <langinfo.h>
#include <unistd.h>
#include <pwd.h>
#include <security/pam_appl.h>
#include <gio/gio.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/keysym.h>
#include <cairo/cairo.h>
#include <cairo/cairo-xlib.h>
#include <pango/pangocairo.h>
#include "../libpalos/l10n.h"

static Display *dpy;
static int scr, sw, sh;
static Window win;
static GString *pw;
static char *user, *full_name;
static cairo_surface_t *face;
static gboolean checking, unlocked;
static char *message;
static double shake_t0;
static XIC xic;
static GMainLoop *loop;

/* ---------------------------------------------------------------- the password */
static const char *pam_pw;
static int conv(int n, const struct pam_message **msg, struct pam_response **resp, void *data)
{
    (void)data;
    struct pam_response *r = calloc(n, sizeof *r);
    for (int i = 0; i < n; i++)
        if (msg[i]->msg_style == PAM_PROMPT_ECHO_OFF || msg[i]->msg_style == PAM_PROMPT_ECHO_ON) r[i].resp = strdup(pam_pw ? pam_pw : "");
    *resp = r;
    return PAM_SUCCESS;
}

static void check_thread(GTask *task, gpointer src, gpointer data, GCancellable *c)
{
    (void)src; (void)c;
    char *password = data;
    struct pam_conv pc = { conv, NULL };
    pam_handle_t *h = NULL;
    pam_pw = password;
    int r = pam_start("paladin-lock", user, &pc, &h);
    if (r == PAM_SUCCESS) r = pam_authenticate(h, 0);
    if (r == PAM_SUCCESS) pam_setcred(h, PAM_REFRESH_CRED);
    if (h) pam_end(h, r);
    pam_pw = NULL;
    g_task_return_boolean(task, r == PAM_SUCCESS);
}

static void draw(void);
static gboolean tick(gpointer d);

static void checked(GObject *src, GAsyncResult *res, gpointer data)
{
    (void)src; (void)data;
    checking = FALSE;
    if (g_task_propagate_boolean(G_TASK(res), NULL)) { unlocked = TRUE; g_main_loop_quit(loop); return; }
    g_free(message); message = g_strdup(T("Wrong password. Try again."));
    shake_t0 = g_get_monotonic_time() / 1e6;
    g_timeout_add(16, tick, GINT_TO_POINTER(1));
    draw();
}

static void submit(void)
{
    if (checking || !pw->len) return;
    checking = TRUE;
    char *copy = g_strdup(pw->str);
    memset(pw->str, 0, pw->len); g_string_truncate(pw, 0);
    GTask *t = g_task_new(NULL, NULL, checked, NULL);
    g_task_set_task_data(t, copy, g_free);
    g_task_run_in_thread(t, check_thread);
    g_object_unref(t);
    draw();
}

/* ---------------------------------------------------------------- drawing */
static void rrect(cairo_t *cr, double x, double y, double w, double h, double r)
{
    cairo_new_sub_path(cr);
    cairo_arc(cr, x + w - r, y + r, r, -M_PI / 2, 0);
    cairo_arc(cr, x + w - r, y + h - r, r, 0, M_PI / 2);
    cairo_arc(cr, x + r, y + h - r, r, M_PI / 2, M_PI);
    cairo_arc(cr, x + r, y + r, r, M_PI, 1.5 * M_PI);
    cairo_close_path(cr);
}

static void centred(cairo_t *cr, const char *s, const char *font, double y, double alpha)
{
    PangoLayout *l = pango_cairo_create_layout(cr);
    PangoFontDescription *f = pango_font_description_from_string(font);
    pango_layout_set_font_description(l, f); pango_font_description_free(f);
    pango_layout_set_text(l, s, -1);
    int w, h; pango_layout_get_pixel_size(l, &w, &h);
    cairo_set_source_rgba(cr, 1, 1, 1, alpha);
    cairo_move_to(cr, (sw - w) / 2.0, y);
    pango_cairo_show_layout(cr, l);
    g_object_unref(l);
}

static void draw(void)
{
    cairo_surface_t *ws = cairo_xlib_surface_create(dpy, win, DefaultVisual(dpy, scr), sw, sh);
    cairo_surface_t *s = cairo_surface_create_similar(ws, CAIRO_CONTENT_COLOR, sw, sh);
    cairo_t *cr = cairo_create(s);
    cairo_pattern_t *g = cairo_pattern_create_linear(0, 0, 0, sh);
    cairo_pattern_add_color_stop_rgb(g, 0, .14, .16, .20);
    cairo_pattern_add_color_stop_rgb(g, 1, .07, .08, .10);
    cairo_set_source(cr, g); cairo_paint(cr); cairo_pattern_destroy(g);

    /* the time and date */
    char tbuf[64], dbuf[128];
    time_t now = time(NULL); struct tm tm; localtime_r(&now, &tm);
    /* hours and minutes, the way this language writes the time */
    const char *tf = nl_langinfo(T_FMT);
    gboolean twelve = tf && (strstr(tf, "%p") || strstr(tf, "%r") || strstr(tf, "%I"));
    strftime(tbuf, sizeof tbuf, twelve ? "%l:%M %p" : "%H:%M", &tm);
    strftime(dbuf, sizeof dbuf, g_str_has_prefix(palos_lang(), "en") ? "%A, %B %e" : "%A %e %B", &tm);
    centred(cr, tbuf, "Noto Sans Light 56", sh * 0.14, .95);
    centred(cr, dbuf, "Noto Sans 14", sh * 0.14 + 86, .75);

    /* who */
    double cy = sh * 0.52, r = 48;
    int shake = 0;
    if (shake_t0 > 0) { double t = g_get_monotonic_time() / 1e6 - shake_t0; if (t < 0.45) shake = (int)(sin(t * 50) * 12 * (1 - t / 0.45)); }
    cairo_save(cr);
    cairo_arc(cr, sw / 2.0, cy - 70, r, 0, 2 * M_PI);
    cairo_clip(cr);
    if (face) {
        int fw = cairo_image_surface_get_width(face), fh = cairo_image_surface_get_height(face);
        double k = 2 * r / MIN(fw, fh);
        cairo_translate(cr, sw / 2.0 - fw * k / 2, cy - 70 - fh * k / 2);
        cairo_scale(cr, k, k);
        cairo_set_source_surface(cr, face, 0, 0);
        cairo_paint(cr);
    } else {
        cairo_set_source_rgb(cr, .35, .38, .44); cairo_paint(cr);
        cairo_set_source_rgb(cr, .85, .87, .9);
        cairo_arc(cr, sw / 2.0, cy - 82, 17, 0, 2 * M_PI); cairo_fill(cr);
        cairo_arc(cr, sw / 2.0, cy - 30, 32, M_PI, 2 * M_PI); cairo_fill(cr);
    }
    cairo_restore(cr);
    centred(cr, full_name, "Noto Sans Bold 13", cy - 10, .95);

    /* the password field */
    double fw = 260, fh = 32, fx = (sw - fw) / 2 + shake, fy = cy + 22;
    rrect(cr, fx, fy, fw, fh, 16);
    cairo_set_source_rgba(cr, 1, 1, 1, .14); cairo_fill_preserve(cr);
    cairo_set_source_rgba(cr, 1, 1, 1, .35); cairo_set_line_width(cr, 1); cairo_stroke(cr);
    if (pw->len) {
        glong n = g_utf8_strlen(pw->str, -1);
        double cx = fx + 16;
        cairo_set_source_rgba(cr, 1, 1, 1, .95);
        for (glong i = 0; i < n && cx < fx + fw - 20; i++, cx += 12) { cairo_arc(cr, cx + 4, fy + fh / 2, 4, 0, 2 * M_PI); cairo_fill(cr); }
    } else {
        PangoLayout *l = pango_cairo_create_layout(cr);
        PangoFontDescription *f = pango_font_description_from_string("Noto Sans 10.5");
        pango_layout_set_font_description(l, f); pango_font_description_free(f);
        pango_layout_set_text(l, checking ? T("Checking…") : T("Enter Password"), -1);
        int w, h; pango_layout_get_pixel_size(l, &w, &h);
        cairo_set_source_rgba(cr, 1, 1, 1, .5);
        cairo_move_to(cr, fx + (fw - w) / 2, fy + (fh - h) / 2);
        pango_cairo_show_layout(cr, l);
        g_object_unref(l);
    }
    if (message) centred(cr, message, "Noto Sans 10.5", fy + fh + 14, .85);

    cairo_destroy(cr);
    cairo_t *wc = cairo_create(ws);
    cairo_set_source_surface(wc, s, 0, 0); cairo_paint(wc);
    cairo_destroy(wc);
    cairo_surface_destroy(s); cairo_surface_destroy(ws);
    XFlush(dpy);
}

static gboolean tick(gpointer d)
{
    draw();
    if (GPOINTER_TO_INT(d) == 1) {
        if (g_get_monotonic_time() / 1e6 - shake_t0 > 0.5) { shake_t0 = 0; draw(); return G_SOURCE_REMOVE; }
        return G_SOURCE_CONTINUE;
    }
    return G_SOURCE_CONTINUE;      /* the clock */
}

/* ---------------------------------------------------------------- input */
static void key(XKeyEvent *e)
{
    char buf[64] = ""; KeySym sym = NoSymbol; Status st;
    int n = xic ? Xutf8LookupString(xic, e, buf, sizeof buf - 1, &sym, &st) : XLookupString(e, buf, sizeof buf - 1, &sym, NULL);
    if (n < 0) n = 0;
    buf[n] = 0;
    if (checking) return;
    if (sym == XK_Return || sym == XK_KP_Enter) { submit(); return; }
    if (sym == XK_Escape) { memset(pw->str, 0, pw->len); g_string_truncate(pw, 0); }
    else if (sym == XK_BackSpace) {
        if (pw->len) { const char *p = g_utf8_find_prev_char(pw->str, pw->str + pw->len); g_string_truncate(pw, p ? (gsize)(p - pw->str) : 0); }
    } else if (n > 0 && !(e->state & ControlMask) && (unsigned char)buf[0] >= 0x20 && buf[0] != 0x7f) g_string_append(pw, buf);
    else return;
    g_clear_pointer(&message, g_free);
    draw();
}

typedef struct { GSource base; gpointer tag; } XSrc;
static gboolean xs_prepare(GSource *s, gint *t) { (void)s; *t = -1; return XPending(dpy) > 0; }
static gboolean xs_check(GSource *s) { return (g_source_query_unix_fd(s, ((XSrc *)s)->tag) & G_IO_IN) || XPending(dpy) > 0; }
static gboolean xs_dispatch(GSource *s, GSourceFunc cb, gpointer data)
{
    (void)s; (void)cb; (void)data;
    while (XPending(dpy)) {
        XEvent ev; XNextEvent(dpy, &ev);
        if (XFilterEvent(&ev, None)) continue;
        if (ev.type == KeyPress) key(&ev.xkey);
        else if (ev.type == Expose && ev.xexpose.count == 0) draw();
        else if (ev.type == VisibilityNotify && ev.xvisibility.state != VisibilityUnobscured) XRaiseWindow(dpy, win);
    }
    return G_SOURCE_CONTINUE;
}
static GSourceFuncs xs_funcs = { xs_prepare, xs_check, xs_dispatch, NULL, NULL, NULL };

static gboolean grab(void)
{
    for (int i = 0; i < 100; i++) {
        gboolean k = XGrabKeyboard(dpy, win, True, GrabModeAsync, GrabModeAsync, CurrentTime) == GrabSuccess;
        gboolean p = XGrabPointer(dpy, win, True, ButtonPressMask, GrabModeAsync, GrabModeAsync, win, None, CurrentTime) == GrabSuccess;
        if (k && p) return TRUE;
        if (k) XUngrabKeyboard(dpy, CurrentTime);
        if (p) XUngrabPointer(dpy, CurrentTime);
        g_usleep(20000);
    }
    return FALSE;
}

int main(void)
{
    setlocale(LC_ALL, "");
    if (!(dpy = XOpenDisplay(NULL))) return 1;
    scr = DefaultScreen(dpy); sw = DisplayWidth(dpy, scr); sh = DisplayHeight(dpy, scr);
    struct passwd *p = getpwuid(getuid());
    if (!p) return 1;
    user = g_strdup(p->pw_name);
    full_name = g_strdup(p->pw_gecos && *p->pw_gecos ? p->pw_gecos : p->pw_name);
    full_name[strcspn(full_name, ",")] = 0;
    if (!*full_name) { g_free(full_name); full_name = g_strdup(user); }
    char *faces[] = { g_build_filename(p->pw_dir, ".face", NULL), g_strdup_printf("/var/lib/AccountsService/icons/%s", user) };
    for (int i = 0; i < 2 && !face; i++) {
        cairo_surface_t *f = cairo_image_surface_create_from_png(faces[i]);
        if (cairo_surface_status(f) == CAIRO_STATUS_SUCCESS) face = f; else cairo_surface_destroy(f);
    }
    g_free(faces[0]); g_free(faces[1]);
    pw = g_string_new(NULL);

    XSetWindowAttributes sa = { .override_redirect = True, .background_pixel = BlackPixel(dpy, scr),
                                .event_mask = ExposureMask | KeyPressMask | VisibilityChangeMask };
    win = XCreateWindow(dpy, RootWindow(dpy, scr), 0, 0, sw, sh, 0, CopyFromParent, InputOutput, CopyFromParent,
                        CWOverrideRedirect | CWBackPixel | CWEventMask, &sa);
    XStoreName(dpy, win, "palOS lock");
    /* no pointer on the lock screen */
    Pixmap empty = XCreatePixmap(dpy, win, 1, 1, 1);
    XColor black = {0};
    Cursor none = XCreatePixmapCursor(dpy, empty, empty, &black, &black, 0, 0);
    XDefineCursor(dpy, win, none);
    XMapRaised(dpy, win);
    XSync(dpy, False);
    if (!grab()) { fputs("paladin-locker: another program holds the keyboard; can't lock\n", stderr); return 1; }
    XIM im = XOpenIM(dpy, NULL, NULL, NULL);
    if (im) xic = XCreateIC(im, XNInputStyle, XIMPreeditNothing | XIMStatusNothing, XNClientWindow, win, XNFocusWindow, win, NULL);
    draw();

    XSrc *x = (XSrc *)g_source_new(&xs_funcs, sizeof(XSrc));
    x->tag = g_source_add_unix_fd((GSource *)x, ConnectionNumber(dpy), G_IO_IN);
    g_source_attach((GSource *)x, NULL);
    g_timeout_add_seconds(10, tick, GINT_TO_POINTER(0));
    loop = g_main_loop_new(NULL, FALSE);
    g_main_loop_run(loop);

    XUngrabKeyboard(dpy, CurrentTime); XUngrabPointer(dpy, CurrentTime);
    XDestroyWindow(dpy, win);
    XSync(dpy, False);
    return unlocked ? 0 : 1;
}

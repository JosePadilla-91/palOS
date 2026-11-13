/* palos-alert: palOS's own small question and progress windows, for scripts and helpers.

     palos-alert [--title T] [--icon NAME|PATH] [--heading H] --text BODY [--entry DEFAULT] [--wide]
                 [--button LABEL]... [--cancel LABEL]
       Shows the question. The last --button is the default (Return; --default LABEL picks another for Return,
       for a careful question); --cancel is the one for Esc and the close
       button. Prints the chosen button's label (and, with --entry, the text on a second line). Exit 0 for a
       button, 1 for cancel/close. With no --button there is one: OK.

     palos-alert --progress [--title T] [--icon NAME] --text BODY
       A progress bar. Reads lines on stdin: a number (0-100) moves the bar, "#text" changes the words.
       Closes at 100 or when stdin ends. Exit 1 if the person pressed Cancel.

   Drawn with Cairo and Pango in the same look as the password sheet; follows the light/dark setting. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <poll.h>
#include <unistd.h>
#include <glib.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/keysym.h>
#include <X11/Xcursor/Xcursor.h>
#include <cairo/cairo.h>
#include <cairo/cairo-xlib.h>
#include <pango/pangocairo.h>
#include "../libpalos/l10n.h"

static Display *dpy;
static int scr;
static Window win;
static XIC xic;
static Atom a_delete, a_dark;

static int W = 440, H;
static const char *title, *heading, *body, *icon_name;
static GPtrArray *buttons;            /* labels; the last is the default */
static const char *cancel_label, *default_label;
static gboolean entry_on, progress_mode, wide, stacked;     /* stacked: buttons one above the other */
static GString *entry;
static double progress = -1;           /* -1: still waiting (pulses) */
static char *ptext;
static cairo_surface_t *icon;
static int hover = -1, pressed = -1;
typedef struct { int x, y, w, h; } Box;
static Box bbox[16], ebox;

/* ---------------------------------------------------------------- looks */
static gboolean dark(void)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    gboolean d = FALSE;
    if (XGetWindowProperty(dpy, RootWindow(dpy, scr), a_dark, 0, 1, False, XA_CARDINAL, &type, &fmt, &n, &after, &data) == Success && data && n)
        d = *(long *)data != 0;
    if (data) XFree(data);
    return d;
}

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

/* an icon by name from palOS's theme (or a picture file) */
static cairo_surface_t *load_icon(const char *name)
{
    if (!name || !*name) return NULL;
    if (!strcmp(name, "warning")) name = "dialog-warning";
    else if (!strcmp(name, "error")) name = "dialog-error";
    else if (!strcmp(name, "info")) name = "dialog-information";
    else if (!strcmp(name, "question")) name = "dialog-question";
    char *path = NULL;
    if (name[0] == '/') path = g_strdup(name);
    else {
        const char *themes[] = { "palOS", "Paladin", "hicolor" };
        const char *sizes[] = { "128x128", "64x64@2x", "64x64", "48x48@2x", "256x256", "32x32@2x", "96x96", "48x48" };
        const char *cats[] = { "status", "apps", "mimetypes", "devices", "actions", "places", "categories", "emblems" };
        for (guint t = 0; t < G_N_ELEMENTS(themes) && !path; t++)
            for (guint s = 0; s < G_N_ELEMENTS(sizes) && !path; s++)
                for (guint c = 0; c < G_N_ELEMENTS(cats) && !path; c++) {
                    char *p = g_strdup_printf("/usr/share/icons/%s/%s/%s/%s.png", themes[t], sizes[s], cats[c], name);
                    if (g_file_test(p, G_FILE_TEST_EXISTS)) path = p; else g_free(p);
                }
        if (!path) { char *p = g_strdup_printf("/usr/share/pixmaps/%s.png", name); if (g_file_test(p, G_FILE_TEST_EXISTS)) path = p; else g_free(p); }
    }
    if (!path) return NULL;
    cairo_surface_t *s = cairo_image_surface_create_from_png(path);
    g_free(path);
    if (cairo_surface_status(s) != CAIRO_STATUS_SUCCESS) { cairo_surface_destroy(s); return NULL; }
    return s;
}

static int text_x(void) { return icon ? 100 : 24; }

static int measure(void)
{
    cairo_surface_t *s = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, 1, 1);
    cairo_t *cr = cairo_create(s);
    int tw = W - text_x() - 24, w, h, total = 22;
    if (heading) { PangoLayout *l = text(cr, heading, "Noto Sans Bold 10.5", tw); pango_layout_get_pixel_size(l, &w, &h); total += h + 8; g_object_unref(l); }
    PangoLayout *l = text(cr, progress_mode ? ptext : body, "Noto Sans 9.5", tw);
    pango_layout_get_pixel_size(l, &w, &h); total += h; g_object_unref(l);
    cairo_destroy(cr); cairo_surface_destroy(s);
    if (entry_on) total += 14 + 26;
    if (progress_mode) total += 16 + 8;
    total += 22 + 28 + 18;
    if (stacked) total += (int)(buttons->len - 1) * 36;
    return MAX(total, icon ? 130 : 110);
}

static void draw(void)
{
    XWindowAttributes wa;
    if (!XGetWindowAttributes(dpy, win, &wa)) return;
    cairo_surface_t *ws = cairo_xlib_surface_create(dpy, win, wa.visual, wa.width, wa.height);
    cairo_surface_t *s = cairo_surface_create_similar(ws, CAIRO_CONTENT_COLOR, wa.width, wa.height);
    cairo_t *cr = cairo_create(s);
    gboolean dk = dark();
    double fg = dk ? 0.92 : 0.12, sub = dk ? 0.72 : 0.30;
    cairo_pattern_t *g = cairo_pattern_create_linear(0, 0, 0, wa.height);
    if (dk) { cairo_pattern_add_color_stop_rgb(g, 0, .20, .22, .25); cairo_pattern_add_color_stop_rgb(g, 1, .16, .17, .20); }
    else { cairo_pattern_add_color_stop_rgb(g, 0, .96, .96, .97); cairo_pattern_add_color_stop_rgb(g, 1, .90, .91, .93); }
    cairo_set_source(cr, g); cairo_paint(cr); cairo_pattern_destroy(g);

    if (icon) {
        double k = 56.0 / MAX(cairo_image_surface_get_width(icon), cairo_image_surface_get_height(icon));
        cairo_save(cr); cairo_translate(cr, 26, 22); cairo_scale(cr, k, k);
        cairo_pattern_set_filter(cairo_get_source(cr), CAIRO_FILTER_GOOD);
        cairo_set_source_surface(cr, icon, 0, 0); cairo_paint(cr); cairo_restore(cr);
    }
    int x = text_x(), y = 22, tw = W - x - 24, lw, lh;
    if (heading) {
        PangoLayout *l = text(cr, heading, "Noto Sans Bold 10.5", tw);
        cairo_set_source_rgb(cr, fg, fg, fg); cairo_move_to(cr, x, y); pango_cairo_show_layout(cr, l);
        pango_layout_get_pixel_size(l, &lw, &lh); y += lh + 8; g_object_unref(l);
    }
    PangoLayout *l = text(cr, progress_mode ? ptext : body, heading ? "Noto Sans 9.5" : "Noto Sans 9.5", tw);
    cairo_set_source_rgb(cr, heading ? sub : fg, heading ? sub : fg, heading ? sub : fg);
    cairo_move_to(cr, x, y); pango_cairo_show_layout(cr, l);
    pango_layout_get_pixel_size(l, &lw, &lh); y += lh; g_object_unref(l);

    if (entry_on) {
        y += 14;
        ebox = (Box){ x, y, tw, 26 };
        rrect(cr, x + .5, y + .5, tw - 1, 25, 5);
        if (dk) cairo_set_source_rgb(cr, .11, .12, .13); else cairo_set_source_rgb(cr, 1, 1, 1);
        cairo_fill_preserve(cr);
        cairo_set_source_rgba(cr, .33, .55, .92, .9); cairo_set_line_width(cr, 2); cairo_stroke(cr);
        PangoLayout *el = text(cr, entry->str, "Noto Sans 10", 0);
        pango_layout_get_pixel_size(el, &lw, &lh);
        double sx = MIN(0, tw - 20 - lw);
        cairo_save(cr); cairo_rectangle(cr, x + 4, y, tw - 8, 26); cairo_clip(cr);
        cairo_set_source_rgb(cr, fg, fg, fg); cairo_move_to(cr, x + 8 + sx, y + (26 - lh) / 2.0); pango_cairo_show_layout(cr, el);
        cairo_rectangle(cr, x + 9 + sx + lw, y + 6, 1.5, 14); cairo_fill(cr);
        cairo_restore(cr);
        g_object_unref(el);
        y += 26;
    }
    if (progress_mode) {
        y += 16;
        rrect(cr, x, y, tw, 8, 4);
        cairo_set_source_rgba(cr, 0, 0, 0, dk ? .45 : .14); cairo_fill(cr);
        double f = progress < 0 ? .3 : CLAMP(progress / 100.0, 0, 1);
        double off = progress < 0 ? fmod(g_get_monotonic_time() / 1.5e6, 1.0) * (tw * .7) : 0;
        if (f > 0) { rrect(cr, x + off, y, MAX(8, tw * f), 8, 4); cairo_set_source_rgb(cr, .30, .53, .95); cairo_fill(cr); }
    }

    /* buttons, right to left, the default (last) on the right; or stacked, the default at the bottom */
    int bh = 28, by = wa.height - 18 - bh, bx = W - 24;
    for (int i = (int)buttons->len - 1; i >= 0; i--) {
        PangoLayout *bl = text(cr, buttons->pdata[i], "Noto Sans 9.5", 0);
        pango_layout_get_pixel_size(bl, &lw, &lh);
        int bw = MAX(88, lw + 28);
        if (stacked) { bw = W - text_x() - 24; bx = text_x() + bw; if (i < (int)buttons->len - 1) by -= 36; }
        bx -= bw;
        bbox[i] = (Box){ bx, by, bw, bh };
        gboolean primary = i == (int)buttons->len - 1 && !progress_mode, hov = hover == i, pr = pressed == i && hov;
        rrect(cr, bx + .5, by + .5, bw - 1, bh - 1, 6);
        cairo_pattern_t *bg = cairo_pattern_create_linear(0, by, 0, by + bh);
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
        if (primary) cairo_set_source_rgb(cr, 1, 1, 1); else cairo_set_source_rgb(cr, fg, fg, fg);
        cairo_move_to(cr, bx + (bw - lw) / 2.0, by + (bh - lh) / 2.0);
        pango_cairo_show_layout(cr, bl);
        g_object_unref(bl);
        bx -= 10;
    }

    cairo_destroy(cr);
    cairo_t *wc = cairo_create(ws);
    cairo_set_source_surface(wc, s, 0, 0); cairo_paint(wc);
    cairo_destroy(wc); cairo_surface_destroy(s); cairo_surface_destroy(ws);
    XFlush(dpy);
}

static int hit(int x, int y)
{
    for (guint i = 0; i < buttons->len; i++)
        if (x >= bbox[i].x && x < bbox[i].x + bbox[i].w && y >= bbox[i].y && y < bbox[i].y + bbox[i].h) return (int)i;
    return -1;
}

/* ---------------------------------------------------------------- answers */
static int finish(int i)
{
    const char *label = i >= 0 ? buttons->pdata[i] : NULL;
    gboolean cancelled = !label || (cancel_label && !strcmp(label, cancel_label)) || progress_mode;
    if (label && !progress_mode) {
        printf("%s\n", label);
        if (entry_on) printf("%s\n", entry->str);
        fflush(stdout);
    }
    return cancelled ? 1 : 0;
}

static int cancel_index(void)
{
    if (cancel_label) for (guint i = 0; i < buttons->len; i++) if (!strcmp(buttons->pdata[i], cancel_label)) return (int)i;
    return -1;
}

static void resize_to_fit(void)
{
    int h = measure();
    if (h == H) return;
    H = h;
    XSizeHints hints = { .flags = PMinSize | PMaxSize, .min_width = W, .max_width = W, .min_height = H, .max_height = H };
    XSetWMNormalHints(dpy, win, &hints);
    XResizeWindow(dpy, win, W, H);
}

/* returns -2 to go on, else the result */
static int handle(XEvent *ev)
{
    if (XFilterEvent(ev, None)) return -2;
    switch (ev->type) {
    case Expose: if (ev->xexpose.count == 0) draw(); break;
    case ConfigureNotify: draw(); break;
    case MapNotify:
        XSetInputFocus(dpy, win, RevertToParent, CurrentTime);
        break;
    case KeyPress: {
        char buf[64] = ""; KeySym sym = NoSymbol; Status st;
        int n = xic ? Xutf8LookupString(xic, &ev->xkey, buf, sizeof buf - 1, &sym, &st) : XLookupString(&ev->xkey, buf, sizeof buf - 1, &sym, NULL);
        if (n < 0) n = 0;
        buf[n] = 0;
        if (sym == XK_Escape) {
            int c = cancel_index();
            if (c >= 0 || progress_mode) return finish(c);
            if (!entry_on && buttons->len == 1) return finish(0);
            return 1;
        }
        if ((sym == XK_Return || sym == XK_KP_Enter) && !progress_mode) {
            int d = (int)buttons->len - 1;
            if (default_label) for (guint i = 0; i < buttons->len; i++) if (!strcmp(buttons->pdata[i], default_label)) d = (int)i;
            return finish(d);
        }
        if (!entry_on) break;
        if (sym == XK_BackSpace) {
            if (entry->len) { const char *p = g_utf8_find_prev_char(entry->str, entry->str + entry->len); g_string_truncate(entry, p ? (gsize)(p - entry->str) : 0); }
        } else if ((ev->xkey.state & ControlMask) && (sym == XK_u || sym == XK_U)) g_string_truncate(entry, 0);
        else if (n > 0 && !(ev->xkey.state & ControlMask) && (unsigned char)buf[0] >= 0x20 && buf[0] != 0x7f) g_string_append(entry, buf);
        else break;
        draw();
        break;
    }
    case ButtonPress: if (ev->xbutton.button == 1) { pressed = hit(ev->xbutton.x, ev->xbutton.y); draw(); } break;
    case ButtonRelease:
        if (ev->xbutton.button == 1) {
            int h = hit(ev->xbutton.x, ev->xbutton.y), p = pressed;
            pressed = -1; draw();
            if (h >= 0 && h == p) return finish(h);
        }
        break;
    case MotionNotify: { int h = hit(ev->xmotion.x, ev->xmotion.y); if (h != hover) { hover = h; draw(); } break; }
    case LeaveNotify: if (hover >= 0) { hover = -1; draw(); } break;
    case ClientMessage: if ((Atom)ev->xclient.data.l[0] == a_delete) return finish(cancel_index()) | 1; break;
    case PropertyNotify: if (ev->xproperty.atom == a_dark) draw(); break;
    }
    return -2;
}

/* a line from the script driving the progress bar */
static gboolean progress_line(char *line)
{
    g_strstrip(line);
    if (line[0] == '#') { g_free(ptext); ptext = g_strdup(g_strstrip(line + 1)); resize_to_fit(); draw(); return TRUE; }
    char *end; double v = g_ascii_strtod(line, &end);
    if (end != line) { progress = v; draw(); if (v >= 100) return FALSE; }
    return TRUE;
}

int main(int argc, char **argv)
{
    buttons = g_ptr_array_new();
    entry = g_string_new(NULL);
    for (int i = 1; i < argc; i++) {
        const char *a = argv[i], *v = i + 1 < argc ? argv[i + 1] : NULL;
        if (!strcmp(a, "--title") && v) { title = v; i++; }
        else if (!strcmp(a, "--icon") && v) { icon_name = v; i++; }
        else if (!strcmp(a, "--heading") && v) { heading = v; i++; }
        else if (!strcmp(a, "--text") && v) { body = v; i++; }
        else if (!strcmp(a, "--entry") && v) { entry_on = TRUE; g_string_assign(entry, v); i++; }
        else if (!strcmp(a, "--button") && v) { g_ptr_array_add(buttons, (gpointer)v); i++; }
        else if (!strcmp(a, "--cancel") && v) { cancel_label = v; i++; }
        else if (!strcmp(a, "--default") && v) { default_label = v; i++; }
        else if (!strcmp(a, "--progress")) progress_mode = TRUE;
        else if (!strcmp(a, "--wide")) wide = TRUE;
        else if (!strcmp(a, "-h") || !strcmp(a, "--help")) {
            puts("palos-alert [--title T] [--icon NAME] [--heading H] --text BODY [--entry DEFAULT] [--wide] [--button LABEL]... [--cancel LABEL] [--default LABEL]\n"
                 "palos-alert --progress [--title T] [--icon NAME] --text BODY   (stdin: 0-100, or #text)");
            return 0;
        } else { fprintf(stderr, "palos-alert: what is %s?\n", a); return 2; }
    }
    if (progress_mode) { g_ptr_array_set_size(buttons, 0); g_ptr_array_add(buttons, (gpointer)T("Cancel")); cancel_label = buttons->pdata[0]; ptext = g_strdup(body ? body : ""); }
    if (!buttons->len) g_ptr_array_add(buttons, (gpointer)T("OK"));
    if (buttons->len > G_N_ELEMENTS(bbox)) g_ptr_array_set_size(buttons, G_N_ELEMENTS(bbox));
    if (wide) W = 600;
    if (!body) body = "";

    if (!(dpy = XOpenDisplay(NULL))) { fputs("palos-alert: no display\n", stderr); return 3; }
    scr = DefaultScreen(dpy);
    a_delete = XInternAtom(dpy, "WM_DELETE_WINDOW", False);
    a_dark = XInternAtom(dpy, "_PALADIN_DARK", False);
    XSelectInput(dpy, RootWindow(dpy, scr), PropertyChangeMask);
    icon = load_icon(icon_name);
    /* buttons wider than the window: make room */
    {
        int need = 48;
        cairo_surface_t *s = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, 1, 1); cairo_t *cr = cairo_create(s);
        for (guint i = 0; i < buttons->len; i++) { int w, h; PangoLayout *l = text(cr, buttons->pdata[i], "Noto Sans 9.5", 0); pango_layout_get_pixel_size(l, &w, &h); need += MAX(88, w + 28) + 10; g_object_unref(l); }
        cairo_destroy(cr); cairo_surface_destroy(s);
        if (need > DisplayWidth(dpy, scr) - 40 || need > 900) { stacked = TRUE; W = MAX(W, 520); }
        else if (need > W) W = need;
    }
    H = measure();
    int sw = DisplayWidth(dpy, scr), sh = DisplayHeight(dpy, scr), x = (sw - W) / 2, y = (sh - H) / 3;
    XSetWindowAttributes sa = { .event_mask = ExposureMask | KeyPressMask | ButtonPressMask | ButtonReleaseMask | PointerMotionMask
                                              | LeaveWindowMask | StructureNotifyMask, .background_pixmap = None };
    win = XCreateWindow(dpy, RootWindow(dpy, scr), x, y, W, H, 0, CopyFromParent, InputOutput, CopyFromParent, CWEventMask | CWBackPixmap, &sa);
    const char *t = title ? title : heading ? heading : "palOS";
    Atom a_name = XInternAtom(dpy, "_NET_WM_NAME", False), a_utf8 = XInternAtom(dpy, "UTF8_STRING", False);
    XChangeProperty(dpy, win, a_name, a_utf8, 8, PropModeReplace, (const unsigned char *)t, strlen(t));
    XStoreName(dpy, win, t);
    XClassHint ch = { "palos-alert", "Palos-alert" };
    XSetClassHint(dpy, win, &ch);
    XSetWMProtocols(dpy, win, &a_delete, 1);
    Atom a_type = XInternAtom(dpy, "_NET_WM_WINDOW_TYPE", False), a_dialog = XInternAtom(dpy, "_NET_WM_WINDOW_TYPE_DIALOG", False);
    XChangeProperty(dpy, win, a_type, XA_ATOM, 32, PropModeReplace, (unsigned char *)&a_dialog, 1);
    Atom a_state = XInternAtom(dpy, "_NET_WM_STATE", False), a_above = XInternAtom(dpy, "_NET_WM_STATE_ABOVE", False);
    XChangeProperty(dpy, win, a_state, XA_ATOM, 32, PropModeReplace, (unsigned char *)&a_above, 1);
    XSizeHints hints = { .flags = PPosition | USPosition | PMinSize | PMaxSize, .x = x, .y = y, .min_width = W, .max_width = W, .min_height = H, .max_height = H };
    XSetWMNormalHints(dpy, win, &hints);
    XWMHints wh = { .flags = InputHint, .input = True };
    XSetWMHints(dpy, win, &wh);
    Cursor c = XcursorLibraryLoadCursor(dpy, "left_ptr");
    if (c) XDefineCursor(dpy, win, c);
    XIM xim = XOpenIM(dpy, NULL, NULL, NULL);
    if (xim) xic = XCreateIC(xim, XNInputStyle, XIMPreeditNothing | XIMStatusNothing, XNClientWindow, win, XNFocusWindow, win, NULL);
    if (xic) XSetICFocus(xic);
    XMapRaised(dpy, win);
    XFlush(dpy);

    GString *inbuf = g_string_new(NULL);
    gboolean stdin_open = progress_mode;
    for (;;) {
        while (XPending(dpy)) {
            XEvent ev; XNextEvent(dpy, &ev);
            int r = handle(&ev);
            if (r != -2) return r;
        }
        struct pollfd p[2] = { { ConnectionNumber(dpy), POLLIN, 0 }, { 0, POLLIN, 0 } };
        int n = poll(p, stdin_open ? 2 : 1, progress_mode && progress < 0 ? 40 : -1);
        if (progress_mode && progress < 0) draw();          /* waiting: the bar moves */
        if (n > 0 && stdin_open && (p[1].revents & (POLLIN | POLLHUP))) {
            char buf[4096]; ssize_t got = read(0, buf, sizeof buf);
            if (got <= 0) return 0;                           /* the script is done */
            g_string_append_len(inbuf, buf, got);
            char *nl;
            while ((nl = strchr(inbuf->str, '\n'))) {
                char *line = g_strndup(inbuf->str, nl - inbuf->str);
                g_string_erase(inbuf, 0, nl - inbuf->str + 1);
                gboolean more = progress_line(line);
                g_free(line);
                if (!more) return 0;
            }
        }
    }
}

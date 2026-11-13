/* palos-screenshot: pictures and recordings of the screen.

     palos-screenshot                        the Screenshot bar (Print Screen)
     palos-screenshot screen|window|area [--clipboard]
     palos-screenshot record [--area] [--audio none|mic|system|both]
     palos-screenshot stop                   stop the recording in progress

   Pictures go on the Desktop as "Screenshot YYYY-MM-DD at H.MM.SS.png", recordings as
   "Screen Recording YYYY-MM-DD at H.MM.SS.mp4" (H.264 + AAC, by GStreamer). Print Screen during a recording
   stops it. Settings (timer, sound, pointer) are kept in ~/.config/palos-screenshot.json. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <signal.h>
#include <unistd.h>
#include <sys/stat.h>
#include <gio/gio.h>
#include <glib-unix.h>
#include <json-glib/json-glib.h>
#include <gst/gst.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/keysym.h>
#include <X11/Xcursor/Xcursor.h>
#include <X11/extensions/Xfixes.h>
#include <cairo/cairo.h>
#include <cairo/cairo-xlib.h>
#include <pango/pangocairo.h>
#include "../libpalos/l10n.h"

static Display *dpy;
static int scr, SW, SH;
static Window root;
static Visual *argb; static Colormap argb_cmap;

typedef struct { int timer; char audio[16]; gboolean pointer; } Conf;
static Conf conf = { 0, "none", TRUE };

/* ---------------------------------------------------------------- places, names, settings */
static char *conf_path(void) { return g_build_filename(g_get_user_config_dir(), "palos-screenshot.json", NULL); }
static char *pid_path(void) { return g_build_filename(g_get_user_runtime_dir(), "palos-screenshot", "recording.pid", NULL); }

static void load_conf(void)
{
    char *p = conf_path();
    JsonParser *jp = json_parser_new();
    if (json_parser_load_from_file(jp, p, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(jp))) {
        JsonObject *o = json_node_get_object(json_parser_get_root(jp));
        conf.timer = (int)json_object_get_int_member_with_default(o, "timer", 0);
        g_strlcpy(conf.audio, json_object_get_string_member_with_default(o, "audio", "none"), sizeof conf.audio);
        conf.pointer = json_object_get_boolean_member_with_default(o, "pointer", TRUE);
    }
    g_object_unref(jp); g_free(p);
}

static void save_conf(void)
{
    char *p = conf_path();
    char *s = g_strdup_printf("{\"timer\": %d, \"audio\": \"%s\", \"pointer\": %s}\n", conf.timer, conf.audio, conf.pointer ? "true" : "false");
    g_file_set_contents(p, s, -1, NULL);
    g_free(s); g_free(p);
}

static char *desktop_dir(void)
{
    const char *d = g_get_user_special_dir(G_USER_DIRECTORY_DESKTOP);
    char *r = d && strcmp(d, g_get_home_dir()) ? g_strdup(d) : g_build_filename(g_get_home_dir(), "Desktop", NULL);
    g_mkdir_with_parents(r, 0755);
    return r;
}

static char *stamp(void)
{
    time_t t = time(NULL); struct tm tm; localtime_r(&t, &tm);
    return g_strdup_printf("%04d-%02d-%02d at %d.%02d.%02d", tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday, tm.tm_hour, tm.tm_min, tm.tm_sec);
}

static char *new_file(const char *what, const char *ext)
{
    char *dir = desktop_dir(), *st = stamp(), *name = Tf(what, st);
    char *path = g_strdup_printf("%s/%s.%s", dir, name, ext);
    for (int i = 2; g_file_test(path, G_FILE_TEST_EXISTS); i++) { g_free(path); path = g_strdup_printf("%s/%s (%d).%s", dir, name, i, ext); }
    g_free(dir); g_free(st); g_free(name);
    return path;
}

static void notify(const char *title, const char *body, const char *icon)
{
    GDBusConnection *bus = g_bus_get_sync(G_BUS_TYPE_SESSION, NULL, NULL);
    if (!bus) return;
    GVariantBuilder hints; g_variant_builder_init(&hints, G_VARIANT_TYPE("a{sv}"));
    g_dbus_connection_call_sync(bus, "org.freedesktop.Notifications", "/org/freedesktop/Notifications", "org.freedesktop.Notifications", "Notify",
        g_variant_new("(susssasa{sv}i)", T("Screenshot"), 0, icon ? icon : "palos-screenshot", title, body ? body : "", NULL, &hints, -1),
        NULL, G_DBUS_CALL_FLAGS_NONE, 2000, NULL, NULL);
    g_object_unref(bus);
}

static void shutter(void)
{
    const char *snd = "/usr/share/sounds/freedesktop/stereo/camera-shutter.oga";
    if (!g_file_test(snd, G_FILE_TEST_EXISTS)) return;
    char *out = NULL;
    g_spawn_command_line_sync("gsettings get org.gnome.desktop.sound event-sounds", &out, NULL, NULL, NULL);
    gboolean off = out && strstr(out, "false");
    g_free(out);
    if (off) return;
    const char *argv[] = { g_find_program_in_path("pw-play") ? "pw-play" : "paplay", snd, NULL };
    g_spawn_async(NULL, (char **)argv, NULL, G_SPAWN_SEARCH_PATH | G_SPAWN_STDOUT_TO_DEV_NULL | G_SPAWN_STDERR_TO_DEV_NULL, NULL, NULL, NULL, NULL);
}

/* ---------------------------------------------------------------- drawing helpers */
static void rrect(cairo_t *cr, double x, double y, double w, double h, double r)
{
    cairo_new_sub_path(cr);
    cairo_arc(cr, x + w - r, y + r, r, -M_PI / 2, 0);
    cairo_arc(cr, x + w - r, y + h - r, r, 0, M_PI / 2);
    cairo_arc(cr, x + r, y + h - r, r, M_PI / 2, M_PI);
    cairo_arc(cr, x + r, y + r, r, M_PI, 1.5 * M_PI);
    cairo_close_path(cr);
}

static void label(cairo_t *cr, const char *s, double x, double y, const char *font, gboolean centre, int *w_out)
{
    PangoLayout *l = pango_cairo_create_layout(cr);
    PangoFontDescription *f = pango_font_description_from_string(font);
    pango_layout_set_font_description(l, f); pango_font_description_free(f);
    pango_layout_set_text(l, s, -1);
    int w, h; pango_layout_get_pixel_size(l, &w, &h);
    if (w_out) *w_out = w;
    if (cr) { cairo_move_to(cr, centre ? x - w / 2.0 : x, y - h / 2.0); pango_cairo_show_layout(cr, l); }
    g_object_unref(l);
}

static int text_width(const char *s, const char *font)
{
    cairo_surface_t *sf = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, 1, 1);
    cairo_t *cr = cairo_create(sf);
    PangoLayout *l = pango_cairo_create_layout(cr);
    PangoFontDescription *f = pango_font_description_from_string(font);
    pango_layout_set_font_description(l, f); pango_font_description_free(f);
    pango_layout_set_text(l, s, -1);
    int w, h; pango_layout_get_pixel_size(l, &w, &h);
    g_object_unref(l); cairo_destroy(cr); cairo_surface_destroy(sf);
    return w;
}

static void glyph(cairo_t *cr, const char *kind, double cx, double cy)
{
    cairo_set_source_rgba(cr, 1, 1, 1, .95);
    cairo_set_line_width(cr, 1.6);
    double dash[2] = { 3, 2.2 };
    gboolean dashed = !strcmp(kind, "window") || !strcmp(kind, "area") || !strcmp(kind, "rec-area");
    if (dashed) cairo_set_dash(cr, dash, 2, 0);
    cairo_rectangle(cr, cx - 13, cy - 9, 26, 17); cairo_stroke(cr);
    cairo_set_dash(cr, NULL, 0, 0);
    if (!strcmp(kind, "screen") || !strcmp(kind, "rec-screen")) { cairo_rectangle(cr, cx - 13, cy - 9, 26, 3); cairo_fill(cr); }
    if (!strcmp(kind, "window")) {
        cairo_rectangle(cr, cx - 9, cy - 6, 18, 12); cairo_stroke(cr);
        cairo_rectangle(cr, cx - 9, cy - 6, 18, 3); cairo_fill(cr);
    }
    if (!strcmp(kind, "area")) { cairo_rectangle(cr, cx - 6, cy - 3, 12, 8); cairo_fill(cr); }
    if (!strcmp(kind, "rec-screen")) { cairo_arc(cr, cx, cy + 1.5, 4.2, 0, 2 * M_PI); cairo_fill(cr); }
    if (!strcmp(kind, "rec-area")) { cairo_arc(cr, cx, cy, 4.2, 0, 2 * M_PI); cairo_fill(cr); }
}

static Window make_window(int x, int y, int w, int h, gboolean override, gboolean transparent, long events)
{
    XSetWindowAttributes sa = { .override_redirect = override, .event_mask = events, .border_pixel = 0, .background_pixmap = None };
    unsigned long mask = CWOverrideRedirect | CWEventMask | CWBorderPixel | CWBackPixmap;
    int depth = CopyFromParent; Visual *vis = CopyFromParent;
    if (transparent && argb) { sa.colormap = argb_cmap; mask |= CWColormap; depth = 32; vis = argb; }
    Window win = XCreateWindow(dpy, root, x, y, w, h, 0, depth, InputOutput, vis, mask, &sa);
    XClassHint ch = { "palos-screenshot", "Palos-screenshot" };
    XSetClassHint(dpy, win, &ch);
    XStoreName(dpy, win, T("Screenshot"));
    return win;
}

static cairo_surface_t *win_surface(Window w, int width, int height, gboolean transparent)
{
    return cairo_xlib_surface_create(dpy, w, transparent && argb ? argb : DefaultVisual(dpy, scr), width, height);
}

static gboolean grab_all(Window w, Cursor c)
{
    for (int i = 0; i < 50; i++) {
        if (XGrabPointer(dpy, w, False, ButtonPressMask | ButtonReleaseMask | PointerMotionMask, GrabModeAsync, GrabModeAsync, None, c, CurrentTime) == GrabSuccess) {
            if (XGrabKeyboard(dpy, w, False, GrabModeAsync, GrabModeAsync, CurrentTime) == GrabSuccess) return TRUE;
            XUngrabPointer(dpy, CurrentTime);
        }
        g_usleep(20000);
    }
    return FALSE;
}

/* ---------------------------------------------------------------- choosing what to capture */
typedef struct { int x, y, w, h; } Rect;

static void draw_overlay(Window w, Rect *sel, gboolean have)
{
    cairo_surface_t *s = win_surface(w, SW, SH, TRUE);
    cairo_t *cr = cairo_create(s);
    cairo_set_operator(cr, CAIRO_OPERATOR_SOURCE);
    cairo_set_source_rgba(cr, 0, 0, 0, argb ? .18 : 0);
    cairo_paint(cr);
    if (have && sel->w > 0 && sel->h > 0) {
        cairo_set_source_rgba(cr, .25 * .22, .52 * .22, .96 * .22, .22);
        cairo_rectangle(cr, sel->x, sel->y, sel->w, sel->h); cairo_fill(cr);
        cairo_set_operator(cr, CAIRO_OPERATOR_OVER);
        cairo_set_source_rgba(cr, .45, .68, 1, .95); cairo_set_line_width(cr, 1.5);
        cairo_rectangle(cr, sel->x + .75, sel->y + .75, sel->w - 1.5, sel->h - 1.5); cairo_stroke(cr);
        char sz[32]; g_snprintf(sz, sizeof sz, "%d × %d", sel->w, sel->h);
        int tw = text_width(sz, "Noto Sans 9");
        double lx = MIN(sel->x + sel->w + 6, SW - tw - 14), ly = MIN(sel->y + sel->h + 6, SH - 22);
        rrect(cr, lx, ly, tw + 10, 18, 5); cairo_set_source_rgba(cr, 0, 0, 0, .65); cairo_fill(cr);
        cairo_set_source_rgb(cr, 1, 1, 1); label(cr, sz, lx + 5, ly + 9, "Noto Sans 9", FALSE, NULL);
    }
    cairo_destroy(cr); cairo_surface_destroy(s);
    XFlush(dpy);
}

/* drag out a rectangle (Esc: never mind) */
static gboolean select_area(Rect *out)
{
    Window w = make_window(0, 0, SW, SH, True, TRUE, ExposureMask);
    XMapRaised(dpy, w); XSync(dpy, False);
    Cursor c = XcursorLibraryLoadCursor(dpy, "crosshair");
    if (!grab_all(w, c)) { XDestroyWindow(dpy, w); return FALSE; }
    Rect sel = {0}; int ax = 0, ay = 0; gboolean dragging = FALSE, done = FALSE, ok = FALSE;
    draw_overlay(w, &sel, FALSE);
    while (!done) {
        XEvent ev; XNextEvent(dpy, &ev);
        switch (ev.type) {
        case Expose: draw_overlay(w, &sel, dragging); break;
        case KeyPress: if (XLookupKeysym(&ev.xkey, 0) == XK_Escape) done = TRUE; break;
        case ButtonPress:
            if (ev.xbutton.button == 1) { dragging = TRUE; ax = ev.xbutton.x_root; ay = ev.xbutton.y_root; sel = (Rect){ ax, ay, 0, 0 }; }
            else if (ev.xbutton.button == 3) done = TRUE;
            break;
        case MotionNotify:
            if (dragging) {
                while (XCheckTypedEvent(dpy, MotionNotify, &ev)) ;
                int x = ev.xmotion.x_root, y = ev.xmotion.y_root;
                sel = (Rect){ MIN(ax, x), MIN(ay, y), abs(x - ax), abs(y - ay) };
                draw_overlay(w, &sel, TRUE);
            }
            break;
        case ButtonRelease:
            if (dragging && ev.xbutton.button == 1) { done = TRUE; ok = sel.w > 2 && sel.h > 2; }
            break;
        }
    }
    XUngrabKeyboard(dpy, CurrentTime); XUngrabPointer(dpy, CurrentTime);
    XDestroyWindow(dpy, w); XSync(dpy, False);
    *out = sel;
    return ok;
}

static gboolean cardinals(Window w, const char *prop, long *v, int n)
{
    Atom a = XInternAtom(dpy, prop, False), type; int fmt; unsigned long nitems, after; unsigned char *data = NULL;
    gboolean ok = XGetWindowProperty(dpy, w, a, 0, n, False, XA_CARDINAL, &type, &fmt, &nitems, &after, &data) == Success && data && (int)nitems >= n;
    if (ok) for (int i = 0; i < n; i++) v[i] = ((long *)data)[i];
    if (data) XFree(data);
    return ok;
}

/* the app window inside a top-level window (the one with WM_STATE) */
static Window client_of(Window w, int depth)
{
    Atom wm_state = XInternAtom(dpy, "WM_STATE", False), type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    if (XGetWindowProperty(dpy, w, wm_state, 0, 1, False, AnyPropertyType, &type, &fmt, &n, &after, &data) == Success && data) { XFree(data); return w; }
    if (data) XFree(data);
    if (depth <= 0) return None;
    Window r, p, *kids = NULL; unsigned int nk = 0;
    Window found = None;
    if (XQueryTree(dpy, w, &r, &p, &kids, &nk)) {
        for (unsigned int i = nk; i-- > 0 && !found;) found = client_of(kids[i], depth - 1);
        if (kids) XFree(kids);
    }
    return found;
}

/* a window as it looks on screen: title bar included, without the invisible edge round it */
static gboolean window_rect(Window top, Rect *out)
{
    Window client = client_of(top, 3);
    if (!client) return FALSE;
    XWindowAttributes a; Window child; int x, y;
    if (!XGetWindowAttributes(dpy, client, &a) || a.map_state != IsViewable) return FALSE;
    XTranslateCoordinates(dpy, client, root, 0, 0, &x, &y, &child);
    long ext[4] = { 0, 0, 0, 0 };
    cardinals(client, "_NET_FRAME_EXTENTS", ext, 4);
    Rect r = { x - (int)ext[0], y - (int)ext[2], a.width + (int)(ext[0] + ext[1]), a.height + (int)(ext[2] + ext[3]) };
    /* kept on screen */
    if (r.x < 0) { r.w += r.x; r.x = 0; }
    if (r.y < 0) { r.h += r.y; r.y = 0; }
    if (r.x + r.w > SW) r.w = SW - r.x;
    if (r.y + r.h > SH) r.h = SH - r.y;
    *out = r;
    return r.w > 2 && r.h > 2;
}

static Window top_level_at(int x, int y, Window skip)
{
    Window r, p, *kids = NULL; unsigned int nk = 0, i;
    Window found = None;
    if (!XQueryTree(dpy, root, &r, &p, &kids, &nk)) return None;
    for (i = nk; i-- > 0;) {
        if (kids[i] == skip) continue;
        XWindowAttributes a;
        if (!XGetWindowAttributes(dpy, kids[i], &a) || a.map_state != IsViewable || a.override_redirect) continue;
        if (x < a.x || y < a.y || x >= a.x + a.width || y >= a.y + a.height) continue;
        Rect wr;
        if (!window_rect(kids[i], &wr)) continue;
        /* skip the desktop and the Dock: they cover the whole screen */
        Window c = client_of(kids[i], 3);
        Atom type = XInternAtom(dpy, "_NET_WM_WINDOW_TYPE", False), t; int fmt; unsigned long n, after; unsigned char *data = NULL;
        gboolean skipit = FALSE;
        if (c && XGetWindowProperty(dpy, c, type, 0, 1, False, XA_ATOM, &t, &fmt, &n, &after, &data) == Success && data && n) {
            Atom wt = *(Atom *)data;
            skipit = wt == XInternAtom(dpy, "_NET_WM_WINDOW_TYPE_DESKTOP", False) || wt == XInternAtom(dpy, "_NET_WM_WINDOW_TYPE_DOCK", False);
        }
        if (data) XFree(data);
        if (skipit) continue;
        if (x >= wr.x && y >= wr.y && x < wr.x + wr.w && y < wr.y + wr.h) { found = kids[i]; break; }
    }
    if (kids) XFree(kids);
    return found;
}

/* point at a window and click it */
static gboolean pick_window(Rect *out)
{
    Window w = make_window(0, 0, SW, SH, True, TRUE, ExposureMask);
    XMapRaised(dpy, w); XSync(dpy, False);
    Cursor c = XcursorLibraryLoadCursor(dpy, "crosshair");
    if (!grab_all(w, c)) { XDestroyWindow(dpy, w); return FALSE; }
    Rect sel = {0}; gboolean have = FALSE, done = FALSE, ok = FALSE;
    Window rr, cw; int px, py, wx, wy; unsigned int m;
    XQueryPointer(dpy, root, &rr, &cw, &px, &py, &wx, &wy, &m);
    Window t = top_level_at(px, py, w);
    have = t && window_rect(t, &sel);
    draw_overlay(w, &sel, have);
    while (!done) {
        XEvent ev; XNextEvent(dpy, &ev);
        if (ev.type == Expose) draw_overlay(w, &sel, have);
        else if (ev.type == KeyPress && XLookupKeysym(&ev.xkey, 0) == XK_Escape) done = TRUE;
        else if (ev.type == MotionNotify) {
            while (XCheckTypedEvent(dpy, MotionNotify, &ev)) ;
            t = top_level_at(ev.xmotion.x_root, ev.xmotion.y_root, w);
            Rect nr = {0};
            gboolean h = t && window_rect(t, &nr);
            if (h != have || memcmp(&nr, &sel, sizeof nr)) { have = h; sel = nr; draw_overlay(w, &sel, have); }
        } else if (ev.type == ButtonPress) { done = TRUE; ok = ev.xbutton.button == 1 && have; }
    }
    XUngrabKeyboard(dpy, CurrentTime); XUngrabPointer(dpy, CurrentTime);
    XDestroyWindow(dpy, w); XSync(dpy, False);
    *out = sel;
    return ok;
}

/* ---------------------------------------------------------------- the picture */
static cairo_surface_t *grab_screen(Rect r, gboolean pointer)
{
    XImage *img = XGetImage(dpy, root, r.x, r.y, r.w, r.h, AllPlanes, ZPixmap);
    if (!img) return NULL;
    cairo_surface_t *s = cairo_image_surface_create(CAIRO_FORMAT_RGB24, r.w, r.h);
    unsigned char *d = cairo_image_surface_get_data(s);
    int ds = cairo_image_surface_get_stride(s);
    for (int y = 0; y < r.h; y++) for (int x = 0; x < r.w; x++) ((guint32 *)(d + y * ds))[x] = XGetPixel(img, x, y) & 0xffffff;
    cairo_surface_mark_dirty(s);
    XDestroyImage(img);
    if (pointer) {
        XFixesCursorImage *ci = XFixesGetCursorImage(dpy);
        if (ci) {
            cairo_surface_t *cs = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, ci->width, ci->height);
            unsigned char *cd = cairo_image_surface_get_data(cs);
            int cst = cairo_image_surface_get_stride(cs);
            for (int y = 0; y < ci->height; y++) for (int x = 0; x < ci->width; x++)
                ((guint32 *)(cd + y * cst))[x] = (guint32)ci->pixels[y * ci->width + x];
            cairo_surface_mark_dirty(cs);
            cairo_t *cr = cairo_create(s);
            cairo_set_source_surface(cr, cs, ci->x - ci->xhot - r.x, ci->y - ci->yhot - r.y);
            cairo_paint(cr);
            cairo_destroy(cr); cairo_surface_destroy(cs);
            XFree(ci);
        }
    }
    return s;
}

static cairo_status_t to_bytes(void *closure, const unsigned char *data, unsigned int len)
{
    g_byte_array_append(closure, data, len);
    return CAIRO_STATUS_SUCCESS;
}

/* the clipboard holds the picture as long as nothing else is copied (a small process keeps it) */
static void serve_clipboard(GByteArray *png)
{
    if (fork() != 0) return;
    setsid();
    Display *d = XOpenDisplay(NULL);
    if (!d) _exit(1);
    Window w = XCreateSimpleWindow(d, DefaultRootWindow(d), -10, -10, 1, 1, 0, 0, 0);
    Atom clip = XInternAtom(d, "CLIPBOARD", False), targets = XInternAtom(d, "TARGETS", False), png_t = XInternAtom(d, "image/png", False);
    XSetSelectionOwner(d, clip, w, CurrentTime);
    if (XGetSelectionOwner(d, clip) != w) _exit(1);
    alarm(3600);
    for (;;) {
        XEvent ev; XNextEvent(d, &ev);
        if (ev.type == SelectionClear) _exit(0);
        if (ev.type != SelectionRequest) continue;
        XSelectionRequestEvent *rq = &ev.xselectionrequest;
        XSelectionEvent se = { .type = SelectionNotify, .requestor = rq->requestor, .selection = rq->selection, .target = rq->target,
                               .property = None, .time = rq->time };
        Atom prop = rq->property ? rq->property : rq->target;
        if (rq->target == targets) {
            Atom t[2] = { targets, png_t };
            XChangeProperty(d, rq->requestor, prop, XA_ATOM, 32, PropModeReplace, (unsigned char *)t, 2);
            se.property = prop;
        } else if (rq->target == png_t) {
            XChangeProperty(d, rq->requestor, prop, png_t, 8, PropModeReplace, png->data, (int)png->len);
            se.property = prop;
        }
        XSendEvent(d, rq->requestor, False, NoEventMask, (XEvent *)&se);
        XFlush(d);
    }
}

static gboolean take(const char *mode, gboolean clipboard)
{
    Rect r = { 0, 0, SW, SH };
    gboolean pointer = conf.pointer;
    if (!strcmp(mode, "area")) { if (!select_area(&r)) return FALSE; pointer = FALSE; }
    else if (!strcmp(mode, "window")) { if (!pick_window(&r)) return FALSE; }
    g_usleep(150000);           /* the outline and the bar leave the screen */
    cairo_surface_t *s = grab_screen(r, pointer);
    if (!s) { notify(T("The screenshot could not be taken"), NULL, NULL); return FALSE; }
    gboolean ok;
    if (clipboard) {
        GByteArray *png = g_byte_array_new();
        ok = cairo_surface_write_to_png_stream(s, to_bytes, png) == CAIRO_STATUS_SUCCESS;
        if (ok) serve_clipboard(png);
    } else {
        char *path = new_file("Screenshot {}", "png");
        ok = cairo_surface_write_to_png(s, path) == CAIRO_STATUS_SUCCESS;
        if (!ok) notify(T("The screenshot could not be taken"), NULL, NULL);
        g_free(path);
    }
    cairo_surface_destroy(s);
    if (ok) shutter();
    return ok;
}

/* ---------------------------------------------------------------- recording (GStreamer) */
static GstElement *rec_pipe;
static GMainLoop *rec_loop;
static gboolean rec_stopping;
static gint64 rec_start;
static Window pill;

static int recording_pid(void)
{
    char *p = pid_path(), *s = NULL;
    int pid = 0;
    if (g_file_get_contents(p, &s, NULL, NULL)) pid = atoi(s);
    g_free(s); g_free(p);
    return pid > 0 && kill(pid, 0) == 0 ? pid : 0;
}

static gboolean stop_recording(void)
{
    int pid = recording_pid();
    if (pid) kill(pid, SIGINT);
    return pid != 0;
}

static void rec_stop(void)
{
    if (rec_stopping || !rec_pipe) return;
    rec_stopping = TRUE;
    gst_element_send_event(rec_pipe, gst_event_new_eos());     /* finishes the file properly */
}

static gboolean on_signal(gpointer d) { (void)d; rec_stop(); return G_SOURCE_CONTINUE; }

static gboolean on_bus(GstBus *bus, GstMessage *m, gpointer data)
{
    (void)bus; (void)data;
    if (GST_MESSAGE_TYPE(m) == GST_MESSAGE_EOS) g_main_loop_quit(rec_loop);
    else if (GST_MESSAGE_TYPE(m) == GST_MESSAGE_ERROR) {
        GError *e; gst_message_parse_error(m, &e, NULL);
        fprintf(stderr, "palos-screenshot: %s\n", e->message);
        notify(T("The recording could not be made"), e->message, NULL);
        g_error_free(e);
        g_main_loop_quit(rec_loop);
    }
    return TRUE;
}

static void draw_pill(void)
{
    int w = 132, h = 34;
    cairo_surface_t *s = win_surface(pill, w, h, TRUE);
    cairo_t *cr = cairo_create(s);
    cairo_set_operator(cr, CAIRO_OPERATOR_SOURCE);
    cairo_set_source_rgba(cr, 0, 0, 0, 0); cairo_paint(cr);
    cairo_set_operator(cr, CAIRO_OPERATOR_OVER);
    rrect(cr, .5, .5, w - 1, h - 1, h / 2.0);
    cairo_set_source_rgba(cr, .15, .15, .16, .92); cairo_fill(cr);
    cairo_arc(cr, 18, h / 2.0, 5, 0, 2 * M_PI); cairo_set_source_rgb(cr, 1, .27, .23); cairo_fill(cr);
    int secs = (int)((g_get_monotonic_time() - rec_start) / 1000000);
    char t[16]; g_snprintf(t, sizeof t, "%d:%02d", secs / 60, secs % 60);
    cairo_set_source_rgb(cr, .95, .95, .95);
    label(cr, t, 32, h / 2.0, "Noto Sans Mono 10", FALSE, NULL);
    /* the stop button */
    cairo_arc(cr, w - 20, h / 2.0, 11, 0, 2 * M_PI); cairo_set_source_rgba(cr, 1, 1, 1, .16); cairo_fill(cr);
    cairo_rectangle(cr, w - 25, h / 2.0 - 5, 10, 10); cairo_set_source_rgb(cr, 1, 1, 1); cairo_fill(cr);
    cairo_destroy(cr); cairo_surface_destroy(s);
    XFlush(dpy);
}

static gboolean pill_tick(gpointer d) { (void)d; if (pill) draw_pill(); return G_SOURCE_CONTINUE; }

static gboolean pill_events(GIOChannel *ch, GIOCondition c, gpointer d)
{
    (void)ch; (void)c; (void)d;
    while (XPending(dpy)) {
        XEvent ev; XNextEvent(dpy, &ev);
        if (ev.type == Expose) draw_pill();
        else if (ev.type == ButtonRelease && ev.xbutton.x > 132 - 36) rec_stop();
    }
    return TRUE;
}

static char *pulse_monitor(void)
{
    char *out = NULL;
    g_spawn_command_line_sync("pactl get-default-sink", &out, NULL, NULL, NULL);
    char *r = out && *g_strstrip(out) ? g_strdup_printf("%s.monitor", out) : NULL;
    g_free(out);
    return r;
}

static gboolean record(gboolean area, const char *audio)
{
    if (recording_pid()) return stop_recording();
    Rect r = { 0, 0, SW, SH };
    if (area && !select_area(&r)) return FALSE;
    r.w -= r.w % 2; r.h -= r.h % 2;          /* H.264 needs even sizes */
    char *path = new_file("Screen Recording {}", "mp4");
    GString *d = g_string_new(NULL);
    g_string_append_printf(d, "ximagesrc use-damage=false show-pointer=%s startx=%d starty=%d endx=%d endy=%d "
                              "! video/x-raw,framerate=30/1 ! queue ! videoconvert ! video/x-raw,format=I420 "
                              "! openh264enc complexity=low bitrate=8000000 ! h264parse ! queue ! mux. ",
                           conf.pointer ? "true" : "false", r.x, r.y, r.x + r.w - 1, r.y + r.h - 1);
    gboolean mic = !strcmp(audio, "mic") || !strcmp(audio, "both"), sys = !strcmp(audio, "system") || !strcmp(audio, "both");
    char *mon = sys ? pulse_monitor() : NULL;
    if (mic || sys) {
        g_string_append(d, "audiomixer name=mix ! audioconvert ! audioresample ! voaacenc bitrate=160000 ! aacparse ! queue ! mux. ");
        if (mic) g_string_append(d, "pulsesrc ! audioconvert ! audioresample ! queue ! mix. ");
        if (sys) g_string_append_printf(d, "pulsesrc device=\"%s\" ! audioconvert ! audioresample ! queue ! mix. ", mon ? mon : "@DEFAULT_MONITOR@");
    }
    g_string_append(d, "mp4mux name=mux faststart=true ! filesink name=out");
    GError *err = NULL;
    rec_pipe = gst_parse_launch(d->str, &err);
    g_string_free(d, TRUE); g_free(mon);
    if (!rec_pipe) { notify(T("The recording could not be made"), err ? err->message : NULL, NULL); g_free(path); return FALSE; }
    GstElement *sink = gst_bin_get_by_name(GST_BIN(rec_pipe), "out");
    g_object_set(sink, "location", path, NULL);
    gst_object_unref(sink);
    char *pp = pid_path(), *dir = g_path_get_dirname(pp), *me = g_strdup_printf("%d", getpid());
    g_mkdir_with_parents(dir, 0700);
    g_file_set_contents(pp, me, -1, NULL);
    rec_loop = g_main_loop_new(NULL, FALSE);
    GstBus *bus = gst_element_get_bus(rec_pipe);
    gst_bus_add_watch(bus, on_bus, NULL);
    g_unix_signal_add(SIGINT, on_signal, NULL);
    g_unix_signal_add(SIGTERM, on_signal, NULL);
    /* the little red pill at the top of the screen, with Stop */
    pill = make_window((SW - 132) / 2, 30, 132, 34, True, TRUE, ExposureMask | ButtonReleaseMask);
    XMapRaised(dpy, pill);
    GIOChannel *xch = g_io_channel_unix_new(ConnectionNumber(dpy));
    g_io_add_watch(xch, G_IO_IN, pill_events, NULL);
    g_timeout_add(500, pill_tick, NULL);
    rec_start = g_get_monotonic_time();
    gst_element_set_state(rec_pipe, GST_STATE_PLAYING);
    g_main_loop_run(rec_loop);
    gst_element_set_state(rec_pipe, GST_STATE_NULL);
    XDestroyWindow(dpy, pill); pill = 0; XFlush(dpy);
    unlink(pp);
    struct stat st;
    gboolean ok = stat(path, &st) == 0 && st.st_size > 0;
    if (ok) { char *base = g_path_get_basename(path); notify(T("Screen recording saved"), base, "video-x-generic"); g_free(base); }
    else unlink(path);
    g_free(pp); g_free(dir); g_free(me); g_free(path);
    return ok;
}

/* ---------------------------------------------------------------- the bar */
static const char *MODES[5][2] = { { "screen", "Capture Entire Screen" }, { "window", "Capture Selected Window" },
                                   { "area", "Capture Selected Portion" }, { "rec-screen", "Record Entire Screen" },
                                   { "rec-area", "Record Selected Portion" } };
typedef struct { int x, w; } Slot;

static int bar_w, bar_h = 52, menu_open, hover = -1;
static char mode[16] = "screen";
static Slot slots[9];         /* 0 close, 1-5 modes, 6 options, 7 capture */

static void layout_bar(void)
{
    int x = 8;
    slots[0] = (Slot){ x, 34 }; x += 34 + 12;
    for (int i = 0; i < 5; i++) { slots[1 + i] = (Slot){ x, 44 }; x += 44 + 2; if (i == 2) x += 12; }
    x += 12;
    char *opt = g_strdup_printf("%s ▾", T("Options"));
    int ow = text_width(opt, "Noto Sans 10") + 20; g_free(opt);
    slots[6] = (Slot){ x, ow }; x += ow + 6;
    int cw = text_width(!strncmp(mode, "rec", 3) ? T("Record") : T("Capture"), "Noto Sans Bold 10") + 30;
    slots[7] = (Slot){ x, cw }; x += cw + 8;
    bar_w = x;
}

static void draw_bar(Window w)
{
    cairo_surface_t *s = win_surface(w, bar_w, bar_h, TRUE);
    cairo_t *cr = cairo_create(s);
    cairo_set_operator(cr, CAIRO_OPERATOR_SOURCE);
    cairo_set_source_rgba(cr, 0, 0, 0, 0); cairo_paint(cr);
    cairo_set_operator(cr, CAIRO_OPERATOR_OVER);
    rrect(cr, .5, .5, bar_w - 1, bar_h - 1, 12);
    cairo_set_source_rgba(cr, .149 * .9, .149 * .9, .157 * .9, .9); cairo_fill_preserve(cr);
    cairo_set_source_rgba(cr, 1, 1, 1, .14); cairo_set_line_width(cr, 1); cairo_stroke(cr);
    double cy = bar_h / 2.0;
    for (int i = 0; i < 8; i++) {
        Slot sl = slots[i];
        gboolean on = i >= 1 && i <= 5 && !strcmp(mode, MODES[i - 1][0]);
        if (on || hover == i || i == 7) {
            rrect(cr, sl.x, 8, sl.w, bar_h - 16, 7);
            cairo_set_source_rgba(cr, on ? .35 : 1, on ? .59 : 1, on ? .94 : 1, on ? .55 : i == 7 ? (hover == i ? .26 : .16) : .12);
            cairo_fill(cr);
        }
        if (i == 0) {
            cairo_set_source_rgba(cr, 1, 1, 1, .95); cairo_set_line_width(cr, 1.8);
            double x = sl.x + sl.w / 2.0;
            cairo_move_to(cr, x - 5, cy - 5); cairo_line_to(cr, x + 5, cy + 5); cairo_move_to(cr, x + 5, cy - 5); cairo_line_to(cr, x - 5, cy + 5);
            cairo_stroke(cr);
        } else if (i <= 5) glyph(cr, MODES[i - 1][0], sl.x + sl.w / 2.0, cy);
        else if (i == 6) { char *o = g_strdup_printf("%s ▾", T("Options")); cairo_set_source_rgb(cr, .95, .95, .95); label(cr, o, sl.x + sl.w / 2.0, cy, "Noto Sans 10", TRUE, NULL); g_free(o); }
        else { cairo_set_source_rgb(cr, 1, 1, 1); label(cr, !strncmp(mode, "rec", 3) ? T("Record") : T("Capture"), sl.x + sl.w / 2.0, cy, "Noto Sans Bold 10", TRUE, NULL); }
    }
    /* separators */
    cairo_set_source_rgba(cr, 1, 1, 1, .22);
    int seps[3] = { slots[1].x - 6, slots[4].x - 7, slots[6].x - 7 };
    for (int i = 0; i < 3; i++) { cairo_rectangle(cr, seps[i], 12, 1, bar_h - 24); cairo_fill(cr); }
    /* what the hovered button does */
    cairo_destroy(cr); cairo_surface_destroy(s);
    XFlush(dpy);
}

/* the Options menu: Timer, Sound (recordings), Show Mouse Pointer */
typedef struct { const char *text; int kind, value; const char *audio; } Item;     /* kind 0 heading, 1 timer, 2 audio, 3 pointer, 4 note, 5 line */
static Item items[] = {
    { "Timer", 0, 0, NULL }, { "None", 1, 0, NULL }, { "5 Seconds", 1, 5, NULL }, { "10 Seconds", 1, 10, NULL }, { "", 5, 0, NULL },
    { "Sound", 0, 0, NULL }, { "No Sound", 2, 0, "none" }, { "Microphone", 2, 0, "mic" }, { "Computer Sound", 2, 0, "system" },
    { "Microphone and Computer Sound", 2, 0, "both" }, { "", 5, 0, NULL }, { "Show Mouse Pointer", 3, 0, NULL }, { "", 5, 0, NULL },
    { "Saves to the Desktop", 4, 0, NULL },
};
#define NITEMS ((int)G_N_ELEMENTS(items))
static int menu_w, menu_h, menu_hover = -1;

static int item_h(Item *it) { return it->kind == 5 ? 9 : 24; }

static void layout_menu(void)
{
    menu_w = 0; menu_h = 8;
    for (int i = 0; i < NITEMS; i++) {
        int w = text_width(T(items[i].text), "Noto Sans 10") + 44;
        if (w > menu_w) menu_w = w;
        menu_h += item_h(&items[i]);
    }
    menu_h += 8;
}

static gboolean item_checked(Item *it)
{
    if (it->kind == 1) return conf.timer == it->value;
    if (it->kind == 2) return !strcmp(conf.audio, it->audio);
    if (it->kind == 3) return conf.pointer;
    return FALSE;
}

static void draw_menu(Window w)
{
    cairo_surface_t *s = win_surface(w, menu_w, menu_h, TRUE);
    cairo_t *cr = cairo_create(s);
    cairo_set_operator(cr, CAIRO_OPERATOR_SOURCE);
    cairo_set_source_rgba(cr, 0, 0, 0, 0); cairo_paint(cr);
    cairo_set_operator(cr, CAIRO_OPERATOR_OVER);
    rrect(cr, .5, .5, menu_w - 1, menu_h - 1, 9);
    cairo_set_source_rgba(cr, .16 * .95, .16 * .95, .17 * .95, .95); cairo_fill_preserve(cr);
    cairo_set_source_rgba(cr, 1, 1, 1, .14); cairo_stroke(cr);
    int y = 8;
    for (int i = 0; i < NITEMS; i++) {
        Item *it = &items[i];
        int h = item_h(it);
        if (it->kind == 5) { cairo_set_source_rgba(cr, 1, 1, 1, .16); cairo_rectangle(cr, 10, y + 4, menu_w - 20, 1); cairo_fill(cr); y += h; continue; }
        gboolean live = it->kind >= 1 && it->kind <= 3;
        if (live && menu_hover == i) { rrect(cr, 5, y, menu_w - 10, h, 5); cairo_set_source_rgba(cr, .25, .52, .96, .9); cairo_fill(cr); }
        double a = live ? .95 : .5;
        cairo_set_source_rgba(cr, 1, 1, 1, a);
        if (item_checked(it)) label(cr, "✓", 12, y + h / 2.0, "Noto Sans 10", FALSE, NULL);
        label(cr, T(it->text), it->kind == 0 || it->kind == 4 ? 14 : 30, y + h / 2.0, it->kind == 0 ? "Noto Sans Bold 9" : "Noto Sans 10", FALSE, NULL);
        y += h;
    }
    cairo_destroy(cr); cairo_surface_destroy(s);
    XFlush(dpy);
}

static int menu_item_at(int y)
{
    int yy = 8;
    for (int i = 0; i < NITEMS; i++) { int h = item_h(&items[i]); if (y >= yy && y < yy + h) return items[i].kind >= 1 && items[i].kind <= 3 ? i : -1; yy += h; }
    return -1;
}

/* returns the chosen mode, or NULL (closed) */
static const char *run_bar(void)
{
    if (strlen(mode) == 0) g_strlcpy(mode, "screen", sizeof mode);
    layout_bar(); layout_menu();
    int bx = (SW - bar_w) / 2, by = SH - bar_h - 110;
    Window bar = make_window(bx, by, bar_w, bar_h, True, TRUE, ExposureMask | ButtonPressMask | ButtonReleaseMask | PointerMotionMask | LeaveWindowMask | KeyPressMask);
    Window menu = make_window(0, 0, menu_w, menu_h, True, TRUE, ExposureMask | ButtonReleaseMask | PointerMotionMask | LeaveWindowMask);
    XMapRaised(dpy, bar); XSync(dpy, False);
    for (int i = 0; i < 50 && XGrabKeyboard(dpy, bar, True, GrabModeAsync, GrabModeAsync, CurrentTime) != GrabSuccess; i++) g_usleep(20000);
    const char *result = NULL;
    gboolean done = FALSE;
    while (!done) {
        XEvent ev; XNextEvent(dpy, &ev);
        if (ev.xany.window == menu) {
            if (ev.type == Expose) draw_menu(menu);
            else if (ev.type == MotionNotify) { int h = menu_item_at(ev.xmotion.y); if (h != menu_hover) { menu_hover = h; draw_menu(menu); } }
            else if (ev.type == LeaveNotify) { menu_hover = -1; draw_menu(menu); }
            else if (ev.type == ButtonRelease) {
                int i = menu_item_at(ev.xbutton.y);
                if (i >= 0) {
                    Item *it = &items[i];
                    if (it->kind == 1) conf.timer = it->value;
                    else if (it->kind == 2) g_strlcpy(conf.audio, it->audio, sizeof conf.audio);
                    else if (it->kind == 3) conf.pointer = !conf.pointer;
                    save_conf();
                }
                XUnmapWindow(dpy, menu); menu_open = 0;
            }
            continue;
        }
        switch (ev.type) {
        case Expose: draw_bar(bar); break;
        case KeyPress: {
            KeySym k = XLookupKeysym(&ev.xkey, 0);
            if (k == XK_Escape) done = TRUE;
            else if (k == XK_Return || k == XK_KP_Enter) { result = mode; done = TRUE; }
            break;
        }
        case MotionNotify: {
            int h = -1;
            for (int i = 0; i < 8; i++) if (ev.xmotion.x >= slots[i].x && ev.xmotion.x < slots[i].x + slots[i].w) h = i;
            if (h != hover) { hover = h; draw_bar(bar); }
            break;
        }
        case LeaveNotify: hover = -1; draw_bar(bar); break;
        case ButtonPress:
            if (menu_open) { XUnmapWindow(dpy, menu); menu_open = 0; }
            break;
        case ButtonRelease:
            if (hover == 0) done = TRUE;
            else if (hover >= 1 && hover <= 5) {
                g_strlcpy(mode, MODES[hover - 1][0], sizeof mode);
                /* one click is enough for a portion or a window: choosing is the capture */
                if (!strcmp(mode, "window") || !strcmp(mode, "area") || !strcmp(mode, "rec-area")) { result = mode; done = TRUE; }
                layout_bar();
                XResizeWindow(dpy, bar, bar_w, bar_h);
                draw_bar(bar);
            } else if (hover == 6) {
                if (menu_open) { XUnmapWindow(dpy, menu); menu_open = 0; }
                else { XMoveWindow(dpy, menu, bx + slots[6].x, by - menu_h - 6); XMapRaised(dpy, menu); menu_open = 1; }
            } else if (hover == 7) { result = mode; done = TRUE; }
            break;
        }
    }
    XUngrabKeyboard(dpy, CurrentTime);
    XDestroyWindow(dpy, menu); XDestroyWindow(dpy, bar); XSync(dpy, False);
    return result;
}

static void countdown(int secs)
{
    if (secs <= 0) return;
    char n[8]; g_snprintf(n, sizeof n, "%d", secs);
    char *t = Tf("Taking the screenshot in {} seconds", n);
    notify(t, NULL, NULL);
    g_free(t);
    sleep(secs);
}

int main(int argc, char **argv)
{
    gst_init(&argc, &argv);
    if (argc > 1 && (!strcmp(argv[1], "-h") || !strcmp(argv[1], "--help"))) {
        puts("palos-screenshot [screen|window|area [--clipboard] | record [--area] [--audio none|mic|system|both] | stop]");
        return 0;
    }
    if (argc > 1 && !strcmp(argv[1], "stop")) return stop_recording() ? 0 : 1;
    if (!(dpy = XOpenDisplay(NULL))) { fputs("palos-screenshot: no display\n", stderr); return 1; }
    scr = DefaultScreen(dpy); root = RootWindow(dpy, scr); SW = DisplayWidth(dpy, scr); SH = DisplayHeight(dpy, scr);
    XVisualInfo vi;
    if (XMatchVisualInfo(dpy, scr, 32, TrueColor, &vi)) { argb = vi.visual; argb_cmap = XCreateColormap(dpy, root, argb, AllocNone); }
    load_conf();
    if (argc == 1) {
        if (stop_recording()) return 0;          /* Print Screen during a recording stops it */
        const char *m = run_bar();
        if (!m) return 0;
        g_usleep(250000);
        if (!strncmp(m, "rec", 3)) { countdown(conf.timer); return record(!strcmp(m, "rec-area"), conf.audio) ? 0 : 1; }
        if (!strcmp(m, "screen")) countdown(conf.timer);
        return take(m, FALSE) ? 0 : 1;
    }
    if (!strcmp(argv[1], "record")) {
        const char *audio = conf.audio;
        gboolean area = FALSE;
        for (int i = 2; i < argc; i++) {
            if (!strcmp(argv[i], "--area")) area = TRUE;
            else if (!strcmp(argv[i], "--audio") && i + 1 < argc) audio = argv[++i];
        }
        return record(area, audio) ? 0 : 1;
    }
    if (!strcmp(argv[1], "screen") || !strcmp(argv[1], "window") || !strcmp(argv[1], "area")) {
        gboolean clip = argc > 2 && !strcmp(argv[2], "--clipboard");
        return take(argv[1], clip) ? 0 : 1;
    }
    return 2;
}

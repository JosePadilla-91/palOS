/* palOS Basic Setup: creates the first account when the full setup screen can't run on this computer.

   The last step of run-setup. It needs only X, Cairo and Pango (no app runtime, no graphics card) and talks
   to the same root helper as the full setup screen (/run/palos-firstboot/helper.sock, one JSON line each
   way). Wi-Fi, the picture and light or dark can be set later in Settings. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>
#include <errno.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <glib.h>
#include <json-glib/json-glib.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/keysym.h>
#include <X11/Xcursor/Xcursor.h>
#include <cairo/cairo.h>
#include <cairo/cairo-xlib.h>
#include <pango/pangocairo.h>
#include "../libpalos/l10n.h"

#define SOCK "/run/palos-firstboot/helper.sock"
#define FLAG "/var/lib/palos/firstboot"
#define CARD_W 520

static Display *dpy;
static int scr, SW, SH;
static Window win;
static XIC xic;
static cairo_surface_t *logo;

enum { F_FULL, F_USER, F_PW, F_PW2, NF };
static const char *LABELS[NF] = { "Full name", "Account name", "Password", "Verify password" };
static GString *field[NF];
static int focus = F_FULL;
static gboolean user_edited, done, busy, hover_go;
static char *error, *go_label;
typedef struct { int x, y, w, h; } Box;
static Box fbox[NF], gobox;

/* ---------------------------------------------------------------- the root helper */
static JsonObject *helper(const char *action, JsonBuilder *extra)
{
    JsonBuilder *b = extra ? extra : json_builder_new();
    if (!extra) json_builder_begin_object(b);
    json_builder_set_member_name(b, "action"); json_builder_add_string_value(b, action);
    json_builder_end_object(b);
    JsonGenerator *g = json_generator_new();
    JsonNode *root = json_builder_get_root(b);
    json_generator_set_root(g, root);
    char *msg = json_generator_to_data(g, NULL);
    json_node_unref(root); g_object_unref(g); g_object_unref(b);

    JsonObject *res = NULL;
    char *why = NULL;
    int s = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
    struct sockaddr_un a = { .sun_family = AF_UNIX };
    g_strlcpy(a.sun_path, SOCK, sizeof a.sun_path);
    struct timeval tv = { 120, 0 };
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof tv);
    if (s < 0 || connect(s, (struct sockaddr *)&a, sizeof a) < 0) why = g_strdup(g_strerror(errno));
    else {
        GString *out = g_string_new(msg); g_string_append_c(out, '\n');
        gsize off = 0;
        while (off < out->len) { ssize_t w = write(s, out->str + off, out->len - off); if (w <= 0) break; off += w; }
        g_string_free(out, TRUE);
        GString *in = g_string_new(NULL);
        char buf[65536]; ssize_t n;
        while ((n = read(s, buf, sizeof buf)) > 0) g_string_append_len(in, buf, n);
        JsonParser *p = json_parser_new();
        if (in->len && json_parser_load_from_data(p, in->str, in->len, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(p)))
            res = json_object_ref(json_node_get_object(json_parser_get_root(p)));
        else if (!in->len) res = json_object_new();
        else why = g_strdup("bad answer");
        g_object_unref(p);
        g_string_free(in, TRUE);
    }
    if (s >= 0) close(s);
    g_free(msg);
    if (!res) {
        res = json_object_new();
        json_object_set_boolean_member(res, "ok", FALSE);
        char *e = Tf("Setup’s helper isn’t answering ({}). Restart the computer and try again.", why ? why : "?");
        json_object_set_string_member(res, "error", e);
        g_free(e);
    }
    g_free(why);
    return res;
}

static gboolean res_ok(JsonObject *r) { return json_object_get_boolean_member_with_default(r, "ok", FALSE); }
static const char *res_str(JsonObject *r, const char *k) { return json_object_has_member(r, k) && JSON_NODE_HOLDS_VALUE(json_object_get_member(r, k)) ? json_object_get_string_member(r, k) : NULL; }

/* ---------------------------------------------------------------- drawing */
static PangoLayout *text(cairo_t *cr, const char *s, const char *font, int width, PangoAlignment al)
{
    PangoLayout *l = pango_cairo_create_layout(cr);
    PangoFontDescription *f = pango_font_description_from_string(font);
    pango_layout_set_font_description(l, f); pango_font_description_free(f);
    pango_layout_set_text(l, s ? s : "", -1);
    if (width > 0) { pango_layout_set_width(l, width * PANGO_SCALE); pango_layout_set_wrap(l, PANGO_WRAP_WORD_CHAR); }
    pango_layout_set_alignment(l, al);
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

static void rgb(cairo_t *cr, unsigned c) { cairo_set_source_rgb(cr, ((c >> 16) & 255) / 255.0, ((c >> 8) & 255) / 255.0, (c & 255) / 255.0); }

/* lays out (and with draw, paints) the card; returns its height */
static int card(cairo_t *cr, int cx, int cy, gboolean paint)
{
    int pad = 40, w = CARD_W - 2 * pad, y = cy + 34, lw, lh;
    PangoLayout *l = text(cr, T("Create Your Account"), "Noto Sans SemiBold 22", w, PANGO_ALIGN_CENTER);
    pango_layout_get_pixel_size(l, &lw, &lh);
    if (paint) { rgb(cr, 0x1b1e22); cairo_move_to(cr, cx + pad, y); pango_cairo_show_layout(cr, l); }
    y += lh + 6; g_object_unref(l);
    l = text(cr, T("You’ll use this account to log in to palOS.\nWi-Fi, your picture and Dark Mode can be set later in Settings."), "Noto Sans 11", w, PANGO_ALIGN_CENTER);
    pango_layout_get_pixel_size(l, &lw, &lh);
    if (paint) { rgb(cr, 0x5b6470); cairo_move_to(cr, cx + pad, y); pango_cairo_show_layout(cr, l); }
    y += lh + 14; g_object_unref(l);
    for (int i = 0; i < NF; i++) {
        y += 8;
        l = text(cr, T(LABELS[i]), "Noto Sans 10", w, PANGO_ALIGN_LEFT);
        pango_layout_get_pixel_size(l, &lw, &lh);
        if (paint) { rgb(cr, 0x3a4048); cairo_move_to(cr, cx + pad, y); pango_cairo_show_layout(cr, l); }
        y += lh + 6; g_object_unref(l);
        fbox[i] = (Box){ cx + pad, y, w, 34 };
        if (paint) {
            gboolean f = focus == i && !done;
            if (f) { rrect(cr, cx + pad - 3, y - 3, w + 6, 40, 10); cairo_set_source_rgba(cr, 76 / 255.0, 98 / 255.0, 120 / 255.0, .35); cairo_fill(cr); }
            rrect(cr, cx + pad + .5, y + .5, w - 1, 33, 8);
            rgb(cr, done ? 0xeceef0 : 0xffffff); cairo_fill_preserve(cr);
            rgb(cr, f ? 0x4c6278 : 0xb9bfc7); cairo_set_line_width(cr, 1); cairo_stroke(cr);
            /* what's typed (dots for a password) */
            GString *shown = g_string_new(NULL);
            if (i >= F_PW) { glong n = g_utf8_strlen(field[i]->str, -1); for (glong k = 0; k < n; k++) g_string_append(shown, "●"); }
            else g_string_assign(shown, field[i]->str);
            PangoLayout *t = text(cr, shown->str, "Noto Sans 11", 0, PANGO_ALIGN_LEFT);
            int tw, th; pango_layout_get_pixel_size(t, &tw, &th);
            double sx = MIN(0, w - 24 - tw);
            cairo_save(cr); cairo_rectangle(cr, cx + pad + 4, y, w - 8, 34); cairo_clip(cr);
            rgb(cr, 0x1b1e22); cairo_move_to(cr, cx + pad + 10 + sx, y + (34 - th) / 2.0); pango_cairo_show_layout(cr, t);
            if (f) { cairo_rectangle(cr, cx + pad + 11 + sx + tw, y + 9, 1.5, 16); cairo_fill(cr); }
            cairo_restore(cr);
            g_object_unref(t); g_string_free(shown, TRUE);
        }
        y += 34;
        if (i == F_USER) {
            y += 4;
            l = text(cr, T("Lowercase letters and numbers. It’s also the name of your home folder."), "Noto Sans 9", w, PANGO_ALIGN_LEFT);
            pango_layout_get_pixel_size(l, &lw, &lh);
            if (paint) { rgb(cr, 0x7b8490); cairo_move_to(cr, cx + pad, y); pango_cairo_show_layout(cr, l); }
            y += lh; g_object_unref(l);
        }
    }
    y += 8;
    if (error && *error) {
        l = text(cr, error, "Noto Sans 10", w, PANGO_ALIGN_CENTER);
        pango_layout_get_pixel_size(l, &lw, &lh);
        if (paint) { rgb(cr, 0xa33a3a); cairo_move_to(cr, cx + pad, y); pango_cairo_show_layout(cr, l); }
        y += lh; g_object_unref(l);
    }
    y += 12;
    l = text(cr, go_label, "Noto Sans Bold 10.5", 0, PANGO_ALIGN_LEFT);
    pango_layout_get_pixel_size(l, &lw, &lh);
    int bw = lw + 52;
    gobox = (Box){ cx + CARD_W - pad - bw, y, bw, 36 };
    if (paint) {
        rrect(cr, gobox.x, gobox.y, gobox.w, gobox.h, 8);
        rgb(cr, busy || done ? 0x9aa6b2 : hover_go ? 0x3d5164 : 0x4c6278); cairo_fill(cr);
        rgb(cr, busy || done ? 0xeef0f2 : 0xffffff);
        cairo_move_to(cr, gobox.x + 26, gobox.y + (36 - lh) / 2.0); pango_cairo_show_layout(cr, l);
    }
    g_object_unref(l);
    y += 36 + 28;
    return y - cy;
}

static void draw(void)
{
    cairo_surface_t *ws = cairo_xlib_surface_create(dpy, win, DefaultVisual(dpy, scr), SW, SH);
    cairo_surface_t *s = cairo_surface_create_similar(ws, CAIRO_CONTENT_COLOR, SW, SH);
    cairo_t *cr = cairo_create(s);
    /* the background: linear-gradient(160deg, #2e4258, #16222f) */
    cairo_pattern_t *g = cairo_pattern_create_linear(SW * .33, 0, SW * .67, SH);
    cairo_pattern_add_color_stop_rgb(g, 0, 0x2e / 255.0, 0x42 / 255.0, 0x58 / 255.0);
    cairo_pattern_add_color_stop_rgb(g, 1, 0x16 / 255.0, 0x22 / 255.0, 0x2f / 255.0);
    cairo_set_source(cr, g); cairo_paint(cr); cairo_pattern_destroy(g);

    int ch = card(cr, 0, 0, FALSE), lh = logo ? 112 + 22 : 0;
    int top = MAX(10, (SH - ch - lh) / 2), cx = (SW - CARD_W) / 2;
    if (logo) {
        double k = 112.0 / MAX(cairo_image_surface_get_width(logo), cairo_image_surface_get_height(logo));
        cairo_save(cr); cairo_translate(cr, (SW - 112) / 2.0, top); cairo_scale(cr, k, k);
        cairo_set_source_surface(cr, logo, 0, 0); cairo_pattern_set_filter(cairo_get_source(cr), CAIRO_FILTER_GOOD);
        cairo_paint(cr); cairo_restore(cr);
    }
    int cy = top + lh;
    rrect(cr, cx, cy, CARD_W, ch, 18); rgb(cr, 0xf4f6f8); cairo_fill(cr);
    card(cr, cx, cy, TRUE);
    cairo_destroy(cr);
    cairo_t *wc = cairo_create(ws); cairo_set_source_surface(wc, s, 0, 0); cairo_paint(wc); cairo_destroy(wc);
    cairo_surface_destroy(s); cairo_surface_destroy(ws);
    XFlush(dpy);
}

/* ---------------------------------------------------------------- doing it */
static void set_error(const char *e, int f) { g_free(error); error = g_strdup(e); if (f >= 0) focus = f; draw(); }
static void set_go(const char *label) { g_free(go_label); go_label = g_strdup(label); }

static void suggest(void)
{
    const char *s = field[F_FULL]->str;
    while (*s == ' ') s++;
    GString *u = g_string_new(NULL);
    for (; *s && *s != ' ' && u->len < 32; s++) {
        char c = g_ascii_tolower(*s);
        if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-') g_string_append_c(u, c);
    }
    if (u->len && !g_ascii_isalpha(u->str[0])) { g_string_prepend_c(u, 'u'); g_string_truncate(u, 32); }
    g_string_assign(field[F_USER], u->str);
    g_string_free(u, TRUE);
}

static gboolean valid_user(const char *u)
{
    if (!g_ascii_islower(u[0]) || strlen(u) > 32) return FALSE;
    for (const char *c = u; *c; c++) if (!(g_ascii_islower(*c) || g_ascii_isdigit(*c) || *c == '_' || *c == '-')) return FALSE;
    return TRUE;
}

static void finish(void)
{
    done = TRUE; busy = FALSE;
    set_go(T("Starting palOS…"));
    draw();
    JsonObject *r = helper("finish", NULL);
    if (!res_ok(r)) set_error(res_str(r, "error") ? res_str(r, "error") : T("Setup couldn’t finish. Restart the computer to log in."), -1);
    json_object_unref(r);
    /* the helper switches to the login screen; if it doesn't, this window goes after a while */
}

static void create(void)
{
    if (done || busy) return;
    char *full = g_strstrip(g_strdup(field[F_FULL]->str)), *user = g_strstrip(g_strdup(field[F_USER]->str));
    if (!*full) set_error(T("Enter your name."), F_FULL);
    else if (!valid_user(user)) set_error(T("Use lowercase letters, numbers, - and _ for the account name, starting with a letter."), F_USER);
    else if (!field[F_PW]->len) set_error(T("Choose a password."), F_PW);
    else if (strcmp(field[F_PW]->str, field[F_PW2]->str)) set_error(T("The passwords don’t match."), F_PW2);
    else {
        JsonBuilder *b = json_builder_new(); json_builder_begin_object(b);
        json_builder_set_member_name(b, "username"); json_builder_add_string_value(b, user);
        JsonObject *r = helper("check-user", b);
        if (!res_ok(r)) set_error(res_str(r, "error") ? res_str(r, "error") : T("That account name can’t be used."), F_USER);
        else {
            g_free(error); error = NULL;
            busy = TRUE; set_go(T("Creating…")); draw();
            b = json_builder_new(); json_builder_begin_object(b);
            json_builder_set_member_name(b, "fullname"); json_builder_add_string_value(b, full);
            json_builder_set_member_name(b, "username"); json_builder_add_string_value(b, user);
            json_builder_set_member_name(b, "password"); json_builder_add_string_value(b, field[F_PW]->str);
            json_builder_set_member_name(b, "dark"); json_builder_add_boolean_value(b, FALSE);
            JsonObject *c = helper("create-user", b);
            if (!res_ok(c)) { busy = FALSE; set_go(T("Create Account")); set_error(res_str(c, "error") ? res_str(c, "error") : T("The account couldn’t be created."), F_USER); }
            else finish();
            json_object_unref(c);
        }
        json_object_unref(r);
    }
    g_free(full); g_free(user);
}

static void check_helper(void)
{
    JsonObject *r = helper("status", NULL);
    if (!res_ok(r) && res_str(r, "error")) set_error(res_str(r, "error"), -1);
    else if (res_str(r, "user")) {
        /* the account was made before the setup screen stopped: only finishing is left */
        g_string_assign(field[F_FULL], res_str(r, "fullname") ? res_str(r, "fullname") : res_str(r, "user"));
        g_string_assign(field[F_USER], res_str(r, "user"));
        finish();
    }
    json_object_unref(r);
}

/* ---------------------------------------------------------------- input */
static void key(XKeyEvent *e)
{
    char buf[64] = ""; KeySym sym = NoSymbol; Status st;
    int n = xic ? Xutf8LookupString(xic, e, buf, sizeof buf - 1, &sym, &st) : XLookupString(e, buf, sizeof buf - 1, &sym, NULL);
    if (n < 0) n = 0;
    buf[n] = 0;
    if (done || busy) return;
    if (sym == XK_Return || sym == XK_KP_Enter) { create(); return; }
    if (sym == XK_Tab || sym == XK_ISO_Left_Tab) { focus = (focus + ((e->state & ShiftMask) || sym == XK_ISO_Left_Tab ? NF - 1 : 1)) % NF; draw(); return; }
    if (sym == XK_Up) { focus = (focus + NF - 1) % NF; draw(); return; }
    if (sym == XK_Down) { focus = (focus + 1) % NF; draw(); return; }
    GString *f = field[focus];
    if (sym == XK_BackSpace) {
        if (f->len) { const char *p = g_utf8_find_prev_char(f->str, f->str + f->len); g_string_truncate(f, p ? (gsize)(p - f->str) : 0); }
    } else if ((e->state & ControlMask) && (sym == XK_u || sym == XK_U)) g_string_truncate(f, 0);
    else if (n > 0 && !(e->state & ControlMask) && (unsigned char)buf[0] >= 0x20 && buf[0] != 0x7f && f->len < 256) g_string_append(f, buf);
    else return;
    if (focus == F_FULL && !user_edited) suggest();
    if (focus == F_USER) user_edited = TRUE;
    draw();
}

static gboolean inside(Box b, int x, int y) { return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }

int main(void)
{
    if (!g_file_test(FLAG, G_FILE_TEST_EXISTS)) return 0;
    if (!(dpy = XOpenDisplay(NULL))) { fputs("basic-setup: no display\n", stderr); return 1; }
    scr = DefaultScreen(dpy); SW = DisplayWidth(dpy, scr); SH = DisplayHeight(dpy, scr);
    for (int i = 0; i < NF; i++) field[i] = g_string_new(NULL);
    set_go(T("Create Account"));
    const char *logos[] = { "/usr/share/palos/palos-logo-white.png", "/usr/share/icons/hicolor/256x256/apps/palos-logo.png" };
    for (guint i = 0; i < G_N_ELEMENTS(logos) && !logo; i++) {
        cairo_surface_t *s = cairo_image_surface_create_from_png(logos[i]);
        if (cairo_surface_status(s) == CAIRO_STATUS_SUCCESS) logo = s; else cairo_surface_destroy(s);
    }
    XSetWindowAttributes sa = { .override_redirect = False, .background_pixel = BlackPixel(dpy, scr),
                                .event_mask = ExposureMask | KeyPressMask | ButtonPressMask | ButtonReleaseMask | PointerMotionMask | StructureNotifyMask };
    win = XCreateWindow(dpy, RootWindow(dpy, scr), 0, 0, SW, SH, 0, CopyFromParent, InputOutput, CopyFromParent, CWBackPixel | CWEventMask, &sa);
    XStoreName(dpy, win, "palOS Setup");
    XClassHint ch = { "palos-basic-setup", "Palos-basic-setup" };
    XSetClassHint(dpy, win, &ch);
    Atom st = XInternAtom(dpy, "_NET_WM_STATE", False), fs = XInternAtom(dpy, "_NET_WM_STATE_FULLSCREEN", False);
    XChangeProperty(dpy, win, st, XA_ATOM, 32, PropModeReplace, (unsigned char *)&fs, 1);
    /* no frame, and it can't be closed before it's done (no WM_DELETE_WINDOW) */
    struct { unsigned long flags, functions, decorations; long input_mode; unsigned long status; } mwm = { 2, 0, 0, 0, 0 };
    Atom motif = XInternAtom(dpy, "_MOTIF_WM_HINTS", False);
    XChangeProperty(dpy, win, motif, motif, 32, PropModeReplace, (unsigned char *)&mwm, 5);
    Cursor c = XcursorLibraryLoadCursor(dpy, "left_ptr");
    if (c) XDefineCursor(dpy, win, c);
    XIM xim = XOpenIM(dpy, NULL, NULL, NULL);
    if (xim) xic = XCreateIC(xim, XNInputStyle, XIMPreeditNothing | XIMStatusNothing, XNClientWindow, win, XNFocusWindow, win, NULL);
    if (xic) XSetICFocus(xic);
    XMapRaised(dpy, win);
    XFlush(dpy);
    gboolean checked = FALSE;
    gint64 quit_at = 0;
    for (;;) {
        if (done && !quit_at) quit_at = g_get_monotonic_time() + 20 * G_USEC_PER_SEC;
        if (quit_at && g_get_monotonic_time() > quit_at) return 0;
        if (!XPending(dpy)) { if (quit_at) { g_usleep(100000); continue; } }
        XEvent ev; XNextEvent(dpy, &ev);
        if (XFilterEvent(&ev, None)) continue;
        switch (ev.type) {
        case MapNotify:
            XSetInputFocus(dpy, win, RevertToParent, CurrentTime);
            if (!checked) { checked = TRUE; draw(); check_helper(); }
            break;
        case ConfigureNotify:
            if (ev.xconfigure.width != SW || ev.xconfigure.height != SH) { SW = ev.xconfigure.width; SH = ev.xconfigure.height; draw(); }
            break;
        case Expose: if (ev.xexpose.count == 0) draw(); break;
        case KeyPress: key(&ev.xkey); break;
        case MotionNotify: { gboolean h = inside(gobox, ev.xmotion.x, ev.xmotion.y); if (h != hover_go) { hover_go = h; draw(); } break; }
        case ButtonPress:
            XSetInputFocus(dpy, win, RevertToParent, CurrentTime);
            for (int i = 0; i < NF; i++) if (inside(fbox[i], ev.xbutton.x, ev.xbutton.y) && !done) { focus = i; draw(); }
            break;
        case ButtonRelease:
            if (ev.xbutton.button == 1 && inside(gobox, ev.xbutton.x, ev.xbutton.y)) create();
            break;
        }
    }
}

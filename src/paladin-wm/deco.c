/* paladin-wm: drawing frames (steel title bar, buttons, title, bevel) with Cairo and Pango. */
#include "pwm.h"
#include <stdio.h>
#include <string.h>
#include <cairo/cairo.h>
#include <cairo/cairo-xlib.h>
#include <pango/pangocairo.h>

#ifndef KIT_DIR
#define KIT_DIR "/usr/lib/paladium/assets"
#endif

static const char *btn_names[3] = { "close", "minimize", "maximize" };
static const char *state_names[4] = { "normal", "prelight", "pressed", "inactive" };
static cairo_surface_t *tb_img[2];              /* active, inactive (for the current light/dark) */
static cairo_surface_t *btn_img[3][4];
static PangoFontDescription *font;

static cairo_surface_t *load(const char *name, bool want_dark, bool hi)
{
    char path[512];
    const char *dot = strrchr(name, '.');
    int stem = dot ? (int)(dot - name) : (int)strlen(name);
    cairo_surface_t *s = NULL;
    /* most specific first: -dark@2, -dark, @2, plain */
    for (int pass = 0; pass < 4 && !s; pass++) {
        bool d = want_dark && pass < 2, h = hi && (pass == 0 || pass == 2);
        if ((pass < 2 && !want_dark) || ((pass == 0 || pass == 2) && !hi)) continue;
        snprintf(path, sizeof path, "%s/%.*s%s%s%s", KIT_DIR, stem, name, d ? "-dark" : "", h ? "@2" : "", dot ? dot : "");
        cairo_surface_t *t = cairo_image_surface_create_from_png(path);
        if (cairo_surface_status(t) == CAIRO_STATUS_SUCCESS) s = t;
        else cairo_surface_destroy(t);
    }
    return s;
}

void deco_reload(void)
{
    for (int i = 0; i < 2; i++) { if (tb_img[i]) cairo_surface_destroy(tb_img[i]); tb_img[i] = NULL; }
    for (int b = 0; b < 3; b++) for (int s = 0; s < 4; s++) {
        if (btn_img[b][s]) cairo_surface_destroy(btn_img[b][s]);
        btn_img[b][s] = NULL;
    }
    tb_img[0] = load("titlebar-active.png", dark, false);
    tb_img[1] = load("titlebar-inactive.png", dark, false);
    for (int b = 0; b < 3; b++) for (int s = 0; s < 4; s++) {
        char n[64]; snprintf(n, sizeof n, "%s-%s.png", btn_names[b], state_names[s]);
        btn_img[b][s] = load(n, dark, scale >= 1.5);
    }
}

void deco_init(void)
{
    font = pango_font_description_from_string("Noto Sans Bold");
    pango_font_description_set_absolute_size(font, 12.5 * scale * PANGO_SCALE);
    deco_reload();
}

/* the buttons, in frame coordinates */
static void button_rect(Client *c, int i, int *x, int *y)
{
    int m = margin(c);
    *x = m + (int)(8 * scale) + i * (BTN + (int)(6 * scale));
    *y = m + (TB - BTN) / 2;
}

int deco_button_at(Client *c, int fx, int fy)
{
    if (!c->framed || c->fullscreen) return 0;
    int pad = (int)(2 * scale);
    for (int i = 0; i < 3; i++) {
        int x, y; button_rect(c, i, &x, &y);
        if (fx >= x - pad && fx < x + BTN + pad && fy >= y - pad && fy < y + BTN + pad) return i + 1;
    }
    return 0;
}

static void rounded_top(cairo_t *cr, double x, double y, double w, double h, double r)
{
    cairo_new_path(cr);
    cairo_move_to(cr, x, y + h);
    cairo_line_to(cr, x, y + r);
    cairo_arc(cr, x + r, y + r, r, G_PI, 1.5 * G_PI);
    cairo_line_to(cr, x + w - r, y);
    cairo_arc(cr, x + w - r, y + r, r, 1.5 * G_PI, 2 * G_PI);
    cairo_line_to(cr, x + w, y + h);
    cairo_close_path(cr);
}

void deco_draw(Client *c)
{
    if (!c->framed || !c->frame) return;
    XWindowAttributes wa;
    if (!XGetWindowAttributes(dpy, c->frame, &wa) || wa.width < 2 || wa.height < 2) return;
    int fw = wa.width, fh = wa.height;
    cairo_surface_t *win = cairo_xlib_surface_create(dpy, c->frame, wa.visual, fw, fh);
    /* draw off screen, then put it up in one go (no flicker) */
    cairo_surface_t *s = cairo_surface_create_similar(win, wa.depth == 32 ? CAIRO_CONTENT_COLOR_ALPHA : CAIRO_CONTENT_COLOR, fw, TB + 2 * RM + 2);
    cairo_t *cr = cairo_create(s);
    cairo_set_operator(cr, CAIRO_OPERATOR_SOURCE);
    cairo_set_source_rgba(cr, 0, 0, 0, 0);
    cairo_paint(cr);
    cairo_set_operator(cr, CAIRO_OPERATOR_OVER);

    if (c->fullscreen) goto done;
    int m = margin(c);
    double x = m, y = m, w = fw - 2 * m, h = TB;
    bool active = c->focused;
    Client *sh = NULL;
    for (Client *o = clients; o; o = o->next) if (o->sheet && o->transient == c->win && o->focused) sh = o;
    if (sh) active = true;      /* its sheet has the keyboard: the window still looks in front */

    /* the steel */
    rounded_top(cr, x, y, w, h + 1, CR);
    cairo_save(cr);
    cairo_clip_preserve(cr);
    cairo_surface_t *img = tb_img[active ? 0 : 1];
    if (img) {
        double k = (double)TB / cairo_image_surface_get_height(img);
        cairo_translate(cr, x, y);
        cairo_scale(cr, k, k);
        cairo_set_source_surface(cr, img, 0, 0);
        cairo_pattern_set_extend(cairo_get_source(cr), CAIRO_EXTEND_REFLECT);
        cairo_pattern_set_filter(cairo_get_source(cr), CAIRO_FILTER_GOOD);
        cairo_paint(cr);
    } else {
        cairo_pattern_t *g = cairo_pattern_create_linear(0, y, 0, y + h);
        if (dark) { cairo_pattern_add_color_stop_rgb(g, 0, .34, .38, .42); cairo_pattern_add_color_stop_rgb(g, 1, .24, .27, .31); }
        else { cairo_pattern_add_color_stop_rgb(g, 0, .87, .89, .90); cairo_pattern_add_color_stop_rgb(g, 1, .68, .71, .75); }
        cairo_set_source(cr, g); cairo_fill(cr); cairo_pattern_destroy(g);
    }
    cairo_restore(cr);
    cairo_new_path(cr);
    /* a highlight along the top edge and a seam under the bar */
    cairo_set_line_width(cr, 1);
    cairo_set_source_rgba(cr, 1, 1, 1, dark ? 0.18 : 0.6);
    cairo_move_to(cr, x + CR, y + 0.5); cairo_line_to(cr, x + w - CR, y + 0.5); cairo_stroke(cr);
    cairo_set_source_rgba(cr, 0, 0, 0, dark ? 0.55 : 0.28);
    cairo_move_to(cr, x, y + h - 0.5); cairo_line_to(cr, x + w, y + h - 0.5); cairo_stroke(cr);

    /* buttons: in colour when in front, grey behind; all three light up when the pointer is over them */
    int last_btn_x = 0;
    for (int i = 0; i < 3; i++) {
        int bx, by; button_rect(c, i, &bx, &by);
        int st = active ? 0 : 3;
        if (c->hover) st = 1;
        if (c->pressed == i + 1 && c->hover == i + 1) st = 2;
        if (i == 2 && c->fixed) st = 3;      /* a window that can't change size has no maximise */
        cairo_surface_t *b = btn_img[i][st] ? btn_img[i][st] : btn_img[i][0];
        if (b) {
            double k = (double)BTN / cairo_image_surface_get_width(b);
            cairo_save(cr);
            cairo_translate(cr, bx, by);
            cairo_scale(cr, k, k);
            cairo_set_source_surface(cr, b, 0, 0);
            cairo_paint(cr);
            cairo_restore(cr);
        } else {
            static const double col[3][3] = { { .81, .19, .22 }, { .90, .66, .16 }, { .30, .69, .35 } };
            cairo_arc(cr, bx + BTN / 2.0, by + BTN / 2.0, BTN / 2.0 - 0.5, 0, 2 * G_PI);
            if (active || c->hover) cairo_set_source_rgb(cr, col[i][0], col[i][1], col[i][2]);
            else cairo_set_source_rgba(cr, .5, .5, .5, .6);
            cairo_fill(cr);
        }
        last_btn_x = bx + BTN;
    }

    /* the title, centred on the window, kept clear of the buttons */
    if (c->title && *c->title) {
        PangoLayout *pl = pango_cairo_create_layout(cr);
        pango_layout_set_font_description(pl, font);
        pango_layout_set_text(pl, c->title, -1);
        pango_layout_set_ellipsize(pl, PANGO_ELLIPSIZE_END);
        int room = (int)w - 2 * (last_btn_x - m + (int)(12 * scale));
        if (room > 20) {
            pango_layout_set_width(pl, room * PANGO_SCALE);
            int tw, th; pango_layout_get_pixel_size(pl, &tw, &th);
            double tx = x + (w - tw) / 2, ty = y + (h - th) / 2;
            /* engraved: a soft line of light (or shade) under the letters */
            if (dark) cairo_set_source_rgba(cr, 0, 0, 0, 0.5);
            else cairo_set_source_rgba(cr, 1, 1, 1, 0.55);
            cairo_move_to(cr, tx, ty + scale);
            pango_cairo_show_layout(cr, pl);
            if (dark) cairo_set_source_rgba(cr, .90, .91, .92, active ? 1 : .55);
            else cairo_set_source_rgba(cr, .16, .17, .18, active ? 1 : .5);
            cairo_move_to(cr, tx, ty);
            pango_cairo_show_layout(cr, pl);
        }
        g_object_unref(pl);
    }

done:
    cairo_destroy(cr);
    /* up on the frame: the title bar, then the bevel round the content */
    cairo_t *wc = cairo_create(win);
    cairo_set_operator(wc, CAIRO_OPERATOR_SOURCE);
    cairo_set_source_surface(wc, s, 0, 0);
    cairo_rectangle(wc, 0, 0, fw, c->fullscreen ? 0 : margin(c) + TB);
    cairo_fill(wc);
    if (!c->fullscreen) {
        int m = margin(c);
        /* the invisible resize margin stays clear */
        if (m) {
            cairo_set_source_rgba(wc, 0, 0, 0, 0);
            cairo_rectangle(wc, 0, m + TB, m, fh - m - TB); cairo_fill(wc);
            cairo_rectangle(wc, fw - m, m + TB, m, fh - m - TB); cairo_fill(wc);
            cairo_rectangle(wc, 0, fh - m, fw, m); cairo_fill(wc);
        }
        cairo_set_operator(wc, CAIRO_OPERATOR_SOURCE);
        double l = m, r = fw - m, t = m + TB, b = fh - m;
        cairo_set_line_width(wc, BW);
        /* light edge left, soft dark edge right and below */
        if (dark) cairo_set_source_rgba(wc, .42, .45, .48, 1); else cairo_set_source_rgba(wc, .93, .94, .95, 1);
        cairo_move_to(wc, l + BW / 2.0, t); cairo_line_to(wc, l + BW / 2.0, b); cairo_stroke(wc);
        if (dark) cairo_set_source_rgba(wc, .10, .11, .12, 1); else cairo_set_source_rgba(wc, .55, .57, .60, 1);
        cairo_move_to(wc, r - BW / 2.0, t); cairo_line_to(wc, r - BW / 2.0, b - BW / 2.0);
        cairo_line_to(wc, l, b - BW / 2.0); cairo_stroke(wc);
    }
    cairo_destroy(wc);
    cairo_surface_destroy(s);
    cairo_surface_flush(win);
    cairo_surface_destroy(win);
    XFlush(dpy);
}

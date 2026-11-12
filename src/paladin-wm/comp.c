/* paladin-wm: the compositor (OpenGL, texture-from-pixmap): shadows, see-through windows, Magic Lamp, sheets,
   snapping preview. */
#define _GNU_SOURCE
#include "pwm.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <GL/gl.h>
#include <GL/glx.h>
#include <GL/glxext.h>
#include <X11/extensions/Xcomposite.h>
#include <X11/extensions/Xdamage.h>
#include <X11/extensions/Xfixes.h>
#include <X11/extensions/shape.h>

enum { AN_NONE, AN_FADE_IN, AN_SHEET, AN_GENIE, AN_SCALE };

typedef struct CWin {
    Window id;
    int x, y, w, h, bw, depth;
    Visual *visual;
    bool viewable, input_only, override, typed;
    WinType otype;                  /* for windows we don't manage (menus, tooltips) */
    Damage damage;
    Pixmap pixmap;
    GLXPixmap glxpix;
    GLuint tex;
    bool y_inverted, damaged, hidden;
    int anim; long anim_start, anim_dur; bool anim_back;
    Window anim_client; void (*anim_done)(Client *);
    double sx, sy, sw, sh, tx, ty, tw, th;     /* genie / scale: window and Dock icon */
    XRectangle *shape; int nshape;              /* the window's own shape (NULL: the whole rectangle) */
    bool shape_read;
    struct CWin *next;
} CWin;

static CWin *wins;                  /* bottom to top */
static bool stack_dirty = true;
static Window overlay, canvas;
static GLXContext ctx;
static int damage_ev, damage_err, shape_ev, shape_err;
static PFNGLXBINDTEXIMAGEEXTPROC bind_tex;
static PFNGLXRELEASETEXIMAGEEXTPROC release_tex;
static GLuint shadow_tex;
static int shadow_r;
static struct { VisualID vid; GLXFBConfig cfg; bool ok, inverted, rgba; } cfgs[64];
static int ncfgs;
static GLXFBConfig *all_cfgs; static int nall;

int comp_damage_base(void) { return damage_ev; }
int comp_shape_base(void) { return shape_ev; }

/* PALADIN_WM_DEBUG: what the compositor knows, bottom to top (on SIGUSR1) */
static long paints;
static bool probe;
void comp_dump(void)
{
    probe = true; request_repaint();
    logf_("  %ld paints, GL error 0x%x", paints, glGetError());
    for (CWin *w = wins; w; w = w->next)
        logf_("  0x%lx %dx%d%+d%+d d%d %s%s%s anim %d pix %lu tex %u", w->id, w->w, w->h, w->x, w->y, w->depth,
              w->viewable ? "viewable " : "", w->hidden ? "hidden " : "", w->override ? "override " : "",
              w->anim, (unsigned long)w->glxpix, w->tex);
}

/* ---------------------------------------------------------------- setup */
static bool has_ext(const char *list, const char *e)
{
    const char *p = list;
    size_t n = strlen(e);
    while ((p = strstr(p, e))) { if (p[n] == ' ' || p[n] == 0) return true; p += n; }
    return false;
}

static int find_cfg(Visual *v, int depth)
{
    VisualID vid = XVisualIDFromVisual(v);
    for (int i = 0; i < ncfgs; i++) if (cfgs[i].vid == vid) return cfgs[i].ok ? i : -1;
    if (ncfgs >= 64) return -1;
    int slot = ncfgs++;
    cfgs[slot].vid = vid; cfgs[slot].ok = false;
    int best = -1;
    for (int i = 0; i < nall; i++) {
        int val, vis = 0;
        glXGetFBConfigAttrib(dpy, all_cfgs[i], GLX_VISUAL_ID, &vis);
        XVisualInfo tmpl = { .visualid = (VisualID)vis }, *vi; int n;
        if (!vis || !(vi = XGetVisualInfo(dpy, VisualIDMask, &tmpl, &n))) continue;
        int vdepth = vi->depth;
        XFree(vi);
        if (vdepth != depth) continue;
        glXGetFBConfigAttrib(dpy, all_cfgs[i], GLX_DRAWABLE_TYPE, &val);
        if (!(val & GLX_PIXMAP_BIT)) continue;
        glXGetFBConfigAttrib(dpy, all_cfgs[i], GLX_BIND_TO_TEXTURE_TARGETS_EXT, &val);
        if (!(val & GLX_TEXTURE_2D_BIT_EXT)) continue;
        int rgba = 0, rgb = 0;
        glXGetFBConfigAttrib(dpy, all_cfgs[i], GLX_BIND_TO_TEXTURE_RGBA_EXT, &rgba);
        glXGetFBConfigAttrib(dpy, all_cfgs[i], GLX_BIND_TO_TEXTURE_RGB_EXT, &rgb);
        if (depth == 32 ? !rgba : !(rgb || rgba)) continue;
        bool exact = (VisualID)vis == vid;
        if (best < 0 || exact) {
            best = i;
            cfgs[slot].cfg = all_cfgs[i];
            cfgs[slot].rgba = depth == 32;
            int inv = 0; glXGetFBConfigAttrib(dpy, all_cfgs[i], GLX_Y_INVERTED_EXT, &inv);
            cfgs[slot].inverted = inv;
            if (exact) break;
        }
    }
    if (best < 0) return -1;
    cfgs[slot].ok = true;
    return slot;
}

/* a soft shadow, drawn as nine pieces round a window */
static void make_shadow(void)
{
    shadow_r = (int)(24 * scale);
    int n = 2 * shadow_r + 2;
    unsigned char *px = malloc(n * n);
    double sigma = shadow_r / 2.4;
    double *f = malloc(n * sizeof(double));
    for (int i = 0; i < n; i++) {
        double d = i < n / 2 ? i - shadow_r : (n - 1 - i) - shadow_r;      /* distance from the window's edge */
        f[i] = 0.5 * erfc(-d / (sigma * sqrt(2)));
    }
    for (int y = 0; y < n; y++) for (int x = 0; x < n; x++) px[y * n + x] = (unsigned char)(255 * f[x] * f[y] + 0.5);
    glGenTextures(1, &shadow_tex);
    glBindTexture(GL_TEXTURE_2D, shadow_tex);
    glPixelStorei(GL_UNPACK_ALIGNMENT, 1);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_ALPHA, n, n, 0, GL_ALPHA, GL_UNSIGNED_BYTE, px);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    free(px); free(f);
}

static bool redirect_failed;
static int catch_redirect(Display *d, XErrorEvent *e) { (void)d; (void)e; redirect_failed = true; return 0; }

bool comp_init(void)
{
    int ev, err, major = 0, minor = 2;
    if (!XCompositeQueryExtension(dpy, &ev, &err) || !XCompositeQueryVersion(dpy, &major, &minor) || (major == 0 && minor < 2)
        || !XDamageQueryExtension(dpy, &damage_ev, &damage_err) || !XFixesQueryExtension(dpy, &ev, &err)
        || !XShapeQueryExtension(dpy, &shape_ev, &shape_err)) {
        fputs("paladin-wm: the X server can't composite, running without effects\n", stderr);
        return false;
    }
    const char *exts = glXQueryExtensionsString(dpy, scr);
    if (!exts || !has_ext(exts, "GLX_EXT_texture_from_pixmap")) {
        fputs("paladin-wm: no GLX_EXT_texture_from_pixmap, running without effects\n", stderr);
        return false;
    }
    bind_tex = (PFNGLXBINDTEXIMAGEEXTPROC)glXGetProcAddress((const GLubyte *)"glXBindTexImageEXT");
    release_tex = (PFNGLXRELEASETEXIMAGEEXTPROC)glXGetProcAddress((const GLubyte *)"glXReleaseTexImageEXT");
    all_cfgs = glXGetFBConfigs(dpy, scr, &nall);
    if (!bind_tex || !release_tex || !all_cfgs) {
        fputs("paladin-wm: no texture-from-pixmap configs\n", stderr);
        return false;
    }

    /* take over drawing the screen (fails if another compositor has it) */
    XErrorHandler old = XSetErrorHandler(catch_redirect);
    XCompositeRedirectSubwindows(dpy, root, CompositeRedirectManual);
    XSync(dpy, False);
    XSetErrorHandler(old);
    if (redirect_failed) { fputs("paladin-wm: another compositor is running, running without effects\n", stderr); return false; }

    int attrs[] = { GLX_RGBA, GLX_DOUBLEBUFFER, GLX_RED_SIZE, 8, GLX_GREEN_SIZE, 8, GLX_BLUE_SIZE, 8, None };
    XVisualInfo *vi = glXChooseVisual(dpy, scr, attrs);
    if (!vi || !(ctx = glXCreateContext(dpy, vi, NULL, True))) {
        fputs("paladin-wm: no OpenGL context\n", stderr);
        if (vi) XFree(vi);
        XCompositeUnredirectSubwindows(dpy, root, CompositeRedirectManual);
        return false;
    }
    overlay = XCompositeGetOverlayWindow(dpy, root);
    XSetWindowAttributes sa = {0};
    sa.colormap = XCreateColormap(dpy, root, vi->visual, AllocNone);
    sa.border_pixel = 0;
    canvas = XCreateWindow(dpy, overlay, 0, 0, DisplayWidth(dpy, scr), DisplayHeight(dpy, scr), 0, vi->depth, InputOutput,
                           vi->visual, CWColormap | CWBorderPixel, &sa);
    XFree(vi);
    /* the pointer goes straight through to the windows underneath */
    XserverRegion none = XFixesCreateRegion(dpy, NULL, 0);
    XFixesSetWindowShapeRegion(dpy, overlay, ShapeInput, 0, 0, none);
    XFixesSetWindowShapeRegion(dpy, canvas, ShapeInput, 0, 0, none);
    XFixesDestroyRegion(dpy, none);
    XMapWindow(dpy, canvas);
    glXMakeCurrent(dpy, canvas, ctx);

    const char *glx_ext = glXQueryExtensionsString(dpy, scr);
    if (has_ext(glx_ext, "GLX_EXT_swap_control")) {
        PFNGLXSWAPINTERVALEXTPROC f = (PFNGLXSWAPINTERVALEXTPROC)glXGetProcAddress((const GLubyte *)"glXSwapIntervalEXT");
        if (f) f(dpy, canvas, 1);
    } else if (has_ext(glx_ext, "GLX_MESA_swap_control")) {
        int (*f)(unsigned) = (int (*)(unsigned))glXGetProcAddress((const GLubyte *)"glXSwapIntervalMESA");
        if (f) f(1);
    }
    glDisable(GL_DEPTH_TEST);
    glEnable(GL_BLEND);
    make_shadow();
    /* windows already on screen draw themselves again, so what we show is their current picture */
    Window r, p, *kids = NULL; unsigned int nk = 0;
    if (XQueryTree(dpy, root, &r, &p, &kids, &nk)) {
        for (unsigned int i = 0; i < nk; i++) {
            XWindowAttributes a;
            if (kids[i] != overlay && XGetWindowAttributes(dpy, kids[i], &a) && a.map_state == IsViewable && a.class == InputOutput)
                XClearArea(dpy, kids[i], 0, 0, 0, 0, True);
        }
        if (kids) XFree(kids);
    }
    fprintf(stderr, "paladin-wm: compositing with %s\n", (const char *)glGetString(GL_RENDERER));
    return true;
}

static void release_pixmap(CWin *w)
{
    if (w->glxpix) {
        if (w->tex) { glBindTexture(GL_TEXTURE_2D, w->tex); release_tex(dpy, w->glxpix, GLX_FRONT_LEFT_EXT); }
        glXDestroyPixmap(dpy, w->glxpix);
        w->glxpix = 0;
    }
    if (w->pixmap) { XFreePixmap(dpy, w->pixmap); w->pixmap = 0; }
}

static void forget_shape(CWin *w)
{
    if (w->shape) XFree(w->shape);
    w->shape = NULL; w->nshape = 0; w->shape_read = false;
}

/* Windows can be cut to any shape (Seeker's menu bar is a screen-sized window cut down to the bar): only the
   shape is shown. */
static void read_shape(CWin *w)
{
    if (w->shape_read) return;
    w->shape_read = true;
    int bs, xbs, ybs, cs, xcs, ycs; unsigned int wbs, hbs, wcs, hcs;
    if (!XShapeQueryExtents(dpy, w->id, &bs, &xbs, &ybs, &wbs, &hbs, &cs, &xcs, &ycs, &wcs, &hcs) || !bs) return;
    int n = 0, order;
    XRectangle *r = XShapeGetRectangles(dpy, w->id, ShapeBounding, &n, &order);
    w->shape = r; w->nshape = n;
    if (!r) w->nshape = 0, w->shape = calloc(1, sizeof(XRectangle));   /* shaped to nothing */
}

static void free_win(CWin *w)
{
    forget_shape(w);
    release_pixmap(w);
    if (w->tex) glDeleteTextures(1, &w->tex);
    if (w->damage) XDamageDestroy(dpy, w->damage);
    free(w);
}

void comp_quit(void)
{
    for (CWin *w = wins, *n; w; w = n) { n = w->next; w->damage = 0; free_win(w); }
    wins = NULL;
    glXMakeCurrent(dpy, None, NULL);
    glXDestroyContext(dpy, ctx);
    XDestroyWindow(dpy, canvas);
    XCompositeReleaseOverlayWindow(dpy, root);
    XCompositeUnredirectSubwindows(dpy, root, CompositeRedirectManual);
}

/* ---------------------------------------------------------------- tracking windows */
static CWin *lookup(Window id)
{
    for (CWin *w = wins; w; w = w->next) if (w->id == id) return w;
    return NULL;
}

static void read_attrs(CWin *w)
{
    XWindowAttributes a;
    if (!XGetWindowAttributes(dpy, w->id, &a)) { w->viewable = false; return; }
    w->x = a.x; w->y = a.y; w->w = a.width; w->h = a.height; w->bw = a.border_width;
    w->depth = a.depth; w->visual = a.visual; w->override = a.override_redirect;
    w->input_only = a.class == InputOnly;
    w->viewable = a.map_state == IsViewable;
}

static void rebuild_stack(void)
{
    Window r, p, *kids = NULL; unsigned int n = 0;
    if (!XQueryTree(dpy, root, &r, &p, &kids, &n)) return;
    CWin *list = NULL, **tail = &list;
    for (unsigned int i = 0; i < n; i++) {
        if (kids[i] == overlay || kids[i] == wmcheck) continue;
        CWin *w = NULL, **pp = &wins;
        while (*pp) { if ((*pp)->id == kids[i]) { w = *pp; *pp = w->next; break; } pp = &(*pp)->next; }
        if (!w) {
            w = calloc(1, sizeof *w);
            w->id = kids[i];
            read_attrs(w);
            if (w->viewable && !w->input_only) w->damage = XDamageCreate(dpy, w->id, XDamageReportNonEmpty);
            if (!w->input_only) XShapeSelectInput(dpy, w->id, ShapeNotifyMask);
        }
        w->next = NULL; *tail = w; tail = &w->next;
    }
    /* whatever is left is gone */
    for (CWin *w = wins, *nx; w; w = nx) { nx = w->next; free_win(w); }
    wins = list;
    if (kids) XFree(kids);
    stack_dirty = false;
}

void comp_window_configure(Window id) { (void)id; stack_dirty = true; request_repaint(); }

void comp_configure_event(XConfigureEvent *e)
{
    stack_dirty = true;
    CWin *w = lookup(e->window);
    if (w) {
        if (w->w != e->width || w->h != e->height || w->bw != e->border_width) { release_pixmap(w); forget_shape(w); }
        w->x = e->x; w->y = e->y; w->w = e->width; w->h = e->height; w->bw = e->border_width;
        w->override = e->override_redirect;
    }
    request_repaint();
}

void comp_window_map(Window id)
{
    stack_dirty = true;
    CWin *w = lookup(id);
    if (!w) { request_repaint(); return; }       /* picked up when the stack is rebuilt */
    read_attrs(w);
    if (!w->viewable) return;
    w->hidden = false;
    w->typed = false;
    forget_shape(w);
    release_pixmap(w);
    if (!w->damage && !w->input_only) w->damage = XDamageCreate(dpy, w->id, XDamageReportNonEmpty);
    request_repaint();
}

void comp_window_unmap(Window id)
{
    CWin *w = lookup(id);
    if (w) {
        w->viewable = false;
        release_pixmap(w);
        if (w->anim != AN_GENIE && w->anim != AN_SCALE) w->anim = AN_NONE;
    }
    request_repaint();
}

void comp_window_destroy(Window id)
{
    CWin **pp = &wins;
    while (*pp && (*pp)->id != id) pp = &(*pp)->next;
    if (*pp) { CWin *w = *pp; *pp = w->next; w->damage = 0; free_win(w); }  /* the damage went with the window */
    request_repaint();
}

void comp_shape_event(XEvent *ev)
{
    XShapeEvent *e = (XShapeEvent *)ev;
    CWin *w = lookup(e->window);
    if (w && e->kind == ShapeBounding) forget_shape(w);
    request_repaint();
}

void comp_damage_event(XEvent *ev)
{
    XDamageNotifyEvent *e = (XDamageNotifyEvent *)ev;
    XDamageSubtract(dpy, e->damage, None, None);
    CWin *w = lookup(e->drawable);
    if (w) w->damaged = true;
    request_repaint();
}

static bool bind_window(CWin *w)
{
    if (w->glxpix) {
        if (w->damaged) {
            glBindTexture(GL_TEXTURE_2D, w->tex);
            release_tex(dpy, w->glxpix, GLX_FRONT_LEFT_EXT);
            bind_tex(dpy, w->glxpix, GLX_FRONT_LEFT_EXT, NULL);
            w->damaged = false;
        }
        return true;
    }
    int ci = find_cfg(w->visual, w->depth);
    if (ci < 0) return false;
    w->pixmap = XCompositeNameWindowPixmap(dpy, w->id);
    if (!w->pixmap) return false;
    int attrs[] = { GLX_TEXTURE_TARGET_EXT, GLX_TEXTURE_2D_EXT,
                    GLX_TEXTURE_FORMAT_EXT, cfgs[ci].rgba ? GLX_TEXTURE_FORMAT_RGBA_EXT : GLX_TEXTURE_FORMAT_RGB_EXT, None };
    w->glxpix = glXCreatePixmap(dpy, cfgs[ci].cfg, w->pixmap, attrs);
    if (!w->glxpix) { XFreePixmap(dpy, w->pixmap); w->pixmap = 0; return false; }
    w->y_inverted = cfgs[ci].inverted;
    if (!w->tex) glGenTextures(1, &w->tex);
    glBindTexture(GL_TEXTURE_2D, w->tex);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    bind_tex(dpy, w->glxpix, GLX_FRONT_LEFT_EXT, NULL);
    w->damaged = false;
    return true;
}

static WinType other_type(CWin *w)
{
    if (w->typed) return w->otype;
    w->typed = true;
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    w->otype = T_OTHER;
    if (XGetWindowProperty(dpy, w->id, atom[A_NET_WM_WINDOW_TYPE], 0, 1, False, XA_ATOM, &type, &fmt, &n, &after, &data) == Success
        && data && n) {
        Atom a = *(Atom *)data;
        if (a == atom[A_NET_WM_WINDOW_TYPE_MENU] || a == atom[A_NET_WM_WINDOW_TYPE_POPUP_MENU]
            || a == atom[A_NET_WM_WINDOW_TYPE_DROPDOWN_MENU] || a == atom[A_NET_WM_WINDOW_TYPE_COMBO]) w->otype = T_MENU;
        else if (a == atom[A_NET_WM_WINDOW_TYPE_TOOLTIP]) w->otype = T_TOOLTIP;
        else if (a == atom[A_NET_WM_WINDOW_TYPE_NOTIFICATION]) w->otype = T_NOTIFICATION;
        else if (a == atom[A_NET_WM_WINDOW_TYPE_DOCK]) w->otype = T_DOCK;
    }
    if (data) XFree(data);
    return w->otype;
}

/* ---------------------------------------------------------------- animations */
static double ease_out(double t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
static double ease_io(double t) { return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2; }
static double clamp01(double v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
static double smooth(double v) { v = clamp01(v); return v * v * (3 - 2 * v); }

bool comp_animating(void)
{
    for (CWin *w = wins; w; w = w->next) if (w->anim) return true;
    return false;
}

static char *read_file(const char *path)
{
    FILE *f = fopen(path, "r");
    if (!f) return NULL;
    char *buf = calloc(1, 65537);
    size_t n = fread(buf, 1, 65536, f);
    buf[n] = 0;
    fclose(f);
    return buf;
}

/* "genie" (Magic Lamp) or "scale", from the Dock's settings */
static bool lamp_effect(void)
{
    char path[512];
    const char *home = getenv("HOME");
    const char *xdg = getenv("XDG_CONFIG_HOME");
    if (xdg && *xdg) snprintf(path, sizeof path, "%s/paladin-dock/config.json", xdg);
    else snprintf(path, sizeof path, "%s/.config/paladin-dock/config.json", home ? home : "");
    char *s = read_file(path);
    if (!s || !strstr(s, "\"minimize_effect\"")) { free(s); s = read_file("/etc/paladin-dock/config.json"); }
    bool genie = true;
    char *k = s ? strstr(s, "\"minimize_effect\"") : NULL;
    if (k && (k = strchr(k + 17, ':'))) {
        while (*++k == ' ' || *k == '\t' || *k == '\n') ;
        if (!strncmp(k, "\"scale\"", 7)) genie = false;
    }
    free(s);
    return genie;
}

void comp_minimize(Client *c, bool restoring, void (*done)(Client *))
{
    stack_dirty = true;
    rebuild_stack();
    CWin *w = lookup(top_of(c));
    if (!w) { if (done) done(c); return; }
    w->anim = lamp_effect() ? AN_GENIE : AN_SCALE;
    w->anim_back = restoring;
    w->anim_start = now_ms();
    w->anim_dur = w->anim == AN_GENIE ? 520 : 300;
    w->anim_client = c->win;
    w->anim_done = done;
    w->hidden = false;
    XWindowAttributes a;
    if (XGetWindowAttributes(dpy, w->id, &a)) { w->x = a.x; w->y = a.y; w->w = a.width; w->h = a.height; }
    if (!restoring) read_attrs(w);
    w->sx = w->x; w->sy = w->y; w->sw = w->w; w->sh = w->h;
    if (c->has_icon_geom) { w->tx = c->icon_geom[0]; w->ty = c->icon_geom[1]; w->tw = c->icon_geom[2]; w->th = c->icon_geom[3]; }
    else { w->tw = w->th = 48 * scale; w->tx = (sw_screen - w->tw) / 2; w->ty = sh_screen - w->th; }
    request_repaint();
}

void comp_sheet_open(Client *c)
{
    stack_dirty = true;
    rebuild_stack();
    CWin *w = lookup(c->win);
    if (!w) return;
    w->anim = AN_SHEET; w->anim_back = false; w->anim_start = now_ms(); w->anim_dur = 260;
    w->anim_client = c->win; w->anim_done = NULL;
    request_repaint();
}

void comp_window_fade_in(Window id)
{
    stack_dirty = true;
    rebuild_stack();
    CWin *w = lookup(id);
    if (!w) return;
    w->anim = AN_FADE_IN; w->anim_back = false; w->anim_start = now_ms(); w->anim_dur = 160; w->anim_done = NULL;
    request_repaint();
}

/* ---------------------------------------------------------------- drawing */
static void tex_quad(CWin *w, double x, double y, double ww, double hh)
{
    double t0 = w->y_inverted ? 0 : 1, t1 = w->y_inverted ? 1 : 0;
    glBegin(GL_QUADS);
    glTexCoord2d(0, t0); glVertex2d(x, y);
    glTexCoord2d(1, t0); glVertex2d(x + ww, y);
    glTexCoord2d(1, t1); glVertex2d(x + ww, y + hh);
    glTexCoord2d(0, t1); glVertex2d(x, y + hh);
    glEnd();
}

static void tex_shaped(CWin *w, double x, double y, double ww, double hh)
{
    read_shape(w);
    if (!w->shape) { tex_quad(w, x, y, ww, hh); return; }
    double t0 = w->y_inverted ? 0 : 1, t1 = w->y_inverted ? 1 : 0;
    glBegin(GL_QUADS);
    for (int i = 0; i < w->nshape; i++) {
        XRectangle *r = &w->shape[i];
        double ox = r->x + w->bw, oy = r->y + w->bw;          /* shape is relative to the inside of the border */
        double u0 = ox / ww, u1 = (ox + r->width) / ww;
        double v0 = t0 + (t1 - t0) * oy / hh, v1 = t0 + (t1 - t0) * (oy + r->height) / hh;
        glTexCoord2d(u0, v0); glVertex2d(x + ox, y + oy);
        glTexCoord2d(u1, v0); glVertex2d(x + ox + r->width, y + oy);
        glTexCoord2d(u1, v1); glVertex2d(x + ox + r->width, y + oy + r->height);
        glTexCoord2d(u0, v1); glVertex2d(x + ox, y + oy + r->height);
    }
    glEnd();
}

static void shadow(double x, double y, double w, double h, double alpha, double grow)
{
    /* nine pieces: corners from the texture's corners, edges stretched along the window */
    int R = shadow_r;
    double r = R * grow;
    double xs[4] = { x - r, x + r * 0.0, x + w, x + w + r };
    double ys[4] = { y - r, y, y + h, y + h + r };
    double n = 2 * R + 2;
    double us[4] = { 0, R / n, (R + 2) / n, 1 };
    xs[1] = x;
    glBindTexture(GL_TEXTURE_2D, shadow_tex);
    glEnable(GL_TEXTURE_2D);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glColor4d(0, 0, 0, alpha);
    glBegin(GL_QUADS);
    for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) {
        if (i == 1 && j == 1) continue;     /* under the window: nothing to see */
        glTexCoord2d(us[i], us[j]); glVertex2d(xs[i], ys[j]);
        glTexCoord2d(us[i + 1], us[j]); glVertex2d(xs[i + 1], ys[j]);
        glTexCoord2d(us[i + 1], us[j + 1]); glVertex2d(xs[i + 1], ys[j + 1]);
        glTexCoord2d(us[i], us[j + 1]); glVertex2d(xs[i], ys[j + 1]);
    }
    glEnd();
}

static void draw_genie(CWin *w, double p)
{
    /* window S pours into icon T. Work as if the Dock is below; flip when it's above. */
    double H = sh_screen;
    bool up = w->ty + w->th / 2 < w->sy + w->sh / 2;
    double sx = w->sx, sw = w->sw, tx = w->tx, tw = w->tw;
    double sy = up ? H - (w->sy + w->sh) : w->sy, sh = w->sh;
    double ty = up ? H - (w->ty + w->th) : w->ty, th = w->th;
    const int N = 48;
    double t_top = w->y_inverted ? 0 : 1, t_bot = w->y_inverted ? 1 : 0;
    double funnel = smooth(p / 0.4);
    double span = ty - sy;
    if (span < 1) span = 1;
    glBegin(GL_TRIANGLE_STRIP);
    for (int i = 0; i <= N; i++) {
        double v = (double)i / N;                       /* 0 top, 1 bottom (in the down-facing frame) */
        double q = smooth((p - 0.38 * (1 - v)) / 0.62);
        double y0 = sy + v * sh, y1 = ty + v * th;
        double y = y0 + (y1 - y0) * q;
        double f = smooth((y - sy) / span) * funnel;
        double l = sx + (tx - sx) * f, r = (sx + sw) + ((tx + tw) - (sx + sw)) * f;
        double ry = up ? H - y : y;
        double tv = up ? 1 - v : v;
        double tt = t_top + (t_bot - t_top) * tv;
        glTexCoord2d(0, tt); glVertex2d(l, ry);
        glTexCoord2d(1, tt); glVertex2d(r, ry);
    }
    glEnd();
}

static Client *client_for(CWin *w)
{
    Client *c = find_client(w->id);
    return c && top_of(c) == w->id ? c : NULL;
}

void comp_paint(void)
{
    paints++;
    if (stack_dirty) rebuild_stack();
    int W = DisplayWidth(dpy, scr), H = DisplayHeight(dpy, scr);
    glViewport(0, 0, W, H);
    glMatrixMode(GL_PROJECTION); glLoadIdentity(); glOrtho(0, W, H, 0, -1, 1);
    glMatrixMode(GL_MODELVIEW); glLoadIdentity();
    glClearColor(0.16, 0.17, 0.19, 1);
    glClear(GL_COLOR_BUFFER_BIT);
    glEnable(GL_BLEND);
    glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE);
    long now = now_ms();
    int sx, sy, sw, sh;
    bool preview = snap_preview(&sx, &sy, &sw, &sh);
    Client *dragged_over = NULL;

    for (CWin *w = wins; w; w = w->next) {
        if (w->input_only || w->hidden) continue;
        bool animating = w->anim != AN_NONE;
        if (!w->viewable && !(animating && w->glxpix)) continue;
        if (w->x >= W || w->y >= H || w->x + w->w + 2 * w->bw <= 0 || w->y + w->h + 2 * w->bw <= 0) {
            if (!animating || w->anim == AN_FADE_IN || w->anim == AN_SHEET) continue;
        }
        if (w->viewable && !bind_window(w)) continue;
        if (!w->glxpix) continue;

        Client *c = client_for(w);
        double p = 1;
        if (animating) {
            p = clamp01((double)(now - w->anim_start) / (w->anim_dur ? w->anim_dur : 1));
            if (p >= 1 && (now - w->anim_start) >= w->anim_dur) {
                int kind = w->anim;
                void (*done)(Client *) = w->anim_done;
                Window cw = w->anim_client;
                bool back = w->anim_back;
                w->anim = AN_NONE; w->anim_done = NULL;
                if ((kind == AN_GENIE || kind == AN_SCALE) && !back) {
                    w->hidden = true;                    /* gone into the Dock: hide until shown again */
                    Client *cc = find_client(cw);
                    if (done && cc) done(cc);
                    continue;
                }
                animating = false;
            }
        }
        double x = w->x, y = w->y, ww = w->w + 2 * w->bw, hh = w->h + 2 * w->bw;
        bool argb = w->depth == 32;
        double opacity = 1;

        /* shadows */
        bool menuish = false;
        if (!c && w->override) { WinType t = other_type(w); menuish = t == T_MENU || t == T_TOOLTIP || t == T_NOTIFICATION; }
        if (!animating || w->anim == AN_FADE_IN || w->anim == AN_SHEET) {
            double a = 0, grow = 1, off = 0, inset_top = 0;
            if (c && !c->fullscreen && c->type != T_DOCK && c->type != T_DESKTOP) {
                if (c->framed) {
                    int m = margin(c);
                    x += 0; inset_top = CR;
                    a = c->focused ? 0.7 : 0.4; grow = c->focused ? 1 : 0.7; off = (c->focused ? 6 : 3) * scale;
                    double bx = w->x + m, by = w->y + m, bw = ww - 2 * m, bh = hh - 2 * m;
                    if (w->anim == AN_FADE_IN) a *= p;
                    shadow(bx, by + inset_top + off, bw, bh - inset_top, a, grow);
                    a = 0;
                } else if ((read_shape(w), !w->shape) && (c->type == T_NORMAL || c->type == T_DIALOG || c->type == T_UTILITY || c->sheet)) {
                    /* apps that draw their own title bar (round top corners, possibly see-through) */
                    a = c->sheet ? 0.45 : c->focused ? 0.65 : 0.38; grow = c->sheet ? 0.6 : c->focused ? 1 : 0.7;
                    off = (c->sheet ? 3 : c->focused ? 6 : 3) * scale;
                    if (argb && !c->sheet) inset_top = CR;
                }
            } else if (menuish && !argb && (read_shape(w), !w->shape)) {
                a = 0.3; grow = 0.35; off = 2 * scale;
            }
            if (a > 0) {
                if (w->anim == AN_FADE_IN) a *= p;
                if (w->anim == AN_SHEET) {
                    glEnable(GL_SCISSOR_TEST);
                    glScissor(0, 0, W, H - (int)y);
                }
                double slide = w->anim == AN_SHEET ? (1 - ease_out(p)) * hh : 0;
                shadow(x, y + inset_top + off - slide, ww, hh - inset_top, a, grow);
                if (w->anim == AN_SHEET) glDisable(GL_SCISSOR_TEST);
            }
        }

        glEnable(GL_TEXTURE_2D);
        glBindTexture(GL_TEXTURE_2D, w->tex);
        /* see-through windows come premultiplied; plain ones are opaque */
        if (argb) glBlendFunc(GL_ONE, GL_ONE_MINUS_SRC_ALPHA);
        else glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

        if (animating && w->anim == AN_GENIE) {
            double q = w->anim_back ? 1 - ease_io(p) : ease_io(p);
            glColor4d(1, 1, 1, 1);
            draw_genie(w, q);
        } else if (animating && w->anim == AN_SCALE) {
            double q = w->anim_back ? 1 - ease_out(p) : ease_out(p);
            double rx = w->sx + (w->tx - w->sx) * q, ry = w->sy + (w->ty - w->sy) * q;
            double rw = w->sw + (w->tw - w->sw) * q, rh = w->sh + (w->th - w->sh) * q;
            opacity = 1 - 0.7 * q;
            if (argb) glColor4d(opacity, opacity, opacity, opacity); else glColor4d(1, 1, 1, opacity);
            tex_quad(w, rx, ry, rw, rh);
        } else if (animating && w->anim == AN_SHEET) {
            /* slides down out of the window's title bar */
            double q = ease_out(p);
            glEnable(GL_SCISSOR_TEST);
            glScissor(0, 0, W, H - (int)y);
            glColor4d(1, 1, 1, 1);
            tex_shaped(w, x, y - (1 - q) * hh, ww, hh);
            glDisable(GL_SCISSOR_TEST);
        } else if (animating && w->anim == AN_FADE_IN) {
            double q = ease_out(p);
            double k = 0.97 + 0.03 * q;
            opacity = q;
            if (argb) glColor4d(opacity, opacity, opacity, opacity); else glColor4d(1, 1, 1, opacity);
            tex_shaped(w, x + ww * (1 - k) / 2, y + hh * (1 - k) / 2, ww * k, hh * k);
        } else {
            glColor4d(1, 1, 1, 1);
            if (!argb) glDisable(GL_BLEND);
            tex_shaped(w, x, y, ww, hh);
            glEnable(GL_BLEND);
        }
        glDisable(GL_TEXTURE_2D);
        (void)dragged_over;
        if (probe) {
            unsigned char px[4]; glReadPixels(500, H - 500, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, px);
            logf_("  after 0x%lx: %d,%d,%d,%d inv %d argb %d", w->id, px[0], px[1], px[2], px[3], w->y_inverted, argb);
        }
    }

    if (preview) {
        /* where the window will go if let go now */
        glDisable(GL_TEXTURE_2D);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        double in = 6 * scale;
        glColor4d(0.55, 0.70, 0.95, 0.22);
        glRectd(sx + in, sy + in, sx + sw - in, sy + sh - in);
        glColor4d(0.75, 0.85, 1.0, 0.65);
        glLineWidth(1.5 * scale);
        glBegin(GL_LINE_LOOP);
        glVertex2d(sx + in, sy + in); glVertex2d(sx + sw - in, sy + in);
        glVertex2d(sx + sw - in, sy + sh - in); glVertex2d(sx + in, sy + sh - in);
        glEnd();
    }
    probe = false;
    glXSwapBuffers(dpy, canvas);
}

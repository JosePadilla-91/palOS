/* paladin-wm: start-up, standards bookkeeping, screens, and the event loop. */
#define _GNU_SOURCE
#include "pwm.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <signal.h>
#include <unistd.h>
#include <fcntl.h>
#include <time.h>
#include <errno.h>
#include <sys/select.h>
#include <sys/wait.h>
#include <X11/Xresource.h>
#include <X11/Xproto.h>
#include <X11/extensions/Xcomposite.h>
#include <X11/extensions/Xdamage.h>
#include <X11/extensions/shape.h>

Display *dpy;
int scr;
Window root, wmcheck;
int sw_screen, sh_screen;
int hsize = 2, vsize = 1, vp_x, vp_y;
int wa_x, wa_y, wa_w, wa_h;
double scale = 1;
int TB, RM, CR, BTN, BW;
bool dark, composite_on, debug;
Client *clients;
Atom atom[A_COUNT];
static Atom a_dark, a_cm_sel;
static volatile sig_atomic_t quit_flag;
static bool repaint_wanted;
static int settings_fd = -1;
static pid_t settings_pid;

static const char *atom_names[A_COUNT] = {
    "WM_PROTOCOLS", "WM_DELETE_WINDOW", "WM_TAKE_FOCUS", "WM_CHANGE_STATE", "WM_STATE", "UTF8_STRING",
    "_NET_SUPPORTED", "_NET_SUPPORTING_WM_CHECK", "_NET_WM_NAME", "_NET_CLIENT_LIST", "_NET_CLIENT_LIST_STACKING",
    "_NET_ACTIVE_WINDOW", "_NET_NUMBER_OF_DESKTOPS", "_NET_CURRENT_DESKTOP", "_NET_DESKTOP_GEOMETRY",
    "_NET_DESKTOP_VIEWPORT", "_NET_WORKAREA", "_NET_WM_DESKTOP", "_NET_FRAME_EXTENTS", "_NET_REQUEST_FRAME_EXTENTS",
    "_NET_CLOSE_WINDOW", "_NET_WM_MOVERESIZE", "_NET_MOVERESIZE_WINDOW", "_NET_WM_STATE",
    "_NET_WM_STATE_HIDDEN", "_NET_WM_STATE_FULLSCREEN", "_NET_WM_STATE_MAXIMIZED_VERT", "_NET_WM_STATE_MAXIMIZED_HORZ",
    "_NET_WM_STATE_ABOVE", "_NET_WM_STATE_BELOW", "_NET_WM_STATE_SKIP_TASKBAR", "_NET_WM_STATE_SKIP_PAGER",
    "_NET_WM_STATE_MODAL", "_NET_WM_STATE_STICKY", "_NET_WM_STATE_FOCUSED",
    "_NET_WM_WINDOW_TYPE", "_NET_WM_WINDOW_TYPE_DESKTOP", "_NET_WM_WINDOW_TYPE_DOCK", "_NET_WM_WINDOW_TYPE_TOOLBAR",
    "_NET_WM_WINDOW_TYPE_MENU", "_NET_WM_WINDOW_TYPE_UTILITY", "_NET_WM_WINDOW_TYPE_SPLASH", "_NET_WM_WINDOW_TYPE_DIALOG",
    "_NET_WM_WINDOW_TYPE_TOOLTIP", "_NET_WM_WINDOW_TYPE_COMBO", "_NET_WM_WINDOW_TYPE_DND", "_NET_WM_WINDOW_TYPE_NORMAL",
    "_NET_WM_WINDOW_TYPE_DROPDOWN_MENU", "_NET_WM_WINDOW_TYPE_POPUP_MENU", "_NET_WM_WINDOW_TYPE_NOTIFICATION",
    "_NET_WM_STRUT", "_NET_WM_STRUT_PARTIAL", "_NET_WM_ICON_GEOMETRY", "_NET_WM_PID", "_NET_WM_ALLOWED_ACTIONS",
    "_NET_WM_ACTION_MOVE", "_NET_WM_ACTION_RESIZE", "_NET_WM_ACTION_MINIMIZE", "_NET_WM_ACTION_MAXIMIZE_HORZ",
    "_NET_WM_ACTION_MAXIMIZE_VERT", "_NET_WM_ACTION_FULLSCREEN", "_NET_WM_ACTION_CLOSE", "_NET_WM_ACTION_ABOVE",
    "_NET_WM_WINDOW_OPACITY", "_MOTIF_WM_HINTS",
};

void logf_(const char *fmt, ...)
{
    va_list ap; va_start(ap, fmt);
    fputs("paladin-wm: ", stderr); vfprintf(stderr, fmt, ap); fputc('\n', stderr);
    va_end(ap);
}

long now_ms(void)
{
    struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000L + ts.tv_nsec / 1000000L;
}

void request_repaint(void) { repaint_wanted = true; }

/* ---------------------------------------------------------------- errors */
static bool other_wm;
static int on_xerror(Display *d, XErrorEvent *e)
{
    if (e->request_code == X_ChangeWindowAttributes && e->error_code == BadAccess) { other_wm = true; return 0; }
    /* windows vanish all the time; anything else is worth a line when debugging */
    if (debug && e->error_code != BadWindow && e->error_code != BadDrawable && e->error_code != BadMatch
) {
        char msg[128]; XGetErrorText(d, e->error_code, msg, sizeof msg);
        logf_("X error %s (request %d.%d)", msg, e->request_code, e->minor_code);
    }
    return 0;
}

/* ---------------------------------------------------------------- properties */
void set_cardinals(Window w, Atom a, const long *v, int n)
{
    XChangeProperty(dpy, w, a, XA_CARDINAL, 32, PropModeReplace, (const unsigned char *)v, n);
}

bool get_cardinals(Window w, Atom a, long *v, int n)
{
    Atom type; int fmt; unsigned long nitems, after; unsigned char *data = NULL;
    if (XGetWindowProperty(dpy, w, a, 0, n, False, XA_CARDINAL, &type, &fmt, &nitems, &after, &data) != Success
        || !data || fmt != 32 || (int)nitems < n) {
        if (data) XFree(data);
        return false;
    }
    for (int i = 0; i < n; i++) v[i] = ((long *)data)[i];
    XFree(data);
    return true;
}

void update_client_list(void)
{
    int n = 0;
    for (Client *c = clients; c; c = c->next) n++;
    Window *list = calloc(n ? n : 1, sizeof(Window));
    int i = 0;
    /* clients are kept in stacking order, bottom to top */
    for (Client *c = clients; c; c = c->next) list[i++] = c->win;
    XChangeProperty(dpy, root, atom[A_NET_CLIENT_LIST], XA_WINDOW, 32, PropModeReplace, (unsigned char *)list, n);
    XChangeProperty(dpy, root, atom[A_NET_CLIENT_LIST_STACKING], XA_WINDOW, 32, PropModeReplace, (unsigned char *)list, n);
    free(list);
}

/* The work area: the screen less what docks (Seeker's menu bar, the Dock) reserve. */
void update_workarea(void)
{
    long l = 0, r = 0, t = 0, b = 0;
    for (Client *c = clients; c; c = c->next) {
        if (!c->has_strut || !c->mapped) continue;
        if (c->strut[0] > l) l = c->strut[0];
        if (c->strut[1] > r) r = c->strut[1];
        if (c->strut[2] > t) t = c->strut[2];
        if (c->strut[3] > b) b = c->strut[3];
    }
    int dw = DisplayWidth(dpy, scr), dh = DisplayHeight(dpy, scr);
    /* struts are relative to the whole X screen; keep them to one screen's size */
    if (dw > sw_screen) r = r > dw - sw_screen ? r - (dw - sw_screen) : 0;
    if (dh > sh_screen) b = b > dh - sh_screen ? b - (dh - sh_screen) : 0;
    wa_x = l; wa_y = t; wa_w = sw_screen - l - r; wa_h = sh_screen - t - b;
    if (wa_w < 100) wa_w = sw_screen;
    if (wa_h < 100) wa_h = sh_screen;
    long wa[4] = { wa_x, wa_y, wa_w, wa_h };
    set_cardinals(root, atom[A_NET_WORKAREA], wa, 4);
    for (Client *c = clients; c; c = c->next) keep_in_workarea(c);
}

static void set_desktop_props(void)
{
    long one = 1, zero = 0;
    long geom[2] = { (long)sw_screen * hsize, (long)sh_screen * vsize };
    long vp[2] = { (long)vp_x * sw_screen, (long)vp_y * sh_screen };
    set_cardinals(root, atom[A_NET_NUMBER_OF_DESKTOPS], &one, 1);
    set_cardinals(root, atom[A_NET_CURRENT_DESKTOP], &zero, 1);
    set_cardinals(root, atom[A_NET_DESKTOP_GEOMETRY], geom, 2);
    set_cardinals(root, atom[A_NET_DESKTOP_VIEWPORT], vp, 2);
}

/* Screens: windows live on one big desktop of hsize × vsize screens. Moving to another screen slides every
   window that isn't sticky (and isn't the desktop, a dock or the menu bar) by the difference. */
void set_viewport(int x, int y)
{
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x >= hsize) x = hsize - 1;
    if (y >= vsize) y = vsize - 1;
    if (x == vp_x && y == vp_y) return;
    int dx = (vp_x - x) * sw_screen, dy = (vp_y - y) * sh_screen;
    vp_x = x; vp_y = y;
    for (Client *c = clients; c; c = c->next) {
        if (c->sticky || c->type == T_DESKTOP || c->type == T_DOCK || c->sheet) continue;
        c->x += dx; c->y += dy;
        if (c->saved) { c->sx += dx; c->sy += dy; }
        apply_geometry(c);
    }
    attach_sheets_of(NULL);     /* sheets hang on their windows wherever those went */
    set_desktop_props();
    LOG("screen %d,%d", vp_x, vp_y);
}

static int run_int(const char *cmd, int fallback)
{
    FILE *p = popen(cmd, "r");
    if (!p) return fallback;
    char buf[64] = ""; int v = fallback;
    if (fgets(buf, sizeof buf, p)) {
        char *s = buf;
        if (!strncmp(s, "uint32 ", 7)) s += 7;
        else if (!strncmp(s, "int32 ", 6)) s += 6;
        if (*s >= '0' && *s <= '9') v = atoi(s);
    }
    pclose(p);
    return v;
}

/* palOS's screens setting. Kept in this one place so the settings system can change under it. */
void read_screens(void)
{
    int h = run_int("gsettings get org.palos.screens hsize 2>/dev/null", 2);
    int v = run_int("gsettings get org.palos.screens vsize 2>/dev/null", 1);
    if (h < 1) h = 1;
    if (h > 16) h = 16;
    if (v < 1) v = 1;
    if (v > 16) v = 16;
    if (h == hsize && v == vsize && wmcheck) return;
    hsize = h; vsize = v;
    if (vp_x >= hsize || vp_y >= vsize) {
        int nx = vp_x >= hsize ? hsize - 1 : vp_x, ny = vp_y >= vsize ? vsize - 1 : vp_y;
        set_viewport(nx, ny);
    }
    /* windows left on a screen that no longer exists come back to the last one */
    for (Client *c = clients; c; c = c->next) {
        if (c->sticky || c->type == T_DESKTOP || c->type == T_DOCK) continue;
        int maxx = (hsize - vp_x) * sw_screen - 40, maxy = (vsize - vp_y) * sh_screen - 40;
        bool moved = false;
        if (c->x > maxx) { c->x -= ((c->x - maxx) / sw_screen + 1) * sw_screen; moved = true; }
        if (c->y > maxy) { c->y -= ((c->y - maxy) / sh_screen + 1) * sh_screen; moved = true; }
        if (moved) apply_geometry(c);
    }
    set_desktop_props();
    LOG("screens %d x %d", hsize, vsize);
}

/* Follow the screens setting while running: `gsettings monitor` prints a line on every change. */
static void start_settings_watch(void)
{
    int fds[2];
    if (pipe(fds) < 0) return;
    pid_t pid = fork();
    if (pid == 0) {
        dup2(fds[1], 1);
        int nul = open("/dev/null", O_WRONLY);
        if (nul >= 0) dup2(nul, 2);
        close(fds[0]); close(fds[1]);
        if (ConnectionNumber(dpy) > 2) close(ConnectionNumber(dpy));
        execlp("gsettings", "gsettings", "monitor", "org.palos.screens", (char *)NULL);
        _exit(127);
    }
    close(fds[1]);
    if (pid < 0) { close(fds[0]); return; }
    fcntl(fds[0], F_SETFL, O_NONBLOCK);
    fcntl(fds[0], F_SETFD, FD_CLOEXEC);
    settings_fd = fds[0]; settings_pid = pid;
}

static void read_dark(void)
{
    long v = 0;
    bool d = get_cardinals(root, a_dark, &v, 1) && v;
    if (d != dark) {
        dark = d;
        deco_reload();
        for (Client *c = clients; c; c = c->next) if (c->framed) deco_draw(c);
    }
}

static void read_scale(void)
{
    const char *env = getenv("PALADIN_WM_SCALE");
    if (env && atof(env) >= 1) { scale = atof(env); return; }
    char *rms = XResourceManagerString(dpy);
    if (!rms) return;
    XrmInitialize();
    XrmDatabase db = XrmGetStringDatabase(rms);
    char *type; XrmValue val;
    if (db && XrmGetResource(db, "Xft.dpi", "Xft.Dpi", &type, &val) && val.addr) {
        double dpi = atof(val.addr);
        if (dpi >= 144) scale = (int)(dpi / 96.0 + 0.25);
    }
    if (db) XrmDestroyDatabase(db);
    if (scale < 1) scale = 1;
}

static void announce(void)
{
    wmcheck = XCreateSimpleWindow(dpy, root, -100, -100, 1, 1, 0, 0, 0);
    XChangeProperty(dpy, wmcheck, atom[A_NET_SUPPORTING_WM_CHECK], XA_WINDOW, 32, PropModeReplace, (unsigned char *)&wmcheck, 1);
    XChangeProperty(dpy, root, atom[A_NET_SUPPORTING_WM_CHECK], XA_WINDOW, 32, PropModeReplace, (unsigned char *)&wmcheck, 1);
    XChangeProperty(dpy, wmcheck, atom[A_NET_WM_NAME], atom[A_UTF8_STRING], 8, PropModeReplace, (unsigned char *)"paladin-wm", 10);
    XStoreName(dpy, wmcheck, "paladin-wm");
    Atom ver = XInternAtom(dpy, "_PALADIN_WM_VERSION", False);
    XChangeProperty(dpy, wmcheck, ver, atom[A_UTF8_STRING], 8, PropModeReplace, (unsigned char *)PWM_VERSION, strlen(PWM_VERSION));
    /* everything from _NET_SUPPORTED on, except the bookkeeping atoms at the start */
    XChangeProperty(dpy, root, atom[A_NET_SUPPORTED], XA_ATOM, 32, PropModeReplace,
                    (unsigned char *)&atom[A_NET_SUPPORTED], A_COUNT - A_NET_SUPPORTED);
    char sel[32]; snprintf(sel, sizeof sel, "_NET_WM_CM_S%d", scr);
    a_cm_sel = XInternAtom(dpy, sel, False);
    if (composite_on) XSetSelectionOwner(dpy, a_cm_sel, wmcheck, CurrentTime);
    set_desktop_props();
}

static void scan(void)
{
    Window r, p, *kids = NULL; unsigned int n = 0;
    if (!XQueryTree(dpy, root, &r, &p, &kids, &n)) return;
    /* the ones apps marked as transient last, so their owners are managed first */
    for (int pass = 0; pass < 2; pass++)
        for (unsigned int i = 0; i < n; i++) {
            XWindowAttributes wa;
            if (kids[i] == wmcheck || !XGetWindowAttributes(dpy, kids[i], &wa) || wa.override_redirect) continue;
            Window t = 0;
            bool trans = XGetTransientForHint(dpy, kids[i], &t) && t;
            if (trans != (pass == 1)) continue;
            long st[2];
            bool iconic = get_cardinals(kids[i], atom[A_WM_STATE], st, 1) && st[0] == IconicState;
            if (wa.map_state == IsViewable || iconic) manage(kids[i], true);
        }
    if (kids) XFree(kids);
}

static volatile sig_atomic_t dump_flag;
static void on_signal(int s) { (void)s; quit_flag = 1; }
static void on_usr1(int s) { (void)s; dump_flag = 1; }

/* ---------------------------------------------------------------- events */
static void handle_client_message(XClientMessageEvent *e)
{
    Client *c = find_client(e->window);
    Atom t = e->message_type;
    if (t == atom[A_NET_DESKTOP_VIEWPORT]) {
        set_viewport(e->data.l[0] / (sw_screen ? sw_screen : 1), e->data.l[1] / (sh_screen ? sh_screen : 1));
    } else if (t == atom[A_NET_REQUEST_FRAME_EXTENTS]) {
        long ext[4] = { BW, BW, TB, BW };
        set_cardinals(e->window, atom[A_NET_FRAME_EXTENTS], ext, 4);
    } else if (!c) {
        return;
    } else if (t == atom[A_NET_ACTIVE_WINDOW]) {
        if (c->iconic) restore(c);
        if (c->sticky || c->type == T_DOCK || c->type == T_DESKTOP) ;
        else if (c->x + c->w <= 0 || c->x >= sw_screen || c->y + c->h <= 0 || c->y >= sh_screen) {
            /* it's on another screen: go there */
            int cx = c->x + c->w / 2, cy = c->y + c->h / 2;
            int gx = vp_x + (cx < 0 ? (cx - sw_screen + 1) / sw_screen : cx / sw_screen);
            int gy = vp_y + (cy < 0 ? (cy - sh_screen + 1) / sh_screen : cy / sh_screen);
            set_viewport(gx, gy);
        }
        raise_client(c);
        focus_client(c, e->data.l[1] ? (Time)e->data.l[1] : CurrentTime);
    } else if (t == atom[A_NET_CLOSE_WINDOW]) {
        close_client(c);
    } else if (t == atom[A_WM_CHANGE_STATE]) {
        if (e->data.l[0] == IconicState) minimize(c);
        else if (e->data.l[0] == NormalState && c->iconic) restore(c);
    } else if (t == atom[A_NET_WM_STATE]) {
        handle_net_state(c, e->data.l[0], (Atom)e->data.l[1], (Atom)e->data.l[2]);
    } else if (t == atom[A_NET_WM_MOVERESIZE]) {
        start_moveresize(c, (int)e->data.l[2], (int)e->data.l[0], (int)e->data.l[1], (int)e->data.l[3]);
    } else if (t == atom[A_NET_MOVERESIZE_WINDOW]) {
        long f = e->data.l[0];
        if (f & (1 << 8)) c->x = e->data.l[1] + ext_l(c);
        if (f & (1 << 9)) c->y = e->data.l[2] + ext_t(c);
        if (f & (1 << 10)) c->w = e->data.l[3];
        if (f & (1 << 11)) c->h = e->data.l[4];
        keep_in_workarea(c);
        apply_geometry(c);
    } else if (t == atom[A_NET_WM_DESKTOP]) {
        bool all = (unsigned long)e->data.l[0] == 0xFFFFFFFFUL;
        if (all != c->sticky) { c->sticky = all; set_state_atoms(c); }
    }
}

static void handle_configure_request(XConfigureRequestEvent *e)
{
    Client *c = find_client(e->window);
    if (!c || c->win != e->window) {
        XWindowChanges wc = { e->x, e->y, e->width, e->height, e->border_width, e->above, e->detail };
        XConfigureWindow(dpy, e->window, e->value_mask, &wc);
        return;
    }
    if (c->fullscreen) { configure_notify(c); return; }
    int left = ext_l(c), top = ext_t(c);
    if (e->value_mask & CWX) c->x = e->x + left;
    if (e->value_mask & CWY) c->y = e->y + top;
    if (e->value_mask & CWWidth) c->w = e->width;
    if (e->value_mask & CWHeight) c->h = e->height;
    if ((e->value_mask & (CWWidth | CWHeight)) && (c->maxv || c->maxh)) { c->maxv = c->maxh = false; set_state_atoms(c); }
    if (c->sheet) attach_sheets_of(NULL);
    else keep_in_workarea(c);
    apply_geometry(c);
    configure_notify(c);
    if ((e->value_mask & CWStackMode) && e->detail == Above && c->mapped && !c->iconic) raise_client(c);
}

static void handle_property(XPropertyEvent *e)
{
    if (e->window == root) {
        if (e->atom == a_dark) read_dark();
        return;
    }
    Client *c = find_client(e->window);
    if (!c || c->win != e->window) return;
    if (e->atom == XA_WM_NAME || e->atom == atom[A_NET_WM_NAME]) { read_title(c); if (c->framed) deco_draw(c); }
    else if (e->atom == atom[A_NET_WM_STRUT] || e->atom == atom[A_NET_WM_STRUT_PARTIAL]) { read_struts(c); update_workarea(); }
    else if (e->atom == atom[A_NET_WM_ICON_GEOMETRY]) read_icon_geom(c);
    else if (e->atom == XA_WM_NORMAL_HINTS) {
        XSizeHints h; long sup;
        if (XGetWMNormalHints(dpy, c->win, &h, &sup)) {
            c->min_w = (h.flags & PMinSize) ? h.min_width : 0;
            c->min_h = (h.flags & PMinSize) ? h.min_height : 0;
            c->max_w = (h.flags & PMaxSize) ? h.max_width : 0;
            c->max_h = (h.flags & PMaxSize) ? h.max_height : 0;
        }
    }
}

static void dispatch(XEvent *ev)
{
    if (composite_on && ev->type == comp_damage_base() + XDamageNotify) { comp_damage_event(ev); return; }
    if (composite_on && ev->type == comp_shape_base() + ShapeNotify) { comp_shape_event(ev); return; }
    Client *c;
    switch (ev->type) {
    case MapRequest:
        c = find_client(ev->xmaprequest.window);
        if (!c) manage(ev->xmaprequest.window, false);
        else if (c->iconic) restore(c);
        break;
    case MapNotify:
        if (ev->xmap.event == root && composite_on) comp_window_map(ev->xmap.window);
        break;
    case UnmapNotify:
        if (ev->xunmap.event == root && composite_on) comp_window_unmap(ev->xunmap.window);
        c = find_client(ev->xunmap.window);
        /* each unmap is reported once to whoever holds the window (its frame, or the root) */
        if (c && c->win == ev->xunmap.window && (ev->xunmap.send_event || ev->xunmap.event != ev->xunmap.window)) {
            if (c->ignore_unmaps > 0 && !ev->xunmap.send_event) c->ignore_unmaps--;
            else unmanage(c, false);
        }
        break;
    case DestroyNotify:
        if (ev->xdestroywindow.event == root && composite_on) comp_window_destroy(ev->xdestroywindow.window);
        c = find_client(ev->xdestroywindow.window);
        if (c && c->win == ev->xdestroywindow.window) unmanage(c, true);
        break;
    case CreateNotify: case CirculateNotify:
        if (composite_on) comp_window_configure(None);      /* the stacking changed */
        break;
    case ReparentNotify:
        if (composite_on) {
            if (ev->xreparent.parent == root) comp_window_map(ev->xreparent.window);   /* only if it's shown */
            else comp_window_destroy(ev->xreparent.window);                            /* it left the root */
        }
        break;
    case ConfigureNotify:
        if (ev->xconfigure.window == root) {
            sw_screen = ev->xconfigure.width; sh_screen = ev->xconfigure.height;
            update_workarea(); set_desktop_props();
        }
        if (composite_on && ev->xconfigure.event == root) comp_configure_event(&ev->xconfigure);
        break;
    case ConfigureRequest: handle_configure_request(&ev->xconfigurerequest); break;
    case PropertyNotify: handle_property(&ev->xproperty); break;
    case ClientMessage: handle_client_message(&ev->xclient); break;
    case ButtonPress: handle_button(&ev->xbutton); break;
    case ButtonRelease: handle_release(&ev->xbutton); break;
    case MotionNotify:
        while (XCheckTypedWindowEvent(dpy, ev->xmotion.window, MotionNotify, ev)) ;
        handle_motion(&ev->xmotion);
        break;
    case EnterNotify: case LeaveNotify: handle_crossing(&ev->xcrossing); break;
    case Expose:
        if (ev->xexpose.count == 0 && (c = find_client(ev->xexpose.window)) && c->frame == ev->xexpose.window) deco_draw(c);
        break;
    case FocusIn:
        /* an app took focus on its own (or focus fell to the root): keep _NET_ACTIVE_WINDOW honest */
        if (ev->xfocus.mode == NotifyNormal || ev->xfocus.mode == NotifyWhileGrabbed) {
            c = find_client(ev->xfocus.window);
            if (c && !c->focused) focus_client(c, CurrentTime);
        }
        break;
    case SelectionClear:
        if (ev->xselectionclear.selection == a_cm_sel) { LOG("another compositor took over"); quit_flag = 1; }
        break;
    case MappingNotify: XRefreshKeyboardMapping(&ev->xmapping); break;
    }
}

int main(int argc, char **argv)
{
    bool no_effects = false;
    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--version")) { puts(PWM_VERSION); return 0; }
        if (!strcmp(argv[i], "--no-effects")) no_effects = true;
        else if (!strcmp(argv[i], "--help")) {
            puts("paladin-wm [--no-effects]\n  PALADIN_WM_DEBUG=1 logs, PALADIN_WM_NO_COMPOSITE=1 runs without effects");
            return 0;
        }
    }
    debug = getenv("PALADIN_WM_DEBUG") && *getenv("PALADIN_WM_DEBUG") && strcmp(getenv("PALADIN_WM_DEBUG"), "0");
    const char *nc = getenv("PALADIN_WM_NO_COMPOSITE");
    if (nc && *nc && strcmp(nc, "0")) no_effects = true;

    if (!(dpy = XOpenDisplay(NULL))) { fputs("paladin-wm: can't open the display\n", stderr); return 1; }
    fcntl(ConnectionNumber(dpy), F_SETFD, FD_CLOEXEC);
    scr = DefaultScreen(dpy);
    root = RootWindow(dpy, scr);
    sw_screen = DisplayWidth(dpy, scr); sh_screen = DisplayHeight(dpy, scr);
    XSetErrorHandler(on_xerror);

    XSelectInput(dpy, root, SubstructureRedirectMask | SubstructureNotifyMask | StructureNotifyMask
                 | PropertyChangeMask | FocusChangeMask);
    XSync(dpy, False);
    if (other_wm) { fputs("paladin-wm: another window manager is running\n", stderr); return 1; }

    XInternAtoms(dpy, (char **)atom_names, A_COUNT, False, atom);
    a_dark = XInternAtom(dpy, "_PALADIN_DARK", False);
    signal(SIGTERM, on_signal); signal(SIGINT, on_signal); signal(SIGHUP, on_signal);
    signal(SIGCHLD, SIG_DFL); signal(SIGUSR1, on_usr1);

    read_scale();
    TB = (int)(TB_BASE * scale); RM = (int)(RM_BASE * scale); CR = (int)(CR_BASE * scale); BTN = (int)(BTN_BASE * scale); BW = (int)scale;
    long d = 0; dark = get_cardinals(root, a_dark, &d, 1) && d;

    composite_on = !no_effects && comp_init();
    deco_init();
    XGrabServer(dpy);
    announce();
    read_screens();
    update_workarea();
    scan();
    XUngrabServer(dpy);
    update_client_list();
    start_settings_watch();
    if (!focused_client()) cycle_focus(false);
    request_repaint();
    LOG("ready (%s, scale %.0f, screens %d x %d)", composite_on ? "effects" : "no effects", scale, hsize, vsize);

    int xfd = ConnectionNumber(dpy);
    while (!quit_flag) {
        while (XPending(dpy)) { XEvent ev; XNextEvent(dpy, &ev); dispatch(&ev); }
        if (dump_flag) {
            dump_flag = 0;
            logf_("screens %d x %d at %d,%d, work area %dx%d%+d%+d", hsize, vsize, vp_x, vp_y, wa_w, wa_h, wa_x, wa_y);
            for (Client *c = clients; c; c = c->next)
                logf_("client 0x%lx frame 0x%lx %dx%d%+d%+d type %d%s%s%s", c->win, c->frame, c->w, c->h, c->x, c->y, c->type,
                      c->focused ? " focused" : "", c->iconic ? " iconic" : "", c->sheet ? " sheet" : "");
            if (composite_on) comp_dump();
        }
        if (composite_on && (repaint_wanted || comp_animating())) { repaint_wanted = false; comp_paint(); XFlush(dpy); }
        if (XPending(dpy)) continue;
        fd_set fds; FD_ZERO(&fds); FD_SET(xfd, &fds);
        int maxfd = xfd;
        if (settings_fd >= 0) { FD_SET(settings_fd, &fds); if (settings_fd > maxfd) maxfd = settings_fd; }
        struct timeval tv = { 1, 0 }, *tvp = &tv;
        if (composite_on && (repaint_wanted || comp_animating())) { tv.tv_sec = 0; tv.tv_usec = 4000; }
        int r = select(maxfd + 1, &fds, NULL, NULL, tvp);
        if (r < 0 && errno != EINTR) break;
        if (r > 0 && settings_fd >= 0 && FD_ISSET(settings_fd, &fds)) {
            char buf[512]; ssize_t n;
            bool changed = false, eof = false;
            while ((n = read(settings_fd, buf, sizeof buf)) > 0) changed = true;
            if (n == 0) eof = true;
            if (changed) read_screens();
            if (eof) { close(settings_fd); settings_fd = -1; waitpid(settings_pid, NULL, WNOHANG); }
        }
        waitpid(-1, NULL, WNOHANG);
    }

    /* leave the apps where the person sees them: put every window back on the root, on screen */
    set_viewport(0, 0);
    for (Client *c = clients; c; c = c->next) {
        if (c->framed) XReparentWindow(dpy, c->win, root, c->x, c->y);
        if (c->iconic) XMapWindow(dpy, c->win);
    }
    if (composite_on) comp_quit();
    if (settings_pid > 0) kill(settings_pid, SIGTERM);
    XSetInputFocus(dpy, PointerRoot, RevertToPointerRoot, CurrentTime);
    XDeleteProperty(dpy, root, atom[A_NET_SUPPORTING_WM_CHECK]);
    XSync(dpy, False);
    XCloseDisplay(dpy);
    return 0;
}

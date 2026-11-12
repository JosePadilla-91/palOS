/* paladin-wm: managing windows (frames, focus, stacking, states, moving, resizing, snapping, sheets). */
#define _GNU_SOURCE
#include "pwm.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <X11/Xcursor/Xcursor.h>
#include <X11/extensions/shape.h>

static Visual *argb_visual;
static Colormap argb_cmap;
static Atom a_sheet, a_sheet_top;
static Cursor cur_move, cur_arrow, cur_edge[16];

/* an interactive move or resize */
static struct {
    Client *c;
    int mode;               /* 0 none, 1 move, 2 resize */
    int dir;                /* resize edges: 1 left, 2 right, 4 top, 8 bottom */
    int px, py;             /* where the pointer started (root) */
    int ox, oy, ow, oh;     /* the window then */
    bool started;           /* moved past the threshold */
    bool snap; int snx, sny, snw, snh;
} drag;

static Time last_click; static Client *last_click_client;

enum { E_L = 1, E_R = 2, E_T = 4, E_B = 8 };

int margin(Client *c) { return c->framed && composite_on && !c->fullscreen ? RM : 0; }
int ext_l(Client *c) { return c->framed && !c->fullscreen ? BW : 0; }
int ext_r(Client *c) { return c->framed && !c->fullscreen ? BW : 0; }
int ext_t(Client *c) { return c->framed && !c->fullscreen ? TB : 0; }
int ext_b(Client *c) { return c->framed && !c->fullscreen ? BW : 0; }

static void init_once(void)
{
    static bool done;
    if (done) return;
    done = true;
    a_sheet = XInternAtom(dpy, "_PALADIN_SHEET", False);
    a_sheet_top = XInternAtom(dpy, "_PALADIN_SHEET_TOP", False);
    XVisualInfo vi;
    if (composite_on && XMatchVisualInfo(dpy, scr, 32, TrueColor, &vi)) {
        argb_visual = vi.visual;
        argb_cmap = XCreateColormap(dpy, root, argb_visual, AllocNone);
    }
    cur_arrow = XcursorLibraryLoadCursor(dpy, "left_ptr");
    cur_move = XcursorLibraryLoadCursor(dpy, "fleur");
    cur_edge[E_L] = XcursorLibraryLoadCursor(dpy, "left_side");
    cur_edge[E_R] = XcursorLibraryLoadCursor(dpy, "right_side");
    cur_edge[E_T] = XcursorLibraryLoadCursor(dpy, "top_side");
    cur_edge[E_B] = XcursorLibraryLoadCursor(dpy, "bottom_side");
    cur_edge[E_T | E_L] = XcursorLibraryLoadCursor(dpy, "top_left_corner");
    cur_edge[E_T | E_R] = XcursorLibraryLoadCursor(dpy, "top_right_corner");
    cur_edge[E_B | E_L] = XcursorLibraryLoadCursor(dpy, "bottom_left_corner");
    cur_edge[E_B | E_R] = XcursorLibraryLoadCursor(dpy, "bottom_right_corner");
    XDefineCursor(dpy, root, cur_arrow);
}

Client *find_client(Window w)
{
    if (!w) return NULL;
    for (Client *c = clients; c; c = c->next) if (c->win == w || (c->frame && c->frame == w)) return c;
    return NULL;
}

Window top_of(Client *c) { return c->framed ? c->frame : c->win; }

Client *focused_client(void)
{
    for (Client *c = clients; c; c = c->next) if (c->focused) return c;
    return NULL;
}

/* ---------------------------------------------------------------- reading what the app says */
static WinType read_type(Window w)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    WinType t = T_NORMAL;
    bool found = false;
    if (XGetWindowProperty(dpy, w, atom[A_NET_WM_WINDOW_TYPE], 0, 16, False, XA_ATOM, &type, &fmt, &n, &after, &data) == Success && data) {
        for (unsigned long i = 0; i < n && !found; i++) {
            Atom a = ((Atom *)data)[i];
            found = true;
            if (a == atom[A_NET_WM_WINDOW_TYPE_NORMAL]) t = T_NORMAL;
            else if (a == atom[A_NET_WM_WINDOW_TYPE_DIALOG]) t = T_DIALOG;
            else if (a == atom[A_NET_WM_WINDOW_TYPE_UTILITY]) t = T_UTILITY;
            else if (a == atom[A_NET_WM_WINDOW_TYPE_TOOLBAR]) t = T_TOOLBAR;
            else if (a == atom[A_NET_WM_WINDOW_TYPE_SPLASH]) t = T_SPLASH;
            else if (a == atom[A_NET_WM_WINDOW_TYPE_DESKTOP]) t = T_DESKTOP;
            else if (a == atom[A_NET_WM_WINDOW_TYPE_DOCK]) t = T_DOCK;
            else if (a == atom[A_NET_WM_WINDOW_TYPE_MENU] || a == atom[A_NET_WM_WINDOW_TYPE_DROPDOWN_MENU]
                     || a == atom[A_NET_WM_WINDOW_TYPE_POPUP_MENU] || a == atom[A_NET_WM_WINDOW_TYPE_COMBO]) t = T_MENU;
            else if (a == atom[A_NET_WM_WINDOW_TYPE_TOOLTIP]) t = T_TOOLTIP;
            else if (a == atom[A_NET_WM_WINDOW_TYPE_NOTIFICATION]) t = T_NOTIFICATION;
            else if (a == atom[A_NET_WM_WINDOW_TYPE_DND]) t = T_OTHER;
            else found = false;     /* a type we don't know: look at the next one */
        }
    }
    if (data) XFree(data);
    return t;
}

void read_title(Client *c)
{
    free(c->title); c->title = NULL;
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    if (XGetWindowProperty(dpy, c->win, atom[A_NET_WM_NAME], 0, 1024, False, atom[A_UTF8_STRING], &type, &fmt, &n, &after, &data) == Success
        && data && n) {
        c->title = strndup((char *)data, n);
        XFree(data);
        return;
    }
    if (data) XFree(data);
    XTextProperty tp;
    if (XGetWMName(dpy, c->win, &tp) && tp.value) {
        char **list = NULL; int cnt = 0;
        if (Xutf8TextPropertyToTextList(dpy, &tp, &list, &cnt) >= Success && cnt > 0 && list) {
            c->title = strdup(list[0]);
            XFreeStringList(list);
        } else c->title = strndup((char *)tp.value, tp.nitems);
        XFree(tp.value);
    }
}

void read_struts(Client *c)
{
    long s[12] = {0};
    c->has_strut = get_cardinals(c->win, atom[A_NET_WM_STRUT_PARTIAL], s, 12)
                || get_cardinals(c->win, atom[A_NET_WM_STRUT], s, 4);
    memcpy(c->strut, s, sizeof s);
}

void read_icon_geom(Client *c)
{
    c->has_icon_geom = get_cardinals(c->win, atom[A_NET_WM_ICON_GEOMETRY], c->icon_geom, 4) && c->icon_geom[2] > 0;
}

static void read_protocols(Client *c)
{
    Atom *p = NULL; int n = 0;
    c->can_delete = c->take_focus = false;
    if (XGetWMProtocols(dpy, c->win, &p, &n)) {
        for (int i = 0; i < n; i++) {
            if (p[i] == atom[A_WM_DELETE_WINDOW]) c->can_delete = true;
            if (p[i] == atom[A_WM_TAKE_FOCUS]) c->take_focus = true;
        }
        XFree(p);
    }
}

static void read_initial_state(Client *c)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    if (XGetWindowProperty(dpy, c->win, atom[A_NET_WM_STATE], 0, 32, False, XA_ATOM, &type, &fmt, &n, &after, &data) == Success && data) {
        for (unsigned long i = 0; i < n; i++) {
            Atom a = ((Atom *)data)[i];
            if (a == atom[A_NET_WM_STATE_FULLSCREEN]) c->fullscreen = true;
            else if (a == atom[A_NET_WM_STATE_MAXIMIZED_VERT]) c->maxv = true;
            else if (a == atom[A_NET_WM_STATE_MAXIMIZED_HORZ]) c->maxh = true;
            else if (a == atom[A_NET_WM_STATE_ABOVE]) c->above = true;
            else if (a == atom[A_NET_WM_STATE_BELOW]) c->below = true;
            else if (a == atom[A_NET_WM_STATE_STICKY]) c->sticky = true;
            else if (a == atom[A_NET_WM_STATE_SKIP_TASKBAR]) c->skip_taskbar = true;
            else if (a == atom[A_NET_WM_STATE_SKIP_PAGER]) c->skip_pager = true;
            else if (a == atom[A_NET_WM_STATE_MODAL]) c->modal = true;
        }
    }
    if (data) XFree(data);
    long d;
    if (get_cardinals(c->win, atom[A_NET_WM_DESKTOP], &d, 1) && (unsigned long)d == 0xFFFFFFFFUL) c->sticky = true;
}

static bool motif_undecorated(Window w)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    bool undecorated = false;
    if (XGetWindowProperty(dpy, w, atom[A_MOTIF_WM_HINTS], 0, 5, False, AnyPropertyType, &type, &fmt, &n, &after, &data) == Success
        && data && n >= 3 && fmt == 32) {
        long *h = (long *)data;
        if ((h[0] & 2) && !(h[2] & 1) && !(h[2] & 2)) undecorated = true;   /* decorations given, neither "all" nor "border" */
    }
    if (data) XFree(data);
    return undecorated;
}

/* ---------------------------------------------------------------- bookkeeping */
static void set_wm_state(Client *c, long state)
{
    long v[2] = { state, None };
    XChangeProperty(dpy, c->win, atom[A_WM_STATE], atom[A_WM_STATE], 32, PropModeReplace, (unsigned char *)v, 2);
}

void set_state_atoms(Client *c)
{
    Atom s[12]; int n = 0;
    if (c->iconic) s[n++] = atom[A_NET_WM_STATE_HIDDEN];
    if (c->fullscreen) s[n++] = atom[A_NET_WM_STATE_FULLSCREEN];
    if (c->maxv) s[n++] = atom[A_NET_WM_STATE_MAXIMIZED_VERT];
    if (c->maxh) s[n++] = atom[A_NET_WM_STATE_MAXIMIZED_HORZ];
    if (c->above) s[n++] = atom[A_NET_WM_STATE_ABOVE];
    if (c->below) s[n++] = atom[A_NET_WM_STATE_BELOW];
    if (c->sticky) s[n++] = atom[A_NET_WM_STATE_STICKY];
    if (c->skip_taskbar) s[n++] = atom[A_NET_WM_STATE_SKIP_TASKBAR];
    if (c->skip_pager) s[n++] = atom[A_NET_WM_STATE_SKIP_PAGER];
    if (c->modal) s[n++] = atom[A_NET_WM_STATE_MODAL];
    if (c->focused) s[n++] = atom[A_NET_WM_STATE_FOCUSED];
    XChangeProperty(dpy, c->win, atom[A_NET_WM_STATE], XA_ATOM, 32, PropModeReplace, (unsigned char *)s, n);
    long d = c->sticky ? (long)0xFFFFFFFFUL : 0;
    set_cardinals(c->win, atom[A_NET_WM_DESKTOP], &d, 1);
}

static void set_extents(Client *c)
{
    long e[4] = { ext_l(c), ext_r(c), ext_t(c), ext_b(c) };
    set_cardinals(c->win, atom[A_NET_FRAME_EXTENTS], e, 4);
}

static void set_allowed(Client *c)
{
    Atom a[8]; int n = 0;
    a[n++] = atom[A_NET_WM_ACTION_CLOSE];
    if (c->type == T_NORMAL || c->type == T_DIALOG || c->type == T_UTILITY || c->type == T_TOOLBAR) {
        if (!c->sheet) { a[n++] = atom[A_NET_WM_ACTION_MOVE]; a[n++] = atom[A_NET_WM_ACTION_ABOVE]; }
        a[n++] = atom[A_NET_WM_ACTION_RESIZE];
        if (!c->sheet) {
            a[n++] = atom[A_NET_WM_ACTION_MINIMIZE]; a[n++] = atom[A_NET_WM_ACTION_MAXIMIZE_HORZ];
            a[n++] = atom[A_NET_WM_ACTION_MAXIMIZE_VERT]; a[n++] = atom[A_NET_WM_ACTION_FULLSCREEN];
        }
    }
    XChangeProperty(dpy, c->win, atom[A_NET_WM_ALLOWED_ACTIONS], XA_ATOM, 32, PropModeReplace, (unsigned char *)a, n);
}

static void grab_buttons(Client *c)
{
    XUngrabButton(dpy, AnyButton, AnyModifier, c->win);
    if (c->type == T_DOCK) return;      /* the desktop does take the keyboard when clicked (renaming, typing to find) */
    if (!c->focused)
        XGrabButton(dpy, AnyButton, AnyModifier, c->win, False, ButtonPressMask, GrabModeSync, GrabModeAsync, None, None);
    else if (!c->sheet) {
        XGrabButton(dpy, Button1, Mod1Mask, c->win, False, ButtonPressMask, GrabModeAsync, GrabModeAsync, None, None);
        XGrabButton(dpy, Button3, Mod1Mask, c->win, False, ButtonPressMask, GrabModeAsync, GrabModeAsync, None, None);
    }
}

static Client *owner_of(Client *c)
{
    return c->transient ? find_client(c->transient) : NULL;
}

/* ---------------------------------------------------------------- geometry */
static void shape_frame(Client *c, int fw, int fh)
{
    /* without effects there is no see-through: cut the rounded top corners out of the frame instead */
    if (composite_on || !c->framed) return;
    if (c->fullscreen) { XShapeCombineMask(dpy, c->frame, ShapeBounding, 0, 0, None, ShapeSet); return; }
    XRectangle r[64]; int n = 0;
    for (int y = 0; y < CR && n < 63; y++) {
        double dy = CR - y - 0.5;
        int inset = (int)(CR - __builtin_sqrt((double)CR * CR - dy * dy) + 0.5);
        r[n++] = (XRectangle){ (short)inset, (short)y, (unsigned short)(fw - 2 * inset), 1 };
    }
    r[n++] = (XRectangle){ 0, (short)CR, (unsigned short)fw, (unsigned short)(fh - CR) };
    XShapeCombineRectangles(dpy, c->frame, ShapeBounding, 0, 0, r, n, ShapeSet, Unsorted);
}

void configure_notify(Client *c)
{
    XConfigureEvent ce = {0};
    ce.type = ConfigureNotify; ce.display = dpy; ce.event = c->win; ce.window = c->win;
    ce.x = c->fullscreen ? 0 : c->x; ce.y = c->fullscreen ? 0 : c->y;
    ce.width = c->fullscreen ? sw_screen : c->w; ce.height = c->fullscreen ? sh_screen : c->h;
    ce.border_width = 0; ce.above = None; ce.override_redirect = False;
    XSendEvent(dpy, c->win, False, StructureNotifyMask, (XEvent *)&ce);
}

void apply_geometry(Client *c)
{
    static int last_fw;
    if (c->w < 1) c->w = 1;
    if (c->h < 1) c->h = 1;
    if (!c->framed) {
        if (c->fullscreen) XMoveResizeWindow(dpy, c->win, 0, 0, sw_screen, sh_screen);
        else XMoveResizeWindow(dpy, c->win, c->x, c->y, c->w, c->h);
        configure_notify(c);
        if (!c->sheet) attach_sheets_of(c);
        return;
    }
    int m = margin(c);
    int fx, fy, fw, fh, cx, cy, cw, ch;
    if (c->fullscreen) {
        fx = 0; fy = 0; fw = sw_screen; fh = sh_screen; cx = 0; cy = 0; cw = fw; ch = fh;
    } else {
        fx = c->x - BW - m; fy = c->y - TB - m;
        fw = c->w + 2 * BW + 2 * m; fh = c->h + TB + BW + 2 * m;
        cx = m + BW; cy = m + TB; cw = c->w; ch = c->h;
    }
    XWindowAttributes wa;
    bool resized = !XGetWindowAttributes(dpy, c->frame, &wa) || wa.width != fw || wa.height != fh;
    XMoveResizeWindow(dpy, c->frame, fx, fy, fw, fh);
    XMoveResizeWindow(dpy, c->win, cx, cy, cw, ch);
    if (resized) { shape_frame(c, fw, fh); deco_draw(c); }
    last_fw = fw; (void)last_fw;
    configure_notify(c);
    attach_sheets_of(c);
}

/* Keep title bars below the menu bar, and ordinary windows no larger than the work area. */
bool keep_in_workarea(Client *c)
{
    if (c->fullscreen || c->sheet || c->type == T_DOCK || c->type == T_DESKTOP || c->type == T_MENU
        || c->type == T_TOOLTIP || c->type == T_NOTIFICATION || c->type == T_SPLASH || c->type == T_OTHER) return false;
    bool changed = false;
    int top = c->y - ext_t(c);
    /* which row of screens is it in (0 = the one shown) */
    int row = top >= 0 ? top / sh_screen : -((-top + sh_screen - 1) / sh_screen);
    int rtop = row * sh_screen;
    if (top < rtop + wa_y && top > rtop - c->h) { c->y = rtop + wa_y + ext_t(c); changed = true; }
    if (c->type == T_NORMAL || c->type == T_DIALOG) {
        int maxw = wa_w - ext_l(c) - ext_r(c), maxh = wa_h - ext_t(c) - ext_b(c);
        if (c->w > maxw) { c->w = maxw; changed = true; }
        if (c->h > maxh) { c->h = maxh; changed = true; }
    }
    return changed;
}

static void save_geom(Client *c)
{
    if (c->saved) return;
    c->sx = c->x; c->sy = c->y; c->sw = c->w; c->sh = c->h; c->saved = true;
}

static void restore_geom(Client *c)
{
    if (!c->saved) return;
    c->x = c->sx; c->y = c->sy; c->w = c->sw; c->h = c->sh; c->saved = false;
}

/* the work area of the screen the window is on, in window coordinates (the client area inside the frame) */
static void fit_area(Client *c, int *x, int *y, int *w, int *h)
{
    int cx = c->x + c->w / 2, cy = c->y + c->h / 2;
    int col = cx >= 0 ? cx / sw_screen : -((-cx + sw_screen - 1) / sw_screen);
    int row = cy >= 0 ? cy / sh_screen : -((-cy + sh_screen - 1) / sh_screen);
    *x = col * sw_screen + wa_x + ext_l(c);
    *y = row * sh_screen + wa_y + ext_t(c);
    *w = wa_w - ext_l(c) - ext_r(c);
    *h = wa_h - ext_t(c) - ext_b(c);
}

void set_maximized(Client *c, bool v, bool h)
{
    if (c->sheet || c->type == T_DOCK || c->type == T_DESKTOP) return;
    if (c->fullscreen) set_fullscreen(c, false);
    if (!v && !h) {
        c->maxv = c->maxh = false; c->snapped = false;
        restore_geom(c);
    } else {
        save_geom(c);
        int x, y, w, hh; fit_area(c, &x, &y, &w, &hh);
        if (h) { c->x = x; c->w = w; }
        if (v) { c->y = y; c->h = hh; }
        c->maxv = v; c->maxh = h; c->snapped = false;
    }
    set_state_atoms(c);
    apply_geometry(c);
    if (c->framed) deco_draw(c);
}

void set_fullscreen(Client *c, bool on)
{
    if (on == c->fullscreen || c->sheet) return;
    if (on) {
        save_geom(c);
        /* full screen on the screen the window is on: bring that screen up first */
        int cx = c->x + c->w / 2, cy = c->y + c->h / 2;
        if (cx < 0 || cx >= sw_screen || cy < 0 || cy >= sh_screen) {
            int col = cx >= 0 ? cx / sw_screen : -((-cx + sw_screen - 1) / sw_screen);
            int row = cy >= 0 ? cy / sh_screen : -((-cy + sh_screen - 1) / sh_screen);
            set_viewport(vp_x + col, vp_y + row);
        }
        c->fullscreen = true;
    } else {
        c->fullscreen = false;
        if (c->maxv || c->maxh) { bool v = c->maxv, h = c->maxh; c->saved = true; set_maximized(c, v, h); }
        else restore_geom(c);
    }
    set_extents(c);
    set_state_atoms(c);
    apply_geometry(c);
    restack();
}

/* ---------------------------------------------------------------- stacking and focus */
static int layer(Client *c)
{
    if (c->type == T_DESKTOP) return 0;
    if (c->fullscreen && c->focused) return 5;
    if (c->type == T_NOTIFICATION || c->type == T_TOOLTIP || c->type == T_MENU) return 6;
    if (c->type == T_DOCK) return 4;
    if (c->above || c->type == T_SPLASH) return 3;
    if (c->below) return 1;
    return 2;
}

static void add_with_children(Client **out, int *n, Client *c, bool *done, Client **all, int count)
{
    for (int i = 0; i < count; i++) if (all[i] == c) { if (done[i]) return; done[i] = true; }
    out[(*n)++] = c;
    for (int i = 0; i < count; i++)
        if (!done[i] && all[i]->transient && all[i]->transient == c->win) add_with_children(out, n, all[i], done, all, count);
}

void restack(void)
{
    int count = 0;
    for (Client *c = clients; c; c = c->next) count++;
    if (!count) return;
    Client **all = malloc(count * sizeof *all), **order = malloc(count * sizeof *order);
    bool *done = calloc(count, sizeof *done);
    int i = 0, n = 0;
    for (Client *c = clients; c; c = c->next) all[i++] = c;
    for (int l = 0; l <= 6; l++)
        for (i = 0; i < count; i++) {
            Client *c = all[i];
            if (done[i] || layer(c) != l) continue;
            if (owner_of(c) && owner_of(c) != c) continue;      /* goes with its owner */
            add_with_children(order, &n, c, done, all, count);
        }
    for (i = 0; i < count; i++) if (!done[i]) order[n++] = all[i];   /* owners that went away, loops */
    /* the list is kept bottom to top */
    clients = order[0];
    for (i = 0; i < n - 1; i++) order[i]->next = order[i + 1];
    order[n - 1]->next = NULL;
    Window *wins = malloc(n * sizeof(Window));
    for (i = 0; i < n; i++) wins[i] = top_of(order[n - 1 - i]);
    XRaiseWindow(dpy, wins[0]);
    XRestackWindows(dpy, wins, n);
    free(wins); free(all); free(order); free(done);
    update_client_list();
    request_repaint();
}

void raise_client(Client *c)
{
    /* the window goes to the end of the list (the top), then restack sorts it into its layer */
    Client **pp = &clients;
    while (*pp && *pp != c) pp = &(*pp)->next;
    if (!*pp) return;
    *pp = c->next;
    Client *t = clients;
    if (!t) { clients = c; c->next = NULL; }
    else { while (t->next) t = t->next; t->next = c; c->next = NULL; }
    restack();
}

static Client *sheet_of(Client *c)
{
    for (Client *s = clients; s; s = s->next) if (s->sheet && s->transient == c->win && s->mapped && !s->iconic) return s;
    return NULL;
}

void focus_client(Client *c, Time t)
{
    if (c && (c->type == T_DOCK || c->iconic || !c->mapped)) return;
    /* a window with a sheet open gives the keyboard to the sheet */
    if (c) { Client *s; int guard = 0; while ((s = sheet_of(c)) && guard++ < 8) c = s; }
    Client *old = focused_client();
    if (old && old != c) {
        old->focused = false;
        set_state_atoms(old); grab_buttons(old);
        if (old->framed) deco_draw(old);
        Client *o = owner_of(old);
        if (old->sheet && o && o->framed) deco_draw(o);
    }
    if (!c) {
        XSetInputFocus(dpy, wmcheck, RevertToPointerRoot, t);
        Window none = None;
        XChangeProperty(dpy, root, atom[A_NET_ACTIVE_WINDOW], XA_WINDOW, 32, PropModeReplace, (unsigned char *)&none, 1);
        return;
    }
    c->focused = true;
    if (c->input_hint || !c->take_focus) XSetInputFocus(dpy, c->win, RevertToPointerRoot, t);
    if (c->take_focus) {
        XEvent ev = {0};
        ev.xclient.type = ClientMessage; ev.xclient.window = c->win; ev.xclient.message_type = atom[A_WM_PROTOCOLS];
        ev.xclient.format = 32; ev.xclient.data.l[0] = atom[A_WM_TAKE_FOCUS]; ev.xclient.data.l[1] = t;
        XSendEvent(dpy, c->win, False, NoEventMask, &ev);
    }
    /* the menu bar names the app in front: for a sheet that is still the window it hangs on */
    Client *shown = c;
    if (c->sheet && owner_of(c)) shown = owner_of(c);
    XChangeProperty(dpy, root, atom[A_NET_ACTIVE_WINDOW], XA_WINDOW, 32, PropModeReplace, (unsigned char *)&c->win, 1);
    (void)shown;
    set_state_atoms(c); grab_buttons(c);
    if (c->framed) deco_draw(c);
    Client *o = owner_of(c);
    if (c->sheet && o && o->framed) deco_draw(o);
    if (c->fullscreen) restack();
}

static bool on_screen(Client *c)
{
    return c->x + c->w > 0 && c->x < sw_screen && c->y + c->h > 0 && c->y < sh_screen;
}

void cycle_focus(bool backwards)
{
    /* the topmost ordinary window on this screen (the list is bottom to top) */
    Client *pick = NULL, *cur = focused_client();
    for (Client *c = clients; c; c = c->next) {
        if (c == cur && backwards) continue;
        if (c->iconic || !c->mapped || c->type == T_DOCK || c->type == T_DESKTOP || c->type == T_MENU
            || c->type == T_TOOLTIP || c->type == T_NOTIFICATION || c->type == T_SPLASH || c->type == T_OTHER) continue;
        if (!on_screen(c) && !c->sticky) continue;
        pick = c;
    }
    if (!pick)
        for (Client *c = clients; c; c = c->next) if (c->type == T_DESKTOP && c->mapped) pick = c;
    focus_client(pick, CurrentTime);
}

/* ---------------------------------------------------------------- sheets */
static int sheet_top(Client *p)
{
    long v;
    if (get_cardinals(p->win, a_sheet_top, &v, 1) && v >= 0 && v < p->h / 2) return (int)v;
    return 0;
}

void attach_sheets_of(Client *parent)
{
    for (Client *s = clients; s; s = s->next) {
        if (!s->sheet) continue;
        Client *p = owner_of(s);
        if (!p || (parent && p != parent)) continue;
        int px = p->fullscreen ? 0 : p->x, py = p->fullscreen ? 0 : p->y, pw = p->fullscreen ? sw_screen : p->w;
        int nx = px + (pw - s->w) / 2, ny = py + (p->fullscreen ? 0 : sheet_top(p));
        if (nx != s->x || ny != s->y) {
            s->x = nx; s->y = ny;
            XMoveWindow(dpy, s->win, s->x, s->y);
            configure_notify(s);
        }
    }
}

/* ---------------------------------------------------------------- managing */
static void place(Client *c, XWindowAttributes *wa, bool startup)
{
    XSizeHints h; long sup = 0;
    bool user_pos = false;
    if (XGetWMNormalHints(dpy, c->win, &h, &sup)) {
        if (h.flags & PMinSize) { c->min_w = h.min_width; c->min_h = h.min_height; }
        if (h.flags & PMaxSize) { c->max_w = h.max_width; c->max_h = h.max_height; }
        user_pos = (h.flags & USPosition) || ((h.flags & PPosition) && (wa->x || wa->y));
    }
    c->x = wa->x; c->y = wa->y; c->w = wa->width; c->h = wa->height;
    if (startup) {
        /* already on screen (a window manager before us put it back on the root where it was) */
        keep_in_workarea(c);
        return;
    }
    if (c->type == T_DOCK || c->type == T_DESKTOP || c->type == T_MENU || c->type == T_TOOLTIP
        || c->type == T_NOTIFICATION || c->type == T_OTHER || c->sheet) return;
    Client *p = owner_of(c);
    if (p && !user_pos) {
        /* centred over the window it belongs to */
        c->x = p->x + (p->w - c->w) / 2;
        c->y = p->y + (p->h - c->h) / 3;
    } else if (!user_pos) {
        int ww = c->w + ext_l(c) + ext_r(c), hh = c->h + ext_t(c) + ext_b(c);
        if (ww > wa_w) { c->w = wa_w - ext_l(c) - ext_r(c); ww = wa_w; }
        if (hh > wa_h) { c->h = wa_h - ext_t(c) - ext_b(c); hh = wa_h; }
        c->x = wa_x + (wa_w - ww) / 2 + ext_l(c);
        c->y = wa_y + (wa_h - hh) / 3 + ext_t(c);
        /* don't land exactly on top of another window of the same size */
        for (int tries = 0; tries < 10; tries++) {
            bool clash = false;
            for (Client *o = clients; o; o = o->next)
                if (o != c && o->mapped && !o->iconic && o->x == c->x && o->y == c->y) clash = true;
            if (!clash) break;
            c->x += TB; c->y += TB;
        }
    } else {
        c->x += ext_l(c); c->y += ext_t(c);
    }
    keep_in_workarea(c);
}

static bool is_sheet(Client *c)
{
    Client *p = owner_of(c);
    if (!p || p->sheet || p->type == T_DESKTOP || p->type == T_DOCK) return false;
    return c->type == T_DIALOG || c->modal;
}

Client *manage(Window w, bool startup)
{
    init_once();
    XWindowAttributes wa;
    if (w == wmcheck || !XGetWindowAttributes(dpy, w, &wa) || wa.override_redirect || wa.class == InputOnly) return NULL;
    if (find_client(w)) return find_client(w);

    Client *c = calloc(1, sizeof *c);
    c->win = w;
    c->type = read_type(w);
    Window t = 0;
    if (XGetTransientForHint(dpy, w, &t) && t && t != w && t != root) c->transient = t;
    if (c->transient && c->type == T_NORMAL) c->type = T_DIALOG;
    read_initial_state(c);
    read_title(c);
    read_protocols(c);
    read_struts(c);
    read_icon_geom(c);
    long pid;
    if (get_cardinals(w, atom[A_NET_WM_PID], &pid, 1)) c->pid = pid;
    XWMHints *hints = XGetWMHints(dpy, w);
    c->input_hint = true;
    bool start_iconic = false;
    if (hints) {
        if (hints->flags & InputHint) c->input_hint = hints->input;
        if ((hints->flags & StateHint) && hints->initial_state == IconicState) start_iconic = true;
        XFree(hints);
    }
    if (startup) {
        long st[2];
        start_iconic = get_cardinals(w, atom[A_WM_STATE], st, 1) && st[0] == IconicState;
    }
    c->decorated = !motif_undecorated(w);
    c->sheet = is_sheet(c);
    c->framed = c->decorated && !c->sheet && (c->type == T_NORMAL || c->type == T_DIALOG || c->type == T_UTILITY);
    if (c->type == T_DESKTOP || c->type == T_DOCK) c->sticky = true;

    /* last in the list = top */
    Client **pp = &clients;
    while (*pp) pp = &(*pp)->next;
    *pp = c;

    place(c, &wa, startup);
    bool full = c->fullscreen; c->fullscreen = false;
    if (c->maxv || c->maxh) { bool v = c->maxv, h = c->maxh; c->maxv = c->maxh = false; set_maximized(c, v, h); }

    XSelectInput(dpy, w, PropertyChangeMask | FocusChangeMask);   /* map/unmap come via the frame or the root */
    XAddToSaveSet(dpy, w);
    XSetWindowBorderWidth(dpy, w, 0);
    if (c->framed) {
        XSetWindowAttributes sa = {0};
        unsigned long mask = CWEventMask | CWBackPixmap | CWBorderPixel | CWBitGravity;
        sa.background_pixmap = None; sa.border_pixel = 0; sa.bit_gravity = NorthWestGravity;
        sa.event_mask = SubstructureRedirectMask | SubstructureNotifyMask | ButtonPressMask | ButtonReleaseMask
                      | PointerMotionMask | EnterWindowMask | LeaveWindowMask | ExposureMask;
        Visual *vis = CopyFromParent; int depth = CopyFromParent;
        if (argb_visual) { vis = argb_visual; depth = 32; sa.colormap = argb_cmap; mask |= CWColormap; }
        int m = margin(c);
        c->frame = XCreateWindow(dpy, root, c->x - BW - m, c->y - TB - m, c->w + 2 * BW + 2 * m, c->h + TB + BW + 2 * m,
                                 0, depth, InputOutput, vis, mask, &sa);
        if (wa.map_state == IsViewable) c->ignore_unmaps++;      /* reparenting unmaps it once */
        XReparentWindow(dpy, w, c->frame, m + BW, m + TB);
    }
    if (c->sheet) XChangeProperty(dpy, w, a_sheet, XA_CARDINAL, 32, PropModeReplace, (unsigned char *)&(long){1}, 1);
    set_extents(c);
    set_allowed(c);
    grab_buttons(c);
    if (full) set_fullscreen(c, true);
    else apply_geometry(c);
    if (c->sheet) attach_sheets_of(owner_of(c));

    if (start_iconic && !c->sheet) {
        c->iconic = true; c->mapped = true;
        set_wm_state(c, IconicState);
    } else {
        XMapWindow(dpy, w);
        if (c->framed) XMapWindow(dpy, c->frame);
        c->mapped = true;
        set_wm_state(c, NormalState);
        if (composite_on && !startup) {
            if (c->sheet) comp_sheet_open(c);
            else if (c->type == T_NORMAL || c->type == T_DIALOG || c->type == T_UTILITY) comp_window_fade_in(top_of(c));
        }
    }
    set_state_atoms(c);
    if (c->has_strut) update_workarea();
    restack();
    if (!startup && !c->iconic && c->type != T_DOCK && c->type != T_DESKTOP && c->type != T_NOTIFICATION
        && c->type != T_TOOLTIP && c->type != T_MENU && c->type != T_SPLASH && c->type != T_OTHER)
        focus_client(c, CurrentTime);
    LOG("manage 0x%lx \"%s\" type %d%s%s", w, c->title ? c->title : "", c->type, c->framed ? " framed" : "", c->sheet ? " sheet" : "");
    return c;
}

void unmanage(Client *c, bool destroyed)
{
    bool was_focused = c->focused, had_strut = c->has_strut;
    if (drag.c == c) { XUngrabPointer(dpy, CurrentTime); drag.c = NULL; drag.mode = 0; }
    if (last_click_client == c) last_click_client = NULL;
    if (!destroyed) {
        XGrabServer(dpy);
        XUngrabButton(dpy, AnyButton, AnyModifier, c->win);
        XSelectInput(dpy, c->win, NoEventMask);
        set_wm_state(c, WithdrawnState);
        XDeleteProperty(dpy, c->win, atom[A_NET_WM_STATE]);
        XDeleteProperty(dpy, c->win, atom[A_NET_WM_DESKTOP]);
        if (c->framed) XReparentWindow(dpy, c->win, root, c->x, c->y);
        XRemoveFromSaveSet(dpy, c->win);
        XUngrabServer(dpy);
    }
    if (c->frame) XDestroyWindow(dpy, c->frame);
    Client **pp = &clients;
    while (*pp && *pp != c) pp = &(*pp)->next;
    if (*pp) *pp = c->next;
    /* its sheets lose their window: let them stand alone where they are */
    for (Client *s = clients; s; s = s->next)
        if (s->transient == c->win) { s->transient = 0; if (s->sheet) { s->sheet = false; } }
    Window owner = c->transient;
    LOG("unmanage 0x%lx", c->win);
    free(c->title);
    free(c);
    if (had_strut) update_workarea();
    update_client_list();
    if (was_focused) {
        Client *o = find_client(owner);
        if (o && o->mapped && !o->iconic) focus_client(o, CurrentTime);
        else cycle_focus(false);
    }
    request_repaint();
}

/* ---------------------------------------------------------------- minimising */
static void hide_now(Client *c)
{
    if (!c->iconic) return;          /* restored while the lamp was still pouring */
    if (c->framed) XUnmapWindow(dpy, c->frame);
    c->ignore_unmaps++;
    XUnmapWindow(dpy, c->win);
    for (Client *s = clients; s; s = s->next)
        if (s->sheet && s->transient == c->win && s->mapped) { s->ignore_unmaps++; XUnmapWindow(dpy, s->win); }
}

void minimize(Client *c)
{
    if (c->iconic || c->type == T_DOCK || c->type == T_DESKTOP) return;
    if (c->sheet) { Client *o = owner_of(c); if (o) minimize(o); return; }
    c->iconic = true;
    set_wm_state(c, IconicState);
    set_state_atoms(c);
    if (c->focused) { c->focused = false; set_state_atoms(c); grab_buttons(c); cycle_focus(false); }
    for (Client *s = clients; s; s = s->next) if (s->sheet && s->transient == c->win && s->focused) {
        s->focused = false; set_state_atoms(s); grab_buttons(s);
    }
    if (composite_on) { read_icon_geom(c); comp_minimize(c, false, hide_now); }
    else hide_now(c);
}

void restore(Client *c)
{
    if (!c->iconic) return;
    c->iconic = false;
    XMapWindow(dpy, c->win);
    if (c->framed) XMapWindow(dpy, c->frame);
    for (Client *s = clients; s; s = s->next) if (s->sheet && s->transient == c->win) XMapWindow(dpy, s->win);
    set_wm_state(c, NormalState);
    set_state_atoms(c);
    if (composite_on) { read_icon_geom(c); comp_minimize(c, true, NULL); }
    raise_client(c);
    focus_client(c, CurrentTime);
}

void close_client(Client *c)
{
    if (c->can_delete) {
        XEvent ev = {0};
        ev.xclient.type = ClientMessage; ev.xclient.window = c->win; ev.xclient.message_type = atom[A_WM_PROTOCOLS];
        ev.xclient.format = 32; ev.xclient.data.l[0] = atom[A_WM_DELETE_WINDOW]; ev.xclient.data.l[1] = CurrentTime;
        XSendEvent(dpy, c->win, False, NoEventMask, &ev);
    } else {
        XKillClient(dpy, c->win);
    }
}

void handle_net_state(Client *c, long action, Atom a1, Atom a2)
{
    Atom as[2] = { a1, a2 };
    bool want_v = c->maxv, want_h = c->maxh, max_changed = false;
#define FLIP(cur) (action == 2 ? !(cur) : action == 1)
    for (int i = 0; i < 2; i++) {
        Atom a = as[i];
        if (!a) continue;
        if (a == atom[A_NET_WM_STATE_FULLSCREEN]) set_fullscreen(c, FLIP(c->fullscreen));
        else if (a == atom[A_NET_WM_STATE_MAXIMIZED_VERT]) { want_v = FLIP(c->maxv); max_changed = true; }
        else if (a == atom[A_NET_WM_STATE_MAXIMIZED_HORZ]) { want_h = FLIP(c->maxh); max_changed = true; }
        else if (a == atom[A_NET_WM_STATE_ABOVE]) { c->above = FLIP(c->above); if (c->above) c->below = false; restack(); }
        else if (a == atom[A_NET_WM_STATE_BELOW]) { c->below = FLIP(c->below); if (c->below) c->above = false; restack(); }
        else if (a == atom[A_NET_WM_STATE_STICKY]) c->sticky = FLIP(c->sticky);
        else if (a == atom[A_NET_WM_STATE_SKIP_TASKBAR]) c->skip_taskbar = FLIP(c->skip_taskbar);
        else if (a == atom[A_NET_WM_STATE_SKIP_PAGER]) c->skip_pager = FLIP(c->skip_pager);
        else if (a == atom[A_NET_WM_STATE_MODAL]) c->modal = FLIP(c->modal);
        else if (a == atom[A_NET_WM_STATE_HIDDEN]) { if (FLIP(c->iconic)) minimize(c); else restore(c); }
    }
#undef FLIP
    if (max_changed && (want_v != c->maxv || want_h != c->maxh)) set_maximized(c, want_v, want_h);
    set_state_atoms(c);
}

/* ---------------------------------------------------------------- the pointer */
static int edges_at(Client *c, int fx, int fy)
{
    if (!c->framed || c->fullscreen || (c->maxv && c->maxh)) return 0;
    XWindowAttributes wa;
    if (!XGetWindowAttributes(dpy, c->frame, &wa)) return 0;
    int m = margin(c), g = m + BW + (int)(3 * scale), corner = (int)(16 * scale) + m;
    int e = 0;
    if (fx < g) e |= E_L;
    else if (fx >= wa.width - g) e |= E_R;
    if (fy < m + (int)(3 * scale)) e |= E_T;
    else if (fy >= wa.height - g) e |= E_B;
    /* near a corner along an edge counts as the corner */
    if (e == E_L || e == E_R) { if (fy < corner) e |= E_T; else if (fy >= wa.height - corner) e |= E_B; }
    if (e == E_T || e == E_B) { if (fx < corner) e |= E_L; else if (fx >= wa.width - corner) e |= E_R; }
    return e;
}

/* grab: take the pointer (a drag the app asked for, or Alt-drag). A drag started on our own frame already has
   the pointer until the button comes up. */
static void begin(Client *c, int mode, int dir, int px, int py, bool grab)
{
    drag.c = c; drag.mode = mode; drag.dir = dir; drag.px = px; drag.py = py;
    drag.ox = c->x; drag.oy = c->y; drag.ow = c->w; drag.oh = c->h;
    drag.started = false; drag.snap = false;
    Cursor cur = mode == 1 ? cur_move : cur_edge[dir & 15] ? cur_edge[dir & 15] : cur_move;
    if (grab)
        XGrabPointer(dpy, root, False, ButtonPressMask | ButtonReleaseMask | PointerMotionMask, GrabModeAsync, GrabModeAsync,
                     None, mode == 1 ? None : cur, CurrentTime);
    else if (mode == 2 && cur) XChangeActivePointerGrab(dpy, ButtonPressMask | ButtonReleaseMask | PointerMotionMask, cur, CurrentTime);
}

void start_moveresize(Client *c, int direction, int rx, int ry, int button)
{
    (void)button;
    if (c->sheet || c->fullscreen || c->type == T_DOCK || c->type == T_DESKTOP) return;
    static const int dirs[8] = { E_T | E_L, E_T, E_T | E_R, E_R, E_B | E_R, E_B, E_B | E_L, E_L };
    if (direction == 11) { if (drag.c == c) { XUngrabPointer(dpy, CurrentTime); drag.c = NULL; drag.mode = 0; } return; }
    raise_client(c);
    focus_client(c, CurrentTime);
    if (direction == 8 || direction == 10) begin(c, 1, 0, rx, ry, true);
    else if (direction >= 0 && direction < 8) begin(c, 2, dirs[direction], rx, ry, true);
    else return;
    drag.started = true;
}

static void title_double_click(Client *c)
{
    if (c->maxv && c->maxh) set_maximized(c, false, false);
    else set_maximized(c, true, true);
}

void handle_button(XButtonEvent *e)
{
    Client *c = find_client(e->window);
    LOG("press 0x%lx (%d,%d) button %d time %lu drag %d", e->window, e->x, e->y, e->button, e->time, drag.mode);
    if (drag.mode) return;
    if (!c) { XAllowEvents(dpy, ReplayPointer, e->time); return; }
    if (e->window == c->win) {
        /* a click into an app: bring it forward, then let the app have the click */
        if (!c->focused || layer(c) == 2) { raise_client(c); focus_client(c, e->time); }
        if ((e->state & Mod1Mask) && !c->sheet && !c->fullscreen && (e->button == Button1 || e->button == Button3)) {
            XAllowEvents(dpy, AsyncPointer, e->time);
            if (e->button == Button1) begin(c, 1, 0, e->x_root, e->y_root, true);
            else {
                int dir = (e->x_root < c->x + c->w / 2 ? E_L : E_R) | (e->y_root < c->y + c->h / 2 ? E_T : E_B);
                begin(c, 2, dir, e->x_root, e->y_root, true);
            }
            return;
        }
        XAllowEvents(dpy, ReplayPointer, e->time);
        return;
    }
    /* on our frame */
    raise_client(c);
    focus_client(c, e->time);
    if (e->button != Button1) return;
    int edge = edges_at(c, e->x, e->y);
    if (edge) { begin(c, 2, edge, e->x_root, e->y_root, false); return; }
    int b = deco_button_at(c, e->x, e->y);
    if (b) { c->pressed = b; deco_draw(c); return; }
    if (e->y < margin(c) + TB) {
        if (last_click_client == c && e->time - last_click < 400) {
            last_click_client = NULL;
            title_double_click(c);
            return;
        }
        last_click = e->time; last_click_client = c;
        begin(c, 1, 0, e->x_root, e->y_root, false);
    }
}

bool snap_preview(int *x, int *y, int *w, int *h)
{
    if (!drag.c || drag.mode != 1 || !drag.snap) return false;
    *x = drag.snx; *y = drag.sny; *w = drag.snw; *h = drag.snh;
    return true;
}

/* where a window dropped with the pointer at (px, py) snaps to, in frame (outer) coordinates */
static bool snap_target(int px, int py, int *x, int *y, int *w, int *h)
{
    int zone = (int)(48 * scale), edge = SNAP_EDGE;
    bool left = px <= edge, right = px >= sw_screen - 1 - edge, top = py <= edge;
    bool upper = py < wa_y + zone, lower = py >= sh_screen - zone;
    *x = wa_x; *y = wa_y; *w = wa_w; *h = wa_h;
    if ((left || right) && (upper || lower)) {
        *w = wa_w / 2; *h = wa_h / 2;
        if (right) *x = wa_x + wa_w - *w;
        if (lower) *y = wa_y + wa_h - *h;
        return true;
    }
    if (left || right) { *w = wa_w / 2; if (right) *x = wa_x + wa_w - *w; return true; }
    if (top) return true;
    return false;
}

void handle_motion(XMotionEvent *e)
{
    if (drag.c && drag.mode) {
        Client *c = drag.c;
        int dx = e->x_root - drag.px, dy = e->y_root - drag.py;
        if (!drag.started) {
            if (abs(dx) < 4 && abs(dy) < 4) return;
            drag.started = true;
            if (drag.mode == 1 && (c->maxv || c->maxh || c->snapped) && c->saved) {
                /* pulling a maximised or snapped window away gives it back its size, under the pointer */
                double rel = c->w ? (double)(drag.px - c->x) / c->w : 0.5;
                c->maxv = c->maxh = false; c->snapped = false;
                int nw = c->sw, nh = c->sh;
                c->saved = false;
                c->w = nw; c->h = nh;
                c->x = drag.px - (int)(rel * nw);
                set_state_atoms(c);
                if (c->framed) deco_draw(c);
                drag.ox = c->x; drag.oy = c->y; drag.ow = c->w; drag.oh = c->h;
            }
        }
        if (drag.mode == 1) {
            c->x = drag.ox + dx; c->y = drag.oy + dy;
            int minty = wa_y + ext_t(c);         /* the title bar stays below the menu bar */
            if (c->y < minty && c->y > minty - sh_screen / 2) c->y = minty;
            int sx, sy, sw, sh;
            bool s = snap_target(e->x_root, e->y_root, &sx, &sy, &sw, &sh);
            if (s != drag.snap || (s && (sx != drag.snx || sy != drag.sny || sw != drag.snw || sh != drag.snh))) {
                drag.snap = s; drag.snx = sx; drag.sny = sy; drag.snw = sw; drag.snh = sh;
                request_repaint();
            }
        } else {
            int x = drag.ox, y = drag.oy, w = drag.ow, h = drag.oh;
            int minw = c->min_w > 0 ? c->min_w : (int)(120 * scale), minh = c->min_h > 0 ? c->min_h : (int)(40 * scale);
            int maxw = c->max_w > 0 ? c->max_w : 1 << 15, maxh = c->max_h > 0 ? c->max_h : 1 << 15;
            if (drag.dir & E_R) w = drag.ow + dx;
            if (drag.dir & E_B) h = drag.oh + dy;
            if (drag.dir & E_L) w = drag.ow - dx;
            if (drag.dir & E_T) h = drag.oh - dy;
            if (w < minw) w = minw;
            if (h < minh) h = minh;
            if (w > maxw) w = maxw;
            if (h > maxh) h = maxh;
            if (drag.dir & E_L) x = drag.ox + drag.ow - w;
            if (drag.dir & E_T) {
                y = drag.oy + drag.oh - h;
                if (y < wa_y + ext_t(c)) { h -= wa_y + ext_t(c) - y; y = wa_y + ext_t(c); }
            }
            c->x = x; c->y = y; c->w = w; c->h = h;
            if (c->maxv || c->maxh || c->snapped) { c->maxv = c->maxh = c->snapped = false; c->saved = false; set_state_atoms(c); }
        }
        apply_geometry(c);
        request_repaint();
        return;
    }
    Client *c = find_client(e->window);
    if (!c || e->window != c->frame) return;
    int edge = edges_at(c, e->x, e->y);
    XDefineCursor(dpy, c->frame, edge && cur_edge[edge] ? cur_edge[edge] : cur_arrow);
    int b = deco_button_at(c, e->x, e->y);
    int hov = b ? b : (e->y < margin(c) + TB && e->x < margin(c) + (int)(70 * scale) ? -1 : 0);
    if (c->pressed) hov = b == c->pressed ? b : 0;
    if (hov != c->hover) { c->hover = hov; deco_draw(c); }
}

void handle_release(XButtonEvent *e)
{
    if (drag.c && drag.mode) {
        Client *c = drag.c;
        XUngrabPointer(dpy, CurrentTime);
        if (drag.mode == 1 && drag.snap) {
            save_geom(c);
            bool full = drag.snx == wa_x && drag.sny == wa_y && drag.snw == wa_w && drag.snh == wa_h;
            if (full) { c->x = drag.ox; c->y = drag.oy; set_maximized(c, true, true); }
            else {
                c->x = drag.snx + ext_l(c); c->y = drag.sny + ext_t(c);
                c->w = drag.snw - ext_l(c) - ext_r(c); c->h = drag.snh - ext_t(c) - ext_b(c);
                c->snapped = true;
                apply_geometry(c);
            }
        }
        drag.c = NULL; drag.mode = 0; drag.snap = false;
        configure_notify(c);
        request_repaint();
        return;
    }
    Client *c = find_client(e->window);
    if (!c || !c->pressed) return;
    int b = deco_button_at(c, e->x, e->y), was = c->pressed;
    c->pressed = 0;
    deco_draw(c);
    if (b != was) return;
    if (b == 1) close_client(c);
    else if (b == 2) minimize(c);
    else if (b == 3) title_double_click(c);
}

void handle_crossing(XCrossingEvent *e)
{
    Client *c = find_client(e->window);
    if (!c || e->window != c->frame) return;
    if (e->type == LeaveNotify && e->detail != NotifyInferior && c->hover && !c->pressed) { c->hover = 0; deco_draw(c); }
}

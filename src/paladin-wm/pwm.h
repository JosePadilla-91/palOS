/* paladin-wm: palOS's window manager and compositor (see SPEC.md). */
#ifndef PWM_H
#define PWM_H

#include <stdbool.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>

#define PWM_VERSION "paladin-wm 2.0"

/* sizes at scale 1 (multiplied by scale at start) */
#define TB_BASE 22          /* title bar height */
#define RM_BASE 5           /* invisible resize margin round a framed window */
#define CR_BASE 8           /* rounded top corners */
#define BTN_BASE 15         /* title bar button */
#define SNAP_EDGE 2         /* how close to an edge the pointer must come to snap */

enum {
    A_WM_PROTOCOLS, A_WM_DELETE_WINDOW, A_WM_TAKE_FOCUS, A_WM_CHANGE_STATE, A_WM_STATE, A_UTF8_STRING,
    A_NET_SUPPORTED, A_NET_SUPPORTING_WM_CHECK, A_NET_WM_NAME, A_NET_CLIENT_LIST, A_NET_CLIENT_LIST_STACKING,
    A_NET_ACTIVE_WINDOW, A_NET_NUMBER_OF_DESKTOPS, A_NET_CURRENT_DESKTOP, A_NET_DESKTOP_GEOMETRY,
    A_NET_DESKTOP_VIEWPORT, A_NET_WORKAREA, A_NET_WM_DESKTOP, A_NET_FRAME_EXTENTS, A_NET_REQUEST_FRAME_EXTENTS,
    A_NET_CLOSE_WINDOW, A_NET_WM_MOVERESIZE, A_NET_MOVERESIZE_WINDOW, A_NET_WM_STATE,
    A_NET_WM_STATE_HIDDEN, A_NET_WM_STATE_FULLSCREEN, A_NET_WM_STATE_MAXIMIZED_VERT, A_NET_WM_STATE_MAXIMIZED_HORZ,
    A_NET_WM_STATE_ABOVE, A_NET_WM_STATE_BELOW, A_NET_WM_STATE_SKIP_TASKBAR, A_NET_WM_STATE_SKIP_PAGER,
    A_NET_WM_STATE_MODAL, A_NET_WM_STATE_STICKY, A_NET_WM_STATE_FOCUSED,
    A_NET_WM_WINDOW_TYPE, A_NET_WM_WINDOW_TYPE_DESKTOP, A_NET_WM_WINDOW_TYPE_DOCK, A_NET_WM_WINDOW_TYPE_TOOLBAR,
    A_NET_WM_WINDOW_TYPE_MENU, A_NET_WM_WINDOW_TYPE_UTILITY, A_NET_WM_WINDOW_TYPE_SPLASH, A_NET_WM_WINDOW_TYPE_DIALOG,
    A_NET_WM_WINDOW_TYPE_TOOLTIP, A_NET_WM_WINDOW_TYPE_COMBO, A_NET_WM_WINDOW_TYPE_DND, A_NET_WM_WINDOW_TYPE_NORMAL,
    A_NET_WM_WINDOW_TYPE_DROPDOWN_MENU, A_NET_WM_WINDOW_TYPE_POPUP_MENU, A_NET_WM_WINDOW_TYPE_NOTIFICATION,
    A_NET_WM_STRUT, A_NET_WM_STRUT_PARTIAL, A_NET_WM_ICON_GEOMETRY, A_NET_WM_PID, A_NET_WM_ALLOWED_ACTIONS,
    A_NET_WM_ACTION_MOVE, A_NET_WM_ACTION_RESIZE, A_NET_WM_ACTION_MINIMIZE, A_NET_WM_ACTION_MAXIMIZE_HORZ,
    A_NET_WM_ACTION_MAXIMIZE_VERT, A_NET_WM_ACTION_FULLSCREEN, A_NET_WM_ACTION_CLOSE, A_NET_WM_ACTION_ABOVE,
    A_NET_WM_WINDOW_OPACITY, A_MOTIF_WM_HINTS,
    A_COUNT
};
extern Atom atom[A_COUNT];

typedef enum { T_NORMAL, T_DIALOG, T_UTILITY, T_TOOLBAR, T_SPLASH, T_DESKTOP, T_DOCK, T_MENU, T_TOOLTIP,
               T_NOTIFICATION, T_OTHER } WinType;

typedef struct Client {
    Window win;             /* the app's window */
    Window frame;           /* our frame round it (0: not framed) */
    int x, y, w, h;         /* the app window's area, in root coordinates (virtual desktop) */
    int sx, sy, sw, sh;     /* where to go back to after maximising / snapping / full screen */
    bool saved;
    WinType type;
    bool framed, mapped, iconic, fullscreen, maxv, maxh, above, below, sticky, modal;
    bool skip_taskbar, skip_pager, focused, sheet, input_hint, take_focus, can_delete;
    bool fixed;             /* can't be resized (minimum size = maximum size): no maximise */
    bool snapped;           /* put in a half or quarter by dragging to an edge */
    bool decorated;         /* the app didn't ask for no decoration (Motif hints) */
    int ignore_unmaps;
    Window transient;       /* WM_TRANSIENT_FOR */
    long strut[12];
    bool has_strut;
    long icon_geom[4];      /* where the Dock shows it (Magic Lamp target) */
    bool has_icon_geom;
    char *title;
    int min_w, min_h, max_w, max_h;
    unsigned long pid;
    int hover, pressed;     /* title bar button under the pointer / held: 0 none, 1 close, 2 minimise, 3 maximise */
    struct Client *next;
} Client;

/* main.c */
extern Display *dpy;
extern int scr;
extern Window root, wmcheck;
extern int sw_screen, sh_screen;            /* one screen's size (the X screen) */
extern int hsize, vsize, vp_x, vp_y;       /* screens grid and the current viewport */
extern int wa_x, wa_y, wa_w, wa_h;          /* work area */
extern double scale;
extern int TB, RM, CR, BTN, BW;
int ext_l(Client *c); int ext_r(Client *c); int ext_t(Client *c); int ext_b(Client *c);
int margin(Client *c);       /* invisible resize margin round the frame (only with effects) */
extern bool dark, composite_on, debug;
extern Client *clients;
extern Window *stack; extern int nstack;    /* top-level windows bottom to top, as we stack them */
void logf_(const char *fmt, ...);
#define LOG(...) do { if (debug) logf_(__VA_ARGS__); } while (0)
void set_cardinals(Window w, Atom a, const long *v, int n);
bool get_cardinals(Window w, Atom a, long *v, int n);
void update_client_list(void);
void update_workarea(void);
void set_viewport(int x, int y);
void read_screens(void);
void request_repaint(void);
long now_ms(void);

/* client.c */
Client *manage(Window w, bool startup);
void unmanage(Client *c, bool destroyed);
Client *find_client(Window w);              /* by app window or frame */
Window top_of(Client *c);
void apply_geometry(Client *c);
void configure_notify(Client *c);
void focus_client(Client *c, Time t);
void raise_client(Client *c);
void restack(void);
void set_state_atoms(Client *c);
void set_fullscreen(Client *c, bool on);
void set_maximized(Client *c, bool v, bool h);
void minimize(Client *c);
void restore(Client *c);
void close_client(Client *c);
void handle_button(XButtonEvent *e);
void handle_motion(XMotionEvent *e);
void handle_release(XButtonEvent *e);
void handle_crossing(XCrossingEvent *e);
void start_moveresize(Client *c, int direction, int rx, int ry, int button);
void handle_net_state(Client *c, long action, Atom a1, Atom a2);
void read_title(Client *c);
void read_struts(Client *c);
void read_icon_geom(Client *c);
void cycle_focus(bool backwards);
void attach_sheets_of(Client *parent);
bool keep_in_workarea(Client *c);
Client *focused_client(void);
bool snap_preview(int *x, int *y, int *w, int *h);

/* deco.c */
void deco_init(void);
void deco_reload(void);                     /* light / dark switched */
void deco_draw(Client *c);
int deco_button_at(Client *c, int fx, int fy);   /* frame coordinates → 0..3 */

/* comp.c */
bool comp_init(void);
void comp_quit(void);
void comp_paint(void);
void comp_window_map(Window w);
void comp_window_unmap(Window w);
void comp_window_destroy(Window w);
void comp_window_configure(Window w);       /* None: only the stacking changed */
void comp_configure_event(XConfigureEvent *e);
void comp_damage_event(XEvent *e);
int comp_damage_base(void);
int comp_shape_base(void);
void comp_shape_event(XEvent *e);
bool comp_animating(void);
void comp_minimize(Client *c, bool restoring, void (*done)(Client *));
void comp_sheet_open(Client *c);
void comp_window_fade_in(Window w);
void comp_dump(void);

#endif

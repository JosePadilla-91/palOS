/* Kibble's window layer: WebKit's platform (WPEPlatform) on palOS's X11 desktop.
   PaladinDisplay is the connection, PaladinToplevel an X window, PaladinView the web page drawn in it. */
#pragma once
#include <wpe/wpe-platform.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/extensions/XShm.h>
#include <xcb/xcb.h>

G_BEGIN_DECLS

#define PALADIN_TYPE_DISPLAY (paladin_display_get_type())
G_DECLARE_FINAL_TYPE(PaladinDisplay, paladin_display, PALADIN, DISPLAY, WPEDisplay)
#define PALADIN_TYPE_TOPLEVEL (paladin_toplevel_get_type())
G_DECLARE_FINAL_TYPE(PaladinToplevel, paladin_toplevel, PALADIN, TOPLEVEL, WPEToplevel)
#define PALADIN_TYPE_VIEW (paladin_view_get_type())
G_DECLARE_FINAL_TYPE(PaladinView, paladin_view, PALADIN, VIEW, WPEView)
#define PALADIN_TYPE_CLIPBOARD (paladin_clipboard_get_type())
G_DECLARE_FINAL_TYPE(PaladinClipboard, paladin_clipboard, PALADIN, CLIPBOARD, WPEClipboard)

enum {
    PA_WM_PROTOCOLS, PA_WM_DELETE_WINDOW, PA_WM_TAKE_FOCUS, PA_WM_STATE, PA_WM_CHANGE_STATE, PA_UTF8_STRING,
    PA_NET_WM_NAME, PA_NET_WM_PID, PA_NET_WM_STATE, PA_NET_WM_STATE_FULLSCREEN, PA_NET_WM_STATE_MAXIMIZED_VERT,
    PA_NET_WM_STATE_MAXIMIZED_HORZ, PA_NET_WM_STATE_HIDDEN, PA_NET_WM_STATE_ABOVE, PA_NET_WM_STATE_STICKY,
    PA_NET_WM_STATE_SKIP_TASKBAR, PA_NET_WM_STATE_SKIP_PAGER, PA_NET_WM_STATE_FOCUSED, PA_NET_WM_WINDOW_TYPE,
    PA_NET_WM_WINDOW_TYPE_NORMAL, PA_NET_WM_WINDOW_TYPE_DIALOG, PA_NET_WM_WINDOW_TYPE_DOCK,
    PA_NET_WM_WINDOW_TYPE_DESKTOP, PA_NET_WM_WINDOW_TYPE_TOOLBAR, PA_NET_WM_WINDOW_TYPE_SPLASH,
    PA_NET_WM_WINDOW_TYPE_UTILITY, PA_NET_WM_WINDOW_TYPE_NOTIFICATION, PA_NET_WM_WINDOW_TYPE_POPUP_MENU,
    PA_NET_WM_DESKTOP, PA_NET_ACTIVE_WINDOW, PA_NET_WM_MOVERESIZE, PA_NET_WORKAREA, PA_NET_FRAME_EXTENTS,
    PA_NET_WM_USER_TIME, PA_MOTIF_WM_HINTS, PA_PALADIN_DARK, PA_CLIPBOARD, PA_TARGETS, PA_TEXT, PA_INCR,
    PA_TEXT_URI_LIST, PA_TEXT_PLAIN_UTF8, PA_KIBBLE_SELECTION,
    PA_XdndAware, PA_XdndEnter, PA_XdndPosition, PA_XdndStatus, PA_XdndLeave, PA_XdndDrop, PA_XdndFinished,
    PA_XdndSelection, PA_XdndTypeList, PA_XdndActionCopy, PA_XdndActionMove, PA_XdndActionLink, PA_XdndProxy,
    PA_COUNT
};

/* display.c */
Display *paladin_display_get_xdisplay(PaladinDisplay *display);
xcb_connection_t *paladin_display_get_xcb(PaladinDisplay *display);
Atom paladin_display_atom(PaladinDisplay *display, int which);
Visual *paladin_display_argb_visual(PaladinDisplay *display, Colormap *cmap);
gboolean paladin_display_has_shm(PaladinDisplay *display);
gboolean paladin_display_has_dri3(PaladinDisplay *display);
void paladin_display_register_window(PaladinDisplay *display, Window w, gpointer toplevel);
void paladin_display_unregister_window(PaladinDisplay *display, Window w);
gpointer paladin_display_toplevel_for(PaladinDisplay *display, Window w);
Time paladin_display_last_time(PaladinDisplay *display);
void paladin_display_get_workarea(PaladinDisplay *display, int *x, int *y, int *w, int *h);
gboolean paladin_display_dark(PaladinDisplay *display);
/* events the host wants to hear about (close button, focus, a drop, a file drag finishing) */
typedef struct {
    void (*close_requested)(WPEToplevel *toplevel, gpointer data);
    void (*drop)(WPEToplevel *toplevel, int phase, int x, int y, const char *uris, gpointer data);
    void (*gesture)(WPEToplevel *toplevel, int phase, double scale, double rotation, double x, double y, gpointer data);
    void (*dark_changed)(gboolean dark, gpointer data);
    void (*root_key)(unsigned int keycode, unsigned int state, gpointer data);   /* a grabbed shortcut */
    gpointer data;
} PaladinHooks;
void paladin_display_set_hooks(PaladinDisplay *display, const PaladinHooks *hooks);
const PaladinHooks *paladin_display_hooks(PaladinDisplay *display);
PaladinDisplay *paladin_display_new(void);

/* toplevel.c */
typedef struct {
    gboolean transparent, frame, always_on_top, skip_taskbar, sticky, focusable, click_through;
    const char *type;           /* "", "dock", "desktop", "toolbar", "splash", "dialog", "notification", ... */
    Window parent;              /* transient for */
    int x, y, width, height;    /* x, y -1: let the window manager place it */
    const char *wm_class, *wm_name;
} PaladinToplevelOptions;
WPEToplevel *paladin_toplevel_new(PaladinDisplay *display, const PaladinToplevelOptions *options);
Window paladin_toplevel_get_window(PaladinToplevel *toplevel);
gboolean paladin_toplevel_is_transparent(PaladinToplevel *toplevel);
void paladin_toplevel_show(PaladinToplevel *toplevel, gboolean focus);
void paladin_toplevel_hide(PaladinToplevel *toplevel);
void paladin_toplevel_focus(PaladinToplevel *toplevel);
void paladin_toplevel_move(PaladinToplevel *toplevel, int x, int y);
void paladin_toplevel_set_shape(PaladinToplevel *toplevel, gboolean input, const int *rects, int n, gboolean all);
void paladin_toplevel_set_property(PaladinToplevel *toplevel, const char *name, const char *type, const char **values, int n);
void paladin_toplevel_handle_event(PaladinToplevel *toplevel, XEvent *ev);
void paladin_view_watch_toplevel(WPEView *view);    /* a view follows the window it's put in */
void paladin_toplevel_begin_move(PaladinToplevel *toplevel, int root_x, int root_y, int button);

/* view.c */
void paladin_view_handle_event(PaladinView *view, XEvent *ev);
void paladin_view_poll(PaladinView *view);      /* frames shown / buffers free again (Present) */
void paladin_view_attach(PaladinView *view, Window window, Visual *visual, int depth);
void paladin_view_detach(PaladinView *view);
void paladin_view_set_size(PaladinView *view, int width, int height);

/* clipboard.c */
WPEClipboard *paladin_clipboard_new(PaladinDisplay *display);
gboolean paladin_clipboard_handle_event(PaladinClipboard *clipboard, XEvent *ev);
void paladin_clipboard_set_text(PaladinClipboard *clipboard, const char *text);

/* dnd.c: files dragged out of a page, files dropped onto one */
gboolean paladin_dnd_handle_event(PaladinDisplay *display, XEvent *ev);
void paladin_dnd_start(PaladinToplevel *toplevel, const char *const *uris, int n,
                       const guint8 *rgba, int icon_w, int icon_h);
void paladin_dnd_make_aware(PaladinDisplay *display, Window w);

/* debug */
extern gboolean paladin_debug;
#define PLOG(...) do { if (paladin_debug) { fprintf(stderr, "kibble-host: " __VA_ARGS__); fputc('\n', stderr); } } while (0)

G_END_DECLS

/* Kibble's window layer: a web page drawn in a window (PaladinView). Frames arrive either as GPU buffers
   (handed straight to the X server: DRI3 + Present, no copying) or as shared memory (copied in, XShm). */
#define _GNU_SOURCE
#include "paladin.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <poll.h>
#include <unistd.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <X11/Xlib-xcb.h>
#include <X11/Xcursor/Xcursor.h>
#include <xcb/dri3.h>
#include <xcb/present.h>
#include <xkbcommon/xkbcommon.h>

typedef struct {
    PaladinView *view;          /* weak */
    xcb_pixmap_t pixmap;
    xcb_connection_t *xcb;
    gboolean failed;
} GpuBuffer;

struct _PaladinView {
    WPEView parent;
    Window win;
    Visual *visual;
    int depth;
    int width, height;          /* window pixels */
    /* shared memory frames */
    XImage *img;
    XShmSegmentInfo shm;
    gboolean have_frame;
    guint frame_timer;
    WPEBuffer *pending;         /* drawn, waiting for "shown" */
    /* GPU frames */
    xcb_special_event_t *present_q;
    uint32_t present_eid;
    uint32_t serial;
    GHashTable *in_flight;      /* serial -> WPEBuffer */
    xcb_pixmap_t last_pixmap;
    /* pointer */
    double px, py;
    gboolean pointer_in;
    Cursor cursor;
};

G_DEFINE_FINAL_TYPE(PaladinView, paladin_view, WPE_TYPE_VIEW)

static PaladinDisplay *pdisp(PaladinView *v) { return PALADIN_DISPLAY(wpe_view_get_display(WPE_VIEW(v))); }
static Display *xd(PaladinView *v) { return paladin_display_get_xdisplay(pdisp(v)); }
static double vscale(PaladinView *v) { double s = wpe_view_get_scale(WPE_VIEW(v)); return s > 0 ? s : 1; }

/* ---------------------------------------------------------------- shared memory frames */
static void free_image(PaladinView *v)
{
    if (!v->img) return;
    if (v->shm.shmaddr) {
        XShmDetach(xd(v), &v->shm);
        XSync(xd(v), False);
        shmdt(v->shm.shmaddr);
        v->shm.shmaddr = NULL;
    }
    v->img->data = NULL;
    XDestroyImage(v->img);
    v->img = NULL;
    v->have_frame = FALSE;
}

static gboolean ensure_image(PaladinView *v, int w, int h)
{
    if (v->img && v->img->width == w && v->img->height == h) return TRUE;
    free_image(v);
    Display *dpy = xd(v);
    if (paladin_display_has_shm(pdisp(v))) {
        v->img = XShmCreateImage(dpy, v->visual, v->depth, ZPixmap, NULL, &v->shm, w, h);
        if (v->img) {
            v->shm.shmid = shmget(IPC_PRIVATE, (size_t)v->img->bytes_per_line * h, IPC_CREAT | 0600);
            if (v->shm.shmid >= 0) {
                v->shm.shmaddr = v->img->data = shmat(v->shm.shmid, NULL, 0);
                v->shm.readOnly = True;
                gboolean ok = v->shm.shmaddr != (void *)-1 && XShmAttach(dpy, &v->shm);
                XSync(dpy, False);
                shmctl(v->shm.shmid, IPC_RMID, NULL);      /* goes away once both sides let go */
                if (ok) return TRUE;
                if (v->shm.shmaddr != (void *)-1) shmdt(v->shm.shmaddr);
                v->shm.shmaddr = NULL;
            }
            v->img->data = NULL;
            XDestroyImage(v->img);
            v->img = NULL;
        }
    }
    /* no shared memory with the X server: an ordinary image (sent over the connection) */
    char *data = g_malloc0((size_t)w * h * 4);
    v->img = XCreateImage(dpy, v->visual, v->depth, ZPixmap, 0, data, w, h, 32, w * 4);
    if (!v->img) { g_free(data); return FALSE; }
    return TRUE;
}

static void put_rect(PaladinView *v, int x, int y, int w, int h)
{
    if (!v->img || !v->win) return;
    GC gc = DefaultGC(xd(v), DefaultScreen(xd(v)));
    static GC argb_gc;
    if (v->depth == 32) {
        if (!argb_gc) argb_gc = XCreateGC(xd(v), v->win, 0, NULL);
        gc = argb_gc;
    }
    if (v->shm.shmaddr) XShmPutImage(xd(v), v->win, gc, v->img, x, y, x, y, w, h, False);
    else XPutImage(xd(v), v->win, gc, v->img, x, y, x, y, w, h);
}

static gboolean frame_shown(gpointer data)
{
    PaladinView *v = data;
    v->frame_timer = 0;
    WPEBuffer *b = v->pending;
    v->pending = NULL;
    if (b) { wpe_view_buffer_rendered(WPE_VIEW(v), b); g_object_unref(b); }
    return G_SOURCE_REMOVE;
}

static gboolean render_pixels(PaladinView *v, WPEBuffer *buffer, const guint8 *src, guint stride,
                              const WPERectangle *damage, guint ndamage)
{
    int w = wpe_buffer_get_width(buffer), h = wpe_buffer_get_height(buffer);
    gboolean fresh = !(v->img && v->img->width == w && v->img->height == h && v->have_frame);
    if (!ensure_image(v, w, h)) return FALSE;
    WPERectangle all = { 0, 0, w, h };
    if (fresh || !ndamage) { damage = &all; ndamage = 1; }
    for (guint i = 0; i < ndamage; i++) {
        int x0 = CLAMP(damage[i].x, 0, w), y0 = CLAMP(damage[i].y, 0, h);
        int x1 = CLAMP(damage[i].x + damage[i].width, 0, w), y1 = CLAMP(damage[i].y + damage[i].height, 0, h);
        if (x1 <= x0 || y1 <= y0) continue;
        for (int y = y0; y < y1; y++)
            memcpy(v->img->data + (size_t)y * v->img->bytes_per_line + x0 * 4, src + (size_t)y * stride + x0 * 4, (size_t)(x1 - x0) * 4);
        put_rect(v, x0, y0, x1 - x0, y1 - y0);
    }
    XFlush(xd(v));
    v->have_frame = TRUE;
    return TRUE;
}

/* ---------------------------------------------------------------- GPU frames (DRI3 + Present) */
static void gpu_buffer_free(gpointer data)
{
    GpuBuffer *g = data;
    if (g->pixmap) xcb_free_pixmap(g->xcb, g->pixmap);
    if (g->view) {
        g_object_remove_weak_pointer(G_OBJECT(g->view), (gpointer *)&g->view);
        if (g->view->last_pixmap == g->pixmap) g->view->last_pixmap = 0;
    }
    g_free(g);
}

static void ensure_present(PaladinView *v)
{
    if (v->present_q || !v->win) return;
    xcb_connection_t *c = paladin_display_get_xcb(pdisp(v));
    v->present_eid = xcb_generate_id(c);
    xcb_present_select_input(c, v->present_eid, v->win, XCB_PRESENT_EVENT_MASK_COMPLETE_NOTIFY | XCB_PRESENT_EVENT_MASK_IDLE_NOTIFY);
    v->present_q = xcb_register_for_special_xge(c, &xcb_present_id, v->present_eid, NULL);
}

static GpuBuffer *gpu_pixmap(PaladinView *v, WPEBuffer *buffer)
{
    GpuBuffer *g = wpe_buffer_get_user_data(buffer);
    if (g) return g;
    xcb_connection_t *c = paladin_display_get_xcb(pdisp(v));
    WPEBufferDMABuf *db = WPE_BUFFER_DMA_BUF(buffer);
    g = g_new0(GpuBuffer, 1);
    g->xcb = c;
    g->view = v;
    g_object_add_weak_pointer(G_OBJECT(v), (gpointer *)&g->view);
    guint n = wpe_buffer_dma_buf_get_n_planes(db);
    int32_t fds[4]; uint32_t strides[4] = {0}, offsets[4] = {0};
    for (guint i = 0; i < n && i < 4; i++) {
        fds[i] = dup(wpe_buffer_dma_buf_get_fd(db, i));       /* the X library closes what it sends */
        strides[i] = wpe_buffer_dma_buf_get_stride(db, i);
        offsets[i] = wpe_buffer_dma_buf_get_offset(db, i);
    }
    guint32 fourcc = wpe_buffer_dma_buf_get_format(db);
    uint8_t depth = fourcc == 0x34325241 /* AR24 */ ? 32 : 24;
    if (depth == 32 && v->depth != 32) depth = 24;      /* an opaque window shows it without its alpha */
    g->pixmap = xcb_generate_id(c);
    xcb_void_cookie_t ck = xcb_dri3_pixmap_from_buffers_checked(c, g->pixmap, v->win, n,
        wpe_buffer_get_width(buffer), wpe_buffer_get_height(buffer),
        strides[0], offsets[0], strides[1], offsets[1], strides[2], offsets[2], strides[3], offsets[3],
        depth, 32, wpe_buffer_dma_buf_get_modifier(db), fds);
    xcb_generic_error_t *err = xcb_request_check(c, ck);
    if (err) {
        PLOG("the X server can't take this frame (error %d): copying frames instead", err->error_code);
        free(err);
        g->pixmap = 0;
        g->failed = TRUE;
    }
    wpe_buffer_set_user_data(buffer, g, gpu_buffer_free);
    return g;
}

static gboolean render_gpu(PaladinView *v, WPEBuffer *buffer, GError **error)
{
    GpuBuffer *g = gpu_pixmap(v, buffer);
    if (g->failed) {
        /* read the frame back and copy it in */
        GBytes *px = wpe_buffer_import_to_pixels(buffer, error);
        if (!px) return FALSE;
        gboolean ok = render_pixels(v, buffer, g_bytes_get_data(px, NULL), wpe_buffer_get_width(buffer) * 4, NULL, 0);
        g_bytes_unref(px);
        if (ok) {
            wpe_view_buffer_released(WPE_VIEW(v), buffer);
            if (v->pending) g_object_unref(v->pending);
            v->pending = g_object_ref(buffer);
            if (!v->frame_timer) v->frame_timer = g_timeout_add(16, frame_shown, v);
        }
        return ok;
    }
    ensure_present(v);
    /* wait for the page's drawing to finish before showing it (the fence it gives) */
    int fence = wpe_buffer_take_rendering_fence(buffer);
    if (fence >= 0) {
        struct pollfd p = { fence, POLLIN, 0 };
        poll(&p, 1, 100);
        close(fence);
    }
    xcb_connection_t *c = paladin_display_get_xcb(pdisp(v));
    uint32_t serial = ++v->serial;
    xcb_present_pixmap(c, v->win, g->pixmap, serial, 0, 0, 0, 0, 0, 0, 0, XCB_PRESENT_OPTION_NONE, 0, 0, 0, 0, NULL);
    xcb_flush(c);
    g_hash_table_insert(v->in_flight, GUINT_TO_POINTER(serial), g_object_ref(buffer));
    v->last_pixmap = g->pixmap;
    return TRUE;
}

static WPEBuffer *buffer_for_pixmap(PaladinView *v, xcb_pixmap_t pixmap);

void paladin_view_poll(PaladinView *v)
{
    if (!v->present_q) return;
    xcb_connection_t *c = paladin_display_get_xcb(pdisp(v));
    xcb_generic_event_t *ev;
    while ((ev = xcb_poll_for_special_event(c, v->present_q))) {
        xcb_present_generic_event_t *ge = (xcb_present_generic_event_t *)ev;
        if (ge->evtype == XCB_PRESENT_COMPLETE_NOTIFY) {
            xcb_present_complete_notify_event_t *ce = (xcb_present_complete_notify_event_t *)ev;
            if (ce->kind == XCB_PRESENT_COMPLETE_KIND_PIXMAP) {
                WPEBuffer *b = g_hash_table_lookup(v->in_flight, GUINT_TO_POINTER(ce->serial));
                if (b) {
                    g_object_ref(b);
                    g_hash_table_remove(v->in_flight, GUINT_TO_POINTER(ce->serial));
                    wpe_view_buffer_rendered(WPE_VIEW(v), b);
                    g_object_unref(b);
                }
            }
        } else if (ge->evtype == XCB_PRESENT_EVENT_IDLE_NOTIFY) {
            xcb_present_idle_notify_event_t *ie = (xcb_present_idle_notify_event_t *)ev;
            WPEBuffer *b = buffer_for_pixmap(v, ie->pixmap);
            if (b) wpe_view_buffer_released(WPE_VIEW(v), b);
        }
        free(ev);
    }
}

/* buffers the page draws into: WebKit tells us the set (buffers_changed); we keep it to map pixmaps back */
static GPtrArray *known_buffers(PaladinView *v) { return g_object_get_data(G_OBJECT(v), "kibble-buffers"); }

static WPEBuffer *buffer_for_pixmap(PaladinView *v, xcb_pixmap_t pixmap)
{
    GPtrArray *a = known_buffers(v);
    if (!a) return NULL;
    for (guint i = 0; i < a->len; i++) {
        GpuBuffer *g = wpe_buffer_get_user_data(a->pdata[i]);
        if (g && g->pixmap == pixmap) return a->pdata[i];
    }
    return NULL;
}

static void pv_buffers_changed(WPEView *view, WPEBuffer **buffers, guint n)
{
    GPtrArray *a = g_ptr_array_new_with_free_func(g_object_unref);
    for (guint i = 0; i < n; i++) g_ptr_array_add(a, g_object_ref(buffers[i]));
    g_object_set_data_full(G_OBJECT(view), "kibble-buffers", a, (GDestroyNotify)g_ptr_array_unref);
}

static gboolean pv_render_buffer(WPEView *view, WPEBuffer *buffer, const WPERectangle *damage, guint ndamage, GError **error)
{
    PaladinView *v = PALADIN_VIEW(view);
    if (!v->win) {
        /* not in a window (yet): nothing to show, the page goes on */
        wpe_view_buffer_rendered(view, buffer);
        wpe_view_buffer_released(view, buffer);
        return TRUE;
    }
    if (WPE_IS_BUFFER_DMA_BUF(buffer) && paladin_display_has_dri3(pdisp(v))) return render_gpu(v, buffer, error);
    gboolean ok;
    if (WPE_IS_BUFFER_SHM(buffer)) {
        WPEBufferSHM *sb = WPE_BUFFER_SHM(buffer);
        GBytes *data = wpe_buffer_shm_get_data(sb);
        ok = render_pixels(v, buffer, g_bytes_get_data(data, NULL), wpe_buffer_shm_get_stride(sb), damage, ndamage);
    } else {
        GBytes *px = wpe_buffer_import_to_pixels(buffer, error);
        if (!px) return FALSE;
        ok = render_pixels(v, buffer, g_bytes_get_data(px, NULL), wpe_buffer_get_width(buffer) * 4, damage, ndamage);
        g_bytes_unref(px);
    }
    if (!ok) {
        g_set_error_literal(error, WPE_VIEW_ERROR, WPE_VIEW_ERROR_RENDER_FAILED, "couldn't draw the frame");
        return FALSE;
    }
    /* copied: the page can draw into it again; shown about a screen refresh from now */
    wpe_view_buffer_released(view, buffer);
    if (v->pending) { wpe_view_buffer_rendered(view, v->pending); g_object_unref(v->pending); }
    v->pending = g_object_ref(buffer);
    if (!v->frame_timer) v->frame_timer = g_timeout_add(16, frame_shown, v);
    return TRUE;
}

/* ---------------------------------------------------------------- cursor */
static void set_cursor(PaladinView *v, Cursor c)
{
    if (!v->win) return;
    XDefineCursor(xd(v), v->win, c);
    if (v->cursor) XFreeCursor(xd(v), v->cursor);
    v->cursor = c;
    XFlush(xd(v));
}

static void pv_set_cursor_from_name(WPEView *view, const char *name)
{
    PaladinView *v = PALADIN_VIEW(view);
    if (!name || !strcmp(name, "default")) name = "left_ptr";
    if (!strcmp(name, "none")) {
        XcursorImage *img = XcursorImageCreate(1, 1);
        img->pixels[0] = 0;
        set_cursor(v, XcursorImageLoadCursor(xd(v), img));
        XcursorImageDestroy(img);
        return;
    }
    Cursor c = XcursorLibraryLoadCursor(xd(v), name);
    if (!c && !strcmp(name, "pointer")) c = XcursorLibraryLoadCursor(xd(v), "hand2");
    if (!c && !strcmp(name, "text")) c = XcursorLibraryLoadCursor(xd(v), "xterm");
    if (!c) c = XcursorLibraryLoadCursor(xd(v), "left_ptr");
    set_cursor(v, c);
}

static void pv_set_cursor_from_bytes(WPEView *view, GBytes *bytes, guint w, guint h, guint stride, guint hx, guint hy)
{
    PaladinView *v = PALADIN_VIEW(view);
    if (!w || !h) { pv_set_cursor_from_name(view, "none"); return; }
    XcursorImage *img = XcursorImageCreate(w, h);
    img->xhot = hx; img->yhot = hy;
    const guint8 *src = g_bytes_get_data(bytes, NULL);
    for (guint y = 0; y < h; y++) memcpy(img->pixels + y * w, src + y * stride, w * 4);
    set_cursor(v, XcursorImageLoadCursor(xd(v), img));
    XcursorImageDestroy(img);
}

/* ---------------------------------------------------------------- input */
static WPEModifiers mods_of(unsigned int state)
{
    WPEModifiers m = 0;
    if (state & ShiftMask) m |= WPE_MODIFIER_KEYBOARD_SHIFT;
    if (state & ControlMask) m |= WPE_MODIFIER_KEYBOARD_CONTROL;
    if (state & Mod1Mask) m |= WPE_MODIFIER_KEYBOARD_ALT;
    if (state & Mod4Mask) m |= WPE_MODIFIER_KEYBOARD_META;
    if (state & LockMask) m |= WPE_MODIFIER_KEYBOARD_CAPS_LOCK;
    if (state & Button1Mask) m |= WPE_MODIFIER_POINTER_BUTTON1;
    if (state & Button2Mask) m |= WPE_MODIFIER_POINTER_BUTTON2;
    if (state & Button3Mask) m |= WPE_MODIFIER_POINTER_BUTTON3;
    if (state & Button4Mask) m |= WPE_MODIFIER_POINTER_BUTTON4;
    if (state & Button5Mask) m |= WPE_MODIFIER_POINTER_BUTTON5;
    return m;
}

static guint keyval_of(PaladinView *v, XKeyEvent *e)
{
    WPEKeymap *km = wpe_display_get_keymap(WPE_DISPLAY(pdisp(v)));
    struct xkb_state *st = km && WPE_IS_KEYMAP_XKB(km) ? wpe_keymap_xkb_get_xkb_state(WPE_KEYMAP_XKB(km)) : NULL;
    if (st) {
        struct xkb_keymap *xk = wpe_keymap_xkb_get_xkb_keymap(WPE_KEYMAP_XKB(km));
        xkb_mod_mask_t depressed = 0, locked = 0;
        static const struct { unsigned int x; const char *name; } map[] = {
            { ShiftMask, XKB_MOD_NAME_SHIFT }, { ControlMask, XKB_MOD_NAME_CTRL }, { Mod1Mask, XKB_MOD_NAME_ALT },
            { Mod4Mask, XKB_MOD_NAME_LOGO }, { Mod2Mask, XKB_MOD_NAME_NUM }, { Mod5Mask, "Mod5" },
        };
        for (unsigned i = 0; i < G_N_ELEMENTS(map); i++) {
            if (!(e->state & map[i].x)) continue;
            xkb_mod_index_t idx = xkb_keymap_mod_get_index(xk, map[i].name);
            if (idx == XKB_MOD_INVALID) continue;
            if (map[i].x == Mod2Mask) locked |= 1u << idx; else depressed |= 1u << idx;
        }
        if (e->state & LockMask) {
            xkb_mod_index_t idx = xkb_keymap_mod_get_index(xk, XKB_MOD_NAME_CAPS);
            if (idx != XKB_MOD_INVALID) locked |= 1u << idx;
        }
        xkb_state_update_mask(st, depressed, 0, locked, 0, 0, (e->state >> 13) & 3);
        return xkb_state_key_get_one_sym(st, e->keycode);
    }
    return XLookupKeysym(e, (e->state & ShiftMask) ? 1 : 0);
}

void paladin_view_handle_event(PaladinView *v, XEvent *ev)
{
    WPEView *view = WPE_VIEW(v);
    double s = vscale(v);
    WPEEvent *we = NULL;
    switch (ev->type) {
    case Expose:
        if (ev->xexpose.count == 0) {
            if (v->img && v->have_frame) { put_rect(v, 0, 0, v->img->width, v->img->height); XFlush(xd(v)); }
            else if (v->last_pixmap) {
                xcb_connection_t *c = paladin_display_get_xcb(pdisp(v));
                xcb_gcontext_t gc = xcb_generate_id(c);
                xcb_create_gc(c, gc, v->win, 0, NULL);
                xcb_copy_area(c, v->last_pixmap, v->win, gc, 0, 0, 0, 0, v->width, v->height);
                xcb_free_gc(c, gc);
                xcb_flush(c);
            }
        }
        return;
    case KeyPress: case KeyRelease: {
        guint keyval = keyval_of(v, &ev->xkey);
        we = wpe_event_keyboard_new(ev->type == KeyPress ? WPE_EVENT_KEYBOARD_KEY_DOWN : WPE_EVENT_KEYBOARD_KEY_UP, view,
                                    WPE_INPUT_SOURCE_KEYBOARD, ev->xkey.time, mods_of(ev->xkey.state), ev->xkey.keycode, keyval);
        break;
    }
    case ButtonPress: case ButtonRelease: {
        XButtonEvent *b = &ev->xbutton;
        double x = b->x / s, y = b->y / s;
        v->px = x; v->py = y;
        if (b->button >= 4 && b->button <= 7) {
            if (ev->type == ButtonRelease) return;
            double dx = b->button == 6 ? 1 : b->button == 7 ? -1 : 0, dy = b->button == 4 ? 1 : b->button == 5 ? -1 : 0;
            we = wpe_event_scroll_new(view, WPE_INPUT_SOURCE_MOUSE, b->time, mods_of(b->state), dx, dy, FALSE, FALSE, x, y);
            break;
        }
        guint button = b->button == 1 ? WPE_BUTTON_PRIMARY : b->button == 2 ? WPE_BUTTON_MIDDLE : b->button == 3 ? WPE_BUTTON_SECONDARY : b->button;
        if (b->button >= 8) button = b->button - 4;      /* back / forward */
        guint count = ev->type == ButtonPress ? wpe_view_compute_press_count(view, x, y, button, b->time) : 0;
        we = wpe_event_pointer_button_new(ev->type == ButtonPress ? WPE_EVENT_POINTER_DOWN : WPE_EVENT_POINTER_UP, view,
                                          WPE_INPUT_SOURCE_MOUSE, b->time, mods_of(b->state), button, x, y, count);
        break;
    }
    case MotionNotify: {
        double x = ev->xmotion.x / s, y = ev->xmotion.y / s;
        we = wpe_event_pointer_move_new(WPE_EVENT_POINTER_MOVE, view, WPE_INPUT_SOURCE_MOUSE, ev->xmotion.time,
                                        mods_of(ev->xmotion.state), x, y, v->pointer_in ? x - v->px : 0, v->pointer_in ? y - v->py : 0);
        v->px = x; v->py = y; v->pointer_in = TRUE;
        break;
    }
    case EnterNotify: case LeaveNotify: {
        if (ev->xcrossing.mode != NotifyNormal) return;
        double x = ev->xcrossing.x / s, y = ev->xcrossing.y / s;
        v->pointer_in = ev->type == EnterNotify;
        v->px = x; v->py = y;
        we = wpe_event_pointer_move_new(ev->type == EnterNotify ? WPE_EVENT_POINTER_ENTER : WPE_EVENT_POINTER_LEAVE, view,
                                        WPE_INPUT_SOURCE_MOUSE, ev->xcrossing.time, mods_of(ev->xcrossing.state), x, y, 0, 0);
        break;
    }
    default:
        return;
    }
    if (we) { wpe_view_event(view, we); wpe_event_unref(we); }
}

/* ---------------------------------------------------------------- attach to a window */
void paladin_view_attach(PaladinView *v, Window win, Visual *visual, int depth)
{
    if (v->win == win) return;
    paladin_view_detach(v);
    v->win = win; v->visual = visual; v->depth = depth;
}

void paladin_view_detach(PaladinView *v)
{
    if (!v->win) return;
    if (v->present_q) {
        xcb_unregister_for_special_event(paladin_display_get_xcb(pdisp(v)), v->present_q);
        v->present_q = NULL;
    }
    g_hash_table_remove_all(v->in_flight);
    free_image(v);
    v->win = 0;
    v->last_pixmap = 0;
}

void paladin_view_set_size(PaladinView *v, int width, int height)
{
    v->width = width; v->height = height;
}

static void pv_constructed(GObject *o)
{
    G_OBJECT_CLASS(paladin_view_parent_class)->constructed(o);
    paladin_view_watch_toplevel(WPE_VIEW(o));
}

static void pv_dispose(GObject *o)
{
    PaladinView *v = PALADIN_VIEW(o);
    if (v->frame_timer) { g_source_remove(v->frame_timer); v->frame_timer = 0; }
    g_clear_object(&v->pending);
    if (v->win) paladin_view_detach(v);
    G_OBJECT_CLASS(paladin_view_parent_class)->dispose(o);
}

static void pv_finalize(GObject *o)
{
    g_hash_table_destroy(PALADIN_VIEW(o)->in_flight);
    G_OBJECT_CLASS(paladin_view_parent_class)->finalize(o);
}

static void paladin_view_class_init(PaladinViewClass *klass)
{
    GObjectClass *oc = G_OBJECT_CLASS(klass);
    oc->constructed = pv_constructed;
    oc->dispose = pv_dispose;
    oc->finalize = pv_finalize;
    WPEViewClass *vc = WPE_VIEW_CLASS(klass);
    vc->render_buffer = pv_render_buffer;
    vc->buffers_changed = pv_buffers_changed;
    vc->set_cursor_from_name = pv_set_cursor_from_name;
    vc->set_cursor_from_bytes = pv_set_cursor_from_bytes;
}

static void paladin_view_init(PaladinView *v)
{
    v->in_flight = g_hash_table_new_full(g_direct_hash, g_direct_equal, NULL, g_object_unref);
}

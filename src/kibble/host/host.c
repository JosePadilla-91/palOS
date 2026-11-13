/* kibble-host: Kibble's windows. Each palOS app on Kibble runs one of these: it shows the app's pages (WebKit)
   in windows on palOS's desktop and talks to the app's main process (Node) in JSON lines on stdin/stdout.

   From the app (stdin):  {"op": "create"|"load"|"eval"|"script"|"scheme"|"scheme-reply"|"show"|"hide"|"focus"|
                           "close"|"title"|"resize"|"move"|"maximize"|"unmaximize"|"minimize"|"fullscreen"|
                           "unfullscreen"|"shape"|"xprop"|"key"|"theme"|"clipboard"|"startDrag"|"dialog-reply"|"quit", ...}
   To the app (stdout):   {"ev": "ready"|"xid"|"loaded"|"title"|"resized"|"focus"|"close-requested"|"closed"|
                           "message"|"eval-result"|"open-external"|"scheme"|"dialog", ...}                          */
#define _GNU_SOURCE
#include "paladin.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <locale.h>
#include <unistd.h>
#include <wpe/webkit.h>
#include <json-glib/json-glib.h>
#include <xkbcommon/xkbcommon.h>

typedef struct {
    int id;
    WebKitWebView *web;
    PaladinToplevel *tl;
    WebKitUserContentManager *ucm;
    WebKitOptionMenu *menu;
    gboolean focusable, show;
} Win;

static GMainLoop *loop;
static PaladinDisplay *display;
static WebKitWebContext *context;
static WebKitNetworkSession *session;
static WebKitSettings *settings;
static GHashTable *wins;            /* id -> Win */
static GHashTable *schemes;         /* names registered */
static GHashTable *scheme_waiting;  /* rid -> WebKitURISchemeRequest */
static GHashTable *dialogs;         /* rid -> WebKitScriptDialog */
static int next_rid = 1;
static char *theme_mode;            /* "system", "dark", "light" */

/* ---------------------------------------------------------------- talking to the app */
static void emit(JsonBuilder *b)
{
    json_builder_end_object(b);
    JsonGenerator *g = json_generator_new();
    JsonNode *root = json_builder_get_root(b);
    json_generator_set_root(g, root);
    char *s = json_generator_to_data(g, NULL);
    fputs(s, stdout); fputc('\n', stdout); fflush(stdout);
    g_free(s);
    json_node_unref(root);
    g_object_unref(g);
    g_object_unref(b);
}

static JsonBuilder *ev_begin(const char *ev, int id)
{
    JsonBuilder *b = json_builder_new();
    json_builder_begin_object(b);
    json_builder_set_member_name(b, "ev"); json_builder_add_string_value(b, ev);
    if (id) { json_builder_set_member_name(b, "id"); json_builder_add_int_value(b, id); }
    return b;
}

static void ev_simple(const char *ev, int id) { emit(ev_begin(ev, id)); }

static Win *win_of_view(WebKitWebView *web)
{
    GHashTableIter it; gpointer k, v;
    g_hash_table_iter_init(&it, wins);
    while (g_hash_table_iter_next(&it, &k, &v)) if (((Win *)v)->web == web) return v;
    return NULL;
}

static Win *win_of_toplevel(WPEToplevel *tl)
{
    GHashTableIter it; gpointer k, v;
    g_hash_table_iter_init(&it, wins);
    while (g_hash_table_iter_next(&it, &k, &v)) if (WPE_TOPLEVEL(((Win *)v)->tl) == tl) return v;
    return NULL;
}

/* runs Kibble's own page-side calls (no answer needed) */
static void run_js(Win *w, const char *js, const char *source)
{
    webkit_web_view_evaluate_javascript(w->web, js, -1, NULL, source, NULL, NULL, NULL);
}

/* ---------------------------------------------------------------- the app's own addresses */
static void scheme_request(WebKitURISchemeRequest *req, gpointer data)
{
    (void)data;
    int rid = next_rid++;
    g_hash_table_insert(scheme_waiting, GINT_TO_POINTER(rid), g_object_ref(req));
    JsonBuilder *b = ev_begin("scheme", 0);
    json_builder_set_member_name(b, "rid"); json_builder_add_int_value(b, rid);
    json_builder_set_member_name(b, "url"); json_builder_add_string_value(b, webkit_uri_scheme_request_get_uri(req));
    const char *method = webkit_uri_scheme_request_get_http_method(req);
    json_builder_set_member_name(b, "method"); json_builder_add_string_value(b, method ? method : "GET");
    Win *w = win_of_view(webkit_uri_scheme_request_get_web_view(req));
    if (w) { json_builder_set_member_name(b, "id"); json_builder_add_int_value(b, w->id); }
    /* a part of the file (pictures and sound are read in pieces when seeking) */
    SoupMessageHeaders *rh = webkit_uri_scheme_request_get_http_headers(req);
    const char *range = rh ? soup_message_headers_get_one(rh, "Range") : NULL;
    if (range) { json_builder_set_member_name(b, "range"); json_builder_add_string_value(b, range); }
    GInputStream *body = webkit_uri_scheme_request_get_http_body(req);
    if (body) {
        GOutputStream *out = g_memory_output_stream_new_resizable();
        g_output_stream_splice(out, body, G_OUTPUT_STREAM_SPLICE_CLOSE_TARGET, NULL, NULL);
        gsize n = g_memory_output_stream_get_data_size(G_MEMORY_OUTPUT_STREAM(out));
        char *b64 = g_base64_encode(g_memory_output_stream_get_data(G_MEMORY_OUTPUT_STREAM(out)), n);
        json_builder_set_member_name(b, "body"); json_builder_add_string_value(b, b64);
        g_free(b64);
        g_object_unref(out);
        g_object_unref(body);
    }
    emit(b);
}

static void register_scheme(const char *name)
{
    if (!name || !*name || g_hash_table_contains(schemes, name)) return;
    g_hash_table_add(schemes, g_strdup(name));
    webkit_web_context_register_uri_scheme(context, name, scheme_request, NULL, NULL);
    WebKitSecurityManager *sm = webkit_web_context_get_security_manager(context);
    webkit_security_manager_register_uri_scheme_as_secure(sm, name);
    webkit_security_manager_register_uri_scheme_as_cors_enabled(sm, name);
}

static void scheme_reply(JsonObject *m)
{
    int rid = (int)json_object_get_int_member_with_default(m, "rid", 0);
    WebKitURISchemeRequest *req = g_hash_table_lookup(scheme_waiting, GINT_TO_POINTER(rid));
    if (!req) return;
    g_object_ref(req);
    g_hash_table_remove(scheme_waiting, GINT_TO_POINTER(rid));
    int status = (int)json_object_get_int_member_with_default(m, "status", 0);
    const char *type = json_object_get_string_member_with_default(m, "type", "application/octet-stream");
    GInputStream *stream = NULL;
    gint64 len = -1;
    if (status) {
        const char *file = json_object_get_string_member_with_default(m, "file", NULL);
        if (file) {
            GFile *f = g_file_new_for_path(file);
            GFileInfo *info = g_file_query_info(f, G_FILE_ATTRIBUTE_STANDARD_SIZE, 0, NULL, NULL);
            stream = G_INPUT_STREAM(g_file_read(f, NULL, NULL));
            if (info) { len = g_file_info_get_size(info); g_object_unref(info); }
            g_object_unref(f);
            gint64 offset = json_object_get_int_member_with_default(m, "offset", 0);
            gint64 part = json_object_get_int_member_with_default(m, "length", -1);
            if (stream && offset > 0) g_seekable_seek(G_SEEKABLE(stream), offset, G_SEEK_SET, NULL, NULL);
            if (stream && part >= 0) len = part;
        } else {
            gsize n = 0;
            guchar *data = g_base64_decode(json_object_get_string_member_with_default(m, "data", ""), &n);
            stream = g_memory_input_stream_new_from_data(data, n, g_free);
            len = n;
        }
    }
    if (!stream) {
        GError *e = g_error_new_literal(G_IO_ERROR, G_IO_ERROR_NOT_FOUND, "not found");
        webkit_uri_scheme_request_finish_error(req, e);
        g_error_free(e);
    } else {
        WebKitURISchemeResponse *res = webkit_uri_scheme_response_new(stream, len);
        webkit_uri_scheme_response_set_status(res, status, NULL);
        webkit_uri_scheme_response_set_content_type(res, type);
        SoupMessageHeaders *h = soup_message_headers_new(SOUP_MESSAGE_HEADERS_RESPONSE);
        soup_message_headers_append(h, "Access-Control-Allow-Origin", "*");
        if (json_object_has_member(m, "headers") && JSON_NODE_HOLDS_OBJECT(json_object_get_member(m, "headers"))) {
            JsonObject *ho = json_object_get_object_member(m, "headers");
            GList *keys = json_object_get_members(ho);
            for (GList *k = keys; k; k = k->next)
                soup_message_headers_append(h, k->data, json_object_get_string_member_with_default(ho, k->data, ""));
            g_list_free(keys);
        }
        webkit_uri_scheme_response_set_http_headers(res, h);
        webkit_uri_scheme_request_finish_with_response(req, res);
        g_object_unref(res);
        g_object_unref(stream);
    }
    g_object_unref(req);
}

/* ---------------------------------------------------------------- page events */
static void on_message(WebKitUserContentManager *ucm, JSCValue *value, gpointer data)
{
    (void)ucm;
    Win *w = data;
    char *s = jsc_value_is_string(value) ? jsc_value_to_string(value) : jsc_value_to_json(value, 0);
    if (!s) return;
    /* the page's own select menu answered (Kibble draws <select> lists in the page) */
    if (!strncmp(s, "{\"t\":\"option\"", 13) && w->menu) {
        JsonParser *p = json_parser_new();
        if (json_parser_load_from_data(p, s, -1, NULL)) {
            int i = (int)json_object_get_int_member_with_default(json_node_get_object(json_parser_get_root(p)), "i", -1);
            WebKitOptionMenu *menu = w->menu;
            w->menu = NULL;
            if (i >= 0 && (guint)i < webkit_option_menu_get_n_items(menu)) webkit_option_menu_activate_item(menu, i);
            webkit_option_menu_close(menu);
            g_object_unref(menu);
        }
        g_object_unref(p);
        g_free(s);
        return;
    }
    JsonBuilder *b = ev_begin("message", w->id);
    json_builder_set_member_name(b, "data"); json_builder_add_string_value(b, s);
    emit(b);
    g_free(s);
}

static void on_load_changed(WebKitWebView *web, WebKitLoadEvent e, gpointer data)
{
    (void)web;
    if (e == WEBKIT_LOAD_FINISHED) ev_simple("loaded", ((Win *)data)->id);
}

static gboolean on_load_failed(WebKitWebView *web, WebKitLoadEvent e, const char *uri, GError *err, gpointer data)
{
    (void)web; (void)e;
    if (!g_error_matches(err, WEBKIT_NETWORK_ERROR, WEBKIT_NETWORK_ERROR_CANCELLED))
        fprintf(stderr, "kibble-host: window %d couldn't load %s: %s\n", ((Win *)data)->id, uri, err->message);
    return FALSE;
}

static void on_title(GObject *o, GParamSpec *ps, gpointer data)
{
    (void)ps;
    JsonBuilder *b = ev_begin("title", ((Win *)data)->id);
    const char *t = webkit_web_view_get_title(WEBKIT_WEB_VIEW(o));
    json_builder_set_member_name(b, "title"); json_builder_add_string_value(b, t ? t : "");
    emit(b);
}

static gboolean on_decide(WebKitWebView *web, WebKitPolicyDecision *d, WebKitPolicyDecisionType type, gpointer data)
{
    (void)web;
    if (type != WEBKIT_POLICY_DECISION_TYPE_NEW_WINDOW_ACTION) return FALSE;
    WebKitNavigationAction *a = webkit_navigation_policy_decision_get_navigation_action(WEBKIT_NAVIGATION_POLICY_DECISION(d));
    WebKitURIRequest *r = webkit_navigation_action_get_request(a);
    JsonBuilder *b = ev_begin("open-external", ((Win *)data)->id);
    json_builder_set_member_name(b, "url"); json_builder_add_string_value(b, webkit_uri_request_get_uri(r));
    emit(b);
    webkit_policy_decision_ignore(d);
    return TRUE;
}

static WebKitWebView *on_create(WebKitWebView *web, WebKitNavigationAction *a, gpointer data)
{
    (void)web;
    WebKitURIRequest *r = webkit_navigation_action_get_request(a);
    JsonBuilder *b = ev_begin("open-external", ((Win *)data)->id);
    json_builder_set_member_name(b, "url"); json_builder_add_string_value(b, webkit_uri_request_get_uri(r));
    emit(b);
    return NULL;
}

static void on_close(WebKitWebView *web, gpointer data) { (void)web; ev_simple("close-requested", ((Win *)data)->id); }

static void on_terminated(WebKitWebView *web, WebKitWebProcessTerminationReason why, gpointer data)
{
    fprintf(stderr, "kibble-host: window %d: its page process stopped (%s)\n", ((Win *)data)->id,
            why == WEBKIT_WEB_PROCESS_EXCEEDED_MEMORY_LIMIT ? "out of memory" : "crashed");
    if (why != WEBKIT_WEB_PROCESS_TERMINATED_BY_API) webkit_web_view_reload(web);
}

static void menu_closed(WebKitOptionMenu *menu, gpointer data)
{
    Win *w = data;
    if (w->menu == menu) {
        w->menu = NULL;
        run_js(w, "window.__kibble&&__kibble._optionsClose&&__kibble._optionsClose()", "kibble://options");
        g_object_unref(menu);
    }
}

static gboolean on_option_menu(WebKitWebView *web, WebKitOptionMenu *menu, WebKitRectangle *rect, gpointer data)
{
    (void)web;
    Win *w = data;
    if (w->menu) { webkit_option_menu_close(w->menu); g_clear_object(&w->menu); }
    w->menu = g_object_ref(menu);
    g_signal_connect(menu, "close", G_CALLBACK(menu_closed), w);
    JsonBuilder *b = json_builder_new();
    json_builder_begin_array(b);
    for (guint i = 0; i < webkit_option_menu_get_n_items(menu); i++) {
        WebKitOptionMenuItem *it = webkit_option_menu_get_item(menu, i);
        json_builder_begin_object(b);
        json_builder_set_member_name(b, "label"); json_builder_add_string_value(b, webkit_option_menu_item_get_label(it));
        json_builder_set_member_name(b, "enabled"); json_builder_add_boolean_value(b, webkit_option_menu_item_is_enabled(it));
        json_builder_set_member_name(b, "selected"); json_builder_add_boolean_value(b, webkit_option_menu_item_is_selected(it));
        json_builder_set_member_name(b, "group"); json_builder_add_boolean_value(b, webkit_option_menu_item_is_group_label(it));
        json_builder_set_member_name(b, "child"); json_builder_add_boolean_value(b, webkit_option_menu_item_is_group_child(it));
        json_builder_end_object(b);
    }
    json_builder_end_array(b);
    JsonGenerator *g = json_generator_new();
    JsonNode *root = json_builder_get_root(b);
    json_generator_set_root(g, root);
    char *items = json_generator_to_data(g, NULL);
    char *js = g_strdup_printf("window.__kibble&&__kibble._options(%d,%d,%d,%d,%s)", rect->x, rect->y, rect->width, rect->height, items);
    run_js(w, js, "kibble://options");
    g_free(js); g_free(items);
    json_node_unref(root); g_object_unref(g); g_object_unref(b);
    return TRUE;
}

/* alert / confirm / prompt: shown by the app as a palOS sheet */
static gboolean on_script_dialog(WebKitWebView *web, WebKitScriptDialog *dialog, gpointer data)
{
    (void)web;
    Win *w = data;
    WebKitScriptDialogType t = webkit_script_dialog_get_dialog_type(dialog);
    int rid = next_rid++;
    g_hash_table_insert(dialogs, GINT_TO_POINTER(rid), webkit_script_dialog_ref(dialog));
    JsonBuilder *b = ev_begin("dialog", w->id);
    json_builder_set_member_name(b, "rid"); json_builder_add_int_value(b, rid);
    json_builder_set_member_name(b, "kind");
    json_builder_add_string_value(b, t == WEBKIT_SCRIPT_DIALOG_ALERT ? "alert" : t == WEBKIT_SCRIPT_DIALOG_CONFIRM ? "confirm"
                                     : t == WEBKIT_SCRIPT_DIALOG_PROMPT ? "prompt" : "leave");
    json_builder_set_member_name(b, "message"); json_builder_add_string_value(b, webkit_script_dialog_get_message(dialog));
    if (t == WEBKIT_SCRIPT_DIALOG_PROMPT) {
        json_builder_set_member_name(b, "default");
        json_builder_add_string_value(b, webkit_script_dialog_prompt_get_default_text(dialog));
    }
    emit(b);
    return TRUE;
}

static void dialog_reply(JsonObject *m)
{
    int rid = (int)json_object_get_int_member_with_default(m, "rid", 0);
    WebKitScriptDialog *d = g_hash_table_lookup(dialogs, GINT_TO_POINTER(rid));
    if (!d) return;
    gboolean ok = json_object_get_boolean_member_with_default(m, "ok", FALSE);
    WebKitScriptDialogType t = webkit_script_dialog_get_dialog_type(d);
    if (t == WEBKIT_SCRIPT_DIALOG_CONFIRM || t == WEBKIT_SCRIPT_DIALOG_BEFORE_UNLOAD_CONFIRM) webkit_script_dialog_confirm_set_confirmed(d, ok);
    else if (t == WEBKIT_SCRIPT_DIALOG_PROMPT && ok) webkit_script_dialog_prompt_set_text(d, json_object_get_string_member_with_default(m, "text", ""));
    webkit_script_dialog_close(d);
    g_hash_table_remove(dialogs, GINT_TO_POINTER(rid));
}

static void on_view_resized(WPEView *view, gpointer data)
{
    Win *w = data;
    JsonBuilder *b = ev_begin("resized", w->id);
    json_builder_set_member_name(b, "width"); json_builder_add_int_value(b, wpe_view_get_width(view));
    json_builder_set_member_name(b, "height"); json_builder_add_int_value(b, wpe_view_get_height(view));
    emit(b);
}

static void on_view_focus(GObject *o, GParamSpec *ps, gpointer data)
{
    (void)ps;
    JsonBuilder *b = ev_begin("focus", ((Win *)data)->id);
    json_builder_set_member_name(b, "focused"); json_builder_add_boolean_value(b, wpe_view_get_has_focus(WPE_VIEW(o)));
    emit(b);
}

/* ---------------------------------------------------------------- window manager hooks */
static void hook_close(WPEToplevel *tl, gpointer data) { (void)data; Win *w = win_of_toplevel(tl); if (w) ev_simple("close-requested", w->id); }

static void hook_drop(WPEToplevel *tl, int phase, int x, int y, const char *uris, gpointer data)
{
    (void)data;
    Win *w = win_of_toplevel(tl);
    if (!w) return;
    char *esc = g_strescape(uris, NULL);
    char *js = g_strdup_printf("window.__kibble&&__kibble._drop(%d,%d,%d,\"%s\")", phase, x, y, esc);
    run_js(w, js, "kibble://drop");
    g_free(js); g_free(esc);
}

static void hook_gesture(WPEToplevel *tl, int phase, double scale, double rotation, double x, double y, gpointer data)
{
    (void)data;
    Win *w = win_of_toplevel(tl);
    if (!w) return;
    double s = wpe_toplevel_get_scale(tl);
    char js[256];
    g_snprintf(js, sizeof js, "window.__kibble&&__kibble._gesture&&__kibble._gesture(%d,%.5f,%.3f,%.1f,%.1f)", phase, scale, rotation, x / s, y / s);
    run_js(w, js, "kibble://gesture");
}

static void apply_theme(void)
{
    WPESettings *s = wpe_display_get_settings(WPE_DISPLAY(display));
    if (!g_strcmp0(theme_mode, "dark") || !g_strcmp0(theme_mode, "light"))
        wpe_settings_set_boolean(s, WPE_SETTING_DARK_MODE, !g_strcmp0(theme_mode, "dark"), WPE_SETTINGS_SOURCE_APPLICATION, NULL);
    else
        wpe_settings_set_boolean(s, WPE_SETTING_DARK_MODE, paladin_display_dark(display), WPE_SETTINGS_SOURCE_PLATFORM, NULL);
}

static void hook_dark(gboolean dark, gpointer data)
{
    (void)data;
    apply_theme();
    JsonBuilder *b = ev_begin("dark", 0);
    json_builder_set_member_name(b, "dark"); json_builder_add_boolean_value(b, dark);
    emit(b);
}

/* ---------------------------------------------------------------- shortcuts anywhere (globalShortcut) */
typedef struct { int n; unsigned int code, mods; } Grab;
static GArray *grabs;
static const unsigned int lock_variants[4] = { 0, LockMask, Mod2Mask, LockMask | Mod2Mask };

static void hook_root_key(unsigned int code, unsigned int state, gpointer data)
{
    (void)data;
    unsigned int mods = state & (ShiftMask | ControlMask | Mod1Mask | Mod4Mask);
    for (guint i = 0; grabs && i < grabs->len; i++) {
        Grab *g = &g_array_index(grabs, Grab, i);
        if (g->code != code || g->mods != mods) continue;
        JsonBuilder *b = ev_begin("shortcut", 0);
        json_builder_set_member_name(b, "n"); json_builder_add_int_value(b, g->n);
        emit(b);
        return;
    }
}

static gboolean grab_failed;
static int grab_error(Display *d, XErrorEvent *e) { (void)d; (void)e; grab_failed = TRUE; return 0; }

static void grab_key(JsonObject *m)
{
    Display *dpy = paladin_display_get_xdisplay(display);
    int n = (int)json_object_get_int_member_with_default(m, "n", 0);
    xkb_keysym_t sym = xkb_keysym_from_name(json_object_get_string_member_with_default(m, "key", ""), XKB_KEYSYM_CASE_INSENSITIVE);
    KeyCode code = sym != XKB_KEY_NoSymbol ? XKeysymToKeycode(dpy, sym) : 0;
    int mods = (int)json_object_get_int_member_with_default(m, "mods", 0);
    unsigned int xm = ((mods & 1) ? ControlMask : 0) | ((mods & 2) ? ShiftMask : 0) | ((mods & 4) ? Mod1Mask : 0) | ((mods & 8) ? Mod4Mask : 0);
    gboolean ok = FALSE;
    if (code) {
        XSync(dpy, False);
        grab_failed = FALSE;
        XErrorHandler old = XSetErrorHandler(grab_error);
        for (int k = 0; k < 4; k++) XGrabKey(dpy, code, xm | lock_variants[k], DefaultRootWindow(dpy), False, GrabModeAsync, GrabModeAsync);
        XSync(dpy, False);
        XSetErrorHandler(old);
        ok = !grab_failed;
        if (ok) { if (!grabs) grabs = g_array_new(FALSE, FALSE, sizeof(Grab)); Grab g = { n, code, xm }; g_array_append_val(grabs, g); }
        else for (int k = 0; k < 4; k++) XUngrabKey(dpy, code, xm | lock_variants[k], DefaultRootWindow(dpy));
    }
    JsonBuilder *b = ev_begin("grab-result", 0);
    json_builder_set_member_name(b, "n"); json_builder_add_int_value(b, n);
    json_builder_set_member_name(b, "ok"); json_builder_add_boolean_value(b, ok);
    emit(b);
}

static void ungrab_key(JsonObject *m)
{
    Display *dpy = paladin_display_get_xdisplay(display);
    int n = (int)json_object_get_int_member_with_default(m, "n", 0);
    for (guint i = 0; grabs && i < grabs->len; i++) {
        Grab *g = &g_array_index(grabs, Grab, i);
        if (g->n != n) continue;
        for (int k = 0; k < 4; k++) XUngrabKey(dpy, g->code, g->mods | lock_variants[k], DefaultRootWindow(dpy));
        g_array_remove_index(grabs, i);
        break;
    }
    XFlush(dpy);
}

/* ---------------------------------------------------------------- answering eval */
typedef struct { int id, req; char *js; gboolean retried; } EvalCtx;

static void eval_send(EvalCtx *c, JSCValue *v, GError *err)
{
    JsonBuilder *b = ev_begin("eval-result", c->id);
    json_builder_set_member_name(b, "req"); json_builder_add_int_value(b, c->req);
    json_builder_set_member_name(b, "ok"); json_builder_add_boolean_value(b, err == NULL);
    if (err) { json_builder_set_member_name(b, "error"); json_builder_add_string_value(b, err->message); }
    else if (v && !jsc_value_is_undefined(v)) {
        char *j = jsc_value_to_json(v, 0);
        if (j) { json_builder_set_member_name(b, "json"); json_builder_add_string_value(b, j); g_free(j); }
    }
    emit(b);
}

static void eval_plain_done(GObject *o, GAsyncResult *r, gpointer data)
{
    EvalCtx *c = data;
    GError *err = NULL;
    JSCValue *v = webkit_web_view_evaluate_javascript_finish(WEBKIT_WEB_VIEW(o), r, &err);
    eval_send(c, v, err);
    if (v) g_object_unref(v);
    if (err) g_error_free(err);
    g_free(c->js); g_free(c);
}

static void eval_async_done(GObject *o, GAsyncResult *r, gpointer data)
{
    EvalCtx *c = data;
    GError *err = NULL;
    JSCValue *v = webkit_web_view_call_async_javascript_function_finish(WEBKIT_WEB_VIEW(o), r, &err);
    if (err && strstr(err->message, "SyntaxError")) {
        /* statements, not an expression: run it as a script (its last value is the answer) */
        g_error_free(err);
        webkit_web_view_evaluate_javascript(WEBKIT_WEB_VIEW(o), c->js, -1, NULL, "kibble://main", NULL, eval_plain_done, c);
        return;
    }
    eval_send(c, v, err);
    if (v) g_object_unref(v);
    if (err) g_error_free(err);
    g_free(c->js); g_free(c);
}

/* ---------------------------------------------------------------- a picture of the page (capturePage, printToPDF) */
typedef struct { int id, req; char *path; } SnapCtx;

static void snapshot_done(GObject *o, GAsyncResult *r, gpointer data)
{
    SnapCtx *c = data;
    GError *err = NULL;
    WebKitImage *img = webkit_web_view_get_snapshot_finish(WEBKIT_WEB_VIEW(o), r, &err);
    JsonBuilder *b = ev_begin("snapshot", c->id);
    json_builder_set_member_name(b, "req"); json_builder_add_int_value(b, c->req);
    if (img) {
        /* written as "W H\n" + RGBA (straight alpha), the same as kibble-image */
        int w = webkit_image_get_width(img), h = webkit_image_get_height(img), stride = webkit_image_get_stride(img);
        GBytes *bytes = webkit_image_as_bytes(img);
        const guint8 *px = g_bytes_get_data(bytes, NULL);
        FILE *f = fopen(c->path, "wb");
        if (f) {
            fprintf(f, "%d %d\n", w, h);
            guint8 *row = g_malloc((gsize)w * 4);
            for (int y = 0; y < h; y++) {
                const guint8 *s = px + (gsize)y * stride;
                for (int x = 0; x < w; x++) {      /* premultiplied B, G, R, A in memory */
                    guint8 a = s[4 * x + 3];
                    row[4 * x] = a ? MIN(255, s[4 * x + 2] * 255 / a) : 0;
                    row[4 * x + 1] = a ? MIN(255, s[4 * x + 1] * 255 / a) : 0;
                    row[4 * x + 2] = a ? MIN(255, s[4 * x] * 255 / a) : 0;
                    row[4 * x + 3] = a;
                }
                fwrite(row, 1, (gsize)w * 4, f);
            }
            g_free(row);
            fclose(f);
            json_builder_set_member_name(b, "file"); json_builder_add_string_value(b, c->path);
        }
        g_object_unref(img);      /* (the bytes belong to the image) */
    } else {
        json_builder_set_member_name(b, "error"); json_builder_add_string_value(b, err ? err->message : "no picture");
    }
    if (err) g_error_free(err);
    emit(b);
    g_free(c->path); g_free(c);
}

static void snapshot(Win *w, JsonObject *m)
{
    SnapCtx *c = g_new0(SnapCtx, 1);
    c->id = w->id; c->req = (int)json_object_get_int_member_with_default(m, "req", 0);
    c->path = g_strdup(json_object_get_string_member_with_default(m, "path", "/tmp/kibble-snapshot.raw"));
    gboolean full = json_object_get_boolean_member_with_default(m, "full", FALSE);
    webkit_web_view_get_snapshot(w->web, full ? WEBKIT_SNAPSHOT_REGION_FULL_DOCUMENT : WEBKIT_SNAPSHOT_REGION_VISIBLE,
                                 WEBKIT_SNAPSHOT_OPTIONS_NONE, NULL, snapshot_done, c);
}

/* ---------------------------------------------------------------- windows */
static PaladinToplevelOptions opts_from(JsonObject *m)
{
    PaladinToplevelOptions o = {0};
    o.width = (int)json_object_get_int_member_with_default(m, "width", 800);
    o.height = (int)json_object_get_int_member_with_default(m, "height", 600);
    o.x = (int)json_object_get_int_member_with_default(m, "x", -1);
    o.y = (int)json_object_get_int_member_with_default(m, "y", -1);
    o.transparent = json_object_get_boolean_member_with_default(m, "transparent", FALSE);
    o.frame = json_object_get_boolean_member_with_default(m, "frame", TRUE);
    o.always_on_top = json_object_get_boolean_member_with_default(m, "alwaysOnTop", FALSE);
    o.skip_taskbar = json_object_get_boolean_member_with_default(m, "skipTaskbar", FALSE);
    o.sticky = json_object_get_boolean_member_with_default(m, "sticky", FALSE);
    o.focusable = json_object_get_boolean_member_with_default(m, "focusable", TRUE);
    o.click_through = json_object_get_boolean_member_with_default(m, "clickThrough", FALSE);
    o.type = json_object_get_string_member_with_default(m, "type", "");
    o.parent = (Window)json_object_get_int_member_with_default(m, "parent", 0);
    o.wm_class = getenv("KIBBLE_APP_CLASS");
    o.wm_name = getenv("KIBBLE_APP_ID");
    return o;
}

static void create_window(JsonObject *m)
{
    Win *w = g_new0(Win, 1);
    w->id = (int)json_object_get_int_member_with_default(m, "id", 0);
    PaladinToplevelOptions o = opts_from(m);
    w->focusable = o.focusable;
    w->show = json_object_get_boolean_member_with_default(m, "show", TRUE);
    w->tl = PALADIN_TOPLEVEL(paladin_toplevel_new(display, &o));
    wpe_toplevel_set_title(WPE_TOPLEVEL(w->tl), json_object_get_string_member_with_default(m, "title", ""));

    w->ucm = webkit_user_content_manager_new();
    const char *bridge = json_object_get_string_member_with_default(m, "bridge", NULL);
    if (bridge) {
        WebKitUserScript *s = webkit_user_script_new(bridge, WEBKIT_USER_CONTENT_INJECT_TOP_FRAME,
                                                     WEBKIT_USER_SCRIPT_INJECT_AT_DOCUMENT_START, NULL, NULL);
        webkit_user_content_manager_add_script(w->ucm, s);
        webkit_user_script_unref(s);
    }
    webkit_user_content_manager_register_script_message_handler(w->ucm, "kibble", NULL);
    g_signal_connect(w->ucm, "script-message-received::kibble", G_CALLBACK(on_message), w);

    w->web = g_object_new(WEBKIT_TYPE_WEB_VIEW, "display", display, "web-context", context, "network-session", session,
                          "settings", settings, "user-content-manager", w->ucm, NULL);
    g_object_ref_sink(w->web);
    WPEView *view = webkit_web_view_get_wpe_view(w->web);
    wpe_view_set_toplevel(view, WPE_TOPLEVEL(w->tl));
    if (o.transparent) {
        WebKitColor clear = { 0, 0, 0, 0 };
        webkit_web_view_set_background_color(w->web, &clear);
    }
    g_signal_connect(w->web, "load-changed", G_CALLBACK(on_load_changed), w);
    g_signal_connect(w->web, "load-failed", G_CALLBACK(on_load_failed), w);
    g_signal_connect(w->web, "notify::title", G_CALLBACK(on_title), w);
    g_signal_connect(w->web, "decide-policy", G_CALLBACK(on_decide), w);
    g_signal_connect(w->web, "create", G_CALLBACK(on_create), w);
    g_signal_connect(w->web, "close", G_CALLBACK(on_close), w);
    g_signal_connect(w->web, "web-process-terminated", G_CALLBACK(on_terminated), w);
    g_signal_connect(w->web, "show-option-menu", G_CALLBACK(on_option_menu), w);
    g_signal_connect(w->web, "script-dialog", G_CALLBACK(on_script_dialog), w);
    g_signal_connect(view, "resized", G_CALLBACK(on_view_resized), w);
    g_signal_connect(view, "notify::has-focus", G_CALLBACK(on_view_focus), w);
    g_hash_table_insert(wins, GINT_TO_POINTER(w->id), w);

    JsonBuilder *b = ev_begin("xid", w->id);
    json_builder_set_member_name(b, "xid"); json_builder_add_int_value(b, (gint64)paladin_toplevel_get_window(w->tl));
    emit(b);
    const char *url = json_object_get_string_member_with_default(m, "url", "about:blank");
    webkit_web_view_load_uri(w->web, url);
    if (w->show) paladin_toplevel_show(w->tl, w->focusable);
}

static void destroy_window(Win *w)
{
    if (w->menu) { webkit_option_menu_close(w->menu); g_clear_object(&w->menu); }
    g_signal_handlers_disconnect_by_data(w->web, w);
    g_signal_handlers_disconnect_by_data(webkit_web_view_get_wpe_view(w->web), w);
    g_signal_handlers_disconnect_by_data(w->ucm, w);
    paladin_toplevel_hide(w->tl);
    wpe_toplevel_closed(WPE_TOPLEVEL(w->tl));
    g_object_unref(w->web);
    g_object_unref(w->ucm);
    g_object_run_dispose(G_OBJECT(w->tl));
    g_object_unref(w->tl);
    g_free(w);
}

/* a key press from the app (sendInputEvent): delivered as if typed */
static void send_key(Win *w, JsonObject *m)
{
    const char *name = json_object_get_string_member_with_default(m, "key", "");
    int mods = (int)json_object_get_int_member_with_default(m, "mods", 0);
    gboolean down = json_object_get_boolean_member_with_default(m, "down", TRUE);
    xkb_keysym_t sym = xkb_keysym_from_name(name, XKB_KEYSYM_NO_FLAGS);
    if (sym == XKB_KEY_NoSymbol) sym = xkb_keysym_from_name(name, XKB_KEYSYM_CASE_INSENSITIVE);
    if (sym == XKB_KEY_NoSymbol) return;
    Display *dpy = paladin_display_get_xdisplay(display);
    KeyCode code = XKeysymToKeycode(dpy, sym);
    WPEModifiers wm = 0;
    if (mods & 1) wm |= WPE_MODIFIER_KEYBOARD_CONTROL;
    if (mods & 2) wm |= WPE_MODIFIER_KEYBOARD_SHIFT;
    if (mods & 4) wm |= WPE_MODIFIER_KEYBOARD_ALT;
    if (mods & 8) wm |= WPE_MODIFIER_KEYBOARD_META;
    WPEView *view = webkit_web_view_get_wpe_view(w->web);
    WPEEvent *e = wpe_event_keyboard_new(down ? WPE_EVENT_KEYBOARD_KEY_DOWN : WPE_EVENT_KEYBOARD_KEY_UP, view, WPE_INPUT_SOURCE_KEYBOARD,
                                         (guint32)(g_get_monotonic_time() / 1000), wm, code, sym);
    wpe_view_event(view, e);
    wpe_event_unref(e);
}

static int *rects_of(JsonObject *m, int *n, gboolean *all)
{
    *all = !json_object_has_member(m, "rects") || JSON_NODE_HOLDS_NULL(json_object_get_member(m, "rects"));
    *n = 0;
    if (*all) return NULL;
    JsonArray *a = json_object_get_array_member(m, "rects");
    *n = (int)json_array_get_length(a);
    int *r = g_new0(int, 4 * MAX(*n, 1));
    for (int i = 0; i < *n; i++) {
        JsonArray *q = json_array_get_array_element(a, i);
        for (int k = 0; k < 4 && q && (guint)k < json_array_get_length(q); k++) r[4 * i + k] = (int)json_array_get_int_element(q, k);
    }
    return r;
}

static void handle(JsonObject *m)
{
    const char *op = json_object_get_string_member_with_default(m, "op", "");
    if (!strcmp(op, "create")) { create_window(m); return; }
    if (!strcmp(op, "scheme")) { register_scheme(json_object_get_string_member_with_default(m, "name", NULL)); return; }
    if (!strcmp(op, "scheme-reply")) { scheme_reply(m); return; }
    if (!strcmp(op, "dialog-reply")) { dialog_reply(m); return; }
    if (!strcmp(op, "quit")) { g_main_loop_quit(loop); return; }
    if (!strcmp(op, "grab-key")) { grab_key(m); return; }
    if (!strcmp(op, "ungrab-key")) { ungrab_key(m); return; }
    if (!strcmp(op, "clipboard")) {
        paladin_clipboard_set_text(PALADIN_CLIPBOARD(wpe_display_get_clipboard(WPE_DISPLAY(display))),
                                   json_object_get_string_member_with_default(m, "text", ""));
        return;
    }
    if (!strcmp(op, "theme") && !json_object_has_member(m, "id")) {
        g_free(theme_mode); theme_mode = g_strdup(json_object_get_string_member_with_default(m, "mode", "system")); apply_theme(); return;
    }
    Win *w = g_hash_table_lookup(wins, GINT_TO_POINTER((int)json_object_get_int_member_with_default(m, "id", 0)));
    if (!w) return;
    if (!strcmp(op, "load")) webkit_web_view_load_uri(w->web, json_object_get_string_member_with_default(m, "url", "about:blank"));
    else if (!strcmp(op, "eval")) {
        const char *js = json_object_get_string_member_with_default(m, "js", "");
        if (!json_object_has_member(m, "req")) { run_js(w, js, "kibble://main"); return; }
        EvalCtx *c = g_new0(EvalCtx, 1);
        c->id = w->id; c->req = (int)json_object_get_int_member(m, "req"); c->js = g_strdup(js);
        /* as Electron's executeJavaScript: a promise is waited for */
        char *body = g_strdup_printf("return await (%s\n)", js);
        webkit_web_view_call_async_javascript_function(w->web, body, -1, NULL, NULL, "kibble://main", NULL, eval_async_done, c);
        g_free(body);
    } else if (!strcmp(op, "script")) {
        WebKitUserScript *s = webkit_user_script_new(json_object_get_string_member_with_default(m, "js", ""), WEBKIT_USER_CONTENT_INJECT_ALL_FRAMES,
                                                     WEBKIT_USER_SCRIPT_INJECT_AT_DOCUMENT_START, NULL, NULL);
        webkit_user_content_manager_add_script(w->ucm, s);
        webkit_user_script_unref(s);
    }
    else if (!strcmp(op, "show")) { w->show = TRUE; paladin_toplevel_show(w->tl, FALSE); }
    else if (!strcmp(op, "hide")) { w->show = FALSE; paladin_toplevel_hide(w->tl); }
    else if (!strcmp(op, "focus")) { if (w->focusable) paladin_toplevel_focus(w->tl); }
    else if (!strcmp(op, "close")) { g_hash_table_steal(wins, GINT_TO_POINTER(w->id)); destroy_window(w); }
    else if (!strcmp(op, "title")) wpe_toplevel_set_title(WPE_TOPLEVEL(w->tl), json_object_get_string_member_with_default(m, "title", ""));
    else if (!strcmp(op, "resize")) wpe_toplevel_resize(WPE_TOPLEVEL(w->tl), (int)json_object_get_int_member_with_default(m, "width", 800),
                                                        (int)json_object_get_int_member_with_default(m, "height", 600));
    else if (!strcmp(op, "move")) paladin_toplevel_move(w->tl, (int)json_object_get_int_member_with_default(m, "x", 0),
                                                        (int)json_object_get_int_member_with_default(m, "y", 0));
    else if (!strcmp(op, "maximize")) wpe_toplevel_maximize(WPE_TOPLEVEL(w->tl));
    else if (!strcmp(op, "unmaximize")) wpe_toplevel_unmaximize(WPE_TOPLEVEL(w->tl));
    else if (!strcmp(op, "minimize")) wpe_toplevel_minimize(WPE_TOPLEVEL(w->tl));
    else if (!strcmp(op, "fullscreen")) wpe_toplevel_fullscreen(WPE_TOPLEVEL(w->tl));
    else if (!strcmp(op, "unfullscreen")) wpe_toplevel_unfullscreen(WPE_TOPLEVEL(w->tl));
    else if (!strcmp(op, "shape")) {
        int n; gboolean all;
        int *r = rects_of(m, &n, &all);
        paladin_toplevel_set_shape(w->tl, !g_strcmp0(json_object_get_string_member_with_default(m, "kind", "bounding"), "input"), r, n, all);
        g_free(r);
    } else if (!strcmp(op, "xprop")) {
        JsonArray *a = json_object_has_member(m, "values") ? json_object_get_array_member(m, "values") : NULL;
        int n = a ? (int)json_array_get_length(a) : 0;
        const char **v = g_new0(const char *, MAX(n, 1));
        char **owned = g_new0(char *, MAX(n, 1));
        for (int i = 0; i < n; i++) {
            JsonNode *e = json_array_get_element(a, i);
            owned[i] = json_node_get_value_type(e) == G_TYPE_STRING ? g_strdup(json_node_get_string(e))
                                                                    : g_strdup_printf("%" G_GINT64_FORMAT, json_node_get_int(e));
            v[i] = owned[i];
        }
        paladin_toplevel_set_property(w->tl, json_object_get_string_member_with_default(m, "name", ""),
                                      json_object_get_string_member_with_default(m, "type", "CARDINAL"), v, n);
        for (int i = 0; i < n; i++) g_free(owned[i]);
        g_free(owned); g_free(v);
    } else if (!strcmp(op, "key")) send_key(w, m);
    else if (!strcmp(op, "snapshot")) snapshot(w, m);
    else if (!strcmp(op, "theme")) { g_free(theme_mode); theme_mode = g_strdup(json_object_get_string_member_with_default(m, "mode", "system")); apply_theme(); }
    else if (!strcmp(op, "startDrag")) {
        JsonArray *a = json_object_get_array_member(m, "uris");
        int n = a ? (int)json_array_get_length(a) : 0;
        const char **uris = g_new0(const char *, n + 1);
        for (int i = 0; i < n; i++) uris[i] = json_array_get_string_element(a, i);
        guchar *rgba = NULL; gsize len = 0; int iw = 0, ih = 0;
        if (json_object_has_member(m, "icon") && JSON_NODE_HOLDS_OBJECT(json_object_get_member(m, "icon"))) {
            JsonObject *ic = json_object_get_object_member(m, "icon");
            iw = (int)json_object_get_int_member_with_default(ic, "w", 0); ih = (int)json_object_get_int_member_with_default(ic, "h", 0);
            rgba = g_base64_decode(json_object_get_string_member_with_default(ic, "rgba", ""), &len);
            if (len < (gsize)iw * ih * 4) { g_free(rgba); rgba = NULL; }
        }
        paladin_dnd_start(w->tl, uris, n, rgba, iw, ih);
        g_free(rgba); g_free(uris);
    }
}

static gboolean on_stdin(GIOChannel *ch, GIOCondition cond, gpointer data)
{
    (void)data;
    if (cond & (G_IO_HUP | G_IO_ERR)) { g_main_loop_quit(loop); return G_SOURCE_REMOVE; }
    char *line = NULL; gsize len = 0;
    GIOStatus st;
    while ((st = g_io_channel_read_line(ch, &line, &len, NULL, NULL)) == G_IO_STATUS_NORMAL) {
        JsonParser *p = json_parser_new();
        if (line && json_parser_load_from_data(p, line, -1, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(p)))
            handle(json_node_get_object(json_parser_get_root(p)));
        g_object_unref(p);
        g_free(line); line = NULL;
        if (!g_io_channel_get_buffer_condition(ch)) break;
    }
    if (st == G_IO_STATUS_EOF) { g_main_loop_quit(loop); return G_SOURCE_REMOVE; }
    return G_SOURCE_CONTINUE;
}

int main(int argc, char **argv)
{
    (void)argc; (void)argv;
    setlocale(LC_ALL, "");
    /* the page's own words (spell checking, dates) in the language palOS is set to */
    const char *lang = getenv("PALOS_LANG");
    if (!lang) lang = getenv("LANGUAGE");
    if (!lang) lang = getenv("LC_ALL");
    if (!lang) lang = getenv("LC_MESSAGES");
    if (!lang) lang = getenv("LANG");

    display = paladin_display_new();
    GError *err = NULL;
    if (!wpe_display_connect(WPE_DISPLAY(display), &err)) {
        fprintf(stderr, "kibble-host: %s\n", err ? err->message : "no display");
        return 1;
    }
    wpe_display_set_primary(WPE_DISPLAY(display));
    /* each window comes with its own (made here, with the app's options) */
    wpe_settings_set_boolean(wpe_display_get_settings(WPE_DISPLAY(display)), WPE_SETTING_CREATE_VIEWS_WITH_A_TOPLEVEL, FALSE,
                             WPE_SETTINGS_SOURCE_APPLICATION, NULL);
    PaladinHooks hooks = { hook_close, hook_drop, hook_gesture, hook_dark, hook_root_key, NULL };
    paladin_display_set_hooks(display, &hooks);

    const char *data_dir = getenv("KIBBLE_DATA_DIR"), *cache_dir = getenv("KIBBLE_CACHE_DIR");
    session = webkit_network_session_new(data_dir, cache_dir);
    context = webkit_web_context_new();
    if (lang && *lang) {
        char *l = g_strdup(lang);
        char *dot = strpbrk(l, ".:@"); if (dot) *dot = 0;
        const char *langs[] = { l, NULL };
        webkit_web_context_set_preferred_languages(context, langs);
        webkit_web_context_set_spell_checking_languages(context, langs);
        webkit_web_context_set_spell_checking_enabled(context, TRUE);
        g_free(l);
    }
    settings = webkit_settings_new_with_settings("enable-developer-extras", getenv("KIBBLE_DEBUG") != NULL,
                                                 "enable-webgl", TRUE,
                                                 "allow-file-access-from-file-urls", TRUE,
                                                 "allow-universal-access-from-file-urls", TRUE,
                                                 "javascript-can-access-clipboard", TRUE,
                                                 "enable-media", TRUE, "enable-mediasource", TRUE,
                                                 "enable-webaudio", TRUE, "enable-media-stream", TRUE,
                                                 "media-playback-requires-user-gesture", FALSE,
                                                 NULL);
    wins = g_hash_table_new(g_direct_hash, g_direct_equal);
    schemes = g_hash_table_new_full(g_str_hash, g_str_equal, g_free, NULL);
    scheme_waiting = g_hash_table_new_full(g_direct_hash, g_direct_equal, NULL, g_object_unref);
    dialogs = g_hash_table_new_full(g_direct_hash, g_direct_equal, NULL, (GDestroyNotify)webkit_script_dialog_unref);
    theme_mode = g_strdup("system");
    register_scheme("kibble-ipc");     /* ipcRenderer.sendSync */

    loop = g_main_loop_new(NULL, FALSE);
    GIOChannel *in = g_io_channel_unix_new(0);
    g_io_channel_set_encoding(in, NULL, NULL);
    g_io_add_watch(in, G_IO_IN | G_IO_HUP | G_IO_ERR, on_stdin, NULL);

    WPEScreen *s = wpe_display_get_screen(WPE_DISPLAY(display), 0);
    int wx, wy, ww, wh;
    paladin_display_get_workarea(display, &wx, &wy, &ww, &wh);
    double sc = s ? wpe_screen_get_scale(s) : 1;
    JsonBuilder *b = ev_begin("ready", 0);
    json_builder_set_member_name(b, "screen");
    json_builder_begin_object(b);
    json_builder_set_member_name(b, "width"); json_builder_add_int_value(b, (gint64)((s ? wpe_screen_get_width(s) : 1280) / sc));
    json_builder_set_member_name(b, "height"); json_builder_add_int_value(b, (gint64)((s ? wpe_screen_get_height(s) : 800) / sc));
    json_builder_set_member_name(b, "work");
    json_builder_begin_object(b);
    json_builder_set_member_name(b, "x"); json_builder_add_int_value(b, (gint64)(wx / sc));
    json_builder_set_member_name(b, "y"); json_builder_add_int_value(b, (gint64)(wy / sc));
    json_builder_set_member_name(b, "width"); json_builder_add_int_value(b, (gint64)(ww / sc));
    json_builder_set_member_name(b, "height"); json_builder_add_int_value(b, (gint64)(wh / sc));
    json_builder_end_object(b);
    json_builder_end_object(b);
    json_builder_set_member_name(b, "dark"); json_builder_add_boolean_value(b, paladin_display_dark(display));
    emit(b);

    g_main_loop_run(loop);

    GHashTableIter it; gpointer k, v;
    g_hash_table_iter_init(&it, wins);
    while (g_hash_table_iter_next(&it, &k, &v)) { g_hash_table_iter_steal(&it); destroy_window(v); }
    return 0;
}

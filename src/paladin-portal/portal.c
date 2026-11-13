/* paladin-portal: palOS's desktop portal (xdg-desktop-portal's backend for the Paladin desktop).

     org.freedesktop.impl.portal.FileChooser  OpenFile, SaveFile, SaveFiles: palOS's Open and Save sheet (the same
                                              one Seeker and every palOS app use), rolling out from under the title
                                              bar of the window that asked, instead of a separate file chooser
     org.freedesktop.impl.portal.Settings     Dark Mode (org.freedesktop.appearance color-scheme) and the interface
                                              settings (fonts, icons, cursor) from palOS's settings (palos-pref), with
                                              SettingChanged when they change

   The sheet is drawn by chooser/ (on Kibble), started when asked and stopped a minute after the last request;
   it talks JSON lines: {id, kind, title, filters, multi, folder, button, dir, name, top} in, {id, xid} (its
   window is made: hang it under the parent, then {show: id}) and {id, result: {path|paths}} out,
   {cancel: id} / {quit: true} in. The service stays for the session (it announces setting changes). */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fnmatch.h>
#include <gio/gio.h>
#include <json-glib/json-glib.h>
#include <X11/Xlib.h>
#include <X11/Xatom.h>

#define BUS_NAME "org.freedesktop.impl.portal.desktop.paladin"
#define OBJ "/org/freedesktop/portal/desktop"
#define CHOOSER "/usr/lib/paladin-portal/chooser"
#define RUNTIME "/usr/lib/kibble/kibble"
#define IDLE_QUIT 60
enum { SUCCESS, CANCELLED, FAILED };

static GDBusConnection *bus;
static Display *dpy;

static const char *XML =
    "<node>"
    "<interface name='org.freedesktop.impl.portal.FileChooser'>"
    "<method name='OpenFile'><arg type='o' direction='in'/><arg type='s' direction='in'/><arg type='s' direction='in'/><arg type='s' direction='in'/>"
    "<arg type='a{sv}' direction='in'/><arg type='u' direction='out'/><arg type='a{sv}' direction='out'/></method>"
    "<method name='SaveFile'><arg type='o' direction='in'/><arg type='s' direction='in'/><arg type='s' direction='in'/><arg type='s' direction='in'/>"
    "<arg type='a{sv}' direction='in'/><arg type='u' direction='out'/><arg type='a{sv}' direction='out'/></method>"
    "<method name='SaveFiles'><arg type='o' direction='in'/><arg type='s' direction='in'/><arg type='s' direction='in'/><arg type='s' direction='in'/>"
    "<arg type='a{sv}' direction='in'/><arg type='u' direction='out'/><arg type='a{sv}' direction='out'/></method>"
    "</interface>"
    "<interface name='org.freedesktop.impl.portal.Settings'>"
    "<method name='ReadAll'><arg type='as' direction='in'/><arg type='a{sa{sv}}' direction='out'/></method>"
    "<method name='Read'><arg type='s' direction='in'/><arg type='s' direction='in'/><arg type='v' direction='out'/></method>"
    "<signal name='SettingChanged'><arg type='s'/><arg type='s'/><arg type='v'/></signal>"
    "</interface></node>";
static const char *REQUEST_XML = "<node><interface name='org.freedesktop.impl.portal.Request'><method name='Close'/></interface></node>";
static GDBusNodeInfo *info, *request_info;

/* ---------------------------------------------------------------- filters: portal -> sheet */
/* '*.png', '*.[pP][nN][gG]' (Chromium's case-insensitive form) -> "png"; '*' -> "*"; else NULL */
static char *glob_ext(const char *pat)
{
    char *p = g_strstrip(g_strdup(pat));
    if (!strcmp(p, "*") || !strcmp(p, "*.*")) { g_free(p); return g_strdup("*"); }
    GString *s = g_string_new(NULL);
    for (const char *c = p; *c; c++) {
        if (c[0] == '[' && c[1] && c[2] && c[3] == ']' && g_ascii_tolower(c[1]) == g_ascii_tolower(c[2])) { g_string_append_c(s, g_ascii_tolower(c[1])); c += 3; }
        else g_string_append_c(s, *c);
    }
    g_free(p);
    char *r = NULL;
    if (g_str_has_prefix(s->str, "*.") && !strpbrk(s->str + 2, "*?[]/")) r = g_ascii_strdown(s->str + 2, -1);
    g_string_free(s, TRUE);
    return r;
}

/* a MIME type's extensions, from the system's MIME database (shared-mime-info globs2) */
static void mime_exts(const char *mime, GPtrArray *out)
{
    char *m = g_ascii_strdown(mime, -1);
    if (!strcmp(m, "*/*") || !strcmp(m, "application/octet-stream")) { g_ptr_array_add(out, g_strdup("*")); g_free(m); return; }
    gboolean top = g_str_has_suffix(m, "/*");
    if (top) m[strlen(m) - 1] = 0;                   /* "image/" */
    char *data = NULL;
    if (g_file_get_contents("/usr/share/mime/globs2", &data, NULL, NULL)) {
        char **lines = g_strsplit(data, "\n", -1);
        for (char **l = lines; *l; l++) {
            char **f = g_strsplit(*l, ":", 4);       /* weight:type:glob[:flags] */
            if (f[0] && f[1] && f[2] && (top ? g_str_has_prefix(f[1], m) : !strcmp(f[1], m))) {
                char *e = glob_ext(f[2]);
                if (e && strcmp(e, "*")) g_ptr_array_add(out, e); else g_free(e);
            }
            g_strfreev(f);
        }
        g_strfreev(lines);
        g_free(data);
    }
    g_free(m);
}

static gboolean has_str(GPtrArray *a, const char *s) { for (guint i = 0; i < a->len; i++) if (!strcmp(a->pdata[i], s)) return TRUE; return FALSE; }

/* portal filters a(sa(us)) -> [{name, extensions}] */
static void add_filters(JsonBuilder *b, GVariant *filters)
{
    json_builder_set_member_name(b, "filters");
    json_builder_begin_array(b);
    if (filters) {
        GVariantIter it; const char *name; GVariant *rules;
        g_variant_iter_init(&it, filters);
        while (g_variant_iter_next(&it, "(&s@a(us))", &name, &rules)) {
            GPtrArray *exts = g_ptr_array_new_with_free_func(g_free);
            GVariantIter ri; guint32 kind; const char *pat;
            g_variant_iter_init(&ri, rules);
            while (g_variant_iter_next(&ri, "(u&s)", &kind, &pat)) {
                GPtrArray *got = g_ptr_array_new_with_free_func(g_free);
                if (kind == 0) { char *e = glob_ext(pat); if (e) g_ptr_array_add(got, e); }
                else mime_exts(pat, got);
                for (guint i = 0; i < got->len; i++) if (!has_str(exts, got->pdata[i])) g_ptr_array_add(exts, g_strdup(got->pdata[i]));
                g_ptr_array_unref(got);
            }
            if (exts->len) {
                json_builder_begin_object(b);
                json_builder_set_member_name(b, "name"); json_builder_add_string_value(b, name);
                json_builder_set_member_name(b, "extensions"); json_builder_begin_array(b);
                for (guint i = 0; i < exts->len; i++) json_builder_add_string_value(b, exts->pdata[i]);
                json_builder_end_array(b);
                json_builder_end_object(b);
            }
            g_ptr_array_unref(exts);
            g_variant_unref(rules);
        }
    }
    json_builder_end_array(b);
}

/* current_folder / current_file come as a NUL-terminated byte array */
static char *bytes_path(GVariant *opts, const char *key)
{
    GVariant *v = g_variant_lookup_value(opts, key, G_VARIANT_TYPE_BYTESTRING);
    char *s = v ? g_strdup(g_variant_get_bytestring(v)) : g_strdup("");
    if (v) g_variant_unref(v);
    return s;
}

static char *uri_of(const char *path)
{
    char *e = g_uri_escape_string(path, "/", TRUE);
    char *u = g_strconcat("file://", e, NULL);
    g_free(e);
    return u;
}

static char *default_save_dir(void)
{
    const char *d = g_get_user_special_dir(G_USER_DIRECTORY_DOWNLOAD);
    return g_strdup(d && g_file_test(d, G_FILE_TEST_IS_DIR) ? d : g_get_home_dir());
}

/* 'x11:1a00003' -> 0x1a00003 (Wayland parents can't be used on Paladin's X11 session) */
static Window parent_xid(const char *pw) { return pw && g_str_has_prefix(pw, "x11:") ? (Window)strtoul(pw + 4, NULL, 16) : 0; }

/* WM_TRANSIENT_FOR: the window manager then hangs the sheet under the parent's title bar */
static void belongs_to(Window xid, Window parent)
{
    if (!dpy || !xid || !parent) return;
    XChangeProperty(dpy, xid, XA_WM_TRANSIENT_FOR, XA_WINDOW, 32, PropModeReplace, (unsigned char *)&parent, 1);
    XSync(dpy, False);
}

/* ---------------------------------------------------------------- the sheet (chooser on Kibble) */
typedef enum { F_OPEN, F_SAVE, F_SAVEFILES } Finish;
typedef struct { int id; Window parent; GDBusMethodInvocation *inv; Finish finish; char **names; guint reg; } Pending;

static GSubprocess *helper;
static GOutputStream *helper_in;
static GHashTable *pending;          /* id -> Pending */
static int next_id = 1;
static guint idle_timer;

static void send_json(JsonBuilder *b)
{
    if (!helper_in) { g_object_unref(b); return; }
    JsonGenerator *g = json_generator_new();
    JsonNode *r = json_builder_get_root(b);
    json_generator_set_root(g, r);
    char *s = json_generator_to_data(g, NULL);
    GString *line = g_string_new(s); g_string_append_c(line, '\n');
    g_output_stream_write_all(helper_in, line->str, line->len, NULL, NULL, NULL);
    g_output_stream_flush(helper_in, NULL, NULL);
    g_string_free(line, TRUE); g_free(s);
    json_node_unref(r); g_object_unref(g); g_object_unref(b);
}

static void send_simple(const char *key, int id)
{
    JsonBuilder *b = json_builder_new(); json_builder_begin_object(b);
    json_builder_set_member_name(b, key);
    if (id) json_builder_add_int_value(b, id); else json_builder_add_boolean_value(b, TRUE);
    json_builder_end_object(b);
    send_json(b);
}

static void finish_pending(Pending *p, JsonObject *result)
{
    if (p->reg) g_dbus_connection_unregister_object(bus, p->reg);
    GVariantBuilder r; g_variant_builder_init(&r, G_VARIANT_TYPE("a{sv}"));
    guint32 code = FAILED;
    if (result) {
        GPtrArray *uris = g_ptr_array_new_with_free_func(g_free);
        const char *path = json_object_has_member(result, "path") && JSON_NODE_HOLDS_VALUE(json_object_get_member(result, "path"))
                           ? json_object_get_string_member(result, "path") : NULL;
        JsonArray *paths = json_object_has_member(result, "paths") && JSON_NODE_HOLDS_ARRAY(json_object_get_member(result, "paths"))
                           ? json_object_get_array_member(result, "paths") : NULL;
        if (!(path && *path) && !(paths && json_array_get_length(paths))) code = CANCELLED;
        else {
            code = SUCCESS;
            if (p->finish == F_SAVE) g_ptr_array_add(uris, uri_of(path));
            else if (p->finish == F_OPEN) for (guint i = 0; paths && i < json_array_get_length(paths); i++) g_ptr_array_add(uris, uri_of(json_array_get_string_element(paths, i)));
            else {   /* SaveFiles: the person picked the folder they go in */
                const char *folder = paths && json_array_get_length(paths) ? json_array_get_string_element(paths, 0) : "";
                for (char **n = p->names; n && *n; n++) { char *f = g_build_filename(folder, *n, NULL); g_ptr_array_add(uris, uri_of(f)); g_free(f); }
            }
        }
        g_ptr_array_add(uris, NULL);
        if (code == SUCCESS) g_variant_builder_add(&r, "{sv}", "uris", g_variant_new_strv((const char *const *)uris->pdata, -1));
        g_ptr_array_unref(uris);
    }
    g_dbus_method_invocation_return_value(p->inv, g_variant_new("(u@a{sv})", code, g_variant_builder_end(&r)));
    g_strfreev(p->names);
    g_hash_table_remove(pending, GINT_TO_POINTER(p->id));
}

static gboolean idle_quit(gpointer d)
{
    (void)d;
    if (g_hash_table_size(pending)) return G_SOURCE_CONTINUE;
    if (helper) send_simple("quit", 0);           /* the sheet's runtime goes; the service stays */
    idle_timer = 0;
    return G_SOURCE_REMOVE;
}

static void touch(void)
{
    if (idle_timer) g_source_remove(idle_timer);
    idle_timer = g_timeout_add_seconds(IDLE_QUIT, idle_quit, NULL);
}

static void read_line(GObject *src, GAsyncResult *res, gpointer data);

static void helper_gone(void)
{
    GList *all = g_hash_table_get_values(pending);
    for (GList *l = all; l; l = l->next) finish_pending(l->data, NULL);
    g_list_free(all);
    g_clear_object(&helper_in);
    g_clear_object(&helper);
}

static void read_line(GObject *src, GAsyncResult *res, gpointer data)
{
    GDataInputStream *in = G_DATA_INPUT_STREAM(src);
    GSubprocess *who = data;
    gsize len;
    char *line = g_data_input_stream_read_line_finish_utf8(in, res, &len, NULL);
    if (!line) { if (who == helper) helper_gone(); g_object_unref(in); return; }
    JsonParser *jp = json_parser_new();
    if (json_parser_load_from_data(jp, line, -1, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(jp))) {
        JsonObject *m = json_node_get_object(json_parser_get_root(jp));
        int id = (int)json_object_get_int_member_with_default(m, "id", 0);
        Pending *p = g_hash_table_lookup(pending, GINT_TO_POINTER(id));
        if (p && json_object_has_member(m, "xid")) {
            belongs_to((Window)json_object_get_int_member(m, "xid"), p->parent);
            send_simple("show", id);
        } else if (p && json_object_has_member(m, "result")) {
            JsonNode *rn = json_object_get_member(m, "result");
            touch();
            finish_pending(p, JSON_NODE_HOLDS_OBJECT(rn) ? json_node_get_object(rn) : NULL);
        }
    }
    g_object_unref(jp); g_free(line);
    g_data_input_stream_read_line_async(in, G_PRIORITY_DEFAULT, NULL, read_line, who);
}

static gboolean start_helper(void)
{
    if (helper) return TRUE;
    GSubprocessLauncher *l = g_subprocess_launcher_new(G_SUBPROCESS_FLAGS_STDIN_PIPE | G_SUBPROCESS_FLAGS_STDOUT_PIPE);
    g_subprocess_launcher_setenv(l, "PALOS_APP_DIR", CHOOSER, TRUE);
    g_subprocess_launcher_setenv(l, "PALOS_APP_RESOURCES", CHOOSER, TRUE);
    GError *e = NULL;
    helper = g_subprocess_launcher_spawn(l, &e, RUNTIME, NULL);
    g_object_unref(l);
    if (!helper) { fprintf(stderr, "paladin-portal: the sheet can't start: %s\n", e->message); g_error_free(e); return FALSE; }
    helper_in = g_object_ref(g_subprocess_get_stdin_pipe(helper));
    GDataInputStream *in = g_data_input_stream_new(g_subprocess_get_stdout_pipe(helper));
    g_data_input_stream_read_line_async(in, G_PRIORITY_DEFAULT, NULL, read_line, helper);
    return TRUE;
}

static void request_call(GDBusConnection *c, const char *s, const char *path, const char *iface, const char *method,
                         GVariant *params, GDBusMethodInvocation *inv, gpointer data)
{
    (void)c; (void)s; (void)path; (void)iface; (void)method; (void)params;
    int id = GPOINTER_TO_INT(data);
    if (g_hash_table_contains(pending, data)) send_simple("cancel", id);
    g_dbus_method_invocation_return_value(inv, NULL);
}
static const GDBusInterfaceVTable request_vt = { request_call, NULL, NULL, { 0 } };

static void ask(GDBusMethodInvocation *inv, const char *handle, const char *parent_window, JsonBuilder *b, Finish finish, char **names)
{
    touch();
    json_builder_set_member_name(b, "top"); json_builder_add_int_value(b, 0);
    int id = next_id++;
    json_builder_set_member_name(b, "id"); json_builder_add_int_value(b, id);
    json_builder_end_object(b);
    if (!start_helper()) {
        g_object_unref(b); g_strfreev(names);
        g_dbus_method_invocation_return_value(inv, g_variant_new("(u@a{sv})", FAILED, g_variant_new_array(G_VARIANT_TYPE("{sv}"), NULL, 0)));
        return;
    }
    Pending *p = g_new0(Pending, 1);
    p->id = id; p->parent = parent_xid(parent_window); p->inv = inv; p->finish = finish; p->names = names;
    p->reg = g_dbus_connection_register_object(bus, handle, request_info->interfaces[0], &request_vt, GINT_TO_POINTER(id), NULL, NULL);
    g_hash_table_insert(pending, GINT_TO_POINTER(id), p);
    send_json(b);
}

static const char *opt_str(GVariant *o, const char *k, const char *dflt)
{
    const char *s = NULL;
    return g_variant_lookup(o, k, "&s", &s) && s && *s ? s : dflt;
}
static gboolean opt_bool(GVariant *o, const char *k) { gboolean v = FALSE; g_variant_lookup(o, k, "b", &v); return v; }

static char *no_mnemonic(const char *s) { char *r = g_strdup(s); char *w = r; for (const char *c = s; *c; c++) if (*c != '_') *w++ = *c; *w = 0; return r; }

static void begin(JsonBuilder *b, const char *kind, const char *title)
{
    json_builder_begin_object(b);
    json_builder_set_member_name(b, "kind"); json_builder_add_string_value(b, kind);
    json_builder_set_member_name(b, "title"); json_builder_add_string_value(b, title);
}
static void str_member(JsonBuilder *b, const char *k, const char *v) { json_builder_set_member_name(b, k); json_builder_add_string_value(b, v); }
static void bool_member(JsonBuilder *b, const char *k, gboolean v) { json_builder_set_member_name(b, k); json_builder_add_boolean_value(b, v); }

static void file_chooser(const char *method, GVariant *params, GDBusMethodInvocation *inv)
{
    const char *handle, *app, *parent, *title; GVariant *opts;
    g_variant_get(params, "(&o&s&s&s@a{sv})", &handle, &app, &parent, &title, &opts);
    GVariant *filters = g_variant_lookup_value(opts, "filters", G_VARIANT_TYPE("a(sa(us))"));
    JsonBuilder *b = json_builder_new();
    if (!strcmp(method, "OpenFile")) {
        gboolean dir = opt_bool(opts, "directory");
        begin(b, "open", *title ? title : dir ? "Choose a Folder" : "Open");
        add_filters(b, filters);
        bool_member(b, "multi", opt_bool(opts, "multiple"));
        bool_member(b, "folder", dir);
        char *btn = no_mnemonic(opt_str(opts, "accept_label", dir ? "Choose" : "Open")); str_member(b, "button", btn); g_free(btn);
        char *cf = bytes_path(opts, "current_folder"); str_member(b, "dir", *cf ? cf : g_get_home_dir()); g_free(cf);
        ask(inv, handle, parent, b, F_OPEN, NULL);
    } else if (!strcmp(method, "SaveFile")) {
        char *file = bytes_path(opts, "current_file"), *folder = bytes_path(opts, "current_folder");
        if (!*folder && *file) { g_free(folder); folder = g_path_get_dirname(file); }
        char *base = *file ? g_path_get_basename(file) : g_strdup("");
        begin(b, "save", *title ? title : "Save");
        add_filters(b, filters);
        char *btn = no_mnemonic(opt_str(opts, "accept_label", "Save")); str_member(b, "button", btn); g_free(btn);
        char *dd = *folder ? g_strdup(folder) : default_save_dir(); str_member(b, "dir", dd); g_free(dd);
        str_member(b, "name", opt_str(opts, "current_name", base));
        g_free(file); g_free(folder); g_free(base);
        ask(inv, handle, parent, b, F_SAVE, NULL);
    } else {   /* SaveFiles: several files at once; the person picks the folder they go in */
        GPtrArray *names = g_ptr_array_new();
        GVariant *files = g_variant_lookup_value(opts, "files", G_VARIANT_TYPE("aay"));
        if (files) { GVariantIter it; GVariant *f; g_variant_iter_init(&it, files); while ((f = g_variant_iter_next_value(&it))) { g_ptr_array_add(names, g_strdup(g_variant_get_bytestring(f))); g_variant_unref(f); } g_variant_unref(files); }
        g_ptr_array_add(names, NULL);
        begin(b, "open", *title ? title : "Choose Where to Save");
        json_builder_set_member_name(b, "filters"); json_builder_begin_array(b); json_builder_end_array(b);
        bool_member(b, "multi", FALSE); bool_member(b, "folder", TRUE);
        char *btn = no_mnemonic(opt_str(opts, "accept_label", "Save")); str_member(b, "button", btn); g_free(btn);
        char *cf = bytes_path(opts, "current_folder"); char *dd = *cf ? g_strdup(cf) : default_save_dir(); str_member(b, "dir", dd); g_free(dd); g_free(cf);
        ask(inv, handle, parent, b, F_SAVEFILES, (char **)g_ptr_array_free(names, FALSE));
    }
    if (filters) g_variant_unref(filters);
    g_variant_unref(opts);
}

/* ---------------------------------------------------------------- Settings */
static GVariant *pref_value(const char *v)
{
    if (!strcmp(v, "true") || !strcmp(v, "false")) return g_variant_new_boolean(!strcmp(v, "true"));
    char *end;
    gint64 i = g_ascii_strtoll(v, &end, 10);
    if (*v && !*end) return g_variant_new_int32((gint32)i);
    double d = g_ascii_strtod(v, &end);
    if (*v && !*end && strchr(v, '.')) return g_variant_new_double(d);
    return g_variant_new_string(v);
}

/* {namespace: {key: value}}: palOS's interface settings as GTK and Flatpaks know them, and the appearance keys */
static GHashTable *read_settings(void)
{
    GHashTable *ns = g_hash_table_new_full(g_str_hash, g_str_equal, g_free, (GDestroyNotify)g_hash_table_unref);
    GHashTable *iface = g_hash_table_new_full(g_str_hash, g_str_equal, g_free, (GDestroyNotify)g_variant_unref);
    GHashTable *appear = g_hash_table_new_full(g_str_hash, g_str_equal, g_free, (GDestroyNotify)g_variant_unref);
    char *out = NULL;
    const char *argv[] = { "palos-pref", "list", NULL };
    gboolean dark = FALSE;
    if (g_spawn_sync(NULL, (char **)argv, NULL, G_SPAWN_SEARCH_PATH | G_SPAWN_STDERR_TO_DEV_NULL, NULL, NULL, &out, NULL, NULL, NULL) && out) {
        char **lines = g_strsplit(out, "\n", -1);
        for (char **l = lines; *l; l++) {
            char *sp = strchr(*l, ' ');
            if (!sp) continue;
            *sp = 0;
            if (g_str_has_prefix(*l, "interface.")) g_hash_table_insert(iface, g_strdup(*l + 10), g_variant_ref_sink(pref_value(sp + 1)));
            if (!strcmp(*l, "interface.color-scheme")) dark = !strcmp(sp + 1, "prefer-dark");
        }
        g_strfreev(lines);
    }
    g_free(out);
    g_hash_table_insert(appear, g_strdup("color-scheme"), g_variant_ref_sink(g_variant_new_uint32(dark ? 1 : 0)));
    g_hash_table_insert(appear, g_strdup("contrast"), g_variant_ref_sink(g_variant_new_uint32(0)));
    g_hash_table_insert(ns, g_strdup("org.gnome.desktop.interface"), iface);
    g_hash_table_insert(ns, g_strdup("org.freedesktop.appearance"), appear);
    return ns;
}

static void settings(const char *method, GVariant *params, GDBusMethodInvocation *inv)
{
    GHashTable *all = read_settings();
    if (!strcmp(method, "ReadAll")) {
        const char **want; g_variant_get(params, "(^a&s)", &want);
        GVariantBuilder b; g_variant_builder_init(&b, G_VARIANT_TYPE("a{sa{sv}}"));
        GHashTableIter it; gpointer k, v;
        g_hash_table_iter_init(&it, all);
        while (g_hash_table_iter_next(&it, &k, &v)) {
            gboolean ok = !want[0];
            for (const char **w = want; *w && !ok; w++) ok = !**w || fnmatch(*w, k, 0) == 0;
            if (!ok) continue;
            GVariantBuilder inner; g_variant_builder_init(&inner, G_VARIANT_TYPE("a{sv}"));
            GHashTableIter i2; gpointer k2, v2;
            g_hash_table_iter_init(&i2, v);
            while (g_hash_table_iter_next(&i2, &k2, &v2)) g_variant_builder_add(&inner, "{sv}", k2, v2);
            g_variant_builder_add(&b, "{sa{sv}}", k, &inner);
        }
        g_free(want);
        g_dbus_method_invocation_return_value(inv, g_variant_new("(a{sa{sv}})", &b));
    } else {
        const char *n, *key; g_variant_get(params, "(&s&s)", &n, &key);
        GHashTable *t = g_hash_table_lookup(all, n);
        GVariant *v = t ? g_hash_table_lookup(t, key) : NULL;
        if (v) g_dbus_method_invocation_return_value(inv, g_variant_new("(v)", v));
        else g_dbus_method_invocation_return_dbus_error(inv, "org.freedesktop.portal.Error.NotFound", "Requested setting not found");
    }
    g_hash_table_unref(all);
}

static void changed(const char *ns, const char *key, GVariant *v)
{
    g_dbus_connection_emit_signal(bus, NULL, OBJ, "org.freedesktop.impl.portal.Settings", "SettingChanged", g_variant_new("(ssv)", ns, key, v), NULL);
}

static void watch_settings(void);
static gboolean rewatch(gpointer d) { (void)d; watch_settings(); return G_SOURCE_REMOVE; }

static void monitor_line(GObject *src, GAsyncResult *res, gpointer data)
{
    (void)data;
    GDataInputStream *in = G_DATA_INPUT_STREAM(src);
    char *line = g_data_input_stream_read_line_finish_utf8(in, res, NULL, NULL);
    if (!line) { g_object_unref(in); g_timeout_add_seconds(5, rewatch, NULL); return; }
    char *sp = strchr(line, ' ');
    if (sp) *sp = 0;
    if (g_str_has_prefix(line, "interface.")) {
        GHashTable *all = read_settings();
        const char *name = line + 10;
        GVariant *v = g_hash_table_lookup(g_hash_table_lookup(all, "org.gnome.desktop.interface"), name);
        if (v) changed("org.gnome.desktop.interface", name, v);
        if (!strcmp(name, "color-scheme")) changed("org.freedesktop.appearance", "color-scheme", g_hash_table_lookup(g_hash_table_lookup(all, "org.freedesktop.appearance"), "color-scheme"));
        g_hash_table_unref(all);
    }
    g_free(line);
    g_data_input_stream_read_line_async(in, G_PRIORITY_DEFAULT, NULL, monitor_line, NULL);
}

/* palos-pref monitor prints "KEY VALUE" when a setting changes: tell the apps */
static void watch_settings(void)
{
    GSubprocess *p = g_subprocess_new(G_SUBPROCESS_FLAGS_STDOUT_PIPE | G_SUBPROCESS_FLAGS_STDERR_SILENCE, NULL, "palos-pref", "monitor", NULL);
    if (!p) return;
    GDataInputStream *in = g_data_input_stream_new(g_subprocess_get_stdout_pipe(p));
    g_data_input_stream_read_line_async(in, G_PRIORITY_DEFAULT, NULL, monitor_line, NULL);
}

/* ---------------------------------------------------------------- D-Bus */
static void call(GDBusConnection *c, const char *sender, const char *path, const char *iface, const char *method,
                 GVariant *params, GDBusMethodInvocation *inv, gpointer data)
{
    (void)c; (void)sender; (void)path; (void)data;
    if (!strcmp(iface, "org.freedesktop.impl.portal.Settings")) settings(method, params, inv);
    else file_chooser(method, params, inv);
}
static const GDBusInterfaceVTable vt = { call, NULL, NULL, { 0 } };

static void acquired(GDBusConnection *c, const char *name, gpointer data)
{
    (void)name; (void)data;
    bus = c;
    g_dbus_connection_register_object(c, OBJ, info->interfaces[0], &vt, NULL, NULL, NULL);
    g_dbus_connection_register_object(c, OBJ, info->interfaces[1], &vt, NULL, NULL, NULL);
    watch_settings();
}

static void lost(GDBusConnection *c, const char *name, gpointer data) { (void)c; (void)data; fprintf(stderr, "paladin-portal: %s is taken\n", name); exit(1); }

static int x_error(Display *d, XErrorEvent *e) { (void)d; (void)e; return 0; }

int main(void)
{
    dpy = XOpenDisplay(NULL);
    if (dpy) XSetErrorHandler(x_error);
    info = g_dbus_node_info_new_for_xml(XML, NULL);
    request_info = g_dbus_node_info_new_for_xml(REQUEST_XML, NULL);
    pending = g_hash_table_new_full(NULL, NULL, NULL, g_free);
    g_bus_own_name(G_BUS_TYPE_SESSION, BUS_NAME, G_BUS_NAME_OWNER_FLAGS_DO_NOT_QUEUE, NULL, acquired, lost, NULL, NULL);
    g_main_loop_run(g_main_loop_new(NULL, FALSE));
    return 0;
}

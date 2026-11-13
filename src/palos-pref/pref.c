/* palos-pref: palOS's settings.

   Each person's settings live in ~/.config/palos/settings.json, one flat JSON object ("interface.color-scheme":
   "prefer-dark", "sound.event-sounds": true, ...). What isn't set there comes from /etc/palos/settings.json (this
   computer's choices), then /usr/share/palos/settings.json (palOS's defaults). Writes are atomic (a new file
   renamed over the old) and locked, so programs watching the file always see a whole one.

     palos-pref get KEY              the value: strings bare, true/false, numbers (exit 1 if there's none)
     palos-pref set KEY VALUE        VALUE as JSON when it reads as JSON (true, 5, "text", [..]), else as text
     palos-pref reset KEY            back to the default
     palos-pref list                 every setting, "KEY VALUE" per line
     palos-pref monitor [KEY...]     prints "KEY VALUE" whenever one of them (or any) changes            */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/file.h>
#include <glib.h>
#include <gio/gio.h>
#include <json-glib/json-glib.h>

#define SYSTEM_DEFAULTS "/usr/share/palos/settings.json"
#define LOCAL_DEFAULTS "/etc/palos/settings.json"

static char *user_file(void) { return g_build_filename(g_get_user_config_dir(), "palos", "settings.json", NULL); }

static JsonObject *read_obj(const char *path)
{
    JsonParser *p = json_parser_new();
    JsonObject *o = NULL;
    if (json_parser_load_from_file(p, path, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(p)))
        o = json_object_ref(json_node_get_object(json_parser_get_root(p)));
    g_object_unref(p);
    return o ? o : json_object_new();
}

/* all three layers, the person's on top */
static JsonObject *merged(void)
{
    JsonObject *m = json_object_new();
    char *u = user_file();
    const char *files[3] = { SYSTEM_DEFAULTS, LOCAL_DEFAULTS, u };
    for (int i = 0; i < 3; i++) {
        JsonObject *o = read_obj(files[i]);
        GList *keys = json_object_get_members(o);
        for (GList *k = keys; k; k = k->next) json_object_set_member(m, k->data, json_node_copy(json_object_get_member(o, k->data)));
        g_list_free(keys);
        json_object_unref(o);
    }
    g_free(u);
    return m;
}

static char *show(JsonNode *n)
{
    if (JSON_NODE_HOLDS_VALUE(n)) {
        GType t = json_node_get_value_type(n);
        if (t == G_TYPE_STRING) return g_strdup(json_node_get_string(n));
        if (t == G_TYPE_BOOLEAN) return g_strdup(json_node_get_boolean(n) ? "true" : "false");
        if (t == G_TYPE_INT64) return g_strdup_printf("%" G_GINT64_FORMAT, json_node_get_int(n));
        if (t == G_TYPE_DOUBLE) { char b[G_ASCII_DTOSTR_BUF_SIZE]; return g_strdup(g_ascii_dtostr(b, sizeof b, json_node_get_double(n))); }
    }
    JsonGenerator *g = json_generator_new();
    json_generator_set_root(g, n);
    char *s = json_generator_to_data(g, NULL);
    g_object_unref(g);
    return s;
}

/* read-modify-write the person's file under a lock; value NULL removes the key */
static gboolean write_key(const char *key, JsonNode *value)
{
    char *path = user_file(), *dir = g_path_get_dirname(path), *lock = g_build_filename(dir, ".settings.lock", NULL);
    g_mkdir_with_parents(dir, 0700);
    int lf = open(lock, O_RDWR | O_CREAT | O_CLOEXEC, 0600);
    if (lf >= 0) flock(lf, LOCK_EX);
    JsonObject *o = read_obj(path);
    if (value) json_object_set_member(o, key, value); else if (json_object_has_member(o, key)) json_object_remove_member(o, key);
    JsonNode *root = json_node_new(JSON_NODE_OBJECT);
    json_node_take_object(root, o);
    JsonGenerator *g = json_generator_new();
    json_generator_set_root(g, root);
    json_generator_set_pretty(g, TRUE);
    char *tmp = g_strconcat(path, ".new", NULL);
    gboolean ok = json_generator_to_file(g, tmp, NULL) && rename(tmp, path) == 0;
    if (!ok) unlink(tmp);
    g_object_unref(g); json_node_unref(root);
    if (lf >= 0) { flock(lf, LOCK_UN); close(lf); }
    g_free(tmp); g_free(lock); g_free(dir); g_free(path);
    return ok;
}

static JsonNode *parse_value(const char *text)
{
    JsonParser *p = json_parser_new();
    JsonNode *n = NULL;
    if (json_parser_load_from_data(p, text, -1, NULL) && json_parser_get_root(p)) n = json_node_copy(json_parser_get_root(p));
    g_object_unref(p);
    if (!n) { n = json_node_new(JSON_NODE_VALUE); json_node_set_string(n, text); }
    return n;
}

/* ---------------------------------------------------------------- monitor */
static JsonObject *last;
static char **watch_keys;

static gboolean wanted(const char *k)
{
    if (!watch_keys || !watch_keys[0]) return TRUE;
    for (char **w = watch_keys; *w; w++) if (!strcmp(*w, k)) return TRUE;
    return FALSE;
}

static void compare(void)
{
    JsonObject *now = merged();
    GList *keys = json_object_get_members(now);
    GList *old = json_object_get_members(last);
    for (GList *k = old; k; k = k->next) if (!json_object_has_member(now, k->data)) keys = g_list_prepend(keys, k->data);
    for (GList *k = keys; k; k = k->next) {
        const char *key = k->data;
        if (!wanted(key)) continue;
        JsonNode *a = json_object_has_member(last, key) ? json_object_get_member(last, key) : NULL;
        JsonNode *b = json_object_has_member(now, key) ? json_object_get_member(now, key) : NULL;
        if (a && b && json_node_equal(a, b)) continue;
        char *v = b ? show(b) : g_strdup("");
        printf("%s %s\n", key, v);
        g_free(v);
    }
    fflush(stdout);
    g_list_free(keys); g_list_free(old);
    json_object_unref(last);
    last = now;
}

static void changed(GFileMonitor *m, GFile *f, GFile *other, GFileMonitorEvent ev, gpointer data)
{
    (void)m; (void)f; (void)other; (void)data;
    if (ev == G_FILE_MONITOR_EVENT_CHANGES_DONE_HINT || ev == G_FILE_MONITOR_EVENT_CREATED || ev == G_FILE_MONITOR_EVENT_DELETED
        || ev == G_FILE_MONITOR_EVENT_RENAMED || ev == G_FILE_MONITOR_EVENT_MOVED_IN) compare();
}

static int monitor(char **keys)
{
    watch_keys = keys;
    last = merged();
    char *path = user_file(), *dir = g_path_get_dirname(path);
    g_mkdir_with_parents(dir, 0700);
    /* watch the folders (a write is a rename into them) */
    const char *dirs[3] = { dir, "/etc/palos", "/usr/share/palos" };
    for (int i = 0; i < 3; i++) {
        GFile *f = g_file_new_for_path(dirs[i]);
        GFileMonitor *m = g_file_monitor_directory(f, G_FILE_MONITOR_WATCH_MOVES, NULL, NULL);
        if (m) g_signal_connect(m, "changed", G_CALLBACK(changed), NULL);
        g_object_unref(f);
    }
    g_free(path); g_free(dir);
    g_main_loop_run(g_main_loop_new(NULL, FALSE));
    return 0;
}

int main(int argc, char **argv)
{
    if (argc >= 3 && !strcmp(argv[1], "get")) {
        JsonObject *m = merged();
        int rc = 1;
        if (json_object_has_member(m, argv[2])) { char *v = show(json_object_get_member(m, argv[2])); puts(v); g_free(v); rc = 0; }
        json_object_unref(m);
        return rc;
    }
    if (argc >= 4 && !strcmp(argv[1], "set")) return write_key(argv[2], parse_value(argv[3])) ? 0 : 1;
    if (argc >= 3 && !strcmp(argv[1], "reset")) return write_key(argv[2], NULL) ? 0 : 1;
    if (argc >= 2 && !strcmp(argv[1], "list")) {
        JsonObject *m = merged();
        GList *keys = g_list_sort(json_object_get_members(m), (GCompareFunc)strcmp);
        for (GList *k = keys; k; k = k->next) { char *v = show(json_object_get_member(m, k->data)); printf("%s %s\n", (char *)k->data, v); g_free(v); }
        g_list_free(keys); json_object_unref(m);
        return 0;
    }
    if (argc >= 2 && !strcmp(argv[1], "monitor")) return monitor(argv + 2);
    fputs("palos-pref get KEY | set KEY VALUE | reset KEY | list | monitor [KEY...]\n", stderr);
    return 2;
}

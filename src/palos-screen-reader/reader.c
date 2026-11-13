/* palOS Screen Reader: speaks what's on screen, for people who can't see it well (or at all).

     palos-screen-reader              run the reader (the session starts it when it's turned on)
     palos-screen-reader --toggle     turn it on or off      (Super+Alt+S, or Settings → Accessibility)
     palos-screen-reader --on/--off   ditto, explicitly
     palos-screen-reader --cmd NAME   a reader command (the keys below send these)
     palos-screen-reader --print      also write what's spoken on stdout (tests; braille later)

   Keys (while the reader is on):
     Super+Alt+S       reader on / off              Ctrl            hush (stop talking)
     Super+Alt+Space   say the focused item again   Super+Alt+W     say the window's title
     Super+Alt+A       read everything in the focused text, from the cursor
     Super+Alt+L       say the current line         Super+Alt+T     say the time
     Super+Alt+Up/Down talk faster / slower         Super+Alt+K     typing echo: off / characters / words

   It listens to the accessibility bus (AT-SPI) that every palOS app talks to, and speaks with speech-dispatcher
   (eSpeak NG voices, in your language). Settings: ~/.config/palos/screen-reader.json {rate, echo, pitch}. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <atspi/atspi.h>
#include <libspeechd.h>
#include <gio/gio.h>
#include <json-glib/json-glib.h>
#include <X11/Xlib.h>
#include <X11/Xatom.h>
#include <X11/XKBlib.h>
#include <X11/extensions/XInput2.h>
#include "../libpalos/l10n.h"

static gboolean print_mode;
static Display *dpy;                  /* for window titles */
static Atom a_active, a_name, a_utf8;
static int rate = 10, pitch = 0;
static char echo_mode[16] = "characters";

/* ---------------------------------------------------------------- places */
static char *cfg_path(void) { return g_build_filename(g_get_user_config_dir(), "palos", "screen-reader.json", NULL); }
static char *sock_path(void) { return g_build_filename(g_get_user_runtime_dir(), "palos-screen-reader.sock", NULL); }
static char *flag_path(void) { return g_build_filename(g_get_user_runtime_dir(), "palos-screen-reader.on", NULL); }

static void load_cfg(void)
{
    char *p = cfg_path();
    JsonParser *jp = json_parser_new();
    if (json_parser_load_from_file(jp, p, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(jp))) {
        JsonObject *o = json_node_get_object(json_parser_get_root(jp));
        rate = (int)json_object_get_int_member_with_default(o, "rate", 10);
        pitch = (int)json_object_get_int_member_with_default(o, "pitch", 0);
        g_strlcpy(echo_mode, json_object_get_string_member_with_default(o, "echo", "characters"), sizeof echo_mode);
    }
    g_object_unref(jp); g_free(p);
}

static void save_cfg(void)
{
    char *p = cfg_path(), *dir = g_path_get_dirname(p);
    g_mkdir_with_parents(dir, 0700);
    char *s = g_strdup_printf("{\"rate\": %d, \"echo\": \"%s\", \"pitch\": %d, \"voice\": \"\"}\n", rate, echo_mode, pitch);
    g_file_set_contents(p, s, -1, NULL);
    g_free(s); g_free(dir); g_free(p);
}

/* ---------------------------------------------------------------- on / off (shared with Settings) */
static void pref_set(const char *key, const char *val)
{
    const char *argv[] = { "palos-pref", "set", key, val, NULL };
    g_spawn_sync(NULL, (char **)argv, NULL, G_SPAWN_SEARCH_PATH | G_SPAWN_STDOUT_TO_DEV_NULL | G_SPAWN_STDERR_TO_DEV_NULL, NULL, NULL, NULL, NULL, NULL, NULL);
}

static gboolean is_on(void)
{
    char *out = NULL;
    const char *argv[] = { "palos-pref", "get", "a11y.applications.screen-reader-enabled", NULL };
    g_spawn_sync(NULL, (char **)argv, NULL, G_SPAWN_SEARCH_PATH | G_SPAWN_STDERR_TO_DEV_NULL, NULL, NULL, &out, NULL, NULL, NULL);
    gboolean on = out && g_str_has_prefix(out, "true");
    g_free(out);
    return on;
}

/* tell every app a screen reader is here, so WebKit and Chromium-based apps switch their accessibility on */
static void a11y_bus(gboolean on)
{
    GDBusConnection *bus = g_bus_get_sync(G_BUS_TYPE_SESSION, NULL, NULL);
    if (bus) {
        const char *props[] = { "IsEnabled", "ScreenReaderEnabled" };
        for (int i = 0; i < 2; i++) {
            GVariant *r = g_dbus_connection_call_sync(bus, "org.a11y.Bus", "/org/a11y/bus", "org.freedesktop.DBus.Properties", "Set",
                g_variant_new("(ssv)", "org.a11y.Status", props[i], g_variant_new_boolean(on)), NULL, G_DBUS_CALL_FLAGS_NONE, 3000, NULL, NULL);
            if (r) g_variant_unref(r);
        }
        g_object_unref(bus);
    }
    pref_set("interface.toolkit-accessibility", on ? "true" : "false");
}

static gboolean send_cmd(const char *cmd)
{
    int s = socket(AF_UNIX, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    struct sockaddr_un a = { .sun_family = AF_UNIX };
    char *p = sock_path(); g_strlcpy(a.sun_path, p, sizeof a.sun_path); g_free(p);
    gboolean ok = s >= 0 && sendto(s, cmd, strlen(cmd), 0, (struct sockaddr *)&a, sizeof a) >= 0;
    if (s >= 0) close(s);
    return ok;
}

static void flag(gboolean on)
{
    char *f = flag_path();
    if (on) g_file_set_contents(f, "", 0, NULL); else unlink(f);
    g_free(f);
}

static void turn(gboolean on, const char *self)
{
    pref_set("a11y.applications.screen-reader-enabled", on ? "true" : "false");
    flag(on);
    a11y_bus(on);
    if (on) {
        if (!send_cmd("ping")) {
            const char *argv[] = { self, NULL };
            g_spawn_async(NULL, (char **)argv, NULL, G_SPAWN_STDOUT_TO_DEV_NULL | G_SPAWN_STDERR_TO_DEV_NULL, NULL, NULL, NULL, NULL);
        }
    } else send_cmd("quit");
}

/* ---------------------------------------------------------------- speech (its own thread: a stuck audio system never
   freezes the reader; the newest interrupting phrase wins, older queued ones are dropped) */
typedef enum { V_SAY, V_CHAR, V_CANCEL, V_APPLY, V_QUIT } VKind;
typedef struct { VKind kind; char *text; gboolean interrupt; } VItem;
static GAsyncQueue *vq;
static SPDConnection *spd;

static void spd_connect(void)
{
    spd = spd_open("palos-screen-reader", "main", NULL, SPD_MODE_THREADED);
    if (!spd) { fprintf(stderr, "screen reader: no speech-dispatcher\n"); return; }
    spd_set_punctuation(spd, SPD_PUNCT_SOME);
    const char *l = g_getenv("LANGUAGE"); if (!l || !*l) l = g_getenv("LANG"); if (!l || !*l) l = "en";
    char *lang = g_strdup(l), *c;
    if ((c = strchr(lang, ':'))) *c = 0;
    if ((c = strchr(lang, '.'))) *c = 0;
    g_strdelimit(lang, "_", '-');
    if (strcmp(lang, "pt-BR") && strcmp(lang, "zh-TW") && strcmp(lang, "en-US") && strcmp(lang, "en-GB") && (c = strchr(lang, '-'))) *c = 0;
    spd_set_language(spd, lang);
    g_free(lang);
    spd_set_voice_rate(spd, CLAMP(rate, -100, 100));
    spd_set_voice_pitch(spd, CLAMP(pitch, -100, 100));
}

static void v_free(VItem *i) { if (i) { g_free(i->text); g_free(i); } }

static void v_do(VItem *i)
{
    if (!spd) return;
    if (i->kind == V_APPLY) { spd_set_voice_rate(spd, CLAMP(rate, -100, 100)); spd_set_voice_pitch(spd, CLAMP(pitch, -100, 100)); return; }
    if (i->interrupt || i->kind == V_CANCEL) spd_cancel(spd);
    int r = 0;
    if (i->kind == V_SAY) r = spd_say(spd, SPD_MESSAGE, i->text);
    else if (i->kind == V_CHAR) r = spd_char(spd, SPD_MESSAGE, i->text);
    if (r < 0) { spd_close(spd); spd = NULL; spd_connect(); }
}

static gpointer v_worker(gpointer d)
{
    (void)d;
    spd_connect();
    for (;;) {
        VItem *item = g_async_queue_pop(vq);
        if (item->kind == V_QUIT) break;
        VItem *next;
        while ((next = g_async_queue_try_pop(vq))) {
            if (next->kind == V_QUIT) { v_free(item); item = next; break; }
            if (next->kind == V_CANCEL || next->kind == V_APPLY || next->interrupt) { v_free(item); item = next; }
            else { v_do(item); v_free(item); item = next; }
        }
        if (item->kind == V_QUIT) break;
        v_do(item); v_free(item);
    }
    if (spd) spd_close(spd);
    return NULL;
}

static void v_put(VKind k, const char *text, gboolean interrupt)
{
    VItem *i = g_new0(VItem, 1); i->kind = k; i->text = g_strdup(text ? text : ""); i->interrupt = interrupt;
    g_async_queue_push(vq, i);
}

static char *squash(const char *t)
{
    GString *s = g_string_new(NULL); gboolean sp = FALSE;
    for (const char *c = t ? t : ""; *c; c++) {
        if (g_ascii_isspace(*c)) { sp = s->len > 0; continue; }
        if (sp) { g_string_append_c(s, ' '); sp = FALSE; }
        g_string_append_c(s, *c);
    }
    return g_string_free(s, FALSE);
}

static void voice_say(const char *text, gboolean interrupt)
{
    char *t = squash(text);
    if (*t) {
        if (print_mode) { printf("%.1f SAY %s\n", fmod((double)g_get_real_time() / 1e6, 1000), t); fflush(stdout); }
        v_put(V_SAY, t, interrupt);
    }
    g_free(t);
}
static void voice_char(const char *ch) { if (print_mode) { printf("CHAR %s\n", ch); fflush(stdout); } v_put(V_CHAR, ch, TRUE); }
static void voice_hush(void) { v_put(V_CANCEL, "", TRUE); }

/* ---------------------------------------------------------------- what to say about things */
static const char *role_word(const char *role, gboolean *known)
{
    static const char *map[][2] = {
        { "push button", "button" }, { "toggle button", "toggle button" }, { "check box", "checkbox" }, { "radio button", "radio button" },
        { "combo box", "pop-up menu" }, { "menu item", "menu item" }, { "check menu item", "menu item" }, { "radio menu item", "menu item" },
        { "menu", "menu" }, { "menu bar", "menu bar" }, { "page tab", "tab" }, { "entry", "text field" }, { "password text", "secure text field" },
        { "text", "text" }, { "spin button", "stepper" }, { "slider", "slider" }, { "link", "link" }, { "list item", "" }, { "table cell", "" },
        { "tree item", "" }, { "list box", "list" }, { "list", "list" }, { "table", "table" }, { "tree", "tree" }, { "heading", "heading" },
        { "image", "image" }, { "dialog", "dialog" }, { "alert", "alert" }, { "progress bar", "progress" }, { "scroll bar", "scroll bar" },
        { "tool bar", "toolbar" }, { "switch", "switch" }, { "document web", "web page" }, { "frame", "window" } };
    for (guint i = 0; i < G_N_ELEMENTS(map); i++) if (!strcmp(role, map[i][0])) { *known = TRUE; return map[i][1]; }
    *known = FALSE;
    return NULL;
}

static gboolean has_state(AtspiStateSet *s, AtspiStateType t) { return s && atspi_state_set_contains(s, t); }

static char *describe(AtspiAccessible *acc, int depth)
{
    if (!acc || depth > 2) return g_strdup("");
    GError *e = NULL;
    char *name = atspi_accessible_get_name(acc, &e);
    if (e) { g_clear_error(&e); g_free(name); return g_strdup(""); }
    char *role = atspi_accessible_get_role_name(acc, NULL);
    if (!role) role = g_strdup("");
    AtspiStateSet *st = atspi_accessible_get_state_set(acc);
    g_strstrip(name ? name : (name = g_strdup("")));
    if (!*name) {   /* a label pointing at it */
        GArray *rels = atspi_accessible_get_relation_set(acc, NULL);
        for (guint i = 0; rels && i < rels->len; i++) {
            AtspiRelation *r = g_array_index(rels, AtspiRelation *, i);
            if (atspi_relation_get_relation_type(r) == ATSPI_RELATION_LABELLED_BY) {
                GString *s = g_string_new(NULL);
                for (int k = 0; k < atspi_relation_get_n_targets(r); k++) {
                    AtspiAccessible *t = atspi_relation_get_target(r, k);
                    char *n = t ? atspi_accessible_get_name(t, NULL) : NULL;
                    if (n && *n) { if (s->len) g_string_append_c(s, ' '); g_string_append(s, n); }
                    g_free(n); if (t) g_object_unref(t);
                }
                g_free(name); name = g_strstrip(g_string_free(s, FALSE));
            }
        }
        if (rels) { for (guint i = 0; i < rels->len; i++) g_object_unref(g_array_index(rels, AtspiRelation *, i)); g_array_free(rels, TRUE); }
    }
    if (!*name) { g_free(name); name = atspi_accessible_get_description(acc, NULL); if (!name) name = g_strdup(""); g_strstrip(name); }
    GPtrArray *parts = g_ptr_array_new_with_free_func(g_free);
    g_ptr_array_add(parts, g_strdup(name));
    gboolean known;
    const char *word = role_word(role, &known);
    if (word && *word) g_ptr_array_add(parts, g_strdup(T(word)));
    gboolean is_switch = !strcmp(role, "switch");
    if (has_state(st, ATSPI_STATE_CHECKABLE) || !strcmp(role, "check box") || !strcmp(role, "radio button") || !strcmp(role, "toggle button") || is_switch) {
        gboolean on = has_state(st, ATSPI_STATE_CHECKED) || has_state(st, ATSPI_STATE_PRESSED);
        g_ptr_array_add(parts, g_strdup(T(is_switch ? (on ? "on" : "off") : (on ? "checked" : "not checked"))));
    }
    if (has_state(st, ATSPI_STATE_EXPANDABLE)) g_ptr_array_add(parts, g_strdup(T(has_state(st, ATSPI_STATE_EXPANDED) ? "expanded" : "collapsed")));
    if (has_state(st, ATSPI_STATE_SELECTABLE) && has_state(st, ATSPI_STATE_SELECTED) && strcmp(role, "page tab")) g_ptr_array_add(parts, g_strdup(T("selected")));
    if (st && !has_state(st, ATSPI_STATE_SENSITIVE) && !has_state(st, ATSPI_STATE_ENABLED)) g_ptr_array_add(parts, g_strdup(T("dimmed")));
    if (!strcmp(role, "heading")) {
        GHashTable *attrs = atspi_accessible_get_attributes(acc, NULL);
        const char *lvl = attrs ? g_hash_table_lookup(attrs, "level") : NULL;
        if (lvl) { g_ptr_array_remove_index(parts, parts->len - 1); g_ptr_array_add(parts, Tf("heading level {}", lvl)); }
        if (attrs) g_hash_table_unref(attrs);
    }
    if (!strcmp(role, "slider") || !strcmp(role, "spin button") || !strcmp(role, "progress bar") || !strcmp(role, "scroll bar")) {
        AtspiValue *v = atspi_accessible_get_value_iface(acc);
        if (v) { g_ptr_array_add(parts, g_strdup_printf("%g", atspi_value_get_current_value(v, NULL))); g_object_unref(v); }
    }
    if (!strcmp(role, "entry") || !strcmp(role, "text") || !strcmp(role, "spin button")) {
        AtspiText *t = atspi_accessible_get_text_iface(acc);
        if (t) {
            char *txt = atspi_text_get_text(t, 0, -1, NULL);
            if (txt && *txt && strcmp(txt, name)) {
                if (g_utf8_strlen(txt, -1) >= 200) { char *cut = g_utf8_substring(txt, 0, 200); g_ptr_array_add(parts, g_strconcat(cut, "…", NULL)); g_free(cut); }
                else g_ptr_array_add(parts, g_strdup(txt));
            }
            g_free(txt); g_object_unref(t);
        }
    }
    if (!strcmp(role, "list box") || !strcmp(role, "tree") || !strcmp(role, "table")) {
        AtspiSelection *sel = atspi_accessible_get_selection_iface(acc);
        if (sel) {
            if (atspi_selection_get_n_selected_children(sel, NULL) > 0) {
                AtspiAccessible *c = atspi_selection_get_selected_child(sel, 0, NULL);
                if (c) { g_ptr_array_add(parts, describe(c, depth + 1)); g_object_unref(c); }
            }
            g_object_unref(sel);
        }
    }
    if (!strcmp(role, "list item") || !strcmp(role, "menu item") || !strcmp(role, "page tab") || !strcmp(role, "radio button") || !strcmp(role, "tree item") || !strcmp(role, "option")) {
        AtspiAccessible *par = atspi_accessible_get_parent(acc, NULL);
        if (par) {
            int n = atspi_accessible_get_child_count(par, NULL), i = atspi_accessible_get_index_in_parent(acc, NULL);
            if (n > 1 && n < 1000 && i >= 0) { char a[16], b[16]; g_snprintf(a, sizeof a, "%d", i + 1); g_snprintf(b, sizeof b, "%d", n); g_ptr_array_add(parts, Tf("{} of {}", a, b)); }
            g_object_unref(par);
        }
    }
    GString *out = g_string_new(NULL);
    for (guint i = 0; i < parts->len; i++) { const char *p = parts->pdata[i]; if (!*p) continue; if (out->len) g_string_append(out, ", "); g_string_append(out, p); }
    g_ptr_array_unref(parts);
    if (st) g_object_unref(st);
    g_free(name); g_free(role);
    return g_string_free(out, FALSE);
}

/* ---------------------------------------------------------------- the reader */
static AtspiAccessible *focus;
static char last_key[64];
static GString *word;
static char *last_said; static gint64 last_said_at;
static gint64 typed_at;
static GMainLoop *loop;

static void say(const char *text, gboolean interrupt)
{
    gint64 now = g_get_monotonic_time();
    if (last_said && text && !strcmp(text, last_said) && now - last_said_at < 250000) return;   /* apps send focus events in pairs */
    g_free(last_said); last_said = g_strdup(text ? text : ""); last_said_at = now;
    voice_say(text, interrupt);
}

static void say_about(AtspiAccessible *acc) { char *d = describe(acc, 0); say(d, TRUE); g_free(d); }

static char *role_of(AtspiAccessible *a) { char *r = a ? atspi_accessible_get_role_name(a, NULL) : NULL; return r ? r : g_strdup(""); }

static gboolean editable(AtspiAccessible *a)
{
    AtspiStateSet *s = a ? atspi_accessible_get_state_set(a) : NULL;
    gboolean e = has_state(s, ATSPI_STATE_EDITABLE);
    if (s) g_object_unref(s);
    return e;
}

static void on_focus(AtspiEvent *ev, void *d)
{
    (void)d;
    if (!ev->detail1) return;
    g_set_object(&focus, ev->source);
    char *role = role_of(ev->source);
    if (!strcmp(role, "document web") || !strcmp(role, "document frame")) {
        AtspiAccessible *p = atspi_accessible_get_parent(ev->source, NULL);
        char *pr = role_of(p);
        gboolean own = !strcmp(pr, "frame") || !strcmp(pr, "internal frame") || !strcmp(pr, "panel") || !strcmp(pr, "filler") || !strcmp(pr, "scroll pane");
        g_free(pr); if (p) g_object_unref(p);
        if (own) { g_free(role); return; }       /* an app's own page: the window's name was just said */
    }
    g_free(role);
    say_about(ev->source);
}

static void on_window(AtspiEvent *ev, void *d)
{
    (void)d;
    char *name = atspi_accessible_get_name(ev->source, NULL);
    AtspiAccessible *app = atspi_accessible_get_application(ev->source, NULL);
    char *an = app ? atspi_accessible_get_name(app, NULL) : NULL;
    if (app) g_object_unref(app);
    if (!name) { g_free(an); return; }
    char *low = g_ascii_strdown(an ? an : "", -1);
    gboolean generic = !*low || !strcmp(low, "electron") || !strcmp(low, "kibble") || !strcmp(low, "chromium") || !strcmp(low, "python3") || !strcmp(low, "wpe");
    char *s = generic || (an && strstr(name, an)) ? g_strdup(name) : g_strdup_printf("%s, %s", an, name);
    say(s, TRUE);
    g_free(s); g_free(low); g_free(an); g_free(name);
}

/* the thing with the focus, or what holds it (lists rebuild their rows as you move through them) */
static gboolean near_focus(AtspiAccessible *acc)
{
    if (acc == focus) return TRUE;
    AtspiStateSet *s = atspi_accessible_get_state_set(acc);
    gboolean f = has_state(s, ATSPI_STATE_FOCUSED);
    if (s) g_object_unref(s);
    if (f) return TRUE;
    if (!focus) return FALSE;
    AtspiAccessible *p = g_object_ref(focus);
    for (int i = 0; i < 4 && p; i++) {
        AtspiAccessible *n = atspi_accessible_get_parent(p, NULL);
        g_object_unref(p); p = n;
        if (p == acc) { g_object_unref(p); return TRUE; }
    }
    if (p) g_object_unref(p);
    AtspiStateSet *fs = atspi_accessible_get_state_set(focus);
    gboolean defunct = has_state(fs, ATSPI_STATE_DEFUNCT);
    if (fs) g_object_unref(fs);
    return defunct;
}

static void on_descendant(AtspiEvent *ev, void *d)
{
    (void)d;
    if (!near_focus(ev->source)) return;
    if (G_VALUE_HOLDS(&ev->any_data, ATSPI_TYPE_ACCESSIBLE)) { AtspiAccessible *a = g_value_get_object(&ev->any_data); if (a) say_about(a); }
}

static void on_selection(AtspiEvent *ev, void *d)
{
    (void)d;
    if (!near_focus(ev->source)) return;
    AtspiSelection *sel = atspi_accessible_get_selection_iface(ev->source);
    if (!sel) return;
    if (atspi_selection_get_n_selected_children(sel, NULL) > 0) {
        AtspiAccessible *c = atspi_selection_get_selected_child(sel, 0, NULL);
        if (c) { say_about(c); g_object_unref(c); }
    }
    g_object_unref(sel);
}

/* typing echo: each letter as it lands in the focused field (or the word, when it's finished) */
static void on_insert(AtspiEvent *ev, void *d)
{
    (void)d;
    if (ev->source != focus || !editable(ev->source)) return;
    const char *text = G_VALUE_HOLDS_STRING(&ev->any_data) ? g_value_get_string(&ev->any_data) : NULL;
    if (!strcmp(echo_mode, "off") || !text || !*text) return;
    char *role = role_of(ev->source);
    gboolean secret = !strcmp(role, "password text");
    g_free(role);
    typed_at = g_get_monotonic_time();
    if (g_utf8_strlen(text, -1) == 1) {
        if (!strcmp(echo_mode, "characters")) voice_char(secret ? T("star") : text);
        if (g_unichar_isalnum(g_utf8_get_char(text))) g_string_append(word, text);
        else {
            if (!strcmp(echo_mode, "words") && word->len && !secret) say(word->str, TRUE);
            g_string_truncate(word, 0);
        }
    } else {   /* several letters at once: fast typing, a paste, or an autocompletion */
        if (!secret) {
            if (g_utf8_strlen(text, -1) >= 300) { char *cut = g_utf8_substring(text, 0, 300); char *s = g_strconcat(cut, "…", NULL); say(s, FALSE); g_free(s); g_free(cut); }
            else say(text, FALSE);
        }
        g_string_truncate(word, 0);
    }
}

static void on_delete(AtspiEvent *ev, void *d)
{
    (void)d;
    if (ev->source != focus || strcmp(echo_mode, "characters") || strcmp(last_key, "BackSpace")) return;
    const char *t = G_VALUE_HOLDS_STRING(&ev->any_data) ? g_value_get_string(&ev->any_data) : "";
    voice_char(t && g_utf8_strlen(t, -1) == 1 ? t : T("delete"));
}

static char *line_at_caret(AtspiAccessible *acc)
{
    AtspiText *t = atspi_accessible_get_text_iface(acc);
    if (!t) return NULL;
    int off = atspi_text_get_caret_offset(t, NULL);
    AtspiTextRange *r = atspi_text_get_string_at_offset(t, off, ATSPI_TEXT_GRANULARITY_LINE, NULL);
    char *line = r ? g_strstrip(g_strdup(r->content ? r->content : "")) : NULL;
    if (r) g_boxed_free(ATSPI_TYPE_TEXT_RANGE, r);
    g_object_unref(t);
    return line;
}

static void on_caret(AtspiEvent *ev, void *d)
{
    (void)d;
    if (ev->source != focus || g_get_monotonic_time() - typed_at < 300000) return;
    const char *k = last_key;
    if (!strcmp(k, "Up") || !strcmp(k, "Down") || !strcmp(k, "Page_Up") || !strcmp(k, "Page_Down") || !strcmp(k, "Home") || !strcmp(k, "End")) {
        char *line = line_at_caret(ev->source);
        if (line) say(*line ? line : T("blank"), TRUE);
        g_free(line);
    } else if (!strcmp(k, "Left") || !strcmp(k, "Right")) {
        AtspiText *t = atspi_accessible_get_text_iface(ev->source);
        if (!t) return;
        int off = atspi_text_get_caret_offset(t, NULL);
        char *ch = atspi_text_get_text(t, off, off + 1, NULL);
        voice_char(ch && *ch && strcmp(ch, "\n") ? ch : T("new line"));
        g_free(ch); g_object_unref(t);
    }
}

static void on_state(AtspiEvent *ev, void *d)
{
    (void)d;
    if (ev->source == focus) say_about(ev->source);     /* a checkbox or switch flipped where the focus is */
}

static void on_alert(AtspiEvent *ev, void *d)
{
    (void)d;
    char *role = role_of(ev->source);
    if (!strcmp(role, "alert") || !strcmp(role, "notification")) {
        char *n = atspi_accessible_get_name(ev->source, NULL);
        GString *s = g_string_new(n ? n : "");
        g_free(n);
        int c = atspi_accessible_get_child_count(ev->source, NULL);
        for (int i = 0; i < MIN(c, 8); i++) {
            AtspiAccessible *ch = atspi_accessible_get_child_at_index(ev->source, i, NULL);
            char *cn = ch ? atspi_accessible_get_name(ch, NULL) : NULL;
            if (cn && *cn) { g_string_append(s, ". "); g_string_append(s, cn); }
            g_free(cn); if (ch) g_object_unref(ch);
        }
        say(s->str, TRUE);
        g_string_free(s, TRUE);
    }
    g_free(role);
}

static int xi_opcode = -1;

/* every key pressed anywhere (XInput2 raw events: seen, never taken), for the keys the reader cares about */
static void key_seen(const char *name)
{
    g_strlcpy(last_key, name, sizeof last_key);
    if (print_mode && g_getenv("PALOS_SR_KEYS")) { printf("KEY %s\n", last_key); fflush(stdout); }
    if (!strcmp(name, "Control_L") || !strcmp(name, "Control_R")) voice_hush();
}

static gboolean on_key(AtspiDeviceEvent *ev, void *d)
{
    (void)d;
    if (ev->type != ATSPI_KEY_PRESSED_EVENT) return FALSE;
    if (xi_opcode < 0) key_seen(ev->event_string ? ev->event_string : "");    /* when X's own key events aren't there */
    return FALSE;
}

/* ---------------------------------------------------------------- commands (from the keys, through the socket) */
static void read_tree(AtspiAccessible *acc)
{
    GString *out = g_string_new(NULL);
    int count = 0;
    GPtrArray *stack = g_ptr_array_new();
    if (acc) g_ptr_array_add(stack, g_object_ref(acc));
    GArray *depths = g_array_new(FALSE, FALSE, sizeof(int)); int z = 0; g_array_append_val(depths, z);
    while (stack->len && count <= 60) {
        AtspiAccessible *a = g_ptr_array_remove_index(stack, stack->len - 1);
        int dep = g_array_index(depths, int, depths->len - 1); g_array_remove_index(depths, depths->len - 1);
        char *n = atspi_accessible_get_name(a, NULL), *r = role_of(a);
        if (n && *n && strcmp(r, "frame") && strcmp(r, "filler") && strcmp(r, "panel") && strcmp(r, "section")) { if (out->len) g_string_append(out, ". "); g_string_append(out, n); count++; }
        g_free(n); g_free(r);
        if (dep < 12) {
            int c = atspi_accessible_get_child_count(a, NULL);
            for (int i = c - 1; i >= 0; i--) {
                AtspiAccessible *ch = atspi_accessible_get_child_at_index(a, i, NULL);
                if (ch) { g_ptr_array_add(stack, ch); int nd = dep + 1; g_array_append_val(depths, nd); }
            }
        }
        g_object_unref(a);
    }
    while (stack->len) g_object_unref(g_ptr_array_remove_index(stack, stack->len - 1));
    g_ptr_array_free(stack, TRUE); g_array_free(depths, TRUE);
    say(out->len ? out->str : T("Nothing to read"), TRUE);
    g_string_free(out, TRUE);
}

static gboolean quit_later(gpointer d) { (void)d; g_main_loop_quit(loop); return G_SOURCE_REMOVE; }

static void command(const char *c)
{
    if (!strcmp(c, "quit")) { say(T("Screen reader off"), TRUE); g_timeout_add(1200, quit_later, NULL); }
    else if (!strcmp(c, "again")) { if (focus) say_about(focus); else say(T("Nothing has the focus"), TRUE); }
    else if (!strcmp(c, "title")) {
        AtspiAccessible *a = focus ? g_object_ref(focus) : NULL;
        while (a) {
            char *r = role_of(a);
            gboolean w = !strcmp(r, "frame") || !strcmp(r, "dialog") || !strcmp(r, "window");
            g_free(r);
            if (w) break;
            AtspiAccessible *p = atspi_accessible_get_parent(a, NULL);
            g_object_unref(a); a = p;
        }
        char *n = a ? atspi_accessible_get_name(a, NULL) : NULL;
        if ((!n || !*n) && dpy) {     /* apps whose accessibility tree has no window at the top: the active window's title */
            g_free(n); n = NULL;
            Atom type; int fmt; unsigned long cnt, after; unsigned char *data = NULL;
            if (XGetWindowProperty(dpy, DefaultRootWindow(dpy), a_active, 0, 1, False, XA_WINDOW, &type, &fmt, &cnt, &after, &data) == Success && data && cnt) {
                Window w = *(Window *)data; XFree(data); data = NULL;
                if (XGetWindowProperty(dpy, w, a_name, 0, 1024, False, a_utf8, &type, &fmt, &cnt, &after, &data) == Success && data && cnt) n = g_strndup((char *)data, cnt);
            }
            if (data) XFree(data);
        }
        say(n && *n ? n : T("No window"), TRUE);
        g_free(n); if (a) g_object_unref(a);
    } else if (!strcmp(c, "line")) {
        char *line = focus ? line_at_caret(focus) : NULL;
        if (line) say(*line ? line : T("blank"), TRUE); else if (focus) say_about(focus);
        g_free(line);
    } else if (!strcmp(c, "all")) {
        AtspiText *t = focus ? atspi_accessible_get_text_iface(focus) : NULL;
        if (t) {
            int off = atspi_text_get_caret_offset(t, NULL);
            char *rest = atspi_text_get_text(t, off, -1, NULL);
            say(rest && *rest ? rest : T("Nothing more"), TRUE);
            g_free(rest); g_object_unref(t);
        } else read_tree(focus);
    } else if (!strcmp(c, "time")) {
        char b[128]; time_t now = time(NULL);
        strftime(b, sizeof b, "%-I:%M %p, %A %B %-d", localtime(&now));
        say(b, TRUE);
    } else if (!strcmp(c, "faster") || !strcmp(c, "slower")) {
        rate = CLAMP(rate + (!strcmp(c, "faster") ? 10 : -10), -80, 90);
        save_cfg(); v_put(V_APPLY, "", FALSE);
        say(T(!strcmp(c, "faster") ? "Faster" : "Slower"), TRUE);
    } else if (!strcmp(c, "echo")) {
        const char *next = !strcmp(echo_mode, "characters") ? "words" : !strcmp(echo_mode, "words") ? "off" : "characters";
        g_strlcpy(echo_mode, next, sizeof echo_mode);
        save_cfg();
        say(T(!strcmp(next, "characters") ? "Typing echo: characters" : !strcmp(next, "words") ? "Typing echo: words" : "Typing echo off"), TRUE);
    } else if (!strcmp(c, "reload")) { load_cfg(); v_put(V_APPLY, "", FALSE); }
}

static gboolean on_command(GIOChannel *ch, GIOCondition cond, gpointer d)
{
    (void)cond; (void)d;
    char buf[256];
    ssize_t n = recv(g_io_channel_unix_get_fd(ch), buf, sizeof buf - 1, 0);
    if (n > 0) { buf[n] = 0; g_strstrip(buf); if (*buf && strcmp(buf, "ping")) command(buf); }
    return TRUE;
}

/* ---------------------------------------------------------------- the window's title when another window comes forward
   (for apps that don't announce it themselves) */
static Window last_active;
static gboolean title_later(gpointer d)
{
    Window w = (Window)GPOINTER_TO_SIZE(d);
    Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
    char *name = NULL;
    if (XGetWindowProperty(dpy, w, a_name, 0, 1024, False, a_utf8, &type, &fmt, &n, &after, &data) == Success && data && n) name = g_strndup((char *)data, n);
    if (data) XFree(data);
    if (!name) { char *t = NULL; if (XFetchName(dpy, w, &t) && t) { name = g_strdup(t); XFree(t); } }
    if (name && *name) {
        gboolean fresh = g_get_monotonic_time() - last_said_at > 600000 || !last_said || strcmp(last_said, name);
        if (fresh && !(last_said && g_str_has_prefix(last_said, name))) say(name, FALSE);
    }
    g_free(name);
    return G_SOURCE_REMOVE;
}

static int x_error(Display *d, XErrorEvent *e) { (void)d; (void)e; return 0; }

static gboolean on_x(GIOChannel *ch, GIOCondition c, gpointer d)
{
    (void)ch; (void)c; (void)d;
    while (XPending(dpy)) {
        XEvent ev; XNextEvent(dpy, &ev);
        if (ev.type == GenericEvent && ev.xcookie.extension == xi_opcode && XGetEventData(dpy, &ev.xcookie)) {
            if (ev.xcookie.evtype == XI_RawKeyPress) {
                XIRawEvent *re = ev.xcookie.data;
                KeySym ks = XkbKeycodeToKeysym(dpy, (KeyCode)re->detail, 0, 0);
                const char *n = ks ? XKeysymToString(ks) : NULL;
                if (n) key_seen(n);
            }
            XFreeEventData(dpy, &ev.xcookie);
            continue;
        }
        if (ev.type != PropertyNotify || ev.xproperty.atom != a_active) continue;
        Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
        Window w = 0;
        if (XGetWindowProperty(dpy, DefaultRootWindow(dpy), a_active, 0, 1, False, XA_WINDOW, &type, &fmt, &n, &after, &data) == Success && data && n) w = *(Window *)data;
        if (data) XFree(data);
        if (!w || w == last_active) continue;
        last_active = w;
        g_timeout_add(350, title_later, GSIZE_TO_POINTER(w));     /* let the app's own announcement come first */
    }
    return TRUE;
}

static void watch_windows(void)
{
    if (!(dpy = XOpenDisplay(NULL))) return;
    XSetErrorHandler(x_error);
    a_active = XInternAtom(dpy, "_NET_ACTIVE_WINDOW", False); a_name = XInternAtom(dpy, "_NET_WM_NAME", False); a_utf8 = XInternAtom(dpy, "UTF8_STRING", False);
    XSelectInput(dpy, DefaultRootWindow(dpy), PropertyChangeMask);
    int ev, er, major = 2, minor = 0;
    if (XQueryExtension(dpy, "XInputExtension", &xi_opcode, &ev, &er) && XIQueryVersion(dpy, &major, &minor) == Success) {
        unsigned char mask[XIMaskLen(XI_LASTEVENT)] = { 0 };
        XISetMask(mask, XI_RawKeyPress);
        XIEventMask m = { XIAllMasterDevices, sizeof mask, mask };
        XISelectEvents(dpy, DefaultRootWindow(dpy), &m, 1);
    } else xi_opcode = -1;
    XFlush(dpy);
    g_io_add_watch(g_io_channel_unix_new(ConnectionNumber(dpy)), G_IO_IN, on_x, NULL);
}

static void listen_one(const char *event, AtspiEventListenerCB cb)
{
    AtspiEventListener *l = atspi_event_listener_new(cb, NULL, NULL);
    atspi_event_listener_register(l, event, NULL);
}

static int run_reader(void)
{
    char *sp = sock_path(), *dir = g_path_get_dirname(sp);
    g_mkdir_with_parents(dir, 0700);
    unlink(sp);
    int s = socket(AF_UNIX, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    struct sockaddr_un a = { .sun_family = AF_UNIX };
    g_strlcpy(a.sun_path, sp, sizeof a.sun_path);
    if (s < 0 || bind(s, (struct sockaddr *)&a, sizeof a) < 0) { fprintf(stderr, "screen reader: can't listen for commands\n"); return 1; }
    load_cfg();
    word = g_string_new(NULL);
    vq = g_async_queue_new();
    GThread *vt = g_thread_new("voice", v_worker, NULL);
    if (atspi_init() < 0) { fprintf(stderr, "screen reader: no accessibility bus\n"); }
    a11y_bus(TRUE);
    flag(TRUE);
    listen_one("object:state-changed:focused", on_focus);
    listen_one("window:activate", on_window);
    listen_one("object:text-caret-moved", on_caret);
    listen_one("object:active-descendant-changed", on_descendant);
    listen_one("object:text-changed:insert", on_insert);
    listen_one("object:text-changed:delete", on_delete);
    listen_one("object:selection-changed", on_selection);
    listen_one("object:state-changed:checked", on_state);
    listen_one("object:state-changed:pressed", on_state);
    listen_one("object:state-changed:expanded", on_state);
    listen_one("object:state-changed:selected", on_state);
    listen_one("object:children-changed:add", on_alert);
    AtspiDeviceListener *kl = atspi_device_listener_new(on_key, NULL, NULL);
    for (AtspiKeyMaskType m = 0; m < 256; m++)        /* every modifier combination, never consuming the key */
        atspi_register_keystroke_listener(kl, NULL, m, 1 << ATSPI_KEY_PRESSED_EVENT, ATSPI_KEYLISTENER_NOSYNC, NULL);
    g_io_add_watch(g_io_channel_unix_new(s), G_IO_IN, on_command, NULL);
    watch_windows();
    say(T("Screen reader on"), TRUE);
    loop = g_main_loop_new(NULL, FALSE);
    g_main_loop_run(loop);
    unlink(sp);
    v_put(V_QUIT, "", FALSE);
    g_thread_join(vt);
    g_free(sp); g_free(dir);
    return 0;
}

int main(int argc, char **argv)
{
    gboolean toggle = FALSE, on = FALSE, off = FALSE;
    const char *cmd = NULL;
    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--toggle")) toggle = TRUE;
        else if (!strcmp(argv[i], "--on")) on = TRUE;
        else if (!strcmp(argv[i], "--off")) off = TRUE;
        else if (!strcmp(argv[i], "--print")) print_mode = TRUE;
        else if (!strcmp(argv[i], "--cmd")) cmd = i + 1 < argc ? argv[++i] : "";
        else if (!strcmp(argv[i], "-h") || !strcmp(argv[i], "--help")) { puts("palos-screen-reader [--toggle | --on | --off | --cmd NAME | --print]"); return 0; }
    }
    if (g_getenv("PALOS_SR_PRINT")) print_mode = TRUE;
    const char *self = "/usr/lib/palos-screen-reader/palos-screen-reader";
    if (toggle) { turn(!is_on(), self); return 0; }
    if (on) { turn(TRUE, self); return 0; }
    if (off) { turn(FALSE, self); return 0; }
    if (cmd) {
        if (!strcmp(cmd, "toggle")) turn(!is_on(), self);
        else if (is_on()) send_cmd(cmd);
        return 0;
    }
    if (send_cmd("ping")) return 0;      /* already running */
    return run_reader();
}

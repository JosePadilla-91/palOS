/* palOS's words in C programs (see l10n.h). Picks the language the same way the apps do (palos-l10n core.js). */
#include "l10n.h"
#include <glib.h>
#include <json-glib/json-glib.h>
#include <stdarg.h>
#include <string.h>
#include <stdlib.h>

#define DIR "/usr/share/palos/l10n"
static char *lang;
static GHashTable *words;

const char *palos_lang(void)
{
    if (lang) return lang;
    const char *env[] = { getenv("PALOS_LANG"), getenv("LANGUAGE"), getenv("LC_ALL"), getenv("LC_MESSAGES"), getenv("LANG") };
    for (unsigned i = 0; i < G_N_ELEMENTS(env) && !lang; i++) {
        if (!env[i] || !*env[i]) continue;
        char **parts = g_strsplit(env[i], ":", -1);
        for (char **p = parts; *p && !lang; p++) {
            if (!**p) continue;
            char *v = g_strdup(*p);
            v[strcspn(v, ".@")] = 0;
            for (char *c = v; *c; c++) if (*c == '_') *c = '-';
            char *base = g_ascii_strdown(v, strcspn(v, "-"));
            if (!strcmp(base, "en") || !strcmp(base, "c") || !strcmp(base, "posix")) lang = g_strdup("en-CA");
            else if (!strcmp(base, "fr")) lang = g_strdup("fr-CA");
            else {
                const char *zh = !strcmp(base, "zh") ? (strstr(v, "TW") || strstr(v, "HK") || strstr(v, "MO") || strstr(v, "Hant") ? "zh-TW" : "zh-CN") : NULL;
                const char *ids[] = { v, zh, base };
                for (unsigned k = 0; k < 3 && !lang; k++) {
                    if (!ids[k]) continue;
                    char *f = g_strdup_printf(DIR "/%s.json", ids[k]);
                    if (g_file_test(f, G_FILE_TEST_EXISTS)) lang = g_strdup(ids[k]);
                    g_free(f);
                }
            }
            g_free(base); g_free(v);
        }
        g_strfreev(parts);
    }
    if (!lang) lang = g_strdup("en-CA");
    return lang;
}

static void load(void)
{
    if (words) return;
    words = g_hash_table_new_full(g_str_hash, g_str_equal, g_free, g_free);
    if (!strcmp(palos_lang(), "en-CA")) return;
    char *f = g_strdup_printf(DIR "/%s.json", palos_lang());
    JsonParser *p = json_parser_new();
    if (json_parser_load_from_file(p, f, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(p))) {
        JsonObject *root = json_node_get_object(json_parser_get_root(p));
        JsonObject *s = json_object_has_member(root, "strings") ? json_object_get_object_member(root, "strings") : NULL;
        GList *keys = s ? json_object_get_members(s) : NULL;
        for (GList *k = keys; k; k = k->next) {
            JsonNode *n = json_object_get_member(s, k->data);
            if (JSON_NODE_HOLDS_VALUE(n) && json_node_get_value_type(n) == G_TYPE_STRING && *json_node_get_string(n))
                g_hash_table_insert(words, g_strdup(k->data), g_strdup(json_node_get_string(n)));
        }
        g_list_free(keys);
    }
    g_object_unref(p);
    g_free(f);
}

const char *T(const char *english)
{
    load();
    const char *t = g_hash_table_lookup(words, english);
    return t ? t : english;
}

char *Tf(const char *english, ...)
{
    const char *pattern = T(english);
    GString *out = g_string_new(NULL);
    va_list ap; va_start(ap, english);
    for (const char *p = pattern; *p; p++) {
        if (p[0] == '{' && p[1] == '}') { const char *v = va_arg(ap, const char *); g_string_append(out, v ? v : ""); p++; }
        else g_string_append_c(out, *p);
    }
    va_end(ap);
    return g_string_free(out, FALSE);
}

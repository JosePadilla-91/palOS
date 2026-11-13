/* palos-update: palOS system updates.

   palOS is one sealed, signed system image (/palos/system/palos-VERSION.img on palOS HD) with everything you
   change in a writable layer over it. An update is a whole new image, published on GitHub Releases with a
   manifest signed by palOS (Ed25519). palos-update downloads it in the background, checks it, puts it next
   to the one running, and adds it as the first boot entry; restarting switches over in one piece. The version
   before stays as a boot entry, and is used again by itself if the new one fails to start three times.

     palos-update status        JSON: running version, what's downloaded and waiting, what's available
     palos-update check         look for a newer palOS (JSON)
     palos-update download      fetch it (progress lines "progress N"), checking every byte against the manifest
     palos-update apply         make the downloaded version the one that starts next
     palos-update mark-good     this start worked: the version stays (run at boot, once the system is up)
     palos-update rollback      start the previous version next time
     palos-update clean         remove versions older than the previous one, and stale downloads

   Run as root (Software Update asks for it). Settings: /etc/palos/update.conf (repo=OWNER/NAME of the updates-only repo). */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <ctype.h>
#include <fcntl.h>
#include <glob.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/statvfs.h>
#include <curl/curl.h>
#include <openssl/evp.h>
#include <openssl/pem.h>
#include <glib.h>
#include <json-glib/json-glib.h>

/* every system path, under $PALOS_UPDATE_ROOT when testing */
static const char *ROOT = "";
static char DISK[512], SYSTEM[512], UPDATES[512], ESP[512], ENTRIES[512], KEY[512], CMDLINE_FILE[512];
static const char *FROM;      /* $PALOS_UPDATE_FROM: a folder holding a release (testing) */
static void set_paths(void)
{
    if (getenv("PALOS_UPDATE_ROOT")) ROOT = getenv("PALOS_UPDATE_ROOT");
    FROM = getenv("PALOS_UPDATE_FROM");
    snprintf(DISK, sizeof DISK, "%s/palos", ROOT);                 /* palOS HD, mounted by the initramfs */
    snprintf(SYSTEM, sizeof SYSTEM, "%s/system", DISK);
    snprintf(UPDATES, sizeof UPDATES, "%s/updates", DISK);
    snprintf(ESP, sizeof ESP, "%s/boot/efi", ROOT);
    snprintf(ENTRIES, sizeof ENTRIES, "%s/loader/entries", ESP);
    snprintf(KEY, sizeof KEY, "%s/usr/share/palos/update-key.pem", ROOT);
    snprintf(CMDLINE_FILE, sizeof CMDLINE_FILE, "%s", getenv("PALOS_UPDATE_CMDLINE") ? getenv("PALOS_UPDATE_CMDLINE") : "/proc/cmdline");
}
#define TRIES 3

static const char *repo = "JosePadilla-91/palOS-updates";   /* public, holds only signed updates (the source is private) */

static void die(const char *fmt, ...) G_GNUC_NORETURN;
static void die(const char *fmt, ...)
{
    va_list a; va_start(a, fmt);
    char *m = g_strdup_vprintf(fmt, a);
    va_end(a);
    printf("{\"ok\": false, \"error\": \"%s\"}\n", m);
    fprintf(stderr, "palos-update: %s\n", m);
    exit(1);
}

/* ---------------------------------------------------------------- versions */
static int vcmp(const char *a, const char *b)
{
    while (*a || *b) {
        long x = strtol(a, (char **)&a, 10), y = strtol(b, (char **)&b, 10);
        if (x != y) return x < y ? -1 : 1;
        if (*a == '.') a++;
        if (*b == '.') b++;
        if (!*a && *b) return -1;
        if (*a && !*b) return 1;
        if (!isdigit((unsigned char)*a) && !isdigit((unsigned char)*b) && *a && *b) { int c = strcmp(a, b); return c < 0 ? -1 : c > 0; }
    }
    return 0;
}

static gboolean safe_version(const char *v)
{
    if (!v || !*v || strlen(v) > 32) return FALSE;
    for (const char *c = v; *c; c++) if (!g_ascii_isalnum(*c) && *c != '.' && *c != '-') return FALSE;
    return TRUE;
}

/* the running version: palos.image= on the kernel's command line */
static char *running(void)
{
    char *cmd = NULL;
    if (!g_file_get_contents(CMDLINE_FILE, &cmd, NULL, NULL)) return NULL;
    char *v = NULL, **w = g_strsplit_set(g_strstrip(cmd), " ", -1);
    for (char **p = w; *p; p++) if (g_str_has_prefix(*p, "palos.image=")) v = g_strdup(*p + 12);
    g_strfreev(w); g_free(cmd);
    return v;
}

/* ---------------------------------------------------------------- downloads */
static size_t to_string(char *p, size_t s, size_t n, void *d) { g_string_append_len(d, p, s * n); return s * n; }

static CURL *web(const char *url)
{
    CURL *c = curl_easy_init();
    curl_easy_setopt(c, CURLOPT_URL, url);
    curl_easy_setopt(c, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(c, CURLOPT_USERAGENT, "palos-update");
    curl_easy_setopt(c, CURLOPT_FAILONERROR, 1L);
    curl_easy_setopt(c, CURLOPT_CONNECTTIMEOUT, 20L);
    curl_easy_setopt(c, CURLOPT_LOW_SPEED_LIMIT, 1L);
    curl_easy_setopt(c, CURLOPT_LOW_SPEED_TIME, 60L);
    curl_easy_setopt(c, CURLOPT_PROTOCOLS_STR, FROM ? "https,file" : "https");
    return c;
}

static GString *fetch(const char *url, const char *accept)
{
    GString *s = g_string_new(NULL);
    CURL *c = web(url);
    struct curl_slist *h = accept ? curl_slist_append(NULL, accept) : NULL;
    if (h) curl_easy_setopt(c, CURLOPT_HTTPHEADER, h);
    curl_easy_setopt(c, CURLOPT_WRITEFUNCTION, to_string);
    curl_easy_setopt(c, CURLOPT_WRITEDATA, s);
    CURLcode rc = curl_easy_perform(c);
    curl_easy_cleanup(c); curl_slist_free_all(h);
    if (rc != CURLE_OK) { g_string_free(s, TRUE); return NULL; }
    return s;
}

static int last_pct = -1;
static int progress(void *d, curl_off_t total, curl_off_t now, curl_off_t ut, curl_off_t un)
{
    (void)ut; (void)un;
    curl_off_t *base = d;
    if (total <= 0) return 0;
    int pct = (int)((base[0] + now) * 100 / base[1]);
    if (pct != last_pct) { printf("progress %d\n", pct); fflush(stdout); last_pct = pct; }
    return 0;
}

/* into path, carrying on from where an earlier try stopped */
static gboolean download(const char *url, const char *path, curl_off_t done_before, curl_off_t grand_total)
{
    struct stat st;
    curl_off_t have = stat(path, &st) == 0 ? st.st_size : 0;
    FILE *f = fopen(path, have ? "ab" : "wb");
    if (!f) return FALSE;
    CURL *c = web(url);
    curl_off_t base[2] = { done_before + have, grand_total > 0 ? grand_total : 1 };
    curl_easy_setopt(c, CURLOPT_WRITEDATA, f);
    curl_easy_setopt(c, CURLOPT_RESUME_FROM_LARGE, have);
    curl_easy_setopt(c, CURLOPT_NOPROGRESS, 0L);
    curl_easy_setopt(c, CURLOPT_XFERINFOFUNCTION, progress);
    curl_easy_setopt(c, CURLOPT_XFERINFODATA, base);
    struct curl_slist *h = curl_slist_append(NULL, "Accept: application/octet-stream");
    curl_easy_setopt(c, CURLOPT_HTTPHEADER, h);
    CURLcode rc = curl_easy_perform(c);
    long code = 0; curl_easy_getinfo(c, CURLINFO_RESPONSE_CODE, &code);
    curl_easy_cleanup(c); curl_slist_free_all(h);
    gboolean ok = fclose(f) == 0 && (rc == CURLE_OK || (rc == CURLE_HTTP_RETURNED_ERROR && code == 416));   /* 416: already complete */
    if (!ok) fprintf(stderr, "palos-update: %s: %s\n", url, curl_easy_strerror(rc));
    return ok;
}

/* ---------------------------------------------------------------- checking */
static char *sha256_file(const char *path)
{
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    EVP_MD_CTX *ctx = EVP_MD_CTX_new();
    EVP_DigestInit_ex(ctx, EVP_sha256(), NULL);
    static unsigned char buf[1 << 20];
    size_t n;
    while ((n = fread(buf, 1, sizeof buf, f)) > 0) EVP_DigestUpdate(ctx, buf, n);
    fclose(f);
    unsigned char md[32]; unsigned int len = 0;
    EVP_DigestFinal_ex(ctx, md, &len);
    EVP_MD_CTX_free(ctx);
    GString *s = g_string_new(NULL);
    for (unsigned i = 0; i < len; i++) g_string_append_printf(s, "%02x", md[i]);
    return g_string_free(s, FALSE);
}

/* the manifest's signature (base64 Ed25519), checked with palOS's public key */
static gboolean signed_by_palos(const char *data, size_t len, const char *sig_b64)
{
    FILE *kf = fopen(KEY, "r");
    if (!kf) return FALSE;
    EVP_PKEY *key = PEM_read_PUBKEY(kf, NULL, NULL, NULL);
    fclose(kf);
    if (!key) return FALSE;
    gsize slen = 0;
    char *t = g_strstrip(g_strdup(sig_b64));
    guchar *sig = g_base64_decode(t, &slen);
    g_free(t);
    EVP_MD_CTX *ctx = EVP_MD_CTX_new();
    gboolean ok = EVP_DigestVerifyInit(ctx, NULL, NULL, NULL, key) == 1
                  && EVP_DigestVerify(ctx, sig, slen, (const unsigned char *)data, len) == 1;
    EVP_MD_CTX_free(ctx); EVP_PKEY_free(key); g_free(sig);
    return ok;
}

typedef struct { char *version, *notes, *tag; char *img_name, *img_url, *img_sha; gint64 img_size; char *efi_name, *efi_url, *efi_sha; gint64 efi_size; char *manifest; } Release;

static void release_free(Release *r)
{
    if (!r) return;
    g_free(r->version); g_free(r->notes); g_free(r->tag); g_free(r->img_name); g_free(r->img_url); g_free(r->img_sha);
    g_free(r->efi_name); g_free(r->efi_url); g_free(r->efi_sha); g_free(r->manifest); g_free(r);
}

static const char *str(JsonObject *o, const char *k) { return o && json_object_has_member(o, k) && JSON_NODE_HOLDS_VALUE(json_object_get_member(o, k)) ? json_object_get_string_member(o, k) : NULL; }

/* a manifest (already verified) into a Release; asset URLs from the release's asset list */
static Release *read_manifest(const char *text, JsonArray *assets, const char *tag)
{
    JsonParser *p = json_parser_new();
    Release *r = NULL;
    if (json_parser_load_from_data(p, text, -1, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(p))) {
        JsonObject *m = json_node_get_object(json_parser_get_root(p));
        JsonObject *img = json_object_has_member(m, "image") ? json_object_get_object_member(m, "image") : NULL;
        JsonObject *efi = json_object_has_member(m, "efi") ? json_object_get_object_member(m, "efi") : NULL;
        if (safe_version(str(m, "version")) && img && efi && str(img, "name") && str(img, "sha256") && str(efi, "name") && str(efi, "sha256")) {
            r = g_new0(Release, 1);
            r->version = g_strdup(str(m, "version")); r->notes = g_strdup(str(m, "notes") ? str(m, "notes") : ""); r->tag = g_strdup(tag);
            r->img_name = g_path_get_basename(str(img, "name")); r->img_sha = g_ascii_strdown(str(img, "sha256"), -1); r->img_size = json_object_get_int_member(img, "size");
            r->efi_name = g_path_get_basename(str(efi, "name")); r->efi_sha = g_ascii_strdown(str(efi, "sha256"), -1); r->efi_size = json_object_get_int_member(efi, "size");
            r->manifest = g_strdup(text);
            for (guint i = 0; assets && i < json_array_get_length(assets); i++) {
                JsonObject *a = json_array_get_object_element(assets, i);
                const char *n = str(a, "name"), *u = str(a, "browser_download_url");
                if (!n || !u) continue;
                if (!strcmp(n, r->img_name)) r->img_url = g_strdup(u);
                if (!strcmp(n, r->efi_name)) r->efi_url = g_strdup(u);
            }
        }
    }
    g_object_unref(p);
    return r;
}

/* the newest signed palOS release on GitHub (tags "palos-…") */
static Release *latest_from_folder(void)
{
    char *mp = g_build_filename(FROM, "manifest.json", NULL), *sp = g_build_filename(FROM, "manifest.json.sig", NULL), *m = NULL, *sg = NULL;
    gsize mlen = 0;
    Release *r = NULL;
    if (g_file_get_contents(mp, &m, &mlen, NULL) && g_file_get_contents(sp, &sg, NULL, NULL) && signed_by_palos(m, mlen, sg)) {
        r = read_manifest(m, NULL, "local");
        if (r) { r->img_url = g_strdup_printf("file://%s/%s", FROM, r->img_name); r->efi_url = g_strdup_printf("file://%s/%s", FROM, r->efi_name); }
    } else fprintf(stderr, "palos-update: the release in %s isn't signed by palOS\n", FROM);
    g_free(mp); g_free(sp); g_free(m); g_free(sg);
    return r;
}

static Release *latest(void)
{
    if (FROM) return latest_from_folder();
    char *url = g_strdup_printf("https://api.github.com/repos/%s/releases?per_page=30", repo);
    GString *list = fetch(url, "Accept: application/vnd.github+json");
    g_free(url);
    if (!list) die("Software Update can't reach the update server. Check the internet connection.");
    JsonParser *p = json_parser_new();
    Release *best = NULL;
    if (json_parser_load_from_data(p, list->str, list->len, NULL) && JSON_NODE_HOLDS_ARRAY(json_parser_get_root(p))) {
        JsonArray *rels = json_node_get_array(json_parser_get_root(p));
        for (guint i = 0; i < json_array_get_length(rels); i++) {
            JsonObject *rel = json_array_get_object_element(rels, i);
            const char *tag = str(rel, "tag_name");
            if (!tag || !g_str_has_prefix(tag, "palos-") || json_object_get_boolean_member_with_default(rel, "draft", FALSE)
                || json_object_get_boolean_member_with_default(rel, "prerelease", FALSE)) continue;
            if (best && vcmp(tag + 6, best->version) <= 0) continue;
            JsonArray *assets = json_object_get_array_member(rel, "assets");
            const char *murl = NULL, *surl = NULL;
            for (guint k = 0; assets && k < json_array_get_length(assets); k++) {
                JsonObject *a = json_array_get_object_element(assets, k);
                if (!g_strcmp0(str(a, "name"), "manifest.json")) murl = str(a, "browser_download_url");
                if (!g_strcmp0(str(a, "name"), "manifest.json.sig")) surl = str(a, "browser_download_url");
            }
            if (!murl || !surl) continue;
            GString *man = fetch(murl, NULL), *sig = fetch(surl, NULL);
            if (man && sig && signed_by_palos(man->str, man->len, sig->str)) {
                Release *r = read_manifest(man->str, assets, tag);
                if (r && r->img_url && r->efi_url && (!best || vcmp(r->version, best->version) > 0)) { release_free(best); best = r; }
                else release_free(r);
            } else fprintf(stderr, "palos-update: %s isn't signed by palOS: skipped\n", tag);
            if (man) g_string_free(man, TRUE);
            if (sig) g_string_free(sig, TRUE);
        }
    }
    g_object_unref(p); g_string_free(list, TRUE);
    return best;
}

/* ---------------------------------------------------------------- boot entries (systemd-boot) */
/* the options every palOS entry starts with: which disk palOS HD is */
static char *disk_option(void)
{
    char *cmd = NULL, *opt = NULL;
    if (g_file_get_contents(CMDLINE_FILE, &cmd, NULL, NULL)) {
        char **w = g_strsplit_set(g_strstrip(cmd), " ", -1);
        for (char **p = w; *p; p++) if (g_str_has_prefix(*p, "palos.disk=")) opt = g_strdup(*p);
        g_strfreev(w); g_free(cmd);
    }
    return opt ? opt : g_strdup("palos.disk=LABEL=palOS\\x20HD");
}

static char *base_options(void)
{
    char *s = NULL;
    if (g_file_get_contents("/etc/kernel/cmdline", &s, NULL, NULL) && !*ROOT) {
        /* without root= and anything palOS sets per entry */
        GString *o = g_string_new(NULL);
        char **w = g_strsplit_set(g_strstrip(s), " ", -1);
        for (char **p = w; *p; p++) {
            if (!**p || g_str_has_prefix(*p, "root=") || g_str_has_prefix(*p, "palos.") || !strcmp(*p, "nouveau.modeset=0")) continue;
            if (o->len) g_string_append_c(o, ' ');
            g_string_append(o, *p);
        }
        g_strfreev(w); g_free(s);
        return g_string_free(o, FALSE);
    }
    return g_strdup("quiet splash");
}

/* the entry file for a version, whatever its try counter says now (NULL if there's none) */
static char *entry_of(const char *version)
{
    char *pat = g_strdup_printf("%s/palos-%s*.conf", ENTRIES, version);
    glob_t g; char *r = NULL;
    if (glob(pat, 0, NULL, &g) == 0) {
        for (size_t i = 0; i < g.gl_pathc && !r; i++) {
            const char *b = strrchr(g.gl_pathv[i], '/') + 1 + 6 + strlen(version);   /* after "palos-VERSION" */
            if (*b == '.' || *b == '+') r = g_strdup(g.gl_pathv[i]);
        }
        globfree(&g);
    }
    g_free(pat);
    return r;
}

static gboolean write_file(const char *path, const char *text)
{
    char *tmp = g_strconcat(path, ".new", NULL);
    gboolean ok = g_file_set_contents(tmp, text, -1, NULL) && rename(tmp, path) == 0;
    g_free(tmp);
    return ok;
}

static void write_entries(const char *version, gboolean counted)
{
    g_mkdir_with_parents(ENTRIES, 0755);
    char *disk = disk_option(), *base = base_options();
    char *old = entry_of(version);
    if (old) unlink(old);
    g_free(old);
    char *path = counted ? g_strdup_printf("%s/palos-%s+%d.conf", ENTRIES, version, TRIES) : g_strdup_printf("%s/palos-%s.conf", ENTRIES, version);
    char *text = g_strdup_printf("title palOS %s\nversion %s\nsort-key palos\nefi /EFI/palos/palos-%s.efi\noptions %s palos.image=%s %s\n",
                                 version, version, version, disk, version, base);
    if (!write_file(path, text)) die("The boot entry for palOS %s couldn't be written.", version);
    g_free(path); g_free(text);
    /* the same version with plain graphics, for a computer whose graphics driver doesn't work */
    path = g_strdup_printf("%s/safe-palos-%s.conf", ENTRIES, version);
    text = g_strdup_printf("title palOS %s (safe graphics)\nversion %s\nsort-key palos-safe\nefi /EFI/palos/palos-%s.efi\noptions %s palos.image=%s %s nomodeset\n",
                           version, version, version, disk, version, base);
    write_file(path, text);
    g_free(path); g_free(text); g_free(disk); g_free(base);
}

static void write_loader_conf(void)
{
    /* the newest palOS that hasn't run out of tries starts; two seconds to choose another (hold a key to stop) */
    char *lc = g_strdup_printf("%s/loader/loader.conf", ESP);
    write_file(lc, "# palOS (written by palos-update)\ntimeout 2\ndefault palos-*\nconsole-mode keep\neditor no\n");
    g_free(lc);
}

/* ---------------------------------------------------------------- what's here */
static GPtrArray *installed_versions(void)
{
    GPtrArray *a = g_ptr_array_new_with_free_func(g_free);
    GDir *d = g_dir_open(SYSTEM, 0, NULL);
    if (d) {
        const char *n;
        while ((n = g_dir_read_name(d))) if (g_str_has_prefix(n, "palos-") && g_str_has_suffix(n, ".img")) g_ptr_array_add(a, g_strndup(n + 6, strlen(n) - 10));
        g_dir_close(d);
    }
    for (guint i = 0; i < a->len; i++) for (guint j = i + 1; j < a->len; j++)
        if (vcmp(a->pdata[i], a->pdata[j]) < 0) { gpointer t = a->pdata[i]; a->pdata[i] = a->pdata[j]; a->pdata[j] = t; }
    return a;   /* newest first */
}

static char *waiting(void)
{
    char *v = NULL;
    char *rp = g_strdup_printf("%s/ready", UPDATES); g_file_get_contents(rp, &v, NULL, NULL); g_free(rp);
    if (v) g_strstrip(v);
    return v && safe_version(v) ? v : (g_free(v), NULL);
}

/* ---------------------------------------------------------------- commands */
static void need_root(void) { if (geteuid() != 0) die("Software Update needs an administrator’s password for this."); }

static void print_json(JsonBuilder *b)
{
    JsonGenerator *g = json_generator_new(); JsonNode *r = json_builder_get_root(b);
    json_generator_set_root(g, r);
    char *s = json_generator_to_data(g, NULL);
    puts(s);
    g_free(s); json_node_unref(r); g_object_unref(g); g_object_unref(b);
}

static void member(JsonBuilder *b, const char *k, const char *v) { json_builder_set_member_name(b, k); if (v) json_builder_add_string_value(b, v); else json_builder_add_null_value(b); }

static int cmd_status(void)
{
    char *run = running(), *ready = waiting();
    GPtrArray *vs = installed_versions();
    JsonBuilder *b = json_builder_new(); json_builder_begin_object(b);
    json_builder_set_member_name(b, "ok"); json_builder_add_boolean_value(b, TRUE);
    member(b, "running", run);
    member(b, "waiting", ready);
    json_builder_set_member_name(b, "installed"); json_builder_begin_array(b);
    for (guint i = 0; i < vs->len; i++) json_builder_add_string_value(b, vs->pdata[i]);
    json_builder_end_array(b);
    json_builder_set_member_name(b, "imageSystem"); json_builder_add_boolean_value(b, run != NULL);
    json_builder_end_object(b);
    print_json(b);
    g_free(run); g_free(ready); g_ptr_array_unref(vs);
    return 0;
}

static int cmd_check(void)
{
    char *run = running();
    Release *r = latest();
    JsonBuilder *b = json_builder_new(); json_builder_begin_object(b);
    json_builder_set_member_name(b, "ok"); json_builder_add_boolean_value(b, TRUE);
    member(b, "running", run);
    gboolean newer = r && (!run || vcmp(r->version, run) > 0);
    json_builder_set_member_name(b, "available"); json_builder_add_boolean_value(b, newer);
    if (r) {
        member(b, "version", r->version); member(b, "notes", r->notes);
        json_builder_set_member_name(b, "size"); json_builder_add_int_value(b, r->img_size + r->efi_size);
    }
    json_builder_end_object(b);
    print_json(b);
    g_free(run); release_free(r);
    return 0;
}

static gboolean verify_file(const char *path, const char *sha, gint64 size)
{
    struct stat st;
    if (stat(path, &st) || (size > 0 && st.st_size != size)) return FALSE;
    char *got = sha256_file(path);
    gboolean ok = got && !strcmp(got, sha);
    g_free(got);
    return ok;
}

static int cmd_download(void)
{
    need_root();
    Release *r = latest();
    char *run = running();
    if (!r || (run && vcmp(r->version, run) <= 0)) { puts("{\"ok\": true, \"available\": false}"); return 0; }
    g_mkdir_with_parents(UPDATES, 0700);
    struct statvfs fs;
    if (statvfs(DISK, &fs) == 0 && (gint64)(fs.f_bavail * fs.f_frsize) < r->img_size + r->efi_size + (512LL << 20))
        die("There isn’t enough free space for palOS %s. It needs %.1f GB.", r->version, (r->img_size + r->efi_size) / 1e9 + 0.5);
    char *dir = g_strdup_printf("%s/%s", UPDATES, r->version);
    g_mkdir_with_parents(dir, 0700);
    char *img = g_build_filename(dir, r->img_name, NULL), *efi = g_build_filename(dir, r->efi_name, NULL), *man = g_build_filename(dir, "manifest.json", NULL);
    curl_off_t total = r->img_size + r->efi_size;
    if (!download(r->efi_url, efi, 0, total) || !download(r->img_url, img, r->efi_size, total)) die("The download stopped. It carries on from there next time.");
    printf("checking\n"); fflush(stdout);
    if (!verify_file(efi, r->efi_sha, r->efi_size) || !verify_file(img, r->img_sha, r->img_size)) {
        unlink(efi); unlink(img);
        die("The download for palOS %s was damaged, so it was thrown away. Try again.", r->version);
    }
    write_file(man, r->manifest);
    { char *rp = g_strdup_printf("%s/ready", UPDATES); write_file(rp, r->version); g_free(rp); }
    printf("{\"ok\": true, \"available\": true, \"version\": \"%s\", \"downloaded\": true}\n", r->version);
    g_free(dir); g_free(img); g_free(efi); g_free(man); g_free(run); release_free(r);
    return 0;
}

static int cmd_apply(void)
{
    need_root();
    char *v = waiting();
    if (!v) die("No update has been downloaded.");
    char *dir = g_strdup_printf("%s/%s", UPDATES, v), *mp = g_build_filename(dir, "manifest.json", NULL), *mtext = NULL;
    if (!g_file_get_contents(mp, &mtext, NULL, NULL)) die("The downloaded update is incomplete.");
    Release *r = read_manifest(mtext, NULL, NULL);
    if (!r || strcmp(r->version, v)) die("The downloaded update is incomplete.");
    char *img = g_build_filename(dir, r->img_name, NULL), *efi = g_build_filename(dir, r->efi_name, NULL);
    printf("checking\n"); fflush(stdout);
    if (!verify_file(img, r->img_sha, r->img_size) || !verify_file(efi, r->efi_sha, r->efi_size)) die("The downloaded update was changed since it was checked. Download it again.");
    /* the boot file first (small), then the image: both by rename, so nothing half-copied is ever used */
    { char *ed = g_strdup_printf("%s/EFI/palos", ESP); g_mkdir_with_parents(ed, 0755); g_free(ed); }
    char *efi_dst = g_strdup_printf("%s/EFI/palos/palos-%s.efi", ESP, v), *efi_tmp = g_strconcat(efi_dst, ".new", NULL);
    gchar *data = NULL; gsize len = 0;
    if (!g_file_get_contents(efi, &data, &len, NULL) || !g_file_set_contents(efi_tmp, data, len, NULL) || rename(efi_tmp, efi_dst))
        die("palOS %s couldn’t be put on the startup partition (it may be full).", v);
    g_free(data);
    sync();
    g_mkdir_with_parents(SYSTEM, 0755);
    char *img_dst = g_strdup_printf("%s/palos-%s.img", SYSTEM, v);
    if (rename(img, img_dst)) die("palOS %s couldn’t be put in place: %s", v, g_strerror(errno));
    sync();
    write_entries(v, TRUE);
    write_loader_conf();
    { char *rp = g_strdup_printf("%s/ready", UPDATES); unlink(rp); g_free(rp); }
    unlink(efi); unlink(mp); rmdir(dir);
    printf("{\"ok\": true, \"version\": \"%s\", \"restart\": true}\n", v);
    return 0;
}

/* this start worked: the entry loses its try counter (systemd-boot's "palos-V+N-M.conf" → "palos-V.conf") */
static int cmd_mark_good(void)
{
    need_root();
    char *v = running();
    if (!v) return 0;
    char *e = entry_of(v);
    if (e && strchr(strrchr(e, '/'), '+')) {
        char *good = g_strdup_printf("%s/palos-%s.conf", ENTRIES, v);
        if (rename(e, good) == 0) fprintf(stderr, "palos-update: palOS %s started fine\n", v);
        g_free(good);
    }
    g_free(e); g_free(v);
    return 0;
}

static int cmd_rollback(void)
{
    need_root();
    char *run = running();
    GPtrArray *vs = installed_versions();
    const char *prev = NULL;
    for (guint i = 0; i < vs->len; i++) if (!run || vcmp(vs->pdata[i], run) < 0) { prev = vs->pdata[i]; break; }
    if (!prev) die("There’s no earlier version of palOS on this computer.");
    /* the running one goes out of the way of the default choice: no tries left */
    if (run) {
        char *e = entry_of(run);
        if (e) { char *bad = g_strdup_printf("%s/palos-%s+0-%d.conf", ENTRIES, run, TRIES); rename(e, bad); g_free(bad); g_free(e); }
    }
    write_entries(prev, FALSE);
    write_loader_conf();
    printf("{\"ok\": true, \"version\": \"%s\", \"restart\": true}\n", prev);
    g_free(run); g_ptr_array_unref(vs);
    return 0;
}

/* keep the running version and the one before it; what's waiting stays too */
static int cmd_clean(void)
{
    need_root();
    char *run = running(), *ready = waiting();
    GPtrArray *vs = installed_versions();
    int kept_older = 0;
    for (guint i = 0; i < vs->len; i++) {
        const char *v = vs->pdata[i];
        if ((run && !strcmp(v, run)) || (ready && !strcmp(v, ready)) || (run && vcmp(v, run) > 0)) continue;
        if (kept_older++ == 0) continue;
        char *img = g_strdup_printf("%s/palos-%s.img", SYSTEM, v), *efi = g_strdup_printf("%s/EFI/palos/palos-%s.efi", ESP, v), *e = entry_of(v), *s = g_strdup_printf("%s/safe-palos-%s.conf", ENTRIES, v);
        unlink(img); unlink(efi); if (e) unlink(e); unlink(s);
        fprintf(stderr, "palos-update: removed palOS %s\n", v);
        g_free(img); g_free(efi); g_free(e); g_free(s);
    }
    /* downloads for versions that aren't waiting */
    GDir *d = g_dir_open(UPDATES, 0, NULL);
    if (d) {
        const char *n;
        while ((n = g_dir_read_name(d))) {
            if (!strcmp(n, "ready") || (ready && !strcmp(n, ready))) continue;
            char *p = g_build_filename(UPDATES, n, NULL), *cmd = g_strdup_printf("rm -rf -- '%s'", p);
            if (safe_version(n) && system(cmd)) { }
            g_free(p); g_free(cmd);
        }
        g_dir_close(d);
    }
    puts("{\"ok\": true}");
    g_free(run); g_free(ready); g_ptr_array_unref(vs);
    return 0;
}

int main(int argc, char **argv)
{
    char *conf = NULL;
    if (g_file_get_contents("/etc/palos/update.conf", &conf, NULL, NULL)) {
        char **lines = g_strsplit(conf, "\n", -1);
        for (char **l = lines; *l; l++) if (g_str_has_prefix(g_strstrip(*l), "repo=")) repo = g_strdup(*l + 5);
        g_strfreev(lines); g_free(conf);
    }
    set_paths();
    curl_global_init(CURL_GLOBAL_DEFAULT);
    const char *c = argc > 1 ? argv[1] : "status";
    if (!strcmp(c, "status")) return cmd_status();
    if (!strcmp(c, "check")) return cmd_check();
    if (!strcmp(c, "download")) return cmd_download();
    if (!strcmp(c, "apply")) return cmd_apply();
    if (!strcmp(c, "mark-good")) return cmd_mark_good();
    if (!strcmp(c, "rollback")) return cmd_rollback();
    if (!strcmp(c, "clean")) return cmd_clean();
    fputs("palos-update status | check | download | apply | mark-good | rollback | clean\n", stderr);
    return 2;
}

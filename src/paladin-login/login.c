/* paladin-login: palOS's login manager (the display manager).

   It starts the X server, shows the palOS login screen (paladin-greeter, run as its own unprivileged account
   "paladin-login"), checks passwords through PAM, and starts the person's session, registered with
   systemd-logind like any login. When the session ends, the X server is started afresh and the login screen
   comes back.

   Settings: /etc/paladin-login.conf, then /etc/paladin-login.d/NAME.conf in name order (later wins), "key=value":
     autologin-user, autologin-session   log someone straight in once, when paladin-login starts (setup, the
                                         first login after setup). On the install USB the live account logs in.
     default-session                     the session key used when none is chosen (paladin)
     sessions-dirs                       where sessions are listed (colon separated)
     display-setup-script                run as root when the X server is ready
     session-setup-script                run as root just before a session starts

   The login screen talks to paladin-login over the socket in $PALADIN_LOGIN_FD, one JSON object per line:
     in:  {"op":"login","user","password","session"}  {"op":"cancel"}  {"op":"power","what":"suspend|restart|shutdown"}
     out: {"ev":"auth","ok":true}  {"ev":"auth","ok":false,"text"}  {"ev":"message","text","error"}
   Everything else the login screen shows (people, pictures, sessions) it reads itself. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <fcntl.h>
#include <grp.h>
#include <poll.h>
#include <pwd.h>
#include <signal.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <security/pam_appl.h>
#include <glib.h>
#include <json-glib/json-glib.h>

#define RUN "/run/paladin-login"
static const char *DISPLAY = ":0";    /* PALADIN_LOGIN_TEST_DISPLAY: use that (test) X server instead of starting Xorg */
#define VT "7"
#define GREETER_USER "paladin-login"
#define GREETER "/usr/sbin/paladin-greeter"
#define WRAPPER "/usr/lib/paladin-login/session-wrapper"
#define XORG "/usr/bin/Xorg"

static GHashTable *conf;
static pid_t xpid;
static char cookie[33];
static gboolean autologin_done;

static void say(const char *fmt, ...)
{
    va_list a; va_start(a, fmt);
    fputs("paladin-login: ", stderr); vfprintf(stderr, fmt, a); fputc('\n', stderr);
    va_end(a);
}

/* ---------------------------------------------------------------- settings */
static void read_conf_file(const char *path)
{
    char *data = NULL;
    if (!g_file_get_contents(path, &data, NULL, NULL)) return;
    char **lines = g_strsplit(data, "\n", -1);
    for (char **l = lines; *l; l++) {
        char *s = g_strstrip(*l);
        if (!*s || *s == '#' || *s == '[') continue;
        char *eq = strchr(s, '=');
        if (!eq) continue;
        *eq = 0;
        g_hash_table_replace(conf, g_strdup(g_strstrip(s)), g_strdup(g_strstrip(eq + 1)));
    }
    g_strfreev(lines); g_free(data);
}

static void load_conf(void)
{
    if (conf) g_hash_table_unref(conf);
    conf = g_hash_table_new_full(g_str_hash, g_str_equal, g_free, g_free);
    g_hash_table_insert(conf, g_strdup("default-session"), g_strdup("paladin"));
    g_hash_table_insert(conf, g_strdup("sessions-dirs"), g_strdup("/usr/share/xsessions:/usr/lib/palos-firstboot/sessions"));
    read_conf_file("/etc/paladin-login.conf");
    GDir *d = g_dir_open("/etc/paladin-login.d", 0, NULL);
    if (d) {
        GPtrArray *names = g_ptr_array_new_with_free_func(g_free);
        const char *n;
        while ((n = g_dir_read_name(d))) if (g_str_has_suffix(n, ".conf")) g_ptr_array_add(names, g_strdup(n));
        g_dir_close(d);
        for (guint i = 0; i < names->len; i++) {
            for (guint j = i + 1; j < names->len; j++)
                if (strcmp(names->pdata[i], names->pdata[j]) > 0) { gpointer t = names->pdata[i]; names->pdata[i] = names->pdata[j]; names->pdata[j] = t; }
        }
        for (guint i = 0; i < names->len; i++) { char *p = g_build_filename("/etc/paladin-login.d", names->pdata[i], NULL); read_conf_file(p); g_free(p); }
        g_ptr_array_unref(names);
    }
}

static const char *cfg(const char *k) { const char *v = g_hash_table_lookup(conf, k); return v && *v ? v : NULL; }

/* the install USB: its live account logs in by itself */
static char *live_user(void)
{
    char *cmd = NULL;
    if (!g_file_get_contents("/proc/cmdline", &cmd, NULL, NULL)) return NULL;
    gboolean live = strstr(cmd, "boot=casper") != NULL;
    g_free(cmd);
    if (!live) return NULL;
    char *data = NULL, *user = NULL;
    if (g_file_get_contents("/etc/casper.conf", &data, NULL, NULL)) {
        char **lines = g_strsplit(data, "\n", -1);
        for (char **l = lines; *l; l++) {
            char *s = g_strstrip(*l);
            if (g_str_has_prefix(s, "export ")) s += 7;
            if (g_str_has_prefix(s, "USERNAME=")) { user = g_strdup(s + 9); g_strdelimit(user, "\"'", ' '); g_strstrip(user); }
        }
        g_strfreev(lines); g_free(data);
    }
    if (user && !getpwnam(user)) { g_free(user); user = NULL; }
    return user;
}

/* ---------------------------------------------------------------- sessions (.desktop files) */
static char *session_exec(const char *key, char **desktop_names)
{
    char **dirs = g_strsplit(cfg("sessions-dirs") ? cfg("sessions-dirs") : "/usr/share/xsessions", ":", -1);
    char *exec = NULL;
    for (char **d = dirs; *d && !exec; d++) {
        char *p = g_strdup_printf("%s/%s.desktop", *d, key);
        GKeyFile *kf = g_key_file_new();
        if (g_key_file_load_from_file(kf, p, G_KEY_FILE_NONE, NULL)) {
            exec = g_key_file_get_string(kf, "Desktop Entry", "Exec", NULL);
            if (desktop_names) *desktop_names = g_key_file_get_string(kf, "Desktop Entry", "DesktopNames", NULL);
        }
        g_key_file_unref(kf); g_free(p);
    }
    g_strfreev(dirs);
    return exec;
}

/* ---------------------------------------------------------------- the X server */
static volatile sig_atomic_t x_ready;
static void on_usr1(int s) { (void)s; x_ready = 1; }

static void run_script(const char *key)
{
    const char *s = cfg(key);
    if (!s || access(s, X_OK)) return;
    pid_t p = fork();
    if (p == 0) {
        setenv("DISPLAY", DISPLAY, 1); setenv("XAUTHORITY", RUN "/root.auth", 1);
        execl(s, s, (char *)NULL); _exit(127);
    }
    if (p > 0) waitpid(p, NULL, 0);
}

/* an X authority file with this server's cookie, for one account */
static gboolean write_auth(const char *path, uid_t uid, gid_t gid)
{
    char host[256] = "";
    gethostname(host, sizeof host - 1);
    char num[16]; g_strlcpy(num, DISPLAY[0] == ':' ? DISPLAY + 1 : DISPLAY, sizeof num);
    char *dot = strchr(num, '.'); if (dot) *dot = 0;
    guint16 nlen = GUINT16_TO_BE((guint16)strlen(num));
    GString *b = g_string_new(NULL);
    /* family FamilyLocal (256) for this host, this display, MIT-MAGIC-COOKIE-1 */
    const char *names[2] = { host, NULL };
    for (int i = 0; names[i]; i++) {
        guint16 fam = GUINT16_TO_BE(256), len;
        g_string_append_len(b, (char *)&fam, 2);
        len = GUINT16_TO_BE((guint16)strlen(names[i])); g_string_append_len(b, (char *)&len, 2); g_string_append(b, names[i]);
        g_string_append_len(b, (char *)&nlen, 2); g_string_append(b, num);
        len = GUINT16_TO_BE(18); g_string_append_len(b, (char *)&len, 2); g_string_append(b, "MIT-MAGIC-COOKIE-1");
        len = GUINT16_TO_BE(16); g_string_append_len(b, (char *)&len, 2);
        for (int k = 0; k < 16; k++) { unsigned v; sscanf(cookie + k * 2, "%2x", &v); g_string_append_c(b, (char)v); }
    }
    /* also "FamilyWild" so the cookie works whatever the host name becomes (setup renames the computer) */
    guint16 fam = GUINT16_TO_BE(65535), len = 0;
    g_string_append_len(b, (char *)&fam, 2); g_string_append_len(b, (char *)&len, 2);
    g_string_append_len(b, (char *)&nlen, 2); g_string_append(b, num);
    len = GUINT16_TO_BE(18); g_string_append_len(b, (char *)&len, 2); g_string_append(b, "MIT-MAGIC-COOKIE-1");
    len = GUINT16_TO_BE(16); g_string_append_len(b, (char *)&len, 2);
    for (int k = 0; k < 16; k++) { unsigned v; sscanf(cookie + k * 2, "%2x", &v); g_string_append_c(b, (char)v); }
    char *tmp = g_strconcat(path, ".new", NULL);
    int fd = open(tmp, O_WRONLY | O_CREAT | O_TRUNC | O_CLOEXEC | O_NOFOLLOW, 0600);
    gboolean ok = fd >= 0 && write(fd, b->str, b->len) == (ssize_t)b->len;
    if (fd >= 0) { ok = fchown(fd, uid, gid) == 0 && ok; close(fd); }
    ok = ok && rename(tmp, path) == 0;
    if (!ok) unlink(tmp);
    g_free(tmp); g_string_free(b, TRUE);
    return ok;
}

static gboolean start_x(void)
{
    for (int i = 0; i < 16; i++) { guint8 r = (guint8)g_random_int_range(0, 256); snprintf(cookie + i * 2, 3, "%02x", r); }
    mkdir(RUN, 0711);
    if (!write_auth(RUN "/root.auth", 0, 0)) { say("can't write the X authority file"); return FALSE; }
    if (getenv("PALADIN_LOGIN_TEST_DISPLAY")) { run_script("display-setup-script"); return TRUE; }   /* a test X server, already running */
    x_ready = 0;
    struct sigaction sa = { .sa_handler = on_usr1 };
    sigaction(SIGUSR1, &sa, NULL);
    xpid = fork();
    if (xpid == 0) {
        /* X tells its parent it's ready with SIGUSR1 when it starts with SIGUSR1 ignored */
        signal(SIGUSR1, SIG_IGN);
        int null = open("/dev/null", O_RDONLY); dup2(null, 0);
        execl(XORG, XORG, DISPLAY, "vt" VT, "-nolisten", "tcp", "-novtswitch", "-keeptty", "-background", "none",
              "-seat", "seat0", "-auth", RUN "/root.auth", (char *)NULL);
        _exit(127);
    }
    for (int i = 0; i < 300 && !x_ready; i++) {
        if (waitpid(xpid, NULL, WNOHANG) == xpid) { say("the X server stopped as it started"); xpid = 0; return FALSE; }
        usleep(50000);
    }
    if (!x_ready) say("the X server didn't say it was ready (going on)");
    run_script("display-setup-script");
    return TRUE;
}

static void stop_x(void)
{
    if (xpid <= 0) return;
    kill(xpid, SIGTERM);
    for (int i = 0; i < 100; i++) { if (waitpid(xpid, NULL, WNOHANG) == xpid) { xpid = 0; return; } usleep(50000); }
    kill(xpid, SIGKILL); waitpid(xpid, NULL, 0); xpid = 0;
}

/* ---------------------------------------------------------------- PAM */
typedef struct { const char *password; int out; gboolean asked; } Conv;
static volatile pid_t session_child;
static void pass_on(int s) { if (session_child > 0) kill(session_child, s); }

static void tell(int fd, const char *kind, const char *text)
{
    if (fd < 0) return;
    JsonBuilder *b = json_builder_new(); json_builder_begin_object(b);
    json_builder_set_member_name(b, "k"); json_builder_add_string_value(b, kind);
    json_builder_set_member_name(b, "text"); json_builder_add_string_value(b, text ? text : "");
    json_builder_end_object(b);
    JsonGenerator *g = json_generator_new(); JsonNode *r = json_builder_get_root(b); json_generator_set_root(g, r);
    char *s = json_generator_to_data(g, NULL);
    GString *line = g_string_new(s); g_string_append_c(line, '\n');
    if (write(fd, line->str, line->len) < 0) { /* the other side went */ }
    g_string_free(line, TRUE); g_free(s); json_node_unref(r); g_object_unref(g); g_object_unref(b);
}

static int conv(int n, const struct pam_message **msg, struct pam_response **resp, void *data)
{
    Conv *c = data;
    struct pam_response *r = calloc(n, sizeof *r);
    if (!r) return PAM_BUF_ERR;
    for (int i = 0; i < n; i++) {
        switch (msg[i]->msg_style) {
        case PAM_PROMPT_ECHO_OFF:
            /* the password, once; a second question (a new password, a second factor) can't be answered here */
            if (!c->password || c->asked) { free(r); return PAM_CONV_ERR; }
            c->asked = TRUE;
            r[i].resp = strdup(c->password);
            break;
        case PAM_PROMPT_ECHO_ON: free(r); return PAM_CONV_ERR;
        case PAM_ERROR_MSG: tell(c->out, "error", msg[i]->msg); break;
        case PAM_TEXT_INFO: tell(c->out, "info", msg[i]->msg); break;
        }
    }
    *resp = r;
    return PAM_SUCCESS;
}

static void pam_env(pam_handle_t *ph, const char *k, const char *v) { char *s = g_strdup_printf("%s=%s", k, v); pam_putenv(ph, s); g_free(s); }

/* Runs in its own process. Checks the password (when given) and reports "ok" or "fail" on out; then waits for
   one byte on go (the login screen has gone) and starts the session, returning when it ends. */
static void session_worker(const char *service, const char *user, const char *password, const char *key, int out, int go,
                           gboolean greeter, int greeter_fd)
{
    Conv c = { password, out, FALSE };
    struct pam_conv pc = { conv, &c };
    pam_handle_t *ph = NULL;
    int rc = pam_start(service, user, &pc, &ph);
    if (rc == PAM_SUCCESS) rc = pam_set_item(ph, PAM_TTY, DISPLAY);
    if (rc == PAM_SUCCESS) rc = pam_set_item(ph, PAM_XDISPLAY, DISPLAY);
    if (rc == PAM_SUCCESS && password) rc = pam_authenticate(ph, 0);
    if (rc == PAM_SUCCESS) {
        rc = pam_acct_mgmt(ph, 0);
        if (rc == PAM_NEW_AUTHTOK_REQD) { tell(out, "fail", "Your password has expired. Ask the computer’s administrator for a new one."); pam_end(ph, rc); _exit(1); }
    }
    if (rc != PAM_SUCCESS) {
        tell(out, "fail", rc == PAM_AUTH_ERR || rc == PAM_USER_UNKNOWN || rc == PAM_CONV_ERR ? "" : pam_strerror(ph, rc));
        if (ph) pam_end(ph, rc);
        _exit(1);
    }
    tell(out, "ok", "");
    if (go >= 0) { char b; if (read(go, &b, 1) != 1) { pam_end(ph, PAM_SUCCESS); _exit(1); } }

    struct passwd *pw = getpwnam(user);
    if (!pw) { pam_end(ph, PAM_USER_UNKNOWN); _exit(1); }
    char *names = NULL, *exec = greeter ? g_strdup(GREETER) : session_exec(key, &names);
    if (!exec) { tell(out, "nosession", ""); pam_end(ph, PAM_SUCCESS); _exit(1); }
    pam_env(ph, "XDG_SESSION_TYPE", "x11");
    pam_env(ph, "XDG_SESSION_CLASS", greeter ? "greeter" : "user");
    pam_env(ph, "XDG_SEAT", "seat0");
    pam_env(ph, "XDG_VTNR", VT);
    if (!greeter) pam_env(ph, "XDG_SESSION_DESKTOP", key);
    if (initgroups(pw->pw_name, pw->pw_gid) || setgid(pw->pw_gid)) { pam_end(ph, PAM_SYSTEM_ERR); _exit(1); }
    pam_setcred(ph, PAM_ESTABLISH_CRED);
    rc = pam_open_session(ph, 0);
    if (rc != PAM_SUCCESS) { say("the session for %s couldn't open: %s", user, pam_strerror(ph, rc)); tell(out, "nosession", ""); pam_end(ph, rc); _exit(1); }
    if (!greeter) run_script("session-setup-script");

    char *auth = greeter ? g_strdup(RUN "/greeter.auth") : g_build_filename(pw->pw_dir, ".Xauthority", NULL);
    pid_t child = fork();
    if (child == 0) {
        signal(SIGTERM, SIG_DFL);
        setsid();
        if (setuid(pw->pw_uid) || getuid() != pw->pw_uid) _exit(1);
        if (chdir(pw->pw_dir)) { if (chdir("/")) _exit(1); }
        if (!greeter) write_auth(auth, pw->pw_uid, pw->pw_gid);
        char **env = pam_getenvlist(ph);
        GPtrArray *e = g_ptr_array_new();
        for (char **p = env; p && *p; p++) g_ptr_array_add(e, *p);
        g_ptr_array_add(e, g_strdup_printf("HOME=%s", pw->pw_dir));
        g_ptr_array_add(e, g_strdup_printf("USER=%s", pw->pw_name));
        g_ptr_array_add(e, g_strdup_printf("LOGNAME=%s", pw->pw_name));
        g_ptr_array_add(e, g_strdup_printf("SHELL=%s", pw->pw_shell && *pw->pw_shell ? pw->pw_shell : "/bin/sh"));
        g_ptr_array_add(e, g_strdup("PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"));
        g_ptr_array_add(e, g_strdup_printf("DISPLAY=%s", DISPLAY));
        g_ptr_array_add(e, g_strdup_printf("XAUTHORITY=%s", auth));
        if (greeter) g_ptr_array_add(e, g_strdup_printf("PALADIN_LOGIN_FD=%d", greeter_fd));
        else {
            g_ptr_array_add(e, g_strdup_printf("DESKTOP_SESSION=%s", key));
            g_ptr_array_add(e, g_strdup_printf("GDMSESSION=%s", key));
            if (names) g_ptr_array_add(e, g_strdup_printf("XDG_CURRENT_DESKTOP=%s", g_strdelimit(names, ";", ':')));
        }
        g_ptr_array_add(e, NULL);
        if (greeter) execle(exec, exec, (char *)NULL, (char **)e->pdata);
        else execle(WRAPPER, WRAPPER, exec, (char *)NULL, (char **)e->pdata);
        _exit(127);
    }
    session_child = child;
    struct sigaction sa = { .sa_handler = pass_on };
    sigaction(SIGTERM, &sa, NULL);       /* asked to stop: the session (or login screen) stops, then this closes it */
    int st = 0;
    while (child > 0 && waitpid(child, &st, 0) < 0 && errno == EINTR) ;
    pam_close_session(ph, 0);
    pam_setcred(ph, PAM_DELETE_CRED);
    pam_end(ph, PAM_SUCCESS);
    _exit(child > 0 && WIFEXITED(st) ? WEXITSTATUS(st) : 1);
}

typedef struct { pid_t pid; int out, go; } Worker;

static Worker start_worker(const char *service, const char *user, const char *password, const char *key, gboolean greeter, int greeter_fd)
{
    Worker w = { 0, -1, -1 };
    int o[2], g[2];
    if (pipe2(o, O_CLOEXEC) || pipe2(g, O_CLOEXEC)) return w;
    w.pid = fork();
    if (w.pid == 0) {
        close(o[0]); close(g[1]);
        if (greeter_fd >= 0) { int fl = fcntl(greeter_fd, F_GETFD); fcntl(greeter_fd, F_SETFD, fl & ~FD_CLOEXEC); }
        session_worker(service, user, password, key, o[1], g[0], greeter, greeter_fd);
    }
    close(o[1]); close(g[0]);
    w.out = o[0]; w.go = g[1];
    return w;
}

/* the worker's next line: kind ("ok", "fail", "error", "info", "nosession"), or NULL when it ended */
static char *worker_line(Worker *w, char **text, int timeout_ms)
{
    GString *s = g_string_new(NULL);
    char c;
    struct pollfd p = { w->out, POLLIN, 0 };
    while (1) {
        if (poll(&p, 1, timeout_ms) <= 0) { g_string_free(s, TRUE); return NULL; }
        ssize_t n = read(w->out, &c, 1);
        if (n <= 0) { g_string_free(s, TRUE); return NULL; }
        if (c == '\n') break;
        g_string_append_c(s, c);
    }
    JsonParser *jp = json_parser_new();
    char *kind = NULL;
    if (json_parser_load_from_data(jp, s->str, -1, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(jp))) {
        JsonObject *o = json_node_get_object(json_parser_get_root(jp));
        kind = g_strdup(json_object_get_string_member_with_default(o, "k", ""));
        if (text) *text = g_strdup(json_object_get_string_member_with_default(o, "text", ""));
    }
    g_object_unref(jp); g_string_free(s, TRUE);
    return kind;
}

static int wait_worker(Worker *w)
{
    int st = 0;
    if (w->pid > 0) waitpid(w->pid, &st, 0);
    if (w->out >= 0) close(w->out);
    if (w->go >= 0) close(w->go);
    w->pid = 0; w->out = w->go = -1;
    return WIFEXITED(st) ? WEXITSTATUS(st) : 1;
}

/* ---------------------------------------------------------------- talking to the login screen */
static void send_ev(int fd, const char *ev, int ok, const char *text, gboolean error)
{
    JsonBuilder *b = json_builder_new(); json_builder_begin_object(b);
    json_builder_set_member_name(b, "ev"); json_builder_add_string_value(b, ev);
    if (ok >= 0) { json_builder_set_member_name(b, "ok"); json_builder_add_boolean_value(b, ok); }
    if (text) { json_builder_set_member_name(b, "text"); json_builder_add_string_value(b, text); }
    if (!strcmp(ev, "message")) { json_builder_set_member_name(b, "error"); json_builder_add_boolean_value(b, error); }
    json_builder_end_object(b);
    JsonGenerator *g = json_generator_new(); JsonNode *r = json_builder_get_root(b); json_generator_set_root(g, r);
    char *s = json_generator_to_data(g, NULL);
    GString *line = g_string_new(s); g_string_append_c(line, '\n');
    if (send(fd, line->str, line->len, MSG_NOSIGNAL) < 0) { /* the login screen went */ }
    g_string_free(line, TRUE); g_free(s); json_node_unref(r); g_object_unref(g); g_object_unref(b);
}

static void power(const char *what)
{
    const char *verb = !g_strcmp0(what, "suspend") ? "suspend" : !g_strcmp0(what, "restart") ? "reboot" : !g_strcmp0(what, "shutdown") ? "poweroff" : NULL;
    if (!verb) return;
    pid_t p = fork();
    if (p == 0) { execl("/usr/bin/systemctl", "systemctl", verb, (char *)NULL); _exit(127); }
    if (p > 0) waitpid(p, NULL, 0);
}

/* The login screen, until someone logs in (returns their worker, ready to start the session) or it closes. */
static gboolean run_greeter(Worker *chosen)
{
    int sv[2];
    if (socketpair(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0, sv)) return FALSE;
    struct passwd *gp = getpwnam(GREETER_USER);
    if (!gp) { say("the login screen's account (" GREETER_USER ") is missing"); close(sv[0]); close(sv[1]); return FALSE; }
    write_auth(RUN "/greeter.auth", gp->pw_uid, gp->pw_gid);
    Worker g = start_worker("paladin-greeter", GREETER_USER, NULL, NULL, TRUE, sv[1]);
    close(sv[1]);
    char *k = worker_line(&g, NULL, 10000);
    if (!k || strcmp(k, "ok")) { g_free(k); say("the login screen's session couldn't start"); close(sv[0]); wait_worker(&g); return FALSE; }
    g_free(k);
    if (write(g.go, "g", 1) != 1) { /* the worker went */ }

    GString *buf = g_string_new(NULL);
    Worker login = { 0, -1, -1 };
    gboolean done = FALSE, logged_in = FALSE;
    while (!done) {
        struct pollfd p[2] = { { sv[0], POLLIN, 0 }, { login.out, POLLIN, 0 } };
        if (poll(p, login.pid ? 2 : 1, 1000) < 0 && errno != EINTR) break;
        if (waitpid(g.pid, NULL, WNOHANG) == g.pid) { g.pid = 0; done = TRUE; }
        if (p[0].revents & (POLLIN | POLLHUP)) {
            char tmp[4096]; ssize_t n = recv(sv[0], tmp, sizeof tmp, 0);
            if (n <= 0) { done = TRUE; break; }
            g_string_append_len(buf, tmp, n);
            char *nl;
            while ((nl = memchr(buf->str, '\n', buf->len))) {
                char *line = g_strndup(buf->str, nl - buf->str);
                g_string_erase(buf, 0, nl - buf->str + 1);
                JsonParser *jp = json_parser_new();
                if (json_parser_load_from_data(jp, line, -1, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(jp))) {
                    JsonObject *m = json_node_get_object(json_parser_get_root(jp));
                    const char *op = json_object_get_string_member_with_default(m, "op", "");
                    if (!strcmp(op, "login") && !login.pid) {
                        const char *user = json_object_get_string_member_with_default(m, "user", "");
                        const char *pw = json_object_get_string_member_with_default(m, "password", "");
                        const char *key = json_object_get_string_member_with_default(m, "session", "");
                        struct passwd *u = getpwnam(user);
                        char *exec = session_exec(*key ? key : cfg("default-session"), NULL);
                        if (!u || u->pw_uid < 1000 || !strcmp(user, GREETER_USER)) send_ev(sv[0], "auth", 0, "Incorrect password. Try again.", FALSE);
                        else if (!exec) send_ev(sv[0], "auth", 0, "That session couldn’t start. Choose another session below.", FALSE);
                        else login = start_worker("paladin-login", user, pw, *key ? key : cfg("default-session"), FALSE, -1);
                        g_free(exec);
                    } else if (!strcmp(op, "cancel") && login.pid) { kill(login.pid, SIGTERM); wait_worker(&login); }
                    else if (!strcmp(op, "power")) power(json_object_get_string_member_with_default(m, "what", ""));
                }
                g_object_unref(jp); g_free(line);
            }
        }
        while (login.pid && (p[1].revents & POLLIN)) {
            char *text = NULL, *kind = worker_line(&login, &text, 0);
            if (!kind) { wait_worker(&login); send_ev(sv[0], "auth", 0, "Incorrect password. Try again.", FALSE); g_free(text); break; }
            if (!strcmp(kind, "error") || !strcmp(kind, "info")) send_ev(sv[0], "message", -1, text, !strcmp(kind, "error"));
            else if (!strcmp(kind, "fail")) {
                wait_worker(&login);
                send_ev(sv[0], "auth", 0, text && *text ? text : "Incorrect password. Try again.", FALSE);
            } else if (!strcmp(kind, "ok")) {
                send_ev(sv[0], "auth", 1, NULL, FALSE);
                logged_in = TRUE; done = TRUE;
            }
            g_free(kind); g_free(text);
            p[1].revents = 0;
            struct pollfd q = { login.out, POLLIN, 0 };
            if (login.pid && poll(&q, 1, 0) > 0) p[1].revents = q.revents;
        }
    }
    g_string_free(buf, TRUE);
    /* the login screen goes before the session starts */
    if (g.pid) {
        for (int i = 0; i < 30 && waitpid(g.pid, NULL, WNOHANG) != g.pid; i++) usleep(100000);
        if (kill(g.pid, 0) == 0) { kill(g.pid, SIGTERM); usleep(500000); }
    }
    /* the greeter worker's own child (the login screen) is ended with its session */
    wait_worker(&g);
    close(sv[0]);
    if (logged_in) { *chosen = login; return TRUE; }
    if (login.pid) { kill(login.pid, SIGTERM); wait_worker(&login); }
    return FALSE;
}

static void run_session(Worker *w)
{
    if (write(w->go, "g", 1) != 1) { /* the worker went */ }
    char *t = NULL, *k;
    while ((k = worker_line(w, &t, -1))) { g_free(k); g_free(t); t = NULL; }
    wait_worker(w);
}

static volatile sig_atomic_t quitting;
static void on_term(int s) { (void)s; quitting = 1; }

int main(void)
{
    if (getuid() != 0) { say("this needs to run as root (it is the login manager)"); return 1; }
    if (getenv("PALADIN_LOGIN_TEST_DISPLAY")) DISPLAY = getenv("PALADIN_LOGIN_TEST_DISPLAY");
    struct sigaction sa = { .sa_handler = on_term };
    sigaction(SIGTERM, &sa, NULL); sigaction(SIGINT, &sa, NULL);
    signal(SIGPIPE, SIG_IGN);
    int fails = 0;
    while (!quitting) {
        load_conf();
        if (!start_x()) {
            if (++fails >= 5) { say("the X server keeps failing to start; giving up"); return 1; }
            sleep(2);
            continue;
        }
        Worker w = { 0, -1, -1 };
        gboolean have = FALSE;
        char *auto_user = NULL; const char *auto_key = NULL;
        if (!autologin_done) {
            autologin_done = TRUE;
            if (cfg("autologin-user")) { auto_user = g_strdup(cfg("autologin-user")); auto_key = cfg("autologin-session"); }
            else auto_user = live_user();
        }
        if (auto_user && getpwnam(auto_user)) {
            say("logging %s in automatically", auto_user);
            w = start_worker("paladin-login-autologin", auto_user, NULL, auto_key ? auto_key : cfg("default-session"), FALSE, -1);
            char *k = worker_line(&w, NULL, 20000);
            have = k && !strcmp(k, "ok");
            g_free(k);
            if (!have) { say("automatic login for %s didn't work", auto_user); wait_worker(&w); }
        }
        g_free(auto_user);
        if (!have) have = run_greeter(&w);
        if (have) run_session(&w);
        stop_x();
        fails = 0;
        sleep(1);
    }
    stop_x();
    return 0;
}

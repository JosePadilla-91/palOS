/* paladin-idle: what happens when the computer isn't being used, as set in Settings → Power.

     ~/.config/palos/power.json   {"screenOff": 600, "lock": true, "sleep": 0, "logout": 0}   (seconds; 0 = Never)

     screenOff  the screen turns off after this long (X screen saver + DPMS); 0 keeps it on
     lock       when the screen turns off (and before sleep), ask for the password to come back
     sleep      the computer sleeps after this long; 0 = never
     logout     you're logged out after this long, with a one-minute warning first; 0 = never (the default)

   Changes made in Settings apply within a few seconds. Programs playing video (Firefox, Vid-View…) keep the
   screen on through org.freedesktop.ScreenSaver Inhibit, which this also answers. Started by paladin-session.
   It also reports how the session is used to Parental Controls (palos-parentald) and shows its notices.

     paladin-idle                    watch (the session's)
     paladin-idle lock-if-enabled    lock now if Settings → Power → Lock the Screen is on (asked by paladin-sessiond) */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <sys/stat.h>
#include <gio/gio.h>
#include <json-glib/json-glib.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/extensions/scrnsaver.h>
#include <X11/extensions/dpms.h>
#include "../libpalos/l10n.h"

#define WARN 60
#define LOCK "/usr/lib/paladin-session/paladin-lock"
#define WARNING_SOUND "/usr/share/sounds/palos-ui/stereo/dialog-warning.oga"

typedef struct { int screen_off; gboolean lock; int sleep, logout; } Conf;
static const Conf DEFAULTS = { 600, TRUE, 0, 0 };

static Display *dpy;
static Window root;
static XScreenSaverInfo *ssinfo;
static Conf conf;
static gboolean have_conf;
static time_t conf_mtime = -1;
static int applied = -1;
static gboolean warned, slept;
static double idle_s;
static char *last_notice; static gboolean notice_seen;

/* ---------------------------------------------------------------- small things */
static char *conf_path(void) { return g_build_filename(g_get_user_config_dir(), "palos", "power.json", NULL); }

static void logf_(const char *fmt, ...)
{
    char *dir = g_build_filename(g_get_user_cache_dir(), "paladin-session", NULL), *p = g_build_filename(dir, "session.log", NULL);
    FILE *f = fopen(p, "a");
    if (f) {
        char ts[32]; time_t t = time(NULL); strftime(ts, sizeof ts, "%F %T", localtime(&t));
        fprintf(f, "%s idle: ", ts);
        va_list a; va_start(a, fmt); vfprintf(f, fmt, a); va_end(a);
        fputc('\n', f); fclose(f);
    }
    g_free(p); g_free(dir);
}

static int run(const char *const argv[])
{
    int status = -1;
    g_spawn_sync(NULL, (char **)argv, NULL, G_SPAWN_SEARCH_PATH | G_SPAWN_STDOUT_TO_DEV_NULL | G_SPAWN_STDERR_TO_DEV_NULL, NULL, NULL, NULL, NULL, &status, NULL);
    return status;
}

static void play(const char *sound)
{
    const char *argv[] = { "paplay", sound, NULL };
    g_spawn_async(NULL, (char **)argv, NULL, G_SPAWN_SEARCH_PATH | G_SPAWN_STDOUT_TO_DEV_NULL | G_SPAWN_STDERR_TO_DEV_NULL, NULL, NULL, NULL, NULL);
}

static void notify(const char *urgency, const char *icon, const char *title, const char *body, int ms)
{
    GDBusConnection *bus = g_bus_get_sync(G_BUS_TYPE_SESSION, NULL, NULL);
    if (!bus) return;
    GVariantBuilder hints; g_variant_builder_init(&hints, G_VARIANT_TYPE("a{sv}"));
    g_variant_builder_add(&hints, "{sv}", "urgency", g_variant_new_byte(!strcmp(urgency, "critical") ? 2 : !strcmp(urgency, "low") ? 0 : 1));
    g_dbus_connection_call(bus, "org.freedesktop.Notifications", "/org/freedesktop/Notifications", "org.freedesktop.Notifications", "Notify",
        g_variant_new("(susssasa{sv}i)", "palOS", 0, icon ? icon : "", title, body ? body : "", NULL, &hints, ms),
        NULL, G_DBUS_CALL_FLAGS_NONE, 3000, NULL, NULL, NULL);
    g_object_unref(bus);
}

/* ---------------------------------------------------------------- Settings → Power */
static Conf load(void)
{
    Conf c = DEFAULTS;
    char *p = conf_path();
    JsonParser *jp = json_parser_new();
    if (json_parser_load_from_file(jp, p, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(jp))) {
        JsonObject *o = json_node_get_object(json_parser_get_root(jp));
        if (json_object_has_member(o, "screenOff")) c.screen_off = MAX(0, (int)json_object_get_int_member(o, "screenOff"));
        if (json_object_has_member(o, "lock")) c.lock = json_object_get_boolean_member(o, "lock");
        if (json_object_has_member(o, "sleep")) c.sleep = MAX(0, (int)json_object_get_int_member(o, "sleep"));
        if (json_object_has_member(o, "logout")) c.logout = MAX(0, (int)json_object_get_int_member(o, "logout"));
    } else {
        /* no settings yet: write the defaults so Settings shows them */
        char *dir = g_path_get_dirname(p);
        g_mkdir_with_parents(dir, 0700);
        char *s = g_strdup_printf("{\n \"screenOff\": %d,\n \"lock\": %s,\n \"sleep\": %d,\n \"logout\": %d\n}\n",
                                  c.screen_off, c.lock ? "true" : "false", c.sleep, c.logout);
        g_file_set_contents(p, s, -1, NULL);
        g_free(s); g_free(dir);
    }
    g_object_unref(jp); g_free(p);
    return c;
}

/* ---------------------------------------------------------------- keeping the screen on (org.freedesktop.ScreenSaver) */
typedef struct { guint32 cookie; char *app, *sender; guint watch; } Inhibitor;
static GList *inhibitors;
static guint32 next_cookie = 1;

static void inhibitor_free(Inhibitor *i) { if (i->watch) g_bus_unwatch_name(i->watch); g_free(i->app); g_free(i->sender); g_free(i); }

static void uninhibit(guint32 cookie)
{
    for (GList *l = inhibitors; l; l = l->next) {
        Inhibitor *i = l->data;
        if (i->cookie == cookie) { inhibitors = g_list_delete_link(inhibitors, l); inhibitor_free(i); return; }
    }
}

static void sender_gone(GDBusConnection *c, const char *name, gpointer data)
{
    (void)c; (void)name;
    uninhibit(GPOINTER_TO_UINT(data));
}

static void ss_call(GDBusConnection *c, const char *sender, const char *path, const char *iface, const char *method,
                    GVariant *params, GDBusMethodInvocation *inv, gpointer data)
{
    (void)path; (void)iface; (void)data;
    if (!strcmp(method, "Inhibit")) {
        const char *app, *reason; g_variant_get(params, "(&s&s)", &app, &reason);
        Inhibitor *i = g_new0(Inhibitor, 1);
        i->cookie = next_cookie++; i->app = g_strdup(app); i->sender = g_strdup(sender);
        i->watch = g_bus_watch_name_on_connection(c, sender, G_BUS_NAME_WATCHER_FLAGS_NONE, NULL, sender_gone, GUINT_TO_POINTER(i->cookie), NULL);
        inhibitors = g_list_prepend(inhibitors, i);
        logf_("screen kept on by %s - %s", app, reason);
        g_dbus_method_invocation_return_value(inv, g_variant_new("(u)", i->cookie));
    } else if (!strcmp(method, "UnInhibit")) {
        guint32 cookie; g_variant_get(params, "(u)", &cookie);
        uninhibit(cookie);
        g_dbus_method_invocation_return_value(inv, NULL);
    } else if (!strcmp(method, "GetActive")) g_dbus_method_invocation_return_value(inv, g_variant_new("(b)", FALSE));
    else if (!strcmp(method, "GetSessionIdleTime")) g_dbus_method_invocation_return_value(inv, g_variant_new("(u)", (guint32)idle_s));
    else if (!strcmp(method, "SimulateUserActivity")) { XResetScreenSaver(dpy); XFlush(dpy); g_dbus_method_invocation_return_value(inv, NULL); }
    else g_dbus_method_invocation_return_dbus_error(inv, "org.freedesktop.DBus.Error.UnknownMethod", method);
}

static const char *SS_XML =
    "<node><interface name='org.freedesktop.ScreenSaver'>"
    "<method name='Inhibit'><arg type='s' direction='in'/><arg type='s' direction='in'/><arg type='u' direction='out'/></method>"
    "<method name='UnInhibit'><arg type='u' direction='in'/></method>"
    "<method name='GetActive'><arg type='b' direction='out'/></method>"
    "<method name='GetSessionIdleTime'><arg type='u' direction='out'/></method>"
    "<method name='SimulateUserActivity'/>"
    "</interface></node>";

static void bus_up(GDBusConnection *c, const char *name, gpointer data)
{
    (void)name; (void)data;
    GDBusNodeInfo *info = g_dbus_node_info_new_for_xml(SS_XML, NULL);
    static const GDBusInterfaceVTable vt = { ss_call, NULL, NULL, { 0 } };
    g_dbus_connection_register_object(c, "/org/freedesktop/ScreenSaver", info->interfaces[0], &vt, NULL, NULL, NULL);
    g_dbus_connection_register_object(c, "/ScreenSaver", info->interfaces[0], &vt, NULL, NULL, NULL);
}

/* ---------------------------------------------------------------- the screen saver and DPMS */
static void apply(void)
{
    int s = inhibitors ? 0 : conf.screen_off;
    if (applied == s) return;
    applied = s;
    int dummy;
    if (s > 0) {
        XSetScreenSaver(dpy, s, s, DontPreferBlanking, AllowExposures);
        if (DPMSQueryExtension(dpy, &dummy, &dummy)) { DPMSEnable(dpy); DPMSSetTimeouts(dpy, s, s, s); }
    } else {
        XSetScreenSaver(dpy, 0, 0, DontPreferBlanking, AllowExposures);
        if (DPMSQueryExtension(dpy, &dummy, &dummy)) DPMSDisable(dpy);
    }
    XFlush(dpy);
}

static void reload(void)
{
    char *p = conf_path();
    struct stat st;
    time_t m = stat(p, &st) == 0 ? st.st_mtime : -1;
    g_free(p);
    if (have_conf && m == conf_mtime) return;
    conf = load(); have_conf = TRUE;
    p = conf_path(); conf_mtime = stat(p, &st) == 0 ? st.st_mtime : -1; g_free(p);
    logf_("settings: {\"screenOff\": %d, \"lock\": %s, \"sleep\": %d, \"logout\": %d}", conf.screen_off, conf.lock ? "true" : "false", conf.sleep, conf.logout);
    applied = -1;
    apply();
}

/* ---------------------------------------------------------------- Parental Controls */
static char *front_app(void)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *d = NULL;
    if (XGetWindowProperty(dpy, root, XInternAtom(dpy, "_NET_ACTIVE_WINDOW", False), 0, 1, False, XA_WINDOW, &type, &fmt, &n, &after, &d) != Success || !d || !n) { if (d) XFree(d); return NULL; }
    Window w = *(Window *)d; XFree(d);
    if (!w) return NULL;
    XClassHint ch = { 0 };
    if (!XGetClassHint(dpy, w, &ch)) return NULL;
    char *name = g_strdup(ch.res_class && *ch.res_class ? ch.res_class : ch.res_name ? ch.res_name : "");
    if (ch.res_name) XFree(ch.res_name);
    if (ch.res_class) XFree(ch.res_class);
    static const char *pretty[][2] = { { "firefox", "Firefox" }, { "navigator", "Firefox" }, { "paladin-seeker", "Seeker" }, { "seeker", "Seeker" },
                                       { "kibble", "App" }, { "xterm", "Terminal" }, { "palos-terminal", "Terminal" } };
    for (guint i = 0; i < G_N_ELEMENTS(pretty); i++) if (!g_ascii_strcasecmp(name, pretty[i][0])) { g_free(name); return g_strdup(pretty[i][1]); }
    if (!*name) { g_free(name); return NULL; }
    name[0] = g_ascii_toupper(name[0]);
    return name;
}

static void report(double idle)
{
    char *pc = g_strdup_printf("/etc/palos/parental/%s.json", g_get_user_name());
    gboolean on = g_file_test(pc, G_FILE_TEST_EXISTS);
    g_free(pc);
    if (!on) return;
    char *app = front_app();
    JsonBuilder *b = json_builder_new(); json_builder_begin_object(b);
    json_builder_set_member_name(b, "idle"); json_builder_add_int_value(b, (gint64)idle);
    json_builder_set_member_name(b, "app"); if (app) json_builder_add_string_value(b, app); else json_builder_add_null_value(b);
    json_builder_end_object(b);
    JsonGenerator *g = json_generator_new(); JsonNode *r = json_builder_get_root(b); json_generator_set_root(g, r);
    char *rt = g_strdup(g_get_user_runtime_dir()), *tmp = g_build_filename(rt, "palos-activity.json.tmp", NULL), *dst = g_build_filename(rt, "palos-activity.json", NULL);
    if (json_generator_to_file(g, tmp, NULL)) rename(tmp, dst);
    json_node_unref(r); g_object_unref(g); g_object_unref(b); g_free(app); g_free(rt); g_free(tmp); g_free(dst);

    char *np = g_strdup_printf("/run/palos-parental/notice-%u.json", getuid());
    JsonParser *jp = json_parser_new();
    if (json_parser_load_from_file(jp, np, NULL) && JSON_NODE_HOLDS_OBJECT(json_parser_get_root(jp))) {
        JsonObject *n = json_node_get_object(json_parser_get_root(jp));
        JsonNode *idn = json_object_get_member(n, "id");
        char *id = !idn ? g_strdup("") : json_node_get_value_type(idn) == G_TYPE_STRING ? g_strdup(json_node_get_string(idn))
                                         : g_strdup_printf("%.3f", json_node_get_double(idn));
        if (!last_notice || strcmp(id, last_notice)) {
            gboolean first = !notice_seen;
            notice_seen = TRUE;
            g_free(last_notice); last_notice = g_strdup(id);
            if (!(first && difftime(time(NULL), (time_t)g_ascii_strtod(id, NULL)) > 120)) {   /* an old notice from before this login */
                const char *kind = json_object_get_string_member_with_default(n, "kind", "");
                gboolean urgent = !strcmp(kind, "end") || !strcmp(kind, "warn");
                notify(urgent ? "critical" : "normal", "appointment-soon", json_object_get_string_member_with_default(n, "title", ""),
                       json_object_get_string_member_with_default(n, "body", ""), -1);
                if (urgent) play(WARNING_SOUND);
            }
        }
        g_free(id);
    }
    g_object_unref(jp); g_free(np);
}

/* ---------------------------------------------------------------- every five seconds */
static gboolean tick(gpointer data)
{
    (void)data;
    reload();
    apply();                                  /* an app started or stopped keeping the screen on */
    XScreenSaverQueryInfo(dpy, root, ssinfo);
    double idle = ssinfo->idle / 1000.0;
    idle_s = idle;
    report(idle);
    if (inhibitors) {
        if (idle > 50) { XResetScreenSaver(dpy); XFlush(dpy); }
        warned = FALSE;
        return G_SOURCE_CONTINUE;
    }
    if (idle < 5) {
        slept = FALSE;
        if (warned) { warned = FALSE; notify("low", "", T("Welcome back"), T("You won’t be logged out."), 3000); }
    }
    if (conf.logout > 0) {
        double left = conf.logout - idle;
        if (left <= WARN && !warned) {
            warned = TRUE;
            notify("critical", "system-log-out", T("You’ll be logged out in 1 minute"),
                   T("This computer hasn’t been used for a while. Move the mouse or press a key to stay logged in."), -1);
            play(WARNING_SOUND);
        }
        if (left <= 0) {
            logf_("logging out after %d s without use (Settings → Power → Log Out When Idle)", (int)idle);
            const char *sid = g_getenv("XDG_SESSION_ID");
            if (sid) { const char *a[] = { "loginctl", "terminate-session", sid, NULL }; run(a); }
            else { const char *a[] = { "loginctl", "terminate-user", g_get_user_name(), NULL }; run(a); }
            return G_SOURCE_CONTINUE;
        }
    }
    if (conf.sleep > 0 && idle >= conf.sleep && !slept) {
        slept = TRUE;
        logf_("sleeping after %d s without use", (int)idle);
        const char *a[] = { "systemctl", "suspend", NULL };
        run(a);
    }
    return G_SOURCE_CONTINUE;
}

int main(int argc, char **argv)
{
    if (argc > 1 && (!strcmp(argv[1], "-h") || !strcmp(argv[1], "--help"))) {
        puts("paladin-idle [lock-if-enabled]   (Settings → Power: screen off, lock, sleep, log out when idle)");
        return 0;
    }
    if (argc > 1 && !strcmp(argv[1], "lock-if-enabled")) {
        /* paladin-sessiond asks this when the screen turns off or before sleep */
        if (load().lock) { argv[1] = "paladin-lock"; execv(LOCK, argv + 1); }
        return 0;
    }
    if (!(dpy = XOpenDisplay(NULL))) { logf_("cannot watch for idle time: no X display"); return 1; }
    int ev, er;
    if (!XScreenSaverQueryExtension(dpy, &ev, &er)) { logf_("cannot watch for idle time: no screen saver extension"); return 1; }
    root = DefaultRootWindow(dpy);
    ssinfo = XScreenSaverAllocInfo();
    g_bus_own_name(G_BUS_TYPE_SESSION, "org.freedesktop.ScreenSaver", G_BUS_NAME_OWNER_FLAGS_NONE, bus_up, NULL, NULL, NULL, NULL);
    logf_("watching (screen off, lock, sleep and log out follow Settings → Power)");
    tick(NULL);
    g_timeout_add_seconds(5, tick, NULL);
    g_main_loop_run(g_main_loop_new(NULL, FALSE));
    return 0;
}

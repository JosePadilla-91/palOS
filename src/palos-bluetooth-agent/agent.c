/* palos-bluetooth-agent: answers Bluetooth's pairing questions while Bluetooth Manager isn't open.

   A phone or computer that pairs with this one asks for a number to be confirmed, or a PIN; BlueZ passes the
   question to an "agent". This is that agent for the whole session: it asks in a palOS window (palos-alert).
   Bluetooth Manager takes over while it's open and gives the job back when it closes; when bluetoothd
   (re)starts, this registers again. Questions are asked without holding anything up: the answer goes back
   to BlueZ when the person gives it, and BlueZ's Cancel closes the window. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <gio/gio.h>
#include "../libpalos/l10n.h"

#define BUS "org.bluez"
#define AGENT "/org/palos/bluetooth/helper"

static GDBusConnection *sys;
static GSubprocess *asking;           /* the question window up now (one at a time, like BlueZ asks) */

static const char *XML =
    "<node><interface name='org.bluez.Agent1'>"
    "<method name='Release'/>"
    "<method name='AuthorizeService'><arg type='o' direction='in'/><arg type='s' direction='in'/></method>"
    "<method name='RequestPinCode'><arg type='o' direction='in'/><arg type='s' direction='out'/></method>"
    "<method name='RequestPasskey'><arg type='o' direction='in'/><arg type='u' direction='out'/></method>"
    "<method name='DisplayPasskey'><arg type='o' direction='in'/><arg type='u' direction='in'/><arg type='q' direction='in'/></method>"
    "<method name='DisplayPinCode'><arg type='o' direction='in'/><arg type='s' direction='in'/></method>"
    "<method name='RequestConfirmation'><arg type='o' direction='in'/><arg type='u' direction='in'/></method>"
    "<method name='RequestAuthorization'><arg type='o' direction='in'/></method>"
    "<method name='Cancel'/>"
    "</interface></node>";

/* ---------------------------------------------------------------- devices */
static GVariant *dev_prop(const char *device, const char *name)
{
    GVariant *r = g_dbus_connection_call_sync(sys, BUS, device, "org.freedesktop.DBus.Properties", "Get",
                                              g_variant_new("(ss)", "org.bluez.Device1", name), G_VARIANT_TYPE("(v)"),
                                              G_DBUS_CALL_FLAGS_NONE, 3000, NULL, NULL);
    if (!r) return NULL;
    GVariant *v; g_variant_get(r, "(v)", &v); g_variant_unref(r);
    return v;
}

static char *name_of(const char *device)
{
    GVariant *v = dev_prop(device, "Alias");
    char *n = v && g_variant_is_of_type(v, G_VARIANT_TYPE_STRING) ? g_variant_dup_string(v, NULL) : g_strdup(T("A device"));
    if (v) g_variant_unref(v);
    return n;
}

static gboolean dev_bool(const char *device, const char *name)
{
    GVariant *v = dev_prop(device, name);
    gboolean b = v && g_variant_is_of_type(v, G_VARIANT_TYPE_BOOLEAN) && g_variant_get_boolean(v);
    if (v) g_variant_unref(v);
    return b;
}

static void set_trusted(const char *device)
{
    g_dbus_connection_call(sys, BUS, device, "org.freedesktop.DBus.Properties", "Set",
                           g_variant_new("(ssv)", "org.bluez.Device1", "Trusted", g_variant_new_boolean(TRUE)),
                           NULL, G_DBUS_CALL_FLAGS_NONE, 3000, NULL, NULL, NULL);
}

/* ---------------------------------------------------------------- asking */
typedef enum { Q_ALLOW, Q_PIN, Q_PASSKEY, Q_CONFIRM } Kind;
typedef struct { GDBusMethodInvocation *inv; Kind kind; char *device; } Pending;

static void reject(GDBusMethodInvocation *inv)
{
    g_dbus_method_invocation_return_dbus_error(inv, "org.bluez.Error.Rejected", "Rejected");
}

static void answered(GObject *src, GAsyncResult *res, gpointer data)
{
    Pending *p = data;
    GSubprocess *sp = G_SUBPROCESS(src);
    char *out = NULL;
    g_subprocess_communicate_utf8_finish(sp, res, &out, NULL, NULL);
    gboolean ok = g_subprocess_get_if_exited(sp) && g_subprocess_get_exit_status(sp) == 0;
    if (asking == sp) g_clear_object(&asking);
    char **lines = g_strsplit(out ? out : "", "\n", 3);
    const char *typed = lines[0] && lines[1] ? g_strstrip(lines[1]) : "";
    switch (p->kind) {
    case Q_ALLOW:
        if (ok) g_dbus_method_invocation_return_value(p->inv, NULL); else reject(p->inv);
        break;
    case Q_CONFIRM:
        if (ok) { set_trusted(p->device); g_dbus_method_invocation_return_value(p->inv, NULL); } else reject(p->inv);
        break;
    case Q_PIN:
        if (ok && *typed) {
            char pin[17]; g_strlcpy(pin, typed, sizeof pin);
            set_trusted(p->device);
            g_dbus_method_invocation_return_value(p->inv, g_variant_new("(s)", pin));
        } else reject(p->inv);
        break;
    case Q_PASSKEY: {
        gboolean digits = *typed != 0;
        for (const char *c = typed; *c; c++) if (!isdigit((unsigned char)*c)) digits = FALSE;
        if (ok && digits && strlen(typed) <= 6) {
            set_trusted(p->device);
            g_dbus_method_invocation_return_value(p->inv, g_variant_new("(u)", (guint32)strtoul(typed, NULL, 10)));
        } else reject(p->inv);
        break;
    }
    }
    g_strfreev(lines);
    g_free(out); g_free(p->device); g_free(p);
}

/* a question window; BlueZ gets its answer from answered() */
static void ask(GDBusMethodInvocation *inv, Kind kind, const char *device, const char *heading, const char *text,
                const char *ok, const char *entry)
{
    if (asking) { g_subprocess_force_exit(asking); g_clear_object(&asking); }
    GPtrArray *a = g_ptr_array_new();
    g_ptr_array_add(a, "palos-alert");
    g_ptr_array_add(a, "--title"); g_ptr_array_add(a, (char *)T("Bluetooth"));
    g_ptr_array_add(a, "--icon"); g_ptr_array_add(a, "bluetooth");
    g_ptr_array_add(a, "--heading"); g_ptr_array_add(a, (char *)heading);
    g_ptr_array_add(a, "--text"); g_ptr_array_add(a, (char *)(text ? text : ""));
    if (entry) { g_ptr_array_add(a, "--entry"); g_ptr_array_add(a, (char *)entry); }
    g_ptr_array_add(a, "--button"); g_ptr_array_add(a, (char *)T("Cancel"));
    g_ptr_array_add(a, "--cancel"); g_ptr_array_add(a, (char *)T("Cancel"));
    g_ptr_array_add(a, "--button"); g_ptr_array_add(a, (char *)ok);
    g_ptr_array_add(a, NULL);
    GError *e = NULL;
    GSubprocess *sp = g_subprocess_newv((const char *const *)a->pdata, G_SUBPROCESS_FLAGS_STDOUT_PIPE, &e);
    g_ptr_array_free(a, TRUE);
    if (!sp) { fprintf(stderr, "palos-bluetooth-agent: %s\n", e->message); g_error_free(e); reject(inv); return; }
    Pending *p = g_new0(Pending, 1);
    p->inv = inv; p->kind = kind; p->device = g_strdup(device);
    asking = g_object_ref(sp);
    g_subprocess_communicate_utf8_async(sp, NULL, NULL, answered, p);
    g_object_unref(sp);
}

/* just telling (a number to type on the other device) */
static void tell(const char *heading, const char *text)
{
    if (asking) { g_subprocess_force_exit(asking); g_clear_object(&asking); }
    const char *argv[] = { "palos-alert", "--title", T("Bluetooth"), "--icon", "bluetooth", "--heading", heading, "--text", text, NULL };
    asking = g_subprocess_newv(argv, G_SUBPROCESS_FLAGS_NONE, NULL);
}

static void method(GDBusConnection *c, const char *sender, const char *path, const char *iface, const char *name,
                   GVariant *params, GDBusMethodInvocation *inv, gpointer data)
{
    (void)c; (void)sender; (void)path; (void)iface; (void)data;
    if (!strcmp(name, "Release")) { g_dbus_method_invocation_return_value(inv, NULL); return; }
    if (!strcmp(name, "Cancel")) {
        if (asking) g_subprocess_force_exit(asking);     /* its answer comes back as a "no" */
        g_dbus_method_invocation_return_value(inv, NULL);
        return;
    }
    const char *device = NULL;
    g_variant_get_child(params, 0, "&o", &device);
    char *dev = name_of(device);
    if (!strcmp(name, "AuthorizeService")) {
        if (dev_bool(device, "Paired") || dev_bool(device, "Trusted")) g_dbus_method_invocation_return_value(inv, NULL);
        else { char *h = Tf("Allow “{}” to connect?", dev); ask(inv, Q_ALLOW, device, h, NULL, T("Allow"), NULL); g_free(h); }
    } else if (!strcmp(name, "RequestPinCode")) {
        char *h = Tf("Type the PIN for “{}”", dev);
        ask(inv, Q_PIN, device, h, T("Many devices use 0000 or 1234. The device’s instructions say which."), T("Pair"), "0000");
        g_free(h);
    } else if (!strcmp(name, "RequestPasskey")) {
        char *h = Tf("Type the number shown on “{}”", dev);
        ask(inv, Q_PASSKEY, device, h, NULL, T("Pair"), "");
        g_free(h);
    } else if (!strcmp(name, "DisplayPasskey")) {
        guint32 key; guint16 entered;
        g_variant_get(params, "(&ouq)", NULL, &key, &entered);
        if (entered == 0) {
            char k[8]; g_snprintf(k, sizeof k, "%06u", key);
            char *h = Tf("Type {} on “{}”", k, dev);
            tell(h, T("Then press Enter on it."));
            g_free(h);
        }
        g_dbus_method_invocation_return_value(inv, NULL);
    } else if (!strcmp(name, "DisplayPinCode")) {
        const char *pin; g_variant_get(params, "(&o&s)", NULL, &pin);
        char *h = Tf("Type {} on “{}”", pin, dev);
        tell(h, T("Then press Enter on it."));
        g_free(h);
        g_dbus_method_invocation_return_value(inv, NULL);
    } else if (!strcmp(name, "RequestConfirmation")) {
        guint32 key; g_variant_get(params, "(&ou)", NULL, &key);
        char k[8]; g_snprintf(k, sizeof k, "%06u", key);
        char *h = Tf("Pair with “{}”?", dev), *t = Tf("Check that it shows this number: {}", k);
        ask(inv, Q_CONFIRM, device, h, t, T("Pair"), NULL);
        g_free(h); g_free(t);
    } else if (!strcmp(name, "RequestAuthorization")) {
        char *h = Tf("Pair with “{}”?", dev);
        ask(inv, Q_ALLOW, device, h, NULL, T("Pair"), NULL);
        g_free(h);
    } else g_dbus_method_invocation_return_dbus_error(inv, "org.freedesktop.DBus.Error.UnknownMethod", name);
    g_free(dev);
}

/* ---------------------------------------------------------------- registering with BlueZ */
static gboolean do_register(gpointer data)
{
    (void)data;
    GError *e = NULL;
    GVariant *r = g_dbus_connection_call_sync(sys, BUS, "/org/bluez", "org.bluez.AgentManager1", "UnregisterAgent",
                                              g_variant_new("(o)", AGENT), NULL, G_DBUS_CALL_FLAGS_NONE, 3000, NULL, NULL);
    if (r) g_variant_unref(r);
    r = g_dbus_connection_call_sync(sys, BUS, "/org/bluez", "org.bluez.AgentManager1", "RegisterAgent",
                                    g_variant_new("(os)", AGENT, "KeyboardDisplay"), NULL, G_DBUS_CALL_FLAGS_NONE, 3000, NULL, &e);
    if (r) {
        g_variant_unref(r);
        r = g_dbus_connection_call_sync(sys, BUS, "/org/bluez", "org.bluez.AgentManager1", "RequestDefaultAgent",
                                        g_variant_new("(o)", AGENT), NULL, G_DBUS_CALL_FLAGS_NONE, 3000, NULL, &e);
        if (r) g_variant_unref(r);
    }
    if (e) { fprintf(stderr, "palos-bluetooth-agent: not registered yet: %s\n", e->message); g_error_free(e); }
    return G_SOURCE_REMOVE;
}

static void bluez_appeared(GDBusConnection *c, const char *name, const char *owner, gpointer data)
{
    (void)c; (void)name; (void)owner; (void)data;
    g_timeout_add(500, do_register, NULL);       /* bluetoothd (re)started: register again */
}

int main(void)
{
    const char *st = g_getenv("XDG_SESSION_TYPE");
    if (st && !strcmp(st, "tty")) return 0;
    g_set_prgname("palos-bluetooth");
    GError *e = NULL;
    if (!(sys = g_bus_get_sync(G_BUS_TYPE_SYSTEM, NULL, &e))) { fprintf(stderr, "palos-bluetooth-agent: %s\n", e->message); return 1; }
    GDBusNodeInfo *info = g_dbus_node_info_new_for_xml(XML, NULL);
    static const GDBusInterfaceVTable vt = { method, NULL, NULL, { 0 } };
    if (!g_dbus_connection_register_object(sys, AGENT, info->interfaces[0], &vt, NULL, NULL, &e)) {
        fprintf(stderr, "palos-bluetooth-agent: %s\n", e->message); return 1;
    }
    g_bus_watch_name_on_connection(sys, BUS, G_BUS_NAME_WATCHER_FLAGS_NONE, bluez_appeared, NULL, NULL, NULL);
    g_main_loop_run(g_main_loop_new(NULL, FALSE));
    return 0;
}

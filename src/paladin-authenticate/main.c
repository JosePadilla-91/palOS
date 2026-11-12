/* paladin-authenticate: palOS's password prompt for administrator tasks (the polkit authentication agent).
   When something needs an administrator (installing an app, changing a system setting), polkit asks this
   program; it shows the password sheet, checks the password through polkit, and answers. */
#define _GNU_SOURCE
#define POLKIT_AGENT_I_KNOW_API_IS_SUBJECT_TO_CHANGE
#include <polkitagent/polkitagent.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pwd.h>
#include <grp.h>
#include "dialog.h"
#include "../libpalos/l10n.h"

/* ---------------------------------------------------------------- one request */
typedef struct {
    GTask *task;
    char *message, *cookie;
    GList *users;               /* PolkitIdentity (unix users) who may answer */
    guint user;                 /* the one asked */
    PolkitAgentSession *session;
    Dialog *dialog;
    gboolean cancelled, answered;
    gulong cancel_id;
    int tries;
} Request;

static GQueue waiting = G_QUEUE_INIT;
static Request *current;

static void next_request(void);

static char *user_label(PolkitIdentity *id)
{
    struct passwd *pw = getpwuid(polkit_unix_user_get_uid(POLKIT_UNIX_USER(id)));
    if (!pw) return g_strdup("?");
    char *full = g_strdup(pw->pw_gecos ? pw->pw_gecos : "");
    full[strcspn(full, ",")] = 0;
    char *r = *full ? g_strdup(full) : g_strdup(pw->pw_name);
    g_free(full);
    return r;
}

/* the people who can answer: the person at the computer first, then the other administrators */
static GList *answerers(GList *identities)
{
    GList *out = NULL;
    uid_t me = getuid();
    for (GList *l = identities; l; l = l->next) {
        if (POLKIT_IS_UNIX_USER(l->data)) {
            out = g_list_append(out, g_object_ref(l->data));
        } else if (POLKIT_IS_UNIX_GROUP(l->data)) {
            struct group *g = getgrgid(polkit_unix_group_get_gid(POLKIT_UNIX_GROUP(l->data)));
            for (char **m = g ? g->gr_mem : NULL; m && *m; m++) {
                struct passwd *pw = getpwnam(*m);
                if (pw) out = g_list_append(out, polkit_unix_user_new(pw->pw_uid));
            }
        }
    }
    /* no duplicates; the current person first */
    GList *uniq = NULL;
    for (GList *l = out; l; l = l->next) {
        gboolean dup = FALSE;
        for (GList *u = uniq; u; u = u->next) if (polkit_identity_equal(u->data, l->data)) dup = TRUE;
        if (dup) continue;
        if (polkit_unix_user_get_uid(l->data) == (gint)me) uniq = g_list_prepend(uniq, g_object_ref(l->data));
        else uniq = g_list_append(uniq, g_object_ref(l->data));
    }
    g_list_free_full(out, g_object_unref);
    return uniq;
}

static void finish(Request *r)
{
    if (r->cancel_id) g_cancellable_disconnect(g_task_get_cancellable(r->task), r->cancel_id);
    if (r->session) { g_signal_handlers_disconnect_by_data(r->session, r); g_clear_object(&r->session); }
    if (r->dialog) { dialog_close(r->dialog); r->dialog = NULL; }
    if (r->answered) g_task_return_boolean(r->task, TRUE);
    else g_task_return_new_error(r->task, POLKIT_ERROR, POLKIT_ERROR_CANCELLED, "The password prompt was dismissed");
    g_object_unref(r->task);
    g_list_free_full(r->users, g_object_unref);
    g_free(r->message); g_free(r->cookie);
    g_free(r);
    if (current == r) current = NULL;
    next_request();
}

static void start_session(Request *r);

static void on_completed(PolkitAgentSession *s, gboolean gained, gpointer data)
{
    (void)s;
    Request *r = data;
    if (gained) { r->answered = TRUE; finish(r); return; }
    if (r->cancelled) { finish(r); return; }
    /* the wrong password: say so and ask again */
    r->tries++;
    dialog_set_busy(r->dialog, FALSE);
    dialog_show_error(r->dialog, T("Sorry, that password didn’t work. Try again."));
    start_session(r);
}

static void on_request(PolkitAgentSession *s, const char *prompt, gboolean echo_on, gpointer data)
{
    (void)s; (void)prompt; (void)echo_on;
    Request *r = data;
    dialog_set_busy(r->dialog, FALSE);
    dialog_ask(r->dialog);
}

static void on_show_error(PolkitAgentSession *s, const char *text, gpointer data) { (void)s; dialog_show_error(((Request *)data)->dialog, text); }
static void on_show_info(PolkitAgentSession *s, const char *text, gpointer data) { (void)s; (void)text; (void)data; }

static void start_session(Request *r)
{
    if (r->session) { g_signal_handlers_disconnect_by_data(r->session, r); g_clear_object(&r->session); }
    PolkitIdentity *id = g_list_nth_data(r->users, r->user);
    r->session = polkit_agent_session_new(id, r->cookie);
    g_signal_connect(r->session, "completed", G_CALLBACK(on_completed), r);
    g_signal_connect(r->session, "request", G_CALLBACK(on_request), r);
    g_signal_connect(r->session, "show-error", G_CALLBACK(on_show_error), r);
    g_signal_connect(r->session, "show-info", G_CALLBACK(on_show_info), r);
    polkit_agent_session_initiate(r->session);
}

/* the person typed a password and pressed OK */
static void on_answer(const char *password, gpointer data)
{
    Request *r = data;
    if (!r->session) return;
    dialog_set_busy(r->dialog, TRUE);
    polkit_agent_session_response(r->session, password);
}

static void on_cancel(gpointer data)
{
    Request *r = data;
    r->cancelled = TRUE;
    if (r->session) polkit_agent_session_cancel(r->session);
    else finish(r);
}

static void on_switch_user(guint index, gpointer data)
{
    Request *r = data;
    if (index == r->user || index >= g_list_length(r->users)) return;
    r->user = index;
    char *who = user_label(g_list_nth_data(r->users, index));
    char *sub = Tf("Enter the password for “{}” to allow this.", who);
    dialog_set_detail(r->dialog, sub);
    g_free(sub); g_free(who);
    start_session(r);
}

static gboolean polkit_cancelled_idle(gpointer data)
{
    Request *r = data;
    on_cancel(r);
    return G_SOURCE_REMOVE;
}

static void polkit_cancelled(GCancellable *c, gpointer data) { (void)c; g_idle_add(polkit_cancelled_idle, data); }

static void begin(Request *r)
{
    current = r;
    char *who = user_label(g_list_nth_data(r->users, r->user));
    char *sub = g_list_length(r->users) > 1 || polkit_unix_user_get_uid(g_list_nth_data(r->users, r->user)) != (gint)getuid()
              ? Tf("Enter the password for “{}” to allow this.", who) : g_strdup(T("Enter your password to allow this."));
    GPtrArray *names = g_ptr_array_new_with_free_func(g_free);
    for (GList *l = r->users; l; l = l->next) g_ptr_array_add(names, user_label(l->data));
    DialogCallbacks cb = { on_answer, on_cancel, on_switch_user, r };
    r->dialog = dialog_open(r->message && *r->message ? r->message : T("An app wants to make changes."), sub,
                            (const char *const *)names->pdata, names->len, r->user, &cb);
    g_ptr_array_unref(names);
    g_free(sub); g_free(who);
    if (!r->dialog) { finish(r); return; }
    start_session(r);
}

static void next_request(void)
{
    if (current) return;
    Request *r = g_queue_pop_head(&waiting);
    if (r) begin(r);
}

/* ---------------------------------------------------------------- the agent */
#define PAL_TYPE_AGENT (pal_agent_get_type())
G_DECLARE_FINAL_TYPE(PalAgent, pal_agent, PAL, AGENT, PolkitAgentListener)
struct _PalAgent { PolkitAgentListener parent; };
G_DEFINE_FINAL_TYPE(PalAgent, pal_agent, POLKIT_AGENT_TYPE_LISTENER)

static void agent_initiate(PolkitAgentListener *l, const gchar *action_id, const gchar *message, const gchar *icon_name,
                           PolkitDetails *details, const gchar *cookie, GList *identities, GCancellable *cancellable,
                           GAsyncReadyCallback callback, gpointer user_data)
{
    (void)action_id; (void)icon_name; (void)details;
    Request *r = g_new0(Request, 1);
    r->task = g_task_new(l, cancellable, callback, user_data);
    r->message = g_strdup(message);
    r->cookie = g_strdup(cookie);
    r->users = answerers(identities);
    if (!r->users) {
        g_task_return_new_error(r->task, POLKIT_ERROR, POLKIT_ERROR_FAILED, "Nobody on this computer can allow this");
        g_object_unref(r->task); g_free(r->message); g_free(r->cookie); g_free(r);
        return;
    }
    if (cancellable) r->cancel_id = g_cancellable_connect(cancellable, G_CALLBACK(polkit_cancelled), r, NULL);
    g_queue_push_tail(&waiting, r);
    next_request();
}

static gboolean agent_finish(PolkitAgentListener *l, GAsyncResult *res, GError **error)
{
    (void)l;
    return g_task_propagate_boolean(G_TASK(res), error);
}

static void pal_agent_class_init(PalAgentClass *k)
{
    POLKIT_AGENT_LISTENER_CLASS(k)->initiate_authentication = agent_initiate;
    POLKIT_AGENT_LISTENER_CLASS(k)->initiate_authentication_finish = agent_finish;
}
static void pal_agent_init(PalAgent *a) { (void)a; }

int main(int argc, char **argv)
{
    if (!dialog_init()) { fputs("paladin-authenticate: can't open the display\n", stderr); return 1; }
    GError *err = NULL;
    PolkitSubject *subject;
    /* --process PID: answer only for that process (for trying it out away from a login session) */
    if (argc == 3 && !strcmp(argv[1], "--process")) subject = polkit_unix_process_new_for_owner(atoi(argv[2]), 0, getuid());
    else subject = polkit_unix_session_new_for_process_sync(getpid(), NULL, &err);
    if (!subject) {
        fprintf(stderr, "paladin-authenticate: not in a login session (%s)\n", err ? err->message : "?");
        return 1;
    }
    PolkitAgentListener *agent = g_object_new(PAL_TYPE_AGENT, NULL);
    gpointer handle = polkit_agent_listener_register(agent, POLKIT_AGENT_REGISTER_FLAGS_NONE, subject,
                                                     "/org/palos/Authenticate", NULL, &err);
    if (!handle) {
        fprintf(stderr, "paladin-authenticate: %s\n", err ? err->message : "couldn't register");
        return 1;
    }
    GMainLoop *loop = g_main_loop_new(NULL, FALSE);
    g_main_loop_run(loop);
    polkit_agent_listener_unregister(handle);
    return 0;
}

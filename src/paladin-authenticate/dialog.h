/* paladin-authenticate: the password sheet (X11, drawn with Cairo and Pango in palOS's look). */
#pragma once
#include <glib.h>

typedef struct Dialog Dialog;
typedef struct {
    void (*answer)(const char *password, gpointer data);
    void (*cancel)(gpointer data);
    void (*switch_user)(guint index, gpointer data);
    gpointer data;
} DialogCallbacks;

gboolean dialog_init(void);
Dialog *dialog_open(const char *message, const char *detail, const char *const *users, guint n_users, guint user,
                    const DialogCallbacks *cb);
void dialog_ask(Dialog *d);                         /* ready for the password */
void dialog_set_busy(Dialog *d, gboolean busy);     /* checking it */
void dialog_show_error(Dialog *d, const char *text);
void dialog_set_detail(Dialog *d, const char *text);
void dialog_close(Dialog *d);

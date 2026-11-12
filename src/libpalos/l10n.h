/* palOS's words in C programs: the same dictionaries as the apps (/usr/share/palos/l10n/<language>.json). */
#pragma once
const char *palos_lang(void);                 /* "en-CA", "fr-CA", "de", "zh-TW"… */
const char *T(const char *english);            /* the text in the person's language (or the English) */
char *Tf(const char *english, ...);            /* with {} filled in, in order (g_free the result) */

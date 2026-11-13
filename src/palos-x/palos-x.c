/* palos-x: small things palOS does to the X screen, for scripts and apps.

     palos-x pointer move X Y               put the pointer there
     palos-x pointer where                  X=… Y=…  (shell lines)
     palos-x screen size                    WIDTH=… HEIGHT=…
     palos-x key COMBO...                   press keys as if typed: "ctrl+c", "super+space", "Return"
                                            (X key names; modifiers held by the person are lifted first)
     palos-x type TEXT                      type the text (any characters)
     palos-x window activate|close|minimize|toggle-maximize ID
     palos-x window geometry ID             X=… Y=… WIDTH=… HEIGHT=…  (the window's own area, on the screen)
     palos-x window find TITLE              the ids of windows whose title contains TITLE, one per line
     palos-x viewport X Y                   show that part of the desktop (palOS's screens)
     palos-x numlock on|off
     palos-x wait-compositor [SECONDS]      wait (10 s at most by default) until the compositor runs; exit 1 if it didn't

   Window ids may be decimal or 0x hex. Everything goes through the window manager the usual way
   (EWMH messages), and keys through XTest. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/XKBlib.h>
#include <X11/keysym.h>
#include <X11/extensions/XTest.h>

static Display *dpy;
static Window root;

static Atom A(const char *n) { return XInternAtom(dpy, n, False); }

static void ewmh(Window w, const char *type, long a0, long a1, long a2, long a3)
{
    XEvent e = { 0 };
    e.xclient.type = ClientMessage;
    e.xclient.window = w;
    e.xclient.message_type = A(type);
    e.xclient.format = 32;
    e.xclient.data.l[0] = a0; e.xclient.data.l[1] = a1; e.xclient.data.l[2] = a2; e.xclient.data.l[3] = a3;
    XSendEvent(dpy, root, False, SubstructureRedirectMask | SubstructureNotifyMask, &e);
    XFlush(dpy);
}

static Window parse_id(const char *s) { return (Window)strtoul(s, NULL, 0); }

/* ---------------------------------------------------------------- keys */
static KeySym name_to_sym(const char *n)
{
    static const struct { const char *name; KeySym sym; } alias[] = {
        { "ctrl", XK_Control_L }, { "control", XK_Control_L }, { "alt", XK_Alt_L }, { "shift", XK_Shift_L },
        { "super", XK_Super_L }, { "meta", XK_Meta_L }, { "win", XK_Super_L }, { "cmd", XK_Super_L },
        { "enter", XK_Return }, { "return", XK_Return }, { "esc", XK_Escape }, { "del", XK_Delete },
        { "space", XK_space }, { "tab", XK_Tab }, { "backspace", XK_BackSpace } };
    for (size_t i = 0; i < sizeof alias / sizeof *alias; i++) if (!strcasecmp(n, alias[i].name)) return alias[i].sym;
    KeySym s = XStringToKeysym(n);
    if (s == NoSymbol && strlen(n) == 1) s = (unsigned char)n[0];
    return s;
}

/* the modifier keys the person is holding right now (lifted so they don't change what's sent) */
static int held_modifiers(KeyCode *out, int max)
{
    char keys[32];
    XQueryKeymap(dpy, keys);
    XModifierKeymap *m = XGetModifierMapping(dpy);
    int n = 0;
    for (int i = 0; i < 8 * m->max_keypermod && n < max; i++) {
        KeyCode k = m->modifiermap[i];
        if (k && (keys[k / 8] & (1 << (k % 8)))) out[n++] = k;
    }
    XFreeModifiermap(m);
    return n;
}

/* a keycode for this keysym; *shift when it's on the shifted level. A free keycode is mapped when there's none. */
static KeyCode code_for(KeySym sym, int *shift, KeyCode *scratch)
{
    *shift = 0;
    KeyCode k = XKeysymToKeycode(dpy, sym);
    if (k) {
        if (XkbKeycodeToKeysym(dpy, k, 0, 0) != sym && XkbKeycodeToKeysym(dpy, k, 0, 1) == sym) *shift = 1;
        return k;
    }
    /* borrow a keycode with nothing on it */
    int lo, hi, per;
    XDisplayKeycodes(dpy, &lo, &hi);
    KeySym *map = XGetKeyboardMapping(dpy, (KeyCode)lo, hi - lo + 1, &per);
    for (int c = hi; c >= lo; c--) {
        int empty = 1;
        for (int j = 0; j < per; j++) if (map[(c - lo) * per + j] != NoSymbol) { empty = 0; break; }
        if (empty) {
            KeySym syms[2] = { sym, sym };
            XChangeKeyboardMapping(dpy, c, 2, syms, 1);
            XSync(dpy, False);
            *scratch = (KeyCode)c;
            XFree(map);
            return (KeyCode)c;
        }
    }
    XFree(map);
    return 0;
}

static void release_scratch(KeyCode c)
{
    if (!c) return;
    KeySym none[2] = { NoSymbol, NoSymbol };
    XChangeKeyboardMapping(dpy, c, 2, none, 1);
    XSync(dpy, False);
}

static void tap(KeyCode k, int shift)
{
    KeyCode sh = XKeysymToKeycode(dpy, XK_Shift_L);
    if (shift) XTestFakeKeyEvent(dpy, sh, True, 0);
    XTestFakeKeyEvent(dpy, k, True, 0);
    XTestFakeKeyEvent(dpy, k, False, 0);
    if (shift) XTestFakeKeyEvent(dpy, sh, False, 0);
    XSync(dpy, False);
    usleep(8000);
}

static int key_combo(const char *combo)
{
    char *s = strdup(combo), *save = NULL;
    KeyCode codes[8]; int shifts[8], n = 0; KeyCode scratch = 0;
    for (char *t = strtok_r(s, "+", &save); t && n < 8; t = strtok_r(NULL, "+", &save)) {
        KeySym sym = name_to_sym(t);
        if (sym == NoSymbol) { fprintf(stderr, "palos-x: what key is \"%s\"?\n", t); free(s); return 1; }
        codes[n] = code_for(sym, &shifts[n], &scratch);
        if (!codes[n]) { free(s); return 1; }
        n++;
    }
    free(s);
    /* the last one may need Shift for its symbol; the others are pressed as they are */
    KeyCode sh = XKeysymToKeycode(dpy, XK_Shift_L);
    if (n && shifts[n - 1]) XTestFakeKeyEvent(dpy, sh, True, 0);
    for (int i = 0; i < n; i++) XTestFakeKeyEvent(dpy, codes[i], True, 0);
    for (int i = n - 1; i >= 0; i--) XTestFakeKeyEvent(dpy, codes[i], False, 0);
    if (n && shifts[n - 1]) XTestFakeKeyEvent(dpy, sh, False, 0);
    XSync(dpy, False);
    usleep(8000);
    release_scratch(scratch);
    return 0;
}

static int type_text(const char *text)
{
    const unsigned char *p = (const unsigned char *)text;
    while (*p) {
        unsigned cp; int len;
        if (*p < 0x80) { cp = *p; len = 1; }
        else if ((*p & 0xE0) == 0xC0) { cp = *p & 0x1F; len = 2; }
        else if ((*p & 0xF0) == 0xE0) { cp = *p & 0x0F; len = 3; }
        else { cp = *p & 0x07; len = 4; }
        for (int i = 1; i < len; i++) { if (!p[i]) return 1; cp = cp << 6 | (p[i] & 0x3F); }
        p += len;
        KeySym sym = cp == '\n' ? XK_Return : cp == '\t' ? XK_Tab : cp < 0x100 ? cp : 0x01000000 + cp;
        int shift; KeyCode scratch = 0;
        KeyCode k = code_for(sym, &shift, &scratch);
        if (k) tap(k, shift);
        release_scratch(scratch);
    }
    return 0;
}

/* ---------------------------------------------------------------- windows */
static char *title_of(Window w)
{
    Atom type; int fmt; unsigned long n, after; unsigned char *d = NULL;
    if (XGetWindowProperty(dpy, w, A("_NET_WM_NAME"), 0, 1024, False, A("UTF8_STRING"), &type, &fmt, &n, &after, &d) == Success && d && n)
        return (char *)d;
    if (d) XFree(d);
    char *name = NULL;
    if (XFetchName(dpy, w, &name) && name) return name;
    return NULL;
}

static int window_cmd(const char *what, const char *arg)
{
    if (!strcmp(what, "find")) {
        Atom type; int fmt; unsigned long n, after; unsigned char *d = NULL;
        if (XGetWindowProperty(dpy, root, A("_NET_CLIENT_LIST"), 0, 4096, False, XA_WINDOW, &type, &fmt, &n, &after, &d) != Success || !d) return 1;
        int found = 0;
        for (unsigned long i = 0; i < n; i++) {
            Window w = ((Window *)d)[i];
            char *t = title_of(w);
            if (t && strstr(t, arg)) { printf("0x%08lx\n", w); found = 1; }
            if (t) XFree(t);
        }
        XFree(d);
        return found ? 0 : 1;
    }
    Window w = parse_id(arg);
    if (!w) return 2;
    if (!strcmp(what, "activate")) ewmh(w, "_NET_ACTIVE_WINDOW", 2, CurrentTime, 0, 0);
    else if (!strcmp(what, "close")) ewmh(w, "_NET_CLOSE_WINDOW", CurrentTime, 2, 0, 0);
    else if (!strcmp(what, "minimize")) { XIconifyWindow(dpy, w, DefaultScreen(dpy)); XFlush(dpy); }
    else if (!strcmp(what, "toggle-maximize")) ewmh(w, "_NET_WM_STATE", 2, A("_NET_WM_STATE_MAXIMIZED_VERT"), A("_NET_WM_STATE_MAXIMIZED_HORZ"), 2);
    else if (!strcmp(what, "geometry")) {
        XWindowAttributes a; Window child; int x, y;
        if (!XGetWindowAttributes(dpy, w, &a)) return 1;
        XTranslateCoordinates(dpy, w, root, 0, 0, &x, &y, &child);
        printf("WINDOW=%lu\nX=%d\nY=%d\nWIDTH=%d\nHEIGHT=%d\nSCREEN=0\n", w, x, y, a.width, a.height);
    } else return 2;
    return 0;
}

static int numlock(int on)
{
    unsigned int mask = XkbKeysymToModifiers(dpy, XK_Num_Lock);
    if (!mask) return 1;
    XkbLockModifiers(dpy, XkbUseCoreKbd, mask, on ? mask : 0);
    XFlush(dpy);
    return 0;
}

static int x_error(Display *d, XErrorEvent *e) { (void)d; (void)e; return 0; }   /* a window gone already: nothing to do */

int main(int argc, char **argv)
{
    if (argc < 2 || !strcmp(argv[1], "-h") || !strcmp(argv[1], "--help")) {
        fputs("palos-x pointer move X Y | pointer where | screen size | key COMBO... | type TEXT |\n"
              "        window activate|close|minimize|toggle-maximize|geometry ID | window find TITLE |\n"
              "        viewport X Y | numlock on|off | wait-compositor [SECONDS]\n", argc < 2 ? stderr : stdout);
        return argc < 2 ? 2 : 0;
    }
    if (!(dpy = XOpenDisplay(NULL))) { fputs("palos-x: no display\n", stderr); return 3; }
    XSetErrorHandler(x_error);
    root = DefaultRootWindow(dpy);
    const char *c = argv[1];
    if (!strcmp(c, "pointer") && argc == 5 && !strcmp(argv[2], "move")) { XWarpPointer(dpy, None, root, 0, 0, 0, 0, atoi(argv[3]), atoi(argv[4])); XFlush(dpy); return 0; }
    if (!strcmp(c, "pointer") && argc == 3 && !strcmp(argv[2], "where")) {
        Window r, ch; int x, y, wx, wy; unsigned int m;
        XQueryPointer(dpy, root, &r, &ch, &x, &y, &wx, &wy, &m);
        printf("X=%d\nY=%d\n", x, y);
        return 0;
    }
    if (!strcmp(c, "screen") && argc == 3 && !strcmp(argv[2], "size")) {
        printf("WIDTH=%d\nHEIGHT=%d\n", DisplayWidth(dpy, DefaultScreen(dpy)), DisplayHeight(dpy, DefaultScreen(dpy)));
        return 0;
    }
    if (!strcmp(c, "key") && argc >= 3) {
        KeyCode held[16]; int nh = held_modifiers(held, 16);
        for (int i = 0; i < nh; i++) XTestFakeKeyEvent(dpy, held[i], False, 0);
        int rc = 0;
        for (int i = 2; i < argc; i++) rc |= key_combo(argv[i]);
        for (int i = 0; i < nh; i++) XTestFakeKeyEvent(dpy, held[i], True, 0);
        XSync(dpy, False);
        return rc;
    }
    if (!strcmp(c, "type") && argc >= 3) {
        KeyCode held[16]; int nh = held_modifiers(held, 16);
        for (int i = 0; i < nh; i++) XTestFakeKeyEvent(dpy, held[i], False, 0);
        int rc = type_text(argv[2]);
        for (int i = 0; i < nh; i++) XTestFakeKeyEvent(dpy, held[i], True, 0);
        XSync(dpy, False);
        return rc;
    }
    if (!strcmp(c, "window") && argc == 4) return window_cmd(argv[2], argv[3]);
    if (!strcmp(c, "viewport") && argc == 4) { ewmh(root, "_NET_DESKTOP_VIEWPORT", atol(argv[2]), atol(argv[3]), 0, 0); return 0; }
    if (!strcmp(c, "numlock") && argc == 3) return numlock(!strcmp(argv[2], "on"));
    if (!strcmp(c, "wait-compositor")) {
        char sel[32]; snprintf(sel, sizeof sel, "_NET_WM_CM_S%d", DefaultScreen(dpy));
        Atom a = A(sel);
        int tenths = (argc >= 3 ? atoi(argv[2]) : 10) * 10;
        for (int i = 0; i <= tenths; i++) { if (XGetSelectionOwner(dpy, a) != None) return 0; usleep(100000); }
        return 1;
    }
    fprintf(stderr, "palos-x: what is \"%s\"? (palos-x --help)\n", c);
    return 2;
}

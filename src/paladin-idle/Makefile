# paladin-idle: screen off, lock, sleep and log out when idle (Settings → Power); org.freedesktop.ScreenSaver
PREFIX ?= /usr
PKGS    = gio-2.0 json-glib-1.0 x11 xscrnsaver xext
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra -Wno-unused-parameter $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS))
OBJS    = idle.o l10n.o
paladin-idle: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)
l10n.o: ../libpalos/l10n.c ../libpalos/l10n.h
	$(CC) $(CFLAGS) -c -o $@ $<
idle.o: ../libpalos/l10n.h
install: paladin-idle
	install -Dm755 paladin-idle $(DESTDIR)$(PREFIX)/lib/paladin-session/paladin-idle
clean:
	rm -f paladin-idle $(OBJS)
.PHONY: install clean

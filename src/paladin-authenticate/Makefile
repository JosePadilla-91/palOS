# paladin-authenticate: palOS's password prompt for administrator tasks
PREFIX ?= /usr
PKGS    = polkit-agent-1 x11 xcursor cairo cairo-xlib pangocairo json-glib-1.0
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS)) -lm
OBJS    = main.o dialog.o l10n.o

paladin-authenticate: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)
l10n.o: ../libpalos/l10n.c ../libpalos/l10n.h
	$(CC) $(CFLAGS) -c -o $@ $<
main.o dialog.o: dialog.h ../libpalos/l10n.h

install: paladin-authenticate
	install -Dm755 paladin-authenticate $(DESTDIR)$(PREFIX)/lib/paladin-authenticate/paladin-authenticate
	install -Dm644 shield.png $(DESTDIR)$(PREFIX)/share/palos/authenticate/shield.png

clean:
	rm -f paladin-authenticate $(OBJS)
.PHONY: install clean

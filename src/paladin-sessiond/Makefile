# paladin-sessiond: palOS's session service (notifications, keys)
PREFIX ?= /usr
PKGS    = gio-2.0 x11 cairo cairo-xlib pangocairo json-glib-1.0
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS)) -lm
OBJS    = sessiond.o l10n.o

paladin-sessiond: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)
l10n.o: ../libpalos/l10n.c ../libpalos/l10n.h
	$(CC) $(CFLAGS) -c -o $@ $<

install: paladin-sessiond
	install -Dm755 paladin-sessiond $(DESTDIR)$(PREFIX)/lib/paladin-session/paladin-sessiond
	install -Dm644 keys.conf $(DESTDIR)/etc/paladin-session/keys.conf
clean:
	rm -f paladin-sessiond $(OBJS)
.PHONY: install clean

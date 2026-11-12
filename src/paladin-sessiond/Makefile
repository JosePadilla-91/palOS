# paladin-sessiond: palOS's session service (notifications, keys)
PREFIX ?= /usr
PKGS    = gio-2.0 gio-unix-2.0 x11 xscrnsaver cairo cairo-xlib pangocairo json-glib-1.0
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS)) -lm
OBJS    = sessiond.o l10n.o

all: paladin-sessiond paladin-locker
paladin-sessiond: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)
paladin-locker: locker.o l10n.o
	$(CC) $(LDFLAGS) -o $@ locker.o l10n.o $(LDLIBS) -lpam
l10n.o: ../libpalos/l10n.c ../libpalos/l10n.h
	$(CC) $(CFLAGS) -c -o $@ $<

install: all
	install -Dm755 paladin-sessiond $(DESTDIR)$(PREFIX)/lib/paladin-session/paladin-sessiond
	install -Dm755 paladin-locker $(DESTDIR)$(PREFIX)/lib/paladin-session/paladin-locker
	install -Dm644 paladin-lock.pam $(DESTDIR)/etc/pam.d/paladin-lock
	install -Dm644 keys.conf $(DESTDIR)/etc/paladin-session/keys.conf
clean:
	rm -f paladin-sessiond paladin-locker locker.o $(OBJS)
.PHONY: all install clean

# palos-basic-setup: the plain first-account screen (when the full setup screen can't run)
PREFIX ?= /usr
PKGS    = x11 xcursor cairo cairo-xlib pangocairo glib-2.0 json-glib-1.0
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS)) -lm
OBJS    = basic-setup.o l10n.o

basic-setup: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)
l10n.o: ../libpalos/l10n.c ../libpalos/l10n.h
	$(CC) $(CFLAGS) -c -o $@ $<
basic-setup.o: ../libpalos/l10n.h

install: basic-setup
	install -Dm755 basic-setup $(DESTDIR)$(PREFIX)/lib/palos-firstboot/basic-setup

clean:
	rm -f basic-setup $(OBJS)
.PHONY: install clean

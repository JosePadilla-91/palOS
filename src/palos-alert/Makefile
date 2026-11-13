# palos-alert: palOS's own question and progress windows
PREFIX ?= /usr
PKGS    = x11 xcursor cairo cairo-xlib pangocairo glib-2.0 json-glib-1.0
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS)) -lm
OBJS    = alert.o l10n.o

palos-alert: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)
l10n.o: ../libpalos/l10n.c ../libpalos/l10n.h
	$(CC) $(CFLAGS) -c -o $@ $<
alert.o: ../libpalos/l10n.h

install: palos-alert
	install -Dm755 palos-alert $(DESTDIR)$(PREFIX)/bin/palos-alert

clean:
	rm -f palos-alert $(OBJS)
.PHONY: install clean

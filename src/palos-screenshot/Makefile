# palos-screenshot: pictures and recordings of the screen
PREFIX ?= /usr
PKGS    = x11 xfixes xcursor cairo cairo-xlib pangocairo json-glib-1.0 gio-unix-2.0 gstreamer-1.0
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS)) -lm
OBJS    = screenshot.o l10n.o

palos-screenshot: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)
l10n.o: ../libpalos/l10n.c ../libpalos/l10n.h
	$(CC) $(CFLAGS) -c -o $@ $<
screenshot.o: ../libpalos/l10n.h

install: palos-screenshot
	install -Dm755 palos-screenshot $(DESTDIR)$(PREFIX)/bin/palos-screenshot

clean:
	rm -f palos-screenshot $(OBJS)
.PHONY: install clean

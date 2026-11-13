# palos-screen-reader: speaks what's on screen (AT-SPI + speech-dispatcher)
PREFIX ?= /usr
PKGS    = atspi-2 speech-dispatcher gio-2.0 json-glib-1.0 x11 xi
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra -Wno-unused-parameter $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS)) -lm
OBJS    = reader.o l10n.o
palos-screen-reader: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)
l10n.o: ../libpalos/l10n.c ../libpalos/l10n.h
	$(CC) $(CFLAGS) -c -o $@ $<
reader.o: ../libpalos/l10n.h
install: palos-screen-reader
	install -Dm755 palos-screen-reader $(DESTDIR)$(PREFIX)/lib/palos-screen-reader/palos-screen-reader
clean:
	rm -f palos-screen-reader $(OBJS)
.PHONY: install clean

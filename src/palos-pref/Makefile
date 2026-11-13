# palos-pref: palOS's settings (~/.config/palos/settings.json over /etc/palos and /usr/share/palos)
PREFIX ?= /usr
PKGS    = gio-2.0 json-glib-1.0
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS))
palos-pref: pref.c
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)
install: palos-pref
	install -Dm755 palos-pref $(DESTDIR)$(PREFIX)/bin/palos-pref
clean:
	rm -f palos-pref
.PHONY: install clean

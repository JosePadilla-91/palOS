# palos-update: whole-system image updates (signed manifest on GitHub Releases of the updates-only repo)
PREFIX ?= /usr
PKGS    = glib-2.0 json-glib-1.0 libcurl libcrypto
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra -Wno-format-truncation $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS))
palos-update: update.c
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)
install: palos-update
	install -Dm755 palos-update $(DESTDIR)$(PREFIX)/sbin/palos-update
clean:
	rm -f palos-update
.PHONY: install clean

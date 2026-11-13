# paladin-portal: palOS's desktop portal (Open/Save sheet, Settings)
PREFIX ?= /usr
PKGS    = gio-2.0 gio-unix-2.0 json-glib-1.0 x11
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS))
paladin-portal: portal.c
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)
install: paladin-portal
	install -Dm755 paladin-portal $(DESTDIR)$(PREFIX)/lib/paladin-portal/paladin-portal
clean:
	rm -f paladin-portal
.PHONY: install clean

# paladin-xembed-tray: old-style (XEmbed) tray icons shown as menu bar tray items (StatusNotifierItem)
PREFIX ?= /usr
PKGS    = gio-2.0 x11 xcomposite xtst
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS))
xembed-tray: tray.c
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)
install: xembed-tray
	install -Dm755 xembed-tray $(DESTDIR)$(PREFIX)/lib/paladin-session/xembed-tray
clean:
	rm -f xembed-tray
.PHONY: install clean

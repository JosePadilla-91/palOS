# palos-x: pointer, keys, windows, screens and Num Lock from scripts (replaces xdotool, wmctrl, numlockx)
PREFIX ?= /usr
PKGS    = x11 xtst
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS))
palos-x: palos-x.c
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)
install: palos-x
	install -Dm755 palos-x $(DESTDIR)$(PREFIX)/bin/palos-x
clean:
	rm -f palos-x
.PHONY: install clean

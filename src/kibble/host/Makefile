# kibble-host: Kibble's windows (WebKit pages on palOS's desktop)
# Built against Kibble's web engine (build/webkit), installed under /usr/lib/kibble/webkit:
#   make WEBKIT=/path/to/staged/usr/lib/kibble/webkit
WEBKIT  ?= /usr/lib/kibble/webkit
PREFIX  ?= /usr/lib/kibble
export PKG_CONFIG_PATH := $(WEBKIT)/lib/pkgconfig:$(PKG_CONFIG_PATH)
PKGS     = wpe-webkit-2.0 wpe-platform-2.0 json-glib-1.0 x11 xext x11-xcb xcb xcb-dri3 xcb-present xcursor xfixes xi \
           xkbcommon xkbcommon-x11 libdrm epoxy
CFLAGS  ?= -O2 -g
CFLAGS  += -std=gnu11 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers $(shell pkg-config --cflags $(PKGS))
LDLIBS  += $(shell pkg-config --libs $(PKGS))
# finds its engine next to it, wherever Kibble is installed
LDFLAGS += -Wl,-rpath,'$$ORIGIN/../webkit/lib' -Wl,--as-needed

OBJS = host.o display.o toplevel.o view.o clipboard.o dnd.o

kibble-host: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)

$(OBJS): paladin.h

install: kibble-host
	install -Dm755 kibble-host $(DESTDIR)$(PREFIX)/bin/kibble-host

clean:
	rm -f kibble-host $(OBJS)

.PHONY: install clean

# paladin-wm: palOS's window manager and compositor
PREFIX  ?= /usr
KIT_DIR ?= /usr/lib/paladium/assets
PKGS     = x11 xext xcomposite xdamage xfixes xcursor gl cairo cairo-xlib pangocairo
CFLAGS  ?= -O2 -g
CFLAGS  += -std=gnu11 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers \
           -DKIT_DIR='"$(KIT_DIR)"' $(shell pkg-config --cflags $(PKGS))
LDLIBS  += $(shell pkg-config --libs $(PKGS)) -lm

OBJS = main.o client.o deco.o comp.o

paladin-wm: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)

$(OBJS): pwm.h

install: paladin-wm
	install -Dm755 paladin-wm $(DESTDIR)$(PREFIX)/bin/paladin-wm

clean:
	rm -f paladin-wm $(OBJS)

.PHONY: install clean

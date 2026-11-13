# paladin-login: palOS's login manager (X server, login screen, PAM, sessions)
PREFIX ?= /usr
PKGS    = glib-2.0 json-glib-1.0
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS)) -lpam
paladin-login: login.c
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)
install: paladin-login
	install -Dm755 paladin-login $(DESTDIR)$(PREFIX)/sbin/paladin-login
	install -Dm755 session-wrapper $(DESTDIR)$(PREFIX)/lib/paladin-login/session-wrapper
clean:
	rm -f paladin-login
.PHONY: install clean

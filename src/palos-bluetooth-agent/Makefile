# palos-bluetooth-agent: answers Bluetooth's pairing questions (with palos-alert)
PREFIX ?= /usr
PKGS    = gio-2.0 json-glib-1.0
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS))
OBJS    = agent.o l10n.o

palos-bluetooth-agent: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)
l10n.o: ../libpalos/l10n.c ../libpalos/l10n.h
	$(CC) $(CFLAGS) -c -o $@ $<
agent.o: ../libpalos/l10n.h

install: palos-bluetooth-agent
	install -Dm755 palos-bluetooth-agent $(DESTDIR)$(PREFIX)/lib/palos-bluetooth/palos-bluetooth-agent

clean:
	rm -f palos-bluetooth-agent $(OBJS)
.PHONY: install clean

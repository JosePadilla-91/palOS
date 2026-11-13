# kibble-image: pictures for Kibble (decode, convert, encode, screen capture)
PREFIX ?= /usr/lib/kibble
PKGS    = gstreamer-1.0 gstreamer-app-1.0 x11 libjpeg libpng libtiff-4 libwebp libheif libexif libjxl
CFLAGS ?= -O2 -g
CFLAGS += -std=gnu11 -Wall -Wextra $(shell pkg-config --cflags $(PKGS))
LDLIBS += $(shell pkg-config --libs $(PKGS))
kibble-image: kibble-image.c formats.c formats.h
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ kibble-image.c formats.c $(LDLIBS)
install: kibble-image
	install -Dm755 kibble-image $(DESTDIR)$(PREFIX)/bin/kibble-image
clean:
	rm -f kibble-image
.PHONY: install clean

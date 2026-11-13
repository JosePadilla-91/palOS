/* kibble-image: reading pictures without a toolkit (formats.c) */
#pragma once
#include <glib.h>
typedef struct { int w, h; guint8 *px; } Image;     /* straight-alpha RGBA, rows packed */
Image *image_read_bytes(const guint8 *data, size_t len, const char *name);   /* NULL: not a format read here */
Image *image_orient(Image *im, int exif_orientation);
Image *image_fit(Image *im, int size);               /* no bigger than size×size (area average) */
gboolean image_write_png(Image *im, const char *path, int level);
void image_free(Image *im);

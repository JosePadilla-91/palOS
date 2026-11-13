/* kibble-image: pictures for Kibble's nativeImage and desktopCapturer (Electron's image API).
     kibble-image decode FILE|-            any picture GStreamer can read -> "W H\n" + RGBA (straight alpha)
     kibble-image encode png|jpeg Q W H    RGBA on stdin -> the encoded picture on stdout
     kibble-image screen                   the whole screen -> "W H\n" + RGBA                                 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <gst/gst.h>
#include <gst/app/gstappsink.h>
#include <gst/app/gstappsrc.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>

static int write_all(const void *p, size_t n)
{
    const char *c = p;
    while (n) { ssize_t w = write(1, c, n); if (w <= 0) return -1; c += w; n -= (size_t)w; }
    return 0;
}

static GstSample *pull(GstElement *pipe, GstElement *sink)
{
    gst_element_set_state(pipe, GST_STATE_PLAYING);
    GstSample *s = gst_app_sink_try_pull_sample(GST_APP_SINK(sink), 20 * GST_SECOND);
    if (!s) {
        GstMessage *m = gst_bus_timed_pop_filtered(gst_element_get_bus(pipe), 0, GST_MESSAGE_ERROR);
        if (m) { GError *e; gst_message_parse_error(m, &e, NULL); fprintf(stderr, "kibble-image: %s\n", e->message); g_error_free(e); gst_message_unref(m); }
    }
    return s;
}

static int decode(const char *file)
{
    char *desc = strcmp(file, "-")
        ? g_strdup_printf("filesrc name=src ! decodebin ! videoconvert ! video/x-raw,format=RGBA ! appsink name=sink sync=false")
        : g_strdup("fdsrc fd=0 ! decodebin ! videoconvert ! video/x-raw,format=RGBA ! appsink name=sink sync=false");
    GError *err = NULL;
    GstElement *pipe = gst_parse_launch(desc, &err);
    g_free(desc);
    if (!pipe) { fprintf(stderr, "kibble-image: %s\n", err->message); return 1; }
    GstElement *src = gst_bin_get_by_name(GST_BIN(pipe), "src");
    if (src) { g_object_set(src, "location", file, NULL); gst_object_unref(src); }
    GstElement *sink = gst_bin_get_by_name(GST_BIN(pipe), "sink");
    GstSample *s = pull(pipe, sink);
    int rc = 1;
    if (s) {
        GstCaps *caps = gst_sample_get_caps(s);
        GstStructure *st = gst_caps_get_structure(caps, 0);
        int w = 0, h = 0;
        gst_structure_get_int(st, "width", &w); gst_structure_get_int(st, "height", &h);
        GstBuffer *b = gst_sample_get_buffer(s);
        GstMapInfo m;
        if (w > 0 && h > 0 && gst_buffer_map(b, &m, GST_MAP_READ)) {
            size_t stride = m.size / (size_t)h;          /* rows may be padded */
            char head[64]; int n = snprintf(head, sizeof head, "%d %d\n", w, h);
            write_all(head, (size_t)n);
            for (int y = 0; y < h; y++) write_all(m.data + (size_t)y * stride, (size_t)w * 4);
            gst_buffer_unmap(b, &m);
            rc = 0;
        }
        gst_sample_unref(s);
    }
    gst_element_set_state(pipe, GST_STATE_NULL);
    gst_object_unref(sink); gst_object_unref(pipe);
    return rc;
}

static int encode(const char *kind, int quality, int w, int h)
{
    size_t size = (size_t)w * h * 4;
    guint8 *px = g_malloc(size);
    size_t got = 0;
    while (got < size) { ssize_t r = read(0, px + got, size - got); if (r <= 0) break; got += (size_t)r; }
    if (got < size) { fputs("kibble-image: not enough pixels\n", stderr); return 1; }
    char *desc = g_strdup_printf("appsrc name=src ! videoconvert ! %s ! appsink name=sink sync=false",
                                 !strcmp(kind, "jpeg") ? g_strdup_printf("jpegenc quality=%d", quality) : "pngenc compression-level=6");
    GError *err = NULL;
    GstElement *pipe = gst_parse_launch(desc, &err);
    if (!pipe) { fprintf(stderr, "kibble-image: %s\n", err->message); return 1; }
    GstElement *src = gst_bin_get_by_name(GST_BIN(pipe), "src"), *sink = gst_bin_get_by_name(GST_BIN(pipe), "sink");
    GstCaps *caps = gst_caps_new_simple("video/x-raw", "format", G_TYPE_STRING, "RGBA", "width", G_TYPE_INT, w, "height", G_TYPE_INT, h,
                                        "framerate", GST_TYPE_FRACTION, 0, 1, NULL);
    g_object_set(src, "caps", caps, "format", GST_FORMAT_TIME, NULL);
    gst_caps_unref(caps);
    gst_element_set_state(pipe, GST_STATE_PLAYING);
    gst_app_src_push_buffer(GST_APP_SRC(src), gst_buffer_new_wrapped(px, size));
    gst_app_src_end_of_stream(GST_APP_SRC(src));
    GstSample *s = gst_app_sink_try_pull_sample(GST_APP_SINK(sink), 20 * GST_SECOND);
    int rc = 1;
    if (s) {
        GstMapInfo m; GstBuffer *b = gst_sample_get_buffer(s);
        if (gst_buffer_map(b, &m, GST_MAP_READ)) { write_all(m.data, m.size); gst_buffer_unmap(b, &m); rc = 0; }
        gst_sample_unref(s);
    }
    gst_element_set_state(pipe, GST_STATE_NULL);
    gst_object_unref(src); gst_object_unref(sink); gst_object_unref(pipe);
    return rc;
}

static int screen(void)
{
    Display *dpy = XOpenDisplay(NULL);
    if (!dpy) return 1;
    Window root = DefaultRootWindow(dpy);
    XWindowAttributes a; XGetWindowAttributes(dpy, root, &a);
    XImage *img = XGetImage(dpy, root, 0, 0, a.width, a.height, AllPlanes, ZPixmap);
    if (!img) return 1;
    char head[64]; int n = snprintf(head, sizeof head, "%d %d\n", a.width, a.height);
    write_all(head, (size_t)n);
    guint8 *row = g_malloc((size_t)a.width * 4);
    for (int y = 0; y < a.height; y++) {
        for (int x = 0; x < a.width; x++) {
            unsigned long p = XGetPixel(img, x, y);
            row[4 * x] = (p >> 16) & 0xff; row[4 * x + 1] = (p >> 8) & 0xff; row[4 * x + 2] = p & 0xff; row[4 * x + 3] = 0xff;
        }
        write_all(row, (size_t)a.width * 4);
    }
    return 0;
}

int main(int argc, char **argv)
{
    if (argc >= 2 && !strcmp(argv[1], "screen")) return screen();
    gst_init(NULL, NULL);
    if (argc == 3 && !strcmp(argv[1], "decode")) return decode(argv[2]);
    if (argc == 6 && !strcmp(argv[1], "encode")) return encode(argv[2], atoi(argv[3]), atoi(argv[4]), atoi(argv[5]));
    fputs("kibble-image decode FILE|- | encode png|jpeg QUALITY W H | screen\n", stderr);
    return 2;
}

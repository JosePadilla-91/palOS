/* kibble-image: reading pictures without a toolkit. Each reader gives straight-alpha RGBA, turned the right
   way up when the file says how the camera was held. JPEG, PNG, TIFF, WebP, HEIC/AVIF and JPEG XL use their
   format libraries; GIF (first frame), BMP, PNM and TGA are read here. Anything else: NULL (the caller may
   try GStreamer). */
#define _GNU_SOURCE
#include "formats.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <setjmp.h>
#include <unistd.h>
#include <glib.h>
#include <jpeglib.h>
#include <png.h>
#include <tiffio.h>
#include <webp/decode.h>
#include <libheif/heif.h>
#include <libexif/exif-data.h>
#include <jxl/decode.h>

static Image *image_new(int w, int h)
{
    if (w <= 0 || h <= 0 || (gint64)w * h > 400000000) return NULL;   /* 400 megapixels at most */
    Image *im = g_new0(Image, 1);
    im->w = w; im->h = h;
    im->px = g_try_malloc0((size_t)w * h * 4);
    if (!im->px) { g_free(im); return NULL; }
    return im;
}

void image_free(Image *im) { if (im) { g_free(im->px); g_free(im); } }

/* EXIF orientation 1-8 -> turned/flipped so it reads upright */
Image *image_orient(Image *im, int o)
{
    if (!im || o <= 1 || o > 8) return im;
    gboolean swap = o >= 5;
    Image *r = image_new(swap ? im->h : im->w, swap ? im->w : im->h);
    if (!r) return im;
    guint32 *s = (guint32 *)im->px, *d = (guint32 *)r->px;
    int W = im->w, H = im->h;
    for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
        int nx, ny;
        switch (o) {
        case 2: nx = W - 1 - x; ny = y; break;
        case 3: nx = W - 1 - x; ny = H - 1 - y; break;
        case 4: nx = x; ny = H - 1 - y; break;
        case 5: nx = y; ny = x; break;
        case 6: nx = H - 1 - y; ny = x; break;
        case 7: nx = H - 1 - y; ny = W - 1 - x; break;
        default: nx = y; ny = W - 1 - x; break;   /* 8 */
        }
        d[(size_t)ny * r->w + nx] = s[(size_t)y * W + x];
    }
    image_free(im);
    return r;
}

static int exif_orientation(const guint8 *data, size_t len)
{
    ExifData *ed = exif_data_new_from_data(data, (unsigned)len);
    if (!ed) return 1;
    int o = 1;
    ExifEntry *e = exif_data_get_entry(ed, EXIF_TAG_ORIENTATION);
    if (e) o = exif_get_short(e->data, exif_data_get_byte_order(ed));
    exif_data_unref(ed);
    return o;
}

/* ---------------------------------------------------------------- JPEG */
typedef struct { struct jpeg_error_mgr mgr; jmp_buf jb; } JErr;
static void jerr_exit(j_common_ptr c) { longjmp(((JErr *)c->err)->jb, 1); }

static Image *read_jpeg(const guint8 *data, size_t len)
{
    struct jpeg_decompress_struct c; JErr err;
    c.err = jpeg_std_error(&err.mgr); err.mgr.error_exit = jerr_exit;
    Image *volatile im = NULL;
    if (setjmp(err.jb)) { jpeg_destroy_decompress(&c); image_free(im); return NULL; }
    jpeg_create_decompress(&c);
    jpeg_mem_src(&c, data, (unsigned long)len);
    jpeg_save_markers(&c, JPEG_APP0 + 1, 0xffff);
    jpeg_read_header(&c, TRUE);
    c.out_color_space = JCS_EXT_RGBA;
    jpeg_start_decompress(&c);
    im = image_new((int)c.output_width, (int)c.output_height);
    if (!im) { jpeg_destroy_decompress(&c); return NULL; }
    while (c.output_scanline < c.output_height) {
        JSAMPROW row = im->px + (size_t)c.output_scanline * im->w * 4;
        jpeg_read_scanlines(&c, &row, 1);
    }
    int o = 1;
    for (jpeg_saved_marker_ptr m = c.marker_list; m; m = m->next)
        if (m->marker == JPEG_APP0 + 1 && m->data_length > 6 && !memcmp(m->data, "Exif\0\0", 6)) o = exif_orientation(m->data, m->data_length);
    jpeg_finish_decompress(&c);
    jpeg_destroy_decompress(&c);
    return image_orient(im, o);
}

/* ---------------------------------------------------------------- PNG */
static Image *read_png(const guint8 *data, size_t len)
{
    png_image p; memset(&p, 0, sizeof p); p.version = PNG_IMAGE_VERSION;
    if (!png_image_begin_read_from_memory(&p, data, len)) return NULL;
    p.format = PNG_FORMAT_RGBA;
    Image *im = image_new((int)p.width, (int)p.height);
    if (!im) { png_image_free(&p); return NULL; }
    if (!png_image_finish_read(&p, NULL, im->px, 0, NULL)) { image_free(im); return NULL; }
    return im;
}

/* ---------------------------------------------------------------- TIFF (from memory) */
typedef struct { const guint8 *d; size_t len, pos; } Mem;
static tmsize_t m_read(thandle_t h, void *buf, tmsize_t n) { Mem *m = h; if (m->pos >= m->len) return 0; if ((size_t)n > m->len - m->pos) n = (tmsize_t)(m->len - m->pos); memcpy(buf, m->d + m->pos, (size_t)n); m->pos += (size_t)n; return n; }
static tmsize_t m_write(thandle_t h, void *b, tmsize_t n) { (void)h; (void)b; (void)n; return -1; }
static toff_t m_seek(thandle_t h, toff_t off, int wh) { Mem *m = h; size_t base = wh == SEEK_SET ? 0 : wh == SEEK_CUR ? m->pos : m->len; m->pos = base + (size_t)off; return m->pos; }
static int m_close(thandle_t h) { (void)h; return 0; }
static toff_t m_size(thandle_t h) { return ((Mem *)h)->len; }
static void tiff_quiet(const char *m, const char *f, va_list a) { (void)m; (void)f; (void)a; }

static Image *read_tiff(const guint8 *data, size_t len)
{
    TIFFSetWarningHandler(tiff_quiet); TIFFSetErrorHandler(tiff_quiet);
    Mem m = { data, len, 0 };
    TIFF *t = TIFFClientOpen("mem", "rm", &m, m_read, m_write, m_seek, m_close, m_size, NULL, NULL);
    if (!t) return NULL;
    guint32 w = 0, h = 0;
    TIFFGetField(t, TIFFTAG_IMAGEWIDTH, &w); TIFFGetField(t, TIFFTAG_IMAGELENGTH, &h);
    Image *im = image_new((int)w, (int)h);
    /* ABGR words = R,G,B,A bytes on a little-endian computer; oriented top-left by libtiff */
    if (im && !TIFFReadRGBAImageOriented(t, w, h, (guint32 *)im->px, ORIENTATION_TOPLEFT, 0)) { image_free(im); im = NULL; }
    guint16 o = 1;
    if (im && TIFFGetField(t, TIFFTAG_ORIENTATION, &o) && o >= 5) im = image_orient(im, o == 5 ? 5 : o == 6 ? 6 : o == 7 ? 7 : 8);
    TIFFClose(t);
    if (im) {   /* libtiff gives premultiplied alpha for associated-alpha files: make it straight */
        guint8 *p = im->px;
        for (size_t i = 0; i < (size_t)im->w * im->h; i++, p += 4)
            if (p[3] && p[3] < 255) for (int k = 0; k < 3; k++) p[k] = (guint8)MIN(255, p[k] * 255 / p[3]);
    }
    return im;
}

/* ---------------------------------------------------------------- WebP */
static Image *read_webp(const guint8 *data, size_t len)
{
    int w, h;
    if (!WebPGetInfo(data, len, &w, &h)) return NULL;
    Image *im = image_new(w, h);
    if (!im) return NULL;
    if (!WebPDecodeRGBAInto(data, len, im->px, (size_t)w * h * 4, w * 4)) { image_free(im); return NULL; }
    return im;
}

/* ---------------------------------------------------------------- HEIC / AVIF (libheif turns it upright) */
static Image *read_heif(const guint8 *data, size_t len)
{
    struct heif_context *ctx = heif_context_alloc();
    struct heif_image_handle *hd = NULL; struct heif_image *img = NULL;
    Image *im = NULL;
    if (heif_context_read_from_memory_without_copy(ctx, data, len, NULL).code == heif_error_Ok
        && heif_context_get_primary_image_handle(ctx, &hd).code == heif_error_Ok
        && heif_decode_image(hd, &img, heif_colorspace_RGB, heif_chroma_interleaved_RGBA, NULL).code == heif_error_Ok) {
        int stride, w = heif_image_get_width(img, heif_channel_interleaved), h = heif_image_get_height(img, heif_channel_interleaved);
        const guint8 *p = heif_image_get_plane_readonly(img, heif_channel_interleaved, &stride);
        if (p && (im = image_new(w, h))) for (int y = 0; y < h; y++) memcpy(im->px + (size_t)y * w * 4, p + (size_t)y * stride, (size_t)w * 4);
    }
    if (img) heif_image_release(img);
    if (hd) heif_image_handle_release(hd);
    heif_context_free(ctx);
    return im;
}

/* ---------------------------------------------------------------- JPEG XL */
static Image *read_jxl(const guint8 *data, size_t len)
{
    JxlDecoder *dec = JxlDecoderCreate(NULL);
    if (!dec) return NULL;
    JxlDecoderSubscribeEvents(dec, JXL_DEC_BASIC_INFO | JXL_DEC_FULL_IMAGE);
    JxlDecoderSetInput(dec, data, len);
    JxlDecoderCloseInput(dec);
    JxlPixelFormat fmt = { 4, JXL_TYPE_UINT8, JXL_NATIVE_ENDIAN, 0 };
    Image *im = NULL; gboolean ok = FALSE;
    for (;;) {
        JxlDecoderStatus s = JxlDecoderProcessInput(dec);
        if (s == JXL_DEC_BASIC_INFO) {
            JxlBasicInfo info;
            if (JxlDecoderGetBasicInfo(dec, &info) != JXL_DEC_SUCCESS || !(im = image_new((int)info.xsize, (int)info.ysize))) break;
        } else if (s == JXL_DEC_NEED_IMAGE_OUT_BUFFER) {
            if (!im || JxlDecoderSetImageOutBuffer(dec, &fmt, im->px, (size_t)im->w * im->h * 4) != JXL_DEC_SUCCESS) break;
        } else if (s == JXL_DEC_FULL_IMAGE) { ok = TRUE; break; }
        else break;
    }
    JxlDecoderDestroy(dec);
    if (!ok) { image_free(im); return NULL; }
    return im;
}

/* ---------------------------------------------------------------- GIF (the first frame) */
static Image *read_gif(const guint8 *d, size_t len)
{
    if (len < 13 || memcmp(d, "GIF8", 4)) return NULL;
    int W = d[6] | d[7] << 8, H = d[8] | d[9] << 8, flags = d[10], bg = d[11];
    size_t p = 13;
    guint8 gct[768] = { 0 }; int gct_n = 0;
    if (flags & 0x80) { gct_n = 2 << (flags & 7); if (p + gct_n * 3 > len) return NULL; memcpy(gct, d + p, gct_n * 3); p += gct_n * 3; }
    int transparent = -1;
    (void)bg;
    while (p < len) {
        guint8 b = d[p++];
        if (b == 0x21) {                                   /* an extension: the transparent colour is in 0xF9 */
            if (p >= len) return NULL;
            guint8 label = d[p++];
            while (p < len && d[p]) {
                guint8 n = d[p];
                if (label == 0xF9 && n >= 4 && p + 4 < len && (d[p + 1] & 1)) transparent = d[p + 4];
                p += n + 1;
            }
            p++;
        } else if (b == 0x2C) {                            /* the first picture */
            if (p + 9 > len) return NULL;
            int fx = d[p] | d[p + 1] << 8, fy = d[p + 2] | d[p + 3] << 8, fw = d[p + 4] | d[p + 5] << 8, fh = d[p + 6] | d[p + 7] << 8, lf = d[p + 8];
            p += 9;
            const guint8 *ct = gct; int csize = gct_n; guint8 lct[768];
            if (lf & 0x80) { csize = 2 << (lf & 7); if (p + csize * 3 > len) return NULL; memcpy(lct, d + p, csize * 3); ct = lct; p += csize * 3; }
            gboolean interlaced = lf & 0x40;
            if (p >= len) return NULL;
            int min_code = d[p++];
            if (min_code < 2 || min_code > 11) return NULL;
            /* the data blocks, joined */
            GByteArray *lzw = g_byte_array_new();
            while (p < len && d[p]) { guint8 n = d[p]; if (p + 1 + n > len) break; g_byte_array_append(lzw, d + p + 1, n); p += n + 1; }
            Image *im = image_new(W, H);
            if (!im) { g_byte_array_free(lzw, TRUE); return NULL; }
            /* LZW */
            int clear = 1 << min_code, eoi = clear + 1, size = min_code + 1, next = eoi + 1, prev = -1;
            guint16 *prefix = g_new(guint16, 4096);
            guint8 *suffix = g_new(guint8, 4096);
            guint8 *stack = g_new(guint8, 4097);
            for (int i = 0; i < clear; i++) { prefix[i] = 0xFFFF; suffix[i] = (guint8)i; }
            guint32 bits = 0; int nbits = 0; size_t ip = 0;
            int pix = 0, total = fw * fh, row = 0, pass = 0, col = 0;
            static const int start[4] = { 0, 4, 2, 1 }, step[4] = { 8, 8, 4, 2 };
            guint8 first = 0;
            while (pix < total) {
                while (nbits < size && ip < lzw->len) { bits |= (guint32)lzw->data[ip++] << nbits; nbits += 8; }
                if (nbits < size) break;
                int code = bits & ((1 << size) - 1); bits >>= size; nbits -= size;
                if (code == clear) { size = min_code + 1; next = eoi + 1; prev = -1; continue; }
                if (code == eoi) break;
                int sp = 0, c = code;
                if (prev < 0) { if (code >= clear) break; stack[sp++] = (guint8)code; first = (guint8)code; }
                else {
                    if (code >= next) { if (code > next) break; stack[sp++] = first; c = prev; }
                    while (c >= clear && sp < 4096) { stack[sp++] = suffix[c]; c = prefix[c]; }
                    stack[sp++] = (guint8)c; first = (guint8)c;
                    if (next < 4096) { prefix[next] = (guint16)prev; suffix[next] = first; next++; if (next == (1 << size) && size < 12) size++; }
                }
                prev = code;
                while (sp > 0 && pix < total) {
                    guint8 idx = stack[--sp];
                    int x = fx + col, y = fy + (interlaced ? row : pix / fw);
                    if (x < W && y < H && idx != transparent && idx < csize) {
                        guint8 *o = im->px + ((size_t)y * W + x) * 4;
                        o[0] = ct[idx * 3]; o[1] = ct[idx * 3 + 1]; o[2] = ct[idx * 3 + 2]; o[3] = 255;
                    }
                    pix++;
                    if (++col == fw) {
                        col = 0;
                        if (interlaced) { row += step[pass]; while (row >= fh && pass < 3) { pass++; row = start[pass]; } }
                    }
                }
            }
            g_free(prefix); g_free(suffix); g_free(stack); g_byte_array_free(lzw, TRUE);
            return im;
        } else if (b == 0x3B) break;
        else return NULL;
    }
    return NULL;
}

/* ---------------------------------------------------------------- BMP */
static guint32 le32(const guint8 *p) { return p[0] | p[1] << 8 | p[2] << 16 | (guint32)p[3] << 24; }
static guint16 le16(const guint8 *p) { return p[0] | p[1] << 8; }

static Image *read_bmp(const guint8 *d, size_t len)
{
    if (len < 54 || d[0] != 'B' || d[1] != 'M') return NULL;
    guint32 off = le32(d + 10), hs = le32(d + 14);
    if (hs < 40) return NULL;
    gint32 w = (gint32)le32(d + 18), h = (gint32)le32(d + 22);
    int bpp = le16(d + 28); guint32 comp = le32(d + 30), ncol = le32(d + 46);
    gboolean down = h < 0; if (h < 0) h = -h;
    if (comp != 0 && comp != 3) return NULL;            /* no RLE */
    guint32 masks[4] = { 0x00ff0000, 0x0000ff00, 0x000000ff, bpp == 32 ? 0xff000000 : 0 };
    if (bpp == 16) { masks[0] = 0x7c00; masks[1] = 0x03e0; masks[2] = 0x001f; masks[3] = 0; }
    /* BI_BITFIELDS: the masks come right after the 40-byte header (inside it for V4/V5 headers) */
    if (comp == 3 && len >= 70) { masks[0] = le32(d + 54); masks[1] = le32(d + 58); masks[2] = le32(d + 62); masks[3] = hs >= 56 ? le32(d + 66) : 0; }
    const guint8 *pal = d + 14 + hs;
    if (bpp <= 8 && !ncol) ncol = 1u << bpp;
    Image *im = image_new(w, h);
    if (!im) return NULL;
    size_t stride = (((size_t)w * bpp + 31) / 32) * 4;
    if (off + stride * h > len) { image_free(im); return NULL; }
    gboolean any_alpha = FALSE;
    for (int y = 0; y < h; y++) {
        const guint8 *r = d + off + stride * (down ? y : h - 1 - y);
        guint8 *o = im->px + (size_t)y * w * 4;
        for (int x = 0; x < w; x++, o += 4) {
            if (bpp <= 8) {
                int idx = bpp == 8 ? r[x] : bpp == 4 ? (r[x / 2] >> (x & 1 ? 0 : 4)) & 15 : (r[x / 8] >> (7 - x % 8)) & 1;
                if ((guint32)idx >= ncol) idx = 0;
                o[0] = pal[idx * 4 + 2]; o[1] = pal[idx * 4 + 1]; o[2] = pal[idx * 4]; o[3] = 255;
            } else if (bpp == 24) { o[0] = r[x * 3 + 2]; o[1] = r[x * 3 + 1]; o[2] = r[x * 3]; o[3] = 255; }
            else if (bpp == 32 || bpp == 16) {
                guint32 v = bpp == 32 ? le32(r + x * 4) : le16(r + x * 2);
                for (int k = 0; k < 4; k++) {
                    guint32 m = masks[k];
                    if (!m) { o[k] = k == 3 ? 255 : 0; continue; }
                    int sh = __builtin_ctz(m), bits = __builtin_popcount(m);
                    guint32 c = (v & m) >> sh;
                    o[k] = (guint8)(bits >= 8 ? c >> (bits - 8) : c * 255 / ((1u << bits) - 1));
                }
                if (masks[3] && o[3]) any_alpha = TRUE;
            } else { image_free(im); return NULL; }
        }
    }
    if (bpp == 32 && masks[3] && !any_alpha) for (size_t i = 0; i < (size_t)w * h; i++) im->px[i * 4 + 3] = 255;   /* alpha all zero: there's none */
    return im;
}

/* ---------------------------------------------------------------- PNM (P1-P6) */
static gboolean pnm_num(const guint8 *d, size_t len, size_t *p, int *v)
{
    while (*p < len) {
        if (d[*p] == '#') { while (*p < len && d[*p] != '\n') (*p)++; }
        else if (g_ascii_isspace(d[*p])) (*p)++;
        else break;
    }
    if (*p >= len || !g_ascii_isdigit(d[*p])) return FALSE;
    long n = 0;
    while (*p < len && g_ascii_isdigit(d[*p])) { n = n * 10 + (d[*p] - '0'); if (n > 1 << 24) return FALSE; (*p)++; }
    *v = (int)n;
    return TRUE;
}

static Image *read_pnm(const guint8 *d, size_t len)
{
    if (len < 3 || d[0] != 'P' || d[1] < '1' || d[1] > '6') return NULL;
    int t = d[1] - '0', w, h, max = 1; size_t p = 2;
    if (!pnm_num(d, len, &p, &w) || !pnm_num(d, len, &p, &h)) return NULL;
    if (t != 1 && t != 4 && !pnm_num(d, len, &p, &max)) return NULL;
    if (max <= 0 || max > 65535) return NULL;
    Image *im = image_new(w, h);
    if (!im) return NULL;
    if (t >= 4) p++;                                       /* one whitespace before the binary data */
    int bps = max > 255 ? 2 : 1;
    size_t rowbits = (size_t)w;
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
        guint8 *o = im->px + ((size_t)y * w + x) * 4; int c[3] = { 0, 0, 0 };
        if (t == 4) { size_t i = p + (size_t)y * ((rowbits + 7) / 8) + x / 8; if (i >= len) goto out; c[0] = c[1] = c[2] = (d[i] >> (7 - x % 8)) & 1 ? 0 : 255; }
        else if (t == 1) { int v; if (!pnm_num(d, len, &p, &v)) goto out; c[0] = c[1] = c[2] = v ? 0 : 255; }
        else {
            int n = t == 2 || t == 5 ? 1 : 3;
            for (int k = 0; k < n; k++) {
                int v;
                if (t <= 3) { if (!pnm_num(d, len, &p, &v)) goto out; }
                else { if (p + bps > len) goto out; v = bps == 2 ? d[p] << 8 | d[p + 1] : d[p]; p += bps; }
                c[k] = v * 255 / max;
            }
            if (n == 1) c[1] = c[2] = c[0];
        }
        o[0] = (guint8)c[0]; o[1] = (guint8)c[1]; o[2] = (guint8)c[2]; o[3] = 255;
    }
out:
    return im;
}

/* ---------------------------------------------------------------- TGA (truecolour and grey, RLE or not) */
static Image *read_tga(const guint8 *d, size_t len)
{
    if (len < 18) return NULL;
    int idlen = d[0], cmap = d[1], type = d[2], w = le16(d + 12), h = le16(d + 14), bpp = d[16], desc = d[17];
    if (cmap || !(type == 2 || type == 3 || type == 10 || type == 11)) return NULL;
    if (!(bpp == 8 || bpp == 16 || bpp == 24 || bpp == 32)) return NULL;
    Image *im = image_new(w, h);
    if (!im) return NULL;
    size_t p = 18 + idlen; int B = bpp / 8; gboolean rle = type >= 9, top = desc & 0x20;
    size_t n = (size_t)w * h, i = 0;
    while (i < n && p < len) {
        int count = 1; gboolean repeat = FALSE;
        if (rle) { guint8 h8 = d[p++]; count = (h8 & 0x7f) + 1; repeat = h8 & 0x80; }
        const guint8 *src = d + p;
        for (int k = 0; k < count && i < n; k++, i++) {
            if (!repeat || k == 0) { if (p + B > len) return im; src = d + p; p += B; }
            size_t y = i / w, x = i % w, oy = top ? y : (size_t)h - 1 - y;
            guint8 *o = im->px + (oy * w + x) * 4;
            if (B == 1) { o[0] = o[1] = o[2] = src[0]; o[3] = 255; }
            else if (B == 2) { guint16 v = le16(src); o[0] = ((v >> 10) & 31) * 255 / 31; o[1] = ((v >> 5) & 31) * 255 / 31; o[2] = (v & 31) * 255 / 31; o[3] = 255; }
            else { o[0] = src[2]; o[1] = src[1]; o[2] = src[0]; o[3] = B == 4 && (desc & 15) ? src[3] : 255; }
        }
    }
    return im;
}

/* ---------------------------------------------------------------- which one */
Image *image_read_bytes(const guint8 *d, size_t len, const char *name)
{
    if (len < 4) return NULL;
    if (d[0] == 0xFF && d[1] == 0xD8) return read_jpeg(d, len);
    if (len > 8 && !memcmp(d, "\x89PNG", 4)) return read_png(d, len);
    if (!memcmp(d, "II*\0", 4) || !memcmp(d, "MM\0*", 4)) return read_tiff(d, len);
    if (len > 12 && !memcmp(d, "RIFF", 4) && !memcmp(d + 8, "WEBP", 4)) return read_webp(d, len);
    if (len > 12 && !memcmp(d + 4, "ftyp", 4)) return read_heif(d, len);
    if ((d[0] == 0xFF && d[1] == 0x0A) || (len > 12 && !memcmp(d, "\0\0\0\x0cJXL ", 8))) return read_jxl(d, len);
    if (!memcmp(d, "GIF8", 4)) return read_gif(d, len);
    if (d[0] == 'B' && d[1] == 'M') return read_bmp(d, len);
    if (d[0] == 'P' && d[1] >= '1' && d[1] <= '6') return read_pnm(d, len);
    /* TGA has no signature: only by name */
    if (name) { const char *e = strrchr(name, '.'); if (e && (!g_ascii_strcasecmp(e, ".tga") || !g_ascii_strcasecmp(e, ".icb") || !g_ascii_strcasecmp(e, ".vda"))) return read_tga(d, len); }
    return NULL;
}

/* ---------------------------------------------------------------- making it smaller (area average) */
Image *image_fit(Image *im, int size)
{
    if (!im || size <= 0 || MAX(im->w, im->h) <= size) return im;
    double k = (double)size / MAX(im->w, im->h);
    int W = MAX(1, (int)(im->w * k + .5)), H = MAX(1, (int)(im->h * k + .5));
    Image *r = image_new(W, H);
    if (!r) return im;
    double sx = (double)im->w / W, sy = (double)im->h / H;
    for (int y = 0; y < H; y++) {
        int y0 = (int)(y * sy), y1 = MAX(y0 + 1, (int)((y + 1) * sy));
        for (int x = 0; x < W; x++) {
            int x0 = (int)(x * sx), x1 = MAX(x0 + 1, (int)((x + 1) * sx));
            double acc[4] = { 0, 0, 0, 0 }; double n = 0;
            for (int yy = y0; yy < y1 && yy < im->h; yy++) {
                const guint8 *s = im->px + ((size_t)yy * im->w + x0) * 4;
                for (int xx = x0; xx < x1 && xx < im->w; xx++, s += 4) {
                    double a = s[3];
                    acc[0] += s[0] * a; acc[1] += s[1] * a; acc[2] += s[2] * a; acc[3] += a; n++;
                }
            }
            guint8 *o = r->px + ((size_t)y * W + x) * 4;
            if (acc[3] > 0) { o[0] = (guint8)(acc[0] / acc[3] + .5); o[1] = (guint8)(acc[1] / acc[3] + .5); o[2] = (guint8)(acc[2] / acc[3] + .5); }
            o[3] = (guint8)(acc[3] / n + .5);
        }
    }
    image_free(im);
    return r;
}

gboolean image_write_png(Image *im, const char *path, int level)
{
    char *tmp = g_strconcat(path, ".part", NULL);
    FILE *f = fopen(tmp, "wb");
    if (!f) { g_free(tmp); return FALSE; }
    png_structp p = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
    png_infop info = png_create_info_struct(p);
    gboolean ok = FALSE;
    if (!setjmp(png_jmpbuf(p))) {
        png_init_io(p, f);
        png_set_compression_level(p, level);
        png_set_IHDR(p, info, im->w, im->h, 8, PNG_COLOR_TYPE_RGB_ALPHA, PNG_INTERLACE_NONE, PNG_COMPRESSION_TYPE_DEFAULT, PNG_FILTER_TYPE_DEFAULT);
        png_write_info(p, info);
        for (int y = 0; y < im->h; y++) png_write_row(p, im->px + (size_t)y * im->w * 4);
        png_write_end(p, NULL);
        ok = TRUE;
    }
    png_destroy_write_struct(&p, &info);
    ok = fclose(f) == 0 && ok;
    if (ok) ok = rename(tmp, path) == 0;
    else unlink(tmp);
    g_free(tmp);
    return ok;
}

"""Palette Studio — a dockable panel built from brushboard.ui widgets."""
import numpy as np
import brushboard as g
from brushboard import ui


def kmeans_palette(img, k=6, iters=12, seed=3):
    a = img[..., 3] > 0.5
    px = img[..., :3][a]
    if len(px) == 0:
        return []
    rng = np.random.default_rng(seed)
    if len(px) > 40000:
        px = px[rng.choice(len(px), 40000, replace=False)]
    # k-means++ init
    centers = [px[rng.integers(len(px))]]
    for _ in range(1, k):
        d = np.min(((px[:, None, :] - np.asarray(centers)[None]) ** 2).sum(-1), axis=1)
        centers.append(px[rng.choice(len(px), p=d / max(d.sum(), 1e-9))])
    c = np.asarray(centers, np.float32)
    for _ in range(iters):
        lab = np.argmin(((px[:, None, :] - c[None]) ** 2).sum(-1), axis=1)
        for i in range(k):
            m = px[lab == i]
            if len(m):
                c[i] = m.mean(axis=0)
    counts = np.bincount(lab, minlength=k)
    order = np.argsort(-counts)
    return [(c[i].tolist(), int(counts[i])) for i in order if counts[i] > 0]


@g.panel("Palette")
class PalettePanel(g.Panel):
    def __init__(self):
        self.k = 6
        self.source = "composite"
        self.colors = []

    def render(self, ctx):
        out = [ui.title("Image Palette"),
               ui.label("Extract dominant colours with k-means. Click a swatch to set the foreground (Alt-click: background).", "small"),
               ui.slider("k", "Colours", self.k, 2, 16, 1),
               ui.select("source", "Source", [["composite", "All layers"], ["layer", "Active layer"]], self.source),
               ui.row(ui.button("extract", "Extract palette", primary=True), ui.button("layer", "Add swatch layer"))]
        if self.colors:
            out += [ui.separator(), ui.swatches([c for c, _ in self.colors], id="swatch"),
                    ui.label("  ".join("#%02X%02X%02X" % tuple(int(round(v * 255)) for v in c) for c, _ in self.colors), "small")]
        return out

    def on_event(self, widget, value, ctx):
        if widget == "k":
            self.k = int(value)
        elif widget == "source":
            self.source = value
        elif widget == "extract":
            if not ctx.document:
                ctx.message("Open an image first", "error")
                return None
            ctx.status("Extracting palette…")
            img = ctx.composite() if self.source == "composite" else ctx.layer_pixels()
            # work on a downsampled copy for speed
            step = max(1, int(max(img.shape[:2]) / 400))
            self.colors = kmeans_palette(img[::step, ::step], self.k)
            ctx.status("")
        elif widget == "swatch":
            c = value["color"]
            (ctx.set_background if value.get("alt") else ctx.set_foreground)(c)
        elif widget == "layer":
            doc = ctx.document
            if not doc or not self.colors:
                ctx.message("Extract a palette first", "error")
                return None
            w, h = doc["width"], doc["height"]
            bar_h = max(24, h // 10)
            img = np.zeros((h, w, 4), np.float32)
            n = len(self.colors)
            for i, (c, _) in enumerate(self.colors):
                x0, x1 = i * w // n, (i + 1) * w // n
                img[h - bar_h:, x0:x1, :3] = c
                img[h - bar_h:, x0:x1, 3] = 1
            ctx.add_layer(img, name="Palette")
        return None

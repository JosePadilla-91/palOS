"""Glitch Tools — canvas tools implemented in Python."""
import math
import numpy as np
import brushboard as g

SORT_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6h16M4 10h11M4 14h7M4 18h3"/><path d="m18 12 2 2-2 2M20 14h-5"/></svg>'
PROT_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 19h18M3 19a9 9 0 0 1 18 0"/><path d="m12 19 5-7"/></svg>'


@g.tool("Pixel Sorter", icon=SORT_ICON, cursor="crosshair",
        options={"direction": g.Choice([("h", "Horizontal"), ("v", "Vertical")], "h"),
                 "key": g.Choice([("lum", "Brightness"), ("hue", "Hue"), ("sat", "Saturation")], "lum"),
                 "threshold": g.Float(0, 1, 0.25, label="Threshold"), "reverse": g.Bool(False)})
class PixelSorter(g.Tool):
    """Drag a rectangle; pixels brighter than the threshold are sorted inside each row/column span."""

    def on_press(self, ev, ctx):
        self.a = (ev.x, ev.y)
        return {"overlay": [], "status": "Drag to choose the area to sort"}

    def on_drag(self, ev, ctx):
        x0, y0 = self.a
        return {"overlay": [{"type": "rect", "x": min(x0, ev.x), "y": min(y0, ev.y), "w": abs(ev.x - x0), "h": abs(ev.y - y0), "color": [0.95, 0.78, 0.45], "dash": [5, 4]}]}

    def on_release(self, ev, ctx):
        doc = ctx.document
        if not doc:
            return {"overlay": []}
        x0, y0 = self.a
        X0, X1 = sorted((int(max(0, min(x0, ev.x))), int(min(doc["width"], max(x0, ev.x)))))
        Y0, Y1 = sorted((int(max(0, min(y0, ev.y))), int(min(doc["height"], max(y0, ev.y)))))
        if X1 - X0 < 2 or Y1 - Y0 < 2:
            return {"overlay": [], "status": ""}
        img = ctx.layer_pixels()
        region = img[Y0:Y1, X0:X1].copy()
        o = ev.options or {}
        if o.get("direction", "h") == "v":
            region = region.transpose(1, 0, 2)
        rgb = region[..., :3]
        mx, mn = rgb.max(-1), rgb.min(-1)
        if o.get("key") == "sat":
            key = (mx - mn) / np.maximum(mx, 1e-6)
        elif o.get("key") == "hue":
            r, gg, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
            key = (np.arctan2(math.sqrt(3) * (gg - b), 2 * r - gg - b) / (2 * math.pi)) % 1.0
        else:
            key = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        thr = float(o.get("threshold", 0.25))
        for i in range(region.shape[0]):
            mask = lum[i] > thr
            # sort each contiguous run above the threshold
            j = 0
            n = mask.shape[0]
            while j < n:
                if not mask[j]:
                    j += 1
                    continue
                k = j
                while k < n and mask[k]:
                    k += 1
                idx = np.argsort(key[i, j:k])
                if o.get("reverse"):
                    idx = idx[::-1]
                region[i, j:k] = region[i, j:k][idx]
                j = k
        if o.get("direction", "h") == "v":
            region = region.transpose(1, 0, 2)
        img[Y0:Y1, X0:X1] = region
        ctx.set_layer_pixels(img, label="Pixel Sort")
        return {"overlay": [], "status": f"Sorted {X1 - X0}×{Y1 - Y0} px"}


@g.tool("Protractor", icon=PROT_ICON, cursor="crosshair")
class Protractor(g.Tool):
    """Click the vertex, drag the first arm, then Shift-drag from the vertex for the second arm."""

    def __init__(self):
        self.v = None
        self.arms = []

    def on_press(self, ev, ctx):
        if ev.shift and self.v and self.arms:
            self.arms = self.arms[:1] + [(ev.x, ev.y)]
        else:
            self.v = (ev.x, ev.y)
            self.arms = [(ev.x, ev.y)]
        return self._draw()

    def on_drag(self, ev, ctx):
        self.arms[-1] = (ev.x, ev.y)
        return self._draw()

    def on_release(self, ev, ctx):
        return self._draw()

    def _draw(self):
        if not self.v:
            return {"overlay": []}
        shapes = [{"type": "line", "points": [self.v, a], "color": [0.95, 0.78, 0.45], "width": 1.5} for a in self.arms]
        angs = [math.degrees(math.atan2(-(a[1] - self.v[1]), a[0] - self.v[0])) for a in self.arms]
        if len(angs) == 2:
            d = abs((angs[0] - angs[1] + 180) % 360 - 180)
            label = f"{d:.1f}°"
        else:
            L = math.hypot(self.arms[0][0] - self.v[0], self.arms[0][1] - self.v[1])
            label = f"{angs[0]:.1f}°  {L:.0f}px  (Shift-drag for 2nd arm)"
        shapes.append({"type": "text", "x": self.v[0] + 8, "y": self.v[1] - 8, "text": label, "size": 13})
        return {"overlay": shapes, "status": label}

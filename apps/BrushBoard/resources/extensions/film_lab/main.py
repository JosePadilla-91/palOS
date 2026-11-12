"""Film Lab — analog looks written with plain NumPy."""
import numpy as np
import brushboard as g


def _luma(rgb):
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def _box_blur(a, r):
    """Fast separable box blur via cumulative sums (works on (H,W) or (H,W,C))."""
    if r < 1:
        return a
    out = a.astype(np.float32)
    for axis in (0, 1):
        pad = [(0, 0)] * out.ndim
        pad[axis] = (r + 1, r)
        p = np.pad(out, pad, mode="edge")
        c = np.cumsum(p, axis=axis, dtype=np.float64)
        n = out.shape[axis]
        hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
        lo = np.take(c, np.arange(0, n), axis=axis)
        out = ((hi - lo) / (2 * r + 1)).astype(np.float32)
    return out


def _gauss(a, sigma):
    r = max(1, int(round(sigma * 0.85)))
    for _ in range(3):
        a = _box_blur(a, r)
    return a


@g.filter("Film Grain", category="Film Lab", description="Luminance-aware photographic grain")
def film_grain(image, amount: g.Float(0, 1, 0.35, label="Amount"), size: g.Float(0.5, 4, 1.2, step=0.1, label="Grain size"),
               color: g.Bool(False, label="Color grain"), seed: g.Int(0, 9999, 7)):
    h, w = image.shape[:2]
    rng = np.random.default_rng(int(seed))
    ch = 3 if color else 1
    noise = rng.standard_normal((h, w, ch)).astype(np.float32)
    if size > 1.05:
        noise = _gauss(noise, size * 0.6)
        noise /= max(noise.std(), 1e-6)
    lum = _luma(image[..., :3])[..., None]
    response = 4.0 * lum * (1.0 - lum) + 0.15          # grain is strongest in the midtones
    out = image.copy()
    out[..., :3] = image[..., :3] + noise * response * amount * 0.12
    return out


@g.filter("Vignette", category="Film Lab")
def vignette(image, amount: g.Float(-1, 1, 0.45, label="Amount"), midpoint: g.Float(0.1, 1.5, 0.75), roundness: g.Float(0, 1, 0.8),
             feather: g.Float(0.05, 1, 0.5)):
    h, w = image.shape[:2]
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = (x / w - 0.5) * 2, (y / h - 0.5) * 2
    aspect = w / h
    sx = nx * (1 - roundness + roundness * aspect) if aspect > 1 else nx
    sy = ny * (1 - roundness + roundness / aspect) if aspect < 1 else ny
    d = np.sqrt(sx * sx + sy * sy) / np.sqrt(2)
    t = np.clip((d - midpoint * 0.7) / max(feather, 1e-3), 0, 1)
    t = t * t * (3 - 2 * t)
    out = image.copy()
    if amount >= 0:
        out[..., :3] *= (1 - t * amount)[..., None]
    else:
        out[..., :3] += (1 - out[..., :3]) * (t * -amount)[..., None]
    return out


@g.filter("Halation", category="Film Lab", description="Red-orange glow around highlights, like cinema film")
def halation(image, threshold: g.Float(0, 1, 0.75), radius: g.Float(1, 80, 18, step=1, unit="px"), strength: g.Float(0, 2, 0.6),
             tint: g.Color((1.0, 0.35, 0.1))):
    lum = _luma(image[..., :3])
    hi = np.clip((lum - threshold) / max(1 - threshold, 1e-3), 0, 1) * image[..., 3]
    glow = _gauss(hi, radius)
    out = image.copy()
    out[..., :3] = image[..., :3] + glow[..., None] * np.asarray(tint, np.float32) * strength
    return out


@g.filter("Chromatic Aberration", category="Film Lab")
def chromatic(image, shift: g.Float(0, 20, 3, step=0.5, unit="px")):
    h, w = image.shape[:2]
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    r = np.sqrt(((x - cx) / cx) ** 2 + ((y - cy) / cy) ** 2) + 1e-6
    out = image.copy()
    for c, k in ((0, 1.0), (2, -1.0)):
        s = k * shift * r / r.max()
        sx = np.clip(np.round(x + (x - cx) / (r * cx) * s), 0, w - 1).astype(np.int32)
        sy = np.clip(np.round(y + (y - cy) / (r * cy) * s), 0, h - 1).astype(np.int32)
        out[..., c] = image[sy, sx, c]
    return out


@g.filter("Duotone", category="Film Lab")
def duotone(image, shadows: g.Color((0.12, 0.07, 0.2), label="Shadows"), highlights: g.Color((0.98, 0.78, 0.45), label="Highlights"),
            contrast: g.Float(0.5, 2, 1.0)):
    lum = np.clip((_luma(image[..., :3]) - 0.5) * contrast + 0.5, 0, 1)[..., None]
    a, b = np.asarray(shadows, np.float32), np.asarray(highlights, np.float32)
    out = image.copy()
    out[..., :3] = a + (b - a) * lum
    return out


@g.command("Auto Color Balance", menu="Film Lab")
def auto_balance(ctx):
    """Grey-world white balance on the active layer (undoable)."""
    img = ctx.layer_pixels()
    a = img[..., 3] > 0.01
    if not a.any():
        return "Layer is empty"
    means = img[..., :3][a].mean(axis=0)
    gray = means.mean()
    out = img.copy()
    out[..., :3] *= gray / np.maximum(means, 1e-4)
    ctx.set_layer_pixels(out, label="Auto Color Balance")
    return "Balanced: gains " + ", ".join(f"{gray / m:.2f}" for m in means)

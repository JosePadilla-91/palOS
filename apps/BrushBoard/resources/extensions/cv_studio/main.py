"""CV Studio — filters backed by OpenCV."""
import numpy as np
import brushboard as g

try:
    import cv2
except ImportError:  # the manager offers "Install dependencies"
    cv2 = None


def _need():
    if cv2 is None:
        raise RuntimeError("OpenCV is not installed. Open Extensions › Manage Extensions and click 'Install dependencies'.")


def _to8(img):
    return np.clip(np.round(img[..., :3] * 255), 0, 255).astype(np.uint8)[..., ::-1].copy()  # RGB -> BGR


def _from8(bgr, like):
    out = like.copy()
    out[..., :3] = bgr[..., ::-1].astype(np.float32) / 255.0
    return out


@g.filter("Oil Paint", category="CV Studio")
def oil(image, detail: g.Float(1, 100, 45, step=1, label="Smoothness"), strength: g.Float(0.05, 1, 0.45, label="Edge strength")):
    _need()
    return _from8(cv2.stylization(_to8(image), sigma_s=float(detail), sigma_r=float(strength)), image)


@g.filter("Surface Blur (Bilateral)", category="CV Studio")
def bilateral(image, diameter: g.Int(3, 31, 9, unit="px"), color: g.Float(5, 150, 60, step=1, label="Color sigma"),
              space: g.Float(1, 100, 25, step=1, label="Space sigma"), passes: g.Int(1, 5, 1)):
    _need()
    rgb = np.ascontiguousarray(image[..., :3], np.float32)
    for _ in range(int(passes)):
        rgb = cv2.bilateralFilter(rgb, int(diameter), float(color) / 255.0, float(space))
    out = image.copy(); out[..., :3] = rgb
    return out


@g.filter("Median", category="CV Studio")
def median(image, radius: g.Int(1, 15, 2, unit="px")):
    _need()
    k = int(radius) * 2 + 1
    src = image.astype(np.float32)
    out = image.copy()
    if k <= 5:
        out[..., :3] = cv2.medianBlur(np.ascontiguousarray(src[..., :3]), k)
    else:
        out[..., :3] = cv2.medianBlur(_to8(src), k)[..., ::-1].astype(np.float32) / 255.0
    return out


@g.filter("Reduce Noise", category="CV Studio", description="Non-local means denoising")
def denoise(image, strength: g.Float(1, 30, 8, step=0.5, label="Luminance"), color: g.Float(0, 30, 8, step=0.5, label="Color")):
    _need()
    return _from8(cv2.fastNlMeansDenoisingColored(_to8(image), None, float(strength), float(color), 7, 21), image)


@g.filter("Pencil Sketch", category="CV Studio")
def sketch(image, smooth: g.Float(1, 200, 60, step=1), edges: g.Float(0.01, 1, 0.07, step=0.01), shade: g.Float(0, 0.1, 0.03, step=0.005),
           colored: g.Bool(False)):
    _need()
    gray, col = cv2.pencilSketch(_to8(image), sigma_s=float(smooth), sigma_r=float(edges), shade_factor=float(shade))
    if colored:
        return _from8(col, image)
    return _from8(cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR), image)


@g.filter("Detail Enhance", category="CV Studio")
def detail(image, smooth: g.Float(1, 200, 10, step=1), range_: g.Float(0.01, 1, 0.15, step=0.01, label="Range")):
    _need()
    return _from8(cv2.detailEnhance(_to8(image), sigma_s=float(smooth), sigma_r=float(range_)), image)


@g.command("Content-Aware Fill", menu="CV Studio", params={"radius": g.Int(1, 30, 6, label="Inpaint radius"), "method": g.Choice([("telea", "Telea"), ("ns", "Navier-Stokes")], "telea")})
def content_aware_fill(ctx, radius=6, method="telea"):
    """Fill the current selection on the active layer from its surroundings."""
    _need()
    sel = ctx.selection()
    if sel is None:
        raise RuntimeError("Select the area to fill first (lasso around the object).")
    img = ctx.layer_pixels()
    mask = (sel > 0.25).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=2)
    flag = cv2.INPAINT_TELEA if method == "telea" else cv2.INPAINT_NS
    filled = cv2.inpaint(_to8(img), mask, int(radius), flag)
    out = _from8(filled, img)
    soft = np.clip(sel, 0, 1)[..., None]
    out[..., :3] = img[..., :3] * (1 - soft) + out[..., :3] * soft
    out[..., 3] = np.maximum(img[..., 3], soft[..., 0])
    ctx.set_layer_pixels(out, label="Content-Aware Fill")
    return "Filled selection"

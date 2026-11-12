"""Core worker: high-bit-depth image I/O, Photoshop PSD, camera RAW and ICC colour management."""
from __future__ import annotations

import base64
import glob
import struct
import io
import os
import sys

import numpy as np

os.environ.setdefault("OPENCV_IO_ENABLE_OPENEXR", "1")

# --------------------------------------------------------------------------- optional deps
def _try(name):
    try:
        return __import__(name)
    except Exception:
        return None


cv2 = _try("cv2")
PIL = _try("PIL")
if PIL is not None:
    from PIL import Image  # noqa: E402
    try:
        from PIL import ImageCms  # noqa: E402
    except Exception:
        ImageCms = None
else:
    Image = ImageCms = None
tifffile = _try("tifffile")
rawpy = _try("rawpy")
OpenEXR = _try("OpenEXR")
try:
    import psd_tools  # noqa: F401
    from psd_tools import PSDImage
except Exception:
    psd_tools = None
    PSDImage = None


def _ver(m):
    return getattr(m, "__version__", "yes") if m else None


def capabilities(p, b):
    return {
        "python": sys.version.split()[0],
        "numpy": np.__version__,
        "PIL": _ver(PIL),
        "cv2": _ver(cv2),
        "psd_tools": _ver(psd_tools),
        "rawpy": _ver(rawpy),
        "tifffile": _ver(tifffile),
        "lcms": "yes" if ImageCms is not None else None,
        "onnxruntime": _ver(_try("onnxruntime")),
        "openexr": _ver(OpenEXR) if OpenEXR is not None and hasattr(OpenEXR, "File") else None,
    }


# --------------------------------------------------------------------------- colour helpers
def srgb_to_linear(x):
    x = np.asarray(x, np.float32)
    a = np.abs(x)
    return np.sign(x) * np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(x):
    x = np.asarray(x, np.float32)
    a = np.abs(x)
    return np.sign(x) * np.where(a <= 0.0031308, a * 12.92, 1.055 * np.power(a, 1 / 2.4) - 0.055)


def to_float(arr) -> np.ndarray:
    """Any integer/float image array to float32 0..1, channels untouched."""
    a = np.asarray(arr)
    if a.dtype == np.uint8:
        return a.astype(np.float32) / 255.0
    if a.dtype == np.uint16:
        return a.astype(np.float32) / 65535.0
    if a.dtype in (np.uint32, np.int32):
        return a.astype(np.float32) / 4294967295.0
    return a.astype(np.float32)


def cmyka(ink, alpha=None) -> np.ndarray:
    """(H,W,≥4) ink values 0..1 (+ optional alpha) → (H,W,5) float32 C, M, Y, K, alpha."""
    ink = to_float(ink)
    if ink.ndim == 2:
        ink = ink[..., None]
    a = ink[..., 4] if alpha is None and ink.shape[2] > 4 else (np.ones(ink.shape[:2], np.float32) if alpha is None else to_float(alpha))
    return np.ascontiguousarray(np.dstack([ink[..., :4], a]), dtype=np.float32)


def _cmyk_profile_of(icc):
    """Path of a usable CMYK profile for an embedded ICC (or the default press profile)."""
    from brushboard import cmyk as _cm
    if icc:
        try:
            if _profile_mode(ImageCms.ImageCmsProfile(io.BytesIO(icc))) == "CMYK":
                return _cm.save_embedded(icc), _cm.profile_name(icc)
        except Exception:
            pass
    return "fogra39", None


def _cmyk_result(ink5, icc, bits, warnings=None):
    prof, name = _cmyk_profile_of(icc)
    w = list(warnings or [])
    if name is None:
        w.append("No CMYK profile embedded: assuming Coated FOGRA39")
    h, wd = ink5.shape[:2]
    return {"width": wd, "height": h, "bitDepth": bits, "colorMode": "cmyk", "profile": prof, "warnings": w,
            "layers": [{"name": "Background", "kind": "raster", "visible": True, "opacity": 1, "blend": "normal", "x": 0, "y": 0, "w": wd, "h": h, "buffer": "L0"}]}, {"L0": ink5}


def to_rgba(arr) -> np.ndarray:
    """Normalise any image array to float32 (H, W, 4) in 0..1."""
    a = np.asarray(arr)
    if a.dtype == np.uint8:
        a = a.astype(np.float32) / 255.0
    elif a.dtype == np.uint16:
        a = a.astype(np.float32) / 65535.0
    elif a.dtype in (np.uint32, np.int32):
        a = a.astype(np.float32) / 4294967295.0
    elif a.dtype == bool:
        a = a.astype(np.float32)
    else:
        a = a.astype(np.float32)
    if a.ndim == 2:
        a = a[..., None]
    c = a.shape[2]
    if c == 1:
        a = np.concatenate([a, a, a, np.ones_like(a)], axis=2)
    elif c == 2:
        a = np.concatenate([a[..., :1], a[..., :1], a[..., :1], a[..., 1:2]], axis=2)
    elif c == 3:
        a = np.concatenate([a, np.ones(a.shape[:2] + (1,), np.float32)], axis=2)
    elif c > 4:
        a = a[..., :4]
    return np.ascontiguousarray(a, dtype=np.float32)


def _profile_mode(prof):
    try:
        cs = prof.profile.xcolor_space.strip().upper()
    except Exception:
        cs = "RGB"
    return {"RGB": "RGB", "CMYK": "CMYK", "GRAY": "L", "LAB": "LAB"}.get(cs, "RGB")


def _grid(n):
    v = np.round(np.linspace(0, 255, n)).astype(np.uint8)
    b, g, r = np.meshgrid(v, v, v, indexing="ij")  # r fastest
    img = np.stack([r, g, b], axis=-1).reshape(1, -1, 3)
    return v.astype(np.float32) / 255.0, img


def _apply_lut(rgb: np.ndarray, lut: np.ndarray, grid: np.ndarray) -> np.ndarray:
    """Trilinear interpolation of an (n,n,n,3) LUT (index order b,g,r) on a non-uniform grid."""
    n = grid.shape[0]
    x = np.clip(rgb, 0, 1)
    idx = []
    frac = []
    for c in range(3):
        i = np.clip(np.searchsorted(grid, x[..., c], side="right") - 1, 0, n - 2)
        lo, hi = grid[i], grid[i + 1]
        f = np.clip((x[..., c] - lo) / np.maximum(hi - lo, 1e-9), 0, 1)
        idx.append(i)
        frac.append(f[..., None])
    ir, ig, ib = idx
    fr, fg, fb = frac
    out = np.zeros(rgb.shape[:-1] + (lut.shape[-1],), np.float32)
    for db in (0, 1):
        wb = fb if db else 1 - fb
        for dg in (0, 1):
            wg = fg if dg else 1 - fg
            for dr in (0, 1):
                wr = fr if dr else 1 - fr
                out += lut[ib + db, ig + dg, ir + dr] * (wb * wg * wr)
    return out


def _transform_lut(src_prof, dst_prof, n=33, intent=0, proof=None, bpc=False):
    grid, img = _grid(n)
    pil = Image.fromarray(img, "RGB")
    flags = 0
    if bpc:
        flags |= ImageCms.Flags.BLACKPOINTCOMPENSATION if hasattr(ImageCms, "Flags") else 0x2000
    if proof is not None:
        t = ImageCms.buildProofTransform(src_prof, dst_prof, proof, "RGB", "RGB", renderingIntent=intent, proofRenderingIntent=intent,
                                         flags=flags | (ImageCms.Flags.SOFTPROOFING if hasattr(ImageCms, "Flags") else 0x4000))
    else:
        t = ImageCms.buildTransform(src_prof, dst_prof, "RGB", "RGB", renderingIntent=intent, flags=flags)
    out = np.asarray(ImageCms.applyTransform(pil, t)).reshape(n, n, n, 3).astype(np.float32) / 255.0
    return out, grid


def convert_profile(rgba: np.ndarray, src_icc: bytes | str | None, dst_icc: bytes | str | None) -> np.ndarray:
    """Convert straight RGBA between ICC profiles (None = sRGB) using a LittleCMS-built 3D LUT."""
    if ImageCms is None or (src_icc is None and dst_icc is None):
        return rgba
    def prof(x):
        if x is None:
            return ImageCms.createProfile("sRGB")
        if isinstance(x, bytes):
            return ImageCms.ImageCmsProfile(io.BytesIO(x))
        return ImageCms.ImageCmsProfile(x)
    sp, dp = prof(src_icc), prof(dst_icc)
    if _profile_mode(sp) != "RGB" or _profile_mode(dp) != "RGB":
        return rgba
    try:
        lut, grid = _transform_lut(sp, dp, n=65, intent=0)
    except Exception as e:  # pragma: no cover
        sys.stderr.write(f"ICC conversion failed: {e}\n")
        return rgba
    out = rgba.copy()
    out[..., :3] = _apply_lut(rgba[..., :3], lut, grid)
    return out


def _is_srgb_icc(icc: bytes | None) -> bool:
    if not icc:
        return True
    try:
        desc = ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(icc))).lower()
        return "srgb" in desc or "61966" in desc
    except Exception:
        return False


def srgb_icc_bytes() -> bytes | None:
    if ImageCms is None:
        return None
    try:
        return ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    except Exception:
        return None


# --------------------------------------------------------------------------- results
def layers_result(res, name="Background"):
    """Accept an (H,W,C) array or a dict {width,height,layers:[{name, image, x, y, ...}]} and build the reply."""
    buffers = {}
    if isinstance(res, np.ndarray):
        img = to_rgba(res)
        h, w = img.shape[:2]
        buffers["L0"] = img
        return {"width": w, "height": h, "bitDepth": 32 if np.asarray(res).dtype.kind == "f" else 16 if np.asarray(res).dtype == np.uint16 else 8,
                "layers": [{"name": name, "kind": "raster", "visible": True, "opacity": 1, "blend": "normal", "x": 0, "y": 0, "w": w, "h": h, "buffer": "L0"}]}, buffers
    layers = []
    n = 0
    def conv(l):
        nonlocal n
        if l.get("kind") == "group":
            return {**{k: v for k, v in l.items() if k != "children"}, "children": [conv(c) for c in l.get("children", [])]}
        img = to_rgba(l["image"])
        bid = f"L{n}"; n += 1
        buffers[bid] = img
        return {"name": l.get("name", "Layer"), "kind": "raster", "visible": l.get("visible", True), "opacity": l.get("opacity", 1.0),
                "blend": l.get("blend", "normal"), "x": int(l.get("x", 0)), "y": int(l.get("y", 0)), "w": img.shape[1], "h": img.shape[0], "buffer": bid}
    for l in res.get("layers", []):
        layers.append(conv(l))
    return {"width": res["width"], "height": res["height"], "bitDepth": res.get("bitDepth", 16), "layers": layers, "warnings": res.get("warnings", [])}, buffers


# --------------------------------------------------------------------------- reading
RAW_EXT = {"cr2", "cr3", "nef", "nrw", "arw", "srf", "sr2", "dng", "orf", "rw2", "raf", "pef", "srw", "x3f", "3fr", "erf", "kdc", "mrw", "iiq"}

BLEND_FROM_PSD = {
    "norm": "normal", "diss": "dissolve", "dark": "darken", "mul ": "multiply", "idiv": "colorBurn", "lbrn": "linearBurn", "dkCl": "darkerColor",
    "lite": "lighten", "scrn": "screen", "div ": "colorDodge", "lddg": "linearDodge", "lgCl": "lighterColor", "over": "overlay", "sLit": "softLight",
    "hLit": "hardLight", "vLit": "vividLight", "lLit": "linearLight", "pLit": "pinLight", "hMix": "hardMix", "diff": "difference", "smud": "exclusion",
    "fsub": "subtract", "fdiv": "divide", "hue ": "hue", "sat ": "saturation", "colr": "color", "lum ": "luminosity", "pass": "passThrough",
}
BLEND_TO_PSD = {v: k for k, v in BLEND_FROM_PSD.items()}


def _read_raw(path, opts):
    if rawpy is None:
        raise RuntimeError("rawpy is not installed")
    hl = {"clip": rawpy.HighlightMode.Clip, "blend": rawpy.HighlightMode.Blend, "reconstruct": rawpy.HighlightMode.ReconstructDefault}.get(opts.get("highlight", "clip"), rawpy.HighlightMode.Clip)
    with rawpy.imread(path) as raw:
        rgb = raw.postprocess(
            use_camera_wb=opts.get("wb", "camera") == "camera", use_auto_wb=opts.get("wb") == "auto",
            output_bps=16, no_auto_bright=not opts.get("bright", True), half_size=bool(opts.get("half", False)),
            exp_shift=float(2 ** float(opts.get("exposure", 0))), exp_preserve_highlights=0.5, highlight_mode=hl,
            output_color=rawpy.ColorSpace.sRGB,
        )
    img = to_rgba(rgb)
    return layers_result({"width": img.shape[1], "height": img.shape[0], "bitDepth": 16, "layers": [{"name": "Background", "image": img}]})


def _psd_resources(path):
    """Raw image resources of a PSD: {id: (name, bytes)} for paths (1025, 2000-2997) and BrushBoard data (4242)."""
    out = {}
    try:
        with open(path, "rb") as f:
            head = f.read(26)
            if head[:4] != b"8BPS":
                return out
            (cm_len,) = struct.unpack(">I", f.read(4)); f.seek(cm_len, 1)
            (res_len,) = struct.unpack(">I", f.read(4))
            data = f.read(res_len)
        i = 0
        while i + 12 <= len(data) and data[i:i + 4] == b"8BIM":
            rid = struct.unpack(">H", data[i + 4:i + 6])[0]
            nl = data[i + 6]
            name = data[i + 7:i + 7 + nl].decode("mac_roman", "replace")
            j = i + 7 + nl
            if (1 + nl) % 2:
                j += 1
            (sz,) = struct.unpack(">I", data[j:j + 4])
            body = data[j + 4:j + 4 + sz]
            if rid == 1025 or 2000 <= rid <= 2997 or rid == 4242:
                out[rid] = (name, body)
            i = j + 4 + sz + (sz % 2)
    except Exception:
        pass
    return out


def _desc_get(d, *keys):
    """Look up a key in a psd-tools descriptor whichever way it was decoded (bytes, str, Key enum)."""
    for k in keys:
        for cand in (k, k.encode() if isinstance(k, str) else k):
            try:
                if cand in d:
                    return d[cand]
            except Exception:
                pass
        try:
            for kk in d.keys():
                name = getattr(kk, "value", kk)
                name = name.decode("latin-1") if isinstance(name, bytes) else str(name)
                if name.strip() == k.strip() or name.endswith(k.strip()):
                    return d[kk]
        except Exception:
            pass
    return None


def _desc_rgb(d):
    c = _desc_get(d, "Clr ") if d is not None else None
    if c is None:
        return None
    if _desc_get(c, "Cyn ") is not None:  # CMYK colour (percent)
        try:
            return {"ink": [float(getattr(_desc_get(c, k), "value", _desc_get(c, k))) / 100.0 for k in ("Cyn ", "Mgnt", "Ylw ", "Blck")]}
        except Exception:
            return None
    vals = []
    for k in ("Rd  ", "Grn ", "Bl  "):
        v = _desc_get(c, k)
        if v is None:
            return None
        vals.append(float(getattr(v, "value", v)) / 255.0)
    return vals


def _read_psd(path):
    if PSDImage is None:
        raise RuntimeError("psd-tools is not installed")
    psd = PSDImage.open(path)
    W, H = psd.width, psd.height
    is_cmyk = int(getattr(psd.color_mode, "value", psd.color_mode)) == 4
    buffers = {}
    warnings = []
    counter = [0]

    def blend_of(layer):
        try:
            v = layer.blend_mode.value
            v = v.decode("latin-1") if isinstance(v, bytes) else str(v)
            return BLEND_FROM_PSD.get(v, "normal")
        except Exception:
            return "normal"

    def conv(layer):
        base = {"name": layer.name, "visible": bool(layer.visible), "opacity": layer.opacity / 255.0, "blend": blend_of(layer),
                "clip": bool(getattr(layer, "clipping", False))}
        if layer.is_group():
            return {**base, "kind": "group", "x": 0, "y": 0, "w": 0, "h": 0, "children": [c for c in (conv(ch) for ch in reversed(list(layer))) if c]}
        kind = getattr(layer, "kind", "pixel")
        if kind in ("brightnesscontrast", "curves", "exposure", "levels", "huesaturation", "colorbalance", "blackandwhite", "photofilter",
                    "channelmixer", "colorlookup", "invert", "posterize", "threshold", "selectivecolor", "gradientmap", "vibrance"):
            warnings.append(f'Adjustment layer "{layer.name}" was skipped (not yet imported)')
            return None
        try:
            arr = layer.numpy()
        except Exception as e:
            arr = None
            warnings.append(f'Layer "{layer.name}": {e}')
        if arr is None:
            try:
                pil = layer.composite()
                arr = np.asarray(pil) if pil is not None else None
            except Exception:
                arr = None
        l, t, r, bt = layer.bbox if layer.bbox else (0, 0, 0, 0)
        out = {**base, "kind": "raster", "x": int(l), "y": int(t), "w": int(r - l), "h": int(bt - t)}
        if arr is not None and arr.size and r > l and bt > t:
            bid = f"L{counter[0]}"; counter[0] += 1
            if is_cmyk:
                a = to_float(arr)
                if a.ndim == 3 and a.shape[2] >= 4:
                    img = cmyka(1.0 - a[..., :4], a[..., 4] if a.shape[2] > 4 else None)  # PSD keeps 1 − ink
                else:
                    img = cmyka(np.zeros(a.shape[:2] + (4,), np.float32), to_rgba(a)[..., 3])
            else:
                img = to_rgba(arr)
            buffers[bid] = img
            out["buffer"] = bid
        if kind == "type":
            warnings.append(f'Type layer "{layer.name}" imported as pixels')
        if kind == "smartobject":
            warnings.append(f'Smart object "{layer.name}" imported as pixels')
        # vector mask, and Photoshop shape layers (solid fill + vector mask + optional stroke)
        try:
            from psd_tools.constants import Tag
            tb = layer._record.tagged_blocks
            blk = None
            for t in (Tag.VECTOR_MASK_SETTING1, Tag.VECTOR_MASK_SETTING2):
                if tb is not None and t in tb:
                    blk = tb.get_data(t)
                    break
            if blk is not None:
                raw = blk.tobytes()
                out["vmask"] = {"records": base64.b64encode(raw[8:]).decode("ascii"), "enabled": not (struct.unpack(">I", raw[4:8])[0] & 2)}
                soco = tb.get_data(Tag.SOLID_COLOR_SHEET_SETTING) if Tag.SOLID_COLOR_SHEET_SETTING in tb else None
                if soco is not None:
                    fill = _desc_rgb(soco)
                    shape = {"fill": fill}
                    vstk = tb.get_data(Tag.VECTOR_STROKE_DATA) if Tag.VECTOR_STROKE_DATA in tb else None
                    if vstk is not None:
                        en = _desc_get(vstk, "strokeEnabled")
                        if en is None or bool(getattr(en, "value", en)):
                            w = _desc_get(vstk, "strokeStyleLineWidth")
                            shape["stroke"] = _desc_rgb(_desc_get(vstk, "strokeStyleContent"))
                            shape["strokeWidth"] = float(getattr(w, "value", w) or 0) if w is not None else 0
                            al = _desc_get(vstk, "strokeStyleLineAlignment")
                            al = str(getattr(al, "enum", al) or "")
                            shape["strokeAlign"] = "inside" if "Inside" in al else "outside" if "Outside" in al else "center"
                        fe = _desc_get(vstk, "fillEnabled")
                        if fe is not None and not bool(getattr(fe, "value", fe)):
                            shape["fill"] = None
                    out["shape"] = shape
        except Exception as e:
            warnings.append(f'Vector data of "{layer.name}": {e}')
        # layer mask
        try:
            if layer.has_mask() and layer.mask is not None and not getattr(layer.mask, "disabled", False):
                m = layer.mask
                ml, mt, mr, mb = m.bbox
                mimg = m.topil()
                if mimg is not None and mr > ml and mb > mt:
                    ma = np.asarray(mimg).astype(np.float32) / (65535.0 if np.asarray(mimg).dtype == np.uint16 else 255.0)
                    if ma.ndim == 3:
                        ma = ma[..., 0]
                    mid = f"M{counter[0]}"; counter[0] += 1
                    buffers[mid] = to_rgba(ma)
                    out["mask"] = {"x": int(ml), "y": int(mt), "w": int(mr - ml), "h": int(mb - mt), "buffer": mid, "default": float(getattr(m, "background_color", 255)) / 255.0}
        except Exception as e:
            warnings.append(f'Mask of "{layer.name}": {e}')
        return out

    layers = [c for c in (conv(l) for l in reversed(list(psd))) if c]
    if not layers:
        comp = psd.numpy() if is_cmyk else psd.composite()
        if comp is not None:
            img = cmyka(1.0 - to_float(comp)[..., :4]) if is_cmyk else to_rgba(np.asarray(comp))
            buffers["L0"] = img
            layers = [{"name": "Background", "kind": "raster", "visible": True, "opacity": 1, "blend": "normal", "x": 0, "y": 0, "w": W, "h": H, "buffer": "L0"}]
    depth = getattr(psd, "depth", 8)
    res = _psd_resources(path)
    result = {"width": W, "height": H, "bitDepth": 16 if depth == 16 else 32 if depth == 32 else 8, "layers": layers, "warnings": warnings}
    if is_cmyk:
        icc = None
        try:
            from psd_tools.constants import Resource
            icc = psd.image_resources.get_data(Resource.ICC_PROFILE)
        except Exception:
            icc = None
        prof, name = _cmyk_profile_of(bytes(icc) if icc else None)
        result["colorMode"] = "cmyk"
        result["profile"] = prof
        if name is None:
            warnings.append("No CMYK profile embedded: assuming Coated FOGRA39")
    result["paths"] = [{"name": res[k][0] or f"Path {k - 1999}", "records": base64.b64encode(res[k][1]).decode("ascii")} for k in sorted(res) if 2000 <= k <= 2997]
    if 1025 in res:
        result["workPath"] = base64.b64encode(res[1025][1]).decode("ascii")
    if 4242 in res:
        result["appData"] = res[4242][1].decode("utf-8", "replace")
    return result, buffers


def _icc_from_file(path) -> bytes | None:
    if Image is None:
        return None
    try:
        with Image.open(path) as im:
            return im.info.get("icc_profile")
    except Exception:
        return None


def _read_generic(path, ext):
    icc = None
    arr = None
    linear = False
    # CMYK files open as CMYK documents
    tiff_ok = ext in ("tif", "tiff") and tifffile is not None
    if tiff_ok:
        try:
            with tifffile.TiffFile(path) as tf:
                tf.pages[0].asarray()
        except Exception:  # noqa: BLE001  (a compression tifffile can't decode here: Pillow reads it below)
            tiff_ok = False
    if tiff_ok:
        with tifffile.TiffFile(path) as tf:
            page = tf.pages[0]
            if int(getattr(page, "photometric", 0) or 0) == 5:
                a = page.asarray()
                if a.ndim == 3 and a.shape[0] in (4, 5) and a.shape[2] not in (4, 5):
                    a = np.moveaxis(a, 0, -1)
                tag = page.tags.get(34675)
                bits = 16 if a.dtype.itemsize >= 2 else 8
                if a.ndim == 3 and a.shape[2] >= 4:
                    return _cmyk_result(cmyka(a), bytes(tag.value) if tag is not None else None, bits)
    if ext in ("jpg", "jpeg", "jpe") and Image is not None:
        with Image.open(path) as im:
            if im.mode == "CMYK":
                return _cmyk_result(cmyka(np.asarray(im)), im.info.get("icc_profile"), 8)
    if ext in ("tif", "tiff") and not tiff_ok and Image is not None:
        # TIFFs tifffile can't decode (rare compressions): Pillow, including CMYK ones
        with Image.open(path) as im:
            if im.mode == "CMYK":
                return _cmyk_result(cmyka(np.asarray(im)), im.info.get("icc_profile"), 8)
            icc = im.info.get("icc_profile")
            if im.mode not in ("RGB", "RGBA", "L", "LA", "I;16", "I;16B", "I", "F"):
                im = im.convert("RGBA")
            arr = np.asarray(im)
            if arr.dtype == np.int32:
                arr = (arr.astype(np.float32) / 65535.0)
    elif tiff_ok:
        with tifffile.TiffFile(path) as tf:
            page = tf.pages[0]
            arr = page.asarray()
            tag = page.tags.get(34675)
            if tag is not None:
                icc = bytes(tag.value)
            photometric = getattr(page, "photometric", None)
            if arr.ndim == 3 and arr.shape[0] in (3, 4) and arr.shape[2] not in (3, 4):
                arr = np.moveaxis(arr, 0, -1)
            if photometric is not None and int(photometric) == 5:  # CMYK
                if Image is None:
                    raise RuntimeError("CMYK TIFF needs Pillow")
                pil = Image.open(path).convert("RGB")
                arr = np.asarray(pil)
    elif ext == "exr" and OpenEXR is not None and hasattr(OpenEXR, "File"):
        with OpenEXR.File(path) as f:
            ch = f.channels()
            if "RGBA" in ch:
                arr = np.asarray(ch["RGBA"].pixels, np.float32)
            elif "RGB" in ch:
                arr = np.asarray(ch["RGB"].pixels, np.float32)
            elif all(k in ch for k in ("R", "G", "B")):
                parts = [np.asarray(ch[k].pixels, np.float32) for k in ("R", "G", "B")] + ([np.asarray(ch["A"].pixels, np.float32)] if "A" in ch else [])
                arr = np.dstack(parts)
            elif "Y" in ch:
                arr = np.asarray(ch["Y"].pixels, np.float32)
            else:
                k = next(iter(ch))
                arr = np.asarray(ch[k].pixels, np.float32)
        linear = True
    elif ext in ("exr", "hdr", "pfm") and cv2 is not None:
        arr = cv2.imread(path, cv2.IMREAD_UNCHANGED | cv2.IMREAD_ANYDEPTH | cv2.IMREAD_ANYCOLOR)
        if arr is None:
            raise RuntimeError("OpenCV could not read this file (OpenEXR support may be disabled)")
        if arr.ndim == 3:
            arr = arr[..., [2, 1, 0, 3][: arr.shape[2]]] if arr.shape[2] == 4 else arr[..., ::-1]
        linear = True
    elif cv2 is not None:
        arr = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        if arr is not None and arr.ndim == 3:
            arr = arr[..., [2, 1, 0, 3]] if arr.shape[2] == 4 else arr[..., ::-1]
        icc = _icc_from_file(path)
    if arr is None and Image is not None:
        with Image.open(path) as im:
            icc = im.info.get("icc_profile")
            if im.mode not in ("RGB", "RGBA", "L", "LA", "I;16", "I;16B", "I", "F"):
                im = im.convert("RGBA")
            arr = np.asarray(im)
            if arr.dtype == np.int32:
                arr = (arr.astype(np.float32) / 65535.0)
    if arr is None:
        raise RuntimeError("No decoder available for this file")
    bits = 32 if arr.dtype.kind == "f" else 16 if arr.dtype.itemsize >= 2 else 8
    img = to_rgba(arr)
    if linear:
        img[..., :3] = linear_to_srgb(img[..., :3])
    warnings = []
    if icc and not _is_srgb_icc(icc):
        img = convert_profile(img, icc, None)
        try:
            warnings.append("Converted from embedded profile " + ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(icc))).strip() + " to sRGB")
        except Exception:
            warnings.append("Converted from embedded ICC profile to sRGB")
    return layers_result({"width": img.shape[1], "height": img.shape[0], "bitDepth": bits, "layers": [{"name": "Background", "image": img}], "warnings": warnings})


def read_image(p, b):
    path = p["path"]
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    opts = p.get("options") or {}
    if ext in RAW_EXT:
        return _read_raw(path, opts)
    if ext in ("psd", "psb"):
        return _read_psd(path)
    return _read_generic(path, ext)


# --------------------------------------------------------------------------- writing
def _quantize(img, bits):
    if bits == 16:
        return np.clip(np.round(img * 65535.0), 0, 65535).astype(np.uint16)
    if bits == 8:
        # light dither to avoid banding when reducing from float
        noise = (np.random.default_rng(1).random(img.shape, dtype=np.float32) - 0.5) / 255.0
        return np.clip(np.round((img + noise) * 255.0), 0, 255).astype(np.uint8)
    return img.astype(np.float32)


def write_image(p, b):
    path, fmt = p["path"], p.get("format", "png")
    bits = int(p.get("bits", 8))
    img = to_rgba(b["image"])
    icc_choice = p.get("icc", "srgb")
    icc_bytes = None
    if icc_choice not in ("srgb", "none", None) and fmt != "exr":
        with open(icc_choice, "rb") as f:
            icc_bytes = f.read()
        img = convert_profile(img, None, icc_bytes)
    elif icc_choice == "srgb":
        icc_bytes = srgb_icc_bytes()
    has_alpha = bool((img[..., 3] < 0.999).any())
    if fmt == "exr":
        lin = img.copy()
        lin[..., :3] = srgb_to_linear(img[..., :3])
        if OpenEXR is not None and hasattr(OpenEXR, "File"):
            data = np.ascontiguousarray(lin if has_alpha else lin[..., :3], dtype=np.float32)
            hdr = {"compression": OpenEXR.ZIP_COMPRESSION, "type": OpenEXR.scanlineimage}
            with OpenEXR.File(hdr, {"RGBA" if has_alpha else "RGB": data}) as f:
                f.write(path)
            return True
        if cv2 is None:
            raise RuntimeError("OpenEXR export needs the OpenEXR or OpenCV Python package")
        bgr = lin[..., [2, 1, 0, 3]] if has_alpha else lin[..., [2, 1, 0]]
        if not cv2.imwrite(path, np.ascontiguousarray(bgr.astype(np.float32))):
            raise RuntimeError("OpenCV failed to write EXR")
        return True
    if fmt == "tiff":
        if tifffile is None:
            raise RuntimeError("TIFF export needs tifffile")
        data = _quantize(np.clip(img, 0, None) if bits == 32 else np.clip(img, 0, 1), bits)
        if not has_alpha:
            data = data[..., :3]
        extratags = [(34675, 7, len(icc_bytes), icc_bytes, True)] if icc_bytes else []
        tifffile.imwrite(path, np.ascontiguousarray(data), photometric="rgb", compression="zlib" if bits != 32 else None,
                         extrasamples=["unassalpha"] if has_alpha else None, extratags=extratags, metadata=None)
        return True
    if fmt == "png" and bits == 16:
        if cv2 is None:
            raise RuntimeError("16-bit PNG export needs OpenCV")
        data = _quantize(np.clip(img, 0, 1), 16)
        bgr = data[..., [2, 1, 0, 3]] if has_alpha else data[..., [2, 1, 0]]
        if not cv2.imwrite(path, np.ascontiguousarray(bgr)):
            raise RuntimeError("OpenCV failed to write PNG")
        return True
    if Image is None:
        raise RuntimeError("Pillow is required for this export")
    data = _quantize(np.clip(img, 0, 1), 8)
    mode = "RGBA" if has_alpha and fmt in ("png", "webp") else "RGB"
    pil = Image.fromarray(np.ascontiguousarray(data if mode == "RGBA" else data[..., :3]), mode)
    kw = {}
    if icc_bytes:
        kw["icc_profile"] = icc_bytes
    if fmt == "jpeg":
        if has_alpha:  # composite over white
            rgb = data[..., :3].astype(np.float32) / 255.0
            a = data[..., 3:4].astype(np.float32) / 255.0
            pil = Image.fromarray(np.round((rgb * a + (1 - a)) * 255).astype(np.uint8), "RGB")
        pil.save(path, "JPEG", quality=int(p.get("quality", 92)), subsampling=0 if int(p.get("quality", 92)) >= 90 else 2, optimize=True, **kw)
    elif fmt == "webp":
        pil.save(path, "WEBP", quality=int(p.get("quality", 92)), method=5, **kw)
    else:
        pil.save(path, "PNG", optimize=False, compress_level=6, **kw)
    return True


def psd_inspect(p, b=None):
    """What an independent reader (psd-tools) sees in a PSD: used by the tests to check vector data."""
    from psd_tools.constants import Tag
    psd = PSDImage.open(p["path"])
    shapes = vmasks = 0
    names = []
    for layer in psd.descendants():
        tb = layer._record.tagged_blocks
        has_vm = tb is not None and (Tag.VECTOR_MASK_SETTING1 in tb or Tag.VECTOR_MASK_SETTING2 in tb)
        if has_vm:
            vmasks += 1
            if Tag.SOLID_COLOR_SHEET_SETTING in tb:
                shapes += 1
                names.append(layer.name)
    res = _psd_resources(p["path"])
    return {"shapes": shapes, "vmasks": vmasks, "paths": sum(1 for k in res if 2000 <= k <= 2997), "workPath": 1025 in res,
            "appData": 4242 in res, "shapeNames": names[:10], "kinds": [getattr(l, "kind", "?") for l in psd.descendants()][:30]}


def write_psd(p, b):
    from brushboard.psd_writer import write_psd as _w
    cmyk = p.get("profile") is not None
    if cmyk:
        from brushboard import cmyk as _cm
        icc = _cm.icc_bytes(p["profile"])
    else:
        icc = srgb_icc_bytes()
    warnings = _w(p["path"], int(p["width"]), int(p["height"]), int(p.get("bits", 8)), p["layers"], b, icc,
                  paths=p.get("paths"), work_path=p.get("workPath"), app_data=p.get("appData"), cmyk=cmyk)
    return {"warnings": warnings}


# --------------------------------------------------------------------------- soft proofing
def list_profiles(p, b):
    dirs = ["/usr/share/color/icc", "/usr/local/share/color/icc", os.path.expanduser("~/.local/share/icc"), os.path.expanduser("~/.color/icc")]
    out = []
    seen = set()
    for d in dirs:
        for f in sorted(glob.glob(os.path.join(d, "**", "*.ic[cm]"), recursive=True)):
            if f in seen:
                continue
            seen.add(f)
            name = os.path.basename(f)
            if ImageCms is not None:
                try:
                    name = ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(f)).strip() or name
                except Exception:
                    pass
            out.append({"path": f, "name": name})
    return out


def proof_lut(p, b):
    if ImageCms is None:
        raise RuntimeError("Pillow ImageCms (LittleCMS) is not available")
    n = int(p.get("size", 33))
    intent = int(p.get("intent", 0))
    bpc = bool(p.get("bpc", True))
    srgb = ImageCms.createProfile("sRGB")
    dev = ImageCms.ImageCmsProfile(p["profile"])
    mode = _profile_mode(dev)
    grid, img = _grid(n)
    pil = Image.fromarray(img, "RGB")
    flags = ImageCms.Flags.BLACKPOINTCOMPENSATION if (bpc and hasattr(ImageCms, "Flags")) else (0x2000 if bpc else 0)
    # simulate: sRGB -> device -> sRGB
    fwd = ImageCms.buildTransform(srgb, dev, "RGB", mode if mode in ("RGB", "CMYK", "L") else "RGB", renderingIntent=intent, flags=flags)
    dev_img = ImageCms.applyTransform(pil, fwd)
    back = ImageCms.buildTransform(dev, srgb, dev_img.mode, "RGB", renderingIntent=1 if intent != 3 else 3, flags=flags)
    sim = np.asarray(ImageCms.applyTransform(dev_img, back)).astype(np.float32).reshape(-1, 3) / 255.0
    # gamut: colorimetric round trip error
    fwd_c = ImageCms.buildTransform(srgb, dev, "RGB", dev_img.mode, renderingIntent=1)
    back_c = ImageCms.buildTransform(dev, srgb, dev_img.mode, "RGB", renderingIntent=1)
    rt = np.asarray(ImageCms.applyTransform(ImageCms.applyTransform(pil, fwd_c), back_c)).astype(np.float32).reshape(-1, 3) / 255.0
    orig = img.reshape(-1, 3).astype(np.float32) / 255.0
    out_of_gamut = (np.abs(rt - orig).max(axis=1) > 3.5 / 255.0).astype(np.float32)
    lut = np.concatenate([sim, out_of_gamut[:, None]], axis=1).astype(np.float32)  # r fastest
    name = ImageCms.getProfileDescription(dev).strip()
    return {"name": name, "size": n}, {"lut": lut.reshape(1, -1, 4)}


def handlers():
    try:
        from brushboard import ai, heal
        extra = {**ai.handlers(), **heal.handlers()}
    except Exception as e:  # keep the core worker usable even if the AI module cannot load
        def _ai_missing(p, b, _e=str(e)):
            raise RuntimeError(f"Subject Snap is unavailable: {_e}")
        extra = {"ai_status": lambda p, b: {"engine": None, "error": str(e)}, "ai_download": _ai_missing, "ai_segment": _ai_missing,
                 "heal": _ai_missing, "heal_status": lambda p, b: {"ai": False, "texture": False, "error": str(e)}, "heal_download": _ai_missing}
    for mod in ("cmyk", "pdf", "gpupack"):
        try:
            extra.update(__import__(f"brushboard.{mod}", fromlist=["handlers"]).handlers())
        except Exception as e:  # pragma: no cover
            sys.stderr.write(f"brushboard.{mod} unavailable: {e}\n")
    return {**extra, "capabilities": capabilities, "read_image": read_image, "write_image": write_image, "write_psd": write_psd, "psd_inspect": psd_inspect,
            "list_profiles": list_profiles, "proof_lut": proof_lut}

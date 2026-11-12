"""CMYK colour management for BrushBoard: bundled press profiles, conversion tables for the editor, file I/O helpers.

Ink values are 0 (no ink) … 1 (100 %). Inside the editor a CMYK layer keeps two planes:
  plane A = (1−C, 1−M, 1−Y, alpha)   plane K = (1−K, 1−K, 1−K, alpha)
which is also how Photoshop stores CMYK in PSD files (255 = no ink).
"""
from __future__ import annotations

import glob
import io
import os

import numpy as np

try:
    from PIL import Image, ImageCms
except Exception:  # pragma: no cover
    Image = ImageCms = None

HERE = os.path.dirname(os.path.abspath(__file__))
BUNDLED = os.path.join(HERE, "profiles")
# id → (file, description, default total ink limit %)
PRESETS = {
    "fogra39": ("fogra39.icc", "Coated FOGRA39 (ISO 12647-2:2004)", 300),
    "fogra47": ("fogra47.icc", "Uncoated FOGRA47 (PSO Uncoated)", 300),
    "gracol2006": ("gracol2006.icc", "U.S. GRACoL 2006 Coated", 300),
    "swop5": ("swop5.icc", "U.S. Web Coated SWOP (TR005)", 300),
    "snap2": ("snap2.icc", "U.S. Newsprint SNAP (TR002)", 260),
}
SYSTEM_DIRS = ["/usr/share/color/icc", "/usr/local/share/color/icc", os.path.expanduser("~/.local/share/icc"), os.path.expanduser("~/.color/icc")]


def _need():
    if ImageCms is None:
        raise RuntimeError("CMYK needs Pillow with LittleCMS (ImageCms) in the Python helper.")


def resolve(profile: str) -> str:
    """Profile id ('fogra39'), bundled file name, or a path → path on disk."""
    if profile in PRESETS:
        return os.path.join(BUNDLED, PRESETS[profile][0])
    if os.path.isfile(profile):
        return profile
    p = os.path.join(BUNDLED, profile)
    if os.path.isfile(p):
        return p
    raise FileNotFoundError(f"CMYK profile not found: {profile}")


def _open(profile):
    if isinstance(profile, (bytes, bytearray)):
        return ImageCms.ImageCmsProfile(io.BytesIO(bytes(profile)))
    return ImageCms.ImageCmsProfile(resolve(profile))


def _mode(prof) -> str:
    try:
        return prof.profile.xcolor_space.strip()
    except Exception:
        return "?"


def list_cmyk_profiles(p=None, b=None):
    out = []
    for pid, (f, desc, tac) in PRESETS.items():
        path = os.path.join(BUNDLED, f)
        if os.path.isfile(path):
            out.append({"id": pid, "path": path, "name": desc, "tac": tac, "bundled": True})
    seen = set()
    if ImageCms is not None:
        for d in SYSTEM_DIRS:
            for f in sorted(glob.glob(os.path.join(d, "**", "*.ic[cm]"), recursive=True)):
                if f in seen:
                    continue
                seen.add(f)
                try:
                    pr = ImageCms.ImageCmsProfile(f)
                    if _mode(pr) != "CMYK":
                        continue
                    out.append({"id": f, "path": f, "name": ImageCms.getProfileDescription(pr).strip() or os.path.basename(f), "tac": 300, "bundled": False})
                except Exception:
                    pass
    return out


def _flags(bpc: bool):
    if not bpc:
        return 0
    return ImageCms.Flags.BLACKPOINTCOMPENSATION if hasattr(ImageCms, "Flags") else 0x2000


def ink_luts(p, b=None):
    """Conversion tables between sRGB and the CMYK profile.
    rgb2ink: (n³ × 4) ink values, red fastest;  ink2rgb: (17⁴ × 3) sRGB, cyan fastest then M, Y, K."""
    _need()
    prof = _open(p["profile"])
    if _mode(prof) != "CMYK":
        raise ValueError("That profile is not a CMYK output profile.")
    srgb = ImageCms.createProfile("sRGB")
    intent = int(p.get("intent", 1))  # relative colorimetric
    bpc = bool(p.get("bpc", True))
    n = int(p.get("size", 33))
    t = np.linspace(0, 255, n)
    B, G, R = np.meshgrid(t, t, t, indexing="ij")
    rgb = np.stack([R, G, B], -1).reshape(1, -1, 3).round().astype(np.uint8)
    to_cmyk = ImageCms.buildTransform(srgb, prof, "RGB", "CMYK", renderingIntent=intent, flags=_flags(bpc))
    ink = np.asarray(ImageCms.applyTransform(Image.fromarray(rgb, "RGB"), to_cmyk)).reshape(-1, 4).astype(np.float32) / 255.0
    m = 17
    s = np.linspace(0, 255, m)
    K, Y, M, C = np.meshgrid(s, s, s, s, indexing="ij")
    cm = np.stack([C, M, Y, K], -1).reshape(1, -1, 4).round().astype(np.uint8)
    to_rgb = ImageCms.buildTransform(prof, srgb, "CMYK", "RGB", renderingIntent=1, flags=_flags(True))
    back = np.asarray(ImageCms.applyTransform(Image.fromarray(cm, "CMYK"), to_rgb)).reshape(-1, 3).astype(np.float32) / 255.0
    name = ImageCms.getProfileDescription(prof).strip()
    return {"name": name, "path": resolve(p["profile"]), "rgbSize": n, "inkSize": m}, {
        "rgb2ink": ink.reshape(1, -1, 4), "ink2rgb": back.reshape(1, -1, 3)}


def save_embedded(icc: bytes) -> str:
    """Keep an ICC profile that came embedded in a file, so the editor can refer to it by path."""
    import hashlib
    import tempfile
    d = os.path.join(tempfile.gettempdir(), "brushboard-icc")
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, hashlib.sha1(icc).hexdigest()[:16] + ".icc")
    if not os.path.isfile(path):
        with open(path, "wb") as f:
            f.write(icc)
    return path


# ------------------------------------------------------------------ whole-image conversion (file I/O, mode changes)
def rgb_to_cmyk(rgba: np.ndarray, profile, intent: int = 1, bpc: bool = True) -> np.ndarray:
    """Straight float RGBA (H,W,4) sRGB → CMYKA ink values 0..1 (H,W,5), exact LittleCMS transform."""
    _need()
    prof = _open(profile)
    srgb = ImageCms.createProfile("sRGB")
    t = ImageCms.buildTransform(srgb, prof, "RGB", "CMYK", renderingIntent=intent, flags=_flags(bpc))
    rgb8 = np.clip(np.round(rgba[..., :3] * 255), 0, 255).astype(np.uint8)
    out = np.asarray(ImageCms.applyTransform(Image.fromarray(rgb8, "RGB"), t)).astype(np.float32) / 255.0
    return np.concatenate([out, rgba[..., 3:4]], -1)


def cmyk_to_rgb(cmyka: np.ndarray, profile, intent: int = 1, bpc: bool = True) -> np.ndarray:
    _need()
    prof = _open(profile)
    srgb = ImageCms.createProfile("sRGB")
    t = ImageCms.buildTransform(prof, srgb, "CMYK", "RGB", renderingIntent=intent, flags=_flags(bpc))
    c8 = np.clip(np.round(cmyka[..., :4] * 255), 0, 255).astype(np.uint8)
    out = np.asarray(ImageCms.applyTransform(Image.fromarray(c8, "CMYK"), t)).astype(np.float32) / 255.0
    a = cmyka[..., 4:5] if cmyka.shape[-1] > 4 else np.ones(cmyka.shape[:-1] + (1,), np.float32)
    return np.concatenate([out, a], -1)


def icc_bytes(profile) -> bytes:
    if isinstance(profile, (bytes, bytearray)):
        return bytes(profile)
    return open(resolve(profile), "rb").read()


def profile_name(icc: bytes) -> str:
    try:
        return ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(icc))).strip()
    except Exception:
        return "Embedded CMYK profile"


# ------------------------------------------------------------------ writing CMYK files
def _q(a: np.ndarray, bits: int) -> np.ndarray:
    if bits >= 16:
        return np.clip(np.round(a * 65535.0), 0, 65535).astype(np.uint16)
    return np.clip(np.round(a * 255.0), 0, 255).astype(np.uint8)


def write_cmyk(p, b):
    """Write a CMYK image: buffer `image` = (H,W,5) ink values C, M, Y, K, alpha. Formats: tiff, jpeg, pdf."""
    path, fmt = p["path"], p.get("format", "tiff")
    bits = 16 if int(p.get("bits", 8)) >= 16 else 8
    img = np.clip(np.asarray(b["image"], np.float32), 0, 1)
    if img.shape[2] < 5:
        img = np.dstack([img[..., :4], np.ones(img.shape[:2], np.float32)])
    icc = icc_bytes(p["profile"])
    alpha = img[..., 4:5]
    has_alpha = bool((alpha < 0.999).any())
    if fmt == "tiff":
        import tifffile
        if has_alpha and p.get("keepAlpha", True):
            data = _q(img, bits)
            extras = ["unassalpha"]
        else:
            data = _q(img[..., :4] * alpha, bits)  # over paper
            extras = None
        tifffile.imwrite(path, np.ascontiguousarray(data), photometric="separated", compression="zlib",
                         extrasamples=extras, extratags=[(34675, 7, len(icc), icc, True)], metadata=None)
        return True
    if fmt == "jpeg":
        _need()
        data = _q(img[..., :4] * alpha, 8)
        Image.fromarray(np.ascontiguousarray(data), "CMYK").save(path, "JPEG", quality=int(p.get("quality", 92)),
                                                                 subsampling=0 if int(p.get("quality", 92)) >= 90 else 2, icc_profile=icc)
        return True
    if fmt == "pdf":
        from brushboard.pdf import write_image_pdf
        write_image_pdf(path, img[..., :4] * alpha, "cmyk", icc, profile_name(icc), float(p.get("dpi", 300)), bits, title=p.get("title", ""))
        return True
    raise ValueError(f"CMYK export to {fmt} is not supported")


def handlers():
    def store(p, b=None):
        import base64
        icc = base64.b64decode(p["icc"])
        return {"path": save_embedded(icc), "name": profile_name(icc)}

    def read_icc(p, b=None):
        import base64
        return {"icc": base64.b64encode(icc_bytes(p["profile"])).decode("ascii")}

    return {"cmyk_profiles": list_cmyk_profiles, "cmyk_luts": ink_luts, "write_cmyk": write_cmyk, "cmyk_store_icc": store, "cmyk_read_icc": read_icc}

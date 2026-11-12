"""A small PDF writer for one image per page: DeviceCMYK with the press profile as output intent,
or sRGB (ICC-based). Used by Export As › PDF."""
from __future__ import annotations

import datetime
import zlib

import numpy as np


def _esc(s: str) -> bytes:
    """PDF text string: UTF-16BE with BOM when needed, otherwise escaped Latin-1."""
    try:
        b = s.encode("latin-1")
        return b"(" + b.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)") + b")"
    except UnicodeEncodeError:
        return b"<FEFF" + s.encode("utf-16-be").hex().upper().encode("ascii") + b">"


def write_image_pdf(path: str, img: np.ndarray, space: str, icc: bytes | None, profile_name: str | None, dpi: float, bits: int = 8, title: str = ""):
    """img: (H,W,4) ink values 0..1 for 'cmyk', (H,W,3) sRGB 0..1 for 'rgb' (already flattened)."""
    h, w = img.shape[:2]
    n = 4 if space == "cmyk" else 3
    bits = 16 if bits >= 16 else 8
    if bits == 16:
        raw = np.clip(np.round(img[..., :n] * 65535.0), 0, 65535).astype(">u2").tobytes()
    else:
        raw = np.clip(np.round(img[..., :n] * 255.0), 0, 255).astype(np.uint8).tobytes()
    data = zlib.compress(raw, 6)
    wpt, hpt = w * 72.0 / dpi, h * 72.0 / dpi
    objs: list[bytes] = []

    def add(b: bytes) -> int:
        objs.append(b)
        return len(objs)

    def stream(d: dict, payload: bytes) -> bytes:
        d = dict(d)
        d[b"/Length"] = str(len(payload)).encode()
        return _dict(d) + b"\nstream\n" + payload + b"\nendstream"

    icc_ref = None
    if icc:
        icc_ref = add(stream({b"/N": str(n).encode(), b"/Filter": b"/FlateDecode"}, zlib.compress(icc, 6)))
    cs = b"/DeviceCMYK" if space == "cmyk" else (f"[/ICCBased {icc_ref} 0 R]".encode() if icc_ref else b"/DeviceRGB")
    img_ref = add(stream({b"/Type": b"/XObject", b"/Subtype": b"/Image", b"/Width": str(w).encode(), b"/Height": str(h).encode(),
                          b"/ColorSpace": cs, b"/BitsPerComponent": str(bits).encode(), b"/Filter": b"/FlateDecode"}, data))
    content = f"q {wpt:.4f} 0 0 {hpt:.4f} 0 0 cm /Im0 Do Q".encode()
    content_ref = add(stream({}, content))
    pages_ref = len(objs) + 2  # page is added next, then pages
    box = f"[0 0 {wpt:.4f} {hpt:.4f}]".encode()
    page_ref = add(_dict({b"/Type": b"/Page", b"/Parent": f"{pages_ref} 0 R".encode(), b"/MediaBox": box, b"/TrimBox": box,
                          b"/Resources": _dict({b"/XObject": _dict({b"/Im0": f"{img_ref} 0 R".encode()})}),
                          b"/Contents": f"{content_ref} 0 R".encode()}))
    add(_dict({b"/Type": b"/Pages", b"/Kids": f"[{page_ref} 0 R]".encode(), b"/Count": b"1"}))
    cat = {b"/Type": b"/Catalog", b"/Pages": f"{pages_ref} 0 R".encode()}
    if space == "cmyk" and icc_ref:
        ident = _esc(profile_name or "CMYK")
        oi = add(_dict({b"/Type": b"/OutputIntent", b"/S": b"/GTS_PDFX", b"/OutputConditionIdentifier": ident, b"/Info": ident,
                        b"/DestOutputProfile": f"{icc_ref} 0 R".encode()}))
        cat[b"/OutputIntents"] = f"[{oi} 0 R]".encode()
    cat_ref = add(_dict(cat))
    now = datetime.datetime.now().strftime("D:%Y%m%d%H%M%S")
    info_ref = add(_dict({b"/Producer": _esc("BrushBoard"), b"/Creator": _esc("BrushBoard"), b"/Title": _esc(title or ""), b"/CreationDate": _esc(now)}))

    out = bytearray(b"%PDF-1.6\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += b"trailer\n" + _dict({b"/Size": str(len(objs) + 1).encode(), b"/Root": f"{cat_ref} 0 R".encode(), b"/Info": f"{info_ref} 0 R".encode()})
    out += f"\nstartxref\n{xref}\n%%EOF\n".encode()
    with open(path, "wb") as f:
        f.write(out)


def _dict(d: dict) -> bytes:
    return b"<< " + b" ".join(k + b" " + v for k, v in d.items()) + b" >>"


def write_pdf(p, b):
    """RGB documents: buffer `image` = (H,W,4) sRGB + alpha, flattened over white."""
    from brushboard.core import srgb_icc_bytes
    img = np.clip(np.asarray(b["image"], np.float32), 0, 1)
    a = img[..., 3:4] if img.shape[2] > 3 else 1.0
    rgb = img[..., :3] * a + (1 - a)
    write_image_pdf(p["path"], rgb, "rgb", srgb_icc_bytes(), "sRGB IEC61966-2.1", float(p.get("dpi", 300)), int(p.get("bits", 8)), title=p.get("title", ""))
    return True


def handlers():
    return {"write_pdf": write_pdf}

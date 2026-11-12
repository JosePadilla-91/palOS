"""Minimal, spec-following layered PSD writer (RGB or CMYK, 8 or 16 bits/channel, groups, masks, blend modes)."""
from __future__ import annotations

import base64
import struct

import numpy as np

from brushboard.core import BLEND_TO_PSD


def _pascal(name: str, pad: int = 4) -> bytes:
    raw = name.encode("mac_roman", "replace")[:255]
    b = bytes([len(raw)]) + raw
    while len(b) % pad:
        b += b"\x00"
    return b


def _unicode_block(name: str) -> bytes:
    data = struct.pack(">I", len(name)) + name.encode("utf-16-be")
    if len(data) % 2:
        data += b"\x00\x00"
    return b"8BIMluni" + struct.pack(">I", len(data)) + data


def _lsct_block(kind: int, blend: str | None = None) -> bytes:
    data = struct.pack(">I", kind)
    if blend:
        data += b"8BIM" + blend.encode("latin-1")
    return b"8BIMlsct" + struct.pack(">I", len(data)) + data


def _key(k: str) -> bytes:
    b = k.encode("latin-1")
    return (struct.pack(">I", 0) + b) if len(b) == 4 else (struct.pack(">I", len(b)) + b)


def _uni_str(s: str) -> bytes:
    return struct.pack(">I", len(s) + 1) + s.encode("utf-16-be") + b"\x00\x00"


def _soco_block(color) -> bytes:
    """Solid colour fill (what Photoshop's shape layers are made of): version 16 + descriptor {Clr: RGBC or CMYC}.
    `color` is [r, g, b] (0..1) or {"ink": [c, m, y, k]} (0..1)."""
    d = struct.pack(">I", 16) + _uni_str("") + _key("null") + struct.pack(">I", 1)
    if isinstance(color, dict) and color.get("ink") is not None:
        ink = color["ink"]
        d += _key("Clr ") + b"Objc" + _uni_str("") + _key("CMYC") + struct.pack(">I", 4)
        for k, v in (("Cyn ", ink[0]), ("Mgnt", ink[1]), ("Ylw ", ink[2]), ("Blck", ink[3])):
            d += _key(k) + b"doub" + struct.pack(">d", float(max(0.0, min(1.0, v))) * 100.0)
    else:
        rgb = color
        d += _key("Clr ") + b"Objc" + _uni_str("") + _key("RGBC") + struct.pack(">I", 3)
        for k, v in (("Rd  ", rgb[0]), ("Grn ", rgb[1]), ("Bl  ", rgb[2])):
            d += _key(k) + b"doub" + struct.pack(">d", float(max(0.0, min(1.0, v))) * 255.0)
    while len(d) % 2:
        d += b"\x00"
    return b"8BIMSoCo" + struct.pack(">I", len(d)) + d


def _vmsk_block(records: bytes, disabled: bool = False) -> bytes:
    """Vector mask: version 3, flags (bit 1 = disabled), Photoshop path records."""
    data = struct.pack(">II", 3, 2 if disabled else 0) + records
    return b"8BIMvmsk" + struct.pack(">I", len(data)) + data


def _bbox(alpha: np.ndarray):
    ys, xs = np.nonzero(alpha > 0)
    if not len(ys):
        return None
    return int(ys.min()), int(xs.min()), int(ys.max()) + 1, int(xs.max()) + 1


class _Rec:
    def __init__(self):
        self.record = b""
        self.channels: list[bytes] = []


def _samples(arr: np.ndarray, bits: int) -> bytes:
    if bits == 16:
        return np.clip(np.round(arr * 65535.0), 0, 65535).astype(">u2").tobytes()
    return np.clip(np.round(arr * 255.0), 0, 255).astype(np.uint8).tobytes()


def _layer_record(name: str, img: np.ndarray | None, mask: np.ndarray | None, opacity: float, blend: str, visible: bool,
                  clip: bool, bits: int, section: int | None = None, mask_enabled: bool = True,
                  vmask: bytes | None = None, vmask_disabled: bool = False, soco=None, cmyk: bool = False) -> _Rec:
    rec = _Rec()
    na = 4 if cmyk else 3  # index of alpha; CMYK layers carry ink values C, M, Y, K, alpha
    if img is not None:
        bb = _bbox(img[..., na])
    else:
        bb = None
    top, left, bottom, right = bb if bb else (0, 0, 0, 0)
    chans: list[tuple[int, bytes]] = []
    ids = [-1] + list(range(na))
    if bb:
        sub = img[top:bottom, left:right]
        for cid in ids:
            ch = sub[..., na] if cid < 0 else (1.0 - sub[..., cid] if cmyk else sub[..., cid])  # PSD stores CMYK as 1 − ink
            chans.append((cid, struct.pack(">H", 0) + _samples(ch, bits)))
    else:
        for cid in ids:
            chans.append((cid, struct.pack(">H", 0)))
    mask_data = b""
    if mask is not None:
        m = mask
        mb = _bbox(1.0 - m) or (0, 0, 1, 1)
        mt, ml, mbt, mr = mb
        sub = m[mt:mbt, ml:mr]
        chans.append((-2, struct.pack(">H", 0) + _samples(sub, bits)))
        flags = 0 if mask_enabled else 2
        mask_data = struct.pack(">iiiiBB", mt, ml, mbt, mr, 255, flags) + b"\x00\x00"
    r = struct.pack(">iiii", top, left, bottom, right)
    r += struct.pack(">H", len(chans))
    for cid, data in chans:
        r += struct.pack(">hI", cid, len(data))
    key = BLEND_TO_PSD.get(blend, "norm")
    if section is None and key == "pass":
        key = "norm"
    r += b"8BIM" + key.encode("latin-1")
    flags = 0x08  # bit 3: photoshop 5+
    if not visible:
        flags |= 0x02
    if section is not None and section == 3:
        flags |= 0x10  # pixel data irrelevant
    r += struct.pack(">BBBB", int(round(max(0, min(1, opacity)) * 255)), 1 if clip else 0, flags, 0)
    extra = struct.pack(">I", len(mask_data)) + mask_data
    extra += struct.pack(">I", 0)  # blending ranges
    extra += _pascal(name)
    extra += _unicode_block(name)
    if section is not None:
        extra += _lsct_block(section, key if section in (1, 2) else None)
    if soco is not None:
        extra += _soco_block(soco)
    if vmask is not None:
        extra += _vmsk_block(vmask, vmask_disabled)
    r += struct.pack(">I", len(extra)) + extra
    rec.record = r
    rec.channels = [d for _, d in chans]
    return rec


def _resource(rid: int, name: str, data: bytes) -> bytes:
    nm = name.encode("mac_roman", "replace")[:255]
    pn = bytes([len(nm)]) + nm
    if len(pn) % 2:
        pn += b"\x00"
    body = data + (b"\x00" if len(data) % 2 else b"")
    return b"8BIM" + struct.pack(">H", rid) + pn + struct.pack(">I", len(data)) + body


def write_psd(path: str, width: int, height: int, bits: int, layers: list, buffers: dict, icc: bytes | None = None,
              paths: list | None = None, work_path: str | None = None, app_data: str | None = None, cmyk: bool = False) -> list:
    """layers: top-first tree of dicts {kind, name, visible, opacity, blend, clip, buffer, mask, children}."""
    bits = 16 if bits >= 16 else 8
    warnings: list[str] = []
    recs: list[_Rec] = []

    def img_of(bid):
        a = buffers.get(bid)
        if a is None:
            return None
        a = np.asarray(a, np.float32)
        if cmyk:
            if a.shape[2] < 5:
                a = np.dstack([a[..., :4], np.ones(a.shape[:2], np.float32)])
            return np.clip(a, 0, 1)
        if a.shape[2] < 4:
            a = np.dstack([a[..., :3], np.ones(a.shape[:2], np.float32)])
        # Photoshop stores straight colour; clear colour where fully transparent for compactness
        return np.clip(a, 0, 1)

    def emit(ls: list):
        # PSD order is bottom-to-top
        for l in reversed(ls):
            if l.get("kind") == "group":
                recs.append(_layer_record("</Layer group>", None, None, 1, "normal", True, False, bits, section=3, cmyk=cmyk))
                emit(l.get("children", []))
                recs.append(_layer_record(l.get("name", "Group"), None, None, l.get("opacity", 1), l.get("blend", "passThrough"),
                                          l.get("visible", True), False, bits, section=1, cmyk=cmyk))
            else:
                img = img_of(l.get("buffer"))
                mask = None
                if l.get("mask"):
                    m = buffers.get(l["mask"])
                    if m is not None:
                        mask = np.clip(np.asarray(m, np.float32)[..., 0], 0, 1)
                vm = base64.b64decode(l["vmask"]) if l.get("vmask") else None
                recs.append(_layer_record(l.get("name", "Layer"), img, mask, l.get("opacity", 1), l.get("blend", "normal"),
                                          l.get("visible", True), bool(l.get("clip")), bits, mask_enabled=l.get("maskEnabled", True),
                                          vmask=vm, vmask_disabled=not l.get("vmaskEnabled", True), soco=l.get("soco"), cmyk=cmyk))

    emit(layers)

    # ---- layer info block
    li = struct.pack(">h", len(recs))
    for r in recs:
        li += r.record
    for r in recs:
        for c in r.channels:
            li += c
    while len(li) % 4:
        li += b"\x00"

    out = bytearray()
    out += b"8BPS" + struct.pack(">H", 1) + b"\x00" * 6
    out += struct.pack(">HIIHH", 4 if cmyk else 3, height, width, bits, 4 if cmyk else 3)
    out += struct.pack(">I", 0)  # colour mode data
    # image resources: ICC profile (1039)
    res = b""
    if icc:
        data = icc + (b"\x00" if len(icc) % 2 else b"")
        res += b"8BIM" + struct.pack(">H", 1039) + b"\x00\x00" + struct.pack(">I", len(icc)) + data
    # saved paths (2000+), the work path (1025), and BrushBoard's own vector data (plug-in resource 4242)
    for i, p in enumerate((paths or [])[:998]):
        res += _resource(2000 + i, p.get("name", f"Path {i + 1}"), base64.b64decode(p["records"]))
    if work_path:
        res += _resource(1025, "", base64.b64decode(work_path))
    if app_data:
        res += _resource(4242, "BrushBoard", app_data.encode("utf-8"))
    out += struct.pack(">I", len(res)) + res
    # layer & mask information
    if bits == 8:
        lm = struct.pack(">I", len(li)) + li + struct.pack(">I", 0)
    else:
        block = b"8BIMLr16" + struct.pack(">I", len(li)) + li
        lm = struct.pack(">I", 0) + struct.pack(">I", 0) + block
    out += struct.pack(">I", len(lm)) + lm
    # merged image (planar R, G, B or C, M, Y, K), raw
    comp = buffers.get("composite")
    if comp is None:
        comp = np.zeros((height, width, 5 if cmyk else 4), np.float32)
    comp = np.clip(np.asarray(comp, np.float32), 0, 1)
    out += struct.pack(">H", 0)
    if cmyk:
        a = comp[..., 4:5]
        ink = comp[..., :4] * a  # over paper (no ink)
        for c in range(4):
            out += _samples(1.0 - ink[..., c], bits)
    else:
        a = comp[..., 3:4]
        rgb = comp[..., :3] * a + (1 - a)  # flatten over white like Photoshop's "maximize compatibility"
        for c in range(3):
            out += _samples(rgb[..., c], bits)
    with open(path, "wb") as f:
        f.write(out)
    return warnings

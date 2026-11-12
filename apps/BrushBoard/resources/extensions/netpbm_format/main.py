"""Netpbm & PFM — an example file format handler in pure NumPy."""
import re
import numpy as np
import brushboard as g


def _tokens(data, count, pos):
    out = []
    while len(out) < count:
        m = re.compile(rb"\s*(#[^\n]*\n\s*)*(\S+)").match(data, pos)
        out.append(m.group(2)); pos = m.end()
    return out, pos + 1


@g.file_format("Portable Pixmap (PPM/PGM)", extensions=["ppm", "pgm", "pnm"])
class Netpbm(g.FileFormat):
    def read(self, path):
        data = open(path, "rb").read()
        magic = data[:2]
        if magic not in (b"P5", b"P6"):
            raise ValueError("Only binary PGM (P5) / PPM (P6) are supported")
        (w, h, mx), pos = _tokens(data, 3, 2)
        w, h, mx = int(w), int(h), int(mx)
        ch = 3 if magic == b"P6" else 1
        dt = ">u2" if mx > 255 else np.uint8
        arr = np.frombuffer(data, dtype=dt, count=w * h * ch, offset=pos).reshape(h, w, ch).astype(np.float32) / mx
        return np.dstack([arr] * 3) if ch == 1 else arr

    def write(self, path, image):
        rgb = np.clip(image[..., :3], 0, 1)
        data = np.round(rgb * 65535).astype(">u2")
        h, w = data.shape[:2]
        with open(path, "wb") as f:
            f.write(f"P6\n{w} {h}\n65535\n".encode())
            f.write(data.tobytes())


@g.file_format("Portable Float Map (PFM)", extensions=["pfm"])
class PFM(g.FileFormat):
    def read(self, path):
        data = open(path, "rb").read()
        (kind, w, h, scale), pos = _tokens(data, 4, 0)
        ch = 3 if kind == b"PF" else 1
        w, h, scale = int(w), int(h), float(scale)
        dt = "<f4" if scale < 0 else ">f4"
        arr = np.frombuffer(data, dtype=dt, count=w * h * ch, offset=pos).reshape(h, w, ch)[::-1].astype(np.float32)
        arr = np.sign(arr) * np.where(np.abs(arr) <= 0.0031308, np.abs(arr) * 12.92, 1.055 * np.abs(arr) ** (1 / 2.4) - 0.055)  # linear -> sRGB
        return np.dstack([arr] * 3) if ch == 1 else arr

    def write(self, path, image):
        rgb = image[..., :3].astype(np.float32)
        a = np.abs(rgb)
        lin = np.sign(rgb) * np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
        h, w = rgb.shape[:2]
        with open(path, "wb") as f:
            f.write(f"PF\n{w} {h}\n-1.0\n".encode())
            f.write(np.ascontiguousarray(lin[::-1]).astype("<f4").tobytes())

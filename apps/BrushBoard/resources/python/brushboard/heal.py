"""
Content-aware healing for BrushBoard's Spot Healing Brush and Content-Aware Fill.

Engines (all local):
* ``ai``      — LaMa (large-mask inpainting, ONNX, ~92 MB from the OpenCV model zoo). Understands structure:
                continues edges, rebuilds backgrounds, removes whole objects.
* ``texture`` — multi-scale PatchMatch completion (Wexler et al.): rebuilds the hole from real patches
                found nearby, so skin pores, fabric, grass and walls keep their texture.
* ``smooth``  — Telea diffusion, for tiny specks.

The AI result is re-grained with a local texture transfer so it doesn't look smoother than the photo.
"""
from __future__ import annotations

import hashlib
import os
import time
import urllib.request

import numpy as np

try:
    import cv2
except Exception:  # pragma: no cover
    cv2 = None
try:
    import onnxruntime as ort
except Exception:  # pragma: no cover
    ort = None

from brushboard.ai import models_dirs, _progress

LAMA = {
    "name": "LaMa inpainting",
    "file": "lama.onnx",
    "url": "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/inpainting_lama/inpainting_lama_2025jan.onnx",
    "sha256": "7df918ac3921d3daf0aae1d219776cf0dc4e4935f035af81841b40adcf74fdf2",
    "size": 92591623,
    "input": 512,
}
_sess = None


def lama_path():
    for d in models_dirs():
        p = os.path.join(d, LAMA["file"])
        if os.path.isfile(p) and os.path.getsize(p) == LAMA["size"]:
            return p
    return None


def status(p=None, b=None):
    try:
        from . import accel
        acc = accel.info()
    except Exception as e:
        acc = {"error": str(e)}
    return {"ai": bool(lama_path() and ort is not None), "modelPath": lama_path(), "modelSize": LAMA["size"],
            "texture": True, "opencv": cv2 is not None, "accel": acc}


def download(p=None, b=None):
    dest_dir = models_dirs()[0]
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, LAMA["file"])
    if os.path.isfile(dest) and os.path.getsize(dest) == LAMA["size"]:
        return status()
    tmp = dest + ".part"
    h = hashlib.sha256()
    with urllib.request.urlopen(urllib.request.Request(LAMA["url"], headers={"User-Agent": "BrushBoard/1.2"}), timeout=60) as r, open(tmp, "wb") as f:
        total = int(r.headers.get("Content-Length") or LAMA["size"])
        done, last = 0, 0.0
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk); h.update(chunk); done += len(chunk)
            if time.time() - last > 0.25:
                last = time.time()
                _progress(done / total, f"Downloading healing model {done >> 20}/{total >> 20} MB")
    _progress(1, "")
    if h.hexdigest() != LAMA["sha256"]:
        os.unlink(tmp)
        raise RuntimeError("The downloaded healing model failed its checksum; please try again.")
    os.replace(tmp, dest)
    global _sess
    _sess = None
    return status()


def _session():
    global _sess
    if _sess is None:
        path = lama_path()
        if not path or ort is None:
            return None
        from . import accel
        # GPUs cannot run the compact block-quantized model: with a GPU pack, use the full-precision copy
        # the pack made (same weights). Without one, the compact model runs on the CPU.
        if accel.has_gpu():
            try:
                from .gpupack import fp32_heal_model
                fp = fp32_heal_model()
            except Exception:
                fp = None
            if fp:
                _sess, dev = accel.session(fp)
                if dev != "cpu":
                    return _sess
        _sess, _ = accel.session(path) if not accel.has_gpu() else (accel.GuardedSession(accel._cpu_session(path, None), path, None, "cpu"), "cpu")
    return _sess


# --------------------------------------------------------------------------- helpers
def _resize(a, w, h, interp=None):
    if interp is None:
        interp = cv2.INTER_AREA if (w < a.shape[1]) else cv2.INTER_CUBIC
    return cv2.resize(a, (w, h), interpolation=interp)


def _blur(a, sigma):
    if sigma <= 0:
        return a
    k = int(sigma * 3) * 2 + 1
    return cv2.GaussianBlur(a, (k, k), sigma)


def _dilate(m, r):
    if r <= 0:
        return m
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    return cv2.dilate(m, k)


# --------------------------------------------------------------------------- engine: LaMa
def _lama(rgb: np.ndarray, hole: np.ndarray) -> np.ndarray:
    """rgb (h,w,3) 0..1, hole (h,w) bool → filled rgb at the same size."""
    sess = _session()
    S = LAMA["input"]
    h, w = hole.shape
    # LaMa works best at the photo's own scale: never upscale a small crop (that blurs the context and
    # yields flat grey fills). Shrink big crops to fit, keep the aspect ratio, and reflect-pad to S×S.
    k = min(1.0, S / max(h, w))
    hs, ws = max(1, int(round(h * k))), max(1, int(round(w * k)))
    xs = _resize(np.clip(rgb, 0, 1).astype(np.float32), ws, hs) if (hs, ws) != (h, w) else np.clip(rgb, 0, 1).astype(np.float32)
    ms = _resize(hole.astype(np.float32), ws, hs, cv2.INTER_LINEAR) if (hs, ws) != (h, w) else hole.astype(np.float32)
    py, px = (S - hs) // 2, (S - ws) // 2
    # mirror the mask with the image so the reflected copies of the object are holes too — otherwise LaMa
    # sees the object all around the hole and faithfully paints it back in
    bt = cv2.BORDER_REFLECT_101 if min(hs, ws) > 1 else cv2.BORDER_REPLICATE
    x = cv2.copyMakeBorder(xs, py, S - hs - py, px, S - ws - px, bt)
    m = cv2.copyMakeBorder((ms > 0.01).astype(np.float32), py, S - hs - py, px, S - ws - px, bt)
    m = _dilate(m, 2)
    x = x * (1.0 - m[..., None])
    out = sess.run(None, {"image": np.ascontiguousarray(x.transpose(2, 0, 1)[None]), "mask": m[None, None]})[0][0].transpose(1, 2, 0)
    out = np.clip(out / 255.0, 0, 1).astype(np.float32)
    # LaMa occasionally emits small bright/coloured specks in large holes. Find compact blobs inside the hole
    # that differ strongly from a wide median and paint them over with that median.
    u8 = (out * 255).astype(np.uint8)
    med = cv2.medianBlur(u8, 21).astype(np.float32) / 255
    dev = np.abs(out - med).max(-1)
    cand = ((dev > 0.1) & (m > 0)).astype(np.uint8)
    cand[:py] = 0; cand[py + hs:] = 0; cand[:, :px] = 0; cand[:, px + ws:] = 0
    n, lab, stats, _ = cv2.connectedComponentsWithStats(_dilate(cand, 1), 8)
    bad = np.zeros_like(cand)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 900:
            bad[lab == i] = 1
    bad = _dilate(bad, 3).astype(np.float32)
    bad = _blur(bad, 1.5)[..., None]
    out = out * (1 - bad) + med * bad
    out = out[py:py + hs, px:px + ws]
    return out if (hs, ws) == (h, w) else _resize(out, w, h, cv2.INTER_CUBIC)


# --------------------------------------------------------------------------- engine: PatchMatch completion
def _patch_dist(img, tgt, src, P):
    """Sum of squared differences between patches centred at tgt[i] and src[i] (int coords, (N,2))."""
    H, W = img.shape[:2]
    r = P // 2
    d = np.zeros(len(tgt), np.float32)
    for dy in range(-r, r + 1):
        ty = np.clip(tgt[:, 0] + dy, 0, H - 1); sy = np.clip(src[:, 0] + dy, 0, H - 1)
        for dx in range(-r, r + 1):
            tx = np.clip(tgt[:, 1] + dx, 0, W - 1); sx = np.clip(src[:, 1] + dx, 0, W - 1)
            diff = img[ty, tx] - img[sy, sx]
            d += (diff * diff).sum(-1)
    return d


def _patchmatch_level(img, hole, valid, nnf, P, iters, rng):
    """One scale of Wexler completion: alternate PatchMatch search and patch voting inside the hole."""
    H, W = hole.shape
    r = P // 2
    ys, xs = np.nonzero(_dilate(hole.astype(np.uint8), r) > 0)
    tgt = np.stack([ys, xs], 1)
    vy, vx = np.nonzero(valid)
    if len(vy) == 0:
        return img, nnf
    def clamp_valid(c):
        c[:, 0] = np.clip(c[:, 0], 0, H - 1); c[:, 1] = np.clip(c[:, 1], 0, W - 1)
        bad = ~valid[c[:, 0], c[:, 1]]
        if bad.any():
            j = rng.integers(0, len(vy), bad.sum())
            c[bad] = np.stack([vy[j], vx[j]], 1)
        return c
    cur = clamp_valid(nnf[ys, xs].copy())
    for _ in range(iters):
        cost = _patch_dist(img, tgt, cur, P)
        # propagation (parallel jump-flood style): try neighbours' offsets
        for step in (8, 4, 2, 1):
            for (oy, ox) in ((step, 0), (-step, 0), (0, step), (0, -step)):
                ny = np.clip(ys + oy, 0, H - 1); nx = np.clip(xs + ox, 0, W - 1)
                cand = nnf[ny, nx] - np.array([oy, ox])
                cand = clamp_valid(cand)
                c2 = _patch_dist(img, tgt, cand, P)
                better = c2 < cost
                cur[better] = cand[better]; cost[better] = c2[better]
                nnf[ys, xs] = cur
        # random search around the current match with shrinking radius
        rad = max(H, W)
        while rad >= 1:
            cand = cur + rng.integers(-rad, rad + 1, cur.shape)
            cand = clamp_valid(cand)
            c2 = _patch_dist(img, tgt, cand, P)
            better = c2 < cost
            cur[better] = cand[better]; cost[better] = c2[better]
            rad //= 2
        nnf[ys, xs] = cur
        # voting: every hole pixel = weighted mean of the source pixels its overlapping patches propose
        acc = np.zeros((H, W, img.shape[2]), np.float32)
        wsum = np.zeros((H, W), np.float32)
        wt = np.exp(-cost / (np.median(cost) + 1e-6) * 0.5).astype(np.float32)
        for dy in range(-r, r + 1):
            ty = ys + dy; sy = cur[:, 0] + dy
            for dx in range(-r, r + 1):
                tx = xs + dx; sx = cur[:, 1] + dx
                ok = (ty >= 0) & (ty < H) & (tx >= 0) & (tx < W) & (sy >= 0) & (sy < H) & (sx >= 0) & (sx < W)
                np.add.at(acc, (ty[ok], tx[ok]), img[sy[ok], sx[ok]] * wt[ok, None])
                np.add.at(wsum, (ty[ok], tx[ok]), wt[ok])
        filled = acc / np.maximum(wsum, 1e-6)[..., None]
        img = np.where(hole[..., None] & (wsum[..., None] > 0), filled, img)
    return img, nnf


def _patchmatch(rgb: np.ndarray, hole: np.ndarray, seed=1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    H, W = hole.shape
    P = 7
    # pyramid down until the hole is a few patches wide
    levels = []
    img, m = rgb.astype(np.float32), hole.astype(np.uint8)
    def hole_span(mm):
        ys, xs = np.nonzero(mm)
        return max(np.ptp(ys), np.ptp(xs)) + 1 if len(ys) else 0
    # stop while the hole is still a few patches across and the image keeps enough context
    while min(img.shape[:2]) >= 2 * 96 and hole_span(m) > 4 * P:
        levels.append((img, m))
        h2, w2 = max(8, img.shape[0] // 2), max(8, img.shape[1] // 2)
        img = _resize(img, w2, h2, cv2.INTER_AREA)
        m = (_resize(m.astype(np.float32), w2, h2, cv2.INTER_LINEAR) > 0.01).astype(np.uint8)
    levels.append((img, m))
    nnf = None
    out = None
    for li in range(len(levels) - 1, -1, -1):
        lim, lm = levels[li]
        h, w = lm.shape
        holeb = lm > 0
        valid = cv2.erode((~holeb).astype(np.uint8), np.ones((P, P), np.uint8)) > 0
        valid[: P // 2, :] = False; valid[-(P // 2):, :] = False; valid[:, : P // 2] = False; valid[:, -(P // 2):] = False
        if not valid.any():
            valid = ~holeb
        cur = lim.copy()
        if out is None:  # coarsest: start from a smooth diffusion fill
            seed8 = np.clip(cur * 255, 0, 255).astype(np.uint8)
            cur[holeb] = cv2.inpaint(seed8, holeb.astype(np.uint8), 3, cv2.INPAINT_TELEA)[holeb].astype(np.float32) / 255
            yy, xx = np.mgrid[0:h, 0:w]
            nnf = np.stack([yy, xx], -1).astype(np.int64)
            iters = 6
        else:
            up = _resize(out, w, h, cv2.INTER_LINEAR)
            cur[holeb] = up[holeb]
            ph, pw = nnf.shape[:2]
            yy = np.clip(np.arange(h) * ph // h, 0, ph - 1); xx = np.clip(np.arange(w) * pw // w, 0, pw - 1)
            nnf = (nnf[yy][:, xx] * np.array([h / ph, w / pw])).astype(np.int64)
            iters = 3 if li > 0 else 2
        out, nnf = _patchmatch_level(cur, holeb, valid, nnf, P, iters, rng)
    return out


# --------------------------------------------------------------------------- re-graining & blending
def _match_grain(fill, ref, hole, strength=0.75):
    """Give a smooth AI fill the high-frequency texture statistics of the surrounding photo."""
    lo_f = _blur(fill, 1.4)
    ring = (_dilate(hole.astype(np.uint8), 12) > 0) & ~hole
    if ring.sum() < 50:
        return fill
    hf_ref = ref - _blur(ref, 1.4)
    # robust spread (MAD): leftover edges of the removed object in the ring must not read as "grain"
    def _sd(a):
        return 1.4826 * np.median(np.abs(a - np.median(a, 0)), 0) + 1e-5
    sd_ref = _sd(hf_ref[ring])
    hf_fill = fill - lo_f
    sd_fill = _sd(hf_fill[hole]) if hole.any() else sd_ref
    gain = np.clip(sd_ref / sd_fill, 1.0, 3.0)
    out = lo_f + hf_fill * (1 + (gain - 1) * strength)
    # where the fill is flatter than the photo, add fine luminance grain of the same strength
    missing = np.sqrt(np.clip(sd_ref ** 2 - (sd_fill * gain) ** 2, 0, None)).mean()
    if missing > 1e-3:
        rng = np.random.default_rng(3)
        n = _blur(rng.standard_normal(hole.shape).astype(np.float32), 0.6)
        n /= max(float(n.std()), 1e-6)
        out = out + (n * missing * strength)[..., None] * hole[..., None]
    return out


def heal(p, b):
    """
    buffers: source (h,w,4) — what to look at (layer or composite crop)
             layer  (h,w,4) — the target layer's current pixels in the same crop
             mask   (h,w,1) — 0..1 area to replace
    params:  engine 'ai'|'texture'|'smooth'|'auto', grain bool
    returns  {engine, ms}, {image: (h,w,4) final layer pixels}
    """
    if cv2 is None:
        raise RuntimeError("Healing needs OpenCV in the Python helper.")
    t0 = time.time()
    src = b["source"].astype(np.float32)
    layer = b["layer"].astype(np.float32)
    m = np.clip(b["mask"][..., 0], 0, 1).astype(np.float32)
    hole = m > 0.02
    if not hole.any():
        return {"engine": "none", "ms": 0}, {"image": layer}
    engine = p.get("engine", "auto")
    if engine in ("auto", "ai") and _session() is None:
        engine = "texture" if engine == "auto" else "texture"
    if engine == "auto":
        engine = "ai"
    a = src[..., 3:4]
    rgb = src[..., :3] * a + (1 - a) * (src[..., :3] * a).sum((0, 1)) / max(a.sum(), 1e-6)  # flatten transparency with the mean colour
    hole_soft = _dilate(hole.astype(np.uint8), 1) > 0
    if engine == "ai":
        fill = _lama(rgb, hole_soft)
        if p.get("grain", True):
            fill = _match_grain(fill, rgb, hole_soft)
    elif engine == "texture":
        # PatchMatch cost grows with area: work at ≤ 640 px and upsample, re-adding detail from the result
        H, W = hole.shape
        k = min(1.0, 640.0 / max(H, W))
        if k < 1:
            small = _resize(rgb, int(W * k), int(H * k))
            sh = (_resize(hole_soft.astype(np.float32), small.shape[1], small.shape[0], cv2.INTER_LINEAR) > 0.01)
            fill = _resize(_patchmatch(small, sh), W, H, cv2.INTER_CUBIC)
            fill = _match_grain(fill, rgb, hole_soft)
        else:
            fill = _patchmatch(rgb, hole_soft)
    else:
        img8 = np.clip(rgb * 255, 0, 255).astype(np.uint8)
        fill = cv2.inpaint(img8, hole_soft.astype(np.uint8), 5, cv2.INPAINT_TELEA).astype(np.float32) / 255
    # feathered blend into the target layer: fully replaced inside, soft at the painted edge
    w = np.clip(_blur(np.maximum(m, hole.astype(np.float32) * 0.999), 1.0) * 1.25, 0, 1)[..., None]
    out = layer.copy()
    la = layer[..., 3:4]
    out[..., :3] = layer[..., :3] * (1 - w) + fill * w
    out[..., 3:4] = la * (1 - w) + w  # healing onto an empty layer creates pixels there
    return {"engine": engine, "ms": int((time.time() - t0) * 1000)}, {"image": out}


if __name__ == "__main__":  # python -m brushboard.heal → place the LaMa model in BRUSHBOARD_MODELS (or the user dir)
    import shutil
    target = models_dirs()[0]
    dest = os.path.join(target, LAMA["file"])
    if os.path.isfile(dest) and os.path.getsize(dest) == LAMA["size"]:
        print(f"Healing model already in place: {dest}")
    elif lama_path():
        os.makedirs(target, exist_ok=True); shutil.copyfile(lama_path(), dest); print(f"Copied healing model to {dest}")
    else:
        print(f"Downloading {LAMA['name']} ({LAMA['size'] >> 20} MB) to {target}")
        print(download()["modelPath"])


def handlers():
    return {"heal": heal, "heal_status": status, "heal_download": download}

"""
Subject Snap — BrushBoard's small, fully local "dumb-bot" for finding people.

* Primary engine: U²-Net human segmentation (ONNX, ~176 MB, CPU via onnxruntime).
  The 320×320 prediction is upsampled and refined against the full-resolution photo with a
  guided filter, so the outline snaps to real edges (hair, fingers, clothing).
* Fallback engine (no model / no onnxruntime): OpenCV people + face detection seeding GrabCut.

Nothing ever leaves the machine. The model is downloaded once (setup script or the in-app button)
into ~/.local/share/brushboard/models and verified by SHA-256.
"""
from __future__ import annotations

import hashlib
import os
import sys
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

MODEL = {
    "id": "u2net_human_seg",
    "name": "U²-Net Human Segmentation",
    "file": "u2net_human_seg.onnx",
    "url": "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx",
    "sha256": "01eb6a29a5c4d8edb30b56adad9bb3a2a0535338e480724a213e0acfd2d1c73c",
    "size": 175997641,
    "input": 320,
}

_session = None
_cache: dict = {}


def models_dirs() -> list[str]:
    dirs = []
    if os.environ.get("BRUSHBOARD_MODELS"):
        dirs.append(os.environ["BRUSHBOARD_MODELS"])
    dirs.append(os.path.join(os.path.expanduser("~"), ".local", "share", "brushboard", "models"))
    here = os.path.dirname(os.path.abspath(__file__))
    dirs.append(os.path.normpath(os.path.join(here, "..", "..", "models")))  # bundled next to resources/python
    return dirs


def user_models_dir() -> str:
    return os.path.join(os.path.expanduser("~"), ".local", "share", "brushboard", "models")


def model_path() -> str | None:
    for d in models_dirs():
        p = os.path.join(d, MODEL["file"])
        if os.path.isfile(p) and os.path.getsize(p) == MODEL["size"]:
            return p
    return None


def status(p=None, b=None):
    path = model_path()
    return {
        "engine": "model" if (path and ort is not None) else ("opencv" if cv2 is not None else None),
        "onnxruntime": getattr(ort, "__version__", None) if ort else None,
        "opencv": getattr(cv2, "__version__", None) if cv2 else None,
        "model": MODEL["name"],
        "modelPath": path,
        "modelSize": MODEL["size"],
        "downloadDir": models_dirs()[0],
        "accel": _accel_info(),
    }


def _accel_info():
    try:
        from . import accel
        return accel.info()
    except Exception as e:
        return {"error": str(e)}


def _progress(value: float, text: str):
    if not os.environ.get("BRUSHBOARD_BUF_DIR"):  # running from a terminal (setup script)
        sys.stderr.write(f"\r{text or 'done'}   ")
        sys.stderr.flush()
        return
    try:
        from brushboard.worker import rpc
        rpc.host("host.progress", {"value": value, "text": text})
    except Exception:
        pass


def download(p=None, b=None):
    """Download the model with progress and verify its checksum."""
    dest_dir = status()["downloadDir"]
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, MODEL["file"])
    if os.path.isfile(dest) and os.path.getsize(dest) == MODEL["size"]:
        return status()
    tmp = dest + ".part"
    h = hashlib.sha256()
    req = urllib.request.Request(MODEL["url"], headers={"User-Agent": "BrushBoard/1.1"})
    with urllib.request.urlopen(req, timeout=60) as r, open(tmp, "wb") as f:
        total = int(r.headers.get("Content-Length") or MODEL["size"])
        done = 0
        last = 0.0
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
            h.update(chunk)
            done += len(chunk)
            if time.time() - last > 0.25:
                last = time.time()
                _progress(done / total, f"Downloading Subject Snap model {done >> 20}/{total >> 20} MB")
    _progress(1, "")
    if h.hexdigest() != MODEL["sha256"]:
        os.unlink(tmp)
        raise RuntimeError("The downloaded model failed its checksum; please try again.")
    os.replace(tmp, dest)
    global _session
    _session = None
    return status()


# --------------------------------------------------------------------------- helpers
def _resize(a: np.ndarray, w: int, h: int, interp: str = "linear") -> np.ndarray:
    if cv2 is not None:
        flag = {"linear": cv2.INTER_LINEAR, "area": cv2.INTER_AREA, "cubic": cv2.INTER_CUBIC}[interp]
        return cv2.resize(a, (w, h), interpolation=flag)
    from PIL import Image
    if a.ndim == 2:
        return np.asarray(Image.fromarray(a.astype(np.float32), "F").resize((w, h), Image.BILINEAR))
    return np.dstack([_resize(a[..., c], w, h) for c in range(a.shape[2])])


def _box(a: np.ndarray, r: int) -> np.ndarray:
    if cv2 is not None:
        return cv2.boxFilter(a, -1, (2 * r + 1, 2 * r + 1), borderType=cv2.BORDER_REFLECT)
    out = a.astype(np.float64)
    for axis in (0, 1):
        pad = [(0, 0)] * out.ndim
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(out, pad, mode="edge"), axis=axis)
        n = out.shape[axis]
        out = (np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, np.arange(n), axis=axis)) / (2 * r + 1)
    return out.astype(np.float32)


def guided_filter(guide_rgb: np.ndarray, p: np.ndarray, r: int, eps: float) -> np.ndarray:
    """Colour guided filter (He et al.) — makes a soft mask follow the photo's real edges."""
    I = guide_rgb.astype(np.float32)
    p = p.astype(np.float32)
    mI = _box(I, r)
    mp = _box(p, r)
    mIp = _box(I * p[..., None], r)
    covIp = mIp - mI * mp[..., None]
    # 3×3 covariance of I per pixel
    var = np.empty(I.shape[:2] + (3, 3), np.float32)
    for i in range(3):
        for j in range(i, 3):
            v = _box(I[..., i] * I[..., j], r) - mI[..., i] * mI[..., j]
            var[..., i, j] = v
            var[..., j, i] = v
    var += np.eye(3, dtype=np.float32) * eps
    a = np.linalg.solve(var, covIp[..., None])[..., 0]
    bb = mp - (a * mI).sum(-1)
    return (_box(a, r) * I).sum(-1) + _box(bb, r)


def _smoothstep(e0, e1, x):
    t = np.clip((x - e0) / max(e1 - e0, 1e-6), 0, 1)
    return t * t * (3 - 2 * t)


def _session_get():
    global _session
    if _session is None:
        path = model_path()
        if not path or ort is None:
            return None
        from . import accel
        _session, _ = accel.session(path)
    return _session


def _run_model(rgb: np.ndarray) -> tuple[np.ndarray, float]:
    """rgb float32 (H,W,3) 0..1 → (probability (H,W), raw peak)."""
    sess = _session_get()
    S = MODEL["input"]
    h, w = rgb.shape[:2]
    x = _resize(np.clip(rgb, 0, 1), S, S, "area" if max(h, w) > S else "linear")
    x = x / max(float(x.max()), 1e-6)
    x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32)
    x = np.ascontiguousarray(x.transpose(2, 0, 1)[None].astype(np.float32))
    out = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
    peak = float(out.max())
    lo, hi = float(out.min()), peak
    prob = (out - lo) / max(hi - lo, 1e-6)
    return _resize(prob.astype(np.float32), w, h, "cubic"), peak


def _grabcut(rgb: np.ndarray, rect: tuple[int, int, int, int] | None, prior: np.ndarray | None = None) -> np.ndarray:
    img8 = np.clip(np.round(rgb * 255), 0, 255).astype(np.uint8)[..., ::-1].copy()
    h, w = img8.shape[:2]
    k = min(1.0, 640.0 / max(h, w))  # GrabCut is slow: work at ≤ 640 px
    small = cv2.resize(img8, (max(1, int(w * k)), max(1, int(h * k))), interpolation=cv2.INTER_AREA) if k < 1 else img8
    sh, sw = small.shape[:2]
    mask = np.zeros((sh, sw), np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    if prior is not None:
        pr = cv2.resize(prior, (sw, sh))
        mask[:] = cv2.GC_PR_BGD
        mask[pr > 0.5] = cv2.GC_PR_FGD
        mask[pr > 0.9] = cv2.GC_FGD
        mask[pr < 0.05] = cv2.GC_BGD
        cv2.grabCut(small, mask, None, bgd, fgd, 4, cv2.GC_INIT_WITH_MASK)
    else:
        x, y, rw, rh = rect
        r = (int(x * k), int(y * k), max(2, int(rw * k)), max(2, int(rh * k)))
        cv2.grabCut(small, mask, r, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
    m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1.0, 0.0).astype(np.float32)
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR)


def _detect_people(rgb: np.ndarray) -> list[tuple[int, int, int, int]]:
    img8 = np.clip(np.round(rgb * 255), 0, 255).astype(np.uint8)
    gray = cv2.cvtColor(img8, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape
    boxes = []
    if hasattr(cv2, "HOGDescriptor"):  # OpenCV 4.x; removed from the main module in 5.x
        hog = cv2.HOGDescriptor()
        hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        k = min(1.0, 800.0 / max(h, w))
        g2 = cv2.resize(gray, (int(w * k), int(h * k))) if k < 1 else gray
        rects, _ = hog.detectMultiScale(g2, winStride=(8, 8), padding=(16, 16), scale=1.05)
        for (x, y, rw, rh) in rects:
            boxes.append((int(x / k), int(y / k), int(rw / k), int(rh / k)))
    if not boxes:
        casc = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml") if hasattr(cv2, "data") else ""
        if casc and os.path.exists(casc) and hasattr(cv2, "CascadeClassifier"):
            faces = cv2.CascadeClassifier(casc).detectMultiScale(gray, 1.1, 5, minSize=(24, 24))
            for (x, y, fw, fh) in faces:  # grow a face into an approximate head-and-body box
                bx, by = max(0, x - fw), max(0, y - fh // 2)
                boxes.append((bx, by, min(w - bx, fw * 3), min(h - by, fh * 7)))
    return boxes


def _keep_components(mask: np.ndarray, seed_pt=None, box=None) -> np.ndarray:
    """Drop blobs that are not the person the user pointed at."""
    if cv2 is None:
        return mask
    hard = (mask > 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
    if n <= 2:
        return mask
    keep = np.zeros(n, bool)
    if seed_pt is not None:
        x, y = seed_pt
        idx = lab[min(max(int(y), 0), mask.shape[0] - 1), min(max(int(x), 0), mask.shape[1] - 1)]
        if idx == 0:  # clicked just outside: take the nearest blob
            ys, xs = np.nonzero(hard)
            if len(ys) == 0:
                return mask * 0
            j = np.argmin((xs - x) ** 2 + (ys - y) ** 2)
            idx = lab[ys[j], xs[j]]
        keep[idx] = True
    elif box is not None:
        bx, by, bw, bh = box
        inner = np.zeros_like(hard)
        inner[max(0, by):by + bh, max(0, bx):bx + bw] = 1
        for i in range(1, n):
            inside = int(((lab == i) & (inner > 0)).sum())
            if inside >= 0.35 * stats[i, cv2.CC_STAT_AREA] and stats[i, cv2.CC_STAT_AREA] > 0.002 * hard.size:
                keep[i] = True
    else:
        areas = stats[1:, cv2.CC_STAT_AREA]
        big = areas.max()
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] >= 0.04 * big:
                keep[i] = True
    km = keep[lab].astype(np.float32)
    km = cv2.dilate(km, np.ones((9, 9), np.uint8))  # keep the soft fringe around kept blobs
    return mask * km


def _refine(rgb, prob, edge, hardness):
    h, w = prob.shape
    if edge:
        r = int(max(2, round(max(h, w) / 220)))
        prob = np.clip(guided_filter(np.clip(rgb, 0, 1), prob, r, 1e-4 if edge == "fine" else 4e-3), 0, 1)
    lo = 0.5 - 0.48 * (1 - hardness)
    hi = 0.5 + 0.48 * (1 - hardness)
    return _smoothstep(lo, hi, prob).astype(np.float32)


# --------------------------------------------------------------------------- main entry
def segment(p, b):
    """
    params: box [x, y, w, h] (optional), point [x, y] (optional), edge 'fine'|'smooth'|None,
            hardness 0..1, key (cache key for whole-image runs)
    buffers: image (H, W, 4)
    returns {engine, found, peak, bbox}, {mask: (H, W)}
    """
    t0 = time.time()
    img = b["image"]
    rgb = img[..., :3] * img[..., 3:4] + (1 - img[..., 3:4])  # flatten over white for the model
    H, W = rgb.shape[:2]
    box = p.get("box")
    point = p.get("point")
    edge = p.get("edge", "fine")
    hardness = float(p.get("hardness", 0.5))
    sess = _session_get()
    engine = "model" if sess is not None else "opencv"
    if engine == "opencv" and cv2 is None:
        raise RuntimeError("Subject Snap needs onnxruntime + the model, or OpenCV. Run Extensions › Manage Extensions › Set up Python environment.")
    mask = np.zeros((H, W), np.float32)
    peak = 1.0

    if box:
        bx, by, bw, bh = [int(round(v)) for v in box]
        bx, by = max(0, bx), max(0, by)
        bw, bh = min(W - bx, bw), min(H - by, bh)
        if bw < 4 or bh < 4:
            raise RuntimeError("Drag a larger box around the person.")
        pad = int(0.12 * max(bw, bh))
        x0, y0, x1, y1 = max(0, bx - pad), max(0, by - pad), min(W, bx + bw + pad), min(H, by + bh + pad)
        crop = rgb[y0:y1, x0:x1]
        if engine == "model":
            prob, peak = _run_model(crop)
        else:
            prob = _grabcut(crop, (bx - x0, by - y0, bw, bh))
        prob = _refine(crop, prob, edge, hardness)
        # fade out what lies outside the user's box (soft margin = half the padding)
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        m = max(1.0, pad * 0.5)
        dx = np.maximum(np.maximum(bx - xx, xx - (bx + bw)), 0)
        dy = np.maximum(np.maximum(by - yy, yy - (by + bh)), 0)
        prob *= np.clip(1 - np.hypot(dx, dy) / m, 0, 1)
        mask[y0:y1, x0:x1] = prob
        mask = _keep_components(mask, None, (bx, by, bw, bh))
    else:
        key = p.get("key")
        cached = _cache.get(key) if key else None
        if cached is not None and cached[0].shape == (H, W) and cached[2] == (edge, hardness):
            mask, peak = cached[0].copy(), cached[1]
        else:
            if engine == "model":
                # whole image at 320 px loses small people: also refine each detected region at higher resolution
                prob, peak = _run_model(rgb)
                if max(H, W) > 900:
                    hard = (prob > 0.5).astype(np.uint8)
                    if cv2 is not None and hard.any():
                        n, lab, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
                        for i in range(1, n):
                            x, y, w_, h_, area = stats[i]
                            if area < 0.0015 * H * W:
                                continue
                            pad = int(0.15 * max(w_, h_))
                            x0, y0, x1, y1 = max(0, x - pad), max(0, y - pad), min(W, x + w_ + pad), min(H, y + h_ + pad)
                            sub, _ = _run_model(rgb[y0:y1, x0:x1])
                            prob[y0:y1, x0:x1] = np.maximum(prob[y0:y1, x0:x1] * 0.25, sub)
            else:
                boxes = _detect_people(rgb)
                if not boxes:  # the dumbest bot: assume the subject is roughly centred
                    boxes = [(int(W * 0.15), int(H * 0.06), int(W * 0.7), int(H * 0.92))]
                prob = np.zeros((H, W), np.float32)
                for (x, y, w_, h_) in boxes[:4]:
                    prob = np.maximum(prob, _grabcut(rgb, (x, y, w_, h_)))
            mask = _refine(rgb, prob, edge, hardness)
            if key:
                _cache.clear()
                _cache[key] = (mask.copy(), peak, (edge, hardness))
        if point is not None:
            mask = _keep_components(mask, point, None)
        else:
            mask = _keep_components(mask)

    found = bool((mask > 0.5).sum() > 0.0005 * H * W) and (engine != "model" or peak > 0.25)
    ys, xs = np.nonzero(mask > 0.5)
    bbox = [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)] if len(xs) else None
    return {"engine": engine, "found": found, "peak": peak, "bbox": bbox, "ms": int((time.time() - t0) * 1000)}, {"mask": mask[..., None]}


if __name__ == "__main__":  # python -m brushboard.ai  → put the model in BRUSHBOARD_MODELS (or the user dir)
    import shutil
    target = models_dirs()[0]
    dest = os.path.join(target, MODEL["file"])
    if os.path.isfile(dest) and os.path.getsize(dest) == MODEL["size"]:
        print(f"Subject Snap model already in place: {dest}")
    elif model_path():
        os.makedirs(target, exist_ok=True)
        shutil.copyfile(model_path(), dest)
        print(f"Copied Subject Snap model to {dest}")
    else:
        print(f"Downloading {MODEL['name']} ({MODEL['size'] >> 20} MB) to {target}")
        print(download()["modelPath"])


def handlers():
    return {"ai_status": status, "ai_download": download, "ai_segment": segment}

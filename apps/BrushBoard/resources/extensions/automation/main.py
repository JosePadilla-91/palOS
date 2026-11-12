"""Automation — batch commands that drive BrushBoard from Python."""
import os
import numpy as np
import brushboard as g

try:
    from PIL import Image
except ImportError:
    Image = None

IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp")


def _save_png(path, rgba):
    if Image is None:
        raise RuntimeError("Pillow is required (Extensions › Manage Extensions › Set up Python environment)")
    data = np.clip(np.round(rgba * 255), 0, 255).astype(np.uint8)
    Image.fromarray(data, "RGBA").save(path)


def _walk(layers, out, prefix=""):
    for l in layers:
        if l["kind"] == "group":
            _walk(l["children"], out, prefix + l["name"] + " - ")
        elif l["kind"] in ("raster", "text"):
            out.append((l["id"], prefix + l["name"]))


@g.command("Export Layers as PNG…", menu="Automation", params={"trim": g.Bool(True, label="Trim transparent pixels")})
def export_layers(ctx, trim=True):
    doc = ctx.document
    if not doc:
        raise RuntimeError("No document open")
    folder = ctx.choose_folder("Export layers to…")
    if not folder:
        return None
    items = []
    _walk(doc["layers"], items)
    for i, (lid, name) in enumerate(items):
        ctx.progress(i / max(1, len(items)), f"Exporting {name}")
        img = ctx.layer_pixels(lid)
        if trim:
            ys, xs = np.nonzero(img[..., 3] > 0)
            if not len(ys):
                continue
            img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        safe = "".join(c if c.isalnum() or c in " -_." else "_" for c in name).strip() or f"layer{i}"
        _save_png(os.path.join(folder, f"{i:02d} {safe}.png"), img)
    ctx.progress(1, "")
    return f"Exported {len(items)} layers to {folder}"


@g.command("Batch Resize Folder…", menu="Automation", params={"max_size": g.Int(16, 16000, 2048, label="Longest side", unit="px"),
                                                              "fmt": g.Choice([("same", "Keep format"), ("jpg", "JPEG"), ("png", "PNG"), ("webp", "WebP")], "same", label="Format"),
                                                              "quality": g.Int(1, 100, 90, label="JPEG/WebP quality")})
def batch_resize(ctx, max_size=2048, fmt="same", quality=90):
    if Image is None:
        raise RuntimeError("Pillow is required")
    src = ctx.choose_folder("Folder with images to resize")
    if not src:
        return None
    dst = os.path.join(src, f"resized-{max_size}")
    os.makedirs(dst, exist_ok=True)
    files = [f for f in sorted(os.listdir(src)) if f.lower().endswith(IMAGE_EXT)]
    for i, f in enumerate(files):
        ctx.progress(i / max(1, len(files)), f)
        with Image.open(os.path.join(src, f)) as im:
            im.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            base, ext = os.path.splitext(f)
            ext = ext if fmt == "same" else "." + fmt
            if ext.lower() in (".jpg", ".jpeg") and im.mode in ("RGBA", "LA", "P"):
                im = im.convert("RGB")
            im.save(os.path.join(dst, base + ext), quality=int(quality))
    ctx.progress(1, "")
    return f"Resized {len(files)} images into {dst}"


@g.command("Contact Sheet…", menu="Automation", params={"columns": g.Int(1, 12, 4), "cell": g.Int(64, 1024, 320, unit="px", label="Cell size"),
                                                        "gap": g.Int(0, 100, 16, unit="px")})
def contact_sheet(ctx, columns=4, cell=320, gap=16):
    if Image is None:
        raise RuntimeError("Pillow is required")
    src = ctx.choose_folder("Folder with images")
    if not src:
        return None
    files = [f for f in sorted(os.listdir(src)) if f.lower().endswith(IMAGE_EXT)]
    if not files:
        return "No images found"
    rows = (len(files) + columns - 1) // columns
    W = columns * cell + (columns + 1) * gap
    H = rows * cell + (rows + 1) * gap
    sheet = np.zeros((H, W, 4), np.float32)
    sheet[...] = (0.95, 0.91, 0.83, 1.0)
    for i, f in enumerate(files):
        ctx.progress(i / len(files), f)
        with Image.open(os.path.join(src, f)) as im:
            im = im.convert("RGBA")
            im.thumbnail((cell, cell), Image.Resampling.LANCZOS)
            a = np.asarray(im).astype(np.float32) / 255
        r, c = divmod(i, columns)
        y = gap + r * (cell + gap) + (cell - a.shape[0]) // 2
        x = gap + c * (cell + gap) + (cell - a.shape[1]) // 2
        alpha = a[..., 3:4]
        sheet[y:y + a.shape[0], x:x + a.shape[1], :3] = a[..., :3] * alpha + sheet[y:y + a.shape[0], x:x + a.shape[1], :3] * (1 - alpha)
    ctx.progress(1, "")
    ctx.new_document(sheet, name="Contact Sheet")
    return f"Contact sheet of {len(files)} images"

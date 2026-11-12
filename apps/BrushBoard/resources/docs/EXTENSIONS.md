# BrushBoard Extension SDK (API 1)

BrushBoard extensions are written in Python 3.10+. An extension can contribute any mix of:

| Contribution | Decorator | Appears in |
|---|---|---|
| Filters | `@g.filter` | **Filter** menu (under *Python Extensions*), with an auto-generated dialog and live preview, repeatable with Ctrl+F |
| Canvas tools | `@g.tool` | Toolbar (extension group), options bar, live overlays |
| Panels | `@g.panel` | Dock (Window menu), declarative widgets |
| Commands | `@g.command` | **Extensions** menu, optional parameter dialog and shortcut |
| File formats | `@g.file_format` | File › Open, File › Export As |

Each extension runs in **its own Python process**. A crash or an infinite loop in one extension never affects documents or other extensions; it is restarted on next use.

---

## 1. Anatomy

```
~/.config/BrushBoard/extensions/
  my_extension/
    brushboard.toml      # manifest
    main.py            # entry module (configurable)
    .deps/             # created by "Install dependencies" (pip --target)
```

`brushboard.toml`:

```toml
id = "my_extension"            # unique, used as the worker id
name = "My Extension"
version = "1.0.0"
author = "You"
description = "One line shown in the Extension Manager."
entry = "main.py"
api = 1
requirements = ["scikit-image>=0.22"]   # optional; installed into .deps/ on request
```

Install by copying the folder into the user extensions directory, or use **Extensions › Manage Extensions › Install from folder…**. Click **Reload** after editing code: no restart needed.

## 2. Images

Every image you receive or return is a NumPy array:

- `float32`, shape `(height, width, 4)` — RGBA
- **straight** (not premultiplied) alpha
- sRGB-encoded, nominally `0..1`; 32-bit documents may contain values above 1

Return an array of the same shape. Returning `(H, W, 3)` keeps the original alpha; returning `(H, W)` is treated as greyscale. Returning `None` means "unchanged". BrushBoard applies the result through the current selection and onto the active layer (or its mask) as one undoable step.

## 3. Parameters

Parameters can be declared as annotations (the argument name becomes the id) or passed as `params={...}`:

```python
g.Float(min, max, default, step=None, label=None, unit=None)
g.Int(min, max, default, label=None, unit=None)
g.Angle(default, label=None)
g.Bool(default, label=None)
g.Choice([("value", "Label"), ...], default, label=None)   # or plain values
g.Color((r, g, b), label=None)                              # floats 0..1
g.Text(default, label=None)
```

Values the user picks are remembered between sessions.

## 4. Filters

```python
import numpy as np
import brushboard as g

@g.filter("Vignette", category="Film Lab", description="Darken the corners")
def vignette(image, amount: g.Float(0, 1, 0.4), feather: g.Float(0.05, 1, 0.5), ctx=None):
    h, w = image.shape[:2]
    y, x = np.mgrid[0:h, 0:w]
    d = np.hypot(x / w - 0.5, y / h - 0.5) * 1.41
    t = np.clip((d - 0.5) / feather, 0, 1)
    out = image.copy()
    out[..., :3] *= (1 - t * amount)[..., None]
    return out
```

If the function has a `ctx` argument it receives a [Context](#8-the-host-api-context). Use `heavy=False` for very fast filters to make the preview update more eagerly.

## 5. Canvas tools

```python
@g.tool("Pixel Sorter", icon="<svg …>", cursor="crosshair",
        options={"threshold": g.Float(0, 1, 0.25), "reverse": g.Bool(False)})
class PixelSorter(g.Tool):
    def on_press(self, ev, ctx):
        self.start = (ev.x, ev.y)

    def on_drag(self, ev, ctx):
        x0, y0 = self.start
        return {"overlay": [{"type": "rect", "x": min(x0, ev.x), "y": min(y0, ev.y),
                             "w": abs(ev.x - x0), "h": abs(ev.y - y0), "dash": [5, 4]}]}

    def on_release(self, ev, ctx):
        img = ctx.layer_pixels()
        ...                                   # edit img
        ctx.set_layer_pixels(img, label="Pixel Sort")
        return {"overlay": [], "status": "Done"}
```

`ev` has `x, y` (document pixels, floats), `pressure`, `shift`, `alt`, `ctrl`, `options` (dict of the tool's option values) and `colors` (`{"fg": [...], "bg": [...]}`).

Handlers may return `{"overlay": [...], "status": "text"}`. Drag events are coalesced: if your handler is slow, intermediate moves are dropped and only the latest is delivered.

**Overlay shapes** (document coordinates):

```python
{"type": "line" | "polyline" | "polygon", "points": [[x, y], ...], "color": [r, g, b], "width": 1.5, "dash": [4, 4], "fill": [r, g, b], "fillAlpha": 0.25}
{"type": "rect", "x": .., "y": .., "w": .., "h": .., ...}
{"type": "circle", "x": .., "y": .., "r": .., ...}
{"type": "text", "x": .., "y": .., "text": "...", "size": 12, "color": [r, g, b]}
```

Icons are inline SVG strings (24×24 viewBox, `stroke="currentColor"` recommended).

## 6. Panels

Panels are declarative: return a list of widgets from `render()`, react in `on_event()`.

```python
from brushboard import ui

@g.panel("Palette")
class PalettePanel(g.Panel):
    def __init__(self):
        self.k = 6
        self.colors = []

    def render(self, ctx):
        return [ui.title("Image Palette"),
                ui.slider("k", "Colours", self.k, 2, 16, 1),
                ui.button("extract", "Extract", primary=True),
                ui.swatches(self.colors, id="swatch")]

    def on_event(self, widget, value, ctx):
        if widget == "k":
            self.k = int(value)
        elif widget == "extract":
            self.colors = extract(ctx.composite(), self.k)
        elif widget == "swatch":
            ctx.set_foreground(value["color"])
        return None          # None → render() is called again; or return a widget list
```

Widgets: `ui.label(text, style=None|"title"|"small")`, `ui.title`, `ui.button(id, label, primary=False)`, `ui.slider(id, label, value, min, max, step)`, `ui.checkbox(id, label, value)`, `ui.select(id, label, options, value)` (options are values or `[value, label]` pairs), `ui.text(id, label, value)`, `ui.color(id, label, (r, g, b))`, `ui.swatches(colors, id=None)` (click events carry `{"index", "color", "alt"}`), `ui.progress(value)`, `ui.separator()`, `ui.row(*widgets)`, `ui.image(png_bytes)`.

Push an update at any time (e.g. during a long job) with `ctx.update_panel(widgets)`.

## 7. Commands and file formats

```python
@g.command("Export Layers as PNG…", menu="Automation", shortcut="Ctrl+Alt+E",
           params={"trim": g.Bool(True)})
def export_layers(ctx, trim=True):
    folder = ctx.choose_folder("Export to…")
    if not folder:
        return None
    ...
    return f"Exported to {folder}"          # shown as a notification
```

```python
@g.file_format("Portable Float Map", extensions=["pfm"])
class PFM(g.FileFormat):
    def read(self, path):
        return float_rgb_array                # (H, W, 3|4) float32 — or a layered dict, below
    def write(self, path, image):             # image: flattened (H, W, 4) float32
        ...
```

`read()` may also return a layered document:

```python
{"width": W, "height": H, "bitDepth": 16,
 "layers": [{"name": "Top", "image": arr, "x": 0, "y": 0, "opacity": 1.0, "blend": "multiply", "visible": True},
            {"kind": "group", "name": "Group", "children": [...]}],
 "warnings": ["optional messages"]}
```

Layers are listed **top first**. Blend mode names: `normal, dissolve, darken, multiply, colorBurn, linearBurn, darkerColor, lighten, screen, colorDodge, linearDodge, lighterColor, overlay, softLight, hardLight, vividLight, linearLight, pinLight, hardMix, difference, exclusion, subtract, divide, hue, saturation, color, luminosity` (`passThrough` for groups).

## 8. The host API (`Context`)

| Method / property | Description |
|---|---|
| `ctx.document` | `None` or `{id, name, path, width, height, bitDepth, activeId, hasSelection, layers: [{id, name, kind, visible, opacity, blend, hasMask, children}]}` |
| `ctx.layer_pixels(layer_id=None, mask=False)` | Full-size pixels of a layer (active by default) or its mask |
| `ctx.composite()` | Flattened image |
| `ctx.selection()` | `(H, W)` float mask or `None` |
| `ctx.set_layer_pixels(img, layer_id=None, label="…", x=0, y=0, region=False)` | Replace a layer (undoable). With `region=True`, only the `img`-sized rectangle at `(x, y)` changes |
| `ctx.add_layer(img=None, name="Layer", blend=None, opacity=None, x=0, y=0)` | New layer above the active one; returns its id |
| `ctx.new_document(img=None, name=…, width=…, height=…, bit_depth=8)` | Open a new document |
| `ctx.foreground`, `ctx.background`, `ctx.set_foreground(rgb)`, `ctx.set_background(rgb)` | Colours |
| `ctx.message(text, kind="info"\|"success"\|"error")`, `ctx.status(text)`, `ctx.progress(value, text)` | Feedback |
| `ctx.choose_folder()`, `ctx.choose_file(filters=None)`, `ctx.save_file(default=None, filters=None)` | Native dialogs |
| `ctx.run_command(id)` | Run any built-in command, e.g. `"select.all"`, `"layer.new"`, `"filter.gaussianBlur"`, `"edit.undo"` |
| `ctx.overlay(shapes)` | Draw tool overlays (tools) |
| `ctx.update_panel(widgets)` | Re-render a panel (panels) |

Command ids are listed in `src/commands.ts`.

## 9. Scripts

**File › Scripts › Run Python Script…** runs any `.py` file with the same API. A `Context` is injected as `app` (also `brushboard.app`). Define `main(app)`, or set `RESULT`, to show a message when finished. See `docs/examples/hello_script.py`.

## 10. Dependencies

List them in `requirements`. **Extensions › Manage Extensions › Install dependencies** runs `pip install --target <extension>/.deps`; that folder is put first on `sys.path`. The shared BrushBoard environment (`npm run setup:python`) already provides NumPy, Pillow, OpenCV, psd-tools, rawpy, tifffile and OpenEXR.

## 11. Debugging

- `print()` output and tracebacks go to the Extension Manager **Log** and to the terminal that launched BrushBoard.
- Exceptions raised in handlers are shown in an error dialog with the traceback; the worker keeps running.
- Run a worker by hand to test the protocol:

  ```bash
  PYTHONPATH=python python3 -m brushboard.worker --ext extensions/film_lab
  {"id": 1, "method": "describe", "params": {}}
  ```

## 12. Protocol (for the curious)

The app talks to each worker with line-delimited JSON-RPC over stdio. Pixel buffers never travel through the pipe: they are raw `float32` files in `/dev/shm`, referenced by `{path, width, height, channels}`. Python can call back into the app (`host.*` methods) while handling a request; the renderer answers and the call returns synchronously to your code.

"""
BrushBoard extension SDK.

Write an extension as a folder containing ``brushboard.toml`` and a Python module (``main.py`` by default).
Register contributions with decorators:

    import brushboard as g
    import numpy as np

    @g.filter("Vignette", category="Film Lab")
    def vignette(image, amount: g.Float(0, 1, 0.4), ctx=None):
        h, w = image.shape[:2]
        ...
        return image

Images are ``numpy.float32`` arrays shaped (height, width, 4): straight (non-premultiplied) RGBA,
sRGB-encoded, nominally 0..1 (32-bit documents may hold values above 1).

See docs/EXTENSIONS.md for the full reference.
"""
from __future__ import annotations

import os as _os
import sys as _sys

# An installed GPU pack (see gpupack.py) goes in front of the runtime's own ONNX Runtime.
if _os.environ.get("BRUSHBOARD_AI_PACK"):
    try:
        from brushboard.gpupack import activate as _activate
        _activate()
    except Exception as _e:  # pragma: no cover
        _sys.stderr.write(f"[brushboard] GPU pack not loaded: {_e}\n")

import inspect
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

__all__ = [
    "Float", "Int", "Bool", "Choice", "Color", "Text", "Angle",
    "filter", "tool", "panel", "command", "file_format",
    "Tool", "Panel", "FileFormat", "Context", "ui", "app", "API_VERSION",
]

API_VERSION = 1

# --------------------------------------------------------------------------- parameters
@dataclass
class Param:
    type: str
    default: Any = None
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None
    label: Optional[str] = None
    unit: Optional[str] = None
    choices: Optional[list] = None
    id: str = ""

    def spec(self, pid: str) -> dict:
        d = {"id": pid, "label": self.label or pid.replace("_", " ").title(), "type": self.type, "default": self.default}
        for k in ("min", "max", "step", "unit"):
            v = getattr(self, k)
            if v is not None:
                d[k] = v
        if self.choices is not None:
            d["choices"] = [c if isinstance(c, dict) else {"value": c[0], "label": c[1]} if isinstance(c, (list, tuple)) else {"value": c, "label": str(c)} for c in self.choices]
        return d


def Float(min: float = 0.0, max: float = 1.0, default: float = 0.0, step: float | None = None, label: str | None = None, unit: str | None = None) -> Param:
    return Param("float", float(default), min, max, step if step is not None else (max - min) / 100.0, label, unit)


def Int(min: int = 0, max: int = 100, default: int = 0, label: str | None = None, unit: str | None = None) -> Param:
    return Param("int", int(default), min, max, 1, label, unit)


def Angle(default: float = 0.0, label: str | None = None) -> Param:
    return Param("angle", float(default), -180, 180, 1, label, "°")


def Bool(default: bool = False, label: str | None = None) -> Param:
    return Param("bool", bool(default), label=label)


def Choice(choices: list, default: Any = None, label: str | None = None) -> Param:
    first = choices[0]
    first_val = first[0] if isinstance(first, (list, tuple)) else (first["value"] if isinstance(first, dict) else first)
    return Param("choice", default if default is not None else first_val, choices=choices, label=label)


def Color(default=(0.0, 0.0, 0.0), label: str | None = None) -> Param:
    return Param("color", list(default), label=label)


def Text(default: str = "", label: str | None = None) -> Param:
    return Param("text", default, label=label)


def _collect_params(fn: Callable, explicit: dict | None) -> dict[str, Param]:
    params: dict[str, Param] = {}
    if explicit:
        params.update(explicit)
    try:
        sig = inspect.signature(fn)
        for name, p in sig.parameters.items():
            if isinstance(p.annotation, Param) and name not in params:
                params[name] = p.annotation
    except (TypeError, ValueError):
        pass
    return params


def _call(fn: Callable, *args, params: dict, ctx: "Context"):
    """Call fn(*args, **params) and pass ctx when the function accepts it."""
    try:
        sig = inspect.signature(fn)
        accepts_ctx = "ctx" in sig.parameters or any(p.kind == p.VAR_KEYWORD for p in sig.parameters.values())
        names = set(sig.parameters)
        kw = {k: v for k, v in params.items() if k in names or any(p.kind == p.VAR_KEYWORD for p in sig.parameters.values())}
    except (TypeError, ValueError):
        accepts_ctx, kw = True, dict(params)
    if accepts_ctx:
        kw["ctx"] = ctx
    return fn(*args, **kw)


# --------------------------------------------------------------------------- registry
@dataclass
class _Registry:
    filters: dict = field(default_factory=dict)
    tools: dict = field(default_factory=dict)
    panels: dict = field(default_factory=dict)
    commands: dict = field(default_factory=dict)
    formats: dict = field(default_factory=dict)
    errors: list = field(default_factory=list)


registry = _Registry()


def _slug(name: str) -> str:
    import re
    return re.sub(r"_+", "_", "".join(c.lower() if c.isalnum() else "_" for c in name)).strip("_") or "item"


def filter(name: str, category: str | None = None, params: dict | None = None, id: str | None = None, description: str = "", heavy: bool = True):
    """Register an image filter. The function receives the layer as an (H, W, 4) float32 array and returns one."""
    def deco(fn):
        fid = id or _slug(name)
        registry.filters[fid] = {"fn": fn, "name": name, "category": category, "params": _collect_params(fn, params), "description": description, "heavy": heavy}
        return fn
    return deco


class Tool:
    """Base class for canvas tools. Override the event handlers you need.

    Each handler receives an event with ``x, y, pressure, shift, alt, ctrl, options, colors`` and a Context.
    Return ``None`` or a dict ``{"overlay": [...shapes], "status": "text"}``.
    """
    def on_press(self, ev, ctx):  # noqa: D401
        return None

    def on_drag(self, ev, ctx):
        return None

    def on_release(self, ev, ctx):
        return None


def tool(name: str, icon: str | None = None, cursor: str = "crosshair", options: dict | None = None, id: str | None = None, description: str = ""):
    """Register a canvas tool (class deriving from brushboard.Tool)."""
    def deco(cls):
        tid = id or _slug(name)
        registry.tools[tid] = {"cls": cls, "instance": None, "name": name, "icon": icon, "cursor": cursor, "options": options or {}, "description": description}
        return cls
    return deco


class Panel:
    """Base class for dockable panels described with brushboard.ui widgets."""
    def render(self, ctx) -> list:
        return []

    def on_event(self, widget: str, value, ctx):
        """Return a new widget list, or None to call render() again."""
        return None


def panel(title: str, id: str | None = None):
    """Register a dockable panel (class deriving from brushboard.Panel)."""
    def deco(cls):
        pid = id or _slug(title)
        registry.panels[pid] = {"cls": cls, "instance": None, "title": title}
        return cls
    return deco


def command(name: str, menu: str | None = None, shortcut: str | None = None, params: dict | None = None, id: str | None = None):
    """Register a menu command: fn(ctx, **params). Return a string to show it as a notification."""
    def deco(fn):
        cid = id or _slug(name)
        registry.commands[cid] = {"fn": fn, "name": name, "menu": menu, "shortcut": shortcut, "params": _collect_params(fn, params)}
        return fn
    return deco


class FileFormat:
    """Base class for file formats. Implement read(path) -> image or list of layers, and/or write(path, image)."""
    def read(self, path: str):
        raise NotImplementedError

    def write(self, path: str, image):
        raise NotImplementedError


def file_format(name: str, extensions: list[str], id: str | None = None):
    """Register a file format handler (class deriving from brushboard.FileFormat)."""
    def deco(cls):
        fid = id or _slug(name)
        inst = cls()
        can_read = type(inst).read is not FileFormat.read
        can_write = type(inst).write is not FileFormat.write
        registry.formats[fid] = {"instance": inst, "name": name, "extensions": [e.lower().lstrip(".") for e in extensions], "canRead": can_read, "canWrite": can_write}
        return cls
    return deco


# --------------------------------------------------------------------------- UI widgets for panels
class ui:  # noqa: N801 (namespace)
    @staticmethod
    def label(text: str, style: str | None = None) -> dict:
        return {"type": "label", "text": text, "style": style}

    @staticmethod
    def title(text: str) -> dict:
        return {"type": "label", "text": text, "style": "title"}

    @staticmethod
    def button(id: str, label: str, primary: bool = False) -> dict:
        return {"type": "button", "id": id, "label": label, "primary": primary}

    @staticmethod
    def slider(id: str, label: str, value: float, min: float = 0, max: float = 1, step: float = 0.01) -> dict:
        return {"type": "slider", "id": id, "label": label, "value": value, "min": min, "max": max, "step": step}

    @staticmethod
    def checkbox(id: str, label: str, value: bool = False) -> dict:
        return {"type": "checkbox", "id": id, "label": label, "value": value}

    @staticmethod
    def select(id: str, label: str, options: list, value=None) -> dict:
        return {"type": "select", "id": id, "label": label, "options": options, "value": value}

    @staticmethod
    def text(id: str, label: str, value: str = "") -> dict:
        return {"type": "text", "id": id, "label": label, "value": value}

    @staticmethod
    def color(id: str, label: str, value=(0, 0, 0)) -> dict:
        return {"type": "color", "id": id, "label": label, "value": list(value)}

    @staticmethod
    def swatches(colors: list, id: str | None = None) -> dict:
        return {"type": "swatches", "id": id, "colors": [list(map(float, c[:3])) for c in colors]}

    @staticmethod
    def progress(value: float) -> dict:
        return {"type": "progress", "value": value}

    @staticmethod
    def separator() -> dict:
        return {"type": "separator"}

    @staticmethod
    def row(*children: dict) -> dict:
        return {"type": "row", "children": list(children)}

    @staticmethod
    def image(png_bytes: bytes) -> dict:
        import base64
        return {"type": "image", "src": "data:image/png;base64," + base64.b64encode(png_bytes).decode()}


# --------------------------------------------------------------------------- host context
class Context:
    """Access to the running BrushBoard app. Available as ``ctx`` in handlers and ``brushboard.app`` in scripts."""

    def __init__(self, rpc, info: dict | None = None):
        self._rpc = rpc
        self._info = info or {}

    # document -------------------------------------------------------------
    @property
    def document(self) -> dict | None:
        """Document summary: name, width, height, bitDepth, activeId, hasSelection, layers (tree)."""
        return self._rpc.host("host.get_document")[0]

    def layer_pixels(self, layer_id: str | None = None, mask: bool = False):
        """Full-size (H, W, 4) float32 pixels of a layer (active layer by default)."""
        _, bufs = self._rpc.host("host.get_layer_pixels", {"id": layer_id, "mask": mask})
        return bufs["image"]

    def composite(self):
        """The flattened document as (H, W, 4) float32."""
        _, bufs = self._rpc.host("host.get_composite")
        return bufs["image"]

    def selection(self):
        """Selection mask as (H, W) float32 in 0..1, or None."""
        res, bufs = self._rpc.host("host.get_selection")
        if res is None:
            return None
        return bufs["image"][..., 0]

    def set_layer_pixels(self, image, layer_id: str | None = None, label: str = "Extension", x: int = 0, y: int = 0, region: bool = False):
        """Replace a layer's pixels (undoable). With region=True only the (x, y, w, h) rectangle is replaced."""
        self._rpc.host("host.set_layer_pixels", {"id": layer_id, "label": label, "x": x, "y": y, "region": region}, {"image": image})

    def add_layer(self, image=None, name: str = "Layer", blend: str | None = None, opacity: float | None = None, x: int = 0, y: int = 0) -> str:
        """Add a new layer above the active one. Returns its id."""
        params = {"name": name, "blend": blend, "opacity": opacity, "x": x, "y": y}
        return self._rpc.host("host.add_layer", params, {"image": image} if image is not None else {})[0]

    def new_document(self, image=None, name: str = "Untitled", width: int | None = None, height: int | None = None, bit_depth: int = 8):
        return self._rpc.host("host.new_document", {"name": name, "width": width, "height": height, "bitDepth": bit_depth}, {"image": image} if image is not None else {})[0]

    # colours ---------------------------------------------------------------
    @property
    def foreground(self):
        return tuple(self._rpc.host("host.get_colors")[0]["fg"])

    @property
    def background(self):
        return tuple(self._rpc.host("host.get_colors")[0]["bg"])

    def set_foreground(self, rgb):
        self._rpc.host("host.set_foreground", {"rgb": [float(c) for c in rgb[:3]]})

    def set_background(self, rgb):
        self._rpc.host("host.set_background", {"rgb": [float(c) for c in rgb[:3]]})

    # feedback --------------------------------------------------------------
    def message(self, text: str, kind: str = "info"):
        self._rpc.host("host.message", {"text": text, "kind": kind})

    def status(self, text: str):
        self._rpc.host("host.status", {"text": text})

    def progress(self, value: float, text: str = ""):
        self._rpc.host("host.progress", {"value": value, "text": text})

    def overlay(self, shapes: list, tool: str | None = None):
        """Draw tool overlay shapes: dicts with type line/polyline/polygon/rect/circle/text (doc coordinates)."""
        self._rpc.host("host.overlay", {"shapes": shapes, "tool": tool or self._info.get("tool", "")})

    def update_panel(self, ui_list: list, panel: str | None = None):
        self._rpc.host("host.panel_update", {"panel": panel or self._info.get("panel", ""), "ui": ui_list})

    # dialogs & commands ------------------------------------------------------
    def choose_folder(self, title: str = "Choose folder") -> str | None:
        return self._rpc.host("host.choose_folder", {"title": title})[0]

    def choose_file(self, title: str = "Choose file", filters: list | None = None) -> str | None:
        return self._rpc.host("host.choose_file", {"title": title, "filters": filters})[0]

    def save_file(self, title: str = "Save", default: str | None = None, filters: list | None = None) -> str | None:
        return self._rpc.host("host.save_file", {"title": title, "default": default, "filters": filters})[0]

    def run_command(self, command_id: str):
        """Run any BrushBoard command by id, e.g. 'layer.new', 'select.all', 'filter.gaussianBlur'."""
        self._rpc.host("host.run_command", {"id": command_id})


app: Context | None = None  # set in script mode

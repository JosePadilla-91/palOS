"""
BrushBoard Python worker: line-delimited JSON-RPC over stdio.

    python -m brushboard.worker --core            # high-bit-depth I/O, PSD, RAW, colour management
    python -m brushboard.worker --ext <folder>    # one extension (crash-isolated)
    python -m brushboard.worker --script <file>   # run an automation script

Pixel buffers are exchanged as raw files in BRUSHBOARD_BUF_DIR (RAM-backed /dev/shm on Linux).
"""
from __future__ import annotations

import importlib.util
import json
import os
import sys
import traceback
import uuid

# The protocol owns the real stdout; anything printed by extensions goes to stderr (the app log).
_PROTO_OUT = sys.stdout
sys.stdout = sys.stderr

BUF_DIR = os.environ.get("BRUSHBOARD_BUF_DIR") or "/tmp"
os.makedirs(BUF_DIR, exist_ok=True)

try:
    import numpy as np  # noqa: F401
except Exception:  # numpy is optional for the core worker's capability probe
    np = None


def _send(obj: dict):
    _PROTO_OUT.write(json.dumps(obj, default=_json_default) + "\n")
    _PROTO_OUT.flush()


def _json_default(o):
    if np is not None:
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
    if isinstance(o, (set, tuple)):
        return list(o)
    if isinstance(o, bytes):
        return o.decode("latin-1")
    return str(o)


def load_buffers(descs: dict | None) -> dict:
    out = {}
    for name, d in (descs or {}).items():
        dtype = np.float32 if d.get("dtype", "float32") == "float32" else np.uint8
        arr = np.fromfile(d["path"], dtype=dtype)
        try:
            os.unlink(d["path"])
        except OSError:
            pass
        c = int(d.get("channels") or 4)
        out[name] = arr.reshape(int(d["height"]), int(d["width"]), c)
    return out


def dump_buffers(bufs: dict | None) -> dict:
    out = {}
    for name, arr in (bufs or {}).items():
        if arr is None:
            continue
        a = np.asarray(arr)
        if a.ndim == 2:
            a = a[..., None]
        if a.dtype != np.float32:
            a = a.astype(np.float32)
        a = np.ascontiguousarray(a)
        path = os.path.join(BUF_DIR, f"out-{os.getpid()}-{uuid.uuid4().hex}.raw")
        a.tofile(path)
        out[name] = {"path": path, "width": int(a.shape[1]), "height": int(a.shape[0]), "channels": int(a.shape[2]), "dtype": "float32"}
    return out


class RPC:
    """Handles host requests (Python -> app) while a call is in progress."""

    def __init__(self):
        self.pending_requests: list[dict] = []
        self.counter = 0

    def read_message(self) -> dict | None:
        line = sys.stdin.readline()
        if not line:
            return None
        line = line.strip()
        if not line:
            return {}
        return json.loads(line)

    def host(self, method: str, params: dict | None = None, buffers: dict | None = None):
        """Call the host and block for its reply. Returns (result, buffers)."""
        self.counter += 1
        rid = f"h{self.counter}"
        _send({"id": rid, "method": method, "params": params or {}, "buffers": dump_buffers(buffers)})
        while True:
            msg = self.read_message()
            if msg is None:
                raise SystemExit(0)
            if not msg:
                continue
            if msg.get("id") == rid and "method" not in msg:
                if msg.get("error"):
                    raise RuntimeError(msg["error"].get("message", "host error"))
                return msg.get("result"), load_buffers(msg.get("buffers"))
            # a new request arrived while waiting: queue it
            self.pending_requests.append(msg)


rpc = RPC()


def serve(handlers: dict):
    while True:
        if rpc.pending_requests:
            msg = rpc.pending_requests.pop(0)
        else:
            msg = rpc.read_message()
            if msg is None:
                return
            if not msg:
                continue
        mid = msg.get("id")
        method = msg.get("method")
        fn = handlers.get(method)
        if fn is None:
            _send({"id": mid, "error": {"message": f"Unknown method {method}"}})
            continue
        try:
            bufs = load_buffers(msg.get("buffers")) if np is not None else {}
            res = fn(msg.get("params") or {}, bufs)
            if isinstance(res, tuple) and len(res) == 2 and isinstance(res[1], dict):
                result, out_bufs = res
            else:
                result, out_bufs = res, {}
            _send({"id": mid, "result": result, "buffers": dump_buffers(out_bufs)})
        except Exception as e:  # report to the app, keep serving
            tb = traceback.format_exc()
            sys.stderr.write(tb)
            _send({"id": mid, "error": {"message": f"{type(e).__name__}: {e}", "traceback": tb}})


# --------------------------------------------------------------------------- extension mode
def _load_extension(folder: str):
    import brushboard
    from brushboard import registry

    manifest = {}
    mf = os.path.join(folder, "brushboard.toml")
    if os.path.exists(mf):
        try:
            import tomllib
            with open(mf, "rb") as f:
                manifest = tomllib.load(f)
        except Exception as e:  # pragma: no cover
            registry.errors.append(f"manifest: {e}")
    entry = manifest.get("entry", "main.py")
    deps = os.path.join(folder, ".deps")
    if os.path.isdir(deps) and deps not in sys.path:
        sys.path.insert(0, deps)
    sys.path.insert(0, folder)
    path = os.path.join(folder, entry)
    name = "brushboard_ext_" + "".join(c if c.isalnum() else "_" for c in manifest.get("id", os.path.basename(folder)))
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    try:
        spec.loader.exec_module(mod)
    except Exception:
        registry.errors.append(traceback.format_exc())
    return brushboard, registry, manifest


class _Ev:
    def __init__(self, d: dict):
        self.__dict__.update(d)

    def __getattr__(self, k):
        return None


def ext_handlers(folder: str) -> dict:
    brushboard, reg, manifest = _load_extension(folder)
    import numpy as np  # extension mode requires numpy

    def ctx_for(extra: dict | None = None):
        return brushboard.Context(rpc, extra or {})

    def describe(p, b):
        return {
            "filters": [{"id": k, "name": v["name"], "category": v["category"], "description": v["description"], "heavy": v["heavy"], "params": [pp.spec(pid) for pid, pp in v["params"].items()]} for k, v in reg.filters.items()],
            "tools": [{"id": k, "name": v["name"], "icon": v["icon"], "cursor": v["cursor"], "description": v["description"], "options": [pp.spec(pid) for pid, pp in v["options"].items()]} for k, v in reg.tools.items()],
            "panels": [{"id": k, "title": v["title"]} for k, v in reg.panels.items()],
            "commands": [{"id": k, "name": v["name"], "menu": v["menu"], "shortcut": v["shortcut"], "params": [pp.spec(pid) for pid, pp in v["params"].items()]} for k, v in reg.commands.items()],
            "formats": [{"id": k, "name": v["name"], "extensions": v["extensions"], "canRead": v["canRead"], "canWrite": v["canWrite"]} for k, v in reg.formats.items()],
            "errors": reg.errors,
            "api": brushboard.API_VERSION,
        }

    def run_filter(p, b):
        f = reg.filters.get(p["filter"])
        if not f:
            raise KeyError(p["filter"])
        image = b["image"]
        params = {k: p.get("params", {}).get(k, v.default) for k, v in f["params"].items()}
        ctx = ctx_for(p.get("context"))
        out = brushboard._call(f["fn"], image, params=params, ctx=ctx)
        if out is None:
            out = image
        out = np.asarray(out, dtype=np.float32)
        if out.ndim == 2:
            out = np.dstack([out, out, out, image[..., 3]])
        elif out.shape[2] == 3:
            out = np.dstack([out, image[..., 3]])
        return {"ok": True}, {"image": out}

    def tool_event(p, b):
        t = reg.tools.get(p["tool"])
        if not t:
            raise KeyError(p["tool"])
        if t["instance"] is None:
            t["instance"] = t["cls"]()
        inst = t["instance"]
        ev = _Ev(p)
        ctx = ctx_for({"tool": p["tool"]})
        handler = {"down": inst.on_press, "move": inst.on_drag, "up": inst.on_release}[p["type"]]
        return handler(ev, ctx) or {}

    def _panel(pid):
        pnl = reg.panels.get(pid)
        if not pnl:
            raise KeyError(pid)
        if pnl["instance"] is None:
            pnl["instance"] = pnl["cls"]()
        return pnl["instance"]

    def panel_render(p, b):
        return _panel(p["panel"]).render(ctx_for({"panel": p["panel"], **(p.get("context") or {})}))

    def panel_event(p, b):
        inst = _panel(p["panel"])
        ctx = ctx_for({"panel": p["panel"], **(p.get("context") or {})})
        res = inst.on_event(p["widget"], p.get("value"), ctx)
        return res if res is not None else inst.render(ctx)

    def run_command(p, b):
        c = reg.commands.get(p["command"])
        if not c:
            raise KeyError(p["command"])
        params = {k: p.get("params", {}).get(k, v.default) for k, v in c["params"].items()}
        return brushboard._call(c["fn"], params=params, ctx=ctx_for(p.get("context")))

    def format_read(p, b):
        fmt = reg.formats[p["format"]]["instance"]
        res = fmt.read(p["path"])
        from brushboard.core import layers_result
        return layers_result(res)

    def format_write(p, b):
        fmt = reg.formats[p["format"]]["instance"]
        fmt.write(p["path"], b["image"])
        return True

    return {"describe": describe, "run_filter": run_filter, "tool_event": tool_event, "panel_render": panel_render,
            "panel_event": panel_event, "run_command": run_command, "format_read": format_read, "format_write": format_write}


# --------------------------------------------------------------------------- script mode
def script_handlers(path: str) -> dict:
    import runpy
    import brushboard

    def run(p, b):
        brushboard.app = brushboard.Context(rpc, {})
        g = runpy.run_path(path, init_globals={"app": brushboard.app, "brushboard": brushboard}, run_name="__main__")
        main = g.get("main")
        if callable(main):
            return main(brushboard.app)
        return g.get("RESULT", f"{os.path.basename(path)} finished")

    return {"run": run}


def main():
    args = sys.argv[1:]
    if not args or args[0] == "--core":
        try:
            from brushboard import core
            serve(core.handlers())
        except ImportError as e:  # numpy missing: still answer capability probes so the UI can explain
            msg = str(e)
            def caps(p, b):
                return {"python": sys.version.split()[0], "numpy": None, "error": msg}
            def missing(p, b):
                raise RuntimeError(f"The Python helper is missing a package ({msg}). Use Extensions › Manage Extensions › Set up Python environment.")
            serve({"capabilities": caps, "read_image": missing, "write_image": missing, "write_psd": missing, "list_profiles": missing, "proof_lut": missing,
                   "ai_status": lambda p, b: {"engine": None, "error": msg}, "ai_download": missing, "ai_segment": missing,
                   "heal": missing, "heal_status": lambda p, b: {"ai": False, "texture": False, "error": msg}, "heal_download": missing})
    elif args[0] == "--ext":
        serve(ext_handlers(args[1]))
    elif args[0] == "--script":
        serve(script_handlers(args[1]))
    else:
        sys.stderr.write(f"unknown mode {args}\n")
        sys.exit(2)


if __name__ == "__main__":
    main()

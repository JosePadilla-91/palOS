"""Hardware acceleration for the local AI models (Subject Snap, healing).

On a machine with an NVIDIA card and driver, ONNX Runtime runs the models through CUDA; everywhere else, or if
anything about the GPU setup is off, it quietly uses the CPU. BRUSHBOARD_AI_DEVICE=cpu forces the CPU.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys

try:
    import onnxruntime as ort  # type: ignore
except Exception:  # pragma: no cover - reported by callers
    ort = None

_state = {"preloaded": False, "gpu_name": None, "last_device": None, "last_error": None}


def wanted() -> str:
    """'auto' (GPU when it works) or 'cpu'."""
    v = (os.environ.get("BRUSHBOARD_AI_DEVICE") or "auto").lower()
    return "cpu" if v in ("cpu", "off", "0", "false") else "auto"


def gpu_name() -> str | None:
    """Name of the first NVIDIA GPU, via nvidia-smi (ships with the driver)."""
    if _state["gpu_name"] is not None:
        return _state["gpu_name"] or None
    name = ""
    exe = shutil.which("nvidia-smi")
    if exe:
        try:
            out = subprocess.run([exe, "--query-gpu=name,driver_version", "--format=csv,noheader"], capture_output=True, text=True, timeout=5)
            line = out.stdout.strip().splitlines()[0] if out.returncode == 0 and out.stdout.strip() else ""
            name = line
        except Exception:
            name = ""
    _state["gpu_name"] = name
    return name or None


def _other_gpu_name() -> str | None:
    """Name of an AMD or Intel GPU when a pack for it is active (for the UI)."""
    pack = os.environ.get("BRUSHBOARD_AI_PACK")
    if pack not in ("rocm", "openvino"):
        return None
    try:
        from brushboard.gpupack import gpus
        want = "amd" if pack == "rocm" else "intel"
        return next((g["name"] for g in gpus() if g["vendor"] == want), None)
    except Exception:
        return None


def cuda_available() -> bool:
    return ort is not None and "CUDAExecutionProvider" in ort.get_available_providers() and wanted() != "cpu"


def _preload():
    """Load the bundled CUDA / cuDNN libraries (pip nvidia-* packages) before creating a CUDA session."""
    if _state["preloaded"]:
        return
    _state["preloaded"] = True
    if hasattr(ort, "preload_dlls"):
        try:
            ort.preload_dlls(cuda=True, cudnn=True, msvc=False)
        except Exception as e:  # missing driver etc. — the session attempt reports the real error
            _state["last_error"] = f"preload: {e}"


class GuardedSession:
    """An InferenceSession that moves itself to the CPU if the GPU cannot run the model.

    Some models load on the GPU but fail on their first run (for example int8-quantized models whose
    DequantizeLinear nodes the CUDA provider does not support). Instead of showing that error, the
    session is rebuilt on the CPU, the run is repeated, and the model stays on the CPU from then on."""

    def __init__(self, sess, path: str, threads: int | None, device: str):
        self._s, self._path, self._threads, self.device = sess, path, threads, device

    def run(self, outputs, feeds, *a, **k):
        try:
            return self._s.run(outputs, feeds, *a, **k)
        except Exception as e:
            if self.device == "cpu":
                raise
            msg = str(e).splitlines()[0][:300]
            _cpu_only.add(self._path)
            _state["last_error"] = f"This model cannot run on the GPU ({msg}); it runs on the CPU"
            print(f"[brushboard] {_state['last_error']}", file=sys.stderr)
            self._s = _cpu_session(self._path, self._threads)
            self.device = "cpu"
            _state["last_device"] = "cpu"
            return self._s.run(outputs, feeds, *a, **k)

    def __getattr__(self, name):  # get_inputs(), get_outputs(), get_providers(), …
        return getattr(self._s, name)


_cpu_only: set[str] = set()


def _options(threads: int | None):
    so = ort.SessionOptions()
    so.log_severity_level = 3
    so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    if threads:
        so.intra_op_num_threads = threads
    return so


def _cpu_session(path: str, threads: int | None):
    return ort.InferenceSession(path, _options(threads), providers=["CPUExecutionProvider"])


def session(path: str, threads: int | None = None):
    """InferenceSession on the GPU when possible, else CPU. Returns (session, device)."""
    s, device = _session(path, threads)
    return GuardedSession(s, path, threads, device), device


def gpu_providers() -> list[tuple[str, dict, str]]:
    """GPU execution providers to try, best first: (provider, options, device label)."""
    if ort is None or wanted() == "cpu":
        return []
    avail = ort.get_available_providers()
    out = []
    if "CUDAExecutionProvider" in avail and gpu_name():
        out.append(("CUDAExecutionProvider", {"device_id": 0, "arena_extend_strategy": "kSameAsRequested", "cudnn_conv_algo_search": "HEURISTIC"}, "cuda"))
    if "MIGraphXExecutionProvider" in avail:
        out.append(("MIGraphXExecutionProvider", {"device_id": 0}, "rocm"))
    if "ROCMExecutionProvider" in avail:
        out.append(("ROCMExecutionProvider", {"device_id": 0}, "rocm"))
    if "OpenVINOExecutionProvider" in avail:
        out.append(("OpenVINOExecutionProvider", {"device_type": "GPU"}, "openvino"))
    return out


def has_gpu() -> bool:
    return bool(gpu_providers())


def _session(path: str, threads: int | None = None):
    if ort is None:
        raise RuntimeError("ONNX Runtime is not installed in the Python helper.")
    so = _options(threads)
    if path not in _cpu_only:
        for prov, opts, label in gpu_providers():
            if prov == "CUDAExecutionProvider":
                _preload()
            try:
                s = ort.InferenceSession(path, so, providers=[(prov, opts), "CPUExecutionProvider"])
                if s.get_providers() and s.get_providers()[0] == prov:
                    _state["last_device"] = label
                    _state["last_error"] = None
                    return s, label
                _state["last_error"] = f"{prov} did not initialise"
            except Exception as e:
                _state["last_error"] = str(e).splitlines()[0][:300]
                print(f"[brushboard] {prov} unavailable for AI ({_state['last_error']}); trying the next option", file=sys.stderr)
    s = ort.InferenceSession(path, so, providers=["CPUExecutionProvider"])
    _state["last_device"] = "cpu"
    return s, "cpu"


def info() -> dict:
    """What the AI will run on, for the UI."""
    return {
        "wanted": wanted(),
        "cudaProvider": bool(ort is not None and "CUDAExecutionProvider" in ort.get_available_providers()),
        "gpuProviders": [p for p, _, _ in gpu_providers()],
        "pack": os.environ.get("BRUSHBOARD_AI_PACK") or None,
        "gpu": gpu_name() or _other_gpu_name(),
        "device": _state["last_device"],
        "error": _state["last_error"],
        "ortVersion": getattr(ort, "__version__", None),
    }

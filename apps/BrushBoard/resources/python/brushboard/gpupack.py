"""GPU packs: optional add-ons that let the AI models (Subject Snap, healing) run on the graphics card.

The installer ships the CPU runtime only, which works on every machine. When a supported GPU is found the
app offers the matching pack, installed into the user's data folder (never into the app):

  cuda      NVIDIA GeForce / RTX / Quadro, with the NVIDIA driver 525 or newer   (ONNX Runtime GPU + CUDA 12)
  openvino  Intel Arc and Intel integrated graphics                               (ONNX Runtime + OpenVINO)
  rocm      AMD Radeon with AMD ROCm installed                                    (ONNX Runtime + MIGraphX)

A pack is a folder of Python packages that the AI worker puts in front of its own; removing the folder
returns to the CPU. Installing also writes a full-precision copy of the healing model, because GPU
runtimes cannot run the compact block-quantized one that the CPU uses.
"""
from __future__ import annotations

import glob
import json
import os
import re
import shutil
import subprocess
import sys
import time

ORT_GPU = "1.26.0"       # last CUDA 12 build: works with NVIDIA driver 525+
ORT_OPENVINO = "1.24.1"
VENDORS = {"10de": "nvidia", "8086": "intel", "1002": "amd"}

PACKS = {
    "cuda": {
        "name": "NVIDIA GPU pack (CUDA)", "vendor": "nvidia", "download": "about 1.9 GB download, 3.4 GB installed",
        "pip": [f"onnxruntime-gpu[cuda,cudnn]=={ORT_GPU}"], "providers": ["CUDAExecutionProvider"],
    },
    "openvino": {
        "name": "Intel GPU pack (OpenVINO)", "vendor": "intel", "download": "about 80 MB download",
        "pip": [f"onnxruntime-openvino=={ORT_OPENVINO}"], "providers": ["OpenVINOExecutionProvider"],
    },
    "rocm": {
        "name": "AMD GPU pack (ROCm / MIGraphX)", "vendor": "amd", "download": "about 250 MB download",
        "pip": ["onnxruntime-migraphx"], "providers": ["MIGraphXExecutionProvider", "ROCMExecutionProvider"],
    },
}
EXTRA = ["onnx"]  # to write the full-precision healing model


def root() -> str:
    base = os.environ.get("XDG_DATA_HOME") or os.path.expanduser("~/.local/share")
    return os.path.join(base, "brushboard", "accel")


def pack_dir(pack: str) -> str:
    return os.path.join(root(), pack)


def site_dir(pack: str) -> str:
    return os.path.join(pack_dir(pack), "site")


def activate(pack: str | None = None) -> str | None:
    """Put an installed pack's packages first on sys.path (call before onnxruntime is imported)."""
    pack = pack or os.environ.get("BRUSHBOARD_AI_PACK") or ""
    if not pack or pack not in PACKS:
        return None
    d = site_dir(pack)
    if os.path.isfile(os.path.join(pack_dir(pack), "pack.json")) and os.path.isdir(d):
        if d not in sys.path:
            sys.path.insert(0, d)
        return pack
    return None


# ------------------------------------------------------------------ hardware
def _read(p: str) -> str:
    try:
        with open(p) as f:
            return f.read().strip()
    except Exception:
        return ""


def _lspci_names() -> dict:
    out = {}
    exe = shutil.which("lspci")
    if not exe:
        return out
    try:
        r = subprocess.run([exe, "-mm", "-nn"], capture_output=True, text=True, timeout=5)
        for line in r.stdout.splitlines():
            if not re.search(r"VGA|3D|Display", line):
                continue
            parts = re.findall(r'"([^"]*)"', line)
            ids = re.findall(r"\[([0-9a-f]{4})\]", line)
            if len(parts) >= 3 and len(ids) >= 3:
                # ids: class, vendor, device
                strip = lambda s: re.sub(r" \[[0-9a-f]{4}\]$", "", s)
                out[(ids[1], ids[2])] = strip(parts[1]) + " " + strip(parts[2])
    except Exception:
        pass
    return out


def gpus() -> list[dict]:
    """Graphics devices on this machine: vendor ('nvidia' / 'intel' / 'amd'), name, and what is installed for them."""
    names = _lspci_names()
    seen, out = set(), []
    for card in sorted(glob.glob("/sys/class/drm/card[0-9]*")):
        if "-" in os.path.basename(card):  # connectors (card0-HDMI-A-1)
            continue
        ven = _read(os.path.join(card, "device", "vendor")).replace("0x", "").lower()
        dev = _read(os.path.join(card, "device", "device")).replace("0x", "").lower()
        if ven not in VENDORS or (ven, dev) in seen:
            continue
        seen.add((ven, dev))
        out.append({"vendor": VENDORS[ven], "pci": f"{ven}:{dev}", "name": names.get((ven, dev)) or {"nvidia": "NVIDIA GPU", "intel": "Intel graphics", "amd": "AMD Radeon GPU"}[VENDORS[ven]]})
    # NVIDIA: the driver's own tool gives the marketing name and driver version
    smi = shutil.which("nvidia-smi")
    if smi:
        try:
            r = subprocess.run([smi, "--query-gpu=name,driver_version", "--format=csv,noheader"], capture_output=True, text=True, timeout=5)
            lines = [l.strip() for l in r.stdout.splitlines() if l.strip()] if r.returncode == 0 else []
            nv = [g for g in out if g["vendor"] == "nvidia"]
            for i, line in enumerate(lines):
                name, _, drv = line.partition(",")
                if i < len(nv):
                    nv[i].update(name=name.strip(), driver=drv.strip())
                else:
                    out.append({"vendor": "nvidia", "pci": "", "name": name.strip(), "driver": drv.strip()})
        except Exception:
            pass
    return out


def _rocm_version() -> str | None:
    v = _read("/opt/rocm/.info/version")
    m = re.match(r"(\d+)\.(\d+)", v)
    return f"{m.group(1)}.{m.group(2)}" if m else None


def _intel_compute_runtime() -> bool:
    pats = ["/usr/lib/x86_64-linux-gnu/intel-opencl/libigdrcl.so", "/usr/lib/x86_64-linux-gnu/libze_intel_gpu.so*", "/usr/lib64/libze_intel_gpu.so*",
            "/usr/lib/x86_64-linux-gnu/intel-opencl/*", "/etc/OpenCL/vendors/intel*.icd"]
    return any(glob.glob(p) for p in pats)


def readiness(pack: str, found: list[dict]) -> tuple[bool, str]:
    """Can this pack work here? (ok, explanation)."""
    vendor = PACKS[pack]["vendor"]
    mine = [g for g in found if g["vendor"] == vendor]
    if not mine:
        return False, "No matching graphics card found."
    if pack == "cuda":
        drv = next((g.get("driver") for g in mine if g.get("driver")), None)
        if not drv:
            return False, "The NVIDIA driver is not installed (Ubuntu: Software & Updates › Additional Drivers)."
        try:
            if int(drv.split(".")[0]) < 525:
                return False, f"NVIDIA driver {drv} is too old: 525 or newer is needed."
        except ValueError:
            pass
        return True, f"NVIDIA driver {drv}."
    if pack == "rocm":
        v = _rocm_version()
        if not v:
            return False, "AMD's ROCm software is not installed. Install ROCm 6.x/7.x from AMD (rocm.docs.amd.com), then come back here."
        return True, f"ROCm {v}."
    if pack == "openvino":
        if not _intel_compute_runtime():
            return True, "Install Intel's GPU compute runtime for full speed: sudo apt install intel-opencl-icd (the pack works without it, more slowly)."
        return True, "Intel GPU compute runtime found."
    return False, ""


# ------------------------------------------------------------------ status
def _manifest(pack: str) -> dict | None:
    try:
        with open(os.path.join(pack_dir(pack), "pack.json")) as f:
            return json.load(f)
    except Exception:
        return None


def installed() -> dict:
    return {p: m for p in PACKS if (m := _manifest(p))}


def recommended(found: list[dict]) -> str | None:
    """The pack to offer: NVIDIA first (fastest), then AMD, then Intel."""
    for pack in ("cuda", "rocm", "openvino"):
        if any(g["vendor"] == PACKS[pack]["vendor"] for g in found):
            return pack
    return None


def status(p=None, b=None) -> dict:
    found = gpus()
    rec = recommended(found)
    packs = []
    for pid, spec in PACKS.items():
        ok, why = readiness(pid, found)
        packs.append({"id": pid, "name": spec["name"], "download": spec["download"], "usable": ok, "note": why,
                      "installed": _manifest(pid), "relevant": any(g["vendor"] == spec["vendor"] for g in found)})
    return {"gpus": found, "recommended": rec, "packs": packs, "active": os.environ.get("BRUSHBOARD_AI_PACK") or None, "root": root()}


# ------------------------------------------------------------------ install / remove
def _progress(value, text):
    try:
        from brushboard.ai import _progress as p
        p(value, text)
    except Exception:
        pass


def _base_site() -> set[str]:
    """Distribution names already in the runtime that runs the worker (lower-case, '-' → '_')."""
    names = set()
    for sp in [p for p in sys.path if p.endswith("site-packages") and os.path.isdir(p)]:
        for d in os.listdir(sp):
            if d.endswith(".dist-info"):
                names.add(re.sub(r"-[^-]+\.dist-info$", "", d).lower().replace("-", "_"))
    return names


def _prune(site: str, keep_prefixes=("onnxruntime", "onnx", "nvidia", "openvino", "ml_dtypes")):
    """Drop packages the main runtime already has (numpy & co.) so the pack cannot shadow them."""
    base = _base_site()
    for d in os.listdir(site):
        if not d.endswith(".dist-info"):
            continue
        name = re.sub(r"-[^-]+\.dist-info$", "", d).lower().replace("-", "_")
        if name not in base or name.startswith(keep_prefixes):
            continue
        rec = os.path.join(site, d, "RECORD")
        try:
            with open(rec) as f:
                files = [line.split(",")[0] for line in f if line.strip()]
        except Exception:
            files = []
        for rel in files:
            fp = os.path.normpath(os.path.join(site, rel))
            if fp.startswith(site) and os.path.isfile(fp):
                try:
                    os.unlink(fp)
                except OSError:
                    pass
        shutil.rmtree(os.path.join(site, d), ignore_errors=True)
    # empty package folders left behind
    for dp, dn, fn in os.walk(site, topdown=False):
        if dp != site and not os.listdir(dp):
            os.rmdir(dp)


def _pip(args: list[str], what: str):
    cmd = [sys.executable, "-m", "pip", "--disable-pip-version-check", "--no-input", *args]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    tail = []
    for line in p.stdout:  # type: ignore[union-attr]
        line = line.rstrip()
        tail = (tail + [line])[-25:]
        m = re.search(r"(Downloading|Collecting|Installing collected packages)\s*:?\s*(\S+)?(.*)", line)
        if m:
            _progress(-1, f"{what}: {m.group(1).lower()} {(m.group(2) or '').split('/')[-1]}{m.group(3)[:40]}")
    if p.wait() != 0:
        msg = next((l for l in reversed(tail) if "ERROR" in l or "error" in l), tail[-1] if tail else "pip failed")
        raise RuntimeError(f"Could not download the {what}: {msg.strip()}")


def _check(pack: str, site: str) -> dict:
    """Load the pack in a fresh interpreter and run Subject Snap's model on the GPU once."""
    from brushboard.ai import model_path
    code = r"""
import sys, json, numpy as np
sys.path.insert(0, sys.argv[1])
import onnxruntime as ort
out = {"version": ort.__version__, "providers": ort.get_available_providers()}
model = sys.argv[3]
want = json.loads(sys.argv[2])
prov = next((p for p in want if p in out["providers"]), None)
out["provider"] = prov
if prov and model:
    try:
        if prov == "CUDAExecutionProvider" and hasattr(ort, "preload_dlls"):
            ort.preload_dlls(cuda=True, cudnn=True, msvc=False)
        opts = {"device_type": "GPU"} if prov == "OpenVINOExecutionProvider" else {}
        try:
            s = ort.InferenceSession(model, providers=[(prov, opts), "CPUExecutionProvider"])
        except Exception:
            if prov != "OpenVINOExecutionProvider":
                raise
            s = None
        if s is None or s.get_providers()[0] != prov:
            if prov == "OpenVINOExecutionProvider":
                # no Intel GPU compute runtime: OpenVINO can still speed up the processor
                s = ort.InferenceSession(model, providers=[(prov, {"device_type": "CPU"}), "CPUExecutionProvider"])
                out["note"] = "the Intel GPU runtime is missing (sudo apt install intel-opencl-icd), so OpenVINO uses the processor"
        s.run(None, {s.get_inputs()[0].name: np.zeros((1, 3, 320, 320), np.float32)})
        out["ran"] = s.get_providers()[0]
        if out["ran"] != prov:
            out["error"] = "the graphics card did not accept the model"
    except Exception as e:
        out["error"] = str(e).splitlines()[0][:300]
print("RESULT" + json.dumps(out))
"""
    r = subprocess.run([sys.executable, "-c", code, site, json.dumps(PACKS[pack]["providers"]), model_path() or ""], capture_output=True, text=True, timeout=600)
    line = next((l for l in r.stdout.splitlines() if l.startswith("RESULT")), None)
    if not line:
        raise RuntimeError("The GPU pack does not load: " + (r.stderr.strip().splitlines() or ["unknown error"])[-1][:300])
    return json.loads(line[6:])


def fp32_heal_model() -> str | None:
    """Path of the full-precision healing model, if made."""
    from brushboard.ai import models_dirs
    for d in models_dirs():
        p = os.path.join(d, "lama_fp32.onnx")
        if os.path.isfile(p) and os.path.getsize(p) > 100_000_000:
            return p
    return None


def _make_fp32(site: str):
    from brushboard import heal
    from brushboard.ai import user_models_dir
    from brushboard import fp32model  # noqa: F401  (fail early if missing)
    src = heal.lama_path()
    if not src or fp32_heal_model():
        return
    dst_dir = user_models_dir()
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, "lama_fp32.onnx")
    _progress(-1, "GPU pack: preparing the healing model for the GPU")
    env = dict(os.environ, PYTHONPATH=os.pathsep.join([site, os.path.dirname(os.path.dirname(os.path.abspath(__file__)))]))
    r = subprocess.run([sys.executable, "-m", "brushboard.fp32model", src, dst + ".part"], capture_output=True, text=True, env=env, timeout=900)
    if r.returncode != 0:
        raise RuntimeError("Could not prepare the healing model: " + (r.stderr.strip().splitlines() or ["?"])[-1][:300])
    os.replace(dst + ".part", dst)


def install(p, b=None) -> dict:
    pack = p["pack"]
    if pack not in PACKS:
        raise ValueError(f"Unknown GPU pack {pack}")
    spec = PACKS[pack]
    found = gpus()
    ok, why = readiness(pack, found)
    if not ok and not p.get("force"):
        raise RuntimeError(why)
    os.makedirs(root(), exist_ok=True)
    final = pack_dir(pack)
    work = final + ".installing"
    shutil.rmtree(work, ignore_errors=True)
    site = os.path.join(work, "site")
    os.makedirs(site)
    t0 = time.time()
    what = spec["name"]
    _progress(-1, f"{what}: downloading (this can take a while)")
    args = ["install", "--target", site, "--upgrade", "--no-warn-script-location"]
    if pack == "rocm":
        # AMD publishes the wheels per ROCm release; numpy is left to the main runtime
        args += ["-f", f"https://repo.radeon.com/rocm/manylinux/rocm-rel-{_rocm_version()}/", "--no-deps", *spec["pip"], "coloredlogs", "flatbuffers", "sympy", "packaging", "protobuf"]
    else:
        args += spec["pip"]
    _pip(args, what)
    _pip(["install", "--target", site, "--upgrade", "--no-deps", *EXTRA, "protobuf", "ml_dtypes", "typing_extensions"], what)
    _prune(site)
    _progress(-1, f"{what}: testing the graphics card")
    check = _check(pack, site)
    if not check.get("provider"):
        shutil.rmtree(work, ignore_errors=True)
        raise RuntimeError(f"The {what} installed, but ONNX Runtime does not offer {spec['providers'][0]} here (it offers {', '.join(check.get('providers', []))}).")
    _make_fp32(site)
    shutil.rmtree(final, ignore_errors=True)
    os.replace(work, final)
    m = {"pack": pack, "name": what, "installed": time.strftime("%Y-%m-%d %H:%M"), "seconds": round(time.time() - t0), "check": check,
         "size": sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(final) for f in fs)}
    with open(os.path.join(final, "pack.json"), "w") as f:
        json.dump(m, f, indent=1)
    _progress(1, "")
    return {**status(), "result": m}


def remove(p, b=None) -> dict:
    pack = p["pack"]
    shutil.rmtree(pack_dir(pack), ignore_errors=True)
    shutil.rmtree(pack_dir(pack) + ".installing", ignore_errors=True)
    if not installed():
        fp = fp32_heal_model()
        if fp and fp.startswith(os.path.expanduser("~")):
            try:
                os.unlink(fp)
            except OSError:
                pass
    return status()


def handlers():
    return {"gpu_status": status, "gpu_install": install, "gpu_remove": remove}

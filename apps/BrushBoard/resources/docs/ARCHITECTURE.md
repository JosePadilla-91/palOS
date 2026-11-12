# Architecture

```
┌────────────────────────── Electron renderer (TypeScript, Vite) ───────────────────────────┐
│  UI: menus · dock/panels · dialogs · options bar · toolbar                                 │
│  Tools ──► core ops / brush engine / selections ──► Doc (layer tree + history)             │
│                                     │                                                      │
│                       WebGL2 engine: float textures, shaders, compositor                    │
│                                     │                                                      │
│  Viewport: view transform → view shader (checkerboard, proof LUT, marching ants, grid)    │
└─────────────────────────────┬──────────────────────────────────────────────────────────────┘
                              │ contextBridge (preload.cjs)
┌─────────────────────────────▼───────────── Electron main (Node) ───────────────────────────┐
│  windows, dialogs, files, clipboard, prefs · PythonManager (one process per extension)     │
└─────────────────────────────┬──────────────────────────────────────────────────────────────┘
                 JSON-RPC on stdio + raw float32 buffers in /dev/shm
┌─────────────────────────────▼──────────────────────────────────────────────────────────────┐
│  python -m brushboard.worker --core     PSD r/w, RAW (LibRaw), TIFF/PNG16/EXR, ICC (LittleCMS) │
│  python -m brushboard.worker --ext X    one per extension: filters, tools, panels, commands   │
│  python -m brushboard.worker --script   automation scripts                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Pixels

- Every raster layer is a document-sized `RGBA16F` texture (`RGBA32F` in 32-bit documents) holding **straight-alpha, sRGB-encoded** colour. Masks and selections are `R16F`.
- In every off-screen pass, document pixel `(x, y)` equals `gl_FragCoord.xy`, with `y = 0` the top row. Only the final view pass flips to the screen.
- Shaders read with `texelFetch` (exact pixels); resampling (transforms, distortions) uses premultiplied bilinear/bicubic sampling written in GLSL.

## Compositing (`src/engine/compositor.ts`)

The compositor walks the layer tree bottom-up with pooled ping-pong textures, limited by a **dirty rectangle** (scissor), so painting only recomposites the area under the brush. It handles:

- blend modes (W3C compositing formulas, Photoshop soft light), opacity, masks
- isolated groups and pass-through groups (with opacity/mask)
- clipping groups (clipped layers keep the base's alpha)
- adjustment layers (applied to everything beneath them, inside their group)
- layer effects (shadow/glow via separable Gaussian blur, stroke via jump-flood distance fields)
- live previews: texture overrides (`doc.preview`) and live adjustment previews (`doc.previewAdjust`)

The result is premultiplied into a mipmapped display texture so zoomed-out views are smooth.

## History (`src/core/document.ts`)

Every undoable action is a transaction (`doc.begin` / `doc.commit`, or `doc.transact`). An entry stores:

- tree snapshots before/after (layer objects are cloned; textures are shared by reference)
- **pixel patches**: for brush strokes and other local edits, only the touched rectangle is copied (GPU-to-GPU) before and after.

Whole-layer operations simply swap in a new texture; the old one stays referenced by history. A garbage collector disposes textures no longer referenced by the document or any history state.

## Brush engine (`src/core/stroke.ts`)

Input samples (coalesced pointer events) are smoothed, resampled at the brush spacing, and turned into instanced dabs (position, radius, alpha, angle, roundness, colour). Dabs accumulate into a premultiplied **stroke buffer** with `flow` per dab; the stroke is merged into a preview of the layer with `opacity` as the ceiling — Photoshop's semantics. Clone/heal sample a snapshot (healing transfers high frequencies onto the destination's low frequencies). Smudge, blur, sharpen, dodge, burn and sponge are "direct" dabs that read a copy of the working texture. Spot healing runs a multi-scale diffusion fill over the painted area.

## Extensions

The renderer registers contributions reported by each worker's `describe` call. Filters reuse the same preview/commit pipeline as built-in GPU filters. Tools forward pointer events (moves are coalesced while Python is busy). Panels are declarative widget lists rendered natively. Python can call back into the app (`host.*`) mid-request; the main process forwards these to the renderer and returns the answer.

## Files

`.gio` is a zip: `manifest.json` (layer tree, properties, adjustment/text/effect parameters) plus raw half-float planes per layer and mask, the selection, and a preview PNG. PSD writing is a small spec-following writer (`python/brushboard/psd_writer.py`, `Lr16` for 16-bit); reading uses psd-tools.

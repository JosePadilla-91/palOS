const EASE_OUT = [0.33, 0];
const EASE_IN = [0.67, 1];
const LIN_OUT = [1 / 3, 1 / 3];
function isAnim(v2) {
  return typeof v2 === "object" && v2 !== null && Array.isArray(v2.k);
}
function bezierEase(u, x1, y1, x2, y2) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (s2) => ((ax * s2 + bx) * s2 + cx) * s2;
  const dsx = (s2) => (3 * ax * s2 + 2 * bx) * s2 + cx;
  let s = u;
  for (let i = 0; i < 8; i++) {
    const err = sx(s) - u;
    if (Math.abs(err) < 1e-6) break;
    const d = dsx(s);
    if (Math.abs(d) < 1e-6) break;
    s -= err / d;
  }
  if (s < 0 || s > 1 || Math.abs(sx(s) - u) > 1e-4) {
    let lo = 0;
    let hi = 1;
    s = u;
    for (let i = 0; i < 40; i++) {
      const x = sx(s);
      if (Math.abs(x - u) < 1e-7) break;
      if (x < u) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
  }
  return ((ay * s + by) * s + cy) * s;
}
function segmentProgress(a2, b2, t) {
  const span = b2.t - a2.t;
  if (span <= 0) return 1;
  const u = (t - a2.t) / span;
  if (a2.interp === "hold") return u >= 1 ? 1 : 0;
  if (a2.interp === "linear" && b2.interp !== "hold") return u;
  const out = a2.interp === "linear" ? LIN_OUT : a2.out;
  const inn = b2.in;
  return bezierEase(u, out[0], out[1], inn[0], inn[1]);
}
function locate(keys, t) {
  if (t <= keys[0].t) return { a: keys[0], b: null };
  const last = keys[keys.length - 1];
  if (t >= last.t) return { a: last, b: null };
  let lo = 0;
  let hi = keys.length - 1;
  while (hi - lo > 1) {
    const mid = lo + hi >> 1;
    if (keys[mid].t <= t) lo = mid;
    else hi = mid;
  }
  return { a: keys[lo], b: keys[hi] };
}
function evalNum(v2, t, fallback = 0) {
  if (v2 === void 0) return fallback;
  if (typeof v2 === "number") return v2;
  const keys = v2.k;
  if (keys.length === 0) return fallback;
  const { a: a2, b: b2 } = locate(keys, t);
  if (!b2) return a2.v;
  return a2.v + (b2.v - a2.v) * segmentProgress(a2, b2, t);
}
function evalPath(v2, t) {
  if (!isAnim(v2)) return v2;
  const keys = v2.k;
  if (keys.length === 0) return [];
  const { a: a2, b: b2 } = locate(keys, t);
  if (!b2 || a2.v.length !== b2.v.length) return a2.v;
  const p = segmentProgress(a2, b2, t);
  return a2.v.map((x, i) => x + (b2.v[i] - x) * p);
}
function makeKey(t, v2, interp = "linear") {
  return { t, v: v2, interp, in: [...EASE_IN], out: [...EASE_OUT] };
}
function keyIndexAt(a2, t, eps = 1e-4) {
  return a2.k.findIndex((k) => Math.abs(k.t - t) < eps);
}
function setKey(a2, t, v2, eps = 1e-4) {
  const k = a2.k.map((x) => ({ ...x }));
  const i = k.findIndex((x) => Math.abs(x.t - t) < eps);
  if (i >= 0) k[i].v = v2;
  else {
    const prev = [...k].reverse().find((x) => x.t < t);
    k.push(makeKey(t, v2, prev?.interp ?? "linear"));
    k.sort((x, y) => x.t - y.t);
  }
  return { k };
}
function removeKeyAt(a2, t, eps = 1e-4) {
  return { k: a2.k.filter((x) => Math.abs(x.t - t) >= eps) };
}
function writeNum(cur, t, v2) {
  if (isAnim(cur)) return setKey(cur, t, v2);
  return v2;
}
function writePath(cur, t, v2) {
  if (isAnim(cur)) return setKey(cur, t, v2);
  return v2;
}
function toggleAnimated(cur, t) {
  if (isAnim(cur)) return evalNum(cur, t);
  return { k: [makeKey(t, cur)] };
}
let counter = 0;
function uid(prefix) {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${counter.toString(36)}`;
}
const VIDEO_CATEGORIES = ["Keying", "Color", "Blur & Sharpen", "Stylize", "Distort", "Transform", "Time"];
const AUDIO_CATEGORIES = ["EQ & Filters", "Dynamics", "Reverb & Delay", "Pitch", "Cleanup", "Utility"];
const n = (key, label, min, max, def, step = 1, unit, group) => ({
  kind: "number",
  key,
  label,
  min,
  max,
  step,
  default: def,
  unit,
  group
});
const c = (key, label, def, group) => ({ kind: "color", key, label, default: def, group });
const b = (key, label, def, group) => ({ kind: "bool", key, label, default: def, group });
const e = (key, label, def, options, group) => ({ kind: "enum", key, label, default: def, options, group });
const pt = (key, label, x, y, group) => [
  { kind: "number", key: key + "X", label: label + " X", min: -100, max: 200, step: 0.1, default: x, unit: "%", group, point: { id: key, axis: "x" } },
  { kind: "number", key: key + "Y", label: label + " Y", min: -100, max: 200, step: 0.1, default: y, unit: "%", group, point: { id: key, axis: "y" } }
];
const edges = (def = true) => b("repeatEdges", "Repeat edge pixels", def);
const v = (type, name, category, description, params, extra = {}) => ({ type, name, category, kind: "video", description, params, ...extra });
const a = (type, name, category, description, params) => ({ type, name, category, kind: "audio", description, params });
const EFFECTS = [
  // ---------------- Keying ----------------
  v("chromaKey", "Chroma Key", "Keying", "Removes a green or blue screen, with spill suppression.", [
    c("keyColor", "Key colour", "#22c55e"),
    n("tolerance", "Tolerance", 0, 100, 45, 0.5),
    n("softness", "Softness", 0, 100, 12, 0.5),
    n("choke", "Choke", 0, 100, 0, 0.5),
    n("spill", "Spill suppress", 0, 100, 70),
    n("balance", "Hue protect", 0, 100, 50)
  ]),
  v("subjectKey", "Subject Key", "Keying", "Finds people with AI. Keys a green or blue screen without holes or junk, or cuts people out of any footage. Click Analyse after adding it.", [
    e("mode", "Use", "screen", [
      ["screen", "Screen + subject"],
      ["subject", "Subject only"],
      ["cleanup", "Clean up key above"]
    ]),
    c("keyColor", "Screen colour", "#22c55e", "Screen"),
    n("tolerance", "Tolerance", 0, 100, 45, 0.5, "", "Screen"),
    n("softness", "Softness", 0, 100, 12, 0.5, "", "Screen"),
    n("spill", "Spill suppress", 0, 100, 70, 1, "", "Screen"),
    n("protect", "Fill holes", 0, 100, 100, 1, "%", "Subject"),
    n("margin", "Junk margin", 0, 200, 24, 0.5, " px", "Subject"),
    n("choke", "Choke", -40, 40, 0, 0.1, " px", "Subject"),
    n("feather", "Feather", 0, 40, 2, 0.1, " px", "Subject"),
    n("snap", "Edge snap", 0, 100, 75, 1, "%", "Subject"),
    e("detail", "Analyse", "4", [
      ["1", "Every frame"],
      ["2", "Every 2nd frame"],
      ["4", "Every 4th frame"],
      ["8", "Every 8th frame"]
    ], "Analysis")
  ]),
  v("lumaKey", "Luma Key", "Keying", "Keys out dark (or bright) areas: smoke, fire, black-background elements.", [n("threshold", "Threshold", 0, 100, 10, 0.5), n("softness", "Softness", 0, 100, 10, 0.5), b("invert", "Key out brights", false)]),
  v("matteChoker", "Matte Choker", "Keying", "Shrinks or grows a key and softens its edge. Put it after a key.", [n("choke", "Choke", -50, 50, 1, 0.1, " px"), n("softness", "Softness", 0, 50, 1.5, 0.1, " px")]),
  v("alphaAdjust", "Alpha Adjust", "Keying", "Scales, inverts or ignores the layer alpha.", [n("opacity", "Opacity", 0, 100, 100, 0.1, "%"), b("invert", "Invert alpha", false), b("ignoreAlpha", "Ignore alpha", false)]),
  v("crop", "Crop", "Keying", "Crops edges with an optional feather.", [n("left", "Left", 0, 100, 0, 0.1, "%"), n("right", "Right", 0, 100, 0, 0.1, "%"), n("top", "Top", 0, 100, 0, 0.1, "%"), n("bottom", "Bottom", 0, 100, 0, 0.1, "%"), n("feather", "Feather", 0, 20, 0, 0.1, "%")]),
  // ---------------- Color ----------------
  v("colorCorrect", "Color Correction", "Color", "Quick exposure, contrast, saturation and white balance.", [n("exposure", "Exposure", -4, 4, 0, 0.01, " EV"), n("contrast", "Contrast", 0, 200, 100, 1, "%"), n("saturation", "Saturation", 0, 200, 100, 1, "%"), n("temperature", "Temperature", -100, 100, 0), n("tint", "Tint", -100, 100, 0), n("gamma", "Gamma", 0.2, 3, 1, 0.01)]),
  v("lumetri", "Lumetri Color", "Color", "Full grade: basic correction, curves and colour wheels. Edit it in the Color workspace.", [
    n("temperature", "Temperature", -100, 100, 0, 1, "", "Basic"),
    n("tint", "Tint", -100, 100, 0, 1, "", "Basic"),
    n("exposure", "Exposure", -4, 4, 0, 0.01, " EV", "Basic"),
    n("contrast", "Contrast", -100, 100, 0, 1, "", "Basic"),
    n("highlights", "Highlights", -100, 100, 0, 1, "", "Basic"),
    n("shadows", "Shadows", -100, 100, 0, 1, "", "Basic"),
    n("whites", "Whites", -100, 100, 0, 1, "", "Basic"),
    n("blacks", "Blacks", -100, 100, 0, 1, "", "Basic"),
    n("saturation", "Saturation", 0, 200, 100, 1, "%", "Basic"),
    n("vibrance", "Vibrance", -100, 100, 0, 1, "", "Creative"),
    n("fade", "Faded film", 0, 100, 0, 1, "", "Creative"),
    { kind: "curve", key: "curve", label: "RGB curve", default: "0,0;1,1", group: "Curves" },
    n("liftHue", "Shadows hue", 0, 360, 0, 1, "°", "Wheels"),
    n("liftSat", "Shadows colour", 0, 100, 0, 1, "", "Wheels"),
    n("liftLum", "Shadows level", -100, 100, 0, 1, "", "Wheels"),
    n("gammaHue", "Midtones hue", 0, 360, 0, 1, "°", "Wheels"),
    n("gammaSat", "Midtones colour", 0, 100, 0, 1, "", "Wheels"),
    n("gammaLum", "Midtones level", -100, 100, 0, 1, "", "Wheels"),
    n("gainHue", "Highlights hue", 0, 360, 0, 1, "°", "Wheels"),
    n("gainSat", "Highlights colour", 0, 100, 0, 1, "", "Wheels"),
    n("gainLum", "Highlights level", -100, 100, 0, 1, "", "Wheels")
  ]),
  v("lut", "Apply LUT", "Color", "Apply a .cube 3D LUT: log-to-Rec.709 conversions or creative looks.", [{ kind: "file", key: "path", label: "LUT file", default: "", extensions: ["cube"] }, n("intensity", "Intensity", 0, 100, 100, 1, "%")]),
  v("levels", "Levels", "Color", "Input and output black/white points with gamma, per channel.", [
    e("channel", "Channel", "rgb", [
      ["rgb", "RGB"],
      ["red", "Red"],
      ["green", "Green"],
      ["blue", "Blue"]
    ]),
    n("inBlack", "Input black", 0, 255, 0, 0.5),
    n("inWhite", "Input white", 0, 255, 255, 0.5),
    n("gamma", "Gamma", 0.1, 10, 1, 0.01),
    n("outBlack", "Output black", 0, 255, 0, 0.5),
    n("outWhite", "Output white", 0, 255, 255, 0.5)
  ]),
  v("curves", "Curves", "Color", "Master and per-channel RGB curves.", [
    { kind: "curve", key: "master", label: "Master", default: "0,0;1,1", tint: "#e6e8ec" },
    { kind: "curve", key: "red", label: "Red", default: "0,0;1,1", tint: "#ef6a5a" },
    { kind: "curve", key: "green", label: "Green", default: "0,0;1,1", tint: "#3ccf8e" },
    { kind: "curve", key: "blue", label: "Blue", default: "0,0;1,1", tint: "#5aa9ff" }
  ]),
  v("hueSat", "Hue/Saturation", "Color", "Shift hue, change saturation and lightness, or colorize.", [n("hue", "Hue", -180, 180, 0, 1, "°"), n("saturation", "Saturation", -100, 100, 0), n("lightness", "Lightness", -100, 100, 0), b("colorize", "Colorize", false), n("colorizeHue", "Colorize hue", 0, 360, 30, 1, "°"), n("colorizeSat", "Colorize saturation", 0, 100, 35)]),
  v("hslSecondary", "HSL Secondary", "Color", "Select a colour range (e.g. skin or sky) and adjust only that. Leave Color: desaturate everything else.", [
    n("hueCenter", "Hue", 0, 360, 120, 1, "°", "Select"),
    n("hueRange", "Hue range", 0, 180, 25, 1, "°", "Select"),
    n("hueSoft", "Hue softness", 0, 90, 20, 1, "°", "Select"),
    n("satMin", "Min saturation", 0, 100, 10, 1, "%", "Select"),
    n("lumaMin", "Min luma", 0, 100, 0, 1, "%", "Select"),
    n("lumaMax", "Max luma", 0, 100, 100, 1, "%", "Select"),
    n("lumaSoft", "Luma softness", 0, 50, 10, 1, "%", "Select"),
    b("showMask", "Show mask", false, "Select"),
    n("hueShift", "Hue shift", -180, 180, 0, 1, "°", "Correct"),
    n("satAdjust", "Saturation", -100, 100, 0, 1, "", "Correct"),
    n("lumAdjust", "Brightness", -100, 100, 0, 1, "", "Correct"),
    n("outsideDesat", "Desaturate others", 0, 100, 0, 1, "%", "Correct")
  ]),
  v("channelMixer", "Channel Mixer", "Color", "Rebuild each output channel from the inputs.", [
    n("rr", "Red ← red", -200, 200, 100, 1, "%", "Red output"),
    n("rg", "Red ← green", -200, 200, 0, 1, "%", "Red output"),
    n("rb", "Red ← blue", -200, 200, 0, 1, "%", "Red output"),
    n("rc", "Red constant", -100, 100, 0, 1, "%", "Red output"),
    n("gr", "Green ← red", -200, 200, 0, 1, "%", "Green output"),
    n("gg", "Green ← green", -200, 200, 100, 1, "%", "Green output"),
    n("gb", "Green ← blue", -200, 200, 0, 1, "%", "Green output"),
    n("gc", "Green constant", -100, 100, 0, 1, "%", "Green output"),
    n("br", "Blue ← red", -200, 200, 0, 1, "%", "Blue output"),
    n("bg", "Blue ← green", -200, 200, 0, 1, "%", "Blue output"),
    n("bb", "Blue ← blue", -200, 200, 100, 1, "%", "Blue output"),
    n("bc", "Blue constant", -100, 100, 0, 1, "%", "Blue output"),
    b("monochrome", "Monochrome (use red row)", false)
  ]),
  v("blackWhite", "Black & White", "Color", "Black and white with per-colour brightness and an optional tint.", [n("reds", "Reds", -200, 300, 40, 1, "%"), n("yellows", "Yellows", -200, 300, 60, 1, "%"), n("greens", "Greens", -200, 300, 40, 1, "%"), n("cyans", "Cyans", -200, 300, 60, 1, "%"), n("blues", "Blues", -200, 300, 20, 1, "%"), n("magentas", "Magentas", -200, 300, 80, 1, "%"), b("tintOn", "Tint", false), c("tintColor", "Tint colour", "#e0c38f"), n("tintAmount", "Tint amount", 0, 100, 50, 1, "%")]),
  v("tint", "Tint", "Color", "Maps black and white to two colours.", [c("black", "Map black to", "#000000"), c("white", "Map white to", "#ffffff"), n("amount", "Amount", 0, 100, 100, 1, "%")]),
  v("gradientMap", "Gradient Map / Duotone", "Color", "Maps brightness onto a two- or three-colour gradient.", [c("shadows", "Shadows", "#1b1340"), c("midtones", "Midtones", "#d0457a"), c("highlights", "Highlights", "#ffd27a"), b("useMid", "Use midtones (off = duotone)", true), n("amount", "Amount", 0, 100, 100, 1, "%")]),
  v("photoFilter", "Photo Filter", "Color", "A coloured lens filter: warming, cooling or any colour.", [c("color", "Filter colour", "#ec8a00"), n("density", "Density", 0, 100, 25, 1, "%"), b("preserve", "Preserve luminosity", true)]),
  v("brightnessContrast", "Brightness & Contrast", "Color", "Simple brightness and contrast.", [n("brightness", "Brightness", -100, 100, 0), n("contrast", "Contrast", -100, 100, 0)]),
  v("invert", "Invert", "Color", "Inverts colours, luma or a single channel.", [
    e("channel", "Channel", "rgb", [
      ["rgb", "RGB"],
      ["luma", "Luma only"],
      ["red", "Red"],
      ["green", "Green"],
      ["blue", "Blue"]
    ]),
    n("blend", "Amount", 0, 100, 100, 1, "%")
  ]),
  // ---------------- Blur & Sharpen ----------------
  v("blur", "Gaussian Blur", "Blur & Sharpen", "Smooth gaussian blur.", [
    n("radius", "Blurriness", 0, 200, 10, 0.1),
    e("direction", "Dimensions", "both", [
      ["both", "Horizontal and vertical"],
      ["h", "Horizontal"],
      ["v", "Vertical"]
    ]),
    edges()
  ]),
  v("directionalBlur", "Directional Blur", "Blur & Sharpen", "Motion blur along an angle.", [n("angle", "Direction", 0, 360, 0, 1, "°"), n("length", "Length", 0, 500, 20, 0.5, " px"), edges()]),
  v("radialBlur", "Radial Blur", "Blur & Sharpen", "Zoom or spin blur around a centre point.", [
    e("type", "Type", "zoom", [
      ["zoom", "Zoom"],
      ["spin", "Spin"]
    ]),
    n("amount", "Amount", 0, 100, 20, 0.1),
    ...pt("center", "Centre", 50, 50),
    edges()
  ]),
  v("lensBlur", "Lens Blur", "Blur & Sharpen", "Camera-lens (bokeh) blur that blooms bright highlights into discs.", [n("radius", "Radius", 0, 100, 10, 0.1, " px"), n("brightness", "Highlight boost", 0, 100, 40), n("threshold", "Highlight threshold", 0, 100, 75), edges()]),
  v("tiltShift", "Tilt-Shift", "Blur & Sharpen", "Miniature look: a sharp band with blur either side.", [n("focus", "Focus position", 0, 100, 55, 0.1, "%"), n("width", "Focus width", 0, 100, 15, 0.1, "%"), n("transition", "Transition", 1, 100, 25, 0.1, "%"), n("angle", "Angle", -90, 90, 0, 0.5, "°"), n("radius", "Blur", 0, 60, 14, 0.1, " px")]),
  v("sharpen", "Sharpen", "Blur & Sharpen", "Quick sharpening.", [n("amount", "Amount", 0, 300, 50), n("radius", "Radius", 0.5, 5, 1, 0.1)]),
  v("unsharpMask", "Unsharp Mask", "Blur & Sharpen", "Controlled sharpening with radius and threshold.", [n("amount", "Amount", 0, 500, 100, 1, "%"), n("radius", "Radius", 0.3, 50, 2, 0.1, " px"), n("threshold", "Threshold", 0, 100, 2)]),
  v("reduceNoise", "Reduce Noise", "Blur & Sharpen", "Edge-preserving smoothing for grainy footage and skin.", [n("radius", "Radius", 1, 8, 3, 0.1, " px"), n("strength", "Strength", 0, 100, 30)]),
  // ---------------- Stylize ----------------
  v("glow", "Glow", "Stylize", "Blooms bright areas.", [n("threshold", "Threshold", 0, 100, 60), n("radius", "Radius", 0, 200, 30, 0.1), n("intensity", "Intensity", 0, 400, 100, 1, "%"), c("tint", "Tint", "#ffffff")]),
  v("dropShadow", "Drop Shadow", "Stylize", "Shadow behind the layer: great for titles and keyed subjects.", [c("color", "Colour", "#000000"), n("opacity", "Opacity", 0, 100, 60, 1, "%"), n("angle", "Direction", 0, 360, 135, 1, "°"), n("distance", "Distance", 0, 200, 12, 0.1), n("softness", "Softness", 0, 200, 16, 0.1)]),
  v("stroke", "Stroke", "Stylize", "Outlines the layer: titles, logos, keyed subjects.", [
    c("color", "Colour", "#ffffff"),
    n("width", "Width", 0, 100, 6, 0.1, " px"),
    n("opacity", "Opacity", 0, 100, 100, 1, "%"),
    e("position", "Position", "outside", [
      ["outside", "Outside"],
      ["center", "Centre"],
      ["inside", "Inside"]
    ])
  ]),
  v("vignette", "Vignette", "Stylize", "Darkens (or lightens) the edges of the frame.", [n("amount", "Amount", -100, 100, -40), n("midpoint", "Midpoint", 0, 100, 50), n("roundness", "Roundness", -100, 100, 0), n("feather", "Feather", 0, 100, 50)]),
  v("filmGrain", "Film Grain", "Stylize", "Organic, animated grain.", [n("amount", "Amount", 0, 100, 30), n("size", "Grain size", 0.5, 8, 1.4, 0.1, " px"), n("softness", "Softness", 0, 100, 40), n("color", "Colour grain", 0, 100, 15), n("response", "Midtone response", 0, 100, 60), b("animate", "Animate", true)]),
  v("chromaticAberration", "Chromatic Aberration", "Stylize", "Lens colour fringing: red and blue split towards the edges.", [
    n("amount", "Amount", 0, 100, 8, 0.1, " px"),
    e("mode", "Mode", "radial", [
      ["radial", "Radial (lens)"],
      ["linear", "Linear"]
    ]),
    n("angle", "Angle (linear)", 0, 360, 0, 1, "°"),
    ...pt("center", "Centre", 50, 50)
  ]),
  v("rgbSplit", "RGB Split", "Stylize", "Offsets the red and blue channels.", [n("distance", "Distance", 0, 200, 10, 0.1, " px"), n("angle", "Angle", 0, 360, 0, 1, "°")]),
  v("glitch", "Glitch", "Stylize", "Digital corruption: displaced blocks, slices and RGB shifts.", [n("amount", "Amount", 0, 100, 50), n("blockSize", "Block size", 2, 200, 24, 0.5, " px"), n("rgbShift", "RGB shift", 0, 100, 14, 0.1, " px"), n("speed", "Speed", 0, 60, 12, 0.1, "/s"), n("scanlines", "Inverted lines", 0, 100, 20), n("seed", "Seed", 0, 1e3, 0)]),
  v("vhs", "VHS", "Stylize", "Tape look: chroma bleed, tracking noise, wobble and scanlines.", [n("amount", "Amount", 0, 100, 70), n("bleed", "Colour bleed", 0, 20, 4, 0.1, " px"), n("noise", "Noise", 0, 100, 30), n("tracking", "Tracking", 0, 100, 30), n("scanlines", "Scanlines", 0, 100, 30), n("wobble", "Wobble", 0, 100, 30)]),
  v("scanLines", "Scan Lines", "Stylize", "CRT scanlines with optional curvature.", [n("lines", "Lines", 50, 1200, 270), n("intensity", "Intensity", 0, 100, 40), n("softness", "Softness", 0, 100, 50), n("speed", "Scroll", -100, 100, 0), n("curvature", "Curvature", 0, 100, 0)]),
  v("halftone", "Halftone", "Stylize", "Print-style halftone dots, mono or colour.", [
    n("size", "Dot size", 2, 60, 8, 0.1, " px"),
    n("angle", "Angle", 0, 90, 45, 1, "°"),
    e("mode", "Mode", "mono", [
      ["mono", "Mono"],
      ["color", "Colour (CMY)"]
    ]),
    n("contrast", "Contrast", 0, 200, 100, 1, "%"),
    c("ink", "Ink", "#111111"),
    c("paper", "Paper", "#f4efe4")
  ]),
  v("pixelate", "Pixelate / Mosaic", "Stylize", "Big pixels or round dots.", [
    n("size", "Cell size", 1, 200, 16, 0.5, " px"),
    e("shape", "Shape", "square", [
      ["square", "Square"],
      ["circle", "Dots"]
    ])
  ]),
  v("posterize", "Posterize", "Stylize", "Reduces the number of colour levels.", [n("levels", "Levels", 2, 64, 6)]),
  v("emboss", "Emboss", "Stylize", "Raised relief from brightness edges.", [n("angle", "Direction", 0, 360, 135, 1, "°"), n("height", "Height", 0.5, 20, 2, 0.1, " px"), n("amount", "Amount", 0, 400, 150, 1, "%"), n("blend", "Blend with original", 0, 100, 0, 1, "%")]),
  v("findEdges", "Find Edges", "Stylize", "Line drawing from image edges.", [n("strength", "Strength", 0, 400, 120, 1, "%"), b("invert", "Dark lines on white", true), n("blend", "Blend with original", 0, 100, 0, 1, "%")]),
  v("cartoon", "Cartoon", "Stylize", "Flat colour with ink outlines.", [n("levels", "Colour levels", 2, 16, 5), n("threshold", "Edge threshold", 0, 100, 30), n("width", "Edge width", 0.5, 5, 1, 0.1, " px"), n("edgeStrength", "Edge strength", 0, 100, 85), n("saturation", "Saturation", 0, 200, 120, 1, "%")]),
  v("lightLeak", "Light Leak", "Stylize", "Drifting warm film light leaks.", [c("color1", "Colour 1", "#ff5a1f"), c("color2", "Colour 2", "#ffd27a"), n("intensity", "Intensity", 0, 200, 70, 1, "%"), n("scale", "Scale", 10, 300, 70, 1, "%"), n("speed", "Speed", 0, 200, 30, 1, "%"), n("seed", "Seed", 0, 1e3, 7)]),
  v("lensFlare", "Lens Flare", "Stylize", "A bright light source with streak, halo and ghosts.", [...pt("light", "Light", 25, 25), n("brightness", "Brightness", 0, 300, 100, 1, "%"), c("color", "Colour", "#ffd9a0"), n("ghosts", "Ghosts", 0, 12, 6), n("streak", "Streak", 0, 100, 40), n("halo", "Halo", 0, 100, 40)]),
  v("lightRays", "Light Rays", "Stylize", "God rays streaming from bright areas.", [...pt("center", "Source", 50, 30), n("length", "Length", 0, 100, 40), n("intensity", "Intensity", 0, 400, 120, 1, "%"), n("threshold", "Threshold", 0, 100, 60), c("color", "Colour", "#fff1d6")]),
  v("oldFilm", "Old Film", "Stylize", "Sepia, grain, flicker, scratches, dust and gate weave.", [n("amount", "Amount", 0, 100, 80), n("sepia", "Sepia", 0, 100, 70), n("grain", "Grain", 0, 100, 40), n("flicker", "Flicker", 0, 100, 30), n("scratches", "Scratches", 0, 100, 40), n("dust", "Dust", 0, 100, 30), n("jitter", "Gate weave", 0, 100, 20), n("vignette", "Vignette", 0, 100, 50)]),
  // ---------------- Distort ----------------
  v("cornerPin", "Corner Pin", "Distort", "Pin the four corners anywhere: screen replacements and perspective.", [...pt("tl", "Top left", 0, 0), ...pt("tr", "Top right", 100, 0), ...pt("br", "Bottom right", 100, 100), ...pt("bl", "Bottom left", 0, 100)]),
  v("bulge", "Bulge", "Distort", "Magnifies (or pinches) a round area.", [...pt("center", "Centre", 50, 50), n("radius", "Radius", 1, 100, 30, 0.1, "%"), n("strength", "Strength", -100, 100, 50)]),
  v("twirl", "Twirl", "Distort", "Twists the image around a point.", [...pt("center", "Centre", 50, 50), n("radius", "Radius", 1, 150, 50, 0.1, "%"), n("angle", "Angle", -1080, 1080, 180, 1, "°")]),
  v("waveWarp", "Wave Warp", "Distort", "Animated waves through the image.", [
    e("shape", "Wave", "sine", [
      ["sine", "Sine"],
      ["triangle", "Triangle"],
      ["square", "Square"]
    ]),
    n("amplitude", "Height", 0, 200, 10, 0.1, " px"),
    n("wavelength", "Width", 2, 2e3, 80, 1, " px"),
    n("direction", "Direction", 0, 360, 90, 1, "°"),
    n("speed", "Speed", -10, 10, 1, 0.05, " Hz"),
    n("phase", "Phase", 0, 360, 0, 1, "°")
  ]),
  v("ripple", "Ripple", "Distort", "Concentric ripples from a point, like a drop in water.", [...pt("center", "Centre", 50, 50), n("amplitude", "Amplitude", 0, 100, 8, 0.1, " px"), n("wavelength", "Wavelength", 2, 400, 40, 1, " px"), n("speed", "Speed", -10, 10, 2, 0.05, " Hz"), n("decay", "Decay", 0, 100, 30)]),
  v("lensDistortion", "Lens Distortion", "Distort", "Barrel / fisheye or pincushion distortion. Negative values correct GoPro-style barrel.", [n("curvature", "Curvature", -100, 100, 30), b("fill", "Scale to fill", true)]),
  v("kaleidoscope", "Kaleidoscope", "Distort", "Mirrored segments around a centre.", [n("segments", "Segments", 2, 24, 6), n("angle", "Rotation", 0, 360, 0, 1, "°"), ...pt("center", "Centre", 50, 50), n("zoom", "Zoom", 10, 400, 100, 1, "%")]),
  v("reflect", "Mirror", "Distort", "Reflects one side of a line onto the other.", [n("angle", "Angle", 0, 360, 0, 1, "°"), ...pt("center", "Centre", 50, 50)]),
  v("offsetTile", "Offset & Tile", "Distort", "Shifts the image with wrap-around and tiles it.", [n("shiftX", "Shift X", -100, 100, 0, 0.1, "%"), n("shiftY", "Shift Y", -100, 100, 0, 0.1, "%"), n("tilesX", "Tiles across", 1, 20, 1, 0.1), n("tilesY", "Tiles down", 1, 20, 1, 0.1), b("mirror", "Mirror edges", false)]),
  v("turbulentDisplace", "Turbulent Displace", "Distort", "Organic noise warping: heat haze, water, dreamy looks.", [n("amount", "Amount", 0, 200, 20, 0.1, " px"), n("size", "Size", 2, 500, 60, 1, " px"), n("complexity", "Complexity", 1, 8, 3), n("evolution", "Evolution", 0, 3600, 0, 1, "°"), n("speed", "Auto evolve", 0, 360, 30, 1, "°/s"), n("seed", "Seed", 0, 1e3, 0)]),
  v("polarCoordinates", "Polar Coordinates", "Distort", "Wraps the image into a circle (tiny planet) or unwraps it.", [
    e("type", "Type", "toPolar", [
      ["toPolar", "Rectangular to polar"],
      ["toRect", "Polar to rectangular"]
    ]),
    n("amount", "Interpolation", 0, 100, 100, 1, "%")
  ]),
  // ---------------- Transform ----------------
  v("transform", "Transform", "Transform", "An extra transform with skew and real motion blur (shutter angle).", [n("posX", "Position X", -4e3, 4e3, 0, 1, " px"), n("posY", "Position Y", -4e3, 4e3, 0, 1, " px"), n("scale", "Scale", 0, 1e3, 100, 0.1, "%"), n("skew", "Skew", -70, 70, 0, 0.1, "°"), n("skewAxis", "Skew axis", 0, 360, 0, 1, "°"), n("rotation", "Rotation", -3600, 3600, 0, 0.1, "°"), n("opacity", "Opacity", 0, 100, 100, 0.1, "%"), n("shutter", "Shutter angle", 0, 720, 180, 1, "°"), n("samples", "Motion blur samples", 1, 16, 8)]),
  v("mirror", "Flip", "Transform", "Flip the image horizontally or vertically.", [b("horizontal", "Horizontal", true), b("vertical", "Vertical", false)]),
  v("stabilizer", "Stabilizer", "Transform", "Analyses camera shake and smooths it out. Click Analyse after adding it.", [
    n("smoothness", "Smoothness", 0, 100, 50),
    e("method", "Method", "similarity", [
      ["similarity", "Position, scale, rotation"],
      ["position", "Position only"]
    ]),
    e("framing", "Framing", "crop", [
      ["crop", "Stabilize, crop, auto-scale"],
      ["none", "Stabilize only"]
    ]),
    n("extraScale", "Additional scale", 100, 200, 100, 0.1, "%"),
    b("lock", "No motion (locked off)", false)
  ]),
  // ---------------- Time ----------------
  v("posterizeTime", "Posterize Time", "Time", "Plays the layer at a lower frame rate (choppy / stop-motion).", [n("rate", "Frame rate", 1, 60, 12, 1, " fps")], { time: true }),
  v("echo", "Echo / Trails", "Time", "Trails of previous frames behind moving content.", [
    n("echoes", "Echoes", 1, 8, 3),
    n("interval", "Frames apart", 1, 10, 2),
    n("decay", "Decay", 0, 100, 60, 1, "%"),
    e("operator", "Operator", "behind", [
      ["behind", "Composite behind"],
      ["front", "Composite in front"],
      ["add", "Add"],
      ["lighten", "Lighten"],
      ["screen", "Screen"],
      ["blend", "Blend"]
    ])
  ]),
  // ================= Audio =================
  a("eq", "Parametric EQ", "EQ & Filters", "High-pass, low shelf, three bells, high shelf and low-pass.", [
    b("hpOn", "High-pass", false, "Low cut"),
    n("hpFreq", "High-pass freq", 20, 1e3, 80, 1, " Hz", "Low cut"),
    n("lsFreq", "Low shelf freq", 20, 1e3, 120, 1, " Hz", "Low"),
    n("lsGain", "Low shelf gain", -24, 24, 0, 0.1, " dB", "Low"),
    n("p1Freq", "Bell 1 freq", 40, 2e4, 300, 1, " Hz", "Bell 1"),
    n("p1Gain", "Bell 1 gain", -24, 24, 0, 0.1, " dB", "Bell 1"),
    n("p1Q", "Bell 1 Q", 0.1, 18, 1, 0.01, "", "Bell 1"),
    n("p2Freq", "Bell 2 freq", 40, 2e4, 1200, 1, " Hz", "Bell 2"),
    n("p2Gain", "Bell 2 gain", -24, 24, 0, 0.1, " dB", "Bell 2"),
    n("p2Q", "Bell 2 Q", 0.1, 18, 1, 0.01, "", "Bell 2"),
    n("p3Freq", "Bell 3 freq", 40, 2e4, 4e3, 1, " Hz", "Bell 3"),
    n("p3Gain", "Bell 3 gain", -24, 24, 0, 0.1, " dB", "Bell 3"),
    n("p3Q", "Bell 3 Q", 0.1, 18, 1, 0.01, "", "Bell 3"),
    n("hsFreq", "High shelf freq", 1e3, 2e4, 8e3, 1, " Hz", "High"),
    n("hsGain", "High shelf gain", -24, 24, 0, 0.1, " dB", "High"),
    b("lpOn", "Low-pass", false, "High cut"),
    n("lpFreq", "Low-pass freq", 1e3, 2e4, 16e3, 1, " Hz", "High cut"),
    n("output", "Output", -24, 24, 0, 0.1, " dB", "Output")
  ]),
  a("compressor", "Compressor", "Dynamics", "Evens out levels: makes dialogue consistent and punchy.", [n("threshold", "Threshold", -60, 0, -18, 0.1, " dB"), n("ratio", "Ratio", 1, 20, 3, 0.1, ":1"), n("attack", "Attack", 0.1, 200, 10, 0.1, " ms"), n("release", "Release", 10, 2e3, 150, 1, " ms"), n("knee", "Knee", 0, 24, 6, 0.1, " dB"), n("makeup", "Make-up gain", -12, 24, 0, 0.1, " dB"), b("auto", "Auto make-up", false)]),
  a("limiter", "Limiter", "Dynamics", "Brick-wall limiter with look-ahead: nothing goes over the ceiling.", [n("ceiling", "Ceiling", -24, 0, -1, 0.1, " dB"), n("input", "Input gain", -12, 24, 0, 0.1, " dB"), n("release", "Release", 1, 1e3, 60, 1, " ms")]),
  a("gate", "Noise Gate", "Dynamics", "Silences quiet passages between words or hits.", [n("threshold", "Threshold", -90, 0, -50, 0.1, " dB"), n("attack", "Attack", 0.1, 100, 2, 0.1, " ms"), n("hold", "Hold", 0, 500, 50, 1, " ms"), n("release", "Release", 5, 2e3, 120, 1, " ms"), n("range", "Range", -90, 0, -60, 0.1, " dB")]),
  a("reverb", "Reverb", "Reverb & Delay", "Room ambience, from small booth to large hall.", [n("size", "Room size", 0, 100, 50), n("damping", "Damping", 0, 100, 50), n("width", "Width", 0, 100, 100, 1, "%"), n("predelay", "Pre-delay", 0, 200, 10, 1, " ms"), n("wet", "Wet", 0, 100, 25, 1, "%"), n("dry", "Dry", 0, 100, 100, 1, "%")]),
  a("delay", "Delay", "Reverb & Delay", "Echo with feedback, ping-pong and high cut.", [n("time", "Time", 1, 2e3, 350, 1, " ms"), n("feedback", "Feedback", 0, 95, 35, 1, "%"), n("mix", "Mix", 0, 100, 25, 1, "%"), b("pingpong", "Ping-pong", false), n("highcut", "High cut", 500, 2e4, 6e3, 1, " Hz")]),
  a("pitchShift", "Pitch Shifter", "Pitch", "Changes pitch without changing speed.", [n("semitones", "Semitones", -24, 24, 0, 1), n("cents", "Cents", -100, 100, 0, 1), n("mix", "Mix", 0, 100, 100, 1, "%")]),
  a("denoise", "Noise Reduction", "Cleanup", "Removes steady background noise (hiss, fans, room tone).", [n("reduction", "Reduction", 0, 40, 12, 0.1, " dB"), n("sensitivity", "Sensitivity", 0, 100, 50)]),
  a("deesser", "De-esser", "Cleanup", 'Tames harsh "s" sounds.', [n("frequency", "Frequency", 3e3, 12e3, 6500, 10, " Hz"), n("threshold", "Threshold", -60, 0, -28, 0.1, " dB"), n("reduction", "Max reduction", 0, 24, 8, 0.1, " dB")]),
  a("humRemoval", "Hum Removal", "Cleanup", "Notches out mains hum and its harmonics.", [
    e("frequency", "Mains frequency", "60", [
      ["60", "60 Hz (North America)"],
      ["50", "50 Hz (Europe, Asia)"]
    ]),
    n("harmonics", "Harmonics", 1, 8, 4),
    n("q", "Notch Q", 1, 100, 30)
  ]),
  a("channelTools", "Channel Tools", "Utility", "Mono, swap, fill left/right, phase invert, width and gain.", [
    e("mode", "Channels", "stereo", [
      ["stereo", "Stereo"],
      ["mono", "Mono (sum)"],
      ["left", "Left to both"],
      ["right", "Right to both"],
      ["swap", "Swap L/R"]
    ]),
    b("invertL", "Invert left phase", false),
    b("invertR", "Invert right phase", false),
    n("width", "Stereo width", 0, 200, 100, 1, "%"),
    n("gain", "Gain", -24, 24, 0, 0.1, " dB")
  ])
];
const EFFECT_MAP = new Map(EFFECTS.map((d) => [d.type, d]));
function effectDef(type) {
  const d = EFFECT_MAP.get(type);
  if (!d) throw new Error(`Unknown effect ${type}`);
  return d;
}
function isEffectType(type) {
  return EFFECT_MAP.has(type);
}
function createEffect(type) {
  const def = effectDef(type);
  const params = {};
  for (const p of def.params) params[p.key] = p.default;
  return { id: uid("fx"), type, enabled: true, params };
}
const GENERATORS = [
  { type: "linearGradient", name: "Linear Gradient", description: "Two-colour gradient between two points.", params: [...pt("start", "Start", 0, 50), ...pt("end", "End", 100, 50), c("colorA", "Start colour", "#101820"), c("colorB", "End colour", "#f2a33a"), n("midpoint", "Midpoint", 1, 99, 50, 0.1, "%"), b("smooth", "Smooth", true)] },
  { type: "radialGradient", name: "Radial Gradient", description: "Circular gradient from a centre.", params: [...pt("center", "Centre", 50, 50), n("radius", "Radius", 1, 200, 70, 0.1, "%"), c("colorA", "Inner colour", "#f2a33a"), c("colorB", "Outer colour", "#101820"), n("midpoint", "Midpoint", 1, 99, 50, 0.1, "%")] },
  { type: "fourColor", name: "4-Color Gradient", description: "Four coloured points blended together.", params: [...pt("p1", "Point 1", 10, 10), c("c1", "Colour 1", "#ff3b6b"), ...pt("p2", "Point 2", 90, 10), c("c2", "Colour 2", "#ffd23b"), ...pt("p3", "Point 3", 90, 90), c("c3", "Colour 3", "#3bd1ff"), ...pt("p4", "Point 4", 10, 90), c("c4", "Colour 4", "#7a3bff"), n("blend", "Blend", 0.5, 10, 2, 0.1)] },
  {
    type: "noise",
    name: "Fractal Noise",
    description: "Animated clouds, smoke, turbulence or cells: great as mattes and textures.",
    params: [
      e("type", "Type", "smooth", [
        ["smooth", "Smooth"],
        ["turbulent", "Turbulent"],
        ["cellular", "Cellular"]
      ]),
      n("scale", "Scale", 2, 2e3, 160, 1, " px"),
      n("complexity", "Complexity", 1, 8, 5),
      n("contrast", "Contrast", 0, 400, 100, 1, "%"),
      n("brightness", "Brightness", -100, 100, 0),
      n("evolution", "Evolution", 0, 3600, 0, 1, "°"),
      n("speed", "Auto evolve", 0, 360, 30, 1, "°/s"),
      b("color", "Colour noise", false),
      n("seed", "Seed", 0, 1e3, 0)
    ]
  },
  { type: "grid", name: "Grid", description: "Evenly spaced lines.", params: [n("size", "Cell size", 4, 1e3, 80, 1, " px"), n("width", "Line width", 0.5, 50, 2, 0.1, " px"), c("color", "Line colour", "#ffffff"), c("background", "Background", "#000000"), n("bgOpacity", "Background opacity", 0, 100, 0, 1, "%"), n("offsetX", "Offset X", -1e3, 1e3, 0, 1, " px"), n("offsetY", "Offset Y", -1e3, 1e3, 0, 1, " px")] },
  { type: "checkerboard", name: "Checkerboard", description: "Alternating squares.", params: [n("size", "Square size", 2, 1e3, 60, 1, " px"), c("colorA", "Colour A", "#ffffff"), c("colorB", "Colour B", "#000000"), n("offsetX", "Offset X", -1e3, 1e3, 0, 1, " px"), n("offsetY", "Offset Y", -1e3, 1e3, 0, 1, " px")] }
];
function generatorDef(type) {
  const d = GENERATORS.find((g) => g.type === type);
  if (!d) throw new Error(`Unknown generator ${type}`);
  return d;
}
function createGeneratorParams(type) {
  const out = {};
  for (const p of generatorDef(type).params) out[p.key] = p.default;
  return out;
}
function paramDefs(type) {
  return EFFECT_MAP.get(type)?.params ?? GENERATORS.find((g) => g.type === type)?.params ?? [];
}
function pnum(params, defs, key, t = 0) {
  const v2 = params[key];
  if (typeof v2 === "number" || typeof v2 === "object" && v2 !== null) return evalNum(v2, t);
  const def = defs.find((p) => p.key === key);
  return def && def.kind === "number" ? def.default : 0;
}
function pstr(params, defs, key) {
  const v2 = params[key];
  if (typeof v2 === "string") return v2;
  const def = defs.find((p) => p.key === key);
  return def && "default" in def && typeof def.default === "string" ? def.default : "";
}
function pbool(params, defs, key) {
  const v2 = params[key];
  if (typeof v2 === "boolean") return v2;
  const def = defs.find((p) => p.key === key);
  return def && def.kind === "bool" ? def.default : false;
}
function num$1(e2, key, t = 0) {
  return pnum(e2.params, paramDefs(e2.type), key, t);
}
function str(e2, key) {
  return pstr(e2.params, paramDefs(e2.type), key);
}
function bool(e2, key) {
  return pbool(e2.params, paramDefs(e2.type), key);
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const v2 = parseInt(h.length === 3 ? h.split("").map((c2) => c2 + c2).join("") : h.slice(0, 6), 16);
  return [(v2 >> 16 & 255) / 255, (v2 >> 8 & 255) / 255, (v2 & 255) / 255];
}
function rgbToHex(r, g, b2) {
  const c2 = (v2) => Math.round(Math.max(0, Math.min(255, v2))).toString(16).padStart(2, "0");
  return `#${c2(r)}${c2(g)}${c2(b2)}`;
}
function parseCurve(s) {
  const pts = s.split(";").map((p) => p.split(",").map(Number)).filter((p) => p.length === 2 && p.every((x) => Number.isFinite(x)));
  pts.sort((a2, b2) => a2[0] - b2[0]);
  if (pts.length < 2) return [
    [0, 0],
    [1, 1]
  ];
  return pts;
}
function serializeCurve(pts) {
  return pts.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join(";");
}
function curveTable(pts, size = 256) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const k = xs.length;
  const d = [];
  const m = new Array(k).fill(0);
  for (let i = 0; i < k - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[k - 1] = d[k - 2];
  for (let i = 1; i < k - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < k - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a2 = m[i] / d[i];
    const b2 = m[i + 1] / d[i];
    const s = a2 * a2 + b2 * b2;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a2 * d[i];
      m[i + 1] = t * b2 * d[i];
    }
  }
  const out = new Float32Array(size);
  for (let j = 0; j < size; j++) {
    const x = j / (size - 1);
    let i = 0;
    while (i < k - 2 && x > xs[i + 1]) i++;
    if (x <= xs[0]) {
      out[j] = ys[0];
      continue;
    }
    if (x >= xs[k - 1]) {
      out[j] = ys[k - 1];
      continue;
    }
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    out[j] = (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  }
  return out;
}
const TRANSITION_CATEGORIES = ["Dissolve", "Movement", "Wipe", "Iris", "Modern", "Pattern", "3D", "Audio"];
const dir4 = (label = "Direction") => ({
  kind: "enum",
  key: "direction",
  label,
  default: "left",
  options: [
    ["left", "From left"],
    ["right", "From right"],
    ["top", "From top"],
    ["bottom", "From bottom"]
  ]
});
const pushDir = {
  kind: "enum",
  key: "direction",
  label: "Direction",
  default: "left",
  options: [
    ["left", "From right"],
    ["right", "From left"],
    ["top", "From bottom"],
    ["bottom", "From top"]
  ]
};
const axis = {
  kind: "enum",
  key: "axis",
  label: "Orientation",
  default: "vertical",
  options: [
    ["vertical", "Vertical (opens left/right)"],
    ["horizontal", "Horizontal (opens up/down)"]
  ]
};
const corner = (def = "bottomRight", withCenter = false) => ({
  kind: "enum",
  key: "corner",
  label: "From",
  default: def,
  options: [
    ["topLeft", "Top left"],
    ["topRight", "Top right"],
    ["bottomLeft", "Bottom left"],
    ["bottomRight", "Bottom right"],
    ...withCenter ? [["center", "Centre"]] : []
  ]
});
const soft = (d = 5) => n("softness", "Softness", 0, 50, d);
const persp = (d = 50) => n("perspective", "Perspective", 0, 100, d);
const tl = (type, name, category, description, params = []) => ({ type, name, category, audio: false, description, params, mode: "layer" });
const tp = (type, name, category, description, params = []) => ({ type, name, category, audio: false, description, params, mode: "pair" });
const ta = (type, name, description) => ({ type, name, category: "Audio", audio: true, description, params: [], mode: "layer" });
const TRANSITIONS = [
  tl("crossDissolve", "Cross Dissolve", "Dissolve", "Blends one clip into the next."),
  tl("additiveDissolve", "Additive Dissolve", "Dissolve", "Adds the clips together: brightens through the middle."),
  tl("filmDissolve", "Film Dissolve", "Dissolve", "Blends in linear light, like a film optical. Smoother midpoint."),
  tl("blurDissolve", "Blur Dissolve", "Dissolve", "Blurs out of one clip and into the next.", [n("amount", "Blur", 0, 200, 40, 1)]),
  tl("dipToBlack", "Dip to Black", "Dissolve", "Fades down to black, then up into the next clip."),
  tl("dipToWhite", "Dip to White", "Dissolve", "Flashes to white between clips."),
  tl("dipToColor", "Dip to Color", "Dissolve", "Dips through any colour.", [c("color", "Colour", "#f2a33a")]),
  tp("lumaFade", "Luma Fade", "Dissolve", "Dissolves through the brightness of the outgoing clip: darks (or lights) go first.", [soft(20), b("invert", "Lights first", false)]),
  tp("rippleDissolve", "Ripple Dissolve", "Dissolve", "A watery ripple carries one clip into the next.", [n("amplitude", "Amplitude", 0, 100, 30), n("frequency", "Ripples", 1, 60, 18)]),
  tl("push", "Push", "Movement", "The next clip pushes the current one off screen.", [pushDir]),
  tl("slide", "Slide", "Movement", "The next clip slides in over the current one.", [pushDir]),
  tl("split", "Split", "Movement", "The current clip splits in two and slides apart.", [axis]),
  tl("zoom", "Cross Zoom", "Movement", "Zooms through the cut.", [n("strength", "Strength", 0, 300, 100)]),
  tp("crossStretch", "Cross Stretch", "Movement", "The outgoing clip squeezes away while the next stretches in.", [
    e("axis", "Direction", "horizontal", [
      ["horizontal", "Horizontal"],
      ["vertical", "Vertical"]
    ])
  ]),
  tl("wipe", "Wipe", "Wipe", "A straight edge wipes across.", [dir4(), soft()]),
  tl("bandWipe", "Band Wipe", "Wipe", "Interleaved bands wipe in from alternate sides.", [n("bands", "Bands", 2, 24, 6), soft(2)]),
  tl("barnDoor", "Barn Door", "Wipe", "Opens from the centre like doors.", [axis, soft()]),
  tl("clockWipe", "Clock Wipe", "Wipe", "Sweeps around like a clock hand.", [soft(2)]),
  tp("radialWipe", "Radial Wipe", "Wipe", "Sweeps around a corner (or the centre).", [corner("topLeft", true), soft(2)]),
  tp("venetianBlinds", "Venetian Blinds", "Wipe", "Slats open to reveal the next clip.", [n("bands", "Slats", 2, 40, 10), axis, soft(2)]),
  tp("gradientWipe", "Gradient Wipe", "Wipe", "Wipes through a pattern: any image, or a built-in gradient.", [
    e("pattern", "Pattern", "clouds", [
      ["clouds", "Clouds"],
      ["linear", "Linear"],
      ["radial", "Radial"],
      ["spiral", "Spiral"],
      ["diamond", "Diamond"],
      ["noise", "Fine noise"],
      ["image", "Image file"]
    ]),
    { kind: "file", key: "image", label: "Pattern image", default: "", extensions: ["png", "jpg", "jpeg", "webp", "bmp"] },
    soft(10),
    b("invert", "Invert", false)
  ]),
  tl("irisRound", "Iris Round", "Iris", "A circle opens from the centre.", [soft()]),
  tl("irisBox", "Iris Box", "Iris", "A rectangle opens from the centre.", [soft()]),
  tl("irisDiamond", "Iris Diamond", "Iris", "A diamond opens from the centre.", [soft()]),
  tp("irisCross", "Iris Cross", "Iris", "A cross opens from the centre.", [soft()]),
  tp("irisStar", "Iris Star", "Iris", "A star opens from the centre.", [n("points", "Points", 3, 12, 5), soft()]),
  tp("inset", "Inset", "Iris", "The next clip grows in from a corner.", [corner("topLeft"), soft(1)]),
  tp("whipPan", "Whip Pan", "Modern", "A fast camera whip with motion blur.", [pushDir, n("blur", "Motion blur", 0, 100, 60)]),
  tp("zoomBlur", "Zoom Blur", "Modern", "Punches into the outgoing clip and out of the next with radial blur.", [n("strength", "Strength", 0, 100, 50), e("mode", "Mode", "in", [["in", "Zoom in"], ["out", "Zoom out"]])]),
  tp("spin", "Spin", "Modern", "Spins through the cut with blur.", [n("turns", "Rotation", 0, 720, 180, 1, "°"), n("blur", "Blur", 0, 100, 60), b("clockwise", "Clockwise", true)]),
  tp("glitchTransition", "Glitch", "Modern", "Digital breakup between the clips.", [n("intensity", "Intensity", 0, 100, 60), n("blockSize", "Block size", 2, 100, 20)]),
  tp("lightLeakTransition", "Light Leak", "Modern", "A warm burst of film light carries the cut.", [c("color", "Colour", "#ff8a3c"), n("intensity", "Intensity", 0, 200, 100, 1, "%")]),
  tp("filmBurn", "Film Burn", "Modern", "The frame burns away into the next clip.", [c("color", "Burn colour", "#ff7a1a"), n("scale", "Scale", 10, 300, 100, 1, "%")]),
  tp("flash", "Flash", "Modern", "A quick bright flash on the cut.", [c("color", "Colour", "#ffffff"), n("intensity", "Intensity", 0, 100, 100, 1, "%")]),
  tp("checkerWipe", "Checker Wipe", "Pattern", "Alternating squares wipe in.", [n("cells", "Squares across", 2, 40, 10)]),
  tp("randomBlocks", "Random Blocks", "Pattern", "Blocks of the next clip appear at random.", [n("cells", "Blocks across", 2, 80, 16)]),
  tp("pixelateTransition", "Pixelate", "Pattern", "Pixelates out of one clip and into the next.", [n("size", "Max block size", 2, 200, 60, 1, " px")]),
  tp("swirl", "Swirl", "Pattern", "Twists into the next clip.", [n("strength", "Strength", 0, 100, 60)]),
  tp("cubeSpin", "Cube Spin", "3D", "The frame rotates like a cube to reveal the next clip.", [pushDir, persp(50)]),
  tp("flipOver", "Flip Over", "3D", "The frame flips over like a card.", [axis, persp(50)]),
  tp("pageTurn", "Page Peel", "3D", "The page curls away from a corner.", [corner("bottomRight"), n("radius", "Curl size", 2, 40, 12)]),
  tp("door", "Door", "3D", "Swings open like a door (or a pair of doors).", [
    e("hinge", "Hinge", "left", [
      ["left", "Left"],
      ["right", "Right"],
      ["both", "Double doors"]
    ]),
    persp(50)
  ]),
  ta("crossfade", "Constant Power", "Smooth crossfade with no dip in level. The usual choice."),
  ta("constantGain", "Constant Gain", "Linear fade. Can sound abrupt, but good for tight cuts."),
  ta("exponentialFade", "Exponential Fade", "Fades on a curve that sounds natural for fades from and to silence.")
];
const TRANSITION_MAP = new Map(TRANSITIONS.map((t) => [t.type, t]));
function transitionDef(type) {
  return TRANSITION_MAP.get(type) ?? TRANSITIONS[0];
}
function isPairTransition(type) {
  return TRANSITION_MAP.get(type)?.mode === "pair";
}
function createTransition(type, duration = 1, defaults) {
  const def = transitionDef(type);
  const params = {};
  for (const p of def.params) params[p.key] = typeof p.default === "boolean" ? p.default ? 1 : 0 : p.default;
  return { id: uid("tr"), type, duration, params, align: defaults?.align ?? "center", ease: defaults?.ease ?? "linear" };
}
function easeProgress(p, ease) {
  switch (ease) {
    case "easeIn":
      return p * p;
    case "easeOut":
      return 1 - (1 - p) * (1 - p);
    case "easeInOut":
      return p * p * (3 - 2 * p);
    default:
      return p;
  }
}
const fx$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AUDIO_CATEGORIES,
  EFFECTS,
  GENERATORS,
  TRANSITIONS,
  TRANSITION_CATEGORIES,
  VIDEO_CATEGORIES,
  bool,
  createEffect,
  createGeneratorParams,
  createTransition,
  curveTable,
  easeProgress,
  effectDef,
  generatorDef,
  hexToRgb,
  isEffectType,
  isPairTransition,
  num: num$1,
  paramDefs,
  parseCurve,
  pbool,
  pnum,
  pstr,
  rgbToHex,
  serializeCurve,
  str,
  transitionDef
}, Symbol.toStringTag, { value: "Module" }));
const MAX_NEST_DEPTH = 8;
function getSeq(doc, id) {
  return doc.sequences.find((s) => s.id === id);
}
function clipEnd(c2) {
  return c2.start + c2.duration;
}
function sourceTime(c2, t) {
  return c2.in + posterize(c2, t - c2.start) * c2.speed;
}
function posterize(c2, local) {
  const fx2 = c2.effects.find((e2) => e2.type === "posterizeTime" && e2.enabled);
  if (!fx2) return local;
  const raw = fx2.params.rate;
  const rate = Math.max(0.1, typeof raw === "number" || typeof raw === "object" && raw !== null ? evalNum(raw, c2.in + local * c2.speed) : 12);
  return Math.floor(local * rate + 1e-6) / rate;
}
const GL_X = [-0.906179845938664, -0.5384693101056831, 0, 0.5384693101056831, 0.906179845938664];
const GL_W = [0.23692688505618908, 0.47862867049936647, 0.5688888888888889, 0.47862867049936647, 0.23692688505618908];
function integrate(f, a2, b2, pieces = 4) {
  if (a2 === b2) return 0;
  const h = (b2 - a2) / pieces;
  let s = 0;
  for (let p = 0; p < pieces; p++) {
    const m = a2 + h * (p + 0.5);
    for (let i = 0; i < 5; i++) s += GL_W[i] * f(m + GL_X[i] * h / 2);
  }
  return s * h / 2;
}
const remapCache = /* @__PURE__ */ new WeakMap();
function remapOffset(r, local, kt0 = 0, kRate = 1) {
  if (typeof r === "number") return r / 100 * local;
  if (!r.k.length) return local;
  const kr = Math.max(1e-6, kRate);
  const f = (x) => evalNum(r, kt0 + x * kr, 100) / 100;
  let byShift = remapCache.get(r);
  if (!byShift) {
    byShift = /* @__PURE__ */ new Map();
    remapCache.set(r, byShift);
  }
  const key = `${kt0}|${kr}`;
  let tab = byShift.get(key);
  if (!tab) {
    const b2 = [0, ...r.k.map((k) => (k.t - kt0) / kr).filter((x) => x > 0)];
    const c2 = [0];
    for (let i2 = 1; i2 < b2.length; i2++) c2.push(c2[i2 - 1] + integrate(f, b2[i2 - 1], b2[i2]));
    tab = { b: b2, c: c2 };
    if (byShift.size > 16) byShift.clear();
    byShift.set(key, tab);
  }
  if (local <= 0) return integrate(f, 0, local);
  let i = tab.b.length - 1;
  while (i > 0 && tab.b[i] > local) i--;
  return tab.c[i] + integrate(f, tab.b[i], local);
}
function sourceRate(c2, local) {
  if (c2.freeze !== void 0) return 0;
  const r = c2.remap !== void 0 ? evalNum(c2.remap, c2.in + local * c2.speed, 100) / 100 : c2.speed;
  return c2.reverse ? -r : r;
}
function sourceSpan(c2) {
  return c2.remap !== void 0 ? remapOffset(c2.remap, c2.duration, c2.in, c2.speed) : c2.duration * c2.speed;
}
function mediaTime(c2, t, audio = false) {
  if (c2.freeze !== void 0) return c2.freeze;
  const local = audio ? t - c2.start : posterize(c2, t - c2.start);
  let off = c2.remap !== void 0 ? remapOffset(c2.remap, local, c2.in, c2.speed) : local * c2.speed;
  if (c2.reverse) off = sourceSpan(c2) - off - (audio ? 1 / 48e3 : 1e-3);
  return c2.in + off;
}
function hasPosterize(c2) {
  return c2.effects.some((e2) => e2.type === "posterizeTime" && e2.enabled);
}
function isLinearTime(c2, audio = false) {
  return c2.freeze === void 0 && c2.remap === void 0 && !c2.reverse && (audio || !hasPosterize(c2));
}
function mediaUses(layers, rate = 1, linear = true, smooth2 = true, out = []) {
  for (const l of layers) {
    if (l.pair) mediaUses([l.pair.a, l.pair.b].filter((x) => !!x), rate, linear, smooth2, out);
    else {
      const c2 = l.clip;
      const r = rate * sourceRate(c2, l.t - c2.start);
      const lin = linear && isLinearTime(c2);
      const sm = smooth2 && c2.freeze === void 0 && !hasPosterize(c2) && r > 0;
      if (l.kind === "media") out.push({ l, rate: r, linear: lin, smooth: sm });
      else if (l.child) mediaUses(l.child.layers, r, lin, sm, out);
    }
    if (l.matte) mediaUses(l.matte.layers, rate, linear, smooth2, out);
  }
  return out;
}
function sequenceDuration(seq) {
  let d = 0;
  for (const c2 of seq.clips) d = Math.max(d, clipEnd(c2));
  return d;
}
function videoTracks(seq) {
  return seq.tracks.filter((t) => t.kind === "video");
}
function audioTracks(seq) {
  return seq.tracks.filter((t) => t.kind === "audio");
}
function trackOf(seq, c2) {
  return seq.tracks.find((t) => t.id === c2.trackId);
}
function trackLabel(seq, track) {
  const list = track.kind === "video" ? videoTracks(seq) : audioTracks(seq);
  return `${track.kind === "video" ? "V" : "A"}${list.indexOf(track) + 1}`;
}
function dbToGain(db) {
  return db <= -60 ? 0 : Math.pow(10, db / 20);
}
function gainToDb(g) {
  return g <= 1e-3 ? -60 : 20 * Math.log10(g);
}
function sourceDuration(p, c2) {
  const s = c2.source;
  if (s.kind === "media") {
    const m = p.media[s.mediaId];
    if (!m) return 0;
    return m.kind === "image" ? Infinity : m.duration;
  }
  if (s.kind === "sequence") {
    const seq = getSeq(p.doc, s.sequenceId);
    return seq ? sequenceDuration(seq) : 0;
  }
  return Infinity;
}
function clipLabel(p, c2) {
  if (c2.name) return c2.name;
  const s = c2.source;
  if (s.kind === "media") return p.media[s.mediaId]?.name ?? "Missing media";
  if (s.kind === "sequence") return getSeq(p.doc, s.sequenceId)?.name ?? "Missing sequence";
  if (s.kind === "text") return s.props.text.split("\n")[0] || "Title";
  if (s.kind === "shape") return s.props.shape === "ellipse" ? "Ellipse" : "Rectangle";
  if (s.kind === "generator") {
    try {
      return generatorDef(s.gen).name;
    } catch {
      return "Generator";
    }
  }
  if (s.kind === "adjustment") return "Adjustment Layer";
  return "Color Matte";
}
function containsSequence(doc, outerId, innerId, depth = 0) {
  if (outerId === innerId) return true;
  if (depth > MAX_NEST_DEPTH) return true;
  const outer = getSeq(doc, outerId);
  if (!outer) return false;
  return outer.clips.some((c2) => c2.source.kind === "sequence" && containsSequence(doc, c2.source.sequenceId, innerId, depth + 1));
}
const ABUT_EPS = 0.02;
function prevClip(seq, c2) {
  return seq.clips.find((o) => o.id !== c2.id && o.trackId === c2.trackId && Math.abs(clipEnd(o) - c2.start) < ABUT_EPS);
}
function nextClip(seq, c2) {
  return seq.clips.find((o) => o.id !== c2.id && o.trackId === c2.trackId && Math.abs(o.start - clipEnd(c2)) < ABUT_EPS);
}
function headWindow(seq, c2) {
  const tr2 = c2.transitionIn;
  if (!tr2) return null;
  const a2 = prevClip(seq, c2) ?? null;
  if (a2) {
    const d = tr2.duration;
    const align = tr2.align ?? "center";
    const start = align === "center" ? c2.start - d / 2 : align === "start" ? c2.start : c2.start - d;
    return { start, end: start + d, tr: tr2, a: a2, b: c2 };
  }
  return { start: c2.start, end: c2.start + Math.min(tr2.duration, c2.duration), tr: tr2, a: null, b: c2 };
}
function tailWindow(seq, c2) {
  const nx = nextClip(seq, c2);
  if (nx?.transitionIn) return headWindow(seq, nx);
  const tr2 = c2.transitionOut;
  if (!tr2 || nx) return null;
  return { start: clipEnd(c2) - Math.min(tr2.duration, c2.duration), end: clipEnd(c2), tr: tr2, a: c2, b: null };
}
function activeRange(seq, c2) {
  const h = headWindow(seq, c2);
  const t = tailWindow(seq, c2);
  return [Math.min(c2.start, h?.start ?? Infinity), Math.max(clipEnd(c2), t?.end ?? -Infinity)];
}
const NEUTRAL = () => ({ opacity: 1, gain: 1, dip: null, shape: null, wipe: null, offset: [0, 0], scaleMul: 1, visible: true, blend: null, blur: 0, crop: null, onTop: false });
function hexRgb(hex) {
  const h = hex.replace("#", "");
  const v2 = parseInt(h.length === 3 ? h.split("").map((c2) => c2 + c2).join("") : h.slice(0, 6), 16);
  return [(v2 >> 16 & 255) / 255, (v2 >> 8 & 255) / 255, (v2 & 255) / 255];
}
function eased(p, ease) {
  if (ease === "easeIn") return p * p;
  if (ease === "easeOut") return 1 - (1 - p) * (1 - p);
  if (ease === "easeInOut") return p * p * (3 - 2 * p);
  return p;
}
function transState(w, role, t, seq) {
  const raw = Math.max(0, Math.min(1, (t - w.start) / Math.max(1e-6, w.end - w.start)));
  let p = eased(raw, w.tr.ease);
  if (w.tr.reverse) p = 1 - p;
  const s = NEUTRAL();
  const single = !w.a || !w.b;
  const W = seq.settings.width;
  const H = seq.settings.height;
  const prm = w.tr.params;
  const softness = Number(prm.softness ?? 5) / 100;
  const reveal = (kind) => {
    const opts = { kind, softness, dir: String(prm.direction ?? prm.axis ?? "left"), bands: Number(prm.bands ?? 6) };
    if (role === "b") s.shape = { ...opts, progress: p };
    else if (single) s.shape = { ...opts, progress: 1 - p };
  };
  const dissolveGain = () => {
    s.gain = role === "b" ? p : 1 - p;
  };
  if (isPairTransition(w.tr.type)) {
    dissolveGain();
    return s;
  }
  switch (w.tr.type) {
    case "crossDissolve":
      if (role === "b") s.opacity = p;
      else if (single) s.opacity = 1 - p;
      dissolveGain();
      break;
    case "additiveDissolve":
      if (role === "b") {
        s.opacity = Math.min(1, p * 2);
        s.blend = single ? null : 1;
      } else s.opacity = single ? 1 - p : Math.min(1, 2 - p * 2);
      dissolveGain();
      break;
    case "filmDissolve":
      if (role === "b") {
        s.opacity = p;
        s.blend = 9;
      } else if (single) {
        s.opacity = 1 - p;
        s.blend = 9;
      }
      dissolveGain();
      break;
    case "blurDissolve": {
      const amt = Number(prm.amount ?? 40);
      if (role === "b") {
        s.opacity = p;
        s.blur = amt * (1 - p);
      } else {
        s.blur = amt * p;
        if (single) s.opacity = 1 - p;
      }
      dissolveGain();
      break;
    }
    case "crossfade": {
      s.gain = role === "b" ? Math.sin(p * Math.PI / 2) : Math.cos(p * Math.PI / 2);
      if (role === "b") s.opacity = p;
      else if (single) s.opacity = 1 - p;
      break;
    }
    case "constantGain":
      s.gain = role === "b" ? p : 1 - p;
      if (role === "b") s.opacity = p;
      else if (single) s.opacity = 1 - p;
      break;
    case "exponentialFade": {
      const k = role === "b" ? p : 1 - p;
      s.gain = k * k * k;
      if (role === "b") s.opacity = p;
      else if (single) s.opacity = 1 - p;
      break;
    }
    case "dipToBlack":
    case "dipToWhite":
    case "dipToColor": {
      const color = w.tr.type === "dipToBlack" ? [0, 0, 0] : w.tr.type === "dipToWhite" ? [1, 1, 1] : hexRgb(String(prm.color ?? "#000000"));
      if (single) {
        s.dip = { color, amount: role === "b" ? 1 - p : p };
      } else if (role === "a") {
        s.visible = p < 0.5;
        s.dip = { color, amount: Math.min(1, p * 2) };
      } else {
        s.visible = p >= 0.5;
        s.dip = { color, amount: Math.min(1, 2 - p * 2) };
      }
      s.gain = role === "b" ? Math.min(1, p * 2) : Math.min(1, 2 - p * 2);
      break;
    }
    case "wipe":
      reveal("wipe");
      dissolveGain();
      break;
    case "bandWipe":
      reveal("band");
      dissolveGain();
      break;
    case "barnDoor":
      reveal("barn");
      dissolveGain();
      break;
    case "clockWipe":
      reveal("clock");
      dissolveGain();
      break;
    case "irisRound":
      reveal("iris");
      dissolveGain();
      break;
    case "irisBox":
      reveal("box");
      dissolveGain();
      break;
    case "irisDiamond":
      reveal("diamond");
      dissolveGain();
      break;
    case "push":
    case "slide": {
      const dir = String(prm.direction ?? "left");
      const v2 = dir === "left" ? [W, 0] : dir === "right" ? [-W, 0] : dir === "top" ? [0, H] : [0, -H];
      if (role === "a") {
        if (w.tr.type === "push" || single) s.offset = [-v2[0] * p, -v2[1] * p];
      } else s.offset = [v2[0] * (1 - p), v2[1] * (1 - p)];
      dissolveGain();
      break;
    }
    case "split":
      if (role === "a") s.onTop = true;
      else if (single) s.opacity = p;
      dissolveGain();
      break;
    case "zoom": {
      const k = Number(prm.strength ?? 100) / 100;
      if (role === "a") {
        s.scaleMul = 1 + p * k;
        s.opacity = single ? 1 - p : 1 - p * 0.999;
      } else {
        s.scaleMul = 1 + (1 - p) * k;
        s.opacity = p;
      }
      dissolveGain();
      break;
    }
  }
  if (s.shape?.kind === "wipe") s.wipe = { dir: s.shape.dir, progress: s.shape.progress, softness: s.shape.softness };
  return s;
}
function windowProgress(w, t) {
  const raw = Math.max(0, Math.min(1, (t - w.start) / Math.max(1e-6, w.end - w.start)));
  const p = eased(raw, w.tr.ease);
  return w.tr.reverse ? 1 - p : p;
}
function splitInfo(seq, c2, t) {
  const tl2 = tailWindow(seq, c2);
  if (!tl2 || tl2.tr.type !== "split" || t < tl2.start || t >= tl2.end) return null;
  const raw = Math.max(0, Math.min(1, (t - tl2.start) / Math.max(1e-6, tl2.end - tl2.start)));
  let p = eased(raw, tl2.tr.ease);
  if (tl2.tr.reverse) p = 1 - p;
  return { p, axis: String(tl2.tr.params.axis ?? "vertical") };
}
function clipTransState(seq, c2, t) {
  const out = NEUTRAL();
  const h = headWindow(seq, c2);
  if (h && t >= h.start && t < h.end) merge(out, transState(h, "b", t, seq));
  const tl2 = tailWindow(seq, c2);
  if (tl2 && t >= tl2.start && t < tl2.end) merge(out, transState(tl2, "a", t, seq));
  return out;
}
function merge(o, s) {
  o.opacity *= s.opacity;
  o.gain *= s.gain;
  o.visible = o.visible && s.visible;
  if (s.dip) o.dip = s.dip;
  if (s.shape) o.shape = s.shape;
  if (s.wipe) o.wipe = s.wipe;
  o.offset = [o.offset[0] + s.offset[0], o.offset[1] + s.offset[1]];
  o.scaleMul *= s.scaleMul;
  if (s.blend !== null) o.blend = s.blend;
  o.blur += s.blur;
  if (s.crop) o.crop = s.crop;
  o.onTop = o.onTop || s.onTop;
}
function inRange(seq, c2, t) {
  const [a2, b2] = activeRange(seq, c2);
  return t >= a2 - 1e-6 && t < b2 - 1e-6;
}
function makeLayer(p, seq, c2, t, prefix, depth, trans) {
  const src = sourceTime(c2, t);
  const mt = mediaTime(c2, t);
  const key = prefix + c2.id;
  const s = c2.source;
  if (s.kind === "media") {
    const m = p.media[s.mediaId];
    if (!m || !m.hasVideo) return null;
    return { key, clip: c2, seq, src, mt, t, kind: "media", media: m, trans };
  }
  if (s.kind === "sequence") {
    const child = getSeq(p.doc, s.sequenceId);
    if (!child) return null;
    return { key, clip: c2, seq, src, mt, t, kind: "sequence", child: { seq: child, layers: evaluateVideo(p, child, mt, key + "/", depth + 1) }, trans };
  }
  return { key, clip: c2, seq, src, mt, t, kind: s.kind, trans };
}
function inWindow(w, t) {
  return !!w && t >= w.start && t < w.end;
}
function trackLayers(p, seq, track, t, prefix, depth) {
  const clips = seq.clips.filter((c2) => c2.trackId === track.id && !c2.disabled && inRange(seq, c2, t)).sort((a2, b2) => a2.start - b2.start);
  const out = [];
  for (const c2 of clips) {
    const head = headWindow(seq, c2);
    if (inWindow(head, t) && isPairTransition(head.tr.type)) {
      const b2 = makeLayer(p, seq, c2, t, prefix, depth, clipTransState(seq, c2, t));
      const a2 = head.a ? makeLayer(p, seq, head.a, t, prefix, depth, clipTransState(seq, head.a, t)) : null;
      if (a2 || b2) out.push({ key: prefix + "tr:" + head.tr.id, clip: c2, seq, src: sourceTime(c2, t), mt: mediaTime(c2, t), t, kind: "pair", trans: NEUTRAL(), pair: { a: a2, b: b2, tr: head.tr, p: windowProgress(head, t) } });
      continue;
    }
    const tail = tailWindow(seq, c2);
    if (inWindow(tail, t) && isPairTransition(tail.tr.type)) {
      if (tail.b) continue;
      const a2 = makeLayer(p, seq, c2, t, prefix, depth, clipTransState(seq, c2, t));
      if (a2) out.push({ key: prefix + "tr:" + tail.tr.id, clip: c2, seq, src: sourceTime(c2, t), mt: mediaTime(c2, t), t, kind: "pair", trans: NEUTRAL(), pair: { a: a2, b: null, tr: tail.tr, p: windowProgress(tail, t) } });
      continue;
    }
    const trans = clipTransState(seq, c2, t);
    if (!trans.visible || trans.opacity <= 5e-4) continue;
    const layer = makeLayer(p, seq, c2, t, prefix, depth, trans);
    if (!layer) continue;
    const split = splitInfo(seq, c2, t);
    if (split) {
      const W = seq.settings.width;
      const H = seq.settings.height;
      const v2 = split.axis === "vertical";
      const d = (v2 ? W : H) / 2;
      const half1 = { ...layer, trans: { ...trans, crop: v2 ? [0, 0, 0.5, 1] : [0, 0, 1, 0.5], offset: v2 ? [-d * split.p, 0] : [0, -d * split.p] } };
      const half2 = { ...layer, trans: { ...trans, crop: v2 ? [0.5, 0, 1, 1] : [0, 0.5, 1, 1], offset: v2 ? [d * split.p, 0] : [0, d * split.p] } };
      out.push(half1, half2);
    } else out.push(layer);
  }
  return [...out.filter((l) => !l.trans.onTop), ...out.filter((l) => l.trans.onTop)];
}
function evaluateVideo(p, seq, t, prefix = "", depth = 0) {
  const out = [];
  if (depth > MAX_NEST_DEPTH) return out;
  const tracks = videoTracks(seq);
  const per = tracks.map((track) => trackLayers(p, seq, track, t, prefix, depth));
  const usedAsMatte = /* @__PURE__ */ new Set();
  for (let i = 0; i < tracks.length; i++) {
    if (usedAsMatte.has(i) || tracks[i].hidden) continue;
    const layers = per[i];
    if (i + 1 < tracks.length) {
      let wants = false;
      for (const l of layers) {
        const mode = l.clip.trackMatte;
        if (mode && mode !== "none") {
          l.matte = { mode, layers: per[i + 1] };
          wants = true;
        }
      }
      if (wants) usedAsMatte.add(i + 1);
    }
    out.push(...layers);
  }
  return out;
}
function flattenLayers(layers) {
  const out = [];
  for (const l of layers) {
    out.push(l);
    if (l.child) out.push(...flattenLayers(l.child.layers));
    if (l.pair) out.push(...flattenLayers([l.pair.a, l.pair.b].filter((x) => !!x)));
    if (l.matte) out.push(...flattenLayers(l.matte.layers));
  }
  return out;
}
function expandPairs(layers) {
  const out = [];
  for (const l of layers) {
    if (l.pair) {
      if (l.pair.a) out.push(l.pair.a);
      if (l.pair.b) out.push(l.pair.b);
    } else out.push(l);
  }
  return out;
}
function layerContentSize(l) {
  if (l.kind === "media" && l.media) return { w: l.media.width, h: l.media.height, fit: true };
  if (l.kind === "sequence" && l.child) return { w: l.child.seq.settings.width, h: l.child.seq.settings.height, fit: true };
  if (l.kind === "solid" || l.kind === "generator" || l.kind === "adjustment" || l.kind === "pair") return { w: l.seq.settings.width, h: l.seq.settings.height, fit: false };
  return { w: 0, h: 0, fit: false };
}
function soloSet(seq) {
  const s = audioTracks(seq).filter((t) => t.solo);
  return s.length ? new Set(s.map((t) => t.id)) : null;
}
function evaluateAudio(p, seq, t, prefix = "", depth = 0, parent) {
  const out = [];
  if (depth > MAX_NEST_DEPTH) return out;
  const solo = soloSet(seq);
  for (const track of audioTracks(seq)) {
    if (track.muted || solo && !solo.has(track.id)) continue;
    const trackGain = parent ? dbToGain(track.volume) : 1;
    for (const c2 of seq.clips) {
      if (c2.trackId !== track.id || c2.disabled || !inRange(seq, c2, t)) continue;
      const kt = sourceTime(c2, t);
      const mt = mediaTime(c2, t, true);
      const trans = clipTransState(seq, c2, t);
      const g = dbToGain(evalNum(c2.volume, kt)) * trans.gain * trackGain * (parent?.gain ?? 1);
      const speed = sourceRate(c2, t - c2.start) * (parent?.speed ?? 1);
      const linear = isLinearTime(c2, true) && (parent?.linear ?? true);
      const bus = parent?.bus ?? track.id;
      const chain = [c2, ...parent?.chain ?? []];
      const chainKt = [kt, ...parent?.chainKt ?? []];
      const s = c2.source;
      if (s.kind === "media") {
        const m = p.media[s.mediaId];
        if (!m || !m.hasAudio || m.offline) continue;
        out.push({ key: prefix + c2.id, clip: c2, media: m, src: mt, kt, speed, linear, gain: g, pan: Math.max(-1, Math.min(1, evalNum(c2.pan, kt) / 100)), busTrackId: bus, chain, chainKt, seq });
      } else if (s.kind === "sequence") {
        const child = getSeq(p.doc, s.sequenceId);
        if (child) out.push(...evaluateAudio(p, child, mt, prefix + c2.id + "/", depth + 1, { gain: g * dbToGain(child.masterVolume), speed, bus, linear, chain, chainKt }));
      }
    }
  }
  return out;
}
function sourceRange(seq, c2) {
  const [a2, b2] = activeRange(seq, c2);
  let lo = Infinity;
  let hi = -Infinity;
  const n2 = 200;
  for (let i = 0; i <= n2; i++) {
    const m = mediaTime(c2, a2 + (b2 - a2) * i / n2, true);
    lo = Math.min(lo, m);
    hi = Math.max(hi, m);
  }
  return [Math.max(0, lo - 0.25), hi + 0.25];
}
function stereoPan(l, r, pan) {
  if (pan === 0) return [l, r];
  if (pan <= 0) {
    const x2 = (pan + 1) * (Math.PI / 2);
    return [l + r * Math.cos(x2), r * Math.sin(x2)];
  }
  const x = pan * (Math.PI / 2);
  return [l * Math.cos(x), r + l * Math.sin(x)];
}
function editPoints(seq) {
  const s = /* @__PURE__ */ new Set([0]);
  for (const c2 of seq.clips) {
    s.add(c2.start);
    s.add(clipEnd(c2));
  }
  for (const m of seq.markers) s.add(m.t);
  return [...s].sort((a2, b2) => a2 - b2);
}
const evaluate = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  MAX_NEST_DEPTH,
  activeRange,
  audioTracks,
  clipEnd,
  clipLabel,
  clipTransState,
  containsSequence,
  dbToGain,
  editPoints,
  evaluateAudio,
  evaluateVideo,
  expandPairs,
  flattenLayers,
  gainToDb,
  getSeq,
  headWindow,
  isLinearTime,
  layerContentSize,
  mediaTime,
  mediaUses,
  nextClip,
  posterize,
  prevClip,
  remapOffset,
  sequenceDuration,
  sourceDuration,
  sourceRange,
  sourceRate,
  sourceSpan,
  sourceTime,
  stereoPan,
  tailWindow,
  trackLabel,
  trackOf,
  transState,
  videoTracks,
  windowProgress
}, Symbol.toStringTag, { value: "Module" }));
function fitSize(w, h, seq) {
  if (!w || !h) return { w: seq.width, h: seq.height };
  const s = Math.min(seq.width / w, seq.height / h);
  return { w: w * s, h: h * s };
}
function resolveGeom(t, src, content, seq, extra = {}) {
  const s = evalNum(t.scale, src, 100) / 100;
  const sy = t.scaleY !== void 0 ? evalNum(t.scaleY, src, 100) / 100 : s;
  const k = extra.scaleMul ?? 1;
  return {
    cx: seq.width / 2 + evalNum(t.x, src) + (extra.offset?.[0] ?? 0),
    cy: seq.height / 2 + evalNum(t.y, src) + (extra.offset?.[1] ?? 0),
    sx: s * k,
    sy: sy * k,
    rot: evalNum(t.rotation, src) * Math.PI / 180,
    ax: evalNum(t.anchorX, src),
    ay: evalNum(t.anchorY, src),
    w: content.w,
    h: content.h,
    opacity: Math.max(0, Math.min(1, evalNum(t.opacity, src, 100) / 100))
  };
}
function layerMatrix(g, seq, flipY, padX = 1, padY = 1) {
  const a2 = g.w * padX;
  const b2 = g.h * padY;
  const cos = Math.cos(g.rot);
  const sin = Math.sin(g.rot);
  const m00 = cos * a2 * g.sx;
  const m10 = sin * a2 * g.sx;
  const m01 = -sin * b2 * g.sy;
  const m11 = cos * b2 * g.sy;
  const lx = (-0.5 * a2 - g.ax) * g.sx;
  const ly = (-0.5 * b2 - g.ay) * g.sy;
  const tx = g.cx + cos * lx - sin * ly;
  const ty = g.cy + sin * lx + cos * ly;
  const kx = 2 / seq.width;
  const ky = (flipY ? 2 : -2) / seq.height;
  const oy = flipY ? -1 : 1;
  return new Float32Array([kx * m00, ky * m10, 0, kx * m01, ky * m11, 0, kx * tx - 1, ky * ty + oy, 1]);
}
function toUV(px, py, g) {
  const dx = px - g.cx;
  const dy = py - g.cy;
  const cos = Math.cos(g.rot);
  const sin = Math.sin(g.rot);
  const lx = (cos * dx + sin * dy) / (g.sx || 1e-9) + g.ax;
  const ly = (-sin * dx + cos * dy) / (g.sy || 1e-9) + g.ay;
  return { u: lx / g.w + 0.5, v: ly / g.h + 0.5 };
}
function fromUV(u, v2, g) {
  const lx = ((u - 0.5) * g.w - g.ax) * g.sx;
  const ly = ((v2 - 0.5) * g.h - g.ay) * g.sy;
  const cos = Math.cos(g.rot);
  const sin = Math.sin(g.rot);
  return { x: g.cx + cos * lx - sin * ly, y: g.cy + sin * lx + cos * ly };
}
function pickUV(px, py, g) {
  if (!g.w || !g.h) return null;
  const p = toUV(px, py, g);
  return p.u < 0 || p.u > 1 || p.v < 0 || p.v > 1 ? null : p;
}
function parseCube(text) {
  let size = 0;
  let min = [0, 0, 0];
  let max = [1, 1, 1];
  const values = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    const kw = parts[0].toUpperCase();
    if (kw === "LUT_3D_SIZE") size = Number(parts[1]);
    else if (kw === "LUT_1D_SIZE") throw new Error("1D LUTs are not supported; use a 3D .cube LUT");
    else if (kw === "DOMAIN_MIN") min = parts.slice(1, 4).map(Number);
    else if (kw === "DOMAIN_MAX") max = parts.slice(1, 4).map(Number);
    else if (/^[-+\d.]/.test(parts[0]) && parts.length >= 3) values.push(Number(parts[0]), Number(parts[1]), Number(parts[2]));
  }
  if (!size || size < 2 || size > 256) throw new Error("Missing or invalid LUT_3D_SIZE");
  const n2 = size * size * size * 3;
  if (values.length < n2) throw new Error(`LUT has ${values.length / 3} entries, expected ${n2 / 3}`);
  const data = new Float32Array(n2);
  for (let i = 0; i < n2; i += 3) {
    for (let c2 = 0; c2 < 3; c2++) data[i + c2] = (values[i + c2] - min[c2]) / Math.max(1e-6, max[c2] - min[c2]);
  }
  return { size, data };
}
function canvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c2 = document.createElement("canvas");
  c2.width = w;
  c2.height = h;
  return c2;
}
function ctx(c2) {
  return c2.getContext("2d", { willReadFrequently: false });
}
function fontString(p, size) {
  return `${p.italic ? "italic " : ""}${p.weight} ${size}px ${/[\s,]/.test(p.font) && !p.font.includes('"') ? `"${p.font}"` : p.font}, "IBM Plex Sans", sans-serif`;
}
let measureCtx = null;
function layoutText(p) {
  measureCtx ??= ctx(canvas(4, 4));
  const m = measureCtx;
  m.font = fontString(p, p.size);
  if ("letterSpacing" in m) m.letterSpacing = `${p.tracking}px`;
  const lines = p.text.split("\n");
  const widths = lines.map((l) => m.measureText(l || " ").width);
  const lh = p.size * p.lineHeight;
  const pad = p.boxOpacity > 0 ? p.boxPadding : 0;
  const stroke = p.strokeWidth > 0 ? p.strokeWidth : 0;
  const w = Math.ceil(Math.max(1, ...widths) + pad * 2 + stroke * 2 + 4);
  const h = Math.ceil(lh * lines.length + pad * 2 + stroke * 2 + p.size * 0.15);
  return { lines, widths, w, h, lh };
}
function roundRect(c2, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  c2.beginPath();
  c2.moveTo(x + rr, y);
  c2.arcTo(x + w, y, x + w, y + h, rr);
  c2.arcTo(x + w, y + h, x, y + h, rr);
  c2.arcTo(x, y + h, x, y, rr);
  c2.arcTo(x, y, x + w, y, rr);
  c2.closePath();
}
function rasterText(p, scale) {
  const f = fontString(p, p.size);
  if (typeof document !== "undefined" && document.fonts && !document.fonts.check(f, p.text)) void document.fonts.load(f, p.text).catch(() => null);
  const L = layoutText(p);
  const s = Math.max(0.05, Math.min(4, scale));
  const cw = Math.max(1, Math.min(8192, Math.ceil(L.w * s)));
  const ch = Math.max(1, Math.min(8192, Math.ceil(L.h * s)));
  const c2 = canvas(cw, ch);
  const g = ctx(c2);
  g.scale(cw / L.w, ch / L.h);
  const pad = p.boxOpacity > 0 ? p.boxPadding : 0;
  if (p.boxOpacity > 0) {
    g.globalAlpha = p.boxOpacity / 100;
    g.fillStyle = p.boxColor;
    roundRect(g, 0, 0, L.w, L.h, p.boxRadius);
    g.fill();
    g.globalAlpha = 1;
  }
  g.font = fontString(p, p.size);
  if ("letterSpacing" in g) g.letterSpacing = `${p.tracking}px`;
  g.textBaseline = "alphabetic";
  g.lineJoin = "round";
  const stroke = p.strokeWidth > 0 ? p.strokeWidth : 0;
  L.lines.forEach((line, i) => {
    const innerW = L.w - pad * 2 - stroke * 2 - 4;
    const x0 = pad + stroke + 2;
    const x = p.align === "left" ? x0 : p.align === "right" ? x0 + innerW - L.widths[i] : x0 + (innerW - L.widths[i]) / 2;
    const y = pad + stroke + L.lh * i + (L.lh - p.size) / 2 + p.size * 0.82;
    if (stroke > 0) {
      g.strokeStyle = p.strokeColor;
      g.lineWidth = stroke * 2;
      g.strokeText(line, x, y);
    }
    g.fillStyle = p.color;
    g.fillText(line, x, y);
  });
  return { canvas: c2, w: L.w, h: L.h, key: "" };
}
function shapeSize(p, src) {
  const stroke = p.strokeWidth > 0 ? p.strokeWidth : 0;
  return { w: Math.max(1, evalNum(p.width, src)) + stroke, h: Math.max(1, evalNum(p.height, src)) + stroke, stroke };
}
function rasterShape(p, src, scale) {
  const { w, h, stroke } = shapeSize(p, src);
  const s = Math.max(0.05, Math.min(4, scale));
  const cw = Math.max(1, Math.min(8192, Math.ceil(w * s)));
  const ch = Math.max(1, Math.min(8192, Math.ceil(h * s)));
  const c2 = canvas(cw, ch);
  const g = ctx(c2);
  g.scale(cw / w, ch / h);
  const iw = w - stroke;
  const ih = h - stroke;
  const x = stroke / 2;
  const y = stroke / 2;
  g.beginPath();
  if (p.shape === "ellipse") g.ellipse(x + iw / 2, y + ih / 2, iw / 2, ih / 2, 0, 0, Math.PI * 2);
  else roundRect(g, x, y, iw, ih, evalNum(p.radius, src));
  if (p.fillOpacity > 0) {
    g.globalAlpha = p.fillOpacity / 100;
    g.fillStyle = p.fill;
    g.fill();
    g.globalAlpha = 1;
  }
  if (stroke > 0) {
    g.strokeStyle = p.strokeColor;
    g.lineWidth = stroke;
    g.stroke();
  }
  return { canvas: c2, w, h, key: "" };
}
function tracePath(g, pts, w, h, closed) {
  const n2 = Math.floor(pts.length / 6);
  if (n2 < 2) return;
  g.beginPath();
  g.moveTo(pts[0] * w, pts[1] * h);
  const seg = (i, j) => {
    const a2 = i * 6;
    const b2 = j * 6;
    g.bezierCurveTo(
      (pts[a2] + pts[a2 + 4]) * w,
      (pts[a2 + 1] + pts[a2 + 5]) * h,
      (pts[b2] + pts[b2 + 2]) * w,
      (pts[b2 + 1] + pts[b2 + 3]) * h,
      pts[b2] * w,
      pts[b2 + 1] * h
    );
  };
  for (let i = 0; i < n2 - 1; i++) seg(i, i + 1);
  {
    seg(n2 - 1, 0);
    g.closePath();
  }
}
function rasterMasks(masks, src, w, h, pxPerSeq) {
  const active = masks.filter((m) => m.enabled && m.closed);
  if (!active.length) return null;
  const acc = canvas(w, h);
  const A = ctx(acc);
  if (active[0].mode !== "add") {
    A.fillStyle = "#fff";
    A.fillRect(0, 0, w, h);
  }
  const tmp = canvas(w, h);
  const T = ctx(tmp);
  for (const m of active) {
    const pts = evalPath(m.path, src);
    const feather = Math.max(0, evalNum(m.feather, src)) * pxPerSeq;
    const exp = evalNum(m.expansion, src) * pxPerSeq;
    const op = Math.max(0, Math.min(1, evalNum(m.opacity, src, 100) / 100));
    T.setTransform(1, 0, 0, 1, 0, 0);
    T.globalCompositeOperation = "source-over";
    T.filter = feather > 0.5 ? `blur(${(feather / 2).toFixed(2)}px)` : "none";
    T.clearRect(0, 0, w, h);
    const draw = () => {
      tracePath(T, pts, w, h);
      T.fillStyle = "#fff";
      T.fill();
      if (Math.abs(exp) > 0.01) {
        T.lineJoin = "round";
        T.lineWidth = Math.abs(exp) * 2;
        T.strokeStyle = "#fff";
        if (exp < 0) T.globalCompositeOperation = "destination-out";
        T.stroke();
        T.globalCompositeOperation = "source-over";
      }
    };
    if (m.inverted) {
      const inv = canvas(w, h);
      const I = ctx(inv);
      I.filter = T.filter;
      tracePath(I, pts, w, h);
      I.fillStyle = "#fff";
      I.fill();
      if (Math.abs(exp) > 0.01) {
        I.lineJoin = "round";
        I.lineWidth = Math.abs(exp) * 2;
        I.strokeStyle = "#fff";
        if (exp < 0) I.globalCompositeOperation = "destination-out";
        I.stroke();
      }
      T.filter = "none";
      T.fillStyle = "#fff";
      T.fillRect(0, 0, w, h);
      T.globalCompositeOperation = "destination-out";
      T.drawImage(inv, 0, 0);
      T.globalCompositeOperation = "source-over";
    } else {
      draw();
    }
    A.globalAlpha = op;
    A.globalCompositeOperation = m.mode === "add" ? "lighter" : m.mode === "subtract" ? "destination-out" : "destination-in";
    if (m.mode === "intersect" && op < 1) {
      const keep = canvas(w, h);
      const K = ctx(keep);
      K.drawImage(acc, 0, 0);
      A.globalAlpha = 1;
      A.drawImage(tmp, 0, 0);
      A.globalCompositeOperation = "source-over";
      A.globalAlpha = 1 - op;
      A.drawImage(keep, 0, 0);
    } else {
      A.drawImage(tmp, 0, 0);
    }
    A.globalAlpha = 1;
    A.globalCompositeOperation = "source-over";
  }
  return acc;
}
function maskKey(masks, src, w, h, pxPerSeq) {
  const active = masks.filter((m) => m.enabled && m.closed);
  return JSON.stringify([
    w,
    h,
    Math.round(pxPerSeq * 1e3),
    active.map((m) => [m.mode, m.inverted, evalPath(m.path, src).map((x) => Math.round(x * 1e5)), evalNum(m.feather, src), evalNum(m.expansion, src), evalNum(m.opacity, src, 100)])
  ]);
}
function generatorKey(c2, src, scale) {
  const s = c2.source;
  if (s.kind === "text") return "T" + JSON.stringify(s.props) + Math.round(scale * 100);
  if (s.kind === "shape") return "S" + JSON.stringify(s.props) + evalNum(s.props.width, src) + ":" + evalNum(s.props.height, src) + ":" + evalNum(s.props.radius, src) + ":" + Math.round(scale * 100);
  return "";
}
const VERT = `#version 300 es
in vec2 a_uv;
uniform mat3 u_mat;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  vec3 p = u_mat * vec3(a_uv, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
}`;
const COMPOSITE = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_layer;
uniform sampler2D u_dst;
uniform sampler2D u_matteTex;
uniform sampler2D u_amask;
uniform vec2 u_viewport;
uniform int u_blend;        // 0 normal (fixed-function), 1..8 modes, 9 linear-light mix, 10 adjustment mix
uniform float u_opacity;
uniform bool u_dipOn;
uniform vec3 u_dipColor;
uniform float u_dipAmt;
uniform bool u_shapeOn;
uniform int u_shapeKind;   // 0 wipe, 1 band, 2 barn, 3 clock, 4 iris, 5 box, 6 diamond
uniform int u_shapeDir;    // wipe: 0 left 1 right 2 top 3 bottom; barn: 0 vertical 1 horizontal
uniform float u_shapeP;
uniform float u_shapeSoft;
uniform float u_bands;
uniform bool u_cropOn;
uniform vec4 u_cropRect;   // content uv: u0, v0, u1, v1
uniform vec2 u_cmin;       // content rect inside the padded layer quad
uniform vec2 u_csize;
uniform bool u_flip;
uniform bool u_matteView;  // show the layer's alpha as greyscale
uniform bool u_linear;
uniform int u_matteMode;   // 0 none, 1 alpha, 2 alpha inverted, 3 luma, 4 luma inverted
uniform bool u_amaskOn;    // adjustment-layer mask (sampled in layer uv)
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float blendCh(int m, float b, float s) {
  if (m == 1) return b + s;                                  // add
  if (m == 2) return b + s - b * s;                          // screen
  if (m == 3) return b * s;                                  // multiply
  if (m == 4) return b <= 0.5 ? 2.0 * b * s : 1.0 - 2.0 * (1.0 - b) * (1.0 - s); // overlay
  if (m == 5) {                                              // soft light (W3C)
    if (s <= 0.5) return b - (1.0 - 2.0 * s) * b * (1.0 - b);
    float d = b <= 0.25 ? ((16.0 * b - 12.0) * b + 4.0) * b : sqrt(b);
    return b + (2.0 * s - 1.0) * (d - b);
  }
  if (m == 6) return max(b, s);                              // lighten
  if (m == 7) return min(b, s);                              // darken
  if (m == 8) return abs(b - s);                             // difference
  return s;
}

void main() {
  vec4 s = texture(u_layer, v_uv);
  vec3 c = s.a > 0.0 ? s.rgb / s.a : vec3(0.0);
  float k = u_opacity;
  if (u_dipOn) {
    vec3 dc = u_linear ? pow(u_dipColor, vec3(2.2)) : u_dipColor;
    c = mix(c, dc, u_dipAmt);
  }
  vec2 f = gl_FragCoord.xy / u_viewport;
  if (u_cropOn) {
    vec2 cuv = (v_uv - u_cmin) / u_csize;
    if (cuv.x < u_cropRect.x || cuv.x >= u_cropRect.z || cuv.y < u_cropRect.y || cuv.y >= u_cropRect.w) k = 0.0;
  }
  if (u_shapeOn) {
    float fx = f.x;
    float ft = u_flip ? f.y : 1.0 - f.y; // 0 at the top of the frame
    float aspect = u_viewport.x / u_viewport.y;
    float d;
    if (u_shapeKind == 0) {
      if (u_shapeDir == 0) d = fx;
      else if (u_shapeDir == 1) d = 1.0 - fx;
      else if (u_shapeDir == 2) d = ft;
      else d = 1.0 - ft;
    } else if (u_shapeKind == 1) {
      float band = floor(ft * u_bands);
      d = mod(band, 2.0) < 0.5 ? fx : 1.0 - fx;
    } else if (u_shapeKind == 2) {
      d = u_shapeDir == 0 ? abs(fx - 0.5) * 2.0 : abs(ft - 0.5) * 2.0;
    } else if (u_shapeKind == 3) {
      float ang = atan(fx - 0.5, -(ft - 0.5));
      d = fract(ang / 6.2831853 + 1.0);
    } else if (u_shapeKind == 4) {
      vec2 q = (vec2(fx, ft) - 0.5) * vec2(aspect, 1.0);
      d = length(q) / length(vec2(aspect, 1.0) * 0.5);
    } else if (u_shapeKind == 5) {
      d = max(abs(fx - 0.5), abs(ft - 0.5)) * 2.0;
    } else {
      d = abs(fx - 0.5) + abs(ft - 0.5);
    }
    float e = u_shapeP * (1.0 + u_shapeSoft);
    k *= 1.0 - smoothstep(e - u_shapeSoft, e, d);
  }
  if (u_amaskOn) k *= texture(u_amask, v_uv).a;
  if (u_matteMode > 0) {
    vec4 m = texture(u_matteTex, f);
    float mv;
    if (u_matteMode <= 2) mv = m.a;
    else {
      mv = clamp(dot(m.rgb, LUMA), 0.0, 1.0);
      if (u_linear) mv = pow(mv, 1.0 / 2.2);
    }
    if (u_matteMode == 2 || u_matteMode == 4) mv = 1.0 - mv;
    k *= mv;
  }
  if (u_matteView) { o = vec4(vec3(s.a * step(0.0001, k)), 1.0); return; }
  float a = s.a * k;
  if (u_blend == 0) { o = vec4(c * a, a); return; }
  vec4 d = texture(u_dst, f);
  if (u_blend == 10) {
    // Adjustment layer: s is the processed copy of the frame below.
    o = mix(d, vec4(c * s.a, s.a), clamp(k, 0.0, 1.0));
    return;
  }
  if (u_blend == 9) {
    // Linear-light mix (film dissolve). In a linear sequence this is a plain mix.
    vec3 cbu = d.a > 0.0 ? d.rgb / d.a : vec3(0.0);
    float oa = a + d.a * (1.0 - a);
    vec3 lin = u_linear ? (a * c + (1.0 - a) * d.a * cbu) : (a * pow(max(c, vec3(0.0)), vec3(2.2)) + (1.0 - a) * d.a * pow(max(cbu, vec3(0.0)), vec3(2.2)));
    lin /= max(oa, 1e-4);
    vec3 outc = u_linear ? lin : pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));
    o = vec4(outc * oa, oa);
    return;
  }
  vec3 cb = d.a > 0.0 ? d.rgb / d.a : vec3(0.0);
  vec3 B = vec3(blendCh(u_blend, cb.r, c.r), blendCh(u_blend, cb.g, c.g), blendCh(u_blend, cb.b, c.b));
  vec3 cr = (1.0 - d.a) * c + d.a * B;
  o = vec4(a * cr + (1.0 - a) * d.rgb, a + d.a * (1.0 - a));
}`;
const RECT_CLIP = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform vec4 u_keep; // x0, y0, x1, y1 (uv)
void main() {
  bool inside = v_uv.x >= u_keep.x && v_uv.y >= u_keep.y && v_uv.x <= u_keep.z && v_uv.y <= u_keep.w;
  o = inside ? texture(u_src, v_uv) : vec4(0.0);
}`;
const OUTPUT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform bool u_toGamma;
uniform bool u_unpremul;
uniform float u_scale;
void main() {
  vec4 c = texture(u_src, v_uv);
  if (u_unpremul && c.a > 0.0) c.rgb /= c.a;
  if (u_toGamma) c.rgb = pow(max(c.rgb, vec3(0.0)), vec3(1.0 / 2.2));
  o = clamp(c, 0.0, 1.0) * u_scale;
}`;
const FILL = `#version 300 es
precision highp float;
out vec4 o;
uniform vec4 u_color;
void main() { o = u_color; }`;
const FX_HEAD = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform vec2 u_size;      // buffer size, px
uniform vec4 u_rect;      // content rect in buffer uv: x0, y0, w, h
uniform bool u_linear;    // working space is linear light
uniform bool u_clampEdge; // repeat edge pixels instead of transparency
uniform float u_time;     // seconds (source time)
uniform float u_ppx;      // buffer px per sequence px
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const float PI = 3.14159265359;
const float TAU = 6.28318530718;

vec2 cuv(vec2 uv) { return (uv - u_rect.xy) / u_rect.zw; }
vec2 buv(vec2 c) { return u_rect.xy + c * u_rect.zw; }
vec2 csize() { return u_rect.zw * u_size; }
float aspect() { vec2 s = csize(); return s.x / max(s.y, 1.0); }
vec4 texP(vec2 uv) {
  if (u_clampEdge) uv = clamp(uv, u_rect.xy + 0.5 / u_size, u_rect.xy + u_rect.zw - 0.5 / u_size);
  else if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
  return texture(u_src, uv);
}
vec4 texC(vec2 c) { return texP(buv(c)); }
vec4 unp(vec4 p) {
  vec3 c = p.a > 1e-5 ? p.rgb / p.a : vec3(0.0);
  if (u_linear) c = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
  return vec4(c, p.a);
}
vec4 colP(vec2 uv) { return unp(texP(uv)); }
vec4 colC(vec2 c) { return unp(texC(c)); }
vec4 outc(vec3 c, float a) {
  a = clamp(a, 0.0, 1.0);
  c = clamp(c, 0.0, 1.0);
  if (u_linear) c = pow(c, vec3(2.2));
  return vec4(c * a, a);
}
vec3 lin(vec3 c) { return u_linear ? pow(max(c, vec3(0.0)), vec3(2.2)) : c; }
float luma(vec3 c) { return dot(c, LUMA); }
vec3 toYCbCr(vec3 c) { float y = dot(c, LUMA); return vec3(y, (c.b - y) / 1.8556, (c.r - y) / 1.5748); }
vec3 toRGB(vec3 ycc) {
  float r = ycc.x + 1.5748 * ycc.z;
  float b = ycc.x + 1.8556 * ycc.y;
  float g = (ycc.x - 0.2126 * r - 0.0722 * b) / 0.7152;
  return vec3(r, g, b);
}
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p, float oct) {
  float a = 0.5;
  float s = 0.0;
  float n = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= oct) break;
    s += a * vnoise(p);
    n += a;
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s / max(n, 1e-4);
}
mat2 rot2(float a) { float c = cos(a); float s = sin(a); return mat2(c, s, -s, c); }
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
vec3 rgb2hsl(vec3 c) {
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float l = (mx + mn) * 0.5;
  float d = mx - mn;
  if (d < 1e-6) return vec3(0.0, 0.0, l);
  float s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
  float h;
  if (mx == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
  else h = (c.r - c.g) / d + 4.0;
  return vec3(h / 6.0, s, l);
}
vec3 hsl2rgb(vec3 hsl) {
  vec3 rgb = clamp(abs(mod(hsl.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return hsl.z + hsl.y * (rgb - 0.5) * (1.0 - abs(2.0 * hsl.z - 1.0));
}
float curveAt(sampler2D t, float x) { return texture(t, vec2(clamp(x, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, 0.5)).r; }
`;
const SRC_PASS = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform sampler2D u_mask;
uniform vec2 u_cmin;
uniform vec2 u_csize;
uniform bool u_srcPremul;
uniform bool u_srcLinear;
uniform bool u_working;   // source is already in the working space (adjustment layers)
uniform bool u_linear;
uniform bool u_maskOn;
uniform bool u_clampEdges;
void main() {
  vec2 uv = (v_uv - u_cmin) / u_csize;
  bool outside = uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0;
  if (outside && !u_clampEdges) { o = vec4(0.0); return; }
  uv = clamp(uv, 0.0, 1.0);
  vec4 s = texture(u_src, uv);
  float m = u_maskOn ? texture(u_mask, uv).a : 1.0;
  if (u_working) { o = s * m; return; }
  vec3 c = s.rgb;
  if (u_srcPremul) c = s.a > 1e-5 ? c / s.a : vec3(0.0);
  if (u_srcLinear && !u_linear) c = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
  if (!u_srcLinear && u_linear) c = pow(max(c, vec3(0.0)), vec3(2.2));
  c = max(c, vec3(0.0));
  if (!u_srcLinear) c = min(c, vec3(1.0));
  float a = s.a * m;
  o = vec4(c * a, a);
}`;
const fx = (body) => FX_HEAD + body;
const FX_SHADERS = {
  // ---------------- Keying ----------------
  chromaKey: fx(`
uniform vec3 p_keyColor;
uniform float u_lo;
uniform float u_hi;
uniform float u_choke;
uniform float u_spill;
uniform float u_balance;
void main() {
  vec4 c = colP(v_uv);
  vec3 rgb = c.rgb;
  float a = c.a;
  vec3 p = toYCbCr(rgb);
  vec3 k = toYCbCr(p_keyColor);
  float kl = length(k.yz);
  if (kl > 1e-3) {
    vec2 kd = k.yz / kl;
    float s = dot(p.yz, kd);
    float q = length(p.yz - kd * s);
    float kn = (s - u_balance * q) / kl;
    float m = 1.0 - smoothstep(u_lo, u_hi, kn);
    m = clamp((m - u_choke) / max(1e-4, 1.0 - u_choke), 0.0, 1.0);
    a *= m;
    if (s > 0.0 && u_spill > 0.0) {
      p.yz -= kd * s * u_spill;
      rgb = toRGB(p);
    }
  }
  o = outc(rgb, a);
}`),
  // Subject Key: people mattes from the AI analysis (low resolution, every few frames) are blended
  // in time, snapped to the edges of the full-resolution picture (joint bilateral upsampling), and
  // either used directly or combined with a green/blue-screen key: inside the person the key can't
  // make holes, outside the person (plus a margin) everything goes.
  subjectKey: fx(`
uniform sampler2D u_mA;
uniform sampler2D u_mB;
uniform float u_mix;      // 0 → matte A, 1 → matte B
uniform bool u_has;       // analysed
uniform vec2 u_mpx;       // one matte pixel in content uv
uniform int p_mode;       // 0 screen + subject, 1 subject only, 2 clean up a key above
uniform vec3 p_keyColor;
uniform float u_lo;
uniform float u_hi;
uniform float p_spill;
uniform float p_protect;
uniform float p_margin;   // layer px
uniform float p_choke;    // layer px
uniform float p_feather;  // layer px
uniform float p_snap;
float mt(vec2 c) {
  c = clamp(c, vec2(0.0), vec2(1.0));
  return mix(texture(u_mA, c).r, texture(u_mB, c).r, u_mix);
}
// small holes the person encloses (clothing the colour of the screen, reflections)
float hole(vec2 c) {
  c = clamp(c, vec2(0.0), vec2(1.0));
  return mix(texture(u_mA, c).g, texture(u_mB, c).g, u_mix);
}
float screenKey(vec3 rgb, out vec3 despilled) {
  vec3 p = toYCbCr(rgb);
  vec3 k = toYCbCr(p_keyColor);
  float kl = length(k.yz);
  despilled = rgb;
  if (kl < 1e-3) return 1.0;
  vec2 kd = k.yz / kl;
  float s = dot(p.yz, kd);
  float q = length(p.yz - kd * s);
  float kn = (s - q) / kl;
  float m = 1.0 - smoothstep(u_lo, u_hi, kn);
  if (s > 0.0 && p_spill > 0.0) { p.yz -= kd * s * p_spill / 100.0; despilled = toRGB(p); }
  return m;
}
void main() {
  vec4 src = colP(v_uv);
  if (!u_has) { o = texP(v_uv); return; }
  vec2 c = cuv(v_uv);
  bool inside = c.x >= 0.0 && c.y >= 0.0 && c.x <= 1.0 && c.y <= 1.0;
  if (!inside) { o = vec4(0.0); return; }
  vec2 lpx = 1.0 / max(csize(), vec2(1.0)); // one layer pixel in content uv
  // edge snap: weight the surrounding matte samples by how much their colour matches this pixel
  float raw = mt(c);
  float acc = 0.0, wsum = 0.0;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 q = c + vec2(float(i), float(j)) * u_mpx;
      vec3 qc = colC(clamp(q, vec2(0.0), vec2(1.0))).rgb;
      vec3 d = qc - src.rgb;
      float w = exp(-float(i * i + j * j) / 4.5) * exp(-dot(d, d) * 40.0);
      acc += w * mt(q);
      wsum += w;
    }
  }
  float m = mix(raw, acc / max(wsum, 1e-5), p_snap / 100.0);
  // choke / feather (in layer pixels, relative to the matte's own softness)
  float px = max(u_mpx.x / lpx.x, 1.0);           // layer px per matte px
  float centre = clamp(0.5 + p_choke / (px * 4.0), 0.05, 0.95);
  float soft = clamp(0.04 + p_feather / (px * 4.0), 0.01, 0.5);
  m = smoothstep(centre - soft, centre + soft, m);
  // reach: how far the person extends (for junk removal) and their solid core (for hole filling)
  vec2 r = max(vec2(p_margin) * lpx, u_mpx);
  float reach = raw;
  float core = raw;
  for (int k = 0; k < 8; k++) {
    float a = float(k) * PI / 4.0;
    vec2 off = vec2(cos(a), sin(a));
    reach = max(reach, mt(c + off * r));
    core = min(core, mt(c + off * u_mpx * 3.0));
  }
  float keep = smoothstep(0.08, 0.35, reach);      // 0 = far from anyone: junk
  core = smoothstep(0.65, 0.95, core);
  float fill = smoothstep(0.3, 0.7, hole(c)) * p_protect / 100.0;
  if (p_mode == 1) {                                // subject only
    o = outc(src.rgb, src.a * max(m, fill));
    return;
  }
  if (p_mode == 2) {                                // clean up the key above: drop junk outside the person
    o = outc(src.rgb, src.a * keep);
    return;
  }
  vec3 despilled;
  float ka = screenKey(src.rgb, despilled);
  float hold = max(core * p_protect / 100.0, fill); // solid inside the person, whatever the screen says
  float a = max(ka, hold) * keep;
  vec3 rgb = mix(despilled, src.rgb, hold * (1.0 - ka));
  o = outc(rgb, src.a * a);
}`),
  lumaKey: fx(`
uniform float p_threshold;
uniform float p_softness;
uniform bool p_invert;
void main() {
  vec4 c = colP(v_uv);
  float lo = p_threshold / 100.0;
  float hi = lo + p_softness / 100.0 + 1e-3;
  float m = smoothstep(lo, hi, luma(c.rgb));
  o = outc(c.rgb, c.a * (p_invert ? 1.0 - m : m));
}`),
  alphaAdjust: fx(`
uniform float p_opacity;
uniform bool p_invert;
uniform bool p_ignoreAlpha;
void main() {
  vec4 c = colP(v_uv);
  vec2 q = cuv(v_uv);
  bool inside = q.x >= 0.0 && q.y >= 0.0 && q.x <= 1.0 && q.y <= 1.0;
  float a = p_ignoreAlpha ? (inside ? 1.0 : 0.0) : c.a;
  if (p_invert) a = (inside ? 1.0 : 0.0) - a;
  o = outc(c.rgb, a * p_opacity / 100.0);
}`),
  crop: fx(`
uniform float p_left;
uniform float p_right;
uniform float p_top;
uniform float p_bottom;
uniform float p_feather;
float edgeF(float edge, float feather, float x) {
  if (edge <= 0.0 && feather <= 0.0) return 1.0;
  if (feather <= 0.0) return step(edge, x);
  return smoothstep(edge, edge + feather, x);
}
void main() {
  vec2 q = cuv(v_uv);
  float f = p_feather / 100.0;
  float k = edgeF(p_left / 100.0, f, q.x) * edgeF(p_right / 100.0, f, 1.0 - q.x) * edgeF(p_top / 100.0, f, q.y) * edgeF(p_bottom / 100.0, f, 1.0 - q.y);
  o = texP(v_uv) * k;
}`),
  // ---------------- Color ----------------
  colorCorrect: fx(`
uniform float p_exposure;
uniform float p_contrast;
uniform float p_saturation;
uniform float p_temperature;
uniform float p_tint;
uniform float p_gamma;
void main() {
  vec4 c = colP(v_uv);
  vec3 rgb = c.rgb * exp2(p_exposure);
  rgb = pow(max(rgb, vec3(0.0)), vec3(1.0 / max(0.05, p_gamma)));
  rgb = (rgb - 0.5) * (p_contrast / 100.0) + 0.5;
  rgb = mix(vec3(luma(rgb)), rgb, p_saturation / 100.0);
  rgb += vec3(p_temperature, -p_tint, -p_temperature) / 100.0 * 0.1;
  o = outc(rgb, c.a);
}`),
  lumetri: fx(`
uniform sampler2D t_curve;
uniform bool c_curve;
uniform vec4 u_lmBasic1;   // temperature, tint, exposure, contrast (normalised)
uniform vec4 u_lmBasic2;   // highlights, shadows, whites, blacks
uniform vec4 u_lmCreative; // saturation, vibrance, fade
uniform vec4 u_lift;
uniform vec4 u_gammaW;
uniform vec4 u_gain;
void main() {
  vec4 src = colP(v_uv);
  vec3 c = src.rgb;
  float temp = u_lmBasic1.x;
  float tint = u_lmBasic1.y;
  c *= vec3(1.0 + temp * 0.25, 1.0 - tint * 0.2, 1.0 - temp * 0.25);
  c *= exp2(u_lmBasic1.z);
  c = (c - 0.5) * (1.0 + u_lmBasic1.w) + 0.5;
  float y = clamp(dot(c, LUMA), 0.0, 1.0);
  float hm = smoothstep(0.35, 1.0, y);
  float sm = 1.0 - smoothstep(0.0, 0.65, y);
  c *= 1.0 + u_lmBasic2.x * 0.6 * hm;
  c += u_lmBasic2.y * 0.35 * sm * (1.0 - y);
  float wp = 1.0 - u_lmBasic2.z * 0.25;
  float bp = -u_lmBasic2.w * 0.1;
  c = (c - bp) / max(0.05, wp - bp);
  c = c * (1.0 + u_gain.rgb + u_gain.a) + (u_lift.rgb + u_lift.a) * (1.0 - c);
  c = pow(max(c, vec3(0.0)), vec3(1.0) / max(vec3(0.05), vec3(1.0) + u_gammaW.rgb + u_gammaW.a));
  if (c_curve) c = vec3(curveAt(t_curve, c.r), curveAt(t_curve, c.g), curveAt(t_curve, c.b));
  y = dot(c, LUMA);
  float sat = length(c - vec3(y));
  float vib = u_lmCreative.y * (1.0 - smoothstep(0.0, 0.5, sat));
  c = mix(vec3(y), c, u_lmCreative.x * (1.0 + vib));
  c = mix(c, 0.08 + c * 0.84, u_lmCreative.z);
  o = outc(c, src.a);
}`),
  levels: fx(`
uniform int p_channel;
uniform float p_inBlack;
uniform float p_inWhite;
uniform float p_gamma;
uniform float p_outBlack;
uniform float p_outWhite;
float lv(float x) {
  float v = clamp((x * 255.0 - p_inBlack) / max(1.0, p_inWhite - p_inBlack), 0.0, 1.0);
  v = pow(v, 1.0 / max(0.01, p_gamma));
  return (p_outBlack + v * (p_outWhite - p_outBlack)) / 255.0;
}
void main() {
  vec4 c = colP(v_uv);
  vec3 r = c.rgb;
  if (p_channel == 0) r = vec3(lv(r.r), lv(r.g), lv(r.b));
  else if (p_channel == 1) r.r = lv(r.r);
  else if (p_channel == 2) r.g = lv(r.g);
  else r.b = lv(r.b);
  o = outc(r, c.a);
}`),
  curves: fx(`
uniform sampler2D t_master;
uniform sampler2D t_red;
uniform sampler2D t_green;
uniform sampler2D t_blue;
uniform bool c_master;
uniform bool c_red;
uniform bool c_green;
uniform bool c_blue;
void main() {
  vec4 c = colP(v_uv);
  vec3 r = c.rgb;
  if (c_master) r = vec3(curveAt(t_master, r.r), curveAt(t_master, r.g), curveAt(t_master, r.b));
  if (c_red) r.r = curveAt(t_red, r.r);
  if (c_green) r.g = curveAt(t_green, r.g);
  if (c_blue) r.b = curveAt(t_blue, r.b);
  o = outc(r, c.a);
}`),
  hueSat: fx(`
uniform float p_hue;
uniform float p_saturation;
uniform float p_lightness;
uniform bool p_colorize;
uniform float p_colorizeHue;
uniform float p_colorizeSat;
void main() {
  vec4 c = colP(v_uv);
  vec3 h = rgb2hsl(c.rgb);
  if (p_colorize) {
    h.x = p_colorizeHue / 360.0;
    h.y = p_colorizeSat / 100.0;
  } else {
    h.x = fract(h.x + p_hue / 360.0);
    h.y = clamp(h.y * (1.0 + p_saturation / 100.0), 0.0, 1.0);
  }
  float L = p_lightness / 100.0;
  h.z = L >= 0.0 ? h.z + (1.0 - h.z) * L : h.z * (1.0 + L);
  o = outc(hsl2rgb(h), c.a);
}`),
  hslSecondary: fx(`
uniform float p_hueCenter;
uniform float p_hueRange;
uniform float p_hueSoft;
uniform float p_satMin;
uniform float p_lumaMin;
uniform float p_lumaMax;
uniform float p_lumaSoft;
uniform bool p_showMask;
uniform float p_hueShift;
uniform float p_satAdjust;
uniform float p_lumAdjust;
uniform float p_outsideDesat;
void main() {
  vec4 c = colP(v_uv);
  vec3 hsv = rgb2hsv(c.rgb);
  float dh = abs(fract(hsv.x - p_hueCenter / 360.0 + 0.5) - 0.5) * 360.0;
  float mh = 1.0 - smoothstep(p_hueRange, p_hueRange + max(p_hueSoft, 0.01), dh);
  float smin = p_satMin / 100.0;
  float ms = smoothstep(smin - 0.05, smin + 0.05, hsv.y);
  float y = luma(c.rgb) * 100.0;
  float ls = max(p_lumaSoft, 0.01);
  float ml = smoothstep(p_lumaMin - ls, p_lumaMin, y) * (1.0 - smoothstep(p_lumaMax, p_lumaMax + ls, y));
  float m = mh * ms * ml;
  if (p_showMask) { o = outc(vec3(m), c.a); return; }
  vec3 k = vec3(fract(hsv.x + p_hueShift / 360.0), clamp(hsv.y * (1.0 + p_satAdjust / 100.0), 0.0, 1.0), hsv.z * (1.0 + p_lumAdjust / 100.0));
  vec3 r = mix(c.rgb, hsv2rgb(k), m);
  r = mix(r, vec3(luma(r)), p_outsideDesat / 100.0 * (1.0 - m));
  o = outc(r, c.a);
}`),
  channelMixer: fx(`
uniform float p_rr; uniform float p_rg; uniform float p_rb; uniform float p_rc;
uniform float p_gr; uniform float p_gg; uniform float p_gb; uniform float p_gc;
uniform float p_br; uniform float p_bg; uniform float p_bb; uniform float p_bc;
uniform bool p_monochrome;
void main() {
  vec4 c = colP(v_uv);
  vec3 i = c.rgb;
  float r = (p_rr * i.r + p_rg * i.g + p_rb * i.b + p_rc) / 100.0;
  float g = (p_gr * i.r + p_gg * i.g + p_gb * i.b + p_gc) / 100.0;
  float b = (p_br * i.r + p_bg * i.g + p_bb * i.b + p_bc) / 100.0;
  o = outc(p_monochrome ? vec3(r) : vec3(r, g, b), c.a);
}`),
  blackWhite: fx(`
uniform float p_reds; uniform float p_yellows; uniform float p_greens;
uniform float p_cyans; uniform float p_blues; uniform float p_magentas;
uniform bool p_tintOn;
uniform vec3 p_tintColor;
uniform float p_tintAmount;
void main() {
  vec4 c = colP(v_uv);
  vec3 i = c.rgb;
  float mx = max(i.r, max(i.g, i.b));
  float mn = min(i.r, min(i.g, i.b));
  float md = i.r + i.g + i.b - mx - mn;
  float wp;
  float ws;
  if (mx == i.r) { wp = p_reds; ws = i.g >= i.b ? p_yellows : p_magentas; }
  else if (mx == i.g) { wp = p_greens; ws = i.r >= i.b ? p_yellows : p_cyans; }
  else { wp = p_blues; ws = i.g >= i.r ? p_cyans : p_magentas; }
  float gray = mn + (md - mn) * ws / 100.0 + (mx - md) * wp / 100.0;
  vec3 r = vec3(gray);
  if (p_tintOn) {
    vec3 th = rgb2hsl(p_tintColor);
    r = mix(r, hsl2rgb(vec3(th.x, th.y, clamp(gray, 0.0, 1.0))), p_tintAmount / 100.0);
  }
  o = outc(r, c.a);
}`),
  tint: fx(`
uniform vec3 p_black;
uniform vec3 p_white;
uniform float p_amount;
void main() {
  vec4 c = colP(v_uv);
  o = outc(mix(c.rgb, mix(p_black, p_white, luma(c.rgb)), p_amount / 100.0), c.a);
}`),
  gradientMap: fx(`
uniform vec3 p_shadows;
uniform vec3 p_midtones;
uniform vec3 p_highlights;
uniform bool p_useMid;
uniform float p_amount;
void main() {
  vec4 c = colP(v_uv);
  float y = clamp(luma(c.rgb), 0.0, 1.0);
  vec3 g = p_useMid ? (y < 0.5 ? mix(p_shadows, p_midtones, y * 2.0) : mix(p_midtones, p_highlights, y * 2.0 - 1.0)) : mix(p_shadows, p_highlights, y);
  o = outc(mix(c.rgb, g, p_amount / 100.0), c.a);
}`),
  photoFilter: fx(`
uniform vec3 p_color;
uniform float p_density;
uniform bool p_preserve;
void main() {
  vec4 c = colP(v_uv);
  vec3 f = c.rgb * mix(vec3(1.0), p_color * 1.6, p_density / 100.0);
  if (p_preserve) f *= luma(c.rgb) / max(luma(f), 1e-4);
  o = outc(f, c.a);
}`),
  brightnessContrast: fx(`
uniform float p_brightness;
uniform float p_contrast;
void main() {
  vec4 c = colP(v_uv);
  float k = p_contrast >= 0.0 ? 1.0 / max(0.01, 1.0 - p_contrast / 100.0) : 1.0 + p_contrast / 100.0;
  vec3 r = (c.rgb - 0.5) * k + 0.5 + p_brightness / 100.0 * 0.5;
  o = outc(r, c.a);
}`),
  invert: fx(`
uniform int p_channel;
uniform float p_blend;
void main() {
  vec4 c = colP(v_uv);
  vec3 r = c.rgb;
  if (p_channel == 0) r = 1.0 - r;
  else if (p_channel == 1) { vec3 y = toYCbCr(r); y.x = 1.0 - y.x; r = toRGB(y); }
  else if (p_channel == 2) r.r = 1.0 - r.r;
  else if (p_channel == 3) r.g = 1.0 - r.g;
  else r.b = 1.0 - r.b;
  o = outc(mix(c.rgb, r, p_blend / 100.0), c.a);
}`),
  // ---------------- Blur & Sharpen (single pass) ----------------
  directionalBlur: fx(`
uniform float p_angle;
uniform float p_length;
void main() {
  float a = radians(p_angle);
  vec2 d = vec2(cos(a), sin(a)) * (p_length * u_ppx) / u_size;
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 49; i++) {
    float k = float(i) / 48.0 - 0.5;
    acc += texP(v_uv + d * k);
  }
  o = acc / 49.0;
}`),
  radialBlur: fx(`
uniform int p_type;
uniform float p_amount;
uniform float p_centerX;
uniform float p_centerY;
void main() {
  vec2 c = cuv(v_uv);
  vec2 ctr = vec2(p_centerX, p_centerY) / 100.0;
  vec2 asp = vec2(aspect(), 1.0);
  vec4 acc = vec4(0.0);
  float amt = p_amount / 100.0;
  for (int i = 0; i < 48; i++) {
    float k = float(i) / 47.0;
    vec2 q;
    if (p_type == 0) {
      q = ctr + (c - ctr) * (1.0 - amt * 0.5 * k);
    } else {
      float ang = (k - 0.5) * amt * 0.8;
      vec2 d = (c - ctr) * asp;
      q = ctr + (rot2(ang) * d) / asp;
    }
    acc += texC(q);
  }
  o = acc / 48.0;
}`),
  lensBlur: fx(`
uniform float p_radius;
uniform float p_brightness;
uniform float p_threshold;
void main() {
  float R = p_radius * u_ppx;
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  float th = p_threshold / 100.0;
  for (int i = 0; i < 96; i++) {
    float fi = float(i) + 0.5;
    float r = sqrt(fi / 96.0) * R;
    float ang = fi * 2.39996323;
    vec4 s = texP(v_uv + vec2(cos(ang), sin(ang)) * r / u_size);
    vec4 u = unp(s);
    float w = 1.0 + p_brightness / 100.0 * 6.0 * smoothstep(th, 1.0, luma(u.rgb)) * u.a;
    acc += s * w;
    wsum += w;
  }
  o = acc / wsum;
}`),
  tiltShift: fx(`
uniform float p_focus;
uniform float p_width;
uniform float p_transition;
uniform float p_angle;
uniform float p_radius;
void main() {
  vec2 c = cuv(v_uv);
  float a = radians(p_angle);
  vec2 nrm = vec2(-sin(a), cos(a));
  vec2 p = (c - vec2(0.5, p_focus / 100.0)) * vec2(aspect(), 1.0);
  float d = abs(dot(p, nrm));
  float k = smoothstep(p_width / 200.0, p_width / 200.0 + p_transition / 100.0, d);
  float R = p_radius * u_ppx * k;
  if (R < 0.5) { o = texP(v_uv); return; }
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 64; i++) {
    float fi = float(i) + 0.5;
    float r = sqrt(fi / 64.0) * R;
    float ang = fi * 2.39996323;
    acc += texP(v_uv + vec2(cos(ang), sin(ang)) * r / u_size);
  }
  o = acc / 64.0;
}`),
  sharpen: fx(`
uniform float p_amount;
uniform float p_radius;
void main() {
  vec2 d = vec2(max(0.5, p_radius * u_ppx)) / u_size;
  vec4 c = colP(v_uv);
  vec3 bl = (colP(v_uv + vec2(d.x, 0.0)).rgb + colP(v_uv - vec2(d.x, 0.0)).rgb + colP(v_uv + vec2(0.0, d.y)).rgb + colP(v_uv - vec2(0.0, d.y)).rgb) * 0.25;
  o = outc(c.rgb + (c.rgb - bl) * p_amount / 100.0, c.a);
}`),
  reduceNoise: fx(`
uniform float p_radius;
uniform float p_strength;
void main() {
  vec4 c0 = colP(v_uv);
  float R = clamp(p_radius * u_ppx, 1.0, 8.0);
  float sr = max(0.002, p_strength / 100.0 * 0.25);
  vec4 acc = vec4(0.0);
  float ws = 0.0;
  for (int j = -8; j <= 8; j++) {
    for (int i = -8; i <= 8; i++) {
      vec2 o2 = vec2(float(i), float(j));
      if (abs(o2.x) > R || abs(o2.y) > R) continue;
      vec4 s = texP(v_uv + o2 / u_size);
      vec3 cs = unp(s).rgb;
      float dc = length(cs - c0.rgb);
      float w = exp(-dot(o2, o2) / (2.0 * R * R * 0.25)) * exp(-dc * dc / (2.0 * sr * sr));
      acc += s * w;
      ws += w;
    }
  }
  o = acc / max(ws, 1e-5);
}`),
  // ---------------- Stylize ----------------
  vignette: fx(`
uniform float p_amount;
uniform float p_midpoint;
uniform float p_roundness;
uniform float p_feather;
void main() {
  vec4 c = colP(v_uv);
  vec2 q = (cuv(v_uv) - 0.5) * 2.0;
  float asp = aspect();
  q.x *= mix(1.0, asp, clamp(p_roundness / 100.0, 0.0, 1.0));
  q.y *= mix(1.0, 1.0 / asp, clamp(-p_roundness / 100.0, 0.0, 1.0));
  float d = length(q) / 1.41421;
  float v = smoothstep(p_midpoint / 100.0, p_midpoint / 100.0 + max(0.01, p_feather / 100.0), d);
  float amt = p_amount / 100.0;
  vec3 r = amt < 0.0 ? c.rgb * (1.0 + amt * v) : mix(c.rgb, vec3(1.0), amt * v);
  o = outc(r, c.a);
}`),
  stroke: fx(`
uniform vec3 p_color;
uniform float p_width;
uniform float p_opacity;
uniform int p_position;
float ringAlpha(float r, bool mx) {
  float best = mx ? 0.0 : 1.0;
  for (int ring = 1; ring <= 4; ring++) {
    float rr = r * float(ring) / 4.0;
    for (int k = 0; k < 20; k++) {
      float ang = float(k) / 20.0 * TAU + float(ring) * 0.3;
      float a = texP(v_uv + vec2(cos(ang), sin(ang)) * rr / u_size).a;
      best = mx ? max(best, a) : min(best, a);
    }
  }
  return best;
}
void main() {
  vec4 orig = texP(v_uv);
  float W = p_width * u_ppx;
  vec3 col = lin(p_color);
  float op = p_opacity / 100.0;
  if (W < 0.25) { o = orig; return; }
  if (p_position == 0) {
    float dil = max(ringAlpha(W, true), orig.a);
    vec4 s = vec4(col, 1.0) * dil * op;
    o = orig + s * (1.0 - orig.a);
  } else if (p_position == 1) {
    float dil = max(ringAlpha(W * 0.5, true), orig.a);
    float ero = min(ringAlpha(W * 0.5, false), orig.a);
    float band = clamp(dil - ero, 0.0, 1.0) * op;
    vec4 s = vec4(col, 1.0) * band;
    o = s + orig * (1.0 - band);
  } else {
    float ero = min(ringAlpha(W, false), orig.a);
    float band = clamp(orig.a - ero, 0.0, 1.0) * op;
    o = vec4(col, 1.0) * band + orig * (1.0 - band);
  }
}`),
  filmGrain: fx(`
uniform float p_amount;
uniform float p_size;
uniform float p_softness;
uniform float p_color;
uniform float p_response;
uniform bool p_animate;
void main() {
  vec4 c = colP(v_uv);
  float sz = max(0.5, p_size * u_ppx);
  vec2 px = v_uv * u_size / sz;
  float f = p_animate ? floor(u_time * 24.0) : 0.0;
  vec2 off = vec2(f * 37.13, f * 17.71);
  float soft = p_softness / 100.0;
  float n = mix(hash12(floor(px) + off), vnoise(px + off), soft) - 0.5;
  vec3 nc = vec3(n);
  vec3 chroma = vec3(mix(hash12(floor(px) + off + 11.0), vnoise(px + off + 11.0), soft), mix(hash12(floor(px) + off + 23.0), vnoise(px + off + 23.0), soft), mix(hash12(floor(px) + off + 37.0), vnoise(px + off + 37.0), soft)) - 0.5;
  nc = mix(nc, chroma, p_color / 100.0);
  float y = luma(c.rgb);
  float w = mix(1.0, 4.0 * y * (1.0 - y) + 0.15, p_response / 100.0);
  o = outc(c.rgb + nc * p_amount / 100.0 * 0.4 * w, c.a);
}`),
  chromaticAberration: fx(`
uniform float p_amount;
uniform int p_mode;
uniform float p_angle;
uniform float p_centerX;
uniform float p_centerY;
void main() {
  vec2 c = cuv(v_uv);
  vec2 off;
  if (p_mode == 0) {
    vec2 ctr = vec2(p_centerX, p_centerY) / 100.0;
    vec2 d = c - ctr;
    off = d * (p_amount * u_ppx) / (0.5 * csize().x);
  } else {
    float a = radians(p_angle);
    off = vec2(cos(a), sin(a)) * p_amount * u_ppx / csize();
  }
  vec4 r = colC(c + off);
  vec4 g = colC(c);
  vec4 b = colC(c - off);
  o = outc(vec3(r.r, g.g, b.b), max(g.a, max(r.a, b.a)));
}`),
  rgbSplit: fx(`
uniform float p_distance;
uniform float p_angle;
void main() {
  vec2 c = cuv(v_uv);
  float a = radians(p_angle);
  vec2 off = vec2(cos(a), sin(a)) * p_distance * u_ppx / csize();
  vec4 r = colC(c + off);
  vec4 g = colC(c);
  vec4 b = colC(c - off);
  o = outc(vec3(r.r, g.g, b.b), max(g.a, max(r.a, b.a)));
}`),
  glitch: fx(`
uniform float p_amount;
uniform float p_blockSize;
uniform float p_rgbShift;
uniform float p_speed;
uniform float p_scanlines;
uniform float p_seed;
void main() {
  vec2 c = cuv(v_uv);
  vec2 cs = csize();
  float amt = p_amount / 100.0;
  float f = floor(u_time * max(p_speed, 0.001)) + p_seed * 13.0;
  vec2 cp = c * cs;
  float bs = max(2.0, p_blockSize * u_ppx);
  float row = floor(cp.y / bs);
  float shift = 0.0;
  if (hash12(vec2(row, f)) < amt * 0.5) shift += (hash12(vec2(row, f + 1.7)) - 0.5) * amt * 0.25;
  vec2 blk = floor(cp / vec2(bs * 5.0, bs));
  if (hash12(blk + f * 1.37) < amt * 0.15) shift += (hash12(blk + f * 2.11) - 0.5) * 0.15;
  vec2 q = c + vec2(shift, 0.0);
  float off = p_rgbShift * u_ppx / cs.x * (hash12(vec2(f, 3.0)) * 2.0 - 1.0) * amt;
  vec4 r = colC(q + vec2(off, 0.0));
  vec4 g = colC(q);
  vec4 b = colC(q - vec2(off, 0.0));
  vec3 col = vec3(r.r, g.g, b.b);
  if (hash12(vec2(floor(cp.y / max(1.0, u_ppx * 2.0)), f)) < p_scanlines / 100.0 * 0.06 * amt) col = 1.0 - col;
  o = outc(col, max(g.a, max(r.a, b.a)));
}`),
  vhs: fx(`
uniform float p_amount;
uniform float p_bleed;
uniform float p_noise;
uniform float p_tracking;
uniform float p_scanlines;
uniform float p_wobble;
void main() {
  vec2 c = cuv(v_uv);
  vec2 cs = csize();
  float t = u_time;
  float amt = p_amount / 100.0;
  c.x += (sin(c.y * 30.0 + t * 3.0) * 0.0015 + (vnoise(vec2(c.y * 80.0, t * 10.0)) - 0.5) * 0.004) * p_wobble / 100.0;
  float y0 = fract(t * 0.07);
  float band = 1.0 - smoothstep(0.0, 0.04 * p_tracking / 100.0 + 1e-4, abs(c.y - y0));
  c.x += (hash12(vec2(floor(c.y * 300.0), floor(t * 30.0))) - 0.5) * 0.04 * band;
  vec4 base = colC(c);
  vec3 ycc = toYCbCr(base.rgb);
  vec2 chroma = vec2(0.0);
  float bl = p_bleed * u_ppx / cs.x;
  for (int i = 0; i < 8; i++) {
    float k = float(i) / 7.0;
    chroma += toYCbCr(colC(c - vec2(bl * k, 0.0)).rgb).yz;
  }
  ycc.yz = chroma / 8.0;
  vec3 col = toRGB(ycc);
  float frame = floor(t * 30.0);
  col += (hash12(c * cs + frame) - 0.5) * p_noise / 100.0 * 0.25;
  col += band * hash12(vec2(c.x * 400.0, frame)) * 0.5 * p_tracking / 100.0;
  float sl = 0.5 + 0.5 * sin(c.y * cs.y / max(u_ppx, 0.01) * PI);
  col *= 1.0 - p_scanlines / 100.0 * 0.3 * sl;
  col = mix(col, col * vec3(1.06, 1.0, 0.9), 0.6);
  o = outc(mix(colC(cuv(v_uv)).rgb, col, amt), base.a);
}`),
  scanLines: fx(`
uniform float p_lines;
uniform float p_intensity;
uniform float p_softness;
uniform float p_speed;
uniform float p_curvature;
void main() {
  vec2 c = cuv(v_uv);
  vec2 q = c - 0.5;
  float k = p_curvature / 100.0 * 0.25;
  q *= 1.0 + k * dot(q, q);
  vec2 cc = q + 0.5;
  if (cc.x < 0.0 || cc.y < 0.0 || cc.x > 1.0 || cc.y > 1.0) { o = vec4(0.0, 0.0, 0.0, texC(c).a > 0.0 ? 1.0 : 0.0); return; }
  vec4 col = colC(cc);
  float s = 0.5 + 0.5 * cos(TAU * (cc.y * p_lines + u_time * p_speed / 10.0));
  s = pow(s, mix(4.0, 0.5, p_softness / 100.0));
  vec3 r = col.rgb * (1.0 - p_intensity / 100.0 * (1.0 - s));
  o = outc(r, col.a);
}`),
  halftone: fx(`
uniform float p_size;
uniform float p_angle;
uniform int p_mode;
uniform float p_contrast;
uniform vec3 p_ink;
uniform vec3 p_paper;
float dotMask(vec2 pc, float ang, float cov, float size) {
  vec2 q = rot2(-ang) * pc;
  vec2 cell = (floor(q / size) + 0.5) * size;
  float d = length(q - cell) / size;
  float r = sqrt(clamp(cov, 0.0, 1.0)) * 0.7071;
  float aa = 1.0 / size;
  return 1.0 - smoothstep(r - aa, r + aa, d);
}
vec3 cellColor(vec2 pc, float ang, float size) {
  vec2 q = rot2(-ang) * pc;
  vec2 cell = (floor(q / size) + 0.5) * size;
  vec2 back = rot2(ang) * cell;
  vec3 c = colC(back / csize()).rgb;
  return clamp((c - 0.5) * p_contrast / 100.0 + 0.5, 0.0, 1.0);
}
void main() {
  vec2 c = cuv(v_uv);
  vec2 pc = c * csize();
  float size = max(1.5, p_size * u_ppx);
  float a = radians(p_angle);
  vec4 base = colC(c);
  vec3 r;
  if (p_mode == 0) {
    float cov = 1.0 - luma(cellColor(pc, a, size));
    r = mix(p_paper, p_ink, dotMask(pc, a, cov, size));
  } else {
    float cyan = dotMask(pc, a + radians(15.0), 1.0 - cellColor(pc, a + radians(15.0), size).r, size);
    float mag = dotMask(pc, a + radians(75.0), 1.0 - cellColor(pc, a + radians(75.0), size).g, size);
    float yel = dotMask(pc, a, 1.0 - cellColor(pc, a, size).b, size);
    r = p_paper * vec3(1.0 - cyan, 1.0 - mag, 1.0 - yel);
  }
  o = outc(r, base.a);
}`),
  pixelate: fx(`
uniform float p_size;
uniform int p_shape;
void main() {
  vec2 c = cuv(v_uv);
  vec2 cs = csize();
  float s = max(1.0, p_size * u_ppx);
  vec2 cell = (floor(c * cs / s) + 0.5) * s;
  vec4 col = colC(cell / cs);
  if (p_shape == 1) {
    float d = length(c * cs - cell) / s;
    col.a *= 1.0 - smoothstep(0.45, 0.5, d);
  }
  o = outc(col.rgb, col.a);
}`),
  posterize: fx(`
uniform float p_levels;
void main() {
  vec4 c = colP(v_uv);
  float L = max(2.0, floor(p_levels));
  o = outc(floor(c.rgb * (L - 1.0) + 0.5) / (L - 1.0), c.a);
}`),
  emboss: fx(`
uniform float p_angle;
uniform float p_height;
uniform float p_amount;
uniform float p_blend;
void main() {
  vec4 c = colP(v_uv);
  float a = radians(p_angle);
  vec2 d = vec2(cos(a), -sin(a)) * max(0.5, p_height * u_ppx) / u_size;
  float e = (luma(colP(v_uv - d).rgb) - luma(colP(v_uv + d).rgb)) * p_amount / 100.0 + 0.5;
  o = outc(mix(vec3(e), c.rgb, p_blend / 100.0), c.a);
}`),
  findEdges: fx(`
uniform float p_strength;
uniform bool p_invert;
uniform float p_blend;
void main() {
  vec2 px = max(1.0, u_ppx) / u_size;
  float tl = luma(colP(v_uv + px * vec2(-1.0, -1.0)).rgb);
  float t = luma(colP(v_uv + px * vec2(0.0, -1.0)).rgb);
  float tr = luma(colP(v_uv + px * vec2(1.0, -1.0)).rgb);
  float l = luma(colP(v_uv + px * vec2(-1.0, 0.0)).rgb);
  float r = luma(colP(v_uv + px * vec2(1.0, 0.0)).rgb);
  float bl = luma(colP(v_uv + px * vec2(-1.0, 1.0)).rgb);
  float b = luma(colP(v_uv + px * vec2(0.0, 1.0)).rgb);
  float br = luma(colP(v_uv + px * vec2(1.0, 1.0)).rgb);
  float gx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
  float gy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);
  float g = clamp(length(vec2(gx, gy)) * p_strength / 100.0, 0.0, 1.0);
  vec4 c = colP(v_uv);
  vec3 e = vec3(p_invert ? 1.0 - g : g);
  o = outc(mix(e, c.rgb, p_blend / 100.0), c.a);
}`),
  cartoon: fx(`
uniform float p_levels;
uniform float p_threshold;
uniform float p_width;
uniform float p_edgeStrength;
uniform float p_saturation;
void main() {
  vec4 c = colP(v_uv);
  vec2 px = max(0.5, p_width * u_ppx) / u_size;
  float tl = luma(colP(v_uv + px * vec2(-1.0, -1.0)).rgb);
  float t = luma(colP(v_uv + px * vec2(0.0, -1.0)).rgb);
  float tr = luma(colP(v_uv + px * vec2(1.0, -1.0)).rgb);
  float l = luma(colP(v_uv + px * vec2(-1.0, 0.0)).rgb);
  float r = luma(colP(v_uv + px * vec2(1.0, 0.0)).rgb);
  float bl = luma(colP(v_uv + px * vec2(-1.0, 1.0)).rgb);
  float b = luma(colP(v_uv + px * vec2(0.0, 1.0)).rgb);
  float br = luma(colP(v_uv + px * vec2(1.0, 1.0)).rgb);
  float g = length(vec2((tr + 2.0 * r + br) - (tl + 2.0 * l + bl), (bl + 2.0 * b + br) - (tl + 2.0 * t + tr)));
  float th = p_threshold / 100.0;
  float edge = smoothstep(th, th + 0.12, g) * p_edgeStrength / 100.0;
  vec3 col = mix(vec3(luma(c.rgb)), c.rgb, p_saturation / 100.0);
  float L = max(2.0, floor(p_levels));
  col = floor(clamp(col, 0.0, 1.0) * (L - 1.0) + 0.5) / (L - 1.0);
  o = outc(col * (1.0 - edge), c.a);
}`),
  lightLeak: fx(`
uniform vec3 p_color1;
uniform vec3 p_color2;
uniform float p_intensity;
uniform float p_scale;
uniform float p_speed;
uniform float p_seed;
void main() {
  vec4 c = colP(v_uv);
  vec2 q = cuv(v_uv) * vec2(aspect(), 1.0);
  float t = u_time * p_speed / 100.0;
  float sc = 1.5 / max(p_scale / 100.0, 0.05);
  float nz = fbm(q * sc + vec2(t * 0.35 + p_seed, t * 0.12 - p_seed * 0.5), 4.0);
  float m = smoothstep(0.42, 0.85, nz);
  float side = smoothstep(0.75, 0.0, min(cuv(v_uv).x, 1.0 - cuv(v_uv).x) + 0.25 * sin(t + p_seed));
  vec3 col = mix(p_color1, p_color2, smoothstep(0.2, 0.8, cuv(v_uv).y + 0.3 * sin(t * 0.7 + p_seed)));
  vec3 add = col * m * (0.4 + 0.6 * side) * p_intensity / 100.0;
  vec3 r = 1.0 - (1.0 - c.rgb) * (1.0 - clamp(add, 0.0, 1.0));
  o = outc(r, c.a);
}`),
  lensFlare: fx(`
uniform float p_lightX;
uniform float p_lightY;
uniform float p_brightness;
uniform vec3 p_color;
uniform float p_ghosts;
uniform float p_streak;
uniform float p_halo;
void main() {
  vec4 c = colP(v_uv);
  vec2 asp = vec2(aspect(), 1.0);
  vec2 p = cuv(v_uv) * asp;
  vec2 L = vec2(p_lightX, p_lightY) / 100.0 * asp;
  vec2 C = vec2(0.5) * asp;
  vec2 d = p - L;
  float dist = length(d);
  float core = exp(-dist * 18.0) * 1.2 + exp(-dist * 4.0) * 0.25;
  float ring = exp(-pow((dist - 0.22) * 22.0, 2.0)) * 0.18 * p_halo / 100.0;
  float streak = exp(-abs(d.y) * 160.0) * exp(-abs(d.x) * 2.5) * p_streak / 100.0;
  vec3 add = (core + streak) * p_color + ring * vec3(0.7, 0.9, 1.0);
  for (int i = 0; i < 12; i++) {
    if (float(i) >= p_ghosts) break;
    float fi = float(i);
    float k = 0.35 + fi * 0.28 * (mod(fi, 2.0) < 0.5 ? 1.0 : -0.6);
    vec2 gp = L + (C - L) * 2.0 * k;
    float sz = 0.02 + 0.05 * hash12(vec2(fi, 3.0));
    float g = exp(-pow(length(p - gp) / sz, 2.0)) * 0.22;
    vec3 tint = 0.5 + 0.5 * cos(TAU * (fi * 0.17 + vec3(0.0, 0.33, 0.67)));
    add += g * tint;
  }
  add *= p_brightness / 100.0;
  vec3 r = 1.0 - (1.0 - c.rgb) * (1.0 - clamp(add, 0.0, 1.0));
  o = outc(r, max(c.a, clamp(luma(add), 0.0, 1.0)));
}`),
  lightRays: fx(`
uniform float p_centerX;
uniform float p_centerY;
uniform float p_length;
uniform float p_intensity;
uniform float p_threshold;
uniform vec3 p_color;
void main() {
  vec2 c = cuv(v_uv);
  vec4 base = colP(v_uv);
  vec2 ctr = vec2(p_centerX, p_centerY) / 100.0;
  vec3 sum = vec3(0.0);
  float th = p_threshold / 100.0;
  for (int i = 0; i < 48; i++) {
    float k = float(i) / 48.0;
    vec2 s = c + (ctr - c) * k * p_length / 100.0;
    vec4 px = colC(s);
    float w = smoothstep(th, th + 0.2, luma(px.rgb)) * px.a;
    sum += px.rgb * w * (1.0 - k);
  }
  vec3 rays = sum / 24.0 * p_intensity / 100.0 * p_color;
  o = outc(base.rgb + rays, max(base.a, clamp(luma(rays), 0.0, 1.0)));
}`),
  oldFilm: fx(`
uniform float p_amount;
uniform float p_sepia;
uniform float p_grain;
uniform float p_flicker;
uniform float p_scratches;
uniform float p_dust;
uniform float p_jitter;
uniform float p_vignette;
void main() {
  float frame = floor(u_time * 18.0);
  vec2 c0 = cuv(v_uv);
  vec2 c = c0 + vec2(hash12(vec2(frame, 1.0)) - 0.5, hash12(vec2(frame, 2.0)) - 0.5) * 0.008 * p_jitter / 100.0;
  vec4 src = colC(c);
  vec3 col = src.rgb;
  float y = luma(col);
  col = mix(col, vec3(y) * vec3(1.07, 0.86, 0.62) * 1.08, p_sepia / 100.0);
  col += (hash12(c0 * csize() + frame) - 0.5) * p_grain / 100.0 * 0.35;
  col *= 1.0 + (hash12(vec2(frame, 7.0)) - 0.5) * 0.35 * p_flicker / 100.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float on = step(1.0 - p_scratches / 100.0 * 0.7, hash12(vec2(floor(frame / 3.0), fi + 5.0)));
    float x = hash12(vec2(floor(frame / 3.0), fi + 9.0)) + sin(frame * 0.3 + fi) * 0.01;
    float line = (1.0 - smoothstep(0.0005, 0.002, abs(c0.x - x))) * on;
    col = mix(col, vec3(0.92), line * 0.6);
  }
  vec2 cell = floor(c0 * vec2(48.0, 27.0));
  float dh = hash12(cell + frame * 3.1);
  if (dh < p_dust / 100.0 * 0.02) {
    vec2 ctr = (cell + hash22(cell + frame)) / vec2(48.0, 27.0);
    float d = length((c0 - ctr) * vec2(aspect(), 1.0));
    col = mix(col, vec3(0.08), 1.0 - smoothstep(0.001, 0.004, d));
  }
  vec2 q = c0 - 0.5;
  col *= 1.0 - p_vignette / 100.0 * dot(q, q) * 2.2;
  o = outc(mix(colC(c0).rgb, col, p_amount / 100.0), src.a);
}`),
  // ---------------- Distort ----------------
  cornerPin: fx(`
uniform mat3 u_hinv;
void main() {
  vec3 q = u_hinv * vec3(cuv(v_uv), 1.0);
  if (q.z <= 1e-6) { o = vec4(0.0); return; }
  vec2 s = q.xy / q.z;
  if (s.x < 0.0 || s.y < 0.0 || s.x > 1.0 || s.y > 1.0) { o = vec4(0.0); return; }
  o = texC(s);
}`),
  bulge: fx(`
uniform float p_centerX;
uniform float p_centerY;
uniform float p_radius;
uniform float p_strength;
void main() {
  vec2 asp = vec2(aspect(), 1.0);
  vec2 ctr = vec2(p_centerX, p_centerY) / 100.0;
  vec2 p = (cuv(v_uv) - ctr) * asp;
  float R = p_radius / 100.0 * asp.x;
  float d = length(p);
  if (d < R && R > 0.0) {
    float f = d / R;
    float amt = (1.0 - f) * (1.0 - f) * p_strength / 100.0;
    p *= 1.0 - amt;
  }
  o = texC(ctr + p / asp);
}`),
  twirl: fx(`
uniform float p_centerX;
uniform float p_centerY;
uniform float p_radius;
uniform float p_angle;
void main() {
  vec2 asp = vec2(aspect(), 1.0);
  vec2 ctr = vec2(p_centerX, p_centerY) / 100.0;
  vec2 p = (cuv(v_uv) - ctr) * asp;
  float R = p_radius / 100.0 * asp.x;
  float d = length(p);
  if (d < R && R > 0.0) {
    float f = 1.0 - d / R;
    p = rot2(radians(p_angle) * f * f) * p;
  }
  o = texC(ctr + p / asp);
}`),
  waveWarp: fx(`
uniform int p_shape;
uniform float p_amplitude;
uniform float p_wavelength;
uniform float p_direction;
uniform float p_speed;
uniform float p_phase;
float wave(float x) {
  if (p_shape == 0) return sin(x);
  float f = fract(x / TAU);
  if (p_shape == 1) return 1.0 - 4.0 * abs(f - 0.5);
  return f < 0.5 ? 1.0 : -1.0;
}
void main() {
  vec2 pc = cuv(v_uv) * csize();
  float a = radians(p_direction - 90.0);
  vec2 D = vec2(cos(a), sin(a));
  vec2 N = vec2(-D.y, D.x);
  float ph = dot(pc, D) / max(1.0, p_wavelength * u_ppx) * TAU - u_time * p_speed * TAU + radians(p_phase);
  vec2 src = pc - N * wave(ph) * p_amplitude * u_ppx;
  o = texC(src / csize());
}`),
  ripple: fx(`
uniform float p_centerX;
uniform float p_centerY;
uniform float p_amplitude;
uniform float p_wavelength;
uniform float p_speed;
uniform float p_decay;
void main() {
  vec2 pc = cuv(v_uv) * csize();
  vec2 ctr = vec2(p_centerX, p_centerY) / 100.0 * csize();
  vec2 d = pc - ctr;
  float r = length(d);
  float lam = max(1.0, p_wavelength * u_ppx);
  float att = exp(-p_decay / 100.0 * 3.0 * r / max(csize().x, 1.0));
  float disp = sin(r / lam * TAU - u_time * p_speed * TAU) * p_amplitude * u_ppx * att;
  vec2 src = r > 1e-3 ? pc - d / r * disp : pc;
  o = texC(src / csize());
}`),
  lensDistortion: fx(`
uniform float p_curvature;
uniform bool p_fill;
void main() {
  vec2 asp = vec2(aspect(), 1.0);
  float nrm = length(asp * 0.5);
  vec2 p = (cuv(v_uv) - 0.5) * asp / nrm;
  float k = p_curvature / 100.0 * 0.5;
  float scale = 1.0;
  if (p_fill && k > 0.0) scale = 1.0 / (1.0 + k);
  p *= scale;
  vec2 src = p * (1.0 + k * dot(p, p));
  vec2 c = src * nrm / asp + 0.5;
  if (c.x < 0.0 || c.y < 0.0 || c.x > 1.0 || c.y > 1.0) { o = vec4(0.0); return; }
  o = texC(c);
}`),
  kaleidoscope: fx(`
uniform float p_segments;
uniform float p_angle;
uniform float p_centerX;
uniform float p_centerY;
uniform float p_zoom;
void main() {
  vec2 asp = vec2(aspect(), 1.0);
  vec2 ctr = vec2(p_centerX, p_centerY) / 100.0;
  vec2 p = (cuv(v_uv) - ctr) * asp;
  float r = length(p) / max(p_zoom / 100.0, 0.01);
  float th = atan(p.y, p.x) + radians(p_angle);
  float seg = TAU / max(2.0, floor(p_segments));
  th = mod(th, seg);
  if (th > seg * 0.5) th = seg - th;
  vec2 q = vec2(cos(th), sin(th)) * r;
  o = texC(ctr + q / asp);
}`),
  reflect: fx(`
uniform float p_angle;
uniform float p_centerX;
uniform float p_centerY;
void main() {
  vec2 asp = vec2(aspect(), 1.0);
  vec2 ctr = vec2(p_centerX, p_centerY) / 100.0;
  vec2 p = (cuv(v_uv) - ctr) * asp;
  float a = radians(p_angle);
  vec2 n = vec2(cos(a), sin(a));
  float s = dot(p, n);
  if (s < 0.0) p -= 2.0 * s * n;
  o = texC(ctr + p / asp);
}`),
  offsetTile: fx(`
uniform float p_shiftX;
uniform float p_shiftY;
uniform float p_tilesX;
uniform float p_tilesY;
uniform bool p_mirror;
void main() {
  vec2 c = cuv(v_uv);
  if (c.x < 0.0 || c.y < 0.0 || c.x > 1.0 || c.y > 1.0) { o = vec4(0.0); return; }
  vec2 q = c * vec2(max(p_tilesX, 1.0), max(p_tilesY, 1.0)) - vec2(p_shiftX, p_shiftY) / 100.0;
  if (p_mirror) q = 1.0 - abs(mod(q, 2.0) - 1.0);
  else q = fract(q);
  o = texC(clamp(q, 0.0005, 0.9995));
}`),
  turbulentDisplace: fx(`
uniform float p_amount;
uniform float p_size;
uniform float p_complexity;
uniform float p_evolution;
uniform float p_speed;
uniform float p_seed;
void main() {
  vec2 pc = cuv(v_uv) * csize();
  vec2 q = pc / max(1.0, p_size * u_ppx);
  float ev = radians(p_evolution + p_speed * u_time);
  vec2 e1 = vec2(cos(ev), sin(ev)) * 1.5;
  float n1 = fbm(q + e1 + p_seed, p_complexity);
  float n2 = fbm(q + vec2(5.2, 1.3) + vec2(-e1.y, e1.x) + p_seed, p_complexity);
  vec2 disp = (vec2(n1, n2) - 0.5) * 2.0 * p_amount * u_ppx;
  o = texC((pc + disp) / csize());
}`),
  polarCoordinates: fx(`
uniform int p_type;
uniform float p_amount;
void main() {
  vec2 c = cuv(v_uv);
  vec2 s;
  if (p_type == 0) {
    vec2 p = (c - 0.5) * vec2(aspect(), 1.0) / vec2(aspect(), 1.0);
    float r = length(p) * 2.0;
    float th = atan(p.x, -p.y) / TAU + 0.5;
    s = vec2(th, r);
  } else {
    float th = c.x * TAU - PI;
    float r = c.y * 0.5;
    s = vec2(0.5) + r * vec2(sin(th), -cos(th));
  }
  o = texC(mix(c, s, p_amount / 100.0));
}`),
  // ---------------- Transform ----------------
  mirror: fx(`
uniform bool p_horizontal;
uniform bool p_vertical;
void main() {
  vec2 c = cuv(v_uv);
  if (c.x < 0.0 || c.y < 0.0 || c.x > 1.0 || c.y > 1.0) { o = texP(v_uv); return; }
  if (p_horizontal) c.x = 1.0 - c.x;
  if (p_vertical) c.y = 1.0 - c.y;
  o = texC(c);
}`),
  transform: fx(`
uniform mat3 u_inv[16];
uniform int u_n;
uniform float u_opacity;
void main() {
  vec2 cs = csize();
  vec2 p = cuv(v_uv) * cs - cs * 0.5;
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= u_n) break;
    vec2 s = (u_inv[i] * vec3(p, 1.0)).xy + cs * 0.5;
    vec2 q = s / cs;
    if (q.x >= 0.0 && q.y >= 0.0 && q.x <= 1.0 && q.y <= 1.0) acc += texC(q);
  }
  o = acc / float(max(u_n, 1)) * u_opacity;
}`),
  stabilizer: fx(`
uniform mat3 u_warp;
uniform bool u_on;
void main() {
  if (!u_on) { o = texP(v_uv); return; }
  vec2 c = cuv(v_uv);
  if (c.x < 0.0 || c.y < 0.0 || c.x > 1.0 || c.y > 1.0) { o = vec4(0.0); return; }
  vec3 q = u_warp * vec3(c, 1.0);
  vec2 s = q.xy / q.z;
  if (s.x < 0.0 || s.y < 0.0 || s.x > 1.0 || s.y > 1.0) { o = vec4(0.0); return; }
  o = texC(s);
}`)
};
const FX_HELPERS = {
  /** Separable gaussian blur on premultiplied input, optionally clamped to a rect. */
  blur: `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform vec2 u_dir;
uniform float u_sigma;
uniform float u_taps;
uniform bool u_clampOn;
uniform vec4 u_clampRect; // x0, y0, x1, y1 (uv)
vec4 tap(vec2 uv) {
  if (u_clampOn) uv = clamp(uv, u_clampRect.xy, u_clampRect.zw);
  return texture(u_src, uv);
}
void main() {
  vec4 acc = tap(v_uv);
  float wsum = 1.0;
  float inv = -0.5 / max(1e-4, u_sigma * u_sigma);
  for (int i = 1; i <= 48; i++) {
    float fi = float(i);
    if (fi > u_taps) break;
    float w = exp(fi * fi * inv);
    acc += (tap(v_uv + u_dir * fi) + tap(v_uv - u_dir * fi)) * w;
    wsum += 2.0 * w;
  }
  o = acc / wsum;
}`,
  /** Bright-pass for glow. */
  glowExtract: `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform float u_threshold;
uniform bool u_linear;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
void main() {
  vec4 c = texture(u_src, v_uv);
  vec3 rgb = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
  if (u_linear) rgb = pow(max(rgb, vec3(0.0)), vec3(1.0 / 2.2));
  float m = smoothstep(u_threshold, u_threshold + 0.15, dot(rgb, LUMA));
  o = c * m;
}`,
  /** Glow add (mode 0) or drop shadow under (mode 1). */
  combine: `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_base;
uniform sampler2D u_fx;
uniform int u_mode;
uniform vec3 u_color;
uniform float u_amount;
uniform vec2 u_offset;
void main() {
  vec4 base = texture(u_base, v_uv);
  if (u_mode == 0) {
    vec4 g = texture(u_fx, v_uv) * u_amount;
    o = vec4(base.rgb + g.rgb * u_color, clamp(base.a + g.a * (1.0 - base.a), 0.0, 1.0));
  } else {
    float s = texture(u_fx, v_uv - u_offset).a * u_amount;
    vec4 sh = vec4(u_color * s, s);
    o = base + sh * (1.0 - base.a);
  }
}`,
  /** Apply a .cube 3D LUT. */
  lut: FX_HEAD.replace("precision highp float;", "precision highp float;\nprecision highp sampler3D;") + `
uniform sampler3D u_lut;
uniform float u_lutSize;
uniform float p_intensity;
void main() {
  vec4 c = colP(v_uv);
  vec3 lc = clamp(c.rgb, 0.0, 1.0) * ((u_lutSize - 1.0) / u_lutSize) + 0.5 / u_lutSize;
  o = outc(mix(c.rgb, texture(u_lut, lc).rgb, p_intensity / 100.0), c.a);
}`,
  /** Unsharp mask: original + (original - blurred) above a threshold. */
  unsharp: FX_HEAD + `
uniform sampler2D u_blurred;
uniform float p_amount;
uniform float p_threshold;
void main() {
  vec4 c = colP(v_uv);
  vec4 b = unp(texture(u_blurred, v_uv));
  vec3 d = c.rgb - b.rgb;
  float k = smoothstep(p_threshold / 255.0, p_threshold / 255.0 + 0.02, abs(luma(d)));
  o = outc(c.rgb + d * p_amount / 100.0 * (p_threshold <= 0.0 ? 1.0 : k), c.a);
}`,
  /** Matte choker: threshold a blurred alpha. */
  choke: FX_HEAD + `
uniform sampler2D u_blurred;
uniform float u_t;
uniform float u_w;
void main() {
  vec4 orig = texP(v_uv);
  vec4 bl = texture(u_blurred, v_uv);
  float a = smoothstep(u_t - u_w, u_t + u_w, bl.a);
  vec3 col = orig.a > 0.02 ? orig.rgb / orig.a : (bl.a > 1e-4 ? bl.rgb / bl.a : vec3(0.0));
  o = vec4(col * a, a);
}`,
  /** Echo: combine the current buffer with an earlier one. */
  echo: `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_base;
uniform sampler2D u_prev;
uniform int u_mode;
uniform float u_w;
void main() {
  vec4 b = texture(u_base, v_uv);
  vec4 p = texture(u_prev, v_uv) * u_w;
  if (u_mode == 0) o = b + p * (1.0 - b.a);
  else if (u_mode == 1) o = p + b * (1.0 - p.a);
  else if (u_mode == 2) o = vec4(b.rgb + p.rgb, clamp(b.a + p.a, 0.0, 1.0));
  else if (u_mode == 3) o = max(b, p);
  else if (u_mode == 4) o = vec4(b.rgb + p.rgb - b.rgb * p.rgb, b.a + p.a - b.a * p.a);
  else o = mix(b, texture(u_prev, v_uv), u_w * 0.5);
}`
};
const GEN_HEAD = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform vec2 u_size;  // output size, px
uniform float u_ppx;  // output px per sequence px
uniform float u_time;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const float PI = 3.14159265359;
const float TAU = 6.28318530718;
float aspect() { return u_size.x / max(u_size.y, 1.0); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float dither() { return (hash12(gl_FragCoord.xy) - 0.5) / 255.0; }
vec4 emit(vec3 c, float a) { c = clamp(c + dither(), 0.0, 1.0); return vec4(c * a, a); }
float midpoint(float t, float m) { m = clamp(m, 0.01, 0.99); return pow(clamp(t, 0.0, 1.0), log(0.5) / log(m)); }
`;
const gen = (body) => GEN_HEAD + body;
const GEN_SHADERS = {
  linearGradient: gen(`
uniform float p_startX; uniform float p_startY; uniform float p_endX; uniform float p_endY;
uniform vec3 p_colorA; uniform vec3 p_colorB; uniform float p_midpoint; uniform bool p_smooth;
void main() {
  vec2 asp = vec2(aspect(), 1.0);
  vec2 a = vec2(p_startX, p_startY) / 100.0 * asp;
  vec2 b = vec2(p_endX, p_endY) / 100.0 * asp;
  vec2 p = v_uv * asp;
  vec2 ab = b - a;
  float t = dot(p - a, ab) / max(dot(ab, ab), 1e-6);
  t = midpoint(t, p_midpoint / 100.0);
  if (p_smooth) t = smoothstep(0.0, 1.0, t);
  o = emit(mix(p_colorA, p_colorB, t), 1.0);
}`),
  radialGradient: gen(`
uniform float p_centerX; uniform float p_centerY; uniform float p_radius;
uniform vec3 p_colorA; uniform vec3 p_colorB; uniform float p_midpoint;
void main() {
  vec2 asp = vec2(aspect(), 1.0);
  float d = length((v_uv - vec2(p_centerX, p_centerY) / 100.0) * asp) / max(p_radius / 100.0 * asp.x, 1e-4);
  o = emit(mix(p_colorA, p_colorB, midpoint(d, p_midpoint / 100.0)), 1.0);
}`),
  fourColor: gen(`
uniform float p_p1X; uniform float p_p1Y; uniform vec3 p_c1;
uniform float p_p2X; uniform float p_p2Y; uniform vec3 p_c2;
uniform float p_p3X; uniform float p_p3Y; uniform vec3 p_c3;
uniform float p_p4X; uniform float p_p4Y; uniform vec3 p_c4;
uniform float p_blend;
void main() {
  vec2 asp = vec2(aspect(), 1.0);
  vec2 p = v_uv * asp;
  float w1 = 1.0 / pow(max(length(p - vec2(p_p1X, p_p1Y) / 100.0 * asp), 1e-3), p_blend);
  float w2 = 1.0 / pow(max(length(p - vec2(p_p2X, p_p2Y) / 100.0 * asp), 1e-3), p_blend);
  float w3 = 1.0 / pow(max(length(p - vec2(p_p3X, p_p3Y) / 100.0 * asp), 1e-3), p_blend);
  float w4 = 1.0 / pow(max(length(p - vec2(p_p4X, p_p4Y) / 100.0 * asp), 1e-3), p_blend);
  o = emit((p_c1 * w1 + p_c2 * w2 + p_c3 * w3 + p_c4 * w4) / (w1 + w2 + w3 + w4), 1.0);
}`),
  noise: gen(`
uniform int p_type; uniform float p_scale; uniform float p_complexity; uniform float p_contrast;
uniform float p_brightness; uniform float p_evolution; uniform float p_speed; uniform bool p_color; uniform float p_seed;
float cell(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 r = g + hash22(i + g) - f;
      d = min(d, dot(r, r));
    }
  }
  return sqrt(d);
}
float layer(vec2 p, float ev) {
  float a = 0.5;
  float s = 0.0;
  float n = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= p_complexity) break;
    vec2 q = p + vec2(cos(ev + float(i)), sin(ev * 1.3 + float(i))) * 0.6;
    float v;
    if (p_type == 2) v = 1.0 - cell(q);
    else v = vnoise(q);
    if (p_type == 1) v = abs(v * 2.0 - 1.0);
    s += a * v;
    n += a;
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s / max(n, 1e-4);
}
void main() {
  vec2 p = v_uv * u_size / max(1.0, p_scale * u_ppx) + p_seed * 7.31;
  float ev = radians(p_evolution + p_speed * u_time);
  vec3 c;
  if (p_color) c = vec3(layer(p, ev), layer(p + 31.7, ev + 2.0), layer(p + 63.1, ev + 4.0));
  else c = vec3(layer(p, ev));
  c = (c - 0.5) * p_contrast / 100.0 + 0.5 + p_brightness / 100.0;
  o = emit(c, 1.0);
}`),
  grid: gen(`
uniform float p_size; uniform float p_width; uniform vec3 p_color; uniform vec3 p_background;
uniform float p_bgOpacity; uniform float p_offsetX; uniform float p_offsetY;
void main() {
  vec2 pc = v_uv * u_size / max(u_ppx, 1e-4) + vec2(p_offsetX, p_offsetY);
  vec2 m = mod(pc, max(p_size, 1.0));
  vec2 dd = min(m, max(p_size, 1.0) - m);
  float d = min(dd.x, dd.y);
  float aa = 0.5 / max(u_ppx, 1e-4);
  float line = 1.0 - smoothstep(p_width * 0.5 - aa, p_width * 0.5 + aa, d);
  float bgA = p_bgOpacity / 100.0;
  float a = line + bgA * (1.0 - line);
  vec3 c = a > 0.0 ? (p_color * line + p_background * bgA * (1.0 - line)) / a : vec3(0.0);
  o = emit(c, a);
}`),
  checkerboard: gen(`
uniform float p_size; uniform vec3 p_colorA; uniform vec3 p_colorB; uniform float p_offsetX; uniform float p_offsetY;
void main() {
  vec2 pc = v_uv * u_size / max(u_ppx, 1e-4) + vec2(p_offsetX, p_offsetY);
  vec2 q = floor(pc / max(p_size, 1.0));
  float k = mod(q.x + q.y, 2.0);
  o = emit(mix(p_colorA, p_colorB, k), 1.0);
}`)
};
const TR_HEAD = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_A;
uniform sampler2D u_B;
uniform float u_p;      // eased progress 0..1
uniform vec2 u_res;     // buffer size px
uniform float u_ppx;    // buffer px per sequence px
uniform bool u_linear;
uniform float u_time;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const float PI = 3.14159265359;
const float TAU = 6.28318530718;
float aspect() { return u_res.x / max(u_res.y, 1.0); }
bool inside(vec2 st) { return st.x >= 0.0 && st.y >= 0.0 && st.x <= 1.0 && st.y <= 1.0; }
vec4 A(vec2 st) { return inside(st) ? texture(u_A, st) : vec4(0.0); }
vec4 B(vec2 st) { return inside(st) ? texture(u_B, st) : vec4(0.0); }
vec3 lin(vec3 c) { return u_linear ? pow(max(c, vec3(0.0)), vec3(2.2)) : c; }
float lumaP(vec4 p) {
  vec3 c = p.a > 1e-5 ? p.rgb / p.a : vec3(0.0);
  if (u_linear) c = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
  return dot(c, LUMA);
}
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p, float oct) {
  float a = 0.5;
  float s = 0.0;
  float n = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= oct) break;
    s += a * vnoise(p);
    n += a;
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s / max(n, 1e-4);
}
mat2 rot2(float a) { float c = cos(a); float s = sin(a); return mat2(c, s, -s, c); }
float reveal(float g, float soft) { float s = max(soft, 0.0005); return smoothstep(g, g + s, u_p * (1.0 + s)); }
// Direction helpers: map screen st into a local frame where motion goes right-to-left.
vec2 toLocal(vec2 st, int dir) {
  if (dir == 1) return vec2(1.0 - st.x, st.y);
  if (dir == 2) return vec2(st.y, st.x);
  if (dir == 3) return vec2(1.0 - st.y, st.x);
  return st;
}
vec2 fromLocal(vec2 l, int dir) {
  if (dir == 1) return vec2(1.0 - l.x, l.y);
  if (dir == 2) return vec2(l.y, l.x);
  if (dir == 3) return vec2(l.y, 1.0 - l.x);
  return l;
}
float localAspect(int dir) { return dir >= 2 ? 1.0 / aspect() : aspect(); }
vec3 rotY(vec3 p, float a) { float c = cos(a); float s = sin(a); return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c); }
// Ray from the eye through screen point s hitting the plane (q, n). Returns t (or -1).
float hitPlane(vec3 eye, vec3 s, vec3 q, vec3 n) {
  vec3 d = s - eye;
  float den = dot(d, n);
  if (abs(den) < 1e-6) return -1.0;
  return dot(q - eye, n) / den;
}
`;
const tr = (body) => TR_HEAD + body;
const TRANSITION_SHADERS = {
  lumaFade: tr(`
uniform float p_softness;
uniform float p_invert;
void main() {
  vec2 st = v_uv;
  vec4 a = A(st);
  float l = clamp(lumaP(a), 0.0, 1.0);
  if (p_invert > 0.5) l = 1.0 - l;
  o = mix(a, B(st), reveal(l, p_softness / 100.0));
}`),
  rippleDissolve: tr(`
uniform float p_amplitude;
uniform float p_frequency;
void main() {
  vec2 st = v_uv;
  vec2 asp = vec2(aspect(), 1.0);
  vec2 d = (st - 0.5) * asp;
  float r = length(d);
  float bell = sin(u_p * PI);
  vec2 off = r > 1e-4 ? d / r * sin(r * p_frequency * 2.0 - u_p * TAU * 2.0) * p_amplitude / 100.0 * 0.03 * bell : vec2(0.0);
  vec2 q = st + off / asp;
  o = mix(A(q), B(q), smoothstep(0.25, 0.75, u_p));
}`),
  crossStretch: tr(`
uniform int p_axis;
void main() {
  vec2 st = v_uv;
  float x = p_axis == 0 ? st.x : st.y;
  float b = 1.0 - u_p;
  vec2 q;
  if (x < b) {
    float u = x / max(b, 1e-4);
    q = p_axis == 0 ? vec2(u, st.y) : vec2(st.x, u);
    o = A(q);
  } else {
    float u = (x - b) / max(u_p, 1e-4);
    q = p_axis == 0 ? vec2(u, st.y) : vec2(st.x, u);
    o = B(q);
  }
}`),
  radialWipe: tr(`
uniform int p_corner;
uniform float p_softness;
void main() {
  vec2 st = v_uv;
  float asp = aspect();
  float d;
  if (p_corner == 4) {
    d = fract(atan(st.x - 0.5, -(st.y - 0.5)) / TAU + 1.0);
  } else {
    vec2 q = st;
    if (p_corner == 1 || p_corner == 3) q.x = 1.0 - q.x;
    if (p_corner == 2 || p_corner == 3) q.y = 1.0 - q.y;
    d = atan(q.y, q.x * asp) / (PI * 0.5);
  }
  o = mix(A(st), B(st), reveal(clamp(d, 0.0, 1.0), p_softness / 100.0));
}`),
  venetianBlinds: tr(`
uniform float p_bands;
uniform int p_axis;
uniform float p_softness;
void main() {
  vec2 st = v_uv;
  float coord = p_axis == 0 ? st.x : st.y;
  float f = fract(coord * max(p_bands, 1.0));
  o = mix(A(st), B(st), reveal(f, p_softness / 100.0));
}`),
  gradientWipe: tr(`
uniform int p_pattern;
uniform float p_softness;
uniform float p_invert;
uniform sampler2D t_pattern;
uniform bool u_hasPattern;
void main() {
  vec2 st = v_uv;
  vec2 asp = vec2(aspect(), 1.0);
  float g;
  if (p_pattern == 0) g = clamp((fbm(st * asp * 3.0, 5.0) - 0.22) / 0.56, 0.0, 1.0);
  else if (p_pattern == 1) g = st.x;
  else if (p_pattern == 2) g = length((st - 0.5) * asp) / length(asp * 0.5);
  else if (p_pattern == 3) { vec2 d = (st - 0.5) * asp; g = fract(atan(d.y, d.x) / TAU + 0.5 + length(d) * 1.5); }
  else if (p_pattern == 4) g = abs(st.x - 0.5) + abs(st.y - 0.5);
  else if (p_pattern == 5) g = hash12(floor(st * u_res / 2.0));
  else g = u_hasPattern ? dot(texture(t_pattern, st).rgb, LUMA) : st.x;
  if (p_invert > 0.5) g = 1.0 - g;
  o = mix(A(st), B(st), reveal(clamp(g, 0.0, 1.0), p_softness / 100.0));
}`),
  irisCross: tr(`
uniform float p_softness;
void main() {
  vec2 st = v_uv;
  vec2 d = abs(st - 0.5) * vec2(aspect(), 1.0);
  float g = min(d.x, d.y) / 0.5;
  o = mix(A(st), B(st), reveal(clamp(g, 0.0, 1.0), p_softness / 100.0));
}`),
  irisStar: tr(`
uniform float p_points;
uniform float p_softness;
void main() {
  vec2 st = v_uv;
  vec2 asp = vec2(aspect(), 1.0);
  vec2 d = (st - 0.5) * asp;
  float r = length(d);
  float n = max(3.0, floor(p_points));
  float seg = TAU / n;
  float th = atan(d.y, d.x) + PI * 0.5;
  float t = abs(mod(th, seg) - seg * 0.5) / (seg * 0.5);
  float f = mix(1.0, 0.45, pow(t, 1.5));
  float rmax = length(asp) * 0.5 / 0.45;
  float g = r / f / rmax;
  o = mix(A(st), B(st), reveal(clamp(g, 0.0, 1.0), p_softness / 100.0));
}`),
  inset: tr(`
uniform int p_corner;
uniform float p_softness;
void main() {
  vec2 st = v_uv;
  vec2 q = st;
  if (p_corner == 1 || p_corner == 3) q.x = 1.0 - q.x;
  if (p_corner == 2 || p_corner == 3) q.y = 1.0 - q.y;
  o = mix(A(st), B(st), reveal(max(q.x, q.y), p_softness / 100.0));
}`),
  whipPan: tr(`
uniform int p_direction;
uniform float p_blur;
void main() {
  vec2 st = v_uv;
  vec2 D = p_direction == 0 ? vec2(-1.0, 0.0) : p_direction == 1 ? vec2(1.0, 0.0) : p_direction == 2 ? vec2(0.0, -1.0) : vec2(0.0, 1.0);
  float e = 0.5 - 0.5 * cos(PI * u_p);
  float bl = sin(PI * u_p) * p_blur / 100.0 * 0.35;
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 24; i++) {
    float k = (float(i) / 23.0 - 0.5) * bl;
    vec2 s = st - D * e + D * k;
    acc += A(s) + B(s + D);
  }
  o = acc / 24.0;
}`),
  zoomBlur: tr(`
uniform float p_strength;
uniform int p_mode;
vec4 zoomed(bool useA, float scale, float bl) {
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 24; i++) {
    float f = 1.0 - bl * float(i) / 23.0;
    vec2 q = 0.5 + (v_uv - 0.5) / scale * f;
    acc += useA ? A(q) : B(q);
  }
  return acc / 24.0;
}
void main() {
  float s = p_strength / 100.0;
  float bl = sin(PI * u_p) * 0.35 * s;
  float sa = 1.0 + s * 2.0 * u_p;
  float sb = 1.0 + s * 2.0 * (1.0 - u_p);
  if (p_mode == 1) { sa = 1.0 / sa; sb = 1.0 / sb; }
  o = mix(zoomed(true, sa, bl), zoomed(false, sb, bl), smoothstep(0.4, 0.6, u_p));
}`),
  spin: tr(`
uniform float p_turns;
uniform float p_blur;
uniform float p_clockwise;
vec4 spun(bool useA, float ang, float spread) {
  vec2 asp = vec2(aspect(), 1.0);
  vec2 d = (v_uv - 0.5) * asp;
  float z = 1.0 + 0.35 * sin(PI * u_p);
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 20; i++) {
    float k = (float(i) / 19.0 - 0.5) * spread;
    vec2 q = 0.5 + (rot2(-(ang + k)) * d) * z / asp;
    acc += useA ? A(q) : B(q);
  }
  return acc / 20.0;
}
void main() {
  float dir = p_clockwise > 0.5 ? 1.0 : -1.0;
  float th = radians(p_turns) * dir;
  float spread = sin(PI * u_p) * p_blur / 100.0 * 0.6;
  o = mix(spun(true, th * u_p, spread), spun(false, th * (u_p - 1.0), spread), smoothstep(0.4, 0.6, u_p));
}`),
  glitchTransition: tr(`
uniform float p_intensity;
uniform float p_blockSize;
void main() {
  vec2 st = v_uv;
  float bell = sin(u_p * PI) * p_intensity / 100.0;
  float f = floor(u_p * 24.0);
  float bs = max(2.0, p_blockSize * u_ppx);
  vec2 cell = floor(st * u_res / bs);
  float m = step(hash12(cell + 0.37), u_p);
  float row = floor(st.y * u_res.y / bs);
  float shift = (hash12(vec2(row, f)) - 0.5) * 0.18 * bell * step(0.6, hash12(vec2(row, f + 3.0)));
  vec2 q = st + vec2(shift, 0.0);
  float off = 0.012 * bell;
  vec4 a = vec4(A(q + vec2(off, 0.0)).r, A(q).g, A(q - vec2(off, 0.0)).b, A(q).a);
  vec4 b = vec4(B(q + vec2(off, 0.0)).r, B(q).g, B(q - vec2(off, 0.0)).b, B(q).a);
  o = mix(a, b, m);
}`),
  lightLeakTransition: tr(`
uniform vec3 p_color;
uniform float p_intensity;
void main() {
  vec2 st = v_uv;
  vec4 base = mix(A(st), B(st), smoothstep(0.35, 0.65, u_p));
  float bell = pow(sin(PI * u_p), 1.5);
  float n = fbm(st * vec2(aspect(), 1.0) * 2.0 + vec2(u_p * 1.5, 0.3), 4.0);
  // Light only where the clips are (never over lower tracks).
  float cover = max(A(st).a, B(st).a);
  vec3 leak = lin(p_color) * (smoothstep(0.3, 0.9, n + bell * 0.4 - 0.2) * 1.5 + 0.25) * bell * p_intensity / 100.0;
  leak = clamp(leak, 0.0, 1.0) * cover;
  vec3 c = base.a > 1e-5 ? base.rgb / base.a : vec3(0.0);
  float a = max(base.a, min(cover, dot(leak, LUMA)));
  c = 1.0 - (1.0 - c) * (1.0 - leak);
  o = vec4(c * a, a);
}`),
  filmBurn: tr(`
uniform vec3 p_color;
uniform float p_scale;
void main() {
  vec2 st = v_uv;
  vec2 q = st * vec2(aspect(), 1.0) * 3.0 / max(p_scale / 100.0, 0.05);
  float n = fbm(q + vec2(0.0, u_p * 0.6), 5.0);
  float th = u_p * 1.3 - 0.15;
  float m = smoothstep(th + 0.02, th - 0.02, n);
  float edge = 1.0 - smoothstep(0.0, 0.07, abs(n - th));
  vec4 base = mix(A(st), B(st), m);
  float cover = max(A(st).a, B(st).a);
  vec3 glow = lin(p_color) * edge * 2.2 * sin(PI * clamp(u_p, 0.0, 1.0)) * cover;
  o = vec4(base.rgb + glow, max(base.a, min(cover, dot(glow, LUMA))));
}`),
  flash: tr(`
uniform vec3 p_color;
uniform float p_intensity;
void main() {
  vec2 st = v_uv;
  float bell = pow(1.0 - abs(2.0 * u_p - 1.0), 3.0) * p_intensity / 100.0;
  vec4 base = u_p < 0.5 ? A(st) : B(st);
  float cover = max(A(st).a, B(st).a);
  o = mix(base, vec4(lin(p_color), 1.0) * cover, clamp(bell, 0.0, 1.0));
}`),
  checkerWipe: tr(`
uniform float p_cells;
void main() {
  vec2 st = v_uv;
  float n = max(2.0, floor(p_cells));
  vec2 grid = vec2(n, max(1.0, floor(n / aspect() + 0.5)));
  vec2 g = st * grid;
  vec2 id = floor(g);
  vec2 f = fract(g);
  float par = mod(id.x + id.y, 2.0);
  float pp = clamp(u_p * 2.0 - par, 0.0, 1.0);
  o = mix(A(st), B(st), step(f.x, pp) * step(1e-4, pp));
}`),
  randomBlocks: tr(`
uniform float p_cells;
void main() {
  vec2 st = v_uv;
  float n = max(2.0, floor(p_cells));
  vec2 grid = vec2(n, max(1.0, floor(n / aspect() + 0.5)));
  vec2 id = floor(st * grid);
  o = mix(A(st), B(st), step(hash12(id + 7.0), u_p) * step(1e-4, u_p));
}`),
  pixelateTransition: tr(`
uniform float p_size;
void main() {
  vec2 st = v_uv;
  float bell = 1.0 - abs(2.0 * u_p - 1.0);
  float px = max(1.0, p_size * u_ppx * bell);
  vec2 s = vec2(px) / u_res;
  vec2 q = px > 1.0 ? (floor(st / s) + 0.5) * s : st;
  o = mix(A(q), B(q), smoothstep(0.4, 0.6, u_p));
}`),
  swirl: tr(`
uniform float p_strength;
void main() {
  vec2 st = v_uv;
  vec2 asp = vec2(aspect(), 1.0);
  vec2 d = (st - 0.5) * asp;
  float R = 0.5 * length(asp);
  float ang = p_strength / 100.0 * 8.0 * sin(PI * u_p) * (1.0 - smoothstep(0.0, R, length(d)));
  vec2 q = 0.5 + (rot2(ang) * d) / asp;
  o = mix(A(q), B(q), smoothstep(0.3, 0.7, u_p));
}`),
  cubeSpin: tr(`
uniform int p_direction;
uniform float p_perspective;
void main() {
  int dir = p_direction;
  vec2 l = toLocal(v_uv, dir);
  float W = localAspect(dir);
  vec3 s = vec3((l.x - 0.5) * W, l.y - 0.5, 0.0);
  float D = mix(7.0, 1.4, p_perspective / 100.0) * max(W, 1.0);
  vec3 eye = vec3(0.0, 0.0, D);
  float th = u_p * PI * 0.5;
  vec3 C = vec3(0.0, 0.0, -W * 0.5 - W * 0.35 * sin(PI * u_p));
  // Face A (front)
  vec3 nA = rotY(vec3(0.0, 0.0, 1.0), th);
  vec3 uA = rotY(vec3(1.0, 0.0, 0.0), th);
  vec3 qA = C + rotY(vec3(0.0, 0.0, W * 0.5), th);
  // Face B (right side, comes to the front)
  vec3 nB = rotY(vec3(1.0, 0.0, 0.0), th);
  vec3 uB = rotY(vec3(0.0, 0.0, -1.0), th);
  vec3 qB = C + rotY(vec3(W * 0.5, 0.0, 0.0), th);
  float best = 1e9;
  vec4 col = vec4(0.0);
  float tA = hitPlane(eye, s, qA, nA);
  if (tA > 0.0) {
    vec3 p = eye + tA * (s - eye);
    float u = dot(p - qA, uA);
    float v = p.y - qA.y;
    if (abs(u) <= W * 0.5 && abs(v) <= 0.5 && dot(nA, eye - p) > 0.0) {
      best = tA;
      float shade = mix(0.55, 1.0, clamp(dot(nA, normalize(eye - p)), 0.0, 1.0));
      vec4 c = A(fromLocal(vec2(u / W + 0.5, v + 0.5), dir));
      col = vec4(c.rgb * shade, c.a);
    }
  }
  float tB = hitPlane(eye, s, qB, nB);
  if (tB > 0.0 && tB < best) {
    vec3 p = eye + tB * (s - eye);
    float u = dot(p - qB, uB);
    float v = p.y - qB.y;
    if (abs(u) <= W * 0.5 && abs(v) <= 0.5 && dot(nB, eye - p) > 0.0) {
      float shade = mix(0.55, 1.0, clamp(dot(nB, normalize(eye - p)), 0.0, 1.0));
      vec4 c = B(fromLocal(vec2(u / W + 0.5, v + 0.5), dir));
      col = vec4(c.rgb * shade, c.a);
    }
  }
  o = col;
}`),
  flipOver: tr(`
uniform int p_axis;
uniform float p_perspective;
void main() {
  int dir = p_axis == 0 ? 0 : 2;
  vec2 l = toLocal(v_uv, dir);
  float W = localAspect(dir);
  vec3 s = vec3((l.x - 0.5) * W, l.y - 0.5, 0.0);
  float D = mix(7.0, 1.4, p_perspective / 100.0) * max(W, 1.0);
  vec3 eye = vec3(0.0, 0.0, D);
  float th = u_p * PI;
  vec3 q = vec3(0.0, 0.0, -0.45 * W * sin(PI * u_p));
  vec3 n = rotY(vec3(0.0, 0.0, 1.0), th);
  vec3 ua = rotY(vec3(1.0, 0.0, 0.0), th);
  float t = hitPlane(eye, s, q, n);
  o = vec4(0.0);
  if (t > 0.0) {
    vec3 p = eye + t * (s - eye);
    float u = dot(p - q, ua);
    float v = p.y - q.y;
    if (abs(u) <= W * 0.5 && abs(v) <= 0.5) {
      float shade = mix(0.6, 1.0, abs(dot(n, normalize(eye - p))));
      vec4 c = th < PI * 0.5 ? A(fromLocal(vec2(u / W + 0.5, v + 0.5), dir)) : B(fromLocal(vec2(-u / W + 0.5, v + 0.5), dir));
      o = vec4(c.rgb * shade, c.a);
    }
  }
}`),
  pageTurn: tr(`
uniform int p_corner;
uniform float p_radius;
vec2 O;
vec2 dir;
vec2 perp;
vec2 asp;
vec2 pageAt(float d0, float s) { return (O + dir * d0 + perp * s) / asp; }
void main() {
  asp = vec2(aspect(), 1.0);
  vec2 P = v_uv * asp;
  vec2 opp;
  if (p_corner == 0) { O = vec2(0.0, 0.0); opp = asp; }
  else if (p_corner == 1) { O = vec2(asp.x, 0.0); opp = vec2(0.0, 1.0); }
  else if (p_corner == 2) { O = vec2(0.0, 1.0); opp = vec2(asp.x, 0.0); }
  else { O = asp; opp = vec2(0.0); }
  dir = normalize(opp - O);
  perp = vec2(-dir.y, dir.x);
  float L = length(opp - O);
  float R = p_radius / 100.0 * 0.5;
  float F = u_p * (L + PI * R);
  float d = dot(P - O, dir);
  float s = dot(P - O, perp);
  // 1. Flat back of the page lying over the unpeeled part.
  float d0 = 2.0 * F - PI * R - d;
  if (d0 >= 0.0 && d0 < F - PI * R) {
    vec2 st = pageAt(d0, s);
    if (inside(st)) {
      vec4 a = A(st);
      vec3 c = a.a > 1e-5 ? a.rgb / a.a : vec3(0.0);
      vec3 back = mix(lin(vec3(0.93, 0.92, 0.9)), c, 0.25) * 0.92;
      o = vec4(back * a.a, a.a);
      return;
    }
  }
  // 2. The curl (cylinder).
  float x = F - d;
  if (x >= 0.0 && x <= R) {
    float phiU = PI - asin(clamp(x / R, 0.0, 1.0));
    float dU = F - R * phiU;
    if (dU >= 0.0) {
      vec2 st = pageAt(dU, s);
      if (inside(st)) {
        vec4 a = A(st);
        vec3 c = a.a > 1e-5 ? a.rgb / a.a : vec3(0.0);
        vec3 back = mix(lin(vec3(0.93, 0.92, 0.9)), c, 0.25) * (0.7 + 0.3 * sin(phiU));
        o = vec4(back * a.a, a.a);
        return;
      }
    }
    float phiL = asin(clamp(x / R, 0.0, 1.0));
    float dL = F - R * phiL;
    if (dL >= 0.0) {
      vec2 st = pageAt(dL, s);
      if (inside(st)) {
        vec4 a = A(st);
        o = vec4(a.rgb * (0.7 + 0.3 * cos(phiL)), a.a);
        return;
      }
    }
  }
  // 3. Unpeeled page.
  if (d >= F) { o = A(v_uv); return; }
  // 4. Revealed clip, shaded under the curl.
  float k = smoothstep(0.0, R * 1.5, (F - R) - d);
  vec4 b = B(v_uv);
  o = vec4(b.rgb * mix(0.55, 1.0, k), b.a);
}`),
  door: tr(`
uniform int p_hinge;
uniform float p_perspective;
vec3 eye;
vec3 s;
bool doorHit(float hingeX, float width, float sgn, out vec2 uv, out float t, out float shade) {
  float th = u_p * PI * 0.5 * 1.02;
  vec3 h = vec3(hingeX, 0.0, 0.0);
  vec3 ua = rotY(vec3(sgn, 0.0, 0.0), th * sgn);
  vec3 n = rotY(vec3(0.0, 0.0, 1.0), th * sgn);
  t = hitPlane(eye, s, h, n);
  if (t <= 0.0) return false;
  vec3 p = eye + t * (s - eye);
  float u = dot(p - h, ua);
  float v = p.y;
  if (u < 0.0 || u > width || abs(v) > 0.5) return false;
  uv = vec2(hingeX + sgn * u, v);
  shade = mix(0.55, 1.0, abs(dot(n, normalize(eye - p))));
  return true;
}
void main() {
  float W = aspect();
  s = vec3((v_uv.x - 0.5) * W, v_uv.y - 0.5, 0.0);
  float D = mix(7.0, 1.4, p_perspective / 100.0) * max(W, 1.0);
  eye = vec3(0.0, 0.0, D);
  vec2 uv;
  float t;
  float shade;
  vec2 uv2;
  float t2;
  float shade2;
  bool hit = false;
  bool hit2 = false;
  if (p_hinge == 0) hit = doorHit(-W * 0.5, W, 1.0, uv, t, shade);
  else if (p_hinge == 1) hit = doorHit(W * 0.5, W, -1.0, uv, t, shade);
  else {
    hit = doorHit(-W * 0.5, W * 0.5, 1.0, uv, t, shade);
    hit2 = doorHit(W * 0.5, W * 0.5, -1.0, uv2, t2, shade2);
    if (hit2 && (!hit || t2 < t)) { hit = true; uv = uv2; shade = shade2; }
  }
  if (hit) {
    vec4 c = A(vec2(uv.x / W + 0.5, uv.y + 0.5));
    if (c.a > 0.001) { o = vec4(c.rgb * shade, c.a); return; }
  }
  o = B(v_uv);
}`)
};
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
function mul3(a2, b2) {
  const o = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 3; c2++) for (let k = 0; k < 3; k++) o[r * 3 + c2] += a2[r * 3 + k] * b2[k * 3 + c2];
  return o;
}
function inv3(m) {
  const [a2, b2, c2, d, e2, f, g, h, i] = m;
  const A = e2 * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e2 * g;
  const det = a2 * A + b2 * B + c2 * C;
  if (Math.abs(det) < 1e-12) return null;
  const k = 1 / det;
  return [A * k, -(b2 * i - c2 * h) * k, (b2 * f - c2 * e2) * k, B * k, (a2 * i - c2 * g) * k, -(a2 * f - c2 * d) * k, C * k, -(a2 * h - b2 * g) * k, (a2 * e2 - b2 * d) * k];
}
function apply3(m, x, y) {
  const w = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}
function colMajor(m) {
  return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
}
const translate3 = (x, y) => [1, 0, x, 0, 1, y, 0, 0, 1];
const scale3 = (sx, sy = sx) => [sx, 0, 0, 0, sy, 0, 0, 0, 1];
const rotate3 = (a2) => {
  const c2 = Math.cos(a2);
  const s = Math.sin(a2);
  return [c2, -s, 0, s, c2, 0, 0, 0, 1];
};
function squareToQuad(p) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  if (Math.abs(sx) < 1e-12 && Math.abs(sy) < 1e-12) return [x1 - x0, x3 - x0, x0, y1 - y0, y3 - y0, y0, 0, 0, 1];
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}
const stabCache = /* @__PURE__ */ new WeakMap();
function camera(p, i, position, w, h) {
  const x = p[i * 4];
  const y = p[i * 4 + 1];
  if (position) return translate3(x, y);
  const a2 = p[i * 4 + 2];
  const s = Math.exp(p[i * 4 + 3]);
  return mul3(translate3(x, y), mul3(rotate3(a2), scale3(s)));
}
function smooth(d, smoothness, lock) {
  const n2 = d.path.length / 4;
  const out = new Float64Array(n2 * 4);
  if (lock) return out;
  const sigma = Math.max(0.5, smoothness / 100 * 1.5 * d.fps);
  const r = Math.ceil(sigma * 3);
  const wts = [];
  for (let k = -r; k <= r; k++) wts.push(Math.exp(-k * k / (2 * sigma * sigma)));
  for (let i = 0; i < n2; i++) {
    let ws = 0;
    const acc = [0, 0, 0, 0];
    for (let k = -r; k <= r; k++) {
      const j = Math.max(0, Math.min(n2 - 1, i + k));
      const w = wts[k + r];
      ws += w;
      for (let c2 = 0; c2 < 4; c2++) acc[c2] += d.path[j * 4 + c2] * w;
    }
    for (let c2 = 0; c2 < 4; c2++) out[i * 4 + c2] = acc[c2] / ws;
  }
  return out;
}
function correction(d, sm, i, position) {
  const C = camera(d.path, i, position, d.w, d.h);
  const S = camera(sm, i, position, d.w, d.h);
  return mul3(C, inv3(S) ?? I3);
}
function autoZoom(d, sm, position) {
  const n2 = d.path.length / 4;
  const hw = d.w / 2;
  const hh = d.h / 2;
  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh]
  ];
  let need = 1;
  const step = Math.max(1, Math.floor(n2 / 600));
  for (let i = 0; i < n2; i += step) {
    const M = correction(d, sm, i, position);
    let lo = 1;
    let hi = 3;
    const fits = (z) => corners.every(([x, y]) => {
      const [u, v2] = apply3(M, x / z, y / z);
      return Math.abs(u) <= hw + 1e-6 && Math.abs(v2) <= hh + 1e-6;
    });
    if (fits(need)) continue;
    if (!fits(hi)) {
      need = hi;
      continue;
    }
    lo = need;
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    need = Math.max(need, hi);
  }
  return Math.min(3, need);
}
function stabWarp(d, mediaTime2, opts) {
  if (!d || d.path.length < 8) return null;
  const key = `${opts.smoothness}|${opts.position}|${opts.lock}`;
  let byKey = stabCache.get(d);
  if (!byKey) {
    byKey = /* @__PURE__ */ new Map();
    stabCache.set(d, byKey);
  }
  let sm = byKey.get(key);
  if (!sm) {
    const s = smooth(d, opts.smoothness, opts.lock);
    sm = { s, zoom: autoZoom(d, s, opts.position) };
    byKey.set(key, sm);
  }
  const n2 = d.path.length / 4;
  const i = Math.max(0, Math.min(n2 - 1, Math.round((mediaTime2 - d.s0) * d.fps)));
  const z = (opts.crop ? sm.zoom : 1) * Math.max(0.01, opts.extraScale / 100);
  const U = [d.w, 0, -d.w / 2, 0, d.h, -d.h / 2, 0, 0, 1];
  const Ui = inv3(U);
  const M = mul3(Ui, mul3(correction(d, sm.s, i, opts.position), mul3(scale3(1 / z), U)));
  return colMajor(M);
}
const BLEND_IDS = { normal: 0, add: 1, screen: 2, multiply: 3, overlay: 4, softLight: 5, lighten: 6, darken: 7, difference: 8 };
const MATTE_IDS = { alpha: 1, alphaInverted: 2, luma: 3, lumaInverted: 4 };
const MAX_LAYER_PX = 4096;
const MAX_PAD = 600;
const TIME_ONLY = /* @__PURE__ */ new Set(["posterizeTime"]);
class Program {
  constructor(gl, vs, fs) {
    this.gl = gl;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader error: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "a_uv");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Program error: ${gl.getProgramInfoLog(p)}`);
    this.p = p;
  }
  gl;
  p;
  locs = /* @__PURE__ */ new Map();
  loc(n2) {
    if (!this.locs.has(n2)) this.locs.set(n2, this.gl.getUniformLocation(this.p, n2));
    return this.locs.get(n2);
  }
  use() {
    this.gl.useProgram(this.p);
    return this;
  }
  f(n2, ...v2) {
    const l = this.loc(n2);
    if (!l) return this;
    const g = this.gl;
    if (v2.length === 1) g.uniform1f(l, v2[0]);
    else if (v2.length === 2) g.uniform2f(l, v2[0], v2[1]);
    else if (v2.length === 3) g.uniform3f(l, v2[0], v2[1], v2[2]);
    else g.uniform4f(l, v2[0], v2[1], v2[2], v2[3]);
    return this;
  }
  i(n2, v2) {
    const l = this.loc(n2);
    if (l) this.gl.uniform1i(l, typeof v2 === "boolean" ? v2 ? 1 : 0 : v2);
    return this;
  }
  /** One mat3, or an array of them (column-major, concatenated). */
  m3(n2, m) {
    const l = this.loc(n2);
    if (l) this.gl.uniformMatrix3fv(l, false, m);
    return this;
  }
}
const FULL = new Float32Array([2, 0, 0, 0, 2, 0, -1, -1, 1]);
const ID3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
function keyThresholds(tolerance, softness) {
  const hi = 0.75 - tolerance / 100 * 0.7;
  const lo = hi - (0.02 + softness / 100 * 0.6);
  return { lo, hi };
}
function wheelOffset(hueDeg, sat) {
  const h = (hueDeg % 360 + 360) % 360 / 360;
  const k = [1, 2 / 3, 1 / 3];
  const c2 = k.map((kk) => Math.min(1, Math.max(0, Math.abs((h + kk) % 1 * 6 - 3) - 1)));
  const y = 0.2126 * c2[0] + 0.7152 * c2[1] + 0.0722 * c2[2];
  const s = sat / 100 * 0.25;
  return [(c2[0] - y) * s, (c2[1] - y) * s, (c2[2] - y) * s];
}
function erf(x) {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const phi = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
function isIdentityCurve(c2) {
  const p = parseCurve(c2);
  return p.length === 2 && Math.abs(p[0][0]) < 1e-4 && Math.abs(p[0][1]) < 1e-4 && Math.abs(p[1][0] - 1) < 1e-4 && Math.abs(p[1][1] - 1) < 1e-4;
}
function pixelEffects(effects) {
  return effects.filter((e2) => e2.enabled && isEffectType(e2.type) && effectDef(e2.type).kind === "video" && !TIME_ONLY.has(e2.type));
}
class Compositor {
  constructor(canvas2) {
    this.canvas = canvas2;
    const gl = canvas2.getContext("webgl2", {
      alpha: false,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance"
    });
    if (!gl) throw new Error("WebGL2 is not available. Check your GPU drivers.");
    this.gl = gl;
    this.floatBuffers = !!gl.getExtension("EXT_color_buffer_float");
    gl.getExtension("OES_texture_float_linear");
    this.norm16 = !!gl.getExtension("EXT_texture_norm16");
    this.base = {
      src: new Program(gl, VERT, SRC_PASS),
      composite: new Program(gl, VERT, COMPOSITE),
      output: new Program(gl, VERT, OUTPUT),
      fill: new Program(gl, VERT, FILL),
      rectClip: new Program(gl, VERT, RECT_CLIP)
    };
    const vao = gl.createVertexArray();
    this.vao = vao;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.dummy2D = this.newTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    this.dummy3D = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, this.dummy3D);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  }
  canvas;
  gl;
  floatBuffers;
  norm16;
  base;
  progs = /* @__PURE__ */ new Map();
  vao;
  pool = /* @__PURE__ */ new Map();
  textures = /* @__PURE__ */ new Map();
  luts = /* @__PURE__ */ new Map();
  curves = /* @__PURE__ */ new Map();
  masks = /* @__PURE__ */ new Map();
  echoes = /* @__PURE__ */ new Map();
  dummy2D;
  dummy3D;
  frameNo = 0;
  lastFrame = null;
  lastLinear = false;
  warned = /* @__PURE__ */ new Set();
  /** Bump when web fonts finish loading so titles re-rasterise. */
  fontEpoch = 0;
  onWarning = () => {
  };
  // ---------- resources ----------
  warnOnce(key, msg) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.onWarning(msg);
  }
  /** Lazily compiled program (effects, generators, transitions, helpers). */
  prog(key, fs) {
    const hit = this.progs.get(key);
    if (hit === "error") return null;
    if (hit) return hit;
    if (!fs) return null;
    try {
      const p = new Program(this.gl, VERT, fs);
      this.progs.set(key, p);
      return p;
    } catch (e2) {
      this.progs.set(key, "error");
      this.warnOnce("prog:" + key, `${key}: ${e2.message}`);
      return null;
    }
  }
  helper(name) {
    return this.prog("helper:" + name, FX_HELPERS[name]);
  }
  newTex(filter = this.gl.LINEAR) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  acquire(w, h, fmt) {
    const gl = this.gl;
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const f = fmt ?? (this.floatBuffers ? gl.RGBA16F : gl.RGBA8);
    const k = `${w}x${h}x${f}`;
    const list = this.pool.get(k);
    const rt = list?.pop();
    if (rt) return rt;
    const tex = this.newTex();
    if (f === gl.RGBA16F) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else if (f === gl.RGBA32F) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo, w, h, fmt: f };
  }
  release(rt) {
    if (!rt) return;
    const k = `${rt.w}x${rt.h}x${rt.fmt}`;
    const list = this.pool.get(k) ?? [];
    list.push(rt);
    this.pool.set(k, list);
  }
  /** Drop pooled buffers (e.g. after the preview size changes). */
  trimPool() {
    const gl = this.gl;
    for (const list of this.pool.values())
      for (const rt of list) {
        gl.deleteFramebuffer(rt.fbo);
        gl.deleteTexture(rt.tex);
      }
    this.pool.clear();
  }
  bindTarget(rt, w, h) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, rt ? rt.fbo : null);
    gl.viewport(0, 0, rt ? rt.w : w, rt ? rt.h : h);
  }
  draw() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  bind(unit, tex, target = this.gl.TEXTURE_2D) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target, tex);
    gl.activeTexture(gl.TEXTURE0);
  }
  clear(rt, r = 0, g = 0, b2 = 0, a2 = 0) {
    const gl = this.gl;
    this.bindTarget(rt);
    gl.disable(gl.BLEND);
    gl.clearColor(r, g, b2, a2);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  /** Copy a buffer (optionally upside down). */
  copy(src, flip = false) {
    const gl = this.gl;
    const out = this.acquire(src.w, src.h, src.fmt);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, out.fbo);
    if (flip) gl.blitFramebuffer(0, 0, src.w, src.h, 0, src.h, src.w, 0, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    else gl.blitFramebuffer(0, 0, src.w, src.h, 0, 0, src.w, src.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    return out;
  }
  upload(key, src) {
    const gl = this.gl;
    let t = this.textures.get(key);
    if (!t) {
      t = { tex: this.newTex(), w: 0, h: 0, used: this.frameNo };
      this.textures.set(key, t);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if ("data" in src && (src.data instanceof Uint8Array || src.data instanceof Uint16Array)) {
      const raw = src;
      const sixteen = raw.data instanceof Uint16Array;
      if (sixteen && !this.norm16) throw new Error("16-bit textures are not supported on this GPU");
      const ifmt = sixteen ? 32859 : gl.RGBA8;
      const type = sixteen ? gl.UNSIGNED_SHORT : gl.UNSIGNED_BYTE;
      if (t.w === raw.width && t.h === raw.height && t.key === (sixteen ? "u16" : "u8")) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, raw.width, raw.height, gl.RGBA, type, raw.data);
      else gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, raw.width, raw.height, 0, gl.RGBA, type, raw.data);
      t.w = raw.width;
      t.h = raw.height;
      t.key = sixteen ? "u16" : "u8";
    } else {
      const s = src;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      t.w = s.videoWidth || s.naturalWidth || s.width || 1;
      t.h = s.videoHeight || s.naturalHeight || s.height || 1;
    }
    t.used = this.frameNo;
    return t;
  }
  lutTex(path, provider) {
    const hit = this.luts.get(path);
    if (hit === "error") return null;
    if (hit) return hit;
    const text = provider.lut(path);
    if (!text) return null;
    try {
      const lut = parseCube(text);
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, tex);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, p, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB16F, lut.size, lut.size, lut.size, 0, gl.RGB, gl.FLOAT, lut.data);
      const v2 = { tex, size: lut.size };
      this.luts.set(path, v2);
      return v2;
    } catch (e2) {
      this.luts.set(path, "error");
      this.onWarning(`LUT ${path.split("/").pop()}: ${e2.message}`);
      return null;
    }
  }
  /** Forget a LUT so it is reloaded (e.g. after the file changes). */
  forgetLut(path) {
    const v2 = this.luts.get(path);
    if (v2 && v2 !== "error") this.gl.deleteTexture(v2.tex);
    this.luts.delete(path);
  }
  curveTex(curve) {
    let t = this.curves.get(curve);
    if (t) return t;
    const gl = this.gl;
    t = this.newTex();
    const table = curveTable(parseCurve(curve));
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, table.length, 1, 0, gl.RED, gl.FLOAT, table);
    this.curves.set(curve, t);
    return t;
  }
  /** A Subject Key matte as a one-channel texture (kept while it keeps being used). */
  matteTex(d, index, provider) {
    const key = `matte:${d.file}:${index}`;
    const hit = this.textures.get(key);
    if (hit) {
      hit.used = this.frameNo;
      return hit.tex;
    }
    const px = provider.matte?.(d, index);
    if (!px || px.length < d.w * d.h * 2) return null;
    const gl = this.gl;
    const tex = this.newTex();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, d.w, d.h, 0, gl.RG, gl.UNSIGNED_BYTE, px);
    this.textures.set(key, { tex, w: d.w, h: d.h, used: this.frameNo });
    return tex;
  }
  imageTex(path, provider) {
    const key = "image:" + path;
    const hit = this.textures.get(key);
    if (hit) {
      hit.used = this.frameNo;
      return hit.tex;
    }
    const img = provider.image?.(path);
    if (!img) return null;
    return this.upload(key, img).tex;
  }
  /** Free textures for layers that disappeared. */
  gc() {
    for (const [k, t] of this.textures) {
      if (this.frameNo - t.used > 90) {
        this.gl.deleteTexture(t.tex);
        this.textures.delete(k);
      }
    }
    for (const [k, m] of this.masks) {
      if (this.frameNo - m.used > 90) {
        this.gl.deleteTexture(m.tex);
        this.masks.delete(k);
      }
    }
    for (const [k, h] of this.echoes) {
      if (this.frameNo - h.used > 90) {
        for (const rt of h.frames.values()) this.release(rt);
        this.echoes.delete(k);
      }
    }
    if (this.curves.size > 64) {
      for (const t of this.curves.values()) this.gl.deleteTexture(t);
      this.curves.clear();
    }
  }
  dropTexture(key) {
    const t = this.textures.get(key);
    if (t) {
      this.gl.deleteTexture(t.tex);
      this.textures.delete(key);
    }
  }
  /** Forget frame history (echo) — e.g. before an export starts. */
  resetHistory() {
    for (const h of this.echoes.values()) for (const rt of h.frames.values()) this.release(rt);
    this.echoes.clear();
  }
  // ---------- sources ----------
  sourceFor(l, provider, ppx, geomScale) {
    const seq = l.seq.settings;
    if (l.kind === "media") {
      const px = provider.media(l);
      let t;
      if (px) t = this.upload(l.key, px);
      else t = this.textures.get(l.key);
      if (!t || !t.w) return null;
      t.used = this.frameNo;
      const c2 = layerContentSize(l);
      return { tex: t.tex, w: t.w, h: t.h, premul: false, linear: false, content: fitSize(c2.w || t.w, c2.h || t.h, seq) };
    }
    if (l.kind === "sequence" && l.child) {
      const cs = l.child.seq.settings;
      const fit = fitSize(cs.width, cs.height, seq);
      const k = Math.min(1, Math.max(0.05, ppx * geomScale * fit.w / cs.width));
      const rt = this.renderSequence(l.child.layers, l.child.seq, provider, { ppx: k, flipY: true, transparent: true }, true);
      return { tex: rt.tex, w: rt.w, h: rt.h, premul: true, linear: cs.linearBlend, content: fit, rt };
    }
    if (l.kind === "solid" && l.clip.source.kind === "solid") {
      const key = "solid:" + l.clip.source.color;
      let t = this.textures.get(l.key);
      if (!t || t.key !== key) {
        const [r, g, b2] = hexToRgb(l.clip.source.color);
        t = this.upload(l.key, { data: new Uint8Array([r * 255, g * 255, b2 * 255, 255]), width: 1, height: 1 });
        t.key = key;
      }
      t.used = this.frameNo;
      return { tex: t.tex, w: Math.max(1, Math.round(seq.width * ppx)), h: Math.max(1, Math.round(seq.height * ppx)), premul: false, linear: false, content: { w: seq.width, h: seq.height } };
    }
    if (l.kind === "generator" && l.clip.source.kind === "generator") {
      const gsrc = l.clip.source;
      const prog = this.prog("gen:" + gsrc.gen, GEN_SHADERS[gsrc.gen]);
      if (!prog) return null;
      const k = Math.min(MAX_LAYER_PX / seq.width, Math.max(0.02, ppx * Math.max(0.05, geomScale)));
      const w = Math.max(8, Math.min(MAX_LAYER_PX, Math.round(seq.width * k)));
      const h = Math.max(8, Math.min(MAX_LAYER_PX, Math.round(w * seq.height / seq.width)));
      const rt = this.acquire(w, h);
      this.bindTarget(rt);
      this.gl.disable(this.gl.BLEND);
      prog.use().m3("u_mat", FULL).f("u_size", w, h).f("u_ppx", w / seq.width).f("u_time", l.src);
      let defs = [];
      try {
        defs = generatorDef(gsrc.gen).params;
      } catch {
      }
      let unit = 2;
      this.bindParams(prog, defs, gsrc.params, l.src, () => unit++);
      this.draw();
      return { tex: rt.tex, w, h, premul: true, linear: false, content: { w: seq.width, h: seq.height }, rt };
    }
    if (l.kind === "text" && l.clip.source.kind === "text" || l.kind === "shape" && l.clip.source.kind === "shape") {
      const scale = Math.min(4, Math.max(0.1, ppx * geomScale));
      const gk = generatorKey(l.clip, l.src, scale) + "#" + this.fontEpoch;
      let t = this.textures.get(l.key);
      if (!t || t.key !== gk || !t.raster) {
        const r = l.clip.source.kind === "text" ? rasterText(l.clip.source.props, scale) : rasterShape(l.clip.source.props, l.src, scale);
        t = this.upload(l.key, r.canvas);
        t.key = gk;
        t.raster = r;
      }
      t.used = this.frameNo;
      return { tex: t.tex, w: t.w, h: t.h, premul: false, linear: false, content: { w: t.raster.w, h: t.raster.h } };
    }
    return null;
  }
  /** Content size (sequence px) for picking without rendering. */
  contentSize(l) {
    const seq = l.seq.settings;
    const c2 = layerContentSize(l);
    if (c2.fit) return fitSize(c2.w, c2.h, seq);
    if (l.kind === "solid" || l.kind === "generator" || l.kind === "adjustment" || l.kind === "pair") return { w: seq.width, h: seq.height };
    const t = this.textures.get(l.key);
    if (t?.raster) return { w: t.raster.w, h: t.raster.h };
    if (l.clip.source.kind === "text") {
      const r = rasterText(l.clip.source.props, 0.1);
      return { w: r.w, h: r.h };
    }
    if (l.clip.source.kind === "shape") {
      const r = rasterShape(l.clip.source.props, l.src, 0.1);
      return { w: r.w, h: r.h };
    }
    return { w: 0, h: 0 };
  }
  geomOf(l) {
    if (l.kind === "adjustment" || l.kind === "pair") return this.fullGeom(l);
    return resolveGeom(l.clip.transform, l.src, this.contentSize(l), l.seq.settings, { offset: l.trans.offset, scaleMul: l.trans.scaleMul });
  }
  fullGeom(l) {
    const s = l.seq.settings;
    const g = resolveGeom(l.clip.transform, l.src, { w: s.width, h: s.height }, s);
    return { cx: s.width / 2, cy: s.height / 2, sx: 1, sy: 1, rot: 0, ax: 0, ay: 0, w: s.width, h: s.height, opacity: l.kind === "pair" ? 1 : g.opacity };
  }
  /** Rasterised mask for a layer at the given content resolution, or null. */
  maskFor(l, w, h, mppx) {
    const c2 = l.clip;
    if (!c2.masks.some((m) => m.enabled && m.closed)) return null;
    const gl = this.gl;
    const mw = Math.max(1, Math.min(2048, Math.round(w)));
    const mh = Math.max(1, Math.min(2048, Math.round(mw * h / Math.max(1, w))));
    const scale = mppx * mw / Math.max(1, w);
    const mk = maskKey(c2.masks, l.src, mw, mh, scale);
    let mt = this.masks.get(l.key);
    if (!mt || mt.key !== mk) {
      const cv = rasterMasks(c2.masks, l.src, mw, mh, scale);
      if (cv) {
        const tex = mt?.tex ?? this.newTex();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
        mt = { tex, key: mk, used: this.frameNo };
        this.masks.set(l.key, mt);
      }
    }
    if (!mt) return null;
    mt.used = this.frameNo;
    return mt.tex;
  }
  // ---------- parameter binding ----------
  /** Bind effect/generator params as p_<key> uniforms (curves as t_/c_ textures). */
  bindParams(pr, defs, params, t, nextUnit) {
    for (const d of defs) {
      const u = "p_" + d.key;
      switch (d.kind) {
        case "number":
          pr.f(u, pnum(params, defs, d.key, t));
          break;
        case "color": {
          const [r, g, b2] = hexToRgb(pstr(params, defs, d.key) || "#000000");
          pr.f(u, r, g, b2);
          break;
        }
        case "bool":
          pr.i(u, pbool(params, defs, d.key));
          break;
        case "enum": {
          const v2 = pstr(params, defs, d.key);
          pr.i(u, Math.max(0, d.options.findIndex((o) => o[0] === v2)));
          break;
        }
        case "curve": {
          if (!pr.loc("t_" + d.key)) break;
          const cs = pstr(params, defs, d.key);
          const unit = nextUnit();
          this.bind(unit, this.curveTex(cs || "0,0;1,1"));
          pr.i("t_" + d.key, unit).i("c_" + d.key, !!cs && !isIdentityCurve(cs));
          break;
        }
      }
    }
  }
  bindTransitionParams(pr, tr2) {
    const def = transitionDef(tr2.type);
    for (const d of def.params) {
      const v2 = tr2.params[d.key] ?? d.default;
      const u = "p_" + d.key;
      if (d.kind === "number") pr.f(u, Number(v2));
      else if (d.kind === "bool") pr.f(u, Number(v2) > 0.5 ? 1 : 0);
      else if (d.kind === "enum") pr.i(u, Math.max(0, d.options.findIndex((o) => o[0] === String(v2))));
      else if (d.kind === "color") {
        const [r, g, b2] = hexToRgb(String(v2));
        pr.f(u, r, g, b2);
      }
    }
  }
  // ---------- effect passes ----------
  rectUv(x) {
    const PW = x.W + 2 * x.P;
    const PH = x.H + 2 * x.P;
    return [x.P / PW, x.P / PH, x.W / PW, x.H / PH];
  }
  /** Texel-centre clamp rect of the content (x0, y0, x1, y1). */
  clampRect(x) {
    const PW = x.W + 2 * x.P;
    const PH = x.H + 2 * x.P;
    return [(x.P + 0.5) / PW, (x.P + 0.5) / PH, (x.P + x.W - 0.5) / PW, (x.P + x.H - 0.5) / PH];
  }
  /** Zero everything outside the content rect (after edge-repeating passes). */
  rectClip(cur, x) {
    if (x.P <= 0) return cur;
    const PW = x.W + 2 * x.P;
    const PH = x.H + 2 * x.P;
    const out = this.acquire(cur.w, cur.h);
    this.bindTarget(out);
    this.gl.disable(this.gl.BLEND);
    this.base.rectClip.use().m3("u_mat", FULL).i("u_src", 0).f("u_keep", x.P / PW, x.P / PH, (x.P + x.W) / PW, (x.P + x.H) / PH);
    this.bind(0, cur.tex);
    this.draw();
    this.release(cur);
    return out;
  }
  /** One full-buffer pass of an effect program with the standard FX_HEAD uniforms bound. */
  fxPass(pr, cur, x, e2, clampEdge, extra) {
    const gl = this.gl;
    const out = this.acquire(cur.w, cur.h);
    this.bindTarget(out);
    gl.disable(gl.BLEND);
    pr.use().m3("u_mat", FULL).i("u_src", 0).f("u_size", cur.w, cur.h).f("u_rect", ...this.rectUv(x));
    pr.i("u_linear", x.linear).i("u_clampEdge", clampEdge || x.clampAll).f("u_time", x.t).f("u_ppx", x.ppx);
    let unit = 2;
    const next = () => {
      const u = unit++;
      return u === 4 ? unit++ : u;
    };
    if (e2) this.bindParams(pr, effectDef(e2.type).params, e2.params, x.t, next);
    extra?.(pr, next);
    this.bind(0, cur.tex);
    this.draw();
    return out;
  }
  blurRT(src, sigmaPx, dir, clamp) {
    const pr = this.helper("blur");
    if (!pr) return this.copy(src);
    const gl = this.gl;
    gl.disable(gl.BLEND);
    let cur = src;
    const passes = dir === "h" ? [[1, 0]] : dir === "v" ? [[0, 1]] : [
      [1, 0],
      [0, 1]
    ];
    for (const [dx, dy] of passes) {
      const step = Math.max(1, sigmaPx * 3 / 48);
      const taps = Math.min(48, Math.ceil(sigmaPx * 3 / step));
      const out = this.acquire(cur.w, cur.h);
      this.bindTarget(out);
      pr.use().m3("u_mat", FULL).i("u_src", 0).f("u_dir", dx * step / cur.w, dy * step / cur.h).f("u_sigma", sigmaPx / step).f("u_taps", taps);
      pr.i("u_clampOn", !!clamp).f("u_clampRect", ...clamp ?? [0, 0, 1, 1]);
      this.bind(0, cur.tex);
      this.draw();
      if (cur !== src) this.release(cur);
      cur = out;
    }
    return cur;
  }
  /** Extra room (buffer px, each side) an effect draws outside the content. */
  effectPad(e2, t, ppx, W, H) {
    const rep = () => bool(e2, "repeatEdges");
    switch (e2.type) {
      case "blur":
        return rep() ? 0 : num$1(e2, "radius", t) * ppx * 1.5;
      case "directionalBlur":
        return rep() ? 0 : num$1(e2, "length", t) * ppx / 2;
      case "lensBlur":
        return rep() ? 0 : num$1(e2, "radius", t) * ppx;
      case "glow":
        return num$1(e2, "radius", t) * ppx * 1.5;
      case "dropShadow":
        return num$1(e2, "distance", t) * ppx + num$1(e2, "softness", t) * ppx * 1.5;
      case "stroke":
        return str(e2, "position") === "inside" ? 0 : num$1(e2, "width", t) * ppx;
      case "matteChoker":
        return Math.max(0, -num$1(e2, "choke", t)) * ppx + num$1(e2, "softness", t) * ppx * 2;
      case "cornerPin": {
        let over = 0;
        for (const k of ["tl", "tr", "br", "bl"]) {
          const u = num$1(e2, k + "X", t) / 100;
          const v2 = num$1(e2, k + "Y", t) / 100;
          over = Math.max(over, -u * W, (u - 1) * W, -v2 * H, (v2 - 1) * H);
        }
        return over;
      }
      default:
        return 0;
    }
  }
  /** Run one effect over the layer buffer. Consumes `cur`, returns the result. */
  runEffect(e2, cur, x) {
    const t = x.t;
    const gl = this.gl;
    const replace = (out) => {
      if (!out || out === cur) return cur;
      this.release(cur);
      return out;
    };
    switch (e2.type) {
      case "blur": {
        const sigma = num$1(e2, "radius", t) * x.ppx / 2;
        if (sigma < 0.3) return cur;
        const rep = bool(e2, "repeatEdges") || x.clampAll;
        const out = replace(this.blurRT(cur, sigma, str(e2, "direction"), rep ? this.clampRect(x) : null));
        return rep ? this.rectClip(out, x) : out;
      }
      case "glow": {
        const sigma = num$1(e2, "radius", t) * x.ppx / 2;
        const ex = this.helper("glowExtract");
        const comb = this.helper("combine");
        if (sigma < 0.3 || !ex || !comb) return cur;
        const bright = this.acquire(cur.w, cur.h);
        this.bindTarget(bright);
        gl.disable(gl.BLEND);
        ex.use().m3("u_mat", FULL).i("u_src", 0).f("u_threshold", num$1(e2, "threshold", t) / 100).i("u_linear", x.linear);
        this.bind(0, cur.tex);
        this.draw();
        const bl = this.blurRT(bright, sigma, "both", x.clampAll ? this.clampRect(x) : null);
        this.release(bright);
        const out = this.acquire(cur.w, cur.h);
        this.bindTarget(out);
        let [r, g, b2] = hexToRgb(str(e2, "tint"));
        if (x.linear) [r, g, b2] = [r, g, b2].map((v2) => Math.pow(v2, 2.2));
        comb.use().m3("u_mat", FULL).i("u_base", 0).i("u_fx", 2).i("u_mode", 0).f("u_color", r, g, b2).f("u_amount", num$1(e2, "intensity", t) / 100).f("u_offset", 0, 0);
        this.bind(2, bl.tex);
        this.bind(0, cur.tex);
        this.draw();
        this.release(bl);
        return replace(out);
      }
      case "dropShadow": {
        const comb = this.helper("combine");
        if (!comb) return cur;
        const sigma = num$1(e2, "softness", t) * x.ppx / 2;
        const dist = num$1(e2, "distance", t) * x.ppx;
        const bl = sigma > 0.3 ? this.blurRT(cur, sigma, "both", null) : cur;
        const out = this.acquire(cur.w, cur.h);
        this.bindTarget(out);
        gl.disable(gl.BLEND);
        const ang = num$1(e2, "angle", t) * Math.PI / 180;
        const ox = Math.sin(ang) * dist / cur.w;
        const oy = -Math.cos(ang) * dist / cur.h;
        let [r, g, b2] = hexToRgb(str(e2, "color"));
        if (x.linear) [r, g, b2] = [r, g, b2].map((v2) => Math.pow(v2, 2.2));
        comb.use().m3("u_mat", FULL).i("u_base", 0).i("u_fx", 2).i("u_mode", 1).f("u_color", r, g, b2).f("u_amount", num$1(e2, "opacity", t) / 100).f("u_offset", ox, oy);
        this.bind(2, bl.tex);
        this.bind(0, cur.tex);
        this.draw();
        if (bl !== cur) this.release(bl);
        return replace(out);
      }
      case "lut": {
        const path = str(e2, "path");
        const lut = path ? this.lutTex(path, x.provider) : null;
        const pr = this.helper("lut");
        if (!lut || !pr) return cur;
        return replace(
          this.fxPass(pr, cur, x, e2, false, (p) => {
            this.bind(1, lut.tex, gl.TEXTURE_3D);
            p.i("u_lut", 1).f("u_lutSize", lut.size);
          })
        );
      }
      case "unsharpMask": {
        const pr = this.helper("unsharp");
        if (!pr) return cur;
        const sigma = Math.max(0.3, num$1(e2, "radius", t) * x.ppx / 2);
        const bl = this.blurRT(cur, sigma, "both", this.clampRect(x));
        const out = this.fxPass(pr, cur, x, e2, false, (p, next) => {
          const u = next();
          this.bind(u, bl.tex);
          p.i("u_blurred", u);
        });
        this.release(bl);
        return replace(out);
      }
      case "matteChoker": {
        const pr = this.helper("choke");
        if (!pr) return cur;
        const cpx = num$1(e2, "choke", t) * x.ppx;
        const spx = Math.max(0.5, num$1(e2, "softness", t) * x.ppx);
        const sigma = Math.max(0.7, (Math.abs(cpx) + spx) * 0.5);
        const bl = this.blurRT(cur, sigma, "both", x.clampAll ? this.clampRect(x) : null);
        const z = cpx / sigma;
        const thr = Math.min(0.995, Math.max(5e-3, Phi(z)));
        const w = Math.max(4e-3, phi(z) * spx / sigma / 2);
        const out = this.fxPass(pr, cur, x, null, false, (p, next) => {
          const u = next();
          this.bind(u, bl.tex);
          p.i("u_blurred", u).f("u_t", thr).f("u_w", w);
        });
        this.release(bl);
        return replace(out);
      }
      case "echo":
        return this.echo(e2, cur, x);
      case "transform": {
        const pr = this.prog("fx:transform", FX_SHADERS.transform);
        if (!pr) return cur;
        const shutter = num$1(e2, "shutter", t);
        const n2 = shutter > 0 ? Math.max(1, Math.min(16, Math.round(num$1(e2, "samples", t)))) : 1;
        const frameDur = Math.abs(x.l.clip.speed || 1) / Math.max(1, x.fps);
        const mats = new Float32Array(9 * 16);
        let count = 0;
        for (let i = 0; i < n2; i++) {
          const ti = n2 === 1 ? t : t + (i / (n2 - 1) - 0.5) * (shutter / 360) * frameDur;
          const s = num$1(e2, "scale", ti) / 100;
          const skew = num$1(e2, "skew", ti) * Math.PI / 180;
          const axis2 = num$1(e2, "skewAxis", ti) * Math.PI / 180;
          const rot = num$1(e2, "rotation", ti) * Math.PI / 180;
          const shear = [1, Math.tan(skew), 0, 0, 1, 0, 0, 0, 1];
          const F = mul3(translate3(num$1(e2, "posX", ti) * x.ppx, num$1(e2, "posY", ti) * x.ppx), mul3(rotate3(rot), mul3(rotate3(axis2), mul3(shear, mul3(rotate3(-axis2), scale3(s))))));
          const inv = inv3(F);
          if (!inv) continue;
          mats.set(colMajor(inv), count * 9);
          count++;
        }
        if (!count) {
          const out = this.acquire(cur.w, cur.h);
          this.clear(out);
          return replace(out);
        }
        return replace(
          this.fxPass(pr, cur, x, null, false, (p) => {
            p.m3("u_inv[0]", mats.subarray(0, count * 9)).i("u_n", count).f("u_opacity", num$1(e2, "opacity", t) / 100);
          })
        );
      }
      case "cornerPin": {
        const pr = this.prog("fx:cornerPin", FX_SHADERS.cornerPin);
        if (!pr) return cur;
        const pts = ["tl", "tr", "br", "bl"].map((k) => [num$1(e2, k + "X", t) / 100, num$1(e2, k + "Y", t) / 100]);
        const hinv = inv3(squareToQuad(pts));
        return replace(this.fxPass(pr, cur, x, null, false, (p) => p.m3("u_hinv", hinv ? colMajor(hinv) : ID3)));
      }
      case "stabilizer": {
        const pr = this.prog("fx:stabilizer", FX_SHADERS.stabilizer);
        if (!pr) return cur;
        const w = stabWarp(e2.data?.stab, x.mt, {
          smoothness: num$1(e2, "smoothness", t),
          position: str(e2, "method") === "position",
          crop: str(e2, "framing") === "crop",
          extraScale: num$1(e2, "extraScale", t),
          lock: bool(e2, "lock")
        });
        if (!w) return cur;
        return replace(this.fxPass(pr, cur, x, null, false, (p) => p.i("u_on", true).m3("u_warp", w)));
      }
      case "lumetri": {
        const pr = this.prog("fx:lumetri", FX_SHADERS.lumetri);
        if (!pr) return cur;
        return replace(
          this.fxPass(pr, cur, x, e2, false, (p) => {
            p.f("u_lmBasic1", num$1(e2, "temperature", t) / 100, num$1(e2, "tint", t) / 100, num$1(e2, "exposure", t), num$1(e2, "contrast", t) / 100);
            p.f("u_lmBasic2", num$1(e2, "highlights", t) / 100, num$1(e2, "shadows", t) / 100, num$1(e2, "whites", t) / 100, num$1(e2, "blacks", t) / 100);
            p.f("u_lmCreative", num$1(e2, "saturation", t) / 100, num$1(e2, "vibrance", t) / 100, num$1(e2, "fade", t) / 100, 0);
            const lift = wheelOffset(num$1(e2, "liftHue", t), num$1(e2, "liftSat", t));
            const gam = wheelOffset(num$1(e2, "gammaHue", t), num$1(e2, "gammaSat", t));
            const gain = wheelOffset(num$1(e2, "gainHue", t), num$1(e2, "gainSat", t));
            p.f("u_lift", lift[0], lift[1], lift[2], num$1(e2, "liftLum", t) / 100 * 0.15);
            p.f("u_gammaW", gam[0], gam[1], gam[2], num$1(e2, "gammaLum", t) / 100 * 0.5);
            p.f("u_gain", gain[0], gain[1], gain[2], num$1(e2, "gainLum", t) / 100 * 0.5);
          })
        );
      }
      case "subjectKey": {
        const pr = this.prog("fx:subjectKey", FX_SHADERS.subjectKey);
        if (!pr) return cur;
        const d = e2.data?.subject;
        const f = d ? (x.mt - d.s0) * d.fps / d.step : 0;
        const j0 = d ? Math.max(0, Math.min(d.n - 1, Math.floor(f))) : 0;
        const j1 = d ? Math.min(d.n - 1, j0 + 1) : 0;
        const ta2 = d ? this.matteTex(d, j0, x.provider) : null;
        const tb = d ? j1 === j0 ? ta2 : this.matteTex(d, j1, x.provider) ?? ta2 : null;
        const mix = d && j1 !== j0 ? Math.max(0, Math.min(1, f - j0)) : 0;
        const { lo, hi } = keyThresholds(num$1(e2, "tolerance", t), num$1(e2, "softness", t));
        return replace(
          this.fxPass(pr, cur, x, e2, false, (p, next) => {
            const ua = next();
            const ub = next();
            this.bind(ua, ta2 ?? this.dummy2D);
            this.bind(ub, tb ?? this.dummy2D);
            p.i("u_mA", ua).i("u_mB", ub).f("u_mix", mix).i("u_has", !!(d && ta2));
            p.f("u_mpx", d ? 1 / d.w : 1, d ? 1 / d.h : 1).f("u_lo", lo).f("u_hi", hi);
          })
        );
      }
      case "chromaKey": {
        const pr = this.prog("fx:chromaKey", FX_SHADERS.chromaKey);
        if (!pr) return cur;
        const { lo, hi } = keyThresholds(num$1(e2, "tolerance", t), num$1(e2, "softness", t));
        return replace(
          this.fxPass(pr, cur, x, e2, false, (p) => {
            p.f("u_lo", lo).f("u_hi", hi).f("u_choke", num$1(e2, "choke", t) / 100 * 0.9).f("u_spill", num$1(e2, "spill", t) / 100).f("u_balance", num$1(e2, "balance", t) / 100 * 2);
          })
        );
      }
      default: {
        const pr = this.prog("fx:" + e2.type, FX_SHADERS[e2.type]);
        if (!pr) return cur;
        const defs = effectDef(e2.type).params;
        const clamp = defs.some((d) => d.key === "repeatEdges") && bool(e2, "repeatEdges");
        const out = replace(this.fxPass(pr, cur, x, e2, clamp));
        return clamp ? this.rectClip(out, x) : out;
      }
    }
  }
  /** Echo / trails: combine with this layer's buffers from earlier frames. */
  echo(e2, cur, x) {
    const pr = this.helper("echo");
    if (!pr) return cur;
    const t = x.t;
    const N = Math.max(1, Math.min(8, Math.round(num$1(e2, "echoes", t))));
    const I = Math.max(1, Math.min(10, Math.round(num$1(e2, "interval", t))));
    const keep = 1 - Math.max(0, Math.min(100, num$1(e2, "decay", t))) / 100;
    const op = ["behind", "front", "add", "lighten", "screen", "blend"].indexOf(str(e2, "operator"));
    const key = x.l.key + "#" + e2.id;
    let h = this.echoes.get(key);
    if (!h) {
      h = { frames: /* @__PURE__ */ new Map(), used: this.frameNo };
      this.echoes.set(key, h);
    }
    h.used = this.frameNo;
    const f = x.frame;
    for (const [fr, rt] of h.frames) {
      if (fr >= f || fr < f - N * I || rt.w !== cur.w || rt.h !== cur.h || rt.fmt !== cur.fmt) {
        this.release(rt);
        h.frames.delete(fr);
      }
    }
    const gl = this.gl;
    let res = cur;
    for (let k = 1; k <= N; k++) {
      const prev = h.frames.get(f - k * I);
      if (!prev) continue;
      const out = this.acquire(cur.w, cur.h);
      this.bindTarget(out);
      gl.disable(gl.BLEND);
      pr.use().m3("u_mat", FULL).i("u_base", 0).i("u_prev", 2).i("u_mode", Math.max(0, op)).f("u_w", Math.pow(keep, k));
      this.bind(2, prev.tex);
      this.bind(0, res.tex);
      this.draw();
      if (res !== cur) this.release(res);
      res = out;
    }
    h.frames.set(f, this.copy(cur));
    if (res !== cur) this.release(cur);
    return res;
  }
  // ---------- layers ----------
  /**
   * Process one layer into a premultiplied buffer (padded for effects that
   * draw outside the content). Returns null if the layer has no pixels yet.
   */
  processLayer(l, provider, ppx, outLinear) {
    const gl = this.gl;
    const c2 = l.clip;
    const t = l.src;
    const effects = pixelEffects(c2.effects);
    const g0 = resolveGeom(c2.transform, t, { w: 1, h: 1 }, l.seq.settings, { scaleMul: l.trans.scaleMul });
    const src = this.sourceFor(l, provider, ppx, Math.max(Math.abs(g0.sx), Math.abs(g0.sy)));
    if (!src) return null;
    const geom = resolveGeom(c2.transform, t, src.content, l.seq.settings, { offset: l.trans.offset, scaleMul: l.trans.scaleMul });
    const shownW = src.content.w * Math.max(Math.abs(geom.sx), Math.abs(geom.sy)) * ppx;
    let W = Math.min(src.w, Math.max(8, Math.ceil(shownW * 1.05)), MAX_LAYER_PX);
    if (l.kind === "solid" || l.kind === "generator") W = Math.min(MAX_LAYER_PX, Math.max(8, Math.ceil(shownW)));
    W = Math.max(1, Math.round(W));
    const aspect = src.content.h / Math.max(1e-6, src.content.w);
    const H = Math.max(1, Math.min(MAX_LAYER_PX, Math.round(W * aspect)));
    const pxPerSeq = W / Math.max(1e-6, src.content.w);
    const transSigma = l.trans.blur * pxPerSeq / 2;
    let P = transSigma * 3;
    for (const e2 of effects) P += this.effectPad(e2, t, pxPerSeq, W, H);
    P = Math.min(MAX_PAD, Math.ceil(P));
    const PW = W + 2 * P;
    const PH = H + 2 * P;
    const mask = this.maskFor(l, W, H, pxPerSeq);
    const a2 = this.acquire(PW, PH);
    this.bindTarget(a2);
    gl.disable(gl.BLEND);
    const sp = this.base.src.use();
    sp.m3("u_mat", FULL).i("u_src", 0).i("u_mask", 3);
    sp.f("u_cmin", P / PW, P / PH).f("u_csize", W / PW, H / PH);
    sp.i("u_srcPremul", src.premul).i("u_srcLinear", src.linear).i("u_working", false).i("u_linear", outLinear).i("u_maskOn", !!mask).i("u_clampEdges", false);
    this.bind(3, mask ?? this.dummy2D);
    this.bind(0, src.tex);
    this.draw();
    if (src.rt) this.release(src.rt);
    const x = { l, t, mt: l.mt, fps: l.seq.settings.fps, frame: Math.round(l.t * l.seq.settings.fps), W, H, P, ppx: pxPerSeq, linear: outLinear, clampAll: false, provider };
    let cur = a2;
    for (const e2 of effects) cur = this.runEffect(e2, cur, x);
    if (transSigma > 0.3) {
      const out = this.blurRT(cur, transSigma, "both", null);
      this.release(cur);
      cur = out;
    }
    return { rt: cur, padX: PW / W, padY: PH / H, geom };
  }
  /** Adjustment layer: process a copy of everything below. */
  processAdjustment(frame, l, provider, opts) {
    const effects = pixelEffects(l.clip.effects);
    if (!effects.length) return null;
    const s = l.seq.settings;
    const W = frame.w;
    const H = frame.h;
    let cur = this.copy(frame, !opts.flipY);
    const x = { l, t: l.src, mt: l.mt, fps: s.fps, frame: Math.round(l.t * s.fps), W, H, P: 0, ppx: opts.ppx, linear: s.linearBlend, clampAll: true, provider };
    for (const e2 of effects) cur = this.runEffect(e2, cur, x);
    const g = this.fullGeom(l);
    return { rt: cur, mat: layerMatrix(g, s, opts.flipY), opacity: g.opacity * l.trans.opacity, blend: 10, padX: 1, padY: 1, amask: this.maskFor(l, W, H, opts.ppx) ?? void 0 };
  }
  /** Two-clip transition: render each side alone, then mix them. */
  processPair(l, provider, opts, W, H) {
    const pair = l.pair;
    const seq = l.seq;
    const side = (layer) => {
      const rt = this.acquire(W, H);
      this.clear(rt);
      return layer ? this.drawLayers(rt, [layer], seq, provider, { ...opts, flipY: true, matteKey: null }, false) : rt;
    };
    const A = side(pair.a);
    const B = side(pair.b);
    const pr = this.prog("tr:" + pair.tr.type, TRANSITION_SHADERS[pair.tr.type]);
    let out;
    if (!pr) {
      this.release(A);
      out = B;
    } else {
      out = this.acquire(W, H);
      this.bindTarget(out);
      this.gl.disable(this.gl.BLEND);
      pr.use().m3("u_mat", FULL).i("u_A", 0).i("u_B", 7).f("u_p", pair.p).f("u_res", W, H).f("u_ppx", opts.ppx).i("u_linear", seq.settings.linearBlend).f("u_time", l.t);
      this.bindTransitionParams(pr, pair.tr);
      if (pr.loc("t_pattern")) {
        const path = String(pair.tr.params.image ?? "");
        const img = path && String(pair.tr.params.pattern) === "image" ? this.imageTex(path, provider) : null;
        this.bind(2, img ?? this.dummy2D);
        pr.i("t_pattern", 2).i("u_hasPattern", !!img);
      }
      this.bind(7, B.tex);
      this.bind(0, A.tex);
      this.draw();
      this.release(A);
      this.release(B);
    }
    return { rt: out, mat: layerMatrix(this.fullGeom(l), seq.settings, opts.flipY), opacity: 1, blend: 0, padX: 1, padY: 1 };
  }
  /** The track-matte layers of `l`, rendered like a frame (transparent background). */
  renderMatte(l, provider, opts, W, H) {
    const rt = this.acquire(W, H);
    this.clear(rt);
    return this.drawLayers(rt, l.matte.layers, l.seq, provider, { ...opts, matteKey: null }, false);
  }
  /** Draw a processed layer into the frame. Returns the (possibly new) frame buffer. */
  compositeInto(frame, d, l, opts, linear, matte, matteView) {
    const gl = this.gl;
    const W = frame.w;
    const H = frame.h;
    const blendId = matteView ? 0 : d.blend;
    const needsDst = blendId !== 0;
    const target = needsDst ? this.copy(frame) : frame;
    this.bindTarget(target);
    if (needsDst || matteView) gl.disable(gl.BLEND);
    else {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
    const cp = this.base.composite.use();
    cp.m3("u_mat", d.mat).i("u_layer", 0).i("u_dst", 4).i("u_matteTex", 5).i("u_amask", 6);
    cp.f("u_viewport", W, H).i("u_blend", blendId).f("u_opacity", d.opacity).i("u_flip", opts.flipY).i("u_linear", linear).i("u_matteView", matteView);
    const dip = l.trans.dip;
    cp.i("u_dipOn", !!dip);
    if (dip) cp.f("u_dipColor", ...dip.color).f("u_dipAmt", dip.amount);
    const shape = l.trans.shape;
    cp.i("u_shapeOn", !!shape);
    if (shape) {
      const kind = ["wipe", "band", "barn", "clock", "iris", "box", "diamond"].indexOf(shape.kind);
      const dir = shape.kind === "barn" ? shape.dir === "horizontal" ? 1 : 0 : Math.max(0, ["left", "right", "top", "bottom"].indexOf(shape.dir));
      cp.i("u_shapeKind", kind).i("u_shapeDir", dir).f("u_shapeP", shape.progress).f("u_shapeSoft", Math.max(1e-4, shape.softness)).f("u_bands", Math.max(1, shape.bands));
    }
    const crop = l.trans.crop;
    cp.i("u_cropOn", !!crop);
    if (crop) {
      const cminX = (1 - 1 / d.padX) / 2;
      const cminY = (1 - 1 / d.padY) / 2;
      cp.f("u_cropRect", ...crop).f("u_cmin", cminX, cminY).f("u_csize", 1 / d.padX, 1 / d.padY);
    }
    cp.i("u_matteMode", matte && l.matte ? MATTE_IDS[l.matte.mode] ?? 0 : 0);
    cp.i("u_amaskOn", !!d.amask);
    this.bind(6, d.amask ?? this.dummy2D);
    this.bind(5, matte ? matte.tex : this.dummy2D);
    this.bind(4, needsDst ? frame.tex : this.dummy2D);
    this.bind(0, d.rt.tex);
    this.draw();
    gl.disable(gl.BLEND);
    if (needsDst) {
      this.release(frame);
      return target;
    }
    return frame;
  }
  /** Composite layers (bottom first) into `frame`. Returns the final frame buffer. */
  drawLayers(frame, layers, seq, provider, opts, top) {
    const s = seq.settings;
    const linear = s.linearBlend;
    const matteView = top && !!opts.matteKey;
    for (const l of layers) {
      if (matteView && l.key !== opts.matteKey) continue;
      let d = null;
      if (l.kind === "adjustment") {
        if (!matteView) d = this.processAdjustment(frame, l, provider, opts);
      } else if (l.kind === "pair") {
        d = this.processPair(l, provider, opts, frame.w, frame.h);
      } else {
        const proc = this.processLayer(l, provider, opts.ppx, linear);
        if (proc) {
          d = {
            rt: proc.rt,
            mat: layerMatrix(proc.geom, s, opts.flipY, proc.padX, proc.padY),
            opacity: proc.geom.opacity * l.trans.opacity,
            blend: l.trans.blend ?? BLEND_IDS[l.clip.blendMode] ?? 0,
            padX: proc.padX,
            padY: proc.padY
          };
        }
      }
      if (!d) continue;
      const matte = l.matte && !matteView ? this.renderMatte(l, provider, opts, frame.w, frame.h) : null;
      frame = this.compositeInto(frame, d, l, opts, linear, matte, matteView);
      this.release(d.rt);
      this.release(matte);
    }
    return frame;
  }
  // ---------- sequences ----------
  /**
   * Render a sequence into a new buffer of size settings × ppx.
   * The caller releases it. `nested` keeps the background transparent.
   */
  renderSequence(layers, seq, provider, opts, nested = false) {
    const s = seq.settings;
    const W = Math.max(1, Math.round(s.width * opts.ppx));
    const H = Math.max(1, Math.round(s.height * opts.ppx));
    const frame = this.acquire(W, H);
    const linear = s.linearBlend;
    const matte = !nested && !!opts.matteKey;
    if (nested || opts.transparent || matte) this.clear(frame, 0, 0, 0, matte ? 1 : 0);
    else {
      let [r, g, b2] = hexToRgb(s.background || "#000000");
      if (linear) [r, g, b2] = [r, g, b2].map((x) => Math.pow(x, 2.2));
      this.clear(frame, r, g, b2, 1);
    }
    return this.drawLayers(frame, layers, seq, provider, nested ? { ...opts, matteKey: null } : opts, !nested);
  }
  outputPass(frame, target, w, h, linear, scale = 1, unpremul = false) {
    const gl = this.gl;
    this.bindTarget(target, w, h);
    gl.disable(gl.BLEND);
    this.base.output.use().m3("u_mat", FULL).i("u_src", 0).i("u_toGamma", linear).i("u_unpremul", unpremul).f("u_scale", scale);
    this.bind(0, frame.tex);
    this.draw();
  }
  beginFrame() {
    this.frameNo++;
    this.release(this.lastFrame);
    this.lastFrame = null;
  }
  endFrame(frame, linear) {
    this.lastFrame = frame;
    this.lastLinear = linear;
    if (this.frameNo % 30 === 0) this.gc();
  }
  /** Preview: render a sequence onto the canvas. */
  renderToCanvas(layers, seq, provider, ppx, matteKey = null) {
    this.beginFrame();
    const W = Math.max(1, Math.round(seq.settings.width * ppx));
    const H = Math.max(1, Math.round(seq.settings.height * ppx));
    if (this.canvas.width !== W) this.canvas.width = W;
    if (this.canvas.height !== H) this.canvas.height = H;
    const frame = this.renderSequence(layers, seq, provider, { ppx, flipY: false, matteKey });
    this.outputPass(frame, null, W, H, seq.settings.linearBlend);
    this.endFrame(frame, seq.settings.linearBlend);
  }
  /**
   * Export: render a frame and read it back, rows top-first.
   * bits 8 → RGBA bytes; bits 16 → RGBA 16-bit (rgba64le).
   * `discard` renders (to advance frame history) without reading back.
   */
  renderForExport(layers, seq, provider, outW, outH, bits, transparent = false, discard = false) {
    const gl = this.gl;
    this.beginFrame();
    const ppx = outW / seq.settings.width;
    const frame = this.renderSequence(layers, seq, provider, { ppx, flipY: true, transparent });
    let result;
    if (discard) result = new Uint8Array(0);
    else if (bits === 16 && this.floatBuffers) {
      const rt = this.acquire(outW, outH, gl.RGBA32F);
      this.outputPass(frame, rt, outW, outH, seq.settings.linearBlend, 65535, transparent);
      const f = new Float32Array(outW * outH * 4);
      gl.readPixels(0, 0, outW, outH, gl.RGBA, gl.FLOAT, f);
      const u = new Uint16Array(f.length);
      u.set(f);
      this.release(rt);
      result = u;
    } else {
      const rt = this.acquire(outW, outH, gl.RGBA8);
      this.outputPass(frame, rt, outW, outH, seq.settings.linearBlend, 1, transparent);
      const b2 = new Uint8Array(outW * outH * 4);
      gl.readPixels(0, 0, outW, outH, gl.RGBA, gl.UNSIGNED_BYTE, b2);
      this.release(rt);
      result = b2;
    }
    this.endFrame(frame, seq.settings.linearBlend);
    return result;
  }
  /** Small RGBA8 copy of the last frame for scopes (rows bottom-first for the preview). */
  readScopes(w, h) {
    if (!this.lastFrame) return null;
    const gl = this.gl;
    const rt = this.acquire(w, h, gl.RGBA8);
    this.outputPass(this.lastFrame, rt, w, h, this.lastLinear);
    const b2 = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b2);
    this.release(rt);
    return b2;
  }
  /** GL error check (tests). */
  glError() {
    return this.gl.getError();
  }
}
const KNOWN = [
  [24e3 / 1001, "24000/1001"],
  [3e4 / 1001, "30000/1001"],
  [6e4 / 1001, "60000/1001"],
  [24, "24"],
  [25, "25"],
  [30, "30"],
  [48, "48"],
  [50, "50"],
  [60, "60"]
];
function fpsRational(fps) {
  for (const [v2, s] of KNOWN) if (Math.abs(v2 - fps) < 2e-3) return s;
  return String(Math.round(fps * 1e3) / 1e3);
}
function snapFps(fps) {
  for (const [v2] of KNOWN) if (Math.abs(v2 - fps) < 0.01) return v2;
  return fps;
}
function fpsLabel(fps) {
  const r = Math.round(fps * 1e3) / 1e3;
  return Number.isInteger(r) ? String(r) : r.toFixed(3);
}
const FPS_CHOICES = [24e3 / 1001, 24, 25, 3e4 / 1001, 30, 50, 6e4 / 1001, 60];
const SAMPLE_RATE = 48e3;
function atempoChain(speed) {
  const out = [];
  let s = speed;
  while (s > 2) {
    out.push("atempo=2");
    s /= 2;
  }
  while (s < 0.5) {
    out.push("atempo=0.5");
    s /= 0.5;
  }
  if (Math.abs(s - 1) > 1e-6) out.push(`atempo=${s.toFixed(6)}`);
  return out;
}
function decodeVideoArgs(o) {
  const args = ["-hide_banner", "-loglevel", "error", "-nostdin"];
  if (o.gpu) args.push("-hwaccel", "cuda");
  if (!o.image) args.push("-ss", Math.max(0, o.s0).toFixed(6));
  args.push("-i", o.path);
  const pix = o.bits === 16 ? "rgba64le" : "rgba";
  if (o.image) {
    args.push("-frames:v", "1", "-vf", `scale=${o.w}:${o.h}:flags=lanczos,format=${pix}`);
  } else {
    args.push("-t", ((o.dur + 2 / o.fps) * o.speed).toFixed(6));
    const sp = Math.abs(o.speed - 1) > 1e-6 ? `setpts=(PTS-STARTPTS)/${o.speed.toFixed(6)},` : "";
    args.push("-vf", `${sp}fps=${fpsRational(o.fps)},scale=${o.w}:${o.h}:flags=bicubic,format=${pix}`);
  }
  args.push("-an", "-sn", "-f", "rawvideo", "-pix_fmt", pix, "pipe:1");
  return args;
}
function decodeAudioArgs(path, s0, speed, dur) {
  const af = ["aresample=" + SAMPLE_RATE, "aformat=sample_fmts=flt:channel_layouts=stereo", ...atempoChain(speed)];
  const lim = dur !== void 0 ? ["-t", Math.max(0, dur).toFixed(6)] : [];
  return ["-hide_banner", "-loglevel", "error", "-nostdin", "-ss", Math.max(0, s0).toFixed(6), ...lim, "-i", path, "-vn", "-sn", "-af", af.join(","), "-f", "f32le", "-ac", "2", "-ar", String(SAMPLE_RATE), "pipe:1"];
}
function presetInfo(p) {
  switch (p) {
    case "prores":
      return { ext: "mov", alpha: false, tenBit: true };
    case "prores4444":
      return { ext: "mov", alpha: true, tenBit: true };
    case "hevc_nvenc_10":
      return { ext: "mp4", alpha: false, tenBit: true };
    default:
      return { ext: "mp4", alpha: false, tenBit: false };
  }
}
function codecArgs(p, q) {
  switch (p) {
    case "h264_nvenc":
      return { args: ["-c:v", "h264_nvenc", "-preset", "p5", "-tune", "hq", "-rc", "vbr", "-cq", q, "-b:v", "0", "-profile:v", "high", "-movflags", "+faststart"], pix: "yuv420p" };
    case "hevc_nvenc":
      return { args: ["-c:v", "hevc_nvenc", "-preset", "p5", "-tune", "hq", "-rc", "vbr", "-cq", q, "-b:v", "0", "-tag:v", "hvc1", "-movflags", "+faststart"], pix: "yuv420p" };
    case "hevc_nvenc_10":
      return { args: ["-c:v", "hevc_nvenc", "-preset", "p5", "-tune", "hq", "-rc", "vbr", "-cq", q, "-b:v", "0", "-profile:v", "main10", "-tag:v", "hvc1", "-movflags", "+faststart"], pix: "p010le" };
    case "libx264":
      return { args: ["-c:v", "libx264", "-preset", "medium", "-crf", q, "-movflags", "+faststart"], pix: "yuv420p" };
    case "prores":
      return { args: ["-c:v", "prores_ks", "-profile:v", "3", "-vendor", "apl0"], pix: "yuv422p10le" };
    case "prores4444":
      return { args: ["-c:v", "prores_ks", "-profile:v", "4", "-vendor", "apl0", "-alpha_bits", "16"], pix: "yuva444p10le" };
  }
}
function encoderArgs(e2) {
  const { args: cargs, pix } = codecArgs(e2.preset, String(Math.round(e2.quality)));
  const inPix = e2.bits === 16 ? "rgba64le" : "rgba";
  const args = ["-hide_banner", "-loglevel", "error", "-y"];
  args.push("-thread_queue_size", "64", "-f", "rawvideo", "-pix_fmt", inPix, "-s", `${e2.width}x${e2.height}`, "-framerate", fpsRational(e2.fps), "-i", "pipe:0");
  args.push("-f", "f32le", "-ar", String(SAMPLE_RATE), "-ac", "2", "-i", e2.audioPath);
  const alpha = presetInfo(e2.preset).alpha;
  args.push("-map", "0:v", "-map", "1:a");
  args.push("-vf", alpha ? `format=${pix}` : `scale=out_color_matrix=bt709:out_range=tv,format=${pix}`);
  args.push(...cargs);
  args.push("-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709");
  if (e2.preset.startsWith("prores")) args.push("-c:a", "pcm_s24le");
  else args.push("-c:a", "aac", "-b:a", "320k");
  args.push("-shortest", e2.output);
  return args;
}
function audioOnlyArgs(audioPath, output) {
  const ext = output.split(".").pop()?.toLowerCase();
  const codec = ext === "wav" ? ["-c:a", "pcm_s24le"] : ext === "flac" ? ["-c:a", "flac"] : ext === "mp3" ? ["-c:a", "libmp3lame", "-b:a", "320k"] : ["-c:a", "aac", "-b:a", "320k"];
  return ["-hide_banner", "-loglevel", "error", "-y", "-f", "f32le", "-ar", String(SAMPLE_RATE), "-ac", "2", "-i", audioPath, ...codec, output];
}
const dbToLin = (db) => Math.pow(10, db / 20);
const linToDb = (x) => x > 1e-12 ? 20 * Math.log10(x) : -240;
const num = (p, k, d) => {
  const v2 = p[k];
  return typeof v2 === "number" && Number.isFinite(v2) ? v2 : typeof v2 === "string" && v2 !== "" && Number.isFinite(Number(v2)) ? Number(v2) : d;
};
const flag = (p, k) => p[k] === true || p[k] === 1;
const coef = (ms, sr) => ms <= 0 ? 0 : Math.exp(-1 / (ms / 1e3 * sr));
class Biquad {
  b0 = 1;
  b1 = 0;
  b2 = 0;
  a1 = 0;
  a2 = 0;
  z1 = [0, 0];
  z2 = [0, 0];
  key = "";
  set(type, sr, f, q, gainDb = 0) {
    const k = `${type}|${f}|${q}|${gainDb}`;
    if (k === this.key) return;
    this.key = k;
    f = Math.max(1, Math.min(sr * 0.49, f));
    q = Math.max(0.025, q);
    const w = 2 * Math.PI * f / sr;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const A = Math.pow(10, gainDb / 40);
    const alpha = sw / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    switch (type) {
      case "lowpass":
        b0 = (1 - cw) / 2;
        b1 = 1 - cw;
        b2 = (1 - cw) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case "highpass":
        b0 = (1 + cw) / 2;
        b1 = -(1 + cw);
        b2 = (1 + cw) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case "bandpass":
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case "notch":
        b0 = 1;
        b1 = -2 * cw;
        b2 = 1;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case "peaking":
        b0 = 1 + alpha * A;
        b1 = -2 * cw;
        b2 = 1 - alpha * A;
        a0 = 1 + alpha / A;
        a1 = -2 * cw;
        a2 = 1 - alpha / A;
        break;
      case "lowshelf": {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 - (A - 1) * cw + s);
        b1 = 2 * A * (A - 1 - (A + 1) * cw);
        b2 = A * (A + 1 - (A - 1) * cw - s);
        a0 = A + 1 + (A - 1) * cw + s;
        a1 = -2 * (A - 1 + (A + 1) * cw);
        a2 = A + 1 + (A - 1) * cw - s;
        break;
      }
      default: {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 + (A - 1) * cw + s);
        b1 = -2 * A * (A - 1 + (A + 1) * cw);
        b2 = A * (A + 1 + (A - 1) * cw - s);
        a0 = A + 1 - (A - 1) * cw + s;
        a1 = 2 * (A - 1 - (A + 1) * cw);
        a2 = A + 1 - (A - 1) * cw - s;
      }
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }
  /** Raw coefficients (normalised, a0 = 1). */
  setRaw(b2, a2) {
    this.b0 = b2[0];
    this.b1 = b2[1];
    this.b2 = b2[2];
    this.a1 = a2[1];
    this.a2 = a2[2];
    this.key = "raw";
  }
  tick(x, ch) {
    const y = this.b0 * x + this.z1[ch];
    this.z1[ch] = this.b1 * x - this.a1 * y + this.z2[ch];
    this.z2[ch] = this.b2 * x - this.a2 * y;
    return y;
  }
  run(buf, n2, ch) {
    const { b0, b1, b2, a1, a2 } = this;
    let z1 = this.z1[ch];
    let z2 = this.z2[ch];
    for (let i = 0; i < n2; i++) {
      const x = buf[i];
      const y = b0 * x + z1;
      z1 = b1 * x - a1 * y + z2;
      z2 = b2 * x - a2 * y;
      buf[i] = y;
    }
    this.z1[ch] = Math.abs(z1) < 1e-25 ? 0 : z1;
    this.z2[ch] = Math.abs(z2) < 1e-25 ? 0 : z2;
  }
  reset() {
    this.z1 = [0, 0];
    this.z2 = [0, 0];
  }
}
class Eq {
  constructor(sr) {
    this.sr = sr;
  }
  sr;
  f = Array.from({ length: 7 }, () => new Biquad());
  process(L, R, n2, p) {
    const bands = [];
    const [hp, ls, p1, p2, p3, hs, lp] = this.f;
    if (flag(p, "hpOn")) {
      hp.set("highpass", this.sr, num(p, "hpFreq", 80), Math.SQRT1_2);
      bands.push([hp, true]);
    }
    const lsg = num(p, "lsGain", 0);
    if (lsg !== 0) {
      ls.set("lowshelf", this.sr, num(p, "lsFreq", 120), Math.SQRT1_2, lsg);
      bands.push([ls, true]);
    }
    const peaks = [
      [p1, "p1"],
      [p2, "p2"],
      [p3, "p3"]
    ];
    for (const [b2, k] of peaks) {
      const g = num(p, k + "Gain", 0);
      if (g === 0) continue;
      b2.set("peaking", this.sr, num(p, k + "Freq", 1e3), num(p, k + "Q", 1), g);
      bands.push([b2, true]);
    }
    const hsg = num(p, "hsGain", 0);
    if (hsg !== 0) {
      hs.set("highshelf", this.sr, num(p, "hsFreq", 8e3), Math.SQRT1_2, hsg);
      bands.push([hs, true]);
    }
    if (flag(p, "lpOn")) {
      lp.set("lowpass", this.sr, num(p, "lpFreq", 16e3), Math.SQRT1_2);
      bands.push([lp, true]);
    }
    for (const [b2] of bands) {
      b2.run(L, n2, 0);
      b2.run(R, n2, 1);
    }
    const out = dbToLin(num(p, "output", 0));
    if (out !== 1)
      for (let i = 0; i < n2; i++) {
        L[i] *= out;
        R[i] *= out;
      }
  }
  reset() {
    for (const b2 of this.f) b2.reset();
  }
}
function compressorGain(xDb, thr, ratio, knee) {
  const over = xDb - thr;
  let y;
  if (2 * over < -knee) y = xDb;
  else if (knee > 0 && 2 * Math.abs(over) <= knee) y = xDb + (1 / ratio - 1) * (over + knee / 2) ** 2 / (2 * knee);
  else y = thr + over / ratio;
  return Math.min(0, y - xDb);
}
class Compressor {
  // dB gain reduction (≤ 0)
  constructor(sr) {
    this.sr = sr;
  }
  sr;
  env = 0;
  process(L, R, n2, p) {
    const thr = num(p, "threshold", -18);
    const ratio = Math.max(1, num(p, "ratio", 3));
    const knee = Math.max(0, num(p, "knee", 6));
    const at = coef(num(p, "attack", 10), this.sr);
    const rt = coef(num(p, "release", 150), this.sr);
    let makeup = num(p, "makeup", 0);
    if (flag(p, "auto")) makeup += -compressorGain(0, thr, ratio, knee) / 2;
    const mk = dbToLin(makeup);
    let env = this.env;
    for (let i = 0; i < n2; i++) {
      const x = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      const gr = compressorGain(linToDb(x), thr, ratio, knee);
      env = gr < env ? at * env + (1 - at) * gr : rt * env + (1 - rt) * gr;
      const g = dbToLin(env) * mk;
      L[i] *= g;
      R[i] *= g;
    }
    this.env = env;
  }
  reset() {
    this.env = 0;
  }
}
const TP_PHASES = [
  [0.001708984375, 0.010986328125, -0.0196533203125, 0.033203125, -0.0594482421875, 0.1373291015625, 0.97216796875, -0.102294921875, 0.047607421875, -0.026611328125, 0.014892578125, -0.00830078125],
  [-0.0291748046875, 0.029296875, -0.0517578125, 0.089111328125, -0.16650390625, 0.465087890625, 0.77978515625, -0.2003173828125, 0.1015625, -0.0582275390625, 0.0330810546875, -0.0189208984375],
  [-0.0189208984375, 0.0330810546875, -0.0582275390625, 0.1015625, -0.2003173828125, 0.77978515625, 0.465087890625, -0.16650390625, 0.089111328125, -0.0517578125, 0.029296875, -0.0291748046875],
  [-0.00830078125, 0.014892578125, -0.026611328125, 0.047607421875, -0.102294921875, 0.97216796875, 0.1373291015625, -0.0594482421875, 0.033203125, -0.0196533203125, 0.010986328125, 0.001708984375]
];
class TruePeak {
  hist = new Float32Array(12);
  pos = 0;
  /** Push a sample; returns the largest |value| among the 4 interpolated points. */
  push(x) {
    this.hist[this.pos] = x;
    this.pos = (this.pos + 1) % 12;
    let m = 0;
    for (const ph of TP_PHASES) {
      let acc = 0;
      for (let k = 0; k < 12; k++) acc += ph[k] * this.hist[(this.pos + 11 - k) % 12];
      m = Math.max(m, Math.abs(acc));
    }
    return m;
  }
  reset() {
    this.hist.fill(0);
    this.pos = 0;
  }
}
class Limiter {
  constructor(sr, truePeak = false, lookaheadMs = 5) {
    this.sr = sr;
    this.truePeak = truePeak;
    this.la = Math.max(4, Math.round(lookaheadMs / 1e3 * sr));
    this.dl = [new Float32Array(this.la), new Float32Array(this.la)];
    this.gq = new Float32Array(this.la + 1).fill(1);
    this.box = new Float64Array(this.la).fill(1);
    this.boxSum = this.la;
  }
  sr;
  truePeak;
  la;
  dl;
  gq;
  // required gain per sample, ring
  box;
  boxSum = 0;
  pos = 0;
  gpos = 0;
  env = 1;
  tp = [new TruePeak(), new TruePeak()];
  get latency() {
    return this.la;
  }
  process(L, R, n2, p) {
    const ceil = dbToLin(num(p, "ceiling", -1));
    const inG = dbToLin(num(p, "input", 0));
    const rel = coef(num(p, "release", 60), this.sr);
    const la = this.la;
    for (let i = 0; i < n2; i++) {
      const l = L[i] * inG;
      const r = R[i] * inG;
      const pk = this.truePeak ? Math.max(this.tp[0].push(l), this.tp[1].push(r), Math.abs(l), Math.abs(r)) : Math.max(Math.abs(l), Math.abs(r));
      const need = pk > ceil ? ceil / pk : 1;
      const j = this.pos;
      this.gq[this.gpos] = need;
      this.gpos = (this.gpos + 1) % (la + 1);
      let m = 1;
      for (let k = 0; k <= la; k++) if (this.gq[k] < m) m = this.gq[k];
      this.env = m < this.env ? m : rel * this.env + (1 - rel) * m;
      this.boxSum += this.env - this.box[j];
      this.box[j] = this.env;
      const g = Math.min(1, this.boxSum / la);
      const dlL = this.dl[0][j];
      const dlR = this.dl[1][j];
      this.dl[0][j] = l;
      this.dl[1][j] = r;
      L[i] = dlL * g;
      R[i] = dlR * g;
      this.pos = (j + 1) % la;
    }
  }
  reset() {
    this.dl[0].fill(0);
    this.dl[1].fill(0);
    this.gq.fill(1);
    this.box.fill(1);
    this.boxSum = this.la;
    this.env = 1;
    this.pos = 0;
    this.gpos = 0;
    this.tp[0].reset();
    this.tp[1].reset();
  }
}
class Gate {
  constructor(sr) {
    this.sr = sr;
  }
  sr;
  env = 0;
  gain = 0;
  hold = 0;
  open = false;
  process(L, R, n2, p) {
    const thr = num(p, "threshold", -50);
    const at = coef(num(p, "attack", 2), this.sr);
    const rt = coef(num(p, "release", 120), this.sr);
    const holdN = num(p, "hold", 50) / 1e3 * this.sr;
    const floor = dbToLin(num(p, "range", -60));
    const det = coef(1, this.sr);
    for (let i = 0; i < n2; i++) {
      const x = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      this.env = x > this.env ? x : det * this.env + (1 - det) * x;
      const db = linToDb(this.env);
      if (db > thr) {
        this.open = true;
        this.hold = holdN;
      } else if (db < thr - 3) {
        if (this.hold > 0) this.hold--;
        else this.open = false;
      }
      const target = this.open ? 1 : floor;
      const c2 = target > this.gain ? at : rt;
      this.gain = c2 * this.gain + (1 - c2) * target;
      L[i] *= this.gain;
      R[i] *= this.gain;
    }
  }
  reset() {
    this.env = 0;
    this.gain = 0;
    this.hold = 0;
    this.open = false;
  }
}
class Comb {
  buf;
  i = 0;
  store = 0;
  constructor(len) {
    this.buf = new Float32Array(len);
  }
  tick(x, fb, damp) {
    const y = this.buf[this.i];
    this.store = y * (1 - damp) + this.store * damp;
    if (Math.abs(this.store) < 1e-25) this.store = 0;
    this.buf[this.i] = x + this.store * fb;
    if (++this.i >= this.buf.length) this.i = 0;
    return y;
  }
  reset() {
    this.buf.fill(0);
    this.store = 0;
  }
}
class AllPass {
  buf;
  i = 0;
  constructor(len) {
    this.buf = new Float32Array(len);
  }
  tick(x) {
    const b2 = this.buf[this.i];
    const y = -x + b2;
    this.buf[this.i] = x + b2 * 0.5;
    if (++this.i >= this.buf.length) this.i = 0;
    return y;
  }
  reset() {
    this.buf.fill(0);
  }
}
class Reverb {
  combs;
  aps;
  pre;
  pi = 0;
  constructor(sr) {
    const k = sr / 44100;
    const C = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
    const A = [556, 441, 341, 225];
    const spread = 23;
    this.combs = [C.map((c2) => new Comb(Math.round(c2 * k))), C.map((c2) => new Comb(Math.round((c2 + spread) * k)))];
    this.aps = [A.map((a2) => new AllPass(Math.round(a2 * k))), A.map((a2) => new AllPass(Math.round((a2 + spread) * k)))];
    const maxPre = Math.ceil(0.2 * sr) + 1;
    this.pre = [new Float32Array(maxPre), new Float32Array(maxPre)];
    this.sr = sr;
  }
  sr;
  process(L, R, n2, p) {
    const fb = num(p, "size", 50) / 100 * 0.28 + 0.7;
    const damp = num(p, "damping", 50) / 100 * 0.4;
    const width = num(p, "width", 100) / 100;
    const wet = num(p, "wet", 25) / 100 * 3;
    const dry = num(p, "dry", 100) / 100;
    const wet1 = wet * (width / 2 + 0.5);
    const wet2 = wet * ((1 - width) / 2);
    const pd = Math.min(this.pre[0].length - 1, Math.round(num(p, "predelay", 10) / 1e3 * this.sr));
    const len = this.pre[0].length;
    for (let i = 0; i < n2; i++) {
      const inL = L[i];
      const inR = R[i];
      this.pre[0][this.pi] = inL;
      this.pre[1][this.pi] = inR;
      const ri = (this.pi - pd + len) % len;
      const x = (this.pre[0][ri] + this.pre[1][ri]) * 0.015;
      this.pi = (this.pi + 1) % len;
      let oL = 0;
      let oR = 0;
      for (let c2 = 0; c2 < 8; c2++) {
        oL += this.combs[0][c2].tick(x, fb, damp);
        oR += this.combs[1][c2].tick(x, fb, damp);
      }
      for (let a2 = 0; a2 < 4; a2++) {
        oL = this.aps[0][a2].tick(oL);
        oR = this.aps[1][a2].tick(oR);
      }
      L[i] = inL * dry + oL * wet1 + oR * wet2;
      R[i] = inR * dry + oR * wet1 + oL * wet2;
    }
  }
  reset() {
    for (const s of this.combs) for (const c2 of s) c2.reset();
    for (const s of this.aps) for (const a2 of s) a2.reset();
    this.pre[0].fill(0);
    this.pre[1].fill(0);
  }
}
class Delay {
  constructor(sr) {
    this.sr = sr;
    const len = Math.ceil(2.1 * sr);
    this.buf = [new Float32Array(len), new Float32Array(len)];
  }
  sr;
  buf;
  w = 0;
  d = -1;
  // smoothed delay (samples)
  lp = [0, 0];
  read(ch, d) {
    const b2 = this.buf[ch];
    const len = b2.length;
    const pos = this.w - d;
    const i0 = Math.floor(pos);
    const f = pos - i0;
    const a2 = b2[(i0 % len + len) % len];
    const c2 = b2[((i0 + 1) % len + len) % len];
    return a2 + (c2 - a2) * f;
  }
  process(L, R, n2, p) {
    const target = Math.min(this.buf[0].length - 4, Math.max(1, num(p, "time", 350) / 1e3 * this.sr));
    if (this.d < 0) this.d = target;
    const fb = Math.min(0.95, num(p, "feedback", 35) / 100);
    const mix = num(p, "mix", 25) / 100;
    const ping = flag(p, "pingpong");
    const hc = Math.exp(-2 * Math.PI * Math.min(this.sr * 0.45, num(p, "highcut", 6e3)) / this.sr);
    const sm = coef(30, this.sr);
    const len = this.buf[0].length;
    for (let i = 0; i < n2; i++) {
      this.d = sm * this.d + (1 - sm) * target;
      const dl = this.read(0, this.d);
      const dr = this.read(1, this.d);
      this.lp[0] = (1 - hc) * dl + hc * this.lp[0];
      this.lp[1] = (1 - hc) * dr + hc * this.lp[1];
      const x = L[i];
      const y = R[i];
      if (ping) {
        this.buf[0][this.w] = (x + y) * 0.5 + this.lp[1] * fb;
        this.buf[1][this.w] = this.lp[0] * fb;
      } else {
        this.buf[0][this.w] = x + this.lp[0] * fb;
        this.buf[1][this.w] = y + this.lp[1] * fb;
      }
      this.w = (this.w + 1) % len;
      L[i] = x * (1 - mix) + dl * mix;
      R[i] = y * (1 - mix) + dr * mix;
    }
  }
  reset() {
    this.buf[0].fill(0);
    this.buf[1].fill(0);
    this.d = -1;
    this.lp = [0, 0];
  }
}
class PitchShift {
  buf;
  w = 0;
  ph = 0;
  win;
  constructor(sr) {
    this.win = Math.round(0.06 * sr);
    const len = this.win * 2 + 8;
    this.buf = [new Float32Array(len), new Float32Array(len)];
  }
  tap(ch, d) {
    const b2 = this.buf[ch];
    const len = b2.length;
    const pos = this.w - d - 1;
    const i0 = Math.floor(pos);
    const f = pos - i0;
    const a2 = b2[(i0 % len + len) % len];
    const c2 = b2[((i0 + 1) % len + len) % len];
    return a2 + (c2 - a2) * f;
  }
  process(L, R, n2, p) {
    const ratio = Math.pow(2, (num(p, "semitones", 0) + num(p, "cents", 0) / 100) / 12);
    const mix = num(p, "mix", 100) / 100;
    if (Math.abs(ratio - 1) < 1e-6 && mix >= 1) {
      for (let i = 0; i < n2; i++) {
        this.buf[0][this.w] = L[i];
        this.buf[1][this.w] = R[i];
        this.w = (this.w + 1) % this.buf[0].length;
      }
      return;
    }
    const W = this.win;
    const step = (1 - ratio) / W;
    const len = this.buf[0].length;
    for (let i = 0; i < n2; i++) {
      this.buf[0][this.w] = L[i];
      this.buf[1][this.w] = R[i];
      const p1 = this.ph;
      const p2 = (this.ph + 0.5) % 1;
      const g1 = Math.sin(Math.PI * p1) ** 2;
      const g2 = Math.sin(Math.PI * p2) ** 2;
      const l = this.tap(0, p1 * W) * g1 + this.tap(0, p2 * W) * g2;
      const r = this.tap(1, p1 * W) * g1 + this.tap(1, p2 * W) * g2;
      L[i] = L[i] * (1 - mix) + l * mix;
      R[i] = R[i] * (1 - mix) + r * mix;
      this.ph += step;
      this.ph -= Math.floor(this.ph);
      this.w = (this.w + 1) % len;
    }
  }
  reset() {
    this.buf[0].fill(0);
    this.buf[1].fill(0);
    this.ph = 0;
  }
}
function fft(re, im, inverse) {
  const n2 = re.length;
  for (let i = 1, j = 0; i < n2; i++) {
    let bit = n2 >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n2; len <<= 1) {
    const ang = (inverse ? 2 : -2) * Math.PI / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n2; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a2 = i + k;
        const b2 = a2 + len / 2;
        const tr2 = re[b2] * cr - im[b2] * ci;
        const ti = re[b2] * ci + im[b2] * cr;
        re[b2] = re[a2] - tr2;
        im[b2] = im[a2] - ti;
        re[a2] += tr2;
        im[a2] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
  if (inverse)
    for (let i = 0; i < n2; i++) {
      re[i] /= n2;
      im[i] /= n2;
    }
}
class Denoise {
  constructor(sr) {
    this.sr = sr;
    const N = this.N;
    this.win = new Float64Array(N);
    for (let i = 0; i < N; i++) this.win[i] = Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
    this.inBuf = [new Float64Array(N), new Float64Array(N)];
    this.outBuf = [new Float64Array(N * 2), new Float64Array(N * 2)];
    this.noise = new Float64Array(N / 2 + 1);
    this.smooth = new Float64Array(N / 2 + 1);
    this.gain = new Float64Array(N / 2 + 1).fill(1);
  }
  sr;
  N = 1024;
  H = 256;
  win;
  inBuf;
  outBuf;
  fill = 0;
  outPos = 0;
  noise;
  smooth;
  gain;
  gtmp = new Float64Array(513);
  frames = 0;
  re = new Float64Array(1024);
  im = new Float64Array(1024);
  re2 = new Float64Array(1024);
  im2 = new Float64Array(1024);
  frame(p) {
    const { N, H } = this;
    const bins = N / 2 + 1;
    const floor = dbToLin(-num(p, "reduction", 12));
    const over = 0.5 + num(p, "sensitivity", 50) / 100 * 1.5;
    const { re, im, re2, im2 } = this;
    for (let i = 0; i < N; i++) {
      re[i] = this.inBuf[0][i] * this.win[i];
      im[i] = 0;
      re2[i] = this.inBuf[1][i] * this.win[i];
      im2[i] = 0;
    }
    fft(re, im, false);
    fft(re2, im2, false);
    const UP = 1.004;
    const DOWN = 0.99;
    const COMP = 2.98;
    const g = this.gtmp;
    for (let k = 0; k < bins; k++) {
      const pw = (re[k] * re[k] + im[k] * im[k] + re2[k] * re2[k] + im2[k] * im2[k]) * 0.5 + 1e-24;
      if (this.frames < 10) this.noise[k] = this.frames === 0 ? pw / COMP : this.noise[k] + (pw / COMP - this.noise[k]) / (this.frames + 1);
      else this.noise[k] *= pw > this.noise[k] ? UP : DOWN;
      const nk = this.noise[k] * COMP * over;
      const post = pw / nk;
      const prio = 0.98 * (this.gain[k] * this.gain[k] * this.smooth[k] / nk) + 0.02 * Math.max(post - 1, 0);
      g[k] = Math.max(floor, prio / (1 + prio));
      this.smooth[k] = pw;
    }
    this.frames++;
    for (let k = 0; k < bins; k++) this.gain[k] = g[k];
    for (let k = 0; k < bins; k++) {
      const gk = this.gain[k];
      re[k] *= gk;
      im[k] *= gk;
      re2[k] *= gk;
      im2[k] *= gk;
      if (k > 0 && k < N / 2) {
        re[N - k] = re[k];
        im[N - k] = -im[k];
        re2[N - k] = re2[k];
        im2[N - k] = -im2[k];
      }
    }
    fft(re, im, true);
    fft(re2, im2, true);
    for (let i = 0; i < N; i++) {
      this.outBuf[0][this.outPos + i] += re[i] * this.win[i] * 0.5;
      this.outBuf[1][this.outPos + i] += re2[i] * this.win[i] * 0.5;
    }
  }
  process(L, R, n2, p) {
    const { N, H } = this;
    for (let i = 0; i < n2; i++) {
      this.inBuf[0][N - H + this.fill] = L[i];
      this.inBuf[1][N - H + this.fill] = R[i];
      L[i] = this.outBuf[0][this.fill];
      R[i] = this.outBuf[1][this.fill];
      this.fill++;
      if (this.fill === H) {
        this.fill = 0;
        for (const ob of this.outBuf) {
          ob.copyWithin(0, H);
          ob.fill(0, ob.length - H);
        }
        this.outPos = 0;
        this.frame(p);
        for (const ib of this.inBuf) ib.copyWithin(0, H);
      }
    }
  }
  reset() {
    for (const b2 of this.inBuf) b2.fill(0);
    for (const b2 of this.outBuf) b2.fill(0);
    this.noise.fill(0);
    this.smooth.fill(0);
    this.gain.fill(1);
    this.frames = 0;
    this.fill = 0;
  }
}
class DeEsser {
  constructor(sr) {
    this.sr = sr;
  }
  sr;
  side = new Biquad();
  hp = new Biquad();
  env = 0;
  process(L, R, n2, p) {
    const f = num(p, "frequency", 6500);
    const thr = num(p, "threshold", -28);
    const maxRed = num(p, "reduction", 8);
    this.side.set("bandpass", this.sr, f, 1.4);
    this.hp.set("highpass", this.sr, f * 0.7, Math.SQRT1_2);
    const at = coef(1, this.sr);
    const rt = coef(60, this.sr);
    for (let i = 0; i < n2; i++) {
      const s = Math.abs(this.side.tick((L[i] + R[i]) * 0.5, 0));
      this.env = s > this.env ? at * this.env + (1 - at) * s : rt * this.env + (1 - rt) * s;
      const over = linToDb(this.env) - thr;
      const gr = over > 0 ? Math.min(maxRed, over * 0.75) : 0;
      const g = dbToLin(-gr);
      const hl = this.hp.tick(L[i], 0);
      const hr = this.hp.tick(R[i], 1);
      L[i] -= hl * (1 - g);
      R[i] -= hr * (1 - g);
    }
  }
  reset() {
    this.side.reset();
    this.hp.reset();
    this.env = 0;
  }
}
class Hum {
  constructor(sr) {
    this.sr = sr;
  }
  sr;
  notches = Array.from({ length: 8 }, () => new Biquad());
  process(L, R, n2, p) {
    const f0 = Number(p.frequency ?? 60) || 60;
    const h = Math.max(1, Math.min(8, Math.round(num(p, "harmonics", 4))));
    const q = num(p, "q", 30);
    for (let k = 0; k < h; k++) {
      const f = f0 * (k + 1);
      if (f >= this.sr * 0.45) break;
      const b2 = this.notches[k];
      b2.set("notch", this.sr, f, q);
      b2.run(L, n2, 0);
      b2.run(R, n2, 1);
    }
  }
  reset() {
    for (const b2 of this.notches) b2.reset();
  }
}
class ChannelTools {
  process(L, R, n2, p) {
    const mode = String(p.mode ?? "stereo");
    const width = num(p, "width", 100) / 100;
    const g = dbToLin(num(p, "gain", 0));
    const iL = flag(p, "invertL") ? -1 : 1;
    const iR = flag(p, "invertR") ? -1 : 1;
    for (let i = 0; i < n2; i++) {
      let l = L[i];
      let r = R[i];
      if (mode === "mono") l = r = (l + r) * 0.5;
      else if (mode === "left") r = l;
      else if (mode === "right") l = r;
      else if (mode === "swap") [l, r] = [r, l];
      if (width !== 1) {
        const m = (l + r) * 0.5;
        const s = (l - r) * 0.5 * width;
        l = m + s;
        r = m - s;
      }
      L[i] = l * g * iL;
      R[i] = r * g * iR;
    }
  }
  reset() {
  }
}
function createProcessor(type, sr) {
  switch (type) {
    case "eq":
      return new Eq(sr);
    case "compressor":
      return new Compressor(sr);
    case "limiter":
      return new Limiter(sr);
    case "gate":
      return new Gate(sr);
    case "reverb":
      return new Reverb(sr);
    case "delay":
      return new Delay(sr);
    case "pitchShift":
      return new PitchShift(sr);
    case "denoise":
      return new Denoise(sr);
    case "deesser":
      return new DeEsser(sr);
    case "humRemoval":
      return new Hum(sr);
    case "channelTools":
      return new ChannelTools();
    default:
      return null;
  }
}
class Chain {
  constructor(sr) {
    this.sr = sr;
  }
  sr;
  procs = /* @__PURE__ */ new Map();
  run(items, L, R, n2) {
    const live = /* @__PURE__ */ new Set();
    for (const it of items) {
      let p = this.procs.get(it.id);
      if (!p) {
        const made = createProcessor(it.type, this.sr);
        if (!made) continue;
        p = made;
        this.procs.set(it.id, p);
      }
      live.add(it.id);
      p.process(L, R, n2, it.params);
      for (let i = 0; i < n2; i++) {
        if (!Number.isFinite(L[i])) L[i] = 0;
        if (!Number.isFinite(R[i])) R[i] = 0;
      }
    }
    for (const id of [...this.procs.keys()]) if (!live.has(id)) this.procs.delete(id);
  }
  reset() {
    for (const p of this.procs.values()) p.reset();
  }
}
function kWeighting(sr) {
  let f0 = 1681.974450955533;
  const G = 3.999843853973347;
  let Q = 0.7071752369554196;
  let K = Math.tan(Math.PI * f0 / sr);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / Q + K * K;
  const pre = new Biquad();
  pre.setRaw([(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]);
  f0 = 38.13547087602444;
  Q = 0.5003270373238773;
  K = Math.tan(Math.PI * f0 / sr);
  a0 = 1 + K / Q + K * K;
  const rlb = new Biquad();
  rlb.setRaw([1, -2, 1], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]);
  return [pre, rlb];
}
const powerToLufs = (p) => p > 0 ? -0.691 + 10 * Math.log10(p) : -Infinity;
class LoudnessMeter {
  constructor(sr) {
    this.sr = sr;
    this.kw = kWeighting(sr);
    this.sub = Math.round(sr / 10);
  }
  sr;
  kw;
  sub;
  // samples per 100 ms
  acc = 0;
  cnt = 0;
  subs = [];
  // mean-square (L+R) per 100 ms
  blocks = [];
  // 400 ms block powers (75 % overlap)
  st = [];
  // 3 s short-term powers (for LRA), every 100 ms
  tp = [new TruePeak(), new TruePeak()];
  peak = 0;
  push(L, R, n2) {
    const [pre, rlb] = this.kw;
    for (let i = 0; i < n2; i++) {
      const l = rlb.tick(pre.tick(L[i], 0), 0);
      const r = rlb.tick(pre.tick(R[i], 1), 1);
      this.acc += l * l + r * r;
      this.peak = Math.max(this.peak, this.tp[0].push(L[i]), this.tp[1].push(R[i]), Math.abs(L[i]), Math.abs(R[i]));
      if (++this.cnt === this.sub) {
        this.subs.push(this.acc / this.sub);
        this.acc = 0;
        this.cnt = 0;
        const k = this.subs.length;
        if (k >= 4) this.blocks.push((this.subs[k - 1] + this.subs[k - 2] + this.subs[k - 3] + this.subs[k - 4]) / 4);
        if (k >= 30) {
          let s = 0;
          for (let j = k - 30; j < k; j++) s += this.subs[j];
          this.st.push(s / 30);
        }
        if (this.subs.length > 36e3 * 10) this.subs.splice(0, this.subs.length - 40);
      }
    }
  }
  recent(m) {
    const k = this.subs.length;
    if (k < m) return -Infinity;
    let s = 0;
    for (let j = k - m; j < k; j++) s += this.subs[j];
    return powerToLufs(s / m);
  }
  stats() {
    const abs = this.blocks.filter((b2) => powerToLufs(b2) > -70);
    let integrated = -Infinity;
    if (abs.length) {
      const rel = powerToLufs(abs.reduce((a2, b2) => a2 + b2, 0) / abs.length) - 10;
      const g = abs.filter((b2) => powerToLufs(b2) > rel);
      if (g.length) integrated = powerToLufs(g.reduce((a2, b2) => a2 + b2, 0) / g.length);
    }
    let range = 0;
    const sabs = this.st.filter((b2) => powerToLufs(b2) > -70);
    if (sabs.length > 1) {
      const rel = powerToLufs(sabs.reduce((a2, b2) => a2 + b2, 0) / sabs.length) - 20;
      const v2 = sabs.filter((b2) => powerToLufs(b2) > rel).map(powerToLufs).sort((a2, b2) => a2 - b2);
      if (v2.length > 1) range = v2[Math.min(v2.length - 1, Math.round(0.95 * (v2.length - 1)))] - v2[Math.round(0.1 * (v2.length - 1))];
    }
    return { momentary: this.recent(4), shortTerm: this.recent(30), integrated, range, truePeak: linToDb(this.peak) };
  }
  reset() {
    for (const b2 of this.kw) b2.reset();
    for (const t of this.tp) t.reset();
    this.acc = 0;
    this.cnt = 0;
    this.subs = [];
    this.blocks = [];
    this.st = [];
    this.peak = 0;
  }
}
function readVarispeed(pcm, pcmStart, rate, srcA, srcB, n2, L, R) {
  const frames = pcm.length / 2;
  for (let i = 0; i < n2; i++) {
    const s = srcA + (srcB - srcA) * i / n2;
    const pos = (s - pcmStart) * rate;
    const i0 = Math.floor(pos);
    if (i0 < 0 || i0 + 1 >= frames) {
      L[i] = 0;
      R[i] = 0;
      continue;
    }
    const f = pos - i0;
    L[i] = pcm[2 * i0] + (pcm[2 * i0 + 2] - pcm[2 * i0]) * f;
    R[i] = pcm[2 * i0 + 1] + (pcm[2 * i0 + 3] - pcm[2 * i0 + 1]) * f;
  }
}
function chainItems(effects, t) {
  const out = [];
  for (const e2 of effects ?? []) {
    if (!e2.enabled || !isEffectType(e2.type)) continue;
    const def = effectDef(e2.type);
    if (def.kind !== "audio") continue;
    const params = {};
    for (const d of def.params) {
      if (d.kind === "number") params[d.key] = pnum(e2.params, def.params, d.key, t);
      else if (d.kind === "bool") params[d.key] = pbool(e2.params, def.params, d.key);
      else params[d.key] = pstr(e2.params, def.params, d.key);
    }
    out.push({ id: e2.id, type: e2.type, params });
  }
  return out;
}
function voiceChain(v2) {
  const out = [];
  v2.chain.forEach((c2, i) => out.push(...chainItems(c2.effects, v2.chainKt[i])));
  return out;
}
function trackChain(track, t) {
  return chainItems(track?.effects, t);
}
function masterChain(seq, t) {
  return chainItems(seq.masterEffects, t);
}
export {
  resolveGeom as $,
  prevClip as A,
  createTransition as B,
  Chain as C,
  effectDef as D,
  generatorDef as E,
  isEffectType as F,
  createEffect as G,
  createGeneratorParams as H,
  containsSequence as I,
  snapFps as J,
  sourceTime as K,
  Limiter as L,
  trackOf as M,
  writeNum as N,
  writePath as O,
  EASE_OUT as P,
  EASE_IN as Q,
  evalPath as R,
  SAMPLE_RATE as S,
  toggleAnimated as T,
  keyIndexAt as U,
  removeKeyAt as V,
  setKey as W,
  isLinearTime as X,
  mediaTime as Y,
  sourceSpan as Z,
  toUV as _,
  LoudnessMeter as a,
  fromUV as a0,
  makeKey as a1,
  GENERATORS as a2,
  EFFECTS as a3,
  VIDEO_CATEGORIES as a4,
  AUDIO_CATEGORIES as a5,
  TRANSITION_CATEGORIES as a6,
  TRANSITIONS as a7,
  fpsLabel as a8,
  trackLabel as a9,
  clipLabel as aa,
  headWindow as ab,
  tailWindow as ac,
  parseCurve as ad,
  curveTable as ae,
  serializeCurve as af,
  FPS_CHOICES as ag,
  activeRange as ah,
  expandPairs as ai,
  pickUV as aj,
  rgbToHex as ak,
  editPoints as al,
  evaluate as am,
  fx$1 as an,
  decodeAudioArgs as b,
  audioOnlyArgs as c,
  dbToGain as d,
  evaluateAudio as e,
  Compositor as f,
  getSeq as g,
  encoderArgs as h,
  evalNum as i,
  evaluateVideo as j,
  mediaUses as k,
  decodeVideoArgs as l,
  masterChain as m,
  fitSize as n,
  isAnim as o,
  presetInfo as p,
  transitionDef as q,
  readVarispeed as r,
  sourceRange as s,
  trackChain as t,
  uid as u,
  voiceChain as v,
  clipEnd as w,
  sequenceDuration as x,
  sourceDuration as y,
  nextClip as z
};

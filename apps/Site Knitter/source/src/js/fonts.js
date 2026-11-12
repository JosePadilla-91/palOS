// Font catalogue. Bundled fonts come from @fontsource packages and are
// copied into exported sites; system fonts are referenced by stack only.
export const FONTS = [
  { name: 'Inter', pkg: 'inter', weights: [400, 700], italic: true, fallback: 'system-ui, sans-serif' },
  { name: 'Lato', pkg: 'lato', weights: [400, 700], italic: true, fallback: 'Helvetica, Arial, sans-serif' },
  { name: 'Montserrat', pkg: 'montserrat', weights: [400, 700], italic: true, fallback: 'Helvetica, Arial, sans-serif' },
  { name: 'Raleway', pkg: 'raleway', weights: [400, 700], italic: true, fallback: 'Helvetica, Arial, sans-serif' },
  { name: 'Josefin Sans', pkg: 'josefin-sans', weights: [400, 700], italic: true, fallback: 'Helvetica, Arial, sans-serif' },
  { name: 'Oswald', pkg: 'oswald', weights: [400, 700], italic: false, fallback: 'Impact, sans-serif' },
  { name: 'Bebas Neue', pkg: 'bebas-neue', weights: [400], italic: false, fallback: 'Impact, sans-serif' },
  { name: 'Playfair Display', pkg: 'playfair-display', weights: [400, 700], italic: true, fallback: 'Georgia, serif' },
  { name: 'Lora', pkg: 'lora', weights: [400, 700], italic: true, fallback: 'Georgia, serif' },
  { name: 'Merriweather', pkg: 'merriweather', weights: [400, 700], italic: true, fallback: 'Georgia, serif' },
  { name: 'Cormorant Garamond', pkg: 'cormorant-garamond', weights: [400, 700], italic: true, fallback: 'Garamond, Georgia, serif' },
  { name: 'Pacifico', pkg: 'pacifico', weights: [400], italic: false, fallback: 'cursive' },
  { name: 'Dancing Script', pkg: 'dancing-script', weights: [400, 700], italic: false, fallback: 'cursive' },
  { name: 'Caveat', pkg: 'caveat', weights: [400, 700], italic: false, fallback: 'cursive' },
  // System stacks (no files bundled)
  { name: 'Helvetica', system: 'Helvetica Neue, Helvetica, Arial, sans-serif' },
  { name: 'Georgia', system: 'Georgia, Times New Roman, serif' },
  { name: 'Courier', system: 'Courier New, Courier, monospace' },
  { name: 'Ubuntu', system: 'Ubuntu, Cantarell, sans-serif' },
];

export function fontByName(name) {
  return FONTS.find((f) => f.name === name);
}

export function fontStack(name) {
  const f = fontByName(name);
  if (!f) return `'${name}', sans-serif`;
  if (f.system) return f.system;
  return `'${f.name}', ${f.fallback}`;
}

/** List of {pkg, file, family, weight, style} for one font. */
export function fontFiles(name) {
  const f = fontByName(name);
  if (!f || f.system) return [];
  const out = [];
  for (const w of f.weights) {
    out.push({ pkg: f.pkg, file: `${f.pkg}-latin-${w}-normal.woff2`, family: f.name, weight: w, style: 'normal' });
    if (f.italic) out.push({ pkg: f.pkg, file: `${f.pkg}-latin-${w}-italic.woff2`, family: f.name, weight: w, style: 'italic' });
  }
  return out;
}

/** @font-face CSS. urlFor(file) -> url string */
export function fontFaceCSS(names, urlFor) {
  return [...new Set(names)].flatMap(fontFiles).map((ff) =>
    `@font-face{font-family:'${ff.family}';font-style:${ff.style};font-weight:${ff.weight};font-display:swap;src:url('${urlFor(ff)}') format('woff2');}`
  ).join('\n');
}

/** Inject bundled fonts into the editor document. */
export function installEditorFonts() {
  const css = fontFaceCSS(FONTS.filter((f) => !f.system).map((f) => f.name),
    (ff) => `../node_modules/@fontsource/${ff.pkg}/files/${ff.file}`);
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
}

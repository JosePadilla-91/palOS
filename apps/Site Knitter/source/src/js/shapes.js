// Shape geometry in a 0..100 box. Used for clip paths (fills/masks) and stroke outlines.
const star = (points = 5, inner = 0.42) => {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner * 50 : 50;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(52 + r * Math.sin(a) * 1.02).toFixed(2)}`);
  }
  return 'M' + pts.join(' L') + ' Z';
};

export const SHAPES = {
  rect: { label: 'Rectangle', css: true },
  rounded: { label: 'Rounded Rectangle', css: true },
  ellipse: { label: 'Oval', css: true },
  triangle: { label: 'Triangle', d: 'M50,0 L100,100 L0,100 Z' },
  diamond: { label: 'Diamond', d: 'M50,0 L100,50 L50,100 L0,50 Z' },
  star: { label: 'Star', d: star() },
  hexagon: { label: 'Hexagon', d: 'M25,0 L75,0 L100,50 L75,100 L25,100 L0,50 Z' },
  heart: { label: 'Heart', d: 'M50,92 C20,72 0,52 0,30 C0,12 13,2 28,2 C39,2 46,9 50,17 C54,9 61,2 72,2 C87,2 100,12 100,30 C100,52 80,72 50,92 Z' },
  arrow: { label: 'Arrow', d: 'M0,32 L62,32 L62,6 L100,50 L62,94 L62,68 L0,68 Z' },
  bubble: { label: 'Speech Bubble', d: 'M12,0 L88,0 C95,0 100,5 100,12 L100,62 C100,69 95,74 88,74 L40,74 L18,100 L22,74 L12,74 C5,74 0,69 0,62 L0,12 C0,5 5,0 12,0 Z' },
  blob: { label: 'Blob', d: 'M52,2 C74,0 96,14 99,38 C102,62 90,90 64,98 C38,106 10,92 3,66 C-4,40 10,10 30,5 C38,3 45,3 52,2 Z' },
  line: { label: 'Line', line: true },
};

export const MASKS = ['none', 'rounded', 'circle', 'star', 'heart', 'hexagon', 'diamond', 'blob'];

/** Hidden SVG with clipPath definitions; included once per document. */
export function clipDefsSVG() {
  const defs = Object.entries(SHAPES)
    .filter(([, s]) => s.d)
    .map(([k, s]) => `<clipPath id="ws-clip-${k}" clipPathUnits="objectBoundingBox"><path transform="scale(0.01)" d="${s.d}"/></clipPath>`)
    .join('');
  return `<svg class="ws-defs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>${defs}</defs></svg>`;
}

// Themes + page templates (classic-style: pick a theme, then add Welcome/About/Photos/Blog… pages)
import { make } from './elements.js';
import { generateSample } from './media.js';
import { uid, slugify, today } from './util.js';
import { fontStack } from './fonts.js';

const solid = (color) => ({ type: 'color', color });
const grad = (color, color2, angle = 180) => ({ type: 'gradient', color, color2, angle });

export const THEMES = [
  {
    id: 'modern', name: 'Modern White', layout: 'classic',
    body: solid('#e8eaee'), page: { fill: solid('#ffffff'), shadow: true, radius: 0, margin: 28 },
    fonts: { title: 'Playfair Display', heading: 'Playfair Display', body: 'Lato', nav: 'Lato' },
    sizes: { title: 38, heading: 34 },
    colors: { title: '#1d1d1f', heading: '#1d1d1f', text: '#4a4a4f', muted: '#8a8a90', accent: '#2a7ae2', accentDark: '#1b5db5', onAccent: '#ffffff', nav: '#6b6b70', navActive: '#1d1d1f', band: null, bandText: '#1d1d1f', rule: '#e2e2e6' },
    nav: { style: 'underline', upper: false, letter: 0.4, size: 15 },
    frame: 'none', heroRadius: 6, palette: ['#3b6ea8', '#f2b880', '#e7d8c9'],
  },
  {
    id: 'midnight', name: 'Midnight', layout: 'banner',
    body: grad('#0b0e14', '#1b2130'), page: { fill: solid('#121620'), shadow: true, radius: 14, margin: 30 },
    fonts: { title: 'Montserrat', heading: 'Montserrat', body: 'Inter', nav: 'Inter' },
    sizes: { title: 30, heading: 34 },
    colors: { title: '#ffffff', heading: '#f4f6fb', text: '#aab3c5', muted: '#6c7488', accent: '#5ee1ff', accentDark: '#2bc3e8', onAccent: '#071016', nav: '#c9d2e3', navActive: '#071016', band: grad('#1e2a44', '#121620', 180), bandText: '#ffffff', rule: '#262d3d' },
    nav: { style: 'pills', upper: false, letter: 0.3, size: 14 },
    frame: 'none', heroRadius: 12, heroReflect: true, palette: ['#203a74', '#6a4fb3', '#59d0f0'],
  },
  {
    id: 'travel', name: 'Travel Journal', layout: 'sidebar',
    body: grad('#cdb68f', '#b39a70', 135), page: { fill: solid('#f7f0e1'), shadow: true, radius: 2, margin: 26 },
    fonts: { title: 'Caveat', heading: 'Caveat', body: 'Lora', nav: 'Lora' },
    sizes: { title: 46, heading: 48 },
    colors: { title: '#3a2b1d', heading: '#5a3a22', text: '#4d4035', muted: '#8f7d68', accent: '#b5562b', accentDark: '#8f3f1c', onAccent: '#fff7ec', nav: '#6a5644', navActive: '#b5562b', band: solid('#ebdfc6'), bandText: '#3a2b1d', rule: '#d8c9ab' },
    nav: { style: 'plain', upper: false, letter: 0.2, size: 17 },
    frame: 'polaroid', heroRadius: 0, palette: ['#4f8fa8', '#e2a65b', '#c7d8a0'],
  },
  {
    id: 'formal', name: 'Formal', layout: 'centered',
    body: solid('#2c1f22'), page: { fill: solid('#fbf7ef'), shadow: true, radius: 0, margin: 34 },
    fonts: { title: 'Cormorant Garamond', heading: 'Cormorant Garamond', body: 'Lora', nav: 'Cormorant Garamond' },
    sizes: { title: 56, heading: 40 },
    colors: { title: '#2c1f22', heading: '#5c1a28', text: '#4a3d3d', muted: '#97878a', accent: '#7a1f2b', accentDark: '#5c1520', onAccent: '#fbf7ef', nav: '#5b4b4d', navActive: '#7a1f2b', band: null, bandText: '#2c1f22', rule: '#d9cdbd' },
    nav: { style: 'plain', upper: true, letter: 3, size: 15 },
    frame: 'matte', heroRadius: 0, palette: ['#5e2a35', '#c9a66b', '#e8dccb'],
  },
  {
    id: 'neon', name: 'Neon Nights', layout: 'banner',
    body: grad('#1b0036', '#04000b', 160), page: { fill: grad('#120022', '#070010', 180), shadow: true, radius: 0, margin: 0 },
    fonts: { title: 'Bebas Neue', heading: 'Bebas Neue', body: 'Inter', nav: 'Bebas Neue' },
    sizes: { title: 54, heading: 60 },
    colors: { title: '#ffffff', heading: '#ff4fd8', text: '#c8b9e6', muted: '#8a78ad', accent: '#ff2fd0', accentDark: '#d11aaa', onAccent: '#ffffff', nav: '#e9dcff', navActive: '#ffffff', band: grad('#3a0a6e', '#120022', 180), bandText: '#ffffff', rule: '#3a1f5f' },
    nav: { style: 'boxed', upper: true, letter: 2, size: 19 },
    frame: 'none', heroRadius: 0, heroReflect: true, palette: ['#7a1fd6', '#ff2fd0', '#2fe0ff'], heroShadow: '#ff2fd0',
  },
  {
    id: 'garden', name: 'Garden', layout: 'sidebar',
    body: solid('#dfe8d6'), page: { fill: solid('#ffffff'), shadow: true, radius: 10, margin: 30 },
    fonts: { title: 'Josefin Sans', heading: 'Josefin Sans', body: 'Merriweather', nav: 'Josefin Sans' },
    sizes: { title: 34, heading: 36 },
    colors: { title: '#ffffff', heading: '#2f5d3a', text: '#4b5a4e', muted: '#8a998c', accent: '#3d7a4a', accentDark: '#2c5c37', onAccent: '#ffffff', nav: '#d6ead9', navActive: '#ffffff', band: grad('#3f7a4c', '#24492e', 180), bandText: '#ffffff', rule: '#e1e9e2' },
    nav: { style: 'pills', upper: true, letter: 1.5, size: 14, onAccent: '#24492e', accent: '#ffffff' },
    frame: 'white', heroRadius: 10, palette: ['#4f8a5b', '#e7c76d', '#bcd9a5'],
  },
  {
    id: 'darkroom', name: 'Darkroom', layout: 'classic',
    body: solid('#161616'), page: { fill: solid('#232323'), shadow: true, radius: 0, margin: 26 },
    fonts: { title: 'Oswald', heading: 'Oswald', body: 'Lato', nav: 'Oswald' },
    sizes: { title: 40, heading: 38 },
    colors: { title: '#f2f2f2', heading: '#f2f2f2', text: '#b9b9b9', muted: '#7d7d7d', accent: '#ff8a3d', accentDark: '#e26a1b', onAccent: '#1a1a1a', nav: '#a8a8a8', navActive: '#ff8a3d', band: null, bandText: '#f2f2f2', rule: '#3a3a3a' },
    nav: { style: 'underline', upper: true, letter: 2, size: 15 },
    frame: 'dark', heroRadius: 0, heroReflect: true, palette: ['#2c3e50', '#ff8a3d', '#d8c3a5'],
  },
  {
    id: 'watercolor', name: 'Watercolor', layout: 'centered',
    body: grad('#fde2e4', '#dcefe9', 135), page: { fill: solid('#fffdfb'), shadow: true, radius: 22, margin: 36 },
    fonts: { title: 'Dancing Script', heading: 'Dancing Script', body: 'Raleway', nav: 'Raleway' },
    sizes: { title: 64, heading: 50 },
    colors: { title: '#b5577a', heading: '#c26a8b', text: '#5d5560', muted: '#a399a3', accent: '#e07a9b', accentDark: '#c45f80', onAccent: '#ffffff', nav: '#8a7e8a', navActive: '#e07a9b', band: null, bandText: '#b5577a', rule: '#f1dfe5' },
    nav: { style: 'pills', upper: false, letter: 0.5, size: 15 },
    frame: 'rounded', heroRadius: 22, heroMask: 'blob', palette: ['#f4a7bb', '#a8d8cf', '#f9e0a8'],
  },
  {
    id: 'mono', name: 'Minimal Mono', layout: 'classic',
    body: solid('#ffffff'), page: { fill: solid('#ffffff'), shadow: false, radius: 0, margin: 0 },
    fonts: { title: 'Inter', heading: 'Inter', body: 'Inter', nav: 'Inter' },
    sizes: { title: 22, heading: 44 },
    colors: { title: '#111111', heading: '#111111', text: '#555555', muted: '#999999', accent: '#111111', accentDark: '#444444', onAccent: '#ffffff', nav: '#777777', navActive: '#111111', band: null, bandText: '#111111', rule: '#eeeeee' },
    nav: { style: 'plain', upper: true, letter: 2, size: 12 },
    frame: 'none', heroRadius: 0, palette: ['#888888', '#cccccc', '#eeeeee'], grayscale: true,
  },
  {
    id: 'sunset', name: 'Sunset Pop', layout: 'banner',
    body: solid('#fff1e4'), page: { fill: solid('#ffffff'), shadow: true, radius: 18, margin: 30 },
    fonts: { title: 'Pacifico', heading: 'Montserrat', body: 'Montserrat', nav: 'Montserrat' },
    sizes: { title: 38, heading: 36 },
    colors: { title: '#ffffff', heading: '#2d1e2f', text: '#5b4d5d', muted: '#a0909f', accent: '#ff5e3a', accentDark: '#e0401d', onAccent: '#ffffff', nav: '#fff3ea', navActive: '#ff5e3a', band: grad('#ff7e5f', '#feb47b', 90), bandText: '#ffffff', rule: '#f3e6dc' },
    nav: { style: 'pills', upper: false, letter: 0.3, size: 15, accent: '#ffffff', onAccent: '#ff5e3a' },
    frame: 'none', heroRadius: 18, palette: ['#ff7e5f', '#feb47b', '#6a82fb'], heroShadow: '#ff7e5f',
  },
];

export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

export const TEMPLATES = [
  { id: 'welcome', name: 'Welcome', desc: 'A big hero photo and a warm hello' },
  { id: 'about', name: 'About Me', desc: 'Portrait, bio and highlights' },
  { id: 'photos', name: 'Photos', desc: 'Gallery grid with lightbox' },
  { id: 'slideshow', name: 'Slideshow', desc: 'Full-width rotating photos' },
  { id: 'movie', name: 'Movie', desc: 'Feature a video' },
  { id: 'blog', name: 'Blog', desc: 'Posts, archive and RSS feed' },
  { id: 'contact', name: 'Contact', desc: 'Form and a map' },
  { id: 'blank', name: 'Blank', desc: 'Just the header and menu' },
];

// ---------------------------------------------------------------------------
// Role-based theming: every templated element carries a role so a new theme
// can restyle it in place.
// ---------------------------------------------------------------------------
export function styleForRole(el, t) {
  const c = t.colors, f = t.fonts;
  switch (el.role) {
    case 'title': el.font = f.title; el.color = c.title; break;
    case 'band-title': el.font = f.title; el.color = c.bandText; break;
    case 'heading': el.font = f.heading; el.color = c.heading; break;
    case 'body': el.font = f.body; el.color = c.text; break;
    case 'muted': case 'footer': el.font = f.body; el.color = c.muted; break;
    case 'nav': case 'band-nav':
      Object.assign(el, {
        font: f.nav, color: el.role === 'band-nav' && t.layout !== 'classic' && t.layout !== 'centered' ? c.nav : c.nav,
        activeColor: c.navActive, hoverColor: t.nav.hover || c.navActive, accent: t.nav.accent || c.accent,
        onAccent: t.nav.onAccent || c.onAccent, navStyle: t.nav.style, upper: t.nav.upper, letter: t.nav.letter, size: t.nav.size,
        gap: el.orient === 'v' ? (['pills', 'boxed', 'tabs'].includes(t.nav.style) ? 4 : 10) : (['pills', 'boxed', 'tabs'].includes(t.nav.style) ? 6 : 26),
      });
      break;
    case 'band':
      el.fill = t.colors.band ? JSON.parse(JSON.stringify(t.colors.band)) : { type: 'none' };
      break;
    case 'rule': el.stroke = { ...el.stroke, color: c.rule }; break;
    case 'accent-shape': el.fill = { type: 'color', color: c.accent }; break;
    case 'button':
      el.font = f.body; el.color = c.onAccent; el.fill = { type: 'color', color: c.accent }; el.hoverFill = c.accentDark;
      break;
    case 'photo': case 'hero':
      el.frame = el.role === 'hero' ? 'none' : t.frame;
      if (el.role === 'hero') {
        el.mask = t.heroMask || (t.heroRadius ? 'rounded' : 'none');
        el.radius = t.heroRadius || 0;
        el.reflection = { ...el.reflection, on: !!t.heroReflect };
        el.shadow = t.heroShadow ? { on: true, x: 0, y: 10, blur: 30, color: t.heroShadow, alpha: 0.45 } : { ...el.shadow, on: false };
      }
      el.adjust = { ...el.adjust, grayscale: t.grayscale ? 100 : 0 };
      break;
    case 'gallery': el.captionFont = f.body; el.captionColor = c.muted; break;
    case 'form': el.font = f.body; el.color = c.text; el.accent = c.accent; break;
    case 'feed':
      Object.assign(el, { font: f.body, color: c.text, titleFont: f.heading, titleColor: c.heading, accent: c.accent, muted: c.muted });
      break;
    default: break;
  }
  return el;
}

export function applyTheme(project, themeId) {
  const t = themeById(themeId);
  project.site.theme = t.id;
  delete project.site.bodyFill;
  for (const p of project.pages) {
    delete p.bg;
    for (const el of p.elements) if (el.role) styleForRole(el, t);
  }
}

// ---------------------------------------------------------------------------
// Header layouts
// ---------------------------------------------------------------------------
/** Shrink a title's font size so the site name fits on one line */
function fitSize(name, size, width, font) {
  const narrow = /Bebas|Oswald|Caveat|Josefin|Dancing|Cormorant/.test(font) ? 0.42 : 0.56;
  const est = String(name).length * size * narrow;
  return est > width ? Math.max(14, Math.floor(size * width / est)) : size;
}

function header(t, site, H) {
  const W = site.width || 980;
  const els = [];
  const fit = (w, s) => fitSize(site.name, s, w - 12, t.fonts.title);
  const R = (el, role) => { el.role = role; styleForRole(el, t); els.push(el); return el; };
  let X0 = 60, CW = W - 120, top = 150;

  if (t.layout === 'classic') {
    R(make.text(56, 40, 440, 64, `<p>${site.name}</p>`, { size: fit(440, t.sizes.title), lineHeight: 1.2, valign: 'middle' }), 'band-title');
    R(make.navbar(440, 62, W - 500, 34, { align: 'right' }), 'band-nav');
    R(make.shape('line', 60, 116, W - 120, 4), 'rule');
    top = 156;
  } else if (t.layout === 'banner') {
    R(make.shape('rect', 0, 0, W, 120), 'band');
    R(make.text(56, 30, 420, 64, `<p>${site.name}</p>`, { size: fit(420, t.sizes.title), lineHeight: 1.2, valign: 'middle' }), 'band-title');
    R(make.navbar(420, 44, W - 476, 36, { align: 'right' }), 'band-nav');
    top = 168;
  } else if (t.layout === 'centered') {
    R(make.text(60, 46, W - 120, 84, `<p>${site.name}</p>`, { size: fit(W - 120, t.sizes.title), align: 'center', lineHeight: 1.15 }), 'band-title');
    R(make.navbar(60, 138, W - 120, 34, { align: 'center' }), 'band-nav');
    R(make.shape('line', W / 2 - 60, 186, 120, 4), 'rule');
    top = 226;
  } else if (t.layout === 'sidebar') {
    R(make.shape('rect', 0, 0, 240, H), 'band');
    R(make.text(28, 44, 190, 120, `<p>${site.name}</p>`, { size: Math.round(t.sizes.title * 0.8), lineHeight: 1.1 }), 'band-title');
    R(make.navbar(28, 184, 190, 260, { orient: 'v', gap: 10, align: 'left' }), 'band-nav');
    X0 = 290; CW = W - 340; top = 60;
  }
  return { els, X0, CW, top, R };
}

function footer(t, site, H, X0, CW, R) {
  R(make.text(X0, H - 64, CW, 30, `<p>© ${new Date().getFullYear()} ${site.name}. Made with Site Knitter.</p>`, { size: 12, align: 'center' }), 'footer');
}

const LOREM = [
  'Every great story starts somewhere. This is a place to share yours — the projects you are proud of, the places you have been, and the people who make it all worthwhile.',
  'Replace this text with a few sentences about what visitors will find here. Keep it friendly and personal; you can always come back and change it later.',
  'Use the Inspector to change fonts and colours, drag photos in from the Media Browser, and press Preview to see your site in a real browser.',
];

// ---------------------------------------------------------------------------
// Page builder
// ---------------------------------------------------------------------------
export async function buildPage(templateId, themeId, project, opts = {}) {
  const t = themeById(themeId);
  const site = project.site;
  const sample = (i, scene) => generateSample(i + (opts.seedBase || 0), t.palette, scene, project);
  const page = {
    id: uid('p'),
    name: opts.name || TEMPLATES.find((x) => x.id === templateId)?.name || 'Page',
    slug: '',
    type: templateId === 'blog' ? 'blog' : 'standard',
    template: templateId,
    showInNav: true,
    title: '',
    description: '',
    height: 1200,
    elements: [],
  };
  page.slug = slugify(page.name);

  // We need a provisional height for sidebar bands; fix afterwards.
  const hdr = header(t, site, 2000);
  const { X0, CW, top, R } = hdr;
  const els = hdr.els;
  let H = 1100;

  const heading = (text, y, o = {}) => R(make.text(X0, y, o.w || CW, o.h || 60, `<p>${text}</p>`, { size: t.sizes.heading, lineHeight: 1.2, ...o }), 'heading');
  const body = (html, x, y, w, h, o = {}) => R(make.text(x, y, w, h, html, { size: 16, lineHeight: 1.7, ...o }), 'body');

  switch (templateId) {
    case 'welcome': {
      const heroH = Math.round(CW * 0.48);
      R(make.image(X0, top, CW, heroH, await sample(0, t.id === 'neon' ? 'aurora' : 'mountains'), { anim: 'fade' }), 'hero');
      let y = top + heroH + (t.heroReflect ? 70 : 40);
      heading('Welcome to my website', y, { anim: 'fade-up' });
      y += 74;
      body(`<p>${LOREM[0]}</p><p>${LOREM[1]}</p>`, X0, y, Math.round(CW * 0.55), 200, { anim: 'fade-up' });
      R(make.image(X0 + Math.round(CW * 0.6), y + 6, Math.round(CW * 0.4), Math.round(CW * 0.4 * 0.66), await sample(1, 'sea'), { anim: 'fade-up', hover: 'lift', rot: t.frame === 'polaroid' ? 3 : 0 }), 'photo');
      const btn = R(make.button(X0, y + 222, 190, 48, 'Learn more about me', { anim: 'fade-up' }), 'button');
      btn.link = { type: 'page', page: null, pageTemplate: 'about' };
      H = y + 360;
      break;
    }
    case 'about': {
      R(make.image(X0, top, 300, 300, await sample(2, 'bokeh'), { mask: 'circle', anim: 'zoom' }), 'photo').mask = 'circle';
      heading('About Me', top + 10, { w: CW - 340, x: X0 + 340 }).x = X0 + 340;
      body(`<p>${LOREM[0]}</p><p>${LOREM[2]}</p>`, X0 + 340, top + 84, CW - 340, 220);
      const colW = Math.round((CW - 60) / 3);
      const titles = ['What I do', 'Where I’ve been', 'Say hello'];
      const texts = ['Design, photography and making things for the web. Describe your work here.', 'Toronto, Lisbon, Kyoto — list the places and moments that shaped you.', 'Have a project in mind or just want to chat? Drop me a note any time.'];
      for (let i = 0; i < 3; i++) {
        const x = X0 + i * (colW + 30);
        R(make.shape('rect', x, top + 368, 40, 4), 'accent-shape');
        R(make.text(x, top + 384, colW, 40, `<p>${titles[i]}</p>`, { size: 22, lineHeight: 1.3, anim: 'fade-up', animDelay: i * 0.12 }), 'heading');
        body(`<p>${texts[i]}</p>`, x, top + 430, colW, 110, { size: 15, anim: 'fade-up', animDelay: i * 0.12 });
      }
      H = top + 660;
      break;
    }
    case 'photos': {
      heading('Photos', top);
      R(make.text(X0, top + 62, CW, 30, '<p>Click any photo to see it larger. Use arrow keys to browse.</p>', { size: 15 }), 'muted');
      const imgs = [];
      const scenes = ['mountains', 'sea', 'dunes', 'bokeh', 'hills', 'aurora'];
      const caps = ['Morning light', 'Low tide', 'Desert road', 'City lights', 'Rolling hills', 'Northern sky'];
      for (let i = 0; i < 6; i++) imgs.push({ asset: await sample(10 + i, scenes[i]), caption: caps[i] });
      const cols = 3, gap = 16;
      const cell = (CW - gap * (cols - 1)) / cols;
      const gh = Math.round(2 * (cell + 26) + gap);
      R(make.gallery(X0, top + 116, CW, gh, imgs, { cols, gap, anim: 'fade-up' }), 'gallery');
      H = top + 116 + gh + 130;
      break;
    }
    case 'slideshow': {
      heading('Slideshow', top);
      const imgs = [];
      for (let i = 0; i < 5; i++) imgs.push({ asset: await sample(30 + i), caption: ['Golden hour', 'Over the water', 'Long road', 'Night falls', 'Home again'][i] });
      const sh = Math.round(CW * 0.6);
      R(make.slideshow(X0, top + 80, CW, sh, imgs, { radius: t.heroRadius || 0 }), 'photo').frame = 'none';
      body(`<p>${LOREM[1]}</p>`, X0, top + 110 + sh, CW, 90);
      H = top + 110 + sh + 200;
      break;
    }
    case 'movie': {
      heading('My Movie', top);
      const vh = Math.round(CW * 9 / 16);
      R(make.video(X0, top + 80, CW, vh, null, { radius: t.heroRadius || 0, shadow: { on: true, x: 0, y: 14, blur: 36, color: '#000000', alpha: 0.35 } }), 'video');
      body(`<p>Drag a movie from the Media Browser onto the player, or paste a YouTube link using Insert ▸ YouTube / Vimeo Video.</p>`, X0, top + 110 + vh, CW, 80);
      H = top + 110 + vh + 200;
      break;
    }
    case 'blog': {
      heading('Blog', top);
      const fw = Math.round(CW * 0.66);
      R(make.blogfeed(X0, top + 80, fw, 600), 'feed');
      const sx = X0 + fw + 40, sw = CW - fw - 40;
      R(make.text(sx, top + 84, sw, 34, '<p>About this blog</p>', { size: 20 }), 'heading');
      R(make.image(sx, top + 128, sw, Math.round(sw * 0.75), await sample(40, 'hills')), 'photo');
      body(`<p>Notes, stories and photos from along the way. New posts every so often.</p>`, sx, top + 150 + Math.round(sw * 0.75), sw, 120, { size: 14 });
      const rss = R(make.button(sx, top + 290 + Math.round(sw * 0.75), 150, 38, 'Subscribe (RSS)', { size: 14 }), 'button');
      rss.link = { type: 'rss' };
      page.blog = {
        entries: [
          { id: uid('b'), title: 'Hello, world', date: today(), slug: 'hello-world', image: await sample(41, 'sea'), html: `<p>${LOREM[0]}</p><p>${LOREM[1]}</p><p>Select this post in the sidebar to edit it, or click <b>+ New Post</b> to write another.</p>`, draft: false },
          { id: uid('b'), title: 'A weekend in the mountains', date: shiftDate(-9), slug: 'a-weekend-in-the-mountains', image: await sample(42, 'mountains'), html: `<p>${LOREM[2]}</p><p>${LOREM[0]}</p>`, draft: false },
        ],
      };
      H = top + 900;
      break;
    }
    case 'contact': {
      heading('Get in Touch', top);
      body(`<p>${LOREM[1]}</p>`, X0, top + 70, CW, 70);
      const fw = Math.round(CW * 0.55);
      R(make.form(X0, top + 160, fw, 420), 'form');
      R(make.map(X0 + fw + 40, top + 166, CW - fw - 40, 300, 'CN Tower, Toronto', { radius: t.heroRadius || 0 }), 'map');
      R(make.text(X0 + fw + 40, top + 486, CW - fw - 40, 80, '<p><b>Studio</b><br>290 Bremner Blvd<br>Toronto, ON</p>', { size: 14, lineHeight: 1.6 }), 'body');
      H = top + 680;
      break;
    }
    default:
      body(`<p>${LOREM[2]}</p>`, X0, top, CW, 120);
      H = top + 500;
  }

  footer(t, site, H, X0, CW, R);
  H = await settle(els, H);
  page.height = H;
  for (const el of els) if (el.role === 'band' && t.layout === 'sidebar') el.h = H;
  page.elements = els;
  return page;
}

/** Measure how tall a text element's content really is (fonts loaded first). */
async function measureText(el) {
  try { await document.fonts.load(`${el.size || 16}px '${el.font}'`); } catch { /* system font */ }
  const d = document.createElement('div');
  d.className = 'ws-txt';
  Object.assign(d.style, {
    position: 'absolute', visibility: 'hidden', left: '-10000px', top: '0', width: el.w + 'px', height: 'auto',
    fontFamily: fontStack(el.font), fontSize: (el.size || 16) + 'px', lineHeight: el.lineHeight || 1.5,
    letterSpacing: (el.letter || 0) + 'px', padding: (el.pad ?? 6) + 'px', fontWeight: el.weight || 400,
    textTransform: el.upper ? 'uppercase' : 'none', boxSizing: 'border-box',
  });
  d.innerHTML = el.html;
  document.body.append(d);
  const hgt = d.offsetHeight;
  d.remove();
  return Math.ceil(hgt);
}

/** Grow text boxes to fit their words and push whatever sits below them down. */
async function settle(els, H) {
  let extra = 0;
  const texts = els.filter((e) => e.type === 'text' && e.role !== 'band-title' && e.role !== 'footer').sort((a, b) => a.y - b.y);
  for (const t of texts) {
    const need = await measureText(t);
    const delta = need - t.h;
    if (delta <= 0) continue;
    const bottom = t.y + t.h;
    t.h = need;
    for (const o of els) {
      if (o === t || o.y < bottom - 1) continue;
      o.y += delta;
    }
    extra += delta;
  }
  return H + extra;
}

function shiftDate(days) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

/** Resolve "pageTemplate" links (e.g. Welcome's button → About page) */
export function resolveTemplateLinks(project) {
  for (const p of project.pages) {
    for (const el of p.elements) {
      if (el.link?.type === 'page' && !el.link.page && el.link.pageTemplate) {
        const target = project.pages.find((q) => q.template === el.link.pageTemplate);
        el.link.page = target ? target.id : project.pages[0].id;
      }
    }
  }
}

export async function newProject(themeId, siteName = 'My Site', templates = ['welcome', 'about', 'photos', 'blog', 'contact']) {
  const project = {
    format: 'site-knitter',
    version: 1,
    site: {
      name: siteName,
      theme: themeId,
      width: 980,
      description: '',
      author: '',
      language: 'en',
      baseUrl: '',
      favicon: null,
      headCode: '',
      publish: { protocol: 'ftp', host: '', port: 21, user: '', remotePath: '/public_html' },
    },
    pages: [],
    assets: {},
  };
  let seed = 0;
  for (const tpl of templates) {
    project.pages.push(await buildPage(tpl, themeId, project, { seedBase: seed }));
    seed += 100;
  }
  resolveTemplateLinks(project);
  return project;
}

export function uniqueSlug(project, base, exceptId) {
  let s = slugify(base), n = 2;
  const taken = new Set(project.pages.filter((p) => p.id !== exceptId).map((p) => p.slug));
  const orig = s;
  while (taken.has(s) || s === 'assets') s = `${orig}-${n++}`;
  return s;
}

// Shared element renderer — produces identical HTML/CSS for the editor canvas
// and for exported sites. Each element -> { html, css }.
import { esc, formatDate, stripHtml, hexToRgba, hydrateAssets } from './util.js';
import { fontStack } from './fonts.js';
import { SHAPES } from './shapes.js';

// ---------------------------------------------------------------------------
// CSS fragments
// ---------------------------------------------------------------------------
export function fillCSS(fill, ctx, w) {
  if (!fill || fill.type === 'none') return 'background:transparent;';
  if (fill.type === 'color') return `background:${fill.color};`;
  if (fill.type === 'gradient') {
    return fill.radial
      ? `background:radial-gradient(circle at center, ${fill.color}, ${fill.color2});`
      : `background:linear-gradient(${fill.angle ?? 180}deg, ${fill.color}, ${fill.color2});`;
  }
  if (fill.type === 'image' && fill.asset) {
    const url = ctx.asset(fill.asset, fill.fit === 'tile' ? 600 : w);
    const size = fill.fit === 'tile' ? `auto` : fill.fit || 'cover';
    const rep = fill.fit === 'tile' ? 'repeat' : 'no-repeat';
    return `background:${fill.color || 'transparent'} url('${url}') center/${size} ${rep};`;
  }
  return 'background:transparent;';
}

function shadowFilter(s) {
  if (!s || !s.on) return '';
  return `drop-shadow(${s.x || 0}px ${s.y ?? 6}px ${s.blur ?? 16}px ${hexToRgba(s.color || '#000000', s.alpha ?? 0.35)})`;
}

function reflectCSS(r) {
  if (!r || !r.on) return '';
  const a = r.opacity ?? 0.35;
  return `-webkit-box-reflect:below ${r.gap ?? 2}px linear-gradient(transparent ${Math.round((1 - (r.size ?? 0.4)) * 100)}%, rgba(255,255,255,${a}));`;
}

function textShadowCSS(t) {
  if (!t || !t.on) return '';
  return `text-shadow:${t.x || 0}px ${t.y ?? 2}px ${t.blur ?? 6}px ${hexToRgba(t.color || '#000000', t.alpha ?? 0.4)};`;
}

function typeCSS(el) {
  return [
    `font-family:${fontStack(el.font || 'Helvetica')};`,
    el.size ? `font-size:${el.size}px;` : '',
    el.weight ? `font-weight:${el.weight};` : '',
    el.italic ? 'font-style:italic;' : '',
    el.color ? `color:${el.color};` : '',
    el.lineHeight ? `line-height:${el.lineHeight};` : '',
    el.letter ? `letter-spacing:${el.letter}px;` : '',
    el.upper ? 'text-transform:uppercase;' : '',
    el.align ? `text-align:${el.align};` : '',
  ].join('');
}

const FRAMES = {
  none: '',
  thin: 'padding:5px;background:#fff;border:1px solid rgba(0,0,0,.18);',
  white: 'padding:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);',
  polaroid: 'padding:12px 12px 52px;background:#fbfaf7;box-shadow:0 8px 22px rgba(0,0,0,.28);',
  matte: 'padding:28px;background:#f4f1ea;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08),0 10px 30px rgba(0,0,0,.25);',
  gold: 'padding:12px;background:linear-gradient(135deg,#a77b2c,#f6e7a8 30%,#b4892f 55%,#f9eebd 75%,#8c6420);box-shadow:0 6px 20px rgba(0,0,0,.35);',
  wood: 'padding:16px;background:repeating-linear-gradient(90deg,#6b4325 0 6px,#7a4f2c 6px 11px,#5e3a1f 11px 14px);box-shadow:inset 0 0 0 2px rgba(0,0,0,.25),0 8px 20px rgba(0,0,0,.35);',
  dark: 'padding:10px;background:#111;box-shadow:0 10px 30px rgba(0,0,0,.5);',
  rounded: 'padding:8px;background:#fff;border-radius:18px;box-shadow:0 10px 28px rgba(0,0,0,.2);',
  tape: 'padding:10px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.2);',
};
export const FRAME_NAMES = Object.keys(FRAMES);

export const ANIMS = ['none', 'fade', 'fade-up', 'fade-down', 'slide-left', 'slide-right', 'zoom', 'flip', 'blur-in'];
export const HOVERS = ['none', 'lift', 'grow', 'glow', 'dim', 'tilt'];

function linkHref(link, ctx) {
  if (!link || link.type === 'none' || !link.type) return null;
  if (link.type === 'page') return ctx.href(link.page);
  if (link.type === 'url') return link.url || '#';
  if (link.type === 'email') return 'mailto:' + (link.email || '');
  if (link.type === 'top') return '#';
  if (link.type === 'rss') return ctx.feedHref ? ctx.feedHref() : 'feed.xml';
  return null;
}

function wrapLink(inner, el, ctx) {
  const href = linkHref(el.link, ctx);
  if (!href || ctx.mode === 'editor') return inner;
  const target = el.link.newTab || (el.link.type === 'url' && /^https?:/i.test(href) && el.link.newTab !== false)
    ? ' target="_blank" rel="noopener"' : '';
  return `<a class="ws-link" href="${esc(href)}"${target}>${inner}</a>`;
}

// ---------------------------------------------------------------------------
// Element renderers: return inner HTML + extra CSS for the visual box
// ---------------------------------------------------------------------------
const R = {};

R.text = (el) => ({
  vis: '',
  inner: `<div class="ws-txt" style="${valignStyle(el)}">${el.html || ''}</div>`,
  css: `#${el.id} .ws-txt{${typeCSS(el)}padding:${el.pad ?? 6}px;${textShadowCSS(el.textShadow)}}`,
});

function valignStyle(el) {
  return el.valign && el.valign !== 'top' ? `justify-content:${el.valign === 'middle' ? 'center' : 'flex-end'}` : '';
}

R.shape = (el) => {
  const s = SHAPES[el.shape] || SHAPES.rect;
  const st = el.stroke || {};
  if (s.line) {
    const w = st.width || 2;
    const dash = st.style === 'dashed' ? `stroke-dasharray="${w * 4} ${w * 3}"` : st.style === 'dotted' ? `stroke-dasharray="0 ${w * 2}" stroke-linecap="round"` : '';
    const head = el.arrow ? `<polygon points="${el.w},${el.h / 2} ${el.w - w * 5},${el.h / 2 - w * 3} ${el.w - w * 5},${el.h / 2 + w * 3}" fill="${st.color || '#000'}"/>` : '';
    return {
      vis: 'background:transparent;',
      inner: `<svg class="ws-svg" viewBox="0 0 ${el.w} ${el.h}" preserveAspectRatio="none"><line x1="0" y1="${el.h / 2}" x2="${el.arrow ? el.w - w * 4 : el.w}" y2="${el.h / 2}" stroke="${st.color || '#000'}" stroke-width="${w}" ${dash}/>${head}</svg>`,
      css: '',
      noFill: true,
    };
  }
  if (s.css) {
    const radius = el.shape === 'ellipse' ? '50%' : el.shape === 'rounded' ? `${el.radius ?? 18}px` : `${el.radius || 0}px`;
    const border = st.width ? `border:${st.width}px ${st.style || 'solid'} ${st.color};` : '';
    return { vis: `border-radius:${radius};${border}`, inner: shapeText(el), css: shapeTextCSS(el) };
  }
  const stroke = st.width
    ? `<svg class="ws-svg ws-outline" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${s.d}" fill="none" stroke="${st.color}" stroke-width="${st.width}" vector-effect="non-scaling-stroke" ${st.style === 'dashed' ? `stroke-dasharray="${st.width * 4} ${st.width * 3}"` : st.style === 'dotted' ? `stroke-dasharray="0 ${st.width * 2}" stroke-linecap="round"` : ''}/></svg>`
    : '';
  return { vis: `clip-path:url(#ws-clip-${el.shape});`, inner: shapeText(el), after: stroke, css: shapeTextCSS(el) };
};

function shapeText(el) {
  return el.html ? `<div class="ws-txt ws-shape-txt">${el.html}</div>` : '';
}
function shapeTextCSS(el) {
  return el.html ? `#${el.id} .ws-txt{${typeCSS(el)}padding:${el.pad ?? 10}px;}` : '';
}

R.image = (el, ctx) => {
  const a = el.adjust || {};
  const filters = [
    a.brightness != null && a.brightness !== 100 ? `brightness(${a.brightness}%)` : '',
    a.contrast != null && a.contrast !== 100 ? `contrast(${a.contrast}%)` : '',
    a.saturate != null && a.saturate !== 100 ? `saturate(${a.saturate}%)` : '',
    a.grayscale ? `grayscale(${a.grayscale}%)` : '',
    a.sepia ? `sepia(${a.sepia}%)` : '',
    a.hue ? `hue-rotate(${a.hue}deg)` : '',
    a.blur ? `blur(${a.blur}px)` : '',
  ].filter(Boolean).join(' ');
  const frame = FRAMES[el.frame || 'none'] || '';
  let mask = '';
  if (el.mask === 'circle') mask = 'border-radius:50%;';
  else if (el.mask === 'rounded') mask = `border-radius:${el.radius || 24}px;`;
  else if (el.mask && el.mask !== 'none') mask = `clip-path:url(#ws-clip-${el.mask});`;
  const imgCSS = `#${el.id} img{object-fit:${el.fit || 'cover'};object-position:${el.posX ?? 50}% ${el.posY ?? 50}%;${filters ? `filter:${filters};` : ''}${el.frame && el.frame !== 'none' ? '' : mask}}`;
  const src = el.asset ? ctx.asset(el.asset, el.w) : '';
  const caption = el.frame === 'polaroid' && el.caption
    ? `<div class="ws-polaroid-cap" style="font-family:${fontStack(el.captionFont || 'Caveat')}">${esc(el.caption)}</div>` : '';
  const tape = el.frame === 'tape' ? '<i class="ws-tape"></i>' : '';
  let inner;
  if (src) inner = `<img src="${esc(src)}" alt="${esc(el.alt || '')}" loading="lazy" draggable="false">`;
  else if (ctx.mode === 'editor') inner = `<div class="ws-placeholder"><span>Drag a photo here</span></div>`;
  else inner = `<div class="ws-placeholder-out"></div>`;
  const frameMask = el.frame && el.frame !== 'none' && mask ? mask : '';
  return {
    vis: frame + frameMask,
    inner: inner + caption + tape,
    css: imgCSS,
    noFill: !!frame,
  };
};

R.button = (el) => ({
  vis: `border-radius:${el.radius ?? 8}px;${el.stroke?.width ? `border:${el.stroke.width}px solid ${el.stroke.color};` : ''}`,
  inner: `<span class="ws-btn-label">${esc(el.label || 'Button')}</span>`,
  css: `#${el.id} .ws-vis{display:flex;align-items:center;justify-content:center;${typeCSS(el)}cursor:pointer;transition:background .2s,color .2s,transform .2s,box-shadow .2s}` +
    (el.hoverFill ? `#${el.id} .ws-link:hover .ws-vis,#${el.id} .ws-vis:hover{background:${el.hoverFill};${el.hoverColor ? `color:${el.hoverColor};` : ''}}` : ''),
});

R.navbar = (el, ctx) => {
  const pages = ctx.project.pages.filter((p) => p.showInNav !== false);
  const items = pages.map((p) => {
    const active = p.id === ctx.page.id;
    return `<a href="${esc(ctx.href(p.id))}" class="${active ? 'on' : ''}">${esc(p.navTitle || p.name)}</a>`;
  }).join('');
  const style = el.navStyle || 'plain';
  const accent = el.accent || el.activeColor || '#2a7ae2';
  const vertical = el.orient === 'v';
  return {
    vis: '',
    inner: `<nav class="ws-nav ws-nav-${style}${vertical ? ' ws-nav-v' : ''}" aria-label="Site">${items}</nav>`,
    css: `#${el.id} .ws-nav{${typeCSS(el)}justify-content:${vertical ? 'flex-start' : ({ left: 'flex-start', center: 'center', right: 'flex-end' }[el.align || 'left'])};gap:${el.gap ?? 22}px;${vertical ? `align-items:${({ left: 'flex-start', center: 'center', right: 'flex-end' }[el.align || 'left'])};` : ''}--accent:${accent};--active:${el.activeColor || accent};--hover:${el.hoverColor || accent};--on-accent:${el.onAccent || '#fff'}}`,
  };
};

const ASPECTS = { '1': 1, '4/3': 3 / 4, '3/2': 2 / 3, '16/9': 9 / 16, '3/4': 4 / 3, '2/3': 3 / 2 };
R.gallery = (el, ctx) => {
  const imgs = (el.images || []).filter((i) => i.asset);
  const cols = el.cols || 3;
  const gap = el.gap ?? 12;
  const thumbW = Math.round((el.w - gap * (cols - 1)) / cols);
  const group = el.id;
  const cells = imgs.map((im, i) => {
    const full = ctx.asset(im.asset, 2000);
    const th = ctx.asset(im.asset, thumbW);
    const cap = el.captions && im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : '';
    return `<figure class="ws-cell"><a href="${esc(full)}" data-lb="${group}" data-cap="${esc(im.caption || '')}" data-i="${i}"><img src="${esc(th)}" alt="${esc(im.caption || '')}" loading="lazy" draggable="false"></a>${cap}</figure>`;
  }).join('');
  const empty = !imgs.length && ctx.mode === 'editor'
    ? '<div class="ws-placeholder"><span>Drag photos here to build a gallery</span></div>' : '';
  const ratio = ASPECTS[el.aspect || '1'];
  return {
    vis: '',
    inner: empty || `<div class="ws-grid">${cells}</div>`,
    css: `#${el.id} .ws-grid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap}px}` +
      `#${el.id} .ws-cell a{display:block;overflow:hidden;border-radius:${el.thumbRadius ?? 4}px;${ratio ? `aspect-ratio:1/${ratio};` : ''}background:rgba(127,127,127,.15)}` +
      `#${el.id} .ws-cell img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s cubic-bezier(.2,.7,.2,1),filter .3s}` +
      (el.hoverZoom !== false ? `#${el.id} .ws-cell a:hover img{transform:scale(1.06)}` : '') +
      `#${el.id} figcaption{font-family:${fontStack(el.captionFont || 'Helvetica')};font-size:${el.captionSize || 13}px;color:${el.captionColor || '#666'};text-align:center;margin-top:6px}`,
    grow: true,
  };
};

R.slideshow = (el, ctx) => {
  const imgs = (el.images || []).filter((i) => i.asset);
  if (!imgs.length) {
    return { vis: 'background:rgba(127,127,127,.15);', inner: ctx.mode === 'editor' ? '<div class="ws-placeholder"><span>Drag photos here for a slideshow</span></div>' : '', css: '' };
  }
  const slides = imgs.map((im, i) =>
    `<figure class="ws-slide${i === 0 ? ' on' : ''}"><img src="${esc(ctx.asset(im.asset, el.w))}" alt="${esc(im.caption || '')}" draggable="false">${el.captions && im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ''}</figure>`).join('');
  const dots = el.dots !== false ? `<div class="ws-dots">${imgs.map((_, i) => `<button aria-label="Slide ${i + 1}" class="${i === 0 ? 'on' : ''}"></button>`).join('')}</div>` : '';
  const arrows = el.arrows !== false ? '<button class="ws-prev" aria-label="Previous">‹</button><button class="ws-next" aria-label="Next">›</button>' : '';
  return {
    vis: `border-radius:${el.radius || 0}px;overflow:hidden;`,
    inner: `<div class="ws-slides ws-tr-${el.transition || 'fade'}" data-interval="${el.interval || 5}" data-autoplay="${el.autoplay !== false}">${slides}${arrows}${dots}</div>`,
    css: `#${el.id} .ws-slide img{object-fit:${el.fit || 'cover'}}`,
  };
};

R.video = (el, ctx) => {
  if (!el.asset) return { vis: 'background:#000;', inner: ctx.mode === 'editor' ? '<div class="ws-placeholder dark"><span>Drag a movie here</span></div>' : '', css: '' };
  const attrs = [el.controls !== false ? 'controls' : '', el.autoplay ? 'autoplay muted' : (el.muted ? 'muted' : ''), el.loop ? 'loop' : '', 'playsinline', 'preload="metadata"'].filter(Boolean).join(' ');
  const poster = el.poster ? ` poster="${esc(ctx.asset(el.poster, el.w))}"` : '';
  return {
    vis: `border-radius:${el.radius || 0}px;overflow:hidden;background:#000;`,
    inner: `<video src="${esc(ctx.asset(el.asset))}"${poster} ${ctx.mode === 'editor' ? 'muted preload="metadata"' : attrs}></video>`,
    css: `#${el.id} video{object-fit:${el.fit || 'cover'}}`,
  };
};

R.audio = (el, ctx) => ({
  vis: '',
  inner: el.asset
    ? `<audio src="${esc(ctx.asset(el.asset))}" ${ctx.mode === 'editor' ? '' : `controls ${el.autoplay ? 'autoplay' : ''} ${el.loop ? 'loop' : ''}`} preload="metadata"></audio>${ctx.mode === 'editor' ? '<div class="ws-audio-ph">♪ ' + esc(ctx.project.assets[el.asset]?.name || 'Audio') + '</div>' : ''}`
    : (ctx.mode === 'editor' ? '<div class="ws-audio-ph">♪ Drag an audio file here</div>' : ''),
  css: '',
});

export function embedSrc(url) {
  if (!url) return '';
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  if (/^https:\/\//.test(url)) return url;
  return '';
}

R.embed = (el, ctx) => {
  const src = embedSrc(el.url);
  return {
    vis: `border-radius:${el.radius || 0}px;overflow:hidden;background:#000;`,
    inner: src ? `<iframe src="${esc(src)}" title="${esc(el.title || 'Video')}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : (ctx.mode === 'editor' ? '<div class="ws-placeholder dark"><span>Paste a YouTube or Vimeo link in the Inspector</span></div>' : ''),
    css: '',
  };
};

R.map = (el, ctx) => {
  const q = encodeURIComponent(el.address || 'Toronto, Ontario');
  const src = `https://maps.google.com/maps?q=${q}&z=${el.zoom || 14}&output=embed`;
  const ph = ctx.mode === 'editor' ? `<div class="ws-map-ph"><b>📍</b><span>${esc(el.address || '')}</span></div>` : '';
  return {
    vis: `border-radius:${el.radius || 0}px;overflow:hidden;background:#dfe6e9;`,
    inner: ph + `<iframe src="${esc(src)}" title="Map of ${esc(el.address || '')}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
    css: '',
  };
};

R.form = (el, ctx) => {
  const f = el.fields || { name: true, email: true, subject: false, message: true };
  const accent = el.accent || '#2a7ae2';
  const action = el.action ? esc(el.action) : `mailto:${esc(el.email || '')}`;
  const field = (k, label, type = 'text') =>
    f[k] ? `<label><span>${label}</span>${type === 'area' ? `<textarea name="${k}" rows="5" required></textarea>` : `<input name="${k}" type="${type}" ${k === 'subject' ? '' : 'required'}>`}</label>` : '';
  return {
    vis: '',
    inner: `<form class="ws-form" method="post" action="${action}" ${el.action ? '' : 'data-mailto="1" enctype="text/plain"'} ${ctx.mode === 'editor' ? 'onsubmit="return false"' : ''}>` +
      field('name', esc(el.labels?.name || 'Name')) + field('email', esc(el.labels?.email || 'Email'), 'email') +
      field('subject', esc(el.labels?.subject || 'Subject')) + field('message', esc(el.labels?.message || 'Message'), 'area') +
      `<button type="submit">${esc(el.submit || 'Send Message')}</button><p class="ws-form-ok" hidden>${esc(el.thanks || 'Thanks! Your message is on its way.')}</p></form>`,
    css: `#${el.id} .ws-form{${typeCSS(el)}--accent:${accent};--field:${el.fieldBg || 'rgba(127,127,127,.08)'};--line:${el.lineColor || 'rgba(127,127,127,.35)'}}`,
    grow: true,
  };
};

R.html = (el, ctx) => {
  if (ctx.mode === 'editor') {
    const doc = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:sans-serif}</style></head><body>${el.code || ''}</body></html>`;
    return { vis: '', inner: el.code ? `<iframe class="ws-snippet" sandbox="allow-scripts" srcdoc="${esc(doc)}"></iframe>` : '<div class="ws-placeholder"><span>&lt;/&gt; Add HTML in the Inspector</span></div>', css: '' };
  }
  return { vis: '', inner: `<div class="ws-snippet-out">${el.code || ''}</div>`, css: '' };
};

R.blogfeed = (el, ctx) => {
  const blogPage = ctx.project.pages.find((p) => p.id === (el.blogPage || ctx.page.id) && p.type === 'blog')
    || ctx.project.pages.find((p) => p.type === 'blog');
  const css = `#${el.id} .ws-feed{${typeCSS(el)}--accent:${el.accent || '#2a7ae2'};--muted:${el.muted || '#888'};--title-font:${fontStack(el.titleFont || el.font || 'Helvetica')};--title-size:${el.titleSize || 26}px;--title-color:${el.titleColor || el.color || '#222'};--rule:${el.rule || 'rgba(127,127,127,.25)'}}`;
  if (ctx.entry) {
    // Rendering a single entry page: the feed slot shows the full article
    const e = ctx.entry;
    const img = e.image ? `<img class="ws-entry-hero" src="${esc(ctx.asset(e.image, el.w))}" alt="">` : '';
    const nav = ctx.entryNav || {};
    return {
      vis: '', grow: true, css,
      inner: `<article class="ws-feed ws-entry"><p class="ws-entry-date">${esc(formatDate(e.date))}</p><h1 class="ws-entry-title">${esc(e.title)}</h1>${img}<div class="ws-entry-body">${hydrateAssets(e.html, (id) => ctx.asset(id, el.w))}</div>` +
        `<nav class="ws-entry-nav">${nav.prev ? `<a href="${esc(nav.prev.href)}">‹ ${esc(nav.prev.title)}</a>` : '<span></span>'}<a href="${esc(nav.index)}">All posts</a>${nav.next ? `<a href="${esc(nav.next.href)}">${esc(nav.next.title)} ›</a>` : '<span></span>'}</nav></article>`,
    };
  }
  if (!blogPage) return { vis: '', css, inner: ctx.mode === 'editor' ? '<div class="ws-placeholder"><span>Add a Blog page to show posts here</span></div>' : '' };
  const entries = [...blogPage.blog.entries].filter((e) => !e.draft).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, el.count || 10);
  const layout = el.layout || 'list';
  const items = entries.map((e) => {
    const href = ctx.entryHref(blogPage, e);
    const img = el.showImage !== false && e.image ? `<a class="ws-post-img" href="${esc(href)}"><img src="${esc(ctx.asset(e.image, layout === 'cards' ? 480 : 360))}" alt="" loading="lazy" draggable="false"></a>` : '';
    const excerpt = el.excerpt !== false ? `<p class="ws-post-ex">${esc(stripHtml(e.html).slice(0, el.excerptLen || 220))}${stripHtml(e.html).length > (el.excerptLen || 220) ? '…' : ''}</p>` : '';
    return `<article class="ws-post">${img}<div class="ws-post-body"><p class="ws-post-date">${esc(formatDate(e.date))}</p><h2 class="ws-post-title"><a href="${esc(href)}">${esc(e.title)}</a></h2>${excerpt}<a class="ws-more" href="${esc(href)}">Continue reading →</a></div></article>`;
  }).join('');
  return {
    vis: '', css, grow: true,
    inner: `<div class="ws-feed ws-feed-${layout}">${items || (ctx.mode === 'editor' ? '<p class="ws-post-ex">No posts yet. Add one from the sidebar.</p>' : '')}</div>`,
  };
};

// ---------------------------------------------------------------------------
export function renderElement(el, ctx) {
  const r = (R[el.type] || R.text)(el, ctx);
  const wrapperCSS = [
    `left:${Math.round(el.x)}px;top:${Math.round(el.y)}px;width:${Math.round(el.w)}px;`,
    r.grow ? `min-height:${Math.round(el.h)}px;` : `height:${Math.round(el.h)}px;`,
    el.rot ? `transform:rotate(${el.rot}deg);` : '',
    el.opacity != null && el.opacity < 1 ? `opacity:${el.opacity};` : '',
    el.shadow?.on ? `filter:${shadowFilter(el.shadow)};` : '',
  ].join('');
  const visCSS = [
    r.noFill ? '' : fillCSS(el.fill, ctx, el.w),
    el.type !== 'shape' && el.type !== 'image' && el.type !== 'button' && el.radius ? `border-radius:${el.radius}px;` : '',
    el.type !== 'shape' && el.type !== 'button' && el.type !== 'image' && el.stroke?.width ? `border:${el.stroke.width}px ${el.stroke.style || 'solid'} ${el.stroke.color};` : '',
    el.type === 'image' && !el.frame && el.stroke?.width ? `border:${el.stroke.width}px ${el.stroke.style || 'solid'} ${el.stroke.color};` : '',
    r.vis || '',
    reflectCSS(el.reflection),
  ].join('');

  const cls = ['ws-el', 'ws-' + el.type];
  if (el.hover && el.hover !== 'none') cls.push('ws-hv-' + el.hover);
  if (r.grow) cls.push('ws-grow');
  const data = [
    el.anim && el.anim !== 'none' ? ` data-anim="${el.anim}"` : '',
    el.animDelay ? ` style="--delay:${el.animDelay}s"` : '',
    r.grow ? ` data-grow="1"` : '',
    ` data-y="${Math.round(el.y)}" data-h="${Math.round(el.h)}"`,
  ].join('');
  const vis = `<div class="ws-vis">${r.inner}</div>${r.after || ''}`;
  const html = `<div class="${cls.join(' ')}" id="${el.id}"${data}>${wrapLink(vis, el, ctx)}</div>`;
  const css = `#${el.id}{${wrapperCSS}}#${el.id} .ws-vis{${visCSS}}${r.css || ''}`;
  return { html, css };
}

/** CSS for the page box itself */
export function pageCSS(page, site, theme, ctx) {
  const bg = page.bg || theme.page;
  const body = site.bodyFill || theme.body;
  const w = site.width || 980;
  return {
    body: fillCSS(body, ctx, 1920) + (body.type === 'image' ? 'background-attachment:fixed;' : ''),
    page: `width:${w}px;height:${page.height}px;${fillCSS(bg.fill || bg, ctx, w)}` +
      `${bg.shadow ? 'box-shadow:0 0 0 1px rgba(0,0,0,.04),0 18px 60px rgba(0,0,0,.28);' : ''}` +
      `${bg.radius ? `border-radius:${bg.radius}px;` : ''}` +
      `${bg.border ? `border:1px solid ${bg.border};` : ''}`,
    margin: (bg.margin ?? theme.page.margin ?? 0),
  };
}

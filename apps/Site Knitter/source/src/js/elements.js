// Element factories with sensible defaults
import { uid } from './util.js';

const base = (type, x, y, w, h, extra = {}) => ({
  id: uid('e'),
  type, x, y, w, h,
  rot: 0,
  opacity: 1,
  locked: false,
  fill: { type: 'none', color: '#ffffff', color2: '#dddddd', angle: 180 },
  stroke: { width: 0, color: '#000000', style: 'solid' },
  radius: 0,
  shadow: { on: false, x: 0, y: 8, blur: 20, color: '#000000', alpha: 0.3 },
  reflection: { on: false, opacity: 0.3, size: 0.4, gap: 2 },
  link: { type: 'none' },
  anim: 'none',
  hover: 'none',
  ...extra,
});

export const make = {
  text: (x, y, w, h, html, o = {}) => base('text', x, y, w, h, {
    html: html ?? '<p>Double-click to edit this text. Write something wonderful.</p>',
    font: 'Lato', size: 16, color: '#333333', lineHeight: 1.6, letter: 0, align: 'left', valign: 'top', pad: 6,
    textShadow: { on: false, x: 0, y: 2, blur: 6, color: '#000000', alpha: 0.4 },
    ...o,
  }),
  image: (x, y, w, h, asset = null, o = {}) => base('image', x, y, w, h, {
    asset, fit: 'cover', posX: 50, posY: 50, mask: 'none', frame: 'none', alt: '', caption: '',
    adjust: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hue: 0, blur: 0 },
    ...o,
  }),
  shape: (shape, x, y, w, h, o = {}) => base('shape', x, y, w, h, {
    shape,
    fill: { type: shape === 'line' ? 'none' : 'color', color: '#6c8ebf', color2: '#3b5b8f', angle: 135 },
    stroke: { width: shape === 'line' ? 2 : 0, color: '#333333', style: 'solid' },
    radius: shape === 'rounded' ? 18 : 0,
    html: '', font: 'Lato', size: 18, color: '#ffffff', align: 'center', lineHeight: 1.4, pad: 10,
    arrow: false,
    ...o,
  }),
  button: (x, y, w, h, label = 'Learn More', o = {}) => base('button', x, y, w, h, {
    label, font: 'Lato', size: 16, weight: 700, color: '#ffffff', letter: 0.5, align: 'center',
    fill: { type: 'color', color: '#2a7ae2', color2: '#1d5fb8', angle: 180 },
    hoverFill: '#1d5fb8', hoverColor: '', radius: 8, hover: 'lift',
    link: { type: 'url', url: 'https://' },
    ...o,
  }),
  navbar: (x, y, w, h, o = {}) => base('navbar', x, y, w, h, {
    font: 'Lato', size: 15, color: '#555555', activeColor: '#111111', hoverColor: '#111111', accent: '#2a7ae2',
    navStyle: 'underline', align: 'left', orient: 'h', gap: 26, letter: 0.5, upper: false,
    role: 'nav',
    ...o,
  }),
  gallery: (x, y, w, h, images = [], o = {}) => base('gallery', x, y, w, h, {
    images, cols: 3, gap: 14, aspect: '1', captions: true, thumbRadius: 4, hoverZoom: true,
    captionFont: 'Lato', captionSize: 13, captionColor: '#777777',
    ...o,
  }),
  slideshow: (x, y, w, h, images = [], o = {}) => base('slideshow', x, y, w, h, {
    images, interval: 5, transition: 'fade', autoplay: true, arrows: true, dots: true, captions: true, fit: 'cover', radius: 0,
    ...o,
  }),
  video: (x, y, w, h, asset = null, o = {}) => base('video', x, y, w, h, { asset, poster: null, controls: true, autoplay: false, loop: false, muted: false, fit: 'cover', ...o }),
  audio: (x, y, w, h, asset = null, o = {}) => base('audio', x, y, w, h, { asset, autoplay: false, loop: false, ...o }),
  embed: (x, y, w, h, url = '', o = {}) => base('embed', x, y, w, h, { url, title: 'Video', ...o }),
  map: (x, y, w, h, address = 'CN Tower, Toronto', o = {}) => base('map', x, y, w, h, { address, zoom: 14, ...o }),
  form: (x, y, w, h, o = {}) => base('form', x, y, w, h, {
    font: 'Lato', size: 15, color: '#333333', accent: '#2a7ae2', email: 'you@example.com', action: '',
    fields: { name: true, email: true, subject: false, message: true }, submit: 'Send Message',
    ...o,
  }),
  html: (x, y, w, h, o = {}) => base('html', x, y, w, h, { code: '<div style="padding:16px;text-align:center">Hello from HTML ✨</div>', ...o }),
  blogfeed: (x, y, w, h, o = {}) => base('blogfeed', x, y, w, h, {
    font: 'Lato', size: 16, color: '#444444', titleFont: 'Playfair Display', titleSize: 28, titleColor: '#222222',
    accent: '#2a7ae2', muted: '#999999', count: 10, excerpt: true, showImage: true, layout: 'list', lineHeight: 1.6,
    role: 'feed',
    ...o,
  }),
};

export const TYPE_LABELS = {
  text: 'Text Box', image: 'Image', shape: 'Shape', button: 'Button', navbar: 'Navigation Menu', gallery: 'Photo Gallery',
  slideshow: 'Slideshow', video: 'Movie', audio: 'Audio', embed: 'Web Video', map: 'Map', form: 'Contact Form',
  html: 'HTML Snippet', blogfeed: 'Blog Feed',
};

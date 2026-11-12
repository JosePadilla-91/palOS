// The Inspector: context-sensitive property panels
import { state, on, emit, mutate, currentPage, selectedElements, currentEntry } from './store.js';
import { FONTS } from './fonts.js';
import { SHAPES, MASKS } from './shapes.js';
import { FRAME_NAMES, ANIMS, HOVERS, embedSrc } from './render.js';
import { themeById } from './themes.js';
import { TYPE_LABELS } from './elements.js';
import { assetUrl } from './media.js';
import { chooseAsset, chooseTheme } from './dialogs.js';
import { h, clone, slugify } from './util.js';
import { uniqueSlug } from './themes.js';
import { uniqueEntrySlug } from './blog.js';
import { icon } from './icons.js';

let root, tabsEl, bodyEl;
let tab = 'auto';
let refreshers = [];

const TAB_DEFS = {
  site: { icon: 'site', title: 'Site' },
  page: { icon: 'page', title: 'Page' },
  layout: { icon: 'layout', title: 'Size & Position' },
  style: { icon: 'style', title: 'Fill, Stroke & Effects' },
  text: { icon: 'text', title: 'Text' },
  media: { icon: 'content', title: 'Content' },
  link: { icon: 'link', title: 'Link' },
  motion: { icon: 'motion', title: 'Animation' },
};

export function initInspector(el) {
  root = el;
  tabsEl = h('div', { class: 'insp-tabs' });
  bodyEl = h('div', { class: 'insp-body' });
  root.append(tabsEl, bodyEl);
  const rebuild = () => build();
  on('project', rebuild);
  on('page', () => { if (tab !== 'site') tab = 'auto'; build(); });
  on('selection', () => { if (['site', 'page'].includes(tab) && state.selection.length) tab = 'auto'; build(); });
  on('change', refresh);
  on('assets', rebuild);
  on('pages', refresh);
  document.addEventListener('ws-inspector-tab', (e) => { tab = e.detail; build(); });
  build();
}

function availableTabs() {
  const sel = selectedElements();
  if (!sel.length) return ['site', 'page'];
  const t = sel[0].type;
  const tabs = ['layout', 'style'];
  if (['text', 'shape', 'button', 'navbar', 'blogfeed', 'form'].includes(t)) tabs.push('text');
  if (['image', 'gallery', 'slideshow', 'video', 'audio', 'embed', 'map', 'html', 'navbar', 'blogfeed', 'form', 'shape', 'button'].includes(t)) tabs.push('media');
  if (['text', 'image', 'shape', 'button'].includes(t)) tabs.push('link');
  tabs.push('motion');
  return ['site', 'page', ...tabs];
}

function build() {
  if (!root) return;
  refreshers = [];
  tabsEl.innerHTML = '';
  bodyEl.innerHTML = '';
  if (!state.project) return;
  const avail = availableTabs();
  if (tab === 'auto' || !avail.includes(tab)) {
    const sel = selectedElements();
    tab = !sel.length ? 'page' : ['image', 'gallery', 'slideshow', 'video', 'audio', 'embed', 'map', 'html', 'blogfeed', 'form'].includes(sel[0].type) ? 'media' : sel[0].type === 'text' ? 'text' : 'style';
  }
  for (const k of avail) {
    tabsEl.append(h('button', { class: 'insp-tab' + (k === tab ? ' on' : ''), title: TAB_DEFS[k].title, onclick: () => { tab = k; build(); } }, icon(TAB_DEFS[k].icon, 18)));
  }
  const sel = selectedElements();
  const heading = sel.length > 1 ? `${sel.length} items` : sel.length ? (TYPE_LABELS[sel[0].type] || sel[0].type) : TAB_DEFS[tab].title;
  bodyEl.append(h('div', { class: 'insp-title' }, h('span', {}, TAB_DEFS[tab].title), sel.length ? h('em', {}, heading) : ''));
  const panel = { site: sitePanel, page: pagePanel, layout: layoutPanel, style: stylePanel, text: textPanel, media: mediaPanel, link: linkPanel, motion: motionPanel }[tab];
  panel(bodyEl, sel);
}

function refresh() {
  for (const r of refreshers) {
    try { r(); } catch (e) { /* control may be stale */ }
  }
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
const section = (title, ...kids) => h('div', { class: 'insp-sec' }, title ? h('h4', {}, title) : '', ...kids);
const row = (label, ...ctrls) => h('div', { class: 'insp-row' }, h('label', {}, label), h('div', { class: 'insp-ctrl' }, ...ctrls));

/** Apply a change to every selected element */
function edit(fn, key) {
  const ids = [...state.selection];
  mutate(() => { for (const el of selectedElements()) fn(el); }, { key: key ? key + ':' + ids.join(',') : undefined });
}

function bindRefresh(input, get, prop = 'value') {
  const r = () => { if (document.activeElement !== input) { const v = get(); input[prop] = v ?? (prop === 'checked' ? false : ''); } };
  refreshers.push(r);
  r();
  return input;
}

function num(get, set, { min = -99999, max = 99999, step = 1, unit = '', key } = {}) {
  const input = h('input', {
    type: 'number', min, max, step, class: 'num',
    onchange: (e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) set(Math.min(max, Math.max(min, v))); },
  });
  bindRefresh(input, () => { const v = get(); return v == null ? '' : Math.round(v * 100) / 100; });
  return unit ? h('span', { class: 'num-wrap' }, input, h('i', {}, unit)) : input;
}

function slider(get, set, { min = 0, max = 100, step = 1, key = 'slider', fmt = (v) => v } = {}) {
  const out = h('output', {});
  const input = h('input', {
    type: 'range', min, max, step,
    oninput: (e) => { const v = parseFloat(e.target.value); out.textContent = fmt(v); set(v, key); },
  });
  bindRefresh(input, get);
  refreshers.push(() => { out.textContent = fmt(parseFloat(input.value)); });
  out.textContent = fmt(parseFloat(input.value));
  return h('span', { class: 'slider' }, input, out);
}

function color(get, set, key = 'color') {
  const input = h('input', { type: 'color', oninput: (e) => set(e.target.value, key) });
  bindRefresh(input, () => toHex(get()));
  return input;
}

function toHex(c) {
  if (!c) return '#000000';
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map((x) => x + x).join('');
  const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join('');
  return '#000000';
}

function select(options, get, set) {
  const s = h('select', { onchange: (e) => set(e.target.value) },
    ...options.map((o) => Array.isArray(o) ? h('option', { value: o[0] }, o[1]) : h('option', { value: o }, cap(o))));
  bindRefresh(s, () => String(get() ?? ''));
  return s;
}

function check(get, set, label = '') {
  const input = h('input', { type: 'checkbox', onchange: (e) => set(e.target.checked) });
  bindRefresh(input, get, 'checked');
  return h('label', { class: 'check' }, input, label ? ' ' + label : '');
}

function text(get, set, { placeholder = '', area = false, key = 'text', commit = false } = {}) {
  const input = h(area ? 'textarea' : 'input', {
    type: 'text', placeholder, class: 'full', rows: area ? 6 : undefined,
    [commit ? 'onchange' : 'oninput']: (e) => set(e.target.value, key),
  });
  bindRefresh(input, get);
  return input;
}

function seg(options, get, set) {
  const wrap = h('div', { class: 'seg' });
  const draw = () => {
    wrap.innerHTML = '';
    for (const [v, label, title] of options) {
      wrap.append(h('button', { class: String(get()) === String(v) ? 'on' : '', title: title || '', onclick: () => { set(v); draw(); } }, label));
    }
  };
  refreshers.push(draw);
  draw();
  return wrap;
}

function fontSelect(get, set) {
  const s = h('select', { class: 'font-select', onchange: (e) => set(e.target.value) },
    h('optgroup', { label: 'Bundled fonts' }, ...FONTS.filter((f) => !f.system).map((f) => h('option', { value: f.name, style: { fontFamily: `'${f.name}'` } }, f.name))),
    h('optgroup', { label: 'System fonts' }, ...FONTS.filter((f) => f.system).map((f) => h('option', { value: f.name }, f.name))));
  bindRefresh(s, get);
  return s;
}

function swatches(set) {
  const t = themeById(state.project.site.theme);
  const cols = [...new Set([t.colors.accent, t.colors.heading, t.colors.text, t.colors.muted, '#ffffff', '#000000', ...t.palette])];
  return h('div', { class: 'swatches' }, ...cols.map((c) => h('button', { style: { background: c }, title: c, onclick: () => set(c) })));
}

function fillEditor(get, set, { allowImage = true } = {}) {
  const wrap = h('div', { class: 'fill-ed' });
  const draw = () => {
    wrap.innerHTML = '';
    const f = get() || { type: 'none' };
    const upd = (patch, key) => set({ ...clone(f), ...patch }, key);
    wrap.append(seg([['none', 'None'], ['color', 'Color'], ['gradient', 'Gradient'], ...(allowImage ? [['image', 'Image']] : [])],
      () => f.type, (v) => { upd({ type: v, color: f.color || '#ffffff', color2: f.color2 || '#888888', angle: f.angle ?? 180 }); draw(); }));
    if (f.type === 'color') {
      wrap.append(row('Color', color(() => f.color, (v) => upd({ color: v }, 'fillc')), swatches((c) => { upd({ color: c }); draw(); })));
    } else if (f.type === 'gradient') {
      wrap.append(
        row('From', color(() => f.color, (v) => upd({ color: v }, 'fillg1'))),
        row('To', color(() => f.color2, (v) => upd({ color2: v }, 'fillg2'))),
        row('Angle', slider(() => f.angle ?? 180, (v) => upd({ angle: v }, 'fillang'), { min: 0, max: 360, fmt: (v) => v + '°' })),
        row('', check(() => f.radial, (v) => { upd({ radial: v }); }, 'Radial')),
      );
    } else if (f.type === 'image') {
      const prev = h('div', { class: 'fill-prev', style: { backgroundImage: f.asset ? `url('${assetUrl(f.asset)}')` : 'none' } });
      wrap.append(
        h('div', { class: 'fill-img' }, prev, h('button', { class: 'btn small', onclick: async () => { const id = await chooseAsset('image'); if (id) { upd({ asset: id }); draw(); } } }, f.asset ? 'Change…' : 'Choose…')),
        row('Scale', select([['cover', 'Fill'], ['contain', 'Fit'], ['tile', 'Tile']], () => f.fit || 'cover', (v) => upd({ fit: v }))),
      );
    }
  };
  refreshers.push(() => { if (!wrap.contains(document.activeElement)) draw(); });
  draw();
  return wrap;
}

const cap = (s) => String(s).replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const first = (sel) => sel[0];

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------
function sitePanel(body) {
  const site = state.project.site;
  const set = (k) => (v, key) => mutate(() => { site[k] = v; }, { key: 'site-' + (key || k), events: ['change', 'pages'] });
  const t = themeById(site.theme);
  body.append(
    section('Site',
      row('Name', text(() => site.name, set('name'))),
      row('Description', text(() => site.description, set('description'), { area: true, placeholder: 'Used by search engines and link previews' })),
      row('Author', text(() => site.author, set('author'))),
      row('Language', text(() => site.language, set('language'), { placeholder: 'en' })),
    ),
    section('Theme',
      h('div', { class: 'theme-current' }, h('b', {}, t.name),
        h('button', { class: 'btn small', onclick: () => emit('command', { cmd: 'theme' }) }, 'Change Theme…')),
      row('Background', fillEditor(() => site.bodyFill || t.body, (v, key) => mutate(() => { site.bodyFill = v; }, { key: 'bodyfill-' + (key || '') }))),
      site.bodyFill ? h('button', { class: 'btn small ghost', onclick: () => mutate(() => { delete site.bodyFill; }) }, 'Reset to theme background') : '',
      row('Page width', num(() => site.width, (v) => mutate(() => { site.width = v; }), { min: 600, max: 1600, unit: 'px' })),
    ),
    section('Publishing',
      row('Site URL', text(() => site.baseUrl, set('baseUrl'), { placeholder: 'https://www.example.com/', commit: true })),
      h('p', { class: 'hint' }, 'Setting the address enables sitemap.xml, canonical links and absolute RSS links.'),
      row('Favicon', faviconCtrl(site)),
      row('Head code', text(() => site.headCode, set('headCode'), { area: true, placeholder: '<!-- analytics, meta tags… -->', commit: true })),
    ),
  );
}

function faviconCtrl(site) {
  const wrap = h('div', { class: 'fav' });
  const draw = () => {
    wrap.innerHTML = '';
    if (site.favicon) wrap.append(h('img', { src: assetUrl(site.favicon), width: 24, height: 24 }));
    wrap.append(h('button', { class: 'btn small', onclick: async () => { const id = await chooseAsset('image'); if (id) { mutate(() => { site.favicon = id; }); draw(); } } }, site.favicon ? 'Change…' : 'Choose…'));
    if (site.favicon) wrap.append(h('button', { class: 'btn small ghost', onclick: () => { mutate(() => { site.favicon = null; }); draw(); } }, 'Clear'));
  };
  draw();
  return wrap;
}

function pagePanel(body) {
  const p = currentPage();
  if (!p) return;
  const entry = currentEntry();
  const set = (k) => (v, key) => mutate(() => { p[k] = v; }, { key: 'page-' + (key || k), events: ['change', 'pages'] });
  const t = themeById(state.project.site.theme);
  body.append(
    section('Page',
      row('Name', text(() => p.name, (v) => mutate((proj) => { p.name = v; if (!p.slugLocked) p.slug = uniqueSlug(proj, v || 'page', p.id); }, { key: 'pname-' + p.id, events: ['change', 'pages'] }))),
      row('File name', text(() => state.project.pages[0].id === p.id ? 'index' : p.slug, (v) => mutate((proj) => { p.slug = uniqueSlug(proj, v || p.name, p.id); p.slugLocked = true; }, { events: ['change', 'pages'] }), { commit: true }), h('i', { class: 'suffix' }, '.html')),
      row('', check(() => p.showInNav !== false, (v) => mutate(() => { p.showInNav = v; }, { events: ['change', 'pages'] }), 'Include in navigation menu')),
      row('Menu label', text(() => p.navTitle || '', set('navTitle'), { placeholder: p.name })),
    ),
    section('Search & Sharing',
      row('Title', text(() => p.title, set('title'), { placeholder: `${p.name} — ${state.project.site.name}` })),
      row('Description', text(() => p.description, set('description'), { area: true })),
    ),
    section('Layout',
      row('Height', num(() => p.height, (v) => mutate(() => {
        const old = p.height; p.height = v;
        for (const b of p.elements) if (b.y <= 2 && b.y + b.h >= old - 2) b.h = v - b.y;
      }), { min: 300, max: 20000, unit: 'px' })),
      row('Background', fillEditor(() => (p.bg?.fill) || t.page.fill, (v, key) => mutate(() => { p.bg = { ...(p.bg || clone(t.page)), fill: v }; }, { key: 'pagebg-' + (key || '') }))),
      row('', check(() => (p.bg || t.page).shadow, (v) => mutate(() => { p.bg = { ...(p.bg || clone(t.page)), shadow: v }; }), 'Drop shadow')),
      row('Corners', num(() => (p.bg || t.page).radius || 0, (v) => mutate(() => { p.bg = { ...(p.bg || clone(t.page)), radius: v }; }), { min: 0, max: 60, unit: 'px' })),
      row('Top margin', num(() => (p.bg || t.page).margin ?? 0, (v) => mutate(() => { p.bg = { ...(p.bg || clone(t.page)), margin: v }; }), { min: 0, max: 200, unit: 'px' })),
      p.bg ? h('button', { class: 'btn small ghost', onclick: () => mutate(() => { delete p.bg; }) }, 'Reset to theme') : '',
    ),
  );
  if (p.type === 'blog') {
    body.append(section('Blog',
      h('p', { class: 'hint' }, `${p.blog.entries.length} post(s). Select a post in the sidebar to write; the Blog Feed element on this page lists them.`),
      entry ? row('Post URL', text(() => entry.slug, (v) => mutate(() => { entry.slug = uniqueEntrySlug(p, v || entry.title, entry.id); entry.slugLocked = true; }, { events: ['change'] }), { commit: true }), h('i', { class: 'suffix' }, '.html')) : '',
    ));
  }
  body.append(section('Advanced', row('Head code', text(() => p.headCode || '', set('headCode'), { area: true, commit: true, placeholder: 'Extra <head> HTML for this page' }))));
}

function layoutPanel(body, sel) {
  const el = first(sel);
  const setAll = (k) => (v) => edit((e) => { e[k] = v; });
  body.append(
    section('Position',
      h('div', { class: 'grid2' },
        row('X', num(() => el.x, setAll('x'), { unit: 'px' })),
        row('Y', num(() => el.y, setAll('y'), { unit: 'px' }))),
      h('div', { class: 'grid2' },
        row('Width', num(() => el.w, setAll('w'), { min: 4, unit: 'px' })),
        row('Height', num(() => el.h, setAll('h'), { min: 4, unit: 'px' }))),
      row('Rotation', slider(() => el.rot || 0, (v) => edit((e) => { e.rot = v; }, 'rot'), { min: -180, max: 180, fmt: (v) => v + '°' })),
      el.type === 'image' && state.project.assets[el.asset] ? h('button', {
        class: 'btn small ghost', onclick: () => edit((e) => { const m = state.project.assets[e.asset]; if (m?.w) e.h = Math.round(e.w * m.h / m.w); }),
      }, 'Restore original proportions') : '',
    ),
    section('Arrange',
      h('div', { class: 'btn-row' },
        ...[['front', '⤒ Front'], ['forward', '↑ Forward'], ['backward', '↓ Backward'], ['back', '⤓ Back']].map(([a, l]) =>
          h('button', { class: 'btn small', onclick: () => emit('command', { cmd: 'arrange', arg: a }) }, l))),
      h('div', { class: 'btn-row icons' },
        ...[['left', '⇤', 'Align left'], ['hcenter', '⇹', 'Align centers'], ['right', '⇥', 'Align right'], ['top', '⤒', 'Align tops'], ['vcenter', '⇳', 'Align middles'], ['bottom', '⤓', 'Align bottoms']].map(([a, l, t]) =>
          h('button', { class: 'btn small', title: sel.length > 1 ? t : t + ' (to page)', onclick: () => emit('command', { cmd: 'align', arg: a }) }, l)),
        h('button', { class: 'btn small', title: 'Center on page', onclick: () => emit('command', { cmd: 'align', arg: 'page-center' }) }, '⊕')),
      sel.length > 2 ? h('div', { class: 'btn-row' },
        h('button', { class: 'btn small', onclick: () => emit('command', { cmd: 'distribute', arg: 'h' }) }, 'Distribute ↔'),
        h('button', { class: 'btn small', onclick: () => emit('command', { cmd: 'distribute', arg: 'v' }) }, 'Distribute ↕')) : '',
      row('', check(() => el.locked, (v) => edit((e) => { e.locked = v; }), 'Locked')),
    ),
  );
}

function stylePanel(body, sel) {
  const el = first(sel);
  const t = el.type;
  if (t === 'shape') {
    body.append(section('Shape', row('Shape', select(Object.entries(SHAPES).map(([k, s]) => [k, s.label]), () => el.shape, (v) => edit((e) => { if (e.type === 'shape') e.shape = v; })))));
  }
  const noFill = t === 'shape' && el.shape === 'line';
  if (!noFill && !['navbar'].includes(t)) {
    body.append(section(t === 'image' ? 'Background' : 'Fill', fillEditor(() => el.fill, (v, key) => edit((e) => { e.fill = v; }, key), { allowImage: t !== 'image' })));
  }
  if (t === 'button') body.append(section('Hover', row('Color', color(() => el.hoverFill, (v) => edit((e) => { e.hoverFill = v; }, 'hf'))), row('Text', color(() => el.hoverColor || el.color, (v) => edit((e) => { e.hoverColor = v; }, 'hc')))));

  body.append(section(noFill ? 'Line' : 'Stroke',
    row('Width', slider(() => el.stroke?.width || 0, (v) => edit((e) => { e.stroke = { ...e.stroke, width: v }; }, 'sw'), { min: 0, max: 30, fmt: (v) => v + 'px' })),
    row('Color', color(() => el.stroke?.color, (v) => edit((e) => { e.stroke = { ...e.stroke, color: v }; }, 'sc'))),
    row('Style', seg([['solid', '———'], ['dashed', '- - -'], ['dotted', '· · ·']], () => el.stroke?.style || 'solid', (v) => edit((e) => { e.stroke = { ...e.stroke, style: v }; }))),
    noFill ? row('', check(() => el.arrow, (v) => edit((e) => { e.arrow = v; }), 'Arrowhead')) : '',
  ));

  if (['shape', 'button', 'text', 'video', 'embed', 'map', 'slideshow', 'html'].includes(t) && !(t === 'shape' && ['ellipse', 'line'].includes(el.shape)) && !(t === 'shape' && SHAPES[el.shape]?.d)) {
    body.append(section('Corners', row('Radius', slider(() => el.radius || 0, (v) => edit((e) => { e.radius = v; }, 'rad'), { min: 0, max: 200, fmt: (v) => v + 'px' }))));
  }

  const sh = () => el.shadow || {};
  const setSh = (k) => (v, key) => edit((e) => { e.shadow = { ...e.shadow, [k]: v }; }, 'sh' + k);
  body.append(section('Shadow',
    row('', check(() => sh().on, setSh('on'), 'Shadow')),
    row('Color', color(() => sh().color, setSh('color'))),
    row('Opacity', slider(() => Math.round((sh().alpha ?? 0.3) * 100), (v) => setSh('alpha')(v / 100), { fmt: (v) => v + '%' })),
    row('Blur', slider(() => sh().blur ?? 20, setSh('blur'), { min: 0, max: 80, fmt: (v) => v + 'px' })),
    row('Offset', slider(() => sh().y ?? 8, setSh('y'), { min: -40, max: 60, fmt: (v) => v + 'px' })),
    row('Angle X', slider(() => sh().x ?? 0, setSh('x'), { min: -40, max: 40, fmt: (v) => v + 'px' })),
  ));
  const rf = () => el.reflection || {};
  const setRf = (k) => (v) => edit((e) => { e.reflection = { ...e.reflection, [k]: v }; }, 'rf' + k);
  body.append(section('Reflection',
    row('', check(() => rf().on, setRf('on'), 'Reflection')),
    row('Strength', slider(() => Math.round((rf().opacity ?? 0.3) * 100), (v) => setRf('opacity')(v / 100), { fmt: (v) => v + '%' })),
    row('Size', slider(() => Math.round((rf().size ?? 0.4) * 100), (v) => setRf('size')(v / 100), { min: 10, max: 100, fmt: (v) => v + '%' })),
  ));
  body.append(section('Opacity', row('Opacity', slider(() => Math.round((el.opacity ?? 1) * 100), (v) => edit((e) => { e.opacity = v / 100; }, 'op'), { fmt: (v) => v + '%' }))));
}

function textPanel(body, sel) {
  const el = first(sel);
  const set = (k) => (v, key) => edit((e) => { e[k] = v; }, key || k);
  const typeBits = [
    row('Font', fontSelect(() => el.font, set('font'))),
    row('Size', num(() => el.size, set('size'), { min: 6, max: 300, unit: 'px' }),
      seg([['', 'Regular'], ['700', 'Bold']], () => String(el.weight || ''), (v) => set('weight')(v ? +v : null))),
    row('Color', color(() => el.color, set('color')), swatches((c) => set('color')(c))),
    row('Spacing', slider(() => el.letter || 0, set('letter'), { min: -2, max: 12, step: 0.1, fmt: (v) => v + 'px', key: 'letter' })),
  ];
  if (['text', 'shape', 'blogfeed', 'form'].includes(el.type)) {
    typeBits.push(row('Line height', slider(() => el.lineHeight || 1.5, set('lineHeight'), { min: 0.8, max: 3, step: 0.05, key: 'lh' })));
  }
  if (['text', 'shape', 'button'].includes(el.type)) {
    typeBits.push(row('Align', seg([['left', '⯇'], ['center', '≡'], ['right', '⯈'], ['justify', '☰']], () => el.align || 'left', set('align'))));
  }
  if (el.type === 'text' || el.type === 'shape') {
    typeBits.push(row('Vertical', seg([['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']], () => el.valign || (el.type === 'shape' ? 'middle' : 'top'), set('valign'))));
    typeBits.push(row('Inset', slider(() => el.pad ?? 6, set('pad'), { min: 0, max: 80, fmt: (v) => v + 'px', key: 'pad' })));
  }
  typeBits.push(row('', check(() => el.italic, set('italic'), 'Italic'), check(() => el.upper, set('upper'), 'Uppercase')));
  body.append(section(el.type === 'blogfeed' ? 'Body Text' : 'Text', ...typeBits));

  if (el.type === 'text') {
    const ts = () => el.textShadow || {};
    const setTs = (k) => (v) => edit((e) => { e.textShadow = { ...e.textShadow, [k]: v }; }, 'ts' + k);
    body.append(section('Text Shadow',
      row('', check(() => ts().on, setTs('on'), 'Text shadow')),
      row('Color', color(() => ts().color, setTs('color'))),
      row('Blur', slider(() => ts().blur ?? 6, setTs('blur'), { min: 0, max: 40, fmt: (v) => v + 'px' })),
      row('Offset', slider(() => ts().y ?? 2, setTs('y'), { min: -20, max: 20, fmt: (v) => v + 'px' })),
    ));
    body.append(h('p', { class: 'hint' }, 'Double-click the text box to type. Select words to make them bold, italic, coloured or a link using the format bar.'));
  }
  if (el.type === 'button') body.append(section('Label', row('Label', text(() => el.label, set('label')))));
  if (el.type === 'navbar') {
    body.append(section('Menu Colors',
      row('Current page', color(() => el.activeColor, set('activeColor'))),
      row('Hover', color(() => el.hoverColor, set('hoverColor'))),
      row('Accent', color(() => el.accent, set('accent'))),
      row('Pill text', color(() => el.onAccent || '#ffffff', set('onAccent')))));
  }
  if (el.type === 'blogfeed') {
    body.append(section('Post Titles',
      row('Font', fontSelect(() => el.titleFont, set('titleFont'))),
      row('Size', num(() => el.titleSize, set('titleSize'), { min: 10, max: 80, unit: 'px' })),
      row('Color', color(() => el.titleColor, set('titleColor'))),
      row('Accent', color(() => el.accent, set('accent'))),
      row('Dates', color(() => el.muted, set('muted')))));
  }
  if (el.type === 'form') body.append(section('Form Colors', row('Accent', color(() => el.accent, set('accent')))));
}

function mediaPanel(body, sel) {
  const el = first(sel);
  const set = (k) => (v, key) => edit((e) => { e[k] = v; }, key || k);
  const t = el.type;

  if (t === 'image') {
    const prev = h('div', { class: 'media-prev' }, el.asset ? h('img', { src: assetUrl(el.asset) }) : h('span', { class: 'muted' }, 'No photo'));
    body.append(section('Photo', prev,
      h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: async () => { const id = await chooseAsset('image'); if (id) edit((e) => { e.asset = id; }); } }, el.asset ? 'Replace…' : 'Choose…')),
      row('Description', text(() => el.alt, set('alt'), { placeholder: 'Alt text for accessibility' })),
      row('Scaling', seg([['cover', 'Fill'], ['contain', 'Fit']], () => el.fit || 'cover', set('fit'))),
      row('Focus X', slider(() => el.posX ?? 50, set('posX'), { fmt: (v) => v + '%' })),
      row('Focus Y', slider(() => el.posY ?? 50, set('posY'), { fmt: (v) => v + '%' })),
    ));
    body.append(section('Mask & Frame',
      row('Mask', select(MASKS.map((m) => [m, cap(m)]), () => el.mask || 'none', set('mask'))),
      el.mask === 'rounded' ? row('Radius', slider(() => el.radius || 24, set('radius'), { min: 0, max: 300, fmt: (v) => v + 'px' })) : '',
      row('Frame', h('div', { class: 'frame-grid' }, ...FRAME_NAMES.map((f) => h('button', {
        class: 'frame-sw f-' + f + ((el.frame || 'none') === f ? ' on' : ''), title: cap(f),
        onclick: () => { edit((e) => { e.frame = f; }); build(); },
      }, h('i'))))),
      el.frame === 'polaroid' ? row('Caption', text(() => el.caption, set('caption'), { placeholder: 'Handwritten caption' })) : '',
    ));
    const a = () => el.adjust || {};
    const setA = (k) => (v) => edit((e) => { e.adjust = { ...e.adjust, [k]: v }; }, 'adj' + k);
    body.append(section('Adjust Image',
      row('Brightness', slider(() => a().brightness ?? 100, setA('brightness'), { min: 0, max: 200, fmt: (v) => v + '%' })),
      row('Contrast', slider(() => a().contrast ?? 100, setA('contrast'), { min: 0, max: 200, fmt: (v) => v + '%' })),
      row('Saturation', slider(() => a().saturate ?? 100, setA('saturate'), { min: 0, max: 300, fmt: (v) => v + '%' })),
      row('Black & white', slider(() => a().grayscale ?? 0, setA('grayscale'), { fmt: (v) => v + '%' })),
      row('Sepia', slider(() => a().sepia ?? 0, setA('sepia'), { fmt: (v) => v + '%' })),
      row('Tint', slider(() => a().hue ?? 0, setA('hue'), { min: -180, max: 180, fmt: (v) => v + '°' })),
      row('Blur', slider(() => a().blur ?? 0, setA('blur'), { min: 0, max: 20, step: 0.5, fmt: (v) => v + 'px' })),
      h('button', { class: 'btn small ghost', onclick: () => edit((e) => { e.adjust = { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hue: 0, blur: 0 }; }) }, 'Reset adjustments'),
    ));
  }

  if (t === 'gallery' || t === 'slideshow') {
    const list = h('div', { class: 'img-list' });
    const draw = () => {
      list.innerHTML = '';
      el.images.forEach((im, i) => {
        list.append(h('div', { class: 'img-item', draggable: true,
          ondragstart: (e) => e.dataTransfer.setData('text/x-ws-idx', String(i)),
          ondragover: (e) => e.preventDefault(),
          ondrop: (e) => {
            e.preventDefault();
            const from = +e.dataTransfer.getData('text/x-ws-idx');
            if (isNaN(from) || from === i) return;
            edit((g) => { const [m] = g.images.splice(from, 1); g.images.splice(i, 0, m); });
            draw();
          } },
        h('img', { src: assetUrl(im.asset) }),
        h('input', { type: 'text', value: im.caption || '', placeholder: 'Caption', oninput: (e) => edit((g) => { g.images[i].caption = e.target.value; }, 'cap' + i) }),
        h('button', { class: 'x', title: 'Remove', onclick: () => { edit((g) => { g.images.splice(i, 1); }); draw(); } }, '×')));
      });
      if (!el.images.length) list.append(h('p', { class: 'hint' }, 'Drag photos from the Media Browser onto the gallery, or click Add.'));
    };
    draw();
    body.append(section(t === 'gallery' ? 'Photos' : 'Slides', list,
      h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: async () => { const id = await chooseAsset('image'); if (id) { edit((g) => { g.images.push({ asset: id, caption: '' }); }); draw(); } } }, '+ Add Photo'))));
    if (t === 'gallery') {
      body.append(section('Layout',
        row('Columns', slider(() => el.cols, set('cols'), { min: 1, max: 8, key: 'cols' })),
        row('Spacing', slider(() => el.gap, set('gap'), { min: 0, max: 60, fmt: (v) => v + 'px', key: 'gap' })),
        row('Shape', select([['1', 'Square'], ['4/3', 'Landscape 4:3'], ['3/2', 'Landscape 3:2'], ['16/9', 'Wide 16:9'], ['3/4', 'Portrait 3:4'], ['2/3', 'Portrait 2:3']], () => el.aspect, set('aspect'))),
        row('Corners', slider(() => el.thumbRadius ?? 4, set('thumbRadius'), { min: 0, max: 60, fmt: (v) => v + 'px', key: 'tr' })),
        row('', check(() => el.captions, set('captions'), 'Show captions')),
        row('', check(() => el.hoverZoom !== false, set('hoverZoom'), 'Zoom on hover')),
        row('Caption font', fontSelect(() => el.captionFont, set('captionFont'))),
        row('Caption color', color(() => el.captionColor, set('captionColor'))),
        h('p', { class: 'hint' }, 'Visitors can click any photo to open it full-screen and browse with arrow keys or swipes.'),
      ));
    } else {
      body.append(section('Playback',
        row('Transition', select([['fade', 'Dissolve'], ['slide', 'Push'], ['kenburns', 'Ken Burns']], () => el.transition, set('transition'))),
        row('Seconds', slider(() => el.interval, set('interval'), { min: 2, max: 15, key: 'iv', fmt: (v) => v + 's' })),
        row('Scaling', seg([['cover', 'Fill'], ['contain', 'Fit']], () => el.fit || 'cover', set('fit'))),
        row('', check(() => el.autoplay !== false, set('autoplay'), 'Play automatically')),
        row('', check(() => el.arrows !== false, set('arrows'), 'Arrows')),
        row('', check(() => el.dots !== false, set('dots'), 'Dots')),
        row('', check(() => el.captions, set('captions'), 'Captions')),
      ));
    }
  }

  if (t === 'video') {
    body.append(section('Movie',
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn small', onclick: async () => { const id = await chooseAsset('video'); if (id) edit((e) => { e.asset = id; }); } }, el.asset ? 'Replace Movie…' : 'Choose Movie…'),
        h('button', { class: 'btn small', onclick: async () => { const id = await chooseAsset('image'); if (id) edit((e) => { e.poster = id; }); } }, 'Poster Frame…')),
      row('', check(() => el.controls !== false, set('controls'), 'Show controls')),
      row('', check(() => el.autoplay, set('autoplay'), 'Autoplay (muted)')),
      row('', check(() => el.loop, set('loop'), 'Loop')),
      row('', check(() => el.muted, set('muted'), 'Muted')),
      row('Scaling', seg([['cover', 'Fill'], ['contain', 'Fit']], () => el.fit || 'cover', set('fit'))),
    ));
  }
  if (t === 'audio') {
    body.append(section('Audio',
      h('button', { class: 'btn small', onclick: async () => { const id = await chooseAsset('audio'); if (id) edit((e) => { e.asset = id; }); } }, el.asset ? 'Replace Audio…' : 'Choose Audio…'),
      row('', check(() => el.autoplay, set('autoplay'), 'Autoplay (browsers may block)')),
      row('', check(() => el.loop, set('loop'), 'Loop'))));
  }
  if (t === 'embed') {
    const status = h('p', { class: 'hint' });
    const upd = () => { status.textContent = embedSrc(el.url) ? '✓ Recognised video link' : 'Paste a YouTube or Vimeo address, e.g. https://youtu.be/…'; };
    refreshers.push(upd); upd();
    body.append(section('Web Video', row('Link', text(() => el.url, set('url'), { placeholder: 'https://www.youtube.com/watch?v=…', commit: true })), status,
      row('Title', text(() => el.title, set('title')))));
  }
  if (t === 'map') {
    body.append(section('Map',
      row('Address', text(() => el.address, set('address'), { commit: true, placeholder: 'Street, city' })),
      row('Zoom', slider(() => el.zoom, set('zoom'), { min: 2, max: 20, key: 'mz' }))));
  }
  if (t === 'html') {
    body.append(section('HTML Snippet',
      text(() => el.code, set('code'), { area: true, commit: true }),
      h('p', { class: 'hint' }, 'Paste embed codes (newsletter sign-ups, widgets…). Scripts run on the published site only; the editor shows a static preview.')));
  }
  if (t === 'navbar') {
    body.append(section('Navigation Menu',
      row('Style', select([['plain', 'Plain'], ['underline', 'Underline'], ['pills', 'Pills'], ['boxed', 'Glow box'], ['tabs', 'Tabs']], () => el.navStyle, set('navStyle'))),
      row('Direction', seg([['h', 'Across'], ['v', 'Down']], () => el.orient || 'h', set('orient'))),
      row('Align', seg([['left', 'Left'], ['center', 'Center'], ['right', 'Right']], () => el.align || 'left', set('align'))),
      row('Spacing', slider(() => el.gap ?? 22, set('gap'), { min: 0, max: 80, fmt: (v) => v + 'px', key: 'ng' })),
      h('p', { class: 'hint' }, 'The menu lists every page that has “Include in navigation menu” ticked, in sidebar order.')));
  }
  if (t === 'blogfeed') {
    const blogs = state.project.pages.filter((p) => p.type === 'blog');
    body.append(section('Blog Feed',
      blogs.length > 1 ? row('Blog', select(blogs.map((b) => [b.id, b.name]), () => el.blogPage || blogs[0].id, set('blogPage'))) : '',
      row('Layout', seg([['list', 'List'], ['cards', 'Cards']], () => el.layout || 'list', set('layout'))),
      row('Posts', slider(() => el.count || 10, set('count'), { min: 1, max: 50, key: 'fc' })),
      row('', check(() => el.excerpt !== false, set('excerpt'), 'Show excerpts')),
      row('', check(() => el.showImage !== false, set('showImage'), 'Show featured photos'))));
  }
  if (t === 'form') {
    const f = () => el.fields || {};
    const setF = (k) => (v) => edit((e) => { e.fields = { ...e.fields, [k]: v }; });
    body.append(section('Contact Form',
      row('Send to', text(() => el.email, set('email'), { placeholder: 'you@example.com' })),
      row('Form service', text(() => el.action, set('action'), { placeholder: 'Optional: https://formspree.io/f/…', commit: true })),
      h('p', { class: 'hint' }, 'Without a form service the form opens the visitor’s email app. Services like Formspree or Basin deliver messages directly.'),
      row('Fields', h('div', {}, check(() => f().name, setF('name'), 'Name'), check(() => f().email, setF('email'), 'Email'), check(() => f().subject, setF('subject'), 'Subject'), check(() => f().message, setF('message'), 'Message'))),
      row('Button', text(() => el.submit, set('submit'))),
      row('Thank-you', text(() => el.thanks || '', set('thanks'), { placeholder: 'Thanks! Your message is on its way.' }))));
  }
  if (t === 'shape' || t === 'button') {
    body.append(section('Content', h('p', { class: 'hint' }, t === 'shape' ? 'Double-click a shape to type text inside it. Use the Text tab to style it.' : 'Double-click the button to change its label. Set where it goes in the Link tab.')));
  }
}

function linkPanel(body, sel) {
  const el = first(sel);
  const l = () => el.link || { type: 'none' };
  const setL = (patch, key) => edit((e) => { e.link = { ...e.link, ...patch }; }, key);
  const extra = h('div');
  const draw = () => {
    extra.innerHTML = '';
    const lk = l();
    if (lk.type === 'page') extra.append(row('Page', select(state.project.pages.map((p) => [p.id, p.name]), () => lk.page || state.project.pages[0].id, (v) => setL({ page: v }))));
    if (lk.type === 'url') {
      extra.append(row('Address', text(() => lk.url, (v) => setL({ url: v }, 'lurl'), { placeholder: 'https://' })),
        row('', check(() => lk.newTab !== false, (v) => setL({ newTab: v }), 'Open in a new window')));
    }
    if (lk.type === 'email') extra.append(row('Email', text(() => lk.email, (v) => setL({ email: v }, 'lem'), { placeholder: 'name@example.com' })));
  };
  body.append(section('Hyperlink',
    row('Link to', select([['none', 'Nothing'], ['page', 'A page on this site'], ['url', 'An external page'], ['email', 'An email message'], ['top', 'Top of this page'], ['rss', 'Blog RSS feed']], () => l().type || 'none', (v) => { setL({ type: v }); draw(); })),
    extra,
    h('p', { class: 'hint' }, el.type === 'text' ? 'This links the whole text box. To link just a few words, double-click to edit, select them and press 🔗.' : 'Links are live on the published site; in the editor clicking selects instead.')));
  draw();
}

function motionPanel(body, sel) {
  const el = first(sel);
  body.append(section('Entrance',
    row('Effect', select(ANIMS.map((a) => [a, a === 'none' ? 'None' : cap(a)]), () => el.anim || 'none', (v) => edit((e) => { e.anim = v; }))),
    row('Delay', slider(() => el.animDelay || 0, (v) => edit((e) => { e.animDelay = v; }, 'ad'), { min: 0, max: 2, step: 0.05, fmt: (v) => v + 's' })),
    h('p', { class: 'hint' }, 'Plays when the item scrolls into view on the published site. Visitors who prefer reduced motion see no animation.'),
    h('button', { class: 'btn small', onclick: () => emit('command', { cmd: 'preview' }) }, 'Preview in Browser')));
  body.append(section('Hover',
    row('Effect', select(HOVERS.map((a) => [a, a === 'none' ? 'None' : cap(a)]), () => el.hover || 'none', (v) => edit((e) => { e.hover = v; })))));
}

export function showInspectorTab(t) { tab = t; build(); }
export { slugify };

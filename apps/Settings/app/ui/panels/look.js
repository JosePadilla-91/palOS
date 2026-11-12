'use strict';
/* Appearance and Dock panels. */

function modePreview(kind, label, pressed, onclick) {
  const b = el('button', { class: 'mode ' + kind, 'aria-pressed': String(pressed) },
    el('div', { class: 'pv' }, el('div', { class: 'wb' },
      el('div', { class: 'tb' }, el('i'), el('i'), el('i')),
      el('div', { class: 'bd' }, el('div', { class: 'sb' }), el('div', { class: 'ct' }, el('b'), el('b'), el('b'), el('b'))))),
    el('span', { text: label }));
  b.addEventListener('click', onclick);
  return b;
}

const WALL_COLORS = ['#2b4f7e', '#4c6278', '#2e343b', '#1f3b5c', '#3f5a4c', '#5a4c6e', '#6b4f3a', '#8c3b3b', '#606870', '#1e6f6f', '#c0c6cc', '#d7c49e'];
const MODES = [{ value: 'fill', label: 'Fill Screen' }, { value: 'fit', label: 'Fit to Screen' }, { value: 'stretch', label: 'Stretch' }, { value: 'center', label: 'Center' }, { value: 'tile', label: 'Tile' }];

panel('appearance', 'Appearance', 'look', async (root, stale) => {
  const [a, walls] = await Promise.all([sys.call('look:get'), sys.call('look:wallpapers')]);
  if (stale()) return;

  const modes = el('div', { class: 'modes', role: 'group', 'aria-label': 'Appearance' });
  const darkSwitch = toggle(a.dark, (v) => pick(v), 'Dark Mode');
  const mark = (dark) => {
    for (const m of modes.children) m.setAttribute('aria-pressed', String(m.classList.contains(dark ? 'dark' : 'light')));
    darkSwitch.setAttribute('aria-checked', String(dark));
  };
  const pick = async (dark) => { mark(dark); await sys.call('look:dark', dark); };
  modes.append(modePreview('light', 'Light', !a.dark, () => pick(false)), modePreview('dark', 'Dark', a.dark, () => pick(true)));
  const off = sys.on('dark', (d) => { if (!document.body.contains(modes)) { off(); return; } mark(d); });
  root.append(card(modes, row('Dark Mode', 'Slate gray windows, menus and title bars', darkSwitch)),
    note('Apps built with GTK 3, palOS’s own apps and window title bars change straight away. Apps built with GTK 4 change too, but keep palOS’s colours only after you reopen them.'));

  root.append(heading('Text and Motion'), card(
    row('Text Size', null, seg([{ value: 0.9, label: 'Small' }, { value: 1, label: 'Default' }, { value: 1.15, label: 'Large' }, { value: 1.3, label: 'Larger' }],
      [0.9, 1, 1.15, 1.3].reduce((b, x) => Math.abs(x - a.textScale) < Math.abs(b - a.textScale) ? x : b, 1), (v) => sys.call('look:textScale', v), 'Text Size')),
    row('Animations', 'Fades and window effects', toggle(a.animations, (v) => sys.call('look:animations', v), 'Animations'))));

  // ---- desktop background (shared with Seeker, which draws the desktop)
  root.append(heading('Desktop Background'));
  const gallery = el('div', { class: 'walls', role: 'group', 'aria-label': 'Pictures' });
  const swatches = el('div', { class: 'swatches', role: 'group', 'aria-label': 'Colours' });
  const markWall = () => {
    for (const w of gallery.querySelectorAll('.wall[data-path]')) w.setAttribute('aria-pressed', String(w.dataset.path === (a.wallpaper || '')));
    for (const s of swatches.children) s.setAttribute('aria-pressed', String(!a.wallpaper && a.wallpaperMode === 'color' && s.dataset.color === a.wallpaperColor));
  };
  const setWall = async (patch) => { Object.assign(a, patch); markWall(); await sys.call('look:wallpaper', patch); };
  const tile = (p) => {
    const name = p.split('/').pop().replace(/\.[a-z0-9]+$/i, '');
    const b = el('button', { class: 'wall', 'data-path': p, 'aria-label': name, title: name }, el('img', { src: fileURL(p), loading: 'lazy', decoding: 'async', alt: '' }));
    b.addEventListener('click', () => setWall({ wallpaper: p, wallpaperMode: a.wallpaperMode === 'color' ? 'fill' : a.wallpaperMode }));
    return b;
  };
  // the palOS default picture (palOS Pupper) comes first; choosing it means "palOS's default"
  const DEFAULT_WALL = '/usr/share/backgrounds/palos/palOS Pupper.jpg';
  const hasDefault = walls.system.includes(DEFAULT_WALL);
  walls.system = walls.system.filter((p) => p !== DEFAULT_WALL);
  const def = el('button', { class: 'wall', 'data-path': '', 'aria-label': 'palOS Pupper (default)', title: 'palOS Pupper (default)',
    style: { background: 'linear-gradient(160deg,#0b1440,#241a6b 45%,#4a1f78 70%,#0d0f2e)' } },
    hasDefault ? el('img', { src: fileURL(DEFAULT_WALL), loading: 'lazy', decoding: 'async', alt: '' }) : null);
  def.addEventListener('click', () => setWall({ wallpaper: null, wallpaperMode: 'fill' }));
  const add = el('button', { class: 'wall add', text: 'Choose…' });
  add.addEventListener('click', async () => { const f = await sys.call('look:pickWallpaper'); if (f) { gallery.insertBefore(tile(f), add); setWall({ wallpaper: f, wallpaperMode: a.wallpaperMode === 'color' ? 'fill' : a.wallpaperMode }); } });
  gallery.append(def, ...[...walls.pictures, ...walls.system].slice(0, 60).map(tile));
  if (a.wallpaper && !gallery.querySelector(`.wall[data-path="${CSS.escape(a.wallpaper)}"]`)) gallery.insertBefore(tile(a.wallpaper), gallery.children[1] || null);
  gallery.append(add);
  for (const c of WALL_COLORS) {
    const s = el('button', { class: 'swatch', 'data-color': c, 'aria-label': `Solid color ${c}`, style: { background: c } });
    s.addEventListener('click', () => setWall({ wallpaper: null, wallpaperMode: 'color', wallpaperColor: c }));
    swatches.append(s);
  }
  markWall();
  root.append(card(gallery, el('div', { class: 'row', style: { borderTop: '0', minHeight: '0', paddingTop: '0' } }, el('div', { class: 'lbl', text: 'Solid colours' })), swatches,
    row('Picture Position', null, select(MODES, a.wallpaperMode === 'color' ? 'fill' : a.wallpaperMode, (v) => setWall({ wallpaperMode: v }), 'Picture Position'))));
});

panel('dock', 'Dock', 'look', async (root, stale) => {
  const d = await sys.call('dock:get');
  if (stale()) return;
  if (!d.installed) { root.append(card(el('div', { class: 'empty', text: 'The Dock isn\'t installed.' }))); return; }
  const set = (patch) => sys.call('dock:set', patch);
  const sizeLbl = el('span', { class: 'badge', text: `${d.icon_size} px` });
  const magLbl = el('span', { class: 'badge', text: `${d.magnify_size} px` });
  const magRow = row('Magnified Size', 'Biggest an icon grows under the pointer',
    slider(48, 160, 4, d.magnify_size, (v) => { magLbl.textContent = `${v} px`; }, 'Magnified Size', (v) => set({ magnify_size: v })), magLbl);
  if (!d.magnify) magRow.classList.add('hidden');
  root.append(card(
    row('Position on Screen', null, seg([{ value: 'bottom', label: 'Bottom' }, { value: 'left', label: 'Left' }], d.position, (v) => set({ position: v }), 'Position')),
    row('Icon Size', null, slider(32, 96, 2, d.icon_size, (v) => { sizeLbl.textContent = `${v} px`; }, 'Icon Size', (v) => set({ icon_size: v })), sizeLbl),
    row('Magnification', 'Icons grow as the pointer passes over them', toggle(d.magnify, (v) => { magRow.classList.toggle('hidden', !v); return set({ magnify: v }); }, 'Magnification')),
    magRow,
    row('Hide the Dock Automatically', 'Shows again when the pointer reaches the screen edge', toggle(d.autohide, (v) => set({ autohide: v }), 'Hide automatically')),
    row('Minimize Windows Using', null, select([{ value: 'magic_lamp', label: 'Magic Lamp Effect' }, { value: 'scale', label: 'Shrink Effect' }], d.minimize_effect, (v) => set({ minimize_effect: v }), 'Minimize effect'))),
    note('The dock restarts for a moment when you change these.'));
});

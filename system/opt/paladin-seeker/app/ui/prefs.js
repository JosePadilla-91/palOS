'use strict';
setupChrome({ zoom: false, grip: false });
let cfg, env;
const TABS = [
  ['general', 'General', ['preferences-system', 'preferences-desktop', 'system-run']],
  ['desktop', 'Desktop', ['preferences-desktop-wallpaper', 'user-desktop']],
  ['menubar', 'Menu Bar', ['preferences-desktop-display', 'preferences-system-windows', 'video-display']],
  ['sidebar', 'Sidebar', ['view-list', 'view-sidebar', 'format-justify-left']],
];
const set = (patch) => seeker.invoke('config:set', patch).then((c) => { cfg = c; });

function showTab(id) {
  $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.id === id));
  $$('.pane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + id));
  $('#title').textContent = TABS.find((t) => t[0] === id)[1];
}

function check(label, get, put) {
  const c = el('input', { type: 'checkbox', checked: get() });
  c.addEventListener('change', () => put(c.checked));
  return el('label', { class: 'check' }, c, el('span', { text: label }));
}

function general() {
  const p = $('#pane-general'); p.textContent = '';
  const sel = el('select', {});
  for (const [v, t] of [['home', env.user], ['desktop', 'Desktop'], ['documents', 'Documents'], ['computer', 'Computer']]) sel.append(el('option', { value: v, text: t, selected: cfg.browser.newWindowTarget === v }));
  sel.addEventListener('change', () => set({ browser: { newWindowTarget: sel.value } }));
  const disk = el('input', { type: 'text', value: cfg.hardDiskName, style: { width: '180px' } });
  disk.addEventListener('change', () => set({ hardDiskName: disk.value.trim() || 'palOS HD' }));
  p.append(
    el('div', { class: 'lbl', style: { width: 'auto', textAlign: 'left', marginBottom: '4px' }, text: 'Show these items on the Desktop:' }),
    el('div', { style: { marginLeft: '20px' } },
      check('Hard disks', () => cfg.desktop.showHardDisks, (v) => set({ desktop: { showHardDisks: v } })),
      check('External disks', () => cfg.desktop.showExternalDisks, (v) => set({ desktop: { showExternalDisks: v } })),
      check('Files in the Desktop folder', () => cfg.desktop.showDesktopFiles, (v) => set({ desktop: { showDesktopFiles: v } }))),
    el('div', { class: 'row', style: { marginTop: '16px' } }, el('label', { text: 'New Seeker windows open:' }), sel),
    el('div', { class: 'row' }, el('label', { text: 'Startup disk name:' }), disk),
    el('div', { class: 'group' },
      check('Show all filename extensions', () => cfg.browser.showExtensions, (v) => set({ browser: { showExtensions: v } })),
      check('Show hidden files', () => cfg.browser.showHidden, (v) => set({ browser: { showHidden: v } })),
      check('Keep folders on top when sorting', () => cfg.browser.foldersFirst, (v) => set({ browser: { foldersFirst: v } })),
      check('Mount external disks automatically', () => cfg.automount, (v) => set({ automount: v }))),
  );
  const size = el('input', { type: 'range', min: 32, max: 128, step: 8, value: cfg.desktop.iconSize });
  size.addEventListener('change', () => set({ desktop: { iconSize: +size.value } }));
  p.append(el('div', { class: 'row' }, el('label', { text: 'Desktop icon size:' }), size));
}

async function desktop() {
  const p = $('#pane-desktop'); p.textContent = '';
  const sources = [
    { id: 'paladin', name: 'palOS', icon: ['folder-pictures'], dir: '/usr/share/backgrounds' },
    { id: 'pictures', name: 'Pictures Folder', icon: ['folder-pictures'], dir: env.dirs.PICTURES },
    { id: 'colors', name: 'Solid Colours', icon: ['preferences-color', 'applications-graphics'] },
  ];
  const cur = el('div', { class: 'cur' });
  const showCur = () => {
    cur.style.backgroundImage = cfg.wallpaper ? `url("${fileURL(cfg.wallpaper)}")` : 'linear-gradient(160deg,#0b1440,#241a6b 45%,#4a1f78 70%,#0d0f2e)';
    cur.style.backgroundColor = cfg.wallpaperColor;
    if (!cfg.wallpaper && cfg.wallpaperMode === 'color') cur.style.backgroundImage = 'none';
  };
  showCur();
  const mode = el('select', {});
  for (const [v, t] of [['fill', 'Fill Screen'], ['fit', 'Fit to Screen'], ['stretch', 'Stretch to Fill Screen'], ['center', 'Center'], ['tile', 'Tile']]) mode.append(el('option', { value: v, text: t, selected: cfg.wallpaperMode === v }));
  mode.addEventListener('change', () => set({ wallpaperMode: mode.value }));
  const color = el('input', { type: 'color', value: cfg.wallpaperColor });
  color.addEventListener('change', () => set({ wallpaperColor: color.value }));
  const def = el('button', { class: 'btn', text: 'palOS Default', onclick: async () => { await set({ wallpaper: null, wallpaperMode: 'fill' }); showCur(); $$('.grid .w').forEach((w) => w.classList.remove('on')); } });
  const side = el('div', { class: 'bgside' });
  const grid = el('div', { class: 'grid' });
  const main = el('div', { class: 'bgmain' }, el('div', { class: 'bgtop' }, cur, el('div', {}, el('div', { style: { marginBottom: '6px' } }, mode, ' ', color), def)), grid);
  p.append(el('div', { class: 'bg' }, side, main));
  const choose = el('div', { class: 'si', text: '+ Choose Folder…' });
  let current = null;
  const open = async (s) => {
    current = s;
    $$('.si', side).forEach((n) => n.classList.toggle('on', n._s === s));
    grid.textContent = '';
    if (s.id === 'colors') {
      for (const c of ['#2b4f7e', '#3a6ea5', '#1f3b5c', '#4b6c4a', '#7a5a8c', '#8c3b3b', '#606060', '#202020', '#c0c0c0', '#d7c49e', '#1e6f6f', '#b5651d']) {
        const w = el('div', { class: 'w', style: { background: c } });
        w.addEventListener('click', async () => { await set({ wallpaper: null, wallpaperColor: c, wallpaperMode: 'color' }); showCur(); color.value = c; });
        grid.append(w);
      }
      return;
    }
    const imgs = await seeker.invoke('fs:images', s.dir);
    if (!imgs.length) grid.append(el('div', { class: 'muted', text: 'No pictures in this folder.' }));
    for (const f of imgs) {
      const w = el('div', { class: 'w' + (cfg.wallpaper === f ? ' on' : ''), title: f.split('/').pop() });
      w.style.backgroundImage = `url("${thumbURL(f, 128)}")`;
      w.addEventListener('click', async () => { $$('.grid .w').forEach((x) => x.classList.remove('on')); w.classList.add('on'); await set({ wallpaper: f, wallpaperMode: cfg.wallpaperMode === 'color' ? 'fill' : cfg.wallpaperMode }); mode.value = cfg.wallpaperMode; showCur(); });
      grid.append(w);
    }
  };
  for (const s of sources) { const n = el('div', { class: 'si' }, iconImg(s.icon, 16), el('span', { text: s.name })); n._s = s; n.addEventListener('click', () => open(s)); side.append(n); }
  choose.addEventListener('click', async () => {
    const path = await seeker.invoke('dialog:folder', env.dirs.PICTURES);
    if (path) { const s = { id: 'custom', name: path.split('/').pop(), icon: ['folder'], dir: path }; const n = el('div', { class: 'si' }, iconImg(s.icon, 16), el('span', { text: s.name })); n._s = s; n.addEventListener('click', () => open(s)); side.insertBefore(n, choose); open(s); }
  });
  side.append(choose);
  open(sources[0]);
}

function menubar() {
  const p = $('#pane-menubar'); p.textContent = '';
  const m = cfg.menubar;
  p.append(
    el('div', { class: 'lbl', style: { width: 'auto', textAlign: 'left', marginBottom: '4px' }, text: 'Show in the menu bar:' }),
    el('div', { style: { marginLeft: '20px' } },
      check('Clock', () => m.clock !== false, (v) => set({ menubar: { clock: v } })),
      check('Volume', () => m.volume !== false, (v) => set({ menubar: { volume: v } })),
      check('Wi-Fi', () => m.wifi !== false, (v) => set({ menubar: { wifi: v } })),
      check('Icons from other applications', () => m.tray !== false, (v) => set({ menubar: { tray: v } }))),
    el('div', { class: 'lbl', style: { width: 'auto', textAlign: 'left', margin: '16px 0 4px' }, text: 'Clock:' }),
    el('div', { style: { marginLeft: '20px' } },
      check('Show the day of the week', () => m.clockDay !== false, (v) => set({ menubar: { clockDay: v } })),
      check('Show the date', () => !!m.clockDate, (v) => set({ menubar: { clockDate: v } })),
      check('Use a 24-hour clock', () => !!m.clock24h, (v) => set({ menubar: { clock24h: v } })),
      check('Display the time with seconds', () => !!m.clockSeconds, (v) => set({ menubar: { clockSeconds: v } }))),
  );
}

async function sidebar() {
  const p = $('#pane-sidebar'); p.textContent = '';
  const side = await seeker.invoke('sidebar');
  const all = [[env.dirs.DESKTOP, 'Desktop'], [env.home, env.user], ['seeker:apps', 'Applications'], [env.dirs.DOCUMENTS, 'Documents'], [env.dirs.DOWNLOAD, 'Downloads'], [env.dirs.MUSIC, 'Music'], [env.dirs.PICTURES, 'Pictures'], [env.dirs.VIDEOS, 'Videos']];
  const on = new Set(side.places.map((x) => x.path));
  const extra = side.places.filter((x) => !all.find((a) => a[0] === x.path)).map((x) => [x.path, x.name]);
  p.append(el('div', { class: 'lbl', style: { width: 'auto', textAlign: 'left', marginBottom: '4px' }, text: 'Show these items in the sidebar:' }));
  const box = el('div', { style: { marginLeft: '20px' } });
  for (const [path, name] of [...all, ...extra]) {
    box.append(check(name, () => on.has(path), async (v) => {
      if (v) on.add(path); else on.delete(path);
      const order = [...all, ...extra].map((a) => a[0]).filter((x) => on.has(x));
      await set({ sidebarFavorites: order });
    }));
  }
  p.append(box, el('div', { class: 'small muted', style: { marginTop: '12px' }, text: 'Tip: drag a folder onto empty space in a window’s sidebar to add it.' }));
}

(async () => {
  cfg = await seeker.invoke('config:get');
  env = await seeker.invoke('env');
  for (const [id, name, icon] of TABS) {
    const t = el('div', { class: 'tab' }, iconImg(icon, 32), el('span', { text: name }));
    t.dataset.id = id; t.addEventListener('click', () => showTab(id));
    $('#tabs').append(t);
  }
  general(); desktop(); menubar(); sidebar();
  showTab(Q.get('tab') || 'general');
  seeker.on('prefs:tab', showTab);
})();

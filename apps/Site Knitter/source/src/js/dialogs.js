// Modal dialogs, menus and pickers
import { state, emit } from './store.js';
import { THEMES, TEMPLATES, themeById } from './themes.js';
import { fontStack } from './fonts.js';
import { assetUrl, importViaDialog } from './media.js';
import { h, esc } from './util.js';
import { icon, TEMPLATE_ICONS } from './icons.js';

// ---------------------------------------------------------------------------
export function modal({ title, body, buttons = [], wide = false, onClose, className = '' }) {
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: `modal ${wide ? 'wide' : ''} ${className}`, role: 'dialog', 'aria-label': title });
  const close = (v) => {
    back.classList.add('closing');
    setTimeout(() => back.remove(), 160);
    document.removeEventListener('keydown', key, true);
    onClose?.(v);
  };
  const key = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(null); }
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      const def = box.querySelector('.modal-foot .btn.primary:not([disabled])');
      if (def) { e.preventDefault(); def.click(); }
    }
  };
  document.addEventListener('keydown', key, true);
  box.append(
    title ? h('div', { class: 'modal-head' }, h('h2', {}, title), h('button', { class: 'x', onclick: () => close(null), 'aria-label': 'Close' }, '×')) : '',
    h('div', { class: 'modal-body' }, body),
    buttons.length ? h('div', { class: 'modal-foot' }, ...buttons.map((b) => b === '->' ? h('span', { class: 'spacer' }) :
      h('button', { class: `btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}`, onclick: () => { const r = b.onclick?.(); if (r !== false) close(b.value ?? r); } }, b.label))) : '',
  );
  back.append(box);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(null); });
  document.body.append(back);
  requestAnimationFrame(() => back.classList.add('open'));
  setTimeout(() => box.querySelector('input:not([type=checkbox]),select,textarea')?.focus(), 50);
  return { close, box };
}

export function promptText(title, value = '', { label = '', placeholder = '' } = {}) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'text', value, placeholder, class: 'full' });
    let result = null;
    modal({
      title,
      body: h('div', {}, label ? h('label', { class: 'lbl' }, label) : '', input),
      buttons: ['->', { label: 'Cancel' }, { label: 'OK', primary: true, onclick: () => { result = input.value.trim(); } }],
      onClose: () => resolve(result),
    });
    setTimeout(() => input.select(), 60);
  });
}

export function confirmBox(title, message, okLabel = 'OK', danger = false) {
  return new Promise((resolve) => {
    let ok = false;
    modal({
      title,
      body: h('p', {}, message),
      buttons: ['->', { label: 'Cancel' }, { label: okLabel, primary: !danger, danger, onclick: () => { ok = true; } }],
      onClose: () => resolve(ok),
    });
  });
}

export function toast(msg, ms = 2600) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

// ---------------------------------------------------------------------------
export function showContextMenu(x, y, items) {
  document.querySelector('.ctx-menu')?.remove();
  const menu = h('div', { class: 'ctx-menu' },
    ...items.map((it) => it === '-' ? h('div', { class: 'sep' }) :
      h('button', {
        disabled: it.disabled,
        onclick: () => { menu.remove(); if (it.action) it.action(); else emit('command', { cmd: it.cmd, arg: it.arg }); },
      }, it.label)));
  document.body.append(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.min(x, window.innerWidth - r.width - 6) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - r.height - 6) + 'px';
  const off = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', off, true); } };
  setTimeout(() => document.addEventListener('mousedown', off, true));
}

export function dropdown(anchor, items) {
  const r = anchor.getBoundingClientRect();
  showContextMenu(r.left, r.bottom + 4, items);
}

// ---------------------------------------------------------------------------
// Theme thumbnails (pure CSS miniature of the theme)
// ---------------------------------------------------------------------------
const cssFill = (f) => !f ? 'transparent' : f.type === 'color' ? f.color : f.type === 'gradient' ? `linear-gradient(${f.angle ?? 180}deg, ${f.color}, ${f.color2})` : 'transparent';

export function themeThumb(t, label = true) {
  const p = t.palette;
  const photo = `linear-gradient(180deg, ${p[0]} 0%, ${p[1]} 60%, ${p[2]} 100%)`;
  const page = h('div', { class: 'tt-page', style: { background: cssFill(t.page.fill), borderRadius: (t.page.radius ? 5 : 0) + 'px', boxShadow: t.page.shadow ? '0 4px 14px rgba(0,0,0,.3)' : 'none' } });
  const navDots = (color, vertical) => h('div', { class: 'tt-nav' + (vertical ? ' v' : '') }, ...[0, 1, 2, 3].map((i) => h('i', { style: { background: i === 0 ? t.colors.accent : color } })));
  const title = (size, align = 'left', color = t.colors.bandText) => h('div', { class: 'tt-title', style: { fontFamily: fontStack(t.fonts.title), color, fontSize: size + 'px', textAlign: align } }, 'Aa');
  if (t.layout === 'sidebar') {
    page.append(h('div', { class: 'tt-side', style: { background: cssFill(t.colors.band) || 'transparent' } }, title(14, 'left'), navDots(t.colors.nav, true)));
    page.append(h('div', { class: 'tt-content', style: { left: '30%' } }, h('div', { class: 'tt-photo', style: { background: photo, borderRadius: t.heroRadius ? '3px' : 0, border: t.frame === 'polaroid' ? '3px solid #fff' : '' } }), lines(t)));
  } else {
    const head = h('div', { class: 'tt-head ' + t.layout, style: { background: t.layout === 'banner' ? cssFill(t.colors.band) : 'transparent' } },
      title(t.layout === 'centered' ? 16 : 13, t.layout === 'centered' ? 'center' : 'left'), navDots(t.colors.nav));
    page.append(head, h('div', { class: 'tt-content' }, h('div', { class: 'tt-photo', style: { background: photo, borderRadius: t.heroRadius ? (t.heroMask === 'blob' ? '40% 50% 45% 55%' : '4px') : 0 } }), lines(t)));
  }
  return h('div', { class: 'theme-thumb' },
    h('div', { class: 'tt-body', style: { background: cssFill(t.body) } }, page),
    label ? h('div', { class: 'tt-label' }, t.name) : '');
}
function lines(t) {
  return h('div', { class: 'tt-lines' },
    h('i', { style: { background: t.colors.heading, width: '55%', height: '4px' } }),
    h('i', { style: { background: t.colors.text, opacity: 0.4 } }), h('i', { style: { background: t.colors.text, opacity: 0.4, width: '80%' } }),
    h('i', { style: { background: t.colors.accent, width: '24%', height: '6px', marginTop: '3px', borderRadius: '2px' } }));
}

/** New-site / change-theme chooser. Resolves {themeId, name, templates} or null */
export function chooseTheme({ mode = 'new', current = null } = {}) {
  return new Promise((resolve) => {
    let picked = current || THEMES[0].id;
    let result = null;
    const grid = h('div', { class: 'theme-grid' });
    const draw = () => {
      grid.innerHTML = '';
      for (const t of THEMES) {
        const card = themeThumb(t);
        card.classList.toggle('on', t.id === picked);
        card.onclick = () => { picked = t.id; draw(); };
        card.ondblclick = () => { picked = t.id; finish(); m.close(); };
        grid.append(card);
      }
    };
    draw();
    const name = h('input', { type: 'text', value: 'My Site', class: 'full', onfocus: (e) => e.target.select() });
    const tplChecks = TEMPLATES.filter((t) => t.id !== 'blank').map((t) => {
      const cb = h('input', { type: 'checkbox', checked: ['welcome', 'about', 'photos', 'blog', 'contact'].includes(t.id), value: t.id });
      return { cb, el: h('label', { class: 'chip' }, cb, ' ', t.name) };
    });
    const finish = () => {
      result = { themeId: picked, name: name.value.trim() || 'My Site', templates: tplChecks.filter((c) => c.cb.checked).map((c) => c.cb.value) };
      if (!result.templates.length) result.templates = ['welcome'];
    };
    const body = h('div', { class: 'theme-chooser' },
      h('p', { class: 'muted' }, mode === 'new' ? 'Choose a theme for your new site. You can change it later from View ▸ Change Theme.' : 'Pick a new theme. Fonts, colours and decorations update across every page; your words and photos stay put.'),
      grid,
      mode === 'new' ? h('div', { class: 'tc-opts' },
        h('div', {}, h('label', { class: 'lbl' }, 'Site name'), name),
        h('div', {}, h('label', { class: 'lbl' }, 'Start with these pages'), h('div', { class: 'chips' }, ...tplChecks.map((c) => c.el)))) : '');
    const m = modal({
      title: mode === 'new' ? 'Choose a Theme' : 'Change Theme', body, wide: true, className: 'theme-modal',
      buttons: ['->', { label: 'Cancel' }, { label: mode === 'new' ? 'Create Site' : 'Apply Theme', primary: true, onclick: finish }],
      onClose: () => resolve(result),
    });
  });
}

/** Add-page dialog: pick a template; resolves templateId or null */
export function chooseTemplate() {
  return new Promise((resolve) => {
    const t = themeById(state.project.site.theme);
    let picked = 'blank';
    let result = null;
    const grid = h('div', { class: 'tpl-grid' });
    const draw = () => {
      grid.innerHTML = '';
      for (const tpl of TEMPLATES) {
        grid.append(h('button', {
          class: 'tpl' + (tpl.id === picked ? ' on' : ''),
          onclick: () => { picked = tpl.id; draw(); },
          ondblclick: () => { picked = tpl.id; result = picked; m.close(); },
        },
        h('div', { class: 'tpl-art', style: { background: cssFill(t.page.fill), color: t.colors.accent } }, icon(TEMPLATE_ICONS[tpl.id], 44)),
        h('b', {}, tpl.name), h('span', {}, tpl.desc)));
      }
    };
    draw();
    const m = modal({
      title: 'Add a Page', wide: true,
      body: h('div', {}, h('p', { class: 'muted' }, `Templates are styled for your “${t.name}” theme.`), grid),
      buttons: ['->', { label: 'Cancel' }, { label: 'Add Page', primary: true, onclick: () => { result = picked; } }],
      onClose: () => resolve(result),
    });
  });
}

/** Pick an existing asset (or import). Resolves id or null */
export function chooseAsset(kind = 'image') {
  return new Promise((resolve) => {
    let result = null;
    const grid = h('div', { class: 'asset-pick' });
    const draw = () => {
      grid.innerHTML = '';
      const list = Object.values(state.project.assets).filter((a) => a.kind === kind).sort((a, b) => (b.added || 0) - (a.added || 0));
      if (!list.length) grid.append(h('p', { class: 'muted' }, 'No media yet — import some.'));
      for (const a of list) {
        grid.append(h('button', { class: 'ap-item', title: a.name, onclick: () => { result = a.id; m.close(); } },
          a.kind === 'image' ? h('img', { src: assetUrl(a.id) }) : h('div', { class: 'mb-icon' }, a.kind === 'video' ? '▶' : '♪'),
          h('span', {}, a.name)));
      }
    };
    draw();
    const m = modal({
      title: kind === 'image' ? 'Choose a Photo' : kind === 'video' ? 'Choose a Movie' : 'Choose Audio', wide: true,
      body: grid,
      buttons: [{ label: 'Import from Computer…', onclick: () => { importViaDialog(kind).then((ids) => { if (ids[0]) { result = ids[0]; m.close(); } }); return false; } }, '->', { label: 'Cancel' }],
      onClose: () => resolve(result),
    });
  });
}

// ---------------------------------------------------------------------------
export function publishDialog({ onPublish }) {
  const site = state.project.site;
  const pub = { protocol: 'ftp', host: '', port: 21, user: '', remotePath: '/public_html', ...(site.publish || {}) };
  const f = (k, label, type = 'text', extra = {}) => h('div', { class: 'field' }, h('label', { class: 'lbl' }, label),
    h('input', { type, value: pub[k] ?? '', oninput: (e) => { pub[k] = e.target.value; }, class: 'full', ...extra }));
  const pw = h('input', { type: 'password', class: 'full', placeholder: 'Password' });
  const remember = h('input', { type: 'checkbox', checked: true });
  const status = h('div', { class: 'pub-status muted' });
  const bar = h('div', { class: 'progress' }, h('i'));
  const proto = h('select', { onchange: (e) => { pub.protocol = e.target.value; } },
    h('option', { value: 'ftp', selected: pub.protocol === 'ftp' }, 'FTP'),
    h('option', { value: 'ftps', selected: pub.protocol === 'ftps' }, 'FTPS (FTP over TLS)'));
  const selfSigned = h('input', { type: 'checkbox', checked: !!pub.allowSelfSigned, onchange: (e) => { pub.allowSelfSigned = e.target.checked; } });
  window.ws.getPassword(`${pub.user}@${pub.host}`).then((p) => { if (p) pw.value = p; });

  let busy = false;
  const m = modal({
    title: 'Publish to Server',
    body: h('div', { class: 'publish-form' },
      h('p', { class: 'muted' }, 'Upload your site to any web host that offers FTP. Not sure? Use File ▸ Export Site to Folder and upload with your host’s file manager — or drop the folder onto Netlify Drop, GitHub Pages or Cloudflare Pages.'),
      h('div', { class: 'grid2' },
        h('div', { class: 'field' }, h('label', { class: 'lbl' }, 'Protocol'), proto),
        f('port', 'Port', 'number')),
      f('host', 'Server address', 'text', { placeholder: 'ftp.example.com' }),
      h('div', { class: 'grid2' }, f('user', 'User name'), h('div', { class: 'field' }, h('label', { class: 'lbl' }, 'Password'), pw)),
      f('remotePath', 'Folder on server', 'text', { placeholder: '/public_html' }),
      h('label', { class: 'check' }, remember, ' Remember password (stored encrypted in your keyring)'),
      h('label', { class: 'check' }, selfSigned, ' Allow self-signed certificates (FTPS)'),
      bar, status),
    buttons: ['->', { label: 'Close' }, {
      label: 'Publish', primary: true, onclick: () => {
        if (busy) return false;
        if (!pub.host || !pub.user) { status.textContent = 'Please enter a server address and user name.'; return false; }
        busy = true;
        status.textContent = 'Preparing…';
        site.publish = { protocol: pub.protocol, host: pub.host, port: pub.port, user: pub.user, remotePath: pub.remotePath, allowSelfSigned: !!pub.allowSelfSigned };
        onPublish({ ...site.publish, password: pw.value }, remember.checked, (msg, pct) => {
          status.textContent = msg;
          if (pct != null) bar.firstChild.style.width = pct + '%';
        }).finally(() => { busy = false; });
        return false;
      },
    }],
  });
  return m;
}

export function shortcutsDialog() {
  const rows = [
    ['Ctrl+N', 'New site'], ['Ctrl+O', 'Open site'], ['Ctrl+S', 'Save'], ['Ctrl+R', 'Preview in browser'], ['Ctrl+E', 'Export to folder'],
    ['Ctrl+Z / Ctrl+Shift+Z', 'Undo / Redo'], ['Ctrl+D', 'Duplicate'], ['Delete', 'Delete selection'], ['Arrows', 'Nudge 1px (Shift: 10px)'],
    ['Double-click', 'Edit text / replace photo'], ['Alt+drag', 'Duplicate while dragging'], ['Shift+drag', 'Constrain movement / proportions'],
    ['Ctrl while dragging', 'Disable snapping'], ['Ctrl+wheel', 'Zoom'], ['Ctrl+] / Ctrl+[', 'Bring forward / Send backward'], ['Esc', 'Stop editing / deselect'],
  ];
  modal({
    title: 'Keyboard Shortcuts',
    body: h('table', { class: 'kbd-table' }, ...rows.map(([k, d]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, d)))),
    buttons: ['->', { label: 'Done', primary: true }],
  });
}

export function aboutDialog() {
  modal({
    title: '',
    body: h('div', { class: 'about' },
      h('img', { src: '../build/icon.png', width: 96, height: 96, alt: '' }),
      h('h2', {}, 'Site Knitter'),
      h('p', {}, 'Version 1.0.0'),
      h('p', { class: 'muted' }, 'A graphical website maker for palOS. Pick a theme, drag things around, publish. Sites are plain HTML, CSS and JavaScript you own.'),
    ),
    buttons: ['->', { label: 'OK', primary: true }],
  });
}

export { esc };

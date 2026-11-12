'use strict';
/* Bluetooth Manager window */
const ICON = 'file:///usr/share/icons/hicolor/256x256/apps/palos-bluetooth.png';
let S = { available: false, adapter: null, devices: [] };
const pending = new Set();              // devices being paired / connected right now
let searching = false;

const ICONS = {
  'audio-headphones': '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  'audio-headset': '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20c0 1.5-2 2-5 2"/>',
  'audio-card': '<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="14" r="3.5"/><circle cx="12" cy="7" r="1.3"/>',
  'input-keyboard': '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  'input-mouse': '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v3"/>',
  'input-gaming': '<path d="M6 9h12a4 4 0 0 1 3.6 5.7l-.8 1.6a2.5 2.5 0 0 1-4.1.6L15 15H9l-1.7 1.9a2.5 2.5 0 0 1-4.1-.6l-.8-1.6A4 4 0 0 1 6 9z"/><path d="M8 11v3M6.5 12.5h3M16 12h.01M18 13h.01"/>',
  'input-tablet': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 17l6-6"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  computer: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  'video-display': '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  watch: '<rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6V2h6v4M9 18v4h6v-4"/>',
  generic: '<path d="M7 7l10 10-5 5V2l5 5L7 17"/>',
};
const iconFor = (d) => ICONS[d.icon] || (/headphone|airpod|buds|wh-|wf-/i.test(d.name) ? ICONS['audio-headphones'] : /speaker|soundbar|boom/i.test(d.name) ? ICONS['audio-card'] : /keyboard/i.test(d.name) ? ICONS['input-keyboard'] : /mouse|trackpad/i.test(d.name) ? ICONS['input-mouse'] : /controller|gamepad|xbox|dualsense|joy-?con/i.test(d.name) ? ICONS['input-gaming'] : ICONS.generic);
const KIND = { 'audio-headphones': 'Headphones', 'audio-headset': 'Headset', 'audio-card': 'Speaker', 'input-keyboard': 'Keyboard', 'input-mouse': 'Mouse', 'input-gaming': 'Game controller', 'input-tablet': 'Drawing tablet', phone: 'Phone', computer: 'Computer', printer: 'Printer', camera: 'Camera', watch: 'Watch', 'video-display': 'Display' };

function battery(pct) {
  if (pct == null) return null;
  const w = Math.max(1, Math.round(14 * pct / 100));
  const b = el('span', { class: 'batt' + (pct <= 20 ? ' low' : '') });
  b.innerHTML = `<svg viewBox="0 0 20 11"><rect x=".5" y=".5" width="16" height="10" rx="2" fill="none" stroke="currentColor"/><rect x="17" y="3.5" width="2" height="4" rx="1" fill="currentColor"/><rect class="lvl" x="1.5" y="1.5" width="${w}" height="8" rx="1"/></svg>`;
  b.append(`${pct}%`);
  return b;
}

function render() {
  const P = $('#panel'); P.textContent = '';
  if (!S.available) {
    P.append(el('div', { class: 'off' }, el('img', { src: ICON }), el('div', { class: 'big', text: 'No Bluetooth found' }),
      el('div', { text: 'This computer doesn’t seem to have Bluetooth, or it’s turned off in the computer’s settings (BIOS) or with a switch or key.' })));
    return;
  }
  const a = S.adapter;
  const pw = el('button', { class: 'switch', role: 'switch', 'aria-checked': String(a.powered), title: a.powered ? 'Turn Bluetooth off' : 'Turn Bluetooth on', onclick: () => run('power', !a.powered) });
  P.append(el('div', { class: 'hero' }, el('img', { src: ICON }), el('div', { class: 'tx' }, el('h1', { text: 'Bluetooth' }),
    el('div', { class: 's', text: a.powered ? `On · This computer is “${a.name}”` : 'Off' })), pw));
  if (!a.powered) {
    P.append(el('p', { class: 'note', text: 'Turn Bluetooth on to use wireless headphones, speakers, keyboards, mice and other devices.' }));
    return;
  }
  // this computer
  const vis = el('button', { class: 'switch', role: 'switch', 'aria-checked': String(a.discoverable), onclick: () => run('discoverable', !a.discoverable) });
  P.append(el('div', { class: 'card' },
    el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 't', text: 'Visible to other devices' }),
      el('div', { class: 's', text: a.discoverable ? `Phones and other computers nearby can see “${a.name}”.` : 'Other devices can’t find this computer (devices you paired still connect).' })), vis),
    el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 't', text: 'Name' }), el('div', { class: 's', text: a.name })),
      el('button', { class: 'btn small', onclick: renameComputer }, 'Rename…'))));
  // my devices
  const mine = S.devices.filter((d) => d.paired).sort((x, y) => Number(y.connected) - Number(x.connected) || x.name.localeCompare(y.name));
  P.append(el('h2', { text: 'My Devices' }));
  const card = el('div', { class: 'card' });
  if (!mine.length) card.append(el('div', { class: 'nothing', text: 'No devices yet. Put a device in pairing mode and it appears below.' }));
  for (const d of mine) card.append(deviceRow(d, true));
  P.append(card);
  // nearby
  const near = S.devices.filter((d) => !d.paired && (d.hasName || pending.has(d.path))).sort((x, y) => (y.rssi ?? -999) - (x.rssi ?? -999));
  P.append(el('h2', {}, el('span', { class: 'searching' }, 'Nearby Devices', a.discovering ? el('span', { class: 'spin' }) : null)));
  const nc = el('div', { class: 'card' });
  if (!near.length) nc.append(el('div', { class: 'nothing', text: a.discovering ? 'Looking… Make sure the device is on and in pairing mode (often: hold its power or Bluetooth button until a light flashes).' : 'Nothing found.' }));
  for (const d of near) nc.append(deviceRow(d, false));
  P.append(nc);
  if (!a.discovering) P.append(el('p', { class: 'note' }, el('button', { class: 'btn small', onclick: () => search(true) }, 'Look Again')));
}

function deviceRow(d, mine) {
  const busy = pending.has(d.path);
  const kind = KIND[d.icon] || 'Device';
  const status = busy ? el('span', {}, el('span', { class: 'spin', style: { display: 'inline-block', width: '10px', height: '10px', verticalAlign: '-1px', marginRight: '6px' } }), mine ? 'Connecting…' : 'Pairing…')
    : mine ? (d.connected ? el('span', { class: 'ok', text: 'Connected' }) : el('span', { text: 'Not connected' })) : el('span', { text: kind });
  const s = el('div', { class: 's' }, status, d.connected ? battery(d.battery) : null);
  const ic = el('div', { class: 'ic' }); ic.innerHTML = `<svg viewBox="0 0 24 24">${iconFor(d)}</svg>`;
  const acts = el('div', { class: 'ctl' });
  if (mine) {
    acts.append(el('button', { class: 'btn small', disabled: busy, onclick: () => (d.connected ? run('disconnect', d.path) : withBusy(d.path, 'connect')) }, d.connected ? 'Disconnect' : 'Connect'));
    acts.append(el('button', { class: 'more', title: 'More', onclick: (e) => menu(e, d) }, '⋯'));
  } else acts.append(busy ? el('button', { class: 'btn small', onclick: () => run('cancelPair', d.path) }, 'Cancel') : el('button', { class: 'btn small primary', onclick: () => withBusy(d.path, 'pair') }, 'Pair'));
  return el('div', { class: 'row dev' + (d.connected ? ' on' : '') }, ic, el('div', { class: 'lbl' }, el('div', { class: 't', text: d.name }), s), acts);
}

function menu(e, d) {
  document.querySelectorAll('.menu-pop').forEach((m) => m.remove());
  const m = el('div', { class: 'menu-pop' },
    el('button', { onclick: async () => { m.remove(); const n = await api.invoke('ui:prompt', { message: 'Rename this device', value: d.name, ok: 'Rename' }); if (n && n.trim()) run('renameDevice', d.path, n.trim()); } }, 'Rename…'),
    el('button', { class: 'danger', onclick: async () => { m.remove(); if (await confirmBox(`Forget “${d.name}”?`, 'To use it again you’ll pair it again.', 'Forget', true)) run('forget', d.path); } }, 'Forget This Device…'));
  document.body.append(m);
  const r = e.currentTarget.getBoundingClientRect();
  m.style.left = Math.min(window.innerWidth - 190, r.left - 140) + 'px'; m.style.top = (r.bottom + 4) + 'px';
  setTimeout(() => document.addEventListener('click', function off(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
}

async function run(cmd, ...a) {
  const r = await api.invoke(cmd, ...a);
  if (r && r.error) alertBox('Bluetooth', r.error);
  refresh();
  return r;
}
async function withBusy(p, cmd) { pending.add(p); render(); await run(cmd, p); pending.delete(p); render(); }
async function renameComputer() {
  const n = await api.invoke('ui:prompt', { message: 'Name this computer', detail: 'Other devices see this name.', value: S.adapter.name, ok: 'Rename' });
  if (n && n.trim()) run('rename', n.trim());
}
async function search(on) { searching = on; await api.invoke('search', on); }
async function refresh() { S = await api.invoke('state'); render(); }
api.on('state', (s) => { const wasOff = !(S.adapter && S.adapter.powered); S = s; render(); if (wasOff && S.adapter && S.adapter.powered && searching) api.invoke('search', true); });
api.on('cmd', (c) => { if (c === 'search') search(true); });
// look for nearby devices while the window is open (and Bluetooth is on)
(async () => { await refresh(); if (S.adapter && S.adapter.powered) search(true); else searching = true; })();

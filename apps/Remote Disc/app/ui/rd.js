'use strict';
/* Remote Disc window */
const DISC = 'file:///usr/share/icons/hicolor/256x256/apps/palos-remote-drive.png';
const PC = 'file:///usr/share/icons/palOS/256x256/devices/network-server.png';
let computers = [], inUse = [], scanning = false, extra = [];

async function scan() {
  scanning = true; renderFound();
  const [found, used] = await Promise.all([api.invoke('discover'), api.invoke('inUse')]);
  computers = Array.isArray(found) ? found : [];
  for (const x of extra) if (!computers.some((c) => c.host === x.host)) computers.push(x);
  inUse = Array.isArray(used) ? used : [];
  scanning = false; renderFound();
}
function renderFound() {
  const box = $('#found'); box.textContent = '';
  if (scanning && !computers.length) { box.append(el('div', { class: 'scan' }, el('div', { class: 'spinner' }), 'Looking for computers sharing a drive…')); return; }
  const rows = [];
  for (const c of computers) for (const d of c.drives || []) rows.push([c, d]);
  for (const u of inUse) if (!rows.some(([c, d]) => c.host === u.host && d.id === u.drive)) rows.push([{ host: u.host, port: u.port, name: u.name, os: '' }, { id: u.drive, disc: true, label: u.label }]);
  if (!rows.length) {
    box.append(el('div', { class: 'row' }, el('img', { src: PC }), el('div', { class: 'lbl' }, el('div', { class: 't', text: 'No computers found' }),
      el('div', { class: 's', text: 'On the other computer, turn on “Share this computer’s drive” in Remote Disc (palOS), or run the palOS Remote Disc Helper (Windows).' }))));
    return;
  }
  for (const [c, d] of rows) {
    const used = inUse.find((u) => u.host === c.host && u.drive === d.id);
    const title = d.disc ? (d.label || 'Untitled disc') : 'No disc';
    const sub = `${c.name || c.host}${c.os ? ' · ' + c.os : ''}${d.disc && d.size ? ' · ' + d.kind + ', ' + humanSize(d.size) : ''}`;
    const btn = used ? el('button', { class: 'btn', onclick: () => stop(c, d) }, 'Stop Using')
      : el('button', { class: 'btn primary', disabled: !d.disc, onclick: () => use(c, d) }, 'Use Disc');
    box.append(el('div', { class: 'row' }, el('img', { src: d.disc ? DISC : PC }), el('div', { class: 'lbl' }, el('div', { class: 't' }, title, used ? el('span', { class: 'inuse', text: '  In use here' }) : null), el('div', { class: 's', text: sub })), el('div', { class: 'ctl' }, btn)));
  }
}
async function use(c, d) {
  toast('Connecting…');
  const r = await api.invoke('connect', c.host, c.port || 50556, d.id);
  if (r && r.error) return alertBox('The disc couldn’t be used.', r.error);
  toast(`“${d.label || 'The disc'}” is ready — it’s in Seeker’s sidebar under Devices`);
  scan();
}
async function stop(c, d) {
  const r = await api.invoke('disconnect', c.host, d.id);
  if (r && r.error) return alertBox('That didn’t work.', r.error);
  scan();
}
async function address() {
  const v = await form({ title: 'Connect to an Address', text: 'Type the address of a computer sharing its drive, e.g. 192.168.1.20.', fields: [{ name: 'host', label: 'Address', placeholder: '192.168.1.20' }], ok: 'Connect', validate: (v) => (!/^[\w.:\-\[\]]+$/.test(v.host.trim()) ? 'Type an address like 192.168.1.20.' : null) });
  if (!v) return;
  const r = await api.invoke('probe', v.host.trim());
  if (!r || r.error) return alertBox('No drive is shared at that address.', 'Check that the other computer is sharing its drive and that it’s on the same network.');
  extra = [...extra.filter((x) => x.host !== r.host), r];
  computers = [...computers.filter((x) => x.host !== r.host), r]; renderFound();
}

async function renderShare() {
  const s = await api.invoke('sharing');
  const box = $('#share'); box.textContent = '';
  const sw = el('button', { class: 'switch', role: 'switch', 'aria-checked': String(!!s.enabled), disabled: !s.hasDrive, onclick: async () => {
    const r = await api.invoke('setSharing', !s.enabled); if (r && r.error) return alertBox('Sharing couldn’t be changed.', r.error); renderShare();
  } });
  box.append(el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 't', text: 'Share my CD/DVD drive' }),
    el('div', { class: 's', text: !s.hasDrive ? 'This computer has no CD/DVD drive.' : s.enabled ? `Other computers on this network can use a disc in this computer’s drive. It appears to them as “${s.name}”.` : 'Let other computers on this network use a disc in this computer’s drive.' })), el('div', { class: 'ctl' }, sw)));
}

$('#again').onclick = scan;
$('#addr').onclick = (e) => { e.preventDefault(); address(); };
$('#helper').onclick = async () => { const r = await api.invoke('saveHelper'); if (r && r.error) alertBox('The helper couldn’t be saved.', r.error); else if (r) toast('Saved'); };
api.on('cmd', (c) => ({ refresh: scan, address, helper: () => $('#helper').click() }[c] || (() => {}))());
renderShare(); scan();
setInterval(() => { if (!$('#dlg')) scan(); }, 15000);

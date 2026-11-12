'use strict';
/* Wi-Fi and Network panels. */

function bars(signal) {
  const n = signal > 66 ? 3 : signal > 33 ? 2 : signal > 0 ? 1 : 0;
  return svg(`<path class="${n >= 3 ? 'on' : ''}" d="M1.5 6.2a9.2 9.2 0 0 1 13 0"/><path class="${n >= 2 ? 'on' : ''}" d="M3.9 8.8a5.8 5.8 0 0 1 8.2 0"/><path class="${n >= 1 ? 'on' : ''}" d="M6.3 11.3a2.4 2.4 0 0 1 3.4 0"/>`, 'bars');
}
const lockIcon = () => svg('<rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7"/>', 'lock');
const checkIcon = () => svg('<path d="M3 8.5l3.2 3L13 4.5"/>', 'check');

function details(d) {
  if (!d) return [];
  const out = [];
  if (d.ipv4) out.push(row('IP Address', null, el('span', { class: 'badge', text: d.ipv4 })));
  if (d.gateway) out.push(row('Router', null, el('span', { class: 'badge', text: d.gateway })));
  if (d.dns) out.push(row('DNS', null, el('span', { class: 'badge', text: d.dns })));
  if (d.mac) out.push(row('Hardware Address', null, el('span', { class: 'badge', text: d.mac })));
  return out;
}

panel('wifi', 'Wi-Fi', 'net', async (root, stale) => {
  const st = await sys.call('wifi:status');
  if (stale()) return;
  if (!st.available) { root.append(card(el('div', { class: 'empty', text: 'NetworkManager isn\'t running, so Wi-Fi can\'t be set up here.' }))); return; }
  if (!st.hardware) { root.append(card(el('div', { class: 'empty', text: 'This computer has no Wi-Fi adapter.' }))); return; }

  root.append(card(row('Wi-Fi', st.on ? (st.current ? `Connected to ${st.current}` : 'On, not connected') : 'Off',
    toggle(st.on, async (v) => { await sys.call('wifi:power', v); refresh(); }, 'Wi-Fi'))));
  if (!st.on) { root.append(note('Turn Wi-Fi on to see networks nearby.')); return; }

  if (st.current) {
    root.append(heading('Connected'), card(
      row(st.current, null, button('Disconnect', async () => { await sys.call('wifi:disconnect'); refresh(); }, 'small'),
        button('Forget', async () => {
          const ok = await dialog({ title: `Forget “${st.current}”?`, text: 'Paladin won\'t join it automatically any more, and you\'ll need the password to join again.', ok: 'Forget', danger: true });
          if (ok) { await sys.call('wifi:forget', st.current); refresh(); }
        }, 'small')),
      ...details(st.details)));
  }

  const listCard = card(el('div', { class: 'empty' }, spinner()));
  const rescan = button('Scan Again', () => load(true), 'small');
  root.append(el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, heading('Networks Nearby'), rescan), listCard,
    el('div', { style: { marginTop: '10px' } }, button('Join Hidden Network…', () => join(null, true))));

  async function load(fresh) {
    rescan.disabled = true;
    const nets = await sys.call('wifi:networks', !!fresh);
    rescan.disabled = false;
    if (stale()) return;
    const others = (nets || []).filter((n) => !n.active);
    if (!others.length) { listCard.replaceChildren(el('div', { class: 'empty', text: 'No other networks found.' })); return; }
    listCard.replaceChildren(...others.slice(0, 30).map((n) => {
      const r = el('div', { class: 'row click', tabindex: '0', role: 'button', 'aria-label': `Join ${n.ssid}` },
        bars(n.signal), el('div', { class: 'lbl' }, el('div', { class: 't', text: n.ssid }), n.known ? el('div', { class: 's', text: 'Saved' }) : null),
        el('div', { class: 'ctl' }, n.secure ? lockIcon() : null));
      const go = () => join(n);
      r.addEventListener('click', go); r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      return r;
    }));
  }

  async function join(n, hidden) {
    if (hidden) {
      const v = await dialog({ title: 'Join a Hidden Network', fields: [{ name: 'ssid', label: 'Network name' }, { name: 'pw', label: 'Password (leave empty for an open network)', type: 'password' }], ok: 'Join',
        check: async (v) => { if (!v.ssid.trim()) return 'Type the network\'s name.'; const r = await sys.call('wifi:connect', v.ssid.trim(), v.pw || null, true); return r.ok ? null : friendlyError(r.error); } });
      if (v) { toast(`Connected to ${v.ssid}`); refresh(); }
      return;
    }
    if (!n.secure || n.known) {
      toast(`Joining ${n.ssid}…`, 4000);
      const r = await sys.call('wifi:connect', n.ssid, null);
      if (r.ok) { toast(`Connected to ${n.ssid}`); refresh(); return; }
      if (!r.needsPassword) { toast(friendlyError(r.error), 5000); return; }
      // a saved network: Paladin's Wi-Fi agent has already asked for the password; don't ask a second time
      if (n.known && await sys.call('wifi:agent')) { toast(friendlyError(r.error), 5000); return; }
    }
    const v = await dialog({ title: `Join “${n.ssid}”`, text: 'Type the Wi-Fi password.', fields: [{ name: 'pw', label: 'Password', type: 'password' }], ok: 'Join',
      extra: el('label', { class: 'inline', style: { fontSize: '13px', margin: '-4px 0 10px', display: 'flex', gap: '8px', alignItems: 'center' } },
        el('input', { type: 'checkbox', onchange: (e) => { const i = document.querySelector('#dlg input[type=password], #dlg input[data-shown]'); if (i) { i.type = e.target.checked ? 'text' : 'password'; i.toggleAttribute('data-shown', e.target.checked); } } }), 'Show password'),
      check: async (v) => { if (!v.pw) return 'Type the password.'; const r = await sys.call('wifi:connect', n.ssid, v.pw); return r.ok ? null : friendlyError(r.error); } });
    if (v) { toast(`Connected to ${n.ssid}`); refresh(); }
  }
  load(false);
});

function friendlyError(e) {
  e = String(e || '');
  if (/secrets were required|password|psk|802-1x/i.test(e)) return 'That password didn\'t work. Check it and try again.';
  if (/No network with SSID/i.test(e)) return 'That network isn\'t in range.';
  if (/timeout|timed out/i.test(e)) return 'The network didn\'t answer. Try again closer to the router.';
  return e || 'Couldn\'t connect.';
}

panel('network', 'Network', 'net', async (root, stale) => {
  const o = await sys.call('net:overview');
  if (stale()) return;
  if (!o.available) { root.append(card(el('div', { class: 'empty', text: 'NetworkManager isn\'t running, so networks can\'t be set up here.' }))); return; }

  root.append(heading('Wired'));
  if (!o.wired.length) root.append(card(el('div', { class: 'empty', text: 'No network cable port found.' })));
  else root.append(card(...o.wired.flatMap((w) => [row(w.connected ? 'Connected' : 'Cable unplugged', w.device, el('span', { class: 'badge ' + (w.connected ? 'status-ok' : ''), text: w.connected ? '●' : '○' })), ...details(w.details)])));

  root.append(heading('VPN'));
  if (!o.vpns.length) root.append(card(el('div', { class: 'empty', text: 'No VPNs set up yet.' })));
  else root.append(card(...o.vpns.map((v) => row(v.name, v.type, toggle(v.active, async (on) => {
    const r = await sys.call('net:vpn', v.uuid, on);
    if (!r.ok) toast(r.error || 'The VPN didn\'t connect.', 5000);
    refresh();
  }, v.name)))));

  root.append(heading('Other'), card(
    row('Airplane Mode', 'Turns off Wi-Fi and every other radio', toggle(o.airplane, async (v) => { await sys.call('net:airplane', v); refresh(); }, 'Airplane Mode')),
    row('Computer Name', o.hostname || '—', button('Rename…', async () => {
      const v = await dialog({ title: 'Rename This Computer', text: 'Other computers and devices on your network see this name.', fields: [{ name: 'n', label: 'Computer name', value: o.hostname || '' }], ok: 'Rename',
        check: async (v) => {
          const n = v.n.trim();
          if (!n || !/[A-Za-z0-9À-ÿ]/.test(n)) return 'Use letters or numbers in the name.';
          if (n.length > 63) return 'Use 63 characters or fewer.';
          const r = await sys.call('net:computer-name', n);
          if (r.cancelled) return 'An administrator password is needed to rename the computer.';
          return r.ok ? null : r.error;
        } });
      if (v) { toast(`This computer is now called “${v.n.trim()}”`); refresh(); }
    }, 'small'))));
  if (o.editor) root.append(el('div', { style: { marginTop: '12px' } }, button('Advanced Connection Settings…', () => sys.call('net:editor'))),
    note('Opens NetworkManager\'s connection editor for VPN setup, static addresses and proxies.'));
});

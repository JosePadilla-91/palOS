'use strict';
/* Advanced Network Settings window */
const ICON = 'file:///usr/share/icons/hicolor/256x256/apps/palos-network.png';
const N = { list: [], sel: null, data: null, device: null, edits: {}, remove: [], tab: 'general', secrets: false };
const KINDS = { wifi: 'Wi-Fi', ethernet: 'Ethernet', vpn: 'VPN', wireguard: 'WireGuard VPN', mobile: 'Mobile broadband', bridge: 'Bridge', bond: 'Bond', vlan: 'VLAN', pppoe: 'DSL (PPPoE)', bluetooth: 'Bluetooth', tun: 'Tunnel' };
const ORDER = ['wifi', 'ethernet', 'vpn', 'wireguard', 'mobile', 'pppoe'];

// ---------------------------------------------------------------- the settings shown, and the NetworkManager keys behind them
const YESNO = { to: (v) => (v ? 'yes' : 'no'), from: (v) => v === 'yes' };
const MAC_OPTS = [['', 'This device’s own address'], ['permanent', 'This device’s own address (always)'], ['stable', 'Private address (the same on this network)'], ['random', 'Private address (new each time)'], ['preserve', 'Keep whatever address the device has']];
const IP4_METHODS = [['auto', 'Automatic (DHCP)'], ['manual', 'Manual'], ['link-local', 'Link-local only'], ['shared', 'Share this computer’s connection'], ['disabled', 'Off']];
const IP6_METHODS = [['auto', 'Automatic'], ['dhcp', 'Automatic (DHCP only)'], ['manual', 'Manual'], ['link-local', 'Link-local only'], ['shared', 'Share this computer’s connection'], ['disabled', 'Off'], ['ignore', 'Leave alone']];
const SECURITY = [['', 'None'], ['wpa-psk', 'WPA2 Personal'], ['sae', 'WPA3 Personal'], ['wpa-eap', 'WPA2/WPA3 Enterprise'], ['owe', 'Enhanced Open (OWE)'], ['none', 'WEP (old, not safe)']];
const TABS = {
  general: { label: 'General', fields: [
    { key: 'connection.id', label: 'Name', type: 'text' },
    { key: 'connection.autoconnect', label: 'Connect automatically', type: 'switch', map: YESNO },
    { key: 'connection.autoconnect-priority', label: 'Priority', hint: 'When several networks are in range, the one with the higher number is joined first.', type: 'number' },
    { key: 'connection.permissions', label: 'Everyone on this computer can use it', hint: 'Off: only your account uses this connection.', type: 'switch', map: { to: (v) => (v ? '' : `user:${N.user || ''}`), from: (v) => !v } },
    { key: 'connection.metered', label: 'Metered', hint: 'A limited data plan (a phone hotspot): palOS holds back big downloads and updates.', type: 'select', options: [['unknown', 'Detect automatically'], ['yes', 'Yes'], ['no', 'No']] },
    { key: '802-11-wireless.ssid', label: 'Network name (SSID)', type: 'text', only: ['wifi'] },
    { key: '802-11-wireless.hidden', label: 'Hidden network', type: 'switch', map: YESNO, only: ['wifi'] },
    { key: '802-11-wireless.band', label: 'Band', type: 'select', options: [['', 'Automatic'], ['a', '5 GHz only'], ['bg', '2.4 GHz only']], only: ['wifi'] },
    { key: '802-11-wireless.cloned-mac-address', label: 'Hardware (MAC) address', hint: 'A private address keeps networks from following this computer from place to place.', type: 'select', options: MAC_OPTS, only: ['wifi'] },
    { key: '802-3-ethernet.cloned-mac-address', label: 'Hardware (MAC) address', type: 'select', options: MAC_OPTS, only: ['ethernet'] },
    { key: '802-11-wireless.mtu', label: 'MTU', hint: 'Leave at Automatic unless your provider asks for a number.', type: 'mtu', only: ['wifi'] },
    { key: '802-3-ethernet.mtu', label: 'MTU', hint: 'Leave at Automatic unless your provider asks for a number.', type: 'mtu', only: ['ethernet'] },
  ] },
  security: { label: 'Security', only: ['wifi'], fields: [
    { key: '802-11-wireless-security.key-mgmt', label: 'Security', type: 'select', options: SECURITY },
    { key: '802-11-wireless-security.psk', label: 'Password', type: 'password', show: (g) => ['wpa-psk', 'sae'].includes(g('802-11-wireless-security.key-mgmt')) },
    { key: '802-11-wireless-security.wep-key0', label: 'WEP key', type: 'password', show: (g) => g('802-11-wireless-security.key-mgmt') === 'none' },
    { key: '802-1x.eap', label: 'Sign-in method', type: 'select', options: [['peap', 'PEAP'], ['ttls', 'TTLS'], ['tls', 'TLS (certificate)'], ['pwd', 'PWD']], show: (g) => g('802-11-wireless-security.key-mgmt') === 'wpa-eap' },
    { key: '802-1x.identity', label: 'User name', type: 'text', show: (g) => g('802-11-wireless-security.key-mgmt') === 'wpa-eap' },
    { key: '802-1x.password', label: 'Password', type: 'password', show: (g) => g('802-11-wireless-security.key-mgmt') === 'wpa-eap' && g('802-1x.eap') !== 'tls' },
    { key: '802-1x.anonymous-identity', label: 'Anonymous identity', type: 'text', show: (g) => g('802-11-wireless-security.key-mgmt') === 'wpa-eap' },
    { key: '802-1x.phase2-auth', label: 'Inner sign-in', type: 'select', options: [['mschapv2', 'MSCHAPv2'], ['pap', 'PAP'], ['chap', 'CHAP'], ['gtc', 'GTC'], ['md5', 'MD5']], show: (g) => ['peap', 'ttls'].includes(g('802-1x.eap')) && g('802-11-wireless-security.key-mgmt') === 'wpa-eap' },
    { key: '802-1x.ca-cert', label: 'Certificate authority (file)', hint: 'Leave empty to skip checking the server’s certificate (less safe).', type: 'text', show: (g) => g('802-11-wireless-security.key-mgmt') === 'wpa-eap' },
  ] },
  ipv4: { label: 'IPv4', fields: [
    { key: 'ipv4.method', label: 'Configure', type: 'select', options: IP4_METHODS },
    { key: 'ipv4.addresses', label: 'Addresses', hint: 'With the prefix, e.g. 192.168.1.20/24. Separate several with commas.', type: 'text', show: (g) => ['manual', 'auto'].includes(g('ipv4.method')) },
    { key: 'ipv4.gateway', label: 'Router (gateway)', type: 'text', show: (g) => g('ipv4.method') === 'manual' },
    { key: 'ipv4.dns', label: 'DNS servers', hint: 'Separate several with commas, e.g. 1.1.1.1, 9.9.9.9', type: 'text', show: (g) => g('ipv4.method') !== 'disabled' },
    { key: 'ipv4.ignore-auto-dns', label: 'Use only these DNS servers', type: 'switch', map: YESNO, show: (g) => g('ipv4.method') === 'auto' },
    { key: 'ipv4.dns-search', label: 'Search domains', type: 'text', show: (g) => g('ipv4.method') !== 'disabled' },
    { key: 'ipv4.never-default', label: 'Use only for its own network', hint: 'Never send internet traffic through this connection (split tunnel).', type: 'switch', map: YESNO, show: (g) => g('ipv4.method') !== 'disabled' },
    { key: 'ipv4.may-fail', label: 'IPv4 is optional', hint: 'Off: the connection only counts as connected once it has an IPv4 address.', type: 'switch', map: YESNO, show: (g) => g('ipv4.method') !== 'disabled' },
  ] },
  ipv6: { label: 'IPv6', fields: [
    { key: 'ipv6.method', label: 'Configure', type: 'select', options: IP6_METHODS },
    { key: 'ipv6.addresses', label: 'Addresses', hint: 'With the prefix, e.g. 2001:db8::20/64.', type: 'text', show: (g) => ['manual', 'auto', 'dhcp'].includes(g('ipv6.method')) },
    { key: 'ipv6.gateway', label: 'Router (gateway)', type: 'text', show: (g) => g('ipv6.method') === 'manual' },
    { key: 'ipv6.dns', label: 'DNS servers', type: 'text', show: (g) => !['disabled', 'ignore'].includes(g('ipv6.method')) },
    { key: 'ipv6.ignore-auto-dns', label: 'Use only these DNS servers', type: 'switch', map: YESNO, show: (g) => ['auto', 'dhcp'].includes(g('ipv6.method')) },
    { key: 'ipv6.ip6-privacy', label: 'Private addresses', hint: 'Temporary addresses that change over time, so websites can’t track this computer by its address.', type: 'select', options: [['-1', 'Default'], ['2', 'On'], ['1', 'On, but prefer the permanent address'], ['0', 'Off']], show: (g) => ['auto', 'dhcp'].includes(g('ipv6.method')) },
    { key: 'ipv6.never-default', label: 'Use only for its own network', type: 'switch', map: YESNO, show: (g) => !['disabled', 'ignore'].includes(g('ipv6.method')) },
  ] },
  proxy: { label: 'Proxy', fields: [
    { key: 'proxy.method', label: 'Proxy', type: 'select', options: [['none', 'None'], ['auto', 'Automatic (a configuration file)']] },
    { key: 'proxy.pac-url', label: 'Configuration file address', hint: 'e.g. http://proxy.example.com/proxy.pac — leave empty to find it automatically (WPAD).', type: 'text', show: (g) => g('proxy.method') === 'auto' },
    { key: 'proxy.browser-only', label: 'Browsers only', type: 'switch', map: YESNO, show: (g) => g('proxy.method') === 'auto' },
  ] },
  vpn: { label: 'VPN', only: ['vpn'], fields: [
    { key: 'vpn.service-type', label: 'Kind', type: 'readonly' },
    { key: 'vpn.user-name', label: 'User name', type: 'text' },
    { key: 'vpn.data', label: 'Settings', hint: 'One per line: name = value', type: 'lines' },
  ] },
};

// ---------------------------------------------------------------- list
const sub = (c) => (c.active ? `Connected${c.device ? ' · ' + c.device : ''}` : KINDS[c.type] || c.rawType);
async function load(keepSel) {
  const r = await api.invoke('list');
  if (r && r.error) { $('#nav').textContent = ''; $('#view').textContent = ''; $('#view').append(el('div', { class: 'empty' }, el('div', { class: 'big', text: 'Network settings aren’t available' }), el('div', { text: r.error }))); return; }
  N.list = r;
  if (!keepSel || !N.list.some((c) => c.uuid === N.sel)) N.sel = (N.list.find((c) => c.active) || N.list[0] || {}).uuid || null;
  sidebar();
  if (!keepSel) await open(N.sel);
}
function sidebar() {
  const nav = $('#nav'); nav.textContent = '';
  const groups = {};
  for (const c of N.list) (groups[c.type] = groups[c.type] || []).push(c);
  const order = [...ORDER, ...Object.keys(groups).filter((k) => !ORDER.includes(k))];
  for (const k of order) {
    if (!groups[k]) continue;
    nav.append(el('div', { class: 'grp-title', text: KINDS[k] || k }));
    for (const c of groups[k].sort((a, b) => Number(b.active) - Number(a.active) || b.last - a.last)) {
      nav.append(el('button', { class: 'nav' + (c.uuid === N.sel ? ' on' : ''), onclick: () => choose(c.uuid) },
        el('span', { class: 'n' }, el('b', { text: c.name }), el('small', { text: sub(c) })), c.active ? el('span', { class: 'dot' }) : null));
    }
  }
  if (!N.list.length) nav.append(el('div', { class: 'grp-title', style: { fontWeight: 400 }, text: 'No saved connections' }));
}
async function choose(uuid) {
  if (uuid === N.sel) return;
  if (dirty() && !(await confirmBox('Discard your changes?', `Your changes to “${val('connection.id')}” haven’t been applied.`, 'Discard', true))) return;
  N.sel = uuid; sidebar(); open(uuid);
}
async function open(uuid, secrets) {
  N.edits = {}; N.remove = []; N.secrets = !!secrets;
  if (!uuid) { N.data = null; render(); return; }
  const r = await api.invoke('settings', uuid, !!secrets);
  if (r && r.error) { if (secrets) { N.secrets = false; return; } alertBox('This connection couldn’t be read', r.error); return; }
  N.data = r.settings; N.device = r.device;
  const tabs = tabsFor(); if (!tabs.includes(N.tab)) N.tab = 'general';
  render();
}
const cur = () => N.list.find((c) => c.uuid === N.sel) || {};
const raw = (k) => (k in N.edits ? N.edits[k] : (N.data || {})[k] ?? '');
const val = (k) => raw(k);
const dirty = () => Object.keys(N.edits).length > 0 || N.remove.length > 0;
function tabsFor() { const t = cur().type; return Object.entries(TABS).filter(([, d]) => !d.only || d.only.includes(t)).map(([k]) => k); }

// ---------------------------------------------------------------- editor
function render() {
  const v = $('#view'); v.textContent = '';
  if (!N.data) { v.append(el('div', { class: 'empty' }, el('img', { src: ICON, style: { width: '110px' } }), el('div', { class: 'big', text: 'No connection selected' }))); return; }
  const c = cur();
  v.append(el('div', { class: 'ehead' }, el('img', { src: ICON }), el('div', { class: 'tx' }, el('h1', { text: val('connection.id') || c.name }), el('div', { class: 's', text: `${KINDS[c.type] || c.rawType}${c.active ? ' · Connected' : ''}` })),
    c.active ? el('button', { class: 'btn small', onclick: () => act('disconnect') }, 'Disconnect') : el('button', { class: 'btn small', onclick: () => act('reconnect') }, 'Connect')));
  const seg = el('div', { class: 'seg tabs' }, ...tabsFor().map((k) => el('button', { 'aria-pressed': String(N.tab === k), onclick: () => { N.tab = k; render(); } }, TABS[k].label)));
  v.append(seg);
  if (N.tab === 'general' && c.active && N.device) v.append(details());
  const card = el('div', { class: 'card form' });
  for (const f of TABS[N.tab].fields) {
    if (f.only && !f.only.includes(c.type)) continue;
    if (f.show && !f.show(val)) continue;
    if (!(f.key in N.data) && f.type !== 'password' && !(f.key in N.edits) && !/^802-1x\.|^802-11-wireless-security\./.test(f.key)) continue;
    card.append(fieldRow(f));
  }
  if (N.tab === 'vpn' && c.type === 'wireguard') card.append(el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 's', text: 'WireGuard peers are set in the configuration file you imported. To change them, import an updated file.' }))));
  v.append(card);
  v.append(el('div', { class: 'bar' }, el('span', { class: 'grow', text: dirty() ? 'Changes not applied yet' : '' }),
    el('button', { class: 'btn', disabled: !dirty(), onclick: () => open(N.sel) }, 'Revert'),
    el('button', { class: 'btn primary', disabled: !dirty(), onclick: apply }, 'Apply')));
}
function details() {
  const d = N.device;
  const rows = [['IP address', d.ip4.join(', ')], ['Router', d.gw4], ['DNS', d.dns4.join(', ')], ['IPv6', d.ip6.filter((x) => !/^fe80/i.test(x)).join(', ') || d.ip6.join(', ')], ['Hardware address', d.mac], ['Speed', d.speed ? `${d.speed} Mb/s` : '']].filter(([, x]) => x);
  return el('div', { class: 'card', style: { padding: '10px 16px', marginBottom: '14px' } }, el('table', { class: 'details', style: { width: '100%', fontSize: '12.5px' } },
    ...rows.map(([k, x]) => el('tr', {}, el('td', { style: { color: 'var(--dim)', width: '34%' }, text: k }), el('td', { style: { userSelect: 'text' }, text: x })))));
}
function set(k, v) {
  const orig = (N.data || {})[k] ?? '';
  if (String(v) === String(orig)) delete N.edits[k]; else N.edits[k] = v;
  render();
}
function fieldRow(f) {
  const k = f.key; const v = val(k);
  let ctl;
  if (f.type === 'switch') ctl = el('button', { class: 'switch', role: 'switch', 'aria-checked': String(f.map.from(v)), onclick: () => set(k, f.map.to(!f.map.from(v))) });
  else if (f.type === 'select') {
    const opts = f.options.slice(); if (!opts.some(([x]) => x === v)) opts.push([v, v || 'Default']);
    ctl = el('select', { onchange: (e) => onSelect(f, e.target.value) }, ...opts.map(([x, l]) => el('option', { value: x, selected: x === v }, l)));
  } else if (f.type === 'readonly') ctl = el('span', { class: 'badge mono', text: v.replace(/^org\.freedesktop\.NetworkManager\./, '') });
  else if (f.type === 'lines') ctl = el('textarea', { spellcheck: 'false', onchange: (e) => set(k, e.target.value.split('\n').map((s) => s.trim()).filter(Boolean).join(', ')) }, v.split(/,\s*/).filter(Boolean).join('\n'));
  else if (f.type === 'mtu') ctl = el('input', { type: 'text', value: v === 'auto' || v === '0' ? '' : v, placeholder: 'Automatic', onchange: (e) => set(k, e.target.value.trim() || 'auto') });
  else if (f.type === 'number') ctl = el('input', { type: 'text', value: v, style: { width: '90px' }, onchange: (e) => set(k, e.target.value.trim() || '0') });
  else if (f.type === 'password') {
    const shown = N.secrets;
    const inp = el('input', { type: shown ? 'text' : 'password', value: shown ? v : (v || ''), placeholder: shown ? '' : '••••••••', onchange: (e) => set(k, e.target.value) });
    ctl = el('div', { class: 'pw' }, inp, el('button', { class: 'btn small', onclick: async () => { if (!N.secrets) { await open(N.sel, true); } else { N.secrets = false; render(); } } }, shown ? 'Hide' : 'Show'));
  } else ctl = el('input', { type: 'text', value: v, spellcheck: 'false', onchange: (e) => set(k, e.target.value.trim()) });
  return el('div', { class: 'row' + (k in N.edits ? ' changed' : '') }, el('div', { class: 'lbl' }, el('div', { class: 't', text: f.label }), f.hint ? el('div', { class: 's', text: f.hint }) : null), el('div', { class: 'ctl' }, ctl));
}
function onSelect(f, v) {
  // security: none takes the security section away; the others need it (and a key type)
  if (f.key === '802-11-wireless-security.key-mgmt') {
    if (v === '') { N.remove = ['802-11-wireless-security']; for (const k of Object.keys(N.edits)) if (k.startsWith('802-11-wireless-security.')) delete N.edits[k]; render(); return; }
    N.remove = [];
  }
  set(f.key, v);
}
async function apply() {
  const c = cur();
  const r = await api.invoke('save', N.sel, { ...N.edits, '-remove': N.remove });
  if (r && r.error) return alertBox('The changes couldn’t be applied', r.error);
  const name = val('connection.id');
  await load(true);
  await open(N.sel);
  if (c.active) {
    const q = await api.invoke('ui:message', { type: 'question', message: `Reconnect “${name}” now?`, detail: 'Some changes only take effect when the connection starts again. Reconnecting interrupts it for a moment.', buttons: ['Later', 'Reconnect'], defaultId: 1, cancelId: 0 });
    if (q && q.response === 1) act('reconnect');
  } else toast('Changes applied');
}
async function act(what) {
  const r = await api.invoke(what, N.sel);
  if (r && r.error) alertBox(what === 'reconnect' ? 'Couldn’t connect' : 'That didn’t work', r.error);
  await load(true); open(N.sel);
}

// ---------------------------------------------------------------- add, delete, duplicate
function popup(anchor, items) {
  document.querySelectorAll('.menu-pop').forEach((m) => m.remove());
  const m = el('div', { class: 'menu-pop' }, ...items.map((it) => (it === '-' ? el('hr') : el('button', { onclick: () => { m.remove(); it[1](); } }, it[0]))));
  document.body.append(m);
  const r = anchor.getBoundingClientRect();
  m.style.left = r.left + 'px'; m.style.top = Math.max(8, r.top - m.offsetHeight - 6) + 'px';
  setTimeout(() => document.addEventListener('click', function off(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
}
async function addEthernet() { const r = await api.invoke('add', 'ethernet', { name: 'Wired connection' }); if (r.error) return alertBox('Couldn’t add it', r.error); await load(true); if (r.uuid) { N.sel = r.uuid; sidebar(); open(r.uuid); } }
async function addWifi() {
  const v = await form({ title: 'New Wi-Fi connection', text: 'For a hidden network, or to set one up before you’re in range.', ok: 'Add', fields: [
    { name: 'ssid', label: 'Network name (SSID)' }, { name: 'password', label: 'Password (WPA2/WPA3 Personal; leave empty for none)', type: 'password' }, { name: 'hidden', label: 'This network is hidden', type: 'checkbox', value: true }],
    validate: (x) => (!x.ssid.trim() ? 'Type the network’s name.' : x.password && (x.password.length < 8 || x.password.length > 63) ? 'Wi-Fi passwords have 8 to 63 characters.' : null) });
  if (!v) return;
  const r = await api.invoke('add', 'wifi', { ssid: v.ssid.trim(), password: v.password, hidden: v.hidden });
  if (r.error) return alertBox('Couldn’t add it', r.error);
  await load(true); if (r.uuid) { N.sel = r.uuid; sidebar(); open(r.uuid); }
}
async function importVpn() { const r = await api.invoke('import'); if (r.cancelled) return; if (r.error) return alertBox('The VPN couldn’t be imported', r.error); await load(true); if (r.uuid) { N.sel = r.uuid; sidebar(); open(r.uuid); } toast('VPN imported'); }
async function del() {
  const c = cur(); if (!c.uuid) return;
  if (!(await confirmBox(`Delete “${c.name}”?`, c.type === 'wifi' ? 'This computer forgets the network and its password.' : 'Its settings are deleted.', 'Delete', true))) return;
  const r = await api.invoke('delete', c.uuid); if (r.error) return alertBox('Couldn’t delete it', r.error);
  load();
}
async function duplicate() {
  const c = cur(); if (!c.uuid) return;
  const name = await api.invoke('ui:prompt', { message: 'Name the copy', value: `${c.name} copy`, ok: 'Duplicate' }); if (!name) return;
  const r = await api.invoke('duplicate', c.uuid, name); if (r.error) return alertBox('Couldn’t duplicate it', r.error);
  load(true);
}
$('#addBtn').onclick = (e) => popup(e.currentTarget, [['Wired (Ethernet) Connection', addEthernet], ['Wi-Fi Connection…', addWifi], '-', ['Import VPN Configuration…', importVpn]]);
$('#delBtn').onclick = del;
$('#moreBtn').onclick = (e) => popup(e.currentTarget, [['Duplicate…', duplicate], ['Refresh', () => load(true)]]);
api.on('cmd', (c) => ({ addEthernet, addWifi, import: importVpn, delete: del, duplicate, refresh: () => load(true) }[c] || (() => {}))());
api.on('changed', async () => { await load(true); });
(async () => { try { N.user = await api.invoke('user'); } catch {} load(); })();

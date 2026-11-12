'use strict';
/* Printers window */
const ICON = 'file:///usr/share/icons/hicolor/256x256/apps/palos-printers.png';
const P = { list: [], sel: null, mode: 'printer', found: null, scanning: false, opts: null };

function sidebar() {
  const nav = $('#nav'); nav.textContent = '';
  if (!P.list.length) nav.append(el('div', { class: 'grp-title', style: { fontWeight: 400 }, text: 'No printers yet' }));
  for (const p of P.list) nav.append(el('button', { class: 'nav' + (P.mode === 'printer' && P.sel === p.name ? ' on' : ''), onclick: () => { P.mode = 'printer'; P.sel = p.name; P.opts = null; render(); } },
    el('img', { src: ICON }), el('span', { class: 'n' }, p.info, p.isDefault ? el('div', { class: 'def', text: 'Default' }) : null), p.jobs.length ? el('span', { class: 'c', text: p.jobs.length }) : null));
}
let lastJSON = '';
async function load(quiet) {
  const r = await api.invoke('printers');
  const list = Array.isArray(r) ? r : [];
  const j = JSON.stringify(list);
  if (quiet && j === lastJSON) return;          // nothing changed: leave the window alone
  lastJSON = j; P.list = list;
  if (!P.list.some((p) => p.name === P.sel)) P.sel = (P.list.find((p) => p.isDefault) || P.list[0] || {}).name || null;
  if (!P.list.length && P.mode === 'printer') P.mode = 'empty';
  sidebar(); render();
}

function render() {
  sidebar();
  const v = $('#view'); v.textContent = '';
  if (P.mode === 'add') return renderAdd(v);
  const p = P.list.find((x) => x.name === P.sel);
  if (!p) {
    v.append(el('div', { class: 'empty' }, el('img', { src: ICON, style: { width: '120px' } }), el('div', { class: 'big', text: 'No printers yet' }), el('div', { text: 'Turn your printer on and connect it to this computer or your network, then add it.' }), el('button', { class: 'btn primary', onclick: startAdd }, 'Add Printer…')));
    return;
  }
  const stateText = p.state === 'paused' ? 'Paused' : p.state === 'printing' ? 'Printing' : 'Ready';
  v.append(el('div', { class: 'phead' }, el('img', { src: ICON }), el('div', {},
    el('h1', { text: p.info }), el('div', { class: 's', text: [p.model, p.location].filter(Boolean).join(' · ') || p.name }),
    el('div', { class: 'state ' + p.state }, el('i'), stateText + (p.message && !/idle|enabled/i.test(p.message) ? ` — ${p.message}` : '')),
    p.alerts && !/none/i.test(p.alerts) ? el('div', { class: 's', style: { color: 'var(--warn)', marginTop: '4px' }, text: p.alerts.replace(/-/g, ' ') }) : null)));
  v.append(el('div', { class: 'btns' },
    el('button', { class: 'btn', onclick: () => test(p) }, 'Print Test Page'),
    p.isDefault ? null : el('button', { class: 'btn', onclick: async () => { await api.invoke('setDefault', p.name); toast(`${p.info} is now your default printer`); load(); } }, 'Make Default'),
    el('button', { class: 'btn', onclick: () => pauseResume(p) }, p.state === 'paused' ? 'Resume Printing' : 'Pause Printing'),
    el('button', { class: 'btn', onclick: () => rename(p) }, 'Name & Location…'),
    el('button', { class: 'btn danger', onclick: () => remove(p) }, 'Remove…')));

  v.append(el('h2', { text: 'Print queue' }));
  const jobs = el('div', { class: 'card jobs' });
  if (!p.jobs.length) jobs.append(el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 's', text: 'Nothing is waiting to print.' }))));
  for (const j of p.jobs) jobs.append(el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 't', text: `Job ${j.id.split('-').pop()} · ${humanSize(j.size)}` }), el('div', { class: 's', text: `${j.user} · ${j.when}` })),
    el('div', { class: 'ctl' }, el('button', { class: 'btn small', onclick: async () => { await api.invoke('cancel', j.id); load(); } }, 'Cancel'))));
  if (p.jobs.length > 1) jobs.append(el('div', { class: 'row' }, el('div', { class: 'lbl' }), el('div', { class: 'ctl' }, el('button', { class: 'btn small danger', onclick: async () => { await api.invoke('cancelAll', p.name); load(); } }, 'Cancel All'))));
  v.append(jobs);

  v.append(el('h2', { text: 'Options' }));
  const oc = el('div', { class: 'card' }); v.append(oc);
  (async () => {
    const opts = P.opts && P.opts.name === p.name ? P.opts.list : await api.invoke('options', p.name);
    P.opts = { name: p.name, list: Array.isArray(opts) ? opts : [] };
    if (!P.opts.list.length) { oc.append(el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 's', text: 'This printer has no options to choose.' })))); return; }
    for (const o of P.opts.list) {
      const s = el('select', { onchange: async () => { await api.invoke('setOption', p.name, o.key, s.value); o.value = s.value; toast('Saved'); } }, ...o.choices.map((c) => el('option', { value: c, selected: c === o.value }, pretty(c))));
      oc.append(el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 't', text: o.label })), el('div', { class: 'ctl' }, s)));
    }
  })();
  v.append(el('h2', { text: 'Connection' }), el('div', { class: 'card' }, el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 't', text: connKind(p.uri) }), el('div', { class: 's mono', text: p.uri })))));
}
const pretty = (c) => ({ None: 'Off (one-sided)', DuplexNoTumble: 'Long edge', DuplexTumble: 'Short edge', 'one-sided': 'Off (one-sided)', 'two-sided-long-edge': 'Long edge', 'two-sided-short-edge': 'Short edge', Gray: 'Black & white', RGB: 'Colour', monochrome: 'Black & white', color: 'Colour', auto: 'Automatic' }[c] || c.replace(/^(iso|na|om|jis|jpn|roc|prc)_/, '').replace(/_\d.*$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()));
const connKind = (u) => /^usb:/.test(u) ? 'USB' : /^(ipps?|dnssd|http):/.test(u) ? 'Network (IPP)' : /^socket:/.test(u) ? 'Network (JetDirect)' : /^lpd:/.test(u) ? 'Network (LPD)' : /^smb:/.test(u) ? 'Windows sharing' : 'Other';

async function test(p) { const r = await api.invoke('testPage', p.name); if (r && r.error) return alertBox('The test page couldn’t be sent.', r.error); toast('Test page sent'); setTimeout(load, 800); }
async function pauseResume(p) { const r = await api.invoke(p.state === 'paused' ? 'resume' : 'pause', p.name); if (r && r.error) return alertBox('That didn’t work.', r.error); load(); }
async function remove(p) { if (!(await confirmBox(`Remove “${p.info}”?`, 'You can add it again later.', 'Remove', true))) return; const r = await api.invoke('remove', p.name); if (r && r.error) return alertBox('The printer couldn’t be removed.', r.error); P.sel = null; load(); }
async function rename(p) {
  const v = await form({ title: 'Name & Location', fields: [{ name: 'info', label: 'Name', value: p.info }, { name: 'loc', label: 'Location', value: p.location, placeholder: 'e.g. Office' }], ok: 'Save', validate: (v) => (!v.info.trim() ? 'Give it a name.' : null) });
  if (!v) return; const r = await api.invoke('rename', p.name, v.info.trim(), v.loc.trim()); if (r && r.error) return alertBox('That didn’t work.', r.error); load();
}

// ---------------------------------------------------------------- adding a printer
function startAdd() { P.mode = 'add'; P.found = null; render(); scan(); }
async function scan() {
  P.scanning = true; render();
  const r = await api.invoke('discover');
  P.found = Array.isArray(r) ? r : []; P.scanning = false; if (P.mode === 'add') render();
}
function renderAdd(v) {
  const pane = el('div', { class: 'addpane' });
  pane.append(el('h1', { text: 'Add a Printer' }), el('p', { class: 'note', text: 'Printers that are turned on and connected to this computer or your network appear here.' }));
  const card = el('div', { class: 'card found' });
  if (P.scanning) card.append(el('div', { class: 'scan' }, el('div', { class: 'spinner' }), 'Looking for printers…'));
  else if (!P.found || !P.found.length) card.append(el('div', { class: 'row' }, el('div', { class: 'lbl' }, el('div', { class: 't', text: 'No new printers found' }), el('div', { class: 's', text: 'Check that it’s turned on and connected, or add it by its address.' }))));
  for (const f of P.found || []) card.append(el('div', { class: 'row' }, el('img', { src: ICON }), el('div', { class: 'lbl' }, el('div', { class: 't', text: f.name }), el('div', { class: 's', text: f.kind === 'usb' ? 'USB' : 'Network' })),
    el('div', { class: 'ctl' }, el('button', { class: 'btn small primary', onclick: () => addFound(f) }, 'Add'))));
  pane.append(card, el('div', { class: 'btns', style: { marginTop: '14px' } },
    el('button', { class: 'btn', onclick: scan, disabled: P.scanning }, 'Look Again'),
    el('button', { class: 'btn', onclick: addByAddress }, 'Add by Address…'),
    el('button', { class: 'btn', onclick: () => { P.mode = P.list.length ? 'printer' : 'empty'; render(); } }, 'Cancel')));
  v.append(pane);
}
async function addFound(f) {
  const v = await form({ title: `Add “${f.name}”`, fields: [{ name: 'name', label: 'Name', value: f.name }, { name: 'location', label: 'Location (optional)', placeholder: 'e.g. Office' }, { name: 'driver', label: 'Driver', type: 'select', value: 'auto', options: [{ value: 'auto', label: 'Automatic (recommended)' }, { value: 'choose', label: 'Choose a driver…' }] }], ok: 'Add' });
  if (!v) return;
  if (v.driver === 'choose') { const d = await chooseDriver(f.name); if (!d) return; v.driver = d; }
  toast('Adding the printer…');
  const r = await api.invoke('add', { uri: f.uri, name: v.name.trim() || f.name, location: v.location.trim(), driver: v.driver });
  if (r && r.error) return alertBox('The printer couldn’t be added.', r.error);
  P.mode = 'printer'; P.sel = r.name; toast('Printer added'); load();
}
async function chooseDriver(hint) {
  const q = await form({ title: 'Choose a Driver', text: 'Type the printer’s make and model, e.g. “Brother HL-L2350”.', fields: [{ name: 'q', label: 'Make and model', value: String(hint || '').split(' ').slice(0, 2).join(' ') }], ok: 'Search' });
  if (!q) return null;
  const list = await api.invoke('drivers', q.q);
  if (!Array.isArray(list) || !list.length) { await alertBox('No drivers match.', 'Try fewer words, or choose Automatic.'); return null; }
  const v = await form({ title: 'Choose a Driver', fields: [{ name: 'd', label: 'Driver', type: 'select', value: list[0].id, options: list.map((d) => ({ value: d.id, label: d.name })) }], ok: 'Use Driver' });
  return v ? v.d : null;
}
async function addByAddress() {
  const v = await form({ title: 'Add by Address', text: 'Type the printer’s network address. Most printers made after 2010 understand IPP.', fields: [{ name: 'host', label: 'Address', placeholder: '192.168.1.40 or printer.local' }, { name: 'proto', label: 'Protocol', type: 'select', value: 'ipp', options: [{ value: 'ipp', label: 'IPP (most printers)' }, { value: 'ipps', label: 'IPP over TLS' }, { value: 'socket', label: 'JetDirect (HP and others)' }, { value: 'lpd', label: 'Line Printer Daemon (LPD)' }] }, { name: 'name', label: 'Name', placeholder: 'Office Printer' }], ok: 'Add', validate: (v) => (!/^[\w.:\-\[\]]+$/.test(v.host.trim()) ? 'Type an address like 192.168.1.40.' : null) });
  if (!v) return;
  const h = v.host.trim();
  const uri = v.proto === 'ipp' ? `ipp://${h}/ipp/print` : v.proto === 'ipps' ? `ipps://${h}/ipp/print` : v.proto === 'socket' ? `socket://${h}:9100` : `lpd://${h}/queue`;
  toast('Adding the printer…');
  const r = await api.invoke('add', { uri, name: v.name.trim() || h, location: '', driver: 'auto' });
  if (r && r.error) return alertBox('The printer couldn’t be added.', r.error);
  P.mode = 'printer'; P.sel = r.name; load();
}
$('#addBtn').onclick = startAdd;
api.on('cmd', (c) => { if (c === 'add') startAdd(); else if (c === 'refresh') load(); else if (c === 'test') { const p = P.list.find((x) => x.name === P.sel); if (p) test(p); } });
setInterval(() => { if (P.mode === 'printer' && !$('#dlg') && !document.querySelector('select:focus')) load(true); }, 5000);
load();

'use strict';
/* Passkeys window */
const IC = {
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  ring: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  term: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  cert: '<rect x="4" y="3" width="16" height="13" rx="2"/><circle cx="12" cy="17" r="3"/><path d="M10 19.5V22l2-1 2 1v-2.5M8 7h8M8 10h5"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
};
const icon = (k) => SVG(IC[k] || IC.key);
const V = { view: 'ring', ring: null, rings: [], items: [], ssh: [], gpg: [], certs: [], sel: null, revealed: null };

// ---------------------------------------------------------------- sidebar
function sidebar() {
  const nav = $('#nav'); nav.textContent = '';
  const btn = (label, ico, on, click, count) => el('button', { class: 'nav' + (on ? ' on' : ''), onclick: click }, el('span', { class: 'ico' }, icon(ico)), el('span', { class: 'n', text: label }), count != null ? el('span', { class: 'c', text: count }) : null);
  nav.append(el('div', { class: 'grp-title', text: 'Passwords' }));
  if (!V.rings.length) nav.append(el('div', { class: 'grp-title', style: { fontWeight: 400 }, text: V.ringError || 'No keyrings' }));
  for (const r of V.rings) nav.append(btn(r.label + (r.isDefault ? '' : ''), r.locked ? 'lock' : 'unlock', V.view === 'ring' && V.ring === r.path, () => go('ring', r.path), r.locked ? null : r.count));
  nav.append(el('div', { class: 'grp-title', text: 'Keys' }));
  nav.append(btn('SSH Keys', 'term', V.view === 'ssh', () => go('ssh'), V.ssh.length || null));
  nav.append(btn('Encryption Keys', 'shield', V.view === 'gpg', () => go('gpg'), V.gpg.length || null));
  nav.append(el('div', { class: 'grp-title', text: 'Trust' }));
  nav.append(btn('Certificates', 'cert', V.view === 'certs', () => go('certs')));
}

async function loadRings() {
  const r = await api.invoke('keyrings');
  if (r && r.error) { V.rings = []; V.ringError = 'Saved passwords aren’t available'; } else { V.rings = r; V.ringError = null; }
  if (!V.ring && V.rings.length) V.ring = V.rings[0].path;
}
async function go(view, ring) {
  V.view = view; if (ring) V.ring = ring; V.sel = null; V.revealed = null; $('#q').value = '';
  await refresh();
}
async function refresh() {
  await loadRings();
  if (V.view === 'ring' && V.ring) { const r = await api.invoke('items', V.ring); V.items = r && !r.error ? r.items : []; V.ringLocked = r && r.locked; }
  if (V.view === 'ssh' || !V.ssh.length) V.ssh = (await api.invoke('ssh')) || [];
  if (V.view === 'gpg' || !V.gpg.length) { const g = await api.invoke('gpg'); V.gpg = Array.isArray(g) ? g : []; }
  if (V.view === 'certs' && !V.certs.length) { const c = await api.invoke('certs'); V.certs = Array.isArray(c) ? c : []; }
  sidebar(); render();
}

// ---------------------------------------------------------------- list
const match = (q, ...xs) => !q || xs.some((x) => String(x || '').toLowerCase().includes(q));
function toolbar(title, buttons) {
  $('#title').textContent = title;
  const t = $('#tbtns'); t.replaceChildren(...buttons.map(([label, fn, cls]) => el('button', { class: 'btn small ' + (cls || ''), onclick: fn }, label)));
}
function render() {
  const list = $('#list'); list.textContent = '';
  const q = $('#q').value.trim().toLowerCase();
  const ring = V.rings.find((r) => r.path === V.ring);
  if (V.view === 'ring') {
    toolbar(ring ? ring.label : 'Passwords', ring ? (ring.locked ? [['Unlock…', () => doUnlock(ring)]] : [['Lock', () => doLock(ring)], ['New Password…', newPassword, 'primary']]) : []);
    $('#q').disabled = !!(ring && ring.locked);
    if (!ring && V.ringError) { list.append(el('div', { class: 'empty' }, el('div', { class: 'big', text: 'Saved passwords aren’t available' }), el('div', { text: 'The keyring service isn’t running. Log out and back in, then try again.' }))); return detail(); }
    if (!ring) { list.append(el('div', { class: 'empty' }, el('div', { class: 'big', text: 'No keyrings yet' }), el('div', { text: 'A keyring keeps saved passwords safe behind a password of its own.' }), el('button', { class: 'btn primary', onclick: newKeyring }, 'New Keyring…'))); return detail(); }
    if (ring.locked) {
      list.append(el('div', { class: 'locked' }, icon('lock'), el('div', { class: 'big', text: `“${ring.label}” is locked` }), el('div', { text: 'Unlock it with its password to see what it holds.' }), el('button', { class: 'btn primary', onclick: () => doUnlock(ring) }, 'Unlock…')));
      return detail();
    }
    const items = V.items.filter((i) => match(q, i.label, i.account, i.where));
    if (!items.length) list.append(el('div', { class: 'empty' }, el('div', { class: 'big', text: q ? 'Nothing matches' : 'No saved passwords' }), q ? null : el('div', { text: 'Passwords that apps and websites save appear here. You can add your own too.' })));
    for (const i of items) list.append(row(i.path, /^https?:|\./.test(i.where) ? 'web' : 'key', i.label, [i.account, i.where].filter(Boolean).join(' — '), niceShort(i.modified)));
  } else if (V.view === 'ssh') {
    toolbar('SSH Keys', [['New SSH Key…', newSsh, 'primary']]); $('#q').disabled = false;
    const keys = V.ssh.filter((k) => match(q, k.name, k.comment, k.fingerprint));
    if (!keys.length) list.append(el('div', { class: 'empty' }, el('div', { class: 'big', text: 'No SSH keys' }), el('div', { text: 'SSH keys let you sign in to other computers and services like GitHub without a password.' }), el('button', { class: 'btn primary', onclick: newSsh }, 'New SSH Key…')));
    for (const k of keys) list.append(row(k.pub, 'term', k.name, `${k.type || 'Key'} · ${k.comment}`, k.priv ? '' : 'public only'));
  } else if (V.view === 'gpg') {
    toolbar('Encryption Keys', [['Import…', importGpg], ['New Key…', newGpg, 'primary']]); $('#q').disabled = false;
    const keys = V.gpg.filter((k) => match(q, k.name, k.email, k.fingerprint, k.id));
    if (!keys.length) list.append(el('div', { class: 'empty' }, el('div', { class: 'big', text: 'No encryption keys' }), el('div', { text: 'Encryption (GPG) keys sign and encrypt email and files. Make your own, or import someone else’s public key.' })));
    for (const k of keys) list.append(row(k.fingerprint, 'shield', k.name || k.email || k.id, `${k.email}${k.secret ? '' : ''}`, k.secret ? 'Your key' : 'Public key'));
  } else if (V.view === 'certs') {
    toolbar('Certificates', []); $('#q').disabled = false;
    const cs = V.certs.filter((c) => match(q, c.label));
    if (!cs.length) list.append(el('div', { class: 'empty' }, el('div', { class: 'big', text: q ? 'Nothing matches' : 'Loading…' })));
    for (const c of cs.slice(0, 600)) list.append(row(c.id, 'cert', c.label, 'Trusted certificate authority', ''));
  }
  detail();
}
const niceShort = (ms) => ms ? new Date(ms).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';
function row(id, ico, t, s, m) {
  const r = el('div', { class: 'it' + (V.sel === id ? ' on' : ''), onclick: () => { V.sel = id; V.revealed = null; render(); } }, el('div', { class: 'ic' }, icon(ico)), el('div', { class: 'tx' }, el('div', { class: 't', text: t }), s ? el('div', { class: 's', text: s }) : null), m ? el('div', { class: 'm', text: m }) : null);
  return r;
}
$('#q').addEventListener('input', render);

// ---------------------------------------------------------------- details
const table = (rows) => el('table', {}, ...rows.filter((r) => r[1] != null && r[1] !== '').map(([k, v]) => el('tr', {}, el('td', { text: k }), el('td', {}, v instanceof Node ? v : String(v)))));
function detail() {
  const d = $('#detail'); d.textContent = '';
  if (V.view === 'ring') {
    const i = V.items.find((x) => x.path === V.sel);
    const ring = V.rings.find((r) => r.path === V.ring);
    if (!i) {
      if (ring && !ring.locked) {
        d.append(el('h2', { text: ring.label }), el('div', { class: 'sub', text: `${ring.count} item${ring.count === 1 ? '' : 's'}${ring.isDefault ? ' · Opens when you log in' : ''}` }),
          el('div', { class: 'acts' }, el('button', { class: 'btn', onclick: () => changePw(ring) }, 'Change Password…'), ring.isDefault ? null : el('button', { class: 'btn danger', onclick: () => delRing(ring) }, 'Delete Keyring…')));
      }
      return;
    }
    const sec = el('code', { text: V.revealed != null ? V.revealed : '••••••••••' });
    d.append(el('h2', { text: i.label }), el('div', { class: 'sub', text: i.where || 'Saved password' }),
      el('div', { class: 'secret' }, sec, el('button', { class: 'btn small', onclick: reveal }, V.revealed != null ? 'Hide' : 'Show'), el('button', { class: 'btn small', onclick: copySecret }, 'Copy')),
      table([['Account', i.account], ['Where', i.where], ['Created', niceDate(i.created)], ['Modified', niceDate(i.modified)]]),
      el('details', {}, el('summary', { text: 'Details', style: { fontSize: '12.5px', color: 'var(--dim)', cursor: 'default' } }), table(Object.entries(i.attributes)))),
    d.append(el('div', { class: 'acts' }, el('button', { class: 'btn', onclick: changeSecret }, 'Change Password…'), el('button', { class: 'btn danger', onclick: delItem }, 'Delete…')));
  } else if (V.view === 'ssh') {
    const k = V.ssh.find((x) => x.pub === V.sel); if (!k) return;
    d.append(el('h2', { text: k.name }), el('div', { class: 'sub', text: k.comment }),
      table([['Type', k.type], ['Strength', k.bits ? `${k.bits} bits` : ''], ['Fingerprint', el('span', { class: 'mono', text: k.fingerprint })], ['Location', k.priv || k.pub], ['Made', niceDate(k.created)]]),
      el('div', { class: 'acts' }, el('button', { class: 'btn primary', onclick: async () => { await api.invoke('sshCopy', k.pub); toast('Public key copied'); } }, 'Copy Public Key'), el('button', { class: 'btn danger', onclick: () => delSsh(k) }, 'Move to Trash…')),
      el('p', { class: 'note', text: 'Paste the public key into GitHub, a server’s authorized_keys file or any service that asks for one. The private key never leaves this computer.' }));
  } else if (V.view === 'gpg') {
    const k = V.gpg.find((x) => x.fingerprint === V.sel); if (!k) return;
    d.append(el('h2', { text: k.name || k.id }), el('div', { class: 'sub', text: k.email }),
      table([['Kind', k.secret ? 'Your key (public and secret)' : 'Someone’s public key'], ['Key ID', el('span', { class: 'mono', text: k.id })], ['Fingerprint', el('span', { class: 'mono', text: (k.fingerprint || '').replace(/(.{4})/g, '$1 ').trim() })], ['Strength', k.bits ? `${k.bits} bits` : ''], ['Made', niceDate(k.created)], ['Expires', k.expires ? niceDate(k.expires) : 'Never'], ['Names', k.uids.join('\n')]]),
      el('div', { class: 'acts' }, el('button', { class: 'btn primary', onclick: async () => { await api.invoke('gpgCopy', k.fingerprint); toast('Public key copied'); } }, 'Copy Public Key'), el('button', { class: 'btn', onclick: () => api.invoke('gpgExport', k.fingerprint, k.name) }, 'Export…'), el('button', { class: 'btn danger', onclick: () => delGpg(k) }, 'Delete…')));
  } else if (V.view === 'certs') {
    const c = V.certs.find((x) => x.id === V.sel); if (!c) return;
    d.append(el('h2', { text: c.label }), el('div', { class: 'sub', text: 'Trusted by palOS for secure websites and email' }), table([['Kind', c.category || 'authority'], ['Type', c.type], ['Identifier', el('span', { class: 'mono', text: c.id.replace(/^pkcs11:/, '') })]]));
  }
}

// ---------------------------------------------------------------- actions
async function doUnlock(r) { const ok = await api.invoke('unlock', r.path); if (ok && ok.error) return alertBox('The keyring couldn’t be unlocked.', ok.error); await refresh(); }
async function doLock(r) { await api.invoke('lock', r.path); await refresh(); }
async function reveal() { if (V.revealed != null) { V.revealed = null; return detail(); } const s = await api.invoke('secret', V.sel); if (typeof s === 'string') { V.revealed = s; detail(); } }
async function copySecret() { const ok = await api.invoke('copySecret', V.sel); if (ok === true) toast('Password copied — it clears from the clipboard in a minute'); }
async function delItem() {
  const i = V.items.find((x) => x.path === V.sel); if (!i) return;
  if (!(await confirmBox(`Delete “${i.label}”?`, 'The app or website that saved it will ask for the password again.', 'Delete', true))) return;
  await api.invoke('deleteItem', i.path); V.sel = null; await refresh();
}
async function changeSecret() {
  const i = V.items.find((x) => x.path === V.sel); if (!i) return;
  const v = await form({ title: `Change the password for “${i.label}”`, fields: [{ name: 'p', label: 'New password', type: 'password' }, { name: 'p2', label: 'Confirm', type: 'password' }], ok: 'Change', validate: (v) => (v.p !== v.p2 ? 'The passwords don’t match.' : null) });
  if (!v) return; const r = await api.invoke('updateSecret', i.path, v.p); if (r && r.error) return alertBox('The password couldn’t be changed.', r.error); V.revealed = null; toast('Password changed'); await refresh();
}
async function newPassword() {
  const ring = V.rings.find((r) => r.path === V.ring); if (!ring) return;
  const v = await form({ title: 'New Password', text: `It’s saved in “${ring.label}”.`, fields: [{ name: 'label', label: 'Name', placeholder: 'e.g. Home Wi-Fi or Bank' }, { name: 'account', label: 'Account (optional)', placeholder: 'user name or email' }, { name: 'where', label: 'Website or place (optional)', placeholder: 'example.com' }, { name: 'password', label: 'Password', type: 'password' }], ok: 'Save', validate: (v) => (!v.label.trim() ? 'Give it a name.' : !v.password ? 'Type the password.' : null) });
  if (!v) return;
  const r = await api.invoke('newItem', { keyring: ring.path, label: v.label.trim(), account: v.account.trim(), where: v.where.trim(), password: v.password });
  if (r && r.error) return alertBox('The password couldn’t be saved.', r.error); await refresh();
}
async function newKeyring() {
  const v = await form({ title: 'New Keyring', text: 'A keyring keeps passwords together under a password of its own. You’ll be asked to choose that password next.', fields: [{ name: 'label', label: 'Name' }], ok: 'Continue', validate: (v) => (!v.label.trim() ? 'Give it a name.' : null) });
  if (!v) return; const r = await api.invoke('newKeyring', v.label.trim()); if (r && r.error) return alertBox('The keyring couldn’t be made.', r.error); await refresh();
}
async function delRing(r) {
  if (!(await confirmBox(`Delete the keyring “${r.label}”?`, 'Every password in it is deleted too. This can’t be undone.', 'Delete', true))) return;
  const x = await api.invoke('deleteKeyring', r.path); if (x && x.error) return alertBox('The keyring couldn’t be deleted.', x.error); V.ring = null; await refresh();
}
async function changePw(r) { const x = await api.invoke('changeKeyringPassword', r.path); if (x && x.error) alertBox('The password couldn’t be changed.', x.error); }
async function newSsh() {
  const v = await form({ title: 'New SSH Key', fields: [{ name: 'name', label: 'File name', value: V.ssh.some((k) => k.name === 'id_ed25519') ? '' : 'id_ed25519' }, { name: 'comment', label: 'Label (usually your email)', placeholder: 'you@example.com' }, { name: 'type', label: 'Kind', type: 'select', value: 'ed25519', options: [{ value: 'ed25519', label: 'Ed25519 (recommended)' }, { value: 'rsa', label: 'RSA 4096 (for older servers)' }] }, { name: 'passphrase', label: 'Passphrase (optional)', type: 'password', hint: 'Protects the key if someone copies it. You can leave it empty.' }], ok: 'Make Key' });
  if (!v) return; const r = await api.invoke('sshNew', v); if (r && r.error) return alertBox('The SSH key couldn’t be made.', r.error); toast('SSH key made'); await go('ssh');
}
async function delSsh(k) { if (!(await confirmBox(`Move “${k.name}” to the Trash?`, 'Services that use this key won’t let you in with it any more. You can put it back from the Trash.', 'Move to Trash', true))) return; await api.invoke('sshDelete', k); V.sel = null; await refresh(); }
async function newGpg() {
  const v = await form({ title: 'New Encryption Key', fields: [{ name: 'name', label: 'Your name' }, { name: 'email', label: 'Email address' }, { name: 'expire', label: 'Expires', type: 'select', value: '2y', options: [{ value: '1y', label: 'In a year' }, { value: '2y', label: 'In two years' }, { value: '5y', label: 'In five years' }, { value: 'never', label: 'Never' }] }, { name: 'passphrase', label: 'Passphrase', type: 'password', hint: 'You’ll type this whenever the key signs or decrypts something.' }], ok: 'Make Key', validate: (v) => (!v.name.trim() || !/@/.test(v.email) ? 'Type your name and a valid email address.' : null) });
  if (!v) return; toast('Making the key — this can take a moment…'); const r = await api.invoke('gpgNew', v); if (r && r.error) return alertBox('The key couldn’t be made.', r.error); toast('Encryption key made'); await go('gpg');
}
async function importGpg() { const r = await api.invoke('gpgImport'); if (r && r.error) return alertBox('The key couldn’t be imported.', r.error); if (r) { toast('Key imported'); await go('gpg'); } }
async function delGpg(k) {
  if (!(await confirmBox(`Delete “${k.name || k.id}”?`, k.secret ? 'This is your own key: anything encrypted to it can’t be opened any more. This can’t be undone.' : 'You can import it again later.', 'Delete', true))) return;
  const r = await api.invoke('gpgDelete', k); if (r && r.error) return alertBox('The key couldn’t be deleted.', r.error); V.sel = null; await refresh();
}
$('#addRing').onclick = newKeyring;
api.on('cmd', (c) => ({ newPassword, newKeyring, newSsh, newGpg, importGpg, find: () => $('#q').focus(), refresh }[c] || (() => {}))());

refresh();

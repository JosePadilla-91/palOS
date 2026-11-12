'use strict';
setupChrome({ zoom: false, grip: false });
const P = Q.get('p');
const body = $('#body');
const LEVELS = [['Read & Write', 6], ['Read only', 4], ['Write only', 2], ['No Access', 0]];

function section(title, content, open = true) {
  const tri = el('span', { class: 'disclosure' + (open ? ' open' : '') });
  const s = el('div', { class: 'sec' + (open ? '' : ' closed') }, el('div', { class: 'st' }, tri, el('span', { text: title })), el('div', { class: 'sc' }, content));
  $('.st', s).addEventListener('click', () => { s.classList.toggle('closed'); tri.classList.toggle('open'); });
  return s;
}
const kv = (rows) => el('table', { class: 'kv' }, rows.filter(Boolean).map(([k, v]) => el('tr', {}, el('td', { text: k + ':' }), el('td', {}, v))));

async function render() {
  const e = await seeker.invoke('fs:info', P);
  body.textContent = '';
  if (!e || e.error) { body.append(el('div', { class: 'center muted', style: { padding: '40px' }, text: 'This item could not be found.' })); return; }
  const name = e.display || e.name || '/';
  $('#title').textContent = `${name} Info`;
  document.title = `${name} Info`;
  const sizeCell = el('span', { text: e.dir ? 'Calculating…' : `${humanSize(e.size)} (${(e.size || 0).toLocaleString()} bytes)` });
  const headSize = el('div', { class: 's', text: e.dir ? '--' : humanSize(e.size) });
  body.append(el('div', { class: 'head' }, iconImg(e.icon, 32), el('div', {}, el('div', { class: 'n', text: name }), el('div', { class: 'm', text: `Modified: ${relDate(e.mtime)}` })), headSize));

  const general = [['Kind', e.kind], ['Size', sizeCell], ['Where', e.where], ['Created', longDate(e.ctime)], ['Modified', longDate(e.mtime)]];
  if (e.link) general.push(['Original', e.target || '--']);
  if (e.trash) general.push(['Original', e.trash.original], ['Trashed', longDate(e.trash.deleted)]);
  if (e.mount) general.push(['Volume', e.mount.source], ['Format', e.mount.fstype]);
  if (e.app) general.push(['Description', e.app.comment || '--']);
  body.append(section('General:', kv(general)));

  // Name & Extension
  const nm = el('input', { type: 'text', class: 'nm', value: e.name, disabled: !e.mine || e.path === '/' });
  nm.addEventListener('keydown', async (ev) => { if (ev.key === 'Enter') { const r = await seeker.invoke('fs:rename', e.path, nm.value.trim()); if (r && r.path) { location.search = `?p=${encodeURIComponent(r.path)}&composited=${Q.get('composited')}`; } } });
  body.append(section('Name & Extension:', nm, false));

  // Open with
  if (e.openWith) {
    const sel = el('select', { class: 'ow' });
    const list = e.openWith.length ? e.openWith : [];
    if (!list.length) sel.append(el('option', { text: 'No application', value: '' }));
    for (const a of list) sel.append(el('option', { value: a.id, text: a.name + (e.defaultApp && a.id === e.defaultApp.id ? ' (default)' : ''), selected: e.defaultApp && a.id === e.defaultApp.id }));
    const change = el('button', { class: 'btn', text: 'Change All…', style: { marginTop: '6px', height: '20px', fontSize: '11px' } });
    change.addEventListener('click', async () => { if (sel.value) { await seeker.invoke('fs:setDefaultApp', e.mime, sel.value); change.textContent = 'Changed'; } });
    body.append(section('Open with:', el('div', {}, sel, el('div', { class: 'small', style: { margin: '6px 0 0' }, text: `Use this application to open all documents like this.` }), change), false));
  }

  // Preview
  const pv = el('div', { class: 'pv' }, iconImg(e.icon, 128));
  if (e.thumb) { const t = el('img'); t.onload = () => { pv.textContent = ''; pv.append(t); }; t.src = thumbURL(e.path, 256, e.mtime); }
  body.append(section('Preview:', pv, true));

  // Sharing & permissions
  const mode = e.mode & 0o777;
  const table = el('table', { class: 'perm' }, el('tr', {}, el('th', { text: 'Name' }), el('th', { text: 'Privilege' })));
  const who = [[`${e.owner} (Me)`.replace(' (Me)', e.mine ? ' (Me)' : ''), 6], [e.group, 3], ['everyone', 0]];
  who.forEach(([label, shift]) => {
    const bits = (mode >> shift) & 0o7;
    const s = el('select', { disabled: !e.mine });
    for (const [t, v] of LEVELS) s.append(el('option', { value: v, text: t, selected: (bits & 6) === v }));
    s.addEventListener('change', async () => {
      const cur = (await seeker.invoke('fs:info', P)).mode & 0o7777;
      const keepX = (cur >> shift) & 1;
      const next = (cur & ~(0o7 << shift)) | ((+s.value | keepX) << shift);
      await seeker.invoke('fs:chmod', P, next);
    });
    table.append(el('tr', {}, el('td', { text: label }), el('td', {}, s)));
  });
  body.append(section('Sharing & Permissions:', el('div', {}, el('div', { class: 'small', text: e.mine ? 'You can read and write' : 'You can only read' }), table), false));

  if (e.mime === 'application/x-desktop') {
    // an application: everything it installed, not its launcher file
    sizeCell.textContent = 'Calculating…'; headSize.textContent = '--';
    const r = await seeker.invoke('fs:appSize', e.path);
    if (r) { sizeCell.textContent = `${humanSize(r.size)} on disk (${r.size.toLocaleString()} bytes) for ${r.count.toLocaleString()} item${r.count === 1 ? '' : 's'}`; headSize.textContent = humanSize(r.size); }
    else { sizeCell.textContent = `${humanSize(e.size)} (${(e.size || 0).toLocaleString()} bytes)`; headSize.textContent = humanSize(e.size); }
  }
  if (e.dir) {
    const r = await seeker.invoke('fs:folderSize', e.path);
    const t = `${humanSize(r.size)} on disk (${r.size.toLocaleString()} bytes) for ${r.count.toLocaleString()} item${r.count === 1 ? '' : 's'}${r.partial ? ' (partial)' : ''}`;
    sizeCell.textContent = t; headSize.textContent = humanSize(r.size);
  }
}
render();

'use strict';
// dialog.showOpenDialog / showSaveDialog for Kibble apps: palOS's own Open and Save sheet, the one every app
// gets. Asked for through the desktop portal (org.freedesktop.portal.FileChooser), which paladin-portal answers
// by rolling the sheet out from under the window's title bar.
let bus = null;
function dbus() { const d = require('dbus-next'); if (!bus) { bus = d.sessionBus(); bus.on('error', () => {}); } return d; }

function filters(list, V) {
  // Electron: [{ name, extensions: ['png','jpg'] }]  ->  portal: [(name, [(0 glob, '*.png'), ...])]
  return (list || []).filter((f) => f && f.extensions).map((f) => [String(f.name || ''), f.extensions.map((e) => [0, e === '*' ? '*' : `*.${e}`])]);
}

async function ask(method, win, o) {
  const d = dbus(), V = (t, v) => new d.Variant(t, v);
  const props = o.properties || [];
  const token = `kibble${process.pid}_${Date.now() % 1e6}`;
  const opts = { handle_token: V('s', token), modal: V('b', true) };
  if (o.buttonLabel) opts.accept_label = V('s', o.buttonLabel);
  const f = filters(o.filters); if (f.length) opts.filters = V('a(sa(us))', f);
  if (method === 'OpenFile') { opts.multiple = V('b', props.includes('multiSelections')); opts.directory = V('b', props.includes('openDirectory')); }
  const dir = o.defaultPath ? (method === 'SaveFile' ? require('path').dirname(o.defaultPath) : o.defaultPath) : '';
  if (dir) opts.current_folder = V('ay', Buffer.from(dir + '\0'));
  if (method === 'SaveFile' && o.defaultPath) opts.current_name = V('s', require('path').basename(o.defaultPath));
  const parent = win && win._xid ? `x11:${Number(win._xid).toString(16)}` : '';
  const sender = bus.name.slice(1).replace(/\./g, '_');
  const reqPath = `/org/freedesktop/portal/desktop/request/${sender}/${token}`;
  const answer = new Promise((resolve) => {
    const match = `type='signal',interface='org.freedesktop.portal.Request',member='Response',path='${reqPath}'`;
    bus.call(new d.Message({ destination: 'org.freedesktop.DBus', path: '/org/freedesktop/DBus', interface: 'org.freedesktop.DBus', member: 'AddMatch', signature: 's', body: [match] })).catch(() => {});
    const on = (m) => { if (m.path === reqPath && m.member === 'Response') { bus.removeListener('message', on); resolve(m.body); } };
    bus.on('message', on);
  });
  const obj = await bus.getProxyObject('org.freedesktop.portal.Desktop', '/org/freedesktop/portal/desktop');
  await obj.getInterface('org.freedesktop.portal.FileChooser')[method](parent, o.title || '', opts);
  const [code, results] = await answer;
  const uris = code === 0 && results && results.uris ? results.uris.value : [];
  return uris.map((u) => decodeURIComponent(String(u).replace(/^file:\/\//, '')));
}

module.exports = {
  async open(win, o) { try { const p = await ask('OpenFile', win, o); return { canceled: p.length === 0, filePaths: p }; } catch (e) { process.stderr.write(`kibble: Open sheet: ${e.message}\n`); return { canceled: true, filePaths: [] }; } },
  async save(win, o) { try { const p = await ask('SaveFile', win, o); return { canceled: p.length === 0, filePath: p[0] || '' }; } catch (e) { process.stderr.write(`kibble: Save sheet: ${e.message}\n`); return { canceled: true, filePath: '' }; } },
};

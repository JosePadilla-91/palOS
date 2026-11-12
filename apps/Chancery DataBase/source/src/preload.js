const { contextBridge, ipcRenderer } = require('electron');
const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('cdb', {
  db: async (m, ...a) => {
    const r = await ipcRenderer.invoke('db', m, ...a);
    if (!r.ok) throw new Error(r.error);
    return r.data;
  },
  state: () => call('state'),
  fs: (op, p) => call('fs', op, p),
  pickResult: (id, v) => call('pickResult', id, v),
  newDb: t => call('newDb', t),
  openDb: p => call('openDb', p),
  closeDb: () => call('closeDb'),
  importCsv: () => call('importCsv'),
  exportCsv: (sql, name) => call('exportCsv', sql, name),
  exportPdf: (name, o) => call('exportPdf', name, o),
  print: o => call('print', o),
  on: (ch, fn) => ipcRenderer.on(ch, (_e, ...a) => fn(...a))
});

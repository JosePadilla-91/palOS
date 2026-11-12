'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pv', {
  cmd: (c, a) => ipcRenderer.send('pv:cmd', c, a),
  onState: (fn) => ipcRenderer.on('pv:state', (_e, s) => fn(s)),
});

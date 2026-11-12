'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('bundler', {
  pathsFromFiles: (files) => Array.from(files).map((f) => webUtils.getPathForFile(f)).filter(Boolean),
  getState: () => ipcRenderer.invoke('state'),
  submit: (paths, mode) => ipcRenderer.invoke('submit', paths, mode),
  pick: (mode) => ipcRenderer.invoke('pick', mode),
  cancel: (id) => ipcRenderer.invoke('cancel', id),
  reveal: (p) => ipcRenderer.invoke('reveal', p),
  setSetting: (k, v) => ipcRenderer.invoke('setting', k, v),
  makeDefault: () => ipcRenderer.invoke('make-default'),
  clearFinished: () => ipcRenderer.invoke('clear-finished'),
  onJob: (cb) => ipcRenderer.on('job', (_e, j) => cb(j)),
  onDefaultResult: (cb) => {
    ipcRenderer.on('default-set', () => cb(true));
    ipcRenderer.on('default-failed', () => cb(false));
  },
});

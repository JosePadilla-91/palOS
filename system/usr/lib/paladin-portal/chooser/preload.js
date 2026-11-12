'use strict';
// Seeker's sheet API (as in /opt/paladin-seeker/app/sheet-preload.js), plus the sheet's size for the window.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('sheet', {
  init: () => ipcRenderer.invoke('sheet:init'),
  done: (result) => ipcRenderer.send('sheet:done', result),
  list: (dir, opts) => ipcRenderer.invoke('sheet:list', dir, opts),
  mkdir: (dir, name) => ipcRenderer.invoke('sheet:mkdir', dir, name),
  exists: (p) => ipcRenderer.invoke('sheet:exists', p),
  onOut: (fn) => ipcRenderer.on('sheet:out', () => fn()),
});
contextBridge.exposeInMainWorld('paladinSheetFit', { size: (w, h) => ipcRenderer.send('chooser:size', w, h) });

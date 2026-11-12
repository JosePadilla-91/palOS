'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('pty', {
  start: (o) => ipcRenderer.send('pty:start', o), input: (d) => ipcRenderer.send('pty:input', d), resize: (o) => ipcRenderer.send('pty:resize', o),
  title: (t) => ipcRenderer.send('win:title', t), close: () => ipcRenderer.send('win:close'),
  prefs: () => ipcRenderer.invoke('prefs:get'), readClip: () => ipcRenderer.invoke('clip:read'), writeClip: (t) => ipcRenderer.send('clip:write', t),
  on: (ch, fn) => ipcRenderer.on(ch, (_, ...a) => fn(...a)),
  pathFor: (f) => { try { return webUtils.getPathForFile(f); } catch { return ''; } },
});

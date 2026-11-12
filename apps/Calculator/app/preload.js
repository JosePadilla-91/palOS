'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('calc', { on: (fn) => ipcRenderer.on('cmd', (_, c) => fn(c)), read: () => ipcRenderer.invoke('clip:read'), write: (t) => ipcRenderer.send('clip:write', t), mode: (m) => ipcRenderer.send('mode', m) });

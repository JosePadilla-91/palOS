'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('setup', {
  helper: (action, data) => ipcRenderer.invoke('helper', action, data || {}),
  netStatus: () => ipcRenderer.invoke('net:status'),
  wifiList: (rescan) => ipcRenderer.invoke('wifi:list', !!rescan),
  wifiConnect: (ssid, pw) => ipcRenderer.invoke('wifi:connect', ssid, pw || ''),
  wifiRadio: (on) => ipcRenderer.invoke('wifi:radio', !!on),
  film: () => ipcRenderer.invoke('film'),
  filmSeen: () => ipcRenderer.invoke('film:seen'),
  filmBytes: (p) => ipcRenderer.invoke('film:bytes', p),
  filmLog: (msg) => ipcRenderer.invoke('film:log', String(msg)),
  filmSoftwareRestart: (at) => ipcRenderer.invoke('film:software-restart', Number(at) || 0),
  avatars: () => ipcRenderer.invoke('avatars'),
  restoreFirst: () => ipcRenderer.invoke('restore-first'),
  restartInLanguage: () => ipcRenderer.invoke('restart-language'),
  languages: () => ipcRenderer.invoke('languages'),
  soundReady: (ms) => ipcRenderer.invoke('sound:ready', ms || 10000),
  soundOutputs: () => ipcRenderer.invoke('sound:outputs'),
});

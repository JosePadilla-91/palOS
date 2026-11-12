// Site Knitter — preload bridge
'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('ws', {
  // project files
  openDialog: () => ipcRenderer.invoke('project:open-dialog'),
  openPath: (p) => ipcRenderer.invoke('project:open-path', p),
  save: (payload) => ipcRenderer.invoke('project:save', payload),
  recent: () => ipcRenderer.invoke('settings:recent'),
  onProjectLoaded: (fn) => ipcRenderer.on('project:loaded', (_e, data) => fn(data)),

  // media + fonts
  importMedia: (kind) => ipcRenderer.invoke('media:import-dialog', kind),
  readFont: (pkg, file) => ipcRenderer.invoke('fonts:read', pkg, file),

  // output
  exportFolder: (payload) => ipcRenderer.invoke('site:export-folder', payload),
  exportZip: (payload) => ipcRenderer.invoke('site:export-zip', payload),
  preview: (payload) => ipcRenderer.invoke('site:preview', payload),
  publishFtp: (payload) => ipcRenderer.invoke('publish:ftp', payload),
  getPassword: (key) => ipcRenderer.invoke('publish:get-password', key),
  onPublishProgress: (fn) => ipcRenderer.on('publish:progress', (_e, d) => fn(d)),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  // app
  onMenu: (fn) => ipcRenderer.on('menu', (_e, cmd, arg) => fn(cmd, arg)),
  onRequestClose: (fn) => ipcRenderer.on('app:request-close', () => fn()),
  confirmUnsaved: () => ipcRenderer.invoke('dialog:confirm-unsaved'),
  showError: (title, msg) => ipcRenderer.invoke('dialog:error', title, msg),
  closeConfirmed: () => ipcRenderer.send('app:close-confirmed'),
  nativeEdit: (cmd) => ipcRenderer.send('edit:native', cmd),
  setTitle: (t) => ipcRenderer.send('app:set-title', t),
  pathForFile: (file) => { try { return webUtils.getPathForFile(file); } catch { return ''; } },
  platform: process.platform,
});

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('sheetsAPI', {
  initialDoc: () => ipcRenderer.invoke('doc:initial'),
  setState: (state) => ipcRenderer.send('doc:state', state),
  openDialog: () => ipcRenderer.invoke('file:open-dialog'),
  openPath: (p) => ipcRenderer.invoke('file:open-path', p),
  save: (doc, opts) => ipcRenderer.invoke('file:save', doc, opts),
  closeNow: () => ipcRenderer.send('window:close-now'),
  print: (html, mode) => ipcRenderer.invoke('print:sheet', html, mode),
  confirm: (opts) => ipcRenderer.invoke('dialog:confirm', opts),
  openExternal: (url) => ipcRenderer.send('shell:open-external', url),
  clipboardRead: () => ipcRenderer.invoke('clipboard:read'),
  clipboardWrite: (data) => ipcRenderer.invoke('clipboard:write', data),
  nativeEdit: (cmd) => ipcRenderer.send('edit:native', cmd),
  pathForFile: (file) => webUtils.getPathForFile(file),
  onMenu: (fn) => ipcRenderer.on('menu', (_e, cmd, arg) => fn(cmd, arg)),
  onLoad: (fn) => ipcRenderer.on('doc:load', (_e, payload) => fn(payload)),
});

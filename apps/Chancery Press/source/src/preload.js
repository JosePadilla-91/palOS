const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (arg) => ipcRenderer.invoke(ch, arg);
contextBridge.exposeInMainWorld('press', {
  onMenu: (fn) => ipcRenderer.on('menu', (e, action, data) => fn(action, data)),
  onOpened: (fn) => ipcRenderer.on('menu', (e, action, data) => { if (action === 'opened') fn(data); }),
  save: call('save-file'), openDialog: call('open-dialog'), pickImage: call('pick-image'),
  exportPdf: call('export-pdf'), pdfChunk: call('pdf-chunk'), pdfFinish: call('pdf-finish'), openCsv: call('open-csv'), print: call('print'), savePng: call('save-png'),
  capture: call('capture'), confirm: call('confirm'), quitNow: call('quit-now'),
  setTitle: call('set-title'), systemDark: call('system-dark')
});

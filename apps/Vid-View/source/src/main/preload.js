'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const on = (ch) => (fn) => {
  const h = (_e, ...a) => fn(...a);
  ipcRenderer.on(ch, h);
  return () => ipcRenderer.removeListener(ch, h);
};

contextBridge.exposeInMainWorld('vidview', {
  boot: () => ipcRenderer.invoke('app:boot'),
  setSettings: (p) => ipcRenderer.invoke('settings:set', p),
  openDialog: () => ipcRenderer.invoke('dialog:open'),
  subtitleDialog: () => ipcRenderer.invoke('dialog:subtitle'),
  open: (target, caps) => ipcRenderer.invoke('media:open', target, caps),
  close: (id) => ipcRenderer.invoke('media:close', id),
  seekPoint: (id, t, mode) => ipcRenderer.invoke('media:seek-point', id, t, mode),
  addSubtitle: (id, file) => ipcRenderer.invoke('media:add-subtitle', id, file),
  savePosition: (key, pos, dur, dvdTitle) => ipcRenderer.invoke('media:position', key, pos, dur, dvdTitle),
  openElsewhere: (p) => ipcRenderer.invoke('shell:open-elsewhere', p),
  pathForFile: (f) => webUtils.getPathForFile(f),
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    fullscreen: (on) => ipcRenderer.send('win:fullscreen', on),
    onTop: (on) => ipcRenderer.send('win:ontop', on),
    title: (t) => ipcRenderer.send('win:title', t),
    fit: (aspect) => ipcRenderer.invoke('win:fit', aspect),
    setBounds: (b) => ipcRenderer.send('win:bounds', b),
    remember: () => ipcRenderer.send('win:remember'),
    restoreSize: () => ipcRenderer.send('win:restore-size'),
  },
  onOpenFiles: on('open-files'),
  onWinState: on('win:state'),
});

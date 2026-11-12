// BrushBoard — preload bridge. Exposes a small, explicit API to the renderer.
'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Python errors come back as values; rethrow them with the traceback folded into the message.
const TB = '\n@@TRACEBACK@@\n';
const unwrap = (r) => {
  if (r && r.__error) throw new Error(r.__error.message + (r.__error.traceback ? TB + r.__error.traceback : ''));
  return r;
};

const on = (channel) => (cb) => {
  const fn = (_e, ...args) => cb(...args);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld('brushboard', {
  /** Pal OS desktop: menus in the system menu bar, light/dark from the system. */
  pal: {
    setMenu: (tree, sig) => ipcRenderer.send('pal:menu', tree, sig),
    onMenuClick: on('pal:menuClick'),
    onTheme: on('pal:theme'),
  },
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    toggleFullscreen: () => ipcRenderer.send('win:toggleFullscreen'),
    devtools: () => ipcRenderer.send('win:devtools'),
    onState: on('win:state'),
  },
  app: {
    info: () => ipcRenderer.invoke('app:info'),
    pendingFiles: () => ipcRenderer.invoke('app:pendingFiles'),
    onOpenFiles: on('app:openFiles'),
    onRequestClose: on('app:requestClose'),
    confirmClose: () => ipcRenderer.send('app:closeConfirmed'),
  },
  prefs: {
    get: () => ipcRenderer.invoke('prefs:get'),
    set: (p) => ipcRenderer.invoke('prefs:set', p),
  },
  dialog: {
    open: (o) => ipcRenderer.invoke('dlg:open', o),
    save: (o) => ipcRenderer.invoke('dlg:save', o),
    message: (o) => ipcRenderer.invoke('dlg:message', o),
  },
  fs: {
    read: (p) => ipcRenderer.invoke('fs:read', p),
    write: (p, d) => ipcRenderer.invoke('fs:write', p, d),
    exists: (p) => ipcRenderer.invoke('fs:exists', p),
    stat: (p) => ipcRenderer.invoke('fs:stat', p),
    list: (p) => ipcRenderer.invoke('fs:list', p),
    pathForFile: (file) => { try { return webUtils.getPathForFile(file); } catch { return ''; } },
  },
  shell: {
    showItem: (p) => ipcRenderer.invoke('shell:showItem', p),
    openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
    openExternal: (u) => ipcRenderer.invoke('shell:openExternal', u),
  },
  sys: { fonts: () => ipcRenderer.invoke('sys:fonts') },
  clipboard: {
    readImage: () => ipcRenderer.invoke('clip:readImage'),
    writeImage: (png) => ipcRenderer.invoke('clip:writeImage', png),
  },
  test: {
    shot: (name) => ipcRenderer.invoke('test:shot', name),
    log: (msg) => ipcRenderer.send('test:log', msg),
    done: (code) => ipcRenderer.send('test:done', code),
  },
  python: {
    status: () => ipcRenderer.invoke('py:status'),
    restart: () => ipcRenderer.invoke('py:restart'),
    extensions: () => ipcRenderer.invoke('py:extensions'),
    reloadExtension: (id) => ipcRenderer.invoke('py:reloadExtension', id),
    setExtensionEnabled: (id, en) => ipcRenderer.invoke('py:setExtensionEnabled', id, en),
    installDeps: (id) => ipcRenderer.invoke('py:installDeps', id),
    installExtension: (dir) => ipcRenderer.invoke('py:installExtension', dir),
    call: (worker, method, params, buffers) => ipcRenderer.invoke('py:call', worker, method, params, buffers).then(unwrap),
    hostReply: (worker, id, result, error, buffers) => ipcRenderer.invoke('py:hostReply', worker, id, result, error, buffers),
    runScript: (p) => ipcRenderer.invoke('py:runScript', p).then(unwrap),
    setupVenv: () => ipcRenderer.invoke('py:setupVenv'),
    onHostRequest: on('py:hostRequest'),
    onEvent: on('py:event'),
  },
});

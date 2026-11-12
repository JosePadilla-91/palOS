'use strict';
// Exposes window.timeTurner to the UI. In --mock mode only the wallpaper is real,
// and the UI falls back to its built-in sample data.
const { contextBridge, ipcRenderer } = require('electron');

const MOCK = process.argv.includes('--tt-mock');

async function invoke(channel, ...args) {
  const r = await ipcRenderer.invoke(channel, ...args);
  if (r.ok) return r.value;
  const err = new Error(r.message);
  err.code = r.code;
  throw err;
}

function subscribe(channel, cb) {
  const listener = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const wallpaperOnly = {
  getWallpaper: () => invoke('tt:wallpaper'),
  onWallpaperChanged: cb => subscribe('tt:wallpaper-changed', cb),
};

contextBridge.exposeInMainWorld('timeTurnerWallpaper', wallpaperOnly);

if (!MOCK) {
  contextBridge.exposeInMainWorld('timeTurner', {
    ...wallpaperOnly,
    getStatus: () => invoke('tt:status'),
    getSettings: () => invoke('tt:settings:get'),
    setSettings: s => invoke('tt:settings:set', s),
    listDrives: () => invoke('tt:drives'),
    setup: opts => invoke('tt:setup', opts),
    scanBackups: () => invoke('tt:scan-backups'),
    openBackup: (uuid, key) => invoke('tt:open-backup', uuid, key),
    stageMachineRestore: (token, snapshot, label) => invoke('tt:stage-machine-restore', token, snapshot, label),
    restartForRestore: () => invoke('tt:restart-for-restore'),
    acknowledgeLastRestore: () => invoke('tt:ack-last-restore'),
    listSnapshots: () => invoke('tt:snapshots'),
    listDir: (snapshot, rel) => invoke('tt:list-dir', snapshot, rel),
    search: q => invoke('tt:search', q),
    existsNow: rel => invoke('tt:exists-now', rel),
    restore: (snapshot, rels, mode) => invoke('tt:restore', snapshot, rels, mode),
    backupNow: () => invoke('tt:backup-now'),
    cancelBackup: () => invoke('tt:cancel-backup'),
    prepareSystemRestore: (snapshot, label) => invoke('tt:system-restore:prepare', snapshot, label),
    commitSystemRestore: token => invoke('tt:system-restore:commit', token),
    cancelSystemRestore: token => invoke('tt:system-restore:cancel', token),
    pickFolder: () => invoke('tt:pick-folder'),
    onEvent: cb => subscribe('tt:event', cb),
  });
}

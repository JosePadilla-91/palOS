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
  openMigration: () => ipcRenderer.send('tt:mig:open'),
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
  contextBridge.exposeInMainWorld('migration', {
    sources: () => invoke('tt:mig:sources'),
    openBackup: (uuid, key) => invoke('tt:open-backup', uuid, key),
    contents: (token, snapshot) => invoke('tt:mig:contents', token, snapshot),
    start: opts => invoke('tt:mig:start', opts),
    cancel: () => invoke('tt:mig:cancel'),
    whoami: () => invoke('tt:mig:whoami'),
    close: () => invoke('tt:mig:close'),
    onEvent: cb => subscribe('tt:event', cb),
  });
}

if (MOCK) {
  // sample data for previewing Migration Assistant
  const listeners = [];
  const later = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
  contextBridge.exposeInMainWorld('migration', {
    sources: () => later(600, { backups: [{ uuid: 'b1', label: 'Backup Drive', size: 2e12, removable: true }],
      disks: [{ uuid: 'w1', label: 'Windows (C:)', kind: 'windows', people: [{ name: 'Joe' }], apps: [] },
        { uuid: 'p1', label: 'Old palOS Disk', kind: 'palos', people: [{ name: 'joe' }, { name: 'sam' }], apps: ['BrushBoard.app', 'Composer.app'] }],
      accounts: [{ name: 'joe', fullName: 'Joe Lucas', home: '/home/joe' }] }),
    openBackup: () => later(400, { token: 't', snapshots: [{ id: 's1', time: Date.now() - 864e5, host: 'joe-laptop' }, { id: 's2', time: Date.now() - 864e6, host: 'joe-laptop' }] }),
    contents: () => later(400, { people: [{ name: 'joe', kind: 'palos' }], apps: ['Composer.app'] }),
    start: () => { let n = 0; const t = setInterval(() => { n += 20; listeners.forEach((f) => f(n >= 100 ? { type: 'migration', phase: 'done', people: ['joe'] } : { type: 'migration', phase: 'running', percent: n, text: 'Bringing over joe’s things…' })); if (n >= 100) clearInterval(t); }, 700); return later(100, { started: true }); },
    cancel: () => later(100, { cancelled: true }),
    whoami: () => later(10, 'joe'),
    close: () => ipcRenderer.invoke('tt:mig:close'),
    onEvent: (cb) => { listeners.push(cb); return () => {}; },
  });
}

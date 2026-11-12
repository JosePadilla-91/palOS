"use strict";
const electron = require("electron");
const invoke = (ch, ...args) => electron.ipcRenderer.invoke(ch, ...args);
function on(ch, cb) {
  const fn = (_e, ...args) => cb(...args);
  electron.ipcRenderer.on(ch, fn);
  return () => electron.ipcRenderer.removeListener(ch, fn);
}
const api = {
  library: {
    tracks: () => invoke("lib:tracks"),
    import: (paths) => invoke("lib:import", paths),
    updateInfo: (u) => invoke("lib:updateInfo", u),
    rate: (ids, rating) => invoke("lib:rate", ids, rating),
    remove: (ids, trash) => invoke("lib:remove", ids, trash),
    played: (id) => invoke("lib:played", id),
    skipped: (id) => invoke("lib:skipped", id),
    refresh: (ids) => invoke("lib:refresh", ids),
    fetchArt: (ids, force = false) => invoke("lib:fetchArt", ids, force),
    showInFolder: (id) => invoke("lib:showInFolder", id),
    playback: (id) => invoke("lib:playback", id),
    activity: () => invoke("lib:activity"),
    onDelta: (cb) => on("lib:delta", cb),
    onActivity: (cb) => on("activity", cb),
    onMessage: (cb) => on("message", cb)
  },
  playlists: {
    all: () => invoke("pl:all"),
    create: (name, kind, rules = null, trackIds = []) => invoke("pl:create", name, kind, rules, trackIds),
    update: (id, patch) => invoke("pl:update", id, patch),
    delete: (id) => invoke("pl:delete", id),
    setTracks: (id, trackIds) => invoke("pl:setTracks", id, trackIds),
    exportM3U: (id) => invoke("pl:export", id),
    importM3U: () => invoke("pl:import"),
    onChanged: (cb) => on("pl:changed", cb)
  },
  devices: {
    list: () => invoke("dev:list"),
    tracks: (id) => invoke("dev:tracks", id),
    eject: (id) => invoke("dev:eject", id),
    mount: (id) => invoke("dev:mount", id),
    rescan: (id) => invoke("dev:rescan", id),
    importTracks: (ids) => invoke("dev:import", ids),
    deleteTracks: (deviceId, ids) => invoke("dev:delete", deviceId, ids),
    copyTo: (deviceId, ids) => invoke("dev:copyTo", deviceId, ids),
    getProfile: (id) => invoke("dev:profile:get", id),
    setProfile: (id, p) => invoke("dev:profile:set", id, p),
    sync: (id, p) => invoke("dev:sync", id, p),
    cancelSync: () => invoke("dev:sync:cancel"),
    onChanged: (cb) => on("dev:changed", cb),
    onTracks: (cb) => on("dev:tracks", cb)
  },
  settings: {
    get: () => invoke("settings:get"),
    set: (patch) => invoke("settings:set", patch),
    onChanged: (cb) => on("settings", cb)
  },
  dialogs: {
    openFiles: () => invoke("dialog:openFiles"),
    openFolder: (title) => invoke("dialog:openFolder", title),
    chooseImage: () => invoke("dialog:image"),
    message: (opts) => invoke("dialog:message", opts)
  },
  contextMenu: (items) => invoke("menu:context", items),
  onMenu: (cb) => on("menu", cb),
  pathForFile: (f) => electron.webUtils.getPathForFile(f),
  openExternal: (url) => invoke("app:openExternal", url)
};
electron.contextBridge.exposeInMainWorld("discette", api);

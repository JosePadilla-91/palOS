"use strict";
const electron = require("electron");
const api = {
  palOS: (() => {
    try {
      return !!electron.ipcRenderer.sendSync("pal:os");
    } catch {
      return false;
    }
  })(),
  setMenu: (model) => electron.ipcRenderer.send("pal:setMenu", model),
  onMenu: (fn) => {
    const h = (_e, title, index) => fn(title, index);
    electron.ipcRenderer.on("pal:menu", h);
    return () => electron.ipcRenderer.removeListener("pal:menu", h);
  },
  caps: () => electron.ipcRenderer.invoke("caps"),
  importDialog: () => electron.ipcRenderer.invoke("dialog:import"),
  probe: (path) => electron.ipcRenderer.invoke("media:probe", path),
  thumbnail: (info) => electron.ipcRenderer.invoke("media:thumb", info),
  peaks: (path) => electron.ipcRenderer.invoke("media:peaks", path),
  pcm: (path, s0, dur) => electron.ipcRenderer.invoke("media:pcm", path, s0, dur),
  startTrack: (req) => electron.ipcRenderer.send("track:start", req),
  startStab: (req) => electron.ipcRenderer.send("stab:start", req),
  startSubject: (req) => electron.ipcRenderer.send("subject:start", req),
  subjectModel: () => electron.ipcRenderer.invoke("subject:model"),
  forgetMatte: (file) => electron.ipcRenderer.send("subject:forget", file),
  downloadSubjectModel: () => electron.ipcRenderer.invoke("subject:download"),
  onSubjectProgress: (fn) => {
    const h = (_e, p) => fn(p);
    electron.ipcRenderer.on("subject:progress", h);
    return () => electron.ipcRenderer.removeListener("subject:progress", h);
  },
  onSubjectDownload: (fn) => {
    const h = (_e, done, total) => fn(done, total);
    electron.ipcRenderer.on("subject:downloadProgress", h);
    return () => electron.ipcRenderer.removeListener("subject:downloadProgress", h);
  },
  cancelAnalysis: (id) => electron.ipcRenderer.send("analysis:cancel", id),
  onTrackProgress: (fn) => {
    const h = (_e, p) => fn(p);
    electron.ipcRenderer.on("track:progress", h);
    return () => electron.ipcRenderer.removeListener("track:progress", h);
  },
  onStabProgress: (fn) => {
    const h = (_e, p) => fn(p);
    electron.ipcRenderer.on("stab:progress", h);
    return () => electron.ipcRenderer.removeListener("stab:progress", h);
  },
  loadPresets: () => electron.ipcRenderer.invoke("presets:load"),
  savePresets: (list) => electron.ipcRenderer.invoke("presets:save", list),
  requestProxy: (info) => electron.ipcRenderer.invoke("proxy:request", info),
  fileExists: (path) => electron.ipcRenderer.invoke("file:exists", path),
  readText: (path) => electron.ipcRenderer.invoke("file:readText", path),
  fonts: () => electron.ipcRenderer.invoke("fonts:list"),
  openFileDialog: (title, extensions) => electron.ipcRenderer.invoke("dialog:openFile", title, extensions),
  openProjectDialog: () => electron.ipcRenderer.invoke("project:openDialog"),
  saveProjectDialog: (name) => electron.ipcRenderer.invoke("project:saveDialog", name),
  writeProject: (path, content) => electron.ipcRenderer.invoke("project:write", path, content),
  exportDialog: (name, ext) => electron.ipcRenderer.invoke("export:dialog", name, ext),
  startExport: (job) => electron.ipcRenderer.send("export:start", job),
  cancelExport: () => electron.ipcRenderer.send("export:cancel"),
  showItem: (path) => electron.ipcRenderer.send("shell:showItem", path),
  setDirty: (d) => electron.ipcRenderer.send("app:dirty", d),
  setTitle: (t) => electron.ipcRenderer.send("app:title", t),
  pathForFile: (file) => electron.webUtils.getPathForFile(file),
  onProxyEvent: (fn) => {
    const h = (_e, ev) => fn(ev);
    electron.ipcRenderer.on("proxy:event", h);
    return () => electron.ipcRenderer.removeListener("proxy:event", h);
  },
  onExportProgress: (fn) => {
    const h = (_e, p) => fn(p);
    electron.ipcRenderer.on("export:progress", h);
    return () => electron.ipcRenderer.removeListener("export:progress", h);
  }
};
electron.contextBridge.exposeInMainWorld("cuttingfloor", api);

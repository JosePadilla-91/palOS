"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var api = {
  openDialog: () => import_electron.ipcRenderer.invoke("file:open-dialog"),
  readFile: (p) => import_electron.ipcRenderer.invoke("file:read", p),
  readImageDialog: () => import_electron.ipcRenderer.invoke("file:read-image-dialog"),
  saveFile: (args) => import_electron.ipcRenderer.invoke("file:save", args),
  pickSavePath: (args) => import_electron.ipcRenderer.invoke("file:pick-save-path", args),
  getRecent: () => import_electron.ipcRenderer.invoke("recent:get"),
  addRecent: (p) => import_electron.ipcRenderer.invoke("recent:add", p),
  removeRecent: (p) => import_electron.ipcRenderer.invoke("recent:remove", p),
  clearRecent: () => import_electron.ipcRenderer.invoke("recent:clear"),
  getSettings: () => import_electron.ipcRenderer.invoke("settings:get"),
  setSettings: (patch) => import_electron.ipcRenderer.invoke("settings:set", patch),
  onSettingsChanged: (cb) => {
    const h = (_e, s) => cb(s);
    import_electron.ipcRenderer.on("settings:changed", h);
    return () => import_electron.ipcRenderer.removeListener("settings:changed", h);
  },
  getUserDictionary: () => import_electron.ipcRenderer.invoke("dict:get"),
  addToUserDictionary: (w) => import_electron.ipcRenderer.invoke("dict:add", w),
  onDictionaryChanged: (cb) => {
    const h = (_e, w) => cb(w);
    import_electron.ipcRenderer.on("dict:changed", h);
    return () => import_electron.ipcRenderer.removeListener("dict:changed", h);
  },
  listFonts: () => import_electron.ipcRenderer.invoke("fonts:list"),
  setDirty: (d) => import_electron.ipcRenderer.send("window:set-dirty", d),
  setTitle: (t) => import_electron.ipcRenderer.send("window:set-title", t),
  setFile: (p) => import_electron.ipcRenderer.send("window:set-file", p),
  closeConfirmed: () => import_electron.ipcRenderer.send("window:close-confirmed"),
  closeWindow: () => import_electron.ipcRenderer.send("window:close"),
  newWindow: (p) => import_electron.ipcRenderer.invoke("window:new", p),
  getInitialFile: () => import_electron.ipcRenderer.invoke("window:get-initial"),
  toggleFullscreen: () => import_electron.ipcRenderer.send("window:toggle-fullscreen"),
  onSaveAndClose: (cb) => {
    const h = () => cb();
    import_electron.ipcRenderer.on("app:save-and-close", h);
    return () => import_electron.ipcRenderer.removeListener("app:save-and-close", h);
  },
  appInfo: () => import_electron.ipcRenderer.invoke("app:info"),
  quit: () => import_electron.ipcRenderer.send("app:quit"),
  openExternal: (url) => import_electron.ipcRenderer.invoke("shell:open-external", url),
  thesaurus: (word, lang) => import_electron.ipcRenderer.invoke("thesaurus:lookup", word, lang),
  showItemInFolder: (p) => import_electron.ipcRenderer.invoke("shell:show-item", p),
  messageBox: (opts) => import_electron.ipcRenderer.invoke("dialog:message", opts),
  saveRecovery: (args) => import_electron.ipcRenderer.invoke("recovery:save", args),
  clearRecovery: () => import_electron.ipcRenderer.invoke("recovery:clear"),
  readRecovery: (file) => import_electron.ipcRenderer.invoke("recovery:read", file),
  exportPdf: (args) => import_electron.ipcRenderer.invoke("print:pdf", args),
  print: (args) => import_electron.ipcRenderer.invoke("print:print", args)
};
import_electron.contextBridge.exposeInMainWorld("chancery", api);

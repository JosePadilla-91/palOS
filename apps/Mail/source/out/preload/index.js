"use strict";
const electron = require("electron");
const IPC = {
  getSelf: "suite:get-self",
  self: "suite:self",
  getPresence: "suite:get-presence",
  presence: "suite:presence",
  ping: "suite:ping",
  open: "suite:open",
  incoming: "suite:incoming",
  windowMinimize: "window:minimize",
  windowToggleMaximize: "window:toggle-maximize",
  windowClose: "window:close",
  windowIsMaximized: "window:is-maximized",
  windowMaximized: "window:maximized",
  windowFocused: "window:focused"
};
function subscribe(channel, cb) {
  const listener = (_e, value) => cb(value);
  electron.ipcRenderer.on(channel, listener);
  return () => electron.ipcRenderer.removeListener(channel, listener);
}
const api = {
  /** Call a method the app's main process registered with ctx.handle(). */
  call: (method, ...args) => electron.ipcRenderer.invoke("app:call", method, args),
  /** Listen for ctx.broadcast(event) from the main process. */
  on: (event, cb) => subscribe("app:event", (m) => {
    if (m.event === event) cb(m.payload);
  }),
  onNavigate: (cb) => subscribe(IPC_NAV, cb),
  suite: {
    getSelf: () => electron.ipcRenderer.invoke(IPC.getSelf),
    onSelf: (cb) => subscribe(IPC.self, cb),
    getPresence: () => electron.ipcRenderer.invoke(IPC.getPresence),
    onPresence: (cb) => subscribe(IPC.presence, cb),
    ping: (target) => electron.ipcRenderer.invoke(IPC.ping, target),
    open: (target) => electron.ipcRenderer.invoke(IPC.open, target),
    onIncoming: (cb) => subscribe(IPC.incoming, cb),
    quit: () => electron.ipcRenderer.send("suite:quit"),
    openAccounts: (email) => electron.ipcRenderer.send("suite:openAccounts", email)
  },
  window: {
    minimize: () => electron.ipcRenderer.send(IPC.windowMinimize),
    toggleMaximize: () => electron.ipcRenderer.send(IPC.windowToggleMaximize),
    close: () => electron.ipcRenderer.send(IPC.windowClose),
    isMaximized: () => electron.ipcRenderer.invoke(IPC.windowIsMaximized),
    onMaximized: (cb) => subscribe(IPC.windowMaximized, cb),
    onFocused: (cb) => subscribe(IPC.windowFocused, cb),
    key: () => electron.ipcRenderer.invoke("app:windowKey"),
    setTitle: (title) => electron.ipcRenderer.send("app:setTitle", title)
  },
  ui: {
    /** Native (GTK) popup menu; resolves with the chosen item's id. */
    menu: (items, pos) => electron.ipcRenderer.invoke("ui:menu", items, pos),
    confirm: (o) => electron.ipcRenderer.invoke("ui:confirm", o),
    openFiles: (o) => electron.ipcRenderer.invoke("ui:openFiles", o),
    saveFile: (o) => electron.ipcRenderer.invoke("ui:saveFile", o),
    openExternal: (url) => electron.ipcRenderer.send("ui:openExternal", url),
    about: () => electron.ipcRenderer.invoke("ui:about"),
    /** Paladin: publish this window's menu and shortcuts to the desktop menu bar. */
    setAppMenu: (m) => electron.ipcRenderer.send("paladin:appmenu", m),
    onAppMenu: (cb) => subscribe("paladin:appmenu-click", cb),
    setShortcuts: (k) => electron.ipcRenderer.send("paladin:shortcuts", k),
    /** Real path of a dropped or picked File. */
    pathForFile: (file) => electron.webUtils.getPathForFile(file)
  }
};
const IPC_NAV = "app:navigate";
electron.contextBridge.exposeInMainWorld("paladin", api);

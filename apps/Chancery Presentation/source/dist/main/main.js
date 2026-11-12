"use strict";
/* palOS sheets: Save, Open and message panels come out of the window */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main/main.ts
var import_electron = require("electron");
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var import_child_process = require("child_process");
var import_crypto = require("crypto");
var APP_NAME = "Chancery Presentation";
var APP_ID = "chancery-presentation";
var NATIVE_EXT = "pre";
import_electron.app.setName(APP_NAME);
import_electron.app.commandLine.appendSwitch("class", APP_ID);
var isDev = process.env.CHANCERY_DEV === "1";
var userData = import_electron.app.getPath("userData");
var settingsFile = path.join(userData, "settings.json");
var recentFile = path.join(userData, "recent.json");
var recoveryDir = path.join(userData, "recovery");
var dictUserFile = path.join(userData, "user-dictionary.txt");
var OPENABLE_EXT = ["pre", "pptx", "pptm", "potx", "ppsx", "odp", "otp"];
function defaultUserName() {
  try {
    const info = os.userInfo();
    const passwd = fs.readFileSync("/etc/passwd", "utf8").split("\n");
    const line = passwd.find((l) => l.startsWith(info.username + ":"));
    if (line) {
      const gecos = line.split(":")[4]?.split(",")[0];
      if (gecos && gecos.trim()) return gecos.trim();
    }
    return info.username;
  } catch {
    return "User";
  }
}
var DEFAULT_SETTINGS = {
  userName: defaultUserName(),
  userInitials: "",
  units: "in",
  autosaveMinutes: 2,
  spellcheck: true,
  spellLang: "en-US",
  theme: "system",
  defaultFont: "Liberation Serif",
  defaultSize: 12,
  defaultPageSize: "letter",
  autocorrect: true,
  smartQuotes: true,
  autoCapitalize: true,
  showFormattingMarks: false,
  showRuler: true,
  showSidebar: false,
  zoom: 100,
  ribbonCollapsed: false,
  defaultSaveFormat: NATIVE_EXT,
  warnNonNativeSave: true
};
function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}
var settings = { ...DEFAULT_SETTINGS, ...readJSON(settingsFile, {}) };
function getRecent() {
  return readJSON(recentFile, []).filter((r) => fs.existsSync(r.path));
}
function addRecent(p) {
  const list = getRecent().filter((r) => r.path !== p);
  list.unshift({ path: p, name: path.basename(p), time: Date.now() });
  writeJSON(recentFile, list.slice(0, 20));
  import_electron.app.addRecentDocument(p);
}
var winState = /* @__PURE__ */ new Map();
function rendererURL() {
  return path.join(__dirname, "..", "renderer", "index.html");
}
function createWindow(openPath = null, opts = {}) {
  const { width, height } = import_electron.screen.getPrimaryDisplay().workAreaSize;
  const focused = import_electron.BrowserWindow.getFocusedWindow();
  const win = new import_electron.BrowserWindow({
    width: Math.min(1400, width),
    height: Math.min(980, height),
    x: focused ? focused.getBounds().x + 30 : void 0,
    y: focused ? focused.getBounds().y + 30 : void 0,
    minWidth: 760,
    minHeight: 500,
    title: APP_NAME,
    icon: path.join(__dirname, "..", "renderer", "icon.png"),
    backgroundColor: import_electron.nativeTheme.shouldUseDarkColors ? "#1f1d1b" : "#ece8e1",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      offscreen: !!opts.thumb
    }
  });
  if (opts.thumb) win.setSize(1400, 1000);
  const state = {
    dirty: false,
    filePath: null,
    forceClose: false,
    pendingOpen: openPath,
    recoveryId: opts.recoveryFile ? path.basename(opts.recoveryFile, "." + NATIVE_EXT) : (0, import_crypto.randomUUID)()
  };
  winState.set(win.webContents.id, state);
  const wcId = win.webContents.id;
  const query = {};
  if (opts.recoveryFile) query.recover = opts.recoveryFile;
  if (opts.template) query.template = opts.template;
  win.loadFile(rendererURL(), { query });
  win.on("page-title-updated", (e) => e.preventDefault());
  win.once("ready-to-show", () => {
    if (opts.thumb) return;
    win.show();
    if (isDev) win.webContents.openDevTools({ mode: "detach" });
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/i.test(url)) import_electron.shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("file://")) {
      e.preventDefault();
      if (/^(https?|mailto):/i.test(url)) import_electron.shell.openExternal(url);
    } else if (!url.includes("index.html")) {
      e.preventDefault();
    }
  });
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.type === "keyDown" && input.control && input.shift && input.key.toLowerCase() === "i") {
      win.webContents.toggleDevTools();
    }
  });
  win.on("close", async (e) => {
    const st = winState.get(wcId);
    if (!st || st.forceClose || !st.dirty) return;
    e.preventDefault();
    const name = st.filePath ? path.basename(st.filePath) : "Untitled";
    const res = await import_electron.dialog.showMessageBox(win, {
      type: "warning",
      buttons: ["Save", "Don't Save", "Cancel"],
      defaultId: 0,
      cancelId: 2,
      title: APP_NAME,
      message: `Save changes to \u201C${name}\u201D before closing?`,
      detail: "Your changes will be lost if you don\u2019t save them."
    });
    if (res.response === 0) {
      win.webContents.send("app:save-and-close");
    } else if (res.response === 1) {
      st.forceClose = true;
      clearRecovery(st.recoveryId);
      win.close();
    }
  });
  win.on("closed", () => {
    const st = winState.get(wcId);
    if (st && !st.dirty) clearRecovery(st.recoveryId);
    winState.delete(wcId);
  });
  return win;
}
function stateFor(e) {
  return winState.get(e.sender.id);
}
function winFor(e) {
  return import_electron.BrowserWindow.fromWebContents(e.sender);
}
function clearRecovery(id) {
  try {
    fs.rmSync(path.join(recoveryDir, id + "." + NATIVE_EXT), { force: true });
    fs.rmSync(path.join(recoveryDir, id + ".json"), { force: true });
  } catch {
  }
}
var FILTERS_OPEN = [
  { name: "All presentations", extensions: OPENABLE_EXT },
  { name: "Chancery Presentation (.pre)", extensions: ["pre"] },
  { name: "PowerPoint (.pptx)", extensions: ["pptx", "pptm", "potx", "ppsx"] },
  { name: "OpenDocument Presentation (.odp)", extensions: ["odp", "otp"] },
  { name: "All files", extensions: ["*"] }
];
function readFileResult(p) {
  const data = fs.readFileSync(p);
  return { path: p, name: path.basename(p), data: new Uint8Array(data) };
}
import_electron.ipcMain.handle("file:open-dialog", async (e) => {
  const res = await import_electron.dialog.showOpenDialog(winFor(e), {
    title: "Open",
    properties: ["openFile", "multiSelections"],
    filters: FILTERS_OPEN,
    defaultPath: settings.lastDir || import_electron.app.getPath("documents")
  });
  if (res.canceled || !res.filePaths.length) return null;
  settings.lastDir = path.dirname(res.filePaths[0]);
  writeJSON(settingsFile, settings);
  for (const extra of res.filePaths.slice(1)) createWindow(extra);
  return readFileResult(res.filePaths[0]);
});
import_electron.ipcMain.handle("file:read", async (_e, p) => {
  try {
    return readFileResult(p);
  } catch (err) {
    return { error: String(err?.message || err) };
  }
});
import_electron.ipcMain.handle("file:read-image-dialog", async (e) => {
  const res = await import_electron.dialog.showOpenDialog(winFor(e), {
    title: "Insert Image",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"] }],
    defaultPath: settings.lastImageDir || import_electron.app.getPath("pictures")
  });
  if (res.canceled || !res.filePaths.length) return null;
  settings.lastImageDir = path.dirname(res.filePaths[0]);
  return readFileResult(res.filePaths[0]);
});
import_electron.ipcMain.handle(
  "file:save",
  async (e, args) => {
    let target = args.path || null;
    if (!target) {
      const res = await import_electron.dialog.showSaveDialog(winFor(e), {
        title: args.title || "Save As",
        defaultPath: path.join(settings.lastDir || import_electron.app.getPath("documents"), args.defaultName || "Untitled." + NATIVE_EXT),
        filters: args.filters,
        properties: ["showOverwriteConfirmation", "createDirectory"]
      });
      if (res.canceled || !res.filePath) return null;
      target = res.filePath;
      const ext = args.filters?.[0]?.extensions?.[0];
      if (ext && ext !== "*" && !path.extname(target)) target += "." + ext;
      settings.lastDir = path.dirname(target);
      writeJSON(settingsFile, settings);
    }
    const tmp = target + ".~uwtmp";
    fs.writeFileSync(tmp, Buffer.from(args.data));
    fs.renameSync(tmp, target);
    if (!args.isExport) {
      const st = stateFor(e);
      if (st) st.filePath = target;
      addRecent(target);
    }
    return { path: target, name: path.basename(target) };
  }
);
import_electron.ipcMain.handle("file:pick-save-path", async (e, args) => {
  const res = await import_electron.dialog.showSaveDialog(winFor(e), {
    title: args.title || "Export",
    defaultPath: path.join(settings.lastDir || import_electron.app.getPath("documents"), args.defaultName),
    filters: args.filters,
    properties: ["showOverwriteConfirmation", "createDirectory"]
  });
  if (res.canceled || !res.filePath) return null;
  return res.filePath;
});
import_electron.ipcMain.handle("recent:get", () => getRecent());
import_electron.ipcMain.handle("recent:add", (_e, p) => addRecent(p));
import_electron.ipcMain.handle("recent:remove", (_e, p) => {
  writeJSON(recentFile, getRecent().filter((r) => r.path !== p));
});
import_electron.ipcMain.handle("recent:clear", () => {
  writeJSON(recentFile, []);
  import_electron.app.clearRecentDocuments();
});
import_electron.ipcMain.handle("settings:get", () => settings);
import_electron.ipcMain.handle("settings:set", (_e, patch) => {
  settings = { ...settings, ...patch };
  writeJSON(settingsFile, settings);
  if (patch.theme) import_electron.nativeTheme.themeSource = patch.theme;
  for (const w of import_electron.BrowserWindow.getAllWindows()) w.webContents.send("settings:changed", settings);
  return settings;
});
import_electron.ipcMain.handle("dict:get", () => {
  try {
    return fs.readFileSync(dictUserFile, "utf8").split("\n").filter(Boolean);
  } catch {
    return [];
  }
});
import_electron.ipcMain.handle("dict:add", (_e, word) => {
  fs.mkdirSync(userData, { recursive: true });
  fs.appendFileSync(dictUserFile, word + "\n");
  for (const w of import_electron.BrowserWindow.getAllWindows()) w.webContents.send("dict:changed", word);
});
var fontCache = null;
import_electron.ipcMain.handle("fonts:list", async () => {
  if (fontCache) return fontCache;
  fontCache = await new Promise((resolve2) => {
    (0, import_child_process.execFile)("fc-list", [":", "family"], { maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve2([]);
      const set = /* @__PURE__ */ new Set();
      for (const line of stdout.split("\n")) {
        const fam = line.split(",")[0].trim();
        if (fam && !fam.startsWith(".")) set.add(fam);
      }
      resolve2([...set].sort((a, b) => a.localeCompare(b)));
    });
  });
  return fontCache;
});
import_electron.ipcMain.on("window:set-dirty", (e, dirty) => {
  const st = stateFor(e);
  if (st) st.dirty = dirty;
  const w = winFor(e);
  w?.setDocumentEdited?.(dirty);
});
import_electron.ipcMain.on("window:set-title", (e, title) => {
  winFor(e)?.setTitle(title);
});
import_electron.ipcMain.on("window:set-file", (e, p) => {
  const st = stateFor(e);
  if (st) st.filePath = p;
});
import_electron.ipcMain.on("window:close-confirmed", (e) => {
  const st = stateFor(e);
  if (st) {
    st.forceClose = true;
    clearRecovery(st.recoveryId);
  }
  winFor(e)?.close();
});
import_electron.ipcMain.on("window:close", (e) => winFor(e)?.close());
import_electron.ipcMain.handle("window:new", (_e, p) => {
  if (p && p.startsWith("template:")) createWindow(null, { template: p.slice(9) });
  else createWindow(p || null);
});
import_electron.ipcMain.handle("window:get-initial", (e) => {
  const st = stateFor(e);
  const p = st?.pendingOpen;
  if (st) st.pendingOpen = null;
  if (p) {
    try {
      return readFileResult(p);
    } catch (err) {
      return { error: String(err?.message || err), path: p };
    }
  }
  return null;
});
import_electron.ipcMain.handle("window:open-in-this-or-new", (e, p) => {
  return readFileResult(p);
});
import_electron.ipcMain.on("window:toggle-fullscreen", (e) => {
  const w = winFor(e);
  w.setFullScreen(!w.isFullScreen());
});
import_electron.ipcMain.handle("app:info", () => ({
  version: import_electron.app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  platform: `${os.type()} ${os.release()}`,
  userData,
  documentsDir: import_electron.app.getPath("documents")
}));
import_electron.ipcMain.on("app:quit", () => import_electron.app.quit());
import_electron.ipcMain.handle("shell:open-external", (_e, url) => {
  if (/^(https?|mailto):/i.test(url)) return import_electron.shell.openExternal(url);
});
import_electron.ipcMain.handle("shell:show-item", (_e, p) => import_electron.shell.showItemInFolder(p));
import_electron.ipcMain.handle("dialog:message", async (e, opts) => {
  return import_electron.dialog.showMessageBox(winFor(e), { title: APP_NAME, ...opts });
});
import_electron.ipcMain.handle("recovery:save", (e, args) => {
  const st = stateFor(e);
  if (!st) return;
  fs.mkdirSync(recoveryDir, { recursive: true });
  fs.writeFileSync(path.join(recoveryDir, st.recoveryId + "." + NATIVE_EXT), Buffer.from(args.data));
  writeJSON(path.join(recoveryDir, st.recoveryId + ".json"), { name: args.name, path: args.path, time: Date.now() });
});
import_electron.ipcMain.handle("recovery:clear", (e) => {
  const st = stateFor(e);
  if (st) clearRecovery(st.recoveryId);
});
import_electron.ipcMain.handle("recovery:read", (_e, file) => {
  const meta = readJSON(file.replace(/\.pre$/, ".json"), {});
  return { data: new Uint8Array(fs.readFileSync(file)), meta };
});
async function renderPrintWindow(html) {
  const tmp = path.join(os.tmpdir(), `chancery-print-${(0, import_crypto.randomUUID)()}.html`);
  fs.writeFileSync(tmp, html, "utf8");
  const pw = new import_electron.BrowserWindow({
    show: false,
    width: 1e3,
    height: 1200,
    webPreferences: { sandbox: true, contextIsolation: true, javascript: true, offscreen: false }
  });
  await pw.loadFile(tmp);
  await pw.webContents.executeJavaScript(
    `Promise.all([document.fonts.ready, ...Array.from(document.images).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))]).then(() => true)`
  );
  return { pw, tmp };
}
import_electron.ipcMain.handle("print:pdf", async (e, args) => {
  let target = args.path || null;
  if (!target) {
    const res = await import_electron.dialog.showSaveDialog(winFor(e), {
      title: "Export as PDF",
      defaultPath: path.join(settings.lastDir || import_electron.app.getPath("documents"), args.defaultName || "Untitled.pdf"),
      filters: [{ name: "PDF document", extensions: ["pdf"] }],
      properties: ["showOverwriteConfirmation", "createDirectory"]
    });
    if (res.canceled || !res.filePath) return null;
    target = res.filePath.toLowerCase().endsWith(".pdf") ? res.filePath : res.filePath + ".pdf";
  }
  const { pw, tmp } = await renderPrintWindow(args.html);
  try {
    const pdf = await pw.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: { width: args.widthIn, height: args.heightIn },
      margins: { marginType: "none" },
      generateTaggedPDF: true,
      generateDocumentOutline: true
    });
    fs.writeFileSync(target, pdf);
    return { path: target };
  } finally {
    pw.destroy();
    fs.rmSync(tmp, { force: true });
  }
});
import_electron.ipcMain.handle("print:print", async (_e, args) => {
  const { pw, tmp } = await renderPrintWindow(args.html);
  pw.setTitle(args.title);
  return new Promise((resolve2) => {
    pw.webContents.print(
      {
        silent: false,
        printBackground: true,
        margins: { marginType: "none" },
        pageSize: { width: Math.round(args.widthIn * 25400), height: Math.round(args.heightIn * 25400) }
      },
      (success, failureReason) => {
        pw.destroy();
        fs.rmSync(tmp, { force: true });
        resolve2({ success, failureReason });
      }
    );
  });
});
var audience = /* @__PURE__ */ new Map();
var audienceOwner = /* @__PURE__ */ new Map();
import_electron.ipcMain.handle("show:displays", (e) => {
  const all = import_electron.screen.getAllDisplays();
  const cur = import_electron.screen.getDisplayMatching(winFor(e).getBounds());
  return { count: all.length, current: cur.id, displays: all.map((d) => ({ id: d.id, label: d.label || `${d.size.width}\xD7${d.size.height}`, primary: d.id === import_electron.screen.getPrimaryDisplay().id })) };
});
import_electron.ipcMain.handle("show:open-audience", async (e, args) => {
  const owner = winFor(e);
  const ownerId = e.sender.id;
  audience.get(ownerId)?.destroy();
  const all = import_electron.screen.getAllDisplays();
  const ownerDisplay = import_electron.screen.getDisplayMatching(owner.getBounds());
  const target = all.find((d) => d.id === args.displayId) || all.find((d) => d.id !== ownerDisplay.id) || ownerDisplay;
  const win = new import_electron.BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    fullscreen: true,
    frame: false,
    backgroundColor: "#000000",
    title: `${APP_NAME} \u2014 Slideshow`,
    show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
  });
  audience.set(ownerId, win);
  audienceOwner.set(win.webContents.id, ownerId);
  win.on("page-title-updated", (ev) => ev.preventDefault());
  await win.loadFile(rendererURL(), { query: { mode: "audience" } });
  win.webContents.send("show:deck", { deck: args.deck, state: args.state });
  win.show();
  win.setFullScreen(true);
  const wcId = win.webContents.id;
  win.on("closed", () => {
    audience.delete(ownerId);
    audienceOwner.delete(wcId);
    const o = import_electron.BrowserWindow.getAllWindows().find((w) => w.webContents.id === ownerId);
    o?.webContents.send("show:audience-closed");
  });
  return { displayId: target.id, sameDisplay: target.id === ownerDisplay.id };
});
import_electron.ipcMain.on("show:state", (e, state) => {
  audience.get(e.sender.id)?.webContents.send("show:state", state);
});
import_electron.ipcMain.on("show:deck-update", (e, deck) => {
  audience.get(e.sender.id)?.webContents.send("show:deck", { deck });
});
import_electron.ipcMain.on("show:event", (e, ev) => {
  const ownerId = audienceOwner.get(e.sender.id);
  const o = import_electron.BrowserWindow.getAllWindows().find((w) => w.webContents.id === ownerId);
  o?.webContents.send("show:event", ev);
});
import_electron.ipcMain.on("show:close-audience", (e) => {
  audience.get(e.sender.id)?.destroy();
});
import_electron.ipcMain.on("window:set-fullscreen", (e, on) => winFor(e)?.setFullScreen(!!on));
import_electron.ipcMain.handle("capture:png", async (_e, args) => {
  const tmp = path.join(os.tmpdir(), `chancery-cap-${(0, import_crypto.randomUUID)()}.html`);
  fs.writeFileSync(tmp, args.html, "utf8");
  const w = new import_electron.BrowserWindow({ show: false, width: args.width, height: args.height, useContentSize: true, webPreferences: { offscreen: true, sandbox: true } });
  try {
    await w.loadFile(tmp);
    await w.webContents.executeJavaScript(`Promise.all([document.fonts.ready, ...Array.from(document.images).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))]).then(() => new Promise(r => setTimeout(r, 120)))`);
    const img = await w.webContents.capturePage({ x: 0, y: 0, width: args.width, height: args.height });
    return new Uint8Array(img.toPNG());
  } finally {
    w.destroy();
    fs.rmSync(tmp, { force: true });
  }
});
import_electron.ipcMain.handle("dialog:pick-folder", async (e, title) => {
  const r = await import_electron.dialog.showOpenDialog(winFor(e), { title: title || "Choose a folder", properties: ["openDirectory", "createDirectory"], defaultPath: settings.lastDir || import_electron.app.getPath("pictures") });
  return r.canceled ? null : r.filePaths[0];
});
import_electron.ipcMain.handle("file:write-path", async (_e, p, data) => {
  fs.writeFileSync(p, Buffer.from(data));
  return true;
});
function filesFromArgv(argv) {
  const out = [];
  for (const a of argv.slice(import_electron.app.isPackaged ? 1 : 2)) {
    if (a.startsWith("-")) continue;
    let p = a;
    if (p.startsWith("file://")) p = decodeURIComponent(new URL(p).pathname);
    const ext = path.extname(p).slice(1).toLowerCase();
    if (OPENABLE_EXT.includes(ext) && fs.existsSync(p)) out.push(path.resolve(p));
  }
  return out;
}
// palOS: "--thumbnail FILE OUT SIZE" draws the first slide into OUT (a PNG at most SIZE pixels) for Seeker's icons.
var PAGES = (() => {
  const i = process.argv.indexOf("--pages");
  return i >= 0 && process.argv[i + 2] ? { src: path.resolve(process.argv[i + 1]), dir: process.argv[i + 2], size: Math.max(64, Math.min(2048, +process.argv[i + 3] || 1024)) } : null;
})();
var THUMB = (() => {
  if (PAGES) return { src: PAGES.src, out: null, size: PAGES.size, pages: true };
  const i = process.argv.indexOf("--thumbnail");
  return i >= 0 && process.argv[i + 2] ? { src: path.resolve(process.argv[i + 1]), out: process.argv[i + 2], size: Math.max(32, Math.min(1024, +process.argv[i + 3] || 256)) } : null;
})();
if (THUMB) {
  try { import_electron.app.setPath("userData", fs.mkdtempSync(path.join(require("os").tmpdir(), "pre-thumb-"))); } catch {}
  import_electron.app.disableHardwareAcceleration();
}
// palOS: "--pages FILE DIR SIZE": every slide (up to 120) into DIR as 1.png, 2.png…, then DIR/count (Seeker turns through them)
async function makePages() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const timer = setTimeout(() => import_electron.app.exit(2), 240000);
  try {
    fs.mkdirSync(PAGES.dir, { recursive: true });
    const win = createWindow(PAGES.src, { thumb: true });
    await new Promise((r) => win.webContents.once("did-finish-load", r));
    const find = `(() => { const c = document.querySelector('.pre-canvas'); const s = c && (c.querySelector('.pre-slide-frame') || c.querySelector('.pre-slide') || c.querySelector('.pre-canvas-inner'));
      if (!s) return null; const b = s.getBoundingClientRect(); return b.width > 100 ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; })()`;
    let ids = null;
    for (let i = 0; i < 120 && !(ids && ids.length); i++) {
      ids = await win.webContents.executeJavaScript(`(() => { const p = window.__pre; const st = p && p.store && p.store.get(); return st && st.slides ? st.slides.filter((s) => !s.hidden).map((s) => s.id) : null; })()`).catch(() => null);
      if (!(ids && ids.length)) await sleep(250);
    }
    if (!ids || !ids.length) throw new Error("no slides");
    await sleep(1200);
    const n = Math.min(ids.length, 120);
    for (let k = 0; k < n; k++) {
      await win.webContents.executeJavaScript(`window.__pre.store.set({ currentId: ${JSON.stringify(ids[k])} }), 1`);
      await sleep(k ? 450 : 900);
      const box = await win.webContents.executeJavaScript(find);
      if (!box) continue;
      let img = await win.webContents.capturePage({ x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.w), height: Math.round(box.h) });
      const sz = img.getSize(), f = Math.min(1, PAGES.size / Math.max(sz.width, sz.height));
      if (f < 1) img = img.resize({ width: Math.round(sz.width * f), height: Math.round(sz.height * f), quality: "best" });
      fs.writeFileSync(path.join(PAGES.dir, `${k + 1}.png.tmp`), img.toPNG());
      fs.renameSync(path.join(PAGES.dir, `${k + 1}.png.tmp`), path.join(PAGES.dir, `${k + 1}.png`));
      process.stdout.write(`slide ${k + 1}/${n}\n`);
    }
    fs.writeFileSync(path.join(PAGES.dir, "count"), String(n));
    clearTimeout(timer);
    import_electron.app.exit(0);
  } catch (e) { process.stderr.write("presentation pages: " + (e && e.message) + "\n"); import_electron.app.exit(1); }
}
async function makeThumbnail() {
  if (PAGES) return makePages();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const timer = setTimeout(() => import_electron.app.exit(2), 45000);
  try {
    const win = createWindow(THUMB.src, { thumb: true });
    await new Promise((r) => win.webContents.once("did-finish-load", r));
    const find = `(() => { const c = document.querySelector('.pre-canvas'); const s = c && (c.querySelector('.pre-slide-frame') || c.querySelector('.pre-slide') || c.querySelector('.pre-canvas-inner'));
      if (!s) return null; const b = s.getBoundingClientRect(); return b.width > 100 ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; })()`;
    let box = null;
    for (let i = 0; i < 120 && !box; i++) { box = await win.webContents.executeJavaScript(find).catch(() => null); if (!box) await sleep(250); }
    if (!box) throw new Error("no slide");
    await sleep(1500);
    box = await win.webContents.executeJavaScript(find) || box;
    let img = await win.webContents.capturePage({ x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.w), height: Math.round(box.h) });
    const sz = img.getSize(), k = Math.min(1, THUMB.size / Math.max(sz.width, sz.height));
    if (k < 1) img = img.resize({ width: Math.round(sz.width * k), height: Math.round(sz.height * k), quality: "best" });
    fs.writeFileSync(THUMB.out, img.toPNG());
    clearTimeout(timer);
    import_electron.app.exit(0);
  } catch (e) { process.stderr.write("presentation thumbnail: " + (e && e.message) + "\n"); import_electron.app.exit(1); }
}
var gotLock = THUMB ? true : import_electron.app.requestSingleInstanceLock();
if (THUMB) {
  import_electron.app.whenReady().then(makeThumbnail);
} else if (!gotLock) {
  import_electron.app.quit();
} else {
  import_electron.app.on("second-instance", (_e, argv, cwd) => {
    const files = filesFromArgv(argv.map((a) => a.startsWith("-") || path.isAbsolute(a) || a.startsWith("file:") ? a : path.resolve(cwd, a)));
    if (files.length) files.forEach((f) => createWindow(f));
    else createWindow();
  });
  import_electron.app.whenReady().then(() => {
    import_electron.Menu.setApplicationMenu(null);
    import_electron.nativeTheme.themeSource = settings.theme || "system";
    import_electron.session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
      cb(["clipboard-read", "clipboard-sanitized-write", "local-fonts", "fullscreen"].includes(permission));
    });
    import_electron.session.defaultSession.setPermissionCheckHandler(
      (_wc, permission) => ["clipboard-read", "clipboard-sanitized-write", "local-fonts", "fullscreen"].includes(permission)
    );
    let recovered = 0;
    try {
      const files2 = fs.existsSync(recoveryDir) ? fs.readdirSync(recoveryDir).filter((f) => f.endsWith("." + NATIVE_EXT)) : [];
      for (const f of files2) {
        createWindow(null, { recoveryFile: path.join(recoveryDir, f) });
        recovered++;
      }
    } catch {
    }
    const files = filesFromArgv(process.argv);
    if (files.length) files.forEach((f) => createWindow(f));
    else if (!recovered) createWindow();
    import_electron.app.on("activate", () => {
      if (import_electron.BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  import_electron.app.on("window-all-closed", () => import_electron.app.quit());
}


// ---- paladin-menus: this app's menus in the Paladin menu bar -------------------------------------
// Added by Paladin. Each window gets a real menu (exported to the desktop menu bar by Electron).
// Items either press the app's own keyboard shortcut in the window, run a small bit of the app's
// page script, or (for apps that keep their own menu model in the page) mirror that model exactly.
// SPEC is filled in per app by the Paladin packaging script.
(() => {
  const { app, BrowserWindow, Menu } = require("electron");
  const SPEC = {"name": "Chancery Presentation", "about": {"js": "window.__pre.store.set({backstage:'about'})"}, "prefs": {"js": "window.__pre.store.set({backstage:'options'})"}, "quit": "Ctrl+Q", "fullscreen": "F11", "menus": [{"label": "File", "items": [["New Presentation", "Ctrl+N"], ["Open…", "Ctrl+O"], "-", ["Save", "Ctrl+S"], ["Save As…", "Ctrl+Shift+S"], ["Export…", "Ctrl+Shift+E"], "-", ["Print…", "Ctrl+P"], "-", ["Close Presentation", "Ctrl+W"]]}, {"label": "Edit", "items": [["Undo", "Ctrl+Z"], ["Redo", "Ctrl+Y"], "-", ["Cut", "Ctrl+X"], ["Copy", "Ctrl+C"], ["Paste", "Ctrl+V"], ["Duplicate", "Ctrl+D"], ["Select All", "Ctrl+A"]]}, {"label": "Slide", "items": [["New Slide", "Ctrl+M"]]}, {"label": "Arrange", "items": [["Bring Forward", "Ctrl+]"], ["Bring to Front", "Ctrl+Shift+]"], ["Send Backward", "Ctrl+["], ["Send to Back", "Ctrl+Shift+["]]}, {"label": "View", "items": [["Zoom In", "Ctrl+="], ["Zoom Out", "Ctrl+-"], ["Fit to Window", "Ctrl+0"]]}, {"label": "Slide Show", "items": [["Play from Start", "F5"], ["Play from Current Slide", "Shift+F5"]]}]};
  if (!SPEC) return;
  const NAME = SPEC.name || app.getName();

  const KEYNAMES = { del: "Delete", delete: "Delete", esc: "Escape", escape: "Escape", enter: "Return", return: "Return",
    space: "Space", " ": "Space", left: "Left", right: "Right", up: "Up", down: "Down", arrowleft: "Left", arrowright: "Right",
    arrowup: "Up", arrowdown: "Down", home: "Home", end: "End", tab: "Tab", backspace: "Backspace", pageup: "PageUp", pagedown: "PageDown" };
  const MODS = { ctrl: "control", control: "control", cmd: "control", shift: "shift", alt: "alt" };
  function parse(combo) {
    const raw = String(combo).trim();
    // "Ctrl++" / "Ctrl+=": the last "+" may be the key itself
    const m = raw.match(/^(.*?)\+?([^+]+|\+)$/);
    const mods = (m[1] || "").split("+").map((s) => s.trim().toLowerCase()).filter(Boolean);
    let key = m[2];
    key = KEYNAMES[key.toLowerCase()] || (/^f\d{1,2}$/i.test(key) ? key.toUpperCase() : key.length === 1 ? key.toLowerCase() : key);
    return { mods: mods.map((x) => MODS[x]).filter(Boolean), key };
  }
  function accel(combo) {
    const { mods, key } = parse(combo);
    const k = { Space: "Space", "+": "Plus", "=": "=" }[key] || (key.length === 1 ? key.toUpperCase() : key);
    return [...mods.map((x) => ({ control: "Ctrl", shift: "Shift", alt: "Alt" }[x])), k].join("+");
  }
  function press(wc, combo) {
    if (!wc || wc.isDestroyed()) return;
    const { mods, key } = parse(combo);
    wc.focus();
    wc.sendInputEvent({ type: "keyDown", keyCode: key, modifiers: mods });
    wc.sendInputEvent({ type: "keyUp", keyCode: key, modifiers: mods });
  }
  const run = (wc, js) => wc && !wc.isDestroyed() && wc.executeJavaScript(`(()=>{try{${js}}catch(e){console.error("[paladin-menus]",e)}})()`, true).catch(() => {});

  // values the menus depend on (enabled / checked / mirrored model), read from the page
  const state = new Map(); // webContents id -> { probe: json, model }
  function probeScript() {
    const exprs = [];
    const walk = (items) => (items || []).forEach((i) => { if (i && typeof i === "object" && !Array.isArray(i)) { if (i.when) exprs.push(i.when); if (i.checked) exprs.push(i.checked); if (i.items) walk(i.items); } });
    (SPEC.menus || []).forEach((m) => walk(m.items));
    if (SPEC.prefs) walk([SPEC.prefs]);
    const model = SPEC.model ? `(()=>{const M=${SPEC.model};if(!M)return null;return Object.entries(M).map(([t,l])=>[t,l.map(i=>i.sep?null:[String(i.label||"").replace(/^[✓ ]+/,""),i.keys||"",!!i.disabled,/^✓/.test(i.label||"")])])})()` : "null";
    return `(()=>{const r=[];${exprs.map((e) => `try{r.push(!!(${e}))}catch(_){r.push(false)}`).join(";")};let m=null;try{m=${model}}catch(_){};return JSON.stringify([r,m])})()`;
  }
  const PROBE = probeScript();

  function build(win) {
    if (!win || win.isDestroyed()) return;
    const wc = win.webContents;
    const st = state.get(wc.id) || {};
    const vals = st.vals || [];
    let vi = 0;
    const conv = (i) => {
      if (i === "-") return { type: "separator" };
      if (Array.isArray(i)) { const [label, combo] = i; return { label, accelerator: accel(combo), registerAccelerator: false, click: () => press(wc, combo) }; }
      const o = { label: i.label };
      if (i.items) { o.submenu = i.items.map(conv); return o; }
      if (i.when) o.enabled = vals[vi++] !== false;
      if (i.checked) { o.type = "checkbox"; o.checked = vals[vi++] === true; }
      if (i.keys) { o.accelerator = accel(i.keys); o.registerAccelerator = false; }
      o.click = () => (i.js ? run(wc, i.js) : i.keys ? press(wc, i.keys) : null);
      return o;
    };
    const tidy = (l) => { const o = []; for (const i of l) { if (i.type === "separator" && (!o.length || o[o.length - 1].type === "separator")) continue; o.push(i); } while (o.length && o[o.length - 1].type === "separator") o.pop(); return o; };

    const appMenu = [];
    if (SPEC.about) appMenu.push(conv({ label: `About ${NAME}`, ...SPEC.about }), { type: "separator" });
    if (SPEC.prefs) appMenu.push(conv({ label: "Preferences…", ...SPEC.prefs }), { type: "separator" });
    appMenu.push({ label: `Quit ${NAME}`, accelerator: "Ctrl+Q", registerAccelerator: false,
      click: () => (SPEC.quit ? press(wc, SPEC.quit) : app.quit()) });

    let menus = (SPEC.menus || []).map((m) => ({ label: m.label, submenu: m.items.map(conv) }));
    if (st.model) {
      menus = st.model.map(([title, items]) => ({ label: title, submenu: items.map((it, idx) => !it ? { type: "separator" } : {
        label: it[0], enabled: !it[2], ...(it[1] ? { accelerator: accel(it[1]), registerAccelerator: false } : {}),
        ...(it[3] ? { type: "checkbox", checked: true } : {}),
        click: () => run(wc, `const M=${SPEC.model};const it=M&&M[${JSON.stringify(title)}][${idx}];it&&it.run&&it.run()`),
      }) }));
      // the mirrored model comes first; extra spec menus (e.g. View) follow
      menus = [...menus, ...(SPEC.menus || []).filter((m) => !st.model.some(([t]) => t === m.label)).map((m) => ({ label: m.label, submenu: m.items.map(conv) }))];
    }
    // every app gets a working Edit menu
    const edit = menus.find((m) => /^edit$/i.test(m.label));
    const roles = [{ role: "undo", registerAccelerator: false }, { role: "redo", registerAccelerator: false }, { type: "separator" },
      { role: "cut", registerAccelerator: false }, { role: "copy", registerAccelerator: false }, { role: "paste", registerAccelerator: false },
      { role: "selectAll", registerAccelerator: false }];
    if (!edit) menus.splice(menus.findIndex((m) => /^file$/i.test(m.label)) + 1, 0, { label: "Edit", submenu: roles });
    const file = menus.find((m) => /^file$/i.test(m.label));
    if (file && !file.submenu.some((i) => /^close window/i.test(i.label || "")))
      {
      const usesW = JSON.stringify(SPEC.menus || []).includes('"Ctrl+W"');
      file.submenu.push({ type: "separator" }, { label: "Close Window", ...(usesW ? {} : { accelerator: "Ctrl+W", registerAccelerator: false }), click: () => win.close() });
    }
    const windowMenu = { label: "Window", submenu: [
      { label: "Minimize", click: () => win.minimize() },
      { label: "Zoom", click: () => (win.isMaximized() ? win.unmaximize() : win.maximize()) },
      ...(SPEC.fullscreen ? [{ type: "separator" }, { label: "Enter Full Screen", accelerator: accel(SPEC.fullscreen), registerAccelerator: false, click: () => press(wc, SPEC.fullscreen) }] : []),
    ] };
    const template = [{ label: NAME, submenu: tidy(appMenu) }, ...menus.map((m) => ({ ...m, submenu: tidy(m.submenu) })).filter((m) => m.submenu.length), windowMenu];
    const sig = JSON.stringify(template, (k, v) => (typeof v === "function" ? undefined : v));
    if (sig === st.sig) return;
    st.sig = sig;
    state.set(wc.id, st);
    win.setMenu(Menu.buildFromTemplate(template));
    win.setAutoHideMenuBar(true);
    win.setMenuBarVisibility(false);
  }

  async function refresh(win) {
    if (!win || win.isDestroyed()) return;
    const wc = win.webContents;
    if (wc.isLoading()) { try { build(win); } catch {} return; }
    try {
      const [vals, model] = JSON.parse(await wc.executeJavaScript(PROBE, true));
      const st = state.get(wc.id) || {};
      st.vals = vals; st.model = model; state.set(wc.id, st);
    } catch {}
    try { build(win); } catch (e) { console.error("[paladin-menus]", e); }
  }

  function adopt(win) {
    if (!win || win._paladinMenus) return;
    win._paladinMenus = true;
    try { build(win); } catch (e) { console.error("[paladin-menus]", e); }
    const wc = win.webContents;
    wc.on("did-finish-load", () => refresh(win));
    const id = wc.id;
    win.on("closed", () => state.delete(id));
    // Electron hands a menu to the desktop menu bar only once its menu server is up, which is
    // shortly after the window appears: set it again then (and again later, to be sure).
    const again = () => { if (win.isDestroyed()) return; const st = state.get(id); if (st) st.sig = null; refresh(win); };
    win.once("show", () => { setTimeout(again, 300); setTimeout(again, 1500); setTimeout(again, 5000); });
    if (win.isVisible()) { setTimeout(again, 300); setTimeout(again, 1500); setTimeout(again, 5000); }
  }
  app.on("browser-window-created", (_e, win) => setImmediate(() => adopt(win)));
  // keep enabled/checked states current for the window in front (cheap: one small script a second)
  app.whenReady().then(() => {
    BrowserWindow.getAllWindows().forEach(adopt);
    setInterval(() => { const w = BrowserWindow.getFocusedWindow(); if (w && w._paladinMenus) refresh(w); }, 900);
  });
})();

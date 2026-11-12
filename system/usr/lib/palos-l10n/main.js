'use strict';
// palOS translations for an Electron app's main process. Required once, early (before the app is ready):
//   require('/usr/lib/palos-l10n/main.js')
// In French it sets the app's language (dates, numbers, spelling), translates menus and dialog boxes, and
// adds page.js to every page so what the app shows is translated too. In English it does nothing.
const fs = require('fs');
const path = require('path');
const core = require('./core.js');
const DIR = '/usr/share/palos/l10n';
let state = null;

function load(appName) {
  const lang = core.langOf(process.env);
  if (lang === 'en-CA') return { lang, dict: null };
  let all = {};
  try { all = JSON.parse(fs.readFileSync(path.join(DIR, lang + '.json'), 'utf8')); } catch { return { lang, dict: null }; }
  const dict = Object.assign({}, all.strings || {}, (all.apps || {})[appName] || {});
  return { lang, dict, all, name: appName, skip: ((all.skip || {})[appName]) || '', compiled: core.compile(dict) };
}
// apps name themselves (app.setName) after this file is loaded: pick up their own words then
function forApp() {
  const n = require('electron').app.getName();
  if (state && state.all && state.name !== n) {
    const dict = Object.assign({}, state.all.strings || {}, (state.all.apps || {})[n] || {});
    Object.assign(state, { dict, name: n, skip: ((state.all.skip || {})[n]) || '', compiled: core.compile(dict) });
  }
  return state;
}
function tr(s) {
  if (!state || !state.compiled) return s;
  forApp();
  const v = core.translate(state.compiled, s);
  if (v === undefined && process.env.PALOS_L10N_DEBUG && typeof s === 'string' && /[A-Za-z]{2}/.test(s)) { try { fs.appendFileSync(process.env.PALOS_L10N_DEBUG, 'main:' + require('electron').app.getName() + '\t' + JSON.stringify(s.trim()) + '\n'); } catch {} }
  return v === undefined ? s : v;
}
const ROLE = { fileMenu: 'File', editMenu: 'Edit', viewMenu: 'View', windowMenu: 'Window', help: 'Help', appMenu: '', undo: 'Undo', redo: 'Redo',
  cut: 'Cut', copy: 'Copy', paste: 'Paste', pasteAndMatchStyle: 'Paste and Match Style', delete: 'Delete', selectAll: 'Select All', reload: 'Reload',
  forceReload: 'Force Reload', toggleDevTools: 'Toggle Developer Tools', resetZoom: 'Actual Size', zoomIn: 'Zoom In', zoomOut: 'Zoom Out',
  togglefullscreen: 'Toggle Full Screen', minimize: 'Minimize', close: 'Close Window', quit: 'Quit', zoom: 'Zoom', front: 'Bring All to Front',
  about: 'About', hide: 'Hide', hideOthers: 'Hide Others', unhide: 'Show All', services: 'Services' };
function trMenu(items) {
  if (!Array.isArray(items)) return items;
  return items.map((it) => {
    if (!it || typeof it !== 'object') return it;
    const o = Object.assign({}, it);
    if (o.role && !o.label && ROLE[o.role]) o.label = ROLE[o.role];
    for (const k of ['label', 'sublabel', 'toolTip']) if (typeof o[k] === 'string') o[k] = tr(o[k]);
    if (Array.isArray(o.submenu)) o.submenu = trMenu(o.submenu);
    return o;
  });
}
function trDialog(o) {
  if (!o || typeof o !== 'object') return o;
  const r = Object.assign({}, o);
  for (const k of ['title', 'message', 'detail', 'buttonLabel', 'checkboxLabel', 'nameFieldLabel', 'prompt']) if (typeof r[k] === 'string') r[k] = tr(r[k]);
  if (Array.isArray(r.buttons)) r.buttons = r.buttons.map(tr);
  if (Array.isArray(r.filters)) r.filters = r.filters.map((f) => (f && f.name ? Object.assign({}, f, { name: tr(f.name) }) : f));
  return r;
}

function setup() {
  if (global.__palosL10n || process.type !== 'browser') return;
  global.__palosL10n = true;
  const electron = require('electron');
  const { app, Menu, dialog, ipcMain, session } = electron;
  state = load(app.getName());
  if (!state.dict) { module.exports.lang = state.lang; return; }
  try { app.commandLine.appendSwitch('lang', 'fr-CA'); } catch {}
  const coreSrc = fs.readFileSync(path.join(__dirname, 'core.js'), 'utf8');
  const debug = !!process.env.PALOS_L10N_DEBUG;
  // the app's own pages (anywhere inside its .app or its unpacked copy) are translated; other files it shows aren't
  const roots = () => { const r = ['/opt/', '/usr/']; try { r.push(app.getAppPath()); } catch {} if (process.resourcesPath) r.push(process.resourcesPath); if (process.env.PALOS_APP) r.push(process.env.PALOS_APP); if (process.env.PALOS_APP_DIR) r.push(process.env.PALOS_APP_DIR); return r.filter(Boolean).map((x) => x.replace(/\/?$/, '/')); };
  ipcMain.on('palos-l10n:dict', (e) => { forApp(); e.returnValue = { dict: state.dict, core: coreSrc, skip: state.skip, debug, roots: roots() }; });
  if (debug) ipcMain.on('palos-l10n:miss', (e, list) => { try { fs.appendFileSync(process.env.PALOS_L10N_DEBUG, list.map((x) => app.getName() + '\t' + JSON.stringify(x)).join('\n') + '\n'); } catch {} });
  // menus
  const build = Menu.buildFromTemplate.bind(Menu);
  Menu.buildFromTemplate = (t) => build(trMenu(t));
  // menus put together item by item (new Menu(), menu.append(new MenuItem(...)))
  const trItem = (mi) => {
    try {
      if (!mi.__palosL10n) { mi.__palosL10n = true; if (typeof mi.label === 'string' && mi.label) mi.label = tr(mi.label); else if (mi.role && ROLE[mi.role.replace(/^(.)/, (x) => x.toLowerCase())]) mi.label = tr(ROLE[mi.role.replace(/^(.)/, (x) => x.toLowerCase())]); if (typeof mi.sublabel === 'string') mi.sublabel = tr(mi.sublabel); }
      if (mi.submenu) for (const x of mi.submenu.items) trItem(x);
    } catch {}
  };
  for (const f of ['append', 'insert']) {
    const o = Menu.prototype[f];
    Menu.prototype[f] = function (...a) { const mi = f === 'append' ? a[0] : a[1]; if (mi) trItem(mi); return o.apply(this, a); };
  }
  const setApp = Menu.setApplicationMenu.bind(Menu);
  Menu.setApplicationMenu = (m) => { try { if (m) for (const x of m.items) trItem(x); } catch {} return setApp(m); };
  // dialogs (also when sheets handle them: dialog-hook.js wraps after this)
  for (const f of ['showMessageBox', 'showMessageBoxSync', 'showOpenDialog', 'showOpenDialogSync', 'showSaveDialog', 'showSaveDialogSync']) {
    const o = dialog[f]; if (typeof o !== 'function') continue;
    dialog[f] = function (a, b) { return (b !== undefined || (a && typeof a.isDestroyed === 'function')) ? o.call(dialog, a, trDialog(b)) : o.call(dialog, trDialog(a)); };
  }
  if (typeof dialog.showErrorBox === 'function') { const e = dialog.showErrorBox; dialog.showErrorBox = (t, c) => e.call(dialog, tr(t), tr(c)); }
  // every page gets page.js
  const preload = path.join(__dirname, 'page.js');
  const add = (ses) => {
    try {
      if (typeof ses.registerPreloadScript === 'function') ses.registerPreloadScript({ type: 'frame', id: 'palos-l10n', filePath: preload });
      else ses.setPreloads([...ses.getPreloads(), preload]);
    } catch {}
  };
  const hook = () => { add(session.defaultSession); app.on('session-created', add); };
  if (app.isReady()) hook(); else app.once('ready', hook);
  // window titles set from the main process
  app.on('browser-window-created', (_, w) => { w.on('page-title-updated', (ev, t) => { const v = tr(t); if (v !== t) { ev.preventDefault(); w.setTitle(v); } }); });
}
setup();
module.exports = { tr, trMenu, trDialog, get lang() { return state ? state.lang : core.langOf(process.env); } };

'use strict';
// Panels for this app: sheets that slide out of the top of the window (from Seeker's sheet engine),
// or the system's own dialogs if that isn't installed.
const { dialog } = require('electron');
let S = null;
try { S = require('/opt/paladin-seeker/app/main/sheet.js'); } catch { S = null; }
const native = (fn, win, opts) => (win && !win.isDestroyed() ? dialog[fn](win, opts) : dialog[fn](opts));
module.exports = {
  message: (w, o) => (S ? S.message(w, o) : native('showMessageBox', w, o)),
  open: (w, o) => (S ? S.open(w, o) : native('showOpenDialog', w, o)),
  save: (w, o) => (S ? S.save(w, o) : native('showSaveDialog', w, o)),
  prompt: (w, o) => (S ? S.prompt(w, o) : Promise.resolve(null)),
};

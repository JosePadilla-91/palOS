'use strict';
// Tiny JSON persistence for settings, the recents library, and resume positions.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  resume: true,
  fitWindow: true, // classic player-style: window snaps to the film's aspect ratio
  subtitleSize: 'medium',
  conversion: 'veryfast', // x264 preset for live conversion
  volume: 1,
};

const dir = () => app.getPath('userData');
const file = (n) => path.join(dir(), n);

function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return fallback; }
}
const timers = {};
function writeJson(name, data) {
  clearTimeout(timers[name]);
  timers[name] = setTimeout(() => {
    try {
      fs.mkdirSync(dir(), { recursive: true });
      const tmp = file(`${name}.tmp`);
      fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
      fs.renameSync(tmp, file(name));
    } catch (e) { console.error('store write failed', e); }
  }, 250);
}

let settings = null;
let library = null;

function getSettings() {
  if (!settings) settings = { ...DEFAULTS, ...readJson('settings.json', {}) };
  return settings;
}
function setSettings(patch) {
  settings = { ...getSettings(), ...patch };
  writeJson('settings.json', settings);
  return settings;
}

function lib() {
  if (!library) library = readJson('library.json', { recents: [] });
  return library;
}
function recents() {
  return lib().recents.filter((r) => {
    try { fs.accessSync(r.target.path); return true; } catch { return false; }
  });
}
function touchRecent(entry) {
  const l = lib();
  const old = l.recents.find((r) => r.key === entry.key) || {};
  l.recents = [{ ...old, ...entry, openedAt: Date.now() }, ...l.recents.filter((r) => r.key !== entry.key)].slice(0, 40);
  writeJson('library.json', l);
}
function savePosition(key, position, duration, extra = {}) {
  const l = lib();
  const r = l.recents.find((x) => x.key === key);
  if (!r) return;
  r.position = position;
  if (duration) r.duration = duration;
  Object.assign(r, extra);
  writeJson('library.json', l);
}
function getRecent(key) { return lib().recents.find((r) => r.key === key) || null; }
function removeRecent(key) {
  const l = lib();
  l.recents = key ? l.recents.filter((r) => r.key !== key) : [];
  writeJson('library.json', l);
}
function posterDir() {
  const p = file('posters');
  fs.mkdirSync(p, { recursive: true });
  return p;
}

module.exports = { getSettings, setSettings, recents, touchRecent, savePosition, getRecent, removeRecent, posterDir, DEFAULTS };

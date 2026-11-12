'use strict';
// "Screens": the separate desktops you switch between (paladin-wm's viewports), up to 16, two by default.
// They are laid out as a grid; the menu bar shows that grid with the current screen shaded.
const { screen, Menu } = require('electron');
const { spawn, execFile } = require('child_process');
const x11 = require('./x11');

const MAX = 16;
// Counts that form a complete grid. Each entry is [count, columns, rows].
const LAYOUTS = [[1, 1, 1], [2, 2, 1], [3, 3, 1], [4, 2, 2], [6, 3, 2], [8, 4, 2], [9, 3, 3], [12, 4, 3], [16, 4, 4]];
const PROFILE = 'org.palos.screens';     // palOS's own setting (paladin-wm reads it)

function layoutFor(count) {
  return LAYOUTS.find((l) => l[0] === count) || LAYOUTS.find((l) => l[0] >= count) || LAYOUTS[LAYOUTS.length - 1];
}

/** Size of one screen in real pixels (all monitors together, like the X screen). */
function oneScreenPx() {
  let w = 0, h = 0;
  for (const d of screen.getAllDisplays()) {
    const f = d.scaleFactor || 1;
    w = Math.max(w, Math.round((d.bounds.x + d.bounds.width) * f));
    h = Math.max(h, Math.round((d.bounds.y + d.bounds.height) * f));
  }
  return { w: w || 1, h: h || 1 };
}

// How many screens there are comes from palOS's setting (hsize × vsize), not from dividing the desktop's
// size by the monitor's: those two disagree for a moment whenever the resolution or the monitors change
// (a third screen used to "appear" that way). The pixels are only used to tell which screen you're on.
let grid = null;            // { cols, rows } from the setting
function readGrid() {
  try {
    const { execFileSync } = require('child_process');
    const get = (k) => parseInt(String(execFileSync('gsettings', ['get', PROFILE, k], { timeout: 3000 })).trim(), 10);
    const cols = get('hsize'), rows = get('vsize');
    if (cols >= 1 && rows >= 1 && cols * rows <= MAX) grid = { cols, rows };
  } catch { /* no setting yet: the pixels decide */ }
}
readGrid();
let onGrid = null;
try {
  const mon = spawn('gsettings', ['monitor', PROFILE], { stdio: ['ignore', 'pipe', 'ignore'] });
  mon.stdout.on('data', (d) => { if (/hsize|vsize/.test(String(d))) { readGrid(); if (onGrid) onGrid(); } });
  mon.on('error', () => {});
} catch {}

/** { cols, rows, count, index } */
function state() {
  const g = x11.geometry, v = x11.viewport || [0, 0];
  const one = oneScreenPx();
  const cols = grid ? grid.cols : g ? Math.max(1, Math.round(g[0] / one.w)) : 1;
  const rows = grid ? grid.rows : g ? Math.max(1, Math.round(g[1] / one.h)) : 1;
  // one screen's size as the window manager sees it (the whole desktop divided by the grid)
  const sw = g ? g[0] / cols : one.w, sh = g ? g[1] / rows : one.h;
  const cx = Math.min(cols - 1, Math.max(0, Math.round((v[0] || 0) / sw)));
  const cy = Math.min(rows - 1, Math.max(0, Math.round((v[1] || 0) / sh)));
  return { cols, rows, count: cols * rows, index: cy * cols + cx };
}

function go(index) {
  const s = state(); const g = x11.geometry; const one = oneScreenPx();
  const sw = g ? g[0] / s.cols : one.w, sh = g ? g[1] / s.rows : one.h;
  const i = Math.max(0, Math.min(s.count - 1, index | 0));
  const x = Math.round((i % s.cols) * sw), y = Math.round(Math.floor(i / s.cols) * sh);
  execFile('xdotool', ['set_desktop_viewport', String(x), String(y)], () => {});
}

/** Change how many screens there are (palOS's setting, so it also lasts across log-ins). */
function setCount(count) {
  const [, cols, rows] = layoutFor(Math.max(1, Math.min(MAX, count | 0)));
  for (const [key, val] of [['hsize', cols], ['vsize', rows]]) {
    const p = spawn('gsettings', ['set', PROFILE, key, String(val)], { stdio: 'ignore' });
    p.on('error', () => {});
  }
}

function popupMenu(win) {
  const cur = state().count;
  const tpl = [{ label: 'Number of Screens', enabled: false }, { type: 'separator' }];
  for (const [n] of LAYOUTS) tpl.push({ label: String(n), type: 'radio', checked: n === cur, click: () => setCount(n) });
  Menu.buildFromTemplate(tpl).popup({ window: win });
}

module.exports = { state, go, setCount, popupMenu, LAYOUTS, onChange: (fn) => { onGrid = fn; } };

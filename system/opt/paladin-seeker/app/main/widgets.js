'use strict';
// Widgets: a layer you bring up from the menu bar. The screen recedes and dims a little, and the widgets sit on
// top of it. Widgets (clock, weather, stopwatch, sticky notes, calendar) are added with the + button and can be
// moved around; where they are, and what is in them, is remembered.
const { BrowserWindow, screen, desktopCapturer, ipcMain, net } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FILE = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'paladin-seeker', 'widgets.json');
const MAX_BYTES = 2 * 1024 * 1024;
let win = null, ready = false, open = false, ctx = null, busy = false;

// ---------- saved widgets
function load() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { items: Array.isArray(j.items) ? j.items.filter((i) => i && typeof i.type === 'string').slice(0, 60) : [], events: j.events && typeof j.events === 'object' ? j.events : {} };
  } catch { return { items: [], events: {} }; }
}
function save(data) {
  if (!data || !Array.isArray(data.items)) return false;
  const text = JSON.stringify({ version: 1, items: data.items.slice(0, 60), events: data.events && typeof data.events === 'object' ? data.events : {} });
  if (text.length > MAX_BYTES) return false;
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); const t = FILE + '.tmp'; fs.writeFileSync(t, text); fs.renameSync(t, FILE); return true; } catch { return false; }
}

// ---------- weather (Open-Meteo: no account or key)
async function getJSON(url, ms = 8000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await net.fetch(url, { signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); }
}
// "Toronto", "Toronto, Ontario", "Paris, France", "London ON": the city is looked up, the rest narrows it down
async function geocode(q) {
  q = String(q || '').trim().slice(0, 80); if (!q) return [];
  const parts = q.split(/\s*,\s*/).filter(Boolean);
  const city = parts[0], rest = parts.slice(1).join(' ').toLowerCase();
  const lang = (/^([a-z]{2})/i.exec(process.env.LANGUAGE || process.env.LANG || 'en') || [, 'en'])[1].toLowerCase();
  const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=20&language=${lang}&format=json`);
  let out = (j.results || []).map((r) => ({ name: r.name, region: r.admin1 || '', country: r.country || '', code: (r.country_code || '').toLowerCase(), lat: r.latitude, lon: r.longitude, pop: r.population || 0 }));
  if (rest) {
    const words = rest.split(/\s+/).filter(Boolean);
    const fits = (x) => words.every((w) => [x.region, x.country, x.code].some((f) => String(f).toLowerCase().startsWith(w) || String(f).toLowerCase().includes(' ' + w)));
    const narrowed = out.filter(fits);
    if (narrowed.length) out = narrowed;
  }
  return out.slice(0, 8);
}
function parseWeather(j) {
  const c = j && j.current, d = j && j.daily;
  if (!c || !d || !Array.isArray(d.time)) throw new Error('unexpected weather data');
  return {
    now: { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), code: c.weather_code, day: c.is_day === 1, wind: Math.round(c.wind_speed_10m) },
    days: d.time.map((t, i) => ({ date: t, code: d.weather_code[i], hi: Math.round(d.temperature_2m_max[i]), lo: Math.round(d.temperature_2m_min[i]) })),
    fetched: Date.now(),
  };
}
async function weather({ lat, lon, unit }) {
  lat = Number(lat); lon = Number(lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('bad location');
  const f = unit === 'F';
  const j = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4&temperature_unit=${f ? 'fahrenheit' : 'celsius'}&wind_speed_unit=${f ? 'mph' : 'kmh'}`);
  return parseWeather(j);
}

// ---------- the layer
function area() { const d = screen.getPrimaryDisplay(); const b = d.bounds; return { d, x: b.x, y: b.y + ctx.barHeight, width: b.width, height: b.height - ctx.barHeight }; }

async function capture() {
  try {
    const d = screen.getPrimaryDisplay(); const f = d.scaleFactor || 1;
    const srcs = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.round(d.bounds.width * f), height: Math.round(d.bounds.height * f) } });
    const s = srcs.find((x) => String(x.display_id) === String(d.id)) || srcs[0];
    if (!s || s.thumbnail.isEmpty()) return null;
    return 'data:image/jpeg;base64,' + s.thumbnail.toJPEG(82).toString('base64');
  } catch (err) { console.error('[widgets] capture:', err.message); return null; }
}

function ensureWindow() {
  if (win && !win.isDestroyed()) return win;
  const a = area();
  win = new BrowserWindow({
    x: a.x, y: a.y, width: a.width, height: a.height, type: 'dock', frame: false, resizable: false, movable: false, minimizable: false, maximizable: false,
    skipTaskbar: true, alwaysOnTop: true, hasShadow: false, show: false, focusable: true, title: 'Seeker Widgets', backgroundColor: '#0b0f1a',
    webPreferences: ctx.webPrefs({ backgroundThrottling: false }),
  });
  ready = false;
  win.setVisibleOnAllWorkspaces(true);
  win.loadFile(path.join(ctx.ui, 'widgets.html'));
  win.webContents.once('did-finish-load', () => { ready = true; });
  win.on('closed', () => { win = null; ready = false; open = false; tell(); });
  win.webContents.on('render-process-gone', () => { try { if (win && !win.isDestroyed()) win.destroy(); } catch {} win = null; open = false; tell(); });
  return win;
}

function tell() { const mb = ctx.menubar(); if (mb && !mb.isDestroyed()) mb.webContents.send('widgets:state', open); }

async function show() {
  if (busy || open) return; busy = true;
  try {
    const shot = await capture();                 // before the layer covers the screen
    const w = ensureWindow(); const a = area();
    w.setBounds({ x: a.x, y: a.y, width: a.width, height: a.height });
    for (let i = 0; i < 60 && !ready; i++) await new Promise((r) => setTimeout(r, 50));
    open = true;
    w.show(); w.focus();
    const mb = ctx.menubar(); if (mb && !mb.isDestroyed()) mb.moveTop();   // the menu bar stays above the layer
    w.webContents.send('widgets:show', { shot, width: a.d.bounds.width, height: a.d.bounds.height, barHeight: ctx.barHeight });
    tell();
  } finally { busy = false; }
}
function hide() { if (!open || !win || win.isDestroyed()) return; win.webContents.send('widgets:hide'); }
function toggle() { if (open) hide(); else show(); }

function init(c) {
  ctx = c;
  ipcMain.on('widgets:toggle', toggle);
  ipcMain.on('widgets:hidden', () => { open = false; if (win && !win.isDestroyed()) win.hide(); tell(); });
  ipcMain.handle('widgets:load', () => load());
  ipcMain.handle('widgets:save', (e, data) => save(data));
  ipcMain.handle('widgets:geocode', async (e, q) => { try { return { results: await geocode(q) }; } catch { return { error: 'offline' }; } });
  ipcMain.handle('widgets:weather', async (e, p) => { try { return { data: await weather(p || {}) }; } catch { return { error: 'offline' }; } });
}

module.exports = { init, toggle, show, hide, parseWeather, load, save, FILE };

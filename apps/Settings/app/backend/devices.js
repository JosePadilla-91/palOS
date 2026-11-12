'use strict';
// Displays (xrandr) and Sound (pactl, which PipeWire also provides).
const { run, out, which, gget, gset } = require('./util');

// ---------------------------------------------------------------- displays
async function displays() {
  if (!which('xrandr')) return { available: false, outputs: [] };
  const text = await out('xrandr', ['--query']);
  const outputs = [];
  let cur = null;
  for (const line of text.split('\n')) {
    let m = line.match(/^(\S+) (connected|disconnected)( primary)?(?: (\d+)x(\d+)\+(-?\d+)\+(-?\d+))?(?: (normal|left|inverted|right))?/);
    if (m) {
      cur = { name: m[1], connected: m[2] === 'connected', primary: !!m[3], active: !!m[4], width: +m[4] || 0, height: +m[5] || 0,
        x: +m[6] || 0, y: +m[7] || 0, rotation: m[8] || 'normal', modes: [] };
      const mm = line.match(/(\d+)mm x (\d+)mm/);
      if (mm) { cur.mmWidth = +mm[1]; cur.mmHeight = +mm[2]; }
      outputs.push(cur);
      continue;
    }
    m = line.match(/^\s+(\d+)x(\d+)i?\s+(.*)$/);
    if (m && cur) {
      const rates = [];
      for (const r of m[3].matchAll(/([\d.]+)([ *])?([ +])?/g)) {
        if (!r[1] || !(parseFloat(r[1]) > 0)) continue;     // virtual screens report 0 Hz
        rates.push({ rate: r[1], current: r[2] === '*', preferred: r[3] === '+' });
      }
      cur.modes.push({ width: +m[1], height: +m[2], rates });
    }
  }
  const list = outputs.filter((o) => o.connected).map((o) => {
    const curMode = o.modes.find((md) => md.rates.some((r) => r.current));
    const curRate = curMode ? curMode.rates.find((r) => r.current).rate : '';
    const pref = o.modes.find((md) => md.rates.some((r) => r.preferred));
    return {
      name: o.name, primary: o.primary, active: o.active, x: o.x, y: o.y, rotation: o.rotation,
      mode: o.active ? `${o.width}x${o.height}` : '', rate: curRate,
      preferred: pref ? `${pref.width}x${pref.height}` : '',
      modes: dedupe(o.modes).map((md) => ({ id: `${md.width}x${md.height}`, width: md.width, height: md.height, rates: md.rates.map((r) => r.rate) })),
      label: friendly(o.name),
    };
  });
  return { available: true, outputs: list, mirrored: list.length > 1 && list.every((o) => o.x === list[0].x && o.y === list[0].y) };
}

function dedupe(modes) { const seen = new Set(); return modes.filter((m) => { const k = `${m.width}x${m.height}`; if (seen.has(k)) return false; seen.add(k); return true; }); }
function friendly(name) {
  if (/^(eDP|LVDS|DSI)/i.test(name)) return 'Built-in Display';
  if (/^HDMI/i.test(name)) return 'HDMI Display';
  if (/^(DP|DisplayPort)/i.test(name)) return 'DisplayPort Display';
  if (/^(VGA|DVI)/i.test(name)) return name.replace(/-.*/, '') + ' Display';
  return name;
}

/** Apply a list of {name, mode, rate, rotation, primary, enabled, x, y}. */
async function applyDisplays(list) {
  const args = [];
  for (const o of list) {
    args.push('--output', o.name);
    if (o.enabled === false) { args.push('--off'); continue; }
    if (o.mode) args.push('--mode', o.mode); else args.push('--auto');
    if (o.rate) args.push('--rate', String(o.rate));
    args.push('--rotate', o.rotation || 'normal');
    if (o.x != null && o.y != null) args.push('--pos', `${o.x}x${o.y}`);
    if (o.primary) args.push('--primary');
  }
  const r = await run('xrandr', args, { timeout: 20000 });
  return { ok: r.ok, error: r.ok ? null : r.err.trim(), now: await displays() };
}

// ---------------------------------------------------------------- sound
async function pactlJSON(what) {
  const r = await run('pactl', ['-f', 'json', 'list', what], { timeout: 6000 });
  try { return r.ok ? JSON.parse(r.out) : []; } catch { return []; }
}
function vol(v) {
  if (!v) return 0;
  const ch = Object.values(v);
  if (!ch.length) return 0;
  const pct = ch.map((c) => parseInt(String(c.value_percent || '0'), 10) || 0);
  return Math.round(pct.reduce((a, b) => a + b, 0) / pct.length);
}
async function sound() {
  if (!which('pactl')) return { available: false };
  const info = await run('pactl', ['-f', 'json', 'info'], { timeout: 5000 });
  let def = {};
  try { def = JSON.parse(info.out); } catch {}
  const sinks = (await pactlJSON('sinks')).map((s) => ({ name: s.name, label: s.description || s.name, volume: vol(s.volume), muted: !!s.mute }));
  const sources = (await pactlJSON('sources')).filter((s) => !/\.monitor$/.test(s.name) && s.monitor_of_sink == null)
    .map((s) => ({ name: s.name, label: s.description || s.name, volume: vol(s.volume), muted: !!s.mute }));
  return {
    available: info.ok, sinks, sources, defaultSink: def.default_sink_name || '', defaultSource: def.default_source_name || '',
    alerts: (await gget('org.gnome.desktop.sound', 'event-sounds')) !== false,
    effects: (await gget('org.gnome.desktop.sound', 'input-feedback-sounds')) === true,
  };
}
async function soundSet(kind, op, name, value) {
  // the person changed it: palos-volume-keeper keeps it (and undoes changes the computer makes on its own)
  if (kind !== 'source' && op !== 'default') { try { require('fs').writeFileSync(require('path').join(process.env.XDG_RUNTIME_DIR || '/tmp', 'palos-volume-user'), String(Date.now())); } catch {} }
  const dev = kind === 'source' ? 'source' : 'sink';
  if (op === 'default') await run('pactl', [`set-default-${dev}`, name]);
  if (op === 'volume') await run('pactl', [`set-${dev}-volume`, name, `${Math.max(0, Math.min(150, Math.round(value)))}%`]);
  if (op === 'mute') await run('pactl', [`set-${dev}-mute`, name, value ? '1' : '0']);
  return sound();
}
async function setAlerts(on) { await gset('org.gnome.desktop.sound', 'event-sounds', !!on); return sound(); }
/** palOS interface sound effects: emptying the Trash, removing a Dock item, changing the volume */
async function setEffects(on) {
  await gset('org.gnome.desktop.sound', 'input-feedback-sounds', !!on);
  if (on) run('palos-sound', ['trash']);
  return sound();
}
function testSound() {
  for (const f of ['/usr/share/sounds/palos/stereo/volume.oga', '/usr/share/sounds/freedesktop/stereo/audio-volume-change.oga', '/usr/share/sounds/freedesktop/stereo/bell.oga']) {
    if (require('fs').existsSync(f)) { run(which('paplay') ? 'paplay' : 'pw-play', [f]); return true; }
  }
  return false;
}

// ---------------------------------------------------------------- keyboard
const KB = 'org.gnome.desktop.peripherals.keyboard';
async function keyboard() {
  const n = await gget(KB, 'numlock-state');
  return { numlock: n !== false, numlockx: !!which('numlockx') };
}
async function setNumlock(on) {
  await gset(KB, 'numlock-state', !!on);
  if (which('numlockx')) await run('numlockx', [on ? 'on' : 'off']);
  return keyboard();
}

// ---------------------------------------------------------------- trackpad
// The settings live in ~/.config/palos/trackpad.json; paladin-trackpad (running in the session) applies them to
// every touchpad and turns gestures into actions. Saving here applies them at once.
const fs = require('fs');
const os = require('os');
const path = require('path');
const TP_FILE = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'palos', 'trackpad.json');
const TP_TOOL = '/usr/lib/paladin-gestures/paladin-trackpad';
const TP_DEFAULTS = { tapToClick: true, secondaryClick: 'two-fingers', naturalScrolling: true, speed: 0, disableWhileTyping: true,
  pinchZoom: true, rotate: true, swipeBackForward: true, swipeScreens: true, overview: true };
async function trackpad() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(TP_FILE, 'utf8')); } catch {}
  const s = { ...TP_DEFAULTS };
  for (const k of Object.keys(TP_DEFAULTS)) if (saved[k] !== undefined && typeof saved[k] === typeof TP_DEFAULTS[k]) s[k] = saved[k];
  // is there a touchpad? (libinput devices that can tap)
  let present = false;
  if (which('xinput')) {
    const ids = (await out('xinput', ['list', '--id-only'])).split(/\s+/).filter(Boolean);
    for (const id of ids) { if ((await out('xinput', ['list-props', id])).includes('libinput Tapping Enabled (')) { present = true; break; } }
  }
  const gestures = (await run('systemctl', ['is-active', '--quiet', 'paladin-gestured.service'])).ok;
  return { settings: s, present, gestures };
}
async function setTrackpad(patch) {
  const cur = (await trackpad()).settings;
  for (const [k, v] of Object.entries(patch || {})) if (k in TP_DEFAULTS && typeof v === typeof TP_DEFAULTS[k]) cur[k] = v;
  if (typeof cur.speed === 'number') cur.speed = Math.max(-1, Math.min(1, cur.speed));
  if (!['two-fingers', 'corner'].includes(cur.secondaryClick)) cur.secondaryClick = 'two-fingers';
  fs.mkdirSync(path.dirname(TP_FILE), { recursive: true });
  fs.writeFileSync(TP_FILE + '.tmp', JSON.stringify(cur, null, 2) + '\n');
  fs.renameSync(TP_FILE + '.tmp', TP_FILE);
  if (fs.existsSync(TP_TOOL)) await run('/usr/bin/python3', [TP_TOOL, 'apply'], { timeout: 15000 });
  return trackpad();
}


// ---------------------------------------------------------------- mouse
// ~/.config/palos/mouse.json: speed, acceleration, primary button, double-click speed. Scroll direction is shared
// with the trackpad (trackpad.json naturalScrolling), so every mouse, trackpad and app scrolls the same way.
const MOUSE_FILE = path.join(path.dirname(TP_FILE), 'mouse.json');
const MOUSE_DEFAULTS = { speed: 0, acceleration: true, primary: 'left', doubleClick: 400 };
async function mouse() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(MOUSE_FILE, 'utf8')); } catch {}
  const s = { ...MOUSE_DEFAULTS };
  for (const k of Object.keys(MOUSE_DEFAULTS)) if (saved[k] !== undefined && typeof saved[k] === typeof MOUSE_DEFAULTS[k]) s[k] = saved[k];
  s.naturalScrolling = (await trackpad()).settings.naturalScrolling;
  let present = false;
  if (which('xinput')) {
    const ids = (await out('xinput', ['list', '--id-only'])).split(/\s+/).filter(Boolean);
    for (const id of ids) { const pr = await out('xinput', ['list-props', id]); if (!pr.includes('libinput Tapping Enabled (') && pr.includes('libinput Left Handed Enabled (')) { present = true; break; } }
  }
  return { settings: s, present };
}
async function setMouse(patch) {
  patch = patch || {};
  if (typeof patch.naturalScrolling === 'boolean') await setTrackpad({ naturalScrolling: patch.naturalScrolling });
  const cur = (await mouse()).settings;
  delete cur.naturalScrolling;
  for (const [k, v] of Object.entries(patch)) if (k in MOUSE_DEFAULTS && typeof v === typeof MOUSE_DEFAULTS[k]) cur[k] = v;
  cur.speed = Math.max(-1, Math.min(1, Number(cur.speed) || 0));
  cur.doubleClick = Math.max(150, Math.min(1500, Math.round(Number(cur.doubleClick) || 400)));
  if (!['left', 'right'].includes(cur.primary)) cur.primary = 'left';
  fs.mkdirSync(path.dirname(MOUSE_FILE), { recursive: true });
  fs.writeFileSync(MOUSE_FILE + '.tmp', JSON.stringify(cur, null, 2) + '\n');
  fs.renameSync(MOUSE_FILE + '.tmp', MOUSE_FILE);
  if (fs.existsSync(TP_TOOL)) await run('/usr/bin/python3', [TP_TOOL, 'apply'], { timeout: 15000 });
  return mouse();
}

// ---------------------------------------------------------------- scale (how big everything is drawn)
// One scale for the whole session (X11): Xft.dpi tells Chromium/Electron and GTK apps, PALOS_SCALE tells
// Kibble apps. Saved in ~/.config/palos/display.json with the display layout, put back at every log-in.
const fsx = require('fs');
const CONF = path.join(process.env.XDG_CONFIG_HOME || path.join(require('os').homedir(), '.config'), 'palos', 'display.json');
const SCALES = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];
function readConf() { try { return JSON.parse(fsx.readFileSync(CONF, 'utf8')); } catch { return {}; } }
function writeConf(c) { fsx.mkdirSync(path.dirname(CONF), { recursive: true }); fsx.writeFileSync(CONF, JSON.stringify(c, null, 1)); }

async function scaleGet() {
  const c = readConf();
  let now = Number(c.scale) || 0;
  if (!now) { const m = (await out('xrdb', ['-query'])).match(/Xft\.dpi:\s*([\d.]+)/); now = m ? Math.round(parseFloat(m[1]) / 96 * 4) / 4 : 1; }
  const d = await displays();
  const main = (d.outputs || []).find((o) => o.primary) || (d.outputs || [])[0];
  let rec = 1, dpi = 0;
  if (main && main.mode) {
    const raw = await out('xrandr', ['--query']);
    const mm = raw.match(new RegExp('^' + main.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' .*?(\\d+)mm x (\\d+)mm', 'm'));
    const w = +main.mode.split('x')[0];
    if (mm && +mm[1] > 0) dpi = w / (+mm[1] / 25.4);
    // a bit less for big screens you sit back from; laptops (built-in) get the full amount
    const builtIn = /^(eDP|LVDS|DSI)/i.test(main.name);
    const eff = builtIn ? dpi : dpi * 0.9;
    rec = eff >= 230 ? 2.5 : eff >= 190 ? 2 : eff >= 165 ? 1.75 : eff >= 140 ? 1.5 : eff >= 118 ? 1.25 : 1;
  }
  return { scale: now, recommended: rec, dpi: Math.round(dpi), choices: SCALES };
}

async function scaleSet(scale) {
  scale = SCALES.reduce((b, x) => Math.abs(x - scale) < Math.abs(b - scale) ? x : b, 1);
  const dpi = Math.round(96 * scale);
  const xr = `Xft.dpi: ${dpi}\nXcursor.size: ${Math.round(24 * scale)}\n`;
  const r = await run('sh', ['-c', `printf '${xr}' | xrdb -merge`]);
  try { await gset('org.gnome.desktop.interface', 'cursor-size', String(Math.round(24 * scale))); } catch {}
  const c = readConf(); c.scale = scale; writeConf(c);
  return { ok: r.ok, scale };
}

/** remember the layout the person kept, so the next log-in starts with it */
function saveLayout(plan) { const c = readConf(); c.layout = plan; writeConf(c); return { ok: true }; }

module.exports = { scaleGet, scaleSet, saveLayout, displays, applyDisplays, sound, soundSet, setAlerts, setEffects, testSound, keyboard, setNumlock, trackpad, setTrackpad, mouse, setMouse };

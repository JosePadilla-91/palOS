'use strict';
// Accessibility: the Screen Reader (palos-screen-reader) and the Accessibility Keyboard.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { run, gget } = require('./util');

const CONF = path.join(process.env.XDG_CONFIG_HOME || path.join(require('os').homedir(), '.config'), 'palos', 'screen-reader.json');
const DEF = { rate: 10, echo: 'characters' };
function readConf() { try { return Object.assign({}, DEF, JSON.parse(fs.readFileSync(CONF, 'utf8'))); } catch { return Object.assign({}, DEF); } }

async function get() {
  const on = String(await gget('org.gnome.desktop.a11y.applications', 'screen-reader-enabled')).trim() === 'true';
  return Object.assign({ reader: on }, readConf());
}
async function setReader(on) {
  await run('/usr/bin/palos-screen-reader', [on ? '--on' : '--off']);
  return get();
}
async function setVoice(v) {
  const c = readConf();
  if (v.rate != null) c.rate = Math.max(-80, Math.min(90, Number(v.rate) || 0));
  if (v.echo) c.echo = ['characters', 'words', 'off'].includes(v.echo) ? v.echo : 'characters';
  fs.mkdirSync(path.dirname(CONF), { recursive: true });
  fs.writeFileSync(CONF, JSON.stringify(c));
  await run('/usr/bin/palos-screen-reader', ['--cmd', 'reload']);
  return get();
}
function keyboard() { try { spawn('palos-keyboard', [], { detached: true, stdio: 'ignore' }).unref(); } catch {} return true; }
function sample() { return run('/usr/bin/palos-screen-reader', ['--cmd', 'time']); }

module.exports = { get, setReader, setVoice, keyboard, sample };

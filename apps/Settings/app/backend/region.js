'use strict';
// Language & Region: this account's language (menus and apps), its formats (dates, numbers, money,
// paper) and keyboard layout. Saved in ~/.config/palos/locale.conf, which the session reads at login,
// and told to the login screen (AccountsService) so it greets you in your language.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, execFileSync } = require('child_process');

const CONF = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'palos', 'locale.conf');

const LANGUAGES = [
  { id: 'en-CA', name: 'English (Canada)', native: 'English (Canada)', locale: 'en_CA.UTF-8', language: 'en_CA:en' },
  { id: 'fr-CA', name: 'French (Canada)', native: 'Français (Canada)', locale: 'fr_CA.UTF-8', language: 'fr_CA:fr' },
];
// region -> the formats locale for each language (falls back to the first one listed)
const REGIONS = [
  { id: 'CA', name: 'Canada', en: 'en_CA.UTF-8', fr: 'fr_CA.UTF-8' },
  { id: 'US', name: 'United States', en: 'en_US.UTF-8' },
  { id: 'GB', name: 'United Kingdom', en: 'en_GB.UTF-8' },
  { id: 'FR', name: 'France', fr: 'fr_FR.UTF-8' },
  { id: 'BE', name: 'Belgium', fr: 'fr_BE.UTF-8' },
  { id: 'CH', name: 'Switzerland', fr: 'fr_CH.UTF-8' },
  { id: 'LU', name: 'Luxembourg', fr: 'fr_LU.UTF-8' },
];
const KEYBOARDS = [
  { id: 'us', name: 'English (US, accents on Right Alt)', layout: 'palos', variant: '' },
  { id: 'us-plain', name: 'English (US)', layout: 'us', variant: '' },
  { id: 'ca-eng', name: 'English (Canada, accents on Right Alt)', layout: 'palos', variant: '' },
  { id: 'ca', name: 'Canadian French', layout: 'ca', variant: 'fr' },
  { id: 'ca-multix', name: 'Canadian Multilingual', layout: 'ca', variant: 'multix' },
  { id: 'fr', name: 'French (France, AZERTY)', layout: 'fr', variant: '' },
  { id: 'ch-fr', name: 'French (Switzerland)', layout: 'ch', variant: 'fr' },
  { id: 'be', name: 'Belgian', layout: 'be', variant: '' },
  { id: 'gb', name: 'English (UK)', layout: 'gb', variant: '' },
];

function read() {
  const out = {};
  try {
    for (const line of fs.readFileSync(CONF, 'utf8').split('\n')) {
      const m = /^\s*([A-Z_]+)=(.*)$/.exec(line); if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
function write(vars) {
  fs.mkdirSync(path.dirname(CONF), { recursive: true });
  const lines = ['# palOS Language & Region (Settings). Read when you log in.'];
  for (const [k, v] of Object.entries(vars)) if (v) lines.push(`${k}=${v}`);
  fs.writeFileSync(CONF + '.tmp', lines.join('\n') + '\n'); fs.renameSync(CONF + '.tmp', CONF);
}
const langFromLocale = (l) => (/^fr/i.test(l || '') ? 'fr-CA' : 'en-CA');
function regionFromLocale(l) { const m = /^[a-z]+_([A-Z]+)/.exec(l || ''); return (m && REGIONS.find((r) => r.id === m[1])) ? m[1] : 'CA'; }
function formatsFor(lang, region) {
  const r = REGIONS.find((x) => x.id === region) || REGIONS[0];
  return r[lang.slice(0, 2)] || r.en || r.fr;
}
function generated() {
  try { return execFileSync('locale', ['-a'], { encoding: 'utf8', timeout: 4000 }).split('\n').map((s) => s.trim().toLowerCase().replace('utf-8', 'utf8')); } catch { return []; }
}

function get() {
  const c = read();
  const envLang = process.env.LANG || '';
  const lang = langFromLocale(c.LANG || envLang);
  const region = regionFromLocale(c.LC_TIME || c.LANG || envLang);
  let keyboard = c.KEYBOARD || '';
  if (!keyboard) {
    try {
      const q = execFileSync('setxkbmap', ['-query'], { encoding: 'utf8', timeout: 3000 });
      const lay = (/layout:\s*(\S+)/.exec(q) || [])[1] || 'us', vr = (/variant:\s*(\S+)/.exec(q) || [])[1] || '';
      const k = KEYBOARDS.find((x) => x.layout === lay.split(',')[0] && x.variant === vr.split(',')[0]); keyboard = k ? k.id : 'us';
    } catch { keyboard = 'us'; }
  }
  const have = generated();
  return {
    language: lang, region, keyboard,
    running: langFromLocale(envLang),                 // the language this session started with
    languages: LANGUAGES.map(({ id, name, native }) => ({ id, name, native })),
    regions: REGIONS.map((r) => ({ id: r.id, name: r.name, available: [r.en, r.fr].filter(Boolean).some((l) => have.includes(l.toLowerCase().replace('utf-8', 'utf8'))) })),
    keyboards: KEYBOARDS.map(({ id, name }) => ({ id, name })),
    formats: formatsFor(lang, region),
  };
}

function busctl(args) { return new Promise((res) => execFile('busctl', args, { timeout: 8000 }, (e) => res(!e))); }
async function tellLoginScreen(locale, formats) {
  const uid = process.getuid();
  const user = `/org/freedesktop/Accounts/User${uid}`;
  await busctl(['call', 'org.freedesktop.Accounts', user, 'org.freedesktop.Accounts.User', 'SetLanguage', 's', locale]);
  await busctl(['call', 'org.freedesktop.Accounts', user, 'org.freedesktop.Accounts.User', 'SetFormatsLocale', 's', formats]);
}

async function set({ language, region, keyboard } = {}) {
  const cur = get();
  language = LANGUAGES.find((l) => l.id === language) ? language : cur.language;
  region = REGIONS.find((r) => r.id === region) ? region : cur.region;
  keyboard = KEYBOARDS.find((k) => k.id === keyboard) ? keyboard : cur.keyboard;
  const L = LANGUAGES.find((l) => l.id === language);
  const formats = formatsFor(language, region);
  write({ LANG: L.locale, LANGUAGE: L.language, LC_TIME: formats, LC_NUMERIC: formats, LC_MONETARY: formats, LC_PAPER: formats, LC_MEASUREMENT: formats, KEYBOARD: keyboard });
  tellLoginScreen(L.locale, formats).catch(() => {});
  return { ok: true, restartNeeded: language !== cur.running || keyboard !== cur.keyboard ? language !== cur.running : false, formats };
}

function setKeyboard(id) {
  const k = KEYBOARDS.find((x) => x.id === id); if (!k) return { ok: false, error: 'Unknown keyboard' };
  try { execFileSync('setxkbmap', k.variant ? ['-layout', k.layout, '-variant', k.variant] : ['-layout', k.layout], { timeout: 4000 }); } catch (e) { return { ok: false, error: String(e.message || e) }; }
  const c = read(); c.KEYBOARD = id; write(c);
  return { ok: true };
}

function logout() {
  const id = process.env.XDG_SESSION_ID;
  if (id) execFile('loginctl', ['terminate-session', id], () => {});
  else execFile('loginctl', ['terminate-user', os.userInfo().username], () => {});
  return { ok: true };
}

module.exports = { get, set, setKeyboard, logout, KEYBOARDS, LANGUAGES, REGIONS, CONF };

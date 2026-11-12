'use strict';
// kibble APPDIR [args...]   — starts a palOS app on Kibble (WebKit, no Electron, no GTK).
// Also reads PALOS_APP_DIR, which palOS's .app launchers already set for the Electron runtime, so a .app
// moves to Kibble by changing its runtime line, nothing else.
const fs = require('fs');
const path = require('path');
const Module = require('module');

const args = process.argv.slice(2);
let dir = process.env.PALOS_APP_DIR || process.env.KIBBLE_APP_DIR;
if (!dir && args[0] && fs.existsSync(path.join(args[0], 'package.json'))) dir = args.shift();
if (!dir) { process.stderr.write('usage: kibble APPDIR [args...]\n'); process.exit(2); }
dir = path.resolve(dir);
// An app packed in app.asar (as Electron apps ship): unpacked once into ~/.cache/kibble/apps, again only when the
// archive changes. Files kept outside the archive (app.asar.unpacked) are copied in alongside.
if (dir.endsWith('.asar') && fs.statSync(dir).isFile()) {
  const os = require('os');
  const st = fs.statSync(dir);
  const key = require('crypto').createHash('sha1').update(`${dir}:${st.size}:${st.mtimeMs}`).digest('hex').slice(0, 16);
  const cache = path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'kibble', 'apps', key);
  if (!fs.existsSync(path.join(cache, '.complete'))) {
    fs.rmSync(cache, { recursive: true, force: true });
    require(path.join(__dirname, 'node_modules', '@electron', 'asar')).extractAll(dir, cache);
    const unpacked = dir + '.unpacked';
    if (fs.existsSync(unpacked)) fs.cpSync(unpacked, cache, { recursive: true });
    fs.writeFileSync(path.join(cache, '.complete'), dir);
  }
  process.env.KIBBLE_APP_ASAR = dir;
  dir = cache;
}
process.env.KIBBLE_APP_DIR = dir;

let pkg = {};
try { pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); } catch (e) { process.stderr.write(`kibble: ${dir}/package.json: ${e.message}\n`); process.exit(1); }
const main = path.resolve(dir, pkg.main || 'index.js');

// require('electron') gives the app Kibble
const ELECTRON = path.join(__dirname, 'electron.js');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === 'electron' || request === 'electron/main' || request === 'electron/common') return ELECTRON;
  // native modules built for Electron that Kibble answers itself
  if (request === 'better-sqlite3') return path.join(__dirname, 'compat', 'better-sqlite3.js');
  return resolve.call(this, request, parent, ...rest);
};
// dbus-next and friends come from Kibble, not the app
Module.globalPaths.push(path.join(__dirname, 'node_modules'));

// what Electron apps look at
process.versions.kibble = '0.1.0';
process.type = 'browser';
process.resourcesPath = process.env.PALOS_APP_RESOURCES || path.dirname(process.env.KIBBLE_APP_ASAR || dir);
// as in an installed Electron app: [the program, ...the app's own arguments] (no app folder in between)
process.argv = [process.execPath, ...args];
process.defaultApp = false;

require(ELECTRON);
// palOS's translations, for every app (as palOS's Electron runtime did): menus, dialogs and every page's text
// follow the language chosen in Settings. Apps that load it themselves get the same one (it loads once).
if (!process.env.KIBBLE_NO_L10N) { try { require('/usr/lib/palos-l10n/main.js'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') process.stderr.write(`kibble: translations: ${e.message}\n`); } }
if (!process.env.PALOS_NO_THEME) { try { require('/usr/lib/palos-theme/main.js'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') process.stderr.write(`kibble: theme: ${e.message}\n`); } }
require(main);

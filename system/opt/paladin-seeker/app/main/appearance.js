'use strict';
// Light/dark: follows the Dark Mode switch in Paladin Settings (palOS setting interface.color-scheme).
// Seeker's pages use CSS prefers-color-scheme, which Electron drives from nativeTheme.themeSource.
const { execFileSync, spawn } = require('child_process');
const { EventEmitter } = require('events');
const { nativeTheme } = require('electron');

const KEY = 'interface.color-scheme';

class Appearance extends EventEmitter {
  constructor() { super(); this.dark = false; this.proc = null; }

  read() {
    try { return /prefer-dark/.test(execFileSync('palos-pref', ['get', KEY], { encoding: 'utf8', timeout: 3000 })); } catch { return false; }
  }

  apply(dark) {
    this.dark = !!dark;
    nativeTheme.themeSource = this.dark ? 'dark' : 'light';
    // the window manager's title bars follow too (gunmetal in Dark Mode)
    try { require('child_process').execFile('xprop', ['-root', '-f', '_PALADIN_DARK', '32c', '-set', '_PALADIN_DARK', this.dark ? '1' : '0'], () => {}); } catch {}
  }

  start() {
    this.apply(this.read());
    this.watch();
  }

  watch() {
    let buf = '';
    try { this.proc = spawn('palos-pref', ['monitor', KEY], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return; }
    this.proc.stdout.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split('\n'); buf = lines.pop();
      for (const l of lines) {
        const dark = /prefer-dark/.test(l);
        if (dark !== this.dark) { this.apply(dark); this.emit('change', dark); }
      }
    });
    this.proc.on('exit', () => { this.proc = null; setTimeout(() => this.watch(), 5000); });
    this.proc.on('error', () => {});
  }
}

module.exports = new Appearance();

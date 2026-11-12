'use strict';
// Terminal's window: xterm.js on a palOS pty host.
const THEMES = {
  basic: { background: '#ffffff', foreground: '#1d1d1f', cursor: '#7f7f7f', selectionBackground: '#b3d7ff' },
  pro: { background: '#1b1b1b', foreground: '#f2f2f2', cursor: '#9a9a9a', selectionBackground: '#4a4a4a' },
  homebrew: { background: '#000000', foreground: '#28fe14', cursor: '#38fe27', selectionBackground: '#0b4d06' },
  ocean: { background: '#224fbc', foreground: '#ffffff', cursor: '#7f7f7f', selectionBackground: '#4f7ad8' },
  paper: { background: '#f2eedf', foreground: '#2c2a24', cursor: '#7f7f7f', selectionBackground: '#d8cfae' },
};
const fr = /^fr/i.test(navigator.language);
if (fr) { document.getElementById('fq').placeholder = 'Rechercher'; document.getElementById('endmsg').textContent = '[Processus terminé]'; }
const term = new Terminal({ fontFamily: '"DejaVu Sans Mono", "Liberation Mono", monospace', fontSize: 13, cursorBlink: true, allowProposedApi: true,
  scrollback: 10000, macOptionIsMeta: true, rightClickSelectsWord: true, allowTransparency: true });
const fit = new FitAddon.FitAddon(); term.loadAddon(fit);
term.loadAddon(new WebLinksAddon.WebLinksAddon((e, uri) => { if (e.ctrlKey) window.open(uri); }));
const search = new SearchAddon.SearchAddon(); term.loadAddon(search);
term.open(document.getElementById('t'));
function apply(p) {
  const th = THEMES[p.theme] || THEMES.basic;
  term.options.theme = th; term.options.fontSize = p.fontSize || 13;
  document.documentElement.style.setProperty('--bg', th.background); document.documentElement.style.setProperty('--fg', th.foreground);
  setTimeout(() => fit.fit(), 0);
}
window.pty.prefs().then(apply); window.pty.on('prefs', apply);
fit.fit();
const cwd = new URLSearchParams(location.search).get('cwd');
window.pty.start({ cwd, cols: term.cols, rows: term.rows });
window.pty.on('pty:data', (s) => term.write(Uint8Array.from(s, (c) => c.charCodeAt(0))));
window.pty.on('pty:exit', () => { document.getElementById('ended').hidden = false; term.options.cursorBlink = false; term.options.disableStdin = true; });
term.onData((d) => window.pty.input(d));
term.onBinary((d) => window.pty.input(d));
term.onResize(({ cols, rows }) => window.pty.resize({ cols, rows }));
term.onTitleChange((t) => window.pty.title(t));
new ResizeObserver(() => fit.fit()).observe(document.getElementById('t'));
// copy, paste, select all, find, clear
async function paste() { const t = await window.pty.readClip(); if (t) term.paste(t); }
const F = document.getElementById('find'), FQ = document.getElementById('fq');
function find(show) { F.hidden = !show; if (show) { FQ.focus(); FQ.select(); } else { search.clearDecorations(); term.focus(); } }
FQ.addEventListener('keydown', (e) => { if (e.key === 'Enter') (e.shiftKey ? search.findPrevious : search.findNext).call(search, FQ.value); if (e.key === 'Escape') find(false); });
document.getElementById('fn').onclick = () => search.findNext(FQ.value);
document.getElementById('fp').onclick = () => search.findPrevious(FQ.value);
document.getElementById('fx').onclick = () => find(false);
window.pty.on('cmd', (c) => ({
  copy: () => { const s = term.getSelection(); if (s) window.pty.writeClip(s); },
  paste, selectAll: () => term.selectAll(), find: () => find(true), clear: () => term.clear(),
}[c] || (() => {}))());
term.attachCustomKeyEventHandler((e) => {
  if (e.type !== 'keydown') return true;
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') { const s = term.getSelection(); if (s) window.pty.writeClip(s); return false; }
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyV') { paste(); return false; }
  return true;
});
term.element.addEventListener('mouseup', (e) => { if (e.button === 1) { e.preventDefault(); } });
// drag a file in: its path, quoted
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  const paths = [...e.dataTransfer.files].map((f) => window.pty.pathFor(f)).filter(Boolean).map((p) => "'" + p.replace(/'/g, "'\\''") + "'");
  if (paths.length) window.pty.input(paths.join(' ') + ' ');
});
term.focus();

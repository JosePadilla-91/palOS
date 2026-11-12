'use strict';
/* Textpad window: a plain-text editor with find & replace, line numbers and wrapping. */
const $ = (s) => document.querySelector(s);
const ta = $('#ta'), nums = $('#nums'), measure = $('#measure');
let S = {}, saved = '', file = null, eol = 'LF', readOnly = false;

// ---------------------------------------------------------------- settings
function apply(s) {
  S = s;
  document.body.classList.toggle('nowrap', !s.wrap);
  document.body.classList.toggle('numbers', !!s.lineNumbers);
  document.body.classList.toggle('prop', !s.mono);
  document.documentElement.style.setProperty('--font-size', s.fontSize + 'px');
  document.documentElement.style.setProperty('--tab', s.tabSize);
  renumber();
}
api.on('settings', apply);

// ---------------------------------------------------------------- document
window.textpadText = () => ta.value;
function setText(text) {
  ta.value = text; saved = text;
  ta.setSelectionRange(0, 0); ta.scrollTop = 0;
  api.send('dirty', false); api.send('empty', !text);
  status(); renumber();
}
api.on('doc:load', (d) => {
  file = d.file; eol = d.eol || 'LF'; readOnly = d.writable === false;
  $('#enc').textContent = d.encoding || 'UTF-8';
  $('#eol').textContent = eol;
  $('#ro').hidden = !readOnly;
  setText(d.text);
  ta.focus();
});
api.on('doc:saved', (d) => { file = d.file; saved = ta.value; readOnly = false; $('#ro').hidden = true; api.send('dirty', false); });

let dirtyTimer = null;
ta.addEventListener('input', () => {
  clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(() => { api.send('dirty', ta.value !== saved); api.send('empty', false); }, 60);
  status(); renumberSoon();
  if (!$('#findbar').hidden) countSoon();
});

// ---------------------------------------------------------------- status bar
function lineCol() {
  const p = ta.selectionStart, before = ta.value.slice(0, p);
  const line = before.split('\n').length, col = p - before.lastIndexOf('\n');
  return { line, col };
}
function status() {
  const { line, col } = lineCol();
  const sel = ta.selectionEnd - ta.selectionStart;
  $('#pos').textContent = `Line ${line}, Column ${col}` + (sel ? ` (${sel.toLocaleString()} selected)` : '');
  const v = ta.value;
  const words = v.length > 2000000 ? null : (v.match(/\S+/g) || []).length;
  $('#count').textContent = (words === null ? '' : `${words.toLocaleString()} word${words === 1 ? '' : 's'}, `) + `${v.length.toLocaleString()} character${v.length === 1 ? '' : 's'}`;
}
document.addEventListener('selectionchange', () => { if (document.activeElement === ta) status(); });

// ---------------------------------------------------------------- line numbers
let numTimer = null;
function renumberSoon() { clearTimeout(numTimer); numTimer = setTimeout(renumber, 120); }
function renumber() {
  if (!S.lineNumbers) { nums.textContent = ''; return; }
  const lines = ta.value.split('\n');
  if (!S.wrap || lines.length > 20000) { nums.textContent = lines.map((_, i) => i + 1).join('\n'); syncScroll(); return; }
  // wrapped lines: measure how tall each one is so the numbers line up
  measure.style.width = ta.clientWidth + 'px';
  measure.textContent = '';
  const frag = document.createDocumentFragment();
  for (const l of lines) { const d = document.createElement('div'); d.textContent = l || ' '; frag.append(d); }
  measure.append(frag);
  const lh = parseFloat(getComputedStyle(ta).lineHeight) || 21;
  nums.textContent = '';
  const out = document.createDocumentFragment();
  [...measure.children].forEach((d, i) => { const n = document.createElement('div'); n.textContent = i + 1; n.style.height = Math.max(lh, d.offsetHeight) + 'px'; out.append(n); });
  nums.append(out);
  measure.textContent = '';
  syncScroll();
}
function syncScroll() { $('#gutter').scrollTop = ta.scrollTop; }
ta.addEventListener('scroll', syncScroll);
new ResizeObserver(() => { if (S.lineNumbers && S.wrap) renumberSoon(); }).observe(ta);

// ---------------------------------------------------------------- editing helpers
function insert(text) { ta.focus(); document.execCommand('insertText', false, text); }
ta.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    const unit = S.spaces ? ' '.repeat(S.tabSize || 4) : '\t';
    const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
    if (s === en && !e.shiftKey) return insert(unit);
    // indent / outdent the selected lines
    const ls = v.lastIndexOf('\n', s - 1) + 1, le = v.indexOf('\n', en - (en > s && v[en - 1] === '\n' ? 1 : 0)); const end = le < 0 ? v.length : le;
    const block = v.slice(ls, end).split('\n');
    const out = block.map((l) => e.shiftKey ? l.replace(new RegExp('^(\\t| {1,' + (S.tabSize || 4) + '})'), '') : unit + l).join('\n');
    ta.setSelectionRange(ls, end); insert(out); ta.setSelectionRange(ls, ls + out.length);
  } else if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    // keep the current line's indent
    const s = ta.selectionStart, v = ta.value, ls = v.lastIndexOf('\n', s - 1) + 1;
    const indent = (v.slice(ls, s).match(/^[ \t]*/) || [''])[0];
    if (indent) { e.preventDefault(); insert('\n' + indent); }
  }
});

// ---------------------------------------------------------------- find & replace
const fb = $('#findbar'), fq = $('#fq'), rq = $('#rq');
function openFind(replace) {
  fb.hidden = false; fb.classList.toggle('find-only', !replace);
  const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
  if (sel && !sel.includes('\n')) fq.value = sel;
  fq.focus(); fq.select(); count();
}
function closeFind() { fb.hidden = true; ta.focus(); }
function regex(global) {
  const q = fq.value; if (!q) return null;
  let src = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if ($('#fword').checked) src = `\\b${src}\\b`;
  return new RegExp(src, (global ? 'g' : 'g') + ($('#fcase').checked ? '' : 'i'));
}
let countTimer = null;
function countSoon() { clearTimeout(countTimer); countTimer = setTimeout(count, 150); }
function count() {
  const re = regex(true);
  if (!re) { $('#fcount').textContent = ''; fq.classList.remove('none'); return 0; }
  const n = (ta.value.match(re) || []).length;
  $('#fcount').textContent = n ? `${n.toLocaleString()} match${n === 1 ? '' : 'es'}` : 'Not found';
  fq.classList.toggle('none', !n);
  return n;
}
function reveal(start, end) {
  // put the match in view: focus moves the caret into view, then select it
  ta.focus(); ta.setSelectionRange(start, start); ta.blur(); ta.focus(); ta.setSelectionRange(start, end);
  const lh = parseFloat(getComputedStyle(ta).lineHeight) || 21;
  const line = ta.value.slice(0, start).split('\n').length;
  if (!S.wrap || !S.lineNumbers) { const y = (line - 1) * lh; if (y < ta.scrollTop || y > ta.scrollTop + ta.clientHeight - lh * 2) ta.scrollTop = Math.max(0, y - ta.clientHeight / 3); }
  status();
}
function find(back) {
  const re = regex(true); if (!re) return false;
  const v = ta.value; let m, hit = null;
  if (!back) {
    re.lastIndex = ta.selectionEnd; m = re.exec(v);
    if (!m) { re.lastIndex = 0; m = re.exec(v); }
    hit = m;
  } else {
    const before = ta.selectionStart; let last = null; re.lastIndex = 0;
    while ((m = re.exec(v))) { if (m.index >= before) break; last = m; if (m[0] === '') re.lastIndex++; }
    if (!last) { re.lastIndex = 0; while ((m = re.exec(v))) { last = m; if (m[0] === '') re.lastIndex++; } }
    hit = last;
  }
  if (!hit) { count(); return false; }
  reveal(hit.index, hit.index + hit[0].length);
  if (!fb.hidden) fq.focus();
  return true;
}
function replaceOne() {
  if (readOnlyBlock()) return;
  const re = regex(false); if (!re) return;
  const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
  const whole = new RegExp('^(?:' + re.source + ')$', re.flags.replace('g', ''));
  if (sel && whole.test(sel)) { const s = ta.selectionStart; insert(rq.value); ta.setSelectionRange(s, s + rq.value.length); }
  find(false); count();
}
function replaceAll() {
  if (readOnlyBlock()) return;
  const re = regex(true); if (!re) return;
  const n = (ta.value.match(re) || []).length; if (!n) return;
  const top = ta.scrollTop;
  ta.focus(); ta.setSelectionRange(0, ta.value.length);
  insert(ta.value.replace(re, () => rq.value));         // one step to undo
  ta.setSelectionRange(0, 0); ta.scrollTop = top;
  $('#fcount').textContent = `Replaced ${n.toLocaleString()}`;
}
function readOnlyBlock() { return false; }
fq.addEventListener('input', () => { count(); });
fq.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); find(e.shiftKey); } if (e.key === 'Escape') closeFind(); });
rq.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); replaceOne(); } if (e.key === 'Escape') closeFind(); });
$('#fnext').onclick = () => find(false); $('#fprev').onclick = () => find(true);
$('#fdone').onclick = closeFind; $('#rone').onclick = replaceOne; $('#rall').onclick = replaceAll;
$('#fcase').onchange = count; $('#fword').onchange = count;

// ---------------------------------------------------------------- go to line
async function gotoLine() {
  const r = await api.invoke('ui:prompt', { message: 'Go to Line', detail: 'Type a line number.', value: String(lineCol().line), ok: 'Go' });
  const v = r && (r.value ?? r); const n = parseInt(v, 10);
  if (!n || n < 1) return;
  const lines = ta.value.split('\n'); const target = Math.min(n, lines.length);
  let pos = 0; for (let i = 0; i < target - 1; i++) pos += lines[i].length + 1;
  reveal(pos, pos + lines[target - 1].length);
}

// ---------------------------------------------------------------- commands from the menu bar
ta.addEventListener('contextmenu', (e) => {
  e.preventDefault(); ta.focus();
  api.send('context', { sel: ta.selectionStart !== ta.selectionEnd, ro: !!readOnly });
});
api.on('cmd', (c) => {
  switch (c) {
    case 'find': return openFind(false);
    case 'replace': return openFind(true);
    case 'findNext': if (!fq.value) return openFind(false); return find(false);
    case 'findPrev': if (!fq.value) return openFind(false); return find(true);
    case 'gotoLine': return gotoLine();
    case 'insertDate': return insert(new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }));
    case 'upper': case 'lower': {
      const s = ta.selectionStart, e = ta.selectionEnd; if (s === e) return;
      const t = ta.value.slice(s, e); insert(c === 'upper' ? t.toUpperCase() : t.toLowerCase()); ta.setSelectionRange(s, e); return;
    }
    case 'eol:LF': case 'eol:CRLF': eol = c.slice(4); $('#eol').textContent = eol; return api.send('eol', eol);
    case 'print': { $('#print').textContent = ta.value; window.print(); return; }
    case 'help': return api.invoke('ui:message', { message: 'Textpad', detail:
      'Ctrl+N new document · Ctrl+O open · Ctrl+S save · Ctrl+Shift+S save as\n' +
      'Ctrl+F find · Ctrl+H find and replace · Ctrl+G next match · Ctrl+L go to line\n' +
      'Tab / Shift+Tab indents or outdents the selected lines.\n' +
      'Format › Wrap Lines and View › Line Numbers change how the text is shown; Ctrl+= and Ctrl+- change its size.', buttons: ['OK'] });
  }
});

// ---------------------------------------------------------------- drag and drop
document.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
document.addEventListener('drop', (e) => {
  const files = [...e.dataTransfer.files].map((f) => api.pathFor(f)).filter(Boolean);
  if (files.length) { e.preventDefault(); api.send('drop', files); }
});

// ---------------------------------------------------------------- start
(async () => {
  const r = await api.invoke('init');
  apply(r.settings);
  api.send('empty', true);
  status();
  ta.focus();
})();

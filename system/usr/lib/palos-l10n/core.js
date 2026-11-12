'use strict';
// palOS translations: shared by the main process, the page script and Node tools.
// A dictionary is { "English text": "texte traduit", "{} items": "{} éléments", ... }. Keys with {} are
// patterns: each {} matches any text, and {} (or {1}, {2}… to reorder) in the translation puts it back.
function compile(dict) {
  const exact = new Map(), pats = [];
  for (const [k, v] of Object.entries(dict || {})) {
    if (typeof v !== 'string' || !v || k.startsWith('_')) continue;
    if (k.includes('{}')) {
      const raw = k.split('{}');
      const parts = raw.map((p) => p.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{/g, '\\{').replace(/\}/g, '\\}'));
      // placeholders written inside quotes ("{}", “{}”, «{}») hold names: anything may go there
      const quoted = raw.slice(0, -1).map((p, i) => /[“"'‘«(]\s*$/.test(p) || /^\s*[”"'’»)]/.test(raw[i + 1]));
      pats.push([new RegExp('^' + parts.join('(.+?)') + '$', 's'), v, k.length, quoted]);
    } else exact.set(k, v);
  }
  pats.sort((a, b) => b[2] - a[2]);           // longest (most specific) pattern first
  return { exact, pats };
}
// sizes and decimals in French: "5.1 GB" -> "5,1 Go"
const UNITS = { B: 'o', bytes: 'octets', KB: 'Ko', MB: 'Mo', GB: 'Go', TB: 'To', kB: 'ko', KiB: 'Kio', MiB: 'Mio', GiB: 'Gio', TiB: 'Tio' };
function size(v) {
  const m = /^(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d+))?\s?(B|bytes|KB|kB|MB|GB|TB|KiB|MiB|GiB|TiB)$/.exec(v.trim());
  if (!m) return undefined;
  return m[1].replace(/,/g, '\u202f') + (m[2] ? ',' + m[2] : '') + '\u00a0' + UNITS[m[3]];
}
function num(v) {
  if (/^-?\d+\.\d+$/.test(v)) return v.replace('.', ',');
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v)) return v.replace(/,/g, '\u202f').replace('.', ',');
  return undefined;
}
const FUNCTION_WORDS = /\b(the|a|an|of|on|in|to|for|with|and|or|every|all|this|that|these|those|your|my|our|is|are|was|were|be|it|its|from|by|at|as|into|onto|each|any|some|no|not|here|there|when|while|then|than|more|less|new|page|pages|equal|left|right|top|bottom)\b/i;
/** does this captured piece still hold English that needs translating? (names, numbers and sizes don't) */
function englishLeft(c, v) {
  const s = String(v || '').trim();
  if (!s || !/[A-Za-z]{2}/.test(s)) return false;
  if (c.exact.has(s) || size(s) !== undefined || num(s) !== undefined) return false;
  if (/^[\w.+-]+\.[A-Za-z0-9]{1,6}$/.test(s) || /^\S+@\S+$/.test(s) || /^[\/~]/.test(s)) return false;   // a file, an address, a path
  return FUNCTION_WORDS.test(s) || /(^|[\s(])[a-z]{3,}([\s,.;:)!?]|$)/.test(s);
}
function lookup(c, t) {
  const hit = c.exact.get(t);
  if (hit !== undefined) return hit;
  if (!c.pats.length || t.length > 400) return undefined;
  for (const [re, out, , quoted] of c.pats) {
    const m = re.exec(t);
    if (!m) continue;
    // A pattern ("Show on {}") must not translate half a sentence: when a placeholder captured English words
    // it can't translate itself, the pattern doesn't fit ("Show on Every Page" stays whole, not "Afficher sur Every Page").
    if (m.slice(1).some((v, j) => !(quoted && quoted[j]) && englishLeft(c, v))) continue;
    let i = 0;
    return out.replace(/\{(\d*)\}/g, (_, n) => {
      const v = m[n ? +n : ++i] ?? '';
      const tv = c.exact.get(v.trim()) ?? size(v) ?? num(v.trim());       // a placeholder may itself be a known word ("{} Settings" with "Network")
      return tv !== undefined ? v.replace(v.trim(), tv) : v;
    });
  }
  return undefined;
}
// translate keeping the surrounding white space; undefined when there's nothing to translate
function translate(c, s) {
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  if (t.length < 1 || !/[A-Za-z]/.test(t)) return undefined;
  let r = size(t);
  if (r === undefined) r = lookup(c, t);
  if (r === undefined) {
    // "Save…" / "Save:" / "Save (Ctrl+S)" when only "Save" is known
    const m = /^(.*?)(…|\.\.\.|:| \([^()]*\))$/s.exec(t);
    if (m && m[1]) { const b = lookup(c, m[1]); if (b !== undefined) r = b + (m[2] === ':' ? ' :' : m[2] === '...' ? '…' : (m[2].startsWith(' (') ? (lookup(c, m[2].slice(2, -1)) !== undefined ? ' (' + lookup(c, m[2].slice(2, -1)) + ')' : m[2]) : m[2])); }
  }
  if (r === undefined && t.length > 1 && t === t.toUpperCase() && /[A-Z]{2}/.test(t)) {   // "DEVICES": a heading in capitals
    const low = t.toLowerCase(), cap = low.replace(/(^|\s)\S/g, (x) => x.toUpperCase()), first = low.charAt(0).toUpperCase() + low.slice(1);
    const b = lookup(c, first) ?? lookup(c, cap); if (b !== undefined) r = b.toLocaleUpperCase('fr-CA');
  }
  if (r === undefined && t.includes('\t')) {           // "Show Editor\tE": the label, then a shortcut
    const i = t.indexOf('\t'); const b = lookup(c, t.slice(0, i).trim()); if (b !== undefined) r = b + t.slice(i);
  }
  if (r === undefined && /&[A-Za-z]/.test(t) && !/&&|& /.test(t)) {   // "&File": a menu mnemonic
    const b = translate(c, t.replace(/&([A-Za-z])/, '$1')); if (b !== undefined) r = b.trim();
  }
  if (r === undefined && t.includes('&&')) { const b = translate(c, t.replace(/&&/g, '&')); if (b !== undefined) r = b.trim().replace(/&/g, '&&'); }
  if (r === undefined && t.includes('\n')) {          // several lines: each on its own
    let any = false; const out = t.split('\n').map((l) => { const b = translate(c, l); if (b !== undefined) { any = true; return b; } return l; });
    if (any) r = out.join('\n');
  }
  if (r === undefined || r === t) return undefined;
  return s.replace(t, r);
}
// which of palOS's translations to use: the first language in the person's list that palOS has words for
// (/usr/share/palos/l10n/<id>.json: fr-CA, de, ja, zh-TW…). English when there is none.
function langOf(env) {
  const list = [env.PALOS_LANG, env.LANGUAGE, env.LC_ALL, env.LC_MESSAGES, env.LANG].filter(Boolean).join(':').split(':').filter(Boolean);
  let has = () => false;
  try { const fs = require('fs'); has = (id) => fs.existsSync('/usr/share/palos/l10n/' + id + '.json'); } catch {}
  for (const raw of list) {
    const v = raw.replace(/[.@].*$/, '').replace('_', '-');
    const base = v.split('-')[0].toLowerCase();
    if (base === 'en' || base === 'c' || base === 'posix') return 'en-CA';
    if (base === 'fr') return 'fr-CA';
    for (const id of [v, base === 'zh' ? (/TW|HK|MO|Hant/i.test(v) ? 'zh-TW' : 'zh-CN') : null, base]) if (id && has(id)) return id;
  }
  return 'en-CA';
}
module.exports = { compile, lookup, translate, langOf };

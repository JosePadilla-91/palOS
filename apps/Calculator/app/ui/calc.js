'use strict';
// Calculator: an expression is built as you press keys and worked out with the usual order of operations.
const fr = /^fr/i.test(navigator.language);
const $ = (s) => document.querySelector(s);
let expr = '', cur = '0', fresh = true, mem = 0, second = false, rad = false, lastAns = 0, tape = [];
const fmt = (n) => {
  if (!isFinite(n)) return fr ? 'Erreur' : 'Error';
  let s = Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-9 && n !== 0) ? n.toExponential(9).replace(/\.?0+e/, 'e') : String(+n.toPrecision(15));
  return fr ? s.replace('.', ',') : s;
};
const parseCur = () => parseFloat(cur.replace(',', '.'));
function show() {
  $('#out').textContent = fresh && cur === '0' && expr ? $('#out').textContent : (fr ? cur.replace('.', ',') : cur);
  $('#expr').textContent = expr.replace(/\*/g, '×').replace(/\//g, '÷');
  $('#clear').textContent = cur !== '0' && !fresh ? 'C' : 'AC';
  $('#mem').textContent = mem ? 'M' : '';
  $('#deg').textContent = rad ? 'Rad' : 'Deg';
  const out = $('#out'); out.style.fontSize = ''; let fs = 38; while (out.scrollWidth > out.clientWidth && fs > 14) out.style.fontSize = (fs -= 2) + 'px';
}
const toR = (x) => (rad ? x : x * Math.PI / 180), fromR = (x) => (rad ? x : x * 180 / Math.PI);
function fact(n) { if (n < 0 || n > 170) return NaN; if (Number.isInteger(n)) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; } return gamma(n + 1); }
function gamma(z) { const g = 7, p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z)); z -= 1; let x = p[0]; for (let i = 1; i < g + 2; i++) x += p[i] / (z + i); const t = z + g + 0.5; return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * x; }
const UNARY = {
  x2: (x) => x * x, x3: (x) => x ** 3, ex: Math.exp, '10x': (x) => 10 ** x, inv: (x) => 1 / x, sqrt: Math.sqrt, cbrt: Math.cbrt, ln: Math.log, log: Math.log10, fact,
  sin: (x) => Math.sin(toR(x)), cos: (x) => Math.cos(toR(x)), tan: (x) => Math.tan(toR(x)), sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  asin: (x) => fromR(Math.asin(x)), acos: (x) => fromR(Math.acos(x)), atan: (x) => fromR(Math.atan(x)), asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
  ex2: (x) => 2 ** x, log2: Math.log2,
};
function evaluate(s) {
  // the expression holds numbers, + - * / ^ yroot and parentheses: worked out by precedence (no eval)
  const toks = s.match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|yroot|[-+*/^()]/g) || [];
  let i = 0;
  const peek = () => toks[i], next = () => toks[i++];
  function prim() { const t = next(); if (t === '(') { const v = add(); next(); return v; } if (t === '-') return -prim(); return parseFloat(t); }
  function pow() { let v = prim(); while (peek() === '^' || peek() === 'yroot') { const op = next(); const r = prim(); v = op === '^' ? v ** r : v ** (1 / r); } return v; }
  function mul() { let v = pow(); while (peek() === '*' || peek() === '/') { const op = next(); const r = pow(); v = op === '*' ? v * r : v / r; } return v; }
  function add() { let v = mul(); while (peek() === '+' || peek() === '-') { const op = next(); const r = mul(); v = op === '+' ? v + r : v - r; } return v; }
  return add();
}
const num = () => String(parseCur());
function press(k) {
  if (/^[0-9]$/.test(k)) { cur = fresh || cur === '0' ? k : cur + k; fresh = false; }
  else if (k === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (!cur.includes('.')) cur += '.'; }
  else if (k === 'C') { if (!fresh && cur !== '0') { cur = '0'; fresh = true; } else { cur = '0'; expr = ''; fresh = true; } }
  else if (k === 'neg') { cur = cur.startsWith('-') ? cur.slice(1) : (cur === '0' ? cur : '-' + cur); }
  else if (k === '%') { cur = String(parseCur() / 100); fresh = true; }
  else if (['+', '-', '*', '/', 'xy', 'yroot'].includes(k)) {
    const op = k === 'xy' ? '^' : k;
    if (!fresh || !expr || /[(]$/.test(expr)) expr += num();
    else if (/[-+*/^]$|yroot$/.test(expr)) expr = expr.replace(/([-+*/^]|yroot)$/, '');
    expr += op; fresh = true;
    document.querySelectorAll('.op').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
    return show();
  }
  else if (k === '(') { expr += (/[\d)]$/.test(expr) ? '*' : '') + '('; fresh = true; }
  else if (k === ')') { if ((expr.match(/\(/g) || []).length > (expr.match(/\)/g) || []).length) { expr += num() + ')'; fresh = true; cur = fmt(evaluate(expr.replace(/^.*\(/, '('))).replace(',', '.'); } }
  else if (k === '=') {
    let full = expr + (/[)]$/.test(expr) && fresh ? '' : num());
    const open = (full.match(/\(/g) || []).length - (full.match(/\)/g) || []).length; full += ')'.repeat(Math.max(0, open));
    const v = evaluate(full); lastAns = v;
    tape.push(full.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/\+/g, ' + ').replace(/(\d)-/g, '$1 − ').replace(/\^/g, ' ^ ') + '\n= ' + fmt(v) + '\n');
    $('#tapetext').textContent = tape.join('\n');
    cur = isFinite(v) ? String(v) : (fr ? 'Erreur' : 'Error'); expr = ''; fresh = true;
  }
  else if (k === 'pi') { cur = String(Math.PI); fresh = true; }
  else if (k === 'e') { cur = String(Math.E); fresh = true; }
  else if (k === 'rand') { cur = String(Math.random()); fresh = true; }
  else if (k === 'EE') { if (!cur.includes('e')) { cur += 'e'; fresh = false; } }
  else if (k === 'mc') mem = 0; else if (k === 'm+') mem += parseCur(); else if (k === 'm-') mem -= parseCur(); else if (k === 'mr') { cur = String(mem); fresh = true; }
  else if (k === '2nd') { second = !second; document.querySelector('[data-k="2nd"]').classList.toggle('on', second); relabel(); }
  else if (k === 'rad') { rad = !rad; document.querySelector('[data-k="rad"]').classList.toggle('on', rad); }
  else {
    const name = second ? ({ sin: 'asin', cos: 'acos', tan: 'atan', sinh: 'asinh', cosh: 'acosh', tanh: 'atanh', ex: 'ex2', ln: 'log2' }[k] || k) : k;
    if (UNARY[name]) { const v = UNARY[name](parseCur()); cur = isFinite(v) ? String(v) : (fr ? 'Erreur' : 'Error'); fresh = true; }
  }
  document.querySelectorAll('.op').forEach((b) => b.classList.remove('on'));
  if (/e$/.test(cur)) { $('#out').textContent = cur; } else if (!isNaN(parseCur())) cur = fresh ? fmt(parseCur()).replace(',', '.') : cur;
  show();
}
function relabel() {
  const L = second ? { sin: 'sin⁻¹', cos: 'cos⁻¹', tan: 'tan⁻¹', sinh: 'sinh⁻¹', cosh: 'cosh⁻¹', tanh: 'tanh⁻¹', ex: '2ˣ', ln: 'log₂' } : { sin: 'sin', cos: 'cos', tan: 'tan', sinh: 'sinh', cosh: 'cosh', tanh: 'tanh', ex: 'eˣ', ln: 'ln' };
  for (const [k, v] of Object.entries(L)) { const b = document.querySelector(`[data-k="${k}"]`); if (b) b.textContent = v; }
}
document.querySelectorAll('button[data-k]').forEach((b) => b.addEventListener('click', () => press(b.dataset.k)));
const KEYS = { Enter: '=', '=': '=', Escape: 'C', Delete: 'C', '+': '+', '-': '-', '*': '*', x: '*', '/': '/', '%': '%', '.': '.', ',': '.', '(': '(', ')': ')', '^': 'xy' };
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey) return;
  if (e.key === 'Backspace') { if (!fresh && cur.length > 1) cur = cur.slice(0, -1); else { cur = '0'; fresh = true; } return show(); }
  const k = /^[0-9]$/.test(e.key) ? e.key : KEYS[e.key]; if (!k) return;
  e.preventDefault(); press(k);
  const b = document.querySelector(`button[data-k="${CSS.escape(k)}"]`); if (b) { b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 100); }
});
window.calc.on(async (c) => {
  if (c === 'copy') window.calc.write(cur);
  else if (c === 'paste') { const t = (await window.calc.read()).trim().replace(',', '.'); if (!isNaN(parseFloat(t))) { cur = String(parseFloat(t)); fresh = true; show(); } }
  else if (c === 'tape') $('#tape').hidden = !$('#tape').hidden;
  else if (c === 'cleartape') { tape = []; $('#tapetext').textContent = ''; }
  else if (c.startsWith('mode:')) document.body.className = c === 'mode:sci' ? 'sci' : 'basic';
});
$('#tapeclose').onclick = () => { $('#tape').hidden = true; };
if (fr) { document.querySelector('#tapehead span').textContent = 'Ruban'; document.title = 'Calculatrice'; document.querySelector('[data-k="."]').textContent = ','; }
show();

document.querySelectorAll('#modes button').forEach((b) => b.addEventListener('click', () => calc.mode(b.dataset.m)));

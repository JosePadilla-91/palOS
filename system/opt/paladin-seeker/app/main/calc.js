'use strict';
// Maths and unit conversions in the spyglass search.
//   12*7+3   (450-120)/3   2^10   sqrt(144)   15% of 80   80 + 15%   3 x 4   10 ÷ 4   1,250 * 3
//   5 km in miles   100 f in c   2 cups to ml   60 mph in km/h   3 GB in MB   1.5 hours in minutes
// A small parser, not JavaScript eval: only numbers, + - × ÷ ^ %, brackets and a few named functions.

const FUNCS = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
  ln: Math.log, log: Math.log10, exp: Math.exp,
  // trigonometry in degrees, as on a pocket calculator
  sin: (x) => Math.sin((x * Math.PI) / 180), cos: (x) => Math.cos((x * Math.PI) / 180), tan: (x) => Math.tan((x * Math.PI) / 180),
};
const CONSTS = { pi: Math.PI, 'π': Math.PI, e: Math.E };

function tokenize(src) {
  const s = src.toLowerCase()
    .replace(/(\d),(?=\d{3}(\D|$))/g, '$1')          // 1,250 -> 1250
    .replace(/[×✕∙·]/g, '*').replace(/(?<=[\d).]\s*)x(?=\s*[\d(.])/g, '*').replace(/[÷]/g, '/').replace(/[−–—]/g, '-').replace(/\*\*/g, '^')
    .replace(/\bof\b/g, ' of ');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));
    if (num) { out.push({ t: 'n', v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const word = /^[a-zπ]+/.exec(s.slice(i));
    if (word) {
      const w = word[0];
      if (w === 'of') out.push({ t: 'of' });
      else if (w in FUNCS) out.push({ t: 'f', v: w });
      else if (w in CONSTS) out.push({ t: 'n', v: CONSTS[w] });
      else return null;
      i += w.length; continue;
    }
    if ('+-*/^%()'.includes(c)) { out.push({ t: c }); i++; continue; }
    return null;
  }
  return out;
}

// expr := term (('+'|'-') term)*      ("a + b%" means a plus b percent of a)
// term := unary (('*'|'/') unary | implicit-multiply)*
// unary := '-' unary | power ;  power := postfix ('^' unary)?
// postfix := primary ('%' ('of' unary)?)? ; primary := number | func primary | '(' expr ')'
function parse(tokens) {
  let p = 0;
  const peek = () => tokens[p];
  const eat = (t) => (tokens[p] && tokens[p].t === t ? tokens[p++] : null);
  function primary() {
    const tk = tokens[p];
    if (!tk) throw new Error('end');
    if (tk.t === 'n') { p++; return { v: tk.v }; }
    if (tk.t === 'f') { p++; const a = primary(); return { v: FUNCS[tk.v](a.v) }; }
    if (eat('(')) { const v = expr(); if (!eat(')')) throw new Error(')'); return v; }
    throw new Error('primary');
  }
  function postfix() {
    const a = primary();
    if (eat('%')) {
      if (eat('of')) { const b = unary(); return { v: (a.v / 100) * b.v }; }
      return { v: a.v / 100, pct: true };
    }
    return a;
  }
  function power() {
    const a = postfix();
    if (eat('^')) { const b = unary(); return { v: Math.pow(a.v, b.v) }; }
    return a;
  }
  function unary() {
    if (eat('-')) { const a = unary(); return { v: -a.v }; }
    if (eat('+')) return unary();
    return power();
  }
  function term() {
    let a = unary();
    for (;;) {
      if (eat('*')) a = { v: a.v * unary().v };
      else if (eat('/')) a = { v: a.v / unary().v };
      else if (peek() && (peek().t === '(' || peek().t === 'f' || peek().t === 'n') && p > 0) a = { v: a.v * unary().v };   // 2(3+4), 2pi
      else return a;
    }
  }
  function expr() {
    let a = term();
    for (;;) {
      if (eat('+')) { const b = term(); a = { v: b.pct ? a.v * (1 + b.v) : a.v + b.v }; }
      else if (eat('-')) { const b = term(); a = { v: b.pct ? a.v * (1 - b.v) : a.v - b.v }; }
      else return a;
    }
  }
  const r = expr();
  if (p !== tokens.length) throw new Error('trailing');
  return r.v;
}

// ------------------------------------------------------------------ units
// each unit: [dimension, factor to the base unit]; temperatures are handled on their own
const U = {};
function def(dim, factor, ...names) { for (const n of names) U[n] = [dim, factor]; }
// length (metres)
def('length', 0.001, 'mm', 'millimeter', 'millimeters', 'millimetre', 'millimetres');
def('length', 0.01, 'cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres');
def('length', 1, 'm', 'meter', 'meters', 'metre', 'metres');
def('length', 1000, 'km', 'kilometer', 'kilometers', 'kilometre', 'kilometres');
def('length', 0.0254, 'in', 'inch', 'inches', '"');
def('length', 0.3048, 'ft', 'foot', 'feet', "'");
def('length', 0.9144, 'yd', 'yard', 'yards');
def('length', 1609.344, 'mi', 'mile', 'miles');
def('length', 1852, 'nmi', 'nautical mile', 'nautical miles');
// weight (grams)
def('weight', 0.001, 'mg', 'milligram', 'milligrams');
def('weight', 1, 'g', 'gram', 'grams');
def('weight', 1000, 'kg', 'kilo', 'kilos', 'kilogram', 'kilograms');
def('weight', 1e6, 't', 'tonne', 'tonnes', 'metric ton', 'metric tons');
def('weight', 28.349523125, 'oz', 'ounce', 'ounces');
def('weight', 453.59237, 'lb', 'lbs', 'pound', 'pounds');
def('weight', 6350.29318, 'st', 'stone', 'stones');
// volume (millilitres; US kitchen measures)
def('volume', 1, 'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'cc');
def('volume', 10, 'cl', 'centiliter', 'centiliters', 'centilitre', 'centilitres');
def('volume', 100, 'dl', 'deciliter', 'deciliters', 'decilitre', 'decilitres');
def('volume', 1000, 'l', 'liter', 'liters', 'litre', 'litres');
def('volume', 4.92892159375, 'tsp', 'teaspoon', 'teaspoons');
def('volume', 14.78676478125, 'tbsp', 'tablespoon', 'tablespoons');
def('volume', 236.5882365, 'cup', 'cups');
def('volume', 29.5735295625, 'fl oz', 'floz', 'fluid ounce', 'fluid ounces');
def('volume', 473.176473, 'pt', 'pint', 'pints');
def('volume', 946.352946, 'qt', 'quart', 'quarts');
def('volume', 3785.411784, 'gal', 'gallon', 'gallons');
// speed (metres per second)
def('speed', 1, 'm/s', 'mps', 'meters per second', 'metres per second');
def('speed', 1000 / 3600, 'km/h', 'kmh', 'kph', 'km/hr', 'kilometers per hour', 'kilometres per hour');
def('speed', 1609.344 / 3600, 'mph', 'mi/h', 'miles per hour');
def('speed', 1852 / 3600, 'kn', 'kt', 'knot', 'knots');
def('speed', 0.3048, 'ft/s', 'fps', 'feet per second');
// area (square metres)
def('area', 1e-6, 'mm2', 'mm²', 'sq mm');
def('area', 1e-4, 'cm2', 'cm²', 'sq cm');
def('area', 1, 'm2', 'm²', 'sq m', 'square meter', 'square meters', 'square metre', 'square metres');
def('area', 1e6, 'km2', 'km²', 'sq km', 'square kilometer', 'square kilometers', 'square kilometre', 'square kilometres');
def('area', 1e4, 'ha', 'hectare', 'hectares');
def('area', 4046.8564224, 'acre', 'acres', 'ac');
def('area', 0.00064516, 'in2', 'in²', 'sq in', 'square inch', 'square inches');
def('area', 0.09290304, 'ft2', 'ft²', 'sq ft', 'square foot', 'square feet');
def('area', 0.83612736, 'yd2', 'yd²', 'sq yd', 'square yard', 'square yards');
def('area', 2589988.110336, 'mi2', 'mi²', 'sq mi', 'square mile', 'square miles');
// time (seconds)
def('time', 0.001, 'ms', 'millisecond', 'milliseconds');
def('time', 1, 's', 'sec', 'secs', 'second', 'seconds');
def('time', 60, 'min', 'mins', 'minute', 'minutes');
def('time', 3600, 'h', 'hr', 'hrs', 'hour', 'hours');
def('time', 86400, 'd', 'day', 'days');
def('time', 604800, 'wk', 'week', 'weeks');
def('time', 31557600, 'yr', 'year', 'years');
// data (bytes; KB, MB, GB as storage makers count them, KiB, MiB, GiB in powers of two)
def('data', 1, 'b', 'byte', 'bytes');
def('data', 1e3, 'kb', 'kilobyte', 'kilobytes'); def('data', 1e6, 'mb', 'megabyte', 'megabytes');
def('data', 1e9, 'gb', 'gigabyte', 'gigabytes'); def('data', 1e12, 'tb', 'terabyte', 'terabytes');
def('data', 1024, 'kib'); def('data', 1048576, 'mib'); def('data', 1073741824, 'gib'); def('data', 1099511627776, 'tib');
def('data', 0.125, 'bit', 'bits'); def('data', 125, 'kbit', 'kbits'); def('data', 125000, 'mbit', 'mbits'); def('data', 1.25e8, 'gbit', 'gbits');
const TEMP = { c: 'C', celsius: 'C', '°c': 'C', f: 'F', fahrenheit: 'F', '°f': 'F', k: 'K', kelvin: 'K' };
const NICE = { length: 'm', weight: 'g', volume: 'ml', speed: 'm/s', area: 'm²', time: 's', data: 'B' };

function unitOf(name) {
  const n = name.trim().toLowerCase().replace(/^degrees?\s+/, '').replace(/\s+/g, ' ').replace(/\.$/, '');
  if (TEMP[n]) return { temp: TEMP[n], label: n };
  if (U[n]) return { dim: U[n][0], f: U[n][1], label: name.trim() };
  if (n.endsWith('s') && U[n.slice(0, -1)]) return { dim: U[n.slice(0, -1)][0], f: U[n.slice(0, -1)][1], label: name.trim() };
  return null;
}

function toC(v, u) { return u === 'C' ? v : u === 'F' ? ((v - 32) * 5) / 9 : v - 273.15; }
function fromC(c, u) { return u === 'C' ? c : u === 'F' ? (c * 9) / 5 + 32 : c + 273.15; }

function fmt(v, prec = 12) {
  if (!isFinite(v)) return null;
  if (Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-6 && v !== 0)) return v.toPrecision(8).replace(/\.?0+e/, 'e');
  const r = Number(v.toPrecision(prec));
  const [i, d] = String(Math.abs(r)).split('.');
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (r < 0 ? '-' : '') + grouped + (d ? '.' + d.slice(0, 10) : '');
}

function convert(q) {
  const m = /^\s*(.+?)\s*([a-zA-Z°'"µ²][a-zA-Z°'"µ²/ .]*?)\s+(?:in|to|into|as|=)\s+([a-zA-Z°'"µ²][a-zA-Z°'"µ²/ .]*?)\s*\??$/.exec(q);
  if (!m) return null;
  let amount;
  try { const t = tokenize(m[1]); if (!t || !t.length) return null; amount = parse(t); } catch { return null; }
  const a = unitOf(m[2]); const b = unitOf(m[3]);
  if (!a || !b) return null;
  let out;
  if (a.temp && b.temp) out = fromC(toC(amount, a.temp), b.temp);
  else if (a.dim && b.dim && a.dim === b.dim) out = (amount * a.f) / b.f;
  else return null;
  const s = fmt(out, 6);
  if (s === null) return null;
  const lab = b.temp ? `°${b.temp}` : m[3].trim();
  return { value: out, text: `${s} ${lab}`, copy: s.replace(/,/g, ''), expr: `${fmt(amount)} ${a.temp ? '°' + a.temp : m[2].trim()} =` };
}

/** { text, copy, expr } for something that looks like a calculation or a conversion, or null */
function evaluate(query) {
  const q = String(query || '').trim();
  if (!q || q.length > 200) return null;
  const conv = convert(q);
  if (conv) return conv;
  // plain numbers and words are searches, not sums: there must be an operator or a function
  if (!/[\d)π]\s*[-+*/^%x×÷]|[-+*/^x×÷]\s*[\d(.π]|\b(sqrt|cbrt|abs|round|floor|ceil|ln|log|exp|sin|cos|tan)\b|%\s*of\b/i.test(q)) return null;
  if (/^[a-z]+$/i.test(q)) return null;
  const tokens = tokenize(q.replace(/=\s*$/, ''));
  if (!tokens || tokens.length < 2) return null;
  let v;
  try { v = parse(tokens); } catch { return null; }
  const s = fmt(v);
  if (s === null) return null;
  return { value: v, text: s, copy: s.replace(/,/g, ''), expr: q.replace(/=\s*$/, '') + ' =' };
}

module.exports = { evaluate };

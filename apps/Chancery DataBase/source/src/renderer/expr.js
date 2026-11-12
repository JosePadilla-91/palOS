'use strict';
/* Small Access-style expression engine: =[Price]*[Stock], [First] & " " & [Last], Sum([Price]), IIf(...) */
const Expr = (() => {
  const cache = new Map();

  function lex(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '[') {
        const j = s.indexOf(']', i);
        if (j < 0) throw new Error('Missing ] in expression.');
        out.push({ t: 'id', v: s.slice(i + 1, j) }); i = j + 1; continue;
      }
      if (c === '"' || c === "'") {
        let j = i + 1, v = '';
        while (j < s.length && s[j] !== c) v += s[j++];
        if (j >= s.length) throw new Error('Missing closing quote in expression.');
        out.push({ t: 'str', v }); i = j + 1; continue;
      }
      const num = /^\d+\.?\d*|^\.\d+/.exec(s.slice(i));
      if (num) { out.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
      const word = /^[A-Za-z_][A-Za-z_0-9.]*/.exec(s.slice(i));
      if (word) { out.push({ t: 'w', v: word[0] }); i += word[0].length; continue; }
      const op = /^(<>|<=|>=|[-+*\/&=<>(),])/.exec(s.slice(i));
      if (op) { out.push({ t: 'op', v: op[0] }); i += op[0].length; continue; }
      throw new Error(`Unexpected "${c}" in expression.`);
    }
    return out;
  }

  const PREC = { or: 1, and: 2, '=': 4, '<>': 4, '<': 4, '>': 4, '<=': 4, '>=': 4, '&': 5, '+': 6, '-': 6, '*': 7, '/': 7 };

  function parse(src) {
    const tk = lex(src);
    let p = 0;
    const peek = () => tk[p];
    const isOp = v => tk[p] && ((tk[p].t === 'op' && tk[p].v === v) || (tk[p].t === 'w' && tk[p].v.toLowerCase() === v));

    function primary() {
      const x = tk[p++];
      if (!x) throw new Error('The expression ends too early.');
      if (x.t === 'num') return { k: 'n', v: x.v };
      if (x.t === 'str') return { k: 's', v: x.v };
      if (x.t === 'id') return { k: 'f', v: x.v };
      if (x.t === 'op' && x.v === '(') { const e = bin(0); if (!isOp(')')) throw new Error('Missing ) in expression.'); p++; return e; }
      if (x.t === 'op' && x.v === '-') return { k: 'neg', a: primary() };
      if (x.t === 'w') {
        const lw = x.v.toLowerCase();
        if (lw === 'not') return { k: 'not', a: bin(3) };
        if (lw === 'true') return { k: 'n', v: 1 };
        if (lw === 'false') return { k: 'n', v: 0 };
        if (lw === 'null') return { k: 'null' };
        if (isOp('(')) {
          p++;
          const args = [];
          if (isOp('*')) { p++; args.push({ k: 'star' }); }
          else if (!isOp(')')) { do { args.push(bin(0)); } while (isOp(',') && ++p); }
          if (!isOp(')')) throw new Error(`Missing ) after ${x.v}(`);
          p++;
          return { k: 'call', name: lw, args };
        }
        return { k: 'f', v: x.v };
      }
      throw new Error(`Unexpected "${x.v}" in expression.`);
    }

    function bin(min) {
      let left = primary();
      for (;;) {
        const x = peek();
        if (!x) break;
        const op = x.t === 'op' ? x.v : x.t === 'w' && /^(and|or)$/i.test(x.v) ? x.v.toLowerCase() : null;
        if (!op || !(op in PREC) || PREC[op] < min) break;
        p++;
        left = { k: 'bin', op, a: left, b: bin(PREC[op] + 1) };
      }
      return left;
    }

    const ast = bin(0);
    if (p < tk.length) throw new Error(`Unexpected "${tk[p].v}" in expression.`);
    return ast;
  }

  const num = v => { if (v === null || v === undefined || v === '') return 0; const n = Number(v); return isNaN(n) ? 0 : n; };
  const str = v => (v === null || v === undefined ? '' : String(v));
  const AGG = new Set(['sum', 'avg', 'count', 'min', 'max']);

  /* ctx: { get(name), rows: [getFn...], vars: {} } */
  function run(n, ctx) {
    switch (n.k) {
      case 'n': case 's': return n.v;
      case 'null': return null;
      case 'f': return ctx.get(n.v);
      case 'neg': return -num(run(n.a, ctx));
      case 'not': return run(n.a, ctx) ? 0 : 1;
      case 'bin': {
        const a = run(n.a, ctx), b = run(n.b, ctx);
        switch (n.op) {
          case '+': return (typeof a === 'string' || typeof b === 'string') && isNaN(Number(a)) ? str(a) + str(b) : num(a) + num(b);
          case '-': return num(a) - num(b);
          case '*': return num(a) * num(b);
          case '/': return num(b) === 0 ? null : num(a) / num(b);
          case '&': return str(a) + str(b);
          case '=': return a == b ? 1 : 0;
          case '<>': return a != b ? 1 : 0;
          case '<': return a < b ? 1 : 0;
          case '>': return a > b ? 1 : 0;
          case '<=': return a <= b ? 1 : 0;
          case '>=': return a >= b ? 1 : 0;
          case 'and': return a && b ? 1 : 0;
          case 'or': return a || b ? 1 : 0;
        }
        return null;
      }
      case 'call': return call(n, ctx);
    }
    return null;
  }

  function call(n, ctx) {
    const a = n.args, nm = n.name;
    if (AGG.has(nm)) {
      const rows = ctx.rows || [];
      if (nm === 'count' && (!a.length || a[0].k === 'star')) return rows.length;
      const vals = rows.map(g => run(a[0], { ...ctx, get: g })).filter(v => v !== null && v !== undefined && v !== '');
      if (nm === 'count') return vals.length;
      if (!vals.length) return null;
      if (nm === 'sum') return vals.reduce((s, v) => s + num(v), 0);
      if (nm === 'avg') return vals.reduce((s, v) => s + num(v), 0) / vals.length;
      const nums = vals.map(Number);
      if (nums.every(x => !isNaN(x))) return nm === 'min' ? Math.min(...nums) : Math.max(...nums);
      return vals.reduce((m, v) => (nm === 'min' ? (v < m ? v : m) : (v > m ? v : m)));
    }
    const v = a.map(x => run(x, ctx));
    switch (nm) {
      case 'iif': return v[0] ? v[1] : v[2];
      case 'round': return Number(num(v[0]).toFixed(v[1] === undefined ? 0 : num(v[1])));
      case 'abs': return Math.abs(num(v[0]));
      case 'int': return Math.floor(num(v[0]));
      case 'upper': case 'ucase': return str(v[0]).toUpperCase();
      case 'lower': case 'lcase': return str(v[0]).toLowerCase();
      case 'trim': return str(v[0]).trim();
      case 'len': return str(v[0]).length;
      case 'left': return str(v[0]).slice(0, num(v[1]));
      case 'right': return num(v[1]) ? str(v[0]).slice(-num(v[1])) : '';
      case 'mid': return str(v[0]).substr(num(v[1]) - 1, v[2] === undefined ? undefined : num(v[2]));
      case 'nz': return v[0] === null || v[0] === undefined || v[0] === '' ? (v[1] === undefined ? 0 : v[1]) : v[0];
      case 'isnull': return v[0] === null || v[0] === undefined || v[0] === '' ? 1 : 0;
      case 'date': return new Date().toISOString().slice(0, 10);
      case 'datelong': return new Date().toLocaleDateString(undefined, { dateStyle: 'long' });
      case 'now': { const d = new Date(), z = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`; }
      case 'year': return new Date(str(v[0]).replace(' ', 'T')).getFullYear() || null;
      case 'month': { const m = new Date(str(v[0]).replace(' ', 'T')).getMonth(); return isNaN(m) ? null : m + 1; }
      case 'day': return new Date(str(v[0]).replace(' ', 'T')).getDate() || null;
    }
    throw new Error(`Unknown function "${n.name}".`);
  }

  const ast = src => { let a = cache.get(src); if (!a) { a = parse(src); cache.set(src, a); } return a; };

  /* a control source: "Field" is a plain field, "=expr" is calculated */
  const isCalc = s => typeof s === 'string' && s.trim().startsWith('=');
  function evaluate(src, ctx) {
    const s = String(src).trim().replace(/^=/, '');
    return run(ast(s), ctx);
  }
  function check(src) { try { ast(String(src).trim().replace(/^=/, '')); return null; } catch (e) { return e.message; } }

  function getter(obj, extra) {
    const lc = {};
    for (const k of Object.keys(obj || {})) lc[k.toLowerCase()] = obj[k];
    return name => {
      if (obj && name in obj) return obj[name];
      const l = name.toLowerCase();
      if (extra && l in extra) return extra[l];
      return l in lc ? lc[l] : null;
    };
  }

  return { evaluate, check, isCalc, getter, num };
})();

/* number / date formatting shared by form and report controls */
const FORMATS = [['', 'General'], ['fixed', 'Fixed (2 decimals)'], ['standard', 'Standard (1,234.50)'], ['currency', 'Currency'], ['percent', 'Percent'], ['int', 'Whole number'], ['shortdate', 'Short date'], ['longdate', 'Long date'], ['yesno', 'Yes/No']];
function fmtVal(v, f) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  switch (f) {
    case 'fixed': return isNaN(n) ? String(v) : n.toFixed(2);
    case 'standard': return isNaN(n) ? String(v) : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'currency': return isNaN(n) ? String(v) : n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    case 'percent': return isNaN(n) ? String(v) : (n * 100).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%';
    case 'int': return isNaN(n) ? String(v) : Math.round(n).toLocaleString();
    case 'shortdate': case 'longdate': {
      const d = new Date(String(v).replace(' ', 'T'));
      return isNaN(d) ? String(v) : d.toLocaleDateString(undefined, { dateStyle: f === 'longdate' ? 'long' : 'short' });
    }
    case 'yesno': return v == 1 || /^(true|yes)$/i.test(v) ? 'Yes' : 'No';
  }
  return typeof v === 'number' ? String(Number(v.toFixed(10))) : String(v);
}

if (typeof module !== 'undefined') module.exports = { Expr, fmtVal, FORMATS };

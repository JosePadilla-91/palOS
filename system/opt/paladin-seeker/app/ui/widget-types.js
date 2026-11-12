'use strict';
// The widgets you can add. Each type says how big it is and how to build and update itself.
// create(item, api) -> { root, tick(now), settings(panel, done) }   (api: save(), invoke(), events, saveEvents())
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v); }
  for (const kid of kids.flat()) if (kid != null) e.append(kid);
  return e;
};
const NS = 'http://www.w3.org/2000/svg';
const svg = (html, cls = '') => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 64 64'); if (cls) s.setAttribute('class', cls); s.innerHTML = html; return s; };
const pad2 = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// ---------- clock
const ZONES = [['', 'This computer'], ['UTC', 'UTC'], ['America/Los_Angeles', 'Los Angeles'], ['America/New_York', 'New York'], ['America/Sao_Paulo', 'São Paulo'], ['Europe/London', 'London'], ['Europe/Paris', 'Paris'], ['Africa/Cairo', 'Cairo'], ['Asia/Dubai', 'Dubai'], ['Asia/Kolkata', 'Mumbai'], ['Asia/Manila', 'Manila'], ['Asia/Tokyo', 'Tokyo'], ['Australia/Sydney', 'Sydney'], ['Pacific/Honolulu', 'Honolulu'], ['Pacific/Auckland', 'Auckland']];
function partsIn(tz, now) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz || undefined, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, weekday: 'short', day: 'numeric', month: 'short' });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { h: +p.hour % 24, m: +p.minute, s: +p.second, label: `${p.weekday} ${p.day} ${p.month}` };
}
function clockCreate(item) {
  const s = item.settings;
  const root = h('div', { class: 'pad', style: 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px' });
  const name = () => (ZONES.find((z) => z[0] === (s.tz || '')) || ['', s.tz])[1];
  const analog = () => {
    const f = svg('<circle cx="32" cy="32" r="30" fill="#f6f7fa" stroke="#2c3140" stroke-width="2"/>' + Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, r1 = i % 3 ? 26 : 24, r2 = 28; return `<line x1="${32 + Math.sin(a) * r1}" y1="${32 - Math.cos(a) * r1}" x2="${32 + Math.sin(a) * r2}" y2="${32 - Math.cos(a) * r2}" stroke="#2c3140" stroke-width="${i % 3 ? 1 : 2}"/>`; }).join('') +
      '<line id="hh" x1="32" y1="32" x2="32" y2="17" stroke="#1d212c" stroke-width="3.2" stroke-linecap="round"/><line id="mm" x1="32" y1="32" x2="32" y2="10" stroke="#1d212c" stroke-width="2.2" stroke-linecap="round"/><line id="ss" x1="32" y1="36" x2="32" y2="8" stroke="#e5483b" stroke-width="1.1" stroke-linecap="round"/><circle cx="32" cy="32" r="2.2" fill="#e5483b"/>');
    f.style.cssText = 'width:128px;height:128px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.4))'; return f;
  };
  let face = null, digital = null, cap = h('div', { class: 'lbl', style: 'text-align:center;line-height:1.25;white-space:nowrap' });
  const build = () => { root.textContent = ''; face = digital = null; if (s.style === 'digital') { digital = h('div', { class: 'big', style: 'font-size:38px;margin-top:14px' }); root.append(digital, cap); } else { face = analog(); root.append(face, cap); } };
  build();
  return {
    root,
    tick(now) {
      const t = partsIn(s.tz, now); cap.textContent = '';
      cap.append(h('div', { style: 'color:#fff;font-weight:600', text: name() }), h('div', { text: t.label }));
      if (face) { const rot = (id, deg) => face.querySelector('#' + id).setAttribute('transform', `rotate(${deg} 32 32)`); rot('hh', (t.h % 12) * 30 + t.m * .5); rot('mm', t.m * 6 + t.s * .1); rot('ss', t.s * 6); }
      if (digital) digital.textContent = `${pad2(t.h)}:${pad2(t.m)}:${pad2(t.s)}`;
    },
    settings(panel, done) {
      const style = h('select', { class: 'wfield' }, h('option', { value: 'analog', text: 'Analog' }), h('option', { value: 'digital', text: 'Digital' })); style.value = s.style || 'analog';
      const tz = h('select', { class: 'wfield' }, ZONES.map((z) => h('option', { value: z[0], text: z[1] }))); tz.value = s.tz || '';
      panel.append(h('h4', { text: 'Clock' }), h('div', { class: 'lbl', text: 'Style' }), style, h('div', { class: 'lbl', text: 'City' }), tz, h('div', { class: 'grow' }), h('button', { class: 'wbtn', text: 'Done', onclick: () => { s.style = style.value; s.tz = tz.value; build(); done(true); } }));
    },
  };
}

// ---------- weather
const WX = (c) => c === 0 ? 'Clear' : c <= 2 ? 'Partly cloudy' : c === 3 ? 'Overcast' : c === 45 || c === 48 ? 'Fog' : c >= 51 && c <= 57 ? 'Drizzle' : c >= 61 && c <= 67 ? 'Rain' : c >= 71 && c <= 77 ? 'Snow' : c >= 80 && c <= 82 ? 'Showers' : c === 85 || c === 86 ? 'Snow showers' : c >= 95 ? 'Thunderstorm' : 'Cloudy';
const CLOUD = '<path d="M20 44a10 10 0 0 1 1-20 13 13 0 0 1 25 3 8.5 8.5 0 0 1-1 17z" fill="#dfe6f2"/>';
function wxIcon(code, day = true) {
  let b;
  if (code === 0) b = day ? '<circle cx="32" cy="32" r="11" fill="#ffc83d"/>' + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${32 + Math.cos(a) * 16}" y1="${32 + Math.sin(a) * 16}" x2="${32 + Math.cos(a) * 22}" y2="${32 + Math.sin(a) * 22}" stroke="#ffc83d" stroke-width="3" stroke-linecap="round"/>`; }).join('') : '<path d="M40 14a18 18 0 1 0 12 28A15 15 0 0 1 40 14z" fill="#cfd8ee"/>';
  else if (code <= 2) b = (day ? '<circle cx="24" cy="24" r="9" fill="#ffc83d"/>' : '<path d="M28 10a12 12 0 1 0 8 20A10 10 0 0 1 28 10z" fill="#cfd8ee"/>') + '<g transform="translate(4 6)">' + CLOUD + '</g>';
  else if (code === 3 || (code >= 4 && code < 45)) b = CLOUD.replace('#dfe6f2', '#b8c2d6');
  else if (code === 45 || code === 48) b = '<g stroke="#cfd8ee" stroke-width="4" stroke-linecap="round"><line x1="12" y1="24" x2="52" y2="24"/><line x1="18" y1="34" x2="58" y2="34"/><line x1="10" y1="44" x2="46" y2="44"/></g>';
  else if (code >= 71 && code <= 77 || code === 85 || code === 86) b = CLOUD + '<g fill="#fff"><circle cx="24" cy="52" r="2.6"/><circle cx="34" cy="56" r="2.6"/><circle cx="44" cy="52" r="2.6"/></g>';
  else if (code >= 95) b = CLOUD.replace('#dfe6f2', '#8e99b2') + '<path d="M34 40l-8 12h7l-3 10 12-15h-8z" fill="#ffc83d"/>';
  else b = CLOUD + '<g stroke="#6aa8ff" stroke-width="3" stroke-linecap="round"><line x1="24" y1="50" x2="21" y2="58"/><line x1="34" y1="50" x2="31" y2="58"/><line x1="44" y1="50" x2="41" y2="58"/></g>';
  return svg(b, 'wxi');
}
const DEMO = { now: { temp: 14, feels: 12, code: 2, day: true, wind: 11 }, days: [0, 1, 2, 3].map((i) => ({ date: dayKey(new Date(Date.now() + i * 864e5)), code: [2, 61, 0, 3][i], hi: [15, 12, 17, 14][i], lo: [8, 7, 9, 8][i] })) };
function weatherCreate(item, api) {
  const s = item.settings, d = item.data;
  const root = h('div', { class: 'pad', style: 'padding:14px 16px' });
  const draw = () => {
    root.textContent = '';
    const data = d.demo ? DEMO : d.cache;
    if (!s.place && !d.demo) { root.append(h('div', { class: 'lbl', text: 'Weather' }), h('div', { style: 'margin:14px 0 10px', text: 'Pick a place to see its weather.' }), h('button', { class: 'wbtn', text: 'Choose a place…', onclick: () => api.openSettings() })); return; }
    if (!data) { root.append(h('div', { class: 'lbl', text: s.place ? s.place.name : '' }), h('div', { style: 'margin-top:20px', text: d.error ? 'No connection. Try again soon.' : 'Loading…' })); return; }
    const deg = s.unit === 'F' ? '°F' : '°C';
    const top = h('div', { style: 'display:flex;gap:10px;align-items:center' },
      wxIcon(data.now.code, data.now.day), h('div', { style: 'flex:1;min-width:0' }, h('div', { style: 'font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', text: d.demo ? 'Your city' : s.place.name }), h('div', { class: 'lbl', text: `${WX(data.now.code)} · feels ${data.now.feels}°` })), h('div', { class: 'big', text: `${data.now.temp}°` }));
    top.querySelector('svg').style.cssText = 'width:54px;height:54px;flex:none';
    const row = h('div', { style: 'display:flex;gap:6px;margin-top:10px' }, data.days.slice(1, 4).map((x) => {
      const ic = wxIcon(x.code, true); ic.style.cssText = 'width:26px;height:26px';
      return h('div', { style: 'flex:1;text-align:center;background:rgba(255,255,255,.08);border-radius:10px;padding:4px 2px' }, h('div', { class: 'lbl', text: new Date(x.date + 'T12:00').toLocaleDateString([], { weekday: 'short' }) }), ic, h('div', { style: 'font-size:12px', text: `${x.hi}° ${x.lo}°` }));
    }));
    root.append(top, row);
    if (d.error && !d.demo) root.append(h('div', { class: 'lbl', style: 'margin-top:4px', text: 'Offline: showing the last forecast.' }));
  };
  async function refresh() {
    if (d.demo || !s.place) return; d.last = Date.now();
    const r = await api.invoke('widgets:weather', { lat: s.place.lat, lon: s.place.lon, unit: s.unit });
    if (r && r.data) { d.cache = r.data; d.error = false; } else d.error = true;
    api.save(); draw();
  }
  draw();
  if (!d.demo && s.place && (!d.last || Date.now() - d.last > 15 * 60 * 1000)) refresh();
  return {
    root,
    tick() { if (!d.demo && s.place && Date.now() - (d.last || 0) > 15 * 60 * 1000) refresh(); },
    settings(panel, done) {
      let pick = s.place || null, unit = s.unit || (Intl.DateTimeFormat().resolvedOptions().locale.endsWith('-US') ? 'F' : 'C');
      const q = h('input', { class: 'wfield', placeholder: 'Search for a city', value: pick ? pick.name : '' });
      const list = h('div', { style: 'max-height:104px;overflow:auto;flex:none' }); const u = h('select', { class: 'wfield' }, h('option', { value: 'C', text: 'Celsius (°C)' }), h('option', { value: 'F', text: 'Fahrenheit (°F)' })); u.value = unit;
      // results as you type; Enter (or Done) takes the top one if none was clicked
      let found = [], seq = 0, timer = null, chosen = !!pick;
      const choose = (x) => { pick = x; chosen = true; q.value = x.name; list.textContent = ''; list.append(h('div', { class: 'lbl', text: '✓ ' + [x.name, x.region, x.country].filter(Boolean).join(', ') })); };
      const search = async () => {
        const text = q.value.trim(), my = ++seq;
        if (!text) { list.textContent = ''; found = []; return; }
        list.textContent = ''; list.append(h('div', { class: 'lbl', text: 'Searching…' }));
        const r = await api.invoke('widgets:geocode', text);
        if (my !== seq) return;                          // a newer search is on its way
        list.textContent = ''; found = (r && r.results) || [];
        if (!r || r.error) { list.append(h('div', { class: 'lbl', text: 'No connection.' })); return; }
        if (!found.length) list.append(h('div', { class: 'lbl', text: 'Nothing found.' }));
        found.forEach((x, i) => list.append(h('div', { class: 'hit' + (i === 0 ? ' first' : ''), text: [x.name, x.region, x.country].filter(Boolean).join(', '), onclick: () => choose(x) })));
      };
      q.addEventListener('input', () => { chosen = false; clearTimeout(timer); timer = setTimeout(search, 350); });
      q.addEventListener('keydown', async (e) => { e.stopPropagation(); if (e.key === 'Enter') { clearTimeout(timer); if (!found.length) await search(); if (found[0]) choose(found[0]); } });
      const finish = async () => { if (!chosen && q.value.trim()) { clearTimeout(timer); if (!found.length) await search(); if (found[0]) choose(found[0]); } };
      panel.append(h('h4', { text: 'Weather' }), q, list, u, h('div', { class: 'grow' }), h('div', { class: 'row' }, h('button', { class: 'wbtn', text: 'Cancel', onclick: () => done(false) }), h('div', { class: 'grow' }), h('button', { class: 'wbtn go', text: 'Done', onclick: async () => { await finish(); if (pick) s.place = { name: pick.name, lat: pick.lat, lon: pick.lon }; s.unit = u.value; d.cache = null; d.last = 0; done(true); refresh(); } })));
      setTimeout(() => q.focus(), 50);
    },
  };
}

// ---------- stopwatch
const fmtSW = (ms) => { const t = Math.max(0, ms), m = Math.floor(t / 60000), sec = Math.floor(t / 1000) % 60, cs = Math.floor(t / 10) % 100; return `${pad2(m)}:${pad2(sec)}.${pad2(cs)}`; };
function stopwatchCreate(item, api) {
  const d = item.data; d.elapsed = d.elapsed || 0; d.laps = d.laps || [];
  const now = () => d.elapsed + (d.running ? Date.now() - d.startedAt : 0);
  const time = h('div', { class: 'big', style: 'font-size:38px;text-align:center;margin-top:6px' });
  const laps = h('div', { class: 'lbl', style: 'text-align:center;min-height:18px;margin-top:2px' });
  const startB = h('button', { class: 'wbtn go', text: 'Start' }), lapB = h('button', { class: 'wbtn', text: 'Lap' });
  const draw = () => { time.textContent = fmtSW(now()); startB.textContent = d.running ? 'Stop' : 'Start'; startB.className = 'wbtn ' + (d.running ? 'stop' : 'go'); lapB.textContent = d.running ? 'Lap' : 'Reset'; lapB.style.visibility = d.running || d.elapsed ? 'visible' : 'hidden'; laps.textContent = d.laps.slice(-2).map((l, i, a) => `Lap ${d.laps.length - a.length + i + 1}  ${fmtSW(l)}`).join('   '); };
  startB.onclick = () => { if (d.running) { d.elapsed = now(); d.running = false; } else { d.startedAt = Date.now(); d.running = true; } api.save(); draw(); };
  lapB.onclick = () => { if (d.running) d.laps.push(now()); else { d.elapsed = 0; d.laps = []; } api.save(); draw(); };
  const root = h('div', { class: 'pad', style: 'padding-top:20px' }, h('div', { class: 'lbl', style: 'text-align:center', text: 'Stopwatch' }), time, h('div', { style: 'display:flex;gap:10px;justify-content:center;margin-top:8px' }, lapB, startB), laps);
  draw();
  return { root, tick: draw, fast: true };
}

// ---------- sticky note
const PAPER = { yellow: '#fff2a8', pink: '#ffc9dc', blue: '#c4e3ff', green: '#cdf1c1', orange: '#ffd9a8' };
function stickyCreate(item, api) {
  const d = item.data, s = item.settings;
  const root = h('div', { style: 'height:100%;padding:12px 12px 8px;display:flex;flex-direction:column' });
  const ta = h('textarea', { spellcheck: 'false', placeholder: 'Write something…', style: 'flex:1;border:0;background:transparent;resize:none;outline:none;font:italic 17px/1.35 "Noto Sans",sans-serif;color:#2b2410;user-select:text' }); ta.value = d.text || '';
  let t = 0; ta.addEventListener('input', () => { d.text = ta.value; clearTimeout(t); t = setTimeout(api.save, 400); });
  ta.addEventListener('keydown', (e) => e.stopPropagation());
  const paint = () => { api.frame.style.background = PAPER[s.color] || PAPER.yellow; };
  root.append(ta); paint(); api.onFrame(paint);
  return {
    root,
    settings(panel, done) {
      
      panel.append(h('h4', { text: 'Sticky note colour' }), h('div', { class: 'row', style: 'flex-wrap:wrap' }, Object.entries(PAPER).map(([k, v]) => h('button', { style: `width:34px;height:34px;border-radius:50%;border:2px solid ${s.color === k ? '#fff' : 'transparent'};background:${v}`, onclick: () => { s.color = k; paint(); done(true); } }))));
    },
  };
}

// ---------- calendar (month view + a day's schedule)
function calendarCreate(item, api) {
  const s = item.settings; const ev = api.events;
  let view = new Date(); view.setDate(1); let sel = dayKey(new Date());
  const root = h('div', { class: 'pad', style: 'padding:12px 14px;display:flex;flex-direction:column;gap:6px' });
  const title = h('div', { style: 'font-weight:600;font-size:15px;flex:1' });
  const grid = h('div', { style: 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:12px' });
  const dayTitle = h('div', { class: 'lbl', style: 'margin-top:2px' }); const list = h('div', { style: 'flex:1;overflow:auto;min-height:0' });
  const timeIn = h('input', { type: 'time', class: 'wfield', style: 'width:108px;padding:2px 4px' }), what = h('input', { class: 'wfield', placeholder: 'Add an event', style: 'padding:2px 6px' });
  const addEv = () => { const txt = what.value.trim(); if (!txt) return; (ev[sel] = ev[sel] || []).push({ id: Math.random().toString(36).slice(2, 9), time: timeIn.value || '', title: txt.slice(0, 80) }); what.value = ''; timeIn.value = ''; api.saveEvents(); paint(); };
  what.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') addEv(); }); timeIn.addEventListener('keydown', (e) => e.stopPropagation());
  const nav = (n) => { view = new Date(view.getFullYear(), view.getMonth() + n, 1); paint(); };
  function paint() {
    title.textContent = view.toLocaleDateString([], { month: 'long', year: 'numeric' }); grid.textContent = '';
    const first = (view.getDay() + 6) % 7 * 0; const start = new Date(view.getFullYear(), view.getMonth(), 1 - view.getDay());
    for (const wd of ['S', 'M', 'T', 'W', 'T', 'F', 'S']) grid.append(h('div', { class: 'lbl', text: wd }));
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), k = dayKey(d), other = d.getMonth() !== view.getMonth(), today = k === dayKey(new Date());
      const cell = h('div', { text: d.getDate(), style: `position:relative;padding:3px 0;border-radius:8px;cursor:default;${other ? 'opacity:.38;' : ''}${today ? 'background:#e5483b;color:#fff;font-weight:600;' : ''}${k === sel && !today ? 'box-shadow:inset 0 0 0 1.5px #6aa8ff;' : ''}` });
      if (ev[k] && ev[k].length) cell.append(h('i', { style: `position:absolute;left:50%;bottom:0;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:${today ? '#fff' : '#6aa8ff'}` }));
      cell.onclick = () => { sel = k; if (other) view = new Date(d.getFullYear(), d.getMonth(), 1); paint(); }; grid.append(cell);
    }
    const sd = new Date(sel + 'T12:00'); dayTitle.textContent = sd.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }); list.textContent = '';
    const evs = (ev[sel] || []).slice().sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    if (!evs.length) list.append(h('div', { class: 'lbl', text: 'Nothing planned.' }));
    for (const e of evs) list.append(h('div', { class: 'row', style: 'padding:2px 0;font-size:13px' }, h('span', { style: 'width:42px;color:#6aa8ff;font-variant-numeric:tabular-nums', text: e.time }), h('span', { class: 'grow', style: 'min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap', text: e.title }), h('button', { class: 'wbtn', style: 'padding:0 7px;border-radius:9px', text: '×', onclick: () => { ev[sel] = ev[sel].filter((x) => x.id !== e.id); if (!ev[sel].length) delete ev[sel]; api.saveEvents(); paint(); } })));
  }
  root.append(h('div', { class: 'row' }, title, h('button', { class: 'wbtn', style: 'padding:0 9px', text: '‹', onclick: () => nav(-1) }), h('button', { class: 'wbtn', style: 'padding:0 9px', text: '›', onclick: () => nav(1) })), grid, dayTitle, list, h('div', { class: 'row' }, timeIn, what, h('button', { class: 'wbtn go', style: 'padding:0 10px', text: '+', onclick: addEv })));
  paint();
  return { root, tick() { if (dayKey(new Date()) !== api.lastDay) { api.lastDay = dayKey(new Date()); paint(); } } };
}

// ---------- calculator: a simple one (+ − × ÷, %, ±), like a pocket calculator
function calculatorCreate(item, api) {
  const st = { shown: '0', acc: null, op: null, fresh: true, err: false };
  const dec = (1.5).toLocaleString().charAt(1);          // "." or "," for this language
  const fmt = (n) => {
    if (!isFinite(n)) return 'Error';
    let t = Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-9 && n !== 0) ? n.toExponential(6) : String(+n.toPrecision(12));
    return t.replace('.', dec);
  };
  const val = () => parseFloat(st.shown.replace(dec, '.')) || 0;
  const apply = (a, op, b) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : op === '÷' ? a / b : b);
  const screen = h('div', { class: 'calc-screen', text: '0' });
  const opKeys = {};
  const draw = () => {
    screen.textContent = st.err ? 'Error' : st.shown;
    const len = screen.textContent.length; screen.style.fontSize = (len > 12 ? 20 : len > 9 ? 26 : 34) + 'px';
    clearB.textContent = st.shown !== '0' && !st.fresh ? 'C' : 'AC';
    for (const [k, b] of Object.entries(opKeys)) b.classList.toggle('on', st.op === k && st.fresh && st.acc !== null);
  };
  const press = (k) => {
    if (st.err && k !== 'AC' && k !== 'C') return;
    if (/^[0-9]$/.test(k)) { if (st.fresh) { st.shown = k; st.fresh = false; } else if (st.shown.replace(/[^0-9]/g, '').length < 15) st.shown = st.shown === '0' ? k : st.shown + k; }
    else if (k === '.') { if (st.fresh) { st.shown = '0' + dec; st.fresh = false; } else if (!st.shown.includes(dec)) st.shown += dec; }
    else if (k === 'C' || k === 'AC') { if (k === 'AC' || st.err) { st.acc = null; st.op = null; } st.shown = '0'; st.fresh = true; st.err = false; }
    else if (k === '±') { if (st.shown !== '0') st.shown = st.shown.startsWith('-') ? st.shown.slice(1) : '-' + st.shown; }
    else if (k === '%') { st.shown = fmt(st.acc !== null && (st.op === '+' || st.op === '−') ? st.acc * val() / 100 : val() / 100); st.fresh = true; }
    else if (['+', '−', '×', '÷'].includes(k)) {
      if (st.acc !== null && st.op && !st.fresh) { const r = apply(st.acc, st.op, val()); st.err = !isFinite(r); st.shown = fmt(r); st.acc = r; }
      else st.acc = val();
      st.op = k; st.fresh = true;
    } else if (k === '=') {
      if (st.op !== null && st.acc !== null) { const r = apply(st.acc, st.op, val()); st.err = !isFinite(r); st.shown = fmt(r); st.acc = null; st.op = null; st.fresh = true; }
    }
    draw();
  };
  const key = (label, cls = '') => {
    const b = h('button', { class: 'calc-k ' + cls, text: label, onclick: (e) => { e.stopPropagation(); press(label === '0' && cls.includes('zero') ? '0' : label); } });
    b.addEventListener('mousedown', (e) => e.stopPropagation());       // a click, not a drag of the widget
    if (['+', '−', '×', '÷'].includes(label)) opKeys[label] = b;
    return b;
  };
  const clearB = key('AC', 'fn');
  clearB.onclick = (e) => { e.stopPropagation(); press(clearB.textContent); };
  const pad = h('div', { class: 'calc-pad' },
    clearB, key('±', 'fn'), key('%', 'fn'), key('÷', 'op'),
    key('7'), key('8'), key('9'), key('×', 'op'),
    key('4'), key('5'), key('6'), key('−', 'op'),
    key('1'), key('2'), key('3'), key('+', 'op'),
    key('0', 'zero'), key(dec === ',' ? ',' : '.'), key('=', 'op'));
  pad.lastChild.previousSibling.onclick = (e) => { e.stopPropagation(); press('.'); };
  const root = h('div', { class: 'calc' }, screen, pad);
  // typing works while the pointer is over the calculator
  let over = false;
  root.addEventListener('mouseenter', () => { over = true; }); root.addEventListener('mouseleave', () => { over = false; });
  document.addEventListener('keydown', (e) => {
    if (!over || e.ctrlKey || e.altKey || e.metaKey) return;
    const m = { '*': '×', x: '×', '/': '÷', '-': '−', '+': '+', Enter: '=', '=': '=', Escape: null, Backspace: 'back', Delete: 'AC', ',': '.', '.': '.', '%': '%' };
    let k = /^[0-9]$/.test(e.key) ? e.key : m[e.key];
    if (k === undefined || k === null) return;
    e.preventDefault(); e.stopPropagation();
    if (k === 'back') { if (!st.fresh && !st.err) { st.shown = st.shown.length > 1 && st.shown !== '-0' ? st.shown.slice(0, -1).replace(/^-$/, '0') : '0'; draw(); } return; }
    press(k);
  }, true);
  draw();
  return { root };
}

const WIDGET_TYPES = {
  clock: { name: 'Clock', w: 176, h: 208, settings: { style: 'analog', tz: '' }, data: {}, create: clockCreate },
  weather: { name: 'Weather', w: 290, h: 232, settings: { unit: '' }, data: {}, create: weatherCreate, gear: true },
  stopwatch: { name: 'Stopwatch', w: 236, h: 150, settings: {}, data: {}, create: stopwatchCreate, gear: false },
  sticky: { name: 'Sticky Note', w: 218, h: 218, settings: { color: 'yellow' }, data: { text: '' }, create: stickyCreate, gear: true, cls: 'sticky' },
  calendar: { name: 'Calendar', w: 310, h: 394, settings: {}, data: {}, create: calendarCreate, gear: false },
  calculator: { name: 'Calculator', w: 230, h: 370, settings: {}, data: {}, create: calculatorCreate, gear: false },
};

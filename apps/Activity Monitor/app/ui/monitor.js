'use strict';
const ask = (o) => api.invoke('ui:message', o);
const $ = (s, r = document) => r.querySelector(s);
const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a)) n === 'text' ? e.textContent = v : n === 'html' ? e.innerHTML = v : e.setAttribute(n, v); e.append(...k); return e; };
const TABS = [['procs', 'Processes'], ['cpu', 'Processor'], ['mem', 'Memory'], ['disk', 'Disks'], ['net', 'Network'], ['gpu', 'Graphics'], ['sens', 'Sensors']];
const HIST = 90;
const hist = { cpu: [], mem: [], swap: [], rx: [], tx: [], dr: [], dw: [] };
let cur = 'procs', last = null, sortKey = 'cpu', sortDir = -1, selPid = null, filter = '';

const fmtB = (n, d = 1) => { const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; n = n || 0; while (n >= 1024 && i < 4) { n /= 1024; i++; } return (i === 0 ? Math.round(n) : n.toFixed(d)) + ' ' + u[i]; };
const fmtR = (n) => fmtB(n) + '/s';
const fmtUp = (s) => { s = Math.floor(s); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return (d ? d + 'd ' : '') + (h ? h + 'h ' : '') + m + 'm'; };
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const stat = (label, value) => el('div', { class: 'stat' }, el('b', { text: value }), el('span', { text: label }));

// tabs
const tabs = $('#tabs');
for (const [id, name] of TABS) { const b = el('button', { text: name, 'data-id': id }); b.onclick = () => show(id); tabs.append(b); }
function show(id) { cur = id; for (const b of tabs.children) b.classList.toggle('on', b.dataset.id === id); for (const [t] of TABS) $('#v-' + t).classList.toggle('hidden', t !== id); if (last) paint(); }
show('procs');

// charts
function chart(cv, series, max, fmt) {
  const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight || +cv.getAttribute('height');
  if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const pad = 30, line = css('--line'), dim = css('--dim');
  if (!max) max = Math.max(1, ...series.flatMap((s) => s.data)) * 1.15;
  c.font = '10px sans-serif'; c.fillStyle = dim; c.strokeStyle = line; c.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = 8 + (h - 24) * i / 4; c.beginPath(); c.moveTo(pad + 30, y); c.lineTo(w - 8, y); c.stroke(); c.fillText(fmt(max * (1 - i / 4)), 4, y + 3); }
  for (const s of series) {
    const d = s.data; if (!d.length) continue; const x0 = pad + 30, x1 = w - 8;
    const pt = (v, i) => [x1 - (d.length - 1 - i) * (x1 - x0) / (HIST - 1), 8 + (h - 24) * (1 - Math.min(v, max) / max)];
    c.beginPath(); d.forEach((v, i) => { const [x, y] = pt(v, i); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.strokeStyle = s.color; c.lineWidth = 2; c.stroke();
    c.lineTo(x1, h - 16); c.lineTo(pt(0, 0)[0], h - 16); c.closePath(); c.globalAlpha = .13; c.fillStyle = s.color; c.fill(); c.globalAlpha = 1;
  }
}
const push = (k, v) => { hist[k].push(v); if (hist[k].length > HIST) hist[k].shift(); };

// process table
const COLS = [['name', 'Name', ''], ['pid', 'PID', 'num'], ['user', 'User', ''], ['cpu', '% CPU', 'num'], ['mem', 'Memory', 'num'], ['threads', 'Threads', 'num'], ['state', 'State', ''], ['cmd', 'Command', '']];
const head = $('#ptable thead tr');
for (const [k, n, cls] of COLS) { const th = el('th', { class: cls, text: n }); th.append(el('span', { class: 'arr' })); th.onclick = () => { sortDir = sortKey === k ? -sortDir : (k === 'name' || k === 'user' || k === 'cmd' ? 1 : -1); sortKey = k; paintProcs(); }; th.dataset.k = k; head.append(th); }
const STATE = { R: 'Running', S: 'Sleeping', D: 'Waiting', Z: 'Zombie', T: 'Stopped', I: 'Idle', t: 'Tracing' };
function paintProcs() {
  if (!last) return;
  for (const th of head.children) $('.arr', th).textContent = th.dataset.k === sortKey ? (sortDir < 0 ? '▼' : '▲') : '';
  let list = last.procs;
  if (filter) { const f = filter.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(f) || p.cmd.toLowerCase().includes(f) || p.user.includes(f) || String(p.pid) === f); }
  list = [...list].sort((a, b) => { const x = a[sortKey], y = b[sortKey]; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sortDir; });
  $('#pcount').textContent = `${list.length} of ${last.procs.length} processes`;
  const body = $('#ptable tbody'); body.textContent = '';
  const frag = document.createDocumentFragment();
  for (const p of list.slice(0, 600)) {
    const tr = el('tr', { class: p.pid === selPid ? 'sel' : '' });
    tr.append(el('td', { text: p.name, 'data-no-l10n': '' }), el('td', { class: 'num', text: p.pid }), el('td', { text: p.user, 'data-no-l10n': '' }), el('td', { class: 'num', text: p.cpu.toFixed(1) }), el('td', { class: 'num', text: fmtB(p.mem) }), el('td', { class: 'num', text: p.threads }), el('td', { text: STATE[p.state] || p.state }), el('td', { text: p.cmd, title: p.cmd, 'data-no-l10n': '' }));
    tr.onclick = () => { selPid = p.pid; for (const r of body.children) r.classList.remove('sel'); tr.classList.add('sel'); };
    frag.append(tr);
  }
  body.append(frag);
}
$('#filter').oninput = (e) => { filter = e.target.value.trim(); paintProcs(); };
async function sig(force) {
  if (!selPid) return; const p = last && last.procs.find((x) => x.pid === selPid);
  if (!p) return;
  const c = await ask({ type: force ? 'warning' : 'question', message: `${force ? 'Force quit' : 'Quit'} “${p.name}” (${p.pid})?`, detail: force ? 'Unsaved work in it will be lost.' : '', buttons: ['Cancel', force ? 'Force Quit' : 'Quit'], defaultId: 0, cancelId: 0 });
  if (c.response !== 1) return;
  const r = await api.invoke('proc:signal', selPid, force); if (!r.ok) ask({ type: 'error', message: 'That program couldn’t be stopped.', detail: r.error, buttons: ['OK'] });
}
$('#quit').onclick = () => sig(false); $('#kill').onclick = () => sig(true);

function meter(pct) { const i = el('i'); i.style.width = Math.min(100, pct) + '%'; if (pct > 90) i.className = 'crit'; else if (pct > 75) i.className = 'hot'; return el('div', { class: 'meter' }, i); }

function paint() {
  const s = last; if (!s) return;
  if (cur === 'procs') paintProcs();
  if (cur === 'cpu') {
    $('#cpumodel').textContent = s.cpu.model;
    chart($('#cpuchart'), [{ data: hist.cpu, color: css('--accent2') }], 100, (v) => Math.round(v) + '%');
    const cores = $('#cores'); cores.textContent = '';
    s.cpu.cores.forEach((p, i) => cores.append(el('div', { class: 'core' }, el('div', { text: `Core ${i + 1}  ${p.toFixed(0)}%` }), meter(p))));
    const st = $('#cpustats'); st.textContent = '';
    st.append(stat('Usage', s.cpu.total.toFixed(1) + '%'), stat('Speed', s.cpu.mhz ? (s.cpu.mhz / 1000).toFixed(2) + ' GHz' : '—'), stat('Load average', s.cpu.load.map((x) => x.toFixed(2)).join('  ')), stat('Processes', s.procs.length), stat('Up for', fmtUp(s.cpu.uptime)));
  }
  if (cur === 'mem') {
    chart($('#memchart'), [{ data: hist.mem, color: css('--accent2') }, { data: hist.swap, color: css('--warn') }], s.mem.total, fmtB);
    const m = s.mem, st = $('#memstats'); st.textContent = '';
    st.append(stat('In use', fmtB(m.used)), stat('Available', fmtB(m.available)), stat('Cached', fmtB(m.cached)), stat('Total', fmtB(m.total)), stat('Swap used', m.swapTotal ? `${fmtB(m.swapUsed)} of ${fmtB(m.swapTotal)}` : 'No swap'));
    const bar = $('#membar'); bar.textContent = '';
    for (const [v, c] of [[m.used - 0, css('--accent2')], [m.cached, css('--warn')]]) { const i = el('i'); i.style.width = (v / m.total * 100) + '%'; i.style.background = c; bar.append(i); }
  }
  if (cur === 'disk') {
    chart($('#diskchart'), [{ data: hist.dr, color: css('--good') }, { data: hist.dw, color: css('--bad') }], 0, fmtR);
    const st = $('#diskstats'); st.textContent = ''; st.append(stat('Reading', fmtR(s.diskIO.read)), stat('Writing', fmtR(s.diskIO.write)));
    const l = $('#fslist'); l.textContent = '';
    for (const f of s.fs) l.append(el('div', { class: 'row' }, el('div', { class: 'top' }, el('b', { text: f.mount }), el('span', { text: `${fmtB(f.used)} of ${fmtB(f.total)} · ${f.device}` })), meter(f.total ? f.used / f.total * 100 : 0)));
  }
  if (cur === 'net') {
    chart($('#netchart'), [{ data: hist.rx, color: css('--good') }, { data: hist.tx, color: css('--bad') }], 0, fmtR);
    const st = $('#netstats'); st.textContent = ''; st.append(stat('Receiving', fmtR(s.net.rx)), stat('Sending', fmtR(s.net.tx)));
    const l = $('#iflist'); l.textContent = '';
    for (const i of s.net.ifaces) l.append(el('div', { class: 'row' }, el('div', { class: 'top' }, el('b', { text: i.name }), el('span', { text: `↓ ${fmtB(i.rxTotal)} total · ↑ ${fmtB(i.txTotal)} total` })), el('div', { class: 'dim', text: `↓ ${fmtR(i.rx)}   ↑ ${fmtR(i.tx)}` })));
  }
  if (cur === 'gpu') {
    const l = $('#gpulist'); l.textContent = '';
    if (!s.gpu.length) l.append(el('div', { class: 'empty', text: 'No graphics card usage is reported by this computer’s driver.' }));
    for (const g of s.gpu) l.append(el('div', { class: 'row' }, el('div', { class: 'top' }, el('b', { text: g.name }), el('span', { text: [g.temp != null ? g.temp + ' °C' : '', g.memTotal ? `${fmtB(g.memUsed)} of ${fmtB(g.memTotal)} memory` : ''].filter(Boolean).join(' · ') })), meter(g.util), el('div', { class: 'dim', text: g.util + '% busy' })));
  }
  if (cur === 'sens') {
    const l = $('#senslist'); l.textContent = ''; const x = s.sensors;
    for (const b of x.battery) l.append(el('div', { class: 'row' }, el('div', { class: 'top' }, el('b', { text: 'Battery' }), el('span', { text: `${b.status}${b.watts ? ' · ' + b.watts.toFixed(1) + ' W' : ''}` })), meter(100 - b.percent === 100 ? 0 : b.percent), el('div', { class: 'dim', text: b.percent + '%' })));
    for (const t of x.temps) l.append(el('div', { class: 'row' }, el('div', { class: 'top' }, el('b', { text: t.name }), el('span', { text: t.c.toFixed(0) + ' °C' })), meter(t.c)));
    for (const f of x.fans) l.append(el('div', { class: 'row' }, el('div', { class: 'top' }, el('b', { text: f.name }), el('span', { text: f.rpm + ' rpm' }))));
    if (!x.battery.length && !x.temps.length && !x.fans.length) l.append(el('div', { class: 'empty', text: 'This computer doesn’t report temperatures, fans or battery.' }));
  }
}
api.on('sample', (s) => {
  last = s; push('cpu', s.cpu.total); push('mem', s.mem.used); push('swap', s.mem.swapUsed); push('rx', s.net.rx); push('tx', s.net.tx); push('dr', s.diskIO.read); push('dw', s.diskIO.write);
  paint();
});
addEventListener('resize', () => last && paint());

'use strict';
const $ = (id) => document.getElementById(id);
const jobsEl = $('jobs');
const rows = new Map();

function midTruncate(s, n = 60) {
  return s.length <= n ? s : `${s.slice(0, n / 2 - 1)}…${s.slice(-(n / 2))}`;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function makeRow(j) {
  const row = el('div', 'job');
  const top = el('div', 'job-top');
  const name = el('span', 'job-name');
  const btns = el('span', 'job-btns');
  top.append(name, btns);
  const sub = el('div', 'job-sub');
  const rail = el('div', 'rail');
  const fill = el('div', 'fill'); const knob = el('div', 'knob');
  rail.append(fill, knob);
  row.append(top, sub, rail);
  jobsEl.append(row);
  document.body.classList.add('has-jobs');
  const r = { row, name, btns, sub, fill, knob };
  rows.set(j.id, r);
  return r;
}

function verb(j, past) {
  if (j.kind === 'extract') return past ? 'Unpacked' : 'Unpacking';
  return past ? 'Bundled' : 'Bundling';
}

function render(j) {
  const r = rows.get(j.id) || makeRow(j);
  r.row.className = `job ${j.state}`;
  r.name.textContent = j.name;
  r.btns.replaceChildren();
  const pct = Math.round(Math.min(1, Math.max(0, j.ratio)) * 100);
  r.fill.style.width = `${pct}%`;
  r.knob.style.left = `${pct}%`;

  if (j.state === 'queued') {
    r.sub.textContent = 'Waiting…';
    addBtn(r, 'Cancel', () => window.bundler.cancel(j.id));
  } else if (j.state === 'running') {
    r.sub.textContent = `${verb(j)} · ${pct}%${j.detail ? ' · ' + midTruncate(j.detail.replace(/\/$/, '')) : ''}`;
    addBtn(r, 'Cancel', () => window.bundler.cancel(j.id));
  } else if (j.state === 'done') {
    const leaf = j.resultPath ? j.resultPath.split('/').pop() : '';
    r.sub.textContent = `${verb(j, true)} to ${leaf}${j.note ? ' · ' + j.note : ''}`;
    addBtn(r, 'Show', () => window.bundler.reveal(j.resultPath));
  } else if (j.state === 'cancelled') {
    r.sub.textContent = 'Cancelled. Nothing was left behind.';
  } else if (j.state === 'error') {
    r.sub.textContent = j.error || 'Something went wrong.';
  }
}

function addBtn(r, label, fn) {
  const b = el('button', 'small', label);
  b.addEventListener('click', fn);
  r.btns.append(b);
}

/* drag and drop */
let depth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; document.body.classList.add('dragging'); });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; document.body.classList.remove('dragging'); } });
window.addEventListener('drop', (e) => {
  e.preventDefault(); depth = 0; document.body.classList.remove('dragging');
  const paths = window.bundler.pathsFromFiles(e.dataTransfer.files);
  if (paths.length) window.bundler.submit(paths, 'auto');
});

$('btn-unpack').addEventListener('click', () => window.bundler.pick('unpack'));
$('btn-bundle').addEventListener('click', () => window.bundler.pick('bundle'));
$('btn-pack').addEventListener('click', () => window.bundler.pick('pack'));

/* settings + banner */
function wireSetting(id, key, isCheck = true) {
  const input = $(id);
  input.addEventListener('change', () => window.bundler.setSetting(key, isCheck ? input.checked : input.value));
  return input;
}

(async () => {
  const state = await window.bundler.getState();
  $('opt-reveal').checked = state.settings.revealWhenDone;
  $('opt-collapse').checked = state.settings.collapseSameName;
  $('opt-format').value = state.settings.format;
  wireSetting('opt-reveal', 'revealWhenDone');
  wireSetting('opt-collapse', 'collapseSameName');
  wireSetting('opt-format', 'format', false);

  state.jobs.forEach(render);
  window.bundler.onJob(render);

  if (!state.settings.defaultAsked && state.jobs.length === 0) $('banner').hidden = false;
  $('banner-yes').addEventListener('click', async () => { await window.bundler.makeDefault(); $('banner').hidden = true; });
  $('banner-no').addEventListener('click', () => { window.bundler.setSetting('defaultAsked', true); $('banner').hidden = true; });
  window.bundler.onDefaultResult(() => { $('banner').hidden = true; });
})();

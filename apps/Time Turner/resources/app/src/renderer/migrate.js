'use strict';
/* Migration Assistant: documents, accounts, settings and apps from another computer (a Time Turner backup,
   or another computer's palOS or Windows disk) onto this one. The copying is done by time-turnerd. */
const api = window.migration;
const $ = (s) => document.querySelector(s);
const S = { step: 'welcome', sources: null, src: null, token: null, snapshots: [], snapshot: null, contents: null, plan: null, me: '', busy: false };

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
  return e;
}
const err = (t) => { $('#err').textContent = t || ''; };
const msgOf = (e) => (e && e.message ? e.message.replace(/^Error invoking remote method[^:]*:\s*/, '') : String(e || ''));
function humanSize(n) { if (!n) return ''; const u = ['bytes', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (n >= 1000 && i < 4) { n /= 1000; i++; } return `${n >= 100 ? Math.round(n) : n.toFixed(1)} ${u[i]}`; }
const when = (t) => new Date(t).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

function buttons({ back = true, next = 'Continue', nextOn = true, alt = null } = {}) {
  $('#back').hidden = !back; $('#next').textContent = next; $('#next').disabled = !nextOn;
  $('#alt').hidden = !alt; if (alt) $('#alt').textContent = alt;
}

// ------------------------------------------------------------------ steps
const steps = {
  welcome() {
    $('#title').textContent = 'Migration Assistant';
    $('#body').replaceChildren(
      el('p', { text: 'Migration Assistant brings documents, accounts, settings and apps from another computer to this one.' }),
      el('p', { text: 'You can bring them from a Time Turner backup, or from the other computer’s disk: another palOS computer, or a Windows PC (its Desktop, Documents, Downloads, Music, Pictures and Videos).' }),
      el('p', { text: 'Connect the backup drive or the other computer’s disk now, then click Continue. Nothing on it is changed.' }));
    buttons({ back: false });
  },

  async source() {
    $('#title').textContent = 'Where are your things now?';
    $('#body').replaceChildren(el('p', {}, el('span', { class: 'spin' }), 'Looking for backups and disks…'));
    buttons({ nextOn: false, alt: 'Look Again' });
    try { S.sources = await api.sources(); } catch (e) { S.sources = { backups: [], disks: [], accounts: [] }; err(msgOf(e)); }
    if (S.step !== 'source') return;
    const list = el('div', { class: 'list', role: 'radiogroup', 'aria-label': 'Source' });
    const add = (key, icon, title, sub) => {
      const id = 'src-' + key;
      const r = el('input', { type: 'radio', name: 'src', id, value: key, onchange: () => { S.src = key; $('#next').disabled = false; } });
      if (S.src === key) r.checked = true;
      list.append(el('label', { class: 'opt', for: id }, r, el('img', { class: 'ic', src: icon, alt: '' }), el('div', { class: 'lbl' }, el('div', { class: 't', text: title }), el('div', { class: 's', text: sub }))));
    };
    for (const b of S.sources.backups) add('backup:' + b.uuid, '../assets/icon.png', `Time Turner backup on ${b.label}`, [humanSize(b.size), b.removable ? 'External drive' : 'Internal disk'].filter(Boolean).join(' · '));
    for (const d of S.sources.disks) {
      const who = d.people.map((p) => p.name).join(', ');
      add('disk:' + d.uuid, d.kind === 'windows' ? '../assets/disk-windows.png' : '../assets/disk-palos.png',
        `${d.kind === 'windows' ? 'Windows' : 'palOS'} disk: ${d.label}`, `${who}${d.apps && d.apps.length ? ` · ${d.apps.length} app${d.apps.length > 1 ? 's' : ''}` : ''}`);
    }
    if (!list.children.length) list.append(el('div', { class: 'empty', text: 'No backups or other computers’ disks were found. Connect one, then click Look Again.' }));
    $('#body').replaceChildren(el('p', { text: 'Choose where to bring your things from.' }), list);
    $('#next').disabled = !S.src || !list.querySelector('input:checked');
  },

  key() {
    $('#title').textContent = 'Enter the backup’s recovery key';
    const f = el('input', { type: 'text', id: 'rkey', 'aria-label': 'Recovery key', spellcheck: 'false', style: 'width:100%' });
    $('#body').replaceChildren(el('p', { text: 'These backups were made by an earlier Time Turner. Type the recovery key you saved when you set it up.' }), f);
    buttons({ nextOn: true }); f.focus();
  },

  point() {
    $('#title').textContent = 'Which backup?';
    const sel = el('select', { id: 'snap', 'aria-label': 'Backup', onchange: (e) => { S.snapshot = e.target.value; } });
    const sorted = [...S.snapshots].sort((a, b) => new Date(b.time) - new Date(a.time));
    for (const s of sorted) sel.append(el('option', { value: s.id, text: `${when(s.time)}${s.host ? ' — ' + s.host : ''}` }));
    S.snapshot = S.snapshot || (sorted[0] && sorted[0].id);
    sel.value = S.snapshot || '';
    $('#body').replaceChildren(el('p', { text: 'Choose the backup to bring things from. The newest one is usually right.' }), sel);
    buttons({ nextOn: !!sorted.length });
  },

  async what() {
    $('#title').textContent = 'Select what to bring over';
    const c = S.contents;
    const accounts = (S.sources.accounts || []);
    const isWin = c.kind === 'windows';
    S.plan = S.plan || {
      people: (() => {
        // the same name goes into the same account; the first other person goes into yours; anyone else gets a new account
        const used = new Set();
        const norm = (n) => n.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const rows = c.people.map((p) => {
          const same = accounts.find((a) => a.name.toLowerCase() === norm(p.name));
          if (same) used.add(same.name);
          return { from: p.name, on: true, to: same ? same.name : null, create: { name: norm(p.name).slice(0, 32) || 'user', fullName: p.name, password: '' } };
        });
        for (const r of rows) if (!r.to) { if (!used.has(S.me) && accounts.some((a) => a.name === S.me)) { r.to = S.me; used.add(S.me); } else r.to = '+new'; }
        return rows;
      })(),
      settings: !isWin, apps: new Set(c.apps || []),
    };
    const box = el('div');
    box.append(el('h2', { text: 'People' }));
    const pl = el('div', { class: 'list' });
    if (!c.people.length) pl.append(el('div', { class: 'empty', text: 'No one’s home folder was found here.' }));
    S.plan.people.forEach((p, i) => {
      const cb = el('input', { type: 'checkbox', id: 'p' + i, onchange: (e) => { p.on = e.target.checked; draw(); } }); cb.checked = p.on;
      const sel = el('select', { 'aria-label': `Bring ${p.from}’s things into`, onchange: (e) => { p.to = e.target.value; draw(); } });
      for (const a of accounts) sel.append(el('option', { value: a.name, text: `Into ${a.fullName}${a.name === S.me ? ' (you)' : ''}` }));
      sel.append(el('option', { value: '+new', text: 'Into a new account…' }));
      sel.value = p.to; sel.disabled = !p.on;
      pl.append(el('div', { class: 'opt' }, cb, el('label', { class: 'lbl', for: 'p' + i }, el('div', { class: 't', text: p.from }),
        el('div', { class: 's', text: isWin ? 'Desktop, Documents, Downloads, Music, Pictures, Videos' : 'Home folder' })), sel));
      if (p.on && p.to === '+new') {
        const inp = (k, type, label) => { const x = el('input', { type, 'aria-label': label, value: p.create[k] || '', oninput: (e) => { p.create[k] = e.target.value; check(); } }); return [el('label', { text: label }), x]; };
        pl.append(el('div', { class: 'newacct' }, ...inp('fullName', 'text', 'Full name'), ...inp('name', 'text', 'Account name'), ...inp('password', 'password', 'Password')));
      }
    });
    box.append(pl);
    if (!isWin) {
      box.append(el('h2', { text: 'Settings' }));
      const st = el('input', { type: 'checkbox', id: 'settings', onchange: (e) => { S.plan.settings = e.target.checked; } }); st.checked = S.plan.settings;
      box.append(el('div', { class: 'list' }, el('label', { class: 'opt', for: 'settings' }, st, el('div', { class: 'lbl' }, el('div', { class: 't', text: 'Settings and app data' }), el('div', { class: 's', text: 'Each person’s desktop, Dock, app settings, mail and browser data' })))));
    }
    if ((c.apps || []).length) {
      box.append(el('h2', { text: 'Applications' }));
      const al = el('div', { class: 'list' });
      c.apps.forEach((n, i) => {
        const cb = el('input', { type: 'checkbox', id: 'a' + i, onchange: (e) => { if (e.target.checked) S.plan.apps.add(n); else S.plan.apps.delete(n); check(); } }); cb.checked = S.plan.apps.has(n);
        al.append(el('label', { class: 'opt', for: 'a' + i }, cb, el('div', { class: 'lbl' }, el('div', { class: 't', text: n.replace(/\.app$/, '') }))));
      });
      box.append(al, el('p', { text: 'Apps already on this computer are left as they are.' }));
    }
    box.append(el('p', { text: 'Files that would replace ones already in an account are kept in a “Before Migration” folder in that home folder.' }));
    $('#body').replaceChildren(box);
    buttons({ next: 'Continue' });
    check();
  },

  progress() {
    $('#title').textContent = 'Bringing your things over';
    $('#body').replaceChildren(el('p', { id: 'ptext', role: 'status', 'aria-live': 'polite', text: 'Starting…' }), el('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Progress' }, el('div', { id: 'pbar' })),
      el('p', { text: 'This can take a while, depending on how much there is. Keep the source connected and this computer awake.' }));
    buttons({ back: false, next: 'Stop', nextOn: true });
  },

  done() {
    $('#title').textContent = 'Your things are here';
    const p = S.result || {};
    $('#body').replaceChildren(el('p', { text: `Migration Assistant finished.${(p.people || []).length ? ` Log in as ${(p.people || []).join(', ')} to find everything where it was.` : ''}` }),
      el('p', { text: 'Anything an account already had that was replaced is in its “Before Migration” folder.' }));
    buttons({ back: false, next: 'Quit' });
  },

  failed() {
    $('#title').textContent = S.cancelled ? 'Migration stopped' : 'Migration couldn’t finish';
    $('#body').replaceChildren(el('p', { text: S.cancelled ? 'What was already brought over stays on this computer.' : (S.failText || 'Something went wrong.') }),
      el('p', { text: 'You can go back and try again.' }));
    buttons({ back: true, next: 'Quit' });
  },
};

function check() {
  if (S.step !== 'what') return;
  const people = S.plan.people.filter((p) => p.on);
  const okNew = people.filter((p) => p.to === '+new').every((p) => /^[a-z_][a-z0-9_-]{0,31}$/.test(p.create.name) && p.create.password.length >= 1);
  $('#next').disabled = !(people.length || S.plan.apps.size) || !okNew;
}
function draw() { err(''); steps[S.step](); }
function go(step) { S.step = step; err(''); steps[step](); }

const ORDER = ['welcome', 'source', 'key', 'point', 'what'];
$('#back').onclick = () => {
  if (S.busy) return;
  if (S.step === 'failed') return go('what');
  if (S.step === 'what') { S.plan = null; return go(S.token ? 'point' : 'source'); }
  if (S.step === 'point' || S.step === 'key') return go('source');
  const i = ORDER.indexOf(S.step); if (i > 0) go(ORDER[i - 1]);
};
$('#alt').onclick = () => { if (S.step === 'source') go('source'); };
$('#next').onclick = async () => {
  if (S.busy) return;
  const st = S.step;
  try {
    S.busy = true; $('#next').disabled = true;
    if (st === 'welcome') return go('source');
    if (st === 'source' || st === 'key') {
      const [kind, uuid] = S.src.split(/:(.*)/);
      S.token = null; S.plan = null; S.snapshot = null;
      if (kind === 'disk') {
        const d = S.sources.disks.find((x) => x.uuid === uuid);
        S.contents = { kind: d.kind, people: d.people, apps: d.apps || [] };
        return go('what');
      }
      try {
        const r = await api.openBackup(uuid, st === 'key' ? $('#rkey').value.trim() : '');
        S.token = r.token; S.snapshots = r.snapshots || [];
        return go('point');
      } catch (e) {
        if (e.code === 'needs-key' || (st === 'key' && e.code === 'wrong-key')) { go('key'); if (st === 'key') err('That recovery key doesn’t open these backups.'); return; }
        throw e;
      }
    }
    if (st === 'point') {
      S.snapshot = $('#snap').value;
      $('#body').append(el('p', {}, el('span', { class: 'spin' }), 'Looking inside the backup…'));
      const c = await api.contents(S.token, S.snapshot);
      S.contents = { kind: 'palos', people: c.people || [], apps: c.apps || [] };
      return go('what');
    }
    if (st === 'what') {
      const people = S.plan.people.filter((p) => p.on).map((p) => p.to === '+new'
        ? { from: p.from, to: p.create.name, create: { fullName: p.create.fullName, password: p.create.password } }
        : { from: p.from, to: p.to });
      const source = S.token ? { type: 'backup', token: S.token, snapshot: S.snapshot } : { type: 'disk', uuid: S.src.split(/:(.*)/)[1] };
      go('progress');
      await api.start({ source, people, settings: !!S.plan.settings, apps: [...S.plan.apps] });
      return;
    }
    if (st === 'progress') { await api.cancel(); $('#ptext').textContent = 'Stopping…'; return; }
    if (st === 'done' || st === 'failed') return api.close();
  } catch (e) {
    err(msgOf(e));
    if (st === 'what') go('what');
  } finally {
    S.busy = false;
    if (S.step === st && st !== 'progress' && st !== 'done' && st !== 'failed') { if (st === 'what') check(); else $('#next').disabled = false; }
    else if (S.step === 'progress') $('#next').disabled = false;
  }
};

api.onEvent((ev) => {
  if (!ev || ev.type !== 'migration') return;
  if (ev.phase === 'running' && S.step === 'progress') {
    if (ev.text) $('#ptext').textContent = ev.text;
    $('#pbar').style.width = (ev.percent || 0) + '%';
  } else if (ev.phase === 'done') { S.result = ev; go('done'); }
  else if (ev.phase === 'failed' || ev.phase === 'cancelled') { S.cancelled = ev.phase === 'cancelled'; S.failText = ev.text; go('failed'); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'SELECT' && !$('#next').disabled) $('#next').click(); });

api.whoami().then((u) => { S.me = u; }).catch(() => {});
go('welcome');

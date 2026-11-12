'use strict';
/* Parental Controls: a parent manages a child's account (screen time, bedtime, apps and the Store, websites) and
   sees what the child did with the computer. Changes need a parent's (administrator's) password once. */

const LIMITS = [{ value: 0, label: 'No limit' }, { value: 30, label: '30 minutes' }, { value: 60, label: '1 hour' }, { value: 90, label: '1½ hours' },
  { value: 120, label: '2 hours' }, { value: 180, label: '3 hours' }, { value: 240, label: '4 hours' }, { value: 360, label: '6 hours' }];
const times = (from, to) => { const o = []; for (let m = from; m <= to; m += 30) { const h = Math.floor(m / 60) % 24, mm = m % 60; const v = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; o.push({ value: v, label: clock(v) }); } return o; };
function clock(v) { const [h, m] = v.split(':').map(Number); const d = new Date(2000, 0, 1, h, m); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
const BED_FROM = times(17 * 60, 23 * 60 + 30), BED_TO = times(5 * 60, 11 * 60);
function dur(sec) { const m = Math.round(sec / 60); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h`; }
let parentalChild = null;

panel('parental', 'Parental Controls', 'sys', async (root, stale) => {
  const info = await sys.call('parental:list');
  if (stale()) return;
  if (!info.accounts.length) {
    root.append(note('Parental Controls are for the other people who use this computer. Add an account for your child in Users first; it should be a Standard account, not an Administrator.'),
      el('div', { class: 'actions' }, button('Open Users', () => show('users'))));
    return;
  }
  if (!info.iAmAdmin) root.append(note('Only a parent (an administrator of this computer) can change Parental Controls.'));
  if (!info.running) root.append(note('The Parental Controls service isn’t running, so these rules aren’t being enforced right now. Restarting the computer starts it.'));
  if (!parentalChild || !info.accounts.some((a) => a.name === parentalChild)) parentalChild = (info.accounts.find((a) => a.enabled) || info.accounts[0]).name;
  const kid = info.accounts.find((a) => a.name === parentalChild);
  const r = await sys.call('parental:get', kid.name);
  if (stale()) return;

  const save = async (patch, again = false) => {
    const next = { ...r, ...patch };
    const res = await sys.call('parental:set', kid.name, next);
    if (!res || !res.ok) { if (!res || !res.cancelled) toast((res && res.error) || 'Parental Controls couldn’t be saved.'); refresh(); return false; }
    Object.assign(r, res.rules || next);
    if (res.madeStandard) toast(`${kid.fullName} is now a Standard account: the palOS Store will ask a parent before installing anything.`, 5000);
    if (again) refresh();
    return true;
  };

  root.append(card(
    row('Account', null, select(info.accounts.map((a) => ({ value: a.name, label: a.fullName + (a.enabled ? ' · on' : '') })), kid.name, (v) => { parentalChild = v; refresh(); }, 'Account')),
    row('Parental Controls', r.enabled ? `On for ${kid.fullName}` : `Off: ${kid.fullName} can use the computer without limits`,
      toggle(r.enabled, (v) => save({ enabled: v }, true), 'Parental Controls'))));
  if (kid.admin && !r.enabled) root.append(note(`${kid.fullName} is an Administrator now. Turning Parental Controls on makes the account a Standard one, so it can’t change these rules or install apps without you.`));
  if (!r.enabled) return;

  // ---- screen time
  root.append(heading('Screen Time'), card(
    row('School Days', 'Monday to Friday. Only time spent using the computer counts.', select(LIMITS, r.screenTime.weekday, (v) => save({ screenTime: { ...r.screenTime, weekday: Number(v) } }), 'School-day limit')),
    row('Weekends', 'Saturday and Sunday', select(LIMITS, r.screenTime.weekend, (v) => save({ screenTime: { ...r.screenTime, weekend: Number(v) } }), 'Weekend limit')),
    row('Bedtime', r.bedtime.enabled ? `No computer from ${clock(r.bedtime.from)} until ${clock(r.bedtime.to)}` : 'Off', toggle(r.bedtime.enabled, (v) => save({ bedtime: { ...r.bedtime, enabled: v } }, true), 'Bedtime')),
    ...(r.bedtime.enabled ? [row('From', null, select(BED_FROM, r.bedtime.from, (v) => save({ bedtime: { ...r.bedtime, from: v } }, true), 'Bedtime starts')),
      row('Until', null, select(BED_TO, r.bedtime.to, (v) => save({ bedtime: { ...r.bedtime, to: v } }, true), 'Bedtime ends'))] : [])));
  root.append(note(`${kid.fullName} gets a warning 10 minutes and 1 minute before the time is up, then is logged out. Outside the allowed hours the login screen says when the computer can be used again.`));

  // ---- apps & the Store
  const appsMode = r.apps.mode;
  const appCard = card(
    row('Apps', appsMode === 'allowed' ? 'Only the apps ticked below open' : 'Every app opens',
      seg([{ value: 'all', label: 'All Apps' }, { value: 'allowed', label: 'Only These Apps' }], appsMode, (v) => save({ apps: { ...r.apps, mode: v } }, true), 'Apps')),
    row('palOS Store', `Downloads need a parent’s password: ${kid.fullName} is a Standard account.`, el('span', { class: 'badge', text: 'Ask a parent' })));
  root.append(heading('Apps & the Store'), appCard);
  if (appsMode === 'allowed') {
    const allowed = new Set(r.apps.allowed);
    const grid = el('div', { class: 'appgrid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '6px 16px', padding: '10px 14px' } });
    for (const a of info.apps) {
      const cb = el('input', { type: 'checkbox' });
      cb.checked = allowed.has(a.id) || allowed.has(a.name);
      cb.addEventListener('change', () => { if (cb.checked) allowed.add(a.id); else { allowed.delete(a.id); allowed.delete(a.name); } save({ apps: { ...r.apps, allowed: [...allowed] } }); });
      grid.append(el('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, cb, el('span', { text: a.name + (a.folder ? ` (${a.folder})` : '') })));
    }
    root.append(el('div', { class: 'card' }, grid), note('Apps that aren’t ticked don’t open for this account, wherever they’re started from.'));
  }

  // ---- websites
  const w = r.web;
  const listBox = (label, key, hint) => {
    const ta = el('textarea', { rows: 4, placeholder: hint, style: { width: '100%', boxSizing: 'border-box', font: 'inherit', padding: '8px', borderRadius: '8px' } });
    ta.value = (w[key] || []).join('\n');
    ta.addEventListener('change', () => save({ web: { ...w, [key]: ta.value.split(/[\s,]+/).filter(Boolean) } }));
    return el('div', { style: { padding: '10px 14px' } }, el('div', { class: 'n', text: label, style: { marginBottom: '6px', fontWeight: '600' } }), ta);
  };
  const webSub = { off: 'No filtering', adult: 'Adult websites and known dangerous sites are blocked; Google, Bing and YouTube use SafeSearch', allowlist: 'Only the websites in the list below open' }[w.mode];
  root.append(heading('Websites'), card(
    row('Filtering', webSub, seg([{ value: 'off', label: 'Off' }, { value: 'adult', label: 'Limit Adult Websites' }, { value: 'allowlist', label: 'Only These' }], w.mode, (v) => save({ web: { ...w, mode: v } }, true), 'Website filtering')),
    ...(w.mode === 'allowlist' ? [listBox('Allowed websites', 'allow', 'one per line, like wikipedia.org')] : []),
    ...(w.mode !== 'off' ? [listBox('Always blocked', 'block', 'one per line, like example.com')] : [])));
  if (w.mode !== 'off') root.append(note('Filtering works in every app on this account, including Firefox, whose private DNS and proxy settings are locked while it’s on.'));

  // ---- activity
  const rep = await sys.call('parental:report', kid.name, 7);
  if (stale()) return;
  root.append(heading('Activity'));
  if (!rep.readable) { root.append(note('Only a parent (an administrator) can see the activity report.')); return; }
  const today = rep.days[rep.days.length - 1];
  const lim = new Date().getDay() % 6 === 0 ? r.screenTime.weekend : r.screenTime.weekday;
  const max = Math.max(60 * 60, ...rep.days.map((d) => d.seconds));
  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const bars = el('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px', padding: '12px 14px 4px' } },
    ...rep.days.map((d) => el('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' } },
      el('div', { title: dur(d.seconds), style: { width: '100%', maxWidth: '34px', height: `${Math.max(2, (d.seconds / max) * 90)}px`, borderRadius: '5px 5px 2px 2px', background: d === today ? 'var(--accent, #2f7cf6)' : 'color-mix(in srgb, var(--accent, #2f7cf6) 45%, transparent)' } }),
      el('div', { text: DAY[d.weekday], style: { fontSize: '11px', opacity: '.7' } }))));
  const top = (obj, n, fmt) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => row(k, null, el('span', { class: 'badge', text: fmt(v) })));
  root.append(card(row('Today', lim ? `${dur(today.seconds)} of ${dur(lim * 60)}` : dur(today.seconds) + ' (no limit)', el('span', { class: 'badge', text: lim ? `${dur(Math.max(0, lim * 60 - today.seconds))} left` : '' })), bars));
  const appsRows = top(rep.apps, 8, dur), siteRows = top(rep.sites, 12, (v) => `${v} visit${v === 1 ? '' : 's'}`);
  root.append(heading('Apps Used This Week'), appsRows.length ? card(...appsRows) : note('Nothing yet.'));
  root.append(heading('Websites Visited This Week'), siteRows.length ? card(...siteRows) : note(w.mode === 'off' ? 'Websites are recorded while filtering is on.' : 'Nothing yet.'));
});

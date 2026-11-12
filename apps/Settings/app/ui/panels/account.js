'use strict';
/* Users, Date & Time, and Power panels. */

function avatar(u, small) {
  const a = el('div', { class: 'avatar' + (small ? ' small' : '') });
  if (u.picture) a.append(el('img', { src: fileURL(u.picture) + '?t=' + Date.now(), alt: '' }));
  else a.textContent = (u.fullName || u.name).trim().charAt(0).toUpperCase();
  return a;
}

panel('users', 'Users', 'sys', async (root, stale) => {
  const { users, canAdmin } = await sys.call('users:get');
  if (stale()) return;
  const me = users.find((u) => u.me) || users[0];
  if (me) {
    const pic = avatar(me);
    const change = button('Change Picture…', async () => {
      const f = await sys.call('users:pickPicture');
      if (!f) return;
      const r = await sys.call('users:picture', f);
      if (r.ok) refresh(); else toast(r.error || 'The picture couldn\'t be changed.');
    }, 'small');
    root.append(card(el('div', { class: 'me' }, pic, el('div', { class: 'who' }, el('div', { class: 'n', text: me.fullName }), el('div', { class: 'u', text: `${me.name} · ${me.admin ? 'Administrator' : 'Standard account'}` })), change),
      row('Full Name', null, button('Change…', async () => {
        const v = await dialog({ title: 'Change Your Name', fields: [{ name: 'n', label: 'Full name', value: me.fullName }], ok: 'Change',
          check: async (v) => { if (!v.n.trim()) return 'Type a name.'; const r = await sys.call('users:fullName', v.n.trim()); return r.ok ? null : r.error; } });
        if (v) refresh();
      }, 'small')),
      row('Password', 'Used to sign in, unlock the screen and approve changes', button('Change…', async () => {
        const v = await dialog({ title: 'Change Your Password', fields: [{ name: 'old', label: 'Current password', type: 'password' }, { name: 'n1', label: 'New password', type: 'password' }, { name: 'n2', label: 'Type the new password again', type: 'password' }], ok: 'Change Password',
          check: async (v) => {
            if (!v.old) return 'Type your current password.';
            if (v.n1.length < 8) return 'Choose a new password at least 8 characters long.';
            if (v.n1 !== v.n2) return 'The two new passwords don\'t match.';
            if (v.n1 === v.old) return 'The new password has to be different from the current one.';
            const r = await sys.call('users:password', v.old, v.n1);
            return r.ok ? null : r.error;
          } });
        if (v) toast('Password changed.');
      }, 'small'))));
  }

  const others = users.filter((u) => !u.me);
  const otherRow = (u) => {
    const ctl = [];
    if (canAdmin) {
      ctl.push(button(u.admin ? 'Make Standard' : 'Make Administrator', async () => {
        const r = await sys.call('users:admin', 'set-admin', u.name, u.admin ? 'no' : 'yes');
        if (!r.ok && !r.cancelled) toast(r.error, 5000);
        refresh();
      }, 'small'));
      ctl.push(button('Remove…', async () => {
        const v = await dialog({ title: `Remove ${u.fullName}?`, text: 'They won\'t be able to sign in any more.', danger: true, ok: 'Remove Account',
          fields: [{ name: 'keep', type: 'checkbox', label: `Keep their files (${u.home})`, value: true }] });
        if (!v) return;
        const r = await sys.call('users:admin', 'remove', u.name, v.keep ? 'keep' : 'delete');
        if (!r.ok && !r.cancelled) toast(r.error, 5000);
        refresh();
      }, 'small danger'));
    }
    const r = row(u.fullName, `${u.name} · ${u.admin ? 'Administrator' : 'Standard account'}`, ...ctl);
    r.prepend(avatar(u, true));
    return r;
  };
  root.append(heading('Other Accounts'),
    card(...(others.length ? others.map(otherRow) : [el('div', { class: 'empty', text: 'Nobody else has an account on this computer.' })])));
  if (canAdmin) {
    root.append(el('div', { style: { marginTop: '12px' } }, button('Add Account…', async () => {
      const v = await dialog({ title: 'Add an Account', text: 'You\'ll be asked for an administrator password.', ok: 'Add Account',
        fields: [{ name: 'full', label: 'Full name' }, { name: 'name', label: 'Account name (lowercase, used to sign in)' },
          { name: 'pw', label: 'Password', type: 'password' }, { name: 'pw2', label: 'Type the password again', type: 'password' },
          { name: 'kind', type: 'select', label: 'Account type', value: 'standard', options: [{ value: 'standard', label: 'Standard' }, { value: 'admin', label: 'Administrator' }] }],
        check: async (v) => {
          if (!v.full.trim()) return 'Type their full name.';
          if (!/^[a-z_][a-z0-9_-]{0,31}$/.test(v.name)) return 'Account names use lowercase letters, numbers, - and _.';
          if (v.pw.length < 4) return 'Choose a longer password.';
          if (v.pw !== v.pw2) return 'The two passwords don\'t match.';
          const r = await sys.call('users:admin', 'add', v.name, v.full.trim(), v.kind, v.pw);
          if (r.cancelled) return 'An administrator password is needed to add accounts.';
          return r.ok ? null : r.error;
        } });
      if (v) { toast(`Added ${v.full}.`); refresh(); }
    })));
  }
});

/* ---------------------------------------------------------------- date & time */
/* ------------------------------------------------------------ language & region */
function regionPreview(formats) {
  const tag = formats.split('.')[0].replace('_', '-');
  const now = new Date();
  const L = (o) => { try { return new Intl.DateTimeFormat(tag, o).format(now); } catch { return ''; } };
  const N = (n, o) => { try { return new Intl.NumberFormat(tag, o).format(n); } catch { return String(n); } };
  const cur = { 'en-CA': 'CAD', 'fr-CA': 'CAD', 'en-US': 'USD', 'en-GB': 'GBP', 'fr-FR': 'EUR', 'fr-BE': 'EUR', 'fr-CH': 'CHF', 'fr-LU': 'EUR' }[tag] || 'CAD';
  const box = el('div', { class: 'region-preview', 'data-no-l10n': '' },
    el('div', { text: L({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }),
    el('div', { text: L({ year: 'numeric', month: '2-digit', day: '2-digit' }) + '   ' + L({ hour: 'numeric', minute: '2-digit' }) }),
    el('div', { text: N(1234567.89) + '   ' + N(1234.5, { style: 'currency', currency: cur }) + '   ' + N(0.25, { style: 'percent' }) }));
  return box;
}

panel('region', 'Language & Region', 'sys', async (root, stale) => {
  const r = await sys.call('region:get');
  if (stale()) return;
  const state = { language: r.language, region: r.region, keyboard: r.keyboard };
  const logoutRow = el('div');
  const showLogout = () => {
    logoutRow.textContent = '';
    if (state.language !== r.running) {
      logoutRow.append(card(row('Log out to use the new language', 'Apps you open now still use the old one. Your files and windows aren’t affected.',
        button('Log Out Now…', async () => {
          const ok = await dialog({ title: 'Log out now?', text: 'Save your work in other apps first.', ok: 'Log Out', danger: false });
          if (ok !== null) sys.call('region:logout');
        }, 'primary'))));
    }
  };
  const langSel = select(r.languages.map((l) => ({ value: l.id, label: l.native })), state.language, async (v) => {
    state.language = v; const res = await sys.call('region:set', state); if (!res.ok) return toast(res.error || 'That didn’t work.', 4000);
    preview.replaceWith(preview = regionPreview(res.formats)); showLogout();
  }, 'Language');
  langSel.setAttribute('data-no-l10n', '');
  root.append(card(row('Language', 'Menus, apps and messages use this language', langSel)), logoutRow);

  const regSel = select(r.regions.filter((x) => x.available).map((x) => ({ value: x.id, label: x.name })), state.region, async (v) => {
    state.region = v; const res = await sys.call('region:set', state); if (!res.ok) return toast(res.error || 'That didn’t work.', 4000);
    preview.replaceWith(preview = regionPreview(res.formats));
  }, 'Region');
  let preview = regionPreview(r.formats);
  root.append(heading('Region'), card(row('Region', 'Dates, times, numbers, currency and paper size follow this region', regSel), el('div', { class: 'row' }, preview)));

  const kbSel = select(r.keyboards.map((k) => ({ value: k.id, label: k.name })), state.keyboard, async (v) => {
    state.keyboard = v; const res = await sys.call('region:keyboard', v); if (!res.ok) toast(res.error || 'That didn’t work.', 4000); else toast('Keyboard layout changed');
  }, 'Keyboard layout');
  root.append(heading('Keyboard'), card(row('Keyboard Layout', 'Used as soon as you choose it', kbSel)));
  root.append(note('These settings belong to your account. Other people on this computer choose their own.'));
  showLogout();
});

panel('datetime', 'Date & Time', 'sys', async (root, stale) => {
  const [t, clock] = await Promise.all([sys.call('time:get'), sys.call('clock:get')]);
  if (stale()) return;
  const nowLbl = el('span', { class: 'badge' });
  const fmt = () => new Date().toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: !clock.clock24h });
  nowLbl.textContent = fmt();
  const timer = setInterval(() => { if (!document.body.contains(nowLbl)) { clearInterval(timer); return; } nowLbl.textContent = fmt(); }, 1000);

  const setManual = button('Set…', async () => {
    const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const v = await dialog({ title: 'Set Date and Time', fields: [{ name: 'when', type: 'datetime-local', label: 'Date and time', value: local }], ok: 'Set',
      check: async (v) => { const r = await sys.call('time:set', v.when + ':00'); return r.ok ? null : (r.error || 'The time couldn\'t be set.'); } });
    if (v) refresh();
  }, 'small');
  setManual.disabled = t.ntp;
  root.append(card(
    row('Now', null, nowLbl),
    row('Set Automatically', t.ntp ? (t.synced ? 'In sync with internet time' : 'Waiting for internet time') : 'Uses the time you set', toggle(t.ntp, async (v) => {
      const r = await sys.call('time:ntp', v); if (!r.ok) toast(r.error || 'That needs an administrator password.', 4000); refresh();
    }, 'Set automatically', !t.canNtp)),
    row('Date and Time', null, setManual)));

  const zones = await sys.call('time:zones');
  if (stale()) return;
  const search = el('input', { type: 'search', placeholder: 'Search for a city', 'aria-label': 'Search time zones', style: { width: '220px' } });
  const zoneSel = select(zones.map((z) => ({ value: z, label: z.replace(/_/g, ' ').replace(/\//g, ' / ') })), t.timezone, async (v) => {
    const r = await sys.call('time:zone', v); if (!r.ok) toast(r.error || 'That needs an administrator password.', 4000); else toast(`Time zone set to ${v.replace(/_/g, ' ')}`); refresh();
  }, 'Time zone');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase().replace(/\s+/g, '_');
    for (const o of zoneSel.options) o.hidden = !!q && !o.value.toLowerCase().includes(q);
    const first = [...zoneSel.options].find((o) => !o.hidden);
    if (q && first && zoneSel.selectedOptions[0] && zoneSel.selectedOptions[0].hidden) zoneSel.value = first.value;
  });
  root.append(heading('Time Zone'), card(row('Time Zone', t.timezone.replace(/_/g, ' '), search), row('Choose', null, zoneSel)));

  root.append(heading('Menu Bar Clock'), card(
    row('24-Hour Time', null, toggle(!!clock.clock24h, async (v) => { Object.assign(clock, await sys.call('clock:set', { clock24h: v })); nowLbl.textContent = fmt(); }, '24-hour time')),
    row('Show the Date', null, toggle(!!clock.clockDate, (v) => sys.call('clock:set', { clockDate: v }), 'Show the date')),
    row('Show Seconds', null, toggle(!!clock.clockSeconds, (v) => sys.call('clock:set', { clockSeconds: v }), 'Show seconds'))));
});

/* ---------------------------------------------------------------- power */
const PROFILE_NAMES = { 'power-saver': 'Power Saver', balanced: 'Balanced', performance: 'Performance' };
const IDLE = [{ value: 60, label: '1 minute' }, { value: 120, label: '2 minutes' }, { value: 300, label: '5 minutes' }, { value: 600, label: '10 minutes' }, { value: 900, label: '15 minutes' }, { value: 1800, label: '30 minutes' }, { value: 3600, label: '1 hour' }, { value: 0, label: 'Never' }];

const SLEEP = [{ value: 0, label: 'Never' }, { value: 900, label: '15 minutes' }, { value: 1800, label: '30 minutes' }, { value: 3600, label: '1 hour' }, { value: 7200, label: '2 hours' }, { value: 10800, label: '3 hours' }];
const LOGOUT = [{ value: 0, label: 'Never' }, { value: 1800, label: '30 minutes' }, { value: 3600, label: '1 hour' }, { value: 7200, label: '2 hours' }, { value: 14400, label: '4 hours' }, { value: 28800, label: '8 hours' }];

panel('power', 'Power', 'sys', async (root, stale) => {
  const p = await sys.call('power:get');
  if (stale()) return;
  if (p.battery) {
    const b = p.battery;
    const state = b.state === 'charging' ? `Charging${b.timeToFull ? ` · full in ${b.timeToFull}` : ''}` : b.state === 'fully-charged' ? 'Fully charged' : b.state === 'discharging' ? `On battery${b.timeToEmpty ? ` · ${b.timeToEmpty} left` : ''}` : b.state;
    root.append(card(row('Battery', state, el('span', { class: 'badge ' + (b.percent < 15 ? 'status-warn' : ''), text: `${Math.round(b.percent)}%` }))));
  }
  if (p.profiles.length) {
    root.append(heading('Power Mode'), card(row('Power Mode', 'Balances speed against battery life and heat',
      seg(p.profiles.map((x) => ({ value: x, label: PROFILE_NAMES[x] || x })), p.profile, (v) => sys.call('power:profile', v), 'Power mode'))));
  }
  const pick = (list, v, dflt) => (list.some((x) => x.value === v) ? v : dflt);
  root.append(heading('Screen'), card(
    row('Turn Off the Screen After', 'When the computer isn\u2019t being used. Videos that are playing keep it on.', select(IDLE, pick(IDLE, p.idleDelay, 600), (v) => sys.call('power:idle', Number(v)), 'Screen off after')),
    row('Lock the Screen', 'Ask for your password when the screen turns back on, and after sleep', toggle(p.lock, (v) => sys.call('power:lock', v), 'Lock the screen'))));
  root.append(heading('When the Computer Isn\u2019t Being Used'), card(
    row('Put the Computer to Sleep After', 'Sleep saves power; everything stays open', select(SLEEP, pick(SLEEP, p.sleep, 0), (v) => sys.call('power:sleep', Number(v)), 'Sleep after')),
    row('Log Out When Idle', 'Closes every app and logs you out, with a one-minute warning first. Never keeps you logged in.', select(LOGOUT, pick(LOGOUT, p.logout, 0), (v) => sys.call('power:logout', Number(v)), 'Log out when idle'))));
  if (!p.battery && !p.profiles.length) root.append(note('No battery found, and power modes aren\'t available on this computer.'));
});

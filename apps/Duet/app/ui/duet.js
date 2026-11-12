'use strict';
/* Duet: pick the system this computer starts with; restart in the other one. */
const ST = { info: null, pick: null };
const status = (t, err) => { const s = $('#status'); s.textContent = t || ''; s.classList.toggle('err', !!err); };

function sysCard(e) {
  const b = el('button', { class: 'sys', type: 'button', role: 'radio', 'aria-checked': String(ST.pick === e.id), 'data-id': e.id,
    onclick: () => { ST.pick = e.id; draw(); } },
  el('img', { src: e.name === 'Windows' ? 'disk-windows.png' : 'disk-palos.png', alt: '' }),
  el('div', { class: 'n', text: e.name }),
  el('div', { class: 's', text: [e.default ? 'Starts every time' : '', e.current ? 'Running now' : ''].filter(Boolean).join(' · ') }));
  b.addEventListener('keydown', (k) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(k.key)) return;
    const all = $$('.sys'); const i = all.indexOf(b); const n = all[(i + (k.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
    if (n) { n.click(); n.focus(); }
  });
  return b;
}

function draw() {
  const info = ST.info || { systems: [], disks: [] };
  const box = $('#systems'); box.textContent = '';
  const sys = info.systems || [];
  sys.forEach((e) => box.append(sysCard(e)));
  const win = sys.find((e) => e.name === 'Windows');
  const picked = sys.find((e) => e.id === ST.pick);
  $('#nowin').hidden = !!win;
  $('#inst').hidden = $('#instH').hidden = !!win;
  $('#actions').hidden = !win;
  if (!win) {
    const winDisk = (info.disks || []).find((d) => d.windows);
    $('#nowinText').textContent = !info.uefi
      ? 'This computer was started without UEFI, so Duet can’t choose a startup system here.'
      : winDisk
        ? `There’s a Windows volume on ${winDisk.model || winDisk.name}, but Windows Boot Manager isn’t in this computer’s startup list. Start Windows once from the firmware’s boot menu, then open Duet again.`
        : 'To use Windows and palOS on one computer: make room for Windows below, then let Duet install Windows from a Windows .iso file (or make a Windows installer USB stick). Duet then lets you pick which one starts, and a startup picker shows both for 3 seconds whenever the computer starts.';
  }
  $('#apply').disabled = !picked || picked.default;
  $('#apply').textContent = picked ? `Start ${picked.name} Every Time` : 'Start With This Every Time';
  const other = picked && !picked.current ? picked : sys.find((e) => !e.current);
  $('#restart').disabled = !other;
  $('#restart').textContent = other ? `Restart in ${other.name}…` : 'Restart…';
  $('#restart').dataset.id = other ? other.id : '';
  $('#restart').dataset.name = other ? other.name : '';
  const dk = $('#disks'); dk.textContent = '';
  for (const d of info.disks || []) {
    const what = [d.palos ? 'palOS' : '', d.windows ? 'Windows' : '', d.empty ? 'Empty' : ''].filter(Boolean).join(' and ') || 'Other';
    dk.append(el('div', { class: 'row disk' },
      el('img', { class: 'ic', src: d.windows && !d.palos ? 'disk-windows.png' : 'disk-palos.png', alt: '' }),
      el('div', { class: 'lbl' }, el('div', { class: 't', text: d.model || d.name }), el('div', { class: 's', text: `${humanSize(d.size)} · ${what}` }))));
  }
  if (!dk.children.length) dk.append(el('div', { class: 'empty', text: 'No internal disks were found.' }));
}

async function load() {
  status('');
  ST.info = await window.api.invoke('duet:info');
  if (ST.info.error) status(ST.info.error, true);
  const sys = ST.info.systems || [];
  if (!sys.some((e) => e.id === ST.pick)) ST.pick = (sys.find((e) => e.default) || sys[0] || {}).id || null;
  draw();
}

$('#apply').onclick = async () => {
  const p = (ST.info.systems || []).find((e) => e.id === ST.pick); if (!p) return;
  status('Changing the startup system…');
  const r = await window.api.invoke('duet:set', 'default', p.id);
  if (r.ok) { status(`This computer will start ${p.name} from now on.`); load().then(() => status(`This computer will start ${p.name} from now on.`)); }
  else status(r.cancelled ? '' : 'The startup system couldn’t be changed. ' + (r.err || ''), !r.cancelled);
};
$('#restart').onclick = async () => {
  const id = $('#restart').dataset.id, name = $('#restart').dataset.name; if (!id) return;
  const ok = await sheetAsk(`Restart in ${name}?`, `This computer restarts in ${name} once. Next time it starts with the system you chose to start every time. Save your work first.`, 'Restart');
  if (!ok) return;
  status('Restarting…');
  const r = await window.api.invoke('duet:set', 'restart', id);
  if (!r.ok) status(r.cancelled ? '' : `${name} couldn’t be chosen for the next start. ` + (r.err || ''), !r.cancelled);
};

// a small confirmation sheet (no native dialog needed)
function sheetAsk(title, text, yes) {
  return new Promise((resolve) => {
    const bg = el('div', { class: 'sheetbg', style: { position: 'fixed', inset: '0', background: 'rgba(0,0,0,.25)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 10 } });
    const box = el('div', { class: 'card', role: 'alertdialog', 'aria-label': title, style: { width: '400px', marginTop: '0', padding: '18px 20px 14px', borderTopLeftRadius: '0', borderTopRightRadius: '0' } },
      el('div', { style: { fontWeight: '600', marginBottom: '6px' }, text: title }), el('div', { class: 'note', style: { color: 'var(--dim)', fontSize: '13px' }, text }));
    const no = el('button', { class: 'btn', type: 'button', text: 'Cancel' });
    const go = el('button', { class: 'btn primary', type: 'button', text: yes });
    box.append(el('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' } }, no, go));
    bg.append(box); document.body.append(bg); go.focus();
    const done = (v) => { bg.remove(); document.removeEventListener('keydown', key); resolve(v); };
    const key = (e) => { if (e.key === 'Escape') done(false); };
    document.addEventListener('keydown', key);
    no.onclick = () => done(false); go.onclick = () => done(true);
  });
}

window.api.on('cmd', (c) => { if (c === 'refresh') load(); });
load();

// ---------------------------------------------------------------- Make Room for Windows
const GB = (n) => `${Math.round(n / 1e9)} GB`;
const R = { info: null };
function drawRoom() {
  const i = R.info || {};
  const txt = $('#roomText'), ctl = $('#roomCtl'), pend = $('#roomPendingRow');
  ctl.hidden = true; pend.hidden = true;
  if (i.pending) {
    txt.textContent = `palOS’s volume will be made smaller the next time this computer starts, to make ${i.pending.ROOM_GB} GB of room for Windows. Back up first (Time Turner), and keep the computer plugged in.`;
    $('#roomPending').textContent = ''; pend.hidden = false; return;
  }
  const lastOk = i.result && /^done/.test(i.result), lastBad = i.result && /^failed/.test(i.result);
  if (i.freeAfter >= 64e9 || lastOk) {
    txt.textContent = `${GB(i.freeAfter || 0)} of free space is ready for Windows, after palOS. Duet can install Windows there by itself (Install Windows, below). Or start the computer from a Windows installer USB stick, choose Custom install, and pick the “Unallocated Space”; don’t delete or format palOS’s partitions.`;
    return;
  }
  if (!i.ok) { txt.textContent = (lastBad ? `The last try didn’t work (${i.result.replace(/^failed: /, '')}). ` : '') + (i.why || 'palOS’s volume couldn’t be read.'); return; }
  txt.textContent = (lastBad ? `The last try didn’t work (${i.result.replace(/^failed: /, '')}). ` : '') +
    `palOS’s volume can give Windows some of its free space without losing anything on it. Choose how much; it’s done when the computer restarts (a few minutes).`;
  const r = $('#roomRange');
  r.min = String(Math.ceil(i.minRoom / 1e9)); r.max = String(Math.floor(i.maxRoom / 1e9));
  if (!r.dataset.set) { r.value = String(Math.min(Math.max(+r.min, 128), +r.max)); r.dataset.set = '1'; }
  const win = +r.value * 1e9, pal = i.size - win;
  $('#barPal').style.width = (pal / i.size * 100) + '%'; $('#barWin').style.width = (win / i.size * 100) + '%';
  $('#palGB').textContent = GB(pal); $('#winGB').textContent = GB(win);
  ctl.hidden = false;
}
async function loadRoom() { R.info = await window.api.invoke('room:info'); drawRoom(); }
$('#roomRange').addEventListener('input', drawRoom);
$('#roomGo').onclick = async () => {
  const gb = +$('#roomRange').value;
  const ok = await sheetAsk(`Make ${gb} GB of room for Windows?`, `palOS’s volume becomes ${GB(R.info.size - gb * 1e9)}. Nothing on it is lost, but back up first with Time Turner. The computer restarts now; making the room takes a few minutes. Don’t turn it off.`, 'Make Room and Restart');
  if (!ok) return;
  status('Getting ready…');
  const r = await window.api.invoke('room:set', 'request', gb);
  if (!r.ok) { status(r.cancelled ? '' : 'The room couldn’t be set up. ' + (r.err || ''), !r.cancelled); return; }
  await window.api.invoke('room:set', 'restart');
};
$('#roomCancel').onclick = async () => { const r = await window.api.invoke('room:set', 'cancel'); if (r.ok) loadRoom(); };
$('#roomRestart').onclick = () => window.api.invoke('room:set', 'restart');

// ---------------------------------------------------------------- Windows installer USB
const U = { iso: null, busy: false };
async function loadTargets() {
  const sel = $('#usbDev'); const list = await window.api.invoke('usb:targets'); sel.textContent = '';
  for (const d of list) sel.append(el('option', { value: d.path, text: `${d.name} (${humanSize(d.size)})` }));
  if (!list.length) sel.append(el('option', { value: '', text: 'Plug in a USB stick (8 GB or more)' }));
  usbState();
}
function usbState() { $('#usbGo').disabled = U.busy || !U.iso || !$('#usbDev').value; }
$('#usbRefresh').onclick = loadTargets;
$('#usbDev').onchange = usbState;
$('#usbPick').onclick = async () => {
  const f = await window.api.invoke('usb:pick'); if (!f) return;
  if (!f.windows) { $('#usbIso').textContent = `“${f.name}” isn’t a Windows installer image. (Disk Utility can write other images.)`; U.iso = null; usbState(); return; }
  U.iso = f.path; $('#usbIso').textContent = f.name; usbState();
};
$('#usbGo').onclick = async () => {
  const dev = $('#usbDev').value, name = $('#usbDev').selectedOptions[0].textContent;
  if (!(await sheetAsk('Make a Windows installer on this stick?', `Everything on ${name} is erased and replaced by the Windows installer.`, 'Erase and Make Installer'))) return;
  U.busy = true; usbState(); $('#usbBar').hidden = false; $('#usbStatus').textContent = 'Starting…';
  const r = await window.api.invoke('usb:write', U.iso, dev);
  U.busy = false; usbState(); $('#usbBar').hidden = true;
  $('#usbStatus').textContent = r.ok ? 'Done. Start the computer from this stick to install Windows (most PCs: F12, F11 or Esc at power-on).' : r.cancelled ? '' : 'The installer couldn’t be made: ' + (r.err || '');
};
window.api.on('usb:progress', (p) => { $('#usbFill').style.width = p.pct + '%'; if (p.text) $('#usbStatus').textContent = p.text + '…'; });
loadRoom(); loadTargets();


// ---------------------------------------------------------------- Install Windows: by itself, from a .iso
const W = { plan: null, iso: null, busy: false };
const langName = (tag) => { try { return new Intl.DisplayNames([document.documentElement.lang || 'en'], { type: 'language' }).of(tag) || tag; } catch { return tag; } };
function drawInstSettings(st) {
  const kv = $('#instSettings'); kv.textContent = '';
  if (!st) return;
  const row = (k, v) => kv.append(el('dt', { text: k }), el('dd', { text: v }));
  row('Language and region', langName(st.locale));
  row('Keyboard', st.keyboardName || st.keyboard || '');
  row('Time zone', st.timezone || '');
  row('Computer name', st.computerName || '');
}
function instHint(text, err) { const h = $('#instHint'); h.textContent = text || ''; h.hidden = !text; h.classList.toggle('err', !!err); }
function instState() { $('#instGo').disabled = W.busy || !W.plan || !W.plan.ok || !W.iso || !$('#instEd').value; }
async function loadInst() {
  const [plan, s] = await Promise.all([window.api.invoke('win:plan'), window.api.invoke('win:status')]);
  drawInstSettings(plan.settings);
  $('#instGoRow').hidden = false; $('#instReadyRow').hidden = true;
  if (s.state === 'ready') {
    $('#instReady').textContent = `${s.edition || 'Windows'} is ready to install. The computer restarts, Windows installs by itself (10 to 30 minutes), then it asks for your account.`;
    $('#instReadyRow').hidden = false; $('#instGoRow').hidden = true;
  } else if (s.state === 'failed') {
    instHint(`The last install didn’t work: ${s.why || 'no reason was given'}. palOS wasn’t changed, and the space is free again.`, true);
  } else if (s.state === 'done' && !(ST.info && (ST.info.systems || []).some((e) => e.name === 'Windows'))) {
    instHint('Windows was installed. If it isn’t listed above yet, restart once and choose Windows in the startup picker.');
  }
  if (!plan.uefi) { $('#instStatus').textContent = 'This computer was started without UEFI, so Duet can’t install Windows here.'; $('#instPick').disabled = true; return; }
  if (plan.free < plan.needs) $('#instStatus').textContent = `Make room for Windows first (above): it needs at least ${GB(plan.needs)} after palOS.`;
  instState();
}
$('#instPick').onclick = async () => {
  const f = await window.api.invoke('win:pick'); if (!f) return;
  W.iso = null; W.plan = null; $('#instEdRow').hidden = true; instHint('');
  $('#instIso').textContent = `Looking at “${f.name}”…`; $('#instPick').disabled = true;
  const p = await window.api.invoke('win:plan', f.path);
  $('#instPick').disabled = false;
  if (!p.editions) { $('#instIso').textContent = f.name; instHint(p.why || 'This isn’t a Windows installer image.', true); instState(); return; }
  W.iso = f.path; W.plan = p; $('#instIso').textContent = f.name;
  const sel = $('#instEd'); sel.textContent = '';
  for (const e of p.editions) sel.append(el('option', { value: String(e.index), text: e.display || e.name || `Edition ${e.index}` }));
  sel.value = String(p.suggested || p.editions[0].index);
  $('#instEdRow').hidden = false;
  const notes = [];
  if (p.oemKey) notes.push('This computer has a Windows key in its firmware: choose the edition it came with (usually Home) and Windows activates by itself.');
  const iso = (p.language || '').toLowerCase(), mine = (p.settings && p.settings.locale || '').toLowerCase();
  if (iso && mine && iso.split('-')[0] !== mine.split('-')[0]) notes.push(`Windows will be in ${langName(p.language)}, the language of this .iso (its region, keyboard and formats are still yours). Microsoft has a ${langName(p.settings.locale)} .iso too.`);
  if (!p.ok) { instHint(p.why || 'There isn’t enough room for Windows.', true); } else instHint(notes.join(' '));
  instState();
};
$('#instEd').onchange = instState;
$('#instGo').onclick = async () => {
  const ed = $('#instEd').selectedOptions[0].textContent;
  if (!(await sheetAsk(`Install ${ed}?`, `Duet gets ${ed} ready in the free space after palOS (a few minutes), then the computer restarts and Windows installs by itself. palOS and your files aren’t touched, but back up first with Time Turner. Keep the computer plugged in.`, 'Get Ready'))) return;
  W.busy = true; instState(); $('#instBar').hidden = false; $('#instStatus').textContent = 'Starting…'; $('#instStatus').classList.remove('err');
  const r = await window.api.invoke('win:prepare', W.iso, $('#instEd').value);
  W.busy = false; $('#instBar').hidden = true;
  if (!r.ok) { $('#instStatus').textContent = r.cancelled ? '' : 'Windows couldn’t be got ready: ' + (r.err || ''); $('#instStatus').classList.toggle('err', !r.cancelled); instState(); return; }
  $('#instStatus').textContent = '';
  await loadInst(); loadRoom();
  if (await sheetAsk('Restart and install Windows now?', 'Save your work first. The computer restarts into the Windows install; when Windows is done, the startup picker starts it until you next choose palOS.', 'Restart')) window.api.invoke('win:set', 'restart');
};
$('#instRestart').onclick = async () => {
  if (await sheetAsk('Restart and install Windows now?', 'Save your work first. Windows installs by itself, then asks for your account.', 'Restart')) window.api.invoke('win:set', 'restart');
};
$('#instCancel').onclick = async () => { const r = await window.api.invoke('win:set', 'cancel'); if (r.ok) { await loadInst(); loadRoom(); } };
window.api.on('win:progress', (p) => { $('#instFill').style.width = p.pct + '%'; if (p.text) $('#instStatus').textContent = p.text + '…'; });
loadInst();

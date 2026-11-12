'use strict';
/* palOS Setup pages: film -> [language, for a computer set up for a new owner] -> create your account (or restore from
   Time Turner, a link on that page) -> internet -> graphics drivers (NVIDIA only) -> the desktop. */
const $ = (s, r = document) => r.querySelector(s);
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
const svg = (inner, cls = '', vb = '0 0 16 16') => { const t = document.createElement('template'); t.innerHTML = `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${inner}</svg>`; return t.content.firstChild; };
const LOGO = 'file:///usr/share/palos/logo-512.png';

const data = { fullname: '', username: '', password: '', verify: '', picture: null, pictureURL: null, dark: false, userEdited: false, hostname: '', computer: '', computerEdited: false, cameraAllowed: false };
let NEW_STEPS = ['account', 'wifi', 'done'];
const TT_STEPS = ['find', 'key', 'pick', 'restore', 'done'];
let STEPS = NEW_STEPS;
let step = null, busy = false, canRestore = false, oem = false, gpu = null, netOK = true;
// the steps of a new account, as dots under the card: only the pages this computer will show
function newSteps() { return [...(oem ? ['language'] : []), 'account', ...(tt.choice === 'migrate' ? ['migrate'] : []), ...(netOK ? ['wifi'] : []), ...(gpu && gpu.nvidia && gpu.driver !== 'nvidia' ? ['drivers'] : []), 'done']; }

/* ------------------------------------------------------------ film (plays once)
 * The film must play on every computer, whatever its graphics. In order:
 *   1. the <video> element (Chromium uses the graphics chip's decoder when it works, the processor when it doesn't);
 *   2. if that fails part-way (a decoder or driver error, or the picture stops moving), the software player
 *      (filmsw.js: the processor decodes, drawn on a canvas) takes over from the same moment, on the same screen;
 *   3. if that can't run either, setup restarts itself with all hardware video decoding off and resumes there;
 *   4. only if none of those can show a picture does setup go on without the film (and says so in its log).
 * Nothing flashes in between: the last good picture stays on screen while the next player starts. */
// Setup starts the moment the computer does, often before palOS's sound system has found the sound cards (an
// NVIDIA driver loading at the same time slows that down). A film started then had nowhere to play and stayed
// silent, even with headphones plugged in. So the film waits, up to 10 seconds, for palOS's sound system to report a
// real output (asked directly, not through the page); whatever
// becomes the default output afterwards (headphones first, see 51-palos-output-priority) carries it along.
async function soundOutputs() {
  try { return await setup.soundOutputs(); } catch (_) { return []; }
}
let soundState = null;
async function soundReady(limitMs = 10000) {
  try { soundState = await setup.soundReady(limitMs); return soundState.ok; } catch (_) { return false; }
}

async function film() {
  const f = await setup.film();
  if (!f.url) return;
  const heard = await soundReady();
  try { setup.filmLog(heard ? `sound output ready: ${soundState.outputs.join(', ')} (default: ${soundState.default || 'none'})` : (soundState && !soundState.server ? 'the sound system isn’t answering after 10 s; the film plays anyway' : 'no sound output after 10 s; the film plays anyway, and follows one as soon as it appears')); } catch (_) {}
  const box = $('#film'), v = $('#video');
  const canvas = el('canvas', { id: 'filmsw', class: 'hidden' });
  box.appendChild(canvas);
  box.classList.remove('hidden');
  await new Promise((resolve) => {
    let done = false, mode = 'video', sw = null, handoff = 0, guard = null, watch = null, lastT = -1, stillSince = 0;
    const log = (msg) => { try { setup.filmLog(msg); } catch (_) {} };
    const end = (why) => {
      if (done) return; done = true;
      clearTimeout(guard); clearInterval(watch);
      if (why) log(why);
      setup.filmSeen();
      document.removeEventListener('keydown', key, true);
      box.classList.add('out');
      setTimeout(() => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) {} if (sw) sw.stop(); box.classList.add('hidden'); resolve(); }, 800);
    };
    // the welcome film plays through: no Skip button (the film has its own safety timers below)
    const key = (e) => { if (['Escape', 'Enter', ' '].includes(e.key)) e.preventDefault(); };
    document.addEventListener('keydown', key, true);

    // freeze the last good picture on the canvas, so the switch-over never shows a black or broken frame
    const freeze = () => {
      try {
        if (v.readyState >= 2 && v.videoWidth) {
          canvas.width = v.videoWidth; canvas.height = v.videoHeight;
          canvas.getContext('2d').drawImage(v, 0, 0);
          canvas.classList.remove('hidden');
        }
      } catch (_) {}
      v.classList.add('gone');
    };
    const position = () => (mode === 'video' ? (v.currentTime || f.from || 0) : (sw && sw.position ? sw.position() : handoff));

    async function software(reason) {
      if (done || mode !== 'video') return;
      const at = position();
      handoff = at;
      mode = 'software';
      log(`video decoding failed at ${at.toFixed(2)}s (${reason}); switching to the software player`);
      clearTimeout(guard); clearInterval(watch);
      freeze();
      try { v.pause(); } catch (_) {}
      try {
        const bytes = await setup.filmBytes(f.path);
        sw = await FilmSW.open(bytes);
        if (done) return;
        canvas.classList.remove('hidden');
        await sw.play(canvas, { from: at, volume: 0.9, onEnded: () => end(), onError: (e) => restart(`software player: ${e && e.message || e}`) });
      } catch (e) {
        restart(`software player couldn’t start: ${e && e.message || e}`);
      }
    }
    async function restart(reason) {
      if (done || mode === 'restart') return;
      const at = position();
      mode = 'restart';
      if (f.software) { end(`the film couldn’t be shown on this computer (${reason})`); return; }
      log(`${reason}; restarting setup with hardware video decoding off, resuming at ${at.toFixed(2)}s`);
      const r = await setup.filmSoftwareRestart(at).catch(() => null);
      if (!r || !r.ok) end(`the film couldn’t be shown on this computer (${reason})`);
    }

    v.addEventListener('ended', () => end());
    v.addEventListener('error', () => { const e = v.error; software(e ? `media error ${e.code}${e.message ? ': ' + e.message : ''}` : 'media error'); });
    // a picture that never starts, or stops moving while it should be playing, is a decoder that has given up
    guard = setTimeout(() => { if (mode === 'video' && !(v.currentTime > (f.from || 0))) software('the film didn’t start within 8 seconds'); }, 8000);
    v.addEventListener('playing', () => {
      clearTimeout(guard);
      clearInterval(watch);
      watch = setInterval(() => {
        if (mode !== 'video' || v.paused || v.ended) return;
        if (v.currentTime !== lastT) { lastT = v.currentTime; stillSince = performance.now(); return; }
        if (performance.now() - stillSince > 4000) software('the picture stopped moving');
      }, 500);
    }, { once: true });
    v.addEventListener('loadedmetadata', () => { if (f.from > 0) { try { v.currentTime = f.from; } catch (_) {} } }, { once: true });
    v.src = f.url;
    v.volume = 0.9;
    v.play().catch((e1) => {
      // refused with sound: start without, then turn the sound back on once it's playing (this fallback used to
      // leave the whole film silent)
      log(`playing with sound was refused (${e1 && e1.name || e1}); starting muted and unmuting once it plays`);
      v.muted = true;
      v.play().then(() => setTimeout(() => { v.muted = false; v.volume = 0.9; }, 150)).catch((e) => software(`it couldn’t start playing (${e && e.message || e})`));
    });
    // a sound output that turns up or changes while the film plays (sound cards found late, headphones): follow it
    const follow = async () => {
      if (done) return;
      log(`sound outputs changed: ${(await soundOutputs()).join(', ') || 'none'}`);
      if (mode === 'video' && v.setSinkId) v.setSinkId('').catch(() => {});
    };
    try { navigator.mediaDevices.addEventListener('devicechange', follow); } catch (_) {}
    v.addEventListener('playing', () => { log(`playing: ${v.muted ? 'MUTED' : 'sound on'}, volume ${v.volume}`); }, { once: true });
  });
}

/* ------------------------------------------------------------ page frame */
function page(id, { title, lead, logo = false, body, back, next, nextLabel = 'Continue', nextDisabled = false, extra = null }) {
  step = id;
  const nextBtn = next ? el('button', { class: 'btn primary', text: nextLabel, disabled: nextDisabled, onclick: () => !nextBtn.disabled && next() }) : null;
  const p = el('div', { class: 'page' },
    el('div', { class: 'head' }, logo ? el('img', { class: 'logo', src: LOGO, alt: '' }) : null, el('h1', { text: title }), lead ? el('p', { class: 'lead', text: lead }) : null),
    el('div', { class: 'body' }, body),
    el('div', { class: 'foot' }, back ? el('button', { class: 'btn', text: 'Back', onclick: back }) : null, el('span', { class: 'grow' }), extra, nextBtn));
  $('#card').replaceChildren(p);
  const i = STEPS.indexOf(id);
  $('#dots').replaceChildren(...STEPS.map((s, j) => el('i', { class: j === i ? 'on' : '' })));
  return { nextBtn };
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || busy) return;
  if (e.target.matches('button')) return;
  const b = $('#card .foot .btn.primary');
  if (b && !b.disabled && !e.target.closest('.pw')) { e.preventDefault(); b.click(); }
});

/* ------------------------------------------------------------ Wi-Fi */
function bars(signal) {
  // Wi-Fi strength as a radial fan (a wedge in bands)
  const lvl = signal > 70 ? 3 : signal > 45 ? 2 : signal > 20 ? 1 : 0;
  const e = svg(["M9 15L6.45 12.45A3.6 3.6 0 0 1 11.55 12.45Z", "M3.06 9.06A8.4 8.4 0 0 1 14.94 9.06L12.68 11.32A5.2 5.2 0 0 0 5.32 11.32Z", "M-0.48 5.52A13.4 13.4 0 0 1 18.48 5.52L16.07 7.93A10 10 0 0 0 1.93 7.93Z"].map((d, i) => `<path class="${i === 0 || lvl >= i + 1 ? 'on' : ''}" d="${d}"/>`).join(''));
  e.setAttribute('viewBox', '-1 1 20 15'); e.classList.add('fan');
  return e;
}
const LOCK = '<rect x="2.5" y="6" width="9" height="6.5" rx="1.2"/><path d="M4.5 6V4.4a2.5 2.5 0 0 1 5 0V6"/>';

async function wifiPage(after = findPage, { first = false, back = null } = {}) {
  if (first) { STEPS = NEW_STEPS = newSteps(); data.wifiShown = true; }
  const listBox = el('div', {}, el('div', { class: 'msg' }, el('div', { class: 'spin' })));
  const { nextBtn } = page('wifi', {
    title: 'Connect to Wi-Fi', lead: 'palOS uses the internet for updates and the time. You can also do this later.',
    body: listBox, back: first ? back : after, next: after, nextLabel: 'Skip',
    extra: el('button', { class: 'link', text: 'Search Again', onclick: () => fill(true) }),
  });
  let openPw = null;
  async function fill(rescan) {
    const st = await setup.netStatus();
    if (step !== 'wifi') return;
    if (!st.nm) { listBox.replaceChildren(el('div', { class: 'msg' }, el('b', { text: 'Networking isn’t available' }), 'You can connect later in Settings.')); return; }
    if (!st.wifi) {
      listBox.replaceChildren(el('div', { class: 'msg' }, st.online ? [el('b', { text: 'You’re connected' }), 'This computer is online with a network cable.'] : [el('b', { text: 'No Wi-Fi found' }), 'Plug in a network cable, or connect later in Settings.']));
      nextBtn.textContent = 'Continue';
      return;
    }
    if (!st.radio) {
      listBox.replaceChildren(el('div', { class: 'msg' }, el('b', { text: 'Wi-Fi is off' }), el('p', {}, el('button', { class: 'btn', text: 'Turn Wi-Fi On', onclick: async () => { await setup.wifiRadio(true); setTimeout(() => fill(true), 1500); } }))));
      return;
    }
    if (rescan || !listBox.querySelector('.netlist')) listBox.replaceChildren(el('div', { class: 'msg' }, el('div', { class: 'spin' }), el('div', { style: { marginTop: '10px' }, text: 'Looking for networks…' })));
    const nets = await setup.wifiList(rescan);
    if (step !== 'wifi') return;
    nextBtn.textContent = st.online ? 'Continue' : 'Skip';
    if (!nets.length) { listBox.replaceChildren(el('div', { class: 'msg' }, el('b', { text: 'No networks in range' }), 'Move closer to your router, or click Search Again.')); return; }
    const list = el('div', { class: 'netlist', role: 'list' });
    for (const n of nets) {
      const row = el('div', { class: 'net', role: 'listitem', tabindex: '0' }, bars(n.signal), el('span', { class: 'n', text: n.ssid }),
        n.active ? el('span', { class: 'st', text: 'Connected' }) : null, n.secure ? svg(LOCK, 'lock', '0 0 14 14') : null);
      const pick = () => {
        if (n.active) return;
        if (openPw) openPw.remove();
        if (!n.secure) { connect(n, '', row); return; }
        const inp = el('input', { type: 'password', placeholder: 'Password', 'aria-label': `Password for ${n.ssid}`, autocomplete: 'off' });
        const err = el('div', { class: 'err' });
        const go = el('button', { class: 'btn primary', text: 'Join', onclick: () => connect(n, inp.value, row, err, go) });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go.click(); } if (e.key === 'Escape') { openPw.remove(); openPw = null; } });
        openPw = el('div', { class: 'pw' }, el('div', { style: { flex: '1', display: 'flex', flexDirection: 'column' } }, inp, err), go);
        row.after(openPw);
        inp.focus();
      };
      row.addEventListener('click', pick);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick(); } });
      list.append(row);
    }
    listBox.replaceChildren(list);
  }
  async function connect(n, pw, row, err, btn) {
    if (btn) { btn.disabled = true; btn.replaceChildren(el('div', { class: 'spin small', style: { borderTopColor: '#fff' } })); }
    const r = await setup.wifiConnect(n.ssid, pw);
    if (step !== 'wifi') return;
    if (r.ok) { openPw = null; nextBtn.textContent = 'Continue'; fill(false); return; }
    if (btn) { btn.disabled = false; btn.textContent = 'Join'; }
    if (err) err.textContent = r.needsPassword ? 'That password didn’t work. Try again.' : (r.error || 'Couldn’t join that network.');
    else fill(false);
  }
  fill(false);
}

/* ------------------------------------------------------------ account */
let avatars = [];
function initialsPicture(name) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#7f9cb9'); grad.addColorStop(1, '#3d5367');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const ini = ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  g.fillStyle = '#fff'; g.font = '500 108px "Noto Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(ini, 128, 136);
  return c.toDataURL('image/png');
}
function suggestUser(full) {
  const first = (full.trim().split(/\s+/)[0] || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return first.replace(/^[^a-z]+/, '').slice(0, 32);
}
function strength(pw) {
  if (!pw) return { text: '', cls: '' };
  let s = 0;
  if (pw.length >= 8) s++; if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length < 6) return { text: 'Very short: easy to guess.', cls: 'bad' };
  if (s <= 2) return { text: 'Fair. Longer passwords are safer.', cls: '' };
  return { text: 'Strong password.', cls: 'good' };
}

// "Joey's pal": what the computer is called unless the person changes it (French: "pal de Joey")
const FR = /^fr/i.test(document.documentElement.lang || '') || /^fr/i.test(navigator.language || '');
function suggestComputer(full) {
  const first = (full.trim().split(/\s+/)[0] || '').slice(0, 40);
  if (!first) return '';
  if (FR) return `pal de ${first}`;
  return `${first}’s pal`;
}

async function accountPage() {
  if (!avatars.length) avatars = await setup.avatars();
  const big = el('div', { class: 'big', role: 'img', 'aria-label': 'Your picture' });
  const fname = el('input', { type: 'text', value: data.fullname, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Full name', maxlength: '100' });
  const uname = el('input', { type: 'text', value: data.username, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Account name', maxlength: '32' });
  const cname = el('input', { type: 'text', value: data.computer, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Computer name', maxlength: '63' });
  const pw = el('input', { type: 'password', value: data.password, 'aria-label': 'Password' });
  const pw2 = el('input', { type: 'password', value: data.verify, 'aria-label': 'Verify password' });
  const uHint = el('span', { class: 'hint', text: 'Used for your home folder. It can’t be changed later.' });
  const cHint = el('span', { class: 'hint', text: 'Other computers and devices see this name.' });
  const pHint = el('span', { class: 'hint' });
  const vHint = el('span', { class: 'hint' });
  const err = el('div', { class: 'err', role: 'alert' });
  let userOK = false, checkT = null, checkSeq = 0;

  function paintPicture() {
    let url = data.pictureURL;
    if (!data.picture || data.picture === 'initials') url = initialsPicture(data.fullname || '?');
    if (data.picture && data.picture.startsWith('data:')) url = data.picture;
    big.style.backgroundImage = `url("${url}")`;
  }
  const setPicture = (id, url) => { data.picture = id; data.pictureURL = url; paintPicture(); };

  // the picture: a selfie first (the camera), or one of the icons
  const camIcon = '<path d="M2 5.5h2.6L6 3.8h4l1.4 1.7H14v7.2H2z"/><circle cx="8" cy="9" r="2.3"/>';
  const selfieBtn = el('button', { class: 'btn primary selfie-btn', disabled: true }, svg(camIcon, 'cam'), el('span', { text: 'Take a Selfie' }));
  const camNote = el('div', { class: 'cam-note', text: 'Looking for a camera…' });
  const iconBtn = el('button', { class: 'link pick-icon', text: 'Pick an Icon' });
  selfieBtn.addEventListener('click', () => takeSelfie((url) => setPicture(url, url)));
  iconBtn.addEventListener('click', () => pickIcon(data.picture, (id, url) => setPicture(id, url)));

  // keep looking while there's no camera (a USB camera can be plugged in now)
  let camTimer = null;
  const showCamera = (c) => {
    if (step !== 'account') return;
    selfieBtn.disabled = !c.present;
    camNote.textContent = c.present ? '' : (c.why || 'No camera found. Plug one in, or pick an icon.');
    camNote.classList.toggle('hidden', !!c.present);
    clearTimeout(camTimer);
    if (!c.present) camTimer = setTimeout(async () => showCamera(await findCamera()), 3000);
  };
  findCamera().then(showCamera);
  if (navigator.mediaDevices) navigator.mediaDevices.ondevicechange = async () => { if (step === 'account') showCamera(await findCamera()); };

  const body = el('div', { class: 'acct' },
    el('div', { class: 'pic' }, big, selfieBtn, camNote, iconBtn),
    el('div', { class: 'fields' },
      el('label', { class: 'f' }, 'Full name', fname),
      el('label', { class: 'f' }, 'Account name', uname, uHint),
      el('label', { class: 'f' }, 'Computer name', cname, cHint),
      el('div', { class: 'row2' },
        el('label', { class: 'f' }, 'Password', pw, pHint),
        el('label', { class: 'f' }, 'Verify password', pw2, vHint)),
      err));
  STEPS = NEW_STEPS = newSteps();
  const restoreLink = canRestore ? el('button', { class: 'link', text: 'Restore from a Time Turner Backup…', onclick: () => { save(); clearTimeout(camTimer); STEPS = TT_STEPS; findPage(); } }) : null;
  const { nextBtn } = page('account', { title: 'Create Your Account', lead: 'This is the account you’ll log in with. It can install apps and change settings.', body, extra: restoreLink,
    back: oem ? () => { save(); clearTimeout(camTimer); languagePage(); } : null,
    next: () => { save(); clearTimeout(camTimer); create(); }, nextLabel: 'Continue' });

  function save() { data.fullname = fname.value.trim(); data.username = uname.value.trim(); data.computer = cname.value.trim(); data.password = pw.value; data.verify = pw2.value; }
  function computerOK() { const c = cname.value.trim(); return c.length > 0 && c.length <= 63 && /[A-Za-z0-9À-ÿ]/.test(c) && !/[\n\\]/.test(c); }
  function validate() {
    const s = strength(pw.value);
    pHint.textContent = s.text; pHint.className = 'hint ' + s.cls;
    const match = pw2.value && pw.value === pw2.value;
    vHint.textContent = pw2.value ? (match ? 'Passwords match.' : 'Passwords don’t match.') : '';
    vHint.className = 'hint ' + (pw2.value ? (match ? 'good' : 'bad') : '');
    const cOK = computerOK();
    cHint.textContent = cname.value.trim() && !cOK ? 'Use letters or numbers in the name.' : 'Other computers and devices see this name.';
    cHint.className = 'hint ' + (cname.value.trim() && !cOK ? 'bad' : '');
    nextBtn.disabled = !(fname.value.trim() && !/[:,=]/.test(fname.value) && userOK && cOK && pw.value && match);
  }
  function checkUser() {
    const u = uname.value.trim();
    userOK = false; validate();
    clearTimeout(checkT);
    if (!u) { uHint.textContent = 'Used for your home folder. It can’t be changed later.'; uHint.className = 'hint'; uname.classList.remove('bad'); return; }
    checkT = setTimeout(async () => {
      const seq = ++checkSeq;
      const r = await setup.helper('check-user', { username: u });
      if (seq !== checkSeq) return;
      userOK = !!r.ok;
      uHint.textContent = r.ok ? `Your home folder will be /home/${u}` : (r.error || 'That name can’t be used.');
      uHint.className = 'hint ' + (r.ok ? 'good' : 'bad');
      uname.classList.toggle('bad', !r.ok);
      validate();
    }, 250);
  }
  fname.addEventListener('input', () => {
    if (!data.userEdited) { uname.value = suggestUser(fname.value); checkUser(); }
    if (!data.computerEdited) cname.value = suggestComputer(fname.value);
    data.fullname = fname.value; paintPicture(); validate();
  });
  uname.addEventListener('input', () => {
    const v = uname.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (v !== uname.value) uname.value = v;
    data.userEdited = !!uname.value; checkUser();
  });
  cname.addEventListener('input', () => { data.computerEdited = !!cname.value.trim(); validate(); });
  cname.addEventListener('blur', () => { if (!cname.value.trim()) { data.computerEdited = false; cname.value = suggestComputer(fname.value); validate(); } });
  pw.addEventListener('input', validate);
  pw2.addEventListener('input', validate);
  paintPicture();
  if (data.username) checkUser(); else validate();
  fname.focus();
}

/* ------------------------------------------------------------ the icons */
function pickIcon(current, done) {
  const grid = el('div', { class: 'icon-grid', role: 'radiogroup', 'aria-label': 'Icons' });
  let chosen = current && !String(current).startsWith('data:') ? current : 'initials';
  const tile = (id, url, label) => {
    const b = el('button', { class: 'av big-av', role: 'radio', 'aria-checked': String(chosen === id), title: label, 'aria-label': label, style: { backgroundImage: `url("${url}")` } });
    b.addEventListener('click', () => { chosen = id; for (const x of grid.children) x.setAttribute('aria-checked', String(x === b)); });
    b.addEventListener('dblclick', () => { chosen = id; use(); });
    return b;
  };
  grid.append(tile('initials', initialsPicture(data.fullname || '?'), 'Your initials'));
  for (const a of avatars) grid.append(tile(a.id, a.url, a.id.replace(/-/g, ' ')));
  const close = () => { document.removeEventListener('keydown', key, true); wrap.remove(); };
  const use = () => { const a = avatars.find((x) => x.id === chosen); close(); done(chosen, a ? a.url : null); };
  const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  document.addEventListener('keydown', key, true);
  const wrap = el('div', { class: 'selfie' }, el('div', { class: 'box icons' },
    el('h2', { text: 'Pick an Icon' }), grid,
    el('div', { class: 'acts' }, el('button', { class: 'btn', text: 'Cancel', onclick: close }), el('span', { class: 'grow' }), el('button', { class: 'btn primary', text: 'Use Icon', onclick: use }))));
  $('#stage').append(wrap);
  (grid.querySelector('[aria-checked="true"]') || grid.firstChild).focus();
}

/* ------------------------------------------------------------ the camera
 * Root's helper looks for a USB video-class camera, loads the uvcvideo driver if it isn't, and (once
 * the person allows it) lets the setup screen open the camera. Then Chromium's getUserMedia takes the photo. */
async function findCamera() {
  const r = await setup.helper('camera', { grant: false }).catch(() => null);
  let media = false;
  try { media = (await navigator.mediaDevices.enumerateDevices()).some((d) => d.kind === 'videoinput'); } catch {}
  if (r && r.ok) return { present: r.present || media, why: r.present || media ? '' : (r.usb ? 'The camera is starting…' : '') };
  return { present: media };
}
async function cameraPermission() {
  if (data.cameraAllowed) return true;
  return new Promise((resolve) => {
    const answer = (yes) => { wrap.remove(); resolve(yes); };
    const wrap = el('div', { class: 'selfie' }, el('div', { class: 'box small' },
      el('div', { class: 'perm-ic' }, svg('<path d="M2 5.5h2.6L6 3.8h4l1.4 1.7H14v7.2H2z"/><circle cx="8" cy="9" r="2.3"/>', 'cam')),
      el('h2', { text: 'Allow palOS to use the camera?' }),
      el('p', { text: 'palOS uses the camera to take your account picture. Later, apps ask before they use it, and its light is on whenever it’s in use.' }),
      el('div', { class: 'acts' }, el('span', { class: 'grow' }), el('button', { class: 'btn', text: 'Don’t Allow', onclick: () => answer(false) }), el('button', { class: 'btn primary', text: 'Allow', onclick: () => answer(true) }))));
    $('#stage').append(wrap);
    wrap.querySelector('.btn.primary').focus();
  });
}
async function takeSelfie(done) {
  if (!(await cameraPermission())) return;
  const g = await setup.helper('camera', { grant: true }).catch(() => null);
  if (g && g.ok && !g.present) return alertIn('No camera found', 'Plug in a camera and try again, or pick an icon instead.');
  data.cameraAllowed = true;
  selfie(done);
}
async function selfie(done) {
  let stream = null;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false }); }
  catch (e) {
    const busy = e && /NotReadable|TrackStart|Could not start/i.test(`${e.name} ${e.message}`);
    return alertIn('The camera couldn’t be used', busy ? 'Another program is using the camera. Close it and try again.' : 'Check that the camera is plugged in, then try again. You can also pick an icon instead.');
  }
  const video = el('video', { autoplay: true, playsinline: true, muted: true });
  video.srcObject = stream;
  const count = el('div', { class: 'count' });
  const flash = el('div', { class: 'flash' });
  const stop = () => { for (const t of stream.getTracks()) t.stop(); wrap.remove(); };
  const take = el('button', { class: 'btn primary', text: 'Take Photo' });
  const again = el('button', { class: 'btn hidden', text: 'Take Another' });
  const use = el('button', { class: 'btn primary hidden', text: 'Use This Photo' });
  const still = el('canvas', { class: 'still hidden', width: '512', height: '512' });
  const shoot = () => {
    take.disabled = true; let n = 3; count.textContent = n;
    const t = setInterval(() => {
      n -= 1;
      if (n > 0) { count.textContent = n; return; }
      clearInterval(t); count.textContent = '';
      const vw = video.videoWidth, vh = video.videoHeight, side = Math.min(vw, vh);
      const g = still.getContext('2d');
      g.save(); g.translate(512, 0); g.scale(-1, 1);          // a mirror, as people expect from a camera facing them
      g.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, 512, 512); g.restore();
      flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      still.classList.remove('hidden'); video.classList.add('hidden');
      take.classList.add('hidden'); take.disabled = false; again.classList.remove('hidden'); use.classList.remove('hidden');
    }, 700);
  };
  take.addEventListener('click', shoot);
  again.addEventListener('click', () => { still.classList.add('hidden'); video.classList.remove('hidden'); again.classList.add('hidden'); use.classList.add('hidden'); take.classList.remove('hidden'); });
  use.addEventListener('click', () => { const url = still.toDataURL('image/png'); stop(); done(url); });
  const wrap = el('div', { class: 'selfie' }, el('div', { class: 'box' },
    el('h2', { text: 'Take a Selfie' }), el('div', { class: 'frame' }, video, still, count, flash),
    el('div', { class: 'acts' }, el('button', { class: 'btn', text: 'Cancel', onclick: stop }), el('span', { class: 'grow' }), again, take, use)));
  $('#stage').append(wrap);
}
function alertIn(title, text) {
  const wrap = el('div', { class: 'selfie' }, el('div', { class: 'box small' }, el('h2', { text: title }), el('p', { text }),
    el('div', { class: 'acts' }, el('span', { class: 'grow' }), el('button', { class: 'btn primary', text: 'OK', onclick: () => wrap.remove() }))));
  $('#stage').append(wrap);
}

/* ------------------------------------------------------------ creating the account */
async function create() {
  busy = true;
  page('done', { title: 'Setting Up Your Account', lead: 'This only takes a moment.', body: el('div', { class: 'msg' }, el('div', { class: 'spin' })) });
  const picture = (!data.picture || data.picture === 'initials') ? initialsPicture(data.fullname) : data.picture;
  const t0 = Date.now();
  const r = await setup.helper('create-user', { fullname: data.fullname, username: data.username, password: data.password, picture, dark: false, computer: data.computer || suggestComputer(data.fullname), camera: !!data.cameraAllowed });
  await new Promise((res) => setTimeout(res, Math.max(0, 1200 - (Date.now() - t0))));
  busy = false;
  if (!r.ok) {
    await accountPage();
    $('#card .err').textContent = r.error || 'The account couldn’t be created.';
    return;
  }
  data.hostname = r.computer || r.hostname || '';
  data.donePicture = picture;
  if (tt.choice === 'migrate' && !data.migrated) migratePage(); else afterAccount();
}

/* ------------------------------------------------------------ Migration Assistant: another computer's disk
   Every disk is looked at read-only. The chosen person's Desktop, Documents, Downloads, Music, Pictures and
   Videos come into the new account (nothing already there is replaced), and their palOS apps into Applications. */
async function migJob(action, payload, tick) {
  const st = await setup.helper(action, payload);
  if (!st.ok) return { error: st.error || 'Setup’s helper didn’t answer.' };
  for (;;) {
    await new Promise((r) => setTimeout(r, 500));
    const r = await setup.helper('mig-job');
    const j = r && r.job;
    if (!j) return { error: (r && r.error) || 'Setup’s helper stopped answering.' };
    if (tick) tick(j);
    if (!j.running) return { result: j.result, error: j.error };
  }
}
async function migratePage() {
  STEPS = NEW_STEPS = newSteps();
  const skip = () => { data.migrated = true; setup.helper('mig-release'); afterAccount(); };
  const status = el('div', { style: { marginTop: '10px' }, text: 'Looking for other computers’ disks…' });
  const { nextBtn } = page('migrate', { title: 'Migration Assistant', lead: 'Plug in the other computer’s disk or your backup drive. Nothing on it is changed.',
    body: el('div', { class: 'msg' }, el('div', { class: 'spin' }), status), next: () => {}, nextDisabled: true,
    extra: el('button', { class: 'link', text: 'Not Now', onclick: skip }) });
  const r = await migJob('mig-scan', {}, (j) => { if (j.text) status.textContent = j.text; });
  const found = (r.result || []);
  if (step !== 'migrate') return;
  if (!found.length) {
    page('migrate', { title: 'Migration Assistant', lead: 'No files from another computer were found. Plug in the disk (with a USB adapter or enclosure) and search again.',
      body: el('div', { class: 'msg small' }, el('b', { text: r.error || 'Nothing found yet' })), next: migratePage, nextLabel: 'Search Again',
      extra: el('button', { class: 'link', text: 'Not Now', onclick: skip }) });
    return;
  }
  let sel = found[0].id;
  const pick = { folders: new Set(), apps: true };
  const KIND = { windows: 'Windows', palos: 'palOS', linux: 'Linux' };
  const list = el('div', { class: 'netlist', role: 'radiogroup' });
  const opts = el('div', { class: 'migopts' });
  const drawOpts = () => {
    const s = found.find((x) => x.id === sel);
    pick.folders = new Set(s.folders.map((f) => f.name));
    opts.replaceChildren(...s.folders.map((f) => {
      const c = el('input', { type: 'checkbox', checked: true }); c.addEventListener('change', () => { if (c.checked) pick.folders.add(f.name); else pick.folders.delete(f.name); });
      return el('label', { class: 'chk' }, c, el('span', { text: f.name }), el('small', { text: f.sizeText }));
    }), ...(s.apps.length ? [(() => { const c = el('input', { type: 'checkbox', checked: true }); c.addEventListener('change', () => { pick.apps = c.checked; }); return el('label', { class: 'chk' }, c, el('span', { text: s.apps.length === 1 ? '1 app' : `${s.apps.length} apps` }), el('small', { text: s.apps.slice(0, 4).join(', ') + (s.apps.length > 4 ? '…' : '') })); })()] : []));
  };
  for (const s of found) {
    const row = el('div', { class: 'net choice-row', role: 'radio', tabindex: '0', 'aria-checked': String(s.id === sel) }, driveIcon(s.removable),
      el('span', { class: 'n' }, el('b', { text: s.user }), el('small', { text: `${KIND[s.kind] || ''} · ${s.where}` })));
    row.addEventListener('click', () => { sel = s.id; for (const x of list.children) x.setAttribute('aria-checked', String(x === row)); drawOpts(); });
    list.append(row);
  }
  drawOpts();
  page('migrate', { title: 'Choose What to Bring Over', lead: 'Pick the person whose files you want, and what to copy into your new account.',
    body: el('div', {}, list, opts), next: copy, nextLabel: 'Copy',
    extra: el('button', { class: 'link', text: 'Not Now', onclick: skip }) });
  async function copy() {
    const s = found.find((x) => x.id === sel);
    const bar = el('i'); const line = el('span', { text: '' });
    busy = true;
    page('migrate', { title: 'Bringing Your Things Over', lead: 'Keep the other disk connected. Large collections take a while.',
      body: el('div', { class: 'progress' }, el('div', { class: 'bar' }, bar), el('div', { class: 'status' }, line)) });
    const res = await migJob('mig-copy', { source: sel, folders: [...pick.folders], apps: pick.apps ? s.apps : [] }, (j) => { bar.style.width = (j.pct || 0) + '%'; line.textContent = j.text || ''; });
    busy = false;
    data.migrated = true;
    if (res.error) {
      page('migrate', { title: 'Migration Assistant Stopped', lead: res.error, body: el('div'), next: afterAccount, nextLabel: 'Continue', extra: el('button', { class: 'link', text: 'Try Again', onclick: () => { data.migrated = false; migratePage(); } }) });
      return;
    }
    afterAccount();
  }
}

/* ------------------------------------------------------------ after the account: internet, then graphics drivers */
async function afterAccount() {
  let ns = null; try { ns = await setup.netStatus(); } catch {}
  STEPS = NEW_STEPS = newSteps();
  // already online (a network cable, or the Wi-Fi the installer joined, which it passed on): nothing to ask
  netOK = !!(ns && ns.nm && !ns.online);
  STEPS = NEW_STEPS = newSteps();
  if (netOK) wifiPage(driversOrDone, { first: true });
  else driversOrDone();
}
async function driversOrDone() {
  if (!gpu) { try { gpu = await setup.helper('gpu'); } catch { gpu = { nvidia: false }; } }
  STEPS = NEW_STEPS = newSteps();
  if (gpu && gpu.nvidia && gpu.driver !== 'nvidia' && !data.driversDone) driversPage();   // already installed (by the installer): nothing to offer
  else donePage(data.donePicture);
}

/* ------------------------------------------------------------ graphics drivers (computers with NVIDIA graphics)
   "Pick Defaults" installs the driver Ubuntu recommends for this chip, and the 32-bit library games need.
   "I'll Do It Myself" lists the drivers to choose from (or none: the built-in open-source driver stays). */
const DRV_ICON = '<rect x="2" y="7" width="28" height="16" rx="2.5"/><path d="M6 23v3M10 23v3M14 23v3M18 23v3M22 23v3M26 23v3"/><rect x="6" y="11" width="9" height="8" rx="1.5"/><circle cx="23" cy="15" r="3.6"/>';
async function driversPage() {
  const chip = (gpu.names && gpu.names[0]) || 'NVIDIA graphics';
  let choice = data.drvChoice || 'defaults';
  const opt = (id, title, text) => {
    const b = el('button', { class: 'choice', 'aria-pressed': String(choice === id) }, el('div', { class: 'ic' }, svg(id === 'defaults' ? '<path d="M6 16.5l6 6 14-14"/>' : '<circle cx="16" cy="16" r="3.5"/><path d="M16 4v4M16 24v4M4 16h4M24 16h4M7.5 7.5l2.8 2.8M21.7 21.7l2.8 2.8M7.5 24.5l2.8-2.8M21.7 10.3l2.8-2.8"/>', 'pi', '0 0 32 32')), el('div', {}, el('b', { text: title }), el('span', { text })));
    b.addEventListener('click', () => { choice = id; data.drvChoice = id; for (const x of box.children) x.setAttribute('aria-pressed', String(x === b)); });
    b.addEventListener('dblclick', go);
    return b;
  };
  const box = el('div', { class: 'choices', role: 'radiogroup' },
    opt('defaults', 'Pick Defaults', 'palOS installs the best NVIDIA driver for this computer, with what games need. Nothing else to do.'),
    opt('myself', 'I’ll Do It Myself', 'Choose a driver from the list, or keep the built-in open-source driver for now.'));
  const body = el('div', {}, el('div', { class: 'gpu-chip' }, svg(DRV_ICON, 'gpu-ic', '0 0 32 32'), el('span', { text: chip })), box);
  async function go() {
    let ns = null; try { ns = await setup.netStatus(); } catch {}
    if (!(ns && ns.online)) { alertIn('Connect to the internet first', 'The NVIDIA driver is downloaded from the internet. Go back to connect, or skip this for now.'); return; }
    if (choice === 'defaults') return installDriver('auto');
    return chooseDriver();
  }
  page('drivers', { title: 'Graphics Drivers', lead: 'This computer has NVIDIA graphics. NVIDIA’s own driver makes games, video and extra displays work their best.',
    body, back: netOK ? () => wifiPage(driversOrDone, { first: true }) : null, next: go,
    extra: el('button', { class: 'link', text: 'Not Now', onclick: () => { data.driversDone = true; donePage(data.donePicture); } }) });
}
async function drvWait(onTick) {
  for (;;) {
    await new Promise((r) => setTimeout(r, 700));
    const j = await setup.helper('drv-job');
    if (onTick) onTick(j);
    if (!j.running) return j;
  }
}
async function chooseDriver() {
  busy = true;
  const msg = el('div', { class: 'msg' }, el('div', { class: 'spin' }), el('div', { style: { marginTop: '10px' }, text: 'Getting the list of drivers…' }));
  page('drivers', { title: 'Choose a Driver', lead: 'The recommended driver is first. Open drivers are NVIDIA’s newer, open-source kind (GeForce 16 series and later).', body: msg });
  const st = await setup.helper('drv-scan');
  const j = st.ok ? await drvWait() : { error: st.error };
  busy = false;
  const list = (j.result && j.result.drivers) || [];
  let pick = (list.find((d) => d.recommended) || list[0] || {}).pkg || 'none';
  const rows = el('div', { class: 'netlist drv', role: 'radiogroup' });
  const row = (id, name, sub) => {
    const r = el('div', { class: 'net' + (pick === id ? ' on' : ''), role: 'radio', tabindex: '0', 'aria-checked': String(pick === id) },
      el('span', { class: 'n' }, el('b', { text: name }), sub ? el('small', { text: sub }) : null));
    r.addEventListener('click', () => { pick = id; for (const x of rows.children) { x.classList.toggle('on', x === r); x.setAttribute('aria-checked', String(x === r)); } });
    return r;
  };
  for (const d of list) {
    const n = d.pkg.replace(/^nvidia-driver-/, '');
    const ver = n.replace(/\D.*$/, '');
    const kind = [d.open ? 'Open' : 'NVIDIA', d.server ? 'for servers' : ''].filter(Boolean).join(' ');
    rows.append(row(d.pkg, `NVIDIA driver ${ver}${d.open ? ' (open)' : ''}${d.server ? ' (server)' : ''}`, [d.recommended ? 'Recommended' : '', kind].filter(Boolean).join(' · ')));
  }
  rows.append(row('none', 'No driver for now', 'Keep the built-in open-source driver (Nouveau).'));
  const note = !list.length ? el('div', { class: 'err', text: j.error || 'No NVIDIA drivers were found for this chip.' }) : null;
  page('drivers', { title: 'Choose a Driver', lead: 'The recommended driver is first. Open drivers are NVIDIA’s newer, open-source kind (GeForce 16 series and later).',
    body: el('div', {}, rows, note), back: driversPage, nextLabel: 'Install',
    next: () => { if (pick === 'none') { data.driversDone = true; donePage(data.donePicture); } else installDriver(pick); } });
}
async function installDriver(pkg) {
  busy = true;
  const bar = el('i', { style: { width: '2%' } });
  const status = el('div', { class: 'status', text: 'Installing the graphics driver…' });
  page('drivers', { title: 'Installing the Graphics Driver', lead: 'This takes a few minutes. Keep the computer on and connected.',
    body: el('div', { class: 'progress' }, el('div', { class: 'bar' }, bar), status) });
  const st = await setup.helper('drv-install', { pkg });
  const j = st.ok ? await drvWait((x) => { bar.style.width = Math.max(2, x.pct || 0) + '%'; if (x.step) status.textContent = x.step + '…'; }) : { error: st.error };
  busy = false;
  if (j.error) {
    page('drivers', { title: 'The Driver Couldn’t Be Installed', lead: 'palOS will keep using the built-in open-source driver.',
      body: el('div', { class: 'err', text: j.error }), back: driversPage, next: () => installDriver(pkg), nextLabel: 'Try Again',
      extra: el('button', { class: 'link', text: 'Not Now', onclick: () => { data.driversDone = true; donePage(data.donePicture); } }) });
    return;
  }
  data.driversDone = true; data.driverInstalled = true;
  donePage(data.donePicture);
}

/* ------------------------------------------------------------ language (a computer set up for a new owner)
   Setup starts again in the chosen language (run-setup reads it), straight on to the account page. */
async function languagePage() {
  const LANGS = (await setup.languages()) || [];
  const cur = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
  let lang = (LANGS.find((l) => cur.startsWith(l.id.toLowerCase())) || LANGS.find((l) => cur.startsWith(l.id.split('-')[0])) || LANGS[0] || { id: 'en' }).id;
  let region = null;
  const find = el('input', { type: 'search', class: 'oval', placeholder: '⌕', 'aria-label': 'Search' });
  const list = el('div', { class: 'langlist', role: 'listbox' });
  const reg = el('select', { class: 'region', 'aria-label': 'Country or region' });
  let names = null; try { names = new Intl.DisplayNames([navigator.language, 'en'], { type: 'region' }); } catch {}
  const nm = (c) => { try { return (names && names.of(c)) || c; } catch { return c; } };
  const fillRegions = () => {
    const L = LANGS.find((l) => l.id === lang); if (!L) return;
    reg.replaceChildren(...L.regions.map((c) => el('option', { value: c, text: nm(c) })));
    region = L.regions[0]; reg.value = region;
  };
  reg.addEventListener('change', () => { region = reg.value; });
  const fill = () => {
    const q = find.value.trim().toLowerCase();
    list.replaceChildren(...LANGS.filter((l) => !q || (l.name + ' ' + l.english).toLowerCase().includes(q)).map((l) => {
      const r = el('div', { class: 'lr' + (l.id === lang ? ' on' : ''), dir: l.rtl ? 'rtl' : 'ltr', role: 'option' }, el('span', { text: l.name }), l.name !== l.english ? el('small', { text: l.english }) : null);
      r.addEventListener('click', () => { lang = l.id; fill(); fillRegions(); });
      r.addEventListener('dblclick', go);
      return r;
    }));
    const on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  };
  find.addEventListener('input', () => { const q = find.value.trim().toLowerCase(); const h = LANGS.find((l) => (l.name + ' ' + l.english).toLowerCase().includes(q)); if (q && h && h.id !== lang) { lang = h.id; fillRegions(); } fill(); });
  async function go() {
    busy = true;
    const r = await setup.helper('set-language', { language: lang, region });
    if (!r.ok) { busy = false; alertIn('Language', r.error || 'The language couldn’t be set.'); return; }
    setup.restartInLanguage();
  }
  STEPS = NEW_STEPS = newSteps();
  page('language', { title: 'Choose Your Language', lead: 'palOS and its apps will use it. Your country or region sets dates, money and the keyboard.',
    body: el('div', { class: 'langpage' }, find, list, el('label', { class: 'regrow' }, el('span', { text: 'Country or region' }), reg)), next: go, nextLabel: 'Continue' });
  document.querySelectorAll('#card h1').forEach((n) => n.setAttribute('data-no-l10n', ''));
  fill(); fillRegions();
}

function donePage(picture) {
  const url = picture && picture.startsWith('data:') ? picture : (avatars.find((a) => a.id === picture) || {}).url;
  const tip = (icon, text) => el('div', {}, svg(icon), el('span', { text }));
  const body = el('div', { class: 'done' },
    el('div', { class: 'face', style: { backgroundImage: url ? `url("${url}")` : 'none' } }),
    el('div', { class: 'who', text: data.fullname }),
    el('div', { class: 'sub', text: data.hostname ? `${data.username} on “${data.hostname}”` : data.username }),
    el('div', { class: 'tips' },
      tip('<path d="M8 1.6l1.9 4 4.5.6-3.3 3.1.8 4.4L8 11.6l-3.9 2.1.8-4.4L1.6 6.2l4.5-.6z"/>', 'Migration Assistant, in Utilities, brings your files over from another computer.'),
      tip('<circle cx="8" cy="8" r="6"/><path d="M8 5v3.4l2.2 1.4"/>', 'Time Turner can back up your whole computer to an external drive.'),
      tip('<path d="M3 4.5h10M3 8h10M3 11.5h6"/>', 'Every app’s menus are in the bar at the top of the screen.')));
  page('done', { title: 'You’re All Set', lead: data.driverInstalled ? 'The computer restarts once to start the new graphics driver, then your desktop opens.' : 'Your desktop opens next.', body, next: finish, nextLabel: 'Start Using palOS' });
}

async function finish() {
  busy = true;
  $('#black').classList.remove('hidden');
  const r = await setup.helper('finish');
  if (!r.ok) {
    $('#black').classList.add('hidden');
    busy = false;
    $('#card .lead').textContent = r.error || 'Something went wrong. Try again.';
  }
}

/* ------------------------------------------------------------ new account, or restore from Time Turner */
const TT_ICON = 'file:///usr/share/icons/hicolor/128x128/apps/time-turner.png';
const MIG_ICON = 'file:///usr/share/icons/hicolor/128x128/apps/palos-migration-assistant.png';
const tt = { choice: 'new', source: null, key: '', snaps: [], sid: null, info: null, users: {}, wifi: true, apps: true, report: null };

async function choosePage() {
  if (tt.first === undefined) { tt.first = false; try { tt.first = await setup.restoreFirst(); } catch {} if (tt.first) tt.choice = tt.first === 'migrate' ? 'migrate' : 'restore'; }
  if (!['new', 'restore', 'migrate'].includes(tt.choice)) tt.choice = 'new';
  const opt = (id, icon, title, text) => {
    const b = el('button', { class: 'choice', 'aria-pressed': String(tt.choice === id) }, icon, el('div', {}, el('b', { text: title }), el('span', { text })));
    b.addEventListener('click', () => { tt.choice = id; for (const x of box.children) x.setAttribute('aria-pressed', String(x === b)); });
    b.addEventListener('dblclick', go);
    return b;
  };
  const person = svg('<circle cx="16" cy="11" r="5.5"/><path d="M5.5 27c.8-5.6 5-9 10.5-9s9.7 3.4 10.5 9"/><path d="M25 5v6M22 8h6"/>', 'pi', '0 0 32 32');
  const box = el('div', { class: 'choices', role: 'radiogroup' },
    opt('new', el('div', { class: 'ic' }, person), 'Create New Account', 'Start fresh: set up a new account with your name, picture and password.'),
    opt('restore', el('div', { class: 'ic' }, el('img', { src: TT_ICON, alt: '' })), 'Restore from Time Turner',
      'Bring back your accounts, files, Wi-Fi networks and apps from a Time Turner backup on a drive or a network share.'),
    opt('migrate', el('div', { class: 'ic' }, el('img', { src: MIG_ICON, alt: '' })), 'Migration Assistant',
      'Make your account, then bring your files and apps over from another computer’s disk: palOS, Linux or Windows. That disk isn’t changed.'));
  function go() { if (tt.choice === 'restore') { STEPS = TT_STEPS; findPage(); } else { STEPS = NEW_STEPS = newSteps(); accountPage(); } }
  STEPS = tt.choice === 'restore' ? TT_STEPS : (NEW_STEPS = newSteps());
  page('choose', { title: 'Set Up This Computer', lead: 'Start with a new account, or bring everything back from a Time Turner backup.', body: box, back: wifiPage, next: go });
}

/* Run one of the helper's background jobs, calling tick(job) while it runs. Resolves { result, error }. */
async function runJob(action, payload, tick) {
  const st = await setup.helper(action, payload);
  if (!st.ok) return { error: st.error || 'Setup’s helper didn’t answer.' };
  for (;;) {
    await new Promise((r) => setTimeout(r, 500));
    const r = await setup.helper('tt-job');
    const j = r && r.job;
    if (!j) return { error: (r && r.error) || 'Setup’s helper stopped answering.' };
    if (tick) tick(j);
    if (!j.running) return { result: j.result, error: j.error };
  }
}

function driveIcon(removable) {
  return svg(removable
    ? '<rect x="9" y="3" width="14" height="26" rx="3"/><path d="M13 3v5M19 3v5"/><circle cx="16" cy="22" r="1.2"/>'
    : '<rect x="3" y="8" width="26" height="16" rx="3"/><path d="M3 18h26"/><circle cx="24" cy="21" r="1.1"/>', 'dr', '0 0 32 32');
}

async function findPage() {
  STEPS = TT_STEPS;
  const listBox = el('div', {}, el('div', { class: 'msg' }, el('div', { class: 'spin' }), el('div', { style: { marginTop: '10px' }, text: 'Looking for backup drives…' })));
  const share = el('div', { class: 'share hidden' });
  const url = el('input', { type: 'text', placeholder: 'smb://server/share', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Network share address', value: (tt.source && tt.source.type === 'smb' && tt.source.url) || '' });
  const user = el('input', { type: 'text', placeholder: 'Name (leave empty for guest)', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Name on the share', value: (tt.source && tt.source.type === 'smb' && tt.source.username) || '' });
  const pass = el('input', { type: 'password', placeholder: 'Password', 'aria-label': 'Password for the share', value: (tt.source && tt.source.type === 'smb' && tt.source.password) || '' });
  share.append(el('label', { class: 'f' }, 'Address', url), el('div', { class: 'row2' }, el('label', { class: 'f' }, 'Name', user), el('label', { class: 'f' }, 'Password', pass)));
  let drives = [], sel = tt.source && tt.source.type === 'drive' ? tt.source.id : (tt.source && tt.source.type === 'smb' ? 'smb' : null);
  let scanning = false, timer = null;
  const { nextBtn } = page('find', {
    title: 'Find Your Backup', lead: 'Plug in the drive Time Turner backs up to, or connect to the network share it uses.',
    body: el('div', {}, listBox, share), back: async () => { clearTimeout(timer); await setup.helper('tt-release'); STEPS = NEW_STEPS = newSteps(); accountPage(); },
    next: () => { clearTimeout(timer); tt.source = sel === 'smb' ? { type: 'smb', url: url.value.trim(), username: user.value.trim(), password: pass.value } : { ...drives.find((d) => d.id === sel), type: 'drive' }; openOrAsk(); },
    nextDisabled: true, extra: el('span', {}, el('button', { class: 'link', text: 'Wi-Fi…', onclick: () => { clearTimeout(timer); wifiPage(findPage); } }), el('button', { class: 'link', text: 'Search Again', onclick: () => scan() })),
  });
  const valid = () => { nextBtn.disabled = !(sel === 'smb' ? /^(smb:)?\/\/[^/\s]+\/[^/\s]+/.test(url.value.trim()) : drives.some((d) => d.id === sel)); };
  url.addEventListener('input', valid);
  function draw() {
    const list = el('div', { class: 'netlist', role: 'radiogroup' });
    const row = (id, icon, name, sub) => {
      const r = el('div', { class: 'net choice-row', role: 'radio', tabindex: '0', 'aria-checked': String(sel === id) }, icon, el('span', { class: 'n' }, el('b', { text: name }), sub ? el('small', { text: sub }) : null));
      const pick = () => { sel = id; share.classList.toggle('hidden', id !== 'smb'); for (const x of list.children) x.setAttribute('aria-checked', String(x === r)); valid(); if (id === 'smb') url.focus(); };
      r.addEventListener('click', pick);
      r.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); pick(); } });
      return r;
    };
    for (const d of drives) list.append(row(d.id, driveIcon(d.removable), d.label, `${d.sizeText} · has Time Turner backups`));
    list.append(row('smb', svg('<rect x="4" y="5" width="24" height="9" rx="2"/><rect x="4" y="18" width="24" height="9" rx="2"/><circle cx="9" cy="9.5" r="1.1"/><circle cx="9" cy="22.5" r="1.1"/>', 'dr', '0 0 32 32'), 'A network share…', 'A NAS or another computer (SMB)'));
    const parts = [];
    if (!drives.length) parts.push(el('div', { class: 'msg small' }, el('b', { text: 'No backup drive found yet' }), 'Plug in the drive and it will appear here.'));
    parts.push(list);
    listBox.replaceChildren(...parts);
    share.classList.toggle('hidden', sel !== 'smb');
    valid();
  }
  // The backups' key travels with them: open them straight away. Only backups made by an earlier
  // Time Turner ask for their recovery key (once).
  async function openOrAsk() {
    busy = true; nextBtn.disabled = true;
    const status = el('div', { class: 'msg small' }, el('div', { class: 'spin small' }), el('span', { text: 'Opening the backups…' }));
    listBox.prepend(status);
    const { result, error } = await runJob('tt-open', { source: tt.source, key: '' }, (j) => { status.lastChild.textContent = j.phase || 'Opening the backups…'; });
    busy = false; status.remove();
    if (step !== 'find') return;
    if (!error) {
      tt.key = ''; tt.keyless = true;
      tt.snaps = result.snapshots || [];
      tt.sid = null; tt.info = null; tt.users = {};
      pickPage();
      return;
    }
    tt.keyless = false;
    if (/recovery key/i.test(error)) { keyPage(); return; }
    nextBtn.disabled = false;
    listBox.prepend(el('div', { class: 'err', text: error }));
  }
  async function scan() {
    if (scanning || step !== 'find') return;
    scanning = true; clearTimeout(timer);
    const { result, error } = await runJob('tt-scan', {});
    scanning = false;
    if (step !== 'find') return;
    drives = (result && result.drives) || [];
    if (!sel && drives.length) sel = drives[0].id;
    if (sel && sel !== 'smb' && !drives.some((d) => d.id === sel)) sel = drives.length ? drives[0].id : null;
    draw();
    if (error) listBox.prepend(el('div', { class: 'err', text: error }));
    // keep looking while nothing is plugged in
    if (!drives.length) timer = setTimeout(scan, 5000);
  }
  scan();
}

function keyPage() {
  const key = el('input', { type: 'text', class: 'key', value: tt.key, spellcheck: 'false', autocomplete: 'off', placeholder: 'XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX', 'aria-label': 'Recovery key', maxlength: '60' });
  const err = el('div', { class: 'err', role: 'alert' });
  const status = el('div', { class: 'hint center' });
  const where = tt.source.type === 'smb' ? tt.source.url.replace(/^smb:/, '') : tt.source.label;
  const { nextBtn } = page('key', {
    title: 'Enter the Recovery Key', lead: `These backups on ${where} were made by an earlier Time Turner, which showed this key when it first backed up. You won’t need it again.`,
    body: el('div', { class: 'keybox' }, el('img', { class: 'tt', src: TT_ICON, alt: '' }), key, status, err),
    back: findPage, next: open, nextDisabled: key.value.replace(/[^0-9A-Za-z]/g, '').length < 8,
  });
  key.addEventListener('input', () => {
    const pos = key.selectionStart;
    const v = key.value.toUpperCase();
    if (v !== key.value) { key.value = v; key.setSelectionRange(pos, pos); }
    err.textContent = '';
    nextBtn.disabled = key.value.replace(/[^0-9A-Z]/g, '').length < 8;
  });
  key.focus();
  async function open() {
    tt.key = key.value.trim();
    busy = true; nextBtn.disabled = true; key.disabled = true; err.textContent = '';
    nextBtn.replaceChildren(el('div', { class: 'spin small', style: { borderTopColor: '#fff' } }));
    const { result, error } = await runJob('tt-open', { source: tt.source, key: tt.key }, (j) => { status.textContent = j.phase || ''; });
    busy = false;
    if (step !== 'key') return;
    status.textContent = '';
    key.disabled = false; nextBtn.textContent = 'Continue'; nextBtn.disabled = false;
    if (error) {
      err.textContent = error;
      if (/network|share|server|reached|password|address/i.test(error) && tt.source.type === 'smb') err.append(' ', el('button', { class: 'link', text: 'Change the share', onclick: findPage }));
      key.focus();
      return;
    }
    tt.snaps = result.snapshots || [];
    tt.sid = null; tt.info = null; tt.users = {};
    pickPage();
  }
}

function when(t) {
  const d = new Date(t);
  if (isNaN(d)) return '';
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 864e5);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { weekday: diff < 7 ? 'long' : undefined, day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' }) + `, ${time}`;
}
const KIND = { first: 'Full image', kernel: 'Before an update', upgrade: 'Before an upgrade', 'pre-restore': 'Before a restore', manual: 'Backed up by hand', auto: '' };

function pickPage() {
  const select = el('select', { 'aria-label': 'Backup' });
  for (const s of tt.snaps) select.append(el('option', { value: s.id, text: `${when(s.time)} — ${s.host}${KIND[s.kind] ? ` (${KIND[s.kind]})` : ''}`, selected: s.id === tt.sid }));
  const what = el('div', { class: 'what' });
  const err = el('div', { class: 'err', role: 'alert' });
  const { nextBtn } = page('pick', {
    title: 'Choose What to Restore', lead: 'Pick a backup. The newest is first.',
    body: el('div', {}, el('label', { class: 'f' }, 'Backup', select), what, err), back: () => (tt.keyless ? findPage() : keyPage()), next: () => restorePage(), nextLabel: 'Restore', nextDisabled: true,
  });
  let seq = 0;
  function validate() {
    const chosen = (tt.info ? tt.info.users : []).filter((u) => tt.users[u.name] && tt.users[u.name].on && !u.taken);
    nextBtn.disabled = !chosen.length || chosen.some((u) => u.needsPassword && !(tt.users[u.name].pw && tt.users[u.name].pw === tt.users[u.name].pw2));
  }
  async function inspect() {
    const my = ++seq;
    tt.sid = select.value; tt.info = null; nextBtn.disabled = true; err.textContent = '';
    const st = el('div', { class: 'hint center' });
    what.replaceChildren(el('div', { class: 'msg' }, el('div', { class: 'spin' }), st));
    const { result, error } = await runJob('tt-inspect', { snapshot: tt.sid }, (j) => { st.textContent = j.phase || ''; });
    if (my !== seq || step !== 'pick') return;
    if (error) { what.replaceChildren(); err.textContent = error; return; }
    tt.info = result;
    drawInfo();
  }
  function drawInfo() {
    const info = tt.info;
    const accts = el('div', { class: 'accts' });
    if (!info.users.length) accts.append(el('div', { class: 'msg small' }, el('b', { text: 'No accounts in this backup' }), 'Choose another backup, or go back and create a new account.'));
    for (const u of info.users) {
      const c = tt.users[u.name] || (tt.users[u.name] = { on: !u.taken, pw: '', pw2: '' });
      const box = el('input', { type: 'checkbox', checked: c.on && !u.taken, disabled: u.taken, 'aria-label': `Restore ${u.full}` });
      const face = el('div', { class: 'face', style: { backgroundImage: `url("${u.picture || initialsPicture(u.full)}")` } });
      const sub = u.taken ? 'There’s already an account with this name here.' : (u.hasHome ? `${u.name} · home folder and settings` : `${u.name} · no home folder in this backup`);
      const row = el('label', { class: 'acct-row' + (u.taken ? ' off' : '') }, box, face, el('span', { class: 'n' }, el('b', { text: u.full }), el('small', { text: sub })));
      accts.append(row);
      if (u.needsPassword && !u.taken) {
        const p1 = el('input', { type: 'password', placeholder: 'New password', value: c.pw, 'aria-label': `New password for ${u.full}` });
        const p2 = el('input', { type: 'password', placeholder: 'Verify', value: c.pw2, 'aria-label': `Verify the new password for ${u.full}` });
        const pwRow = el('div', { class: 'pwrow' + (c.on ? '' : ' hidden') }, el('small', { text: 'This backup has no password for this account. Choose one:' }), el('div', { class: 'row2' }, p1, p2));
        p1.addEventListener('input', () => { c.pw = p1.value; validate(); });
        p2.addEventListener('input', () => { c.pw2 = p2.value; validate(); });
        box.addEventListener('change', () => pwRow.classList.toggle('hidden', !box.checked));
        accts.append(pwRow);
      }
      box.addEventListener('change', () => { c.on = box.checked; validate(); });
    }
    const extras = el('div', { class: 'extras' });
    if (info.wifi.length) {
      const w = el('input', { type: 'checkbox', checked: tt.wifi });
      w.addEventListener('change', () => { tt.wifi = w.checked; });
      extras.append(el('label', { class: 'chk' }, w, el('span', { text: `Wi-Fi networks (${info.wifi.length}): ${info.wifi.slice(0, 3).join(', ')}${info.wifi.length > 3 ? '…' : ''}` })));
    }
    if (info.apps) {
      const a = el('input', { type: 'checkbox', checked: tt.apps });
      a.addEventListener('change', () => { tt.apps = a.checked; });
      extras.append(el('label', { class: 'chk' }, a, el('span', { text: `Reinstall ${info.apps} app${info.apps === 1 ? '' : 's'} that aren’t on this computer yet (needs the internet)` })));
    }
    what.replaceChildren(el('div', { class: 'sect', text: 'Accounts' }), accts, extras.children.length ? el('div', { class: 'sect', text: 'Also bring back' }) : null, extras);
    validate();
  }
  select.addEventListener('change', inspect);
  if (!select.value && tt.snaps.length) select.value = tt.snaps[0].id;
  if (tt.info && tt.info.id === select.value) drawInfo(); else inspect();
}

async function restorePage() {
  busy = true;
  const bar = el('div', { class: 'bar' }, el('i'));
  const phase = el('div', { class: 'phase', text: 'Starting…' });
  const detail = el('div', { class: 'hint center' });
  const stop = el('button', { class: 'btn', text: 'Stop' });
  page('restore', { title: 'Restoring Your Computer', lead: 'Your accounts and files are coming back from Time Turner. Large backups can take a while; keep the backup connected.',
    body: el('div', { class: 'progress' }, el('img', { class: 'tt spin-slow', src: TT_ICON, alt: '' }), phase, bar, detail), extra: stop });
  stop.addEventListener('click', async () => { stop.disabled = true; stop.textContent = 'Stopping…'; await setup.helper('tt-cancel'); });
  const users = tt.info.users.filter((u) => tt.users[u.name] && tt.users[u.name].on && !u.taken).map((u) => ({ name: u.name, password: u.needsPassword ? tt.users[u.name].pw : undefined }));
  const { result, error } = await runJob('tt-restore', { snapshot: tt.sid, users, wifi: tt.wifi, apps: tt.apps }, (j) => {
    phase.textContent = j.phase || '';
    detail.textContent = j.detail || '';
    bar.classList.toggle('busy', j.progress == null);
    bar.firstChild.style.width = j.progress == null ? '' : `${Math.round(j.progress * 100)}%`;
    stop.classList.toggle('hidden', !j.cancellable);
  });
  busy = false;
  if (error === 'cancelled') { pickPage(); return; }
  if (error) {
    page('restore', { title: 'The Restore Didn’t Finish', lead: 'Nothing was changed on this computer. You can try again, or choose another backup.',
      body: el('div', { class: 'msg' }, el('b', { text: 'What happened' }), error), back: pickPage, next: restorePage, nextLabel: 'Try Again' });
    return;
  }
  tt.report = result;
  ttDonePage(result);
}

function ttDonePage(r) {
  const tip = (icon, text) => el('div', {}, svg(icon), el('span', { text }));
  const faces = el('div', { class: 'faces' }, ...r.users.map((u) => el('div', { class: 'who1' }, el('div', { class: 'face', style: { backgroundImage: `url("${u.picture || initialsPicture(u.full)}")` } }), el('b', { text: u.full }))));
  const a = r.apps || {};
  const tips = [];
  const fresh = r.users.filter((u) => tt.info && tt.info.users.some((x) => x.name === u.name && x.needsPassword)).map((u) => u.full);
  tips.push(tip('<path d="M3 8.5l3 3 7-7"/>', `${r.users.length === 1 ? 'The account, its' : `${r.users.length} accounts, their`} files and settings are back. ` +
    (fresh.length ? `${fresh.join(' and ')} use${fresh.length === 1 ? 's' : ''} the new password you chose; ${fresh.length === r.users.length ? '' : 'everyone else logs in with their usual one.'}`.replace(/; $/, '.') : 'Log in with the usual password.')));
  if (r.wifi) tips.push(tip('<path d="M1.5 6.2a9.2 9.2 0 0 1 13 0"/><path d="M3.8 8.7a5.9 5.9 0 0 1 8.4 0"/><path d="M6.1 11.2a2.6 2.6 0 0 1 3.8 0"/>', `${r.wifi} saved Wi-Fi network${r.wifi === 1 ? '' : 's'} restored.`));
  if ((a.installed || []).length) tips.push(tip('<path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M3 13h10"/>', `${a.installed.length} app${a.installed.length === 1 ? '' : 's'} reinstalled.`));
  const missing = (a.unavailable || []).length + (a.failed || []).length;
  if (missing) tips.push(tip('<circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11h.01"/>', `${missing} app${missing === 1 ? '' : 's'} couldn’t be reinstalled${a.offline ? ' (no internet)' : ''}. The list is in “Apps to Reinstall” in ${r.users[0].full}’s home folder.`));
  if (r.backups) tips.push(tip('<circle cx="8" cy="8" r="6"/><path d="M8 5v3.4l2.2 1.4"/>', 'Time Turner carries on backing up to the same place.'));
  for (const w of r.warnings || []) tips.push(tip('<circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11h.01"/>', w));
  page('done', { title: 'Welcome Back', lead: r.hostname ? `This computer is now called ${r.hostname}.` : 'Everything is in place.',
    body: el('div', { class: 'done' }, faces, el('div', { class: 'tips' }, ...tips)), next: finish, nextLabel: 'Start Using palOS' });
}

/* ------------------------------------------------------------ start */
(async () => {
  const st = await setup.helper('status');
  canRestore = !!(st && st.timeturner);
  if (st && st.user) {
    // The account was already made (the setup screen had to restart after that): just finish.
    avatars = await setup.avatars().catch(() => []) || [];
    data.fullname = st.fullname || st.user; data.username = st.user; data.hostname = st.hostname || '';
    $('#stage').classList.remove('hidden');
    donePage(null);
    return;
  }
  oem = !!(st && st.oem);
  try { gpu = await setup.helper('gpu'); } catch { gpu = null; }
  let ns0 = null; try { ns0 = await setup.netStatus(); } catch {}
  netOK = !!(ns0 && ns0.nm && !ns0.online);
  // set up for a new owner: the language comes first; once chosen, setup starts again in it (no film then)
  if (oem && st.languageChosen) { $('#stage').classList.remove('hidden'); STEPS = NEW_STEPS = newSteps(); accountPage(); return; }
  await film();
  $('#stage').classList.remove('hidden');
  let first = false; try { first = !!(await setup.restoreFirst()); } catch {}
  if (first && canRestore) { STEPS = TT_STEPS; findPage(); return; }
  // the account first; the internet and drivers come after it (afterAccount)
  STEPS = NEW_STEPS = newSteps();
  if (oem) languagePage(); else accountPage();
})();

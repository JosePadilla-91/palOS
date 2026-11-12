'use strict';
/* Vid-View 2: open a video, watch it. Playback (direct, repackaged or converted live by ffmpeg) is the
   engine's job; this is the window around it: the controller, audio tracks, subtitles, speed, full screen,
   keyboard, drag and drop, and picking up where you left off. */
C.Viewer = (() => {
  const $ = C.$;
  const VIDEO_RE = /\.(mp4|m4v|mkv|webm|mov|avi|wmv|asf|flv|f4v|mpg|mpeg|m2v|vob|ts|m2ts|mts|m2t|3gp|3g2|ogv|ogm|divx|xvid|rm|rmvb|dv|mxf|nut|y4m|hevc|h264|h265|264|265|ivf|amv|qt|gifv)$/i;
  const SUB_RE = /\.(srt|ass|ssa|vtt|sub|smi)$/i;
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const app = $('#app'), player = $('#player'), video = $('#video');
  const E = new C.Engine(video);
  const subs = new C.Subtitles($('#subs'));
  let base = '', info = null, subKey = null, speed = 1, idleTimer = null, osdTimer = null, dragging = false;
  let busy = false, fitted = false, lastSave = 0, settings = {};

  // ---------------------------------------------------------------- start
  async function boot() {
    const b = await window.vidview.boot();
    base = b.base; E.base = base; settings = b.settings || {};
    for (const [id, ic] of [['b-play', 'play'], ['b-back', 'back10'], ['b-fwd', 'fwd10'], ['b-mute', 'vol'], ['b-tracks', 'tracks'], ['b-full', 'full']]) $('#' + id).innerHTML = C.icon(ic);
    $('#open').onclick = openDialog;
    $('#b-play').onclick = toggle;
    $('#b-back').onclick = () => jump(-10);
    $('#b-fwd').onclick = () => jump(10);
    $('#b-mute').onclick = () => setMuted(!video.muted);
    $('#vol').oninput = (e) => setVolume(Number(e.target.value));
    $('#b-full').onclick = () => window.vidview.win.fullscreen();
    $('#b-tracks').onclick = (e) => { e.stopPropagation(); togglePop('tracks'); };
    $('#b-speed').onclick = (e) => { e.stopPropagation(); togglePop('speed'); };
    video.addEventListener('click', () => { if (!closePops()) toggle(); });
    video.addEventListener('dblclick', () => window.vidview.win.fullscreen());
    document.addEventListener('click', (e) => { if (!e.target.closest('.popover, #b-tracks, #b-speed')) closePops(); });
    player.addEventListener('mousemove', wake);
    player.addEventListener('mousedown', wake);
    timeline();
    E.addEventListener('state', playIcon);
    E.addEventListener('loading', (e) => spinner(e.detail));
    E.addEventListener('buffering', (e) => spinner(e.detail));
    E.addEventListener('notice', (e) => C.toast(e.detail));
    E.addEventListener('fatal', (e) => fatal(e.detail));
    E.addEventListener('ready', fitWindow);
    E.addEventListener('ended', () => { save(0); playIcon(); wake(); });
    window.vidview.onWinState((s) => { $('#b-full').innerHTML = C.icon(s.fullscreen ? 'unfull' : 'full'); document.body.classList.toggle('fullscreen', s.fullscreen); });
    window.vidview.onOpenFiles((files) => openFiles(files));
    document.addEventListener('keydown', key, true);
    bindDrop();
    setVolume(settings.volume ?? 1, false);
    addEventListener('beforeunload', () => { if (info) save(E.time); });
    requestAnimationFrame(tick);
    if (b.files && b.files.length) openFiles(b.files);
  }

  // ---------------------------------------------------------------- opening
  async function openDialog() { const f = await window.vidview.openDialog(); if (f.length) openFiles(f); }

  async function openFiles(paths) {
    const subFile = paths.find((p) => SUB_RE.test(p));
    const film = paths.find((p) => !SUB_RE.test(p));
    if (film) await open(film);
    if (subFile && info) addSubtitleFile(subFile);
  }

  async function open(path) {
    if (busy) return;
    busy = true; spinner(true);
    const r = await window.vidview.open({ path }, C.Engine.caps());
    busy = false; spinner(false);
    if (!r.ok) { message('This video can’t be opened', r.error); return; }
    const i = r.info;
    if (!i.hasVideo) {
      window.vidview.close(i.id);
      message('That’s a sound file', `“${C.basename(path)}” has no picture. Vid-View plays videos; Discette plays music and other sound files.`,
        [['Open in Discette', () => window.vidview.openElsewhere(path), true]]);
      return;
    }
    if (info) close();               // the new one is a video: it takes the old one's place
    info = i; fitted = false; subKey = null; subs.clear(); subs.delay = 0; lastSave = 0;
    app.className = 'mode-player';
    window.vidview.win.title(`${i.title} — Vid-View`);
    setSpeed(1, false);
    let start = 0;
    if (i.resumeAt) { start = i.resumeAt; setTimeout(() => C.toast(`Resumed at ${C.fmt(start)}`, { action: 'Start Over', onAction: () => E.seek(0), ms: 6000 }), 900); }
    E.load(i, { start, audio: i.audio[0] ? i.audio[0].index : null, play: true });
    const sidecar = i.subs.find((s) => s.external);
    if (sidecar) selectSub(sidecar.key, true);
    buildTracks(); buildSpeed(); wake();
  }

  function close() {
    if (!info) return;
    save(E.time);
    window.vidview.close(info.id);
    E.unload(); subs.clear(); closePops();
    info = null;
  }
  function closeToEmpty() {
    if (!info) return;
    close();
    if (document.body.classList.contains('fullscreen')) window.vidview.win.fullscreen(false);
    app.className = 'mode-empty';
    window.vidview.win.title('Vid-View');
    window.vidview.win.restoreSize();
  }

  async function fitWindow() {
    if (fitted || !info || !info.dims || settings.fitWindow === false) return;
    fitted = true;
    const d = info.dims;
    if (d.displayWidth && d.displayHeight) await window.vidview.win.fit(d.displayWidth / d.displayHeight);
  }

  function save(t) { if (info) window.vidview.savePosition(info.key, t, info.duration, null); }

  // ---------------------------------------------------------------- playing
  function toggle() { if (!info) return; E.toggle(); osd(E.paused ? 'Paused' : 'Playing'); wake(); }
  function jump(d) { if (!info) return; E.seek(E.time + d, { delay: 200 }); osd(`${d > 0 ? '+' : '−'}${Math.abs(d)} s`); }
  function playIcon() { $('#b-play').innerHTML = C.icon(E.paused ? 'play' : 'pause'); }
  function setVolume(v, show = true) {
    v = C.clamp(v, 0, 1); video.volume = v; $('#vol').value = v;
    if (v > 0 && video.muted) video.muted = false;
    volIcon(); if (show) osd(`Volume ${Math.round(v * 100)}%`);
    window.vidview.setSettings({ volume: v });
  }
  function setMuted(m) { video.muted = m; volIcon(); osd(m ? 'Muted' : 'Sound on'); }
  function volIcon() { $('#b-mute').innerHTML = C.icon(video.muted || video.volume === 0 ? 'mute' : 'vol'); }
  function setSpeed(s, show = true) {
    speed = s; E.rate = s; video.playbackRate = s; $('#b-speed').textContent = `${s}×`;
    if (show) osd(`Speed ${s}×`); buildSpeed();
  }
  function stepSpeed(d) { const i = SPEEDS.indexOf(speed); setSpeed(SPEEDS[C.clamp((i < 0 ? 2 : i) + d, 0, SPEEDS.length - 1)]); }

  function spinner(on) { $('#spinner').classList.toggle('show', !!on); }
  function osd(text) { const o = $('#osd'); o.textContent = text; o.classList.add('show'); clearTimeout(osdTimer); osdTimer = setTimeout(() => o.classList.remove('show'), 900); }

  function wake() {
    player.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(maybeIdle, 2500);
  }
  function maybeIdle() {
    if (!info || E.paused || $('#hud').matches(':hover') || document.querySelector('.popover.show') || dragging) { idleTimer = setTimeout(maybeIdle, 1500); return; }
    player.classList.add('idle');
  }

  function timeline() {
    const tl = $('#timeline');
    const tAt = (x) => { const r = tl.getBoundingClientRect(); return C.clamp((x - r.left) / r.width, 0, 1) * E.duration; };
    const tip = (x) => { const r = tl.getBoundingClientRect(); const t = tAt(x); const el = $('#tl-tip'); el.textContent = C.fmt(t, E.duration >= 3600); el.style.left = `${C.clamp(x - r.left, 20, r.width - 20)}px`; };
    tl.addEventListener('pointermove', (e) => { tip(e.clientX); if (dragging) E.seek(tAt(e.clientX), { delay: 350 }); });
    tl.addEventListener('pointerdown', (e) => { if (!info) return; dragging = true; tl.setPointerCapture(e.pointerId); tl.classList.add('drag'); E.seek(tAt(e.clientX), { delay: 350 }); });
    const end = (e) => { if (!dragging) return; dragging = false; tl.classList.remove('drag'); E.seek(tAt(e.clientX), { delay: 10 }); };
    tl.addEventListener('pointerup', end);
    tl.addEventListener('pointercancel', end);
  }

  function tick(now) {
    if (info) {
      const t = E.time, d = E.duration || 0, long = d >= 3600;
      $('#t-cur').textContent = C.fmt(t, long);
      $('#t-rem').textContent = '-' + C.fmt(Math.max(0, d - t), long);
      const p = d ? C.clamp(t / d, 0, 1) * 100 : 0;
      $('.tl-fill').style.width = `${p}%`; $('.tl-knob').style.left = `${p}%`;
      $('.tl-buf').style.width = `${d ? C.clamp(E.bufferedEnd / d, 0, 1) * 100 : 0}%`;
      subs.render(t);
      if (now - lastSave > 5000 && !E.paused) { lastSave = now; save(t); }
    }
    requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------------- audio tracks & subtitles
  function row(label, on, act, note) {
    return C.el('button', { class: 'pop-row', onclick: (e) => { e.stopPropagation(); act(); } },
      C.el('span', { class: 'chk', text: on ? '✓' : '' }), C.el('span', { text: label }), note ? C.el('span', { class: 'note', text: note }) : null);
  }
  function buildTracks() {
    const p = $('#pop-tracks'); p.innerHTML = '';
    if (!info) return;
    p.append(C.el('div', { class: 'pop-h', text: 'Audio' }));
    if (!info.audio.length) p.append(C.el('div', { class: 'pop-empty', text: 'No sound' }));
    info.audio.forEach((a) => p.append(row(a.label, a.index === E.audioIdx, () => { chooseAudio(a.index); })));
    p.append(C.el('div', { class: 'pop-sep' }), C.el('div', { class: 'pop-h', text: 'Subtitles' }));
    p.append(row('Off', !subKey, () => { selectSub(null); buildTracks(); }));
    info.subs.forEach((s) => p.append(row(s.label, s.key === subKey, () => { selectSub(s.key); buildTracks(); }, s.bitmap ? 'drawn in' : '')));
    p.append(C.el('div', { class: 'pop-sep' }), row('Add Subtitles File…', false, async () => { closePops(); const f = await window.vidview.subtitleDialog(); if (f) addSubtitleFile(f); }));
    if (subKey) p.append(row(`Timing: ${subs.delay > 0 ? '+' : ''}${subs.delay.toFixed(1)} s`, false, () => { subs.delay = 0; buildTracks(); osd('Subtitle timing reset'); }, 'G / H'));
  }
  function chooseAudio(idx) { if (!info) return; E.setAudio(idx); const a = info.audio.find((x) => x.index === idx); if (a) osd(a.label.split(' · ')[0]); setTimeout(buildTracks, 0); }
  function cycleAudio() {
    if (!info || info.audio.length < 2) { osd(info && info.audio.length ? 'Only one audio track' : 'No sound'); return; }
    const i = info.audio.findIndex((a) => a.index === E.audioIdx);
    chooseAudio(info.audio[(i + 1) % info.audio.length].index);
  }
  async function selectSub(k, quiet = false) {
    subKey = k; subs.clear();
    if (!info) return;
    if (!k) { if (E.burn) E.setBurn(null); if (!quiet) osd('Subtitles off'); return; }
    const s = info.subs.find((x) => x.key === k); if (!s) return;
    if (s.bitmap) { E.setBurn(k); if (!quiet) osd(s.label); return; }      // picture subtitles are drawn into the video
    if (E.burn) E.setBurn(null);
    const id = info.id;
    try {
      const r = await fetch(`${base}/subs/${id}/${encodeURIComponent(k)}`);
      if (!r.ok) throw new Error(await r.text());
      subs.load(await r.text());
      if (!info || info.id !== id || subKey !== k) { subs.clear(); return; }
      if (!quiet) osd(s.label);
    } catch { C.toast('Those subtitles couldn’t be read', { kind: 'warn' }); subKey = null; }
    buildTracks();
  }
  function cycleSubs() {
    if (!info) return;
    const keys = [null, ...info.subs.map((s) => s.key)];
    selectSub(keys[(keys.indexOf(subKey) + 1) % keys.length]);
    buildTracks();
  }
  async function addSubtitleFile(file) {
    if (!info) return;
    const s = await window.vidview.addSubtitle(info.id, file);
    if (!s) { C.toast('Those subtitles couldn’t be read', { kind: 'warn' }); return; }
    if (!info.subs.find((x) => x.key === s.key)) info.subs.push(s);
    await selectSub(s.key);
  }
  function nudgeSubs(d) { if (!subKey) return; subs.delay = Math.round((subs.delay + d) * 10) / 10; subs.lastKey = ''; osd(`Subtitles ${subs.delay > 0 ? '+' : ''}${subs.delay.toFixed(1)} s`); buildTracks(); }

  function buildSpeed() {
    const p = $('#pop-speed'); p.innerHTML = '';
    p.append(C.el('div', { class: 'pop-h', text: 'Speed' }));
    for (const s of SPEEDS) p.append(row(s === 1 ? 'Normal' : `${s}×`, s === speed, () => { setSpeed(s); closePops(); }));
  }
  function togglePop(name, force) {
    const p = $('#pop-' + name), b = $(name === 'tracks' ? '#b-tracks' : '#b-speed');
    const show = force ?? !p.classList.contains('show');
    closePops();
    if (!show) return;
    if (name === 'tracks') buildTracks();
    p.classList.add('show');
    const r = b.getBoundingClientRect(), w = p.offsetWidth;
    p.style.left = `${C.clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8)}px`;
    wake();
  }
  function closePops() { const open = C.$$('.popover.show'); open.forEach((p) => p.classList.remove('show')); return open.length > 0; }

  // ---------------------------------------------------------------- messages
  function message(title, text, buttons = []) {
    const m = C.modal(`<h3>${C.esc(title)}</h3><p>${C.esc(text || '')}</p><div class="btns"></div>`);
    const box = m.el.querySelector('.btns');
    for (const [label, act, def] of buttons) box.append(C.el('button', { class: 'pill', text: label, onclick: () => { m.close(); act(); } }));
    box.append(C.el('button', { class: 'pill' + (buttons.length ? '' : ' def'), text: 'OK', onclick: () => m.close() }));
    setTimeout(() => { const b = box.querySelector('.pill:last-child'); if (b) b.focus(); }, 30);
  }
  function fatal(msg) { closeToEmpty(); message('This video can’t be played', msg); }

  // ---------------------------------------------------------------- drag and drop
  function bindDrop() {
    let depth = 0;
    const veil = $('#dropveil');
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
    addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; depth++; veil.classList.add('show'); });
    addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) veil.classList.remove('show'); });
    addEventListener('dragover', (e) => { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
    addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); depth = 0; veil.classList.remove('show');
      const paths = Array.from(e.dataTransfer.files).map((f) => window.vidview.pathForFile(f)).filter(Boolean);
      if (paths.length) openFiles(paths);
    });
  }

  // ---------------------------------------------------------------- keyboard
  function key(e) {
    const modal = $('#modal');
    if (modal.classList.contains('show')) { if (e.key === 'Escape' || e.key === 'Enter') { const b = modal.querySelector('.pill:last-child'); if (b) b.click(); e.preventDefault(); } return; }
    const ctrl = e.ctrlKey || e.metaKey, k = e.key, lk = k.toLowerCase();
    let ok = true;
    if (ctrl && lk === 'o') openDialog();
    else if (ctrl && lk === 'w') { if (info) closeToEmpty(); else window.vidview.win.close(); }
    else if (ctrl && lk === 'q') window.vidview.win.close();
    else if (k === 'F11' || (!ctrl && lk === 'f')) window.vidview.win.fullscreen();
    else if (k === 'Escape') { if (!closePops() && document.body.classList.contains('fullscreen')) window.vidview.win.fullscreen(false); }
    else if (ctrl || e.altKey || !info) ok = false;
    else if (k === ' ' || lk === 'k') toggle();
    else if (k === 'ArrowLeft') jump(e.shiftKey ? -30 : -5);
    else if (k === 'ArrowRight') jump(e.shiftKey ? 30 : 5);
    else if (lk === 'j') jump(-10);
    else if (lk === 'l') jump(10);
    else if (k === ',') { E.frameStep(-1); osd('◂ Frame'); }
    else if (k === '.') { E.frameStep(1); osd('Frame ▸'); }
    else if (k === '[') stepSpeed(-1);
    else if (k === ']') stepSpeed(1);
    else if (k === '=') setSpeed(1);
    else if (k === 'ArrowUp') setVolume(video.volume + 0.05);
    else if (k === 'ArrowDown') setVolume(video.volume - 0.05);
    else if (lk === 'm') setMuted(!video.muted);
    else if (lk === 'a') cycleAudio();
    else if (lk === 'c') cycleSubs();
    else if (lk === 'g') nudgeSubs(-0.1);
    else if (lk === 'h') nudgeSubs(0.1);
    else if (k === 'Home') E.seek(0, { delay: 0 });
    else ok = false;
    if (ok) { e.preventDefault(); e.stopPropagation(); if (info) wake(); }
  }

  return { boot, openDialog, openFiles, toggle };
})();

C.Viewer.boot().catch((e) => {
  console.error(e);
  document.body.innerHTML = `<pre style="color:#eee;padding:40px;font:14px monospace">Vid-View couldn’t start:\n${C.esc(e.stack || e)}</pre>`;
});

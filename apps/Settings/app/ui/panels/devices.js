'use strict';
/* Displays and Sound panels. */

const ROTATIONS = [{ value: 'normal', label: 'Standard' }, { value: 'left', label: 'Turned Left' }, { value: 'right', label: 'Turned Right' }, { value: 'inverted', label: 'Upside Down' }];
const PLACES = [{ value: 'right', label: 'Right of the main display' }, { value: 'left', label: 'Left of the main display' }, { value: 'above', label: 'Above the main display' }, { value: 'below', label: 'Below the main display' }, { value: 'mirror', label: 'Same picture as the main display' }];

function sizeOf(o) {
  const m = (o.mode || o.preferred || '0x0').split('x').map(Number);
  return (o.rotation === 'left' || o.rotation === 'right') ? { w: m[1], h: m[0] } : { w: m[0], h: m[1] };
}
function placeOf(o, main) {
  if (o.x === main.x && o.y === main.y) return 'mirror';
  if (o.x >= main.x + sizeOf(main).w) return 'right';
  if (o.x + sizeOf(o).w <= main.x) return 'left';
  if (o.y + sizeOf(o).h <= main.y) return 'above';
  return 'below';
}

panel('display', 'Displays', 'dev', async (root, stale) => {
  const info = await sys.call('display:get');
  if (stale()) return;
  if (!info.available || !info.outputs.length) { root.append(card(el('div', { class: 'empty', text: 'No displays could be read.' }))); return; }
  const before = JSON.parse(JSON.stringify(info.outputs));
  const outs = info.outputs.map((o) => ({ ...o, enabled: o.active, place: 'right' }));
  const main = outs.find((o) => o.primary) || outs[0];
  main.primary = true;
  for (const o of outs) if (o !== main) o.place = o.active ? placeOf(o, main) : 'right';
  const multi = outs.length > 1;

  const preview = el('div', { class: 'screens', 'aria-hidden': 'true' });
  const drawPreview = () => {
    preview.replaceChildren(...outs.filter((o) => o.enabled).map((o) => {
      const s = sizeOf(o); const k = 150 / Math.max(1, Math.max(...outs.map((x) => sizeOf(x).w)));
      return el('div', { class: 'screen' + (o.primary ? ' primary' : ''), style: { width: `${Math.max(60, s.w * k)}px`, height: `${Math.max(40, s.h * k)}px` } },
        el('div', {}, el('div', { text: o.label }), el('div', { style: { color: 'var(--dim)' }, text: o.mode || '' })));
    }));
  };
  drawPreview();
  root.append(card(preview));

  const applyBtn = button('Apply', apply, 'primary');
  applyBtn.disabled = true;
  let layoutChanged = false;
  const changed = () => { layoutChanged = true; applyBtn.disabled = false; drawPreview(); };

  // Scale: how big text, buttons and windows are drawn. Nothing changes until Apply.
  const sc = await sys.call('display:scale');
  if (stale()) return;
  let scaleWant = sc.scale;
  const pct = (x) => `${Math.round(x * 100)}%`;
  const scaleSel = select(sc.choices.map((x) => ({ value: String(x), label: pct(x) + (x === sc.recommended ? ' (Recommended)' : '') + (x === 1 ? ' — most space' : '') })),
    String(sc.scale), (v) => { scaleWant = Number(v); applyBtn.disabled = !layoutChanged && scaleWant === sc.scale; }, 'Scale');
  root.append(heading('Scale'), card(
    row('Make Everything Bigger', sc.dpi ? `This display is about ${sc.dpi} pixels per inch` : 'Bigger text, buttons and windows; less fits on the screen', scaleSel)),
    note('Pick a size, then press Apply. Apps you open afterwards use it straight away; log out and back in to resize the ones already open, the Dock and window title bars.'));

  const cards = el('div');
  function drawCards() {
    cards.replaceChildren();
    for (const o of outs) {
      const rateSel = el('span');
      const rates = () => { const m = o.modes.find((x) => x.id === (o.mode || o.preferred)); return m ? m.rates : []; };
      const fillRates = () => rateSel.replaceChildren(select(rates().map((r) => ({ value: r, label: `${Math.round(parseFloat(r))} Hz` })), o.rate, (v) => { o.rate = v; changed(); }, 'Refresh rate'));
      fillRates();
      const modeSel = select(o.modes.map((m) => ({ value: m.id, label: `${m.width} × ${m.height}${m.id === o.preferred ? ' (Recommended)' : ''}` })), o.mode || o.preferred, (v) => {
        o.mode = v; o.rate = rates()[0] || ''; fillRates(); changed();
      }, 'Resolution');
      const rows = [
        row('Resolution', null, modeSel),
        rates().length ? row('Refresh Rate', null, rateSel) : null,
        row('Rotation', null, select(ROTATIONS, o.rotation, (v) => { o.rotation = v; changed(); }, 'Rotation')),
      ];
      if (multi) {
        rows.unshift(row('Use This Display', o.primary ? 'The main display stays on' : null, toggle(o.enabled, (v) => { o.enabled = v; if (!o.mode) o.mode = o.preferred; changed(); }, 'Use this display', o.primary)));
        if (!o.primary) rows.push(row('Position', null, select(PLACES, o.place, (v) => { o.place = v; changed(); }, 'Position')));
        rows.push(row('Main Display', 'The menu bar and dock appear here', toggle(o.primary, (v) => {
          if (!v) { drawCards(); return; }
          for (const x of outs) x.primary = x === o;
          o.enabled = true; changed(); drawCards();
        }, 'Main display', o.primary)));
      }
      cards.append(heading(o.label + (multi ? ` (${o.name})` : '')), card(...rows.filter(Boolean)));
    }
  }
  drawCards();
  root.append(cards);
  root.append(el('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '16px' } }, applyBtn));

  async function apply() {
    applyBtn.disabled = true;
    if (layoutChanged) { const ok = await applyLayout(); if (!ok) return; layoutChanged = false; }
    if (scaleWant !== sc.scale) {
      const r = await sys.call('display:setScale', scaleWant);
      if (!r.ok) { toast('The new size couldn\'t be set.', 5000); return; }
      sc.scale = r.scale;
      const now = await dialog({ title: `Everything is now drawn at ${pct(r.scale)}`,
        text: 'Apps you open from now on use the new size. To resize the apps already open, the Dock and the window title bars, log out and back in.',
        ok: 'Log Out Now', cancel: 'Later' });
      if (now) sys.call('region:logout');
    }
  }
  async function applyLayout() {
    const m = outs.find((o) => o.primary) || outs[0];
    const ms = sizeOf(m);
    const plan = outs.map((o) => {
      const s = sizeOf(o);
      let x = 0, y = 0;
      if (o !== m) {
        if (o.place === 'right') x = ms.w;
        else if (o.place === 'left') x = -s.w;
        else if (o.place === 'above') y = -s.h;
        else if (o.place === 'below') y = ms.h;
      }
      return { name: o.name, enabled: o.enabled, mode: o.mode || o.preferred, rate: o.rate, rotation: o.rotation, primary: o.primary, x, y };
    });
    const minX = Math.min(...plan.filter((p) => p.enabled).map((p) => p.x)), minY = Math.min(...plan.filter((p) => p.enabled).map((p) => p.y));
    for (const p of plan) { p.x -= minX; p.y -= minY; }
    const r = await sys.call('display:apply', plan);
    if (!r.ok) { toast(r.error || 'The display settings couldn\'t be applied.', 5000); refresh(); return false; }
    let left = 15;
    const msg = el('span', { text: `Going back to the previous settings in ${left} seconds.` });
    const tick = setInterval(() => { left--; msg.textContent = `Going back to the previous settings in ${left} seconds.`; if (left <= 0) { clearInterval(tick); const d = document.querySelector('#dlg'); if (d) d.remove(); revert(); } }, 1000);
    const keep = await dialog({ title: 'Keep these display settings?', extra: el('p', {}, msg), ok: 'Keep Settings', cancel: 'Go Back' });
    clearInterval(tick);
    if (keep) { await sys.call('display:save', plan); toast('Display settings saved.'); return true; }
    if (left > 0) revert();
    return false;
  }
  async function revert() {
    await sys.call('display:apply', before.map((o) => ({ name: o.name, enabled: o.active, mode: o.mode, rate: o.rate, rotation: o.rotation, primary: o.primary, x: o.x, y: o.y })));
    toast('Went back to the previous display settings.');
    refresh();
  }
});

panel('sound', 'Sound', 'dev', async (root, stale) => {
  const s = await sys.call('sound:get');
  if (stale()) return;
  if (!s.available) { root.append(card(el('div', { class: 'empty', text: 'The sound system isn\'t running.' }))); return; }
  const block = (kind, title, list, def) => {
    const cur = list.find((d) => d.name === def) || list[0];
    if (!cur) return [heading(title), card(el('div', { class: 'empty', text: kind === 'sink' ? 'No speakers or headphones found.' : 'No microphones found.' }))];
    const lbl = el('span', { class: 'badge', text: `${cur.volume}%`, style: { minWidth: '40px', textAlign: 'right' } });
    return [heading(title), card(
      row(kind === 'sink' ? 'Play Sound Through' : 'Record Sound From', null, select(list.map((d) => ({ value: d.name, label: d.label })), cur.name, async (v) => { await sys.call('sound:set', kind, 'default', v); refresh(); }, title)),
      row('Volume', null, slider(0, 100, 1, Math.min(100, cur.volume), (v) => { lbl.textContent = `${v}%`; sys.call('sound:set', kind, 'volume', cur.name, v); }, 'Volume',
        () => { if (kind === 'sink') sys.call('sound:test'); }), lbl),
      row('Mute', null, toggle(cur.muted, (v) => sys.call('sound:set', kind, 'mute', cur.name, v), 'Mute')))];
  };
  root.append(...block('sink', 'Output', s.sinks, s.defaultSink), ...block('source', 'Input', s.sources, s.defaultSource),
    heading('Alerts'), card(row('Play Alert Sounds', 'Short sounds for warnings and notifications', toggle(s.alerts, (v) => sys.call('sound:alerts', v), 'Alert sounds')),
      row('Play User Interface Sound Effects', 'Emptying the Trash, removing an item from the Dock, changing the volume', toggle(s.effects, (v) => sys.call('sound:effects', v), 'Interface sound effects'))));
});

panel('keyboard', 'Keyboard', 'dev', async (root, stale) => {
  const k = await sys.call('kb:get');
  if (stale()) return;
  root.append(card(row('Num Lock On at Login', 'The number keys on the keypad type numbers as soon as you sign in',
    toggle(k.numlock, (v) => sys.call('kb:numlock', v), 'Num Lock on at login'))));
  if (!k.numlockx) root.append(note('Install the “numlockx” package for this to take effect.'));
  root.append(heading('Screenshots'), card(
    row('Whole Screen', null, el('span', { class: 'badge', text: 'Print' })),
    row('Selected Area', null, el('span', { class: 'badge', text: 'Shift + Print' })),
    row('Front Window', null, el('span', { class: 'badge', text: 'Alt + Print' })),
    row('Copy Instead of Saving', 'Hold Ctrl as well', el('span', { class: 'badge', text: 'Ctrl + …' }))),
    note('Screenshots are saved in Pictures › Screenshots.'));
});

panel('mouse', 'Mouse', 'dev', async (root, stale) => {
  const m = await sys.call('mouse:get');
  if (stale()) return;
  const s = m.settings;
  const set = async (k, v) => { s[k] = v; await sys.call('mouse:set', { [k]: v }); };
  if (!m.present) root.append(note('No mouse is connected right now. These settings apply as soon as one is.'));
  root.append(heading('Scrolling'), card(
    row('Scroll Direction', s.naturalScrolling ? 'The content moves the way your finger moves the wheel, like a trackpad' : 'Rolling the wheel down moves down the page',
      seg([{ value: 'natural', label: 'Natural' }, { value: 'standard', label: 'Standard' }], s.naturalScrolling ? 'natural' : 'standard', async (v) => { await set('naturalScrolling', v === 'natural'); refresh(); }, 'Scroll direction'))));
  root.append(note('One direction for everything: every mouse, the trackpad and every app scroll the same way.'));
  root.append(heading('Pointer'), card(
    row('Tracking Speed', null, el('div', { class: 'speed' }, el('span', { class: 'sl', text: 'Slow' }),
      slider(-1, 1, 0.1, s.speed, (v) => set('speed', v), 'Tracking speed'), el('span', { class: 'sl', text: 'Fast' }))),
    row('Pointer Acceleration', 'Moving the mouse faster takes the pointer further. Off: the pointer moves exactly as far as the mouse, for games and drawing.', toggle(s.acceleration, (v) => set('acceleration', v), 'Pointer acceleration'))));
  root.append(heading('Buttons'), card(
    row('Primary Button', s.primary === 'right' ? 'Click with the right button; the left one opens menus' : 'Click with the left button; the right one opens menus',
      seg([{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }], s.primary, async (v) => { await set('primary', v); refresh(); }, 'Primary button')),
    row('Double-Click Speed', 'How quickly two clicks count as a double-click', el('div', { class: 'speed' }, el('span', { class: 'sl', text: 'Slow' }),
      slider(-1300, -200, 50, -s.doubleClick, (v) => set('doubleClick', -v), 'Double-click speed'), el('span', { class: 'sl', text: 'Fast' })))));
});

panel('trackpad', 'Trackpad', 'dev', async (root, stale) => {
  const t = await sys.call('tp:get');
  if (stale()) return;
  const s = t.settings;
  const set = async (k, v) => { s[k] = v; await sys.call('tp:set', { [k]: v }); };
  if (!t.present) root.append(note('No trackpad is connected right now. These settings apply as soon as one is.'));

  root.append(heading('Point & Click'), card(
    row('Tap to Click', 'Tap with one finger to click', toggle(s.tapToClick, (v) => set('tapToClick', v), 'Tap to click')),
    row('Secondary Click', s.secondaryClick === 'two-fingers' ? 'Tap or click with two fingers' : 'Click in the bottom-right corner',
      seg([{ value: 'two-fingers', label: 'Two Fingers' }, { value: 'corner', label: 'Bottom-Right Corner' }], s.secondaryClick, async (v) => { await set('secondaryClick', v); refresh(); }, 'Secondary click')),
    row('Tracking Speed', null, el('div', { class: 'speed' }, el('span', { class: 'sl', text: 'Slow' }),
      slider(-1, 1, 0.1, s.speed, (v) => set('speed', v), 'Tracking speed'), el('span', { class: 'sl', text: 'Fast' }))),
    row('Ignore the Trackpad While Typing', 'So a palm resting on it doesn’t move the pointer', toggle(s.disableWhileTyping, (v) => set('disableWhileTyping', v), 'Ignore the trackpad while typing'))));

  root.append(heading('Scroll & Zoom'), card(
    row('Natural Scrolling', 'The content follows your two fingers. This also sets the direction for every mouse.', toggle(s.naturalScrolling, (v) => set('naturalScrolling', v), 'Natural scrolling')),
    row('Zoom In or Out', 'Pinch two fingers apart or together', toggle(s.pinchZoom, (v) => set('pinchZoom', v), 'Pinch to zoom')),
    row('Rotate', 'Turn two fingers, in apps that can rotate (Quick Look, BrushBoard, picture viewers)', toggle(s.rotate, (v) => set('rotate', v), 'Rotate'))));

  root.append(heading('More Gestures'), card(
    row('Back and Forward', 'Swipe left or right with two fingers, in Seeker and Nave', toggle(s.swipeBackForward, (v) => set('swipeBackForward', v), 'Swipe between pages')),
    row('Switch Screens', 'Swipe left or right with three or four fingers', toggle(s.swipeScreens, (v) => set('swipeScreens', v), 'Swipe between screens')),
    row('All Windows', 'Swipe up with four fingers; swipe down to go back', toggle(s.overview, (v) => set('overview', v), 'All windows'))));
  if (!t.gestures) root.append(note('The gesture service isn’t running, so only tapping, clicking and scrolling work right now. Restarting the computer starts it.'));
});

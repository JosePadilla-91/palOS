'use strict';
/* Accessibility: Screen Reader and the Accessibility Keyboard. */

panel('access', 'Accessibility', 'look', async (root, stale) => {
  const a = await sys.call('access:get');
  if (stale()) return;
  root.append(heading('Screen Reader'), card(
    row('Screen Reader', 'Speaks what’s on the screen as you move around it. Super+Alt+S also turns it on and off.',
      toggle(a.reader, async (v) => { await sys.call('access:reader', v); refresh(); }, 'Screen Reader')),
    row('Speaking Rate', null, select([{ value: '-40', label: 'Slow' }, { value: '-10', label: 'Relaxed' }, { value: '10', label: 'Normal' }, { value: '35', label: 'Fast' }, { value: '60', label: 'Very Fast' }],
      String([-40, -10, 10, 35, 60].reduce((b, x) => Math.abs(x - a.rate) < Math.abs(b - a.rate) ? x : b, 10)), (v) => sys.call('access:voice', { rate: Number(v) }), 'Speaking rate')),
    row('Typing Echo', 'What it says as you type', seg([{ value: 'characters', label: 'Letters' }, { value: 'words', label: 'Words' }, { value: 'off', label: 'Off' }],
      a.echo, (v) => sys.call('access:voice', { echo: v }), 'Typing echo'))));
  const keys = [
    ['Super+Alt+S', 'Screen Reader on or off'], ['Ctrl', 'Stop talking'], ['Super+Alt+Space', 'Say the focused item again'],
    ['Super+Alt+W', 'Say the window’s name'], ['Super+Alt+L', 'Say the current line'], ['Super+Alt+A', 'Read from the cursor to the end'],
    ['Super+Alt+T', 'Say the time'], ['Super+Alt+↑ / ↓', 'Talk faster / slower'], ['Super+Alt+K', 'Typing echo: letters, words, off'],
  ];
  root.append(heading('Screen Reader Keys'), card(...keys.map(([k, what]) => row(what, null, el('kbd', { class: 'kbd', text: k })))),
    note('Super is the key with the palOS logo (the Windows key on most keyboards).'));
  root.append(heading('Typing'), card(
    row('Accessibility Keyboard', 'A keyboard on the screen, for typing with a mouse, trackpad or switch', button('Open', () => sys.call('access:keyboard')))));
});

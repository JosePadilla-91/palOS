'use strict';
setupChrome({ zoom: false });
const K = (key, ...mods) => accelText({ key, mods: mods.length ? mods : ['ctrl'] });
const rows = [
  [K('n'), 'New Seeker window'], [K('n', 'ctrl', 'shift'), 'New folder'], [K('o') + ' or ' + K('Down'), 'Open the selected item'], [K('Up'), 'Enclosing folder'],
  [K('['), 'Back'], [K(']'), 'Forward'], [K('i'), 'Get Info'], [K('d'), 'Duplicate'], [K('l'), 'Make Alias'],
  ['Space or ' + K('y'), 'Quick Look'], [K('BackSpace'), 'Move to Trash'], [K('BackSpace', 'ctrl', 'shift'), 'Empty Trash'], [K('e'), 'Eject'],
  [K('f'), 'Find'], [K('c') + ' ' + K('x') + ' ' + K('v'), 'Copy, cut, paste files'], [K('1') + ' – ' + K('4'), 'Icons, List, Columns, Carousel'],
  [K('h', 'ctrl', 'shift'), 'Home'], [K('d', 'ctrl', 'shift'), 'Desktop'], [K('a', 'ctrl', 'shift'), 'Applications'], [K('c', 'ctrl', 'shift'), 'Computer'],
  [K('g', 'ctrl', 'shift'), 'Go to Folder'], [K('period', 'ctrl', 'shift'), 'Show or hide hidden files'], ['Return', 'Rename'], [K('w'), 'Close window'],
];
$('#keys').append(...rows.map(([a, b]) => el('tr', {}, el('td', { text: a }), el('td', { text: b }))));

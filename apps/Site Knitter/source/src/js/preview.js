'use strict';
const $ = (s) => document.querySelector(s);
let st = { pages: [] };
window.pv.onState((s) => {
  st = s;
  $('#back').disabled = !s.canBack; $('#fwd').disabled = !s.canForward;
  const sel = $('#page');
  const names = s.pages.slice();
  if (s.page && !names.includes(s.page)) names.push(s.page);
  if (sel.dataset.list !== names.join('|')) {
    sel.textContent = '';
    for (const p of names) { const o = document.createElement('option'); o.value = p; o.textContent = p === 'index.html' ? 'Home (index.html)' : p; sel.append(o); }
    sel.dataset.list = names.join('|');
  }
  sel.value = s.page || '';
  document.title = (s.title ? s.title + ' — ' : '') + 'Preview';
  for (const b of document.querySelectorAll('.seg button')) b.setAttribute('aria-checked', String(b.dataset.d === s.device));
});
$('#back').onclick = () => window.pv.cmd('back');
$('#fwd').onclick = () => window.pv.cmd('forward');
$('#reload').onclick = () => window.pv.cmd('reload');
$('#ext').onclick = () => window.pv.cmd('external');
$('#page').onchange = (e) => window.pv.cmd('page', e.target.value);
for (const b of document.querySelectorAll('.seg button')) b.onclick = () => window.pv.cmd('device', b.dataset.d);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') { e.preventDefault(); window.pv.cmd('reload'); }
  if (e.altKey && e.key === 'ArrowLeft') window.pv.cmd('back');
  if (e.altKey && e.key === 'ArrowRight') window.pv.cmd('forward');
});

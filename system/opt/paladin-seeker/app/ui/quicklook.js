'use strict';
if (Q.get('composited') !== '1') document.body.classList.add('no-composite');
let items = [], idx = 0, index = false;
const stage = $('#stage');
const TEXT_RE = /^(text\/|application\/(json|xml|javascript|x-shellscript|x-perl|x-python|x-ruby|toml|yaml|x-yaml|sql|x-desktop|x-php))/;

async function show() {
  const it = items[idx]; stage.textContent = '';
  if (!it) return;
  $('#name').textContent = items.length > 1 && index ? `${items.length} items` : it.name;
  $('#ctr').textContent = items.length > 1 ? `${idx + 1} of ${items.length}` : '';
  $$('#prev, #next, #index, #ctr').forEach((b) => (b.style.display = items.length > 1 ? '' : 'none'));
  if (index && items.length > 1) {
    const g = el('div', { class: 'grid' });
    items.forEach((x, i) => {
      const im = x.thumb ? el('img', { src: thumbURL(x.path, 256, x.mtime) }) : iconImg(x.icon, 96);
      if (x.thumb) im.onerror = () => im.replaceWith(iconImg(x.icon, 96));
      const c = el('div', { class: 'g' }, im, el('div', { text: x.name }));
      c.addEventListener('click', () => { idx = i; index = false; show(); });
      g.append(c);
    });
    stage.append(g); return;
  }
  const m = it.mime || '';
  const card = () => {
    stage.append(el('div', { class: 'card' }, iconImg(it.icon, 128), el('div', {}, el('div', { class: 'n', text: it.name }),
      el('div', { class: 'd', html: `${it.kind || ''}<br>${it.dir ? '' : humanSize(it.size) + '<br>'}Modified ${relDate(it.mtime)}` }))));
  };
  if (it.dir) return card();
  if (m.startsWith('image/')) {
    const im = el('img', { class: 'main', src: /tiff|x-|heic|psd/.test(m) ? thumbURL(it.path, 1024, it.mtime) : fileURL(it.path) });
    im.onerror = () => { stage.textContent = ''; card(); };
    stage.append(im); return;
  }
  if (m === 'application/pdf') { stage.append(el('iframe', { src: fileURL(it.path) + '#toolbar=0&view=FitH' })); return; }
  if (m.startsWith('video/')) { const v = el('video', { src: fileURL(it.path), controls: true, autoplay: true }); v.onerror = () => { stage.textContent = ''; card(); }; stage.append(v); return; }
  if (m.startsWith('audio/')) { stage.append(el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' } }, iconImg(it.icon, 128), el('audio', { src: fileURL(it.path), controls: true, autoplay: true }))); return; }
  if (TEXT_RE.test(m) && (it.size || 0) < 20 * 1024 * 1024) {
    const txt = await seeker.invoke('ql:text', it.path);
    if (typeof txt === 'string') { stage.append(el('pre', { text: txt })); return; }
  }
  if (m === 'text/html') { stage.append(el('iframe', { src: fileURL(it.path), sandbox: '' })); return; }
  card();
}

seeker.on('ql:show', (d) => { items = d.items || []; idx = Math.min(d.index || 0, items.length - 1); index = false; show(); });
$('#x').addEventListener('click', () => seeker.send('ql:close'));
$('#prev').addEventListener('click', () => { idx = (idx - 1 + items.length) % items.length; index = false; show(); });
$('#next').addEventListener('click', () => { idx = (idx + 1) % items.length; index = false; show(); });
$('#index').addEventListener('click', () => { index = !index; show(); });
$('#fs').addEventListener('click', () => seeker.send('ql:fullscreen'));
$('#openbtn').addEventListener('click', () => { const it = items[idx]; if (it) { seeker.invoke('fs:open', [it.path]); seeker.send('ql:close'); } });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === ' ') seeker.send('ql:close');
  // Ctrl+R / Ctrl+L turn a picture right or left (also what turning two fingers on the trackpad sends)
  if ((e.ctrlKey || e.metaKey) && !e.altKey && /^[rl]$/i.test(e.key)) {
    const im = stage.querySelector('img.main');
    if (!im) return;
    e.preventDefault();
    const turn = ((+im.dataset.turn || 0) + (e.key.toLowerCase() === 'r' ? 90 : -90) + 360) % 360;
    im.dataset.turn = turn;
    im.style.transition = 'transform .25s ease';
    const side = turn % 180 !== 0;
    const k = side && im.naturalWidth && im.naturalHeight ? Math.min(1, stage.clientHeight / im.clientWidth, stage.clientWidth / im.clientHeight) : 1;
    im.style.transform = `rotate(${turn}deg) scale(${k})`;
  }
});

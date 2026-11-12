'use strict';
setupChrome({ zoom: false, grip: false });
let apps = [], sel = null;
async function load() {
  apps = await seeker.invoke('fq:list');
  apps.push({ key: '__seeker', name: 'Seeker', seeker: true, pids: [] });
  const list = $('#list'); list.textContent = '';
  for (const a of apps) {
    const r = el('div', { class: 'row' + (sel === a.key ? ' sel' : '') }, a.seeker ? el('img', { src: 'seeker://asset/seeker-32.png' }) : iconImg([a.icon, 'application-x-executable'], 18), el('span', { text: a.name }));
    r.addEventListener('mousedown', () => { sel = a.key; $$('.row').forEach((x) => x.classList.remove('sel')); r.classList.add('sel'); $('#fq').disabled = false; $('#fq').textContent = a.seeker ? 'Relaunch' : 'Force Quit'; });
    list.append(r);
  }
}
$('#fq').addEventListener('click', async () => {
  const a = apps.find((x) => x.key === sel); if (!a) return;
  if (a.seeker) { seeker.send('seeker:relaunch'); return; }
  if (await seeker.invoke('fq:kill', a.pids, a.name)) { sel = null; $('#fq').disabled = true; setTimeout(load, 400); }
});
load(); setInterval(load, 3000);

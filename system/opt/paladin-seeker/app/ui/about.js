'use strict';
setupChrome({ zoom: false, min: false, grip: false });
const mode = Q.get('mode'); const b = $('#body');
(async () => {
  if (mode === 'computer') {
    const s = await seeker.invoke('sys:info');
    $('#title').textContent = 'About This Computer';
    const logo = el('div', { class: 'logo' }, s.logo ? el('img', { src: 'file://' + s.logo }) : el('div', { class: 'shield' }));
    b.append(logo, el('div', { class: 'name', text: s.name }), el('div', { class: 'ver', text: `Version ${s.version}` }));
    const sw = el('button', { class: 'btn', text: 'Software Update…', onclick: async () => { if (!(await seeker.invoke('sys:softwareUpdate'))) sw.disabled = true; } });
    b.append(sw);
    b.append(el('table', {},
      el('tr', {}, el('td', { text: 'Processor' }), el('td', { text: `${s.cpu}${s.cores > 1 ? ` (${s.cores} threads)` : ''}` })),
      el('tr', {}, el('td', { text: 'Memory' }), el('td', { text: humanSize(s.memory).replace(/\.\d+/, '') })),
      el('tr', {}, el('td', { text: 'Startup Disk' }), el('td', { text: s.diskName })),
      el('tr', {}, el('td', { text: 'Kernel' }), el('td', { text: s.kernel })),
      s.host ? el('tr', {}, el('td', { text: 'Computer' }), el('td', { text: s.host })) : null,
      s.model ? el('tr', {}, el('td', { text: 'Model' }), el('td', { text: s.model })) : null));
    b.append(el('div', { class: 'copy', text: `${s.pretty}${s.vendor ? ' · Created by ' + s.vendor : ''}` }));
  } else if (mode === 'seeker') {
    const env = await seeker.invoke('env');
    $('#title').textContent = 'About Seeker';
    b.append(el('div', { class: 'logo' }, el('img', { src: 'seeker://asset/seeker-256.png' })), el('div', { class: 'name', text: 'Seeker' }), el('div', { class: 'ver', text: `Version ${env.version}` }),
      el('div', { class: 'desc', text: 'Desktop, menu bar and file browser for palOS.' }), el('div', { class: 'copy', text: 'Part of palOS 27.' }));
  } else {
    const name = Q.get('name');
    $('#title').textContent = `About ${name}`;
    b.append(el('div', { class: 'logo' }, iconImg([Q.get('icon'), 'application-x-executable'], 96)), el('div', { class: 'name', text: name, style: { fontSize: '20px' } }),
      el('div', { class: 'desc', text: Q.get('comment') || '' }), el('div', { class: 'copy', text: Q.get('id') ? `${Q.get('id')}.desktop` : (Q.get('cls') || '') }));
  }
})();

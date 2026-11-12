'use strict';
setupChrome({ zoom: false, min: false, grip: false });
if (Q.get('archive')) {
  document.querySelector('.title').textContent = 'Password';
  $('#msg').textContent = Q.get('retry') ? `That password didn’t work for “${Q.get('archive')}”.` : `“${Q.get('archive')}” is protected with a password.`;
  document.querySelector('.sub').textContent = 'Enter the password to extract it.';
  $('#ok').textContent = 'Extract';
  document.querySelector('.body svg').outerHTML = '<svg viewBox="0 0 20 20"><rect x="3.5" y="9" width="13" height="9" rx="1.6" fill="#c9a24a" stroke="#8a6a22"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="#7d7f86" stroke-width="1.8"/><circle cx="10" cy="13" r="1.3" fill="#5b4310"/><rect x="9.4" y="13.4" width="1.2" height="2.6" fill="#5b4310"/></svg>';
} else if (Q.get('vpn')) {
  // a VPN: the same panel as Wi-Fi, with the VPN's name and (when it needs one) the name to sign in with
  document.querySelector('.title').textContent = 'VPN';
  $('#msg').textContent = Q.get('retry') ? `That password didn’t work for the VPN “${Q.get('vpn')}”.` : `The VPN “${Q.get('vpn')}” requires a password.`;
  document.querySelector('.sub').textContent = Q.get('what') === 'cert' ? 'Enter the password for this VPN’s certificate.' : 'Enter your password to connect.';
  $('#ok').textContent = 'Connect';
  document.querySelector('.body svg').outerHTML = '<svg viewBox="0 0 20 20"><path d="M10 1.8 3.4 4.4v4.8c0 4.1 2.8 7.6 6.6 9 3.8-1.4 6.6-4.9 6.6-9V4.4z" fill="#3a6fd8"/><rect x="6.8" y="9" width="6.4" height="5" rx="1" fill="#fff"/><path d="M8 9V7.6a2 2 0 0 1 4 0V9" fill="none" stroke="#fff" stroke-width="1.4"/></svg>';
  if (Q.get('askuser') === '1') { $('#userRow').style.display = ''; $('#user').value = Q.get('user') || ''; }
} else {
  $('#msg').textContent = `The Wi-Fi network “${Q.get('ssid')}” requires a password.`;
}
if (Q.get('askuser') === '1' && !$('#user').value) $('#user').focus(); else $('#pw').focus();
$('#show').addEventListener('change', () => { $('#pw').type = $('#show').checked ? 'text' : 'password'; });
$('#ok').addEventListener('click', () => seeker.send('prompt:done', Q.get('askuser') === '1' ? JSON.stringify({ user: $('#user').value, password: $('#pw').value }) : $('#pw').value));
$('#user').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#pw').focus(); if (e.key === 'Escape') $('#cancel').click(); });
$('#cancel').addEventListener('click', () => seeker.send('prompt:done', null));
$('#pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#ok').click(); if (e.key === 'Escape') $('#cancel').click(); });

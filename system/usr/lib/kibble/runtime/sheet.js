'use strict';
// dialog.showMessageBox for Kibble apps: a palOS alert sheet inside the window. Uses Paladium.alert() when the
// page has Paladium; otherwise draws a small sheet of its own in the same look.
let next = 1;
const waiting = new Map();

function messageBox(win, o) {
  const buttons = (o.buttons && o.buttons.length ? o.buttons : ['OK']).map(String);
  if (!win || win.isDestroyed()) return Promise.resolve({ response: o.cancelId ?? 0, checkboxChecked: false });
  const id = next++;
  const spec = { id, type: o.type || 'none', title: o.title || '', message: o.message || '', detail: o.detail || '', buttons,
    defaultId: o.defaultId ?? 0, cancelId: o.cancelId ?? (buttons.length > 1 ? buttons.length - 1 : 0), checkboxLabel: o.checkboxLabel || '', checked: !!o.checkboxChecked };
  win.webContents.executeJavaScript(`(${page.toString()})(${JSON.stringify(spec)})`);
  return new Promise((resolve) => waiting.set(id, resolve));
}

// runs in the page
function page(s) {
  var done = function (r, c) { window.webkit.messageHandlers.kibble.postMessage(JSON.stringify({ t: 'send', ch: 'kibble:sheet', args: [s.id, r, !!c] })); };
  if (window.Paladium && Paladium.alert && !s.checkboxLabel) {
    Promise.resolve(Paladium.alert({ title: s.message, message: s.detail, buttons: s.buttons, defaultButton: s.defaultId, cancelButton: s.cancelId, kind: s.type }))
      .then(function (r) { done(typeof r === 'number' ? r : Math.max(0, s.buttons.indexOf(r))); }, function () { done(s.cancelId); });
    return;
  }
  var dark = matchMedia('(prefers-color-scheme: dark)').matches;
  var shade = document.createElement('div'); shade.className = 'kbs';
  shade.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.08);display:flex;justify-content:center;align-items:flex-start;font:13px system-ui,sans-serif';
  var sh = document.createElement('div');
  sh.style.cssText = 'margin-top:0;min-width:380px;max-width:480px;padding:18px 20px 16px;border-radius:0 0 8px 8px;box-shadow:0 10px 30px rgba(0,0,0,.35);'
    + (dark ? 'background:#3a3d42;color:#eee' : 'background:#ececec;color:#222') + ';transform:translateY(-100%);transition:transform .22s ease-out';
  var h = document.createElement('div'); h.textContent = s.message; h.style.cssText = 'font-weight:600;margin-bottom:6px';
  var p = document.createElement('div'); p.textContent = s.detail; p.style.cssText = 'opacity:.85;white-space:pre-wrap;margin-bottom:14px';
  sh.appendChild(h); if (s.detail) sh.appendChild(p);
  var cb = null;
  if (s.checkboxLabel) { var l = document.createElement('label'); cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = s.checked; l.appendChild(cb); l.appendChild(document.createTextNode(' ' + s.checkboxLabel)); l.style.cssText = 'display:block;margin-bottom:12px'; sh.appendChild(l); }
  var row = document.createElement('div'); row.style.cssText = 'display:flex;justify-content:flex-end;gap:8px';
  var close = function (i) { sh.style.transform = 'translateY(-100%)'; setTimeout(function () { shade.remove(); }, 220); document.removeEventListener('keydown', key, true); done(i, cb && cb.checked); };
  s.buttons.slice().reverse().forEach(function (label, ri) {
    var i = s.buttons.length - 1 - ri, b = document.createElement('button'); b.textContent = label;
    b.className = i === s.defaultId ? (/^(erase|delete|remove|empty|move to (the )?trash|uninstall|effacer|supprimer|vider|placer dans la corbeille|désinstaller)/i.test(label) ? 'danger' : 'default') : 'other';   // palOS Hydro: blue, red or white pill
    b.style.cssText = 'min-width:72px;padding:4px 14px;border-radius:5px;border:1px solid rgba(0,0,0,.25);font:inherit;'
      + (i === s.defaultId ? 'background:linear-gradient(#7fb2f0,#3d7fd6);color:#fff' : (dark ? 'background:#55595f;color:#eee' : 'background:linear-gradient(#fff,#e4e4e4)'));
    b.onclick = function () { close(i); }; row.appendChild(b);
  });
  sh.appendChild(row); shade.appendChild(sh); document.body.appendChild(shade);
  requestAnimationFrame(function () { sh.style.transform = 'translateY(0)'; });
  var key = function (e) { if (e.key === 'Enter') { e.preventDefault(); close(s.defaultId); } else if (e.key === 'Escape') { e.preventDefault(); close(s.cancelId); } };
  document.addEventListener('keydown', key, true);
}

function answered(id, response, checked) { const r = waiting.get(id); if (r) { waiting.delete(id); r({ response, checkboxChecked: checked }); } }
module.exports = { messageBox, answered };

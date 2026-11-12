// Kibble's page side: runs first in every page of a Kibble window (before the page's own scripts).
// It gives the app's preload what Electron gave it: require('electron') with ipcRenderer, contextBridge and
// webUtils. Messages travel through WebKit's script message handler "kibble" to the app's main process.
// The main process answers by calling window.__kibble._reply / _emit.
(function () {
  'use strict';
  if (window.__kibble) return;
  // a view inside the window (a sheet) says which one it is; the window's own page has no view number
  var viewId = window.__kibbleView || 0;
  var post = function (m) { if (viewId) m.v = viewId; window.webkit.messageHandlers.kibble.postMessage(JSON.stringify(m, enc)); };

  // Uint8Array/ArrayBuffer and Dates survive the trip (JSON alone would flatten them)
  function enc(k, v) {
    if (v === undefined && Array.isArray(this)) return { __kb: 'undef' };   // keeps undefined arguments undefined (not null)
    if (v instanceof ArrayBuffer) v = new Uint8Array(v);
    if (v && v.buffer instanceof ArrayBuffer && v.BYTES_PER_ELEMENT === 1) {
      var s = ''; for (var i = 0; i < v.length; i++) s += String.fromCharCode(v[i]);
      return { __kb: 'u8', b64: btoa(s) };
    }
    if (this[k] instanceof Date) return { __kb: 'date', t: this[k].getTime() };
    return v;
  }
  function dec(k, v) {
    if (v && typeof v === 'object' && v.__kb === 'undef') return undefined;
    if (v && typeof v === 'object' && v.__kb === 'u8') { var s = atob(v.b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
    if (v && typeof v === 'object' && v.__kb === 'date') return new Date(v.t);
    return v;
  }

  var listeners = Object.create(null), pending = Object.create(null), nextId = 1;
  var event = { sender: null, senderId: 0 };
  var ipcRenderer = {
    send: function (ch) { post({ t: 'send', ch: ch, args: [].slice.call(arguments, 1) }); },
    invoke: function (ch) {
      var rid = nextId++, args = [].slice.call(arguments, 1);
      return new Promise(function (ok, no) { pending[rid] = [ok, no]; post({ t: 'invoke', ch: ch, args: args, rid: rid }); });
    },
    // a synchronous message: the page waits for the main process's e.returnValue (kibble-ipc://, answered by the app)
    sendSync: function (ch) {
      try {
        var x = new XMLHttpRequest();
        x.open('POST', 'kibble-ipc://sync/' + encodeURIComponent(ch), false);
        x.send(JSON.stringify({ ch: ch, args: [].slice.call(arguments, 1) }, enc));
        var r = JSON.parse(x.responseText || '{}', dec);
        return r ? r.v : undefined;
      } catch (e) { return undefined; }
    },
    sendToHost: function () {},
    on: function (ch, fn) { (listeners[ch] = listeners[ch] || []).push(fn); return ipcRenderer; },
    once: function (ch, fn) { var w = function () { ipcRenderer.removeListener(ch, w); fn.apply(null, arguments); }; w._orig = fn; return ipcRenderer.on(ch, w); },
    removeListener: function (ch, fn) { var l = listeners[ch]; if (l) listeners[ch] = l.filter(function (x) { return x !== fn && x._orig !== fn; }); return ipcRenderer; },
    off: function (ch, fn) { return ipcRenderer.removeListener(ch, fn); },
    removeAllListeners: function (ch) { if (ch) delete listeners[ch]; else listeners = Object.create(null); return ipcRenderer; },
  };
  event.sender = ipcRenderer;

  var contextBridge = {
    exposeInMainWorld: function (name, api) { try { Object.defineProperty(window, name, { value: api, configurable: false, enumerable: true }); } catch (e) { window[name] = api; } },
    exposeInIsolatedWorld: function (id, name, api) { contextBridge.exposeInMainWorld(name, api); },
  };

  // Files dropped from Seeker: WebKit gives the name; the path comes with the drop (text/uri-list), kept here.
  var dropped = new WeakMap();
  window.addEventListener('drop', function (e) {
    try {
      var uris = (e.dataTransfer.getData('text/uri-list') || '').split(/\r?\n/).filter(function (u) { return u && u[0] !== '#'; });
      var files = e.dataTransfer.files;
      for (var i = 0; i < files.length; i++) {
        var u = uris.find(function (x) { return decodeURIComponent(x).split('/').pop() === files[i].name; }) || uris[i];
        if (u && u.indexOf('file://') === 0) dropped.set(files[i], decodeURIComponent(u.slice(7)));
      }
    } catch (err) {}
  }, true);
  // the app menu's shortcuts (Kibble sends them; Ctrl+1, CmdOrCtrl+Shift+Z, F11...)
  var accels = [];
  var NAMES = { plus: '+', space: ' ', return: 'enter', esc: 'escape', up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', del: 'delete' };
  function norm(a) {
    var parts = String(a).toLowerCase().split('+'), key = parts.pop() || '+', m = { ctrl: false, shift: false, alt: false, meta: false };
    if (key === '' ) key = '+';
    parts.forEach(function (p) { if (/^(cmdorctrl|commandorcontrol|ctrl|control)$/.test(p)) m.ctrl = true; else if (p === 'shift') m.shift = true; else if (/^(alt|option|altgr)$/.test(p)) m.alt = true; else if (/^(cmd|command|super|meta)$/.test(p)) m.meta = true; });
    key = NAMES[key] || key;
    return (m.ctrl ? 'c' : '') + (m.shift ? 's' : '') + (m.alt ? 'a' : '') + (m.meta ? 'm' : '') + ':' + key;
  }
  function keyOf(e) {
    var k = e.code && /^Digit\d$/.test(e.code) ? e.code.slice(5) : e.code && /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : String(e.key || '').toLowerCase();
    return (e.ctrlKey ? 'c' : '') + (e.shiftKey ? 's' : '') + (e.altKey ? 'a' : '') + (e.metaKey ? 'm' : '') + ':' + k;
  }
  window.addEventListener('keydown', function (e) {
    if (!accels.length || e.isComposing) return;
    var k = keyOf(e);
    for (var i = 0; i < accels.length; i++) if (accels[i][1] === k) { e.preventDefault(); e.stopPropagation(); post({ t: 'send', ch: 'kibble:accel', args: [accels[i][0]] }); return; }
  }, true);

  // Files dragged in from Seeker: the window layer reports the drag (0 over, 1 drop, 2 left); the page gets
  // dragenter/dragover/dragleave/drop with real File objects, and webUtils.getPathForFile gives their paths.
  var EXT = { wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', oga: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4', aac: 'audio/aac', opus: 'audio/opus',
    aif: 'audio/aiff', aiff: 'audio/aiff', weba: 'audio/webm', webm: 'video/webm', mp4: 'video/mp4', m4v: 'video/mp4', mkv: 'video/x-matroska', mov: 'video/quicktime',
    avi: 'video/x-msvideo', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', tif: 'image/tiff',
    tiff: 'image/tiff', bmp: 'image/bmp', pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', html: 'text/html', htm: 'text/html', css: 'text/css',
    js: 'text/javascript', json: 'application/json', csv: 'text/csv', xml: 'application/xml', zip: 'application/zip', srt: 'application/x-subrip' };
  var dragOver = null;
  function fire(type, x, y, dt) {
    var el = document.elementFromPoint(x, y) || document.body;
    var ev = new DragEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, screenX: x, screenY: y, dataTransfer: dt });
    el.dispatchEvent(ev);
    return el;
  }
  function filesDT(uris) {
    var dt = new DataTransfer();
    try { dt.setData('text/uri-list', uris.join('\r\n')); } catch (e) {}
    return dt;
  }
  function _drop(phase, x, y, raw) {
    var uris = String(raw || '').split(/\r?\n/).map(function (u) { return u.trim(); }).filter(function (u) { return u && u[0] !== '#'; });
    // Kibble API: a page that sets window.kibbleDrag(phase, x, y, uris) gets the drag itself
    // (phase 0 hovering, with the files when known; 1 dropped; 2 left) instead of DOM drag events
    if (typeof window.kibbleDrag === 'function') { try { window.kibbleDrag(phase, x, y, uris); } catch (e) {} return; }
    if (phase === 0) {
      var dt = filesDT([]);
      try { dt.items.add(new File([], 'dragging')); } catch (e) {}
      var el = document.elementFromPoint(x, y) || document.body;
      if (el !== dragOver) { if (dragOver) fire('dragleave', x, y, dt); fire('dragenter', x, y, dt); dragOver = el; }
      fire('dragover', x, y, dt);
      return;
    }
    if (phase === 2) { if (dragOver) fire('dragleave', x, y, filesDT([])); dragOver = null; return; }
    dragOver = null;
    // read each file (big ones arrive empty, by name and path only: apps open those through their path)
    Promise.all(uris.map(function (u) {
      var p = decodeURIComponent(u.replace(/^file:\/\//, '')), name = p.split('/').pop(), ext = (name.split('.').pop() || '').toLowerCase(), type = EXT[ext] || '';
      return fetch(u).then(function (r) {
        var len = +(r.headers.get('content-length') || 0);
        if (len > 256 * 1024 * 1024) return new File([], name, { type: type });
        return r.blob().then(function (b) { return new File([b], name, { type: type || b.type }); });
      }, function () { return new File([], name, { type: type }); }).then(function (f) { dropped.set(f, p); return f; });
    })).then(function (files) {
      var dt = filesDT(uris);
      files.forEach(function (f) { try { dt.items.add(f); } catch (e) {} });
      // the files keep their paths once the page reads them out of dataTransfer.files too
      var listed = dt.files; for (var i = 0; i < listed.length; i++) dropped.set(listed[i], dropped.get(files[i]) || '');
      fire('dragover', x, y, dt);
      fire('drop', x, y, dt);
    });
  }

  // touchpad pinch and rotate: gesturestart/gesturechange/gestureend on what's under the fingers (event.scale,
  // event.rotation in degrees, as in Safari); a pinch also scrolls with ctrl held, the way Chrome reports it
  var gest = null;
  function _gesture(phase, scale, rotation, x, y) {
    var type = phase === 0 ? 'gesturestart' : phase === 1 ? 'gesturechange' : 'gestureend';
    var el = (gest && gest.el) || document.elementFromPoint(x, y) || document.body;
    if (phase === 0) gest = { el: el, scale: 1 };
    var ev = new Event(type, { bubbles: true, cancelable: true });
    ev.scale = scale; ev.rotation = rotation; ev.clientX = x; ev.clientY = y; ev.cancelled = phase === 3;
    el.dispatchEvent(ev);
    if (gest && phase === 1 && !ev.defaultPrevented && scale > 0) {
      var ratio = scale / gest.scale; gest.scale = scale;
      if (Math.abs(ratio - 1) > 0.002) el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, clientX: x, clientY: y, deltaMode: 0, deltaY: -Math.log(ratio) * 100 }));
    }
    if (phase >= 2) gest = null;
  }

  // a page's errors go to the app's log (stderr), as Electron's do
  function report(kind, msg) { try { post({ t: 'send', ch: 'kibble:log', args: [kind, String(msg).slice(0, 4000)] }); } catch (e) {} }
  window.addEventListener('error', function (e) { report('error', (e.message || e) + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '') + (e.error && e.error.stack ? '\n' + e.error.stack : '')); });
  window.addEventListener('unhandledrejection', function (e) { var r = e.reason; report('error', 'Unhandled promise rejection: ' + (r && r.message ? r.message + '\n' : '') + (r && r.stack || r)); });
  var origError = console.error;
  console.error = function () { try { report('console', [].map.call(arguments, function (a) { return a && a.stack ? (a.message ? a.message + "\n" : "") + a.stack : typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ')); } catch (e) {} return origError.apply(console, arguments); };

  // Right-click menus (Menu.popup): drawn here in palOS's look. Labels are kept to 20 characters (palOS's rule
  // for contextual menus); a longer one is cut with an ellipsis, so menus stay short.
  var lastX = 0, lastY = 0, openMenu = null;
  window.addEventListener('mousedown', function (e) { lastX = e.clientX; lastY = e.clientY; }, true);
  window.addEventListener('contextmenu', function (e) { lastX = e.clientX; lastY = e.clientY; }, true);
  var MENU_CSS = '.kbm{position:fixed;z-index:2147483647;min-width:150px;max-width:260px;padding:4px 0;border-radius:7px;'
    + 'background:rgba(246,246,248,.97);color:#1d1d1f;box-shadow:0 8px 28px rgba(0,0,0,.28),0 0 0 .5px rgba(0,0,0,.25);'
    + 'font:13px/1.25 "Noto Sans","DejaVu Sans",sans-serif;user-select:none;-webkit-user-select:none;outline:none}'
    + '.kbm .it{display:flex;align-items:center;gap:10px;padding:3px 12px 3px 22px;margin:0 4px;border-radius:4px;white-space:nowrap;position:relative;cursor:default}'
    + '.kbm .it .ck{position:absolute;left:7px;font-size:11px}.kbm .it .ac{margin-left:auto;padding-left:18px;opacity:.55;font-size:12px}'
    + '.kbm .it .ar{margin-left:auto;padding-left:18px;opacity:.6}.kbm .it.on{background:#3d7fd6;color:#fff}.kbm .it.on .ac,.kbm .it.on .ar{opacity:.9}'
    + '.kbm .it.off{opacity:.38}.kbm .sep{height:1px;margin:4px 10px;background:rgba(0,0,0,.12)}'
    + '.kbm.kbo{min-width:0;border-radius:6px}.kbm.kbo .grp{padding:4px 12px 2px;font-size:11px;font-weight:600;opacity:.55}.kbm.kbo .it.child{padding-left:30px}'
    + '@media (prefers-color-scheme:dark){.kbm{background:rgba(44,46,52,.97);color:#eee;box-shadow:0 8px 28px rgba(0,0,0,.5),0 0 0 .5px rgba(255,255,255,.18)}.kbm .sep{background:rgba(255,255,255,.14)}}';
  function cap(t) { t = String(t == null ? '' : t).replace(/&(?=\w)/, ''); return t.length > 20 ? t.slice(0, 19).replace(/\s+$/, '') + '…' : t; }
  function accelText(a) { return a ? String(a).replace(/CmdOrCtrl|CommandOrControl|Control/gi, 'Ctrl').replace(/\+/g, '+') : ''; }
  function closeMenus(chosen) {
    if (!openMenu) return;
    var m = openMenu; openMenu = null;
    m.levels.forEach(function (l) { l.el.remove(); });
    document.removeEventListener('mousedown', m.outside, true); document.removeEventListener('keydown', m.keys, true); window.removeEventListener('blur', m.blur);
    post({ t: 'send', ch: 'kibble:menu-closed', args: [m.token, chosen == null ? null : chosen] });
  }
  function popup(token, x, y, items) {
    closeMenus(null);
    if (!document.getElementById('kbm-css')) { var st = document.createElement('style'); st.id = 'kbm-css'; st.textContent = MENU_CSS; (document.head || document.documentElement).appendChild(st); }
    var state = { token: token, levels: [] };
    function level(list, px, py, depth) {
      while (state.levels.length > depth) state.levels.pop().el.remove();
      var el = document.createElement('div'); el.className = 'kbm'; el.setAttribute('role', 'menu');
      el.addEventListener('mousedown', function (e) { e.preventDefault(); });   // the text keeps its focus and selection (Cut, Copy)
      var lv = { el: el, rows: [], sel: -1, items: list };
      list.forEach(function (it) {
        if (it.type === 'separator') { var s = document.createElement('div'); s.className = 'sep'; el.appendChild(s); return; }
        var r = document.createElement('div'); r.className = 'it' + (it.enabled === false ? ' off' : '');
        var ck = document.createElement('span'); ck.className = 'ck'; ck.textContent = it.checked ? (it.type === 'radio' ? '•' : '✓') : ''; r.appendChild(ck);
        var lb = document.createElement('span'); lb.textContent = cap(it.label); if (String(it.label || '').length > 20) r.title = it.label; r.appendChild(lb);
        if (it.submenu) { var ar = document.createElement('span'); ar.className = 'ar'; ar.textContent = '▸'; r.appendChild(ar); }
        else if (it.accel) { var ac = document.createElement('span'); ac.className = 'ac'; ac.textContent = accelText(it.accel); r.appendChild(ac); }
        var idx = lv.rows.length; lv.rows.push({ el: r, it: it });
        r.addEventListener('mouseenter', function () { select(lv, idx, depth, true); });
        r.addEventListener('mouseup', function (e) { if (e.button === 2 && Date.now() - state.opened < 350) return; activate(lv, idx, depth); });
        el.appendChild(r);
      });
      document.documentElement.appendChild(el);
      var W = window.innerWidth, H = window.innerHeight, w = el.offsetWidth, h = el.offsetHeight;
      var left = px, top = py;
      if (depth > 0 && left + w > W) left = Math.max(0, px - w - (state.levels[depth - 1].el.offsetWidth) + 6);
      if (left + w > W) left = Math.max(0, W - w - 2);
      if (top + h > H) top = Math.max(0, H - h - 2);
      el.style.left = left + 'px'; el.style.top = top + 'px';
      state.levels.push(lv);
      return lv;
    }
    function select(lv, i, depth, fromMouse) {
      lv.rows.forEach(function (r, k) { r.el.classList.toggle('on', k === i && r.it.enabled !== false); });
      lv.sel = i;
      while (state.levels.length > depth + 1) state.levels.pop().el.remove();
      var row = lv.rows[i];
      if (row && row.it.submenu && row.it.enabled !== false && fromMouse) { var b = row.el.getBoundingClientRect(); level(row.it.submenu, b.right - 4, b.top - 5, depth + 1); }
    }
    function activate(lv, i, depth) {
      var row = lv.rows[i]; if (!row || row.it.enabled === false) return;
      if (row.it.submenu) { var b = row.el.getBoundingClientRect(); var sub = level(row.it.submenu, b.right - 4, b.top - 5, depth + 1); move(sub, 1); return; }
      closeMenus(row.it.id);
    }
    function move(lv, d) {
      var n = lv.rows.length; if (!n) return; var i = lv.sel;
      for (var k = 0; k < n; k++) { i = (i + d + n) % n; if (lv.rows[i].it.enabled !== false) break; }
      select(lv, i, state.levels.indexOf(lv), false);
    }
    state.keys = function (e) {
      var lv = state.levels[state.levels.length - 1], depth = state.levels.length - 1;
      if (e.key === 'Escape') { if (depth > 0) state.levels.pop().el.remove(); else closeMenus(null); }
      else if (e.key === 'ArrowDown') move(lv, 1);
      else if (e.key === 'ArrowUp') move(lv, -1);
      else if (e.key === 'ArrowRight') { if (lv.sel >= 0 && lv.rows[lv.sel].it.submenu) activate(lv, lv.sel, depth); }
      else if (e.key === 'ArrowLeft') { if (depth > 0) state.levels.pop().el.remove(); }
      else if (e.key === 'Enter' || e.key === ' ') { if (lv.sel >= 0) activate(lv, lv.sel, depth); }
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    state.outside = function (e) { if (!state.levels.some(function (l) { return l.el.contains(e.target); })) closeMenus(null); };
    state.blur = function () { closeMenus(null); };
    state.opened = Date.now();
    openMenu = state;
    level(items, x == null ? lastX : x, y == null ? lastY : y, 0);
    setTimeout(function () { document.addEventListener('mousedown', state.outside, true); }, 0);
    document.addEventListener('keydown', state.keys, true); window.addEventListener('blur', state.blur);
  }

  // a <select>'s list (WebKit asks the window host, which asks here): drawn under the <select>, at its width,
  // the chosen line ticked; full text (the 20-character rule is for right-click menus, not lists of choices)
  var openOptions = null;
  function optionsClose(sendNone) {
    if (!openOptions) return;
    var o = openOptions; openOptions = null;
    o.el.remove();
    document.removeEventListener('mousedown', o.outside, true); document.removeEventListener('keydown', o.keys, true); window.removeEventListener('blur', o.blur);
    if (sendNone) post({ t: 'option', i: -1 });
  }
  function options(x, y, w, h, items) {
    optionsClose(true); closeMenus(null);
    if (!document.getElementById('kbm-css')) { var st = document.createElement('style'); st.id = 'kbm-css'; st.textContent = MENU_CSS; (document.head || document.documentElement).appendChild(st); }
    var el = document.createElement('div'); el.className = 'kbm kbo'; el.setAttribute('role', 'listbox');
    el.style.minWidth = Math.max(60, w) + 'px'; el.style.overflowY = 'auto'; el.style.maxWidth = 'none';
    el.addEventListener('mousedown', function (e) { e.preventDefault(); });
    var rows = [], sel = -1, opened = Date.now();
    items.forEach(function (it, i) {
      var r = document.createElement('div');
      if (it.group) { r.className = 'grp'; r.textContent = it.label; el.appendChild(r); rows.push(null); return; }
      r.className = 'it' + (it.enabled === false ? ' off' : '') + (it.child ? ' child' : '');
      var ck = document.createElement('span'); ck.className = 'ck'; ck.textContent = it.selected ? '✓' : ''; r.appendChild(ck);
      var lb = document.createElement('span'); lb.textContent = it.label; r.appendChild(lb);
      r.addEventListener('mouseenter', function () { pick(i); });
      r.addEventListener('mouseup', function () { if (Date.now() - opened < 250) return; choose(i); });
      el.appendChild(r); rows.push(r);
      if (it.selected) sel = i;
    });
    document.documentElement.appendChild(el);
    var H = window.innerHeight, W = window.innerWidth, ew = el.offsetWidth;
    var below = H - (y + h) - 4, above = y - 4, eh = el.offsetHeight;
    var top;
    if (eh <= below || below >= above) { el.style.maxHeight = Math.max(80, below) + 'px'; top = y + h; }
    else { el.style.maxHeight = Math.max(80, above) + 'px'; top = Math.max(2, y - Math.min(eh, above)); }
    el.style.left = Math.max(0, Math.min(x, W - ew - 2)) + 'px'; el.style.top = top + 'px';
    function pick(i) { rows.forEach(function (r, k) { if (r) r.classList.toggle('on', k === i && items[k].enabled !== false); }); sel = i; }
    function choose(i) { if (!rows[i] || items[i].enabled === false) return; optionsClose(false); post({ t: 'option', i: i }); }
    function move(d) { var n = rows.length, i = sel; for (var k = 0; k < n; k++) { i = (i + d + n) % n; if (rows[i] && items[i].enabled !== false) break; } pick(i); if (rows[i]) rows[i].scrollIntoView({ block: 'nearest' }); }
    if (sel >= 0) { pick(sel); rows[sel].scrollIntoView({ block: 'nearest' }); }
    var typed = '', typedAt = 0;
    openOptions = {
      el: el,
      outside: function (e) { if (!el.contains(e.target)) optionsClose(true); },
      keys: function (e) {
        if (e.key === 'Escape') optionsClose(true);
        else if (e.key === 'ArrowDown') move(1);
        else if (e.key === 'ArrowUp') move(-1);
        else if (e.key === 'Enter' || e.key === ' ') { if (sel >= 0) choose(sel); }
        else if (e.key.length === 1) {            // type the first letters to jump there
          typed = (Date.now() - typedAt > 800 ? '' : typed) + e.key.toLowerCase(); typedAt = Date.now();
          for (var k = 0; k < items.length; k++) if (rows[k] && String(items[k].label).toLowerCase().indexOf(typed) === 0) { pick(k); rows[k].scrollIntoView({ block: 'nearest' }); break; }
        } else return;
        e.preventDefault(); e.stopPropagation();
      },
      blur: function () { optionsClose(true); },
    };
    setTimeout(function () { document.addEventListener('mousedown', openOptions.outside, true); }, 0);
    document.addEventListener('keydown', openOptions.keys, true); window.addEventListener('blur', openOptions.blur);
  }

  var webUtils = { getPathForFile: function (f) { return dropped.get(f) || f.path || ''; } };
  var webFrame = { setZoomFactor: function () {}, getZoomFactor: function () { return 1; }, setVisualZoomLevelLimits: function () {}, insertCSS: function (css) { var s = document.createElement('style'); s.textContent = css; (document.head || document.documentElement).appendChild(s); } };

  var electron = { ipcRenderer: ipcRenderer, contextBridge: contextBridge, webUtils: webUtils, webFrame: webFrame, clipboard: { writeText: function (t) { ipcRenderer.send('kibble:clipboard', t); } } };

  window.__kibble = {
    electron: electron,
    process: { platform: 'linux', arch: 'x64', type: 'renderer', env: {}, versions: { kibble: '0.1', node: '', chrome: '' }, argv: [] },
    _reply: function (rid, ok, json) { var p = pending[rid]; if (!p) return; delete pending[rid]; var v = json === undefined ? undefined : JSON.parse(json, dec); if (ok) p[0](v); else p[1](new Error(v)); },
    _drop: _drop,
    _gesture: _gesture,
    _popup: popup, _closeMenu: function () { closeMenus(null); },
    _options: options, _optionsClose: function () { optionsClose(false); },
    _accels: function (list) { accels = (list || []).map(function (a) { return [a[0], norm(a[1])]; }); },
    _emit: function (ch, json) {
      var args = JSON.parse(json, dec), l = (listeners[ch] || []).slice();
      for (var i = 0; i < l.length; i++) { try { l[i].apply(null, [event].concat(args)); } catch (e) { console.error(e); } }
    },
  };
})();

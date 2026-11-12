'use strict';
// palOS translations inside a page: translates the text, tooltips and placeholders the app puts on screen,
// as they appear and whenever they change. Typed content (documents, text boxes, editors) is never touched.
// Loaded as a preload for every page of an app (see main.js); the dictionary comes from the main process.
(() => {
  // only the app's own pages: never web sites (Firefox, Mail's remote content, help pages online)
  try {
    if (/^(https?|ftp|ws|wss|data|blob|about):$/.test(location.protocol)) return;
  } catch { return; }
  let ipc; try { ipc = require('electron').ipcRenderer; } catch { return; }
  let data; try { data = ipc.sendSync('palos-l10n:dict'); } catch { return; }
  if (!data || !data.dict) return;
  // the user's own files shown in a page (print previews, a site being made) stay as they are: only the app's
  // own pages (inside its .app, or palOS's folders) are translated
  try {
    if (location.protocol === 'file:') {
      const p = decodeURIComponent(location.pathname);
      const roots = data.roots || ['/opt/', '/usr/'];
      if (!roots.some((r) => p.startsWith(r) || p.startsWith(r.replace(/\.asar\/$/, '.asar.unpacked/')))) return;
    }
  } catch { return; }
  const core = (() => { const module = { exports: {} }; (new Function('module', 'exports', data.core))(module, module.exports); return module.exports; })();
  const C = core.compile(data.dict);
  const tr = (s) => core.translate(C, s);
  const SKIP = 'script,style,textarea,code,pre,kbd,samp,[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"],.ProseMirror,.cm-editor,.CodeMirror,.monaco-editor,[data-no-l10n],[translate="no"]' + (data.skip ? ',' + data.skip : '');
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'label', 'data-tooltip', 'data-title'];
  const skipped = (el) => { try { return !!(el && el.closest && el.closest(SKIP)); } catch { return false; } };
  const miss = data.debug ? new Set() : null;
  const note = (s) => { if (miss && s && /[A-Za-z]{2}/.test(s) && !/[àâçéèêëîïôûùüÿœ’]/i.test(s)) miss.add(s.trim()); };
  if (miss) setInterval(() => { if (miss.size) { ipc.send('palos-l10n:miss', [...miss]); miss.clear(); } }, 2000);
  function text(n) {
    const p = n.parentElement; if (!p || skipped(p)) return;
    const v = tr(n.nodeValue); if (v !== undefined && v !== n.nodeValue) n.nodeValue = v; else if (v === undefined) note(n.nodeValue);
  }
  function attrs(el) {
    if (skipped(el)) return;
    for (const a of ATTRS) { const o = el.getAttribute(a); if (o) { const v = tr(o); if (v !== undefined && v !== o) el.setAttribute(a, v); else if (v === undefined) note(o); } }
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value) { const v = tr(el.value); if (v !== undefined) el.value = v; }
  }
  function walk(root) {
    if (root.nodeType === 3) return text(root);
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (skipped(root)) return; attrs(root); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) text(n); else attrs(n); }
    if (root.nodeType === 1 && root.shadowRoot) walk(root.shadowRoot);
  }
  function title() { const v = tr(document.title); if (v !== undefined) document.title = v; }
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'childList') { for (const n of m.addedNodes) walk(n); if (m.target === document.head || (m.target.nodeName === 'TITLE')) title(); }
      else if (m.type === 'characterData') { text(m.target); if (m.target.parentNode && m.target.parentNode.nodeName === 'TITLE') title(); }
      else if (m.type === 'attributes') attrs(m.target);
    }
  });
  const start = () => { walk(document.documentElement); title(); mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS, 'value'] }); };
  if (document.documentElement) start(); else document.addEventListener('readystatechange', start, { once: true });
  // messages the page shows itself (alert, confirm, prompt, notifications)
  try {
    const { contextBridge, webFrame } = require('electron');
    const src = `(() => { const T = (s) => { try { return window.__palosL10n ? window.__palosL10n(String(s)) : s; } catch { return s; } };
      for (const f of ['alert', 'confirm', 'prompt']) { const o = window[f]; if (typeof o === 'function') window[f] = function (m, ...r) { return o.call(this, T(m), ...r); }; }
      const N = window.Notification; if (N) { const P = function (t, o = {}) { return new N(T(t), { ...o, body: o.body ? T(o.body) : o.body }); }; P.prototype = N.prototype; P.requestPermission = N.requestPermission.bind(N); Object.defineProperty(P, 'permission', { get: () => N.permission }); window.Notification = P; } })();`;
    const fn = (s) => tr(s) ?? s;
    if (process.contextIsolated) { contextBridge.exposeInMainWorld('__palosL10n', fn); webFrame.executeJavaScript(src).catch(() => {}); }
    else { window.__palosL10n = fn; webFrame.executeJavaScript(src).catch(() => {}); }
  } catch {}
})();

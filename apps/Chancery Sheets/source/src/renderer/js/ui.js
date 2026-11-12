/* Small UI toolkit: element builder, context menus, modal dialogs, prompts and toasts. */
(function (root) {
  function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'html') e.innerHTML = v;
      else if (k in e && typeof v !== 'string') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  }

  /* ------------------------------------------------------------ menus */
  const menuLayer = () => document.getElementById('menu-layer');
  let openMenus = [];

  function closeMenus() {
    openMenus.forEach((m) => m.remove());
    openMenus = [];
    document.removeEventListener('mousedown', outside, true);
    document.removeEventListener('keydown', menuKeys, true);
  }
  function outside(e) {
    if (!openMenus.some((m) => m.contains(e.target))) closeMenus();
  }
  function menuKeys(e) {
    const m = openMenus[openMenus.length - 1];
    if (!m) return;
    const items = [...m.querySelectorAll('.mi:not(.disabled)')];
    let i = items.findIndex((x) => x.classList.contains('focus'));
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation();
      items.forEach((x) => x.classList.remove('focus'));
      i = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[i].classList.add('focus');
    } else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); e.stopPropagation(); items[i].click(); }
  }

  /**
   * items: [{ label, key, icon, disabled, action }, '-', { heading }]
   */
  function showMenu(items, x, y) {
    closeMenus();
    const m = el('div', { class: 'menu', role: 'menu' });
    for (const it of items) {
      if (it === '-' || it === null) { m.append(el('div', { class: 'sep' })); continue; }
      if (it.heading) { m.append(el('div', { class: 'label' }, it.heading)); continue; }
      if (it.element) { m.append(it.element); continue; }
      const mi = el('div', { class: 'mi' + (it.disabled ? ' disabled' : ''), role: 'menuitem' },
        el('span', { class: 'ico' }, it.icon || ''), el('span', {}, it.label), it.key ? el('span', { class: 'key' }, it.key) : null);
      mi.addEventListener('click', () => { closeMenus(); if (it.action) it.action(); });
      m.append(mi);
    }
    menuLayer().append(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + 'px';
    m.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + 'px';
    openMenus.push(m);
    setTimeout(() => {
      document.addEventListener('mousedown', outside, true);
      document.addEventListener('keydown', menuKeys, true);
    });
    return m;
  }

  /** A free-form popup (e.g. filter list) positioned like a menu. */
  function showPopup(content, x, y) {
    const m = showMenu([{ element: content }], x, y);
    m.style.padding = '0';
    return m;
  }

  /* ---------------------------------------------------------- dialogs */
  const dialogLayer = () => document.getElementById('dialog-layer');
  let dialogDepth = 0;

  /**
   * Modal dialog. buttons: [{ label, value, primary, danger, left }]. `onOk` may return false to keep it open.
   * Resolves with the clicked button's value (or null when cancelled).
   */
  function dialog({ title, body, buttons = [{ label: 'Cancel', value: null }, { label: 'OK', value: true, primary: true }], onOk, width, floating, onOpen }) {
    return new Promise((resolve) => {
      const actions = el('div', { class: 'actions' });
      const d = el('div', { class: 'dialog' + (floating ? ' floating' : ''), role: 'dialog', 'aria-modal': floating ? null : 'true', style: width ? { width: width + 'px' } : null },
        el('h2', {}, title), el('div', { class: 'body' }, body), actions);
      const wrap = floating ? d : el('div', { class: 'backdrop' }, d);
      if (!floating) dialogDepth++;
      const done = (val) => {
        wrap.remove();
        if (!floating) dialogDepth--;
        document.removeEventListener('keydown', keys, true);
        resolve(val);
      };
      const submit = async (b) => {
        if (b.value !== null && b.value !== undefined && onOk) {
          const ok = await onOk(b.value);
          if (ok === false) return;
        }
        done(b.value === undefined ? null : b.value);
      };
      for (const b of buttons) {
        const btn = el('button', { class: 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '') + (b.left ? ' left' : '') }, b.label);
        btn.addEventListener('click', () => (b.action ? b.action() : submit(b)));
        actions.append(btn);
      }
      function keys(e) {
        // Floating (non-modal) dialogs only react to keys while focus is inside them.
        if (floating && !d.contains(e.target)) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); }
        else if (!floating && e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && d.contains(e.target)) {
          const primary = buttons.find((b) => b.primary);
          if (primary) { e.preventDefault(); e.stopPropagation(); if (primary.action) primary.action(); else submit(primary); }
        }
      }
      document.addEventListener('keydown', keys, true);
      dialogLayer().append(wrap);
      d.close = () => done(null);
      const first = d.querySelector('input, select, textarea, .list-box');
      if (first) setTimeout(() => { first.focus(); if (first.select) first.select(); });
      if (onOpen) onOpen(d);
    });
  }

  const isDialogOpen = () => dialogDepth > 0;

  async function prompt(title, label, value = '', { validate, placeholder } = {}) {
    const input = el('input', { type: 'text', value: String(value), placeholder: placeholder || '' });
    const err = el('div', { class: 'err' });
    let result = null;
    const ok = await dialog({
      title,
      body: el('div', {}, el('label', { class: 'field' }, el('span', {}, label), input), err),
      onOk: () => {
        const msg = validate ? validate(input.value) : null;
        if (msg) { err.textContent = msg; input.focus(); return false; }
        result = input.value;
        return true;
      },
    });
    return ok ? result : null;
  }

  async function alert(title, message) {
    await dialog({ title, body: el('div', { style: { whiteSpace: 'pre-wrap', maxWidth: '480px' } }, message), buttons: [{ label: 'OK', value: true, primary: true }] });
  }

  /* ----------------------------------------------------------- toasts */
  function toast(message, kind = '', ms = 3200) {
    const t = el('div', { class: 'toast ' + kind }, message);
    const layer = document.getElementById('toast-layer');
    while (layer.children.length >= 3) layer.firstChild.remove();
    layer.append(t);
    setTimeout(() => t.remove(), ms);
  }

  const PALETTE = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
    '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
    '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
    '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130',
  ];

  function colorGrid(onPick) {
    const g = el('div', { class: 'swatches' });
    for (const c of PALETTE) {
      const b = el('button', { title: c, style: { background: c } });
      b.addEventListener('click', () => onPick(c));
      g.append(b);
    }
    return g;
  }

  root.UI = { el, showMenu, showPopup, closeMenus, dialog, prompt, alert, toast, isDialogOpen, colorGrid, PALETTE };
})(self);

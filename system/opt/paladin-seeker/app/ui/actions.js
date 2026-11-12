'use strict';
/* File actions shared by the desktop and browser windows. */
const Actions = {
  async open(entries, { onFolder } = {}) {
    const files = [];
    for (const e of entries) {
      if (e.volume && e.volume.target) { onFolder ? onFolder(e.volume.target) : seeker.send('browser:open', e.volume.target); continue; }
      if (e.dir) { const to = e.open || e.path; onFolder ? onFolder(to) : seeker.send('browser:open', to); continue; }
      if (e.app && e.app.id) { seeker.invoke('apps:launch', e.app.id, []); continue; }
      files.push(e.path);
    }
    if (files.length) await seeker.invoke('fs:open', files);
  },
  async openWithItems(e) {
    const r = await seeker.invoke('fs:openWith', e.path);
    const items = [];
    if (r.default) items.push({ id: 'ow:' + r.default.id, label: `${r.default.name} (default)`, icon: [r.default.icon, 'application-x-executable'], app: r.default.id }, { type: 'separator' });
    for (const a of r.apps) if (!r.default || a.id !== r.default.id) items.push({ id: 'ow:' + a.id, label: a.name, icon: [a.icon, 'application-x-executable'], app: a.id });
    if (!items.length) items.push({ id: 'ow:none', label: 'No Applications', enabled: false });
    items.push({ type: 'separator' }, { id: 'ow:other', label: 'Other…' });
    return items;
  },
  async chooseOther(paths) {
    const list = await seeker.invoke('apps:all');
    const items = list.map((a) => ({ id: 'ow:' + a.id, label: a.name, icon: [a.icon, 'application-x-executable'], app: a.id }));
    return items;
  },
  async trash(paths) { if (paths.length) return seeker.invoke('fs:trash', paths); },
  async copy(paths) { if (paths.length) return seeker.invoke('clip:set', paths, false); },
  async cut(paths) { if (paths.length) return seeker.invoke('clip:set', paths, true); },
  async paste(dest) {
    const c = await seeker.invoke('clip:get');
    if (!c || !c.paths || !c.paths.length) return [];
    const r = await seeker.invoke('fs:transfer', c.paths, dest, !!c.cut);
    if (c.cut) seeker.invoke('clip:clear');
    return (r && r.paths) || [];
  },
  /** Files dropped on a folder: move on the same disk, copy across disks (Ctrl/Alt forces copy). */
  async drop(paths, dest, forceCopy) {
    paths = paths.filter((p) => p && p !== dest && !(dest + '/').startsWith(p + '/'));
    if (!paths.length) return [];
    const r = await seeker.invoke('fs:drop', paths, dest, !!forceCopy);
    return (r && r.paths) || [];
  },
  info(paths) { seeker.send('info:open', paths); },
  quickLookItems(entries) { return entries.map((e) => ({ path: e.path, name: e.display || e.name, mime: e.mime, kind: e.kind, size: e.size, mtime: e.mtime, icon: e.icon, dir: e.dir, thumb: e.thumb })); },
  startDrag(paths, icon) { seeker.send('drag:start', paths, icon); },
};

/** Inline rename editor placed over a label element. */
function inlineRename(labelEl, entry, { onDone, multiline = true } = {}) {
  const r = labelEl.getBoundingClientRect();
  const name = entry.name;
  const hiddenExt = entry.ext && entry.display && name === entry.display + entry.ext ? entry.ext : '';
  const ta = el(multiline ? 'textarea' : 'input', { class: 'rename', spellcheck: 'false' });
  ta.value = hiddenExt ? entry.display : name;
  Object.assign(ta.style, { position: 'fixed', left: Math.round(r.left - 2) + 'px', top: Math.round(r.top - 2) + 'px', width: Math.max(80, Math.round(r.width + 8)) + 'px', zIndex: 3000 });
  if (multiline) ta.style.height = Math.max(18, Math.round(r.height + 4)) + 'px';
  document.body.append(ta);
  ta.focus();
  const dot = entry.dir || hiddenExt ? -1 : name.lastIndexOf('.');
  ta.setSelectionRange(0, dot > 0 ? dot : ta.value.length);
  let finished = false;
  const done = async (commit) => {
    if (finished) return; finished = true;
    let v = ta.value.trim(); ta.remove();
    // the extension was hidden: keep it, unless a different one was typed
    if (v && hiddenExt && !/\.[A-Za-z][A-Za-z0-9]{0,7}$/.test(v)) v += hiddenExt;
    if (commit && v && v !== name) {
      const res = await seeker.invoke('fs:rename', entry.path, v);
      onDone && onDone(res && res.path ? res.path : null);
    } else onDone && onDone(null);
  };
  ta.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); done(true); }
    if (e.key === 'Escape') { e.preventDefault(); done(false); }
  });
  ta.addEventListener('blur', () => done(true));
  ta.addEventListener('mousedown', (e) => e.stopPropagation());
}

/** Context menu for selected entries (shared by desktop and browser). ctx: { dir, inTrash, virtual, onCommand } */
async function itemContextMenu(entries, x, y, ctx) {
  const one = entries.length === 1 ? entries[0] : null;
  const label = one ? `“${one.display || one.name}”` : `${entries.length} Items`;
  const vol = one && one.volume;
  const items = [];
  items.push({ id: 'open', label: 'Open' });
  if (one && !one.dir && !one.app && !vol) items.push({ id: 'openwith', label: 'Open With', children: [{ id: 'loading', label: 'Loading…', enabled: false }], submenu: true, lazy: true });
  items.push({ type: 'separator' });
  if (ctx.inTrash) items.push({ id: 'putBack', label: 'Put Back' });
  else if (vol) items.push({ id: 'eject', label: `Eject ${label}` });
  else if (one && one.utilities && one.link) items.push({ id: 'removeAlias', label: 'Remove from Here' });
  else if (!ctx.virtual || ctx.allowTrash) items.push({ id: 'trash', label: 'Move to Trash' });
  items.push({ type: 'separator' });
  items.push({ id: 'info', label: 'Get Info' });
  if (one && !ctx.virtual && !ctx.inTrash && !vol) items.push({ id: 'rename', label: `Rename ${label}` });
  if (!ctx.virtual && !ctx.inTrash && !vol) items.push({ id: 'duplicate', label: 'Duplicate' }, { id: 'alias', label: 'Make Alias' });
  if (!ctx.inTrash && !vol && !entries.some((e) => e.app || (e.volume))) {
    const files = entries.filter((e) => !e.dir);
    const ok = files.length === entries.length && files.length ? await seeker.invoke('fs:canExtract', files.map((e) => ({ name: e.name, mime: e.mime }))) : [];
    if (Array.isArray(ok) && ok.length && ok.every(Boolean)) items.push({ id: 'extract', label: 'Extract Here' });
    if (!ctx.virtual) items.push({ id: 'compress', label: one ? `Compress ${label}` : `Compress ${entries.length} Items` });
  }
  items.push({ id: 'quicklook', label: `Quick Look ${label}` });
  items.push({ type: 'separator' }, { id: 'copy', label: `Copy ${label}` });
  if (ctx.showEnclosing) items.push({ type: 'separator' }, { id: 'enclosing', label: 'Show in Folder' });
  if (one && one.dir && !vol) items.push({ type: 'separator' }, { id: 'newWindow', label: 'Open in New Window' });
  popupMenu(items, {
    x, y, keepOnBlur: !!ctx.keepOnBlur,
    onOpenSub: async (it) => (it.id === 'openwith' ? Actions.openWithItems(one) : null),
    onActivate: async (it) => {
      if (it.id.startsWith('ow:')) {
        if (it.id === 'ow:other') {
          const all = await Actions.chooseOther();
          popupMenu(all, { x, y, onActivate: (a) => seeker.invoke('fs:open', entries.map((e) => e.path), a.app) });
          return;
        }
        return seeker.invoke('fs:open', entries.map((e) => e.path), it.app);
      }
      if (it.id === 'removeAlias') { await seeker.invoke('fs:removeUtilitiesAlias', one.path); return; }
      ctx.onCommand(it.id === 'newWindow' ? 'openNewWindow' : it.id);
    },
  });
}

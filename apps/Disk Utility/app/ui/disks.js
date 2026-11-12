'use strict';
/* Disks window: sidebar of disks and volumes, details, and a pie-chart partition editor. */
const ICONDIR = 'file:///usr/share/icons/palOS/256x256/devices/';
const GB = 1e9, MiB = 1048576;
const COLORS = ['#4c6278', '#6f8fb0', '#8fae6a', '#c9a24b', '#a183b5', '#5fa8a8', '#d0604e', '#7891ab'];
const FSNAME = { ext4: 'palOS (ext4)', ext3: 'Linux (ext3)', ext2: 'Linux (ext2)', vfat: 'FAT32', exfat: 'ExFAT', ntfs: 'Windows (NTFS)', btrfs: 'Btrfs', xfs: 'XFS', swap: 'Swap', iso9660: 'Disc (ISO 9660)', udf: 'Disc (UDF)', crypto_LUKS: 'Encrypted (LUKS)', squashfs: 'Compressed (SquashFS)' };
const FORMATS = [{ value: 'ext4', label: 'palOS (ext4) — for palOS and Linux' }, { value: 'exfat', label: 'ExFAT — works with palOS, Windows and Mac' }, { value: 'fat32', label: 'FAT32 — works almost everywhere, files up to 4 GB' }, { value: 'ntfs', label: 'Windows (NTFS)' }];
const D = { list: [], selDisk: null, selVol: null, mode: 'info', draft: null, draftSel: 0 };

const ICONS = {
  tCheck: '<path d="M4 12h3l2-5 4 10 2-5h5"/>', tPart: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8l6 5"/>', tErase: '<path d="M7 7h10l-1 13H8z"/><path d="M5 7h14M10 4h4"/>',
  tMount: '<path d="M6 15l6-7 6 7z"/><path d="M6 19h12"/>', tEject: '<path d="M6 13l6-7 6 7z"/><path d="M6 17h12"/>', tImage: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 4v5h6V4M8 14h8"/>', tRestore: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>', tUsage: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8h8"/>',
};
for (const [id, d] of Object.entries(ICONS)) { const t = $(`#${id} .ti`); t.textContent = ''; t.style.filter = 'none'; t.style.opacity = '1'; const s = SVG(d); Object.assign(s.style, { width: '22px', height: '22px', fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round', strokeLinejoin: 'round' }); t.append(s); }

function iconFor(d) {
  if (d.kind === 'optical') return ICONDIR + 'media-removable.png';
  if (d.kind === 'image') return ICONDIR + 'drive-removable-media.png';
  if (d.kind === 'external') return ICONDIR + (d.tran === 'usb' ? 'drive-removable-media-usb.png' : 'drive-harddisk-usb.png');
  if (d.system) return ICONDIR + 'drive-harddisk-system.png';
  return ICONDIR + (d.rota === false || d.tran === 'nvme' ? 'drive-harddisk-solidstate.png' : 'drive-harddisk.png');
}
const diskName = (d) => {
  if (d.kind === 'image') return d.backing ? d.backing.split('/').pop() : 'Disk Image';
  const vendor = /^(0x[0-9a-f]+|ATA|\s*)$/i.test(d.vendor || '') ? '' : (d.vendor || '').trim();
  const model = /^(0x[0-9a-f]+)?$/i.test((d.model || '').trim()) ? '' : (d.model || '').trim().replace(/_/g, ' ');
  return [vendor, model].filter(Boolean).join(' ') || (d.kind === 'optical' ? 'CD/DVD Drive' : d.tran === 'virtio' || /^vd/.test(d.name) ? 'Virtual Disk' : `Disk ${d.name}`);
};
const volName = (v, d) => v.label || v.partlabel || (v.mounts[0] === '/' ? 'palOS HD' : v.fstype ? `${humanSize(v.size)} Volume` : v.type === 'part' ? 'Partition ' + (v.partn || '') : diskName(d));

// ---------------------------------------------------------------- sidebar
function sidebar() {
  const nav = $('#nav'); nav.textContent = '';
  for (const [kind, title] of [['internal', 'Internal'], ['external', 'External'], ['optical', 'Discs'], ['image', 'Disk Images']]) {
    const ds = D.list.filter((d) => d.kind === kind); if (!ds.length) continue;
    nav.append(el('div', { class: 'grp-title', text: title }));
    for (const d of ds) {
      nav.append(el('button', { class: 'nav' + (D.selDisk === d.path && !D.selVol ? ' on' : ''), onclick: () => pick(d.path, null) }, el('img', { src: iconFor(d) }), el('span', { class: 'n' }, diskName(d), el('small', { text: humanSize(d.size) }))));
      for (const v of d.volumes) if (v.path !== d.path) nav.append(el('button', { class: 'nav vol' + (D.selVol === v.path ? ' on' : ''), onclick: () => pick(d.path, v.path) }, el('img', { src: ICONDIR + 'drive-harddisk.png' }), el('span', { class: 'n' }, volName(v, d), el('small', { text: v.mounts.length ? humanSize(v.size) : `${humanSize(v.size)} · not mounted` }))));
    }
  }
  if (!D.list.length) nav.append(el('div', { class: 'grp-title', text: 'No disks found' }));
}
function pick(disk, vol) { D.selDisk = disk; D.selVol = vol; if (D.mode === 'partition' || D.mode === 'usage') { D.mode = 'info'; D.draft = null; D.usage = null; } render(); }

async function load() {
  const r = await api.invoke('devices');
  D.list = Array.isArray(r) ? r : [];
  if (!D.list.some((d) => d.path === D.selDisk)) { const d = D.list.find((x) => x.kind === 'internal') || D.list[0]; D.selDisk = d ? d.path : null; D.selVol = null; }
  const d = D.list.find((x) => x.path === D.selDisk);
  if (d && D.selVol && !d.volumes.some((v) => v.path === D.selVol)) D.selVol = null;
  render();
}
const curDisk = () => D.list.find((x) => x.path === D.selDisk);
const curVol = () => { const d = curDisk(); return d && D.selVol ? d.volumes.find((v) => v.path === D.selVol) : null; };

// ---------------------------------------------------------------- main view
function tools() {
  const d = curDisk(), v = curVol();
  const set = (id, on, label) => { const b = $('#' + id); b.disabled = !on; if (label) b.lastChild.textContent = label; };
  set('tCheck', !!(v ? v.fstype : d && d.volumes.some((x) => x.fstype)));
  set('tPart', !!(d && !d.system && d.kind !== 'optical' && !v));
  $('#tPart').classList.toggle('on', D.mode === 'partition');
  set('tErase', !!(d && d.kind !== 'optical' && !(v ? v.sys : d.system) && !(d.ro)));
  const target = v || (d && d.volumes.length === 1 ? d.volumes[0] : null);
  set('tMount', !!(target && target.fstype && target.fstype !== 'swap' && !target.sys), target && target.mounts.length ? 'Unmount' : 'Mount');
  set('tEject', !!(d && (d.rm || d.kind === 'optical' || d.kind === 'image' || d.kind === 'external')));
  set('tImage', !!d); set('tUsage', !!((v && v.mounts.length) || (d && d.volumes.length === 1 && d.volumes[0].mounts.length))); set('tRestore', !!(d && !(v ? v.sys : d.system) && d.kind !== 'optical'));
}
function render() {
  sidebar(); tools();
  const view = $('#view'); view.textContent = '';
  const d = curDisk();
  if (!d) { view.append(el('div', { class: 'empty' }, el('div', { class: 'big', text: 'No disks found' }))); return; }
  if (D.mode === 'partition') return partitionView(view, d);
  if (D.mode === 'usage' && D.usage) return usageView(view);
  const v = curVol();
  const title = v ? volName(v, d) : diskName(d);
  const sub = v ? `${FSNAME[v.fstype] || v.fstype || 'Unknown format'}${v.mounts.length ? ' · ' + v.mounts.join(', ') : ''}` : `${({ internal: 'Internal', external: 'External', optical: 'Disc drive', image: 'Disk image' })[d.kind]}${d.tran ? ' · ' + d.tran.toUpperCase() : ''}${d.pttype ? ' · ' + (d.pttype === 'gpt' ? 'GUID partition table' : 'Master boot record') : ''}`;
  view.append(el('div', { class: 'dhead' }, el('img', { src: v ? ICONDIR + 'drive-harddisk.png' : iconFor(d) }), el('div', {}, el('h1', { text: title }), el('div', { class: 's', text: sub })), el('div', { class: 'size', text: humanSize(v ? v.size : d.size) })));
  if (v) {
    if (v.fsused != null && v.fsavail != null) {
      const used = +v.fsused, free = +v.fsavail, tot = used + free || 1;
      view.append(el('div', { class: 'usage' }, el('div', { class: 'track' }, el('i', { style: { width: `${used / tot * 100}%`, background: 'var(--accent)' } })),
        el('div', { class: 'legend' }, el('div', {}, el('span', { class: 'sw', style: { background: 'var(--accent)' } }), 'Used', el('b', { text: humanSize(used) })), el('div', {}, el('span', { class: 'sw', style: { background: 'var(--track)' } }), 'Free', el('b', { text: humanSize(free) })))));
    }
    view.append(kv([['Mount point', v.mounts.join(', ') || 'Not mounted'], ['Format', FSNAME[v.fstype] || v.fstype || '--'], ['Device', v.path], ['Name', v.label || '--'], ['Partition type', v.parttypename || '--'], ['UUID', v.uuid || '--']]));
    const acts = el('div', { class: 'pacts' });
    if (v.mounts.length) acts.append(el('button', { class: 'btn', onclick: () => api.invoke('open', v.mounts[0]) }, 'Show in Seeker'));
    if (v.fstype && !v.sys && v.type === 'part') acts.append(el('button', { class: 'btn', onclick: () => renameVol(v) }, 'Rename…'));
    view.append(acts);
  } else {
    // a strip showing how the disk is divided
    if (d.volumes.length && d.kind !== 'optical') {
      const strip = el('div', { class: 'strip' });
      slicesOf(d).forEach((s, i) => strip.append(el('div', { class: s.free ? 'free' : '', style: { flex: `${Math.max(s.size, d.size * 0.012)} 0 0`, background: s.free ? '' : COLORS[i % COLORS.length] }, title: `${s.name} — ${humanSize(s.size)}` }, s.size > d.size * 0.12 ? s.name : '')));
      view.append(strip);
    }
    view.append(kv([['Model', diskName(d)], ['Capacity', humanSize(d.size)], ['Connection', (d.tran || (d.kind === 'image' ? 'Disk image' : '--')).toUpperCase()], ['Device', d.path], ['Partition map', d.pttype === 'gpt' ? 'GUID (GPT)' : d.pttype === 'dos' ? 'Master Boot Record' : '--'], ['Serial number', d.serial || '--'], ...(d.backing ? [['Image file', d.backing]] : [])]));
    if (d.system) view.append(el('p', { class: 'note', text: 'palOS is running from this disk, so it can’t be erased or partitioned now. To change it, start the computer from the palOS install USB.' }));
  }
}
function kv(rows) { const g = el('div', { class: 'kv' }); for (const [k, v] of rows) g.append(el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v })); return g; }

// ---------------------------------------------------------------- partition layout
function slicesOf(d) {
  const sec = 512;
  const parts = d.volumes.filter((v) => v.type === 'part' && v.start != null).sort((a, b) => a.start - b.start);
  const out = []; let pos = MiB;
  for (const p of parts) {
    const start = p.start * sec;
    if (start - pos >= 16 * MiB) out.push({ free: true, start: pos, size: start - pos, name: 'Free space' });
    out.push({ start, size: +p.size, name: volName(p, d), fstype: p.fstype, path: p.path, partn: p.partn, sys: p.sys, mounted: p.mounts.length > 0,
      minSize: p.fsused != null ? Math.ceil((+p.fsused * 1.1 + 64 * MiB) / MiB) * MiB : 0 });   // can't shrink below what's stored
    pos = start + +p.size;
  }
  const end = d.size - MiB;
  if (end - pos >= 16 * MiB) out.push({ free: true, start: pos, size: end - pos, name: 'Free space' });
  return out;
}
function startPartition() {
  const d = curDisk(); if (!d) return;
  if (!d.pttype) { alertBox('This disk has no partition map yet.', 'Erase it first: that gives it a partition map and one volume, which you can then divide.'); return; }
  D.mode = 'partition';
  D.draft = slicesOf(d).map((s) => ({ ...s, orig: s.free ? null : { size: s.size } }));
  D.draftSel = D.draft.findIndex((s) => !s.sys) >= 0 ? D.draft.findIndex((s) => !s.sys) : 0;
  render();
}
function mergeFree() {
  const out = [];
  for (const s of D.draft) {
    const last = out[out.length - 1];
    if (s.free && last && last.free) { last.size = s.start + s.size - last.start; continue; }
    out.push(s);
  }
  D.draft = out.filter((s) => !(s.free && s.size < MiB));
}
const resizable = (s) => !s.free && !s.sys && (s.isNew || /^ext[234]$|^ntfs$/.test(s.fstype || ''));
function partitionView(view, d) {
  view.append(el('div', { class: 'dhead' }, el('img', { src: iconFor(d) }), el('div', {}, el('h1', { text: `Partition “${diskName(d)}”` }), el('div', { class: 's', text: 'Drag the white handles to change sizes. Click a slice to change it. Nothing changes until you click Apply.' })), el('div', { class: 'size', text: humanSize(d.size) })));
  const wrap = el('div', { class: 'pedit' });
  wrap.append(pie(d), plist(d));
  view.append(wrap);
}
const total = () => D.draft.reduce((a, s) => a + s.size, 0);
function pie(d) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 300 300'); svg.setAttribute('class', 'pie');
  svg.innerHTML = '<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="var(--card)"/><rect width="2" height="7" fill="var(--line)"/></pattern></defs>';
  const C = 150, R = 140, T = total();
  const pt = (a, r = R) => [C + r * Math.sin(a), C - r * Math.cos(a)];
  let acc = 0; const bounds = [];
  D.draft.forEach((s, i) => {
    const a0 = acc / T * 2 * Math.PI, a1 = (acc + s.size) / T * 2 * Math.PI; acc += s.size; bounds.push(a1);
    const p = document.createElementNS(NS, 'path');
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1); const large = a1 - a0 > Math.PI ? 1 : 0;
    const dd = D.draft.length === 1 ? `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z` : `M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
    p.setAttribute('d', dd); p.setAttribute('class', (s.free ? 'free' : '') + (i === D.draftSel ? ' sel' : ''));
    if (!s.free) p.setAttribute('fill', COLORS[colorIndex(i) % COLORS.length]);
    p.addEventListener('mousedown', () => { D.draftSel = i; render(); });
    svg.append(p);
  });
  const hole = document.createElementNS(NS, 'circle'); hole.setAttribute('cx', C); hole.setAttribute('cy', C); hole.setAttribute('r', 46); hole.setAttribute('class', 'hole'); svg.append(hole);
  const txt = document.createElementNS(NS, 'text'); txt.setAttribute('x', C); txt.setAttribute('y', C + 5); txt.textContent = humanSize(d.size); svg.append(txt);
  // handles between a resizable partition and the free space next to it
  D.draft.forEach((s, i) => {
    const n = D.draft[i + 1]; if (!n) return;
    const can = (resizable(s) && n.free) || (s.free && resizable(n));
    if (!can) return;
    const [hx, hy] = pt(bounds[i], R - 14);
    const h = document.createElementNS(NS, 'circle'); h.setAttribute('cx', hx); h.setAttribute('cy', hy); h.setAttribute('r', 9); h.setAttribute('class', 'handle');
    h.addEventListener('pointerdown', (e) => drag(e, svg, i));
    svg.append(h);
  });
  return svg;
}
const colorIndex = (i) => D.draft.slice(0, i).filter((s) => !s.free).length;
function drag(e, svg, i) {
  e.preventDefault(); e.stopPropagation();
  const a = D.draft[i], b = D.draft[i + 1];
  const start = a.start, end = b.start + b.size;           // the boundary moves between these
  const T = total(), origin = D.draft[0].start;
  const MIN = 32 * MiB;
  const minFor = (s) => (s.free ? 0 : s.isNew ? MIN : Math.max(MIN, s.minSize || MIN));
  const move = (ev) => {
    const r = svg.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width * 300 - 150, y = (ev.clientY - r.top) / r.height * 300 - 150;
    let ang = Math.atan2(x, -y); if (ang < 0) ang += 2 * Math.PI;
    let pos = origin + ang / (2 * Math.PI) * T;
    pos = Math.round(pos / MiB) * MiB;
    pos = Math.max(start + minFor(a), Math.min(end - minFor(b), pos));
    if (a.orig && !a.isNew && a.fstype === 'ntfs' && pos - start < a.orig.size && !a.warned) { a.warned = true; }
    a.size = pos - start; b.start = pos; b.size = end - pos;
    D.draftSel = a.free ? i + 1 : i;
    const keep = document.activeElement; render(); if (keep && keep.id) { const k = document.getElementById(keep.id); if (k) k.focus(); }
  };
  const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); mergeFree(); render(); };
  document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
}
function plist(d) {
  const box = el('div', { class: 'plist' });
  const card = el('div', { class: 'card' });
  D.draft.forEach((s, i) => {
    const changed = s.isNew ? 'new' : s.orig && s.size !== s.orig.size ? 'resized' : '';
    card.append(el('div', { class: 'row' + (i === D.draftSel ? ' on' : ''), onclick: () => { D.draftSel = i; render(); } },
      el('span', { class: 'sw' + (s.free ? ' free' : ''), style: s.free ? {} : { background: COLORS[colorIndex(i) % COLORS.length] } }),
      el('div', { class: 'lbl' }, el('div', { class: 't' }, s.name, changed ? el('span', { class: 'changed', text: changed }) : null), el('div', { class: 's', text: s.free ? 'Not in use' : `${FSNAME[s.fstype] || (s.isNew ? FSNAME[s.newFs === 'fat32' ? 'vfat' : s.newFs] : '') || s.fstype || 'Unformatted'}${s.sys ? ' · palOS is using it' : s.mounted ? ' · mounted' : ''}` })),
      el('div', { class: 'ctl', text: humanSize(s.size) })));
  });
  box.append(card);
  const s = D.draft[D.draftSel];
  if (s) {
    const f = el('div', { class: 'pform' });
    if (s.free) {
      f.append(el('div', { text: 'Free space' }), el('div', { text: humanSize(s.size) }));
    } else {
      // a slider with a pulley: drag it and the size reads in gigabytes, two decimals ("128.45 gigabytes")
      const nx = D.draft[D.draftSel + 1], room = s.size + (nx && nx.free ? nx.size : 0);
      const lo = s.isNew ? 32 * MiB : Math.max(32 * MiB, s.minSize || 32 * MiB);
      const can = resizable(s) && (hasFreeNext(D.draftSel) || shrinkOk(s)) && room > lo;
      const gbText = (b) => `${(b / GB).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gigabytes`;
      const steps = 1000, toB = (v) => lo + (room - lo) * v / steps, toV = (b) => Math.round((b - lo) / Math.max(1, room - lo) * steps);
      const read = el('div', { class: 'gbread', text: gbText(s.size) });
      const pull = el('input', { id: 'psize', class: 'pulley', type: 'range', min: 0, max: steps, step: 1, value: toV(s.size), disabled: !can });
      const fill = () => pull.style.setProperty('--fill', (pull.value / steps * 100) + '%'); fill();
      pull.addEventListener('input', () => { fill(); read.textContent = gbText(Math.round(toB(+pull.value) / MiB) * MiB); });
      pull.addEventListener('change', () => setSize(D.draftSel, toB(+pull.value)));
      f.append(el('div', { text: 'Size' }), el('div', { class: 'gbsize' }, pull, read));
      if (s.isNew) {
        const nm = el('input', { id: 'pname', type: 'text', value: s.newName || '', placeholder: 'Untitled' }); nm.addEventListener('input', () => { s.newName = nm.value; s.name = nm.value || 'New volume'; });
        const fsSel = el('select', { id: 'pfs' }, ...FORMATS.map((o) => el('option', { value: o.value, selected: o.value === s.newFs }, o.label))); fsSel.addEventListener('change', () => { s.newFs = fsSel.value; render(); });
        f.append(el('div', { text: 'Name' }), nm, el('div', { text: 'Format' }), fsSel);
      } else if (!resizable(s)) f.append(el('div'), el('div', { class: 'note', style: { color: 'var(--dim)', fontSize: '12px' }, text: s.sys ? 'palOS is using this volume.' : 'This kind of volume can’t be resized, but it can be removed or erased.' }));
    }
    box.append(f);
  }
  const acts = el('div', { class: 'pacts' },
    el('button', { class: 'btn', title: 'Add a volume in the selected free space', disabled: !(s && s.free && s.size >= 64 * MiB), onclick: addSlice }, '＋'),
    el('button', { class: 'btn', title: 'Remove the selected volume', disabled: !(s && !s.free && !s.sys), onclick: removeSlice }, '−'),
    el('span', { class: 'grow' }),
    el('button', { class: 'btn', onclick: () => { D.mode = 'info'; D.draft = null; render(); } }, 'Cancel'),
    el('button', { class: 'btn primary', disabled: !plan().length, onclick: apply }, 'Apply'));
  box.append(acts);
  return box;
}
const hasFreeNext = (i) => D.draft[i + 1] && D.draft[i + 1].free;
const shrinkOk = (s) => resizable(s);
function setSize(i, bytes) {
  const s = D.draft[i]; if (!s || isNaN(bytes)) return;
  bytes = Math.round(bytes / MiB) * MiB;
  let next = D.draft[i + 1];
  if (!next || !next.free) { next = { free: true, start: s.start + s.size, size: 0, name: 'Free space' }; D.draft.splice(i + 1, 0, next); }
  const room = s.size + next.size;
  bytes = Math.max(32 * MiB, Math.min(room, bytes));
  s.size = bytes; next.start = s.start + bytes; next.size = room - bytes;
  mergeFree(); render();
}
function addSlice() {
  const i = D.draftSel, f = D.draft[i]; if (!f || !f.free) return;
  const half = f.size > 8 * GB ? Math.round(f.size / 2 / MiB) * MiB : f.size;
  const n = { start: f.start, size: half, name: 'New volume', isNew: true, newFs: 'ext4', newName: '' };
  f.start += half; f.size -= half;
  D.draft.splice(i, 0, n); mergeFree(); D.draftSel = D.draft.indexOf(n); render();
}
function removeSlice() {
  const s = D.draft[D.draftSel]; if (!s || s.free || s.sys) return;
  if (!s.isNew) { s.removed = true; }
  D.draft[D.draftSel] = { free: true, start: s.start, size: s.size, name: 'Free space', wasRemoved: s.isNew ? null : s };
  mergeFree(); render();
}
/** The steps to get from the disk as it is to the draft: removals, then shrinks, then grows, then new volumes. */
function plan() {
  if (!D.draft) return [];
  const d = curDisk(); const before = slicesOf(d).filter((s) => !s.free);
  const kept = D.draft.filter((s) => !s.free && !s.isNew);
  const steps = [];
  for (const b of before) if (!kept.some((k) => k.path === b.path)) steps.push({ op: 'delete', path: b.path, text: `Remove “${b.name}” (${humanSize(b.size)}) — everything on it is erased` });
  for (const k of kept) if (k.size < k.orig.size - MiB) steps.push({ op: 'resize', path: k.path, size: k.size, text: `Make “${k.name}” smaller: ${humanSize(k.orig.size)} → ${humanSize(k.size)}` });
  for (const k of kept) if (k.size > k.orig.size + MiB) steps.push({ op: 'resize', path: k.path, size: k.size, text: `Make “${k.name}” bigger: ${humanSize(k.orig.size)} → ${humanSize(k.size)}` });
  for (const n of D.draft.filter((s) => s.isNew)) steps.push({ op: 'add', start: n.start, size: n.size, fs: n.newFs, name: n.newName || '', text: `Add “${n.newName || 'Untitled'}” (${humanSize(n.size)}, ${FORMATS.find((f) => f.value === n.newFs).label.split(' —')[0]})` });
  return steps;
}
async function apply() {
  const steps = plan(); if (!steps.length) return;
  const d = curDisk();
  const ok = await confirmBox(`Change “${diskName(d)}”?`, steps.map((s) => '• ' + s.text).join('\n') + '\n\nBack up anything important first. Changing partitions can’t be undone.', 'Apply', true);
  if (!ok) return;
  for (const s of steps) {
    busy(s.text);
    const r = s.op === 'delete' ? await api.invoke('delete', s.path) : s.op === 'resize' ? await api.invoke('resize', s.path, s.size) : await api.invoke('add', d.path, s.start, s.size, s.fs, s.name);
    if (r && r.error) { busy(null); await alertBox('Disks couldn’t finish.', `${s.text}\n\n${r.error}`); break; }
  }
  busy(null); D.mode = 'info'; D.draft = null; toast('Done'); load();
}

// ---------------------------------------------------------------- erase, check, mount, eject, images
async function erase() {
  const d = curDisk(), v = curVol(); if (!d) return;
  const whole = !v;
  const fields = [{ name: 'name', label: 'Name', value: whole ? 'Untitled' : (v.label || 'Untitled') }, { name: 'fs', label: 'Format', type: 'select', value: d.kind === 'external' ? 'exfat' : 'ext4', options: FORMATS }];
  if (whole) fields.push({ name: 'scheme', label: 'Partition map', type: 'select', value: 'gpt', options: [{ value: 'gpt', label: 'GUID Partition Map (recommended)' }, { value: 'mbr', label: 'Master Boot Record (very old computers)' }] });
  const f = await form({ title: `Erase “${whole ? diskName(d) : volName(v, d)}”?`, text: 'Erasing deletes everything on it. This can’t be undone.', fields, ok: 'Erase', danger: true });
  if (!f) return;
  busy('Erasing…');
  const r = whole ? await api.invoke('erase', d.path, f.scheme, f.fs, f.name) : await api.invoke('format', v.path, f.fs, f.name);
  busy(null);
  if (r && r.error) { if (!r.cancelled) alertBox('The disk couldn’t be erased.', r.error); return; }
  toast('Erased'); load();
}
async function check() {
  const d = curDisk(), v = curVol() || (d && d.volumes.find((x) => x.fstype && !x.sys)) || (d && d.volumes.find((x) => x.fstype));
  if (!v) return;
  busy(`Checking “${volName(v, d)}”…`);
  let r = await api.invoke('check', v.path); busy(null);
  if (r && r.error) { if (!r.cancelled) alertBox('The volume couldn’t be checked.', r.error); return; }
  const rep = r.report || { good: true, text: '' };
  if (rep.good) { await api.invoke('ui:message', { type: 'info', message: `“${volName(v, d)}” looks fine.`, detail: (r.note ? r.note + '\n\n' : '') + 'No problems were found.', buttons: ['OK'] }); return; }
  if (v.sys) { await alertBox(`Disks found problems on “${volName(v, d)}”.`, 'palOS is running from this volume, so it can’t be repaired now. Restart from the palOS install USB and use Disks there to repair it.'); return; }
  if (!(await confirmBox(`Disks found problems on “${volName(v, d)}”.`, 'Repair it now? It will be unmounted while it’s repaired.', 'Repair'))) return;
  busy('Repairing…'); r = await api.invoke('repair', v.path); busy(null);
  if (r && r.error) return alertBox('The volume couldn’t be repaired.', r.error);
  await api.invoke('ui:message', { type: 'info', message: r.report && r.report.good ? 'Repaired.' : 'Disks couldn’t repair everything.', detail: r.report ? r.report.text : '', buttons: ['OK'] }); load();
}
async function mountToggle() {
  const d = curDisk(); const v = curVol() || (d && d.volumes.length === 1 ? d.volumes[0] : null); if (!v) return;
  const r = await api.invoke(v.mounts.length ? 'unmount' : 'mount', v.path);
  if (r && r.error) return alertBox(v.mounts.length ? 'The volume couldn’t be unmounted.' : 'The volume couldn’t be mounted.', r.error);
  load();
}
async function eject() { const d = curDisk(); if (!d) return; const r = await api.invoke('eject', d.path); if (r && r.error) return alertBox('The disk couldn’t be ejected.', r.error); toast('You can unplug it now'); D.selDisk = null; load(); }
async function renameVol(v) {
  const f = await form({ title: 'Rename', fields: [{ name: 'n', label: 'Name', value: v.label || '' }], ok: 'Rename' }); if (!f) return;
  busy('Renaming…'); const r = await api.invoke('rename', v.path, f.n); busy(null); if (r && r.error && !r.cancelled) return alertBox('The volume couldn’t be renamed.', r.error); load();
}
async function image() { const d = curDisk(); if (!d) return; const v = curVol(); busy('Making the image…', true); const r = await api.invoke('image', v ? v.path : d.path, v ? volName(v, d) : diskName(d)); busy(null); if (r && r.error && !r.cancelled) return alertBox('The image couldn’t be made.', r.error); if (r && r.ok) toast('Image saved'); }
async function restore() {
  const d = curDisk(); if (!d) return; const v = curVol();
  if (!(await confirmBox(`Write an image to “${v ? volName(v, d) : diskName(d)}”?`, 'Everything on it is replaced by the image you choose next. Disk Utility checks the disk afterwards.', 'Choose Image…', true))) return;
  busy('Writing…', true); const r = await api.invoke('restore', v ? v.path : d.path, !v, d.path, diskName(d)); busy(null);
  if (r && r.error && !r.cancelled) return alertBox('The image couldn’t be written.', r.error); if (r && r.ok) { toast(d.kind === 'external' ? 'Done. You can unplug it now.' : 'Done'); load(); }
}

// ---------------------------------------------------------------- Disk Usage
async function usage(dir) {
  const d = curDisk(), v = curVol(); const t = v || (d && d.volumes.length === 1 ? d.volumes[0] : null);
  const at = dir || (t && t.mounts && t.mounts[0]);
  if (!at) return alertBox('Mount the volume first.', 'Disk Usage shows what takes up the space on a mounted volume.');
  busy('Measuring…'); const r = await api.invoke('usage', at); busy(null);
  if (!r || r.error) return alertBox('Disk Usage couldn’t read that folder.', r && r.error);
  D.mode = 'usage'; D.usage = r; render();
}
function usageView(view) {
  const r = D.usage; const max = Math.max(1, ...r.items.map((i) => i.size));
  const head = el('div', { class: 'uhead' });
  const up = el('button', { class: 'btn small', text: '‹ Back' }); up.onclick = () => { const p = r.dir.replace(/\/[^/]+\/?$/, '') || '/'; const root = (curVol() && curVol().mounts[0]) || '/'; if (r.dir === root) { D.mode = 'info'; render(); } else usage(p); };
  head.append(up, el('div', { class: 'upath', text: r.dir }), el('div', { class: 'utotal', text: humanSize(r.total) }));
  const list = el('div', { class: 'ulist' });
  for (const i of r.items) {
    const row = el('div', { class: 'urow' + (i.file ? ' file' : '') });
    const bar = el('div', { class: 'ubar' }); const fill = el('i'); fill.style.width = Math.max(1, Math.round(i.size * 100 / max)) + '%'; bar.append(fill);
    const nm = el('div', { class: 'uname' });
    if (i.icon) nm.append(el('img', { class: 'uico', src: i.icon, alt: '' }));
    nm.append(document.createTextNode(i.path.split('/').pop()));
    row.append(nm, bar, el('div', { class: 'usize', text: humanSize(i.size) }));
    row.onclick = () => (i.file ? api.invoke('open', i.path.replace(/\/[^/]+$/, '')) : usage(i.path));
    list.append(row);
  }
  if (!r.items.length) list.append(el('div', { class: 'uempty', text: 'This folder is empty.' }));
  view.append(head, list);
}
async function attach() { const r = await api.invoke('attach'); if (r && r.error) return alertBox('The disk image couldn’t be opened.', r.error); setTimeout(load, 800); }

// ---------------------------------------------------------------- progress
let busyBytes = false;
function busy(text, bytes) {
  const b = $('#busy');
  if (text == null) { b.classList.add('hidden'); return; }
  busyBytes = !!bytes; $('#btext').textContent = text; $('#bfill').style.width = '0%'; b.classList.remove('hidden'); b.classList.add('indet');
}
api.on('progress', (p) => {
  if (!p) return;
  $('#busy').classList.remove('indet'); $('#bfill').style.width = p.pct + '%';
  if (busyBytes && /^\d+$/.test(p.text)) $('#btext').textContent = `Copied ${humanSize(+p.text)}…`;
  else if (p.text && !/^\d+$/.test(p.text) && p.text !== 'Done') $('#btext').textContent = p.text + '…';
});

$('#tCheck').onclick = check; $('#tPart').onclick = () => (D.mode === 'partition' ? (D.mode = 'info', D.draft = null, render()) : startPartition());
$('#tErase').onclick = erase; $('#tMount').onclick = mountToggle; $('#tEject').onclick = eject; $('#tImage').onclick = image; $('#tUsage').onclick = () => usage(); $('#tRestore').onclick = restore; $('#attachBtn').onclick = attach;
api.on('cmd', (c) => ({ usage: () => usage(), check, partition: startPartition, erase, mount: mountToggle, unmount: mountToggle, eject, image, restore, attach, refresh: load }[c] || (() => {}))());
setInterval(() => { if (D.mode === 'info' && !$('#dlg') && $('#busy').classList.contains('hidden')) load(); }, 4000);
load();

'use strict';
/* Sheets: dialogs that drop down from the top of the window (no native or portal windows) */

const dirOf = p => (p.lastIndexOf('/') <= 0 ? '/' : p.slice(0, p.lastIndexOf('/')));
const joinP = (d, n) => (d === '/' ? '' : d) + '/' + n;

function alertSheet(title, message) {
  return new Promise(res => {
    const ov = h('div', { class: 'overlay', onkeydown: e => { if (e.key === 'Escape' || e.key === 'Enter') done(); } },
      h('div', { class: 'dlg', role: 'alertdialog' }, h('h3', {}, title), h('p', { style: 'white-space:pre-wrap' }, message),
        h('div', { class: 'row end' }, h('button', { class: 'btn primary', onclick: () => done() }, 'OK'))));
    const done = () => { ov.remove(); res(); };
    document.body.append(ov);
    ov.querySelector('button').focus();
  });
}

function fileSheet(o) {
  return new Promise(async res => {
    const save = o.mode === 'save';
    const exts = (o.filters || []).flatMap(f => f.extensions).filter(e => e !== '*').map(e => e.toLowerCase());
    const fits = n => !exts.length || exts.includes((n.split('.').pop() || '').toLowerCase());
    const dp = o.defaultPath || '/';
    let cwd = dp.endsWith('/') ? dp.slice(0, -1) || '/' : dirOf(dp);
    let pickedName = save && !dp.endsWith('/') ? dp.slice(dp.lastIndexOf('/') + 1) : '';
    let sel = null;
    const places = await cdb.fs('places').catch(() => []);
    const list = h('div', { class: 'flist2' });
    const pathBox = h('input', { type: 'text', spellcheck: 'false', onkeydown: e => { if (e.key === 'Enter') { e.stopPropagation(); go(pathBox.value.trim()); } } });
    const nameBox = h('input', { type: 'text', spellcheck: 'false', value: pickedName, placeholder: 'Name', oninput: () => { pickedName = nameBox.value; sync(); }, onkeydown: e => { if (e.key === 'Enter') { e.stopPropagation(); commit(); } } });
    const okBtn = h('button', { class: 'btn primary', onclick: () => commit() }, o.buttonLabel || (save ? 'Save' : 'Open'));
    const done = v => { ov.remove(); res(v); };

    const sync = () => { okBtn.disabled = save ? !pickedName.trim() : !sel; };

    async function go(p) {
      try {
        const r = await cdb.fs('list', p);
        cwd = r.path; sel = null; pathBox.value = cwd;
        const rows = r.entries.filter(e => e.dir || fits(e.name)).sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) : a.dir ? -1 : 1));
        list.replaceChildren(...(cwd !== '/' ? [h('div', { class: 'frow', ondblclick: () => go(dirOf(cwd)) }, h('span', { class: 'fic' }, '↰'), '..')] : []),
          ...rows.map(e => h('div', { class: 'frow' + (e.dir ? ' dir' : ''), 'data-n': e.name,
            onclick: ev => {
              if (e.dir) return;
              sel = e.name; pickedName = e.name; nameBox.value = save ? e.name : ''; sync();
              list.querySelectorAll('.frow').forEach(x => x.classList.toggle('on', x === ev.currentTarget));
            },
            ondblclick: () => { if (e.dir) go(joinP(cwd, e.name)); else { sel = e.name; pickedName = e.name; commit(); } }
          }, h('span', { class: 'fic' }, e.dir ? '▸' : '▫'), e.name)),
          !rows.length && h('div', { class: 'note' }, 'Nothing here.'));
        sync();
      } catch (e) { toast(String(e.message).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), true); pathBox.value = cwd; }
    }

    async function commit() {
      if (save) {
        let n = pickedName.trim();
        if (!n) return;
        if (n.includes('/')) return toast('A file name cannot contain "/".', true);
        if (exts.length && !fits(n)) n += '.' + exts[0];
        const full = joinP(cwd, n);
        const st = await cdb.fs('stat', full);
        if (st.exists && st.dir) return toast('That name is a folder.', true);
        if (st.exists && !(await sure('Replace file?', `"${n}" already exists in this folder.`, 'Replace'))) return;
        done(full);
      } else if (sel) done(joinP(cwd, sel));
    }

    async function newFolder() {
      const r = await ask({ title: 'New folder', input: true, ok: 'Create', value: 'untitled folder' });
      if (!r || !r.value) return;
      try { await cdb.fs('mkdir', joinP(cwd, r.value)); await go(joinP(cwd, r.value)); } catch (e) { toast(String(e.message).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), true); }
    }

    const ov = h('div', { class: 'overlay', onkeydown: e => { if (e.key === 'Escape') done(null); } },
      h('div', { class: 'dlg filesheet', role: 'dialog' },
        h('h3', {}, o.title || (save ? 'Save' : 'Open')),
        h('div', { class: 'fbody' },
          h('div', { class: 'fplaces' }, places.map(p => h('button', { class: 'btn plain', onclick: () => go(p.path) }, p.name))),
          h('div', { class: 'fmain' }, pathBox, list)),
        save && h('label', { class: 'fname' }, 'Save as', nameBox),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: newFolder }, 'New Folder'), h('span', { style: 'flex:1' }),
          h('button', { class: 'btn', onclick: () => done(null) }, 'Cancel'), okBtn)));
    document.body.append(ov);
    await go(cwd).catch(() => {});
    if (!pathBox.value) await go(places[0] ? places[0].path : '/');
    (save ? nameBox : list).focus(); if (save) nameBox.select();
    sync();
  });
}

cdb.on('pick', async (id, o) => { cdb.pickResult(id, await fileSheet(o)); });
cdb.on('alert', (title, msg) => alertSheet(title, msg));

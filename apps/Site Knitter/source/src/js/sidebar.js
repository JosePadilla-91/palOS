// Left sidebar: the site's pages (and blog posts), classic style
import { state, on, mutate, selectPage, currentPage } from './store.js';
import { h, clone, uid, formatDate } from './util.js';
import { showContextMenu, promptText, confirmBox } from './dialogs.js';
import { uniqueSlug } from './themes.js';
import { newEntry } from './blog.js';
import { icon, TEMPLATE_ICONS } from './icons.js';


export function initSidebar(root, { onAddPage }) {
  const render = () => {
    root.innerHTML = '';
    if (!state.project) return;
    const site = state.project.site;
    const list = h('div', { class: 'sb-list' });
    root.append(
      h('div', { class: 'sb-site', title: 'Site settings', onclick: () => { selectPage(state.pageId); document.dispatchEvent(new CustomEvent('ws-inspector-tab', { detail: 'site' })); } },
        h('span', { class: 'sb-globe' }, icon('site', 17)), h('span', { class: 'sb-site-name' }, site.name)),
      list,
      h('div', { class: 'sb-foot' },
        h('button', { class: 'btn small', onclick: onAddPage, title: 'Add a page (Ctrl+Shift+N)' }, '+ Add Page')));

    let dragId = null;
    state.project.pages.forEach((p, idx) => {
      const active = p.id === state.pageId && !state.entryId;
      const row = h('div', {
        class: 'sb-page' + (active ? ' on' : '') + (p.showInNav === false ? ' hidden-nav' : ''),
        draggable: true,
        onclick: () => selectPage(p.id),
        ondblclick: () => rename(p),
        oncontextmenu: (e) => { e.preventDefault(); pageMenu(e, p); },
        ondragstart: (e) => { dragId = p.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-ws-page', p.id); },
        ondragover: (e) => {
          if (!dragId) return;
          e.preventDefault();
          const r = row.getBoundingClientRect();
          row.classList.toggle('drop-above', e.clientY < r.top + r.height / 2);
          row.classList.toggle('drop-below', e.clientY >= r.top + r.height / 2);
        },
        ondragleave: () => row.classList.remove('drop-above', 'drop-below'),
        ondrop: (e) => {
          e.preventDefault();
          row.classList.remove('drop-above', 'drop-below');
          const r = row.getBoundingClientRect();
          const below = e.clientY >= r.top + r.height / 2;
          const from = state.project.pages.findIndex((x) => x.id === dragId);
          let to = idx + (below ? 1 : 0);
          if (from < to) to--;
          dragId = null;
          if (from === to || from < 0) return;
          mutate((proj) => { const [m] = proj.pages.splice(from, 1); proj.pages.splice(to, 0, m); }, { events: ['pages', 'change'] });
        },
        ondragend: () => { dragId = null; },
      },
      h('span', { class: 'sb-icon' }, icon(TEMPLATE_ICONS[p.template] || 'blank', 16)),
      h('span', { class: 'sb-name' }, p.name),
      idx === 0 ? h('span', { class: 'sb-badge', title: 'Home page (index.html)' }, 'Home') : '',
      p.showInNav === false ? h('span', { class: 'sb-badge dim', title: 'Not shown in the navigation menu' }, 'Hidden') : '');
      list.append(row);

      if (p.type === 'blog') {
        const sub = h('div', { class: 'sb-entries' });
        const entries = [...p.blog.entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        for (const e of entries) {
          sub.append(h('div', {
            class: 'sb-entry' + (state.entryId === e.id ? ' on' : '') + (e.draft ? ' draft' : ''),
            onclick: () => selectPage(p.id, e.id),
            oncontextmenu: (ev) => {
              ev.preventDefault();
              showContextMenu(ev.clientX, ev.clientY, [
                { label: 'Duplicate Post', action: () => mutate(() => { const c = { ...clone(e), id: uid('b'), title: e.title + ' copy', slug: e.slug + '-copy' }; p.blog.entries.push(c); }, { events: ['pages'] }) },
                { label: 'Delete Post', action: async () => {
                  if (!(await confirmBox('Delete Post', `Delete “${e.title}”? You can undo this.`, 'Delete', true))) return;
                  mutate(() => { p.blog.entries = p.blog.entries.filter((x) => x.id !== e.id); }, { events: ['pages'] });
                  if (state.entryId === e.id) selectPage(p.id);
                } },
              ]);
            },
          }, h('span', { class: 'sb-entry-title' }, e.title || 'Untitled'), h('span', { class: 'sb-entry-date' }, (e.draft ? 'Draft · ' : '') + formatDate(e.date, 'short'))));
        }
        sub.append(h('button', { class: 'sb-new-entry', onclick: () => newEntry(p) }, '+ New Post'));
        list.append(sub);
      }
    });
  };

  const rename = async (p) => {
    const name = await promptText('Rename Page', p.name);
    if (!name || name === p.name) return;
    mutate((proj) => {
      p.name = name;
      if (!p.slugLocked) p.slug = uniqueSlug(proj, name, p.id);
    }, { events: ['pages', 'change'] });
  };

  const pageMenu = (e, p) => {
    showContextMenu(e.clientX, e.clientY, [
      { label: 'Rename…', action: () => rename(p) },
      { label: 'Duplicate Page', action: () => duplicatePage(p) },
      { label: p.showInNav === false ? 'Show in Navigation Menu' : 'Hide from Navigation Menu', action: () => mutate(() => { p.showInNav = p.showInNav === false; }, { events: ['pages', 'change'] }) },
      { label: 'Make Home Page', disabled: state.project.pages[0].id === p.id, action: () => mutate((proj) => { proj.pages = [p, ...proj.pages.filter((x) => x.id !== p.id)]; }, { events: ['pages', 'change'] }) },
      '-',
      { label: 'Delete Page', disabled: state.project.pages.length < 2, action: () => deletePage(p) },
    ]);
  };

  on('project', render);
  on('page', render);
  on('pages', render);
  on('entry-change', () => {
    // update just titles without rebuilding focus-sensitive inputs elsewhere
    render();
  });
  render();
}

export function duplicatePage(p = currentPage()) {
  if (!p) return;
  const c = clone(p);
  c.id = uid('p');
  c.name = p.name + ' copy';
  c.slug = uniqueSlug(state.project, c.name);
  c.elements.forEach((el) => { el.id = uid('e'); });
  if (c.blog) c.blog.entries.forEach((e) => { e.id = uid('b'); });
  const i = state.project.pages.findIndex((x) => x.id === p.id);
  mutate((proj) => { proj.pages.splice(i + 1, 0, c); }, { events: ['pages'] });
  selectPage(c.id);
}

export async function deletePage(p = currentPage()) {
  if (!p || state.project.pages.length < 2) return;
  if (!(await confirmBox('Delete Page', `Delete the page “${p.name}”${p.type === 'blog' ? ' and all of its posts' : ''}? You can undo this.`, 'Delete', true))) return;
  const i = state.project.pages.findIndex((x) => x.id === p.id);
  mutate((proj) => { proj.pages.splice(i, 1); }, { events: ['pages'] });
  selectPage(state.project.pages[Math.max(0, i - 1)].id);
}

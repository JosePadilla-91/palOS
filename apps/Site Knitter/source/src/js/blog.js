// Blog entry editor (shown in place of the canvas when a post is selected)
import { state, currentPage, currentEntry, mutate, emit, selectPage } from './store.js';
import { themeById } from './themes.js';
import { fontStack } from './fonts.js';
import { assetUrl, importViaDialog, addFiles } from './media.js';
import { h, slugify, uid, today, debounce, hydrateAssets } from './util.js';
import { chooseAsset, promptText } from './dialogs.js';

let builtFor = null;

function dehydrate(html) {
  return String(html || '').replace(/(<img[^>]*?data-asset="[^"]+"[^>]*?)\ssrc="blob:[^"]*"/g, '$1');
}

export function newEntry(page) {
  const e = { id: uid('b'), title: 'Untitled Post', date: today(), slug: '', image: null, html: '<p>Start writing…</p>', draft: false };
  e.slug = uniqueEntrySlug(page, e.title, e.id);
  mutate(() => { page.blog.entries.unshift(e); }, { events: ['pages'] });
  selectPage(page.id, e.id);
}

export function uniqueEntrySlug(page, title, id) {
  const base = slugify(title);
  let s = base, n = 2;
  while (page.blog.entries.some((x) => x.id !== id && x.slug === s)) s = `${base}-${n++}`;
  return s;
}

export function renderEntryEditor(root, force = false) {
  const page = currentPage();
  const entry = currentEntry();
  const existing = root.querySelector('.entry-editor');
  if (!entry) { existing?.remove(); builtFor = null; return; }
  if (existing && builtFor === entry.id && !force) return;
  existing?.remove();
  builtFor = entry.id;

  const t = themeById(state.project.site.theme);
  const pageFill = (page.bg?.fill || t.page.fill);
  const bg = pageFill.type === 'color' ? pageFill.color : pageFill.type === 'gradient' ? `linear-gradient(${pageFill.angle}deg, ${pageFill.color}, ${pageFill.color2})` : '#fff';

  const commit = (fn, key) => mutate(fn, { key: key ? `entry-${entry.id}-${key}` : undefined, events: ['entry-change'] });
  const saveBody = debounce(() => commit(() => { entry.html = dehydrate(body.innerHTML); }, 'body'), 300);

  const title = h('input', {
    class: 'ee-title', value: entry.title, placeholder: 'Post title',
    style: { fontFamily: fontStack(t.fonts.heading), color: t.colors.heading },
    oninput: (e) => commit(() => {
      entry.title = e.target.value;
      if (!entry.slugLocked) entry.slug = uniqueEntrySlug(page, entry.title || 'post', entry.id);
    }, 'title'),
    onchange: () => emit('pages'),
  });
  const date = h('input', { type: 'date', value: entry.date, onchange: (e) => commit(() => { entry.date = e.target.value; }), class: 'ee-date' });
  const draft = h('label', { class: 'ee-check' },
    h('input', { type: 'checkbox', checked: !!entry.draft, onchange: (e) => commit(() => { entry.draft = e.target.checked; }) }), ' Draft (not published)');

  const hero = h('div', { class: 'ee-hero' + (entry.image ? '' : ' empty') });
  const drawHero = () => {
    hero.innerHTML = '';
    hero.className = 'ee-hero' + (entry.image ? '' : ' empty');
    if (entry.image) {
      hero.append(h('img', { src: assetUrl(entry.image) }),
        h('div', { class: 'ee-hero-tools' },
          h('button', { class: 'btn small', onclick: pickHero }, 'Replace'),
          h('button', { class: 'btn small', onclick: () => { commit(() => { entry.image = null; }); drawHero(); } }, 'Remove')));
    } else {
      hero.append(h('button', { class: 'btn', onclick: pickHero }, '+ Add a featured photo'), h('span', { class: 'muted' }, 'or drop one here'));
    }
  };
  const pickHero = async () => {
    const id = await chooseAsset('image');
    if (id) { commit(() => { entry.image = id; }); drawHero(); }
  };
  hero.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); hero.classList.add('over'); });
  hero.addEventListener('dragleave', () => hero.classList.remove('over'));
  hero.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); hero.classList.remove('over');
    let id = e.dataTransfer.getData('application/x-ws-asset');
    if (!id && e.dataTransfer.files.length) id = (await addFiles([...e.dataTransfer.files]))[0];
    if (id) { commit(() => { entry.image = id; }); drawHero(); }
  });
  drawHero();

  const body = h('div', {
    class: 'ee-body', contentEditable: 'true', spellcheck: true,
    style: { fontFamily: fontStack(t.fonts.body), color: t.colors.text },
    html: hydrateAssets(entry.html, assetUrl),
    oninput: saveBody,
    onpaste: (e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); },
  });
  body.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
  body.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation();
    let id = e.dataTransfer.getData('application/x-ws-asset');
    if (!id && e.dataTransfer.files.length) id = (await addFiles([...e.dataTransfer.files]))[0];
    if (id) insertImage(id);
  });

  const insertImage = (id) => {
    body.focus();
    document.execCommand('insertHTML', false, `<p><img data-asset="${id}" src="${assetUrl(id)}" alt=""></p>`);
    saveBody();
  };
  const cmd = (c, v) => (e) => { e.preventDefault(); body.focus(); document.execCommand(c, false, v); saveBody(); };
  const toolbar = h('div', { class: 'ee-toolbar' },
    h('select', { onchange: (e) => { body.focus(); document.execCommand('formatBlock', false, e.target.value); e.target.value = ''; saveBody(); } },
      h('option', { value: '' }, 'Paragraph style'), h('option', { value: 'p' }, 'Body'), h('option', { value: 'h2' }, 'Heading'), h('option', { value: 'h3' }, 'Subheading'), h('option', { value: 'blockquote' }, 'Quote')),
    h('button', { onmousedown: cmd('bold'), title: 'Bold' }, h('b', {}, 'B')),
    h('button', { onmousedown: cmd('italic'), title: 'Italic' }, h('i', {}, 'I')),
    h('button', { onmousedown: cmd('underline'), title: 'Underline' }, h('u', {}, 'U')),
    h('button', { onmousedown: cmd('insertUnorderedList'), title: 'Bulleted list' }, '•≡'),
    h('button', { onmousedown: cmd('insertOrderedList'), title: 'Numbered list' }, '1.'),
    h('button', {
      title: 'Link', onmousedown: async (e) => {
        e.preventDefault();
        const sel = window.getSelection();
        const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
        const url = await promptText('Link to', 'https://');
        if (!url) return;
        body.focus();
        if (range) { sel.removeAllRanges(); sel.addRange(range); }
        document.execCommand('createLink', false, url);
        saveBody();
      },
    }, '🔗'),
    h('button', {
      title: 'Insert photo', onmousedown: async (e) => {
        e.preventDefault();
        const sel = window.getSelection();
        const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
        const id = await chooseAsset('image');
        if (!id) return;
        body.focus();
        if (range) { sel.removeAllRanges(); sel.addRange(range); }
        insertImage(id);
      },
    }, '🖼 Photo'),
  );

  const back = h('button', { class: 'btn small ghost', onclick: () => selectPage(page.id, null) }, `‹ Back to “${page.name}” page`);
  const slugInfo = h('span', { class: 'muted ee-slug' }, `${page.slug}/${entry.slug}.html`);

  const ed = h('div', { class: 'entry-editor' },
    h('div', { class: 'ee-top' }, back, slugInfo),
    h('div', { class: 'ee-paper', style: { background: bg } },
      h('div', { class: 'ee-meta' }, date, draft),
      title, hero, toolbar, body));
  root.append(ed);
}

export async function importHero() { return importViaDialog('image'); }

// Turns a project into a static website: HTML pages, CSS, JS, media, fonts, RSS, sitemap.
import { renderElement, pageCSS } from './render.js';
import { themeById } from './themes.js';
import { SITE_CSS, SITE_JS } from './runtime.js';
import { FONTS, fontFiles, fontFaceCSS } from './fonts.js';
import { clipDefsSVG } from './shapes.js';
import { assetBlob } from './media.js';
import { esc, slugify, stripHtml } from './util.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv', 'video/quicktime': 'mov', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mp4': 'm4a', 'audio/flac': 'flac', 'image/x-icon': 'ico' };

export function pageFile(project, page) {
  return project.pages[0]?.id === page.id ? 'index.html' : `${page.slug || slugify(page.name)}.html`;
}
export function entryFile(blogPage, entry) {
  return `${blogPage.slug}/${entry.slug || slugify(entry.title)}.html`;
}

/**
 * Build every file of the site.
 * opts.onProgress(msg)
 * returns { files: [{path, data}], startPage }
 */
export async function buildSite(project, opts = {}) {
  const progress = opts.onProgress || (() => {});
  const site = project.site;
  const theme = themeById(site.theme);
  const files = [];
  const W = site.width || 980;

  // ---- media planning (resized variants are generated after rendering)
  const mediaJobs = new Map(); // path -> {id, width|null}
  const baseNames = new Map();
  const baseName = (id) => {
    if (!baseNames.has(id)) {
      const meta = project.assets[id];
      const stem = slugify((meta?.name || 'file').replace(/\.[^.]+$/, '')).slice(0, 40) || 'file';
      baseNames.set(id, `${stem}-${id.slice(1, 7)}`);
    }
    return baseNames.get(id);
  };
  const assetPath = (id, displayW) => {
    const meta = project.assets[id];
    if (!meta) return '';
    const ext = EXT[meta.mime] || 'bin';
    const resizable = meta.kind === 'image' && /^(image\/jpeg|image\/png|image\/webp)$/.test(meta.mime) && meta.w;
    if (resizable && displayW && opts.optimizeImages !== false) {
      const target = Math.min(meta.w, Math.ceil((displayW * 2) / 200) * 200);
      if (target < meta.w * 0.9) {
        const p = `assets/media/${baseName(id)}-${target}w.${ext}`;
        mediaJobs.set(p, { id, width: target });
        return p;
      }
    }
    const p = `assets/media/${baseName(id)}.${ext}`;
    mediaJobs.set(p, { id, width: null });
    return p;
  };

  const blogPages = project.pages.filter((p) => p.type === 'blog');

  const makeCtx = (page, root, extra = {}) => ({
    mode: 'export',
    project,
    page,
    root,
    asset: (id, w) => (id ? root + assetPath(id, w) : ''),
    href: (pid) => {
      const p = project.pages.find((x) => x.id === pid);
      return p ? root + pageFile(project, p) : root + 'index.html';
    },
    entryHref: (bp, e) => root + entryFile(bp, e),
    feedHref: () => {
      const bp = page.type === 'blog' ? page : blogPages[0];
      return bp ? `${root}${bp.slug}/feed.xml` : '#';
    },
    ...extra,
  });

  // ---- fonts used anywhere
  const docJSON = JSON.stringify({ pages: project.pages, site });
  const usedFonts = FONTS.filter((f) => !f.system && docJSON.includes(f.name)).map((f) => f.name);
  const fontCSS = fontFaceCSS(usedFonts, (ff) => `../fonts/${ff.file}`);

  files.push({ path: 'assets/css/site.css', data: `${fontCSS}\n${SITE_CSS}` });
  files.push({ path: 'assets/js/site.js', data: SITE_JS });

  const faviconPath = site.favicon ? assetPath(site.favicon, 64) : '';

  // ---- page renderer
  const renderPage = (page, { root = '', entry = null, entryNav = null, outPath }) => {
    const ctx = makeCtx(page, root, { entry, entryNav });
    const pc = pageCSS(page, site, theme, ctx);
    let css = `body.ws-body{${pc.body}}\n.ws-page{${pc.page}}\n:root{--ws-margin:${pc.margin}px}\n`;
    let html = '';
    for (const el of page.elements) {
      if (el.hidden) continue;
      const r = renderElement(el, ctx);
      css += r.css + '\n';
      html += r.html + '\n';
    }
    const title = entry
      ? `${entry.title} — ${site.name}`
      : page.title || (project.pages[0].id === page.id ? site.name : `${page.name} — ${site.name}`);
    const description = entry ? stripHtml(entry.html).slice(0, 160) : page.description || site.description || '';
    const firstImg = entry?.image || page.elements.find((e) => e.type === 'image' && e.asset)?.asset;
    const abs = site.baseUrl ? site.baseUrl.replace(/\/?$/, '/') : '';
    const head = [
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${esc(title)}</title>`,
      description ? `<meta name="description" content="${esc(description)}">` : '',
      site.author ? `<meta name="author" content="${esc(site.author)}">` : '',
      '<meta name="generator" content="Site Knitter">',
      `<meta property="og:title" content="${esc(title)}">`,
      description ? `<meta property="og:description" content="${esc(description)}">` : '',
      `<meta property="og:type" content="${entry ? 'article' : 'website'}">`,
      abs ? `<link rel="canonical" href="${esc(abs + outPath)}">` : '',
      abs && firstImg ? `<meta property="og:image" content="${esc(abs + assetPath(firstImg, 1200))}">` : '',
      faviconPath ? `<link rel="icon" href="${esc(root + faviconPath)}">` : '',
      blogPages.length ? `<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="${esc(root + blogPages[0].slug + '/feed.xml')}">` : '',
      `<link rel="stylesheet" href="${root}assets/css/site.css">`,
      `<style>\n${css}</style>`,
      site.headCode || '',
      page.headCode || '',
    ].filter(Boolean).join('\n  ');
    return `<!doctype html>
<html lang="${esc(site.language || 'en')}">
<head>
  ${head}
</head>
<body class="ws-body ws-page-${esc(page.slug)}">
${clipDefsSVG()}
<div class="ws-stage">
<main class="ws-page" data-w="${W}" data-h="${page.height}">
${html}</main>
</div>
<script src="${root}assets/js/site.js"></script>
</body>
</html>
`;
  };

  // ---- pages
  for (const page of project.pages) {
    progress(`Building ${page.name}…`);
    const out = pageFile(project, page);
    files.push({ path: out, data: renderPage(page, { outPath: out }) });

    if (page.type === 'blog') {
      const entries = [...page.blog.entries].filter((e) => !e.draft).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      entries.forEach((e, i) => {
        const p = entryFile(page, e);
        const newer = entries[i - 1], older = entries[i + 1];
        const entryNav = {
          index: '../' + pageFile(project, page),
          prev: older ? { href: '../' + entryFile(page, older), title: older.title } : null,
          next: newer ? { href: '../' + entryFile(page, newer), title: newer.title } : null,
        };
        files.push({ path: p, data: renderPage(page, { root: '../', entry: e, entryNav, outPath: p }) });
      });
      files.push({ path: `${page.slug}/feed.xml`, data: rss(project, page, entries, makeCtx(page, '')) });
    }
  }

  // ---- sitemap / robots
  if (site.baseUrl) {
    const base = site.baseUrl.replace(/\/?$/, '/');
    const urls = files.filter((f) => f.path.endsWith('.html')).map((f) => `  <url><loc>${esc(base + f.path)}</loc></url>`).join('\n');
    files.push({ path: 'sitemap.xml', data: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` });
    files.push({ path: 'robots.txt', data: `User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n` });
  }

  // ---- fonts
  for (const name of usedFonts) {
    for (const ff of fontFiles(name)) {
      try {
        files.push({ path: `assets/fonts/${ff.file}`, data: await window.ws.readFont(ff.pkg, ff.file) });
      } catch (e) { console.warn('font missing', ff.file); }
    }
  }

  // ---- media
  let n = 0;
  for (const [p, job] of mediaJobs) {
    n++;
    progress(`Optimizing media ${n}/${mediaJobs.size}…`);
    const blob = assetBlob(job.id);
    if (!blob) continue;
    let out = blob;
    if (job.width) {
      try { out = await resizeImage(blob, job.width, project.assets[job.id].mime); } catch (e) { console.warn('resize failed', e); }
    }
    files.push({ path: p, data: new Uint8Array(await out.arrayBuffer()) });
  }

  progress('Done');
  return { files, startPage: opts.startPage ? opts.startPage : 'index.html' };
}

async function resizeImage(blob, width, mime) {
  const bmp = await createImageBitmap(blob);
  const height = Math.round((bmp.height * width) / bmp.width);
  bmp.close();
  const scaled = await createImageBitmap(blob, { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' });
  const c = new OffscreenCanvas(width, height);
  c.getContext('2d').drawImage(scaled, 0, 0);
  scaled.close();
  return c.convertToBlob({ type: mime === 'image/png' ? 'image/png' : mime === 'image/webp' ? 'image/webp' : 'image/jpeg', quality: 0.86 });
}

function rss(project, page, entries, ctx) {
  const site = project.site;
  const base = (site.baseUrl || '').replace(/\/?$/, '/');
  const items = entries.slice(0, 30).map((e) => {
    const link = base + entryFile(page, e);
    const d = new Date((e.date || '1970-01-01') + 'T12:00:00Z');
    return `  <item>
    <title>${esc(e.title)}</title>
    <link>${esc(link)}</link>
    <guid isPermaLink="${base ? 'true' : 'false'}">${esc(base ? link : e.id)}</guid>
    <pubDate>${d.toUTCString()}</pubDate>
    <description>${esc(stripHtml(e.html).slice(0, 400))}</description>
  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${esc(site.name)} — ${esc(page.name)}</title>
  <link>${esc(base + pageFile(project, page))}</link>
  <description>${esc(site.description || page.description || site.name)}</description>
  <language>${esc(site.language || 'en')}</language>
  <generator>Site Knitter</generator>
${items}
</channel>
</rss>
`;
}

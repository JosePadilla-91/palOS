/* Chancery Press - data: sheet sizes, fonts, object defaults, templates, modules */
window.P = window.P || {};
(function () {
  const IN = 96; // px per inch
  P.IN = IN;
  let _id = 0;
  P.uid = (p) => (p || 'o') + Date.now().toString(36) + (++_id).toString(36) + Math.floor(Math.random() * 1e4).toString(36);

  P.UNITS = { in: 1, mm: 1 / 25.4, cm: 1 / 2.54, pt: 1 / 72, px: 1 / 96 };
  P.toIn = (v, u) => v * (P.UNITS[u] || 1);
  P.fromIn = (v, u) => v / (P.UNITS[u] || 1);

  P.SIZES = [
    { group: 'Paper', items: [
      ['Letter', 8.5, 11], ['Legal', 8.5, 14], ['Tabloid / Ledger', 11, 17], ['A3', 11.69, 16.54], ['A4', 8.27, 11.69],
      ['A5', 5.83, 8.27], ['A6', 4.13, 5.83], ['Half Letter', 5.5, 8.5], ['Executive', 7.25, 10.5], ['B5', 6.93, 9.84] ] },
    { group: 'Newspaper', items: [
      ['Broadsheet', 12, 22.75], ['Berliner', 12.4, 18.5], ['Newspaper Tabloid', 11, 14], ['Compact', 10, 13] ] },
    { group: 'Poster', items: [
      ['Poster 11 x 17', 11, 17], ['Poster 18 x 24', 18, 24], ['Poster 24 x 36', 24, 36], ['Movie one-sheet', 27, 40], ['A2', 16.54, 23.39], ['A1', 23.39, 33.11] ] },
    { group: 'Cards & small', items: [
      ['Business card', 3.5, 2], ['Postcard', 6, 4], ['Greeting card', 5, 7], ['Invitation', 5, 7], ['Name badge', 4, 3], ['Bookmark', 2, 6], ['DL / Slim', 3.87, 8.27] ] }
  ];

  P.FONTS = {
    Serif: 'Georgia, "Liberation Serif", "Times New Roman", "DejaVu Serif", serif',
    Sans: '"Helvetica Neue", Arial, "Liberation Sans", "Noto Sans", "DejaVu Sans", sans-serif',
    Display: '"Playfair Display", "Bodoni MT", Didot, Georgia, "Liberation Serif", serif',
    Slab: 'Rockwell, "Roboto Slab", "DejaVu Serif", Georgia, serif',
    Blackletter: '"UnifrakturCook", "Old English Text MT", "Blackadder ITC", "Liberation Serif", Georgia, serif',
    Script: '"Z003", "URW Chancery L", "Brush Script MT", "Lucida Handwriting", cursive',
    Condensed: '"Oswald", "Arial Narrow", "Liberation Sans Narrow", "DejaVu Sans Condensed", sans-serif',
    Mono: '"DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace'
  };
  P.fontStack = (n) => P.FONTS[n] || `"${n}", "Liberation Serif", serif`;

  P.COLORS = ['#111111', '#ffffff', '#b5651d', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#1abc9c', '#2980b9', '#8e44ad', '#7f8c8d', '#f5ecd7'];

  P.DEF = {
    text: { font: 'Serif', size: 12, color: '#111111', bold: false, italic: false, underline: false, align: 'left', valign: 'top', lh: 1.25, ls: 0, fill: '', fill2: '', gdir: 90, stroke: '', strokeW: 0, bstyle: 'solid', radius: 0, pad: 4, cols: 1, gap: 14, rule: false, fit: false, upper: false, html: '', tstroke: 0, tstrokeC: '#000000', tshadow: false },
    story: { storyId: '', cols: 1, gap: 14, rule: false, pad: 4, fill: '', fill2: '', gdir: 90, stroke: '', strokeW: 0, bstyle: 'solid', radius: 0 },
    shape: { kind: 'rect', fill: '#b5651d', fill2: '', gdir: 90, stroke: '', strokeW: 0, dash: '', radius: 0 },
    image: { asset: '', fit: 'cover', filter: '', radius: 0, stroke: '', strokeW: 0, flip: false, zoom: 1, px: 50, py: 50 },
    table: { rows: 3, cols: 3, cells: null, font: 'Sans', size: 11, color: '#111111', headFill: '#222222', headColor: '#ffffff', border: '#333333', head: true }
  };
  P.STORY_DEF = { text: '', font: 'Serif', size: 9.5, color: '#111111', align: 'justify', lh: 1.3, ls: 0, hyph: true, dropcap: false, indent: true, pspace: 0, chain: [] };

  P.mk = (type, o) => Object.assign({ id: P.uid(), type, x: 0, y: 0, w: 100, h: 60, rot: 0, locked: false, group: null, allPages: false, opacity: 1, wrap: false, wpad: 8 }, P.DEF[type] || {}, o || {});

  const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');
  P.lorem = (n, paras) => {
    let out = [], k = 0;
    for (let p = 0; p < (paras || 1); p++) {
      const w = [];
      const len = Math.max(12, Math.floor(n * 0.62 / (paras || 1)));
      for (let i = 0; i < len; i++) w.push(LOREM[(k++ * 7 + p * 3) % LOREM.length]);
      let s = w.join(' ');
      out.push(s.charAt(0).toUpperCase() + s.slice(1) + '.');
    }
    return out.join('\n');
  };

  // ---------- builders (inches in, px out) ----------
  const u = (v) => v * IN;
  function Builder() {
    const b = { objs: [], stories: {},
      text(x, y, w, h, html, o) { const t = P.mk('text', Object.assign({ x: u(x), y: u(y), w: u(w), h: u(h), html: String(html).replace(/\n/g, '<br>') }, o)); b.objs.push(t); return t; },
      story(x, y, w, h, text, o, so) {
        const sid = P.uid('s');
        const f = P.mk('story', Object.assign({ x: u(x), y: u(y), w: u(w), h: u(h), storyId: sid }, o));
        b.stories[sid] = Object.assign({}, P.STORY_DEF, { text, chain: [f.id] }, so);
        b.objs.push(f); return f;
      },
      frame(storyId, x, y, w, h, o) { // extra linked frame
        const f = P.mk('story', Object.assign({ x: u(x), y: u(y), w: u(w), h: u(h), storyId }, o));
        b.stories[storyId].chain.push(f.id); b.objs.push(f); return f;
      },
      shape(kind, x, y, w, h, o) { const s = P.mk('shape', Object.assign({ kind, x: u(x), y: u(y), w: u(w), h: u(h) }, o)); b.objs.push(s); return s; },
      line(x, y, w, thick, o) { const s = P.mk('shape', Object.assign({ kind: 'line', x: u(x), y: u(y), w: u(w), h: Math.max(2, thick || 1), stroke: '#111111', strokeW: thick || 1, fill: '' }, o)); b.objs.push(s); return s; },
      image(x, y, w, h, o) { const s = P.mk('image', Object.assign({ x: u(x), y: u(y), w: u(w), h: u(h) }, o)); b.objs.push(s); return s; },
      table(x, y, w, h, o) { const s = P.mk('table', Object.assign({ x: u(x), y: u(y), w: u(w), h: u(h) }, o)); b.objs.push(s); return s; }
    };
    return b;
  }
  P.Builder = Builder;

  P.newSetup = (o) => Object.assign({ margins: { t: 0.5, r: 0.5, b: 0.5, l: 0.5 }, cols: 1, gutter: 0.2, grid: 0.25, showGrid: false, snap: true, bleed: 0, marks: false, units: 'in', divide: { v: [], h: [], safe: 0.25 }, bg: '#ffffff', guides: [], bleed: 0, marks: false }, o || {});

  const blankDoc = (w, h, setup) => ({ v: 1, w, h, setup: P.newSetup(setup), pages: [{ id: P.uid('p'), objs: [] }], stories: {}, assets: {} });
  P.blankDoc = blankDoc;

  const fromBuilder = (doc, b, pageIdx) => { doc.pages[pageIdx || 0].objs.push(...b.objs); Object.assign(doc.stories, b.stories); return doc; };

  // ---------- templates ----------
  P.TEMPLATES = [
    { id: 'blank', name: 'Blank page', sub: 'Letter, portrait', build() { return blankDoc(8.5, 11); } },

    { id: 'poster', name: 'Event poster', sub: '18 x 24 in', build() {
      const d = blankDoc(18, 24, { margins: { t: 1, r: 1, b: 1, l: 1 }, grid: 0.5, bg: '#f5ecd7' }), b = Builder();
      b.shape('rect', 0, 0, 18, 24, { fill: '#f5ecd7' });
      b.shape('rect', 0.6, 0.6, 16.8, 22.8, { fill: '', stroke: '#8a4b14', strokeW: 6 });
      b.text(1.2, 1.4, 15.6, 2, 'YOU ARE INVITED', { font: 'Condensed', size: 48, bold: true, align: 'center', color: '#8a4b14', ls: 8 });
      b.text(1.2, 3.4, 15.6, 5.6, 'Summer Block Party', { font: 'Display', size: 150, bold: true, italic: true, align: 'center', valign: 'middle', color: '#1b1b1b', fit: true });
      b.image(2.5, 9.6, 13, 7.4, { stroke: '#1b1b1b', strokeW: 5 });
      b.text(1.2, 17.6, 15.6, 1.8, 'Saturday, July 18  -  4 PM until late', { font: 'Condensed', size: 54, align: 'center', color: '#b5651d', bold: true });
      b.text(1.2, 19.6, 15.6, 2.6, 'Food trucks, live music, games for kids\nOak Street Park  -  free to everyone', { font: 'Serif', size: 34, align: 'center', color: '#333333', lh: 1.4 });
      return fromBuilder(d, b);
    } },

    { id: 'flyer', name: 'Flyer with tear-offs', sub: 'Letter, portrait', build() {
      const d = blankDoc(8.5, 11, { margins: { t: .4, r: .4, b: .4, l: .4 } }), b = Builder();
      b.text(.5, .5, 7.5, 1.6, 'GARAGE SALE', { font: 'Condensed', size: 90, bold: true, align: 'center', color: '#c0392b', fit: true });
      b.line(.5, 2.2, 7.5, 5, { stroke: '#111111' });
      b.image(1.5, 2.5, 5.5, 3.6, {});
      b.text(.5, 6.3, 7.5, 1.7, 'Saturday 8am - 2pm\n412 Maple Lane', { font: 'Sans', size: 34, align: 'center', bold: true, lh: 1.3 });
      b.text(.5, 8.0, 7.5, .8, 'Furniture - tools - books - toys - plants', { font: 'Serif', size: 20, italic: true, align: 'center' });
      for (let i = 0; i < 7; i++) {
        const t = b.text(.5 + i * (7.5 / 7), 8.9, 1.07, 1.7, 'Garage Sale\nSat 8-2\n412 Maple Ln', { font: 'Sans', size: 9, align: 'center', valign: 'middle', stroke: '#888888', strokeW: 1, pad: 4 });
      }
      b.text(.5, 8.75, 7.5, .2, 'cut along the dotted lines', { font: 'Sans', size: 7, align: 'center', color: '#888888' });
      return fromBuilder(d, b);
    } },

    { id: 'broadsheet', name: 'Broadsheet front page', sub: '12 x 22.75 in, 6 columns', build() {
      const d = blankDoc(12, 22.75, { margins: { t: .5, r: .5, b: .5, l: .5 }, cols: 6, gutter: .17, grid: .125 }), b = Builder();
      const L = .5, W = 11, cw = (W - 5 * .17) / 6, cx = (i) => L + i * (cw + .17), span = (n) => n * cw + (n - 1) * .17;
      b.text(L, .5, W, 1.3, 'The Daily Chronicle', { font: 'Blackletter', size: 72, align: 'center', valign: 'middle', color: '#111111', fit: true });
      b.line(L, 1.9, W, 3); b.line(L, 1.98, W, .75);
      b.text(L, 2.05, W, .3, 'VOL. 1  -  NO. 1                      {date}                      PRICE ONE DOLLAR', { font: 'Sans', size: 8, align: 'center', bold: true, ls: 1 });
      b.line(L, 2.4, W, .75);
      b.text(L, 2.55, span(4), 1.3, 'Headline Goes Here and Runs Across Four Columns', { font: 'Display', size: 40, bold: true, lh: 1.05, align: 'left' });
      b.text(L, 3.9, span(4), .3, 'By STAFF REPORTER', { font: 'Sans', size: 8, bold: true, ls: 1, color: '#555555' });
      const s1 = b.story(L, 4.25, span(4), 4.6, P.lorem(520, 6), { cols: 4, gap: 12, rule: true }, { dropcap: true });
      b.image(cx(4), 2.55, span(2), 2.6, {});
      b.text(cx(4), 5.2, span(2), .45, 'Photo caption goes here, describing the picture.', { font: 'Sans', size: 7.5, italic: true, color: '#444444' });
      b.text(cx(4), 5.7, span(2), .8, 'Second Story Headline', { font: 'Display', size: 20, bold: true, lh: 1.05 });
      b.story(cx(4), 6.55, span(2), 2.3, P.lorem(180, 2), { cols: 1 });
      b.line(L, 9.05, W, 1);
      b.text(L, 9.2, span(3), 1, 'Another Big Story Heads Here', { font: 'Display', size: 26, bold: true, lh: 1.05 });
      const s2 = b.story(L, 10.25, span(3), 5.5, P.lorem(420, 5), { cols: 3, gap: 12, rule: true });
      b.shape('rect', cx(3), 9.2, span(3), 3.2, { fill: '#f1ede4', stroke: '#111111', strokeW: 1.5 });
      b.text(cx(3) + .1, 9.3, span(3) - .2, .35, 'INSIDE TODAY', { font: 'Condensed', size: 14, bold: true, ls: 2, align: 'center' });
      b.text(cx(3) + .1, 9.75, span(3) - .2, 2.5, 'Sports ................ B1\nBusiness ............ C1\nOpinion ................ A6\nObituaries ........... D2\nClassifieds ......... D4\nWeather ................ A2', { font: 'Serif', size: 11, lh: 1.6 });
      b.text(cx(3), 12.7, span(3), .8, 'Third Story Headline in Two Lines', { font: 'Display', size: 20, bold: true, lh: 1.05 });
      b.story(cx(3), 13.55, span(3), 2.2, P.lorem(200, 2), { cols: 2, gap: 12, rule: true });
      b.line(L, 15.95, W, 1);
      b.shape('rect', L, 16.15, span(2), 2.4, { fill: '', stroke: '#111111', strokeW: 1 });
      b.text(L, 16.15, span(2), 2.4, 'AD', { font: 'Condensed', size: 30, align: 'center', valign: 'middle', color: '#bbbbbb' });
      b.text(cx(2), 16.15, span(4), .9, 'Feature Story Headline', { font: 'Display', size: 24, bold: true });
      b.story(cx(2), 17.1, span(4), 3.4, P.lorem(360, 4), { cols: 2, gap: 12, rule: true });
      b.line(L, 20.75, W, 1);
      b.text(L, 20.85, W, 1.4, 'More stories continue on the following pages. Add your own columns by dragging story frames from the Modules tab.', { font: 'Serif', size: 10, italic: true, align: 'center' });
      const doc = fromBuilder(d, b);
      return doc;
    } },

    { id: 'tabloid', name: 'Tabloid front', sub: '11 x 14 in, big headline', build() {
      const d = blankDoc(11, 14, { margins: { t: .4, r: .4, b: .4, l: .4 }, cols: 4, gutter: .15 }), b = Builder();
      b.shape('rect', .4, .4, 10.2, 1.2, { fill: '#c0392b' });
      b.text(.4, .4, 10.2, 1.2, 'THE EVENING STAR', { font: 'Display', size: 52, bold: true, color: '#ffffff', align: 'center', valign: 'middle', fit: true });
      b.image(.4, 1.8, 10.2, 6.4, {});
      b.text(.4, 8.3, 10.2, 2.3, 'SHOCKING HEADLINE THAT FILLS THE PAGE', { font: 'Condensed', size: 90, bold: true, lh: .95, fit: true, upper: true });
      b.text(.4, 10.7, 10.2, .4, 'Subhead explains the story in one punchy line - pages 2, 3 and 4', { font: 'Sans', size: 14, bold: true, color: '#c0392b' });
      b.story(.4, 11.2, 10.2, 2.4, P.lorem(260, 3), { cols: 4, gap: 11, rule: true });
      return fromBuilder(d, b);
    } },

    { id: 'inside', name: 'Inside page (ads + stories)', sub: '12 x 22.75 in, 6 columns', build() {
      const d = blankDoc(12, 22.75, { margins: { t: .5, r: .5, b: .6, l: .5 }, cols: 6, gutter: .17, grid: .125 }), b = Builder();
      const L = .5, W = 11, cw = (W - 5 * .17) / 6, cx = (i) => L + i * (cw + .17), span = (n) => n * cw + (n - 1) * .17;
      b.text(L, .5, W, .3, 'A4   -   THE DAILY CHRONICLE   -   {date}', { font: 'Sans', size: 8, bold: true, ls: 1 });
      b.line(L, .85, W, 1.5);
      b.text(L, 1.0, span(3), .9, 'Page headline for the top story', { font: 'Display', size: 28, bold: true, lh: 1.05 });
      const s = b.story(L, 2.0, span(3), 6.2, P.lorem(560, 6), { cols: 3, gap: 12, rule: true });
      [[3, 1.0, 3, 3.5], [3, 4.7, 3, 3.5]].forEach(([c, y, n, h], i) => {
        b.shape('rect', cx(c), y, span(n), h, { fill: '#ffffff', stroke: '#111111', strokeW: 1 });
        b.text(cx(c), y, span(n), h, 'ADVERTISEMENT', { font: 'Condensed', size: 18, align: 'center', valign: 'middle', color: '#bbbbbb', ls: 3 });
      });
      b.line(L, 8.5, W, 1);
      b.text(L, 8.65, span(2), 1.2, 'Left column story heading', { font: 'Display', size: 20, bold: true, lh: 1.05 });
      b.story(L, 9.9, span(2), 5.5, P.lorem(220, 3), {});
      b.shape('rect', cx(2), 8.65, span(4), 6.75, { fill: '#ffffff', stroke: '#111111', strokeW: 1 });
      b.text(cx(2), 8.65, span(4), 6.75, 'FULL-WIDTH AD   4 columns x 6.75 in', { font: 'Condensed', size: 24, align: 'center', valign: 'middle', color: '#bbbbbb', ls: 2 });
      b.line(L, 15.6, W, 1);
      b.text(L, 15.75, span(3), .9, 'Opinion: write your column title here', { font: 'Display', size: 22, bold: true, italic: true, lh: 1.05 });
      b.story(L, 16.7, span(3), 4.8, P.lorem(300, 3), { cols: 3, gap: 12, rule: true });
      b.shape('rect', cx(3), 15.75, span(3), 5.75, { fill: '#f1ede4', stroke: '#111111', strokeW: 1 });
      b.text(cx(3) + .1, 15.85, span(3) - .2, .4, 'LOCAL EVENTS', { font: 'Condensed', size: 15, bold: true, ls: 2, align: 'center' });
      b.text(cx(3) + .15, 16.35, span(3) - .3, 5, 'Mon - Town council meets, 7 PM\nWed - Farmers market, 8 AM\nFri - Movie night in the park\nSat - Library book sale\nSun - Community brunch', { font: 'Serif', size: 11, lh: 1.7 });
      b.text(L, 21.9, W, .3, '{page}', { font: 'Sans', size: 9, align: 'center', bold: true });
      return fromBuilder(d, b);
    } },

    { id: 'trifold', name: 'Tri-fold brochure', sub: 'Letter landscape, 3 panels', build() {
      const d = blankDoc(11, 8.5, { margins: { t: .4, r: .4, b: .4, l: .4 }, divide: { v: [1 / 3, 2 / 3], h: [], safe: .3 } }), b = Builder(), pw = 11 / 3;
      b.shape('rect', 0, 0, pw, 8.5, { fill: '#2c3e50' });
      b.text(.3, 2.8, pw - .6, 2, 'Your Business Name', { font: 'Display', size: 40, bold: true, color: '#ffffff', align: 'center', valign: 'middle' });
      b.text(.3, 5, pw - .6, .8, 'a short, friendly tagline', { font: 'Serif', size: 15, italic: true, color: '#f5ecd7', align: 'center' });
      b.text(pw + .3, .5, pw - .6, .8, 'What we do', { font: 'Display', size: 26, bold: true, color: '#2c3e50' });
      b.story(pw + .3, 1.4, pw - .6, 3.4, P.lorem(120, 2), { }, { size: 11, align: 'left' });
      b.image(pw + .3, 5, pw - .6, 2.9, {});
      b.text(2 * pw + .3, .5, pw - .6, .8, 'Get in touch', { font: 'Display', size: 26, bold: true, color: '#2c3e50' });
      b.text(2 * pw + .3, 1.5, pw - .6, 3, 'Phone: (555) 010-0000\nEmail: hello@example.com\nWeb: www.example.com\n\n123 Main Street\nYour Town', { font: 'Sans', size: 13, lh: 1.6 });
      b.shape('rect', 2 * pw + .3, 6.2, pw - .6, 1.7, { fill: '#b5651d', radius: 12 });
      b.text(2 * pw + .3, 6.2, pw - .6, 1.7, 'Visit us this week!', { font: 'Display', size: 22, bold: true, color: '#ffffff', align: 'center', valign: 'middle' });
      return fromBuilder(d, b);
    } },

    { id: 'program', name: 'Half-fold pamphlet', sub: 'Letter landscape, 2 panels', build() {
      const d = blankDoc(11, 8.5, { margins: { t: .5, r: .5, b: .5, l: .5 }, divide: { v: [.5], h: [], safe: .35 } }), b = Builder();
      b.text(.6, 1.2, 4.3, 3, 'Spring Concert\nProgram', { font: 'Display', size: 44, bold: true, align: 'center', valign: 'middle', lh: 1.1 });
      b.line(1.3, 4.4, 2.9, 3, { stroke: '#b5651d' });
      b.text(.6, 4.7, 4.3, 1, 'Riverside Community Choir\nApril 12, 7:00 PM', { font: 'Serif', size: 16, italic: true, align: 'center', lh: 1.5 });
      b.text(6.0, .8, 4.4, .7, 'Tonight\'s program', { font: 'Display', size: 24, bold: true });
      b.text(6.0, 1.7, 4.4, 5.8, '1. Opening piece .......... Choir\n2. A gentle song ....... Soloist\n3. Folk medley ......... Choir\n\nIntermission\n\n4. Showpiece ........... Choir\n5. Finale ................ Everyone', { font: 'Serif', size: 14, lh: 1.9 });
      return fromBuilder(d, b);
    } },

    { id: 'newsletter', name: 'Newsletter', sub: 'Letter, 3 columns', build() {
      const d = blankDoc(8.5, 11, { margins: { t: .5, r: .5, b: .5, l: .5 }, cols: 3, gutter: .25 }), b = Builder();
      b.shape('rect', .5, .5, 7.5, 1.4, { fill: '#1d3557' });
      b.text(.5, .5, 7.5, 1.4, 'The Neighborhood News', { font: 'Display', size: 40, bold: true, color: '#ffffff', align: 'center', valign: 'middle', fit: true });
      b.text(.5, 2.0, 7.5, .3, 'Issue 1   -   {date}', { font: 'Sans', size: 9, bold: true, ls: 1, align: 'center' });
      b.line(.5, 2.35, 7.5, 1.5);
      b.text(.5, 2.5, 7.5, .8, 'This month\'s big story', { font: 'Display', size: 28, bold: true });
      b.story(.5, 3.35, 7.5, 3.4, P.lorem(380, 4), { cols: 3, gap: 18, rule: true });
      b.text(.5, 7.0, 3.6, .5, 'Around town', { font: 'Display', size: 18, bold: true, color: '#1d3557' });
      b.story(.5, 7.55, 3.6, 3, P.lorem(130, 2), {});
      b.image(4.4, 7.0, 3.6, 2.2, {});
      b.text(4.4, 9.25, 3.6, 1.3, 'Photo caption goes here.', { font: 'Sans', size: 9, italic: true, color: '#555555' });
      return fromBuilder(d, b);
    } },

    { id: 'certificate', name: 'Certificate', sub: 'Letter landscape', build() {
      const d = blankDoc(11, 8.5, { margins: { t: .6, r: .6, b: .6, l: .6 }, bg: '#fffaf0' }), b = Builder();
      b.shape('rect', .35, .35, 10.3, 7.8, { fill: '', stroke: '#8a4b14', strokeW: 8 });
      b.shape('rect', .6, .6, 9.8, 7.3, { fill: '', stroke: '#b5651d', strokeW: 2 });
      b.text(1, 1.1, 9, 1, 'Certificate of Achievement', { font: 'Display', size: 46, bold: true, align: 'center', color: '#8a4b14' });
      b.text(1, 2.5, 9, .6, 'is proudly presented to', { font: 'Serif', size: 18, italic: true, align: 'center' });
      b.text(1, 3.2, 9, 1.4, 'Name Goes Here', { font: 'Script', size: 72, align: 'center', color: '#1b1b1b' });
      b.line(2.5, 4.7, 6, 2, { stroke: '#8a4b14' });
      b.text(1.5, 4.95, 8, 1.2, 'for outstanding effort, kindness and a great attitude all year long.', { font: 'Serif', size: 18, align: 'center', lh: 1.5 });
      b.line(1.5, 7.0, 3, 1.5); b.line(6.5, 7.0, 3, 1.5);
      b.text(1.5, 7.05, 3, .4, 'Signature', { font: 'Sans', size: 10, align: 'center', color: '#666666' });
      b.text(6.5, 7.05, 3, .4, 'Date', { font: 'Sans', size: 10, align: 'center', color: '#666666' });
      return fromBuilder(d, b);
    } },

    { id: 'bizcard', name: 'Business card', sub: '3.5 x 2 in', build() {
      const d = blankDoc(3.5, 2, { margins: { t: .15, r: .15, b: .15, l: .15 }, grid: .0625 }), b = Builder();
      b.shape('rect', 0, 0, .35, 2, { fill: '#b5651d' });
      b.text(.55, .25, 2.7, .5, 'Your Name', { font: 'Display', size: 20, bold: true });
      b.text(.55, .75, 2.7, .3, 'Title  -  Company', { font: 'Sans', size: 9, color: '#555555' });
      b.line(.55, 1.12, 2.7, 1, { stroke: '#b5651d' });
      b.text(.55, 1.2, 2.7, .65, '(555) 010-0000\nyou@example.com\nwww.example.com', { font: 'Sans', size: 8, lh: 1.4 });
      return fromBuilder(d, b);
    } },

    { id: 'postcard', name: 'Postcard / Invitation', sub: '6 x 4 in', build() {
      const d = blankDoc(6, 4, { margins: { t: .25, r: .25, b: .25, l: .25 }, bg: '#fdf3e1' }), b = Builder();
      b.shape('rect', .15, .15, 5.7, 3.7, { fill: '', stroke: '#b5651d', strokeW: 3 });
      b.text(.4, .5, 5.2, .9, 'Join us for dinner', { font: 'Script', size: 40, align: 'center', color: '#8a4b14' });
      b.text(.4, 1.6, 5.2, 1.8, 'Friday, June 5  -  6:30 PM\n88 Garden Road\nPlease let us know if you can make it', { font: 'Serif', size: 15, align: 'center', lh: 1.55 });
      return fromBuilder(d, b);
    } }
  ];

  // ---------- modules (newspaper building blocks) ----------
  // ctx: {cw: column width in, gut: gutter in, W: live width in}
  const colsW = (c, n) => n * c.cw + (n - 1) * c.gut;
  P.MODULES = [
    { cat: 'Newspaper', name: 'Masthead', sub: 'Nameplate, rules, date line', build(c) {
      const b = Builder(), W = c.W;
      b.text(0, 0, W, 1.2, 'The Daily Chronicle', { font: 'Blackletter', size: 64, align: 'center', valign: 'middle', fit: true });
      b.line(0, 1.3, W, 3); b.line(0, 1.38, W, .75);
      b.text(0, 1.45, W, .28, 'VOL. 1  -  NO. 1                      {date}                      PRICE ONE DOLLAR', { font: 'Sans', size: 8, bold: true, align: 'center', ls: 1 });
      b.line(0, 1.78, W, .75); return b; } },
    { cat: 'Newspaper', name: 'Headline + story (3 col)', sub: 'Kicker, headline, byline, flowing text', build(c) {
      const b = Builder(), w = colsW(c, 3);
      b.text(0, 0, w, .25, 'LOCAL NEWS', { font: 'Condensed', size: 9, bold: true, ls: 2, color: '#c0392b' });
      b.text(0, .25, w, 1.0, 'Headline for your story', { font: 'Display', size: 30, bold: true, lh: 1.05 });
      b.text(0, 1.3, w, .25, 'By STAFF WRITER', { font: 'Sans', size: 8, bold: true, ls: 1, color: '#555555' });
      b.story(0, 1.6, w, 3.2, P.lorem(300, 4), { cols: 3, gap: 12, rule: true }, { dropcap: true }); return b; } },
    { cat: 'Newspaper', name: 'Headline + story (1 col)', sub: 'Single-column story', build(c) {
      const b = Builder(), w = colsW(c, 1);
      b.text(0, 0, w, .8, 'Short headline here', { font: 'Display', size: 18, bold: true, lh: 1.05 });
      b.story(0, .85, w, 3, P.lorem(140, 2), {}); return b; } },
    { cat: 'Newspaper', name: 'Story frame (2 col)', sub: 'Empty flowing text, link to others', build(c) {
      const b = Builder(); b.story(0, 0, colsW(c, 2), 4, P.lorem(200, 2), { cols: 2, gap: 12, rule: true }); return b; } },
    { cat: 'Newspaper', name: 'Photo with caption', sub: 'Picture slot + caption + credit', build(c) {
      const b = Builder(), w = colsW(c, 2);
      b.image(0, 0, w, w * .68, {});
      b.text(0, w * .68 + .05, w, .5, 'Caption describing what is happening in the picture. (Photo by NAME)', { font: 'Sans', size: 7.5, italic: true, color: '#444444' }); return b; } },
    { cat: 'Newspaper', name: 'Pull quote', sub: 'Big quote between rules', build(c) {
      const b = Builder(), w = colsW(c, 2);
      b.line(0, 0, w, 2); b.text(0, .1, w, 1.3, '"A short and punchy quote that pulls the reader in."', { font: 'Display', size: 19, italic: true, align: 'center', valign: 'middle', lh: 1.15 }); b.line(0, 1.5, w, 2); return b; } },
    { cat: 'Newspaper', name: 'Sidebar box', sub: 'Shaded box with title and text', build(c) {
      const b = Builder(), w = colsW(c, 2);
      b.shape('rect', 0, 0, w, 3, { fill: '#f1ede4', stroke: '#111111', strokeW: 1.5 });
      b.text(.08, .06, w - .16, .35, 'AT A GLANCE', { font: 'Condensed', size: 13, bold: true, ls: 2, align: 'center' });
      b.story(.08, .5, w - .16, 2.4, P.lorem(70, 1), { }, { size: 9, align: 'left' }); return b; } },
    { cat: 'Newspaper', name: 'Index / contents', sub: 'Section list with page numbers', build(c) {
      const b = Builder(), w = colsW(c, 2);
      b.shape('rect', 0, 0, w, 2.5, { fill: '', stroke: '#111111', strokeW: 1.5 });
      b.text(.1, .08, w - .2, .3, 'INSIDE TODAY', { font: 'Condensed', size: 13, bold: true, ls: 2, align: 'center' });
      b.text(.12, .5, w - .24, 1.9, 'News ................. A1\nSports ............... B1\nBusiness ............ C1\nOpinion ............. A6\nClassifieds ........ D4', { font: 'Serif', size: 10.5, lh: 1.5 }); return b; } },
    { cat: 'Newspaper', name: 'Weather box', sub: '5-day forecast table', build(c) {
      const b = Builder(), w = colsW(c, 2);
      b.text(0, 0, w, .3, 'FIVE-DAY FORECAST', { font: 'Condensed', size: 12, bold: true, ls: 2, align: 'center', fill: '#111111', color: '#ffffff' });
      b.table(0, .3, w, 1.1, { rows: 3, cols: 5, head: true, size: 8.5, cells: [['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], ['Sun', 'Cloud', 'Rain', 'Sun', 'Sun'], ['72', '68', '61', '70', '74']] }); return b; } },
    { cat: 'Newspaper', name: 'Classifieds column', sub: 'Header + dense small text', build(c) {
      const b = Builder(), w = colsW(c, 1);
      b.text(0, 0, w, .3, 'CLASSIFIEDS', { font: 'Condensed', size: 12, bold: true, ls: 2, align: 'center', fill: '#111111', color: '#ffffff' });
      b.story(0, .35, w, 5, P.lorem(240, 8), { }, { size: 7, align: 'left', lh: 1.2 }); return b; } },
    { cat: 'Newspaper', name: 'Crossword grid', sub: '15 x 15 empty grid', build(c) {
      const b = Builder(), w = colsW(c, 3);
      b.table(0, 0, w, w, { rows: 15, cols: 15, head: false, size: 7, border: '#111111', cells: Array.from({ length: 15 }, () => Array(15).fill('')) }); return b; } },
    { cat: 'Newspaper', name: 'Page footer / folio', sub: 'Rule + page number + title', build(c) {
      const b = Builder(), W = c.W;
      b.line(0, 0, W, 1); b.text(0, .06, W, .25, 'THE DAILY CHRONICLE   -   {page}   -   {date}', { font: 'Sans', size: 8, bold: true, ls: 1, align: 'center' }); return b; } },
    { cat: 'Ads (column inches)', name: 'Business card ad', sub: '1 col x 2 in', build(c) { return adBox(c, 1, 2); } },
    { cat: 'Ads (column inches)', name: 'Eighth page ad', sub: '2 col x 3 in', build(c) { return adBox(c, 2, 3); } },
    { cat: 'Ads (column inches)', name: 'Quarter page ad', sub: '3 col x 5 in', build(c) { return adBox(c, 3, 5); } },
    { cat: 'Ads (column inches)', name: 'Half page ad', sub: 'all cols x 6 in', build(c) { return adBox(c, c.cols || 6, 6); } },
    { cat: 'Ads (column inches)', name: 'Coupon', sub: 'Dashed cut-out box', build(c) {
      const b = Builder(), w = colsW(c, 2);
      b.shape('rect', 0, 0, w, 1.8, { fill: '', stroke: '#111111', strokeW: 2, dash: '8 5' });
      b.text(.1, .1, w - .2, .5, 'SAVE $5', { font: 'Condensed', size: 26, bold: true, align: 'center' });
      b.text(.1, .75, w - .2, .9, 'on any purchase of $25 or more. Bring this coupon. Expires soon.', { font: 'Serif', size: 10, align: 'center', italic: true }); return b; } },
    { cat: 'General', name: 'Title banner', sub: 'Colored bar with big title', build(c) {
      const b = Builder(), W = c.W;
      b.shape('rect', 0, 0, W, 1.1, { fill: '#b5651d' }); b.text(0, 0, W, 1.1, 'Big Title Here', { font: 'Display', size: 40, bold: true, color: '#ffffff', align: 'center', valign: 'middle', fit: true }); return b; } },
    { cat: 'General', name: 'Callout badge', sub: 'Circle with a short word', build() {
      const b = Builder(); b.shape('ellipse', 0, 0, 1.6, 1.6, { fill: '#c0392b' }); b.text(0, 0, 1.6, 1.6, 'NEW!', { font: 'Condensed', size: 28, bold: true, color: '#ffffff', align: 'center', valign: 'middle', rot: 0 }); return b; } },
    { cat: 'General', name: 'Section divider', sub: 'Ornamental rule with title', build(c) {
      const b = Builder(), W = c.W;
      b.line(0, .15, W * .36, 1.5); b.text(W * .36, 0, W * .28, .32, 'SPORTS', { font: 'Condensed', size: 14, bold: true, ls: 4, align: 'center' }); b.line(W * .64, .15, W * .36, 1.5); return b; } }
  ];
  function adBox(c, cols, h) {
    const b = Builder(), w = colsW(c, cols);
    b.shape('rect', 0, 0, w, h, { fill: '#ffffff', stroke: '#111111', strokeW: 1 });
    b.text(0, 0, w, h, 'ADVERTISEMENT\n' + cols + ' col x ' + h + ' in', { font: 'Condensed', size: 12, align: 'center', valign: 'middle', color: '#aaaaaa', ls: 2, lh: 1.5 });
    return b;
  }
})();

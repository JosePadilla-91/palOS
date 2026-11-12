// Runtime CSS + JS shipped with every exported site (and the base CSS is
// also loaded into the editor so the canvas looks exactly like the output).

export const SITE_CSS = String.raw`/* Site Knitter site styles */
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body.ws-body{min-height:100vh;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
.ws-stage{padding:var(--ws-margin,0px) 0;min-height:100vh}
.ws-page{position:relative;margin:0 auto;overflow:hidden}
.ws-el{position:absolute}
.ws-vis{position:relative;width:100%;height:100%}
.ws-link{display:block;width:100%;height:100%;color:inherit;text-decoration:none}
.ws-grow{height:auto}
.ws-grow>.ws-vis,.ws-grow>.ws-link>.ws-vis{height:auto;min-height:inherit}

/* text */
.ws-txt{width:100%;height:100%;display:flex;flex-direction:column;overflow-wrap:break-word;word-break:break-word}
.ws-txt>*{flex:none}
.ws-txt p,.ws-txt h1,.ws-txt h2,.ws-txt h3,.ws-txt h4,.ws-txt ul,.ws-txt ol,.ws-txt blockquote{margin:0 0 .6em}
.ws-txt>:last-child{margin-bottom:0}
.ws-txt h1{font-size:2em;line-height:1.15}.ws-txt h2{font-size:1.5em;line-height:1.2}.ws-txt h3{font-size:1.2em;line-height:1.3}
.ws-txt ul,.ws-txt ol{padding-left:1.4em}
.ws-txt blockquote{border-left:3px solid currentColor;padding-left:1em;opacity:.85;font-style:italic}
.ws-txt a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.ws-txt img{max-width:100%}

/* shapes */
.ws-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.ws-shape>.ws-svg.ws-outline,.ws-shape>.ws-link>.ws-svg.ws-outline{z-index:1}
.ws-shape-txt{height:100%;justify-content:center}

/* images */
.ws-image img{display:block;width:100%;height:100%}
.ws-polaroid-cap{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-size:22px;color:#4a4a4a;line-height:1.2}
.ws-tape{position:absolute;top:-14px;left:50%;width:96px;height:28px;margin-left:-48px;background:rgba(250,245,215,.72);transform:rotate(-4deg);box-shadow:0 1px 2px rgba(0,0,0,.15)}
.ws-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;background:repeating-linear-gradient(45deg,rgba(128,128,128,.10) 0 14px,rgba(128,128,128,.18) 14px 28px);color:rgba(80,80,80,.9);font:500 13px/1.4 system-ui,sans-serif;border:2px dashed rgba(128,128,128,.45)}
.ws-placeholder.dark{color:rgba(230,230,230,.9);background:repeating-linear-gradient(45deg,#1a1a1a 0 14px,#222 14px 28px)}
.ws-placeholder-out{position:absolute;inset:0;background:linear-gradient(135deg,rgba(128,128,128,.14),rgba(128,128,128,.3))}

/* navigation */
.ws-nav{display:flex;flex-wrap:wrap;align-items:center;height:100%}
.ws-nav a{color:inherit;text-decoration:none;position:relative;padding:4px 0;transition:color .2s,background .2s,box-shadow .25s,border-color .25s;white-space:nowrap}
.ws-nav a:hover{color:var(--hover)}
.ws-nav a.on{color:var(--active)}
.ws-nav-v{flex-direction:column;flex-wrap:nowrap;height:auto}
.ws-nav-plain a.on{font-weight:700}
.ws-nav-underline a::after{content:"";position:absolute;left:0;right:0;bottom:-3px;height:2px;border-radius:2px;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.ws-nav-underline a:hover::after,.ws-nav-underline a.on::after{transform:scaleX(1)}
.ws-nav-pills a{padding:7px 16px;border-radius:999px}
.ws-nav-pills a:hover{background:rgba(128,128,128,.16)}
.ws-nav-pills a.on{background:var(--accent);color:var(--on-accent)}
.ws-nav-boxed a{padding:5px 14px;border:1px solid transparent;border-radius:3px}
.ws-nav-boxed a:hover,.ws-nav-boxed a.on{border-color:var(--accent);color:var(--active);box-shadow:0 0 14px var(--accent),inset 0 0 8px var(--accent)}
.ws-nav-tabs a{padding:8px 18px;border-radius:8px 8px 0 0}
.ws-nav-tabs a.on{background:var(--accent);color:var(--on-accent)}

/* slideshow */
.ws-slides{position:relative;width:100%;height:100%;overflow:hidden}
.ws-slide{position:absolute;inset:0;margin:0;opacity:0;transition:opacity 1.1s ease,transform 1s cubic-bezier(.6,0,.2,1)}
.ws-slide.on{opacity:1;z-index:1}
.ws-slide img{width:100%;height:100%;display:block}
.ws-slide figcaption{position:absolute;left:0;right:0;bottom:0;padding:48px 28px 22px;background:linear-gradient(transparent,rgba(0,0,0,.62));color:#fff;font:500 17px/1.4 system-ui,sans-serif}
.ws-tr-slide .ws-slide{opacity:1;transform:translateX(100%)}
.ws-tr-slide .ws-slide.on{transform:none}
.ws-tr-slide .ws-slide.out{transform:translateX(-100%)}
.ws-tr-kenburns .ws-slide.on img{animation:wsKB 9s ease-out both}
@keyframes wsKB{from{transform:scale(1.14) translate(2%,1%)}to{transform:none}}
.ws-prev,.ws-next{position:absolute;top:50%;z-index:3;width:44px;height:44px;margin-top:-22px;border:0;border-radius:50%;background:rgba(0,0,0,.35);color:#fff;font-size:28px;line-height:40px;cursor:pointer;backdrop-filter:blur(6px);opacity:0;transition:opacity .25s,background .2s}
.ws-slides:hover .ws-prev,.ws-slides:hover .ws-next{opacity:1}
.ws-prev:hover,.ws-next:hover{background:rgba(0,0,0,.6)}
.ws-prev{left:14px}.ws-next{right:14px}
.ws-dots{position:absolute;z-index:3;left:0;right:0;bottom:14px;display:flex;justify-content:center;gap:8px}
.ws-dots button{width:9px;height:9px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.5);cursor:pointer;transition:background .2s,transform .2s}
.ws-dots button.on{background:#fff;transform:scale(1.25)}

/* media */
.ws-video video,.ws-embed iframe,.ws-map iframe,.ws-snippet{width:100%;height:100%;border:0;display:block}
.ws-audio audio{width:100%;display:block}
.ws-audio-ph{display:flex;align-items:center;gap:8px;height:100%;min-height:40px;padding:0 16px;border-radius:999px;background:rgba(128,128,128,.18);font:500 13px system-ui,sans-serif;color:rgba(80,80,80,.95);overflow:hidden;white-space:nowrap}
.ws-image .ws-vis,.ws-gallery .ws-vis{overflow:visible}
.ws-video .ws-vis,.ws-embed .ws-vis,.ws-map .ws-vis,.ws-slideshow .ws-vis{overflow:hidden}
.ws-gallery figure{margin:0}
.ws-map iframe{position:relative}
.ws-map-ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#4a5a63;font:500 13px system-ui,sans-serif;background:repeating-linear-gradient(0deg,transparent 0 38px,rgba(255,255,255,.55) 38px 41px),repeating-linear-gradient(90deg,#dfe6e9 0 52px,rgba(255,255,255,.55) 52px 55px)}
.ws-map-ph b{font-size:26px}

/* form */
.ws-form{display:flex;flex-direction:column;gap:14px}
.ws-form label{display:flex;flex-direction:column;gap:6px;font-size:.88em;font-weight:600;opacity:.9}
.ws-form input,.ws-form textarea{font:inherit;font-weight:400;color:inherit;padding:11px 13px;border:1px solid var(--line);border-radius:8px;background:var(--field);outline:none;transition:border-color .2s,box-shadow .2s;resize:vertical}
.ws-form input:focus,.ws-form textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 25%,transparent)}
.ws-form button{align-self:flex-start;font:inherit;font-weight:700;padding:12px 26px;border:0;border-radius:8px;background:var(--accent);color:#fff;cursor:pointer;transition:transform .2s,filter .2s}
.ws-form button:hover{transform:translateY(-2px);filter:brightness(1.08)}
.ws-form-ok{margin:0;color:var(--accent);font-weight:600}

/* blog */
.ws-feed .ws-post{display:flex;gap:26px;padding:0 0 30px;margin:0 0 30px;border-bottom:1px solid var(--rule)}
.ws-feed .ws-post:last-child{border-bottom:0}
.ws-feed-list .ws-post-img{flex:0 0 34%;display:block;overflow:hidden;border-radius:6px;aspect-ratio:4/3;align-self:flex-start}
.ws-feed .ws-post-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.ws-feed .ws-post-img:hover img{transform:scale(1.05)}
.ws-feed-cards{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.ws-feed-cards .ws-post{flex-direction:column;gap:14px;margin:0;padding:0;border:0}
.ws-feed-cards .ws-post-img{display:block;overflow:hidden;border-radius:10px;aspect-ratio:16/10}
.ws-post-body{flex:1;min-width:0}
.ws-post-date,.ws-entry-date{margin:0 0 6px;font-size:.78em;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.ws-post-title,.ws-entry-title{margin:0 0 10px;font-family:var(--title-font);font-size:var(--title-size);line-height:1.2;color:var(--title-color);font-weight:700}
.ws-entry-title{font-size:calc(var(--title-size) * 1.35)}
.ws-post-title a{color:inherit;text-decoration:none}
.ws-post-title a:hover{color:var(--accent)}
.ws-post-ex{margin:0 0 10px}
.ws-more{color:var(--accent);text-decoration:none;font-weight:700;font-size:.9em}
.ws-more:hover{text-decoration:underline}
.ws-entry-hero{display:block;width:100%;border-radius:8px;margin:12px 0 24px}
.ws-entry-body p{margin:0 0 1em}
.ws-entry-body img{max-width:100%;height:auto;border-radius:6px}
.ws-entry-body a{color:var(--accent)}
.ws-entry-nav{display:flex;justify-content:space-between;gap:16px;margin-top:36px;padding-top:18px;border-top:1px solid var(--rule);font-size:.92em}
.ws-entry-nav a{color:var(--accent);text-decoration:none;font-weight:600}

/* hover effects */
.ws-hv-lift,.ws-hv-grow,.ws-hv-glow,.ws-hv-dim,.ws-hv-tilt{transition:translate .35s cubic-bezier(.2,.7,.2,1),scale .35s cubic-bezier(.2,.7,.2,1),filter .35s,opacity .35s,rotate .35s}
.ws-hv-lift:hover{translate:0 -6px}
.ws-hv-grow:hover{scale:1.05}
.ws-hv-glow:hover{filter:drop-shadow(0 0 18px rgba(255,255,255,.55)) brightness(1.06)}
.ws-hv-dim:hover{opacity:.75}
.ws-hv-tilt:hover{rotate:-2deg;scale:1.03}

/* scroll-in animations (only when JS is running) */
.ws-live [data-anim]{transition:opacity .9s ease var(--delay,0s),translate .9s cubic-bezier(.2,.7,.2,1) var(--delay,0s),scale .9s cubic-bezier(.2,.7,.2,1) var(--delay,0s),filter .9s ease var(--delay,0s),rotate .9s ease var(--delay,0s)}
.ws-live [data-anim]:not(.ws-in){opacity:0}
.ws-live [data-anim="fade-up"]:not(.ws-in){translate:0 46px}
.ws-live [data-anim="fade-down"]:not(.ws-in){translate:0 -46px}
.ws-live [data-anim="slide-left"]:not(.ws-in){translate:80px 0}
.ws-live [data-anim="slide-right"]:not(.ws-in){translate:-80px 0}
.ws-live [data-anim="zoom"]:not(.ws-in){scale:.82}
.ws-live [data-anim="flip"]:not(.ws-in){rotate:x 70deg}
.ws-live [data-anim="blur-in"]:not(.ws-in){filter:blur(14px)}
@media (prefers-reduced-motion:reduce){.ws-live [data-anim]{transition:none!important;opacity:1!important;translate:none!important;scale:none!important;filter:none!important}}

/* lightbox */
.ws-lb{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(8,8,10,.92);opacity:0;transition:opacity .3s;backdrop-filter:blur(8px)}
.ws-lb.open{opacity:1}
.ws-lb figure{margin:0;max-width:92vw;max-height:88vh;display:flex;flex-direction:column;align-items:center}
.ws-lb img{max-width:92vw;max-height:80vh;object-fit:contain;border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,.6);transition:opacity .25s,transform .35s cubic-bezier(.2,.7,.2,1)}
.ws-lb img.loading{opacity:0;transform:scale(.97)}
.ws-lb figcaption{color:#eee;font:500 15px/1.4 system-ui,sans-serif;margin-top:14px;text-align:center;min-height:1.4em}
.ws-lb button{position:absolute;border:0;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;border-radius:50%;width:52px;height:52px;font-size:30px;line-height:50px;transition:background .2s}
.ws-lb button:hover{background:rgba(255,255,255,.2)}
.ws-lb .lb-close{top:18px;right:18px;font-size:26px}
.ws-lb .lb-prev{left:18px;top:50%;margin-top:-26px}
.ws-lb .lb-next{right:18px;top:50%;margin-top:-26px}
.ws-lb .lb-count{position:absolute;top:30px;left:0;right:0;text-align:center;color:#aaa;font:500 13px system-ui,sans-serif;pointer-events:none}
`;

/* eslint-disable */
function wsRuntime() {
  var d = document, page = d.querySelector('.ws-page');
  if (!page) return;
  d.documentElement.classList.add('ws-live');
  var baseH = +page.getAttribute('data-h') || page.offsetHeight;
  var W = +page.getAttribute('data-w') || page.offsetWidth;
  var els = [].slice.call(page.querySelectorAll(':scope > .ws-el'));

  // ---- grow elements (galleries, blog posts, forms) push content below them
  function flow() {
    var z = page.style.zoom; page.style.zoom = '';
    els.forEach(function (e) { e._s = 0; e.style.top = e.getAttribute('data-y') + 'px'; });
    var grows = els.filter(function (e) { return e.hasAttribute('data-grow'); })
      .sort(function (a, b) { return a.getAttribute('data-y') - b.getAttribute('data-y'); });
    var maxShift = 0;
    grows.forEach(function (g) {
      var y = +g.getAttribute('data-y'), h = +g.getAttribute('data-h');
      var delta = Math.max(0, g.offsetHeight - h);
      if (!delta) return;
      var total = (g._s || 0) + delta;
      els.forEach(function (o) {
        if (o !== g && +o.getAttribute('data-y') >= y + h - 1) o._s = Math.max(o._s || 0, total);
      });
      maxShift = Math.max(maxShift, total);
    });
    els.forEach(function (e) {
      var y = +e.getAttribute('data-y'), h = +e.getAttribute('data-h');
      if (e._s) e.style.top = (y + e._s) + 'px';
      if (y <= 2 && y + h >= baseH - 2 && !e.hasAttribute('data-grow')) e.style.height = (h + maxShift) + 'px';
    });
    page.style.height = (baseH + maxShift) + 'px';
    page.style.zoom = z;
  }

  // ---- scale the fixed-width page down on small screens
  function fit() {
    var vw = d.documentElement.clientWidth;
    var z = vw < W ? vw / W : 1;
    page.style.zoom = z < 1 ? String(z) : '';
  }

  flow(); fit();
  [].forEach.call(page.querySelectorAll('img'), function (img) { if (!img.complete) img.addEventListener('load', flow); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(flow);
  window.addEventListener('load', flow);
  window.addEventListener('resize', fit);

  // ---- scroll-in animations
  var anims = [].slice.call(d.querySelectorAll('[data-anim]'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('ws-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    anims.forEach(function (a) { io.observe(a); });
  } else anims.forEach(function (a) { a.classList.add('ws-in'); });

  // ---- slideshows
  [].forEach.call(d.querySelectorAll('.ws-slides'), function (s) {
    var slides = [].slice.call(s.querySelectorAll('.ws-slide'));
    var dots = [].slice.call(s.querySelectorAll('.ws-dots button'));
    var i = 0, timer = null, every = (+s.getAttribute('data-interval') || 5) * 1000;
    if (slides.length < 2) return;
    function go(n) {
      slides[i].classList.remove('on'); slides[i].classList.add('out');
      var prev = slides[i];
      setTimeout(function () { prev.classList.remove('out'); }, 1000);
      if (dots[i]) dots[i].classList.remove('on');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('on');
      if (dots[i]) dots[i].classList.add('on');
    }
    function play() { stop(); if (s.getAttribute('data-autoplay') !== 'false') timer = setInterval(function () { go(i + 1); }, every); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    var p = s.querySelector('.ws-prev'), n = s.querySelector('.ws-next');
    if (p) p.addEventListener('click', function () { go(i - 1); play(); });
    if (n) n.addEventListener('click', function () { go(i + 1); play(); });
    dots.forEach(function (b, k) { b.addEventListener('click', function () { go(k); play(); }); });
    s.addEventListener('mouseenter', stop); s.addEventListener('mouseleave', play);
    var sx = null;
    s.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    s.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); play(); } sx = null; });
    play();
  });

  // ---- lightbox
  var groups = {};
  [].forEach.call(d.querySelectorAll('a[data-lb]'), function (a) {
    var g = a.getAttribute('data-lb');
    (groups[g] = groups[g] || []).push(a);
    a.addEventListener('click', function (e) { e.preventDefault(); open(g, groups[g].indexOf(a)); });
  });
  var lb, lbImg, lbCap, lbCount, cur, idx;
  function open(g, k) {
    cur = groups[g]; idx = k;
    lb = d.createElement('div'); lb.className = 'ws-lb';
    lb.innerHTML = '<div class="lb-count"></div><figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-prev" aria-label="Previous">‹</button><button class="lb-next" aria-label="Next">›</button><button class="lb-close" aria-label="Close">×</button>';
    d.body.appendChild(lb);
    lbImg = lb.querySelector('img'); lbCap = lb.querySelector('figcaption'); lbCount = lb.querySelector('.lb-count');
    lb.querySelector('.lb-prev').onclick = function (e) { e.stopPropagation(); show(idx - 1); };
    lb.querySelector('.lb-next').onclick = function (e) { e.stopPropagation(); show(idx + 1); };
    lb.querySelector('.lb-close').onclick = close;
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
    d.addEventListener('keydown', key);
    d.documentElement.style.overflow = 'hidden';
    show(idx);
    requestAnimationFrame(function () { lb.classList.add('open'); });
  }
  function show(k) {
    idx = (k + cur.length) % cur.length;
    var a = cur[idx];
    lbImg.classList.add('loading');
    var im = new Image();
    im.onload = function () { lbImg.src = a.href; lbImg.classList.remove('loading'); };
    im.src = a.href;
    lbCap.textContent = a.getAttribute('data-cap') || '';
    lbCount.textContent = cur.length > 1 ? (idx + 1) + ' / ' + cur.length : '';
    lb.querySelector('.lb-prev').style.display = lb.querySelector('.lb-next').style.display = cur.length > 1 ? '' : 'none';
    [1, -1].forEach(function (o) { var n = cur[(idx + o + cur.length) % cur.length]; if (n) (new Image()).src = n.href; });
  }
  function key(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  }
  function close() {
    d.removeEventListener('keydown', key);
    d.documentElement.style.overflow = '';
    lb.classList.remove('open');
    var l = lb; setTimeout(function () { l.remove(); }, 300);
  }

  // ---- mailto contact forms
  [].forEach.call(d.querySelectorAll('form[data-mailto]'), function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var to = f.getAttribute('action').replace(/^mailto:/, '');
      var get = function (n) { var x = f.elements[n]; return x ? x.value : ''; };
      var subject = get('subject') || ('Message from ' + (get('name') || 'your website'));
      var body = (get('message') || '') + '\n\n— ' + get('name') + (get('email') ? ' <' + get('email') + '>' : '');
      location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      var ok = f.querySelector('.ws-form-ok'); if (ok) ok.hidden = false;
    });
  });
}

export const SITE_JS = '/* Site Knitter site runtime */\n(' + wsRuntime.toString() + ')();\n';

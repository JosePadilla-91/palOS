// Kibble's media, the page side. palOS's WebKit plays no media itself; this gives pages <video>, <audio> and
// new Audio() as they know them, played by Kibble's media engine (kibble-media: GStreamer, sound straight to
// PipeWire). A <video> shows its pictures in an <img> inside it, so it still works in transforms (Cover Flow),
// with object-fit, and on a canvas (drawImage). Pages need nothing special: the same API, the same events.
(function () {
  'use strict';
  if (window.__kibbleMedia) return;
  if (typeof HTMLMediaElement !== 'undefined' && HTMLMediaElement.prototype && HTMLMediaElement.prototype.play) return;   // a WebKit that plays media itself

  var view = window.__kibbleView || 0;
  function post(m) {
    try {
      var o = { t: 'send', ch: 'kibble:media', args: [m] }; if (view) o.v = view;
      window.webkit.messageHandlers.kibble.postMessage(JSON.stringify(o));
    } catch (e) {}
  }
  var players = Object.create(null), seq = 0;
  var MEDIA_ERR = { 1: 'MEDIA_ERR_ABORTED', 2: 'MEDIA_ERR_NETWORK', 3: 'MEDIA_ERR_DECODE', 4: 'MEDIA_ERR_SRC_NOT_SUPPORTED' };

  // ---------------------------------------------------------------- how <video> and <audio> look
  function style() {
    if (document.getElementById('__kibble-media-css')) return;
    var s = document.createElement('style'); s.id = '__kibble-media-css';
    s.textContent = 'video{display:inline-block;position:relative;overflow:hidden;font-size:0;line-height:0;vertical-align:baseline}'
      + 'video>:not(.__kbv){display:none!important}audio{display:none}audio[controls]{display:none}'
      + 'video>img.__kbv{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none;user-select:none}'
      + 'video>img.__kbv.__kbnatural{position:static;display:block}video>img.__kbv.__kbback{visibility:hidden}'
      + 'video>img.__kbv.__kbnatural.__kbback{position:absolute}';
    (document.head || document.documentElement).appendChild(s);
  }

  function ranges(list) {
    return { length: list.length, start: function (i) { return list[i][0]; }, end: function (i) { return list[i][1]; } };
  }
  function absURL(u) { try { return new URL(u, document.baseURI).href; } catch (e) { return String(u || ''); } }

  // ---------------------------------------------------------------- one element
  function upgrade(el) {
    if (!el || el.__km) return el;
    var tag = (el.localName || '').toLowerCase();
    if (tag !== 'video' && tag !== 'audio') return el;
    style();
    var isVideo = tag === 'video';
    var st = {
      pid: ++seq, src: '', loaded: false, paused: true, ended: false, seeking: false, t: 0, at: 0, dur: NaN,
      vol: 1, muted: el.hasAttribute('muted'), rate: 1, ready: 0, net: 0, err: null, w: 0, h: 0, img: null,
      waiters: [], obj: null, silent: false,
    };
    el.__km = st; players[st.pid] = el;

    function fire(type, detail) {
      var e = new Event(type, { bubbles: false, cancelable: false });
      try { el.dispatchEvent(e); } catch (x) {}
      var h = el['on' + type]; if (typeof h === 'function') { try { h.call(el, e); } catch (x) { setTimeout(function () { throw x; }); } }
    }
    st.fire = fire;
    function now() { return st.paused || st.seeking ? st.t : st.t + (performance.now() - st.at) / 1000 * st.rate; }
    function cmd(m) { m.pid = st.pid; post(m); }
    st.cmd = cmd;

    function picture() {
      if (!isVideo) return null;
      if (!st.img) {
        var mk = function () { var i = document.createElement('img'); i.className = '__kbv'; i.alt = ''; i.draggable = false; i.crossOrigin = 'anonymous'; el.appendChild(i); return i; };
        st.img = mk(); st.back = mk(); st.back.classList.add('__kbback');
      }
      return st.img;
    }
    function fit() {
      if (!st.img) return;
      try {
        var cs = getComputedStyle(el);
        var natural = (!el.style.width && !el.getAttribute('width') && (cs.width === 'auto' || el.clientWidth === 0));
        [st.img, st.back].forEach(function (i) {
          if (!i) return;
          i.style.objectFit = cs.objectFit && cs.objectFit !== 'fill' ? cs.objectFit : (el.style.objectFit || 'contain');
          i.style.objectPosition = cs.objectPosition || '';
          i.classList.toggle('__kbnatural', natural);      // no size of its own: the picture's size, as a <video> would be
        });
        if (el.getAttribute('width') && !el.style.width) el.style.width = el.getAttribute('width') + 'px';
        if (el.getAttribute('height') && !el.style.height) el.style.height = el.getAttribute('height') + 'px';
        var r = el.getBoundingClientRect(), d = window.devicePixelRatio || 1;
        if (r.width > 0 && r.height > 0) cmd({ op: 'size', width: Math.round(r.width * d), height: Math.round(r.height * d) });
      } catch (x) {}
    }
    // pictures: the next one loads out of sight and takes the place of the one showing only once it's complete
    var viewer = Math.random().toString(36).slice(2, 10), n = 0;
    function pump() {
      if (!st.base || !st.back) return;
      var base = st.base, b = st.back;
      b.onload = function () {
        if (st.base !== base) return;
        var a = st.img; st.img = b; st.back = a;
        b.classList.remove('__kbback'); a.classList.add('__kbback');
        pump();
      };
      b.onerror = function () { if (st.base === base) setTimeout(pump, st.paused ? 120 : 15); };
      b.src = base + '/' + viewer + '/' + (++n) + '.jpg';
    }
    function poster() {
      var p = el.getAttribute('poster');
      if (p && isVideo && !st.shown) { picture().src = absURL(p); }
    }

    function source() {
      if (st.obj) return null;
      var s = el.getAttribute('src');
      if (!s) { var c = el.querySelector && el.querySelector('source[src]'); if (c) s = c.getAttribute('src'); }
      return s ? absURL(s) : '';
    }
    function load() {
      var wasLoaded = st.loaded;
      if (st.loaded) { cmd({ op: 'destroy' }); }
      st.loaded = false; st.ready = 0; st.dur = NaN; st.t = 0; st.ended = false; st.err = null; st.w = st.h = 0; st.shown = false;
      st.base = null; st.pendingFrame = null;
      if (st.img) { st.img.removeAttribute('src'); st.back.removeAttribute('src'); }
      for (var i = 0; i < st.waiters.length; i++) st.waiters[i][1](abortError());
      st.waiters = [];
      if (wasLoaded) fire('emptied');
      var u = source();
      st.src = u || '';
      if (!u && !st.obj) { st.net = 0; return; }
      st.net = 2; st.loaded = true;
      fire('loadstart');
      poster();
      var m = { op: 'load', video: isVideo, volume: st.vol, muted: st.muted, loop: el.hasAttribute('loop'), play: !st.paused || el.hasAttribute('autoplay') };
      if (st.obj) { m.camera = true; m.device = st.obj.__device || ''; } else m.uri = u;
      if (m.play) { st.paused = false; }
      cmd(m);
    }
    st.load = load;
    function abortError() { try { return new DOMException('The play() request was interrupted.', 'AbortError'); } catch (x) { return new Error('AbortError'); } }

    // events from the engine
    st.ev = function (m) {
      if (m.ev === 'meta') {
        if (m.duration != null) st.dur = m.duration; else st.dur = Infinity;
        st.w = m.width || 0; st.h = m.height || 0; st.ready = Math.max(st.ready, 1);
        fire('durationchange'); fire('loadedmetadata');
        if (st.pendingFrame) { var pf = st.pendingFrame; st.pendingFrame = null; setTimeout(function () { st.ev(pf); }, 0); }
        if (isVideo && m.url && st.img === null) picture();
        if (!isVideo || !m.hasVideo) { st.ready = 4; fire('loadeddata'); fire('canplay'); fire('canplaythrough'); }
      } else if (m.ev === 'frame' && st.ready < 1) {
        st.pendingFrame = m;                    // its details first (loadedmetadata), then its picture
      } else if (m.ev === 'frame') {
        if (isVideo) {
          var im = picture();
          st.w = m.width || st.w; st.h = m.height || st.h;
          if (!st.shown) { st.shown = true; st.still = m.still; st.base = m.url; pump(); fit(); }
        }
        if (st.ready < 4) { st.ready = 4; fire('loadeddata'); fire('canplay'); fire('canplaythrough'); }
        if (st.w) fire('resize');
      } else if (m.ev === 'playing') {
        st.t = m.t != null ? m.t : st.t; st.at = performance.now(); st.paused = false; st.ended = false;
        var w = st.waiters; st.waiters = []; for (var i = 0; i < w.length; i++) w[i][0]();
        fire('playing');
      } else if (m.ev === 'paused') {
        if (m.t != null) st.t = m.t; st.at = performance.now();
      } else if (m.ev === 'time') {
        st.t = m.t; st.at = performance.now(); fire('timeupdate');
      } else if (m.ev === 'seeked') {
        if (m.t != null) st.t = m.t; st.at = performance.now(); st.seeking = false; fire('timeupdate'); fire('seeked');
      } else if (m.ev === 'duration') {
        st.dur = m.duration; fire('durationchange');
      } else if (m.ev === 'ended') {
        st.t = st.dur > 0 && isFinite(st.dur) ? st.dur : (m.t || st.t); st.paused = true; st.ended = true;
        fire('timeupdate'); fire('pause'); fire('ended');
      } else if (m.ev === 'buffering') {
        if (m.percent < 100) fire('waiting'); else fire('canplay');
      } else if (m.ev === 'silent') {
        st.silent = true;
      } else if (m.ev === 'error') {
        var code = m.code || 4;
        st.err = { code: code, message: m.message || '', MEDIA_ERR_ABORTED: 1, MEDIA_ERR_NETWORK: 2, MEDIA_ERR_DECODE: 3, MEDIA_ERR_SRC_NOT_SUPPORTED: 4 };
        st.net = code === 4 ? 3 : 1; st.paused = true;
        var ws = st.waiters; st.waiters = [];
        for (var j = 0; j < ws.length; j++) { try { ws[j][1](new DOMException(m.message || 'The media could not be played.', 'NotSupportedError')); } catch (x) { ws[j][1](new Error(m.message)); } }
        fire('error');
      }
    };

    function def(name, get, set) { try { Object.defineProperty(el, name, { configurable: true, enumerable: true, get: get, set: set }); } catch (x) {} }
    function attr(name, bool) {
      def(name, function () { return bool ? el.hasAttribute(name) : (el.getAttribute(name) || ''); },
        function (v) { if (bool) { if (v) el.setAttribute(name, ''); else el.removeAttribute(name); } else el.setAttribute(name, v); });
    }
    def('src', function () { var s = el.getAttribute('src'); return s ? absURL(s) : ''; }, function (v) { st.obj = null; el.setAttribute('src', v); });
    def('currentSrc', function () { return st.src; });
    def('srcObject', function () { return st.obj; }, function (v) { st.obj = v || null; if (v) { try { v.getVideoTracks()[0].__users.push(el); } catch (x) {} el.removeAttribute('src'); st.paused = !el.hasAttribute('autoplay'); load(); } else load(); });
    ['autoplay', 'loop', 'controls', 'playsInline', 'disableRemotePlayback'].forEach(function (n) { attr(n === 'playsInline' ? 'playsinline' : n, true); if (n === 'playsInline') def('playsInline', function () { return el.hasAttribute('playsinline'); }, function (v) { if (v) el.setAttribute('playsinline', ''); else el.removeAttribute('playsinline'); }); });
    ['poster', 'preload', 'crossOrigin'].forEach(function (n) { attr(n === 'crossOrigin' ? 'crossorigin' : n, false); });
    def('defaultMuted', function () { return el.hasAttribute('muted'); }, function (v) { if (v) el.setAttribute('muted', ''); else el.removeAttribute('muted'); });
    def('paused', function () { return st.paused; });
    def('ended', function () { return st.ended; });
    def('seeking', function () { return st.seeking; });
    def('currentTime', function () { var t = now(); return isFinite(st.dur) && st.dur > 0 ? Math.min(t, st.dur) : t; },
      function (v) { v = Math.max(0, Number(v) || 0); st.t = v; st.at = performance.now(); st.ended = false; if (st.loaded) { st.seeking = true; fire('seeking'); cmd({ op: 'seek', t: v }); } });
    def('duration', function () { return st.dur; });
    def('volume', function () { return st.vol; }, function (v) { v = Number(v); if (!(v >= 0 && v <= 1)) throw new DOMException('The volume must be between 0 and 1.', 'IndexSizeError'); if (v !== st.vol) { st.vol = v; cmd({ op: 'volume', volume: v }); fire('volumechange'); } });
    def('muted', function () { return st.muted; }, function (v) { v = !!v; if (v !== st.muted) { st.muted = v; cmd({ op: 'volume', muted: v }); fire('volumechange'); } });
    def('playbackRate', function () { return st.rate; }, function (v) { v = Number(v) || 1; if (v !== st.rate) { st.t = now(); st.at = performance.now(); st.rate = v; cmd({ op: 'rate', rate: v }); fire('ratechange'); } });
    def('defaultPlaybackRate', function () { return 1; }, function () {});
    def('preservesPitch', function () { return true; }, function () {});
    def('readyState', function () { return st.ready; });
    def('networkState', function () { return st.net; });
    def('error', function () { return st.err; });
    def('videoWidth', function () { return isVideo ? st.w : undefined; });
    def('videoHeight', function () { return isVideo ? st.h : undefined; });
    def('buffered', function () { return ranges(isFinite(st.dur) && st.dur > 0 && st.ready >= 1 ? [[0, st.dur]] : []); });
    def('seekable', function () { return ranges(isFinite(st.dur) && st.dur > 0 ? [[0, st.dur]] : []); });
    def('played', function () { return ranges([]); });
    def('textTracks', function () { return Object.assign([], { addEventListener: function () {}, removeEventListener: function () {}, getTrackById: function () { return null; } }); });
    def('audioTracks', function () { return []; });
    def('videoTracks', function () { return []; });
    def('sinkId', function () { return ''; });
    def('mediaKeys', function () { return null; });
    def('HAVE_NOTHING', function () { return 0; }); def('HAVE_METADATA', function () { return 1; }); def('HAVE_CURRENT_DATA', function () { return 2; });
    def('HAVE_FUTURE_DATA', function () { return 3; }); def('HAVE_ENOUGH_DATA', function () { return 4; });
    def('NETWORK_EMPTY', function () { return 0; }); def('NETWORK_IDLE', function () { return 1; }); def('NETWORK_LOADING', function () { return 2; }); def('NETWORK_NO_SOURCE', function () { return 3; });

    el.play = function () {
      return new Promise(function (ok, no) {
        if (st.err) { no(new DOMException('The media could not be played.', 'NotSupportedError')); return; }
        var was = st.paused;
        if (!st.loaded) { st.paused = false; load(); if (!st.loaded) { st.paused = true; no(new DOMException('There is nothing to play.', 'NotSupportedError')); return; } }
        if (st.ended) { st.ended = false; st.t = 0; cmd({ op: 'seek', t: 0 }); }
        st.paused = false; st.at = performance.now();
        if (was) { fire('play'); }
        st.waiters.push([ok, no]);
        cmd({ op: 'play' });
      });
    };
    el.pause = function () {
      if (!st.paused) { st.t = now(); st.at = performance.now(); st.paused = true; if (st.loaded) cmd({ op: 'pause' }); fire('timeupdate'); fire('pause'); }
      var w = st.waiters; st.waiters = []; for (var i = 0; i < w.length; i++) w[i][1](abortError());
    };
    el.load = function () { st.paused = !el.hasAttribute('autoplay'); load(); };
    el.fastSeek = function (t) { el.currentTime = t; };
    el.canPlayType = function (t) {
      t = String(t || '').toLowerCase();
      if (!t) return '';
      return /^(video|audio)\/(webm|ogg|mp4|mpeg|mp3|x-m4a|m4a|aac|flac|x-flac|wav|x-wav|wave|opus|x-matroska|matroska|quicktime|3gpp|x-msvideo|avi|aiff|x-aiff)/.test(t) ? 'probably'
        : /^(video|audio)\//.test(t) ? 'maybe' : '';
    };
    el.setSinkId = function () { return Promise.resolve(); };
    el.addTextTrack = function () { return { mode: 'disabled', cues: [], addCue: function () {}, removeCue: function () {} }; };
    el.captureStream = undefined;
    el.requestVideoFrameCallback = isVideo ? function (cb) {
      var id = setTimeout(function () { var t = performance.now(); cb(t, { mediaTime: now(), presentedFrames: 0, width: st.w, height: st.h, presentationTime: t, expectedDisplayTime: t }); }, 33);
      return id;
    } : undefined;
    el.cancelVideoFrameCallback = function (id) { clearTimeout(id); };

    // a src set as an attribute (in the page's HTML, setAttribute, or the src property) loads it, like a <video>
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var a = list[i].attributeName;
        if (a === 'src') {
          // already loading this address (src set, then play() straight away): nothing to do
          var s0 = el.getAttribute('src');
          if (st.loaded && s0 && absURL(s0) === st.src) continue;
          if (!st.loaded && !s0) continue;
          st.paused = !el.hasAttribute('autoplay') && !(st.loaded === false && !st.paused);
          setTimeout(function () { var s1 = el.getAttribute('src'); if (st.loaded && s1 && absURL(s1) === st.src) return; load(); }, 0);
          continue;
        }
        if (a === 'loop') cmd({ op: 'loop', loop: el.hasAttribute('loop') });
        if (a === 'poster') poster();
        if (a === 'style' || a === 'class' || a === 'width' || a === 'height') fit();
      }
    }).observe(el, { attributes: true, attributeFilter: ['src', 'loop', 'poster', 'style', 'class', 'width', 'height'] });
    if (window.ResizeObserver && isVideo) { try { new ResizeObserver(fit).observe(el); } catch (x) {} }
    if (el.getAttribute('src') || (el.querySelector && el.querySelector('source[src]'))) { st.paused = !el.hasAttribute('autoplay'); setTimeout(load, 0); }
    else poster();
    return el;
  }

  // ---------------------------------------------------------------- every <video> and <audio>, however made
  var create = Document.prototype.createElement;
  Document.prototype.createElement = function (name) {
    var e = create.apply(this, arguments);
    if (typeof name === 'string' && /^(video|audio)$/i.test(name)) upgrade(e);
    return e;
  };
  var createNS = Document.prototype.createElementNS;
  Document.prototype.createElementNS = function (ns, name) {
    var e = createNS.apply(this, arguments);
    if (typeof name === 'string' && /^(video|audio)$/i.test(name) && (!ns || /xhtml/.test(ns))) upgrade(e);
    return e;
  };
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.localName === 'video' || root.localName === 'audio') upgrade(root);
    var list = root.querySelectorAll('video,audio'); for (var i = 0; i < list.length; i++) upgrade(list[i]);
  }
  new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var add = list[i].addedNodes; for (var j = 0; j < add.length; j++) if (add[j].nodeType === 1) scan(add[j]);
      var rm = list[i].removedNodes;
      for (var k = 0; k < rm.length; k++) {
        var n = rm[k]; if (n.nodeType !== 1) continue;
        var gone = (n.localName === 'video' || n.localName === 'audio') ? [n] : (n.querySelectorAll ? [].slice.call(n.querySelectorAll('video,audio')) : []);
        gone.forEach(function (m) { if (m.__km && !m.isConnected && !m.__km.paused) { setTimeout(function () { if (!m.isConnected && m.__km && !m.__km.paused) m.pause(); }, 0); } });
      }
    }
  }).observe(document, { childList: true, subtree: true });
  if (document.documentElement) scan(document.documentElement);
  document.addEventListener('DOMContentLoaded', function () { scan(document.documentElement); });
  window.addEventListener('pagehide', function () { for (var id in players) { try { players[id].__km.cmd({ op: 'destroy' }); } catch (x) {} } });

  // new Audio(src), and the names pages test for
  window.Audio = function Audio(src) { var a = document.createElement('audio'); if (src !== undefined) a.setAttribute('src', src); a.setAttribute('preload', 'auto'); return a; };
  function Stub() { throw new TypeError('Illegal constructor'); }
  if (typeof window.HTMLMediaElement === 'undefined') {
    window.HTMLMediaElement = Stub; window.HTMLVideoElement = Stub; window.HTMLAudioElement = Stub;
    [Stub].forEach(function (S) {
      S.HAVE_NOTHING = 0; S.HAVE_METADATA = 1; S.HAVE_CURRENT_DATA = 2; S.HAVE_FUTURE_DATA = 3; S.HAVE_ENOUGH_DATA = 4;
      S.NETWORK_EMPTY = 0; S.NETWORK_IDLE = 1; S.NETWORK_LOADING = 2; S.NETWORK_NO_SOURCE = 3;
      Object.defineProperty(S, Symbol.hasInstance, { value: function (o) { return !!(o && o.__km); } });
    });
  }

  // a <video> drawn on a canvas: its current picture
  function frameOf(v) { return v && v.__km ? (v.__km.img && v.__km.img.complete && v.__km.img.naturalWidth ? v.__km.img : null) : v; }
  var C2 = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C2) {
    var draw = C2.drawImage;
    C2.drawImage = function (img) {
      if (img && img.__km) { var f = frameOf(img); if (!f) return; var a = [].slice.call(arguments); a[0] = f; return draw.apply(this, a); }
      return draw.apply(this, arguments);
    };
  }
  if (window.createImageBitmap) {
    var cib = window.createImageBitmap;
    window.createImageBitmap = function (img) {
      if (img && img.__km) { var a = [].slice.call(arguments); a[0] = frameOf(img) || new ImageData(1, 1); return cib.apply(window, a); }
      return cib.apply(window, arguments);
    };
  }

  // the camera: getUserMedia gives a stream a <video> can show (video only; Kibble has no microphone capture yet)
  var md = navigator.mediaDevices || (function () { try { Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true }); } catch (x) {} return navigator.mediaDevices; })();
  if (md) {
    var listeners = {};
    md.addEventListener = md.addEventListener || function (t, f) { (listeners[t] = listeners[t] || []).push(f); };
    md.removeEventListener = md.removeEventListener || function (t, f) { listeners[t] = (listeners[t] || []).filter(function (x) { return x !== f; }); };
    if (!md.getUserMedia) md.getUserMedia = function (c) {
      c = c || {};
      if (!c.video) return Promise.reject(new DOMException('Kibble can’t capture sound yet.', 'NotSupportedError'));
      var track = { kind: 'video', label: 'Camera', enabled: true, readyState: 'live', stop: function () { track.readyState = 'ended'; (track.__users || []).forEach(function (v) { try { v.pause(); v.srcObject = null; } catch (x) {} }); },
        getSettings: function () { return { width: 1280, height: 720 }; }, applyConstraints: function () { return Promise.resolve(); }, addEventListener: function () {}, removeEventListener: function () {} };
      var stream = { id: 'kibble-camera-' + (++seq), active: true, __device: '', getTracks: function () { return [track]; }, getVideoTracks: function () { return [track]; }, getAudioTracks: function () { return []; },
        addEventListener: function () {}, removeEventListener: function () {} };
      track.__users = [];
      return Promise.resolve(stream);
    };
    if (!md.enumerateDevices) md.enumerateDevices = function () { return Promise.resolve([]); };
  }

  window.__kibbleMedia = {
    ev: function (m) { var el = players[m.pid]; if (el && el.__km) el.__km.ev(m); },
  };
})();

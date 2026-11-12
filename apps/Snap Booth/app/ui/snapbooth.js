'use strict';
const $ = (s) => document.querySelector(s);
const ask = (o) => api.invoke('ui:message', o);

const cam = $('#cam'), view = $('#view'), ctx = view.getContext('2d');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let stream = null, mode = 'photo', fx = 'none', busy = false, recorder = null, recStart = 0, recTimer = 0;

// effects are canvas filters, so a picture is saved exactly as it looks on screen
const FX = [['none', 'Normal', 'none'], ['bw', 'Black & White', 'grayscale(1) contrast(1.1)'], ['sepia', 'Sepia', 'sepia(.9) contrast(1.05)'], ['noir', 'Noir', 'grayscale(1) contrast(1.6) brightness(.9)'], ['pop', 'Pop', 'saturate(2.2) contrast(1.15)'], ['fade', 'Faded', 'saturate(.7) contrast(.85) brightness(1.15)'], ['cool', 'Cool', 'hue-rotate(-20deg) saturate(1.3)'], ['warm', 'Warm', 'sepia(.35) saturate(1.5) hue-rotate(-10deg)'], ['invert', 'X-Ray', 'invert(1) grayscale(1)'], ['dream', 'Dreamy', 'blur(1.5px) brightness(1.15) saturate(1.4)'], ['psy', 'Psychedelic', 'hue-rotate(140deg) saturate(3)']];
const filterOf = () => FX.find((f) => f[0] === fx)[2];

function showMsg(title, text) { const m = $('#msg'); m.textContent = ''; const b = document.createElement('b'); b.textContent = title; const p = document.createElement('div'); p.textContent = text; m.append(b, p); m.classList.remove('hidden'); $('#shutter').disabled = true; }
async function start(deviceId) {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) {
    return showMsg(e.name === 'NotAllowedError' ? 'Snap Booth can’t use the camera' : 'No camera found', e.name === 'NotAllowedError' ? 'Camera access was blocked.' : 'Plug in a camera, or check that no other app is using it.');
  }
  $('#msg').classList.add('hidden'); $('#shutter').disabled = false; cam.srcObject = stream; await cam.play().catch(() => {});
  const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); const sel = $('#cams'); const cur = stream.getVideoTracks()[0].getSettings().deviceId; sel.textContent = '';
  cams.forEach((d, i) => { const o = document.createElement('option'); o.value = d.deviceId; o.textContent = d.label || `Camera ${i + 1}`; sel.append(o); }); sel.value = cur; sel.classList.toggle('hidden', cams.length < 2);
}
$('#cams').onchange = (e) => start(e.target.value);

// ---------------------------------------------------------------- backgrounds
// Like a photo booth's backdrops: Snap Booth first looks at the empty scene ("step out of the picture for a
// moment"), then anything that differs from it — you — goes in front of the background you chose.
const MW = 192;                         // the mask is worked out small, then smoothed up to full size
let bg = null;                          // { id, img } (img: an <img>, or 'blur')
let plate = null;                       // the empty scene: Float32Array of RGB at mask size
let mask = null;                        // last mask (Float32Array 0..1), for steadiness between frames
let learning = false;
const small = document.createElement('canvas'), sctx = small.getContext('2d', { willReadFrequently: true });
const maskC = document.createElement('canvas'), mctx = maskC.getContext('2d');
const person = document.createElement('canvas'), pctx = person.getContext('2d');
function sizeSmall() { const mh = Math.max(1, Math.round(MW * cam.videoHeight / cam.videoWidth)); if (small.width !== MW || small.height !== mh) { small.width = maskC.width = MW; small.height = maskC.height = mh; plate = null; mask = null; } }
function grabSmall() { sctx.save(); sctx.translate(MW, 0); sctx.scale(-1, 1); sctx.drawImage(cam, 0, 0, MW, small.height); sctx.restore(); return sctx.getImageData(0, 0, MW, small.height).data; }
function coach(title, sub, good) { const c = $('#coach'); $('#coach-t').textContent = title; $('#coach-s').textContent = sub || ''; c.classList.toggle('good', !!good); c.classList.remove('hidden'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; }
const uncoach = () => $('#coach').classList.add('hidden');
async function learnScene() {
  if (learning || !cam.videoWidth) return;
  learning = true; plate = null; mask = null;
  try {
    coach('Step out of the picture for a moment', 'while I set up your background…');
    await sleep(2600);
    sizeSmall();
    const n = small.width * small.height, acc = new Float32Array(n * 3);
    const frames = 12;
    for (let f = 0; f < frames; f++) { const d = grabSmall(); for (let i = 0; i < n; i++) { acc[i * 3] += d[i * 4]; acc[i * 3 + 1] += d[i * 4 + 1]; acc[i * 3 + 2] += d[i * 4 + 2]; } await sleep(70); }
    for (let i = 0; i < acc.length; i++) acc[i] /= frames;
    plate = acc;
    coach('Good to go!', 'Come on back into the picture.', true);
    await sleep(2000); uncoach();
  } finally { learning = false; }
}
function updateMask() {
  const d = grabSmall(), n = small.width * small.height;
  if (!mask) mask = new Float32Array(n);
  const img = mctx.createImageData(small.width, small.height);
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], pr = plate[i * 3], pg = plate[i * 3 + 1], pb = plate[i * 3 + 2];
    // colour difference, a little forgiving of brightness changes (shadows, the camera adjusting itself)
    const l = (r + g + b) / 3, pl = (pr + pg + pb) / 3;
    const chroma = Math.abs((r - l) - (pr - pl)) + Math.abs((g - l) - (pg - pl)) + Math.abs((b - l) - (pb - pl));
    const diff = chroma * 1.6 + Math.abs(l - pl) * 0.9;
    const a = Math.max(0, Math.min(1, (diff - 26) / 34));
    mask[i] = mask[i] * 0.45 + a * 0.55;
    img.data[i * 4 + 3] = Math.round(mask[i] * 255);
  }
  mctx.putImageData(img, 0, 0);
}
function drawBackground(c, w, h) {
  if (bg.img === 'blur') {
    // your own room, softly out of focus
    c.save(); c.filter = 'blur(14px)'; c.translate(w, 0); c.scale(-1, 1); c.drawImage(cam, -20, -20, w + 40, h + 40); c.restore(); return;
  }
  const im = bg.img, k = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const iw = im.naturalWidth * k, ih = im.naturalHeight * k;
  c.drawImage(im, (w - iw) / 2, (h - ih) / 2, iw, ih);
}

// live picture: mirrored, with the background and the effect, drawn every frame
function draw() {
  if (cam.videoWidth) {
    if (view.width !== cam.videoWidth) { view.width = cam.videoWidth; view.height = cam.videoHeight; }
    const w = view.width, h = view.height;
    if (bg && plate && !learning) {
      sizeSmall();
      if (plate) {
        updateMask();
        if (person.width !== w) { person.width = w; person.height = h; }
        pctx.globalCompositeOperation = 'source-over';
        pctx.clearRect(0, 0, w, h);
        pctx.save(); pctx.translate(w, 0); pctx.scale(-1, 1); pctx.drawImage(cam, 0, 0); pctx.restore();
        pctx.globalCompositeOperation = 'destination-in';
        pctx.filter = 'blur(3px)'; pctx.imageSmoothingQuality = 'high';
        pctx.drawImage(maskC, 0, 0, w, h);
        pctx.filter = 'none';
        ctx.save(); ctx.filter = filterOf();
        drawBackground(ctx, w, h);
        ctx.drawImage(person, 0, 0);
        ctx.restore();
      }
    } else {
      ctx.save(); ctx.filter = filterOf(); ctx.translate(w, 0); ctx.scale(-1, 1); ctx.drawImage(cam, 0, 0); ctx.restore();
    }
  }
  requestAnimationFrame(draw);
}
draw();

// the backgrounds bar
const bgbar = $('#bgbar');
function bgButton(id, name, preview, onpick) {
  const b = document.createElement('button'); b.dataset.id = id;
  const pv = document.createElement('div'); pv.className = 'pv';
  if (preview && preview.startsWith('file:')) pv.style.backgroundImage = `url("${preview}")`; else pv.textContent = preview || '';
  const sp = document.createElement('span'); sp.textContent = name;
  b.append(pv, sp); b.onclick = onpick; bgbar.append(b); return b;
}
const markBg = (id) => { for (const x of bgbar.children) x.classList.toggle('on', x.dataset.id === id); };
async function useBackground(id, img) {
  bg = img ? { id, img } : null; markBg(id || 'none');
  if (!bg) { plate = null; mask = null; uncoach(); return; }
  if (!plate) await learnScene();
}
(async () => {
  bgButton('none', 'No Background', '∅', () => useBackground(null));
  bgButton('blur', 'Blur', '◌', () => useBackground('blur', 'blur'));
  for (const w of await api.invoke('backdrops')) {
    const img = new Image(); img.src = w.url;
    bgButton(w.url, w.name, w.url, () => useBackground(w.url, img));
  }
  bgButton('own', 'Your Own…', '＋', async () => {
    const u = await api.invoke('backdrop:choose'); if (!u) return;
    const img = new Image(); img.src = u; await img.decode().catch(() => {});
    useBackground('own', img);
  });
  bgButton('again', 'Start Over', '↺', () => { if (bg) learnScene(); });
  markBg('none');
})();
$('#bgbtn').onclick = () => { bgbar.classList.toggle('hidden'); fxbar.classList.add('hidden'); };

// effects bar
const fxbar = $('#fxbar');
for (const [id, name] of FX) { const b = document.createElement('button'); b.dataset.id = id; const c = document.createElement('canvas'); c.width = 84; c.height = 56; const s = document.createElement('span'); s.textContent = name; b.append(c, s); b.onclick = () => { fx = id; for (const x of fxbar.children) x.classList.toggle('on', x.dataset.id === id); }; fxbar.append(b); }
fxbar.children[0].classList.add('on');
setInterval(() => { if (fxbar.classList.contains('hidden') || !cam.videoWidth) return; for (const b of fxbar.children) { const c = b.firstChild.getContext('2d'); c.filter = FX.find((f) => f[0] === b.dataset.id)[2]; c.save(); c.translate(84, 0); c.scale(-1, 1); c.drawImage(cam, 0, 0, 84, 56); c.restore(); } }, 300);
$('#fx').onclick = () => { fxbar.classList.toggle('hidden'); $('#bgbar').classList.add('hidden'); };

// modes
for (const b of $('#modes').children) b.onclick = () => { if (recorder) return; mode = b.dataset.m; for (const x of $('#modes').children) x.classList.toggle('on', x === b); };
async function countdown(n) { const c = $('#count'); c.classList.remove('hidden'); for (let i = n; i > 0; i--) { c.textContent = i; await sleep(900); } c.classList.add('hidden'); }
async function flash() { const f = $('#flash'); f.classList.add('on'); await sleep(60); f.classList.remove('on'); }
const toBytes = (cv, type = 'image/png') => new Promise((res) => cv.toBlob(async (b) => res(new Uint8Array(await b.arrayBuffer())), type));
function snap() { const c = document.createElement('canvas'); c.width = view.width; c.height = view.height; c.getContext('2d').drawImage(view, 0, 0); return c; }

async function takePhoto() { await countdown(3); await flash(); const c = snap(); addThumb(await api.invoke('save', 'photo', await toBytes(c))); }
async function takeStrip() {
  const shots = [];
  for (let i = 0; i < 4; i++) { await countdown(i === 0 ? 3 : 2); await flash(); shots.push(snap()); }
  const w = 480, h = Math.round(480 * view.height / view.width), pad = 18, c = document.createElement('canvas'); c.width = w + pad * 2; c.height = (h + pad) * 4 + pad;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  shots.forEach((s, i) => g.drawImage(s, pad, pad + i * (h + pad), w, h));
  addThumb(await api.invoke('save', 'strip', await toBytes(c)));
}
async function toggleMovie() {
  const btn = $('#shutter');
  if (recorder) { recorder.stop(); return; }
  await countdown(3);
  const out = view.captureStream(30); const chunks = [];
  recorder = new MediaRecorder(out, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = async () => { clearInterval(recTimer); $('#rec').classList.add('hidden'); btn.classList.remove('recording'); recorder = null; const blob = new Blob(chunks, { type: 'video/webm' }); addThumb(await api.invoke('save', 'video', new Uint8Array(await blob.arrayBuffer()))); busy = false; };
  recorder.start(1000); recStart = Date.now(); btn.classList.add('recording'); $('#rec').classList.remove('hidden');
  recTimer = setInterval(() => { const s = Math.floor((Date.now() - recStart) / 1000); $('#rect').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500);
}
$('#shutter').onclick = async () => {
  if (mode === 'video') { if (busy && !recorder) return; busy = true; return toggleMovie(); }
  if (busy) return; busy = true; try { await (mode === 'strip' ? takeStrip() : takePhoto()); } finally { busy = false; }
};

// shelf of what was taken
const shelf = $('#shelf');
async function addThumb(item, front = true) {
  const e = shelf.querySelector('.empty'); if (e) e.remove();
  const t = document.createElement('div'); t.className = 'th' + (item.video ? ' video' : ''); t.title = item.name;
  t.style.backgroundImage = item.video ? 'linear-gradient(#333,#111)' : `url("${await api.invoke('url', item.path)}")`;
  t.ondblclick = () => api.invoke('open', item.path);
  t.oncontextmenu = async (ev) => { ev.preventDefault(); const r = await ask({ type: 'question', message: `Move “${item.name}” to the Trash?`, buttons: ['Cancel', 'Move to Trash'], defaultId: 1, cancelId: 0 }); if (r.response === 1 && await api.invoke('remove', item.path)) t.remove(); };
  front ? shelf.prepend(t) : shelf.append(t);
}
(async () => { const l = await api.invoke('list'); if (!l.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Your photos and movies will appear here.'; shelf.append(e); } for (const i of l) await addThumb(i, false); })();
start();

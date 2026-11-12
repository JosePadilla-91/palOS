// BrushBoard — Python worker manager.
// Each extension runs in its own Python process (crash isolation). A "core" worker handles
// high-bit-depth I/O, PSD, RAW and colour management. Workers speak line-delimited JSON-RPC on
// stdio; pixel buffers travel through files in /dev/shm (RAM-backed) instead of the pipe.
'use strict';
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SHM_ROOT = fs.existsSync('/dev/shm') ? '/dev/shm' : os.tmpdir();
const BUF_DIR = path.join(SHM_ROOT, `brushboard-${process.pid}`);
fs.mkdirSync(BUF_DIR, { recursive: true });
let bufCounter = 0;

function cleanupBufDir() { try { fs.rmSync(BUF_DIR, { recursive: true, force: true }); } catch { /* ignore */ } }
process.on('exit', cleanupBufDir);

// ------------------------------------------------------------------ minimal TOML (manifest subset)
function parseToml(text) {
  const out = {}; let cur = out;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/^\s+|\s+$/g, '');
    if (!line || line.startsWith('#')) continue;
    const sec = line.match(/^\[([^\]]+)\]$/);
    if (sec) { cur = out; for (const k of sec[1].split('.')) { cur[k] = cur[k] || {}; cur = cur[k]; } continue; }
    const kv = line.match(/^([A-Za-z0-9_\-]+)\s*=\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2];
    if (val.startsWith('[') && !val.endsWith(']')) {
      while (i + 1 < lines.length && !val.trim().endsWith(']')) val += lines[++i];
    }
    cur[kv[1]] = parseTomlValue(val.trim());
  }
  return out;
}
function parseTomlValue(v) {
  v = v.replace(/\s+#.*$/, '');
  if (v.startsWith('"') || v.startsWith("'")) return v.slice(1, v.lastIndexOf(v[0]));
  if (v === 'true') return true; if (v === 'false') return false;
  if (v.startsWith('[')) {
    const inner = v.slice(1, v.lastIndexOf(']'));
    const items = []; const re = /"([^"]*)"|'([^']*)'|([^,\s]+)/g; let m;
    while ((m = re.exec(inner))) items.push(m[1] ?? m[2] ?? parseTomlValue(m[3]));
    return items;
  }
  const n = Number(v); return Number.isFinite(n) ? n : v;
}

// ------------------------------------------------------------------ buffers
function toNodeBuffer(data) {
  if (!data) return Buffer.alloc(0);
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  throw new Error('Unsupported buffer type');
}
function writeBuffers(buffers) {
  const out = {};
  for (const [name, b] of Object.entries(buffers || {})) {
    const file = path.join(BUF_DIR, `in-${++bufCounter}.raw`);
    fs.writeFileSync(file, toNodeBuffer(b.data));
    out[name] = { path: file, width: b.width, height: b.height, channels: b.channels || 4, dtype: b.dtype || 'float32' };
  }
  return out;
}
function readBuffers(descs) {
  const out = {};
  for (const [name, d] of Object.entries(descs || {})) {
    const buf = fs.readFileSync(d.path);
    try { fs.unlinkSync(d.path); } catch { /* ignore */ }
    out[name] = { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), width: d.width, height: d.height, channels: d.channels, dtype: d.dtype || 'float32' };
  }
  return out;
}

// ------------------------------------------------------------------ worker
class Worker {
  constructor(mgr, id, args, env) {
    this.mgr = mgr; this.id = id; this.args = args; this.env = env;
    this.proc = null; this.pending = new Map(); this.nextId = 1; this.buf = '';
    this.alive = false; this.stderrTail = [];
  }
  start() {
    const py = this.mgr.pythonPath();
    if (!py) throw new Error('No Python interpreter found. Run "npm run setup:python" or set one in Preferences.');
    const env = Object.assign({}, process.env, this.env, {
      PYTHONPATH: [this.mgr.appPythonDir, this.env.EXTRA_PYTHONPATH || '', process.env.PYTHONPATH || ''].filter(Boolean).join(path.delimiter),
      PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1', OPENCV_IO_ENABLE_OPENEXR: '1',
      BRUSHBOARD_BUF_DIR: BUF_DIR,
      // AI models: 'auto' uses an NVIDIA GPU when one works, 'cpu' forces the processor
      BRUSHBOARD_AI_DEVICE: process.env.BRUSHBOARD_AI_DEVICE || ((this.mgr.getPrefs && this.mgr.getPrefs()) || {}).aiDevice || 'auto',
      // optional GPU pack (CUDA / OpenVINO / ROCm) installed from Preferences: put in front of the bundled CPU runtime
      BRUSHBOARD_AI_PACK: process.env.BRUSHBOARD_AI_PACK ?? (((this.mgr.getPrefs && this.mgr.getPrefs()) || {}).aiPack || ''),
    });
    this.stopping = false;
    this.proc = spawn(py, ['-u', '-m', 'brushboard.worker', ...this.args], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    this.alive = true;
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (d) => this.onData(d));
    this.proc.stderr.setEncoding('utf8');
    this.proc.stderr.on('data', (d) => {
      this.mgr.log(`[${this.id}]`, d.trimEnd());
      this.stderrTail.push(d); if (this.stderrTail.length > 40) this.stderrTail.shift();
      if (!this.stopping) this.mgr.onEvent({ worker: this.id, event: 'log', params: { text: d } });
    });
    this.proc.on('exit', (code, sig) => {
      this.alive = false;
      const err = new Error(`Python worker "${this.id}" exited (${sig || code}).\n${this.stderrTail.join('').slice(-2000)}`);
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
      if (!this.stopping) this.mgr.onEvent({ worker: this.id, event: 'exit', params: { code, signal: sig } }); // a worker we stopped on purpose is not news
    });
    this.proc.on('error', (e) => { this.alive = false; this.mgr.log('spawn error', e.message); });
  }
  ensure() { if (!this.alive) this.start(); }
  onData(chunk) {
    this.buf += chunk;
    let nl;
    while ((nl = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, nl); this.buf = this.buf.slice(nl + 1);
      if (!line.trim()) continue;
      let msg; try { msg = JSON.parse(line); } catch { this.mgr.log(`[${this.id}] non-JSON:`, line); continue; }
      this.onMessage(msg);
    }
  }
  onMessage(msg) {
    if (msg.event) { if (!this.stopping) this.mgr.onEvent({ worker: this.id, event: msg.event, params: msg.params || {} }); return; }
    if (msg.method) { // python → host request
      let buffers = {};
      try { buffers = readBuffers(msg.buffers); } catch (e) { this.mgr.log('readBuffers', e.message); }
      this.mgr.onHostRequest({ worker: this.id, id: msg.id, method: msg.method, params: msg.params || {}, buffers });
      return;
    }
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    if (msg.error) {
      const e = new Error(msg.error.message || 'Python error'); e.traceback = msg.error.traceback; p.reject(e);
    } else {
      let buffers = {};
      try { buffers = readBuffers(msg.buffers); } catch (e) { return p.reject(e); }
      p.resolve({ result: msg.result, buffers });
    }
  }
  send(obj) { this.proc.stdin.write(JSON.stringify(obj) + '\n'); }
  call(method, params, buffers, timeoutMs = 0) {
    this.ensure();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      let bufDescs;
      try { bufDescs = writeBuffers(buffers); } catch (e) { this.pending.delete(id); return reject(e); }
      this.send({ id, method, params, buffers: bufDescs });
      if (timeoutMs) setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`Timeout calling ${method}`)); } }, timeoutMs);
    });
  }
  reply(id, result, error, buffers) {
    if (!this.alive) return;
    const bufDescs = writeBuffers(buffers);
    this.send(error ? { id, error: { message: String(error) } } : { id, result, buffers: bufDescs });
  }
  stop() { this.stopping = true; if (this.proc && this.alive) { try { this.proc.stdin.end(); this.proc.kill('SIGTERM'); } catch { /* ignore */ } } this.alive = false; }
}

// ------------------------------------------------------------------ manager
class PythonManager {
  constructor(opts) {
    Object.assign(this, opts);
    this.workers = new Map();
    this._py = undefined;
    this.extensions = new Map(); // id -> {id, dir, manifest}
  }
  candidates() {
    const prefs = this.getPrefs() || {};
    const home = os.homedir();
    return [
      process.env.BRUSHBOARD_PYTHON,
      prefs.pythonPath,
      path.join(this.bundledRuntime, 'bin/python3'),            // shipped inside the app: always complete
      path.join(home, '.local/share/brushboard/venv/bin/python3'),
      '/usr/bin/python3',
      'python3',
    ].filter(Boolean);
  }
  pythonPath() {
    if (this._py !== undefined) return this._py;
    // Prefer the first interpreter that actually has BrushBoard's libraries; a bare system Python only as a last resort.
    let fallback = null;
    const probe = 'import sys; assert sys.version_info >= (3, 10); print(sys.executable)\ntry:\n import numpy\n print("numpy")\nexcept Exception:\n pass';
    for (const c of this.candidates()) {
      try {
        if (c.includes('/') && !fs.existsSync(c)) continue;
        const r = spawnSync(c, ['-c', probe], { encoding: 'utf8', timeout: 15000 });
        if (r.status !== 0) continue;
        const [exe, hasNumpy] = r.stdout.trim().split('\n');
        if (hasNumpy === 'numpy') { this._py = exe || c; this.log('using Python', this._py); return this._py; }
        if (!fallback) fallback = exe || c;
      } catch { /* try next */ }
    }
    this._py = fallback; if (fallback) this.log('using Python without numpy (limited)', fallback);
    return this._py;
  }
  worker(id) {
    let w = this.workers.get(id);
    if (w) return w;
    if (id === 'core') w = new Worker(this, 'core', ['--core'], {});
    else if (id === 'setup') w = new Worker(this, 'setup', ['--core'], {}); // long installs (GPU packs) without blocking the core worker
    else {
      const ext = this.extensions.get(id);
      if (!ext) throw new Error(`Unknown extension "${id}"`);
      w = new Worker(this, id, ['--ext', ext.dir], { EXTRA_PYTHONPATH: path.join(ext.dir, '.deps') });
    }
    this.workers.set(id, w);
    return w;
  }
  async status() {
    const py = this.pythonPath();
    if (!py) return { python: null, capabilities: {}, error: 'Python 3.10+ not found' };
    try {
      const r = await this.worker('core').call('capabilities', {}, {}, 30000);
      return { python: py, capabilities: r.result };
    } catch (e) { return { python: py, capabilities: {}, error: e.message }; }
  }
  scanExtensions() {
    this.extensions.clear();
    for (const root of this.extensionDirs) {
      let entries = [];
      try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { continue; }
      for (const ent of entries) {
        if (!ent.isDirectory()) continue;
        const dir = path.join(root, ent.name);
        const mf = path.join(dir, 'brushboard.toml');
        if (!fs.existsSync(mf)) continue;
        try {
          const manifest = parseToml(fs.readFileSync(mf, 'utf8'));
          const id = manifest.id || ent.name;
          this.extensions.set(id, { id, dir, manifest, builtin: root === this.extensionDirs[0] });
        } catch (e) { this.log('bad manifest', mf, e.message); }
      }
    }
  }
  async listExtensions() {
    this.scanExtensions();
    const prefs = this.getPrefs() || {};
    const disabled = new Set(prefs.disabledExtensions || []);
    const out = [];
    for (const ext of this.extensions.values()) {
      const enabled = !disabled.has(ext.id);
      const info = { id: ext.id, dir: ext.dir, builtin: ext.builtin, enabled, manifest: ext.manifest, contributions: null, error: null };
      if (enabled && this.pythonPath()) {
        try {
          const r = await this.worker(ext.id).call('describe', {}, {}, 60000);
          info.contributions = r.result;
        } catch (e) { info.error = e.message; }
      }
      out.push(info);
    }
    return out;
  }
  async reloadExtension(id) {
    const w = this.workers.get(id); if (w) { w.stop(); this.workers.delete(id); }
    this.scanExtensions();
    const r = await this.worker(id).call('describe', {}, {}, 60000);
    return r.result;
  }
  setExtensionEnabled(id, enabled) {
    const prefs = this.getPrefs() || {};
    const set = new Set(prefs.disabledExtensions || []);
    if (enabled) set.delete(id); else { set.add(id); const w = this.workers.get(id); if (w) { w.stop(); this.workers.delete(id); } }
    prefs.disabledExtensions = [...set];
    fs.writeFileSync(path.join(require('electron').app.getPath('userData'), 'preferences.json'), JSON.stringify(prefs, null, 2));
    return true;
  }
  installDeps(id) {
    const ext = this.extensions.get(id);
    if (!ext) return Promise.reject(new Error('Unknown extension'));
    const reqs = ext.manifest.requirements || [];
    if (!reqs.length) return Promise.resolve('No requirements declared.');
    const py = this.pythonPath();
    const run = (extra) => new Promise((resolve, reject) => {
      const p = spawn(py, ['-m', 'pip', 'install', '--disable-pip-version-check', '--upgrade', ...extra, '--target', path.join(ext.dir, '.deps'), ...reqs]);
      let log = '';
      p.stdout.on('data', (d) => { log += d; this.onEvent({ worker: id, event: 'pip', params: { text: String(d) } }); });
      p.stderr.on('data', (d) => { log += d; this.onEvent({ worker: id, event: 'pip', params: { text: String(d) } }); });
      p.on('exit', (code) => code === 0 ? resolve(log) : reject(Object.assign(new Error(log.slice(-3000)), { log })));
    });
    // Ubuntu's system Python is "externally managed" (PEP 668); installing into the extension's own
    // .deps folder is safe, so retry with --break-system-packages if pip refuses.
    return run([]).catch((e) => (/externally.managed/i.test(e.log || e.message) ? run(['--break-system-packages']) : Promise.reject(e)));
  }
  installExtension(srcDir) {
    const mf = path.join(srcDir, 'brushboard.toml');
    if (!fs.existsSync(mf)) throw new Error('That folder has no brushboard.toml manifest.');
    const manifest = parseToml(fs.readFileSync(mf, 'utf8'));
    const id = manifest.id || path.basename(srcDir);
    const dest = path.join(this.extensionDirs[this.extensionDirs.length - 1], id);
    fs.cpSync(srcDir, dest, { recursive: true, filter: (s) => !s.includes('__pycache__') });
    return id;
  }
  async runScript(scriptPath) {
    const id = `script:${path.basename(scriptPath)}:${Date.now()}`;
    const w = new Worker(this, id, ['--script', scriptPath], {});
    this.workers.set(id, w);
    try { return (await w.call('run', {}, {})).result; }
    finally { w.stop(); this.workers.delete(id); }
  }
  setupVenv() {
    const sys = ['/usr/bin/python3', 'python3'].find((c) => spawnSync(c, ['--version']).status === 0);
    if (!sys) return Promise.reject(new Error('python3 not found on this system'));
    const venv = path.join(os.homedir(), '.local/share/brushboard/venv');
    const reqFile = path.join(this.appPythonDir, 'requirements.txt');
    const run = (cmd, args) => new Promise((resolve, reject) => {
      const p = spawn(cmd, args);
      const emit = (d) => this.onEvent({ worker: 'core', event: 'pip', params: { text: String(d) } });
      p.stdout.on('data', emit); p.stderr.on('data', emit);
      p.on('exit', (c) => c === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} failed (${c})`)));
    });
    return run(sys, ['-m', 'venv', venv])
      .then(() => run(path.join(venv, 'bin/python3'), ['-m', 'pip', 'install', '--upgrade', 'pip']))
      .then(() => run(path.join(venv, 'bin/python3'), ['-m', 'pip', 'install', '-r', reqFile]))
      .then(() => { this.restartAll(); return venv; });
  }
  call(workerId, method, params, buffers) {
    return this.worker(workerId).call(method, params, buffers);
  }
  hostReply(workerId, id, result, error, buffers) {
    const w = this.workers.get(workerId); if (w) w.reply(id, result, error, buffers);
    return true;
  }
  restartAll() {
    for (const w of this.workers.values()) w.stop();
    this.workers.clear(); this._py = undefined;
    return true;
  }
  shutdown() { for (const w of this.workers.values()) w.stop(); this.workers.clear(); cleanupBufDir(); }
}

module.exports = { PythonManager, parseToml };

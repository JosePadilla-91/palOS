'use strict';
/* palOS: the app's language, and Save/Open/message panels as sheets */ try { require('/opt/paladin-seeker/app/main/dialog-hook.js'); } catch (_) {}
// Passkeys: saved passwords (the keyrings), SSH keys, encryption (GPG) keys and certificates.
const { app, BrowserWindow, Menu, ipcMain, clipboard, nativeTheme, shell } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sheets = require('./sheets');

app.setName('Passkeys');
if (process.platform === 'linux') app.setDesktopName('palos-passkeys.desktop');
let dbus = null;
try { dbus = require('/opt/paladin-seeker/app/node_modules/dbus-next'); } catch { dbus = null; }
const { Variant } = dbus || {};
let win = null;

// ---------------------------------------------------------------- helpers
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 32 * 1024 * 1024, timeout: opts.timeout || 60000, env: { ...process.env, LC_ALL: 'C.UTF-8', ...(opts.env || {}) } }, (err, stdout, stderr) =>
      resolve({ ok: !err, code: err ? (err.code ?? 1) : 0, out: String(stdout || ''), err: String(stderr || (err && err.message) || '') }));
  });
}
function runInput(cmd, args, input) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { env: { ...process.env, LC_ALL: 'C.UTF-8' } }); let out = '', err = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => resolve({ ok: false, out, err: e.message }));
    p.on('close', (code) => resolve({ ok: code === 0, code, out, err }));
    p.stdin.end(input);
  });
}
const unwrap = (v) => (v instanceof Variant ? unwrap(v.value) : Array.isArray(v) ? v.map(unwrap) : typeof v === 'bigint' ? Number(v) : v);

// ---------------------------------------------------------------- Secret Service (saved passwords)
const SS = 'org.freedesktop.secrets';
let bus = null, session = null;
async function ss() {
  if (!dbus) throw new Error('D-Bus isn’t available.');
  if (!bus) { bus = dbus.sessionBus(); bus.on('error', () => {}); }
  if (!session) {
    const svc = await iface('/org/freedesktop/secrets', 'org.freedesktop.Secret.Service');
    const [, s] = await svc.OpenSession('plain', new Variant('s', ''));
    session = s;
  }
  return bus;
}
const objCache = new Map();
async function obj(p) { if (!objCache.has(p)) objCache.set(p, await bus.getProxyObject(SS, p)); return objCache.get(p); }
async function iface(p, name) { await (bus || (bus = dbus.sessionBus())); return (await obj(p)).getInterface(name); }
async function props(p, name) { const o = await obj(p); const pi = o.getInterface('org.freedesktop.DBus.Properties'); const all = await pi.GetAll(name); const out = {}; for (const [k, v] of Object.entries(all)) out[k] = unwrap(v); return out; }

/** Runs a Secret Service prompt (the keyring's own password window) and waits for it. */
async function prompt(p) {
  if (!p || p === '/') return { dismissed: false };
  const pr = await iface(p, 'org.freedesktop.Secret.Prompt');
  return new Promise((resolve) => {
    const done = (dismissed, result) => { pr.removeListener('Completed', done); resolve({ dismissed, result: unwrap(result) }); };
    pr.on('Completed', done);
    pr.Prompt('').catch(() => resolve({ dismissed: true }));
  });
}

async function keyrings() {
  await ss();
  const svc = await props('/org/freedesktop/secrets', 'org.freedesktop.Secret.Service');
  let def = '/';
  try { def = await (await iface('/org/freedesktop/secrets', 'org.freedesktop.Secret.Service')).ReadAlias('default'); } catch {}
  const out = [];
  for (const c of svc.Collections || []) {
    if (c.endsWith('/session')) continue;
    try { const p = await props(c, 'org.freedesktop.Secret.Collection'); out.push({ path: c, label: p.Label || path.basename(c), locked: !!p.Locked, count: (p.Items || []).length, isDefault: c === def }); } catch {}
  }
  return out.sort((a, b) => (b.isDefault - a.isDefault) || a.label.localeCompare(b.label));
}
const ACCOUNT_KEYS = ['username_value', 'username', 'user', 'account', 'login', 'email', 'uid'];
const WHERE_KEYS = ['origin_url', 'signon_realm', 'server', 'host', 'url', 'domain', 'service', 'application', 'xdg:schema'];
async function items(col) {
  await ss();
  const p = await props(col, 'org.freedesktop.Secret.Collection');
  const out = [];
  for (const it of p.Items || []) {
    try {
      const ip = await props(it, 'org.freedesktop.Secret.Item');
      const a = ip.Attributes || {};
      out.push({ path: it, label: ip.Label || '(no name)', account: ACCOUNT_KEYS.map((k) => a[k]).find(Boolean) || '', where: WHERE_KEYS.map((k) => a[k]).find(Boolean) || '', attributes: a, created: ip.Created * 1000, modified: ip.Modified * 1000, locked: !!ip.Locked });
    } catch {}
  }
  return { locked: !!p.Locked, items: out.sort((x, y) => x.label.localeCompare(y.label)) };
}
async function unlock(p) {
  await ss();
  const svc = await iface('/org/freedesktop/secrets', 'org.freedesktop.Secret.Service');
  const [, pr] = await svc.Unlock([p]);
  const r = await prompt(pr);
  return !r.dismissed;
}
async function lock(p) {
  await ss();
  const svc = await iface('/org/freedesktop/secrets', 'org.freedesktop.Secret.Service');
  const [, pr] = await svc.Lock([p]); await prompt(pr); return true;
}
async function secret(itemPath) {
  await ss();
  const it = await iface(itemPath, 'org.freedesktop.Secret.Item');
  const ip = await props(itemPath, 'org.freedesktop.Secret.Item');
  if (ip.Locked) { if (!(await unlock(itemPath))) return null; }
  const s = await it.GetSecret(session);
  return Buffer.from(s[2]).toString('utf8');
}

// ---------------------------------------------------------------- SSH keys
const SSH = path.join(os.homedir(), '.ssh');
async function sshKeys() {
  let names = []; try { names = fs.readdirSync(SSH).filter((n) => n.endsWith('.pub')); } catch {}
  const out = [];
  for (const n of names) {
    const pub = path.join(SSH, n), priv = pub.slice(0, -4);
    const r = await run('ssh-keygen', ['-l', '-f', pub]);
    const m = r.out.trim().match(/^(\d+)\s+(\S+)\s+(.*)\s+\((\w+)\)$/);
    let st = null; try { st = fs.statSync(pub); } catch {}
    out.push({ name: path.basename(priv), pub, priv: fs.existsSync(priv) ? priv : null, bits: m ? +m[1] : null, fingerprint: m ? m[2] : '', comment: m ? m[3] : '', type: m ? m[4] : '', created: st ? st.mtimeMs : 0 });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
async function sshNew({ name, comment, passphrase, type }) {
  if (!/^[\w.-]{1,64}$/.test(name || '')) return { error: 'Use letters, numbers, dots, dashes or underscores for the name.' };
  const file = path.join(SSH, name);
  if (fs.existsSync(file) || fs.existsSync(file + '.pub')) return { error: `There is already a key called “${name}”.` };
  fs.mkdirSync(SSH, { recursive: true, mode: 0o700 });
  const args = type === 'rsa' ? ['-t', 'rsa', '-b', '4096'] : ['-t', 'ed25519'];
  const r = await run('ssh-keygen', [...args, '-C', comment || `${os.userInfo().username}@${os.hostname()}`, '-N', passphrase || '', '-f', file, '-q']);
  return r.ok ? { ok: true } : { error: r.err.trim() || 'The key couldn’t be made.' };
}

// ---------------------------------------------------------------- GPG keys
function parseColons(text) {
  const keys = []; let k = null;
  for (const line of text.split('\n')) {
    const f = line.split(':');
    if (f[0] === 'pub' || f[0] === 'sec') { k = { secret: f[0] === 'sec', validity: f[1], bits: +f[2], algo: f[3], id: f[4], created: +f[5] * 1000, expires: f[6] ? +f[6] * 1000 : null, uids: [], fingerprint: '' }; keys.push(k); }
    else if (f[0] === 'fpr' && k && !k.fingerprint) k.fingerprint = f[9];
    else if (f[0] === 'uid' && k) k.uids.push(f[9].replace(/\\x3a/g, ':'));
  }
  return keys;
}
async function gpgKeys() {
  const pub = await run('gpg', ['--batch', '--list-keys', '--with-colons', '--fixed-list-mode']);
  const sec = await run('gpg', ['--batch', '--list-secret-keys', '--with-colons', '--fixed-list-mode']);
  const secret = new Set(parseColons(sec.out).map((k) => k.fingerprint));
  return parseColons(pub.out).map((k) => ({ ...k, secret: secret.has(k.fingerprint), name: (k.uids[0] || '').replace(/\s*<[^>]*>/, ''), email: ((k.uids[0] || '').match(/<([^>]*)>/) || [])[1] || '' }));
}
async function gpgNew({ name, email, passphrase, expire }) {
  if (!name || !email) return { error: 'Type your name and email address.' };
  const uid = `${name} <${email}>`;
  const args = ['--batch', '--pinentry-mode', 'loopback', '--passphrase-fd', '0', '--quick-gen-key', uid, 'default', 'default', expire || '2y'];
  const r = await runInput('gpg', args, (passphrase || '') + '\n');
  return r.ok ? { ok: true } : { error: (r.err.split('\n').find((l) => /error|failed/i.test(l)) || r.err).trim() || 'The key couldn’t be made.' };
}

// ---------------------------------------------------------------- certificates (read only)
async function certs() {
  const r = await run('trust', ['list', '--filter=ca-anchors']);
  const out = []; let c = null;
  for (const line of r.out.split('\n')) {
    if (line.startsWith('pkcs11:')) { c = { id: line.trim() }; out.push(c); }
    else if (c) { const m = line.match(/^\s+(\w+):\s*(.*)$/); if (m) c[m[1]] = m[2]; }
  }
  return out.filter((x) => x.label).sort((a, b) => a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------- IPC
const guard = (fn) => async (e, ...a) => { try { return await fn(...a); } catch (err) { return { error: String(err && err.message || err).replace(/^.*?: /, '') }; } };
ipcMain.handle('keyrings', guard(keyrings));
ipcMain.handle('items', guard((p) => items(p)));
ipcMain.handle('unlock', guard((p) => unlock(p)));
ipcMain.handle('lock', guard((p) => lock(p)));
ipcMain.handle('secret', guard((p) => secret(p)));
ipcMain.handle('copySecret', guard(async (p) => { const s = await secret(p); if (s == null) return false; clipboard.writeText(s); setTimeout(() => { if (clipboard.readText() === s) clipboard.clear(); }, 60000); return true; }));
ipcMain.handle('deleteItem', guard(async (p) => { await ss(); const it = await iface(p, 'org.freedesktop.Secret.Item'); const pr = await it.Delete(); await prompt(pr); objCache.delete(p); return true; }));
ipcMain.handle('newItem', guard(async ({ keyring, label, account, where, password }) => {
  await ss();
  const col = await iface(keyring, 'org.freedesktop.Secret.Collection');
  const attrs = { 'xdg:schema': 'org.palos.Passkeys.Password' }; if (account) attrs.username = account; if (where) attrs.server = where;
  const propsIn = { 'org.freedesktop.Secret.Item.Label': new Variant('s', label), 'org.freedesktop.Secret.Item.Attributes': new Variant('a{ss}', attrs) };
  const [, pr] = await col.CreateItem(propsIn, [session, Buffer.alloc(0), Buffer.from(password || '', 'utf8'), 'text/plain'], false);
  await prompt(pr); return true;
}));
ipcMain.handle('updateSecret', guard(async (p, password) => { await ss(); const it = await iface(p, 'org.freedesktop.Secret.Item'); await it.SetSecret([session, Buffer.alloc(0), Buffer.from(password, 'utf8'), 'text/plain']); return true; }));
ipcMain.handle('newKeyring', guard(async (label) => {
  await ss(); const svc = await iface('/org/freedesktop/secrets', 'org.freedesktop.Secret.Service');
  const [, pr] = await svc.CreateCollection({ 'org.freedesktop.Secret.Collection.Label': new Variant('s', label) }, ''); const r = await prompt(pr); return !r.dismissed;
}));
ipcMain.handle('deleteKeyring', guard(async (p) => { await ss(); const c = await iface(p, 'org.freedesktop.Secret.Collection'); const pr = await c.Delete(); await prompt(pr); return true; }));
ipcMain.handle('changeKeyringPassword', guard(async (p) => {
  await ss(); const o = await obj('/org/freedesktop/secrets');
  const g = o.getInterface('org.gnome.keyring.InternalUnsupportedGuiltRiddenInterface');
  const pr = await g.ChangeWithPrompt(p); const r = await prompt(pr); return !r.dismissed;
}));
ipcMain.handle('ssh', guard(sshKeys));
ipcMain.handle('sshNew', guard(sshNew));
ipcMain.handle('sshCopy', guard((pub) => { clipboard.writeText(fs.readFileSync(pub, 'utf8').trim()); return true; }));
ipcMain.handle('sshDelete', guard(async (k) => { for (const f of [k.priv, k.pub].filter(Boolean)) await shell.trashItem(f); return true; }));
ipcMain.handle('gpg', guard(gpgKeys));
ipcMain.handle('gpgNew', guard(gpgNew));
ipcMain.handle('gpgCopy', guard(async (fpr) => { const r = await run('gpg', ['--batch', '--armor', '--export', fpr]); clipboard.writeText(r.out); return r.ok; }));
ipcMain.handle('gpgExport', guard(async (fpr, name) => {
  const s = await sheets.save(win, { defaultPath: path.join(os.homedir(), 'Documents', `${(name || 'key').replace(/[\\/:*?"<>|]/g, '')} public key.asc`) });
  if (!s || s.canceled || !s.filePath) return false;
  const r = await run('gpg', ['--batch', '--armor', '--export', fpr]); fs.writeFileSync(s.filePath, r.out); return true;
}));
ipcMain.handle('gpgImport', guard(async () => {
  const s = await sheets.open(win, { properties: ['openFile'], defaultPath: path.join(os.homedir(), 'Downloads') });
  if (!s || s.canceled || !s.filePaths || !s.filePaths[0]) return false;
  const r = await run('gpg', ['--batch', '--import', s.filePaths[0]]);
  return r.ok ? true : { error: r.err.trim().split('\n').pop() };
}));
ipcMain.handle('gpgDelete', guard(async (k) => {
  const args = ['--batch', '--yes', k.secret ? '--delete-secret-and-public-key' : '--delete-keys', k.fingerprint];
  const r = await run('gpg', args); return r.ok ? true : { error: r.err.trim().split('\n').pop() };
}));
ipcMain.handle('certs', guard(certs));
ipcMain.handle('copyText', (e, t) => { clipboard.writeText(String(t)); return true; });
ipcMain.handle('ui:message', (e, o) => sheets.message(win, o));
ipcMain.handle('ui:prompt', (e, o) => sheets.prompt(win, o));

// ---------------------------------------------------------------- window
function create() {
  win = new BrowserWindow({ width: 960, height: 620, minWidth: 720, minHeight: 420, title: 'Passkeys', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2e343b' : '#eef0f2', icon: '/usr/share/icons/hicolor/256x256/apps/palos-passkeys.png',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; app.quit(); });
  const send = (c) => () => win && win.webContents.send('cmd', c);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'New Password…', accelerator: 'Ctrl+N', click: send('newPassword') }, { label: 'New Keyring…', click: send('newKeyring') }, { label: 'New SSH Key…', click: send('newSsh') }, { label: 'New Encryption Key…', click: send('newGpg') }, { label: 'Import Encryption Key…', click: send('importGpg') }, { type: 'separator' }, { label: 'Close', accelerator: 'Ctrl+W', click: () => win && win.close() }, { label: 'Quit Passkeys', accelerator: 'Ctrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [{ role: 'cut', label: 'Cut' }, { role: 'copy', label: 'Copy' }, { role: 'paste', label: 'Paste' }, { role: 'selectAll', label: 'Select All' }, { type: 'separator' }, { label: 'Find', accelerator: 'Ctrl+F', click: send('find') }] },
    { label: 'View', submenu: [{ label: 'Refresh', accelerator: 'Ctrl+R', click: send('refresh') }] },
    { label: 'Window', submenu: [{ role: 'minimize', label: 'Minimize', accelerator: 'Ctrl+M' }] },
  ]));
}
if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } }); app.whenReady().then(create); }

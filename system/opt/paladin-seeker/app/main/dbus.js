'use strict';
// Thin layer over dbus-next: raw calls, signal routing, and a small object server that
// gives us the caller's bus name (needed for the AppMenu registrar and tray watcher).
const dbus = require('dbus-next');
const { Message, Variant } = dbus;

const T = { CALL: 1, RETURN: 2, ERROR: 3, SIGNAL: 4 };
let bus = null;
const objects = new Map();           // path -> { iface -> { methods, props, signals, xml } }
const signalHandlers = [];
const nameWatchers = [];

function get() {
  if (bus) return bus;
  bus = dbus.sessionBus();
  bus.on('error', (e) => console.error('[dbus]', e.message));
  bus.on('message', (m) => {
    if (m.type === T.SIGNAL) {
      if (m.interface === 'org.freedesktop.DBus' && m.member === 'NameOwnerChanged') nameWatchers.forEach((f) => { try { f(...m.body); } catch {} });
      for (const h of signalHandlers) { try { h(m); } catch (e) { console.error('[dbus signal]', e); } }
    }
  });
  bus.addMethodHandler(dispatch);
  addMatch("type='signal',sender='org.freedesktop.DBus',member='NameOwnerChanged'");
  return bus;
}

function unwrap(v) {
  if (v instanceof Variant) return unwrap(v.value);
  if (Array.isArray(v)) return v.map(unwrap);
  if (Buffer.isBuffer(v)) return v;
  if (v && typeof v === 'object' && v.constructor === Object) { const o = {}; for (const k of Object.keys(v)) o[k] = unwrap(v[k]); return o; }
  return v;
}

async function call(dest, path, iface, member, signature = '', body = [], timeout = 4000) {
  const msg = new Message({ destination: dest, path, interface: iface, member, signature, body });
  let timer;
  const reply = await Promise.race([
    get().call(msg),
    new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`D-Bus timeout: ${dest} ${member}`)), timeout); }),
  ]).finally(() => clearTimeout(timer));
  return reply ? reply.body : [];
}

function send(dest, path, iface, member, signature = '', body = []) {
  const msg = new Message({ destination: dest, path, interface: iface, member, signature, body, flags: dbus.MessageFlag.NO_REPLY_EXPECTED });
  get().send(msg);
}

function addMatch(rule) { return call('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus', 'AddMatch', 's', [rule]).catch(() => {}); }
function onSignal(fn) { get(); signalHandlers.push(fn); }
function onNameOwnerChanged(fn) { get(); nameWatchers.push(fn); }

async function requestName(name) {
  // flags: 4 = DO_NOT_QUEUE. Result 1 = primary owner, 4 = already owner.
  const [r] = await call('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus', 'RequestName', 'su', [name, 4]);
  return r === 1 || r === 4;
}
async function nameHasOwner(name) {
  try { const [r] = await call('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus', 'NameHasOwner', 's', [name]); return r; } catch { return false; }
}

function emitSignal(path, iface, member, signature = '', body = []) {
  get().send(Message.newSignal(path, iface, member, signature, body));
}

/**
 * Serve an interface. methods: { Name: { in: 'su', out: 's', fn: (args, msg) => [values] | Promise } }
 * props: { Name: { sig: 's', get: () => value } }
 */
function serve(path, iface, { methods = {}, props = {}, signals = {} } = {}) {
  get();
  if (!objects.has(path)) objects.set(path, {});
  objects.get(path)[iface] = { methods, props, signals };
}

function introspect(path) {
  const obj = objects.get(path) || {};
  let xml = '<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">\n<node>\n';
  xml += ' <interface name="org.freedesktop.DBus.Introspectable"><method name="Introspect"><arg type="s" direction="out"/></method></interface>\n';
  xml += ' <interface name="org.freedesktop.DBus.Properties"><method name="Get"><arg type="s" direction="in"/><arg type="s" direction="in"/><arg type="v" direction="out"/></method><method name="GetAll"><arg type="s" direction="in"/><arg type="a{sv}" direction="out"/></method></interface>\n';
  for (const [name, d] of Object.entries(obj)) {
    xml += ` <interface name="${name}">\n`;
    for (const [m, s] of Object.entries(d.methods)) {
      xml += `  <method name="${m}">`;
      for (const t of splitSig(s.in || '')) xml += `<arg type="${t}" direction="in"/>`;
      for (const t of splitSig(s.out || '')) xml += `<arg type="${t}" direction="out"/>`;
      xml += '</method>\n';
    }
    for (const [p, s] of Object.entries(d.props)) xml += `  <property name="${p}" type="${s.sig}" access="read"/>\n`;
    for (const [sname, sig] of Object.entries(d.signals)) { xml += `  <signal name="${sname}">`; for (const t of splitSig(sig)) xml += `<arg type="${t}"/>`; xml += '</signal>\n'; }
    xml += ' </interface>\n';
  }
  // child nodes
  const kids = new Set();
  for (const p of objects.keys()) {
    const prefix = path === '/' ? '/' : path + '/';
    if (p !== path && p.startsWith(prefix)) kids.add(p.slice(prefix.length).split('/')[0]);
  }
  kids.forEach((k) => { xml += ` <node name="${k}"/>\n`; });
  return xml + '</node>\n';
}

function splitSig(sig) {
  const out = []; let i = 0;
  const one = () => {
    const start = i; const c = sig[i++];
    if (c === 'a') one();
    else if (c === '(' || c === '{') { const close = c === '(' ? ')' : '}'; while (sig[i] !== close) one(); i++; }
    return sig.slice(start, i);
  };
  while (i < sig.length) out.push(one());
  return out;
}

function dispatch(msg) {
  const isIntrospect = msg.interface === 'org.freedesktop.DBus.Introspectable' && msg.member === 'Introspect';
  const known = objects.has(msg.path) || [...objects.keys()].some((p) => p.startsWith(msg.path === '/' ? '/' : msg.path + '/'));
  if (!known) return false;
  const reply = (sig, body) => get().send(Message.newMethodReturn(msg, sig, body));
  const fail = (name, text) => get().send(Message.newError(msg, name, text));
  if (isIntrospect) { reply('s', [introspect(msg.path)]); return true; }
  if (msg.interface === 'org.freedesktop.DBus.Peer') { reply('', []); return true; }
  const obj = objects.get(msg.path);
  if (!obj) { fail('org.freedesktop.DBus.Error.UnknownObject', 'No such object'); return true; }
  if (msg.interface === 'org.freedesktop.DBus.Properties') {
    const [ifName, prop] = msg.body;
    const d = obj[ifName];
    if (!d) { fail('org.freedesktop.DBus.Error.UnknownInterface', ifName); return true; }
    if (msg.member === 'Get') {
      const p = d.props[prop];
      if (!p) { fail('org.freedesktop.DBus.Error.UnknownProperty', prop); return true; }
      reply('v', [new Variant(p.sig, p.get())]); return true;
    }
    if (msg.member === 'GetAll') {
      const all = {}; for (const [k, p] of Object.entries(d.props)) all[k] = new Variant(p.sig, p.get());
      reply('a{sv}', [all]); return true;
    }
    fail('org.freedesktop.DBus.Error.PropertyReadOnly', 'Read only'); return true;
  }
  const candidates = msg.interface ? [obj[msg.interface]].filter(Boolean) : Object.values(obj);
  for (const d of candidates) {
    const m = d.methods[msg.member];
    if (!m) continue;
    Promise.resolve().then(() => m.fn(msg.body, msg)).then(
      (out) => reply(m.out || '', m.out ? out : []),
      (e) => fail('org.paladin.Seeker.Error', String(e && e.message || e)),
    );
    return true;
  }
  fail('org.freedesktop.DBus.Error.UnknownMethod', `${msg.interface}.${msg.member}`);
  return true;
}

module.exports = { get, call, send, addMatch, onSignal, onNameOwnerChanged, requestName, nameHasOwner, emitSignal, serve, unwrap, Variant, T };

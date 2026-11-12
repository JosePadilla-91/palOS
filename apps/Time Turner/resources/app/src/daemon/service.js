'use strict';
// System D-Bus service with polkit authorisation.
//
//   bus name   com.timeturner.Daemon
//   object     /com/timeturner/Daemon
//   interface  com.timeturner.Daemon1
//
// Every method takes one string (JSON arguments) and returns one string (JSON
// result). Progress and state changes go out as the Event(s) signal.
const dbus = require('dbus-next');
const { Message, Variant } = dbus;
const { logger, TTError, run } = require('./util');

const NAME = 'com.timeturner.Daemon';
const OBJ = '/com/timeturner/Daemon';
const IFACE = 'com.timeturner.Daemon1';
const ERR = 'com.timeturner.Error';

const TEST_MODE = process.env.TT_BUS === 'session' && process.env.TT_INSECURE_TEST === '1';

function introspectXml(methodNames) {
  const methods = methodNames.map(n =>
    `<method name="${n}"><arg name="args" type="s" direction="in"/><arg name="result" type="s" direction="out"/></method>`).join('');
  return `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node><interface name="${IFACE}">${methods}<signal name="Event"><arg name="event" type="s"/></signal></interface>
<interface name="org.freedesktop.DBus.Introspectable"><method name="Introspect"><arg name="xml" type="s" direction="out"/></method></interface>
<interface name="org.freedesktop.DBus.Peer"><method name="Ping"/></interface></node>`;
}

class Service {
  /**
   * methods: { Name: { auth, handler(args, ctx) } }
   *   auth: 'any' | 'root' | a polkit action id
   *   ctx:  { sender, uid, home }
   */
  constructor(methods) {
    this.methods = methods;
    this.bus = null;
    this.userCache = new Map();
  }

  async start() {
    this.bus = process.env.TT_BUS === 'session' ? dbus.sessionBus() : dbus.systemBus();
    this.bus.on('error', err => logger.error('D-Bus error:', err));
    const reply = await this.bus.requestName(NAME, 0x4 /* DO_NOT_QUEUE */);
    if (reply !== 1 && reply !== 4) throw new Error(`could not own ${NAME} (reply ${reply})`);
    this.bus.addMethodHandler(msg => this.onMessage(msg));
    logger.info(`listening on the ${process.env.TT_BUS === 'session' ? 'session' : 'system'} bus as ${NAME}`);
    if (TEST_MODE) logger.warn('TEST MODE: authorisation checks are disabled');
  }

  emit(event) {
    if (!this.bus) return;
    try {
      this.bus.send(Message.newSignal(OBJ, IFACE, 'Event', 's', [JSON.stringify(event)]));
    } catch (err) { logger.warn('signal failed:', err.message); }
  }

  onMessage(msg) {
    if (msg.path !== OBJ) return false;
    if (msg.interface === 'org.freedesktop.DBus.Introspectable' && msg.member === 'Introspect') {
      this.bus.send(Message.newMethodReturn(msg, 's', [introspectXml(Object.keys(this.methods))]));
      return true;
    }
    if (msg.interface === 'org.freedesktop.DBus.Peer' && msg.member === 'Ping') {
      this.bus.send(Message.newMethodReturn(msg, '', []));
      return true;
    }
    if (msg.interface && msg.interface !== IFACE) return false;
    const m = this.methods[msg.member];
    if (!m) return false;
    this.dispatch(msg, m);
    return true;
  }

  async dispatch(msg, m) {
    try {
      const args = msg.body?.[0] ? JSON.parse(msg.body[0]) : {};
      const ctx = await this.context(msg.sender);
      await this.authorise(m.auth, ctx, msg.member);
      const result = await m.handler(args, ctx);
      this.bus.send(Message.newMethodReturn(msg, 's', [JSON.stringify(result ?? null)]));
    } catch (err) {
      const code = err.code && /^[a-z-]+$/.test(err.code) ? err.code : 'internal';
      if (code === 'internal') logger.error(`${msg.member} failed:`, err);
      else logger.info(`${msg.member}: ${code}: ${err.message}`);
      const name = `${ERR}.${code.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase())}`;
      this.bus.send(Message.newError(msg, name, JSON.stringify({ code, message: err.message })));
    }
  }

  async callBus(dest, path, iface, member, signature, body) {
    const reply = await this.bus.call(new Message({ destination: dest, path, interface: iface, member, signature, body }));
    return reply.body;
  }

  async context(sender) {
    const [uid] = await this.callBus('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus',
      'GetConnectionUnixUser', 's', [sender]);
    return { sender, uid, home: await this.homeOf(uid) };
  }

  async homeOf(uid) {
    if (this.userCache.has(uid)) return this.userCache.get(uid);
    let home = null;
    try {
      const line = (await run('getent', ['passwd', String(uid)])).trim();
      home = line.split(':')[5] || null;
    } catch { /* unknown user */ }
    if (process.env.TT_TEST_HOME && TEST_MODE) home = process.env.TT_TEST_HOME;
    this.userCache.set(uid, home);
    return home;
  }

  async authorise(auth, ctx, member) {
    if (auth === 'any') return;
    if (ctx.uid === 0) return;
    if (auth === 'root') throw new TTError('not-authorized', `${member} is only available to root`);
    if (TEST_MODE) return;
    // polkit CheckAuthorization(subject, action_id, details, flags=AllowUserInteraction, cancellation_id)
    const subject = ['system-bus-name', { name: new Variant('s', ctx.sender) }];
    let result;
    try {
      [result] = await this.callBus('org.freedesktop.PolicyKit1', '/org/freedesktop/PolicyKit1/Authority',
        'org.freedesktop.PolicyKit1.Authority', 'CheckAuthorization', '(sa{sv})sa{ss}us', [subject, auth, {}, 1, '']);
    } catch (err) {
      throw new TTError('not-authorized', `Could not check permissions: ${err.message}`);
    }
    const [authorized, challenge] = result;
    if (!authorized) throw new TTError(challenge ? 'auth-cancelled' : 'not-authorized', 'Authentication was cancelled or failed');
  }
}

module.exports = { Service, NAME, OBJ, IFACE };

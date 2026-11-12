'use strict';
// Talks to time-turnerd over the system D-Bus.
const { EventEmitter } = require('events');
const dbus = require('dbus-next');
const { Message } = dbus;

const NAME = 'com.timeturner.Daemon';
const OBJ = '/com/timeturner/Daemon';
const IFACE = 'com.timeturner.Daemon1';

class DaemonError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

class DaemonClient extends EventEmitter {
  constructor() {
    super();
    this.bus = null;
    this.connecting = null;
  }

  connect() {
    if (this.bus) return Promise.resolve(this.bus);
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      const bus = process.env.TT_BUS === 'session' ? dbus.sessionBus() : dbus.systemBus();
      bus.on('error', err => { this.emit('error', err); this.bus = null; });
      await bus.call(new Message({
        destination: 'org.freedesktop.DBus', path: '/org/freedesktop/DBus', interface: 'org.freedesktop.DBus',
        member: 'AddMatch', signature: 's',
        body: [`type='signal',sender='${NAME}',path='${OBJ}',interface='${IFACE}',member='Event'`],
      }));
      bus.on('message', msg => {
        if (msg.type !== dbus.MessageType.SIGNAL || msg.interface !== IFACE || msg.member !== 'Event') return;
        try { this.emit('event', JSON.parse(msg.body[0])); } catch { /* ignore malformed */ }
      });
      this.bus = bus;
      return bus;
    })().finally(() => { this.connecting = null; });
    return this.connecting;
  }

  /** Call a daemon method. Rejects DaemonError with a stable .code. */
  async call(method, args = {}) {
    let bus;
    try { bus = await this.connect(); } catch (err) {
      throw new DaemonError('daemon-unavailable', `Can't reach Time Turner's background service: ${err.message}`);
    }
    try {
      const reply = await bus.call(new Message({
        destination: NAME, path: OBJ, interface: IFACE, member: method, signature: 's', body: [JSON.stringify(args)],
      }));
      return JSON.parse(reply.body[0]);
    } catch (err) {
      if (err.type?.startsWith('com.timeturner.Error.')) {
        try {
          const { code, message } = JSON.parse(err.text);
          throw new DaemonError(code, message);
        } catch (parsed) {
          if (parsed instanceof DaemonError) throw parsed;
        }
      }
      if (/ServiceUnknown|NameHasNoOwner|NoReply/.test(err.type || '')) {
        throw new DaemonError('daemon-unavailable', "Time Turner's background service isn't running.");
      }
      throw new DaemonError('internal', err.text || err.message);
    }
  }
}

module.exports = { DaemonClient, DaemonError };

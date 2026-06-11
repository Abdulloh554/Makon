const config = require('../config');

const levels = { error: 0, warn: 1, info: 2, debug: 3 };

class Logger {
  constructor() {
    this.level = config.isDev ? 'debug' : 'info';
  }

  _log(level, msg, meta) {
    if (levels[level] > levels[this.level]) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: msg,
      ...(meta && { meta }),
    };
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  info(msg, meta) { this._log('info', msg, meta); }
  warn(msg, meta) { this._log('warn', msg, meta); }
  error(msg, meta) { this._log('error', msg, meta); }
  debug(msg, meta) { this._log('debug', msg, meta); }
}

module.exports = new Logger();

import { config } from '../config'

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  meta?: Record<string, unknown>
}

const levels: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 }

class Logger {
  private readonly level: LogLevel

  constructor() {
    this.level = (config.isDev ? 'debug' : 'info') as LogLevel
  }

  private _log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (levels[level] > levels[this.level]) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: msg,
    }
    if (meta && Object.keys(meta).length > 0) {
      entry.meta = meta
    }

    if (config.isDev) {
      const prefix = `[${level.toUpperCase()}]`
      const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
      switch (level) {
        case 'error':
          console.error(`${prefix} ${msg}${metaStr}`)
          break
        case 'warn':
          console.warn(`${prefix} ${msg}${metaStr}`)
          break
        default:
          console.log(`${prefix} ${msg}${metaStr}`)
      }
    } else {
      const output = JSON.stringify(entry)
      console.log(output)
    }
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    this._log('info', msg, meta)
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    this._log('warn', msg, meta)
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    this._log('error', msg, meta)
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    this._log('debug', msg, meta)
  }
}

export const logger = new Logger()

import type { LogEntry } from '../types'

const MAX_LOGS = 200

class CentralLogger {
  private logs: LogEntry[] = []
  private originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  }

  intercept() {
    const push = (level: LogEntry['level'], args: unknown[], stack?: string) => {
      const message = args
        .map((a) => {
          try {
            return typeof a === 'object' ? JSON.stringify(a) : String(a)
          } catch {
            return '[unserializable]'
          }
        })
        .join(' ')

      this.logs.push({ level, message, timestamp: Date.now(), stack })
      if (this.logs.length > MAX_LOGS) this.logs.shift()
    }

    console.log = (...args: unknown[]) => {
      this.originalConsole.log(...args)
      push('log', args)
    }

    console.warn = (...args: unknown[]) => {
      this.originalConsole.warn(...args)
      push('warn', args)
    }

    console.error = (...args: unknown[]) => {
      this.originalConsole.error(...args)
      const stack = args.find((a) => a instanceof Error)
        ? (args.find((a) => a instanceof Error) as Error).stack
        : undefined
      push('error', args, stack)
    }

    window.addEventListener('error', (e) => {
      push('error', [`Uncaught: ${e.message} at ${e.filename}:${e.lineno}`], e.error?.stack)
    })

    window.addEventListener('unhandledrejection', (e) => {
      push('error', [`UnhandledRejection: ${e.reason}`], e.reason?.stack)
    })
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clear() {
    this.logs = []
  }
}

export const logger = new CentralLogger()

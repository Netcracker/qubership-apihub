import { ConsoleLogger, Logger, type LogLevel } from '@nestjs/common'
import { format } from 'node:util'

const LEVEL_NAMES: Record<LogLevel, string> = {
  verbose: 'TRACE',
  debug: 'DEBUG',
  log: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  fatal: 'FATAL',
}

// toISOString() always returns UTC: 2026-10-28T14:03:12.345Z. The format drops the trailing "Z".
const TIMESTAMP_LENGTH = 23

/**
 * Writes Nest log records in the APIHUB log line format. The Nest logger context becomes the class field.
 * The builder serves no incoming requests and runs on one thread, so the request and thread fields stay empty.
 */
export class ApihubLogger extends ConsoleLogger {
  constructor() {
    super({ colors: false })
  }

  protected printMessages(
    messages: unknown[],
    context = '',
    logLevel: LogLevel = 'log',
    writeStreamType?: 'stdout' | 'stderr',
  ): void {
    // Nest prints each extra argument as a record of its own; one call makes one line here.
    const text = messages
      .map(message => typeof message === 'string' ? message : this.stringifyMessage(message, logLevel))
      .join(' ')
    process[writeStreamType ?? 'stdout'].write(formatLogLine(new Date(), logLevel, context, text))
  }
}

/**
 * Sends console output, which the API processor and other libraries write, through the Nest logger,
 * so it gets the same line format.
 */
export function redirectConsoleToLogger(): void {
  const logger = new Logger()
  console.log = (...args: unknown[]) => logger.log(format(...args))
  console.info = (...args: unknown[]) => logger.log(format(...args))
  console.warn = (...args: unknown[]) => logger.warn(format(...args))
  console.error = (...args: unknown[]) => logger.error(format(...args))
  console.debug = (...args: unknown[]) => logger.debug(format(...args))
}

function formatLogLine(timestamp: Date, logLevel: LogLevel, className: string, message: string): string {
  const time = timestamp.toISOString().slice(0, TIMESTAMP_LENGTH)
  return `[${time}] [${LEVEL_NAMES[logLevel]}] [request_id=] [tenant_id=] [thread_id=] [class=${className}] ${message}\n`
}

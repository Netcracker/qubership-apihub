type AsyncApiLogMethod = (...args: unknown[]) => void

export type AsyncApiLogger = {
  debug: AsyncApiLogMethod
  info: AsyncApiLogMethod
  warn: AsyncApiLogMethod
  error: AsyncApiLogMethod
}

const noop: AsyncApiLogMethod = () => {}

export const createAsyncApiLogger = (enabled = false): AsyncApiLogger => {
  if (!enabled) {
    return {
      debug: noop,
      info: noop,
      warn: noop,
      error: noop,
    }
  }

  return {
    debug: (...args) => console.debug(...args),
    info: (...args) => console.info(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
  }
}

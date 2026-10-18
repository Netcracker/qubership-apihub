type LogMethod = (...args: unknown[]) => void

export type BuildingServiceLogger = {
  debug: LogMethod
  info: LogMethod
  warn: LogMethod
  error: LogMethod
}

const noop: LogMethod = () => {}

export const createBuildingServiceLogger = (enabled = false): BuildingServiceLogger => {
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

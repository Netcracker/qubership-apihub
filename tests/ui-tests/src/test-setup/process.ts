/**
 * Optional path to a Chrome/Chromium binary (`CHROME_EXECUTABLE_PATH`).
 * When unset or blank, Playwright uses the bundled Chromium.
 */
export const getChromeExecutablePath = (): string | undefined => {
  return process.env.CHROME_EXECUTABLE_PATH?.trim() || undefined
}

/**
 * Returns the value of a required environment variable.
 * Throws if it is missing or blank.
 */
export const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Required environment variable "${name}" is missing or empty. Set it before running tests.`,
    )
  }
  return value
}

/**
 * **undefined** (*default*) - create only Non-Reusable test data
 *
 * **all** - create both reusable and Non-Reusable test data
 *
 * **skip** - skip test data creation
 */
export const CREATE_TD = process.env.CREATE_TD as 'all' | 'skip' | undefined

/**
 * **undefined** (*default*) - clear only Non-Reusable test data
 *
 * **all** - clear both reusable and Non-Reusable test data
 *
 * **skip** - skip test data clearing
 */
export const CLEAR_TD = process.env.CLEAR_TD as 'all' | 'skip' | undefined

/** Skip reason when `CREATE_TD === 'skip'`. */
export const MSG_CREATE_TD_SKIPPED = 'Test Data creation is skipped'

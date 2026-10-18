import { TEST_PREFIX } from '@test-data'
import { CREATE_TD } from '@test-setup'
import { randomString } from './strings'

export const validateTestId = (testId: string): string => {
  if (!/^[A-Z0-9]{4,5}$/g.test(testId)) {
    throw new Error(
      `Test ID is "${testId}"\nBut must be 4 characters long and contain only upper case letters and numbers.`,
    )
  }
  return testId
}

export const randomTestId = (): string => {
  return validateTestId(randomString(4))
}

/**
 * Test ID for reusable test data.
 * Used for identifying test entities and their removal from the database.
 *
 * *Must be **4** characters long and contain only **upper case letters** and **numbers**.*
 */
export const setReusableTestId = async (): Promise<void> => {
  const DEF_TEST_ID = '0000'
  if (process.env.TEST_ID_R) {
    validateTestId(process.env.TEST_ID_R)
    return
  }
  if (CREATE_TD === 'all') {
    process.env.TEST_ID_R = randomTestId()
    return
  }
  process.env.TEST_ID_R = validateTestId(DEF_TEST_ID)
}

/**
 * Test ID for non-reusable test data.
 * Used for identifying test entities and their removal from the database.
 *
 * *Must be **4** characters long and contain only **upper case letters** and **numbers**.*
 */
export const setNonReusableTestId = async (): Promise<void> => {
  if (process.env.TEST_ID_N) {
    process.env.TEST_ID_N = validateTestId(process.env.TEST_ID_N)
    return
  }
  process.env.TEST_ID_N = randomTestId()
}

/**
 * @param name must start with **prefix** and end with "**-{testId}**"
 * @param prefix must include trailing dash, e.g. `1UI-` or `QS-`
 */
export const getTestIdFromName = (name: string, prefix: string = TEST_PREFIX): string | undefined => {
  if (!name.startsWith(prefix)) {
    return
  }
  let idLength!: number
  for (let i = 2; i < name.length; i++) {
    if (name.charAt(name.length - i) === '-') {
      idLength = i - 1
      break
    }
  }
  return name.substring(name.length - idLength)
}

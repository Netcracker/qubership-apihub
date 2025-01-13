/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { TEST_PREFIX } from '@test-data'
import { randomString } from './strings'
import { CREATE_TD } from '@test-setup'

export const validateTestId = (testId: string): string => {
  if (!/^[A-Z0-9]{4,5}$/g.test(testId)) {
    throw new Error(`Test ID is "${testId}"\nBut must be 4 characters long and contain only upper case letters and numbers.`)
  }
  return (testId)
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
export const setReusableTestId = (): string => {
  const DEF_TEST_ID = '0000'
  if (process.env.TEST_ID_R) {
    return validateTestId(process.env.TEST_ID_R)
  }
  if (CREATE_TD === 'all') {
    return randomTestId()
  }
  return validateTestId(DEF_TEST_ID)
}

/**
 * Test ID for non-reusable test data.
 * Used for identifying test entities and their removal from the database.
 *
 * *Must be **4** characters long and contain only **upper case letters** and **numbers**.*
 */
export const setNonReusableTestId = (): string => {
  if (process.env.TEST_ID_N) {
    return validateTestId(process.env.TEST_ID_N)
  }
  return randomTestId()
}

/**
 * @param name must start with **TEST_PREFIX** and end with "**-{testId}**"
 */
export const getTestIdFromName = (name: string): string | undefined => {
  if (!name.startsWith(TEST_PREFIX)) {
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

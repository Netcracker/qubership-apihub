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

export const randomString = (length: number, range?: string): string => {
  const _range = range || '0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    const random = Math.floor(Math.random() * _range.length)
    result += _range.charAt(random)
  }
  return result
}

export const nthPostfix = (nth: number): string => {
  const lastNumber = nth % 10
  if ([11, 12, 13].includes(nth)) {
    return ('th')
  }
  if (lastNumber === 1) {
    return 'st'
  }
  if (lastNumber === 2) {
    return 'nd'
  }
  if (lastNumber === 3) {
    return 'rd'
  }
  return ('th')
}

export const quoteName = (name?: string): string => {
  return name ? `"${name}"` : ''
}

export const isNameHasSkippedChar = (name: string, skippedChars: string): boolean => {
  let result = false
  for (const skippedChar of skippedChars) {
    if (name.includes(skippedChar)) {
      result = true
      break
    }
  }
  return result
}

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

import type { Color } from './types'

export function interpolate(
  inputValue: string,
  params?: Record<string, string>,
): string {
  let interpolatedValue = inputValue

  params && Object.entries(params).forEach(([key, value]) => {
    interpolatedValue = interpolatedValue.replace(
      new RegExp(`([\\w]+)*\\$${key}`),
      value,
    )
  })

  return interpolatedValue
}

export function stringToColor(value: string): Color {
  let hash = 0
  let index

  for (index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash)
  }

  let color = '#'

  for (index = 0; index < 3; index += 1) {
    const value = (hash >> (index * 8)) & 0xff
    color += `00${value.toString(16)}`.slice(-2)
  }

  return color
}

export function toFormattedJsonString(value: object | string): string {
  try {
    return JSON.stringify(
      typeof value === 'string' ? JSON.parse(value) : value,
      undefined,
      2,
    )
  } catch {
    return typeof value === 'string' ? value : value.toString()
  }
}

export function toTitleCase(value: string): string {
  return value.replace(
    /\w\S*/g,
    value => value.charAt(0).toUpperCase() + value.substring(1).toLowerCase(),
  )
}

export const transformStringValue = (value: string | undefined): string => {
  if (!value) {
    return '—'
  }
  return value

}

/**
 * Sequentially replaces placeholders {} with the next substitution value
 * @param template e.g. aaaa/{}/bbbb/{}/cccc
 * @param substitutions e.g. value1, value2
 * @returns e.g. aaaa/value1/bbbb/value2/cccc
 */
export const format = (template: string, ...substitutions: string[]): string => {
  for (const currentSubstitution of substitutions) {
    template = template.replace('{}', currentSubstitution)
  }
  return template
}

type Substitution = {
  [key: string]: string
}

/**
 * Replaces named placeholders (e.g. {placeholderName}) by appropriate substitution value
 *
 * WARNING.
 * 1. If placeholder exists in template and doesn't exist in map - it won't be replaced.
 * 2. If placeholder doesn't exist in template and exists in map - it won't be used
 * 3. Placeholders names are case-sensitive.
 *
 * @param template e.g. aaaa/{first}/bbbb/{second}/cccc
 * @param substitutions e.g. { first: 'value1', second: 'value2' }
 * @returns e.g. aaaa/value1/bbbb/value2/cccc
 */
export const namedFormat = (template: string, substitutions: Substitution = {}): string => {
  Object.keys(substitutions).forEach(key => {
    substitutions[key] && (template = template.replace(`{${key}}`, substitutions[key]))
  })

  return template.replace(/{([\s\S]+?)}/, '')
}

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

export class ArrayUtils {

  public static isEmpty(value: unknown): value is [] {
    if (!Array.isArray(value)) {
      return false
    }

    return value.length === 0
  }

  public static isNotEmpty(value: unknown): value is [unknown, ...unknown[]] {
    if (!Array.isArray(value)) {
      return false
    }

    return value.length > 0
  }

  public static isStringArray(array: unknown[]): array is string[] {
    return array.every(item => typeof item === 'string')
  }

  public static trimLeft(value: string[]): string[] {
    let indexOfLastNonEmptyLine = -1
    for (let i = 0; i < value.length; i++) {
      if (value[i].trim()) {
        indexOfLastNonEmptyLine = i
        break
      }
    }

    return indexOfLastNonEmptyLine > -1
      ? value.slice(indexOfLastNonEmptyLine)
      : []
  }

  public static trimRight(value: string[]): string[] {
    let indexOfLastNonEmptyLine = -1
    for (let i = 0; i < value.length; i++) {
      if (value[i].trim()) {
        indexOfLastNonEmptyLine = i
      }
    }

    return indexOfLastNonEmptyLine > -1
      ? value.slice(0, indexOfLastNonEmptyLine + 1)
      : []
  }

  public static trim(value: string[]): string[] {
    return ArrayUtils.trimRight(ArrayUtils.trimLeft(value))
  }

}

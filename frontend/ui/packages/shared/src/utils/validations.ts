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

const RESTRICTED_ALIAS_SYMBOLS = ['.', ' ', '/', '#', '&']

export const ALIAS_VALIDATION_RULES: Record<string, (alias: string) => boolean | string> = {
  limit: alias => alias.length <= 10 || 'Max number of characters is 10',
  restrictedSymbols: alias => !RESTRICTED_ALIAS_SYMBOLS.find(char => alias.includes(char)) || `Next symbols are restricted — "${RESTRICTED_ALIAS_SYMBOLS}"`,
}

const RESTRICTED_FILENAME_SYMBOLS = ['\\', '/', ':', '*', '?', '"', '<', '>', '|']

export const FILENAME_VALIDATION_RULES: Record<string, (alias: string) => boolean | string> = {
  limit: filename => filename.length <= 256 || 'Max number of characters is 256',
  restrictedSymbols: filename => !RESTRICTED_FILENAME_SYMBOLS.find(char => filename.includes(char)) || `Next symbols are restricted — "${RESTRICTED_FILENAME_SYMBOLS}"`,
}

export const RESTRICTED_VERSION_SYMBOLS = ['\\', '/', ':', '*', '?', '"', '<', '>', '|', '#', '&', '^', '@', '!', '$', '%', '(', ')', '+', '=']

export function checkReleaseVersionFormat(version: string, versionPattern: string): boolean | string {
  const regexp = new RegExp(versionPattern)

  return regexp.test(version) || `Release version must match the following regular expression: ${versionPattern}`
}

export function checkVersionRestrictedSymbols(version: string): boolean | string {
  return !RESTRICTED_VERSION_SYMBOLS.find(char => version.includes(char)) || 'Only \'A-Za-z0-9_.~-\' characters are allowed'
}

export function checkVersionNotEqualToPrevious(version: string, previousVersion: string): boolean | string {
  return version !== previousVersion || 'The version must not be the same as the previous one'
}


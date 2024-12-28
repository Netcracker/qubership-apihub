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

// https://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
export function toTitleCase(str: string): string {
  const articles = ['a', 'an', 'the']
  const conjunctions = ['for', 'and', 'nor', 'but', 'or', 'yet', 'so']
  const prepositions = [
    'with', 'at', 'from', 'into', 'upon', 'of', 'to', 'in', 'for',
    'on', 'by', 'like', 'over', 'plus', 'but', 'up', 'down', 'off', 'near',
  ]

  // The list of spacial characters can be tweaked here
  const replaceCharsWithSpace = (str: string): string => str.replace(/[^0-9a-z&/\\]/gi, ' ').replace(/(\s\s+)/gi, ' ')
  const capitalizeFirstLetter = (str: string): string => str.charAt(0).toUpperCase() + str.substr(1)
  const normalizeStr = (str: string): string => str.trim()
  const shouldCapitalize = (word: string, fullWordList: string[], posWithinStr: number): boolean => {
    if ((posWithinStr === 0) || (posWithinStr === fullWordList.length - 1)) {
      return true
    }

    return !(articles.includes(word) || conjunctions.includes(word) || prepositions.includes(word))
  }

  str = replaceCharsWithSpace(str)
  str = normalizeStr(str)

  let words = str.split(' ')

  if (words.length === 1) { // camelCase scenario
    words = str.split(/([A-Z][a-z]+)/).filter(Boolean)
  }

  if (words.length <= 2) { // Strings less than 3 words long should always have first words capitalized
    words = words.map(w => capitalizeFirstLetter(w))
  } else {
    for (let i = 0; i < words.length; i++) {
      words[i] = (shouldCapitalize(words[i], words, i) ? capitalizeFirstLetter(words[i]) : words[i])
    }
  }

  return words.join(' ').trim()
}

export function toLowerCase(value: unknown): string {
  return `${value}`.toLowerCase()
}

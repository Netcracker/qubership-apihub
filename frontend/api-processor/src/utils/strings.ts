import { isString } from './objects'

// https://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
export function toTitleCase(str: string): string {
  const articles = ['a', 'an', 'the']
  const conjunctions = ['for', 'and', 'nor', 'but', 'or', 'yet', 'so']
  const prepositions = [
    'with', 'at', 'from', 'into', 'upon', 'of', 'to', 'in', 'for',
    'on', 'by', 'like', 'over', 'plus', 'but', 'up', 'down', 'off', 'near',
  ]

  // The list of special characters can be tweaked here
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

export const getStringValue = (value: unknown): string => (isString(value) ? value : '')

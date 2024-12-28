import { curry } from 'lodash'

export const caseInsensitivelyEquals = curry((a: string, b: string) => a.toUpperCase() === b.toUpperCase())

export function slugify(name: string) {
  return name
    .replace(/\/|{|}|\s/g, '-')
    .replace(/-{2,}/, '-')
    .replace(/^-/, '')
    .replace(/-$/, '')
}

export function hashCode(str: string) {
  let hash = 0
  if (str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}

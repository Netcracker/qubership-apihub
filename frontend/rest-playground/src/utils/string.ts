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

/**
 * Replaces placeholders in a string with values from an object
 * @param template - String with placeholders like "{key}"
 * @param values - Object with key-value pairs for replacement
 * @returns String with placeholders replaced by values
 */
export const replacePlaceholders = (template: string, values: Record<string, string>): string => {
  return template.replace(/\{([^}]+)}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match
  })
}

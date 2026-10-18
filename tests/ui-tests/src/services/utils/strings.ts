export const randomString = (length: number, range?: string): string => {
  const _range = range || '0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    const random = Math.floor(Math.random() * _range.length)
    result += _range.charAt(random)
  }
  return result
}

// Need to rename to ordinalPostfix
export const nthPostfix = (nth: number): string => {
  if ((nth % 100) >= 11 && (nth % 100) <= 13) return 'th'
  switch (nth % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
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

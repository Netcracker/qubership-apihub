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

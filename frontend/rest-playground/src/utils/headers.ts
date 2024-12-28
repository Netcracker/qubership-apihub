/**
 * Formats a multi-value header's value, based on https://tools.ietf.org/html/rfc7230#section-7
 * If an argument is a string, or a tuple where the second argument is '', only the key will be serialized.
 * example: `formatMultiValueHeader(['k1', 'v1'], ['k2', '']) === 'k1=v1, k2'
 */
export const formatMultiValueHeader = (...keyValuePairs: ReadonlyArray<readonly [string, string] | string>) => {
  // right now we are assuming that key is a valid token. We might want to implement parsing later.
  // *token* is defined in RFC 7230, section 3.2.6.
  return keyValuePairs
    .map(item => {
      if (typeof item === 'string') return item

      const [key, rawValue] = item
      if (!rawValue) return key

      const needsQuotes = rawValue.indexOf(',') > -1
      const value = needsQuotes ? `"${rawValue}"` : rawValue
      return `${key}=${value}`
    })
    .join(', ')
}

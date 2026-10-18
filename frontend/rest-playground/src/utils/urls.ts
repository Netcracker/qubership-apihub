export function isValidUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Checks if a URL is an absolute HTTP/HTTPS URL.
 */
export function isAbsoluteHttpUrl(url: string): boolean {
  const trimmedUrl = url.trim()
  return /^https?:\/\//i.test(trimmedUrl)
}

/**
 * Validates URL format and blocks dangerous schemes to prevent XSS and file access attacks.
 * Supports relative URLs, protocol-relative URLs, and absolute URLs with web-safe protocols.
 *
 * @param url - The URL string to validate
 * @returns `true` if URL is valid and safe, `false` otherwise
 */
export function isProperUrl(url: string): boolean {
  if (!url) {
    return false
  }

  // Block dangerous schemes (XSS and file access prevention)
  const dangerousSchemes = /^(javascript|data|vbscript|file):/i
  if (dangerousSchemes.test(url)) {
    return false
  }

  // Fast path: relative URLs (most common in OpenAPI)
  // Covers: /path, ../path, path, ?query, #fragment
  if (!url.includes('://') && !url.startsWith('//')) {
    // Allow any relative path, query, or fragment
    return /^[^<>"|\\^`{}\s]*$/.test(url)
  }

  // Protocol-relative URLs: //example.com
  if (url.startsWith('//')) {
    try {
      // Validate by prepending https: and using URL constructor
      new URL('https:' + url)
      return true
    } catch {
      return false
    }
  }

  // Absolute URLs: validate using URL constructor
  try {
    const parsedUrl = new URL(url)

    // Only allow web-safe protocols for absolute URLs
    const allowedProtocols = ['http:', 'https:', 'ws:', 'wss:']
    return allowedProtocols.includes(parsedUrl.protocol)
  } catch {
    return false
  }
}

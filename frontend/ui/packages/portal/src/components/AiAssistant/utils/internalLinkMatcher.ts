const PORTAL_INTERNAL_PATH_PREFIX = '/portal/'

const EPHEMERAL_FILES_PATH_PREFIX = '/api/v1/ephemeral-files/'

export function resolveToUrl(href: string, origin: string): URL {
  return new URL(href, origin)
}

export function isEphemeralFileLink(href: string, origin: string): boolean {
  try {
    const url = resolveToUrl(href, origin)
    return url.pathname.startsWith(EPHEMERAL_FILES_PATH_PREFIX)
  } catch {
    return false
  }
}

export function isInternalPortalLink(href: string, origin: string): boolean {
  if (isEphemeralFileLink(href, origin)) {
    return false
  }
  try {
    const url = resolveToUrl(href, origin)
    return url.origin === origin && url.pathname.startsWith(PORTAL_INTERNAL_PATH_PREFIX)
  } catch {
    return false
  }
}

import type { Params, PathMatch } from 'react-router'
import { matchPath } from 'react-router-dom'

export function isUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

// Check if URL is absolute HTTP/HTTPS
export function isAbsoluteHttpUrl(url: string | undefined): boolean {
  return url ? /^https?:\/\//i.test(url) : false
}

export function matchPathname(pathname: string, patterns: string[]): PathMatch | null {
  let pathMatch: PathMatch<string> | null = null
  patterns.find(pattern => {
    const match = matchPath(`${pattern}*`, pathname)
    if (match) {
      pathMatch = match
    }
  })

  return pathMatch
}

export function replaceParam(
  locationPathname: string,
  params: Params<string>,
  paramKey: string,
  newParamValue: string,
): string | null {
  if (!params[paramKey]) {
    return null
  }

  return locationPathname
    .split('/')
    .map(segment => (segment === params[paramKey] ? newParamValue : segment))
    .join('/')
}

export const APIHUB_NC_BASE_PATH = '/apihub-nc'

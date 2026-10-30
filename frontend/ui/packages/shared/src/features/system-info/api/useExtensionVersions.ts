import { useQueries } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { useMemo } from 'react'
import { findExtensions, SystemExtensionNames, useSystemExtensions } from '../../system-extensions/useSystemExtensions'
import { API_V1, requestJson } from '../../../utils/requests'

const EXTENSION_VERSION_QUERY_KEY = 'extension-version'
const EXTENSION_VERSION_STALE_TIME = 30 * 1000

// The extensions that report a version, in the order System Information lists them.
export const VERSIONED_EXTENSION_NAMES = [
  SystemExtensionNames.apiLinter,
  SystemExtensionNames.agentsBackend,
] as const

export type VersionedExtensionName = typeof VERSIONED_EXTENSION_NAMES[number]

type SystemVersionDto = {
  version: string
}

// What the popup shows is the popup's business: this hook only says where each request stands.
export type ExtensionVersionState = Readonly<
  | { name: VersionedExtensionName; status: 'pending' }
  | { name: VersionedExtensionName; status: 'error' }
  | { name: VersionedExtensionName; status: 'success'; version: string }
>

function getExtensionVersionOptions(
  pathPrefix: string,
  enabled: boolean,
): UseQueryOptions<SystemVersionDto | null, Error> {
  return {
    queryKey: [EXTENSION_VERSION_QUERY_KEY, pathPrefix],
    queryFn: () => requestJson<SystemVersionDto | null>(`/${pathPrefix}${API_V1}/system/version`, {
      method: 'get',
    }, {
      // A registered extension that is down or has no such route is not an error page or a snackbar: the request is made
      // for display only, and the handler leaves the answer to the caller, which gets `null`.
      customErrorHandler: () => undefined,
    }),
    enabled: enabled,
    retry: false,
    staleTime: EXTENSION_VERSION_STALE_TIME,
    refetchOnWindowFocus: false,
  }
}

/**
 * The state of the version request of each extension that this installation registers. An extension that is not
 * registered is not in the list. `enabled: false` keeps the requests back until System Information is opened.
 */
export function useExtensionVersions(enabled: boolean): ExtensionVersionState[] {
  const extensions = useSystemExtensions()
  const registered = useMemo(
    () => VERSIONED_EXTENSION_NAMES.flatMap(name => {
      const extension = findExtensions(extensions, name)
      return extension ? [{ name: name, pathPrefix: extension.pathPrefix }] : []
    }),
    [extensions],
  )

  const results = useQueries({
    queries: registered.map(({ pathPrefix }) => getExtensionVersionOptions(pathPrefix, enabled)),
  })

  return registered.map(({ name }, index): ExtensionVersionState => {
    const { data, isError, isSuccess } = results[index]
    if (isSuccess && data?.version) {
      return { name: name, status: 'success', version: data.version }
    }
    // A handled failure resolves with `null`, and an unreachable service rejects: both are "no answer".
    return { name: name, status: isError || isSuccess ? 'error' : 'pending' }
  })
}

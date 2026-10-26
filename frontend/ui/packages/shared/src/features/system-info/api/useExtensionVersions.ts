/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQueries } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { useMemo } from 'react'
import { findExtensions, useSystemExtensions } from '../../system-extensions/useSystemExtensions'
import { requestJson } from '../../../utils/requests'

const EXTENSION_VERSION_QUERY_KEY = 'extension-version'
const SYSTEM_VERSION_PATH = '/api/v1/system/version'
const EXTENSION_VERSION_STALE_TIME = 30 * 1000

// The extensions that report a version, in the order System Information lists them. The name is the one the backend
// registers the extension under (`extensions[].name` in its configuration).
const VERSIONED_EXTENSIONS = [
  { extensionName: 'api-linter', title: 'API Linter' },
  { extensionName: 'agents-backend', title: 'Agents Backend' },
] as const

type SystemVersionDto = {
  version: string
}

export const EXTENSION_VERSION_NO_DATA = 'no data'

export type ExtensionVersion = Readonly<{
  extensionName: string
  title: string
  // `undefined` while the request is running; EXTENSION_VERSION_NO_DATA when the extension is registered but did not answer.
  version: string | undefined
}>

function getExtensionVersionOptions(
  pathPrefix: string,
  enabled: boolean,
): UseQueryOptions<SystemVersionDto | null, Error, string> {
  return {
    queryKey: [EXTENSION_VERSION_QUERY_KEY, pathPrefix],
    queryFn: () => requestJson<SystemVersionDto | null>(`/${pathPrefix}${SYSTEM_VERSION_PATH}`, {
      method: 'get',
    }, {
      // A registered extension that is down or has no such endpoint is shown as "no data", not as an error page or a
      // snackbar: the request is made for display only.
      customErrorHandler: () => undefined,
    }),
    select: dto => dto?.version || EXTENSION_VERSION_NO_DATA,
    enabled: enabled,
    retry: false,
    staleTime: EXTENSION_VERSION_STALE_TIME,
    refetchOnWindowFocus: false,
  }
}

/**
 * The versions of the extensions that this installation registers. An extension that is not registered has no row.
 * `enabled: false` keeps the requests back until System Information is opened.
 */
export function useExtensionVersions(enabled: boolean): ExtensionVersion[] {
  const extensions = useSystemExtensions()
  const registered = useMemo(
    () => VERSIONED_EXTENSIONS.flatMap(({ extensionName, title }) => {
      const extension = findExtensions(extensions, extensionName)
      return extension ? [{ extensionName: extensionName, title: title, pathPrefix: extension.pathPrefix }] : []
    }),
    [extensions],
  )

  const results = useQueries({
    queries: registered.map(({ pathPrefix }) => getExtensionVersionOptions(pathPrefix, enabled)),
  })

  return registered.map(({ extensionName, title }, index) => {
    const { data, isError } = results[index]
    return { extensionName: extensionName, title: title, version: isError ? EXTENSION_VERSION_NO_DATA : data }
  })
}

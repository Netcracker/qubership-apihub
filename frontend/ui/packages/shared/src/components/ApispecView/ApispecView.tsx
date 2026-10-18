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

import { Box } from '@mui/material'
import type { FC, PropsWithChildren } from 'react'
import { memo, Suspense, useEffect, useMemo, useRef } from 'react'
import { LoadingIndicator } from '../LoadingIndicator'
import { createApiSpecViewElement } from './ApispecViewElement'
import type { ProxyServer } from '../../entities/services'
import { useSetupApiSpecView } from './useSetupApiSpecView'

// First Order Component //
export type ApispecViewProps = PropsWithChildren<{
  apiDescriptionDocument: string
  selectedUri?: string
  sidebarEnabled?: boolean
  searchPhrase?: string
  schemaViewMode?: string
  proxyServer?: ProxyServer
  hideTryIt?: boolean
}>

export const ApispecView: FC<ApispecViewProps> = /* @__PURE__ */ memo<ApispecViewProps>(props => {
  const {
    apiDescriptionDocument,
    selectedUri,
    sidebarEnabled,
    searchPhrase,
    schemaViewMode,
    proxyServer,
    hideTryIt,
  } = props

  const apiSpecViewContainerRef = useRef<HTMLDivElement | null>(null)

  const apiSpecViewElement = useMemo(() => {
    return createApiSpecViewElement({
      apiDescriptionDocument: apiDescriptionDocument,
      hideTryIt: hideTryIt,
      layout: sidebarEnabled ? 'sidebar' : 'partial',
      selectedNodeUri: selectedUri,
      searchPhrase: searchPhrase,
      schemaViewMode: schemaViewMode,
      proxyServer: JSON.stringify(proxyServer),
      router: 'hash',
    })
    // need to create element once -> no deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useSetupApiSpecView(apiSpecViewElement, props)

  useEffect(() => {
    if (!apiSpecViewContainerRef.current) {
      return
    }
    if (apiSpecViewContainerRef.current.childNodes && !apiSpecViewContainerRef.current?.contains(apiSpecViewElement)) {
      apiSpecViewContainerRef.current.appendChild(apiSpecViewElement)
    }
  }, [apiSpecViewContainerRef, apiSpecViewElement])

  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <Box lineHeight={1.5} height="100%">
        <Box ref={apiSpecViewContainerRef}/>
      </Box>
    </Suspense>
  )
})

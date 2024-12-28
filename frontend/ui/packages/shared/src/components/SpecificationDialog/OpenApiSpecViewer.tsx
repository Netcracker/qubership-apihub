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

import type { FC } from 'react'
import { memo } from 'react'
import { Resizable } from 're-resizable'
import { Box } from '@mui/material'
import type { SpecViewMode } from '../SpecViewToggler'
import { DOC_SPEC_VIEW_MODE, RAW_SPEC_VIEW_MODE } from '../SpecViewToggler'
import { ApispecView } from '../ApispecView'
import { SpecNavigation } from './SpecNavigation'
import { RawSpecView } from './RawSpecView'
import type { Spec } from '../../entities/specs'
import type { ProxyServer } from '../../entities/services'
import { useSpecItemUriHashParam } from '../../hooks/hashparams/useSpecItemUriHashParam'

export type OpenApiSpecViewerProps = {
  view: SpecViewMode
  spec: Spec
  value: string
  proxyServer?: ProxyServer
}

export const OPEN_API_VIEW_MODES: SpecViewMode[] = [DOC_SPEC_VIEW_MODE, RAW_SPEC_VIEW_MODE]

export const OpenApiSpecViewer: FC<OpenApiSpecViewerProps> = /* @__PURE__ */ memo<OpenApiSpecViewerProps>(({
  view,
  spec,
  value,
  proxyServer,
}) => {
  const [specItemUri, setSpecItemUri] = useSpecItemUriHashParam()

  if (view === DOC_SPEC_VIEW_MODE) {
    return (
      <ApispecView
        apiDescriptionDocument={value}
        sidebarEnabled
        proxyServer={proxyServer}
      />
    )
  }

  return (
    <Box display="flex" height="100%">
      <Resizable
        style={{
          display: 'inline',
          overflow: 'hidden',
          position: 'relative',
          borderRight: '1px solid #D5DCE3',
        }}
        handleStyles={{ right: { cursor: 'ew-resize' } }}
        defaultSize={{ width: SPEC_NAVIGATION_DEFAULT_WIDTH, height: '100%' }}
        maxWidth={SPEC_NAVIGATION_MAX_WIDTH}
        minWidth={SPEC_NAVIGATION_MIN_WIDTH}
        enable={{
          top: false,
          right: true,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
      >
        <SpecNavigation
          content={value}
          selectedUri={specItemUri}
          onSelect={setSpecItemUri}
        />
      </Resizable>
      <Box width="100%" height="100%" overflow="hidden">
        <RawSpecView
          sx={{ px: 4, height: '100%' }}
          value={value}
          selectedUri={specItemUri}
          {...spec}
        />
      </Box>
    </Box>
  )
})

const SPEC_NAVIGATION_MIN_WIDTH = 300
const SPEC_NAVIGATION_DEFAULT_WIDTH = SPEC_NAVIGATION_MIN_WIDTH
const SPEC_NAVIGATION_MAX_WIDTH = 1.5 * SPEC_NAVIGATION_MIN_WIDTH

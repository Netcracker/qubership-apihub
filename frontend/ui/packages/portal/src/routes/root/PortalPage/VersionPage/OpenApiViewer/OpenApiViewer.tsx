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
import 'github-markdown-css/github-markdown-light.css'
import { Box } from '@mui/material'
import type { Document } from '@apihub/entities/documents'
import { OpenApiTableTree } from './OpenApiTableTree'
import { OpenApiOverview } from './OpenApiOverview'
import {
  useSelectedSubPage,
} from '@apihub/routes/root/PortalPage/VersionPage/VersionDocumentsSubPage/SelectedSubPageProvider'

export type OpenApiViewerProps = {
  value: Document
}

export const OpenApiViewer: FC<OpenApiViewerProps> = memo<OpenApiViewerProps>(({
  value: {
    slug,
    description,
    labels,
    info,
    externalDocs,
    operations,
  },
}) => {
  const selectedSubPage = useSelectedSubPage()

  return (
    <Box
      height="100%"
      width="100%"
      overflow="hidden"
      pb={1}
    >
      {selectedSubPage === OVERVIEW_SUB_PAGE && (
        <OpenApiOverview
          description={description}
          labels={labels}
          info={info}
          externalDocs={externalDocs}
        />
      )}
      {selectedSubPage === OPERATIONS_SUB_PAGE && (
        <OpenApiTableTree
          documentSlug={slug}
          operations={operations}
        />
      )}
    </Box>
  )
})

export const OVERVIEW_SUB_PAGE = 'overview'
export const OPERATIONS_SUB_PAGE = 'operations'

export type DocumentsTabSubPageKey =
  | typeof OVERVIEW_SUB_PAGE
  | typeof OPERATIONS_SUB_PAGE

// const OVERVIEW_SUB_PAGE_NAME = 'Overview'
// const OPERATIONS_SUB_PAGE_NAME = 'Operations'

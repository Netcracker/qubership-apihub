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
import { FormatViewer } from './FormatViewer'
import { OpenApiViewer } from '../OpenApiViewer/OpenApiViewer'
import { Box, Skeleton } from '@mui/material'
import { useSelectedDocument } from './SelectedDocumentProvider'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { isGraphQlSpecType, isOpenApiSpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { EMPTY_DOC } from '@apihub/entities/documents'

export type DocumentsTabProps = {
  format: FileFormat
  type: SpecType
  isDocumentLoading?: boolean
}

export const DocumentsTab: FC<DocumentsTabProps> = memo<DocumentsTabProps>((props) => {
  const { format, type, isDocumentLoading } = props

  if (isDocumentLoading) {
    return (
      <Box sx={{ mt: 3 }}>
        {Array(5)
          .fill(0)
          .map(() => <Skeleton sx={{ width: '70%' }}/>)}
      </Box>
    )
  }

  //todo fix component naming
  if (isOpenApiSpecType(type) || isGraphQlSpecType(type)) {
    return <OpenApiViewerWrapper/>
  }

  return <FormatViewer format={format}/>
})

const OpenApiViewerWrapper: FC = memo(() => {
  const content = useSelectedDocument()
  return (
    <OpenApiViewer value={content ?? EMPTY_DOC}/>
  )
})

import { Box, Skeleton } from '@mui/material'
import { type FC, memo } from 'react'

import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import {
  isAsyncApiSpecType,
  isDdlDocumentSpecType,
  isGraphQlSpecType,
  isMcpDocumentSpecType,
  isOpenApiSpecType,
  type SpecType,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'

import { EMPTY_DOC } from '@portal/entities/documents'
import { OpenApiViewer } from '../OpenApiViewer/OpenApiViewer'
import { FormatViewer } from './FormatViewer'
import { PublishedDocumentRawView } from './PublishedDocumentRawView'
import { useSelectedDocument } from './SelectedDocumentProvider'

export type DocumentsTabProps = Readonly<{
  format: FileFormat
  type: SpecType
  isDocumentLoading?: boolean
}>

export const DocumentsTab: FC<DocumentsTabProps> = memo<DocumentsTabProps>((props) => {
  const { format, type, isDocumentLoading } = props

  if (isDocumentLoading) {
    return (
      <Box sx={{ mt: 3 }}>
        {Array(5)
          .fill(0)
          .map((_, index) => <Skeleton key={index} sx={{ width: '70%' }} />)}
      </Box>
    )
  }

  if (isMcpDocumentSpecType(type) || isDdlDocumentSpecType(type)) {
    return <PublishedDocumentRawView type={type} format={format} />
  }

  if (isOpenApiSpecType(type) || isGraphQlSpecType(type) || isAsyncApiSpecType(type)) {
    return <OpenApiViewerWrapper />
  }

  return <FormatViewer format={format} />
})

DocumentsTab.displayName = 'DocumentsTab'

const OpenApiViewerWrapper: FC = memo(() => {
  const content = useSelectedDocument()
  return <OpenApiViewer value={content ?? EMPTY_DOC} />
})

OpenApiViewerWrapper.displayName = 'OpenApiViewerWrapper'

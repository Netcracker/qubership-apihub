import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC, memo } from 'react'
import { useParams } from 'react-router-dom'

import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { RawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/RawSpecView'
import { usePublishedDocumentRaw } from '@netcracker/qubership-apihub-ui-shared/hooks/documents/usePublishedDocumentRaw'
import {
  type FileExtension,
  type FileFormat,
  JSON_FILE_FORMAT,
} from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { toFormattedJsonString } from '@netcracker/qubership-apihub-ui-shared/utils/strings'

import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { DocumentLabels } from './DocumentLabels'
import { useSelectedDocument } from './SelectedDocumentProvider'

export type PublishedDocumentRawViewProps = Readonly<{
  type: SpecType
  format: FileFormat
}>

export const PublishedDocumentRawView: FC<PublishedDocumentRawViewProps> = memo<PublishedDocumentRawViewProps>(({
  type,
  format,
}) => {
  const { documentId } = useParams()
  const [packageKey, versionKey] = usePackageParamsWithRef()
  const document = useSelectedDocument()

  const [rawContent, isLoading] = usePublishedDocumentRaw({
    packageKey: packageKey,
    versionKey: versionKey,
    slug: documentId!,
    enabled: !!packageKey && !!documentId,
    transform: format === JSON_FILE_FORMAT ? toFormattedJsonString : (value) => value,
  })

  if (isLoading) {
    return <LoadingIndicator />
  }

  return (
    <ContentContainer>
      <DocumentLabels labels={document?.labels} />
      <RawSpecView
        value={rawContent}
        extension={`.${format}` as FileExtension}
        type={type}
      />
    </ContentContainer>
  )
})

PublishedDocumentRawView.displayName = 'PublishedDocumentRawView'

const ContentContainer = styled(Box)({
  height: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
})

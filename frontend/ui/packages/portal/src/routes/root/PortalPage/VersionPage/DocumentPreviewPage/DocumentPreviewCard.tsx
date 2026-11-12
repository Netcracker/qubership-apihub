import type { FC } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { Box } from '@mui/material'
import { DocumentPreviewContentBody } from './DocumentPreviewContentBody'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { usePublishedDocumentRaw } from '@netcracker/qubership-apihub-ui-shared/hooks/documents/usePublishedDocumentRaw'

export const DocumentPreviewCard: FC = memo(() => {
  const { documentId } = useParams()
  const [docPackageKey, docPackageVersion] = usePackageParamsWithRef()

  const [apiDescriptionDocument, isLoading] = usePublishedDocumentRaw({
    packageKey: docPackageKey,
    versionKey: docPackageVersion,
    slug: documentId!,
    enabled: !!docPackageKey,
  })

  return (
    <Box height="100%" overflow="scroll">
      <DocumentPreviewContentBody
        apiDescriptionDocument={apiDescriptionDocument}
        isLoading={isLoading}
      />
    </Box>
  )
})

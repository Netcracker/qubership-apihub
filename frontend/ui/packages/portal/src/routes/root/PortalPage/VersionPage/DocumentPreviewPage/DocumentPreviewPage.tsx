import { ExportSettingsDialog } from '@portal/components/ExportSettingsDialog/ui/ExportSettingsDialog'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import type { FC } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { DocumentPreviewCard } from './DocumentPreviewCard'
import { SpecToolbar } from './SpecToolbar'
import { PAGE_TITLES } from '@portal/routes/pageTitles'
import { useVersionPageTitle } from '@portal/routes/useVersionPageTitle'
import { useDocument } from '../useDocument'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'

export const DocumentPreviewPage: FC = memo(() => {
  const { documentId } = useParams()
  const [docPackageKey, docPackageVersion] = usePackageParamsWithRef()
  const [{ title: documentTitle }] = useDocument(docPackageKey, docPackageVersion, documentId)
  useVersionPageTitle(PAGE_TITLES.documentPreview(documentTitle))

  return (
    <>
      <PageLayout
        toolbar={<SpecToolbar />}
        body={<DocumentPreviewCard />}
      />
      <ExportSettingsDialog />
    </>
  )
})

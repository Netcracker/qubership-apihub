import type { FC } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { DocumentsCard } from './DocumentsCard'
import { DocumentsSidebar } from './DocumentsSidebar'
import { CurrentDocumentsListProvider } from './CurrentDocumentsListProvider'
import { DocumentNotificationsDialog } from './DocumentNotificationsDialog/DocumentNotificationsDialog'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { PAGE_TITLES } from '@portal/routes/pageTitles'
import { useVersionPageTitle } from '@portal/routes/useVersionPageTitle'
import { useDocument } from '../useDocument'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'

export const VersionDocumentsSubPage: FC = memo(() => {
  const { documentId } = useParams()
  const [docPackageKey, docPackageVersion] = usePackageParamsWithRef()
  const [{ title: documentTitle }] = useDocument(docPackageKey, docPackageVersion, documentId)
  useVersionPageTitle(PAGE_TITLES.documents(documentTitle))

  return (
    <CurrentDocumentsListProvider>
      <PageLayout
        navigation={<DocumentsSidebar/>}
        body={<DocumentsCard/>}
        nestedPage
        data-testid="DocumentsTab"
      />
      <DocumentNotificationsDialog/>
    </CurrentDocumentsListProvider>
  )
})

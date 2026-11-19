import type { FC } from 'react'
import { memo } from 'react'
import { DocumentsCard } from './DocumentsCard'
import { DocumentsSidebar } from './DocumentsSidebar'
import { CurrentDocumentsListProvider } from './CurrentDocumentsListProvider'
import { DocumentNotificationsDialog } from './DocumentNotificationsDialog/DocumentNotificationsDialog'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'

export const VersionDocumentsSubPage: FC = memo(() => {
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

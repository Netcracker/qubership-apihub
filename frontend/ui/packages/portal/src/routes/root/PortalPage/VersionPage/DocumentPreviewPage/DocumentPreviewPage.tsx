import { ExportSettingsDialog } from '@portal/components/ExportSettingsDialog/ui/ExportSettingsDialog'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import type { FC } from 'react'
import { memo } from 'react'
import { DocumentPreviewCard } from './DocumentPreviewCard'
import { SpecToolbar } from './SpecToolbar'

export const DocumentPreviewPage: FC = memo(() => {
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

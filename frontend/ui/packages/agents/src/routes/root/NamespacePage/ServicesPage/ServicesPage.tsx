import type { FC } from 'react'
import { memo } from 'react'
import { ServicesPageHeader } from './ServicesPageHeader'
import { SnapshotTableProvider } from './SnapshotTableProvider'
import { ChangeViewDialog } from '../../../../widgets/ChangeViewDialog/ChangeViewDialog'
import { AgentSpecificationDialog } from './AgentSpecificationDialog/AgentSpecificationDialog'
import { AgentPublicationErrorReportDialog } from './AgentPublicationErrorReportDialog'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { ServicesPageBody } from './ServicesPageBody/ServicesPageBody'

export const ServicesPage: FC = memo(() => {
  return (
    <>
      <BodyCard
        header={<ServicesPageHeader/>}
        body={<SnapshotTableProvider><ServicesPageBody/></SnapshotTableProvider>}
      />
      <AgentSpecificationDialog/>
      <ChangeViewDialog/>
      <AgentPublicationErrorReportDialog/>
    </>
  )
})

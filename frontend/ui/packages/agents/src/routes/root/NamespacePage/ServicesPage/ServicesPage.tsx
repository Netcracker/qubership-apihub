import type { SxProps, Theme } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'
import { ServicesPageHeader } from './ServicesPageHeader'
import { SnapshotTableProvider } from './SnapshotTableProvider'
import { ChangeViewDialog } from '../../../../widgets/ChangeViewDialog/ChangeViewDialog'
import { AgentSpecificationDialog } from './AgentSpecificationDialog/AgentSpecificationDialog'
import { AgentPublicationErrorReportDialog } from './AgentPublicationErrorReportDialog'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { ServicesPageBody } from './ServicesPageBody/ServicesPageBody'

// The focus ring is drawn outside the tab, and the card header clips overflow
const SERVICES_PAGE_HEADER_SX: SxProps<Theme> = {
  overflow: 'visible',
  '& .MuiCardHeader-content': { overflow: 'visible' },
  '&& .MuiCardHeader-title': { overflow: 'visible' },
}

export const ServicesPage: FC = memo(() => {
  return (
    <>
      <BodyCard
        header={<ServicesPageHeader/>}
        overrideHeaderSx={SERVICES_PAGE_HEADER_SX}
        body={<SnapshotTableProvider><ServicesPageBody/></SnapshotTableProvider>}
      />
      <AgentSpecificationDialog/>
      <ChangeViewDialog/>
      <AgentPublicationErrorReportDialog/>
    </>
  )
})

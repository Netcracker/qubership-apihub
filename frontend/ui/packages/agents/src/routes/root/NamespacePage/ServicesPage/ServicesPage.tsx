import type { SxProps, Theme } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'
import { ServicesPageHeader } from './ServicesPageHeader'
import { ChangeViewDialog } from '../../../../widgets/ChangeViewDialog/ChangeViewDialog'
import { AgentSpecificationDialog } from './AgentSpecificationDialog/AgentSpecificationDialog'
import { AgentPublicationErrorReportDialog } from './AgentPublicationErrorReportDialog'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { ServicesPageBody } from './ServicesPageBody/ServicesPageBody'
import { STEP_CONTENT_SPACING } from './servicesPageLayout'

// The focus ring is drawn outside the tab, and the card header clips overflow
const SERVICES_PAGE_HEADER_SX: SxProps<Theme> = {
  overflow: 'visible',
  '& .MuiCardHeader-content': { overflow: 'visible' },
  '&& .MuiCardHeader-title': { overflow: 'visible' },
}
const SERVICES_PAGE_BODY_SX: SxProps<Theme> = { pt: STEP_CONTENT_SPACING }

export const ServicesPage: FC = memo(() => {
  return (
    <>
      <BodyCard
        header={<ServicesPageHeader/>}
        overrideHeaderSx={SERVICES_PAGE_HEADER_SX}
        body={<ServicesPageBody/>}
        overrideBodySx={SERVICES_PAGE_BODY_SX}
      />
      <AgentSpecificationDialog/>
      <ChangeViewDialog/>
      <AgentPublicationErrorReportDialog/>
    </>
  )
})

import { Box, styled } from '@mui/material'
import { type FC, memo, type ReactNode } from 'react'

import { ServicesPageFooter } from '../ServicesPageFooter'
import { useActiveStep } from '../ServicesPageProvider/ServicesStepsProvider'
import {
  CREATE_SNAPSHOT_STEP_KEY,
  DISCOVER_SERVICES_STEP_KEY,
  PROMOTE_VERSION_STEP_KEY,
  type StepKey,
} from '../ServicesPageProvider/servicesSteps'
import { CreateSnapshotStep } from './CreateSnapshotStep/CreateSnapshotStep'
import { DiscoverServicesStep } from './DiscoverServicesStep/DiscoverServicesStep'
import { SERVICES_DISCOVERY_VIEW, useDiscoveryView } from './DiscoverServicesStep/useDiscoveryView'
import { PromoteVersionStep } from './PromoteVersionStep/PromoteVersionStep'

const STEP_KEY_TO_CONTENT_MAP: Record<StepKey, ReactNode> = {
  [DISCOVER_SERVICES_STEP_KEY]: <DiscoverServicesStep/>,
  [CREATE_SNAPSHOT_STEP_KEY]: <CreateSnapshotStep/>,
  [PROMOTE_VERSION_STEP_KEY]: <PromoteVersionStep/>,
}

export const ServicesPageBody: FC = memo(() => {
  const { key } = useActiveStep()
  const discoveryView = useDiscoveryView()
  // The empty states and the loading of Discover Services have no "Back" and "Next"
  const isFooterShown = key !== DISCOVER_SERVICES_STEP_KEY || discoveryView === SERVICES_DISCOVERY_VIEW

  return (
    <>
      <StepContent>{STEP_KEY_TO_CONTENT_MAP[key]}</StepContent>
      {isFooterShown && <ServicesPageFooter/>}
    </>
  )
})

ServicesPageBody.displayName = 'ServicesPageBody'

const StepContent = styled(Box)({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
})

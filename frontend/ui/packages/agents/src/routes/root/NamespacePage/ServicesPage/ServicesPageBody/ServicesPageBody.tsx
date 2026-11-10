/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

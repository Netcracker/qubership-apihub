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

import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigation } from '../../../NavigationProvider'
import { useBackwardLocation } from '../../useBackwardLocation'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { CreateDashboardVersionButton } from '@apihub/routes/root/PortalPage/DashboardPage/CreateDashboardVersionButton'

export type CreateVersionButtonProps = {
  disabled: boolean
  kind?: PackageKind
}

export const CreateVersionButton: FC<CreateVersionButtonProps> = memo(({
  disabled,
  kind,
}) => {
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const { navigateToVersion } = useNavigation()
  const { packageId } = useParams()
  const handleClick = useCallback(
    () => {
      setBackwardLocation({ ...backwardLocation, fromPackage: location })
      navigateToVersion({ packageKey: packageId!, versionKey: SPECIAL_VERSION_KEY, edit: true })
    },
    [backwardLocation, location, navigateToVersion, packageId, setBackwardLocation],
  )

  if (kind === DASHBOARD_KIND) {
    return (
      <CreateDashboardVersionButton
        disabled={disabled}
        sx={{ ml: 'auto' }}
      />
    )
  }

  return (
    <ButtonWithHint
      variant="contained"
      disabled={disabled}
      disableHint={!disabled}
      hint="You do not have permission to create the version"
      onClick={handleClick}
      title="Create Version"
      data-testid="CreateVersionButton"
      tooltipMaxWidth="unset"
    />
  )
})

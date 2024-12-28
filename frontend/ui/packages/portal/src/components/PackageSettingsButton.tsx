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

import { Button, IconButton, Tooltip } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'
import { useLocation } from 'react-use'
import { getPackageSettingsPath } from '../routes/NavigationProvider'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { PACKAGE_KIND, PACKAGE_KIND_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '../routes/BackwardLocationProvider'
import { SettingIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SettingIcon'

export type PackageSettingsButtonProps = {
  packageKey: string
  packageKind?: PackageKind
  isIconButton?: boolean
  visible?: boolean
  marginLeft?: string
}

export const PackageSettingsButton: FC<PackageSettingsButtonProps> = memo<PackageSettingsButtonProps>(({
  packageKey,
  packageKind,
  isIconButton,
  visible,
  marginLeft,
}) => {
  const location = useLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  const packageSettingsLinkHandle = (): void => {
    setBackwardLocation({
      ...backwardLocation,
      fromPackageSettings: {
        pathname: location.pathname!,
        search: location.search!,
      },
    })
  }

  return (
    <>
      {isIconButton ? (
        <IconButton sx={{ visibility: visible ? '' : 'hidden', ml: marginLeft ?? '5px' }}
                    className={visible ? '' : 'hoverable'}
                    aria-label="setting-icon"
                    size="small"
                    component={NavLink}
                    to={getPackageSettingsPath({ packageKey })}
                    onClick={packageSettingsLinkHandle}
                    data-testid="PackageSettingsButton"
        >
          <SettingIcon color="#626D82"/>
        </IconButton>
      ) : (
        <Tooltip title={`Manage ${PACKAGE_KIND_MAP[packageKind ?? PACKAGE_KIND]}`}>
          <Button
            component={NavLink}
            sx={{
              padding: '8px 5px',
              minWidth: '10px',
            }}
            variant="outlined"
            to={getPackageSettingsPath({ packageKey })}
            onClick={packageSettingsLinkHandle}
            data-testid="PackageSettingsButton"
          >
            <SettingIcon color="#353C4E"/>
          </Button>
        </Tooltip>)
      }
    </>
  )
})

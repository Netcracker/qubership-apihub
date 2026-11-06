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
import { useIsAnonymous } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import type { PackagePermissions } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import {
  ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  DELETE_PACKAGE_PERMISSION,
  MANAGE_DEPRECATED_VERSION_PERMISSION,
  MANAGE_DRAFT_VERSION_PERMISSION,
  MANAGE_RELEASE_VERSION_PERMISSION,
  USER_ACCESS_MANAGEMENT_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'

const PACKAGE_SETTINGS_PERMISSIONS: PackagePermissions = [
  CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  DELETE_PACKAGE_PERMISSION,
  USER_ACCESS_MANAGEMENT_PERMISSION,
  ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  MANAGE_DRAFT_VERSION_PERMISSION,
  MANAGE_RELEASE_VERSION_PERMISSION,
  MANAGE_DEPRECATED_VERSION_PERMISSION,
]

export type PackageSettingsButtonProps = {
  packageKey: string
  packageKind?: PackageKind
  isIconButton?: boolean
  visible?: boolean
  marginLeft?: string
  /**
   * Package permissions of the current user. When provided, the button is hidden
   * unless at least one settings-related permission is present.
   */
  permissions?: PackagePermissions
}

export const PackageSettingsButton: FC<PackageSettingsButtonProps> = memo<PackageSettingsButtonProps>(({
  packageKey,
  packageKind,
  isIconButton,
  visible,
  marginLeft,
  permissions,
}) => {
  const isAnonymous = useIsAnonymous()
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

  if (isAnonymous || (permissions && !permissions.some(permission => PACKAGE_SETTINGS_PERMISSIONS.includes(permission)))) {
    return null
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

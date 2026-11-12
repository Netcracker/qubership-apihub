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

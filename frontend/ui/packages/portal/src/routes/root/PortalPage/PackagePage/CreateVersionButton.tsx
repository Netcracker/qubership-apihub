import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigation } from '../../../NavigationProvider'
import { useBackwardLocation } from '../../useBackwardLocation'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { CreateDashboardVersionButton } from '@portal/routes/root/PortalPage/DashboardPage/CreateDashboardVersionButton'

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

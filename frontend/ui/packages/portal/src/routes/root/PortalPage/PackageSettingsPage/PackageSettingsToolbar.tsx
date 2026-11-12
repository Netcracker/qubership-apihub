import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { PackageBreadcrumbs } from '../../PackageBreadcrumbs'
import type { PackageSettingsTabProps } from './package-settings'
import { PACKAGE_KINDS_NAMES_MAP } from './package-settings'
import { useBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { ExitIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ExitIcon'

export const PackageSettingsToolbar: FC<PackageSettingsTabProps> = memo<PackageSettingsTabProps>(({
  packageObject,
}) => {
  const navigate = useNavigate()
  const backwardLocation = useBackwardLocationContext()

  const previousPageLocation = useMemo(() => {
    return backwardLocation.fromPackageSettings ?? { pathname: '/portal' }
  }, [backwardLocation])

  const navigateToPrevPage = useCallback(() => {
    navigate(previousPageLocation)
  }, [previousPageLocation, navigate])

  const title = `${packageObject.name}: Manage ${PACKAGE_KINDS_NAMES_MAP[packageObject.kind]}`

  return (
    <>
      {packageObject && (
        <Toolbar
          breadcrumbs={<PackageBreadcrumbs packageObject={packageObject}/>}
          header={<ToolbarTitle value={title}/>}
          action={(
            <Button
              startIcon={<ExitIcon/>}
              variant="outlined"
              onClick={navigateToPrevPage}
              data-testid="ExitButton"
            >
              Exit
            </Button>
          )}
        />
      )}
    </>
  )
})


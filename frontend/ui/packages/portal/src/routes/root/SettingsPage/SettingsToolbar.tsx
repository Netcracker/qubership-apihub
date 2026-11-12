import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { LARGE_TOOLBAR_SIZE, Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { ExitIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ExitIcon'

export const SettingsToolbar: FC = memo(() => {
  const navigate = useNavigate()
  const backwardLocation = useBackwardLocationContext()

  const previousPageLocation = useMemo(() => {
    return backwardLocation.fromPackageSettings ?? { pathname: '/portal' }
  }, [backwardLocation])

  const navigateToPrevPage = useCallback(() => {
    navigate(previousPageLocation)
  }, [previousPageLocation, navigate])

  return (
    <Toolbar
      header={<ToolbarTitle value="APIHUB Portal Settings"/>}
      size={LARGE_TOOLBAR_SIZE}
      action={(
        <Button
          startIcon={<ExitIcon/>}
          variant="outlined"
          onClick={navigateToPrevPage}
        >
          Exit
        </Button>
      )}
    />
  )
})

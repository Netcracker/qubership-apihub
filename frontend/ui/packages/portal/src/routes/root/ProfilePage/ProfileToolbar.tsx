import { useBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { Button } from '@mui/material'
import { LARGE_TOOLBAR_SIZE, Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { ExitIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ExitIcon'
import { useCallback, useMemo, type FC } from 'react'
import { useNavigate } from 'react-router-dom'

export const ProfileToolbar: FC = () => {
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
      header={<ToolbarTitle value="My Profile"/>}
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
}

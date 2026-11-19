import { Button, Link } from '@mui/material'
import { type FC, memo, useCallback, useMemo } from 'react'
import { generatePath, NavLink, useNavigate } from 'react-router-dom'

import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { ExitIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ExitIcon'

import { useBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { LIBRARY_PAGE_PATH_PATTERN } from '../../../../routes'
import { LibraryBreadcrumbs } from '../LibraryBreadcrumbs'
import type { LibrarySettingsTabProps } from './library-settings'

export const LibrarySettingsToolbar: FC<LibrarySettingsTabProps> = memo<LibrarySettingsTabProps>(({ library }) => {
  const navigate = useNavigate()
  const backwardLocation = useBackwardLocationContext()
  const libraryPath = generatePath(LIBRARY_PAGE_PATH_PATTERN, { libraryId: encodeURIComponent(library.libraryId) })
  const previousPageLocation = useMemo(() => {
    return backwardLocation.fromLibrarySettings ?? { pathname: libraryPath }
  }, [backwardLocation, libraryPath])
  const navigateToPrevPage = useCallback(() => {
    navigate(previousPageLocation)
  }, [previousPageLocation, navigate])

  return (
    <Toolbar
      breadcrumbs={
        <LibraryBreadcrumbs library={library}>
          <Link component={NavLink} to={libraryPath}>{library.name}</Link>
        </LibraryBreadcrumbs>
      }
      header={<ToolbarTitle value={`${library.name}: Manage Library`} />}
      action={
        <Button startIcon={<ExitIcon />} variant="outlined" onClick={navigateToPrevPage} data-testid="ExitButton">
          Exit
        </Button>
      }
    />
  )
})
LibrarySettingsToolbar.displayName = 'LibrarySettingsToolbar'

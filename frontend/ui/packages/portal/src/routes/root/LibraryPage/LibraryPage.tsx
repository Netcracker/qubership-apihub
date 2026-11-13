import { Box, Button, styled, Typography } from '@mui/material'
import { type FC, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { ErrorPage } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'

import { useLibrary } from '../useLibrary'
import { LibraryBreadcrumbs } from './LibraryBreadcrumbs'
import { getManageableVersionStatuses } from './libraryPermissions'
import { getLibraryVersionPath } from './LibraryVersionPage/library-version'
import { PublishLibraryDialog } from './PublishLibraryDialog'
import { useLibraryVersions } from './useLibraryVersions'

export const LibraryPage: FC = () => {
  const [isPublishOpen, setPublishOpen] = useState(false)
  const { libraryId } = useParams()
  const { library, isLoading, error } = useLibrary(libraryId)
  const { versions, isLoading: areVersionsLoading, error: versionsError } = useLibraryVersions(
    libraryId ?? '',
    !!library,
  )

  if (isLoading || areVersionsLoading) return <LoadingIndicator />

  if (!library) {
    return (
      <ErrorPage
        title={error ? 'Unable to load library' : 'Library not found'}
        message={error?.message}
        homePath="/portal"
      />
    )
  }

  if (versionsError) {
    return <ErrorPage title="Unable to load library versions" message={versionsError.message} homePath="/portal" />
  }
  if (versions.length) return <Navigate to={getLibraryVersionPath(library.libraryId, versions[0].version)} replace />

  return (
    <>
      <LayoutWithToolbar
        toolbar={
          <Toolbar
            data-testid="LibraryToolbar"
            breadcrumbs={<LibraryBreadcrumbs library={library} />}
            header={<ToolbarTitle value={library.name} />}
          />
        }
        body={
          <Placeholder
            invisible={false}
            area={CONTENT_PLACEHOLDER_AREA}
            data-testid="LibraryEmptyState"
            message={
              <EmptyLibrary as="main">
                <EmptyLibraryMessage variant="inherit">The library is empty.</EmptyLibraryMessage>
                <Button
                  variant="contained"
                  disabled={!getManageableVersionStatuses(library).length}
                  onClick={() => setPublishOpen(true)}
                  data-testid="PublishLibraryButton"
                >
                  Publish
                </Button>
              </EmptyLibrary>
            }
          />
        }
      />
      {isPublishOpen && <PublishLibraryDialog library={library} onClose={() => setPublishOpen(false)} />}
    </>
  )
}
LibraryPage.displayName = 'LibraryPage'

const EmptyLibraryMessage = styled(Typography)(({ theme }) => ({
  color: theme.palette.common.black,
  fontFamily: theme.typography.fontFamily,
  fontWeight: theme.typography.fontWeightMedium,
  fontSize: theme.typography.pxToRem(20),
  lineHeight: theme.typography.h5.lineHeight,
}))

const EmptyLibrary = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
  textAlign: 'center',
}))

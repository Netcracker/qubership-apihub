import { Box, Button, Link, List, ListItemButton, ListItemText, styled, Typography } from '@mui/material'
import type { FC } from 'react'
import { generatePath, Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'

import { ErrorPage } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_PERMISSION,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import {
  ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  type PackagePermission,
  USER_ACCESS_MANAGEMENT_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { ExitIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ExitIcon'

import { LIBRARY_PAGE_PATH_PATTERN, LIBRARY_SETTINGS_PAGE_PATH_PATTERN } from '../../../../routes'
import { useBackwardLocationContext } from '../../../BackwardLocationProvider'
import { useLibrary } from '../../useLibrary'
import { LibraryBreadcrumbs } from '../LibraryBreadcrumbs'
import { AccessTokensLibrarySettingsTab } from './AccessTokensLibrarySettingsTab'
import { GeneralLibrarySettingsTab } from './GeneralLibrarySettingsTab'
import { UserLibraryAccessControlSettingsTab } from './UserLibraryAccessControlSettingsTab'
import { VersionsLibrarySettingsTab } from './VersionsLibrarySettingsTab'

type SettingsItem = { path: string; label: string; description: string; permissions?: PackagePermission[] }

const SETTINGS_ITEMS: SettingsItem[] = [
  { path: 'general', label: 'General', description: 'Library information' },
  { path: 'versions', label: 'Library Versions', description: 'Edit version information' },
  {
    path: 'access-tokens',
    label: 'Access Tokens',
    description: 'Add a library access token',
    permissions: [ACCESS_TOKEN_MANAGEMENT_PERMISSION, USER_ACCESS_MANAGEMENT_PERMISSION],
  },
  {
    path: 'user-access-control',
    label: 'User Access Control',
    description: 'Add users to library',
    permissions: [USER_ACCESS_MANAGEMENT_PERMISSION],
  },
]

export const LibrarySettingsPage: FC = () => {
  const { libraryId } = useParams()
  const { pathname } = useLocation()
  const { fromLibrarySettings } = useBackwardLocationContext()
  const { library, isLoading, error } = useLibrary(libraryId)
  if (isLoading) return <LoadingIndicator />
  if (!library) {
    return (
      <ErrorPage
        title={error ? 'Unable to load library' : 'Library not found'}
        message={error?.message}
        homePath="/portal"
      />
    )
  }
  const pathParams = { libraryId: encodeURIComponent(library.libraryId) }
  const libraryPath = generatePath(LIBRARY_PAGE_PATH_PATTERN, pathParams)
  const settingsPath = generatePath(LIBRARY_SETTINGS_PAGE_PATH_PATTERN, pathParams)
  const hasUserAccessPermission = !!library.permissions?.includes(USER_ACCESS_MANAGEMENT_PERMISSION)
  const hasTokenAccessPermission = hasUserAccessPermission &&
    !!library.permissions?.includes(ACCESS_TOKEN_MANAGEMENT_PERMISSION)
  const settingsItems = SETTINGS_ITEMS.filter(item =>
    item.permissions?.every(permission => library.permissions?.includes(permission)) ?? true,
  )

  return (
    <PageLayout
      data-testid="LibrarySettingsPage"
      toolbar={
        <Toolbar
          breadcrumbs={
            <LibraryBreadcrumbs library={library}>
              <Link component={NavLink} to={libraryPath}>{library.name}</Link>
            </LibraryBreadcrumbs>
          }
          header={<ToolbarTitle value={`${library.name}: Manage Library`} />}
          action={
            <Button
              component={NavLink}
              to={fromLibrarySettings ?? libraryPath}
              variant="outlined"
              startIcon={<ExitIcon />}
            >
              Exit
            </Button>
          }
        />
      }
      navigation={
        <SettingsNavigation>
          <NavigationTitle variant="h3">Library Settings</NavigationTitle>
          <List>
            {settingsItems.map(item => (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={`${settingsPath}/${item.path}`}
                selected={pathname.endsWith(`/settings/${item.path}`)}
                data-testid={`LibrarySettingsTab-${item.path}`}
              >
                <Box>
                  <ListItemText primary={item.label} />
                  <ListItemText primary={item.description} primaryTypographyProps={{ color: 'text.secondary' }} />
                </Box>
              </ListItemButton>
            ))}
          </List>
        </SettingsNavigation>
      }
      body={
        <SettingsContent>
          <Routes>
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general" element={<GeneralLibrarySettingsTab key={library.libraryId} library={library} />} />
            <Route path="versions" element={<VersionsLibrarySettingsTab library={library} />} />
            <Route
              path="access-tokens"
              element={
                <Placeholder
                  invisible={hasTokenAccessPermission}
                  area={CONTENT_PLACEHOLDER_AREA}
                  message={NO_PERMISSION}
                  data-testid="NoPermissionPlaceholder"
                >
                  <AccessTokensLibrarySettingsTab key={library.libraryId} library={library} />
                </Placeholder>
              }
            />
            <Route
              path="user-access-control"
              element={
                <Placeholder
                  invisible={hasUserAccessPermission}
                  area={CONTENT_PLACEHOLDER_AREA}
                  message={NO_PERMISSION}
                  data-testid="NoPermissionPlaceholder"
                >
                  <UserLibraryAccessControlSettingsTab key={library.libraryId} library={library} />
                </Placeholder>
              }
            />
            <Route path="*" element={<Navigate to={`${settingsPath}/general`} replace />} />
          </Routes>
        </SettingsContent>
      }
    />
  )
}
LibrarySettingsPage.displayName = 'LibrarySettingsPage'

const SettingsNavigation = styled(Box)({ height: '100%', overflow: 'auto' })
const NavigationTitle = styled(Typography)(({ theme }) => ({ padding: theme.spacing(2) }))
const SettingsContent = styled(Box)({ height: '100%', overflow: 'auto' })

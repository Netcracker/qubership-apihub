import { Box, List, styled } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { ErrorPage } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { NavigationMenu, type SidebarMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { LayoutWithTabs } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithTabs'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'
import { ApiIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ApiIcon'
import { ComparisonIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ComparisonIcon'
import { ServicesIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ServicesIcon'

import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'
import { OverviewNavigationItem } from '@portal/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/OverviewNavigationItem'
import { useLibrary } from '../../useLibrary'
import { useLibraryVersion } from '../useLibraryVersions'
import { getPreviousLibraryVersion } from './javaapi/java-api'
import { getLibraryVersionPath } from './library-version'
import { LibraryActivityTab } from './LibraryActivityTab'
import { LibraryChangesTab } from './LibraryChangesTab'
import { LibraryReferenceTab } from './LibraryReferenceTab'
import { LibrarySummaryTab } from './LibrarySummaryTab'
import { LibraryVersionToolbar } from './LibraryVersionToolbar'

const MENU_ITEMS: SidebarMenu[] = [
  { id: 'overview', title: 'Overview', icon: <ServicesIcon />, 'data-testid': 'LibraryOverviewTab' },
  { id: 'reference', title: 'API Reference', icon: <ApiIcon />, 'data-testid': 'LibraryReferenceTab' },
  { id: 'changes', title: 'API Changes', icon: <ComparisonIcon />, 'data-testid': 'LibraryChangesTab' },
]

export const LibraryVersionPage: FC = () => {
  const { libraryId = '', versionId = '', '*': tab = '' } = useParams()
  const { library, isLoading, error } = useLibrary(libraryId)
  const { version, isLoading: isVersionLoading, error: versionError } = useLibraryVersion(libraryId, versionId)
  const { expandMainMenu, toggleExpandMainMenu } = usePortalPageSettingsContext()
  const navigate = useNavigate()
  const [query] = useSearchParams()
  const { previousLibraryId = '', previousVersion = '' } = getPreviousLibraryVersion(query)
  if (isLoading || isVersionLoading) return <LoadingIndicator />
  if (!library || !version) {
    return (
      <ErrorPage
        title={error || versionError ? 'Unable to load library version' : 'Library version not found'}
        message={error?.message ?? versionError?.message}
        homePath="/portal"
      />
    )
  }
  const overview = (body: ReactNode): ReactNode => (
    <PageLayout
      nestedPage
      navigation={
        <SidebarPanel
          header={<PageTitle title="Overview" />}
          body={
            <List>
              {['summary', 'activity-history'].map(item => (
                <OverviewNavigationItem
                  key={item}
                  url={getLibraryVersionPath(libraryId, versionId, `overview/${item}`)}
                  title={item === 'summary' ? 'Summary' : 'Activity History'}
                  id={item}
                  sidebarItem={tab.split('/')[1]}
                  hasReferenceProblems={false}
                />
              ))}
            </List>
          }
        />
      }
      body={<OverviewContent>{body}</OverviewContent>}
    />
  )
  return (
    <LayoutWithToolbar
      toolbar={<LibraryVersionToolbar library={library} version={version} />}
      body={
        <LayoutWithTabs
          tabs={
            <NavigationMenu
              open={expandMainMenu}
              setOpen={toggleExpandMainMenu}
              activeItem={tab.split('/')[0]}
              sidebarMenuItems={MENU_ITEMS}
              onSelectItem={item =>
                navigate(getLibraryVersionPath(libraryId, versionId, item === 'overview' ? 'overview/summary' : item))}
            />
          }
          body={
            <Routes>
              <Route index element={<Navigate to="overview/summary" replace />} />
              <Route path="overview" element={<Navigate to="summary" replace />} />
              <Route
                path="overview/summary"
                element={overview(<LibrarySummaryTab library={library} version={version} />)}
              />
              <Route path="overview/activity-history" element={overview(<LibraryActivityTab version={version} />)} />
              <Route
                path="reference"
                element={<LibraryReferenceTab key={`${libraryId}:${versionId}`} version={version} />}
              />
              <Route
                path="changes"
                element={
                  <LibraryChangesTab
                    key={`${libraryId}:${versionId}:${previousLibraryId}:${previousVersion}`}
                    version={version}
                  />
                }
              />
              <Route path="*" element={<Navigate to={getLibraryVersionPath(libraryId, versionId)} replace />} />
            </Routes>
          }
        />
      }
    />
  )
}
LibraryVersionPage.displayName = 'LibraryVersionPage'

const OverviewContent = styled(Box)({ height: '100%', overflow: 'auto' })

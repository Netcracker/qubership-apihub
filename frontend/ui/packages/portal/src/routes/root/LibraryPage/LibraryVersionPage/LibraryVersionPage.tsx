import { type FC, memo, type ReactNode } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'

import { ErrorPage } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { LayoutWithTabs } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithTabs'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'

import {
  ACTIVITY_HISTORY_PAGE,
  API_CHANGES_PAGE,
  CONTRACTS_PAGE,
  OVERVIEW_PAGE,
  SUMMARY_PAGE,
} from '../../../../routes'
import { useLibrary } from '../../useLibrary'
import { useLibraryVersion } from '../useLibraryVersions'
import { getPreviousLibraryVersion } from './javaapi/javaApi'
import { getLibraryVersionPath, type LibraryVersionPageProps, type LibraryVersionPageRoute } from './libraryVersion'
import { LibraryChangesTab } from './LibraryChangesTab'
import { LibraryReferenceTab } from './LibraryReferenceTab'
import { LibraryVersionNavigationMenu } from './LibraryVersionNavigationMenu'
import { LibraryVersionOverviewSubPage } from './LibraryVersionOverviewSubPage/LibraryVersionOverviewSubPage'
import { LibraryVersionToolbar } from './LibraryVersionToolbar'

export const LibraryVersionPage: FC = memo(() => {
  const { libraryId = '', versionId = '', '*': tab = '' } = useParams()
  const [menuItem, sidebarItem] = useActiveTabs()
  const { library, isLoading, error } = useLibrary(libraryId)
  const { version, isLoading: isVersionLoading, error: versionError } = useLibraryVersion(libraryId, versionId)

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

  const normalizedTab = tab.replace(/\/$/, '')
  const isOverviewSidebar = sidebarItem === SUMMARY_PAGE || sidebarItem === ACTIVITY_HISTORY_PAGE
  const isOverview = isOverviewSidebar && normalizedTab === `${OVERVIEW_PAGE}/${sidebarItem}`
  const isVersionTab = (menuItem === CONTRACTS_PAGE || menuItem === API_CHANGES_PAGE) && normalizedTab === menuItem
  if (!isOverview && !isVersionTab) {
    return <Navigate to={getLibraryVersionPath(libraryId, versionId)} replace />
  }

  return (
    <LayoutWithToolbar
      toolbar={<LibraryVersionToolbar library={library} version={version} />}
      body={
        <LibraryVersionPageBody library={library} version={version} menuItem={menuItem as LibraryVersionPageRoute} />
      }
    />
  )
})
LibraryVersionPage.displayName = 'LibraryVersionPage'

type LibraryVersionPageBodyProps = LibraryVersionPageProps & Readonly<{ menuItem: LibraryVersionPageRoute }>

const LibraryVersionPageBody: FC<LibraryVersionPageBodyProps> = memo<LibraryVersionPageBodyProps>(
  ({ library, version, menuItem }) => {
    const [query] = useSearchParams()
    const { previousLibraryId = '', previousVersion = '' } = getPreviousLibraryVersion(query)
    const { libraryId, version: versionId } = version
    const pathParamToSubPageMap: Record<LibraryVersionPageRoute, ReactNode> = {
      [OVERVIEW_PAGE]: <LibraryVersionOverviewSubPage library={library} version={version} />,
      [CONTRACTS_PAGE]: <LibraryReferenceTab key={`${libraryId}:${versionId}`} version={version} />,
      [API_CHANGES_PAGE]: (
        <LibraryChangesTab
          key={`${libraryId}:${versionId}:${previousLibraryId}:${previousVersion}`}
          version={version}
        />
      ),
    }

    return (
      <LayoutWithTabs
        // Compare → Versions opens API Changes with the previous version in the URL
        tabs={<LibraryVersionNavigationMenu apiChangesDisabled={!version.previousVersion && !previousVersion} />}
        body={pathParamToSubPageMap[menuItem]}
      />
    )
  },
)
LibraryVersionPageBody.displayName = 'LibraryVersionPageBody'

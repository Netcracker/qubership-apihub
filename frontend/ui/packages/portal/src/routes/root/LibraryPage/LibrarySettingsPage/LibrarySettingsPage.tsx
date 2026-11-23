import { createContext, type Dispatch, type FC, memo, type SetStateAction, useContext, useState } from 'react'
import { generatePath, Navigate, useParams } from 'react-router-dom'

import { ErrorPage } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'

import {
  ACCESS_TOKENS_PAGE,
  GENERAL_PAGE,
  LIBRARY_SETTINGS_PAGE_PATH_PATTERN,
  USER_ACCESS_CONTROLS_PAGE,
  VERSIONS_PAGE,
} from '../../../../routes'
import { useLibrary } from '../../useLibrary'
import type { LibrarySettingsPageRoute } from './librarySettings'
import { LibrarySettingsBody } from './LibrarySettingsBody'
import { LibrarySettingsNavigation } from './LibrarySettingsNavigation'
import { LibrarySettingsToolbar } from './LibrarySettingsToolbar'

export const LibrarySettingsPage: FC = memo(() => {
  const [menuItem] = useActiveTabs()
  const [, setActiveTab] = useState<LibrarySettingsPageRoute>(GENERAL_PAGE)
  const { libraryId, '*': settingsPath = '' } = useParams()
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

  const activeTab = SETTINGS_TABS.find(tab => tab === menuItem)
  if (!activeTab || settingsPath.replace(/\/$/, '') !== menuItem) {
    return (
      <Navigate
        to={generatePath(`${LIBRARY_SETTINGS_PAGE_PATH_PATTERN}${GENERAL_PAGE}`, {
          libraryId: encodeURIComponent(library.libraryId),
        })}
        replace
      />
    )
  }

  return (
    <ActiveTabContentContext.Provider value={activeTab}>
      <SetActiveTabContentContext.Provider value={setActiveTab}>
        <PageLayout
          data-testid="LibrarySettingsPage"
          toolbar={<LibrarySettingsToolbar library={library} />}
          navigation={<LibrarySettingsNavigation library={library} />}
          body={<LibrarySettingsBody library={library} />}
        />
      </SetActiveTabContentContext.Provider>
    </ActiveTabContentContext.Provider>
  )
})
LibrarySettingsPage.displayName = 'LibrarySettingsPage'

const SETTINGS_TABS: LibrarySettingsPageRoute[] = [
  GENERAL_PAGE,
  VERSIONS_PAGE,
  ACCESS_TOKENS_PAGE,
  USER_ACCESS_CONTROLS_PAGE,
]

const ActiveTabContentContext = createContext<LibrarySettingsPageRoute>()
const SetActiveTabContentContext = createContext<Dispatch<SetStateAction<LibrarySettingsPageRoute>>>()

export function useActiveTabContentContext(): LibrarySettingsPageRoute {
  return useContext(ActiveTabContentContext)
}

export function useSetActiveTabContentContext(): Dispatch<SetStateAction<LibrarySettingsPageRoute>> {
  return useContext(SetActiveTabContentContext)
}

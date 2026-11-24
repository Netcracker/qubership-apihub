import { createContext, type Dispatch, type FC, memo, type SetStateAction, useContext, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ErrorPage } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'

import { useLibrary } from '@portal/routes/root/useLibrary'
import { GENERAL_PAGE } from '../../../../routes'
import type { LibrarySettingsPageRoute } from './library-settings'
import { LibrarySettingsBody } from './LibrarySettingsBody'
import { LibrarySettingsNavigation } from './LibrarySettingsNavigation'
import { LibrarySettingsToolbar } from './LibrarySettingsToolbar'

export const LibrarySettingsPage: FC = memo(() => {
  const [menuItem] = useActiveTabs()
  const [, setActiveTab] = useState<LibrarySettingsPageRoute>(GENERAL_PAGE)
  const { libraryId } = useParams()
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

  return (
    <ActiveTabContentContext.Provider value={menuItem as LibrarySettingsPageRoute}>
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

const ActiveTabContentContext = createContext<LibrarySettingsPageRoute>()
const SetActiveTabContentContext = createContext<Dispatch<SetStateAction<LibrarySettingsPageRoute>>>()

export function useActiveTabContentContext(): LibrarySettingsPageRoute {
  return useContext(ActiveTabContentContext)
}

export function useSetActiveTabContentContext(): Dispatch<SetStateAction<LibrarySettingsPageRoute>> {
  return useContext(SetActiveTabContentContext)
}

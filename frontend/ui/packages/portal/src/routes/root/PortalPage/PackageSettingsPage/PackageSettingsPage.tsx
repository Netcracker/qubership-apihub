import type { Dispatch, FC, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import { PackageSettingsToolbar } from './PackageSettingsToolbar'
import { PackageSettingsNavigation } from './PackageSettingsNavigation'
import { PackageSettingsBody } from './PackageSettingsBody'
import type { PackageSettingsPageRoute } from '../../../../routes'
import { GENERAL_PAGE } from '../../../../routes'
import { useParams } from 'react-router-dom'
import { usePackage } from '../../usePackage'
import { NoPackagePlaceholder } from '../../NoPackagePlaceholder'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'

export const PackageSettingsPage: FC = memo(() => {
  const [menuItem] = useActiveTabs()
  const [, setActiveTab] = useState<PackageSettingsPageRoute>(GENERAL_PAGE)

  const { packageId, groupId } = useParams()
  const [packageObject, isPackageLoading] = usePackage({ packageKey: packageId ?? groupId ?? '', showParents: true })

  return (
    <ActiveTabContentContext.Provider value={menuItem as PackageSettingsPageRoute}>
      <SetActiveTabContentContext.Provider value={setActiveTab}>
        <NoPackagePlaceholder packageObject={packageObject} isLoading={isPackageLoading}>
          <PageLayout
            toolbar={<PackageSettingsToolbar packageObject={packageObject!} isPackageLoading={isPackageLoading}/>}
            navigation={
              <PackageSettingsNavigation packageObject={packageObject!}/>
            }
            body={<PackageSettingsBody packageObject={packageObject!} isPackageLoading={isPackageLoading}/>}
          />
        </NoPackagePlaceholder>
      </SetActiveTabContentContext.Provider>
    </ActiveTabContentContext.Provider>
  )
})

const ActiveTabContentContext = createContext<PackageSettingsPageRoute>()
const SetActiveTabContentContext = createContext<Dispatch<SetStateAction<PackageSettingsPageRoute>>>()

export function useActiveTabContentContext(): PackageSettingsPageRoute {
  return useContext(ActiveTabContentContext)
}

export function useSetActiveTabContentContext(): Dispatch<SetStateAction<PackageSettingsPageRoute>> {
  return useContext(SetActiveTabContentContext)
}

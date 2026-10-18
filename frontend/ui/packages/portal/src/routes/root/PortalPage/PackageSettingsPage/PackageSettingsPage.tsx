/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

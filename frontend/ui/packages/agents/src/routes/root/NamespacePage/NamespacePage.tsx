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

import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { NamespaceToolbar } from './NamespaceToolbar'
import { IdpUrlContextProvider } from './IdpUrlContextProvider'
import type { NamespacePageRoute } from '../../routes'
import { AUTOMATION_PAGE, SECURITY_REPORTS_PAGE, SERVICES_PAGE, SNAPSHOTS_PAGE } from '../../routes'
import { SnapshotsPage } from './SnapshotsPage/SnapshotsPage'
import { AutomationPage } from './AutomationPage/AutomationPage'
import { SecurityReportsPage } from './SecurityReportsPage/SecurityReportsPage'
import { NamespaceNavigationMenu } from './NamespaceNavigationMenu'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { ServicesPageProvider } from './ServicesPage/ServicesPageProvider/ServicesPageProvider'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ServicesPage } from './ServicesPage/ServicesPage'
import { LayoutWithTabs } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithTabs'
import { WelcomePage } from '../WelcomePage'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

export const NamespacePage: FC = memo(() => {
  const { namespaceKey } = useParams()
  const [namespaceMode] = useActiveTabs()

  const workspace = useSearchParam(WORKSPACE_SEARCH_PARAM)

  if (!workspace) {
    return (
      <WelcomePage />
    )
  }

  return (
    <ServicesPageProvider key={namespaceKey}>
      <IdpUrlContextProvider>
        <LayoutWithToolbar
          toolbar={<Toolbar header={<NamespaceToolbar />} />}
          body={<NamespacePageBody menuItem={namespaceMode as NamespacePageRoute} />}
        />
      </IdpUrlContextProvider>
    </ServicesPageProvider>
  )
})

const PATH_PARAM_TO_SUB_PAGE_MAP: Record<NamespacePageRoute, ReactNode> = {
  [SERVICES_PAGE]: <ServicesPage />,
  [SNAPSHOTS_PAGE]: <SnapshotsPage />,
  [AUTOMATION_PAGE]: <AutomationPage />,
  [SECURITY_REPORTS_PAGE]: <SecurityReportsPage />,
}

type NamespacePageBodyProps = {
  menuItem: NamespacePageRoute
}
const NamespacePageBody: FC<NamespacePageBodyProps> = memo<NamespacePageBodyProps>(({ menuItem }) => {
  return (
    <LayoutWithTabs
      tabs={<NamespaceNavigationMenu />}
      body={PATH_PARAM_TO_SUB_PAGE_MAP[menuItem]}
    />
  )
})

export const SERVICES_NAMESPACE_PAGE_MODE = 'services'
export const SNAPSHOTS_NAMESPACE_PAGE_MODE = 'snapshots'
export const AUTOMATION_NAMESPACE_PAGE_MODE = 'automation'
export const SECURITY_REPORTS_NAMESPACE_PAGE_MODE = 'security'

export type NamespacePageMode =
  | typeof SERVICES_NAMESPACE_PAGE_MODE
  | typeof SNAPSHOTS_NAMESPACE_PAGE_MODE
  | typeof AUTOMATION_NAMESPACE_PAGE_MODE
  | typeof SECURITY_REPORTS_NAMESPACE_PAGE_MODE

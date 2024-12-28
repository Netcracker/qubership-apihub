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

import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { AuthenticationReports } from './AuthenticationReports'
import { RoutingReports } from './RoutingReports'
import { AUTHENTICATION_REPORTS_PAGE, ROUTING_REPORTS_PAGE, SECURITY_REPORTS_PAGE } from '../../../routes'
import { useNavigation } from '../../../NavigationProvider'
import { useParams } from 'react-router-dom'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import type { PanelItem, TabItem } from '@netcracker/qubership-apihub-ui-shared/components/Panels/TabsPanel'
import { TabsPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/TabsPanel'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

// High Order Component //
export const SecurityReportsPage: FC = memo(() => {
  const { agentId, namespaceKey } = useParams()
  const workspace = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const [, securitySubTab] = useActiveTabs()
  const { navigateToNamespace } = useNavigation()

  const tabPanels: PanelItem<SecurityReportsTabs>[] = useMemo(() => [{
    key: AUTHENTICATION_REPORTS_PAGE,
    content: <AuthenticationReports/>,
  }, {
    key: ROUTING_REPORTS_PAGE,
    content: <RoutingReports/>,
  }], [])

  const onChangeTab = useCallback((tab: SecurityReportsTabs) => {
    navigateToNamespace({
      agentId: agentId!,
      namespaceKey: namespaceKey!,
      mode: `${SECURITY_REPORTS_PAGE}/${tab}`,
      search: { [WORKSPACE_SEARCH_PARAM]: { value: workspace } },
    })
  }, [agentId, namespaceKey, navigateToNamespace, workspace])

  return (
    <BodyCard
      header="Security Reports"
      body={
        <TabsPanel
          activeTab={securitySubTab as SecurityReportsTabs}
          tabs={SECURITY_REPORTS_TABS}
          panels={tabPanels}
          separator
          onChangeTab={onChangeTab}
        />
      }
    />
  )
})

export type SecurityReportsTabs = typeof AUTHENTICATION_REPORTS_PAGE | typeof ROUTING_REPORTS_PAGE

const SECURITY_REPORTS_TABS: TabItem<SecurityReportsTabs>[] = [{
  key: AUTHENTICATION_REPORTS_PAGE,
  name: 'Authentication Check Report',
}, {
  key: ROUTING_REPORTS_PAGE,
  name: 'Gateway Routing Report',
}]

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
import * as React from 'react'
import { memo, useEffect } from 'react'
import { List } from '@mui/material'
import { useParams } from 'react-router-dom'
import type { OverviewPageRoute } from '../../../../../routes'
import {
  ACTIVITY_HISTORY_PAGE,
  OPERATION_GROUPS_PAGE,
  PACKAGES_PAGE,
  REVISION_HISTORY_PAGE,
  SUMMARY_PAGE,
} from '../../../../../routes'
import { usePackage } from '../../../usePackage'
import { useDeletedReferences, useUpdateDeletedReferences } from '../../useDeletedReferences'
import { OverviewNavigationItem } from './OverviewNavigationItem'
import { getOverviewPath } from '../../../../NavigationProvider'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import type { SidebarMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useVersionReferences } from '@apihub/routes/root/useVersionReferences'

export const OverviewNavigation: FC = memo(() => {
  const { packageId, versionId } = useParams()
  const [packageObject] = usePackage({ showParents: true })
  const packageKind = packageObject?.kind

  const [, sidebarItem] = useActiveTabs()

  const { data: versionReferences } = useVersionReferences({
    packageKey: packageId!,
    version: versionId!,
    enabled: true,
  })
  const [updateDeletedReferences] = useUpdateDeletedReferences()

  useEffect(() => {
    updateDeletedReferences({ versionReferences })
  }, [updateDeletedReferences, versionReferences])

  const { data: deletedReferences } = useDeletedReferences(packageId!, versionId!)

  return (
    <List>
      {OVERVIEW_SIDEBAR(packageKind).map(({ title, id, testId }) => {
        const url = getOverviewPath({ packageKey: packageId!, versionKey: versionId!, tab: id })
        return (
          <OverviewNavigationItem
            key={id}
            url={url}
            title={title}
            id={id}
            testId={testId}
            sidebarItem={sidebarItem}
            deletedReferences={deletedReferences}
          />
        )
      })}
    </List>
  )
})

type OverviewSidebarMenu = SidebarMenu & {
  id: OverviewPageRoute
}

const OVERVIEW_SIDEBAR = (
  packageKind: PackageKind | undefined,
): OverviewSidebarMenu[] => {
  const isDashboard = packageKind === DASHBOARD_KIND

  const commonSidebarMenu: OverviewSidebarMenu[] = [
    {
      id: SUMMARY_PAGE,
      title: 'Summary',
      testId: 'SummaryButton',
    },
    {
      id: ACTIVITY_HISTORY_PAGE,
      title: 'Activity History',
      testId: 'ActivityHistoryButton',
    },
    {
      id: REVISION_HISTORY_PAGE,
      title: 'Revision History',
      testId: 'RevisionsButton',
    },
    {
      id: OPERATION_GROUPS_PAGE,
      title: 'Groups',
      testId: 'OperationGroupsButton',
    },
  ]
  const dashboardPackagesMenuItem: OverviewSidebarMenu = {
    id: PACKAGES_PAGE,
    title: 'Packages',
    testId: 'PackagesButton',
  }

  if (isDashboard) {
    commonSidebarMenu.push(dashboardPackagesMenuItem)
  }

  return commonSidebarMenu
}


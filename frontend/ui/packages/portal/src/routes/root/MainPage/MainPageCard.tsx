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

import { Box, Card, CardContent, CardHeader } from '@mui/material'
import type { FC } from 'react'
import React, { memo, useMemo } from 'react'
import { PackagesFilterer } from './PackagesFilterer'
import { PackagesTree } from './PackagesTree'
import { PackagesTable } from './PackagesTable'
import { MAIN_CARD_STYLES } from './MainPage'
import { UpdatingPackageKeyProvider } from './UpdatingPackageKeyProvider'
import { FLAT_TABLE_MODE, TREE_TABLE_MODE, useTableMode } from '../useTableMode'
import { useSelectedWorkspaceContexts } from './MainPageProvider'
import { useDeepCompareEffect } from 'react-use'
import { usePackage } from '../usePackage'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export type MainPageCardProps = Readonly<{
  title?: string | React.ReactNode
  rootPackageKey?: Key
  action?: React.ReactNode
  content?: React.ReactNode
  hideViewSelector?: boolean
  hideSearchBar?: boolean
  flatViewKinds?: PackageKind[]
  pageKey?: string
}>

export const MainPageCard: FC<MainPageCardProps> = memo<MainPageCardProps>((props) => {
  const {
    title,
    rootPackageKey,
    action,
    content,
    hideSearchBar = false,
    hideViewSelector = false,
    flatViewKinds = [PACKAGE_KIND, DASHBOARD_KIND],
    pageKey,
  } = props
  const [viewMode] = useTableMode(hideViewSelector ? FLAT_TABLE_MODE : TREE_TABLE_MODE)
  const isTreeView = useMemo(() => viewMode === TREE_TABLE_MODE, [viewMode])

  const [packageObject] = usePackage({ packageKey: rootPackageKey, showParents: true })
  const [, setSelectedWorkspace] = useSelectedWorkspaceContexts()
  useDeepCompareEffect(() => {
    setSelectedWorkspace(packageObject?.kind === WORKSPACE_KIND ? packageObject : packageObject?.parents?.[0])
  }, [packageObject])

  return (
    <Card sx={{ ...MAIN_CARD_STYLES, flex: 3, pb: 3, mr: 2 }}>
      <CardHeader
        title={title}
        sx={{ px: 3, py: 3 }}
        action={action ??
          <Box sx={{ display: 'flex', gap: 2, pr: 1 }}>
            <PackagesFilterer
              rootPackageKey={rootPackageKey}
              hideViewSelector={hideViewSelector}
              hideSearchBar={hideSearchBar}
            />
          </Box>}
        titleTypographyProps={{ 'data-testid': 'MainPageCardTitle' }}
        data-testid="MainPageCardHeader"
      >
      </CardHeader>
      <CardContent
        sx={{ px: 4 }}
        data-testid="MainPageCardContent"
      >
        {content ??
          <Box sx={{ height: '100%' }}>
            <Box sx={{ display: 'inline', height: '100%' }}>
              <UpdatingPackageKeyProvider>
                {isTreeView
                  ? <PackagesTree rootPackageKey={rootPackageKey} refererPageName={pageKey ?? rootPackageKey}/>
                  : <PackagesTable
                    rootPackageKey={rootPackageKey}
                    packageKinds={flatViewKinds}
                    refererPageName={pageKey ?? rootPackageKey}
                  />
                }
              </UpdatingPackageKeyProvider>
            </Box>
          </Box>
        }
      </CardContent>
    </Card>
  )
})

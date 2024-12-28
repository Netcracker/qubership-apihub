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
import React, { memo, useState } from 'react'
import { Box, CardContent, Divider } from '@mui/material'
import { OperationsByTagList } from '../OperationsByTagList/OperationsByTagList'
import { useAutoExpandTags } from '../useAutoExpandTags'
import { OperationsFilterPanel } from '../OperationPage/OperationsFilterPanel'
import { DIVIDER_STYLES } from '../shared-styles'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { OperationsGroupedByTag } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_TAG } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationChangeData } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { SidebarSkeleton } from '@netcracker/qubership-apihub-ui-shared/components/SidebarSkeleton'
import {
  NAVIGATION_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type OperationsSidebarOnComparisonProps = {
  operationPackageKey: Key
  operationPackageVersion: VersionKey
  searchValue: string
  setSearchValue: (value: string) => void
  tags: string[]
  apiType: ApiType
  operationsGroupedByTag: OperationsGroupedByTag<OperationChangeData>
  areChangesLoading: boolean
  onOperationClick: (key: Key) => void
}

export const OperationsSidebarOnComparison: FC<OperationsSidebarOnComparisonProps> =
  memo<OperationsSidebarOnComparisonProps>(props => {
    const {
      operationPackageKey,
      operationPackageVersion,
      searchValue,
      setSearchValue,
      tags,
      apiType,
      operationsGroupedByTag,
      areChangesLoading,
      onOperationClick,
    } = props

    const [expanded, setExpanded] = useState<readonly string[]>([])
    useAutoExpandTags(expanded, setExpanded, searchValue, tags)

    return (
      <SidebarPanel
        header={
          <Box mr={4} width="100%" display="flex" flexDirection="column" gap={1}>
            <OperationsFilterPanel
              packageKey={operationPackageKey}
              versionKey={operationPackageVersion}
              apiTypeFilter={apiType}
              comparisonPage={true}
            />
            <Divider flexItem sx={DIVIDER_STYLES}/>
            <SearchBar
              value={searchValue}
              onValueChange={setSearchValue}
              data-testid="SearchOperations"
            />
          </Box>
        }
        body={
          <CardContent sx={{ p: 1 }}>
            {areChangesLoading && isEmpty(tags)
              ? <SidebarSkeleton/>
              : <Placeholder
                invisible={isNotEmpty(tags)}
                area={NAVIGATION_PLACEHOLDER_AREA}
                message={searchValue ? NO_SEARCH_RESULTS : 'No tags'}
                testId={searchValue ? 'NoSearchResultsPlaceholder' : 'NoTagsPlaceholder'}
              >
                {tags.map(tag =>
                  <OperationsByTagList
                    key={tag}
                    tag={tag || DEFAULT_TAG}
                    operationsGroupedByTag={operationsGroupedByTag}
                    isLoading={areChangesLoading}
                    expanded={expanded}
                    setExpanded={setExpanded}
                    onOperationClick={onOperationClick}
                  />,
                )}
              </Placeholder>}
          </CardContent>
        }
      />
    )
  })

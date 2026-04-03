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
import { memo, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import { CONTENT_WIDTH } from './GlobalSearchPanel'
import { Marker } from 'react-mark.js'
import type { FetchNextSearchResultList } from './global-search'
import { getOperationsPath } from '../../../NavigationProvider'
import type { OperationSearchResult } from '@apihub/entities/global-search'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  OperationTitleWithMeta as OperationTitle,
} from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationTitleWithMeta'
import { useEventBus } from '@apihub/routes/EventBusProvider'

export type ApiOperationsSearchListProps = {
  value: OperationSearchResult[]
  searchText: string
  fetchNextPage?: FetchNextSearchResultList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
}

export const ApiOperationsSearchList: FC<ApiOperationsSearchListProps> = memo<ApiOperationsSearchListProps>((
  { value, searchText, isNextPageFetching, hasNextPage, fetchNextPage },
) => {
  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isNextPageFetching, hasNextPage, fetchNextPage)

  const { hideGlobalSearchPanel } = useEventBus()
  return (
    <Box width={CONTENT_WIDTH} position="relative">
      {value.map((operation) => {
        const { version, operationKey, packageKey, apiType, parentPackages, name } = operation
        const { versionKey } = getSplittedVersionKey(version)
        const breadcrumbs = [...parentPackages, name, versionKey].join(' / ')

        return (
          <Box mb={2} key={`api-operations-search-list-box-${packageKey}-${operationKey}-${version}`} data-testid="SearchResultRow">
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <OverflowTooltip title={breadcrumbs}>
                <Typography
                  variant="subtitle2"
                  noWrap
                  data-testid="PathToSearchResultItem"
                >
                  {breadcrumbs}
                </Typography>
              </OverflowTooltip>
            </Box>
            <Marker mark={searchText}>
              <OperationTitle
                operation={operation}
                link={getOperationsPath({
                  packageKey: packageKey,
                  versionKey: versionKey,
                  operationKey: operationKey,
                  apiType: apiType,
                })}
                onLinkClick={hideGlobalSearchPanel}
              />
            </Marker>
          </Box>
        )
      })}

      {hasNextPage && (
        <Box
          ref={ref}
          height="100px"
        >
          <LoadingIndicator/>
        </Box>
      )}
    </Box>
  )
})

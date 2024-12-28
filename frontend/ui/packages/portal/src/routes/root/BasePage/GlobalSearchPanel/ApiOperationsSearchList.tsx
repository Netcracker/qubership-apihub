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
import { ResultCommonHeader } from './ResultCommonHeader'
import { CONTENT_WIDTH } from './GlobalSearchPanel'
import { Marker } from 'react-mark.js'
import type { FetchNextSearchResultList } from './global-search'
import { getOperationsPath } from '../../../NavigationProvider'
import type { GraphQlOperationTypes, OperationSearchResult } from '@apihub/entities/global-search'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { RELEASE_VERSION_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { MethodType } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'

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

  return (
    <Box width={CONTENT_WIDTH} position="relative">
      {value.map(({
        packageKey,
        name,
        parentPackages,
        version,
        title,
        status,
        operationKey,
        path,
        method,
        apiType,
        type,
      }) => {
        const { versionKey } = getSplittedVersionKey(version)
        return (
          <Box mb={2} key={crypto.randomUUID()} data-testid="SearchResultRow">
            <ResultCommonHeader
              url={getOperationsPath({
                packageKey: packageKey,
                versionKey: versionKey,
                operationKey: operationKey,
                apiType: apiType,
              })}
              icon={apiType}
              breadCrumbsStatus={status !== RELEASE_VERSION_STATUS ? status : undefined}
              title={title}
              parents={[...parentPackages, name, versionKey]}
              searchText={searchText}
            />

            <Marker mark={searchText}>
              <Box display="flex" gap={1} alignItems="center" maxWidth={CONTENT_WIDTH}>
                <CustomChip
                  sx={{ mr: 1 }}
                  value={API_TYPE_CHIP_VALUE_MAP[apiType](method, type)}
                  variant="outlined"
                  data-testid="OperationTypeChip"
                />
                <OverflowTooltip title={path}>
                  <Typography
                    overflow="hidden"
                    textOverflow="ellipsis"
                    variant="subtitle2"
                    data-testid="OperationEndpoint"
                  >
                    {path}
                  </Typography>
                </OverflowTooltip>
              </Box>
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

type ChipValueCallback = (method: MethodType | undefined, type: GraphQlOperationTypes | undefined) => string
const API_TYPE_CHIP_VALUE_MAP: Record<ApiType, ChipValueCallback> = {
  [API_TYPE_REST]: (method) => method ?? '',
  [API_TYPE_GRAPHQL]: (_, type) => type ?? '',
}

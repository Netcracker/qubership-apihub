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

import { type FC, memo, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import { Marker } from 'react-mark.js'

import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

import type { PackageSearchResult } from '@portal/entities/global-search'
import { getOverviewPath } from '../../../NavigationProvider'
import type { FetchNextSearchResultList } from './global-search'
import { RateResults } from './RateResults'
import { ResultCommonHeader } from './ResultCommonHeader'
import {
  SearchResultListRoot,
  SearchResultListSentinel,
  SearchResultRowRoot,
} from './SearchResultRowLayout'

type PackageSearchListProps = {
  value: PackageSearchResult[]
  searchText: string
  fetchNextPage?: FetchNextSearchResultList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
}

export const PackageSearchList: FC<PackageSearchListProps> = memo<PackageSearchListProps>((
  { value, searchText, isNextPageFetching, hasNextPage, fetchNextPage },
) => {
  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isNextPageFetching, hasNextPage, fetchNextPage)

  return (
    <SearchResultListRoot>
      {value.map(({ packageKey, name, parentPackages, createdAt, serviceName, labels, version, status }) => {
        const { versionKey } = getSplittedVersionKey(version)
        return (
          <SearchResultRowRoot key={`package-search-list-box-${packageKey}-${versionKey}`} data-testid="SearchResultRow">
            <ResultCommonHeader
              url={getOverviewPath({ packageKey: packageKey, versionKey: versionKey })}
              title={`${name} / ${versionKey}`}
              status={status}
              parents={parentPackages}
              searchText={searchText}
            />

            <Marker mark={searchText}>
              <Box display="flex" gap={1} alignItems="center">
                <Typography variant="body2">Publication date</Typography>
                <Typography
                  variant="subtitle2"
                  data-testid="PublicationDateValue"
                >
                  <FormattedDate value={createdAt}/>
                </Typography>
              </Box>

              <RateResults
                searchText={searchText}
                packageKey={packageKey}
                serviceName={serviceName}
                labels={labels}
              />
            </Marker>
          </SearchResultRowRoot>
        )
      })}

      {hasNextPage && (
        <SearchResultListSentinel ref={ref}>
          <LoadingIndicator/>
        </SearchResultListSentinel>
      )}
    </SearchResultListRoot>
  )
})


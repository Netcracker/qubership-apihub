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
import { memo } from 'react'
import { Box, CircularProgress } from '@mui/material'
import type { DocumentSearchResult, OperationSearchResult, PackageSearchResult } from '@apihub/entities/global-search'

export type SearchResultTabLabelProps = {
  label: string
  results: Array<PackageSearchResult | DocumentSearchResult | OperationSearchResult>
  isLoading: boolean
}

export const SearchResultTabLabel: FC<SearchResultTabLabelProps> = memo<SearchResultTabLabelProps>(({
  isLoading,
  results,
  label,
}) => {
  return (
    <Box display="flex" gap={1}>
      <Box>{label}</Box>
      <>
        {isLoading ? <CircularProgress size={14}/> : countSearchResult(results)}
      </>
    </Box>
  )
})

function countSearchResult(
  value: Array<PackageSearchResult | DocumentSearchResult | OperationSearchResult>,
): string | number | undefined {
  const { length } = value
  if (length === 0) {
    return undefined
  }

  return length > 99 ? '99+' : length
}

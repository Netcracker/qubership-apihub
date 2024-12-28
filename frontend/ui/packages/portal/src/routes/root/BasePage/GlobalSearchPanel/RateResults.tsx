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
import { hasSearchText } from './search-text'
import { Box, Typography } from '@mui/material'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'

export type RateResultsProps = {
  searchText: string
  serviceName?: string | undefined
  packageKey?: string | undefined
  labels?: string[] | undefined
}

export const RateResults: FC<RateResultsProps> = memo<RateResultsProps>(({
  searchText,
  serviceName,
  packageKey,
  labels,
}) => {
  if (serviceName && hasSearchText(serviceName, searchText)) {
    return (
      <Box display="flex" gap={1} alignItems="center">
        <Typography variant="body2">Service name</Typography>
        <Typography variant="subtitle2">{serviceName}</Typography>
      </Box>
    )
  }
  if (packageKey && hasSearchText(packageKey, searchText)) {
    return (
      <OverflowTooltip title={packageKey}>
        <Typography noWrap textOverflow="ellipsis" overflow="hidden" variant="subtitle2">{packageKey}</Typography>
      </OverflowTooltip>
    )
  }
  if (labels && labels.some(label => hasSearchText(label, searchText))) {
    return (
      <>
        {labels.map(label => <CustomChip sx={{ mr: 1 }} key={crypto.randomUUID()} value={label}/>)}
      </>
    )
  }

  return null
})

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
import type { Row } from '@tanstack/react-table'
import { Box, Typography } from '@mui/material'
import type { Service } from '@agents/entities/services'
import {
  BACKWARD_COMPATIBLE_MESSAGE,
  BACKWARD_INCOMPATIBLE_MESSAGE,
  BASELINE_NOT_FOUND_MESSAGE,
  BASELINE_VERSION_NOT_FOUND_MESSAGE,
} from './validationMessages'
import { ComparisonIncompleteStatus } from './ComparisonIncompleteStatus'
import type {
  StatusMarkerVariant} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import {
  ERROR_STATUS_MARKER_VARIANT,
  StatusMarker,
  SUCCESS_STATUS_MARKER_VARIANT,
  WARNING_STATUS_MARKER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'

export type BwcStatusTableCellProps = {
  value: Row<CellData>
}

type CellData = Partial<{
  service: Service
  bwcErrors: number
  baselineFound: boolean
  baselineVersionFound: boolean
  changelogHasErrors: boolean
}>

export const BwcStatusTableCell: FC<BwcStatusTableCellProps> = memo<BwcStatusTableCellProps>((
  {
    value: {
      original: { service, bwcErrors, baselineFound, baselineVersionFound, changelogHasErrors },
    },
  },
) => {
  if (!service) {
    return null
  }

  if (!baselineFound) {
    return (
      <BwcStatusTableCellContent
        status={WARNING_STATUS_MARKER_VARIANT}
        content={BASELINE_NOT_FOUND_MESSAGE}
      />
    )
  }

  if (!baselineVersionFound) {
    return (
      <BwcStatusTableCellContent
        status={WARNING_STATUS_MARKER_VARIANT}
        content={BASELINE_VERSION_NOT_FOUND_MESSAGE}
      />
    )
  }

  // The list of changes may be incomplete, so the breaking-changes count is not shown as a compatibility result
  if (changelogHasErrors) {
    return <ComparisonIncompleteStatus/>
  }

  if (bwcErrors === undefined) {
    return null
  }

  const areBwcErrorsExist = bwcErrors > 0
  return (
    <BwcStatusTableCellContent
      status={areBwcErrorsExist ? ERROR_STATUS_MARKER_VARIANT : SUCCESS_STATUS_MARKER_VARIANT}
      content={areBwcErrorsExist ? BACKWARD_INCOMPATIBLE_MESSAGE : BACKWARD_COMPATIBLE_MESSAGE}
    />
  )
})

type BwcStatusTableCellContentProps = {
  status: StatusMarkerVariant
  content: string
}

const BwcStatusTableCellContent: FC<BwcStatusTableCellContentProps> = memo<BwcStatusTableCellContentProps>(({
  status,
  content,
}) => {
  return (
    <Box display="flex" gap={1}>
      <StatusMarker value={status}/>
      <Typography noWrap variant="inherit">
        {content}
      </Typography>
    </Box>
  )
})

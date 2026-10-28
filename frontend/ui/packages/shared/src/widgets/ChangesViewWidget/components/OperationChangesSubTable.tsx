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

import { Box, Skeleton, styled, TableCell, TableRow, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'
import { ChangeSeverityIndicator } from '../../../components/ChangeSeverityIndicator'
import { OverflowTooltip } from '../../../components/OverflowTooltip'
import type { OperationChanges } from '../../../entities/operation-changelog'

export type OperationChangesSubTableProps = {
  changes: OperationChanges
  isLoading: boolean
  columnCount: number
}

export const OperationChangesSubTable: FC<OperationChangesSubTableProps> = memo<OperationChangesSubTableProps>((
  {
    changes,
    isLoading,
    columnCount,
  },
) => {
  if (isLoading) {
    return (
      <TableRow>
        <ExpandCell colSpan={columnCount}>
          <Skeleton variant="text" width="100%" />
        </ExpandCell>
      </TableRow>
    )
  }

  return (
    <>
      {changes.map((change, index) => (
        <TableRow key={`${change.scope}-${index}`}>
          <ExpandCell colSpan={columnCount}>
            <DescriptionRow data-testid="ChangeDescriptionCell">
              <ChangeSeverityIndicator severity={change.severity} />
              <OverflowTooltip title={change.description}>
                <DescriptionText noWrap variant="inherit">{change.description}</DescriptionText>
              </OverflowTooltip>
            </DescriptionRow>
          </ExpandCell>
        </TableRow>
      ))}
    </>
  )
})

OperationChangesSubTable.displayName = 'OperationChangesSubTable'

const ExpandCell = styled(TableCell)({
  padding: 0,
})

const DescriptionRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  height: '32px',
  position: 'relative',
})

const DescriptionText = styled(Typography)(({ theme }) => ({
  marginLeft: theme.spacing(4),
}))

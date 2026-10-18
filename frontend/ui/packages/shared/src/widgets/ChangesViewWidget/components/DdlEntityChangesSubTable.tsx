import { Box, Skeleton, styled, TableCell, TableRow, Typography } from '@mui/material'
import { type FC, memo } from 'react'

import { ChangeSeverityIndicator } from '../../../components/ChangeSeverityIndicator'
import { OverflowTooltip } from '../../../components/OverflowTooltip'
import type { ChangeSeverity } from '../../../entities/change-severities'
import type { OperationChanges } from '../../../entities/operation-changelog'

export type DdlEntityChangesSubTableProps = {
  changes: OperationChanges
  isLoading: boolean
  columnCount: number
}

export const DdlEntityChangesSubTable: FC<DdlEntityChangesSubTableProps> = memo<DdlEntityChangesSubTableProps>(({
  changes,
  isLoading,
  columnCount,
}) => {
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
              <ChangeSeverityIndicator severity={change.severity as ChangeSeverity} />
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

DdlEntityChangesSubTable.displayName = 'DdlEntityChangesSubTable'

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

import { Box, Skeleton, styled, TableCell, TableRow, Typography } from '@mui/material'
import { type FC, memo } from 'react'
import { ChangeSeverityIndicator } from '../../../components/ChangeSeverityIndicator'
import { OverflowTooltip } from '../../../components/OverflowTooltip'
import type { OperationChanges } from '../../../entities/operation-changelog'

export type ChangesSubTableProps = {
  changes: OperationChanges
  isLoading: boolean
  columnCount: number
}

export const ChangesSubTable: FC<ChangesSubTableProps> = memo<ChangesSubTableProps>((
  {
    changes,
    isLoading,
    columnCount,
  },
) => {
  if (isLoading) {
    return (
      <TableRow>
        <ExpandedRowCell colSpan={columnCount}>
          <Skeleton variant="text" width="100%" />
        </ExpandedRowCell>
      </TableRow>
    )
  }

  return (
    <>
      {changes.map((change, index) => (
        <TableRow key={`${change.scope}-${index}`}>
          <ExpandedRowCell colSpan={columnCount}>
            <DescriptionRow data-testid="ChangeDescriptionCell">
              <ChangeSeverityIndicator severity={change.severity} />
              <OverflowTooltip title={change.description}>
                <DescriptionText noWrap variant="inherit">{change.description}</DescriptionText>
              </OverflowTooltip>
            </DescriptionRow>
          </ExpandedRowCell>
        </TableRow>
      ))}
    </>
  )
})

ChangesSubTable.displayName = 'ChangesSubTable'

const ExpandedRowCell = styled(TableCell)({
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

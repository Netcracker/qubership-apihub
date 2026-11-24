import type { FC } from 'react'
import { memo, useMemo } from 'react'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Typography from '@mui/material/Typography'
import type { ChangesTooltipCategory } from './ChangesTooltip'
import { ChangesTooltip } from './ChangesTooltip'
import type { ChangeSeverity, ChangesSummary } from '../entities/change-severities'
import { CHANGE_SEVERITY_COLOR_MAP, CHANGE_SEVERITY_NAME_MAP } from '../entities/change-severities'
import { severityOrder } from '../utils/api-changes'
import type { DiffType } from '@netcracker/qubership-apihub-api-diff'

export type ChangesProps = {
  value: ChangesSummary | undefined
  mode?: 'default' | 'compact'
  zeroView?: boolean
  category?: ChangesTooltipCategory
}

export const Changes: FC<ChangesProps> = memo<ChangesProps>(({
  value,
  mode = 'default',
  zeroView = false,
  category,
}) => {

  const sortedChanges = useMemo(() => (value ? sortSummaryChanges(value) : null), [value])

  if (!sortedChanges) {
    return null
  }

  return (
    <List component="span" sx={{ display: 'flex', p: 0, width: 'fit-content' }} data-testid="ChangesSummary">
      {Object.entries(sortedChanges).map(([type, count]) => {
        if (!count && !zeroView) {
          return null
        }
        const changeName = CHANGE_SEVERITY_NAME_MAP[type as keyof ChangesSummary]
        const changeColor = CHANGE_SEVERITY_COLOR_MAP[type as keyof ChangesSummary]
        return (
          <ListItem key={type} component="span" sx={{ p: 0 }}>
            <ChangesTooltip
              changeType={type as ChangeSeverity}
              category={category}
              disableHoverListener={mode === 'default'}
            >
              <Box data-testid={type} display="flex" alignItems="baseline">
                <Box
                  component="span"
                  sx={{ backgroundColor: changeColor, width: 8, height: 8, borderRadius: '50%', mr: 1 }}
                />
                <Typography noWrap component="span" sx={{ fontSize: 13, mr: 1.5 }}>
                  {mode === 'default' ? `${changeName}: ${count}` : count}
                </Typography>
              </Box>
            </ChangesTooltip>
          </ListItem>
        )
      })}
    </List>
  )
})

function sortSummaryChanges(value: ChangesSummary): ChangesSummary {
  return Object.fromEntries(
    Object.entries(value).sort(
      ([keyA], [keyB]) => severityOrder[keyA as DiffType] - severityOrder[keyB as DiffType],
    ),
  ) as ChangesSummary
}

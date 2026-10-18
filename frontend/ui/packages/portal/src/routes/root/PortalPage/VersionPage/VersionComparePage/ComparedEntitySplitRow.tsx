import { Box, Grid, ListItem } from '@mui/material'
import type { ChangeSummary } from '@netcracker/qubership-apihub-api-processor'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import { ChangeSeverityIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityIndicator'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import type { ActionType, ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { ACTION_TYPE_COLOR_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import { NavLink, type To } from 'react-router-dom'

export type ComparedEntitySplitRowProps = TestableProps & {
  rowKey: string
  action: ActionType
  severity: ChangeSeverity
  to: To
  onClick?: () => void
  renderLeft: () => ReactNode
  renderRight: () => ReactNode
}

export const ComparedEntitySplitRow: FC<ComparedEntitySplitRowProps> = memo<ComparedEntitySplitRowProps>(({
  rowKey,
  action,
  severity,
  to,
  onClick,
  renderLeft,
  renderRight,
  'data-testid': dataTestId = 'ComparisonRow',
}) => (
  <Grid
    key={rowKey}
    component={NavLink}
    container
    spacing={0}
    sx={{
      textDecoration: 'none',
      color: '#353C4E',
      height: '70px',
      marginBottom: '8px',
      position: 'relative',
    }}
    to={to}
    onClick={onClick}
    data-testid={dataTestId}
  >
    <Grid
      item
      xs={6}
      sx={{
        borderRight: '1px solid #D5DCE3',
        background: ACTION_TYPE_COLOR_MAP[action] ?? '#F2F3F5',
      }}
      data-testid="LeftComparisonSummary"
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <ChangeSeverityIndicator
          severity={severity}
          sx={{
            alignItems: 'center',
            display: 'flex',
            overflow: 'hidden',
            zIndex: '1',
            '&:hover': {
              color: '#FFFFFF',
              padding: '5px',
              width: '105px',
            },
          }}
        />
        {renderLeft()}
      </Box>
    </Grid>

    <Grid
      item
      xs={6}
      sx={{ background: ACTION_TYPE_COLOR_MAP[action] ?? '#F2F3F5' }}
      data-testid="RightComparisonSummary"
    >
      {renderRight()}
    </Grid>
  </Grid>
))

ComparedEntitySplitRow.displayName = 'ComparedEntitySplitRow'

export type EntityChangesSummaryProps = {
  title?: ReactNode
  changes?: ChangeSummary
  emptyPadding?: boolean
}

export const EntityChangesSummary: FC<EntityChangesSummaryProps> = memo<EntityChangesSummaryProps>(({
  title,
  changes,
  emptyPadding = false,
}) => (
  <ListItem
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      padding: changes ? '2px 16px' : '8px 16px',
      paddingTop: title ? 0 : emptyPadding ? '44px' : '8px 16px',
      overflow: 'hidden',
      gap: '2px',
    }}
  >
    {title}
    {changes && <Changes value={changes} mode="compact" />}
  </ListItem>
))

EntityChangesSummary.displayName = 'EntityChangesSummary'

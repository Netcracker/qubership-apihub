import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import type { TestableProps } from './Testable'

export type ToolbarProps = {
  breadcrumbs?: ReactNode
  header?: ReactNode
  action?: ReactNode
  size?: ToolbarSize
  maxWidthHeaderToolbar?: number
} & TestableProps

export const Toolbar: FC<ToolbarProps> = memo<ToolbarProps>(({
  breadcrumbs,
  header,
  action,
  size = SMALL_TOOLBAR_SIZE,
  maxWidthHeaderToolbar,
  'data-testid': dataTestId,
}) => {
  return (
    <Card>
      <CardHeader
        sx={{ height: TOOLBAR_HEIGHT[breadcrumbs ? LARGE_TOOLBAR_SIZE : size], px: 4, maxWidth: maxWidthHeaderToolbar }}
        title={breadcrumbs}
        subheader={
          <Box
            display="flex"
            maxWidth="55vw"
            gap={1}
            alignItems="baseline"
            height={28}
          >
            {header}
          </Box>
        }
        subheaderTypographyProps={{ variant: 'h5', color: '#000000' }}
        action={
          <Box display="flex" gap={1}>
            {action}
          </Box>
        }
        data-testid={dataTestId}
      />
    </Card>
  )
})

export const SMALL_TOOLBAR_SIZE = 'small'
export const MEDIUM_TOOLBAR_SIZE = 'medium'
export const LARGE_TOOLBAR_SIZE = 'large'
type ToolbarSize =
  | typeof SMALL_TOOLBAR_SIZE
  | typeof MEDIUM_TOOLBAR_SIZE
  | typeof LARGE_TOOLBAR_SIZE

const TOOLBAR_HEIGHT: Record<ToolbarSize, string> = {
  [SMALL_TOOLBAR_SIZE]: '36px',
  [MEDIUM_TOOLBAR_SIZE]: '64px',
  [LARGE_TOOLBAR_SIZE]: '72px',
}

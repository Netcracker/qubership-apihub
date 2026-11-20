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
  /** The height of the header row, 28px by default; a row of form fields needs more. */
  headerHeight?: number
  /** The side padding in theme spacing units, 4 (32px) by default. */
  paddingX?: number
  maxWidthHeaderToolbar?: number
} & TestableProps

export const Toolbar: FC<ToolbarProps> = memo<ToolbarProps>(({
  breadcrumbs,
  header,
  action,
  size = SMALL_TOOLBAR_SIZE,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  paddingX = DEFAULT_PADDING_X,
  maxWidthHeaderToolbar,
  'data-testid': dataTestId,
}) => {
  return (
    <Card>
      <CardHeader
        sx={{ height: TOOLBAR_HEIGHT[breadcrumbs ? LARGE_TOOLBAR_SIZE : size], px: paddingX, maxWidth: maxWidthHeaderToolbar }}
        title={breadcrumbs}
        subheader={
          <Box
            display="flex"
            maxWidth="55vw"
            gap={1}
            alignItems="baseline"
            height={headerHeight}
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

const DEFAULT_HEADER_HEIGHT = 28
const DEFAULT_PADDING_X = 4

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

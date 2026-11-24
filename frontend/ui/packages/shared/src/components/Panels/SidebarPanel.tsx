import { Box, Divider } from '@mui/material'
import type { FC, ReactNode } from 'react'
import * as React from 'react'
import { memo, useMemo } from 'react'

export type SidebarPanelProps = {
  header?: ReactNode
  body?: ReactNode
  withDivider?: boolean
  headerFullWidth?: boolean
}

// First Order Component //
export const SidebarPanel: FC<SidebarPanelProps> = memo<SidebarPanelProps>(({
  header,
  body,
  withDivider,
  headerFullWidth,
}) => {
  const headerStyles = useMemo(
    () => (!headerFullWidth ? { display: 'flex', gap: 2, marginX: 2, marginY: 2 } : {}),
    [headerFullWidth],
  )

  return (
    <Box display="flex" height="100%" width="100%" flexDirection="column" overflow="hidden" data-testid="SidebarPanel">
      {header && (
        <>
          <Box
            alignItems="center"
            justifyContent="space-between"
            width="100%"
            sx={headerStyles}
          >
            {header}
          </Box>
          {withDivider && <Divider orientation="horizontal" variant="fullWidth"/>}
        </>
      )}
      {body}
    </Box>
  )
})

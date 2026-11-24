import type { FC, PropsWithChildren } from 'react'
import React, { memo, useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import { IconButton } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined'

export type ExpandableItemProps = PropsWithChildren<{
  expanded?: boolean
  onToggle: (value: boolean) => void
  showToggler?: boolean
}>

// First Order Component //
export const ExpandableItem: FC<ExpandableItemProps> = memo<ExpandableItemProps>(({
  expanded = false,
  onToggle,
  showToggler,
  children,
}) => {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(expanded)

  useEffect(() => {
    setInternalExpanded(expanded)
  }, [expanded])

  const onClick = useCallback(() => {
    setInternalExpanded(!internalExpanded)
    onToggle(!internalExpanded)
  }, [internalExpanded, onToggle])

  return (
    <Box
      gap="2px"
      py="4px"
      display="grid"
      gridTemplateColumns={`${ICON_SIZE} calc(100% - ${ICON_SIZE})`}
    >
      {showToggler
        ? (
          <IconButton sx={{ p: 0 }} onClick={onClick}>
            {internalExpanded
              ? <KeyboardArrowDownOutlinedIcon sx={{ fontSize: '16px' }}/>
              : <KeyboardArrowRightOutlinedIcon sx={{ fontSize: '16px' }}/>}
          </IconButton>
        )
        // placeholder
        : <Box/>
      }

      {children}
    </Box>
  )
})

const ICON_SIZE = '20px'

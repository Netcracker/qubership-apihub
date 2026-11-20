import type { FC } from 'react'
import { memo } from 'react'
import { Card, ListItemButton } from '@mui/material'
import { DEFAULT_PAPER_SHADOW } from '../themes/palette'
import { KeyboardDoubleArrowLeftIcon } from '../icons/KeyboardDoubleArrowLeftIcon'

export type CollapsedPanelProps = {
  onExpand: () => void
}

// First Order Component //
export const CollapsedPanel: FC<CollapsedPanelProps> = memo(props => {
  const {
    onExpand,
  } = props

  return (
    <>
      <Card sx={{
        width: '52px',
        height: '68px',
        boxShadow: DEFAULT_PAPER_SHADOW,
          borderRadius: '10px 0 0 10px',
        }}>
          <ListItemButton
            onClick={onExpand}
            sx={{
              height: '100%',
              justifyContent: 'center',
            }}
            data-testid="ExpandPanelButton"
          >
            <KeyboardDoubleArrowLeftIcon size={11}/>
          </ListItemButton>
        </Card>
      </>
    )
  },
)

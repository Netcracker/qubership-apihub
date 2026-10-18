import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined'
import { MenuItem, styled } from '@mui/material'
import { type FC, memo, useCallback, useState } from 'react'

import {
  SHAREABILITY_STATUS_NON_SHAREABLE,
  SHAREABILITY_STATUS_SHAREABLE,
  SHAREABILITY_STATUS_UNKNOWN,
  type ShareabilityStatus,
} from '@netcracker/qubership-apihub-api-processor'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { ShareabilityMarker } from './ShareabilityMarker'

const DROPDOWN_OPTIONS: ShareabilityStatus[] = [
  SHAREABILITY_STATUS_NON_SHAREABLE,
  SHAREABILITY_STATUS_SHAREABLE,
  SHAREABILITY_STATUS_UNKNOWN,
]

const DROPDOWN_OPTION_LABELS: Record<ShareabilityStatus, string> = {
  [SHAREABILITY_STATUS_NON_SHAREABLE]: 'Non-Shareable',
  [SHAREABILITY_STATUS_SHAREABLE]: 'Shareable',
  [SHAREABILITY_STATUS_UNKNOWN]: 'Unknown',
}

const ShareabilityDropdownButton = styled(MenuButton)({
  '&&.MuiButton-root': {
    width: 48,
    minWidth: 48,
    padding: '10px',
  },
  '&& .MuiButton-startIcon': {
    marginLeft: 0,
    marginRight: 0,
    '& .MuiSvgIcon-root': {
      fontSize: 20,
    },
  },
})

type ShareabilityDropdownProps = {
  value: ShareabilityStatus
  onChange: (value: ShareabilityStatus) => void
  isLoading?: boolean
}

export const ShareabilityDropdown: FC<ShareabilityDropdownProps> = memo(({
  value,
  onChange,
  isLoading = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleOpen = useCallback(() => setMenuOpen(true), [])
  const handleClose = useCallback(() => setMenuOpen(false), [])
  const handleItemClick = useCallback(
    (status: ShareabilityStatus) => () => onChange(status),
    [onChange],
  )

  return (
    <ShareabilityDropdownButton
      startIcon={<ShareabilityMarker value={value} isLoading={isLoading} />}
      icon={menuOpen
        ? <KeyboardArrowUpOutlinedIcon fontSize="small" />
        : <KeyboardArrowDownOutlinedIcon fontSize="small" />}
      variant="outlined"
      disabled={isLoading}
      onClick={handleOpen}
      onClose={handleClose}
      data-testid="ShareabilityDropdownButton"
    >
      {DROPDOWN_OPTIONS.map((status) => (
        <MenuItem
          key={status}
          selected={status === value}
          onClick={handleItemClick(status)}
          data-testid={`ShareabilityOption-${status}`}
        >
          {DROPDOWN_OPTION_LABELS[status]}
        </MenuItem>
      ))}
    </ShareabilityDropdownButton>
  )
})

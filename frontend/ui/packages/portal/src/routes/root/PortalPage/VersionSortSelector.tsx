import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined'
import { Box, MenuItem, styled } from '@mui/material'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { SortIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SortIcon'
import type { FC } from 'react'
import { memo, useCallback, useState } from 'react'
import type { VersionListSort, VersionListSortOption } from './version-list-sort'
import { getVersionListSortKey, isSameVersionListSort, VERSION_LIST_SORT_OPTIONS } from './version-list-sort'

export type VersionSortSelectorProps = Readonly<{
  value: VersionListSortOption
  onChange: (sort: VersionListSort) => void
  disabled?: boolean
}>

const MENU_BUTTON_SX = { whiteSpace: 'nowrap' } as const

export const VersionSortSelector: FC<VersionSortSelectorProps> = memo<VersionSortSelectorProps>(({
  value,
  onChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)

  const handleOpen = useCallback(() => setOpen(true), [])
  const handleClose = useCallback(() => setOpen(false), [])

  return (
    // The selector lives inside the version selector menu: keyboard navigation of the sort menu
    // must not bubble up and move focus in the outer menu (the same as in SearchBar).
    <Box onKeyDown={event => event.stopPropagation()}>
      <MenuButton
        variant="outlined"
        title={value.label}
        startIcon={<SortIcon />}
        icon={open
          ? <KeyboardArrowUpOutlinedIcon fontSize="small" />
          : <KeyboardArrowDownOutlinedIcon fontSize="small" />}
        disabled={disabled}
        onClick={handleOpen}
        onClose={handleClose}
        sx={MENU_BUTTON_SX}
        data-testid="VersionSortButton"
      >
        {VERSION_LIST_SORT_OPTIONS.map(option => {
          const key = getVersionListSortKey(option)
          return (
            <VersionSortMenuItem
              key={key}
              selected={isSameVersionListSort(option, value)}
              onClick={() => onChange(option)}
              data-testid={`VersionSortOption-${key}`}
            >
              {option.label}
            </VersionSortMenuItem>
          )
        })}
      </MenuButton>
    </Box>
  )
})

const VersionSortMenuItem = styled(MenuItem)(({ theme }) => ({
  '&.Mui-selected': {
    fontWeight: theme.typography.fontWeightMedium,
  },
}))

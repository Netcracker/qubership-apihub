import { menuItemClasses } from '@mui/material/MenuItem'
import type { Theme } from '@mui/material/styles'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import { ChevronDownIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ChevronDownIcon'
import type { FC } from 'react'

import { DROPDOWN_PAPER_STYLES, getListItemStyles } from './dropdown'

type SelectOverrides = NonNullable<NonNullable<Theme['components']>['MuiSelect']>

/**
 * Extends the shared overrides of `Select`, so that every select follows the select of the design library without
 * search: the chevron, and the open list of the library. Each override below says what MUI does and what the design
 * asks instead.
 */
export function createSelectOverrides(base: SelectOverrides = {}): SelectOverrides {
  const { root, focusVisible, selected } = menuItemClasses

  return {
    ...base,
    defaultProps: {
      ...base.defaultProps,
      // MUI draws its arrow; the design draws its chevron, which turns over while the menu is open, as the arrow does
      IconComponent: SelectIcon,
      // The design gives the menu the padding, radius, shadow, and rows of the open list of an autocomplete. The menu
      // is a Popover, whose theme overrides would reach every menu of the app, so the select styles its own.
      MenuProps: {
        ...base.defaultProps?.MenuProps,
        PaperProps: {
          sx: {
            ...DROPDOWN_PAPER_STYLES,
            [`& .${root}`]: getListItemStyles([
              '&:hover',
              `&.${focusVisible}`,
              `&.${selected}`,
              `&.${selected}:hover`,
              `&.${selected}.${focusVisible}`,
            ]),
          },
        },
        // MUI pads the list 8px at the top and bottom; in the design only the padding of the paper surrounds the rows
        MenuListProps: {
          sx: {
            padding: 0,
          },
        },
      },
    },
  }
}

const SelectIcon: FC<SvgIconProps> = props => <ChevronDownIcon {...props} fontSize="small" />

SelectIcon.displayName = 'SelectIcon'

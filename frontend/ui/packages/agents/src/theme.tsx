import { autocompleteClasses } from '@mui/material/Autocomplete'
import CircularProgress, { circularProgressClasses } from '@mui/material/CircularProgress'
import { menuItemClasses } from '@mui/material/MenuItem'
import { styled, type Theme } from '@mui/material/styles'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import { BlockIcon } from '@netcracker/qubership-apihub-ui-shared/icons/BlockIcon'
import { CancelCircleIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CancelCircleIcon'
import { ChevronDownIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ChevronDownIcon'
import { SearchIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SearchIcon'
import { DROPDOWN_SHADOW, LIST_ITEM_HIGHLIGHT_COLOR } from '@netcracker/qubership-apihub-ui-shared/themes/colors'
import { theme as sharedTheme } from '@netcracker/qubership-apihub-ui-shared/themes/theme'
import type { FC } from 'react'

const POPUP_CHEVRON_CLASS = 'AgentsAutocomplete-chevron'
const POPUP_SEARCH_CLASS = 'AgentsAutocomplete-search'
// The design draws an 18px spinner with a 2px line, and CircularProgress measures its line in a 44px box
const SPINNER_SIZE = 18
const SPINNER_THICKNESS = (2 * 44) / SPINNER_SIZE
const DROPDOWN_GAP = 4
const DROPDOWN_PADDING = 4
const DROPDOWN_RADIUS = 6
const LIST_ITEM_MIN_HEIGHT = 32
const LIST_ITEM_PADDING = '5px 8px'
const LIST_ITEM_RADIUS = 3
const LIST_FONT_SIZE = 13
const LIST_LINE_HEIGHT = '20px'
// MUI marks an option highlighted from the keyboard with this class, which the types of `autocompleteClasses` miss
const OPTION_FOCUS_VISIBLE_CLASS = 'Mui-focusVisible'

const { MuiAutocomplete, MuiSelect } = sharedTheme.components ?? {}

// The theme below builds elements of these components when the module loads, so they come first.
// The end adornment shows one of the two icons, the chevron or, while the autocomplete is focused, the magnifier
const AutocompletePopupIcon: FC = () => (
  <>
    <ChevronDownIcon className={POPUP_CHEVRON_CLASS} fontSize="small" />
    <SearchIcon className={POPUP_SEARCH_CLASS} fontSize="small" />
  </>
)

AutocompletePopupIcon.displayName = 'AutocompletePopupIcon'

const SelectIcon: FC<SvgIconProps> = props => <ChevronDownIcon {...props} fontSize="small" />

SelectIcon.displayName = 'SelectIcon'

const ListSpinner = styled(CircularProgress)({
  [`& .${circularProgressClasses.circle}`]: {
    strokeLinecap: 'round',
  },
})

/**
 * The shared theme, in which every autocomplete and select of the Agents app follows the select of the design
 * library: a chevron that does not turn, a magnifier and a clear button while an autocomplete is focused, and an
 * open list with a spinner while it loads and "Nothing found" when it has no options. The components are spread
 * rather than merged with `createTheme`, which would deep-clone the elements of the icons.
 */
export const theme: Theme = {
  ...sharedTheme,
  components: {
    ...sharedTheme.components,
    MuiAutocomplete: {
      ...MuiAutocomplete,
      defaultProps: {
        ...MuiAutocomplete?.defaultProps,
        popupIcon: <AutocompletePopupIcon />,
        clearIcon: <CancelCircleIcon fontSize="small" />,
        loadingText: <ListSpinner size={SPINNER_SIZE} thickness={SPINNER_THICKNESS} />,
        noOptionsText: (
          <>
            <BlockIcon fontSize="small" />
            Nothing found
          </>
        ),
      },
      styleOverrides: {
        ...MuiAutocomplete?.styleOverrides,
        endAdornment: ({ ownerState }) => ({
          // MUI centers the end adornment for a 28px button, and the buttons of these icons are smaller
          top: '50%',
          transform: 'translateY(-50%)',
          [`& .${ownerState.focused ? POPUP_CHEVRON_CLASS : POPUP_SEARCH_CLASS}`]: {
            display: 'none',
          },
          // MUI shows the clear button on hover too; the doubled class outweighs that rule of the root
          ...(!ownerState.focused && {
            [`&& .${autocompleteClasses.clearIndicator}`]: {
              visibility: 'hidden',
            },
          }),
        }),
        popupIndicatorOpen: {
          transform: 'none',
        },
        paper: {
          margin: `${DROPDOWN_GAP}px 0`,
          padding: DROPDOWN_PADDING,
          borderRadius: DROPDOWN_RADIUS,
          boxShadow: DROPDOWN_SHADOW,
        },
        listbox: ({ theme }) => ({
          padding: 0,
          fontSize: LIST_FONT_SIZE,
          color: theme.palette.common.black,
          [`& .${autocompleteClasses.option}`]: {
            minHeight: LIST_ITEM_MIN_HEIGHT,
            padding: LIST_ITEM_PADDING,
            borderRadius: LIST_ITEM_RADIUS,
            // The design has one highlight for a row under the pointer and for the selected row
            [
              `&.${autocompleteClasses.focused}, &.${OPTION_FOCUS_VISIBLE_CLASS}, &[aria-selected="true"], ` +
              `&[aria-selected="true"].${autocompleteClasses.focused}, ` +
              `&[aria-selected="true"].${OPTION_FOCUS_VISIBLE_CLASS}`
            ]: {
              backgroundColor: LIST_ITEM_HIGHLIGHT_COLOR,
            },
          },
        }),
        loading: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: LIST_ITEM_MIN_HEIGHT,
          padding: 0,
        },
        noOptions: ({ theme }) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minHeight: LIST_ITEM_MIN_HEIGHT,
          padding: LIST_ITEM_PADDING,
          fontSize: LIST_FONT_SIZE,
          lineHeight: LIST_LINE_HEIGHT,
          color: theme.palette.text.secondary,
        }),
      },
    },
    MuiSelect: {
      ...MuiSelect,
      defaultProps: {
        ...MuiSelect?.defaultProps,
        IconComponent: SelectIcon,
        MenuProps: {
          ...MuiSelect?.defaultProps?.MenuProps,
          PaperProps: {
            sx: {
              padding: `${DROPDOWN_PADDING}px`,
              borderRadius: `${DROPDOWN_RADIUS}px`,
              boxShadow: DROPDOWN_SHADOW,
              [`& .${menuItemClasses.root}`]: {
                minHeight: LIST_ITEM_MIN_HEIGHT,
                padding: LIST_ITEM_PADDING,
                borderRadius: `${LIST_ITEM_RADIUS}px`,
                lineHeight: LIST_LINE_HEIGHT,
                [
                  `&:hover, &.${menuItemClasses.focusVisible}, &.${menuItemClasses.selected}, ` +
                  `&.${menuItemClasses.selected}:hover, &.${menuItemClasses.selected}.${menuItemClasses.focusVisible}`
                ]: {
                  backgroundColor: LIST_ITEM_HIGHLIGHT_COLOR,
                },
              },
            },
          },
          MenuListProps: {
            sx: {
              padding: 0,
            },
          },
        },
      },
      styleOverrides: {
        ...MuiSelect?.styleOverrides,
        iconOpen: {
          transform: 'none',
        },
      },
    },
  },
}

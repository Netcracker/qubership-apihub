import { type AutocompleteClasses, autocompleteClasses } from '@mui/material/Autocomplete'
import CircularProgress, { circularProgressClasses } from '@mui/material/CircularProgress'
import { styled, type Theme } from '@mui/material/styles'
import { BlockIcon } from '@netcracker/qubership-apihub-ui-shared/icons/BlockIcon'
import { CancelCircleIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CancelCircleIcon'
import { ChevronDownIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ChevronDownIcon'
import { SearchIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SearchIcon'
import type { FC } from 'react'

import {
  DROPDOWN_PAPER_STYLES,
  getListItemStyles,
  LIST_ITEM_MIN_HEIGHT,
  LIST_ITEM_PADDING,
  LIST_LINE_HEIGHT,
} from './dropdown'

type AutocompleteOverrides = NonNullable<NonNullable<Theme['components']>['MuiAutocomplete']>
type StyleOverride = NonNullable<AutocompleteOverrides['styleOverrides']>[keyof AutocompleteClasses]
type StyleOverrideFunction = Extract<StyleOverride, (props: never) => unknown>

const CHEVRON_CLASS = 'AgentsAutocomplete-chevron'
const SEARCH_CLASS = 'AgentsAutocomplete-search'
// The design draws an 18px spinner with a 2px line, and CircularProgress measures its line in a 44px box
const SPINNER_SIZE = 18
const SPINNER_THICKNESS = (2 * 44) / SPINNER_SIZE
const DROPDOWN_GAP = 4
// MUI marks an option reached with the keyboard with this class, which `autocompleteClasses` does not list
const OPTION_FOCUS_VISIBLE_CLASS = 'Mui-focusVisible'

/**
 * Extends the shared overrides of `Autocomplete`, so that every autocomplete follows the select of the design
 * library with its search: the chevron, a magnifier and the clear button only while the field is focused, and the
 * open list of the library. Each override below says what MUI does and what the design asks instead.
 */
export function createAutocompleteOverrides(base: AutocompleteOverrides = {}): AutocompleteOverrides {
  const { focused, clearIndicator, popupIndicator, option } = autocompleteClasses

  return {
    ...base,
    defaultProps: {
      ...base.defaultProps,
      // MUI draws its arrow; the design draws its chevron, and the magnifier in its place while the field is focused
      popupIcon: <PopupIcon />,
      // MUI draws a cross; the design draws a cross in a circle
      clearIcon: <CancelCircleIcon fontSize="small" />,
      // MUI writes "Loading..." in the open list; the design shows a spinner
      loadingText: <ListSpinner size={SPINNER_SIZE} thickness={SPINNER_THICKNESS} />,
      // MUI writes "No options"; the design writes "Nothing found" after the block icon
      noOptionsText: <NoOptionsText />,
    },
    styleOverrides: {
      ...base.styleOverrides,
      root: extendStyleOverride(base.styleOverrides?.root, {
        // MUI shows the clear button on hover too, and the design only in focus. This rule weighs as much as that
        // rule of MUI and follows it in the class of the root, so it wins.
        [`&:not(.${focused}) .${clearIndicator}`]: {
          visibility: 'hidden',
        },
        // The design shows the chevron at rest and the magnifier in focus
        [`&:not(.${focused}) .${SEARCH_CLASS}, &.${focused} .${CHEVRON_CLASS}`]: {
          display: 'none',
        },
        // MUI opens and closes the list with the button of the icon and names the action in its tooltip. The
        // magnifier of the design only marks the search, so a click on it goes to the field.
        [`&.${focused} .${popupIndicator}`]: {
          pointerEvents: 'none',
        },
      }),
      // MUI centers the end adornment for its 28px buttons; the icons of the design are 20px
      endAdornment: {
        top: '50%',
        transform: 'translateY(-50%)',
      },
      // MUI turns the button over while the list is open. The list is open only in focus, when the button holds the
      // magnifier, which stays upright.
      popupIndicatorOpen: {
        transform: 'none',
      },
      // The design sets the list 4px under the field, with its own padding, radius, and shadow
      paper: extendStyleOverride(base.styleOverrides?.paper, {
        margin: `${DROPDOWN_GAP}px 0`,
        ...DROPDOWN_PAPER_STYLES,
      }),
      // MUI pads the list 8px at the top and bottom; in the design only the padding of the paper surrounds the rows
      listbox: extendStyleOverride(base.styleOverrides?.listbox, {
        padding: 0,
        [`& .${option}`]: getListItemStyles([
          `&.${focused}`,
          `&.${OPTION_FOCUS_VISIBLE_CLASS}`,
          '&[aria-selected="true"]',
          `&[aria-selected="true"].${focused}`,
          `&[aria-selected="true"].${OPTION_FOCUS_VISIBLE_CLASS}`,
        ]),
      }),
      // MUI pads a line of text; the design centers the spinner in a row as high as an option
      loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: LIST_ITEM_MIN_HEIGHT,
        padding: 0,
      },
      // MUI writes a black line; the design draws a grey row as high as an option, with the block icon
      noOptions: extendStyleOverride(base.styleOverrides?.noOptions, ({ theme }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minHeight: LIST_ITEM_MIN_HEIGHT,
        padding: LIST_ITEM_PADDING,
        lineHeight: LIST_LINE_HEIGHT,
        color: theme.palette.text.secondary,
      })),
    },
  }
}

// Both icons stay in the button, and the root hides one of them
const PopupIcon: FC = () => (
  <>
    <ChevronDownIcon className={CHEVRON_CLASS} fontSize="small" />
    <SearchIcon className={SEARCH_CLASS} fontSize="small" />
  </>
)

PopupIcon.displayName = 'PopupIcon'

const NoOptionsText: FC = () => (
  <>
    <BlockIcon fontSize="small" />
    Nothing found
  </>
)

NoOptionsText.displayName = 'NoOptionsText'

const ListSpinner = styled(CircularProgress)({
  [`& .${circularProgressClasses.circle}`]: {
    strokeLinecap: 'round',
  },
})

// Applies the shared override of a slot first and the extension after it, so that the extension wins a tie
function extendStyleOverride(base: StyleOverride | undefined, extension: StyleOverride): StyleOverrideFunction {
  return props => [resolveStyleOverride(base, props), resolveStyleOverride(extension, props)]
}

function resolveStyleOverride(
  override: StyleOverride | undefined,
  props: Parameters<StyleOverrideFunction>[0],
): ReturnType<StyleOverrideFunction> {
  return typeof override === 'function' ? override(props) : override
}

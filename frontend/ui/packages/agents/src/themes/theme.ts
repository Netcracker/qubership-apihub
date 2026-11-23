import type { Theme } from '@mui/material/styles'
import { theme as sharedTheme } from '@netcracker/qubership-apihub-ui-shared/themes/theme'

import { createAutocompleteOverrides } from './overrides/autocomplete'
import { getScrollbarStyles, MEDIUM_SCROLLBAR } from './overrides/scrollbar'
import { createSelectOverrides } from './overrides/select'

/**
 * The theme of the Agents app: the shared theme, in which every autocomplete and select follows the select of the
 * design library, and every scrollbar the scrollbar of the library. The components are spread rather than merged
 * with `createTheme`, which would deep-clone the elements of the icons.
 */
export const theme: Theme = {
  ...sharedTheme,
  components: {
    ...sharedTheme.components,
    MuiAutocomplete: createAutocompleteOverrides(sharedTheme.components?.MuiAutocomplete),
    MuiSelect: createSelectOverrides(sharedTheme.components?.MuiSelect),
    // Replaces the 8px dark thumb of the shared baseline, which the Portal keeps
    MuiCssBaseline: {
      ...sharedTheme.components?.MuiCssBaseline,
      styleOverrides: getScrollbarStyles('', MEDIUM_SCROLLBAR),
    },
  },
}

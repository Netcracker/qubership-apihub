import type { Theme } from '@mui/material/styles'
import { theme as sharedTheme } from '@netcracker/qubership-apihub-ui-shared/themes/theme'

import { createAutocompleteOverrides } from './overrides/autocomplete'
import { createSelectOverrides } from './overrides/select'

/**
 * The theme of the Agents app: the shared theme, in which every autocomplete and select follows the select of the
 * design library. The components are spread rather than merged with `createTheme`, which would deep-clone the
 * elements of the icons.
 */
export const theme: Theme = {
  ...sharedTheme,
  components: {
    ...sharedTheme.components,
    MuiAutocomplete: createAutocompleteOverrides(sharedTheme.components?.MuiAutocomplete),
    MuiSelect: createSelectOverrides(sharedTheme.components?.MuiSelect),
  },
}

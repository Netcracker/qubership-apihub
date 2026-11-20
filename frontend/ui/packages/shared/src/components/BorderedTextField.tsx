import { filledInputClasses } from '@mui/material/FilledInput'
import { styled } from '@mui/material/styles'

import { HINT_COLOR } from '../themes/colors'
import { LargeTextField } from './LargeTextField'

/**
 * A {@link LargeTextField} with a border and no background, also when it is disabled. The theme draws the 1px border
 * of the hover, focus, and error states.
 */
export const BorderedTextField = styled(LargeTextField)({
  [`& .${filledInputClasses.root}`]: {
    backgroundColor: 'transparent',
    [`&:hover, &.${filledInputClasses.focused}`]: {
      backgroundColor: 'transparent',
    },
    [`&:not(.${filledInputClasses.focused}):not(.${filledInputClasses.error})`]: {
      borderColor: HINT_COLOR,
    },
  },
  // The doubled class outweighs the disabled background of LargeTextField, whose styles come later in the page
  [`&& .${filledInputClasses.root}.${filledInputClasses.disabled}`]: {
    backgroundColor: 'transparent',
  },
})

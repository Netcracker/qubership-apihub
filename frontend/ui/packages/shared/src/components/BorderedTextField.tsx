import { filledInputClasses } from '@mui/material/FilledInput'
import { inputBaseClasses } from '@mui/material/InputBase'
import { inputLabelClasses } from '@mui/material/InputLabel'
import { styled } from '@mui/material/styles'
import TextField, { type FilledTextFieldProps } from '@mui/material/TextField'
import { forwardRef } from 'react'

import { HINT_COLOR } from '../themes/colors'

const FIELD_HEIGHT = 44
// Centers the value line about 29px under the top of the field, where the design draws it
const VALUE_PADDING_TOP = 18
// The theme's size of an input label, and the design's size of the label above a value
const LABEL_FONT_SIZE = 13
const SHRUNK_LABEL_FONT_SIZE = 11
const SHRUNK_LABEL_SCALE = SHRUNK_LABEL_FONT_SIZE / LABEL_FONT_SIZE

export type BorderedTextFieldProps = Omit<FilledTextFieldProps, 'variant'>

/**
 * A filled text field with a border and no background, 44px high when it is small and single-line. The label stays
 * inside the box, as in every filled field, and the theme draws the 1px border of the hover, focus, and error states.
 */
export const BorderedTextField = forwardRef<HTMLDivElement, BorderedTextFieldProps>((props, ref) => (
  <StyledTextField {...props} ref={ref} variant="filled" />
))

BorderedTextField.displayName = 'BorderedTextField'

const StyledTextField = styled(TextField)({
  [`& .${filledInputClasses.root}`]: {
    backgroundColor: 'transparent',
    [`&:hover, &.${filledInputClasses.focused}, &.${filledInputClasses.disabled}`]: {
      backgroundColor: 'transparent',
    },
    [`&:not(.${filledInputClasses.focused}):not(.${filledInputClasses.error})`]: {
      borderColor: HINT_COLOR,
    },
  },
  // Autocomplete pads the root instead of the input. Without the root padding, one input padding places the value the
  // same way in a text field, a select, and an autocomplete.
  [`& .${filledInputClasses.root}.${inputBaseClasses.sizeSmall}:not(.${inputBaseClasses.multiline})`]: {
    height: FIELD_HEIGHT,
    paddingTop: 0,
    [`& .${filledInputClasses.input}`]: {
      paddingTop: VALUE_PADDING_TOP,
    },
  },
  [`& .${inputLabelClasses.sizeSmall}.${inputLabelClasses.shrink}`]: {
    // MUI sizes the label for its own scale of 0.75. A long label scaled less would run past the right edge before
    // its ellipsis; this width keeps the 12px padding on either side.
    maxWidth: `calc((100% - 24px) / ${SHRUNK_LABEL_SCALE})`,
    // 0.33px at 11px, as in the design
    letterSpacing: '0.03em',
    transform: `translate(12px, 4px) scale(${SHRUNK_LABEL_SCALE})`,
  },
})

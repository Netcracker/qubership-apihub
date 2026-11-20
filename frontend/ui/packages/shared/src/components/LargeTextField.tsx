import { autocompleteClasses } from '@mui/material/Autocomplete'
import { filledInputClasses } from '@mui/material/FilledInput'
import { inputBaseClasses } from '@mui/material/InputBase'
import { inputLabelClasses } from '@mui/material/InputLabel'
import { selectClasses } from '@mui/material/Select'
import { styled } from '@mui/material/styles'
import TextField, { type FilledTextFieldProps } from '@mui/material/TextField'
import { forwardRef } from 'react'

const FIELD_HEIGHT = 44
// Centers the value line about 29px under the top of the field, where the design draws it under a label
const VALUE_PADDING_TOP = 18
// The theme's size of an input label, and the design's size of the label above a value
const LABEL_FONT_SIZE = 13
const SHRUNK_LABEL_FONT_SIZE = 11
const SHRUNK_LABEL_SCALE = SHRUNK_LABEL_FONT_SIZE / LABEL_FONT_SIZE
// The 1px border and this offset place the icon 12px from the outer edge
const ICON_RIGHT = 11

export type LargeTextFieldProps = Omit<FilledTextFieldProps, 'variant'>

/**
 * The theme's filled text field, 44px high when it is small and single-line. A label stays inside the box and shrinks
 * to 11px above a value. A field without a label centers its value, unless `hiddenLabel` is set to `false`.
 */
export const LargeTextField = forwardRef<HTMLDivElement, LargeTextFieldProps>(({ hiddenLabel, ...props }, ref) => (
  <StyledTextField {...props} ref={ref} variant="filled" hiddenLabel={hiddenLabel ?? !props.label} />
))

LargeTextField.displayName = 'LargeTextField'

const StyledTextField = styled(TextField)(({ theme }) => ({
  // The colors of a value and of a placeholder in the design
  [`& .${filledInputClasses.input}`]: {
    color: theme.palette.common.black,
    '&::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 1,
    },
  },
  // A disabled field takes the colors of a disabled service label on the Discover Services step
  [`& .${filledInputClasses.root}.${filledInputClasses.disabled}`]: {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.action.disabled,
    [`& .${filledInputClasses.input}`]: {
      color: theme.palette.action.disabled,
      WebkitTextFillColor: theme.palette.action.disabled,
      '&::placeholder': {
        color: theme.palette.action.disabled,
      },
    },
  },
  [`& .${inputLabelClasses.root}.${inputLabelClasses.disabled}`]: {
    color: theme.palette.action.disabled,
  },
  // Autocomplete pads the root instead of the input. Without the root padding, one input padding places the value the
  // same way in a text field, a select, and an autocomplete.
  [`& .${filledInputClasses.root}.${inputBaseClasses.sizeSmall}:not(.${inputBaseClasses.multiline})`]: {
    height: FIELD_HEIGHT,
    paddingTop: 0,
    [`& .${filledInputClasses.input}`]: {
      paddingTop: VALUE_PADDING_TOP,
    },
    // The root aligns its items to the center, so an input with no vertical padding sits in the middle of the field
    [`&.${inputBaseClasses.hiddenLabel} .${filledInputClasses.input}`]: {
      paddingTop: 0,
      paddingBottom: 0,
    },
    // Places the chevron or the arrow of an autocomplete and a select where the design draws it
    [`& .${autocompleteClasses.endAdornment}, & .${selectClasses.icon}`]: {
      right: ICON_RIGHT,
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
}))

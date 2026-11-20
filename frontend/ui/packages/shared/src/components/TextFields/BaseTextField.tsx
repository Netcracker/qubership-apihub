import { autocompleteClasses } from '@mui/material/Autocomplete'
import { filledInputClasses } from '@mui/material/FilledInput'
import { formHelperTextClasses } from '@mui/material/FormHelperText'
import { formLabelClasses } from '@mui/material/FormLabel'
import { inputBaseClasses } from '@mui/material/InputBase'
import { inputLabelClasses } from '@mui/material/InputLabel'
import { selectClasses } from '@mui/material/Select'
import { styled } from '@mui/material/styles'
import TextField, { type FilledTextFieldProps } from '@mui/material/TextField'
import { forwardRef } from 'react'

import { RequiredMarkIcon } from '../../icons/RequiredMarkIcon'
import { FIELD_BACKGROUND_COLOR, HINT_COLOR } from '../../themes/colors'

export type BaseTextFieldProps = Omit<FilledTextFieldProps, 'variant'>

export type TextFieldAppearance = 'default' | 'outlined'

type AppearanceProps = {
  appearance: TextFieldAppearance
}

const MEDIUM_FIELD_HEIGHT = 44
const SMALL_FIELD_HEIGHT = 32
const LINE_HEIGHT = 20
// With the 1px border, this offset places the text and the icons 12px from the outer edge, as in the design
const CONTENT_OFFSET = 11
const ICON_SIZE = 20
const ICON_GAP = 8
// The design draws the value of a medium field with a label 19px under its top edge, and centers it otherwise
const MEDIUM_LABELED_PADDING_TOP = 18
const MEDIUM_LABELED_PADDING_BOTTOM = 4
const MEDIUM_PADDING_Y = 11
const SMALL_PADDING_Y = 5
const LABEL_X = 12
const MEDIUM_LABEL_Y = 12
const SMALL_LABEL_Y = 6
// The theme's size of an input label, and the design's size of the label above a value
const LABEL_FONT_SIZE = 13
const SHRUNK_LABEL_FONT_SIZE = 11
const SHRUNK_LABEL_SCALE = SHRUNK_LABEL_FONT_SIZE / LABEL_FONT_SIZE
// Centers the scaled 20px line of the label 12px under the top edge, where the design draws the 14px line
const SHRUNK_LABEL_Y = 3.5
// 0.33px at 11px, as in the design
const SMALL_TEXT_LETTER_SPACING = '0.03em'
// The mark of the design is 4.3 x 4.5px, smaller than any font size of the theme and not square
const REQUIRED_MARK_WIDTH = 4.28125
const REQUIRED_MARK_HEIGHT = 4.5
const REQUIRED_MARK_CLASS = 'BaseTextField-requiredMark'

/**
 * The text field of the design library, which `DefaultTextField` and `OutlinedTextField` draw: a filled field 44px
 * high, or 32px high when `size` is `small`, for a text, a select, or the input of an autocomplete.
 *
 * In a medium field, the label of an empty field stays in the middle and moves above the value in 11px, and a
 * field without a label centers its value. A small field shows its label only while it is empty. The label of a
 * required field ends in a mark that is red while the field is empty.
 */
export const BaseTextField = forwardRef<HTMLDivElement, BaseTextFieldProps & AppearanceProps>(({
  appearance,
  size = 'medium',
  margin = 'none',
  label,
  required,
  hiddenLabel,
  InputLabelProps,
  ...props
}, ref) => {
  const isSmall = size === 'small'
  const fieldLabel = required && label
    ? (
      <>
        {label}
        <RequiredMarkIcon
          className={REQUIRED_MARK_CLASS}
          viewBox={`0 0 ${REQUIRED_MARK_WIDTH} ${REQUIRED_MARK_HEIGHT}`}
        />
      </>
    )
    : label

  return (
    <StyledTextField
      {...props}
      ref={ref}
      variant="filled"
      appearance={appearance}
      size={size}
      margin={margin}
      label={fieldLabel}
      required={required}
      hiddenLabel={hiddenLabel ?? !label}
      // The label draws its own required mark, so the input alone carries `required`
      InputLabelProps={{ ...InputLabelProps, required: false, ...(isSmall && { shrink: false }) }}
    />
  )
})

BaseTextField.displayName = 'BaseTextField'

const StyledTextField = styled(TextField, {
  shouldForwardProp: prop => prop !== 'appearance',
})<AppearanceProps>(({ theme, appearance, size, select, disabled }) => {
  const isSmall = size === 'small'
  const isOutlined = appearance === 'outlined'
  const background = isOutlined ? theme.palette.common.white : FIELD_BACKGROUND_COLOR
  const restBorderColor = isOutlined ? HINT_COLOR : 'transparent'
  const labelTransform = `translate(${LABEL_X}px, ${isSmall ? SMALL_LABEL_Y : MEDIUM_LABEL_Y}px) scale(1)`

  return {
    // The design draws a disabled field with its label and icons at half opacity
    opacity: disabled ? 0.5 : undefined,
    // The doubled class outweighs the paddings Autocomplete gives to its input and to the root of the input
    [`&& .${filledInputClasses.root}.${inputBaseClasses.root}`]: {
      height: isSmall ? SMALL_FIELD_HEIGHT : MEDIUM_FIELD_HEIGHT,
      // The right padding is left to Autocomplete, which keeps room for its icons there
      paddingTop: isSmall ? SMALL_PADDING_Y : MEDIUM_LABELED_PADDING_TOP,
      paddingBottom: isSmall ? SMALL_PADDING_Y : MEDIUM_LABELED_PADDING_BOTTOM,
      paddingLeft: 0,
      backgroundColor: background,
      borderColor: restBorderColor,
      [`&:hover, &.${filledInputClasses.focused}, &.${filledInputClasses.disabled}`]: {
        backgroundColor: background,
      },
      [`&.${filledInputClasses.disabled}`]: {
        borderColor: restBorderColor,
      },
      // A 1px shadow inside the 1px border makes the 2px focus border of the design without moving the content
      [`&.${filledInputClasses.focused}`]: {
        borderColor: theme.palette.primary.main,
        boxShadow: `inset 0 0 0 1px ${theme.palette.primary.main}`,
      },
      // The error border stays 1px, also in focus
      [`&.${filledInputClasses.error}`]: {
        borderColor: theme.palette.error.main,
        boxShadow: 'none',
      },
      [`&.${inputBaseClasses.hiddenLabel}`]: {
        paddingTop: isSmall ? SMALL_PADDING_Y : MEDIUM_PADDING_Y,
        paddingBottom: isSmall ? SMALL_PADDING_Y : MEDIUM_PADDING_Y,
      },
      [`& .${inputBaseClasses.input}.${filledInputClasses.input}`]: {
        height: LINE_HEIGHT,
        padding: `0 ${CONTENT_OFFSET}px`,
        color: theme.palette.common.black,
        '&::placeholder': {
          color: theme.palette.text.secondary,
          WebkitTextFillColor: theme.palette.text.secondary,
          opacity: 1,
        },
        [`&.${inputBaseClasses.disabled}`]: {
          WebkitTextFillColor: theme.palette.common.black,
        },
        [`&.${autocompleteClasses.input}`]: {
          paddingRight: 0,
        },
        [`&.${selectClasses.select}`]: {
          minHeight: 0,
          lineHeight: `${LINE_HEIGHT}px`,
          paddingRight: CONTENT_OFFSET + ICON_SIZE + ICON_GAP,
        },
      },
      // The icons come in the `small` font size of the theme, 20px as in the design
      [`& .${selectClasses.icon}`]: {
        right: CONTENT_OFFSET,
        top: '50%',
        transform: 'translateY(-50%)',
        color: theme.palette.text.primary,
      },
      [`& .${autocompleteClasses.endAdornment}`]: {
        right: CONTENT_OFFSET,
        display: 'flex',
        alignItems: 'center',
        gap: ICON_GAP,
      },
      [`& .${autocompleteClasses.popupIndicator}, & .${autocompleteClasses.clearIndicator}`]: {
        padding: 0,
        margin: 0,
      },
      [`& .${autocompleteClasses.popupIndicator}`]: {
        color: theme.palette.text.primary,
      },
      [`& .${autocompleteClasses.clearIndicator}`]: {
        color: theme.palette.action.active,
      },
    },
    [`& .${inputLabelClasses.root}`]: {
      lineHeight: `${LINE_HEIGHT}px`,
      transform: labelTransform,
      [`&.${formLabelClasses.disabled}`]: {
        color: theme.palette.text.secondary,
      },
      // A small field keeps the grey label of an empty field in focus and hides it under a value. The transparent
      // label still names the input for a screen reader.
      ...(isSmall && {
        [`&.${formLabelClasses.focused}`]: {
          color: theme.palette.text.secondary,
        },
        [`&.${formLabelClasses.filled}`]: {
          opacity: 0,
        },
      }),
      [`&.${formLabelClasses.error}`]: {
        color: theme.palette.error.main,
      },
    },
    [`& .${inputLabelClasses.root}.${inputLabelClasses.shrink}`]: {
      transform: `translate(${LABEL_X}px, ${SHRUNK_LABEL_Y}px) scale(${SHRUNK_LABEL_SCALE})`,
      // MUI sizes the label for its own scale of 0.75. A long label scaled less would run past the right edge before
      // its ellipsis; this width keeps the 12px padding on either side.
      maxWidth: `calc((100% - ${2 * LABEL_X}px) / ${SHRUNK_LABEL_SCALE})`,
      letterSpacing: SMALL_TEXT_LETTER_SPACING,
    },
    // The design keeps the label of an empty select in the middle while the select is focused
    ...(select && {
      [`& .${inputLabelClasses.root}.${inputLabelClasses.shrink}.${formLabelClasses.focused}:not(.${formLabelClasses.filled})`]:
        {
          transform: labelTransform,
          maxWidth: `calc(100% - ${2 * LABEL_X}px)`,
          letterSpacing: 'normal',
        },
    }),
    [`& .${REQUIRED_MARK_CLASS}`]: {
      width: REQUIRED_MARK_WIDTH,
      height: REQUIRED_MARK_HEIGHT,
      verticalAlign: 'top',
      marginTop: 2,
      color: theme.palette.error.main,
    },
    [`& .${formLabelClasses.filled} .${REQUIRED_MARK_CLASS}`]: {
      color: theme.palette.text.secondary,
    },
    ...(!isSmall && {
      [`& .${formLabelClasses.focused} .${REQUIRED_MARK_CLASS}`]: {
        color: theme.palette.primary.main,
      },
    }),
    [`& .${formLabelClasses.error} .${REQUIRED_MARK_CLASS}`]: {
      color: theme.palette.error.main,
    },
    [`& .${formHelperTextClasses.root}`]: {
      margin: '4px 0 0',
      padding: `0 ${LABEL_X}px`,
      fontSize: SHRUNK_LABEL_FONT_SIZE,
      lineHeight: '14px',
      letterSpacing: SMALL_TEXT_LETTER_SPACING,
      color: theme.palette.text.secondary,
      [`&.${formHelperTextClasses.disabled}`]: {
        color: theme.palette.text.secondary,
      },
      [`&.${formHelperTextClasses.error}`]: {
        color: theme.palette.error.main,
      },
    },
  }
})

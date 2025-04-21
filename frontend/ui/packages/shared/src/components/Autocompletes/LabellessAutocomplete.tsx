import React, { memo, type ReactElement } from 'react'
import type { AutocompleteProps, SxProps, TextFieldProps, Theme } from '@mui/material'
import { Autocomplete, Box, TextField, Typography } from '@mui/material'

export type LabellessAutocompleteProps<T> = {
  open?: boolean
  placeholder?: string
  prefixText?: string
  helperText?: string
  reserveHelperTextSpace?: boolean
  inputProps?: TextFieldProps
  value?: T[]
} & Omit<AutocompleteProps<T, boolean, boolean, boolean>, 'renderInput'>

const AUTOCOMPLETE_SX: SxProps<Theme> = {
  '& .MuiAutocomplete-inputRoot': {
    py: 1,
    maxWidth: 392,
    '&.MuiInputBase-sizeSmall': {
      py: 1,
    },
  },
  '& .MuiAutocomplete-tag': {
    my: 0.25,
    ml: 0,
    mr: 1,
  },
}

const HELPER_TEXT_BOX_SX: SxProps<Theme> = {
  height: '20px',
  display: 'flex',
  alignItems: 'center',
}

const PREFIX_TEXT_SX: SxProps<Theme> = {
  opacity: 0.5,
}

const INPUT_STYLE = {
  marginLeft: -4,
  paddingBottom: 2.75,
}

function LabellessAutocompleteComponent<T>({
  open,
  placeholder,
  prefixText,
  helperText,
  reserveHelperTextSpace,
  inputProps,
  value,
  ...props
}: LabellessAutocompleteProps<T>): ReactElement {

  return (
    <>
      <Autocomplete
        open={open}
        sx={AUTOCOMPLETE_SX}
        value={value}
        renderInput={(params): ReactElement => (
          <TextField
            {...params}
            {...inputProps}
            placeholder={placeholder}
            inputProps={{
              ...params.inputProps,
              style: INPUT_STYLE,
            }}
            InputProps={{
              ...params.InputProps,
              ...(inputProps?.InputProps || {}),
              startAdornment: (
                <>
                  {params.InputProps.startAdornment}
                  {prefixText && (
                    <Box component="span" sx={PREFIX_TEXT_SX}>
                      {prefixText}
                    </Box>
                  )}
                </>
              ),
            }}
          />
        )}
        {...props}
      />

      {/* Placeholder box that reserves space for helper text */}
      {(reserveHelperTextSpace || helperText) && (
        <Box sx={HELPER_TEXT_BOX_SX}>
          {
            <Typography
              variant="caption"
              color={inputProps?.error ? 'error' : 'text.secondary'}
            >
              {helperText}
            </Typography>
          }
        </Box>
      )}
    </>
  )
}

LabellessAutocompleteComponent.displayName = 'LabellessAutocomplete'

/**
 * Autocomplete component without a visible label.
 * Supports prefix text, helper text, and custom styling.
 */
export const LabellessAutocomplete = memo(LabellessAutocompleteComponent) as typeof LabellessAutocompleteComponent

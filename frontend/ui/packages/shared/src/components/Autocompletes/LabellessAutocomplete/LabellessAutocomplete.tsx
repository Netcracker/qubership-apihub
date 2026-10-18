import React, { memo, type ReactElement } from 'react'
import { Autocomplete, type AutocompleteProps } from '@mui/material'

export type LabellessAutocompleteProps<T> = {
  maxWidth?: React.CSSProperties['maxWidth']
} & AutocompleteProps<T, boolean, boolean, boolean>

function LabellessAutocompleteComponent<T>({ maxWidth, ...props }: LabellessAutocompleteProps<T>): ReactElement {
  return (
    <Autocomplete
      sx={{
        '& .MuiAutocomplete-inputRoot': {
          py: 1,
          maxWidth: { maxWidth },
          '&.MuiInputBase-sizeSmall': {
            py: 1,
          },
        },
        '& .MuiAutocomplete-tag': {
          my: 0.25,
          ml: 0,
          mr: 1,
        },
      }}
      {...props}
    />
  )
}

LabellessAutocompleteComponent.displayName = 'LabellessAutocomplete'

/**
 * A specialized Autocomplete component without a visible label.
 * Provides consistent styling for all autocomplete inputs across the application.
 * Particularly useful for forms where label space needs to be conserved.
 */
export const LabellessAutocomplete = memo(LabellessAutocompleteComponent) as typeof LabellessAutocompleteComponent

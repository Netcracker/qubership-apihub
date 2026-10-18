import type { FC, SyntheticEvent } from 'react'
import React, { memo } from 'react'
import type { AutocompleteValue } from '@mui/material'
import { Autocomplete, Chip, TextField } from '@mui/material'

export type LabelsAutocompleteProps = {
  onChange: (event: SyntheticEvent, value: AutocompleteValue<string, true, false, true>) => void
  value: string[] | undefined
  disabled?: boolean
}

export const LabelsAutocomplete: FC<LabelsAutocompleteProps> = memo<LabelsAutocompleteProps>(({ onChange, value, disabled }) => {
  return (
    <Autocomplete
      sx={autocompleteSx}
      open={false}
      value={value}
      options={[]}
      autoSelect
      multiple
      freeSolo
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          autoComplete="on"
          {...params}
          label="Labels"
        />
      )}
      renderTags={(tagValue, getTagProps): React.ReactElement[] =>
        tagValue.map((value, index): React.ReactElement => {
          const { ...tagProps } = getTagProps({ index })
          return (
            <Chip
              {...tagProps}
              key={value}
              label={value}
              size="small"
            />
          )
        })
      }
      onChange={onChange}
      data-testid="LabelsAutocomplete"
    />
  )
})

const autocompleteSx = {
  '& .MuiAutocomplete-tag': {
    my: 0.5,
  },
}

LabelsAutocomplete.displayName = 'LabelsAutocomplete'


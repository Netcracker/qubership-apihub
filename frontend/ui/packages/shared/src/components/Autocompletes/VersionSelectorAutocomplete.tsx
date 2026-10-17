import Autocomplete, { type AutocompleteProps, type AutocompleteRenderInputParams } from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

import { genericMemo } from '../../utils/components'

const INPUT_INDICATOR_EXTRA_PADDING = 28

type VersionSelectorAutocompleteProps<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
> =
  & AutocompleteProps<Value, Multiple, DisableClearable, FreeSolo>
  & {
    inputChip?: ReactNode
    inputIndicator?: ReactNode
  }

function VersionSelectorAutocompleteComponent<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
>({
  inputChip,
  inputIndicator,
  renderInput,
  sx,
  ...autocompleteProps
}: VersionSelectorAutocompleteProps<Value, Multiple, DisableClearable, FreeSolo>): ReactElement {
  const hasInputIndicator = !!inputIndicator

  return (
    <Autocomplete
      {...autocompleteProps}
      sx={hasInputIndicator ? [inputIndicatorAutocompleteSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])] : sx}
      renderInput={(params) => {
        const inputParams = augmentRenderInputParams(params, inputChip, inputIndicator)
        if (renderInput) {
          return renderInput(inputParams)
        }
        return <TextField {...inputParams} />
      }}
    />
  )
}

VersionSelectorAutocompleteComponent.displayName = 'VersionSelectorAutocomplete'

export const VersionSelectorAutocomplete = genericMemo(VersionSelectorAutocompleteComponent)

const inputIndicatorAutocompleteSx = {
  '& .MuiAutocomplete-endAdornment': {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  '&.MuiAutocomplete-hasPopupIcon:not(.MuiAutocomplete-hasClearIcon) .MuiAutocomplete-inputRoot': {
    paddingRight: `${39 + INPUT_INDICATOR_EXTRA_PADDING}px`,
  },
  '&.MuiAutocomplete-hasPopupIcon.MuiAutocomplete-hasClearIcon .MuiAutocomplete-inputRoot': {
    paddingRight: `${65 + INPUT_INDICATOR_EXTRA_PADDING}px`,
  },
  '&.MuiAutocomplete-hasClearIcon:not(.MuiAutocomplete-hasPopupIcon) .MuiAutocomplete-inputRoot': {
    paddingRight: `${39 + INPUT_INDICATOR_EXTRA_PADDING}px`,
  },
}

function augmentRenderInputParams(
  params: AutocompleteRenderInputParams,
  inputChip?: ReactNode,
  inputIndicator?: ReactNode,
): AutocompleteRenderInputParams {
  return {
    ...params,
    InputProps: {
      ...params.InputProps,
      endAdornment: composeInputEndAdornment(params.InputProps.endAdornment, inputChip, inputIndicator),
    },
  }
}

function composeInputEndAdornment(
  autocompleteEndAdornment: ReactNode,
  inputChip?: ReactNode,
  inputIndicator?: ReactNode,
): ReactNode {
  const endAdornment = appendIndicatorToAutocompleteEndAdornment(autocompleteEndAdornment, inputIndicator)

  if (!inputChip) {
    return endAdornment
  }

  return (
    <>
      {inputChip}
      {endAdornment}
    </>
  )
}

function appendIndicatorToAutocompleteEndAdornment(
  autocompleteEndAdornment: ReactNode,
  indicator?: ReactNode,
): ReactNode {
  if (!indicator) {
    return autocompleteEndAdornment
  }
  // MUI renders no end adornment for a free-solo field without the clear button, such as a disabled one,
  // so the indicator becomes the end adornment of the input.
  if (!isValidElement(autocompleteEndAdornment)) {
    return indicator
  }

  return cloneElement(autocompleteEndAdornment, undefined, [
    ...Children.toArray(autocompleteEndAdornment.props.children),
    indicator,
  ])
}

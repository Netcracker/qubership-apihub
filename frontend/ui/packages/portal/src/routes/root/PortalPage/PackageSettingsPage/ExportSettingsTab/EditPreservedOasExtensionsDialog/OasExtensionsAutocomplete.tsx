import type { FC } from 'react'
import React, { useCallback } from 'react'
import { Box, Chip, TextField } from '@mui/material'
import { ErrorRounded } from '@mui/icons-material'
import {
  LabellessAutocomplete,
} from '@netcracker/qubership-apihub-ui-shared/components/Autocompletes/LabellessAutocomplete/LabellessAutocomplete'
import { OasExtensionTooltip } from './OasExtensionTooltip'
import {
  OAS_EXTENSION_KIND_INHERITED,
  OAS_EXTENSION_PREFIX,
  type OasSettingsExtension,
} from '../package-export-config'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

interface OasExtensionsAutocompleteProps {
  value: OasSettingsExtension[]
  onChange: (newValue: OasSettingsExtension[]) => void
  processExtensionsUpdate: (newValue: Array<string | OasSettingsExtension>, currentValue?: OasSettingsExtension[]) => OasSettingsExtension[]
  isFocused: boolean
  setIsFocused: (isFocused: boolean) => void
  isInputText: boolean
  setIsInputText: (isInputText: boolean) => void
  duplicateErrorText?: string
  setDuplicateErrorText: (text: string | undefined) => void
}

export const OasExtensionsAutocomplete: FC<OasExtensionsAutocompleteProps> = ({
  value,
  onChange,
  processExtensionsUpdate,
  isFocused,
  setIsFocused,
  isInputText,
  setIsInputText,
  duplicateErrorText,
  setDuplicateErrorText,
}) => {
  const placeholderText = isFocused || isNotEmpty(value) ? '' : 'OAS extensions'
  const prefixText = isFocused || isInputText ? OAS_EXTENSION_PREFIX : undefined
  const helperText = duplicateErrorText || (isFocused && isInputText ? 'Press Enter to Add Value' : undefined) || ' '

  const handleChange = useCallback((_: unknown, newValue: Array<string | OasSettingsExtension>): void => {
    const processedExtensions = processExtensionsUpdate(
      Array.isArray(newValue) ? newValue : [],
      value,
    )
    if (processedExtensions) {
      onChange(processedExtensions)
      setIsInputText(false)
    }
  }, [onChange, processExtensionsUpdate, setIsInputText, value])

  const handleExtensionAddition = useCallback((event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') {
      return
    }

    const inputElement = event.target as HTMLInputElement
    const inputValue = inputElement.value
    if (!inputValue) {
      return
    }

    const fullName = `${OAS_EXTENSION_PREFIX}${inputValue}`
    const isDuplicate = value.some(ext => ext.name === fullName)

    if (isDuplicate) {
      event.preventDefault()
      event.stopPropagation()
      setDuplicateErrorText(`Extension "${fullName}" already exists`)
      return
    }

    setDuplicateErrorText(undefined)

    const updatedExtensions = processExtensionsUpdate([inputValue], value)
    onChange(updatedExtensions)

    setIsInputText(false)
  }, [value, onChange, processExtensionsUpdate, setIsInputText, setDuplicateErrorText])

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setIsInputText(!!event.target.value)
    setDuplicateErrorText(undefined)
  }, [setIsInputText, setDuplicateErrorText])

  return (
    <LabellessAutocomplete<OasSettingsExtension>
      value={value || []}
      open={false}
      maxWidth={392}
      options={[]}
      multiple
      freeSolo

      // Display error icon instead of standard clear icon when duplicate extension error occurs
      clearIcon={duplicateErrorText ? <ErrorRounded color="error"/> : undefined}
      componentsProps={{
        clearIndicator: duplicateErrorText ? {
          onClick: (event) => {
            event.preventDefault()
            event.stopPropagation()
          },
          title: '',
          sx: {
            cursor: 'default',
            visibility: 'visible',
          },
        } : undefined,
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholderText}
          helperText={helperText}
          error={!!duplicateErrorText}
          inputProps={{
            ...params.inputProps,
            style: { marginLeft: -4 },
          }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                {params.InputProps.startAdornment} {/* Standard MUI pattern for displaying existing data as chips */}
                {prefixText && (
                  <Box component="span" sx={{ opacity: 0.5 }}>
                    {prefixText}
                  </Box>
                )}
              </>
            ),
            onFocus: () => setIsFocused(true),
            onBlur: () => setIsFocused(false),
            onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => handleExtensionAddition(event),
            onChange: handleInputChange,
          }}
        />
      )}
      renderTags={(tagValue, getTagProps): React.ReactElement[] =>
        tagValue.map((extension, index): React.ReactElement => {
          const { onDelete, ...tagProps } = getTagProps({ index })
          const isInherited = extension.kind === OAS_EXTENSION_KIND_INHERITED
          return (
            <Chip
              {...tagProps}
              key={extension.key}
              size="small"
              label={<OasExtensionTooltip extension={extension}/>}
              onDelete={isInherited ? undefined : onDelete}
              variant={isInherited ? 'readonly' : undefined}
              data-testid="OasExtensionChip"
            />
          )
        })
      }
      onChange={(_, value) => handleChange(_, Array.isArray(value) ? value : [])}
      data-testid="OasExtensionsAutocomplete"
    />
  )
}

OasExtensionsAutocomplete.displayName = 'OasExtensionsAutocomplete'

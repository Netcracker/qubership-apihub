import {InputAdornment, TextField, type TextFieldProps} from '@mui/material'
import type {ControllerFieldState, ControllerRenderProps, FieldPath, FieldValues} from 'react-hook-form'
import {ErrorIcon} from '@netcracker/qubership-apihub-ui-shared/icons/ErrorIcon'

interface ErrorTextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
> extends Omit<TextFieldProps, 'error' | 'helperText' | 'onChange'>
{
  field: ControllerRenderProps<TFieldValues, TName>
  fieldState: ControllerFieldState
  clearErrors?: (
    name?: FieldPath<TFieldValues> | FieldPath<TFieldValues>[] | readonly FieldPath<TFieldValues>[],
  ) => void
}

export const ErrorTextField = <
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  field,
  fieldState,
  clearErrors,
  InputProps,
  inputProps,
  ...textFieldProps
}: ErrorTextFieldProps<TFieldValues, TName>): JSX.Element => {
  return (
    <TextField
      {...field}
      {...textFieldProps}
      inputProps={{
        required: false, // disables the browser native "please fill out this field" prompt
        ...inputProps,
      }}
      error={!!fieldState.error}
      helperText={fieldState.error?.message}
      onChange={(event) => {
        field.onChange(event)
        clearErrors?.(field.name)
      }}
      InputProps={{
        ...InputProps,
        endAdornment: fieldState.error
          ? (
            <InputAdornment position="end">
              <ErrorIcon fontSize="small" color="error" />
            </InputAdornment>
          )
          : InputProps?.endAdornment,
      }}
    />
  )
}

ErrorTextField.displayName = 'ErrorTextField'

import { Autocomplete, Box, ListItem, TextField, Typography } from '@mui/material'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { DisplayToken, type NotificationDetail } from '@netcracker/qubership-apihub-ui-shared/components/DisplayToken'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { GeneratePersonalAccessTokenCallback } from '@netcracker/qubership-apihub-ui-shared/types/tokens'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { Controller, useForm } from 'react-hook-form'

type GeneratePersonalAccessTokenFormProps = {
  disabled?: boolean
  loading: IsLoading
  fieldExpirationVariants: number[]
  generatedToken?: Key
  onGenerateToken: GeneratePersonalAccessTokenCallback
  onValidateTokenName: (name: string) => boolean
  showSuccessNotification: (detail: NotificationDetail) => void
}

type PersonalAccessTokenForm = {
  name: string
  expiration: number
}

const DEFAULT_EXPIRATION = 180 // Days

const expirationDaysToLabel = (days: number): string => {
  if (days === -1) {
    return 'No expiration date'
  }
  return `${days} days`
}

// First Order Component
export const GeneratePersonalAccessTokenForm: FC<GeneratePersonalAccessTokenFormProps> = memo(props => {
  const {
    disabled,
    loading: isLoading,
    fieldExpirationVariants: expirationVariants,
    generatedToken,
    onGenerateToken,
    onValidateTokenName,
    showSuccessNotification,
  } = props

  const { handleSubmit, setValue, control, reset, formState: { errors } } = useForm<PersonalAccessTokenForm>({
    defaultValues: {
      name: '',
      expiration: DEFAULT_EXPIRATION,
    },
  })

  const onConfirmCallback = useCallback((value: PersonalAccessTokenForm): void => {
    const { name, expiration } = value
    onGenerateToken({ name: name, daysUntilExpiry: expiration })
    reset()
  }, [onGenerateToken, reset])

  if (generatedToken) {
    return (
      <DisplayToken
        generatedApiKey={generatedToken}
        showSuccessNotification={showSuccessNotification}
      />
    )
  }


  return (
    <Box component="form" marginBottom={1} onSubmit={handleSubmit(onConfirmCallback)}>
      <Typography variant="body2">
        Enter a token name and select an expiration period
      </Typography>
      <Box display="flex" alignItems="flex-start" gap={2}>
        <Controller
          name="name"
          rules={{
            required: 'The field must be filled',
            validate: {
              alreadyExists: (name) => {
                if (!onValidateTokenName(name)) {
                  return `API key with name "${name}" already exists`
                }
                return true
              },
            },
          }}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              required
              disabled={disabled}
              sx={{ width: '260px' }}
              value={field.value}
              label="Name"
              onChange={field.onChange}
              error={!!errors.name}
              helperText={errors.name?.message}
              data-testid="NameTextField"
            />
          )}
        />
        <Controller
          name="expiration"
          control={control}
          render={({ field: { value } }) => (
            <Autocomplete<number>
              disabled={disabled}
              sx={{ width: '260px' }}
              value={value}
              options={expirationVariants}
              getOptionLabel={expirationDaysToLabel}
              onChange={(_, expiration: number | null) => {
                setValue('expiration', expiration ?? DEFAULT_EXPIRATION)
              }}
              renderOption={(props, option) => (
                <ListItem
                  {...props}
                  key={option}
                  data-testid={`ListItem-${option}`}
                >
                  {expirationDaysToLabel(option)}
                </ListItem>
              )}
              renderInput={(params) =>
                <TextField
                  {...params}
                  label="Expiration"
                  inputProps={{
                    ...params.inputProps,
                    readOnly: true,
                  }}
                />
              }
              data-testid="ExpirationAutocomplete"
            />
          )}
        />
        <ButtonWithHint
          variant="contained"
          size="large"
          sx={{ mt: 1.2 }}
          disabled={disabled}
          disableHint={!disabled}
          hint="You can have up to 100 tokens. Please delete some tokens before creating a new one."
          isLoading={isLoading}
          title="Generate"
          type="submit"
          testId="GenerateButton"
        />
      </Box>
    </Box>
  )
})

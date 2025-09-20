import { LoadingButton } from '@mui/lab'
import { Button, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { ErrorTextField } from '@netcracker/qubership-apihub-ui-portal/src/components/ErrorTextField'
import {
  type Ruleset,
  RULESET_API_TYPE_TITLE_MAP,
  type RulesetApiType,
  RulesetLinters,
} from '@netcracker/qubership-apihub-ui-portal/src/entities/api-quality/rulesets'
import { SHOW_CREATE_RULESET_DIALOG } from '@netcracker/qubership-apihub-ui-portal/src/routes/EventBusProvider'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { FileUploadField } from '@netcracker/qubership-apihub-ui-shared/components/FileUploadField'
import { PopupDelegate, type PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import {
  YAML_FILE_EXTENSION,
  YML_FILE_EXTENSION,
  type FileExtension,
} from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { checkFileType } from '@netcracker/qubership-apihub-ui-shared/utils/validations'
import { type FC, memo, useCallback, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useCreateRuleset } from '../api/useCreateRuleset'

const ACCEPTABLE_RULESET_EXTENSIONS: FileExtension[] = [YAML_FILE_EXTENSION, YML_FILE_EXTENSION]

const DEFAULT_FORM_VALUES: CreateRulesetFormData = {
  name: '',
  file: undefined,
}

type CreateRulesetDialogProps = {
  apiType: RulesetApiType
  rulesets: Ruleset[]
}

type CreateRulesetPopupProps = CreateRulesetDialogProps & PopupProps

type CreateRulesetFormData = {
  name: string
  file: File | undefined
}

export const CreateRulesetDialog: FC<CreateRulesetDialogProps> = memo(({ apiType, rulesets }) => {
  return (
    <PopupDelegate
      type={SHOW_CREATE_RULESET_DIALOG}
      render={props => <CreateRulesetPopup {...props} apiType={apiType} rulesets={rulesets} />}
    />
  )
})

const CreateRulesetPopup: FC<CreateRulesetPopupProps> = memo<CreateRulesetPopupProps>(
  ({ open, setOpen, apiType, rulesets }) => {
    const [createRuleset, isCreating, isCreated] = useCreateRuleset()

    const { control, handleSubmit, formState, reset, watch, clearErrors } = useForm<CreateRulesetFormData>({
      defaultValues: DEFAULT_FORM_VALUES,
    })

    const { errors } = formState
    const watchedValues = watch()

    const fileValidationRules = useMemo(() => ({
      validate: (file: File | undefined) => {
        if (!file) return true
        return checkFileType(file, ACCEPTABLE_RULESET_EXTENSIONS)
      },
    }), [])

    const nameValidationRules = useMemo(() => ({
      validate: (name: string) => {
        const isNameExists = rulesets.some(ruleset => ruleset.name.toLowerCase() === name.toLowerCase())
        return !isNameExists || `Ruleset name ${name} is not unique for API type ${apiType}`
      },
    }), [apiType, rulesets])

    const handleClose = useCallback((): void => {
      setOpen(false)
    }, [setOpen])

    const handleCreateRuleset = useCallback((data: CreateRulesetFormData): void => {
      const { name, file } = data

      if (!name || !file) {
        return
      }

      createRuleset({
        rulesetName: name,
        apiType: apiType,
        linter: RulesetLinters.SPECTRAL,
        rulesetFile: file,
      })
    }, [apiType, createRuleset])

    const isSubmitDisabled = useMemo(() => {
      return !watchedValues.name || !watchedValues.file || isCreating
    }, [watchedValues.name, watchedValues.file, isCreating])

    useEffect(() => {
      if (isCreated) {
        setOpen(false)
      }
    }, [isCreated, setOpen])

    useEffect(() => {
      if (open) {
        reset(DEFAULT_FORM_VALUES)
      }
    }, [open, reset])

    return (
      <DialogForm
        open={open}
        onClose={handleClose}
        onSubmit={handleSubmit(handleCreateRuleset)}
      >
        <DialogTitle>{`Create Ruleset for ${RULESET_API_TYPE_TITLE_MAP[apiType]}`}</DialogTitle>
        <DialogContent>
          <Typography variant="button">
            Main info
          </Typography>
          <Controller
            name="name"
            control={control}
            rules={nameValidationRules}
            render={({ field, fieldState }) => (
              <ErrorTextField
                field={field}
                fieldState={fieldState}
                clearErrors={clearErrors}
                required
                label="Name"
                disabled={isCreating}
                data-testid="NameTextField"
                sx={{ mt: 0 }}
              />
            )}
          />
          <Typography variant="button">
            Ruleset
          </Typography>
          <Controller
            name="file"
            control={control}
            rules={fileValidationRules}
            render={({ field: { value, onChange } }) => (
              <FileUploadField
                uploadedFile={value}
                setUploadedFile={onChange}
                downloadAvailable={false}
                acceptableExtensions={ACCEPTABLE_RULESET_EXTENSIONS}
                errorMessage={errors.file?.message}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <LoadingButton
            variant="contained"
            type="submit"
            loading={isCreating}
            disabled={isSubmitDisabled}
            data-testid="CreateButton"
          >
            Create
          </LoadingButton>
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={isCreating}
            data-testid="CancelButton"
          >
            Cancel
          </Button>
        </DialogActions>
      </DialogForm>
    )
  },
)

CreateRulesetDialog.displayName = 'CreateRulesetDialog'

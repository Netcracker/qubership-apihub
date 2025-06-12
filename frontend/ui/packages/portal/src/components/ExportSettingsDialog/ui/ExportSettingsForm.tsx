import type { Key } from '@apihub/entities/keys'
import { LoadingButton } from '@mui/lab'
import { Box, Button, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, Tooltip, Typography } from '@mui/material'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { InfoContextIcon } from '@netcracker/qubership-apihub-ui-shared/icons/InfoContextIcon'
import type { FC } from 'react'
import { memo, useMemo } from 'react'
import type { Control, UseFormSetValue } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import type { ExportConfig } from '../../../routes/root/PortalPage/useExportConfig'
import type { ExportedEntityTransformation, ExportedFileFormat, IRequestDataExport } from '../api/useExport'
import { ExportedEntityKind, RequestDataExportRestDocument, RequestDataExportRestOperationsGroup, RequestDataExportVersion } from '../api/useExport'
import type { ExportSettingsFormData } from '../entities/export-settings-form'
import { EXPORT_SETTINGS_FORM_FIELDS_BY_PLACE } from '../entities/export-settings-form'
import type { ExportSettingsFormField } from '../entities/export-settings-form-field'
import { ExportSettingsFormFieldKind, ExportSettingsFormFieldOptionOasExtensions } from '../entities/export-settings-form-field'
import { useLocalExportSettings } from '../storage/useLocalExportSettings'

interface ExportSettingsFormFieldsProps {
  disabled: boolean
  fields: ExportSettingsFormField[]
  exportConfig: ExportConfig
  control: Control<ExportSettingsFormData>
  setValue: UseFormSetValue<ExportSettingsFormData>
  setCachedFormField: (field: ExportSettingsFormFieldKind, value: string) => void
}

const ExportSettingsFormFields: FC<ExportSettingsFormFieldsProps> = memo(props => {
  const { disabled, fields, exportConfig, control, setValue, setCachedFormField } = props

  return (
    <Box component="form" display="flex" flexDirection="column" gap={2}>
      {fields.map(field => <>
        <Typography key={`${field.kind}-label`} variant="h3">{field.label}</Typography>
        <Controller
          key={field.kind}
          name={field.kind}
          control={control}
          render={({ field: { value } }) => (
            <RadioGroup
              key={field.kind}
              value={value}
              onChange={(_, value) => {
                setCachedFormField(field.kind, value)
                setValue(field.kind, value)
              }}
            >
              {field.options.map(option => (
                <Box key={option.value} display="flex" alignItems="center" gap={1}>
                  <FormControlLabel
                    value={option.value}
                    label={option.label}
                    checked={!value && option.value === field.defaultValue || value === option.value}
                    control={<Radio disabled={disabled} />}
                  />
                  {option.tooltip && (
                    <Tooltip
                      disableHoverListener={false}
                      title={typeof option.tooltip === 'function' ? option.tooltip(exportConfig) : option.tooltip}
                      placement="right"
                    >
                      <InfoContextIcon />
                    </Tooltip>
                  )}
                </Box>
              ))}
            </RadioGroup>
          )}
        />
      </>)}
    </Box>
  )
})

interface ExportSettingsFormProps {
  // Control props
  open: boolean
  onClose: () => void
  // Data props
  exportConfig: ExportConfig
  exportedEntity: ExportedEntityKind
  packageId: PackageKey
  version: VersionKey
  documentId?: Key
  groupName?: Key
  // State props
  exporting: boolean
  isLoadingExportConfig: boolean
  isStartingExport: boolean
  // Action props
  setRequestDataExport: (requestData: IRequestDataExport) => void
}

export const ExportSettingsForm: FC<ExportSettingsFormProps> = memo(props => {
  const {
    open,
    onClose,
    exportConfig,
    exportedEntity,
    packageId,
    version,
    documentId,
    groupName,
    exporting,
    isLoadingExportConfig,
    isStartingExport,
    setRequestDataExport,
  } = props

  // Calculate fields and default values
  const fields = EXPORT_SETTINGS_FORM_FIELDS_BY_PLACE[exportedEntity]
  const fieldsDefaultValues = useMemo(
    () => fields.reduce((acc, field) => ({ ...acc, [field.kind]: field.defaultValue }), {}),
    [fields],
  )

  // Extract cached form data from local storage
  const { cachedFormData, setCachedFormField } = useLocalExportSettings(exportedEntity)

  // Initialize form with cached data or default values
  const { control, handleSubmit, setValue } = useForm<ExportSettingsFormData>({
    defaultValues: cachedFormData ?? fieldsDefaultValues,
  })

  // Handle form submission 
  const onSubmit = (data: ExportSettingsFormData): void => {
    let requestData: IRequestDataExport | undefined
    const removeOasExtensions = data[ExportSettingsFormFieldKind.OAS_EXTENSIONS] === ExportSettingsFormFieldOptionOasExtensions.REMOVE
    const fileFormat: ExportedFileFormat = data[ExportSettingsFormFieldKind.FILE_FORMAT] as ExportedFileFormat
    switch (exportedEntity) {
      case ExportedEntityKind.VERSION:
        requestData = new RequestDataExportVersion(
          packageId,
          version,
          fileFormat,
          removeOasExtensions,
        )
        break
      case ExportedEntityKind.REST_DOCUMENT:
        requestData = new RequestDataExportRestDocument(
          documentId!,
          packageId,
          version,
          fileFormat,
          removeOasExtensions,
        )
        break
      case ExportedEntityKind.REST_OPERATIONS_GROUP:
        requestData = new RequestDataExportRestOperationsGroup(
          groupName!,
          data[ExportSettingsFormFieldKind.SPECIFICATION_TYPE] as ExportedEntityTransformation,
          packageId,
          version,
          fileFormat,
          removeOasExtensions,
        )
        break
    }
    setRequestDataExport(requestData)
  }

  const initializing = isLoadingExportConfig || isStartingExport

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
    >
      <DialogTitle>
        Export Settings
      </DialogTitle>
      <DialogContent>
        <ExportSettingsFormFields
          disabled={initializing || exporting}
          fields={fields}
          exportConfig={exportConfig}
          control={control}
          setValue={setValue}
          setCachedFormField={setCachedFormField}
        />
      </DialogContent>
      <DialogActions>
        <LoadingButton
          type="submit"
          disabled={initializing || exporting}
          loading={isStartingExport || exporting}
          variant="contained"
          data-testid="ExportButton"
        >
          Export
        </LoadingButton>
        <Button
          disabled={initializing}
          variant="outlined"
          onClick={onClose}
          data-testid="CloseButton"
        >
          Close
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

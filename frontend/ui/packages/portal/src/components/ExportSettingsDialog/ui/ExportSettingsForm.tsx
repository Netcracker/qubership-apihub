import { LoadingButton } from '@mui/lab'
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  RadioGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { intersectionBy } from 'lodash-es'
import { type FC, memo, useEffect, useMemo } from 'react'
import { type Control, Controller, useForm, useWatch } from 'react-hook-form'

import {
  SHAREABILITY_STATUS_SHAREABLE,
  SHAREABILITY_STATUSES,
  type ShareabilityStatus,
} from '@netcracker/qubership-apihub-api-processor'
import { AlertCustom } from '@netcracker/qubership-apihub-ui-shared/components/AlertCustom'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { RadioCustom } from '@netcracker/qubership-apihub-ui-shared/components/RadioCustom'
import type { Key, PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { InfoContextIcon } from '@netcracker/qubership-apihub-ui-shared/icons/InfoContextIcon'
import { isExportableSpecType, type SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { ExportConfig } from '../../../routes/root/PortalPage/useExportConfig'
import {
  ExportedEntityKind,
  ExportedFileFormat,
  type IRequestDataExport,
  RequestDataExportRestDocument,
  RequestDataExportRestOperationsGroup,
  RequestDataExportVersion,
} from '../api/useExport'
import { EXPORT_SETTINGS_FORM_FIELDS_BY_PLACE, type ExportSettingsFormData } from '../entities/export-settings-form'
import {
  type ExportSettingsFormField,
  ExportSettingsFormFieldKind,
  ExportSettingsFormFieldOptionOasExtensions,
  ExportSettingsFormFieldOptionScope,
  SPEC_TYPE_ACCESS_VIEW_EXPORT_FIELD,
} from '../entities/export-settings-form-field'
import { type ShareabilityAlerts, useShareabilityAlerts } from '../hooks/useShareabilityAlerts'
import type { ShareabilitySummary } from '../hooks/useShareabilitySummary'
import { useLocalExportSettings } from '../storage/useLocalExportSettings'
import { ShareabilityExportVersionAlert, ShareabilitySingleDocAlert } from './export-settings-alerts'

interface ExportSettingsFormFieldsProps {
  disabled: boolean
  fields: ExportSettingsFormField[]
  exportConfig: ExportConfig
  control: Control<ExportSettingsFormData>
  setCachedFormField: (field: ExportSettingsFormFieldKind, value: string) => void
  shareabilityExportVersionAlert: ShareabilityAlerts['versionExportAlert']
}

const ExportSettingsFormFields: FC<ExportSettingsFormFieldsProps> = memo(props => {
  const {
    disabled,
    fields,
    exportConfig,
    control,
    setCachedFormField,
    shareabilityExportVersionAlert,
  } = props
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {fields.map(field => {
        if (!field.options?.length) {
          return null
        }
        return (
          <Box key={field.kind} display="flex" flexDirection="column" gap={2}>
            <Typography variant="subtitle4">{field.label}</Typography>
            <Controller
              name={field.kind}
              control={control}
              render={({ field: { value, onChange } }) => (
                <RadioGroup
                  value={value}
                  onChange={(_, newValue) => {
                    setCachedFormField(field.kind, newValue)
                    onChange(newValue)
                  }}
                >
                  {field.options.map(option => (
                    <Box key={option.value} display="flex" alignItems="center" gap={1}>
                      <FormControlLabel
                        value={option.value}
                        label={option.label}
                        checked={!value && option.value === field.defaultValue || value === option.value}
                        control={<RadioCustom disabled={disabled} />}
                      />
                      {option.tooltip && (
                        <Tooltip
                          disableHoverListener={false}
                          title={typeof option.tooltip === 'function' ? option.tooltip(exportConfig) : option.tooltip}
                          placement="right"
                        >
                          <InfoContextIcon fontSize="extra-small" />
                        </Tooltip>
                      )}
                    </Box>
                  ))}
                </RadioGroup>
              )}
            />
            {field.kind === ExportSettingsFormFieldKind.SCOPE && shareabilityExportVersionAlert && (
              <ShareabilityExportVersionAlert {...shareabilityExportVersionAlert} />
            )}
          </Box>
        )
      })}
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
  shareabilityStatus: ShareabilityStatus
  specType?: SpecType
  hasRestApi?: boolean
  shareabilitySummary: ShareabilitySummary
  // State props
  exporting: boolean
  isLoadingExportConfig: boolean
  isStartingExport: boolean
  // Action props
  setRequestDataExport: (requestData: IRequestDataExport) => void
  onDownloadPublishedDocument?: () => void
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
    specType,
    hasRestApi,
    shareabilityStatus,
    shareabilitySummary,
    onDownloadPublishedDocument,
  } = props

  const fields = useMemo(() => {
    if (exportedEntity === ExportedEntityKind.SINGLE_DOCUMENT && !isExportableSpecType(specType)) {
      return []
    }
    if (exportedEntity === ExportedEntityKind.VERSION && !hasRestApi) {
      return EXPORT_SETTINGS_FORM_FIELDS_BY_PLACE[ExportedEntityKind.VERSION]
        .filter(field => field.kind === ExportSettingsFormFieldKind.SCOPE)
    }

    const allowedOptions = SPEC_TYPE_ACCESS_VIEW_EXPORT_FIELD[specType!] ?? []
    if (allowedOptions.length === 0) {
      return EXPORT_SETTINGS_FORM_FIELDS_BY_PLACE[exportedEntity]
    }

    return EXPORT_SETTINGS_FORM_FIELDS_BY_PLACE[exportedEntity].map(field => ({
      ...field,
      options: [...intersectionBy(field.options, allowedOptions, 'value')],
    }))
  }, [exportedEntity, specType, hasRestApi])

  const fieldsDefaultValues = useMemo(
    () => fields.reduce((acc, field) => ({ ...acc, [field.kind]: field.defaultValue }), {}),
    [fields],
  )

  // Extract cached form data from local storage
  const { cachedFormData, setCachedFormField } = useLocalExportSettings(exportedEntity, specType)

  // Initialize form with cached data or default values
  const initialValues = useMemo(
    () => (cachedFormData ? { ...fieldsDefaultValues, ...cachedFormData } : fieldsDefaultValues),
    [cachedFormData, fieldsDefaultValues],
  )
  const { control, handleSubmit, reset } = useForm<ExportSettingsFormData>({
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (!open) return
    reset(initialValues)
  }, [open, initialValues, reset])

  // Version export alert
  const currentScopeValue = useWatch({ control: control, name: ExportSettingsFormFieldKind.SCOPE })
  const { versionExportAlert, singleDocExportAlert, versionExportDisabled } = useShareabilityAlerts({
    exportedEntity: exportedEntity,
    scopeValue: currentScopeValue,
    shareabilityStatus: shareabilityStatus,
    shareabilitySummary: shareabilitySummary,
  })

  // Handle form submission
  const onSubmit = (data: ExportSettingsFormData): void => {
    if (exportedEntity === ExportedEntityKind.SINGLE_DOCUMENT && !isExportableSpecType(specType)) {
      onDownloadPublishedDocument?.()
      return
    }

    const hasFileFormatField = fields.some(f => f.kind === ExportSettingsFormFieldKind.FILE_FORMAT)
    // Some UI variants don't include FILE_FORMAT, but export API requires it; JSON is a safe fallback.
    const fileFormat = (hasFileFormatField ? data[ExportSettingsFormFieldKind.FILE_FORMAT] : undefined) ?? ExportedFileFormat.JSON

    const removeOasExtensions =
      data[ExportSettingsFormFieldKind.OAS_EXTENSIONS] === ExportSettingsFormFieldOptionOasExtensions.REMOVE

    let requestData: IRequestDataExport | undefined
    switch (exportedEntity) {
      case ExportedEntityKind.VERSION: {
        const allowedStatuses: readonly ShareabilityStatus[] =
          data[ExportSettingsFormFieldKind.SCOPE] === ExportSettingsFormFieldOptionScope.ONLY_SHAREABLE
            ? [SHAREABILITY_STATUS_SHAREABLE]
            : SHAREABILITY_STATUSES
        requestData = new RequestDataExportVersion(packageId, version, fileFormat, removeOasExtensions, allowedStatuses)
        break
      }
      case ExportedEntityKind.SINGLE_DOCUMENT:
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
          data[ExportSettingsFormFieldKind.SPECIFICATION_TYPE]!,
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
  const exportButtonDisabled = initializing || exporting || versionExportDisabled

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
        {singleDocExportAlert && (
          isExportableSpecType(specType)
            ? <ShareabilitySingleDocAlert {...singleDocExportAlert} />
            : <AlertCustom {...singleDocExportAlert} />
        )}
        <ExportSettingsFormFields
          disabled={initializing || exporting}
          fields={fields}
          exportConfig={exportConfig}
          control={control}
          setCachedFormField={setCachedFormField}
          shareabilityExportVersionAlert={versionExportAlert}
        />
      </DialogContent>
      <DialogActions>
        <LoadingButton
          type="submit"
          disabled={exportButtonDisabled}
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

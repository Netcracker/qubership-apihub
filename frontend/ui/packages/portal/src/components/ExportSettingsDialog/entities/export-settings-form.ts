import type { ExportedEntityTransformation, ExportedFileFormat } from '../api/useExport'
import { ExportedEntityKind } from '../api/useExport'
import type {
  ExportSettingsFormField,
  ExportSettingsFormFieldOptionOasExtensions,
  ExportSettingsFormFieldOptionScope,
} from './export-settings-form-field'
import { FIELD_OPTION_LIST_FILE_FORMAT_ASYNC_API } from './export-settings-form-field'
import {
  ExportSettingsFormFieldKind,
  FIELD_LABEL_SCOPE,
  FIELD_LABEL_FILE_FORMAT,
  FIELD_LABEL_FILE_FORMAT_OAS,
  FIELD_LABEL_OAS_EXTENSIONS,
  FIELD_LABEL_SPECIFICATION_TYPE,
  FIELD_OPTION_LIST_SCOPE,
  FIELD_OPTION_LIST_FILE_FORMAT_OAS,
  FIELD_OPTION_LIST_OAS_EXTENSIONS,
  FIELD_OPTION_LIST_SPECIFICATION_TYPE,
} from './export-settings-form-field'

export interface ExportSettingsForm {
  fields: ExportSettingsFormField[]
}

export const EXPORT_SETTINGS_FORM_FIELDS_BY_PLACE: Record<ExportedEntityKind, ExportSettingsFormField[]> = {
  [ExportedEntityKind.VERSION]: [
    {
      kind: ExportSettingsFormFieldKind.SCOPE,
      label: FIELD_LABEL_SCOPE,
      options: FIELD_OPTION_LIST_SCOPE,
      defaultValue: FIELD_OPTION_LIST_SCOPE[0].value,
    },
    {
      kind: ExportSettingsFormFieldKind.FILE_FORMAT,
      // Different label because there may be not only OpenAPI specifications in the package version
      label: FIELD_LABEL_FILE_FORMAT_OAS,
      options: FIELD_OPTION_LIST_FILE_FORMAT_OAS,
      defaultValue: FIELD_OPTION_LIST_FILE_FORMAT_OAS[0].value,
    },
    {
      kind: ExportSettingsFormFieldKind.OAS_EXTENSIONS,
      label: FIELD_LABEL_OAS_EXTENSIONS,
      options: FIELD_OPTION_LIST_OAS_EXTENSIONS,
      defaultValue: FIELD_OPTION_LIST_OAS_EXTENSIONS[0].value,
    },
  ],
  [ExportedEntityKind.SINGLE_DOCUMENT]: [
    {
      kind: ExportSettingsFormFieldKind.FILE_FORMAT,
      label: FIELD_LABEL_FILE_FORMAT,
      options: FIELD_OPTION_LIST_FILE_FORMAT_OAS,
      defaultValue: FIELD_OPTION_LIST_FILE_FORMAT_OAS[0].value,
    },
    {
      kind: ExportSettingsFormFieldKind.OAS_EXTENSIONS,
      label: FIELD_LABEL_OAS_EXTENSIONS,
      options: FIELD_OPTION_LIST_OAS_EXTENSIONS,
      defaultValue: FIELD_OPTION_LIST_OAS_EXTENSIONS[0].value,
    },
  ],
  [ExportedEntityKind.ASYNC_API_OPERATIONS_GROUP]: [
    {
      kind: ExportSettingsFormFieldKind.FILE_FORMAT,
      label: FIELD_LABEL_FILE_FORMAT,
      options: FIELD_OPTION_LIST_FILE_FORMAT_ASYNC_API,
      defaultValue: FIELD_OPTION_LIST_FILE_FORMAT_ASYNC_API[0].value,
    },
  ],
  [ExportedEntityKind.REST_OPERATIONS_GROUP]: [
    {
      kind: ExportSettingsFormFieldKind.SPECIFICATION_TYPE,
      label: FIELD_LABEL_SPECIFICATION_TYPE,
      options: FIELD_OPTION_LIST_SPECIFICATION_TYPE,
      defaultValue: FIELD_OPTION_LIST_SPECIFICATION_TYPE[0].value,
    },
    {
      kind: ExportSettingsFormFieldKind.FILE_FORMAT,
      label: FIELD_LABEL_FILE_FORMAT,
      options: FIELD_OPTION_LIST_FILE_FORMAT_OAS,
      defaultValue: FIELD_OPTION_LIST_FILE_FORMAT_OAS[0].value,
    },
    {
      kind: ExportSettingsFormFieldKind.OAS_EXTENSIONS,
      label: FIELD_LABEL_OAS_EXTENSIONS,
      options: FIELD_OPTION_LIST_OAS_EXTENSIONS,
      defaultValue: FIELD_OPTION_LIST_OAS_EXTENSIONS[0].value,
    },
  ],
}

export type ExportSettingsFormData = {
  [ExportSettingsFormFieldKind.SCOPE]?: ExportSettingsFormFieldOptionScope
  [ExportSettingsFormFieldKind.SPECIFICATION_TYPE]?: ExportedEntityTransformation
  [ExportSettingsFormFieldKind.FILE_FORMAT]?: ExportedFileFormat
  [ExportSettingsFormFieldKind.OAS_EXTENSIONS]?: ExportSettingsFormFieldOptionOasExtensions
}

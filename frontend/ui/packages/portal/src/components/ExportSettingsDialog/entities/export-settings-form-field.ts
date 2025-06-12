import { ExportedEntityTransformation, ExportedFileFormat } from '../api/useExport'
import type { ExportConfig } from '../../../routes/root/PortalPage/useExportConfig'

export type ExportSettingsFormFieldOption<L extends string = string, V extends string = string> = Readonly<{
  label: L
  value: V
  tooltip?: string | ((...args: unknown[]) => string | undefined)
}>

export enum ExportSettingsFormFieldKind {
  SPECIFICATION_TYPE = 'specification-type',
  FILE_FORMAT = 'file-format',
  OAS_EXTENSIONS = 'oas-extensions',
}

export type ExportSettingsFormField = Readonly<{
  kind: ExportSettingsFormFieldKind
  label: string
  options: ReadonlyArray<ExportSettingsFormFieldOption>
  defaultValue: string
}>

export const FIELD_LABEL_SPECIFICATION_TYPE = 'Specification type'
export const FIELD_LABEL_FILE_FORMAT_OAS = 'File format for OpenAPI specifications'
export const FIELD_LABEL_FILE_FORMAT = 'File format'
export const FIELD_LABEL_OAS_EXTENSIONS = 'OpenAPI extensions'

const FIELD_OPTION_SPECIFICATION_TYPE_REDUCED: ExportSettingsFormFieldOption = {
  label: 'Reduced source specifications',
  value: ExportedEntityTransformation.REDUCED_SOURCE_SPECIFICATIONS,
}
const FIELD_OPTION_SPECIFICATION_TYPE_COMBINED: ExportSettingsFormFieldOption = {
  label: 'Combined specification',
  value: ExportedEntityTransformation.MERGED_SPECIFICATION,
}
const FIELD_OPTION_FILE_FORMAT_OAS_JSON: ExportSettingsFormFieldOption<string, ExportedFileFormat> = {
  label: 'JSON',
  value: ExportedFileFormat.JSON,
}
const FIELD_OPTION_FILE_FORMAT_OAS_YAML: ExportSettingsFormFieldOption<string, ExportedFileFormat> = {
  label: 'YAML',
  value: ExportedFileFormat.YAML,
}
const FIELD_OPTION_FILE_FORMAT_OAS_INTERACTIVE_HTML: ExportSettingsFormFieldOption<string, ExportedFileFormat> = {
  label: 'Interactive HTML',
  value: ExportedFileFormat.HTML,
}
export enum ExportSettingsFormFieldOptionOasExtensions {
  PRESERVE = 'preserve',
  REMOVE = 'remove'
}
const FIELD_OPTION_OAS_EXTENSIONS_PRESERVE: ExportSettingsFormFieldOption = {
  label: 'Preserve all OAS extensions',
  value: ExportSettingsFormFieldOptionOasExtensions.PRESERVE,
}
const FIELD_OPTION_OAS_EXTENSIONS_REMOVE: ExportSettingsFormFieldOption = {
  label: 'Remove OAS extensions',
  value: ExportSettingsFormFieldOptionOasExtensions.REMOVE,
  tooltip: (exportConfig: unknown) => {
    const allowedOasExtensions = (exportConfig as ExportConfig).allowedOasExtensions ?? []
    return allowedOasExtensions.length === 0
      ? 'All extensions will be removed from the specifications because no allowed list of extensions is defined for the package.'
      : `All extensions will be removed from the specifications except for the following: ${allowedOasExtensions.map(extension => extension.oasExtension).join(', ')}.`
  },
}

export const FIELD_OPTION_LIST_SPECIFICATION_TYPE: ReadonlyArray<ExportSettingsFormFieldOption> = [
  FIELD_OPTION_SPECIFICATION_TYPE_REDUCED,
  FIELD_OPTION_SPECIFICATION_TYPE_COMBINED,
]
export const FIELD_OPTION_LIST_FILE_FORMAT_OAS: ReadonlyArray<ExportSettingsFormFieldOption> = [
  FIELD_OPTION_FILE_FORMAT_OAS_YAML,
  FIELD_OPTION_FILE_FORMAT_OAS_JSON,
  FIELD_OPTION_FILE_FORMAT_OAS_INTERACTIVE_HTML,
]
export const FIELD_OPTION_LIST_OAS_EXTENSIONS: ReadonlyArray<ExportSettingsFormFieldOption> = [
  FIELD_OPTION_OAS_EXTENSIONS_PRESERVE,
  FIELD_OPTION_OAS_EXTENSIONS_REMOVE,
]

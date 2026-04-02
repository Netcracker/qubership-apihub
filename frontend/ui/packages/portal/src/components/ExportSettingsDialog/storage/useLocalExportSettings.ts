import {
  ASYNCAPI_SPEC_TYPE,
  GRAPHQL_SPEC_TYPE,
  isAsyncApiSpecType,
  isGraphQlSpecType,
  isOpenApiSpecType,
  OPENAPI_SPEC_TYPE,
  type SpecType,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { useCallback, useMemo } from 'react'
import { useLocalStorage } from 'react-use'
import type { ExportedEntityKind } from '../api/useExport'
import type { ExportSettingsFormData } from '../entities/export-settings-form'
import { ExportSettingsFormFieldKind } from '../entities/export-settings-form-field'

function getStorageSpecType(specType?: SpecType): SpecType | undefined {
  if (!specType) return

  if (isOpenApiSpecType(specType)) {
    return OPENAPI_SPEC_TYPE
  }

  if (isAsyncApiSpecType(specType)) {
    return ASYNCAPI_SPEC_TYPE
  }

  if (isGraphQlSpecType(specType)) {
    return GRAPHQL_SPEC_TYPE
  }

  return specType
}

// Temporary specType normalization is required because we don't yet have separate
// exportedEntity values for each API spec type. Without it, export settings can
// conflict across different specification types in localStorage.
// This can be removed once the API is updated with dedicated exportedEntity
// variants for each spec type.
function buildKey(
  exportedEntity: ExportedEntityKind,
  field: ExportSettingsFormFieldKind,
  specType?: SpecType,
): string {
  if (!specType) return `export-settings.${exportedEntity}.${field}`

  return `export-settings.${exportedEntity}.${getStorageSpecType(specType)}.${field}`
}

export function useLocalExportSettings(
  exportedEntity: ExportedEntityKind,
  specType?: SpecType,
): {
  cachedFormData?: ExportSettingsFormData
  setCachedFormField: (field: ExportSettingsFormFieldKind, value: string) => void
} {
  const scopeKey = useMemo(
    () => buildKey(exportedEntity, ExportSettingsFormFieldKind.SCOPE),
    [exportedEntity],
  )
  const specificationTypeKey = useMemo(
    () => buildKey(exportedEntity, ExportSettingsFormFieldKind.SPECIFICATION_TYPE),
    [exportedEntity],
  )
  const fileFormatKey = useMemo(
    () => buildKey(exportedEntity, ExportSettingsFormFieldKind.FILE_FORMAT, specType),
    [exportedEntity, specType],
  )
  const oasExtensionsKey = useMemo(
    () => buildKey(exportedEntity, ExportSettingsFormFieldKind.OAS_EXTENSIONS),
    [exportedEntity],
  )

  const [scope, setScope] = useLocalStorage<string | undefined>(scopeKey)
  const [specificationType, setSpecificationType] = useLocalStorage<string | undefined>(specificationTypeKey)
  const [fileFormat, setFileFormat] = useLocalStorage<string | undefined>(fileFormatKey)
  const [oasExtensions, setOasExtensions] = useLocalStorage<string | undefined>(oasExtensionsKey)

  const cachedFormData = useMemo(() => ({
    ...scope ? { [ExportSettingsFormFieldKind.SCOPE]: scope } : {},
    ...specificationType ? { [ExportSettingsFormFieldKind.SPECIFICATION_TYPE]: specificationType } : {},
    ...fileFormat ? { [ExportSettingsFormFieldKind.FILE_FORMAT]: fileFormat } : {},
    ...oasExtensions ? { [ExportSettingsFormFieldKind.OAS_EXTENSIONS]: oasExtensions } : {},
  } as ExportSettingsFormData), [scope, specificationType, fileFormat, oasExtensions])

  const setCachedFormField = useCallback((field: ExportSettingsFormFieldKind, value: string) => {
    switch (field) {
      case ExportSettingsFormFieldKind.SCOPE:
        setScope(value)
        break
      case ExportSettingsFormFieldKind.SPECIFICATION_TYPE:
        setSpecificationType(value)
        break
      case ExportSettingsFormFieldKind.FILE_FORMAT:
        setFileFormat(value)
        break
      case ExportSettingsFormFieldKind.OAS_EXTENSIONS:
        setOasExtensions(value)
        break
    }
  }, [setScope, setSpecificationType, setFileFormat, setOasExtensions])

  return {
    cachedFormData: Object.keys(cachedFormData).length > 0 ? cachedFormData : undefined,
    setCachedFormField: setCachedFormField,
  }
}

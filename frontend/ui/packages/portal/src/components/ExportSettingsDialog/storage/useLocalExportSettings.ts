import { useCallback, useMemo } from 'react'
import { useLocalStorage } from 'react-use'
import type { ExportedEntityKind } from '../api/useExport'
import type { ExportSettingsFormData } from '../entities/export-settings-form'
import { ExportSettingsFormFieldKind } from '../entities/export-settings-form-field'

function buildKey(exportedEntity: ExportedEntityKind, field: ExportSettingsFormFieldKind): string {
  return `export-settings.${exportedEntity}.${field}`
}

export function useLocalExportSettings(exportedEntity: ExportedEntityKind): {
  cachedFormData?: ExportSettingsFormData
  setCachedFormField: (field: ExportSettingsFormFieldKind, value: string) => void
} {
  const specificationTypeKey = useMemo(
    () => buildKey(exportedEntity, ExportSettingsFormFieldKind.SPECIFICATION_TYPE),
    [exportedEntity],
  )
  const fileFormatKey = useMemo(
    () => buildKey(exportedEntity, ExportSettingsFormFieldKind.FILE_FORMAT),
    [exportedEntity],
  )
  const oasExtensionsKey = useMemo(
    () => buildKey(exportedEntity, ExportSettingsFormFieldKind.OAS_EXTENSIONS),
    [exportedEntity],
  )

  const [specificationType, setSpecificationType] = useLocalStorage<string | undefined>(specificationTypeKey)
  const [fileFormat, setFileFormat] = useLocalStorage<string | undefined>(fileFormatKey)
  const [oasExtensions, setOasExtensions] = useLocalStorage<string | undefined>(oasExtensionsKey)

  const cachedFormData: ExportSettingsFormData = useMemo(() => ({
    ...specificationType ? { [ExportSettingsFormFieldKind.SPECIFICATION_TYPE]: specificationType } : {},
    ...fileFormat ? { [ExportSettingsFormFieldKind.FILE_FORMAT]: fileFormat } : {},
    ...oasExtensions ? { [ExportSettingsFormFieldKind.OAS_EXTENSIONS]: oasExtensions } : {},
  }), [specificationType, fileFormat, oasExtensions])

  const setCachedFormField = useCallback((field: ExportSettingsFormFieldKind, value: string) => {
    switch (field) {
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
  }, [setSpecificationType, setFileFormat, setOasExtensions])

  return {
    cachedFormData: Object.keys(cachedFormData).length > 0 ? cachedFormData : undefined,
    setCachedFormField: setCachedFormField,
  }
}

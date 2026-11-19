import type { FC } from 'react'
import { memo } from 'react'
import { Marker } from 'react-mark.js'
import { JsonSchemaViewer } from '@netcracker/qubership-apihub-ui-shared/components/JsonSchemaViewer'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { isOpenApiSpecType, UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { JSON_FILE_FORMAT, MD_FILE_FORMAT, YAML_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { generateSpecificationByPathItems } from '../utils/specifications'
import { ApispecView } from '@netcracker/qubership-apihub-ui-shared/components/ApispecView'
import { isJsonSchemaSpecType } from '../entities/spec-types'
import { MarkdownViewer } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/MarkdownViewer'

// First Order Component //
export type DocSpecViewProps = {
  type: SpecType
  format: FileFormat
  value: string
  selectedUri?: string
  sidebarEnabled?: boolean
  searchPhrase?: string
  schemaViewMode?: string
}

export const DocSpecView: FC<DocSpecViewProps> = memo<DocSpecViewProps>(({
  type,
  format,
  value,
  selectedUri,
  sidebarEnabled,
  searchPhrase,
  schemaViewMode,
}) => {
  if (type === UNKNOWN_SPEC_TYPE && (format === JSON_FILE_FORMAT || format === YAML_FILE_FORMAT)) {
    const specification = generateSpecificationByPathItems(format, value)
    if (!specification) {
      return null
    }

    const [content, , pathItemUri] = specification
    return (
      <ApispecView
        apiDescriptionDocument={content}
        selectedUri={pathItemUri}
        sidebarEnabled={sidebarEnabled}
        searchPhrase={searchPhrase}
        schemaViewMode={schemaViewMode}
      />
    )
  }

  if (isOpenApiSpecType(type)) {
    return (
      <ApispecView
        apiDescriptionDocument={value}
        selectedUri={selectedUri}
        sidebarEnabled={sidebarEnabled}
        searchPhrase={searchPhrase}
        schemaViewMode={schemaViewMode}
      />
    )
  }

  if (isJsonSchemaSpecType(type)) {
    return (
      <Marker mark={searchPhrase}>
        <JsonSchemaViewer schema={JSON.parse(value)}/>
      </Marker>
    )
  }

  if (format === MD_FILE_FORMAT) {
    return (
      <Marker mark={searchPhrase}>
        <MarkdownViewer value={value}/>
      </Marker>
    )
  }

  return null
})

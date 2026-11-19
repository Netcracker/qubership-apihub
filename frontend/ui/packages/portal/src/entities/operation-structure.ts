import type { OpenAPIV3 } from 'openapi-types'
import type { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import type { HashWithTitle } from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/oasToClassDiagramService'

export const OPEN_API_SECTION_PARAMETERS = 'parameters'
export const OPEN_API_SECTION_REQUESTS = 'requests'
export const OPEN_API_SECTION_RESPONSES = 'responses'

export type OpenApiCustomSchemaObject = Omit<OpenAPIV3.SchemaObject, 'example'> & {
  examples?: unknown[]
}

export type OpenApiVisitorData = {
  title: string
  scopeDeclarationPath: JsonPath
  declarationPath: JsonPath
  schemaObjectName?: string
  schemaObject?: OpenApiCustomSchemaObject
  schemaTolerantHashWithTitle?: HashWithTitle
  // effective schemas that were derived from the declarative one
  derivedSchemas: OpenAPIV3.SchemaObject[]
  error?: string
}
export type OpenApiVisitorDataWithSection = {
  data: OpenApiVisitorData[]
  scopeDeclarationPath: JsonPath
  declarationPath: JsonPath
}
export type OpenApiData = {
  [OPEN_API_SECTION_PARAMETERS]: OpenApiVisitorDataWithSection
  [OPEN_API_SECTION_RESPONSES]: Record<ResponseCode, Record<MediaType, OpenApiVisitorDataWithSection>>
  [OPEN_API_SECTION_REQUESTS]: Record<string, OpenApiVisitorDataWithSection>
}

export type ResponseCode = string
export type MediaType = string

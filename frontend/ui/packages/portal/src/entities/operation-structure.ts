/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
  schemaObject: OpenApiCustomSchemaObject
  schemaTolerantHashWithTitle?: HashWithTitle
  // effective schemas that were derived from the declarative one
  derivedSchemas: OpenAPIV3.SchemaObject[]
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

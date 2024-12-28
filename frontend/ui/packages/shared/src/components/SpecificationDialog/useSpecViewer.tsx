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

import type { FC, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import type { OpenApiSpecViewerProps } from './OpenApiSpecViewer'
import { OPEN_API_VIEW_MODES, OpenApiSpecViewer } from './OpenApiSpecViewer'
import type { GraphQlSpecViewerProps } from './GraphQlSpecViewer'
import { GRAPHQL_VIEW_MODES, GraphQlSpecViewer } from './GraphQlSpecViewer'
import type { UnsupportedViewerProps } from './UnsupportedViewer'
import { UnsupportedViewer } from './UnsupportedViewer'
import type { JsonSchemaSpecViewerProps } from './JsonSchemaSpecViewer'
import { JSON_SCHEMA_VIEW_MODES, JsonSchemaSpecViewer } from './JsonSchemaSpecViewer'
import { LoadingIndicator } from '../LoadingIndicator'
import type { MarkdownViewerProps } from './MarkdownViewer'
import { MarkdownViewer } from './MarkdownViewer'
import type { SpecViewMode } from '../SpecViewToggler'
import { DOC_SPEC_VIEW_MODE } from '../SpecViewToggler'
import type { Spec } from '../../entities/specs'
import type { ProxyServer } from '../../entities/services'
import type { SpecType } from '../../utils/specs'
import {
  GRAPHAPI_SPEC_TYPE,
  GRAPHQL_INTROSPECTION_SPEC_TYPE,
  GRAPHQL_SCHEMA_SPEC_TYPE,
  GRAPHQL_SPEC_TYPE,
  MARKDOWN_SPEC_TYPE,
  OPENAPI_2_0_SPEC_TYPE,
  OPENAPI_3_0_SPEC_TYPE,
  OPENAPI_3_1_SPEC_TYPE,
  OPENAPI_SPEC_TYPE,
} from '../../utils/specs'
import type { FileExtension } from '../../utils/files'
import { JSON_FILE_EXTENSION, YAML_FILE_EXTENSION } from '../../utils/files'
import { isFastJsonSchema, toJsonSchema } from '../../utils/specifications'

export type SpecViewerResult = {
  viewer: ReactNode
  viewModes: SpecViewMode[]
  viewMode: SpecViewMode
  setViewMode: (value: SpecViewMode) => void
}

export type UseSpecViewerOptions = {
  spec: Spec
  proxyServer?: ProxyServer
  value: string
  defaultViewMode?: SpecViewMode
  isLoading?: boolean
  header?: string
}

export function useSpecViewer({
  spec,
  proxyServer,
  value,
  defaultViewMode = DOC_SPEC_VIEW_MODE,
  isLoading,
  header,
}: UseSpecViewerOptions): SpecViewerResult {
  const [viewMode, setViewMode] = useState<SpecViewMode>(defaultViewMode)

  const [viewer, viewModes] = useMemo(() => {
    if (isLoading) {
      return [<LoadingIndicator/>, []]
    }

    const [Component, views] = specTypeViewers[spec.type] ?? getFormatViewer(spec.extension, value)
    return [<Component view={viewMode} spec={spec} value={value} proxyServer={proxyServer} header={header}/>, views]
  }, [header, isLoading, proxyServer, spec, value, viewMode])

  return { viewer, viewModes, viewMode, setViewMode }
}

type SpecViewers =
  | FC<OpenApiSpecViewerProps>
  | FC<GraphQlSpecViewerProps>
  | FC<MarkdownViewerProps>
  | FC<JsonSchemaSpecViewerProps>
  | FC<UnsupportedViewerProps>

const openApiView: [SpecViewers, SpecViewMode[]] = [OpenApiSpecViewer, OPEN_API_VIEW_MODES]
const graphQlView: [SpecViewers, SpecViewMode[]] = [GraphQlSpecViewer, GRAPHQL_VIEW_MODES]

export const specTypeViewers: Partial<Record<SpecType, [SpecViewers, SpecViewMode[]]>> = {
  [OPENAPI_3_1_SPEC_TYPE]: openApiView,
  [OPENAPI_3_0_SPEC_TYPE]: openApiView,
  [OPENAPI_2_0_SPEC_TYPE]: openApiView,
  [OPENAPI_SPEC_TYPE]: openApiView,

  [GRAPHQL_SPEC_TYPE]: graphQlView,
  [GRAPHQL_SCHEMA_SPEC_TYPE]: graphQlView,
  [GRAPHAPI_SPEC_TYPE]: graphQlView,
  [GRAPHQL_INTROSPECTION_SPEC_TYPE]: graphQlView,

  [MARKDOWN_SPEC_TYPE]: [MarkdownViewer, []],
}

function getFormatViewer(extension: FileExtension, value: string): [SpecViewers, SpecViewMode[]] {
  if (extension === JSON_FILE_EXTENSION || extension === YAML_FILE_EXTENSION) {
    if (isFastJsonSchema(toJsonSchema(value))) {
      return [JsonSchemaSpecViewer, JSON_SCHEMA_VIEW_MODES]
    }
  }

  return [UnsupportedViewer, []]
}

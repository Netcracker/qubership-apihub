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

import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { buildClientSchema, buildSchema, getIntrospectionQuery, graphqlSync } from 'graphql'
import { printSchema as stringifyGraphQl } from 'graphql/utilities/printSchema'
import type { SpecViewMode } from '../SpecViewToggler'
import { DOC_SPEC_VIEW_MODE, INTROSPECTION_SPEC_VIEW_MODE, SCHEMA_SPEC_VIEW_MODE } from '../SpecViewToggler'
import { RawSpecView } from './RawSpecView'
import { GraphqlApiSpecView } from './GraphqlApiSpecView'
import type { Spec } from '../../entities/specs'
import type { ProxyServer } from '../../entities/services'
import type { FileExtension } from '../../utils/files'
import { findGraphQlSpecType, GRAPHQL_FILE_EXTENSION, JSON_FILE_EXTENSION } from '../../utils/files'
import { GRAPHQL_INTROSPECTION_SPEC_TYPE, GRAPHQL_SCHEMA_SPEC_TYPE, GRAPHQL_SPEC_TYPE } from '../../utils/specs'

export type GraphQlSpecViewerProps = {
  view: SpecViewMode
  spec: Spec
  value: string
  proxyServer?: ProxyServer
  header?: string
}

export const GRAPHQL_VIEW_MODES: SpecViewMode[] = [DOC_SPEC_VIEW_MODE, SCHEMA_SPEC_VIEW_MODE, INTROSPECTION_SPEC_VIEW_MODE]

export const GraphQlSpecViewer: FC<GraphQlSpecViewerProps> = /* @__PURE__ */ memo<GraphQlSpecViewerProps>(({
  view,
  spec,
  value,
  proxyServer,
  header,
}) => {
  const [transformedSpecRaw, transformedExtension]: [string, FileExtension] = useMemo(() => {
    const graphQlSpecType = findGraphQlSpecType(spec.extension, value) || GRAPHQL_SPEC_TYPE
    if (view === SCHEMA_SPEC_VIEW_MODE && graphQlSpecType === GRAPHQL_INTROSPECTION_SPEC_TYPE) {
      const schema = buildClientSchema(JSON.parse(value).data)
      return [stringifyGraphQl(schema), GRAPHQL_FILE_EXTENSION]
    }
    if (view === INTROSPECTION_SPEC_VIEW_MODE && graphQlSpecType === GRAPHQL_SCHEMA_SPEC_TYPE) {
      const schema = buildSchema(value, { noLocation: true })
      const introspection = JSON.stringify(graphqlSync({
        schema: schema,
        source: getIntrospectionQuery(),
      }).data, null, 2)
      return [introspection, JSON_FILE_EXTENSION]
    }

    return [value, spec.extension]
  }, [spec, value, view])

  if (view === DOC_SPEC_VIEW_MODE) {
    return (
      <GraphqlApiSpecView
        value={value}
        fetchDataUrl={proxyServer?.url}
        header={header}
      />
    )
  }

  return (
    <RawSpecView
      sx={{ mx: 0, height: '100%' }}
      value={transformedSpecRaw}
      type={spec.type}
      extension={transformedExtension}
    />
  )
})

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

import type { SxProps } from '@mui/material'
import { Box } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'
import type { GraphQLSchemaExtensions, IntrospectionQuery } from 'graphql'
import { buildSchema, introspectionFromSchema } from 'graphql'
import { ErrorBoundary } from './ErrorBoundary'
import { GraphiQL } from 'graphiql'
import { explorerPlugin } from '@graphiql/plugin-explorer'
import type { Theme } from '@mui/material/styles'
import { createGraphiQLFetcher } from '@graphiql/toolkit'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '../../Placeholder'

import 'graphiql/graphiql.css'
import '@graphiql/plugin-explorer/dist/style.css'
import './custom-graphiql-styles.css'
import { getAuthorization } from '../../../utils/storages'

type GraphqlApiSpecViewProps = {
  value: string
  fetchDataUrl?: string
  endpointPath?: string
  header?: string
}

export const GraphqlApiSpecView: FC<GraphqlApiSpecViewProps> = /* @__PURE__ */ memo<GraphqlApiSpecViewProps>(({
  value,
  fetchDataUrl,
  header,
}) => {
  const introspection = toIntrospection(value)

  const fetcher = createGraphiQLFetcher({
    url: fetchDataUrl ?? EMPTY_FETCH_DATA_URL,
    headers: {
      'X-Apihub-Authorization': getAuthorization(), // for INSECURE_PROXY = false
    },
  })

  const explorer = explorerPlugin({})

  const defaultHeader = JSON.stringify({
    Authorization: header || 'Bearer XXX',
  }, undefined, 2)

  return (
    <Box sx={GRAPHQL_CUSTOM_STYLE}>
      <Placeholder
        invisible={!!value}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No file exist"
      >
        <ErrorBoundary>
          <GraphiQL
            fetcher={fetcher}
            plugins={[explorer]}
            schema={introspection?.data}
            headers={defaultHeader}
          />
        </ErrorBoundary>
      </Placeholder>
    </Box>
  )
})

type GraphqlIntrospection = {
  data: IntrospectionQuery
  dataPresent: boolean
  errors: string[]
  extensions: Readonly<GraphQLSchemaExtensions>
}

function toIntrospection(value: string): GraphqlIntrospection | null {
  try {
    return value.startsWith('{')
      ? JSON.parse(value)
      : {
        data: introspectionFromSchema(buildSchema(value)),
        dataPresent: true,
        errors: [],
        extensions: null,
      }
  } catch (e) {
    return null
  }
}

const GRAPHQL_CUSTOM_STYLE: SxProps<Theme> = {
  background: '#F5F5FA',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
}

const EMPTY_FETCH_DATA_URL = ''

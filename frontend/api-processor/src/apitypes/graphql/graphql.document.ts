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

import {
  buildFromIntrospection,
  buildFromSchema,
  GraphApiSchema,
  printGraphApi,
} from '@netcracker/qubership-apihub-graphapi'
import { buildSchema, type GraphQLSchema, type IntrospectionQuery } from 'graphql'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'

import { BuildConfigFile, DocumentDumper, FileFormat, TextFile, VersionDocument } from '../../types'
import { GRAPHQL_DOCUMENT_TYPE, GRAPHQL_FILE_FORMAT } from './graphql.consts'
import { FILE_FORMAT } from '../../consts'
import { createVersionInternalDocument, isObject } from '../../utils'

function toGraphApiSchema(data: unknown, type: string): GraphApiSchema {
  switch (type) {
    case GRAPHQL_DOCUMENT_TYPE.INTROSPECTION: {
      if (!isObject(data)) {
        throw new Error('A GraphQL introspection document must be an object')
      }
      const introspection = ('__schema' in data ? data : data.data) as IntrospectionQuery
      return buildFromIntrospection(introspection)
    }
    case GRAPHQL_DOCUMENT_TYPE.SCHEMA:
      return buildFromSchema(data as GraphQLSchema)
    case GRAPHQL_DOCUMENT_TYPE.GRAPHAPI:
      return data as GraphApiSchema
    default:
      throw new Error(`Unsupported type "${type}" for a GraphQL document`)
  }
}

/** Read a stored document back into a GraphAPI schema using the type and format persisted alongside it. */
export function parseGraphQLDocument(source: string, type: string, format: FileFormat): GraphApiSchema {
  return toGraphApiSchema(parseDocumentSource(source, format), type)
}

function parseDocumentSource(source: string, format: FileFormat): unknown {
  switch (format) {
    case GRAPHQL_FILE_FORMAT.GRAPHQL:
    case GRAPHQL_FILE_FORMAT.GQL:
      return buildSchema(source, { noLocation: true })
    case GRAPHQL_FILE_FORMAT.JSON:
      return JSON.parse(source)
    case GRAPHQL_FILE_FORMAT.YAML:
    case FILE_FORMAT.YML:
      return loadYaml(source)
    default:
      throw new Error(`Unsupported format "${format}" for a GraphQL document`)
  }
}

export const buildGraphQLDocument = async (parsedFile: TextFile, file: BuildConfigFile): Promise<VersionDocument<GraphApiSchema>> => {
  const graphapi = toGraphApiSchema(parsedFile.data, parsedFile.type)

  const { fileId, slug = '', publish = true, apiKind, ...metadata } = file
  const { source } = parsedFile
  return {
    fileId,
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    format: GRAPHQL_FILE_FORMAT.GRAPHQL,
    data: graphapi,
    publish,
    apiKind,
    slug, // unique slug should be already generated
    filename: `${slug}.${GRAPHQL_FILE_FORMAT.GRAPHQL}`,
    title: fileId.split('/').pop()!.replace(/\.[^/.]+$/, ''),
    dependencies: [],
    description: graphapi.description || '',
    operationIds: [],
    metadata,
    source,
    versionInternalDocument: createVersionInternalDocument(slug),
  }
}

export const dumpGraphQLDocument: DocumentDumper<GraphApiSchema> = (document) => {
  return new Blob([printGraphApi(document.data)], { type: 'text/plain' })
}

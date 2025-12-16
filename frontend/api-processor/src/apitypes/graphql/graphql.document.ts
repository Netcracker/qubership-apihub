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
import type { GraphQLSchema, IntrospectionQuery } from 'graphql'

import { BuildConfigFile, DocumentBuilder, DocumentDumper, TextFile, VersionDocument } from '../../types'
import { GRAPHQL_DOCUMENT_TYPE } from './graphql.consts'
import { createVersionInternalDocument } from '../../utils'

export const buildGraphQLDocument = async (parsedFile: TextFile, file: BuildConfigFile): Promise<VersionDocument<GraphApiSchema>> => {
  let graphapi: GraphApiSchema
  if (parsedFile.type === GRAPHQL_DOCUMENT_TYPE.INTROSPECTION) {
    const introspection = (parsedFile?.data && '__schema' in parsedFile.data ? parsedFile?.data : parsedFile.data?.data) as IntrospectionQuery
    graphapi = buildFromIntrospection(introspection)
  } else if (parsedFile.type === GRAPHQL_DOCUMENT_TYPE.SCHEMA) {
    graphapi = buildFromSchema(parsedFile.data as GraphQLSchema)
  } else {
    graphapi = parsedFile.data as GraphApiSchema
  }

  const { fileId, slug = '', publish = true, apiKind, ...metadata } = file
  const { format, type, source } = parsedFile
  return {
    fileId,
    type,
    format,
    data: graphapi,
    publish,
    apiKind,
    slug, // unique slug should be already generated
    filename: `${slug}.graphql`,
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

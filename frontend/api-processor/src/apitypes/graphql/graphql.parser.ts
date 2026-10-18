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

import type { GraphQLSchema } from 'graphql'
import { buildSchema } from 'graphql/utilities'
import { FILE_KIND, TextFile } from '../../types'
import { getFileExtension } from '../../utils'
import { GRAPHQL_DOCUMENT_TYPE, GRAPHQL_FILE_FORMAT } from './graphql.consts'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'
import { parseRecognized, RecognizedFileParseError } from '../../errors'

// The start of a type system definition, anywhere in the text: a keyword and what the grammar puts after it.
// GraphQL has no version key, so this is what tells a schema that does not build from a file that was never
// one, the way the `openapi` key marks a REST document. It is as approximate as that match: prose that reads
// `type of` passes, and the name has to follow on the same line so that a selection listing a `type` field
// and another field under it does not
const SCHEMA_DEFINITION_PATTERN = /\b(type|input|interface|enum|union|scalar)[ \t]+[A-Za-z_]|\bschema\s*[{@]|\bdirective\s*@/

export const parseGraphQLFile = async (fileId: string, source: Blob): Promise<TextFile | undefined> => {
  const sourceString = await source.text()
  const extension = getFileExtension(fileId)
  if (extension === GRAPHQL_FILE_FORMAT.JSON || (!extension && sourceString.trimStart().startsWith('{'))) {
    if (/"graphapi"(\s*)?:(\s*)"0.+"/g.test(sourceString)) {
      return {
        fileId,
        type: GRAPHQL_DOCUMENT_TYPE.GRAPHAPI,
        format: GRAPHQL_FILE_FORMAT.JSON,
        data: parseRecognized(GRAPHQL_DOCUMENT_TYPE.GRAPHAPI, GRAPHQL_FILE_FORMAT.JSON, () => JSON.parse(sourceString)),
        source,
        kind: FILE_KIND.TEXT,
      }
    }
    if (/{(\s*)"__schema"(\s*)?:(\s*){/g.test(sourceString)) {
      return {
        fileId,
        type: GRAPHQL_DOCUMENT_TYPE.INTROSPECTION,
        format: GRAPHQL_FILE_FORMAT.JSON,
        data: parseRecognized(GRAPHQL_DOCUMENT_TYPE.INTROSPECTION, GRAPHQL_FILE_FORMAT.JSON, () => JSON.parse(sourceString)),
        source,
        kind: FILE_KIND.TEXT,
      }
    }
  }
  if (extension === GRAPHQL_FILE_FORMAT.YAML || !extension) {
    if (/"graphapi"(\s*)?:(\s*)?("|')?0.+("|')?/g.test(sourceString)) {
      return {
        fileId,
        type: GRAPHQL_DOCUMENT_TYPE.GRAPHAPI,
        format: GRAPHQL_FILE_FORMAT.YAML,
        data: parseRecognized(GRAPHQL_DOCUMENT_TYPE.GRAPHAPI, GRAPHQL_FILE_FORMAT.YAML, () => loadYaml(sourceString) as object),
        source,
        kind: FILE_KIND.TEXT,
      }
    }
    if (/(\s*)__schema(\s*)?:(\s*)/g.test(sourceString)) {
      return {
        fileId,
        type: GRAPHQL_DOCUMENT_TYPE.INTROSPECTION,
        format: GRAPHQL_FILE_FORMAT.YAML,
        data: parseRecognized(GRAPHQL_DOCUMENT_TYPE.INTROSPECTION, GRAPHQL_FILE_FORMAT.YAML, () => loadYaml(sourceString) as object),
        source,
        kind: FILE_KIND.TEXT,
      }
    }
  }
  if (extension === GRAPHQL_FILE_FORMAT.GQL || extension === GRAPHQL_FILE_FORMAT.GRAPHQL) {
    if (/{(\s*)"__schema"(\s*)?:(\s*){/g.test(sourceString)) {
      return {
        fileId,
        type: GRAPHQL_DOCUMENT_TYPE.INTROSPECTION,
        format: GRAPHQL_FILE_FORMAT.JSON,
        data: parseRecognized(GRAPHQL_DOCUMENT_TYPE.INTROSPECTION, GRAPHQL_FILE_FORMAT.JSON, () => JSON.parse(sourceString)),
        source,
        kind: FILE_KIND.TEXT,
      }
    }

    // `buildSchema` validates as it builds, so a schema that is sound GraphQL syntax still throws here
    let schema: GraphQLSchema
    try {
      schema = buildSchema(sourceString, { noLocation: true })
    } catch (error) {
      // the extension is not enough to blame a file for not being a schema: text that defines nothing of
      // the type system and does not build is some other file
      if (!SCHEMA_DEFINITION_PATTERN.test(sourceString)) {
        return undefined
      }
      throw new RecognizedFileParseError(error, GRAPHQL_DOCUMENT_TYPE.SCHEMA, GRAPHQL_FILE_FORMAT.GRAPHQL)
    }
    return {
      fileId,
      type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
      format: GRAPHQL_FILE_FORMAT.GRAPHQL,
      data: schema,
      source,
      kind: FILE_KIND.TEXT,
    }
  }
}

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

import { buildSchema } from 'graphql/utilities'
import { FILE_KIND, TextFile } from '../../types'
import { getFileExtension } from '../../utils'
import { GRAPHQL_DOCUMENT_TYPE, GRAPHQL_FILE_FORMAT } from './graphql.consts'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'

export const parseGraphQLFile = async (fileId: string, source: Blob): Promise<TextFile | undefined> => {
  const sourceString = await source.text()
  const extension = getFileExtension(fileId)
  if (extension === GRAPHQL_FILE_FORMAT.JSON || (!extension && sourceString.trimStart().startsWith('{'))) {
    if (/"graphapi"(\s*)?:(\s*)"0.+"/g.test(sourceString)) {
      return {
        fileId,
        type: GRAPHQL_DOCUMENT_TYPE.GRAPHAPI,
        format: GRAPHQL_FILE_FORMAT.JSON,
        data: JSON.parse(sourceString),
        source,
        kind: FILE_KIND.TEXT,
      }
    }
    if (/{(\s*)"__schema"(\s*)?:(\s*){/g.test(sourceString)) {
      return {
        fileId,
        type: GRAPHQL_DOCUMENT_TYPE.INTROSPECTION,
        format: GRAPHQL_FILE_FORMAT.JSON,
        data: JSON.parse(sourceString),
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
        data: loadYaml(sourceString) as object,
        source,
        kind: FILE_KIND.TEXT,
      }
    }
    if (/(\s*)__schema(\s*)?:(\s*)/g.test(sourceString)) {
      return {
        fileId,
        type: GRAPHQL_DOCUMENT_TYPE.INTROSPECTION,
        format: GRAPHQL_FILE_FORMAT.YAML,
        data: loadYaml(sourceString) as object,
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
        data: JSON.parse(sourceString),
        source,
        kind: FILE_KIND.TEXT,
      }
    }

    const schema = buildSchema(sourceString, { noLocation: true })
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

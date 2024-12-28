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

import { toYaml } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { safeParse } from '@stoplight/json'
import { toFormattedJsonString } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import type { FileExtension } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import {
  GRAPHQL_FILE_EXTENSION,
  JSON_FILE_EXTENSION,
  YAML_FILE_EXTENSION,
} from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { GRAPHQL_SPEC_TYPE, OPENAPI_3_1_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { YAML_FILE_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const getFileDetails = (apiType: string | undefined, fileViewMode?: string, ...contents: string[]): FileDetails => {
  return API_TYPE_FILE_DETAILS_MAP[apiType as ApiType]?.(contents, fileViewMode)
}

type FileDetails = {
  values: string[]
  extension: FileExtension
  type: SpecType
}

//todo need to refactoring because can be incorrect combinations
const API_TYPE_FILE_DETAILS_MAP: Record<ApiType, (contents: string[], fileViewMode?: string) => FileDetails> = {
  [API_TYPE_GRAPHQL]: (contents) => ({
    values: contents.map(content => toFormattedJsonString(content)),
    extension: GRAPHQL_FILE_EXTENSION,
    type: GRAPHQL_SPEC_TYPE,
  }),
  [API_TYPE_REST]: (contents, fileViewMode) => {
    return fileViewMode === YAML_FILE_VIEW_MODE
      ? {
        values: contents.map(content => toYaml(safeParse(content)) ?? ''),
        extension: YAML_FILE_EXTENSION,
        type: OPENAPI_3_1_SPEC_TYPE,
      }
      : {
        values: contents.map(content => toFormattedJsonString(content)),
        extension: JSON_FILE_EXTENSION,
        type: OPENAPI_3_1_SPEC_TYPE,
      }
  },
}

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

import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import {
  ASYNCAPI_2_SPEC_TYPE,
  JSON_SCHEMA_SPEC_TYPE,
  OPENAPI_3_0_SPEC_TYPE,
  OPENAPI_3_1_SPEC_TYPE,
  UNKNOWN_SPEC_TYPE,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'

const ASYNCAPI_SPEC_TYPES: ReadonlyArray<SpecType> = [
  ASYNCAPI_2_SPEC_TYPE,
]

export function isAsyncApiSpecType(type?: SpecType): boolean {
  return ASYNCAPI_SPEC_TYPES.includes(type as SpecType)
}

const NON_VALIDATABLE_SPEC_TYPES: ReadonlyArray<SpecType> = [
  UNKNOWN_SPEC_TYPE,
  JSON_SCHEMA_SPEC_TYPE,
]

export function isNonValidatableSpecType(type?: SpecType): boolean {
  return NON_VALIDATABLE_SPEC_TYPES.includes(type as SpecType)
}

export function isJsonSchemaSpecType(type?: SpecType): boolean {
  return type === JSON_SCHEMA_SPEC_TYPE
}

export function areCompatibleSpecTypes(
  beforeFileType?: SpecType,
  afterFileType?: SpecType,
): boolean {
  if (!beforeFileType || !afterFileType) {
    return false
  }
  if (beforeFileType === afterFileType) {
    return true
  }
  return COMPATIBLE_SPEC_TYPES.includes(beforeFileType) && COMPATIBLE_SPEC_TYPES.includes(afterFileType)
}

const COMPATIBLE_SPEC_TYPES: ReadonlyArray<SpecType> = [
  OPENAPI_3_1_SPEC_TYPE,
  OPENAPI_3_0_SPEC_TYPE,
]

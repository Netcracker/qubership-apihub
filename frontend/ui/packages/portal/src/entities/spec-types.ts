import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import {
  ASYNCAPI_3_SPEC_TYPE,
  JSON_SCHEMA_SPEC_TYPE,
  OPENAPI_3_0_SPEC_TYPE,
  OPENAPI_3_1_SPEC_TYPE,
  UNKNOWN_SPEC_TYPE,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'

const ASYNCAPI_SPEC_TYPES: ReadonlyArray<SpecType> = [
  ASYNCAPI_3_SPEC_TYPE,
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

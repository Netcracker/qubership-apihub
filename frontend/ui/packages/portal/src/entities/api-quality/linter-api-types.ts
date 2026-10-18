export const LinterApiTypes = {
  OAS_2_0: 'openapi-2-0',
  OAS_3_0: 'openapi-3-0',
  OAS_3_1: 'openapi-3-1',
  ASYNCAPI_3_0: 'asyncapi-3-0',
} as const
export type LinterApiType = (typeof LinterApiTypes)[keyof typeof LinterApiTypes]

const OAS_LINTER_TYPES: ReadonlyArray<LinterApiType> = [
  LinterApiTypes.OAS_2_0,
  LinterApiTypes.OAS_3_0,
  LinterApiTypes.OAS_3_1,
]

export function isOasLinterType(type: LinterApiType): boolean {
  return OAS_LINTER_TYPES.includes(type as LinterApiType)
}

export function isAsyncApiLinterType(type: LinterApiType): boolean {
  return type === LinterApiTypes.ASYNCAPI_3_0
}

export const LINTER_API_TYPE_TITLE_MAP = {
  [LinterApiTypes.OAS_2_0]: 'OAS 2.0',
  [LinterApiTypes.OAS_3_0]: 'OAS 3.0',
  [LinterApiTypes.OAS_3_1]: 'OAS 3.1',
  [LinterApiTypes.ASYNCAPI_3_0]: 'AsyncAPI 3.0',
}

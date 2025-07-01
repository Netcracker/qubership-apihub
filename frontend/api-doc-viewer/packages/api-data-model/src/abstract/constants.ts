
export const modelTreeNodeType = {
  simple: 'simple',
  oneOf: 'oneOf',
  anyOf: 'anyOf',
  allOf: 'allOf',
} as const

export const UNKNOWN_TYPE = 'unknown'

export const SYNTHETIC_TITLE_FLAG = Symbol('$title')
export const ORIGINS_FLAG = Symbol('$origins')

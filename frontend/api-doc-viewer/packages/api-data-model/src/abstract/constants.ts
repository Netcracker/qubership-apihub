
export const modelTreeNodeType = {
  simple: 'simple',
  oneOf: 'oneOf',
  anyOf: 'anyOf',
  allOf: 'allOf',
} as const

export const UNKNOWN_TYPE = 'unknown'

export const SYNTHETIC_TITLE_FLAG = Symbol('$title')
export const ORIGINS_FLAG = Symbol('$origins')

/*
 Marks a value produced by a crawl transformer with the value it was created from.
 Cycle detection relies on referential identity of the crawled (source) values,
 so transformers that return a copy must keep a link to the original.
*/
export const TRANSFORMED_FROM = Symbol('$transformedFrom')

import { isArray } from '@netcracker/qubership-apihub-json-crawl'
import { SchemaTransformFunc } from '../abstract/types'
import { isObject } from '../utils'
import { JsonSchemaCrawlState } from './tree/types'

export const transformExample: SchemaTransformFunc<JsonSchemaCrawlState> = (value) => {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  // 1. convert example to array of examples
  // apihub-doc-viewer supports 'examples', but openapi spec allows only 'example'
  if ('example' in value && !('examples' in value)) {
    const { example } = value
    value['examples'] = [example]
    return value
    //todo transform changes? Fix when case
  }
  return value
}

export const jsonSchemaTransformers = [
  transformExample,
]

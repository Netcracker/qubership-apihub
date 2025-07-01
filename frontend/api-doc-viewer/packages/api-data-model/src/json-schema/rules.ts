import { CrawlRules } from '@netcracker/qubership-apihub-json-crawl'

import type { JsonSchemaCrawlRule, JsonSchemaNodeKind } from './tree/types'
import { isNumber } from '../utils'
import { jsonSchemaTransformers } from './transformers'

export const jsonSchemaCrawlRules = (kind: JsonSchemaNodeKind = 'root'): CrawlRules<JsonSchemaCrawlRule> => ({
  '/allOf': {
    '/*': () => jsonSchemaCrawlRules('allOf'),
  },
  '/oneOf': {
    '/*': () => jsonSchemaCrawlRules('oneOf'),
  },
  '/anyOf': {
    '/*': () => jsonSchemaCrawlRules('anyOf'),
  },
  '/properties': {
    '/*': () => jsonSchemaCrawlRules('property'),
  },
  '/items': () => ({
    ...jsonSchemaCrawlRules('items'),
    '/*': ({ key }) => isNumber(key) ? jsonSchemaCrawlRules('item') : {},
  }),
  '/additionalProperties': () => jsonSchemaCrawlRules('additionalProperties'),
  '/additionalItems': () => jsonSchemaCrawlRules('additionalItems'),
  '/patternProperties': {
    '/*': () => jsonSchemaCrawlRules('patternProperty'),
  },
  kind,
  transformers: jsonSchemaTransformers,
})

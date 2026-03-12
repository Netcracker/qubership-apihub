import { CrawlRules } from '@netcracker/qubership-apihub-json-crawl'

import type { JsonSchemaCrawlRule, JsonSchemaNodeKind } from './tree/types'
import { isNumber } from '../utils'
import { jsonSchemaTransformers } from './transformers'
import { jsonSchemaNodeKind } from './constants'

export const jsonSchemaCrawlRules = (kind: JsonSchemaNodeKind = jsonSchemaNodeKind.root): CrawlRules<JsonSchemaCrawlRule> => ({
  '/allOf': {
    '/*': () => jsonSchemaCrawlRules(jsonSchemaNodeKind.allOf),
  },
  '/oneOf': {
    '/*': () => jsonSchemaCrawlRules(jsonSchemaNodeKind.oneOf),
  },
  '/anyOf': {
    '/*': () => jsonSchemaCrawlRules(jsonSchemaNodeKind.anyOf),
  },
  '/properties': {
    '/*': () => jsonSchemaCrawlRules(jsonSchemaNodeKind.property),
  },
  '/items': () => ({
    ...jsonSchemaCrawlRules(jsonSchemaNodeKind.items),
    '/*': ({ key }) => isNumber(key) ? jsonSchemaCrawlRules(jsonSchemaNodeKind.item) : {},
  }),
  '/additionalProperties': () => jsonSchemaCrawlRules(jsonSchemaNodeKind.additionalProperties),
  '/additionalItems': () => jsonSchemaCrawlRules(jsonSchemaNodeKind.additionalItems),
  '/patternProperties': {
    '/*': () => jsonSchemaCrawlRules(jsonSchemaNodeKind.patternProperty),
  },
  kind,
  transformers: jsonSchemaTransformers,
})

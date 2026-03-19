import { CrawlRulesContext } from '@netcracker/qubership-apihub-json-crawl'
import {
  jsonSchemaAdapter,
  jsonSchemaRules,
  NativeAnySchemaFactory,
  resolveSchemaDescriptionTemplates,
} from '../jsonSchema'
import {
  allAnnotation,
  allBreaking,
  allUnclassified,
  diffDescription,
  dynamicReclassifyTransformer,
  ReversePredicate,
  transformCompareRules,
} from '../core'
import { AdapterResolver, CompareRules } from '../types'
import {
  ASYNCAPI_SCHEMA_FORMAT_DEFAULT,
  ASYNCAPI_SCHEMA_FORMATS_ASCYNAPI_30,
  ASYNCAPI_SCHEMA_FORMATS_JSON,
  ASYNCAPI_SCHEMA_FORMATS_OPENAPI_30,
  normalize,
  SPEC_TYPE_JSON_SCHEMA_07,
  SPEC_TYPE_OPEN_API_30,
} from '@netcracker/qubership-apihub-api-unifier'
import { COMPARE_MODE_DEFAULT } from '../types'
import { COMPARE_SCOPE_RECEIVE } from './asyncapi3.const'
import { asyncApiSpecificationExtensionRulesFunction } from './asyncapi3.compare.rules'
import { openApiSchemaRules } from '../openapi/openapi3.schema'
import { isObject } from '../utils'

// AsyncAPI 3.0 uses JSON Schema draft-07 as the base
const asyncApiJsonSchemaAnyFactory: NativeAnySchemaFactory = (schema, schemaOrigins, opt) => {
  return normalize(schema, {
    ...opt,
    resolveRef: false,
    originsAlreadyDefined: true,
    validate: false,
    allowNotValidSyntheticChanges: false,
  }) as Record<PropertyKey, unknown>
}

export function isMultiFormatSchema(value: unknown): boolean {
  return isObject(value) && 'schema' in (value as Record<string, unknown>)
}

// Predicate: returns true when the current compare scope is 'receive'
const isReceiveScope: ReversePredicate = (ctx) => ctx.scope === COMPARE_SCOPE_RECEIVE

// Applies dynamic scope-based reclassification to a set of CompareRules.
// breaking ↔ nonBreaking are swapped when isReceiveScope(ctx) is true at diff time.
const withDynamicScopeReclassification = (rules: CompareRules): CompareRules =>
  transformCompareRules(rules, dynamicReclassifyTransformer(isReceiveScope))

function asyncApiSchemaRulesFactory(): CompareRules {
  return jsonSchemaRules({
    additionalRules: {
      adapter: [
        jsonSchemaAdapter(asyncApiJsonSchemaAnyFactory),
      ],
      description: diffDescription(resolveSchemaDescriptionTemplates()),
      '/example': {
        $: allAnnotation,
        description: diffDescription(resolveSchemaDescriptionTemplates('example')),
      },
      '/externalDocs': {
        $: allAnnotation,
        description: diffDescription(resolveSchemaDescriptionTemplates('externalDocs')),
        '/description': {
          $: allAnnotation,
          description: diffDescription(resolveSchemaDescriptionTemplates('description of externalDocs')),
        },
        '/url': {
          $: allAnnotation,
          description: diffDescription(resolveSchemaDescriptionTemplates('url of externalDocs')),
        },
        ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
        '/*': {
          $: allAnnotation,
          description: diffDescription(resolveSchemaDescriptionTemplates('externalDocs')),
        },
      },
      ...asyncApiSpecificationExtensionRulesFunction(),
    },
    version: SPEC_TYPE_JSON_SCHEMA_07,
  })
}

// Cached rule sets with dynamic scope reclassification applied at module load time
const asyncApiSchemaRules: CompareRules = withDynamicScopeReclassification(asyncApiSchemaRulesFactory())

const openApi30SchemaRules: CompareRules = withDynamicScopeReclassification(
  openApiSchemaRules({ version: SPEC_TYPE_OPEN_API_30, mode: COMPARE_MODE_DEFAULT }),
)

const jsonDraft7SchemaRules: CompareRules = withDynamicScopeReclassification(
  jsonSchemaRules({
    additionalRules: {
      description: diffDescription(resolveSchemaDescriptionTemplates()),  //TODO: verify description templates
      ...asyncApiSpecificationExtensionRulesFunction(),
    },
    version: SPEC_TYPE_JSON_SCHEMA_07,
  }),
)

const unknownFormatSchemaRules: CompareRules = { '/**': { $: allUnclassified } }

type NormalizedSchemaFormat = string

function normalizeSchemaFormat(format: string): NormalizedSchemaFormat {
  return format.trim().toLowerCase()
}

function getSchemaRulesByFormat(schemaFormat: string): CompareRules {
  const normalized = normalizeSchemaFormat(schemaFormat)
  if (ASYNCAPI_SCHEMA_FORMATS_ASCYNAPI_30.includes(normalized)) {
    return asyncApiSchemaRules
  }
  if (ASYNCAPI_SCHEMA_FORMATS_OPENAPI_30.includes(normalized)) {
    return openApi30SchemaRules
  }
  if (ASYNCAPI_SCHEMA_FORMATS_JSON.includes(normalized)) {
    return jsonDraft7SchemaRules
  }
  return unknownFormatSchemaRules
}

// Adapts a plain-schema side to multi-format when the reference is multi-format.
// This runs symmetrically (before→after and after→before) so covers both mismatch directions.
const schemaToMultiFormatSchemaAdapter: AdapterResolver = (value, reference, ctx) => {
  if (!isObject(value) || !isObject(reference)) return value
  const val = value as Record<string, unknown>
  const ref = reference as Record<string, unknown>
  if ('schema' in val || !('schema' in ref)) return value
  return ctx.transformer(value, 'schema-to-multi-format', (current) => ({
    schema: current,
    schemaFormat: ASYNCAPI_SCHEMA_FORMAT_DEFAULT,
  }))
}

// asyncApiSchemaRules augmented with:
// 1. schemaToMultiFormatSchemaAdapter – so it fires when before=plain and after=multi-format.
// 2. /schema + /schemaFormat rules – after the adapter wraps the plain side into
//    {schema:..., schemaFormat:...} both sides have the multi-format shape, and these
//    rules handle the inner content comparison correctly without falling through to /**
//    (allUnclassified). /schema reuses the same dynamically-reclassified asyncApiSchemaRules
//    which is correct because plain-schema implies AsyncAPI JSON schema format.
//
// The alternative to adding /schema + /schemaFormat rules is to add a post-adaptation rule hook in compare.ts
//  Something like: if the adapter changes the structural shape of a value, re-call getNodeRules
// with the adapted value and update crawlContext.rules.
const asyncApiSchemaRulesWithAdapter: CompareRules = {
  ...asyncApiSchemaRules,
  '/schema': asyncApiSchemaRules,
  '/schemaFormat': { $: allBreaking },
  adapter: [schemaToMultiFormatSchemaAdapter, ...(asyncApiSchemaRules.adapter ?? [])],
}

// Cache one instance per supported format string to avoid re-computation
const multiFormatSchemaRulesCache = new Map<NormalizedSchemaFormat, CompareRules>()

function multiFormatSchemaRulesFactory(schemaFormat: string): CompareRules {
  const normalized = normalizeSchemaFormat(schemaFormat)
  const cached = multiFormatSchemaRulesCache.get(normalized)
  if (cached) return cached

  const contentRules = getSchemaRulesByFormat(normalized)
  const rules: CompareRules = {
    adapter: [schemaToMultiFormatSchemaAdapter],
    '/schemaFormat': { $: allBreaking },
    '/schema': contentRules,
    ...asyncApiSpecificationExtensionRulesFunction(),
  }
  multiFormatSchemaRulesCache.set(normalized, rules)
  return rules
}

/**
 * Entry-point CrawlRulesFunc for AsyncAPI 3.0 schema/multiFormatSchema nodes.
 * Dispatches based on the **before** value only (value from CrawlRulesContext).
 * - Plain schema object → asyncApiSchemaRules (with dynamic scope reclassification)
 * - Multi-format schema object → multiFormatSchemaRulesFactory(schemaFormat)
 */
export const schemaOrMultiFormatSchemaRules = ({ value }: CrawlRulesContext): CompareRules => {
  if (!isMultiFormatSchema(value)) {
    return asyncApiSchemaRulesWithAdapter
  }
  const obj = value as Record<string, unknown>
  const schemaFormat = typeof obj.schemaFormat === 'string'
    ? obj.schemaFormat
    : ASYNCAPI_SCHEMA_FORMAT_DEFAULT
  return multiFormatSchemaRulesFactory(schemaFormat)
}

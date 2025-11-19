import {
  jsonSchemaAdapter,
  jsonSchemaRules,
  NativeAnySchemaFactory,
  resolveSchemaDescriptionTemplates,
} from '../jsonSchema'
import {
  allAnnotation,
  allUnclassified,
  breaking,
  breakingIf,
  breakingIfAfterTrue,
  diffDescription,
  nonBreaking,
  reverseClassifyRuleTransformer,
  transformCompareRules,
} from '../core'
import type { OpenApi3SchemaRulesOptions } from './openapi3.types'
import { AdapterContext, AdapterResolver, CompareRules } from '../types'
import {
  ChainItem,
  cleanOrigins,
  JSON_SCHEMA_NODE_TYPE_NULL,
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_NULLABLE,
  JSON_SCHEMA_PROPERTY_ONE_OF,
  JSON_SCHEMA_PROPERTY_TITLE,
  JSON_SCHEMA_PROPERTY_TYPE,
  JsonSchemaSpecVersion,
  normalize,
  type OpenApiSpecVersion,
  OriginsMetaRecord,
  setOrigins,
  SPEC_TYPE_JSON_SCHEMA_04,
  SPEC_TYPE_JSON_SCHEMA_07,
  SPEC_TYPE_OPEN_API_30,
  SPEC_TYPE_OPEN_API_31,
} from '@netcracker/qubership-apihub-api-unifier'
import { schemaParamsCalculator } from './openapi3.description.schema'
import { openApiSpecificationExtensionRulesFunction } from './openapi3.compare.rules'
import { isArray, isObject } from '../utils'

const NULL_TYPE_COMBINERS = [JSON_SCHEMA_PROPERTY_ANY_OF, JSON_SCHEMA_PROPERTY_ONE_OF] as const
const SPEC_TYPE_TO_VERSION: Record<OpenApiSpecVersion, string> = {
  [SPEC_TYPE_OPEN_API_30]: '3.0.0',
  [SPEC_TYPE_OPEN_API_31]: '3.1.0',
}

const openApiJsonSchemaAnyFactory: (version: OpenApiSpecVersion) => NativeAnySchemaFactory = (version) => (schema, schemaOrigins, opt) => {
  const normalizedSpec: any = normalize({
    openapi: SPEC_TYPE_TO_VERSION[version],
    components: {
      schemas: {
        empty: schema,
        [opt.originsFlag]: {
          empty: schemaOrigins,
        } as OriginsMetaRecord,
      },
      [opt.originsFlag]: {
        schemas: schemaOrigins,
      } as OriginsMetaRecord,
    },
    [opt.originsFlag]: {
      components: schemaOrigins,
    } as OriginsMetaRecord,
  }, {
    ...opt,
    // schema is already normalized, resolveRef is disabled and originsAlreadyDefined is true in order to prevent origins override
    resolveRef: false,
    originsAlreadyDefined: true,
    validate: false,
    allowNotValidSyntheticChanges: false,
  })
  return normalizedSpec.components.schemas.empty as Record<PropertyKey, unknown>
}

const hasNullType = (schema: unknown): boolean => {
  if (!isObject(schema)) {
    return false
  }

  const type = schema[JSON_SCHEMA_PROPERTY_TYPE]
  if (type === JSON_SCHEMA_NODE_TYPE_NULL) {
    return true
  }

  if (isArray(type) && type.includes(JSON_SCHEMA_NODE_TYPE_NULL)) {
    return true
  }

  return NULL_TYPE_COMBINERS.some((combiner) => {
    const variants = schema[combiner]
    return isArray(variants) && variants.some(hasNullType)
  })
}

const buildNullTypeWithOrigins = (
  valueWithoutNullable: Record<PropertyKey, unknown>,
  context: AdapterContext<unknown>,
  factory: NativeAnySchemaFactory,
): Record<PropertyKey, unknown> => {
  const { options, valueOrigins } = context
  const { originsFlag, syntheticTitleFlag } = options

  const nullTypeObject = factory(
    { [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_NULL },
    valueOrigins,
    options,
  )

  const inputOrigins = valueWithoutNullable[originsFlag] as Record<PropertyKey, unknown> | undefined
  const nullTypeOrigins = isObject(nullTypeObject[originsFlag]) ? nullTypeObject[originsFlag] as Record<PropertyKey, unknown> : {}

  const nullable = inputOrigins && inputOrigins.nullable as ChainItem[]
  if (nullable) {
    const getOriginParent = (item: ChainItem | undefined) => ({
      value: JSON_SCHEMA_PROPERTY_TYPE,
      parent: item?.parent,
    })

    nullTypeOrigins[JSON_SCHEMA_PROPERTY_TYPE] = isArray(nullable)
      ? (nullable).map(getOriginParent)
      : getOriginParent(nullable)
  }

  const title = valueWithoutNullable[JSON_SCHEMA_PROPERTY_TITLE]
  if (title) {
    nullTypeObject[JSON_SCHEMA_PROPERTY_TITLE] = title

    const titleOrigins = inputOrigins && inputOrigins[JSON_SCHEMA_PROPERTY_TITLE]
    if (titleOrigins) {
      nullTypeOrigins[JSON_SCHEMA_PROPERTY_TITLE] = titleOrigins
    }
  }

  if (syntheticTitleFlag && valueWithoutNullable[syntheticTitleFlag]) {
    nullTypeObject[syntheticTitleFlag] = true
  }

  return nullTypeObject
}

const jsonSchemaOas30to31Adapter: (factory: NativeAnySchemaFactory) => AdapterResolver = (factory) => (value, reference, valueContext) => {
  if (!isObject(value) || !isObject(reference)) {
    return value
  }

  if (value[JSON_SCHEMA_PROPERTY_NULLABLE] !== true) {
    return value
  }

  if (!hasNullType(reference)) {
    return value
  }

  const { originsFlag } = valueContext.options

  return valueContext.transformer(value, 'nullable-to-anyof', (current) => {
    if (!isObject(current)) {
      return current
    }
    const {
      [JSON_SCHEMA_PROPERTY_NULLABLE]: _nullable,
      ...valueWithoutNullable
    } = current

    const nullTypeObject = buildNullTypeWithOrigins(valueWithoutNullable, valueContext, factory)

    cleanOrigins(valueWithoutNullable, JSON_SCHEMA_PROPERTY_NULLABLE, originsFlag)

    const anyOfArray = [valueWithoutNullable, nullTypeObject]

    const result: Record<PropertyKey, unknown> = { [JSON_SCHEMA_PROPERTY_ANY_OF]: anyOfArray }

    setOrigins(result, JSON_SCHEMA_PROPERTY_ANY_OF, originsFlag, valueContext.valueOrigins)
    setOrigins(anyOfArray, 0, originsFlag, valueContext.valueOrigins)
    setOrigins(anyOfArray, 1, originsFlag, valueContext.valueOrigins)

    return result
  })
}

export const openApiSchemaRules = (options: OpenApi3SchemaRulesOptions): CompareRules => {
  //todo find better way to remove this 'version specific' copy-paste with normalize
  const jsonSchemaVersion: JsonSchemaSpecVersion = options.version === SPEC_TYPE_OPEN_API_30 ? SPEC_TYPE_JSON_SCHEMA_04 : SPEC_TYPE_JSON_SCHEMA_07

  const schemaRules = jsonSchemaRules({
    additionalRules: {
      adapter: [
        ...(options.version === SPEC_TYPE_OPEN_API_31 ? [jsonSchemaOas30to31Adapter(openApiJsonSchemaAnyFactory(options.version))] : []),
        jsonSchemaAdapter(openApiJsonSchemaAnyFactory(options.version)),
      ],
      descriptionParamCalculator: schemaParamsCalculator,
      description: diffDescription(resolveSchemaDescriptionTemplates()),
      // openapi extensions
      '/nullable': {
        $: [
          nonBreaking,
          breaking,
          ({ after }) => breakingIf(!after.value),
          breakingIfAfterTrue,
          nonBreaking,
          ({ after }) => breakingIf(!!after.value),
        ],
        description: diffDescription(resolveSchemaDescriptionTemplates('nullable status')),
      },
      '/discriminator': { $: allUnclassified },
      '/example': { $: allAnnotation, description: diffDescription(resolveSchemaDescriptionTemplates('example')) },
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
        ...openApiSpecificationExtensionRulesFunction(allAnnotation),
        '/*': {
          $: allAnnotation,
          description: diffDescription(resolveSchemaDescriptionTemplates('externalDocs')),
        },
      },
      '/xml': {
        ...openApiSpecificationExtensionRulesFunction(),
      },
      ...openApiSpecificationExtensionRulesFunction(),
    },
    version: jsonSchemaVersion,
  })

  return options.response
    ? transformCompareRules(schemaRules, reverseClassifyRuleTransformer)
    : schemaRules
}


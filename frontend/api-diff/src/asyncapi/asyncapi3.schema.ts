import {
  jsonSchemaAdapter,
  jsonSchemaRules,
  NativeAnySchemaFactory,
  resolveSchemaDescriptionTemplates,
} from '../jsonSchema'
import {
  allAnnotation,
  diffDescription,
  reverseClassifyRuleTransformer,
  transformCompareRules,
} from '../core'
import type { AsyncApi3SchemaRulesOptions } from './asyncapi3.types'
import { CompareRules } from '../types'
import {
  normalize,
  SPEC_TYPE_JSON_SCHEMA_07,
} from '@netcracker/qubership-apihub-api-unifier'
import { asyncApiSpecificationExtensionRulesFunction } from './asyncapi3.compare.rules'

// AsyncAPI 3.0 uses JSON Schema draft-07
const asyncApiJsonSchemaAnyFactory: NativeAnySchemaFactory = (schema, schemaOrigins, opt) => {
  return normalize(schema, {
    ...opt,
    // schema is already normalized, resolveRef is disabled and originsAlreadyDefined is true in order to prevent origins override
    resolveRef: false,
    originsAlreadyDefined: true,
    validate: false,
    allowNotValidSyntheticChanges: false,
  }) as Record<PropertyKey, unknown>
}

export const asyncApiSchemaRules = (options: AsyncApi3SchemaRulesOptions): CompareRules => {
  // AsyncAPI 3.0 uses JSON Schema draft-07
  const schemaRules = jsonSchemaRules({
    additionalRules: {
      adapter: [
        jsonSchemaAdapter(asyncApiJsonSchemaAnyFactory),
      ],
      description: diffDescription(resolveSchemaDescriptionTemplates()),
      // AsyncAPI-specific schema extensions
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

  // For receive operations (send=false or undefined), apply reverse classifier
  // This mirrors OpenAPI's behavior where response schemas have reversed classification
  return options.send
    ? schemaRules
    : transformCompareRules(schemaRules, reverseClassifyRuleTransformer)
}


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
import { CompareRules } from '../types'
import {
  JsonSchemaSpecVersion,
  normalize,
  type OpenApiSpecVersion,
  OriginsMetaRecord,
  SPEC_TYPE_JSON_SCHEMA_04,
  SPEC_TYPE_JSON_SCHEMA_07,
  SPEC_TYPE_OPEN_API_30,
  SPEC_TYPE_OPEN_API_31,
} from '@netcracker/qubership-apihub-api-unifier'
import { schemaParamsCalculator } from './openapi3.description.schema'

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

export const openApiSchemaRules = (options: OpenApi3SchemaRulesOptions): CompareRules => {
  //todo find better way to remove this 'version specific' copy-paste with normalize
  const jsonSchemaVersion: JsonSchemaSpecVersion = options.version === SPEC_TYPE_OPEN_API_30 ? SPEC_TYPE_JSON_SCHEMA_04 : SPEC_TYPE_JSON_SCHEMA_07

  const schemaRules = jsonSchemaRules({
    additionalRules: {
      adapter: [
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
        description: diffDescription(resolveSchemaDescriptionTemplates('nullable status'))
      },
      '/discriminator': { $: allUnclassified },
      '/example': { $: allAnnotation, description: diffDescription(resolveSchemaDescriptionTemplates('example')) },
      '/externalDocs': {
        $: allAnnotation,
        description: diffDescription(resolveSchemaDescriptionTemplates('externalDocs')),
        '/description': {
          $: allAnnotation,
          description: diffDescription(resolveSchemaDescriptionTemplates('description of externalDocs'))
        },
        '/url': {
          $: allAnnotation,
          description: diffDescription(resolveSchemaDescriptionTemplates('url of externalDocs'))
        },
        '/*': {
          $: allAnnotation,
          description: diffDescription(resolveSchemaDescriptionTemplates('externalDocs'))
        },
      },
      '/xml': {},
    },
    version: jsonSchemaVersion,
  })

  return options.response
    ? transformCompareRules(schemaRules, reverseClassifyRuleTransformer)
    : schemaRules
}


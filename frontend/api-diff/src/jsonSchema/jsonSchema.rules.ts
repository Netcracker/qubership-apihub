import {
  allAnnotation,
  allBreaking,
  allDeprecated,
  allNonBreaking,
  allUnclassified,
  booleanClassifier,
  breaking,
  breakingIf,
  deepEqualsUniqueItemsArrayMappingResolver,
  diffDescription,
  nonBreaking,
  onlyAddBreaking,
  reverseClassifyRuleTransformer,
  risky,
  TEMPLATE_PARAM_ACTION,
  TEMPLATE_PARAM_PLACE,
  TEMPLATE_PARAM_PREPOSITION,
  TEMPLATE_PARAM_PROPERTY_NAME,
  TEMPLATE_PARAM_SCHEMA_PATH,
  TEMPLATE_PARAM_SCOPE,
  transformCompareRules,
  unclassified,
} from '../core'
import {
  enumClassifyRule,
  exclusiveClassifier,
  maxClassifier,
  maximumClassifier,
  minClassifier,
  minimumClassifier,
  multipleOfClassifier,
  propertyClassifyRule,
  requiredItemClassifyRule,
  typeClassifier,
} from './jsonSchema.classify'
import { jsonSchemaAdapter } from './jsonSchema.adapter'
import { jsonSchemaMappingResolver } from './jsonSchema.mapping'
import { combinersCompareResolver } from './jsonSchema.resolver'
import { ClassifyRule, CompareRules, DescriptionTemplates } from '../types'
import { JsonSchemaRulesOptions, NativeAnySchemaFactory } from './jsonSchema.types'
import { normalize, SPEC_TYPE_JSON_SCHEMA_04 } from '@netcracker/qubership-apihub-api-unifier'
import { isBoolean, isNumber, isString } from '../utils'

const simpleRule = (classify: ClassifyRule, descriptionTemplate: DescriptionTemplates) => ({
  $: classify,
  description: diffDescription(descriptionTemplate)
})

const arrayItemsRules = (value: unknown, rules: CompareRules): CompareRules => {
  return Array.isArray(value) ? {
    '/*': {
      ...rules,
      $: allBreaking,
    },
  } : {
    ...rules,
    $: allNonBreaking,
  }
}

const jsonSchemaAnyFactory: NativeAnySchemaFactory = (schema, _, opt) => {
  return normalize(schema, {
    ...opt,
    // schema is already normalized, resolveRef is disabled and originsAlreadyDefined is true in order to prevent origins override
    resolveRef: false,
    originsAlreadyDefined: true,
    validate: false,
    allowNotValidSyntheticChanges: false,
  }) as Record<PropertyKey, unknown>
}

export const jsonSchemaRules = ({
  additionalRules,
  version,
}: JsonSchemaRulesOptions): CompareRules => {
  const rules: CompareRules = {
    adapter: [
      jsonSchemaAdapter(jsonSchemaAnyFactory),
    ],
    mapping: jsonSchemaMappingResolver,
    // todo: add descriptionParamCalculator only for jsonScheme
    '/title': simpleRule(allAnnotation, resolveSchemaDescriptionTemplates('title')),
    '/description': simpleRule(allAnnotation, resolveSchemaDescriptionTemplates('description')),
    '/type': simpleRule(typeClassifier, resolveSchemaDescriptionTemplates('type')),

    '/multipleOf': simpleRule(multipleOfClassifier, resolveSchemaDescriptionTemplates('multipleOf validator')),
    '/maximum': simpleRule(maximumClassifier, resolveSchemaDescriptionTemplates('maximum validator')),
    '/minimum': simpleRule(minimumClassifier, resolveSchemaDescriptionTemplates('minimum validator')),
    ...version === SPEC_TYPE_JSON_SCHEMA_04 ? {
      '/exclusiveMaximum': simpleRule(exclusiveClassifier, resolveSchemaDescriptionTemplates('exclusiveMaximum validator')),
      '/exclusiveMinimum': simpleRule(exclusiveClassifier, resolveSchemaDescriptionTemplates('exclusiveMinimum validator')),
    } : {
      '/exclusiveMaximum': simpleRule(maxClassifier, resolveSchemaDescriptionTemplates('exclusiveMaximum validator')),
      '/exclusiveMinimum': simpleRule(minClassifier, resolveSchemaDescriptionTemplates('exclusiveMinimum validator')),
    },
    '/maxLength': simpleRule(maxClassifier, resolveSchemaDescriptionTemplates('maxLength validator')),
    '/minLength': simpleRule(minClassifier, resolveSchemaDescriptionTemplates('minLength validator')),
    '/pattern': simpleRule([breaking, nonBreaking, breaking, nonBreaking, breaking, breaking], resolveSchemaDescriptionTemplates('pattern validator')),
    '/maxItems': simpleRule(maxClassifier, resolveSchemaDescriptionTemplates('maxItems validator')),
    '/minItems': simpleRule(minClassifier, resolveSchemaDescriptionTemplates('minItems validator')),
    '/uniqueItems': simpleRule(booleanClassifier, resolveSchemaDescriptionTemplates('uniqueItems validator')),
    '/maxProperties': simpleRule(maxClassifier, resolveSchemaDescriptionTemplates('maxProperties validator')),
    '/minProperties': simpleRule(minClassifier, resolveSchemaDescriptionTemplates('minProperties validator')),

    '/readOnly': simpleRule([...booleanClassifier, ...allNonBreaking] as ClassifyRule, resolveSchemaDescriptionTemplates('readOnly status')),
    '/writeOnly': simpleRule([...allNonBreaking, ...allNonBreaking] as ClassifyRule, resolveSchemaDescriptionTemplates('writeOnly status')),
    '/deprecated': simpleRule(allDeprecated, resolveSchemaDescriptionTemplates('deprecated status')),
    '/required': {
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': ({ key, value }) => {
        if (!isNumber(key) || !isString(value)) {
          return undefined
        }
        return ({
          ...simpleRule(requiredItemClassifyRule, resolveSchemaDescriptionTemplates(`required status for property '${value}'`)),
          ignoreKeyDifference: true,
        })
      },
    },

    '/format': simpleRule([breaking, nonBreaking, breaking, nonBreaking, breaking, breaking], resolveSchemaDescriptionTemplates('format')),
    '/default': simpleRule([nonBreaking, breaking, breaking], resolveSchemaDescriptionTemplates('default value')),

    '/enum': {
      $: [breaking, nonBreaking, breaking, nonBreaking, risky, nonBreaking],
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': ({ key, value }) => {
        if (!isNumber(key)) {
          return undefined
        }
        return ({
          $: enumClassifyRule,
          description: diffDescription(resolveSchemaDescriptionTemplates(isString(value) || isBoolean(value) || isNumber(value) ? `possible value '${value.toString()}'` : 'some possible value')),
          ignoreKeyDifference: true,
        })
      },
    },

    '/oneOf': {
      compare: combinersCompareResolver,
      '/*': ({ key }) => {
        if (!isNumber(key)) {
          return undefined
        }
        return ({
          ...rules,
          $: [nonBreaking, breaking, breaking],
          description: diffDescription(resolveSchemaDescriptionTemplates(`oneOf[${key.toString()}]`)),
        })
      },
    },
    '/anyOf': {
      compare: combinersCompareResolver,
      '/*': ({ key }) => {
        if (!isNumber(key)) {
          return undefined
        }
        return ({
          ...rules,
          $: [nonBreaking, breaking, breaking],
          description: diffDescription(resolveSchemaDescriptionTemplates(`anyOf[${key.toString()}]`)),
        })
      },
    },
    '/allOf': {
      //TODO CHECK. This node wil be only if allOf broken!!! do we need merge it?
      compare: combinersCompareResolver,
      '/*': () => ({
        ...rules,
        $: allBreaking,
      }),
    },

    '/const': simpleRule([breaking, nonBreaking, breaking], resolveSchemaDescriptionTemplates('const')),
    '/not': () => ({
      // TODO check
      ...transformCompareRules(rules, reverseClassifyRuleTransformer),
      $: allBreaking,
    }),
    '/items': ({ value }) => arrayItemsRules(value, rules),
    '/additionalItems': () => ({
      ...rules,
      $: [nonBreaking, breaking, unclassified],
    }),
    '/properties': {
      '/*': ({ key }) => {
        if (!isString(key)) {
          return undefined
        }
        return ({
          ...rules,
          $: propertyClassifyRule,
          description: diffDescription(resolveSchemaDescriptionTemplates(`property '${key.toString()}'`)),
        })
      },
    },
    '/additionalProperties': () => ({
      ...rules,
      $: additionalPropertiesClassifier,
    }),
    '/patternProperties': {
      '/*': () => ({
        ...rules,
        $: [breaking, nonBreaking, unclassified],
      }),
    },
    '/propertyNames': () => ({ ...rules, $: onlyAddBreaking }),
    // TODO "/dependencies": {},
    '/definitions': {
      '/*': () => ({
        ...rules,
        $: allNonBreaking,
      }),
    },
    '/$defs': {
      '/*': () => ({
        ...rules,
        $: allNonBreaking,
      }),
    },

    //TODO NOT BY SPECIFICATION. ONLY IN 06 VERSION. NC SPECIFIC EXCLUSION
    '/examples': {
      $: allAnnotation,
      '/*': { $: allAnnotation },
    },

    // unknown tags
    '/**': {
      $: allUnclassified,
    },
    ...additionalRules,
  }
  return rules
}

const additionalPropertiesClassifier: ClassifyRule = [
  breaking,
  breaking,
  (ctx) => breakingIf(!!ctx.before.value),
  breaking,
  breaking,
  (ctx) => breakingIf(!!ctx.after.value),
]

export const resolveSchemaDescriptionTemplates = (details: string = `{{${TEMPLATE_PARAM_PROPERTY_NAME}}}`): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] schema {{${TEMPLATE_PARAM_PLACE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] schema in {{${TEMPLATE_PARAM_SCOPE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} schema in {{${TEMPLATE_PARAM_SCOPE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} schema {{${TEMPLATE_PARAM_PLACE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_SCHEMA_PATH}}}' in {{${TEMPLATE_PARAM_SCOPE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_SCHEMA_PATH}}}' {{${TEMPLATE_PARAM_PLACE}}}`,
])

import { GRAPH_API_PROPERTY_DEFAULT, GRAPH_API_PROPERTY_NULLABLE, GRAPH_API_PROPERTY_TITLE, GRAPH_API_PROPERTY_LOCATIONS, GRAPH_API_PROPERTY_DEFINITION } from '@netcracker/qubership-apihub-api-unifier'
import {
  addNonBreaking,
  allAnnotation,
  allBreaking,
  allUnclassified,
  breaking,
  breakingIf,
  diffDescription,
  nonBreaking,
  PARENT_JUMP,
  strictResolveValueFromContext,
  unclassified,
  customUniqueItemsArrayMappingResolver,
  deprecated,
  annotation,
  optionalResolveValueFromContext,
  deepEqualsUniqueItemsArrayMappingResolver
} from '../core'
import { resolveSchemaDescriptionTemplates } from '../jsonSchema'
import type { ClassifyRule, CompareRules, DescriptionTemplates, MappingResolver } from '../types'
import { graphApiSchemaAdapter as graphApiTypeAdapter, removeNotCorrectlySupportedInterfacesAdapter } from './graphapi.adapter'
import { COMPARE_SCOPE_COMPONENTS, COMPARE_SCOPE_DIRECTIVE_USAGES, COMPARE_SCOPE_ARGS, COMPARE_SCOPE_OUTPUT } from './graphapi.const'
import { complexTypeCompareResolver } from './graphapi.resolver'
import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { BUILT_IN_DIRECTIVE_DEPRECATED, BUILT_IN_DIRECTIVE_SPECIFIED_BY } from '@netcracker/qubership-apihub-graphapi'
import { isRuntimeDirectiveLocations } from './graphapi.utils'

const titleBaseUniqueItemsArrayMappingResolver: MappingResolver<number> = customUniqueItemsArrayMappingResolver((one, another) =>
  isObject(one) &&
  isObject(another) &&
  GRAPH_API_PROPERTY_TITLE in one &&
  GRAPH_API_PROPERTY_TITLE in another &&
  one[GRAPH_API_PROPERTY_TITLE] === another[GRAPH_API_PROPERTY_TITLE]
)

const nullableClassifier: ClassifyRule = [
  unclassified,
  unclassified,
  ({ after, scope }) => {
    const changedNullabilityValue = !!after.value
    const willHaveDefault = strictResolveValueFromContext(after, PARENT_JUMP, GRAPH_API_PROPERTY_DEFAULT) !== undefined
    if (changedNullabilityValue)/*optional*/ {
      switch (scope) {
        case COMPARE_SCOPE_OUTPUT:
          return breaking // field in output become optional
        case COMPARE_SCOPE_ARGS:
          return nonBreaking // arg become optional but if default was added this is not breaking
      }
    } else/*required*/ {
      switch (scope) {
        case COMPARE_SCOPE_OUTPUT:
          return nonBreaking // field in output become required
        case COMPARE_SCOPE_ARGS:
          return breakingIf(!willHaveDefault)
      }
    }
    return unclassified
  },
]
const defaultClassifier: ClassifyRule = [
  ({ before, after }) => {
    const possibleDirectiveLocations = optionalResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, PARENT_JUMP, GRAPH_API_PROPERTY_LOCATIONS)
    const argumentWasOptional = !!strictResolveValueFromContext(before, PARENT_JUMP, GRAPH_API_PROPERTY_NULLABLE)
    if (possibleDirectiveLocations) {
      if (isRuntimeDirectiveLocations(possibleDirectiveLocations)) {
        return argumentWasOptional ? unclassified : nonBreaking
      }
      else {
        return nonBreaking
      }
    } else {
      return breakingIf(argumentWasOptional)
    }
  },
  ({ before, after }) => {
    const possibleDirectiveLocations = optionalResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, PARENT_JUMP, GRAPH_API_PROPERTY_LOCATIONS)
    const argumentWasOptional = !!strictResolveValueFromContext(before, PARENT_JUMP, GRAPH_API_PROPERTY_NULLABLE)
    if (possibleDirectiveLocations) {
      if (isRuntimeDirectiveLocations(possibleDirectiveLocations)) {
        return argumentWasOptional ? unclassified : nonBreaking
      }
      else {
        return nonBreaking
      }
    } else {
      return breakingIf(argumentWasOptional)
    }
  },
  ({ before, after }) => {
    {
      const possibleDirectiveLocations = optionalResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, PARENT_JUMP, GRAPH_API_PROPERTY_LOCATIONS)
      const argumentWasOptional = !!strictResolveValueFromContext(before, PARENT_JUMP, GRAPH_API_PROPERTY_NULLABLE)
      if (possibleDirectiveLocations) {
        if (isRuntimeDirectiveLocations(possibleDirectiveLocations)) {
          return argumentWasOptional ? unclassified : nonBreaking
        }
        else {
          return nonBreaking
        }
      } else {
        return breakingIf(argumentWasOptional)
      }
    }
  }
]

const directiveUsageClassifier: ClassifyRule = [
  ({ mergeKey }) => {
    if (mergeKey === BUILT_IN_DIRECTIVE_DEPRECATED) {
      return deprecated
    }
    if (mergeKey === BUILT_IN_DIRECTIVE_SPECIFIED_BY) {
      return annotation
    }
    return unclassified
  },
  ({ mergeKey }) => {
    if (mergeKey === BUILT_IN_DIRECTIVE_DEPRECATED) {
      return deprecated
    }
    if (mergeKey === BUILT_IN_DIRECTIVE_SPECIFIED_BY) {
      return annotation
    }
    return unclassified
  },
  unclassified,
]

const directiveMetaClassifier: ClassifyRule = [
  ({ after }) => {
    const directiveLocations = strictResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, GRAPH_API_PROPERTY_DEFINITION, GRAPH_API_PROPERTY_LOCATIONS)
    if (isRuntimeDirectiveLocations(directiveLocations)) {
      return unclassified
    }
    return annotation
  },
  ({ before }) => {
    const directiveLocations = strictResolveValueFromContext(before, PARENT_JUMP, PARENT_JUMP, GRAPH_API_PROPERTY_DEFINITION, GRAPH_API_PROPERTY_LOCATIONS)
    if (isRuntimeDirectiveLocations(directiveLocations)) {
      return unclassified
    }
    return annotation
  },
  ({ after, before }) => {
    const oldDirectiveLocations = strictResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, GRAPH_API_PROPERTY_DEFINITION, GRAPH_API_PROPERTY_LOCATIONS)
    const newDirectiveLocations = strictResolveValueFromContext(before, PARENT_JUMP, PARENT_JUMP, GRAPH_API_PROPERTY_DEFINITION, GRAPH_API_PROPERTY_LOCATIONS)
    if (isRuntimeDirectiveLocations(oldDirectiveLocations) || isRuntimeDirectiveLocations(newDirectiveLocations)) {
      return unclassified
    }
    return annotation
  },
]

const directiveDefinitionClassifier: ClassifyRule = [
  nonBreaking,
  ({ before }) => {
    const directiveLocations = strictResolveValueFromContext(before, GRAPH_API_PROPERTY_LOCATIONS)
    if (isRuntimeDirectiveLocations(directiveLocations)) {
      return breaking
    }
    return nonBreaking
  },
  unclassified,
]

const directiveArgumentsClassifier: ClassifyRule = [
  ({ after }) => {
    const isRuntimeDirective = isRuntimeDirectiveLocations(strictResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, GRAPH_API_PROPERTY_LOCATIONS))
    if (isRuntimeDirective) {
      const argumentWillOptional = !!strictResolveValueFromContext(after, GRAPH_API_PROPERTY_NULLABLE)
      return !argumentWillOptional ? breaking : unclassified
    }
    return nonBreaking
  },
  ({ before }) => {
    const isRuntimeDirective = isRuntimeDirectiveLocations(strictResolveValueFromContext(before, PARENT_JUMP, PARENT_JUMP, GRAPH_API_PROPERTY_LOCATIONS))
    return isRuntimeDirective ? breaking : nonBreaking
  },
  unclassified,
]

const directiveLocationClassifier: ClassifyRule = [
  ({ before, after }) => {
    const wasRuntime = isRuntimeDirectiveLocations(strictResolveValueFromContext(before, PARENT_JUMP))
    const willRuntime = isRuntimeDirectiveLocations(strictResolveValueFromContext(after, PARENT_JUMP))
    return wasRuntime !== willRuntime ?  unclassified : nonBreaking
  },
  ({ before, after }) => {
    const wasRuntime = isRuntimeDirectiveLocations(strictResolveValueFromContext(before, PARENT_JUMP))
    const willRuntime = isRuntimeDirectiveLocations(strictResolveValueFromContext(after, PARENT_JUMP))
    return !wasRuntime && !willRuntime ? nonBreaking : breaking
  },
  unclassified,
]

function simpleRule(classify: ClassifyRule, descriptionTemplate: DescriptionTemplates) {
  return {
    $: classify,
    description: diffDescription(descriptionTemplate)
  }
}

const directivesUsagesRules: CompareRules = {
  '/directives': {
    '/*': {
      '/definition': () => directiveDefinitionRules, //shold make all unclasified
      '/meta': {
        '/*': { $: directiveMetaClassifier },
      },
      $: directiveUsageClassifier,
    },
    newCompareScope: COMPARE_SCOPE_DIRECTIVE_USAGES
  },
}

const baseRules: CompareRules = {
  '/description': simpleRule(allAnnotation, resolveSchemaDescriptionTemplates('description')),
  ...directivesUsagesRules,
}

const selfNamedBaseRules: CompareRules = {
  ...baseRules,
  '/title': simpleRule(allUnclassified, resolveSchemaDescriptionTemplates('title')),
}

const directiveDefinitionRules: CompareRules = {
  ...selfNamedBaseRules,
  '/args': {
    '/*': () => ({
      ...typeUsageRules,
      $: directiveArgumentsClassifier
    }), //only scalar, input, enum, and array with it ,
  },
  '/repeatable': simpleRule(allUnclassified, resolveSchemaDescriptionTemplates('repeatable')),
  '/locations': {
    '/*': () => ({
      $: directiveLocationClassifier,
      ignoreKeyDifference: true
    }),
    mapping: deepEqualsUniqueItemsArrayMappingResolver,
  },
}

const typeDefinitionRules: CompareRules = {
  ...selfNamedBaseRules,
  '/type': {
    // '/kind': // checked inside complexTypeCompareResolver
    compare: complexTypeCompareResolver,
    $: allBreaking, //todo support Float->Int changes and compatible interfaces
    //enum
    '/values': {
      '/*': {
        ...baseRules,
        $: [
          ({ scope }) => breakingIf(scope === COMPARE_SCOPE_OUTPUT),
          ({ scope }) => breakingIf(scope === COMPARE_SCOPE_ARGS),
          unclassified
        ]
      },
    },
    //input
    '/properties': {
      '/*': () => ({
        ...typeUsageRules,
        $: [
          ({ after }) => breakingIf(isObject(after.value) && GRAPH_API_PROPERTY_NULLABLE in after.value && !after.value?.[GRAPH_API_PROPERTY_NULLABLE]),
          breaking,
          unclassified
        ]
      }),  //only scalar, input, enum, and array with it 
    },
    //interface object
    '/methods': {
      '/*': () => ({
        ...methodRules,
        $: [nonBreaking, breaking, unclassified]
      }),
    },
    '/interfaces': {
      '/*': () => typeDefinitionRules,
      // crop to empty array for this parameter cause there are no design for comparing interfaces
      adapter: [removeNotCorrectlySupportedInterfacesAdapter]
    },
    //union
    '/oneOf': {
      '/*': () => ({
        ...typeDefinitionRules,
        $: [breaking, breaking, unclassified],
        ignoreKeyDifference: true
      }),
      mapping: titleBaseUniqueItemsArrayMappingResolver,
    },
    //array
    '/items': () => typeUsageRules,
  },
  adapter: [graphApiTypeAdapter]
}

const typeUsageRules: CompareRules = {
  ...baseRules,
  '/default': {
    $: defaultClassifier,
    '/**': {
      $: allUnclassified //todo need samples in compatibility suites
    },
  },
  '/nullable': {
    $: nullableClassifier
  },
  '/typeDef': typeDefinitionRules,
}
const methodRules: CompareRules = {
  ...baseRules,
  '/args': {
    '/*': {
      ...typeUsageRules,
      $: [
        ({ after }) => breakingIf(isObject(after.value) && GRAPH_API_PROPERTY_NULLABLE in after.value && !after.value?.[GRAPH_API_PROPERTY_NULLABLE]),
        breaking,
        breaking
      ]
    }, //only scalar, input, enum, and array with it
    newCompareScope: COMPARE_SCOPE_ARGS,
  },
  '/output': {
    ...typeUsageRules,
    newCompareScope: COMPARE_SCOPE_OUTPUT,
  },
}

export const graphApiRules = (): CompareRules => {
  return {
    '/graphapi': { $: allAnnotation },
    '/queries': {
      '/*': {
        ...methodRules,
        $: addNonBreaking
      },
    },
    '/mutations': {
      '/*': {
        ...methodRules,
        $: addNonBreaking
      },
    },
    '/subscriptions': {
      '/*': {
        ...methodRules,
        $: addNonBreaking
      }
    },
    '/components': {
      '/scalars': {
        '/*': {
          ...typeDefinitionRules,
          $: addNonBreaking
        },
      },
      '/objects': {
        '/*': {
          ...typeDefinitionRules,
          $: addNonBreaking
        },
      },
      '/interfaces': {
        '/*': {
          ...typeDefinitionRules,
          $: addNonBreaking
        },
      },
      '/inputObjects': {
        '/*': {
          ...typeDefinitionRules,
          $: addNonBreaking
        },
      },
      '/directives': {
        '/*': {
          ...directiveDefinitionRules,
          $: directiveDefinitionClassifier
        },
      },
      '/unions': {
        '/*': {
          ...typeDefinitionRules,
          $: addNonBreaking
        },
      },
      '/enums': {
        '/*': {
          ...typeDefinitionRules,
          $: addNonBreaking
        },
      },
      newCompareScope: COMPARE_SCOPE_COMPONENTS,
    },
  }
}

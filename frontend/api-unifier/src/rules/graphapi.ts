import { CrawlRulesContext } from '@netcracker/qubership-apihub-json-crawl'
import { type NormalizationRules } from '../types'
import { valueDefaults } from '../unifies/defaults'
import { directiveMetaUnification } from '../unifies/directives'
import { deepEqualsMatcher, ReplaceMapping, valueReplaces } from '../unifies/replaces'
import {
  checkContains,
  checkType,
  TYPE_ARRAY,
  TYPE_BOOLEAN,
  TYPE_JSON_ANY,
  TYPE_OBJECT,
  TYPE_STRING
} from '../validate/checker'
import {
  GRAPH_API_DIRECTIVE_LOCATIONS,
  GRAPH_API_NODE_KIND_BOOLEAN,
  GRAPH_API_NODE_KIND_ENUM,
  GRAPH_API_NODE_KIND_FLOAT,
  GRAPH_API_NODE_KIND_ID,
  GRAPH_API_NODE_KIND_INPUT_OBJECT,
  GRAPH_API_NODE_KIND_INTEGER,
  GRAPH_API_NODE_KIND_INTERFACE,
  GRAPH_API_NODE_KIND_LIST,
  GRAPH_API_NODE_KIND_OBJECT,
  GRAPH_API_NODE_KIND_SCALAR,
  GRAPH_API_NODE_KIND_STRING,
  GRAPH_API_NODE_KIND_UNION
} from '@netcracker/qubership-apihub-graphapi'
import { resolveValueByPath } from '../utils'
import {
  GRAPH_API_PROPERTY_ARGS,
  GRAPH_API_PROPERTY_COMPONENTS,
  GRAPH_API_PROPERTY_DIRECTIVES,
  GRAPH_API_PROPERTY_ENUMS,
  GRAPH_API_PROPERTY_INPUT_OBJECTS,
  GRAPH_API_PROPERTY_INTERFACES,
  GRAPH_API_PROPERTY_KIND,
  GRAPH_API_PROPERTY_LOCATIONS,
  GRAPH_API_PROPERTY_META,
  GRAPH_API_PROPERTY_METHODS,
  GRAPH_API_PROPERTY_MUTATIONS,
  GRAPH_API_PROPERTY_NULLABLE,
  GRAPH_API_PROPERTY_OBJECTS,
  GRAPH_API_PROPERTY_ONE_OF,
  GRAPH_API_PROPERTY_PROPERTIES,
  GRAPH_API_PROPERTY_QUERIES,
  GRAPH_API_PROPERTY_REPEATABLE,
  GRAPH_API_PROPERTY_SCALARS,
  GRAPH_API_PROPERTY_SUBSCRIPTIONS,
  GRAPH_API_PROPERTY_TYPE,
  GRAPH_API_PROPERTY_UNIONS,
  GRAPH_API_PROPERTY_VALUES
} from './graphapi.const'
import { GRAPH_API_DEPRECATION_PREDICATE } from './graphapi.deprecated'

const EMPTY_MARKER = Symbol('empty-items')

const GRAPH_API_DEFAULTS = {
  [GRAPH_API_PROPERTY_COMPONENTS]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_QUERIES]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_MUTATIONS]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_SUBSCRIPTIONS]: EMPTY_MARKER,
}
const COMPONENTS_DEFAULTS = {
  [GRAPH_API_PROPERTY_SCALARS]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_OBJECTS]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_INTERFACES]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_INPUT_OBJECTS]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_DIRECTIVES]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_UNIONS]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_ENUMS]: EMPTY_MARKER,
}
const METHOD_DEFAULTS = {
  [GRAPH_API_PROPERTY_ARGS]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_DIRECTIVES]: EMPTY_MARKER,
}
const DIRECTIVE_DEFINITION_DEFAULTS = {
  [GRAPH_API_PROPERTY_ARGS]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_LOCATIONS]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_REPEATABLE]: false,
  [GRAPH_API_PROPERTY_DIRECTIVES]: EMPTY_MARKER,
}
const DIRECTIVE_USAGE_DEFAULTS = {
  [GRAPH_API_PROPERTY_META]: EMPTY_MARKER,
}
const ENUM_VALUE_DEFAULTS = {
  [GRAPH_API_PROPERTY_DIRECTIVES]: EMPTY_MARKER,
}
const TYPE_USAGE_DEFAULTS = {
  [GRAPH_API_PROPERTY_NULLABLE]: true,
  [GRAPH_API_PROPERTY_DIRECTIVES]: EMPTY_MARKER,
}
const SCALAR_DEFINITION_DEFAULTS = {
}
const ENUM_DEFINITION_DEFAULTS = {
  [GRAPH_API_PROPERTY_VALUES]: EMPTY_MARKER,
}
const INPUT_OBJECT_DEFINITION_DEFAULTS = {
  [GRAPH_API_PROPERTY_PROPERTIES]: EMPTY_MARKER,
}
const INTERFACE_DEFINITION_DEFAULTS = {
  [GRAPH_API_PROPERTY_INTERFACES]: EMPTY_MARKER,
  [GRAPH_API_PROPERTY_METHODS]: EMPTY_MARKER,
}
const UNION_DEFINITION_DEFAULTS = {
  [GRAPH_API_PROPERTY_ONE_OF]: EMPTY_MARKER,
}
const LIST_DEFINITION_DEFAULTS = {
}
const DIRECTIVE_HOLDER_DEFAULTS = {
  [GRAPH_API_PROPERTY_DIRECTIVES]: EMPTY_MARKER,
}

const TO_EMPTY_ARRAY_MAPPING = {
  mapping: new Map([[EMPTY_MARKER, {
    value: () => [],
    reverseMatcher: deepEqualsMatcher([]),
  }]])
}

const TO_EMPTY_OBJECT_MAPPING = {
  mapping: new Map([[EMPTY_MARKER, {
    value: () => ({}),
    reverseMatcher: deepEqualsMatcher({}),
  }]])
}

const GRAPH_API_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_COMPONENTS]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_QUERIES]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_MUTATIONS]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_SUBSCRIPTIONS]: TO_EMPTY_OBJECT_MAPPING,
}
const COMPONENTS_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_SCALARS]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_OBJECTS]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_INTERFACES]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_INPUT_OBJECTS]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_DIRECTIVES]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_UNIONS]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_ENUMS]: TO_EMPTY_OBJECT_MAPPING,
}
const METHOD_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_ARGS]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_DIRECTIVES]: TO_EMPTY_OBJECT_MAPPING,
}
const DIRECTIVE_DEFINITION_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_ARGS]: TO_EMPTY_OBJECT_MAPPING,
  [GRAPH_API_PROPERTY_LOCATIONS]: TO_EMPTY_ARRAY_MAPPING,
  [GRAPH_API_PROPERTY_DIRECTIVES]: TO_EMPTY_OBJECT_MAPPING,
}
const DIRECTIVE_USAGE_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_META]: TO_EMPTY_OBJECT_MAPPING,
}
const ENUM_VALUE_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_DIRECTIVES]: TO_EMPTY_OBJECT_MAPPING,
}
const TYPE_USAGE_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_DIRECTIVES]: TO_EMPTY_OBJECT_MAPPING,
}
const SCALAR_DEFINITION_REPLACES: Record<string, ReplaceMapping> = {
}
const ENUM_DEFINITION_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_VALUES]: TO_EMPTY_OBJECT_MAPPING,
}
const INPUT_OBJECT_DEFINITION_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_PROPERTIES]: TO_EMPTY_OBJECT_MAPPING,
}
const INTERFACE_DEFINITION_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_INTERFACES]: TO_EMPTY_ARRAY_MAPPING,
  [GRAPH_API_PROPERTY_METHODS]: TO_EMPTY_OBJECT_MAPPING,
}
const UNION_DEFINITION_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_ONE_OF]: TO_EMPTY_ARRAY_MAPPING,
}
const LIST_DEFINITION_REPLACES: Record<string, ReplaceMapping> = {
}
const DIRECTIVE_HOLDER_REPLACES: Record<string, ReplaceMapping> = {
  [GRAPH_API_PROPERTY_DIRECTIVES]: TO_EMPTY_OBJECT_MAPPING,
}

const directivesUsagesRules: NormalizationRules = {
  '/directives': {
    deprecation: {
      deprecationResolver: ctx => GRAPH_API_DEPRECATION_PREDICATE(ctx),
      descriptionCalculator: () => '[Deprecated]',
    },
    '/*': {
      '/definition': () => directiveDefinitionRules,
      '/meta': {
        '/*': { validate: checkType(...TYPE_JSON_ANY) },
        validate: checkType(TYPE_OBJECT),
      },
      unify: [
        valueDefaults(DIRECTIVE_USAGE_DEFAULTS),
        valueReplaces(DIRECTIVE_USAGE_REPLACES),
        directiveMetaUnification,
      ],
    },
    validate: checkType(TYPE_OBJECT),
  },
  unify: [
    valueDefaults(DIRECTIVE_HOLDER_DEFAULTS),
    valueReplaces(DIRECTIVE_HOLDER_REPLACES)
  ],
}

const baseRules: NormalizationRules = {
  '/description': {
    validate: checkType(TYPE_STRING)
  },
  ...directivesUsagesRules,
}

const selfNamedBaseRules: NormalizationRules = {
  ...baseRules,
  '/title': {
    validate: checkType(TYPE_STRING)
  },
}

const directiveDefinitionRules: NormalizationRules = {
  ...selfNamedBaseRules,
  '/args': {
    '/*': () => typeUsageRules, //only scalar, input, enum, and array with it
    validate: checkType(TYPE_OBJECT),
  },
  '/repeatable': { validate: checkType(TYPE_BOOLEAN) },
  '/locations': {
    '/*': { validate: [checkType(TYPE_STRING), checkContains(...GRAPH_API_DIRECTIVE_LOCATIONS)] },
    validate: checkType(TYPE_ARRAY),
  },
  validate: checkType(TYPE_OBJECT),
  unify: [
    valueDefaults(DIRECTIVE_DEFINITION_DEFAULTS),
    valueReplaces(DIRECTIVE_DEFINITION_REPLACES)
  ]
}

const typeDefinitionRules: (ctx: CrawlRulesContext) => NormalizationRules = ({ value }) => {
  const kind = resolveValueByPath(value, [GRAPH_API_PROPERTY_TYPE, GRAPH_API_PROPERTY_KIND]) as string | undefined
  switch (kind) {
    case GRAPH_API_NODE_KIND_ID:
    case GRAPH_API_NODE_KIND_STRING:
    case GRAPH_API_NODE_KIND_INTEGER:
    case GRAPH_API_NODE_KIND_FLOAT:
    case GRAPH_API_NODE_KIND_BOOLEAN:
    case GRAPH_API_NODE_KIND_SCALAR:
      return scalarDefinitionRules
    case GRAPH_API_NODE_KIND_OBJECT:
    case GRAPH_API_NODE_KIND_INTERFACE:
      return interfaceDefinitionRules
    case GRAPH_API_NODE_KIND_ENUM:
      return enumDefinitionRules
    case GRAPH_API_NODE_KIND_INPUT_OBJECT:
      return inputObjectDefinitionRules
    case GRAPH_API_NODE_KIND_UNION:
      return unionDefinitionRules
    case GRAPH_API_NODE_KIND_LIST:
      return listDefinitionRules
    default:
      return { validate: () => false }
  }
}

const typeUsageRules: NormalizationRules = {
  ...baseRules,
  '/default': {
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
    validate: checkType(...TYPE_JSON_ANY),
  },
  '/nullable': { validate: checkType(TYPE_BOOLEAN) },
  '/typeDef': typeDefinitionRules,
  unify: [
    valueDefaults(TYPE_USAGE_DEFAULTS),
    valueReplaces(TYPE_USAGE_REPLACES)
  ],
}

const methodRules: NormalizationRules = {
  ...baseRules,
  '/args': {
    '/*': typeUsageRules, //only scalar, input, enum, and array with it
    validate: checkType(TYPE_OBJECT),
  },
  '/output': () => typeUsageRules,
  unify: [
    valueDefaults(METHOD_DEFAULTS),
    valueReplaces(METHOD_REPLACES)
  ],
}

const scalarDefinitionRules: NormalizationRules = {
  ...selfNamedBaseRules,
  '/type': {
    '/kind': {
      validate: [checkType(TYPE_STRING), checkContains(GRAPH_API_NODE_KIND_ID, GRAPH_API_NODE_KIND_STRING, GRAPH_API_NODE_KIND_INTEGER, GRAPH_API_NODE_KIND_FLOAT, GRAPH_API_NODE_KIND_BOOLEAN, GRAPH_API_NODE_KIND_SCALAR)],
    },
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(SCALAR_DEFINITION_DEFAULTS),
      valueReplaces(SCALAR_DEFINITION_REPLACES)
    ],
  },
}

const enumDefinitionRules: NormalizationRules = {
  ...selfNamedBaseRules,
  '/type': {
    '/kind': {
      validate: [checkType(TYPE_STRING), checkContains(GRAPH_API_NODE_KIND_ENUM)],
    },
    '/values': {
      '/*': {
        ...baseRules,
        unify: [
          valueDefaults(ENUM_VALUE_DEFAULTS),
          valueReplaces(ENUM_VALUE_REPLACES)
        ],
        validate: checkType(TYPE_OBJECT),
      },
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(ENUM_DEFINITION_DEFAULTS),
      valueReplaces(ENUM_DEFINITION_REPLACES)
    ],
  },
}

const inputObjectDefinitionRules: NormalizationRules = {
  ...selfNamedBaseRules,
  '/type': {
    '/kind': {
      validate: [checkType(TYPE_STRING), checkContains(GRAPH_API_NODE_KIND_INPUT_OBJECT)],
    },
    '/properties': {
      '/*': typeUsageRules,  //only scalar, input, enum, and array with it
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(INPUT_OBJECT_DEFINITION_DEFAULTS),
      valueReplaces(INPUT_OBJECT_DEFINITION_REPLACES)
    ],
  },
}

const interfaceDefinitionRules: NormalizationRules = {
  ...selfNamedBaseRules,
  '/type': {
    '/kind': {
      validate: [checkType(TYPE_STRING), checkContains(GRAPH_API_NODE_KIND_INTERFACE, GRAPH_API_NODE_KIND_OBJECT)],
    },
    '/methods': {
      '/*': methodRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/interfaces': {
      '/*': () => interfaceDefinitionRules,
      validate: checkType(TYPE_ARRAY),
    },
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(INTERFACE_DEFINITION_DEFAULTS),
      valueReplaces(INTERFACE_DEFINITION_REPLACES)
    ],
  },
}

const unionDefinitionRules: NormalizationRules = {
  ...selfNamedBaseRules,
  '/type': {
    '/kind': {
      validate: [checkType(TYPE_STRING), checkContains(GRAPH_API_NODE_KIND_UNION)],
    },
    '/oneOf': {
      '/*': typeDefinitionRules,
      validate: checkType(TYPE_ARRAY),
    },
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(UNION_DEFINITION_DEFAULTS),
      valueReplaces(UNION_DEFINITION_REPLACES)
    ],
  },
}

const listDefinitionRules: NormalizationRules = {
  ...selfNamedBaseRules,
  '/type': {
    '/kind': {
      validate: [checkType(TYPE_STRING), checkContains(GRAPH_API_NODE_KIND_LIST)],
    },
    '/items': typeUsageRules,
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(LIST_DEFINITION_DEFAULTS),
      valueReplaces(LIST_DEFINITION_REPLACES)
    ],
  },
}

export const graphApiRules: () => NormalizationRules = () => ({
  '/graphapi': { validate: checkType(TYPE_STRING) },
  '/queries': {
    '/*': methodRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/mutations': {
    '/*': methodRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/subscriptions': {
    '/*': methodRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/components': {
    '/scalars': {
      '/*': scalarDefinitionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/objects': {
      '/*': interfaceDefinitionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/interfaces': {
      '/*': interfaceDefinitionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/inputObjects': {
      '/*': inputObjectDefinitionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/directives': {
      '/*': directiveDefinitionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/unions': {
      '/*': unionDefinitionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/enums': {
      '/*': enumDefinitionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(COMPONENTS_DEFAULTS),
      valueReplaces(COMPONENTS_REPLACES)
    ],
  },
  unify: [
    valueDefaults(GRAPH_API_DEFAULTS),
    valueReplaces(GRAPH_API_REPLACES)
  ],
})

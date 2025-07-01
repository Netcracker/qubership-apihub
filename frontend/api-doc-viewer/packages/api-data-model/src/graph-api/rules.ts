import { CrawlRules } from '@netcracker/qubership-apihub-json-crawl'

import { graphApiNodeKind, graphSchemaNodeKind } from './constants'
import type { GraphApiCrawlRule, GraphApiNodeKind, GraphSchemaNodeKind } from './tree/types'

const graphApiArgsRules: CrawlRules<GraphApiCrawlRule> = {
  '/*': () => graphApiSchemaWithDirectivesRules(graphSchemaNodeKind.arg),
  kind: graphSchemaNodeKind.args,
}

const rulesForDirectiveUsages = {
  '/directives': {
    '/*': {
      '/definition': {
        '/args': graphApiArgsRules,
      },
      kind: graphSchemaNodeKind.directiveUsage
    },
    kind: graphSchemaNodeKind.usedDirectives,
  },
}

function graphApiSchemaRules(kind: GraphSchemaNodeKind = graphSchemaNodeKind.root): CrawlRules<GraphApiCrawlRule> {
  return {
    '/typeDef': () => graphApiTypeDefRules(),
    kind,
  }
}

function graphApiSchemaWithDirectivesRules(kind: GraphSchemaNodeKind) {
  return {
    ...graphApiSchemaRules(kind),
    ...rulesForDirectiveUsages,
  }
}

function graphApiTypeDefRules(kind?: GraphSchemaNodeKind): CrawlRules<GraphApiCrawlRule | { kind?: GraphApiCrawlRule['kind'] }> {
  return {
    '/type': {
      '/properties': {
        '/*': () => graphApiSchemaWithDirectivesRules(graphSchemaNodeKind.property),
      },
      '/methods': {
        '/*': () => graphApiOperationRules(graphSchemaNodeKind.method),
      },
      '/values': {
        '/*': { ...rulesForDirectiveUsages }
      },
      '/items': () => graphApiSchemaRules(graphSchemaNodeKind.items),
      '/oneOf': {
        '/*': () => graphApiTypeDefRules(graphSchemaNodeKind.oneOf),
      },
    },
    kind,
  }
}

function graphApiOperationRules(kind: GraphApiNodeKind): CrawlRules<GraphApiCrawlRule> {
  return {
    '/args': graphApiArgsRules,
    '/output': () => graphApiSchemaRules(graphSchemaNodeKind.output),
    ...rulesForDirectiveUsages,
    kind,
  }
}

export const graphApiRules: CrawlRules<GraphApiCrawlRule> = {
  '/queries': {
    '/*': () => graphApiOperationRules(graphApiNodeKind.query)
  },
  '/mutations': {
    '/*': () => graphApiOperationRules(graphApiNodeKind.mutation)
  },
  '/subscriptions': {
    '/*': () => graphApiOperationRules(graphApiNodeKind.subscription)
  },
  '/components': {
    '/directives': {
      '/*': {
        '/args': graphApiArgsRules,
        kind: graphSchemaNodeKind.directive
      }
    }
  },
  kind: graphApiNodeKind.schema
}

import { ResolvedVersionDocument, ZippableDocument } from '../../types'
import { NORMALIZE_OPTIONS, ORIGINS_SYMBOL } from '../../consts'
import { NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import { DirectiveLocation } from 'graphql/language'

export const GRAPHQL_DOCUMENT_TYPE = {
  SCHEMA: 'graphql-schema',
  GRAPHAPI: 'graphapi',
  INTROSPECTION: 'introspection',
} as const

export const GRAPHQL_FILE_FORMAT = {
  YAML: 'yaml',
  JSON: 'json',
  GRAPHQL: 'graphql',
  GQL: 'gql',
} as const

export const GRAPHQL_TYPE_KEYS = ['queries', 'mutations', 'subscriptions'] as const

export const GRAPHQL_TYPE = {
  'queries': 'query',
  'mutations': 'mutation',
  'subscriptions': 'subscription',
} as const

export function isGraphqlDocument(document: ZippableDocument | ResolvedVersionDocument): boolean {
  return Object.values(GRAPHQL_DOCUMENT_TYPE).some(type => document.type === type)
}

export const GRAPHQL_EFFECTIVE_NORMALIZE_OPTIONS: NormalizeOptions = {
  ...NORMALIZE_OPTIONS,
  originsFlag: ORIGINS_SYMBOL,
}

export const RUNTIME_DIRECTIVE_LOCATIONS = new Set([
  DirectiveLocation.QUERY,
  DirectiveLocation.MUTATION,
  DirectiveLocation.SUBSCRIPTION,
  DirectiveLocation.FIELD,
  DirectiveLocation.FRAGMENT_DEFINITION,
  DirectiveLocation.FRAGMENT_SPREAD,
  DirectiveLocation.INLINE_FRAGMENT,
  DirectiveLocation.VARIABLE_DEFINITION,
])

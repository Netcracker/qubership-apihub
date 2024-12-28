import { DirectiveLocation } from 'graphql'
import type { CompareScope } from '../types'

export const COMPARE_SCOPE_OUTPUT: CompareScope = 'output'
export const COMPARE_SCOPE_ARGS: CompareScope = 'args'
export const COMPARE_SCOPE_COMPONENTS: CompareScope = 'components'
export const COMPARE_SCOPE_DIRECTIVE_USAGES: CompareScope = 'directive-usages'

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

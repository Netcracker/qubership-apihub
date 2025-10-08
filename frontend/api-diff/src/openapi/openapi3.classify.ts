import {
  annotation,
  booleanClassifier,
  breaking,
  breakingIfAfterTrue,
  nonBreaking,
  PARENT_JUMP,
  reverseClassifyRule,
  strictResolveValueFromContext,
  transformClassifyRule,
  unclassified,
} from '../core'
import { getKeyValue, isExist, isNotEmptyArray } from '../utils'
import { emptySecurity, includeSecurity } from './openapi3.utils'
import type { ClassifyRule, CompareContext } from '../types'
import { DiffType } from '../types'
import { createPathUnifier } from './openapi3.mapping'
import { OpenAPIV3 } from 'openapi-types'

export const paramClassifyRule: ClassifyRule = [
  ({ after }) => {
    if (isIgnoredHeaderParam(after.value)) {
      return unclassified
    }

    return getKeyValue(after.value, 'required') && !isExist(getKeyValue(after.value, 'schema', 'default')) ? breaking : nonBreaking
  },
  ({ before }) => {
    return isIgnoredHeaderParam(before.value) ? unclassified : breaking
  },
  unclassified,
]

const NON_BREAKING_HEADERS = ['Accept', 'Content-Type', 'Authorization', 'authorization']

const isIgnoredHeaderParam = (param: any): boolean => {
  return param.in === 'header' && NON_BREAKING_HEADERS.includes(param.name)
}

export const apihubParametersRemovalClassifyRule = (ctx: CompareContext): DiffType => {
  const { before: { value } } = ctx
  if (!Array.isArray(value)) {
    return breaking
  }

  return value.every(isIgnoredHeaderParam)
    ? nonBreaking
    : breaking
}

export const parameterExplodeClassifyRule: ClassifyRule = [
  ({ after }) => ((after.value && getKeyValue(after.parent, 'style') === 'form') || (!after.value && getKeyValue(after.parent, 'style') !== 'form') ? annotation : breaking),
  ({ before }) => ((before.value && getKeyValue(before.parent, 'style') === 'form') || (!before.value && getKeyValue(before.parent, 'style') !== 'form') ? annotation : breaking),
  breaking,
]

export const parameterAllowReservedClassifyRule: ClassifyRule = [
  ({ after }) => (['path', 'cookie', 'header'].includes(getKeyValue(after.parent, 'in') as string) ? unclassified : nonBreaking),
  ({ after }) => (['path', 'cookie', 'header'].includes(getKeyValue(after.parent, 'in') as string) ? unclassified : breaking),
  ({ after }) => {
    if (['path', 'cookie', 'header'].includes(getKeyValue(after.parent, 'in') as string)) {
      return unclassified
    }
    return after.value ? nonBreaking : breaking
  },
]

export const parameterNameClassifyRule: ClassifyRule = [
  nonBreaking,
  breaking,
  ({ before }) => (getKeyValue(before.parent, 'in') === 'path' ? annotation : breaking),
]

export const parameterRequiredClassifyRule: ClassifyRule = [
  breaking,
  nonBreaking,
  (ctx) => (getKeyValue(ctx.after.parent, 'schema', 'default') ? nonBreaking : breakingIfAfterTrue(ctx)),
]

export const apihubAllowEmptyValueParameterClassifyRule: ClassifyRule = transformClassifyRule(
  reverseClassifyRule(booleanClassifier),
  (type, { after }, action) => (
    getKeyValue(after.parent, 'in') === 'query'
      ? type
      : unclassified
  ),
)

export const paramSchemaTypeClassifyRule: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => {
    const paramValue = strictResolveValueFromContext(before, PARENT_JUMP, PARENT_JUMP)
    const paramStyle = getKeyValue(paramValue, 'style') ?? 'form'
    if (getKeyValue(paramValue, 'in') === 'query' && paramStyle === 'form') {
      return before.value === 'object' || before.value === 'array' || after.value === 'object' ? breaking : nonBreaking
    }
    return breaking
  },
]

export const globalSecurityClassifyRule: ClassifyRule = [
  ({ after }) => (!emptySecurity(after.value) ? breaking : nonBreaking),
  nonBreaking,
  ({
    after,
    before,
  }) => (includeSecurity(after.value, before.value) || emptySecurity(after.value) ? nonBreaking : breaking),
]

export const globalSecurityItemClassifyRule: ClassifyRule = [
  ({ before }) => (isNotEmptyArray(before.parent) ? nonBreaking : breaking),
  ({ after }) => (isNotEmptyArray(after.parent) ? nonBreaking : breaking),
  ({
    after,
    before,
  }) => (includeSecurity(after.parent, before.parent) || emptySecurity(after.value) ? nonBreaking : breaking),
]

export const operationSecurityClassifyRule: ClassifyRule = [
  ({
    before,
    after,
  }) => (emptySecurity(after.value) || includeSecurity(after.value, getKeyValue(before.root, 'security')) ? nonBreaking : breaking),
  ({ before, after }) => (includeSecurity(getKeyValue(after.root, 'security'), before.value) ? nonBreaking : breaking),
  ({
    before,
    after,
  }) => (includeSecurity(after.value, before.value) || emptySecurity(after.value) ? nonBreaking : breaking),
]

export const operationSecurityItemClassifyRule: ClassifyRule = [
  ({ before }) => (isNotEmptyArray(before.parent) ? nonBreaking : breaking),
  ({ after }) => (isNotEmptyArray(after.parent) ? breaking : nonBreaking),
  ({
    before,
    after,
  }) => (includeSecurity(after.parent, before.parent) || emptySecurity(after.value) ? nonBreaking : breaking),
]

export const pathChangeClassifyRule: ClassifyRule = [
  nonBreaking,
  breaking,
  ({ before, after, parentContext }) => {
    const beforePath = before.key as string
    const afterPath = after.key as string
    const beforeRootServers = (parentContext?.before.root as OpenAPIV3.Document)?.servers
    const beforePathItemServers = (before.value as OpenAPIV3.PathItemObject)?.servers

    const afterRootServers = (parentContext?.after.root as OpenAPIV3.Document)?.servers
    const afterPathItemServers = (after.value as OpenAPIV3.PathItemObject)?.servers

    const unifiedBeforePath = createPathUnifier(beforeRootServers)(beforePath, beforePathItemServers)
    const unifiedAfterPath = createPathUnifier(afterRootServers)(afterPath, afterPathItemServers)
    // If unified paths are the same, it means only parameter names changed
    return unifiedBeforePath === unifiedAfterPath ? annotation : breaking
  },
]

/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { JsonPath, syncCrawl } from '@netcracker/qubership-apihub-json-crawl'
import { OpenAPIV3 } from 'openapi-types'
import { REST_API_TYPE, REST_KIND_KEY } from './rest.consts'
import { operationRules } from './rest.rules'
import type * as TYPE from './rest.types'
import { RestOperationData } from './rest.types'
import {
  BuildConfig,
  CrawlRule,
  DeprecateItem,
  NotificationMessage,
  OperationCrawlState,
  OperationId,
  SearchScopes,
} from '../../types'
import {
  buildSearchScope,
  calculateOperationId,
  capitalize,
  extractSymbolProperty,
  getKeyValue,
  getSplittedVersionKey,
  getSymbolValueIfDefined,
  isDeprecatedOperationItem,
  isOperationDeprecated,
  isValidHttpMethod,
  normalizePath,
  rawToApiKind,
  setValueByPath,
  takeIf,
  takeIfDefined,
} from '../../utils'
import { API_KIND, INLINE_REFS_FLAG, ORIGINS_SYMBOL, VERSION_STATUS } from '../../consts'
import { getCustomTags, getOperationBasePath, resolveApiAudience } from './rest.utils'
import { DebugPerformanceContext, syncDebugPerformance } from '../../utils/logs'
import {
  calculateDeprecatedItems,
  grepValue,
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  matchPaths,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_PATHS,
  OPEN_API_PROPERTY_SCHEMAS,
  parseRef,
  pathItemToFullPath,
  PREDICATE_ANY_VALUE,
  PREDICATE_UNCLOSED_END,
  resolveOrigins,
} from '@netcracker/qubership-apihub-api-unifier'
import { calculateObjectHash } from '../../utils/hashes'
import { calculateTolerantHash } from '../../components/deprecated'
import { getValueByPath } from '../../utils/path'

export const buildRestOperation = (
  operationId: string,
  path: string,
  method: OpenAPIV3.HttpMethods,
  // TODO: move to BuildOperationContext
  document: TYPE.VersionRestDocument,
  effectiveDocument: OpenAPIV3.Document,
  refsOnlyDocument: OpenAPIV3.Document,
  basePath: string,
  notifications: NotificationMessage[],
  config: BuildConfig,
  componentsHashMap: Map<string, string>,
  debugCtx?: DebugPerformanceContext,
): TYPE.VersionRestOperation => {

  const { servers, security, components, openapi } = document.data
  const effectiveOperationObject = effectiveDocument.paths[path]![method]! as OpenAPIV3.OperationObject<TYPE.OperationExtension>
  const effectiveSingleOperationSpec = createSingleOperationSpec(effectiveDocument, path, method, openapi)
  const refsOnlySingleOperationSpec = createSingleOperationSpec(refsOnlyDocument, path, method, openapi)
  const { tags = [] } = effectiveOperationObject

  const scopes: SearchScopes = {}
  syncDebugPerformance('[SearchScopes]', () => {
    const handledObject = new Set<unknown>()
    syncCrawl<OperationCrawlState, CrawlRule>(
      effectiveOperationObject,
      ({ key, value, rules }) => {
        if (typeof key === 'symbol') {
          return { done: true }
        }
        if (handledObject.has(value)) {
          return { done: true }
        }
        handledObject.add(value)
        if (!rules) {
          return { done: true }
        }

        buildSearchScope(key, value, rules, scopes)
      },
      { rules: operationRules },
    )
  }, debugCtx)

  const deprecatedItems: DeprecateItem[] = []

  syncDebugPerformance('[DeprecatedItems]', () => {
    const foundedDeprecatedItems = calculateDeprecatedItems(effectiveSingleOperationSpec, ORIGINS_SYMBOL)

    for (const item of foundedDeprecatedItems) {
      const { description, deprecatedReason, value } = item

      const declarationJsonPaths = resolveOrigins(value, JSON_SCHEMA_PROPERTY_DEPRECATED, ORIGINS_SYMBOL)?.map(pathItemToFullPath) ?? []
      const isOperation = isOperationPaths(declarationJsonPaths)
      const [version] = getSplittedVersionKey(config.version)

      const tolerantHash = isOperation ? undefined : calculateTolerantHash(value, notifications)
      const hash = isOperation ? undefined : calculateObjectHash(value)

      deprecatedItems.push({
        declarationJsonPaths,
        description,
        ...takeIfDefined({ deprecatedInfo: deprecatedReason }),
        ...takeIf({ [isOperationDeprecated]: true }, isOperation),
        deprecatedInPreviousVersions: config.status === VERSION_STATUS.RELEASE ? [version] : [],
        ...takeIfDefined({ hash: hash }),
        ...takeIfDefined({ tolerantHash: tolerantHash }),
      })
    }
  }, debugCtx)

  const models: Record<string, string> = {}
  const apiKind = effectiveOperationObject[REST_KIND_KEY] || document.apiKind || API_KIND.BWC
  const [specWithSingleOperation] = syncDebugPerformance('[ModelsAndOperationHashing]', () => {
    const specWithSingleOperation = createSingleOperationSpec(
      document.data,
      path,
      method,
      openapi,
      servers,
      security,
      components?.securitySchemes,
    )
    calculateSpecRefs(document.data, refsOnlySingleOperationSpec, specWithSingleOperation, [operationId], models, componentsHashMap)
    return [specWithSingleOperation]
  }, debugCtx)

  const deprecatedOperationItem = deprecatedItems.find(isDeprecatedOperationItem)

  const customTags = getCustomTags(effectiveOperationObject)

  const apiAudience = resolveApiAudience(document.metadata?.info)

  return {
    operationId,
    documentId: document.slug,
    apiType: REST_API_TYPE,
    apiKind: rawToApiKind(apiKind),
    deprecated: !!effectiveOperationObject.deprecated,
    title: effectiveOperationObject.summary || operationId.split('-').map(str => capitalize(str)).join(' '),
    metadata: {
      customTags: customTags,
      path: normalizePath(basePath + path),
      originalPath: basePath + path,
      method,
    },
    tags: Array.isArray(tags) ? tags : [tags],
    data: specWithSingleOperation,
    searchScopes: scopes,
    deprecatedItems,
    models,
    ...takeIf({
      deprecatedInfo: deprecatedOperationItem?.deprecatedInfo,
      deprecatedInPreviousVersions: deprecatedOperationItem?.deprecatedInPreviousVersions,
    }, !!deprecatedOperationItem),
    apiAudience,
  }
}

export const calculateSpecRefs = (
  sourceDocument: TYPE.RestOperationData,
  normalizedSpec: TYPE.RestOperationData,
  resultSpec: TYPE.RestOperationData,
  operations: OperationId[],
  models?: Record<string, string>,
  componentsHashMap?: Map<string, string>,
): void => {
  const handledObjects = new Set<unknown>()
  const inlineRefs = new Set<string>()
  syncCrawl(
    normalizedSpec,
    ({ key, value }) => {
      if (typeof key === 'symbol' && key !== INLINE_REFS_FLAG) {
        return { done: true }
      }
      if (handledObjects.has(value)) {
        return { done: true }
      }
      handledObjects.add(value)
      if (key !== INLINE_REFS_FLAG) {
        return { value }
      }
      if (!Array.isArray(value)) {
        return { done: true }
      }
      value.forEach(ref => inlineRefs.add(ref))
    },
  )
  inlineRefs.forEach(ref => {
    const path = parseRef(ref).jsonPath
    const grepKey = 'componentName'
    const matchResult = matchPaths([path], [
      [OPEN_API_PROPERTY_COMPONENTS, PREDICATE_ANY_VALUE, grepValue(grepKey), PREDICATE_UNCLOSED_END],
    ])
    if (!matchResult) {
      return
    }
    const componentName = matchResult.grepValues[grepKey].toString()
    const component = getKeyValue(sourceDocument, ...matchResult.path) as Record<string, unknown>
    if (!component) {
      return
    }
    if (models && !models[componentName] && isComponentsSchemaRef(matchResult.path)) {
      let componentHash = componentsHashMap?.get(componentName)
      if (componentHash) {
        models[componentName] = componentHash
      } else {
        componentHash = calculateObjectHash(component)
        componentsHashMap?.set(componentName, componentHash)
        models[componentName] = componentHash
      }
    }
    setValueByPath(resultSpec, matchResult.path, component)
  })

  if (operations?.length) {
    reduceComponentPathItemsToOperations(resultSpec, normalizedSpec, operations)
  }
}

function reduceComponentPathItemsToOperations(
  resultSpec: RestOperationData,
  normalizedDocument: RestOperationData,
  operations: OperationId[],
): void {
  const { paths } = normalizedDocument

  for (const path of Object.keys(paths)) {
    const sourcePathItem = paths[path] as OpenAPIV3.PathItemObject
    const pathItemComponentJsonPath = getPathItemComponentJsonPath(sourcePathItem)
    if (!pathItemComponentJsonPath) {
      continue
    }

    const pathItemComponent = getValueByPath(resultSpec, pathItemComponentJsonPath) as OpenAPIV3.PathItemObject

    const operationIds: OpenAPIV3.HttpMethods[] = (Object.keys(pathItemComponent) as OpenAPIV3.HttpMethods[])
      .filter((httpMethod) => isValidHttpMethod(httpMethod))
      .filter(httpMethod => {
        const methodData = sourcePathItem[httpMethod as OpenAPIV3.HttpMethods]
        if (!methodData) return false
        const basePath = getOperationBasePath(
          methodData?.servers ||
          sourcePathItem?.servers ||
          [],
        )
        const operationId = calculateOperationId(basePath, httpMethod, path)
        return operations.includes(operationId)
      })

    if (operationIds?.length) {
      const pathItemObject = {
        ...extractCommonPathItemProperties(pathItemComponent),
        ...operationIds.reduce<OpenAPIV3.PathItemObject>((pathItemObject: OpenAPIV3.PathItemObject, operationId: OpenAPIV3.HttpMethods) => {
          const operationData = pathItemComponent[operationId]
          if (operationData) {
            pathItemObject[operationId] = { ...operationData }
          }
          return pathItemObject
        }, {}),
      }
      setValueByPath(resultSpec, pathItemComponentJsonPath, pathItemObject)
    }
  }
}

const getPathItemComponentJsonPath = (sourcePathItem: OpenAPIV3.PathItemObject): JsonPath | undefined => {
  const refs = getSymbolValueIfDefined(sourcePathItem, INLINE_REFS_FLAG) as string[] | undefined
  if (!refs || refs.length === 0) {
    return undefined
  }

  return parseRef(refs[0])?.jsonPath
}

export const isComponentsSchemaRef = (path: JsonPath): boolean => {
  return !!matchPaths(
    [path],
    [[OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_SCHEMAS, PREDICATE_UNCLOSED_END]],
  )
}

const isOperationPaths = (paths: JsonPath[]): boolean => {
  return !!matchPaths(
    paths,
    [[OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE]],
  )
}

// todo output of this method disrupts document normalization.
//  origin symbols are not being transferred to the resulting spec.
//  DO NOT pass output of this method to apiDiff
const createSingleOperationSpec = (
  document: OpenAPIV3.Document,
  path: string,
  method: OpenAPIV3.HttpMethods,
  openapi?: string,
  servers?: OpenAPIV3.ServerObject[],
  security?: OpenAPIV3.SecurityRequirementObject[],
  securitySchemes?: { [p: string]: OpenAPIV3.ReferenceObject | OpenAPIV3.SecuritySchemeObject },
): TYPE.RestOperationData => {
  const pathData = document.paths[path] as OpenAPIV3.PathItemObject

  const isRefPathData = !!pathData.$ref
  return {
    openapi: openapi ?? '3.0.0',
    ...takeIfDefined({ servers }),
    ...takeIfDefined({ security }), // TODO: remove duplicates in security
    paths: {
      [path]: isRefPathData
        ? pathData
        : {
          ...extractCommonPathItemProperties(pathData),
          [method]: { ...pathData[method] },
          ...extractSymbolProperty(pathData, INLINE_REFS_FLAG),
        },
    },
    components: {
      ...takeIfDefined({ securitySchemes }),
    },
  }
}

export const extractCommonPathItemProperties = (
  pathData: OpenAPIV3.PathItemObject,
): Pick<OpenAPIV3.PathItemObject, 'summary' | 'description' | 'servers' | 'parameters'> => ({
  ...takeIfDefined({ summary: pathData?.summary }),
  ...takeIfDefined({ description: pathData?.description }),
  ...takeIfDefined({ servers: pathData?.servers }),
  ...takeIfDefined({ parameters: pathData?.parameters }),
})

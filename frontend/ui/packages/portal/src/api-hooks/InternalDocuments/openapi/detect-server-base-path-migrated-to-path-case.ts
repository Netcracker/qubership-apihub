import { DIFF_META_KEY, extractOperationBasePath, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace, type Diff } from '@netcracker/qubership-apihub-api-diff'
import { calculateNormalizedRestOperationId } from '@netcracker/qubership-apihub-api-processor'
import { isObject } from '@netcracker/qubership-apihub-ui-shared/utils/objects'
import { OpenAPIV3 } from 'openapi-types'

type Result = {
  beforeFirstServerBasePath: string
  afterFirstServerBasePath: string
  beforePaths: OpenAPIV3.PathsObject
  afterPaths: OpenAPIV3.PathsObject
  beforeServers: OpenAPIV3.ServerObject[]
  afterServers: OpenAPIV3.ServerObject[]
}

export function detectServerBasePathMigratedToPath(document: OpenAPIV3.Document): Result | null {
  const { paths = {}, servers = [] } = document

  const documentWithDiffs = document as unknown as Record<PropertyKey, unknown>
  const serversWithDiffs = servers as unknown as Record<PropertyKey, unknown>
  const pathsWithDiffs = paths as unknown as Record<PropertyKey, unknown>

  function getServers(): [OpenAPIV3.ServerObject[], OpenAPIV3.ServerObject[]] {
    // Check if 'servers' section is wholly changed
    if (isObject(documentWithDiffs[DIFF_META_KEY])) {
      const diffWholeServers = documentWithDiffs[DIFF_META_KEY].servers as Diff | undefined
      if (diffWholeServers) {
        if (isDiffRemove(diffWholeServers) || isDiffReplace(diffWholeServers)) {
          return [diffWholeServers.beforeValue as OpenAPIV3.ServerObject[], []]
        }
        if (isDiffAdd(diffWholeServers)) {
          return [[], diffWholeServers.afterValue as OpenAPIV3.ServerObject[]] // if wholly added 'servers' then there wasn't such section before
        }
      }
    }
    // Check if 'servers' section is partially changed
    const beforeServers: OpenAPIV3.ServerObject[] = [...servers]
    const afterServers: OpenAPIV3.ServerObject[] = [...servers]
    if (isObject(serversWithDiffs[DIFF_META_KEY])) {
      const diffSpecificServers = serversWithDiffs[DIFF_META_KEY]
      for (const index of Object.keys(diffSpecificServers)) {
        const diffSpecificServer = diffSpecificServers[index]! as Diff
        if (isDiffRemove(diffSpecificServer) || isDiffReplace(diffSpecificServer)) {
          beforeServers.splice(Number(index), 1, diffSpecificServer.beforeValue as OpenAPIV3.ServerObject)
          afterServers.splice(Number(index), 1)
        }
        if (isDiffAdd(diffSpecificServer)) {
          beforeServers.splice(Number(index), 1)
          afterServers.splice(Number(index), 1, diffSpecificServer.afterValue as OpenAPIV3.ServerObject)
        }
      }
    }
    for (const [index, server] of servers.entries()) {
      let serverObject: Record<PropertyKey, unknown> = server as unknown as Record<PropertyKey, unknown>
      if (!isObject(serverObject[DIFF_META_KEY])) {
        continue
      }
      const diffUrl = serverObject[DIFF_META_KEY].url as Diff | undefined
      if (diffUrl && (isDiffReplace(diffUrl))) {
        serverObject = { ...serverObject, url: diffUrl.beforeValue as string }
        beforeServers.splice(index, 1, serverObject as unknown as OpenAPIV3.ServerObject)
      }
    }
    return [beforeServers, afterServers]
  }

  function getPaths(): [OpenAPIV3.PathsObject, OpenAPIV3.PathsObject] {
    let beforePaths: OpenAPIV3.PathsObject = { ...paths }
    let afterPaths: OpenAPIV3.PathsObject = { ...paths }
    const diffSpecificPaths = pathsWithDiffs[DIFF_META_KEY]
    // handle wholly changed operation path items
    if (isObject(diffSpecificPaths)) {
      for (const changedSpecificPath of Object.keys(diffSpecificPaths)) {
        const diffSpecificPath = diffSpecificPaths[changedSpecificPath]! as Diff
        if (isDiffRemove(diffSpecificPath)) {
          beforePaths[changedSpecificPath] = diffSpecificPath.beforeValue as OpenAPIV3.PathItemObject
          afterPaths = copyWithoutProperty<OpenAPIV3.PathsObject>(afterPaths, changedSpecificPath)
        }
        if (isDiffReplace(diffSpecificPath)) {
          beforePaths[changedSpecificPath] = diffSpecificPath.beforeValue as OpenAPIV3.PathItemObject
        }
        if (isDiffAdd(diffSpecificPath)) {
          beforePaths = copyWithoutProperty<OpenAPIV3.PathsObject>(beforePaths, changedSpecificPath)
        }
        if (isDiffRename(diffSpecificPath)) {
          beforePaths[diffSpecificPath.beforeKey as string] = beforePaths[diffSpecificPath.afterKey as string] as OpenAPIV3.PathItemObject
          beforePaths = copyWithoutProperty<OpenAPIV3.PathsObject>(beforePaths, diffSpecificPath.afterKey as string)
        }
      }
    }
    // handle wholly changed operation methods
    for (const [path, pathObject] of Object.entries(paths)) {
      if (!pathObject) {
        continue
      }
      const pathObjectWithDiffs = pathObject as unknown as Record<PropertyKey, unknown>
      const diffSpecificPathMethods = pathObjectWithDiffs[DIFF_META_KEY]
      if (!isObject(diffSpecificPathMethods)) {
        continue
      }
      let beforePathObject = beforePaths[path] as unknown as Record<PropertyKey, unknown> | undefined
      let afterPathObject = afterPaths[path] as unknown as Record<PropertyKey, unknown> | undefined
      if (!beforePathObject || !afterPathObject) {
        /**
         * Edge case when APIHUB Portal allowed not valid OpenAPI document when we have 2 paths different only by path parameter name.
         * For example:
         * /endpoint/{param}
         * /endpoint/{parameter}
         * In case of comparison such documents it produces abnormal diffs which break an assumption
         * that we CANNOT have diffs of methods if we have diffs of path items.
         */
        continue
      }
      for (const changedSpecificPathMethod of Object.keys(diffSpecificPathMethods)) {
        const diffSpecificPathMethod = diffSpecificPathMethods[changedSpecificPathMethod]! as Diff
        if (isDiffRemove(diffSpecificPathMethod)) {
          beforePathObject[changedSpecificPathMethod] = diffSpecificPathMethod.beforeValue as OpenAPIV3.OperationObject
          afterPathObject = copyWithoutProperty<OpenAPIV3.PathItemObject>(afterPathObject, changedSpecificPathMethod)
        }
        if (isDiffReplace(diffSpecificPathMethod)) {
          beforePathObject[changedSpecificPathMethod] = diffSpecificPathMethod.beforeValue as OpenAPIV3.OperationObject
        }
        if (isDiffAdd(diffSpecificPathMethod)) {
          beforePathObject = copyWithoutProperty<OpenAPIV3.PathItemObject>(beforePathObject, changedSpecificPathMethod)
        }
      }
    }
    return [beforePaths, afterPaths]
  }

  const [beforeServers, afterServers] = getServers()
  const beforeFirstServerBasePath = extractOperationBasePath(beforeServers)
  const afterFirstServerBasePath = extractOperationBasePath(afterServers)

  const [beforePaths, afterPaths] = getPaths()

  const aggregateBeforeOperationNormalizedIds = createAggregateOperationNormalizedIds()
  const beforeOperationNormalizedIds = aggregateBeforeOperationNormalizedIds(beforePaths, beforeFirstServerBasePath)
  const afterOperationNormalizedIds = aggregateBeforeOperationNormalizedIds(afterPaths, afterFirstServerBasePath)

  const intersectionOperationNormalizedIds = beforeOperationNormalizedIds.intersection(afterOperationNormalizedIds)

  const isServerBasePathMigrated =
    beforeFirstServerBasePath !== afterFirstServerBasePath &&
    intersectionOperationNormalizedIds.size > 0
  if (!isServerBasePathMigrated) {
    return null
  }

  return {
    beforeFirstServerBasePath: beforeFirstServerBasePath,
    afterFirstServerBasePath: afterFirstServerBasePath,
    beforePaths: beforePaths,
    afterPaths: afterPaths,
    beforeServers: beforeServers,
    afterServers: afterServers,
  }
}

function copyWithoutProperty<T extends object>(source: object, property: PropertyKey): T {
  if (!isObject(source)) {
    throw new Error('Source is not an object')
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [property]: _, ...sourceWithoutProperty } = source
  return sourceWithoutProperty as T
}

type AggregateOperationNormalizedIds = (paths: OpenAPIV3.PathsObject, firstServerBasePath: string) => Set<string>

function createAggregateOperationNormalizedIds(): AggregateOperationNormalizedIds {
  const methods = Object.values(OpenAPIV3.HttpMethods)
  return (paths: OpenAPIV3.PathsObject, firstServerBasePath: string) => {
    const operationNormalizedIds = new Set<string>()
    for (const [path, pathObject] of Object.entries(paths)) {
      for (const method of methods) {
        if (!pathObject || !(method in pathObject)) {
          continue
        }
        const normalizedOperationId = calculateNormalizedRestOperationId(firstServerBasePath, path, method)
        operationNormalizedIds.add(normalizedOperationId)
      }
    }
    return operationNormalizedIds
  }
}

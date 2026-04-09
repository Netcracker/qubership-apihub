import { ClassifierType, DiffAction, DIFF_META_KEY, extractOperationBasePath } from '@netcracker/qubership-apihub-api-diff'
import { calculateNormalizedRestOperationId } from '@netcracker/qubership-apihub-api-processor'
import { isRestOperation, type OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { isObject } from '@netcracker/qubership-apihub-ui-shared/utils/objects'
import type { OpenAPIV3 } from 'openapi-types'
import { detectServerBasePathMigratedToPath } from './detect-server-base-path-migrated-to-path-case'

type ComparedOperationNormalizedIds = {
  previousOperationNormalizedId: string
  currentOperationNormalizedId: string
}

type HandleOpenApiComparisonInternalDocumentOptions = {
  oasInternalDocument: OpenAPIV3.Document
  previousOperation: OperationData | undefined
  currentOperation: OperationData | undefined
}

type GetComparedOperationNormalizedIdsOptions = {
  previousOperationPath: string | undefined
  previousOperationMethod: string | undefined
  currentOperationPath: string | undefined
  currentOperationMethod: string | undefined
  previousBasePath: string
  currentBasePath: string
}

type CherryPickOperationOptions = {
  paths: OpenAPIV3.PathsObject
  servers: OpenAPIV3.ServerObject[]
  comparedOperationMethod: string
  oasInternalDocument: OpenAPIV3.Document
  comparedOperationNormalizedIds: ComparedOperationNormalizedIds
}

type HandleMigratedServerBasePathCaseOptions = {
  oasInternalDocument: OpenAPIV3.Document
  previousOperationPath: string | undefined
  previousOperationMethod: string | undefined
  currentOperationPath: string | undefined
  currentOperationMethod: string | undefined
  comparedOperationMethod: string
}

export function handleOpenApiComparisonInternalDocument(
  options: HandleOpenApiComparisonInternalDocumentOptions,
): OpenAPIV3.Document | undefined {
  const { oasInternalDocument, previousOperation, currentOperation } = options

  const previousOperationPath = previousOperation && isRestOperation(previousOperation) ? previousOperation.path : undefined
  const currentOperationPath = currentOperation && isRestOperation(currentOperation) ? currentOperation.path : undefined
  const pathsSet = new Set([previousOperationPath, currentOperationPath])
  if (pathsSet.size > 1) {
    console.warn('There are 2 paths. What should we do?')
  }
  const comparedOperationPath = currentOperationPath ?? previousOperationPath

  const previousOperationMethod = previousOperation && isRestOperation(previousOperation) ? previousOperation.method : undefined
  const currentOperationMethod = currentOperation && isRestOperation(currentOperation) ? currentOperation.method : undefined
  const methodsSet = new Set([previousOperationMethod, currentOperationMethod])
  if (methodsSet.size > 1) {
    console.warn('There are 2 methods. What should we do?')
  }
  const comparedOperationMethod = currentOperationMethod ?? previousOperationMethod

  if (!comparedOperationPath || !comparedOperationMethod) {
    return undefined
  }

  const fromMigratedServerBasePathCase = handleMigratedServerBasePathCase({
    oasInternalDocument: oasInternalDocument,
    previousOperationPath: previousOperationPath,
    previousOperationMethod: previousOperationMethod,
    currentOperationPath: currentOperationPath,
    currentOperationMethod: currentOperationMethod,
    comparedOperationMethod: comparedOperationMethod,
  })
  if (fromMigratedServerBasePathCase) {
    return fromMigratedServerBasePathCase
  }

  const { paths = {}, servers = [] } = oasInternalDocument
  const comparedOperationNormalizedIds = getComparedOperationNormalizedIds({
    previousOperationPath: previousOperationPath,
    previousOperationMethod: previousOperationMethod,
    currentOperationPath: currentOperationPath,
    currentOperationMethod: currentOperationMethod,
    previousBasePath: extractOperationBasePath(servers),
    currentBasePath: extractOperationBasePath(servers),
  })

  return cherryPickOperation({
    paths: paths,
    servers: servers,
    comparedOperationMethod: comparedOperationMethod,
    oasInternalDocument: oasInternalDocument,
    comparedOperationNormalizedIds: comparedOperationNormalizedIds,
  })
}

function handleMigratedServerBasePathCase(
  options: HandleMigratedServerBasePathCaseOptions,
): OpenAPIV3.Document | undefined {
  const {
    oasInternalDocument,
    previousOperationPath,
    previousOperationMethod,
    currentOperationPath,
    currentOperationMethod,
    comparedOperationMethod,
  } = options
  const trickyCaseDetection = detectServerBasePathMigratedToPath(oasInternalDocument)
  if (!trickyCaseDetection) {
    return undefined
  }

  const {
    beforeFirstServerBasePath,
    afterFirstServerBasePath,
    beforePaths,
    afterPaths,
    beforeServers,
    afterServers,
  } = trickyCaseDetection

  const clonedOasComparisonInternalDocument: OpenAPIV3.Document = {
    ...oasInternalDocument,
    paths: {},
  }

  const comparedOperationNormalizedIds = getComparedOperationNormalizedIds({
    previousOperationPath: previousOperationPath,
    previousOperationMethod: previousOperationMethod,
    currentOperationPath: currentOperationPath,
    currentOperationMethod: currentOperationMethod,
    previousBasePath: beforeFirstServerBasePath,
    currentBasePath: afterFirstServerBasePath,
  })

  // Handle operation affected by migration of server base path to path
  for (const afterPathKey of Object.keys(afterPaths)) {
    const currentOperationNormalizedIdCandidate = calculateNormalizedRestOperationId(
      afterFirstServerBasePath,
      afterPathKey,
      comparedOperationMethod,
    )
    if (currentOperationNormalizedIdCandidate !== comparedOperationNormalizedIds.currentOperationNormalizedId) {
      continue
    }
    for (const beforePathKey of Object.keys(beforePaths)) {
      const previousOperationNormalizedIdCandidate = calculateNormalizedRestOperationId(
        beforeFirstServerBasePath,
        beforePathKey,
        comparedOperationMethod,
      )
      if (previousOperationNormalizedIdCandidate !== comparedOperationNormalizedIds.previousOperationNormalizedId) {
        continue
      }
      const afterPathObject = afterPaths[afterPathKey] as Record<string, unknown> | undefined
      clonedOasComparisonInternalDocument.paths![afterPathKey] = {
        [comparedOperationMethod]: afterPathObject?.[comparedOperationMethod],
      }
      const pathsObject = clonedOasComparisonInternalDocument.paths as unknown as Record<PropertyKey, unknown>
      pathsObject[DIFF_META_KEY] = {
        [afterPathKey]: {
          action: DiffAction.rename,
          type: ClassifierType.breaking,
          beforeDeclarationPaths: [['paths', beforePathKey]],
          afterDeclarationPaths: [['paths', afterPathKey]],
          beforeKey: beforePathKey,
          afterKey: afterPathKey,
        },
      }
      return clonedOasComparisonInternalDocument
    }
  }

  // Handle operations not affected by migration of server base path to path
  const fromAfterPaths = cherryPickOperation({
    paths: afterPaths,
    servers: afterServers,
    comparedOperationMethod: comparedOperationMethod,
    oasInternalDocument: oasInternalDocument,
    comparedOperationNormalizedIds: comparedOperationNormalizedIds,
  })
  return fromAfterPaths ?? cherryPickOperation({
    paths: beforePaths,
    servers: beforeServers,
    comparedOperationMethod: comparedOperationMethod,
    oasInternalDocument: oasInternalDocument,
    comparedOperationNormalizedIds: comparedOperationNormalizedIds,
  })
}

function normalizeBasePathForComparedOperations(basePath: string): string {
  return basePath === '/' ? basePath : ''
}

function getComparedOperationNormalizedIds(
  options: GetComparedOperationNormalizedIdsOptions,
): ComparedOperationNormalizedIds {
  const {
    previousOperationPath,
    previousOperationMethod,
    currentOperationPath,
    currentOperationMethod,
    previousBasePath,
    currentBasePath,
  } = options

  return {
    previousOperationNormalizedId: previousOperationPath && previousOperationMethod
      ? calculateNormalizedRestOperationId(
        normalizeBasePathForComparedOperations(previousBasePath),
        previousOperationPath,
        previousOperationMethod,
      )
      : '',
    currentOperationNormalizedId: currentOperationPath && currentOperationMethod
      ? calculateNormalizedRestOperationId(
        normalizeBasePathForComparedOperations(currentBasePath),
        currentOperationPath,
        currentOperationMethod,
      )
      : '',
  }
}

function isMatchedComparedOperationNormalizedId(
  operationNormalizedId: string,
  comparedOperationNormalizedIds: ComparedOperationNormalizedIds,
): boolean {
  return (
    comparedOperationNormalizedIds.currentOperationNormalizedId === operationNormalizedId ||
    comparedOperationNormalizedIds.previousOperationNormalizedId === operationNormalizedId
  )
}

function findMatchedPathByNormalizedId(
  pathKeys: string[],
  serverBasePath: string,
  operationMethod: string,
  comparedOperationNormalizedIds: ComparedOperationNormalizedIds,
): string | undefined {
  for (const pathKey of pathKeys) {
    const operationNormalizedId = calculateNormalizedRestOperationId(serverBasePath, pathKey, operationMethod)
    if (isMatchedComparedOperationNormalizedId(operationNormalizedId, comparedOperationNormalizedIds)) {
      return pathKey
    }
  }
  return undefined
}

function findWhollyChangedMethodDiff(
  whollyChangedMethods: Record<string, unknown>,
  operationMethod: string,
): unknown {
  for (const whollyChangedMethod of Object.keys(whollyChangedMethods)) {
    if (whollyChangedMethod === operationMethod) {
      return whollyChangedMethods[whollyChangedMethod]
    }
  }
  return undefined
}

function cherryPickOperation(options: CherryPickOperationOptions): OpenAPIV3.Document | undefined {
  const {
    paths,
    servers,
    comparedOperationMethod,
    oasInternalDocument,
    comparedOperationNormalizedIds,
  } = options

  // In normal cases without splitting document to "before" and "after"
  const clonedOasComparisonInternalDocument: OpenAPIV3.Document = {
    ...oasInternalDocument,
    paths: {},
  }

  const firstServerBasePath = extractOperationBasePath(servers)
  const foundPath = findMatchedPathByNormalizedId(
    Object.keys(paths),
    firstServerBasePath,
    comparedOperationMethod,
    comparedOperationNormalizedIds,
  )

  if (!foundPath) {
    return undefined
  }

  const foundPathObject = paths[foundPath] as Record<string, unknown> | undefined
  clonedOasComparisonInternalDocument.paths![foundPath] = {
    [comparedOperationMethod]: foundPathObject?.[comparedOperationMethod],
  }

  // Leave only change for operation with necessary path because ASV takes first item and does not know which operation is there
  if (DIFF_META_KEY in paths && isObject(paths[DIFF_META_KEY])) {
    const whollyChangedPaths: Record<string, unknown> = paths[DIFF_META_KEY]
    const clonedWhollyChangedPaths: Record<string, unknown> = {}
    const clonedPathsWithDiffs = clonedOasComparisonInternalDocument.paths as Record<PropertyKey, unknown>
    clonedPathsWithDiffs[DIFF_META_KEY] = clonedWhollyChangedPaths
    const matchedWhollyChangedPath = findMatchedPathByNormalizedId(
      Object.keys(whollyChangedPaths),
      firstServerBasePath,
      comparedOperationMethod,
      comparedOperationNormalizedIds,
    )
    if (matchedWhollyChangedPath) {
      clonedWhollyChangedPaths[matchedWhollyChangedPath] = whollyChangedPaths[matchedWhollyChangedPath]
    }
  }

  const operationsByPath = paths[foundPath]
  if (isObject(operationsByPath) && DIFF_META_KEY in operationsByPath && isObject(operationsByPath[DIFF_META_KEY])) {
    const whollyChangedMethods: Record<string, unknown> = operationsByPath[DIFF_META_KEY]
    const foundDiff = findWhollyChangedMethodDiff(whollyChangedMethods, comparedOperationMethod)
    if (foundDiff) {
      const clonedPathsWithDiffs = clonedOasComparisonInternalDocument.paths as Record<PropertyKey, unknown>
      clonedPathsWithDiffs[DIFF_META_KEY] = {
        [foundPath]: foundDiff,
      }
    }
  }

  return clonedOasComparisonInternalDocument
}

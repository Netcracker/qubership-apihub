import { Router } from 'express'
import type { WithWebsocketMethod } from 'express-ws'
import {
  changePackageMemberRole,
  createPackage,
  deleteApiKey,
  deletePackage,
  deletePackageMember,
  deleteVersion,
  disfavorPackage,
  favorPackage,
  generateApiKey,
  getActivityHistoryByPackage,
  getAvailableRoles,
  getChangelog,
  getChangesSummary,
  getDeprecatedOperations,
  getDocument,
  getDocuments,
  getOperation,
  getOperationDeprecatedItems,
  getOperations,
  getPackage,
  getPackageActivity,
  getPackageMembers,
  getPackages,
  getPublishedSpecRaw,
  getRevisions,
  getTags,
  getTokens,
  getVersion,
  getVersionReferences,
  getVersions,
  recalculatePackageVersionGroups,
  updatePackage,
} from './packages'

export type PackagesRouter = Router & WithWebsocketMethod
export type PackageTokensRouter = Router & WithWebsocketMethod

export function PackagesRouter(): PackagesRouter {
  const router = Router() as PackagesRouter

  updatePackage(router)
  deletePackage(router)
  createPackage(router)

  getPackageActivity(router)
  deleteApiKey(router)
  getAvailableRoles(router)

  getPackageMembers(router)
  deletePackageMember(router)
  changePackageMemberRole(router)

  getVersion(router)
  getVersionReferences(router)
  getVersions(router)
  getPublishedSpecRaw(router)
  getDocument(router)
  getDocuments(router)

  getPackages(router)
  getPackage(router)

  favorPackage(router)
  disfavorPackage(router)

  getOperations(router)
  getDeprecatedOperations(router)
  getOperation(router)
  getOperationDeprecatedItems(router)
  getTags(router)

  getRevisions(router)

  getActivityHistoryByPackage(router)

  recalculatePackageVersionGroups(router)
  getChangesSummary(router)
  getChangelog(router)

  // TODO: Moved from projects. Need to investigate
  deleteVersion(router)

  return router
}

export function PackageTokensRouter(): PackageTokensRouter {
  const router = Router() as PackageTokensRouter

  getTokens(router)
  generateApiKey(router)

  return router
}

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

import { Router } from 'express'
import type { WithWebsocketMethod } from 'express-ws'
import {
  changePackageMemberRole,
  createPackage,
  deleteApiKey,
  deletePackage,
  deletePackageMember,
  deleteProject,
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
  publishProjectVersion,
  recalculatePackageVersionGroups,
  updatePackage,
  updateProject,
} from './packages'
import type { Server } from 'ws'

export type PackagesRouter = Router & WithWebsocketMethod
export type PackageTokensRouter = Router & WithWebsocketMethod

export function PackagesRouter(wss: Server): PackagesRouter {
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
  publishProjectVersion(router, wss)
  deleteProject(router)
  updateProject(router)

  return router
}

export function PackageTokensRouter(): PackageTokensRouter {
  const router = Router() as PackageTokensRouter

  getTokens(router)
  generateApiKey(router)

  return router
}

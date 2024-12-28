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

import type { Router } from 'express'
import { ACCESS_TOKENS_LIST } from '../../mocks/packages/access-tokens'
import { PACKAGE_MEMBERS, PACKAGES } from '../../mocks/packages/packages'
import { VERSIONS } from '../../mocks/projects/versions'
import { DEPRECATED_ITEMS, DEPRECATED_OPERATIONS, OPERATIONS, TAGS } from '../../mocks/packages/operations'
import { PUBLISHED_VERSION_CONTENTS } from '../../mocks/packages/version-contents'
import { VERSION_DOCUMENTS } from '../../mocks/packages/documents'
import {
  DOC_SPEC,
  GRAPHQLAPI_SPEC,
  MARKDOWN_SPEC,
  MARKDOWN_SPEC_RAW,
  OPENAPI_3_0_SPEC_RAW,
  OPENAPI_SPEC,
} from '../../mocks/packages/document-contents'
import fs from 'fs'
import path from 'path'
import type { WithWebsocketMethod } from 'express-ws'
import type { Server } from 'ws'
import type { Socket } from '../../types'
import { PROJECTS } from '../../mocks/projects/projects'
import { GRAPHQLAPI_SPEC_RAW } from '../../mocks/packages/graphql'
import { VERSION_REFERENCES } from '../../mocks/packages/references'
import { ACTIVITIES_LIST } from '../../mocks/packages/activities'
import { DEFAULT_CHANGES, generateVersionChanges, PACKAGE1_CHANGES } from '../../mocks/packages/changes'
import type {
  ApiType,
  ChangesSummaryDto,
  DashboardComparisonSummaryDto,
  PackageComparisonSummaryDto,
  VersionChangesDto,
} from '../../mocks/packages/types'
import {
  GRAPHQL_API_TYPE,
  isGraphQlOperationChanges,
  isRestOperationChanges,
  REST_API_TYPE,
} from '../../mocks/packages/types'
import { REVISIONS } from '../../mocks/packages/revisions'
import { ROLES_LIST } from '../../mocks/roles/roles'

export function deletePackage(router: Router): void {
  router.delete('/:packageKey/', (req, res) => {
    PACKAGES.packages = PACKAGES.packages.filter((packageObject) => packageObject.packageId !== req.params.packageKey)

    res.status(200).send()
  })
}

export function updatePackage(router: Router): void {
  router.patch('/:packageKey/', (req, res) => {
    PACKAGES.packages = PACKAGES.packages.map(packageObject => {
      if (packageObject.packageId === req.params.packageKey) {
        return {
          ...packageObject,
          groupId: req.body.groupId,
          name: req.body.name,
          alias: req.body.alias,
          parentId: req.body.parentId,
          kind: req.body.kind,
          description: req.body.description,
          serviceName: req.body.serviceName,
          defaultRole: req.body.defaultRole,
          permissions: req.body.permissions,
          defaultReleaseVersion: req.body.defaultReleaseVersion,
          releaseVersionPattern: req.body.releaseVersionPattern,
          restGroupingPrefix: req.body.restGroupingPrefix,
          userRole: req.body.userRole,
          parents: req.body.parents,
        }
      }

      return packageObject
    })

    res.status(200).json(PACKAGES.packages.find(packageObject => packageObject.packageId === req.params.packageKey))
  })
}

export function getPackageActivity(router: Router): void {
  router.get('/:id/activity', (req, res) => {
    res.status(200).json(ACTIVITIES_LIST)
  })
}

export function getTokens(router: Router): void {
  router.get('/:packageKey/apiKeys', (req, res) => {
    res.status(200).json(ACCESS_TOKENS_LIST)
  })
}

export function generateApiKey(router: Router): void {
  router.post('/:packageKey/apiKeys', (req, res) => {
    const accessTokensList = [...ACCESS_TOKENS_LIST.apiKeys]
    const body = JSON.parse(req.body)
    accessTokensList.push({
      apiKey: '964rdcfe-89f2-483d-8egd-665b751d6w6',
      id: `id-${new Date()}`,
      packageId: 'QS.NAMESPACE',
      name: body.name,
      createdAt: `${new Date()}`,
      createdBy: {
        key: 'user123',
        name: 'Sergey',
        avatarUrl: 'edeeded',
      },
      roles: body.roles ?? ['Admin'],
    })

    ACCESS_TOKENS_LIST.apiKeys = accessTokensList
    res.status(200).json(ACCESS_TOKENS_LIST)
  })
}

export function deleteApiKey(router: Router): void {
  router.delete('/:packageKey/apiKeys/:id', (req, res) => {
    ACCESS_TOKENS_LIST.apiKeys = ACCESS_TOKENS_LIST.apiKeys.filter((token) => token?.id !== req.params.id)

    res.status(200).send()
  })
}

export function getAvailableRoles(router: Router): void {
  router.get('/:packageKey/availableRoles', (req, res) => {
    res.status(200).json(ROLES_LIST)
  })
}

export function getPackageMembers(router: Router): void {
  router.get('/:packageKey/members', (req, res) => {
    res.status(200).json(PACKAGE_MEMBERS)
  })
}

export function deletePackageMember(router: Router): void {
  router.delete('/:packageKey/members/:userId', (req, res) => {
    PACKAGE_MEMBERS.members = PACKAGE_MEMBERS.members.filter((member) => member?.user?.id !== req.params.userId)

    res.status(200).send()
  })
}

export function changePackageMemberRole(router: Router): void {
  router.patch('/:packageKey/members/:userId', (req, res) => {
    PACKAGE_MEMBERS.members = PACKAGE_MEMBERS.members.map(member => {
      if (member?.user?.id === req.params.userId) {
        return {
          ...member,
          user: req.body.user,
          role: req.body.role,
          inheritance: req.body.inheritance,
        }
      }

      return member
    })

    res.status(200).json(PACKAGE_MEMBERS.members.find(member => member?.user?.id === req.params.userId))
  })
}

export function getVersions(router: Router): void {
  router.get('/:id/versions/', (req, res) => {
    const { status: queryStatus, textFilter = '' } = req.query
    const { versions } = VERSIONS

    if (queryStatus) {
      const result = versions
        .filter(({ status }) => status === queryStatus)
        .filter(value => value.version.includes(textFilter as string))

      res.status(200).json({ versions: result })
      return
    }

    res.status(200).json({ versions })
  })
}

export function getPublishedSpecRaw(router: Router): void {
  router.get('/:id/versions/:versionId/files/:specId/raw/', (req, res) => {
    res.contentType('text/plain')
    if (req.params.specId.endsWith('md')) {
      res.status(200).send(MARKDOWN_SPEC_RAW)
      return
    }
    if (req.params.specId.endsWith('graphql')) {
      res.status(200).send(GRAPHQLAPI_SPEC_RAW)
      return
    }
    res.status(200).send(OPENAPI_3_0_SPEC_RAW)
  })
}

export function getVersion(router: Router): void {
  router.get('/:id/versions/:versionId/', (req, res) => {
    res.status(200).json(PUBLISHED_VERSION_CONTENTS[req.params.versionId])
  })
}

export function getVersionReferences(router: Router): void {
  router.get('/:id/versions/:versionId/references/', (req, res) => {
    res.status(200).json({
      references: VERSION_REFERENCES.get(req.params.versionId)
        ?.filter((ref) => ref.kind === req.query.kind),
    })
  })
}

export function getDocument(router: Router): void {
  router.get('/:id/versions/:versionId/documents/:specId/', (req, res) => {
    if (req.params.specId.endsWith('md')) {
      res.status(200).send(MARKDOWN_SPEC)
      return
    }
    if (req.params.specId.endsWith('doc')) {
      res.status(200).send(DOC_SPEC)
      return
    }
    if (req.params.specId.endsWith('graphql')) {
      res.status(200).send(GRAPHQLAPI_SPEC)
      return
    }
    res.status(200).send({
        ...VERSION_DOCUMENTS.get(req.params.versionId)?.documents.find((doc) => doc.slug === req.params.specId),
        operations: OPENAPI_SPEC.operations,
      },
    )
  })
}

export function getDocuments(router: Router): void {
  router.get('/:id/versions/:versionId/documents', (req, res) => {
    res.status(200).send(VERSION_DOCUMENTS.get(req.params.versionId))
  })
}

export function getPackages(router: Router): void {
  router.get('/', (req, res) => {
    const { kind, parentId, onlyFavorite } = req.query
    const kinds = (kind as string).split(',')

    let preparedData = PACKAGES.packages?.filter((packageItem) => kinds.includes(packageItem.kind)) ?? []
    if (parentId && parentId !== '') {
      preparedData = preparedData?.filter((item) => item?.parentId === parentId)
    }
    if (onlyFavorite === 'true') {
      preparedData = preparedData?.filter((item) => item?.isFavorite === true)
    }
    res.status(200).json({ packages: preparedData })
  })
}

export function getPackage(router: Router): void {
  router.get('/:id/', (req, res) => {
    setTimeout(
      () => res.status(200).json(PACKAGES.packages.find(({ packageId }) => packageId === req.params.id)),
      1000,
    )
  })
}

export function recalculatePackageVersionGroups(router: Router): void {
  router.post('/:packageKey/', (req, res) => {
    res.status(200).json(PACKAGES.packages.find(packageObject => packageObject.packageId === req.params.packageKey))
  })
}

export function favorPackage(router: Router): void {
  router.post('/:id/favor/', (req, res) => {
    PACKAGES.packages = PACKAGES.packages.map(pack => {
      return pack.packageId === req.params.id
        ? { ...pack, isFavorite: true }
        : pack
    })
    res.status(200).json()
  })
}

export function disfavorPackage(router: Router): void {
  router.post('/:id/disfavor/', (req, res) => {
    PACKAGES.packages = PACKAGES.packages.map(pack => {
      return pack.packageId === req.params.id
        ? { ...pack, isFavorite: false }
        : pack
    })
    res.status(200).json()
  })
}

export function getOperations(router: Router): void {
  router.get('/:packageId/versions/:versionId/rest/operations', (req, res) => {
    const { tag, kind } = req.query
    const { packageId, versionId } = req.params

    const packageObject = PACKAGES.packages.find(p => p.packageId === packageId)
    const packageKind = packageObject?.kind
    const isDashboard = packageKind === 'dashboard'

    if (isDashboard) {
      const refs = VERSION_REFERENCES.get(versionId) ?? []
      const filteredOperations = OPERATIONS.operations.filter(
        (operation) => operation.packageRef && refs.some(ref => `${ref.refId}@${ref.version}` === operation.packageRef),
      )
      return res.status(200).json({ operations: filteredOperations })
    }

    if (tag) {
      const operationsWithTag = OPERATIONS.operations.filter(operation => operation.tags?.includes(tag as string))
      return res.status(200).json({ operations: operationsWithTag })
    }
    if (kind && kind !== 'all') {
      const operationsWithTag = OPERATIONS.operations.filter(operation => operation?.apiKind === kind)
      return res.status(200).json({ operations: operationsWithTag })
    }

    return res.status(200).json(OPERATIONS)
  })
}

export function getDeprecatedOperations(router: Router): void {
  router.get('/:id/versions/:id/rest/deprecated', (req, res) => {
    if (req.query.tag) {
      const operationsWithTag = DEPRECATED_OPERATIONS.operations.filter(operation => operation.tags?.includes(req.query.tag as string))
      return res.status(200).json({ operations: operationsWithTag })
    }

    res.status(200).json(DEPRECATED_OPERATIONS)
  })
}

export function getOperation(router: Router): void {
  router.get('/:id/versions/:id/rest/operations/:id', (req, res) => {
    res.status(200).json(OPERATIONS.operations.find(({ operationId }) => operationId === req.params.id))
  })
}

export function getOperationDeprecatedItems(router: Router): void {
  router.get('/:id/versions/:id/rest/operations/:operationId/deprecatedItems', (req, res) => {
    res.status(200).json(DEPRECATED_ITEMS)
  })
}

export function getTags(router: Router): void {
  router.get('/:id/versions/:id/rest/tags', (req, res) => {
    res.status(200).json(TAGS)
  })
}

export function getRevisions(router: Router): void {
  router.get('/:id/versions/:id/revisions', (req, res) => {
    res.status(200).json(REVISIONS)
  })
}

export function deleteVersion(router: Router): void {
  router.delete('/:id/versions/:versionId/', (req, res) => {
    const versions = [...VERSIONS.versions]
    const { versionId } = req.params

    VERSIONS.versions = versions.filter((projectVersion) => projectVersion.version !== versionId)

    res.status(200).send()
  })
}

export function publishProjectVersion(router: Router & WithWebsocketMethod, wss: Server): void {
  router.post('/:id/branches/:branchId/publish/', (req, res) => {
    const { version, status } = req.body

    wss.clients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:published',
        userId: s.id,
        version: version,
        status: status,
      }))
    })
    res.status(200).json()
  })
}

export function createPackage(router: Router): void {
  router.post('/', (req, res) => {
    const packages = [...PACKAGES.packages]
    const newPackage = {
      ...req.body,
      packageId: `package-${new Date()}`,
    }
    packages.push(newPackage)
    PACKAGES.packages = packages
    res.status(200).json(newPackage)
  })
}

export function deleteProject(router: Router): void {
  router.delete('/:id/', (req, res) => {
    const projects = [...PROJECTS.projects]
    PROJECTS.projects = projects.filter(({ projectId }) => projectId !== req.params.id)
    res.status(200).json()
  })
}

export function updateProject(router: Router): void {
  router.put('/:id/', (req, res) => {
    const projects = [...PROJECTS.projects]
    PROJECTS.projects = projects.map(project => {
      if (project.projectId === req.params.id) {
        project = { ...req.body }
      }
      return project
    })
    res.status(200).json()
  })
}

export function getActivityHistoryByPackage(router: Router): void {
  router.get('/:packageKey/activity', (req, res) => {
    res.status(200).json({
      events: ACTIVITIES_LIST.events.filter(({ packageId }) => packageId === req.params.packageKey),
    })
  })
}

export function getChangesSummary(router: Router): void {
  router.get('/:packageKey/versions/:versionKey/changes/summary', (req, res) => {
    const { packageKey, versionKey } = req.params
    const { previousVersion } = req.query
    const packageDto = PACKAGES.packages.find(packageDto => packageDto.packageId === packageKey)
    if (packageDto?.kind === 'dashboard') {
      res.status(200).json(getDashboardChangesSummary([
        generateVersionChanges(packageKey, previousVersion as string, versionKey),
      ]))
    } else {
      res.status(200).json(getPackageChangesSummary(PACKAGE1_CHANGES))
    }
  })
}

export function getChangelog(router: Router): void {
  router.get('/:packageKey/versions/:versionKey/:apiType/changes', (req, res) => {
    res.status(200).json(DEFAULT_CHANGES)
  })
}

export function getFileContent(fileId: string): Buffer {
  try {
    return fs.readFileSync(path.join(__dirname, `../../mocks/file-contents/${fileId}`))
  } catch (err) {
    if (fileId.includes('.json')) {
      return fs.readFileSync(path.join(__dirname, '../../mocks/file-contents/api.json'))
    } else {
      return fs.readFileSync(path.join(__dirname, '../../mocks/file-contents/sample.postman_collection.yaml'))
    }
  }
}

function getPackageChangesSummary(versionChanges: VersionChangesDto): PackageComparisonSummaryDto {
  return {
    operationTypes: [{
      apiType: REST_API_TYPE,
      changesSummary: sumChanges(versionChanges!.operations!.map(operation => operation.changeSummary)),
      tags: versionChanges.operations!
        .map(operation => operation.tags ?? [])
        .reduce((result, currentTags) => [...result, ...currentTags]) as string[],
    }],
  }
}

function getDashboardChangesSummary(versionChanges: VersionChangesDto[]): DashboardComparisonSummaryDto {
  const refs = versionChanges.map(changes => ({
    packageRef: changes.operations![0].packageRef,
    previousPackageRef: changes.operations![0].previousVersionPackageRef,
    operationTypes: [{
      apiType: REST_API_TYPE as ApiType,
      changesSummary: sumChanges(
        changes.operations!
          .filter(isRestOperationChanges)
          .map(operation => operation.changeSummary),
      ),
    }, {
      apiType: GRAPHQL_API_TYPE as ApiType,
      changesSummary: sumChanges(
        changes.operations!
          .filter(isGraphQlOperationChanges)
          .map(operation => operation.changeSummary),
      ),
    }],
  }))
  const packages = versionChanges
    .map(changes => changes.packages!)
    .reduce((result, currentPackage) => ({
      ...result,
      ...currentPackage,
    }))
  return {
    refs: refs,
    packages: packages,
  }
}

function sumChanges(changes: ChangesSummaryDto[]): ChangesSummaryDto {
  return changes.reduce((sum, item) => ({
    breaking: (sum.breaking ?? 0) + (item.breaking ?? 0),
    semiBreaking: (sum.semiBreaking ?? 0) + (item.semiBreaking ?? 0),
    deprecated: (sum.deprecated ?? 0) + (item.deprecated ?? 0),
    nonBreaking: (sum.nonBreaking ?? 0) + (item.nonBreaking ?? 0),
    annotation: (sum.annotation ?? 0) + (item.annotation ?? 0),
    unclassified: (sum.unclassified ?? 0) + (item.unclassified ?? 0),
  }))
}

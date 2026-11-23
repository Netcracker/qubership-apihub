import type { Request, RequestHandler, Response, Router } from 'express'
import { randomBytes, randomUUID } from 'node:crypto'

import {
  JAVA_API_DIFF_PATH,
  JAVA_API_REPORT_PATH,
  LIBRARY_PERMISSIONS,
  type LibraryStore,
  PUBLIC_LIBRARY_ROLE,
} from '../../mocks/libraries/store'
import type {
  Library,
  LibraryApiKey,
  LibraryApiKeyCreate,
  LibraryCreate,
  LibraryMember,
  LibraryMemberUpdate,
  LibraryVersion,
  LibraryVersionPublish,
} from '../../mocks/libraries/types'

const LIBRARY_VERSION_BUILD_DELAY_MS = 3000
const LIBRARY_ROLE_NAMES: Readonly<Record<string, string>> = {
  admin: 'Admin',
  owner: 'Owner',
  'release-manager': 'Release Manager',
  editor: 'Editor',
  viewer: 'Viewer',
}

export function getLibraries(router: Router, store: LibraryStore): void {
  const { libraries } = store
  router.get('/', (req, res) => {
    const { repository, language, parentPackageId, textFilter, onlyFavorite } = req.query
    const text = typeof textFilter === 'string' ? textFilter.toLowerCase() : ''
    const limit = Number(req.query.limit ?? 100)
    const page = Number(req.query.page ?? 0)
    if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(page) || page < 0) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Invalid pagination parameters' })
      return
    }
    const filtered = libraries.filter(library =>
      (!repository || library.repository === repository) &&
      (!language || library.language === language) &&
      (!parentPackageId || library.parentPackageId === parentPackageId) &&
      (onlyFavorite !== 'true' || library.isFavorite) &&
      [library.name, library.alias, library.description ?? '', library.coordinatesKey].some(value =>
        value.toLowerCase().includes(text),
      ),
    )
    res.json({
      libraries: filtered.slice(page * limit, (page + 1) * limit).map(library => getLibrarySummary(store, library)),
    })
  })
}

export function getLibrary(router: Router, store: LibraryStore): void {
  const { libraries } = store
  router.get('/:libraryId', (req, res) => {
    const library = libraries.find(item => item.libraryId === req.params.libraryId)
    if (!library) {
      res.status(404).json({ status: 404, code: 'LIBRARY_NOT_FOUND', message: 'Library not found' })
      return
    }
    res.json(getLibrarySummary(store, library))
  })
}

export function createLibrary(router: Router, store: LibraryStore): void {
  const { libraries } = store
  router.post('/', (req, res) => {
    const { body } = req
    if (!isLibraryCreate(body)) {
      res.status(400).json({
        status: 400,
        code: 'BAD_REQUEST',
        message:
          'Provide a name, an alias of up to 10 letters, digits, underscores, or hyphens, language java, a repository, and Maven groupId and artifactId',
      })
      return
    }
    const coordinatesKey = [body.coordinates.groupId, body.coordinates.artifactId, body.coordinates.classifier]
      .filter(Boolean).join(':')
    if (
      libraries.some(library => library.repository === body.repository && library.coordinatesKey === coordinatesKey)
    ) {
      res.status(409).json({
        status: 409,
        code: '3001',
        message:
          'Duplicate Maven coordinates. A library with this repository name and Maven GA is already registered. Use the existing library to publish versions, or change the coordinates.',
      })
      return
    }
    const library: Library = {
      alias: body.alias,
      name: body.name,
      language: body.language,
      repository: body.repository,
      coordinates: body.coordinates,
      parentPackageId: body.parentPackageId,
      description: body.description,
      defaultRole: body.defaultRole ?? PUBLIC_LIBRARY_ROLE,
      libraryId: randomUUID(),
      coordinatesKey: coordinatesKey,
      isFavorite: false,
      permissions: [...LIBRARY_PERMISSIONS],
      createdAt: new Date().toISOString(),
      createdBy: 'local-dev',
    }
    libraries.push(library)
    res.status(201).json(library)
  })
}

export function checkLibraryExists(router: Router, store: LibraryStore): void {
  const { libraries } = store
  router.use(['/:libraryId/versions', '/:libraryId/members', '/:libraryId/apiKeys'], (req, res, next) => {
    if (!libraries.some(library => library.libraryId === req.params.libraryId)) {
      res.status(404).json({ status: 404, code: 'LIBRARY_NOT_FOUND', message: 'Library not found' })
      return
    }
    next()
  })
}

export function updateLibrary(router: Router, store: LibraryStore): void {
  const { libraries } = store
  router.patch('/:libraryId', (req, res) => {
    const library = libraries.find(item => item.libraryId === req.params.libraryId)
    if (!library) {
      res.status(404).json({ status: 404, code: 'LIBRARY_NOT_FOUND', message: 'Library not found' })
      return
    }
    const { body } = req
    if (!isLibraryUpdate(body)) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Provide valid library metadata' })
      return
    }
    Object.assign(library, body)
    res.json(getLibrarySummary(store, library))
  })
}

export function deleteLibrary(router: Router, store: LibraryStore): void {
  const { libraries, libraryVersions, libraryMembers, libraryApiKeys } = store
  router.delete('/:libraryId', (req, res) => {
    const index = libraries.findIndex(item => item.libraryId === req.params.libraryId)
    if (index < 0) {
      res.status(404).json({ status: 404, code: 'LIBRARY_NOT_FOUND', message: 'Library not found' })
      return
    }
    libraries.splice(index, 1)
    libraryMembers.delete(req.params.libraryId)
    libraryApiKeys.delete(req.params.libraryId)
    for (let i = libraryVersions.length - 1; i >= 0; i--) {
      if (libraryVersions[i].libraryId === req.params.libraryId) libraryVersions.splice(i, 1)
    }
    res.sendStatus(204)
  })
}

export function getLibraryMembers(router: Router, store: LibraryStore): void {
  const { libraryMembers } = store
  router.get('/:libraryId/members', (req, res) => {
    res.json({ members: libraryMembers.get(req.params.libraryId) ?? [] })
  })
}

export function updateLibraryMember(router: Router, store: LibraryStore): void {
  const { libraryMembers } = store
  router.put('/:libraryId/members/:userId', (req, res) => {
    if (!isLibraryMemberUpdate(req.body)) {
      res.status(400).json({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Provide roleIds as an array of known library roles',
      })
      return
    }
    const members = libraryMembers.get(req.params.libraryId) ?? []
    setMemberDirectRoles(members, req.params.userId, req.body.roleIds)
    libraryMembers.set(req.params.libraryId, members)
    res.sendStatus(204)
  })
}

export function deleteLibraryMember(router: Router, store: LibraryStore): void {
  const { libraryMembers } = store
  router.delete('/:libraryId/members/:userId', (req, res) => {
    const members = libraryMembers.get(req.params.libraryId) ?? []
    if (!members.some(member => member.user.userId === req.params.userId)) {
      res.status(404).json({ status: 404, code: 'LIBRARY_MEMBER_NOT_FOUND', message: 'Library member not found' })
      return
    }
    setMemberDirectRoles(members, req.params.userId, [])
    res.sendStatus(204)
  })
}

export function getLibraryApiKeys(router: Router, store: LibraryStore): void {
  const { libraryApiKeys } = store
  router.get('/:libraryId/apiKeys', (req, res) => {
    res.json({ apiKeys: libraryApiKeys.get(req.params.libraryId) ?? [] })
  })
}

export function generateLibraryApiKey(router: Router, store: LibraryStore): void {
  const { libraryApiKeys } = store
  router.post('/:libraryId/apiKeys', (req, res) => {
    if (!isLibraryApiKeyCreate(req.body)) {
      res.status(400).json({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Provide a nonempty name, a createdFor user ID, and roles as an array of strings',
      })
      return
    }
    const { name, roles, createdFor } = req.body
    const item: LibraryApiKey = {
      id: randomUUID(),
      libraryId: req.params.libraryId,
      name: name,
      createdAt: new Date().toISOString(),
      createdBy: { id: 'local-dev', name: 'Local Developer' },
      createdFor: { id: createdFor, name: getLibraryUserName(createdFor) },
      roles: roles ?? [],
    }
    const apiKeys = libraryApiKeys.get(req.params.libraryId) ?? []
    apiKeys.push(item)
    libraryApiKeys.set(req.params.libraryId, apiKeys)
    res.status(200).json({ ...item, apiKey: randomBytes(32).toString('hex') })
  })
}

export function deleteLibraryApiKey(router: Router, store: LibraryStore): void {
  const { libraryApiKeys } = store
  router.delete('/:libraryId/apiKeys/:apiKeyId', (req, res) => {
    const apiKeys = libraryApiKeys.get(req.params.libraryId) ?? []
    const index = apiKeys.findIndex(item => item.id === req.params.apiKeyId)
    if (index < 0) {
      res.status(404).json({ status: 404, code: 'LIBRARY_API_KEY_NOT_FOUND', message: 'Library API key not found' })
      return
    }
    apiKeys.splice(index, 1)
    res.sendStatus(204)
  })
}

export function getLibraryAvailableVersions(router: Router, store: LibraryStore): void {
  const { libraries, libraryVersions } = store
  router.get('/:libraryId/available-versions', (req, res) => {
    const library = libraries.find(item => item.libraryId === req.params.libraryId)
    if (!library) {
      res.status(404).json({ status: 404, code: 'LIBRARY_NOT_FOUND', message: 'Library not found' })
      return
    }
    const paging = getPaging(req, res)
    if (!paging) return
    const textFilter = typeof req.query.textFilter === 'string' ? req.query.textFilter.toLowerCase() : ''
    const publishedVersions = new Set(
      libraryVersions.filter(version => version.libraryId === library.libraryId)
        .map(version => version.version),
    )
    const versions = (store.registryVersions[library.coordinatesKey] ?? []).filter(version =>
      !publishedVersions.has(version) && version.toLowerCase().includes(textFilter),
    )
    res.json({
      // The registry lists versions oldest first, like maven-metadata.xml.
      versions: versions.reverse().slice(paging.offset, paging.offset + paging.limit).map(version => ({ version })),
    })
  })
}

export function getLibraryVersions(router: Router, store: LibraryStore): void {
  const { libraryVersions } = store
  router.get('/:libraryId/versions', (req, res) => {
    const textFilter = typeof req.query.textFilter === 'string' ? req.query.textFilter.toLowerCase() : ''
    const statuses = queryValues(req.query.status)
    if (statuses.some(status => !['draft', 'release'].includes(status))) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Select a draft or release status' })
      return
    }
    const filtered = libraryVersions.filter(version =>
      version.libraryId === req.params.libraryId &&
      (!statuses.length || statuses.includes(version.status)) &&
      [version.version, ...version.labels].some(value => value.toLowerCase().includes(textFilter)),
    )
    const paging = getPaging(req, res)
    if (!paging) return
    res.json({ versions: filtered.slice(paging.offset, paging.offset + paging.limit) })
  })
}

export function getLibraryJavaApiReport(router: Router, store: LibraryStore): void {
  const { libraryVersions } = store
  router.get('/:libraryId/versions/:version/java-api/report', (req, res) => {
    const version = libraryVersions.find(item =>
      item.libraryId === req.params.libraryId && item.version === req.params.version,
    )
    if (!version) {
      res.status(404).json({ status: 404, code: 'LIBRARY_VERSION_NOT_FOUND', message: 'Library version not found' })
      return
    }
    if (!store.seedVersions.some(seed => seed.libraryId === version.libraryId && seed.version === version.version)) {
      res.status(404).json({
        status: 404,
        code: 'LIBRARY_JAVA_API_REPORT_NOT_FOUND',
        message: 'No Java API report has been built for this version',
      })
      return
    }
    res.sendFile(JAVA_API_REPORT_PATH)
  })
}

export function getLibraryJavaApiDiff(router: Router, store: LibraryStore): void {
  router.get('/:libraryId/versions/:version/java-api/diff', (req, res) => {
    if (checkComparison(store, req, res)) res.sendFile(JAVA_API_DIFF_PATH)
  })
}

export function getLibraryChangesSummary(router: Router, store: LibraryStore): void {
  const { comparison } = store
  router.get('/:libraryId/versions/:version/changes/summary', (req, res) => {
    if (checkComparison(store, req, res, '3200')) res.json(comparison)
  })
}

export function getLibraryChanges(router: Router, store: LibraryStore): void {
  const { sampleChanges, comparison } = store
  router.get('/:libraryId/versions/:version/changes', (req, res) => {
    const paging = getPaging(req, res)
    if (!paging) return
    if (paging.limit > 100) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Limit must be between 1 and 100' })
      return
    }
    const changeTypes = queryValues(req.query.changeType)
    const severities = queryValues(req.query.severity)
    if (
      changeTypes.some(type => !['added', 'removed', 'changed', 'deprecated'].includes(type)) ||
      severities.some(severity => !['breaking', 'non-breaking', 'annotation'].includes(severity))
    ) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Invalid change filter' })
      return
    }
    if (!checkComparison(store, req, res, '3200')) return
    const changes = sampleChanges.filter(change =>
      (!changeTypes.length || changeTypes.includes(change.changeType)) &&
      (!severities.length || severities.includes(change.severity)) &&
      (!req.query.classId || change.classId === req.query.classId),
    )
    res.json({ comparison: comparison, changes: changes.slice(paging.offset, paging.offset + paging.limit) })
  })
}

export function getLibraryVersion(router: Router, store: LibraryStore): void {
  const { libraryVersions } = store
  router.get('/:libraryId/versions/:version', (req, res) => {
    const version = libraryVersions.find(item =>
      item.libraryId === req.params.libraryId && item.version === req.params.version,
    )
    if (!version) {
      res.status(404).json({ status: 404, code: 'LIBRARY_VERSION_NOT_FOUND', message: 'Library version not found' })
      return
    }
    res.json(version)
  })
}

export function publishLibraryVersion(router: Router, store: LibraryStore): void {
  const { libraryVersions } = store
  router.post('/:libraryId/versions', (req, res) => {
    const { body } = req
    const { libraryId } = req.params
    if (!isLibraryVersionPublish(body)) {
      res.status(400).json({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Provide a valid version, a draft or release status, and labels as an array of strings',
      })
      return
    }
    const versions = libraryVersions.filter(version => version.libraryId === libraryId)
    if (versions.some(version => version.version === body.version)) {
      res.status(409).json({
        status: 409,
        code: '3101',
        message: 'This version is already imported for the library',
      })
      return
    }
    if (body.previousVersion && !versions.some(version => version.version === body.previousVersion)) {
      res.status(400).json({
        status: 400,
        code: '3105',
        message: 'Select a previous version published in this library',
      })
      return
    }
    const version: LibraryVersion = {
      libraryId: libraryId,
      version: body.version,
      previousVersion: body.previousVersion,
      status: 'draft',
      labels: body.labels ?? [],
      createdAt: new Date().toISOString(),
      createdBy: 'local-dev',
      metadata: {
        buildId: randomUUID(),
        buildStatus: 'none',
        activities: [{
          id: randomUUID(),
          action: 'Published version',
          createdAt: new Date().toISOString(),
          createdBy: 'local-dev',
        }],
      },
    }
    libraryVersions.unshift(version)
    res.status(202).json(version)
    setTimeout(() => {
      version.status = 'release'
      version.metadata = { ...version.metadata, buildStatus: 'complete' }
    }, LIBRARY_VERSION_BUILD_DELAY_MS).unref()
  })
}

export function updateLibraryVersion(router: Router, store: LibraryStore): void {
  const { libraryVersions } = store
  router.patch('/:libraryId/versions/:version', (req, res) => {
    const version = libraryVersions.find(item =>
      item.libraryId === req.params.libraryId && item.version === req.params.version,
    )
    if (!version) {
      res.status(404).json({ status: 404, code: 'LIBRARY_VERSION_NOT_FOUND', message: 'Library version not found' })
      return
    }
    const { body } = req
    const updated: unknown = isRecord(body) ? { ...version, ...body } : undefined
    if (
      !isRecord(body) || Object.keys(body).some(key => !['status', 'labels'].includes(key)) ||
      !isLibraryVersionPublish(updated)
    ) {
      res.status(400).json({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Provide a draft or release status and valid labels',
      })
      return
    }
    version.status = updated.status ?? version.status
    version.labels = updated.labels ?? version.labels
    version.metadata = {
      ...version.metadata,
      activities: [{
        id: randomUUID(),
        action: 'Updated version metadata',
        createdAt: new Date().toISOString(),
        createdBy: 'local-dev',
      }, ...(version.metadata?.activities ?? [])],
    }
    res.json(version)
  })
}

export function deleteLibraryVersion(router: Router, store: LibraryStore): void {
  const { libraryVersions } = store
  router.delete('/:libraryId/versions/:version', (req, res) => {
    const index = libraryVersions.findIndex(item =>
      item.libraryId === req.params.libraryId && item.version === req.params.version,
    )
    if (index < 0) {
      res.status(404).json({ status: 404, code: 'LIBRARY_VERSION_NOT_FOUND', message: 'Library version not found' })
      return
    }
    libraryVersions.splice(index, 1)
    res.sendStatus(204)
  })
}

export function favorLibrary(router: Router, store: LibraryStore): void {
  router.put('/:libraryId', setFavorite(store, true))
}

export function disfavorLibrary(router: Router, store: LibraryStore): void {
  router.delete('/:libraryId', setFavorite(store, false))
}

// The only computed comparison is the diff sample: the seeded current version against its seeded predecessor
function hasComparison(
  store: LibraryStore,
  current: LibraryVersion,
  previousLibraryId = current.libraryId,
  previousVersion = current.previousVersion,
): boolean {
  const { libraryVersions, seedVersions } = store
  return current.libraryId === seedVersions[0].libraryId && current.version === seedVersions[0].version &&
    previousLibraryId === current.libraryId && previousVersion === seedVersions[1].version &&
    libraryVersions.some(item => item.libraryId === previousLibraryId && item.version === previousVersion)
}

function getLibrarySummary(store: LibraryStore, library: Library): Library & {
  latestRelease?: string
  breakingChangesCount?: number
} {
  const { libraryVersions, sampleBreakingChangesCount } = store
  const latestRelease = libraryVersions.find(version =>
    version.libraryId === library.libraryId && version.status === 'release',
  )
  if (!latestRelease) return library
  const breakingChangesCount = hasComparison(store, latestRelease) ? sampleBreakingChangesCount : 0
  return { ...library, latestRelease: latestRelease.version, breakingChangesCount: breakingChangesCount }
}

// Answers 404 itself and returns false when the version or its comparison does not exist
function checkComparison(
  store: LibraryStore,
  req: Request,
  res: Response,
  code = 'LIBRARY_COMPARISON_NOT_FOUND',
): boolean {
  const { libraryVersions } = store
  const current = libraryVersions.find(item =>
    item.libraryId === req.params.libraryId && item.version === req.params.version,
  )
  if (!current) {
    res.status(404).json({ status: 404, code: 'LIBRARY_VERSION_NOT_FOUND', message: 'Library version not found' })
    return false
  }
  const previousLibraryId = typeof req.query.previousLibraryId === 'string'
    ? req.query.previousLibraryId
    : current.libraryId
  const previousVersion = typeof req.query.previousVersion === 'string'
    ? req.query.previousVersion
    : current.previousVersion
  if (!hasComparison(store, current, previousLibraryId, previousVersion)) {
    res.status(404).json({
      status: 404,
      code: code,
      message: 'No comparison has been computed for this version pair',
    })
    return false
  }
  return true
}

function setFavorite(store: LibraryStore, isFavorite: boolean): RequestHandler {
  return (req, res) => {
    const library = store.libraries.find(item => item.libraryId === req.params.libraryId)
    if (!library) {
      res.status(404).json({ status: 404, code: 'LIBRARY_NOT_FOUND', message: 'Library not found' })
      return
    }
    library.isFavorite = isFavorite
    res.sendStatus(204)
  }
}

function setMemberDirectRoles(members: LibraryMember[], userId: string, roleIds: string[]): void {
  const index = members.findIndex(member => member.user.userId === userId)
  const existing = members[index]
  const roles = [
    ...(existing?.roles.filter(role => role.inheritedFrom !== undefined) ?? []),
    ...[...new Set(roleIds)].map(roleId => ({ roleId: roleId, role: LIBRARY_ROLE_NAMES[roleId] })),
  ]
  if (!roles.length) {
    if (index >= 0) members.splice(index, 1)
    return
  }
  const member = { user: existing?.user ?? { userId: userId, name: getLibraryUserName(userId) }, roles: roles }
  if (index < 0) members.push(member)
  else members[index] = member
}

function getLibraryUserName(userId: string): string {
  return userId === 'local-dev' ? 'Local Developer' : userId
}

function isLibraryMemberUpdate(value: unknown): value is LibraryMemberUpdate {
  return isRecord(value) && Array.isArray(value.roleIds) &&
    value.roleIds.every(roleId => typeof roleId === 'string' && Object.hasOwn(LIBRARY_ROLE_NAMES, roleId))
}

function isLibraryApiKeyCreate(value: unknown): value is LibraryApiKeyCreate {
  return isRecord(value) && isNonEmptyString(value.name) && typeof value.createdFor === 'string' &&
    (value.roles === undefined || Array.isArray(value.roles) && value.roles.every(role => typeof role === 'string'))
}

function queryValues(value: unknown): string[] {
  if (typeof value === 'string') return value.split(',')
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function getPaging(req: Request, res: Response): { offset: number; limit: number } | undefined {
  const limit = Number(req.query.limit ?? 100)
  const page = Number(req.query.page ?? 0)
  if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(page) || page < 0) {
    res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Invalid pagination parameters' })
    return
  }
  return { offset: page * limit, limit: limit }
}

function isLibraryUpdate(value: unknown): value is Partial<LibraryCreate> {
  if (
    !isRecord(value) ||
    Object.keys(value).some(key => !['alias', 'name', 'description', 'parentPackageId', 'defaultRole'].includes(key))
  ) return false
  return (value.name === undefined || isNonEmptyString(value.name)) &&
    (value.alias === undefined || typeof value.alias === 'string' && /^[a-zA-Z0-9_-]{1,10}$/.test(value.alias)) &&
    [value.description, value.parentPackageId, value.defaultRole].every(item =>
      item === undefined || typeof item === 'string',
    )
}

function isLibraryVersionPublish(value: unknown): value is LibraryVersionPublish {
  if (!isRecord(value)) return false
  return typeof value.version === 'string' && /^[A-Za-z0-9_.~-]+$/.test(value.version) &&
    (value.status === undefined || value.status === 'draft' || value.status === 'release') &&
    (value.previousVersion === undefined || isNonEmptyString(value.previousVersion)) &&
    value.previousVersion !== value.version &&
    (value.labels === undefined || Array.isArray(value.labels) && value.labels.every(isNonEmptyString))
}

function isLibraryCreate(value: unknown): value is LibraryCreate {
  if (!isRecord(value) || !isRecord(value.coordinates)) return false
  return isNonEmptyString(value.name) &&
    typeof value.alias === 'string' && /^[a-zA-Z0-9_-]{1,10}$/.test(value.alias) &&
    value.language === 'java' && isNonEmptyString(value.repository) &&
    isNonEmptyString(value.coordinates.groupId) && isNonEmptyString(value.coordinates.artifactId) &&
    [value.description, value.parentPackageId, value.defaultRole, value.coordinates.classifier]
      .every(item => item === undefined || typeof item === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import type {
  LibraryApiKey,
  LibraryApiKeyCreate,
  LibraryComparison,
  LibraryMember,
  LibraryMemberUpdate,
  LibraryVersion,
  LibraryVersionPublish,
} from './entities'
import { createMockLibraryContent } from './mock-content'

const PUBLIC_LIBRARY_ROLE = 'viewer'

// The mock's Node configuration cannot resolve UI entity aliases, so these mirror PackagePermission.
const LIBRARY_PERMISSIONS = [
  'read',
  'create_and_update_package',
  'delete_package',
  'manage_draft_version',
  'manage_release_version',
  'manage_deprecated_version',
  'user_access_management',
  'access_token_management',
  'document_shareability_management',
]
const LIBRARY_ROLE_NAMES: Readonly<Record<string, string>> = {
  admin: 'Admin',
  owner: 'Owner',
  'release-manager': 'Release Manager',
  editor: 'Editor',
  viewer: 'Viewer',
}

type LibraryCreate = {
  alias: string
  name: string
  language: 'java'
  repository: string
  coordinates: {
    groupId: string
    artifactId: string
    classifier?: string
  }
  parentPackageId?: string
  description?: string
  defaultRole?: string
}

type Library = LibraryCreate & {
  libraryId: string
  coordinatesKey: string
  isFavorite: boolean
  permissions: string[]
  defaultRole: string
  createdAt: string
  createdBy: string
}

type LibrariesRouters = { libraries: Router; classes: Router; favorites: Router }

export function createLibrariesRouters(): LibrariesRouters {
  const router = Router()
  const searchRouter = Router()
  const favoritesRouter = Router()
  const mock = createMockLibraryContent()
  const libraryMembers = new Map(Object.entries(mock.members))
  const libraryApiKeys = new Map<string, LibraryApiKey[]>()
  const libraryVersions: LibraryVersion[] = [...mock.versions]
  const libraries: Library[] = [{
    libraryId: 'local-library-test',
    alias: 'test',
    name: 'Library (JavaAPI) test',
    language: 'java',
    repository: 'maven-local',
    coordinates: { groupId: 'com.example', artifactId: 'test' },
    coordinatesKey: 'com.example:test',
    permissions: [...LIBRARY_PERMISSIONS],
    parentPackageId: 'DEMO',
    isFavorite: false,
    defaultRole: PUBLIC_LIBRARY_ROLE,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'local-dev',
  }, {
    libraryId: 'local-library-demo',
    alias: 'catalog',
    name: 'Library (JavaAPI) Catalog library',
    language: 'java',
    repository: 'maven-local',
    coordinates: { groupId: 'org.qubership', artifactId: 'qip-catalog-library' },
    coordinatesKey: 'org.qubership:qip-catalog-library',
    permissions: [...LIBRARY_PERMISSIONS],
    parentPackageId: 'DEMO',
    isFavorite: false,
    defaultRole: PUBLIC_LIBRARY_ROLE,
    description: 'Mock Java API library for local UI development',
    createdAt: '2022-03-01T10:00:00.000Z',
    createdBy: 'Name Surname',
  }]

  const findComparison = (
    current: LibraryVersion,
    previousLibraryId = current.libraryId,
    previousVersion = current.previousVersion,
  ): LibraryComparison | undefined => {
    if (
      current.libraryId !== mock.versions[0].libraryId || current.version !== mock.versions[0].version ||
      previousLibraryId !== current.libraryId || previousVersion !== mock.versions[1].version ||
      !libraryVersions.some(item => item.libraryId === previousLibraryId && item.version === previousVersion)
    ) return
    return {
      comparisonId: 'local-catalog-comparison',
      libraryId: current.libraryId,
      version: current.version,
      previousLibraryId: previousLibraryId,
      previousVersion: previousVersion,
      changeCounts: { removed: { breaking: 30 }, changed: { breaking: 15 }, added: { 'non-breaking': 3 } },
      openCount: 48,
      noContent: false,
      builderVersion: 'local-mock',
      lastActive: current.createdAt,
    }
  }

  const getLibrarySummary = (library: Library): Library & {
    latestRelease?: string
    breakingChangesCount?: number
  } => {
    const latestRelease = libraryVersions.find(version =>
      version.libraryId === library.libraryId && version.status === 'release',
    )
    if (!latestRelease) return library
    const comparison = findComparison(latestRelease)
    const breakingChangesCount = Object.values(comparison?.changeCounts ?? {})
      .reduce((total, counts) => total + (counts.breaking ?? 0), 0)
    return { ...library, latestRelease: latestRelease.version, breakingChangesCount: breakingChangesCount }
  }

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
    res.json({ libraries: filtered.slice(page * limit, (page + 1) * limit).map(getLibrarySummary) })
  })

  router.get('/:libraryId', (req, res) => {
    const library = libraries.find(item => item.libraryId === req.params.libraryId)
    if (!library) {
      res.status(404).json({ status: 404, code: 'LIBRARY_NOT_FOUND', message: 'Library not found' })
      return
    }
    res.json(getLibrarySummary(library))
  })

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
    if (
      body.repository === 'unverified-repository' && body.coordinates.groupId === 'com.example' &&
      body.coordinates.artifactId === 'missing-artifact'
    ) {
      res.status(400).json({
        status: 400,
        code: 'LIBRARY_COORDINATES_NOT_VERIFIED',
        message: 'These coordinates could not be verified in Artifactory. Check repository name and Maven GA',
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
        code: 'LIBRARY_ALREADY_EXISTS',
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

  router.use(['/:libraryId/versions', '/:libraryId/members', '/:libraryId/apiKeys'], (req, res, next) => {
    if (!libraries.some(library => library.libraryId === req.params.libraryId)) {
      res.status(404).json({ status: 404, code: 'LIBRARY_NOT_FOUND', message: 'Library not found' })
      return
    }
    next()
  })

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
    res.json(getLibrarySummary(library))
  })

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

  router.get('/:libraryId/members', (req, res) => {
    res.json({ members: libraryMembers.get(req.params.libraryId) ?? [] })
  })

  router.put('/:libraryId/members/:userId', (req, res) => {
    if (!isLibraryMemberUpdate(req.body)) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Provide roleIds as an array of known library roles' })
      return
    }
    const members = libraryMembers.get(req.params.libraryId) ?? []
    setMemberDirectRoles(members, req.params.userId, req.body.roleIds)
    libraryMembers.set(req.params.libraryId, members)
    res.sendStatus(204)
  })

  router.delete('/:libraryId/members/:userId', (req, res) => {
    const members = libraryMembers.get(req.params.libraryId) ?? []
    if (!members.some(member => member.user.userId === req.params.userId)) {
      res.status(404).json({ status: 404, code: 'LIBRARY_MEMBER_NOT_FOUND', message: 'Library member not found' })
      return
    }
    setMemberDirectRoles(members, req.params.userId, [])
    res.sendStatus(204)
  })

  router.get('/:libraryId/apiKeys', (req, res) => {
    res.json({ apiKeys: libraryApiKeys.get(req.params.libraryId) ?? [] })
  })

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

  router.get('/:libraryId/registry-versions', (req, res) => {
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
    const versions = (mock.registryVersions[library.coordinatesKey] ?? []).filter(version =>
      !publishedVersions.has(version) && version.toLowerCase().includes(textFilter),
    )
    res.json({ versions: versions.slice(paging.offset, paging.offset + paging.limit) })
  })

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

  const getComparison = (req: Request, res: Response): LibraryComparison | undefined => {
    const current = libraryVersions.find(item =>
      item.libraryId === req.params.libraryId && item.version === req.params.version,
    )
    if (!current) {
      res.status(404).json({ status: 404, code: 'LIBRARY_VERSION_NOT_FOUND', message: 'Library version not found' })
      return
    }
    const previousLibraryId = typeof req.query.previousLibraryId === 'string'
      ? req.query.previousLibraryId
      : current.libraryId
    const previousVersion = typeof req.query.previousVersion === 'string'
      ? req.query.previousVersion
      : current.previousVersion
    const comparison = findComparison(current, previousLibraryId, previousVersion)
    if (!comparison) {
      res.status(404).json({
        status: 404,
        code: 'LIBRARY_COMPARISON_NOT_FOUND',
        message: 'No comparison has been computed for this version pair',
      })
      return
    }
    return comparison
  }

  router.get('/:libraryId/versions/:version/changes/summary', (req, res) => {
    const comparison = getComparison(req, res)
    if (comparison) res.json(comparison)
  })

  router.get('/:libraryId/versions/:version/changes', (req, res) => {
    const comparison = getComparison(req, res)
    if (!comparison) return
    const paging = getPaging(req, res)
    if (!paging) return
    const severities = queryValues(req.query.severity)
    const changeTypes = queryValues(req.query.changeType)
    if (
      severities.some(value => !['breaking', 'non-breaking', 'annotation'].includes(value)) ||
      changeTypes.some(value => !['added', 'removed', 'changed', 'deprecated'].includes(value))
    ) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Select a valid severity and change type' })
      return
    }
    const changes = mock.changes.filter(change =>
      (!severities.length || severities.includes(change.severity)) &&
      (!changeTypes.length || changeTypes.includes(change.changeType)) &&
      (!req.query.classId || req.query.classId === change.classId),
    )
    res.json({ comparison: comparison, changes: changes.slice(paging.offset, paging.offset + paging.limit) })
  })

  searchRouter.get('/', (req, res) => {
    if (typeof req.query.textFilter !== 'string' || req.query.version && !req.query.libraryId) {
      res.status(400).json({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Provide textFilter and a libraryId when filtering by version',
      })
      return
    }
    const paging = getPaging(req, res)
    if (!paging) return
    const kinds = queryValues(req.query.kind)
    if (kinds.some(kind => !['class', 'interface', 'enum', 'annotation', 'record'].includes(kind))) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Select a valid Java type kind' })
      return
    }
    const text = req.query.textFilter.toLowerCase()
    const classes = libraryVersions.filter(version =>
      version.libraryId === 'local-library-demo' &&
      mock.versions.some(seed => seed.version === version.version) &&
      (!req.query.libraryId || req.query.libraryId === version.libraryId) &&
      (!req.query.version || req.query.version === version.version),
    )
      .flatMap(version =>
        mock.classes.filter(item => !kinds.length || kinds.includes(item.kind))
          .filter(item =>
            version.version !== mock.versions[1].version || item.kind !== 'class' ||
            Number(item.classId.split('-')[1]) <= 112,
          )
          .flatMap(({ methods, ...item }) => {
            const result = { ...item, libraryId: version.libraryId, version: version.version }
            const versionMethods = version.version === mock.versions[1].version
              ? methods.map(method => ({ ...method, signature: method.signature.replace(', boolean', '') }))
              : item.kind === 'class' && Number(item.classId.split('-')[1]) <= 30
              ? []
              : methods
            return [
              ...(item.qualifiedName.toLowerCase().includes(text) ? [result] : []),
              ...(text
                ? versionMethods.filter(method => method.signature.toLowerCase().includes(text)).map(method => ({
                  ...result,
                  ...method,
                }))
                : []),
            ]
          }),
      )
    res.json({ classes: classes.slice(paging.offset, paging.offset + paging.limit) })
  })

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
        code: 'LIBRARY_VERSION_ALREADY_EXISTS',
        message: 'This version is already imported for the library',
      })
      return
    }
    if (body.previousVersion && !versions.some(version => version.version === body.previousVersion)) {
      res.status(400).json({
        status: 400,
        code: 'LIBRARY_PREVIOUS_VERSION_NOT_FOUND',
        message: 'Select a previous version published in this library',
      })
      return
    }
    const version: LibraryVersion = {
      libraryId: libraryId,
      version: body.version,
      previousVersion: body.previousVersion,
      status: body.status ?? 'draft',
      labels: body.labels ?? [],
      createdAt: new Date().toISOString(),
      createdBy: 'local-dev',
      metadata: {
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
  })

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

  const setFavorite = (isFavorite: boolean): RequestHandler => (req, res) => {
    const library = libraries.find(item => item.libraryId === req.params.libraryId)
    if (!library) {
      res.status(404).json({ status: 404, code: 'LIBRARY_NOT_FOUND', message: 'Library not found' })
      return
    }
    library.isFavorite = isFavorite
    res.sendStatus(204)
  }
  favoritesRouter.put('/:libraryId', setFavorite(true))
  favoritesRouter.delete('/:libraryId', setFavorite(false))

  return { libraries: router, classes: searchRouter, favorites: favoritesRouter }
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

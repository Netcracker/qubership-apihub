import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'

import { createApp } from '../createApp'

const CURRENT_VERSION = 'feature-demo-101-2026803.08456-build2'
const PREVIOUS_VERSION = 'master-20251002.125155-build144'
const BASE = '/libraries-backend/api/v1/libraries'
const VERSIONS = `${BASE}/local-library-test/versions`
const CATALOG = `${BASE}/local-library-demo`
const CATALOG_VERSIONS = `${CATALOG}/versions`
const SAMPLES = join(__dirname, '../../../../../api-doc-viewer/packages/samples/javaapi')

function libraryBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    alias: 'example',
    name: 'Example library',
    language: 'java',
    repository: 'maven-local',
    coordinates: { groupId: 'com.example', artifactId: 'example' },
    ...overrides,
  }
}

function readSample(name: string): unknown {
  return JSON.parse(readFileSync(join(SAMPLES, name), 'utf8'))
}

describe('Local Library Java API reports', () => {
  const REPORT = `${CATALOG_VERSIONS}/${CURRENT_VERSION}/java-api/report`

  it.each([CURRENT_VERSION, PREVIOUS_VERSION])('returns the complete report for seeded version %s', async version => {
    const expected = readSample('api-report.json')
    const result = await request(createApp())
      .get(`${CATALOG_VERSIONS}/${version}/java-api/report`).expect(200)
    expect(result.body).toEqual(expected)
  })

  it.each([
    { libraryId: 'missing', version: CURRENT_VERSION, code: 'LIBRARY_NOT_FOUND' },
    { libraryId: 'local-library-demo', version: 'missing', code: 'LIBRARY_VERSION_NOT_FOUND' },
  ])('returns $code for $libraryId / $version', async ({ libraryId, version, code }) => {
    const result = await request(createApp()).get(`${BASE}/${libraryId}/versions/${version}/java-api/report`).expect(
      404,
    )
    expect(result.body.code).toBe(code)
  })

  it('does not return the seeded report for a newly published version', async () => {
    const app = createApp()
    await request(app).post(VERSIONS).send({ version: CURRENT_VERSION }).expect(202)
    const result = await request(app).get(`${VERSIONS}/${CURRENT_VERSION}/java-api/report`).expect(404)
    expect(result.body.code).toBe('LIBRARY_JAVA_API_REPORT_NOT_FOUND')
  })

  it('does not return a report after its version is deleted', async () => {
    const app = createApp()
    await request(app).delete(`${CATALOG_VERSIONS}/${CURRENT_VERSION}`).expect(204)
    const result = await request(app).get(REPORT).expect(404)
    expect(result.body.code).toBe('LIBRARY_VERSION_NOT_FOUND')
  })
})

describe('Local Library Java API diffs', () => {
  const DIFF = `${CATALOG_VERSIONS}/${CURRENT_VERSION}/java-api/diff`

  it.each([
    {},
    { previousVersion: PREVIOUS_VERSION },
    { previousLibraryId: 'local-library-demo', previousVersion: PREVIOUS_VERSION },
  ])('returns the complete diff with previous version parameters %j', async query => {
    const expected = readSample('api-diff.json')
    const result = await request(createApp()).get(DIFF).query(query).expect(200)
    expect(result.body).toEqual(expected)
  })

  it.each([
    { previousVersion: 'missing' },
    { previousVersion: CURRENT_VERSION },
    { previousLibraryId: 'local-library-test', previousVersion: PREVIOUS_VERSION },
  ])('returns comparison not found for an uncomputed pair %j', async query => {
    const result = await request(createApp()).get(DIFF).query(query).expect(404)
    expect(result.body.code).toBe('LIBRARY_COMPARISON_NOT_FOUND')
  })

  it('returns comparison not found for the previous version without a predecessor', async () => {
    const result = await request(createApp())
      .get(`${CATALOG_VERSIONS}/${PREVIOUS_VERSION}/java-api/diff`).expect(404)
    expect(result.body.code).toBe('LIBRARY_COMPARISON_NOT_FOUND')
  })

  it('returns comparison not found after the predecessor is deleted', async () => {
    const app = createApp()
    await request(app).delete(`${CATALOG_VERSIONS}/${PREVIOUS_VERSION}`).expect(204)
    const result = await request(app).get(DIFF).expect(404)
    expect(result.body.code).toBe('LIBRARY_COMPARISON_NOT_FOUND')
  })

  it.each([
    { libraryId: 'missing', version: CURRENT_VERSION, code: 'LIBRARY_NOT_FOUND' },
    { libraryId: 'local-library-demo', version: 'missing', code: 'LIBRARY_VERSION_NOT_FOUND' },
  ])('returns $code for $libraryId / $version', async ({ libraryId, version, code }) => {
    const result = await request(createApp()).get(`${BASE}/${libraryId}/versions/${version}/java-api/diff`).expect(404)
    expect(result.body.code).toBe(code)
  })
})

describe('Local Library changes', () => {
  const CHANGES = `${CATALOG_VERSIONS}/${CURRENT_VERSION}/changes`

  it('returns backend change rows and summary counts from the diff sample', async () => {
    const app = createApp()
    const result = await request(app).get(CHANGES).expect(200)
    const summary = await request(app).get(`${CHANGES}/summary`).expect(200)
    expect(result.body.comparison).toEqual(summary.body)
    expect(result.body.changes).toHaveLength(7)
    expect(summary.body.changeCounts).toEqual({
      breaking: 6,
      'non-breaking': 1,
      annotation: 0,
      added: 1,
      removed: 4,
      changed: 2,
      deprecated: 0,
    })
    expect(result.body.changes).toContainEqual(expect.objectContaining({
      changeId: expect.any(String),
      classId: 'com.example.catalog.model.Order',
      changeType: 'removed',
      severity: 'breaking',
      details: expect.objectContaining({
        elementType: 'METHOD',
        member: 'java.util.List getTagIds()',
        status: 'REMOVED',
      }),
    }))
  })

  it('pages filtered changes and preserves the comparison summary', async () => {
    const app = createApp()
    const query = { classId: 'com.example.catalog.model.Order', changeType: 'removed', limit: 1 }
    const first = await request(app).get(CHANGES).query({ ...query, page: 0 }).expect(200)
    const second = await request(app).get(CHANGES).query({ ...query, page: 1 }).expect(200)
    expect(first.body.changes).toHaveLength(1)
    expect(second.body.changes).toHaveLength(1)
    expect(first.body.changes[0].changeId).not.toBe(second.body.changes[0].changeId)
    expect(first.body.comparison).toEqual(second.body.comparison)
    expect(first.body.changes[0]).toMatchObject({ classId: query.classId, changeType: 'removed' })
    await request(app).get(CHANGES).query({ ...query, page: 3 }).expect(200, {
      comparison: first.body.comparison,
      changes: [],
    })
  })

  it.each([{}, { previousLibraryId: 'local-library-demo', previousVersion: PREVIOUS_VERSION }])(
    'resolves the comparison parameters %j',
    async query => {
      await request(createApp()).get(CHANGES).query(query).expect(200)
    },
  )

  it.each(['', '/summary'])('returns code 3200 for an uncomputed pair on changes%s', async suffix => {
    const result = await request(createApp()).get(`${CHANGES}${suffix}`)
      .query({ previousLibraryId: 'local-library-test', previousVersion: PREVIOUS_VERSION }).expect(404)
    expect(result.body.code).toBe('3200')
  })

  it.each([{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { page: -1 }])(
    'rejects invalid changes pagination %j',
    async query => {
      await request(createApp()).get(CHANGES).query(query).expect(400)
    },
  )
})

describe('Local Library API', () => {
  it('returns the seeded test library by name and ID', async () => {
    const app = createApp()
    const list = await request(app).get(BASE).query({ textFilter: 'TEST' }).expect(200)
    expect(list.body.libraries).toEqual([expect.objectContaining({
      libraryId: 'local-library-test',
      name: 'Library (JavaAPI) test',
      parentPackageId: 'DEMO',
      coordinates: { groupId: 'com.example', artifactId: 'test' },
    })])
    const details = await request(app).get(`${BASE}/local-library-test`).expect(200)
    expect(details.body).toEqual(list.body.libraries[0])
  })

  it('creates a private Java library and lists it under its selected parent', async () => {
    const app = createApp()
    const body = libraryBody({
      parentPackageId: 'workspace.group',
      description: 'Library for local UI development',
      defaultRole: 'none',
    })
    const created = await request(app).post(BASE).send(body).expect(201)
    expect(created.body).toMatchObject({ ...body, coordinatesKey: 'com.example:example', isFavorite: false })
    await request(app).get(`${BASE}/${created.body.libraryId}`).expect(200, created.body)
    const list = await request(app).get(BASE).query({ parentPackageId: 'workspace.group' }).expect(200)
    expect(list.body.libraries).toEqual([created.body])
    await request(app).get(BASE).query({ parentPackageId: 'another-workspace' }).expect(200, { libraries: [] })
  })

  it('rejects duplicate repository and Maven coordinates', async () => {
    const result = await request(createApp()).post(BASE).send(libraryBody({
      coordinates: { groupId: 'com.example', artifactId: 'test' },
    })).expect(409)
    expect(result.body.code).toBe('3001')
  })

  it('creates a library without verifying its artifact in the registry', async () => {
    const app = createApp()
    const body = libraryBody({
      repository: 'unverified-repository',
      coordinates: { groupId: 'com.example', artifactId: 'missing-artifact' },
    })
    const result = await request(app).post(BASE).send(body).expect(201)
    expect(result.body).toMatchObject(body)
    await request(app).get(BASE).query({ repository: 'unverified-repository' })
      .expect(200, { libraries: [result.body] })
  })

  it.each([
    { name: 'Incomplete library' },
    libraryBody({ name: 1 }),
  ])('rejects invalid Library fields: %j', async body => {
    const result = await request(createApp()).post(BASE).send(body).expect(400)
    expect(result.body.code).toBe('BAD_REQUEST')
  })
})

describe('Local Library permissions and members', () => {
  const MEMBERS = `${BASE}/local-library-test/members`
  const CATALOG_MEMBERS = `${CATALOG}/members`

  it('returns all package permissions on list, detail, create, and update responses', async () => {
    const app = createApp()
    const permissions = [
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
    const list = await request(app).get(BASE).expect(200)
    const details = await request(app).get(`${BASE}/local-library-test`).expect(200)
    expect(details.body.permissions).toEqual(permissions)
    const created = await request(app).post(BASE).send(libraryBody()).expect(201)
    const updated = await request(app).patch(`${BASE}/${created.body.libraryId}`).send({ name: 'Updated' }).expect(200)
    for (const library of [...list.body.libraries, created.body, updated.body]) {
      expect(library.permissions).toEqual(details.body.permissions)
    }
  })

  it('lists the seeded owners and the catalog inherited viewer', async () => {
    const app = createApp()
    const owner = {
      user: { userId: 'local-dev', name: 'Local Developer' },
      roles: [{ roleId: 'owner', role: 'Owner' }],
    }
    await request(app).get(MEMBERS).expect(200, { members: [owner] })
    await request(app).get(CATALOG_MEMBERS).expect(200, {
      members: [owner, {
        user: { userId: 'demo-viewer', name: 'demo-viewer' },
        roles: [{
          roleId: 'viewer',
          role: 'Viewer',
          inheritedFrom: { packageId: 'DEMO', kind: 'workspace', name: 'DEMO' },
        }],
      }],
    })
  })

  it('upserts unknown users with their direct roles', async () => {
    const app = createApp()
    await request(app).put(`${MEMBERS}/new-user`)
      .send({ roleIds: ['admin', 'release-manager', 'editor', 'viewer'] }).expect(204)
    const added = await request(app).get(MEMBERS).expect(200)
    expect(added.body.members).toContainEqual({
      user: { userId: 'new-user', name: 'new-user' },
      roles: [
        { roleId: 'admin', role: 'Admin' },
        { roleId: 'release-manager', role: 'Release Manager' },
        { roleId: 'editor', role: 'Editor' },
        { roleId: 'viewer', role: 'Viewer' },
      ],
    })
  })

  it('replaces direct roles', async () => {
    const app = createApp()
    await request(app).put(`${MEMBERS}/new-user`).send({ roleIds: ['viewer'] }).expect(204)
    await request(app).put(`${MEMBERS}/new-user`).send({ roleIds: ['owner'] }).expect(204)
    const replaced = await request(app).get(MEMBERS).expect(200)
    expect(replaced.body.members).toContainEqual({
      user: { userId: 'new-user', name: 'new-user' },
      roles: [{ roleId: 'owner', role: 'Owner' }],
    })
  })

  it('clears empty assignments', async () => {
    const app = createApp()
    await request(app).put(`${MEMBERS}/new-user`).send({ roleIds: ['owner'] }).expect(204)
    await request(app).put(`${MEMBERS}/new-user`).send({ roleIds: [] }).expect(204)
    const cleared = await request(app).get(MEMBERS).expect(200)
    expect(cleared.body.members).toHaveLength(1)
    expect(cleared.body.members[0].user.userId).toBe('local-dev')
  })

  it('keeps inherited roles when direct roles are replaced, cleared, or deleted', async () => {
    const app = createApp()
    const seeded = await request(app).get(CATALOG_MEMBERS).expect(200)
    const [, inherited] = seeded.body.members
    await request(app).put(`${CATALOG_MEMBERS}/demo-viewer`).send({ roleIds: ['editor'] }).expect(204)
    const updated = await request(app).get(CATALOG_MEMBERS).expect(200)
    expect(updated.body.members[1].roles).toEqual([...inherited.roles, { roleId: 'editor', role: 'Editor' }])
    await request(app).put(`${CATALOG_MEMBERS}/demo-viewer`).send({ roleIds: [] }).expect(204)
    const cleared = await request(app).get(CATALOG_MEMBERS).expect(200)
    expect(cleared.body.members[1]).toEqual(inherited)
    await request(app).put(`${CATALOG_MEMBERS}/demo-viewer`).send({ roleIds: ['editor'] }).expect(204)
    await request(app).delete(`${CATALOG_MEMBERS}/demo-viewer`).expect(204)
    const deleted = await request(app).get(CATALOG_MEMBERS).expect(200)
    expect(deleted.body.members[1]).toEqual(inherited)
  })

  it('deletes a direct member and returns 404 when the member is missing', async () => {
    const app = createApp()
    await request(app).delete(`${MEMBERS}/local-dev`).expect(204)
    await request(app).get(MEMBERS).expect(200, { members: [] })
    const missing = await request(app).delete(`${MEMBERS}/local-dev`).expect(404)
    expect(missing.body.code).toBe('LIBRARY_MEMBER_NOT_FOUND')
  })

  it('makes members unavailable when their library is deleted', async () => {
    const app = createApp()
    await request(app).delete(`${BASE}/local-library-test`).expect(204)
    const result = await request(app).get(MEMBERS).expect(404)
    expect(result.body.code).toBe('LIBRARY_NOT_FOUND')
  })

  it('returns LIBRARY_NOT_FOUND on unknown library members', async () => {
    const result = await request(createApp()).get(`${BASE}/missing/members`).expect(404)
    expect(result.body.code).toBe('LIBRARY_NOT_FOUND')
  })

  it.each([{}, { roleIds: ['unknown'] }].map(body => ({ body })))(
    'rejects invalid member roles: %j',
    async ({ body }) => {
      const result = await request(createApp()).put(`${MEMBERS}/new-user`).send(body).expect(400)
      expect(result.body.code).toBe('BAD_REQUEST')
    },
  )
})

describe('Local Library API keys', () => {
  const API_KEYS = `${BASE}/local-library-test/apiKeys`
  const CATALOG_API_KEYS = `${CATALOG}/apiKeys`

  it('returns a 64-hex secret on creation and lists only metadata in that library', async () => {
    const app = createApp()
    await request(app).get(API_KEYS).expect(200, { apiKeys: [] })
    const created = await request(app).post(API_KEYS)
      .send({ name: 'CI token', roles: ['viewer'], createdFor: 'new-user' }).expect(200)
    expect(created.body).toEqual({
      id: expect.any(String),
      libraryId: 'local-library-test',
      name: 'CI token',
      createdAt: expect.any(String),
      createdBy: { id: 'local-dev', name: 'Local Developer' },
      createdFor: { id: 'new-user', name: 'new-user' },
      roles: ['viewer'],
      apiKey: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
    const { apiKey, ...metadata } = created.body
    expect(apiKey).not.toBe(metadata.id)
    await request(app).get(API_KEYS).expect(200, { apiKeys: [metadata] })
    await request(app).get(CATALOG_API_KEYS).expect(200, { apiKeys: [] })
  })

  it('defaults omitted roles to an empty list and names the known local user', async () => {
    const created = await request(createApp()).post(API_KEYS)
      .send({ name: 'Local token', createdFor: 'local-dev' }).expect(200)
    expect(created.body).toMatchObject({ roles: [], createdFor: { id: 'local-dev', name: 'Local Developer' } })
  })

  it('deletes a key only in its own library and returns 404 when it is missing', async () => {
    const app = createApp()
    const created = await request(app).post(API_KEYS).send({ name: 'Token', createdFor: 'local-dev' }).expect(200)
    const foreign = await request(app).delete(`${CATALOG_API_KEYS}/${created.body.id}`).expect(404)
    expect(foreign.body.code).toBe('LIBRARY_API_KEY_NOT_FOUND')
    await request(app).delete(`${API_KEYS}/${created.body.id}`).expect(204)
    await request(app).get(API_KEYS).expect(200, { apiKeys: [] })
    const missing = await request(app).delete(`${API_KEYS}/${created.body.id}`).expect(404)
    expect(missing.body.code).toBe('LIBRARY_API_KEY_NOT_FOUND')
  })

  it('returns LIBRARY_NOT_FOUND on unknown library keys', async () => {
    const result = await request(createApp()).get(`${BASE}/missing/apiKeys`).expect(404)
    expect(result.body.code).toBe('LIBRARY_NOT_FOUND')
  })

  it.each([
    {},
    { name: 'Token', createdFor: 1 },
  ].map(body => ({ body })))('rejects invalid API key fields: %j', async ({ body }) => {
    const result = await request(createApp()).post(API_KEYS).send(body).expect(400)
    expect(result.body.code).toBe('BAD_REQUEST')
  })
})

describe('Local Library release summaries', () => {
  it('lists the newest release and the breaking changes of the diff sample', async () => {
    const app = createApp()
    const list = await request(app).get(BASE).query({ textFilter: 'catalog' }).expect(200)
    expect(list.body.libraries).toEqual([expect.objectContaining({
      libraryId: 'local-library-demo',
      parentPackageId: 'DEMO',
      latestRelease: CURRENT_VERSION,
      breakingChangesCount: 4,
    })])
    const details = await request(app).get(CATALOG).expect(200)
    expect(details.body).toEqual(list.body.libraries[0])
  })

  it('omits release summary fields for a library with no releases', async () => {
    const list = await request(createApp()).get(BASE).query({ textFilter: 'test' }).expect(200)
    expect(list.body.libraries[0]).not.toHaveProperty('latestRelease')
    expect(list.body.libraries[0]).not.toHaveProperty('breakingChangesCount')
  })

  it('ignores drafts and recomputes the latest release after status changes and deletion', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
    try {
      const app = createApp()
      await request(app).post(VERSIONS).send({ version: '1.0.0', status: 'release' }).expect(202)
      await request(app).patch(`${VERSIONS}/1.0.0`).send({ status: 'release' }).expect(200)
      await request(app).post(VERSIONS).send({ version: '2.0.0', previousVersion: '1.0.0' }).expect(202)
      const withDraft = await request(app).get(BASE).query({ textFilter: 'test' }).expect(200)
      expect(withDraft.body.libraries[0]).toMatchObject({ latestRelease: '1.0.0', breakingChangesCount: 0 })
      await request(app).patch(`${VERSIONS}/2.0.0`).send({ status: 'release' }).expect(200)
      const promoted = await request(app).get(BASE).query({ textFilter: 'test' }).expect(200)
      expect(promoted.body.libraries[0]).toMatchObject({ latestRelease: '2.0.0', breakingChangesCount: 0 })
      await request(app).delete(`${VERSIONS}/2.0.0`).expect(204)
      const deleted = await request(app).get(BASE).query({ textFilter: 'test' }).expect(200)
      expect(deleted.body.libraries[0]).toMatchObject({ latestRelease: '1.0.0', breakingChangesCount: 0 })
    } finally {
      jest.useRealTimers()
    }
  })

  it('reports zero when the seeded comparison predecessor no longer exists', async () => {
    const app = createApp()
    await request(app).delete(`${CATALOG_VERSIONS}/${PREVIOUS_VERSION}`).expect(204)
    const list = await request(app).get(BASE).query({ textFilter: 'catalog' }).expect(200)
    expect(list.body.libraries[0]).toMatchObject({ latestRelease: CURRENT_VERSION, breakingChangesCount: 0 })
  })
})

describe('Local Library favorites', () => {
  const FAVORITES = '/libraries-backend/api/v1/favorites/libraries'
  const LIBRARY_ID = 'local-library-test'

  it('stars the library record and includes it in the Favorites filter', async () => {
    const app = createApp()
    await request(app).put(`${FAVORITES}/${LIBRARY_ID}`).expect(204)
    const details = await request(app).get(`${BASE}/${LIBRARY_ID}`).expect(200)
    expect(details.body.isFavorite).toBe(true)
    const list = await request(app).get(BASE).expect(200)
    expect(list.body.libraries).toContainEqual(details.body)
    await request(app).get(BASE).query({ onlyFavorite: true }).expect(200, { libraries: [details.body] })
  })

  it('lists favorites across parents when no parent filter is provided', async () => {
    const app = createApp()
    const unparented = await request(app).post(BASE).send(libraryBody({
      coordinates: { groupId: 'com.example', artifactId: 'unassigned' },
    })).expect(201)
    const parented = await request(app).post(BASE).send(libraryBody({
      coordinates: { groupId: 'com.example', artifactId: 'parented' },
      parentPackageId: 'workspace',
    })).expect(201)
    await request(app).put(`${FAVORITES}/${unparented.body.libraryId}`).expect(204)
    await request(app).put(`${FAVORITES}/${parented.body.libraryId}`).expect(204)
    const list = await request(app).get(BASE)
      .query({ onlyFavorite: true, language: 'java', textFilter: 'library' }).expect(200)
    expect(list.body.libraries).toEqual([
      expect.objectContaining({ libraryId: unparented.body.libraryId, isFavorite: true }),
      expect.objectContaining({ libraryId: parented.body.libraryId, parentPackageId: 'workspace', isFavorite: true }),
    ])
    expect(list.body.libraries[0]).not.toHaveProperty('parentPackageId')
  })

  it('clears the library favorite and removes it from the Favorites filter', async () => {
    const app = createApp()
    await request(app).put(`${FAVORITES}/${LIBRARY_ID}`).expect(204)
    await request(app).delete(`${FAVORITES}/${LIBRARY_ID}`).expect(204)
    const details = await request(app).get(`${BASE}/${LIBRARY_ID}`).expect(200)
    expect(details.body.isFavorite).toBe(false)
    const list = await request(app).get(BASE).expect(200)
    expect(list.body.libraries).toContainEqual(details.body)
    await request(app).get(BASE).query({ onlyFavorite: true }).expect(200, { libraries: [] })
  })

  it('returns LIBRARY_NOT_FOUND on an unknown library', async () => {
    const result = await request(createApp()).put(`${FAVORITES}/missing`).expect(404)
    expect(result.body.code).toBe('LIBRARY_NOT_FOUND')
  })
})

describe('Local Library available versions', () => {
  const AVAILABLE_VERSIONS = `${CATALOG}/available-versions`
  const RELEASE_VERSIONS = [
    { version: 'release-demo-2.2.0-2026216.12170-build4' },
    { version: 'release-demo-2.1.0-2020803.90000-build14' },
  ]

  it('filters available versions case-insensitively and lists the newest first', async () => {
    const app = createApp()
    await request(app).get(AVAILABLE_VERSIONS).query({ textFilter: 'RELEASE' })
      .expect(200, { versions: RELEASE_VERSIONS })
    await request(app).get(AVAILABLE_VERSIONS).query({ textFilter: '2.2.0' })
      .expect(200, { versions: [RELEASE_VERSIONS[0]] })
    await request(app).get(AVAILABLE_VERSIONS).query({ textFilter: 'missing' })
      .expect(200, { versions: [] })
  })

  it('excludes imported versions until they are deleted', async () => {
    const app = createApp()
    await request(app).get(AVAILABLE_VERSIONS).expect(200, { versions: RELEASE_VERSIONS })
    const published = await request(app).post(CATALOG_VERSIONS)
      .send({ version: RELEASE_VERSIONS[0].version }).expect(202)
    await request(app).get(`${CATALOG_VERSIONS}/${RELEASE_VERSIONS[0].version}`)
      .expect(200, published.body)
    await request(app).get(AVAILABLE_VERSIONS).expect(200, { versions: [RELEASE_VERSIONS[1]] })
    await request(app).delete(`${CATALOG_VERSIONS}/${RELEASE_VERSIONS[0].version}`).expect(204)
    await request(app).get(AVAILABLE_VERSIONS).expect(200, { versions: RELEASE_VERSIONS })
  })

  it('pages the filtered available versions', async () => {
    const app = createApp()
    await request(app).get(AVAILABLE_VERSIONS).query({ textFilter: 'release', limit: 1, page: 0 })
      .expect(200, { versions: [RELEASE_VERSIONS[0]] })
    await request(app).get(AVAILABLE_VERSIONS).query({ textFilter: 'release', limit: 1, page: 1 })
      .expect(200, { versions: [RELEASE_VERSIONS[1]] })
    await request(app).get(AVAILABLE_VERSIONS).query({ limit: 1, page: 2 })
      .expect(200, { versions: [] })
  })

  it.each([{ limit: 0 }, { page: 'invalid' }])(
    'rejects invalid available versions pagination: %j',
    async query => {
      const result = await request(createApp()).get(AVAILABLE_VERSIONS).query(query).expect(400)
      expect(result.body.code).toBe('BAD_REQUEST')
    },
  )

  it('returns LIBRARY_NOT_FOUND for an unknown library', async () => {
    const result = await request(createApp()).get(`${BASE}/missing/available-versions`).expect(404)
    expect(result.body.code).toBe('LIBRARY_NOT_FOUND')
  })
})

describe('Local Library publishing', () => {
  it('imports a first version as a draft and makes it readable', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
    try {
      const app = createApp()
      const created = await request(app).post(VERSIONS).send({ version: '1.0.0', labels: ['test 1'] }).expect(202)
      expect(created.body).toMatchObject({
        libraryId: 'local-library-test',
        version: '1.0.0',
        status: 'draft',
        labels: ['test 1'],
        metadata: { buildId: expect.any(String), buildStatus: 'none', activities: expect.any(Array) },
      })
      expect(created.body.previousVersion).toBeUndefined()
      await request(app).get(`${VERSIONS}/1.0.0`).expect(200, created.body)
      await request(app).get(VERSIONS).query({ textFilter: 'TEST 1' }).expect(200, { versions: [created.body] })
    } finally {
      jest.useRealTimers()
    }
  })

  it('keeps the requested previous version and labels on the draft and lists the newest version first', async () => {
    const app = createApp()
    await request(app).post(VERSIONS).send({ version: '1.0.0', status: 'release' }).expect(202)
    const body = { version: '2.0.0', previousVersion: '1.0.0', status: 'release', labels: ['test 1', 'stable'] }
    const created = await request(app).post(VERSIONS).send(body).expect(202)
    expect(created.body).toMatchObject({ ...body, status: 'draft', metadata: { buildStatus: 'none' } })
    const list = await request(app).get(VERSIONS).expect(200)
    expect(list.body.versions.map((version: { version: string }) => version.version)).toEqual(['2.0.0', '1.0.0'])
  })

  it('completes the build asynchronously and promotes the version to release', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
    try {
      const app = createApp()
      const created = await request(app).post(VERSIONS).send({ version: '1.0.0' }).expect(202)
      expect(created.body).toMatchObject({ status: 'draft', metadata: { buildStatus: 'none' } })
      jest.runOnlyPendingTimers()
      const completed = await request(app).get(`${VERSIONS}/1.0.0`).expect(200)
      expect(completed.body).toEqual({
        ...created.body,
        status: 'release',
        metadata: { ...created.body.metadata, buildStatus: 'complete' },
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it('rejects a duplicate version', async () => {
    const app = createApp()
    await request(app).post(VERSIONS).send({ version: '1.0.0' }).expect(202)
    const duplicate = await request(app).post(VERSIONS).send({ version: '1.0.0' }).expect(409)
    expect(duplicate.body.code).toBe('3101')
  })

  it('rejects a previous version from another library', async () => {
    const app = createApp()
    await request(app).post(VERSIONS).send({ version: '1.0.0' }).expect(202)
    const library = await request(app).post(BASE).send(libraryBody({
      coordinates: { groupId: 'com.example', artifactId: 'another' },
    })).expect(201)
    const result = await request(app).post(`${BASE}/${library.body.libraryId}/versions`)
      .send({ version: '2.0.0', previousVersion: '1.0.0' }).expect(400)
    expect(result.body.code).toBe('3105')
  })

  it.each([
    { version: ' ' },
    { version: '1.0.0', labels: 'test 1' },
  ])('rejects invalid publication fields: %j', async body => {
    const result = await request(createApp()).post(VERSIONS).send(body).expect(400)
    expect(result.body.code).toBe('BAD_REQUEST')
  })

  it('rejects publication to a library that does not exist', async () => {
    const result = await request(createApp()).post(`${BASE}/missing/versions`).send({ version: '1.0.0' }).expect(404)
    expect(result.body.code).toBe('LIBRARY_NOT_FOUND')
  })
})

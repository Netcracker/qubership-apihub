import type { Express } from 'express'
import request from 'supertest'

import { createApp } from '../createApp'

const BASE = '/docs-backend/api/v1'

let app: Express

beforeEach(() => {
  app = createApp()
  delete process.env.MOCK_ANONYMOUS
  delete process.env.MOCK_ANONYMOUS_ACCESS
  delete process.env.MOCK_DOCS_ROLE
})

describe('system configuration registers the docs extension', () => {
  it('lists docs-backend in extensions', async () => {
    const res = await request(app).get('/api/v2/system/configuration')
    expect(res.body.extensions).toEqual([expect.objectContaining({ name: 'docs-backend', pathPrefix: 'docs-backend' })])
  })
})

describe('public articles', () => {
  it('returns generic published articles for an authenticated user, including corporate ones', async () => {
    const res = await request(app).get(`${BASE}/articles?scope=generic`)
    expect(res.status).toBe(200)
    const visibilities = res.body.articles.map((article: { visibility: string }) => article.visibility)
    expect(visibilities).toContain('public')
    expect(visibilities).toContain('corporate')
    expect(res.body.articles[0]).not.toHaveProperty('id')
    expect(res.body.articles[0]).not.toHaveProperty('bodyMd')
  })

  it('hides corporate articles from anonymous visitors', async () => {
    process.env.MOCK_ANONYMOUS = 'true'
    const list = await request(app).get(`${BASE}/articles?scope=generic`)
    expect(list.status).toBe(200)
    expect(list.body.articles.every((article: { visibility: string }) => article.visibility === 'public')).toBe(true)

    const detail = await request(app).get(`${BASE}/articles/security-checklist`)
    expect(detail.status).toBe(404)
  })

  it('returns 401 for anonymous when anonymous access is disabled', async () => {
    process.env.MOCK_ANONYMOUS = 'true'
    process.env.MOCK_ANONYMOUS_ACCESS = 'false'
    const res = await request(app).get(`${BASE}/articles?scope=generic`)
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('DOCS-1001')
  })

  it('returns the body of a generic article', async () => {
    const res = await request(app).get(`${BASE}/articles/authentication`)
    expect(res.status).toBe(200)
    expect(res.body.bodyMd).toContain('# Authentication')
  })

  it('lists package articles for a version, including version-less ones', async () => {
    const res = await request(app).get(`${BASE}/articles?scope=package&packageId=package-some&version=2.6`)
    expect(res.status).toBe(200)
    // only the published one
    expect(res.body.articles.map((article: { slug: string }) => article.slug)).toEqual(['some-package-overview'])
  })

  it('requires packageId and version for package scope', async () => {
    const res = await request(app).get(`${BASE}/articles?scope=package`)
    expect(res.status).toBe(400)
  })

  it('serves the files of a public article', async () => {
    const res = await request(app).get(`${BASE}/articles/onboarding/files/environments.png`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('image/png')
    expect(res.headers['etag']).toBeTruthy()
  })
})

describe('admin articles', () => {
  it('rejects anonymous and non-admin callers', async () => {
    process.env.MOCK_ANONYMOUS = 'true'
    expect((await request(app).get(`${BASE}/admin/articles`)).status).toBe(401)
    delete process.env.MOCK_ANONYMOUS
    process.env.MOCK_DOCS_ROLE = 'user'
    expect((await request(app).get(`${BASE}/admin/articles`)).status).toBe(403)
  })

  it('filters the admin list by scope and package', async () => {
    const generic = await request(app).get(`${BASE}/admin/articles?scope=generic`)
    expect(generic.status).toBe(200)
    expect(generic.body.articles.length).toBeGreaterThan(0)
    expect(generic.body.articles.every((article: { scope: string }) => article.scope === 'generic')).toBe(true)
    const ofPackage = await request(app).get(`${BASE}/admin/articles?scope=package&packageId=package-some`)
    expect(ofPackage.body.articles.map((article: { slug: string }) => article.slug).sort())
      .toEqual(['some-package-changelog', 'some-package-overview'])
    const ofOtherPackage = await request(app).get(`${BASE}/admin/articles?scope=package&packageId=package-other`)
    expect(ofOtherPackage.body.articles).toEqual([])
  })

  it('creates, updates, toggles and deletes an article', async () => {
    const created = await request(app)
      .post(`${BASE}/admin/articles`)
      .set('Content-Type', 'application/json')
      .send({ slug: 'test-article', title: 'Test', scope: 'generic', visibility: 'public', bodyMd: '# Test' })
    expect(created.status).toBe(201)
    expect(created.body.id).toBeTruthy()
    expect(created.body.published).toBe(false)

    const duplicate = await request(app)
      .post(`${BASE}/admin/articles`)
      .set('Content-Type', 'application/json')
      .send({ slug: 'test-article', title: 'Dup', scope: 'generic', visibility: 'public', bodyMd: 'x' })
    expect(duplicate.status).toBe(409)

    const published = await request(app).post(`${BASE}/admin/articles/${created.body.id}/publish`)
    expect(published.body.published).toBe(true)

    const updated = await request(app)
      .put(`${BASE}/admin/articles/${created.body.id}`)
      .set('Content-Type', 'application/json')
      .send({ slug: 'test-article', title: 'Test 2', scope: 'generic', visibility: 'corporate', bodyMd: '# Test 2', published: true })
    expect(updated.status).toBe(200)
    expect(updated.body.title).toBe('Test 2')

    const deleted = await request(app).delete(`${BASE}/admin/articles/${created.body.id}`)
    expect(deleted.status).toBe(204)
    expect((await request(app).get(`${BASE}/articles/test-article`)).status).toBe(404)
  })

  it('validates package articles', async () => {
    const res = await request(app)
      .post(`${BASE}/admin/articles`)
      .set('Content-Type', 'application/json')
      .send({ slug: 'bad-package-article', title: 'Bad', scope: 'package', packageId: 'package-some' })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('DOCS-3001')
  })

  it('uploads a file under an explicit relative path and serves it', async () => {
    const article = (await request(app).get(`${BASE}/admin/articles?scope=generic`)).body.articles.find((item: { slug: string }) => item.slug === 'onboarding')
    const uploaded = await request(app)
      .post(`${BASE}/admin/articles/${article.id}/files`)
      .field('path', 'docs/test.txt')
      .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' })
    expect(uploaded.status).toBe(201)
    expect(uploaded.body.files[0].path).toBe('docs/test.txt')
    expect(uploaded.body.files[0].size).toBe(5)
    expect(uploaded.body.files[0].checksum).toBeDefined()

    const fetched = await request(app).get(`${BASE}/articles/onboarding/files/docs/test.txt`)
    expect(fetched.status).toBe(200)
    expect(fetched.text).toBe('hello')
    // the same path on another article is a different (missing) file
    expect((await request(app).get(`${BASE}/articles/authentication/files/docs/test.txt`)).status).toBe(404)

    const deleted = await request(app).delete(`${BASE}/admin/articles/${article.id}/files/docs/test.txt`)
    expect(deleted.status).toBe(204)
    expect((await request(app).get(`${BASE}/articles/onboarding/files/docs/test.txt`)).status).toBe(404)
  })

  it('attaches, lists and deletes files of an article', async () => {
    const created = await request(app)
      .post(`${BASE}/admin/articles`)
      .set('Content-Type', 'application/json')
      .send({ slug: 'files-article', title: 'Files', scope: 'generic', visibility: 'public', bodyMd: '# Files', published: true })
    expect(created.status).toBe(201)
    const {id} = created.body

    const uploaded = await request(app)
      .post(`${BASE}/admin/articles/${id}/files`)
      .attach('file', Buffer.from('a'), { filename: 'a.txt', contentType: 'text/plain' })
      .attach('file', Buffer.from('bb'), { filename: 'b.txt', contentType: 'text/plain' })
    expect(uploaded.status).toBe(201)
    expect(uploaded.body.files.map((file: { path: string }) => file.path)).toEqual(['a.txt', 'b.txt'])
    // the same path again within the article conflicts
    const conflict = await request(app)
      .post(`${BASE}/admin/articles/${id}/files`)
      .attach('file', Buffer.from('a'), { filename: 'a.txt', contentType: 'text/plain' })
    expect(conflict.status).toBe(409)
    expect(conflict.body.code).toBe('DOCS-3012')

    const listed = await request(app).get(`${BASE}/admin/articles/${id}/files`)
    expect(listed.body.files).toHaveLength(2)

    const publicView = await request(app).get(`${BASE}/articles/files-article`)
    expect(publicView.body.files).toHaveLength(2)
    expect(publicView.body.files[0]).not.toHaveProperty('checksum')
    expect((await request(app).get(`${BASE}/articles/files-article/files/a.txt`)).status).toBe(200)

    expect((await request(app).delete(`${BASE}/admin/articles/${id}/files/a.txt`)).status).toBe(204)
    expect((await request(app).delete(`${BASE}/admin/articles/${id}/files/b.txt`)).status).toBe(204)
    expect((await request(app).get(`${BASE}/admin/articles/${id}/files`)).body.files).toHaveLength(0)
    await request(app).delete(`${BASE}/admin/articles/${id}`)
  })

  it('relays APIHUB versions and markdown documents', async () => {
    const versions = await request(app).get(`${BASE}/admin/apihub/packages/package-some/versions`)
    expect(versions.status).toBe(200)
    expect(versions.body.versions.length).toBeGreaterThan(0)
    const documents = await request(app).get(`${BASE}/admin/apihub/packages/package-some/versions/2.6.1/documents`)
    expect(documents.body.documents.every((document: { type: string }) => document.type === 'markdown')).toBe(true)
  })

  it('exports a zip archive', async () => {
    const res = await request(app).get(`${BASE}/admin/export`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/zip')
    expect(res.headers['content-disposition']).toContain('documents-export.zip')
  })
})

describe('navigation', () => {
  const sectionTitles = (body: { sections: { title: string }[] }): string[] => body.sections.map(section => section.title)
  const slugsOf = (section: { items: { slug?: string; children: { slug?: string }[] }[] }): (string | undefined)[] =>
    section.items.flatMap(item => [item.slug, ...item.children.map(child => child.slug)]).filter(Boolean)

  it('returns the generic tree for an admin with the synthetic section for unplaced articles', async () => {
    const res = await request(app).get(`${BASE}/navigation?scope=generic`)
    expect(res.status).toBe(200)
    expect(sectionTitles(res.body)).toEqual(['Getting started', 'Integration', 'Reference', 'Other'])
    const [gettingStarted, integration, , other] = res.body.sections
    expect(gettingStarted.items.map((item: { title: string }) => item.title)).toEqual(['Start here', 'Onboarding and environments', 'Sandbox and test data'])
    expect(gettingStarted.items[0]).not.toHaveProperty('articleId')
    const group = integration.items.find((item: { kind: string }) => item.kind === 'group')
    expect(group.title).toBe('Resilience')
    expect(group.children.map((child: { slug: string }) => child.slug)).toEqual(['error-handling', 'rate-limits'])
    expect(other.synthetic).toBe(true)
    expect(slugsOf(other)).toEqual(['glossary'])
  })

  it('drops invisible guides and emptied groups for anonymous visitors', async () => {
    process.env.MOCK_ANONYMOUS = 'true'
    const res = await request(app).get(`${BASE}/navigation?scope=generic`)
    expect(res.status).toBe(200)
    // "Reference" only holds the corporate "Checklists" group, so it disappears entirely
    expect(sectionTitles(res.body)).toEqual(['Getting started', 'Integration', 'Other'])
    expect(res.body.sections.flatMap(slugsOf)).not.toContain('security-checklist')
  })

  it('returns 401 for anonymous when anonymous access is disabled', async () => {
    process.env.MOCK_ANONYMOUS = 'true'
    process.env.MOCK_ANONYMOUS_ACCESS = 'false'
    const res = await request(app).get(`${BASE}/navigation?scope=generic`)
    expect(res.status).toBe(401)
  })

  it('filters the package tree by version and requires packageId and version', async () => {
    const missing = await request(app).get(`${BASE}/navigation?scope=package&packageId=package-some`)
    expect(missing.status).toBe(400)

    const res = await request(app).get(`${BASE}/navigation?scope=package&packageId=package-some&version=2.6`)
    expect(res.status).toBe(200)
    expect(sectionTitles(res.body)).toEqual(['Some package'])
    // the changelog article is unpublished
    expect(slugsOf(res.body.sections[0])).toEqual(['some-package-overview'])
    expect(res.body.sections[0].items[0].version).toBe('2.6')

    const otherVersion = await request(app).get(`${BASE}/navigation?scope=package&packageId=package-some&version=1.0.0`)
    expect(otherVersion.body.sections).toEqual([])
  })

  it('returns the full admin tree with editor flags', async () => {
    const res = await request(app).get(`${BASE}/admin/navigation?scope=generic`)
    expect(res.status).toBe(200)
    expect(sectionTitles(res.body)).toEqual(['Getting started', 'Integration', 'Reference'])
    const [startHere] = res.body.sections[0].items
    expect(startHere).toMatchObject({ articleId: 'article-1', titleOverride: 'Start here', published: true, slug: 'quote-to-activation' })
    // unpublished guides stay in the admin tree with their flag
    const packageTree = await request(app).get(`${BASE}/admin/navigation?scope=package&packageId=package-some`)
    expect(packageTree.body.sections[0].items.map((item: { slug: string; published: boolean }) => [item.slug, item.published]))
      .toEqual([['some-package-overview', true], ['some-package-changelog', false]])
  })

  it('rejects non-admin callers on the admin tree', async () => {
    process.env.MOCK_DOCS_ROLE = 'user'
    const res = await request(app).get(`${BASE}/admin/navigation?scope=generic`)
    expect(res.status).toBe(403)
  })

  it('creates, nests, validates, reorders and deletes sections and items', async () => {
    const section = await request(app).post(`${BASE}/admin/navigation/sections`).send({ scope: 'generic', title: 'Temp', displayOrder: 9 })
    expect(section.status).toBe(201)
    const { id: sectionId } = section.body

    // glossary is unplaced; placing it removes it from the synthetic section
    const guide = await request(app).post(`${BASE}/admin/navigation/items`).send({ sectionId: sectionId, kind: 'guide', articleId: 'article-8', displayOrder: 1 })
    expect(guide.status).toBe(201)
    expect(guide.body).toMatchObject({ title: 'Glossary', slug: 'glossary' })

    const duplicate = await request(app).post(`${BASE}/admin/navigation/items`).send({ sectionId: sectionId, kind: 'guide', articleId: 'article-8', displayOrder: 2 })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.code).toBe('DOCS-3015')

    const crossScope = await request(app).post(`${BASE}/admin/navigation/items`).send({ sectionId: sectionId, kind: 'guide', articleId: 'article-11', displayOrder: 2 })
    expect(crossScope.status).toBe(400)
    expect(crossScope.body.code).toBe('DOCS-3014')

    const group = await request(app).post(`${BASE}/admin/navigation/items`).send({ sectionId: sectionId, kind: 'group', title: 'L1', displayOrder: 2 })
    const group2 = await request(app).post(`${BASE}/admin/navigation/items`).send({ sectionId: sectionId, parentId: group.body.id, kind: 'group', title: 'L2', displayOrder: 1 })
    const group3 = await request(app).post(`${BASE}/admin/navigation/items`).send({ sectionId: sectionId, parentId: group2.body.id, kind: 'group', title: 'L3', displayOrder: 1 })
    expect(group3.status).toBe(201)
    const tooDeep = await request(app).post(`${BASE}/admin/navigation/items`).send({ sectionId: sectionId, parentId: group3.body.id, kind: 'group', title: 'L4', displayOrder: 1 })
    expect(tooDeep.status).toBe(400)

    const underGuide = await request(app).post(`${BASE}/admin/navigation/items`).send({ sectionId: sectionId, parentId: guide.body.id, kind: 'group', title: 'X', displayOrder: 1 })
    expect(underGuide.status).toBe(400)

    const moved = await request(app).put(`${BASE}/admin/navigation/items/${guide.body.id}`).send({ sectionId: sectionId, kind: 'guide', articleId: 'article-8', displayOrder: 5, title: 'Terms' })
    expect(moved.status).toBe(200)
    expect(moved.body).toMatchObject({ title: 'Terms', titleOverride: 'Terms', displayOrder: 5 })

    const tree = await request(app).get(`${BASE}/navigation?scope=generic`)
    const temp = tree.body.sections.find((item: { title: string }) => item.title === 'Temp')
    // empty groups are dropped from the public tree; the guide stays
    expect(temp.items.map((item: { title: string }) => item.title)).toEqual(['Terms'])
    expect(tree.body.sections.find((item: { title: string }) => item.title === 'Other')).toBeUndefined()

    const removed = await request(app).delete(`${BASE}/admin/navigation/items/${group.body.id}`)
    expect(removed.status).toBe(204)
    const admin = await request(app).get(`${BASE}/admin/navigation?scope=generic`)
    const adminTemp = admin.body.sections.find((item: { title: string }) => item.title === 'Temp')
    expect(adminTemp.items).toHaveLength(1)

    const deleted = await request(app).delete(`${BASE}/admin/navigation/sections/${sectionId}`)
    expect(deleted.status).toBe(204)
    const after = await request(app).get(`${BASE}/navigation?scope=generic`)
    expect(sectionTitles(after.body)).toEqual(['Getting started', 'Integration', 'Reference', 'Other'])
  })
})

describe('home articles', () => {
  it('rejects anonymous and non-admin callers on the admin endpoints', async () => {
    process.env.MOCK_ANONYMOUS = 'true'
    expect((await request(app).get(`${BASE}/admin/home-articles`)).status).toBe(401)
    delete process.env.MOCK_ANONYMOUS
    process.env.MOCK_DOCS_ROLE = 'user'
    expect((await request(app).put(`${BASE}/admin/home-articles`).send({ articleIds: [] })).status).toBe(403)
  })

  it('replaces the list and serves it in order on the public endpoint', async () => {
    const before = await request(app).get(`${BASE}/admin/home-articles`)
    const original = before.body.articles.map((item: { articleId: string }) => item.articleId)

    const put = await request(app).put(`${BASE}/admin/home-articles`).send({ articleIds: ['article-3', 'article-1'] })
    expect(put.status).toBe(200)
    expect(put.body.articles.map((item: { articleId: string }) => item.articleId)).toEqual(['article-3', 'article-1'])
    expect(put.body.articles[0]).toMatchObject({ slug: 'authentication', published: true, displayOrder: 0 })

    const list = await request(app).get(`${BASE}/home-articles`)
    expect(list.status).toBe(200)
    expect(list.body.articles.map((item: { slug: string }) => item.slug)).toEqual(['authentication', 'quote-to-activation'])
    expect(list.body.articles[0]).not.toHaveProperty('id')

    await request(app).put(`${BASE}/admin/home-articles`).send({ articleIds: original })
  })

  it('hides corporate and unpublished entries from anonymous visitors but keeps them in the admin list', async () => {
    const admin = await request(app).get(`${BASE}/admin/articles`)
    const corporate = admin.body.articles.find((item: { scope: string; visibility: string; published: boolean }) =>
      item.scope === 'generic' && item.visibility === 'corporate' && item.published)
    const before = await request(app).get(`${BASE}/admin/home-articles`)
    const original = before.body.articles.map((item: { articleId: string }) => item.articleId)

    await request(app).put(`${BASE}/admin/home-articles`).send({ articleIds: [corporate.id, 'article-1'] })
    await request(app).post(`${BASE}/admin/articles/article-1/unpublish`)
    const adminList = await request(app).get(`${BASE}/admin/home-articles`)
    expect(adminList.body.articles.map((item: { published: boolean }) => item.published)).toEqual([true, false])

    process.env.MOCK_ANONYMOUS = 'true'
    const list = await request(app).get(`${BASE}/home-articles`)
    expect(list.status).toBe(200)
    expect(list.body.articles).toEqual([])

    delete process.env.MOCK_ANONYMOUS
    await request(app).post(`${BASE}/admin/articles/article-1/publish`)
    await request(app).put(`${BASE}/admin/home-articles`).send({ articleIds: original })
  })

  it('validates the request', async () => {
    const duplicate = await request(app).put(`${BASE}/admin/home-articles`).send({ articleIds: ['article-1', 'article-1'] })
    expect(duplicate.status).toBe(400)
    expect(duplicate.body.code).toBe('DOCS-3017')

    const unknown = await request(app).put(`${BASE}/admin/home-articles`).send({ articleIds: ['nope'] })
    expect(unknown.status).toBe(404)
    expect(unknown.body.code).toBe('DOCS-2002')

    const admin = await request(app).get(`${BASE}/admin/articles`)
    const pkg = admin.body.articles.find((item: { scope: string }) => item.scope === 'package')
    const notGeneric = await request(app).put(`${BASE}/admin/home-articles`).send({ articleIds: [pkg.id] })
    expect(notGeneric.status).toBe(400)
    expect(notGeneric.body.code).toBe('DOCS-3016')

    const malformed = await request(app).put(`${BASE}/admin/home-articles`).send({ articleIds: 'x' })
    expect(malformed.status).toBe(400)
  })

  it('drops a deleted article from the list', async () => {
    const created = await request(app).post(`${BASE}/admin/articles`).send({
      slug: 'home-temp', title: 'Home temp', scope: 'generic', visibility: 'public', bodyMd: '# tmp', published: true,
    })
    expect(created.status).toBe(201)
    const before = await request(app).get(`${BASE}/admin/home-articles`)
    const original = before.body.articles.map((item: { articleId: string }) => item.articleId)

    await request(app).put(`${BASE}/admin/home-articles`).send({ articleIds: [...original, created.body.id] })
    await request(app).delete(`${BASE}/admin/articles/${created.body.id}`)
    const after = await request(app).get(`${BASE}/admin/home-articles`)
    expect(after.body.articles.map((item: { articleId: string }) => item.articleId)).toEqual(original)
  })
})

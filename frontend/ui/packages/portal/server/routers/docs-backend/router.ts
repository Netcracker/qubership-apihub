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

import { Router as createRouter, raw } from 'express'
import type { Request, Response, Router } from 'express'
import { ARTICLE_FILES, ARTICLES } from '../../mocks/docs-backend/articles'
import type { MockArticle, MockArticleFile } from '../../mocks/docs-backend/articles'
import { VERSIONS } from '../../mocks/packages/versions'
import { getPrincipal, isVisible, sendError } from './common'
import { parseMultipart } from './multipart'
import { registerAdminHomeArticlesRoutes, registerPublicHomeArticlesRoutes, removeHomeArticle } from './home-articles'
import { registerAdminNavigationRoutes, registerPublicNavigationRoutes } from './navigation'

/**
 * Mock of the documents-backend (docs extension) API.
 * Mounted under /docs-backend/api/v1, i.e. at the path the UI uses through the nginx prefix.
 * Principal emulation: see common.ts. Navigation tree endpoints: see navigation.ts.
 */
export function DocsBackendRouter(): Router {
  const router = createRouter()

  router.get('/health', (_, res) => res.status(200).json({ status: 'UP' }))
  router.get('/ready', (_, res) => res.status(200).json({ status: 'UP' }))

  router.get('/articles', (req, res) => {
    const principal = getPrincipal()
    if (principal === 'denied') {
      return sendError(res, 401, 'DOCS-1001', 'Unauthorized')
    }
    const scope = (req.query.scope as string | undefined) ?? 'generic'
    const { packageId, version, visibility } = req.query as Record<string, string | undefined>
    if (scope === 'package' && (!packageId || !version)) {
      return sendError(res, 400, 'DOCS-3001', 'packageId and version are required for scope=package')
    }
    let articles = ARTICLES
      .filter(article => article.published)
      .filter(article => article.scope === scope)
      .filter(article => isVisible(article, principal))
    if (scope === 'package') {
      articles = articles
        .filter(article => article.packageId === packageId)
        .filter(article => !article.version || article.version === version)
        .map(article => ({ ...article, version: article.version ?? version }))
    }
    if (visibility) {
      articles = articles.filter(article => article.visibility === visibility)
    }
    articles = [...articles].sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title))
    const limit = Number(req.query.limit ?? 100)
    const page = Number(req.query.page ?? 0)
    articles = articles.slice(page * limit, (page + 1) * limit)
    res.status(200).json({ articles: articles.map(article => toPublicView(article, false)) })
  })

  router.get('/articles/:slug', (req, res) => {
    const principal = getPrincipal()
    if (principal === 'denied') {
      return sendError(res, 401, 'DOCS-1001', 'Unauthorized')
    }
    const article = ARTICLES.find(item => item.slug === req.params.slug)
    if (!article || !isVisible(article, principal) || (!article.published && principal !== 'admin')) {
      return sendError(res, 404, 'DOCS-2001', 'Article not found')
    }
    const view = toPublicView(article, true)
    if (article.scope === 'package') {
      const version = article.version ?? (req.query.version as string | undefined)
      if (!version) {
        return sendError(res, 400, 'DOCS-3005', 'version query parameter is required')
      }
      return res.status(200).json({
        ...view,
        version: version,
        bodyMd: `# ${article.title}\n\nMock body of APIHUB document **${article.documentSlug}** of package \`${article.packageId}\` version \`${version}\`.`,
      })
    }
    res.status(200).json(principal === 'admin' ? { ...view, id: article.id, published: article.published } : view)
  })

  registerPublicNavigationRoutes(router)
  registerPublicHomeArticlesRoutes(router, toPublicView)

  // Files attached to an article: the article's access rules apply, the path is relative to the article.
  router.get('/articles/:slug/files/*path', (req, res) => {
    const principal = getPrincipal()
    if (principal === 'denied') {
      return sendError(res, 401, 'DOCS-1001', 'Unauthorized')
    }
    const article = ARTICLES.find(item => item.slug === req.params.slug)
    if (!article || (!article.published && principal !== 'admin') || !isVisible(article, principal)) {
      return sendError(res, 404, 'DOCS-2001', 'Article not found')
    }
    const path = decodeURIComponent(toPath((req.params as Record<string, string | string[] | undefined>).path))
    const file = ARTICLE_FILES.find(item => item.articleId === article.id && item.path === path)
    if (!file) {
      return sendError(res, 404, 'DOCS-2003', 'File not found')
    }
    const visibility = fileVisibility(article)
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('ETag', `"${file.checksum}"`)
    res.setHeader('Cache-Control', visibility === 'public' ? 'public, max-age=3600' : 'private, no-cache')
    res.status(200).send(file.data)
  })

  // ---- admin ----
  router.use('/admin', (req, res, next) => {
    const principal = getPrincipal()
    if (principal !== 'admin') {
      return sendError(res, principal === 'user' ? 403 : 401, principal === 'user' ? 'DOCS-1002' : 'DOCS-1001', 'Admin role required')
    }
    next()
  })

  registerAdminNavigationRoutes(router)
  registerAdminHomeArticlesRoutes(router)

  router.get('/admin/articles', (req, res) => {
    const { scope, visibility, packageId } = req.query as Record<string, string | undefined>
    const articles = ARTICLES
      .filter(article => !scope || article.scope === scope)
      .filter(article => !visibility || article.visibility === visibility)
      .filter(article => !packageId || article.packageId === packageId)
    res.status(200).json({ articles: articles.map(toAdminView) })
  })

  router.post('/admin/articles', (req, res) => {
    const body = parseBody(req)
    const error = validateRequest(body)
    if (error) {
      return sendError(res, 400, 'DOCS-3001', error)
    }
    if (ARTICLES.some(article => article.slug === body.slug)) {
      return sendError(res, 409, 'DOCS-3002', `Article with slug ${body.slug} already exists`)
    }
    const now = new Date().toISOString()
    const article: MockArticle = {
      ...toStored(body),
      id: `article-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      createdBy: 'JD_1234',
      updatedBy: 'JD_1234',
    }
    ARTICLES.push(article)
    res.status(201).json(toAdminView(article))
  })

  router.put('/admin/articles/:id', (req, res) => {
    const index = ARTICLES.findIndex(article => article.id === req.params.id)
    if (index === -1) {
      return sendError(res, 404, 'DOCS-2001', 'Article not found')
    }
    const body = parseBody(req)
    const error = validateRequest(body)
    if (error) {
      return sendError(res, 400, 'DOCS-3001', error)
    }
    if (ARTICLES.some(article => article.slug === body.slug && article.id !== req.params.id)) {
      return sendError(res, 409, 'DOCS-3002', `Article with slug ${body.slug} already exists`)
    }
    const existing = ARTICLES[index]
    ARTICLES[index] = { ...existing, ...toStored(body), updatedAt: new Date().toISOString(), updatedBy: 'JD_1234' }
    res.status(200).json(toAdminView(ARTICLES[index]))
  })

  router.delete('/admin/articles/:id', (req, res) => {
    const index = ARTICLES.findIndex(article => article.id === req.params.id)
    if (index === -1) {
      return sendError(res, 404, 'DOCS-2001', 'Article not found')
    }
    ARTICLES.splice(index, 1)
    removeHomeArticle(req.params.id)
    res.status(204).send()
  })

  const setPublished = (published: boolean) => (req: Request, res: Response): void => {
    const article = ARTICLES.find(item => item.id === req.params.id)
    if (!article) {
      return sendError(res, 404, 'DOCS-2001', 'Article not found')
    }
    article.published = published
    article.updatedAt = new Date().toISOString()
    res.status(200).json(toAdminView(article))
  }
  router.post('/admin/articles/:id/publish', setPublished(true))
  router.post('/admin/articles/:id/unpublish', setPublished(false))

  router.get('/admin/apihub/packages/:packageId/versions', (req, res) => {
    res.status(200).json({
      versions: VERSIONS.versions.map(({ version, status, createdAt }) => ({ version: version.split('@')[0], status: status, createdAt: createdAt })),
    })
  })

  router.get('/admin/apihub/packages/:packageId/versions/:version/documents', (req, res) => {
    res.status(200).json({
      documents: [
        { slug: 'readme', title: 'README', type: 'markdown', format: 'md', filename: 'README.md' },
        { slug: 'changelog', title: 'Changelog', type: 'markdown', format: 'md', filename: 'CHANGELOG.md' },
      ],
    })
  })

  // ---- files attached to an article (path relative to the article, audience follows the article) ----
  const findArticle = (id: string): MockArticle | undefined => ARTICLES.find(item => item.id === id)

  router.get('/admin/articles/:id/files', (req, res) => {
    const article = findArticle(req.params.id)
    if (!article) {
      return sendError(res, 404, 'DOCS-2001', 'Article not found')
    }
    res.status(200).json({ files: ARTICLE_FILES.filter(file => file.articleId === article.id).map(toAdminFileView) })
  })

  router.post('/admin/articles/:id/files', raw({ type: 'multipart/form-data', limit: '6mb' }), (req, res) => {
    const article = findArticle(req.params.id)
    if (!article) {
      return sendError(res, 404, 'DOCS-2001', 'Article not found')
    }
    const parts = parseMultipart(req).filter(part => part.name === 'file' && part.filename)
    if (parts.length === 0) {
      return sendError(res, 400, 'DOCS-3001', 'file is required')
    }
    const explicitPath = parseMultipart(req).find(part => part.name === 'path')?.data.toString()
    if (explicitPath && parts.length > 1) {
      return sendError(res, 400, 'DOCS-3001', 'path can only be used with a single file')
    }
    const created: MockArticleFile[] = []
    for (const part of parts) {
      const path = explicitPath || part.filename!
      if (ARTICLE_FILES.some(item => item.articleId === article.id && item.path === path) || created.some(item => item.path === path)) {
        return sendError(res, 409, 'DOCS-3012', `File '${path}' already exists in this article`)
      }
      created.push({
        articleId: article.id,
        path: path,
        contentType: part.contentType ?? 'application/octet-stream',
        size: part.data.length,
        checksum: `mock-${Date.now()}-${created.length}`,
        createdAt: new Date().toISOString(),
        createdBy: 'JD_1234',
        data: part.data,
      })
    }
    ARTICLE_FILES.push(...created)
    res.status(201).json({ files: created.map(toAdminFileView) })
  })

  router.delete('/admin/articles/:id/files/*path', (req, res) => {
    const article = findArticle(req.params.id)
    if (!article) {
      return sendError(res, 404, 'DOCS-2001', 'Article not found')
    }
    const path = decodeURIComponent(toPath((req.params as Record<string, string | string[] | undefined>).path))
    const index = ARTICLE_FILES.findIndex(item => item.articleId === article.id && item.path === path)
    if (index === -1) {
      return sendError(res, 404, 'DOCS-2003', 'File not found')
    }
    ARTICLE_FILES.splice(index, 1)
    res.status(204).send()
  })

  router.post('/admin/import', raw({ type: ['multipart/form-data', 'application/zip'], limit: '64mb' }), (_, res) => {
    // The mock does not unpack archives; it reports a successful no-op import
    res.status(200).json({ articles: 0, files: 0, sections: 0, items: 0 })
  })

  router.get('/admin/export', (_, res) => {
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename="documents-export.zip"')
    // Minimal empty zip archive (end of central directory record only)
    res.status(200).send(Buffer.from('504b0506000000000000000000000000000000000000', 'hex'))
  })

  return router
}

const ADMIN_ONLY_FIELDS: ReadonlyArray<keyof MockArticle> = ['id', 'published', 'createdAt', 'createdBy', 'updatedBy']

function fileVisibility(article: MockArticle): 'public' | 'corporate' {
  return article.scope === 'generic' && article.visibility === 'public' ? 'public' : 'corporate'
}

function toPublicView(article: MockArticle, withBody: boolean): Record<string, unknown> {
  const view: Record<string, unknown> = {
    files: ARTICLE_FILES
      .filter(file => file.articleId === article.id)
      .map(({ path, contentType, size }) => ({ path: path, contentType: contentType, size: size })),
  }
  Object.entries(article).forEach(([key, value]) => {
    const isHidden = ADMIN_ONLY_FIELDS.includes(key as keyof MockArticle) || (key === 'bodyMd' && !withBody)
    if (!isHidden && value !== undefined && value !== '') {
      view[key] = value
    }
  })
  return view
}

function toAdminView(article: MockArticle): Record<string, unknown> {
  return {
    ...toPublicView(article, true),
    id: article.id,
    published: article.published,
    createdAt: article.createdAt,
    createdBy: article.createdBy,
    updatedBy: article.updatedBy,
  }
}

function toAdminFileView(file: MockArticleFile): Record<string, unknown> {
  const { path, contentType, size, checksum, createdAt, createdBy } = file
  return { path, contentType, size, checksum, createdAt, createdBy }
}

function parseBody(req: Request): Partial<MockArticle> {
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}
}

function validateRequest(body: Partial<MockArticle>): string | null {
  if (!body.slug || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(body.slug)) {
    return 'slug must match ^[a-z0-9][a-z0-9-]{0,127}$'
  }
  if (!body.title) {
    return 'title is required'
  }
  if (body.scope === 'generic') {
    if (!body.bodyMd) {
      return 'bodyMd is required for generic articles'
    }
    if (body.visibility !== 'public' && body.visibility !== 'corporate') {
      return 'visibility must be public or corporate'
    }
    return null
  }
  if (body.scope === 'package') {
    if (!body.packageId || !body.documentSlug) {
      return 'packageId and documentSlug are required for package articles'
    }
    if (body.bodyMd || body.visibility) {
      return 'bodyMd and visibility are not allowed for package articles'
    }
    return null
  }
  return 'scope must be generic or package'
}

function toStored(body: Partial<MockArticle>): Omit<MockArticle, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> {
  return {
    slug: body.slug!,
    title: body.title!,
    subtitle: body.subtitle || undefined,
    scope: body.scope!,
    visibility: body.visibility,
    bodyMd: body.bodyMd,
    packageId: body.packageId,
    version: body.version || undefined,
    documentSlug: body.documentSlug,
    labels: body.labels ?? [],
    displayOrder: body.displayOrder ?? 0,
    published: body.published ?? false,
  }
}

// Express 5 returns wildcard params as string arrays (one item per path segment)
function toPath(param: string | string[] | undefined): string {
  return Array.isArray(param) ? param.join('/') : param ?? ''
}


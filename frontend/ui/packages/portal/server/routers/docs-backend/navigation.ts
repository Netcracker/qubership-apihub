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
import type { Request, Router } from 'express'
import { ARTICLES } from '../../mocks/docs-backend/articles'
import type { MockArticle } from '../../mocks/docs-backend/articles'
import { NAV_ITEMS, NAV_SECTIONS } from '../../mocks/docs-backend/navigation'
import type { MockNavItem, MockNavSection } from '../../mocks/docs-backend/navigation'
import type { Principal } from './common'
import { getPrincipal, isVisible, sendError } from './common'

/**
 * Mock of the guides navigation tree endpoints (see docs/documents-backend-navigation-prompt.md).
 * Public tree: unpublished/invisible guides and emptied groups are dropped; unplaced visible articles
 * land in a trailing synthetic "Other" section. Admin tree: everything, with editor flags.
 */

const MAX_DEPTH = 3
const SYNTHETIC_SECTION_TITLE = 'Other'

type ViewOptions = { admin: boolean; visible?: ReadonlyArray<MockArticle>; version?: string }

export function registerPublicNavigationRoutes(router: Router): void {
  router.get('/navigation', (req, res) => {
    const principal = getPrincipal()
    if (principal === 'denied') {
      return sendError(res, 401, 'DOCS-1001', 'Unauthorized')
    }
    const scope = (req.query.scope as string | undefined) ?? 'generic'
    const { packageId, version } = req.query as Record<string, string | undefined>
    if (scope !== 'generic' && scope !== 'package') {
      return sendError(res, 400, 'DOCS-3001', 'scope must be generic or package')
    }
    if (scope === 'package' && (!packageId || !version)) {
      return sendError(res, 400, 'DOCS-3001', 'packageId and version are required for scope=package')
    }
    const visible = visibleArticles(scope, principal, packageId, version)
    const sections = NAV_SECTIONS
      .filter(section => section.scope === scope && (scope === 'generic' || section.packageId === packageId))
      .sort(byOrder)
      .map(section => toSectionView(section, { admin: false, visible: visible, version: version }))
      .filter(section => section.items.length > 0)
    const placed = new Set(NAV_ITEMS.filter(item => item.articleId).map(item => item.articleId))
    const unplaced = visible.filter(article => !placed.has(article.id)).sort(byOrder)
    if (unplaced.length > 0) {
      const maxOrder = Math.max(0, ...sections.map(section => section.displayOrder))
      sections.push({
        id: '',
        scope: scope,
        packageId: scope === 'package' ? packageId : undefined,
        title: SYNTHETIC_SECTION_TITLE,
        displayOrder: maxOrder + 1,
        synthetic: true,
        items: unplaced.map(article => ({
          id: `synthetic-${article.id}`,
          sectionId: '',
          kind: 'guide',
          title: article.title,
          slug: article.slug,
          packageId: article.packageId,
          version: article.version ?? version,
          displayOrder: article.displayOrder,
          children: [],
        })),
      })
    }
    res.status(200).json({ sections: sections.map(stripUndefined) })
  })
}

export function registerAdminNavigationRoutes(router: Router): void {
  router.get('/admin/navigation', (req, res) => {
    const scope = (req.query.scope as string | undefined) ?? 'generic'
    const { packageId } = req.query as Record<string, string | undefined>
    if (scope === 'package' && !packageId) {
      return sendError(res, 400, 'DOCS-3001', 'packageId is required for scope=package')
    }
    const sections = NAV_SECTIONS
      .filter(section => section.scope === scope && (scope === 'generic' || section.packageId === packageId))
      .sort(byOrder)
      .map(section => toSectionView(section, { admin: true }))
    res.status(200).json({ sections: sections.map(stripUndefined) })
  })

  router.post('/admin/navigation/sections', (req, res) => {
    const body = parseBody<Partial<MockNavSection>>(req)
    const error = validateSection(body)
    if (error) {
      return sendError(res, 400, 'DOCS-3014', error)
    }
    const section: MockNavSection = {
      id: `section-${Date.now()}-${NAV_SECTIONS.length}`,
      scope: body.scope!,
      packageId: body.scope === 'package' ? body.packageId : undefined,
      title: body.title!,
      displayOrder: body.displayOrder ?? 0,
      ...audit(),
    }
    NAV_SECTIONS.push(section)
    res.status(201).json(stripUndefined(toSectionView(section, { admin: true })))
  })

  router.put('/admin/navigation/sections/:id', (req, res) => {
    const section = NAV_SECTIONS.find(item => item.id === req.params.id)
    if (!section) {
      return sendError(res, 404, 'DOCS-2006', 'Navigation section not found')
    }
    const body = parseBody<Partial<MockNavSection>>(req)
    const error = validateSection(body)
    if (error) {
      return sendError(res, 400, 'DOCS-3014', error)
    }
    const hasItems = NAV_ITEMS.some(item => item.sectionId === section.id)
    if (hasItems && (body.scope !== section.scope || (body.scope === 'package' && body.packageId !== section.packageId))) {
      return sendError(res, 400, 'DOCS-3014', 'scope and packageId of a section with items cannot be changed')
    }
    Object.assign(section, {
      scope: body.scope!,
      packageId: body.scope === 'package' ? body.packageId : undefined,
      title: body.title!,
      displayOrder: body.displayOrder ?? 0,
      updatedAt: new Date().toISOString(),
    })
    res.status(200).json(stripUndefined(toSectionView(section, { admin: true })))
  })

  router.delete('/admin/navigation/sections/:id', (req, res) => {
    const index = NAV_SECTIONS.findIndex(item => item.id === req.params.id)
    if (index === -1) {
      return sendError(res, 404, 'DOCS-2006', 'Navigation section not found')
    }
    NAV_SECTIONS.splice(index, 1)
    removeItems(item => item.sectionId === req.params.id)
    res.status(204).send()
  })

  router.post('/admin/navigation/items', (req, res) => {
    const body = parseBody<Partial<MockNavItem>>(req)
    const error = validateItem(body, undefined)
    if (error) {
      return sendError(res, error.status, error.code, error.message)
    }
    const item: MockNavItem = { id: `item-${Date.now()}-${NAV_ITEMS.length}`, ...toStoredItem(body), ...audit() }
    NAV_ITEMS.push(item)
    res.status(201).json(stripUndefined(toItemView(item, { admin: true })))
  })

  router.put('/admin/navigation/items/:id', (req, res) => {
    const item = NAV_ITEMS.find(candidate => candidate.id === req.params.id)
    if (!item) {
      return sendError(res, 404, 'DOCS-2007', 'Navigation item not found')
    }
    const body = parseBody<Partial<MockNavItem>>(req)
    const error = validateItem(body, item)
    if (error) {
      return sendError(res, error.status, error.code, error.message)
    }
    Object.assign(item, toStoredItem(body), { updatedAt: new Date().toISOString() })
    res.status(200).json(stripUndefined(toItemView(item, { admin: true })))
  })

  router.delete('/admin/navigation/items/:id', (req, res) => {
    const index = NAV_ITEMS.findIndex(item => item.id === req.params.id)
    if (index === -1) {
      return sendError(res, 404, 'DOCS-2007', 'Navigation item not found')
    }
    const ids = new Set([req.params.id, ...descendants(req.params.id).map(item => item.id)])
    removeItems(item => ids.has(item.id))
    res.status(204).send()
  })
}

// ---- tree building ----

function visibleArticles(scope: string, principal: Principal, packageId?: string, version?: string): ReadonlyArray<MockArticle> {
  let articles = ARTICLES
    .filter(article => article.published)
    .filter(article => article.scope === scope)
    .filter(article => isVisible(article, principal))
  if (scope === 'package') {
    articles = articles
      .filter(article => article.packageId === packageId)
      .filter(article => !article.version || article.version === version)
  }
  return articles
}

function toSectionView(section: MockNavSection, options: ViewOptions): Record<string, unknown> & { items: unknown[]; displayOrder: number } {
  const view: Record<string, unknown> = {
    id: section.id,
    scope: section.scope,
    packageId: section.packageId,
    title: section.title,
    displayOrder: section.displayOrder,
  }
  if (options.admin) {
    Object.assign(view, { createdAt: section.createdAt, updatedAt: section.updatedAt, createdBy: section.createdBy, updatedBy: section.updatedBy })
  }
  return { ...view, items: buildChildren(section.id, undefined, options, 1), displayOrder: section.displayOrder }
}

function buildChildren(sectionId: string, parentId: string | undefined, options: ViewOptions, depth: number): Record<string, unknown>[] {
  if (depth > MAX_DEPTH) {
    return []
  }
  const keep = (view: Record<string, unknown>): boolean =>
    options.admin || (view.kind === 'guide' ? !view.hidden : (view.children as unknown[]).length > 0)
  return NAV_ITEMS
    .filter(item => item.sectionId === sectionId && item.parentId === parentId)
    .map(item => toItemView(item, options, depth))
    .filter(keep)
    .map(view => { const { hidden, ...rest } = view; void hidden; return rest })
    .sort((a, b) => (a.displayOrder as number) - (b.displayOrder as number) || String(a.title).localeCompare(String(b.title)))
}

function toItemView(item: MockNavItem, options: ViewOptions, depth = 1): Record<string, unknown> {
  const article = item.articleId ? ARTICLES.find(candidate => candidate.id === item.articleId) : undefined
  const visible = !!article && (options.admin || options.visible!.includes(article))
  const view: Record<string, unknown> = {
    id: item.id,
    sectionId: item.sectionId,
    parentId: item.parentId,
    kind: item.kind,
    title: item.title ?? article?.title ?? '',
    slug: article?.slug,
    packageId: article?.packageId,
    version: article ? (article.version ?? options.version) : undefined,
    displayOrder: item.displayOrder,
    children: buildChildren(item.sectionId, item.id, options, depth + 1),
    hidden: item.kind === 'guide' && !visible,
  }
  if (options.admin) {
    Object.assign(view, {
      articleId: item.articleId,
      titleOverride: item.title,
      published: article?.published,
      dangling: item.kind === 'guide' && !article ? true : undefined,
    })
  }
  return view
}

function byOrder(a: { displayOrder: number; title: string }, b: { displayOrder: number; title: string }): number {
  return a.displayOrder - b.displayOrder || a.title.localeCompare(b.title)
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const result: Record<string, unknown> = {}
  Object.entries(value).forEach(([key, entry]) => {
    if (entry === undefined) {
      return
    }
    result[key] = Array.isArray(entry) ? entry.map(child => (child && typeof child === 'object' ? stripUndefined(child as Record<string, unknown>) : child)) : entry
  })
  return result as T
}

// ---- validation ----

type ValidationError = { status: number; code: string; message: string }

function validateSection(body: Partial<MockNavSection>): string | null {
  if (body.scope !== 'generic' && body.scope !== 'package') {
    return 'scope must be generic or package'
  }
  if (body.scope === 'package' && !body.packageId) {
    return 'packageId is required for scope=package'
  }
  if (!body.title) {
    return 'title is required'
  }
  return null
}

function validateItem(body: Partial<MockNavItem>, existing: MockNavItem | undefined): ValidationError | null {
  const bad = (message: string): ValidationError => ({ status: 400, code: 'DOCS-3014', message: message })
  const section = NAV_SECTIONS.find(candidate => candidate.id === body.sectionId)
  if (!section) {
    return bad('sectionId must reference an existing section')
  }
  if (body.kind === 'group') {
    if (!body.title) {
      return bad('title is required for a group')
    }
    if (body.articleId) {
      return bad('articleId is not allowed for a group')
    }
  } else if (body.kind === 'guide') {
    if (!body.articleId) {
      return bad('articleId is required for a guide')
    }
    const article = ARTICLES.find(candidate => candidate.id === body.articleId)
    if (!article) {
      return bad('articleId must reference an existing article')
    }
    if (article.scope !== section.scope || (section.scope === 'package' && article.packageId !== section.packageId)) {
      return bad('the article must belong to the scope and package of the section')
    }
    if (NAV_ITEMS.some(item => item.articleId === body.articleId && item.id !== existing?.id)) {
      return { status: 409, code: 'DOCS-3015', message: 'the article is already placed in the navigation' }
    }
  } else {
    return bad('kind must be guide or group')
  }
  if (body.parentId) {
    const parent = NAV_ITEMS.find(item => item.id === body.parentId)
    if (!parent || parent.sectionId !== section.id) {
      return bad('parentId must reference an item of the same section')
    }
    if (parent.kind !== 'group') {
      return bad('parentId must reference a group')
    }
    if (existing && (parent.id === existing.id || descendants(existing.id).some(item => item.id === parent.id))) {
      return bad('an item cannot be nested under itself')
    }
    const subtreeDepth = existing ? subtreeHeight(existing.id) : 1
    if (depthOf(parent) + subtreeDepth > MAX_DEPTH) {
      return bad(`the navigation depth is limited to ${MAX_DEPTH} levels`)
    }
  }
  return null
}

function depthOf(item: MockNavItem): number {
  const parent = item.parentId ? NAV_ITEMS.find(candidate => candidate.id === item.parentId) : undefined
  return parent ? depthOf(parent) + 1 : 1
}

function subtreeHeight(id: string): number {
  const children = NAV_ITEMS.filter(item => item.parentId === id)
  return 1 + Math.max(0, ...children.map(child => subtreeHeight(child.id)))
}

function descendants(id: string): MockNavItem[] {
  const children = NAV_ITEMS.filter(item => item.parentId === id)
  return children.flatMap(child => [child, ...descendants(child.id)])
}

function removeItems(predicate: (item: MockNavItem) => boolean): void {
  for (let index = NAV_ITEMS.length - 1; index >= 0; index--) {
    if (predicate(NAV_ITEMS[index])) {
      NAV_ITEMS.splice(index, 1)
    }
  }
}

function toStoredItem(body: Partial<MockNavItem>): Omit<MockNavItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> {
  return {
    sectionId: body.sectionId!,
    parentId: body.parentId || undefined,
    kind: body.kind!,
    title: body.title || undefined,
    articleId: body.kind === 'guide' ? body.articleId : undefined,
    displayOrder: body.displayOrder ?? 0,
  }
}

function audit(): Pick<MockNavItem, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> {
  const now = new Date().toISOString()
  return { createdAt: now, updatedAt: now, createdBy: 'JD_1234', updatedBy: 'JD_1234' }
}

function parseBody<T>(req: Request): T {
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}
}

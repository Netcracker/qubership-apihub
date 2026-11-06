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
import { ARTICLES } from '../../mocks/docs-backend/articles'
import type { MockArticle } from '../../mocks/docs-backend/articles'
import { HOME_ARTICLE_IDS } from '../../mocks/docs-backend/home-articles'
import { getPrincipal, isVisible, sendError } from './common'

/**
 * Mock of the home page guides endpoints: an admin-managed ordered list of generic articles.
 * Public list: only published articles visible to the principal, in the configured order.
 * Admin list: everything, with the published flag. PUT replaces the whole list.
 */

type PublicView = (article: MockArticle, withBody: boolean) => Record<string, unknown>

export function registerPublicHomeArticlesRoutes(router: Router, toPublicView: PublicView): void {
  router.get('/home-articles', (_, res) => {
    const principal = getPrincipal()
    if (principal === 'denied') {
      return sendError(res, 401, 'DOCS-1001', 'Unauthorized')
    }
    const articles = HOME_ARTICLE_IDS
      .map(id => ARTICLES.find(article => article.id === id))
      .filter((article): article is MockArticle => !!article && article.published && isVisible(article, principal))
    res.status(200).json({ articles: articles.map(article => toPublicView(article, false)) })
  })
}

export function registerAdminHomeArticlesRoutes(router: Router): void {
  router.get('/admin/home-articles', (_, res) => {
    res.status(200).json(toAdminView())
  })

  router.put('/admin/home-articles', (req, res) => {
    const articleIds = (req.body as { articleIds?: unknown })?.articleIds
    if (!Array.isArray(articleIds) || articleIds.some(id => typeof id !== 'string')) {
      return sendError(res, 400, 'DOCS-3001', 'articleIds must be an array of strings')
    }
    const seen = new Set<string>()
    for (const id of articleIds as string[]) {
      if (seen.has(id)) {
        return sendError(res, 400, 'DOCS-3017', `Article ${id} is listed more than once`)
      }
      seen.add(id)
      const article = ARTICLES.find(item => item.id === id)
      if (!article) {
        return sendError(res, 404, 'DOCS-2002', `Article ${id} not found`)
      }
      if (article.scope !== 'generic') {
        return sendError(res, 400, 'DOCS-3016', `Article ${id} is not a generic article`)
      }
    }
    HOME_ARTICLE_IDS.splice(0, HOME_ARTICLE_IDS.length, ...(articleIds as string[]))
    res.status(200).json(toAdminView())
  })
}

/** Drops an article from the home list, e.g. after it was deleted. */
export function removeHomeArticle(id: string): void {
  const index = HOME_ARTICLE_IDS.indexOf(id)
  if (index >= 0) {
    HOME_ARTICLE_IDS.splice(index, 1)
  }
}

function toAdminView(): { articles: Record<string, unknown>[] } {
  const articles = HOME_ARTICLE_IDS.flatMap((id, index) => {
    const article = ARTICLES.find(item => item.id === id)
    return article
      ? [{ articleId: article.id, slug: article.slug, title: article.title, published: article.published, displayOrder: index }]
      : []
  })
  return { articles }
}

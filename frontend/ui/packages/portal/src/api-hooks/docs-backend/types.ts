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

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export const ARTICLE_SCOPE_GENERIC = 'generic'
export const ARTICLE_SCOPE_PACKAGE = 'package'
export type ArticleScope = typeof ARTICLE_SCOPE_GENERIC | typeof ARTICLE_SCOPE_PACKAGE

export const ARTICLE_VISIBILITY_PUBLIC = 'public'
export const ARTICLE_VISIBILITY_CORPORATE = 'corporate'
export type ArticleVisibility = typeof ARTICLE_VISIBILITY_PUBLIC | typeof ARTICLE_VISIBILITY_CORPORATE

// Fields marked "admin only" are present only in responses to a system administrator
export type ArticleDto = Readonly<{
  slug: string
  title: string
  subtitle?: string
  scope: ArticleScope
  visibility?: ArticleVisibility
  packageId?: Key
  version?: string
  documentSlug?: string
  labels: ReadonlyArray<string>
  displayOrder: number
  // Files attached to the article (images, attachments), served from /articles/{slug}/files/{path}
  files?: ReadonlyArray<ArticleFileDto>
  updatedAt: string
  bodyMd?: string
  // admin only
  id?: Key
  published?: boolean
  createdAt?: string
  createdBy?: string
  updatedBy?: string
}>

export type ArticlesDto = Readonly<{
  articles: ReadonlyArray<ArticleDto>
}>

export type Article = ArticleDto

export type ArticleRequest = Readonly<{
  slug: string
  title: string
  subtitle?: string
  scope: ArticleScope
  visibility?: ArticleVisibility
  bodyMd?: string
  packageId?: Key
  version?: string
  documentSlug?: string
  labels?: ReadonlyArray<string>
  displayOrder?: number
  published?: boolean
}>

// A file attached to an article. The path is relative to the article and unique only within it; the audience is
// the article's. Fields marked "admin only" are present only in responses to a system administrator.
export type ArticleFileDto = Readonly<{
  path: string
  contentType: string
  size: number
  // admin only
  checksum?: string
  createdAt?: string
  createdBy?: string
}>

export type ArticleFilesDto = Readonly<{
  files: ReadonlyArray<ArticleFileDto>
}>

export type ApihubVersionRelayDto = Readonly<{
  version: string
  status: string
  createdAt: string
}>

export type ApihubDocumentRelayDto = Readonly<{
  slug: string
  title: string
  type: string
  format?: string
  filename?: string
}>

export type ImportResultDto = Readonly<{
  articles: number
  files: number
  sections?: number
  items?: number
}>

// ---- guides navigation tree ----

export const NAV_ITEM_KIND_GUIDE = 'guide'
export const NAV_ITEM_KIND_GROUP = 'group'
export type NavItemKind = typeof NAV_ITEM_KIND_GUIDE | typeof NAV_ITEM_KIND_GROUP

/** Max nesting of items under a section (depth 1 = direct child of the section). */
export const NAV_MAX_DEPTH = 3

// Fields marked "admin only" are present only in the admin tree
export type NavItemDto = Readonly<{
  id: Key
  sectionId: Key
  parentId?: Key
  kind: NavItemKind
  // Effective title: the override when set, otherwise the article title
  title: string
  // guide items only
  slug?: string
  packageId?: Key
  version?: string
  displayOrder: number
  children: ReadonlyArray<NavItemDto>
  // admin only
  articleId?: Key
  titleOverride?: string
  published?: boolean
  dangling?: boolean
}>

export type NavSectionDto = Readonly<{
  id: Key
  scope: ArticleScope
  packageId?: Key
  title: string
  displayOrder: number
  // Trailing section with the visible articles that are not placed in the tree
  synthetic?: boolean
  items: ReadonlyArray<NavItemDto>
  // admin only
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}>

export type NavigationDto = Readonly<{
  sections: ReadonlyArray<NavSectionDto>
}>

export type NavSectionRequest = Readonly<{
  scope: ArticleScope
  packageId?: Key
  title: string
  displayOrder: number
}>

export type NavItemRequest = Readonly<{
  sectionId: Key
  parentId?: Key
  kind: NavItemKind
  title?: string
  articleId?: Key
  displayOrder: number
}>

// ---- home page guides ("Things worth reading first") ----

/** Configured home page guides visible to the caller, in the configured order. */
export type HomeArticlesDto = Readonly<{
  articles: ReadonlyArray<ArticleDto>
}>

/** One entry of the admin list: every configured article, published or not. */
export type AdminHomeArticleDto = Readonly<{
  articleId: Key
  slug: string
  title: string
  published: boolean
  displayOrder: number
}>

export type AdminHomeArticlesDto = Readonly<{
  articles: ReadonlyArray<AdminHomeArticleDto>
}>

/** Replaces the whole list; array position is the display order. */
export type HomeArticlesRequest = Readonly<{
  articleIds: ReadonlyArray<Key>
}>

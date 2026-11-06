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
export type MockNavSection = {
  id: string
  scope: 'generic' | 'package'
  packageId?: string
  title: string
  displayOrder: number
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export type MockNavItem = {
  id: string
  sectionId: string
  parentId?: string
  kind: 'guide' | 'group'
  // Override; undefined => article title
  title?: string
  articleId?: string
  displayOrder: number
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

const NOW = '2025-01-15T10:00:00Z'
const ADMIN = 'JD_1234'
const AUDIT = { createdAt: NOW, updatedAt: NOW, createdBy: ADMIN, updatedBy: ADMIN }

export const NAV_SECTIONS: MockNavSection[] = [
  { id: 'section-1', scope: 'generic', title: 'Getting started', displayOrder: 1, ...AUDIT },
  { id: 'section-2', scope: 'generic', title: 'Integration', displayOrder: 2, ...AUDIT },
  { id: 'section-3', scope: 'generic', title: 'Reference', displayOrder: 3, ...AUDIT },
  { id: 'section-4', scope: 'package', packageId: 'package-some', title: 'Some package', displayOrder: 1, ...AUDIT },
]

// "glossary" (article-8) is deliberately not placed: it shows up in the synthetic "Other" section
export const NAV_ITEMS: MockNavItem[] = [
  { id: 'item-1', sectionId: 'section-1', kind: 'guide', articleId: 'article-1', title: 'Start here', displayOrder: 1, ...AUDIT },
  { id: 'item-2', sectionId: 'section-1', kind: 'guide', articleId: 'article-2', displayOrder: 2, ...AUDIT },
  { id: 'item-3', sectionId: 'section-1', kind: 'guide', articleId: 'article-4', displayOrder: 3, ...AUDIT },
  { id: 'item-4', sectionId: 'section-2', kind: 'guide', articleId: 'article-3', displayOrder: 1, ...AUDIT },
  { id: 'item-5', sectionId: 'section-2', kind: 'group', title: 'Resilience', displayOrder: 2, ...AUDIT },
  { id: 'item-6', sectionId: 'section-2', parentId: 'item-5', kind: 'guide', articleId: 'article-5', displayOrder: 1, ...AUDIT },
  { id: 'item-7', sectionId: 'section-2', parentId: 'item-5', kind: 'guide', articleId: 'article-6', displayOrder: 2, ...AUDIT },
  { id: 'item-8', sectionId: 'section-2', kind: 'guide', articleId: 'article-7', displayOrder: 3, ...AUDIT },
  // Corporate-only group: disappears for anonymous visitors because it is left empty
  { id: 'item-9', sectionId: 'section-3', kind: 'group', title: 'Checklists', displayOrder: 1, ...AUDIT },
  { id: 'item-10', sectionId: 'section-3', parentId: 'item-9', kind: 'guide', articleId: 'article-9', displayOrder: 1, ...AUDIT },
  { id: 'item-11', sectionId: 'section-3', parentId: 'item-9', kind: 'guide', articleId: 'article-10', displayOrder: 2, ...AUDIT },
  { id: 'item-12', sectionId: 'section-4', kind: 'guide', articleId: 'article-11', displayOrder: 1, ...AUDIT },
  { id: 'item-13', sectionId: 'section-4', kind: 'guide', articleId: 'article-12', displayOrder: 2, ...AUDIT },
]

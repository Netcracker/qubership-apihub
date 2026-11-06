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
import type { NavItemDto, NavSectionDto } from '@portal/api-hooks/docs-backend/types'
import { NAV_ITEM_KIND_GUIDE } from '@portal/api-hooks/docs-backend/types'

/** Navigation item with the UI route of its guide (undefined for groups). */
export type NavLink = Readonly<{ title: string; path: string }>

export type ResolvedNavItem = Readonly<Omit<NavItemDto, 'children'> & {
  path?: string
  children: ReadonlyArray<ResolvedNavItem>
}>

export type ResolvedNavSection = Readonly<Omit<NavSectionDto, 'items'> & {
  items: ReadonlyArray<ResolvedNavItem>
}>

export type NavigationContext = Readonly<{
  // Section (unless synthetic) › ancestor groups › current guide; the last entry has no path
  breadcrumbs: ReadonlyArray<Readonly<{ title: string; path?: string }>>
  previous?: NavLink
  next?: NavLink
}>

export type FlatNavEntry = Readonly<{
  item: ResolvedNavItem
  section: ResolvedNavSection
  ancestors: ReadonlyArray<ResolvedNavItem>
}>

/** Attaches a UI path to every guide item. */
export function resolveNavigation(
  sections: ReadonlyArray<NavSectionDto>,
  toPath: (item: NavItemDto) => string,
): ReadonlyArray<ResolvedNavSection> {
  const resolveItem = (item: NavItemDto): ResolvedNavItem => ({
    ...item,
    path: item.kind === NAV_ITEM_KIND_GUIDE && item.slug ? toPath(item) : undefined,
    children: item.children.map(resolveItem),
  })
  return sections.map(section => ({ ...section, items: section.items.map(resolveItem) }))
}

/** Guide items in reading order with their section and ancestor groups. */
export function flattenNavigation(sections: ReadonlyArray<ResolvedNavSection>): ReadonlyArray<FlatNavEntry> {
  const entries: FlatNavEntry[] = []
  const walk = (items: ReadonlyArray<ResolvedNavItem>, section: ResolvedNavSection, ancestors: ReadonlyArray<ResolvedNavItem>): void => {
    for (const item of items) {
      if (item.path) {
        entries.push({ item, section, ancestors })
      }
      walk(item.children, section, [...ancestors, item])
    }
  }
  sections.forEach(section => walk(section.items, section, []))
  return entries
}

/** The item (when it is a guide) followed by its descendant guides, in reading order. */
export function guidesOf(item: ResolvedNavItem): ReadonlyArray<ResolvedNavItem> {
  const guides: ResolvedNavItem[] = []
  const walk = (current: ResolvedNavItem): void => {
    if (current.path) {
      guides.push(current)
    }
    current.children.forEach(walk)
  }
  walk(item)
  return guides
}

/** Breadcrumbs and previous/next links of the guide with the given slug, or undefined when it is not in the tree. */
export function findNavigationContext(sections: ReadonlyArray<ResolvedNavSection>, slug: string | undefined): NavigationContext | undefined {
  if (!slug) {
    return undefined
  }
  const entries = flattenNavigation(sections)
  const index = entries.findIndex(entry => entry.item.slug === slug)
  if (index === -1) {
    return undefined
  }
  const { item, section, ancestors } = entries[index]
  const toLink = (entry: FlatNavEntry | undefined): NavLink | undefined => {
    return entry ? { title: entry.item.title, path: entry.item.path! } : undefined
  }
  return {
    breadcrumbs: [
      ...(section.synthetic ? [] : [{ title: section.title }]),
      ...ancestors.map(ancestor => ({ title: ancestor.title, path: ancestor.path })),
      { title: item.title },
    ],
    previous: toLink(entries[index - 1]),
    next: toLink(entries[index + 1]),
  }
}

/** True when the item or one of its descendants is the guide with the given slug. */
export function containsSlug(item: ResolvedNavItem, slug: string | undefined): boolean {
  if (!slug) {
    return false
  }
  return item.slug === slug || item.children.some(child => containsSlug(child, slug))
}

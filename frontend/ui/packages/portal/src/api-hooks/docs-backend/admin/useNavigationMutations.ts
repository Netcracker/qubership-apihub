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
import { useMutation } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import { useShowErrorNotification, useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { docsRequestJson, docsRequestVoid, useDocsBackendBasePath } from '../docsRequests'
import type { NavItemDto, NavItemRequest, NavSectionDto, NavSectionRequest } from '../types'
import { NAV_ITEM_KIND_GROUP } from '../types'
import { useInvalidateNavigation } from './useAdminNavigation'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export type SaveNavSectionVariables = Readonly<{ id?: Key; request: NavSectionRequest }>
export type SaveNavItemVariables = Readonly<{ id?: Key; request: NavItemRequest }>

export type OnSaved = () => void

/** Creates (no id) or updates (with id) a section; `onSaved` runs after this particular save succeeds. */
export function useSaveNavSection(): [(variables: SaveNavSectionVariables, onSaved?: OnSaved) => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateNavigation()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<NavSectionDto, Error, SaveNavSectionVariables>({
    mutationFn: ({ id, request }) => docsRequestJson<NavSectionDto>(
      basePath,
      id ? `/admin/navigation/sections/${encodeURIComponent(id)}` : '/admin/navigation/sections',
      { method: id ? 'PUT' : 'POST', headers: JSON_HEADERS, body: JSON.stringify(request) },
    ),
    onSuccess: async (section, { id }) => {
      showSuccess({ message: `Section "${section.title}" has been ${id ? 'updated' : 'created'}` })
      await invalidate()
    },
    onError: error => showError({ message: error.message }),
  })

  return [(variables, onSaved) => mutate(variables, { onSuccess: onSaved }), isLoading]
}

export function useDeleteNavSection(): [(section: NavSectionDto) => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateNavigation()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, NavSectionDto>({
    mutationFn: section => docsRequestVoid(basePath, `/admin/navigation/sections/${encodeURIComponent(section.id)}`, { method: 'DELETE' }),
    onSuccess: async (_, section) => {
      showSuccess({ message: `Section "${section.title}" has been deleted` })
      await invalidate()
    },
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading]
}

/** Creates (no id) or updates (with id) an item; `onSaved` runs after this particular save succeeds. */
export function useSaveNavItem(): [(variables: SaveNavItemVariables, onSaved?: OnSaved) => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateNavigation()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<NavItemDto, Error, SaveNavItemVariables>({
    mutationFn: ({ id, request }) => saveItem(basePath, id, request),
    onSuccess: async (item, { id }) => {
      showSuccess({ message: `Item "${item.title}" has been ${id ? 'updated' : 'created'}` })
      await invalidate()
    },
    onError: error => showError({ message: error.message }),
  })

  return [(variables, onSaved) => mutate(variables, { onSuccess: onSaved }), isLoading]
}

export function useDeleteNavItem(): [(item: NavItemDto) => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateNavigation()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, NavItemDto>({
    mutationFn: item => docsRequestVoid(basePath, `/admin/navigation/items/${encodeURIComponent(item.id)}`, { method: 'DELETE' }),
    onSuccess: async (_, item) => {
      showSuccess({ message: `Item "${item.title}" has been deleted` })
      await invalidate()
    },
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading]
}

export type MoveNavItemVariables = Readonly<{ siblings: ReadonlyArray<NavItemDto>; index: number; delta: 1 | -1 }>

/**
 * Swaps the display order of an item with its neighbour (two PUTs).
 * When both orders are equal they are renumbered by position so the swap takes effect.
 */
export function useMoveNavItem(): [(variables: MoveNavItemVariables) => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateNavigation()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, MoveNavItemVariables>({
    mutationFn: async ({ siblings, index, delta }) => {
      const target = index + delta
      if (target < 0 || target >= siblings.length) {
        return
      }
      const a = siblings[index]
      const b = siblings[target]
      const equal = a.displayOrder === b.displayOrder
      await saveItem(basePath, a.id, { ...toItemRequest(a), displayOrder: equal ? target : b.displayOrder })
      await saveItem(basePath, b.id, { ...toItemRequest(b), displayOrder: equal ? index : a.displayOrder })
    },
    onSuccess: () => invalidate(),
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading]
}

export type MoveNavSectionVariables = Readonly<{ sections: ReadonlyArray<NavSectionDto>; index: number; delta: 1 | -1 }>

export function useMoveNavSection(): [(variables: MoveNavSectionVariables) => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateNavigation()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, MoveNavSectionVariables>({
    mutationFn: async ({ sections, index, delta }) => {
      const target = index + delta
      if (target < 0 || target >= sections.length) {
        return
      }
      const a = sections[index]
      const b = sections[target]
      const equal = a.displayOrder === b.displayOrder
      await saveSection(basePath, a.id, { ...toSectionRequest(a), displayOrder: equal ? target : b.displayOrder })
      await saveSection(basePath, b.id, { ...toSectionRequest(b), displayOrder: equal ? index : a.displayOrder })
    },
    onSuccess: () => invalidate(),
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading]
}

export function toItemRequest(item: NavItemDto): NavItemRequest {
  return {
    sectionId: item.sectionId,
    parentId: item.parentId,
    kind: item.kind,
    title: item.kind === NAV_ITEM_KIND_GROUP ? item.title : item.titleOverride,
    articleId: item.articleId,
    displayOrder: item.displayOrder,
  }
}

export function toSectionRequest(section: NavSectionDto): NavSectionRequest {
  return {
    scope: section.scope,
    packageId: section.packageId,
    title: section.title,
    displayOrder: section.displayOrder,
  }
}

function saveItem(basePath: string, id: Key | undefined, request: NavItemRequest): Promise<NavItemDto> {
  return docsRequestJson<NavItemDto>(
    basePath,
    id ? `/admin/navigation/items/${encodeURIComponent(id)}` : '/admin/navigation/items',
    { method: id ? 'PUT' : 'POST', headers: JSON_HEADERS, body: JSON.stringify(request) },
  )
}

function saveSection(basePath: string, id: Key, request: NavSectionRequest): Promise<NavSectionDto> {
  return docsRequestJson<NavSectionDto>(
    basePath,
    `/admin/navigation/sections/${encodeURIComponent(id)}`,
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(request) },
  )
}

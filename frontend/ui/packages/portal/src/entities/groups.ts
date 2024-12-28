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

import type { Key } from './keys'

export type Groups = Readonly<Group[]>

export type Group = Readonly<{
  key: Key
  alias: Key
  name: string
  parentKey?: Key
  description?: string
  serviceName?: string
  favorite: boolean
  lastVersion?: string
  path: string // TODO: Remove `path` when backend will provide groups of project
}>

export const EMPTY_GROUP: Group = {
  key: '',
  alias: '',
  name: '',
  path: '',
  favorite: false,
}

export type GroupDto = Readonly<{
  groupId: Key
  alias: Key
  name: string
  parentId?: Key
  description?: string
  isFavorite: boolean
  lastVersion?: string
}>

export type GroupsDto = Readonly<{
  groups: ReadonlyArray<GroupDto>
}>

export function toGroupDto(value: Group): GroupDto {
  return {
    groupId: value.key,
    alias: value.alias.toUpperCase(),
    name: value.name,
    parentId: value.parentKey,
    description: value.description,
    isFavorite: value.favorite,
  }
}

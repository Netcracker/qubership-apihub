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
import type { GroupDto, Groups } from './groups'
import { toGroupDto } from './groups'
import type { Integration, IntegrationDto } from './integration'

export type Projects = Readonly<Project[]>

// TODO: Separate to `Package` and `Project` when backend will be ready
export type Project = Readonly<{
  key: Key
  groupKey: Key
  groups: Groups
  name: string
  alias: string
  favorite: boolean
  packageKey?: Key
  lastVersion?: string
  integration?: Integration
  description?: string
}>

export const EMPTY_PROJECT: Project = {
  key: '',
  packageKey: '',
  groupKey: '',
  groups: [],
  name: '',
  alias: '',
  favorite: false,
  integration: {
    type: 'gitlab',
    defaultBranch: '',
    defaultFolder: '/',
    repositoryKey: '',
    repositoryName: '',
  },
}

export type ProjectDto = Readonly<{
  projectId: Key
  groupId: Key
  groups: ReadonlyArray<GroupDto>
  name: string
  alias: string
  isFavorite: boolean
  packageId?: Key
  lastVersion?: string
  integration?: IntegrationDto
  description?: string
}>

export type ProjectsDto = Readonly<{
  projects: ReadonlyArray<ProjectDto>
}>

export function toProjectDto(value: Project): ProjectDto {
  return {
    projectId: value.key,
    groupId: value.groupKey,
    groups: value.groups.map(toGroupDto),
    name: value.name,
    alias: value.alias.toUpperCase(),
    isFavorite: value.favorite,
    packageId: value.packageKey,
    lastVersion: value.lastVersion,
    integration: value.integration && {
      type: value.integration.type,
      repositoryId: value.integration.repositoryKey,
      repositoryName: value.integration.repositoryName,
      repositoryUrl: value.integration.repositoryUrl,
      defaultBranch: value.integration.defaultBranch,
      defaultFolder: value.integration.defaultFolder,
    },
    description: value.description,
  }
}

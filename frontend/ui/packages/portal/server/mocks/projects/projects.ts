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

import type { Writeable } from '../../types'
import type { ProjectsDto } from './types'

export const PROJECTS: Writeable<ProjectsDto> = {
  projects: [
    {
      projectId: 'project-1',
      groupId: 'group-1',
      groups: [],
      name: 'APIHUB UI',
      alias: 'APIHUBUI',
      description: 'Some very long text for example',
      isFavorite: true,
      lastVersion: '2.6',
      integration: {
        type: 'gitlab',
        repositoryId: '12584',
        repositoryName: 'APIHUB/apihub-ui',
        repositoryUrl: 'https://git.examle.com/APIHUB/apihub-ui.git',
        defaultBranch: 'develop',
        defaultFolder: '/',
      },
    },
    {
      projectId: 'project-2',
      groupId: 'group-2',
      groups: [],
      name: 'APIHUB BE',
      alias: 'APIHUBBE',
      description: 'Some very long text for example',
      isFavorite: false,
      lastVersion: '2.6',
      integration: {
        type: 'gitlab',
        repositoryId: '12529',
        repositoryName: 'APIHUB/apihub-backend',
        repositoryUrl: 'https://git.examle.com/APIHUB/apihub-backend.git',
        defaultBranch: 'develop',
        defaultFolder: '/',
      },
    },
    {
      projectId: 'project-3',
      groupId: 'group-3',
      groups: [],
      name: 'APIHUB Config 1',
      alias: 'AHCONF1',
      description: 'Some very long text for example',
      isFavorite: false,
      lastVersion: '2.6',
      integration: {
        type: 'gitlab',
        repositoryId: '13647',
        repositoryName: 'APIHUB/apihub-configuration',
        repositoryUrl: 'https://git.examle.com/APIHUB/apihub-configuration.git',
        defaultBranch: 'main',
        defaultFolder: '/',
      },
    },
    {
      projectId: 'project-4',
      groupId: 'group-4',
      groups: [],
      name: 'APIHUB Config 2',
      alias: 'AHCONF2',
      isFavorite: false,
      lastVersion: '2.6',
      integration: {
        type: 'gitlab',
        repositoryId: '13647',
        repositoryName: 'APIHUB/apihub-configuration',
        repositoryUrl: 'https://git.examle.com/APIHUB/apihub-configuration.git',
        defaultBranch: 'feature/bugfix',
        defaultFolder: '/',
      },
    },
    {
      projectId: 'project-5',
      groupId: 'group-5',
      groups: [],
      name: 'APIHUB Config 3',
      alias: 'AHCONF3',
      isFavorite: true,
      lastVersion: '2.6',
      integration: {
        type: 'gitlab',
        repositoryId: '13647',
        repositoryName: 'APIHUB/apihub-configuration',
        repositoryUrl: 'https://git.examle.com/APIHUB/apihub-configuration.git',
        defaultBranch: 'develop',
        defaultFolder: '/',
      },
    },
  ],
}

export const PUBLISHED_PROJECT_IDS = new Set([
  'project-1',
  'project-2',
  'project-4',
])

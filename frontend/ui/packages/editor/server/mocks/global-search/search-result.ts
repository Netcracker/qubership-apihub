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

import type { SearchResultsDto } from '../../../src/entities'

export const RECENTLY_VISITED_PACKAGES: SearchResultsDto = {
  packages: [
    {
      packageId: 'group-1',
      name: 'Group 1',
      description: '',
      parentPackages: [],
    },
  ],
  versions: [
    {
      packageId: 'project-2',
      name: 'Project 2',
      parentPackages: [],
      version: '2.6',
      status: 'draft',
      publishedAt: '2022-09-13T12:52:53.419067Z',
      files: [
        {
          fileId: 'spec1.yaml',
          title: 'Service 1',
          slug: 'spec1-yaml',
          type: 'openapi-3-1',
          format: 'yaml',
          labels: ['label1'],
        },
        {
          fileId: 'spec2.json',
          title: 'Service 2',
          slug: 'spec-2-json',
          type: 'json-schema',
          format: 'json',
          labels: ['api'],
        },
      ],
    },
    {
      packageId: 'project-4',
      name: 'Project 4',
      parentPackages: [],
      version: '2.6',
      status: 'release',
      publishedAt: '2022-09-13T12:52:53.419067Z',
      files: [
        {
          fileId: 'spec-3.json',
          title: 'Service 3',
          slug: 'spec3-json',
          type: 'json-schema',
          format: 'json',
          labels: ['api'],
        },
        {
          fileId: 'spec-4.md',
          title: 'Markdown Sample Md',
          slug: 'spec4-md',
          type: 'unknown',
          format: 'unknown',
          labels: ['label1'],
        },
      ],
    },
  ],
  documents: [
    {
      packageId: 'project-2',
      name: 'Project 2',
      parentPackages: [],
      version: '2.6',
      status: 'draft',
      publishedAt: '2022-09-13T12:52:53.419067Z',
      files: [
        {
          fileId: 'spec1.yaml',
          title: 'Service 1',
          slug: 'spec1-yaml',
          type: 'openapi-3-1',
          format: 'yaml',
          labels: ['label1'],
        },
        {
          fileId: 'spec2.json',
          title: 'Service 2',
          slug: 'spec2-json',
          type: 'json-schema',
          format: 'json',
          labels: ['api'],
        },
      ],
    },
  ],
}

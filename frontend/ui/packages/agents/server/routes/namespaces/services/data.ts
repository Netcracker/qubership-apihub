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

import type { DiscoveryStatus } from '../../../types'
import {
  COMPLETE_DISCOVERY_STATUS,
  ERROR_DISCOVERY_STATUS,
  NONE_DISCOVERY_STATUS,
  RUNNING_DISCOVERY_STATUS,
} from '../../../types'
import type { ServicesDto } from './types'

export const NONE_SERVICES_DTO: ServicesDto = {
  status: NONE_DISCOVERY_STATUS,
  services: [],
}

export const RUNNING_SERVICES_DTO: ServicesDto = {
  status: RUNNING_DISCOVERY_STATUS,
  services: [
    {
      id: 'service-1',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/graphql-sample.json',
          name: 'Graphql Sample',
          format: 'json',
          type: 'graphql',
        },
        {
          fileId: 'docs/schema-sample.json',
          name: 'JSON Schema Sample',
          format: 'json',
          type: 'unknown',
        },
        {
          fileId: 'docs/readme.md',
          name: 'README',
          format: 'md',
          type: 'markdown',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4', '22.3', '22.2', '22.1'],
        url: 'https://apihub.example.com',
      },
      availablePromoteStatuses: ['draft', 'release'],
      serviceLabels: {
        'service-1': 'label-1',
        'service-2': 'label-2',
      },
    },
    {
      id: 'service-2',
      specs: [],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.3', '22.1'],
        url: 'https://apihub.example.com',
      },
      availablePromoteStatuses: ['draft', 'release'],
      serviceLabels: {
        'service-1': 'label-1',
        'service-2': 'label-2',
      },
    },
    {
      id: 'service-1',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4', '22.3', '22.2', '22.1'],
        url: 'https://apihub.example.com',
      },
      availablePromoteStatuses: ['draft'],
      serviceLabels: {
        'service-1': 'label-1',
        'service-2': 'label-2',
      },
    },
    {
      id: 'service-3',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/default.json',
          name: 'Default',
          format: 'json',
          type: 'swagger',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4', '22.3', '22.2'],
        url: 'https://apihub.example.com',
      },
    },
    {
      id: 'service-4',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/default.json',
          name: 'Default',
          format: 'json',
          type: 'swagger',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4', '22.3', '22.2', '22.1'],
        url: 'https://apihub.example.com',
      },
    },
  ],
}

export const COMPLETE_SERVICES_DTO: ServicesDto = {
  status: COMPLETE_DISCOVERY_STATUS,
  services: [
    {
      id: 'service-1',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/graphql-sample.json',
          name: 'Graphql Sample',
          format: 'json',
          type: 'graphql',
        },
        {
          fileId: 'docs/schema-sample.json',
          name: 'JSON Schema Sample',
          format: 'json',
          type: 'unknown',
        },
        {
          fileId: 'docs/readme.md',
          name: 'README',
          format: 'md',
          type: 'markdown',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4', '22.3', '22.2', '22.1'],
        url: 'https://apihub.example.com',
      },
      availablePromoteStatuses: ['draft', 'release'],
      serviceLabels: {
        'service-1': 'label-1',
        'service-2': 'label-2',
      },
    },
    {
      id: 'service-2',
      specs: [],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.3', '22.1'],
        url: 'https://apihub.example.com',
      },
      availablePromoteStatuses: ['draft', 'release'],
      serviceLabels: {
        'service-1': 'label-1',
        'service-2': 'label-2',
      },
    },
    {
      id: 'service-1-2',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.1'],
        url: 'https://apihub.example.com',
      },
      serviceLabels: {
        'service-1': 'label-1',
        'service-2': 'label-2',
      },
    },
    {
      id: 'service-3',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/default.json',
          name: 'Default',
          format: 'json',
          type: 'swagger',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4', '22.3', '22.2'],
        url: 'https://apihub.example.com',
      },
    },
    {
      id: 'service-4',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/default.json',
          name: 'Default',
          format: 'json',
          type: 'swagger',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4', '22.3', '22.2', '22.1'],
        url: 'https://apihub.example.com',
      },
    },
    {
      id: 'service-5',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/default.json',
          name: 'Default',
          format: 'json',
          type: 'swagger',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4'],
        url: 'https://apihub.example.com',
      },
    },
    {
      id: 'service-4-1',
      specs: [],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.3', '22.2'],
        url: 'https://apihub.example.com',
      },
    },
    {
      id: 'service-6',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/default.json',
          name: 'Default',
          format: 'json',
          type: 'swagger',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4', '22.1'],
        url: 'https://apihub.example.com',
      },
    },
    {
      id: 'service-1-3',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/default.json',
          name: 'Default',
          format: 'json',
          type: 'swagger',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4', '22.3', '22.2', '22.1'],
        url: 'https://apihub.example.com',
      },
    },
    {
      id: 'service-2-2',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/default.json',
          name: 'Default',
          format: 'json',
          type: 'swagger',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: [],
        url: 'https://apihub.example.com',
      },
    },
    {
      id: 'service-2-3',
      specs: [
        {
          fileId: 'docs/team-management.yaml',
          name: 'Team Management',
          format: 'yaml',
          type: 'openapi',
        },
        {
          fileId: 'docs/public-api.yaml',
          name: 'Public API',
          format: 'yaml',
          type: 'openapi',
        },
      ],
      baseline: {
        packageId: 'MYPKG',
        name: 'My Package',
        versions: ['22.4', '22.3', '22.2', '22.1'],
        url: 'https://apihub.example.com',
      },
    },
  ],
}

export const ERROR_SERVICES_DTO: ServicesDto = {
  status: ERROR_DISCOVERY_STATUS,
  services: [],
}

export const SERVICES_DTO: Record<DiscoveryStatus, ServicesDto> = {
  none: NONE_SERVICES_DTO,
  running: RUNNING_SERVICES_DTO,
  complete: COMPLETE_SERVICES_DTO,
  error: ERROR_SERVICES_DTO,
}

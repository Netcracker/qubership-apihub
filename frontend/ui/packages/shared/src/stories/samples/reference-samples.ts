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

import type { PackageReference } from '../../entities/version-references'
import { PACKAGE_KIND } from '../../entities/packages'
import { DRAFT_VERSION_STATUS } from '../../entities/version-status'

export const references: PackageReference[] = [
  {
    'kind': PACKAGE_KIND,
    'name': 'APIHUB backend',
    'version': '2023.1-3@1',
    'status': DRAFT_VERSION_STATUS,
    'parentPackages': [
      'Primary',
      'Secondary',
      'APIHUB',
    ],
    'key': 'QS.AH',
    'latestRevision': true,
  },
  {
    'kind': PACKAGE_KIND,
    'name': 'petstore',
    'version': '2023.1@1',
    'status': DRAFT_VERSION_STATUS,
    'parentPackages': [
      'Primary',
      'Secondary',
      'apps',
      'Petstore',
    ],
    'key': 'PRMR.SCDR.APPS.PTSTR',
    'latestRevision': false,
  },
  {
    'kind': PACKAGE_KIND,
    'name': 'petstore',
    'version': '2023.1@5',
    'status': DRAFT_VERSION_STATUS,
    'parentPackages': [
      'Primary',
      'Secondary',
      'apps',
      'Petstore',
    ],
    'key': 'PRMR.SCDR.APPS.PTSTR',
    'latestRevision': true,
  },
  {
    'kind': PACKAGE_KIND,
    'name': 'bookstore',
    'version': 'draft_1@1',
    'status': DRAFT_VERSION_STATUS,
    'parentPackages': [
      'Primary',
      'Secondary',
      'apps',
      'Bookstore',
    ],
    'key': 'PRMR.SCDR.APPS.BKSTR',
    'latestRevision': true,
  },
  {
    'kind': PACKAGE_KIND,
    'name': 'My Package',
    'version': 'test_1@1',
    'status': DRAFT_VERSION_STATUS,
    'parentPackages': [
      'Personal sandboxes',
      'My Package',
    ],
    'key': 'PSB.MYPKG',
    'latestRevision': true,
  },
]

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

import type { Packages } from '../../entities/packages'
import { PACKAGE_KIND } from '../../entities/packages'
import { READ_PERMISSION } from '../../entities/package-permissions'

export const PACKAGE_OPTIONS: Packages = [
  {
    key: 'package-1',
    kind: PACKAGE_KIND,
    name: 'Package 1',
    alias: 'package1',
    parents: [],
    isFavorite: false,
    description: '',
    defaultReleaseVersion: '',
    restGroupingPrefix: '',
    permissions: [
      READ_PERMISSION,
    ],
  },
  {
    key: 'package-2',
    kind: PACKAGE_KIND,
    name: 'Package 2',
    alias: 'package2',
    parents: [],
    isFavorite: true,
    permissions: [
      READ_PERMISSION,
    ],
    defaultReleaseVersion: '',
    restGroupingPrefix: '',
    description: '',
  },
  {
    key: 'package-3',
    kind: PACKAGE_KIND,
    name: 'Package 3',
    alias: 'package3',
    isFavorite: false,
    description: '',
    restGroupingPrefix: '',
    permissions: [
      READ_PERMISSION,
    ],
  },
]

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

import type { Version } from '@test-data/props'
import { PK_PUB_IMM_1, PK_PUB_VAR_2 } from './packages'
import { FILE_P_MARKDOWN, FILE_P_PETSTORE20, FILE_P_PETSTORE30 } from './files'

export const V_P_PKG_EDITING_SEARCH_R: Version = {
  pkg: PK_PUB_IMM_1,
  version: 'editing-search',
  status: 'draft',
  files: [
    { file: FILE_P_PETSTORE30, labels: ['atui-label'] },
    { file: FILE_P_PETSTORE20 },
    { file: FILE_P_MARKDOWN },
  ],
} as const

export const V_P_PKG_EDITING_FOR_NEW_REVISION_N: Version = {
  pkg: PK_PUB_VAR_2,
  version: '2000.1',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30 }],
} as const

export const V_P_PKG_EDITING_FOR_NEW_VERSION_N: Version = {
  pkg: PK_PUB_VAR_2,
  version: '2000.2',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30 }],
} as const

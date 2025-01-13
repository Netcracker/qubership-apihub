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

import { Package } from '@test-data/props'
import { GRP_P_OWNER_CRUD_N, GRP_P_OWNER_ROOT_N } from './groups'
import { TOKEN_OWNER_PACKAGE } from './tokens'
import { DEF_PREFIX_GROUP } from '@test-data/portal'

export const PKG_P_OWNER_N = new Package({
  name: 'Owner',
  alias: 'POWNER',
  parent: GRP_P_OWNER_ROOT_N,
  restGroupingPrefix: DEF_PREFIX_GROUP,
  apiKeys: [TOKEN_OWNER_PACKAGE],
}, { kindPrefix: true })

export const PKG_P_OWNER_EDITING_N = new Package({
  name: 'Owner-editing',
  alias: 'POWNERE',
  parent: GRP_P_OWNER_CRUD_N,
}, { kindPrefix: true })

export const PKG_P_OWNER_DELETING_N = new Package({
  name: 'Owner-deleting',
  alias: 'POWNERD',
  parent: GRP_P_OWNER_CRUD_N,
}, { kindPrefix: true })

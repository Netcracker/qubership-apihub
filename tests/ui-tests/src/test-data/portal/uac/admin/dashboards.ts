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

import { Dashboard } from '@test-data/props'
import { GRP_P_ADMIN_CRUD_N, GRP_P_ADMIN_ROOT_N } from './groups'
import { TOKEN_ADMIN_DASHBOARD } from './tokens'

export const DSH_P_ADMIN_N = new Dashboard({
  name: 'Admin',
  alias: 'DADMIN',
  parent: GRP_P_ADMIN_ROOT_N,
  apiKeys: [TOKEN_ADMIN_DASHBOARD],
}, { kindPrefix: true })

export const DSH_P_ADMIN_EDITING_N = new Dashboard({
  name: 'Admin-editing',
  alias: 'DADMINE',
  parent: GRP_P_ADMIN_CRUD_N,
  apiKeys: [TOKEN_ADMIN_DASHBOARD],
}, { kindPrefix: true })

export const DSH_P_ADMIN_DELETING_N = new Dashboard({
  name: 'Admin-deleting',
  alias: 'DADMIND',
  parent: GRP_P_ADMIN_CRUD_N,
}, { kindPrefix: true })

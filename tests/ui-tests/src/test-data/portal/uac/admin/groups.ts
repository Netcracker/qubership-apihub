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

import { Group } from '@test-data/props'
import { GRP_P_UAC_N } from '../general/groups'
import { TOKEN_ADMIN_GROUP } from './tokens'

export const GRP_P_ADMIN_ROOT_N = new Group({
  name: 'Admin',
  alias: 'GAROOTN',
  parent: GRP_P_UAC_N,
})

export const GRP_P_ADMIN_N = new Group({
  name: 'Admin',
  alias: 'GADMIN',
  parent: GRP_P_ADMIN_ROOT_N,
  apiKeys: [TOKEN_ADMIN_GROUP],
}, { kindPrefix: true })

export const GRP_P_ADMIN_CRUD_N = new Group({
  name: 'Admin-crud',
  alias: 'GADMINCRD',
  parent: GRP_P_ADMIN_ROOT_N,
}, { kindPrefix: true })

export const GRP_P_ADMIN_EDITING_N = new Group({
  name: 'Admin-editing',
  alias: 'GADMINE',
  parent: GRP_P_ADMIN_CRUD_N,
  apiKeys: [TOKEN_ADMIN_GROUP],
}, { kindPrefix: true })

export const GRP_P_ADMIN_DELETING_N = new Group({
  name: 'Admin-deleting',
  alias: 'GADMIND',
  parent: GRP_P_ADMIN_CRUD_N,
}, { kindPrefix: true })

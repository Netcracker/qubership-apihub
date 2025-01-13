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
import { TOKEN_EDITOR_GROUP } from './tokens'

export const GRP_P_EDITOR_ROOT_N = new Group({
  name: 'Editor',
  alias: 'GEROOTN',
  parent: GRP_P_UAC_N,
})

export const GRP_P_EDITOR_N = new Group({
  name: 'Editor',
  alias: 'GEDITOR',
  parent: GRP_P_EDITOR_ROOT_N,
  apiKeys: [TOKEN_EDITOR_GROUP],
}, { kindPrefix: true })

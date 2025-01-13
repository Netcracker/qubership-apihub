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
import { P_GRP_GROUPING_R } from '../groups'

export const P_PKG_DMGR_PET_R = new Package({
  name: 'Dsh-man-grouping-pet',
  alias: 'DMGRPET',
  parent: P_GRP_GROUPING_R,
  description: 'Reusable. Uses for dashboards.',
}, { kindPrefix: true })

export const P_PKG_DMGR_USER_R = new Package({
  name: 'Dsh-man-grouping-user',
  alias: 'DMGRUSER',
  parent: P_GRP_GROUPING_R,
  description: 'Reusable. Uses for dashboards.',
}, { kindPrefix: true })

export const P_PKG_DMGR_STORE_R = new Package({
  name: 'Dsh-man-grouping-store',
  alias: 'DMGRSTORE',
  parent: P_GRP_GROUPING_R,
  description: 'Reusable. Uses for dashboards.',
}, { kindPrefix: true })

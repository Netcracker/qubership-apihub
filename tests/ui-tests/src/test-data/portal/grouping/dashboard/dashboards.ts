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
import { P_GRP_GROUPING_N, P_GRP_GROUPING_R } from '../groups'

export const P_DSH_DMGR_R = new Dashboard({
  name: 'Man-grouping',
  alias: 'DMGRR',
  parent: P_GRP_GROUPING_R,
  description: 'Reusable. Filtering. 3 packages',
}, { kindPrefix: true })

export const P_DSH_DMGR1_N = new Dashboard({
  name: 'Man-grouping-1',
  alias: 'DMGRN1',
  parent: P_GRP_GROUPING_N,
  description: 'Non-reusable. CRUD. 2 packages',
}, { kindPrefix: true })

export const P_DSH_DMGR2_N = new Dashboard({
  name: 'Man-grouping-2',
  alias: 'DMGRN2',
  parent: P_GRP_GROUPING_N,
  description: 'Non-reusable. Propagation; Activity history. 2 packages',
}, { kindPrefix: true })

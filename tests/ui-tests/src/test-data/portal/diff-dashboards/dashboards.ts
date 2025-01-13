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
import { P_GRP_DIFF_DSH_11_R, P_GRP_DIFF_DSH_13_R, P_GRP_DIFF_DSH_22_R } from './groups'

export const P_DSH_DIFF_111_R = new Dashboard({
  name: 'Diff-111',
  alias: 'DDD111R',
  parent: P_GRP_DIFF_DSH_11_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

export const P_DSH_DIFF_222_R = new Dashboard({
  name: 'Diff-222',
  alias: 'DDD222R',
  parent: P_GRP_DIFF_DSH_13_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

export const P_DSH_DIFF_333_R = new Dashboard({
  name: 'Diff-333',
  alias: 'DDD333R',
  parent: P_GRP_DIFF_DSH_13_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

export const P_DSH_DIFF_444_R = new Dashboard({
  name: 'Diff-444',
  alias: 'DDD444R',
  parent: P_GRP_DIFF_DSH_22_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

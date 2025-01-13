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
import { P_WS_DSH_COMPARISON1_R, P_WS_DSH_COMPARISON2_R } from './workspaces'

export const P_GRP_DIFF_DSH_11_R = new Group({
  name: 'Diff-dsh-11',
  alias: 'DD11R',
  parent: P_WS_DSH_COMPARISON1_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

export const P_GRP_DIFF_DSH_12_R = new Group({
  name: 'Diff-dsh-12',
  alias: 'DD12R',
  parent: P_GRP_DIFF_DSH_11_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

export const P_GRP_DIFF_DSH_13_R = new Group({
  name: 'Diff-dsh-13',
  alias: 'DD13R',
  parent: P_GRP_DIFF_DSH_12_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

export const P_GRP_DIFF_DSH_21_R = new Group({
  name: 'Diff-dsh-21',
  alias: 'DD21R',
  parent: P_WS_DSH_COMPARISON2_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

export const P_GRP_DIFF_DSH_22_R = new Group({
  name: 'Diff-dsh-22',
  alias: 'DD22R',
  parent: P_GRP_DIFF_DSH_21_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

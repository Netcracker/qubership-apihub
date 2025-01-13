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

import { ALIAS_PREFIX } from '@test-data'
import { Workspace } from '@test-data/props'

export const P_WS_DSH_COMPARISON1_R = new Workspace({
  name: 'Portal-1',
  alias: `${ALIAS_PREFIX}P10-${process.env.TEST_ID_R}`,
  description: 'Reusable. Different Dashboards comparison',
}, { testPrefix: true, testId: 'reusable' })

export const P_WS_DSH_COMPARISON2_R = new Workspace({
  name: 'Portal-2',
  alias: `${ALIAS_PREFIX}P11-${process.env.TEST_ID_R}`,
  description: 'Reusable. Different Dashboards comparison',
}, { testPrefix: true, testId: 'reusable' })

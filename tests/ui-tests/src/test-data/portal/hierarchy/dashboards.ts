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
import { GRP_P_HIERARCHY_R } from './groups'

export const DSH_P_HIERARCHY_BREAKING_R = new Dashboard({
  name: 'Breaking',
  alias: 'DBWCBR',
  parent: GRP_P_HIERARCHY_R,
}, { testPrefix: true, kindPrefix: true })

export const DSH_P_HIERARCHY_NON_BREAKING_R = new Dashboard({
  name: 'Non-breaking',
  alias: 'DBWCNR',
  parent: GRP_P_HIERARCHY_R,
}, { testPrefix: true, kindPrefix: true })

export const DSH_P_HIERARCHY_NO_CHANGES_R = new Dashboard({
  name: 'No-changes',
  alias: 'DBWCNCR',
  parent: GRP_P_HIERARCHY_R,
}, { testPrefix: true, kindPrefix: true })

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
import { P_GR_COPYING_IMM, P_GR_COPYING_VAR } from './groups'
import { RV_PATTERN_NEW } from '../other'

export const P_DSH_CP_SOURCE = new Dashboard({
  name: 'Copying-source',
  alias: 'DCPSRC',
  parent: P_GR_COPYING_IMM,
  description: 'Reusable source dashboard for "copying versions"',
}, { kindPrefix: true })
export const P_DSH_CP_EMPTY = new Dashboard({
  name: 'Copying-empty',
  alias: 'DCPEMPT',
  parent: P_GR_COPYING_VAR,
  description: 'Non-reusable target dashboard for "copy to empty versions"',
}, { kindPrefix: true })
export const P_DSH_CP_RELEASE = new Dashboard({
  name: 'Copying-release',
  alias: 'DCPRLSE',
  parent: P_GR_COPYING_VAR,
  description: 'Non-reusable target dashboard for "copy with previous version"',
}, { kindPrefix: true })
export const P_DSH_CP_PATTERN = new Dashboard({
  name: 'Copying-pattern',
  alias: 'DCPPTRN',
  parent: P_GR_COPYING_IMM,
  releaseVersionPattern: RV_PATTERN_NEW,
  description: 'Reusable target dashboard for "copy with wrong pattern"',
}, { kindPrefix: true })

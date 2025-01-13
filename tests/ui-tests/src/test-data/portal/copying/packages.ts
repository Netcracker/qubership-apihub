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
import { P_GR_COPYING_IMM, P_GR_COPYING_VAR } from './groups'
import { RV_PATTERN_NEW } from '../other'

export const P_PK_CP_SOURCE = new Package({
  name: 'Copying-source',
  alias: 'PCPSRC',
  parent: P_GR_COPYING_IMM,
  restGroupingPrefix: '/api/{group}/',
  description: 'Reusable source package for "copying versions"',
}, { kindPrefix: true })
export const P_PK_CP_EMPTY = new Package({
  name: 'Copying-empty',
  alias: 'PCPEMPT',
  parent: P_GR_COPYING_VAR,
  restGroupingPrefix: '/api/{group}/',
  description: 'Non-reusable target package for "copy to empty versions"',
}, { kindPrefix: true })
export const P_PK_CP_RELEASE = new Package({
  name: 'Copying-release',
  alias: 'PCPRLSE',
  parent: P_GR_COPYING_VAR,
  description: 'Non-reusable target package for "copy with previous version"',
}, { kindPrefix: true })
export const P_PK_CP_PATTERN = new Package({
  name: 'Copying-pattern',
  alias: 'PCPPTRN',
  parent: P_GR_COPYING_IMM,
  releaseVersionPattern: RV_PATTERN_NEW,
  description: 'Reusable target package for "copy with wrong pattern"',
}, { kindPrefix: true })

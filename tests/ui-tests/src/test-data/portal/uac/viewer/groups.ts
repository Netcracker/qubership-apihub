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
import { GRP_P_UAC_R } from '../general/groups'
import { TOKEN_VIEWER_GROUP } from './tokens'

export const GRP_P_VIEWER_ROOT_R = new Group({
  name: 'Viewer',
  alias: 'GVROOT',
  parent: GRP_P_UAC_R,
})

export const GRP_P_VIEWER_R = new Group({
  name: 'Viewer',
  alias: 'GVIEWER',
  parent: GRP_P_VIEWER_ROOT_R,
  apiKeys: [TOKEN_VIEWER_GROUP],
}, { kindPrefix: true })

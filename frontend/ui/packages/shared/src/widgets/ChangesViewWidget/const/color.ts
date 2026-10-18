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

import type { ActionType } from '../../../entities/change-severities'
import { ADD_ACTION_TYPE, REMOVE_ACTION_TYPE, REPLACE_ACTION_TYPE } from '../../../entities/change-severities'

export const ROW_COLOR_MAP: Partial<Record<ActionType, string>> = {
  [ADD_ACTION_TYPE]: '#00BB5B20',
  [REMOVE_ACTION_TYPE]: '#FF526020',
  [REPLACE_ACTION_TYPE]: '#FFB02E20',
}

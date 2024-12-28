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

import { API_AUDIENCE_COLUMN_ID, API_KIND_COLUMN_ID, ENDPOINT_COLUMN_ID, PACKAGE_COLUMN_ID, TAGS_COLUMN_ID } from '../../../entities/table-columns'
import type { OperationChangeData } from '../../../entities/version-changelog'
import type { ColumnModel } from '../../../hooks/table-resizing/useColumnResizing'

export type ChangesViewTableData = {
  change: Readonly<OperationChangeData>
  canExpand: boolean
}

export const CHANGES_COLUMN_ID = 'changes-column'

export const COLUMNS_MODELS: ColumnModel[] = [
  { name: ENDPOINT_COLUMN_ID },
  { name: TAGS_COLUMN_ID, width: 167 },
  { name: PACKAGE_COLUMN_ID, width: 245 },
  { name: CHANGES_COLUMN_ID, fixedWidth: 218 },
  { name: API_KIND_COLUMN_ID, fixedWidth: 96 },
  { name: API_AUDIENCE_COLUMN_ID, fixedWidth: 110 },
]

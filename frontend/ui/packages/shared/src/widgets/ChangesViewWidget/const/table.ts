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
import type { OperationChangeBase } from '../../../entities/version-changelog'
import type { ColumnModel } from '../../../hooks/table-resizing/useColumnResizing'

export type ChangesViewTableData = {
  change: Readonly<OperationChangeBase>
  canExpand: boolean
}

export const CHANGES_COLUMN_ID = 'changes-column'

const ENDPOINT_COLUMN_PERCENTAGE = 0.4
const CHANGES_COLUMN_MIN_WIDTH = 218

const API_KIND_COLUMN_WIDTH = 96
const API_AUDIENCE_COLUMN_WIDTH = 110

function buildColumnsModels(shareableColumnIds: string[]): ColumnModel[] {
  const remainingPercentage = (1 - ENDPOINT_COLUMN_PERCENTAGE) / shareableColumnIds.length
  return [
    { name: ENDPOINT_COLUMN_ID, percentage: ENDPOINT_COLUMN_PERCENTAGE },
    ...shareableColumnIds.map(name => ({
      name: name,
      percentage: remainingPercentage,
      ...(name === CHANGES_COLUMN_ID ? { minWidth: CHANGES_COLUMN_MIN_WIDTH } : {}),
    })),
    { name: API_KIND_COLUMN_ID, fixedWidth: API_KIND_COLUMN_WIDTH },
    { name: API_AUDIENCE_COLUMN_ID, fixedWidth: API_AUDIENCE_COLUMN_WIDTH },
  ]
}

export const PACKAGE_COLUMNS_MODELS: ColumnModel[] = buildColumnsModels([
  TAGS_COLUMN_ID,
  CHANGES_COLUMN_ID,
])

export const DASHBOARD_COLUMNS_MODELS: ColumnModel[] = buildColumnsModels([
  TAGS_COLUMN_ID,
  PACKAGE_COLUMN_ID,
  CHANGES_COLUMN_ID,
])

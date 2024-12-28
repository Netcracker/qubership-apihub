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

import type { Service } from '@apihub/entities/services'
import type { FilterFn } from '@tanstack/react-table'

type TableData = Partial<{
  service: Service
  children: TableData[]
}>

export const serviceFilter: FilterFn<TableData> = (row, columnId, value) => {
  const { service } = row.original
  if (!service) {
    // keeps the subrows
    return true
  }
  const { key, baseline, labels } = service
  if (value.filter && !value.filter(service)) {
    return false
  }
  const lowerCaseValue = value.searchValue.toLowerCase()
  return key.includes(lowerCaseValue) ||
    baseline?.name.toLowerCase().includes(lowerCaseValue) ||
    baseline?.packageKey.toLowerCase().includes(lowerCaseValue) ||
    Object.entries(labels ?? {}).some(([key, value]) => key.toLowerCase().includes(lowerCaseValue) || value.toLowerCase().includes(lowerCaseValue))
}

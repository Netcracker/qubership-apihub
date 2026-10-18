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

import { useViewSearchParam } from './useViewSearchParam'

export function useTableMode(defaultMode: TableMode): [TableMode, SetTablePageMode] {
  const [view, setViewSearchParam] = useViewSearchParam()

  return [
    TABLE_MODES.includes(view as TableMode) ? view as TableMode : defaultMode,
    setViewSearchParam,
  ]
}

type SetTablePageMode = (mode: TableMode) => void

export const TREE_TABLE_MODE = 'tree'
export const FLAT_TABLE_MODE = 'flat'

export const TABLE_MODES = [TREE_TABLE_MODE, FLAT_TABLE_MODE] as const

export type TableMode = typeof TABLE_MODES[number]

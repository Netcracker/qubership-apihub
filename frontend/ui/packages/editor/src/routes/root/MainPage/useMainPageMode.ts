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

export function useMainPageMode(): [MainPageMode, SetMainPageMode] {
  const [view, setViewSearchParam] = useViewSearchParam()

  return [(view ?? TREE_MAIN_PAGE_MODE) as MainPageMode, setViewSearchParam]
}

type SetMainPageMode = (mode: MainPageMode) => void

export function useIsTreeMainViewMode(): boolean {
  const [mode] = useMainPageMode()
  return mode === TREE_MAIN_PAGE_MODE
}

export function useIsTableMainViewMode(): boolean {
  const [mode] = useMainPageMode()
  return mode === FLAT_MAIN_PAGE_MODE
}

export function useIsFavoriteMainViewMode(): boolean {
  const [mode] = useMainPageMode()
  return mode === FAVORITE_MAIN_PAGE_MODE
}

export const TREE_MAIN_PAGE_MODE = 'tree'
export const FLAT_MAIN_PAGE_MODE = 'flat'
export const FAVORITE_MAIN_PAGE_MODE = 'favorite'

export type MainPageMode =
  | typeof TREE_MAIN_PAGE_MODE
  | typeof FLAT_MAIN_PAGE_MODE
  | typeof FAVORITE_MAIN_PAGE_MODE

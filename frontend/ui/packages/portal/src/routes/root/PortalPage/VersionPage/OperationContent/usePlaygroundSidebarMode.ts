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

import { EXAMPLES_VIEW_MODE, PLAYGROUND_VIEW_MODE } from '../playground-modes'
import { useSidebarPlaygroundViewMode } from '../useSidebarPlaygroundViewMode'

export function useIsPlaygroundMode(): boolean {
  const [playgroundSidebarMode] = useSidebarPlaygroundViewMode()
  return playgroundSidebarMode === PLAYGROUND_VIEW_MODE
}

export function useIsExamplesMode(): boolean {
  const [playgroundSidebarMode] = useSidebarPlaygroundViewMode()
  return playgroundSidebarMode === EXAMPLES_VIEW_MODE
}

export function useIsPlaygroundSidebarOpen(): boolean {
  const [playgroundSidebarMode] = useSidebarPlaygroundViewMode()
  return playgroundSidebarMode === PLAYGROUND_VIEW_MODE || playgroundSidebarMode === EXAMPLES_VIEW_MODE
}



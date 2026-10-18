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

export const DIRTY_STATE_LAYOUT = 'layout-dirty'
export const DIRTY_STATE_VISUAL = 'visual-dirty'
export const DIRTY_STATE_NONE = 'none'

export type DirtyState = typeof DIRTY_STATE_VISUAL | typeof DIRTY_STATE_LAYOUT | typeof DIRTY_STATE_NONE;

export function mergeDirtyState(oneState: DirtyState, anotherState: DirtyState): DirtyState {
  switch (oneState) {
    case DIRTY_STATE_NONE:
      return anotherState
    case DIRTY_STATE_VISUAL:
      return anotherState === DIRTY_STATE_LAYOUT ? DIRTY_STATE_LAYOUT : oneState
    case DIRTY_STATE_LAYOUT:
      return oneState
  }
}
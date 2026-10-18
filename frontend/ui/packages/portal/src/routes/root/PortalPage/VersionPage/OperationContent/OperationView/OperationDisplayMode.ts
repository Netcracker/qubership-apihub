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

export const DEFAULT_DISPLAY_MODE = 'default'
export const COMPARE_DISPLAY_MODE = 'compare'
export const COMPARE_SAME_OPERATIONS_MODE = 'same-operations-mode'
export const COMPARE_DIFFERENT_OPERATIONS_MODE = 'different-operations-mode'
export const COMPARE_PACKAGES_MODE = 'packages-mode'
export const COMPARE_DASHBOARDS_MODE = 'dashboards-mode'

export type OperationDisplayMode =
  | typeof DEFAULT_DISPLAY_MODE
  | typeof COMPARE_DISPLAY_MODE
  | typeof COMPARE_SAME_OPERATIONS_MODE
  | typeof COMPARE_DIFFERENT_OPERATIONS_MODE
  | typeof COMPARE_PACKAGES_MODE
  | typeof COMPARE_DASHBOARDS_MODE

export function isComparisonMode(displayMode: OperationDisplayMode): boolean {
  return [
    COMPARE_DISPLAY_MODE,
    COMPARE_SAME_OPERATIONS_MODE,
    COMPARE_DIFFERENT_OPERATIONS_MODE,
    COMPARE_PACKAGES_MODE,
    COMPARE_DASHBOARDS_MODE,
  ].includes(displayMode)
}

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

export const PLAYGROUND_VIEW_MODE = 'playground'
export const EXAMPLES_VIEW_MODE = 'examples'

export type PlaygroundSidebarViewMode =
  | typeof PLAYGROUND_VIEW_MODE
  | typeof EXAMPLES_VIEW_MODE

export const PLAYGROUND_SIDEBAR_VIEW_MODES: ReadonlyArray<Partial<PlaygroundSidebarViewMode>> = [
  PLAYGROUND_VIEW_MODE,
  EXAMPLES_VIEW_MODE,
]

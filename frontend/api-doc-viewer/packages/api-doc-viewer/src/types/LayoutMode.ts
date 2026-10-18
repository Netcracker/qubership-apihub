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

export const DOCUMENT_LAYOUT_MODE = 'document'
export const SIDE_BY_SIDE_DIFFS_LAYOUT_MODE = 'side-by-side-diffs'
export const INLINE_DIFFS_LAYOUT_MODE = 'inline-diffs'
export type LayoutMode =
  | typeof DOCUMENT_LAYOUT_MODE
  | typeof INLINE_DIFFS_LAYOUT_MODE
  | typeof SIDE_BY_SIDE_DIFFS_LAYOUT_MODE

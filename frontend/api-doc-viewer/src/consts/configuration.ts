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

import { DETAILED_DISPLAY_MODE } from '../types/DisplayMode'
import { DOCUMENT_LAYOUT_MODE } from '../types/LayoutMode'

export const DEFAULT_EXPANDED_DEPTH: number = 2
export const INFINITY_EXPANDING_DEPTH: number = 2
export const DIFF_META_KEY = Symbol('$diff')

export const DEFAULT_DISPLAY_MODE = DETAILED_DISPLAY_MODE
export const DEFAULT_LAYOUT_MODE = DOCUMENT_LAYOUT_MODE
export const DEFAULT_ROW_DEPTH = 0

// Layout

export const DEFAULT_ROW_PADDING_LEFT = 'pl-2'
export const SHIFTED_ROW_PADDING_LEFT = 'pl-7'

// Defaults & Placeholders

export const DEFAULT_SERIES_ITEM = '<empty string>'
export const DEFAULT_SERIES_ITEM_TEXT_COLOR = 'text-gray-400/[.8]'

// TODO 14.08.24 // Implement configuring gaps between group node properties.
// Possibly it should be like a graph:
// for example, there must be config for gaps between A & B, B & C, A & C
// to cover cases when one prop or more is absent

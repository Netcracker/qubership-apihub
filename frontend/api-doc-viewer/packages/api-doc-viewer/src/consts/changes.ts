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

import {
  ActionType,
  annotation,
  breaking,
  deprecated,
  DiffAction,
  DiffType,
  nonBreaking,
  risky,
  unclassified,
} from '@netcracker/qubership-apihub-api-diff'
import { DiffsClassesBuilder } from '@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities'
import { HighlightVariant } from '@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface'

export const NODE_DIFF_COLOR_MAP: Partial<Record<ActionType, string>> = {
  [DiffAction.add]: 'bg-green-50',
  [DiffAction.remove]: 'bg-red-50',
  [DiffAction.replace]: 'bg-yellow-50',
  [DiffAction.rename]: 'bg-yellow-50',
}

export const BLOCK_CONTENT_DIFF_COLOR_MAP: Partial<Record<ActionType, string>> = {
  [DiffAction.add]: DiffsClassesBuilder.borderShadow(HighlightVariant.Green),
  [DiffAction.remove]: DiffsClassesBuilder.borderShadow(HighlightVariant.Red),
  [DiffAction.replace]: DiffsClassesBuilder.borderShadow(HighlightVariant.Yellow),
}

export const INLINE_CONTENT_DIFF_COLOR_SCHEMAS: Partial<Record<ActionType, string>> = {
  [DiffAction.add]: DiffsClassesBuilder.highlighter(HighlightVariant.Green),
  [DiffAction.remove]: DiffsClassesBuilder.highlighter(HighlightVariant.Red),
  [DiffAction.replace]: DiffsClassesBuilder.highlighter(HighlightVariant.Yellow),
}

export const CHANGE_SEVERITIES: Record<DiffType, number> = {
  [breaking]: 6,
  [risky]: 5,
  [deprecated]: 4,
  [nonBreaking]: 3,
  [annotation]: 2,
  [unclassified]: 1,
}

export const DEFAULT_STRIKETHROUGH_VALUE_CLASS = 'line-through'

export const DEFAULT_MUTED_VALUE_CLASS = DiffsClassesBuilder.fontMuted()
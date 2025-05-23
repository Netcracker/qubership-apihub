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

import type { ChangeSummary, DiffTypeDto } from '@netcracker/qubership-apihub-api-processor'
import {
  annotation,
  breaking,
  deprecated,
  nonBreaking,
  unclassified,
  risky,
} from '@netcracker/qubership-apihub-api-diff'
import type {
  DiffType,
} from '@netcracker/qubership-apihub-api-diff'
import type { Color } from '../utils/types'

export const ADD_ACTION_TYPE = 'add'
export const REMOVE_ACTION_TYPE = 'remove'
export const REPLACE_ACTION_TYPE = 'replace'
export const RENAME_ACTION_TYPE = 'rename'

// TODO: Use from builder
export type ActionType =
  | typeof ADD_ACTION_TYPE
  | typeof REMOVE_ACTION_TYPE
  | typeof REPLACE_ACTION_TYPE
  | typeof RENAME_ACTION_TYPE

export const BREAKING_CHANGE_SEVERITY = breaking
export const NON_BREAKING_CHANGE_SEVERITY = nonBreaking
export const RISKY_CHANGE_SEVERITY = risky
export const DEPRECATED_CHANGE_SEVERITY = deprecated
export const ANNOTATION_CHANGE_SEVERITY = annotation
export const UNCLASSIFIED_CHANGE_SEVERITY = unclassified

export type ChangesSummary<T extends DiffType | DiffTypeDto = DiffType> = ChangeSummary<T>

export type ChangeSeverity<T = DiffType> = T

export const CHANGE_SEVERITY_COLOR_MAP: Record<ChangeSeverity, string> = {
  [breaking]: '#ED4A54',
  [risky]: '#E98554',
  [deprecated]: '#FFB02E',
  [nonBreaking]: '#6BCE70',
  [unclassified]: '#61AAF2',
  [annotation]: '#C55DCF',
}

export const CHANGE_SEVERITY_NAME_MAP: Record<ChangeSeverity, string> = {
  [breaking]: 'Breaking',
  [risky]: 'Requires Attention',
  [deprecated]: 'Deprecated',
  [nonBreaking]: 'Non-breaking',
  [unclassified]: 'Unclassified',
  [annotation]: 'Annotation',
}

export const CHANGE_SEVERITY_TOOLTIP_TITLE_MAP: Record<ChangeSeverity, string> = {
  [breaking]: 'Breaking Changes',
  [risky]: 'Changes Requiring Attention',
  [deprecated]: 'Deprecated Changes',
  [nonBreaking]: 'Non-breaking Changes',
  [unclassified]: 'Unclassified Changes',
  [annotation]: 'Annotation Changes',
}

export const CHANGE_SEVERITY_DESCRIPTION_MAP: Record<ChangeSeverity, { text: string; options?: string[] }> = {
  [breaking]: { text: 'Breaking change is a change that breaks backward compatibility with the previous version of API. For example, deleting an operation, adding a required parameter or changing type of a parameter are breaking changes.' },
  [risky]: { text: 'A change requiring attention is a change that potentially may break backward compatibility with the previous version of API, depending on the particular implementation of a client code. This category also includes breaking changes in operations annotated as no-BWC.'},
  [deprecated]: { text: 'Deprecating change is a change that annotates an operation, parameter or schema as deprecated. Removing a "deprecated" annotation is also considered a deprecating change.' },
  [nonBreaking]: { text: 'Non-breaking change is change that does not break backward compatibility with the previous version of API. For example, adding new operation or optional parameter is non-breaking change.' },
  [unclassified]: { text: 'An unclassified change is a change that cannot be classified as any of the other types.' },
  [annotation]: { text: 'An annotation change is a change to enrich the API documentation with information that does not affect the functionality of the API. For example, adding/changing/deleting descriptions or examples is annotation change.' },
}

export const CHANGE_SEVERITIES: ReadonlySet<ChangeSeverity> = new Set([
    breaking,
    risky,
    deprecated,
    nonBreaking,
    unclassified,
    annotation,
  ],
)

export const ACTION_TYPE_COLOR_MAP: Partial<Record<ActionType, Color>> = {
  [ADD_ACTION_TYPE]: 'rgba(0,187,91,0.08)',
  [REMOVE_ACTION_TYPE]: '#FFF1F2',
  [REPLACE_ACTION_TYPE]: '#FFF9EE',
}

export const DEFAULT_CHANGE_SEVERITY_MAP = {
  [breaking]: 0,
  [risky]: 0,
  [deprecated]: 0,
  [nonBreaking]: 0,
  [unclassified]: 0,
  [annotation]: 0,
}

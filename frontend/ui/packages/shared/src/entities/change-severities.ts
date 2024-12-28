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

import type { ChangeSummary } from '@netcracker/qubership-apihub-api-processor'
import type { DiffType } from '@netcracker/qubership-apihub-api-diff'
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

export const BREAKING_CHANGE_SEVERITY = 'breaking'
export const NON_BREAKING_CHANGE_SEVERITY = 'non-breaking'
export const SEMI_BREAKING_CHANGE_SEVERITY = 'semi-breaking'
export const DEPRECATED_CHANGE_SEVERITY = 'deprecated'
export const ANNOTATION_CHANGE_SEVERITY = 'annotation'
export const UNCLASSIFIED_CHANGE_SEVERITY = 'unclassified'

export type ChangesSummary = ChangesSummaryDto

export type ChangesSummaryDto = ChangeSummary

export type ChangeSeverity = DiffType

export const CHANGE_SEVERITY_COLOR_MAP: Record<ChangeSeverity, string> = {
  [BREAKING_CHANGE_SEVERITY]: '#ED4A54',
  [SEMI_BREAKING_CHANGE_SEVERITY]: '#E98554',
  [DEPRECATED_CHANGE_SEVERITY]: '#FFB02E',
  [NON_BREAKING_CHANGE_SEVERITY]: '#6BCE70',
  [UNCLASSIFIED_CHANGE_SEVERITY]: '#61AAF2',
  [ANNOTATION_CHANGE_SEVERITY]: '#C55DCF',
}

export const CHANGE_SEVERITY_NAME_MAP: Record<ChangeSeverity, string> = {
  [BREAKING_CHANGE_SEVERITY]: 'Breaking',
  [SEMI_BREAKING_CHANGE_SEVERITY]: 'Semi-breaking',
  [DEPRECATED_CHANGE_SEVERITY]: 'Deprecated',
  [NON_BREAKING_CHANGE_SEVERITY]: 'Non-breaking',
  [UNCLASSIFIED_CHANGE_SEVERITY]: 'Unclassified',
  [ANNOTATION_CHANGE_SEVERITY]: 'Annotation',
}

export const CHANGE_SEVERITY_DESCRIPTION_MAP: Record<ChangeSeverity, { text: string; options?: string[] }> = {
  [BREAKING_CHANGE_SEVERITY]: { text: 'Breaking change is a change that breaks backward compatibility with the previous version of API. For example, deleting an operation, adding a required parameter or changing type of a parameter are breaking changes.' },
  [SEMI_BREAKING_CHANGE_SEVERITY]: {
    text: 'Semi-breaking change is a change that breaks backward compatibility according to the rules:',
    options: ['operation was annotated as deprecated in at least two previous consecutive releases and then it was deleted', 'operation is marked as no-BWC'],
  },
  [DEPRECATED_CHANGE_SEVERITY]: { text: 'Deprecating change is a change that annotates an operation, parameter or schema as deprecated. Removing a "deprecated" annotation is also considered a deprecating change.' },
  [NON_BREAKING_CHANGE_SEVERITY]: { text: 'Non-breaking change is change that does not break backward compatibility with the previous version of API. For example, adding new operation or optional parameter is non-breaking change.' },
  [UNCLASSIFIED_CHANGE_SEVERITY]: { text: 'An unclassified change is a change that cannot be classified as any of the other types.' },
  [ANNOTATION_CHANGE_SEVERITY]: { text: 'An annotation change is a change to enrich the API documentation with information that does not affect the functionality of the API. For example, adding/changing/deleting descriptions or examples is annotation change.' },
}

export const CHANGE_SEVERITIES: ReadonlySet<ChangeSeverity> = new Set([
    BREAKING_CHANGE_SEVERITY,
    SEMI_BREAKING_CHANGE_SEVERITY,
    DEPRECATED_CHANGE_SEVERITY,
    NON_BREAKING_CHANGE_SEVERITY,
    ANNOTATION_CHANGE_SEVERITY,
    UNCLASSIFIED_CHANGE_SEVERITY,
  ],
)

export const ACTION_TYPE_COLOR_MAP: Partial<Record<ActionType, Color>> = {
  [ADD_ACTION_TYPE]: 'rgba(0,187,91,0.08)',
  [REMOVE_ACTION_TYPE]: '#FFF1F2',
  [REPLACE_ACTION_TYPE]: '#FFF9EE',
}

export const DEFAULT_CHANGE_SEVERITY_MAP = {
  [BREAKING_CHANGE_SEVERITY]: 0,
  [SEMI_BREAKING_CHANGE_SEVERITY]: 0,
  [DEPRECATED_CHANGE_SEVERITY]: 0,
  [NON_BREAKING_CHANGE_SEVERITY]: 0,
  [ANNOTATION_CHANGE_SEVERITY]: 0,
  [UNCLASSIFIED_CHANGE_SEVERITY]: 0,
}

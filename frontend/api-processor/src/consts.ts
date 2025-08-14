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

import { NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import {
  ANNOTATION_CHANGE_TYPE,
  BREAKING_CHANGE_TYPE,
  ChangeSummary,
  DEPRECATED_CHANGE_TYPE,
  NON_BREAKING_CHANGE_TYPE,
  RISKY_CHANGE_TYPE,
  SEMI_BREAKING_CHANGE_TYPE,
  UNCLASSIFIED_CHANGE_TYPE,
  VALIDATION_RULES_SEVERITY_LEVEL_WARNING,
  ValidationRulesSeverity,
} from './types'

export const DEFAULT_BATCH_SIZE = 32

export const DEFAULT_VALIDATION_RULES_SEVERITY_CONFIG: ValidationRulesSeverity = {
  brokenRefs: VALIDATION_RULES_SEVERITY_LEVEL_WARNING,
}

export const REVISION_DELIMITER = '@'

export const VERSION_DIFFERENCE_ACTION = {
  ADD: 'add',
  DELETE: 'delete',
  CHANGE: 'change',
  RELATION: 'relation',
  NONE: 'none',
} as const

export const DIFF_OPERATION_ACTION = {
  ADD: 'add',
  REMOVE: 'remove',
  REPLACE: 'replace',
  TEST: 'test',
  RENAME: 'rename',
} as const

export const MESSAGE_SEVERITY = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
} as const

export const PACKAGE = {
  INFO_FILE_NAME: 'info.json',
  NOTIFICATIONS_FILE_NAME: 'notifications.json',
  DOCUMENTS_FILE_NAME: 'documents.json',
  OPERATIONS_FILE_NAME: 'operations.json',
  COMPARISONS_FILE_NAME: 'comparisons.json',
  DOCUMENTS_DIR_NAME: 'documents',
  OPERATIONS_DIR_NAME: 'operations',
  COMPARISONS_DIR_NAME: 'comparisons',
} as const

export const EDITOR_MESSAGES = {
  CannotResolveFile: 'Cannot resolve file',
} as const

export const BUILD_TYPE = {
  BUILD: 'build',
  CHANGELOG: 'changelog',
  PREFIX_GROUPS_CHANGELOG: 'prefix-groups-changelog',
  DOCUMENT_GROUP: 'documentGroup', // deprecated
  REDUCED_SOURCE_SPECIFICATIONS: 'reducedSourceSpecifications', // deprecated
  MERGED_SPECIFICATION: 'mergedSpecification', // deprecated
  EXPORT_VERSION: 'exportVersion',
  EXPORT_REST_DOCUMENT: 'exportRestDocument',
  EXPORT_REST_OPERATIONS_GROUP: 'exportRestOperationsGroup',
} as const

export const EXPORT_BUILD_TYPES = [
  BUILD_TYPE.EXPORT_VERSION,
  BUILD_TYPE.EXPORT_REST_DOCUMENT,
  BUILD_TYPE.EXPORT_REST_OPERATIONS_GROUP,
]

export type ExportBuildType = typeof EXPORT_BUILD_TYPES[number]

export const VERSION_STATUS = {
  RELEASE: 'release',
  DRAFT: 'draft',
  ARCHIVED: 'archived',
  RELEASE_CANDIDATE: 'release-candidate',
  NONE: '', // non-existent status for changelog builds
} as const

export const API_KIND = {
  BWC: 'bwc',
  NO_BWC: 'no-bwc',
  EXPERIMENTAL: 'experimental',
} as const

export const API_KIND_LABEL = 'apihub/x-api-kind'

export const DOCUMENT_TYPE = {
  JSON: 'json',
  YAML: 'yaml',
  UNKNOWN: 'unknown',
} as const

export const FILE_FORMAT_YAML = 'yaml'
export const FILE_FORMAT_YML = 'yml'
export const FILE_FORMAT_JSON = 'json'
export const FILE_FORMAT_UNKNOWN = 'unknown'
export const FILE_FORMAT_GRAPHQL = 'graphql'
export const FILE_FORMAT_GQL = 'gql'
export const FILE_FORMAT_MD = 'md'
export const FILE_FORMAT_PROTO = 'proto'
export const FILE_FORMAT_HTML = 'html'

export const FILE_FORMAT = {
  JSON: FILE_FORMAT_JSON,
  YAML: FILE_FORMAT_YAML,
  YML: FILE_FORMAT_YML,
  UNKNOWN: FILE_FORMAT_UNKNOWN,
  GRAPHQL: FILE_FORMAT_GRAPHQL,
  GQL: FILE_FORMAT_GQL,
  MD: FILE_FORMAT_MD,
  PROTO: FILE_FORMAT_PROTO,
} as const

export const SUPPORTED_FILE_FORMATS = Object.values(FILE_FORMAT)

export const SYNTHETIC_TITLE_FLAG = Symbol('synthetic-title')
export const ORIGINS_SYMBOL = Symbol('origins')
export const HASH_FLAG = Symbol('hash')
export const INLINE_REFS_FLAG = Symbol('inline-refs')

export const NORMALIZE_OPTIONS: NormalizeOptions = {
  validate: true,
  liftCombiners: true,
  unify: true,
  allowNotValidSyntheticChanges: true,
  syntheticTitleFlag: SYNTHETIC_TITLE_FLAG,
}

export const EMPTY_CHANGE_SUMMARY: ChangeSummary = {
  [BREAKING_CHANGE_TYPE]: 0,
  [NON_BREAKING_CHANGE_TYPE]: 0,
  [RISKY_CHANGE_TYPE]: 0,
  [DEPRECATED_CHANGE_TYPE]: 0,
  [ANNOTATION_CHANGE_TYPE]: 0,
  [UNCLASSIFIED_CHANGE_TYPE]: 0,
}

export const EMPTY_CHANGE_SUMMARY_DTO = {
  [BREAKING_CHANGE_TYPE]: 0,
  [NON_BREAKING_CHANGE_TYPE]: 0,
  [SEMI_BREAKING_CHANGE_TYPE]: 0,
  [DEPRECATED_CHANGE_TYPE]: 0,
  [ANNOTATION_CHANGE_TYPE]: 0,
  [UNCLASSIFIED_CHANGE_TYPE]: 0,
}

export const CUSTOM_PARAMETER_API_AUDIENCE = 'x-api-audience'

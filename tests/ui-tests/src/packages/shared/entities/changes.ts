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

export const BREAKING_CHANGES = 'breaking'
export const SEMI_BREAKING_CHANGES = 'semi-breaking'
export const NON_BREAKING_CHANGES = 'non-breaking'
export const ANNOTATION_CHANGES = 'annotation'
export const UNCLASSIFIED_CHANGES = 'unclassified'

export type Changes =
  typeof BREAKING_CHANGES
  | typeof SEMI_BREAKING_CHANGES
  | typeof NON_BREAKING_CHANGES
  | typeof ANNOTATION_CHANGES
  | typeof UNCLASSIFIED_CHANGES

export type ChangeSummary =
  typeof BREAKING_CHANGES
  | typeof SEMI_BREAKING_CHANGES
  | typeof NON_BREAKING_CHANGES
  | typeof UNCLASSIFIED_CHANGES

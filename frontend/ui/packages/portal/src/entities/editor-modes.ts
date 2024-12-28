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

export const FILES_PROJECT_EDITOR_MODE = 'files'
export const REFS_PROJECT_EDITOR_MODE = 'refs'
export const PUBLISH_PROJECT_EDITOR_MODE = 'publish'
export const CHANGES_PROJECT_EDITOR_MODE = 'changes'
export const VERSIONS_PROJECT_EDITOR_MODE = 'versions'
export const SETTINGS_PROJECT_EDITOR_MODE = 'settings'

export type ProjectEditorMode =
  | typeof FILES_PROJECT_EDITOR_MODE
  | typeof REFS_PROJECT_EDITOR_MODE
  | typeof PUBLISH_PROJECT_EDITOR_MODE
  | typeof CHANGES_PROJECT_EDITOR_MODE
  | typeof VERSIONS_PROJECT_EDITOR_MODE
  | typeof SETTINGS_PROJECT_EDITOR_MODE

export const CONTENT_GROUP_EDITOR_MODE = 'content'
export const PUBLISH_GROUP_EDITOR_MODE = 'publish'
export const VERSIONS_GROUPS_EDITOR_MODE = 'versions'
export const SETTINGS_GROUPS_EDITOR_MODE = 'settings'

export type GroupEditorMode =
  | typeof CONTENT_GROUP_EDITOR_MODE
  | typeof PUBLISH_GROUP_EDITOR_MODE
  | typeof VERSIONS_GROUPS_EDITOR_MODE
  | typeof SETTINGS_GROUPS_EDITOR_MODE

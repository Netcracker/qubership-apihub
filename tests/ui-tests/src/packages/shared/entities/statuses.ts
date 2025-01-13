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

export const RELEASE_VERSION_STATUS = 'release'
export const DRAFT_VERSION_STATUS = 'draft'
export const ARCHIVED_VERSION_STATUS = 'archived'

export type VersionStatuses =
  | typeof RELEASE_VERSION_STATUS
  | typeof DRAFT_VERSION_STATUS
  | typeof ARCHIVED_VERSION_STATUS

export const RELEASE_VERSION_STATUS_TITLE = 'Release'
export const DRAFT_VERSION_STATUS_TITLE = 'Draft'
export const ARCHIVED_VERSION_STATUS_TITLE = 'Archived'

export type VersionStatusTitles =
  | typeof RELEASE_VERSION_STATUS_TITLE
  | typeof DRAFT_VERSION_STATUS_TITLE
  | typeof ARCHIVED_VERSION_STATUS_TITLE

export const AGENT_SUCCESS_STATUS_ICON = 'CheckCircleRoundedIcon'
export const AGENT_WARNING_STATUS_ICON = 'ErrorRoundedIcon'
export const AGENT_ERROR_STATUS_ICON = 'CancelIcon'

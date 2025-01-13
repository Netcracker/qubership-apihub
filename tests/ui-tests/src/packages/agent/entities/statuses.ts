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

import type {
  DRAFT_VERSION_STATUS,
  DRAFT_VERSION_STATUS_TITLE,
  RELEASE_VERSION_STATUS,
  RELEASE_VERSION_STATUS_TITLE,
} from '@shared/entities'

export const INITIAL_STEP_STATUS = 'Initial'
export const RUNNING_STEP_STATUS = 'Running'
export const SUCCESS_STEP_STATUS = 'Success'
export const ERROR_STEP_STATUS = 'Error'

export type AgentVersionStatuses =
  | typeof DRAFT_VERSION_STATUS
  | typeof RELEASE_VERSION_STATUS

export type AgentVersionStatusTitles =
  | typeof DRAFT_VERSION_STATUS_TITLE
  | typeof RELEASE_VERSION_STATUS_TITLE

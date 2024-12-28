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

import type { PublishStatus } from '@apihub/entities/statuses'
import type {
  StatusMarkerVariant} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import {
  ERROR_STATUS_MARKER_VARIANT,
  LOADING_STATUS_MARKER_VARIANT,
  SUCCESS_STATUS_MARKER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  NONE_PUBLISH_STATUS,
  RUNNING_PUBLISH_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import type {
  StepStatus} from './ServicesPage/ServicesPageProvider/ServicesStepsProvider'
import {
  ERROR_STEP_STATUS,
  INITIAL_STEP_STATUS,
  RUNNING_STEP_STATUS,
  SUCCESS_STEP_STATUS,
} from './ServicesPage/ServicesPageProvider/ServicesStepsProvider'

export const PUBLISH_STATUS_TO_STATUS_MARKER_VARIANT_MAP: Record<PublishStatus, StatusMarkerVariant> = {
  [NONE_PUBLISH_STATUS]: LOADING_STATUS_MARKER_VARIANT,
  [RUNNING_PUBLISH_STATUS]: LOADING_STATUS_MARKER_VARIANT,
  [COMPLETE_PUBLISH_STATUS]: SUCCESS_STATUS_MARKER_VARIANT,
  [ERROR_PUBLISH_STATUS]: ERROR_STATUS_MARKER_VARIANT,
}

export const PUBLISH_STATUS_TO_STEP_STATUS_MAP: Record<PublishStatus, StepStatus> = {
  [NONE_PUBLISH_STATUS]: INITIAL_STEP_STATUS,
  [RUNNING_PUBLISH_STATUS]: RUNNING_STEP_STATUS,
  [COMPLETE_PUBLISH_STATUS]: SUCCESS_STEP_STATUS,
  [ERROR_PUBLISH_STATUS]: ERROR_STEP_STATUS,
}

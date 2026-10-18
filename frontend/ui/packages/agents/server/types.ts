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

export type Writeable<T> = {
  -readonly [P in keyof T]: T[P]
}

export type DeepWriteable<T> = {
  -readonly [P in keyof T]: DeepWriteable<T[P]>
}

export const NONE_DISCOVERY_STATUS = 'none'
export const RUNNING_DISCOVERY_STATUS = 'running'
export const COMPLETE_DISCOVERY_STATUS = 'complete'
export const ERROR_DISCOVERY_STATUS = 'error'

export type DiscoveryStatus =
  | typeof NONE_DISCOVERY_STATUS
  | typeof RUNNING_DISCOVERY_STATUS
  | typeof COMPLETE_DISCOVERY_STATUS
  | typeof ERROR_DISCOVERY_STATUS

export type State = {
  discovery: {
    status: DiscoveryStatus
  }
}

export const NONE_PUBLISH_STATUS = 'none'
export const RUNNING_PUBLISH_STATUS = 'running'
export const COMPLETE_PUBLISH_STATUS = 'complete'
export const ERROR_PUBLISH_STATUS = 'error'

export type PublishStatus =
  | typeof NONE_PUBLISH_STATUS // technical status
  | typeof RUNNING_PUBLISH_STATUS
  | typeof COMPLETE_PUBLISH_STATUS
  | typeof ERROR_PUBLISH_STATUS

export type PublishDetails = PublishDetailsDto

export type PublishDetailsDto = {
  publishId: string
  status: PublishStatus
  message?: string
}

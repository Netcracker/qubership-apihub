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

export const NO_PREVIOUS_VERSION = {
  severity: 2,
  message: 'No previous version specified',
}

export const NO_BREAKING_CHANGES_FOR_BWC = {
  severity: 2,
  message: 'No breaking changes to perform BWC on',
}

export const NO_CHANGED_OPERATIONS = {
  severity: 2,
  message: 'No changed operations to compare',
}

export const NO_PRE_PREVIOUS_VERSION_FOR_V1 = {
  severity: 1,
  message: 'No pre-previous version for version v1 changelog',
}

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

export const BADGE_KIND_DEFAULT = 'default'
export const BADGE_KIND_DEFAULT_OUTLINE = 'default-outline'
export const BADGE_KIND_INFO = 'info'
export const BADGE_KIND_WARNING = 'warning'
export const BADGE_KIND_ALTERNATIVE_INFO = 'alt-info'
export const BADGE_KIND_ERROR = 'error'
export const BADGE_KIND_SUCCESS = 'success'
export type BadgeKind =
  | typeof BADGE_KIND_DEFAULT
  | typeof BADGE_KIND_DEFAULT_OUTLINE
  | typeof BADGE_KIND_INFO
  | typeof BADGE_KIND_WARNING
  | typeof BADGE_KIND_ALTERNATIVE_INFO
  | typeof BADGE_KIND_ERROR
  | typeof BADGE_KIND_SUCCESS

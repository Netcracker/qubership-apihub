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

import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
  ApihubApiCompatibilityKind,
  isNoBwcLike,
} from '../../consts'

/**
 * The api kind scope element value for one or more resolved api-kinds: no-bwc if any of them is no-bwc-like.
 * Pass one kind for a removal, keyed on the previous side, or both for a modification.
 */
export const toApiKind = (...apiKinds: (ApihubApiCompatibilityKind | undefined)[]): ApihubApiCompatibilityKind =>
  (apiKinds.some(isNoBwcLike)
    ? APIHUB_API_COMPATIBILITY_KIND_NO_BWC
    : APIHUB_API_COMPATIBILITY_KIND_BWC)

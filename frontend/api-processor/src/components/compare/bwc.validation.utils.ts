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

import { ApihubApiCompatibilityKind, isNoBwcLike } from '../../consts'
import {
  API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE,
  API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE,
  ApiCompatibilityKind,
} from '@netcracker/qubership-apihub-api-diff'

/**
 * Maps one or more resolved api-kinds to an api-diff compatibility scope:
 * NOT backward compatible (→ risky) if ANY of the given api-kinds is no-bwc-like,
 * otherwise backward compatible (→ breaking stays breaking).
 *
 * Shared by the REST/GraphQL/AsyncAPI bwc scope functions — pass a single kind
 * (e.g. removal keyed on the previous kind) or several (e.g. either-side modification).
 */
export const toApiCompatibilityKind = (...apiKinds: (ApihubApiCompatibilityKind | undefined)[]): ApiCompatibilityKind =>
  (apiKinds.some(isNoBwcLike)
    ? API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE
    : API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE)

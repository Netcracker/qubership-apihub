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

import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

export type Hash = string

export interface PackageDeprecatedItem {
  declarationJsonPaths: JsonPath[]        //declarative path to deprecated item
  description?: string                    // human-readable location of deprecated item
  deprecatedInPreviousVersions: string[]  // list of previous version with same deprecated item
  deprecatedInfo?: string                 // meta from x-deprecated-meta
  tolerantHash?: Hash                     // value of tolerant hash for Schema Object or Parameter Object that was deprecated
  hash?: Hash                             // value of hash for Schema Object or Parameter Object that was deprecated, need for detecting semi-breaking in UI
}

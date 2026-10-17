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

import type { CustomScopeElementContext } from '@netcracker/qubership-apihub-api-diff'
import type { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

/**
 * Builds what api-diff hands a custom scope element provider when it asks about one node. The single
 * place tests construct it, so a property added to the context later is a change here rather than at
 * every call site.
 */
export const customScopeElementContext = (
  path: JsonPath,
  beforeJso?: unknown,
  afterJso?: unknown,
): CustomScopeElementContext => ({ path, beforeJso, afterJso })

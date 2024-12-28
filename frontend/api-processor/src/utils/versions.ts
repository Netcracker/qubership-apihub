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

import { REVISION_DELIMITER } from '../consts'

export function getSplittedVersionKey(version: string | undefined): [string, number] {
  if (!version) {
    return ['', 0]
  }

  if (!version.includes(REVISION_DELIMITER)) {
    return [version, 0]
  }

  const [currentVersion, revision] = version.split(REVISION_DELIMITER)
  return [currentVersion, +revision]
}

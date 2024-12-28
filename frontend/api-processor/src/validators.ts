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

import { BuildConfig } from './types'
import { assert } from './utils'
import { BUILD_TYPE } from './consts'

export function validateConfig(config: BuildConfig): void {
  assert(config.packageId, 'builder config: packageId required')
  assert(config.version, 'builder config: version required')

  const filesCount = config?.files?.length
  const refsCount = config?.refs?.length
  if (!filesCount && !refsCount && config.buildType === BUILD_TYPE.BUILD) {
    throw new Error('Incorrect config. Got no files and refs')
  }
}

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

import { useMemo } from 'react'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { calculateSpecType, getFileExtension } from '@netcracker/qubership-apihub-ui-shared/utils/files'

// TODO: Check usages.
//  Seems most places can use 'type' from branch cache instead of calculation
export function useSpecType(
  filename?: string | null,
  content?: string | null,
): SpecType {
  return useMemo(
    () => calculateSpecType(getFileExtension(filename ?? ''), content ?? ''),
    [filename, content],
  )
}

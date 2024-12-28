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

import { mergeTypeDefs } from '@graphql-tools/merge'
import { print } from 'graphql'
import type { SpecRaw } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { useMemo } from 'react'

export function useMergedGraphQlSpec(options: {
  specsRaw: SpecRaw[]
  enabled: boolean
}): string | null {
  const { specsRaw, enabled } = options ?? {}

  return useMemo(
    () => {
      if (!enabled) {
        return null
      }

      try {
        const mergedTypeDefs = mergeTypeDefs(specsRaw)
        return print(mergedTypeDefs)
      } catch (e) {
        console.error(e)
        return null
      }
    },
    [enabled, specsRaw],
  )
}

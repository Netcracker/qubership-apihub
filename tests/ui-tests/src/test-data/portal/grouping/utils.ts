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

import type { OperationGroup } from '@test-data/props'
import { REST_API_TYPE } from '@shared/entities'
import { GET_PET_BY_TAG_V1 } from '../operations'

export const genGroupsForEscaping = ({ pkg, version }: {
  pkg: { packageId: string }
  version: string
}): OperationGroup[] => {

  const chars = '!@#$%^&*()-+=/[]{}|,.:;\'"`?\\'
  const groups: OperationGroup[] = []

  for (const char of chars) {
    groups.push({
      groupName: `G${char}1`,
      apiType: REST_API_TYPE,
      packageId: pkg.packageId,
      version: version,
      testMeta: {
        toAdd: [
          {
            operations: [GET_PET_BY_TAG_V1],
          },
        ],
      },
    })
  }
  return groups
}

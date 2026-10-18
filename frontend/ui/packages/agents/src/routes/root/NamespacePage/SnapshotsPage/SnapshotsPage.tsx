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

import type { FC } from 'react'
import { memo } from 'react'

import { useSnapshots } from '../useSnapshots'
import { SnapshotsTable } from './SnapshotsTable'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'

export const SnapshotsPage: FC = memo(() => {
  const [{ snapshots }, isLoading] = useSnapshots()

  return (
    <BodyCard
      header="Cloud API Documentation Snapshots"
      body={
        <Placeholder
          invisible={isNotEmpty(snapshots) || isLoading}
          area={CONTENT_PLACEHOLDER_AREA}
          message="No snapshots"
        >
          {isLoading
            ? <LoadingIndicator/>
            : <SnapshotsTable/>}
        </Placeholder>
      }
    />
  )
})


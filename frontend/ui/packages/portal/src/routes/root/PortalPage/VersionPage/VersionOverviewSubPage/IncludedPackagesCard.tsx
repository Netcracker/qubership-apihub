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
import { memo, useState } from 'react'
import { useSetReferences } from '../../PackagesAndDashboardsTree/useSetReferences'
import { PackagesAndDashboardsTree } from '../../PackagesAndDashboardsTree/PackagesAndDashboardsTree'
import { useParams } from 'react-router-dom'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import type { PackageReferenceWithStatus } from '@apihub/routes/root/PortalPage/DashboardPage/configure-dashboard'

export const IncludedPackagesCard: FC = memo(() => {
  const { packageId: packageKey, versionId: versionKey } = useParams()
  const [references, setReferences] = useState<PackageReferenceWithStatus[]>([])
  const [isContentLoading, setIsContentLoading] = useState(false)

  useSetReferences(packageKey, versionKey, setReferences, setIsContentLoading)

  return (
    <BodyCard
      header="Included Packages"
      body={
        <PackagesAndDashboardsTree
          currentDashboardReferences={references}
          isLoading={isContentLoading}
          readonly={false}
        />
      }
    />
  )
})

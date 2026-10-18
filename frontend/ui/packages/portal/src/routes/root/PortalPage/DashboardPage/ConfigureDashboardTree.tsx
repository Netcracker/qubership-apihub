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
import * as React from 'react'
import { memo, useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDashboardReferences, useSetDashboardReferences } from './DashboardReferencesProvider'
import { useHandleRemovedReferences } from '../useHandleReferences'
import { useSetRecursiveDashboardName } from './RecursiveDashboardNameContextProvider'
import type { ReferenceKind } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { useSetReferences } from '@apihub/routes/root/PortalPage/PackagesAndDashboardsTree/useSetReferences'
import {
  PackagesAndDashboardsTree,
} from '@apihub/routes/root/PortalPage/PackagesAndDashboardsTree/PackagesAndDashboardsTree'

export const ConfigureDashboardTree: FC = memo(() => {
  const { packageId: packageKey, versionId: versionKey } = useParams()

  const configurableReferences = useDashboardReferences()
  const setConfigurableReferences = useSetDashboardReferences()
  const [isContentLoading, setIsContentLoading] = useState(false)
  const handleRemovedReferences = useHandleRemovedReferences()
  const setDashboardRecursiveLinkName = useSetRecursiveDashboardName()
  useSetReferences(packageKey, versionKey, setConfigurableReferences, setIsContentLoading)

  const onRemoveReference = useCallback(
    (removeKey: string, versionKey: string, kind: ReferenceKind, deleted: boolean) => {
      setConfigurableReferences(configurableReferences.filter(({ packageReference: { key } }) => key !== removeKey))
      handleRemovedReferences({ key: removeKey, versionKey: versionKey, kind: kind, deleted: deleted })
      setDashboardRecursiveLinkName(undefined)
    },
    [configurableReferences, handleRemovedReferences, setConfigurableReferences, setDashboardRecursiveLinkName],
  )

  return (
    <PackagesAndDashboardsTree
      currentDashboardReferences={configurableReferences}
      onRemove={onRemoveReference}
      isLoading={isContentLoading}
      readonly={true}
    />
  )
})



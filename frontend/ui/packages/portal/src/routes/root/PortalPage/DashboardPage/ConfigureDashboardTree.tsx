import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDashboardReferences, useSetDashboardReferences } from './DashboardReferencesProvider'
import { useHandleRemovedReferences } from '../useHandleReferences'
import { useSetRecursiveDashboardName } from './RecursiveDashboardNameContextProvider'
import type { ReferenceKind } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { useSetReferences } from '@portal/routes/root/PortalPage/PackagesAndDashboardsTree/useSetReferences'
import {
  PackagesAndDashboardsTree,
} from '@portal/routes/root/PortalPage/PackagesAndDashboardsTree/PackagesAndDashboardsTree'

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



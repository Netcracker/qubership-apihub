import type { FC } from 'react'
import { memo, useState } from 'react'
import { useSetReferences } from '../../PackagesAndDashboardsTree/useSetReferences'
import { PackagesAndDashboardsTree } from '../../PackagesAndDashboardsTree/PackagesAndDashboardsTree'
import { useParams } from 'react-router-dom'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import type { PackageReferenceWithStatus } from '@portal/routes/root/PortalPage/DashboardPage/configure-dashboard'

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
